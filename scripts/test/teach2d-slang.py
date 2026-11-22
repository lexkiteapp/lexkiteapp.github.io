#!/usr/bin/env python3
"""Slang Card template (docs/SAY-NATIVE.md): every card of content/say-native/slang.json builds a valid 7-12 s episode or is skipped for a named reason,
>= 85 % of the bank is renderable, publish metadata of each is valid, quiz / misuse variants both used, pose gestures only for EXPR names that have one,
the frozen facts of every planned row == the live bank (data gate)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d'); import gen, publish  # noqa: E402
B, X = gen.slang_src(); ok, bad, var = 0, {}, {'quiz': 0, 'misuse': 0}
for i, it in enumerate(B.values()):
    row = dict(id=f't2s_test{i}', template='slang', teacher='ama' if i % 2 else 'carlos', theme='dusk', **{'in': dict(key=it['key'])})
    try: ep = gen.make(row)
    except AssertionError as e: bad.setdefault(str(e.args[0][0] if isinstance(e.args[0], tuple) else e.args[0]), []).append(it['key']); continue
    assert not publish.check(ep), (it['key'], publish.check(ep))
    assert ep['expr'] in X['x'], it['key']
    assert bool(ep.get('pose')) == bool(X['x'][ep['expr']].get('gesture')), it['key']
    assert [l['id'] for l in ep['lines']] == ['h', 'k', 'm', 'e', 'c'] and ep['lines'][3].get('quiz'), it['key']
    var[ep['data']['variant']] += 1; ok += 1
share = ok / len(B)
print(f'slang: {ok}/{len(B)} cards build a 7-12 s episode ({share:.0%}); variants {var}; skipped {[(k, len(v), v[:4]) for k, v in bad.items()]}')
assert share >= 0.85, 'too many slang cards do not fit the 7-12 s clip - shorten them in slang.json'
assert min(var.values()) >= 0.3 * ok, var
for r in gen.load_auto()['rows']:
    if r['template'] == 'slang': assert not gen.data_gate(r), (r['id'], gen.data_gate(r))
print('✓ teach2d-slang')
