# Cao độ + cách đọc tiếng Nhật cho lô mới (japanese-course.md §5.2–§5.3) – CHỈ CI (target-content.yml, sau gen.mjs; bảng tl-voices.json ja: ipaCheck = "reading").
# OpenJTalk (pyopenjtalk, từ điển NAIST-jdic) khớp NHK 30/30 trên seed soát tay → nguồn cao độ ship: pitch = vị trí hạ của OpenJTalk khi từ là MỘT token
# (từ ghép bị tách → giữ số người soạn, gắn qa.pitchSrc = "ai" để soát tay). Cách đọc: kana (theo danh sách JLPT) ↔ OpenJTalk lệch → qa.readOjt (gắn cờ, KHÔNG
# tự sửa – danh sách nguồn thắng; người duyệt quyết). IPA/romaji không đụng (sinh từ kana ở gen.mjs, cổng node ép). Tự kiểm: seed phải khớp 100 % (lệch = ĐỎ).
# Chạy: python3 scripts/target/tl_ja_fill.py <core-NN.json> | --self
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.join(HERE, '..', '..')
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'word-audio')); import tl_kana as K
SELF = '--self' in sys.argv
<<<<<<< HEAD
if '--pron' in sys.argv:   # W3: content/target/ja/pron.json read = {chữ: [kana, cao độ]} – cách đọc ↔ OpenJTalk phải khớp 100 % (lệch = ĐỎ); cao độ lệch chỉ BÁO (từ điển OpenJTalk có chỗ khác NHK – nguồn cao độ chính của bài là soát tay NHK + kaikki ở W3b)
    P = json.load(open(os.path.join(ROOT, 'content', 'target', 'ja', 'pron.json')))['read']; bad = []; warn = []; n = 0
    for w, (k, p) in P.items():
        y = K.yomi(w); a = K.accent(w)
        if K.fold(y) != K.fold(k): bad.append(f'{w}: kana {k} ↔ OpenJTalk {y}')
        if a is not None and a[0] is not None:
            n += 1
            if a[0] != p: warn.append(f'{w}: cao độ {p} ↔ OpenJTalk {a[0]}')
    txt = f"## Phát âm W3 ↔ OpenJTalk: {len(P) - len(bad)}/{len(P)} khớp (so cao độ {n} từ)\n" + '\n'.join(['- ✗ ' + b for b in bad] + ['- ⚑ ' + w for w in warn])
    print(txt)
    if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
    sys.exit(1 if bad else 0)
=======
>>>>>>> dcea36418c93783467968e756fffb238a6dbe206
f = os.path.join(ROOT, 'content', 'target', 'ja', 'seed.json') if SELF else next(a for a in sys.argv[1:] if a.endswith('.json'))
deck = json.load(open(f)); n = {'ojt': 0, 'ai': 0, 'read': 0}; bad = []
for w in deck['words']:
    a = K.accent(w['word']); y = K.yomi(w['word']); qa = w.setdefault('qa', {}) if not SELF else {}
    if K.fold(y) != K.fold(w['kana']): n['read'] += 1; qa['readOjt'] = y; bad.append(f"{w['word']}: kana {w['kana']} ↔ OpenJTalk {y}")
    if a is not None and a[0] is not None and 0 <= a[0] <= (a[1] or 99):
        if SELF and a[0] != w['pitch']: bad.append(f"{w['word']}: pitch {w['pitch']} ↔ OpenJTalk {a[0]}")
        if not SELF:
            if w.get('pitch') != a[0]: qa['pitchAi'] = w.get('pitch')
            w['pitch'] = a[0]; qa['pitchSrc'] = 'ojt'
        n['ojt'] += 1
    else:
        n['ai'] += 1
        if not SELF: qa['pitchSrc'] = 'ai'
    if not SELF and not qa: w.pop('qa', None)
txt = f"## Cao độ + cách đọc OpenJTalk – {os.path.basename(f)}: cao độ OpenJTalk {n['ojt']}, giữ người soạn (từ ghép) {n['ai']}, cách đọc lệch {n['read']}\n" + '\n'.join('- ' + b for b in bad[:60])
print(txt)
if os.environ.get('GITHUB_STEP_SUMMARY'): open(os.environ['GITHUB_STEP_SUMMARY'], 'a').write(txt + '\n')
if SELF: sys.exit(1 if bad else 0)
json.dump(deck, open(f, 'w'), ensure_ascii=False, indent=1); open(f, 'a').write('\n')
