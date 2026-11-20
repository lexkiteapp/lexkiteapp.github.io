#!/usr/bin/env python3
"""Band 5 -> 7 -> 9 (docs/specs/band-upgrade.md): bands.json is well formed (>= 12 topics, bands 5 / 7 / 9 in order, three different sentences <= 14 words, every upgrade mark inside its sentence,
every reason known with an IELTS criterion, the 14-language table complete), every planned episode fits the calibrated duration window (18 <= short_secs + BAND_BIAS <= BAND_MAX) and its hook is true."""
import json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d'); sys.argv = ['gen.py']; import gen  # noqa: E402
B = json.load(open(gen.BANDS_F)); bad = []; CRIT = {'Lexical Resource', 'Grammatical Range', 'Coherence & Cohesion', 'Task Response'}
if len(B['topics']) < 12: bad.append(f"{len(B['topics'])} topics (< 12)")
if len({t['id'] for t in B['topics']}) != len(B['topics']): bad.append('duplicate topic id')
for k, r in B['reasons'].items():
    if r['criterion'] not in CRIT or len(r['en'].split()) > 6: bad.append(f'reason {k}: criterion / length')
for t in B['topics']:
    st = t['steps']
    if t['skill'] not in ('writing', 'speaking'): bad.append(f"{t['id']}: skill")
    if [x['band'] for x in st] != [5, 7, 9] or len({x['text'] for x in st}) != 3: bad.append(f"{t['id']}: bands 5 / 7 / 9 / sentences")
    for x in st:
        if len(x['text'].split()) > 14: bad.append(f"{t['id']}/{x['band']}: > 14 words")
    for x in st[1:]:
        if x['mark'] not in x['text'] or x['why'] not in B['reasons']: bad.append(f"{t['id']}/{x['band']}: mark / reason")
    ep = gen.make(dict(id='x', template='band', teacher='ama', theme='dusk', **{'in': dict(topic=t['id'])}))
    if not 18 <= gen.band_secs(ep) <= gen.BAND_MAX: bad.append(f"{t['id']}: {gen.band_secs(ep):.1f} s outside 18-{gen.BAND_MAX}")
    if not gen.hook_gate(dict(template='band', **{'in': dict(topic=t['id'])}), ep): bad.append(f"{t['id']}: hook")
    if gen.data_gate(dict(template='band', **{'in': dict(topic=t['id'])}), dict(words={})): bad.append(f"{t['id']}: data gate")
print(f"band: {len(B['topics'])} topics" + (' – FAIL' if bad else ' – OK'))
for b in bad: print('::error::' + b)
sys.exit(1 if bad else 0)
