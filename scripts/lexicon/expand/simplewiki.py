#!/usr/bin/env python3
"""Câu ví dụ NGƯỜI VIẾT từ Simple English Wikipedia (CC BY-SA 4.0) – nguồn thứ 3 cạnh Tatoeba + Wiktionary (docs/LEXICON.md §Câu ví dụ).
  python scripts/lexicon/expand/simplewiki.py --dump simplewiki-latest-pages-articles.xml.bz2 --out simplewiki.tsv
Ra TSV cùng dạng Tatoeba (id<TAB>eng<TAB>câu), id = sw<trang>.<số> → examples.py/job.mjs nhận ra nguồn qua tiền tố, giấy phép ghi ở src.lic.
Chỉ lọc HÌNH THỨC (ASCII, 20–110 ký tự, 5–14 từ, không số/ngoặc/dấu markup, không trang đổi hướng/đa nghĩa); ĐÚNG NGHĨA do 3 giám khảo lxsrc + trắc nghiệm lxwsd quyết như mọi câu khác."""
import argparse, bz2, hashlib, re, sys
import xml.etree.ElementTree as ET

ap = argparse.ArgumentParser()
ap.add_argument('--dump', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--max', type=int, default=2_000_000)
# 08/11: cùng bộ lọc cho các dump MediaWiki tiếng Anh khác (Wikivoyage/Wikinews/Wikibooks) – tiền tố id = nguồn (job.mjs EX_SRC)
ap.add_argument('--prefix', default='sw', choices=['sw', 'wv', 'wnw', 'wb', 'wvs', 'ew'])
a = ap.parse_args()

def clean(t):
    t = re.sub(r'<!--.*?-->', ' ', t, flags=re.S)
    t = re.sub(r'<ref[^>/]*/>|<ref[^>]*>.*?</ref>', ' ', t, flags=re.S)
    t = re.sub(r'<(math|gallery|source|syntaxhighlight|code|pre|nowiki|timeline|imagemap|score)[^>]*>.*?</\1>', ' ', t, flags=re.S | re.I)
    for _ in range(8):  # mẫu {{…}} lồng nhau: bỏ lớp trong cùng, lặp
        n = re.sub(r'\{\{[^{}]*\}\}', ' ', t)
        if n == t: break
        t = n
    t = re.sub(r'\{\|.*?\|\}', ' ', t, flags=re.S)
    for _ in range(4):  # [[File:..|..[[x]]..]] lồng
        n = re.sub(r'\[\[(?:File|Image|Category|Media):[^\[\]]*\]\]', ' ', t, flags=re.I)
        if n == t: break
        t = n
    t = re.sub(r'\[\[[^\]|]*\|([^\]]*)\]\]', r'\1', t)
    t = re.sub(r'\[\[([^\]]*)\]\]', r'\1', t)
    t = re.sub(r'\[https?://[^\s\]]+\s*([^\]]*)\]', r'\1', t)
    t = re.sub(r"'{2,}", '', t)
    t = re.sub(r'<[^>]+>', ' ', t)
    return t

SENT = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')
BAD = re.compile(r'[^\x20-\x7e]|[0-9"()\[\]{}<>|=_*#@&;:/\\~^%$+]|\bmay (?:also )?(?:refer|mean)\b|\b(?:he|she|it|they|this|these|those|his|her|their|its|him|them)\b', re.I)
seen, n_out, n_pages = set(), 0, 0
with bz2.open(a.dump, 'rb') as f, open(a.out, 'w', encoding='utf-8') as o:
    pid, ns, red, txt = None, None, False, None
    for ev, el in ET.iterparse(f, events=('end',)):
        tag = el.tag.rsplit('}', 1)[-1]
        if tag == 'ns': ns = el.text
        elif tag == 'redirect': red = True
        elif tag == 'id' and pid is None: pid = el.text            # id đầu tiên trong <page> là id trang
        elif tag == 'text': txt = el.text or ''
        elif tag == 'page':
            if ns == '0' and not red and txt and not txt.lstrip().lower().startswith('#redirect'):
                n_pages += 1; k = 0
                for line in clean(txt).split('\n'):
                    line = line.strip()
                    if not line or not line[0].isalpha(): continue   # bỏ danh sách, tiêu đề (=), bảng, định dạng
                    for s in SENT.split(line):
                        s = s.strip()
                        if not (20 <= len(s) <= 110) or s[-1] not in '.!?' or not s[0].isupper() or BAD.search(s): continue
                        if not 5 <= len(s.split()) <= 14: continue
                        h = hashlib.md5(s.lower().encode()).digest()[:8]
                        if h in seen: continue
                        seen.add(h); k += 1; n_out += 1
                        o.write(f'{a.prefix}{pid}.{k}\teng\t{s}\n')
                        if n_out >= a.max: break
                    if n_out >= a.max: break
            pid, ns, red, txt = None, None, False, None
            el.clear()
            if n_out >= a.max: break
print(f'✓ {a.prefix} (simplewiki.py): {n_pages} trang → {n_out} câu', file=sys.stderr)
