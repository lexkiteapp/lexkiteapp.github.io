"""check_first.py <first.png> – gate a teacher first frame BEFORE any clip is generated (owner 27/10: know pass/fail at the image stage).
Robust profile checks on the person mask (saturated or dark pixels; the board and wall are bright and grey):
person on the right third, room above the head for the v14 card, left part = empty board, person inside the safe column.
Head size and identity are eye-checked on the sheet and gated again at render time (layout_v14 / identity)."""
import cv2, sys, numpy as np
im = cv2.resize(cv2.imread(sys.argv[1]), (1080, 1920)); hsv = cv2.cvtColor(im, cv2.COLOR_BGR2HSV)
m = ((hsv[..., 1] > 115) | (hsv[..., 2] < 90)).astype(np.uint8); m[:200] = 0; m[1500:] = 0; m[:, 1000:] = 0   # strongly saturated (skin, clothes) or dark (hair, blazer); the peach wall, grey frame and white board drop out
m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8))
rows = m[:, 300:].sum(1); top = int(np.argmax(rows > 60))                       # first row with a real slice of person (head top)
cols = m[top:top + 500].sum(0); cx = float((np.arange(1080) * cols).sum() / max(cols.sum(), 1))   # head/shoulder centre
left = m[300:1450, 60:430].mean()
ok = {'person centre on the right third (x 620-880)': 620 <= cx <= 880,
      'head top >= 420 px (room for the v14 card above the head)': top >= 420,
      'head top <= 760 px (medium shot, not too small)': top <= 760,
      'left part = empty board (< 2 % person pixels)': left < 0.02}
for k_, v in ok.items(): print(('PASS ' if v else 'FAIL ') + k_)
print(f"head top {top}, centre x {cx:.0f}, left busy {left * 100:.1f} %")
print('RESULT', 'PASS' if all(ok.values()) else 'FAIL'); sys.exit(0 if all(ok.values()) else 1)
