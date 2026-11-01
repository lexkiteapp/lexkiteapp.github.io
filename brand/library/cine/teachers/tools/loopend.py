# loopend.py <clip> [lo hi] : frame-0 distance (270x480) per candidate loop end, prints the best 5
import cv2, sys, numpy as np
cap = cv2.VideoCapture(sys.argv[1]); F = []
while True:
    ok, x = cap.read()
    if not ok: break
    F.append(cv2.resize(x, (270, 480)).astype(int))
lo, hi = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (len(F) - 48, len(F) - 1)
d = sorted((float(np.abs(F[0] - F[j]).mean()), j) for j in range(lo, hi + 1)); print([(j, round(v, 2)) for v, j in d[:5]])
