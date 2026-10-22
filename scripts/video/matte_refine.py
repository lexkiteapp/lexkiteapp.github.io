#!/usr/bin/env python3
"""matte_refine.py - edge-quality helpers for green-screen hosts (0 credits). Shared by chroma_key.py (--refine) and the news compositor.

Why (owner 22/10): keyed hosts showed stair-stepped edges and a BLACK outline. Causes found:
  1. chroma_key.py wrote colour = 0 (black) wherever alpha == 0 and expand.py copied that into kfull, so every bilinear
     resample of the colour (lipsync finish, warpAffine in news.py) mixed black into the soft edge pixels  -> dark halo.
  2. Edge pixels were only despilled by clamping G, which leaves the green share of a mixed pixel as a dark grey
     (e.g. 50 % skin + 50 % green -> G clamped -> darker than the skin)                                     -> dark rim.
  3. The matte was near-binary (forced-solid rules + MinFilter) and later morphological opens on the alpha -> jaggies.
Fix:
  refine_alpha : guided filter (guide = chroma distance to the key, i.e. the feature that separates host/green) at full res,
                 choke 1 px, feather ~1.2 px -> 1-2 px soft edge, hair stays fractional.
  unmix        : foreground colour of edge pixels F = (I - (1 - a) K) / a (K = key colour), then edge despill G <= max(R,B).
  extend_colour: colour outside the matte = nearest host colour (push-pull), never black -> straight-alpha resampling is safe.
  place        : premultiplied warp (area-downscale when scale < 1, Lanczos/linear otherwise) + composite + 2.5 px light wrap.
  edge_qa      : contour soft fraction (0 < a < 1) and edge-ring vs inner-ring luma (dark-rim test) + 400 % zoom crops.
"""
import numpy as np, cv2


def _box(x, r):
    return cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1), normalize=True, borderType=cv2.BORDER_REFLECT)


def guided(I, p, r=4, eps=2e-3):
    """single-channel guided filter (He et al.), I and p float32 0..1"""
    mI, mp = _box(I, r), _box(p, r)
    cov = _box(I * p, r) - mI * mp; var = _box(I * I, r) - mI * mI
    a = cov / (var + eps); b = mp - a * mI
    return _box(a, r) * I + _box(b, r)


def mask_levels(m):
    """kmask videos are h264 yuv420p: white decodes to ~250, black to ~2 -> remap so the host interior is exactly opaque"""
    m = m.astype(np.float32) / 255 if m.dtype == np.uint8 else m.astype(np.float32)
    return np.clip((m - 0.02) / 0.955, 0, 1)


def chroma_dist(rgb, key):
    """CbCr distance of every pixel to the key colour (RGB order), float32"""
    x = rgb.astype(np.float32); k = np.asarray(key, np.float32)
    def cbcr(v):
        y = 0.299 * v[..., 0] + 0.587 * v[..., 1] + 0.114 * v[..., 2]
        return (v[..., 2] - y) * 0.564, (v[..., 0] - y) * 0.713
    cb, cr = cbcr(x); kb, kr = cbcr(k)
    return np.hypot(cb - kb, cr - kr)


def refine_alpha(rgb, al, key, inner=8.0, outer=24.0, r=1, eps=1e-4, choke=1, feather=0.3):   # tuned 22/10 on ga2_talk: 2-4 px ramp, no steps
    """al: float 0..1 coarse matte (from chroma_key.matte, holes filled). Returns refined float32 alpha.
    Inside/outside are kept from the coarse matte; only a band of +-(r+2) px around the contour is re-estimated."""
    al = al.astype(np.float32)
    d = np.clip((chroma_dist(rgb, key) - inner) / (outer - inner), 0, 1).astype(np.float32)
    g = guided(d, al, r, eps)                                   # alpha that follows the real colour transition
    hard = (al > 0.5).astype(np.uint8); k = np.ones((3, 3), np.uint8)
    band = (cv2.dilate(hard, k, iterations=r + 2) - cv2.erode(hard, k, iterations=r + 2)) > 0
    out = np.where(band, np.clip(g, 0, 1), al)
    if choke:                                                   # choke 1 px (soft min filter) -> removes the green-tinged outermost ring
        out = cv2.erode(out, np.ones((2 * choke + 1, 2 * choke + 1), np.uint8))
    if feather:
        out = cv2.GaussianBlur(out, (0, 0), feather)
    out[(al > 0.999) & ~band] = 1.0                              # interior stays solid (no see-through after the blur)
    return np.clip(out, 0, 1)


def unmix(rgb, al, key, lo=0.04):
    """estimate the pure foreground colour of soft edge pixels and despill them (RGB uint8 in, float32 out)"""
    x = rgb.astype(np.float32); a = al[..., None].astype(np.float32); K = np.asarray(key, np.float32)
    F = np.where(a > lo, (x - (1 - a) * K) / np.maximum(a, lo), x)
    F = np.clip(F, 0, 255)
    lim = np.maximum(F[..., 0], F[..., 2])
    edge = al < 0.999
    F[..., 1] = np.where(edge, np.minimum(F[..., 1], lim + 6), F[..., 1])   # despill only where the key can contribute
    return F


def extend_colour(F, al, thr=0.9, levels=7):
    """push-pull fill: colour where alpha < thr is replaced by the nearest/averaged host colour (no black under the matte)"""
    w = (al >= thr).astype(np.float32)
    pyr = [(F * w[..., None], w)]
    for _ in range(levels):
        c, ww = pyr[-1]; pyr.append((cv2.pyrDown(c), cv2.pyrDown(ww)))
    c, ww = pyr[-1]; col = c / np.maximum(ww[..., None], 1e-6)
    for c, ww in reversed(pyr[:-1]):
        up = cv2.resize(col, (c.shape[1], c.shape[0]), interpolation=cv2.INTER_LINEAR)
        own = c / np.maximum(ww[..., None], 1e-6)
        k = np.clip(ww * 4, 0, 1)[..., None]
        col = own * k + up * (1 - k)
    return np.where((al >= thr)[..., None], F, col)


def despill(F, al, slack=6.0):
    """G <= max(R,B) + slack on every pixel that is not fully opaque (edge band) - RGB or BGR (G is channel 1 in both)"""
    F = F.astype(np.float32).copy(); lim = np.maximum(F[..., 0], F[..., 2]) + slack
    F[..., 1] = np.where(al < 0.999, np.minimum(F[..., 1], lim), F[..., 1]); return F


def prepare_layer(img, coarse, key):
    """one call for keyers: img uint8 (RGB or BGR, key in the same order), coarse matte 0..1 -> (colour float32 edge-extended, alpha)"""
    a = refine_alpha(img, coarse, key)
    F = extend_colour(despill(img, a), a)   # colour of soft/transparent pixels = nearest solid host colour (no black, no green)
    return F, a


def place(F, A, sc, M, size):
    """premultiplied resample of a host layer. F float32 colour (straight, edge-extended), A float32 alpha, M 2x3 affine
    (already containing sc), size (w,h). Downscale (sc < 1) = INTER_AREA on premultiplied RGBA first, then the translation."""
    P = np.dstack([F * A[..., None], A]).astype(np.float32)
    if sc < 0.999:
        P = cv2.resize(P, None, fx=sc, fy=sc, interpolation=cv2.INTER_AREA)
        M = M.copy(); M[0, 0] = M[1, 1] = 1.0                     # scale already applied
        Q = cv2.warpAffine(P, M, size, flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    else:
        Q = cv2.warpAffine(P, M, size, flags=cv2.INTER_LANCZOS4 if sc > 1.001 else cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    a = np.clip(Q[..., 3], 0, 1)
    return np.clip(Q[..., :3], 0, 255 * a[..., None] + 1e-3), a  # premultiplied colour, alpha


def over(Fp, a, B, wrap_px=2.5, wrap=0.45):
    """premultiplied 'over' + light wrap: background light bleeds ~wrap_px into the host edge"""
    B = B.astype(np.float32)
    if wrap_px:
        inner = cv2.GaussianBlur(a, (0, 0), wrap_px)
        band = np.clip((1 - inner) * a, 0, 1)   # ~1 at the edge, -> 0 inside the host
        bgb = cv2.GaussianBlur(B, (0, 0), wrap_px * 2)
        Fp = Fp * (1 - wrap * band[..., None]) + bgb * a[..., None] * wrap * band[..., None]
    return Fp + B * (1 - a[..., None])


def edge_qa(rgb_out, a, bg=None, min_soft=0.6, max_dark=0.08):
    """rgb_out: composited frame (BGR), a: alpha used for it (0..1), bg: the background alone (optional, else the outer ring is used).
    soft = fraction of contour pixels (within 1 px of the 0.5 iso-line) with 0.02 < a < 0.98.
    dark = median over edge-ring pixels (0.15 < a < 0.85) of 1 - L / (a * L_inner + (1 - a) * L_bg), L_inner = local host luma
    2-5 px inside, L_bg = local background luma -> a halo/dark rim makes the ring darker than the physically expected mix.
    PASS: soft >= min_soft and dark <= max_dark (owner 22/10: 8 %)."""
    h = (a > 0.5).astype(np.uint8); k = np.ones((3, 3), np.uint8)
    contour = (cv2.dilate(h, k) - cv2.erode(h, k)) > 0
    soft = float(((a > 0.02) & (a < 0.98))[contour].mean()) if contour.any() else 0.0
    width = float(((a > 0.05) & (a < 0.95)).sum() / max(1, (h - cv2.erode(h, k)).sum()))   # mean ramp width across the outline (px)
    g = lambda im: cv2.cvtColor(np.clip(im, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY).astype(np.float32)
    L = g(rgb_out)
    inner = ((cv2.erode(h, k, iterations=2) > 0) & ~(cv2.erode(h, k, iterations=5) > 0)).astype(np.float32)
    loc = lambda v, m: cv2.blur(v * m, (15, 15)) / np.maximum(cv2.blur(m, (15, 15)), 1e-6)
    Li = loc(L, inner)
    if bg is not None: Lb = g(bg)
    else:
        outer = ((cv2.dilate(h, k, iterations=5) > 0) & ~(cv2.dilate(h, k, iterations=2) > 0)).astype(np.float32); Lb = loc(L, outer)
    ring = (a > 0.15) & (a < 0.85) & (cv2.blur(inner, (15, 15)) > 0.05)
    exp_ = a * Li + (1 - a) * Lb
    dark = float(np.median(1 - L[ring] / np.maximum(exp_[ring], 1))) if ring.any() else 0.0
    return dict(soft=round(soft, 3), width=round(width, 2), dark=round(dark, 3), ok=bool(soft >= min_soft and 1.3 <= width <= 4.5 and dark <= max_dark))


def zoom(img, cx, cy, s=60, k=4):
    """400 % zoom crop (nearest, so the edge pixels are visible as they are)"""
    h, w = img.shape[:2]; x0, y0 = int(np.clip(cx - s // 2, 0, w - s)), int(np.clip(cy - s // 2, 0, h - s))
    return cv2.resize(img[y0:y0 + s, x0:x0 + s], (s * k, s * k), interpolation=cv2.INTER_NEAREST)
