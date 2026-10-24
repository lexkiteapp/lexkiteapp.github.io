#!/usr/bin/env python3
"""Hiệu chỉnh ngưỡng giám khảo cục bộ (local_judge.py) trên tập GÁN NHÃN content/lexicon/vimg-labels.json
({"<lượt>/<slug>.a<N>": "ok"|"bad"} – nhãn thị giác của chủ + Claude, 24/10; ảnh lấy từ artifact các lượt vocab-img).
Mục tiêu: độ chính xác ≥ 98 % trên ảnh ĐƯỢC NHẬN (chấp nhận recall thấp). Ghi content/lexicon/vimg-judge.json {th, centroid, cal}.
  python3 scripts/vocab-img/calibrate.py --img <lượt>=<thư mục raw> [...] [--write]
"""
import argparse, json, os, itertools, re
import numpy as np
from PIL import Image
import local_judge as LJ

ROOT = LJ.ROOT
def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--img', action='append', default=[]); ap.add_argument('--write', action='store_true'); ap.add_argument('--target', type=float, default=0.98)
    a = ap.parse_args()
    labels = json.load(open(os.path.join(ROOT, 'content/lexicon/vimg-labels.json')))['items']
    LEX = json.load(open(os.path.join(ROOT, 'dist/lexicon.json'))); cards = json.load(open(os.path.join(ROOT, 'content/lexicon/vimg-cards.json')))['items']
    dirs = dict(x.split('=', 1) for x in a.img)
    slug2k = {re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__')): k for k in LEX}
    sets = {}
    for k, e in LEX.items():
        for s in e.get('sets') or []: sets.setdefault(s, []).append(k)
    T, rows = {}, []
    for lid, lab in labels.items():
        run, base = lid.split('/', 1); sl = base.rsplit('.a', 1)[0]; k = slug2k.get(sl)
        f = os.path.join(dirs.get(run, ''), base + '.jpg')
        if not k or not os.path.exists(f): continue
        e = LEX[k]; c = cards.get(k) or {}
        sib = sorted({x for s in e.get('sets') or [] for x in sets.get(s, []) if x != k and x.split('#')[0] != e['w']}, key=lambda x: LJ.fnv(k + x))[:12]
        T[k] = {'kind': 'object', 'target': f"an illustration of {e['w']}: {(e.get('def') or '')[:120]}", 'caption_ref': [e['w'], *(c.get('s') or []), e.get('def') or ''], 'sib': sib}
        rows.append((lid, k, f, lab == 'ok'))
    keys_all = [k for k in LEX if LEX[k].get('def')]
    feats, vecs = [], []
    for lid, k, f, ok in rows:
        ft = LJ.features(Image.open(f).convert('RGB'), k, T[k], T, LEX, keys_all, None); vecs.append(ft.pop('_v')); feats.append((lid, ok, ft))
        print(lid, 'ok' if ok else 'BAD', ft['clip_rank'], ft['clip_margin'], ft['cap_rank'], ft['cap_sim'], len(ft['ocr']), ft['nsfw'], '·', ft['cap'][:60], flush=True)
    V = np.stack(vecs); okm = np.array([o for _, o, _ in feats]); cen = V[okm].mean(0); cen /= np.linalg.norm(cen)
    style = V @ cen
    for i, (_, _, ft) in enumerate(feats): ft['style'] = float(style[i])
    grid = dict(clip_margin=[0, .005, .01, .02, .03, .04, .06], cap_sim=[.3, .35, .4, .45, .5, .55, .6, .65], cap_margin=[0, .02, .05, .08, .12],
                ocr_max=[0, 1, 2], style_min=[0, .6, .65, .7, .75, .8])
    best = None; P = int(okm.sum())
    for vals in itertools.product(*grid.values()):
        th = {**LJ.DEF_TH, **dict(zip(grid.keys(), vals)), 'api': False}   # ngưỡng cục bộ hiệu chỉnh riêng; giám khảo API báo cáo riêng bên dưới
        acc = [ok for _, ok, ft in feats if not LJ.verdict(ft, th, 'object')]
        if len(acc) < 10: continue
        prec, rec = sum(acc) / len(acc), sum(acc) / max(P, 1)
        key = (prec >= a.target, rec if prec >= a.target else prec, -sum(vals))
        if best is None or key > best[0]: best = (key, th, prec, rec, len(acc))
    _, th, prec, rec, n_acc = best
    # chỉ số từng kiểm riêng (để báo cáo): CLIP-only, caption-only
    def only(fn): acc = [ok for _, ok, ft in feats if fn(ft)]; return {'n': len(acc), 'prec': round(sum(acc) / max(len(acc), 1), 3)}
    cal = {'at': os.environ.get('GITHUB_RUN_ID', 'local'), 'labelled': len(feats), 'ok': P, 'bad': len(feats) - P, 'accepted': n_acc, 'precision': round(prec, 4), 'recall': round(rec, 4),
           'meets_target': prec >= a.target, 'clip_only': only(lambda f: f['clip_rank'] == 1 and f['clip_margin'] >= th['clip_margin']),
           'caption_only': only(lambda f: f['cap_rank'] == 1 and f['cap_sim'] >= th['cap_sim']),
           'false_accepts': [lid for lid, ok, ft in feats if not ok and not LJ.verdict(ft, th, 'object')]}
    th['api'] = True
    apis = [(ok, ft) for _, ok, ft in feats if ft.get('api_rank') is not None]
    cal['api'] = {'answered': len(apis), 'rank1_prec': round(sum(ok for ok, ft in apis if ft['api_rank'] == 1) / max(1, sum(1 for ok, ft in apis if ft['api_rank'] == 1)), 3),
                  'both_prec': only(lambda f: f.get('api_rank') == 1 and not LJ.verdict(f, {**th, 'api': False}, 'object'))}
    print('NGƯỠNG', json.dumps(th), '\nHIỆU CHỈNH', json.dumps(cal))
    out = {'_note': 'Ngưỡng giám khảo cục bộ (scripts/vocab-img/local_judge.py), do calibrate.py sinh – không sửa tay. centroid = tâm phong cách s1 (CLIP ViT-B-32, ảnh nhãn ok).',
           'model': {'clip': 'ViT-B-32/laion2b_s34b_b79k', 'captioner': os.environ.get('VIMG_CAPTIONER', 'smolvlm') , 'text': 'all-MiniLM-L6-v2', 'nsfw': 'Falconsai/nsfw_image_detection', 'ocr': 'tesseract'},
           'th': th, 'cal': cal, 'centroid': [round(float(x), 5) for x in cen]}
    json.dump({**out, 'features': {lid: {**ft, 'ok': ok} for lid, ok, ft in feats}}, open('calibration.json', 'w'), indent=1)
    if a.write: json.dump(out, open(LJ.TH_FILE, 'w'), indent=1)

if __name__ == '__main__':
    main()
