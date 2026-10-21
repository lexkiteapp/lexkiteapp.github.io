# news_tpl.py - generic news-anchor lesson, exec'd inside news.py with SPEC (NEWS_DIR/lessons/<id>.json written by gen_news.py).
# Ama = STANDING clips ga2_* (README-standing.md; ga2_react = non-speaking only). Shape (owner 21/10): two-shot hook (Ama, <= 5 words, 1.6-2.0 s) -> 4-6 alternating singles (Ama left / Carlos right, size alternates per host,
# J-cut audio lead 0.15 s) each carrying ONE card state (label / x / v) -> two-shot recap (Save card 2.5 s) -> CTA single + comment ring ->
# 1.0 s loop back to the hook frame. All text comes from the curated banks in gen_news.py; timings from the real wavs.
META = dict(id=SPEC['id'], out=f"cine-{SPEC['id'].replace('_', '-')}-en.mp4", cefr=SPEC['cefr'], goal_en=SPEC['point'], area=SPEC['area'])
QA = dict(template='news'); AMB = f'{TL}/amb_studio.wav'; AMB_DB = -40; BG = SPEC['bg']
NW = lambda x_: len(re.findall(r"[A-Za-z0-9']+", x_)); need = lambda x_: max(1.2, 0.4 + 0.28 * NW(x_))
def at_for(line, lo, hi, br):   # lead-in so the shot lasts lo..hi s
    s0, s1 = speech(line); return max(0.07, lo - br - s1)
hk = SPEC['hook']; hs0, hs1 = speech(hk['line'])   # hook: speech starts by ~0.2 s (first sound < 0.3 s), shot 1.66-2.0 s
a_ = max(0.0, min(0.2 - hs0, 1.66 - 0.42 - hs1)); ht = line_tempo(hk['line'])
if a_ + hs1 / ht + 0.36 > 1.98: ht = min(1.15, round(hs1 / (1.98 - 0.36 - a_) + 0.005, 3))   # long hook line: tighten (<= 1.15x) instead of overrunning 2.0 s
h_br = min(0.6, max(0.36, 1.66 - a_ - hs1 / ht))
h = shot('hook', 'ga2_talk_smile', 'ama', 'two', BG, line=hk['line'], at=a_, breath=h_br, frames=list(range(24, 24 + 60)), other='gc', tempo=ht)
assert 1.6 <= h['dur'] <= 2.0 + 1 / FPS, ('hook length', h['dur'])
if a_ + hs0 > 0.22: SFX.append(('whoosh.wav', 0.0))   # very short hook line: broadcast whoosh on frame 0 (no dead air)
START['ga2_talk_smile'] = 24 + h['n']
im, box, fs = hook_card(hk['card'], ''); ov('VHook', hk['card'] + '|', 0, h['dur'], box, 'hook', fs=fs, img=im)
CL = {'ama': ['ga2_talk', 'ga2_explain', 'ga2_talk_smile'], 'carlos': ['gc_talk', 'gc_explain', 'gc_talk_smile']}; use = {'ama': 0, 'carlos': 0}
LISTEN = {'ama': 'ga2_listen', 'carlos': 'gc_listen'}; OTHER = {'ama': 'carlos', 'carlos': 'ama'}; BEATS = SPEC['beats']; nb = len(BEATS)
# length from the real wavs (TTS first): short lessons get listener reaction cutaways (single of the other host, the card stays up) -> >= 21 s, never padded silence
rc_line = SPEC['recap']['line']; RC_D = max(2.95, talk_dur(rc_line, 0.07, 0.5))
est = h['dur'] + sum(talk_dur(b['line'], 0.07 if i == 0 else -0.15) for i, b in enumerate(BEATS)) + RC_D + talk_dur(SPEC['end_line'], 0.07) + 1.0
slots = []
for i in [nb - 1, nb // 2, 1, nb - 3, 2, 0]:
    y = OTHER[BEATS[i]['who']]; nxt = [b['who'] for b in BEATS[i + 1:i + 3]]
    if 0 <= i < nb and i not in slots and nxt != [y, y]: slots.append(i)   # never 3 singles of one host in a row
deficit = 21.4 - est; nr = min(len(slots), max(0, int(np.ceil(deficit / 2.2))))
RX = {i: min(2.2, max(1.0, deficit / nr)) for i in slots[:nr]}
print('news layout: estimate %.2f s, reaction cutaways %s' % (est, {k: round(v, 2) for k, v in RX.items()}))
prev = None
for i, b in enumerate(BEATS):
    who = b['who']; k = use[who]; use[who] += 1
    sh = shot(f'b{i + 1}', CL[who][k % 3], who, ('mcu', 'wide')[k % 2], BG, line=b['line'], at=0.07 if i == 0 or S[-1]['who'] == who else -0.15)   # no J-cut out of the speaker's own reaction shot
    c = b.get('card')
    if c:
        t0 = sh['t0'] + max(0.0, sh['lines'][0]['at'])
        if prev is not None:   # previous card keeps its reading time (it may run into this shot)
            t0 = max(t0, OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05); OV[prev]['t'][1] = round(t0, 3)
        im, box = card_one(c['kind'], c['text'], c.get('sub'), num=c.get('label'))
        ov('Card', f"|{c['kind']}:{c['text']}" + (f" {c['sub']}" if c.get('sub') else ''), t0, sh['t0'] + sh['dur'], box, sh['id'], img=im, pop=True)
        OV[-1]['_txt'] = c['text'] + ' ' + (c.get('sub') or ''); OV[-1]['_chain'] = prev is not None; prev = len(OV) - 1
    else: OV[prev]['t'][1] = round(sh['t0'] + sh['dur'], 3)
    if i == nb - 1:   # the last card must finish its reading time before the recap card
        spill = OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05 - (sh['t0'] + sh['dur'])
        if spill > 0: RX[i] = min(2.4, max(RX.get(i, 0), spill + 0.05, 1.0))
    if i in RX:
        y = OTHER[who]; nf = ('mcu', 'wide')[use[y] % 2] if i + 1 < nb and BEATS[i + 1]['who'] == y else 'mcu'
        r = shot(f'r{i + 1}', LISTEN[y], y, 'wide' if nf == 'mcu' else 'mcu', BG, dur=RX[i])
        OV[prev]['t'][1] = round(r['t0'] + r['dur'], 3)
rc = shot('recap', 'gc_talk', 'carlos', 'two', BG, line=rc_line, at=max(0.07, RC_D - 0.5 - speech(rc_line)[1] / line_tempo(rc_line)), breath=0.5, other='ga2_listen')
lv = sum(x['dur'] for x in S[:-1]) - OV[prev]['t'][0]
if lv < need(OV[prev]['_txt']): OV[prev]['t'][1] = round(OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05, 3)   # last card may overlap into the recap shot start
else: OV[prev]['t'][1] = round(rc['t0'], 3)
r0 = OV[prev]['t'][1] + 0.0
rows = SPEC['recap']['rows']; im, box = card_recap(SPEC['recap']['title'], rows)
ov('Recap', SPEC['recap']['title'] + '|' + '|'.join(rows), max(rc['t0'], r0), rc['t0'] + rc['dur'] - 0.26, box, 'recap', img=im, pop=True)
for o in OV: o.pop('_txt', None)
e = shot('end', 'ga2_talk', 'ama', 'mcu' if S[-2]['who'] != 'ama' or S[-2]['frame'] != 'mcu' else 'wide', BG, line=SPEC['end_line'])
lp = shot('loop', 'ga2_talk_smile', 'ama', 'two', BG, dur=1.0, frames=list(range(0, 24)), other='gc')
_, rbox = ring_card('Comment below', 0); ov('Ring', 'Comment below', e['t0'] + 0.1, lp['t0'], rbox, 'end', part=0, img=lambda t, a=e['t0'] + 0.1, b=lp['t0']: ring_card('Comment below', min(1, (t - a) / (b - a)))[0], pop=True)
im, box, _ = hook_card(hk['card'], ''); ov('Follow', 'Follow for more', lp['t0'], lp['t0'] + lp['dur'], box, 'loop', img=im)
T_ = sum(x['dur'] for x in S); SER_T, SER_S = SPEC['series']; _, sbox = series_bar(SER_T, SER_S)   # names must not collide with news.py globals (top, sub ...)
ov('Series', f'{SER_T}|{SER_S}', h['dur'], T_ - 1.0, sbox, 'b1', img=lambda t, a=h['dur'], tp=SER_T, sb=SER_S: series_bar(tp, sb, prog=1 - (1 - min(1, (t - a) / 0.35)) ** 3)[0])
SFX.append(('slide.wav', h['dur']))
P = sorted(t for f, t in SFX if f == 'pop.wav'); keep = []
for t in P:
    if not keep or t - keep[-1] >= 2.0: keep.append(t)
SFX[:] = [(f, t) for f, t in SFX if f != 'pop.wav' or t in keep]
