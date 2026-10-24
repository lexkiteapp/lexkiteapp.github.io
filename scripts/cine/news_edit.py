# scripts/cine/news_edit.py - EDIT STYLE layer (owner 24/10: "transitions still amateur" although QC = 100). exec'd inside news.py when
# NEWS_EDIT=A|B|C (NEWS_EXCERPT=1: hook -> first reveal only, for pilots). Editing grammar (docs/VIDEO.md "Edit craft"):
#   cuts sit on the speech boundary; a host switch is a J-cut (incoming voice leads the picture by 4-8 frames); a host who is still visible
#   never gets a J-lead (no lips-off voice); no cut inside a sentence; emphasis = punch-in/out INSIDE the shot (1.0 <-> 1.12, eased 6-10 frames)
#   on the taught key word instead of a cut; constant camera drift 0.5-1 %/s; host switch = hard cut or a 6-8 frame whip-pan (directional
#   motion blur), never the 0.7 s pan; section change = one branded graphic wipe (8-10 frames); two-shot master for intro / pause / recap,
#   singles for teaching lines; kinetic type (eased entrances / exits, card reveal on the spoken key word, no pop-ins);
#   sound: soft whoosh on whips / wipes, subtle tick on card reveals, bed (-40 dB) ducked under the voice.
# Styles: A = Ama only + punch-ins + kinetic type (one continuous take after the hook); B = two-shot master + singles + whip-pans;
#         C = B + graphic wipes at section changes + stronger motion. Every decision is logged in timeline qa.edit for qa_edit.py.
ES = {'A': dict(two=False, solo='ama', whip=0, wipe=False, drift=0.006, pn=8, lead=5, whipD=0),
      'B': dict(two=True, solo=None, whip=7, wipe=False, drift=0.006, pn=8, lead=5, whipD=900),
      'C': dict(two=True, solo=None, whip=6, wipe=True, drift=0.010, pn=6, lead=5, whipD=1040)}[EDIT]
PUNCH = 1.12; WIPE_N = 9; EXCERPT = bool(os.environ.get('NEWS_EXCERPT'))
_ezc = lambda u: (lambda v: 4 * v ** 3 if v < 0.5 else 1 - (-2 * v + 2) ** 3 / 2)(min(1.0, max(0.0, u)))   # ease in-out cubic
_nrmw = lambda w_: re.sub(r"[^a-z0-9']", '', w_.lower().replace('’', "'"))
if ES['solo']:   # A: the other host's lines are re-voiced by the solo host ('<id>_a', synthesised on CI by news_voice.py, pilot lines)
    for b_ in SPEC['beats']:
        if b_['who'] != ES['solo'] and f"{b_['line']}_a" in CUES: b_['who'] = ES['solo']; b_['line'] = f"{b_['line']}_a"
def _is_two(id_): return ES['two'] and (id_ in ('hook', 'recap') or re.fullmatch(r'p\d+', id_ or '') is not None)
def _vis(x): return {x['who']} | ({'carlos' if x['who'] == 'ama' else 'ama'} if x.get('other') else set())
def ED_shot(id_, clip, who, frame, line, at, other, frames, tempo):
    if _is_two(id_):   # two-shot master: Ama (left, front) + Carlos (right); the speaker's mouth moves, the other listens
        if who != 'ama': who, clip = 'ama', 'ga4_talk_natural'
        other = 'gc4_listen'
    elif ES['solo'] and id_ != 'hook': frame = 'mcu'   # A: one continuous MCU take after the hook (emphasis by punch, not by cuts)
    elif not ES['solo'] and line: frame = 'mcu'        # B / C: teaching singles = MCU
    if line and S:
        t_ = tempo or line_tempo(line); s0 = speech(line)[0]
        at = (0.5 / FPS - s0 / t_) if who in _vis(S[-1]) else (-ES['lead'] / FPS - s0 / t_)   # J-cut only when the incoming speaker was NOT on screen
    return id_, clip, who, frame, at, other, frames
BND = []; TAKE = {}; TAKES = []; PUN = []
def ED_after_script():
    rv = next((o['shot'] for o in OV if o['style'] == 'Card' and o['text'].startswith('|v:')), None)
    if EXCERPT and rv:   # pilot excerpt: hook -> first reveal (inclusive)
        k = [x['id'] for x in S].index(rv); del S[k + 1:]; T_ = sum(x['dur'] for x in S)
        OV[:] = [o for o in OV if o['t'][0] < T_ - 0.05]
        for o in OV: o['t'][1] = round(min(o['t'][1], T_), 3)
    T_ = sum(x['dur'] for x in S)
    cards = sorted([o for o in OV if o['style'] == 'Card'], key=lambda o: o['t'][0])
    for ci, o in enumerate(cards):   # kinetic type: the card is revealed on the spoken key word (tick + punch land on the same frame)
        sh = next(x for x in S if x['id'] == o['shot']); ln = sh['lines'][0] if sh['lines'] else None
        if not ln: continue
        WJ = json.load(open(f'{N}/vis3/{ln["id"]}.words.json'))['words']; ws = [_nrmw(w['w']) for w in WJ]
        ct = [_nrmw(w_) for w_ in o['text'].split(':', 1)[-1].split()]; ct = [w_ for w_ in ct if w_]
        hit = next((i for i in range(len(ws)) if ct and ws[i:i + min(2, len(ct))] == ct[:min(2, len(ct))]), None)
        if hit is None: continue
        t_new = round(sh['t0'] + ln['at'] + WJ[hit]['s'] / ln['tempo'] - 1 / FPS, 3)
        if t_new <= o['t'][0] or o['t'][1] - t_new < 1.0: continue
        prv = cards[ci - 1] if ci else None
        if prv is not None and abs(prv['t'][1] - o['t'][0]) < 0.02: prv['t'][1] = t_new   # the previous card stays up until the new one replaces it
        o['t'][0] = t_new
    for ci, o in enumerate(cards):   # chained card swap = crossfade with motion (exit 5 f under the incoming entrance 7 f)
        o['enter'] = 7
        if ci + 1 < len(cards) and abs(cards[ci + 1]['t'][0] - o['t'][1]) < 0.02: o['exit'] = 5
    for o in OV:
        if o['style'] in ('Recap', 'Share', 'Ring') and o['t'][0] > 0.05: o['enter'] = 7
    # boundaries: cont (same host / size / clip = invisible), cut, whip (host switch), wipe (section change: into the lesson, into the reveal, into the recap)
    sect = {S[1]['id'] if len(S) > 1 else None, rv, 'recap'}; tk = 0; TAKE[S[0]['id']] = 0; TAKES.append(dict(t0=0.0, kf=[]))
    for k in range(1, len(S)):
        a_, b_ = S[k - 1], S[k]; c_ = round(b_['t0'], 4)
        if a_['who'] == b_['who'] and not a_['other'] and not b_['other'] and a_['frame'] == b_['frame'] and a_['clip'] == b_['clip']: kind = 'cont'
        elif ES['wipe'] and b_['id'] in sect: kind = 'wipe'
        elif ES['whip'] and a_['who'] != b_['who'] and not a_['other'] and not b_['other']: kind = 'whip'
        else: kind = 'cut'
        d_ = 1 if b_['who'] == 'carlos' else -1
        BND.append(dict(k=k, t=c_, kind=kind, frm=a_['id'], to=b_['id'], dir=d_, n_out=(ES['whip'] // 2 if kind == 'whip' else 4 if kind == 'wipe' else 0),
                        n_in=(ES['whip'] - ES['whip'] // 2 if kind == 'whip' else WIPE_N - 4 if kind == 'wipe' else 0)))
        if kind != 'cont': tk += 1; TAKES.append(dict(t0=c_, kf=[]))
        TAKE[b_['id']] = tk
    # sound design: soft whoosh peaking on whips / wipes, a tick on every card reveal; no bg-change whooshes, no pops
    SFX[:] = [('slide.wav', 0.25)] + [('sfx_tick.wav', round(o['t'][0], 3)) for o in OV if o['style'] in ('Card', 'Recap', 'Share', 'Ring') and o['t'][0] > 0.05] \
        + [('sfx_whoosh.wav', round(max(0.0, b['t'] - (b['n_out'] + 3) / FPS), 3)) for b in BND if b['kind'] in ('whip', 'wipe')]
    SFX[:] = [(f_, t_) for f_, t_ in SFX if t_ < T_ - 0.1]
    META['out'] = f'pilot/style-{EDIT}.mp4'; os.makedirs(f'{OUTD}/pilot', exist_ok=True)
def ED_after_captions():
    for o in OV:   # caption chunk entrance (4 f linear fade + 10 px rise); word highlights inside a chunk stay instant (karaoke)
        if o['style'] == 'Cap' and o.get('chunk'):
            first = min(p_['part'] for p_ in OV if p_['style'] == 'Cap' and p_['line'] == o['line'] and (p_.get('chunk') or [None])[0] == o['chunk'][0])
            if o['part'] == first: o['enter'] = 4; o['entry'] = True
        elif o['style'] not in ('Cap', 'Series') and o['t'][0] > 0.05: o['entry'] = True   # Series slides in by itself (prog 0 -> 1); VHook = frame 0
    _a, _b, bad, good = key_tokens(SPEC.get('wrong_line'), SPEC.get('key_line')) if SPEC.get('key_line') else ([], [], set(), set())
    EM = {_nrmw(x_) for x_ in set(bad) | set(good)}
    LN = sorted([(x['t0'] + l['at'], x, l) for x in S for l in x['lines']], key=lambda q: q[0])
    lvl = {}
    for i_, (ta, x, l) in enumerate(LN):   # punches: out in the pause before a new line of the same take, in on the first taught key word
        tk = TAKE[x['id']]; T = TAKES[tk]; ws = l['words']; WT = TEXT[l['id']].split(); on = ws[0][0]
        pe = max([w[1] for _, x2, l2 in LN[:i_] for w in l2['words']] or [0.0])
        if lvl.get(tk, 1.0) > 1.0 and on - T['t0'] > 0.05:
            st = max(pe + 1 / FPS, on - ES['pn'] / FPS); n_ = max(4, int(round((on - st) * FPS)))
            T['kf'].append((round(st, 3), n_, 1.0)); lvl[tk] = 1.0
        hit = next((j_ for j_, w_ in enumerate(WT) if _nrmw(w_) in EM), None)
        if x['id'] == 'hook' and hit is None: hit = len(WT) - 1   # hook: punch on the last word ('this')
        if hit is not None and lvl.get(tk, 1.0) == 1.0:
            T['kf'].append((round(ws[hit][0] - 3 / FPS, 3), ES['pn'], PUNCH)); lvl[tk] = PUNCH
    for T in TAKES: T['kf'].sort()
def _zt(tk, t):
    T = TAKES[tk]; lv, tb = 1.0, T['t0']; R = ES['drift']
    for ts, n_, L_ in T['kf']:
        if t < ts: break
        zs = lv * (1 + R * (ts - tb)); te = ts + n_ / FPS
        if t < te: return zs + (L_ - zs) * _ezc((t - ts) / (n_ / FPS))
        lv, tb = L_, te
    return lv * (1 + R * max(0.0, t - tb))
def ED_PZ(s, j): return _zt(TAKE[s['id']], s['t0'] + j / FPS)
def ED_cams():   # no per-shot moves (they broke continuity at invisible boundaries); drift + punch are global (ED_PZ)
    for x in S:
        c_ = x['cam']; x['cam'] = dict(z=(c_['z'][0],) * 2, tx=(c_['tx'][0],) * 2, ty=(c_['ty'][0],) * 2, rot=(0, 0)); x['move'] = 'drift'
    for g in FACEH: SIDE[(g, 'two')] = 300 if g == 'ama_s' else 790
def ED_master_bg(s, j):   # two-shot master: the shared plate seen from between the two host windows (same room, wider idea)
    P, xs = plate(s['bg'].split('@')[0]); c = cam_at(s, j / max(1, s['n'] - 1)); ty = c['ty']
    zmin = (960 + abs(ty) + 8) / (bg3d.CH / 2) * bg3d.CW / 1080; z = max(zmin, c['z'] * 0.9) * PZ(s, j); k_ = 1080 / bg3d.CW * z
    camx = (xs['L'] + xs['R']) / 2; A_ = np.float32([[k_, 0, 540 - k_ * (camx + bg3d.CW / 2) - c['tx']], [0, k_, 960 - k_ * bg3d.CH / 2 - ty]])
    B_ = cv2.warpAffine(P, A_, (1080, 1920), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REFLECT).astype(np.float32)
    return cv2.GaussianBlur(B_, (0, 0), 1.4)   # light depth of field so the hosts separate
def _bnd_at(s, j):   # (boundary, frame index inside the transition) when frame j of shot s is inside a whip / wipe
    k = S.index(s)
    for b in BND:
        if b['kind'] not in ('whip', 'wipe'): continue
        if b['k'] == k + 1 and j >= s['n'] - b['n_out']: return b, j - (s['n'] - b['n_out'])
        if b['k'] == k and j < b['n_in']: return b, b['n_out'] + j
    return None, None
def ED_plate(s, j, B):   # whip-pan on the picture plate (captions / cards stay locked, like broadcast graphics)
    b, f = _bnd_at(s, j)
    if b is None or b['kind'] != 'whip': return B
    no, ni, D = b['n_out'], b['n_in'], ES['whipD']
    off = lambda q: (-b['dir'] * D * ((q + 1) / (no + 0.5)) ** 2) if q < no else (b['dir'] * D * (1 - (q - no + 1) / (ni + 0.5)) ** 2)
    o_ = off(f); v_ = abs(o_ - off(f - 1)) if f > 0 else abs(o_)
    B = cv2.warpAffine(B, np.float32([[1, 0, o_], [0, 1, 0]]), (1080, 1920), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)
    L_ = int(np.clip(v_ * 0.6, 3, 260)) | 1
    B = cv2.blur(B, (L_, 1)); b.setdefault('log', []).append([f, round(float(o_), 1), L_]); return B
_WG = None
def ED_post(s, j, out):   # branded section wipe (teal band, orange lead stripe, yellow rules, 15 deg slant) over picture + graphics
    global _WG
    b, f = _bnd_at(s, j)
    if b is None or b['kind'] != 'wipe': return out
    if _WG is None: _WG = np.mgrid[0:1920, 0:1080].astype(np.float32)
    yy, xx = _WG; SL = 300.0; cov = [0.14, 0.38, 0.66, 0.9, 1.0, 0.9, 0.66, 0.38, 0.14][min(f, 8)]
    if f < 4: d = (cov * (1080 + SL) - yy / 1920 * SL) - xx           # band enters from the left: distance behind the leading edge
    elif f > 4: d = xx - ((1 - cov) * (1080 + SL) - yy / 1920 * SL)   # band leaves to the right: distance from the trailing edge
    else: d = np.full_like(xx, 999.0)
    m_ = d >= 0; o_ = out.copy(); col = np.zeros_like(out); col[:] = np.array(TEAL[::-1], np.uint8)
    if f < 4: col[(d >= 0) & (d < 70)] = np.array(ORANGE[::-1], np.uint8); col[(d >= 70) & (d < 82)] = np.array(YEL[::-1], np.uint8)
    elif f > 4: col[(d >= 0) & (d < 14)] = np.array(YEL[::-1], np.uint8)
    o_[m_] = col[m_]; sh_ = (d < 0) & (d > -26); o_[sh_] = (o_[sh_].astype(np.float32) * 0.72).astype(np.uint8)   # soft shadow at the moving edge
    b.setdefault('log', []).append([f, round(float(m_.mean()), 3)]); return o_
def _ea(u): return 1 - (1 - min(1.0, max(0.0, u))) ** 2
def ED_ov(o, im, t):   # kinetic overlay entrance / exit; logs what was drawn (qa_edit counts pop-ins from this)
    E_, X_ = o.get('enter', 0), o.get('exit', 0); af = int(round((t - o['t'][0]) * FPS)); ef = int(round((t - o['t'][1]) * FPS))
    if X_ and ef >= 0: u = (ef + 1) / (X_ + 1); al, dy = 1 - u, -int(round(10 * u))
    elif E_ and af < E_:
        u = (af + 1) / (E_ + 1); al = u if o['style'] == 'Cap' else _ea(u); dy = int(round((10 if o['style'] == 'Cap' else 24) * (1 - _ea(u))))
    else: return im
    if not (X_ and ef >= 0): o.setdefault('enter_log', []).append([af, round(al, 3), dy])
    im2 = im.copy(); im2.putalpha(im2.split()[3].point(lambda v, k=al: int(v * k)))
    if dy: L_ = layer(); L_.alpha_composite(im2, dest=(0, dy)) if dy > 0 else L_.alpha_composite(im2, source=(0, -dy)); im2 = L_
    return im2
def ED_sfx():   # synthesised soft whoosh (band-limited noise swell, 0.32 s) + tick (2.3 kHz, 28 ms)
    import wave
    sr = 48000; rng = np.random.default_rng(7)
    def wr(p, x):
        x = (np.clip(x, -1, 1) * 32767).astype(np.int16); w_ = wave.open(p, 'wb'); w_.setnchannels(1); w_.setsampwidth(2); w_.setframerate(sr); w_.writeframes(x.tobytes()); w_.close()
    n = int(0.32 * sr); t_ = np.arange(n) / sr; nz = rng.standard_normal(n)
    lo = np.convolve(nz, np.ones(24) / 24, 'same'); hi = nz - np.convolve(nz, np.ones(6) / 6, 'same'); sweep = np.clip(t_ / 0.32, 0, 1)
    env = np.sin(np.pi * np.clip(t_ / 0.32, 0, 1)) ** 2 * np.exp(-((t_ - 0.2) / 0.12) ** 2 * 0.5); x = (lo * (1 - sweep) + 0.35 * hi * sweep) * env
    wr(f'{RD}/sfx_whoosh.wav', 0.6 * x / (np.abs(x).max() + 1e-9))
    n = int(0.028 * sr); t_ = np.arange(n) / sr; x = (np.sin(2 * np.pi * 2300 * t_) + 0.4 * np.sin(2 * np.pi * 4600 * t_)) * np.exp(-t_ / 0.006)
    wr(f'{RD}/sfx_tick.wav', 0.7 * x / np.abs(x).max())
ED_VOL = {'sfx_tick.wav': -27, 'sfx_whoosh.wav': -21, 'slide.wav': -25}
def ED_report():
    return dict(style=EDIT, excerpt=EXCERPT, lead_frames=ES['lead'], drift=ES['drift'], punch=PUNCH, punch_frames=ES['pn'], bounds=BND,
                takes=[dict(t0=T['t0'], kf=T['kf']) for T in TAKES], take_of=TAKE)
