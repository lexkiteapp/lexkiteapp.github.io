"""insqc.py (9:16 or 16:9) <clip.mp4> <sheet.jpg> – ambient insert gate: loop seam (first≈last), no cut/jump, motion present but small, sheet of 12 frames."""
import cv2, sys, numpy as np
cap = cv2.VideoCapture(sys.argv[1]); fr = []
while True:
    ok, f = cap.read()
    if not ok: break
    P = f.shape[0] > f.shape[1]; fr.append(cv2.resize(f, (270, 480) if P else (480, 270)))
g = [cv2.GaussianBlur(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (3, 3), 0).astype(float) for f in fr]
d = np.array([np.abs(g[i + 1] - g[i]).mean() for i in range(len(g) - 1)])
seam = np.abs(g[0] - g[-1]).mean(); drift = max(np.abs(x - g[0]).mean() for x in g)
ok = {'seam first≈last (< 3)': seam < 3, 'no cut (max step < 6)': d.max() < 6, 'moves (drift > 0.6)': drift > .6, 'subtle (drift < 25)': drift < 25}
for k, v in ok.items(): print(('PASS ' if v else 'FAIL ') + k)
print(f'frames {len(fr)} seam {seam:.2f} maxstep {d.max():.2f} drift {drift:.2f}')
idx = np.linspace(0, len(fr) - 1, 12).astype(int); s = [cv2.resize(fr[i], (180, 320) if P else (320, 180)) for i in idx]
cv2.imwrite(sys.argv[2], np.vstack([np.hstack(s[:6]), np.hstack(s[6:])]))
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL')
