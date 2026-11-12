#!/usr/bin/env python3
"""Nghĩa vi NGƯỜI VIẾT từ Wikidata (CC0): khoản mục có P8814 (WordNet 3.1) + nhãn tiếng Việt → content/lexicon/expand/wikidata-vi.json {word#pos: [vi…]}.
Chỉ là nguồn ĐỐI CHIẾU cho job.mjs (gộp vào WV): một từ gom nhãn của mọi synset nên có thể lệch nghĩa – viAgreeSources vẫn đòi đồng thuận, cổng giữ nguyên.
Chạy lại khi cần (không chạy trên CI hằng ngày): python3 wikidata_vi.py --wn <thư mục wordnet31> [--csv wd.csv] --out <json>. Lấy 2 bước vì truy vấn gộp bị WDQS cắt thời gian."""
import argparse, collections, csv, io, json, re, sys, time, urllib.parse, urllib.request

WDQS = 'https://query.wikidata.org/sparql'
POS = {'n': 'n', 'v': 'v', 'a': 'adj', 's': 'adj', 'r': 'adv'}
DATA = {'n': 'noun', 'v': 'verb', 'a': 'adj', 'r': 'adv'}
BATCH = 2500


def sparql(q, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(WDQS, data=urllib.parse.urlencode({'query': q}).encode(),
                                         headers={'User-Agent': 'LexkiteContentCI/1.0', 'Accept': 'text/csv'})
            text = urllib.request.urlopen(req, timeout=70).read().decode()
            if 'TimeoutException' in text: raise RuntimeError('timeout')
            return list(csv.DictReader(io.StringIO(text)))
        except Exception as e:
            print('thử lại', repr(e)[:70], file=sys.stderr); time.sleep(8 * (i + 1))
    raise SystemExit('WDQS lỗi quá số lần thử')


def fetch():
    """→ [(synset, nhãn vi)]"""
    syn = {r['i'].rsplit('/', 1)[1]: r['s'] for r in sparql('SELECT ?i ?s WHERE { ?i wdt:P8814 ?s }')}
    ids, rows = list(syn), []
    for k in range(0, len(ids), BATCH):
        vals = ' '.join('wd:' + x for x in ids[k:k + BATCH])
        rows += [(syn[r['i'].rsplit('/', 1)[1]], r['l']) for r in sparql(f'SELECT ?i ?l WHERE {{ VALUES ?i {{ {vals} }} ?i rdfs:label ?l . FILTER(LANG(?l)="vi") }}')]
        time.sleep(1)
    return rows


def lemmas(files, offset, pos):
    """dòng data.* của WordNet tại đúng byte offset → (ss_type, [lemma])"""
    f = files['a' if pos == 's' else pos]; f.seek(offset); a = f.readline().decode().split()
    if int(a[0]) != offset: raise ValueError(offset)
    return a[2], [re.sub(r'\(.*\)', '', a[4 + 2 * i]) for i in range(int(a[3], 16))]


def good_label(l, lems):
    """bỏ tên riêng/danh pháp, nhãn chép nguyên tiếng Anh, nhãn không dấu tiếng Việt (thường là tên Latin)"""
    return 1 <= len(l.split()) <= 4 and not re.search(r'[0-9()]', l) and not (l[:1].isupper() and l[1:] != l[1:].lower()) \
        and l.lower() not in lems and bool(re.search(r'[^\x00-\x7f]', l))


def build(rows, files):
    out = collections.defaultdict(set)
    for s, l in rows:
        try:
            off, p = s.split('-'); st, ws = lemmas(files, int(off), p)
        except (ValueError, IndexError, KeyError):
            continue
        l, low = l.strip(), {w.replace('_', ' ').lower() for w in ws}
        if good_label(l, low):
            for w in ws:
                if w[0].islower(): out[w.replace('_', ' ').lower() + '#' + POS[st]].add(l.lower())
    return {k: sorted(v) for k, v in sorted(out.items())}


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--wn', required=True); ap.add_argument('--csv'); ap.add_argument('--out', required=True); a = ap.parse_args()
    rows = [(r['s'], r['l']) for r in csv.DictReader(open(a.csv, encoding='utf8'))] if a.csv else fetch()
    res = build(rows, {p: open(f'{a.wn}/data.{n}', 'rb') for p, n in DATA.items()})
    json.dump(res, open(a.out, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(f'wikidata-vi: {len(rows)} nhãn → {len(res)} mục')
