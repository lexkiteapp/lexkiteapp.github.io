#!/usr/bin/env python3
"""Guess in 3 Seconds template (docs/VIDEO-TEACH2D.md, growth series #2): every row of auto.json with template guess3 builds a valid 7-12 s episode (hook / answer / meaning / example / CTA),
facts == audited bank + img.json picture of the exact word#n sense, publish metadata valid, hook is one of the true claims, no word / picture used twice (and not by a 30 s guess clip),
>= 60 rows, every candidate word passes the TEXT_OBJ (no text-bearing object) and family-safe gates, planner candidates are all renderable shapes."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d'); import gen, publish  # noqa: E402
rows = [r for r in gen.load_auto()['rows'] if r['template'] == 'guess3']; R = json.load(open(gen.REV_F))['verdicts']; F = gen.facts(); I = gen.img_items()
assert len(rows) >= 60, ('guess3 batch must hold >= 60 rows', len(rows))
assert len({r['in']['word'] for r in rows}) == len(rows) and len({r['hash'] for r in rows}) == len(rows), 'duplicate word / hash'
other = {r['in']['word'] for r in gen.load_auto()['rows'] if r['template'] == 'guess'} | {r['in']['word'] for r in gen.PIL['pilots'] if r['template'] == 'guess'}
assert not other & {r['in']['word'] for r in rows}, ('a guess3 word is also a 30 s guess clip', other & {r['in']['word'] for r in rows})
phs = [r['ph'] for r in rows if r.get('ph')]; assert all(gen.phash_far(p, [q for q in phs if q != p]) for p in phs), 'two pictures closer than 10 bits'
assert not gen.text_objects({r['in']['word'] for r in rows}), 'a text-bearing object (TEXT_OBJ) got a picture clip'
assert not {r['in']['word'] for r in rows} & (gen.TOPIC_SKIP | gen.G3_SKIP), 'family-unsafe / reviewed-out word'
for i, r in enumerate(rows):
    assert not gen.data_gate(r, F), (r['id'], gen.data_gate(r, F))
    ep = gen.make(r); assert not publish.check(ep), (r['id'], publish.check(ep))
    assert [l['id'] for l in ep['lines']] == ['h', 'a', 'm', 'e', 'c'] and ep['lines'][0]['pause'] == gen.G3_RING, r['id']   # the silence after the hook IS the 3-2-1 ring
    assert gen.hook_gate(r, ep) and ep['hook']['text'] in gen.G3_HOOKS and len(ep['hook']['text'].split()) <= 6, r['id']
    assert 7 <= ep['est']['seconds'] <= 12 and ep['est']['wpm'] <= 150, (r['id'], ep['est'])   # est = syllables / 3.5 per s (1.25x) + pauses, calibrated on CI run 45197149417 (words / 2.55 had hidden 14.6 s)
    assert ep['speed'] <= 1.35, ('qc pace gate: <= 5 syllables / s per line', ep['speed'])
    assert ep['expr'] in gen.G3_EXPR and 'pose' not in ep, r['id']   # drawn face only: the ring silence is a quiz countdown, rig_plan plays no pose image there
    assert ep['data']['word'].lower() not in ep['lines'][0]['text'].lower() and ep['publish']['title'].count(ep['data']['word']) == 0, ('the title / hook must not spoil the answer', r['id'])
    assert len(ep['data']['word']) == ep['data']['n'] <= 12 and ep['teacher'] == ('ama' if i % 2 == 0 else 'carlos'), r['id']
    v = R[r['id']]; assert v['gates'] == dict(data=True, level=True, hook=True, dup=True) and v['script'] == {l['id']: l['text'] for l in ep['lines']}, ('reviewed.json verdict stale', r['id'])
print(f'✓ teach2d-guess3: {len(rows)} rows, {sum("ph" not in r for r in rows)} icon pictures')
_b = open(f'{ROOT}/scripts/video/teach2d/build.py').read()
assert 't_h = t_rev - 0.3' in _b and 'out=t_m - 0.3' in _b and 'c.place(t_m, t_e - 0.3' in _b, 'build.py T_guess3: every card / title must leave 0.3 s before the next one (qc layout overlap, CI run 45197149417)'
