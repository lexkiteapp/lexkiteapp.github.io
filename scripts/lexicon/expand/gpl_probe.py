"""ĐO THỬ (11/11, chủ duyệt "Đo thử, không vào app"): từ điển Anh–Việt Hồ Ngọc Đức (OVDP, StarDict AnhViet.zip) – GIẤY PHÉP GPL.
Chỉ chạy trong job CI lexicon-gpl-probe.yml: tệp tải vào $RUNNER_TEMP, KHÔNG commit, KHÔNG artifact, KHÔNG vào app/kho/dữ liệu xuất.
python -I gpl_probe.py --zip AnhViet.zip --sample sample.json --out $RUNNER_TEMP/gpl.json
→ {"word#pos": ["nghĩa 1", …]} chỉ cho từ trong mẫu (tệp tạm, xoá cuối job). Kết quả công bố = CON SỐ do gpl-probe.mjs in ra."""
import argparse, gzip, io, json, os, re, struct, sys, zipfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from viwikt import terms  # cùng bộ tách nghĩa với Wiktionary tiếng Việt → so khớp công bằng

# dòng từ loại kiểu Hồ Ngọc Đức: "* danh từ", "* ngoại động từ", "* tính từ", "* phó từ"
POS = [('danh từ', 'n'), ('động từ', 'v'), ('tính từ', 'adj'), ('phó từ', 'adv')]


def pos_of(line):
    t = line.lower()
    for k, p in POS:
        if k in t: return p
    return None


def entries(zf):
    names = zf.namelist()
    pick = lambda ext: next(n for n in names if n.lower().endswith(ext))
    idx = zf.read(pick('.idx'))
    dn = next((n for n in names if n.lower().endswith('.dict.dz')), None)
    data = gzip.decompress(zf.read(dn)) if dn else zf.read(pick('.dict'))
    i = 0
    while i < len(idx):
        j = idx.index(b'\0', i); w = idx[i:j].decode('utf-8', 'replace'); off, size = struct.unpack('>II', idx[j + 1:j + 9]); i = j + 9
        yield w, data[off:off + size].decode('utf-8', 'replace')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--zip', required=True); ap.add_argument('--sample', required=True); ap.add_argument('--out', required=True)
    a = ap.parse_args()
    want = {e['w'] for e in json.load(open(a.sample, encoding='utf-8'))['items']}
    res, heads = {}, 0
    with zipfile.ZipFile(a.zip) as zf:
        for w, body in entries(zf):
            heads += 1
            if w not in want: continue
            p = None
            for line in body.split('\n'):
                s = line.strip()
                if s.startswith('*'): p = pos_of(s)
                elif s.startswith('-') and p:
                    for t in terms(s[1:]):
                        L = res.setdefault(f'{w}#{p}', [])
                        if t not in L and len(L) < 8: L.append(t)
    json.dump(res, open(a.out, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'gpl_probe: {heads} mục từ điển · {len(res)} word#pos trong mẫu có nghĩa vi')


if __name__ == '__main__':
    main()
