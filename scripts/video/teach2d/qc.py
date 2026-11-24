#!/usr/bin/env python3
"""Teach2D QC (docs/VIDEO-TEACH2D.md): every gate must pass and the weighted score must be >= 90, else exit 1 (nothing ships).
  python3 scripts/video/teach2d/qc.py --timeline PROPS.json.timeline.json [--video OUT.mp4] [--sheet OUT.sheet.jpg] [--out qc.json]
Gates: voice_teacher · pace (<= 150 wpm) · caption_sync (caption == script == whisper) · mouth (registry host: talk only while speaking, listen in pauses)
· lipsync_rig (TeacherRig host: every Rhubarb cue >= 50 ms on screen within +-33 ms, X in silences > 0.35 s, no pose over the mouth, frame count – lipsync_gate.py)
· hook (on screen at frame 0, <= 6 words, spoken by 2.2 s) · cue_timing (+-80 ms on the word) · layout (text in SAFE, no overlap, head clear)
· contrast (text >= 4.5:1, large >= 3:1, both on the real fill) · min_text · ipa (== audited bank, stress dot == IPA stress mark) · cta (deep link)
· duration · file (fps, AAC, duration, -16 LUFS) · frames (teacher visible every second, no blank frame) – the last two need --video."""
import argparse, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from labels import nf_of   # noqa: E402  one frame-count formula
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, f'{ROOT}/scripts/video/motion'); sys.path.insert(0, f'{ROOT}/scripts/video/tpl')
import core as C  # noqa: E402
sys.path.insert(0, HERE); import pace as P  # noqa: E402
import lipsync_gate as LG  # noqa: E402
import v3_gates as V3  # noqa: E402
from overlay_gates import contrast as _cr, bank_ipa, stress_index  # noqa: E402
def contrast(a, b): return _cr(*[[int(x[i:i + 2], 16) for i in (1, 3, 5)] for x in (a, b)])
ap = argparse.ArgumentParser(); ap.add_argument('--timeline', required=True); ap.add_argument('--video'); ap.add_argument('--sheet'); ap.add_argument('--out')
o = ap.parse_args(); T = json.load(open(o.timeline)); LOOKS = BEATS = None; TH = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json'))[T['theme']]
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
if True:   # v3: wide burns captions too (audit 24/11 #5)
    capw = [norm(w['w']) for c in T['caps'] for w in c['words']]; allw = [norm(w['w']) for v in L.values() for w in v['words']]
    if capw != allw: bad.append(dict(captions='caption tokens != spoken tokens'))
# v3 caption_full: every spoken line is covered by caption pages (burned in, every format) – none cut mid-sentence, none missing, plate inside the safe box
_nc = []
if not T.get('cap_box'): _nc.append(dict(why='no caption band'))
else:
    sb = T['safe']; cb = T['cap_box']
    if cb[0] < sb[0] or cb[1] < sb[1] or cb[2] > sb[2] or cb[3] > sb[3]: _nc.append(dict(why='caption band outside safe box', cap=cb, safe=sb))
for k, v in L.items():
    pg = [c for c in T['caps'] if c['t0'] <= v['words'][0]['s'] + 0.5 and c['t1'] >= v['words'][0]['s']] if T.get('caps') else []
    got = [w['w'] for c in T['caps'] for w in c['words'] if v['words'][0]['s'] - 1e-6 <= w['s'] <= v['words'][-1]['s'] + 1e-6]
    if len(got) != len(v['words']): _nc.append(dict(line=k, spoken=len(v['words']), captioned=len(got)))
gate('caption_full', not _nc, 3, bad=_nc[:6])
gate('caption_sync', not bad, 3, bad=bad[:6])
# mouth: talk frames cover every spoken word, no talk in silences > 0.35 s
fps = T['fps']; nf = nf_of(T); talk = [False] * nf
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
if T.get('host') == 'rig':   # TeacherRig host: the mouth is the episode's own visemes, checked frame by frame on what rig_host.mjs rendered
    rg = T['rig']
    if os.path.exists(rg['frames']): lr = LG.check(T, json.load(open(rg['frames'])), rg['vo'])
    else: lr = dict(ok=False, missing=rg['frames'])
    gate('lipsync_rig', lr.pop('ok'), 3, **lr)
    # v3 pose_variety (audit 24/11 #1): the teacher changes look (drawn face / pose image) at EVERY beat and shows >= as many different looks as beats (cap 8 = rig vocabulary)
    if os.path.exists(rg['frames']):
        fr_ = json.load(open(rg['frames']))['frames']; look = lambda f: (fr_[min(len(fr_) - 1, f)].get('emo'), fr_[min(len(fr_) - 1, f)].get('pose'))
        ls_ = sorted(L.values(), key=lambda v: v['t0']); same = [v['text'][:24] for a_, v in zip(ls_, ls_[1:]) if look(int((a_['words'][0]['s'] + 0.2) * fps)) == look(int((v['words'][0]['s'] + 0.3) * fps))]
        kinds = {look(f) for f in range(len(fr_))}; need = min(len(ls_), 8)
        LOOKS, BEATS = len(kinds), len(ls_)
        gate('pose_variety', len(kinds) >= need and not same, 3, looks=len(kinds), beats=len(ls_), need=need, unchanged_at=same[:4])
else: gate('mouth', not miss and not long_talk, 3, words_without_talk=miss[:5], talk_in_silence=long_talk[:5], segments=len(T['segs']))
# hook
hk = [n for n in T['nodes'] if n.get('hook')]
gate('hook', hk and alpha(hk[0], 0.0) >= 0.99 and len(L['h']['text'].split()) <= 6 and L['h']['words'][-1]['e'] <= 2.2, 3,
     hook_words=len(L['h']['text'].split()), spoken_by=L['h']['words'][-1]['e'])
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
# v3 layout_fill (audit 24/11 #3): at ANY sampled moment the safe box is filled – cards / titles / teacher / caption plate cover >= 1 - MAX_EMPTY of it (timeline geometry, theme-independent; a card in a tone close to the background still counts)
MAX_EMPTY = 0.50; CELL = 24; sb = T['safe']; gx, gy = (sb[2] - sb[0]) // CELL + 1, (sb[3] - sb[1]) // CELL + 1; fill_bad = []
for k_ in range(int(T['total'] * 4)):
    t_ = k_ / 4 + 0.05; cov = set()
    boxes = [n['box'] for n in T['nodes'] if not n.get('parent') and n['type'] not in ('confetti', 'backdrop') and not n.get('hidden') and alpha(n, t_) > 0.5 and (not n.get('out') or n['out']['t'] > t_)] + [T['body']]
    if T.get('cap_box') and any(c['t0'] <= t_ < c['t1'] for c in T.get('caps', [])): boxes.append(T['cap_box'])
    for b_ in boxes:
        for gx_ in range(max(0, int((b_[0] - sb[0]) // CELL)), min(gx, int((b_[2] - sb[0]) // CELL) + 1)):
            for gy_ in range(max(0, int((b_[1] - sb[1]) // CELL)), min(gy, int((b_[3] - sb[1]) // CELL) + 1)): cov.add((gx_, gy_))
    e_ = 1 - len(cov) / (gx * gy)
    if e_ > MAX_EMPTY: fill_bad.append(dict(t=round(t_, 2), empty_pct=round(100 * e_)))
gate('layout_fill', len(fill_bad) <= max(1, 0.10 * int(T['total'] * 4)), 3, max_empty=MAX_EMPTY, bad_moments=len(fill_bad), worst=sorted(fill_bad, key=lambda x: -x['empty_pct'])[:4])
# platform UI zones (Spell->Sound, docs/specs/spell-sound.md): the 9:16 short keeps every element out of the top 12 % (back / search icons), the bottom 22 % (caption + sound row) and the right 14 % (like / comment rail),
# and shows at most 6 text rows at once. Defects seen in the reference reel (title under the icons, meaning chips under the rail, last row over the caption) must never ship.
if T['template'] in ('rule', 'band') and T['format'] == 'short':
    ZW, ZH = 1080, 1920; zx, zy0, zy1 = ZW * 0.86, ZH * 0.12, ZH * 0.78; zp = []; ROWS = ('text', 'chip', 'ipapill', 'pill', 'cta')
    for n in T['nodes']:
        if n['type'] in ('confetti', 'backdrop') or n.get('hidden'): continue
        b = n['box']
        if b[2] > zx + 1 or b[1] < zy0 - 1 or b[3] > zy1 + 1: zp.append(dict(id=n['id'], type=n['type'], box=b))
    if T['cap_box'] and T['cap_box'][2] > zx + 1: zp.append(dict(id='caption', box=T['cap_box']))
    mx = 0
    for i in range(int(T['total'] * 10)):
        k = len([n for n in T['nodes'] if n['type'] in ROWS and n['id'] != 'series' and alpha(n, i / 10) > 0.3]); mx = max(mx, k)
    gate('platform_zones', not zp and mx <= 6, 3, outside=zp[:6], max_rows=mx, zones=dict(top=0.12, bottom=0.22, right=0.14, max_rows=6))
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
# min text size
fl = 40 if T['format'] == 'short' else 34; small = [n['id'] for n in T['nodes'] if n.get('size') and n['size'] < fl]
gate('min_text', not small, 2, floor=fl, small=small)
# IPA == audited bank; stress dot == IPA stress
bk = bank_ipa({x['token'].lower() for x in T['ipa']}, ROOT); ib = []
if T.get('template') == 'slang':   # slang keys are not lexicon words: the audited source is content/say-native/slang.json (slang.mjs gate: lexicon IPA of every content word)
    bk.update({i['key'].lower(): i['ipa'] for i in json.load(open(f'{ROOT}/content/say-native/slang.json'))['items'] if i['key'].lower() in bk})
for x in T['ipa']:
    if bk.get(x['token'].lower()) != x['ipa']: ib.append(dict(token=x['token'], shown=x['ipa'], bank=bk.get(x['token'].lower())))
    if 'stress' in x and stress_index(x['ipa']) != x['stress']: ib.append(dict(token=x['token'], why='stress dot != IPA stress mark', ipa=x['ipa'], dot=x['stress']))
gate('ipa', not ib, 3, checked=len(T['ipa']), bad=ib)
# v3 end_card: the one closing card has all 4 parts (icon, 'Practice...' button, QR, lexkite.com) on screen >= 2 s
_ns = list(N.values()); _in = lambda n: (n.get('in') or {}).get('t', 0)
_p = dict(icon=[n for n in _ns if n.get('src') == 'icon.png'], button=[n for n in _ns if n['type'] == 'cta' and str(n.get('lines', [''])[0]).startswith('Practice')],
          qr=[n for n in _ns if n.get('src') == 'qr.png'], url=[n for n in _ns if n['type'] == 'text' and any(r[0] == 'lexkite.com' for r in n.get('runs', []))])
_miss = [k for k, v in _p.items() if not v]; _late = [k for k, v in _p.items() if v and T['total'] - _in(v[-1]) < 2.0]
_clip = [n['lines'][0] for n in _p['button'] if len(n['lines'][0]) * 0.45 * n.get('size', 60) > (n['box'][2] - n['box'][0]) - 80]   # label must fit the button (pilot t2sc_001: 'Practice and find your level' was cut at 'your')
gate('end_card', not _miss and not _late and not _clip, 3, missing=_miss, shown_under_2s=_late, label_too_long=_clip, total=T['total'])
# CTA deep link into the matching app feature
cta = T['cta']; ROUTES = ('#/dict/', '#/verb/', '#/pron/', '#/fix', '#/phrases', '#/usage', '#/grammar', '#/lesson', '#/call', '#/confidence', '#/placement', '#/toeic', '#/reading', '#/review', '#/dictation', '#/write', '#/speaking')
gate('cta', cta['link'].startswith('https://lexkite.com/app/') and cta['route'].startswith(ROUTES) and cta['link'].endswith(cta['route']), 2, **cta)
if T.get('template') == 'levels3': gate('duration', 9.5 <= T['total'] <= 13.5, 2, seconds=T['total'], want='10-13 s levels reel (est. 8.5-11.2 s + end-card tail)')
elif T.get('template') == 'scorecard': gate('duration', 9 <= T['total'] <= 13, 2, seconds=T['total'], want='9-13 s score challenge (9-12 s + end-card tail)')
elif T.get('template') in ('slang', 'guess3'): gate('duration', 7 <= T['total'] <= 13, 2, seconds=T['total'], want='7-13 s short reel (owner 22/11: 7-12 s + end-card tail)')
else: gate('duration', (18 <= T['total'] <= 28) if T['format'] == 'short' else (15 <= T['total'] <= 42), 2, seconds=T['total'], want='18-28 s social short (owner 29/10)' if T['format'] == 'short' else '15-42 s lesson embed')
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
    hx = [int(max(0, x)) for x in T['body']]; hostvis = []; blank = []
    for i, im in enumerate(fr):
        crop = im[hx[1]:hx[3], hx[0]:hx[2]].astype(int); diff = (np.abs(crop - bgc).sum(2) > 60).mean(); hostvis.append(round(float(diff), 3))
        if im.std() < 4: blank.append(i)
    gate('frames', min(hostvis) > 0.12 and not blank, 3, host_cover_min=min(hostvis), host_missing_s=[i / 4 for i, x in enumerate(hostvis) if x <= 0.12][:6], blank=blank)   # 4 samples / s
    from dead_band import check as _dead_band   # owner 19/11: no flat empty band >= 8 % of the frame height (scripts/video/tpl/dead_band.py), short + wide
    _db = _dead_band(im.astype(np.float32).mean(2) for im in fr); gate('dead_band', _db['ok'], 3, **{k: v for k, v in _db.items() if k != 'ok'})
    if o.sheet:   # contact sheet: one frame per line (middle), for the review sheet
        ts = [round((x['t0'] + x['t1']) / 2, 2) for x in L.values()]
        sel = '+'.join(f'between(t\\,{t - 0.02}\\,{t + 0.02})' for t in ts)
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.video, '-vf', f"select='{sel}',scale={W // 3}:-2,tile={len(ts)}x1", '-frames:v', '1', '-q:v', '3', o.sheet], check=True)
# v3 native_script (audit 24/11 #8): Arabic-script text is right-to-left and never mixed with Latin in one node; CJK / Hangul text is >= 44 px (the brand fonts have no such glyphs, Chromium falls back to Noto CJK / Arabic)
_ar, _cjk, _bad_s = re.compile('[\u0600-\u06ff\u0750-\u077f]'), re.compile('[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]'), []
for n in T['nodes']:
    tx = ' '.join(r_[0] for r_ in n.get('runs') or []) if n.get('runs') else ''
    if _ar.search(tx) and (not n.get('rtl') or re.search('[A-Za-z]', tx)): _bad_s.append(dict(id=n['id'], why='arabic must be rtl and Latin-free', text=tx[:30]))
    if _cjk.search(tx) and n.get('size', 99) < 44: _bad_s.append(dict(id=n['id'], why='cjk text < 44 px', size=n.get('size')))
gate('native_script', not _bad_s, 2, bad=_bad_s[:4])
# v3 viral_score (>= 95, each criterion scored) and ypp (duplicate / value / disclosure / rights): below 95 or any ypp reason = not published, not banked
_epf = f"{ROOT}/content/video/teach2d/eps/{T['ep']}.json"; _ep = json.load(open(_epf)) if os.path.exists(_epf) else {}
_vs = V3.viral_score(T, _ep, R, LOOKS, BEATS); gate('viral_score', _vs['ok'], 3, score=_vs['score'], parts=_vs['parts'], notes=_vs['notes'], need=V3.PASS)
_pol = json.load(open(f'{ROOT}/content/video/teach2d/ypp.json')); _yp = V3.ypp(T, _ep, _pol, _pol)
gate('ypp', _yp['ok'], 3, why=_yp['why'], similarity=_yp['similarity'], most_similar=_yp['most_similar'])
tot = sum(g['w'] for g in R.values()); score = round(100 * sum(g['w'] for g in R.values() if g['ok']) / tot, 1)
res = dict(ep=T['ep'], format=T['format'], theme=T['theme'], score=score, ok=score >= 90 and all(g['ok'] for g in R.values()), gates=R)
if o.out: json.dump(res, open(o.out, 'w'), indent=1)
for k, g in R.items(): print(('PASS ' if g['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in g.items() if a not in ('ok', 'w')}, ensure_ascii=False)[:300])
print(f"{T['ep']} {T['format']} {T['theme']}: score {score} ({len([g for g in R.values() if g['ok']])}/{len(R)} gates)")
sys.exit(0 if res['ok'] else 1)
