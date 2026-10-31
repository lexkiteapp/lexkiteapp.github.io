#!/usr/bin/env python3
"""Video ≤ 20 s mặt VẼ khớp tiếng (qa/lipsync/drawn.json từ drawn_frames.mjs) → qa/lipsync/drawn.mp4 + drawn.gif.
Mỗi khung = đầu trơn + lớp vector (face.js) + nghiêng/gật đầu (face_board.render). Có phụ đề câu."""
import json, subprocess, sys
from pathlib import Path
from PIL import ImageDraw
sys.path.insert(0, str(Path(__file__).parent))
from face_board import VCROP, bare_head, render, font  # noqa: E402

QA = Path('qa/lipsync')
D = json.loads((QA / 'drawn.json').read_text())
bases = {w: bare_head(w) for w in ['ama', 'carlos']}
parts = []
for l in D['lines']:
    d = QA / 'dframes' / l['id']; d.mkdir(parents=True, exist_ok=True)
    for k, (g, tilt, nod) in enumerate(l['frames']):
        f = render(l['who'], bases[l['who']], g, {'tilt': tilt, 'nod': nod}, box=VCROP[l['who']])
        dr = ImageDraw.Draw(f); dr.rectangle((0, f.size[1] - 34, f.size[0], f.size[1]), fill=(238, 245, 245))
        dr.text((10, f.size[1] - 28), l['text'], fill=(15, 42, 51), font=font(19))
        f.save(d / f'{k:04d}.png')
    mp4 = QA / f"d-{l['id']}.mp4"
    n = len(l['frames'])
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-framerate', str(D['fps']), '-i', str(d / '%04d.png'), '-i', l['wav'], '-af', 'apad', '-t', str(n / D['fps']),
                    '-vf', 'scale=480:-2:flags=lanczos,format=yuv420p', '-c:v', 'libx264', '-crf', '18', '-c:a', 'aac', '-ar', '48000', str(mp4)], check=True)
    parts.append(f"file '{mp4.resolve()}'")
(QA / 'dlist.txt').write_text('\n'.join(parts))
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', str(QA / 'dlist.txt'), '-c', 'copy', str(QA / 'drawn.mp4')], check=True)
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(QA / 'drawn.mp4'), '-vf', 'fps=15,scale=360:-2:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', str(QA / 'drawn.gif')], check=True)
print('drawn.mp4', len(parts), 'câu')
