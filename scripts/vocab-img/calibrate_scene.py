#!/usr/bin/env python3
"""Hiệu chỉnh giám khảo ẢNH CẢNH / bìa chủ đề / bài học (khác ảnh vật: so với CÂU VÍ DỤ / tình huống, không với gloss).
Đầu vào: đặc trưng local_judge.py (judge.local.a<N>.json – CLIP↔câu, chú thích↔câu, GrabCast thị giác có/không) + nhãn tay
content/lexicon/vimg-labels-scene.json {"<lượt>/<slug>.a<N>": {"l": "ok"|"bad", "why": "…"}}. Chỉ numpy – chạy được trên máy, không cần mô hình.
Mục tiêu: độ chính xác ≥ 98 % VÀ recall ≥ 50 %. Ghi content/lexicon/vimg-judge-scene.json {th, cal, curve}.
  python3 scripts/vocab-img/calibrate_scene.py --feat p1=<dir có judge.local.a*.json> --feat p2=<dir> [--write]
"""
import argparse, json, os, re, itertools, random

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
slug = lambda k: re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__'))
GRID = dict(ask_conf=[0, 60, 70, 80, 90], ocr_max=[0, 1, 2, 99], clip_ex_rank_max=[1, 2, 3, 99], clip_ex_margin=[-1, -.02, 0, .01, .02],
            cap_ex_min=[-1, .2, .3, .4, .5], clip_ex_min=[-1, .2, .22, .24, .26, .28])

def accept(f, th):
    if f.get('ask_yes') is not True or f.get('ask_conf', 0) < th['ask_conf'] or f.get('ask_text'): return False
    if len(f.get('ocr') or []) > th['ocr_max'] or f.get('nsfw', 0) >= .2: return False
    if f.get('clip_ex_rank', 99) > th['clip_ex_rank_max'] or f.get('clip_ex_margin', -1) < th['clip_ex_margin']: return False
    return f.get('cap_ex', -1) >= th['cap_ex_min'] and f.get('clip_ex', -1) >= th['clip_ex_min']

def search(rows, target):
    P = sum(ok for _, ok, _ in rows); pts = []
    for vals in itertools.product(*GRID.values()):
        th = dict(zip(GRID, vals)); acc = [ok for _, ok, f in rows if accept(f, th)]
        if len(acc) < 5: continue
        pts.append((sum(acc) / len(acc), sum(acc) / max(P, 1), len(acc), th))
    ok = [p for p in pts if p[0] >= target]
    # chọn: recall cao nhất; hoà → ngưỡng LỎNG ít nhất (bền hơn khi ra ngoài tập nhãn) = tổng hạng ngưỡng cao hơn
    strict = lambda th: sum(GRID[k].index(v) for k, v in th.items() if k not in ('ocr_max', 'clip_ex_rank_max')) - GRID['ocr_max'].index(th['ocr_max']) - GRID['clip_ex_rank_max'].index(th['clip_ex_rank_max'])
    best = max(ok, key=lambda p: (round(p[1], 3), strict(p[3]))) if ok else max(pts, key=lambda p: (p[0], p[1]))
    return best, pts

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--feat', action='append', default=[]); ap.add_argument('--write', action='store_true'); ap.add_argument('--target', type=float, default=.98)
    a = ap.parse_args()
    lab = json.load(open(os.path.join(ROOT, 'content/lexicon/vimg-labels-scene.json')))['items']
    F = {}
    for spec in a.feat:
        run, d = spec.split('=', 1)
        for n in (1, 2):
            p = os.path.join(d, f'judge.local.a{n}.json')
            if os.path.exists(p):
                for k, v in json.load(open(p)).items(): F[f'{run}/{slug(k)}.a{n}'] = (k, v.get('kind'), v['f'])
    rows = [(lid, lab[lid]['l'] == 'ok', F[lid][2]) for lid in lab if lid in F and F[lid][1] != 'object']
    miss = [lid for lid in lab if lid not in F]
    P = sum(ok for _, ok, _ in rows)
    print(f'nhãn {len(lab)} · có đặc trưng {len(rows)} (ok {P}, bad {len(rows) - P}) · thiếu {len(miss)}')
    # từng tín hiệu riêng
    def single(name, fn):
        acc = [ok for _, ok, f in rows if fn(f)]; return {'n': len(acc), 'prec': round(sum(acc) / max(len(acc), 1), 3), 'rec': round(sum(acc) / max(P, 1), 3)}
    sig = {'vision_yes': single('v', lambda f: f.get('ask_yes') is True), 'vision_yes_conf80': single('v', lambda f: f.get('ask_yes') is True and f.get('ask_conf', 0) >= 80),
           'clip_sentence_rank1': single('c', lambda f: f.get('clip_ex_rank') == 1), 'caption_sentence_ge_.4': single('s', lambda f: f.get('cap_ex', 0) >= .4),
           'old_judge_object_signals': single('o', lambda f: f.get('clip_rank') == 1 and f.get('cap_rank') == 1)}
    (prec, rec, n, th), pts = search(rows, a.target)
    # đường cong P/R: biên Pareto (với mỗi mức recall – độ chính xác cao nhất)
    curve = {}
    for p in pts:
        r = round(p[1], 2)
        if r not in curve or p[0] > curve[r][0]: curve[r] = (round(p[0], 4), p[2])
    front, bestp = [], 0
    for r in sorted(curve, reverse=True):
        if curve[r][0] > bestp: front.append({'recall': r, 'precision': curve[r][0], 'accepted': curve[r][1]}); bestp = curve[r][0]
    # kiểm chéo 5 phần theo khoá (chọn ngưỡng trên 4 phần, đo trên phần còn lại) – ước lượng độ chính xác ngoài tập
    keys = sorted({F[l][0] for l, _, _ in rows}); random.Random(7).shuffle(keys); fold = {k: i % 5 for i, k in enumerate(keys)}
    cv_tp = cv_acc = 0
    for i in range(5):
        tr = [r for r in rows if fold[F[r[0]][0]] != i]; te = [r for r in rows if fold[F[r[0]][0]] == i]
        (_, _, _, t2), _ = search(tr, a.target); acc = [ok for _, ok, f in te if accept(f, t2)]; cv_tp += sum(acc); cv_acc += len(acc)
    fa = [lid for lid, ok, f in rows if not ok and accept(f, th)]
    by = {}
    for lid, ok, f in rows:
        kd = F[lid][1]; b = by.setdefault(kd, {'n': 0, 'ok': 0, 'acc': 0, 'acc_ok': 0}); b['n'] += 1; b['ok'] += ok
        if accept(f, th): b['acc'] += 1; b['acc_ok'] += ok
    cal = {'labelled': len(rows), 'ok': P, 'accepted': n, 'precision': round(prec, 4), 'recall': round(rec, 4), 'meets_target': prec >= a.target and rec >= .5,
           'cv5_precision': round(cv_tp / max(cv_acc, 1), 4), 'cv5_accepted': cv_acc, 'cv5_recall': round(cv_tp / max(P, 1), 4), 'by_kind': by, 'signals': sig, 'false_accepts': fa}
    print('NGƯỠNG', json.dumps(th)); print('HIỆU CHỈNH', json.dumps(cal)); print('ĐƯỜNG CONG', json.dumps(front))
    out = {'_note': 'Ngưỡng giám khảo ảnh CẢNH/bìa/bài học (local_judge.py verdict_scene), do calibrate_scene.py sinh trên nhãn tay vimg-labels-scene.json – không sửa tay.',
           'th': {**th, 'ask_text_block': True}, 'cal': cal, 'curve': front}
    if a.write: json.dump(out, open(os.path.join(ROOT, 'content/lexicon/vimg-judge-scene.json'), 'w'), indent=1)

if __name__ == '__main__':
    main()
