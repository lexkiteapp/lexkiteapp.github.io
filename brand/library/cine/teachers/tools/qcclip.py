# qcclip.py <clip> <out.jpg> : 8-frame sheet + loop distance (mean abs diff of frame 0 vs each of the last 24 frames, best)
import cv2, sys, numpy as np
from PIL import Image
cap = cv2.VideoCapture(sys.argv[1]); F = []
while True:
    ok, x = cap.read()
    if not ok: break
    F.append(cv2.resize(x, (270, 480)))
N = len(F); idx = [int(i * (N - 1) / 7) for i in range(8)]
s = np.hstack([np.pad(F[i], ((0, 0), (0, 4), (0, 0)), constant_values=255) for i in idx])
Image.fromarray(s[..., ::-1]).save(sys.argv[2], quality=80)
d = [float(np.abs(F[0].astype(int) - F[j].astype(int)).mean()) for j in range(N - 48, N)]
step = [float(np.abs(F[j].astype(int) - F[j+1].astype(int)).mean()) for j in range(N - 1)]
print('frames', N, 'loop best end frame', N - 48 + int(np.argmin(d)), 'diff %.2f' % min(d), 'median step %.2f max step %.2f at %d' % (np.median(step), max(step), int(np.argmax(step))))
