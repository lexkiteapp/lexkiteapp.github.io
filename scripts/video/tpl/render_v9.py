#!/usr/bin/env python3
"""v9 template family on the approved v8 "one continuous talking head" engine (docs/VIDEO-TEMPLATES.md §14, teachers docs/VIDEO-TEACHERS.md).
One spec JSON per video (content/video/cine/news/templates-v1/<template>.json): teacher + set + talk clips, script lines (+ beats: 3-2-1 count,
your-turn pause), pops (rich text / picture card / twin tiles / quiz pills / stress dots / your-turn timer / CTA), accent, hook style.

  python3 scripts/video/tpl/render_v9.py --spec S.json --vo VO/vis3 --foot footage --fonts F --img IMGDIR --out out.mp4 [--preview 0,1.5]

v8 fixes (owner review 25/10):
- head mask: every text/pop box stays outside the clip's head mask (teachers.json, moved with the camera); pops live in the band under the chin.
- captions centred on the frame (x 540, width <= 2 x (924 - 540)), not on the asymmetric safe area (was 54 px left).
- no padding: pauses = the script's natural gaps (default 0.22 s, <= 0.45 s); length follows the speech (18-35 s), only declared beats are silent.
- no ping-pong: clips play forward only; the next talk clip (or the same clip's best loop point) cross-dissolves in over 10 frames; the last
  10 frames dissolve back to frame 0 so the loop is clean.
Board mode (teachers.json set with "bank", clip has bank.json "board" from board_detect.py; docs/VIDEO-TEACHERS.md §5):
- the hook and every text pop are WRITTEN ON THE WHITEBOARD: dark ink / brand colours (yellow + mint = highlighter behind navy ink), no
  stroke, warped with the board's perspective (fitted board edges), inside the detected board zone (white in every frame, off the head);
  a widget (picture card, twin tiles, quiz pills, stress pills, timer, CTA) goes on the board when it fits at >= 52 px, else the under-chin band.
- captions: CapCut style in the calm lower area measured per clip (desk lip / floor beside the teacher), 2-3 words per page.
- camera: set smax (classroom MCU = 1.0, locked), anchor = caption centre so a push never moves the body into the captions.
Captions = script tokens + TTS word times (never the whisper text). Writes <out>, <out>.timeline.json (qc_v9.py), <out>.samples/, <out>.src0.png."""
import os, sys, json, math, argparse, subprocess, wave, re, time
T_START = time.time()
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); from tokens import SAFE, C, bezier, EASE
from capsplit import paginate, single_word_pages
sys.path.insert(0, f'{ROOT}/scripts/cine'); import lipsync as LS

ap = argparse.ArgumentParser()
for a in ('spec', 'vo', 'foot', 'fonts', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--img', default='', help='folder with <h>.webp vocab images (content/lexicon/img.json)')
ap.add_argument('--teachers', default=f'{ROOT}/content/video/cine/teachers.json')
ap.add_argument('--icon', default=f'{ROOT}/brand/social/logo/lexkite-app-icon.png')
ap.add_argument('--emoji', default='/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf')
ap.add_argument('--kbps', type=int, default=8800)
ap.add_argument('--preview', default='')
ap.add_argument('--frames', default='', help='shard: render only frames a:b or shard i/N (cuts on multiples of 48) -> <out>.seg<a>.mp4 + <out>.shard<a>.json, then stop (no audio, no timeline)')
ap.add_argument('--cache', default='', help='folder for the ghost-distance matrices (pure function of the clip frames; shared by reruns and shards)')
ap.add_argument('--merge', action='store_true', help='merge the shards found next to <out> (segments + json), then the usual audio mux + timeline')
ap.add_argument('--overlay', action='store_true', help='host plate for the Remotion motion layer (scripts/video/motion): pops are planned but NOT drawn (the overlay draws them), no pop sfx; writes the per-clip moving-body mask (timeline host_move) for the overlay gates')
ap.add_argument('--clean', default='', help='with --overlay: ALSO write this caption-free plate (same frames before the captions are drawn, same audio) for the embedded lesson videos (captions = VTT track)')
ap.add_argument('--plan', default='', help='write the layout plan (pages, pops, joins, read times) to this JSON and stop (no frames)')
o = ap.parse_args()
W, H, FPS = 1080, 1920, 24
SP = json.load(open(o.spec)); TR = json.load(open(o.teachers))
SET = TR['sets'][SP['set']]; CL = {c: TR['clips'][c] for c in SP['clips'] + SP.get('listen', [])}   # listen = closed-mouth clips for the silent beats (owner 26/10)
assert all(v['set'] == SP['set'] and v['who'] == SP['teacher'] for v in CL.values()), 'one teacher, one set'
WHO = SP['teacher']; LIB = f"{o.foot}/{SET['lib']}"; SMAX = SET['smax']
BRD = None
if SET.get('bank'):
    _bk = {c['id']: c for c in json.load(open(f"{ROOT}/{SET['bank']}"))['clips']}; _b = _bk.get(SP['clips'][0], {}).get('board')
    _fam = {TR['clips'][c].get('parent') or c for c in SP['clips'] + SP.get('listen', [])}   # chained talk / listen clips start from the parent's frames: same framing
    if _b: assert _fam == {SP['clips'][0]}, ('board mode: every clip must be the first clip or one of its chained children', _fam); BRD = _b
    for c in SP['clips'] + SP.get('listen', []): _bk.setdefault(c, _bk.get(TR['clips'][c].get('parent') or c, {}))   # chained children share the parent's bank entry (same framing)
CROP = None; CA = None
def _bmask(body):
    M = np.zeros((H, W), bool); st = body['step']
    for row in filter(None, body['rows'].split(';')):
        y, iv = row.split(':'); y = int(y)
        for x in iv.split(','): a, b = map(int, x.split('-')); M[y:y + st, a:b] = True
    return M
def _mrows(M, st=8):
    out = []
    for y in range(0, H, st):
        r = M[y:y + st].any(0)
        if not r.any(): continue
        d = np.diff(np.concatenate([[0], r.astype(np.int8), [0]])); a_ = np.nonzero(d == 1)[0]; b_ = np.nonzero(d == -1)[0]
        out.append(f'{y}:' + ','.join(f'{p}-{q}' for p, q in zip(a_, b_)))
    return ';'.join(out)
def _maxrect(free, hcap=None):   # largest axis-aligned rectangle of True cells (histogram stack)
    Hh, Ww = free.shape; hts = np.zeros(Ww, int); best = (0, None)
    for y in range(Hh):
        hts = np.where(free[y], hts + 1, 0); st = []
        for x in range(Ww + 1):
            h_ = hts[x] if x < Ww else 0; s_ = x
            while st and st[-1][1] >= h_:
                s_, hh = st.pop(); a_ = min(hh, hcap or 10 ** 6) * (x - s_)
                if a_ > best[0]: best = (a_, (s_, y - hh + 1, x, y + 1))
            st.append((s_, h_))
    r_ = best[1]
    return (r_[0], r_[1], r_[2], min(r_[3], r_[1] + hcap)) if hcap else r_
V14 = bool(BRD) and SP.get('layout', 'v14') in ('v14', 'right')   # 'right' (motion layer, docs/VIDEO-MOTION.md): same v14 medium shot, but the host stays at its native x (right side) so the overlay gets the full-width top + the left column   # owner 27/10 layout v14: medium shot (same head size for every teacher) under ONE fixed lesson card on top, inside the platform-safe area
if V14:
    _h = TR['clips'][SP['clips'][0]]['head']; _k = max(1.0, min(1.2, 420 / (_h[3] - _h[1])))   # head box (hair included) -> 420 px, never a downscale, at most 1.2x (the v10 crops: host_sharp passes up to 1.2 with the 0.6 unsharp)
    _ox = 0.0 if SP.get('layout') == 'right' else min(max(0.0, (_h[0] + _h[2]) / 2 - 560 / _k), W - W / _k)   # face towards x 560 (the right 14 % is platform UI); no horizontal fill
    _oy = min(max(-180 / _k, (_h[1] + _h[3]) / 2 - 1080 / _k), H - H / _k)   # head centre towards y 1080; at most 180 px of replicated wall on top (inside the platform's top UI band, y < 232)
    _ht = (_h[1] - _oy) * _k; _q = BRD['quad']; _bx1 = (min(_q[1][0], _q[2][0]) - _ox) * _k   # board right edge on screen
    _zf = [SAFE['x0'] + 34, SAFE['y0'] + 30, int(min(SAFE['x1'] - 34, _bx1 - 30)), int(_ht) - 64]   # owner 27/10: lesson written ON the whiteboard above the head – safe area, inside the board's right edge, 64 px air over the hair
    assert _zf[3] - _zf[1] >= 240, ('v14: no room for the lesson card above the head', _zf)
    _bk[SP['clips'][0]] = dict(_bk[SP['clips'][0]], crop=dict(k=round(_k, 4), ox=round(_ox, 1), oy=round(_oy, 1), zone_force=_zf))
    BRD = {k_: v_ for k_, v_ in BRD.items() if k_ != 'zone_free'}
if BRD and _bk[SP['clips'][0]].get('crop'):   # v10 punch-in: a fixed uniform crop (k, ox, oy) of the native frame, Lanczos + mild unsharp
    CROP = _bk[SP['clips'][0]]['crop']; _k, _ox, _oy = CROP['k'], CROP['ox'], CROP['oy']
    CA = np.float32([[_k, 0, -_ox * _k], [0, _k, -_oy * _k]])
    _tp = lambda p: [round((p[0] - _ox) * _k, 1), round((p[1] - _oy) * _k, 1)]
    _tb = lambda b: [max(0, round((b[0] - _ox) * _k)), max(0, round((b[1] - _oy) * _k)), min(W, round((b[2] - _ox) * _k)), min(H, round((b[3] - _oy) * _k))]
    _B = dict(BRD); _e = BRD['edges']
    _B['quad'] = [_tp(p) for p in BRD['quad']]
    _B['edges'] = dict(top=[_e['top'][0], _k * (_e['top'][0] * _ox + _e['top'][1] - _oy)], bottom=[_e['bottom'][0], _k * (_e['bottom'][0] * _ox + _e['bottom'][1] - _oy)],
                       left=[_e['left'][0], _k * (_e['left'][0] * _oy + _e['left'][1] - _ox)], right=[_e['right'][0], _k * (_e['right'][0] * _oy + _e['right'][1] - _ox)])
    _M = cv2.warpAffine(_bmask(BRD['body']).astype(np.uint8), CA, (W, H), flags=cv2.INTER_NEAREST) > 0
    _B['body'] = dict(step=8, rows=_mrows(_M), crop=CROP)
    _P = _bmask(_B['body'])
    for c in SP['clips']:
        hb = _tb(TR['clips'][c]['head']); _P[max(0, hb[1] - 6):hb[3] + 6, max(0, hb[0] - 6):hb[2] + 6] = True
    _q = _B['quad']; _qx1 = min(_q[1][0], _q[2][0]); _qy1 = min(_q[2][1], _q[3][1])
    _fr = np.zeros((H, W), bool); _fr[SAFE['y0'] + 6:int(min(SAFE['y1'], _qy1)) - 6, SAFE['x0'] + 4:int(min(SAFE['x1'], _qx1)) - 6] = True; _fr &= ~_P
    _r = _maxrect(_fr.reshape(H // 4, 4, W // 4, 4).all((1, 3)), CROP.get('zone_hcap', 0) // 4 or None)   # bank crop.zone_hcap: prefer the wide strip over a tall narrow one (3D clip c04)
    _B['zone'] = list(CROP['zone_force']) if CROP.get('zone_force') else [v * 4 for v in _r]; _B['zone_wh'] = [_B['zone'][2] - _B['zone'][0], _B['zone'][3] - _B['zone'][1]]; _B.pop('zone_free', None)   # zone_force: bank-declared board column (crop coords), still checked by qc text_on_board / head_clear
    _rows = [y for y in range(SAFE['y0'], SAFE['y1']) if _P[y, SAFE['x0']:SAFE['x1']].any()]; _bt, _bb = max(_rows) + 8, SAFE['y1'] - 3
    if _bb - _bt >= 150:   # seated: the desk top below the hands is the caption band (screen space, full safe width)
        _B['cap'] = dict(cx=(SAFE['x0'] + SAFE['x1']) / 2, cy=(_bt + _bb) / 2, w=SAFE['x1'] - SAFE['x0'], lines=1, box=[SAFE['x0'], _bt, SAFE['x1'], _bb], body_overlap_rows=0, body_overlap_px=0)
    else:   # standing at the board: captions are written on the board (lower strip of the zone)
        _B['cap'] = dict(BRD['cap'], body_overlap_rows=max(1, BRD['cap'].get('body_overlap_rows', 1)))
    _B['cam_anchor'] = [(_B['zone'][0] + _B['zone'][2]) / 2, _B['zone'][3]]
    BRD = _B
    print(f"crop {CROP}: board zone {BRD['zone']} {BRD['zone_wh']}, caption box {BRD['cap']['box']}", flush=True)
if CROP: SMAX = 1.0   # punch-in framing is the camera: locked (no push on top of the crop)
CX = W / 2; CAPW = 2 * (SAFE['x1'] - CX)          # centred column that stays inside the safe area: 156..924
CAP_CY = 1410; BAND_Y1 = 1328; XF = 8; XFE = 14
CCX, CAPWC = (BRD['cap']['cx'], BRD['cap']['w']) if BRD else (CX, CAPW)   # caption column (board mode: calm desk lip / floor span)
FH = f"{o.fonts}/BeVietnamPro-ExtraBold.ttf"; FBd = f"{o.fonts}/BeVietnamPro-Bold.ttf"
_fc = {}
def font(sz, f=None):
    k = (f or FH, int(sz))
    if k not in _fc: _fc[k] = ImageFont.truetype(k[0], int(sz))
    return _fc[k]
ease = lambda x, p=EASE['out']: bezier(p, max(0.0, min(1.0, x)))
CAPR = -ImageFont.truetype(FH, 1000).getbbox('H', anchor='ls')[1] / 1000   # rendered cap height / font size (BeVietnamPro ExtraBold H = 0.74)
MIN_CAP = dict(caption=int(SP.get('caption_cap', 80 if SP.get('caption_style') == 'legacy' else 42)), hook=72, body=56, card=25); MIN_IMG = 300   # card = owner-approved layout-v12 mock (26/10): example lines 38 px font   # layout v12: spec caption_cap (teaching series 62: the board holds the lesson)   # v10 phone sizes (cap height px on screen; card picture side px) -> qc_v9 min_text_px
CAPF = math.ceil(MIN_CAP['caption'] / CAPR) + 1
COL = dict(white=(255, 255, 255), red=C['red'], green=C['green'], yellow=C['yellow'], cream=C['cream'], mint=C['mint'], navy=C['navy'], navy2=C['navy2'], ink=C['navy'])
STROKE = (10, 22, 26); ACT = COL[SP.get('active', 'yellow')]; ACC = COL[SP['accent']]
DISP = SP.get('display', {})
LINE_SPEC = [l for l in SP['lines'] if l.get('text')]; TXT = {l['id']: l['text'] for l in LINE_SPEC}; KEY = {l['id']: l.get('key', {}) for l in LINE_SPEC}

# ---------------- voice ----------------
def pcm(p, sr=24000):
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', p, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()
def refine(a, words, sr=24000):
    hop = sr // 200; env = np.sqrt(np.convolve(a.astype(np.float64) ** 2, np.ones(sr // 50) / (sr // 50), 'same'))[::hop]
    thr = max(float(env.max()) * 0.06, 1e-4); sp = env > thr
    on = [i * 0.005 for i in range(1, len(sp)) if sp[i] and not sp[max(0, i - 12):i].any()]
    out = []
    for k, w in enumerate(words):
        s, e = w['s'], w['e']; gap = k == 0 or s - words[k - 1]['e'] >= 0.06; rec = dict(w=w['w'], raw_s=s, raw_e=e, onset=None, checked=False)
        if gap:
            c = [t for t in on if abs(t - s) <= 0.15]
            if c: t = min(c, key=lambda t: abs(t - s)); rec.update(onset=round(t, 3), checked=True); s = t
        if out and s < out[-1]['s'] + 0.05: s = out[-1]['s'] + 0.05
        rec.update(s=round(s, 3), e=round(max(e, s + 0.08), 3)); out.append(rec)
    for k in range(len(out) - 1): out[k]['e'] = round(min(out[k]['e'], out[k + 1]['s']), 3)
    return out
LINES = {}
for l in LINE_SPEC:
    lid = l['id']; a = pcm(f'{o.vo}/{lid}.wav'); cj = json.load(open(f'{o.vo}/{lid}.json')); wj = json.load(open(f'{o.vo}/{lid}.words.json'))
    assert [w['w'] for w in wj['words']] == TXT[lid].split(), ('word timings must be on the exact script tokens', lid)
    LINES[lid] = dict(id=lid, text=TXT[lid], a=a, dur=len(a) / 24000, cues=cj['mouthCues'], gen=cj.get('generator'), words=refine(a, wj['words']),
                      whisper=wj.get('whisper'), speed=l.get('speed', SP.get('speed', 1.0)))

# ---------------- timeline: natural pacing, no stretch ----------------
GAP0, GAPMAX, TAIL = 0.60, 0.80, 1.2   # teaching pace (owner 26/10: v10 'nói hơi nhanh'): a breath between sentences
GAP_GATE = 1.05   # measured silence between lines (incl. the TTS tail) – a natural sentence pause, never stretched
t = 0.12; ATL = {}; BEATS = {}; GAPS = []; prev_end = None
for l in SP['lines']:
    if l.get('beat'):
        t += 0.12; BEATS[l['id']] = dict(kind=l['beat'], s=round(t, 3), e=round(t + l['dur'], 3)); t += l['dur'] + 0.1; prev_end = None; continue
    g = min(GAPMAX, max(GAP0, l.get('gap', GAP0))) if ATL else 0.0; t += g   # a spec gap never goes below GAP0 (teaching breath)
    if prev_end is not None: GAPS.append(dict(before=l['id'], gap=round(t - prev_end, 3)))
    ATL[l['id']] = round(t, 3); L = LINES[l['id']]; prev_end = t + L['words'][-1]['e']
    t += L['words'][-1]['e'] + (L['dur'] - L['words'][-1]['e']) * 0.5
END = t; TOTAL0 = END + TAIL; NF = int(math.ceil(TOTAL0 * FPS)); TOTAL = NF / FPS
assert 18.0 <= TOTAL <= 45.0, ('natural length outside 18-45 s', TOTAL)   # owner 26/10: slower + richer series episodes
WORDS = {}
for lid, at in ATL.items():
    for k, w in enumerate(LINES[lid]['words']):
        WORDS[f'{lid}.{k}'] = dict(line=lid, k=k, w=w['w'], s=round(at + w['s'], 3), e=round(at + w['e'], 3), raw_s=round(at + w['raw_s'], 3),
                                   onset=None if w['onset'] is None else round(at + w['onset'], 3), checked=w['checked'])
def wt(lid, k): n = len(LINES[lid]['words']); return WORDS[f'{lid}.{k % n}']
def tm_of(a):
    if a[0] == 't': return float(a[1])
    if a[0] == 'end': return TOTAL - 0.40
    off = a[3] if len(a) > 3 else 0.0
    if a[0] in BEATS: return BEATS[a[0]]['s' if a[2] == 's' else 'e'] + off
    lid, k, edge = a[0], a[1], a[2]
    if k is None: k = 0 if edge == 's' else -1
    return wt(lid, k)[edge] + off
print(f'total {TOTAL:.2f} s, {NF} frames, lines ' + ' '.join(f'{k}@{v:.2f}' for k, v in ATL.items()) + ' beats ' + json.dumps(BEATS), flush=True)

# ---------------- clips: forward play, cross-dissolves between talk clips, no reverse ----------------
def clip_path(c):   # raw host (default): the original Kling clip; lipsync mode keeps the dl24 copy its mouth track was built on
    raw_ = f"{LIB}/clips/{c}.mp4"
    return raw_ if SP.get('host_fx', 'raw') == 'raw' and os.path.exists(raw_) else f"{LIB}/{SET['path']}/{c}.mp4"
RAW = {}
for c, v in CL.items():
    cap = cv2.VideoCapture(clip_path(c)); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    lo, hi = v['usable']; RAW[c] = fr[:hi + 1]; assert len(RAW[c]) > lo + 3 * XF, ('clip too short', c, len(fr))
    assert fr[0].shape[1] == W and fr[0].shape[0] in (1916, 1920), ('clip size', c, fr[0].shape)
# ---- v11 smooth motion (owner 26/10: "hình hơi giật lag"): Kling's flat-2D clips hold a pose for 1-6 frames and then jump
# (13 % still frames on c01). Each short hold is replaced by flow in-betweens from the held pose to the next new pose (positions follow
# the time, no pixel blend -> no see-through hand); longer stills are real pauses and stay. The mouth track moves the same way.
def _tween(Fa, Fb, w):
    h_, w_ = Fa.shape[:2]; ga = cv2.cvtColor(cv2.resize(Fa, (w_ // 2, h_ // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    gb = cv2.cvtColor(cv2.resize(Fb, (w_ // 2, h_ // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    gx, gy = np.meshgrid(np.arange(w_, dtype=np.float32), np.arange(h_, dtype=np.float32))
    if w < 0.5: f = cv2.resize(cv2.calcOpticalFlowFarneback(ga, gb, None, 0.5, 5, 31, 4, 7, 1.5, 0), (w_, h_)) * 2; return cv2.remap(Fa, gx - w * f[..., 0], gy - w * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    f = cv2.resize(cv2.calcOpticalFlowFarneback(gb, ga, None, 0.5, 5, 31, 4, 7, 1.5, 0), (w_, h_)) * 2; return cv2.remap(Fb, gx - (1 - w) * f[..., 0], gy - (1 - w) * f[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
HOSTFX = SP.get('host_fx', 'raw'); print('host_fx', HOSTFX, flush=True)   # raw = the Kling clip as generated (owner 26/10): no mouth swap, no hold smoothing
HOLDS = {}; MOTION = dict(held_frames_smoothed=0, holds=0, host_fx=HOSTFX)
for c, fr in (RAW.items() if HOSTFX != 'raw' else []):
    g = [cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (135, 240)).astype(np.float32) for f in fr]
    d = np.array([np.abs(g[k + 1] - g[k]).mean() for k in range(len(g) - 1)]); thr = max(0.12, 0.2 * float(np.median(d))); runs = []; k = 0
    while k < len(d):
        if d[k] < thr:
            a = k
            while k < len(d) and d[k] < thr: k += 1
            if k < len(d) and k - a <= 6 and a > 0: runs.append((a, k + 1))   # frames a+1..k held, k+1 = next new pose
        else: k += 1
    for a, b in runs:
        for i in range(a + 1, b): fr[i] = _tween(fr[a], fr[b], (i - a) / (b - a))
        MOTION['held_frames_smoothed'] += b - a - 1
    HOLDS[c] = runs; MOTION['holds'] += len(runs)
print('smooth motion:', MOTION, flush=True)
SMALL = {c: [cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (135, 240)).astype(np.float32) for f in fr] for c, fr in RAW.items()}
def _face(c, f):
    x0, y0, x1, y1 = CL[c]['head']; y1 = min(y1, f.shape[0]); g = cv2.cvtColor(f[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY); return cv2.resize(g, ((x1 - x0) // 2, (y1 - y0) // 2)).astype(np.float32)
FACE_S = {c: [_face(c, f) for f in fr] for c, fr in RAW.items()}
GHOST_T = 28   # grey-level step that reads as a double image when two frames are blended (an arm / hand / blink in two places)
def _ghost(A, B):   # D[i, j] = share of pixels that differ by > GHOST_T (ghost area): whole frame (arms, hands, head outline) + 0.25 x the face crop
    A = A.reshape(len(A), -1).astype(np.uint8); B = B.reshape(len(B), -1).astype(np.uint8)   # grey levels are integers: uint8 |a-b| is exactly the float32 one, at a quarter of the memory traffic
    return np.stack([((np.maximum(B, A[i][None]) - np.minimum(B, A[i][None])) > GHOST_T).mean(1) for i in range(len(A))])
DM = {}
def _dm_pair(c1, c2):
    if True:
        a1, a2 = np.stack(SMALL[c1]), np.stack(SMALL[c2]); D = _ghost(a1, a2)
        if FACE_S[c1][0].shape == FACE_S[c2][0].shape: D = D + 0.25 * _ghost(np.stack(FACE_S[c1]), np.stack(FACE_S[c2]))
        if BRD:   # v10: the moving body (arms, hands) weighs in on its own: a seam joins matching arm poses, never a raised arm into a lowered one
            ys_, xs_ = np.nonzero(_bmask(_bk[c1]['board']['body'])); y0_, y1_, x0_, x1_ = ys_.min() // 8, ys_.max() // 8 + 1, xs_.min() // 8, xs_.max() // 8 + 1
            D = D + 1.5 * _ghost(a1[:, y0_:y1_, x0_:x1_], a2[:, y0_:y1_, x0_:x1_])
        return D * 100   # percent of the frame
import hashlib, pickle
from concurrent.futures import ThreadPoolExecutor
_h = hashlib.md5(); _h.update(repr((GHOST_T, BRD is not None)).encode())
for c_ in sorted(RAW): _h.update(c_.encode()); _h.update(np.stack(SMALL[c_]).tobytes()); _h.update(np.stack(FACE_S[c_]).tobytes()); _h.update(json.dumps(_bk[c_]['board']['body'], default=str).encode() if BRD else b'')
DMF = f'{o.cache}/dm-{_h.hexdigest()}.pkl' if o.cache else ''
print(f'[timing] clips loaded {time.time() - T_START:.0f} s', flush=True)
if DMF and os.path.exists(DMF): DM = pickle.load(open(DMF, 'rb')); print('ghost matrices: cache hit', flush=True)
else:
    _pairs = [(c1, c2) for c1 in RAW for c2 in RAW]
    with ThreadPoolExecutor(os.cpu_count() or 2) as ex: DM = dict(zip(_pairs, ex.map(lambda q: _dm_pair(*q), _pairs)))   # numpy drops the GIL: the clip pairs run side by side
    if DMF: os.makedirs(o.cache, exist_ok=True); pickle.dump(DM, open(DMF, 'wb'))
print(f'[timing] ghost matrices {time.time() - T_START:.0f} s', flush=True)
def dif(c1, i1, c2, i2): return float(DM[(c1, c2)][i1, i2])
SEAM = {}   # SEAM[(c, n)][b, e] = mean distance over the whole dissolve (c: b-XF+1 .. b  ->  n: e .. e+XF-1), worst frame weighted in
for (c1, c2), D in DM.items():
    N1, N2 = D.shape; acc = np.zeros((N1, N2)); mx = np.zeros((N1, N2)); acc[:] = np.inf
    k1, k2 = N1 - XF + 1, N2 - XF + 1; sm = np.zeros((k1, k2)); m_ = np.zeros((k1, k2))
    for q in range(XF): sl = D[q:q + k1, q:q + k2]; sm += sl; m_ = np.maximum(m_, sl)
    acc[XF - 1:, :k2] = sm / XF + 0.5 * m_; SEAM[(c1, c2)] = acc
def plan(nf, a0=None):
    order = SP['clips']; seq = []; c = order[0]; a = CL[c]['usable'][0] if a0 is None else a0; joins = []; used = {}
    while len(seq) < nf + XF:
        hi = len(RAW[c]) - 1; best = None; need = nf + XF - len(seq)
        for n in order:   # next = any talk clip of this teacher or a loop point of the same clip, anywhere in it: the cleanest dissolve wins
            lo_n = CL[n]['usable'][0]; S_ = SEAM[(c, n)]
            b0 = hi if a + need + XF - 1 <= hi else min(hi, max(a + 72, hi - 36))   # v12 (owner 26/10 'giật lag'): play (almost) the whole clip before a join – exits only in its last 1.5 s, so a 10 s clip loops ~4x, not 10x
            for b in range(b0, hi + 1):
                row = S_[b, lo_n:len(RAW[n]) - 60]
                if not len(row): continue
                if n == c: row = np.where(np.arange(lo_n, lo_n + len(row)) < b - 60, row, np.inf)   # same clip: jump back >= 60 frames
                e = int(np.argmin(row * np.array([1 + 0.25 * used.get((c, b, n, lo_n + i), 0) for i in range(len(row))]))); d = float(row[e]); e += lo_n
                if not np.isfinite(d): continue
                d *= (0.92 if n != c else 1.0) * (1 + 0.25 * used.get((c, b, n, e), 0))
                if best is None or d < best[0]: best = (d, b, e, n)
        _, b, e, n = best; used[(c, b, n, e)] = used.get((c, b, n, e), 0) + 1
        for k in range(a, b - XF + 1): seq.append([(c, k, 1.0)])
        for q in range(XF):
            w = (q + 1) / (XF + 1); seq.append([(c, b - XF + 1 + q, 1 - w), (n, e + q, w)])
        joins.append(dict(at_frame=len(seq) - XF, from_clip=c, exit=b, to_clip=n, entry=e, diff=round(best[0], 2)))
        c, a = n, e + XF
    seq = seq[:nf]; c0 = SP['clips'][0]; a0 = CL[c0]['usable'][0] if a0 is None else a0
    for q in range(XFE):   # final dissolve back to frame 0 (loop)
        w = ease((q + 1) / XFE, EASE['inout']); fi = nf - XFE + q
        seq[fi] = [(cc, kk, ww * (1 - w)) for cc, kk, ww in seq[fi] if ww * (1 - w) > 1e-4] + [(c0, a0 - XFE + 1 + q, w)]   # target plays forward INTO the loop frame
    seq[-1] = [(c0, a0, 1.0)]
    return seq, joins
def end_score(a0):   # ghosting of the final loop dissolve: mean + worst distance over its 14 frames (outgoing pose vs the loop frames)
    sq, _ = plan(NF, a0); c0 = SP['clips'][0]; ds = []
    for q in range(XFE):
        c, k, _w = max(sq[NF - XFE + q][:-1] or [(c0, a0 - XFE + 1 + q, 1)], key=lambda x: x[2]); ds.append(dif(c, k, c0, a0 - XFE + 1 + q))
    return float(np.mean(ds) + 0.5 * max(ds))
_c0 = SP['clips'][0]; _lo = CL[_c0]['usable'][0]
A0 = min(range(max(_lo, XFE), len(RAW[_c0]) - 64, 3), key=end_score)   # start frame chosen so the loop dissolve joins similar poses
def _hs(f_):
    h_ = cv2.calcHist([cv2.cvtColor(f_, cv2.COLOR_BGR2HSV)], [0, 1], None, [30, 32], [0, 180, 0, 256]); cv2.normalize(h_, h_); return h_
def off_model(c):   # source frames whose head box does not match the family master face (hand over the face, drift): the gated plan never shows them
    if c in OFFM: return OFFM[c]
    par = TR['clips'][c].get('parent') or c; hb = TR['clips'][par]['head']; src_ = RAW[par][CL[par]['usable'][0]] if par in RAW else RAW[c][0]; ref = _hs(src_[hb[1]:hb[3], hb[0]:hb[2]])
    OFFM[c] = {k for k in range(len(RAW[c])) if cv2.compareHist(ref, _hs(RAW[c][k][hb[1]:hb[3], hb[0]:hb[2]]), cv2.HISTCMP_CORREL) < 0.75}
    OFFM[c] |= {k for a_, b_ in TR['clips'][c].get('avoid', []) for k in range(a_, b_ + 1)}   # bank QC: frame ranges marked 'avoid' (profile glance, fast sway, 'o' lips in a listen clip)
    return OFFM[c]
OFFM = {}
MOOD_RX = [('question', r'\?'), ('wow', r"\b(careful|actually|fun fact|surprise|wait|in america|in britain|in the us|in the uk|most americans|really)\b"),
           ('excited', r"!|\b(great|amazing|awesome|excellent|perfect|well done|love|nice)\b")]
def line_mood(lid):   # owner 27/10 "tự nhiên": the teacher's clip follows the line – spec 'mood' wins, else question / reveal / excited from the text, else 'present' when a board card appears during the line
    l = next(x for x in SP['lines'] if x['id'] == lid)
    if l.get('mood'): return l['mood']
    for m, rx in MOOD_RX:
        if re.search(rx, l.get('text', '').lower()): return m
    a_, b_ = ATL[lid], ATL[lid] + LINES[lid]['words'][-1]['e']
    if any(p.get('kind') in ('lesson', 'note', 'card', 'pair') and a_ - 0.3 <= tm_of(p['from']) <= b_ for p in SP['pops'] if p.get('from')): return 'present'
    return 'talk'
def line_at(fr):   # the spoken line around frame fr (gated runs start on a line's first word)
    t_ = fr / FPS; best = None
    for lid, at in ATL.items():
        if at - 0.3 <= t_ <= at + LINES[lid]['words'][-1]['e'] + 0.2: best = lid
    return best
MOODS = []; MOOD_CAP = dict(excited=1, wow=1, question=2)   # owner 27/10 "ko lố": strong expressions only for the best line(s); the rest stays calm
def plan_gated(nf):
    talk = SP['clips']; lis = SP['listen']; sp = np.zeros(nf, bool)
    for lid, at in ATL.items():
        w_ = LINES[lid]['words']; a_, b_ = int((at + w_[0]['s'] - 0.08) * FPS), int((at + w_[-1]['e'] + 0.12) * FPS); sp[max(0, a_):min(nf, b_ + 1)] = True
    runs = []; i = 0
    while i < nf:
        j = i
        while j < nf and sp[j] == sp[i]: j += 1
        runs.append([bool(sp[i]), i, j]); i = j
    for r in runs:   # short breaths stay on the talk clip (no flicker cuts)
        if not r[0] and r[2] - r[1] < int(0.5 * FPS) and r[1] > 0: r[0] = True
    cur = {c: CL[c]['usable'][0] for c in talk + lis}; ti = 0; seq = []; joins = []; prev = None; used = {}
    mood_of = lambda c: TR['clips'][c].get('mood', 'talk')
    def pick(want, last):   # mood-matched clip, never the clip just shown, least used first; fall back to plain talk / presenting clips
        for pool in ([c for c in talk if mood_of(c) == want], [c for c in talk if mood_of(c) in ('talk', 'present')], talk):
            cs = [c for c in pool if c != last] or pool
            if cs: return min(cs, key=lambda c: (used.get(c, 0), talk.index(c)))
    for talking, a_, b_ in runs:
        n_ = b_ - a_
        if talking:
            lid_ = line_at(a_); want = line_mood(lid_) if lid_ else 'talk'
            if want in MOOD_CAP and sum(1 for _, w_, c_ in MOODS if w_ == want and mood_of(c_) == want) >= MOOD_CAP[want]: want = 'talk'
            c_run = pick(want, prev[0] if prev else None); used[c_run] = used.get(c_run, 0) + 1; MOODS.append((lid_, want, c_run))
        while n_ > 0:
            c = c_run if talking else lis[0]; hi = CL[c]['usable'][1]
            if cur[c] > hi - 6: cur[c] = CL[c]['usable'][0]
            if talking and prev is not None and prev[0] == c and cur[c] == CL[c]['usable'][0]: c_run = c = pick(want, c); used[c] = used.get(c, 0) + 1; hi = CL[c]['usable'][1]
            bad_ = off_model(c); g_ = 0
            while cur[c] in bad_ and g_ < 2 * (hi + 1):   # jump over off-model frames (a declared hard cut)
                cur[c] += 1; g_ += 1
                if cur[c] > hi - 6: cur[c] = CL[c]['usable'][0]
            assert cur[c] not in bad_, ('no on-model frames left in', c)
            nb_ = min([k for k in bad_ if k > cur[c]] + [hi + 1])
            m_ = min(n_, hi - cur[c] + 1, nb_ - cur[c])
            if prev is not None and (prev[0] != c or prev[1] != cur[c]): joins.append(dict(at_frame=len(seq), to_clip=c, entry=cur[c], cut='hard', talking=talking))
            seq += [[(c, k, 1.0)] for k in range(cur[c], cur[c] + m_)]; cur[c] += m_; n_ -= m_; prev = (c, cur[c])
    seq = seq[:nf]; c0, k0 = seq[0][0][0], seq[0][0][1]
    for q in range(XFE):   # loop: the last frames dissolve into frame 0 (an edit transition, the host pixels are untouched)
        w = ease((q + 1) / XFE, EASE['inout']); fi = nf - XFE + q
        seq[fi] = [(cc, kk, ww * (1 - w)) for cc, kk, ww in seq[fi] if ww * (1 - w) > 1e-4] + [(c0, k0, w)]
    seq[-1] = [(c0, k0, 1.0)]
    return seq, joins
def move_mask(c):   # cells (8 px) where the teacher actually moves in this clip (hands, arms, head): text over them = occlusion
    fr_ = [cv2.resize(cv2.cvtColor(norm_frame(RAW[c][k]), cv2.COLOR_BGR2GRAY), (W // 8, H // 8), interpolation=cv2.INTER_AREA).astype(np.int16) for k in range(CL[c]['usable'][0], min(len(RAW[c]), CL[c]['usable'][1] + 1), 3)]
    med = np.median(np.stack(fr_), 0); m_ = np.zeros_like(med, bool)
    for f_ in fr_: m_ |= np.abs(f_ - med) > 28
    return cv2.dilate(m_.astype(np.uint8), np.ones((3, 3), np.uint8)) > 0
if SP.get('listen'):
    SEQ, JOINS = plan_gated(NF); print('gated plan: talk while the voice speaks, listen clip in silences', flush=True)
else: SEQ, JOINS = plan(NF, A0)
print(f'loop frame {_c0}:{A0} end diff {end_score(A0):.2f}', flush=True)
print('joins', JOINS, flush=True); print('moods', MOODS, flush=True)
MO = {c: LS.Mouth(f"{LIB}/{SET['meta']}/{c}/{WHO}") for c in CL} if HOSTFX != 'raw' else {}   # raw host needs no mouth track
for c, runs in (HOLDS.items() if MO else []):   # v11: the mouth track moves with the smoothed in-betweens
    MS_ = MO[c].MS
    for a, b in runs:
        if b < len(MS_):
            for i in range(a + 1, b): MS_[i] = MS_[a] + (MS_[b] - MS_[a]) * (i - a) / (b - a)
def norm_frame(F, crop=True):
    if F.shape[0] != H:
        r = cv2.resize(F, (round(W * H / F.shape[0]), H), interpolation=cv2.INTER_LANCZOS4); x0 = (r.shape[1] - W) // 2; F = r[:, x0:x0 + W].copy()   # uniform 1916 -> 1920
    if CROP and crop:   # punch-in: Lanczos resample + mild unsharp (host_sharp measures it against the native pixels)
        if CROP.get('oy', 0) < 0:   # v14: the space opened above the frame is WALL (the set continues above the board), not a stretched board-frame row
            wall = [float(v) for v in np.median(F[4:60, W - 90:W - 10].reshape(-1, 3), 0)]
            F = cv2.warpAffine(F, CA, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=wall)
            top_ = int(math.ceil(-CROP['oy'] * CROP['k'])) + 2   # soften the seam: 10 px blend from the wall into the first real row
            if 10 < top_ < H: F[top_ - 10:top_] = (F[top_ - 10:top_].astype(np.float32) * np.linspace(0, 1, 10)[:, None, None] + np.array(wall, np.float32) * (1 - np.linspace(0, 1, 10)[:, None, None])).astype(np.uint8)
        else: F = cv2.warpAffine(F, CA, (W, H), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE)
        a_ = CROP.get('sharp', 0.6); F = cv2.addWeighted(F, 1 + a_, cv2.GaussianBlur(F, (0, 0), CROP.get('sigma', 1.1)), -a_, 0)
    return F

# ---------------- camera: uniform scale about the face, slow push + punch-ins ----------------
HEAD_RAW = {c: list(v['head']) for c, v in CL.items()}
if CROP: CL = {c: dict(v, head=_tb(v['head']), anchor=_tp(v['anchor'])) for c, v in CL.items()}
AXY = {c: tuple(v['anchor']) for c, v in CL.items()}; AX, AY = AXY[SP['clips'][0]]
assert len(set(AXY.values())) == 1, 'one camera anchor per set'
if BRD:   # push about the caption centre (board captions: the lower strip of the board zone; else the measured desk lip / floor)
    if BRD.get('zone_free'): _zf = BRD['zone_free']; AX, AY = (_zf[0] + _zf[2]) / 2, _zf[3] - 64
    else: AX, AY = BRD['cam_anchor']
HEAD = {c: v['head'] for c, v in CL.items()}
PUNCH = []
for p in SP.get('punch', []): PUNCH.append((tm_of(p['from']), tm_of(p['to']), p.get('amp', 0.04)))
if not PUNCH and SMAX > 1.0:   # default: punch on the first pop after the hook and on the last answer/fix pop
    cand = [p for p in SP['pops'] if p.get('role') != 'hook' and p['kind'] not in ('cta',)]
    for p in (cand[0], cand[-1]) if len(cand) > 1 else cand:
        a = tm_of(p['from']); PUNCH.append((a, min(a + 2.2, tm_of(p['to'])), 0.035 if SMAX < 1.08 else 0.05))
PUSH = 0.0 if SMAX <= 1.0 else (0.025 if SMAX < 1.08 else 0.035); TB = TOTAL - 1.35
def bump(T, a, b, amp, ri=0.22, ro=0.30):
    if T < a or T > b + ro: return 0.0
    return amp * (ease((T - a) / ri) if T < b else 1 - ease((T - b) / ro, EASE['inout']))
def cam(T):
    base = PUSH * ease(T / TB, EASE['inout']) if T < TB else PUSH * (1 - ease((T - TB) / 1.15, EASE['inout']))
    return min(SMAX, 1.0 + base + sum(bump(T, a, b, amp) for a, b, amp in PUNCH))
_mc = {}
def maps_c(s):
    k = round(s, 4)
    if k not in _mc:
        if len(_mc) > 6: _mc.clear()
        X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
        _mc[k] = ((AX + (X - AX) / k).astype(np.float32), (AY + (Y - AY) / k).astype(np.float32))
    return _mc[k]
def sharpen(img, s):
    if s <= 1.001: return img
    amt = min(0.9, (s - 1.0) * 9.0); b = cv2.GaussianBlur(img, (0, 0), 1.0); return cv2.addWeighted(img, 1 + amt, b, -amt, 0)
def to_screen(b, s): x0, y0, x1, y1 = b; return [AX + (x0 - AX) * s, AY + (y0 - AY) * s, AX + (x1 - AX) * s, AY + (y1 - AY) * s]
HEAD_MAX = [min(to_screen(h, SMAX)[k] for h in HEAD.values()) if k < 2 else max(to_screen(h, SMAX)[k] for h in HEAD.values()) for k in range(4)]
BAND = (int(math.ceil(HEAD_MAX[3])) + 14, BAND_Y1); BAND_CY = (BAND[0] + BAND[1]) / 2; BAND_H = BAND[1] - BAND[0]
print(f'pop band y {BAND[0]}..{BAND[1]} ({BAND_H} px), head at smax {[round(v) for v in HEAD_MAX]}', flush=True)
assert BAND_H >= 240 or BRD, 'no room under the chin for pops'
POPW, POPH = CAPW, BAND_H; ZONE = None; MINPX_BOARD = 48; MINPX_TEXT = 50
if BRD:
    _z = BRD.get('zone_free') or BRD['zone']; ZONE = [_z[0] + 4, _z[1] + 4, _z[2] - 4, _z[3] - 4]
    if BRD.get('zone_free'):   # trim to the camera-safe window: every point stays inside SAFE at every scale 1..smax about (AX, AY)
        ZONE = [max(ZONE[0], math.ceil(AX - (AX - SAFE['x0']) / SMAX) + 1), max(ZONE[1], math.ceil(AY - (AY - SAFE['y0']) / SMAX) + 1),
                min(ZONE[2], math.floor(AX + (SAFE['x1'] - AX) / SMAX) - 1), min(ZONE[3], math.floor(AY + (SAFE['y1'] - AY) / SMAX) - 1)]
    ZW, ZH = ZONE[2] - ZONE[0], ZONE[3] - ZONE[1]
    _e = BRD['edges']; Tl = lambda x: _e['top'][0] * x + _e['top'][1]; Bl = lambda x: _e['bottom'][0] * x + _e['bottom'][1]
    Ll = lambda y: _e['left'][0] * y + _e['left'][1]; Rl = lambda y: _e['right'][0] * y + _e['right'][1]
    _xc, _yc = (ZONE[0] + ZONE[2]) / 2, (ZONE[1] + ZONE[3]) / 2; _src = []; _dst = []
    for x, y in ((ZONE[0], ZONE[1]), (ZONE[2], ZONE[1]), (ZONE[2], ZONE[3]), (ZONE[0], ZONE[3])):   # rows follow the board's top/bottom edges
        v = (y - Tl(_xc)) / (Bl(_xc) - Tl(_xc)); u = (x - Ll(_yc)) / (Rl(_yc) - Ll(_yc))
        y2 = Tl(x) + v * (Bl(x) - Tl(x)); x2 = Ll(y) + u * (Rl(y) - Ll(y))
        _src.append((x, y)); _dst.append((x + max(-6, min(6, x2 - x)), y + max(-6, min(6, y2 - y))))
    _cx_, _cy_ = (sum(p[0] for p in _dst) / 4, sum(p[1] for p in _dst) / 4)   # keep the warped zone inside the zone (shrink about its centre)
    _over = max(max(ZONE[0] - min(p[0] for p in _dst), max(p[0] for p in _dst) - ZONE[2], 0) / (ZW / 2), max(ZONE[1] - min(p[1] for p in _dst), max(p[1] for p in _dst) - ZONE[3], 0) / (ZH / 2))
    _dst = [(_cx_ + (p[0] - _cx_) / (1 + _over), _cy_ + (p[1] - _cy_) / (1 + _over)) for p in _dst]
    GB = cv2.getPerspectiveTransform(np.float32(_src), np.float32(_dst)) if not V14 else np.eye(3, dtype=np.float64)   # v14: a flat screen card, not ink on the board
    print(f'board zone {ZONE} ({ZW}x{ZH}), perspective {[[round(a, 1) for a in p] for p in _dst]}, captions cx {CCX} w {CAPWC}', flush=True)
PSC = 1.0
if BRD:   # smallest vertical scale of the board perspective inside the zone: board text is set so its cap height clears the minimum after the warp
    def _vs(x, y): q_ = cv2.perspectiveTransform(np.float32([[[x, y - 20], [x, y + 20]]]), GB)[0]; return float(np.hypot(*(q_[1] - q_[0]))) / 40
    PSC = min(_vs(x, y) for x in np.linspace(ZONE[0], ZONE[2], 5) for y in np.linspace(ZONE[1], ZONE[3], 5))
MINF_HOOK = math.ceil(MIN_CAP['hook'] / CAPR / PSC) + 1; MINF_BODY = math.ceil(MIN_CAP['body'] / CAPR / PSC) + 1
print(f'min sizes: caption {CAPF}px, hook {MINF_HOOK}px, body {MINF_BODY}px font (cap ratio {CAPR:.3f}, board perspective {PSC:.3f}), card picture {MIN_IMG}px', flush=True)
KMAX = 170 if V14 else 100   # v14: board text as large as the board allows (owner 27/10 'nội dung hơi nhỏ'), up to 1.7x the v12 mock; the fit loop takes the largest scale that fits
INK = False   # True while a pop is being built for the whiteboard (dark ink, no stroke, highlighter)
INKCOL = dict(white=C['navy'], cream=C['navy'], navy=C['navy'], navy2=C['navy2'], ink=C['navy'], red=(214, 64, 34), green=(20, 138, 74), yellow=C['navy'], mint=C['navy'])
HILITE = dict(yellow=(255, 201, 74), mint=(160, 222, 200))

# ---------------- drawing primitives ----------------
def rgba_np(im): a = np.asarray(im).astype(np.float32); return a[..., :3][..., ::-1].copy(), a[..., 3] / 255
def over(F, rgb, al, x, y, mult=1.0):
    h, w = al.shape; X0, Y0 = max(0, x), max(0, y); X1, Y1 = min(W, x + w), min(H, y + h)
    if X1 <= X0 or Y1 <= Y0 or mult <= 0: return
    a = al[Y0 - y:Y1 - y, X0 - x:X1 - x, None] * mult; r = F[Y0:Y1, X0:X1].astype(np.float32)
    F[Y0:Y1, X0:X1] = np.clip(r * (1 - a) + rgb[Y0 - y:Y1 - y, X0 - x:X1 - x] * a, 0, 255).astype(np.uint8)
def shadowed(im, off=6, blur=7, k=0.55):
    a = np.asarray(im)[..., 3].astype(np.float32) / 255; sh = cv2.GaussianBlur(np.roll(a, off, axis=0), (0, 0), blur) * k
    arr = np.zeros((im.size[1], im.size[0], 4), np.uint8); arr[..., 3] = (sh * 255).astype(np.uint8); base = Image.fromarray(arr); base.alpha_composite(im); return base
def stack(rows, gap=8, align='c'):   # align 'l': list rows share one left edge (owner 26/10: "thẳng hàng thẳng lối")
    w = max(r.width for r in rows); h = sum(r.height for r in rows) + gap * (len(rows) - 1); im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); y = 0
    for r in rows: im.alpha_composite(r, (0 if align == 'l' else (w - r.width) // 2, y)); y += r.height + gap
    return im
def hrow(items, gap=18):
    w = sum(i.width for i in items) + gap * (len(items) - 1); h = max(i.height for i in items); im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); x = 0
    for i in items: im.alpha_composite(i, (x, (h - i.height) // 2)); x += i.width + gap
    return im
def badge(kind, d_=84):
    im = Image.new('RGBA', (d_ * 2, d_ * 2), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    col = dict(x=COL['red'], ok=COL['green'], q=COL['mint'])[kind]; c = d_; r = d_ * 0.42; w = 22
    g.ellipse([4, 4, 2 * d_ - 4, 2 * d_ - 4], fill=col + (255,), outline=(255, 255, 255, 255), width=10)
    if kind == 'x': g.line([(c - r, c - r), (c + r, c + r)], fill=(255, 255, 255, 255), width=w); g.line([(c - r, c + r), (c + r, c - r)], fill=(255, 255, 255, 255), width=w)
    elif kind == 'ok': g.line([(c - r, c + 2), (c - r * 0.25, c + r * 0.7), (c + r, c - r * 0.6)], fill=(255, 255, 255, 255), width=w, joint='curve')
    else: g.text((c, c + 6), '?', font=font(d_ * 1.3), fill=COL['navy'] + (255,), anchor='mm')
    return im.resize((d_, d_), Image.LANCZOS)
def num_disc(n, d_=150):
    im = Image.new('RGBA', (d_ * 2, d_ * 2), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    g.ellipse([6, 6, 2 * d_ - 6, 2 * d_ - 6], fill=ACC + (255,), outline=(255, 255, 255, 255), width=12)
    g.text((d_, d_ + 8), str(n), font=font(d_ * 1.45), fill=COL['navy'] + (255,), anchor='mm'); return im.resize((d_, d_), Image.LANCZOS)
EMO_OK = os.path.exists(o.emoji); EMO_USED = {}
def emoji_im(ch, sz):
    if EMO_OK:
        try:
            fo = ImageFont.truetype(o.emoji, 109); im = Image.new('RGBA', (320, 200), (0, 0, 0, 0)); ImageDraw.Draw(im).text((160, 100), ch, font=fo, anchor='mm', embedded_color=True)
            bb = im.getbbox()
            if bb and (bb[2] - bb[0]) > 60:
                c = im.crop(bb); k = sz / c.height; EMO_USED[ch] = 'noto'; return c.resize((max(1, round(c.width * k)), sz), Image.LANCZOS)
        except Exception as e: print('emoji fallback', ch, e)
    EMO_USED[ch] = 'vector'; im = Image.new('RGBA', (sz * 2, sz * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([4, 4, sz * 2 - 4, sz * 2 - 4], fill=ACC + (255,), outline=(255, 255, 255, 255), width=8); return im.resize((sz, sz), Image.LANCZOS)
def tok_txt(s):
    if not s.startswith('@'): return s
    k = s[1:]; return {'x': '✗', 'ok': '✓', 'q': '?'}.get(k, k.split(':', 1)[1] if ':' in k else '')
def rich_row(segs, sz, plate=False):
    """[[text, colour] | ['@x'|'@ok'|'@q'|'@num:5'|'@emoji:🔊']] -> RGBA row. Consecutive text segments are set as ONE line (true spacing);
    badges / emoji sit between runs. Dark stroke on video, plain text on a plate."""
    ink = INK and not plate; ss = 2; st = 0 if (plate or ink) else max(8, round(sz * 0.12)); fo = font(sz * ss); items = []; run = []
    def flush():
        if not run: return
        txt = ''.join(t_ for t_, _ in run); tw = int(fo.getlength(txt)) + 4 * st * ss + 8 + (24 if ink else 0); th = int(sz * ss * 1.5) + 4 * st * ss
        im = Image.new('RGBA', (tw, th), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = 2 * st * ss + 4 + (12 if ink else 0)
        if ink:   # highlighter swash behind yellow / mint words (navy ink on top)
            xh = x
            for t_, c_ in run:
                wl = fo.getlength(t_)
                if c_ in HILITE and t_.strip():
                    lead = fo.getlength(t_) - fo.getlength(t_.lstrip()); trail = fo.getlength(t_) - fo.getlength(t_.rstrip())
                    d.rounded_rectangle([xh + lead - 10, th // 2 - sz * ss * 0.40, xh + wl - trail + 10, th // 2 + sz * ss * 0.46], round(sz * ss * 0.14), fill=HILITE[c_] + (235,))
                xh += wl
        for t_, c_ in run:
            d.text((x, th // 2), t_, font=fo, fill=(INKCOL[c_] if ink else COL[c_]) + (255,), anchor='lm', stroke_width=st * ss, stroke_fill=STROKE + (255,)); x += fo.getlength(t_)
        im = im.reduce(ss); bb = im.getbbox() or (0, 0, 1, 1); cy = im.height // 2; hh = round(sz * (0.50 if ink else 0.62)) + st   # board ink: tight rows
        items.append(im.crop((bb[0], min(bb[1], cy - hh), bb[2], max(bb[3], cy + hh)))); run.clear()
    for seg in segs:
        s_ = seg[0]
        if s_.startswith('@'):
            flush(); k = s_[1:]
            if k in ('x', 'ok', 'q'): items.append(badge(k, round(sz * 1.0)))
            elif k.startswith('num:'): items.append(num_disc(k[4:], round(sz * 1.75)))
            elif k.startswith('emoji:'): items.append(emoji_im(k[6:], round(sz * 0.95)))
            elif k.startswith('ipa:'): items.append(ipa_im(k[4:], sz, ink))
        else: run.append((s_, seg[1]))
    flush()
    return hrow(items, round(sz * 0.18))
def ipa_im(txt, sz, ink):   # US IPA (owner 26/10: "ghi phiên âm luôn"): Noto Sans has every IPA glyph (Be Vietnam Pro has none of ˈəɪʊ…)
    ss = 2; z = sz; fo = ImageFont.truetype(f"{o.fonts}/NotoSans-Medium.ttf", z * ss); st = 0 if ink else max(6, round(z * 0.10))
    tw = int(fo.getlength(txt)) + 4 * st * ss + 8; th = int(z * ss * 1.6) + 4 * st * ss; im = Image.new('RGBA', (tw, th), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((2 * st * ss + 4, th // 2), txt, font=fo, fill=(C['navy2'] if ink else (255, 255, 255)) + (255,), anchor='lm', stroke_width=st * ss, stroke_fill=STROKE + (255,))
    im = im.reduce(ss); bb = im.getbbox() or (0, 0, 1, 1); return im.crop((bb[0], bb[1] - 4, bb[2], bb[3] + 4))
LCOL = dict(green=(20, 138, 74), blue=(40, 90, 160), red=(214, 64, 34), navy=(22, 52, 64), grey=(92, 110, 120), yellow=(255, 214, 90), white=(255, 255, 255))
def lesson_im(P, n_items, k=1.0, rw=None):   # layout-v12 lesson card (owner-approved mock, out/news/layout-v12): one left edge, word/IPA/meaning/example
    XB_ = lambda z: font(round(z * k)); BD_ = lambda z: font(round(z * k), FBd); NO_ = lambda z: ImageFont.truetype(f"{o.fonts}/NotoSans-Medium.ttf", round(z * k))
    S_ = lambda v: round(v * k); items = P['items'][:n_items]; save = P.get('save') and not V14; pad = S_(30) if save else 0
    H_ = pad + (S_(90) if P.get('title') else 0) + len(items) * S_(290) + (S_(70) if P.get('footer') else 0) + pad
    W_ = rw or 2000; im = Image.new('RGBA', (W_, H_), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = pad; x0 = pad + S_(4); wmax = 0
    if save: d.rounded_rectangle([0, 0, W_ - 1, H_ - 1], S_(36), fill=(255, 253, 246, 255), outline=LCOL['navy'] + (255,), width=max(3, S_(6)))
    if P.get('title'): d.text((x0, y), P['title'], font=XB_(58), fill=LCOL['red'] + (255,)); wmax = max(wmax, x0 + XB_(58).getlength(P['title'])); y += S_(90)
    for it in items:
        col = LCOL[it.get('color', 'green')]; ic = it.get('icon', 'in'); dd = S_(78)
        if ic in ('in', 'out'):
            d.ellipse([x0, y + S_(8), x0 + dd, y + S_(8) + dd], fill=col + (255,)); ax, ay = x0 + dd / 2, y + S_(8) + dd / 2; r_ = S_(22)
            if ic == 'in': d.polygon([(ax - r_, ay), (ax + 2, ay - S_(18)), (ax + 2, ay + S_(18))], fill=(255, 255, 255, 255)); d.rectangle([ax, ay - S_(7), ax + r_, ay + S_(7)], fill=(255, 255, 255, 255))
            else: d.polygon([(ax + r_, ay), (ax - 2, ay - S_(18)), (ax - 2, ay + S_(18))], fill=(255, 255, 255, 255)); d.rectangle([ax - r_, ay - S_(7), ax, ay + S_(7)], fill=(255, 255, 255, 255))
        else:
            e_ = emoji_im(ic, dd); f_ = min(1.0, dd / max(e_.width, e_.height)); e_ = e_.resize((max(1, int(e_.width * f_)), max(1, int(e_.height * f_))), Image.LANCZOS)
            im.alpha_composite(e_, (int(x0 + (dd - e_.width) / 2), int(y + S_(8) + (dd - e_.height) / 2)))
        x = x0 + S_(100); d.text((x, y), it['word'], font=XB_(78), fill=col + (255,)); wmax = max(wmax, x + XB_(78).getlength(it['word']))
        if it.get('ipa'): d.text((x, y + S_(92)), it['ipa'], font=NO_(44), fill=LCOL['grey'] + (255,)); wmax = max(wmax, x + NO_(44).getlength(it['ipa']))
        if it.get('mean'): d.text((x, y + S_(152)), it['mean'], font=BD_(40), fill=LCOL['navy'] + (255,)); wmax = max(wmax, x + BD_(40).getlength(it['mean']))
        if it.get('ex'):
            pre, w_, post = it['ex']; f_ = BD_(38); fx = x; yy = y + S_(214); d.text((fx, yy), pre, font=f_, fill=LCOL['grey'] + (255,)); fx += f_.getlength(pre); ww = f_.getlength(w_)
            d.rounded_rectangle([fx - S_(6), yy + 2, fx + ww + S_(6), yy + S_(52)], S_(10), fill=LCOL['yellow'] + (255,)); d.text((fx, yy), w_, font=f_, fill=LCOL['navy'] + (255,)); fx += ww
            d.text((fx, yy), post, font=f_, fill=LCOL['grey'] + (255,)); wmax = max(wmax, fx + f_.getlength(post))
        y += S_(290)
    if P.get('footer'): d.text((x0, y), P['footer'], font=XB_(44), fill=LCOL['green'] + (255,)); wmax = max(wmax, x0 + XB_(44).getlength(P['footer']))
    return im, wmax + pad
NOTE_ST = dict(title=(58, 'XB', 'red', 90), big=(78, 'XB', None, 96), text=(44, 'BD', 'navy', 64), small=(38, 'BD', 'grey', 56))
def note_im(lines, k=1.0, rw=None):   # layout-v12 note: mock typography for every other board text (no word wrap – the spec keeps lines short)
    fonts = dict(XB=lambda z: font(round(z * k)), BD=lambda z: font(round(z * k), FBd)); S_ = lambda v: round(v * k)
    H_ = sum(S_(NOTE_ST[l['st']][3]) for l in lines); W_ = rw or 2000; im = Image.new('RGBA', (W_, max(1, H_)), (0, 0, 0, 0)); d = ImageDraw.Draw(im); y = 0; wmax = 0
    for l in lines:
        z, fk, dc, lh = NOTE_ST[l['st']]; f_ = fonts[fk](z); x = S_(4)
        for seg in l['segs']:
            t_, c_ = seg[0], (seg[1] if len(seg) > 1 else dc or 'navy')
            if t_.startswith('@emoji:'):
                if x > S_(4): x += S_(10)   # a gap before an emoji that follows text (owner: ✅/❌ stuck to the word)
                e_ = emoji_im(t_[7:], S_(z)); f2 = min(1.0, S_(z) / max(e_.width, e_.height)); e_ = e_.resize((max(1, int(e_.width * f2)), max(1, int(e_.height * f2))), Image.LANCZOS)
                im.alpha_composite(e_, (int(x), int(y + (S_(lh) - e_.height) / 2))); x += e_.width + S_(12); continue
            if t_.startswith('@ipa:'): f3 = ImageFont.truetype(f"{o.fonts}/NotoSans-Medium.ttf", S_(z)); d.text((x, y + S_(lh) / 2), t_[5:], font=f3, fill=LCOL['grey'] + (255,), anchor='lm'); x += f3.getlength(t_[5:]); continue
            w_ = f_.getlength(t_)
            if c_ == 'hl': d.rounded_rectangle([x - S_(6), y + S_(lh) * 0.14, x + w_ + S_(6), y + S_(lh) * 0.86], S_(10), fill=LCOL['yellow'] + (255,)); c_ = 'navy'
            d.text((x, y + S_(lh) / 2), t_, font=f_, fill=LCOL[c_] + (255,), anchor='lm'); x += w_
        wmax = max(wmax, x); y += S_(lh)
    return im, wmax
def endcard_im(say, rw, rh):   # v13 end card (owner-approved mock C): rounded app icon, call to action, 100% FREE, lexkite.com, platforms, QR for desktop/TV viewers
    RI = Image.open(f"{ROOT}/brand/social/logo/lexkite-app-icon-rounded.png").convert('RGBA')
    try:
        import qrcode; QR = qrcode.make('https://lexkite.com/?src=short').convert('RGB')
    except Exception: QR = None
    def wrap2(t, fo, mw):   # the call line breaks into two balanced lines when it is wider than the card column
        if fo.getlength(t) <= mw: return [t]
        ws = t.split(); best = None
        for i in range(1, len(ws)):
            a_, b_ = ' '.join(ws[:i]), ' '.join(ws[i:]); w_ = max(fo.getlength(a_), fo.getlength(b_))
            if best is None or w_ < best[0]: best = (w_, [a_, b_])
        return best[1]
    def draw(k, mode):
        S_ = lambda v: max(1, round(v * k)); XB_ = lambda z: font(S_(z)); BD_ = lambda z: font(S_(z), FBd)
        pad = S_(36); qr = S_(300) if (QR is not None and mode != 'compact') else 0   # owner 27/10: bigger QR (≈10 px per module at 1080 wide)
        tw = max(XB_(44).getlength('Learn English'), BD_(40).getlength('with Lexkite')); colw = S_(120) + S_(20) + tw
        SL = wrap2(say + ' →', BD_(40), max(colw, XB_(66).getlength('lexkite.com'), (rw - 4 - pad * 2 - ((S_(40) + qr) if qr else 0)) if mode == 'wide' else 0)); sayw = max(BD_(40).getlength(l) for l in SL); sh = S_(54) * len(SL)
        if mode == 'wide': W_ = pad * 2 + max(colw, XB_(66).getlength('lexkite.com'), sayw) + (S_(40) + qr if qr else 0); H_ = pad * 2 + S_(120) + S_(24) + S_(82) + S_(20) + S_(80) + sh
        else: W_ = pad * 2 + max(colw, XB_(66).getlength('lexkite.com'), sayw, BD_(40).getlength('App · Add-on · Web'), (qr + S_(24) + BD_(40).getlength('desktop / TV')) if qr else 0); H_ = pad * 2 + S_(120) + S_(24) + S_(82) + S_(20) + S_(80) + sh + S_(56) + ((S_(30) + qr) if qr else 0)
        im = Image.new('RGBA', (int(W_), int(H_)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, im.width - 1, im.height - 1], S_(36), fill=(255, 253, 246, 252), outline=LCOL['navy'] + (255,), width=max(3, S_(5)))
        ic = RI.resize((S_(120), S_(120)), Image.LANCZOS); im.alpha_composite(ic, (pad, pad)); x = pad + S_(140)
        d.text((x, pad + S_(8)), 'Learn English', font=XB_(44), fill=LCOL['navy'] + (255,)); d.text((x, pad + S_(66)), 'with Lexkite', font=BD_(40), fill=LCOL['grey'] + (255,))
        y = pad + S_(144); pw = XB_(50).getlength('100% FREE') + S_(60)
        d.rounded_rectangle([pad, y, pad + pw, y + S_(82)], S_(41), fill=LCOL['green'] + (255,)); d.text((pad + pw / 2, y + S_(41)), '100% FREE', font=XB_(50), fill=(255, 255, 255, 255), anchor='mm')
        y += S_(102); d.text((pad, y), 'lexkite.com', font=XB_(66), fill=(14, 124, 123, 255)); y += S_(80)
        for l in SL: d.text((pad, y), l, font=BD_(40), fill=LCOL['navy'] + (255,)); y += S_(54)
        if mode != 'wide': d.text((pad, y), 'App · Add-on · Web', font=BD_(40), fill=LCOL['grey'] + (255,)); y += S_(56)
        if qr:
            q = QR.resize((qr, qr), Image.NEAREST).convert('RGBA')
            if mode == 'wide': qx, qy = im.width - pad - qr, (im.height - qr) // 2; im.alpha_composite(q, (int(qx), int(qy)))
            else:
                y += S_(30); im.alpha_composite(q, (pad, int(y))); d.text((pad + qr + S_(24), y + qr * 0.38), 'Scan on', font=BD_(40), fill=LCOL['navy'] + (255,)); d.text((pad + qr + S_(24), y + qr * 0.38 + S_(50)), 'desktop / TV', font=BD_(40), fill=LCOL['navy'] + (255,))
        return im
    def draw_low(k, mode):   # low / narrow boards: same parts, fewer rows (strip: one row + call; mini: icon+site / FREE / call)
        S_ = lambda v: max(1, round(v * k)); XB_ = lambda z: font(S_(z)); BD_ = lambda z: font(S_(z), FBd); pad = S_(28); ic_ = S_(96)
        sitew = XB_(60).getlength('lexkite.com'); pw = XB_(46).getlength('100% FREE') + S_(52); SL = [say + ' →'] if mode == 'strip' else wrap2(say + ' →', BD_(40), max(ic_ + S_(20) + pw, sitew, rw - 4 - pad * 2)); sayw = max(BD_(40).getlength(l) for l in SL); sh = S_(54) * len(SL)
        qrs = 0
        if mode == 'qrow':   # low board with QR (owner 27/10: keep the QR): icon + FREE / site / call on the left, QR on the right
            SL = wrap2(say + ' →', BD_(40), max(ic_ + S_(20) + pw, sitew)); sayw = max(BD_(40).getlength(l) for l in SL); sh = S_(54) * len(SL)
            H_ = pad * 2 + ic_ + S_(14) + S_(70) + S_(14) + sh; qrs = min(S_(300), int(H_ - 2 * pad)) if QR is not None else 0; W_ = pad * 2 + max(ic_ + S_(20) + pw, sitew, sayw) + S_(32) + qrs
        elif mode == 'strip': W_ = pad * 2 + ic_ + S_(20) + sitew + S_(24) + pw; H_ = pad * 2 + ic_ + S_(14) + sh
        else: W_ = pad * 2 + max(ic_ + S_(20) + pw, sitew, sayw); H_ = pad * 2 + ic_ + S_(14) + S_(70) + S_(14) + sh
        im = Image.new('RGBA', (int(W_), int(H_)), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        d.rounded_rectangle([0, 0, im.width - 1, im.height - 1], S_(30), fill=(255, 253, 246, 252), outline=LCOL['navy'] + (255,), width=max(3, S_(5)))
        im.alpha_composite(RI.resize((ic_, ic_), Image.LANCZOS), (pad, pad))
        if mode == 'strip': d.text((pad + ic_ + S_(20), pad + ic_ / 2), 'lexkite.com', font=XB_(60), fill=(14, 124, 123, 255), anchor='lm'); px_, py_ = pad + ic_ + S_(20) + sitew + S_(24), pad + (ic_ - S_(76)) / 2; y = pad + ic_ + S_(14)
        else: px_, py_ = pad + ic_ + S_(20), pad + (ic_ - S_(76)) / 2; d.text((pad, pad + ic_ + S_(14) + S_(35)), 'lexkite.com', font=XB_(60), fill=(14, 124, 123, 255), anchor='lm'); y = pad + ic_ + S_(14) + S_(70) + S_(14)
        d.rounded_rectangle([px_, py_, px_ + pw, py_ + S_(76)], S_(38), fill=LCOL['green'] + (255,)); d.text((px_ + pw / 2, py_ + S_(38)), '100% FREE', font=XB_(46), fill=(255, 255, 255, 255), anchor='mm')
        for l in SL: d.text((pad, y), l, font=BD_(40), fill=LCOL['navy'] + (255,)); y += S_(54)
        if qrs: im.alpha_composite(QR.resize((qrs, qrs), Image.NEAREST).convert('RGBA'), (int(im.width - pad - qrs), int((im.height - qrs) // 2)))
        return im
    for mode in ('tall', 'wide', 'qrow', 'compact', 'strip', 'mini'):   # every mode with a QR comes before the QR-less ones
        if mode in ('qrow', 'strip', 'mini'):
            if mode == 'qrow' and QR is None: continue
            for k in [x / 100 for x in range(100, 84, -1)]:
                im = draw_low(k, mode)
                if im.width <= rw - 4 and im.height <= rh - 4: return im, k, mode
            continue
        for k in [x / 100 for x in range(100, 84, -1)]:
            im = draw(k, mode)
            if im.width <= rw - 4 and im.height <= rh - 4: return im, k, mode
    raise AssertionError(('end card does not fit the board region', rw, rh))
def plate_wrap(im, colname, pad=(34, 22)):
    w, h = im.width + 2 * pad[0], im.height + 2 * pad[1]; P = Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(P)
    d.rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], min(h, 64) * 2 // 2, fill=COL[colname] + (246,), outline=(255, 255, 255, 235), width=8)
    P = P.resize((w, h), Image.LANCZOS); P.alpha_composite(im, (pad[0], pad[1])); return shadowed(P, 6, 8, 0.45)
def rich(rows, sz, plate=None, maxw=None, maxh=None, pad=(34, 22), sub=1.0, keep_plate=False, floor=50):
    maxw = maxw or POPW - 8; maxh = maxh or POPH - 6
    if INK and not keep_plate: plate = None   # text pops are written on the whiteboard in ink (tiles / pills keep their plates)
    while True:
        im = stack([rich_row(r, sz if i == 0 else round(sz * sub), bool(plate)) for i, r in enumerate(rows)], round(sz * (0.04 if INK and not plate else 0.08)))
        if plate: im = plate_wrap(im, plate, pad)
        elif not INK: im = shadowed(im, 5, 6, 0.5)
        if (im.width <= maxw and im.height <= maxh) or sz * min(1.0, sub) <= floor: return im, round(sz * min(1.0, sub))
        sz -= 2
def wrap_rows(rows, maxw, sz, plate=False):   # greedy word wrap of rich rows (colour runs and badges kept) to maxw at size sz
    out = []
    for r in rows:
        units = []; lead = []   # badges never sit alone on a line (owner 26/10: "I am happy" / "✓" split)
        for seg in r:
            if seg[0].startswith('@'):
                if seg[0] in ('@ok', '@x') and units and not lead: units[-1] = units[-1] + [seg]
                else: lead.append(seg)
            else:
                ws = [[[w_, seg[1]]] for w_ in re.findall(r'\S+\s*|\s+', seg[0])]
                if lead and ws: ws[0] = lead + ws[0]; lead = []
                units += ws
        if lead: units.append(lead)
        line = []
        for u in units:
            if line and rich_row(line + u, sz, plate).width > maxw:
                out.append(line); u = ([[u[0][0].lstrip(), u[0][1]]] + u[1:]) if not u[0][0].startswith('@') else u; line = []
                if not u[0][0]: u = u[1:]
                if not u: continue
            line = line + u
        if line: out.append(line)
    return out
def wrap_bal(rows, maxw, sz):   # word wrap with balanced lines: the narrowest width that keeps the line count of a plain wrap
    n0 = len(wrap_rows(rows, maxw, sz)); w_ = maxw
    while w_ > 120 and len(wrap_rows(rows, w_ - 20, sz)) == n0: w_ -= 20
    return wrap_rows(rows, w_, sz)
def rows_text(rows): return ' / '.join(''.join(tok_txt(s[0]) for s in r) for r in rows)
IMGJ = json.load(open(f'{ROOT}/content/lexicon/img.json'))['items']
def vocab_img(key, side):
    it = IMGJ[key]; p = f"{o.img}/{it['h']}.webp"; im = Image.open(p).convert('RGBA'); k = side / max(im.size)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    tile = Image.new('RGBA', (side + 28, side + 28), (0, 0, 0, 0)); d = ImageDraw.Draw(tile)
    d.rounded_rectangle([0, 0, side + 27, side + 27], 34, fill=(255, 255, 255, 255), outline=ACC + (255,), width=6)
    tile.alpha_composite(im, ((side + 28 - im.width) // 2, (side + 28 - im.height) // 2)); return tile, it['url']
def ring(num, rem, d_=100):
    im = Image.new('RGBA', (d_ * 2, d_ * 2), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    g.ellipse([8, 8, 2 * d_ - 8, 2 * d_ - 8], fill=COL['navy'] + (240,), outline=COL['mint'] + (90,), width=14)
    if rem > 0: g.arc([8, 8, 2 * d_ - 8, 2 * d_ - 8], -90, -90 + 360 * rem, fill=ACC + (255,) if ACC != COL['navy2'] else COL['yellow'] + (255,), width=14)
    g.text((d_, d_ + 4), num, font=font(d_ * 1.1), fill=(255, 255, 255, 255), anchor='mm'); return shadowed(im.reduce(2), 4, 5, 0.4)
def pill_w(segs, sz, tight=False, padx=None): fo = font(sz * 2); return int(sum(fo.getlength(s) for s, _ in segs)) + 4 * (padx or (14 if tight else 34))
def pill(segs, sz, bg, dim=False, tight=False, padx=None, minw=0):   # minw (in pill_w units): option pills of one quiz share one width
    fo = font(sz * 2); tw = int(sum(fo.getlength(s) for s, _ in segs)); px_ = 2 * (padx or (14 if tight else 34)); w = max(tw + 2 * px_, minw); h = int(sz * 2 * (1.08 if tight else 1.32)) + (14 if tight else 64)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.rounded_rectangle([0, 0, w - 1, h - 1], h // 2, fill=bg + (246,), outline=(255, 255, 255, 235), width=6); x = px_
    for s_, col in segs: d.text((x, h // 2), s_, font=fo, fill=col + (255,), anchor='lm'); x += fo.getlength(s_)
    im = shadowed(im.reduce(2), 5, 6, 0.45)
    if dim: a = np.asarray(im).copy(); a[..., 3] = (a[..., 3] * 0.42).astype(np.uint8); im = Image.fromarray(a)
    return im
ICON = Image.open(o.icon).convert('RGBA')

# ---------------- pops: build static images (+ dynamic ones per frame) ----------------
class Pop:
    def __init__(s, P):
        s.P = P; s.id = P['id']; s.kind = P['kind']; s.t0 = max(1.0 / FPS, tm_of(P['from'])) if P['from'][0] != 't' else max(1.0 / FPS, float(P['from'][1]))
        s.t1 = tm_of(P['to']) if P['to'][0] != 'end' else TOTAL - 0.40; s.an = P.get('anim', 'spring'); s.cx = P.get('cx', CX); s.cache = {}
        s.text = ''; s.px = 0; s.variant = None; s.where = 'band'; s.region = None; s.PW, s.PH = CAPW, BAND_H; s.slot = P.get('slot'); s.tall = False
    def make(s):
        if BRD: s.build_board()
        else: s.build()
    def variants(s):
        P = s.P; k = s.kind
        if k == 'rich':
            v = ['rows'] + (['one'] if len(P['rows']) > 1 else []) + (['two_a', 'two_b'] if len(P['rows']) > 2 else []) + ['wrap']; return v
        if k == 'card': return ['h', 'v', 'h2']
        if k == 'pair': return ['h', 'v']
        return [None]
    def rows_v(s, rows):
        if s.variant == 'one': return [sum([list(r) if i == 0 else [[' ', 'white']] + list(r) for i, r in enumerate(rows)], [])]
        if s.variant == 'two_a': return [rows[0] + [[' ', 'white']] + rows[1]] + rows[2:]
        if s.variant == 'two_b': return rows[:-2] + [rows[-2] + [[' ', 'white']] + rows[-1]]
        return rows
    def region_of(s):
        Z = list(POPZ_TALL if s.tall else POPZ); wide = (Z[2] - Z[0]) >= 1.4 * (Z[3] - Z[1])   # board above the caption strip
        if s.slot:   # a list written line by line: slot [k, n] = k-th of n rows of the pop zone (all stay on the board together)
            k_, n_ = s.slot; hh_ = (Z[3] - Z[1] - 10 * (n_ - 1)) / n_; y_ = Z[1] + k_ * (hh_ + 10); return [Z[0], int(y_), Z[2], int(y_ + hh_)]
        if 'cx' in s.P:   # tags beside each other: halves of the board zone (left/right on a wide zone, top/bottom on a tall one)
            first = s.P['cx'] < CX
            return ([Z[0], Z[1], (Z[0] + Z[2]) // 2 - 8, Z[3]] if first else [(Z[0] + Z[2]) // 2 + 8, Z[1], Z[2], Z[3]]) if wide else \
                   ([Z[0], Z[1], Z[2], (Z[1] + Z[3]) // 2 - 8] if first else [Z[0], (Z[1] + Z[3]) // 2 + 8, Z[2], Z[3]])
        return list(Z)
    def build_board(s):
        global INK, POPW, POPH
        s.region = s.region_of(); rw, rh = s.region[2] - s.region[0], s.region[3] - s.region[1]
        INK = True; POPW, POPH = rw, rh; s.PW, s.PH = rw, rh
        try:
            if s.kind == 'rich': s.build_rich_ink(rw, rh)
            elif s.kind == 'card': s.build_card_ink(rw, rh)
            elif s.kind == 'pair': s.build_pair_ink(rw, rh)
            elif s.kind == 'quiz': s.build_quiz_ink(rw, rh)
            elif s.kind == 'stress': s.build_stress_ink(rw, rh)
            elif s.kind == 'turn': s.build_turn_ink(rw, rh)
            elif s.kind == 'cta': s.build_cta_ink(rw, rh)
            elif s.kind == 'lesson': s.build_lesson(rw, rh)
            elif s.kind == 'note': s.build_note(rw, rh)
        finally: INK = False; POPW, POPH = CAPW, BAND_H
        s.where = 'board'; s.mcur = s.meas
        print(f"pop {s.id} -> board {s.variant or ''} {s.im.size} in {rw}x{rh} meas {[(a, round(b)) for a, b in s.meas]} pages {len(getattr(s, 'pages', []) or [1])} region {s.region}", flush=True)
    def fits(s, im, rw, rh): return im.width <= rw - 4 and im.height <= rh - 4
    def build_lesson(s, rw, rh):   # largest scale <= 1 at which the FULL card (all items) fits the board region; never below 0.85 of the mock
        P = s.P; s.etype = 'card'; n = len(P['items'])
        s.paged = False
        for k in [x / 100 for x in range(KMAX, 88, -1)]:
            im, wneed = lesson_im(P, n, k, rw - 4)
            if wneed <= rw - 4 and im.height <= rh - 4: break
        else:   # low board strip (2D desk / board clips): ONE item per page, same mock typography (title kept when it fits)
            s.paged = True; best = None
            for sv in ([True, False] if P.get('save') else [False]):   # a framed SAVE card drops its frame on a very low strip before anything shrinks
                for k in [x / 100 for x in range(KMAX, 88, -1)]:
                    for tt in ([True, False] if P.get('title') else [False]):
                        Q = dict(P, title=P['title'] if tt else None, footer=None, save=sv)
                        if all(lesson_im(dict(Q, items=[it]), 1, k, rw - 4)[1] <= rw - 4 and lesson_im(dict(Q, items=[it]), 1, k, rw - 4)[0].height <= rh - 4 for it in P['items']): best = (k, tt, sv); break
                    if best: break
                if best: break
            assert best, ('lesson card: not even one item per page fits the board region at 0.89 of the mock size', s.id, rw, rh)
            k, s.ptitle, s.psave = best
        s.k = k; s.rw = rw - 4; s.rh = rh - 4; n_ = len(P['items'])
        s.reveal = [s.t0] + [tm_of(it['at']) if it.get('at') else s.t0 + (s.t1 - s.t0) * i / n_ for i, it in enumerate(P['items'][1:], 1)]
        s.text = ' / '.join(it['word'] + (' ' + it.get('ipa', '')) for it in P['items']); s.px = 38 * k
        s.meas = [('card', CAPR * 38 * k)]
        s.im = s.lesson_frame(n, rh - 4) if not s.paged else s.lesson_page(0)   # canvas = whole region height: the card sits at the TOP-left like the mock
    def build_note(s, rw, rh):   # mock typography at the largest scale <= 1 that fits; never below 0.85
        L_ = s.P['lines']; s.etype = 'card'
        for k in [x / 100 for x in range(KMAX, 88, -1)]:
            im, wneed = note_im(L_, k, rw - 4)
            if wneed <= rw - 4 and im.height <= rh - 4: break
        else: raise AssertionError(('note does not fit the board region at 0.89 of the mock size', s.id, round(wneed), im.height, rw, rh))
        c = Image.new('RGBA', (rw - 4, rh - 4), (0, 0, 0, 0)); c.alpha_composite(im, (0, 0)); s.im = c; s.px = 38 * k
        s.text = ' / '.join(''.join(sg[0].split(':', 1)[1] if sg[0].startswith('@') else sg[0] for sg in l['segs']) for l in L_); s.meas = [('card', CAPR * min(NOTE_ST[l['st']][0] for l in L_) * k)]
    def lesson_page(s, i):   # paged mode: item i alone (one word per page)
        key = ('pg', i)
        if key not in s.cache:
            P = s.P; im = lesson_im(dict(P, items=[P['items'][i]], title=P.get('title') if s.ptitle else None, footer=None, save=s.psave), 1, s.k, s.rw)[0]
            c = Image.new('RGBA', (s.rw, s.rh), (0, 0, 0, 0)); c.alpha_composite(im, (0, 0)); s.cache[key] = c
        return s.cache[key]
    def lesson_frame(s, m, H):   # same canvas height for every build-up step (no jump), content top-left
        key = ('ls', m)
        if key not in s.cache:
            im = lesson_im(s.P, m, s.k, s.rw)[0]; c = Image.new('RGBA', (s.rw, H), (0, 0, 0, 0)); c.alpha_composite(im, (0, 0)); s.cache[key] = c
        return s.cache[key]
    def build_rich_ink(s, rw, rh):
        P = s.P; head = P.get('role') in ('hook', 'headline'); minf = MINF_HOOK if head else MINF_BODY; s.etype = 'hook' if head else 'body'
        s.text = P.get('_text') or rows_text(P['rows']); g_ = lambda z: round(z * 0.04)
        al = P.get('align') or ('l' if len(P['rows']) >= 3 and not head else 'c'); s.align = al
        lay = lambda ls, z: stack([rich_row(r, z) for r in ls], g_(z), al)
        sizes = [P['size']] if '_page' in P else list(range(max(minf, round(P.get('size', 76) * 1.25)), minf - 1, -2))
        for sz in sizes:   # largest size whose word wrap fits ONE board page
            im = lay(wrap_rows(P['rows'], rw - 8, sz), sz)
            if s.fits(im, rw, rh): s.im, s.px, s.pages, s.meas = im, sz, None, [(s.etype, CAPR * sz)]; return
        assert '_page' not in P, ('board page does not fit', s.id, im.size, rw, rh)
        pages = []; cur = []   # paginate at the minimum size: whole rows first, a long row by its wrapped lines (never shrink)
        for grp in [wrap_rows([r], rw - 8, minf) for r in P['rows']]:
            if s.fits(lay(cur + grp, minf), rw, rh): cur += grp; continue
            if cur: pages.append(cur); cur = []
            for ln in grp:
                if not cur or s.fits(lay(cur + [ln], minf), rw, rh): cur.append(ln)
                else: pages.append(cur); cur = [ln]
        if cur: pages.append(cur)
        for pg in pages: assert s.fits(lay(pg, minf), rw, rh), ('a line does not fit the board at the minimum size', s.id, rows_text(pg), lay(pg, minf).size, rw, rh)
        s.pages = [(pg, minf) for pg in pages]; s.im = lay(pages[0], minf); s.px = minf; s.meas = [(s.etype, CAPR * minf)]
    def build_card_ink(s, rw, rh):
        P = s.P; s.count = P.get('count'); word = P.get('word'); s.sub_at = tm_of(P['sub_at']) if P.get('sub_at') else None; s.etype = 'body'
        s.text = (P.get('idx', '') + ' ' + (word or '') + (' / ' + ''.join(x[0] for x in P['sub']) if P.get('sub') else '')).strip() or P['img'].split('#')[0]
        chip = pill([(P['idx'], COL['navy'])], MINF_BODY, ACC, tight=True) if P.get('idx') else None
        ringw = 150 + 40 if s.count else 0; best = None
        for side in range(min(rw - 28 - ringw, rh - 28, 440), MIN_IMG - 1, -8):
            tile, s.url = vocab_img(P['img'], side)
            if not word: best = (side, tile, None, 0); break
            for wz in (96, 88, MINF_BODY):
                wz = max(wz, MINF_BODY); wr = rich_row([[word, 'white']], wz); row = hrow([chip, wr], 18) if chip else wr; t_ = tile
                if chip and row.width > rw - 4: t_ = tile.copy(); t_.alpha_composite(chip, (6, 6)); row = wr   # counter chip on the picture's corner
                rows = [row] + ([rich_row(P['sub'], MINF_BODY)] if P.get('sub') and not s.sub_at else [])
                im = stack([t_] + rows, 6)
                if s.fits(im, rw, rh): best = (side, tile, im, wz); break
            if best: break
        assert best, ('card does not fit the board at the minimum picture / text size', s.id, rw, rh)
        side, s.side_im, im, wz = best
        if chip and im is not None and chip.width + 18 + rich_row([[word, 'white']], wz).width > rw - 4: s.side_im = s.side_im.copy(); s.side_im.alpha_composite(chip, (6, 6))
        s.im = im if im is not None else s.side_im; s.px = wz or MINF_BODY; s.side = side
        s.meas = [('image', side)] + ([('body', CAPR * wz)] if wz else [])
        if s.sub_at:   # second page: the word + its note, written large (the picture was the first page)
            s.im_sub = stack([rich_row([[word, 'white']], MINF_HOOK), rich_row(P['sub'], MINF_BODY)], 8); assert s.fits(s.im_sub, rw, rh), ('card note page', s.id)
            s.meas_sub = [('hook', CAPR * MINF_HOOK), ('body', CAPR * MINF_BODY)]
        s.ringd = 150
    def build_pair_ink(s, rw, rh):
        P = s.P; hook = P.get('role') == 'hook'; z = MINF_HOOK if hook else MINF_BODY; s.etype = 'hook' if hook else 'body'
        def tile(d, lit, vv):
            rows = [[[d['title'], 'white']] + ([[' ', 'white']] + list(d['sub']) if d.get('sub') else [])] if vv else [[[d['title'], 'white']]] + ([d['sub']] if d.get('sub') else [])
            im = plate_wrap(stack([rich_row(r, z, True) for r in rows], 2), d.get('color', 'navy2'), (14, 8))
            if not lit: a = np.asarray(im).copy(); a[..., 3] = (a[..., 3] * 0.38).astype(np.uint8); im = Image.fromarray(a)
            return im
        s.vs = rich_row([['VS', 'red']], MINF_BODY) if P.get('vs') else None
        s.focus = [(tm_of(a), f) for a, f in P.get('focus', [])]; s.text = P['left']['title'] + ' | ' + P['right']['title']; s.px = z
        vs0 = s.vs
        for var in ('h', 'hn', 'v', 'f'):
            if var == 'f' and not s.focus: continue
            if var == 'hn' and not vs0: continue
            s.vs = None if var == 'hn' else vs0; vv = var == 'v'; s.variant = 'h' if var == 'hn' else var
            s.L = {True: tile(P['left'], True, vv), False: tile(P['left'], False, vv)}; s.R = {True: tile(P['right'], True, vv), False: tile(P['right'], False, vv)}
            if all(s.fits(s.compose_pair(f), rw, rh) for f in ('both', 'left', 'right')): break
        else: raise AssertionError(('pair does not fit the board at the minimum size', s.id, s.compose_pair('both').size, rw, rh))
        s.im = s.compose_pair('both'); s.meas = [(s.etype, CAPR * z)] + ([('body', CAPR * MINF_BODY)] if s.vs else [])
    def build_quiz_ink(s, rw, rh):
        P = s.P; z = MINF_BODY; s.etype = 'body'; s.ringd = 140   # 140: the digit still reaches the body minimum (cap 57 px); fits 'I am agree' + ring on a 500 px desk board
        s.qim = stack([rich_row(r, z) for r in wrap_bal(P['q'], rw - 8, z)], 2) if P.get('q') else None
        sp_ = ' '; pdx = None
        segs = lambda lab, txt, st: [(lab + sp_, COL['yellow'] if st != 'ok' else COL['navy']), (txt, (255, 255, 255) if st != 'ok' else COL['navy'])]
        if max(pill_w(segs('A', P['a'], 'n'), z, tight=True), pill_w(segs('B', P['b'], 'n'), z, tight=True)) > rw - 8: z = 58; s.etype = 'card'   # narrow board: the owner-approved mock's quiz pills (58 px)
        mw = max(pill_w(segs('A', P['a'], 'n'), z, tight=True, padx=pdx), pill_w(segs('B', P['b'], 'n'), z, tight=True, padx=pdx))
        mk = lambda lab, txt, st: pill(segs(lab, txt, st), z, COL['green'] if st == 'ok' else COL['navy'], st == 'dim', tight=True, padx=pdx, minw=mw)
        s.pA = {st: mk('A', P['a'], st) for st in ('n', 'ok', 'dim')}; s.pB = {st: mk('B', P['b'], st) for st in ('n', 'ok', 'dim')}
        assert s.pA['n'].width == s.pB['n'].width, ('quiz option pills must share one width (aligned)', s.id)
        s.rev = tm_of(P['reveal']); s.px = z; s.text = f"A {P['a']} | B {P['b']}"; b = BEATS.get('_count')
        s.opts_at = tm_of(P['opts_at']) if P.get('opts_at') else (b['s'] if b else s.rev)
        for var in ('row', 'qring', 'stack', 'pages'):
            s.variant = var
            if all(s.fits(s.compose_quiz(T_), rw, rh) for T_ in ([b['s'] + 0.5] if b else []) + [s.rev + 0.1, s.t0 + 0.01]): break
        else: raise AssertionError(('quiz does not fit the board at the minimum size', s.id, s.compose_quiz(s.t0 + 0.01).size, rw, rh))
        s.im = s.compose_quiz(s.t0 + 0.01); s.meas = [(s.etype, CAPR * z)]
    def build_stress_ink(s, rw, rh):
        s.etype = 'body'; s.px = MINF_BODY; s.text = '\u00b7'.join(s.P['syl']); s.im = s.compose_stress(-1)
        assert s.fits(s.im, rw, rh), ('stress pills do not fit the board at the minimum size', s.id, s.im.size, rw, rh)
        s.meas = [('body', CAPR * MINF_BODY)]
    def build_turn_ink(s, rw, rh):
        P = s.P; s.etype = 'body'; z = MINF_BODY; s.head_im = stack([rich_row(r, z) for r in wrap_rows(P['rows'], rw - 8, z)], 2); s.px = z
        s.text = rows_text(P['rows']); b = BEATS[P['beat']]; s.b0, s.b1 = b['s'], b['e']; s.im = s.compose_turn(0.0)
        assert s.fits(s.im, rw, rh), ('your-turn pop does not fit the board at the minimum size', s.id, s.im.size, rw, rh)
        s.meas = [('body', CAPR * z)]
    def build_cta_ink(s, rw, rh):
        if PLATE:   # v13 end card, the same on every video
            seg = SP['cta']['say']; s.im, k_, mode_ = endcard_im(seg, rw, rh); s.etype = 'card'; s.px = 40 * k_; s.cta_pages = None
            s.text = f'{seg} / 100% FREE / lexkite.com'; s.meas = [('card', CAPR * 40 * k_)]; print(f'end card {mode_} x{k_}', flush=True); return
        z = MINF_BODY; s.etype = 'body'; s.px = z; seg = SP['cta']['say']; s.text = f'{seg} / lexkite.com'
        ic = ICON.resize((96, 96), Image.LANCZOS); m = Image.new('L', ic.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 95, 95], 24, fill=255)
        ic.putalpha(Image.fromarray((np.asarray(ic)[..., 3].astype(np.float32) * np.asarray(m) / 255).astype(np.uint8)))
        say = stack([rich_row(r, z) for r in wrap_rows([[[seg, 'white']]], rw - 8 - 110, z)], 2); pl = pill([('lexkite.com', ACC if ACC not in (COL['navy2'], COL['navy']) else COL['mint'])], z, COL['navy'], tight=True)
        if pl.width > rw - 8: pl = rich_row([['lexkite.com', 'green']], z)   # narrow board column (layout v12): the site in board ink, same size, no pill
        if pl.width > rw - 8: pl = stack([rich_row([['lexkite', 'green']], z), rich_row([['.com', 'green']], z)], 2, 'l')   # still too wide (Mei's desk board, 448 px): the site on two lines at the same size
        one = stack([hrow([ic, say], 14), pl], 10); s.cta_pages = None
        if s.fits(one, rw, rh): s.im = one
        else:   # two board pages: the call to action, then the site pill when "lexkite.com" is spoken
            lid = next(l for l in ATL if 'lexkite' in TXT[l]); kk = next(i for i, w_ in enumerate(TXT[lid].split()) if 'lexkite' in w_)
            s.cta_pages = (wt(lid, kk)['s'] - 0.05, stack([ic, pl], 12)); s.im = hrow([ic, say], 14) if s.fits(hrow([ic, say], 14), rw, rh) else stack([ic, say], 8)
            assert s.fits(s.im, rw, rh) and s.fits(s.cta_pages[1], rw, rh), ('CTA does not fit the board at the minimum size', s.id, s.im.size, rw, rh)
        s.meas = [('body', CAPR * z)]
    def build(s):
        P = s.P; k = s.kind; PW, PH = s.PW, s.PH
        if k == 'rich' and s.variant == 'wrap':   # narrow board: word-wrap the rows to the region width, largest size that fits
            s.text = rows_text(P['rows']); cand = []; pad_ = 2 * 34 + 8 if P.get('plate') else 8
            for sz0 in range(round(P.get('size', 76) * 1.3), 49, -4):
                wr = wrap_rows(P['rows'], PW - pad_, sz0, bool(P.get('plate'))); im_, px_ = rich(wr, sz0, P.get('plate'), maxw=PW - 8, maxh=PH - 6); cand.append((im_, px_, len(wr)))
            top = max(c[1] for c in cand); ok_ = [c for c in cand if c[1] >= 0.85 * top]   # fewest lines within 15 % of the largest size
            s.im, s.px, _n = min(ok_, key=lambda c: (c[2], -c[1]))
        elif k == 'rich':   # board: start 1.3x bigger, rich() shrinks to the zone
            s.im, s.px = rich(s.rows_v(P['rows']), round(P.get('size', 76) * (1.3 if INK else 1.0)), P.get('plate'), maxw=(PW - 8 if INK else 2 * min(s.cx - SAFE['x0'], SAFE['x1'] - s.cx) - 8)); s.text = rows_text(P['rows'])
        elif k == 'cta':
            ic = ICON.resize((72, 72), Image.LANCZOS); m = Image.new('L', ic.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 71, 71], 18, fill=255)
            ic.putalpha(Image.fromarray((np.asarray(ic)[..., 3].astype(np.float32) * np.asarray(m) / 255).astype(np.uint8)))
            seg = SP['cta']['say']; sz = 62
            while sz > 50 and hrow([ic, rich_row([[seg, 'white']], sz)], 14).width > PW - 12: sz -= 2
            l1 = hrow([ic, rich_row([[seg, 'white']], sz)], 14)
            if l1.width > PW - 12 and ' ' in seg:   # narrow board: the call to action on two lines
                ws_ = seg.split(); k_ = min(range(1, len(ws_)), key=lambda k: abs(len(' '.join(ws_[:k])) - len(' '.join(ws_[k:])))); sz = 62
                two = lambda z: hrow([ic, stack([rich_row([[' '.join(ws_[:k_]), 'white']], z), rich_row([[' '.join(ws_[k_:]), 'white']], z)], 2)], 14)
                while sz > 50 and two(sz).width > PW - 12: sz -= 2
                l1 = two(sz)
            l1 = l1 if INK else shadowed(l1, 5, 6, 0.5)
            pl = pill([('lexkite.com', ACC if ACC not in (COL['navy2'], COL['navy']) else COL['mint'])], 62, COL['navy'])
            s.im = stack([l1, pl], 12); s.px = min(sz, 62); s.text = f'{seg} / lexkite.com'
        elif k == 'card':
            vert = s.variant == 'v'
            side = min(230, PW - 28, int(PH * 0.5)) if vert else min(150 if s.variant == 'h2' else 230, PH - 40); tile, s.url = vocab_img(P['img'], side)
            if 'right' in P:   # horizontal: picture + text block (guess); vertical (tall board zone): picture above the text
                s.side_im = tile
                rr, s.px = rich(P['right'], 78, None, maxw=PW - 8, maxh=PH - tile.height - 14) if vert else rich(P['right'], 78, None, maxw=PW - tile.width - 40, maxh=PH - 10)
                s.im = stack([tile, rr], 10) if vert else hrow([tile, rr], 34); s.text = rows_text(P['right']); s.count = P.get('count')
            else:
                chip = pill([(P['idx'], COL['navy'])], 44, ACC)
                rows = [[[P['word'], 'white']]] + ([P['sub']] if P.get('sub') else [])
                if vert: rr, s.px = rich(rows, 92, None, maxw=PW - 8, maxh=PH - tile.height - chip.height - 20)
                else: rr, s.px = rich(rows, 92, None, maxw=PW - tile.width - 40, maxh=PH - chip.height - 12)
                right = stack([chip, rr], 6) if P.get('idx') else rr
                s.im = stack([tile, right], 10) if vert else hrow([tile, right], 30); s.text = (P.get('idx', '') + ' ' + P['word'] + (' / ' + ''.join(x[0] for x in P['sub']) if P.get('sub') else '')).strip(); s.count = None
            assert INK or (s.im.height <= PH and s.im.width <= PW), ('card too big', s.id, s.im.size)
        elif k == 'pair':
            def tile(d, lit=True, size=100 if P.get('vs') else 104):
                vv = s.variant == 'v'   # stacked tiles on a narrow board: title + sub on ONE row per tile, same size
                rows = ([[[d['title'], 'white']] + ([[' ', 'white']] + list(d['sub']) if d.get('sub') else [])]) if vv else [[[d['title'], 'white']]] + ([d['sub']] if d.get('sub') else [])
                im, sz_ = rich(rows, size, d.get('color', 'navy2'), keep_plate=True, sub=1.0 if vv else 0.62, maxw=(PW - 8) if vv else (PW - (96 if P.get('vs') else 26)) // 2, maxh=((PH - (70 if P.get('vs') else 20)) // 2) if vv else PH - 10, pad=(16, 14) if P.get('vs') else (24, 16)); s.pxs.append(sz_ if (d.get('sub') or vv) else round(sz_ / 0.62))   # rich() reports the 0.62 sub size
                if not lit: a = np.asarray(im).copy(); a[..., 3] = (a[..., 3] * 0.38).astype(np.uint8); im = Image.fromarray(a)
                return im
            s.pxs = []; s.L = {True: tile(P['left']), False: tile(P['left'], False)}; s.R = {True: tile(P['right']), False: tile(P['right'], False)}
            s.vs = (rich_row([['VS', 'red']], 52) if INK else shadowed(rich_row([['VS', 'yellow']], 52), 4, 5, 0.5)) if P.get('vs') else None
            s.focus = [(tm_of(a), f) for a, f in P.get('focus', [])]; s.px = min(s.pxs); s.text = P['left']['title'] + ' | ' + P['right']['title']
            s.im = s.compose_pair('both')
        elif k == 'quiz':
            q = P.get('q'); s.qim = rich(q, 70, None)[0] if q else None
            ca = COL['green']; sg = lambda lab, txt, st: [(lab + '  ', COL['yellow'] if st != 'ok' else COL['navy']), (txt, (255, 255, 255) if st != 'ok' else COL['navy'])]
            mw = max(pill_w(sg('A', P['a'], 'n'), 58), pill_w(sg('B', P['b'], 'n'), 58))
            s.pA = {st: pill(sg('A', P['a'], st), 58, ca if st == 'ok' else COL['navy'], st == 'dim', minw=mw) for st in ('n', 'ok', 'dim')}
            s.pB = {st: pill(sg('B', P['b'], st), 58, ca if st == 'ok' else COL['navy'], st == 'dim', minw=mw) for st in ('n', 'ok', 'dim')}
            s.rev = tm_of(P['reveal']); s.px = 58; s.text = f"A {P['a']} | B {P['b']}"; s.im = s.compose_quiz(0.0)
        elif k == 'stress':
            s.px = 72; s.text = '·'.join(P['syl']); s.im = s.compose_stress(-1)
        elif k == 'turn':
            s.head_im, s.px = rich(P['rows'], 88, None, maxh=PH - 60); s.text = rows_text(P['rows']); b = BEATS[P['beat']]; s.b0, s.b1 = b['s'], b['e']; s.im = s.compose_turn(0.0)
        assert INK or s.im.height <= PH + 2, ('pop taller than the band', s.id, s.im.size, PH)
    def compose_pair(s, f):
        if s.variant == 'f': return s.R[True] if f == 'right' else s.L[True]   # narrow board: the tile being explained, full size
        L = s.L[f in ('left', 'both')]; R = s.R[f in ('right', 'both')]; items = [L] + ([s.vs] if s.vs else []) + [R]
        return stack(items, 8) if s.variant == 'v' else hrow(items, 12 if (s.vs or INK) else 22)
    def compose_quiz(s, T):
        st_a = st_b = 'n'
        if T >= s.rev: st_a, st_b = ('ok', 'dim') if s.P['correct'] == 'a' else ('dim', 'ok')
        mid = []
        b = BEATS.get('_count')
        if b and b['s'] <= T < b['e']: n = 3 - min(2, int(T - b['s'])); mid = [ring(str(n), 1 - (T - b['s']) / (b['e'] - b['s']), 130)]; s.digit = str(n)
        else: s.digit = None
        if s.variant in ('row', 'qring', 'stack', 'pages'):   # board (v10): layouts at the minimum size, chosen in build_quiz_ink
            rg = [ring(s.digit, 1 - (T - b['s']) / (b['e'] - b['s']), s.ringd)] if mid else []
            A, B = s.pA[st_a], s.pB[st_b]; q = s.qim
            if s.variant == 'row': return stack(([q] if q else []) + [hrow([A] + rg + [B], 20)], 10, 'l')
            if s.variant == 'qring': return stack(([hrow([q] + rg, 24) if q else hrow(rg, 0)] if (q or rg) else []) + [hrow([A, B], 20)], 10, 'l')
            if s.variant == 'stack': return stack(([q] if q else []) + [hrow([A] + rg, 8), B], 8, 'l')
            return stack([rg[0] if rg else q, A, B] if q is not None or rg else [A, B], 8, 'l')   # narrow board: the ring takes the question's place during 3-2-1
        if hrow([s.pA['n'], s.pB['n']], 24).width > s.PW - 8 and s.qim is not None:   # narrow board: options one under the other
            if mid: mid = [ring(s.digit, 1 - (T - b['s']) / (b['e'] - b['s']), 96)]   # small ring beside option A: the question keeps its size
            return stack([s.qim, hrow([s.pA[st_a]] + mid, 18) if mid else s.pA[st_a], s.pB[st_b]], 12)
        wide = hrow([s.pA['n'], ring('3', 1.0), s.pB['n']], 24).width > s.PW - 8
        if wide and s.qim is not None:   # long options: ring goes next to the question, pills keep their full size
            q = hrow([s.qim] + mid, 20) if mid else s.qim; return stack([q, hrow([s.pA[st_a], s.pB[st_b]], 24)], 14)
        row = hrow([s.pA[st_a]] + mid + [s.pB[st_b]], 24)
        return stack([s.qim, row], 14) if s.qim else row
    def compose_stress(s, active):
        syl = s.P['syl']; st = s.P['stress']; items = []
        for i, x in enumerate(syl):
            big = i == st; on = active < 0 or i <= active
            col = ACC if big else COL['navy']; tc = COL['navy'] if (big and ACC in (COL['yellow'], COL['mint'], COL['cream'])) else (255, 255, 255)
            if BRD:   # board (v10): every syllable >= the body minimum, the stressed one at the headline minimum; tight pills
                p = pill([(x, tc)], MINF_HOOK if big else MINF_BODY, col if on else COL['navy'], dim=not on, tight=True, padx=12); dh = 46; r = 20 if big else 9
            else: p = pill([(x, tc)], 96 if big else 72, col if on else COL['navy'], dim=not on); dh = 72; r = 30 if big else 13
            dot = Image.new('RGBA', (p.width, dh), (0, 0, 0, 0))
            ImageDraw.Draw(dot).ellipse([p.width // 2 - r, dh // 2 - r, p.width // 2 + r, dh // 2 + r], fill=(COL['yellow'] if big else (255, 255, 255)) + (255 if on else 110,), outline=STROKE + (255,), width=4)
            items.append(stack([dot, p], 2))
        return hrow(items, 6 if BRD else 14)
    def compose_turn(s, T):
        rem = 1.0 if T < s.b0 else max(0.0, 1 - (T - s.b0) / (s.b1 - s.b0)); bw = int(min(s.PW - 60, max(s.head_im.width, 520))); bar = Image.new('RGBA', (bw, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(bar)
        d.rounded_rectangle([0, 0, bw - 1, 29], 15, fill=COL['navy'] + (230,), outline=(255, 255, 255, 220), width=3)
        if rem > 0: d.rounded_rectangle([4, 4, 4 + max(22, round((bw - 9) * rem)), 25], 11, fill=COL['yellow'] + (255,))
        return stack([s.head_im, shadowed(bar, 4, 5, 0.4)], 16)
    def frame_im(s, T):
        k = s.kind
        if k == 'pair' and s.focus:
            f = 'both'
            for a, ff in s.focus:
                if T >= a: f = ff
            key = ('pair', f)
            if key not in s.cache: s.cache[key] = s.compose_pair(f)
            return s.cache[key]
        if k == 'quiz':
            im = s.compose_quiz(T); s.mcur = s.meas + ([('body', CAPR * s.ringd * 0.55)] if getattr(s, 'digit', None) and BRD else []); return im
        if k == 'stress':
            act = -1; sw = [x for x in (s.P.get('sweep'), s.P.get('sweep2')) if x]
            for a in sw:   # syllables light up one by one while the sweep word is spoken
                wd = wt(a[0], a[1]); n = len(s.P['syl'])
                if wd['s'] - 0.02 <= T < wd['e'] + 0.6: act = min(n - 1, int((T - wd['s']) / max(0.05, wd['e'] - wd['s']) * n)) if T < wd['e'] else n - 1
            key = ('st', act)
            if key not in s.cache: s.cache[key] = s.compose_stress(act)
            return s.cache[key]
        if k == 'turn': return s.compose_turn(T)
        if k == 'lesson':
            s.mcur = s.meas; m_ = sum(1 for r in s.reveal if T >= r - 0.02)
            s.last_im = s.lesson_page(max(0, m_ - 1)) if s.paged else s.lesson_frame(m_, s.im.height); return s.last_im
        s.mcur = s.meas
        if k == 'card' and getattr(s, 'sub_at', None) and T >= s.sub_at: s.mcur = s.meas_sub; return s.im_sub
        if k == 'cta' and getattr(s, 'cta_pages', None) and T >= s.cta_pages[0]: return s.cta_pages[1]
        if k == 'card' and s.count:
            b = BEATS[s.count]
            if b['s'] <= T < b['e']:
                n = 3 - min(2, int(T - b['s'])); key = ('cnt', n, round((T - b['s']) * 8)); rd = getattr(s, 'ringd', 120)
                if key not in s.cache: s.cache[key] = hrow([s.side_im, ring(str(n), 1 - (T - b['s']) / (b['e'] - b['s']), rd)], 40 if BRD else 60)
                s.digit = str(n); s.mcur = s.meas + [('body', CAPR * rd * 0.55)]; return s.cache[key]
            s.digit = None
        return s.im
    def anim(s, T):
        """-> (scale, alpha, dx, dy, wipe 0..1)"""
        if T < s.t0 or T >= s.t1: return 0, 0, 0, 0, 1
        u = (T - s.t0); a = s.an; sc, al, dx, dy, wp = 1.0, 1.0, 0, 0, 1.0; pg = s.P.get('_page')
        if pg and pg[0] > 0: a = 'cut'
        if a == 'spring': v = u / 0.26; sc = 0.6 + 0.4 * bezier(EASE['spring'], min(1.0, v)); al = ease(v * 1.6)
        elif a == 'stamp': v = u / 0.20; sc = 1.45 - 0.45 * ease(v); al = ease(v * 2.0)
        elif a == 'drop': v = u / 0.30; dy = -70 * (1 - bezier(EASE['spring'], min(1.0, v))); al = ease(v * 2)
        elif a == 'slide': v = u / 0.30; dx = -70 * (1 - ease(v)); al = ease(v * 2)
        elif a == 'wipe': v = u / 0.40; wp = ease(v); al = 1.0
        uo = (s.t1 - T) / 0.16
        if uo < 1 and not (pg and pg[0] < pg[1] - 1): sc *= 0.92 + 0.08 * uo; al *= ease(uo, EASE['inout'])
        return sc, al, dx, dy, wp
# ---------------- captions (v8 CapCut style, centred on x 540) ----------------
def disp(w): b = w.rstrip('.,?!:;'); return DISP.get(b.lower(), b) + w[len(b):]
def keycol(lid, k):
    for name in ('red', 'green', 'yellow', 'mint'):
        if k in KEY[lid].get(name, []): return COL[name]
    return None
PLATE = bool(BRD) and SP.get('caption_style', 'plate') == 'plate'   # v13 (owner 27/10): ONE caption style everywhere – fixed lower band, dark rounded plate, white text, active word yellow, no bounce
DESK = bool(BRD) and not PLATE and BRD['cap'].get('body_overlap_rows', 1) == 0 and BRD['cap']['w'] >= 700   # a clean desk-front / floor band below the teacher
CAPINK = bool(BRD) and not DESK and not PLATE   # board mode: captions are WRITTEN ON THE BOARD in ink (navy, white edge, highlighter on the active word), moved with the camera
CAP = dict(size=max(96, CAPF), min=CAPF, stroke=14, gapx=22, bounce=1.16, settle=1.08) if not BRD else dict(size=CAPF, min=CAPF, stroke=12 if CAPINK else 14, gapx=20, bounce=1.12, settle=1.06)
if PLATE: CAP.update(stroke=0, bounce=1.0, settle=1.0, gapx=14)
if CAPINK: CAP.update(bounce=1.08, settle=1.04)   # v10: caption cap height >= 80 px (CAPF), heavy weight, thick stroke   # ink on a board: a small lift on the active word (page centre stays within 12 px)
ST, SS = CAP['stroke'], 2; HL_PAD = 4 if CAPINK else 0
_wc = {}
def word_im(txt, sz, col, sc, hl=False):
    key = (txt, sz, col, round(sc, 2), hl)
    if key not in _wc:
        fo = font(round(sz * sc * SS)); pad = HL_PAD * SS; tw = int(fo.getlength(txt)) + 4 * ST * SS + 2 * pad; th = int(sz * sc * SS * 1.6) + 4 * ST * SS
        im = Image.new('RGBA', (tw, th), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
        if hl:   # highlighter swash behind the active word (board ink style)
            bb = d.textbbox((tw // 2, th // 2), txt, font=fo, anchor='mm')
            d.rounded_rectangle([bb[0] - pad, th // 2 - sz * sc * SS * 0.42, bb[2] + pad, th // 2 + sz * sc * SS * 0.48], round(sz * sc * SS * 0.14), fill=HILITE['yellow'] + (240,))
        d.text((tw // 2, th // 2), txt, font=fo, fill=col + (255,), anchor='mm', stroke_width=round(ST * SS * min(sc, 1.1)), stroke_fill=((255, 255, 255) if CAPINK else STROKE) + (255,))
        im = im.reduce(SS); a_ = np.asarray(im)[..., 3]; ys, xs = np.nonzero(a_ > 60)
        _wc[key] = (im if CAPINK else shadowed(im, 5, 6, 0.5), (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
        if len(_wc) > 4000: _wc.clear()
    return _wc[key]
def _wpx(seg, sz, bounce=None):   # page row width incl. the active word's bounce, stroke and highlighter
    fo = font(sz); ww = [fo.getlength(disp(x)) for x in seg]; bounce = CAP['bounce'] if bounce is None else bounce
    return sum(ww) + (CAP['gapx'] + fo.getlength(' ')) * (len(seg) - 1) + max(ww) * (bounce - 1) + 2 * ST + 24 + 2 * HL_PAD
ROW2 = False; PITCH = 0; STRIP1 = STRIP2 = None; POPZ = POPZ_TALL = ZONE
PLATE_Y = 1430
if PLATE:   # the whole board is for the lesson cards; captions sit on a fixed plate in the lower safe area (over desk or body, like the approved mock)
    CCX = W / 2; CAPWC = 860; _im, _ib = word_im('Hgjy', CAP['size'], (255, 255, 255), 1.0); PITCH = int(_ib[3] - _ib[1]) + 2
    CAP_CY = PLATE_Y - int((_ib[1] + _ib[3]) / 2 - _im.height / 2); STRIP1 = [int(CCX - CAPWC / 2 - 28), PLATE_Y - 48, int(CCX + CAPWC / 2 + 28), PLATE_Y + 48]; STRIP2 = STRIP1
    print(f'plate captions: band {STRIP1}, pops on the full board zone {POPZ}', flush=True)
elif DESK:   # captions on the measured clean desk front / floor band (CapCut white + stroke, screen space, camera anchored on them)
    BM = np.zeros((H, W), bool); _st = BRD['body']['step']
    for _row in filter(None, BRD['body']['rows'].split(';')):
        _y, _iv = _row.split(':'); _y = int(_y)
        for _x in _iv.split(','): _a, _b = map(int, _x.split('-')); BM[_y:_y + _st, _a:_b] = True
    for _h in HEAD.values(): BM[max(0, _h[1] - 6):_h[3] + 6, max(0, _h[0] - 6):_h[2] + 6] = True
    _im, _ib = word_im('Hgjy', CAP['size'], (255, 255, 255), CAP['bounce']); CAP_CY = int(BRD['cap']['box'][3] - (_ib[3] - _im.height / 2) - 1)
    if CROP: CAP_CY = int(min(CAP_CY, (BRD['cap']['box'][1] + BRD['cap']['box'][3]) / 2 - ((_ib[1] + _ib[3]) / 2 - _im.height / 2)))   # punch-in: centred in the desk band
    _i1, _b1 = word_im('Hgjy', CAP['size'], (255, 255, 255), 1.0); PITCH = int(_b1[3] - _b1[1]) + 2
    STRIP1 = [int(CCX - CAPWC / 2), int(CAP_CY + _ib[1] - _im.height / 2), int(CCX + CAPWC / 2), BRD['cap']['box'][3]]
    STRIP2 = [STRIP1[0], STRIP1[1] - PITCH, STRIP1[2], STRIP1[3]]; ROW2 = not BM[max(0, STRIP2[1]):STRIP2[3], max(0, STRIP2[0]):STRIP2[2]].any() and STRIP2[1] > BAND_Y1
    assert not BM[STRIP1[1]:STRIP1[3], max(0, STRIP1[0]):STRIP1[2]].any(), 'desk caption band touches the person mask'
    print(f'desk captions: strip {STRIP1} (2-row ok={ROW2}), cx {CCX} w {CAPWC}, pops on the board zone {POPZ}', flush=True)
elif BRD:   # caption strip = the board's lower area, clear of the person mask in EVERY frame (bank.json board.body envelope + head boxes)
    BM = np.zeros((H, W), bool); _st = BRD['body']['step']
    for _row in filter(None, BRD['body']['rows'].split(';')):
        _y, _iv = _row.split(':'); _y = int(_y)
        for _x in _iv.split(','): _a, _b = map(int, _x.split('-')); BM[_y:_y + _st, _a:_b] = True
    for _h in HEAD.values(): BM[max(0, _h[1] - 6):_h[3] + 6, max(0, _h[0] - 6):_h[2] + 6] = True
    clear = lambda b: not BM[max(0, b[1]):b[3], max(0, b[0]):b[2]].any()
    CCX = (ZONE[0] + ZONE[2]) / 2; CAPWC = ZW - 8
    _im, _ib = word_im('Hgjy', CAP['size'], COL['navy'], CAP['bounce'], True); _BOT = _ib[3] - _im.height / 2; _TOP = _ib[1] - _im.height / 2
    _i1, _b1 = word_im('Hgjy', CAP['size'], COL['navy'], 1.0); PITCH = int(_b1[3] - _b1[1]) + 2
    _y = ZONE[3] - 2
    while True:
        CAP_CY = int(_y - _BOT); STRIP1 = [ZONE[0], int(CAP_CY + _TOP), ZONE[2], int(_y)]
        if clear(STRIP1): break
        _y -= 4; assert STRIP1[1] > ZONE[1] + 150, 'no caption strip on the board clear of the person mask'
    STRIP2 = [ZONE[0], int(CAP_CY - PITCH + _TOP), ZONE[2], STRIP1[3]]; ROW2 = clear(STRIP2) and not CROP   # v10: one caption row on the board (the board text keeps its height)
    POPZ = [ZONE[0], ZONE[1], ZONE[2], STRIP1[1] - 14]; POPZ_TALL = [ZONE[0], ZONE[1], ZONE[2], STRIP2[1] - 14]
    print(f'board captions: strip {STRIP1} (2-row {STRIP2} ok={ROW2}), cx {CCX} w {CAPWC}, pops above y {POPZ[3]}', flush=True)
fits1 = lambda seg: _wpx(seg, CAP['min'], 1.0 if len(seg) == 1 else None) <= CAPWC   # a long single word keeps the size and drops the bounce
def fits2(seg):
    if not ROW2: return None
    ok = [k for k in range(1, len(seg)) if fits1(seg[:k]) and fits1(seg[k:])]
    return min(ok, key=lambda k: abs(_wpx(seg[:k], CAP['min']) - _wpx(seg[k:], CAP['min']))) if ok else None
BAD_PAGES = []; NOSPLIT = set()
def pages_of(lid):
    ws = [w['w'] for w in LINES[lid]['words']]; paginate.fallback = False; pg = paginate(ws, fits1, fits2, solo_ok=True); bad = single_word_pages(ws, pg, fits1)
    if paginate.fallback: NOSPLIT.add(lid); print(f'caption line {lid}: no 2-3 word pagination fits the column at the minimum size -> one-word pages {bad}', flush=True); bad = []
    if bad: print('WARN one-word caption page (qc caption_script fails)', lid, bad, flush=True); BAD_PAGES.append((lid, bad))
    return [([f'{lid}.{k}' for k in range(j, i)], split) for j, i, split in pg]
def paste_scaled(F, im, cx, cy, sc, al, wipe=1.0):
    if al <= 0.003 or sc <= 0.05: return None
    w, h = max(1, round(im.width * sc)), max(1, round(im.height * sc)); r = im if (w, h) == im.size else im.resize((w, h), Image.BICUBIC)
    x, y = round(cx - w / 2), round(cy - h / 2); rgb, a = rgba_np(r)
    if wipe < 1.0: a = a.copy(); a[:, int(w * wipe):] = 0
    over(F, rgb, a, x, y, al); return [x, y, x + w, y + h]
def _cbox(p, im, sc):   # screen box of a pop's visible content (alpha bbox) when centred in its region
    cb = im.getchannel('A').getbbox()
    if not cb: return None
    rg = p.region; sc_ = min(sc, (rg[2] - rg[0]) / im.width, (rg[3] - rg[1]) / im.height); w, h = im.width * sc_, im.height * sc_
    x0, y0 = (rg[0] + rg[2]) / 2 - w / 2, (rg[1] + rg[3]) / 2 - h / 2
    return [x0 + cb[0] * sc_, y0 + cb[1] * sc_, x0 + cb[2] * sc_, y0 + cb[3] * sc_]
_PFIX = []
def panel_fixed():   # v14 (owner 27/10 "thẻ cố định"): ONE card rectangle for the whole video = union of every board pop's content (sampled), never resizing between pops
    if _PFIX: return _PFIX[0]
    bx = [1e9, 1e9, -1e9, -1e9]
    for p in POPS:
        if p.where != 'board' or p.kind == 'cta': continue
        for T_ in (p.t0 + 0.35, (p.t0 + p.t1) / 2, p.t1 - 0.06):
            b = _cbox(p, p.frame_im(T_), 1.0)
            if b: bx = [min(bx[0], b[0]), min(bx[1], b[1]), max(bx[2], b[2]), max(bx[3], b[3])]
    _PFIX.append(None if bx[0] > 1e8 else bx); return _PFIX[0]
def card_panel(F, vis):   # v14: ONE cream card (rounded, soft shadow, teal edge), fixed size for the whole video, faded with the board content; stays inside SAFE
    if not vis: return
    bx = list(panel_fixed() or [1e9, 1e9, -1e9, -1e9]); amax = 0.0
    for p, sc, al, dx, dy, im in vis:
        cb = im.getchannel('A').getbbox()
        if not cb: continue
        rg = p.region; sc_ = min(sc, (rg[2] - rg[0]) / im.width, (rg[3] - rg[1]) / im.height); w, h = im.width * sc_, im.height * sc_
        x0, y0 = (rg[0] + rg[2]) / 2 - w / 2, (rg[1] + rg[3]) / 2 - h / 2
        bx = [min(bx[0], x0 + cb[0] * sc_), min(bx[1], y0 + cb[1] * sc_), max(bx[2], x0 + cb[2] * sc_), max(bx[3], y0 + cb[3] * sc_)]; amax = max(amax, al)
    if bx[0] > 1e8: return
    x0, y0 = max(SAFE['x0'], int(min(bx[0], ZONE[0]) - 26)), max(SAFE['y0'], int(bx[1] - 26)); x1, y1 = min(SAFE['x1'], int(max(bx[2], ZONE[2]) + 26)), min(SAFE['y1'], int(bx[3] + 26))
    key = (x0, y0, x1, y1)
    if key not in _PANEL:
        if len(_PANEL) > 12: _PANEL.clear()
        w, h = x1 - x0, y1 - y0; P = Image.new('RGBA', (w + 80, h + 80), (0, 0, 0, 0)); d = ImageDraw.Draw(P)
        d.rounded_rectangle([40, 52, 40 + w, 52 + h], 40, fill=(0, 0, 0, 70)); P = P.filter(ImageFilter.GaussianBlur(16)); d = ImageDraw.Draw(P)
        d.rounded_rectangle([40, 40, 40 + w, 40 + h], 40, fill=(255, 253, 246, 246)); d.rounded_rectangle([40, 40 + 36, 40 + 12, 40 + h - 36], 6, fill=(14, 124, 123, 255))
        A = np.asarray(P).astype(np.float32); _PANEL[key] = (A[..., :3][..., ::-1].copy(), A[..., 3] / 255)
    rgb, a = _PANEL[key]; over(F, rgb, a, x0 - 40, y0 - 40, amax)
_PANEL = {}
_HALO = {}
def board_halo(im):   # soft light glow around the glyphs: dilate the alpha 7 px, blur 6 px, warm white at 0.85 – reads as marker on a bright board, never as a box
    k_ = (id(im), im.size)
    if k_ in _HALO: return _HALO[k_]
    if len(_HALO) > 64: _HALO.clear()
    A = np.asarray(im)[..., 3]; g = cv2.GaussianBlur(cv2.dilate(A, np.ones((15, 15), np.uint8)), (0, 0), 6).astype(np.float32) / 255
    out_ = np.zeros((*A.shape, 4), np.uint8); out_[..., :3] = (250, 251, 247); out_[..., 3] = np.clip(g * 0.85 * 255, 0, 255).astype(np.uint8)
    H_ = Image.fromarray(out_, 'RGBA'); H_.alpha_composite(im); _HALO[k_] = H_; return H_
def board_contrast(F, im, r):   # WCAG contrast of the lightest marker ink (green, L=0.19) against the darkest background ring right around the glyphs, measured on the composited frame
    x0, y0, x1, y1 = [int(v) for v in r]; x0, y0 = max(0, x0), max(0, y0); x1, y1 = min(W, x1), min(H, y1)
    if x1 - x0 < 8 or y1 - y0 < 8: return None
    A = cv2.resize(np.asarray(im)[..., 3], (x1 - x0, y1 - y0), interpolation=cv2.INTER_AREA) > 200
    ring = cv2.dilate(A.astype(np.uint8), np.ones((9, 9), np.uint8)).astype(bool) & ~cv2.dilate(A.astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)
    if ring.sum() < 50: return None
    px = F[y0:y1, x0:x1][ring].astype(np.float32) / 255; lin = np.where(px <= 0.04045, px / 12.92, ((px + 0.055) / 1.055) ** 2.4)
    Lb = float(np.percentile(lin[:, 2] * 0.2126 + lin[:, 1] * 0.7152 + lin[:, 0] * 0.0722, 5)); Lt = 0.19 * min(1.0, Lb / 0.9)   # the lightest ink (green) under the SAME light as its board (lit ink)
    return round((Lb + 0.05) / (Lt + 0.05), 2)
CONTRAST = []
def paste_board(F, im, reg, sc, al, dx, dy, wipe, s_cam, lit=False):
    """Write a pop on the whiteboard: centred in its zone region, board perspective (GB), then the camera; returns the screen bbox."""
    if al <= 0.003 or sc <= 0.05: return None
    if sc < 0.8: im = im.resize((max(1, round(im.width * sc)), max(1, round(im.height * sc))), Image.LANCZOS); k = 1.0
    else: k = sc
    w, h = im.width * k, im.height * k; cx_, cy_ = (reg[0] + reg[2]) / 2 + dx, ((reg[1] + h / 2) if V14 else (reg[1] + reg[3]) / 2) + dy   # v14: board writing starts at the top of the board zone
    flat = np.float32([[cx_ - w / 2, cy_ - h / 2], [cx_ + w / 2, cy_ - h / 2], [cx_ + w / 2, cy_ + h / 2], [cx_ - w / 2, cy_ + h / 2]])
    q = cv2.perspectiveTransform(flat[None], GB)[0]; q = np.float32([[AX + (x - AX) * s_cam, AY + (y - AY) * s_cam] for x, y in q])
    x0, y0 = int(np.floor(q[:, 0].min())), int(np.floor(q[:, 1].min())); x1, y1 = int(np.ceil(q[:, 0].max())) + 1, int(np.ceil(q[:, 1].max())) + 1
    A = np.asarray(im).astype(np.float32); a = A[..., 3:4] / 255; pre = np.concatenate([A[..., :3][..., ::-1] * a, a * 255], 2)
    if wipe < 1.0: pre[:, int(im.width * wipe):] = 0
    Mp = cv2.getPerspectiveTransform(np.float32([[0, 0], [im.width, 0], [im.width, im.height], [0, im.height]]), q - np.float32([x0, y0]))
    out = cv2.warpPerspective(pre, Mp, (x1 - x0, y1 - y0), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    al_ = out[..., 3] / 255; rgb = out[..., :3] / np.maximum(al_[..., None], 1e-4)
    if lit:   # v14 (owner 27/10 'chữ hơi giả'): marker ink takes the board's real light – the diagonal window shadow darkens the writing exactly as it darkens the board; soft ink edge
        X0, Y0 = max(0, x0), max(0, y0); X1, Y1 = min(W, x1), min(H, y1)
        if X1 > X0 and Y1 > Y0:
            Lb = cv2.GaussianBlur(cv2.cvtColor(F[Y0:Y1, X0:X1], cv2.COLOR_BGR2GRAY).astype(np.float32), (0, 0), 9)
            fac = np.clip(Lb / max(float(np.percentile(Lb, 97)), 1.0), 0.45, 1.0)
            fl = np.ones(al_.shape, np.float32); fl[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0] = fac; rgb = rgb * fl[..., None]
        al_ = cv2.GaussianBlur(al_.astype(np.float32), (0, 0), 0.6) * 0.97
    over(F, rgb, al_, x0, y0, al); return [x0, y0, x1, y1]
class Page:
    def __init__(s, wids, split=None):
        s.wids = wids; s.split = split; s.lid = WORDS[wids[0]]['line']; s.txt = [disp(WORDS[w]['w']) for w in wids]; sz = CAP['size']
        rows = [list(range(len(wids)))] if split is None else [list(range(split)), list(range(split, len(wids)))]
        while max(_wpx([WORDS[wids[i]]['w'] for i in r], sz) for r in rows) > CAPWC and sz > CAP['min']: sz -= 2
        s.bounce = CAP['bounce']   # v10: the size never drops below the minimum; a wide page loses (part of) the active-word bounce instead
        while max(_wpx([WORDS[wids[i]]['w'] for i in r], sz, s.bounce) for r in rows) > CAPWC and s.bounce > 1.0: s.bounce = round(s.bounce - 0.02, 2)
        s.settle = min(CAP['settle'], s.bounce)
        s.sz = sz; fo = font(sz); s.cx = {}; s.cy = {}; ink = [1e9, -1e9]
        for ri, r in enumerate(rows):
            tw = sum(fo.getlength(s.txt[i]) for i in r) + (CAP['gapx'] + fo.getlength(' ')) * (len(r) - 1); x = CCX - tw / 2; cx = {}
            for i in r: wl = fo.getlength(s.txt[i]); cx[i] = x + wl / 2; x += wl + fo.getlength(' ') + CAP['gapx']
            rk = [1e9, -1e9]   # centre each row on its rendered ink (side bearings / punctuation), not on the advance widths
            for i in r:
                im, ib = word_im(s.txt[i], sz, (255, 255, 255), 1.0); x0 = cx[i] - im.width / 2; rk = [min(rk[0], x0 + ib[0]), max(rk[1], x0 + ib[2])]
            sh = CCX - (rk[0] + rk[1]) / 2; ink = [min(ink[0], rk[0] + sh), max(ink[1], rk[1] + sh)]
            for i in r: s.cx[wids[i]] = cx[i] + sh; s.cy[wids[i]] = CAP_CY - (len(rows) - 1 - ri) * PITCH
        s.ink = ink; s.rows = len(rows)
        s.t0 = WORDS[wids[0]]['s'] - 0.06; s.t1 = WORDS[wids[-1]]['e'] + 0.28; s.text = ' '.join(s.txt)
    def draw(s, F, tm, T, cam_s=1.0):
        bb = [1e9, 1e9, -1e9, -1e9]; wipe = {}; a_in = ease((T - s.t0) / 0.10); sc_in = 0.88 + 0.12 * a_in; items = []; k_ = cam_s if CAPINK else 1.0
        for w, tx in zip(s.wids, s.txt):
            Wd = WORDS[w]; k = Wd['k']; p = max(0.0, min(1.0, (tm - Wd['s']) / max(1e-3, Wd['e'] - Wd['s']))); wipe[w] = round(p, 3)
            act = Wd['s'] <= tm < Wd['e']; kc = keycol(s.lid, k)
            if act:
                u = tm - Wd['s']; sc = 1 + (s.bounce - 1) * ease(u / 0.07) if u < 0.07 else s.bounce - (s.bounce - s.settle) * ease((u - 0.07) / 0.12)
                col = (INKCOL['red'] if kc == COL['red'] else INKCOL['green'] if kc == COL['green'] else COL['navy']) if CAPINK else ((255, 214, 90) if PLATE else (kc if kc in (COL['red'], COL['green']) else ACT))
            else:
                u = tm - Wd['e']; sc = s.settle - (s.settle - 1) * ease(u / 0.10) if 0 <= u < 0.10 else 1.0
                if CAPINK: col = INKCOL['red'] if (kc == COL['red'] and tm >= Wd['s']) else INKCOL['green'] if (kc == COL['green'] and tm >= Wd['s']) else COL['navy']
                else: col = (255, 255, 255) if PLATE else (kc if (kc and tm >= Wd['s']) else (255, 255, 255))
            items.append((act, w, tx, col, sc * sc_in))
        if PLATE and a_in > 0:   # dark rounded plate behind the page (fixed band, width follows the words)
            x0_, x1_ = CCX - (s.ink[1] - s.ink[0]) / 2 - 28, CCX + (s.ink[1] - s.ink[0]) / 2 + 28; pl = Image.new('RGBA', (int(x1_ - x0_), 96), (0, 0, 0, 0))
            ImageDraw.Draw(pl).rounded_rectangle([0, 0, pl.width - 1, 95], 28, fill=(15, 24, 28, int(200 * a_in))); paste_scaled(F, pl, (x0_ + x1_) / 2, PLATE_Y, 1.0, 1.0)
        for act, w, tx, col, sc in sorted(items, key=lambda x: x[0]):
            im, ib = word_im(tx, s.sz, col, sc * k_, act and CAPINK); cx = CCX + (s.cx[w] - CCX) * sc_in; cy = s.cy[w]
            if CAPINK: cx, cy = AX + (cx - AX) * k_, AY + (cy - AY) * k_   # written on the board: moves with the camera like the board text
            r = paste_scaled(F, im, cx, cy, 1.0, a_in)
            if r: bb = [min(bb[0], r[0] + ib[0]), min(bb[1], r[1] + ib[1]), max(bb[2], r[0] + ib[2]), max(bb[3], r[1] + ib[3])]
        return wipe, bb
PAGES = [Page(w_, sp_) for lid in ATL for w_, sp_ in pages_of(lid)]
def _solo_pairs(p):   # a one-word page: the two-word pages it could have joined (both measured wider than the caption column)
    k = WORDS[p.wids[0]]['k']; ws = [w['w'] for w in LINES[p.lid]['words']]; return [ws[a:a + 2] for a in (k - 1, k) if 0 <= a and a + 2 <= len(ws)]
for a, b in zip(PAGES, PAGES[1:]): a.t1 = min(a.t1, b.t0)
CAP_LOG = {f'p{j}': dict(line=p.lid, words=p.wids, text=p.text, n=len(p.wids), rows=p.rows, size=p.sz, stroke=ST, ss=SS, cx=round((p.ink[0] + p.ink[1]) / 2, 1), ink=[round(v) for v in p.ink],
                         last=WORDS[p.wids[-1]]['k'] == len(LINES[p.lid]['words']) - 1, bounce=p.bounce, colw=round(CAPWC), nosplit=p.lid in NOSPLIT,
                         solo_pairs=[round(_wpx(x, CAP['min'])) for x in _solo_pairs(p)] if len(p.wids) == 1 else None) for j, p in enumerate(PAGES)}
print('pages', ' | '.join(p.text.replace(' ', '/', 1) if p.rows > 1 else p.text for p in PAGES), flush=True)
TALL = [(p.t0, p.t1) for p in PAGES if p.rows > 1] if CAPINK else []   # two-row board pages need the strip above them
def nwords(t): return len(re.findall(r"[A-Za-z0-9$][A-Za-z0-9$'’.\-]*", t))
READ_PAD = 0.5   # entrance (spring to full alpha) + exit fade + frame rounding: the text is fully readable for t1 - t0 - READ_PAD (measured 25/10)
POPS = [Pop(p) for p in SP['pops']]
if CAPINK:   # a two-row caption page needs the strip above it: a pop starting with it waits, one ending with it ends first, else it sits higher
    for a, b in TALL:
        for p in POPS:
            if p.t0 < b and p.t1 > a:
                if p.P.get('role') != 'hook' and p.t0 >= a - 0.15: p.t0 = b + 0.02
                elif p.t1 <= b + 0.15: p.t1 = a - 0.02
                else: p.tall = True
                print(f'pop {p.id} vs two-row caption page {a:.2f}-{b:.2f}: t {p.t0:.2f}-{p.t1:.2f} tall={p.tall}', flush=True)
for p in POPS: p.make()
def _share(a, b):   # same place on screen (band: same cx; board: intersecting zone regions)
    if a.where != b.where: return False
    if a.where == 'band': return a.cx == b.cx
    r, q = a.region, b.region; return r[0] < q[2] and q[0] < r[2] and r[1] < q[3] and q[1] < r[3]
def expand_pages(pops):   # a board text pop that needs more than one page at the minimum size becomes N pops, one after the other (more time, never smaller)
    out = []
    for p in pops:
        pg = getattr(p, 'pages', None)
        if not pg or len(pg) == 1: out.append(p); continue
        n = len(pg); need = [nwords(rows_text(r)) / 3 + 0.6 + (0.32 if j == 0 else 0.06) + (0.22 if j == len(pg) - 1 else 0.04) for j, (r, _) in enumerate(pg)]
        if p.P.get('role') == 'hook': need = [1.0] * n   # the hook is owned by hook_readable (first page by 0.4 s, >= 1.2 s in all)
        lim = min([q.t0 - 0.02 for q in pops if q is not p and _share(p, q) and q.t0 > p.t0 + 1e-6] + [a - 0.02 for a, b in TALL if a >= p.t1 - 1e-6] + [TOTAL - 0.40])
        end = min(max(p.t1, p.t0 + sum(need)), lim); span = end - p.t0
        if span < sum(need) - 1e-6: print(f'WARN pages of {p.id}: {span:.2f} s < {sum(need):.2f} s (qc read_time fails)', flush=True)
        t_ = p.t0
        for j, (rows, sz) in enumerate(pg):
            d = span * need[j] / sum(need)
            q = Pop(dict(p.P, rows=rows, size=sz, id=p.id if j == 0 else f'{p.id}_{j + 1}', _page=[j, n], _text=rows_text(rows)))
            q.t0, q.t1 = t_, t_ + d - (0.0 if j < n - 1 else 0); q.tall = p.tall; q.full_text = p.text; q.page_need = need[j]; q.make(); out.append(q); t_ += d
        print(f'pop {p.id}: {n} board pages {[round(x, 2) for x in need]} s in {span:.2f} s', flush=True)
    return out
POPS = expand_pages(POPS)
for a in POPS:   # pops side by side only if they never overlap (checked per frame below); pops in the same place never overlap in time
    for b in POPS:
        if a is not b and _share(a, b) and a.t0 < b.t0 < a.t1: a.t1 = b.t0 - 0.02
for p in POPS:
    if p.t1 - p.t0 < 1.0 and p.kind != 'cta': print('WARN pop shorter than 1.0 s (qc readability decides)', p.id, round(p.t1 - p.t0, 2), flush=True)

for p in POPS:   # minimum read time per text line: words / 3 per second + 0.6 s fully visible (stays longer if the board is free)
    p.need = round(getattr(p, 'page_need', None) or (nwords(p.text) / 3 + 0.6 + READ_PAD), 3) if p.kind == 'rich' and p.P.get('role') != 'hook' else 0.0
    if p.t1 - p.t0 >= p.need: continue
    lim = min([q.t0 - 0.02 for q in POPS if q is not p and _share(p, q) and q.t0 >= p.t1 - 1e-6] + [a - 0.02 for a, b in TALL if a >= p.t1 - 1e-6] + [TOTAL - 0.40])
    p.t1 = max(p.t1, min(p.t0 + p.need, lim))
    if p.t1 - p.t0 < p.need - 1e-6: print(f'WARN read time {p.id}: {p.t1 - p.t0:.2f} s < {p.need:.2f} s (qc read_time fails)', flush=True)
HOOK = next(p for p in POPS if p.P.get('role') == 'hook'); HOOK_TEXT = getattr(HOOK, 'full_text', HOOK.text)
print('pops', [(p.id, p.where, round(p.t0, 2), round(p.t1, 2), p.im.size) for p in POPS], flush=True)


if o.plan:   # dry run: layout + timing only (no frames, no encode)
    json.dump(dict(total=TOTAL, a0=A0, end_seam=round(end_score(A0), 2), joins=JOINS, strip=STRIP1, strip2=STRIP2 if ROW2 else None, popz=POPZ, cap_cx=CCX, cap_w=CAPWC,
                   bad_pages=BAD_PAGES, pages=[dict(text=p.text, rows=p.rows, size=p.sz, t0=round(p.t0, 2), t1=round(p.t1, 2)) for p in PAGES],
                   pops=[dict(id=p.id, kind=p.kind, where=p.where, region=p.region, variant=p.variant, px=round(p.px, 1), t0=round(p.t0, 2), t1=round(p.t1, 2), need=p.need,
                              short=bool(p.need and p.t1 - p.t0 < p.need - 1e-6), text=p.text) for p in POPS]), open(o.plan, 'w'), indent=1, default=str)
    print('plan written', o.plan); sys.exit(0)
# ---------------- frame loop ----------------
print(f'[timing] prep done {time.time() - T_START:.0f} s', flush=True)
GX, GY = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
def morph(Fa, Fb, w):   # flow-based in-between of two frames at time w (0 = Fa, 1 = Fb): I(x) = (1-w) Fa(x - w f_ab) + w Fb(x - (1-w) f_ba)
    ga = cv2.cvtColor(cv2.resize(Fa, (W // 2, H // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY); gb = cv2.cvtColor(cv2.resize(Fb, (W // 2, H // 2), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)
    fab = cv2.resize(cv2.calcOpticalFlowFarneback(ga, gb, None, 0.5, 5, 31, 4, 7, 1.5, 0), (W, H)) * 2; fba = cv2.resize(cv2.calcOpticalFlowFarneback(gb, ga, None, 0.5, 5, 31, 4, 7, 1.5, 0), (W, H)) * 2
    Wa = cv2.remap(Fa, GX - w * fab[..., 0], GY - w * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    Wb = cv2.remap(Fb, GX - (1 - w) * fba[..., 0], GY - (1 - w) * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wb = 1.0 if w >= 0.5 else 0.0   # v10: flow-warped switch (positions follow w, no pixel blend): never a see-through arm / blurry hand at a seam
    return np.clip(Wa.astype(np.float32) * (1 - wb) + Wb.astype(np.float32) * wb + 0.5, 0, 255).astype(np.uint8)
os.makedirs(o.out + '.samples', exist_ok=True)
PREV = {min(NF - 1, int(round(float(x) * FPS))) for x in o.preview.split(',')} if o.preview else None
if PREV is not None:
    os.makedirs(o.out + '.preview', exist_ok=True); enc = None
elif o.merge: enc = None
else:
    SEG0, SEG1 = 0, NF
    if '/' in o.frames:   # 'i/N': shard i of N, cuts on multiples of the 48-frame GOP so every shard keeps the unsharded keyframe grid
        i_, n_ = (int(x) for x in o.frames.split('/')); cut = lambda j: NF if j >= n_ else int(round(NF * j / n_ / 48)) * 48
        SEG0, SEG1 = cut(i_), cut(i_ + 1)
    elif o.frames: SEG0, SEG1 = (int(x) for x in o.frames.split(':'))
    SEG1 = min(SEG1, NF)
    enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-b:v', f'{o.kbps}k', '-maxrate', f'{int(o.kbps * 1.35)}k', '-bufsize', f'{o.kbps * 2}k',
                            '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48', '-movflags', '+faststart', (f'{o.out}.seg{SEG0:05d}.mp4' if o.frames else o.out + '.video.mp4')], stdin=subprocess.PIPE)
CLEAN = None
if o.clean and o.overlay and enc is not None and not o.frames:
    CLEAN = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation',
                              '-b:v', f'{o.kbps}k', '-pix_fmt', 'yuv420p', '-g', '48', '-movflags', '+faststart', o.clean + '.video.mp4'], stdin=subprocess.PIPE)
SPK = [dict(cues=LINES[l]['cues'], at=at) for l, at in ATL.items()]
VSEQ = [LS.viseme_at(SPK, fi / FPS) for fi in range(NF)]   # v11 mouth smoothing (owner 26/10: "mắt miệng ko tự nhiên"): no 1-frame shapes
for fi in range(1, NF - 1):
    if VSEQ[fi] != VSEQ[fi - 1] and VSEQ[fi] != VSEQ[fi + 1]: VSEQ[fi] = VSEQ[fi - 1]; MOTION['mouth_flicks_merged'] = MOTION.get('mouth_flicks_merged', 0) + 1
MOTION['mouth_changes'] = sum(1 for fi in range(1, NF) if VSEQ[fi] != VSEQ[fi - 1])
def mouth_spr(c, fi):   # the frame where the shape changes shows the halfway mouth (previous + new), so the lips move instead of popping
    v = VSEQ[fi]; sp = MO[c].spr[v]
    return sp if fi == 0 or VSEQ[fi - 1] == v else 0.5 * sp + 0.5 * MO[c].spr[VSEQ[fi - 1]]
def identity_check():   # owner 27/10 "đồng nhất nhân vật": every source frame used must show the SAME face, inside the head box, as the family's master frame
    hits = []; used = {}
    for f_ in SEQ:
        for c, k, w in f_: used.setdefault(c, set()).add(k)
    for c, ks in used.items():
        par = TR['clips'][c].get('parent') or c; hb = TR['clips'][par]['head']; ref = _hs(RAW[par][CL[par]['usable'][0]][hb[1]:hb[3], hb[0]:hb[2]] if par in RAW else RAW[c][0][hb[1]:hb[3], hb[0]:hb[2]])
        for k in sorted(ks):   # every used frame (was every 12th: a hand over the face slipped through)
            fc = RAW[c][k][hb[1]:hb[3], hb[0]:hb[2]]; sc = float(cv2.compareHist(ref, _hs(fc), cv2.HISTCMP_CORREL))
            if sc < 0.75: hits.append((c, k, round(sc, 3)))
    return hits
ID_HITS = identity_check(); print('identity check:', len(ID_HITS), 'frames off-model', ID_HITS[:5], flush=True)
FRAMES = []; SHARP = []; SHARP_DUE = False; BODY_HITS = []; MOVE = {c: move_mask(c) for c in {x[0] for f_ in SEQ for x in f_}} if BRD else {}; POPID = {f'pop.{p.id}': p for p in POPS}
if o.frames:   # sharded run: the sharpness-sample latch is state that crosses frames; replay it for the frames before this shard (SEQ is known without rendering)
    for fi in range(SEG0):
        if fi % 24 == 12: SHARP_DUE = True
        if SHARP_DUE and len(SEQ[fi]) == 1: SHARP_DUE = False
for fi in (range(0) if o.merge else range(SEG0, SEG1) if o.frames else range(NF)):
    T = fi / FPS; tm = T + 0.5 / FPS
    if PREV is not None and fi not in PREV: continue
    v = VSEQ[fi]; acc = None; srcs = SEQ[fi]; ims = []
    for c, k, wgt in srcs:
        Fm = norm_frame(RAW[c][k].copy() if HOSTFX == 'raw' else MO[c].apply(RAW[c][k].copy(), k, mouth_spr(c, fi))); ims.append(Fm)
        acc = Fm.astype(np.float32) * wgt if acc is None else acc + Fm.astype(np.float32) * wgt
    if len(srcs) == 2: F = morph(ims[0], ims[1], srcs[1][2] / max(1e-6, srcs[0][2] + srcs[1][2]))   # dissolve = flow morph (no double arms / heads)
    else: F = np.clip(acc + 0.5, 0, 255).astype(np.uint8) if len(srcs) > 1 else Fm
    s = cam(T); mx, my = maps_c(s)
    out = cv2.remap(F, mx, my, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE) if s > 1.0001 else F.copy(); out = sharpen(out, s)
    els = []; PRE = []
    for p in POPS:
        sc, al, dx, dy, wp = p.anim(T)
        if al > 0.003 and not o.overlay: PRE.append((p, sc, al, dx, dy, wp, p.frame_im(T)))
    # v14 (owner 27/10): no cream panel – the lesson is written straight on the whiteboard in marker ink (a box on a board looked illogical); card_panel kept for reference
    for p, sc, al, dx, dy, wp, im in PRE:
        cr_ = None
        if p.where == 'board':
            rg = p.region; sc = min(sc, (rg[2] - rg[0]) / im.width, (rg[3] - rg[1]) / im.height)   # pre-fit: no entrance (stamp / spring) grows past the region
            sx_ = max(0.0, ((rg[2] - rg[0]) - im.width * sc) / 2 - 2); sy_ = max(0.0, ((rg[3] - rg[1]) - im.height * sc) / 2 - 2)
            dx = max(-sx_, min(sx_, dx)); dy = max(0.0, min(2 * sy_, dy)) if V14 else max(-sy_, min(sy_, dy))   # slide / drop only inside the board region (no slack = a fade); v14 = top-aligned, so the slack is all below
            ink_ = V14 and p.kind != 'cta'
            r = paste_board(out, im, rg, sc, al, dx, dy, wp, s, lit=ink_); cr_ = board_contrast(out, im, r) if (ink_ and p.kind in ('lesson', 'note', 'rich') and r and al >= 0.999 and fi % 12 == 0) else None; pxs = round(p.px * sc * s, 1); ms = [[a_, round(v_ * sc * s * PSC, 1)] for a_, v_ in getattr(p, 'mcur', [])]   # contrast: ink text only (quiz pills / picture tiles / stress chips carry their own dark plates)
        else:
            sc = min(sc, (CAPW - 2) / im.width if p.cx == CX else 9, (BAND_H - 2) / im.height); r = paste_scaled(out, im, p.cx + dx, BAND_CY + dy, sc, al, wp); pxs = round(p.px * sc, 1); ms = [['body', round(CAPR * p.px * sc, 1)]]
        if r and p.where == 'board' and cr_ is not None: CONTRAST.append(dict(t=round(T, 3), pop=p.id, cr=cr_))
        if r: els.append(dict(name=f'pop.{p.id}', text=p.text, bbox=r, px=pxs, alpha=round(al, 3), group='hook' if p.P.get('role') == 'hook' else ('cta' if p.kind == 'cta' else 'pop'),
                              digit=getattr(p, 'digit', None) if p.kind in ('quiz', 'card') else None, where=p.where, m=ms))
    wipe = {}
    if CLEAN is not None: CLEAN.stdin.write(out.tobytes())   # caption-free copy (embed formats: captions ship as a VTT track)
    for pi, p in enumerate(PAGES):
        if pi + 1 < len(PAGES) and PAGES[pi + 1].t0 <= T and p.t0 <= T and T < PAGES[pi + 1].t0 + 0.25:
            wipe.update({w: round(max(0.0, min(1.0, (tm - WORDS[w]['s']) / max(1e-3, WORDS[w]['e'] - WORDS[w]['s']))), 3) for w in p.wids})
        if p.t0 <= T < p.t1:
            wp_, bb = p.draw(out, tm, T, s); wipe.update(wp_)
            if bb[0] < 1e8: els.append(dict(name=f'cap.p{pi}', text=p.text, bbox=[round(x) for x in bb], px=p.sz, alpha=1.0, group='caption', digit=None, where='cap', m=[['caption', round(CAPR * p.sz * (s if CAPINK else 1.0), 1)]]))
    if MOVE:   # owner 26/10 "tránh che khuất chồng chéo": no settled board text over the moving teacher of THIS frame's clip
        cm = max(srcs, key=lambda x: x[2])[0]; Mv = MOVE[cm]
        for e in els:
            if e['where'] != 'board' or e['alpha'] < 0.999 or e['group'] == 'caption': continue
            p_ = POPID.get(e['name']); bb = e['bbox']
            if p_ is not None and p_.kind in ('lesson', 'note'):
                cb = getattr(p_, 'last_im', p_.im).getbbox()
                if cb: bb = [p_.region[0] + 2 + cb[0], p_.region[1] + 2 + cb[1], p_.region[0] + 2 + cb[2], p_.region[1] + 2 + cb[3]]
            x0_, y0_, x1_, y1_ = [max(0, int(v) // 8) for v in bb]; cells = Mv[y0_:max(y0_ + 1, y1_), x0_:max(x0_ + 1, x1_)]
            if cells.size and cells.mean() > 0.02: BODY_HITS.append((round(T, 2), e['name'], cm, round(float(cells.mean()), 3)))
    if PREV is not None: cv2.imwrite(f'{o.out}.preview/t{T:05.2f}.png', out); continue
    enc.stdin.write(out.tobytes())
    win = [AX - AX / s, AY - AY / s, AX + (W - AX) / s, AY + (H - AY) / s]
    FRAMES.append(dict(t=round(T, 4), src=[[c, k, round(w_, 4)] for c, k, w_ in srcs], s=round(s, 5), M=[s, 0, (1 - s) * AX, 0, s, (1 - s) * AY], win=[round(x, 2) for x in win],
                       vis=v, wipe=wipe, els=[[e['name'], e['text'], *[round(x) for x in e['bbox']], e['alpha'], e['px'], e['group'], e['digit'], e['where'], e['m']] for e in els]))
    if fi in (0, NF - 1): cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
    if fi % 24 == 12: SHARP_DUE = True
    if SHARP_DUE and len(srcs) == 1:   # sharpness sample every second, on the next single-source frame (a dissolve is not a resampling measure)
        SHARP_DUE = False
        c0, k0 = srcs[0][0], srcs[0][1]; FR = HEAD_RAW[c0]; FR = [FR[0] + 80, FR[1] + 120, FR[2] - 80, FR[3] - 60]
        Fn = norm_frame(RAW[c0][k0].copy() if HOSTFX == 'raw' else MO[c0].apply(RAW[c0][k0].copy(), k0, mouth_spr(c0, fi)), crop=False) if CROP else F
        nat = cv2.cvtColor(Fn[FR[1]:FR[3], FR[0]:FR[2]], cv2.COLOR_BGR2GRAY); r = [round(x) for x in to_screen(_tb(FR) if CROP else FR, s)]; r = [max(0, r[0]), max(0, r[1]), min(W, r[2]), min(H, r[3])]
        scr = cv2.cvtColor(out[r[1]:r[3], r[0]:r[2]], cv2.COLOR_BGR2GRAY)
        SHARP.append(dict(frame=fi, s=round(s, 4), rect=r, var_native=round(float(cv2.Laplacian(nat, cv2.CV_64F).var()), 2), var_render=round(float(cv2.Laplacian(scr, cv2.CV_64F).var()), 2)))
        cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
    if fi % 48 == 0: print(f'frame {fi}/{NF} s={s:.3f}', flush=True)
if PREV is not None: print('preview written', o.out + '.preview'); sys.exit(0)
if o.frames:
    enc.stdin.close(); assert enc.wait() == 0, 'ffmpeg encode failed'
    json.dump(dict(a=SEG0, b=SEG1, frames=FRAMES, sharp=SHARP, body_hits=BODY_HITS, contrast=CONTRAST, emoji=EMO_USED), open(f'{o.out}.shard{SEG0:05d}.json', 'w'), default=lambda x: x.item() if hasattr(x, 'item') else str(x))
    print(f'shard {SEG0}:{SEG1} done'); sys.exit(0)
if o.merge:
    import glob
    sh = sorted((json.load(open(f)) for f in glob.glob(o.out + '.shard*.json')), key=lambda d: d['a'])
    assert sh and sh[0]['a'] == 0 and sh[-1]['b'] == NF and all(x['b'] == y['a'] for x, y in zip(sh, sh[1:])), 'shards do not tile 0..NF'
    for d in sh: FRAMES += d['frames']; SHARP += d['sharp']; BODY_HITS += d['body_hits']; CONTRAST += d['contrast']; EMO_USED.update(d['emoji'])
    assert len(FRAMES) == NF, (len(FRAMES), NF)
    with open(o.out + '.concat.txt', 'w') as lf:
        for d in sh: lf.write(f"file '{os.path.abspath(o.out)}.seg{d['a']:05d}.mp4'\n")
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', o.out + '.concat.txt', '-c', 'copy', '-movflags', '+faststart', o.out + '.video.mp4'], check=True)
    for f in glob.glob(o.out + '.seg*.mp4') + glob.glob(o.out + '.shard*.json') + [o.out + '.concat.txt']: os.remove(f)
else:
    enc.stdin.close(); assert enc.wait() == 0, 'ffmpeg encode failed'
    if CLEAN is not None: CLEAN.stdin.close(); assert CLEAN.wait() == 0, 'ffmpeg encode (clean plate) failed'
cv2.imwrite(o.out + '.src0.png', norm_frame(RAW[SEQ[0][0][0]][SEQ[0][0][1]]))   # the source frame actually shown at t = 0 (gated plan starts at the talk clip's first usable frame)

# ---------------- audio: voices + set ambience (-40 dB) + ticks + ding + soft pops ----------------
SR = 24000; mix = np.zeros(int(TOTAL * SR) + SR, np.float32)
def put(a, t0, g=1.0):
    i = int(round(t0 * SR)); n = min(len(a), len(mix) - i)
    if n > 0: mix[i:i + n] += a[:n] * g
for lid, at in ATL.items(): put(LINES[lid]['a'], at)
amb = f"{LIB}/{SET['amb']}" if SET.get('amb') else ''
if amb and os.path.exists(amb):
    b = pcm(amb); b = np.tile(b, int(len(mix) / len(b)) + 1)[:len(mix)]; rms = float(np.sqrt(np.mean(b ** 2))) or 1; mix += b * (10 ** (-40 / 20) / rms)
nt = np.arange(int(0.05 * SR)); tick = (np.sin(2 * np.pi * 1320 * nt / SR) * np.exp(-nt / (0.012 * SR))).astype(np.float32)
for b in BEATS.values():
    if b['kind'] == 'count':
        for k in range(3): put(tick, b['s'] + k, 0.18)
    else:
        for k in range(int(b['e'] - b['s'])): put(tick, b['s'] + k, 0.07)
np_ = np.arange(int(0.06 * SR)); popw = (np.sin(2 * np.pi * (520 + 900 * np_ / len(np_)) * np_ / SR) * np.exp(-np_ / (0.015 * SR))).astype(np.float32)
for p in ([] if o.overlay else POPS[1:]): put(popw, p.t0, 0.10)   # overlay plate: the motion layer owns the pop timing (no sfx at the planned board pops)
ding = f"{LIB}/{SET['ding']}" if SET.get('ding') else ''
if not (ding and os.path.exists(ding)): ding = f'{o.foot}/anchor/tools/foley/ding.wav'
REV = [tm_of(p.P['reveal']) for p in POPS if p.kind == 'quiz'] + [p.t0 for p in POPS if p.id == 'reveal']
if os.path.exists(ding):
    for r in REV: put(pcm(ding), r, 0.25)
put((np.sin(2 * np.pi * 1000 * np.arange(int(0.1 * SR)) / SR) * 10 ** (-60 / 20)).astype(np.float32), 0.0)
mix = mix[:int(round(TOTAL * SR))]
with wave.open(o.out + '.mix.wav', 'wb') as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.out + '.video.mp4', '-i', o.out + '.mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0,aresample=48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', o.out], check=True)
if o.clean and not o.frames and not o.merge:
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.clean + '.video.mp4', '-i', o.out, '-map', '0:v', '-map', '1:a', '-c', 'copy', '-movflags', '+faststart', o.clean], check=True); os.remove(o.clean + '.video.mp4')
os.remove(o.out + '.video.mp4')
json.dump(dict(style='v10', crop=CROP, min_cap=MIN_CAP, min_img=MIN_IMG, cap_ratio=CAPR, spec=SP, fps=FPS, size=[W, H], total=TOTAL, n=NF, safe=SAFE, cx=CX, capw=CAPW, band=BAND, smax=SMAX, anchor=[AX, AY], head=HEAD, joins=JOINS, xf=XF, xfe=XFE,
               beats=BEATS, gaps=GAPS, gap_max=GAP_GATE, cap_cx=CCX, cap_w=CAPWC, cap_cy=CAP_CY, cap_ink=CAPINK, cap_plate=PLATE, cap_strip=STRIP1, board_contrast=CONTRAST, moods=[[l, w, c, TR['clips'][c].get('mood', 'talk')] for l, w, c in MOODS], v14=dict(on=V14, crop=CROP, zone=ZONE, head=HEAD.get(SP['clips'][0])) if V14 else None, read_pad=READ_PAD,
               board=dict(zone=ZONE, popz=POPZ, quad=BRD['quad'], perspective=GB.tolist(), cap_box=STRIP1, body=BRD['body'], where={p.id: p.where for p in POPS}) if BRD else None, hook=dict(text=HOOK_TEXT, t0=HOOK.t0, t1=max(p.t1 for p in POPS if p.P.get('role') == 'hook'), kind=HOOK.kind),
               pops=[dict(id=p.id, kind=p.kind, text=p.text, t0=round(p.t0, 3), t1=round(p.t1, 3), url=getattr(p, 'url', None), where=p.where, variant=p.variant, role=p.P.get('role'), need=p.need, region=p.region) for p in POPS],
               emoji=EMO_USED, script={k: TXT[k] for k in ATL}, display=DISP,
               lines={lid: dict(at=round(at, 3), dur=round(LINES[lid]['dur'], 3), gen=LINES[lid]['gen'], cues=len(LINES[lid]['cues']), speed=LINES[lid]['speed'], whisper=LINES[lid]['whisper']) for lid, at in ATL.items()},
               overlay_plate=bool(o.overlay), host_parent={c: TR['clips'].get(c, {}).get('parent') or c for c in sorted({x[0] for f_ in SEQ for x in f_})}, host_move={c: [[int(y) * 8, int(np.flatnonzero(r)[0]) * 8, int(np.flatnonzero(r)[-1]) * 8 + 8] for y, r in enumerate(m_) if r.any()] for c, m_ in MOVE.items()} if o.overlay else None,
               words=WORDS, captions=CAP_LOG, sharp=SHARP, motion=MOTION, body_hits=BODY_HITS[:40], n_body_hits=len(BODY_HITS), identity_hits=ID_HITS[:20], n_identity_hits=len(ID_HITS), frames=FRAMES), open(o.out + '.timeline.json', 'w'), default=lambda x: x.item() if hasattr(x, 'item') else str(x))
print(f'[timing] finished {time.time() - T_START:.0f} s')
print(f'done {o.out}: {TOTAL:.2f} s, {NF} frames')
