"""qc2.py <clip.mp4> <first.png> <sheet.jpg>  – 3D bank v2 clip check (owner 27/10: no drift, same face, back to the start pose)
body mask = pixels that differ from the blank board/wall model of the first frame's left side is unreliable; use the person's dark/saturated pixels
inside the right 60 % of the frame and track their centre and top edge (head top)."""
import cv2, sys, numpy as np
src, first, sheet = sys.argv[1:4]
F0 = cv2.resize(cv2.imread(first), (1080, 1920))
cap = cv2.VideoCapture(src); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    fr.append(cv2.resize(f, (1080, 1920)))
n = len(fr)
def person(f):   # saturated or dark pixels (clothes, skin, hair) – the board and wall are bright and low-saturation
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV); m = ((hsv[..., 1] > 70) | (hsv[..., 2] < 90)); m[1700:] = False; m[:, :300] = False
    m = cv2.morphologyEx(m.astype(np.uint8), cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)) > 0
    ys, xs = np.nonzero(m); return (float(np.median(xs)), float(np.percentile(ys, 1))) if len(xs) > 5000 else (None, None)
def headx(f):   # hair + beard/face shadow = the darkest pixels in the head band (robust to hand gestures and saturated clothes)
    g = cv2.cvtColor(f[300:1150, 300:], cv2.COLOR_BGR2GRAY); ys, xs_ = np.nonzero(g < 55); return float(np.median(xs_)) + 300 if len(xs_) > 800 else None
x0, y0 = person(F0); hx0 = headx(F0); xs = []; tops = []; hxs = []
for f in fr[::4]:
    x, y = person(f); xs.append(x); tops.append(y); hxs.append(headx(f))
hs = lambda f: cv2.normalize(cv2.calcHist([cv2.cvtColor(f, cv2.COLOR_BGR2HSV)], [0, 1], None, [30, 32], [0, 180, 0, 256]), None)
xi, yi = int(x0), int(y0); hb = (max(0, yi - 20), yi + 420, max(0, xi - 260), xi + 260)
ref = hs(F0[hb[0]:hb[1], hb[2]:hb[3]]); ids = [float(cv2.compareHist(ref, hs(f[hb[0]:hb[1], hb[2]:hb[3]]), 0)) for f in fr[::4]]
g = lambda f: cv2.cvtColor(cv2.resize(f, (270, 480)), cv2.COLOR_BGR2GRAY).astype(float)
d = np.array([np.abs(g(fr[i + 1]) - g(fr[i])).mean() for i in range(n - 1)]); med = float(np.median(d))
end_d = float(np.abs(g(fr[-1]) - g(F0)).mean()); best_end = min(range(max(0, n - 72), n), key=lambda i: np.abs(g(fr[i]) - g(F0)).mean())
dx = max(abs(v - x0) for v in xs if v is not None); dy = max(abs(v - y0) for v in tops if v is not None)
hv = [v for v in hxs if v is not None]; hrange = max(hv) - min(hv); hend = abs(hv[-1] - hx0)
ok = hrange <= 160 and hend <= 100 and d.max() <= 6.0 and int((d < 0.05).sum()) == 0   # head stays put: calibrated 27/10 on known clips – drift fails 263 (a05) / 310 (c04l), good clips 61-133 (dark navy blazer adds to Carlos), no hard jump (max frame diff), no frozen frames; identity: renderer gate with the bank head box
print(f"{src}: head_x_range {hrange:.0f} head_end_shift {hend:.0f} max_frame_diff {d.max():.2f} frozen {int((d < 0.05).sum())} | frames {n} drift_x {dx:.0f} drift_top {dy:.0f} id_min {min(ids):.3f} jumps {int((d > max(4 * med, 1.5)).sum())} end_diff {end_d:.1f} best_end f{best_end} -> {'PASS' if ok else 'FAIL'}")
idx = np.linspace(0, n - 1, 12).astype(int)
t = [cv2.putText(cv2.resize(fr[i], (180, 320)), str(i), (5, 20), 0, 0.6, (0, 0, 255), 2) for i in idx]
cv2.imwrite(sheet, np.vstack([np.hstack(t[:6]), np.hstack(t[6:])]))
