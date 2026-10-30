"""Motion core of the Stitch overlay layer (docs/VIDEO-MOTION.md). SAME maths as scripts/video/remotion/src/stitch/core.mjs (parity test
scripts/test/motion-core.mjs): the Remotion renderer draws with core.js, the builder + QC predict every frame with this file.
A node animates with: in = {t, k} (k: rise | pop | fade | draw | soft = calm fade + 16 px ease-out lift, no spring – teach2d templates), out = {t} (fade + lift), st = [{t, s}] (state switches, 0.18 s colour mix),
val = {t, d, a, b} (count-up / fill, ease-out cubic). Closed-form springs (no simulation), so any frame is exact and stateless."""
import math

def clamp01(x): return 0.0 if x < 0 else 1.0 if x > 1 else x
def spring(tau, z, w):   # underdamped step response 0 -> 1
    if tau <= 0: return 0.0
    wd = w * math.sqrt(1 - z * z)
    return 1 - math.exp(-z * w * tau) * (math.cos(wd * tau) + z * w / wd * math.sin(wd * tau))
def ease_out(x): x = clamp01(x); return 1 - (1 - x) ** 3

FADE_IN = dict(rise=0.12, pop=0.06, fade=0.14, draw=0.0, soft=0.24, punch=0.0)   # alpha ramp per entrance kind
HALF = dict(rise=0.06, pop=0.03, fade=0.07, draw=0.15, soft=0.12, punch=0.0)      # time from in.t to the "appears" instant (alpha 0.5 / half drawn): builders start in.t = word.s - HALF
SETTLE = dict(rise=0.45, pop=0.40, fade=0.14, draw=0.30, soft=0.32, punch=0.25)    # after this the node is static (no motion while it is read)
DRAW = 0.30; OUT = 0.16; MIX = 0.18; RISE_DY = 36; OUT_DY = 14; SOFT_DY = 16; SOFT_T = 0.32

def pose(n, t):
    """-> dict(a=alpha, s=scale, dy=px, p=draw progress) of node n at time t."""
    i = n.get('in') or dict(t=0, k='fade'); k = i['k']; tau = t - i['t']
    if k == 'draw': a = 1.0 if tau >= 0 else 0.0; s = 1.0; dy = 0.0; p = ease_out(tau / DRAW)
    elif k == 'punch': a = 1.0 if tau >= 0 else 0.0; s = 1.15 - 0.15 * ease_out(tau / 0.25) if tau >= 0 else 1.15; dy = 0.0; p = 1.0
    else:
        a = clamp01(tau / FADE_IN[k]) if tau >= 0 else 0.0; p = 1.0
        if k == 'rise': sp = spring(tau, 0.8, 20.0); s = 0.94 + 0.06 * sp; dy = RISE_DY * (1 - sp)
        elif k == 'pop': s = spring(tau, 0.45, 24.0); dy = 0.0
        elif k == 'soft': s = 1.0; dy = SOFT_DY * (1 - ease_out(tau / SOFT_T)) if tau >= 0 else SOFT_DY
        else: s = 1.0; dy = 0.0
    o = n.get('out')
    if o:
        q = clamp01((t - o['t']) / OUT); a *= 1 - q; dy -= OUT_DY * q
    return dict(a=round(a, 6), s=round(s, 6), dy=round(dy, 4), p=round(p, 6))

def state(n, t):
    """-> (state name, previous state name, mix 0..1) – colours interpolate prev -> cur over MIX seconds."""
    cur, prev, t0 = 'idle', 'idle', -1e9
    for x in n.get('st') or []:
        if t >= x['t']: prev, cur, t0 = cur, x['s'], x['t']
    return cur, prev, clamp01((t - t0) / MIX)

def value(n, t):   # val = one segment or a list of segments (a band bar that steps up on each correct answer)
    v = n.get('val')
    if not v: return None
    segs = v if isinstance(v, list) else [v]; cur = None
    for x in segs:
        if t >= x['t']: cur = x
    if cur is None: return segs[0]['a']
    return cur['a'] + (cur['b'] - cur['a']) * ease_out((t - cur['t']) / cur['d'])

def visible_box(n, t):   # screen box of the node at t (scale about its centre + vertical offset), None when invisible
    ps = pose(n, t)
    if ps['a'] <= 0.004: return None, ps
    x0, y0, x1, y1 = n['box']; cx, cy = (x0 + x1) / 2, (y0 + y1) / 2; s = ps['s']
    return [cx - (cx - x0) * s, cy - (cy - y0) * s + ps['dy'], cx + (x1 - cx) * s, cy + (y1 - cy) * s + ps['dy']], ps
