#!/usr/bin/env python3
"""Cổng TẤT ĐỊNH cho bản dịch (docs/LEXICON.md §Mở rộng 20k, 27/10): mỗi từ của bản dịch phải là từ CÓ THẬT trong đúng ngôn ngữ đó.
  python scripts/lexicon/expand/trcheck.py --in tr.json --out bad.json      tr.json = {k: {lang: "a; b"}} → bad.json = {k: {lang: ["từ lạ", …]}}
Nguồn: wordfreq 3.1 (CC BY-SA 4.0). Lớp lỗi pilot 11: mainline pt "inyectar" (tiếng Tây Ban Nha, Zipf pt 0 / es 3,1) qua cả 2 giám khảo AI.
Luật (chỉ ngôn ngữ chữ Latinh/Kirin có tách từ bằng khoảng trắng): từ ≥ 3 chữ cái có Zipf = 0 trong ngôn ngữ đích NHƯNG phổ biến (Zipf ≥ 2)
ở ngôn ngữ khác → lẫn ngôn ngữ. Soát 27/10: "Zipf = 0 là lạ" bắt NHẦM từ đúng hiếm (tr horlamak/öngörmek, id stratosfer, pt aturdimento) → chỉ bắt lẫn ngôn ngữ."""
import json, re, argparse
from wordfreq import zipf_frequency as z
LANGS = ['es', 'pt', 'fr', 'de', 'id', 'ru', 'tr']
OTHER = ['es', 'pt', 'fr', 'de', 'it', 'en']
ap = argparse.ArgumentParser(); ap.add_argument('--in', dest='inp', required=True); ap.add_argument('--out', required=True); a = ap.parse_args()
def bad_tokens(text, l):
    out = []
    for t in re.findall(r'[^\W\d_]{3,}', str(text).lower()):
        if z(t, l) > 0: continue
        if any(z(t, o) >= 2 for o in OTHER if o != l): out.append(t)
    return out
res = {}
for k, m in json.load(open(a.inp, encoding='utf-8')).items():
    for l, t in (m or {}).items():
        if l in LANGS and t:
            b = bad_tokens(t, l)
            if b: res.setdefault(k, {})[l] = b
json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
print(f'✓ trcheck: {sum(len(v) for v in res.values())} bản dịch có từ lạ / {len(res)} mục')
