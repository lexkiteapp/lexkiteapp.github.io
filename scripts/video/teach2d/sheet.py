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
# layout board: one row per template, corner | side | bubble at the same moment (2 moments)
lrows = []
for e in eps:
    ims = [fit(p, 560) for L in ('corner', 'side', 'bubble') for p in sorted(glob.glob(f'{A}/tv-{e}-short-*/lay_{L}_*.png'))[:2]]
    if not ims: continue
    r = Image.new('RGB', (sum(i.width for i in ims) + 16 * len(ims), 616), '#0B171A'); d = ImageDraw.Draw(r); d.text((10, 8), f'{e}   corner · corner | side · side | bubble · bubble', fill='#FFC94A', font=F); x = 0
    for i in ims: r.paste(i, (x, 52)); x += i.width + 16
    lrows.append(r)
if lrows:
    W = max(r.width for r in lrows); L_ = Image.new('RGB', (W, sum(r.height for r in lrows)), '#0B171A'); y = 0
    for r in lrows: L_.paste(r, (0, y)); y += r.height
    L_.thumbnail((4000, 6000)); L_.save(f'{OUT}/layouts.jpg', quality=86)
for p in glob.glob(f'{A}/tv-embed-shots-*/*.png'): Image.open(p).convert('RGB').save(f'{OUT}/embed_{os.path.basename(p)[:-4]}.jpg', quality=85)
open(f'{OUT}/review.md', 'w').write('\n'.join(md) + '\n'); print('\n'.join(md))
bad = [q for q in qcs if not q['ok']]
_asked = json.loads(os.environ.get('TV_EPS') or 'null') or [os.path.basename(f)[:-5] for f in glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json')]   # every episode the run was asked for must have rendered
want = {(e, fm) for e in _asked for fm in ('short', 'wide')}
miss = sorted(want - {(q['ep'], q['format']) for q in qcs}); print('missing renders:', miss or 'none')
sys.exit(1 if not qcs or bad or miss else 0)
