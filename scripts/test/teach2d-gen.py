#!/usr/bin/env python3
"""Teach2D batch generator gates (scripts/video/teach2d/gen.py --plan / --verify): regression cases, run in teach-video.yml preqc.
python3 scripts/test/teach2d-gen.py"""
import copy, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.argv = ['gen.py']; sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import gen as G   # noqa: E402
fails = []


def ok(c, msg):
    if not c: fails.append(msg)


# spelling syllables shown on the stress tiles (count must equal the IPA nuclei, else the pair is never planned)
for w, want in dict(photographer='pho to gra pher', athlete='ath lete', athletic='ath le tic', familiar='fa mil iar', economic='e co no mic', activity='ac ti vi ty').items():
    ok(' '.join(G.ortho(w)) == want, f'ortho({w}) = {G.ortho(w)} != {want}')

import labels as LB   # noqa: E402
ok(LB.clamp_span(762, 400, 48, 960) == [560, 960] and LB.clamp_span(100, 400, 48, 960) == [48, 448] and LB.clamp_span(500, 400, 48, 960) == [300, 700], 'clamp_span: stress chip must stay inside SAFE (t2a_stress_attendee, 1 px over)')
F = G.facts(); rows = G.load_auto()['rows']; R = json.load(open(G.REV_F))['verdicts']
ok(len(rows) >= 100, f'auto.json has {len(rows)} rows (< 100)')
ok(len({r['hash'] for r in rows}) == len(rows), 'duplicate point hash in auto.json')
heads = [h for r in rows for h in r['heads']]; ok(len(set(heads)) == len(heads), 'a word is taught by two auto episodes')
phs = [r['ph'] for r in rows if r.get('ph')]
ok(all(G.phash_far(p, phs[:i] + phs[i + 1:]) for i, p in enumerate(phs)), 'two guess pictures closer than 10 bits (pHash)')
for r in rows:
    v = R.get(r['id']) or {}
    ok(v.get('machine') and all(v.get('gates', {}).get(g) for g in ('data', 'level', 'hook', 'dup')), f"{r['id']}: machine verdict missing or a gate red")
    ok(r['area'] in G.ECO, f"{r['id']}: area {r['area']} not in content/video/ecosystem.json")

# the data gate catches a changed fact (one case per template)
by = {r['template']: r for r in rows}
for t, mut in dict(usuk=lambda p: p.update(ipa_uk='/x/'), verbs=lambda p: p.update(PP='breaked'), stress=lambda p: p['b'].update(stress=0),
                   guess=lambda p: p.update(img='cat#v'), review=lambda p: p.update(ex='Changed sentence here.')).items():
    if t not in by: fails.append(f'no {t} row planned'); continue
    ok(not G.data_gate(by[t], F), f'{t}: clean row fails the data gate: {G.data_gate(by[t], F)}')
    bad = copy.deepcopy(by[t]); mut(bad['in']); ok(G.data_gate(bad, F), f'{t}: changed fact passes the data gate')

# the level gate flags words above B1 (and passes the template words)
u = G.unknown(['It means a ubiquitous phenomenon.', 'Quick quiz! Which one fits? Save this.'])
ok('ubiquitous' in [x.lower() for x in u[0]] and not [x for x in u[1] if x.lower() not in G.FRAME], f'level gate: {u}')

# hook gate: verbs hook must state the engine's three forms
r = by.get('verbs')
if r:
    ep = G.make(r); ok(G.hook_gate(r, ep), 'verbs hook gate rejects a true hook')
    bad = copy.deepcopy(r); bad['in']['P'] = 'breaked'; ok(not G.hook_gate(bad, ep), 'verbs hook gate accepts a false hook')

ids = json.loads(__import__('subprocess').run([sys.executable, f'{ROOT}/scripts/video/teach2d/gen.py', '--pick', '', '500', 'workflow_dispatch'], capture_output=True, text=True, check=True).stdout)
ok(0 < len(ids) <= 120, f'--pick 500 gave {len(ids)} ids (render matrix 2 x eps must stay <= 256 jobs)')

print('\n'.join(fails) or f'teach2d-gen: OK ({len(rows)} auto rows)'); sys.exit(1 if fails else 0)
