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


def check(frames):   # frames: iterable of 2-D gray arrays (sampled 2-4 per second) -> gate dict
    res = [frame_band(f) for f in frames]; dead = [i for i, (fr, _) in enumerate(res) if fr >= MIN_FRAC]
    share = len(dead) / max(1, len(res)); worst = max(res, key=lambda r: r[0], default=(0, 0))
    return dict(ok=share <= BAD_SHARE, dead_share=round(share, 3), max_band_pct=round(100 * worst[0], 1), max_band_y=worst[1], dead_frames=dead[:8], note=f'band >= {int(MIN_FRAC * 100)}% of the height, flat rows (std < {FLAT_STD}), > {int(BAD_SHARE * 100)}% of frames')
