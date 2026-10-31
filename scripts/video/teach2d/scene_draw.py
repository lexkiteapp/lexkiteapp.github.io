#!/usr/bin/env python3
"""Teach2D scene art (owner 31/10 'thêm cảnh'): draws the newer flat Kit vector rooms of scenes.json from one design per scene, for both formats.
Design coords: x 0..1080 across the room, h = height above the floor line (wall props h 0..364 so the short corner / side layouts keep them under the
caption box without scaling), front props = h above the counter top. short: X = x, Y = 1660 - h (front: 1830 - h); wide: X = 1072 + 0.785 x,
Y = 800 - 0.785 h (front: 900 - 0.9 h) – the teacher stands at design x ~540 in both. Same rules as every scene (docs/VIDEO-TEACH2D.md): theme tokens
only, no text, no people, nothing moving, card region empty. `python3 scene_draw.py --write` adds / refreshes ONLY these keys in scenes.json
(hand-made scenes untouched); `--check` exits 1 when scenes.json differs from this file (CI keeps the two in step)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__)); P = f'{HERE}/../remotion/src/teach/scenes.json'
F = dict(short=dict(x0=0, sx=1.0, fl=1660, top=1150, W=1080, ct=1830, sf=1.0), wide=dict(x0=1072, sx=0.785, fl=800, top=160, W=1920, ct=900, sf=0.9))


class Room:
    def __init__(s, fmt): s.f = F[fmt]; s.items = []

    def X(s, x): return round(s.f['x0'] + min(1080, max(0, x)) * s.f['sx'], 1)   # the room never reaches left of its own frame (wide: card region)
    def Y(s, h, front=False): return round((s.f['ct'] - h * s.f['sf']) if front else (s.f['fl'] - h * s.f['sx']), 1)
    def XF(s, x): return round(s.f['x0'] + x * s.f['sx'], 1)   # front props keep the room's x, counter scale for size

    def _add(s, it, front, g):
        if front: it['l'] = 'front'; it['g'] = g
        s.items.append(it); return it

    def box(s, x0, h0, x1, h1, front=False, g=None):
        if front:
            cx = (x0 + x1) / 2; w = (x1 - x0) * s.f['sf']
            return [round(s.XF(cx) - w / 2, 1), s.Y(h1, True), round(s.XF(cx) + w / 2, 1), s.Y(h0, True)]
        return [s.X(x0), s.Y(h1), s.X(x1), s.Y(h0)]

    def r(s, x0, h0, x1, h1, c, a, rad=0, front=False, g=None):
        return s._add(dict(k='r', b=s.box(x0, h0, x1, h1, front), r=round(rad * (s.f['sf'] if front else s.f['sx']), 1), c=c, a=a), front, g)

    def o(s, x0, h0, x1, h1, c, a, front=False, g=None): return s._add(dict(k='o', b=s.box(x0, h0, x1, h1, front), c=c, a=a), front, g)
    def glow(s, x0, h0, x1, h1, c, a, front=False, g=None): return s._add(dict(k='g', b=s.box(x0, h0, x1, h1, front), c=c, a=a), front, g)

    def ring(s, x0, h0, x1, h1, c, a, sw, front=False, g=None):
        return s._add(dict(k='ring', b=s.box(x0, h0, x1, h1, front), c=c, a=a, sw=round(sw * (s.f['sf'] if front else s.f['sx']), 1)), front, g)

    def p(s, pts, c, a, front=False, g=None):
        if front:   # front polygons: scale about the polygon's own centre x (like box())
            cx = sum(x for x, _ in pts) / len(pts)
            q = [[round(s.XF(cx) + (x - cx) * s.f['sf'], 1), s.Y(h, True)] for x, h in pts]
        else: q = [[s.X(x), s.Y(h)] for x, h in pts]
        return s._add(dict(k='p', pts=q, c=c, a=a), front, g)

    def lg(s, x0, h0, x1, h1, c, a, a2, d=None):
        it = dict(k='lg', b=s.box(x0, h0, x1, h1), c=c, a=a, a2=a2)
        if d: it['dir'] = d
        return s._add(it, False, None)

    # full-width surfaces (>= 90 % of the frame width: scene.surface) – wall band, skirting, floor
    def wall(s, c='wall', a=0.5, skirt='tile_edge', floor='wood', fa=(0.22, 0.34), lines=True):
        W, fl, top, x0 = s.f['W'], s.f['fl'], s.f['top'], s.f['x0']; ct = s.f['ct']
        s.items += [dict(k='r', b=[x0, top, W, fl], r=0, c=c, a=a), dict(k='lg', b=[x0, top, W, fl], c='shade', a=0.0, a2=0.16),
                    dict(k='r', b=[x0, fl - 14 * s.f['sx'], W, fl], r=0, c=skirt, a=0.6), dict(k='lg', b=[x0, fl, W, ct], c=floor, a=fa[0], a2=fa[1])]
        if lines: s.items += [dict(k='r', b=[x0, round(fl + (ct - fl) * f, 1), W, round(fl + (ct - fl) * f + 3, 1)], r=0, c='shade', a=0.18) for f in (0.2, 0.46, 0.74)]

    def band(s, h0, h1, c, a):   # full-width horizontal band on the wall (sky / sea / stripe)
        return s._add(dict(k='r', b=[s.f['x0'], s.Y(h1), s.f['W'], s.Y(h0)], r=0, c=c, a=a), False, None)

    # --- shared props ---
    def window(s, x0, x1, h0, h1, panes=2, shaft=True, sky='sky'):
        s.r(x0 - 12, h0 - 12, x1 + 12, h1 + 12, 'edge', 0.85, 16); s.r(x0, h0, x1, h1, sky, 0.55, 8)
        for i in range(1, panes): xm = x0 + (x1 - x0) * i / panes; s.r(xm - 5, h0, xm + 5, h1, 'edge', 0.85)
        s.r(x0 - 22, h0 - 26, x1 + 22, h0 - 12, 'tile_edge', 0.9, 6)
        if shaft: s.p([[x0, h0 - 26], [x1, h0 - 26], [x1 + 60, -150], [x0 + 20, -150]], 'glow', 0.07)

    def plant(s, x, h0=0, k=1.0):
        s.p([[x - 34 * k, h0 + 70 * k], [x + 34 * k, h0 + 70 * k], [x + 26 * k, h0], [x - 26 * k, h0]], 'coral', 0.75)
        for dx, hh, w in ((-30, 150, 34), (0, 190, 38), (30, 160, 34), (-12, 120, 30), (16, 128, 30)):
            s.o(x + (dx - w) * k, h0 + (hh - 70) * k, x + (dx + w) * k, h0 + hh * k, 'leaf', 0.8)

    def lamp(s, x, h_top=364, drop=90, c='accent'):
        s.r(x - 2, h_top - drop, x + 2, h_top, 'tile_edge', 0.8)
        s.p([[x - 34, h_top - drop - 34], [x + 34, h_top - drop - 34], [x + 18, h_top - drop], [x - 18, h_top - drop]], 'tile_edge', 0.9)
        s.o(x - 18, h_top - drop - 44, x + 18, h_top - drop - 28, 'glow', 0.9); s.glow(x - 150, h_top - drop - 240, x + 150, h_top - drop + 40, 'glow', 0.16)

    def chair(s, x, c='tile_edge', k=1.0):
        s.r(x - 40 * k, 80 * k, x + 40 * k, 96 * k, c, 0.9, 6); s.r(x - 36 * k, 96 * k, x - 24 * k, 190 * k, c, 0.9, 4)
        s.r(x - 36 * k, 0, x - 26 * k, 80 * k, c, 0.85); s.r(x + 26 * k, 0, x + 36 * k, 80 * k, c, 0.85)

    def mug(s, x, c='coral', g='mug'):
        s.r(x - 26, 0, x + 26, 52, c, 0.85, 10, True, g); s.ring(x + 14, 12, x + 44, 42, c, 0.85, 8, True, g); s.o(x - 22, 46, x + 22, 58, 'shade', 0.35, True, g)


def airport(R):
    R.wall('wall', 0.45, floor='tile', fa=(0.3, 0.45))
    R.r(-40, 120, 1120, 364, 'sky', 0.4, 0)                                  # glass wall to the apron
    for x in range(0, 1081, 180): R.r(x - 6, 120, x + 6, 364, 'edge', 0.8)
    R.r(-40, 112, 1120, 124, 'tile_edge', 0.9)
    R.p([[700, 250], [940, 262], [990, 276], [940, 284], [700, 280]], 'card', 0.75)   # plane on the apron
    R.p([[820, 268], [870, 230], [900, 230], [870, 272]], 'card', 0.7); R.p([[830, 278], [880, 320], [906, 320], [868, 278]], 'card', 0.6)
    R.p([[700, 262], [672, 304], [690, 304], [720, 268]], 'card', 0.7)
    R.glow(620, 140, 1040, 360, 'glow', 0.14)
    R.r(70, 236, 330, 340, 'ledge', 0.8, 10)                                  # departures board: abstract rows, no characters
    for i, h in enumerate((316, 292, 268, 248)):
        R.r(90, h - 8, 170, h, 'accent' if i == 0 else 'muted', 0.55, 3); R.r(184, h - 8, 300, h, 'primary' if i % 2 else 'muted', 0.4, 3)
    for x in (40, 130, 220, 860, 950):                                       # row of gate seats
        R.r(x, 54, x + 80, 70, 'primary', 0.55, 6); R.r(x + 4, 70, x + 76, 128, 'primary', 0.45, 8)
    R.r(30, 30, 1040, 40, 'tile_edge', 0.7)
    R.r(296, 0, 360, 96, 'coral', 0.75, 10); R.r(316, 96, 340, 128, 'tile_edge', 0.9, 4); R.r(306, 30, 350, 36, 'shade', 0.25)   # suitcase
    R.o(300, -6, 316, 8, 'shade', 0.6); R.o(340, -6, 356, 8, 'shade', 0.6)
    R.r(130, 0, 230, 34, 'card', 0.95, 6, True, 'passport'); R.r(140, 34, 220, 44, 'primary', 0.8, 3, True, 'passport')
    R.r(880, 0, 920, 96, 'primary', 0.85, 8, True, 'bag'); R.r(888, 96, 912, 120, 'tile_edge', 0.9, 4, True, 'bag')


def restaurant(R):
    R.wall('wall', 0.5, floor='wood')
    R.r(-40, 0, 1120, 150, 'wood', 0.4); R.r(-40, 146, 1120, 158, 'wood', 0.85, 4)   # wood wainscot
    for x0 in (60, 820):                                                     # framed pictures (abstract hills)
        R.r(x0, 210, x0 + 190, 330, 'tile_edge', 0.9, 8); R.r(x0 + 12, 222, x0 + 178, 318, 'sky', 0.5, 4)
        R.p([[x0 + 12, 222], [x0 + 80, 290], [x0 + 130, 250], [x0 + 178, 300], [x0 + 178, 222]], 'leaf', 0.6)
        R.o(x0 + 130, 286, x0 + 156, 312, 'glow', 0.8)
    for x in (270, 540, 810): R.lamp(x, 364, 70)
    for x in (150, 930):                                                     # tables with cloths, chairs either side
        R.chair(x - 90); R.chair(x + 90)
        R.p([[x - 90, 120], [x + 90, 120], [x + 104, 60], [x - 104, 60]], 'card', 0.85); R.r(x - 8, 0, x + 8, 60, 'tile_edge', 0.85)
        R.o(x - 34, 120, x + 4, 132, 'muted', 0.7); R.r(x + 20, 120, x + 30, 160, 'primary', 0.55, 3); R.o(x + 14, 156, x + 36, 176, 'primary', 0.45)
    R.glow(380, -40, 700, 160, 'glow', 0.12)
    R.o(150, 0, 290, 22, 'card', 1, True, 'plate'); R.o(186, 12, 254, 40, 'accent', 0.8, True, 'plate'); R.o(204, 24, 236, 46, 'leaf', 0.75, True, 'plate')
    R.r(880, 0, 888, 60, 'muted', 0.85, 2, True, 'glass'); R.p([[860, 60], [908, 60], [900, 110], [868, 110]], 'primary', 0.55, True, 'glass')
    R.o(860, -4, 908, 6, 'muted', 0.8, True, 'glass')


def supermarket(R):
    R.wall('wall', 0.4, floor='tile', fa=(0.3, 0.42))
    pal = ['coral', 'accent', 'primary', 'good', 'muted', 'leaf']
    for sx0, sx1 in ((20, 330), (750, 1060)):                                 # shelving units full of boxes
        R.r(sx0, 0, sx1, 364, 'tile_edge', 0.55, 8)
        for j, h in enumerate((24, 120, 216)):
            R.r(sx0, h - 10, sx1, h, 'card', 0.85, 3); x = sx0 + 12; i = j
            while x < sx1 - 30:
                w = 34 + (i * 7) % 18; hh = 54 + (i * 11) % 28
                R.r(x, h, x + w, h + hh, pal[i % len(pal)], 0.6, 4); x += w + 6; i += 1
            R.r(sx0 + 20, h - 26, sx0 + 50, h - 12, 'accent', 0.75, 2); R.r(sx1 - 50, h - 26, sx1 - 20, h - 12, 'accent', 0.75, 2)   # shelf tags (blank)
    R.r(380, 300, 700, 340, 'tint', 1, 10)                                   # aisle banner (series colour, blank)
    for x in (420, 540, 660): R.lamp(x, 364, 10, 'glow')
    R.p([[380, 0], [400, 110], [560, 110], [540, 0]], 'tile_edge', 0.35)      # shopping cart
    R.r(380, 106, 570, 114, 'tile_edge', 0.9, 3); R.r(560, 114, 568, 150, 'tile_edge', 0.9, 3)
    for x in (406, 450, 494): R.r(x, 10, x + 4, 106, 'tile_edge', 0.6)
    R.o(392, -14, 418, 8, 'shade', 0.7); R.o(516, -14, 542, 8, 'shade', 0.7)
    R.r(130, 0, 250, 50, 'tile_edge', 0.85, 8, True, 'basket'); R.ring(150, 40, 230, 96, 'tile_edge', 0.9, 8, True, 'basket')
    R.o(146, 40, 186, 80, 'coral', 0.9, True, 'basket'); R.o(186, 40, 226, 78, 'good', 0.85, True, 'basket')
    R.o(880, 0, 930, 50, 'coral', 0.9, True, 'apple'); R.r(902, 48, 908, 66, 'wood', 0.9, 2, True, 'apple'); R.o(906, 54, 932, 68, 'leaf', 0.85, True, 'apple')


def clinic(R):
    R.wall('wall', 0.4, floor='tile', fa=(0.28, 0.4))
    R.r(-40, 0, 1120, 130, 'card', 0.3); R.r(-40, 126, 1120, 136, 'primary', 0.45, 3)   # wipe-clean wall panel
    R.r(470, 250, 610, 364, 'card', 0.6, 14); R.r(524, 266, 556, 348, 'good', 0.75, 4); R.r(498, 292, 582, 322, 'good', 0.75, 4)   # cross sign
    R.window(780, 1010, 180, 340, 2)
    R.r(60, 0, 360, 34, 'tile_edge', 0.8, 6); R.r(70, 34, 350, 90, 'primary', 0.55, 16); R.r(70, 90, 160, 120, 'card', 0.8, 12)   # exam couch
    R.r(80, -4, 92, 0, 'tile_edge', 0.8); R.r(330, -4, 342, 0, 'tile_edge', 0.8)
    R.r(400, 0, 460, 210, 'tile_edge', 0.5, 6); R.r(408, 110, 452, 200, 'sky', 0.4, 4); R.r(408, 10, 452, 100, 'card', 0.5, 4)   # cabinet
    R.r(700, 0, 706, 250, 'tile_edge', 0.85); R.o(680, -8, 726, 6, 'tile_edge', 0.85); R.r(672, 230, 734, 280, 'sky', 0.5, 12)   # drip stand bag
    R.plant(960, 0, 0.9)
    R.r(130, 0, 250, 70, 'card', 0.95, 8, True, 'kit'); R.r(178, 14, 202, 56, 'coral', 0.9, 3, True, 'kit'); R.r(160, 26, 220, 44, 'coral', 0.9, 3, True, 'kit')
    R.r(166, 70, 214, 80, 'tile_edge', 0.9, 3, True, 'kit')
    R.ring(860, 0, 940, 70, 'tile_edge', 0.9, 7, True, 'steth'); R.o(886, 0, 914, 22, 'muted', 0.9, True, 'steth')


def gym(R):
    R.wall('wall', 0.45, floor='shade', fa=(0.25, 0.4))
    R.r(-40, 300, 1120, 316, 'tint', 1, 0)                                   # series-colour stripe
    R.r(380, 40, 700, 280, 'sky', 0.3, 10); R.r(380, 40, 700, 52, 'edge', 0.8)   # wall mirror
    R.p([[440, 280], [520, 280], [420, 40], [400, 40]], 'card', 0.12)
    R.r(40, 0, 320, 18, 'tile_edge', 0.85, 4); R.r(40, 18, 52, 200, 'tile_edge', 0.85); R.r(308, 18, 320, 200, 'tile_edge', 0.85)   # dumbbell rack
    for j, h in enumerate((70, 150)):
        R.r(40, h - 8, 320, h, 'tile_edge', 0.9, 3)
        for i, x in enumerate((80, 150, 220, 280)):
            c = ('coral', 'accent', 'primary', 'good')[(i + j) % 4]; R.o(x - 22, h, x - 4, h + 34 - j * 4, c, 0.85); R.o(x + 4, h, x + 22, h + 34 - j * 4, c, 0.85)
    R.p([[760, 0], [1040, 0], [1040, 40], [780, 60]], 'tile_edge', 0.8)       # treadmill
    R.r(980, 40, 994, 220, 'tile_edge', 0.85); R.r(940, 210, 1030, 240, 'ledge', 0.8, 8); R.r(958, 218, 1012, 232, 'primary', 0.6, 3)
    for x in (820, 880): R.o(x - 30, 0, x + 30, 56, 'shade', 0.65); R.ring(x - 16, 44, x + 16, 76, 'shade', 0.65, 8)   # kettlebells
    R.r(130, 0, 170, 110, 'primary', 0.8, 12, True, 'bottle'); R.r(138, 110, 162, 126, 'tile_edge', 0.9, 4, True, 'bottle'); R.r(130, 40, 170, 70, 'card', 0.6, 0, True, 'bottle')
    R.r(840, 16, 940, 28, 'tile_edge', 0.95, 4, True, 'dumbbell'); R.r(826, 0, 852, 44, 'coral', 0.9, 6, True, 'dumbbell'); R.r(928, 0, 954, 44, 'coral', 0.9, 6, True, 'dumbbell')


def hotel(R):
    R.wall('wall', 0.5, floor='wood', fa=(0.25, 0.38))
    for x in range(30, 1081, 120): R.r(x, 0, x + 4, 364, 'tile_edge', 0.18)   # wall panels
    R.r(60, 140, 300, 330, 'wood', 0.55, 10)                                  # key board: brass hooks, small tags
    for i in range(4):
        for j in range(3):
            x = 92 + i * 56; h = 300 - j * 60; R.o(x - 6, h - 6, x + 6, h + 6, 'accent', 0.85); R.r(x - 10, h - 40, x + 10, h - 12, 'card', 0.6, 4)
    R.r(780, 0, 1000, 300, 'tile_edge', 0.8, 8); R.r(792, 0, 888, 288, 'muted', 0.45, 4); R.r(892, 0, 988, 288, 'muted', 0.45, 4)   # lift doors
    R.o(878, 310, 902, 334, 'accent', 0.85)
    R.o(470, 300, 610, 340, 'accent', 0.6); R.r(538, 340, 542, 364, 'tile_edge', 0.8)   # chandelier
    for x in (490, 520, 560, 590): R.o(x - 6, 286, x + 6, 304, 'glow', 0.9)
    R.glow(360, 160, 720, 420, 'glow', 0.16)
    R.plant(380, 0, 0.9); R.plant(700, 0, 0.9)
    R.r(10, 0, 250, 14, 'accent', 0.7, 4)                                     # luggage trolley
    R.r(24, 14, 34, 220, 'accent', 0.8); R.r(226, 14, 236, 220, 'accent', 0.8); R.r(24, 210, 236, 222, 'accent', 0.8, 4)
    R.r(50, 14, 130, 120, 'coral', 0.75, 10); R.r(140, 14, 214, 90, 'primary', 0.7, 10)
    R.o(150, 0, 230, 14, 'tile_edge', 0.9, True, 'bell'); R.o(160, 8, 220, 64, 'accent', 0.9, True, 'bell'); R.r(186, 62, 194, 76, 'accent', 0.9, 3, True, 'bell')
    R.r(860, 0, 940, 10, 'card', 0.95, 3, True, 'keycard'); R.r(870, 10, 930, 50, 'primary', 0.85, 6, True, 'keycard')


def beach(R):
    W, fl, top, x0, ct = R.f['W'], R.f['fl'], R.f['top'], R.f['x0'], R.f['ct']
    R.items += [dict(k='r', b=[x0, top, W, fl], r=0, c='sky', a=0.35), dict(k='lg', b=[x0, top, W, fl], c='glow', a=0.0, a2=0.18)]
    R.glow(760, 200, 1020, 420, 'glow', 0.3); R.o(840, 270, 940, 364, 'accent', 0.7)   # low sun
    R.band(0, 120, 'primary', 0.45); R.band(116, 124, 'card', 0.35)          # sea + horizon line
    for x, h in ((140, 70), (420, 40), (760, 86)): R.r(x, h, x + 120, h + 6, 'card', 0.4, 3)   # wave glints
    R.p([[600, 120], [660, 120], [640, 150]], 'card', 0.6); R.p([[630, 150], [632, 230], [690, 150]], 'card', 0.75)   # sail boat far out
    R.items += [dict(k='lg', b=[x0, fl, W, ct], c='accent', a=0.32, a2=0.45)]   # sand
    R.items += [dict(k='r', b=[x0, fl - 4, W, fl + 4], r=0, c='card', a=0.35)]  # wet sand edge
    R.p([[90, 0], [110, 0], [150, 300], [134, 300]], 'wood', 0.85)            # palm
    for pts in ([[142, 300], [40, 250], [70, 300]], [[142, 300], [250, 260], [220, 310]], [[142, 300], [90, 364], [150, 320]], [[142, 300], [220, 364], [170, 316]]):
        R.p(pts, 'leaf', 0.85)
    R.o(126, 276, 146, 296, 'wood', 0.9); R.o(142, 280, 162, 300, 'wood', 0.9)
    R.r(926, -20, 934, 200, 'card', 0.9)                                      # beach umbrella
    R.p([[820, 190], [1040, 190], [990, 250], [870, 250]], 'coral', 0.85); R.p([[900, 190], [960, 190], [945, 250], [915, 250]], 'card', 0.7)
    R.o(160, -10, 320, 14, 'coral', 0.5); R.r(180, 0, 300, 10, 'card', 0.5, 4)   # towel
    R.p([[130, 0], [210, 0], [190, 40], [150, 40]], 'coral', 0.85, True, 'shell'); R.p([[150, 40], [190, 40], [170, 60]], 'coral', 0.85, True, 'shell')
    R.ring(860, 0, 910, 36, 'shade', 0.9, 9, True, 'shades'); R.ring(914, 0, 964, 36, 'shade', 0.9, 9, True, 'shades'); R.r(906, 22, 918, 28, 'shade', 0.9, 0, True, 'shades')


def bus(R):
    R.wall('tile', 0.6, floor='shade', fa=(0.3, 0.45))
    R.r(-40, 140, 1120, 350, 'ledge', 0.5)                                    # window strip with the city passing
    for x in (0, 270, 540, 810):
        R.r(x + 20, 160, x + 250, 330, 'sky', 0.45, 18)
        for bx, bh, bw in ((40, 60, 50), (100, 100, 40), (150, 70, 60), (210, 120, 30)):
            R.r(x + bx, 160, x + bx + bw, 160 + bh, 'tile_edge', 0.4, 3)
    R.r(-40, 350, 1120, 364, 'tile_edge', 0.85, 4)                            # handrail along the roof
    for x in (130, 400, 680, 950):
        R.r(x - 2, 290, x + 2, 352, 'tile_edge', 0.8); R.ring(x - 20, 250, x + 20, 294, 'accent', 0.85, 8)   # hanging straps
    R.r(330, 0, 344, 350, 'accent', 0.85, 6); R.r(736, 0, 750, 350, 'accent', 0.85, 6)   # yellow poles
    for x in (20, 860):                                                       # seats
        R.r(x, 0, x + 200, 20, 'tile_edge', 0.8, 6); R.r(x, 20, x + 200, 70, 'primary', 0.55, 12); R.r(x + 150, 70, x + 200, 170, 'primary', 0.5, 12)
    R.r(130, 0, 240, 10, 'card', 0.95, 3, True, 'ticket'); R.r(140, 10, 230, 50, 'accent', 0.85, 6, True, 'ticket'); R.o(176, 22, 194, 40, 'card', 0.8, True, 'ticket')
    R.r(850, 0, 950, 80, 'coral', 0.8, 14, True, 'backpack'); R.r(866, 20, 934, 50, 'shade', 0.25, 6, True, 'backpack'); R.ring(874, 64, 926, 108, 'coral', 0.85, 8, True, 'backpack')


def bedroom(R):
    R.wall('wall', 0.5, floor='wood')
    R.window(760, 980, 170, 340, 2, shaft=False, sky='ledge')                # night window, moon
    R.o(900, 280, 940, 320, 'glow', 0.85); R.o(912, 286, 948, 322, 'ledge', 0.7)
    R.r(730, 150, 764, 352, 'coral', 0.6, 8); R.r(976, 150, 1010, 352, 'coral', 0.6, 8)   # curtains
    R.r(90, 210, 260, 330, 'tile_edge', 0.9, 8); R.r(100, 220, 250, 320, 'sky', 0.4, 4); R.o(140, 240, 210, 300, 'accent', 0.5)   # framed print
    R.r(0, 0, 420, 40, 'wood', 0.85, 6); R.r(0, 40, 420, 100, 'card', 0.7, 14); R.r(0, 60, 420, 110, 'primary', 0.55, 16)   # bed
    R.r(20, 110, 140, 150, 'card', 0.85, 18); R.r(150, 110, 270, 150, 'card', 0.85, 18); R.r(-20, 0, 10, 200, 'wood', 0.85, 6)
    R.r(450, 0, 560, 110, 'wood', 0.75, 6); R.r(460, 60, 550, 64, 'shade', 0.3)   # nightstand + lamp
    R.r(500, 110, 510, 170, 'tile_edge', 0.85); R.p([[470, 170], [540, 170], [526, 220], [484, 220]], 'accent', 0.8)
    R.glow(380, 60, 630, 300, 'glow', 0.22)
    R.o(130, 0, 210, 80, 'card', 0.95, True, 'clock'); R.o(140, 10, 200, 70, 'ledge', 0.85, True, 'clock')
    R.r(168, 38, 172, 62, 'accent', 0.95, 1, True, 'clock'); R.r(168, 38, 188, 42, 'accent', 0.95, 1, True, 'clock'); R.o(126, 70, 146, 90, 'coral', 0.9, True, 'clock')
    R.r(860, 0, 980, 20, 'primary', 0.85, 3, True, 'book'); R.r(870, 20, 970, 36, 'coral', 0.85, 3, True, 'book')


def meeting(R):
    R.wall('wall', 0.45, floor='tile', fa=(0.25, 0.38))
    R.r(40, 120, 380, 340, 'card', 0.55, 10); R.r(40, 112, 380, 122, 'tile_edge', 0.85, 3)   # whiteboard: chart lines only
    R.p([[80, 160], [160, 220], [240, 190], [340, 290], [346, 282], [240, 178], [160, 208], [86, 150]], 'primary', 0.8)
    R.r(70, 250, 160, 260, 'muted', 0.6, 3); R.r(70, 280, 200, 290, 'muted', 0.6, 3)
    R.r(700, 150, 1040, 340, 'ledge', 0.85, 12); R.r(712, 162, 1028, 328, 'sky', 0.3, 6)   # wall screen: bar chart
    for i, hh in enumerate((50, 90, 70, 130)): R.r(760 + i * 64, 182, 800 + i * 64, 182 + hh, ('primary', 'accent', 'coral', 'good')[i], 0.75, 4)
    R.r(400, 220, 680, 364, 'sky', 0.25); R.r(536, 220, 544, 364, 'edge', 0.6)   # glass wall to the corridor
    R.p([[0, 90], [1080, 90], [1080, 70], [0, 70]], 'wood', 0.8); R.r(0, 0, 1080, 70, 'wood', 0.35)   # long table
    for x in (90, 250, 830, 990): R.chair(x, 'primary', 0.9)
    R.plant(620, 0, 0.85)
    R.r(120, 0, 260, 10, 'tile_edge', 0.95, 4, True, 'laptop'); R.p([[136, 10], [244, 10], [236, 96], [144, 96]], 'tile_edge', 0.9, True, 'laptop')
    R.p([[144, 18], [236, 18], [230, 88], [150, 88]], 'sky', 0.6, True, 'laptop')
    R.r(860, 0, 960, 14, 'card', 0.95, 3, True, 'notes'); R.r(872, 14, 948, 22, 'accent', 0.85, 3, True, 'notes'); R.r(960, 4, 1010, 10, 'coral', 0.9, 2, True, 'notes')


def dump(J):   # scenes.json house style: one compact item per line
    o = ['{', ' "_note": ' + json.dumps(J['_note'], ensure_ascii=False) + ',', ' "scenes": {']; ks = list(J['scenes'])
    for i, k in enumerate(ks):
        o.append(f'  "{k}": {{'); fs = list(J['scenes'][k])
        for j, f in enumerate(fs):
            it = J['scenes'][k][f]; o.append(f'   "{f}": [')
            o += ['    ' + json.dumps(x, separators=(',', ':'), ensure_ascii=False) + (',' if n < len(it) - 1 else '') for n, x in enumerate(it)]
            o.append('   ]' + (',' if j < len(fs) - 1 else ''))
        o.append('  }' + (',' if i < len(ks) - 1 else ''))
    return '\n'.join(o + [' }', '}']) + '\n'


DRAW = dict(airport=airport, restaurant=restaurant, supermarket=supermarket, clinic=clinic, gym=gym, hotel=hotel, beach=beach, bus=bus, bedroom=bedroom, meeting=meeting)


def build():
    out = {}
    for k, fn in DRAW.items():
        out[k] = {}
        for fmt in ('short', 'wide'):
            R = Room(fmt); fn(R); out[k][fmt] = R.items
    return out


if __name__ == '__main__':
    J = json.load(open(P)); new = build(); cur = {k: J['scenes'].get(k) for k in new}
    if '--check' in sys.argv: sys.exit(0 if cur == new else 1)
    if '--write' in sys.argv:
        J['scenes'].update(new); open(P, 'w').write(dump(J)); print('wrote', ', '.join(new))
    else: print(json.dumps({k: {f: len(v) for f, v in s.items()} for k, s in new.items()}))
