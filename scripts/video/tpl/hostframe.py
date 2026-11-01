#!/usr/bin/env python3
"""Host framing standard for tpl 1b (tokens.HOST_LOCK; owner 24/10: 'same crop line, same shoulder width, same head top, same centre' –
head-pixel height was the wrong metric: Carlos (realistic proportions) came out waist-cropped and much wider than Ama/Mia (big-head style)).
Landmarks are measured on the MATTE (alpha), never guessed:
  top      = highest matte row (hair top)
  neck     = narrowest row under the widest head row (top 22 %), above 50 % of the figure height (smoothed silhouette extent)
  shoulder = the shoulder corner: first row after the steepest widening under the neck where the widening drops under 1/3 (hair over the
             shoulders, no visible slope -> the neck/hair-bottom row);
             shoulder_w = silhouette extent there, cx = its midpoint (the body centre, not the mouth)
  hands    = lowest row where the silhouette is still wider than the legs + 12 % of the shoulder width = rest-pose fingertips = CROP LINE reference
v4 waist-up: waist = halfway shoulder corner -> fingertips; solve() puts it on lock.crop.
solve() picks ONE scale + offset per host: shoulder width = HOST_LOCK.shoulder (kept within ±fit), hands row at HOST_LOCK.crop, head top at
HOST_LOCK.top, body centre at HOST_LOCK.cx. render_tpl.py re-measures the transformed matte on screen -> qc_tpl host_frame_std gate + batch gate."""
import numpy as np

def _smooth(v, k=9):
    if len(v) < k: return v.astype(np.float32)
    p = k // 2; e = np.pad(v.astype(np.float32), p, mode='edge'); return np.array([np.median(e[i:i + k]) for i in range(len(v))], np.float32)

def landmarks(alpha):
    """alpha: HxW (0..1 float or 0..255) -> dict(top, neck, shoulder_y, shoulder_w, cx, hands, bottom) in the alpha's own px"""
    a = np.asarray(alpha, np.float32); a = a / 255 if a.max() > 1.5 else a
    m = a > 0.5; rows = np.nonzero(m.any(1))[0]
    if len(rows) < 50: return None
    top, bot = int(rows[0]), int(rows[-1]); hgt = bot - top
    first = np.where(m.any(1), m.argmax(1), -1); last = np.where(m.any(1), m.shape[1] - 1 - m[:, ::-1].argmax(1), -1)
    ext = np.where(m.any(1), last - first + 1, 0).astype(np.float32); es = _smooth(ext)
    hy = top + int(np.argmax(es[top:top + int(0.22 * hgt)]))          # widest head/hair row
    n1 = top + int(0.5 * hgt); neck = hy + int(np.argmin(es[hy:n1]))   # narrowest row under it = neck (hair falling on the shoulders included)
    b1 = min(bot - 16, neck + max(40, int(0.4 * (neck - top))))
    sl = (es[neck + 15:b1 + 16] - es[neck:b1 + 1]) / 15                 # extent growth per row (15-row step)
    if len(sl) and sl.max() >= 1.0:   # visible shoulder slope -> the corner: first row after the steepest one where the growth drops under 1/3
        j = int(np.argmax(sl)); k = np.nonzero(sl[j:] < sl.max() / 3)[0]; sh = neck + j + (int(k[0]) if len(k) else 0)
    else: sh = neck                    # hair covers the shoulders: the hair-bottom row sits on the shoulder line
    sw = float(es[sh]); cx = float((first[sh - 2:sh + 3] + last[sh - 2:sh + 3]).mean() / 2)
    legs = float(np.median(es[bot - max(8, int(0.05 * hgt)):bot + 1]))
    wide = np.nonzero(es[sh:bot + 1] > legs + 0.12 * sw)[0]             # arms/hands wider than the legs -> lowest such row = fingertips
    hands = int(sh + wide[-1]) if len(wide) else bot
    return dict(top=top, neck=neck, shoulder_y=sh, shoulder_w=round(sw, 1), cx=round(cx, 1), hands=hands, bottom=bot, waist=round(sh + 0.5 * (hands - sh), 1))

def merge(L):
    """landmarks of many frames -> one: top = highest hair over all frames, hands = rest pose (90th pct), the rest = median (talking motion)"""
    L = [x for x in L if x]; med = lambda k: float(np.median([x[k] for x in L])); hp = float(np.percentile([x['hands'] for x in L], 90))
    return dict(top=min(x['top'] for x in L), neck=med('neck'), shoulder_y=med('shoulder_y'), shoulder_w=round(med('shoulder_w'), 1), cx=round(med('cx'), 1),
                hands=float(np.percentile([x['hands'] for x in L], 90)),   # rest pose (arms down): gestures only lift the hands
                bottom=max(x['bottom'] for x in L), frames=len(L), waist=round(med('shoulder_y') + 0.5 * (hp - med('shoulder_y')), 1))

def solve(lm, lock):
    """one scale + offset: shoulder width = lock.shoulder (±lock.fit, used to bring the hands row onto lock.crop), head top = lock.top, centre = lock.cx"""
    s_sw = lock['shoulder'] / lm['shoulder_w']; s_crop = (lock['crop'] - lock['top']) / max(1.0, lm['waist'] - lm['top'])   # v4: waist-up (waist row -> lock.crop)
    s = float(np.clip(s_crop, s_sw * (1 - lock['fit']), s_sw * (1 + lock['fit']))); s = min(s, lock['max_scale'])
    return round(s, 4), int(round(lock['top'] - lm['top'] * s)), int(round(lock['cx'] - lm['cx'] * s))

def check(scr, lock, ext=0):
    """screen landmarks vs the standard -> per-metric ok + values (qc_tpl host_frame_std)"""
    c = (1920 - scr['waist']) / max(1.0, scr['shoulder_w'])   # waist-up: the waist sits at / just under the frame bottom (screen waist = source waist row transformed; it is at the frame edge)
    R = dict(shoulder_w=scr['shoulder_w'], top=scr['top'], cx=scr['cx'], waist=scr['waist'], crop=round(c, 3), layer_bottom=scr.get('layer_bottom'), ext=ext,
             height_frac=round((1920 - scr['top']) / 1920, 3))
    R['ok_shoulder'] = abs(scr['shoulder_w'] - lock['shoulder']) <= lock['shoulder_tol'] * lock['shoulder']
    R['ok_top'] = abs(scr['top'] - lock['top']) <= lock['px_tol']
    R['ok_cx'] = abs(scr['cx'] - lock['cx']) <= 2 * lock['px_tol']
    R['ok_crop'] = lock['crop_min'] <= c <= lock['crop_max']            # waist-up: frame bottom between just above the waist and the hip
    R['ok_height'] = 0.45 <= R['height_frac'] <= 0.50                   # owner 25/10: host ~45-50 % of the frame height
    R['ok_bottom'] = (scr.get('layer_bottom') or 0) >= 1920 and ext <= lock['max_ext']   # body runs past the frame edge, little leg extension
    R['ok'] = all(v for k, v in R.items() if k.startswith('ok_')); return R

def batch(items, lock):
    """items: [(id, host, screen-check dict)] -> batch gate: shoulders within ±shoulder_tol of the median, tops within px_tol, crop spread capped"""
    import statistics
    if not items: return dict(ok=False, reason='no renders')
    sw = [r['shoulder_w'] for _, _, r in items]; med = statistics.median(sw); tops = [r['top'] for _, _, r in items]; cr = [r['crop'] for _, _, r in items]
    out = [i for i, _, r in items if abs(r['shoulder_w'] - med) > lock['shoulder_tol'] * med or not r.get('ok')]
    R = dict(shoulder_median=med, shoulder_spread=round((max(sw) - min(sw)) / med, 3), top_spread=max(tops) - min(tops), crop_spread=round(max(cr) - min(cr), 3),
             by_host={h: dict(shoulder_w=r['shoulder_w'], top=r['top'], cx=r['cx'], crop=r['crop'], waist=r['waist']) for _, h, r in items}, outliers=out)
    R['ok'] = not out and R['top_spread'] <= lock['px_tol'] and R['crop_spread'] <= lock['crop_spread']; return R
