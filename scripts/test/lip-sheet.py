#!/usr/bin/env python3
"""Bảng trước/sau mặt vẽ khớp miệng: python3 scripts/test/lip-sheet.py qa/lip-before qa/lip-after -> qa/lip-sheet.jpg (tách -1, -2… nếu cao > 4000 px)."""
import os, sys
from PIL import Image, ImageDraw

before, after = sys.argv[1], sys.argv[2]
out = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(before.rstrip('/')) or '.', 'lip-sheet.jpg')
W, LABEL, GAP, MAXH = 360, 150, 6, 4000
names = sorted({f[:-4] for d in (before, after) if os.path.isdir(d) for f in os.listdir(d) if f.endswith('.png')})
if not names:
    print('lip-sheet: không có ảnh'); sys.exit(0)

def thumb(d, n):
    p = os.path.join(d, n + '.png')
    if not os.path.isfile(p):
        im = Image.new('RGB', (W, 120), (60, 60, 60)); ImageDraw.Draw(im).text((10, 50), 'không có ảnh', fill=(230, 230, 230)); return im
    im = Image.open(p).convert('RGB'); return im.resize((W, max(1, round(im.height * W / im.width))), Image.LANCZOS)

rows = [(n, thumb(before, n), thumb(after, n)) for n in names]
pages, cur, h = [], [], 0
for r in rows:
    rh = max(r[1].height, r[2].height) + GAP
    if cur and h + rh > MAXH: pages.append(cur); cur, h = [], 0
    cur.append(r); h += rh
if cur: pages.append(cur)
base, ext = os.path.splitext(out)
for i, pg in enumerate(pages):
    H = sum(max(r[1].height, r[2].height) + GAP for r in pg) + 30
    sheet = Image.new('RGB', (LABEL + 2 * W + GAP, H), (24, 24, 28)); d = ImageDraw.Draw(sheet)
    d.text((LABEL, 8), 'TRƯỚC (main)', fill=(255, 200, 120)); d.text((LABEL + W + GAP, 8), 'SAU (PR)', fill=(140, 230, 160))
    y = 30
    for n, b, a in pg:
        d.text((6, y + 4), n.replace('-', '\n'), fill=(235, 235, 235))
        sheet.paste(b, (LABEL, y)); sheet.paste(a, (LABEL + W + GAP, y)); y += max(b.height, a.height) + GAP
    path = out if len(pages) == 1 else f'{base}-{i + 1}{ext}'
    os.makedirs(os.path.dirname(path) or '.', exist_ok=True)
    sheet.save(path, quality=82); print('lip-sheet:', path, sheet.size)
