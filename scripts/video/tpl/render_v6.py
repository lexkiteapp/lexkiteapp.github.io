#!/usr/bin/env python3
"""Pilot v6 "presenter show" (docs/VIDEO-TEMPLATES.md §11): ONE host (Ama) at the anchor news desk, full-frame native bank clips (the host was
generated INSIDE the set: no cut-out, no compositing of the person), Rhubarb mouth swap on the bank's own mouth sprites (scripts/cine/lipsync.py),
a "studio screen" (dark ink glass monitor) in the wall area above the head carrying hook -> correction -> rule -> examples -> quiz (3-2-1) -> answer
-> end card, KARAOKE captions over the desk (each word wipes left->right in the accent colour exactly while it is spoken), news lower-third for the
first 3 s, logo bug, slow push-in + one punch-in, loop-clean ending (last frame == first frame).

  python3 scripts/video/tpl/render_v6.py --lesson L.json --lines lines.json --vo VO/vis3 --lib footage/anchor --fonts brand/social/src/fonts --out out.mp4

Framing: the bank MCU is used at native resolution. To give the screen the room above the head the set is shifted down by V6.D px and the empty wall
rows above the hair (src rows 0..H0) are stretched to fill the top (they sit behind the frosted glass). The host is never scaled down or cut out; the
camera push is <= V6.punch (Lanczos + matched unsharp, measured by the sharpness gate against the native frame).
Writes <out>, <out>.timeline.json (per-frame element log for qc_v6.py), <out>.samples/ (rendered reference frames), <out>.mix.wav."""
import os, sys, json, math, argparse, subprocess, hashlib
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); from tokens import SAFE, C, bezier, EASE
sys.path.insert(0, f'{ROOT}/scripts/cine'); import lipsync as LS

ap = argparse.ArgumentParser()
for a in ('lesson', 'lines', 'vo', 'lib', 'fonts', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--logo', default=f'{ROOT}/brand/social/logo/lexkite-logo-horizontal-on-dark.png')
ap.add_argument('--bug', default=f'{ROOT}/brand/social/logo/lexkite-app-icon.png')
ap.add_argument('--kbps', type=int, default=8800)
ap.add_argument('--total', type=float, default=29.6)
ap.add_argument('--preview', default='', help='comma list of seconds: render only those frames to <out>.preview/*.png (no encode/audio)')
o = ap.parse_args()
W, H, FPS = 1080, 1920, 24
V6 = dict(D=200, H0=300, anchor=(480, 830), push=0.025, punch=1.06, punch_in=0.22,
          panel_top=(40, 1040), panel_bot=(28, 1052), panel_y1=512, radius=34, content=(64, 248, 904, 492),
          ink=(15, 61, 62), ink_top=(9, 36, 38), glass_mix=0.80, glow=(220, 238, 232),
          cap_size=68, cap_min=58, cap_line=80, cap_bottom=1489, cap_x=(SAFE['x0'], SAFE['x1']), cap_words=8, cap_stroke=8,
          accent=C['yellow'], upcoming=0.60, lt_y=1196, bug=(964, 258, 60))
D, H0 = V6['D'], V6['H0']; AX, AY = V6['anchor']
FH = f"{o.fonts}/BeVietnamPro-ExtraBold.ttf"; FBd = f"{o.fonts}/BeVietnamPro-Bold.ttf"
_fc = {}
def font(sz, f=None):
    k = (f or FH, sz)
    if k not in _fc: _fc[k] = ImageFont.truetype(k[0], sz)
    return _fc[k]
ease = lambda x, p=EASE['out']: bezier(p, max(0.0, min(1.0, x)))
LZ = json.load(open(o.lesson)); LJ = json.load(open(o.lines)); TXT = {l['id']: l['text'] for l in LJ['lines']}; DISP = LJ.get('display', {})

# ---------------- voice lines: wav + Rhubarb cues + word times (faster-whisper, refined on the audio energy onsets) ----------------
def pcm(p, sr=24000):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def refine(a, words, sr=24000):
    """Word starts after a pause are snapped to the measured speech onset (RMS 5 ms hop, >= 60 ms of silence before). In-run words keep whisper."""
    hop = sr // 200; env = np.sqrt(np.convolve(a.astype(np.float64) ** 2, np.ones(sr // 50) / (sr // 50), 'same'))[::hop]
    thr = max(float(env.max()) * 0.06, 1e-4); sp = env > thr
    on = [i * 0.005 for i in range(1, len(sp)) if sp[i] and not sp[max(0, i - 12):i].any()]
    out = []
    for k, w in enumerate(words):
        s, e = w['s'], w['e']; gap = k == 0 or s - words[k - 1]['e'] >= 0.06; rec = dict(w=w['w'], raw_s=s, raw_e=e, onset=None, checked=False)
        if gap:
            c = [t for t in on if abs(t - s) <= 0.15]
            if c: t = min(c, key=lambda t: abs(t - s)); rec.update(onset=round(t, 3), checked=True, d_raw=round(s - t, 3)); s = t
        if out and s < out[-1]['s'] + 0.05: s = out[-1]['s'] + 0.05
        rec.update(s=round(s, 3), e=round(max(e, s + 0.08), 3)); out.append(rec)
    for k in range(len(out) - 1): out[k]['e'] = round(min(out[k]['e'], out[k + 1]['s'] + 0.02), 3)
    return out
LINES = {}
for lid in TXT:
    a = pcm(f'{o.vo}/{lid}.wav'); cj = json.load(open(f'{o.vo}/{lid}.json')); wj = json.load(open(f'{o.vo}/{lid}.words.json'))
    LINES[lid] = dict(id=lid, text=TXT[lid], a=a, dur=len(a) / 24000, cues=cj['mouthCues'], gen=cj.get('generator'), words=refine(a, wj['words']), whisper=wj.get('whisper'))

# ---------------- shots ----------------
SHOTS = [dict(id='hook', clip='a01_ama_talk', start=0, lines=['v6_h', 'v6_w'], lead=0.40, gap=0.30, tail=0.40, screen='hook', cam='push'),
         dict(id='key', clip='a03_ama_explain', start=24, lines=['v6_k'], lead=0.12, tail=0.45, screen='correct', cam='punch'),
         dict(id='rule', clip='a02_ama_talk_smile', start=0, lines=['v6_y'], lead=0.15, tail=0.45, screen='rule', cam='push'),
         dict(id='ex', clip='a01_ama_talk', start=64, lines=['v6_x'], lead=0.15, tail=0.45, screen='examples', cam='push'),
         dict(id='quiz', clip='a03_ama_explain', start=70, lines=['v6_q'], lead=0.15, tail=0.25, screen='quiz', cam='push'),
         dict(id='count', clip='a04_ama_listen', start=0, lines=[], dur=3.0, screen='quiz', cam='hold'),
         dict(id='reveal', clip='a02_ama_talk_smile', start=56, lines=['v6_a'], lead=0.60, tail=0.40, screen='reveal', cam='push'),
         dict(id='end', clip='a01_ama_talk', end_at=0, lines=['v6_s'], lead=0.15, tail=1.9, screen='end', cam='loop')]
BANK = {c['id']: c for c in json.load(open(f'{o.lib}/bank.json'))['clips']}
t = 0.0; f0 = 0; LAT = []   # LAT: line placements {id, at}
for k, sh in enumerate(SHOTS):
    assert k == 0 or SHOTS[k - 1]['clip'] != sh['clip'], ('same clip twice in a row', sh['clip'])
    tt = f0 / FPS + sh.get('lead', 0); sh['line_at'] = {}
    for j, lid in enumerate(sh['lines']):
        sh['line_at'][lid] = tt; LAT.append(dict(id=lid, at=tt, shot=sh['id'])); tt += LINES[lid]['dur'] + (sh.get('gap', 0.3) if j < len(sh['lines']) - 1 else 0)
    dur = sh['dur'] if 'dur' in sh else tt + sh['tail'] - f0 / FPS
    if k == len(SHOTS) - 1: dur = max(dur, o.total - f0 / FPS)
    sh['f0'] = f0; sh['n'] = int(round(dur * FPS)); f0 += sh['n']
NF = f0; TOTAL = NF / FPS
print('shots', ' '.join(f"{s['id']}@{s['f0'] / FPS:.2f}" for s in SHOTS), f'total {TOTAL:.2f} s', flush=True)
def pingpong(start, n, lo, hi, d=1):
    out, p = [], start
    for _ in range(n):
        out.append(p)
        if not lo <= p + d <= hi: d = -d
        p += d
    return out
for sh in SHOTS:
    lo, hi = BANK[sh['clip']].get('usable_frames', [0, 120])
    if 'end_at' in sh: sh['frames'] = pingpong(sh['end_at'], sh['n'], lo, hi)[::-1]   # plays INTO frame end_at = the first frame of the video
    else: sh['frames'] = pingpong(max(lo, sh['start']), sh['n'], lo, hi)
assert SHOTS[-1]['frames'][-1] == SHOTS[0]['frames'][0] and SHOTS[-1]['clip'] == SHOTS[0]['clip'], 'loop: last frame must be the first frame'
WORDS = {}   # absolute word times, ids 'lid.k'
for la in LAT:
    for k, w in enumerate(LINES[la['id']]['words']): WORDS[f"{la['id']}.{k}"] = dict(line=la['id'], k=k, w=w['w'], s=round(la['at'] + w['s'], 3), e=round(la['at'] + w['e'], 3), raw_s=round(la['at'] + w['raw_s'], 3), onset=None if w['onset'] is None else round(la['at'] + w['onset'], 3), checked=w['checked'])
def wt(lid, k): return WORDS[f'{lid}.{k}']
ATL = {la['id']: la['at'] for la in LAT}
def line_end(lid): return ATL[lid] + LINES[lid]['words'][-1]['e']
SH = {s['id']: s for s in SHOTS}

# ---------------- camera ----------------
def cam_scale(sh, tl):   # tl = time in shot
    du = (sh['n'] - 1) / FPS; u = tl / max(du, 1e-6)
    if sh['cam'] == 'hold': return 1.0
    if sh['cam'] == 'loop': return 1.0 + V6['push'] * math.sin(math.pi * min(1.0, u))   # creeps in, settles back to 1.0 on the loop frame
    s = 1.0 + V6['push'] * ease(u, EASE['inout'])
    if sh['cam'] == 'punch':
        tp = wt('v6_k', 1)['s'] - sh['f0'] / FPS   # punch on "Excuse" (the key line)
        if tl >= tp: s = s + (V6['punch'] - s) * ease((tl - tp) / V6['punch_in'])
    return s
def world_maps(s):
    X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    wx = AX + (X - AX) / s; wy = AY + (Y - AY) / s
    my = np.where(wy < H0 + D, wy * (H0 / (H0 + D)), wy - D).astype(np.float32)
    return wx.astype(np.float32), my
def sharpen(img, s):
    if s <= 1.001: return img
    amt = min(0.9, (s - 1.0) * 11.0); b = cv2.GaussianBlur(img, (0, 0), 1.0)
    return cv2.addWeighted(img, 1 + amt, b, -amt, 0)
def to_screen(b, s):   # world bbox -> screen bbox
    x0, y0, x1, y1 = b; return [round(AX + (x0 - AX) * s), round(AY + (y0 - AY) * s), round(AX + (x1 - AX) * s), round(AY + (y1 - AY) * s)]

# ---------------- studio screen (world layer, rows 0..PH) ----------------
PH = 600
def panel_shape():
    m = Image.new('L', (W, PH), 0); d = ImageDraw.Draw(m); (tx0, tx1), (bx0, bx1), y1, r = V6['panel_top'], V6['panel_bot'], V6['panel_y1'], V6['radius']
    d.polygon([(tx0, 0), (tx1, 0), (bx1, y1 - r), (bx0, y1 - r)], fill=255); d.rounded_rectangle([bx0, y1 - 3 * r, bx1, y1], r, fill=255)
    return np.asarray(m).astype(np.float32) / 255
PSHAPE = panel_shape()
def text_block(d, x, y, segs, sz, f=None):
    """segs: [(text, rgb)] drawn on one line from (x, y) (anchor left-ascender). Returns bbox."""
    fo = font(sz, f); cx = x; x1 = x
    for s_, col in segs:
        d.text((cx, y), s_, font=fo, fill=col + (255,), anchor='la'); cx += fo.getlength(s_)
    bb = d.textbbox((x, y), ''.join(s for s, _ in segs), font=fo, anchor='la'); return [bb[0], bb[1], bb[2], bb[3]]
def wrap_words(ws, sz, maxw, f=None, extra=0):
    fo = font(sz, f); lines = [[]]
    for w in ws:
        cand = lines[-1] + [w]
        if lines[-1] and fo.getlength(' '.join(x[0] for x in cand)) + extra * (len(cand) - 1) > maxw: lines.append([w])
        else: lines[-1] = cand
    return lines
def rich(d, x, y, ws, sz, maxw, lh=1.16, f=None, hl=None):
    """ws: [(word, rgb)] wrapped to maxw. hl: {index: rgb} -> rounded highlight behind that word. Returns bbox of the block."""
    fo = font(sz, f); L = wrap_words([(w, c, i) for i, (w, c) in enumerate(ws)], sz, maxw, f); bb = [1e9, 1e9, -1e9, -1e9]; yy = y
    for ln in L:
        cx = x
        for j, (w, c, i) in enumerate(ln):
            tw = fo.getlength(w)
            if hl and i in hl:
                cx += 12; b = d.textbbox((cx, yy), w, font=fo, anchor='la'); d.rounded_rectangle([b[0] - 12, b[1] - 8, b[2] + 12, b[3] + 10], 14, fill=hl[i] + (255,))
            d.text((cx, yy), w, font=fo, fill=c + (255,), anchor='la'); b = d.textbbox((cx, yy), w, font=fo, anchor='la')
            bb = [min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3])]; cx += tw + fo.getlength(' ') + (12 if hl and i in hl else 0)
        yy += round(sz * lh)
    return bb, len(L)
def pill(d, x, y, txt, bg, fg=(255, 255, 255), sz=48):
    fo = font(sz); b = d.textbbox((x + 20, y + 8), txt, font=fo, anchor='la'); d.rounded_rectangle([x, y, b[2] + 20, b[3] + 12], 16, fill=bg + (255,))
    d.text((x + 20, y + 8), txt, font=fo, fill=fg + (255,), anchor='la'); return [b[0], b[1], b[2], b[3]]
WHITE, MINT, YEL, GRN, RED, INK = (255, 255, 255), C['mint'], C['yellow'], C['green'], C['red'], C['navy']
CX0, CY0, CX1, CY1 = V6['content']; CW_ = CX1 - CX0
LOGO = Image.open(o.logo).convert('RGBA'); LOGO = LOGO.resize((round(LOGO.width * 70 / LOGO.height), 70), Image.LANCZOS)
QUIZ_W = 640
def words_of(s, base=WHITE, colour=None): return [(w, (colour or {}).get(i, base)) for i, w in enumerate(s.split())]
def st_hook(d, tl, T):
    els = [('hook.pill', 'NEVER SAY', pill(d, CX0, CY0 + 8, 'NEVER SAY', RED), 48)]
    q = '“The gate is change?”'; sz = 80
    while font(sz).getlength(q) > CW_ and sz > 56: sz -= 2
    bb = text_block(d, CX0, CY0 + 104, [(q, WHITE)], sz); els.append(('hook.quote', q, bb, sz))
    ts = line_end('v6_w') - 0.05; p = ease((T - ts) / 0.35)
    if p > 0: ym = (bb[1] + bb[3]) // 2 + 4; d.line([(bb[0] - 6, ym), (bb[0] - 6 + p * (bb[2] - bb[0] + 12), ym)], fill=RED + (255,), width=9)
    return els
def st_correct(d, tl, T):
    els = [('key.pill', 'SAY THIS', pill(d, CX0, CY0 + 8, 'SAY THIS', GRN, INK), 48)]
    bb, n = rich(d, CX0, CY0 + 96, words_of('Excuse me, has the gate changed?', WHITE, {2: YEL, 5: YEL}), 66, CW_)
    els.append(('key.text', 'Excuse me, has the gate changed?', bb, 66)); return els
def st_rule(d, tl, T):
    els = [('rule.label', 'NEW CHANGE? ASK:', text_block(d, CX0, CY0 + 14, [('NEW CHANGE? ASK:', MINT)], 48, FBd), 48)]
    segs = [('HAS', YEL), (' + it + ', WHITE), ('CHANGED?', GRN)]; sz = 96
    while font(sz).getlength(''.join(s for s, _ in segs)) > CW_ and sz > 60: sz -= 2
    els.append(('rule.formula', 'HAS + it + CHANGED?', text_block(d, CX0, CY0 + 104, segs, sz), sz)); return els
def st_examples(d, tl, T, lay):
    els = [('ex.label', 'SAME PATTERN:', text_block(d, CX0, CY0 + 6, [('SAME PATTERN:', MINT)], 48, FBd), 48)]
    for j, (txt, k) in enumerate((('Has the time changed?', 0), ('Has the flight moved?', 4))):
        ta = wt('v6_x', k)['s'] - 0.08; a = ease((T - ta) / 0.25)
        if a <= 0: continue
        L = Image.new('RGBA', (W, PH), (0, 0, 0, 0)); dd = ImageDraw.Draw(L)
        bb = text_block(dd, CX0, CY0 + 74 + j * 84 + round((1 - a) * 24), [('Has', YEL), (txt[3:], WHITE)], 66)
        lay.append((L, a)); els.append((f'ex.row{j}', txt, bb, 66, a))
    return els
def st_quiz(d, tl, T):
    els = [('quiz.pill', 'QUIZ', pill(d, CX0, CY0 + 8, 'QUIZ', YEL, INK), 48)]
    bb, n = rich(d, CX0, CY0 + 96, words_of('Excuse me, ___ the gate changed?'), 66, QUIZ_W); els.append(('quiz.q', 'Excuse me, ___ the gate changed?', bb, 66))
    c0 = SH['count']['f0'] / FPS
    if c0 - 0.2 <= T < c0 + 3.0:
        cx, cy, r = 822, 368, 74; rem = max(0.0, 1 - (T - c0) / 3.0) if T >= c0 else 1.0
        d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=MINT + (70,), width=12)
        if rem > 0: d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * rem, fill=YEL + (255,), width=12)
        num = str(3 - int(max(0.0, T - c0))) if T >= c0 else '3'; fo = font(104)
        d.text((cx, cy + 4), num, font=fo, fill=WHITE + (255,), anchor='mm'); b = d.textbbox((cx, cy + 4), num, font=fo, anchor='mm')
        els.append((f'quiz.count{num}', num, [b[0], b[1], b[2], b[3]], 104))
    return els
def st_reveal(d, tl, T):
    els = [('ans.pill', 'ANSWER', pill(d, CX0, CY0 + 8, 'ANSWER', GRN, INK), 48)]
    bb, n = rich(d, CX0, CY0 + 96, words_of('Excuse me, has the gate changed?', WHITE, {2: INK}), 66, CW_, hl={2: GRN})
    els.append(('ans.text', 'Excuse me, has the gate changed?', bb, 66)); return els
def st_end(d, tl, T, img):
    img.alpha_composite(LOGO, (CX0, CY0 + 10)); els = [('end.logo', '', [CX0, CY0 + 10, CX0 + LOGO.width, CY0 + 80], 0)]
    els.append(('end.cta', 'Roleplay this free', text_block(d, CX0, CY0 + 102, [('Roleplay this free', WHITE)], 68), 68))
    link = (LZ.get('cta') or {}).get('link', 'https://lexkite.com/app/#/roleplay').replace('https://', '')
    els.append(('end.link', link, text_block(d, CX0, CY0 + 190, [(link, YEL)], 50, FBd), 50)); return els
# screen state windows: on at the shot start (end card: at its line), off at the next state's start; out-ramp 0.15 s, in-ramp 0.28 s (rise 24 px)
ORDER = [('hook', SH['hook']['f0'] / FPS), ('correct', SH['key']['f0'] / FPS), ('rule', SH['rule']['f0'] / FPS), ('examples', SH['ex']['f0'] / FPS),
         ('quiz', SH['quiz']['f0'] / FPS), ('reveal', SH['reveal']['f0'] / FPS), ('end', ATL['v6_s'] - 0.1)]
WIN = {}
for j, (k, on) in enumerate(ORDER): WIN[k] = (on, ORDER[j + 1][1] if j + 1 < len(ORDER) else TOTAL - 0.40)
DRAW = dict(hook=st_hook, correct=st_correct, rule=st_rule, examples=st_examples, quiz=st_quiz, reveal=st_reveal, end=st_end)
def screen_layer(T):
    img = Image.new('RGBA', (W, PH), (0, 0, 0, 0)); els = []
    for k, (on, off) in WIN.items():
        if not (on <= T < off): continue
        a = min(ease((T - on) / 0.28), ease((off - T) / 0.15, EASE['inout']) if off - T < 0.15 else 1.0)
        if k == 'hook' and T < 0.5 / FPS: a = 0.0   # frame 0 = clean loop frame
        if a <= 0.001: continue
        L = Image.new('RGBA', (W, PH), (0, 0, 0, 0)); d = ImageDraw.Draw(L); lay = []
        rise = round((1 - a) * 24) if T - on < 0.28 else 0
        ee = st_examples(d, T - on, T, lay) if k == 'examples' else st_end(d, T - on, T, L) if k == 'end' else DRAW[k](d, T - on, T)
        for L2, a2 in lay:
            r2 = np.asarray(L2).copy(); r2[..., 3] = (r2[..., 3].astype(np.float32) * a2).astype(np.uint8); L.alpha_composite(Image.fromarray(r2))
        if rise: L = L.transform(L.size, Image.AFFINE, (1, 0, 0, 0, 1, -rise), resample=Image.BILINEAR)
        arr = np.asarray(L).copy(); arr[..., 3] = (arr[..., 3].astype(np.float32) * a).astype(np.uint8); img.alpha_composite(Image.fromarray(arr))
        for e in ee:
            bb = list(e[2]); bb[1] += rise; bb[3] += rise; els.append(dict(name=e[0], text=e[1], bbox=bb, px=e[3], alpha=round(a * (e[4] if len(e) > 4 else 1.0), 3), group='screen'))
    return img, els

# ---------------- karaoke captions (screen space) ----------------
def pages_of(lid):
    ws = [(f'{lid}.{k}', DISP.get(w['w'].lower(), w['w'])) for k, w in enumerate(LINES[lid]['words'])]
    def split(seq):
        if len(seq) <= V6['cap_words']: return [seq]
        cut = [i + 1 for i in range(len(seq) - 1) if seq[i][1][-1] in ',.?!:;' and max(i + 1, len(seq) - i - 1) <= V6['cap_words']]
        mid = len(seq) / 2; i = min(cut, key=lambda c: abs(c - mid) - (3 if seq[c - 1][1][-1] in '.?!' else 0)) if cut else int(mid)   # sentence ends first
        return split(seq[:i]) + split(seq[i:])
    return split(ws)
GAPX = 12   # extra word gap: the dark stroke eats into the space between words
class Page:
    def __init__(s, words):
        s.words = words; sz = V6['cap_size']; maxw = V6['cap_x'][1] - V6['cap_x'][0]
        while True:
            L = wrap_words([(w[1], w[0]) for w in words], sz, maxw, extra=GAPX)
            if len(L) <= 2 or sz <= V6['cap_min']: break
            sz -= 2
        assert len(L) <= 2, ('caption page needs > 2 lines', words)
        s.sz = sz; fo = font(sz); lh = V6['cap_line'] * sz / V6['cap_size']; top = V6['cap_bottom'] - len(L) * lh; pad = 24
        s.box = [V6['cap_x'][0] - pad, int(top - pad), V6['cap_x'][1] + pad, int(V6['cap_bottom'] + pad)]; bw, bh = s.box[2] - s.box[0], s.box[3] - s.box[1]
        fill = Image.new('L', (bw, bh), 0); strk = Image.new('L', (bw, bh), 0); df, ds = ImageDraw.Draw(fill), ImageDraw.Draw(strk)
        s.rect = {}; cxm = (V6['cap_x'][0] + V6['cap_x'][1]) / 2; s.lines = len(L)
        for j, ln in enumerate(L):
            txt = ' '.join(w[0] for w in ln); x = cxm - (fo.getlength(txt) + GAPX * (len(ln) - 1)) / 2 - s.box[0]; y = top + j * lh - s.box[1]
            for wtxt, wid in ln:
                df.text((x, y), wtxt, font=fo, fill=255, anchor='la'); ds.text((x, y), wtxt, font=fo, fill=255, anchor='la', stroke_width=V6['cap_stroke'], stroke_fill=255)
                b = df.textbbox((x, y), wtxt, font=fo, anchor='la'); s.rect[wid] = (int(b[0]), int(b[1]) - 6, int(math.ceil(b[2])), int(b[3]) + 8, wtxt); x += fo.getlength(wtxt + ' ') + GAPX
        s.fill = np.asarray(fill).astype(np.float32) / 255; s.strk = np.asarray(strk).astype(np.float32) / 255
        sh = cv2.GaussianBlur(np.roll(s.strk, 6, axis=0), (0, 0), 7); s.shadow = sh * 0.55
        s.t0 = WORDS[words[0][0]]['s'] - 0.12; s.t1 = WORDS[words[-1][0]]['e'] + 0.30
    def draw(s, F, tm):
        x0, y0, x1, y1 = s.box; reg = F[y0:y1, x0:x1].astype(np.float32)
        reg *= (1 - s.shadow[..., None]); ink = np.array([12, 32, 34], np.float32)[::-1]
        reg = reg * (1 - s.strk[..., None]) + ink * s.strk[..., None]
        col = np.ones(reg.shape, np.float32) * 255; al = s.fill * V6['upcoming']; wipe = {}
        acc = np.array(V6['accent'][::-1], np.float32)
        for wid, (a0, b0, a1, b1, _) in s.rect.items():
            w = WORDS[wid]; p = (tm - w['s']) / max(1e-3, w['e'] - w['s']); p = max(0.0, min(1.0, p)); wipe[wid] = round(p, 3)
            if p >= 1.0: al[b0:b1, a0:a1] = s.fill[b0:b1, a0:a1]
            elif p > 0:
                xc = a0 + int(round(p * (a1 - a0))); al[b0:b1, a0:xc] = s.fill[b0:b1, a0:xc]; col[b0:b1, a0:xc] = acc
        reg = reg * (1 - al[..., None]) + col * al[..., None]; F[y0:y1, x0:x1] = np.clip(reg, 0, 255).astype(np.uint8); return wipe
PAGES = []
for la in LAT:
    for pw in pages_of(la['id']): PAGES.append(Page(pw))
for a, b in zip(PAGES, PAGES[1:]):   # never hide a page before its last word finished its wipe
    a.t1 = max(min(a.t1, b.t0), WORDS[a.words[-1][0]]['e'] + 1.0 / FPS); b.t0 = max(b.t0, a.t1)
CAP_LOG = {f'p{j}': dict(words=[w[0] for w in p.words], text=' '.join(w[1] for w in p.words), lines=p.lines, size=p.sz, box=p.box) for j, p in enumerate(PAGES)}

# ---------------- screen-space overlays: lower third, quiz chips, logo bug ----------------
def rgba_np(im): a = np.asarray(im).astype(np.float32); return a[..., :3][..., ::-1].copy(), a[..., 3] / 255
def over(F, rgb, al, x, y, mult=1.0):
    h, w = al.shape; X0, Y0 = max(0, x), max(0, y); X1, Y1 = min(W, x + w), min(H, y + h)
    if X1 <= X0 or Y1 <= Y0 or mult <= 0: return
    a = al[Y0 - y:Y1 - y, X0 - x:X1 - x, None] * mult; r = F[Y0:Y1, X0:X1].astype(np.float32)
    F[Y0:Y1, X0:X1] = np.clip(r * (1 - a) + rgb[Y0 - y:Y1 - y, X0 - x:X1 - x] * a, 0, 255).astype(np.uint8)
def make_lt():
    f1, f2 = font(54), font(48, FBd); t1, t2 = 'Ama', '·  Lexkite English'; w = int(28 + f1.getlength(t1) + 22 + f2.getlength(t2) + 36); h = 92
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.rounded_rectangle([0, 0, w - 1, h - 1], 18, fill=C['navy2'] + (240,))
    d.rectangle([0, 0, 9, h - 1], fill=YEL + (255,)); d.text((28, h // 2), t1, font=f1, fill=WHITE + (255,), anchor='lm')
    d.text((28 + f1.getlength(t1) + 22, h // 2 + 2), t2, font=f2, fill=MINT + (255,), anchor='lm'); return im, [t1 + ' ' + t2, w, h, 54]
LT_IM, LT_INFO = make_lt(); LT_RGB, LT_A = rgba_np(LT_IM)
def make_chip(lbl, word, bg):
    f1, f2 = font(48), font(64); w = int(36 + f1.getlength(lbl) + 24 + f2.getlength(word) + 40); h = 104
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.rounded_rectangle([0, 0, w - 1, h - 1], 26, fill=bg + (236,), outline=MINT + (120,), width=3)
    d.text((32, h // 2), lbl, font=f1, fill=YEL + (255,), anchor='lm'); d.text((32 + f1.getlength(lbl) + 24, h // 2 + 2), word, font=f2, fill=WHITE + (255,), anchor='lm'); return im
CHIPS = {k: rgba_np(make_chip(l, wd, bg)) for k, (l, wd, bg) in dict(a=('A', 'has', C['navy']), b=('B', 'is', C['navy']), a_ok=('A', 'has', C['green'])).items()}
BUG = Image.open(o.bug).convert('RGBA').resize((V6['bug'][2], V6['bug'][2]), Image.LANCZOS)
bm = Image.new('L', BUG.size, 0); ImageDraw.Draw(bm).rounded_rectangle([0, 0, BUG.width - 1, BUG.height - 1], 14, fill=255)
BUG.putalpha(Image.fromarray((np.asarray(BUG)[..., 3].astype(np.float32) * np.asarray(bm) / 255).astype(np.uint8))); BUG_RGB, BUG_A = rgba_np(BUG)

# ---------------- frame loop ----------------
os.makedirs(o.out + '.samples', exist_ok=True)
PREV = {min(NF - 1, int(round(float(x) * FPS))) for x in o.preview.split(',')} if o.preview else None
if PREV is not None:
    os.makedirs(o.out + '.preview', exist_ok=True)
    class _N:
        stdin = type('S', (), dict(write=lambda *a: None, close=lambda *a: None))()
        def wait(self): return 0
    enc = _N()
else:
    enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-b:v', f'{o.kbps}k', '-maxrate', f'{int(o.kbps * 1.35)}k', '-bufsize', f'{o.kbps * 2}k',
                        '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48', '-movflags', '+faststart', o.out + '.video.mp4'], stdin=subprocess.PIPE)
FRAMES = []; SHARP = []; PANEL = []; cur_clip = None; FR = None; MO = {}
ink_grad = np.zeros((PH, W, 3), np.float32)
for y in range(PH): ink_grad[y] = np.array(V6['ink_top'], np.float32)[::-1] + (np.array(V6['ink'], np.float32)[::-1] - np.array(V6['ink_top'], np.float32)[::-1]) * min(1, y / V6['panel_y1'])
sheen = np.zeros((PH, W), np.float32)
for y in range(PH): sheen[y] = np.clip(1 - np.abs(np.arange(W) - (760 - 0.9 * y)) / 220, 0, 1) * 0.06   # one soft diagonal reflection
FACE = (330, 420, 710, 840)   # bank mouth.json face_box (MCU clips), source coords
for sh in SHOTS:
    if sh['clip'] != cur_clip:
        cap = cv2.VideoCapture(f'{o.lib}/tools/dl24/{sh["clip"]}.mp4'); FR = []
        while True:
            ok, fr_ = cap.read()
            if not ok: break
            FR.append(fr_)
        cur_clip = sh['clip']; assert FR and FR[0].shape[:2] == (H, W), ('bank clip must be native 1080x1920', sh['clip'])
    who = BANK[sh['clip']].get('mouth_sets', {})
    for w_ in who:
        if (sh['clip'], w_) not in MO: MO[(sh['clip'], w_)] = LS.Mouth(f'{o.lib}/tools/meta/{sh["clip"]}/{w_}')
    spk_lines = [dict(cues=LINES[l]['cues'], at=sh['line_at'][l]) for l in sh['lines']]
    for j in range(sh['n']):
        fi = sh['f0'] + j; T = fi / FPS; tm = T + 0.5 / FPS; src = sh['frames'][j]
        if PREV is not None and fi not in PREV: continue
        F = FR[min(src, len(FR) - 1)].copy(); vis = {}
        for w_ in who:
            mo = MO[(sh['clip'], w_)]; v = LS.viseme_at(spk_lines if w_ == 'ama' else [], T); F = mo.apply(F, src, mo.spr[v]); vis[w_] = v
        s = cam_scale(sh, T - sh['f0'] / FPS); mx, my = world_maps(s)
        out = cv2.remap(F, mx, my, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE); out = sharpen(out, s)
        # --- glass monitor (world -> screen with the same camera) ---
        Mw = np.array([[s, 0, (1 - s) * AX], [0, s, (1 - s) * AY]], np.float32)
        pa = cv2.warpAffine(PSHAPE, Mw, (W, PH), flags=cv2.INTER_LINEAR)
        top = out[:PH].astype(np.float32); blur = cv2.GaussianBlur(cv2.resize(top, (W // 4, PH // 4), interpolation=cv2.INTER_AREA), (0, 0), 5)
        blur = cv2.resize(blur, (W, PH), interpolation=cv2.INTER_LINEAR)
        glass = blur * (1 - V6['glass_mix']) + ink_grad * V6['glass_mix'] + 255 * sheen[..., None]
        sh_m = cv2.GaussianBlur(pa, (0, 0), 16); shadow = np.clip(sh_m * 1.6 - pa, 0, 1) * 0.30          # soft contact shadow on the wall around the screen
        bot = int(round(AY + (V6['panel_y1'] - AY) * s)); spill = np.zeros((PH, W), np.float32)
        if 0 < bot < PH: yy = np.arange(PH)[:, None]; spill = np.clip(1 - np.abs(yy - bot - 22) / 46, 0, 1) * 0.10 * (1 - pa) * (sh_m > 0.02)
        top = top * (1 - shadow[..., None]) + np.array(V6['glow'][::-1], np.float32) * spill[..., None]
        edge = np.clip(pa - cv2.erode(pa, np.ones((5, 5), np.uint8)), 0, 1)                                    # 2-3 px bright bezel line
        top = top * (1 - pa[..., None]) + glass * pa[..., None]; top = top * (1 - edge[..., None] * 0.55) + np.array(V6['glow'][::-1], np.float32) * edge[..., None] * 0.55
        lay, els = screen_layer(T)
        la_ = np.asarray(lay).astype(np.float32); la_[..., :3] *= la_[..., 3:] / 255                     # premultiplied -> no dark fringes when warped
        lw = cv2.warpAffine(la_, Mw, (W, PH), flags=cv2.INTER_LANCZOS4); al = np.clip(lw[..., 3] / 255, 0, 1)[..., None] * pa[..., None]
        top = top * (1 - al) + np.clip(lw[..., :3][..., ::-1], 0, 255) * pa[..., None]; out[:PH] = np.clip(top, 0, 255).astype(np.uint8)
        for e in els: e['bbox'] = to_screen(e['bbox'], s); e['px'] = round(e['px'] * s, 1)
        # --- screen-space overlays ---
        lt_a = 0.0
        if T < 3.0:
            ui = ease(T / 0.32) if T > 0.5 / FPS else 0.0; uo = ease((3.0 - T) / 0.25, EASE['inout']) if T > 2.75 else 1.0; lt_a = min(ui, uo)
            if lt_a > 0:   # fade + 16 px rise (stays inside the safe area while it animates)
                x = V6['cap_x'][0]; y = V6['lt_y'] + round((1 - lt_a) * 16); over(out, LT_RGB, LT_A, x, y, lt_a)
                els.append(dict(name='lt', text=LT_INFO[0], bbox=[x, y, x + LT_INFO[1], y + LT_INFO[2]], px=LT_INFO[3], alpha=round(lt_a, 3), group='overlay'))
        c0, r0 = SH['count']['f0'] / FPS, SH['reveal']['f0'] / FPS
        if c0 <= T < r0 + 0.6:
            a = ease((T - c0) / 0.25) * (ease((r0 + 0.6 - T) / 0.15) if T > r0 + 0.45 else 1.0); ka = CHIPS['a_ok'] if T >= r0 else CHIPS['a']; kb = CHIPS['b']
            wa, wb = ka[1].shape[1], kb[1].shape[1]; gap = 40; x0 = round((V6['cap_x'][0] + V6['cap_x'][1]) / 2 - (wa + wb + gap) / 2); y0 = 1360
            over(out, ka[0], ka[1], x0, y0, a); over(out, kb[0], kb[1], x0 + wa + gap, y0, a * (0.45 if T >= r0 else 1.0))
            els += [dict(name='chip.a', text='A has', bbox=[x0, y0, x0 + wa, y0 + 104], px=64, alpha=round(a, 3), group='overlay'), dict(name='chip.b', text='B is', bbox=[x0 + wa + gap, y0, x0 + wa + gap + wb, y0 + 104], px=64, alpha=round(a * (0.45 if T >= r0 else 1.0), 3), group='overlay')]
        over(out, BUG_RGB, BUG_A, V6['bug'][0], V6['bug'][1], 0.92)
        wipe = {}
        for pi, p in enumerate(PAGES):
            if p.t0 <= T < p.t1:
                wipe.update(p.draw(out, tm)); els.append(dict(name=f'cap.p{pi}', text=CAP_LOG[f'p{pi}']['text'], bbox=p.box, px=p.sz, alpha=1.0, group='caption'))
        if PREV is not None: cv2.imwrite(f'{o.out}.preview/t{T:05.2f}.png', out); continue
        enc.stdin.write(out.tobytes())
        rec = dict(t=round(T, 4), clip=sh['clip'], shot=sh['id'], src=src, s=round(s, 4), vis=vis, els=[[e['name'], e['text'], *e['bbox'], e['alpha'], e['px'], e['group']] for e in els], wipe=wipe, lt=round(lt_a, 3))
        FRAMES.append(rec)
        if fi in (0, NF - 1): cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
        if fi % 24 == 12 and sh.get('angle') != 'two':
            x0, y0, x1, y1 = FACE; nat = cv2.cvtColor(F[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY); r = to_screen([x0, y0 + D, x1, y1 + D], s)
            scr = cv2.cvtColor(out[r[1]:r[3], r[0]:r[2]], cv2.COLOR_BGR2GRAY)
            SHARP.append(dict(frame=fi, s=round(s, 4), rect=r, var_native=round(float(cv2.Laplacian(nat, cv2.CV_64F).var()), 2), var_render=round(float(cv2.Laplacian(scr, cv2.CV_64F).var()), 2)))
            cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
        if fi % 12 == 6:
            txt = (al[..., 0] > 0.03).astype(np.uint8); txt = cv2.dilate(txt, np.ones((25, 25), np.uint8)); m_ = (pa > 0.98) & (txt == 0)
            m_[:V6['content'][1]] = False
            if m_.any(): PANEL.append(dict(frame=fi, luma=round(float(np.median(cv2.cvtColor(out[:PH], cv2.COLOR_BGR2GRAY)[m_])), 1)))
        if fi % 48 == 0: print(f'frame {fi}/{NF} {sh["id"]} s={s:.3f}', flush=True)
enc.stdin.close(); assert enc.wait() == 0, 'ffmpeg encode failed'
if PREV is not None: print('preview written', o.out + '.preview'); sys.exit(0)

# ---------------- audio: voices + studio bed (-40 dB) + ticks + answer ding; tone -60 dB at 0 s ----------------
SR = 24000; mix = np.zeros(int(TOTAL * SR) + SR, np.float32)
def put(a, t0, g=1.0): i = int(round(t0 * SR)); n = min(len(a), len(mix) - i); mix[i:i + n] += a[:n] * g if n > 0 else 0
for la in LAT: put(LINES[la['id']]['a'], la['at'])
amb = f'{o.lib}/tools/amb_studio.wav'
if os.path.exists(amb):
    b = pcm(amb); b = np.tile(b, int(len(mix) / len(b)) + 1)[:len(mix)]; rms = float(np.sqrt(np.mean(b ** 2))) or 1; mix += b * (10 ** (-40 / 20) / rms)
tick = np.sin(2 * np.pi * 1320 * np.arange(int(0.05 * SR)) / SR).astype(np.float32) * np.exp(-np.arange(int(0.05 * SR)) / (0.012 * SR)).astype(np.float32)
for k in range(3): put(tick, SH['count']['f0'] / FPS + k, 0.18)
ding = f'{o.lib}/tools/foley/ding.wav'
if os.path.exists(ding): put(pcm(ding), SH['reveal']['f0'] / FPS, 0.25)
put((np.sin(2 * np.pi * 1000 * np.arange(int(0.1 * SR)) / SR) * 10 ** (-60 / 20)).astype(np.float32), 0.0)
mix = mix[:int(round(TOTAL * SR))]
import wave
with wave.open(o.out + '.mix.wav', 'wb') as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.out + '.video.mp4', '-i', o.out + '.mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0,aresample=48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', o.out], check=True)
os.remove(o.out + '.video.mp4')

# ---------------- timeline for qc_v6.py ----------------
link = (LZ.get('cta') or {}).get('link')
json.dump(dict(style='v6', fps=FPS, size=[W, H], total=TOTAL, n=NF, safe=SAFE, v6={k: v for k, v in V6.items()},
               lesson=dict(id=LZ.get('id'), hook=LZ.get('hook'), hook_text=TXT['v6_h'], wrong=LZ['wrong_line'], right=LZ['key_line'], reject=LZ.get('reject')),
               hook_full='NEVER SAY “The gate is change?”', hook_blocks=['hook.pill', 'hook.quote'], cta=dict(link=link, text=(LZ.get('cta') or {}).get('text')),
               shots=[dict(id=s['id'], clip=s['clip'], f0=s['f0'], n=s['n'], cam=s['cam'], frames=[s['frames'][0], s['frames'][-1]]) for s in SHOTS],
               lines={la['id']: dict(at=round(la['at'], 3), dur=round(LINES[la['id']]['dur'], 3), gen=LINES[la['id']]['gen'], cues=len(LINES[la['id']]['cues']), text=TXT[la['id']], whisper=LINES[la['id']]['whisper']) for la in LAT},
               words=WORDS, captions=CAP_LOG, sharp=SHARP, panel=PANEL, scene_bank='anchor', frames=FRAMES), open(o.out + '.timeline.json', 'w'))
print(f'done {o.out}: {TOTAL:.2f} s, {NF} frames, shots ' + ' '.join(f"{s['id']}:{s['clip']}:{s['n']}" for s in SHOTS))
