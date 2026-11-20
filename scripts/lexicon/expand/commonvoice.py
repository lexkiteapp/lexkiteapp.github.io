#!/usr/bin/env python3
"""Câu ví dụ NGƯỜI VIẾT từ kho câu Common Voice tiếng Anh (CC0 1.0 – github.com/common-voice/common-voice server/data/en) – nguồn thứ 4 cạnh Tatoeba + Simple Wikipedia + Wiktionary.
  python scripts/lexicon/expand/commonvoice.py --out cv.tsv wiki.en.txt sentence-collector.txt ...
Ra TSV cùng dạng Tatoeba (id<TAB>eng<TAB>câu), id = cv<số tệp>.<số dòng> → job.mjs nhận nguồn qua tiền tố, giấy phép ghi ở src.lic.
Chỉ lọc HÌNH THỨC: ASCII, 20–110 ký tự, 5–14 từ, kết thúc . ! ?, không số/ngoặc/dấu lạ/đại từ không tham chiếu, và DỄ: tối đa 1 từ hiếm (Zipf < 3,3 = từ mục tiêu) →
examples.py không phải gán thẻ hàng triệu câu khó. ĐÚNG NGHĨA do 3 giám khảo lxsrc + trắc nghiệm lxwsd quyết như mọi câu khác."""
import argparse, hashlib, re, sys
from wordfreq import zipf_frequency

ap = argparse.ArgumentParser()
ap.add_argument('--out', required=True); ap.add_argument('--max', type=int, default=1_500_000)
ap.add_argument('files', nargs='+')
a = ap.parse_args()
BAD = re.compile(r'[^\x20-\x7e]|[0-9"()\[\]{}<>|=_*#@&;:/\\~^%$+]|\b(?:he|she|it|they|this|these|those|his|her|their|its|him|them)\b', re.I)
TOK = re.compile(r"[A-Za-z]+(?:'[a-z]+)?")
seen, n_out = set(), 0
with open(a.out, 'w', encoding='utf-8') as o:
    for fi, path in enumerate(a.files):
        with open(path, encoding='utf-8', errors='ignore') as f:
            for ln, s in enumerate(f, 1):
                s = s.strip()
                if not (20 <= len(s) <= 110) or s[-1] not in '.!?' or not s[0].isupper() or BAD.search(s): continue
                ws = TOK.findall(s)
                if not 5 <= len(ws) <= 14: continue
                if sum(1 for w in ws[1:] if zipf_frequency(w.lower(), 'en') < 3.3) > 1: continue
                h = hashlib.md5(s.lower().encode()).digest()[:8]
                if h in seen: continue
                seen.add(h); n_out += 1
                o.write(f'cv{fi}.{ln}\teng\t{s}\n')
                if n_out >= a.max: break
        if n_out >= a.max: break
print(f'✓ commonvoice: {n_out} câu', file=sys.stderr)
