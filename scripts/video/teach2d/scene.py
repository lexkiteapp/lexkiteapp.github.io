#!/usr/bin/env python3
"""Teach2D matching 2D scenes (docs/VIDEO-TEACH2D.md), shared by build.py (props + timeline) and qc.py (scene_clear gate).
Scene items = scripts/video/remotion/src/teach/scenes.json (flat Kit vector shapes, theme tokens, 0 credits) + the grounding build.py adds:
floor plane, soft contact shadow behind the teacher, and a FOREGROUND counter drawn above the teacher (news-anchor look, hides the bust cut).
TeachShort.jsx <Scene> draws exactly these items; qc.py re-composites them to check text contrast, the calm card region and the teacher gate."""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SCENES = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/scenes.json'))['scenes']
CT = dict(short=1800, wide=900)    # counter top edge (wide = the short band x 1.5 teacher scale: 120 px of 640 -> 180 of 960)
FLOOR = dict(short=1660, wide=800)  # back wall / floor line


def resolve(key, fmt, layout, W, H, host_cx, host_w, host_h, nodes, region):
    """-> dict(key, items, counter) in canvas px, in draw order: floor, contact shadow, scene backdrop | (above the teacher) counter, props on it.
    Bubble layout: backdrop only (the teacher sits in the round call window), no counter."""
    if not key: return None
    assert key in SCENES, ('unknown scene', key, sorted(SCENES))
    src = [dict(x) for x in SCENES[key]['wide' if fmt == 'wide' else 'short']]
    back = [dict(k='r', b=[0, FLOOR[fmt], W, H], r=0, c='ledge', a=0.22)] + [x for x in src if x.get('l') != 'front']   # floor plane first
    if layout == 'bubble':   # the big card region reaches lower here: keep only the backdrop below it
        return dict(key=key, items=[back[0]] + [x for x in back[1:] if bbox(x)[1] >= region[3]], counter=None)
    ct = CT[fmt]; x0 = -40
    if fmt == 'wide':   # desk on the teacher's side only: left edge just past the card region / any node reaching below its top edge
        x0 = max([region[2]] + [n['box'][2] for n in nodes if n['box'][3] > ct and n['type'] != 'confetti']) + 16
    sw, sh = 0.34 * host_w, 0.07 * host_h   # soft contact shadow on the wall behind the teacher (its lower half sits behind the counter)
    back.insert(1, dict(k='g', b=[round(host_cx - sw), round(ct - sh), round(host_cx + sw), round(ct + sh)], r=0, c='ledge', a=0.55))
    front = [dict(k='r', b=[x0, ct, W + 40, H + 40], r=16, c='tile_edge', a=1, l='front'),       # counter top lip
             dict(k='r', b=[x0, ct + 22, W + 40, H + 40], r=0, c='tile', a=1, l='front'),        # front panel
             dict(k='r', b=[x0, ct + 22, W + 40, ct + 30], r=0, c='ledge', a=0.6, l='front')]    # Kit ledge under the lip
    front += [x for x in src if x.get('l') == 'front']   # props standing on the counter / handles on its panel
    return dict(key=key, items=back + front, counter=[round(max(0, x0)), ct, W, H])


def bbox(x):
    if x['k'] == 'p': xs, ys = [p[0] for p in x['pts']], [p[1] for p in x['pts']]; return [min(xs), min(ys), max(xs), max(ys)]
    return list(x['b'])


def rgba(c, TH, tint):
    v = tint if c == 'tint' else TH.get(c, c)
    m = re.match(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)', v)
    if m: return [int(m[1]), int(m[2]), int(m[3])], float(m[4])
    return [int(v[i:i + 2], 16) for i in (1, 3, 5)], 1.0


def cover(x, px, py):   # alpha weight of item x at a point (0..1)
    k = x['k']
    if k == 'p':
        P = x['pts']; inside = False
        for i in range(len(P)):
            (ax, ay), (bx, by) = P[i], P[i - 1]
            if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax: inside = not inside
        return 1.0 if inside else 0.0
    x0, y0, x1, y1 = x['b']
    if k == 'r': return 1.0 if x0 <= px < x1 and y0 <= py < y1 else 0.0
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    d = ((px - cx) / max(rx, 1e-6)) ** 2 + ((py - cy) / max(ry, 1e-6)) ** 2
    if k == 'o': return 1.0 if d <= 1 else 0.0
    if k == 'g': return max(0.0, 1 - d ** 0.5)
    if k == 'ring':   # outline of width sw
        sw = x.get('sw', 6); di = ((px - cx) / max(rx - sw, 1e-6)) ** 2 + ((py - cy) / max(ry - sw, 1e-6)) ** 2
        return 1.0 if d <= 1 and di >= 1 else 0.0
    return 0.0


def composite(items, px, py, base, TH, tint, layers=('back',)):
    c = [float(v) for v in base]
    for x in items:
        if (x.get('l') or 'back') not in layers: continue
        w = cover(x, px, py)
        if w <= 0: continue
        col, a0 = rgba(x['c'], TH, tint); a = w * a0 * x['a']
        c = [u * (1 - a) + v * a for u, v in zip(c, col)]
    return c


def hexc(c): return '#' + ''.join(f'{max(0, min(255, round(v))):02x}' for v in c)


def expected(items, box, base, TH, tint, layers=('back', 'front')):
    """numpy HxWx3 float: the frame without the teacher inside box [x0, y0, x1, y1] (flat base + every scene item) – qc.py frames gate."""
    import numpy as np
    x0, y0, x1, y1 = [int(v) for v in box]; X, Y = np.meshgrid(np.arange(x0, x1) + 0.5, np.arange(y0, y1) + 0.5)
    img = np.empty((y1 - y0, x1 - x0, 3)); img[:] = base
    for x in items:
        if (x.get('l') or 'back') not in layers: continue
        k = x['k']
        if k == 'p':
            P = x['pts']; w = np.zeros(X.shape, bool)
            for i in range(len(P)):
                (ax, ay), (bx, by) = P[i], P[i - 1]
                if ay == by: continue
                w ^= ((ay > Y) != (by > Y)) & (X < (bx - ax) * (Y - ay) / (by - ay) + ax)
            w = w.astype(float)
        else:
            a0, b0, a1, b1 = x['b']
            if k == 'r': w = ((X >= a0) & (X < a1) & (Y >= b0) & (Y < b1)).astype(float)
            else:
                cx, cy, rx, ry = (a0 + a1) / 2, (b0 + b1) / 2, max((a1 - a0) / 2, 1e-6), max((b1 - b0) / 2, 1e-6); d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2
                if k == 'o': w = (d <= 1).astype(float)
                elif k == 'g': w = np.clip(1 - np.sqrt(d), 0, None)
                else: sw = x.get('sw', 6); w = ((d <= 1) & (((X - cx) / max(rx - sw, 1e-6)) ** 2 + ((Y - cy) / max(ry - sw, 1e-6)) ** 2 >= 1)).astype(float)
        col, a0_ = rgba(x['c'], TH, tint); al = (w * a0_ * x['a'])[..., None]
        img = img * (1 - al) + np.array(col, float) * al
    return img
