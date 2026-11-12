#!/usr/bin/env python3
"""script_judge.py <lesson.json> <lines.json> <out.json> - AI judge for a v7 news script (owner 22/10, VIDEO-SCALE-PLAN §9/§12-14). 0 credits.
Deterministic rules first (script_rules.py), then the studio op judgeScript (Workers AI -> Gemini key pool -> neutral skip) via ai_gate.py.
PASS = no rule issue, every score >= 4, wrong_is_wrong and right_is_right. Exit 0 pass / 1 fail / 2 judge unavailable = neutral skip (qc_gate scores it 0, never rejects in preflight)."""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import script_rules as SR
sp = json.load(open(sys.argv[1])); L = {l['id']: l for l in json.load(open(sys.argv[2]))['lines']}; out = dict(rules=SR.check(sp, L), ok=False)
T = lambda i: (L.get(i) or {}).get('text', '')
lines = [f"1. Ama (hook): {T(sp['hook']['line'])}"]
for k, b in enumerate(sp['beats']):
    c = b.get('card'); tag = '' if not c else ('WRONG ✗ ' if c['kind'] == 'x' else 'RIGHT ✓ ' if c['kind'] == 'v' else '')
    lines.append(f"{k + 2}. {b['who'].title()}: {T(b['line'])}" + (f"   [on-screen card: {tag}{c['text']}" + (f" — {c['formula']}" if c.get('formula') else '') + ']' if c else ''))
lines += [f"On-screen Teacher's tip list: {' | '.join(sp['recap']['rows'])}", f"Last line: {T(sp['end_line'])}", f"On-screen share chip: Send this to a friend {sp.get('share', '')}",
          f"(Target level {sp['cefr']}. Teaching point: {sp['point']}. 'Pause and guess' and 'Repeat after me' are fixed classroom routines.)"]
script = '\n'.join(lines); out['script'] = script
import ai_gate
if ai_gate.MOCK: r, st = dict(provider='mock', out=dict(clarity=5, correctness=5, one_idea=5, level=5, neutrality=5, wrong_is_wrong=True, right_is_right=True, issues=[])), 'ok'
else: r, st = ai_gate.studio('judgeScript', dict(script=script))   # Workers AI -> Gemini pool -> skip (owner 23/10)
if st != 'ok':
    out['ok'] = None; out['error'] = st; out['tried'] = (r or {}).get('tried'); json.dump(out, open(sys.argv[3], 'w'), indent=1); print('judge unavailable (neutral skip):', st, '| rules:', out['rules']); sys.exit(2 if not out['rules'] else 1)
out['provider'] = r.get('provider'); out['tried'] = r.get('tried'); j = r.get('out') or {}
out['judge'] = j; sc = [j.get(k, 0) for k in ('clarity', 'correctness', 'one_idea', 'level', 'neutrality')]
out['ok'] = not out['rules'] and all(isinstance(x, (int, float)) and x >= 4 for x in sc) and j.get('wrong_is_wrong') is True and j.get('right_is_right') is True
json.dump(out, open(sys.argv[3], 'w'), indent=1); print('script judge', out.get('provider'), 'OK' if out['ok'] else 'FAIL', sc, j.get('issues'), out['rules']); sys.exit(0 if out['ok'] else 1)
