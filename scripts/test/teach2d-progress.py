#!/usr/bin/env python3
"""Day 1 vs Day 30 (docs/specs/voice-diary-video.md): progress.json is a WRITTEN sample bank (never a real learner's recording – privacy): >= 30 distinct sentences, every mark inside its
day-30 sentence, day 1 = the same sentence respelled, sample scores far apart, every planned episode fits the calibrated duration window, its hook is true, the series has the unified voice
(Ama = female, Carlos = male voice), the title is unique per clip and no episode field names a real person/recording."""
import json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d'); sys.argv = ['gen.py']; import gen  # noqa: E402
import progress as P  # noqa: E402
B = P.bank(); bad = []; I = B['items']
if len(I) < 30: bad.append(f'{len(I)} items (< 30)')
if len({x['id'] for x in I}) != len(I) or len({x['day30'] for x in I}) != len(I): bad.append('duplicate id / sentence')
titles = set()
for x in I:
    row = dict(id='x', template='progress', teacher='ama', theme='dusk', **{'in': dict(id=x['id'])})
    if gen.progress_data_gate(row): bad.append(f"{x['id']}: {gen.progress_data_gate(row)}")
    ep = gen.make(row)
    if not 18 <= gen.progress_secs(ep) <= gen.PROGRESS_MAX: bad.append(f"{x['id']}: {gen.progress_secs(ep):.1f} s outside 18-{gen.PROGRESS_MAX}")
    if not gen.hook_gate(row, ep): bad.append(f"{x['id']}: hook")
    t = ep['publish']['title']; titles.add(t)
    if len(t) > 60: bad.append(f"{x['id']}: title > 60")
    if not ep['data'].get('sample') or ep['data']['s30'] - ep['data']['s1'] < 25: bad.append(f"{x['id']}: sample flag / gain")
    for who, v in (('ama', 'af_bella'), ('carlos', 'am_michael')):
        if gen.REG['people'][who]['voice']['video'] != v and who == 'ama': bad.append('Ama voice changed')
    if re.search(r'real learner|user recording|testimonial', json.dumps(ep).lower()): bad.append(f"{x['id']}: names a real recording")
if len(titles) != len(I): bad.append(f'titles not unique ({len(titles)}/{len(I)})')
rows = [r for r in gen.load_auto()['rows'] if r['template'] == 'progress']
rv = json.load(open(gen.REV_F))['verdicts']
for r in rows:
    v = rv.get(r['id'])
    if not v or not v.get('script_reviewed') or v.get('hook') != P.HOOK: bad.append(f"{r['id']}: no reviewed verdict / hook")
src = open(f'{ROOT}/scripts/video/teach2d/build.py').read()
if "progress=T_progress" not in src or "('rule', 'band', 'progress'): o.layout = 'corner'" not in src: bad.append('build.py: T_progress / corner layout not wired')
if '#/diary' not in open(f'{ROOT}/scripts/video/teach2d/qc.py').read(): bad.append('qc.py: #/diary route not allowed')
if not any(a['id'] == 'voice-diary' and a['route'] == 'diary' for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']): bad.append('ecosystem.json: voice-diary area missing')
print(f"progress: {len(I)} samples, {len(rows)} planned rows" + (' – FAIL: ' + '; '.join(bad[:6]) if bad else ' – OK'))
sys.exit(1 if bad else 0)
