# IPA ship = espeak-ng theo bảng scripts/word-audio/tl-voices.json (es = es-419, seseo) – spanish-course.md §3 "espeak-ng sinh + chuẩn hoá", §5.1 "lệch → gắn cờ".
# CHỈ CI (target-content.yml, sau gen.mjs). Ghi đè ipa của tệp lô mới nhất (core-NN.json) bằng espeak, dấu nhấn chuyển về ĐẦU âm tiết (quy ước seed: ˈsjelo,
# espeak in sjˈelo); IPA của người soạn lệch espeak → giữ ở qa.ipaAi + đếm trong tóm tắt (gắn cờ, không bỏ từ). Tự kiểm: seed.json phải khớp 100 % → không khớp = ĐỎ.
# Chạy: TL=es python3 scripts/target/tl_ipa_fill.py [tệp.json | --self (chỉ tự kiểm seed)]
import json, os, re, sys, glob, unicodedata
TL = os.environ.get('TL', 'es'); HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
C = json.load(open(os.path.join(ROOT, 'scripts', 'word-audio', 'tl-voices.json')))[TL]
VOW = set('aeiouɐɑɔəɛɪʊøœy')
GLIDE = set('jwɪ̯ʊ̯')
# phụ âm 2 ký tự đọc như 1 (tʃ, dʒ, ts …) + cụm đầu âm tiết hợp lệ (tắc/f + l/ɾ) – tiếng TBN/Bồ
DI = ('tʃ', 'dʒ', 'ts', 'dz')
OBS = set('pbβtdðkgɡɣf')

def segs(s):
    out, i = [], 0
    while i < len(s):
        if s[i:i + 2] in DI: out.append(s[i:i + 2]); i += 2
        elif out and unicodedata.combining(s[i]): out[-1] += s[i]; i += 1
        else: out.append(s[i]); i += 1
    return out

def onset_stress(ipa):
    """espeak đặt ˈ/ˌ ngay trước nguyên âm → chuyển về trước phụ âm đầu âm tiết (j/w lướt + 1 phụ âm, hoặc cụm tắc/f + l/ɾ)."""
    res = []
    for ch in segs(ipa):
        if ch in ('ˈ', 'ˌ'):
            k = len(res)
            while k > 0 and res[k - 1][0] in 'jw': k -= 1
            if k > 0 and res[k - 1][0] not in VOW and res[k - 1] not in ('ˈ', 'ˌ', '.'):
                k -= 1
                if res[k] in ('l', 'ɾ') and k > 0 and res[k - 1] in OBS: k -= 1
            res.insert(k, ch)
        else: res.append(ch)
    s = ''.join(res)
    return s

nrm = lambda s: re.sub(r'[ˈˌ.‿͡\s-]', '', unicodedata.normalize('NFD', s or ''))

try:
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    EspeakWrapper.set_library(espeakng_loader.get_library_path()); EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
    from phonemizer.backend import EspeakBackend
    be = EspeakBackend(C['espeak'], with_stress=True, preserve_punctuation=False)
except Exception as e:
    print('✗ espeak-ng không nạp được: ' + str(e)[:200]); sys.exit(3)
ipa = lambda words: [onset_stress(g.replace('ˌ', '')) for g in be.phonemize(words, strip=True)]

summary = []
# 1) tự kiểm trên seed soát tay (W0 đã sửa theo espeak): phải khớp CẢ dấu nhấn, không chỉ phân đoạn
seed = json.load(open(os.path.join(ROOT, 'content', 'target', TL, 'seed.json')))['words']
got = ipa([w['word'] for w in seed]); miss = [(w['word'], w['ipa'], g) for w, g in zip(seed, got) if w['ipa'] != g]
summary.append(f'## IPA espeak-ng {C["espeak"]} – tự kiểm seed: {len(seed) - len(miss)}/{len(seed)}')
summary += [f'- {w}: seed {a} ↔ {b}' for w, a, b in miss]

# 2) tệp lô mới nhất (hoặc tệp chỉ định)
files = [] if '--self' in sys.argv else [a for a in sys.argv[1:]] or sorted(glob.glob(os.path.join(ROOT, 'content', 'target', TL, 'core-[0-9]*.json')))[-1:]
flag = 0
for f in files:
    if f.endswith('.report.json'): continue
    deck = json.load(open(f)); W = deck['words']
    for w, g in zip(W, ipa([w['word'] for w in W])):
        if nrm(w.get('ipa')) != nrm(g): w.setdefault('qa', {})['ipaAi'] = w.get('ipa'); flag += 1
        w['ipa'] = g
    json.dump(deck, open(f, 'w'), ensure_ascii=False, indent=1); open(f, 'a').write('\n')
    summary.append(f'- {os.path.basename(f)}: {len(W)} mục, IPA người soạn lệch espeak {flag} (giữ ở qa.ipaAi, đã thay bằng espeak)')
txt = '\n'.join(summary); print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
if C.get('seseo') and any('θ' in w['ipa'] for f in files if not f.endswith('.report.json') for w in json.load(open(f))['words']): print('✗ /θ/ trong IPA – sai biến thể'); sys.exit(1)
sys.exit(1 if miss else 0)
