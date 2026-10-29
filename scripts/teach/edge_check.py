#!/usr/bin/env python3
"""🔍 Mép nhân vật mượt, không răng cưa + độ nét (CI characters-shots.yml): poster/avatar + khung 12 của mọi clip trong web/teach.
Răng cưa = tỉ lệ điểm mép "bậc cứng" (alpha ≥ 240 kề ngay alpha ≤ 15, không có dải chuyển) trên tổng điểm mép; cần ≤ 25 %.
Độ nét = phương sai Laplacian trong thân (alpha ≥ 240) – báo cáo để soát, cổng ≥ 20. Dùng: edge_check.py web/teach"""
import json, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter
T = sys.argv[1]; R = json.load(open(f'{T}/characters.json')); errs, rows = [], []
def check(name, rgb, a):
    hard = (a >= 240) & ((np.roll(a, 1, 0) <= 15) | (np.roll(a, -1, 0) <= 15) | (np.roll(a, 1, 1) <= 15) | (np.roll(a, -1, 1) <= 15))
    edge = (a > 15) & (a < 240); jag = hard.sum() / max(1, hard.sum() + edge.sum())
    g = np.asarray(Image.fromarray(rgb).convert('L').filter(ImageFilter.FIND_EDGES), np.float32); sharp = float(g[a >= 240].var()) if (a >= 240).any() else 0
    rows.append(f'{name}: răng cưa {jag:.1%} · nét {sharp:.0f}')
    if jag > 0.25: errs.append(f'{name}: mép răng cưa {jag:.1%} > 25 %')
    if sharp < 20: errs.append(f'{name}: mờ (Laplacian {sharp:.0f} < 20)')
for who in R['people']:
    for k in ('poster', 'avatar'):
        im = np.asarray(Image.open(f'{T}/{who}/{k}.webp').convert('RGBA')); check(f'{who}/{k}', im[..., :3].copy(), im[..., 3])
    for f in sorted(os.listdir(f'{T}/{who}')):
        if not f.endswith('.mp4'): continue
        W, H = R['frame']['w'], R['frame']['h']
        b = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{T}/{who}/{f}', '-vf', 'select=eq(n\\,12)', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
        c = subprocess.run(['ffmpeg', '-v', 'error', '-i', f'{T}/{who}/{f}', '-vf', 'select=eq(n\\,12)', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
        a = np.frombuffer(b, np.uint8).reshape(H * 2, W)[H:]; rgb = np.frombuffer(c, np.uint8).reshape(H * 2, W, 3)[:H].copy()
        check(f'{who}/{f}', rgb, a)
print('\n'.join(rows))
if errs: print('✗ edge_check:\n  ' + '\n  '.join(errs)); sys.exit(1)
print(f'✓ edge_check: {len(rows)} tài sản – mép mượt, đủ nét')
