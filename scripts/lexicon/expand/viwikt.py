"""Nghĩa tiếng Việt NGƯỜI VIẾT từ Wiktionary tiếng Việt (vi.wiktionary.org, CC BY-SA 4.0) – qua kaikki.org/viwiktionary (wiktextract).
python viwikt.py --raw raw-wiktextract-data.jsonl.gz --candidates candidates.json --out viwk.json
→ {"word#pos": ["bóc vỏ", "gọt vỏ", "lột", …]} chỉ cho từ ứng viên; nghĩa theo thứ tự mục (nghĩa 1 trước), ≤ 4 nghĩa/từ loại, ≤ 8 phương án.
Lớp L1 (31/10, phễu 600 → rớt vi 178): bảng dịch Wiktionary tiếng Anh thiếu vi cho đa số từ hiếm → không bao giờ có nguồn người viết;
Wiktionary tiếng Việt phủ 94 % mục chỉ rớt vì vi (2.178/2.328 hàng duyệt). Đây là NGUỒN ĐỐI CHIẾU, không phải nguồn duy nhất:
job.mjs vẫn cần ≥ 1 nguồn độc lập khác trùng + trắc nghiệm nghĩa 3 giám khảo + không bị AI họ khác phản bác."""
import argparse, gzip, json, re

PM = {'noun': 'n', 'verb': 'v', 'adj': 'adj', 'adv': 'adv'}


def terms(g):
    """'Bóc vỏ, gọt vỏ; lột (da... ).' → ['bóc vỏ', 'gọt vỏ', 'lột']; bỏ nhãn (…)/[…], câu giải thích dài (> 5 âm tiết), mảnh có chữ Anh/ngoặc lẻ."""
    g = re.sub(r'\([^)]*\)|\[[^\]]*\]', '', str(g or ''))
    out = []
    for p in re.split(r'[;,.]', g):
        p = re.sub(r'\s+', ' ', p).strip(' :–-…').lower()
        if not p or len(p.split()) > 5 or re.search(r'[()\[\]=/"“”0-9]', p): continue
        out.append(p)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', required=True); ap.add_argument('--candidates', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args()
    C = json.load(open(a.candidates, encoding='utf-8'))
    want = {f"{e['w']}#{e['pos']}" for e in (C.get('items', C) if isinstance(C, dict) else C)}
    words = {k.split('#')[0] for k in want}
    res, nsen = {}, {}
    op = gzip.open if a.raw.endswith('.gz') else open
    with op(a.raw, 'rt', encoding='utf-8') as f:
        for line in f:
            if '"en"' not in line: continue
            try: e = json.loads(line)
            except ValueError: continue
            if e.get('lang_code') != 'en' or e.get('word') not in words: continue
            p = PM.get(e.get('pos')); k = f"{e['word']}#{p}"
            if not p or k not in want: continue
            for s in e.get('senses') or []:
                if nsen.get(k, 0) >= 4: break
                if any(t in (s.get('tags') or []) for t in ('obsolete', 'archaic', 'rare')): continue
                g = (s.get('glosses') or [''])[0]; ts = terms(g)
                if not ts: continue
                nsen[k] = nsen.get(k, 0) + 1
                L = res.setdefault(k, [])
                for t in ts:
                    if t not in L and len(L) < 8: L.append(t)
    json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'✓ viwikt: {len(res)}/{len(want)} ứng viên có nghĩa vi Wiktionary tiếng Việt')


if __name__ == '__main__':
    main()
