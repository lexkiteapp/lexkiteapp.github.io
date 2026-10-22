#!/usr/bin/env python3
"""matte_compare.py - OLD vs PRO host matte: 400 % crop sheet (hair / ear / shoulder / fingers), 10 s split-screen mp4, metrics.

  python scripts/video/matte_compare.py <green dir> <bg image> <out dir> --sheet ga4_talk_natural:70,ga2_explain:60,... --video ga4_talk_natural,gc4_talk_natural

OLD = kfull/kmask mp4 + news.py's current edge block (6 px rim x0.35, 2.5 px band wrap, extra despill).
PRO = kfull_pro/kmask_pro + MR.finish_host (3 px rim x0.12, 1 px wrap). Both at scale 1.0 over the same background.
"""
import argparse, json, os, subprocess, sys
import numpy as np, cv2

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import matte_refine as MR, matte_qa as Q

ap = argparse.ArgumentParser(); ap.add_argument('green'); ap.add_argument('bg'); ap.add_argument('out')
ap.add_argument('--sheet', required=True); ap.add_argument('--video', required=True); ap.add_argument('--metrics', default=''); ap.add_argument('--step', type=int, default=4)
a = ap.parse_args(); os.makedirs(a.out, exist_ok=True)


def qblur(x, sg):
    h, w = x.shape[:2]; y = cv2.GaussianBlur(cv2.resize(x, (w // 4, h // 4), interpolation=cv2.INTER_AREA), (0, 0), sg / 4)
    return cv2.resize(y, (w, h), interpolation=cv2.INTER_LINEAR)


def comp_old(F, al, B, ld=1):   # news.py lines 398-405 at sc 1.0 (as of ad37c828)
    f = F.copy(); rim = np.clip(al - np.roll(al, 6 * ld, 1), 0, 1)[..., None] * 0.35
    f = f * (1 - rim) + np.minimum(qblur(B, 10) * 1.25, 255) * rim
    band = np.clip(al - cv2.GaussianBlur(al, (0, 0), 2.5), 0, 1)[..., None] * 1.8
    f[..., 1] = np.where(al < 0.97, np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2]) + 10), f[..., 1])
    f = f * (1 - 0.5 * band) + qblur(B, 14) * 0.5 * band
    return f * al[..., None] + B * (1 - al[..., None])


def comp_pro(F, al, B, ld=1):
    f = MR.finish_host(F, al, B, ld); return f * al[..., None] + B * (1 - al[..., None])


def frames(clip, pro):
    c, m, ll = MR.layer_paths(a.green, clip, pro=pro)
    for i, F, al in Q.read_layer(c, m, ll, 1): yield i, F, al


def frame_at(clip, pro, k):
    for i, F, al in frames(clip, pro):
        if i == k: return F, al


B0 = cv2.imread(a.bg); B0 = cv2.GaussianBlur(cv2.resize(B0, (1080, 1916), interpolation=cv2.INTER_AREA), (0, 0), 2.5).astype(np.float32)


def rois(al, img):
    n_, lab_, st_, _ = cv2.connectedComponentsWithStats((al > 0.5).astype(np.uint8))
    h = lab_ == 1 + int(np.argmax(st_[1:, cv2.CC_STAT_AREA])); H = al.shape[0]; rows = np.where(h.any(1))[0]; top = int(rows[0])   # main figure only
    def side(y, right=False):
        c = np.where(h[min(H - 1, y)])[0]; return (int(c.max()) if right else int(c.min())), y
    wid = [int(h[y].sum()) for y in range(top + int(0.04 * H), top + int(0.20 * H))]   # ears stick out: widest head row
    hair = side(top + 25); ear = side(top + int(0.04 * H) + int(np.argmax(wid))); sh = side(top + int(0.27 * H), right=True)
    ycc = cv2.cvtColor(np.clip(img, 0, 255).astype(np.uint8), cv2.COLOR_BGR2YCrCb)
    skin = h & (ycc[..., 1] > 135) & (ycc[..., 1] < 175) & (ycc[..., 2] > 80) & (ycc[..., 2] < 130)
    skin[: top + int(0.33 * H)] = False
    n, lab, stt, cen = cv2.connectedComponentsWithStats(skin.astype(np.uint8))
    if n > 1:
        j = 1 + int(np.argmax(stt[1:, cv2.CC_STAT_AREA])); x0, y0, w, hh = stt[j, :4]
        con = (cv2.dilate(h.astype(np.uint8), np.ones((3, 3), np.uint8)) - cv2.erode(h.astype(np.uint8), np.ones((3, 3), np.uint8))) > 0
        ys, xs = np.where(con[y0:y0 + hh, x0:x0 + w] & (lab[y0:y0 + hh, x0:x0 + w] == j))
        k_ = int(np.argmax(ys)) if len(ys) else 0   # fingertips = lowest contour point of the hand blob
        fing = (int(x0 + xs[k_]), int(y0 + ys[k_] - 20)) if len(xs) else (int(cen[j][0]), int(cen[j][1]))
    else: fing = side(top + int(0.55 * H))
    return [('hair', hair), ('ear', ear), ('shoulder', sh), ('fingers', fing)]


def label(im, t, sz=0.6):
    cv2.putText(im, t, (6, 20), cv2.FONT_HERSHEY_SIMPLEX, sz, (0, 0, 0), 3, cv2.LINE_AA)
    cv2.putText(im, t, (6, 20), cv2.FONT_HERSHEY_SIMPLEX, sz, (255, 255, 255), 1, cv2.LINE_AA); return im


rows = []
for spec in a.sheet.split(','):
    clip, k = spec.split(':'); k = int(k)
    Fo, ao = frame_at(clip, False, k); Fn, an = frame_at(clip, True, k)
    Co, Cn = comp_old(Fo, ao, B0).clip(0, 255).astype(np.uint8), comp_pro(Fn, an, B0).clip(0, 255).astype(np.uint8)
    tl = []
    for name, (x, y) in rois(an, Fn):
        tl += [label(MR.zoom(Co, x, y, 64, 4), f'OLD {name}'), label(MR.zoom(Cn, x, y, 64, 4), f'NEW {name}')]
    strip = np.full((256, 200, 3), 30, np.uint8); label(strip, clip, 0.5); cv2.putText(strip, f'f{k}', (6, 44), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
    rows.append(np.hstack([strip] + [np.pad(t, ((0, 0), (0, 4 if i % 2 else 0), (0, 0))) for i, t in enumerate(tl)]))
wmax = max(r.shape[1] for r in rows)
sheet = np.vstack([np.pad(r, ((0, 4), (0, wmax - r.shape[1]), (0, 0))) for r in rows])
cv2.imwrite(f'{a.out}/matte-compare.jpg', sheet, [cv2.IMWRITE_JPEG_QUALITY, 90]); print('sheet', sheet.shape)

# 10 s split screen: left OLD, right NEW (1080 x 1215 crop from the hair top, shown at 0.89x)
enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1920x1080', '-r', '24', '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-crf', '21', '-maxrate', '7M', '-bufsize', '14M', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
                        f'{a.out}/matte-before-after.mp4'], stdin=subprocess.PIPE)
for clip in a.video.split(','):
    top = None
    for (i, Fo, ao), (_, Fn, an) in zip(frames(clip, False), frames(clip, True)):
        if top is None: top = max(0, int(np.where((an > 0.5).any(1))[0][0]) - 60)
        y0 = min(top, 1916 - 1215)
        sides = []
        for C, t in ((comp_old(Fo, ao, B0), 'BEFORE (old key)'), (comp_pro(Fn, an, B0), 'AFTER (PRO matte)')):
            v = cv2.resize(C[y0:y0 + 1215].clip(0, 255).astype(np.uint8), (960, 1080), interpolation=cv2.INTER_AREA)
            sides.append(label(v, t, 0.9))
        enc.stdin.write(np.hstack(sides).tobytes())
enc.stdin.close(); enc.wait(); print('mp4', round(os.path.getsize(f'{a.out}/matte-before-after.mp4') / 1e6, 2), 'MB')

M = []
for clip in sorted({s.split(':')[0] for s in a.sheet.split(',')} | set(a.video.split(',')) | set(filter(None, a.metrics.split(',')))):
    for pro in (False, True):
        r = Q.layer(a.green, clip, pro=pro, step=a.step); M.append(r); print(json.dumps(r), flush=True)
json.dump(M, open(f'{a.out}/matte-metrics.json', 'w'), indent=1)
