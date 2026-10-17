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
ap.add_argument('--inner', type=float, default=18.0, help='khoảng cách Cb/Cr dưới mức này = chắc chắn nền')
ap.add_argument('--outer', type=float, default=46.0, help='trên mức này = chắc chắn nhân vật')
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
    solid = al > 0.5
    lab, n = ndi.label(solid)
    if n:
        sizes = ndi.sum(solid, lab, range(1, n + 1))
        keep = np.isin(lab, 1 + np.nonzero(sizes >= max(400, sizes.max() * 0.02))[0])
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
als = [np.median(np.stack(als[max(0, i - 1):i + 2]), axis=0) for i in range(len(als))]  # ổn định theo thời gian
refined = []
for al in als:
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
    c = despill(img, m / 255.0)[y0:y0 + hh, x0:x0 + ww]
    mm = m[y0:y0 + hh, x0:x0 + ww]
    fr = np.zeros((hh * 2, ww, 3), np.uint8)
    fr[:c.shape[0], :c.shape[1]] = c * (mm[..., None] > 0)  # nền đen dưới vùng trong suốt (không lộ xanh)
    fr[hh:hh + mm.shape[0], :mm.shape[1]] = mm[..., None]
    Image.fromarray(fr).save(f'{odir}/s{k:04d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(a.fps), '-i', f'{odir}/s%04d.png', '-c:v', 'libx264',
                '-pix_fmt', 'yuv420p', '-crf', '14', '-movflags', '+faststart', a.out], check=True)
mid = refined[len(refined) // 2][y0:y0 + hh, x0:x0 + ww]
rows = np.where(mid.max(1) > 60)[0]
sole = int(rows.max()) if len(rows) else hh
cols = np.where(mid[max(0, sole - 12):sole + 1].max(0) > 60)[0]
print(json.dumps({'alpha': 'stacked', 'source': 'chroma', 'w': int(ww), 'h': int(hh), 'foot': [int(cols.mean()) if len(cols) else ww // 2, sole],
                  'figH': sole, 'frames': len(rgbs), 'key': [int(v) for v in kc]}))
