# Design tokens for the clean video templates (docs/VIDEO-TEMPLATES.md). ONE source of truth: render_tpl.py and qc_tpl.py import this file.
W, H, FPS = 1080, 1920, 30
SAFE = dict(x0=48, x1=924, y0=232, y1=1497)          # platform UI: top 12 %, bottom 22 %, right 14 % never hold text
COLS, GUT = 12, 24
COLW = (SAFE['x1'] - SAFE['x0'] - (COLS - 1) * GUT) / COLS   # 51 px
def col(i): return round(SAFE['x0'] + i * (COLW + GUT))          # left edge of column i (0..11)
def span(a, b): return round(col(b) + COLW) - col(a)             # width of columns a..b inclusive
BASE = 8                                                          # vertical rhythm: every y snaps to 8 px
def snap(y): return int(round(y / BASE) * BASE)

TYPE = dict(label=48, body=60, h2=76, h1=96, display=128)        # one scale (x1.25), nothing below 48 px
LEAD = 1.18                                                       # line height = size x LEAD
FONTS = dict(display='BricolageGrotesque-ExtraBold.ttf', head='BeVietnamPro-ExtraBold.ttf', body='BeVietnamPro-Bold.ttf')

# brand colours = web/js/kit.js (NAVY/NAVY2/RED/CREAM + the Kit accents); no other hues
C = dict(navy=(15, 61, 62), navy2=(23, 89, 90), red=(229, 80, 47), cream=(255, 247, 234), yellow=(255, 201, 74),
         green=(47, 191, 113), white=(255, 255, 255), mint=(220, 238, 232), ink=(15, 61, 62))

# motion: three durations, one easing family (quint cubic-beziers)
DUR = dict(fast=0.2, base=0.3, slow=0.5)
EASE = dict(out=(0.22, 1, 0.36, 1), inn=(0.64, 0, 0.78, 0), inout=(0.83, 0, 0.17, 1))
TRAVEL = dict(rise=40, slide=120)                                 # entry travel in px (rise = from below, slide = from the right)
MIN_READ = 0.8                                                    # s a text block stays fully visible
MIN_PX = 48

def bezier(p, x):
    """CSS cubic-bezier(p) evaluated at progress x in [0,1] (Newton + bisection on the x curve)."""
    x1, y1, x2, y2 = p
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    cx, bx = 3 * x1, 3 * (x2 - x1) - 3 * x1; ax = 1 - cx - bx
    cy, by = 3 * y1, 3 * (y2 - y1) - 3 * y1; ay = 1 - cy - by
    fx = lambda t: ((ax * t + bx) * t + cx) * t
    t = x
    for _ in range(8):
        d = (3 * ax * t + 2 * bx) * t + cx
        if abs(d) < 1e-6: break
        t2 = t - (fx(t) - x) / d
        if not 0 <= t2 <= 1: break
        t = t2
    lo, hi = 0.0, 1.0
    for _ in range(30):
        if abs(fx(t) - x) < 1e-6: break
        if fx(t) < x: lo = t
        else: hi = t
        t = (lo + hi) / 2
    return ((ay * t + by) * t + cy) * t
