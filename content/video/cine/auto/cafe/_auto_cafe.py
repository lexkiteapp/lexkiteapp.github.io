# AUTO-GENERATED adapter (scripts/cine/gen_lessons.py): role names -> cafe bank clips + v3 viral helpers.
# Beats are collected first and laid out in vend() on the REAL wav durations (auto_voice.py synthesised them): breath 0.45 s after the
# last mouth cue, optional beats dropped / pad beats added to land in 18.8-23.2 s, mistake reveal >= 62 % of the content;
# frames only from clean mouth-swap ranges (residual.json, residual.py <= 11.5).
MASTER = 'c01_master_talk_a'
B1 = 'c03_ots_carlos_talk_a'
B2 = 'c04_ots_carlos_talk_b'
BREACT = 'c08_ots_carlos_react'
A1 = 'c05_ots_ama_talk_a'
A2 = 'c06_ots_ama_talk_b'
MCU = 'c10_ama_mcu_talk'
OOPS = 'c07_ots_ama_react'
THX = 'c06_ots_ama_talk_b'
BW = 'carlos'; FD = D + '/foley/'; CONTRAST_Y = 900; BADGE_Y = 240; CHOICE_Y = 1040; HOOK_Y = 250; LADDER_Y = 250; POV_Y = 232
RING_EXTRA = {'ring': 1080}; FOOT_EXTRA = {}; LADDER_ROW = 112; RING_MINH = 160; CHOICE_ROW = 86; CHOICE_PAD = 20   # compact cards: fit between big faces and the caption band
SERIES_SHOTS = ('loop',); SERIES_ALIGN = 'left'; SERIES_Y = 240   # default spots only: lesson5's placer (place.py) moves any card off faces / other cards
VHOOK_BOX = (60, 236, 520, 442); AVOID = {MASTER: [[83, 479, 478, 883], [0, 810, 612, 1920], [550, 181, 792, 504], [470, 466, 872, 1920]]}
WHO = {B1: [BW], B2: [BW], BREACT: [BW], A1: ['ama'], A2: ['ama'], MCU: ['ama'], OOPS: ['ama'], THX: ['ama'], MASTER: [BW, 'ama']}
RANGE = {BREACT: (0, 72), OOPS: (19, 77)}
PROP = ('c15_insert_handover', 0, 1.6, None, 0)
CUR = {}; BEATS = {}; PEND = []; BREATH = 0.45; RMAX = 11.5
RES = json.load(open(D + '/residual.json')) if os.path.exists(D + '/residual.json') else {}
def _run(clip, lo, hi, talker, ws):   # longest frame run whose residual stays <= RMAX for every mouth in ws (talker: worst viseme, others: closed)
    p = RES.get(clip, {}); ws = [w for w in ws if w in p]
    if not ws: return lo, hi, hi - lo + 1
    hi = min(hi, min(len(p[w]['X']) for w in ws) - 1); ok = [all(p[w]['talk' if w == talker else 'X'][f] <= RMAX for w in ws) for f in range(lo, hi + 1)]
    best, st = (0, -1), None
    for i, v in enumerate(ok + [False]):
        if v and st is None: st = i
        elif not v and st is not None:
            if i - st > best[1] - best[0] + 1: best = (st, i - 1)
            st = None
    return lo + best[0], lo + best[1], best[1] - best[0] + 1
def clean(clip, talker=None, ws=None):   # -> (lo, hi, mouths to swap). A silent hold drops a mouth that has no clean run (original Kling mouth, no swap)
    lo, hi = RANGE.get(clip, (0, 120)); ws = list(WHO.get(clip, [])) if ws is None else ws; a, b, n = _run(clip, lo, hi, talker, ws)
    if n >= 12: return a, b, ws
    if talker is None:
        keep = [w for w in ws if _run(clip, lo, hi, None, [w])[2] >= 12]; print('residual: hold on', clip, 'no swap for', [w for w in ws if w not in keep])
        if keep != ws: return clean(clip, None, keep)
    print('residual WARN', clip, talker, 'clean run only', n, 'frames'); return lo, hi, ws
def take(clip, n, talker=None, reset=False):
    lo, hi, ws = clean(clip, talker); p, d = CUR.get(clip, (lo, 1))
    if reset or not lo <= p <= hi: p, d = lo, 1
    out = []
    for _ in range(n):
        out.append(p)
        if not lo <= p + d <= hi: d = -d
        p += d
    CUR[clip] = (p, d); return out, ws
def _f(d): return round(d * FPS) / FPS
def talk(id, clip, who, k, at=0.07, tempo=None, ov=(), foley=(), opt=False, pad=False):
    l = line(k, at, tempo); nx = [x for x in l['cues'] if x['value'] != 'X']
    PEND.append(dict(kind='talk', id=id, clip=clip, who=who, l=l, d=_f(at + nx[-1]['end'] / l['tempo'] + BREATH), ov=ov, foley=foley, opt=opt, pad=pad, on=not pad))
def hold(id, clip, dur, ov=(), foley=(), reset=False, opt=False, pad=False):
    PEND.append(dict(kind='hold', id=id, clip=clip, d=_f(dur), ov=ov, foley=foley, reset=reset, opt=opt, pad=pad, on=not pad))
def vhook(txt):
    nw = len(txt.split('|')[0].split()); dur = min(2.0, max(1.6, 0.4 + 0.28 * nw) + 0.05); BEATS['hook'] = dur
    hold('hook', MASTER, dur, ov=[('VHook', 0.0, None, txt)], foley=[(FD + 'tone0.wav', 0.0), (FD + 'whoosh.wav', 0.0)], reset=True)   # whoosh: first sound < 0.3 s
def prop(pad=False): PEND.append(dict(kind='prop', id='prop', d=_f(PROP[2]), opt=False, pad=pad, on=not pad))
def _tot(): return sum(b['d'] for b in PEND if b['on'])
def _ratio():   # mistake: reveal start / content (recap + loop excluded), as qa5 measures it
    t = 0; rv = None
    for b in PEND:
        if not b['on']: continue
        if b['id'] == 'reveal': rv = t
        t += b['d']
    return 1 if rv is None else rv / (t - sum(b['d'] for b in PEND if b['on'] and b['id'] in ('recap', 'loop')))
def fit():
    ir = next((i for i, b in enumerate(PEND) if b['id'] == 'reveal'), len(PEND)); opts = [b for b in PEND if b['opt']]; pads = [b for b in PEND if b['pad']]
    if QA.get('template') == 'mistake':
        for b in reversed(opts):
            if _ratio() < 0.62 and PEND.index(b) > ir: b['on'] = False
        for b in pads:
            if _ratio() < 0.62 and PEND.index(b) < ir: b['on'] = True
    for b in reversed(opts):
        if _tot() > 23.2 and b['on']: b['on'] = False
    for b in pads:
        if _tot() < 18.8 and not b['on']: b['on'] = True
    print('fit: total %.2f s, reveal ratio %.2f, beats %s' % (_tot(), _ratio(), ' '.join(b['id'] + ('' if b['on'] else '(off)') for b in PEND)))
def emit():
    h0, hws = 0, WHO[MASTER]
    for b in PEND:
        if not b['on']: continue
        n = int(round(b['d'] * FPS)); c = b.get('clip')
        if b['kind'] == 'talk':
            fr, ws = take(c, n, b['who']); shot(b['id'], c, n / FPS, (lambda fr: lambda m: fr[:m])(fr), [(c, w, [b['l']] if w == b['who'] else []) for w in ws], [(b['who'], b['l'])], ov=b['ov'], foley=b['foley'])
        elif b['kind'] == 'hold':
            fr, ws = take(c, n, None, b['reset'])
            if b['id'] == 'hook': h0, hws = fr[0], ws
            shot(b['id'], c, n / FPS, (lambda fr: lambda m: fr[:m])(fr), [(c, w, []) for w in ws], [], ov=b['ov'], foley=b['foley'])
        elif b['kind'] == 'prop':
            pc, f0, d, snd, at = PROP; shot('prop', pc, n / FPS, lambda m: list(range(f0, f0 + m)), [], [], foley=[(FD + snd, at / FPS)] if snd else [])
        else: shot('loop', MASTER, n / FPS, lambda m: list(range(h0 + m - 1, h0 - 1, -1)), [(MASTER, w, []) for w in hws], [], ov=[('Follow', 0.0, None, 'Follow for daily English|lexkite.com')])
def vend(recap, clip=None):
    hold('recap', clip or BREACT, 2.8, ov=[('Recap', 0.0, 2.5, recap + '|')]); PEND.append(dict(kind='loop', id='loop', d=1.0, opt=False, pad=False, on=True)); fit(); emit()
