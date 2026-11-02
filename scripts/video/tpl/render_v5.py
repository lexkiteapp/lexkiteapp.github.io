#!/usr/bin/env python3
"""PILOT v5 (docs/VIDEO-TEMPLATES.md §10) – fork of render_tpl.py, same element engine + timeline (qc_tpl.py gates).
  --dir A: native airport scene footage (characters generated inside the scene, Rhubarb mouth swap on the speaking character, cuts on phrase
           boundaries, punch-ins), teacher voice-over; --dir B: illustrated host on a STYLISED plate (mean-shift flat shading, host-palette grade,
           rim light, cast shadow). Both: dark ink glass panels + solid ink cards (never cream/white), viral captions (2-3 words, heavy, white + dark
           stroke, active word kit yellow, lower third, pop-in), punch-in camera on beats.
Original render_tpl.py doc:
Clean pilot templates (docs/VIDEO-TEMPLATES.md) for a news 'fix' lesson.
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
ap.add_argument('--dir', choices=['A', 'B'], required=True); ap.add_argument('--scene', default=None, help='A: native scene bank dir (lexkite-footage airport/)')
ap.add_argument('--skip', default='c'); ap.add_argument('--local-host', action='store_true', help='local layout check: real host matte with --fake-vo (no lip-sync, never for CI renders)'); ap.add_argument('--fake-vo', action='store_true'); ap.add_argument('--stills', default=None); ap.add_argument('--host-still', default=None, help='local: RGBA png used as a static host (layout check only)')
o = ap.parse_args()
SP = json.load(open(o.lesson)); LID = SP['id']; H6 = SP['hook']['line'][2:8]
LJ = json.load(open(o.lines or os.path.join(os.path.dirname(o.lesson), 'lines.json'))); WHO = {l['id']: l.get('who') for l in LJ['lines']}
PARTS = {l['id']: l['parts'] for l in LJ['lines'] if l.get('parts')}
TEXT = {l['id']: l['text'] for l in LJ['lines'] if l.get('text')}; TEXT.update({k: ' '.join(TEXT[x] for x in v) for k, v in PARTS.items()})
T1 = o.tpl == 1
DIRA = o.dir == 'A'; LOC = True   # v5: every render has the location look (captions, countdown, end card); PLATE_N only for B
PLATE_N = (None if DIRA else (o.plate or SP.get('plate'))) if T1 else None; HOSTN = o.host_name or SP.get('host') or 'ama'; CLIP = o.clip or SP.get('clip') or 'ga4_talk_natural'
import os as _o, sys as _s; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), '..', '..')); from teach.registry import check as _chk  # 1 bộ nhân vật 2D (characters.json)
_chk(HOSTN, [CLIP])
CTA = SP.get('cta') or None
def F(kind, size): return ImageFont.truetype(f"{o.fonts}/{FONTS[kind]}", size)
def nrm(w): return re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'")).strip("'")

# ------------------------------------------------------------------ voice: wav + word times per line
def wav_dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]))
def align_words(wav, words, snap=0.25):
    """audio cross-check of the whisper word times (captions must be within CAPTION.sync_ms of the voice): speech onsets in the line's own wav
    (10 ms RMS, after >= 120 ms of silence, or the file start) are matched to the nearest word start within +-snap s; a matched word start is SNAPPED to
    the measured onset (whisper drifts at phrase starts). Returns [{w, whisper, onset, d_raw}] (unmatched onsets: w=None) -> qc align_audio."""
    x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', wav, '-f', 'f32le', '-ac', '1', '-ar', '16000', '-']), np.float32)
    hop, win = 160, 320; n = max(1, (len(x) - win) // hop)
    db = np.array([20 * np.log10(np.sqrt(np.mean(x[i * hop:i * hop + win] ** 2)) + 1e-9) for i in range(n)]); thr = max(-50.0, db.max() - 32)
    on, sil, out = db > thr, 12, []
    run = sil
    for i in range(n):
        if not on[i]: run += 1; continue
        if run >= sil:
            to = i * hop / 16000; j = min(range(len(words)), key=lambda q: abs(words[q]['s'] - to)); d = words[j]['s'] - to
            if abs(d) <= snap and (j == 0 or words[j - 1]['s'] < to - 0.03) and (j == len(words) - 1 or words[j + 1]['s'] > to + 0.03):
                out.append(dict(w=words[j]['w'], whisper=round(words[j]['s'], 3), onset=round(to, 3), d_raw=round(d, 3)))
                words[j]['s'] = round(to, 3); words[j]['e'] = max(words[j]['e'], words[j]['s'] + 0.05)
                if j > 0 and words[j - 1]['e'] > to: words[j - 1]['e'] = max(words[j - 1]['s'] + 0.03, round(to - 0.01, 3))
            else: out.append(dict(w=None, whisper=None, onset=round(to, 3), d_raw=None))
        run = 0
    return out
GAP_PART = 0.14
def merge_parts(lid):
    """A: <lid>.wav/.words.json/.json = its parts back to back (GAP_PART s apart). segs = [{who, id, t0, t1, cues (part-relative), lipsrc}] -> scene lip-sync"""
    sig, words, segs, t = [], [], [], 0.0
    for k, pid in enumerate(PARTS[lid]):
        x = np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', f'{o.vo}/{pid}.wav', '-f', 'f32le', '-ac', '1', '-ar', '24000', '-']), np.float32)
        if k: sig.append(np.zeros(int(GAP_PART * 24000), np.float32)); t += GAP_PART
        cj = json.load(open(f'{o.vo}/{pid}.json')); d = len(x) / 24000
        words += [dict(w=w['w'], s=round(w['s'] + t, 3), e=round(w['e'] + t, 3)) for w in json.load(open(f'{o.vo}/{pid}.words.json'))['words']]
        segs.append(dict(who=WHO.get(pid), id=pid, t0=round(t, 3), t1=round(t + d, 3), cues=cj.get('mouthCues'), lipsrc=cj.get('generator'))); sig.append(x); t += d
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', '24000', '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', f'{o.vo}/{lid}.wav'], input=np.concatenate(sig).tobytes(), check=True)
    json.dump(dict(words=words), open(f'{o.vo}/{lid}.words.json', 'w'))
    json.dump(dict(segs=segs, generator='parts:' + ','.join(sorted({str(x['lipsrc']) for x in segs}))), open(f'{o.vo}/{lid}.json', 'w'))
class Line:
    def __init__(s, lid):
        s.id, s.text = lid, TEXT[lid]; toks = s.text.split()
        if o.fake_vo:
            s.words = [dict(w=w, s=0.15 + 0.34 * i, e=0.15 + 0.34 * i + 0.3) for i, w in enumerate(toks)]; s.dur = s.words[-1]['e'] + 0.2; s.wav = None; s.cues = None; s.lipsrc = None
        else:
            if lid in PARTS: merge_parts(lid)
            s.wav = f'{o.vo}/{lid}.wav'; s.dur = wav_dur(s.wav); s.words = json.load(open(f'{o.vo}/{lid}.words.json'))['words']
            cj = json.load(open(f'{o.vo}/{lid}.json')) if os.path.exists(f'{o.vo}/{lid}.json') else {}
            s.cues = cj.get('mouthCues'); s.lipsrc = cj.get('generator') or ('rhubarb' if (cj.get('metadata') or {}).get('soundFile') else None)
        s.segs = cj.get('segs') or [dict(who=WHO.get(lid), id=lid, t0=0.0, t1=s.dur, cues=s.cues, lipsrc=s.lipsrc)] if not o.fake_vo else [dict(who=WHO.get(lid), id=lid, t0=0.0, t1=s.dur, cues=None, lipsrc=None)]
        s.align = align_words(s.wav, s.words) if (s.wav and LOC) else []
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
CD = dict(lead=0.35, n=3, step=1.0, hold=1.6) if LOC else None   # v4 quiz: 3-2-1 ring countdown after the quiz line, then the answer reveal (held >= 1.4 s)
if CD: EXTRA['e'] = CD['lead'] + CD['n'] * CD['step'] + CD['hold'] - 0.38   # 0.38 = GAP (already part of every beat's hold)
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

BRAND_CACHE = {}
def svg_raster(svg, h):
    """brand SVG -> RGBA at height h (rendered at 2x, Lanczos down = crisp). rsvg-convert on CI (librsvg2-bin + the brand font installed), ImageMagick locally."""
    import tempfile, shutil
    if 'xmlns=' not in svg[:300]: svg = svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ', 1)   # Kit.svg() is inline-HTML SVG (no namespace)
    with tempfile.TemporaryDirectory() as td:
        sp_, pp_ = f'{td}/a.svg', f'{td}/a.png'; open(sp_, 'w').write(svg)
        if shutil.which('rsvg-convert'): subprocess.run(['rsvg-convert', '-h', str(2 * h), '-o', pp_, sp_], check=True)
        elif __import__('importlib.util').util.find_spec('resvg_py'):   # local fallback (bundled renderer, brand fonts dir)
            import resvg_py
            m_ = re.search(r'<svg[^>]*?width="([\d.]+)"[^>]*?height="([\d.]+)"', svg); k_ = 2 * h / float(m_.group(2))
            svg2 = svg.replace(m_.group(0), m_.group(0).replace(f'width="{m_.group(1)}"', f'width="{float(m_.group(1)) * k_:.1f}"').replace(f'height="{m_.group(2)}"', f'height="{2 * h}"'), 1)
            open(pp_, 'wb').write(bytes(resvg_py.svg_to_bytes(svg_string=svg2, font_dirs=[o.fonts])))
        elif shutil.which('magick'): subprocess.run(['magick', '-background', 'none', '-density', '600', sp_, '-resize', f'x{2 * h}', pp_], check=True)
        else: sys.exit('no SVG rasterizer (apt librsvg2-bin): brand assets are rasterized from their SVG source, never redrawn (docs/BRAND-RULES.md)')
        im = Image.open(pp_).convert('RGBA'); im.load()
    return im.resize((max(1, round(im.width * h / im.height)), h), Image.LANCZOS)
def brand_png(kind, h):
    """kit = Kit 'cheer' from web/js/kit.js (the ONLY Kit source) · logo = brand/lexkite-logo-dark.svg · mark = brand/lexkite-mark-mono.svg in white (watermark)"""
    if (kind, h) in BRAND_CACHE: return BRAND_CACHE[(kind, h)]
    if kind == 'kit':
        svg = subprocess.check_output(['node', '-e', "const vm=require('vm'),fs=require('fs');const c={};vm.runInNewContext(fs.readFileSync(process.argv[1],'utf8'),{self:c});process.stdout.write(c.Kit.svg('cheer',512,false))",
                                       f'{ROOT}/web/js/kit.js'], text=True)
    elif kind == 'logo': svg = open(f'{ROOT}/brand/lexkite-logo-dark.svg').read()
    else: svg = open(f'{ROOT}/brand/lexkite-mark-mono.svg').read().replace('#0F3D3E', '#FFFFFF')
    BRAND_CACHE[(kind, h)] = svg_raster(svg, h); return BRAND_CACHE[(kind, h)]
def watermark():
    """BRAND-RULES 'Watermark video': white kite mark + wordmark 'lexkite' (Bricolage ExtraBold), 40 px, soft shadow; opacity applied at composite"""
    mk = brand_png('mark', 40); f = F('display', 44); tw = int(f.getlength('lexkite')) + 4; pad = 10
    im = Image.new('RGBA', (mk.width + 8 + tw + 2 * pad, 40 + 2 * pad), (0, 0, 0, 0)); im.alpha_composite(mk, (pad, pad))
    ImageDraw.Draw(im).text((pad + mk.width + 8, pad + 20), 'lexkite', font=f, fill=(255, 255, 255, 255), anchor='lm')
    a = np.asarray(im)[..., 3]; sh = Image.fromarray((a * 0.45).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4))
    out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out.putalpha(sh); out = Image.alpha_composite(out, im); return out, pad

# ------------------------------------------------------------------ element engine
ELS = []
class El:
    def __init__(s, id, img, x, y, grp, t_in, t_out=None, enter='rise', d_in='base', exit='fade', d_out='fast', parent=None, z=5, text=None, fs=None, dim=None, inset=0,
                 bounce=None, dyn=None, dyn_until=None):
        s.__dict__.update(inset=inset, id=id, img=img, x=int(x), y=int(y), grp=grp, t_in=round(t_in, 3), t_out=None if t_out is None else round(t_out, 3), enter=enter, d_in=d_in,
                          exit=exit, d_out=d_out, parent=parent, z=z, text=text, fs=fs, dim=dim, bounce=bounce, dyn=dyn, dyn_until=dyn_until)
        ELS.append(s)
    def state(s, t):
        """alpha, dx, dy, scale, wipe fraction, moving-group tag (None = static). Tag = the beat that owns the running tween:
        enter -> own group, dim -> the beat that dims it, exit -> 'out@<t>' (all exits of one beat end share one tag)"""
        if t < s.t_in: return 0, 0, 0, 1, 0, None
        p = min(1.0, (t - s.t_in) / DUR[s.d_in]); e = bezier(EASE['out'], p); a, dx, dy, sc, wp = 1.0, 0.0, 0.0, 1.0, 1.0; mv = s.grp if p < 1 and s.enter != 'none' else None
        if s.enter == 'spring': dx = TRAVEL['slide'] * (1 - bezier(EASE['spring'], p)); a = e   # one overshoot past the slot, then settles (alpha on the plain out curve)
        elif s.enter == 'rise': dy = TRAVEL['rise'] * (1 - e); a = e
        elif s.enter == 'slide': dx = TRAVEL['slide'] * (1 - e); a = e
        elif s.enter == 'fade': a = e
        elif s.enter == 'pop': sc = 0.8 + 0.2 * e; a = e
        elif s.enter == 'wipe': wp = e
        if s.dyn_until is not None and s.t_in <= t < s.dyn_until: mv = mv or s.grp      # animated content (countdown ring) = this group is moving
        if s.bounce is not None and t >= s.bounce:
            q = (t - s.bounce) / DUR['slow']
            if q < 1: dy -= BOUNCE * math.sin(math.pi * bezier(EASE['out'], q)); mv = s.grp   # a vertical hop (a scale-up would push the left card out of the safe area)
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
        tw = [dict(kind=s.enter, dur=s.d_in, ease='spring' if s.enter == 'spring' else 'out')] if s.enter != 'none' else []
        if s.bounce is not None: tw.append(dict(kind='bounce', dur='slow', ease='out'))
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
def words_block(id, txt, size, kind, x, y, maxw, grp, line, t_out, color=None, hi=(), hi_col=C['red'], parent=None, reveal='rise', align='left', karaoke=False, after=None, z=6):
    """kinetic sentence: one element per word, each appears at its spoken time (fallback: the previous word's time). hi = words drawn in hi_col.
    Returns (bottom y, {word index: (x, y, w, h)}) - positions in absolute px."""
    color = INK if color is None else color
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
                El(f'{id}.w{k}.dim', text_img(w_, size, kind, (120, 170, 168)), xx - 2, y + r * lh, grp, after, t_out, enter='fade', d_in='base', parent=parent, z=z, text=w_, fs=size)
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

INK = C['white']; SUB = C['mint']; CARD = V5['card']
STAGE = V5['stage_top']   # v5: B = top stage above the host head (1024); A = per beat (ST): speaking beats use the low stage under the faces
LOW_BEATS = ('h', 'm', 'g', 'k', 'rn') if DIRA else ()
def ST(k): global STAGE; STAGE = V5['stage_low'] if k in LOW_BEATS else V5['stage_top']; return STAGE
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
PY = 320 if LOC else 240
WM_W = 260 if LOC else 0   # 1b: the watermark (kite mark + 'lexkite', 40 px, BRAND-RULES 'Watermark video') owns the top-left of the series row
El('progress.track', bar(FULL, 10, INK, 40), X0, PY, 'h', B0, None, enter='fade', d_in='base', z=1)
PROG = Image.new('RGBA', (FULL, 10)); ImageDraw.Draw(PROG).rounded_rectangle((0, 0, FULL - 1, 9), 5, fill=C['red'] + (255,))
SER_T = f"{SP['series'][0]}  ·  {FORM}"
if F('head', TYPE['label']).getlength(SER_T) + 56 > FULL - WM_W: SER_T = SP['series'][0]   # long formula -> chip keeps only the series (formula card still shows it)
SER = chip(SER_T, C['navy'] if T1 else C['cream'], C['cream'] if T1 else C['navy'])
El('series', SER, (SAFE['x1'] - SER.width) if LOC else X0, 232 if LOC else 280, 'h', B0, None, enter='fade', d_in='base', z=2, text=SER_T.replace('  ', ' '), fs=TYPE['label'])

# hook ------------------------------------------------------------
b = BEAT['h']; ln = L['h']; g = 'h'; ST('h')
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
y2, bx = words_block('h.t1', HT, hs1, 'display', X0, y, FULL, g, None, b['vout'], color=C['yellow'], align='center', after=b['vin'])
tq = ln.words[-1]['s'] + ln.at
y3, bx2 = words_block('h.t2', f'“{HQ}”', hs2, 'display', X0, y2 + 16, FULL, g, None, b['vout'], color=C['green'] if SOFT else C['white'],   # v5: red type on dark glass read weak -> white quote, the red underline marks the error
 align='center', after=b['vin'])
if not SOFT:   # underline the error words inside the quote ('is change'), one bar per text row, when the voice says 'this'
    ui = hq_under(HQ, SP['wrong_line'], SP['key_line'], 'strong'); rows_ = {}
    for k_ in ui:
        if k_ in bx2: rows_.setdefault(round(bx2[k_][1]), []).append(bx2[k_])
    for r_, bs in enumerate(rows_.values()):
        u0 = min(bs, key=lambda v: v[0]); u1 = max(bs, key=lambda v: v[0] + v[2])
        El(f'h.under{r_}', bar(int(u1[0] + u1[2] - u0[0]), 10, C['red']), u0[0], u0[1] + u0[3] - 12, g, tq + DUR['fast'], b['vout'], enter='wipe', d_in='base', z=8)

# wrong / guess / right: one comparison zone (x card fixed, the slot under it is the guess row, then the v card) ------------
CARD_PAD, BD = (24, 64) if DIRA else (32, 72); ST('m')
LAB_S = TYPE['label'] if DIRA else TYPE['body']
inner = FULL - 2 * CARD_PAD - BD - 24
lab_h = int(LAB_S * LEAD) + 16
for sz in ((TYPE['h2'], TYPE['body'], TYPE['label']) if DIRA else (TYPE['h2'], TYPE['body'])):   # 1b v4: the bigger host leaves a 560 px stage -> long sentences step down ONE type size (never fewer words)
    hx = measure(endp(wrong), sz, 'head', inner) + 2 * CARD_PAD; hv = measure(endp(right), sz, 'head', inner) + 2 * CARD_PAD
    zone_h = ih + lab_h + hx + 32 + max(hv, measure('What sounds better?', sz, 'head', FULL - BD - 24) + 24 + 28)
    if zone_h <= STAGE[1] - STAGE[0]: break
zy = stage_y(zone_h); bm, bg_, bk = BEAT['m'], BEAT['g'], BEAT['k']
zy = place_icon('m', zy, bm['vin'], bk['vout'], 'm')
ln = L['m']
words_block('m.lab', 'Many learners say:', LAB_S, 'body', X0, zy, FULL, 'm', ln, bg_['vout'], color=SUB)
cy = zy + lab_h; tx = ln.t(wt[0])
card, pad = rrect(FULL, hx, 32, CARD, outline=C['red'])
xc = El('m.card', card, X0 - pad, cy - pad, 'm', tx - 0.15, bk['vout'], enter='spring' if LOC else 'slide', d_in='slow' if LOC else 'base', z=3, dim=(bk['vin'], 0.5 if T1 else 0.6, 'k'), inset=pad)
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
    El(f'g.dot{i}', bar(28, 28, C['yellow']), X0 + BD + 24 + i * 52, max(slot + int(sz * LEAD) + 24, snap(gy1 + 16)), 'g', tdots + i * 0.4, bg_['vout'], enter='fade', d_in='fast', z=6)
TICKS = [tdots + i * 0.4 for i in range(3)]
# right card
ln = L['k']; tr = ln.t(rt[0])
card, pad = rrect(FULL, hv, 32, CARD, outline=C['green'])
T_K = tr
vc = El('k.card', card, X0 - pad, slot - pad, 'k', tr - 0.15, bk['vout'], enter='spring' if LOC else 'slide', d_in='slow' if LOC else 'base', z=3, inset=pad)
El('k.badge', badge('v', BD), X0 + CARD_PAD, slot + CARD_PAD, 'k', tr - 0.15, None, enter='none', parent=vc, z=7)
_, vb = words_block('k.s', endp(right), sz, 'head', X0 + CARD_PAD + BD + 24, slot + CARD_PAD - 4, inner, 'k', ln, None, hi=GOOD, hi_col=C['green'], parent=vc, reveal='fade', after=tr)
gi = [k for k, v in vb.items() if nrm(rt[k]) in {nrm(x) for x in GOOD}] if len(vb) == len(rt) else []
if gi:
    u0, u1 = vb[gi[0]], vb[gi[-1]]
    El('k.under', bar(int(u1[0] + u1[2] - u0[0]), 10, C['green']), u0[0], u0[1] + u0[3] - 10, 'k', u1[4] + DUR['fast'], None, enter='wipe', d_in='base', parent=vc, z=8)

# why: rule chip + formula + spoken sentence ---------------------------------
b = BEAT['y']; ln = L['y']; g = 'y'; ST('y')
fparts = FORM.split(' + ', 1) if ' + ' in FORM else [FORM, '']   # v5 fix: 'HAS + it + CHANGED?' showed only 'HAS + it'
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
b = BEAT['rn']; ln = L['rn']; g = 'rn'; ST('rn')
sz3 = TYPE['h2'] if DIRA else TYPE['h1']   # A: the low stage under the faces is 360 px (3 rows of h1 ran into the caption band)
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
b = BEAT['r2']; ln = L['r2']; g = 'r2'; ST('r2')
rs = TYPE['body']; rw = FULL - 64 - 24
hrows = [measure(r_, rs, 'head', rw) for r_ in ROWS]
h_ = ih + 72 + 32 + sum(hrows) + 24 * (len(ROWS) - 1)
y = stage_y(h_); y = place_icon('r2', y, b['vin'], b['vout'], g)
tc_ = chip("TEACHER'S TIP", C['yellow'], C['navy']); El('r2.chip', tc_, X0 + (FULL - tc_.width) // 2, y, g, ln.t("Teacher's") - 0.05, b['vout'], enter='fade', d_in='base', text="TEACHER'S TIP", fs=TYPE['label'])
y += 72 + 32; t0 = ln.t('save')
ingw = {nrm(w_) for w_ in GOOD} if 'quiz' in SP else {nrm(w_) for r_ in ROWS for w_ in r_.split() if nrm(w_).endswith('ing') and nrm(w_) not in ('considering',)}
for i, r_ in enumerate(ROWS):
    ti = t0 + i * DUR['fast']
    rowp = El(f'r2.row{i}', badge(f'n{i + 1}', 64, bg=C['yellow']), X0, y + (int(rs * LEAD) - 64) // 2, g, ti, b['vout'], enter='rise' if LOC else 'slide', d_in='base', z=6)   # 1b: rise (a slide from the right pushed long rows past the safe edge on the first entry frame)
    f = F('head', rs); sp = f.getlength(' '); yy = y; j = 0
    for r, ws in enumerate(wrap(r_.split(), f, rw)):
        xx = X0 + 64 + 24; yy = y + r * int(rs * LEAD)
        for w_ in ws:
            El(f'r2.row{i}.w{j}', text_img(w_, rs, 'head', C['yellow'] if nrm(w_) in ingw else INK), xx - 2 - rowp.x, yy - rowp.y, g, ti, None, enter='none', parent=rowp, z=6, text=w_, fs=rs)
            xx += f.getlength(w_) + sp; j += 1
    y = yy + int(rs * LEAD) + 24
TICKS += [t0 + i * DUR['fast'] for i in range(len(ROWS))]
for e_ in ELS:   # row words ride on their badge element (relative coords)
    if e_.parent is not None and e_.id.startswith('r2.row') and '.w' in e_.id: e_.x += e_.parent.x; e_.y += e_.parent.y

# quiz ------------------------------------------------------------------
b = BEAT['e']; ln = L['e']; g = 'e'; ST('e')
qs = TYPE['h2']; qtxt = endp(f'{Q_PRE} _____ {Q_POST}') if Q_POST else f'{Q_PRE} _____.'
STACK = max(F('head', TYPE['body']).getlength(x) for x in (QA, QB)) > span(0, 5) - 128   # long options -> two full-width rows (never below 48 px)
RING = 120
for qs in (TYPE['h2'], TYPE['body']):   # same rule: one type step down when the quiz does not fit the stage
    h_ = ih + 72 + 24 + measure(qtxt, qs, 'head', FULL) + 40 + 112 + (112 + 24 if STACK else 0) + 40 + (RING if CD else int(TYPE['label'] * LEAD))
    if h_ <= STAGE[1] - STAGE[0]: break
y = stage_y(h_); y = place_icon('e', y, b['vin'], b['vout'], g)
qc = chip('QUIZ', C['red'], C['white']); El('e.chip', qc, X0 + (FULL - qc.width) // 2, y, g, b['vin'], b['vout'], enter='fade', d_in='base', text='QUIZ', fs=TYPE['label'])
y += 72 + 24
y_, qb = words_block('e.s', qtxt, qs, 'head', X0, y, FULL, g, ln, b['vout'], color=INK, align='center', after=ln.t(Q_PRE.split()[0]))
y = snap(y_ + 40)
t_opt = ln.t('blank'); OPTS = []
for i, (lab, opt, wd) in enumerate([('A', QA.lower(), QA), ('B', QB, QB.split()[0] + ' ' + QB.split()[1] if ' ' in QB else QB)]):
    ow = FULL if STACK else span(0, 5); im, pad = rrect(ow, 112, 28, CARD, shadow=True)
    ofs = TYPE['body']
    dd = ImageDraw.Draw(im); dd.ellipse((pad + 20, pad + 24, pad + 84, pad + 88), fill=C['yellow'] + (255,)); dd.text((pad + 52, pad + 57), lab, font=F('head', 44), fill=C['navy'] + (255,), anchor='mm')
    dd.text((pad + 108, pad + 56), opt, font=F('head', ofs), fill=C['white'] + (255,), anchor='lm')
    to = ln.t(wd.rstrip('?,').split()[0].rstrip(','), after=t_opt + 0.01); t_opt = to
    OPTS.append(El(f'e.opt{i}', im, (X0 if STACK else col(0 if i == 0 else 6)) - pad, y - pad + (i * (112 + 24) if STACK else 0), g, to - 0.05, b['vout'], enter='rise', d_in='base', z=6, text=f'{lab} {opt}', fs=ofs, inset=pad))
    TICKS.append(to)
y += 112 + (112 + 24 if STACK else 0) + 40; tcm = ln.t('Comment')
CD_T = []
if CD:   # v4: 'Comment your answer' + a 3-2-1 countdown ring in the same row, then the answer reveal (correct option bounces + green check, the other dims)
    lf_ = F('head', TYPE['label']); lw_ = int(lf_.getlength('Comment your answer')) + 8; x_ = X0 + (FULL - (lw_ + 32 + RING)) // 2
    words_block('e.cta', 'Comment your answer', TYPE['label'], 'head', x_, y + (RING - int(TYPE['label'] * LEAD)) // 2, lw_, g, None, b['vout'], color=SUB, reveal='fade', after=tcm)
    T_CD = ln.at + ln.end + CD['lead']; T_REV = round(T_CD + CD['n'] * CD['step'], 3); CD_T = [T_CD + i * CD['step'] for i in range(CD['n'])]
    def ring_img(t, d=RING, ss=4):
        el = max(0.0, t - T_CD); D = d * ss; im = Image.new('RGBA', (D, D), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); lw = int(D * 0.09)
        dr.ellipse((0, 0, D - 1, D - 1), fill=CARD + (255,)); dr.ellipse((lw // 2, lw // 2, D - 1 - lw // 2, D - 1 - lw // 2), outline=C['mint'] + (255,), width=lw)
        fr_ = max(0.0, 1 - el / (CD['n'] * CD['step']))
        if fr_ > 0: dr.arc((lw // 2, lw // 2, D - 1 - lw // 2, D - 1 - lw // 2), -90, -90 + 360 * fr_, fill=C['red'] + (255,), width=lw)
        n_ = max(1, CD['n'] - int(el // CD['step'])); q_ = min(1.0, (el % CD['step']) / DUR['fast']) if el > 0 else 1.0
        dr.text((D / 2, D / 2 + D * 0.03), str(n_), font=F('display', int(D * 0.5 * (1 + 0.25 * (1 - bezier(EASE['out'], q_))))), fill=C['white'] + (255,), anchor='mm')
        return im.resize((d, d), Image.LANCZOS)
    El('e.ring', ring_img(T_CD), x_ + lw_ + 32, y, g, T_CD, T_REV - DUR['fast'], enter='pop', d_in='base', d_out='fast', z=7, dyn=ring_img, dyn_until=T_REV - DUR['fast'])
    ANS = int(SP['quiz'].get('answer', 0)) if 'quiz' in SP else 0; oc = OPTS[ANS]; ow_, oh_ = oc.img.width - 2 * oc.inset, oc.img.height - 2 * oc.inset
    ok_ = Image.new('RGBA', oc.img.size, (0, 0, 0, 0)); d_ = ImageDraw.Draw(ok_); p_ = oc.inset
    d_.rounded_rectangle((p_ - 4, p_ - 4, p_ + ow_ + 3, p_ + oh_ + 3), 32, outline=C['green'] + (255,), width=8)
    ok_.alpha_composite(badge('v', 64), (p_ + ow_ - 64 - 24, p_ + (oh_ - 64) // 2))
    oc.bounce = T_REV
    El('e.ok', ok_, oc.x, oc.y, g, T_REV, b['vout'], enter='pop', d_in='base', z=8, inset=oc.inset, bounce=T_REV)   # hops with its option
    OPTS[1 - ANS].dim = (T_REV, 0.4, g)
else:
    words_block('e.cta', 'Comment your answer', TYPE['label'], 'head', X0, y, FULL, g, None, b['vout'], color=SUB, align='center', reveal='fade', after=tcm)

# share / end card --------------------------------------------------------
b = BEAT['s']; ln = L['s']; g = 's'; ST('s')
END_OUT = b['vout'] if CTA else None    # tpl 1b: the end card clears -> last frame = frame-0 look (plate + host only) = seamless loop
if CTA and LOC:   # v4 end card: Kit (web/js/kit.js) + the Lexkite logo (brand/lexkite-logo-dark.svg) · spoken line · 'Practise this in the app ->' button · deep link
    ct = CTA['text']; i_on = ct.lower().rfind(' on lexkite.com'); c1 = ct[:i_on] if i_on > 0 else ct
    kit_ = brand_png('kit', 128); logo_ = brand_png('logo', 96)
    row_ = Image.new('RGBA', (kit_.width + 24 + logo_.width, max(kit_.height, logo_.height)), (0, 0, 0, 0)); row_.alpha_composite(kit_, (0, (row_.height - kit_.height) // 2)); row_.alpha_composite(logo_, (kit_.width + 24, (row_.height - logo_.height) // 2))
    BTN_T = 'Practise this in the app'; bf_ = F('head', TYPE['label']); tw_ = int(bf_.getlength(BTN_T)); bw_ = tw_ + 2 * 44 + 56
    btn_ = Image.new('RGBA', (bw_ * 4, 416), (0, 0, 0, 0)); d_ = ImageDraw.Draw(btn_); d_.rounded_rectangle((0, 0, bw_ * 4 - 1, 415), 208, fill=C['red'] + (255,))
    ax_ = (44 + tw_ + 20) * 4; d_.line((ax_, 208, ax_ + 120, 208), fill=(255, 255, 255, 255), width=26); d_.polygon([(ax_ + 150, 208), (ax_ + 84, 152), (ax_ + 84, 264)], fill=(255, 255, 255, 255))
    btn_ = btn_.resize((bw_, 104), Image.LANCZOS); ImageDraw.Draw(btn_).text((44, 54), BTN_T, font=bf_, fill=C['white'] + (255,), anchor='lm')   # vector arrow (the brand fonts have no U+2192)
    LINK_T = CTA['link'].replace('https://', '')
    for hs_ in (TYPE['h1'], TYPE['h2']):
        h_ = row_.height + 24 + measure(c1, hs_, 'display', FULL) + 24 + 104 + 12 + int(TYPE['label'] * LEAD)
        if h_ <= STAGE[1] - STAGE[0]: break
    y = stage_y(h_)
    El('s.brand', row_, X0 + (FULL - row_.width) // 2, y, g, b['vin'], END_OUT, enter='pop', d_in='base', z=6)
    y_, _ = words_block('s.t', c1, hs_, 'display', X0, y + row_.height + 24, FULL, g, ln, END_OUT, color=INK, align='center')
    tb_ = ln.last() + DUR['fast']
    El('s.link', btn_, X0 + (FULL - bw_) // 2, y_ + 24, g, tb_, END_OUT, enter='pop', d_in='base', text=BTN_T, fs=TYPE['label'], z=7)
    words_block('s.url', LINK_T, TYPE['label'], 'head', X0, y_ + 24 + 104 + 12, FULL, g, None, END_OUT, color=C['mint'], align='center', reveal='fade', after=tb_)
elif CTA:
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
PLATE_LOG = None; PERSP = None
if PLATE_N:   # 1b plate: loaded here, placed AFTER the host transform is known (horizon -> host eye line, see setup_plate)
    import cv2
    pm = PLATES.get(PLATE_N) or sys.exit(f'plate {PLATE_N} not in tokens.PLATES (human-checked clean plates only)')
    SRC_PLATE = cv2.imread(f'{o.lib}/bg/{PLATE_N}.png')[..., ::-1].astype(np.float32)
    BG = None
elif T1 and not DIRA:
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
RIM = None
def rim_light(rgb, M):
    """v5 B: rim light = the silhouette edge facing the plate's light side, tinted with the plate highlight (host and scene share one light)"""
    import cv2
    d = RIM['dx']; sh = np.zeros_like(M)
    if d > 0: sh[:, d:] = M[:, :-d]
    else: sh[:, :d] = M[:, -d:]
    w = cv2.GaussianBlur(np.clip(M - sh, 0, 1), (0, 0), 3.0) * M * V5['b_flat']['rim']
    return rgb + (RIM['col'][None, None] - rgb) * w[..., None]
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
            if PLATE_N and RIM: rgb_ = rim_light(rgb_, M)
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
def host_comp(base, rgb, m, msh=None):
    """fixed transform: the (already scaled) layer is pasted at (HDX, HDY), clipped to the frame; soft contact shadow from the same alpha, fixed offset
    (msh = the un-swayed matte the shadow is cached on: the 0.35 deg idle sway never re-blurs the shadow)"""
    lh, lw = m.shape
    sx0, sy0, dx0, dy0 = max(0, -HDX), max(0, -HDY), max(0, HDX), max(0, HDY)
    w, h = min(lw - sx0, W - dx0), min(lh - sy0, H - dy0)
    a = np.zeros((H, W), np.float32); a[dy0:dy0 + h, dx0:dx0 + w] = m[sy0:sy0 + h, sx0:sx0 + w]
    ms = m if msh is None else msh; sh = HOST_SH_CACHE.get(id(ms))
    if sh is None:
        a2 = np.zeros((H, W), np.float32); a2[dy0:dy0 + h, dx0:dx0 + w] = ms[sy0:sy0 + h, sx0:sx0 + w]
        import cv2; sh = cv2.GaussianBlur(a2, (0, 0), 26) * (V5['b_flat']['shadow'] if PLATE_N else 0.22)
        ox = -2 * (RIM['dx'] if RIM else -9); s_ = np.zeros_like(sh)
        if ox >= 0: s_[16:, ox:] = sh[:-16, :W - ox]
        else: s_[16:, :ox] = sh[:-16, -ox:]   # v5 B: the whole silhouette casts a soft shadow on the backdrop, away from the plate light
        sh = s_; HOST_SH_CACHE.clear(); HOST_SH_CACHE[id(ms)] = sh
    base = base * (1 - sh[..., None]) + (SH_COL if PLATE_N else np.array(C['navy'], np.float32)) * sh[..., None]
    reg = base[dy0:dy0 + h, dx0:dx0 + w]; aa = a[dy0:dy0 + h, dx0:dx0 + w, None]
    base[dy0:dy0 + h, dx0:dx0 + w] = reg * (1 - aa) + rgb[sy0:sy0 + h, sx0:sx0 + w] * aa
    return base
HOST_SH_CACHE = {}
host = Host() if (T1 and not DIRA and (not o.fake_vo or o.local_host) and not o.host_still) else None
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
    SL['waist'] = round(HDY + lm['waist'] * HSC, 1)   # waist-up: the waist is at the frame edge -> the source waist row through the SAME transform
    HOST_HEAD = dict(src=lm, scale=HSC, x=HDX, y=HDY, ext_rows=int(round(HEXT * HSC)), ext_src_rows=HEXT, screen=SL, std=HF.check(SL, HOST_LOCK, int(round(HEXT * HSC))),
                     shoulder_w=SL['shoulder_w'], top=SL['top'], cx=SL['cx'], crop=SL['hands'], head=round((lm['neck'] - lm['top']) * HSC, 1))
    m0 = scr[0][0]; side = (m0[:, max(0, HDX + FE)] > 0.5) | (m0[:, min(W - 1, HDX + lw_ - FE - 1)] > 0.5); body = (m0 > 0.5).any(1)
    HOST_HEAD.update(side_cut_rows=int(side.sum()), host_rows=int(body.sum()), bottom=SL['layer_bottom'])   # qc_tpl host_frame gate
    print('host frame', HOSTN, json.dumps(HOST_HEAD))
LIPSYNC = None
if host is not None:   # real host on screen -> every spoken line needs Rhubarb cues (no silent estimate; CI fails here when Rhubarb is missing)
    LIPSYNC = dict(lines={k: L[k].lipsrc for k in SEQ}, missing=[k for k in SEQ if not L[k].cues])
    if not o.local_host and (LIPSYNC['missing'] or any(not str(v or '').startswith('rhubarb') for v in LIPSYNC['lines'].values())):
        sys.exit(f"lip-sync: Rhubarb cues missing/unverified for {LIPSYNC['missing'] or LIPSYNC['lines']} – run scripts/cine/news_voice.py with RHUBARB")
if DIRA and not o.fake_vo:
    segs_ = {sg['id']: sg for k in SEQ for sg in L[k].segs if sg['who'] in ('ama', 'mei')}
    LIPSYNC = dict(lines={i: sg['lipsrc'] for i, sg in segs_.items()}, missing=[i for i, sg in segs_.items() if not sg.get('cues')], on_camera=sorted(segs_))
    if LIPSYNC['missing'] or any(not str(v or '').startswith('rhubarb') for v in LIPSYNC['lines'].values()) or not segs_:
        sys.exit(f"lip-sync: Rhubarb cues missing/unverified for on-camera parts {LIPSYNC}")
EYE_Y = (HDY + (lm['top'] + HOSTS.get(HOSTN, {}).get('eye', 0.55) * (lm['neck'] - lm['top'])) * HSC) if HOST_HEAD else None
SWAY_P = None
def sway(t):
    """host idle sway (deg): whole periods per video -> sway(0) == sway(TOTAL) (loop), one sine = no jitter"""
    if not PLATE_N or host is None: return 0.0
    return SWAY['deg'] * math.sin(2 * math.pi * t / SWAY_P)
def sway_layer(rgb, m, th):
    import cv2; lh, lw = m.shape; M = cv2.getRotationMatrix2D((HOST_LOCK['cx'] - HDX, SWAY['pivot_y'] - HDY), th, 1.0)
    return (cv2.warpAffine(rgb, M, (lw, lh), flags=cv2.INTER_LANCZOS4, borderMode=cv2.BORDER_CONSTANT, borderValue=0),
            np.clip(cv2.warpAffine(m, M, (lw, lh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0), 0, 1))
if PLATE_N:
    SWAY_P = TOTAL / max(1, round(TOTAL / SWAY['period']))
    # ---- plate placement: zoom (<= max_zoom, never past the source resolution) + vertical offset so the plate horizon = the host's eye line
    E_ = EYE_Y if EYE_Y is not None else HOST_LOCK['top'] + 260
    ph, pw = SRC_PLATE.shape[:2]; kc = max(W / pw, H / ph) * (1 + PLATE['push']); hp = pm['horizon']; P1 = 1 + PLATE['push']
    zp = max(1.0, E_ * P1 / (hp * kc), (H - E_) * P1 / ((ph - hp) * kc)); zp = min(zp, PLATE['max_zoom'], 1 / kc)
    k0 = kc * zp
    PL = cv2.resize(SRC_PLATE, (int(round(pw * k0)), int(round(ph * k0))), interpolation=cv2.INTER_AREA)
    bf = V5['b_flat']; u8 = np.clip(PL, 0, 255).astype(np.uint8); sm = cv2.resize(u8, (u8.shape[1] // 2, u8.shape[0] // 2), interpolation=cv2.INTER_AREA)
    sm = cv2.pyrMeanShiftFiltering(np.ascontiguousarray(sm), bf['sp'], bf['sr']); u8 = cv2.resize(sm, (u8.shape[1], u8.shape[0]), interpolation=cv2.INTER_CUBIC)
    PL = cv2.GaussianBlur(u8.astype(np.float32), (0, 0), bf['blur'] * k0 / 0.72)          # flat cel-like shading = the same illustration language as the host
    lab = cv2.cvtColor(np.clip(PL, 0, 255).astype(np.uint8), cv2.COLOR_RGB2LAB).astype(np.float32)
    if host is not None:
        hm = host.MM[0] > 128; hlab = cv2.cvtColor(host.FR[0][..., ::-1].copy(), cv2.COLOR_RGB2LAB).reshape(-1, 3)[cv2.resize(hm.astype(np.uint8), (host.FR[0].shape[1], host.FR[0].shape[0])).reshape(-1) > 0].astype(np.float32)
        HOST_AB = hlab[:, 1:].mean(0); lab[..., 1:] += (HOST_AB - lab[..., 1:].reshape(-1, 2).mean(0)) * bf['chroma']   # plate chroma pulled toward the host palette
    lm_ = lab[..., 0].mean(); lab[..., 0] = lm_ + (lab[..., 0] - lm_) * bf['contrast']
    PL = cv2.cvtColor(np.clip(lab, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB).astype(np.float32)
    gy = np.clip((np.arange(PL.shape[0], dtype=np.float32) / PL.shape[0] - 0.78) / 0.22, 0, 1)[:, None, None]; PL = PL * (1 - 0.16 * gy)   # grounding: floor darkens under the host
    hw_ = PL.shape[1] // 2; Lh = [float(PL[: PL.shape[0] // 2, :hw_].mean()), float(PL[: PL.shape[0] // 2, hw_:].mean())]
    RIM = dict(dx=12 if Lh[0] >= Lh[1] else -12, col=np.clip(np.percentile(PL[: PL.shape[0] // 2].reshape(-1, 3), 92, axis=0) * 0.6 + np.array(C['cream'], np.float32) * 0.4, 0, 255).astype(np.float32))
    print('v5 plate: light from', 'left' if RIM['dx'] > 0 else 'right', 'rim', RIM['col'].round(1).tolist())
    host.cache.clear() if host is not None else None
    lum = 0.299 * PL[..., 0] + 0.587 * PL[..., 1] + 0.114 * PL[..., 2]; PL = lum[..., None] + (PL - lum[..., None]) * PLATE['sat']
    CREAM = np.array(C['cream'], np.float32); PL = (1 - PLATE['lift']) * PL + PLATE['lift'] * CREAM
    PL = np.clip(PL + (np.random.RandomState(7).rand(*PL.shape[:2], 1).astype(np.float32) - 0.5) * 1.6, 0, 255).astype(np.float32)
    PLH, PLW = PL.shape[:2]; hP = hp * k0; del lum
    def plate_geom(t):
        z = 1 + PLATE['push'] * min(1.0, t / TOTAL); sx = P1 / z; cw, ch = W * sx, H * sx
        return z, sx, (PLW - cw) / 2, min(max(hP - E_ * sx, 0.0), PLH - ch)
    PLB = cv2.GaussianBlur(PL, (0, 0), 14 * k0 / 0.72)   # frost layer under the text panel
    def plate_at(t, src_=None):
        """very slow linear push-in centred on the horizon point (= the host's eye line) – sub-pixel warp, no stepping"""
        z, sx, x0, y0 = plate_geom(t); M = np.array([[sx, 0, x0], [0, sx, y0]], np.float32)
        return cv2.warpAffine(PL if src_ is None else src_, M, (W, H), flags=cv2.INTER_LINEAR | cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REFLECT), round(z, 5)
    P0, _ = plate_at(0.0)
    reg_ = P0[int(H * 0.62):, int(W * 0.2):int(W * 0.8)].reshape(-1, 3).mean(0)
    HOST_GAIN = np.clip(1 + PLATE['host_match'] * (reg_ / reg_.mean() - 1), 0.94, 1.06).astype(np.float32)
    SH_COL = np.clip(reg_ * 0.35, 0, 255).astype(np.float32)                           # contact shadow = darkened plate tone (not navy)
    # ---- perspective log (qc host_perspective): horizon vs eye, host size vs the plate's reference object
    def scr_y(Y, t): z, sx, x0, y0 = plate_geom(t); return (Y * k0 - y0) / sx
    rn_, rt_, rb_, rm_ = pm['ref']; rts, rbs = scr_y(rt_, 0), scr_y(rb_, 0); ppm_ref = (rbs - rts) / rm_
    ppm_h = (HOST_HEAD['shoulder_w'] / SHOULDER_M) if HOST_HEAD else None
    PERSP = dict(eye=round(E_, 1), horizon=[round(scr_y(hp, 0), 1), round(scr_y(hp, TOTAL), 1)], zoom=round(zp, 4), src_scale=round(k0, 4),
                 ref=dict(name=rn_, top=round(rts, 1), bottom=round(rbs, 1), m=rm_, ppm=round(ppm_ref, 1), cam_h=round((rbs - scr_y(hp, 0)) / ppm_ref, 2)),
                 ppm_host=None if ppm_h is None else round(ppm_h, 1), ratio=None if ppm_h is None else round(ppm_h / ppm_ref, 2),
                 host_floor=None if ppm_h is None else round(E_ + EYE_M * ppm_h, 1), measured_by=pm.get('checked'))
    print('perspective', json.dumps(PERSP))
    PLATE_LOG = dict(name=PLATE_N, tags=pm['tags'], people=pm['people'], text=pm['text'], checked=pm['checked'], push=PLATE['push'], blur=PLATE['blur'], sat=PLATE['sat'],
                     host_gain=[round(float(x), 4) for x in HOST_GAIN], zoom=round(zp, 4),
                     faces=int(len(cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml').detectMultiScale(
                         cv2.cvtColor(SRC_PLATE.astype(np.uint8), cv2.COLOR_RGB2GRAY), 1.1, 10, minSize=(60, 60)))), lesson_topic=SP.get('topic'), lesson_area=SP.get('area'))
    del SRC_PLATE

# ------------------------------------------------------------------ A: native scene (characters generated INSIDE the scene; no cut-outs)
SCENE = None; SHOTS = []; CUTS = []; SPEAK = {}
if DIRA:
    import cv2
    sys.path.insert(0, f'{ROOT}/scripts/cine'); import lipsync as LSA
    SB = json.load(open(f'{o.scene}/bank.json')); USE = {c['id']: c.get('usable_segments') or [[0, 5]] for c in SB['clips']}
    WHOM = {'a01_ots_mei_talk': ['mei'], 'a03_ots_mei_talk_b': ['mei'], 'a02_ots_ama_talk': ['ama'], 'a04_ots_ama_talk_b': ['ama'], 'a06_ama_react': ['ama'],
            'a07_ama_mcu_talk': ['ama'], 'a08_mei_pass': ['mei'], 'a09_ama_thanks': ['ama'], 'b01_master_talk': ['mei', 'ama']}
    SPEAKER_CLIP = dict(ama=['a04_ots_ama_talk_b', 'a02_ots_ama_talk'], mei=['a03_ots_mei_talk_b', 'a01_ots_mei_talk'])
    VO_CLIPS = dict(h=['a04_ots_ama_talk_b'], m=['b01_master_talk'], g=['a01_ots_mei_talk', 'a06_ama_react'], k=['a06_ama_react'], y=['s01_printer', 'i02_scale', 'b01_master_talk'],
                    rn=['a07_ama_mcu_talk'], r2=['i01_passport', 's01_printer', 'i02_scale'], e=['i02_scale', 's01_printer', 'i01_passport', 'b01_master_talk'], s=['e02_exit'])
    for k in SEQ:   # who speaks when (absolute): on-camera parts drive that character's mouth; everyone else on screen keeps the mouth closed
        for sg in L[k].segs:
            if sg['who'] in ('ama', 'mei') and sg.get('cues'): SPEAK.setdefault(sg['who'], []).append(dict(cues=sg['cues'], at=L[k].at + sg['t0'], tempo=1.0))
    # shot plan: boundaries = speaker changes + phrase boundaries (word gaps) so no shot runs longer than V5.shot_max; quiz also cuts on countdown ticks
    bounds = []   # (t, reason, clip)
    vo_i = {}
    def vo_clip(k): i = vo_i.get(k, 0); vo_i[k] = i + 1; cl = VO_CLIPS[k]; return cl[i % len(cl)]
    sp_i = {}
    for j, k in enumerate(SEQ):
        t_beat = 0.0 if j == 0 else BEAT[SEQ[j - 1]]['end'] + 0.05
        segs = L[k].segs; first = True
        for q, sg in enumerate(segs):
            ts = t_beat if first else L[k].at + sg['t0'] - 0.12; first = False
            on = sg['who'] in ('ama', 'mei')
            if not on and sg['t1'] - sg['t0'] < 0.9 and q + 1 < len(segs) and segs[q + 1]['who'] in ('ama', 'mei'):   # 'Say:' – too short for its own shot: the speaker shot starts early
                first = True; t_beat = ts; continue
            if on:
                i = sp_i.get(sg['who'], 0); sp_i[sg['who']] = i + 1; cl = SPEAKER_CLIP[sg['who']][i % len(SPEAKER_CLIP[sg['who']])]
                bounds.append((ts, 'speaker:' + sg['who'], cl))
            else:
                bounds.append((ts, 'beat:' + k if ts == t_beat else 'speaker:vo', vo_clip(k)))
                ws = [w for w in L[k].words if sg['t0'] <= w['s'] < sg['t1']]
                end = L[k].at + sg['t1'] if q + 1 < len(segs) else (BEAT[SEQ[j + 1]]['vin'] if j + 1 < len(SEQ) else TOTAL)
                if k == 'e' and CD:   # quiz: cut on the countdown ticks + the reveal (motivated by the sound)
                    for tc in CD_T[1:] + [T_REV]: bounds.append((tc, 'countdown', vo_clip(k)))
                    end = CD_T[0]
                if end - ts > V5['shot_max']:   # a cut every ~1.6-2.6 s, always in a word gap (phrase boundary, never mid-word)
                    last = ts
                    for a_, b_ in zip(ws, ws[1:]):
                        tg = L[k].at + (a_['e'] + b_['s']) / 2
                        if tg - last >= 1.6 and end - tg >= 0.9 and (b_['s'] - a_['e'] >= 0.04 or a_['w'][-1:] in ',.:?!'): bounds.append((tg, 'phrase', vo_clip(k))); last = tg
    bounds = sorted({round(b_[0], 3): b_ for b_ in bounds}.values())
    CUR = {}
    def take(clip, n):
        lo, hi = USE.get(clip, [[0, 5]])[0]; lo, hi = int(lo * 24), min(120, int(hi * 24))
        if clip == 'e02_exit': lo = max(lo, hi - n)   # exit = last shot: always ends on the walk-out (never reversed)
        p_, d_ = CUR.get(clip, (lo, 1)); out = []
        for _ in range(n):
            out.append(p_)
            if not lo <= p_ + d_ <= hi: d_ = -d_
            p_ += d_
        CUR[clip] = (p_, d_); return out
    for j, (t0, why, clip) in enumerate(bounds):
        t1 = bounds[j + 1][0] if j + 1 < len(bounds) else TOTAL + 0.1
        if t1 - t0 < 0.05: continue
        n = int(math.ceil((t1 - t0) * 24)) + 2
        SHOTS.append(dict(t0=round(t0, 3), t1=round(t1, 3), clip=clip, why=why, frames=take(clip, n)))
        if j: CUTS.append(dict(t=round(t0, 3), reason=why, to=clip, word_gap=True))
    SHOTS[0]['t0'] = 0.0
    print('shots', [(x['t0'], x['clip'], x['why']) for x in SHOTS])
    class Scene:
        def __init__(s):
            s.caps = {}; s.pos = {}; s.cache = {}; s.mouths = {}
            for c in {x['clip'] for x in SHOTS}:
                for w in WHOM.get(c, []):
                    if os.path.exists(f'{o.scene}/meta/{c}/{w}/mouth.json'): s.mouths[(c, w)] = LSA.Mouth(f'{o.scene}/meta/{c}/{w}')
        def src(s, clip, i):
            if clip not in s.caps: s.caps[clip] = cv2.VideoCapture(f'{o.scene}/dl24/{clip}.mp4'); s.pos[clip] = -1
            if s.pos[clip] + 1 != i: s.caps[clip].set(cv2.CAP_PROP_POS_FRAMES, i)
            ok, F_ = s.caps[clip].read()
            if not ok: s.caps[clip].release(); del s.caps[clip]; return s.src(clip, max(0, i - 1))
            s.pos[clip] = i; return F_
        def shot(s, t): return next((x for x in SHOTS if x['t0'] <= t < x['t1']), SHOTS[-1])
        def frame(s, t):
            sh = s.shot(t); i = sh['frames'][min(len(sh['frames']) - 1, int((t - sh['t0']) * 24 + 1e-6))]
            vs = tuple((w, LSA.viseme_at(SPEAK.get(w, []), t)) for w in WHOM.get(sh['clip'], []) if (sh['clip'], w) in s.mouths)
            key = (sh['clip'], i, vs)
            if key not in s.cache:
                if len(s.cache) > 8: s.cache.clear()
                F_ = s.src(sh['clip'], i).copy()
                for w, v in vs: mo = s.mouths[(sh['clip'], w)]; F_ = mo.apply(F_, i, mo.spr[v])
                s.cache[key] = cv2.resize(F_, (W, H), interpolation=cv2.INTER_LANCZOS4)[..., ::-1].astype(np.float32)
            return s.cache[key], dict(clip=sh['clip'], src=i, mouth=dict(vs))
    SCENE = Scene()
    AMB = f'{o.scene}/tools/amb_airport.wav'
def bg_at(t):
    if PLATE_N: return plate_at(t)[0]
    return SCENE.frame(t)[0]
def frost(b_):
    import cv2; sm = cv2.resize(b_, (W // 4, H // 4), interpolation=cv2.INTER_AREA); sm = cv2.GaussianBlur(sm, (0, 0), 4.5)
    return cv2.resize(sm, (W, H), interpolation=cv2.INTER_LINEAR)
# ---- camera punch-in (base layer only: scene / plate + host; the type is drawn after it and stays pixel-sharp)
ANCH = V5['anchor_a'] if DIRA else V5['anchor_b']
def cam_z(t):
    z = 1.0
    for p_, until in PUNCH:
        if t < p_: break
        if t < p_ + DUR['base']: z = 1 + (V5['punch'] - 1) * bezier(EASE['out'], (t - p_) / DUR['base'])
        elif t < until: z = V5['punch']
        elif t < until + DUR['slow']: z = 1 + (V5['punch'] - 1) * (1 - bezier(EASE['inout'], (t - until) / DUR['slow']))
        else: z = 1.0
    return z
def cam_apply(b_, z):
    if z <= 1.0005: return b_
    import cv2; ax, ay = ANCH; M = np.array([[z, 0, (1 - z) * ax], [0, z, (1 - z) * ay]], np.float32)
    return cv2.warpAffine(b_, M, (W, H), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)
# ---- dark ink glass panel behind the CURRENT beat's cards (never cream/white): frosted background + kit navy wash, morphs between beats
import cv2
PANEL_COL = np.array(V5['panel'], np.float32)
LUM = lambda A: float(np.mean(0.299 * A[..., 0] + 0.587 * A[..., 1] + 0.114 * A[..., 2])); Lp = float(np.dot(V5['panel'], [0.299, 0.587, 0.114]))
def beat_box(k):
    v0, v1 = BEAT[k]['vin'] + DUR['base'], BEAT[k]['vout'] - 0.05; bx_ = []
    for e in ELS:
        to_ = e.t_out if e.t_out is not None else (e.parent.t_out if e.parent is not None else None)   # a child (badge, underline) leaves with its card
        if e.id in ('progress.track', 'series') or e.t_in > v1 or (to_ is not None and to_ <= v0): continue
        n = e.inset; bx_.append((e.x + n, e.y + n, e.x + e.img.width - n, e.y + e.img.height - n))
    return min(b_[0] for b_ in bx_), min(b_[1] for b_ in bx_), max(b_[2] for b_ in bx_), max(b_[3] for b_ in bx_)
BOX = {k: beat_box(k) for k in SEQ}; pd_ = PANEL['pad']
RECT = {k: (24, max(PY + 24, b_[1] - pd_), W - 24, min(V5['cap_y'] - 12, b_[3] + pd_)) for k, b_ in BOX.items()}
PA = {}
for k in SEQ:
    x0_, y0_, x1_, y1_ = [int(v) for v in RECT[k]]; P_ = frost(bg_at((BEAT[k]['vin'] + BEAT[k]['vout']) / 2)); L0 = LUM(P_[y0_:y1_, x0_:x1_])
    PA[k] = float(np.clip(max(V5['panel_alpha'], (L0 - V5['panel_luma']) / max(1.0, L0 - Lp)), 0, V5['panel_max_alpha']))
lerp = lambda a, b, q: tuple(x + (y - x) * q for x, y in zip(a, b))
# v5 (render-1 review): the panel HUGS the visible type – it grows with every element that enters (eased, base) and fades with the beat's
# exits, so there is never an empty dark box waiting for words that the voice has not said yet
BEL = {}
for e in ELS:
    if e.id in ('progress.track', 'series') or e.grp not in BEAT: continue
    n = e.inset; BEL.setdefault(e.grp, []).append((e.t_in, e.x + n, e.y + n, e.x + e.img.width - n, e.y + e.img.height - n))
def panel_at(t):
    k = None
    for k_ in SEQ:
        if BEAT[k_]['vin'] - 0.05 <= t: k = k_
    if k is None or not BEL.get(k): return RECT[SEQ[0]], 0.0
    on = [x for x in BEL[k] if x[0] <= t]
    if not on: return RECT[k], 0.0
    t_first = min(x[0] for x in on); pres = bezier(EASE['out'], min(1.0, (t - t_first) / DUR['base']))
    vo = BEAT[k]['vout'] if not (k == SEQ[-1] and END_OUT) else END_OUT
    if t >= vo: pres *= max(0.0, 1 - bezier(EASE['inn'], (t - vo) / DUR['fast'] if k != SEQ[-1] else (t - vo) / DUR['slow']))
    top = min(x[2] for x in on); bot = max(x[2] + (x[4] - x[2]) * bezier(EASE['out'], min(1.0, (t - x[0]) / DUR['base'])) for x in on)
    r = (24, max(PY + 24, top - PANEL['pad']), W - 24, min(V5['cap_y'] - 12, bot + PANEL['pad']))
    return r, PA[k] * pres
MASKS = {}
def panel_mask(r):
    key = tuple(int(round(v)) for v in r)
    if key not in MASKS:
        if len(MASKS) > 16: MASKS.clear()
        q = 4; mm = Image.new('L', (W // q, H // q), 0); ImageDraw.Draw(mm).rounded_rectangle([v / q for v in key], PANEL['radius'] / q, fill=255)
        mm = mm.filter(ImageFilter.GaussianBlur(PANEL['feather'] / q)); MASKS[key] = cv2.resize(np.asarray(mm, np.float32) / 255, (W, H), interpolation=cv2.INTER_LINEAR)[..., None]
    return MASKS[key]
def glass(b_, prect, sk):
    if sk <= 0.002: return b_
    mk_ = panel_mask(prect) * sk; b_ = b_ + (frost(b_) - b_) * np.minimum(1.0, mk_ * 1.6); return b_ + (PANEL_COL - b_) * mk_
# punches: hook quote, wrong card, right card, rule '+', normal-speed marker, quiz reveal, end card – never over a contact-sheet / sharpness frame
SNAP = [round(max(BEAT[k]['vin'] + 0.6, BEAT[k]['vout'] - 0.15), 2) for k in SEQ]
_pt = sorted(t_ for t_ in [tq, tx, T_K, t_i, T_REV if CD else None, BEAT['s']['vin']] if t_ is not None)
PUNCH = []
for j, p_ in enumerate(_pt):
    until = min(p_ + V5['punch_hold'], (_pt[j + 1] - DUR['slow'] - 0.05) if j + 1 < len(_pt) else TOTAL)
    if until > p_ + DUR['base']: PUNCH.append((round(p_, 3), round(until, 3)))
print('punches', PUNCH)
HSTILL = None
if T1 and o.host_still:
    im = np.asarray(Image.open(o.host_still).convert('RGBA').resize((1080, 1920)), np.float32); HSTILL = (im[..., :3], im[..., 3] / 255)

# ------------------------------------------------------------------ v4 word-level karaoke captions (1b) + watermark
CAPS = []; CAP_HIDDEN = []; ALIGN = {k: L[k].align for k in SEQ}
# v5 captions (docs/VIDEO-TEMPLATES.md §10): pages of 2-3 words cut on the voice, heavy display face, white + thick dark stroke + soft shadow,
# the ACTIVE word turns kit yellow (no pill box), centred in the lower third (text top V5.cap_y), each page pops in (scale .86 -> 1 over cap_pop s)
CS = V5['cap_size']; fc = F('display', CS); clh = int(round(CS * LEAD)); CM = 16; csp = fc.getlength(' ') + V5['cap_stroke']
STROKE = (9, 30, 31)
def cap_word(w, active):
    tw_ = int(math.ceil(fc.getlength(w))) + 2 * V5['cap_stroke']; im = Image.new('RGBA', (tw_ + 2 * CM, clh + 2 * CM), (0, 0, 0, 0)); asc, desc = fc.getmetrics(); ty = CM + (clh - (asc + desc)) // 2; tx_ = CM + V5['cap_stroke']
    sh_ = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(sh_).text((tx_, ty + 6), w, font=fc, fill=STROKE + (170,), stroke_width=V5['cap_stroke'], stroke_fill=STROKE + (170,))
    im = Image.alpha_composite(im, sh_.filter(ImageFilter.GaussianBlur(5)))   # soft drop shadow; the glyphs themselves are never blurred
    ImageDraw.Draw(im).text((tx_, ty), w, font=fc, fill=(V5['cap_active'] if active else C['white']) + (255,), stroke_width=V5['cap_stroke'], stroke_fill=STROKE + (255,)); return im
CWID = lambda w: fc.getlength(w) + 2 * V5['cap_stroke']
for k in SEQ:
    ln = L[k]; ws = ln.words
    if BOX[k][3] > V5['cap_y'] - 8: CAP_HIDDEN.append(k); continue
    wid = lambda ids: sum(CWID(ws[x]['w']) for x in ids) + fc.getlength(' ') * (len(ids) - 1)
    ph_, cur = [], []
    for j, w in enumerate(ws):
        cur.append(j)
        if w['w'][-1:] in '.,:?!;': ph_.append(cur); cur = []
    if cur: ph_.append(cur)
    ch_ = []
    for p_ in ph_:
        for n_ in range(1, len(p_) + 1):
            sz_ = math.ceil(len(p_) / n_); parts = [p_[i:i + sz_] for i in range(0, len(p_), sz_)]
            if all(len(x) <= V5['cap_words'] and wid(x) <= FULL - 2 * CM for x in parts): break
        for x in parts:   # glue a one-word phrase ('Say:', 'Quiz:') to the next page when it fits
            if ch_ and len(ch_[-1]) == 1 and len(ch_[-1]) + len(x) <= V5['cap_words'] and wid(ch_[-1] + x) <= FULL - 2 * CM and ch_[-1][-1] + 1 == x[0]: ch_[-1] = ch_[-1] + x
            else: ch_.append(x)
    for c, ids in enumerate(ch_):
        t_on = ln.at + ws[ids[0]]['s']; t_off = (ln.at + ws[ch_[c + 1][0]]['s']) if c + 1 < len(ch_) else min(ln.at + ws[-1]['e'] + 0.35, BEAT[k]['vout'])
        tot = wid(ids); x0c = int(round(X0 + (FULL - tot) / 2)) - CM; cid = f'cap.{k}.{c}'
        img = Image.new('RGBA', (int(math.ceil(tot)) + 2 * CM + 4, clh + 2 * CM), (0, 0, 0, 0)); wl = []; ox = 0.0
        for n_, x in enumerate(ids):
            w = ws[x]['w']; img.alpha_composite(cap_word(w, False), (int(round(ox)), 0))
            t0 = ln.at + ws[x]['s']; t1 = (ln.at + ws[ids[n_ + 1]]['s']) if n_ + 1 < len(ids) else t_off
            wl.append(dict(id=f'{cid}.w{n_}', img=cap_word(w, True), ox=int(round(ox)), x=x0c + int(round(ox)), t0=t0, t1=t1, text=w)); ox += CWID(w) + fc.getlength(' ')
        CAPS.append(dict(id=cid, img=img, x=x0c, y=V5['cap_y'] - CM, t_on=t_on, t_off=t_off, words=wl, text=' '.join(ws[x]['w'] for x in ids), k=k))
WM, WM_PAD = watermark(); print('captions', len(CAPS), 'pages; hidden beats', CAP_HIDDEN)
def wm_alpha(t):
    if not LOC: return 0.0
    a = bezier(EASE['out'], (t - 1.5) / DUR['slow']) if t > 1.5 else 0.0          # BRAND-RULES: fades in from 1.5 s (after the hook), 0.5 s
    sv = BEAT['s']['vin']
    if t >= sv: a *= 1 - bezier(EASE['inn'], (t - sv) / DUR['fast'])               # hidden on the end card (the end card shows the full logo)
    return a * 0.62

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
    pz = None; sc_ = None
    if PLATE_N: base, pz = plate_at(t)
    elif DIRA: base, sc_ = SCENE.frame(t); base = base.copy()
    else: base = BG.copy()
    hl = None
    if host is not None:
        (rgb, m), i, v = host.frame(t); th = sway(t)
        if abs(th) > 1e-4: rgb2, m2 = sway_layer(rgb, m, th); base = host_comp(base, rgb2, m2, m)
        else: base = host_comp(base, rgb, m)
        hl = dict(scale=HSC, x=HDX, y=HDY, src=i, mouth=v, sway=round(th, 4))
    elif HSTILL is not None: base = host_comp(base, *HSTILL); hl = dict(scale=HSC, x=HDX, y=HDY)
    cz = cam_z(t); base = cam_apply(base, cz)
    prect, sk = panel_at(t); base = glass(base, prect, sk)
    fr = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8)).convert('RGBA'); rec = []
    pf, pmv, pk = prog_frac(t)
    pa = 1.0
    if END_OUT and t >= END_OUT:
        q = (t - END_OUT) / DUR['fast']; pa = 0.0 if q >= 1 else 1 - bezier(EASE['inn'], q); pmv, pk = (q < 1), (f'out@{END_OUT:.2f}' if q < 1 else pk)
    if pf > 0 and pa > 0.004:
        pim = PROG.crop((0, 0, max(1, int(FULL * pf)), 10))
        if pa < 0.999: arr = np.asarray(pim).copy(); arr[..., 3] = (arr[..., 3] * pa).astype(np.uint8); pim = Image.fromarray(arr)
        fr.alpha_composite(pim, (X0, PY)); rec.append(['progress.fill', X0, PY, int(FULL * pf), 10, round(pa, 3), 1, int(pmv), pk if pmv else '-', 0])
    for e in ELS:
        a, dx, dy, sc, wp, mv = e.state(t)
        if a <= 0.004: continue
        im = e.dyn(t) if e.dyn is not None else e.img
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
    wa = wm_alpha(t)
    if wa > 0.004:
        arr = np.asarray(WM).copy(); arr[..., 3] = (arr[..., 3] * wa).astype(np.uint8); fr.alpha_composite(Image.fromarray(arr), (60 - WM_PAD, 236 - WM_PAD))
    for c in CAPS:   # v5 captions: page pops in (caption layer 'cap', its own channel – qc one_moving_group counts the lesson groups), active word yellow
        if not (c['t_on'] - 1e-6 <= t < c['t_off'] - 1e-6): continue
        q = (t - c['t_on']) / V5['cap_pop']; sc = 0.86 + 0.14 * bezier(EASE['out'], q) if q < 1 else 1.0
        pg = c['img'].copy()
        for w in c['words']:
            if w['t0'] - 1e-6 <= t < w['t1'] - 1e-6: pg.alpha_composite(w['img'], (w['ox'], 0))
        x_, y_ = c['x'], c['y']
        if sc < 1:
            w2, h2 = max(1, round(pg.width * sc)), max(1, round(pg.height * sc)); x_ += (pg.width - w2) / 2; y_ += (pg.height - h2) / 2; pg = pg.resize((w2, h2), Image.BICUBIC)
        fr.alpha_composite(pg, (int(round(x_)), int(round(y_)))); rec.append([c['id'], round(x_, 2), round(y_, 2), pg.width, pg.height, 1.0, round(sc, 4), int(sc < 1), 'cap', 1])
        for w in c['words']:
            if w['t0'] - 1e-6 <= t < w['t1'] - 1e-6: rec.append([w['id'], w['x'], c['y'], w['img'].width, w['img'].height, 1.0, 1, 0, 'cap', 0])
    log.append(dict(t=round(t, 4), host=hl, els=rec, plate=pz, scrim=None if sk is None else round(sk, 4), brand=round(wa, 3), cam=round(cz, 4), scene=sc_))
    return fr.convert('RGB')

os.makedirs(os.path.dirname(os.path.abspath(o.out)), exist_ok=True)
SNAP = [round(max(BEAT[k]['vin'] + 0.6, BEAT[k]['vout'] - 0.15), 2) for k in SEQ]
STAGE_L = {}
STAGE_L = {}
for k, ts in zip(SEQ, SNAP):   # v5: luma UNDER the type = background + dark glass inside every beat's content box (qc plate_contrast / no_light_panels)
    b_ = cam_apply(bg_at(ts), cam_z(ts)); r_, a_ = panel_at(ts); b_ = glass(b_, r_, a_)
    x0_, y0_, x1_, y1_ = [int(v) for v in BOX[k]]; STAGE_L[k] = round(LUM(b_[y0_:y1_, x0_:x1_]), 1)
if PLATE_N: PLATE_LOG.update(stage_luma=max(STAGE_L.values()), scrim=round(max(PA.values()), 3), panel_alpha={k: round(v, 3) for k, v in PA.items()})
print('panel', json.dumps({k: [RECT[k], round(PA[k], 3), STAGE_L[k], [round(v) for v in BOX[k]]] for k in SEQ}, default=float))
def med_luma(im):   # median luma of the opaque body of a card / option box (text pixels are a minority)
    a_ = np.asarray(im.convert('RGBA'), np.float32); m_ = a_[..., 3] > 250
    if m_.mean() < 0.5: return None   # boxes only (bare type = transparent)
    px = a_[..., :3][m_]; mx, mn = px.max(1), px.min(1)
    return dict(luma=round(float(np.median(0.299 * px[:, 0] + 0.587 * px[:, 1] + 0.114 * px[:, 2])), 1), sat=round(float(np.median((mx - mn) / np.maximum(mx, 1))), 3))
LIGHT = dict(panels={k: dict(rect=[round(v) for v in RECT[k]], alpha=round(PA[k], 3), color=list(V5['panel']), luma_under=STAGE_L[k]) for k in SEQ},
             boxes={e.id: med_luma(e.img) for e in ELS if e.img.width * e.img.height >= 0.025 * W * H})
if o.stills:
    for ts in [x for v in o.stills.split(',') for x in (SNAP if v == 'beats' else [round(BEAT[k]['vin'] + 0.8, 2) for k in SEQ] if v == 'mid' else [float(v)])]:
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
WH_T = sorted({round(e.t_in, 2) for e in ELS if e.enter in ('slide', 'spring') and not e.parent and e.id.endswith('card')} | {round(BEAT[k]['vin'], 2) for k in ('y', 'c', 'rn', 'r2', 'e', 's') if k in BEAT})
for t0 in WH_T: put(WH, max(0, t0 - 0.08), db(-27))
for t0 in TICKS: put(TK, t0, db(-29))
def ding(d=0.7):
    n = int(d * SR); tt_ = np.arange(n) / SR; env = np.minimum(1, tt_ / 0.004) * np.exp(-tt_ * 6)
    return ((np.sin(2 * np.pi * 1046.5 * tt_) + 0.6 * np.sin(2 * np.pi * 1568 * tt_) + 0.25 * np.sin(2 * np.pi * 2093 * tt_)) * env / 1.85).astype(np.float32)
for t0 in CD_T: put(tick(1500, 0.07), t0, db(-22))                 # countdown: one tick per second
if CD: put(ding(), T_REV, db(-20)); put(tick(900, 0.03), T_REV, db(-24))   # answer reveal: chime + small pop
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
if DIRA and os.path.exists(AMB):
    am = load(AMB); am = np.tile(am, int(NA / max(1, len(am))) + 1)[:NA] * fade; am *= db(-40) / max(1e-6, np.sqrt(np.mean(am ** 2))); pad = pad * 0.6 + am * 0.8
mix += voice + pad; mix = np.clip(mix, -db(-1), db(-1))
AW = o.out + '.mix.wav'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', '-c:a', 'pcm_s16le', AW], input=mix.tobytes(), check=True)
AUD = dict(voice_rms_dbfs=-19, music_rms_dbfs=round(20 * np.log10(np.sqrt(np.mean(pad[int(2 * SR):int((TOTAL - 2) * SR)] ** 2)) + 1e-9), 1), whoosh_peak_dbfs=-27, tick_peak_dbfs=-29, whooshes=len(WH_T), ticks=len(TICKS),
           countdown_ticks=len(CD_T), reveal=T_REV if CD else None)

# video --------------------------------------------------------------
vk = VIDEO['target_kbps']
# v4: frames -> LOSSLESS master (x264 qp 0) -> ONE lossy encode at >= VIDEO.min_mbps (CRF first; CBR at target_kbps from the same master if CRF lands under the floor)
MASTER = o.out + '.master.mkv'
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'veryfast', '-qp', '0',
                        '-pix_fmt', 'yuv420p', MASTER], stdin=subprocess.PIPE)
LOG = []; shots = {}; SHARP_LOG = []
if os.environ.get('TPL_SMOKE_FRAMES'): NF = int(os.environ['TPL_SMOKE_FRAMES'])   # local code-path smoke test only (never on CI)
SR_ = None
if HOST_HEAD:   # host sharpness probe rect: face + torso core (never the matte edge), same rect in qc on the encoded file
    sw_ = HOST_HEAD['shoulder_w']; SR_ = [int(HOST_LOCK['cx'] - 0.3 * sw_), int(HOST_HEAD['top'] + 40), int(HOST_LOCK['cx'] + 0.3 * sw_), 1900]
SHARP_F = {int(round(ts * FPS)) for ts in SNAP}
for fi in range(NF):
    tf = fi / FPS; img = compose(tf, LOG); enc.stdin.write(img.tobytes())
    for k, ts in zip(SEQ, SNAP):
        if abs(tf - ts) < 0.5 / FPS: shots[k] = img.resize((360, 640), Image.LANCZOS)
    if SR_ and fi in SHARP_F and cam_z(tf) <= 1.0005:   # host sharpness is measured at rest framing (a punch-in is a deliberate 6 % camera zoom)
        import cv2; g_ = cv2.cvtColor(np.asarray(img)[SR_[1]:SR_[3], SR_[0]:SR_[2]], cv2.COLOR_RGB2GRAY); SHARP_LOG.append(dict(frame=fi, var=round(float(cv2.Laplacian(g_, cv2.CV_64F).var()), 2)))
    if fi % 120 == 0: print(f'frame {fi}/{NF}', flush=True)
enc.stdin.close(); assert enc.wait() == 0
AF = ['-af', 'loudnorm=I=-16:TP=-1.5:LRA=11'] if LOC else []
def final(rc):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', MASTER, '-i', AW, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', *rc, *AF,
                    '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-shortest', o.out], check=True)
    return int(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=bit_rate', '-of', 'csv=p=0', o.out]))
CBR = ['-b:v', f'{vk}k', '-minrate', f'{vk}k', '-maxrate', f'{vk}k', '-bufsize', f'{vk}k', '-x264-params', 'nal-hrd=cbr:force-cfr=1']
vbr = final(['-crf', str(o.crf), '-maxrate', '20000k', '-bufsize', '40000k', '-x264-params', 'force-cfr=1'] if o.crf else CBR); mode = 'crf' if o.crf else 'cbr'
if vbr < VIDEO['min_mbps'] * 1e6 + 100e3 and o.crf: vbr = final(CBR); mode = 'cbr-floor'
os.remove(MASTER); print('video kbps', vbr // 1000, mode)
sheet = Image.new('RGB', (5 * 360 + 6 * 12, 2 * 640 + 3 * 12), (240, 240, 240))
for j, k in enumerate(SEQ):
    if k in shots: sheet.paste(shots[k], (12 + (j % 5) * 372, 12 + (j // 5) * 652))
sheet.save(o.out + '.sheet.jpg', quality=88)
LESSON_TXT = ' '.join([SP['series'][0], FORM, wrong, right, WHY, Q_PRE, Q_POST] + ROWS)
json.dump(dict(id=LID, hook_full=HOOK_FULL, lesson=dict(topic=SP.get('topic'), area=SP.get('area'), text=LESSON_TXT, hook=SP.get('hook'), hook_text=L['h'].text, wrong=SP['wrong_line'], right=SP['key_line'], reject=SP.get('reject'), fix=SP.get('fix')),
               host_head=HOST_HEAD, lipsync=LIPSYNC, persp=PERSP, sharp=dict(rect=SR_, frames=SHARP_LOG, scale=HSC), sway=dict(deg=SWAY['deg'], period=SWAY_P) if SWAY_P else None,
               captions=dict(hidden=CAP_HIDDEN, chunks=len(CAPS), words={w['id']: dict(text=w['text'], audio_t=round(w['t0'], 4), dur=round(w['t1'] - w['t0'], 4)) for c in CAPS for w in c['words']}),
               align=ALIGN, encode=dict(mode=mode, video_bps=vbr), panel={k: dict(rect=[round(v) for v in RECT[k]], alpha=round(PA[k], 3), luma=STAGE_L.get(k), snap=SNAP[i]) for i, k in enumerate(SEQ)}, tpl='1b' if LOC else o.tpl, style='v5', dir=o.dir, light=LIGHT, punches=PUNCH, shots=[{k_: v_ for k_, v_ in x.items() if k_ != 'frames'} for x in SHOTS], scene_bank=(o.scene and os.path.basename(os.path.normpath(o.scene))), plate=PLATE_LOG, host_name=HOSTN, clip=CLIP, cta=CTA, fps=FPS, total=TOTAL, beats=BEAT, audio=AUD, video_kbps=vk, cuts=CUTS,
               elements={**{e.id: dict(text=e.text, fs=e.fs, grp=e.grp, t_in=e.t_in, t_out=e.t_out, tweens=e.tweens(), inset=e.inset, parent=e.parent.id if e.parent else None) for e in ELS},
                         **{c['id']: dict(text=c['text'], fs=CS, grp='cap', t_in=round(c['t_on'], 3), t_out=round(c['t_off'], 3), tweens=[], inset=16, parent=None, caption=True) for c in CAPS}},
               progress=dict(tweens=[dict(kind='grow', dur='base', ease='out')] * len(PSTEPS)), frames=LOG), open(o.out + '.timeline.json', 'w'), default=float)
print('done', o.out, TOTAL, 's')
