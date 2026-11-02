#!/usr/bin/env python3
"""Chọn từ mới cho kho (docs/LEXICON.md §Mở rộng 20k) – nguồn MIỄN PHÍ, ghi giấy phép.
  python scripts/lexicon/expand/pick_words.py --existing existing.json --cmu cmudict.dict --bad ldnoobw.txt --target 20000
Nguồn: wordfreq 3.1 (tần suất gộp SUBTLEX-US/UK, Google Books Ngram, Wikipedia…; dữ liệu CC BY-SA 4.0, mã Apache-2.0)
       · WordNet 3.0 (Princeton WordNet License) · CMUdict (BSD-2) · LDNOOBW (CC BY 4.0, chỉ để LOẠI từ xúc phạm)
       · NGSL/NAWL/BSL trong content/wordlists (CC BY-SA 4.0) để ưu tiên.
Loại thêm (content/lexicon/expand/exclude.json + kiểm WordNet): viết tắt, từ cắt, gốc tên riêng, lóng/xúc phạm. Khóa 1 nghĩa/mục (nghĩa người học hay gặp nhất).
Luật: chỉ chữ thường a–z (gạch nối được), ≥ 3 ký tự, có trong CMUdict, có lemma WordNet viết thường (loại tên riêng),
không là dạng biến tố của từ đã có (cats, walked), không xúc phạm, không có trong kho. CEFR: ngưỡng Zipf hiệu chỉnh trên
CEFR sẵn có của kho (giống EVP: tần suất là tín hiệu chính) → ghi `cefr` + `z`; bộ chủ đề do bước sinh chọn (lexname gợi ý).
Kết quả xác định (deterministic) → content/lexicon/expand/candidates.json (thứ tự = tần suất giảm dần)."""
import json, re, sys, csv, argparse, statistics, math, os
from wordfreq import zipf_frequency, top_n_list
from nltk.corpus import wordnet as wn

ap = argparse.ArgumentParser()
ap.add_argument('--existing', required=True); ap.add_argument('--cmu', required=True); ap.add_argument('--bad', required=True)
ap.add_argument('--cefrj'); ap.add_argument('--octanove'); ap.add_argument('--target', type=int, default=20000); ap.add_argument('--sec-min', type=int, default=3); ap.add_argument('--want', nargs='*', default=[]); ap.add_argument('--sec-share', type=float, default=0.1); ap.add_argument('--out', default='content/lexicon/expand/candidates.json')
a = ap.parse_args()
SEC_MIN, SEC_SHARE = a.sec_min, a.sec_share
# mục retry (content/lexicon/expand/retry/words.json) luôn có ứng viên đúng từ#loại kể cả dưới ngưỡng từ loại phụ – không kẹt retry mãi
FORCE = {k for f in a.want if os.path.exists(f) for k in json.load(open(f))['items']}
FORCE_W = {k.split('#')[0] for k in FORCE}
EX = json.load(open(a.existing))
# existing.json: {từ: CEFR} + {từ#loại: CEFR} (30/10 đa từ loại – kho đã có duck#n vẫn thiếu duck#v; khoá trùng = từ#loại)
have = {k for k in EX if '#' not in k}; have_wp = {k for k in EX if '#' in k}
cmu = set()
for l in open(a.cmu, encoding='latin1'):
    w = l.split(' ')[0]; cmu.add(re.sub(r'\(\d+\)$', '', w))
bad = {l.strip().lower() for l in open(a.bad) if l.strip()}
lists = {}
for f, col in (('content/wordlists/nawl-1.2.csv', 0), ('content/wordlists/bsl-1.20.csv', 0), ('content/wordlists/ngsl-1.2-defs.csv', 0)):
    try:
        for r in csv.reader(open(f, encoding='utf-8-sig')): lists.setdefault(r[col].strip().lower(), []).append(f.split('/')[-1].split('-')[0])
    except FileNotFoundError: pass
POSMAP = {'n': 'n', 'v': 'v', 'a': 'adj', 's': 'adj', 'r': 'adv'}
LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
# hiệu chỉnh CEFR: trung vị Zipf mỗi cấp của từ đơn sẵn có → ngưỡng = trung điểm 2 trung vị kề nhau
med = {}
for w, lv in EX.items():
    if '#' not in w and lv in LV and re.fullmatch(r'[a-z]+', w): med.setdefault(lv, []).append(zipf_frequency(w, 'en'))
M = [statistics.median(med[l]) if l in med else None for l in LV]
cuts = [(M[i] + M[i + 1]) / 2 for i in range(5) if M[i] is not None and M[i + 1] is not None]
def cefr(z):
    for i, c in enumerate(cuts):
        if z >= c: return LV[i]
    return LV[len(cuts)]
# CEFR kiểu EVP: CEFR-J Wordlist 1.5 (A1–B2, Tono Lab TUFS – miễn phí, ghi nguồn) + Octanove C1/C2 1.0 (CC BY-SA 4.0), theo TỪ + TỪ LOẠI.
# Thiếu → dải tần suất (cefr(z)) và giám khảo kiểm lại (lệch ≥ 2 bậc → trượt, lib.mjs gateEntry).
OLP = {}
OPOS = {'noun': 'n', 'verb': 'v', 'adjective': 'adj', 'adverb': 'adv'}
for f, src in ((a.cefrj, 'cefrj'), (a.octanove, 'octanove')):
    if not f: continue
    for r in csv.DictReader(open(f, encoding='utf-8-sig')):
        p = OPOS.get((r.get('pos') or '').strip())
        if not p or (r.get('CEFR') or '').strip() not in LV: continue
        for h in r['headword'].split('/'):
            h = h.strip().lower()
            if re.fullmatch(r'[a-z-]+', h) and (h, p) not in OLP: OLP[(h, p)] = (r['CEFR'].strip(), src)
def base_of(w):
    for p in 'nvar':
        for b in wn._morphy(w, p):
            if b != w and wn.synsets(b): return b
    return None
AFFIX = {'non', 'anti', 'mid', 'pre', 'pro', 'sub', 'ultra', 'semi', 'multi', 'neo', 'pseudo', 'quasi', 'meta', 'mega', 'mini', 'micro', 'macro', 'inter', 'intra', 'trans', 'co'}
SPELL = [(r'our$', 'or'), (r'our(s|ed|ing|ful|ite)$', r'or\1'), (r'yse$', 'yze'), (r'is(e|ed|es|ing|ation|ations|er)$', r'iz\1'), (r'tre$', 'ter'), (r'tres$', 'ters'),
         (r'ogue$', 'og'), (r'ence$', 'ense'), (r'lled$', 'led'), (r'lling$', 'ling'), (r'ller$', 'ler'), (r'mme$', 'm'), (r'ae', 'e'), (r'oe', 'e'), (r'^grey', 'gray')]
def variant_of_existing(w):  # chính tả Anh/Mỹ của từ đã có (colour ↔ color) – cùng mục, không thêm (scripts/lexicon/ipa.mjs usSpellings)
    for a, b in SPELL:
        if re.search(a, w) and re.sub(a, b, w) in have: return True
    return False
# Loại trừ (pilot 7 soát tay 19/25): viết tắt (sec), từ cắt (info), gốc tên riêng (trump), lóng/xúc phạm – danh sách lọc + kiểm WordNet theo từ loại
EXCL = json.load(open('content/lexicon/expand/exclude.json'))
EXCL_W = {w for k in ('abbreviations', 'clippings', 'proper', 'slang') for w in EXCL[k]}
BAD_DOM = {'vulgarism.n.01', 'obscenity.n.02', 'ethnic_slur.n.01', 'disparagement.n.01', 'profanity.n.01'}
SLANG_DOM = BAD_DOM | {'slang.n.02'}
SUFFIX = {'al', 'ally', 'ly', 'ical', 'ically', 'ness', 'ment', 'ous', 'ousness', 'ful', 'fulness', 'ation', 'ion', 'istic', 'ic', 'oid', 'ism', 'ist', 'ity', 'acy', 'ence', 'ance', 'ery', 'ish', 'ive', 'ize', 'ise', 'less', 'like', 'ling', 'ster', 'ess', 'ette'}  # biến thể phái sinh (ironic/ironical) ≠ từ cắt
def excluded(w, syn, s0):
    if w in EXCL_W: return 'list'
    lem0 = [l.name() for l in s0.lemmas()]
    # từ cắt / viết tắt: nghĩa chính có lemma đầu khác và dài hơn bắt đầu bằng từ này (sec → second, info → information, bra → brassiere)
    if lem0[0] != w and any('_' not in l and l.lower().startswith(w) and len(l) >= len(w) + 3 and l[len(w):].lower() not in SUFFIX for l in lem0): return 'clipping'
    if any(l.name() == w.upper() for s in syn for l in s.lemmas()) and len(w) <= 4: return 'abbreviation'
    if any(re.match(r'(an? )?abbreviation', s.definition()) for s in syn if any(l.name() == w for l in s.lemmas())): return 'abbreviation'
    # gốc tên riêng: lemma liên hệ phái sinh/thuộc tính với TÊN NGƯỜI/NƠI cụ thể (darwinian → Darwin; không loại medieval, biblical)
    if any(r.name()[:1].isupper() and r.synset().instance_hypernyms() and r.synset().lexname() == 'noun.person' for s in syn for l in s.lemmas() if l.name() == w for r in l.pertainyms() + l.derivationally_related_forms()): return 'proper'
    # lóng/xúc phạm: nghĩa chính thuộc lóng/xúc phạm, hoặc từ là lemma ĐẦU của một nghĩa xúc phạm (không loại vì 'colloquialism' – quá rộng)
    if any(d.name() in SLANG_DOM for d in s0.usage_domains()) or any(s.lemmas()[0].name() == w and any(d.name() in BAD_DOM for d in s.usage_domains()) for s in syn): return 'slang'
    return None
def proper(w, lem):  # tên riêng: WordNet có lemma Viết Hoa và nghĩa thường hiếm (china, john, smith, trump)
    cap = [l for s in wn.synsets(w) for l in s.lemmas() if l.name() in (w.capitalize(), w.upper())]
    return bool(cap) and sum(l.count() for l in lem) < 3 * (1 + sum(l.count() for l in cap))
# Cụm từ có thật (source-first 24/10): từ ghép/cụm nhiều chữ của WordNet chứa từ (fire alarm, false alarm) – giám khảo lọc theo nghĩa khóa
COMP = {}
for n in wn.all_lemma_names():
    if '_' in n and n.islower() and 2 <= n.count('_') + 1 <= 3:
        for t in set(n.split('_')): COMP.setdefault(t, []).append(n.replace('_', ' '))
def comps(w):
    c = sorted({x for x in COMP.get(w, [])}, key=lambda x: (-zipf_frequency(x, 'en'), x))
    return [x for x in c if zipf_frequency(x, 'en') >= 2.3][:4]
out, seen, excl, nsec = [], set(), {}, {False: 0, True: 0}
need = a.target - max(len(have), len(have_wp))  # mốc 20k đếm theo mục từ#loại
OLPW = {h for h, _ in OLP}
nfreq = 0  # từ CHỈ có tần suất (ngoài danh sách người học) – trần need × 3 (dư 25 % cho hàng duyệt/loại); từ danh sách người học luôn lấy hết
for w in top_n_list('en', 80000):
    if nfreq >= need * 3 and w not in OLPW and not lists.get(w) and w not in FORCE_W: continue  # ×3 (29/10): cổng chặt hơn → sản lượng pilot ~0,3–0,5; cần đủ ứng viên tới 20k
    if w in seen or not re.fullmatch(r'[a-z]{3,}(-[a-z]+)?', w) or w not in cmu and '-' not in w: continue
    if w in bad or any(b in bad for b in w.split('-')): continue
    syn = wn.synsets(w)
    lem = [l for s in syn for l in s.lemmas() if l.name() == w]  # lemma viết thường đúng chữ → không phải tên riêng
    if not lem or w in AFFIX or variant_of_existing(w) or proper(w, lem): continue
    b = base_of(w)
    if b and not lists.get(w): continue  # dạng biến tố (years, fell, best) – kho tra từ đã đưa về gốc (Lex.stems)
    cnt, sc = {}, {}
    for l in lem: p = POSMAP[l.synset().pos()]; cnt[p] = cnt.get(p, 0) + l.count() + 1; sc[p] = sc.get(p, 0) + l.count()
    pos = max(cnt, key=cnt.get)
    if (w, pos) not in OLP:  # hồ sơ người học ghi từ loại khác (CEFR-J: record = verb A2) → theo hồ sơ nếu WordNet có từ loại đó, cấp thấp nhất trước
        alt = sorted((LV.index(OLP[(w, p)][0]), p) for p in cnt if (w, p) in OLP)
        if alt: pos = alt[0][1]
    z = zipf_frequency(w, 'en')
    seen.add(w)
    # ĐA TỪ LOẠI (30/10): mỗi từ loại thông dụng = 1 mục riêng (khoá từ#loại). Từ loại phụ chỉ khi người học thật sự gặp:
    # có trong hồ sơ CEFR-J/Octanove theo từ loại, HOẶC SemCor ≥ SEC_MIN lần và ≥ SEC_SHARE tổng (duck#v, crush#v; không lấy 'table#v' hiếm).
    tot = sum(cnt.values())
    poss = [pos] + sorted((p for p in cnt if p != pos and ((w, p) in OLP or f'{w}#{p}' in FORCE or (sc[p] >= SEC_MIN and cnt[p] / tot >= SEC_SHARE))), key=lambda p: -cnt[p])
    for pos in poss:
        if f'{w}#{pos}' in have_wp and f'{w}#{pos}' not in FORCE: continue  # đã có đúng từ#loại (kho, mục mở rộng, chờ soát, hàng duyệt); mẫu cố định (--want) luôn đủ – 31/10 hard.json âm thầm co còn 204/378
        sec = pos != poss[0]
        # KHÓA NGHĨA: đúng 1 nghĩa = nghĩa người học hay gặp nhất của từ loại này: số đếm SemCor (WordNet lemma.count) lớn nhất,
        # hoà → thứ tự nghĩa WordNet (cũng xếp theo tần suất). Ưu tiên nghĩa mà từ là lemma ĐẦU (không phải biến thể/từ cắt của từ khác).
        cand = [l for l in lem if POSMAP[l.synset().pos()] == pos]
        s0 = max(cand, key=lambda l: (l.count(), l.synset().lemmas()[0].name() == w, -cand.index(l))).synset()
        why = excluded(w, syn, s0)
        if why: excl[why] = excl.get(why, 0) + 1; continue
        # tần suất CỦA TỪ LOẠI NÀY ≈ Zipf từ + log10(tỉ phần SemCor) – duck#v hiếm hơn duck#n → CEFR/thứ tự theo cách dùng đó, không theo cả từ
        zp = round(z + math.log10(cnt[pos] / tot), 2) if sec else z
        nsec[sec] += 1
        lv, lsrc = OLP.get((w, pos), (cefr(zp), 'freq'))
        if lsrc == 'freq' and not lists.get(w): nfreq += 1
        out.append({'w': w, 'pos': pos, 'z': round(zp, 2), 'cefr': lv, 'cefrSrc': lsrc, 'cefrZ': cefr(zp), **({'sec': 1} if sec else {}), 'lex': s0.lexname(), 'syn': s0.name(), 'gloss': s0.definition(),
                    'lemmas': [l.name().replace('_', ' ') for l in s0.lemmas() if l.name() != w][:4], 'wnex': s0.examples()[:2],
                    # đồng nghĩa = lemma CÙNG synset (WordNet, đúng nghĩa khóa), chỉ từ đơn đủ phổ biến – không có → [] (không bịa)
                    'syns': [l.name() for l in s0.lemmas() if l.name() != w and '_' not in l.name() and l.name().islower() and zipf_frequency(l.name(), 'en') >= 2.8][:3],
                    'comp': comps(w), 'off': '%08d-%s' % (s0.offset(), s0.pos()), 'cnt': max(l.count() for l in cand),
                    # nghĩa thay thế khi SemCor yếu (cnt < 2): job.mjs chọn lại theo nghĩa ĐẦU Wiktionary (xếp theo độ thông dụng) – mesh ≠ "số lỗ/inch"
                    'alts': [{'syn': l.synset().name(), 'gloss': l.synset().definition(), 'lemmas': [m.name().replace('_', ' ') for m in l.synset().lemmas() if m.name() != w][:4], 'wnex': l.synset().examples()[:2],
                              'syns': [m.name() for m in l.synset().lemmas() if m.name() != w and '_' not in m.name() and m.name().islower() and zipf_frequency(m.name(), 'en') >= 2.8][:3], 'lex': l.synset().lexname()}
                             for l in cand if l.synset() != s0][:3], 'lists': [] if sec else sorted(set(lists.get(w, []))),
                    # KHÓA NGHĨA THÔNG DỤNG (29/10, lớp L3 – conservatory "the faculty and students", fissure "khe của cơ quan", judgement văn bản pháp lý ở B1):
                    # MỌI nghĩa cùng từ loại theo thứ tự WordNet → job.mjs hỏi 3 giám khảo "nghĩa 1 của Wiktionary là nghĩa WordNet số mấy" (lxwsd) rồi mới soạn
                    'senses': [{'syn': l.synset().name(), 'gloss': l.synset().definition(), 'lemmas': [m.name().replace('_', ' ') for m in l.synset().lemmas() if m.name() != w][:4], 'wnex': l.synset().examples()[:2],
                                'syns': [m.name() for m in l.synset().lemmas() if m.name() != w and '_' not in m.name() and m.name().islower() and zipf_frequency(m.name(), 'en') >= 2.8][:3], 'lex': l.synset().lexname(), 'cnt': l.count()}
                               for l in cand][:12]})
# thứ tự sinh (26/10, chuẩn từ điển người học): TẦNG 0 = hồ sơ CEFR kiểu EVP (CEFR-J A1–B2 + Octanove C1/C2) hoặc danh sách NGSL/NAWL/BSL
# của repo, xếp theo cấp A1 → C2 rồi tần suất; TẦNG 1 = chỉ tần suất (wordfreq), dải Zipf 0,5 giảm dần. Tầng 0 hết → kho đủ lõi người học rồi mới mở rộng theo tần suất.
tier = lambda e: 0 if e['cefrSrc'] != 'freq' or e['lists'] else 1
out.sort(key=lambda e: (tier(e), LV.index(e['cefr']) if tier(e) == 0 else 0, -round(e['z'] * 2) / 2, 0 if e['lists'] else 1, -e['z'], e['w']))
for i, e in enumerate(out): e['rank'] = i + 1; e['band'] = int(e['z'] * 2) / 2; e['tier'] = tier(e)
json.dump({'_doc': 'Ứng viên mở rộng kho từ (scripts/lexicon/expand/pick_words.py) – thứ tự sinh. Nguồn & giấy phép: wordfreq 3.1 CC BY-SA 4.0 (SUBTLEX, Google Books Ngram…), WordNet 3.0 (Princeton), CMUdict BSD-2, LDNOOBW CC BY 4.0 (lọc), NGSL/NAWL/BSL CC BY-SA 4.0.',
           'cuts': [round(c, 2) for c in cuts], 'existing': len(have), 'target': a.target, 'n': len(out), 'items': out},
          open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(f"✓ candidates: {len(out)} (cần {need}; từ loại phụ {nsec[True]}) · loại {excl} · CEFR nguồn {dict(Counter(e['cefrSrc'] for e in out))} · cắt Zipf {['%.2f' % c for c in cuts]} · CEFR {dict(Counter(e['cefr'] for e in out))} · POS {dict(Counter(e['pos'] for e in out))}")
