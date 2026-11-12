# bg3d.py - "3D Ken Burns" for the news template (after Niklaus et al. 2019 / classic 2.5D parallax): a STILL background split into 3 depth
# layers (Depth-Anything-V2-Small, computed on CI -> news/depth/<bg>.depth.png), disocclusions filled by inpainting each farther layer, then a
# virtual camera (dolly / truck / crane / roll <= 0.6 deg, eased) renders the layers with depth-scaled parallax. Plus screen-blended warm
# bokeh "fireflies" (glow core + bloom, depth-of-field size, twinkle, turbulence), vignette. numpy/cv2 only, 2 threads.
import os, numpy as np, cv2
cv2.setNumThreads(2)
CW, CH = 1350, 2400                      # working canvas (1.33x the output, owner 22/10: push-in from an oversampled bg, one Lanczos resample)
PK = (0.82, 0.91, 1.0)                   # parallax factor far / mid / near (owner 21/10: mild, artefact-free)
def ease(u): u = min(1.0, max(0.0, u)); return u * u * (3 - 2 * u)
class Layers:
    def __init__(self, img_path, depth_path, dof=(0.5, 0.35, 0.0), img=None):   # owner 22/10: cel-style stills stay crisp (DOF <= 0.5 px); img: pre-graded still
        im0 = cv2.imread(img_path) if img is None else img; im = cv2.resize(im0, (CW, CH), interpolation=cv2.INTER_AREA if im0.shape[1] >= CW else cv2.INTER_LANCZOS4)
        d = cv2.resize(cv2.imread(depth_path, cv2.IMREAD_UNCHANGED).astype(np.float32) / 65535, (CW, CH))
        d = cv2.GaussianBlur(d, (0, 0), 3); q1, q2 = np.quantile(d, 0.55), np.quantile(d, 0.84)
        sm = lambda x, a, b: np.clip((x - a) / (b - a), 0, 1)
        m_mid = sm(d, q1 - 0.02, q1 + 0.02); m_near = sm(d, q2 - 0.02, q2 + 0.02)            # soft layer alphas (mid includes near)
        def fill(src, region):   # edge-aware fill of what a nearer layer hides (half-res Telea, pasted only inside the region)
            r = cv2.dilate((region > 0.5).astype(np.uint8), np.ones((25, 25), np.uint8))
            sh = cv2.resize(src, (CW // 2, CH // 2)); rh = cv2.resize(r, (CW // 2, CH // 2), interpolation=cv2.INTER_NEAREST)
            f = cv2.resize(cv2.inpaint(sh, rh, 9, cv2.INPAINT_TELEA), (CW, CH)); out = src.copy(); out[r > 0] = f[r > 0]; return out, r
        mid_img, self.hole_mid = fill(im, m_near); far_img, self.hole_far = fill(mid_img, m_mid)
        self.L = [((cv2.GaussianBlur(far_img, (0, 0), dof[0]) if dof[0] else far_img).astype(np.float32), None),
                  ((cv2.GaussianBlur(mid_img, (0, 0), dof[1]) if dof[1] else mid_img).astype(np.float32), cv2.GaussianBlur(m_mid, (0, 0), 2)),
                  ((cv2.GaussianBlur(im, (0, 0), dof[2]) if dof[2] else im).astype(np.float32), cv2.GaussianBlur(m_near, (0, 0), 2))]
        self.holes = [self.hole_far.astype(np.float32), self.hole_mid.astype(np.float32), None]
    def render(self, cam, qa=False):
        """cam: z (dolly, >= 1.05), tx, ty (output px), rot (deg). Returns BGR float32 1080x1920 (+ visible-fill fraction, uncovered fraction)."""
        out = None; vis = None; cov = None
        for k, ((img, al), pk) in enumerate(zip(self.L, PK)):
            z = cam['z'] ** (0.55 + 0.9 * pk); k_ = 1080 / CW
            M = cv2.getRotationMatrix2D((CW / 2, CH / 2), cam['rot'] * (0.6 + 0.4 * pk), z)
            M[0, 2] += -cam['tx'] * pk / k_; M[1, 2] += -cam['ty'] * pk / k_
            S = np.float32([[k_, 0, 540 - k_ * CW / 2], [0, k_, 960 - k_ * CH / 2]])   # canvas centre -> output
            A = (np.vstack([S, [0, 0, 1]]) @ np.vstack([M, [0, 0, 1]]))[:2]
            w = cv2.warpAffine(img, A, (1080, 1920), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT)
            if qa and k == 0: cov = float((cv2.warpAffine(np.ones((CH, CW), np.float32), A, (1080, 1920), borderValue=0) < 0.99).mean())
            if al is None: out = w; vis = cv2.warpAffine(self.holes[0], A, (1080, 1920)) if qa else None
            else:
                a = cv2.warpAffine(al, A, (1080, 1920))[..., None]; out = w * a + out * (1 - a)
                if qa:
                    vis = vis * (1 - a[..., 0])
                    if self.holes[k] is not None: vis = np.maximum(vis, cv2.warpAffine(self.holes[k], A, (1080, 1920)) * (1 - cv2.warpAffine(self.L[2][1], A, (1080, 1920))))
        return (out, float((vis > 0.5).mean()), float(cov)) if qa else out
# warm bokeh / fireflies: 18 particles with depth z (size + blur), slow drift + turbulence, individual twinkle; screen blend
class Bokeh:
    def __init__(self, n=12, seed=11):
        r = np.random.default_rng(seed); self.n = n
        self.x, self.y = r.uniform(40, 1040, n), r.uniform(180, 1760, n); self.z = r.uniform(0, 1, n)
        self.vx, self.vy = r.uniform(-6, 6, n), r.uniform(-14, -4, n); self.ph = r.uniform(0, 6.28, n); self.fr = r.uniform(0.25, 0.7, n)
        self.tint = [np.array(c, np.float32) for c in r.choice([(150, 210, 255), (120, 190, 255), (180, 225, 255)], n)]
        self.spr = {}
    def sprite(self, r):
        r = max(2, int(round(r)))
        if r not in self.spr:
            g = np.arange(-4 * r, 4 * r + 1, dtype=np.float32); X, Y = np.meshgrid(g, g); R2 = X ** 2 + Y ** 2
            self.spr[r] = np.exp(-R2 / (2 * r * r)) + 0.22 * np.exp(-R2 / (2 * (2.6 * r) ** 2))   # glow core + bloom
        return self.spr[r]
    def apply(self, B, t):
        L = np.zeros((1920, 1080, 3), np.float32)
        for i in range(self.n):
            x = (self.x[i] + self.vx[i] * t + 9 * np.sin(0.7 * t + self.ph[i])) % 1080; y = 180 + (self.y[i] - 180 + self.vy[i] * t + 6 * np.cos(0.5 * t + 2 * self.ph[i])) % 1580
            tw = max(0.0, np.sin(self.ph[i] + self.fr[i] * t * 2 * np.pi)) ** 1.5; a = (0.12 + 0.18 * (1 - self.z[i])) * tw * UI[min(1919, int(y))] * (0.0 if 330 < x < 750 and 120 < y < 1000 else 1.0)   # fade near UI zones, never behind the face area
            if a < 0.01: continue
            sp = self.sprite(2.5 + 3.5 * self.z[i]); h = sp.shape[0] // 2; x0, y0 = int(x) - h, int(y) - h
            if any(x0 < z[2] and x0 + 2 * h > z[0] and y0 < z[3] and y0 + 2 * h > z[1] for z in getattr(self, 'avoid', [])): continue   # never touches UI / faces
            xa, ya, xb, yb = max(0, x0), max(0, y0), min(1080, x0 + sp.shape[1]), min(1920, y0 + sp.shape[0])
            if xb > xa and yb > ya: L[ya:yb, xa:xb] += (a * sp[ya - y0:yb - y0, xa - x0:xb - x0])[..., None] * (self.tint[i] / 255)
        return 255 - (255 - B) * (1 - np.minimum(L, 1))
UI = np.clip(1 - np.maximum(0, 1 - np.abs(np.arange(1920) - 1250) / 330.0) * 1.6, 0, 1)   # cards / caption / lower-third band y 1000-1500 -> 0
_Y, _X = np.mgrid[0:1920, 0:1080].astype(np.float32)
VIG = (1 - 0.16 * (((_X - 540) / 540) ** 2 + ((_Y - 960) / 960) ** 2) ** 1.2)[..., None].clip(0.7, 1)
