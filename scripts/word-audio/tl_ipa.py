# Đối chiếu IPA trong content/target/<TL>/seed.json với espeak-ng (mã espeak của bảng tl-voices.json; es = es-419, seseo) – CHỈ CI (word-audio-tl.yml).
# Spec: docs/specs/spanish-course.md §3 (IPA = espeak-ng es-419 sinh + chuẩn hoá), §5.1 (lệch → gắn cờ). So sánh bỏ dấu nhấn ˈˌ (espeak đặt dấu trước nguyên âm,
# seed theo quy ước trước âm tiết) + dấu nối; còn lệch = ĐỎ, kèm bảng seed ↔ espeak trong tóm tắt để sửa seed theo espeak.
import json, os, re, sys, unicodedata
TL = os.environ.get('TL', 'pt'); HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'tl-voices.json')))[TL]
seed = json.load(open(os.path.join(HERE, '..', '..', 'content', 'target', TL, 'seed.json')))['words']
out = os.environ.get('OUT', f'out/{TL}-sample'); os.makedirs(out, exist_ok=True)
def report(title, rows, cols):
    bad = [r for r in rows if not r['ok']]
    txt = '\n'.join([f'## {title}: khớp {len(rows) - len(bad)}/{len(rows)}', '', '| ' + ' | '.join(cols) + ' |', '|' + '---|' * len(cols)] + ['| ' + ' | '.join(str(r[c]) for c in cols) + ' |' for r in bad])
    print(txt)
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
    return bad
# ipaCheck = "reading" (ja, japanese-course.md §5): IPA seed do ja-kana.mjs sinh từ kana (cổng node) → ở đây kiểm CÁCH ĐỌC kana ↔ OpenJTalk (bắt kana sai: 今日 こんにち…)
# + báo cáo cao độ seed ↔ OpenJTalk (acc; chỉ báo – từ điển OpenJTalk có chỗ khác NHK, cổng cao độ chặt là W3 với Wiktionary)
if C.get('ipaCheck') == 'reading':
    sys.path.insert(0, HERE); import tl_kana
    rows = [{'w': w['word'], 'seed': w['kana'], 'ojt': tl_kana.yomi(w['word'])} for w in seed]
    for r in rows: r['ok'] = tl_kana.fold(r['seed']) == tl_kana.fold(r['ojt'])
    acc = []
    for w in seed:
        a = tl_kana.accent(w['word']); acc.append({'w': w['word'], 'seed': w.get('pitch'), 'ojt': a and a[0], 'ok': a is None or a[0] == w.get('pitch')})
    json.dump({'reading': rows, 'pitch': acc}, open(os.path.join(out, 'ipa.json'), 'w'), ensure_ascii=False, indent=1)
    bad = report('Cách đọc seed ↔ OpenJTalk', rows, ['w', 'seed', 'ojt'])
    report('Cao độ seed ↔ OpenJTalk (chỉ báo)', acc, ['w', 'seed', 'ojt'])
    sys.exit(1 if bad or not rows else 0)
# ipaCheck = "pron" (ko, korean-course.md §5): pron/romaja/IPA seed do ko-hangul.mjs sinh từ chữ (cổng node) → ở đây đối chiếu pron với g2pk2 (Apache-2.0, cài đặt ĐỘC LẬP
# của 표준 발음법): lệch mà seed KHÔNG khai ngoại lệ theo từ (pronX) = ĐỎ; có pronX (사이시옷/Hán-Hàn căng hoá… mà g2pk2 không biết) = chỉ báo
if C.get('ipaCheck') == 'pron':
    from g2pk2 import G2p
    g = G2p()
    rows = [{'w': w['word'], 'seed': w['pron'], 'g2pk2': g(w['word']), 'x': 'pronX' if w.get('pronX') else ''} for w in seed]
    for r in rows: r['ok'] = r['seed'] == r['g2pk2'] or bool(r['x'])
    json.dump(rows, open(os.path.join(out, 'ipa.json'), 'w'), ensure_ascii=False, indent=1)
    bad = report('Phát âm chuẩn seed ↔ g2pk2', rows, ['w', 'seed', 'g2pk2'])
    report('Ngoại lệ theo từ (pronX) – chỉ báo', [{**r, 'ok': r['seed'] == r['g2pk2']} for r in rows if r['x']], ['w', 'seed', 'g2pk2'])
    sys.exit(1 if bad or not rows else 0)
try:
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    EspeakWrapper.set_library(espeakng_loader.get_library_path()); EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
    from phonemizer.backend import EspeakBackend
    be = EspeakBackend(C['espeak'], with_stress=True, preserve_punctuation=False)
except Exception as e:
    print('✗ espeak-ng không nạp được: ' + str(e)[:200]); sys.exit(3)
nrm = lambda s: re.sub(r'[ˈˌ.‿͡\s-]', '', unicodedata.normalize('NFD', s or ''))
got = be.phonemize([w['word'] for w in seed], strip=True)
rows = [{'w': w['word'], 'seed': w['ipa'], 'espeak': g, 'ok': nrm(w['ipa']) == nrm(g)} for w, g in zip(seed, got)]
json.dump(rows, open(os.path.join(out, 'ipa.json'), 'w'), ensure_ascii=False, indent=1)
bad = [r for r in rows if not r['ok']]
txt = '\n'.join([f'## IPA seed ↔ espeak-ng {C["espeak"]}: khớp {len(rows) - len(bad)}/{len(rows)}', '', '| từ | seed | espeak |', '|---|---|---|'] + [f"| {r['w']} | {r['seed']} | {r['espeak']} |" for r in bad])
print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
if C.get('seseo') and any('θ' in r['espeak'] for r in rows): print('✗ espeak ra /θ/ – sai biến thể (cần seseo)'); sys.exit(1)
sys.exit(1 if bad or not rows else 0)
