#!/usr/bin/env python3
"""Tờ ảnh soát giám khảo kép (26/10): ảnh được NHẬN nhờ đồng thuận 2 mô hình (f.cons_soft) – để soát độ chính xác một lần trước khi bật cho fill.
  python3 scripts/vocab-img/cons_sheet.py --dir <thư mục có raw/ targets.json judge.local.a1.json> --out sheet.jpg"""
import argparse, json, os, re, textwrap
from PIL import Image, ImageDraw, ImageFont
ap = argparse.ArgumentParser(); ap.add_argument('--dir', required=True); ap.add_argument('--out', required=True); ap.add_argument('--attempt', type=int, default=1); a = ap.parse_args()
J = json.load(open(os.path.join(a.dir, f'judge.local.a{a.attempt}.json'))); T = json.load(open(os.path.join(a.dir, 'targets.json')))
ks = [k for k, v in J.items() if v['pass'] and v['f'].get('cons_soft')]
slug = lambda k: re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__'))
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13); FB = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 15)
except Exception: F = FB = ImageFont.load_default()
TH, C = 220, 4; W = C * (TH + 16) + 16; rows = max(1, (len(ks) + C - 1) // C); im = Image.new('RGB', (W, 50 + rows * (TH + 96)), '#FFF7EA'); d = ImageDraw.Draw(im)
d.text((16, 14), f'Giám khảo kép: {len(ks)} ảnh nhận thêm (trước đó trượt cổng mềm) / {len(J)} ảnh', font=FB, fill='#0F3D3E')
for i, k in enumerate(ks):
    x, y = 16 + (i % C) * (TH + 16), 50 + (i // C) * (TH + 96); p = os.path.join(a.dir, 'raw', f'{slug(k)}.a{a.attempt}.jpg')
    if os.path.exists(p): t = Image.open(p).convert('RGB'); t.thumbnail((TH, TH)); im.paste(t, (x, y))
    d.text((x, y + TH + 4), k, font=FB, fill='#0F3D3E')
    for j, ln in enumerate(textwrap.wrap((T.get(k) or {}).get('ex') or '', 34)[:3]): d.text((x, y + TH + 22 + j * 15), ln, font=F, fill='#333')
    c = re.sub(r'([a-z]+)[^:]*:', lambda m: {'llama': 'L', 'mistral': 'M', 'gemma': 'G', 'qwq': 'Q'}.get(m.group(1), m.group(1)[:1].upper()) + ':', J[k]['f'].get('cons', ''))
    d.text((x, y + TH + 70), ('giám khảo ' + c)[:30], font=F, fill='#17595A')   # tên mô hình rút gọn – không tràn sang ô bên (28/10)
im.save(a.out, quality=85); print(f'✓ tờ giám khảo kép: {len(ks)} ảnh → {a.out}')
