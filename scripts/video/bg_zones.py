#!/usr/bin/env python3
"""bg_zones.py - annotate news/scene backgrounds ONCE so hosts are placed where a person can logically stand (owner 22/10, docs/VIDEO-SCALE-PLAN.md §11).
0 credits, CPU on CI. Shared by the news pipeline and the footage agent (new backgrounds).

  python3 scripts/video/bg_zones.py <bg_dir> <out_dir> [--depth <dir>] [id,id,...]

For every <bg_dir>/<id>.png (or the ids given) -> <out_dir>/<id>.zones.json (kept if it exists = cache):
  depth      Depth-Anything-V2-Small (re-used from --depth/<id>.depth.png when present; near = bright)
  semantics  Mask2Former Swin-S ADE20K (facebook/mask2former-swin-small-ade-semantic; Mask2Former code/weights MIT/CC-BY - NOT SegFormer)
  zones      grid 54x96 (row strings): F = standable floor (floor, road, sidewalk, ground, grass, rug, path ...),
             X = forbidden to stand on/in (table, desk, counter, chair, sofa, bed, water, pool, vehicle ...), N = forbidden AND near (depth top 20 %)
  horizon    0..1 of the image height: top edge of the standable floor in the central 60 % (indoor eye-height cameras: ~ the vanishing line);
             fallback = median row of the farthest 5 % depth
  valid      floor_frac >= 0.03 (a background with no standable zone is excluded from host shots)
"""
import json, os, sys, argparse
import numpy as np, cv2

FLOOR = {'floor', 'road', 'sidewalk', 'ground', 'grass', 'rug', 'path', 'field', 'earth', 'sand', 'runway', 'dirt track', 'land', 'stage', 'platform', 'carpet'}
FORBID = {'table', 'desk', 'countertop', 'kitchen island', 'pool table', 'coffee table', 'bed', 'cradle', 'sofa', 'water', 'sea', 'river', 'lake', 'swimming pool',
          'bathtub', 'fountain', 'waterfall', 'car', 'bus', 'truck', 'van', 'boat', 'ship', 'airplane', 'train'}   # v3: surfaces a person could seem to stand ON / IN (chairs, shelves, counters behind a waist-up host are normal)
GW, GH = 54, 96; VER = 4   # v2: horizon = vanishing region (farthest depth), not the floor's far edge

def vanish(img):   # v4: vanishing point of the perspective lines (Hough segments, pairwise intersections, densest cell) = the camera horizon
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY); h, w = g.shape; s = 960 / h; g = cv2.resize(g, (int(w * s), 960))
    e = cv2.Canny(cv2.GaussianBlur(g, (3, 3), 0), 30, 90); L = cv2.HoughLinesP(e, 1, np.pi / 180, 40, minLineLength=40, maxLineGap=10)
    if L is None: return None
    segs = []
    for x1, y1, x2, y2 in L.reshape(-1, 4):
        a = np.degrees(np.arctan2(y2 - y1, x2 - x1)) % 180
        if 12 < a < 78 or 102 < a < 168: segs.append((x1, y1, x2, y2))
    pts = []
    for i in range(len(segs)):
        for j in range(i + 1, len(segs)):
            x1, y1, x2, y2 = segs[i]; x3, y3, x4, y4 = segs[j]; d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)
            if abs(d) < 1e-6: continue
            px = ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d; py = ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d
            if 0 <= px < g.shape[1] and 0 <= py < 960: pts.append((px, py))
    if len(pts) < 8: return None
    P = np.array(pts); H, ye, xe = np.histogram2d(P[:, 1], P[:, 0], bins=(24, 12), range=((0, 960), (0, g.shape[1])))
    k = np.unravel_index(H.argmax(), H.shape); return float((ye[k[0]] + ye[k[0] + 1]) / 2 / 960), int(H.max())

def grid(mask):
    g = cv2.resize(mask.astype(np.float32), (GW, GH), interpolation=cv2.INTER_AREA) > 0.5
    return g

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('bg_dir'); ap.add_argument('out_dir'); ap.add_argument('--depth'); ap.add_argument('ids', nargs='?')
    o = ap.parse_args(); os.makedirs(o.out_dir, exist_ok=True)
    ids = o.ids.split(',') if o.ids else sorted(f[:-4] for f in os.listdir(o.bg_dir) if f.endswith('.png'))
    fresh = lambda i: os.path.exists(f'{o.out_dir}/{i}.zones.json') and json.load(open(f'{o.out_dir}/{i}.zones.json')).get('v', 1) >= VER
    todo = [i for i in ids if not fresh(i) and os.path.exists(f'{o.bg_dir}/{i}.png')]
    print(f'{len(todo)} background(s) to annotate')
    if not todo: return
    import torch; from PIL import Image
    from transformers import AutoImageProcessor, Mask2FormerForUniversalSegmentation, pipeline
    torch.set_num_threads(2)
    proc = AutoImageProcessor.from_pretrained('facebook/mask2former-swin-small-ade-semantic')
    seg = Mask2FormerForUniversalSegmentation.from_pretrained('facebook/mask2former-swin-small-ade-semantic').eval(); names = seg.config.id2label
    dep = None
    for i in todo:
        im = Image.open(f'{o.bg_dir}/{i}.png').convert('RGB'); W, H = im.size; sm = im.resize((W // 2, H // 2))
        with torch.no_grad():
            out = seg(**proc(images=sm, return_tensors='pt'))
        lab = proc.post_process_semantic_segmentation(out, target_sizes=[(H // 2, W // 2)])[0].numpy()
        dp = f'{o.depth}/{i}.depth.png' if o.depth else None
        if dp and os.path.exists(dp): d = cv2.imread(dp, cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535
        else:
            dep = dep or pipeline('depth-estimation', model='depth-anything/Depth-Anything-V2-Small-hf', device='cpu')
            d = dep(im)['predicted_depth'].squeeze().float().numpy(); d = (d - d.min()) / (d.max() - d.min() + 1e-6)
        d = cv2.resize(d, (W // 2, H // 2))
        cls = {int(k): names[int(k)].split(',')[0].strip().lower() for k in np.unique(lab)}
        floor = np.isin(lab, [k for k, n in cls.items() if n in FLOOR]); forbid = np.isin(lab, [k for k, n in cls.items() if n in FORBID])
        near = forbid & (d >= np.quantile(d, 0.80))
        gF, gX, gN = grid(floor), grid(forbid), grid(near)
        c0, c1 = int(GW * 0.2), int(GW * 0.8); rows = np.nonzero(gF[:, c0:c1].mean(1) >= 0.2)[0]; ftop = float(rows.min() / GH) if len(rows) else 1.0
        dc = d[:, int(d.shape[1] * 0.2):int(d.shape[1] * 0.8)]; far = dc <= np.quantile(dc, 0.03)   # fallback: farthest 3 % in the central band
        vp = vanish(cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)); hsrc = 'vanishing point'
        if vp and vp[1] >= 6 and 0.2 < vp[0] < 0.8: hz = vp[0]
        else: hz = float(min(np.median(np.nonzero(far)[0]) / (H // 2), ftop)); hsrc = 'depth'
        frac = {n: round(float((lab == k).mean()), 4) for k, n in cls.items() if (lab == k).mean() >= 0.01}
        Z = dict(v=VER, id=i, size=[W, H], horizon=round(hz, 4), horizon_src=hsrc, floor_top=round(ftop, 4), floor_frac=round(float(floor.mean()), 4), valid=bool(floor.mean() >= 0.03), classes=frac,
                 grid=dict(w=GW, h=GH, rows=[''.join('N' if gN[y, x] else 'X' if gX[y, x] else 'F' if gF[y, x] else '.' for x in range(GW)) for y in range(GH)]),
                 model='mask2former-swin-small-ade-semantic + depth-anything-v2-small')
        json.dump(Z, open(f'{o.out_dir}/{i}.zones.json', 'w')); print(f"{i:20s} horizon {Z['horizon']:.3f} floor {Z['floor_frac']:.3f} valid {Z['valid']}  {sorted(frac, key=frac.get, reverse=True)[:6]}")

if __name__ == '__main__': main()
