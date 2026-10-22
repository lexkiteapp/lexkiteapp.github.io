#!/usr/bin/env python3
"""script_judge.py <lesson.json> <lines.json> <out.json> - AI judge for a v7 news script (owner 22/10, VIDEO-SCALE-PLAN §9/§12-14). 0 credits.
Deterministic rules first (script_rules.py), then the studio op judgeScript (Gemini key pool, Workers AI fallback) via X-Studio-Secret.
PASS = no rule issue, every score >= 4, wrong_is_wrong and right_is_right. Exit 0 pass / 1 fail / 2 judge unavailable (qa_news fails it)."""
import json, os, sys, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import script_rules as SR
sp = json.load(open(sys.argv[1])); L = {l['id']: l for l in json.load(open(sys.argv[2]))['lines']}; out = dict(rules=SR.check(sp, L), ok=False)
T = lambda i: (L.get(i) or {}).get('text', '')
lines = [f"HOOK (Ama): {T(sp['hook']['line'])}  [card: {sp['hook']['card']}]"] + [f"{b['who'].upper()} ({b.get('kind', '')}): {T(b['line'])}" + (f"  [card {b['card']['kind']}: {b['card']['text']} {b['card'].get('formula') or b['card'].get('sub') or ''}]" if b.get('card') else '') for b in sp['beats']]
lines += [f"TEACHER'S TIP card: {' | '.join(sp['recap']['rows'])}", f"END: {T(sp['end_line'])}", f"SHARE chip: Send this to a friend {sp.get('share', '')}", f"Level {sp['cefr']}, difficulty {sp.get('difficulty')}, point: {sp['point']}. ✗ = wrong line, ✓ = right line."]
script = '\n'.join(lines); out['script'] = script
api = os.environ.get('STUDIO_API', 'https://lexkite.com/api/studio'); sec = os.environ.get('STUDIO_CALLBACK_SECRET', '')
try:
    req = urllib.request.Request(api, data=json.dumps(dict(op='judgeScript', script=script)).encode(), method='POST', headers={'Content-Type': 'application/json', 'X-Studio-Secret': sec, 'User-Agent': 'lexkite-ci'})
    r = json.load(urllib.request.urlopen(req, timeout=90)); out['provider'] = r.get('provider'); j = r.get('out') or {}
except Exception as e:
    out['error'] = str(e)[:200]; json.dump(out, open(sys.argv[3], 'w'), indent=1); print('judge unavailable:', out['error'], '| rules:', out['rules']); sys.exit(2)
out['judge'] = j; sc = [j.get(k, 0) for k in ('clarity', 'correctness', 'one_idea', 'level', 'neutrality')]
out['ok'] = not out['rules'] and all(isinstance(x, (int, float)) and x >= 4 for x in sc) and j.get('wrong_is_wrong') is True and j.get('right_is_right') is True
json.dump(out, open(sys.argv[3], 'w'), indent=1); print('script judge', out.get('provider'), 'OK' if out['ok'] else 'FAIL', sc, j.get('issues'), out['rules']); sys.exit(0 if out['ok'] else 1)
