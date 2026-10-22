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
else:   # situational lesson: only backgrounds that share index tags with the lesson's own scene (a restaurant lesson never moves to a meeting room)
    IX = os.environ.get('CINE_LIB', '') + '/anchor/bg/index.json'; tags = {e['topic']: set(e.get('tags', [])) for e in json.load(open(IX))['items']} if os.path.exists(IX) else {}
    own = tags.get(sp['bg'], set()) - {'roleplay', 'phrases', 'speaking'}
    cand = sorted([b for b, t in tags.items() if b != sp['bg'] and len(own & t) >= 1], key=lambda b: (-len(own & tags[b]), hashlib.md5((sp['id'] + b).encode()).hexdigest()))
nxt = [b for b in cand if b not in tried and valid(b)]
if not nxt: sys.exit(1)
print(nxt[0])
