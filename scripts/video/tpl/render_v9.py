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
Captions = script tokens + TTS word times (never the whisper text). Writes <out>, <out>.timeline.json (qc_v9.py), <out>.samples/, <out>.src0.png."""
import os, sys, json, math, argparse, subprocess, wave, re
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); from tokens import SAFE, C, bezier, EASE
sys.path.insert(0, f'{ROOT}/scripts/cine'); import lipsync as LS

ap = argparse.ArgumentParser()
for a in ('spec', 'vo', 'foot', 'fonts', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--img', default='', help='folder with <h>.webp vocab images (content/lexicon/img.json)')
ap.add_argument('--teachers', default=f'{ROOT}/content/video/cine/teachers.json')
ap.add_argument('--icon', default=f'{ROOT}/brand/social/logo/lexkite-app-icon.png')
ap.add_argument('--emoji', default='/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf')
ap.add_argument('--kbps', type=int, default=8800)
ap.add_argument('--preview', default='')
o = ap.parse_args()
W, H, FPS = 1080, 1920, 24
SP = json.load(open(o.spec)); TR = json.load(open(o.teachers))
SET = TR['sets'][SP['set']]; CL = {c: TR['clips'][c] for c in SP['clips']}
assert all(v['set'] == SP['set'] and v['who'] == SP['teacher'] for v in CL.values()), 'one teacher, one set'
WHO = SP['teacher']; LIB = f"{o.foot}/{SET['lib']}"; SMAX = SET['smax']
CX = W / 2; CAPW = 2 * (SAFE['x1'] - CX)          # centred column that stays inside the safe area: 156..924
CAP_CY = 1410; BAND_Y1 = 1328; XF = 8; XFE = 14
FH = f"{o.fonts}/BeVietnamPro-ExtraBold.ttf"; FBd = f"{o.fonts}/BeVietnamPro-Bold.ttf"
_fc = {}
def font(sz, f=None):
    k = (f or FH, int(sz))
    if k not in _fc: _fc[k] = ImageFont.truetype(k[0], int(sz))
    return _fc[k]
ease = lambda x, p=EASE['out']: bezier(p, max(0.0, min(1.0, x)))
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
GAP0, GAPMAX, TAIL = 0.22, 0.45, 1.2
GAP_GATE = 0.60   # measured silence between lines (incl. the TTS tail) – a natural sentence pause, never stretched
t = 0.12; ATL = {}; BEATS = {}; GAPS = []; prev_end = None
for l in SP['lines']:
    if l.get('beat'):
        t += 0.12; BEATS[l['id']] = dict(kind=l['beat'], s=round(t, 3), e=round(t + l['dur'], 3)); t += l['dur'] + 0.1; prev_end = None; continue
    g = min(GAPMAX, l.get('gap', GAP0)) if ATL else 0.0; t += g
    if prev_end is not None: GAPS.append(dict(before=l['id'], gap=round(t - prev_end, 3)))
    ATL[l['id']] = round(t, 3); L = LINES[l['id']]; prev_end = t + L['words'][-1]['e']
    t += L['words'][-1]['e'] + (L['dur'] - L['words'][-1]['e']) * 0.5
END = t; TOTAL0 = END + TAIL; NF = int(math.ceil(TOTAL0 * FPS)); TOTAL = NF / FPS
assert 18.0 <= TOTAL <= 35.0, ('natural length outside 18-35 s', TOTAL)
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
def clip_path(c): return f"{LIB}/{SET['path']}/{c}.mp4"
RAW = {}
for c, v in CL.items():
    cap = cv2.VideoCapture(clip_path(c)); fr = []
    while True:
        ok, f = cap.read()
        if not ok: break
        fr.append(f)
    lo, hi = v['usable']; RAW[c] = fr[:hi + 1]; assert len(RAW[c]) > lo + 3 * XF, ('clip too short', c, len(fr))
    assert fr[0].shape[1] == W and fr[0].shape[0] in (1916, 1920), ('clip size', c, fr[0].shape)
SMALL = {c: [cv2.resize(cv2.cvtColor(f, cv2.COLOR_BGR2GRAY), (135, 240)).astype(np.float32) for f in fr] for c, fr in RAW.items()}
def _face(c, f):
    x0, y0, x1, y1 = CL[c]['head']; y1 = min(y1, f.shape[0]); g = cv2.cvtColor(f[y0:y1, x0:x1], cv2.COLOR_BGR2GRAY); return cv2.resize(g, ((x1 - x0) // 2, (y1 - y0) // 2)).astype(np.float32)
FACE_S = {c: [_face(c, f) for f in fr] for c, fr in RAW.items()}
def dif(c1, i1, c2, i2):   # whole frame + 2x weight on the face (eyes, mouth): the dissolve must not ghost the eyes
    a, b = FACE_S[c1][i1], FACE_S[c2][i2]; h_, w_ = min(a.shape[0], b.shape[0]), min(a.shape[1], b.shape[1])
    return float(np.abs(SMALL[c1][i1] - SMALL[c2][i2]).mean()) + 2 * float(np.abs(a[:h_, :w_] - b[:h_, :w_]).mean())
def plan(nf, a0=None):
    order = SP['clips']; seq = []; c = order[0]; a = CL[c]['usable'][0] if a0 is None else a0; j = 0; joins = []; used = {}
    while len(seq) < nf + XF:
        hi = len(RAW[c]) - 1; best = None
        for n in order:   # next = any talk clip of this teacher (or a loop point of the same clip): the best-matching face wins, no ghosting
            lo_n = CL[n]['usable'][0]
            for b in range(max(a + 60, hi - 40), hi + 1, 2):
                for e in range(lo_n, min(lo_n + 40, len(RAW[n]) - 60), 2):
                    if n == c and e >= b - 60: continue
                    d = dif(c, b - XF // 2, n, e + XF // 2) * (0.92 if n != c else 1.0) * (1 + 0.2 * used.get((c, b, n, e), 0))   # vary the loop points
                    if best is None or d < best[0]: best = (d, b, e, n)
        n = best[3]; used[(c, best[1], n, best[2])] = used.get((c, best[1], n, best[2]), 0) + 1
        _, b, e, n = best
        for k in range(a, b - XF + 1): seq.append([(c, k, 1.0)])
        for q in range(XF):
            w = (q + 1) / (XF + 1); seq.append([(c, b - XF + 1 + q, 1 - w), (n, e + q, w)])
        joins.append(dict(at_frame=len(seq) - XF, from_clip=c, exit=b, to_clip=n, entry=e, diff=round(best[0], 2)))
        c, a, j = n, e + XF, j + 1
    seq = seq[:nf]; c0 = SP['clips'][0]; a0 = CL[c0]['usable'][0] if a0 is None else a0
    for q in range(XFE):   # final dissolve back to frame 0 (loop)
        w = ease((q + 1) / XFE, EASE['inout']); fi = nf - XFE + q
        seq[fi] = [(cc, kk, ww * (1 - w)) for cc, kk, ww in seq[fi] if ww * (1 - w) > 1e-4] + [(c0, a0 - XFE + 1 + q, w)]   # target plays forward INTO the loop frame
    seq[-1] = [(c0, a0, 1.0)]
    return seq, joins
def end_score(a0):   # how far the pose at the start of the final dissolve is from the loop frame (c0, a0)
    sq, _ = plan(NF, a0); c, k, _w = max(sq[NF - XFE - 1], key=lambda x: x[2]); return dif(c, k, SP['clips'][0], a0 - XFE)
_c0 = SP['clips'][0]; _lo = CL[_c0]['usable'][0]
A0 = min(range(max(_lo, XFE), len(RAW[_c0]) - 64, 3), key=end_score)   # start frame chosen so the loop dissolve joins similar poses
SEQ, JOINS = plan(NF, A0)
print(f'loop frame {_c0}:{A0} end diff {end_score(A0):.2f}', flush=True)
print('joins', JOINS, flush=True)
MO = {c: LS.Mouth(f"{LIB}/{SET['meta']}/{c}/{WHO}") for c in CL}
def norm_frame(F):
    if F.shape[0] == H: return F
    r = cv2.resize(F, (round(W * H / F.shape[0]), H), interpolation=cv2.INTER_LANCZOS4); x0 = (r.shape[1] - W) // 2; return r[:, x0:x0 + W].copy()   # uniform 1916 -> 1920

# ---------------- camera: uniform scale about the face, slow push + punch-ins ----------------
AXY = {c: tuple(v['anchor']) for c, v in CL.items()}; AX, AY = AXY[SP['clips'][0]]
assert len(set(AXY.values())) == 1, 'one camera anchor per set'
HEAD = {c: v['head'] for c, v in CL.items()}
PUNCH = []
for p in SP.get('punch', []): PUNCH.append((tm_of(p['from']), tm_of(p['to']), p.get('amp', 0.04)))
if not PUNCH:   # default: punch on the first pop after the hook and on the last answer/fix pop
    cand = [p for p in SP['pops'] if p.get('role') != 'hook' and p['kind'] not in ('cta',)]
    for p in (cand[0], cand[-1]) if len(cand) > 1 else cand:
        a = tm_of(p['from']); PUNCH.append((a, min(a + 2.2, tm_of(p['to'])), 0.035 if SMAX < 1.08 else 0.05))
PUSH = 0.025 if SMAX < 1.08 else 0.035; TB = TOTAL - 1.35
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
assert BAND_H >= 240, 'no room under the chin for pops'

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
def stack(rows, gap=8):
    w = max(r.width for r in rows); h = sum(r.height for r in rows) + gap * (len(rows) - 1); im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); y = 0
    for r in rows: im.alpha_composite(r, ((w - r.width) // 2, y)); y += r.height + gap
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
    ss = 2; st = 0 if plate else max(8, round(sz * 0.12)); fo = font(sz * ss); items = []; run = []
    def flush():
        if not run: return
        txt = ''.join(t_ for t_, _ in run); tw = int(fo.getlength(txt)) + 4 * st * ss + 8; th = int(sz * ss * 1.5) + 4 * st * ss
        im = Image.new('RGBA', (tw, th), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = 2 * st * ss + 4
        for t_, c_ in run:
            d.text((x, th // 2), t_, font=fo, fill=COL[c_] + (255,), anchor='lm', stroke_width=st * ss, stroke_fill=STROKE + (255,)); x += fo.getlength(t_)
        im = im.reduce(ss); bb = im.getbbox() or (0, 0, 1, 1); cy = im.height // 2; hh = round(sz * 0.62) + st
        items.append(im.crop((bb[0], min(bb[1], cy - hh), bb[2], max(bb[3], cy + hh)))); run.clear()
    for seg in segs:
        s_ = seg[0]
        if s_.startswith('@'):
            flush(); k = s_[1:]
            if k in ('x', 'ok', 'q'): items.append(badge(k, round(sz * 1.0)))
            elif k.startswith('num:'): items.append(num_disc(k[4:], round(sz * 1.75)))
            elif k.startswith('emoji:'): items.append(emoji_im(k[6:], round(sz * 0.95)))
        else: run.append((s_, seg[1]))
    flush()
    return hrow(items, round(sz * 0.18))
def plate_wrap(im, colname, pad=(34, 22)):
    w, h = im.width + 2 * pad[0], im.height + 2 * pad[1]; P = Image.new('RGBA', (w * 2, h * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(P)
    d.rounded_rectangle([0, 0, w * 2 - 1, h * 2 - 1], min(h, 64) * 2 // 2, fill=COL[colname] + (246,), outline=(255, 255, 255, 235), width=8)
    P = P.resize((w, h), Image.LANCZOS); P.alpha_composite(im, (pad[0], pad[1])); return shadowed(P, 6, 8, 0.45)
def rich(rows, sz, plate=None, maxw=None, maxh=None, pad=(34, 22), sub=1.0):
    maxw = maxw or CAPW - 8; maxh = maxh or BAND_H - 6
    while True:
        im = stack([rich_row(r, sz if i == 0 else round(sz * sub), bool(plate)) for i, r in enumerate(rows)], round(sz * 0.08))
        if plate: im = plate_wrap(im, plate, pad)
        else: im = shadowed(im, 5, 6, 0.5)
        if (im.width <= maxw and im.height <= maxh) or sz * min(1.0, sub) <= 50: return im, round(sz * min(1.0, sub))
        sz -= 2
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
def pill(segs, sz, bg, dim=False):
    fo = font(sz * 2); tw = int(sum(fo.getlength(s) for s, _ in segs)); w = tw + 4 * 34; h = int(sz * 2 * 1.32) + 4 * 16
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.rounded_rectangle([0, 0, w - 1, h - 1], h // 2, fill=bg + (246,), outline=(255, 255, 255, 235), width=6); x = 68
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
        s.text = ''; s.px = 0; s.build()
    def build(s):
        P = s.P; k = s.kind
        if k == 'rich':
            s.im, s.px = rich(P['rows'], P.get('size', 76), P.get('plate'), maxw=(2 * min(s.cx - SAFE['x0'], SAFE['x1'] - s.cx) - 8)); s.text = rows_text(P['rows'])
        elif k == 'cta':
            ic = ICON.resize((72, 72), Image.LANCZOS); m = Image.new('L', ic.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 71, 71], 18, fill=255)
            ic.putalpha(Image.fromarray((np.asarray(ic)[..., 3].astype(np.float32) * np.asarray(m) / 255).astype(np.uint8)))
            seg = SP['cta']['say']; sz = 62
            while sz > 50 and hrow([ic, rich_row([[seg, 'white']], sz)], 14).width > CAPW - 12: sz -= 2
            l1 = shadowed(hrow([ic, rich_row([[seg, 'white']], sz)], 14), 5, 6, 0.5)
            pl = pill([('lexkite.com', ACC if ACC not in (COL['navy2'], COL['navy']) else COL['mint'])], 62, COL['navy'])
            s.im = stack([l1, pl], 12); s.px = min(sz, 62); s.text = f'{seg} / lexkite.com'
        elif k == 'card':
            side = min(230, BAND_H - 40); tile, s.url = vocab_img(P['img'], side)
            if 'right' in P:   # horizontal: picture + text block (guess)
                s.side_im = tile; rr, s.px = rich(P['right'], 78, None, maxw=CAPW - tile.width - 40, maxh=BAND_H - 10)
                s.im = hrow([tile, rr], 34); s.text = rows_text(P['right']); s.count = P.get('count')
            else:
                chip = pill([(P['idx'], COL['navy'])], 44, ACC)
                rows = [[[P['word'], 'white']]] + ([P['sub']] if P.get('sub') else []); rr, s.px = rich(rows, 92, None, maxw=CAPW - tile.width - 40, maxh=BAND_H - chip.height - 12); right = stack([chip, rr], 6) if P.get('idx') else rr
                s.im = hrow([tile, right], 30); s.text = (P.get('idx', '') + ' ' + P['word'] + (' / ' + ''.join(x[0] for x in P['sub']) if P.get('sub') else '')).strip(); s.count = None
            assert s.im.height <= BAND_H and s.im.width <= CAPW, ('card too big', s.id, s.im.size)
        elif k == 'pair':
            def tile(d, lit=True, size=100 if P.get('vs') else 104):
                rows = [[[d['title'], 'white']]] + ([d['sub']] if d.get('sub') else [])
                im, sz_ = rich(rows, size, d.get('color', 'navy2'), sub=0.62, maxw=(CAPW - (96 if P.get('vs') else 26)) // 2, maxh=BAND_H - 10, pad=(16, 14) if P.get('vs') else (24, 16)); s.pxs.append(sz_)
                if not lit: a = np.asarray(im).copy(); a[..., 3] = (a[..., 3] * 0.38).astype(np.uint8); im = Image.fromarray(a)
                return im
            s.pxs = []; s.L = {True: tile(P['left']), False: tile(P['left'], False)}; s.R = {True: tile(P['right']), False: tile(P['right'], False)}
            s.vs = shadowed(rich_row([['VS', 'yellow']], 52), 4, 5, 0.5) if P.get('vs') else None
            s.focus = [(tm_of(a), f) for a, f in P.get('focus', [])]; s.px = min(s.pxs); s.text = P['left']['title'] + ' | ' + P['right']['title']
            s.im = s.compose_pair('both')
        elif k == 'quiz':
            q = P.get('q'); s.qim = rich(q, 70, None)[0] if q else None
            ca = COL['green']; s.pA = {st: pill([('A  ', COL['yellow'] if st != 'ok' else COL['navy']), (P['a'], (255, 255, 255) if st != 'ok' else COL['navy'])], 58, ca if st == 'ok' else COL['navy'], st == 'dim') for st in ('n', 'ok', 'dim')}
            s.pB = {st: pill([('B  ', COL['yellow'] if st != 'ok' else COL['navy']), (P['b'], (255, 255, 255) if st != 'ok' else COL['navy'])], 58, ca if st == 'ok' else COL['navy'], st == 'dim') for st in ('n', 'ok', 'dim')}
            s.rev = tm_of(P['reveal']); s.px = 58; s.text = f"A {P['a']} | B {P['b']}"; s.im = s.compose_quiz(0.0)
        elif k == 'stress':
            s.px = 72; s.text = '·'.join(P['syl']); s.im = s.compose_stress(-1)
        elif k == 'turn':
            s.head_im, s.px = rich(P['rows'], 88, None, maxh=BAND_H - 60); s.text = rows_text(P['rows']); b = BEATS[P['beat']]; s.b0, s.b1 = b['s'], b['e']; s.im = s.compose_turn(0.0)
        assert s.im.height <= BAND_H + 2, ('pop taller than the band', s.id, s.im.size, BAND_H)
    def compose_pair(s, f):
        L = s.L[f in ('left', 'both')]; R = s.R[f in ('right', 'both')]; items = [L] + ([s.vs] if s.vs else []) + [R]; return hrow(items, 12 if s.vs else 22)
    def compose_quiz(s, T):
        st_a = st_b = 'n'
        if T >= s.rev: st_a, st_b = ('ok', 'dim') if s.P['correct'] == 'a' else ('dim', 'ok')
        mid = []
        b = BEATS.get('_count')
        if b and b['s'] <= T < b['e']: n = 3 - min(2, int(T - b['s'])); mid = [ring(str(n), 1 - (T - b['s']) / (b['e'] - b['s']), 130)]; s.digit = str(n)
        else: s.digit = None
        wide = hrow([s.pA['n'], ring('3', 1.0), s.pB['n']], 24).width > CAPW - 8
        if wide and s.qim is not None:   # long options: ring goes next to the question, pills keep their full size
            q = hrow([s.qim] + mid, 20) if mid else s.qim; return stack([q, hrow([s.pA[st_a], s.pB[st_b]], 24)], 14)
        row = hrow([s.pA[st_a]] + mid + [s.pB[st_b]], 24)
        return stack([s.qim, row], 14) if s.qim else row
    def compose_stress(s, active):
        syl = s.P['syl']; st = s.P['stress']; items = []
        for i, x in enumerate(syl):
            big = i == st; on = active < 0 or i <= active
            col = ACC if big else COL['navy']; tc = COL['navy'] if (big and ACC in (COL['yellow'], COL['mint'], COL['cream'])) else (255, 255, 255)
            p = pill([(x, tc)], 96 if big else 72, col if on else COL['navy'], dim=not on)
            dot = Image.new('RGBA', (p.width, 72), (0, 0, 0, 0)); r = 30 if big else 13
            ImageDraw.Draw(dot).ellipse([p.width // 2 - r, 36 - r, p.width // 2 + r, 36 + r], fill=(COL['yellow'] if big else (255, 255, 255)) + (255 if on else 110,), outline=STROKE + (255,), width=4)
            items.append(stack([dot, p], 4))
        return hrow(items, 14)
    def compose_turn(s, T):
        rem = 1.0 if T < s.b0 else max(0.0, 1 - (T - s.b0) / (s.b1 - s.b0)); bw = int(min(CAPW - 60, max(s.head_im.width, 520))); bar = Image.new('RGBA', (bw, 30), (0, 0, 0, 0)); d = ImageDraw.Draw(bar)
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
            return s.compose_quiz(T)
        if k == 'stress':
            act = -1; sw = [x for x in (s.P.get('sweep'), s.P.get('sweep2')) if x]
            for a in sw:   # syllables light up one by one while the sweep word is spoken
                wd = wt(a[0], a[1]); n = len(s.P['syl'])
                if wd['s'] - 0.02 <= T < wd['e'] + 0.6: act = min(n - 1, int((T - wd['s']) / max(0.05, wd['e'] - wd['s']) * n)) if T < wd['e'] else n - 1
            key = ('st', act)
            if key not in s.cache: s.cache[key] = s.compose_stress(act)
            return s.cache[key]
        if k == 'turn': return s.compose_turn(T)
        if k == 'card' and s.count:
            b = BEATS[s.count]
            if b['s'] <= T < b['e']:
                n = 3 - min(2, int(T - b['s'])); key = ('cnt', n, round((T - b['s']) * 8))
                if key not in s.cache: s.cache[key] = hrow([s.side_im, ring(str(n), 1 - (T - b['s']) / (b['e'] - b['s']), 120)], 60)
                s.digit = str(n); return s.cache[key]
            s.digit = None
        return s.im
    def anim(s, T):
        """-> (scale, alpha, dx, dy, wipe 0..1)"""
        if T < s.t0 or T >= s.t1: return 0, 0, 0, 0, 1
        u = (T - s.t0); a = s.an; sc, al, dx, dy, wp = 1.0, 1.0, 0, 0, 1.0
        if a == 'spring': v = u / 0.26; sc = 0.6 + 0.4 * bezier(EASE['spring'], min(1.0, v)); al = ease(v * 1.6)
        elif a == 'stamp': v = u / 0.20; sc = 1.45 - 0.45 * ease(v); al = ease(v * 2.0)
        elif a == 'drop': v = u / 0.30; dy = -70 * (1 - bezier(EASE['spring'], min(1.0, v))); al = ease(v * 2)
        elif a == 'slide': v = u / 0.30; dx = -70 * (1 - ease(v)); al = ease(v * 2)
        elif a == 'wipe': v = u / 0.40; wp = ease(v); al = 1.0
        uo = (s.t1 - T) / 0.16
        if uo < 1: sc *= 0.92 + 0.08 * uo; al *= ease(uo, EASE['inout'])
        return sc, al, dx, dy, wp
POPS = [Pop(p) for p in SP['pops']]
for a in POPS:   # band holds pops side by side only if they never overlap (checked per frame below); same-cx pops never overlap in time
    for b in POPS:
        if a is not b and a.cx == b.cx and a.t0 < b.t0 < a.t1: a.t1 = b.t0 - 0.02
for p in POPS:
    if p.t1 - p.t0 < 1.0 and p.kind != 'cta': print('WARN pop shorter than 1.0 s (qc readability decides)', p.id, round(p.t1 - p.t0, 2), flush=True)
HOOK = next(p for p in POPS if p.P.get('role') == 'hook')
print('pops', [(p.id, round(p.t0, 2), round(p.t1, 2), p.im.size) for p in POPS], flush=True)

# ---------------- captions (v8 CapCut style, centred on x 540) ----------------
PUN = lambda w: w[-1] in '.?!:,;'
def pages_of(lid):
    toks = LINES[lid]['words']; n = len(toks); best = [(0, [])] + [None] * n
    for i in range(1, n + 1):
        for L in (1, 2, 3):
            j = i - L
            if j < 0 or best[j] is None: continue
            seg = [toks[x]['w'] for x in range(j, i)]; c = 0.0
            fo = font(CAP['size']); wpx = (sum(fo.getlength(disp(x)) for x in seg) + (CAP['gapx'] + fo.getlength(' ')) * (L - 1)) * CAP['bounce'] * CAP['min'] / CAP['size']
            if L > 1 and wpx + 2 * ST + 40 > CAPW: continue   # a page must fit (with the bounce) at the minimum size, else split it
            if L == 1: c += 0.8 if seg[0][-1] in '!?.:' else 3.0
            if L == 3: c += 0.3
            c += 0.0 if (i == n or seg[-1][-1] in '.?!:') else (0.4 if seg[-1][-1] in ',;' else 1.2)
            c += sum(2.5 if s[-1] in '.?!:' else 0.9 for s in seg[:-1] if PUN(s))
            tot = best[j][0] + c
            if best[i] is None or tot < best[i][0]: best[i] = (tot, best[j][1] + [(j, i)])
    return [[f'{lid}.{k}' for k in range(a, b)] for a, b in best[n][1]]
def disp(w): b = w.rstrip('.,?!:;'); return DISP.get(b.lower(), b) + w[len(b):]
def keycol(lid, k):
    for name in ('red', 'green', 'yellow', 'mint'):
        if k in KEY[lid].get(name, []): return COL[name]
    return None
CAP = dict(size=96, min=72, stroke=12, gapx=22, bounce=1.16, settle=1.08); ST, SS = CAP['stroke'], 2
_wc = {}
def word_im(txt, sz, col, sc):
    key = (txt, sz, col, round(sc, 2))
    if key not in _wc:
        fo = font(round(sz * sc * SS)); tw = int(fo.getlength(txt)) + 4 * ST * SS; th = int(sz * sc * SS * 1.6) + 4 * ST * SS
        im = Image.new('RGBA', (tw, th), (0, 0, 0, 0)); ImageDraw.Draw(im).text((tw // 2, th // 2), txt, font=fo, fill=col + (255,), anchor='mm', stroke_width=round(ST * SS * min(sc, 1.1)), stroke_fill=STROKE + (255,))
        im = im.reduce(SS); a_ = np.asarray(im)[..., 3]; ys, xs = np.nonzero(a_ > 60)
        _wc[key] = (shadowed(im, 5, 6, 0.5), (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1))
        if len(_wc) > 4000: _wc.clear()
    return _wc[key]
def paste_scaled(F, im, cx, cy, sc, al, wipe=1.0):
    if al <= 0.003 or sc <= 0.05: return None
    w, h = max(1, round(im.width * sc)), max(1, round(im.height * sc)); r = im if (w, h) == im.size else im.resize((w, h), Image.BICUBIC)
    x, y = round(cx - w / 2), round(cy - h / 2); rgb, a = rgba_np(r)
    if wipe < 1.0: a = a.copy(); a[:, int(w * wipe):] = 0
    over(F, rgb, a, x, y, al); return [x, y, x + w, y + h]
class Page:
    def __init__(s, wids):
        s.wids = wids; s.lid = WORDS[wids[0]]['line']; s.txt = [disp(WORDS[w]['w']) for w in wids]; sz = CAP['size']
        while True:
            fo = font(sz); tw = sum(fo.getlength(x) for x in s.txt) + CAP['gapx'] * (len(s.txt) - 1) + fo.getlength(' ') * (len(s.txt) - 1)
            if tw * CAP['bounce'] + 2 * ST + 24 <= CAPW or sz <= CAP['min']: break
            sz -= 2
        s.sz = sz; fo = font(sz); x = CX - tw / 2; s.cx = {}
        for w, tx in zip(wids, s.txt): wl = fo.getlength(tx); s.cx[w] = x + wl / 2; x += wl + fo.getlength(' ') + CAP['gapx']
        ink = [1e9, -1e9]   # centre the page on its rendered ink (side bearings / punctuation), not on the advance widths
        for w, tx in zip(wids, s.txt):
            im, ib = word_im(tx, sz, (255, 255, 255), 1.0); x0 = s.cx[w] - im.width / 2; ink = [min(ink[0], x0 + ib[0]), max(ink[1], x0 + ib[2])]
        sh = CX - (ink[0] + ink[1]) / 2; s.cx = {w: v + sh for w, v in s.cx.items()}; s.ink = [ink[0] + sh, ink[1] + sh]
        s.t0 = WORDS[wids[0]]['s'] - 0.06; s.t1 = WORDS[wids[-1]]['e'] + 0.28; s.text = ' '.join(s.txt)
    def draw(s, F, tm, T):
        bb = [1e9, 1e9, -1e9, -1e9]; wipe = {}; a_in = ease((T - s.t0) / 0.10); sc_in = 0.88 + 0.12 * a_in; items = []
        for w, tx in zip(s.wids, s.txt):
            Wd = WORDS[w]; k = Wd['k']; p = max(0.0, min(1.0, (tm - Wd['s']) / max(1e-3, Wd['e'] - Wd['s']))); wipe[w] = round(p, 3)
            act = Wd['s'] <= tm < Wd['e']; kc = keycol(s.lid, k)
            if act:
                u = tm - Wd['s']; sc = 1 + (CAP['bounce'] - 1) * ease(u / 0.07) if u < 0.07 else CAP['bounce'] - (CAP['bounce'] - CAP['settle']) * ease((u - 0.07) / 0.12)
                col = kc if kc in (COL['red'], COL['green']) else ACT
            else:
                u = tm - Wd['e']; sc = CAP['settle'] - (CAP['settle'] - 1) * ease(u / 0.10) if 0 <= u < 0.10 else 1.0
                col = kc if (kc and tm >= Wd['s']) else (255, 255, 255)
            items.append((act, w, tx, col, sc * sc_in))
        for act, w, tx, col, sc in sorted(items, key=lambda x: x[0]):
            im, ib = word_im(tx, s.sz, col, sc); cx = CX + (s.cx[w] - CX) * sc_in; r = paste_scaled(F, im, cx, CAP_CY, 1.0, a_in)
            if r: bb = [min(bb[0], r[0] + ib[0]), min(bb[1], r[1] + ib[1]), max(bb[2], r[0] + ib[2]), max(bb[3], r[1] + ib[3])]
        return wipe, bb
PAGES = [Page(p) for lid in ATL for p in pages_of(lid)]
for a, b in zip(PAGES, PAGES[1:]): a.t1 = min(a.t1, b.t0)
CAP_LOG = {f'p{j}': dict(line=p.lid, words=p.wids, text=p.text, n=len(p.wids), size=p.sz, stroke=ST, ss=SS, cx=round((p.ink[0] + p.ink[1]) / 2, 1), ink=[round(v) for v in p.ink]) for j, p in enumerate(PAGES)}
print('pages', ' | '.join(p.text for p in PAGES), flush=True)

# ---------------- frame loop ----------------
os.makedirs(o.out + '.samples', exist_ok=True)
PREV = {min(NF - 1, int(round(float(x) * FPS))) for x in o.preview.split(',')} if o.preview else None
if PREV is not None:
    os.makedirs(o.out + '.preview', exist_ok=True); enc = None
else:
    enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                            '-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-b:v', f'{o.kbps}k', '-maxrate', f'{int(o.kbps * 1.35)}k', '-bufsize', f'{o.kbps * 2}k',
                            '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-g', '48', '-movflags', '+faststart', o.out + '.video.mp4'], stdin=subprocess.PIPE)
SPK = [dict(cues=LINES[l]['cues'], at=at) for l, at in ATL.items()]
FRAMES = []; SHARP = []
for fi in range(NF):
    T = fi / FPS; tm = T + 0.5 / FPS
    if PREV is not None and fi not in PREV: continue
    v = LS.viseme_at(SPK, T); acc = None; srcs = SEQ[fi]
    for c, k, wgt in srcs:
        Fm = norm_frame(MO[c].apply(RAW[c][k].copy(), k, MO[c].spr[v]))
        acc = Fm.astype(np.float32) * wgt if acc is None else acc + Fm.astype(np.float32) * wgt
    F = np.clip(acc + 0.5, 0, 255).astype(np.uint8) if len(srcs) > 1 else Fm
    s = cam(T); mx, my = maps_c(s)
    out = cv2.remap(F, mx, my, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE) if s > 1.0001 else F.copy(); out = sharpen(out, s)
    els = []
    for p in POPS:
        sc, al, dx, dy, wp = p.anim(T)
        if al <= 0.003: continue
        im = p.frame_im(T); sc = min(sc, (CAPW - 2) / im.width if p.cx == CX else 9, (BAND_H - 2) / im.height)
        r = paste_scaled(out, im, p.cx + dx, BAND_CY + dy, sc, al, wp)
        if r: els.append(dict(name=f'pop.{p.id}', text=p.text, bbox=r, px=round(p.px * sc, 1), alpha=round(al, 3), group='hook' if p is HOOK else ('cta' if p.kind == 'cta' else 'pop'),
                              digit=getattr(p, 'digit', None) if p.kind in ('quiz', 'card') else None))
    wipe = {}
    for pi, p in enumerate(PAGES):
        if pi + 1 < len(PAGES) and PAGES[pi + 1].t0 <= T and p.t0 <= T and T < PAGES[pi + 1].t0 + 0.25:
            wipe.update({w: round(max(0.0, min(1.0, (tm - WORDS[w]['s']) / max(1e-3, WORDS[w]['e'] - WORDS[w]['s']))), 3) for w in p.wids})
        if p.t0 <= T < p.t1:
            wp_, bb = p.draw(out, tm, T); wipe.update(wp_)
            if bb[0] < 1e8: els.append(dict(name=f'cap.p{pi}', text=p.text, bbox=[round(x) for x in bb], px=p.sz, alpha=1.0, group='caption', digit=None))
    if PREV is not None: cv2.imwrite(f'{o.out}.preview/t{T:05.2f}.png', out); continue
    enc.stdin.write(out.tobytes())
    win = [AX - AX / s, AY - AY / s, AX + (W - AX) / s, AY + (H - AY) / s]
    FRAMES.append(dict(t=round(T, 4), src=[[c, k, round(w_, 4)] for c, k, w_ in srcs], s=round(s, 5), M=[s, 0, (1 - s) * AX, 0, s, (1 - s) * AY], win=[round(x, 2) for x in win],
                       vis=v, wipe=wipe, els=[[e['name'], e['text'], *[round(x) for x in e['bbox']], e['alpha'], e['px'], e['group'], e['digit']] for e in els]))
    if fi in (0, NF - 1): cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
    if fi % 24 == 12:
        c0 = srcs[0][0]; FACE = HEAD[c0]; FACE = [FACE[0] + 80, FACE[1] + 120, FACE[2] - 80, FACE[3] - 60]
        nat = cv2.cvtColor(F[FACE[1]:FACE[3], FACE[0]:FACE[2]], cv2.COLOR_BGR2GRAY); r = [round(x) for x in to_screen(FACE, s)]; r = [max(0, r[0]), max(0, r[1]), min(W, r[2]), min(H, r[3])]
        scr = cv2.cvtColor(out[r[1]:r[3], r[0]:r[2]], cv2.COLOR_BGR2GRAY)
        SHARP.append(dict(frame=fi, s=round(s, 4), rect=r, var_native=round(float(cv2.Laplacian(nat, cv2.CV_64F).var()), 2), var_render=round(float(cv2.Laplacian(scr, cv2.CV_64F).var()), 2)))
        cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
    if fi % 48 == 0: print(f'frame {fi}/{NF} s={s:.3f}', flush=True)
if PREV is not None: print('preview written', o.out + '.preview'); sys.exit(0)
enc.stdin.close(); assert enc.wait() == 0, 'ffmpeg encode failed'
cv2.imwrite(o.out + '.src0.png', norm_frame(RAW[SP['clips'][0]][A0]))

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
for p in POPS[1:]: put(popw, p.t0, 0.10)
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
os.remove(o.out + '.video.mp4')
json.dump(dict(style='v9', spec=SP, fps=FPS, size=[W, H], total=TOTAL, n=NF, safe=SAFE, cx=CX, capw=CAPW, band=BAND, smax=SMAX, anchor=[AX, AY], head=HEAD, joins=JOINS, xf=XF, xfe=XFE,
               beats=BEATS, gaps=GAPS, gap_max=GAP_GATE, hook=dict(text=HOOK.text, t0=HOOK.t0, t1=HOOK.t1, kind=HOOK.kind),
               pops=[dict(id=p.id, kind=p.kind, text=p.text, t0=round(p.t0, 3), t1=round(p.t1, 3), url=getattr(p, 'url', None)) for p in POPS],
               emoji=EMO_USED, script={k: TXT[k] for k in ATL}, display=DISP,
               lines={lid: dict(at=round(at, 3), dur=round(LINES[lid]['dur'], 3), gen=LINES[lid]['gen'], cues=len(LINES[lid]['cues']), speed=LINES[lid]['speed'], whisper=LINES[lid]['whisper']) for lid, at in ATL.items()},
               words=WORDS, captions=CAP_LOG, sharp=SHARP, frames=FRAMES), open(o.out + '.timeline.json', 'w'), default=lambda x: x.item() if hasattr(x, 'item') else str(x))
print(f'done {o.out}: {TOTAL:.2f} s, {NF} frames')
