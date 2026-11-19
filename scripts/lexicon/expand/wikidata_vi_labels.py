#!/usr/bin/env python3
"""Nghĩa vi NGƯỜI VIẾT thứ ba (13/11): nhãn vi của khoản mục Wikidata (CC0) CÓ bài Wikipedia tiếng Anh và nhãn en = từ (chữ thường, danh từ chung) – phủ được từ mà WordNet-P8814 không có.
Chỉ đối chiếu (gộp vào WV): một từ nhiều nghĩa gom nhãn của mọi khoản mục, viAgreeSources vẫn đòi ≥ 2 nguồn trùng + giám khảo WSD, cổng giữ nguyên.
Dùng: python3 wikidata_vi_labels.py --words words.txt --out out.json [--merge wikidata-vi.json]  (words.txt: mỗi dòng một từ; trên CI, không chạy trên Mac)"""
import argparse, csv, io, json, re, sys, time, urllib.parse, urllib.request
from wikidata_vi import good_label, WDQS
B = 150


def q(words):
    vals = ' '.join('"%s"@en' % w.replace('"', '') for w in words)
    return ('SELECT ?w ?l WHERE { VALUES ?w { %s } ?i rdfs:label ?w . ?a schema:about ?i ; schema:isPartOf <https://en.wikipedia.org/> . '
            '?i rdfs:label ?l . FILTER(LANG(?l)="vi") }' % vals)


def run(query, tries=4):
    for i in range(tries):
        try:
            req = urllib.request.Request(WDQS, data=urllib.parse.urlencode({'query': query}).encode(), headers={'User-Agent': 'LexkiteContentCI/1.0', 'Accept': 'text/csv'})
            text = urllib.request.urlopen(req, timeout=70).read().decode()
            if 'TimeoutException' in text: raise RuntimeError('timeout')
            return list(csv.DictReader(io.StringIO(text)))
        except Exception as e:
            print('thử lại', repr(e)[:70], file=sys.stderr); time.sleep(8 * (i + 1))
    return None


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--words'); ap.add_argument('--cands'); ap.add_argument('--first'); ap.add_argument('--out', required=True); ap.add_argument('--merge'); ap.add_argument('--limit', type=int, default=0)
    a = ap.parse_args()
    ok = lambda w: re.fullmatch(r"[a-z][a-z' -]{1,30}", w)
    if a.words: ws = sorted({l.strip().lower() for l in open(a.words, encoding='utf8') if ok(l.strip().lower())})
    else:  # candidates.json (pick_words.py): danh từ; mục retry (--first) lên đầu rồi theo thứ tự tần suất
        ws = []
        for k in (json.load(open(a.first, encoding='utf8')).get('items', []) if a.first and __import__('os').path.exists(a.first) else []):
            w, _, p = str(k).partition('#')
            if p == 'n': ws.append(w.lower())
        ws += [e['w'].lower() for e in json.load(open(a.cands, encoding='utf8'))['items'] if e.get('pos') == 'n']
        ws = list(dict.fromkeys(w for w in ws if ok(w)))
    if a.limit: ws = ws[:a.limit]
    out = json.load(open(a.merge, encoding='utf8')) if a.merge and __import__('os').path.exists(a.merge) else {}
    new = hit = 0
    for k in range(0, len(ws), B):
        ch = ws[k:k + B]; rows = run(q(ch))
        if rows is None: print('bỏ lô', k, file=sys.stderr); continue
        got = {}
        for r in rows:
            w, l = r['w'].lower(), r['l'].strip()
            if good_label(l, {w}): got.setdefault(w, set()).add(l.lower())
        for w, v in got.items():
            key = w + '#n'; hit += 1
            if key not in out: new += 1
            out[key] = sorted(set(out.get(key, [])) | v)
        time.sleep(1)
    json.dump(dict(sorted(out.items())), open(a.out, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
    print(f'wikidata-vi-labels: {len(ws)} từ hỏi → {hit} có nhãn vi, {new} khoá mới (tổng {len(out)})')


if __name__ == '__main__': main()
