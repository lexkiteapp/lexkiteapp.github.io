#!/usr/bin/env python3
"""bg_gates.py - automatic acceptance gates for news backgrounds (BG LIBRARY 3, owner 22/10; docs/VIDEO-QC.md row "Ảnh nền"). 0 credits, CPU on CI.

  calib  --bg <dir of accepted 9:16 png> --out calib.json      measure every gate on the accepted set -> thresholds
  shard  --manifest m.json --calib c.json --out <dir> --shard i/n   per image: download, OCR, people/animals, sharpness/exposure,
                                                                     Real-ESRGAN x4 (animevideov3) of the two 9:16 host crops, zones+depth per crop, CLIP + pHash
  merge  --res <dir> --store emb.json --calib c.json --out <dir>     dedupe (CLIP cos > 0.92 same location, pHash) + style centroid -> verdicts.json

Models (commercial-safe): open_clip ViT-B-32 'openai' (MIT), OWL-ViT google/owlvit-base-patch32 (Apache-2.0), Mask2Former swin-small ADE (MIT, via bg_zones.py),
Depth-Anything-V2-Small (Apache-2.0), Real-ESRGAN realesr-animevideov3 weights (BSD-3) via spandrel (MIT), RapidOCR (Apache-2.0), imagehash (BSD-2).
Wide master 2720x1536 (kling-image-v3 2K 16:9): Ama = LEFT 9:16 crop, Carlos = RIGHT 9:16 crop of the SAME image (crop 864x1536 -> x4 -> 1350x2400 = 1.25x push-in room at 1080x1920).
"""
import argparse, json, os, re, sys, urllib.request
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bg_zones as BZ

WATER = {'water', 'sea', 'river', 'lake', 'swimming pool', 'fountain', 'waterfall'}
TOP = {'table', 'desk', 'countertop', 'kitchen island', 'pool table', 'coffee table', 'bed', 'sofa', 'bathtub'}
HOST = (0.25, 0.68, 0.75, 1.0)            # where a waist-up host's lower body sits inside a 9:16 crop (x0,y0,x1,y1)
CROP_C = 0.32                              # crop centres at 32 % / 68 % of the width (eye check 22/10: 3 %-edge crops were full of edge props)
OUTW, OUTH = 1350, 2400
Q_PEOPLE = ['a person', 'a human face', 'a human hand', 'a silhouette of a person', 'a child']
Q_ANIMAL = ['an animal', 'a dog', 'a cat', 'a bird', 'a fish']
DEF = dict(cos_same=0.92, cos_any=0.97, horizon=[0.35, 0.45])

class M:   # lazy models
    _ = {}
    @classmethod
    def get(c, k):
        if k in c._: return c._[k]
        import torch; torch.set_num_threads(int(os.environ.get('BG_THREADS', '4')))
        if k == 'ocr':
            from rapidocr_onnxruntime import RapidOCR; v = RapidOCR()
        elif k == 'owl':
            from transformers import OwlViTProcessor, OwlViTForObjectDetection
            v = (OwlViTProcessor.from_pretrained('google/owlvit-base-patch32'), OwlViTForObjectDetection.from_pretrained('google/owlvit-base-patch32').eval())
        elif k == 'clip':
            import open_clip; m, _, pre = open_clip.create_model_and_transforms('ViT-B-32', pretrained='openai'); v = (m.eval(), pre)
        elif k == 'seg':
            from transformers import AutoImageProcessor, Mask2FormerForUniversalSegmentation
            n = 'facebook/mask2former-swin-small-ade-semantic'; v = (AutoImageProcessor.from_pretrained(n), Mask2FormerForUniversalSegmentation.from_pretrained(n).eval())
        elif k == 'depth':
            from transformers import pipeline; v = pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf', device='cpu')
        elif k == 'sr':
            from spandrel import ModelLoader; p = os.environ.get('BG_SR', 'realesr-animevideov3.pth'); v = ModelLoader().load_from_file(p).model.eval()
        c._[k] = v; return v

def ocr(im):
    a = np.array(im.convert('RGB'))[:, :, ::-1]; res, _ = M.get('ocr')(a)
    return [(r[1], round(float(r[2]), 2)) for r in (res or []) if float(r[2]) >= 0.6 and len(re.sub(r'[^A-Za-z0-9]', '', r[1])) >= 3]

def owl(im):
    import torch; p, m = M.get('owl'); q = Q_PEOPLE + Q_ANIMAL
    with torch.no_grad():
        o = m(**p(text=[q], images=im.convert('RGB'), return_tensors='pt'))
    lg = o.logits[0].sigmoid().max(0).values.numpy()   # max over boxes per query
    return dict(person=round(float(lg[:len(Q_PEOPLE)].max()), 4), animal=round(float(lg[len(Q_PEOPLE):].max()), 4))

def letterbox(im, s=224):
    w, h = im.size; k = s / max(w, h); im = im.resize((max(1, int(w * k)), max(1, int(h * k))), Image.BICUBIC)
    c = Image.new('RGB', (s, s), (128, 128, 128)); c.paste(im, ((s - im.size[0]) // 2, (s - im.size[1]) // 2)); return c

def clip_emb(im):
    import torch; m, pre = M.get('clip')
    with torch.no_grad():
        e = m.encode_image(pre(letterbox(im.convert('RGB'))).unsqueeze(0))[0].numpy()
    return e / np.linalg.norm(e)

def phash(im):
    import imagehash; return str(imagehash.phash(im.convert('L'), hash_size=8))

def sharp_expo(im):
    g = np.array(im.convert('L').resize((1080, 1920) if im.size[1] > im.size[0] else (1920, 1080), Image.LANCZOS)).astype(np.float32)
    gm = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)).ravel(); acu = float(np.partition(gm, -3000)[-3000:].mean()) / max(60.0, float(np.percentile(g, 99.5) - np.percentile(g, 0.5))) * 100   # / dynamic range: night scenes are low-contrast, not soft   # edge acuity: mean of the 3000 strongest gradients (flat art: sparse-scene safe, drops when blurry)
    return dict(lap=round(float(cv2.Laplacian(g, cv2.CV_32F).var()), 1), acu=round(acu, 1), L=round(float(g.mean()), 1), clip_frac=round(float(((g < 8) | (g > 247)).mean()), 4))

def upscale(crop):
    import torch; m = M.get('sr'); t = torch.from_numpy(np.array(crop.convert('RGB'))).permute(2, 0, 1).float().div(255).unsqueeze(0)
    with torch.no_grad():
        y = m(t)[0].clamp(0, 1).permute(1, 2, 0).numpy()
    return Image.fromarray((y * 255 + 0.5).astype(np.uint8)).resize((OUTW, OUTH), Image.LANCZOS)

def seg_master(im):
    """Mask2Former on the whole WIDE image (more context than a narrow crop: crops sometimes lost the floor label entirely - chunk1/2 22/10)"""
    import torch; proc, seg = M.get('seg'); names = seg.config.id2label; sm = im.resize((1088, 614))
    with torch.no_grad():
        out = seg(**proc(images=sm, return_tensors='pt'))
    lab = proc.post_process_semantic_segmentation(out, target_sizes=[(614, 1088)])[0].numpy()
    cls = {int(k): names[int(k)].split(',')[0].strip().lower() for k in np.unique(lab)}
    sel = lambda S: np.isin(lab, [k for k, n in cls.items() if n in S])
    return dict(floor=sel(BZ.FLOOR), water=sel(WATER), top=sel(TOP), sx=1088 / im.size[0], sy=614 / im.size[1])

def host_box(sm, x, y0, cw, hc, o):
    """host zone of the FINAL 1080x1920 frame (window o inside the 1350x2400 upscaled crop) mapped back onto the master segmentation"""
    k = hc / OUTH; bx0 = x + (135 + HOST[0] * 1080) * k; bx1 = x + (135 + HOST[2] * 1080) * k; by0 = y0 + (o + HOST[1] * 1920) * k; by1 = y0 + (o + HOST[3] * 1920) * k
    X0, X1, Y0, Y1 = int(bx0 * sm['sx']), int(bx1 * sm['sx']), int(by0 * sm['sy']), int(by1 * sm['sy'])
    f = lambda m: round(float(m[Y0:Y1, X0:X1].mean()), 4)
    return dict(host_floor=f(sm['floor']), host_water=f(sm['water']), host_top=f(sm['top']))

def zones(im, cid):
    """bg_zones-format annotation of one 9:16 crop + host-zone checks (water / tabletop / floor under the host)."""
    import torch; proc, seg = M.get('seg'); names = seg.config.id2label
    W, H = im.size; sm = im.resize((540, 960))
    with torch.no_grad():
        out = seg(**proc(images=sm, return_tensors='pt'))
    lab = proc.post_process_semantic_segmentation(out, target_sizes=[(960, 540)])[0].numpy()
    d = M.get('depth')(im.resize((675, 1200)))['predicted_depth'].squeeze().float().numpy(); d = (d - d.min()) / (d.max() - d.min() + 1e-6); d = cv2.resize(d, (540, 960))
    cls = {int(k): names[int(k)].split(',')[0].strip().lower() for k in np.unique(lab)}
    sel = lambda S: np.isin(lab, [k for k, n in cls.items() if n in S])
    floor, forbid, water, top = sel(BZ.FLOOR), sel(BZ.FORBID), sel(WATER), sel(TOP)
    near = forbid & (d >= np.quantile(d, 0.80)); gF, gX, gN = BZ.grid(floor), BZ.grid(forbid), BZ.grid(near)
    c0, c1 = int(BZ.GW * 0.2), int(BZ.GW * 0.8); rows = np.nonzero(gF[:, c0:c1].mean(1) >= 0.2)[0]; ftop = float(rows.min() / BZ.GH) if len(rows) else 1.0
    dc = d[:, 108:432]; far = dc <= np.quantile(dc, 0.03)
    vp = BZ.vanish(cv2.cvtColor(np.array(sm.resize((540, 960))), cv2.COLOR_RGB2BGR)); hsrc = 'vanishing point'
    if vp and vp[1] >= 6 and 0.2 < vp[0] < 0.8: hz = vp[0]
    else: hz = float(min(np.median(np.nonzero(far)[0]) / 960, ftop)); hsrc = 'depth'
    x0, y0, x1, y1 = [int(v * s) for v, s in zip(HOST, (540, 960, 540, 960))]; hz_ = lambda m: round(float(m[y0:y1, x0:x1].mean()), 4)
    frac = {n: round(float((lab == k).mean()), 4) for k, n in cls.items() if (lab == k).mean() >= 0.01}
    Z = dict(v=BZ.VER, id=cid, size=[W, H], horizon=round(hz, 4), horizon_src=hsrc, floor_top=round(ftop, 4), floor_frac=round(float(floor.mean()), 4),
             valid=bool(floor.mean() >= 0.03), classes=frac, host_zone=HOST, host_water=hz_(water), host_top=hz_(top), host_floor=hz_(floor),
             grid=dict(w=BZ.GW, h=BZ.GH, rows=[''.join('N' if gN[y, x] else 'X' if gX[y, x] else 'F' if gF[y, x] else '.' for x in range(BZ.GW)) for y in range(BZ.GH)]),
             model='mask2former-swin-small-ade-semantic + depth-anything-v2-small (bg_gates crop)')
    return Z, (d * 65535).astype(np.uint16)

def measure(im, cid, crops=True):
    """all per-image metrics; wide image -> L/R crops (upscaled), 9:16 image (calib) -> itself as the only crop"""
    r = dict(id=cid, size=list(im.size), text=ocr(im), **owl(im), **{f'm_{k}': v for k, v in sharp_expo(im).items()})
    e = clip_emb(im); r['phash'] = phash(im); r['_emb'] = [round(float(x), 5) for x in e]
    W, H = im.size; out = {}
    if crops and W > H:
        vp = BZ.vanish(cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)); r['hz_master'] = round(vp[0], 4) if vp and vp[1] >= 6 and 0.2 < vp[0] < 0.8 else None   # same sanity range as bg_zones
        r['hz_votes'] = vp[1] if vp else 0
        g = fit_crop(r['hz_master'], H); r['crop'] = g
        if g is None: g = dict(hc=H, y0=0, o=0)
        hc, y0 = g['hc'], g['y0']; cw = round(hc * 9 / 16); SM = seg_master(im)
        for side, x in (('L', round(W * CROP_C - cw / 2)), ('R', round(W * (1 - CROP_C) - cw / 2))):   # hosts stand on the open floor left/right of centre, not at the prop-filled edges
            c = im.crop((x, y0, x + cw, y0 + hc)); u = upscale(c); z, dp = zones(u, f'{cid}_{side}')
            bic = c.resize((OUTW, OUTH), Image.BICUBIC)
            hz = r['hz_master'] if r['hz_master'] is not None else z['horizon']; z['horizon'] = hz; z['horizon_src'] = 'master vanishing point' if r['hz_master'] is not None else z['horizon_src']
            hzc = (hz * H - y0) / hc   # horizon inside this crop
            z['y_window'] = int(min(OUTH - 1920, max(0, round(OUTH * hzc - 0.40 * 1920))))   # 1080x1920 window offset (in the 1350x2400 crop) that puts the horizon at 40 %
            z['final_horizon'] = round((OUTH * hzc - z['y_window']) / 1920, 4); z['crop_box'] = [x, y0, cw, hc]
            hb = host_box(SM, x, y0, cw, hc, z['y_window']); z['host_crop'] = {k: z[k] for k in ('host_floor', 'host_water', 'host_top')}; z.update(hb); z['host_src'] = 'master segmentation, final-frame host zone'
            r[side] = dict(x=x, w=cw, y=y0, h=hc, y_window=z['y_window'], final_horizon=z['final_horizon'], **{k: z[k] for k in ('horizon', 'horizon_src', 'floor_frac', 'valid', 'host_water', 'host_top', 'host_floor')},
                           lap=sharp_expo(u)['lap'], acu=sharp_expo(u)['acu'], lap_bicubic=sharp_expo(bic)['lap'], text=ocr(u), **{f'owl_{k}': v for k, v in owl(u).items()})
            out[side] = (u, z, dp)
    else:
        z, dp = zones(im, cid); r['S'] = {k: z[k] for k in ('horizon', 'horizon_src', 'floor_frac', 'valid', 'host_water', 'host_top', 'host_floor')}; r['S']['lap'] = r['m_lap']; r['S']['acu'] = r['m_acu']
    return r, e, out

def fit_crop(hz, H, lo=0.36, hi=0.44, hmin=1000):
    """largest 9:16 crop height hc (<= H, >= hmin) + top y0 + window offset o so the FINAL 1080x1920 frame has the horizon in [lo, hi]
    (pilot 22/10: Kling puts the vanishing point at 0.55-0.69 despite the prompt -> crop the ceiling instead of rejecting). None = impossible."""
    if hz is None: return None
    for hc in range(H, hmin - 1, -8):
        for y0 in range(0, H - hc + 1, 8):
            hzc = (hz * H - y0) / hc
            o = min(OUTH - 1920, max(0, round(OUTH * hzc - 0.40 * 1920))); f = (OUTH * hzc - o) / 1920
            if lo <= f <= hi: return dict(hc=hc, y0=y0, o=o, f=round(f, 4))
    return None

def pct(a, q): return round(float(np.percentile(np.array(a, dtype=float), q)), 4)

def calib(a):
    fs = sorted(f for f in os.listdir(a.bg) if f.endswith('.png')); R, E = [], []
    for f in fs:
        r, e, _ = measure(Image.open(f'{a.bg}/{f}').convert('RGB'), f[:-4], crops=False); R.append(r); E.append(e); print(f, r['person'], r['animal'], r['S']['horizon'], r['m_lap'], flush=True)
    E = np.array(E); cen = E.mean(0); cen /= np.linalg.norm(cen); sty = E @ cen; S = E @ E.T; np.fill_diagonal(S, -1)
    import imagehash; H = [imagehash.hex_to_hash(r['phash']) for r in R]; hd = [min(H[i] - H[j] for j in range(len(H)) if j != i) for i in range(len(H))]
    pos = []
    for u in (a.pos or '').split(','):
        if not u: continue
        p = Image.open(urllib.request.urlopen(u)).convert('RGBA'); g = np.array(p).astype(int); key = (g[:, :, 1] > 140) & (g[:, :, 1] > g[:, :, 0] + 40) & (g[:, :, 1] > g[:, :, 2] + 40)
        g[key, 3] = 0; p = Image.fromarray(g.astype(np.uint8)); bg = Image.open(f'{a.bg}/{fs[0]}').convert('RGB')
        for s in (1.0, 0.45, 0.2):   # full ref on bg, medium, small figure -> must all be caught
            b = bg.copy(); q = p.resize((int(bg.size[0] * s), int(bg.size[0] * s * p.size[1] / p.size[0]))); b.paste(q, ((bg.size[0] - q.size[0]) // 2, bg.size[1] - q.size[1]), q); pos.append(owl(b))
    neg_p, neg_a = [r['person'] for r in R], [r['animal'] for r in R]
    thr_p = round(max(neg_p) + 0.02, 3); thr_a = round(max(neg_a) + 0.02, 3)
    th = dict(DEF, person=thr_p, animal=thr_a, style_min=round(float(np.percentile(sty, 2)) - 0.02, 4), phash_max=max(4, min(hd) - 2),
              lap_min=round(pct([r['m_lap'] for r in R], 5) * 0.8, 1), acu_min=round(pct([r['m_acu'] for r in R], 5) * 0.85, 1), L_min=max(35, round(min(r['m_L'] for r in R) - 10)), L_max=min(225, round(max(r['m_L'] for r in R) + 10)),
              clip_frac_max=0.15, host_water_max=0.01, host_top_max=0.12, host_floor_min=0.25)
    rep = dict(n=len(R), thresholds=th, centroid=[round(float(x), 5) for x in cen],
               dist=dict(person=[pct(neg_p, 50), max(neg_p)], animal=[pct(neg_a, 50), max(neg_a)], pos_person=[p['person'] for p in pos], style=[pct(sty, 2), pct(sty, 50)],
                         cos_nn_max=round(float(S.max()), 4), cos_nn_p50=pct(S.max(1), 50), phash_nn_min=int(min(hd)), lap=[pct([r['m_lap'] for r in R], q) for q in (5, 50)], acu=[pct([r['m_acu'] for r in R], q) for q in (0, 5, 50)],
                         L=[min(r['m_L'] for r in R), max(r['m_L'] for r in R)], horizon=[pct([r['S']['horizon'] for r in R], q) for q in (10, 50, 90)],
                         horizon_in_35_45=sum(0.35 <= r['S']['horizon'] <= 0.45 for r in R), host_top=[pct([r['S']['host_top'] for r in R], q) for q in (50, 90)],
                         host_floor=[pct([r['S']['host_floor'] for r in R], q) for q in (10, 50)], text_flag=[r['id'] for r in R if r['text']]),
               items=[{k: v for k, v in r.items() if k != '_emb'} for r in R])
    rep['store'] = {r['id']: dict(loc=r['id'], cat='legacy916', clip=r['_emb'], phash=r['phash']) for r in R}
    rep['pos_all_caught'] = all(p['person'] >= thr_p for p in pos) if pos else None
    os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True); json.dump(rep, open(a.out, 'w')); print(json.dumps(rep['dist']), json.dumps(th), 'pos_all_caught', rep['pos_all_caught'])

def shard(a):
    man = json.load(open(a.manifest)); i, n = map(int, a.shard.split('/')); C = json.load(open(a.calib))['thresholds']
    os.makedirs(a.out, exist_ok=True)
    for k, it in enumerate(man['items']):
        if k % n != i: continue
        d = f"{a.out}/{it['id']}"; os.makedirs(d, exist_ok=True)
        try:
            urllib.request.urlretrieve(it['url'], f'{d}/_src.png'); im = Image.open(f'{d}/_src.png').convert('RGB')
            r, e, out = measure(im, it['id'])
        except Exception as ex:
            json.dump(dict(id=it['id'], error=repr(ex)[:300]), open(f'{d}/res.json', 'w')); print('ERR', it['id'], ex, flush=True); continue
        f = []
        if r['size'][0] < 2560 or abs(r['size'][0] / r['size'][1] - 16 / 9) > 0.02: f.append('size')
        if r['text'] or any(r[s]['text'] for s in 'LR'): f.append('ocr')
        if max(r['person'], r['L']['owl_person'], r['R']['owl_person']) >= C['person']: f.append('person')
        if max(r['animal'], r['L']['owl_animal'], r['R']['owl_animal']) >= max(C['animal'], C.get('animal_min', 0.15)): f.append('animal')
        if r['m_L'] < C['L_min'] or r['m_L'] > C['L_max'] or r['m_clip_frac'] > C['clip_frac_max']: f.append('exposure')
        if r['m_acu'] < C['acu_min']: f.append('soft_master')   # (Laplacian variance penalised sparse flat scenes - pilot 22/10)
        for s in 'LR':
            z = r[s]
            if z['host_floor'] < C['host_floor_min']: f.append(f'nofloor_{s}')   # master-seg floor under the host in the final frame
            if not (C['horizon'][0] - 0.01 <= z['final_horizon'] <= C['horizon'][1] + 0.01): f.append(f'horizon_{s}')   # VP bins are 1/24 = 0.042
            if z['host_water'] > C['host_water_max']: f.append(f'water_{s}')
            if z['host_top'] > C['host_top_max']: f.append(f'tabletop_{s}')
            if z['acu'] < C['acu_min']: f.append(f'soft_{s}')   # (ESRGAN smooths flat art below bicubic's jaggy Laplacian -> no bicubic comparison)
        r['fail'] = f; r.update({k: it[k] for k in ('loc', 'cat', 'variant') if k in it})
        im.resize((640, 360)).save(f'{d}/thumb.jpg', quality=85)
        if not f:
            im.save(f'{d}/master.webp', quality=95, method=5)
            for s, (u, z, dp) in out.items():
                u.save(f'{d}/{s}.webp', quality=93, method=5); json.dump(z, open(f'{d}/{s}.zones.json', 'w')); cv2.imwrite(f'{d}/{s}.depth.png', dp)
        os.remove(f'{d}/_src.png'); json.dump(r, open(f'{d}/res.json', 'w')); print(it['id'], 'PASS' if not f else f, flush=True)

def merge(a):
    C = json.load(open(a.calib)); T = C['thresholds']; cen = np.array(C['centroid']); store = json.load(open(a.store)) if os.path.exists(a.store) else {}
    store = {**C.get('store', {}), **store}
    import imagehash
    ids = sorted(os.listdir(a.res)); order = json.load(open(a.manifest))['items'] if a.manifest else [{'id': i} for i in ids]
    V, new = [], {}
    for it in order:
        p = f"{a.res}/{it['id']}/res.json"
        if not os.path.exists(p): V.append(dict(id=it['id'], fail=['missing'])); continue
        r = json.load(open(p))
        if 'error' in r: V.append(dict(id=r['id'], fail=['error'], error=r['error'])); continue
        e = np.array(r['_emb']); f = list(r['fail']); sty = float(e @ cen); h = imagehash.hex_to_hash(r['phash'])
        if sty < T['style_min']: f.append('style')
        ref = {**store, **new}; dup = None
        for k, s in ref.items():
            c = float(e @ np.array(s['clip'])); hd = h - imagehash.hex_to_hash(s['phash'])
            if (s['loc'] == r.get('loc') and c > T['cos_same']) or c > T['cos_any'] or hd <= T['phash_max']: dup = (k, round(c, 4), int(hd)); break
        if dup: f.append('dup')
        v = dict(id=r['id'], loc=r.get('loc'), cat=r.get('cat'), variant=r.get('variant'), fail=f, style=round(sty, 4), dup=dup,
                 person=max(r['person'], r['L']['owl_person'], r['R']['owl_person']), L=r['L'], R=r['R'], lap=r['m_lap'], Lm=r['m_L'])
        V.append(v)
        if not f: new[r['id']] = dict(loc=r.get('loc'), cat=r.get('cat'), clip=r['_emb'], phash=r['phash'])
    os.makedirs(a.out, exist_ok=True); json.dump(dict(verdicts=V, store_add=new), open(f'{a.out}/verdicts.json', 'w'))
    from collections import Counter
    rc = Counter(x.split('_')[0] for v in V for x in v['fail']); print('pass', sum(not v['fail'] for v in V), 'of', len(V), dict(rc.most_common()))
    if not V: sys.exit('no results')

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('mode'); [ap.add_argument(f'--{k}') for k in ('bg', 'out', 'pos', 'manifest', 'calib', 'shard', 'res', 'store')]
    a = ap.parse_args(); dict(calib=calib, shard=shard, merge=merge)[a.mode](a)
