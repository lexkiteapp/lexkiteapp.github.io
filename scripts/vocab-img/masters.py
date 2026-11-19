#!/usr/bin/env python3
"""Kho ảnh GỐC cho video giảng dạy (26/10): ảnh cảnh đã qua giám khảo ở độ phân giải gốc (≤ 768 px, WebP q85) + manifest.json
{khoá: {file, ex, target, model, run}} → zip, CI tải lên GitHub Release 'vimg-masters' của repo (miễn phí, không làm nặng Pages/kho media).
  python3 scripts/vocab-img/masters.py --dir m --out vimg-masters-<run>.zip --run <run_id>"""
import argparse, glob, io, json, os, re, zipfile
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('--dir', required=True); ap.add_argument('--out', required=True); ap.add_argument('--run', default=''); a = ap.parse_args()
res = json.load(open(os.path.join(a.dir, 'result.json')))['items']; T = json.load(open(os.path.join(a.dir, 'targets.json')))
model = {}
for f in glob.glob(os.path.join(a.dir, 'gen.s*.json')):
    for r in json.load(open(f)):
        if r.get('model'): model[(r['k'], r.get('attempt'))] = r['model']
slug = lambda k: re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__'))
man, n = {}, 0
with zipfile.ZipFile(a.out, 'w', zipfile.ZIP_STORED) as z:
    for k, r in res.items():
        if not r.get('pass') or r.get('kind') == 'concept': continue
        att = r.get('att') or r.get('tries') or 1; p = os.path.join(a.dir, 'raw', f'{slug(k)}.a{att}.jpg')
        if not os.path.exists(p): continue
        im = Image.open(p).convert('RGB'); im.thumbnail((768, 768)); b = io.BytesIO(); im.save(b, 'WEBP', quality=85, method=6)
        fn = slug(k) + '.webp'; z.writestr(fn, b.getvalue()); n += 1
        t = T.get(k, {}); man[k] = {'file': fn, 'ex': t.get('ex'), 'target': t.get('target'), 'model': model.get((k, att)), 'run': a.run, 'w': im.width, 'h': im.height}
    z.writestr('manifest.json', json.dumps(man, ensure_ascii=False, indent=1))
print(f'✓ kho ảnh gốc: {n} ảnh → {a.out} ({os.path.getsize(a.out) // 1024} KB)')
