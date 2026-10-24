#!/usr/bin/env python3
"""Gold script (content/video/scripts/gold/src/*.jsonl) -> template-1b lesson for render_tpl.py (docs/VIDEO-TEMPLATES.md §8).
  python3 scripts/video/tpl/gold2lesson.py <pid> --plate airport_gate --host carlos --clip gc4_q34_talk --area grammar-check \
      --series "AIRPORT ENGLISH" --formula "TOO + adjective" [--quote "too much"] --out content/video/cine/news/tpl1b
Writes <out>/<id>.json (news 'fix' schema + plate/host/cta/quiz) and merges its lines into <out>/lines.json (one voice = the host)."""
import json, os, re, sys, glob, argparse, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import PLATES, HOSTS
ap = argparse.ArgumentParser()
ap.add_argument('pid'); ap.add_argument('--plate', required=True); ap.add_argument('--host', required=True); ap.add_argument('--clip', required=True)
ap.add_argument('--area', required=True); ap.add_argument('--series', required=True); ap.add_argument('--formula', required=True)
ap.add_argument('--quote', default=None); ap.add_argument('--hook', default='Stop saying this.'); ap.add_argument('--out', default=f'{ROOT}/content/video/cine/news/tpl1b')
o = ap.parse_args()
G = {}
for p in sorted(glob.glob(f'{ROOT}/content/video/scripts/gold/src/*.jsonl')):
    for l in open(p):
        if l.strip(): r = json.loads(l); G[r['p']] = r
g = G.get(o.pid) or sys.exit(f'gold script not found: {o.pid}')
if o.plate not in PLATES: sys.exit(f'plate {o.plate} is not in tokens.PLATES (human-checked clean plates)')
if o.host not in HOSTS: sys.exit(f'host {o.host} not in tokens.HOSTS')
eco = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
A = eco.get(o.area) or sys.exit(f'unknown area {o.area}')
h6 = hashlib.sha1(o.pid.encode()).hexdigest()[:6]
lid = f"tpl1b_{o.plate}_{h6}"
q_sent, (qa, qb), qi, _ = g['q'][0], g['q'][1], g['q'][2], g['q'][3]
pre, post = [s.strip() for s in q_sent.split('___')]
post = post.rstrip('.').strip()
cap = lambda s: s[0].upper() + s[1:]
cta = A['cta'].rstrip('.')
lines = dict(h=o.hook, m=f"Many learners say: {g['w']}", g='Pause and guess. What sounds right?', k=f"Say: {g['r']}", y=g['y'],
             rn=f"Now at normal speed: {g['r']}", r2="Teacher's tip: save these lines.",
             e=f"Quiz: {pre} blank{(' ' + post) if post else ''}. {cap(qa)}, or {qb}? Comment below.", s=f'{cta}.')
L = [dict(id=f'n_{h6}_{k}', who=o.host, text=v) for k, v in lines.items()]
SP = dict(v=1, id=lid, template='fix', tpl='1b', source=dict(gold=o.pid), topic=g['t'], cefr=g['l'], area=o.area,
          plate=o.plate, host=o.host, clip=o.clip, hook=dict(line=f'n_{h6}_h', quote=o.quote, kind=g['h']),
          wrong_line=g['w'], key_line=g['r'], series=[o.series, o.formula],
          beats=[dict(kind='k', line=f'n_{h6}_k', card=dict(formula=o.formula)), dict(kind='y', line=f'n_{h6}_y', card=dict(text=g['y']))],
          recap=dict(rows=[g['r']] + g['e'][:2]), quiz=dict(pre=pre, post=post, a=qa, b=qb, answer=qi),
          cta=dict(text=cta, link=A['link'], label=A['label']))
os.makedirs(o.out, exist_ok=True)
json.dump(SP, open(f'{o.out}/{lid}.json', 'w'), indent=1, ensure_ascii=False)
lp = f'{o.out}/lines.json'
LJ = json.load(open(lp)) if os.path.exists(lp) else dict(voices={}, speed=0.88, lines=[])
LJ['voices'].update({k: v['voice'] for k, v in HOSTS.items()})
LJ['lines'] = [l for l in LJ['lines'] if not l['id'].startswith(f'n_{h6}_')] + L
json.dump(LJ, open(lp, 'w'), indent=1, ensure_ascii=False)
print(lid, '|', g['w'], '->', g['r'])
