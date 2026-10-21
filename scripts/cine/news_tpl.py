# news_tpl.py - generic news-anchor lesson, exec'd inside news.py with SPEC (NEWS_DIR/lessons/<id>.json written by gen_news.py).
# Shape (owner 21/10): two-shot hook (Ama, <= 5 words, 1.6-2.0 s) -> 4-6 alternating singles (Ama left / Carlos right, size alternates per host,
# J-cut audio lead 0.15 s) each carrying ONE card state (label / x / v) -> two-shot recap (Save card 2.5 s) -> CTA single + comment ring ->
# 1.0 s loop back to the hook frame. All text comes from the curated banks in gen_news.py; timings from the real wavs.
META = dict(id=SPEC['id'], out=f"cine-{SPEC['id'].replace('_', '-')}-en.mp4", cefr=SPEC['cefr'], goal_en=SPEC['point'], area=SPEC['area'])
QA = dict(template='news'); AMB = f'{TL}/amb_studio.wav'; AMB_DB = -26; BG = SPEC['bg']
NW = lambda x_: len(re.findall(r"[A-Za-z0-9']+", x_)); need = lambda x_: max(1.2, 0.4 + 0.28 * NW(x_))
def at_for(line, lo, hi, br):   # lead-in so the shot lasts lo..hi s
    s0, s1 = speech(line); return max(0.07, lo - br - s1)
hk = SPEC['hook']; a_ = at_for(hk['line'], 1.66, 2.0, 0.42)
h = shot('hook', 'ga_talk_smile', 'ama', 'two', BG, line=hk['line'], at=a_, breath=0.42, frames=list(range(24, 24 + 60)), other='gc')
assert 1.6 <= h['dur'] <= 2.0 + 1 / FPS, ('hook length', h['dur'])
START['ga_talk_smile'] = 24 + h['n']
im, box, fs = hook_card(hk['card'], ''); ov('VHook', hk['card'] + '|', 0, h['dur'], box, 'hook', fs=fs, img=im)
CL = {'ama': ['ga_talk', 'ga_explain', 'ga_talk_smile'], 'carlos': ['gc_talk', 'gc_explain', 'gc_talk_smile']}; use = {'ama': 0, 'carlos': 0}
prev = None; prev_who = None
for i, b in enumerate(SPEC['beats']):
    who = b['who']; k = use[who]; use[who] += 1
    sh = shot(f'b{i + 1}', CL[who][k % 3], who, ('mcu', 'wide')[k % 2], BG, line=b['line'], at=0.07 if i == 0 else -0.15)
    c = b.get('card')
    if c:
        t0 = sh['t0'] + max(0.0, sh['lines'][0]['at'])
        if prev is not None:   # previous card keeps its reading time (it may run into this shot)
            t0 = max(t0, OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05); OV[prev]['t'][1] = round(t0, 3)
        im, box = card_one(c['kind'], c['text'], c.get('sub'), num=c.get('label'))
        ov('Card', f"|{c['kind']}:{c['text']}" + (f" {c['sub']}" if c.get('sub') else ''), t0, sh['t0'] + sh['dur'], box, sh['id'], img=im, pop=True)
        OV[-1]['_txt'] = c['text'] + ' ' + (c.get('sub') or ''); OV[-1]['_chain'] = prev is not None; prev = len(OV) - 1
    else: OV[prev]['t'][1] = round(sh['t0'] + sh['dur'], 3)
rc_line = SPEC['recap']['line']; _, s1 = speech(rc_line)
rc = shot('recap', 'gc_talk', 'carlos', 'two', BG, line=rc_line, at=max(0.07, 2.86 - 0.5 - s1), breath=0.5, other='ga_listen')
lv = sum(x['dur'] for x in S[:-1]) - OV[prev]['t'][0]
if lv < need(OV[prev]['_txt']): OV[prev]['t'][1] = round(OV[prev]['t'][0] + need(OV[prev]['_txt']) + 0.05, 3)   # last card may overlap into the recap shot start
else: OV[prev]['t'][1] = round(rc['t0'], 3)
r0 = OV[prev]['t'][1] + 0.0
rows = SPEC['recap']['rows']; im, box = card_recap(SPEC['recap']['title'], rows)
ov('Recap', SPEC['recap']['title'] + '|' + '|'.join(rows), max(rc['t0'], r0), rc['t0'] + rc['dur'] - 0.26, box, 'recap', img=im, pop=True)
for o in OV: o.pop('_txt', None)
e = shot('end', 'ga_talk', 'ama', 'mcu' if S[-2]['who'] != 'ama' or S[-2]['frame'] != 'mcu' else 'wide', BG, line=SPEC['end_line'])
lp = shot('loop', 'ga_talk_smile', 'ama', 'two', BG, dur=1.0, frames=list(range(0, 24)), other='gc')
_, rbox = ring_card('Comment below', 0); ov('Ring', 'Comment below', e['t0'] + 0.1, lp['t0'], rbox, 'end', part=0, img=lambda t, a=e['t0'] + 0.1, b=lp['t0']: ring_card('Comment below', min(1, (t - a) / (b - a)))[0], pop=True)
im, box, _ = hook_card(hk['card'], ''); ov('Follow', 'Follow for more', lp['t0'], lp['t0'] + lp['dur'], box, 'loop', img=im)
T_ = sum(x['dur'] for x in S); top, sub = SPEC['series']; _, sbox = series_bar(top, sub)
ov('Series', f'{top}|{sub}', h['dur'], T_ - 1.0, sbox, 'b1', img=lambda t, a=h['dur']: series_bar(top, sub, prog=1 - (1 - min(1, (t - a) / 0.35)) ** 3)[0])
SFX.append(('slide.wav', h['dur']))
P = sorted(t for f, t in SFX if f == 'pop.wav'); keep = []
for t in P:
    if not keep or t - keep[-1] >= 2.0: keep.append(t)
SFX[:] = [(f, t) for f, t in SFX if f != 'pop.wav' or t in keep]
