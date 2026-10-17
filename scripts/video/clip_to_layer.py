#!/usr/bin/env python3
"""Clip nhân vật Kling (nền trơn) → lớp trong suốt từng khung (isnet-anime) → ghép lên phòng → mp4 9:16.

  python scripts/video/clip_to_layer.py clip.mp4 room.png out.mp4 [--h 1150] [--cx 540] [--foot 1720] [--pingpong]
  python scripts/video/clip_to_layer.py clip.mp4 --stacked brand/library/clips/<who>_<action>.mp4 [--pingpong]
    → clip kho dựng (render.mjs): nửa trên màu, nửa dưới mặt nạ alpha (mp4 h264 không có alpha), đã cắt bóng sàn dính
      (cutout.trim_floor_shadow, luật §0 docs/ASSET-LIBRARY.md); in ra mục manifest gợi ý (foot, figH) để dán vào brand/library/manifest.json.

Ổn định mép: mask làm mượt theo thời gian (trung bình 3 khung) để không nhấp nháy viền.
Cần: ffmpeg, rembg (isnet-anime), pillow, numpy. Biến U2NET_HOME chỉ chỗ lưu model.
"""
import argparse, os, subprocess, tempfile, glob
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

ap = argparse.ArgumentParser()
ap.add_argument('clip'); ap.add_argument('room', nargs='?'); ap.add_argument('out', nargs='?')
ap.add_argument('--stacked', help='xuất clip kho dựng (màu + mặt nạ xếp chồng) thay vì ghép phòng')
ap.add_argument('--h', type=int, default=1150); ap.add_argument('--cx', type=int, default=540)
ap.add_argument('--foot', type=int, default=1720); ap.add_argument('--pingpong', action='store_true')
ap.add_argument('--fps', type=int, default=24)
a = ap.parse_args()
W, H = 1080, 1920
tmp = tempfile.mkdtemp()
subprocess.run(['ffmpeg', '-v', 'error', '-i', a.clip, '-vf', f'fps={a.fps}', f'{tmp}/f%04d.png'], check=True)
frames = sorted(glob.glob(f'{tmp}/f*.png'))
sess = new_session('isnet-anime')
alphas, rgbs = [], []
for p in frames:
    im = Image.open(p).convert('RGB')
    m = np.array(remove(im, session=sess, only_mask=True)).astype(np.float32)
    alphas.append(m); rgbs.append(np.array(im))
# làm mượt mask theo thời gian
sm = [np.mean(alphas[max(0, i - 1):i + 2], axis=0) for i in range(len(alphas))]
# khung bao chung cho cả clip (để nhân vật không "nhảy")
ys, xs = np.where(np.max(sm, axis=0) > 128)
y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
if a.stacked:
    import json, sys
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from cutout import trim_floor_shadow
    seq = list(range(len(frames))) + (list(range(len(frames)))[-2:0:-1] if a.pingpong else [])
    crops = [np.dstack([rgbs[i], sm[i].clip(0, 255).astype(np.uint8)])[y0:y1 + 1, x0:x1 + 1] for i in range(len(frames))]
    soles = []
    for c in crops:  # đế giày từng khung → lấy thấp nhất để cả clip cắt cùng 1 đường (không giật)
        try:
            soles.append(trim_floor_shadow(c)[1])
        except Exception:
            pass
    sole = max(soles) if soles else crops[0].shape[0]
    hh, ww = sole + (sole % 2), crops[0].shape[1] + (crops[0].shape[1] % 2)
    sdir = f'{tmp}/stk'; os.makedirs(sdir)
    for k, i in enumerate(seq):
        c = crops[i][:sole].copy()  # mọi thứ dưới đường đế (bóng sàn dính) bị bỏ
        # xoá cả bóng xám bán trong suốt quanh giày (cùng luật trim_floor_shadow) – không chỉ cắt dưới đế
        band = slice(max(0, sole - int(0.06 * sole)), sole)
        mx, mn = c[band][..., :3].max(2).astype(int), c[band][..., :3].min(2).astype(int)
        grey = (c[band][..., 3] < 235) & (mx > 130) & (mx < 228) & ((mx - mn) < 28)
        c[band][..., 3][grey] = 0
        fr = np.zeros((hh * 2, ww, 3), np.uint8)
        fr[:c.shape[0], :c.shape[1]] = c[..., :3]
        fr[hh:hh + c.shape[0], :c.shape[1]] = np.repeat(c[..., 3:4], 3, axis=2)
        Image.fromarray(fr).save(f'{sdir}/s{k:04d}.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(a.fps), '-i', f'{sdir}/s%04d.png', '-c:v', 'libx264',
                    '-pix_fmt', 'yuv420p', '-crf', '16', '-movflags', '+faststart', a.stacked], check=True)
    alpha = sm[len(sm) // 2][y0:y0 + sole, x0:x1 + 1]
    cols = np.where(alpha[max(0, sole - 12):] .max(0) > 60)[0]
    print(json.dumps({'file': os.path.relpath(a.stacked, 'brand/library'), 'alpha': 'stacked', 'w': ww, 'h': hh,
                      'foot': [int(cols.mean()) if len(cols) else ww // 2, int(sole)], 'figH': int(sole), 'frames': len(seq)}))
    raise SystemExit(0)
room = Image.open(a.room).convert('RGBA')
room = room.resize((W, round(W * room.height / room.width)), Image.LANCZOS).crop((0, 0, W, H))
room = Image.blend(room, room.filter(ImageFilter.GaussianBlur(2.2)), 0.6)
scale = a.h / (y1 - y0)
outdir = f'{tmp}/out'; os.makedirs(outdir)
seq = list(range(len(frames)))
if a.pingpong:
    seq = seq + seq[-2:0:-1]
for k, i in enumerate(seq):
    rgba = np.dstack([rgbs[i], sm[i].clip(0, 255).astype(np.uint8)])[y0:y1, x0:x1]
    sp = Image.fromarray(rgba, 'RGBA')
    sp = sp.resize((round(sp.width * scale), round(sp.height * scale)), Image.LANCZOS)
    fr = room.copy()
    fr.alpha_composite(sp, (int(a.cx - sp.width / 2), int(a.foot - sp.height)))
    fr.convert('RGB').save(f'{outdir}/o{k:04d}.png')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-framerate', str(a.fps), '-i', f'{outdir}/o%04d.png',
                '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', a.out], check=True)
print(a.out, len(seq), 'frames')
