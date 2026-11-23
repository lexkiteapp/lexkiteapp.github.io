#!/usr/bin/env python3
"""Score Challenge template (docs/VIDEO-TEACH2D.md, growth series #5): every planned row is honest and renderable –
5 distinct audited gold quiz items, the score on screen is RECOMPUTED from the shown ticks (20 points each, labelled sample), hook == that number,
the teacher's EXPR follows the score band, est. 7.2-10.8 s (+ ~2 s end card = 9-13 s), publish metadata valid (+ answer key in the first comment), no item or item set reused across episodes,
>= 60 rows with every band used, the data gate catches a changed item / pick, and the card fits the card region."""
import copy, json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d'); import gen, publish  # noqa: E402
X = gen.slang_src()[1]; rows = [r for r in gen.load_auto()['rows'] if r['template'] == 'scorecard']; ids, sets, bands = set(), set(), {}
assert len(rows) >= 60, f'scorecard: {len(rows)} rows < 60'
assert gen.sc_height() <= gen.SC_REGION, ('score card taller than the card region', gen.sc_height())
for r in rows:
    assert not gen.data_gate(r), (r['id'], gen.data_gate(r))
    F = r['facts']; s = gen.sc_score(F); n = sum(1 for f in F if f['pick'] == f['answer']); assert s == n * gen.SC_PTS and s in gen.SC_EXPR, r['id']
    for f in F:   # the answer key is the audited bank row, the pick one of its two options
        g = gen.GOLD[f['id']]; assert f['options'] == g['quiz']['options'] and f['answer'] == g['quiz']['answer'] and (g.get('qc') or {}).get('gold') is True and f['pick'] in (0, 1), (r['id'], f['id'])
    assert not ids & set(r['in']['items']), ('item reused across episodes', r['id']); ids |= set(r['in']['items']); assert r['hash'] not in sets; sets.add(r['hash'])
    ep = gen.make(r); assert not publish.check(ep), (r['id'], publish.check(ep))
    assert [l['id'] for l in ep['lines']] == ['h', 'k', 'r', 'ch', 'c'], r['id']
    assert ep['hook']['text'] == f'Score {s}/100. {gen.sc_verb(s).capitalize()} me?' and gen.hook_gate(r, ep), (r['id'], ep['hook'])
    assert ep['expr'] == gen.SC_EXPR[s] and ep['expr'] in X['x'] and (not ep.get('pose') or X['x'][ep['expr']].get('gesture')), r['id']
    assert ep['data']['sample'] is True and ep['data']['score'] == s and ep['data']['right'] == n and 'sample' in ep['publish']['value'].lower(), r['id']
    assert gen.SC_SECS[0] <= ep['est']['seconds'] <= gen.SC_SECS[1] and ep['est']['wpm'] <= 150, (r['id'], ep['est'])
    assert ep['cta']['route'] == '#/placement' and ep['cta']['link'] == 'https://lexkite.com/app/#/placement', r['id']
    assert not any(ch.isdigit() for l in ep['lines'] for ch in l['text']), ('numbers are spoken as words', r['id'])   # Kokoro would read "80/100" its own way
    bands[s] = bands.get(s, 0) + 1
assert set(bands) == set(gen.SC_EXPR), ('every score band / teacher expression is used', bands)
r = copy.deepcopy(rows[0]); r['in']['picks'][0] = 1 - r['in']['picks'][0]; assert gen.data_gate(r), 'a changed pick must fail the data gate (frozen facts != recomputed)'
r = copy.deepcopy(rows[0]); r['facts'][0]['answer'] = 1 - r['facts'][0]['answer']; assert gen.data_gate(r), 'a changed answer key must fail the data gate'
print(f'✓ teach2d-scorecard: {len(rows)} rows, bands {dict(sorted(bands.items()))}, {len(ids)} distinct audited quiz items')
