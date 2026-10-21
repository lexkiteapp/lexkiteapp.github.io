# Pilot v3 "Hotel check-in: 3 phrases you need" (US English, A2). exec'd inside news.py.
# Per phrase: Ama says the natural example (card: exact pattern) -> Carlos: "Not X. Say, Y." (card x X, then card v Y + short reason/usage note).
# One idea per card, 52 px; cards hand over on word timings (whisper words of the same wav); a v card may run 0.6 s into the next shot.
META = dict(id='news-hotel', out='cine-news-hotel-en.mp4', cefr='A2', goal_en='Hotel check-in phrases', area='speaking')
QA = dict(template='news'); AMB = f'{TL}/amb_studio.wav'; AMB_DB = -26
WT = lambda k, i: json.load(open(f'{N}/vis3/{k}.words.json'))['words'][i]['s']
h = shot('hook', 'ga_talk_smile', 'ama', 'two', 'bg_lobby', line='n_h_hook', frames=list(range(24, 24 + 60)), other='gc')
START['ga_talk_smile'] = 24 + h['n']
im, box, fs = hook_card('CHECKING IN?', '3 phrases you need'); ov('VHook', 'CHECKING IN?|3 phrases you need', 0, h['dur'], box, 'hook', fs=fs, img=im)
PH = [('p1', 'ga_talk', 'wide', 'bg_lobby', 'n_h_a_p1', 'I have a reservation under + [name].', 'm1', 'gc_explain', 'n_h_c_m1', 1, 5, 'on my name', 'under my name', 'your name'),
      ('p2', 'ga_explain', 'mcu', 'bg_lobby', 'n_h_a_p2', 'Could I + [verb] ...?', 'm2', 'gc_talk', 'n_h_c_m2', 1, 7, 'Can I to check in?', 'Could I check in?', "no 'to'"),
      ('p3', 'ga_talk_smile', 'mcu', 'bg_lobby', 'n_h_a_p3', 'Is [thing] included?', 'm3', 'gc_talk_smile', 'n_h_c_m3', 1, 3, 'Is breakfast include?', 'Is breakfast included?', 'in the price')]
prev_v = None; NW = lambda x_: len(re.findall(r"[A-Za-z0-9']+", x_))
for n, (pid, pclip, pfr, bg, pline, pat, mid, mclip, mline, ix, iv, bad, good, why) in enumerate(PH, 1):
    a = shot(pid, pclip, 'ama', pfr, bg, line=pline)
    m = shot(mid, mclip, 'carlos', 'mcu' if n != 2 else 'wide', bg, line=mline, at=-0.2)   # J-cut: Carlos's audio leads the picture by ~5 frames
    T_ = m['lines'][0]['tempo']; tx = m['t0'] + m['lines'][0]['at'] + WT(mline, ix) / T_; NW = lambda x_: len(re.findall(r"[A-Za-z0-9']+", x_)); tv = max(m['t0'] + m['lines'][0]['at'] + WT(mline, iv) / T_, tx + max(1.2, 0.4 + 0.28 * NW(bad)) + 0.05)
    p0 = max(a['t0'] + 0.3, OV[prev_v]['t'][0] + max(1.2, 0.4 + 0.28 * NW(OV[prev_v]['text'].split(':', 1)[1])) + 0.05) if prev_v else a['t0']
    if prev_v: OV[prev_v]['t'][1] = round(p0, 3)
    im, box = card_one('p', pat, num=n); ov('Card', f'|p:{pat}', p0, tx, box, pid, img=im, pop=True)
    im, box = card_one('x', bad); ov('Card', f'|x:{bad}', tx, tv, box, mid, img=im); OV[-1]['_chain'] = True
    im, box = card_one('v', good, why); ov('Card', f'|v:{good} {why}', tv, m['t0'] + m['dur'], box, mid, img=im); OV[-1]['_chain'] = True; prev_v = len(OV) - 1
need_v = max(1.2, 0.4 + 0.28 * NW(PH[-1][12] + ' ' + PH[-1][13])); vis_ = sum(x['dur'] for x in S) - OV[prev_v]['t'][0]
hh = shot('h3', 'ga_listen', 'ama', 'mcu', 'bg_lobby', dur=max(0.7, need_v - vis_ + 0.06)); OV[prev_v]['t'][1] = round(hh['t0'] + hh['dur'], 3)   # listener reaction cutaway
rc = shot('recap', 'gc_talk', 'carlos', 'two', 'bg_lobby', line='n_h_c_recap', at=1.2, breath=0.6, other='ga_listen')   # re-establishing two-shot
im, box = card_recap('SAVE THESE 3', ['I have a reservation under + [name].', 'Could I + [verb] ...?', 'Is [thing] included?'])
ov('Recap', 'SAVE THESE 3|I have a reservation under + [name].|Could I + [verb] ...?|Is [thing] included?', rc['t0'], rc['t0'] + rc['dur'] - 0.26, box, 'recap', img=im, pop=True)
e = shot('end', 'ga_talk', 'ama', 'mcu', 'bg_lobby', line='n_h_a_end')
lp = shot('loop', 'ga_talk_smile', 'ama', 'two', 'bg_lobby', dur=1.0, frames=list(range(0, 24)), other='gc')
_, rbox = ring_card('Comment below', 0); ov('Ring', 'Comment below', e['t0'] + 0.1, lp['t0'], rbox, 'end', part=0, img=lambda t, a=e['t0'] + 0.1, b=lp['t0']: ring_card('Comment below', min(1, (t - a) / (b - a)))[0], pop=True)
im, box, _ = hook_card('CHECKING IN?', 'Follow for more'); ov('Follow', 'Follow for more', lp['t0'], lp['t0'] + lp['dur'], box, 'loop', img=im)
T_ = sum(x['dur'] for x in S); _, sbox = series_bar('HOTEL ENGLISH', 'Check-in phrases')
ov('Series', 'HOTEL ENGLISH|Check-in phrases', h['dur'], T_ - 1.0, sbox, 'p1', img=lambda t, a=h['dur']: series_bar('HOTEL ENGLISH', 'Check-in phrases', prog=1 - (1 - min(1, (t - a) / 0.35)) ** 3)[0])
SFX.append(('slide.wav', h['dur']))
P = sorted(t for f, t in SFX if f == 'pop.wav'); keep = []
for t in P:
    if not keep or t - keep[-1] >= 2.0: keep.append(t)
SFX[:] = [(f, t) for f, t in SFX if f != 'pop.wav' or t in keep]
