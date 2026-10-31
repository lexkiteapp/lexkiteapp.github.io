#!/usr/bin/env python3
"""Video ≤ 20 s miệng VẼ khớp tiếng (qa/lipsync/drawn.json từ drawn_frames.mjs) → qa/lipsync/drawn.mp4 + drawn.gif. Mặt = poster-2x đã xoá miệng gốc (mouth_board.face_base)."""
import json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).parent))
from mouth_board import face_base, render, font  # noqa: E402

QA = Path('qa/lipsync')
CROP = {'ama': (300, 130, 800, 560), 'carlos': (310, 140, 810, 570)}
D = json.loads((QA / 'drawn.json').read_text())
bases = {w: face_base(w) for w in ['ama', 'carlos']}
parts = []
for l in D['lines']:
    d = QA / 'dframes' / l['id']; d.mkdir(parents=True, exist_ok=True)
    base, keep = bases[l['who']]
    for k, g in enumerate(l['frames']):
        f = render(l['who'], base, keep, g).crop(CROP[l['who']])
        t = Image.new('RGBA', f.size, (221, 239, 240, 255)); t.alpha_composite(f)
        t = t.convert('RGB'); ImageDraw.Draw(t).text((16, f.size[1] - 40), l['text'], fill=(15, 42, 51), font=font(20))
        t.save(d / f'{k:04d}.png')
    mp4 = QA / f"d-{l['id']}.mp4"
    n = len(l['frames'])
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(D['fps']), '-i', str(d / '%04d.png'), '-i', l['wav'], '-af', 'apad', '-t', str(n / D['fps']),
                    '-vf', 'scale=480:-2,format=yuv420p', '-c:v', 'libx264', '-crf', '20', '-c:a', 'aac', '-ar', '48000', str(mp4)], check=True)
    parts.append(f"file '{mp4.resolve()}'")
(QA / 'dlist.txt').write_text('\n'.join(parts))
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(QA / 'dlist.txt'), '-c', 'copy', str(QA / 'drawn.mp4')], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(QA / 'drawn.mp4'), '-vf', 'fps=12,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=96[p];[b][p]paletteuse=dither=bayer', str(QA / 'drawn.gif')], check=True)
print('drawn.mp4', len(parts), 'câu')
