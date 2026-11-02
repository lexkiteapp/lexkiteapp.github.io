#!/usr/bin/env python3
"""Dữ liệu NGƯỜI VIẾT theo đúng synset đã khoá (docs/LEXICON.md §Mở rộng 20k – bản "ra là ok" 29/10).
  python scripts/lexicon/expand/synset.py --in items.json --out syn.json      items = [{"k", "w", "pos", "syn", "wnex": [...]}]
→ {k: {"omw": {lang: [lemma, …]}, "wx": ["Câu ví dụ WordNet.", …]}}
- omw: lemma của CHÍNH synset trong Open Multilingual Wordnet 1.4 (nltk omw-1.4) – ja jpn (Japanese WordNet), zh cmn (Chinese Open Wordnet),
  th tha (Thai WordNet), id ind (Wordnet Bahasa), fr fra (WOLF), es spa (MCR), pt por (OpenWN-PT), ar arb (Arabic WordNet); giấy phép
  từng gói ghi ở src.lic của mục. Xếp theo wordfreq (thông dụng trước). Lớp D1: bảng Wiktionary ghép nhầm nghĩa (repress th กลั้น,
  cassette zh 卡式) → bản dịch bảng chỉ giữ khi CÓ trong lemma OMW của synset (job.mjs).
- wx: ví dụ WordNet CỦA synset (người viết, khoá đúng nghĩa – lớp L2) khi là mệnh đề đủ ≥ 4 từ, chứa từ, có động từ chia → viết hoa + dấu chấm."""
import json, re, argparse, warnings
warnings.filterwarnings('ignore')  # omw cmn: offset lạ (nltk cảnh báo từng dòng)
from nltk.corpus import wordnet as wn
import nltk
try:
    from wordfreq import zipf_frequency
except Exception:  # pragma: no cover
    zipf_frequency = None
OMW = {'ja': 'jpn', 'zh': 'cmn', 'th': 'tha', 'id': 'ind', 'fr': 'fra', 'es': 'spa', 'pt': 'por', 'ar': 'arb'}
HARAKAT = re.compile('[ً-ْٰ]')
ap = argparse.ArgumentParser(); ap.add_argument('--in', dest='inp', required=True); ap.add_argument('--out', required=True); a = ap.parse_args()

def z(t, l):
    if not zipf_frequency or l == 'th': return 0  # wordfreq không tách từ tiếng Thái → giữ thứ tự OMW
    try: return zipf_frequency(t, l)
    except Exception: return 0

def norm(t, l):
    t = t.replace('+', '').replace('_', ' ').strip()
    if l == 'ar': t = HARAKAT.sub('', t)
    return t

def lemmas(syn, l):
    try: names = syn.lemma_names(OMW[l])
    except Exception: return []
    out = []
    for n in names:
        t = norm(n, l)
        if t and t not in out and len(t.split()) <= 4: out.append(t)
    return sorted(out, key=lambda t: -z(t, l))

FIN = ('VBD', 'VBZ', 'VBP', 'MD')
def sentence(x, w):
    x = re.sub(r'\s+', ' ', str(x)).strip().strip('"').strip()
    if not x or re.search(r'[0-9";:()\[\]]', x): return None
    toks = re.findall(r"[A-Za-z]+(?:[-'][A-Za-z]+)*", x)
    if len(toks) < 4 or len(toks) > 18: return None
    stem = w[:max(3, min(len(w), len(w) - 1))].lower()
    if not any(t.lower().startswith(stem) for t in toks): return None
    try: tags = nltk.pos_tag(toks)
    except Exception: return None
    if not any(tg in FIN for _, tg in tags): return None  # cụm danh từ ("a sudden fissure") không phải câu
    x = x[0].upper() + x[1:]
    return x if x[-1] in '.!?' else x + '.'

res = {}
for it in json.load(open(a.inp, encoding='utf-8')):
    try: syn = wn.synset(it['syn'])
    except Exception: res[it['k']] = {'omw': {}, 'wx': []}; continue
    omw = {l: v for l in OMW if (v := lemmas(syn, l))}
    wx = [s for s in (sentence(e, it['w']) for e in (it.get('wnex') or syn.examples())) if s]
    res[it['k']] = {'omw': omw, 'wx': wx[:2]}
json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
print(f"✓ synset: {len(res)} mục · OMW có ≥ 1 ngôn ngữ {sum(1 for v in res.values() if v['omw'])} · ví dụ WordNet {sum(1 for v in res.values() if v['wx'])}")
