# Teacher viseme sprite builder (docs/TEACHER-IN-APP.md §5.4) – 0 credits, everything is cut from the 3D bank v2 footage.
#   scan  <teacher>  align every frame of the configured clips to the first frame (ORB on the face, mouth masked → partial affine),
#                    measure the mouth (dark interior / teeth / opening) and save the aligned mouth crops
#   sheet <teacher>  contact sheet of candidates per mouth shape → pick by eye, write picks into sprites.json
#   build <teacher>  mouths sprite (shapes in SHAPES order, LAB mean colour-matched to the loop), ping-pong motion loop (H.264) cut
#                    from the listen clip and a per-frame face track so the mouth layer moves with the real head (smoothed, no drift)
# Usage: FOOTAGE=<dir with *_first.png + clips> OUT=<dir> python scripts/teacher/sprite_build.py scan ama
import cv2, numpy as np, json, math, os, sys, subprocess
from PIL import Image

CFG = json.load(open(os.path.join(os.path.dirname(__file__), 'sprites.json')))
D = os.environ.get('FOOTAGE', 'brand/library/cine/teachers3d/carlos2').rstrip('/') + '/'
OUT = os.environ.get('OUT', 'out')
SHAPES = ['X', 'A', 'B', 'C1', 'C', 'D', 'E', 'F', 'G', 'H']   # rest, MBP, teeth, small, mid, wide, round O, pucker U, F/V, L/TH
K = 0.8                                                         # 600x800 crop → 480x640
stage, who = sys.argv[1], sys.argv[2]
c = CFG[who]; FX, FY, FW, FH = c['face']; MX, MY, MW, MH = c['mouth']; CX, CY, CW, CH = c['crop']
W = os.path.join(OUT, who); os.makedirs(W + '/fr', exist_ok=True)
base = cv2.imread(D + c['first']); g0 = cv2.cvtColor(base, cv2.COLOR_BGR2GRAY); H0, W0 = g0.shape
mask = np.zeros_like(g0); mask[FY:FY + FH, FX:FX + FW] = 255; mask[MY:MY + MH, MX - 10:MX + MW + 10] = 0
orb = cv2.ORB_create(1500); k0, d0 = orb.detectAndCompute(g0, mask); bf = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)

def affine(f):
    g = cv2.cvtColor(f, cv2.COLOR_BGR2GRAY); m2 = np.zeros_like(g)
    m2[max(0, FY - 300):FY + FH + 300, max(0, FX - 350):FX + FW + 350] = 255
    k1, d1 = orb.detectAndCompute(g, m2)
    if d1 is None: return None, 0
    ms = bf.match(d0, d1)
    if len(ms) < 12: return None, 0
    A, inl = cv2.estimateAffinePartial2D(np.float32([k1[m.trainIdx].pt for m in ms]), np.float32([k0[m.queryIdx].pt for m in ms]), method=cv2.RANSAC, ransacReprojThreshold=3)
    return A, (int(inl.sum()) if A is not None else 0)

def frames(clip):
    cap = cv2.VideoCapture(D + clip + '.mp4'); i = 0
    while True:
        ok, f = cap.read()
        if not ok: return
        yield i, f; i += 1

def frame(clip, i):
    cap = cv2.VideoCapture(D + clip + '.mp4'); cap.set(cv2.CAP_PROP_POS_FRAMES, i); return cap.read()[1]

def mouth_stats(p):
    hsv = cv2.cvtColor(p, cv2.COLOR_BGR2HSV); inner = hsv[MH // 8:MH * 5 // 8, MW // 8:MW * 7 // 8]
    dark = inner[..., 2] < 70; teeth = (inner[..., 1] < 70) & (inner[..., 2] > 165); ys, xs = np.nonzero(dark | teeth)
    return dict(dark=int(dark.sum()), teeth=int(teeth.sum()), oh=int(np.ptp(ys)) if len(ys) > 20 else 0, ow=int(np.ptp(xs)) if len(xs) > 20 else 0)

if stage == 'scan':
    rows = []
    for clip in c['clips']:
        for i, f in frames(clip):
            A, n = affine(f)
            if A is None: continue
            s = math.hypot(A[0, 0], A[1, 0]); rot = math.degrees(math.atan2(A[1, 0], A[0, 0]))
            if n < 25 or abs(s - 1) > .08 or abs(rot) > 7: continue
            w = cv2.warpAffine(f, A, (W0, H0), flags=cv2.INTER_LANCZOS4); p = w[MY:MY + MH, MX:MX + MW]
            rows.append(dict(clip=clip, i=i, n=n, **mouth_stats(p))); cv2.imwrite(f'{W}/fr/{clip}_{i:03d}.png', p)
    json.dump(rows, open(W + '/scan.json', 'w')); print(who, len(rows), 'aligned frames')

elif stage == 'sheet':
    R = json.load(open(W + '/scan.json')); op = lambda r: r['dark'] + r['teeth']; ar = lambda r: r['ow'] / max(r['oh'], 1)
    q = lambda key, rs: [r['dark'] for r in rs]
    dk = sorted(r['dark'] for r in R); P = lambda p: dk[int(p * (len(dk) - 1))]
    cls = {
        'X/A closed': sorted(R, key=op)[:10],
        'B teeth': sorted([r for r in R if r['teeth'] > 250 and r['dark'] < P(.4)], key=lambda r: -r['teeth'])[:10],
        'C1 small': sorted([r for r in R if P(.35) < r['dark'] < P(.6)], key=lambda r: -r['teeth'])[:10],
        'C mid': sorted([r for r in R if P(.6) < r['dark'] < P(.85)], key=lambda r: -r['teeth'])[:10],
        'D/H wide': sorted(R, key=lambda r: -(r['dark'] + r['oh'] * 20))[:10],
        'E round': sorted([r for r in R if r['dark'] > P(.4)], key=ar)[:10],
        'F pucker': sorted([r for r in R if op(r) < P(.4) and r['ow'] > 0], key=lambda r: r['ow'])[:10],
        'G f/v': sorted([r for r in R if r['teeth'] > 150 and r['oh'] < np.median([x['oh'] for x in R])], key=lambda r: -r['teeth'] + r['dark'])[:10],
    }
    out = []
    for k, v in cls.items():
        t = []
        for r in v:
            im = cv2.resize(cv2.imread(f"{W}/fr/{r['clip']}_{r['i']:03d}.png"), (154, 119))
            cv2.putText(im, f"{r['clip'].split('_')[0]}#{r['i']}", (3, 12), cv2.FONT_HERSHEY_SIMPLEX, .38, (0, 255, 255), 1); t.append(im)
        t += [np.zeros((119, 154, 3), np.uint8)] * (10 - len(t))
        lab = np.zeros((119, 74, 3), np.uint8); cv2.putText(lab, k, (2, 62), cv2.FONT_HERSHEY_SIMPLEX, .36, (255, 255, 255), 1)
        out.append(np.hstack([lab] + t))
    cv2.imwrite(W + '/sheet.jpg', np.vstack(out), [cv2.IMWRITE_JPEG_QUALITY, 78]); print('sheet', W + '/sheet.jpg')

elif stage == 'loopscan':
    # pick the 3 s listen window with a natural blink and the least head travel (ping-pong makes it seamless)
    EX, EY, EW, EH = c['eyes']; T = []
    for i, f in frames(c['loop']):
        A, n = affine(f)
        if A is None or n < 18:   # blinks lose eye features: measure the eyes with the last good transform, keep the frame for blink only
            if not T or T[-1] is None: T.append(None); continue
            A = lastA; w = cv2.warpAffine(f, A, (W0, H0)); e = cv2.cvtColor(w[EY:EY + EH, EX:EX + EW], cv2.COLOR_BGR2HSV)
            T.append(T[-1][:2] + (int(((e[..., 1] < 50) & (e[..., 2] > 170)).sum()), 18)); continue
        lastA = A
        w = cv2.warpAffine(f, A, (W0, H0)); e = cv2.cvtColor(w[EY:EY + EH, EX:EX + EW], cv2.COLOR_BGR2HSV)
        cx, cy = FX + FW / 2, FY + FH / 2; M = cv2.invertAffineTransform(A)   # where the face centre sits in this frame
        T.append((float(M[0, 0] * cx + M[0, 1] * cy + M[0, 2]), float(M[1, 0] * cx + M[1, 1] * cy + M[1, 2]), int(((e[..., 1] < 50) & (e[..., 2] > 170)).sum()), n))
    best = []
    for s0 in range(0, len(T) - 72, 4):
        win = [x for x in T[s0:s0 + 72] if x is not None and x[3] >= 18]
        if len(win) < 60: continue
        xs = [x[0] for x in win]; ys = [x[1] for x in win]; wh = [x[2] for x in win]
        travel = max(xs) - min(xs) + max(ys) - min(ys); blink = min(wh) < .15 * np.median(wh)
        best.append((not blink, travel, s0))
    best.sort(); print('best windows (no_blink, travel px, start):', best[:6])

elif stage == 'build':
    picks = c['picks']; loop = c['loop']; L0, L1 = c['loop_range']
    # 1) face track over the loop window: frame→first-frame affine, smoothed (Gaussian σ=2 frames) so the mouth never jitters or drifts
    As, ok = [], []
    for i in range(L0, L1):
        A, n = affine(frame(loop, i)); good = A is not None and n >= 18 and abs(math.hypot(A[0, 0], A[1, 0]) - 1) < .08
        As.append(A if good else np.zeros((2, 3))); ok.append(good)
    As, ok = np.array(As), np.array(ok); idx = np.arange(len(As))
    for r in range(2):            # blink / low-feature frames: interpolate from the good neighbours
        for k in range(3): As[~ok, r, k] = np.interp(idx[~ok], idx[ok], As[ok, r, k])
    flat = As.reshape(len(As), 6); med = np.array([np.median(flat[max(0, i - 2):i + 3], 0) for i in idx])   # kill single-frame outliers
    sm = np.stack([cv2.GaussianBlur(med[:, j].reshape(-1, 1), (1, 0), 2, borderType=cv2.BORDER_REPLICATE).ravel() for j in range(6)], 1).reshape(-1, 2, 3)
    mc = np.array([MX + MW / 2, MY + MH / 2, 1.0])   # jitter = mouth-centre distance between raw (good frames) and smoothed track
    pos = lambda A: cv2.invertAffineTransform(A) @ mc
    jitter = float(max(np.linalg.norm(pos(As[i]) - pos(sm[i])) for i in idx[ok]))
    # CSS matrix for the overlay (480x640 space, origin 0 0): q = K(p_base - crop) → K(M p_base - crop), M = [R|t] = inverse(A)
    track = []; cr = np.array([CX, CY], np.float64)
    for A in sm:
        M = cv2.invertAffineTransform(A); R, t = M[:, :2], M[:, 2]; e = K * (R @ cr + t - cr)
        track.append([round(R[0, 0], 4), round(R[1, 0], 4), round(R[0, 1], 4), round(R[1, 1], 4), round(e[0], 2), round(e[1], 2)])
    # 2) reference frame for colour (first loop frame, aligned) and mouth tiles
    ref = cv2.warpAffine(frame(loop, L0), sm[0], (W0, H0), flags=cv2.INTER_LANCZOS4); rref = ref[MY:MY + MH, MX:MX + MW]
    al = np.zeros((MH, MW), np.float32); cv2.ellipse(al, (MW // 2, MH // 2), (MW // 2 - 20, MH // 2 - 18), 0, 0, 360, 1, -1); al = cv2.GaussianBlur(al, (0, 0), 9)
    tiles = []
    for k in SHAPES:
        clip, i = picks[k].split('#'); f = frame(clip, int(i)); A, n = affine(f)
        p = cv2.warpAffine(f, A, (W0, H0), flags=cv2.INTER_LANCZOS4)[MY:MY + MH, MX:MX + MW]
        pl = cv2.cvtColor(p, cv2.COLOR_BGR2LAB).astype(np.float32); rl = cv2.cvtColor(rref, cv2.COLOR_BGR2LAB).astype(np.float32)
        ring = (al > .05) & (al < .6) & (pl[..., 0] > 60) & (pl[..., 0] < 200) & (rl[..., 0] > 60) & (rl[..., 0] < 200)
        for ch in range(3): pl[..., ch] += rl[..., ch][ring].mean() - pl[..., ch][ring].mean()
        p = cv2.cvtColor(np.clip(pl, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)
        rgba = np.dstack([cv2.cvtColor(p, cv2.COLOR_BGR2RGB), (al * 255).astype(np.uint8)])
        tiles.append(cv2.resize(rgba, (round(MW * K), round(MH * K)), interpolation=cv2.INTER_AREA)); print(k, picks[k], 'inliers', n)
    os.makedirs(W + '/web', exist_ok=True)
    Image.fromarray(np.hstack(tiles)).save(f'{W}/web/{who}_mouths.webp', quality=86, method=6)
    # 3) ping-pong loop (forward + reverse = seamless, no drift), 480x640 H.264, poster
    fwd = f'select=between(n\\,{L0}\\,{L1 - 1}),setpts=N/24/TB,crop={CW}:{CH}:{CX}:{CY},scale=480:640:flags=lanczos'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', D + loop + '.mp4', '-filter_complex', f'[0:v]{fwd},split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1[v]', '-map', '[v]', '-an',
                    '-c:v', 'libx264', '-preset', 'slow', '-crf', os.environ.get('CRF', '30'), '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-g', '48', '-movflags', '+faststart', '-threads', '2', f'{W}/web/{who}_loop.mp4'], check=True)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{W}/web/{who}_loop.mp4', '-frames:v', '1', '-q:v', '6', f'{W}/web/{who}_poster.jpg'], check=True)
    n = L1 - L0; full = track + track[::-1]
    json.dump({'w': 480, 'h': 640, 'fps': 24, 'frames': 2 * n, 'mouth': {'x': round((MX - CX) * K), 'y': round((MY - CY) * K), 'w': round(MW * K), 'h': round(MH * K), 'order': SHAPES},
               'base_origin': [round(MX * 1.0), round(MY * 1.0)], 'k': K, 'crop': [CX, CY], 'track': full, 'track_jitter_px': round(jitter * K, 2),
               'src': {'picks': picks, 'loop': f'{loop}#{L0}-{L1 - 1} ping-pong'}}, open(f'{W}/web/{who}_sprite.json', 'w'), separators=(',', ':'))
    print('loop frames', 2 * n, 'raw-vs-smoothed track max', round(jitter * K, 2), 'px')
