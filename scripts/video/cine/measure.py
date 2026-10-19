#!/usr/bin/env python3
"""Đo đạc cho cổng QA chế độ "cine" (docs/VIDEO-PIPELINE.md §13) – chỉ ĐO, không phán: ngưỡng nằm ở gates.mjs (JS, có unit test).

  python measure.py ref <ảnh nhân vật nền trơn>            → chiều cao, hộp đầu, số "đầu" (cao/đầu), bảng màu, màu áo/tay áo, hist đầu
  python measure.py frame <ảnh> [--max-side 960]           → người (bộ dò vật thể "person" + Pose trong hộp), mặt/đầu, bảng màu, vạch quầy
  python measure.py video <mp4> --times 0.5,2.5,4.5        → như frame cho từng khung lấy mẫu (ffmpeg trích 1 khung/lần – nhẹ CPU)
  python measure.py facematch <ảnh mặt> --refs a.png,b.png → độ giống hist đầu với từng ref (chọn mặt Lip Sync khi khung có 2 mặt)

In ra 1 dòng JSON. MediaPipe Tasks (CPU). Mô hình tìm trong env LEXKITE_MP_MODELS, .tools/mediapipe, .tools/mp-extra:
pose_landmarker_full.task, face_landmarker.task, efficientdet_lite2.tflite (tải từ storage.googleapis.com/mediapipe-models).
Ghi chú hiệu chỉnh (pilot latte 19/10): face landmarker KHÔNG bắt mặt hoạt hình; Pose chập chờn trên ảnh 2 người; bộ dò "person"
(EfficientDet-Lite2, COCO) bắt ổn cả người đứng sau quầy → dùng nó cho hộp người, Pose chỉ để lấy đầu/tay áo trong hộp.
Thiếu MediaPipe/mô hình → "mp": "unavailable…" (cổng = cần duyệt tay, không bao giờ tự PASS).
"""
import json, os, subprocess, sys, tempfile
os.environ.setdefault('MPLCONFIGDIR', os.path.join(tempfile.gettempdir(), 'lexkite-mpl'))
os.environ.setdefault('GLOG_minloglevel', '3')
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '3')
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..'))
from asset_anatomy import srgb_to_lab, dominant, palette_sig  # noqa: E402  (dùng chung với kho nhân vật)

ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
VIS = 0.5
_M = {}


def model_path(f):
    for d in [os.environ.get('LEXKITE_MP_MODELS'), os.path.join(ROOT, '.tools', 'mediapipe'), os.path.join(ROOT, '.tools', 'mp-extra')]:
        if d and os.path.exists(os.path.join(d, f)):
            return os.path.join(d, f)
    raise FileNotFoundError('thiếu mô hình ' + f)


def models():
    if 'ok' in _M:
        return _M.get('m')
    _M['ok'] = True
    try:
        from mediapipe.tasks import python as mpt
        from mediapipe.tasks.python import vision as V
        bo = lambda f: mpt.BaseOptions(model_asset_path=model_path(f))
        _M['m'] = {
            'pose': V.PoseLandmarker.create_from_options(V.PoseLandmarkerOptions(base_options=bo('pose_landmarker_full.task'), num_poses=2, min_pose_detection_confidence=0.3, min_pose_presence_confidence=0.3)),
            'face': V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=bo('face_landmarker.task'), num_faces=4, min_face_detection_confidence=0.3, min_face_presence_confidence=0.3)),
            'det': V.ObjectDetector.create_from_options(V.ObjectDetectorOptions(base_options=bo('efficientdet_lite2.tflite'), max_results=10, score_threshold=0.2, category_allowlist=['person'])),
        }
    except Exception as e:  # noqa: BLE001
        _M['err'] = str(e)[:200]
        _M['m'] = None
    return _M['m']


def mp_image(rgb):
    import mediapipe as mp
    return mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))


def load(path, max_side=960):
    im = Image.open(path).convert('RGB')
    s = max_side / max(im.size)
    if s < 1:
        im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return np.asarray(im)


def hist_of(crop):
    """Histogram HSV 8×4×4 – nhận diện thô (đầu/tóc/da), chịu được đổi ánh sáng nhẹ."""
    if crop is None or crop.size < 300:
        return None
    hsv = np.asarray(Image.fromarray(np.ascontiguousarray(crop)).convert('HSV')).reshape(-1, 3).astype(np.int32)
    idx = (hsv[:, 0] * 8 // 256) * 16 + (hsv[:, 1] * 4 // 256) * 4 + (hsv[:, 2] * 4 // 256)
    hist = np.bincount(idx, minlength=128).astype(np.float64)
    return [round(float(v), 5) for v in hist / max(1.0, hist.sum())]


def crop(rgb, box):
    h, w, _ = rgb.shape
    x0, y0, x1, y1 = [int(round(v)) for v in box]
    x0, x1 = max(0, x0), min(w, x1); y0, y1 = max(0, y0), min(h, y1)
    return rgb[y0:y1, x0:x1] if x1 > x0 and y1 > y0 else None


def hist_sim(a, b):
    """Hệ số Bhattacharyya (1 = giống hệt)."""
    if not a or not b:
        return None
    return round(float(np.sum(np.sqrt(np.asarray(a) * np.asarray(b)))), 4)


def sig_px(px, k=4):
    return palette_sig(px.reshape(-1, 1, 3), np.ones((len(px), 1), bool), k=k) if px is not None and len(px) >= 200 else []


def head_box(vis, w, h):
    """Hộp đầu từ điểm Pose 0–10 (mắt, tai): cạnh = max(khoảng 2 tai, 2,4 × khoảng 2 mắt) · 1,25; trên = tâm mắt − 0,95 cạnh (tóc)."""
    eyes = [vis[i] for i in (2, 5) if vis[i][2] >= VIS * 0.6]
    if len(eyes) < 2:
        return None
    ears = [vis[i] for i in (7, 8) if vis[i][2] >= VIS * 0.3]
    ex = (eyes[0][0] + eyes[1][0]) / 2; ey = (eyes[0][1] + eyes[1][1]) / 2
    side = max(abs(ears[0][0] - ears[1][0]) if len(ears) == 2 else 0, 2.4 * abs(eyes[0][0] - eyes[1][0])) * 1.25
    if side < 8:
        return None
    b = [max(0.0, ex - side / 2), max(0.0, ey - 0.95 * side), min(float(w), ex + side / 2), min(float(h), ey + 0.55 * side)]
    return {'box': [round(v, 1) for v in b], 'h': round(b[3] - b[1], 1), 'cx': round(ex, 1)}


def sleeve_px(rgb, vis):
    """Điểm ảnh dọc đoạn vai→khuỷu 2 tay (tay áo – tạp dề không che): bắt đổi màu áo (pilot: áo Carlos thành xanh)."""
    h, w, _ = rgb.shape
    sw = abs(vis[11][0] - vis[12][0]); r = max(2, int(sw * 0.07)); px = []
    for s_, e_ in ((11, 13), (12, 14)):
        a, b = vis[s_], vis[e_]
        if min(a[2], b[2]) < VIS * 0.6:
            continue
        for t in np.linspace(0.25, 0.75, 6):
            x = int(a[0] + (b[0] - a[0]) * t); y = int(a[1] + (b[1] - a[1]) * t)
            px.append(rgb[max(0, y - r):min(h, y + r), max(0, x - r):min(w, x + r)].reshape(-1, 3))
    px = np.concatenate(px) if px else np.zeros((0, 3), np.uint8)
    return px if len(px) >= 60 else None


def pose_in(rgb, m, box=None):
    """Pose trong hộp (hoặc cả ảnh) → {head, feet, sleeve} theo toạ độ ảnh gốc."""
    ox, oy = (int(max(0, box[0])), int(max(0, box[1]))) if box else (0, 0)
    sub = crop(rgb, box) if box else rgb
    if sub is None or min(sub.shape[:2]) < 48:
        return None
    r = m['pose'].detect(mp_image(sub))
    if not r.pose_landmarks:
        return None
    h, w, _ = sub.shape
    pl = r.pose_landmarks[0]
    vis = [(pl[i].x * w, pl[i].y * h, float(pl[i].visibility or 0)) for i in range(33)]
    hb = head_box(vis, w, h)
    if hb:
        hb['box'] = [round(hb['box'][0] + ox, 1), round(hb['box'][1] + oy, 1), round(hb['box'][2] + ox, 1), round(hb['box'][3] + oy, 1)]; hb['cx'] = round(hb['cx'] + ox, 1)
    sl = sleeve_px(sub, vis)
    feet = [vis[i] for i in (27, 28, 29, 30, 31, 32)]
    feet_ok = sum(1 for x, y, v in feet if v >= VIS and 0 <= y <= h * 0.995) >= 2
    return {'head': hb, 'sleeve': dominant(sl) if sl is not None else None, 'sleeveSig': sig_px(sl), 'feetVisible': feet_ok}


def iou(a, b):
    ix = max(0, min(a[2], b[2]) - max(a[0], b[0])); iy = max(0, min(a[3], b[3]) - max(a[1], b[1]))
    u = (a[2] - a[0]) * (a[3] - a[1]) + (b[2] - b[0]) * (b[3] - b[1]) - ix * iy
    return ix * iy / u if u > 0 else 0


def persons_of(rgb, m):
    h, w, _ = rgb.shape
    r = m['det'].detect(mp_image(rgb))
    dets = []
    for d in sorted(r.detections, key=lambda d: -d.categories[0].score):
        bb = d.bounding_box
        box = [float(bb.origin_x), float(bb.origin_y), float(bb.origin_x + bb.width), float(bb.origin_y + bb.height)]
        if bb.height < h * 0.12 or any(iou(box, x['box']) > 0.5 for x in dets):
            continue
        # hộp "cả khung" điểm thấp (pilot: 0,29 bao cả 2 người) – bỏ nếu chứa trọn 1 hộp tốt hơn
        if bb.width > w * 0.8 and any(x['box'][0] >= box[0] - 2 and x['box'][2] <= box[2] + 2 and x['box'][1] >= box[1] - 2 and x['box'][3] <= box[3] + 2 for x in dets):
            continue
        dets.append({'box': [round(v, 1) for v in box], 'score': round(float(d.categories[0].score), 3)})
    out = []
    for p in dets[:4]:
        b = p['box']
        px = crop(rgb, b)
        p['cx'] = round((b[0] + b[2]) / 2, 1)
        p['h'] = round(b[3] - b[1], 1)
        p['touchesTop'] = b[1] <= h * 0.01
        p['touchesBottom'] = b[3] >= h * 0.99
        p['sig'] = sig_px(px.reshape(-1, 3) if px is not None else None, k=10)
        ps = pose_in(rgb, m, [b[0] - 0.05 * (b[2] - b[0]), b[1] - 0.05 * p['h'], b[2] + 0.05 * (b[2] - b[0]), b[3]])
        if ps:
            p.update({k: v for k, v in ps.items() if v is not None})
        hb = p.get('head')
        p['headHist'] = hist_of(crop(rgb, hb['box'])) if hb else hist_of(crop(rgb, [b[0], b[1], b[2], b[1] + 0.22 * p['h']]))
        out.append(p)
    out.sort(key=lambda p: p['cx'])
    return out


def faces_of(rgb, m):
    h, w, _ = rgb.shape
    r = m['face'].detect(mp_image(rgb))
    out = []
    for f in r.face_landmarks:
        xs = np.array([p.x for p in f]) * w; ys = np.array([p.y for p in f]) * h
        box = [float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())]
        out.append({'box': [round(v, 1) for v in box], 'h': round(box[3] - box[1], 1), 'cx': round((box[0] + box[2]) / 2, 1), 'src': 'face'})
    return out


def counter_line(rgb, lo=0.35, hi=0.8):
    """Vạch ngang dài mạnh nhất (mặt quầy) trong dải chiều cao [lo, hi] → y (px) + độ dài tương đối; None nếu không rõ."""
    g = rgb.mean(axis=2)
    h = g.shape[0]
    row = (np.abs(np.diff(g, axis=0)) > 18).mean(axis=1)
    a, b = int(h * lo), int(h * hi)
    seg = row[a:b]
    if not len(seg):
        return None
    i = int(np.argmax(seg))
    return {'y': a + i, 'strength': round(float(seg[i]), 3)} if seg[i] >= 0.45 else None


def text_like(rgb):
    """Mật độ nét chữ thô (cạnh mảnh, tương phản cao) theo 3 dải ngang – chỉ để báo, quyết định gibberish thuộc AI thị giác/duyệt tay."""
    g = rgb.mean(axis=2)
    e = (np.abs(np.diff(g, axis=1))[:-1, :] > 60) & (np.abs(np.diff(g, axis=0))[:, :-1] > 30)
    h = e.shape[0]
    return [round(float(e[int(h * a):int(h * b)].mean()), 4) for a, b in ((0, 0.33), (0.33, 0.66), (0.66, 1))]


def fg_mask(rgb):
    """Ảnh tham chiếu nền xám trơn: tách nền theo màu góc."""
    c = np.concatenate([rgb[:8, :8].reshape(-1, 3), rgb[:8, -8:].reshape(-1, 3), rgb[-8:, :8].reshape(-1, 3), rgb[-8:, -8:].reshape(-1, 3)])
    return np.abs(rgb.astype(np.int32) - np.median(c, axis=0)).sum(axis=2) > 36


def cmd_ref(path):
    rgb = load(path, 1200)
    mask = fg_mask(rgb)
    ys, xs = np.nonzero(mask)
    H = int(ys.max() - ys.min() + 1) if len(ys) else 0
    out = {'kind': 'ref', 'file': path, 'w': rgb.shape[1], 'h': rgb.shape[0], 'height': H, 'top': int(ys.min()) if len(ys) else None, 'palette': palette_sig(rgb, mask, k=8)}
    if len(ys):  # bảng màu phần TRÊN của nhân vật (khung cận / người đứng sau quầy chỉ thấy nửa trên → không đòi màu quần/giày)
        t0 = int(ys.min()); band = np.zeros_like(mask)
        out['bands'] = {}
        for f in (0.5, 0.65):
            band[:] = False; band[:t0 + int(f * H)] = True
            out['bands'][str(f)] = palette_sig(rgb, mask & band, k=8)
    m = models()
    if m is None:
        out['mp'] = 'unavailable: ' + _M.get('err', '')
        return out
    ps = pose_in(rgb, m)
    if ps:
        out.update({k: v for k, v in ps.items() if v is not None and k != 'feetVisible'})
        if ps.get('head'):
            out['heads'] = round(H / max(1.0, ps['head']['h']), 3)
            out['headHist'] = hist_of(crop(rgb, ps['head']['box']))
    return out


def analyze(rgb):
    small = rgb[::4, ::4].reshape(-1, 3)
    out = {'w': rgb.shape[1], 'h': rgb.shape[0], 'counter': counter_line(rgb), 'textLike': text_like(rgb), 'sig': sig_px(small, k=14)}
    m = models()
    if m is None:
        out['mp'] = 'unavailable: ' + _M.get('err', '')
        return out
    out['persons'] = persons_of(rgb, m)
    faces = faces_of(rgb, m)
    if not faces:  # mặt hoạt hình: face landmarker không bắt → phần trên hộp người (22 % nếu toàn thân, 35 % nếu nửa người); hộp đầu Pose quá chập chờn (pilot)
        for p in out['persons']:
            b = p['box']; fr = 0.22 if p['h'] > 1.9 * (b[2] - b[0]) else 0.35
            faces.append({'box': [b[0], b[1], b[2], round(b[1] + fr * p['h'], 1)], 'h': round(fr * p['h'], 1), 'cx': p['cx'], 'src': 'person-top'})
    out['faces'] = faces
    return out


def cmd_frame(path, max_side=960):
    o = analyze(load(path, max_side)); o['file'] = path
    return o


def cmd_video(path, times):
    out = {'kind': 'video', 'file': path, 'frames': []}
    with tempfile.TemporaryDirectory() as d:
        for t in times:
            f = os.path.join(d, f'f{t:.2f}.png')
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', path, '-frames:v', '1', '-vf', 'scale=-2:960', f], check=True)
            if os.path.exists(f):
                o = analyze(load(f, 960)); o['t'] = t; out['frames'].append(o)
    return out


def cmd_facematch(path, refs):
    h = hist_of(load(path, 512))  # ảnh mặt Kling (face_image) = khung cắt sẵn quanh mặt
    return {'kind': 'facematch', 'file': path, 'sim': {r: hist_sim(h, cmd_ref(r).get('headHist')) for r in refs if r}}


def main(a):
    if len(a) < 2:
        print(__doc__); return 2
    opt = lambda k, d=None: a[a.index(k) + 1] if k in a else d
    c, p = a[0], a[1]
    if c == 'ref':
        o = cmd_ref(p)
    elif c == 'frame':
        o = cmd_frame(p, int(opt('--max-side', 960)))
    elif c == 'video':
        o = cmd_video(p, [float(x) for x in opt('--times', '0.5,2.5,4.5').split(',')])
    elif c == 'facematch':
        o = cmd_facematch(p, opt('--refs', '').split(','))
    else:
        print(__doc__); return 2
    print(json.dumps(o, separators=(',', ':')))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
