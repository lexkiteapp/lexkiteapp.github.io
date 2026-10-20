# bank.py <clip.mp4> <who> <fx0,fy0,fx1,fy1> <outdir>
# Per-clip bank metadata for one character's face:
#  1) pass 1: ECC affine (frame0 -> frame i) on the rough face box  -> stabilised frames
#  2) mouth box = bbox of the highest temporal-std blob in the lower 60 % of the face (the moving mouth)
#  3) pass 2: ECC again with the mouth masked out (mouth motion must not drive the track), gaussian smoothing
#  4) aligned mouth crops for every frame (frame0 coords) + features (openness, width, teeth) -> Rhubarb shapes
# Outputs in <outdir>/<who>/: track.npy (N,2,3 smoothed), track_raw.npy, cc.npy, crops.npz, mouth.json, sprites/<V>.png
import cv2, numpy as np, json, os, sys
clip, who, box, out = sys.argv[1], sys.argv[2], [int(v) for v in sys.argv[3].split(',')], sys.argv[4]
od = os.path.join(out, who); os.makedirs(os.path.join(od, 'sprites'), exist_ok=True)
cap = cv2.VideoCapture(clip); FR = []
while True:
    ok, F = cap.read()
    if not ok: break
    FR.append(F)
if len(sys.argv) > 6: FR = FR[:int(sys.argv[6])]   # usable range only (e.g. before a head turn)
N = len(FR); H, W = FR[0].shape[:2]
fx0, fy0, fx1, fy1 = box; s = 0.5
S = np.diag([s, s, 1.]); T = np.array([[1, 0, -fx0], [0, 1, -fy0], [0, 0, 1.]])
def g(I): return cv2.GaussianBlur(cv2.cvtColor(cv2.resize(I[fy0:fy1, fx0:fx1], None, fx=s, fy=s, interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32), (5, 5), 0)
G = [g(F) for F in FR]
def track(mask):
    M = np.eye(2, 3, dtype=np.float32); Ms, ccs = [], []
    for gi in G:
        try: cc, M = cv2.findTransformECC(G[0], gi, M, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 100, 1e-5), mask, 5)
        except cv2.error: cc = -1
        Fm = np.linalg.inv(T) @ np.linalg.inv(S) @ np.vstack([M, [0, 0, 1]]) @ S @ T
        Ms.append(Fm[:2].copy()); ccs.append(cc)
    return np.array(Ms), np.array(ccs)
def warp_roi(I, M, x0, y0, w, h):  # aligned crop: out(q) = I(M (q + o))
    M2 = M.copy(); M2[:, 2] = M[:, 2] + M[:, :2] @ np.array([x0, y0], float)
    return cv2.warpAffine(I, M2, (w, h), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
M1, cc1 = track(None)
fw, fh = fx1 - fx0, fy1 - fy0
A = np.array([warp_roi(F, M1[i], fx0, fy0, fw, fh) for i, F in enumerate(FR)])
sd = cv2.GaussianBlur(A.astype(np.float32).std(0).mean(2), (0, 0), 6)
hint = [float(v) for v in sys.argv[5].split(',')] if len(sys.argv) > 5 else None
if hint and len(hint) == 4:   # explicit search window x0,y0,x1,y1
    wx0, lo, wx1, hi = int(hint[0] - fx0), int(hint[1] - fy0), int(hint[2] - fx0), int(hint[3] - fy0)
    sd2 = np.zeros_like(sd); sd2[lo:hi, wx0:wx1] = sd[lo:hi, wx0:wx1]; sd = sd2
elif hint:   # search only a window around the hinted mouth centre (keeps blinking eyes / body out)
    wx0 = int(max(0, hint[0] - fx0 - fw * 0.22)); wx1 = int(min(fw, hint[0] - fx0 + fw * 0.22)); lo = int(max(0, hint[1] - fy0 - fh * 0.16)); hi = int(min(fh, hint[1] - fy0 + fh * 0.16))
    sd2 = np.zeros_like(sd); sd2[lo:hi, wx0:wx1] = sd[lo:hi, wx0:wx1]; sd = sd2
else: lo = int(fh * 0.40)
sub = sd[lo:]; thr = sub.max() * 0.45
m = (sub >= thr).astype(np.uint8); n, lab, st, _ = cv2.connectedComponentsWithStats(m)
k = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA] * [sub[lab == j].mean() for j in range(1, n)])
bx, by, bw, bh = st[k, :4]
cx, cy = fx0 + bx + bw / 2, fy0 + lo + by + bh / 2
mw, mh = max(bw * 1.25, fw * 0.16), max(bh * 1.25, fh * 0.09)          # mouth half-box incl. jaw motion
mx0, my0, mx1, my1 = int(cx - mw / 2), int(cy - mh / 2), int(cx + mw / 2), int(cy + mh / 2)
mask = np.full(G[0].shape, 255, np.uint8)
mask[max(0, int((my0 - fy0 - 10) * s)):int((my1 - fy0 + 10) * s), max(0, int((mx0 - fx0 - 10) * s)):int((mx1 - fx0 + 10) * s)] = 0
MR, cc = track(mask)
# pass 3: LOCAL refinement on the lower face around the mouth (nose, cheeks, jaw line; mouth interior masked) at full res,
# starting from the face track -> sub-pixel alignment where the swap happens (kills double-mustache ghosts)
lw, lh = int((mx1 - mx0) * 1.1), int((my1 - my0) * 0.9)
lx0, ly0 = max(0, mx0 - lw), max(0, my0 - lh); lx1, ly1 = min(W, mx1 + lw), min(H, my1 + lh)
def crop_al(I, M): 
    M2 = M.copy(); M2[:, 2] = M[:, 2] + M[:, :2] @ np.array([lx0, ly0], float)
    return cv2.GaussianBlur(cv2.cvtColor(cv2.warpAffine(I, M2, (lx1 - lx0, ly1 - ly0), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE), cv2.COLOR_BGR2GRAY).astype(np.float32), (3, 3), 0)
R0 = crop_al(FR[0], np.eye(2, 3)); lm = np.full(R0.shape, 255, np.uint8)
ix0, iy0 = int(mx0 - lx0 + (mx1 - mx0) * 0.08), int(my0 - ly0 + (my1 - my0) * 0.1); lm[iy0:int(my1 - ly0 + (my1 - my0) * 0.35), ix0:int(mx1 - lx0 - (mx1 - mx0) * 0.08)] = 0
MR2, cc2 = [], []
for i, F in enumerate(FR):
    Ri = crop_al(F, MR[i]); D = np.eye(2, 3, dtype=np.float32)
    try: c2, D = cv2.findTransformECC(R0, Ri, D, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5), lm, 3)
    except cv2.error: c2 = -1
    if c2 < 0.6 or abs(D[0, 2]) > 25 or abs(D[1, 2]) > 25: D = np.eye(2, 3, dtype=np.float32)
    # compose: frame0 p -> local crop q = p - l0 -> D -> crop of aligned i -> MR[i]
    Tl = np.array([[1, 0, -lx0], [0, 1, -ly0], [0, 0, 1.]]); Fm = np.vstack([MR[i], [0, 0, 1]]) @ np.linalg.inv(Tl) @ np.vstack([D, [0, 0, 1]]) @ Tl
    MR2.append(Fm[:2]); cc2.append(c2)
MR = np.array(MR2); cc = np.minimum(cc, np.array(cc2))
k9 = cv2.getGaussianKernel(9, 1.0).ravel(); P = MR.reshape(N, 6); Pp = np.pad(P, ((4, 4), (0, 0)), mode='edge')
MS = np.array([np.convolve(Pp[:, j], k9, 'valid') for j in range(6)]).T.reshape(N, 2, 3)
np.save(f'{od}/track.npy', MS); np.save(f'{od}/track_raw.npy', MR); np.save(f'{od}/cc.npy', cc)
c = np.array([cx, cy, 1]); traj = np.array([mm @ c for mm in MR]); trs = np.array([mm @ c for mm in MS])
jit = float(np.sqrt(((traj - trs) ** 2).sum(1).mean()))
# aligned crops (sprite region = mouth box + margin) and features
pad = int(max(mw, mh) * 0.45); rx0, ry0, rw, rh = mx0 - pad, my0 - pad, (mx1 - mx0) + 2 * pad, (my1 - my0) + 2 * pad
C = np.array([warp_roi(F, MR[i], rx0, ry0, rw, rh) for i, F in enumerate(FR)])
np.savez_compressed(f'{od}/crops.npz', crops=C, roi=np.array([rx0, ry0, rw, rh]))
ring = np.zeros((rh, rw), bool); ring[:pad // 2, :] = True                   # skin band above the mouth box (cheeks/upper lip)
inner = np.zeros((rh, rw), bool); inner[pad:pad + (my1 - my0), pad:pad + (mx1 - mx0)] = True
feat = []
for i, cr in enumerate(C):
    L = cv2.cvtColor(cr, cv2.COLOR_BGR2HLS).astype(float); lum, sat = L[..., 1], L[..., 2]
    sk = np.median(lum[ring]); dark = (lum < sk * 0.55) & inner; teeth = (lum > max(sk * 1.35, 170)) & (sat < 90) & inner
    om = (dark | teeth).astype(np.uint8); ys, xs = np.nonzero(om)
    feat.append((dark.sum() + teeth.sum(), teeth.sum(), (xs.max() - xs.min() + 1) if len(xs) else 0, (ys.max() - ys.min() + 1) if len(ys) else 0))
feat = np.array(feat, float); open_ = feat[:, 0]; ht = feat[:, 3]
ok = cc > max(0.80, np.percentile(cc, 10) - 0.02)                             # drop badly tracked / occluded frames
o = (open_ - np.percentile(open_[ok], 3)) / max(1, np.percentile(open_[ok], 97) - np.percentile(open_[ok], 3))
w = feat[:, 2] / max(1, np.percentile(feat[ok, 2], 95)); tt = feat[:, 1] / max(1, feat[:, 0].max())
asp = ht / np.maximum(feat[:, 2], 1)                                          # tall/narrow = rounded
idx = np.flatnonzero(ok); pick = {}
def choose(name, cond, key):
    cand = [i for i in idx if cond(i) and i not in pick.values()]
    if cand: pick[name] = int(min(cand, key=key))
pick['X'] = 0                                                                 # rest = Kling first frame (the approved still)
choose('A', lambda i: o[i] < 0.15, lambda i: w[i])                           # pressed lips (M/B/P)
choose('D', lambda i: o[i] > 0.75, lambda i: -o[i])                          # wide open (AA)
choose('C', lambda i: 0.45 < o[i] < 0.85, lambda i: -w[i] - 0.3 * tt[i])     # open, wide (EH)
choose('E', lambda i: 0.35 < o[i] < 0.8, lambda i: -asp[i])                  # rounded (AO/ER)
choose('B', lambda i: 0.12 < o[i] < 0.5, lambda i: -tt[i] - 0.5 * w[i])      # slightly open, teeth (K/S/T/EE)
choose('F', lambda i: 0.12 < o[i] < 0.5, lambda i: w[i] - 0.5 * asp[i])      # puckered (UW/OO)
fb = {'A': 'X', 'B': 'C', 'C': 'B', 'D': 'C', 'E': 'C', 'F': 'E', 'X': 'A'}
for v in 'XABCDEF':
    if v not in pick:
        for alt in (fb[v], 'C', 'B', 'X'):
            if alt in pick: pick[v] = pick[alt]; break
pick['G'] = pick['B']; pick['H'] = pick['C']                                 # extended shapes: fallbacks
for v, i in pick.items(): cv2.imwrite(f'{od}/sprites/{v}.png', C[i])
talk = float(np.std(o[ok]))
info = dict(clip=os.path.basename(clip), who=who, frames=N, size=[W, H], face_box=box, mouth_box=[mx0, my0, mx1, my1], mouth_center=[round(cx, 1), round(cy, 1)],
            sprite_roi=[int(rx0), int(ry0), int(rw), int(rh)], visemes={k: int(v) for k, v in sorted(pick.items())},
            track=dict(cc_min=round(float(cc.min()), 3), cc_mean=round(float(cc.mean()), 3), jitter_px_rms=round(jit, 2),
                       mouth_x=[round(float(traj[:, 0].min()), 1), round(float(traj[:, 0].max()), 1)], mouth_y=[round(float(traj[:, 1].min()), 1), round(float(traj[:, 1].max()), 1)],
                       scale=[round(float(min(np.sqrt(abs(np.linalg.det(mm[:, :2]))) for mm in MR)), 3), round(float(max(np.sqrt(abs(np.linalg.det(mm[:, :2]))) for mm in MR)), 3)]),
            openness=[round(float(x), 3) for x in o], ok_frames=int(ok.sum()), mouth_activity=round(talk, 3))
json.dump(info, open(f'{od}/mouth.json', 'w'))
print(who, os.path.basename(clip), 'mouth', info['mouth_box'], 'cc %.3f/%.3f' % (cc.min(), cc.mean()), 'jit %.2f' % jit, 'act %.2f' % talk, info['visemes'])
