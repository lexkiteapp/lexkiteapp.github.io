#!/usr/bin/env python3
"""Clip nhân vật Kling trên PHÔNG XANH → clip "stacked" (màu trên + mặt nạ dưới) sạch như vector.

  python scripts/video/chroma_key.py clip.mp4 out_stacked.mp4 [--key 00B140] [--scale 1] [--fps 24]

Vì sao phông xanh: tách nền bằng màu (không phải AI đoán) → mép sắc, KHÔNG còn bóng sàn, không nhấp nháy.
Các bước (mọi khung):
  1. Tự đo màu khoá từ viền khung (median) – không phụ thuộc mã khai báo.
  2. Mặt nạ mềm theo khoảng cách màu trong không gian YCbCr (Cb/Cr) – ngưỡng trong/ngoài → alpha 0..255 (khử răng cưa tự nhiên).
  3. Khử ám xanh (despill): kênh G không vượt max(R,B) ở vùng mép.
  4. Làm sạch: bỏ đốm nhỏ (connected components), lấp lỗ trong nhân vật, co mặt nạ 0,5 px rồi làm mềm 0,8 px → nét viền mịn như SVG.
  5. Ổn định theo thời gian: trung vị mặt nạ 3 khung liền kề → mép không rung.
  6. Khung bao chung cả clip (nhân vật không "nhảy"), đáy = đế giày (không có bóng nên không cần cắt bóng).
Đầu ra in JSON (w,h,foot,figH,frames) để ghi manifest. Phóng to nét (Real-ESRGAN anime) chạy riêng trên CI nếu --scale 2.
Cần: ffmpeg, numpy, pillow, scipy.
"""
import argparse, glob, json, os, subprocess, tempfile
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi

ap = argparse.ArgumentParser()
ap.add_argument('clip'); ap.add_argument('out')
ap.add_argument('--fps', type=int, default=24)
ap.add_argument('--inner', type=float, default=8.0, help='khoảng cách Cb/Cr dưới mức này = chắc chắn nền (phông Kling đồng nhất, nhiễu nén ≈ 1–5)')
ap.add_argument('--outer', type=float, default=24.0, help='trên mức này = chắc chắn nhân vật')
ap.add_argument('--gdom', type=float, default=6.0, help='G − max(R,B) ≤ mức này → chắc chắn nhân vật (giữ teal/xanh dương/ô liu)')
ap.add_argument('--refine', action='store_true', help='22/10: mép mịn (matte_refine: guided matte theo khoảng cách màu, co 1 px, mềm 0,3 px) + màu dưới vùng trong suốt = màu nhân vật kéo ra (KHÔNG đen) → hết viền đen/răng cưa khi co giãn')
a = ap.parse_args()

tmp = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-v', 'error', '-i', a.clip, '-vf', f'fps={a.fps}', f'{tmp}/f%04d.png'], check=True)
paths = sorted(glob.glob(f'{tmp}/f*.png'))
rgbs = [np.array(Image.open(p).convert('RGB')) for p in paths]


def ycbcr(x):
    x = x.astype(np.float32)
    y = 0.299 * x[..., 0] + 0.587 * x[..., 1] + 0.114 * x[..., 2]
    return y, (x[..., 2] - y) * 0.564, (x[..., 0] - y) * 0.713


def key_color(img):
    b = np.concatenate([img[:6].reshape(-1, 3), img[-6:].reshape(-1, 3), img[:, :6].reshape(-1, 3), img[:, -6:].reshape(-1, 3)])
    return np.median(b, axis=0)


kc = np.median([key_color(f) for f in rgbs[:: max(1, len(rgbs) // 6)]], axis=0)
_, kcb, kcr = ycbcr(kc[None, None, :])
kcb, kcr = float(kcb.squeeze()), float(kcr.squeeze())


def matte(img):
    _, cb, cr = ycbcr(img)
    d = np.hypot(cb - kcb, cr - kcr)
    al = np.clip((d - a.inner) / (a.outer - a.inner), 0, 1)
    x = img.astype(np.float32)
    al = np.maximum(al, (x[..., 1] - np.maximum(x[..., 0], x[..., 2]) <= a.gdom).astype(np.float32))  # không trội xanh lá → không phải phông (lỗi cũ: yếm teal của Ama bị trong suốt 40 %)
    gd = x[..., 1] - np.maximum(x[..., 0], x[..., 2])
    al = np.where(gd > np.maximum(22.0, 0.45 * x.max(-1)), 0.0, al)  # xanh lá trội rõ (cả xanh ĐẬM = bóng đổ trên phông, lỗi Mia 17/10) → nền
    solid = al > 0.5
    lab, n = ndi.label(solid)
    if n:
        sizes = ndi.sum(solid, lab, range(1, n + 1))
        # Chỉ giữ nhân vật chính (mảng lớn nhất) + mảng đủ lớn nằm trong khung bao của nó (nới 4 %) – loại tay/vật lạ thò vào từ mép khung (lỗi Kling 17/10)
        big = int(np.argmax(sizes)) + 1; sl = ndi.find_objects(lab)
        ys, xs = sl[big - 1]; py, px = int(img.shape[0] * 0.04), int(img.shape[1] * 0.04)
        Y0, Y1, X0, X1 = ys.start - py, ys.stop + py, xs.start - px, xs.stop + px
        ok = [i + 1 for i, s in enumerate(sl) if s is not None and sizes[i] >= max(400, sizes.max() * 0.02)
              and (i + 1 == big or (s[0].start >= Y0 and s[0].stop <= Y1 and s[1].start >= X0 and s[1].stop <= X1))]
        keep = np.isin(lab, ok)
        al = al * ndi.binary_dilation(keep, iterations=3)
        al = np.maximum(al, ndi.binary_fill_holes(keep).astype(np.float32) * (al > 0.02))
    return al


def despill(img, al):
    x = img.astype(np.float32)
    lim = np.maximum(x[..., 0], x[..., 2])
    edge = (al < 0.98)[..., None]
    g = np.where(edge[..., 0], np.minimum(x[..., 1], lim), x[..., 1])
    x[..., 1] = g
    return x.clip(0, 255).astype(np.uint8)


als = [matte(f) for f in rgbs]
# ổn định theo thời gian: trung vị 3 khung LIỀN NHAU, ở 2 đầu clip dời cửa sổ vào trong (không lấy trung vị 2 khung = trung bình →
# bóng đổ chỉ có ở khung đầu (ảnh tham chiếu Kling) thành viền xám alpha ~0,5 – lỗi mia_wave_clasp_travel 18/10 FAIL no_floor_shadow)
W3 = lambda i, n: slice(max(0, min(i - 1, n - 3)), max(0, min(i - 1, n - 3)) + 3)
als = [np.median(np.stack(als[W3(i, len(als))]), axis=0) for i in range(len(als))]
# …nhưng trung vị không được "mượn" thân từ khung bên cạnh: điểm xanh lá trội rõ TRONG CHÍNH khung đó luôn là nền
# (khung đầu Kling đổi tư thế → tay/thân khung 1–2 phủ lên vùng phông của khung 0 → hiện mảng xanh, lỗi mia_wave_clasp_travel 18/10)
def hard_bg(img):
    x = img.astype(np.float32); gd = x[..., 1] - np.maximum(x[..., 0], x[..., 2])
    return gd > np.maximum(22.0, 0.45 * x.max(-1))
als = [np.where(hard_bg(f), 0.0, al) for f, al in zip(rgbs, als)]
refined = []; colours = []
if a.refine:
    import sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import matte_refine as MR
for img, al in zip(rgbs, als):
    if a.refine:
        F, ar = MR.prepare_layer(img, al, kc); refined.append((ar * 255 + 0.5).astype(np.uint8)); colours.append(F.clip(0, 255).astype(np.uint8)); continue
    m = Image.fromarray((al * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))  # co 0,5 px + mềm 0,8 px
    refined.append(np.array(m))
ys, xs = np.where(np.max(np.stack(refined), axis=0) > 40)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
pad = 6
y0, x0 = max(0, y0 - pad), max(0, x0 - pad); y1, x1 = min(rgbs[0].shape[0] - 1, y1 + 2), min(rgbs[0].shape[1] - 1, x1 + pad)
hh, ww = (y1 - y0 + 1), (x1 - x0 + 1)
hh += hh % 2; ww += ww % 2
odir = f'{tmp}/o'; os.makedirs(odir)
for k, (img, m) in enumerate(zip(rgbs, refined)):
    mm = m[y0:y0 + hh, x0:x0 + ww]
    fr = np.zeros((hh * 2, ww, 3), np.uint8)
    if a.refine:   # màu kéo dài từ nhân vật (không đen) → co giãn kiểu straight-alpha không sinh viền tối
        c = colours[k][y0:y0 + hh, x0:x0 + ww]; fr[:c.shape[0], :c.shape[1]] = c
    else:
        c = despill(img, m / 255.0)[y0:y0 + hh, x0:x0 + ww]
        fr[:c.shape[0], :c.shape[1]] = c * (mm[..., None] > 0)  # nền đen dưới vùng trong suốt (không lộ xanh)
    fr[hh:hh + mm.shape[0], :mm.shape[1]] = mm[..., None]
    Image.fromarray(fr).save(f'{odir}/s{k:04d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(a.fps), '-i', f'{odir}/s%04d.png', '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p', '-crf', '14', '-movflags', '+faststart', a.out], check=True)
mid = refined[len(refined) // 2][y0:y0 + hh, x0:x0 + ww]
rows = np.where(mid.max(1) > 60)[0]
sole = int(rows.max()) if len(rows) else hh
cols = np.where(mid[max(0, sole - 12):sole + 1].max(0) > 60)[0]
# foot x = giữa 2 chiếc giày (trung bình cột bị lệch khi 1 chân nhấc)
print(json.dumps({'alpha': 'stacked', 'source': 'chroma', 'x0': int(x0), 'y0': int(y0), 'w': int(ww), 'h': int(hh), 'foot': [int((cols.min() + cols.max()) // 2) if len(cols) else ww // 2, sole],
                  'figH': sole, 'frames': len(rgbs), 'key': [int(v) for v in kc]}))
