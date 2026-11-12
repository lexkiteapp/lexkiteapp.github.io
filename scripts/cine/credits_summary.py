#!/usr/bin/env python3
"""Summarize Kling credit ledgers (brand/library/cine/<bank>/tools/ledger.txt, local/private – they hold task ids) into
content/video/cine/credits.json: per bank totals only (credits for images/videos, item counts, rejects, first/last day, by day).
  credits_summary.py [<root with brand/library/cine>]   (default: this checkout)
Raw ledger lines are never copied."""
import glob, json, os, re, sys, collections

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
src = sys.argv[1] if len(sys.argv) > 1 else ROOT
banks = {}
for p in sorted(glob.glob(os.path.join(src, 'brand', 'library', 'cine', '*', 'tools', 'ledger.txt'))):
    bank = p.split(os.sep)[-3]; b = dict(img_cr=0, img_n=0, video_cr=0, video_n=0, rejects=0, first=None, last=None, by_day=collections.Counter())
    day = None
    for line in open(p, errors='replace'):
        for ts in re.findall(r'(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}', line):
            day = ts; b['first'] = min(b['first'] or ts, ts); b['last'] = max(b['last'] or ts, ts)
        f = line.split()
        if not f: continue
        cost = next((int(x) for x in reversed(f[1:-1]) if x.isdigit()), None) if f[0] in ('img', 'video') else None
        if f[0] == 'img' and cost is not None: b['img_cr'] += cost; b['img_n'] += 1
        elif f[0] == 'video' and cost is not None: b['video_cr'] += cost; b['video_n'] += 1
        elif f[0] == 'REJECT': b['rejects'] += 1
        if cost and day: b['by_day'][day] += cost
    b['total'] = b['img_cr'] + b['video_cr']; b['by_day'] = dict(sorted(b['by_day'].items()))
    banks[bank] = b
out = os.path.join(ROOT, 'content', 'video', 'cine', 'credits.json')
json.dump(dict(unit='Kling credits', source='brand/library/cine/*/tools/ledger.txt (summary only)', banks=banks,
               total=sum(b['total'] for b in banks.values())), open(out, 'w'), indent=1)
print(out, {k: v['total'] for k, v in banks.items()})
