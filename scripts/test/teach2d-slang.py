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
    assert not ep.get('pose') or X['x'][ep['expr']].get('gesture'), it['key']   # a pose only for EXPR names that have one (dropped when the card would pass 12 s)
    npose = globals().get('npose', 0) + bool(ep.get('pose')); globals()['npose'] = npose
    assert [l['id'] for l in ep['lines']] == ['h', 'k', 'm', 'e', 'c'] and ep['lines'][3].get('quiz'), it['key']
    var[ep['data']['variant']] += 1; ok += 1
share = ok / len(B)
print(f'slang: {ok}/{len(B)} cards build a 7-12 s episode ({share:.0%}); variants {var}; skipped {[(k, len(v), v[:4]) for k, v in bad.items()]}')
assert share >= 0.85, 'too many slang cards do not fit the 7-12 s clip - shorten them in slang.json'
assert min(var.values()) >= 0.3 * ok, var
for r in gen.load_auto()['rows']:
    if r['template'] == 'slang': assert not gen.data_gate(r), (r['id'], gen.data_gate(r))
print('✓ teach2d-slang')

# L1 pages: with page-language texts present, every language builds a valid clip whose post copy is in that language (publish_meta + build_l1)
SAMPLE = dict(vi=('Nói thật đó', 'Ngon nhất phố, tin không?', 'Pizza này ngon nhất phố, no cap.'), ar=('أنا لا أكذب', 'أفضل بيتزا؟ صدقني!', 'هذه البيتزا الأفضل، no cap.'),
              de=('Ich lüge nicht', 'Beste Pizza der Stadt?', 'Diese Pizza ist die beste, no cap.'), es=('No miento', '¿La mejor pizza?', 'Esta pizza es la mejor, no cap.'),
              fr=('Je ne mens pas', 'La meilleure pizza ?', 'Cette pizza est la meilleure, no cap.'), hi=('मैं झूठ नहीं बोल रहा', 'शहर का सबसे अच्छा पिज़्ज़ा?', 'यह पिज़्ज़ा सबसे अच्छा है, no cap.'),
              id=('Aku tidak bohong', 'Pizza terenak di kota?', 'Pizza ini paling enak, no cap.'), ja=('嘘じゃない', '街一番のピザ？', 'このピザは街一番、no cap。'),
              ko=('거짓말 아니야', '동네 최고 피자?', '이 피자 진짜 최고야, no cap.'), pt=('Não estou mentindo', 'Melhor pizza da cidade?', 'Essa pizza é a melhor, no cap.'),
              ru=('Я не вру', 'Лучшая пицца в городе?', 'Эта пицца лучшая, no cap.'), th=('ไม่ได้โกหกนะ', 'พิซซ่าที่ดีที่สุด?', 'พิซซ่านี้อร่อยที่สุด no cap'),
              tr=('Yalan söylemiyorum', 'Şehrin en iyi pizzası?', 'Bu pizza en iyisi, no cap.'), zh=('我没说谎', '全城最好的披萨？', '这个披萨是最好的，no cap。'))
real = gen.slang_l1_src
gen.slang_l1_src = lambda it, lang: dict(zip(('m', 'hook', 'ex'), SAMPLE[lang])) if it['key'] == 'no cap' else real(it, lang)
for L in gen.SL_LANGS:
    ep = gen.make(dict(id=f't2s_{L}_nocap', template='slang', lang=L, teacher='ama', theme='dusk', **{'in': dict(key='no cap', lang=L)}))
    N = ep['data']['native']; assert ep['lang'] == L and N and ep['data']['l1'] and ep['data']['l1_ex'], L
    assert len(N['hook']) <= 34 and N['comment'].count('{link}') == 1 and '#lexkite' in N['hashtags'], (L, N)
    assert not publish.check(ep), (L, publish.check(ep))
    assert ep['publish']['lang'] == L and ep['publish']['title'] == publish._fit(N['hook'], N['hook'] + '!'), L
gen.slang_l1_src = real
# no escaped-quote leak in the translated lines / eps, and the native-qa not_english gate accepts a 1-word L1 gloss ("ya") but rejects a copy of the English
import glob, json as _j, subprocess
_L = _j.load(open(f'{gen.ROOT}/content/say-native/slang-lines.json'))
assert '\\' not in _j.dumps(_L, ensure_ascii=False).replace('\\"', '').replace('\\n', '').replace('\\u', ''), 'slang-lines.json: stray backslash'
for f in glob.glob(f'{gen.ROOT}/content/video/teach2d/eps/t2s_*_*.json'):
    d = _j.load(open(f)).get('data', {})
    assert not any('\\' in str(d.get(k, '')) for k in ('l1', 'l1_hook', 'l1_ex')), f
_q = subprocess.run(['node', f'{gen.ROOT}/scripts/video/teach2d/native-qa.mjs'], capture_output=True, text=True).stdout
assert '✗' not in _q, [l for l in _q.splitlines() if '✗' in l][:5]
print(f'✓ teach2d-slang L1: {len(gen.SL_LANGS)} page languages build a clip + native post copy')
