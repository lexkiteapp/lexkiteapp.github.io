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

# Trọng âm tiếng TBN suy 100 % từ chính tả (dấu sắc; không dấu: tận cùng nguyên âm/n/s → áp chót, còn lại → cuối) – espeak đôi khi đặt sai
# (computadora → komputaˈðoɾa). Bảng tl-voices.json "stress": "es" → đặt lại ˈ theo luật; số âm tiết chữ ↔ IPA lệch → giữ espeak + gắn cờ.
def es_stress_from_end(word):
    w = re.sub(r'([qg])u(?=[eéií])', r'\1', word.lower()); V = 'aeiouáéíóúü'; strong = set('aeoáéóíú'); groups = []; prev = False
    for i, c in enumerate(w):
        isv = c in V or (c == 'y' and i == len(w) - 1 and i > 0 and w[i - 1] in V)
        if isv and prev and not (groups[-1][-1] in strong and c in strong): groups[-1] += c
        elif isv: groups.append(c)
        prev = isv
    if not groups: return 0, 0
    acc = [k for k, g in enumerate(groups) if re.search('[áéíóú]', g)]
    k = acc[-1] if acc else (len(groups) - 2 if len(groups) > 1 and w[-1] in V + 'ns' else len(groups) - 1)
    return len(groups) - k, len(groups)

def nuclei(sg):
    idx = []
    for i, ch in enumerate(sg):
        if ch[0] in 'aeiou': idx.append(i)
    return idx

def stress_rule(word, ipa_onset):
    k, n = es_stress_from_end(word); sg = [c for c in segs(ipa_onset) if c not in ('ˈ', 'ˌ')]; nu = nuclei(sg)
    if not k or len(nu) != n: return None
    sg.insert(nu[-k], 'ˈ'); return onset_stress(''.join(sg))

nrm = lambda s: re.sub(r'[ˈˌ.‿͡\s-]', '', unicodedata.normalize('NFD', s or ''))

try:
    import espeakng_loader
    from phonemizer.backend.espeak.wrapper import EspeakWrapper
    EspeakWrapper.set_library(espeakng_loader.get_library_path()); EspeakWrapper.set_data_path(espeakng_loader.get_data_path())
    from phonemizer.backend import EspeakBackend
    be = EspeakBackend(C['espeak'], with_stress=True, preserve_punctuation=False)
except Exception as e:
    print('✗ espeak-ng không nạp được: ' + str(e)[:200]); sys.exit(3)
def ipa(words):
    out = []
    for w, g in zip(words, be.phonemize(words, strip=True)):
        e = onset_stress(g.replace('ˌ', ''))
        if C.get('stress') == 'es': r = stress_rule(w, e); e = r if r else e
        out.append(e)
    return out

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
