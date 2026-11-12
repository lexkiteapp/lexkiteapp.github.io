"""qc_green.py – gate for gesture-bank clips/stills on the #00B140-style green screen (05/11 pilot gc11_point).
qc2.py / check_first.py assume the right-third whiteboard layout and treat green as "person" → useless here.

  still: qc_green.py still <pose.png> <ref.png>                 – pose still vs the locked first frame (same scale/place, clean green)
  clip : qc_green.py clip <clip.mp4> <first.png> [<tail.png>] <sheet.jpg>
         first = locked hands-down frame; tail = approved pose still when the clip was made first→tail (Kling tail_image).
         The tail match is what makes the GESTURE checkable: a clip that ends on the approved still cannot have drifted into
         another gesture (05/11: no tail → v2_5 made hand-on-heart + wave instead of 'point').

Mask = everything that is NOT green-screen (hue 35–90 in OpenCV units, saturation > 90). Checks (exit 1 on any FAIL):
  feet/legs planted (bottom-row person columns ≈ first), head top and scale within tolerance, background clean (no non-green
  blobs away from the person), no single-frame cut/glitch, start ≈ first, end ≈ tail (or ≈ first), mouth stays closed
  (dark pixels inside the mouth box below the moustache, tracked from the head box, ≤ first + margin).
Hands (5 fingers), identity and LIPS (face strip at the bottom of the sheet) stay an eye check (docs/CREDIT-RULES.md §3.9):
05/11 gc11_concern passed every metric twice while the lips parted showing teeth."""
import cv2, sys, numpy as np

W, H = 540, 960


def load(p):
    return cv2.resize(cv2.imread(p), (W, H))


def mask(f):
    hsv = cv2.cvtColor(f, cv2.COLOR_BGR2HSV)
    g = (hsv[..., 0] >= 35) & (hsv[..., 0] <= 90) & (hsv[..., 1] > 90)
    m = (~g).astype(np.uint8)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m)
    if n < 2: return m > 0, 0
    big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))
    stray = int(sum(st[i, cv2.CC_STAT_AREA] for i in range(1, n) if i != big and st[i, cv2.CC_STAT_AREA] > 40))
    return lab == big, stray


def geo(f):
    m, stray = mask(f)
    ys, xs = np.nonzero(m)
    top = int(ys.min())
    legs = m[int(H * .97):].any(0).nonzero()[0]                    # trousers at the bottom edge only (hanging hands reach ~93 % height)
    head = m[top:top + int(H * .06)]                                 # hair only: a hand raised beside the face must not move the anchor
    hx = head.any(0).nonzero()[0]
    return dict(top=top, legs=(int(legs.min()), int(legs.max())) if len(legs) else (0, 0),
                head=(int(hx.min()), int(hx.max())) if len(hx) else (0, 0), stray=stray, m=m)


def mouth_dark(f, g):
    x0, x1 = g['head']; w = x1 - x0; t = g['top']
    cx = (x0 + x1) // 2; box = f[t + int(w * .97):t + int(w * 1.16), cx - int(w * .17):cx + int(w * .17)]   # w = hair width; lips: Carlos 1.00–1.16 (below the moustache), Ama 0.97–1.12
    if box.size == 0: return 0.0
    g = cv2.cvtColor(box, cv2.COLOR_BGR2GRAY)
    # 12/11: an OPEN mouth = a TALL dark gap, a closed one = a thin lip line. v4 draws the closed line darker/thicker than the locked
    # still, so 'share of dark pixels' flagged closed lips (Ama 0.09 vs 0.23, both closed by eye). Measure the gap height instead:
    # 90th percentile over columns of the longest vertical run of dark pixels (px at 960 h), + teeth (> 200) as before (05/11 concern).
    d = g < 35; runs = []
    for col in d.T:
        best = cur = 0
        for v in col: cur = cur + 1 if v else 0; best = max(best, cur)
        runs.append(best)
    return float(np.percentile(runs, 90) + 40 * (g > 200).mean())


def diff(a, b):
    """Mean grey difference over the PERSON (non-green in either frame). 12/11: v4 re-renders the green brighter and mottled
    (bg diff 8.0 vs person 3.8 on a clean start) – the green is keyed out anyway, so drift/jumps are measured on the figure."""
    s = lambda x: cv2.GaussianBlur(cv2.cvtColor(cv2.resize(x, (135, 240), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY), (3, 3), 0).astype(float)
    m = lambda x: ~(lambda h: (h[..., 0] >= 35) & (h[..., 0] <= 90) & (h[..., 1] > 90))(cv2.cvtColor(cv2.resize(x, (135, 240), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2HSV))
    u = m(a) | m(b)
    return float(np.abs(s(a) - s(b))[u].mean()) if u.any() else 0.0


def report(ok, extra=''):
    for k, v in ok.items(): print(('PASS ' if v else 'FAIL ') + k)
    if extra: print(extra)
    print('RESULT', 'PASS' if all(ok.values()) else 'FAIL'); sys.exit(0 if all(ok.values()) else 1)


if sys.argv[1] == 'still':
    P, R = load(sys.argv[2]), load(sys.argv[3]); gp, gr = geo(P), geo(R)
    ok = {'same head top (±3 % of height)': abs(gp['top'] - gr['top']) <= H * .03,
          'same legs/feet columns (±4 % of width)': all(abs(a - b) <= W * .04 for a, b in zip(gp['legs'], gr['legs'])),
          'same head width = same scale (±6 %)': abs((gp['head'][1] - gp['head'][0]) / max(1, gr['head'][1] - gr['head'][0]) - 1) <= .06,
          'clean green, no stray blobs (< 200 px)': gp['stray'] < 200}
    report(ok, f"top {gp['top']}/{gr['top']} legs {gp['legs']}/{gr['legs']} head {gp['head']}/{gr['head']} stray {gp['stray']}")

src, first = sys.argv[2], sys.argv[3]
tail = sys.argv[4] if len(sys.argv) > 5 else None
sheet = sys.argv[-1]
F0 = load(first); T0 = load(tail) if tail else F0; g0 = geo(F0); m0 = mouth_dark(F0, g0)
cap = cv2.VideoCapture(src); fr = []
while True:
    ok_, f = cap.read()
    if not ok_: break
    fr.append(cv2.resize(f, (W, H)))
n = len(fr); G = [geo(f) for f in fr[::3]]
md = [mouth_dark(f, g) for f, g in zip(fr[::3], G)]
d = np.array([diff(fr[i + 1], fr[i]) for i in range(n - 1)])
spikes = [i for i in range(2, len(d) - 2) if d[i] > 4 and d[i] > 2.0 * max(d[i - 2], d[i - 1], d[i + 1], d[i + 2])]
legdx = max(max(abs(g['legs'][0] - g0['legs'][0]), abs(g['legs'][1] - g0['legs'][1])) for g in G)
topdy = max(abs(g['top'] - g0['top']) for g in G)
m0 = max(m0, mouth_dark(fr[0], G[0]))   # closed baseline = locked still or the clip's own first frame (= that still, re-rendered)
open_frames = sum(v > m0 + 3 for v in md)   # gap ≥ 3 px taller than closed (or teeth); the sheet confirms
d_start, d_end = diff(fr[0], F0), min(diff(fr[i], T0) for i in range(max(0, n - 6), n))
ok = {'start = locked first frame (diff < 6)': d_start < 6,
      ('end = approved tail still (diff < 9)' if tail else 'end = back to the first frame (diff < 6)'): d_end < (9 if tail else 6),
      'legs/feet planted (≤ 4 % width)': legdx <= W * .04,
      'head top steady (≤ 4 % height)': topdy <= H * .04,
      'background clean (stray < 200 px every sampled frame)': max(g['stray'] for g in G) < 200,
      'no single-frame cut/glitch': not spikes,
      'mouth closed (≤ 1 sampled frame with an open-mouth dark box)': open_frames <= 1}
idx = [int(i * (n - 1) / 11) for i in range(12)]
row = lambda ii: np.hstack([cv2.resize(fr[i], (180, 320)) for i in ii])
def face(i):   # head crop from the tracked hair box: lips/teeth are an EYE check (the box metric misses parted lips when the head tilts onto the white collar)
    g = geo(fr[i]); x0, x1 = g['head']; w = x1 - x0; t = g['top']
    return cv2.resize(fr[i][max(0, t - 10):t + int(w * 1.4), max(0, x0 - int(w * .25)):x1 + int(w * .25)], (180, 180))
faces = np.hstack([face(i) for i in idx[::2]]); faces = np.pad(faces, ((0, 0), (0, 1080 - faces.shape[1]), (0, 0)), constant_values=255)
cv2.imwrite(sheet, np.vstack([row(idx[:6]), row(idx[6:]), faces]), [cv2.IMWRITE_JPEG_QUALITY, 82])
report(ok, f"frames {n} start {d_start:.1f} end {d_end:.1f} legs dx {legdx} top dy {topdy} mouth base {m0:.3f} max {max(md):.3f} open {open_frames} spikes {spikes[:5]}")
