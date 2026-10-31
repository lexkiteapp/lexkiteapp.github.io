#!/usr/bin/env python3
"""Teach2D matching 2D scenes (docs/VIDEO-TEACH2D.md), shared by build.py (props + timeline) and qc.py (scene_clear gate).
Scene items = scripts/video/remotion/src/teach/scenes.json (flat Kit vector shapes, theme tokens, 0 credits) + the grounding build.py adds:
floor plane, soft contact shadow behind the teacher, and a FOREGROUND counter drawn above the teacher (news-anchor look, hides the bust cut).
TeachShort.jsx <Scene> draws exactly these items; qc.py re-composites them to check text contrast, the calm card region and the teacher gate.
Item kinds: r rect (b, r radius) · o ellipse · ring ellipse outline (sw) · p polygon (pts) · g soft radial pool (alpha 1 at the centre -> 0 at the rim,
colour c: contact shadow, lamp / window light) · lg linear gradient rect (alpha a -> a2 top to bottom, or left to right with dir 'h': wall-to-floor
shading, window light). l 'front' = drawn above the teacher; g = prop group id (front props move / shrink / step behind as one piece so they never
sit on the teacher's head or body - build.py asserts it, qc.py re-checks)."""
import json, os, re
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
SCENES = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/scenes.json'))['scenes']
CT = dict(short=1800, wide=900)    # default counter top edge (wide = the short band x 1.5 teacher scale); build.py v2 short layouts pass ct=1830
FLOOR = dict(short=1660, wide=800)  # back wall / floor line
REF_CT = dict(short=1830, wide=900)  # the counter top scenes.json front props are drawn on (they follow the real counter top)


def bbox(x):
    if x['k'] == 'p': xs, ys = [p[0] for p in x['pts']], [p[1] for p in x['pts']]; return [min(xs), min(ys), max(xs), max(ys)]
    return list(x['b'])


def _move(x, dx=0.0, dy=0.0, s=1.0, ax=0.0, ay=0.0):   # translate / scale one item about (ax, ay)
    x = dict(x); f = lambda px, py: [round(ax + (px - ax) * s + dx, 1), round(ay + (py - ay) * s + dy, 1)]
    if x['k'] == 'p': x['pts'] = [f(*p) for p in x['pts']]
    else: x['b'] = f(x['b'][0], x['b'][1]) + f(x['b'][2], x['b'][3])
    if 'sw' in x and s != 1.0: x['sw'] = round(x['sw'] * s, 1)
    return x


def _union(bs): return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)]


def _place_front(groups, ct, xlo, xhi, clear, pad=18):
    """front prop groups standing on the counter: keep / slide / shrink (>= 0.6) each group into a free stretch of the counter beside the teacher;
    when nothing fits it steps BEHIND the teacher (layer back, on a back shelf behind the counter) - never on her head or body."""
    out = []; taken = []
    for items in groups:
        gb = _union([bbox(x) for x in items])
        if gb[1] >= ct: out += items; continue    # on the counter's front panel (below its top edge): never on the teacher
        block = [[c[0] - pad, c[2] + pad] for c in clear if c[1] < ct and c[3] > gb[1]] + taken
        free = [[xlo, xhi]]
        for a, b in sorted(block):
            nf = []
            for u, v in free:
                if b <= u or a >= v: nf.append([u, v]); continue
                if a > u: nf.append([u, a])
                if b < v: nf.append([b, v])
            free = nf
        gw = gb[2] - gb[0]; best = None
        for u, v in free:
            for s in (1.0, 0.85, 0.72, 0.6):
                w = gw * s
                if v - u >= w:
                    x0 = min(max(gb[0], u), v - w); cost = abs(x0 - gb[0]) + (1 - s) * 2000
                    if best is None or cost < best[0]: best = (cost, x0, s)
                    break
        if best is None:   # no room beside the teacher: the prop stands on a back shelf, behind her (drawn before the teacher)
            out += [dict(x, l='back') for x in items]; continue
        _, x0, s = best; ax, ay = gb[0], gb[3]
        moved = [_move(x, dx=x0 - gb[0], s=s, ax=ax, ay=ay) for x in items]; out += moved
        mb = _union([bbox(x) for x in moved]); taken.append([mb[0] - 8, mb[2] + 8])
    return out


def resolve(key, fmt, layout, W, H, host_cx, host_w, host_h, nodes, region, ct=None, clear=None):
    """-> dict(key, items, counter) in canvas px, in draw order: floor, contact shadow, scene backdrop | (above the teacher) counter, props on it.
    Bubble layout: backdrop only (the teacher sits in the round call window), no counter. clear = boxes the front props must stay off
    (build.py: the teacher's head + body in every camera framing)."""
    if not key: return None
    assert key in SCENES, ('unknown scene', key, sorted(SCENES))
    S_ = SCENES[key]; src = [dict(x) for x in (S_['wide'] if fmt == 'wide' else S_.get(layout) or S_['short'])]
    back = [dict(k='r', b=[0, FLOOR[fmt], W, H], r=0, c='ledge', a=0.22)] + [x for x in src if x.get('l') != 'front']   # floor plane first
    if layout == 'bubble':   # the big card region reaches lower here: keep only the backdrop below it
        return dict(key=key, items=[back[0]] + [x for x in back[1:] if bbox(x)[1] >= region[3]], counter=None)
    ct = ct or CT[fmt]; x0 = -40
    if fmt == 'wide':   # desk on the teacher's side only: left edge just past the card region / any node reaching below its top edge
        x0 = max([region[2]] + [n['box'][2] for n in nodes if n['box'][3] > ct and n['type'] != 'confetti']) + 16
    sw, sh = 0.34 * host_w, 0.07 * host_h   # soft contact shadow on the wall behind the teacher (its lower half sits behind the counter)
    back.insert(1, dict(k='g', b=[round(host_cx - sw), round(ct - sh), round(host_cx + sw), round(ct + sh)], r=0, c='ledge', a=0.55))
    front = [dict(k='r', b=[x0, ct, W + 40, H + 40], r=16, c='tile_edge', a=1, l='front'),       # counter top lip
             dict(k='r', b=[x0, ct + 22, W + 40, H + 40], r=0, c='tile', a=1, l='front'),        # front panel
             dict(k='r', b=[x0, ct + 22, W + 40, ct + 30], r=0, c='ledge', a=0.6, l='front')]    # Kit ledge under the lip
    dy = ct - REF_CT[fmt]   # props follow the real counter top
    fr = [_move(x, dy=dy) for x in src if x.get('l') == 'front']
    groups, idx = [], {}
    for x in fr:   # one group per 'g' id (a prop = several shapes), ungrouped items alone
        g = x.get('g')
        if g is None: groups.append([x])
        elif g in idx: groups[idx[g]].append(x)
        else: idx[g] = len(groups); groups.append([x])
    placed = _place_front(groups, ct, max(0, x0) + 12, W - 12, clear or [])
    back += [x for x in placed if x.get('l') == 'back']
    front += [x for x in placed if x.get('l') == 'front']   # props standing on the counter / handles on its panel
    return dict(key=key, items=back + front, counter=[round(max(0, x0)), ct, W, H])


def on_teacher(scn, head, body, m=1):
    """front-layer items (counter props) over the teacher's head or her body above the counter -> [(index, bbox, 'head' | 'body')]."""
    if not scn or not scn.get('counter'): return []
    ct = scn['counter'][1]; bt = [body[0], body[1], body[2], min(body[3], ct)]; out = []
    for i, x in enumerate(scn['items']):
        if x.get('l') != 'front': continue
        b = bbox(x)
        if b[1] >= ct: continue   # the counter itself and its front panel: below the counter top, where the teacher is hidden by design
        for nm, r in (('head', head), ('body', bt)):
            if b[0] < r[2] - m and r[0] < b[2] - m and b[1] < r[3] - m and r[1] < b[3] - m: out.append((i, b, nm))
    return out


def rgba(c, TH, tint):
    v = tint if c == 'tint' else TH.get(c, c)
    m = re.match(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)', v)
    if m: return [int(m[1]), int(m[2]), int(m[3])], float(m[4])
    return [int(v[i:i + 2], 16) for i in (1, 3, 5)], 1.0


def cover(x, px, py):   # alpha weight of item x at a point (0..1), before the item alpha
    k = x['k']
    if k == 'p':
        P = x['pts']; inside = False
        for i in range(len(P)):
            (ax, ay), (bx, by) = P[i], P[i - 1]
            if (ay > py) != (by > py) and px < (bx - ax) * (py - ay) / (by - ay) + ax: inside = not inside
        return 1.0 if inside else 0.0
    x0, y0, x1, y1 = x['b']
    if k == 'r': return 1.0 if x0 <= px < x1 and y0 <= py < y1 else 0.0
    if k == 'lg':
        if not (x0 <= px < x1 and y0 <= py < y1): return 0.0
        f = (px - x0) / max(1e-6, x1 - x0) if x.get('dir') == 'h' else (py - y0) / max(1e-6, y1 - y0)
        return (x['a'] + (x.get('a2', 0.0) - x['a']) * f) / max(1e-6, x['a'])
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
        col, a0 = rgba(x['c'], TH, tint); a = min(1.0, w * a0 * x['a'])
        c = [u * (1 - a) + v * a for u, v in zip(c, col)]
    return c


def hexc(c): return '#' + ''.join(f'{max(0, min(255, round(v))):02x}' for v in c)


def paint(img, items, TH, tint, layers=('back', 'front'), box=None):
    """numpy HxWx3 float image covering canvas box [x0, y0, x1, y1] (default: the whole image from 0, 0): items composited on top, same maths as cover()."""
    import numpy as np
    x0, y0 = (int(box[0]), int(box[1])) if box else (0, 0); h_, w_ = img.shape[:2]
    X, Y = np.meshgrid(np.arange(x0, x0 + w_) + 0.5, np.arange(y0, y0 + h_) + 0.5)
    for x in items:
        if (x.get('l') or 'back') not in layers: continue
        k = x['k']; bb = bbox(x)
        if bb[2] <= x0 or bb[0] >= x0 + w_ or bb[3] <= y0 or bb[1] >= y0 + h_: continue
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
            elif k == 'lg':
                ins = (X >= a0) & (X < a1) & (Y >= b0) & (Y < b1); f = (X - a0) / max(1e-6, a1 - a0) if x.get('dir') == 'h' else (Y - b0) / max(1e-6, b1 - b0)
                w = ins * (x['a'] + (x.get('a2', 0.0) - x['a']) * f) / max(1e-6, x['a'])
            else:
                cx, cy, rx, ry = (a0 + a1) / 2, (b0 + b1) / 2, max((a1 - a0) / 2, 1e-6), max((b1 - b0) / 2, 1e-6); d = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2
                if k == 'o': w = (d <= 1).astype(float)
                elif k == 'g': w = np.clip(1 - np.sqrt(d), 0, None)
                else: sw = x.get('sw', 6); w = ((d <= 1) & (((X - cx) / max(rx - sw, 1e-6)) ** 2 + ((Y - cy) / max(ry - sw, 1e-6)) ** 2 >= 1)).astype(float)
        col, a0_ = rgba(x['c'], TH, tint); al = np.clip(w * a0_ * x['a'], 0, 1)[..., None]
        img = img * (1 - al) + np.array(col, float) * al
    return img


def expected(items, box, base, TH, tint, layers=('back', 'front')):
    """numpy HxWx3 float: the frame without the teacher inside box [x0, y0, x1, y1] (flat base + every scene item) – qc.py frames gate."""
    import numpy as np
    x0, y0, x1, y1 = [int(v) for v in box]; img = np.empty((y1 - y0, x1 - x0, 3)); img[:] = base
    return paint(img, items, TH, tint, layers, box=[x0, y0])
