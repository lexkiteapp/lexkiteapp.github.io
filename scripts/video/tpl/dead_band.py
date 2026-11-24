"""dead_band gate (owner 19/11: "khoảng trống phẳng dưới template trông thừa thãi và xấu"): a horizontal band of the frame that is near-uniform
(no texture, no content) and >= MIN_FRAC of the frame height. Shared by Teach2D qc.py, qc_v9 (Stitch overlay / motion) and the news templates.
A row is flat when its luminance varies < FLAT_STD across the width; a band = consecutive flat rows whose mean stays within BAND_DRIFT (a smooth
gradient still counts, a rule line or a photo edge splits the band). A frame is dead when its largest band >= MIN_FRAC; the video fails when more
than BAD_SHARE of the sampled frames are dead (a one-frame fade does not fail, a panel that sits there does)."""
MIN_FRAC, FLAT_STD, BAND_DRIFT, ROW_STEP, BAD_SHARE = 0.08, 3.0, 10.0, 2.5, 0.10


def longest_band(row_std, row_mean):   # pure python on per-row stats -> (rows, y0) of the largest near-uniform band
    best = (0, 0); y = 0; n = len(row_std)
    while y < n:
        if row_std[y] >= FLAT_STD: y += 1; continue
        y0 = y; lo = hi = row_mean[y]
        while y < n and row_std[y] < FLAT_STD and abs(row_mean[y] - row_mean[y - 1 if y > y0 else y]) <= ROW_STEP and max(hi, row_mean[y]) - min(lo, row_mean[y]) <= BAND_DRIFT:
            lo, hi = min(lo, row_mean[y]), max(hi, row_mean[y]); y += 1
        if y == y0: y += 1   # a flat row that jumps from its flat neighbour starts the next band
        if y - y0 > best[0]: best = (y - y0, y0)
    return best


def frame_band(gray):   # gray: 2-D numpy array (H, W) -> (fraction of the height, y0)
    g = gray.astype('float32'); rows, y0 = longest_band(g.std(axis=1).tolist(), g.mean(axis=1).tolist()); return rows / g.shape[0], y0


MAX_EMPTY, BLOCK, BG_TOL = 0.55, 24, 14.0   # v3 (audit 24/11 #3): share of the frame that is bare background (flat 24 px blocks within BG_TOL of the dominant background tone) <= 55 % in any sampled frame


def empty_ratio(gray):   # gray (H, W) -> share of BLOCK x BLOCK blocks that are flat AND background-toned (cards, text, the teacher are not background)
    import numpy as np
    g = gray.astype('float32'); h, w = (g.shape[0] // BLOCK) * BLOCK, (g.shape[1] // BLOCK) * BLOCK
    b = g[:h, :w].reshape(h // BLOCK, BLOCK, w // BLOCK, BLOCK).transpose(0, 2, 1, 3).reshape(-1, BLOCK * BLOCK); sd, mu = b.std(axis=1), b.mean(axis=1); flat = sd < FLAT_STD
    if not flat.any(): return 0.0
    hist, edges = np.histogram(mu[flat], bins=32, range=(0, 256)); bg = (edges[hist.argmax()] + edges[hist.argmax() + 1]) / 2
    return float((flat & (abs(mu - bg) <= BG_TOL)).mean())


def check(frames, empty=False):   # empty=True adds the bare-background share (Teach2D v3 only; other templates keep the band rule)   # frames: iterable of 2-D gray arrays (sampled 2-4 per second) -> gate dict
    frames = list(frames); res = [frame_band(f) for f in frames]; er = [empty_ratio(f) for f in frames] if empty else []; dead = [i for i, (fr, _) in enumerate(res) if fr >= MIN_FRAC]
    share = len(dead) / max(1, len(res)); worst = max(res, key=lambda r: r[0], default=(0, 0))
    empty = [i for i, e in enumerate(er) if e > MAX_EMPTY]; return dict(ok=share <= BAD_SHARE and len(empty) / max(1, len(er)) <= BAD_SHARE, max_empty_pct=round(100 * max(er, default=0), 1), empty_frames=empty[:8], dead_share=round(share, 3), max_band_pct=round(100 * worst[0], 1), max_band_y=worst[1], dead_frames=dead[:8], note=f'band >= {int(MIN_FRAC * 100)}% of the height, flat rows (std < {FLAT_STD}), > {int(BAD_SHARE * 100)}% of frames')
