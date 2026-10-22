# news_tpl.py - generic news-anchor lesson, exec'd inside news.py with SPEC (NEWS_DIR/lessons/<id>.json written by gen_news.py).
# Ama = STANDING clips ga2_* (README-standing.md; ga2_react = non-speaking only). Shape (owner 21/10): two-shot hook (Ama, <= 5 words, 1.6-2.0 s) -> 4-6 alternating singles (Ama left / Carlos right, size alternates per host,
# J-cut audio lead 0.15 s) each carrying ONE card state (label / x / v) -> two-shot recap (Save card 2.5 s) -> CTA single + comment ring ->
# 1.0 s loop back to the hook frame. All text comes from the curated banks in gen_news.py; timings from the real wavs.
META = dict(bg=SPEC['bg'], series=SPEC['series'], hook_text=SPEC['hook']['card'], id=SPEC['id'], out=f"cine-{SPEC['id'].replace('_', '-')}-en.mp4", cefr=SPEC['cefr'], goal_en=SPEC['point'], area=SPEC['area'])
# owner 22/10 §15 edit style: shot-grammar pattern (>= 12), <= 3 camera moves, transition, text layout (6) x series palette (8), opener host, pacing
PATTERNS = [(['mcu', 'wide'], ['mcu', 'wide']), (['wide', 'mcu'], ['mcu', 'wide']), (['mcu', 'mws'], ['wide', 'mcu']), (['mws', 'mcu'], ['mcu', 'mws']),
            (['mcu', 'wide', 'mws'], ['wide', 'mcu']), (['wide', 'mws', 'mcu'], ['mcu', 'wide', 'mws']), (['mws', 'wide'], ['wide', 'mws']), (['mcu', 'mws', 'wide'], ['mws', 'mcu']),
            (['wide', 'mcu', 'mws'], ['mws', 'wide', 'mcu']), (['mws', 'mcu', 'wide'], ['wide', 'mcu', 'mws']), (['mcu', 'wide'], ['mws', 'wide']), (['wide', 'mws'], ['mcu', 'mws'])]
PALS = [((229, 80, 47), (15, 61, 62)), ((240, 140, 40), (15, 61, 62)), ((214, 48, 49), (34, 36, 44)), ((40, 160, 90), (15, 61, 62)),
        ((155, 89, 182), (34, 36, 44)), ((229, 80, 47), (23, 89, 90)), ((200, 120, 20), (34, 36, 44)), ((0, 150, 136), (34, 36, 44))]
SKINS = [((255, 255, 255), (34, 36, 44), (34, 36, 44)), ((255, 247, 236), (34, 36, 44), (34, 36, 44)), ((28, 32, 40), (245, 245, 245), (245, 245, 245))]
PACES = {'calm': (0.38, -0.12), 'brisk': (0.36, -0.18), 'snappy': (0.35, -0.22)}
_h = int(SPEC['id'][-6:], 16)
STYLE = dict(dict(pattern=_h % 12, moves=[['push', 'slide', 'handheld'], ['pull', 'tilt', 'rack'], ['push', 'handheld'], ['slide', 'push', 'rack'], ['tilt', 'pull'], ['push', 'rack', 'slide']][_h % 6],
                  transition=['cut', 'whip', 'dissolve', 'zoom'][_h % 4], layout=_h % 6, palette=_h % 8, opener='ama', pacing=['calm', 'brisk', 'snappy'][_h % 3]), **(SPEC.get('style') or {}))
assert len(STYLE['moves']) <= 3, 'at most 3 camera moves per clip'
ORANGE, TEAL = PALS[STYLE['palette']]; CARD_BG, CARD_LINE, CARD_INK = SKINS[STYLE['layout'] % 3]; CAP_BOX = STYLE['layout'] >= 3
if STYLE['layout'] % 3 == 2: TEAL2 = (120, 200, 190)   # dark skin: lighter formula colour
BREATH, JCUT = PACES[STYLE['pacing']]
SIG = f"p{STYLE['pattern']}|{'+'.join(STYLE['moves'])}|{STYLE['transition']}|L{STYLE['layout']}|C{STYLE['palette']}|{STYLE['opener']}|{STYLE['pacing']}"
QA = dict(template='news', signature=SIG, style=STYLE); AMB = f'{TL}/amb_studio.wav'; AMB_DB = -40; BG = os.environ.get('NEWS_BG') or SPEC['bg']; META['bg'] = BG   # NEWS_BG: placement / vision retry picked another background
NW = lambda x_: len(re.findall(r"[A-Za-z0-9']+", x_)); need = lambda x_: max(1.2, 0.4 + 0.28 * NW(x_))
def at_for(line, lo, hi, br):   # lead-in so the shot lasts lo..hi s
    s0, s1 = speech(line); return max(0.07, lo - br - s1)
# owner 22/10 v6: cinematic coverage - punch-in single hook, singles on the thirds (Carlos alternates front / 3/4), reaction lines instead of
# silent holds (no dead air > 0.4 s), shots 1.5-3.5 s, J-cuts, no two-shot; teacher persona (names, Teacher's tip, Repeat after me).
def tshot(id_, clip, who, frame, line, at):   # talk shot >= 1.5 s: very short lines are spoken a little slower (>= 0.86x), breath 0.36 (no dead air > 0.4 s)
    t_ = line_tempo(line); s1 = speech(line)[1]
    if at + s1 / t_ + BREATH < 1.5: t_ = min(t_, max(0.86, round(s1 / (1.5 - at - BREATH) - 0.005, 3)))
    return shot(id_, clip, who, frame, BG, line=line, at=at, breath=BREATH, tempo=t_)
hk = SPEC['hook']; hs0, hs1 = speech(hk['line'])   # hook: speech starts by ~0.2 s, shot 1.66-2.0 s
a_ = max(0.0, min(0.2 - hs0, 1.66 - 0.42 - hs1)); ht = line_tempo(hk['line'])
if a_ + hs1 / ht + 0.36 > 1.98: ht = min(1.15, round(hs1 / (1.98 - 0.36 - a_) + 0.005, 3))
if a_ + hs1 / ht + 0.6 < 1.66: ht = min(ht, max(0.86, round(hs1 / (1.66 - 0.6 - a_) - 0.005, 3)))
h_br = min(0.4, max(0.36, 1.66 - a_ - hs1 / ht)); a_ = max(a_, 1.66 - h_br - hs1 / ht)   # breath <= 0.4 (no dead air); a short hook starts later, the frame-0 whoosh fills it
h = shot('hook', 'ga4_talk_natural', 'ama', 'wide', BG, line=hk['line'], at=a_, breath=h_br, frames=list(range(24, 24 + 60)), tempo=ht)
assert 1.6 <= h['dur'] <= 2.0 + 1 / FPS, ('hook length', h['dur'])
SFX.append(('whoosh.wav', 0.0)); START['ga4_talk_natural'] = 24 + h['n']
im, box, fs = hook_card(hk['card'], ''); ov('VHook', hk['card'] + '|', 0, h['dur'], box, 'hook', fs=fs, img=im)
if SPEC.get('difficulty'): im, box = badge(SPEC['difficulty']); ov('Badge', SPEC['difficulty'].upper(), 0, h['dur'], box, 'hook', img=im)   # §13 difficulty badge
CL = {'ama': ['ga4_talk_natural'], 'carlos': ['gc4_talk_natural']}; use = {'ama': 0, 'carlos': 0}   # standing, cls=neutral only; gc4_q34_talk dropped (its ~2x scale-up read soft)
LISTEN = {'ama': 'ga4_talk_natural', 'carlos': 'gc4_listen'}; OTHER = {'ama': 'carlos', 'carlos': 'ama'}; BEATS = SPEC['beats']; nb = len(BEATS)
RXL = json.load(open(f'{N}/ci/lines.json')).get('reactions', {}); rxi = {'ama': int(SPEC['id'][-6:], 16) % 3, 'carlos': int(SPEC['id'][-6:], 16) % 3}
def next_rx(y):
    rxi[y] += 1; return RXL[y][rxi[y] % len(RXL[y])]
rc_line = SPEC['recap']['line']; RC_D = talk_dur(rc_line, -0.15, 0.6)
est = h['dur'] + sum(talk_dur(b['line'], 0.07 if i == 0 else -0.15) for i, b in enumerate(BEATS)) + 1.6 * sum(1 for b in BEATS if b.get('repeat')) + RC_D + talk_dur(SPEC['end_line'], -0.15) + 1.0
if est > 26.5 and any(b.get('repeat') for b in BEATS):   # long lesson: drop the repeat-after-me beat (line + pause ~3.8 s) to stay <= 28 s
    est -= sum(talk_dur(b['line'], -0.15) + 1.6 for b in BEATS if b.get('repeat')); BEATS = [b for b in BEATS if not b.get('repeat')]; nb = len(BEATS)
slots = []
for i in [nb - 1, nb // 2, 1, nb - 3, 2, 0]:
    if not 0 <= i < nb: continue
    y = OTHER[BEATS[i]['who']]; nxt = [w for b in BEATS[i + 1:i + 3] for w in [b['who']] * (2 if b.get('repeat') else 1)][:2]
    if i not in slots and nxt != [y, y] and not (BEATS[i].get('repeat') or BEATS[i].get('intro') or BEATS[i].get('intro2')): slots.append(i)
deficit = 21.4 - est; nr = min(len(slots), max(0, int(np.ceil(deficit / 1.9)))); RX = set(slots[:nr])
print('news layout: estimate %.2f s, reaction lines after beats %s' % (est, sorted(RX)))
def fr_for(who, k=None):   # size for the next single of `who` from the shot-grammar pattern; never the same angle + size back to back
    cyc = PATTERNS[STYLE['pattern']][0 if who == 'ama' else 1]; f_ = cyc[(use[who] if k is None else k) % len(cyc)]
    if S and S[-1]['who'] == who and not S[-1]['other'] and S[-1]['frame'] == f_: f_ = next(x for x in ('mcu', 'wide', 'mws') if x != f_)
    return f_
prev = None
for i, b in enumerate(BEATS):
    who = b['who']; k = use[who]; use[who] += 1; same = S[-1]['who'] == who
    sh = tshot(f'b{i + 1}', CL[who][k % len(CL[who])], who, fr_for(who, k), b['line'], -0.12 if same else JCUT)
    c = b.get('card')
    if c:
        t0 = sh['t0'] + max(0.0, sh['lines'][0]['at'])
        if prev is not None: t0 = max(t0, OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05); OV[prev]['t'][1] = round(t0, 3)
        im, box = card_one(c['kind'], c['text'], c.get('sub'), num=c.get('label'), ic=c.get('icon'), formula=c.get('formula'))
        ov('Card', f"|{c['kind']}:{c['text']}" + (f" {c.get('formula') or c['sub']}" if (c.get('formula') or c.get('sub')) else ''), t0, sh['t0'] + sh['dur'], box, sh['id'], img=im, pop=True)
        OV[-1]['_txt'] = c['text'] + ' ' + (c.get('formula') or c.get('sub') or ''); OV[-1]['_chain'] = prev is not None; prev = len(OV) - 1
    elif prev is not None: OV[prev]['t'][1] = round(sh['t0'] + sh['dur'], 3)
    if b.get('repeat') or b.get('guess'):   # 'Pause and guess' / 'Repeat after me' -> the teacher waits >= 1.6 s (viewer repeats; the only allowed silence), phrase card stays up
        sp_ = OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05 - (sh['t0'] + sh['dur'])
        pz = shot(f'p{i + 1}', LISTEN[who], who, 'wide' if sh['frame'] == 'mcu' else 'mcu', BG, dur=min(2.5, max(1.6, sp_ + 0.05)))
        OV[prev]['t'][1] = round(pz['t0'] + pz['dur'], 3); QA.setdefault('repeat', []).append([pz['id'], round(pz['dur'], 3)]); continue
    if i == nb - 1 and prev is not None and OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05 > sh['t0'] + sh['dur']: RX.add(i)   # last card still being read
    if i in RX and prev is not None:   # listener reaction LINE (J-cut), card stays up
        y = OTHER[who]; r = tshot(f'r{i + 1}', CL[y][0], y, fr_for(y), next_rx(y), -0.15); OV[prev]['t'][1] = round(r['t0'] + r['dur'], 3)
# recap + end speakers keep <= 2 singles of one host in a row (both voices exist: line / line_alt)
run_who = S[-1]['who']; run_n = 2 if len(S) > 1 and S[-2]['who'] == run_who else 1
rw = 'ama' if run_who == 'carlos' and run_n == 2 else 'carlos' if run_who == 'ama' and run_n == 2 else 'carlos'
rl = rc_line if rw == 'carlos' else SPEC['recap']['line_alt']
rc = tshot('recap', CL[rw][0], rw, fr_for(rw), rl, -0.12 if S[-1]['who'] == rw else JCUT)
if prev is not None:
    lv = rc['t0'] - OV[prev]['t'][0]
    OV[prev]['t'][1] = round(OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05, 3) if lv < need(OV[prev]['_txt']) else round(rc['t0'], 3)
    r0 = OV[prev]['t'][1]
else: r0 = rc['t0']
rows = SPEC['recap']['rows']; im, box = card_recap(SPEC['recap']['title'], rows)
ov('Recap', SPEC['recap']['title'] + '|' + '|'.join(rows), max(rc['t0'], r0), rc['t0'] + rc['dur'] - 0.26, box, 'recap', img=im, pop=True); RCO = OV[-1]   # may run into the end shot (reading time 2.5 s)
for o in OV: o.pop('_txt', None)
ew = 'carlos' if rw == 'ama' else 'ama'; el = SPEC['end_line'] if ew == 'ama' else SPEC['end_alt']
e = tshot('end', CL[ew][0], ew, 'mcu' if not (S[-1]['who'] == ew and S[-1]['frame'] == 'mcu') else 'wide', el, -0.15)
lp = shot('loop', 'ga4_talk_natural', 'ama', 'wide', BG, dur=1.0, frames=list(range(0, 24)))
RCO['t'][1] = round(min(lp['t0'] - 1.3, max(RCO['t'][1], RCO['t'][0] + 2.55)), 3)   # Save-this chip gets >= 0.8 s before the loop
RG0 = max(e['t0'] + 0.1, RCO['t'][1] + 0.05); RGT = 'Comment your answer' if SPEC.get('v') == 7 else 'Save this'; _, rbox = ring_card(RGT, 0); ov('Ring', RGT, RG0, lp['t0'], rbox, 'end', part=0, img=lambda t, a=RG0, b=lp['t0']: ring_card(RGT, min(1, (t - a) / (b - a)))[0], pop=True)
if SPEC.get('share'): im, box = share_chip(SPEC['share']); ov('Share', 'Send this to a friend|' + SPEC['share'], e['t0'], lp['t0'], box, 'end', img=im)   # §13 share trigger
im, box, _ = hook_card('Free practice: Lexkite' if SPEC.get('v') == 7 else hk['card'], ''); ov('Follow', 'Free practice: Lexkite' if SPEC.get('v') == 7 else 'Follow for more', lp['t0'], lp['t0'] + lp['dur'], box, 'loop', img=im)
T_ = sum(x['dur'] for x in S); SER_T, SER_S = SPEC['series']; SER_T = f"{SER_T} · PART {SPEC['part']}" if SPEC.get('part') else SER_T; _, sbox = series_bar(SER_T, SER_S)
SER_END = e['t0'] if SPEC.get('share') else T_ - 1.0
ov('Series', f'{SER_T}|{SER_S}', h['dur'], SER_END, sbox, 'b1', img=lambda t, a=h['dur'], tp=SER_T, sb=SER_S: series_bar(tp, sb, prog=1 - (1 - min(1, (t - a) / 0.35)) ** 3)[0])   # payoff promise by 2 s
SFX.append(('slide.wav', h['dur']))
# owner 22/10: no name lower-thirds (clutter, covers the body) - the teacher persona lives in tone, Teacher's tip, Repeat after me, the spoken intro
P = sorted(t for f, t in SFX if f == 'pop.wav'); keep = []
for t in P:
    if not keep or t - keep[-1] >= 2.0: keep.append(t)
SFX[:] = [(f, t) for f, t in SFX if f != 'pop.wav' or t in keep]
