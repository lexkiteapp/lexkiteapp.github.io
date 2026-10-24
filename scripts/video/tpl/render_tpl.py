#!/usr/bin/env python3
"""Clean pilot templates (docs/VIDEO-TEMPLATES.md) for a news 'fix' lesson.
  python3 scripts/video/tpl/render_tpl.py --tpl 1|2 --lesson content/video/cine/news/<id>.json --vo <dir with <line>.wav/.json/.words.json> --out out.mp4
Template 1 "Teacher card": ONE host (Ama) at one fixed transform for the whole video on a designed studio gradient + motion-graphics layer.
Template 1b "Teacher on location" (--plate <name>): same host lock + layers on a topic plate (anchor/bg/<name>.png): depth blur, grade, cream scrim, very slow push-in;
  host colour-matched to the plate + soft contact shadow; loop-friendly end (text clears back to the frame-0 look) + CTA deep link (lesson.cta).
Template 2 "Motion explainer": no host; big type + Noto emoji icons (--icons dir of emoji_u<hex>.png).
Everything moves with tokens.py (3 durations, one quint easing family, 12-col grid, one type scale, kit.js colours).
Writes <out>, <out>.timeline.json (per-frame element log for qc_tpl.py) and <out>.sheet.jpg (beat contact sheet).
--fake-vo: evenly spaced fake word times + silent audio (local layout check, no TTS). --stills t1,t2: write PNG frames only."""
import os, sys, json, re, math, argparse, subprocess, hashlib
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.dirname(os.path.dirname(os.path.dirname(HERE))); sys.path.insert(0, HERE)
from tokens import *
import hostframe as HF

ap = argparse.ArgumentParser()
ap.add_argument('--tpl', type=int, required=True); ap.add_argument('--lesson', required=True); ap.add_argument('--lines', default=None)
ap.add_argument('--vo', default=None); ap.add_argument('--out', required=True); ap.add_argument('--fonts', default=f'{ROOT}/brand/social/src/fonts')
ap.add_argument('--icons', default=None); ap.add_argument('--lib', default=None, help='footage anchor dir (green/, tools/meta/)'); ap.add_argument('--clip', default=None)
ap.add_argument('--plate', default=None, help='tpl 1b: plate name (tokens.PLATES); default lesson.plate'); ap.add_argument('--host-name', default=None)
ap.add_argument('--crf', type=int, default=None, help='quality mode: CRF (e.g. 18) with a 5.5 Mbps floor (re-encodes CBR at the floor if CRF lands below it)');
ap.add_argument('--skip', default='c'); ap.add_argument('--fake-vo', action='store_true'); ap.add_argument('--stills', default=None); ap.add_argument('--host-still', default=None, help='local: RGBA png used as a static host (layout check only)')
o = ap.parse_args()
SP = json.load(open(o.lesson)); LID = SP['id']; H6 = SP['hook']['line'][2:8]
LJ = json.load(open(o.lines or os.path.join(os.path.dirname(o.lesson), 'lines.json'))); TEXT = {l['id']: l['text'] for l in LJ['lines']}
T1 = o.tpl == 1
PLATE_N = (o.plate or SP.get('plate')) if T1 else None; HOSTN = o.host_name or SP.get('host') or 'ama'; CLIP = o.clip or SP.get('clip') or 'ga4_talk_natural'
CTA = SP.get('cta') or None
def F(kind, size): return ImageFont.truetype(f"{o.fonts}/{FONTS[kind]}", size)
def nrm(w): return re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'")).strip("'")

# ------------------------------------------------------------------ voice: wav + word times per line
def wav_dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]))
class Line:
    def __init__(s, lid):
        s.id, s.text = lid, TEXT[lid]; toks = s.text.split()
        if o.fake_vo:
            s.words = [dict(w=w, s=0.15 + 0.34 * i, e=0.15 + 0.34 * i + 0.3) for i, w in enumerate(toks)]; s.dur = s.words[-1]['e'] + 0.2; s.wav = None; s.cues = None; s.lipsrc = None
        else:
            s.wav = f'{o.vo}/{lid}.wav'; s.dur = wav_dur(s.wav); s.words = json.load(open(f'{o.vo}/{lid}.words.json'))['words']
            cj = json.load(open(f'{o.vo}/{lid}.json')) if os.path.exists(f'{o.vo}/{lid}.json') else {}
            s.cues = cj.get('mouthCues'); s.lipsrc = cj.get('generator') or ('rhubarb' if (cj.get('metadata') or {}).get('soundFile') else None)
        s.end = s.words[-1]['e']; s.at = 0.0
    def t(s, word, nth=0, after=None):
        """absolute time of the nth token matching `word` (first token of a multi-word phrase); after = absolute time lower bound"""
        key = [nrm(x) for x in word.split()]; hits = []
        for i in range(len(s.words) - len(key) + 1):
            if [nrm(s.words[i + k]['w']) for k in range(len(key))] == key and (after is None or s.at + s.words[i]['s'] >= after - 1e-6): hits.append(s.at + s.words[i]['s'])
        if not hits: raise SystemExit(f'word "{word}" not in line {s.id}: {s.text}')
        return hits[min(nth, len(hits) - 1)]
    def last(s): return s.at + s.words[-1]['s']

SEQ = [k for k in ['h', 'm', 'g', 'k', 'y', 'c', 'rn', 'r2', 'e', 's'] if k not in o.skip.split(',')]   # 25-35 s budget: the quick-check beat repeats the wrong line -> skipped by default
L = {k: Line(f'n_{H6}_{k}') for k in SEQ}
EXTRA = dict(g=1.1, r2=1.4, s=1.2 if SP.get('cta') else 0.4)           # extra silent hold after a line (guess pause, read the tip rows, end card)
GAP, LEAD_IN = 0.38, 0.25
t = LEAD_IN; BEAT = {}
for i, k in enumerate(SEQ):
    ln = L[k]; ln.at = t; vis_in = max(0.0, t - 0.1)
    hold_end = max(t + ln.end + GAP + EXTRA.get(k, 0), ln.last() + DUR['fast'] + MIN_READ + DUR['fast'] + 0.05)   # last word fully readable >= MIN_READ before the exit
    BEAT[k] = dict(vin=round(vis_in, 3), vout=round(hold_end - DUR['fast'], 3), end=round(hold_end, 3))
    t = hold_end + 0.1
TOTAL = round(BEAT['s']['end'] + (0.5 if SP.get('cta') else 0.1), 2); NF = int(round(TOTAL * FPS))
for a, b in zip(SEQ, SEQ[1:]): BEAT[a]['next'] = BEAT[b]['vin']

# ------------------------------------------------------------------ sprites
def text_img(txt, size, kind='head', color=C['ink']):
    if txt and set(txt) == {'_'}:
        f = F(kind, size); w = int(f.getlength(txt)); h = int(round(size * LEAD)); im = Image.new('RGBA', (w + 4, h), (0, 0, 0, 0))
        ImageDraw.Draw(im).rounded_rectangle((2, int(h * 0.78) - 5, w + 2, int(h * 0.78) + 5), 5, fill=C['red'] + (255,)); return im
    f = F(kind, size); asc, desc = f.getmetrics(); w = int(math.ceil(f.getlength(txt))) + 4; h = int(round(size * LEAD))
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); ImageDraw.Draw(im).text((2, (h - (asc + desc)) // 2), txt, font=f, fill=color + (255,)); return im
def rrect(w, h, r, fill, shadow=True, outline=None):
    pad = 40 if shadow else 0; im = Image.new('RGBA', (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    if shadow:
        sh = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh).rounded_rectangle((pad, pad + 14, pad + w, pad + h + 14), r, fill=(9, 40, 41, 52))
        im = Image.alpha_composite(im, sh.filter(ImageFilter.GaussianBlur(18)))
    ImageDraw.Draw(im).rounded_rectangle((pad, pad, pad + w - 1, pad + h - 1), r, fill=fill + (255,) if len(fill) == 3 else fill, outline=outline, width=4 if outline else 0)
    return im, pad
def badge(kind, d, bg=None):
    ss = 4; D = d * ss; im = Image.new('RGBA', (D, D), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    col_ = dict(x=C['red'], v=C['green'], q=C['yellow'], n=C['navy'])[kind[0]] if bg is None else bg; dr.ellipse((0, 0, D - 1, D - 1), fill=col_ + (255,)); lw = int(D * 0.11)
    if kind == 'x': a, b = D * 0.31, D * 0.69; dr.line((a, a, b, b), fill=(255, 255, 255, 255), width=lw); dr.line((a, b, b, a), fill=(255, 255, 255, 255), width=lw)
    elif kind == 'v': dr.line((D * 0.27, D * 0.53, D * 0.44, D * 0.69, D * 0.74, D * 0.35), fill=(255, 255, 255, 255), width=lw, joint='curve')
    elif kind == 'q': f = F('display', int(D * 0.7)); dr.text((D / 2, D / 2 + D * 0.02), '?', font=f, fill=C['navy'] + (255,), anchor='mm')
    else: f = F('head', int(D * 0.52)); dr.text((D / 2, D / 2 + D * 0.02), kind[1:], font=f, fill=(C['navy'] if bg == C['yellow'] else (255, 255, 255)) + (255,), anchor='mm')
    return im.resize((d, d), Image.LANCZOS)
def chip(txt, bg, fg, size=TYPE['label']):
    f = F('head', size); w = int(f.getlength(txt)) + 2 * 28; h = int(size * 1.5)
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); dr.rounded_rectangle((0, 0, w - 1, h - 1), h // 2, fill=bg + (255,))
    dr.text((w / 2, h / 2 + 2), txt, font=f, fill=fg + (255,), anchor='mm'); return im
def bar(w, h, color, alpha=255): im = Image.new('RGBA', (max(w, 1), h), (0, 0, 0, 0)); ImageDraw.Draw(im).rounded_rectangle((0, 0, max(w, 1) - 1, h - 1), h // 2, fill=color + (alpha,)); return im
ICON_CACHE = {}
def icon(cp, d):
    if not o.icons: return None
    p = f'{o.icons}/emoji_u{cp}.png'
    if not os.path.exists(p): print('WARN icon missing', cp); return None
    return Image.open(p).convert('RGBA').resize((d, d), Image.LANCZOS)

# ------------------------------------------------------------------ element engine
ELS = []
class El:
    def __init__(s, id, img, x, y, grp, t_in, t_out=None, enter='rise', d_in='base', exit='fade', d_out='fast', parent=None, z=5, text=None, fs=None, dim=None, inset=0):
        s.__dict__.update(inset=inset, id=id, img=img, x=int(x), y=int(y), grp=grp, t_in=round(t_in, 3), t_out=None if t_out is None else round(t_out, 3), enter=enter, d_in=d_in,
                          exit=exit, d_out=d_out, parent=parent, z=z, text=text, fs=fs, dim=dim)
        ELS.append(s)
    def state(s, t):
        """alpha, dx, dy, scale, wipe fraction, moving-group tag (None = static). Tag = the beat that owns the running tween:
        enter -> own group, dim -> the beat that dims it, exit -> 'out@<t>' (all exits of one beat end share one tag)"""
        if t < s.t_in: return 0, 0, 0, 1, 0, None
        p = min(1.0, (t - s.t_in) / DUR[s.d_in]); e = bezier(EASE['out'], p); a, dx, dy, sc, wp = 1.0, 0.0, 0.0, 1.0, 1.0; mv = s.grp if p < 1 and s.enter != 'none' else None
        if s.enter == 'rise': dy = TRAVEL['rise'] * (1 - e); a = e
        elif s.enter == 'slide': dx = TRAVEL['slide'] * (1 - e); a = e
        elif s.enter == 'fade': a = e
        elif s.enter == 'pop': sc = 0.8 + 0.2 * e; a = e
        elif s.enter == 'wipe': wp = e
        if s.dim and t >= s.dim[0]:
            q = min(1.0, (t - s.dim[0]) / DUR['base']); a *= 1 - (1 - s.dim[1]) * bezier(EASE['inout'], q); mv = s.dim[2] if q < 1 else mv
        if s.t_out is not None and t >= s.t_out:
            q = (t - s.t_out) / DUR[s.d_out]
            if q >= 1: return 0, 0, 0, 1, 0, None
            a *= 1 - bezier(EASE['inn'], q); mv = f'out@{s.t_out:.2f}'
        if s.parent:
            pa, pdx, pdy, _, _, pmv = s.parent.state(t); a *= pa; dx += pdx; dy += pdy; mv = pmv or mv
        return a, dx, dy, sc, wp, mv
    def tweens(s):
        tw = [dict(kind=s.enter, dur=s.d_in, ease='out')] if s.enter != 'none' else []
        if s.t_out is not None: tw.append(dict(kind=s.exit, dur=s.d_out, ease='inn'))
        if s.dim: tw.append(dict(kind='dim', dur='base', ease='inout'))
        return tw

def wrap(toks, f, maxw):
    """greedy wrap, then balanced: the narrowest width that keeps the same line count (no orphans like 'car.')"""
    sp = f.getlength(' ')
    def greedy(w):
        out, cur, wc = [], [], 0
        for w_ in toks:
            lw = f.getlength(w_)
            if cur and wc + sp + lw > w: out.append(cur); cur, wc = [], 0
            cur.append(w_); wc += (sp if len(cur) > 1 else 0) + lw
        return out + [cur]
    g0 = greedy(maxw)
    if len(g0) == 1: return g0
    lo, hi = max(f.getlength(w_) for w_ in toks), maxw
    for _ in range(14):
        mid = (lo + hi) / 2
        if len(greedy(mid)) <= len(g0): hi = mid
        else: lo = mid
    return greedy(hi)
def words_block(id, txt, size, kind, x, y, maxw, grp, line, t_out, color=C['ink'], hi=(), hi_col=C['red'], parent=None, reveal='rise', align='left', karaoke=False, after=None, z=6):
    """kinetic sentence: one element per word, each appears at its spoken time (fallback: the previous word's time). hi = words drawn in hi_col.
    Returns (bottom y, {word index: (x, y, w, h)}) - positions in absolute px."""
    f = F(kind, size); sp = f.getlength(' '); toks = txt.split(); lines_ = wrap(toks, f, maxw)
    lh = int(round(size * LEAD)); boxes = {}; k = 0; tprev = (after if after is not None else (line.at if line else 0))
    hiN = {nrm(h) for h in hi}
    for r, ws in enumerate(lines_):
        W_ = sum(f.getlength(w_) for w_ in ws) + sp * (len(ws) - 1); xx = x + ((maxw - W_) / 2 if align == 'center' else 0)
        for w_ in ws:
            col_ = hi_col if nrm(w_) in hiN else color
            tw = tprev
            if line is not None:
                try: tw = line.t('blank' if set(w_) == {'_'} else w_.strip('“”"\''), after=tprev - 0.01)
                except SystemExit: tw = tprev
            tprev = tw; im = text_img(w_, size, kind, col_)
            if karaoke:
                El(f'{id}.w{k}.dim', text_img(w_, size, kind, C['navy2'] if T1 else (120, 170, 168)), xx - 2, y + r * lh, grp, after, t_out, enter='fade', d_in='base', parent=parent, z=z, text=w_, fs=size)
                El(f'{id}.w{k}', im, xx - 2, y + r * lh, grp, tw - 0.05, t_out, enter='fade', d_in='fast', parent=parent, z=z + 1, text=w_, fs=size)
            else:
                El(f'{id}.w{k}', im, xx - 2, y + r * lh, grp, tw - 0.05, t_out, enter=reveal, d_in='fast', parent=parent, z=z, text=w_, fs=size)
            boxes[k] = (xx, y + r * lh, f.getlength(w_), lh, tw); xx += f.getlength(w_) + sp; k += 1
    return y + len(lines_) * lh, boxes
def measure(txt, size, kind, maxw): return len(wrap(txt.split(), F(kind, size), maxw)) * int(round(size * LEAD))

# ------------------------------------------------------------------ lesson content (generic 'fix' schema)
wrong, right = SP['wrong_line'].rstrip('.'), SP['key_line'].rstrip('.')
endp = lambda t: t if t[-1:] in '?!' else t + '.'   # 'changed?' stays one mark (no 'changed?.')
wt, rt = wrong.split(), right.split()
import difflib
sm = difflib.SequenceMatcher(None, [nrm(x) for x in wt], [nrm(x) for x in rt])
BAD = [wt[i] for a, b, c, d in [(op[1], op[2], op[3], op[4]) for op in sm.get_opcodes() if op[0] != 'equal'] for i in range(a, b)]
GOOD = [rt[i] for a, b, c, d in [(op[1], op[2], op[3], op[4]) for op in sm.get_opcodes() if op[0] != 'equal'] for i in range(c, d)]
if not GOOD: GOOD = [rt[i] for op in sm.get_opcodes() if op[0] == 'delete' for i in range(max(0, op[3] - 1), min(len(rt), op[3] + 1))]
KB = next(b for b in SP['beats'] if b['kind'] == 'k'); FORM = KB['card'].get('formula') or SP['series'][1]
WHY = next(b for b in SP['beats'] if b['kind'] == 'y')['card']['text']
if 'quiz' in SP: Q_PRE, Q_POST, QA, QB = SP['quiz']['pre'], SP['quiz']['post'], SP['quiz']['a'], SP['quiz']['b']
else: qm = re.match(r"Quiz: (.+?) blank (.+?)\. (\w+) or (.+?)\? (.+)", L['e'].text); Q_PRE, Q_POST, QA, QB, Q_CTA = qm.groups()
ROWS = SP['recap']['rows'][:3]
ICONS = dict(h='1f6d1', m='1f697', g='1f914', y='1f4a1', c='1f50e', rn='1f50a', r2='1f4cc', e='1f4f1', s='1f4e8')

INK = C['navy'] if T1 else C['cream']; SUB = C['navy2'] if T1 else (168, 214, 206)
STAGE = (392, 1032) if T1 else (392, 1480)
X0, FULL = col(0), span(0, 11)
ICON_D = 240

def stage_y(h): c = (STAGE[0] + STAGE[1]) / 2; return snap(max(STAGE[0], c - h / 2))
def place_icon(k, y, t_in, t_out, grp):
    if T1: return y
    im = icon(ICONS[k], ICON_D)
    if im is None: return y
    El(f'{k}.icon', im, X0 + (FULL - ICON_D) // 2, y, grp, t_in, t_out, enter='pop', d_in='base', z=4); return y + ICON_D + 40
ih = (ICON_D + 40) if not T1 else 0

# persistent chrome: progress track + fill, series chip
B0 = BEAT['h']['vin']
El('progress.track', bar(FULL, 10, INK, 40), X0, 240, 'h', B0, None, enter='fade', d_in='base', z=1)
PROG = Image.new('RGBA', (FULL, 10)); ImageDraw.Draw(PROG).rounded_rectangle((0, 0, FULL - 1, 9), 5, fill=C['red'] + (255,))
SER_T = f"{SP['series'][0]}  ·  {FORM}"
if F('head', TYPE['label']).getlength(SER_T) + 56 > FULL: SER_T = SP['series'][0]   # long formula -> chip keeps only the series (formula card still shows it)
SER = chip(SER_T, C['navy'] if T1 else C['cream'], C['cream'] if T1 else C['navy'])
El('series', SER, X0, 280, 'h', B0, None, enter='fade', d_in='base', z=2, text=SER_T.replace('  ', ' '), fs=TYPE['label'])

# hook ------------------------------------------------------------
b = BEAT['h']; ln = L['h']; g = 'h'
i0 = [nrm(x) for x in wt].index(nrm(BAD[0])) if BAD else 0
SOFT = SP['hook'].get('mode') == 'soft'   # hook truth (§9): the learner line is acceptable -> no ✗, quote = the natural phrase
from hookquote import hook_quote, underline as hq_under
# quote = the REAL wrong phrase (strong: 'The gate is change?', never the correct fragment 'gate is') / the natural phrase (soft); reviewed quote wins
HQ = SP['hook'].get('quote') or hook_quote(SP['wrong_line'], SP['key_line'], 'soft' if SOFT else 'strong')
HT = SP['hook'].get('display') or ' '.join(L['h'].text.split()[:-1]) or 'Stop saying'   # display text (lesson) or hook line minus its last word ('this.')
if not HT.endswith(':'): HT += ':'   # 'Never say: “The gate is change?”' / 'Americans usually say: “split the bill”' = one sentence
HOOK_FULL = f'{HT} “{HQ}”'           # qc_tpl hook_readable: this whole string is on screen, fully opaque, by 1.5 s
hs1, hs2 = TYPE['display'], TYPE['h1']
def hook_h(a, b_): return ih + measure(HT, a, 'display', FULL) + 16 + measure(f'“{HQ}”', b_, 'display', FULL)
for a_, b2_ in ((TYPE['display'], TYPE['h1']), (TYPE['h1'], TYPE['h1']), (TYPE['h1'], TYPE['h2']), (TYPE['h2'], TYPE['h2'])):   # long quote -> smaller type, never fewer words
    hs1, hs2 = a_, b2_
    if hook_h(hs1, hs2) <= STAGE[1] - STAGE[0]: break
h_total = hook_h(hs1, hs2)
y = stage_y(h_total); y = place_icon('h', y, b['vin'], b['vout'], g)
# the whole hook enters as ONE block at the beat start (not word-by-word with the voice): readable long before 1.5 s
y2, bx = words_block('h.t1', HT, hs1, 'display', X0, y, FULL, g, None, b['vout'], color=INK, align='center', after=b['vin'])
tq = ln.words[-1]['s'] + ln.at
y3, bx2 = words_block('h.t2', f'“{HQ}”', hs2, 'display', X0, y2 + 16, FULL, g, None, b['vout'], color=C['green'] if SOFT else C['red'], align='center', after=b['vin'])
if not SOFT:   # underline the error words inside the quote ('is change'), one bar per text row, when the voice says 'this'
    ui = hq_under(HQ, SP['wrong_line'], SP['key_line'], 'strong'); rows_ = {}
    for k_ in ui:
        if k_ in bx2: rows_.setdefault(round(bx2[k_][1]), []).append(bx2[k_])
    for r_, bs in enumerate(rows_.values()):
        u0 = min(bs, key=lambda v: v[0]); u1 = max(bs, key=lambda v: v[0] + v[2])
        El(f'h.under{r_}', bar(int(u1[0] + u1[2] - u0[0]), 10, C['red']), u0[0], u0[1] + u0[3] - 12, g, tq + DUR['fast'], b['vout'], enter='wipe', d_in='base', z=8)

# wrong / guess / right: one comparison zone (x card fixed, the slot under it is the guess row, then the v card) ------------
CARD_PAD, BD = 32, 72
inner = FULL - 2 * CARD_PAD - BD - 24
sz = TYPE['h2']
hx = measure(endp(wrong), sz, 'head', inner) + 2 * CARD_PAD; hv = measure(endp(right), sz, 'head', inner) + 2 * CARD_PAD
lab_h = int(TYPE['body'] * LEAD) + 16
zone_h = ih + lab_h + hx + 32 + max(hv, 200)
zy = stage_y(zone_h); bm, bg_, bk = BEAT['m'], BEAT['g'], BEAT['k']
zy = place_icon('m', zy, bm['vin'], bk['vout'], 'm')
ln = L['m']
words_block('m.lab', 'Many learners say:', TYPE['body'], 'body', X0, zy, FULL, 'm', ln, bg_['vout'], color=SUB)
cy = zy + lab_h; tx = ln.t(wt[0])
card, pad = rrect(FULL, hx, 32, C['white'])
xc = El('m.card', card, X0 - pad, cy - pad, 'm', tx - 0.15, bk['vout'], enter='slide', d_in='base', z=3, dim=(bk['vin'], 0.5 if T1 else 0.6, 'k'))
El('m.badge', badge('nOK', BD, C['navy2']) if SOFT else badge('x', BD), X0 + CARD_PAD, cy + CARD_PAD, 'm', tx - 0.15, None, enter='none', parent=xc, z=7)
_, wb = words_block('m.s', endp(wrong), sz, 'head', X0 + CARD_PAD + BD + 24, cy + CARD_PAD - 4, inner, 'm', ln, None, hi=BAD, hi_col=C['navy2'] if SOFT else C['red'], parent=xc, reveal='fade', after=tx)
bi = [k for k, v in wb.items() if nrm(wt[k]) in {nrm(x) for x in BAD}] if len(wb) == len(wt) else []
if bi:
    u0, u1 = wb[bi[0]], wb[bi[-1]]
    if abs(u0[1] - u1[1]) < 1:
        El('m.under', bar(int(u1[0] + u1[2] - u0[0]), 10, C['navy2'] if SOFT else C['red']), u0[0], u0[1] + u0[3] - 10, 'm', u1[4] + DUR['fast'], None, enter='wipe', d_in='base', parent=xc, z=8)
slot = cy + hx + 32
# guess row
ln = L['g']; tg = ln.t('What')
gq = El('g.q', badge('q', BD) if T1 or not o.icons else icon(ICONS['g'], BD), X0, slot + 8, 'g', tg - 0.1, bg_['vout'], enter='pop', d_in='base', z=6)
gy1, gb = words_block('g.t', 'What sounds better?' if SOFT else 'What sounds right?', sz, 'head', X0 + BD + 24, slot, FULL - BD - 24, 'g', ln, bg_['vout'], color=INK)
tdots = ln.at + ln.end + 0.15
for i in range(3):
    El(f'g.dot{i}', bar(28, 28, C['yellow'] if not T1 else C['navy2']), X0 + BD + 24 + i * 52, max(slot + int(sz * LEAD) + 24, snap(gy1 + 16)), 'g', tdots + i * 0.4, bg_['vout'], enter='fade', d_in='fast', z=6)
TICKS = [tdots + i * 0.4 for i in range(3)]
# right card
ln = L['k']; tr = ln.t(rt[0])
card, pad = rrect(FULL, hv, 32, C['white'], outline=C['green'])
vc = El('k.card', card, X0 - pad, slot - pad, 'k', tr - 0.15, bk['vout'], enter='slide', d_in='base', z=3)
El('k.badge', badge('v', BD), X0 + CARD_PAD, slot + CARD_PAD, 'k', tr - 0.15, None, enter='none', parent=vc, z=7)
_, vb = words_block('k.s', endp(right), sz, 'head', X0 + CARD_PAD + BD + 24, slot + CARD_PAD - 4, inner, 'k', ln, None, hi=GOOD, hi_col=C['green'], parent=vc, reveal='fade', after=tr)
gi = [k for k, v in vb.items() if nrm(rt[k]) in {nrm(x) for x in GOOD}] if len(vb) == len(rt) else []
if gi:
    u0, u1 = vb[gi[0]], vb[gi[-1]]
    El('k.under', bar(int(u1[0] + u1[2] - u0[0]), 10, C['green']), u0[0], u0[1] + u0[3] - 10, 'k', u1[4] + DUR['fast'], None, enter='wipe', d_in='base', parent=vc, z=8)

# why: rule chip + formula + spoken sentence ---------------------------------
b = BEAT['y']; ln = L['y']; g = 'y'
fparts = FORM.split(' + ') if ' + ' in FORM else [FORM, '']
fs_ = TYPE['display'] if T1 else TYPE['display']
h_ = ih + 72 + 24 + int(fs_ * LEAD) + 24 + measure(WHY, TYPE['body'], 'body', FULL)
y = stage_y(h_); y = place_icon('y', y, b['vin'], b['vout'], g)
rc = chip('RULE', C['yellow'], C['navy']); El('y.chip', rc, X0 + (FULL - rc.width) // 2, y, g, b['vin'], b['vout'], enter='fade', d_in='base', text='RULE', fs=TYPE['label'])
y += 72 + 24
ff = F('display', fs_); w1 = ff.getlength(fparts[0]); w2 = ff.getlength(' + ') if fparts[1] else 0; w3 = ff.getlength(fparts[1])
if w1 + w2 + w3 > FULL: fs_ = TYPE['h1']; ff = F('display', fs_); w1 = ff.getlength(fparts[0]); w2 = ff.getlength(' + '); w3 = ff.getlength(fparts[1])
if w1 + w2 + w3 > FULL: fs_ = TYPE['h2']; ff = F('display', fs_); w1 = ff.getlength(fparts[0]); w2 = ff.getlength(' + ') if fparts[1] else 0; w3 = ff.getlength(fparts[1])
w2 = w2 if fparts[1] else 0
fx = X0 + (FULL - (w1 + w2 + w3)) / 2
t_c = ln.at + ln.words[0]['s']
try: t_i = ln.t(fparts[1].split()[0].strip('-').lower()) if fparts[1] else t_c
except SystemExit: t_i = ln.at + ln.words[len(ln.words) // 2]['s']
t_i = max(t_i, t_c + DUR['base'])
El('y.f1', text_img(fparts[0], fs_, 'display', INK), fx - 2, y, g, t_c - 0.05, b['vout'], enter='rise', d_in='base', text=fparts[0], fs=fs_)
if fparts[1]: El('y.f2', text_img('+ ' + fparts[1], fs_, 'display', C['red']), fx + w1 + ff.getlength(' ') - 2, y, g, t_i - 0.05, b['vout'], enter='pop', d_in='base', text='+ ' + fparts[1], fs=fs_)
y += int(fs_ * LEAD) + 24
words_block('y.s', WHY, TYPE['body'], 'body', X0, y, FULL, g, ln, b['vout'], color=SUB, align='center', reveal='fade')
TICKS.append(t_i)

# check: sentence + NO stamp + strike ------------------------------------
if 'c' in SEQ:
    b = BEAT['c']; ln = L['c']; g = 'c'
    sz2 = TYPE['h1'] if not T1 else TYPE['h2']
    h_ = ih + 72 + 24 + measure(wrong + '?', sz2, 'head', FULL) + 32 + 104
    y = stage_y(h_); y = place_icon('c', y, b['vin'], b['vout'], g)
    cc_ = chip('QUICK CHECK', C['navy'] if T1 else C['cream'], C['cream'] if T1 else C['navy']); El('c.chip', cc_, X0 + (FULL - cc_.width) // 2, y, g, b['vin'], b['vout'], enter='fade', d_in='base', text='QUICK CHECK', fs=TYPE['label'])
    y += 72 + 24
    y_, cb = words_block('c.s', wrong + '?', sz2, 'head', X0, y, FULL, g, ln, b['vout'], color=INK, hi=BAD, align='center', after=ln.t(wt[0]))
    tno = ln.t('No.')
    bi = [k for k in cb if nrm(wt[k] if k < len(wt) else '') in {nrm(x) for x in BAD}]
    if bi:
        u0, u1 = cb[bi[0]], cb[bi[-1]]
        if abs(u0[1] - u1[1]) < 1: El('c.strike', bar(int(u1[0] + u1[2] - u0[0]) + 16, 12, C['red']), u0[0] - 8, u0[1] + u0[3] // 2 - 2, g, tno, b['vout'], enter='wipe', d_in='base', z=8)
    st = Image.new('RGBA', (300, 104), (0, 0, 0, 0)); d_ = ImageDraw.Draw(st); d_.rounded_rectangle((0, 0, 299, 103), 52, fill=C['red'] + (255,))
    d_.ellipse((16, 16, 88, 88), fill=(255, 255, 255, 255)); d_.line((34, 34, 70, 70), fill=C['red'] + (255,), width=9); d_.line((34, 70, 70, 34), fill=C['red'] + (255,), width=9)
    d_.text((196, 54), 'NO', font=F('display', 76), fill=(255, 255, 255, 255), anchor='mm')
    El('c.no', st, X0 + (FULL - 300) // 2, snap(y_ + 32), g, tno - 0.05, b['vout'], enter='pop', d_in='base', text='NO', fs=76)
    TICKS.append(tno)

# normal speed: karaoke sentence + marker ----------------------------------
b = BEAT['rn']; ln = L['rn']; g = 'rn'
sz3 = TYPE['h1']
h_ = ih + 72 + 24 + measure(endp(right), sz3, 'head', FULL)
y = stage_y(h_); y = place_icon('rn', y, b['vin'], b['vout'], g)
nc = chip('NORMAL SPEED', C['green'], C['white']); El('rn.chip', nc, X0 + (FULL - nc.width) // 2, y, g, b['vin'], b['vout'], enter='fade', d_in='base', text='NORMAL SPEED', fs=TYPE['label'])
y += 72 + 24; tr = ln.t(rt[0])
_, kb = words_block('rn.s', endp(right), sz3, 'head', X0, y, FULL, g, ln, b['vout'], color=INK, hi=GOOD, hi_col=C['green'] if T1 else C['yellow'], align='center', karaoke=True, after=b['vin'], z=7)
gi = [k for k in kb if k < len(rt) and nrm(rt[k]) in {nrm(x) for x in GOOD}]
if gi:
    u0, u1 = kb[gi[0]], kb[gi[-1]]
    El('rn.mark', bar(int(u1[0] + u1[2] - u0[0]) + 24, 14, C['yellow'] if T1 else C['green']), u0[0] - 12, u0[1] + u0[3] - 14, g, u0[4] + DUR['fast'], b['vout'], enter='wipe', d_in='base', z=5)
    TICKS.append(u0[4] + DUR['fast'])

# teacher's tip: title + 3 numbered rows (one staggered group) ----------------------
b = BEAT['r2']; ln = L['r2']; g = 'r2'
rs = TYPE['body']; rw = FULL - 64 - 24
hrows = [measure(r_, rs, 'head', rw) for r_ in ROWS]
h_ = ih + 72 + 32 + sum(hrows) + 24 * (len(ROWS) - 1)
y = stage_y(h_); y = place_icon('r2', y, b['vin'], b['vout'], g)
tc_ = chip("TEACHER'S TIP", C['yellow'], C['navy']); El('r2.chip', tc_, X0 + (FULL - tc_.width) // 2, y, g, ln.t("Teacher's") - 0.05, b['vout'], enter='fade', d_in='base', text="TEACHER'S TIP", fs=TYPE['label'])
y += 72 + 32; t0 = ln.t('save')
ingw = {nrm(w_) for w_ in GOOD} if 'quiz' in SP else {nrm(w_) for r_ in ROWS for w_ in r_.split() if nrm(w_).endswith('ing') and nrm(w_) not in ('considering',)}
for i, r_ in enumerate(ROWS):
    ti = t0 + i * DUR['fast']
    rowp = El(f'r2.row{i}', badge(f'n{i + 1}', 64, bg=None if T1 else C['yellow']), X0, y + (int(rs * LEAD) - 64) // 2, g, ti, b['vout'], enter='slide', d_in='base', z=6)
    f = F('head', rs); sp = f.getlength(' '); yy = y; j = 0
    for r, ws in enumerate(wrap(r_.split(), f, rw)):
        xx = X0 + 64 + 24; yy = y + r * int(rs * LEAD)
        for w_ in ws:
            El(f'r2.row{i}.w{j}', text_img(w_, rs, 'head', (C['green'] if T1 else C['yellow']) if nrm(w_) in ingw else INK), xx - 2 - rowp.x, yy - rowp.y, g, ti, None, enter='none', parent=rowp, z=6, text=w_, fs=rs)
            xx += f.getlength(w_) + sp; j += 1
    y = yy + int(rs * LEAD) + 24
TICKS += [t0 + i * DUR['fast'] for i in range(len(ROWS))]
for e_ in ELS:   # row words ride on their badge element (relative coords)
    if e_.parent is not None and e_.id.startswith('r2.row') and '.w' in e_.id: e_.x += e_.parent.x; e_.y += e_.parent.y

# quiz ------------------------------------------------------------------
b = BEAT['e']; ln = L['e']; g = 'e'
qs = TYPE['h2']; qtxt = f'{Q_PRE} _____ {Q_POST}.' if Q_POST else f'{Q_PRE} _____.'
STACK = max(F('head', TYPE['body']).getlength(x) for x in (QA, QB)) > span(0, 5) - 128   # long options -> two full-width rows (never below 48 px)
h_ = ih + 72 + 24 + measure(qtxt, qs, 'head', FULL) + 40 + 112 + (112 + 24 if STACK else 0) + 40 + int(TYPE['label'] * LEAD)
y = stage_y(h_); y = place_icon('e', y, b['vin'], b['vout'], g)
qc = chip('QUIZ', C['red'], C['white']); El('e.chip', qc, X0 + (FULL - qc.width) // 2, y, g, b['vin'], b['vout'], enter='fade', d_in='base', text='QUIZ', fs=TYPE['label'])
y += 72 + 24
y_, qb = words_block('e.s', qtxt, qs, 'head', X0, y, FULL, g, ln, b['vout'], color=INK, align='center', after=ln.t(Q_PRE.split()[0]))
y = snap(y_ + 40)
t_opt = ln.t('blank')
for i, (lab, opt, wd) in enumerate([('A', QA.lower(), QA), ('B', QB, QB.split()[0] + ' ' + QB.split()[1] if ' ' in QB else QB)]):
    ow = FULL if STACK else span(0, 5); im, pad = rrect(ow, 112, 28, C['white'] if T1 else C['cream'], shadow=T1)
    ofs = TYPE['body']
    dd = ImageDraw.Draw(im); dd.ellipse((pad + 20, pad + 24, pad + 84, pad + 88), fill=C['navy'] + (255,)); dd.text((pad + 52, pad + 57), lab, font=F('head', 44), fill=(255, 255, 255, 255), anchor='mm')
    dd.text((pad + 108, pad + 56), opt, font=F('head', ofs), fill=C['navy'] + (255,), anchor='lm')
    to = ln.t(wd.rstrip('?,').split()[0].rstrip(','), after=t_opt + 0.01); t_opt = to
    El(f'e.opt{i}', im, (X0 if STACK else col(0 if i == 0 else 6)) - pad, y - pad + (i * (112 + 24) if STACK else 0), g, to - 0.05, b['vout'], enter='rise', d_in='base', z=6, text=f'{lab} {opt}', fs=ofs, inset=pad)
    TICKS.append(to)
y += 112 + (112 + 24 if STACK else 0) + 40; tcm = ln.t('Comment')
words_block('e.cta', 'Comment your answer', TYPE['label'], 'head', X0, y, FULL, g, None, b['vout'], color=SUB, align='center', reveal='fade', after=tcm)

# share / end card --------------------------------------------------------
b = BEAT['s']; ln = L['s']; g = 's'
END_OUT = b['vout'] if CTA else None    # tpl 1b: the end card clears -> last frame = frame-0 look (plate + host only) = seamless loop
if CTA:
    ct = CTA['text']; i_on = ct.lower().rfind(' on lexkite.com'); c1, c2 = (ct[:i_on], ct[i_on + 1:]) if i_on > 0 else (ct, 'lexkite.com')
    lab = CTA['label'] + '  \u2192'; ch_ = chip(lab, C['navy'], C['cream'], TYPE['body'])
    h_ = measure(c1, TYPE['h1'], 'display', FULL) + 16 + int(TYPE['h2'] * LEAD) + 48 + ch_.height
    y = stage_y(h_)
    y_, _ = words_block('s.t', c1, TYPE['h1'], 'display', X0, y, FULL, g, ln, END_OUT, color=INK, align='center')
    y_, _ = words_block('s.t2', c2, TYPE['h2'], 'display', X0, y_ + 16, FULL, g, ln, END_OUT, color=C['red'], align='center', reveal='fade', after=ln.t(c2.split()[0]))
    El('s.link', ch_, X0 + (FULL - ch_.width) // 2, snap(y_ + 48), g, ln.last() + DUR['fast'], END_OUT, enter='rise', d_in='base', text=lab, fs=TYPE['body'])
else:
    h_ = ih + measure('Send this to a friend', TYPE['h1'], 'display', FULL) + 16 + int(TYPE['body'] * LEAD) + 56 + int(TYPE['display'] * LEAD)
    y = stage_y(h_); y = place_icon('s', y, b['vin'], None, g)
    y_, _ = words_block('s.t', 'Send this to a friend', TYPE['h1'], 'display', X0, y, FULL, g, ln, None, color=INK, align='center')
    y_, _ = words_block('s.t2', 'who needs it.', TYPE['body'], 'body', X0, y_ + 16, FULL, g, ln, None, color=SUB, align='center', reveal='fade', after=ln.t('who'))
    lk = text_img('Lexkite', TYPE['display'], 'display', C['navy2'] if T1 else C['yellow'])
    El('s.brand', lk, X0 + (FULL - lk.width) // 2, snap(y_ + 56), g, ln.last() + DUR['fast'], None, enter='rise', d_in='base', text='Lexkite', fs=TYPE['display'])
if END_OUT:   # persistent chrome leaves with the end card (same exit tag)
    for e_ in ELS:
        if e_.id in ('progress.track', 'series'): e_.t_out = END_OUT

# progress steps: fill grows at each beat start (part of that beat's group)
PSTEPS = [(BEAT[k]['vin'], (i + 1) / len(SEQ), k) for i, k in enumerate(SEQ)]

# ------------------------------------------------------------------ background + host
def gradient(top, bot):
    a = np.linspace(0, 1, H)[:, None, None]; return (np.array(top)[None, None] * (1 - a) + np.array(bot)[None, None] * a).repeat(W, 1).astype(np.float32)
def blob(img, cx, cy, r, color, alpha, blur):
    lay = Image.new('L', (W, H), 0); ImageDraw.Draw(lay).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255); m = np.asarray(lay.filter(ImageFilter.GaussianBlur(blur)), np.float32)[..., None] / 255 * alpha
    return img * (1 - m) + np.array(color, np.float32) * m
PLATE_LOG = None
if PLATE_N:
    import cv2
    pm = PLATES.get(PLATE_N) or sys.exit(f'plate {PLATE_N} not in tokens.PLATES (human-checked clean plates only)')
    src = cv2.imread(f'{o.lib}/bg/{PLATE_N}.png')[..., ::-1].astype(np.float32)
    ph, pw = src.shape[:2]; k0 = max(W / pw, H / ph) * (1 + PLATE['push'])           # cover + the push-in headroom, resampled ONCE
    PL = cv2.resize(src, (int(round(pw * k0)), int(round(ph * k0))), interpolation=cv2.INTER_AREA)
    PL = cv2.GaussianBlur(PL, (0, 0), PLATE['blur'] * k0 / 0.72)                       # depth blur: the plate reads as a background, never competes with type
    lum = 0.299 * PL[..., 0] + 0.587 * PL[..., 1] + 0.114 * PL[..., 2]; PL = lum[..., None] + (PL - lum[..., None]) * PLATE['sat']   # grade: -18 % saturation
    PL = 0.88 * PL + 0.12 * np.array(C['cream'], np.float32)                           # lift toward cream (brand warmth, lower contrast)
    ys = np.linspace(0, 1, PL.shape[0])[:, None, None]
    L_ = lambda A: (lambda Z: float(np.mean(0.299 * Z[..., 0] + 0.587 * Z[..., 1] + 0.114 * Z[..., 2])))(A[int(A.shape[0] * 0.12):int(A.shape[0] * 0.54)])   # text stage rows
    L0, Lc = L_(PL), float(np.dot(C['cream'], [0.299, 0.587, 0.114]))
    a_top = float(np.clip(max(PLATE['scrim_top'], (PLATE['stage_luma'] + 1 - L0) / (Lc - L0)), 0, 0.92))   # adaptive: dark plates get more scrim
    scr = a_top * np.clip(1 - np.maximum(0, ys - 0.54) / (PLATE['scrim_y1'] - 0.54), 0, 1)   # cream scrim: full over the whole text stage, fades out over the host's head
    PLs = PL * (1 - scr) + np.array(C['cream'], np.float32) * scr
    L_after = L_(PLs)   # stage luma AFTER the scrim (what the type sits on)
    PL = np.clip(PL + (np.random.RandomState(7).rand(*PL.shape[:2], 1).astype(np.float32) - 0.5) * 1.6, 0, 255).astype(np.float32)
    PLH, PLW = PL.shape[:2]
    # the scrim is a SCREEN layer that exists only while text is on screen (owner 24/10: the dark restaurant plate ended on a heavy white haze):
    # frame 0 and the loop end show the clean plate (scrim = PLATE.scrim_rest for every plate); it eases in with the hook and out with the end card
    ysS = np.linspace(0, 1, H, dtype=np.float32)[:, None, None]
    SCR = (a_top * np.clip(1 - np.maximum(0, ysS - 0.54) / (PLATE['scrim_y1'] - 0.54), 0, 1)).astype(np.float32); CREAM = np.array(C['cream'], np.float32)
    # host colour match: plate tone under the host (lower third, after grade) vs neutral grey -> per-channel gain, clamped
    reg_ = PLs[int(PLH * 0.62):, int(PLW * 0.2):int(PLW * 0.8)].reshape(-1, 3).mean(0); del PLs
    HOST_GAIN = np.clip(1 + PLATE['host_match'] * (reg_ / reg_.mean() - 1), 0.94, 1.06).astype(np.float32)
    SH_COL = np.clip(reg_ * 0.35, 0, 255).astype(np.float32)                           # contact shadow = darkened plate tone (not navy)
    PLATE_LOG = dict(name=PLATE_N, tags=pm['tags'], people=pm['people'], text=pm['text'], checked=pm['checked'], push=PLATE['push'],
                     blur=PLATE['blur'], scrim=round(a_top, 3), stage_luma=round(L_after, 1), host_gain=[round(float(x), 4) for x in HOST_GAIN],
                     faces=int(len(cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml').detectMultiScale(
                         cv2.cvtColor(src.astype(np.uint8), cv2.COLOR_RGB2GRAY), 1.1, 10, minSize=(60, 60)))), lesson_topic=SP.get('topic'), lesson_area=SP.get('area'))
    def plate_at(t):
        """very slow linear push-in, centred: crop scale goes 1 -> 1/(1+push) over the video (sub-pixel warp, no stepping)"""
        z = 1 + PLATE['push'] * min(1.0, t / TOTAL); cw, ch = W * (1 + PLATE['push']) / z, H * (1 + PLATE['push']) / z
        sx = cw / W; x0 = (PLW - cw) / 2; y0 = (PLH - ch) / 2
        M = np.array([[sx, 0, x0], [0, sx, y0]], np.float32)
        return cv2.warpAffine(PL, M, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT), round(z, 5)
    def scrim_k(t):
        """0 = rest (clean plate, frame 0 + loop end), 1 = full scrim under text. In: with the hook (base), out: with the end card (slow, inout)."""
        r = PLATE['scrim_rest'] / max(a_top, 1e-6); k = r + (1 - r) * bezier(EASE['out'], t / DUR['base'])
        if END_OUT and t >= END_OUT: k = 1 - (1 - r) * bezier(EASE['inout'], (t - END_OUT) / DUR['slow'])
        return float(min(1.0, max(0.0, k)))
    BG = None
elif T1:
    BG = gradient((255, 249, 238), (226, 241, 235))
    BG = blob(BG, 140, 420, 300, C['yellow'], 0.20, 140); BG = blob(BG, 1000, 900, 260, C['red'], 0.07, 150)
    BG = blob(BG, 560, 1560, 560, C['navy2'], 0.10, 160); BG = blob(BG, 540, 1500, 440, (255, 255, 255), 0.55, 120)
else:
    BG = gradient((18, 72, 73), (9, 40, 41))
    BG = blob(BG, 900, 420, 420, C['navy2'], 0.55, 160); BG = blob(BG, 120, 1450, 360, C['red'], 0.10, 170); BG = blob(BG, 980, 1700, 300, C['yellow'], 0.06, 160)
yy_, xx_ = np.mgrid[0:H, 0:W]; vig = 1 - 0.10 * (((xx_ - W / 2) / (W * 0.75)) ** 2 + ((yy_ - H / 2) / (H * 0.75)) ** 2)
if BG is not None:
    BG = np.clip(BG * vig[..., None], 0, 255).astype(np.float32)
    # 0.6 % dither so the gradient never bands after x264
    BG = np.clip(BG + (np.random.RandomState(7).rand(H, W, 1).astype(np.float32) - 0.5) * 1.6, 0, 255)

HOST_T = None
class Host:
    """Ama, ONE transform for the whole video (scale, x, y fixed): keyed PRO layer + lip-synced mouth (scripts/cine/lipsync.py), seamless ping-pong."""
    def __init__(s):
        import cv2; s.cv2 = cv2
        sys.path.insert(0, f'{ROOT}/scripts/cine'); import lipsync as LS; s.LS = LS
        G = f'{o.lib}/green'; cf, cm = f'{G}/kfull_pro/{CLIP}.mp4', f'{G}/kmask_pro/{CLIP}.mkv'
        cap = cv2.VideoCapture(cf); s.FR = []
        while True:
            ok, f_ = cap.read()
            if not ok: break
            s.FR.append(f_)
        cap = cv2.VideoCapture(cm); s.MM = []
        while True:
            ok, m_ = cap.read()
            if not ok: break
            s.MM.append(m_[..., 0])
        s.n = min(len(s.FR), len(s.MM)); s.mo = LS.Mouth(f'{o.lib}/tools/meta/{CLIP}/{HOSTN}')
        s.lines = [dict(cues=L[k].cues, at=L[k].at, tempo=1.0) for k in SEQ if L[k].cues]
        s.cache = {}
    def frame(s, t):
        cv2 = s.cv2; k = int(t * 24) % (2 * s.n - 2); i = k if k < s.n else 2 * s.n - 2 - k
        v = s.LS.viseme_at(s.lines, t); key = (i, v)
        if key not in s.cache:
            if len(s.cache) > 64: s.cache.clear()
            Fm = s.mo.apply(s.FR[i].copy(), i, s.mo.spr[v]); Fm = cv2.resize(Fm, (1080, 1920), interpolation=cv2.INTER_LANCZOS4)
            M = cv2.resize(s.MM[i], (1080, 1920), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
            rgb_ = Fm[..., ::-1].astype(np.float32)
            if PLATE_N: rgb_ = np.clip(rgb_ * HOST_GAIN, 0, 255)
            if HEXT > 0:   # framing standard: legs continue under a tightly framed source (edge rows repeated, logged + capped by qc host_frame_std)
                rgb_ = np.pad(rgb_, ((0, HEXT), (0, 0), (0, 0)), mode='edge'); M = np.pad(M, ((0, HEXT), (0, 0)), mode='edge')
            if HSC != 1.0:   # 1b host lock: one fixed downscale (never up) = the framing standard of tokens.HOST_LOCK (hostframe.solve)
                sz_ = (int(round(1080 * HSC)), int(round((1920 + HEXT) * HSC))); rgb_ = cv2.resize(rgb_, sz_, interpolation=cv2.INTER_AREA); M = cv2.resize(M, sz_, interpolation=cv2.INTER_AREA)
                M = M * HOST_FEATHER[None, :]   # the scaled layer's side edges sit inside the frame -> feather them (no hard vertical cut through an arm)
            s.cache[key] = (rgb_, M)
        return s.cache[key], i, v
    def landmarks(s, step=6):
        """framing landmarks of the SOURCE matte (layer px 1080x1920), every <step>th frame merged (hostframe.merge)"""
        cv2 = s.cv2; return HF.merge([HF.landmarks(cv2.resize(m_, (1080, 1920), interpolation=cv2.INTER_LINEAR)) for m_ in s.MM[::step]])
    def screen_alpha(s, i):
        """the matte of source frame i exactly as composited on screen (extension, scale, side feather, offset) -> HxW"""
        cv2 = s.cv2; M = cv2.resize(s.MM[i], (1080, 1920), interpolation=cv2.INTER_LINEAR).astype(np.float32) / 255
        if HEXT > 0: M = np.pad(M, ((0, HEXT), (0, 0)), mode='edge')
        if HSC != 1.0: M = cv2.resize(M, (int(round(1080 * HSC)), int(round((1920 + HEXT) * HSC))), interpolation=cv2.INTER_AREA) * HOST_FEATHER[None, :]
        lh, lw = M.shape; a = np.zeros((H, W), np.float32)
        sx0, sy0, dx0, dy0 = max(0, -HDX), max(0, -HDY), max(0, HDX), max(0, HDY); w, h = min(lw - sx0, W - dx0), min(lh - sy0, H - dy0)
        a[dy0:dy0 + h, dx0:dx0 + w] = M[sy0:sy0 + h, sx0:sx0 + w]; return a, HDY + lh
HSC, HDX, HDY, HEXT = 1.0, 0, 640, 0         # host transform: scale 1.0 (no resample = sharpest), source y 440 (hair top) lands at screen 1080, under the stage
def host_comp(base, rgb, m):
    """fixed transform: the (already scaled) layer is pasted at (HDX, HDY), clipped to the frame; soft contact shadow from the same alpha, fixed offset"""
    lh, lw = m.shape
    sx0, sy0, dx0, dy0 = max(0, -HDX), max(0, -HDY), max(0, HDX), max(0, HDY)
    w, h = min(lw - sx0, W - dx0), min(lh - sy0, H - dy0)
    a = np.zeros((H, W), np.float32); a[dy0:dy0 + h, dx0:dx0 + w] = m[sy0:sy0 + h, sx0:sx0 + w]
    sh = HOST_SH_CACHE.get(id(m))
    if sh is None:
        import cv2; sh = cv2.GaussianBlur(a, (0, 0), 22) * (0.30 if PLATE_N else 0.22)
        s_ = np.zeros_like(sh); s_[10:, 18:] = sh[:-10, :-18]
        if PLATE_N: s_ = s_ * np.clip((np.arange(H, dtype=np.float32)[:, None] - 1500) / 300, 0, 1)   # 1b: shadow only where the body meets the frame edge (no halo around the head on the light scrim)
        else: s_[:HDY] = 0
        sh = s_; HOST_SH_CACHE.clear(); HOST_SH_CACHE[id(m)] = sh
    base = base * (1 - sh[..., None]) + (SH_COL if PLATE_N else np.array(C['navy'], np.float32)) * sh[..., None]
    reg = base[dy0:dy0 + h, dx0:dx0 + w]; aa = a[dy0:dy0 + h, dx0:dx0 + w, None]
    base[dy0:dy0 + h, dx0:dx0 + w] = reg * (1 - aa) + rgb[sy0:sy0 + h, sx0:sx0 + w] * aa
    return base
HOST_SH_CACHE = {}
host = Host() if (T1 and not o.fake_vo and not o.host_still) else None
HOST_HEAD = None
if host is not None and PLATE_N:   # 1b framing standard (tokens.HOST_LOCK, hostframe.py): same shoulder width, head top, body centre, crop line for EVERY host
    import cv2
    lm = host.landmarks(); HSC, HDY, HDX = HF.solve(lm, HOST_LOCK)
    HEXT = max(0, int(np.ceil((1920 - (HDY + 1920 * HSC)) / HSC)) + 8) if HDY + 1920 * HSC < 1920 + 4 else 0   # source rows to add under the legs
    lw_ = int(round(1080 * HSC)); FE = max(8, int(round(12 + 24 * HSC))); HOST_FEATHER = np.ones(lw_, np.float32)   # feather ~ 50 source px: never fades an arm
    if HSC < 1.0: r_ = np.linspace(0, 1, FE, dtype=np.float32) ** 1.5; HOST_FEATHER[:FE] = r_; HOST_FEATHER[-FE:] = r_[::-1]
    host.cache.clear()
    # measure the RESULT on screen (the gate never trusts the solver): landmarks of the composited matte over the clip
    scr = [host.screen_alpha(i) for i in range(0, host.n, 6)]; SL = HF.merge([HF.landmarks(a_) for a_, _ in scr]); SL['layer_bottom'] = scr[0][1]
    HOST_HEAD = dict(src=lm, scale=HSC, x=HDX, y=HDY, ext_rows=int(round(HEXT * HSC)), ext_src_rows=HEXT, screen=SL, std=HF.check(SL, HOST_LOCK, int(round(HEXT * HSC))),
                     shoulder_w=SL['shoulder_w'], top=SL['top'], cx=SL['cx'], crop=SL['hands'], head=round((lm['neck'] - lm['top']) * HSC, 1))
    m0 = scr[0][0]; side = (m0[:, max(0, HDX + FE)] > 0.5) | (m0[:, min(W - 1, HDX + lw_ - FE - 1)] > 0.5); body = (m0 > 0.5).any(1)
    HOST_HEAD.update(side_cut_rows=int(side.sum()), host_rows=int(body.sum()), bottom=SL['layer_bottom'])   # qc_tpl host_frame gate
    print('host frame', HOSTN, json.dumps(HOST_HEAD))
LIPSYNC = None
if host is not None:   # real host on screen -> every spoken line needs Rhubarb cues (no silent estimate; CI fails here when Rhubarb is missing)
    LIPSYNC = dict(lines={k: L[k].lipsrc for k in SEQ}, missing=[k for k in SEQ if not L[k].cues])
    if LIPSYNC['missing'] or any(not str(v or '').startswith('rhubarb') for v in LIPSYNC['lines'].values()):
        sys.exit(f"lip-sync: Rhubarb cues missing/unverified for {LIPSYNC['missing'] or LIPSYNC['lines']} – run scripts/cine/news_voice.py with RHUBARB")
HSTILL = None
if T1 and o.host_still:
    im = np.asarray(Image.open(o.host_still).convert('RGBA').resize((1080, 1920)), np.float32); HSTILL = (im[..., :3], im[..., 3] / 255)

# ------------------------------------------------------------------ render loop
ELS.sort(key=lambda e: e.z)
def prog_frac(t):
    prev = 0.0
    for t0, fr, k in PSTEPS:
        if t < t0: return prev, False, None
        p = (t - t0) / DUR['base']
        if p < 1: return prev + (fr - prev) * bezier(EASE['out'], p), True, k
        prev = fr
    return prev, False, None
def compose(t, log):
    pz = None
    sk = None
    if PLATE_N:
        base, pz = plate_at(t); sk = scrim_k(t)
        if sk > 0: base = base + (CREAM - base) * (SCR * sk)
    else: base = BG.copy()
    hl = None
    if host is not None:
        (rgb, m), i, v = host.frame(t); base = host_comp(base, rgb, m); hl = dict(scale=HSC, x=HDX, y=HDY, src=i, mouth=v)
    elif HSTILL is not None: base = host_comp(base, *HSTILL); hl = dict(scale=HSC, x=HDX, y=HDY)
    fr = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert('RGBA'); rec = []
    pf, pmv, pk = prog_frac(t)
    pa = 1.0
    if END_OUT and t >= END_OUT:
        q = (t - END_OUT) / DUR['fast']; pa = 0.0 if q >= 1 else 1 - bezier(EASE['inn'], q); pmv, pk = (q < 1), (f'out@{END_OUT:.2f}' if q < 1 else pk)
    if pf > 0 and pa > 0.004:
        pim = PROG.crop((0, 0, max(1, int(FULL * pf)), 10))
        if pa < 0.999: arr = np.asarray(pim).copy(); arr[..., 3] = (arr[..., 3] * pa).astype(np.uint8); pim = Image.fromarray(arr)
        fr.alpha_composite(pim, (X0, 240)); rec.append(['progress.fill', X0, 240, int(FULL * pf), 10, round(pa, 3), 1, int(pmv), pk if pmv else '-', 0])
    for e in ELS:
        a, dx, dy, sc, wp, mv = e.state(t)
        if a <= 0.004: continue
        im = e.img
        if wp < 1: im = im.crop((0, 0, max(1, int(round(im.width * wp))), im.height))
        x, y = e.x + dx, e.y + dy
        if sc != 1:
            w2, h2 = max(1, round(im.width * sc)), max(1, round(im.height * sc)); x += (im.width - w2) / 2; y += (im.height - h2) / 2; im = im.resize((w2, h2), Image.BILINEAR)
        if a < 0.999:
            arr = np.asarray(im).copy(); arr[..., 3] = (arr[..., 3] * a).astype(np.uint8); im = Image.fromarray(arr)
        xi, yi = int(round(x)), int(round(y))
        if xi < 0 or yi < 0:
            im = im.crop((max(0, -xi), max(0, -yi), im.width, im.height)); xi, yi = max(0, xi), max(0, yi)
        fr.alpha_composite(im, (xi, yi))
        rec.append([e.id, round(x, 2), round(y, 2), im.width, im.height, round(a, 3), round(sc, 4), int(mv is not None), mv or e.grp, 1 if e.text else 0])
    log.append(dict(t=round(t, 4), host=hl, els=rec, plate=pz, scrim=None if sk is None else round(a_top * sk, 4)))
    return fr.convert('RGB')

os.makedirs(os.path.dirname(os.path.abspath(o.out)), exist_ok=True)
SNAP = [round(max(BEAT[k]['vin'] + 0.6, BEAT[k]['vout'] - 0.15), 2) for k in SEQ]
if o.stills:
    for ts in [x for v in o.stills.split(',') for x in (SNAP if v == 'beats' else [float(v)])]:
        compose(ts, []).save(f'{o.out}.{ts:05.2f}.png')
    print('stills done', TOTAL); sys.exit(0)

# audio --------------------------------------------------------------
SR = 48000; NA = int((TOTAL + 0.5) * SR); mix = np.zeros(NA, np.float32)
def load(p): return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', p, '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-']), np.float32)
def put(sig, t0, gain=1.0):
    i0 = int(t0 * SR); n = min(len(sig), NA - i0)
    if n > 0: mix[i0:i0 + n] += sig[:n] * gain
db = lambda x: 10 ** (x / 20)
voice = np.zeros(NA, np.float32)
if not o.fake_vo:
    for k in SEQ:
        sig = load(L[k].wav); i0 = int(L[k].at * SR); n = min(len(sig), NA - i0); voice[i0:i0 + n] += sig[:n]
    act = np.abs(voice) > 1e-3; rms = np.sqrt(np.mean(voice[act] ** 2)) if act.any() else 1
    voice *= db(-19) / rms
rng = np.random.RandomState(3)
def whoosh(d=0.32):
    n = int(d * SR); x = rng.randn(n).astype(np.float32); tt = np.linspace(0, 1, n)
    env = np.sin(np.pi * tt) ** 2; y = np.zeros(n, np.float32); st_ = 0.0
    k = 0.02 + 0.18 * np.sin(np.pi * tt)   # moving one-pole low-pass = airy sweep
    for i in range(n): st_ += k[i] * (x[i] - st_); y[i] = st_
    y *= env; return y / np.abs(y).max()
def tick(f0=1900, d=0.05):
    n = int(d * SR); tt = np.arange(n) / SR; return (np.sin(2 * np.pi * f0 * tt) * np.exp(-tt * 90)).astype(np.float32)
WH, TK = whoosh(), tick()
WH_T = sorted({round(e.t_in, 2) for e in ELS if e.enter == 'slide' and not e.parent and e.id.endswith('card')} | {round(BEAT[k]['vin'], 2) for k in ('y', 'c', 'rn', 'r2', 'e', 's') if k in BEAT})
for t0 in WH_T: put(WH, max(0, t0 - 0.08), db(-27))
for t0 in TICKS: put(TK, t0, db(-29))
# music bed: soft pad (maj7 voicings), RMS -40 dBFS, 1.5 s fades
tt = np.arange(NA) / SR; pad = np.zeros(NA, np.float32)
CH = [[261.63, 329.63, 392.0, 493.88], [220.0, 261.63, 329.63, 392.0], [174.61, 220.0, 261.63, 329.63], [196.0, 246.94, 293.66, 392.0]]
seg = 4.0
for j in range(int(TOTAL // seg) + 2):
    a0, a1 = int(j * seg * SR), min(NA, int((j + 1) * seg * SR) + int(0.8 * SR))
    if a0 >= NA: break
    tl = tt[a0:a1] - j * seg; env = np.minimum(1, tl / 1.2) * np.minimum(1, np.maximum(0, (seg + 0.8 - tl) / 1.2))
    for f0 in CH[j % 4]: pad[a0:a1] += (np.sin(2 * np.pi * f0 / 2 * tl) * 0.6 + np.sin(2 * np.pi * f0 * tl) * 0.3).astype(np.float32) * env
fade = np.minimum(1, np.minimum(tt / 1.5, np.maximum(0, (TOTAL - tt) / 1.5))); pad *= fade
pad *= db(-40) / np.sqrt(np.mean(pad[int(2 * SR):int((TOTAL - 2) * SR)] ** 2))
mix += voice + pad; mix = np.clip(mix, -db(-1), db(-1))
AW = o.out + '.mix.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', AW], input=mix.tobytes(), check=True)
AUD = dict(voice_rms_dbfs=-19, music_rms_dbfs=round(20 * np.log10(np.sqrt(np.mean(pad[int(2 * SR):int((TOTAL - 2) * SR)] ** 2)) + 1e-9), 1), whoosh_peak_dbfs=-27, tick_peak_dbfs=-29, whooshes=len(WH_T), ticks=len(TICKS))

# video --------------------------------------------------------------
vk = int(min(6000, 24.3 * 8000 / TOTAL - 160)); vk = max(vk, 5500)
# 1b: audio loudnorm to -16 LUFS (MEDIA-QA-RUBRIC C)
RC = ['-crf', str(o.crf), '-maxrate', '14000k', '-bufsize', '28000k', '-x264-params', 'force-cfr=1'] if o.crf else ['-b:v', f'{vk}k', '-minrate', f'{vk}k', '-maxrate', f'{vk}k', '-bufsize', f'{vk}k', '-x264-params', 'nal-hrd=cbr:force-cfr=1']
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', AW,
                        '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', *RC, *(['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11'] if PLATE_N else []), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-shortest', o.out], stdin=subprocess.PIPE)
LOG = []; shots = {}
for fi in range(NF):
    tf = fi / FPS; img = compose(tf, LOG); enc.stdin.write(img.tobytes())
    for k, ts in zip(SEQ, SNAP):
        if abs(tf - ts) < 0.5 / FPS: shots[k] = img.resize((360, 640), Image.LANCZOS)
    if fi % 120 == 0: print(f'frame {fi}/{NF}', flush=True)
enc.stdin.close(); assert enc.wait() == 0
if o.crf:
    vbr = int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=bit_rate', '-of', 'csv=p=0', o.out]))
    if vbr < 5.5e6 + 160e3:   # CRF landed under the platform floor -> CBR at the floor from the CRF master (visually lossless step)
        tmp = o.out + '.crf.mp4'; os.replace(o.out, tmp)
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', tmp, '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '5800k', '-minrate', '5800k', '-maxrate', '5800k', '-bufsize', '5800k', '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-c:a', 'copy', '-movflags', '+faststart', o.out], check=True); os.remove(tmp)
    print('crf video kbps', vbr // 1000)
sheet = Image.new('RGB', (5 * 360 + 6 * 12, 2 * 640 + 3 * 12), (240, 240, 240))
for j, k in enumerate(SEQ):
    if k in shots: sheet.paste(shots[k], (12 + (j % 5) * 372, 12 + (j // 5) * 652))
sheet.save(o.out + '.sheet.jpg', quality=88)
LESSON_TXT = ' '.join([SP['series'][0], FORM, wrong, right, WHY, Q_PRE, Q_POST] + ROWS)
json.dump(dict(id=LID, hook_full=HOOK_FULL, lesson=dict(topic=SP.get('topic'), area=SP.get('area'), text=LESSON_TXT, hook=SP.get('hook'), hook_text=L['h'].text, wrong=SP['wrong_line'], right=SP['key_line'], reject=SP.get('reject'), fix=SP.get('fix')),
               host_head=HOST_HEAD, lipsync=LIPSYNC, tpl='1b' if PLATE_N else o.tpl, plate=PLATE_LOG, host_name=HOSTN, clip=CLIP, cta=CTA, fps=FPS, total=TOTAL, beats=BEAT, audio=AUD, video_kbps=vk, cuts=[],
               elements={e.id: dict(text=e.text, fs=e.fs, grp=e.grp, t_in=e.t_in, t_out=e.t_out, tweens=e.tweens(), inset=e.inset, parent=e.parent.id if e.parent else None) for e in ELS},
               progress=dict(tweens=[dict(kind='grow', dur='base', ease='out')] * len(PSTEPS)), frames=LOG), open(o.out + '.timeline.json', 'w'), default=float)
print('done', o.out, TOTAL, 's')
