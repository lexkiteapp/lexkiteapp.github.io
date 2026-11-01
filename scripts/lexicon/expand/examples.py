#!/usr/bin/env python3
"""Câu ví dụ NGƯỜI VIẾT cho mục mở rộng (docs/LEXICON.md §Mở rộng 20k – source-first 24/10).
  python scripts/lexicon/expand/examples.py --words words.json --tatoeba eng_sentences.tsv [--bad ldnoobw.txt] --out ex.json
words.json: [{"k": "alarm#n", "w": "alarm", "pos": "n"}]
Nguồn: Tatoeba (CC BY 2.0 FR, ghi id câu để ghi công) – câu chứa ĐÚNG lemma + từ loại (WordNet morphy + thẻ từ loại nltk perceptron),
5–14 từ, từ còn lại phổ biến (wordfreq Zipf ≥ 3,3 = dễ, xếp theo độ dễ), không số/ngoặc kép/từ xúc phạm, không trùng ý (3 từ đầu khác nhau).
Nghĩa (đúng nghĩa khóa WordNet) do 2 giám khảo kiểm ở job.mjs (lxsrc) – tệp này chỉ lọc hình thức.
Kèm ứng viên cụm từ đồng xuất hiện (từ nội dung kề bên ≥ 3 lần) – giám khảo lọc theo nghĩa, không đủ → bỏ trống (không bịa)."""
import json, re, argparse
from collections import Counter, defaultdict
from wordfreq import zipf_frequency
from nltk.corpus import wordnet as wn
import nltk

ap = argparse.ArgumentParser()
ap.add_argument('--words', required=True); ap.add_argument('--tatoeba', required=True); ap.add_argument('--bad'); ap.add_argument('--out', required=True)
ap.add_argument('--per', type=int, default=10)  # 29/10: ví dụ chỉ từ người viết → nhiều ứng viên hơn cho giám khảo nguồn + trắc nghiệm nghĩa
a = ap.parse_args()
W = json.load(open(a.words))
WNP = {'n': wn.NOUN, 'v': wn.VERB, 'adj': wn.ADJ, 'adv': wn.ADV}
TAG = {'n': ('NN',), 'v': ('VB',), 'adj': ('JJ',), 'adv': ('RB',)}
want = defaultdict(set)  # pos → {w}
for x in W: want[x['pos']].add(x['w'])
bad = {l.strip().lower() for l in open(a.bad) if l.strip()} if a.bad else set()
STOP = set('a an the and or but if of to in on at by for with from as is are was were be been being am do does did have has had i you he she it we they me him her us them my your his its our their this that these those there here not no so very too can could will would shall should may might must just than then also only what which who whom whose when where why how all any some each every one up down out over into about after before again'.split())
cache = {}
NAMES = {'tom', 'mary', 'john', 'ken', 'jim', 'bill', 'jack', 'alice', 'bob', 'sami', 'layla', 'dan', 'linda'}
def lemmas(t):  # token → {(w, pos)} trong danh sách cần
    r = cache.get(t)
    if r is None:
        r = set()
        for p, ws in want.items():
            if t in ws: r.add((t, p))
            for b in wn._morphy(t, WNP[p]) if t.isalpha() or '-' in t else []:
                if b in ws: r.add((b, p))
        cache[t] = r
    return r
TOK = re.compile(r"[A-Za-z]+(?:[-'][A-Za-z]+)*|[^\sA-Za-z]")
hits = defaultdict(list)  # (w,pos) → [(score, id, text, idx)]
zc = {}
def z(t):
    v = zc.get(t)
    if v is None: v = zc[t] = zipf_frequency(t, 'en')
    return v
for line in open(a.tatoeba, encoding='utf-8'):
    p = line.rstrip('\n').split('\t')
    if len(p) < 3: continue
    sid, s = p[0], p[2].strip()
    if not (20 <= len(s) <= 110) or re.search(r'[0-9"“”«»()\[\]:;/@#&*_]', s) or not re.match(r'[A-Z]', s) or s[-1] not in '.!?': continue
    toks = TOK.findall(s); words = [t for t in toks if t[0].isalpha()]
    if not (5 <= len(words) <= 14): continue
    low = [t.lower() for t in words]
    found = set()
    for i, t in enumerate(low):
        for wp in lemmas(t): found.add((wp, i))
    if not found: continue
    if any(t in bad for t in low): continue
    for (wp, i) in found:
        rest = [t for j, t in enumerate(low) if j != i and t not in STOP]
        if rest and min(z(t) for t in rest) < 3.3: continue  # câu dễ: mọi từ khác phổ biến
        caps = sum(1 for j, t in enumerate(words) if j and t[0].isupper() and t != 'I')
        score = (sum(z(t) for t in rest) / max(1, len(rest))) - 0.08 * abs(len(words) - 9) - 0.5 * caps
        hits[wp].append((score, sid, s, i))
out = {}
for x in W:
    wp = (x['w'], x['pos']); L = sorted(hits.get(wp, []), key=lambda h: (-h[0], h[1]))[:200]
    keep, seen, col, bags = [], set(), Counter(), []
    for sc, sid, s, i in L:
        words = [t for t in TOK.findall(s) if t[0].isalpha()]
        try: tags = nltk.pos_tag(words)
        except Exception: tags = []
        if tags and not tags[i][1].startswith(TAG[x['pos']]): continue  # từ loại sai (a cook ≠ to cook)
        low = [t.lower() for t in words]
        for j in (i - 1, i + 1):  # cụm đồng xuất hiện: từ nội dung kề bên – viết thường trong câu, không sở hữu cách/tên (mary's forehead), có trong WordNet
            if 0 <= j < len(low) and low[j] not in STOP and len(low[j]) > 2 and z(low[j]) >= 3.5 and words[j].islower() and "'" not in low[j] and wn.synsets(low[j]) and low[j] not in NAMES:
                col[(low[j] + ' ' + x['w']) if j < i else (x['w'] + ' ' + low[j])] += 1
        key = ' '.join(low[:3]); bag = set(low)
        if key in seen or len(keep) >= a.per or any(len(bag & b) / len(bag | b) >= 0.5 for b in bags): continue  # không trùng ý (He/She pondered his next move)
        seen.add(key); bags.append(bag); keep.append({'t': s, 'id': int(sid), 'sc': round(sc, 2)})
    out[x['k']] = {'ex': keep, 'col': [c for c, n in col.most_common(6) if n >= 3][:4], 'n': len(hits.get(wp, []))}
json.dump(out, open(a.out, 'w'), ensure_ascii=False)
print(f"✓ examples: {sum(1 for v in out.values() if len(v['ex']) >= 2)}/{len(out)} có ≥ 2 câu Tatoeba · {sum(1 for v in out.values() if v['col'])} có cụm đồng xuất hiện")
