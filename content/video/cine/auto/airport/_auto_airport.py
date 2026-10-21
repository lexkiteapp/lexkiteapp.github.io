# AUTO-GENERATED adapter (scripts/cine/gen_lessons.py): role names -> airport bank clips + v3 viral helpers (same as hotel/_hotel_common.py)
MASTER = 'b01_master_talk'
B1 = 'a01_ots_mei_talk'
B2 = 'a03_ots_mei_talk_b'
BREACT = 'a08_mei_pass'
A1 = 'a02_ots_ama_talk'
A2 = 'a04_ots_ama_talk_b'
MCU = 'a07_ama_mcu_talk'
OOPS = 'a06_ama_react'
THX = 'a09_ama_thanks'
BW = 'mei'; FD = D + '/foley/'; CONTRAST_Y = 900; BADGE_Y = 240; CHOICE_Y = 1040; HOOK_Y = 1080; LADDER_Y = 1072; POV_Y = 232
RING_EXTRA = {'ring': 1080}; FOOT_EXTRA = {}
SERIES_SHOTS = ('loop',); SERIES_ALIGN = 'left'; SERIES_Y = 240   # series chip only on the loop, top-left (the hook card owns the master)
VHOOK_BOX = (60, 236, 640, 470); AVOID = {MASTER: [[150, 500, 560, 1920], [700, 280, 1080, 1920]]}
WHO = {B1: [BW], B2: [BW], BREACT: [BW], A1: ['ama'], A2: ['ama'], MCU: ['ama'], OOPS: ['ama'], THX: ['ama'], MASTER: [BW, 'ama']}
RANGE = {OOPS: (0, 50)}
PROP = ('i01_passport', 0, 1.6, None, 0)
CUR = {}; BEATS = {}
def take(clip, n, lo=None, hi=None):
    lo = RANGE.get(clip, (0, 120))[0] if lo is None else lo; hi = RANGE.get(clip, (0, 120))[1] if hi is None else hi
    p, d = CUR.get(clip, (lo, 1)); out = []
    for _ in range(n):
        out.append(p)
        if not lo <= p + d <= hi: d = -d
        p += d
    CUR[clip] = (p, d); return lambda m: out[:m]
def talk(id, clip, who, k, at=0.07, tail=0.42, tempo=None, ov=(), foley=()):
    l = line(k, at, tempo); n = int(round((at + l['dur'] + tail) * FPS))
    shot(id, clip, n / FPS, take(clip, n), [(clip, w, [l] if w == who else []) for w in WHO.get(clip, [])], [(who, l)], ov=ov, foley=foley); return l
def hold(id, clip, dur, ov=(), foley=(), reset=False):
    if reset: CUR.pop(clip, None)
    n = int(round(dur * FPS)); shot(id, clip, n / FPS, take(clip, n), [(clip, w, []) for w in WHO.get(clip, [])], [], ov=ov, foley=foley)
def vhook(txt):
    nw = len(txt.split('|')[0].split()); dur = min(2.0, max(1.6, 0.4 + 0.28 * nw) + 0.05); BEATS['hook'] = dur
    hold('hook', MASTER, dur, ov=[('VHook', 0.0, None, txt)], foley=[(FD + 'tone0.wav', 0.0)], reset=True)
def vend(recap, clip=None):
    hold('recap', clip or BREACT, 2.8, ov=[('Recap', 0.0, 2.5, recap + '|')])
    shot('loop', MASTER, 1.0, lambda m: list(range(m - 1, -1, -1)), [(MASTER, w, []) for w in WHO[MASTER]], [], ov=[('Follow', 0.0, None, 'Follow for daily English|lexkite.com')])
def prop():   # scene prop insert (bank.json usable range), foley only where the event is visible
    c, f0, d, snd, at = PROP; fl = [(FD + snd, at / FPS)] if snd else []
    shot('prop', c, d, lambda n: list(range(f0, f0 + n)), [], [], foley=fl)
