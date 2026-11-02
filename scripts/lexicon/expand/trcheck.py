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
ap = argparse.ArgumentParser(); ap.add_argument('--in', dest='inp', required=True); ap.add_argument('--out', required=True)
# --exist (29/10, lớp D2: ja 忙しむ, th ภมุ – từ không tồn tại): bản dịch CHỈ có nguồn Wiktionary (không có OMW xác nhận) phải là từ có trong
# kho tần suất của ngôn ngữ đó (wordfreq Zipf > 0; zh/ja/ko cần gói cjk – thiếu gói = coi như lạ, an toàn). Ngôn ngữ wordfreq không hỗ trợ (th) → bỏ qua.
ap.add_argument('--exist', action='store_true'); a = ap.parse_args()
EXIST = ['es', 'pt', 'fr', 'de', 'id', 'ru', 'tr', 'ko', 'hi', 'ar', 'ja', 'zh']
CJK = {'ja', 'zh', 'ko'}
def unknown(text, l):
    t = str(text).strip().split(';')[0].strip()
    if not t: return []
    toks = [t] if l in CJK else re.findall(r'[^\W\d_]{2,}', t.lower())
    out = []
    for x in toks:
        try: f = z(x, l)
        except Exception: f = 0
        if f <= 0: out.append(x)
    return out
def bad_tokens(text, l):
    out = []
    for t in re.findall(r'[^\W\d_]{3,}', str(text).lower()):
        if z(t, l) > 0: continue
        if any(z(t, o) >= 2 for o in OTHER if o != l): out.append(t)
    return out
res = {}
for k, m in json.load(open(a.inp, encoding='utf-8')).items():
    for l, t in (m or {}).items():
        if a.exist:
            b = unknown(t, l) if l in EXIST and t else []
        elif l in LANGS and t:
            b = bad_tokens(t, l)
        else: b = []
        if b: res.setdefault(k, {})[l] = b
json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
print(f'✓ trcheck: {sum(len(v) for v in res.values())} bản dịch có từ lạ / {len(res)} mục')
