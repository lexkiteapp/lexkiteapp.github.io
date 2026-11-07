#!/usr/bin/env python3
"""🖼️ Ảnh tư thế từ ẢNH chuẩn phông xanh (gesture bank "chỉ làm ảnh", chủ 05/11) → web/teach/<who>/still-<pose>.webp, cùng khung y hệt build.py.

Nguồn: characters.json people.<who>.stills.<pose>.src = đường dẫn trong lexkite-media (ảnh Kling 2K đã qua qc_green.py still + soát mắt).
Ảnh chuẩn cùng bố cục khung đầu khoá (green_<who>_o3*_ref) = khung đầu của footage → thu về cỡ footage rồi dùng ĐÚNG phép cắt/cỡ/đệm/mờ đáy của build.py.
Tách nền: khoá xanh mềm (độ trội xanh → alpha, dải chuyển 2–3 px), khử ánh xanh viền, bỏ đốm rời. Cổng: viền ánh xanh ≤ 0,4 % (= build.py edge_qc),
không đỉnh đầu sát mép, mắt mở (eyes.openness ≥ 45 % ref). Ghi sha256 vào characters.json files. Chạy ở CI teach-build.yml sau build.py.
Dùng: still_img.py [web/teach] [--src <thư mục ảnh tải sẵn>]"""
import hashlib, json, os, sys, urllib.request
import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eyes import openness   # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else 'web/teach'
SRC = sys.argv[sys.argv.index('--src') + 1] if '--src' in sys.argv else None
MEDIA = 'https://raw.githubusercontent.com/lexkiteapp/lexkite-media/main/'
REG = f'{OUT}/characters.json'; R = json.load(open(REG)); F = R['frame']; W, H = F['w'], F['h']
FW = 1080   # bề ngang footage Kling 1080p (khung đầu khoá = khung 0 của clip) – toạ độ people.<who>.eye theo hệ này
errs = []


def key(rgb):
    """Alpha mềm theo độ trội xanh so với màu nền đo ở góc ảnh; khử ánh xanh ở viền."""
    f = rgb.astype(np.float32); r, g, b = f[..., 0], f[..., 1], f[..., 2]
    bg = np.median(np.concatenate([f[:40, :40].reshape(-1, 3), f[:40, -40:].reshape(-1, 3)]), 0)
    dom = g - np.maximum(r, b); dom_bg = bg[1] - max(bg[0], bg[2])
    a = np.clip((dom_bg * 0.80 - dom) / (dom_bg * 0.45), 0, 1)          # ≥ 80 % độ trội nền → trong suốt; dải chuyển mềm
    m = Image.fromarray((a * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))   # co 1 px rồi mịn mép
    a = np.asarray(m, np.float32) / 255
    lab = (a > 0.05).astype(np.uint8)                                  # bỏ đốm rời: chỉ giữ thành phần lớn nhất
    try:
        from scipy import ndimage
        L, n = ndimage.label(lab)
        if n > 1: keep = 1 + int(np.argmax(ndimage.sum(lab, L, range(1, n + 1)))); a = a * (L == keep)
    except ImportError:
        pass
    spill = np.maximum(0, g - np.maximum(r, b)); edge = a < 0.98
    f[..., 1] = np.where(edge, g - spill, g)                            # khử ánh xanh: xanh không vượt max(đỏ, lam) ở viền
    return np.clip(f, 0, 255).astype(np.uint8), a


def frame_of(who, im):
    """Cùng phép cắt build.py (lượt 2): cỡ đầu chuẩn hoá theo eye_mouth, mắt tại eye_y, đệm trong suốt, mờ đáy 10 %, bản 2×."""
    P = R['people'][who]; s = P['eye_mouth'] / F['eye_mouth']; CH = round(H * s / 2) * 2; CY = round(P['eye'][1] - F['eye_y'] * CH)
    FH = round(FW * im.height / im.width); im = im.resize((FW, FH), Image.LANCZOS)
    X0 = P['eye'][0] - W * s / 2; cx0, cx1 = max(0, round(X0)), min(FW, round(X0 + W * s)); CW = (cx1 - cx0) // 2 * 2
    SW = min(W, round(CW / s / 2) * 2); PX = min(W - SW, max(0, round((cx0 - X0) / s)))
    if CY < 0 or CY + CH > FH: errs.append(f'{who}: khung cao {CH}+{CY} ra ngoài ảnh {FW}x{FH}'); return None
    rgb, a = key(np.asarray(im.convert('RGB')))
    rgba = np.dstack([rgb, (a * 255).astype(np.uint8)])[CY:CY + CH, cx0:cx0 + CW]
    rgba = rgba.copy(); rgba[rgba[..., 3] == 0, :3] = 0
    crop = Image.fromarray(rgba, 'RGBA').convert('RGBa').resize((SW * 2, H * 2), Image.LANCZOS).convert('RGBA')   # thu nhỏ trên alpha nhân sẵn: màu xanh của điểm trong suốt không lem vào viền
    out = Image.new('RGBA', (W * 2, H * 2), (0, 0, 0, 0)); out.paste(crop, (PX * 2, 0))
    o = np.array(out); y = np.arange(H * 2, dtype=np.float32)[:, None]
    v = o[..., :3].astype(np.int16); lim = np.maximum(v[..., 0], v[..., 2]); m = o[..., 3] < 245   # khử ánh xanh lần 2 SAU thu nhỏ (Lanczos trộn/rung viền làm xanh quay lại)
    o[..., 1] = np.where(m, np.minimum(v[..., 1], lim), v[..., 1]).astype(np.uint8)
    o[..., 3] = (o[..., 3] * np.minimum(1, (H * 2 - y) / (H * 2 * 0.10))).astype(np.uint8)   # mờ đáy như FA2
    o[o[..., 3] == 0, :3] = 0
    return o


def qc(name, o, ref):
    A = o[..., 3].astype(np.int32); C = o[..., :3].astype(np.int32); e = (A > 16) & (A < 240)
    spill = ((C[e][:, 1] > np.maximum(C[e][:, 0], C[e][:, 2]) + 22) & (C[e][:, 1] > 50)).mean() if e.sum() else 0
    if spill > 0.004: errs.append(f'{name}: viền ánh xanh {spill:.2%} > 0,4 %')
    rows = np.nonzero((A > 128).any(1))[0]
    if not len(rows) or rows[0] < o.shape[0] * 0.03: errs.append(f'{name}: đỉnh đầu sát/mất mép trên')
    sc = openness(o, F['eye_y'])
    if ref and sc < 0.45 * ref: errs.append(f'{name}: mắt nhắm (độ mở {sc:.4f} < 45 % ref {ref:.4f})')
    print(f'  qc {name}: viền {int(e.sum())} px, ánh xanh {spill:.3%}, mắt {sc:.4f} / ref {ref}')


for who, P in R['people'].items():
    for pose, c in sorted((P.get('stills') or {}).items()):
        name = f'{who}/still-{pose}.webp'; loc = os.path.join(SRC, os.path.basename(c['src'])) if SRC else None
        if loc and os.path.exists(loc): im = Image.open(loc)
        else:
            import io; im = Image.open(io.BytesIO(urllib.request.urlopen(MEDIA + c['src'], timeout=60).read()))
        o = frame_of(who, im)
        if o is None: continue
        qc(name, o, P.get('eye_ref'))
        Image.fromarray(o, 'RGBA').save(f'{OUT}/{name}', 'WEBP', quality=88, method=6)
        d = open(f'{OUT}/{name}', 'rb').read(); R['files'][name] = {'sha256': hashlib.sha256(d).hexdigest(), 'bytes': len(d)}
        print(f'{name}: {len(d) // 1024} KB ← {c["src"]}')
R['files'] = dict(sorted(R['files'].items()))
json.dump(R, open(REG, 'w'), ensure_ascii=False, indent=2); open(REG, 'a').write('\n')
for e in errs: print(f'::error::{e}')
sys.exit(1 if errs else 0)
