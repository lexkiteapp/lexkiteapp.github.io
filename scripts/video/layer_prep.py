#!/usr/bin/env python3
"""Chuẩn bị ảnh tĩnh nhân vật (dự phòng khi thiếu clip) cho scripts/video/render.mjs:
cắt bóng sàn dính (cutout.trim_floor_shadow – luật chống lơ lửng docs/ASSET-LIBRARY.md §0) → cắt sát → PNG trong suốt.

  python scripts/video/layer_prep.py in.png out.png
In ra JSON: {"w", "h", "foot": [x, y], "figH"} – foot = giữa đế giày (px trong ảnh ra).
Ảnh không có kênh alpha → thoát mã 2 (render bỏ nhân vật thay vì dán khung chữ nhật).
"""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from cutout import trim_floor_shadow

src, dst = sys.argv[1], sys.argv[2]
im = Image.open(src)
if 'A' not in im.getbands():
    print(json.dumps({'error': 'no-alpha'})); sys.exit(2)
rgba = np.array(im.convert('RGBA'))
try:
    out, _ = trim_floor_shadow(rgba)
except Exception:  # không tìm được đế giày (ảnh nửa người…) → giữ nguyên, cắt sát theo alpha
    ys = np.where(rgba[..., 3].max(1) > 10)[0]; out = rgba[ys.min():ys.max() + 1]
xs = np.where(out[..., 3].max(0) > 10)[0]
out = out[:, xs.min():xs.max() + 1]
h, w = out.shape[:2]
row = np.where(out[max(0, h - 12):, :, 3].max(0) > 60)[0]  # điểm chạm sàn: giữa các cột có alpha ở đáy
fx = int(row.mean()) if len(row) else w // 2
Image.fromarray(out).save(dst)
print(json.dumps({'w': int(w), 'h': int(h), 'foot': [fx, int(h)], 'figH': int(h)}))
