#!/usr/bin/env python3
"""One Situation, 3 Levels template (docs/VIDEO-TEACH2D.md "Levels 3", growth series #3): every situation of content/video/teach2d/levels3.json builds a valid 8.5-11.2 s episode (hook / A1 / B1 / C1 + silent quiz / CTA)
or is skipped for a named reason, >= 90 % of the bank is renderable, every planned row == the live bank (data gate), publish metadata valid, one TeacherRig face per level line, quiz answer balanced,
the quiz options are the key phrases (C1 key vs A1 / B1 key), >= 60 rows planned."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d'); import gen, publish  # noqa: E402
B = gen.levels3_src(); X = gen.slang_src()[1]['x']; ok, bad, ans = 0, {}, [0, 0]
for i, it in enumerate(B.values()):
    row = dict(id=f't2l3_test{i}', template='levels3', teacher='ama' if i % 2 else 'carlos', theme='dusk', **{'in': dict(id=it['id'])})
    try: ep = gen.make(row)
    except AssertionError as e: bad.setdefault(str(e.args[0][0] if isinstance(e.args[0], tuple) else e.args[0]), []).append(it['id']); continue
    assert not publish.check(ep), (it['id'], publish.check(ep))
    assert [l['id'] for l in ep['lines']] == ['h', 'a', 'b', 'n', 'c'] and ep['lines'][3].get('quiz'), it['id']
    assert [l['text'] for l in ep['lines'][1:4]] == [it[k]['text'] for k in 'abc'] and gen.hook_gate(dict(template='levels3', **{'in': dict(id=it['id'])}), ep), it['id']
    assert all(v in X for v in ep['exprs'].values()) and len(set(ep['exprs'].values())) == 3 and 'pose' not in ep, it['id']   # drawn faces only, three different ones
    q = ep['data']['quiz']; assert q['options'][q['answer']] == gen.lv3_label(it['c']['key']) and q['options'][1 - q['answer']] in (gen.lv3_label(it['a']['key']), gen.lv3_label(it['b']['key'])), it['id']
    ans[q['answer']] += 1; ok += 1
try: import PIL  # noqa: F401 – the real-font width of every quiz label (preqc has no PIL: levels3.mjs pillW is the PIL-free guard there)
except ImportError: pass
else: assert all(gen.text_w(gen.lv3_label(x[k]['key']), 56) <= 640 for x in B.values() for k in 'abc'), 'a quiz label is wider than the pill'
print(f'levels3: {ok}/{len(B)} situations build a 8.5-11.2 s episode; answers A/B {ans}; skipped {[(k, len(v), v[:4]) for k, v in bad.items()]}')
assert ok / len(B) >= 0.9, 'too many situations do not fit the clip - shorten them in levels3.json'
assert min(ans) >= 0.3 * ok, ans
rows = [r for r in gen.load_auto()['rows'] if r['template'] == 'levels3']
assert len(rows) >= 60 and len({r['hash'] for r in rows}) == len(rows), ('levels3 batch must hold >= 60 distinct rows', len(rows))
R = json.load(open(gen.REV_F))['verdicts']
for r in rows:
    assert not gen.data_gate(r), (r['id'], gen.data_gate(r))
    ep = gen.make(r); v = R[r['id']]; assert v['gates'] == dict(data=True, level=True, hook=True, dup=True) and v['script'] == {l['id']: l['text'] for l in ep['lines']}, ('reviewed.json verdict stale', r['id'])
print(f'✓ teach2d-levels3: {len(rows)} rows')
