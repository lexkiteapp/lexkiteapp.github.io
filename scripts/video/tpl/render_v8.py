#!/usr/bin/env python3
"""Pilot v8 "one continuous talking head" (docs/VIDEO-TEMPLATES.md §13) – the standard educational-Shorts format:
ONE continuous MCU shot of the teacher (anchor bank a01, native 1080x1920, no cut-out, no stretch, no cut to another scene), slow push-in + 2 punch-ins,
CapCut-style captions (2-3 words per page, one line, heavy white + dark outline, active word pops in the accent colour with a small scale bounce)
in the lower-middle desk zone, a big top hook for the first ~2 s (red X badge, no strike-through), key-text pops above the head, small emoji pops
beside the head, a minimal 3-2-1 quiz (A/B pills), a CTA pill + small logo, loop-clean (last frame == first frame).

  python3 scripts/video/tpl/render_v8.py --lesson L.json --lines lines.json --hooks reviewed-hooks.json --vo VO/vis3 --lib footage/anchor --fonts F --out out.mp4

Captions come from the SCRIPT text (lines.json) with the TTS word timings (news_voice.py aligns the exact script tokens; whisper is only a clock),
never from the whisper transcript. Writes <out>, <out>.timeline.json (qc_v8.py), <out>.samples/, <out>.mix.wav."""
import os, sys, json, math, argparse, subprocess, wave
import numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); from tokens import SAFE, C, bezier, EASE
sys.path.insert(0, f'{ROOT}/scripts/cine'); import lipsync as LS

ap = argparse.ArgumentParser()
for a in ('lesson', 'lines', 'hooks', 'vo', 'lib', 'fonts', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--icon', default=f'{ROOT}/brand/social/logo/lexkite-app-icon.png')
ap.add_argument('--emoji', default='/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf')
ap.add_argument('--clip', default='a01_ama_talk')
ap.add_argument('--kbps', type=int, default=8800)
ap.add_argument('--preview', default='', help='comma list of seconds: render only those frames to <out>.preview/*.png')
o = ap.parse_args()
W, H, FPS = 1080, 1920, 24
V8 = dict(anchor=(540, 430), push=0.04, punch=(0.05, 0.04), smax=1.10,
          cap_size=96, cap_min=72, cap_stroke=12, cap_cy=1410, cap_words=3, gapx=22, bounce=1.16, settle=1.08,
          top=(236, 436), pills_y=1218, icon=(822, 560, 96))
AX, AY = V8['anchor']; SX0, SX1 = SAFE['x0'], SAFE['x1']; SCX = (SX0 + SX1) / 2
FH = f"{o.fonts}/BeVietnamPro-ExtraBold.ttf"; FBd = f"{o.fonts}/BeVietnamPro-Bold.ttf"
_fc = {}
def font(sz, f=None):
    k = (f or FH, int(sz))
    if k not in _fc: _fc[k] = ImageFont.truetype(k[0], int(sz))
    return _fc[k]
ease = lambda x, p=EASE['out']: bezier(p, max(0.0, min(1.0, x)))
WHITE, YEL, GRN, RED, INK, MINT = (255, 255, 255), C['yellow'], C['green'], C['red'], C['navy'], C['mint']
STROKE = (10, 22, 26)
LZ = json.load(open(o.lesson)); LJ = json.load(open(o.lines)); DISP = LJ.get('display', {})
TXT = {l['id']: l['text'] for l in LJ['lines']}; KEY = {l['id']: l.get('key', {}) for l in LJ['lines']}
HV = json.load(open(o.hooks))['verdicts'][LZ['id']]
assert HV['hook_true'] and HV['right_ok'] and HV['wrong_is_error'] and HV['wrong'] == LZ['wrong_line'] and HV['right'] == LZ['key_line'], 'hook verdict'
assert TXT['v8_w'] == HV['wrong'] and HV['right'] in TXT['v8_k'] and HV['right'] in TXT['v8_a'], 'script must carry the reviewed wrong/right lines verbatim'

# ---------------- voice lines: wav + Rhubarb cues + SCRIPT-token word times (refined on the audio onsets) ----------------
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
    for k in range(len(out) - 1): out[k]['e'] = round(min(out[k]['e'], out[k + 1]['s']), 3)   # a word's highlight ends when the next word starts
    return out
LINES = {}
for lid in TXT:
    a = pcm(f'{o.vo}/{lid}.wav'); cj = json.load(open(f'{o.vo}/{lid}.json')); wj = json.load(open(f'{o.vo}/{lid}.words.json'))
    toks = TXT[lid].split()
    assert [w['w'] for w in wj['words']] == toks, ('word timings must be on the exact script tokens', lid)
    LINES[lid] = dict(id=lid, text=TXT[lid], a=a, dur=len(a) / 24000, cues=cj['mouthCues'], gen=cj.get('generator'), words=refine(a, wj['words']), whisper=wj.get('whisper'))

# ---------------- timeline: one continuous shot, pacing by short pauses ----------------
PLAN = [('v8_h', 0.20), ('v8_w', 0.10), ('v8_k', 0.38), ('v8_y', 0.30), ('v8_x', 0.24), ('v8_q', 0.28), ('count', 0.12), ('v8_a', 0.10), ('v8_s', 0.32)]
COUNT = 3.0; TAIL = 1.5
def place(k):
    t = 0.0; atl = {}; c0 = 0
    for lid, gap in PLAN:
        t += gap * k
        if lid == 'count': c0 = t; t += COUNT; continue
        atl[lid] = t; t += LINES[lid]['words'][-1]['e'] + (LINES[lid]['dur'] - LINES[lid]['words'][-1]['e']) * 0.5
    return t, atl, c0
GK = 1.0
while place(GK)[0] + TAIL < 25.4 and GK < 2.2: GK += 0.05   # too short -> slightly longer pauses (never slower speech); 25-30 s target
END, ATL, C0 = place(GK); NF = int(math.ceil((END + TAIL) * FPS))
BANK = {c['id']: c for c in json.load(open(f'{o.lib}/bank.json'))['clips']}; LO, HI = BANK[o.clip].get('usable_frames', [0, 120])
def pp_hi(nf):   # ping-pong 0..hi..0 k times must end exactly on frame 0 (loop): nf - 1 = 2 k hi
    for hi in range(HI, 84, -1):
        if (nf - 1) % (2 * hi) == 0: return hi
    return None
while pp_hi(NF) is None: NF += 1
PHI = pp_hi(NF); TOTAL = NF / FPS
def src_of(fi): p = fi % (2 * PHI); return p if p <= PHI else 2 * PHI - p
WORDS = {}
for lid, at in ATL.items():
    for k, w in enumerate(LINES[lid]['words']): WORDS[f'{lid}.{k}'] = dict(line=lid, k=k, w=w['w'], s=round(at + w['s'], 3), e=round(at + w['e'], 3), raw_s=round(at + w['raw_s'], 3), onset=None if w['onset'] is None else round(at + w['onset'], 3), checked=w['checked'])
def wt(lid, k): return WORDS[f'{lid}.{k}']
def lend(lid): return wt(lid, len(LINES[lid]['words']) - 1)['e']
print(f'total {TOTAL:.2f} s (gap x{GK:.2f}), {NF} frames, ping-pong 0..{PHI}, count @{C0:.2f}, lines ' + ' '.join(f'{k}@{v:.2f}' for k, v in ATL.items()), flush=True)

# ---------------- camera: slow push-in, 2 punch-ins (key line, answer), eases back to 1.0 for the loop frame ----------------
TB = TOTAL - 1.35
P1 = (wt('v8_k', 2)['s'] - 0.05, lend('v8_k') + 0.25); P2 = (wt('v8_a', 2)['s'] - 0.05, lend('v8_a') + 0.15)
def bump(T, a, b, amp, ri=0.22, ro=0.30):
    if T < a or T > b + ro: return 0.0
    return amp * (ease((T - a) / ri) if T < b else 1 - ease((T - b) / ro, EASE['inout']))
def cam(T):
    base = V8['push'] * ease(T / TB, EASE['inout']) if T < TB else V8['push'] * (1 - ease((T - TB) / 1.15, EASE['inout']))
    return 1.0 + base + bump(T, *P1, V8['punch'][0]) + bump(T, *P2, V8['punch'][1])
def maps(s):
    X, Y = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    return (AX + (X - AX) / s).astype(np.float32), (AY + (Y - AY) / s).astype(np.float32)
_mc = {}
def maps_c(s):
    k = round(s, 4)
    if k not in _mc:
        if len(_mc) > 6: _mc.clear()
        _mc[k] = maps(k)
    return _mc[k]
def sharpen(img, s):
    if s <= 1.001: return img
    amt = min(0.9, (s - 1.0) * 9.0); b = cv2.GaussianBlur(img, (0, 0), 1.0)
    return cv2.addWeighted(img, 1 + amt, b, -amt, 0)
def to_screen(b, s): x0, y0, x1, y1 = b; return [AX + (x0 - AX) * s, AY + (y0 - AY) * s, AX + (x1 - AX) * s, AY + (y1 - AY) * s]

# ---------------- drawing helpers ----------------
def rgba_np(im): a = np.asarray(im).astype(np.float32); return a[..., :3][..., ::-1].copy(), a[..., 3] / 255
def over(F, rgb, al, x, y, mult=1.0):
    h, w = al.shape; X0, Y0 = max(0, x), max(0, y); X1, Y1 = min(W, x + w), min(H, y + h)
    if X1 <= X0 or Y1 <= Y0 or mult <= 0: return
    a = al[Y0 - y:Y1 - y, X0 - x:X1 - x, None] * mult; r = F[Y0:Y1, X0:X1].astype(np.float32)
    F[Y0:Y1, X0:X1] = np.clip(r * (1 - a) + rgb[Y0 - y:Y1 - y, X0 - x:X1 - x] * a, 0, 255).astype(np.uint8)
def shadowed(im, off=6, blur=7, k=0.55):
    a = np.asarray(im)[..., 3].astype(np.float32) / 255; sh = cv2.GaussianBlur(np.roll(a, off, axis=0), (0, 0), blur) * k
    base = Image.new('RGBA', im.size, (0, 0, 0, 0)); arr = np.zeros((im.size[1], im.size[0], 4), np.uint8); arr[..., 3] = (sh * 255).astype(np.uint8)
    base = Image.fromarray(arr); base.alpha_composite(im); return base
def segs_line(segs, sz, stroke, f=None, ss=2):
    """segs [(text, rgb)] -> RGBA image of one line (white-ish heavy text with dark outline), rendered 2x then reduced. Returns (img, ink bbox)."""
    fo = font(sz * ss, f); txt = ''.join(s for s, _ in segs); tw = int(fo.getlength(txt)) + 4 * stroke * ss; th = int(sz * ss * 1.5) + 4 * stroke * ss
    im = Image.new('RGBA', (tw, th), (0, 0, 0, 0)); d = ImageDraw.Draw(im); x = 2 * stroke * ss; y = th // 2
    for s_, col in segs:
        d.text((x, y), s_, font=fo, fill=col + (255,), anchor='lm', stroke_width=stroke * ss, stroke_fill=STROKE + (255,)); x += fo.getlength(s_)
    im = im.reduce(ss); bb = im.getbbox() or (0, 0, 1, 1); return im.crop(bb)
def fit(segs, sz, maxw, stroke, lo=56, f=None):
    while sz > lo and segs_line(segs, sz, stroke, f).width > maxw: sz -= 2
    return sz
def badge(kind, d_=84):
    im = Image.new('RGBA', (d_ * 2, d_ * 2), (0, 0, 0, 0)); g = ImageDraw.Draw(im); col = RED if kind == 'x' else GRN
    g.ellipse([4, 4, 2 * d_ - 4, 2 * d_ - 4], fill=col + (255,), outline=WHITE + (255,), width=10); c = d_; r = d_ * 0.42; w = 22
    if kind == 'x': g.line([(c - r, c - r), (c + r, c + r)], fill=WHITE + (255,), width=w); g.line([(c - r, c + r), (c + r, c - r)], fill=WHITE + (255,), width=w)
    else: g.line([(c - r, c + 2), (c - r * 0.25, c + r * 0.7), (c + r, c - r * 0.6)], fill=WHITE + (255,), width=w, joint='curve')
    return im.resize((d_, d_), Image.LANCZOS)
def stack(rows, gap=8, align='c'):
    """rows: list of RGBA images -> one centred block."""
    w = max(r.width for r in rows); h = sum(r.height for r in rows) + gap * (len(rows) - 1)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); y = 0
    for r in rows: im.alpha_composite(r, ((w - r.width) // 2 if align == 'c' else 0, y)); y += r.height + gap
    return im
def hrow(items, gap=18):
    w = sum(i.width for i in items) + gap * (len(items) - 1); h = max(i.height for i in items); im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); x = 0
    for i in items: im.alpha_composite(i, (x, (h - i.height) // 2)); x += i.width + gap
    return im
def pill_im(txt_segs, sz, bg, pad=(34, 18), f=None, icon=None):
    fo = font(sz * 2, f); tw = int(sum(fo.getlength(s) for s, _ in txt_segs)); ih = icon.height * 2 if icon else 0
    w = tw + 2 * pad[0] * 2 + (ih + 24 if icon else 0); h = max(int(sz * 2 * 1.32), ih) + 2 * pad[1] * 2
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); d = ImageDraw.Draw(im); d.rounded_rectangle([0, 0, w - 1, h - 1], h // 2, fill=bg + (246,), outline=WHITE + (235,), width=6)
    x = pad[0] * 2
    if icon: im.alpha_composite(icon.resize((ih, ih), Image.LANCZOS), (x, (h - ih) // 2)); x += ih + 24
    for s_, col in txt_segs: d.text((x, h // 2), s_, font=fo, fill=col + (255,), anchor='lm'); x += fo.getlength(s_)
    return shadowed(im.reduce(2), 5, 6, 0.45)

# ---------------- emoji pops (Noto Color Emoji; vector fallback) ----------------
EMO_OK = os.path.exists(o.emoji)
def emoji_im(ch, fb, sz=96):
    if EMO_OK:
        try:
            fo = ImageFont.truetype(o.emoji, 109); im = Image.new('RGBA', (160, 160), (0, 0, 0, 0)); ImageDraw.Draw(im).text((80, 80), ch, font=fo, anchor='mm', embedded_color=True)
            bb = im.getbbox()
            if bb and (bb[2] - bb[0]) > 60: return shadowed(im.crop(bb).resize((sz, sz), Image.LANCZOS), 4, 5, 0.4), 'noto'
        except Exception as e: print('emoji fallback', ch, e)
    kind, col = fb; im = Image.new('RGBA', (sz * 2, sz * 2), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    d.ellipse([4, 4, sz * 2 - 4, sz * 2 - 4], fill=col + (255,), outline=WHITE + (255,), width=8)
    d.text((sz, sz + 4), kind, font=font(sz, FH), fill=WHITE + (255,), anchor='mm'); return im.resize((sz, sz), Image.LANCZOS), 'vector'
EMO = {}
for k, ch, fb in (('x', '❌', ('X', RED)), ('ok', '✅', ('✓', GRN)), ('idea', '\U0001f4a1', ('!', YEL)), ('plane', '✈', ('✈', C['navy2'])),
                  ('think', '\U0001f914', ('?', YEL)), ('party', '\U0001f389', ('★', GRN))):
    EMO[k] = emoji_im(ch, fb, V8['icon'][2])
EMO_EV = [('x', wt('v8_w', 2)['s'], 1.5), ('ok', wt('v8_k', 7)['s'], 1.5), ('idea', ATL['v8_y'], 1.6), ('plane', wt('v8_x', 6)['s'] - 0.1, 1.3),
          ('think', ATL['v8_q'], 1.6), ('party', wt('v8_a', 1)['s'], 1.5)]

# ---------------- top pops (screen space, above the head) ----------------
TOPW = SX1 - SX0
def mk_hook():
    l1 = hrow([badge('x', 78), segs_line([('STOP', RED), (' saying', WHITE)], 78, 10)], 18)
    q = [('“The gate ', WHITE), ('is change', RED), ('?”', WHITE)]; sz = fit(q, 78, TOPW, 10)
    return stack([l1, segs_line(q, sz, 10)], 2), 'STOP saying “The gate is change?”', sz
def mk_correct():
    l1 = segs_line([('Has', GRN), (' the gate', WHITE)], 80, 10); l2 = hrow([segs_line([('changed?', GRN)], 80, 10), badge('ok', 72)], 16)
    return stack([l1, l2], 0), 'Has the gate changed? ✓', 80
def mk_rule():
    segs = [('HAS', YEL), (' + it + ', WHITE), ('CHANGED?', GRN)]; sz = fit(segs, 96, TOPW, 11)
    return segs_line(segs, sz, 11), 'HAS + it + CHANGED?', sz
def mk_quiz():
    l1 = segs_line([('Excuse me, ', WHITE), ('___', YEL)], 76, 10); l2 = segs_line([('the gate changed?', WHITE)], 76, 10)
    return stack([l1, l2], 4), 'Excuse me, ___ the gate changed?', 76
ICON = Image.open(o.icon).convert('RGBA')
def mk_end():
    ic = ICON.resize((76, 76), Image.LANCZOS); m = Image.new('L', ic.size, 0); ImageDraw.Draw(m).rounded_rectangle([0, 0, 75, 75], 18, fill=255)
    ic.putalpha(Image.fromarray((np.asarray(ic)[..., 3].astype(np.float32) * np.asarray(m) / 255).astype(np.uint8)))
    l1 = hrow([ic, segs_line([('Lexkite', WHITE)], 60, 9)], 14)
    segs = [('Practise free on ', WHITE), ('lexkite.com', YEL)]; sz = 58
    while sz > 48 and pill_im(segs, sz, C['navy'], (24, 14), FBd).width > TOPW: sz -= 1
    return stack([l1, pill_im(segs, sz, C['navy'], (24, 14), FBd)], 10), 'Practise free on lexkite.com', sz
TOPS = {}
for k, fn in dict(hook=mk_hook, correct=mk_correct, rule=mk_rule, quiz=mk_quiz, end=mk_end).items():
    im, txt, px = fn(); assert im.width <= TOPW and im.height <= V8['top'][1] - V8['top'][0], ('top pop too big', k, im.size)
    TOPS[k] = dict(im=im, text=txt, px=px)
TOP_EV = [('hook', 1.0 / FPS, lend('v8_w') + 0.12, 'spring'),
          ('correct', wt('v8_k', 4)['s'] - 0.06, wt('v8_k', 4)['s'] + 2.1, 'spring'),
          ('rule', ATL['v8_y'] + 0.25, lend('v8_y') + 0.9, 'spring'),
          ('quiz', wt('v8_q', 1)['s'] - 0.06, C0 + COUNT, 'spring'),
          ('correct', wt('v8_a', 4)['s'] - 0.06, max(lend('v8_a') + 0.1, wt('v8_a', 4)['s'] + 1.9), 'spring'),
          ('end', ATL['v8_s'] - 0.05, TOTAL - 0.40, 'spring')]
TOP_EV = [(k, a, min(b, TOP_EV[j + 1][1] - 0.02) if j + 1 < len(TOP_EV) else b, kd) for j, (k, a, b, kd) in enumerate(TOP_EV)]   # one pop at a time
TOP_EV = [(k, a, max(b, min(a + 1.3, TOP_EV[j + 1][1] - 0.02 if j + 1 < len(TOP_EV) else b)), kd) for j, (k, a, b, kd) in enumerate(TOP_EV)]
for e in TOP_EV: assert e[2] - e[1] >= 1.2, ('top pop too short', e)
def pop_anim(T, t0, t1, kind):
    """-> (scale, alpha). spring in (0.26 s: 0.6 -> 1.06 -> 1.0), fade/scale out 0.16 s."""
    if T < t0 or T >= t1: return 0.0, 0.0
    if kind == 'none': si, ai = 1.0, 1.0
    else: u = (T - t0) / 0.26; si = 0.6 + 0.4 * bezier(EASE['spring'], min(1.0, u)); ai = ease(u * 1.6)
    uo = (t1 - T) / 0.16
    if uo < 1: return si * (0.92 + 0.08 * uo), ai * ease(uo, EASE['inout'])
    return si, ai
def paste_scaled(F, im, cx, cy, sc, al):
    if al <= 0.003 or sc <= 0.05: return None
    w, h = max(1, round(im.width * sc)), max(1, round(im.height * sc)); r = im if (w, h) == im.size else im.resize((w, h), Image.BICUBIC)
    x, y = round(cx - w / 2), round(cy - h / 2); rgb, a = rgba_np(r); over(F, rgb, a, x, y, al); return [x, y, x + w, y + h]

# ---------------- CapCut-style captions: 2-3 words per page, script text, active word pops ----------------
PUN = lambda w: w[-1] in '.?!:,;'
def pages_of(lid):
    toks = LINES[lid]['words']; n = len(toks); best = [(0, [])] + [None] * n
    for i in range(1, n + 1):
        for L in (1, 2, 3):
            j = i - L
            if j < 0 or best[j] is None: continue
            seg = [toks[x]['w'] for x in range(j, i)]; c = 0.0
            if L == 1: c += 0.8 if seg[0][-1] in '!?.' else 3.0
            if L == 3: c += 0.3
            c += 0.0 if (i == n or seg[-1][-1] in '.?!:') else (0.4 if seg[-1][-1] in ',;' else 1.2)
            c += sum(2.5 if s[-1] in '.?!:' else 0.9 for s in seg[:-1] if PUN(s))   # never run over a sentence end inside a page
            tot = best[j][0] + c
            if best[i] is None or tot < best[i][0]: best[i] = (tot, best[j][1] + [(j, i)])
    return [[f'{lid}.{k}' for k in range(a, b)] for a, b in best[n][1]]
def disp(w):   # display map (spoken 'blank' -> '___'); punctuation kept
    b = w.rstrip('.,?!:;'); return DISP.get(b.lower(), b) + w[len(b):]
def keycol(lid, k):
    for name, col in (('red', RED), ('green', GRN), ('yellow', YEL)):
        if k in KEY[lid].get(name, []): return col
    return None
ST, SS = V8['cap_stroke'], 2
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
class Page:
    def __init__(s, wids):
        s.wids = wids; s.lid = WORDS[wids[0]]['line']; s.txt = [disp(WORDS[w]['w']) for w in wids]; sz = V8['cap_size']; maxw = SX1 - SX0
        while True:
            fo = font(sz); tw = sum(fo.getlength(x) for x in s.txt) + V8['gapx'] * (len(s.txt) - 1) + fo.getlength(' ') * (len(s.txt) - 1)
            if tw * V8['bounce'] <= maxw - 2 * ST or sz <= V8['cap_min']: break
            sz -= 2
        s.sz = sz; fo = font(sz); x = SCX - tw / 2; s.cx = {}
        for w, tx in zip(wids, s.txt): wl = fo.getlength(tx); s.cx[w] = x + wl / 2; x += wl + fo.getlength(' ') + V8['gapx']
        s.t0 = WORDS[wids[0]]['s'] - 0.06; s.t1 = WORDS[wids[-1]]['e'] + 0.28; s.text = ' '.join(s.txt)
    def draw(s, F, tm, T):
        bb = [1e9, 1e9, -1e9, -1e9]; wipe = {}; a_in = ease((T - s.t0) / 0.10); sc_in = 0.88 + 0.12 * a_in; items = []
        for w, tx in zip(s.wids, s.txt):
            Wd = WORDS[w]; k = Wd['k']; p = max(0.0, min(1.0, (tm - Wd['s']) / max(1e-3, Wd['e'] - Wd['s']))); wipe[w] = round(p, 3)
            act = Wd['s'] <= tm < Wd['e']; kc = keycol(s.lid, k)
            if act:
                u = tm - Wd['s']; sc = 1 + (V8['bounce'] - 1) * ease(u / 0.07) if u < 0.07 else V8['bounce'] - (V8['bounce'] - V8['settle']) * ease((u - 0.07) / 0.12)
                col = kc if kc in (RED, GRN) else YEL
            else:
                u = tm - Wd['e']; sc = V8['settle'] - (V8['settle'] - 1) * ease(u / 0.10) if 0 <= u < 0.10 else 1.0
                col = kc if (kc and tm >= Wd['s']) else WHITE
            items.append((act, w, tx, col, sc * sc_in))
        for act, w, tx, col, sc in sorted(items, key=lambda x: x[0]):
            im, ib = word_im(tx, s.sz, col, sc); cx = SCX + (s.cx[w] - SCX) * sc_in; r = paste_scaled(F, im, cx, V8['cap_cy'], 1.0, a_in)
            if r: bb = [min(bb[0], r[0] + ib[0]), min(bb[1], r[1] + ib[1]), max(bb[2], r[0] + ib[2]), max(bb[3], r[1] + ib[3])]   # ink + stroke
        return wipe, bb
PAGES = [Page(p) for lid in ATL for p in pages_of(lid)]
for a, b in zip(PAGES, PAGES[1:]):   # the next page is on screen before its first word starts; the old one leaves exactly then
    a.t1 = min(a.t1, b.t0)
CAP_LOG = {f'p{j}': dict(line=p.lid, words=p.wids, text=p.text, n=len(p.wids), size=p.sz, stroke=ST, ss=SS) for j, p in enumerate(PAGES)}
print('pages', ' | '.join(p.text for p in PAGES), flush=True)

# ---------------- quiz pills + countdown (pills row over the desk, no panel) ----------------
PILL = {k: pill_im([(l, YEL if bg != GRN else INK), ('  ' + w_, WHITE if bg != GRN else INK)], 64, bg) for k, (l, w_, bg) in
        dict(a=('A', 'has', C['navy']), b=('B', 'is', C['navy']), a_ok=('A', 'has  ✓', GRN)).items()}
def ring(num, rem, d_=118):
    im = Image.new('RGBA', (d_ * 2, d_ * 2), (0, 0, 0, 0)); g = ImageDraw.Draw(im)
    g.ellipse([8, 8, 2 * d_ - 8, 2 * d_ - 8], fill=C['navy'] + (240,), outline=MINT + (90,), width=14)
    if rem > 0: g.arc([8, 8, 2 * d_ - 8, 2 * d_ - 8], -90, -90 + 360 * rem, fill=YEL + (255,), width=14)
    g.text((d_, d_ + 4), num, font=font(d_ * 1.1), fill=WHITE + (255,), anchor='mm'); return shadowed(im.reduce(2), 4, 5, 0.4)
R0 = ATL['v8_a']
_bd = np.asarray(PILL['b']).copy(); _bd[..., 3] = (_bd[..., 3] * 0.45).astype(np.uint8); PILL['b_dim'] = Image.fromarray(_bd)

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
cap = cv2.VideoCapture(f'{o.lib}/tools/dl24/{o.clip}.mp4'); FR = []
while True:
    ok, fr_ = cap.read()
    if not ok: break
    FR.append(fr_)
assert FR and FR[0].shape[:2] == (H, W), 'bank clip must be native 1080x1920'
MO = {w_: LS.Mouth(f'{o.lib}/tools/meta/{o.clip}/{w_}') for w_ in BANK[o.clip].get('mouth_sets', {})}
SPK = [dict(cues=LINES[l]['cues'], at=at) for l, at in ATL.items()]
FACE = (330, 440, 710, 840)
FRAMES = []; SHARP = []; NATIVE = []
for fi in range(NF):
    T = fi / FPS; tm = T + 0.5 / FPS; src = src_of(fi)
    if PREV is not None and fi not in PREV: continue
    F = FR[min(src, len(FR) - 1)].copy(); vis = {}
    for w_, mo in MO.items(): v = LS.viseme_at(SPK if w_ == 'ama' else [], T); F = mo.apply(F, src, mo.spr[v]); vis[w_] = v
    s = cam(T); mx, my = maps_c(s)
    out = cv2.remap(F, mx, my, cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_REPLICATE) if s > 1.0001 else F.copy(); out = sharpen(out, s)
    els = []
    # top pops
    for k, t0, t1, kind in TOP_EV:
        sc, al = pop_anim(T, t0, t1, kind)
        if al <= 0.003: continue
        P = TOPS[k]; im = P['im']; cy = (V8['top'][0] + V8['top'][1]) / 2; sc = min(sc, (TOPW - 2) / im.width, (V8['top'][1] - V8['top'][0]) / im.height)   # overshoot never leaves the safe band
        r = paste_scaled(out, im, SCX, cy, sc, al)
        if r: els.append(dict(name=f'top.{k}', text=P['text'], bbox=r, px=round(P['px'] * sc, 1), alpha=round(al, 3), group='pop'))
    # emoji pops beside the head
    for k, t0, du in EMO_EV:
        sc, al = pop_anim(T, t0, t0 + du, 'spring')
        if al <= 0.003: continue
        x, y, d_ = V8['icon']; r = paste_scaled(out, EMO[k][0], x + d_ / 2, y + d_ / 2, sc, al)
        if r: els.append(dict(name=f'emoji.{k}', text='', bbox=r, px=0, alpha=round(al, 3), group='icon'))
    # quiz pills + 3-2-1
    if C0 - 0.05 <= T < R0 + 1.2:
        a = ease((T - C0 + 0.05) / 0.22) * (1 - ease((T - (R0 + 0.95)) / 0.25, EASE['inout']) if T > R0 + 0.95 else 1.0)
        rev = T >= wt('v8_a', 1)['s'] - 0.04; ka = PILL['a_ok'] if rev else PILL['a']; kb = PILL['b_dim'] if rev else PILL['b']
        if C0 <= T < C0 + COUNT: rg = ring(str(3 - min(2, int(T - C0))), 1 - (T - C0) / COUNT); mid = [rg]
        else: mid = []
        row = hrow([ka] + mid + [kb], 28); y = V8['pills_y']; x = round(SCX - row.width / 2); rgb, al_ = rgba_np(row)
        over(out, rgb, al_, x, y, a)
        xa = x; xb = x + row.width - kb.width
        els += [dict(name='pill.a', text='A has', bbox=[xa, y + (row.height - ka.height) // 2, xa + ka.width, y + (row.height + ka.height) // 2], px=64, alpha=round(a, 3), group='pill'),
                dict(name='pill.b', text='B is', bbox=[xb, y + (row.height - kb.height) // 2, xb + kb.width, y + (row.height + kb.height) // 2], px=64, alpha=round(a * (0.5 if rev else 1), 3), group='pill')]
        if mid: els.append(dict(name=f'count.{3 - min(2, int(T - C0))}', text=str(3 - min(2, int(T - C0))), bbox=[x + ka.width + 28, y, x + ka.width + 28 + mid[0].width, y + mid[0].height], px=118, alpha=round(a, 3), group='pill'))
    # captions
    wipe = {}
    for pi, p in enumerate(PAGES):
        if pi + 1 < len(PAGES) and PAGES[pi + 1].t0 <= T and p.t0 <= T and T < PAGES[pi + 1].t0 + 0.25:   # karaoke state of the page that just left (its last word ends as the next starts)
            wipe.update({w: round(max(0.0, min(1.0, (tm - WORDS[w]['s']) / max(1e-3, WORDS[w]['e'] - WORDS[w]['s']))), 3) for w in p.wids})
        if p.t0 <= T < p.t1:
            wp, bb = p.draw(out, tm, T); wipe.update(wp)
            if bb[0] < 1e8: els.append(dict(name=f'cap.p{pi}', text=p.text, bbox=[round(v) for v in bb], px=p.sz, alpha=1.0, group='caption'))
    if PREV is not None: cv2.imwrite(f'{o.out}.preview/t{T:05.2f}.png', out); continue
    enc.stdin.write(out.tobytes())
    win = [AX - AX / s, AY - AY / s, AX + (W - AX) / s, AY + (H - AY) / s]
    FRAMES.append(dict(t=round(T, 4), src=src, s=round(s, 5), M=[s, 0, (1 - s) * AX, 0, s, (1 - s) * AY], win=[round(v, 2) for v in win], vis=vis, wipe=wipe,
                       els=[[e['name'], e['text'], *[round(v) for v in e['bbox']], e['alpha'], e['px'], e['group']] for e in els]))
    if fi in (0, NF - 1): cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
    if fi % 24 == 12:
        nat = cv2.cvtColor(F[FACE[1]:FACE[3], FACE[0]:FACE[2]], cv2.COLOR_BGR2GRAY); r = [round(v) for v in to_screen(FACE, s)]
        scr = cv2.cvtColor(out[r[1]:r[3], r[0]:r[2]], cv2.COLOR_BGR2GRAY)
        SHARP.append(dict(frame=fi, s=round(s, 4), rect=r, var_native=round(float(cv2.Laplacian(nat, cv2.CV_64F).var()), 2), var_render=round(float(cv2.Laplacian(scr, cv2.CV_64F).var()), 2)))
        cv2.imwrite(f'{o.out}.samples/f{fi:04d}.png', out)
    if fi % 48 == 0: print(f'frame {fi}/{NF} s={s:.3f}', flush=True)
enc.stdin.close(); assert enc.wait() == 0, 'ffmpeg encode failed'
if PREV is not None: print('preview written', o.out + '.preview'); sys.exit(0)
cv2.imwrite(o.out + '.src0.png', FR[0])

# ---------------- audio: voices + studio bed (-40 dB) + countdown ticks + answer ding + soft pops ----------------
SR = 24000; mix = np.zeros(int(TOTAL * SR) + SR, np.float32)
def put(a, t0, g=1.0):
    i = int(round(t0 * SR)); n = min(len(a), len(mix) - i)
    if n > 0: mix[i:i + n] += a[:n] * g
for lid, at in ATL.items(): put(LINES[lid]['a'], at)
amb = f'{o.lib}/tools/amb_studio.wav'
if os.path.exists(amb):
    b = pcm(amb); b = np.tile(b, int(len(mix) / len(b)) + 1)[:len(mix)]; rms = float(np.sqrt(np.mean(b ** 2))) or 1; mix += b * (10 ** (-40 / 20) / rms)
nt = np.arange(int(0.05 * SR)); tick = (np.sin(2 * np.pi * 1320 * nt / SR) * np.exp(-nt / (0.012 * SR))).astype(np.float32)
for k in range(3): put(tick, C0 + k, 0.18)
np_ = np.arange(int(0.06 * SR)); pop = (np.sin(2 * np.pi * (520 + 900 * np_ / len(np_)) * np_ / SR) * np.exp(-np_ / (0.015 * SR))).astype(np.float32)
for k, t0, t1, kind in TOP_EV[1:]: put(pop, t0, 0.10)
ding = f'{o.lib}/tools/foley/ding.wav'
if os.path.exists(ding): put(pcm(ding), wt('v8_a', 1)['s'] - 0.04, 0.25)
put((np.sin(2 * np.pi * 1000 * np.arange(int(0.1 * SR)) / SR) * 10 ** (-60 / 20)).astype(np.float32), 0.0)
mix = mix[:int(round(TOTAL * SR))]
with wave.open(o.out + '.mix.wav', 'wb') as wv:
    wv.setnchannels(1); wv.setsampwidth(2); wv.setframerate(SR); wv.writeframes((np.clip(mix, -1, 1) * 32767).astype(np.int16).tobytes())
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.out + '.video.mp4', '-i', o.out + '.mix.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'copy',
                '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0,aresample=48000', '-ac', '2', '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart', o.out], check=True)
os.remove(o.out + '.video.mp4')
json.dump(dict(style='v8', fps=FPS, size=[W, H], total=TOTAL, n=NF, safe=SAFE, v8=V8, clip=o.clip, src_size=[W, H], pingpong=PHI, count=[C0, COUNT],
               lesson=dict(id=LZ['id'], wrong=LZ['wrong_line'], right=LZ['key_line'], reject=LZ.get('reject')), verdict=HV,
               hook_full=TOPS['hook']['text'], hook_quote='“' + HV['wrong'] + '”', correct_pop=TOPS['correct']['text'],
               cta=dict(link=(LZ.get('cta') or {}).get('link'), text=TOPS['end']['text']), emoji='noto' if all(v[1] == 'noto' for v in EMO.values()) else 'vector',
               zones=LJ['zones'], script={k: TXT[k] for k in ATL}, display=DISP,
               lines={lid: dict(at=round(at, 3), dur=round(LINES[lid]['dur'], 3), gen=LINES[lid]['gen'], cues=len(LINES[lid]['cues']), whisper=LINES[lid]['whisper']) for lid, at in ATL.items()},
               words=WORDS, captions=CAP_LOG, sharp=SHARP, top_events=[[k, round(a, 3), round(b, 3)] for k, a, b, _ in TOP_EV], frames=FRAMES), open(o.out + '.timeline.json', 'w'))
print(f'done {o.out}: {TOTAL:.2f} s, {NF} frames')
