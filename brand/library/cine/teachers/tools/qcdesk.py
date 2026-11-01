# qcdesk.py <clip> <out.jpg> <fx0,fy0,fx1,fy1 face box in 1080x1920> : band intrusion (caption band x36-936 y1237-1497 vs frame 0) + 24 face crops sheet for the eye review
import sys, cv2, numpy as np
from PIL import Image
cap = cv2.VideoCapture(sys.argv[1]); F = []
while True:
    ok, x = cap.read()
    if not ok: break
    F.append(cv2.resize(x, (1080, 1920)))
b0 = F[0][1237:1497, 36:936].astype(int); worst = (0, 0)
for i, f in enumerate(F):
    m = (np.abs(f[1237:1497, 36:936].astype(int) - b0).max(2) > 40).sum()
    if m > worst[0]: worst = (m, i)
print('frames', len(F), 'band changed px max', worst[0], 'at', worst[1])
x0, y0, x1, y1 = [int(v) for v in sys.argv[3].split(',')]; idx = np.linspace(0, len(F) - 1, 24).astype(int)
c = [cv2.resize(F[i][y0:y1, x0:x1], (200, int(200 * (y1 - y0) / (x1 - x0)))) for i in idx]
for k, i in enumerate(idx): cv2.putText(c[k], str(i), (4, 18), 0, 0.6, (0, 0, 255), 2)
rows = [np.hstack(c[r * 8:(r + 1) * 8]) for r in range(3)]
Image.fromarray(np.vstack(rows)[..., ::-1]).save(sys.argv[2], quality=80)
