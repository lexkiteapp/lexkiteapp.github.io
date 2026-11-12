# eyes.py <clip> <meta/clip/who> <x0,y0,x1,y1 eye ROI in frame-0 source px> [usable_end] : sclera-white ratio per frame (ECC face track from bank.py), closed = < 35 % of frame 0
import sys, cv2, numpy as np
cap = cv2.VideoCapture(sys.argv[1]); T = np.load(f'{sys.argv[2]}/track.npy'); x0, y0, x1, y1 = [int(v) for v in sys.argv[3].split(',')]; r = []
i = 0; import os; MODE = os.environ.get("EYES", "white")   # dark = pupil pixels (dot eyes without sclera, e.g. Ruth)
while True:
    ok, F = cap.read()
    if not ok or i >= len(T): break
    M = np.vstack([T[i], [0, 0, 1]]); W = cv2.warpAffine(F, M[:2], (F.shape[1], F.shape[0]), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)
    R = W[y0:y1, x0:x1].astype(int); r.append(((R.max(2) < 70) if MODE == "dark" else (R.min(2) > 215)).mean()); i += 1
r = np.array(r) / max(r[0], 1e-6); ue = int(sys.argv[4]) if len(sys.argv) > 4 else len(r) - 1
c = r < 0.35; print('closed frames all %.0f%%' % (100 * c.mean()), 'usable 0-%d %.0f%%' % (ue, 100 * c[:ue + 1].mean()), 'runs', [i for i in range(1, len(c)) if c[i] != c[i - 1]])
