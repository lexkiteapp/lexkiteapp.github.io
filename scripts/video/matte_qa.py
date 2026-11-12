#!/usr/bin/env python3
"""matte_qa.py - automated edge QA for keyed host layers (gates the PRO matte bank and, via comp_metrics, rendered frames).

  python scripts/video/matte_qa.py layer <green dir> <clip> [--old] [--step 4]   -> JSON metrics, exit 1 on FAIL (PRO gates)
  python scripts/video/matte_qa.py gate  <green dir> <clip,clip,...>             -> every PRO layer must PASS (exit 1 otherwise)
  from matte_qa import comp_metrics   # on a rendered frame: comp_metrics(C_bgr, alpha, B_bgr) -> edge_de / spill / halo

Metrics (edge band = 0.1 < a < 0.9; F = straight foreground colour):
  edge_de   median CIE76 dE between F on the edge band and the local host colour 3-7 px inside (same region)  -> halo/fringe colour
  spill     mean max(0, G - max(R,B)) / 255 of F on the edge band                                            -> green spill, ~0
  dark/light median luma deficit / excess of F vs the inner ring, in 0..1 levels (dark rim / bright halo)
  recon     median dE of a F + (1 - a) K vs the green SOURCE frame on the edge band (matting residual: a matte that is
            physically right re-creates the original pixels; wrong alpha / black or green edge colour shows up here)
  flicker   mean |a_t - a_t-1| on edge-band pixels whose SOURCE colour did not change (|dY| < 1.5)        -> boiling edges
  hair_frac share of hair-zone contour pixels (top 16 % of the frame below the hair top) with 0.02 < a < 0.98 -> real hair alpha
"""
import argparse, json, os, sys
import numpy as np, cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matte_refine as MR

# flicker = mean |da| over ALL still-source edge-band pixels of the sampled frame pairs (pooled). The Kling source's own codec noise
# moves a physically correct alpha by ~0.01-0.02 on these edges; boiling mattes sit well above. Calibration: docs/VIDEO.md §6 / ledger.
GATES = dict(recon=4.0, edge_de=6.0, spill=0.004, dark=0.03, light=0.03, flicker=0.025, hair_frac=0.5)


def _lab(F):
    return cv2.cvtColor((np.clip(F, 0, 255) / 255).astype(np.float32), cv2.COLOR_BGR2Lab)


def _inner_mean(F, a):
    h = (a > 0.5).astype(np.uint8); k = np.ones((3, 3), np.uint8)
    ring = ((cv2.erode(h, k, iterations=3) > 0) & ~(cv2.erode(h, k, iterations=7) > 0) & (a >= 0.98)).astype(np.float32)
    w = cv2.blur(ring, (21, 21)); return cv2.blur(F * ring[..., None], (21, 21)) / np.maximum(w, 1e-6)[..., None], w > 0.02


def edge_metrics(F, a):
    """F straight colour float BGR 0..255, a 0..1 -> edge_de, spill, dark, light (band pixels that have an inner reference)"""
    Fi, ok = _inner_mean(F.astype(np.float32), a)
    band = (a > 0.1) & (a < 0.9) & ok
    if not band.any(): return dict(edge_de=0.0, spill=0.0, dark=0.0, light=0.0, n=0)
    de = np.linalg.norm(_lab(F) - _lab(Fi), axis=-1)[band]
    sp = np.clip(F[..., 1] - np.maximum(F[..., 0], F[..., 2]), 0, None)[band] / 255
    Y = lambda X: 0.114 * X[..., 0] + 0.587 * X[..., 1] + 0.299 * X[..., 2]
    rel = float(np.median(Y(F)[band] - Y(Fi)[band])) / 255   # absolute luma levels (a relative ratio explodes on black hair)
    return dict(edge_de=round(float(np.median(de)), 2), spill=round(float(sp.mean()), 5), dark=round(max(0.0, -rel), 4),
                light=round(max(0.0, rel), 4), n=int(band.sum()))


def comp_metrics(C, a, B):
    """on a composited frame: F_hat = (C - (1 - a) B) / a over a > 0.1 (needs the background alone)"""
    a3 = np.maximum(a, 0.1)[..., None]; F = (C.astype(np.float32) - (1 - a[..., None]) * B.astype(np.float32)) / a3
    return edge_metrics(np.clip(F, 0, 255), a)


def hair_frac(a):
    h = (a > 0.5).astype(np.uint8); rows = np.where(h.any(1))[0]
    if not len(rows): return 0.0
    zone = np.zeros_like(h, bool); zone[rows[0]: rows[0] + int(0.16 * a.shape[0])] = True
    k = np.ones((3, 3), np.uint8); con = ((cv2.dilate(h, k) - cv2.erode(h, k)) > 0) & zone
    return float(((a > 0.02) & (a < 0.98))[con].mean()) if con.any() else 0.0


def read_src(src):
    """green source decoded like matte_pro (full-chroma spline) -> BGR uint8 frames"""
    import subprocess
    W, H = (int(v) for v in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src],
                                          capture_output=True, text=True, check=True).stdout.strip().split(','))
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', src, '-sws_flags', 'spline+accurate_rnd+full_chroma_int+full_chroma_inp',
                          '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)


def recon(F, a, I, K):
    """matting residual on the edge band (dE), K = key colour BGR"""
    h = (a > 0.5).astype(np.uint8); k = np.ones((3, 3), np.uint8)
    band = ((cv2.dilate(h, k, iterations=2) - cv2.erode(h, k, iterations=2)) > 0) | ((a > 0.02) & (a < 0.98))
    R = a[..., None] * F + (1 - a[..., None]) * np.asarray(K, np.float32)
    return round(float(np.median(np.linalg.norm(_lab(R) - _lab(I.astype(np.float32)), axis=-1)[band])), 2) if band.any() else 0.0


def read_layer(colour, alpha, lossless, step=1):
    cc, ca = cv2.VideoCapture(colour), cv2.VideoCapture(alpha); i = 0
    while True:
        ok1, F = cc.read(); ok2, M = ca.read()
        if not (ok1 and ok2): break
        if i % step == 0 or (i - 1) % step == 0:   # pairs (i, i+1) for the flicker metric
            yield i, F.astype(np.float32), MR.mask_levels(M[..., 0], lossless)
        i += 1


def layer(G, clip, pro=True, step=4, src=None, f0=0):
    """f0: first source frame of the layer (prototype runs with --frames)"""
    c, m, lossless = MR.layer_paths(G, clip, pro=pro)
    if pro and not lossless: raise SystemExit(f'no PRO layer for {clip}')
    src = src or f'{G}/../tools/dl24/{clip}.mp4'
    S = read_src(src); K = np.median(np.concatenate([S[0, :6].reshape(-1, 3), S[0, :, :6].reshape(-1, 3), S[0, :, -6:].reshape(-1, 3)]), axis=0)
    rows, fl, prev = [], [], None
    for i, F, a in read_layer(c, m, lossless, step):
        I = S[min(i + f0, len(S) - 1)]; I = I[:F.shape[0], :F.shape[1]]
        if prev is not None and prev[0] == i - 1:
            band = (a > 0.05) & (a < 0.95) | (prev[2] > 0.05) & (prev[2] < 0.95)
            Y0, Y1 = (cv2.cvtColor(x, cv2.COLOR_BGR2GRAY).astype(np.float32) for x in (prev[3], I))
            st = band & (cv2.GaussianBlur(np.abs(Y0 - Y1), (0, 0), 1.0) < 1.5)
            fl.append((float(np.abs(a - prev[2])[st].sum()), int(st.sum())))   # pooled over pixels (a per-pair mean let tiny motion pairs dominate)
        if i % step == 0: rows.append(dict(f=i, hair_frac=hair_frac(a), recon=recon(F, a, I, K), **edge_metrics(F, a)))
        prev = (i, F, a, I)
    agg = {k: round(float(np.median([r[k] for r in rows])), 4) for k in ('recon', 'edge_de', 'spill', 'dark', 'light', 'hair_frac')}
    agg['flicker'] = round(sum(x for x, _ in fl) / max(1, sum(n for _, n in fl)), 4)
    fails = [k for k, v in GATES.items() if (agg[k] < v if k == 'hair_frac' else agg[k] > v)]
    return dict(clip=clip, matte='pro' if lossless else 'old', **agg, frames=len(rows), fails=fails, ok=not fails)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('cmd', choices=['layer', 'gate']); ap.add_argument('green'); ap.add_argument('clips')
    ap.add_argument('--old', action='store_true'); ap.add_argument('--step', type=int, default=4); ap.add_argument('--f0', type=int, default=0)
    a = ap.parse_args(); bad = 0
    for cl in a.clips.split(','):
        r = layer(a.green, cl, pro=not a.old, step=a.step, f0=a.f0); print(json.dumps(r), flush=True)
        bad += (not r['ok']) and not a.old
    sys.exit(1 if bad else 0)
