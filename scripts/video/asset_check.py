#!/usr/bin/env python3
"""Kiểm tra kỹ thuật tài nguyên kho dựng (docs/ASSET-LIBRARY.md § "Lưu trữ & sao lưu" → "Cổng kiểm tra kỹ thuật").

  python scripts/video/asset_check.py <file> --kind char|room|prop|clip|stacked [--ratio 3:4] [--trimmed] [--profile-out rooms/<room>.json]

In ra 1 dòng JSON: {"status": "PASS|WARN|FAIL", "checks": [{"name","status","value","limit","reason"}], "metrics": {...}, "suggest": {...}}
FAIL = không được nhập kho (scripts/video/library.mjs ingest gọi lệnh này). WARN = nhập được, ghi lý do vào manifest.
Cần: numpy, pillow, ffmpeg/ffprobe. Các hàm đo nhận mảng numpy để test bằng ảnh/clip tổng hợp (scripts/test/asset_check_test.py).
"""
import argparse, json, math, os, subprocess, sys

import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image

# ---------- ngưỡng (đã chỉnh trên kho thật 17/10 – xem docs/ASSET-LIBRARY.md) ----------
T = {
    'ratio_tol': 0.02,          # tỉ lệ khung lệch tối đa 2 %
    'char_min_short': 1500,     # ảnh nhân vật "2K": cạnh ngắn ≥ 1500 px
    'room_min_short': 1080,
    'bg_mad': 6.0,              # độ lệch tuyệt đối trung vị vùng mép (0–255) – nền trơn
    'bg_p95': 22.0,             # phân vị 95 độ lệch vùng mép
    'margin': 0.02,             # nhân vật cách mép ≥ 2 %
    'text_density': 0.012,      # mật độ cạnh mảnh ở góc ngoài nhân vật → nghi chữ/watermark (WARN)
    'brand_share': 0.03,        # ≥ 3 % điểm ảnh gần màu thương hiệu (WARN nếu thấp)
    'floor_busy': 0.075,        # mật độ cạnh vùng sàn giữa nửa dưới (phòng) – cao = có đồ giữa sàn
    'dur': 5.0, 'dur_tol': 0.2,
    'fps': (24, 25, 30),
    'black_luma': 16.0,
    'dup_diff': 0.05,           # chênh lệch khung < 0,05/255 = khung trùng
    'dup_run': 6,               # ≥ 6 khung trùng hệt liên tiếp (≥ 0,25 s đứng hình) = FAIL
    'jerk_k': 3.5,              # khung đột biến: diff > k × trung vị 6 khung lân cận và > jerk_abs
    'jerk_abs': 8.0,
    'motion_low': 0.6,          # năng lượng chuyển động thấp → gợi ý vai listener/idle (không phải lỗi)
    'drift': 1.0,               # điểm trôi nhận dạng: tóc mọc thêm > 60 % hoặc màu áo lệch > 60 (RGB) → FAIL
    'foot': 0.015,              # đáy bbox dao động < 1,5 % chiều cao khung
    'bg_shift': 8.0,            # màu nền mép thay đổi theo thời gian (0–255)
    'flicker': 0.004,           # tỉ lệ điểm alpha bật-tắt-bật giữa 3 khung (trên diện tích mặt nạ)
    'shadow_ratio': 1.6,        # bề ngang mặt nạ ở đáy / ở mắt cá → còn bóng sàn dính
    'audio_db': -45.0,          # max_volume > -45 dB = có âm thanh (clip kho phải im lặng)
}
BRAND = ['#0F3D3E', '#17595A', '#E5502F', '#F2553B', '#FFB054', '#FFC94A', '#FFD36A', '#FF8FA3', '#FFF7EA', '#FFE7C2', '#2FBF71']


def chk(name, ok, value=None, limit=None, reason='', level='FAIL'):
    return {'name': name, 'status': 'PASS' if ok else level, 'value': value, 'limit': limit, 'reason': '' if ok else reason}


def overall(checks):
    s = [c['status'] for c in checks]
    return 'FAIL' if 'FAIL' in s else 'WARN' if 'WARN' in s else 'PASS'


def r(x, n=4):
    return None if x is None else round(float(x), n)


# ---------- đo trên ảnh ----------
def parse_ratio(s):
    a, b = (float(v) for v in str(s).replace('x', ':').split(':'))
    return a / b


def ratio_ok(w, h, ratio, tol=None):
    tol = T['ratio_tol'] if tol is None else tol
    return abs((w / h) / ratio - 1) <= tol


def border(arr, frac=0.02):
    """Dải mép 4 cạnh (frac kích thước) → mảng điểm Nx3."""
    h, w = arr.shape[:2]
    b = max(2, int(round(min(h, w) * frac)))
    return np.concatenate([arr[:b].reshape(-1, 3), arr[-b:].reshape(-1, 3), arr[:, :b].reshape(-1, 3), arr[:, -b:].reshape(-1, 3)]).astype(np.float32)


def border_uniformity(arr):
    """Nền trơn: độ lệch so với màu trung vị dải mép. → (median_rgb, mad, p95)."""
    px = border(arr)
    med = np.median(px, axis=0)
    dev = np.abs(px - med).max(axis=1)
    return med, float(np.median(dev)), float(np.percentile(dev, 95))


def fg_mask(arr, bg, thr=28):
    """Tiền cảnh = điểm lệch màu nền > thr (tổng |ΔRGB|)."""
    return np.abs(arr.astype(np.int16) - np.asarray(bg, np.int16)).sum(axis=2) > thr


def bbox(mask, frac=0.002):
    """Khung bao tiền cảnh bỏ đốm lẻ: chỉ tính hàng/cột có ≥ max(2, frac·kích thước) điểm."""
    if not mask.any():
        return None
    h, w = mask.shape
    rows = np.nonzero(mask.sum(axis=1) >= max(2, frac * w))[0]
    cols = np.nonzero(mask.sum(axis=0) >= max(2, frac * h))[0]
    if not len(rows) or not len(cols):
        return None
    return int(cols.min()), int(rows.min()), int(cols.max()), int(rows.max())


def bbox_margins(mask):
    """Khoảng cách bbox tiền cảnh tới 4 mép, tính theo tỉ lệ chiều tương ứng (trái, trên, phải, dưới).
    Bỏ viền 0,3 % ngoài cùng (Kling hay để 1–2 hàng điểm rác ở mép ảnh)."""
    h, w = mask.shape
    e = max(1, int(round(min(h, w) * 0.003)))
    mask = mask.copy(); mask[:e] = False; mask[-e:] = False; mask[:, :e] = False; mask[:, -e:] = False
    b = bbox(mask)
    if not b:
        return None
    x0, y0, x1, y1 = b
    return x0 / w, y0 / h, (w - 1 - x1) / w, (h - 1 - y1) / h


def gray(arr):
    return arr[..., :3].astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)


def edges(g, thr=40):
    gx = np.abs(np.diff(g, axis=1, prepend=g[:, :1]))
    gy = np.abs(np.diff(g, axis=0, prepend=g[:1]))
    return (gx + gy) > thr


def largest_component(mask, max_side=240):
    """Thành phần liên thông lớn nhất (nhân vật chính) – tính trên mặt nạ thu nhỏ, trả về mặt nạ cỡ gốc."""
    from collections import deque
    h, w = mask.shape
    k = max(1, int(math.ceil(max(h, w) / max_side)))
    sm = mask[: h - h % k or h, : w - w % k or w]
    sm = sm.reshape(sm.shape[0] // k, k, sm.shape[1] // k, k).any(axis=(1, 3))
    lab = np.zeros(sm.shape, np.int32); best, best_n, cur = 0, 0, 0
    H, W = sm.shape
    for y0, x0 in zip(*np.nonzero(sm)):
        if lab[y0, x0]:
            continue
        cur += 1; n = 0; q = deque([(y0, x0)]); lab[y0, x0] = cur
        while q:
            y, x = q.popleft(); n += 1
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < H and 0 <= xx < W and sm[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = cur; q.append((yy, xx))
        if n > best_n:
            best, best_n = cur, n
    big = np.repeat(np.repeat(lab == best, k, axis=0), k, axis=1)
    out = np.zeros_like(mask); out[: big.shape[0], : big.shape[1]] = big[:h, :w]
    return out & mask if best else np.zeros_like(mask)


def text_score(arr, mask):
    """Chữ/watermark: mật độ cạnh tương phản cao ở 4 góc (14 % × 8 %), bỏ phần thuộc nhân vật chính (thành phần liên thông lớn nhất, nới rộng)."""
    h, w = mask.shape
    e = edges(gray(arr), 60)
    pad = max(3, int(min(h, w) * 0.01))
    main = dilate(largest_component(mask), pad) if mask.any() else mask
    ch, cw = int(h * 0.08), int(w * 0.14)
    best = 0.0
    for ys, xs in ((slice(0, ch), slice(0, cw)), (slice(0, ch), slice(w - cw, w)), (slice(h - ch, h), slice(0, cw)), (slice(h - ch, h), slice(w - cw, w))):
        reg = e[ys, xs] & ~main[ys, xs]
        best = max(best, float(reg.mean()))
    return best


def dilate(m, n):
    out = m.copy()
    for _ in range(max(1, n // 2)):
        o = out.copy()
        o[1:] |= out[:-1]; o[:-1] |= out[1:]; o[:, 1:] |= out[:, :-1]; o[:, :-1] |= out[:, 1:]
        out = o
    return out


def hex2rgb(h):
    h = h.lstrip('#')
    return [int(h[i:i + 2], 16) for i in (0, 2, 4)]


def brand_share(arr, mask=None, tol=60):
    """Tỉ lệ điểm (trong mask) gần 1 màu thương hiệu (khoảng cách RGB Euclid < tol)."""
    px = arr.reshape(-1, 3).astype(np.float32)
    if mask is not None:
        px = px[mask.reshape(-1)]
    if not len(px):
        return 0.0
    if len(px) > 200000:
        px = px[:: len(px) // 200000 + 1]
    pal = np.array([hex2rgb(c) for c in BRAND], np.float32)
    d = np.sqrt(((px[:, None, :] - pal[None]) ** 2).sum(axis=2)).min(axis=1)
    return float((d < tol).mean())


def floor_busy(arr):
    """Mật độ cạnh vùng sàn trống dự kiến: giữa (30–70 % ngang) của nửa dưới (55–92 % dọc)."""
    h, w = arr.shape[:2]
    e = edges(gray(arr), 45)
    return float(e[int(h * 0.55):int(h * 0.92), int(w * 0.30):int(w * 0.70)].mean())


def estimate_floor(arr):
    """Hồ sơ sàn tự động (§0): đường sàn xa (yFar), điểm tụ (vanish), scaleAt theo tầm mắt 1,5 m, điểm đứng, ánh sáng.
    Toạ độ trong khung ảnh gốc; library.mjs đổi sang canvas 1080 khi ghi rooms/<room>.json."""
    h, w = arr.shape[:2]
    g = gray(arr)
    gy = np.abs(np.diff(g, axis=0, prepend=g[:1]))
    gx = np.abs(np.diff(g, axis=1, prepend=g[:, :1]))
    # 1) đường chân tường: hàng có cạnh ngang mạnh & dài nhất trong dải 40–80 % chiều cao
    band0, band1 = int(h * 0.40), int(h * 0.80)
    rows = ((gy > 25) & (gx < 15)).mean(axis=1)
    rows_s = np.convolve(rows, np.ones(5) / 5, mode='same')
    y_far = int(band0 + np.argmax(rows_s[band0:band1]))
    # 2) điểm tụ: giao điểm các cạnh xiên ở nửa dưới (bỏ phiếu cặp ngẫu nhiên, lấy trung vị)
    ys, xs = np.nonzero(((gx + gy) > 50)[int(h * 0.5):])
    ys = ys + int(h * 0.5)
    vx, vy, conf = w / 2, h * 0.42, 0.0
    if len(ys) > 50:
        rng = np.random.default_rng(7)
        idx = rng.choice(len(ys), size=min(4000, len(ys)), replace=False)
        gxs = (g[ys[idx], np.minimum(xs[idx] + 1, w - 1)] - g[ys[idx], np.maximum(xs[idx] - 1, 0)])
        gys = (g[np.minimum(ys[idx] + 1, h - 1), xs[idx]] - g[np.maximum(ys[idx] - 1, 0), xs[idx]])
        ang = np.degrees(np.arctan2(gys, gxs)) % 180  # hướng gradient; đường vuông góc
        obl = (np.abs(ang - 45) < 25) | (np.abs(ang - 135) < 25)
        px, py, gxo, gyo = xs[idx][obl].astype(float), ys[idx][obl].astype(float), gxs[obl], gys[obl]
        if len(px) > 20:
            # đường: gx·(X−px) + gy·(Y−py) = 0
            a = rng.integers(0, len(px), 3000); b = rng.integers(0, len(px), 3000)
            A1, B1, C1 = gxo[a], gyo[a], gxo[a] * px[a] + gyo[a] * py[a]
            A2, B2, C2 = gxo[b], gyo[b], gxo[b] * px[b] + gyo[b] * py[b]
            det = A1 * B2 - A2 * B1
            ok = np.abs(det) > 1e-3 * (np.hypot(A1, B1) * np.hypot(A2, B2) + 1e-9)
            X = (C1 * B2 - C2 * B1)[ok] / det[ok]; Y = (A1 * C2 - A2 * C1)[ok] / det[ok]
            keep = (X > -0.5 * w) & (X < 1.5 * w) & (Y > 0.05 * h) & (Y < y_far)
            if keep.sum() > 30:
                vx, vy = float(np.median(X[keep])), float(np.median(Y[keep]))
                mad = float(np.median(np.abs(Y[keep] - vy)))
                conf = max(0.0, 1 - mad / (0.15 * h))
    y_near = h - 1
    # 3) chiều cao người 1,7 m theo tầm mắt 1,5 m: h(y) = (y − horizon)·1,7/1,5
    k = 1.7 / 1.5
    scale = {'yFar': y_far, 'hFar': max(1, int((y_far - vy) * k)), 'yNear': y_near, 'hNear': max(1, int((y_near - vy) * k))}
    # 4) điểm đứng: 3 cột ít cạnh nhất trên hàng 60 % giữa yFar và yNear
    ys_ = int(y_far + 0.6 * (y_near - y_far))
    e = edges(g, 45)
    strip = e[max(0, ys_ - int(h * 0.04)):min(h, ys_ + int(h * 0.04))].mean(axis=0)
    stand = []
    for cx in (0.27, 0.5, 0.73):
        x0, x1 = int(w * (cx - 0.1)), int(w * (cx + 0.1))
        if stand:
            x0 = max(x0, stand[-1]['x'] + int(w * 0.18))  # 2 điểm đứng cách nhau ≥ 18 % bề ngang
        if x1 - x0 < 16:
            x0, x1 = max(0, x1 - 16), x1
        seg = np.convolve(strip[x0:x1], np.ones(15) / 15, mode='same')
        stand.append({'x': int(x0 + np.argmin(seg)), 'y': ys_})
    # 5) ánh sáng: bên sáng hơn = hướng nguồn sáng; warmth = (R−B) trung bình
    left, right = g[:, : w // 3].mean(), g[:, -w // 3:].mean()
    rgb = arr.reshape(-1, 3).astype(np.float32).mean(axis=0)
    light = {'dir': -1 if left > right else 1, 'warmth': r(max(0.0, min(1.0, (rgb[0] - rgb[2]) / 128)), 2)}
    return {'floor': {'yNear': y_near, 'yFar': y_far}, 'vanish': [int(vx), int(vy)], 'scaleAt': scale, 'stand': stand, 'light': light, 'confidence': r(conf, 2)}


def load_image(path):
    im = Image.open(path)
    info = {'w': im.width, 'h': im.height, 'mode': im.mode, 'bits': 8 if im.mode in ('RGB', 'RGBA', 'L', 'P', 'LA') else 16}
    icc = im.info.get('icc_profile')
    info['icc'] = None if not icc else ('sRGB' if b'sRGB' in icc or b's\x00R\x00G\x00B' in icc else 'other')
    alpha = None
    if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
        rgba = np.asarray(im.convert('RGBA'))
        alpha = rgba[..., 3]
        arr = rgba[..., :3]
    else:
        arr = np.asarray(im.convert('RGB'))
    return arr, alpha, info


def check_image(path, kind, ratio=None):
    arr, alpha, info = load_image(path)
    w, h = info['w'], info['h']
    C, M, S = [], {'w': w, 'h': h, 'mode': info['mode']}, {}
    if ratio is None:
        ratio = {'char': '3:4', 'room': '9:16'}.get(kind)
    if ratio:
        C.append(chk('ratio', ratio_ok(w, h, parse_ratio(ratio)), r(w / h), ratio, f'tỉ lệ {w}×{h} ≠ {ratio}'))
    if kind in ('char', 'room'):
        mn = T['char_min_short'] if kind == 'char' else T['room_min_short']
        C.append(chk('size', min(w, h) >= mn, min(w, h), mn, f'cạnh ngắn {min(w, h)} px < {mn} (chưa phải bản 2K gốc)'))
    C.append(chk('bitdepth', info['bits'] == 8 and info['mode'] in ('RGB', 'RGBA'), info['mode'], 'RGB/RGBA 8-bit', f'chế độ màu {info["mode"]}'))
    C.append(chk('colorspace', info['icc'] in (None, 'sRGB'), info['icc'] or 'untagged=sRGB', 'sRGB', 'hồ sơ màu không phải sRGB'))
    if alpha is not None:
        semi = float(((alpha > 0) & (alpha < 255)).mean()); opaque = float((alpha == 255).mean())
        M['alphaSemi'] = r(semi); M['alphaOpaque'] = r(opaque)
        if kind == 'prop':
            fg = alpha > 0
            b = bbox(alpha > 128)
            stray = 0.0
            if b:
                x0, y0, x1, y1 = b
                inside = np.zeros_like(fg); inside[y0:y1 + 1, x0:x1 + 1] = True
                stray = float((fg & ~dilate(inside, 6)).mean())
            M['alphaStray'] = r(stray)
            C.append(chk('alpha_junk', stray < 0.001 and semi < 0.08, r(stray), '<0.001 rời rạc · <8 % bán trong', 'alpha rác (điểm rời ngoài vật thể / quá nhiều bán trong suốt)', 'WARN'))
        else:
            C.append(chk('alpha_junk', opaque > 0.999, r(opaque), 'ảnh nền trơn không cần alpha', 'kênh alpha thừa/không đặc – ảnh gốc phải RGB nền trơn', 'FAIL' if kind == 'room' else 'WARN'))
    if kind == 'char':
        bg, mad, p95 = border_uniformity(arr)
        M.update(bgRGB=[int(v) for v in bg], bgMad=r(mad, 2), bgP95=r(p95, 2))
        C.append(chk('bg_uniform', mad <= T['bg_mad'] and p95 <= T['bg_p95'], [r(mad, 2), r(p95, 2)], [T['bg_mad'], T['bg_p95']], 'nền không trơn đều (vùng mép lệch màu)'))
        mask = fg_mask(arr, bg)
        mg = bbox_margins(mask)
        M['margins'] = [r(v, 3) for v in mg] if mg else None
        C.append(chk('in_frame', bool(mg) and min(mg) >= T['margin'], r(min(mg), 3) if mg else None, T['margin'], 'nhân vật chạm/sát mép khung (cần cách ≥ 2 %)'))
        ts = text_score(arr, mask); M['textScore'] = r(ts)
        C.append(chk('no_text', ts < T['text_density'], r(ts), T['text_density'], 'nghi có chữ/watermark ở góc ảnh', 'WARN'))
        bs = brand_share(arr, mask); M['brandShare'] = r(bs, 3)
        C.append(chk('palette', bs >= T['brand_share'], r(bs, 3), T['brand_share'], 'bảng màu xa màu thương hiệu', 'WARN'))
    elif kind == 'room':
        ts = text_score(arr, np.zeros(arr.shape[:2], bool)); M['textScore'] = r(ts)
        C.append(chk('no_text', ts < T['text_density'] * 3, r(ts), T['text_density'] * 3, 'nghi có chữ/watermark ở góc ảnh', 'WARN'))
        fb = floor_busy(arr); M['floorBusy'] = r(fb)
        C.append(chk('floor_empty', fb <= T['floor_busy'], r(fb), T['floor_busy'], 'vùng sàn giữa nửa dưới có đồ vật/chi tiết (luật §0: chừa sàn trống cho nhân vật)'))
        prof = estimate_floor(arr); S['floorProfile'] = prof
        C.append(chk('floor_profile', prof['confidence'] >= 0.3, prof['confidence'], 0.3, 'không ước lượng chắc được điểm tụ – sửa tay rooms/<room>.json', 'WARN'))
        bs = brand_share(arr); M['brandShare'] = r(bs, 3)
        C.append(chk('palette', bs >= T['brand_share'], r(bs, 3), T['brand_share'], 'bảng màu xa màu thương hiệu', 'WARN'))
    elif kind == 'prop':
        bs = brand_share(arr, (alpha > 128) if alpha is not None else None); M['brandShare'] = r(bs, 3)
        C.append(chk('palette', bs >= T['brand_share'], r(bs, 3), T['brand_share'], 'bảng màu xa màu thương hiệu', 'WARN'))
    return {'status': overall(C), 'checks': C, 'metrics': M, 'suggest': S}


# ---------- đo trên clip ----------
def ffprobe(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def frame_times(path):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'frame=pts_time,best_effort_timestamp_time', '-of', 'csv=p=0', path], capture_output=True, text=True, check=True).stdout
    ts = []
    for line in out.split('\n'):
        for v in line.split(','):
            try:
                ts.append(float(v)); break
            except ValueError:
                pass
    return ts


def audio_peak_db(path):
    p = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-map', '0:a:0', '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True)
    for line in p.stderr.split('\n'):
        if 'max_volume' in line:
            try:
                return float(line.split('max_volume:')[1].split('dB')[0])
            except (IndexError, ValueError):
                return None
    return None


def read_frames(path, width=360):
    """Giải mã toàn bộ khung (thu nhỏ) → uint8 [N,h,w,3]."""
    pr = ffprobe(path)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    W, H = int(v['width']), int(v['height'])
    h = int(round(H * width / W / 2) * 2)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'scale={width}:{h}:flags=area', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, h, width, 3)


def frame_diffs(frames):
    f = frames.astype(np.float32)
    return np.abs(np.diff(f, axis=0)).mean(axis=(1, 2, 3)) if len(f) > 1 else np.zeros(0)


def black_frames(frames):
    return [int(i) for i, m in enumerate(gray(frames).mean(axis=(1, 2))) if m < T['black_luma']]


def dup_runs(diffs):
    """Độ dài chuỗi khung trùng liên tiếp dài nhất."""
    best = cur = 0
    for d in diffs:
        cur = cur + 1 if d < T['dup_diff'] else 0
        best = max(best, cur)
    return best


def frame_diffs2(frames):
    """Chênh lệch khung t ↔ t+2 (Kling 2.5 hoạt hình "on twos": cứ 2 khung gần trùng nhau → so cách 1 khung)."""
    f = frames.astype(np.float32)
    return np.abs(f[2:] - f[:-2]).mean(axis=(1, 2, 3)) if len(f) > 2 else np.zeros(0)


def cadence_twos(diffs):
    """Tỉ lệ khung gần trùng xen kẽ (on twos). ~0,5 = hoạt hình 12 hình/giây trong khung 24 fps."""
    if len(diffs) < 4:
        return 0.0
    small = diffs < max(1.0, 0.15 * float(np.percentile(diffs, 90)))
    return float(small.mean())


def jerk_frames(d2):
    """Khung đột biến (nhảy cảnh/giật): d2[i] > k × trung vị lân cận (bỏ 2 khung chồng lấn) và > ngưỡng tuyệt đối.
    So với lân cận (không phải toàn clip) để động tác nhanh liên tục không bị tính là giật."""
    n = len(d2)
    if n < 9:
        return []
    out = []
    for i in range(n):
        nb = np.concatenate([d2[max(0, i - 5):max(0, i - 1)], d2[i + 2:i + 6]])
        if len(nb) >= 3 and d2[i] > max(T['jerk_k'] * float(np.median(nb)), T['jerk_abs']):
            out.append(i + 2)
    return out


def motion_energy(diffs):
    return float(np.mean(diffs)) if len(diffs) else 0.0


def masks_for(frames, bg):
    """Mặt nạ tiền cảnh từng khung; xoá viền 1 % ngoài cùng (Kling để điểm rác ở mép khung)."""
    m = np.abs(frames.astype(np.int16) - np.asarray(bg, np.int16)).sum(axis=3) > 36
    e = max(1, int(round(min(m.shape[1:]) * 0.01)))
    m[:, :e] = False; m[:, -e:] = False; m[:, :, :e] = False; m[:, :, -e:] = False
    return m


def dominant_rgb(px):
    """Màu chủ đạo (bin 16 mức nhiều điểm nhất, lấy trung bình)."""
    if len(px) < 20:
        return None
    q = (px.astype(np.int32) // 16)
    idx = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
    return px[idx == np.bincount(idx).argmax()].astype(np.float32).mean(axis=0)


def head_stats(img, mask, hair=None):
    """Vùng đầu = dải 13 % trên của người, quanh trục đầu (tìm từ 4 % trên cùng). → (màu tóc, diện tích tóc / figH², màu áo)."""
    b = bbox(mask)
    if not b:
        return None
    x0, y0, x1, y1 = b
    fh = y1 - y0 + 1
    top = mask[y0:y0 + max(2, int(fh * 0.04))]
    cols = np.nonzero(top.any(axis=0))[0]
    cx = int(np.median(cols)) if len(cols) else (x0 + x1) // 2
    half = int(fh * 0.2)
    hb = mask[y0:y0 + int(fh * 0.13), max(0, cx - half):cx + half]
    hp = img[y0:y0 + int(fh * 0.13), max(0, cx - half):cx + half]
    if hair is None:
        k = max(2, int(fh * 0.035))  # đỉnh đầu = tóc
        hair = dominant_rgb(hp[:k][hb[:k]])
    if hair is None:
        return None
    near = (np.abs(hp.astype(np.int16) - hair.astype(np.int16)).sum(axis=2) < 60) & hb
    tw = max(2, int(fh * 0.1))
    torso = img[y0 + int(fh * 0.25):y0 + int(fh * 0.42), max(0, cx - tw):cx + tw][mask[y0 + int(fh * 0.25):y0 + int(fh * 0.42), max(0, cx - tw):cx + tw]]
    return hair, float(near.sum()) / (fh * fh), dominant_rgb(torso)


def identity_drift(frames, masks):
    """Trôi nhận dạng giữa khung đầu và các khung giữa/cuối:
    hairGrowth = diện tích màu tóc vùng đầu (tóc mọc thêm/buộc đuôi kiểu lỗi Leo) so với khung đầu;
    outfitDE = lệch màu áo chủ đạo (RGB). → (điểm 0–1+, chi tiết). Điểm = max(|growth−1|/0.6, outfitDE/60)."""
    n = len(frames)
    if n < 3:
        return 0.0, {}
    r0 = head_stats(frames[0], masks[0])
    if not r0:
        return 0.0, {}
    hair, a0, t0 = r0
    worst, det = 0.0, {'hairGrowth': 1.0, 'outfitDE': 0.0}
    for i in sorted({n // 2, (3 * n) // 4, n - 1}):
        ri = head_stats(frames[i], masks[i], hair)
        if not ri:
            continue
        g = ri[1] / a0 if a0 > 0 else 1.0
        de = float(np.linalg.norm(ri[2] - t0)) if (ri[2] is not None and t0 is not None) else 0.0
        if abs(g - 1) > abs(det['hairGrowth'] - 1):
            det['hairGrowth'] = round(g, 3)
        det['outfitDE'] = max(det['outfitDE'], round(de, 1))
        worst = max(worst, max(g - 1, 0) / 0.6, de / 60)
    return worst, det


def foot_wobble(masks):
    """Biên độ dao động đáy bbox tiền cảnh (tỉ lệ chiều cao khung) – chân phải giữ yên."""
    h = masks.shape[1]
    bots = [bbox(m)[3] for m in masks if bbox(m)]
    if len(bots) < 2:
        return 0.0
    return float((np.percentile(bots, 98) - np.percentile(bots, 2)) / h)


def bg_shift(frames):
    """Màu nền mép (trung vị) thay đổi bao nhiêu trong suốt clip."""
    meds = np.array([np.median(border(f), axis=0) for f in frames[:: max(1, len(frames) // 24)]])
    return float(np.abs(meds - meds[0]).max()) if len(meds) else 0.0


def alpha_flicker(alphas):
    """Mép alpha nhấp nháy: điểm đổi trạng thái (>128) ở khung t rồi đổi lại ở t+1, chia cho diện tích mặt nạ trung bình."""
    if len(alphas) < 3:
        return 0.0
    on = alphas > 128
    flip = (on[1:-1] != on[:-2]) & (on[2:] == on[:-2])
    area = max(1.0, float(on.sum(axis=(1, 2)).mean()))
    return float(flip.sum(axis=(1, 2)).mean() / area)


def floor_shadow(alpha):
    """Bóng sàn dính: bề ngang mặt nạ ở 2 % đáy so với ở mắt cá (~8 % trên đáy), kèm alpha bán trong suốt ở đáy."""
    on = alpha > 24
    b = bbox(on)
    if not b:
        return 0.0
    x0, y0, x1, y1 = b
    hh = y1 - y0 + 1
    def width(y):
        xs = np.nonzero(on[y])[0]
        return (xs.max() - xs.min() + 1) if len(xs) else 0
    bot = max(width(y) for y in range(max(y0, y1 - max(1, int(hh * 0.02))), y1 + 1))
    ankle = max(1, max(width(y) for y in range(y1 - int(hh * 0.10), y1 - int(hh * 0.06) + 1)))
    return bot / ankle


def stacked_mask_stats(lower):
    """Nửa dưới clip stacked phải là mặt nạ: xám (R≈G≈B) và gần như chỉ 0/255. → sắc độ TB, tỉ lệ điểm nhị phân, độ phủ."""
    f = lower[:: max(1, len(lower) // 12)].astype(np.int16)
    chroma = float((np.abs(f[..., 0] - f[..., 1]) + np.abs(f[..., 1] - f[..., 2])).mean())
    g = f.mean(axis=3)
    return {'chroma': r(chroma, 2), 'binary': r(((g < 20) | (g > 235)).mean(), 3), 'cover': r((g > 128).mean(), 3)}


def stacked_layer(path, W, H):
    """foot [x, y] (đế giày trong nửa khung), figH, w, h đo từ mặt nạ khung giữa – ghi vào manifest để render đặt chân đúng."""
    n = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-count_packets', '-show_entries', 'stream=nb_read_packets', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip() or 1)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'select=eq(n\\,{n // 2})', '-vsync', '0', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    hh = H // 2
    al = np.frombuffer(raw, np.uint8).reshape(H, W)[hh:]
    rows = np.nonzero((al > 60).sum(axis=1) >= 2)[0]
    if not len(rows):
        return None
    top, sole = int(rows.min()), int(rows.max()) + 1
    cols = np.nonzero(al[max(0, sole - 12):sole].max(axis=0) > 60)[0]
    return {'w': W, 'h': hh, 'foot': [int(cols.mean()) if len(cols) else W // 2, sole], 'figH': sole, 'frames': n}  # figH = đế giày tính từ mép trên khung cắt (như clip_to_layer.py)


def check_clip(path, kind='clip', trimmed=False):
    C, M, S = [], {}, {}
    pr = ffprobe(path)
    v = next((s for s in pr['streams'] if s['codec_type'] == 'video'), None)
    if not v:
        return {'status': 'FAIL', 'checks': [chk('video', False, None, None, 'không có luồng video')], 'metrics': {}, 'suggest': {}}
    W, H = int(v['width']), int(v['height'])
    stacked = kind == 'stacked'
    vis_h = H // 2 if stacked else H
    num, den = (int(x) for x in v.get('avg_frame_rate', '0/1').split('/'))
    fps = num / den if den else 0
    dur = float(pr['format'].get('duration') or v.get('duration') or 0)
    M.update(codec=v.get('codec_name'), w=W, h=H, fps=r(fps, 3), duration=r(dur, 3), pix_fmt=v.get('pix_fmt'))
    C.append(chk('codec', v.get('codec_name') == 'h264' and v.get('pix_fmt') in ('yuv420p', 'yuvj420p'), f"{v.get('codec_name')}/{v.get('pix_fmt')}", 'h264/yuv420p', 'codec/pixel format không phải h264 yuv420p'))
    if stacked:  # bản tách nền = khung cắt sát người → chỉ cần người đủ cao
        C.append(chk('stacked_shape', H % 2 == 0 and H >= 2 * 600, [W, H], 'chiều cao chẵn = 2 × khung màu', f'{W}×{H} không phải khung xếp chồng màu+mặt nạ'))
        C.append(chk('resolution', vis_h >= 1000, vis_h, 1000, f'nửa màu cao {vis_h} < 1000 px'))
    else:
        C.append(chk('resolution', min(W, vis_h) >= 1080, min(W, vis_h), 1080, f'cạnh ngắn {min(W, vis_h)} < 1080'))
    fps_ok = any(abs(fps - f) < 0.01 for f in T['fps'])
    ts = frame_times(path)
    dts = np.diff(ts) if len(ts) > 2 else np.array([0])
    vfr = float(dts.max() - dts.min()) if len(dts) else 0
    M['frameDtSpread'] = r(vfr, 4)
    C.append(chk('fps', fps_ok and vfr < 0.5 / max(fps, 1), [r(fps, 2), r(vfr, 4)], '24/25/30 fps cố định', 'fps lạ hoặc không đều (VFR)'))
    if trimmed:
        C.append(chk('duration', 0.8 <= dur <= T['dur'] + T['dur_tol'], r(dur, 2), 'đoạn cắt 0,8–5,2 s', 'đoạn cắt quá ngắn/dài', 'WARN'))
    else:
        C.append(chk('duration', abs(dur - T['dur']) <= T['dur_tol'], r(dur, 2), f"{T['dur']}±{T['dur_tol']}", f'thời lượng {dur:.2f} s ≠ 5 ± 0,2 s'))
    a = [s for s in pr['streams'] if s['codec_type'] == 'audio']
    if a:
        peak = audio_peak_db(path); M['audioPeakDb'] = peak
        C.append(chk('audio', peak is None or peak <= T['audio_db'], peak, f"≤ {T['audio_db']} dB", 'có âm thanh trong clip (kho dựng cần im lặng – bản web sẽ bỏ tiếng)', 'WARN'))
    frames = read_frames(path)
    alphas = None
    if stacked:
        hh = frames.shape[1] // 2
        lower = frames[:, hh:hh * 2]
        sv = stacked_mask_stats(lower); M['maskStats'] = sv
        C.append(chk('stacked_mask', sv['chroma'] < 8 and sv['binary'] >= 0.85 and 0.02 <= sv['cover'] <= 0.9, [sv['chroma'], sv['binary'], sv['cover']],
                     'nửa dưới xám (sắc < 8), ≥ 85 % điểm 0/255, phủ 2–90 %', 'nửa dưới KHÔNG phải mặt nạ alpha (clip gốc khai nhầm "stacked" → nhân vật bóng ma, mất nửa người)'))
        alphas = gray(lower).astype(np.uint8)
        frames = frames[:, :hh]
    M['frames'] = int(len(frames))
    if stacked:  # nền khung màu stacked vốn đen → chỉ xét vùng trong mặt nạ
        bl = [i for i in range(len(frames)) if (alphas[i] > 128).any() and gray(frames[i])[alphas[i] > 128].mean() < T['black_luma']]
    else:
        bl = black_frames(frames)
    C.append(chk('black_frames', not bl, len(bl), 0, f'khung đen tại {bl[:5]}'))
    diffs = frame_diffs(frames)
    dr = dup_runs(diffs); M['dupRun'] = dr
    C.append(chk('duplicates', dr < T['dup_run'], dr, f"< {T['dup_run']}", f'{dr} khung trùng liên tiếp (đứng hình)'))
    M['cadenceTwos'] = r(cadence_twos(diffs), 2)
    jf = jerk_frames(frame_diffs2(frames)); M['jerkFrames'] = jf[:10]
    C.append(chk('smooth', not jf, len(jf), 0, f'khung đột biến (giật/nhảy cảnh) tại {jf[:5]}'))
    me = motion_energy(diffs); M['motion'] = r(me, 3)
    if me < T['motion_low']:
        S['role'] = 'listener'
    C.append(chk('motion', me >= T['motion_low'], r(me, 3), T['motion_low'], 'chuyển động ít → chỉ dùng vai người nghe/idle', 'INFO'))
    if stacked:
        masks = alphas > 128
    else:
        bg, mad, p95 = border_uniformity(frames[0]); M['bgRGB'] = [int(x) for x in bg]
        masks = masks_for(frames, bg)
        shift = bg_shift(frames); M['bgShift'] = r(shift, 2)
        C.append(chk('bg_stable', shift <= T['bg_shift'], r(shift, 2), T['bg_shift'], 'nền đổi màu trong clip'))
        C.append(chk('bg_uniform', mad <= T['bg_mad'] * 1.5 and p95 <= T['bg_p95'] * 1.5, [r(mad, 2), r(p95, 2)], [T['bg_mad'] * 1.5, T['bg_p95'] * 1.5], 'nền clip không trơn (khó tách nền)'))
    dft, per = identity_drift(frames, masks); M['drift'] = r(dft, 3); M['driftRegions'] = per
    C.append(chk('identity', dft <= T['drift'], r(dft, 3), T['drift'], f'nghi trôi nhận dạng (tóc ×{per.get("hairGrowth")}, áo lệch {per.get("outfitDE")}) – AI thị giác quyết định FAIL "identity drift"', 'WARN'))
    fw = foot_wobble(masks); M['footWobble'] = r(fw, 4)
    C.append(chk('feet_still', fw < T['foot'], r(fw, 4), T['foot'], f'chân trôi {fw * 100:.1f} % chiều cao khung'))
    if stacked:
        fl = alpha_flicker(alphas); M['alphaFlicker'] = r(fl, 5)
        C.append(chk('alpha_stable', fl <= T['flicker'], r(fl, 5), T['flicker'], 'mép alpha nhấp nháy giữa các khung'))
        sh = max(floor_shadow(al) for al in alphas[:: max(1, len(alphas) // 8)]); M['shadowRatio'] = r(sh, 2)
        S['layer'] = stacked_layer(path, W, H)
        C.append(chk('no_floor_shadow', sh < T['shadow_ratio'], r(sh, 2), T['shadow_ratio'], 'còn bóng sàn dính ở chân (chạy trim_floor_shadow)'))
    st = overall([c for c in C if c['status'] != 'INFO'])
    return {'status': st, 'checks': C, 'metrics': M, 'suggest': S}


# ---------- anatomy & style + bảng ghép ----------
def grab_frames(path, idxs, stacked=False):
    """Lấy vài khung độ phân giải gốc (RGB) + mặt nạ alpha nếu stacked."""
    pr = ffprobe(path)
    v = next(s for s in pr['streams'] if s['codec_type'] == 'video')
    W, H = int(v['width']), int(v['height'])
    sel = '+'.join(f'eq(n\\,{i})' for i in idxs)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-vf', f'select={sel}', '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
    if stacked:
        hh = H // 2
        return [(f[:hh].copy(), gray(f[hh:hh * 2]) > 128) for f in fr]
    out = []
    for f in fr:
        bg, _, _ = border_uniformity(f)
        out.append((f.copy(), fg_mask(f, bg, 36)))
    return out


def anatomy_block(pairs, who, ref, cast_stroke, labels):
    """Chạy anatomy cho từng khung → checks gộp (giữ trạng thái xấu nhất mỗi mục) + số đo."""
    try:
        import asset_anatomy as AN
    except Exception as e:  # noqa: BLE001
        return [chk('anatomy', False, None, None, 'thiếu module anatomy: ' + str(e)[:80], 'WARN')], {}
    merged, figs = {}, {}
    rank = {'PASS': 0, 'INFO': 0, 'WARN': 1, 'FAIL': 2}
    for (rgb, mask), lab in zip(pairs, labels):
        mask = mask.copy(); e = max(1, int(round(min(mask.shape) * 0.004)))
        mask[:e] = False; mask[-e:] = False; mask[:, :e] = False; mask[:, -e:] = False
        mask = largest_component(mask)  # chỉ nhân vật chính, bỏ đốm rác/bóng rời
        fig = AN.analyze(rgb, mask)
        figs[lab] = fig
    # tỉ lệ đầu/thân & bảng màu là đặc tính nhận dạng → lấy TRUNG VỊ các khung (1 khung tay che đầu/mặt không làm FAIL)
    agg = dict(next(iter(figs.values()))) if figs else {}
    hr = [f.get('headRatio') for f in figs.values() if f.get('headRatio')]
    if hr:
        agg['headRatio'] = float(np.median(hr))
    if ref and ref.get('paletteSig'):
        ds = sorted(((AN.palette_distance(ref['paletteSig'], f.get('paletteSig')) or 0), k) for k, f in figs.items())
        if ds:
            agg['paletteSig'] = figs[ds[len(ds) // 2][1]].get('paletteSig')
    for lab, fig in figs.items():
        for name, ok, val, reason, lvl in AN.checks(fig, ref, who, cast_stroke):
            if name in ('head_ratio', 'palette_dna'):
                continue
            c = chk('anat_' + name, ok, val, None, f'[{lab}] {reason}', lvl)
            prev = merged.get(c['name'])
            if not prev or rank[c['status']] > rank[prev['status']]:
                merged[c['name']] = c
    for name, ok, val, reason, lvl in AN.checks(agg, ref, who, cast_stroke):
        if name in ('head_ratio', 'palette_dna'):
            merged['anat_' + name] = chk('anat_' + name, ok, val, None, f'[trung vị {len(figs)} khung] {reason}', lvl)
    return list(merged.values()), figs


def contact_sheet(tiles, out, cell=300):
    """Ghép 1–6 ảnh (numpy RGB) thành 1 hàng JPG để duyệt nhanh / gửi AI thị giác."""
    ims = []
    for t in tiles:
        im = Image.fromarray(t)
        im.thumbnail((cell, int(cell * 1.6)))
        ims.append(im)
    W = sum(i.width for i in ims) + 6 * (len(ims) + 1); H = max(i.height for i in ims) + 12
    sheet = Image.new('RGB', (W, H), (128, 128, 128)); x = 6
    for i in ims:
        sheet.paste(i, (x, 6)); x += i.width + 6
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    sheet.save(out, quality=85)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('file'); ap.add_argument('--kind', required=True, choices=['char', 'room', 'prop', 'clip', 'stacked'])
    ap.add_argument('--ratio'); ap.add_argument('--trimmed', action='store_true')
    ap.add_argument('--who', help='nhân vật (bật kiểm anatomy & style)'); ap.add_argument('--ref', help='JSON số đo DNA của nhân vật')
    ap.add_argument('--cast-stroke', help='biên nét viền của dàn: lo,hi'); ap.add_argument('--sheet', help='ghi bảng ghép JPG')
    ap.add_argument('--no-anatomy', action='store_true')
    a = ap.parse_args()
    if not os.path.exists(a.file):
        print(json.dumps({'status': 'FAIL', 'checks': [chk('exists', False, None, None, 'không thấy file')], 'metrics': {}, 'suggest': {}})); return
    if a.kind in ('clip', 'stacked'):
        res = check_clip(a.file, a.kind, a.trimmed)
    elif a.file.lower().endswith('.svg'):
        res = {'status': 'PASS', 'checks': [chk('svg', open(a.file, 'rb').read(200).lstrip().startswith((b'<svg', b'<?xml')), None, None, 'SVG không hợp lệ')], 'metrics': {'bytes': os.path.getsize(a.file)}, 'suggest': {}}
        res['status'] = overall(res['checks'])
    else:
        res = check_image(a.file, a.kind, a.ratio)
    ref = json.loads(a.ref) if a.ref else None
    cs = [float(x) for x in a.cast_stroke.split(',')] if a.cast_stroke else None
    tiles = []
    if a.kind in ('clip', 'stacked'):
        n = max(1, int(res['metrics'].get('frames') or 1))
        idx6 = sorted({0, n // 5, 2 * n // 5, 3 * n // 5, 4 * n // 5, n - 1})
        pairs = grab_frames(a.file, idx6, a.kind == 'stacked')
        tiles = [p[0] for p in pairs]
        if a.who and not a.no_anatomy:
            pick = [0, len(pairs) // 2, len(pairs) - 1]
            C, figs = anatomy_block([pairs[i] for i in pick], a.who, ref, cs, ['đầu', 'giữa', 'cuối'])
            res['checks'] += C; res['metrics']['anatomy'] = figs
    elif not a.file.lower().endswith('.svg'):
        arr, alpha, _ = load_image(a.file)
        tiles = [arr]
        if a.who and a.kind == 'char' and not a.no_anatomy:
            bg, _, _ = border_uniformity(arr)
            C, figs = anatomy_block([(arr, fg_mask(arr, bg))], a.who, ref, cs, ['ảnh'])
            res['checks'] += C; res['metrics']['anatomy'] = figs
            res['suggest']['ref'] = {k: figs['ảnh'].get(k) for k in ('headRatio', 'strokeW', 'paletteSig', 'eyeEdges', 'noise')}
    res['status'] = overall([c for c in res['checks'] if c['status'] != 'INFO'])
    if a.sheet and tiles:
        res['sheet'] = contact_sheet(tiles, a.sheet)
    print(json.dumps(res, ensure_ascii=False, default=lambda o: float(o) if isinstance(o, np.floating) else int(o) if isinstance(o, np.integer) else str(o)))


if __name__ == '__main__':
    main()
