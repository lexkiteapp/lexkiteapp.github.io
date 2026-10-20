# Zero-credit mouth swap + clean-up for one bank clip -> shot frames (BGR, 1080x1920, 24 fps)
# Visemes come from Rhubarb JSON (run on CI). Sprites = aligned mouth crops harvested from the SAME clip (bank meta).
import cv2, numpy as np, json
FPS = 24
WM_CROP = (25, 0, 1030, 1832)          # x, y, w, h : removes the Kling watermark (y >= 1838), keeps 9:16
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
        d = np.abs(self.C.astype(np.int16) - self.C[0].astype(np.int16)).max(3) > 45
        ext = ((d.sum(0) >= 3) & (big > 0)).astype(np.uint8)
        ext = cv2.dilate(cv2.morphologyEx(ext, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)), np.ones((9, 9), np.uint8))
        n, lab, st, _ = cv2.connectedComponentsWithStats(ext); keep = np.zeros_like(ext)
        for j in range(1, n):
            if st[j, cv2.CC_STAT_AREA] > 0.15 * E.sum() or E[lab == j].any(): keep[lab == j] = 1
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
def finish(F):
    x, y, w, h = WM_CROP; return cv2.resize(F[y:y + h, x:x + w], (1080, 1920), interpolation=cv2.INTER_LANCZOS4)
def render(clip, n_frames, f_in=0, speakers=(), boards=False):
    """speakers: list of dicts {mouth: Mouth, cues: [...], lead: s, w_in: s, w_out: s, delay: 0.04}; cues=None => forced closed (X)."""
    cap = cv2.VideoCapture(clip); FR = []
    while True:
        ok, F = cap.read()
        if not ok: break
        FR.append(F)
    out, log = [], []
    prev = {}
    for f in range(n_frames):
        i = min(f_in + f, len(FR) - 1); F = FR[i]; rec = {}
        for k, sp in enumerate(speakers):
            mo = sp['mouth']; t = f / FPS
            ta = (t - sp.get('lead', 0) - sp.get('delay', 0.04)) * sp.get('tempo', 1.0) + sp.get('w_in', 0)
            v = 'X' if sp.get('cues') is None or ta < sp.get('w_in', 0) or ta > sp.get('w_out', 1e9) else cues_at(sp['cues'], ta)
            s = mo.spr[v]
            if k in prev and prev[k] != v: s = 0.5 * (mo.spr[prev[k]] + s)   # 1 blended transition frame per viseme change
            prev[k] = v
            F = mo.apply(F, i, s); rec[k] = v
        if boards: F = board_blur(F)
        out.append(finish(F)); log.append(rec)
    return out, log
