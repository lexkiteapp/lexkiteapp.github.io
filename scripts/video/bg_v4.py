#!/usr/bin/env python3
"""bg_v4.py <anchor_dir> <out_dir> [--ids a,b] [--shard i/n] - wide-library backgrounds v4 (owner 23/10: sharper + one shared room). 0 credits, CPU.
Per wide scene (anchor/bg/index.json 'wide'):
  1. crops: Ama = L, Carlos = R 9:16 windows of the SAME master with 25 % OVERLAP (v3 crops had a gap -> two rooms on screen); vertical
     geometry = bg_gates.fit_crop (horizon 36-44 % of the final frame).
  2. plate: the L..R union strip of the master super-resolved with RealESRGAN_x4plus_anime_6B (illustration model, x4) then Lanczos down to
     the crop scale (2400 px high) + mild edge-aware unsharp mask. Crops = windows of this plate, so a camera PAN from L to R (news.py) shows
     one continuous room.
  3. zones + depth per crop (bg_gates.zones: Mask2Former + Depth-Anything), sharpness stats (v3 crop vs v4 crop), shared-anchor overlap
     (overlap fraction + edge density of the shared strip: >= 20 % and textured = the same objects visible in both shots).
Writes <out>/<id>_L.webp, <id>_R.webp, <id>_plate.webp, zones/<id>_{L,R}.zones.json + .depth.png, <id>.v4.json. Resumable (skips done ids)."""
import argparse, json, os, sys, time
import numpy as np, cv2
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bg_gates as BG
OUTW, OUTH = 1350, 2400; OVERLAP = 0.25
MURL = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.2.4/RealESRGAN_x4plus_anime_6B.pth'
_SR = {}
def sr_model():
    if 'm' not in _SR:
        import torch; torch.set_num_threads(int(os.environ.get('BG_THREADS', str(os.cpu_count() or 2))))
        from spandrel import ModelLoader
        p = os.environ.get('BG_SR6B', os.path.expanduser('~/.cache/RealESRGAN_x4plus_anime_6B.pth'))
        if not os.path.exists(p): os.makedirs(os.path.dirname(p), exist_ok=True); os.system(f'curl -sL --max-time 300 -o "{p}" {MURL}')
        _SR['m'] = ModelLoader().load_from_file(p).model.eval()
    return _SR['m']
def sr4(img, tile=256, pad=16):
    """RGB uint8 -> x4 RGB uint8, tiled (bounded memory on 2-core / 7 GB runners)."""
    import torch; m = sr_model(); H, W = img.shape[:2]; out = np.zeros((H * 4, W * 4, 3), np.uint8)
    for y in range(0, H, tile):
        for x in range(0, W, tile):
            y0, x0, y1, x1 = max(0, y - pad), max(0, x - pad), min(H, y + tile + pad), min(W, x + tile + pad)
            t = torch.from_numpy(img[y0:y1, x0:x1]).permute(2, 0, 1).float().div(255).unsqueeze(0)
            with torch.inference_mode(): o = m(t)[0].clamp(0, 1).permute(1, 2, 0).mul(255).round().byte().numpy()
            ty, tx = (y - y0) * 4, (x - x0) * 4; h_, w_ = min(tile, H - y) * 4, min(tile, W - x) * 4
            out[y * 4:y * 4 + h_, x * 4:x * 4 + w_] = o[ty:ty + h_, tx:tx + w_]
    return out
def sharpen(img, amount=0.35, sigma=1.1):   # edge-aware unsharp: only where there is an edge (flat cel fills stay clean, no halo noise)
    f = img.astype(np.float32); bl = cv2.GaussianBlur(f, (0, 0), sigma); g = cv2.cvtColor(img, cv2.COLOR_RGB2GRAY).astype(np.float32)
    e = np.hypot(cv2.Sobel(g, cv2.CV_32F, 1, 0), cv2.Sobel(g, cv2.CV_32F, 0, 1)); w = np.clip(e / 60.0, 0, 1)[..., None]
    return np.clip(f + amount * w * (f - bl), 0, 255).astype(np.uint8)
def edge_density(a):
    g = cv2.cvtColor(a, cv2.COLOR_RGB2GRAY); return float((cv2.Canny(g, 60, 140) > 0).mean())
def one(A, out, it):
    cid = it['id']; js = f'{out}/{cid}.v4.json'
    if os.path.exists(js): return json.load(open(js))
    t0 = time.time(); im = Image.open(f"{A}/{it['file']}").convert('RGB'); W, H = im.size
    old = {}
    for sd in ('L', 'R'):
        zp = f"{A}/bg/w/zones/{cid}_{sd}.zones.json"
        if os.path.exists(zp): old[sd] = json.load(open(zp))
    if old.get('L', {}).get('crop_box'): _, y0, cw, hc = old['L']['crop_box']
    else:
        vp = BG.BZ.vanish(cv2.cvtColor(np.array(im), cv2.COLOR_RGB2BGR)); hz = vp[0] if vp and vp[1] >= 6 and 0.2 < vp[0] < 0.8 else None
        g = BG.fit_crop(hz, H) or dict(hc=H, y0=0); hc, y0 = g['hc'], g['y0']; cw = round(hc * 9 / 16)
    xo = [old[sd]['crop_box'][0] for sd in ('L', 'R') if old.get(sd, {}).get('crop_box')]
    mid = (xo[0] + xo[1] + cw) / 2 if len(xo) == 2 else W / 2; step = round(cw * (1 - OVERLAP))
    xL = int(np.clip(round(mid - (cw + step) / 2), 0, W - cw - step)); xR = xL + step
    strip = np.array(im.crop((xL, y0, xR + cw, y0 + hc)))
    k = OUTH / hc; P = sr4(strip); P = cv2.resize(P, (round((xR + cw - xL) * k), OUTH), interpolation=cv2.INTER_AREA); P = sharpen(P)
    os.makedirs(f'{out}/zones', exist_ok=True); Image.fromarray(P).save(f'{out}/{cid}_plate.webp', quality=95, method=6)
    rep = dict(id=cid, v=4, master=[W, H], crop=dict(L=[xL, y0, cw, hc], R=[xR, y0, cw, hc]), overlap=OVERLAP, plate=[P.shape[1], P.shape[0]], k=round(k, 5), sides={})
    for sd, x in (('L', xL), ('R', xR)):
        px = round((x - xL) * k); c = P[:, px:px + OUTW]; c = cv2.resize(c, (OUTW, OUTH), interpolation=cv2.INTER_AREA) if c.shape[1] != OUTW else c
        Image.fromarray(c).save(f'{out}/{cid}_{sd}.webp', quality=95, method=6)
        z, dp = BG.zones(Image.fromarray(c), f'{cid}_{sd}'); hz = (old.get(sd) or {}).get('horizon', z['horizon']); z['horizon'] = hz
        hzc = (hz * H - y0) / hc; z['y_window'] = int(min(OUTH - 1920, max(0, round(OUTH * hzc - 0.40 * 1920)))); z['final_horizon'] = round((OUTH * hzc - z['y_window']) / 1920, 4)
        z['crop_box'] = [x, y0, cw, hc]; z['plate_x'] = px; z['v4'] = True
        json.dump(z, open(f'{out}/zones/{cid}_{sd}.zones.json', 'w')); cv2.imwrite(f'{out}/zones/{cid}_{sd}.depth.png', dp)
        ov = f"{A}/bg/w/{cid}_{sd}.webp"; s_old = BG.sharp_expo(Image.open(ov)) if os.path.exists(ov) else {}; s_new = BG.sharp_expo(Image.fromarray(c))
        X0 = 135 + (230 if sd == 'L' else 550); Y0 = z['y_window'] + 300; hcz = round(edge_density(c[Y0:Y0 + 560, X0:X0 + 300]), 4)   # head zone of the final MCU frame
        rep['sides'][sd] = dict(head_clutter=hcz, plate_x=px, valid=z['valid'], horizon=hz, acu_v3=s_old.get('acu'), acu_v4=s_new['acu'], lap_v3=s_old.get('lap'), lap_v4=s_new['lap'])
    sh = P[:, round(step * k):round(cw * k)]; rep['anchor'] = dict(overlap=OVERLAP, edge_density=round(edge_density(sh), 4), ok=OVERLAP >= 0.2 and edge_density(sh) >= 0.005)
    rep['secs'] = round(time.time() - t0, 1); json.dump(rep, open(js, 'w'), indent=1); print(cid, rep['sides']['L'].get('acu_v3'), '->', rep['sides']['L']['acu_v4'], rep['anchor'], f"{rep['secs']}s", flush=True)
    return rep
if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('anchor'); ap.add_argument('out'); ap.add_argument('--ids', default=''); ap.add_argument('--shard', default='0/1'); a = ap.parse_args()
    W_ = json.load(open(f'{a.anchor}/bg/index.json'))['wide']; i, n = map(int, a.shard.split('/'))
    items = [w for w in W_ if (not a.ids or w['id'] in a.ids.split(','))]; items = items[i::n]
    os.makedirs(a.out, exist_ok=True); bad = 0
    for it in items:
        try: one(a.anchor, a.out, it)
        except Exception as e: bad += 1; print('FAIL', it['id'], str(e)[:200], flush=True)
    print(f'bg_v4: {len(items) - bad}/{len(items)} done'); sys.exit(1 if bad else 0)
