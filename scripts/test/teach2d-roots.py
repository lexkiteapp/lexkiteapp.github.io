#!/usr/bin/env python3
"""Word Roots bank (content/video/teach2d/roots.json, docs/VIDEO-TEACH2D.md 'Word Roots'): >= 30 roots x 6-10 REAL words, every word a row of the app's own
audited dictionary (IPA + definition + example), segmentation == the spelling, the root piece one of the root's variants, the Latin / Greek source word
== the checked etymology below (Etymonline / Wiktionary), and every planned episode (auto.json template 'roots') uses only bank words."""
import importlib.util, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.argv = ['x']; spec = importlib.util.spec_from_file_location('gen', f'{ROOT}/scripts/video/teach2d/gen.py'); g = importlib.util.module_from_spec(spec); spec.loader.exec_module(g)
J = json.load(open(f'{ROOT}/content/video/teach2d/roots.json')); RS, PFX = J['roots'], J['prefixes']; F = g.facts()['words']; bad = []
# source word + language per root, checked by hand against Etymonline / Wiktionary (a changed entry must be re-checked, so it fails here first)
ETYM = dict(pos=('Latin', 'ponere'), cept=('Latin', 'capere'), port=('Latin', 'portare'), ject=('Latin', 'jacere'), mit=('Latin', 'mittere'), dict=('Latin', 'dicere'), duc=('Latin', 'ducere'),
            spect=('Latin', 'specere'), scrib=('Latin', 'scribere'), tract=('Latin', 'trahere'), fer=('Latin', 'ferre'), vert=('Latin', 'vertere'), pend=('Latin', 'pendere'),
            struct=('Latin', 'struere'), form=('Latin', 'forma'), press=('Latin', 'premere'), cede=('Latin', 'cedere'), gress=('Latin', 'gradi'), log=('Greek', 'logos'),
            graph=('Greek', 'graphein'), vis=('Latin', 'videre'), aud=('Latin', 'audire'), vent=('Latin', 'venire'), sens=('Latin', 'sentire'), tend=('Latin', 'tendere'),
            tain=('Latin', 'tenere'), cur=('Latin', 'currere'), fact=('Latin', 'facere'), lect=('Latin', 'legere'), mov=('Latin', 'movere'), man=('Latin', 'manus'),
            sign=('Latin', 'signum'), rupt=('Latin', 'rumpere'), flect=('Latin', 'flectere'), cide=('Latin', 'caedere'), spir=('Latin', 'spirare'), vac=('Latin', 'vacare'),
            jus=('Latin', 'jus'), stat=('Latin', 'stare'), volv=('Latin', 'volvere'))
if len(RS) < 30: bad.append(f'only {len(RS)} roots (< 30)')
seen = set(); ids = [r['id'] for r in RS]
if len(ids) != len(set(ids)): bad.append('duplicate root id')
for r in RS:
    n = len(r['words'])
    if not 6 <= n <= 10: bad.append(f"{r['id']}: {n} words (need 6-10)")
    if ETYM.get(r['id']) != (r['lang'], r['src']): bad.append(f"{r['id']}: source {r['lang']} {r['src']} != checked {ETYM.get(r['id'])}")
    if not (r['say'] and r['src_mean'] and r['vi']): bad.append(f"{r['id']}: say / src_mean / vi missing")
    for w in r['words']:
        x = w['w']
        if x in seen: bad.append(f'{x}: in two roots (one word = one root family)')
        seen.add(x)
        b = F.get(x)
        if not (b and b['ipa'] and b['def'] and b['ex']): bad.append(f'{x}: not in the app dictionary with IPA + definition + example'); continue
        try: sp = g.seg_parts(w['seg'], r)
        except AssertionError as e: bad.append(f'{x}: {e.args[0]}'); continue
        if ''.join(t for t, _ in sp['parts']) != x: bad.append(f"{x}: segmentation {w['seg']} != spelling")
        if sp['pre'] and not (w.get('pm') or PFX.get(sp['pre'])): bad.append(f"{x}: prefix {sp['pre']} has no meaning")
        if not re.fullmatch(r"[a-z ,'-]{4,60}", w['mean']): bad.append(f"{x}: mean must be a short plain phrase")
if bad: print('\n'.join(bad)); sys.exit(1)
# planned episodes: only bank words, the quiz answer is one of the lesson words, hook <= 6 words
A = [r for r in json.load(open(f'{ROOT}/content/video/teach2d/auto.json'))['rows'] if r['template'] == 'roots']
for r in A:
    R = next(x for x in RS if x['id'] == r['in']['root']); ws = {w['w'] for w in R['words']}
    assert set(r['in']['words']) <= ws, ('episode word not in the root bank', r['id'])
    ep = g.make(r); q = ep['data']['quiz']
    assert q['options'][q['answer']] in r['in']['words'] and 2 <= len(r['in']['words']) <= 3, r['id']
    assert 18 <= g.short_secs(ep) and g.short_secs(ep) + g.ROOTS_BIAS <= g.ROOTS_MAX and len(g.words(ep['hook']['text'])) <= 6, r['id']
print(f'roots OK: {len(RS)} roots, {sum(len(r["words"]) for r in RS)} words, {len(A)} planned episodes')
