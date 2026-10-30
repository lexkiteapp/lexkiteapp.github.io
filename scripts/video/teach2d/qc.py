#!/usr/bin/env python3
"""Teach2D QC (docs/VIDEO-TEACH2D.md): every gate must pass and the weighted score must be >= 90, else exit 1 (nothing ships).
  python3 scripts/video/teach2d/qc.py --timeline PROPS.json.timeline.json [--video OUT.mp4] [--sheet OUT.sheet.jpg] [--out qc.json]
Gates: voice_teacher · pace (<= 150 wpm) · caption_sync (caption == script == whisper) · mouth (talk only while speaking, listen in pauses)
· hook (on screen at frame 0, <= 6 words, spoken by the episode's hook_by, default 2.2 s) · cue_timing (+-80 ms on the word) · layout (text in SAFE, no overlap, head clear)
· contrast (text >= 4.5:1, large >= 3:1, both on the real fill) · min_text · ipa (== audited bank, stress dot == IPA stress mark) · cta (deep link)
· scene_clear (known scene; counter + props never over captions / text / QR / CTA; calm card region; text + captions readable on the scene)
· bed (social music bed -40 +-3 dBFS RMS, voice dominates) · duration · file (fps, AAC, duration, -16 LUFS) · frames (teacher visible every second
against the expected scene background, no blank frame) – the last two need --video."""
import argparse, json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, f'{ROOT}/scripts/video/motion'); sys.path.insert(0, f'{ROOT}/scripts/video/tpl')
import core as C  # noqa: E402
sys.path.insert(0, HERE); import pace as P  # noqa: E402
import scene as SC  # noqa: E402
from overlay_gates import contrast as _cr, bank_ipa, stress_index  # noqa: E402
def contrast(a, b): return _cr(*[[int(x[i:i + 2], 16) for i in (1, 3, 5)] for x in (a, b)])
ap = argparse.ArgumentParser(); ap.add_argument('--timeline', required=True); ap.add_argument('--video'); ap.add_argument('--sheet'); ap.add_argument('--out')
o = ap.parse_args(); T = json.load(open(o.timeline)); TH = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json'))[T['theme']]
REG = json.load(open(f'{ROOT}/web/teach/characters.json')); R = {}; N = {n['id']: n for n in T['nodes']}
norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower().replace('’', "'"))
def gate(name, ok, w=1, **kw): R[name] = dict(ok=bool(ok), w=w, **kw)
def inter(a, b, m=0): return a[0] < b[2] - m and b[0] < a[2] - m and a[1] < b[3] - m and b[1] < a[3] - m
def alpha(n, t):
    a = C.pose(n, t)['a']; p = n.get('parent')
    while p: a *= C.pose(N[p], t)['a']; p = N[p].get('parent')
    return a

# voice = teacher (owner 29/10): the voice id of the registry teacher shown
gate('voice_teacher', T['voice'] == REG['people'][T['teacher']]['voice']['video'], 3, voice=T['voice'], teacher=T['teacher'])
# pace
L = T['lines']; nw = sum(len(v['words']) for v in L.values()); span = max(v['words'][-1]['e'] for v in L.values()) - min(v['words'][0]['s'] for v in L.values())
lw = {k: P.rate(v['words']) for k, v in L.items() if len(v['words']) >= 5}
gate('pace', 60 * nw / span <= 150 and max(lw.values()) <= P.MAX, 2,   # brief: <= 150 wpm over the episode; per line <= 5 syllables/s (short-word lines inflate wpm)
     wpm=round(60 * nw / span), line_syl_per_s_max=max(lw.values()), fastest=max(lw, key=lw.get))
# caption == script == whisper
bad = []
for k, v in L.items():
    script = [norm(w) for w in v['text'].split()]; spoken = [norm(w['w']) for w in v['words']]
    # coverage of the script's letters in what whisper heard (whisper may repeat the prompt after the audio ends and splits 'U.S.' -> 'U .S.')
    r = P.heard(v['text'], v['whisper'])
    if spoken != script or r < 0.9 or v['interp'] > 2: bad.append(dict(line=k, heard=round(r, 2), interp=v['interp']))
if T['format'] == 'short':
    capw = [norm(w['w']) for c in T['caps'] for w in c['words']]; allw = [norm(w['w']) for v in L.values() for w in v['words']]
    if capw != allw: bad.append(dict(captions='caption tokens != spoken tokens'))
gate('caption_sync', not bad, 3, bad=bad[:6])
# mouth: talk frames cover every spoken word, no talk in silences > 0.35 s
fps = T['fps']; nf = int(round(T['total'] * fps)); talk = [False] * nf
for s in T['segs']:
    for f in range(s['from'], min(nf, s['from'] + s['dur'])): talk[f] = s['clip'] == 'talk'
miss = [w['w'] for v in L.values() for w in v['words'] if not all(talk[f] for f in range(int(w['s'] * fps) + 1, max(int(w['s'] * fps) + 2, int(w['e'] * fps))) if f < nf)]
sp = sorted(T['speech']); long_talk = []
for (a0, a1), (b0, b1) in zip(sp, sp[1:]):
    if b0 - a1 > 0.35 and any(talk[f] for f in range(int((a1 + 0.15) * fps), int((b0 - 0.1) * fps))): long_talk.append(round(a1, 2))
# host coverage on EVERY frame (same rule as TeachShort.jsx Host): an incoming clip fades in only over an outgoing one that can keep playing
HS = T['segs']; XF = T.get('host_xfade', 4); HL = T.get('host_len') or {}
can = lambda k: 0 <= k < len(HS) - 1 and HS[k]['start'] + HS[k]['dur'] + XF <= HL.get(HS[k]['clip'], 0)
cov = [0.0] * nf
for i, s_ in enumerate(HS):
    for f in range(s_['from'], min(nf, s_['from'] + s_['dur'] + (XF if can(i) else 0))):
        a_ = 1.0 if i == 0 or not XF or not can(i - 1) else C.ease_out((f - s_['from']) / XF); cov[f] = max(cov[f], a_)
holes = [round(f / fps, 2) for f in range(nf) if cov[f] < 0.99]   # an outgoing clip under a fade counts 1.0
gate('host_cover', not holes and HL, 3, holes=holes[:6], frames=nf)
gate('mouth', not miss and not long_talk, 3, words_without_talk=miss[:5], talk_in_silence=long_talk[:5], segments=len(T['segs']))
# hook
hk = [n for n in T['nodes'] if n.get('hook')]
HB = T.get('hook_by', 2.2)   # per episode (new samples 1.5 s), default 2.2 s
gate('hook', hk and alpha(hk[0], 0.0) >= 0.99 and len(L['h']['text'].split()) <= 6 and L['h']['words'][-1]['e'] <= HB, 3,
     hook_words=len(L['h']['text'].split()), spoken_by=L['h']['words'][-1]['e'], hook_by=HB)
# cue timing: every element appears on its word
off = [dict(node=c['node'], tag=c['tag'], d=round(N[c['node']]['in']['t'] + C.HALF[N[c['node']]['in']['k']] - c['t'], 3)) for c in T['cues'] if c['t'] is not None and c['node'] in N]
offb = [x for x in off if abs(x['d']) > 0.08 and N[x['node']]['in']['t'] >= N[N[x['node']]['parent']]['in']['t'] + 1e-6 if N[x['node']].get('parent')]
gate('cue_timing', not offb, 2, checked=len(off), bad=offb[:6])
# layout: sampled every 0.1 s
SAFE = T['safe']; head = T['head']; prob = []; leaf = {'text', 'chip', 'pill', 'ring', 'img', 'cta', 'tag', 'cross', 'check', 'qmark', 'eq', 'flags', 'candy', 'beat', 'ipapill', 'rhythm', 'vs', 'stamp', 'slot', 'opt', 'brick', 'plus', 'pic', 'letter', 'track', 'score', 'wave', 'flip', 'grade'}
for i in range(int(T['total'] * 10)):
    t = i / 10; vis = [n for n in T['nodes'] if alpha(n, t) > 0.3]
    for n in vis:
        if n['type'] in leaf and not (SAFE[0] - 1 <= n['box'][0] and n['box'][2] <= SAFE[2] + 1 and SAFE[1] - 1 <= n['box'][1] and n['box'][3] <= SAFE[3] + 1) and n['id'] != 'series':
            prob.append(dict(t=t, id=n['id'], why='outside SAFE', box=n['box']))
        if n['type'] != 'confetti' and inter(n['box'], head): prob.append(dict(t=t, id=n['id'], why='on the teacher head', box=n['box']))
        if T['cap_box'] and n['type'] in leaf | {'card', 'split'} and inter(n['box'], T['cap_box']) and any(c['t0'] <= t < c['t1'] for c in T['caps']): prob.append(dict(t=t, id=n['id'], why='under the caption band', box=n['box']))
    tx = [n for n in vis if n['type'] in leaf]
    for a in range(len(tx)):
        for b in range(a + 1, len(tx)):
            A, B = tx[a], tx[b]
            if inter(A['box'], B['box'], 2) and not ({A['type'], B['type']} & {'check'} and 'pill' in {A['type'], B['type']}) and not {A['type'], B['type']} == {'stamp', 'candy'} and not (A['type'] == 'ring' or B['type'] == 'ring') and A.get('parent') != B['id'] and B.get('parent') != A['id']:
                prob.append(dict(t=t, ids=[A['id'], B['id']], why='overlap'))
    cards = [n for n in vis if n['type'] == 'card' and not n.get('parent')]
    for a in range(len(cards)):
        for b in range(a + 1, len(cards)):
            if inter(cards[a]['box'], cards[b]['box']): prob.append(dict(t=t, ids=[cards[a]['id'], cards[b]['id']], why='cards overlap'))
if T['cap_box'] and inter(T['cap_box'], head): prob.append(dict(why='caption band on the head', cap=T['cap_box'], head=head))
rings = [n for n in T['nodes'] if n['type'] == 'ring']
for r in rings:
    for n in T['nodes']:
        if n['type'] == 'text' and n.get('parent') and abs(r['in']['t'] - N[n['parent']]['in']['t']) < 6 and inter(r['box'], n['box']): prob.append(dict(id=n['id'], why='text under the countdown ring'))
for n in T['nodes']:   # nothing may stay on screen after the card it belongs to (✓ of a quiz, strike, ring)
    if n['type'] in ('check', 'confetti', 'ring', 'strike', 'eq', 'qmark') and not n.get('parent'):
        owners = [c for c in T['nodes'] if c['type'] == 'card' and not c.get('parent') and inter(c['box'], n['box']) and c['in']['t'] <= n['in']['t'] + 0.3 and (not c.get('out') or c['out']['t'] > n['in']['t'] + 0.2)]   # cards on screen when it appears
        ends = [c['out']['t'] for c in owners if c.get('out')]
        if ends and (not n.get('out') or n['out']['t'] > max(ends) + 0.05): prob.append(dict(id=n['id'], why='outlives its card', type=n['type']))
seen = set(); prob = [p for p in prob if not (json.dumps({k: v for k, v in p.items() if k != 't'}, sort_keys=True) in seen or seen.add(json.dumps({k: v for k, v in p.items() if k != 't'}, sort_keys=True)))]
gate('layout', not prob, 3, problems=prob[:8])
# contrast on the real fill (card tone / chip / pill / caption plate), both themes are separate renders
def rgb(c, over=None):
    if c.startswith('#'): return c
    m = re.match(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)', c); r, g, b, a = int(m[1]), int(m[2]), int(m[3]), float(m[4]); ov = [int(over[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x * a + y * (1 - a)):02x}' for x, y in zip((r, g, b), ov))
FILL = dict(card=TH['card'], tile=TH['tile'], good=TH['good_bg'], bad=TH['bad_bg'], bubble_bad=TH['bubble_bad'], bubble_good=TH['bubble_good'])
low = []
def need(sz): return 3.0 if sz >= 56 else 4.5
for n in T['nodes']:
    if n['type'] == 'text':
        bg = FILL.get(N[n['parent']]['tone'], TH['card']) if n.get('parent') else TH['bg']
        for s, k in n['runs']:
            if s.strip():
                cr = contrast(TH.get(k, k), bg)
                if cr < need(n['size']): low.append(dict(id=n['id'], text=s.strip()[:20], cr=cr, need=need(n['size'])))
for n in T['nodes']:   # Stitch components with their own fills (candy tiles, beat tiles, stamp, VS…) declare their text/fill pairs
    for fg, bg, sz in n.get('pairs') or []:
        cr = contrast(TH.get(fg, fg), TH.get(bg, bg))
        if cr < need(sz): low.append(dict(id=n['id'], type=n['type'], fg=fg, bg=bg, cr=cr, need=need(sz)))
pairs = [('chip', TH['chip_ink'], TH['chip_bg'], 40), ('pill', TH['ink'], TH['pill'], 56), ('pill-right', TH['ink'], TH['good_bg'], 56), ('pill-dim', TH['muted'], TH['pill'], 56),
         ('caption', TH['cap_ink'], rgb(TH['cap_plate'], TH['bg2']), 58), ('caption-now', TH['cap_now'], rgb(TH['cap_plate'], TH['bg2']), 58), ('cta', TH['cta_ink'], TH['cta_a'], 60), ('ring', TH['ring_ink'], TH['ring_bg'], 54)]
for name, fg, bg, sz in pairs:
    cr = contrast(fg, bg)
    if cr < need(sz): low.append(dict(id=name, cr=cr, need=need(sz)))
gate('contrast', not low, 3, low=low[:8], theme=T['theme'])
# matching 2D scene: known key; the foreground counter + props on it never cover captions / cards / text / QR / CTA; card region stays calm;
# free text and captions stay readable on the composited scene (scene.py = the same items TeachShort.jsx draws)
SCN = T.get('scene'); sp_ = []
if SCN:
    W_, H_ = (1080, 1920) if T['format'] == 'short' else (1920, 1080); tint = SCN.get('tint'); bg_, bg2_ = [[int(TH[k][i:i + 2], 16) for i in (1, 3, 5)] for k in ('bg', 'bg2')]
    base = lambda y: [u + (v - u) * y / H_ for u, v in zip(bg_, bg2_)]   # Kit canvas gradient bg -> bg2
    comp = lambda x, y: [round(v) for v in SC.composite(SCN['items'], x, y, base(y), TH, tint, ('back', 'front'))]
    if SCN['key'] not in SC.SCENES: sp_.append(dict(why='unknown scene', key=SCN['key']))
    fg = ([SCN['counter']] + [SC.bbox(x) for x in SCN['items'] if x.get('l') == 'front' and SC.bbox(x)[1] < SCN['counter'][1]]) if SCN['counter'] else []
    for r_ in fg:
        if T['cap_box'] and inter(r_, T['cap_box']): sp_.append(dict(why='counter over the captions', box=r_))
        sp_ += [dict(why='counter over a node', id=n['id'], type=n['type'], box=r_) for n in T['nodes'] if n['type'] != 'confetti' and inter(r_, n['box'])]
    R0 = T['region']; calm = max([C_ for C_ in (contrast(SC.hexc(comp(x, y)), SC.hexc(base(y))) for x in range(int(R0[0]), int(R0[2]), 16) for y in range(int(R0[1]), int(R0[3]), 16))] or [1.0])
    if calm > 1.35: sp_.append(dict(why='scene fights the card region', max_cr=calm))
    for n in T['nodes']:   # free text (on the canvas, no card fill under it)
        if n['type'] != 'text' or n.get('parent'): continue
        bx = n['box']; pts = [(x, y) for x in range(int(bx[0]), int(bx[2]) + 1, 24) for y in (int(bx[1]) + 4, int((bx[1] + bx[3]) / 2), int(bx[3]) - 4)]
        lo = min(contrast(TH.get(k, k), SC.hexc(comp(x, y))) for x, y in pts for s, k in n['runs'] if s.strip())
        if lo < need(n['size']): sp_.append(dict(why='text on the scene', id=n['id'], cr=lo))
    if T['cap_box']:
        m_ = re.match(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)', TH['cap_plate']); pa = float(m_[4]) if m_ else 1.0
        pr_ = [int(m_[i]) for i in (1, 2, 3)] if m_ else [int(TH['cap_plate'][i:i + 2], 16) for i in (1, 3, 5)]; cb = T['cap_box']; lo = 99
        for x in range(int(cb[0]), int(cb[2]), 16):
            for y in range(int(cb[1]), int(cb[3]), 16):
                pl = SC.hexc([p_ * pa + q_ * (1 - pa) for p_, q_ in zip(pr_, comp(x, y))]); lo = min(lo, contrast(TH['cap_ink'], pl), contrast(TH['cap_now'], pl))
        if lo < need(58): sp_.append(dict(why='captions on the scene', cr=lo))
gate('scene_clear', not sp_, 2, scene=SCN and SCN['key'], counter=SCN and SCN['counter'], problems=sp_[:6])
# music bed (social shorts): background bed -40 dBFS RMS +-3 (voice dominates), ducked under the voice; lesson embeds carry no bed
bed = [x for x in T.get('sfx') or [] if 'music' in x]
if T['format'] == 'short': gate('bed', len(bed) == 1 and 'rms_meas' in bed[0] and abs(bed[0]['rms_meas'] + 40) <= 3 and bed[0].get('duck_db', 0) <= -12, 2, bed=bed[:1], want='-40 +-3 dBFS RMS, duck >= 12 dB')
else: gate('bed', not bed, 2, bed=bed[:1], want='no music bed in the lesson embed')
# min text size
fl = 40 if T['format'] == 'short' else 34; small = [n['id'] for n in T['nodes'] if n.get('size') and n['size'] < fl]
gate('min_text', not small, 2, floor=fl, small=small)
# IPA == audited bank; stress dot == IPA stress
bk = bank_ipa({x['token'].lower() for x in T['ipa']}, ROOT); ib = []
for x in T['ipa']:
    if bk.get(x['token'].lower()) != x['ipa']: ib.append(dict(token=x['token'], shown=x['ipa'], bank=bk.get(x['token'].lower())))
    if 'stress' in x and stress_index(x['ipa']) != x['stress']: ib.append(dict(token=x['token'], why='stress dot != IPA stress mark', ipa=x['ipa'], dot=x['stress']))
gate('ipa', not ib, 3, checked=len(T['ipa']), bad=ib)
# CTA deep link into the matching app feature
cta = T['cta']; ROUTES = ('#/dict/', '#/verb/', '#/pron/', '#/fix', '#/phrases', '#/usage', '#/grammar', '#/lesson', '#/call', '#/confidence', '#/placement', '#/toeic', '#/reading', '#/review', '#/dictation')
gate('cta', cta['link'].startswith('https://lexkite.com/app/') and cta['route'].startswith(ROUTES) and cta['link'].endswith(cta['route']), 2, **cta)
gate('duration', (18 <= T['total'] <= 28) if T['format'] == 'short' else (15 <= T['total'] <= 42), 2, seconds=T['total'], want='18-28 s social short (owner 29/10)' if T['format'] == 'short' else '15-42 s lesson embed')
# rendered file
if o.video:
    pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate:format=duration', '-of', 'json', o.video]))
    v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in pr['streams'] if s['codec_type'] == 'audio']; d = float(pr['format']['duration'])
    lo = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', o.video, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', lo)[-1])
    gate('file', eval(v['r_frame_rate']) == T['fps'] and a and a[0]['codec_name'] == 'aac' and abs(d - T['total']) < 0.2 and -17.5 <= I <= -14.5, 2,
         fps=v['r_frame_rate'], size=[v['width'], v['height']], dur=round(d, 2), lufs=I)
    import numpy as np
    W, H = v['width'], v['height']; raw = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', o.video, '-vf', 'fps=4', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); bgc = np.array([int(TH['bg2'][i:i + 2], 16) for i in (1, 3, 5)])
    hx = [int(max(0, x)) for x in T['body']]; hx[2] = min(hx[2], W); hx[3] = min(hx[3], H); hostvis = []; blank = []
    if SCN and SCN['counter'] and SCN['counter'][1] > hx[1] + 100: hx[3] = min(hx[3], int(SCN['counter'][1]))   # the counter hides the teacher's lower edge by design
    ref = SC.expected(SCN['items'], hx, bgc, TH, SCN.get('tint')) if SCN else bgc   # teacher = pixels unlike the frame WITHOUT her (scene drawn), not unlike flat bg2
    for i, im in enumerate(fr):
        crop = im[hx[1]:hx[3], hx[0]:hx[2]].astype(int); diff = (np.abs(crop - ref).sum(2) > 60).mean(); hostvis.append(round(float(diff), 3))
        if im.std() < 4: blank.append(i)
    gate('frames', min(hostvis) > 0.12 and not blank, 3, host_cover_min=min(hostvis), host_missing_s=[i / 4 for i, x in enumerate(hostvis) if x <= 0.12][:6], blank=blank)   # 4 samples / s
    if o.sheet:   # contact sheet: one frame per line (middle), for the review sheet
        ts = [round((x['t0'] + x['t1']) / 2, 2) for x in L.values()]
        sel = '+'.join(f'between(t\\,{t - 0.02}\\,{t + 0.02})' for t in ts)
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.video, '-vf', f"select='{sel}',scale={W // 3}:-2,tile={len(ts)}x1", '-frames:v', '1', '-q:v', '3', o.sheet], check=True)
tot = sum(g['w'] for g in R.values()); score = round(100 * sum(g['w'] for g in R.values() if g['ok']) / tot, 1)
res = dict(ep=T['ep'], format=T['format'], theme=T['theme'], score=score, ok=score >= 90 and all(g['ok'] for g in R.values()), gates=R)
if o.out: json.dump(res, open(o.out, 'w'), indent=1)
for k, g in R.items(): print(('PASS ' if g['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in g.items() if a not in ('ok', 'w')}, ensure_ascii=False)[:300])
print(f"{T['ep']} {T['format']} {T['theme']}: score {score} ({len([g for g in R.values() if g['ok']])}/{len(R)} gates)")
sys.exit(0 if res['ok'] else 1)
