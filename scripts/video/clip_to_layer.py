#!/usr/bin/env python3
"""Clip nhân vật Kling (nền trơn) → lớp trong suốt từng khung (isnet-anime) → ghép lên phòng → mp4 9:16.

  python scripts/video/clip_to_layer.py clip.mp4 room.png out.mp4 [--h 1150] [--cx 540] [--foot 1720] [--pingpong]

Ổn định mép: mask làm mượt theo thời gian (trung bình 3 khung) để không nhấp nháy viền.
Cần: ffmpeg, rembg (isnet-anime), pillow, numpy. Biến U2NET_HOME chỉ chỗ lưu model.
"""
import argparse, os, subprocess, tempfile, glob
import numpy as np
from PIL import Image, ImageFilter
from rembg import remove, new_session

ap = argparse.ArgumentParser()
ap.add_argument('clip'); ap.add_argument('room'); ap.add_argument('out')
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
