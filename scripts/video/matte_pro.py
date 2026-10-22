#!/usr/bin/env python3
"""matte_pro.py - cinema-grade matte for green-screen hosts (0 credits, CPU, runs on GitHub Actions: matte-pro.yml).

  python scripts/video/matte_pro.py <green src clip (dl24/<id>.mp4)> <green dir> --id <id> [--engine vitmatte|cf] [--frames a:b]

Writes <green dir>/kfull_pro/<id>.mp4 (decontaminated colour, H.264 High 4:4:4 CRF 6 = no chroma subsampling) and
<green dir>/kmask_pro/<id>.mkv (alpha, FFV1 lossless gray) + <id>.json stats. Same frame size/count as the source,
so lipsync meta (mouth tracks) and news.py coordinates stay valid.

Steps (owner 22/10 "lỗi viền, vỡ hình" -> studio pipeline):
  0. decode with full-chroma spline upsampling (Kling h264 is 4:2:0: a CbCr key on bilinear chroma = 2 px stair steps)
  1. coarse chroma matte (matte_refine.coarse_matte = chroma_key.py rules) + 3-frame median + hard-green = bg
  2. trimap: confident FG / BG, unknown band ~12 px on the body, ~24 px in the hair zone (top 30 % of the frame below the hair top)
  3. natural-image matting on the unknown band: ViTMatte-S (hustvl, code MIT, weights Apache-2.0) in 512 px tiles with
     Hann-weighted overlap; fallback pymatting closed-form (MIT)
  4. temporal stability: alphas of t-2..t+2 warped with OpenCV DIS flow, blended only where the warp is photo-consistent
     (static edges stop boiling, moving hands keep their own alpha = crisp) + 3-frame median on source-still band pixels
  5. foreground colour: pymatting estimate_foreground_ml (MIT) -> edge pixels carry hair/skin colour, not green/black
  6. Keylight-style spill (G <= max(R,B), luminance put back) on the edge band only; colour under alpha 0 = push-pull host colour
"""
import argparse, json, os, subprocess, sys, time
import numpy as np, cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matte_refine as MR

ap = argparse.ArgumentParser()
ap.add_argument('clip'); ap.add_argument('green')
ap.add_argument('--id', required=True)
ap.add_argument('--engine', default='vitmatte', choices=['vitmatte', 'cf'])
ap.add_argument('--model', default='hustvl/vitmatte-small-composition-1k')
ap.add_argument('--frames', default='')
ap.add_argument('--band', type=int, default=6, help='unknown half-width (px) on the body')
ap.add_argument('--hair-band', type=int, default=12, help='unknown half-width (px) in the hair zone')
ap.add_argument('--tile', type=int, default=512)
ap.add_argument('--threads', type=int, default=4)
ap.add_argument('--crf', type=int, default=6)
a = ap.parse_args()
cv2.setNumThreads(a.threads)


def probe(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', p],
                       capture_output=True, text=True, check=True).stdout.strip().split(',')
    return int(o[0]), int(o[1])


W, H = probe(a.clip)
raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', a.clip, '-sws_flags', 'spline+accurate_rnd+full_chroma_int+full_chroma_inp',
                      '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
RGB = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); del raw
if a.frames:
    f0, f1 = (int(v) for v in a.frames.split(':')); RGB = RGB[f0:f1]
N = len(RGB); t0 = time.time()
print(f'{a.id}: {N} frames {W}x{H}', flush=True)


def key_color(img):
    b = np.concatenate([img[:6].reshape(-1, 3), img[-6:].reshape(-1, 3), img[:, :6].reshape(-1, 3), img[:, -6:].reshape(-1, 3)])
    return np.median(b, axis=0)


KC = np.median([key_color(f) for f in RGB[:: max(1, N // 6)]], axis=0)

# 1. coarse matte (same rules as chroma_key.py) + temporal median 3 + hard green
CO = [MR.coarse_matte(f, KC) for f in RGB]
W3 = lambda i, n: slice(max(0, min(i - 1, n - 3)), max(0, min(i - 1, n - 3)) + 3)
CO = [np.median(np.stack(CO[W3(i, N)]), axis=0) if N >= 3 else CO[i] for i in range(N)]
CO = [np.where(MR.hard_bg(f), 0.0, c).astype(np.float32) for f, c in zip(RGB, CO)]


# 2. trimap
def disk(r): return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def trimap(c):
    hard = (c > 0.5).astype(np.uint8)
    rows = np.where(hard.any(1))[0]; top = int(rows[0]) if len(rows) else 0
    hair = np.zeros_like(hard, bool); hair[top: top + int(0.30 * H)] = True
    def ring(r): return (cv2.dilate(hard, disk(r)) > 0) & ~(cv2.erode(hard, disk(r)) > 0)
    unk = np.where(hair, ring(a.hair_band), ring(a.band)) | ((c > 0.02) & (c < 0.98))
    T = np.where(hard > 0, 1.0, 0.0).astype(np.float32); T[unk] = 0.5
    return T, hair, top


# 3. matting
if a.engine == 'vitmatte':
    import torch
    from transformers import VitMatteImageProcessor, VitMatteForImageMatting
    torch.set_num_threads(a.threads)
    PROC = VitMatteImageProcessor.from_pretrained(a.model); NET = VitMatteForImageMatting.from_pretrained(a.model).eval()
HANN = None


def tiles_for(unk):
    ys, xs = np.where(unk)
    if not len(ys): return []
    T_, S_ = a.tile, a.tile * 3 // 4; out = []
    for y in range(max(0, ys.min() - 32), min(H, ys.max() + 32), S_):
        for x in range(max(0, xs.min() - 32), min(W, xs.max() + 32), S_):
            y0, x0 = min(y, max(0, H - T_)), min(x, max(0, W - T_))
            if unk[y0:y0 + T_, x0:x0 + T_].any(): out.append((y0, x0))
    return sorted(set(out))


def mat_vit(img, T):
    global HANN
    unk = T == 0.5; ts = a.tile
    if HANN is None:
        h1 = np.hanning(ts + 2)[1:-1].astype(np.float32); HANN = np.outer(h1, h1) + 1e-3
    acc = np.zeros((H, W), np.float32); wsum = np.zeros((H, W), np.float32)
    tl = tiles_for(unk)
    for k in range(0, len(tl), 4):
        batch = tl[k:k + 4]
        ims = [img[y:y + ts, x:x + ts] for y, x in batch]; tms = [(T[y:y + ts, x:x + ts] * 255).astype(np.uint8) for y, x in batch]
        inp = PROC(images=ims, trimaps=tms, return_tensors='pt')
        with torch.no_grad(): al = NET(**inp).alphas[:, 0].numpy()
        for (y, x), m, im in zip(batch, al, ims):
            hh, ww = im.shape[:2]
            acc[y:y + hh, x:x + ww] += m[:hh, :ww] * HANN[:hh, :ww]; wsum[y:y + hh, x:x + ww] += HANN[:hh, :ww]
    out = T.copy(); ok = unk & (wsum > 0)
    out[ok] = acc[ok] / wsum[ok]
    return np.clip(out, 0, 1), len(tl)


def mat_cf(img, T):
    from pymatting import estimate_alpha_cf
    unk = T == 0.5; ys, xs = np.where(unk); out = T.copy()
    if not len(ys): return out, 0
    y0, y1, x0, x1 = max(0, ys.min() - 16), min(H, ys.max() + 17), max(0, xs.min() - 16), min(W, xs.max() + 17)
    out[y0:y1, x0:x1] = estimate_alpha_cf(img[y0:y1, x0:x1].astype(np.float64) / 255, T[y0:y1, x0:x1].astype(np.float64))
    return np.clip(out, 0, 1), 1


TRI = []; AL = []; NT = 0
for i, (img, c) in enumerate(zip(RGB, CO)):
    T, hair, top = trimap(c); TRI.append((T == 0.5, hair))
    al, nt = (mat_vit if a.engine == 'vitmatte' else mat_cf)(img, T); NT += nt
    AL.append(al.astype(np.float32))
    if i % 10 == 0: print(f'  matte f{i} tiles {nt} {time.time() - t0:.0f}s', flush=True)

# 4. temporal: flow-warped neighbour alphas, photo-consistency weighted, unknown band only
GR = [cv2.cvtColor(f, cv2.COLOR_RGB2GRAY) for f in RGB]
DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))


def warp_from(t, s):
    fl = DIS.calc(GR[t], GR[s], None); mx, my = gx + fl[..., 0], gy + fl[..., 1]
    aw = cv2.remap(AL[s], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    iw = cv2.remap(GR[s], mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE).astype(np.float32)
    err = cv2.GaussianBlur(np.abs(iw - GR[t].astype(np.float32)), (0, 0), 1.5)
    return aw, np.exp(-(err / 5.0) ** 2).astype(np.float32)


AS = []
for t in range(N):
    num = AL[t] * 0.4; den = np.full((H, W), 0.4, np.float32)
    for s, wt in ((t - 1, 0.2), (t + 1, 0.2), (t - 2, 0.1), (t + 2, 0.1)):   # 5-frame window (3 frames left gc4 edges at flicker 0.034)
        if 0 <= s < N:
            aw, w = warp_from(t, s); num += wt * w * aw; den += wt * w
    unk = TRI[t][0]; out = AL[t].copy(); out[unk] = (num / den)[unk]
    AS.append(np.clip(out, 0, 1))
# 4b. where the SOURCE is still over t-1..t+1, the alpha must be still too: 3-frame temporal median on those unknown-band pixels
#     (ViTMatte tile noise on static hair otherwise boils at ~0.02-0.03 mean |da|; moving pixels keep the flow blend = crisp hands)
del AL, CO
DY = [cv2.GaussianBlur(np.abs(GR[t + 1].astype(np.float32) - GR[t]), (0, 0), 1.0) for t in range(N - 1)]
AM = list(AS)
for t in range(1, N - 1):
    st = TRI[t][0] & (DY[t - 1] < 1.5) & (DY[t] < 1.5)
    med = np.median(np.stack([AS[t - 1], AS[t], AS[t + 1]]), axis=0); AM[t] = AS[t].copy(); AM[t][st] = med[st]
AS = AM; del DY
print(f'  temporal done {time.time() - t0:.0f}s', flush=True)

# 5-6. foreground colour + spill + extend, write lossless intermediates
from pymatting import estimate_foreground_ml
os.makedirs(f'{a.green}/kfull_pro', exist_ok=True); os.makedirs(f'{a.green}/kmask_pro', exist_ok=True)
oc, om = f'{a.green}/kfull_pro/{a.id}.mp4', f'{a.green}/kmask_pro/{a.id}.mkv'
EC = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                       '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high444', '-pix_fmt', 'yuv444p', '-crf', str(a.crf), '-threads', str(a.threads),
                       '-movflags', '+faststart', oc], stdin=subprocess.PIPE)
EM = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                       '-c:v', 'ffv1', '-level', '3', '-g', '1', '-slices', '4', '-pix_fmt', 'gray', om], stdin=subprocess.PIPE)
st = dict(frac=[], spill=[])
for t in range(N):
    al = AS[t]; img = RGB[t]
    ys, xs = np.where(al > 0.002)
    y0, y1, x0, x1 = max(0, ys.min() - 24), min(H, ys.max() + 25), max(0, xs.min() - 24), min(W, xs.max() + 25)
    F = np.zeros((H, W, 3), np.float32)
    F[y0:y1, x0:x1] = estimate_foreground_ml(img[y0:y1, x0:x1].astype(np.float64) / 255, al[y0:y1, x0:x1].astype(np.float64)) * 255
    edge = (al > 0.004) & (al < 0.996); band = cv2.dilate(edge.astype(np.uint8), disk(3)) > 0
    F = MR.keylight_spill(F, al, band=band.astype(np.float32))
    F = MR.extend_colour(F, al, thr=0.02)   # colour under transparent pixels = nearest host colour (never green / black)
    a8 = (al * 255 + 0.5).astype(np.uint8)
    EC.stdin.write(np.ascontiguousarray(F[..., ::-1]).clip(0, 255).astype(np.uint8).tobytes()); EM.stdin.write(a8.tobytes())
    e = (a8 > 0) & (a8 < 255); st['frac'].append(float(e.sum()))
    st['spill'].append(float(np.clip(F[..., 1] - np.maximum(F[..., 0], F[..., 2]), 0, None)[edge].mean() / 255) if edge.any() else 0.0)
EC.stdin.close(); EM.stdin.close(); EC.wait(); EM.wait()
out = dict(id=a.id, engine=a.engine, model=a.model if a.engine == 'vitmatte' else 'pymatting-cf', frames=N, size=[W, H], key=[int(v) for v in KC],
           tiles_per_frame=round(NT / max(1, N), 1), edge_px_mean=round(float(np.mean(st['frac'])), 0), spill_mean=round(float(np.mean(st['spill'])), 5),
           secs=round(time.time() - t0, 1), colour=os.path.relpath(oc, a.green), alpha=os.path.relpath(om, a.green),
           mb=[round(os.path.getsize(oc) / 1e6, 1), round(os.path.getsize(om) / 1e6, 1)])
json.dump(out, open(f'{a.green}/kmask_pro/{a.id}.json', 'w'), indent=1); print(json.dumps(out))
