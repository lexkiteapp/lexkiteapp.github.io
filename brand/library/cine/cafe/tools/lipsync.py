# Zero-credit mouth swap + clean-up for one bank clip -> shot frames (BGR, 1080x1920, 24 fps)
# Visemes come from Rhubarb JSON (run on CI). Sprites = aligned mouth crops harvested from the SAME clip (bank meta).
import cv2, numpy as np, json, os
FPS = 24
WM_CROP = (0, 0, 1080, 1916)           # watermark-free originals (urlWithoutWatermark): full frame; 1916-px clips -> 1920 (+0.2 %)
def load_meta(d):
    m = json.load(open(f'{d}/mouth.json')); z = np.load(f'{d}/crops.npz')
    return m, np.load(f'{d}/track.npy'), z['crops'], z['roi']
def cues_at(cues, t):
    v = 'X'
    for c in cues:
        if c['start'] <= t + 1e-6: v = c['value']
    return v
class Mouth:
    def __init__(self, d):
        self.m, self.MS, self.C, roi = load_meta(d); self.rx0, self.ry0, self.rw, self.rh = [int(v) for v in roi]
        mx0, my0, mx1, my1 = self.m['mouth_box']; cx, cy = (mx0 + mx1) / 2 - self.rx0, (my0 + my1) / 2 - self.ry0
        ax, ay = (mx1 - mx0) / 2 * 1.25, (my1 - my0) / 2 * 1.5; cy += (my1 - my0) * 0.12   # cover the full jaw-drop extent
        E = np.zeros((self.rh, self.rw), np.float32); cv2.ellipse(E, (int(cx), int(cy)), (int(ax), int(ay)), 0, 0, 360, 1, -1)
        # change-extent mask: every pixel where ANY frame's mouth differs from the rest frame (jaw drop, tongue, teeth),
        # limited to a big ellipse -> the swap always fully covers Kling's own mouth (no ghost of the original)
        big = np.zeros((self.rh, self.rw), np.uint8); cv2.ellipse(big, (int(cx), int(cy)), (int(ax * 1.7), int(ay * 2.0)), 0, 0, 360, 1, -1)
        cc = np.load(f'{d}/cc.npy') if os.path.exists(f'{d}/cc.npy') else np.ones(len(self.C)); good = cc >= 0.8
        d = np.abs(self.C[good].astype(np.int16) - self.C[0].astype(np.int16)).max(3) > 45
        ext = ((d.sum(0) >= 3) & (big > 0)).astype(np.uint8)
        ext = cv2.dilate(cv2.morphologyEx(ext, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)), np.ones((9, 9), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(ext); keep = np.zeros_like(ext)
        for j in range(1, n):
            if (E[lab == j] > 0.5).any(): keep[lab == j] = 1   # only change regions connected to the mouth itself
        self.E = cv2.GaussianBlur(np.maximum(E, keep.astype(np.float32)), (0, 0), 3.5)
        R = np.zeros((self.rh, self.rw), np.uint8); cv2.ellipse(R, (int(cx), int(cy)), (int(ax * 1.45), int(ay * 1.6)), 0, 0, 360, 1, -1)
        cv2.ellipse(R, (int(cx), int(cy)), (int(ax * 1.1), int(ay * 1.15)), 0, 0, 360, 0, -1); self.ring = R > 0
        self.spr = {v: self.C[i].astype(np.float32) for v, i in self.m['visemes'].items()}
    def mat(self, i):  # frame0-ROI coords -> frame i coords (for warpAffine with WARP_INVERSE_MAP we need the inverse)
        M = np.vstack([self.MS[min(i, len(self.MS) - 1)], [0, 0, 1]]); O = np.array([[1, 0, self.rx0], [0, 1, self.ry0], [0, 0, 1.]])
        return np.linalg.inv(M @ O)[:2]
    def aligned(self, F, i):
        M = self.MS[min(i, len(self.MS) - 1)].copy(); M[:, 2] = M[:, 2] + M[:, :2] @ np.array([self.rx0, self.ry0], float)
        return cv2.warpAffine(F, M, (self.rw, self.rh), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
    def apply(self, F, i, sprite):
        H, W = F.shape[:2]; A = self.mat(i); tgt = self.aligned(F, i).astype(np.float32)
        g = np.clip(np.median(tgt[self.ring], 0) / np.maximum(np.median(sprite[self.ring], 0), 1), 0.88, 1.12)   # per-frame colour match
        S = cv2.warpAffine(np.clip(sprite * g, 0, 255), A, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE)
        a = cv2.warpAffine(self.E, A, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP)[..., None]
        return (F * (1 - a) + S * a).astype(np.uint8)
def board_blur(F):
    """Chalkboard menu text (Kling gibberish) -> defocused: navy boards in the top 45 % get a strong blur."""
    H = F.shape[0]; top = F[:int(H * 0.45)]
    hsv = cv2.cvtColor(top, cv2.COLOR_BGR2HSV)
    navy = ((hsv[..., 0] >= 95) & (hsv[..., 0] <= 150) & (hsv[..., 1] >= 25) & (hsv[..., 2] >= 25) & (hsv[..., 2] <= 215)).astype(np.uint8)   # incl. sun-lit board
    m = cv2.morphologyEx(navy, cv2.MORPH_CLOSE, np.ones((35, 35), np.uint8))
    n, lab, st, _ = cv2.connectedComponentsWithStats(m); keep = np.zeros_like(m)
    for j in range(1, n):
        if st[j, cv2.CC_STAT_AREA] > 6000 and st[j, cv2.CC_STAT_TOP] < 12: keep[lab == j] = 1   # boards hang from the top edge; apron never does
    ys = np.nonzero(keep)[0]
    if len(ys):   # everything above the board ledge except heads (hair / skin, dilated) -> also catches sun-washed lettering
        ledge = int(np.percentile(ys, 97)); reg = np.zeros_like(keep); reg[:ledge] = 1
        h0, s0, v0 = hsv[..., 0].astype(int), hsv[..., 1].astype(int), hsv[..., 2].astype(int)
        prot = (v0 < 45) | ((h0 >= 2) & (h0 <= 25) & (s0 > 70) & (v0 > 70))
        prot = cv2.morphologyEx(prot.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)); prot = cv2.dilate(prot, np.ones((13, 13), np.uint8))
        keep = np.maximum(keep, reg) & (1 - prot)   # heads always protected
    keep = cv2.erode(keep, np.ones((3, 3), np.uint8)); a = cv2.GaussianBlur(keep.astype(np.float32), (0, 0), 3)[..., None]
    B = cv2.GaussianBlur(top, (0, 0), 12)
    out = F.copy(); out[:int(H * 0.45)] = (top * (1 - a) + B * a).astype(np.uint8); return out
def finish(F, crop=None):
    x, y, w, h = crop or WM_CROP; return cv2.resize(F[y:y + h, x:x + w], (1080, 1920), interpolation=cv2.INTER_LANCZOS4)
DELAY = -0.005   # shape chosen at the frame's display start + 5 ms -> onset error within about -36..+5 ms at 24 fps
def viseme_at(lines, t, delay=None):
    delay = DELAY if delay is None else delay
    """lines: [{cues, at (shot time of wav start), tempo}] -> Rhubarb shape at shot time t (X outside speech)."""
    for ln in lines:
        ta = (t - ln['at'] - delay) * ln.get('tempo', 1.0)
        if 0 <= ta <= ln['cues'][-1]['end']: return cues_at(ln['cues'], ta)
    return 'X'
def render(clip, frames, speakers=(), boards=False, crop=None):
    """frames: list of source frame indices (any order: reverse/holds ok). speakers: [{mouth, lines}] ; lines=[] => mouth held closed (X).
    Hard switch between shapes on frame boundaries (no half-blend frames)."""
    cap = cv2.VideoCapture(clip); FR = []
    while True:
        ok, F = cap.read()
        if not ok: break
        FR.append(F)
    out, log = [], []
    for f, i in enumerate(frames):
        i = min(i, len(FR) - 1); F = FR[i]; rec = {}
        for k, sp in enumerate(speakers):
            mo = sp['mouth']; v = viseme_at(sp['lines'], f / FPS); F = mo.apply(F, i, mo.spr[v]); rec[k] = v
            core = mo.E > 0.9; al = mo.aligned(F, i).astype(np.float32)   # pixel check: does the frame really show the sprite?
            rec['r%d' % k] = round(float(np.abs(al[core] - mo.spr[v][core]).mean()), 2)
        if boards: F = board_blur(F)
        out.append(finish(F, crop)); log.append(rec)
    return out, log
