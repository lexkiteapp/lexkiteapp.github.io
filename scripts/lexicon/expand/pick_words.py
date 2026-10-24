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
import json, re, sys, csv, argparse, statistics
from wordfreq import zipf_frequency, top_n_list
from nltk.corpus import wordnet as wn

ap = argparse.ArgumentParser()
ap.add_argument('--existing', required=True); ap.add_argument('--cmu', required=True); ap.add_argument('--bad', required=True)
ap.add_argument('--cefrj'); ap.add_argument('--octanove'); ap.add_argument('--target', type=int, default=20000); ap.add_argument('--out', default='content/lexicon/expand/candidates.json')
a = ap.parse_args()
EX = json.load(open(a.existing)); have = set(EX)
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
    if lv in LV and re.fullmatch(r'[a-z]+', w): med.setdefault(lv, []).append(zipf_frequency(w, 'en'))
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
out, seen, excl = [], set(), {}
need = a.target - len(have)
for w in top_n_list('en', 80000):
    if len(out) >= need * 1.25: break  # dư 25 % cho hàng duyệt/loại
    if w in have or w in seen or not re.fullmatch(r'[a-z]{3,}(-[a-z]+)?', w) or w not in cmu and '-' not in w: continue
    if w in bad or any(b in bad for b in w.split('-')): continue
    syn = wn.synsets(w)
    lem = [l for s in syn for l in s.lemmas() if l.name() == w]  # lemma viết thường đúng chữ → không phải tên riêng
    if not lem or w in AFFIX or variant_of_existing(w) or proper(w, lem): continue
    b = base_of(w)
    if b and not lists.get(w): continue  # dạng biến tố (years, fell, best) – kho tra từ đã đưa về gốc (Lex.stems)
    cnt = {}
    for l in lem: p = POSMAP[l.synset().pos()]; cnt[p] = cnt.get(p, 0) + l.count() + 1
    pos = max(cnt, key=cnt.get)
    # KHÓA NGHĨA: đúng 1 nghĩa = nghĩa người học hay gặp nhất của từ loại này: số đếm SemCor (WordNet lemma.count) lớn nhất,
    # hoà → thứ tự nghĩa WordNet (cũng xếp theo tần suất). Ưu tiên nghĩa mà từ là lemma ĐẦU (không phải biến thể/từ cắt của từ khác).
    cand = [l for l in lem if POSMAP[l.synset().pos()] == pos]
    s0 = max(cand, key=lambda l: (l.count(), l.synset().lemmas()[0].name() == w, -cand.index(l))).synset()
    why = excluded(w, syn, s0)
    if why: excl[why] = excl.get(why, 0) + 1; continue
    z = zipf_frequency(w, 'en')
    seen.add(w)
    lv, lsrc = OLP.get((w, pos), (cefr(z), 'freq'))
    out.append({'w': w, 'pos': pos, 'z': round(z, 2), 'cefr': lv, 'cefrSrc': lsrc, 'cefrZ': cefr(z), 'lex': s0.lexname(), 'syn': s0.name(), 'gloss': s0.definition(),
                'lemmas': [l.name().replace('_', ' ') for l in s0.lemmas() if l.name() != w][:4], 'wnex': s0.examples()[:2], 'lists': sorted(set(lists.get(w, [])))})
# ưu tiên: từ có trong danh sách học thuật/kinh doanh của repo lên trước trong cùng dải Zipf 0,5
out.sort(key=lambda e: (-round(e['z'] * 2) / 2, 0 if e['lists'] else 1, -e['z'], e['w']))
for i, e in enumerate(out): e['rank'] = i + 1; e['band'] = int(e['z'] * 2) / 2
json.dump({'_doc': 'Ứng viên mở rộng kho từ (scripts/lexicon/expand/pick_words.py) – thứ tự sinh. Nguồn & giấy phép: wordfreq 3.1 CC BY-SA 4.0 (SUBTLEX, Google Books Ngram…), WordNet 3.0 (Princeton), CMUdict BSD-2, LDNOOBW CC BY 4.0 (lọc), NGSL/NAWL/BSL CC BY-SA 4.0.',
           'cuts': [round(c, 2) for c in cuts], 'existing': len(have), 'target': a.target, 'n': len(out), 'items': out},
          open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(f"✓ candidates: {len(out)} (cần {need}) · loại {excl} · CEFR nguồn {dict(Counter(e['cefrSrc'] for e in out))} · cắt Zipf {['%.2f' % c for c in cuts]} · CEFR {dict(Counter(e['cefr'] for e in out))} · POS {dict(Counter(e['pos'] for e in out))}")
