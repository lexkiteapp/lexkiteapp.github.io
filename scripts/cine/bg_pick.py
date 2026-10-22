#!/usr/bin/env python3
"""bg_pick.py <lesson.json> <tried,csv> - next background to try after a placement / vision-gate failure (owner 22/10 §11: retry another bg up to 2x).
Candidates: the lesson's domain backgrounds (bg_topics.json domains), else the teaching pool for teaching areas, else every annotated background
with a valid standable zone; never one already tried. Prints the id, or nothing (exit 1) when none is left."""
import json, os, re, sys, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); D = f'{ROOT}/content/video/cine/news'
sp = json.load(open(sys.argv[1])); tried = {t for t in sys.argv[2].split(',') if t}; BT = json.load(open(f'{D}/bg_topics.json'))
txt = ' '.join([sp['point'], ' '.join(sp.get('series') or []), sp['hook']['card']]).lower()
dom = [d for d, v in BT['domains'].items() if any(re.search(r'\b' + re.escape(k), txt) for k in v['keywords'])]
ZD = os.environ.get('NEWS_ZONES', ''); valid = lambda b: (not ZD) or (os.path.exists(f'{ZD}/{b}.zones.json') and json.load(open(f'{ZD}/{b}.zones.json')).get('valid'))
if dom: cand = BT['domains'][dom[0]]['bg']
elif sp.get('area') in BT.get('teaching_areas', []): cand = BT.get('teaching_bg', [])
else: cand = sorted([f[:-11] for f in os.listdir(ZD) if f.endswith('.zones.json')] if ZD else [], key=lambda b: hashlib.md5((sp['id'] + b).encode()).hexdigest())
nxt = [b for b in cand if b not in tried and valid(b)]
if not nxt: sys.exit(1)
print(nxt[0])
