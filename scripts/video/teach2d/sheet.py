#!/usr/bin/env python3
"""Teach2D owner review sheet: python3 scripts/video/teach2d/sheet.py <artifacts_dir> <out_dir>
One row per pilot: short contact sheet (episode theme) + 3 stills in the other theme + 16:9 embed sheet + in-app embed screenshots,
and review.md with the QC score / gates per render. Exit 1 when nothing rendered, any render failed QC, or a score < 90."""
import glob, json, os, sys
from PIL import Image, ImageDraw, ImageFont
A, OUT = sys.argv[1], sys.argv[2]; os.makedirs(OUT, exist_ok=True)
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
F = ImageFont.truetype(f'{ROOT}/brand/social/src/fonts/PlusJakartaSans-VF.ttf', 34); F.set_variation_by_axes([800])
qcs = [json.load(open(f)) for f in sorted(glob.glob(f'{A}/tv-*/qc.json'))]
eps = sorted({q['ep'] for q in qcs}); rows = []; md = ['# Teach2D pilots – review sheet', '', '| pilot | format | theme | score | failed gates |', '|---|---|---|---|---|']
for q in qcs: md.append(f"| {q['ep']} | {q['format']} | {q['theme']} | {q['score']} | {', '.join(k for k, g in q['gates'].items() if not g['ok']) or '–'} |")
def fit(p, h):
    im = Image.open(p).convert('RGB'); return im.resize((max(1, int(im.width * h / im.height)), h))
for e in eps:
    parts = []
    for pat in (f'{A}/tv-{e}-short-*/{e}-short.sheet.jpg', f'{A}/tv-{e}-short-*/alt_*.png', f'{A}/tv-{e}-wide-*/{e}-wide.sheet.jpg', f'{A}/tv-embed-shots-*/{e}-*-phone.png'):
        for p in sorted(glob.glob(pat)): parts.append(fit(p, 420))
    if not parts: continue
    w = sum(p.width for p in parts) + 16 * len(parts); row = Image.new('RGB', (w, 480), '#0B171A'); x = 0
    d = ImageDraw.Draw(row); sc = ' · '.join(f"{q['format']} {q['score']}" for q in qcs if q['ep'] == e); d.text((10, 8), f'{e}   QC {sc}', fill='#FFC94A', font=F)
    for p in parts: row.paste(p, (x, 56)); x += p.width + 16
    rows.append(row)
if rows:
    W = max(r.width for r in rows); S = Image.new('RGB', (W, sum(r.height for r in rows)), '#0B171A'); y = 0
    for r in rows: S.paste(r, (0, y)); y += r.height
    S.thumbnail((4000, 6000)); S.save(f'{OUT}/review.jpg', quality=86)
for p in glob.glob(f'{A}/tv-embed-shots-*/*.png'): Image.open(p).convert('RGB').save(f'{OUT}/embed_{os.path.basename(p)[:-4]}.jpg', quality=85)
open(f'{OUT}/review.md', 'w').write('\n'.join(md) + '\n'); print('\n'.join(md))
bad = [q for q in qcs if not q['ok']]
sys.exit(1 if not qcs or bad else 0)
