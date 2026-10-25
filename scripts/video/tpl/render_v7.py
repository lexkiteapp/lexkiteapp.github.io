#!/usr/bin/env python3
"""Pilot v7 "news + scene" (docs/VIDEO-TEMPLATES.md §12): classic TV grammar on NATIVE bank footage (every person was generated inside
its own set by Kling: no cut-out, no compositing of a person, 0 credits here).
  anchor two-shot (studio monitor: NEVER SAY ...) -> CUT to the airport bank: traveller Ama says the wrong line (X), agent Mei reacts,
  Ama says the right line (check, punch-in), Mei answers, Ama's relieved reaction -> anchor MCU rule (punch-in) -> two-shot: formula + 2 examples
  on the monitor -> MCU quiz -> two-shot countdown 3-2-1 on the monitor -> MCU answer (punch-in) -> two-shot end card, loop-clean.

  python3 scripts/video/tpl/render_v7.py --lesson L.json --lines lines.json --vo VO/vis3 --foot footage --fonts brand/social/src/fonts --out v7.mp4

Framing: every frame = one bank frame under a UNIFORM similarity transform (scale = cover-scale b * camera s >= 1, the visible source window
always inside the clip: no stretch, no padding, no edge replicate). The studio monitor is a world-space object of the anchor set (bezel,
keystone, glass reflection, wall glow + contact shadow) under the same camera. Karaoke captions sit in clear zones: over the desk on anchor
shots (2 lines two-shot, 1 line MCU), lower third over a soft dark gradient on scene shots; lines.json zones = protected face/torso/props.
Writes <out>, <out>.timeline.json (qc_v7.py), <out>.samples/, <out>.zones/ (debug frames with the protected zones drawn)."""
import os, sys, json, math, argparse, subprocess, wave
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); from tokens import SAFE, C, bezier, EASE
sys.path.insert(0, f'{ROOT}/scripts/cine'); import lipsync as LS

ap = argparse.ArgumentParser()
for a in ('lesson', 'lines', 'vo', 'foot', 'fonts', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--logo', default=f'{ROOT}/brand/social/logo/lexkite-logo-horizontal-on-dark.png')
ap.add_argument('--bug', default=f'{ROOT}/brand/social/logo/lexkite-app-icon.png')
ap.add_argument('--kbps', type=int, default=8800)
ap.add_argument('--debug-at', default='0,1.5,5,10,16,24,27,30', help='seconds: also write <out>.zones/*.png with protected zones + caption boxes drawn')
o = ap.parse_args()
W, H, FPS = 1080, 1920, 24
V7 = dict(push=dict(two=0.04, mcu=0.03, scene=0.035), punch=1.06, punch_in=0.22,
          cap=dict(two=dict(sz=70, lines=2, bottom=1494, words=7), mcu=dict(sz=66, lines=1, bottom=1495, words=5), scene=dict(sz=72, lines=2, bottom=1490, words=7)),
          cap_min=64, stroke=10, ss=2, upcoming=0.62, accent=C['yellow'], acc_line={'v7_w': C['red'], 'v7_k': C['green']},
          quad=[(122, 268), (958, 268), (972, 676), (108, 676)], bezel=15, canvas=(840, 400), region=(150, 790),
          ink_top=(9, 36, 38), ink=(15, 58, 60), bug=(964, 258, 60), badge=(800, 520, 84), grad=(1130, 1500, 0.58, 0.68))
FH = f"{o.fonts}/BeVietnamPro-ExtraBold.ttf"; FBd = f"{o.fonts}/BeVietnamPro-Bold.ttf"
_fc = {}
def font(sz, f=None):
    k = (f or FH, int(round(sz)))
    if k not in _fc: _fc[k] = ImageFont.truetype(k[0], k[1])
    return _fc[k]
ease = lambda x, p=EASE['out']: bezier(p, max(0.0, min(1.0, x)))
LZ = json.load(open(o.lesson)); LJ = json.load(open(o.lines)); TXT = {l['id']: l['text'] for l in LJ['lines']}; WHO = {l['id']: l['who'] for l in LJ['lines']}
DISP = LJ.get('display', {}); ZONES = LJ['zones']

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

# ---------------- shots (bank = anchor | airport; kind -> caption mode + protected zones) ----------------
TWO_A, MCU_A = (290, 1318), (520, 1440)   # camera anchors: desk line stays put while pushing in -> caption zone never shrinks
SHOTS = [dict(id='hook', bank='anchor', clip='t01_two_ama_talks', kind='two', start=0, lines=['v7_h'], lead=0.30, tail=0.45, min=1.9, screen='hook', cam='push', A=TWO_A),
         dict(id='est', bank='airport', clip='b01_master_talk', kind='master', start=10, lines=[], dur=0.85, cam='push', A=(620, 760)),
         dict(id='wrong', bank='airport', clip='a02_ots_ama_talk', kind='ots_ama', start=6, lines=['v7_w'], lead=0.12, tail=0.80, cam='push', A=(345, 800), mark='x'),
         dict(id='sorry', bank='airport', clip='a03_ots_mei_talk_b', kind='ots_mei', start=20, lines=['v7_m1'], lead=0.10, tail=0.45, cam='push', A=(655, 480)),
         dict(id='right', bank='airport', clip='a04_ots_ama_talk_b', kind='ots_ama', start=4, lines=['v7_k'], lead=0.12, tail=0.80, cam='punch', punch=('v7_k', 2), A=(345, 800), mark='ok'),
         dict(id='yes', bank='airport', clip='a01_ots_mei_talk', kind='ots_mei', start=40, lines=['v7_m2'], lead=0.08, tail=0.35, cam='push', A=(655, 480)),
         dict(id='relief', bank='airport', clip='a06_ama_react', kind='ots_ama', start=68, lines=[], dur=1.0, cam='push', raw=True, A=(345, 800)),
         dict(id='rule', bank='anchor', clip='a01_ama_talk', kind='mcu', start=0, lines=['v7_y'], lead=0.12, tail=0.40, cam='punch', punch=('v7_y', 5), A=MCU_A),
         dict(id='ex', bank='anchor', clip='t01_two_ama_talks', kind='two', start=40, lines=['v7_x'], lead=0.35, tail=0.60, screen='ex', cam='push', A=TWO_A),
         dict(id='quiz', bank='anchor', clip='a03_ama_explain', kind='mcu', start=30, lines=['v7_q'], lead=0.12, tail=0.20, cam='punch', punch=('v7_q', 0), A=MCU_A),
         dict(id='count', bank='anchor', clip='w01_wide_listen', kind='two', start=0, lines=[], dur=3.0, screen='quiz', cam='push', A=(540, 1318)),
         dict(id='reveal', bank='anchor', clip='a02_ama_talk_smile', kind='mcu', start=56, lines=['v7_a'], lead=0.45, tail=0.35, cam='punch', punch=('v7_a', 1), A=MCU_A),
         dict(id='end', bank='anchor', clip='t01_two_ama_talks', kind='two', end_at=0, lines=['v7_s'], lead=0.20, tail=1.9, screen='end', cam='loop', A=TWO_A)]
SCENE_KINDS = ('master', 'ots_ama', 'ots_mei')
def cmode(kind): return 'scene' if kind in SCENE_KINDS else kind
BK = {b: json.load(open(f'{o.foot}/{b}/bank.json')) for b in ('anchor', 'airport')}
CL = {(b, c['id']): c for b, j in BK.items() for c in j['clips']}
def base_dir(bank): return f'{o.foot}/anchor/tools' if bank == 'anchor' else f'{o.foot}/{bank}'
def usable(sh):
    c = CL[(sh['bank'], sh['clip'])]
    if 'usable_frames' in c: return c['usable_frames']
    fr = [(int(round(a * FPS)), min(int(round(b * FPS)), c.get('frames', 121) - 1)) for a, b in (c.get('usable_segments') or [[0, 5]])]
    st = sh.get('start', sh.get('end_at', 0))
    for lo, hi in fr:
        if lo <= st <= hi: return [lo, hi]
    return list(fr[0])
t = 0.0; f0 = 0; LAT = []
for k, sh in enumerate(SHOTS):
    assert k == 0 or (SHOTS[k - 1]['bank'], SHOTS[k - 1]['clip']) != (sh['bank'], sh['clip']), ('same clip twice in a row', sh['clip'])
    tt = f0 / FPS + sh.get('lead', 0); sh['line_at'] = {}
    for j, lid in enumerate(sh['lines']):
        sh['line_at'][lid] = tt; LAT.append(dict(id=lid, at=tt, shot=sh['id'])); tt += LINES[lid]['dur'] + (sh.get('gap', 0.3) if j < len(sh['lines']) - 1 else 0)
    dur = sh['dur'] if 'dur' in sh else max(tt + sh['tail'] - f0 / FPS, sh.get('min', 0))
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
    lo, hi = usable(sh)
    if 'end_at' in sh: sh['frames'] = pingpong(sh['end_at'], sh['n'], lo, hi)[::-1]   # plays INTO frame end_at = the first frame of the video
    else: sh['frames'] = pingpong(max(lo, sh['start']), sh['n'], lo, hi)
assert SHOTS[-1]['frames'][-1] == SHOTS[0]['frames'][0] and SHOTS[-1]['clip'] == SHOTS[0]['clip'], 'loop: last frame must be the first frame'
WORDS = {}
for la in LAT:
    for k, w in enumerate(LINES[la['id']]['words']): WORDS[f"{la['id']}.{k}"] = dict(line=la['id'], k=k, w=w['w'], s=round(la['at'] + w['s'], 3), e=round(la['at'] + w['e'], 3), raw_s=round(la['at'] + w['raw_s'], 3), onset=None if w['onset'] is None else round(la['at'] + w['onset'], 3), checked=w['checked'])
def wt(lid, k): return WORDS[f'{lid}.{k}']
ATL = {la['id']: la['at'] for la in LAT}; LSHOT = {la['id']: la['shot'] for la in LAT}
def line_end(lid): return ATL[lid] + LINES[lid]['words'][-1]['e']
SH = {s['id']: s for s in SHOTS}

# ---------------- camera: uniform similarity only ----------------
def cam_scale(sh, tl):
    du = (sh['n'] - 1) / FPS; u = tl / max(du, 1e-6); p = V7['push'][cmode(sh['kind'])]
    if sh['cam'] == 'hold': return 1.0
    if sh['cam'] == 'loop': return 1.0 + p * math.sin(math.pi * min(1.0, u))   # creeps in, settles back to 1.0 on the loop frame
    s = 1.0 + p * ease(u, EASE['inout'])
    if sh['cam'] == 'punch':
        lid, k = sh['punch']; tp = wt(lid, k)['s'] - 0.10 - sh['f0'] / FPS
        if tl >= tp: s = s + (V7['punch'] - s) * ease((tl - tp) / V7['punch_in'])
    return s
def cam_M(sh, s):
    b, ox, oy = sh['b'], sh['ox'], sh['oy']; ax, ay = sh['A']
    return np.array([[s * b, 0, s * ox + ax * (1 - s)], [0, s * b, s * oy + ay * (1 - s)]], np.float64)
def window(M, sw, shh):   # visible source rect
    return [(0 - M[0, 2]) / M[0, 0], (0 - M[1, 2]) / M[1, 1], (W - M[0, 2]) / M[0, 0], (H - M[1, 2]) / M[1, 1]]
def tr_box(M, b):
    x0, y0, x1, y1 = b; return [round(M[0, 0] * x0 + M[0, 2]), round(M[1, 1] * y0 + M[1, 2]), round(M[0, 0] * x1 + M[0, 2]), round(M[1, 1] * y1 + M[1, 2])]
def sharpen(img, s):
    if s <= 1.001: return img
    amt = min(0.9, (s - 1.0) * 11.0); b = cv2.GaussianBlur(img, (0, 0), 1.0)
    return cv2.addWeighted(img, 1 + amt, b, -amt, 0)

# ---------------- studio monitor (world object of the anchor set; drawn into the source frame before the camera) ----------------
K = V7['ss']; CWv, CHv = V7['canvas']; RY0, RY1 = V7['region']; RH_ = RY1 - RY0
Q = np.float32(V7['quad']); QC = Q.mean(0)
def grow(P, d):   # offset a near-rectangular quad outward by d px
    hw = (P[:, 0].max() - P[:, 0].min()) / 2; hh = (P[:, 1].max() - P[:, 1].min()) / 2
    return np.float32(np.c_[QC[0] + (P[:, 0] - QC[0]) * (hw + d) / hw, QC[1] + (P[:, 1] - QC[1]) * (hh + d) / hh])
def pmask(P):
    m = np.zeros((RH_, W), np.uint8); cv2.fillPoly(m, [np.round((P - [0, RY0]) * 16).astype(np.int32)], 255, cv2.LINE_AA, shift=4)
    return m.astype(np.float32) / 255
SCR = pmask(Q); BEZ = pmask(grow(Q, V7['bezel'])); LIP = pmask(grow(Q, 3))
yy, xx = np.mgrid[0:RH_, 0:W].astype(np.float32); yw = yy + RY0
SHADOW = np.clip(cv2.GaussianBlur(np.roll(BEZ, 20, axis=0), (0, 0), 22) * 0.45, 0, 1) * (1 - BEZ)                 # contact shadow on the wall
GLOW = np.clip(cv2.GaussianBlur(SCR, (0, 0), 50) * 0.16, 0, 1) * (1 - BEZ)                                          # screen light spill on the wall
GLOWC = np.array([196, 214, 120], np.float32)                                                                          # BGR of the teal-mint emission
bt, bb_ = Q[:, 1].min() - V7['bezel'], Q[:, 1].max() + V7['bezel']
gv = np.clip((yw - bt) / (bb_ - bt), 0, 1)[..., None]
BEZC = np.array([66, 62, 58], np.float32) * (1 - gv) + np.array([36, 33, 31], np.float32) * gv                         # graphite, lit from above
rim = np.clip(1 - np.abs(yw - (bt + 2.0)) / 2.5, 0, 1) * BEZ * 0.75                                                    # 1-2 px top rim highlight
lowrim = np.clip(1 - np.abs(yw - (bb_ - 2.0)) / 2.5, 0, 1) * BEZ * 0.5
sheen = (np.clip(1 - np.abs(xx - (690 - 0.85 * (yw - 268))) / 170, 0, 1) ** 1.5 * 0.075 +                              # one soft diagonal reflection
         np.clip(1 - np.abs(xx - (900 - 0.85 * (yw - 268))) / 40, 0, 1) * 0.035) * SCR
refl = np.clip(1 - np.abs(yw - 300) / 18, 0, 1) * 0.05 * SCR                                                           # faint reflection of the light strip
inner = np.clip(1 - cv2.GaussianBlur(cv2.erode(SCR, np.ones((3, 3), np.uint8), iterations=6), (0, 0), 9), 0, 1) * SCR * 0.42   # bezel depth: dark inner edge
HC = cv2.getPerspectiveTransform(np.float32([[0, 0], [CWv, 0], [CWv, CHv], [0, CHv]]), Q)
HCr = np.array([[1, 0, 0], [0, 1, -RY0], [0, 0, 1]], np.float64) @ HC
def canvas_pt(x, y):
    v = HC @ np.array([x, y, 1.0]); return v[0] / v[2], v[1] / v[2]
def canvas_box(b):
    pts = [canvas_pt(x, y) for x, y in ((b[0], b[1]), (b[2], b[1]), (b[2], b[3]), (b[0], b[3]))]
    return [min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts)]
# canvas background (2x): ink gradient + soft vignette
bgy = np.linspace(0, 1, CHv * K, dtype=np.float32)[:, None, None]
BG2 = np.array(V7['ink_top'], np.float32) * (1 - bgy) + np.array(V7['ink'], np.float32) * bgy
BG2 = np.repeat(BG2, CWv * K, axis=1)
vy, vx = np.mgrid[0:CHv * K, 0:CWv * K].astype(np.float32); vig = 1 - 0.28 * (((vx / (CWv * K) - 0.5) * 1.6) ** 2 + ((vy / (CHv * K) - 0.45) * 1.4) ** 2)
BG2 = np.clip(BG2 * vig[..., None], 0, 255).astype(np.uint8); BG_IM = Image.fromarray(BG2, 'RGB')
WHITE, MINT, YEL, GRN, RED, INK = (255, 255, 255), C['mint'], C['yellow'], C['green'], C['red'], C['navy']
LOGO = Image.open(o.logo).convert('RGBA'); LOGO2 = LOGO.resize((round(LOGO.width * 64 * K / LOGO.height), 64 * K), Image.LANCZOS)
class Cv:   # one 2x RGBA layer, coordinates in 1x canvas units
    def __init__(s): s.im = Image.new('RGBA', (CWv * K, CHv * K), (0, 0, 0, 0)); s.d = ImageDraw.Draw(s.im)
    def length(s, txt, sz, f=None): return font(sz * K, f).getlength(txt) / K
    def text(s, x, y, segs, sz, f=None):
        fo = font(sz * K, f); cx = x * K
        for t_, col in segs: s.d.text((cx, y * K), t_, font=fo, fill=col + (255,), anchor='la'); cx += fo.getlength(t_)
        b = s.d.textbbox((x * K, y * K), ''.join(t_ for t_, _ in segs), font=fo, anchor='la'); return [v / K for v in b]
    def pill(s, x, y, txt, bg, fg=WHITE, sz=48):
        fo = font(sz * K); b = s.d.textbbox(((x + 20) * K, (y + 8) * K), txt, font=fo, anchor='la')
        s.d.rounded_rectangle([x * K, y * K, b[2] + 20 * K, b[3] + 12 * K], 16 * K, fill=bg + (255,)); s.d.text(((x + 20) * K, (y + 8) * K), txt, font=fo, fill=fg + (255,), anchor='la')
        return [v / K for v in b]
    def rich(s, x, y, ws, sz, maxw, lh=1.16, hl=None):
        fo = font(sz * K); sp = fo.getlength(' '); lines = [[]]
        for w, c in ws:
            cand = lines[-1] + [(w, c)]
            if lines[-1] and fo.getlength(' '.join(a for a, _ in cand)) > maxw * K: lines.append([(w, c)])
            else: lines[-1] = cand
        bb = [1e9, 1e9, -1e9, -1e9]; yy_ = y * K; i = 0
        for ln in lines:
            cx = x * K
            for w, c in ln:
                if hl and i in hl:
                    cx += 12 * K; b = s.d.textbbox((cx, yy_), w, font=fo, anchor='la'); s.d.rounded_rectangle([b[0] - 12 * K, b[1] - 8 * K, b[2] + 12 * K, b[3] + 10 * K], 14 * K, fill=hl[i] + (255,))
                s.d.text((cx, yy_), w, font=fo, fill=c + (255,), anchor='la'); b = s.d.textbbox((cx, yy_), w, font=fo, anchor='la')
                bb = [min(bb[0], b[0]), min(bb[1], b[1]), max(bb[2], b[2]), max(bb[3], b[3])]; cx += fo.getlength(w) + sp + (12 * K if hl and i in hl else 0); i += 1
            yy_ += round(sz * lh * K)
        return [v / K for v in bb]
CX = 40; CMAX = 730   # canvas content x range (keeps every glyph inside the safe area at the strongest push)
def st_hook(L, T):
    els = [('hook.pill', 'NEVER SAY', L.pill(CX, 34, 'NEVER SAY', RED), 48)]
    q = '“The gate is change?”'; sz = 84
    while L.length(q, sz) > CMAX - CX and sz > 60: sz -= 2
    bb = L.text(CX, 124, [(q, WHITE)], sz); els.append(('hook.quote', q, bb, sz))
    p = ease((T - (line_end('v7_h') + 0.05)) / 0.35)
    if p > 0: ym = (bb[1] + bb[3]) / 2 + 4; L.d.line([((bb[0] - 6) * K, ym * K), ((bb[0] - 6 + p * (bb[2] - bb[0] + 12)) * K, ym * K)], fill=RED + (255,), width=9 * K)
    els.append(('hook.series', 'AIRPORT ENGLISH', L.text(CX, 300, [('AIRPORT ENGLISH', MINT)], 48, FBd), 48)); return els
def st_ex(L, T, lay):
    els = [('rule.label', 'NEW CHANGE? ASK:', L.text(CX, 28, [('NEW CHANGE? ASK:', MINT)], 48, FBd), 48)]
    segs = [('HAS', YEL), (' + it + ', WHITE), ('CHANGED?', GRN)]; sz = 88
    while L.length(''.join(s_ for s_, _ in segs), sz) > CMAX - CX and sz > 60: sz -= 2
    els.append(('rule.formula', 'HAS + it + CHANGED?', L.text(CX, 92, segs, sz), sz))
    L.d.line([(CX * K, 214 * K), ((CMAX - 40) * K, 214 * K)], fill=MINT + (70,), width=2 * K)
    for j, (txt, k) in enumerate((('Has the time changed?', 0), ('Has the flight moved?', 4))):
        a = ease((T - (wt('v7_x', k)['s'] - 0.08)) / 0.25)
        if a <= 0: continue
        L2 = Cv(); bb = L2.text(CX, 236 + j * 78 + round((1 - a) * 20), [('Has', YEL), (txt[3:], WHITE)], 60); lay.append((L2, a)); els.append((f'ex.row{j}', txt, bb, 60, a))
    return els
def st_quiz(L, T):
    els = [('quiz.pill', 'QUIZ', L.pill(CX, 30, 'QUIZ', YEL, INK), 48)]
    els.append(('quiz.q', 'Excuse me, ___ the gate changed?', L.rich(CX, 112, [(w, WHITE) for w in 'Excuse me, ___ the gate changed?'.split()], 62, 560), 62))
    c0 = SH['count']['f0'] / FPS; cx, cy, r = 700, 128, 66; rem = max(0.0, 1 - (T - c0) / 3.0)
    L.d.ellipse([(cx - r) * K, (cy - r) * K, (cx + r) * K, (cy + r) * K], outline=MINT + (70,), width=12 * K)
    if rem > 0: L.d.arc([(cx - r) * K, (cy - r) * K, (cx + r) * K, (cy + r) * K], -90, -90 + 360 * rem, fill=YEL + (255,), width=12 * K)
    num = str(max(1, 3 - int(max(0.0, T - c0)))); fo = font(96 * K)
    L.d.text((cx * K, (cy + 4) * K), num, font=fo, fill=WHITE + (255,), anchor='mm'); b = L.d.textbbox((cx * K, (cy + 4) * K), num, font=fo, anchor='mm')
    els.append((f'quiz.count{num}', num, [v / K for v in b], 96))
    x = CX
    for lbl, wd, nm in (('A', 'has', 'quiz.chipA'), ('B', 'is', 'quiz.chipB')):
        f1, f2 = font(48 * K), font(56 * K); w = 30 + L.length(lbl, 48) + 20 + L.length(wd, 56) + 34; y = 288
        L.d.rounded_rectangle([x * K, y * K, (x + w) * K, (y + 84) * K], 22 * K, fill=C['navy2'] + (255,), outline=MINT + (140,), width=3 * K)
        L.d.text(((x + 30) * K, (y + 42) * K), lbl, font=f1, fill=YEL + (255,), anchor='lm'); L.d.text(((x + 30 + L.length(lbl, 48) + 20) * K, (y + 44) * K), wd, font=f2, fill=WHITE + (255,), anchor='lm')
        els.append((nm, f'{lbl} {wd}', [x, y, x + w, y + 84], 56)); x += w + 36
    return els
def st_end(L, T):
    els = [('end.answer', 'ANSWER: HAS', L.pill(CX, 26, 'ANSWER: HAS', GRN, INK), 48)]
    L.im.alpha_composite(LOGO2, (CX * K, 112 * K)); els.append(('end.logo', '', [CX, 112, CX + LOGO2.width / K, 176], 0))
    els.append(('end.cta', 'Roleplay this free', L.text(CX, 196, [('Roleplay this free', WHITE)], 70), 70))
    link = (LZ.get('cta') or {}).get('link', 'https://lexkite.com/app/#/roleplay').replace('https://', '')
    els.append(('end.link', link, L.text(CX, 292, [(link, YEL)], 50, FBd), 50)); return els
DRAW = dict(hook=st_hook, quiz=st_quiz, end=st_end)
def screen_window(sh):
    on = sh['f0'] / FPS + (1.0 / FPS if sh['id'] == 'hook' else 0.0); off = (sh['f0'] + sh['n']) / FPS
    return on, (TOTAL - 0.40 if sh['screen'] == 'end' else off)
BGW = cv2.warpPerspective(cv2.resize(np.ascontiguousarray(BG2[..., ::-1]), (CWv, CHv), interpolation=cv2.INTER_AREA).astype(np.float32), HCr, (W, RH_), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
def monitor(F, sh, T):
    """Composite the monitor (world space) into F rows RY0..RY1. Returns element list (world bboxes) + panel luma sample."""
    on, off = screen_window(sh); a = 0.0
    if on <= T < off: a = min(1.0 if sh['screen'] == 'quiz' else ease((T - on) / 0.28), ease((off - T) / 0.15, EASE['inout']) if sh['screen'] == 'end' and off - T < 0.15 else 1.0)   # quiz: the question is already asked -> on at the cut
    canvas = BG_IM.copy().convert('RGBA'); els = []
    if a > 0.001:
        L = Cv(); lay = []
        ee = st_ex(L, T, lay) if sh['screen'] == 'ex' else DRAW[sh['screen']](L, T)
        for L2, a2 in lay:
            r2 = np.asarray(L2.im).copy(); r2[..., 3] = (r2[..., 3].astype(np.float32) * a2).astype(np.uint8); L.im.alpha_composite(Image.fromarray(r2))
        rise = round((1 - a) * 24) if T - on < 0.28 and sh['screen'] != 'quiz' else 0
        im = L.im.transform(L.im.size, Image.AFFINE, (1, 0, 0, 0, 1, -rise * K), resample=Image.BILINEAR) if rise else L.im
        arr = np.asarray(im).copy(); arr[..., 3] = (arr[..., 3].astype(np.float32) * a).astype(np.uint8); canvas.alpha_composite(Image.fromarray(arr))
        for e in ee:
            bb = list(e[2]); bb[1] += rise; bb[3] += rise
            els.append(dict(name=e[0], text=e[1], cbox=bb, bbox=canvas_box(bb), px=e[3] * (Q[2, 0] - Q[3, 0]) / CWv, alpha=round(a * (e[4] if len(e) > 4 else 1.0), 3), group='screen'))
    c1 = cv2.resize(np.asarray(canvas.convert('RGB'))[..., ::-1], (CWv, CHv), interpolation=cv2.INTER_AREA).astype(np.float32)
    scr = cv2.warpPerspective(c1, HCr, (W, RH_), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
    R = F[RY0:RY1].astype(np.float32)
    R = R * (1 - SHADOW[..., None]) + GLOWC * GLOW[..., None]
    R = R * (1 - BEZ[..., None]) + BEZC * BEZ[..., None]
    R = R * (1 - rim[..., None]) + 200 * rim[..., None]; R = R * (1 - lowrim[..., None]) + 14 * lowrim[..., None]
    R = R * (1 - LIP[..., None]) + 10 * LIP[..., None]
    R = R * (1 - SCR[..., None]) + scr * SCR[..., None]
    R = R * (1 - inner[..., None]) + 255 * (sheen + refl)[..., None]
    F[RY0:RY1] = np.clip(R, 0, 255).astype(np.uint8)
    txt = cv2.dilate((np.abs(scr - BGW).max(2) > 10).astype(np.uint8), np.ones((21, 21), np.uint8)); m_ = (SCR > 0.98) & (txt == 0)
    luma = float(np.median(cv2.cvtColor(F[RY0:RY1], cv2.COLOR_BGR2GRAY)[m_])) if m_.any() else None
    return els, luma

# ---------------- karaoke captions (screen space, 2x supersampled masks -> crisp edges) ----------------
GAPX = 14
def fits(seq, mode):
    cfg = V7['cap'][mode]; fo = font(cfg['sz']); maxw = SAFE['x1'] - SAFE['x0'] - 2 * V7['stroke'] - 8
    if len(seq) > cfg['words']: return False
    lines = [[]]
    for w in seq:
        cand = lines[-1] + [w]
        if lines[-1] and fo.getlength(' '.join(x[1] for x in cand)) + GAPX * (len(cand) - 1) > maxw: lines.append([w])
        else: lines[-1] = cand
    return len(lines) <= cfg['lines']
def pages_of(lid, mode):
    ws = [(f'{lid}.{k}', DISP.get(w['w'].lower(), w['w'])) for k, w in enumerate(LINES[lid]['words'])]
    def split(seq):
        if fits(seq, mode) or len(seq) == 1: return [seq]
        cut = [i + 1 for i in range(len(seq) - 1) if seq[i][1][-1] in ',.?!:;']
        mid = len(seq) / 2; i = min(cut, key=lambda c: abs(c - mid) - (3 if seq[c - 1][1][-1] in '.?!' else 0)) if cut else int(mid)
        if not cut or not 0 < i < len(seq): i = max(1, int(mid))
        return split(seq[:i]) + split(seq[i:])
    return split(ws)
class Page:
    def __init__(s, words, mode, lid):
        s.words, s.mode, s.lid = words, mode, lid; cfg = V7['cap'][mode]; sz = cfg['sz']; st = V7['stroke']; maxw = SAFE['x1'] - SAFE['x0'] - 2 * st - 8
        while True:
            fo = font(sz); L = [[]]
            for w in words:
                cand = L[-1] + [w]
                if L[-1] and fo.getlength(' '.join(x[1] for x in cand)) + GAPX * (len(cand) - 1) > maxw: L.append([w])
                else: L[-1] = cand
            if len(L) <= cfg['lines'] or sz <= V7['cap_min']: break
            sz -= 2
        assert len(L) <= cfg['lines'], ('caption page needs more lines than the mode allows', mode, words)
        s.sz = sz; s.lines = len(L); lh = round(sz * 1.18); cxm = (SAFE['x0'] + SAFE['x1']) / 2
        fo2 = font(sz * K); place = []; ink = [1e9, 1e9, -1e9, -1e9]
        for j, ln in enumerate(L):   # layout at baseline 0 for the last line, 2x units
            txt_w = sum(fo2.getlength(x[1]) for x in ln) + (fo2.getlength(' ') + GAPX * K) * (len(ln) - 1); x = cxm * K - txt_w / 2; yb = -(len(L) - 1 - j) * lh * K
            for wid, wtxt in ln:
                b = fo2.getbbox(wtxt, anchor='ls', stroke_width=st * K); place.append((wid, wtxt, x, yb))
                ink = [min(ink[0], x + b[0]), min(ink[1], yb + b[1]), max(ink[2], x + b[2]), max(ink[3], yb + b[3])]; x += fo2.getlength(wtxt) + fo2.getlength(' ') + GAPX * K
        dy = cfg['bottom'] * K - ink[3]; pad = 28
        s.ink = [math.floor(ink[0] / K), math.floor((ink[1] + dy) / K), math.ceil(ink[2] / K), math.ceil((ink[3] + dy) / K)]   # glyph + stroke bbox (screen)
        s.box = [max(0, s.ink[0] - pad), max(0, s.ink[1] - pad), min(W, s.ink[2] + pad), min(H, s.ink[3] + pad)]; bw, bh = s.box[2] - s.box[0], s.box[3] - s.box[1]
        fill = Image.new('L', (bw * K, bh * K), 0); strk = Image.new('L', (bw * K, bh * K), 0); df, ds = ImageDraw.Draw(fill), ImageDraw.Draw(strk); s.rect = {}
        for wid, wtxt, x, yb in place:
            px, py = x - s.box[0] * K, yb + dy - s.box[1] * K
            df.text((px, py), wtxt, font=fo2, fill=255, anchor='ls'); ds.text((px, py), wtxt, font=fo2, fill=255, anchor='ls', stroke_width=st * K, stroke_fill=255)
            b = df.textbbox((px, py), wtxt, font=fo2, anchor='ls'); s.rect[wid] = (int(b[0] / K), int(b[1] / K) - 6, int(math.ceil(b[2] / K)), int(b[3] / K) + 8)
        s.fill = cv2.resize(np.asarray(fill).astype(np.float32) / 255, (bw, bh), interpolation=cv2.INTER_AREA)
        s.strk = cv2.resize(np.asarray(strk).astype(np.float32) / 255, (bw, bh), interpolation=cv2.INTER_AREA)
        s.shadow = cv2.GaussianBlur(np.roll(s.strk, 6, axis=0), (0, 0), 7) * 0.55
        s.t0 = WORDS[words[0][0]]['s'] - 0.12; s.t1 = WORDS[words[-1][0]]['e'] + 0.30
        s.acc = np.array(V7['acc_line'].get(lid, V7['accent'])[::-1], np.float32)
    def draw(s, F, tm):
        x0, y0, x1, y1 = s.box; reg = F[y0:y1, x0:x1].astype(np.float32)
        reg *= (1 - s.shadow[..., None]); ink = np.array([12, 32, 34], np.float32)[::-1]
        reg = reg * (1 - s.strk[..., None]) + ink * s.strk[..., None]
        col = np.ones(reg.shape, np.float32) * 255; al = s.fill * V7['upcoming']; wipe = {}
        for wid, (a0, b0, a1, b1) in s.rect.items():
            w = WORDS[wid]; p = (tm - w['s']) / max(1e-3, w['e'] - w['s']); p = max(0.0, min(1.0, p)); wipe[wid] = round(p, 3)
            b0, b1 = max(0, b0), min(al.shape[0], b1)
            if p >= 1.0: al[b0:b1, a0:a1] = s.fill[b0:b1, a0:a1]
            elif p > 0:
                xc = a0 + int(round(p * (a1 - a0))); al[b0:b1, a0:xc] = s.fill[b0:b1, a0:xc]; col[b0:b1, a0:xc] = s.acc
        reg = reg * (1 - al[..., None]) + col * al[..., None]; F[y0:y1, x0:x1] = np.clip(reg, 0, 255).astype(np.uint8); return wipe
PAGES = []
for la in LAT:
    mode = cmode(SH[la['shot']]['kind'])
    for pw in pages_of(la['id'], mode): PAGES.append(Page(pw, mode, la['id']))
for a, b in zip(PAGES, PAGES[1:]):   # never hide a page before its last word finished its wipe
    a.t1 = max(min(a.t1, b.t0), WORDS[a.words[-1][0]]['e'] + 1.0 / FPS); b.t0 = max(b.t0, a.t1)
for p in PAGES:   # a page never survives a cut into another shot
    sh = SH[LSHOT[p.lid]]; p.t1 = min(p.t1, (sh['f0'] + sh['n']) / FPS); p.t0 = max(p.t0, sh['f0'] / FPS)
CAP_LOG = {f'p{j}': dict(words=[w[0] for w in p.words], text=' '.join(w[1] for w in p.words), lines=p.lines, size=p.sz, mode=p.mode, box=p.box, ink=p.ink, stroke=V7['stroke'], ss=K) for j, p in enumerate(PAGES)}

# ---------------- screen-space overlays: scene gradient, X / check badges, logo bug ----------------
def rgba_np(im): a = np.asarray(im).astype(np.float32); return a[..., :3][..., ::-1].copy(), a[..., 3] / 255
def over(F, rgb, al, x, y, mult=1.0):
    h, w = al.shape; X0, Y0 = max(0, x), max(0, y); X1, Y1 = min(W, x + w), min(H, y + h)
    if X1 <= X0 or Y1 <= Y0 or mult <= 0: return
    a = al[Y0 - y:Y1 - y, X0 - x:X1 - x, None] * mult; r = F[Y0:Y1, X0:X1].astype(np.float32)
    F[Y0:Y1, X0:X1] = np.clip(r * (1 - a) + rgb[Y0 - y:Y1 - y, X0 - x:X1 - x] * a, 0, 255).astype(np.uint8)
g0, g1, ga, gb = V7['grad']; gy = np.arange(H, dtype=np.float32)
GRAD = np.where(gy < g0, 0, np.where(gy < g1, ga * (lambda u: u * u * (3 - 2 * u))(np.clip((gy - g0) / (g1 - g0), 0, 1)), ga + (gb - ga) * (gy - g1) / (H - g1)))[g0:, None, None].astype(np.float32)
GRADC = np.array([22, 20, 8], np.float32)
def make_badge(kind):
    r = V7['badge'][2]; S = 2 * (r + 24); im = Image.new('RGBA', (S * K, S * K), (0, 0, 0, 0)); d = ImageDraw.Draw(im); c = S * K / 2
    sh_ = Image.new('L', im.size, 0); ImageDraw.Draw(sh_).ellipse([c - r * K, c - r * K + 10 * K, c + r * K, c + r * K + 10 * K], fill=120)
    im.putalpha(Image.fromarray(np.maximum(np.asarray(im)[..., 3], cv2.GaussianBlur(np.asarray(sh_), (0, 0), 9 * K))))
    col = RED if kind == 'x' else GRN
    d = ImageDraw.Draw(im); d.ellipse([c - r * K, c - r * K, c + r * K, c + r * K], fill=col + (255,), outline=WHITE + (255,), width=7 * K)
    q = r * 0.42 * K
    if kind == 'x':
        for a_, b_ in (((c - q, c - q), (c + q, c + q)), ((c - q, c + q), (c + q, c - q))): d.line([a_, b_], fill=WHITE + (255,), width=17 * K)
        for p in ((c - q, c - q), (c + q, c + q), (c - q, c + q), (c + q, c - q)): d.ellipse([p[0] - 8.5 * K, p[1] - 8.5 * K, p[0] + 8.5 * K, p[1] + 8.5 * K], fill=WHITE + (255,))
    else:
        pts = [(c - q * 1.05, c + q * 0.05), (c - q * 0.25, c + q * 0.8), (c + q * 1.1, c - q * 0.75)]; d.line(pts, fill=WHITE + (255,), width=18 * K, joint='curve')
        for p in (pts[0], pts[2]): d.ellipse([p[0] - 9 * K, p[1] - 9 * K, p[0] + 9 * K, p[1] + 9 * K], fill=WHITE + (255,))
    a = np.asarray(im).astype(np.float32); return cv2.resize(a, (S, S), interpolation=cv2.INTER_AREA)
BADGE = {k: make_badge(k) for k in ('x', 'ok')}
MARK_T = {'x': line_end('v7_w') + 0.02, 'ok': line_end('v7_k') + 0.02}
BUG = Image.open(o.bug).convert('RGBA').resize((V7['bug'][2], V7['bug'][2]), Image.LANCZOS)
bm = Image.new('L', BUG.size, 0); ImageDraw.Draw(bm).rounded_rectangle([0, 0, BUG.width - 1, BUG.height - 1], 14, fill=255)
BUG.putalpha(Image.fromarray((np.asarray(BUG)[..., 3].astype(np.float32) * np.asarray(bm) / 255).astype(np.uint8))); BUG_RGB, BUG_A = rgba_np(BUG)
EDGE = 1 - cv2.GaussianBlur(cv2.copyMakeBorder(np.ones((H - 160, W - 160), np.float32), 80, 80, 80, 80, cv2.BORDER_CONSTANT, value=0), (0, 0), 40)

# ---------------- frame loop ----------------
for d_ in ('.samples', '.zones'): os.makedirs(o.out + d_, exist_ok=True)
DBG = {min(NF - 1, int(round(float(x) * FPS))) for x in o.debug_at.split(',') if x}
enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-b:v', f'{o.kbps}k', '-maxrate', f'{int(o.kbps * 1.35)}k', '-bufsize', f'{o.kbps * 2}k',
                        '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48', '-movflags', '+faststart', o.out + '.video.mp4'], stdin=subprocess.PIPE)
FRAMES = []; SHARP = []; PANEL = []; EDGES = []; cur = None; FR = None; MO = {}
def zones_of(kind): return {k: v for k, v in ZONES.get(kind, {}).items()}
for sh in SHOTS:
    if (sh['bank'], sh['clip']) != cur:
        cap = cv2.VideoCapture(f"{base_dir(sh['bank'])}/dl24/{sh['clip']}.mp4"); FR = []
        while True:
            ok, fr_ = cap.read()
            if not ok: break
            FR.append(fr_)
        cur = (sh['bank'], sh['clip']); assert FR, ('clip missing', cur)
    shh, sw = FR[0].shape[:2]; b = max(W / sw, H / shh); sh.update(b=b, ox=(W - sw * b) / 2, oy=(H - shh * b) / 2, src_size=[sw, shh])
    md = f"{base_dir(sh['bank'])}/meta/{sh['clip']}"; who = sorted(d for d in os.listdir(md) if os.path.isdir(f'{md}/{d}')) if os.path.isdir(md) else []
    face = None
    for w_ in who:
        if (cur, w_) not in MO: MO[(cur, w_)] = LS.Mouth(f'{md}/{w_}')
        fb = MO[(cur, w_)].m.get('face_box')
        if fb and (face is None or any(WHO[l] == w_ for l in sh['lines'])): face = fb
    if sh.get('raw'): who = []
    spk = {w_: [dict(cues=LINES[l]['cues'], at=sh['line_at'][l]) for l in sh['lines'] if WHO[l] == w_] for w_ in who}
    for j in range(sh['n']):
        fi = sh['f0'] + j; T = fi / FPS; tm = T + 0.5 / FPS; src = sh['frames'][j]
        F = FR[min(src, len(FR) - 1)].copy(); vis = {}
        for w_ in who:
            mo = MO[(cur, w_)]; v = LS.viseme_at(spk.get(w_, []), T); F = mo.apply(F, src, mo.spr[v]); vis[w_] = v
        Fn = F.copy(); els = []; luma = None
        if sh['kind'] == 'two': els, luma = monitor(F, sh, T)
        s = cam_scale(sh, T - sh['f0'] / FPS); M = cam_M(sh, s); win = window(M, sw, shh)
        out = cv2.warpAffine(F, M, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE); out = sharpen(out, s * b)
        for e in els: e['bbox'] = tr_box(M, e['bbox']); e['px'] = round(e['px'] * s * b, 1); e.pop('cbox', None)
        if sh['kind'] in SCENE_KINDS:
            r = out[g0:].astype(np.float32); out[g0:] = np.clip(r * (1 - GRAD) + GRADC * GRAD, 0, 255).astype(np.uint8)
        if sh.get('mark'):
            k = sh['mark']; t0 = MARK_T[k]; end = (sh['f0'] + sh['n']) / FPS
            if T >= t0:
                u = T - t0; sc = 0.55 + 0.45 * ease(u / 0.30, EASE['spring']); al = min(ease(u / 0.10), ease((end - T) / 0.12, EASE['inout']) if end - T < 0.12 else 1.0)
                Bm = BADGE[k]; S = max(8, int(round(Bm.shape[0] * sc))); bs = cv2.resize(Bm, (S, S), interpolation=cv2.INTER_AREA if sc < 1 else cv2.INTER_CUBIC)
                cx, cy = V7['badge'][:2]; over(out, bs[..., :3][..., ::-1].copy(), bs[..., 3] / 255, cx - S // 2, cy - S // 2, al)
                rr = round(V7['badge'][2] * sc); els.append(dict(name=f'badge.{k}', text='✗' if k == 'x' else '✓', bbox=[cx - rr, cy - rr, cx + rr, cy + rr], px=2 * rr, alpha=round(al, 3), group='badge'))
                if k == 'x' and u < 0.30:   # quick red edge flash
                    fa = 0.30 * (1 - u / 0.30); r = out.astype(np.float32); m = EDGE[..., None] * fa
                    out = np.clip(r * (1 - m) + np.array(RED[::-1], np.float32) * m, 0, 255).astype(np.uint8)
        over(out, BUG_RGB, BUG_A, V7['bug'][0], V7['bug'][1], 0.92)
        wipe = {}
        for pi, p in enumerate(PAGES):
            if p.t0 <= T < p.t1:
                wipe.update(p.draw(out, tm)); els.append(dict(name=f'cap.p{pi}', text=CAP_LOG[f'p{pi}']['text'], bbox=p.ink, px=p.sz, alpha=1.0, group='caption'))
        enc.stdin.write(out.tobytes())
        Mr = [round(float(x), 5) for x in M.ravel()]
        FRAMES.append(dict(t=round(T, 4), bank=sh['bank'], clip=sh['clip'], kind=sh['kind'], shot=sh['id'], src=src, s=round(s, 4), b=round(b, 5), M=Mr, win=[round(x, 2) for x in win], src_size=[sw, shh],
                           vis=vis, els=[[e['name'], e['text'], *e['bbox'], e['alpha'], e['px'], e['group']] for e in els], wipe=wipe))
        if fi in (0, NF - 1): cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
        if fi % 24 == 12 and face:
            x0, y0, x1, y1 = face; nat = cv2.cvtColor(Fn[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY); r = tr_box(M, face)
            r = [max(0, r[0]), max(0, r[1]), min(W, r[2]), min(H, r[3])]; scr = cv2.cvtColor(out[r[1]:r[3], r[0]:r[2]], cv2.COLOR_BGR2GRAY)
            SHARP.append(dict(frame=fi, shot=sh['id'], s=round(s * b, 4), rect=r, var_native=round(float(cv2.Laplacian(nat, cv2.CV_64F).var()), 2), var_render=round(float(cv2.Laplacian(scr, cv2.CV_64F).var()), 2)))
            cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
        if fi % 24 == 0:   # stretch detector: top wall band texture vs the native frame (a stretch flattens it)
            g_o = cv2.cvtColor(out[:200], cv2.COLOR_BGR2GRAY); g_n = cv2.cvtColor(F[:200], cv2.COLOR_BGR2GRAY)
            EDGES.append(dict(frame=fi, shot=sh['id'], ratio=round(float(cv2.Laplacian(g_o, cv2.CV_64F).var()) / max(1e-3, float(cv2.Laplacian(g_n, cv2.CV_64F).var())), 3)))
        if luma is not None and fi % 12 == 6: PANEL.append(dict(frame=fi, luma=round(luma, 1)))
        if fi in DBG:
            dbg = out.copy()
            for zn, zb in zones_of(sh['kind']).items():
                r = tr_box(M, zb); cv2.rectangle(dbg, (r[0], r[1]), (r[2], r[3]), (0, 0, 255), 3); cv2.putText(dbg, zn, (r[0] + 6, r[1] + 34), 0, 1.1, (0, 0, 255), 3)
            for e in els:
                if e['group'] == 'caption': cv2.rectangle(dbg, (e['bbox'][0], e['bbox'][1]), (e['bbox'][2], e['bbox'][3]), (0, 255, 0), 2)
            cv2.rectangle(dbg, (SAFE['x0'], SAFE['y0']), (SAFE['x1'], SAFE['y1']), (255, 255, 0), 2)
            cv2.imwrite(f'{o.out}.zones/t{T:05.2f}.jpg', cv2.resize(dbg, (540, 960)), [cv2.IMWRITE_JPEG_QUALITY, 85])
        if fi % 48 == 0: print(f'frame {fi}/{NF} {sh["id"]} s={s:.3f}', flush=True)
enc.stdin.close(); assert enc.wait() == 0, 'ffmpeg encode failed'

# ---------------- audio: voices + beds (studio -40 dB / airport -31 dB, 60 ms crossfades) + whoosh / buzz / ding / ticks ----------------
SR = 24000; NS = int(round(TOTAL * SR)); mix = np.zeros(NS + SR, np.float32)
def put(a, t0, g=1.0):
    i = int(round(t0 * SR)); n = min(len(a), len(mix) - i)
    if n > 0: mix[i:i + n] += a[:n] * g
for la in LAT: put(LINES[la['id']]['a'], la['at'])
def bed(p, db):
    if not os.path.exists(p): return np.zeros(len(mix), np.float32)
    x = pcm(p); x = np.tile(x, int(len(mix) / len(x)) + 1)[:len(mix)]; rms = float(np.sqrt(np.mean(x ** 2))) or 1; return x * (10 ** (db / 20) / rms)
studio, air = bed(f'{o.foot}/anchor/tools/amb_studio.wav', -40), bed(f'{o.foot}/airport/tools/amb_airport.wav', -31)
gate = np.zeros(len(mix), np.float32)
for sh in SHOTS:
    if sh['bank'] == 'airport': gate[int(sh['f0'] / FPS * SR):int((sh['f0'] + sh['n']) / FPS * SR)] = 1
k_ = np.ones(int(0.06 * SR), np.float32) / int(0.06 * SR); gate = np.convolve(gate, k_, 'same')
mix += studio * (1 - gate) + air * gate
fol = f'{o.foot}/anchor/tools/foley'
def sfx(name): p = f'{fol}/{name}.wav'; return pcm(p) if os.path.exists(p) else None
wh = sfx('whoosh')
if wh is not None:
    for sid in ('est', 'rule'): put(wh, max(0, SH[sid]['f0'] / FPS - 0.12), 0.16)
n_ = int(0.11 * SR); tt_ = np.arange(n_) / SR
buzz = np.concatenate([np.sign(np.sin(2 * np.pi * 196 * tt_)) * np.exp(-tt_ / 0.08), np.zeros(int(0.03 * SR)), np.sign(np.sin(2 * np.pi * 147 * tt_)) * np.exp(-tt_ / 0.10)]).astype(np.float32)
buzz = np.convolve(buzz, np.ones(9) / 9, 'same').astype(np.float32); put(buzz, MARK_T['x'], 0.07)
ding = sfx('ding')
if ding is not None: put(ding, MARK_T['ok'], 0.22); put(ding, SH['reveal']['f0'] / FPS + 0.2, 0.22)
tick = (np.sin(2 * np.pi * 1320 * np.arange(int(0.05 * SR)) / SR) * np.exp(-np.arange(int(0.05 * SR)) / (0.012 * SR))).astype(np.float32)
for k in range(3): put(tick, SH['count']['f0'] / FPS + k, 0.18)
put((np.sin(2 * np.pi * 1000 * np.arange(int(0.1 * SR)) / SR) * 10 ** (-60 / 20)).astype(np.float32), 0.0)
mix = mix[:NS]
with wave.open(o.out + '.mix.wav', 'wb') as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.out + '.video.mp4', '-i', o.out + '.mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0,aresample=48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', o.out], check=True)
os.remove(o.out + '.video.mp4')

# ---------------- timeline for qc_v7.py ----------------
link = (LZ.get('cta') or {}).get('link')
json.dump(dict(style='v7', fps=FPS, size=[W, H], total=TOTAL, n=NF, safe=SAFE, v7={k: v for k, v in V7.items()}, zones=ZONES,
               lesson=dict(id=LZ.get('id'), hook=LZ.get('hook'), hook_text=TXT['v7_h'], wrong=LZ['wrong_line'], right=LZ['key_line'], reject=LZ.get('reject')),
               hook_full='NEVER SAY “The gate is change?”', hook_blocks=['hook.pill', 'hook.quote'], cta=dict(link=link, text=(LZ.get('cta') or {}).get('text')),
               marks=MARK_T, line_shot=LSHOT, who=WHO,
               shots=[dict(id=s['id'], bank=s['bank'], clip=s['clip'], kind=s['kind'], f0=s['f0'], n=s['n'], cam=s['cam'], screen=s.get('screen'), raw=bool(s.get('raw')), mark=s.get('mark'),
                           lines=s['lines'], frames=[s['frames'][0], s['frames'][-1]]) for s in SHOTS],
               lines={la['id']: dict(at=round(la['at'], 3), dur=round(LINES[la['id']]['dur'], 3), gen=LINES[la['id']]['gen'], cues=len(LINES[la['id']]['cues']), text=TXT[la['id']], whisper=LINES[la['id']]['whisper']) for la in LAT},
               words=WORDS, captions=CAP_LOG, sharp=SHARP, panel=PANEL, edges=EDGES, frames=FRAMES), open(o.out + '.timeline.json', 'w'))
print(f'done {o.out}: {TOTAL:.2f} s, {NF} frames, shots ' + ' '.join(f"{s['id']}:{s['clip']}:{s['n']}" for s in SHOTS))
