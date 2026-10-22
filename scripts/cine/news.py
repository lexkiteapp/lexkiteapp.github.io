# scripts/cine/news.py <lesson>  (env NEWS_DIR, CINE_LIB, CINE_OUT; generated lessons = NEWS_DIR/lessons/<id>.json run through news_tpl.py)  -- "news-anchor" short: keyed green-screen host (Ama/Carlos, anchor/green) over a topic background with Ken Burns +
# parallax, US-broadcast lower third, big one-line karaoke captions (per-word timing over the Rhubarb speech span), pattern / x->v / recap cards
# in the top safe zone (never over faces), comment ring, loop ending. Output out/cine-news-<topic>-en.mp4 + cover + render dir with timeline.json
# for qa_news.py (qa5 rules + per-shot host transform). Cool-Mac: cv2 2 threads, x264 2 threads, one render at a time.
import os, sys, json, re, subprocess, numpy as np, cv2
cv2.setNumThreads(2)
from PIL import Image, ImageDraw, ImageFont, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.environ.get('CINE_ROOT', os.path.dirname(os.path.dirname(HERE)))
N = os.environ.get('NEWS_DIR', os.getcwd())   # work dir: ci/lines.json, vis3/ (wav + Rhubarb + .words.json), lessons/<id>.json|py, depth/
A = os.environ.get('CINE_LIB', f'{ROOT}/brand/library/cine') + '/anchor'; TL = f'{A}/tools'; G = f'{A}/green'; OUTD = os.environ.get('CINE_OUT', f'{ROOT}/out')
DEPTH = os.environ.get('NEWS_DEPTH', f'{N}/depth')
sys.path.insert(0, HERE); import lipsync as L
sys.path.insert(0, f'{ROOT}/scripts/video'); import matte_refine as MR   # 666722b2: refined mattes, premultiplied place/over, edge QA
LID = sys.argv[1]; FPS = 24; W, H = 1080, 1920
SAFE = dict(x0=48, x1=924, y0=232, y1=1497)   # owner 22/10 platform UI: top 12 %, bottom 22 %, right 14 % stay clear of ALL text
CW, CX0 = 876, 48; CX = CX0 + CW // 2   # text column (left-biased: the right 14 % holds the TikTok/Reels/Shorts buttons)
TEXT = {l['id']: l['text'] for l in json.load(open(f'{N}/ci/lines.json'))['lines']}
CUES = {k: json.load(open(f'{N}/vis3/{k}.json'))['mouthCues'] for k in TEXT if os.path.exists(f'{N}/vis3/{k}.json')}   # lines of this job's lessons only
FB = f'{ROOT}/brand/social/src/fonts/BeVietnamPro-ExtraBold.ttf'; FH = f'{ROOT}/brand/social/src/fonts/BricolageGrotesque-ExtraBold.ttf'
CARD_BG, CARD_LINE, CARD_INK, CAP_BOX = (255, 255, 255), (34, 36, 44), (34, 36, 44), False   # owner 22/10 §15: 6 text layouts = 3 card skins x 2 caption skins (set per lesson by STYLE)
TEAL, TEAL2, ORANGE, YEL, INK, CREAM = (15, 61, 62), (23, 89, 90), (229, 80, 47), (255, 201, 74), (34, 36, 44), (255, 247, 236)
# hosts: face centre + face width in source px (1080x1920 after lipsync.finish), alpha fade line (source y) below the hands / above the seat
HOST = {'ama': dict(eye=(615, 613)), 'carlos': dict(eye=(557, 686))}   # eye line in source px (1080x1920 after lipsync.finish)
FRAME = {('ama', 'mcu'): (1.30, 640), ('ama', 'wide'): (1.22, 650), ('carlos', 'mcu'): (1.26, 840), ('carlos', 'wide'): (1.19, 885)}   # no desk: Carlos's body exits the frame bottom above his seat (source row <= 1560)   # owner 22/10: singles = medium shot, face 18 % (mcu) / 17 % (wide) of frame height   # v4 (owner 21/10): chest-up, equal face height (Carlos face = 0.74 x Ama in source), equal eye line
def font(p, s): return ImageFont.truetype(p, s)
def speech(k): nx = [x for x in CUES[k] if x['value'] != 'X']; return nx[0]['start'], nx[-1]['end']
def wdur(k): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{N}/vis3/{k}.wav']))
S, OV, SFX = [], [], []
def line_tempo(line):   # caption reading speed <= 15 cps -> slow the line (>= 0.84x; news_voice.py re-synthesises lines that would need more)
    s0, s1 = speech(line); need = len(TEXT[line]) / 14.0 - 0.2   # v6: caption tail is ~0.25 s (no dead air), not 0.49
    return 1.0 if need <= s1 - s0 else max(0.84, round((s1 - s0) / need - 0.005, 3))
def talk_dur(line, at, breath=0.4, tempo=None): return at + speech(line)[1] / (tempo or line_tempo(line)) + breath
def shot(id, clip, who, frame, bg, line=None, dur=None, at=0.07, breath=0.4, frames=None, raw=False, other=None, tempo=None):
    """talk shot (line) = at + speech end + breath; hold shot = dur. frames: source indices (ping-pong through the clip by default)."""
    if line:
        tempo = tempo or line_tempo(line); dur = talk_dur(line, at, breath, tempo)
    tempo = tempo or 1.0
    n = int(round(dur * FPS)); t0 = sum(x['dur'] for x in S)
    if frames is None:
        AVOID = {'ga4_talk_natural': (54, 101)}   # bank_gestures segments: hands at the waist -> under the caption band (owner 22/10 no-occlusion)
        if clip in AVOID:
            lo_, hi_ = 0, AVOID[clip][0]; st = START.get(clip, 0) % (2 * (hi_ - 1)); seq = [abs((st + q) % (2 * (hi_ - 1)) - (hi_ - 1)) * -1 + (hi_ - 1) for q in range(n)]   # forward / back inside [0, 53]
            frames = seq; START[clip] = st + n
        else:
            st = START.get(clip, 0); st = 0 if st + n > 121 else st; assert n <= 121, ('shot longer than the clip', id)
            frames = list(range(st, st + n)); START[clip] = st + n   # forward only: no reversed playback
    S.append(dict(id=id, clip=clip, who=who, frame=frame, bg=bg, t0=t0, n=n, dur=n / FPS, frames=frames[:n], raw=raw, other=other,
                  lines=[dict(id=line, who=who, at=at, tempo=tempo, dur=wdur(line) / tempo)] if line else []))
    return S[-1]
START = {}
def ov(style, text, t0, t1, box, shot_id, line=None, part=None, fs=None, img=None, pop=False):
    OV.append(dict(style=style, text=text, t=[round(t0, 3), round(t1, 3)], box=[int(v) for v in box], shot=shot_id, line=line, part=part, fs=fs, _img=img))
    if pop: SFX.append(('pop.wav', round(t0, 3)))
# ------------------------------------------------------------------ drawing helpers (RGBA PIL layers, full frame)
def layer(): return Image.new('RGBA', (W, H), (0, 0, 0, 0))
def bbox_of(im): b = im.getbbox(); return b if b else (0, 0, 1, 1)
def shadowed(im, r=10, off=(0, 8), a=110):
    al = im.split()[3].filter(ImageFilter.GaussianBlur(r)).point(lambda v: v * a // 255)
    sh = Image.new('RGBA', im.size, (10, 20, 24, 0)); sh.putalpha(al); out = layer(); out.alpha_composite(sh, off); out.alpha_composite(im); return out
def fit(dr, txt, path, size, maxw, minsize=40):
    while size > minsize and dr.textlength(txt, font=font(path, size)) > maxw: size -= 2
    return font(path, size), size
def card_pattern(num, txt, y0=250, title=None):
    """white card: orange number chip + label, phrase in big ink type; '___' highlighted."""
    im = layer(); d = ImageDraw.Draw(im); w = CW; x0 = CX0
    f, fs = fit(d, txt, FB, 66, w - 80); th = 66 if True else fs
    lines = [txt]
    if d.textlength(txt, font=f) > w - 80 or fs < 58:   # wrap to 2 lines at 60 px
        f = font(FB, 60); fs = 60; ws = txt.split(); best = None
        for i in range(1, len(ws)):
            a, b = ' '.join(ws[:i]), ' '.join(ws[i:]); m = max(d.textlength(a, font=f), d.textlength(b, font=f))
            if best is None or m < best[0]: best = (m, [a, b])
        lines = best[1]
    h = 92 + len(lines) * (fs + 16) + 24
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 30, fill=CARD_BG + (250,), outline=CARD_LINE + (255,), width=5)
    lab = title or f'PHRASE {num}'; lf = font(FH, 38); lw = d.textlength(lab, font=lf) + 44
    d.rounded_rectangle([x0 + 30, y0 + 24, x0 + 30 + lw, y0 + 80], 28, fill=ORANGE + (255,)); d.text((x0 + 52, y0 + 30), lab, font=lf, fill=(255, 255, 255))
    y = y0 + 98
    for ln in lines:
        d.text((CX, y), ln, font=f, fill=INK, anchor='ma'); y += fs + 16
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
def mark(d, cx, cy, r, ok):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=((40, 160, 90) if ok else (214, 48, 49)) + (255,))
    if ok: d.line([(cx - r * .45, cy + r * .02), (cx - r * .1, cy + r * .38), (cx + r * .5, cy - r * .35)], fill='white', width=int(r * .26), joint='curve')
    else:
        k = r * .38; d.line([(cx - k, cy - k), (cx + k, cy + k)], fill='white', width=int(r * .26)); d.line([(cx - k, cy + k), (cx + k, cy - k)], fill='white', width=int(r * .26))
def card_fix(bad, good, y0=250, show_good=True):
    im = layer(); d = ImageDraw.Draw(im); w = CW; x0 = CX0; h = 300
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 30, fill=CARD_BG + (250,), outline=CARD_LINE + (255,), width=5)
    f = fit(d, max(bad, good, key=len), FB, 64, w - 190)[0]
    mark(d, x0 + 78, y0 + 82, 40, False); d.text((x0 + 140, y0 + 82), bad, font=f, fill=(150, 150, 158), anchor='lm')
    tw = d.textlength(bad, font=f); d.line([(x0 + 136, y0 + 86), (x0 + 144 + tw, y0 + 86)], fill=(214, 48, 49), width=8)
    if show_good: mark(d, x0 + 78, y0 + 215, 40, True); d.text((x0 + 140, y0 + 215), good, font=f, fill=INK, anchor='lm')
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
CARD_Y = 1016   # below the lowest single chin incl. head motion (~945) + margin
def card_phrase(num, pattern, note, bad=None, good=None, why=None, y0=CARD_Y):
    im = layer(); d = ImageDraw.Draw(im); w = CW; x0 = CX0; h = 272 if bad else 158
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 28, fill=CARD_BG + (248,), outline=CARD_LINE + (255,), width=4)
    lab = f'PHRASE {num}'; lf = font(FH, 30); lw = d.textlength(lab, font=lf) + 32
    d.rounded_rectangle([x0 + 24, y0 + 18, x0 + 24 + lw, y0 + 62], 22, fill=ORANGE + (255,)); d.text((x0 + 40, y0 + 40), lab, font=lf, fill='white', anchor='lm')
    pf = fit(d, pattern, FB, 56, w - 60 - lw - 30)[0]; d.text((x0 + 44 + lw, y0 + 40), pattern, font=pf, fill=INK, anchor='lm')
    nf = fit(d, note, FB, 38, w - 60)[0]; d.text((x0 + 30, y0 + 104), note, font=nf, fill=TEAL2, anchor='lm')
    if bad:
        d.line([(x0 + 24, y0 + 140), (x0 + w - 24, y0 + 140)], fill=(225, 225, 230), width=3)
        mf = fit(d, bad + good + 'xxxxxx', FB, 42, w - 190)[0]; mark(d, x0 + 52, y0 + 184, 24, False)
        d.text((x0 + 86, y0 + 184), bad, font=mf, fill=(140, 140, 150), anchor='lm'); tw = d.textlength(bad, font=mf)
        d.line([(x0 + 84, y0 + 187), (x0 + 88 + tw, y0 + 187)], fill=(214, 48, 49), width=6)
        gx = x0 + 120 + tw; mark(d, gx, y0 + 184, 24, True); d.text((gx + 34, y0 + 184), good, font=mf, fill=INK, anchor='lm')
        d.text((x0 + 30, y0 + 238), why, font=fit(d, why, FB, 34, w - 60)[0], fill=(120, 60, 50), anchor='lm')
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
def icon(d, name, cx, cy, r):   # owner 22/10 memory hook: a simple flat icon in a teal disc (no emoji font on CI)
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=TEAL + (255,)); W_ = (255, 255, 255); k = r * 0.5
    if name == 'phone': d.rounded_rectangle([cx - k * 0.55, cy - k, cx + k * 0.55, cy + k], 6, outline=W_, width=5); d.ellipse([cx - 3, cy + k * 0.62, cx + 3, cy + k * 0.62 + 6], fill=W_)
    elif name == 'book': d.polygon([(cx - k, cy - k * 0.7), (cx, cy - k * 0.45), (cx, cy + k * 0.8), (cx - k, cy + k * 0.55)], outline=W_, width=4); d.polygon([(cx + k, cy - k * 0.7), (cx, cy - k * 0.45), (cx, cy + k * 0.8), (cx + k, cy + k * 0.55)], outline=W_, width=4)
    elif name == 'food': d.ellipse([cx - k, cy - k * 0.6, cx + k, cy + k * 0.9], outline=W_, width=5); d.line([(cx - k * 1.25, cy - k), (cx - k * 1.25, cy + k)], fill=W_, width=4)
    elif name == 'doctor': d.rectangle([cx - k * 0.28, cy - k, cx + k * 0.28, cy + k], fill=W_); d.rectangle([cx - k, cy - k * 0.28, cx + k, cy + k * 0.28], fill=W_)
    elif name == 'question': d.text((cx, cy + 2), '?', font=font(FH, int(r * 1.3)), fill=W_, anchor='mm')
    elif name == 'bulb': d.ellipse([cx - k * 0.75, cy - k, cx + k * 0.75, cy + k * 0.4], outline=W_, width=5); d.rectangle([cx - k * 0.35, cy + k * 0.45, cx + k * 0.35, cy + k * 0.85], fill=W_)
    elif name == 'repeat': d.arc([cx - k, cy - k, cx + k, cy + k], 30, 330, fill=W_, width=5); d.polygon([(cx + k * 0.95, cy - k * 0.55), (cx + k * 0.95, cy + k * 0.05), (cx + k * 0.4, cy - k * 0.25)], fill=W_)
    else: d.text((cx, cy + 2), '!', font=font(FH, int(r * 1.3)), fill=W_, anchor='mm')
def formula_text(d, x, y, txt, f):   # colour formula: CAPS slot words orange, '+' / '=' teal, rest ink
    for w_ in txt.split(' '):
        col = ORANGE if re.fullmatch(r"[A-Z][A-Z'/]+", w_) and len(w_) > 1 else TEAL if w_ in ('+', '=', '->', '/') else TEAL2
        d.text((x, y), w_, font=f, fill=col, anchor='lm'); x += d.textlength(w_ + ' ', font=f)
def card_one(kind, text, sub=None, num=None, y0=CARD_Y, ic=None, formula=None):
    im = layer(); d = ImageDraw.Draw(im); w = CW; x0 = CX0; sub = formula or sub; h = 128 + (56 if sub else 0)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 28, fill=CARD_BG + (248,), outline=CARD_LINE + (255,), width=4); cy = y0 + 64; tx = x0 + 34
    if ic: icon(d, ic, x0 + w - 62, cy, 36)
    rx = x0 + w - (112 if ic else 30)
    if kind == 'p':
        lab = num if isinstance(num, str) else f'PHRASE {num}'; lf = font(FH, 30); lw = d.textlength(lab, font=lf) + 32
        d.rounded_rectangle([x0 + 26, cy - 22, x0 + 26 + lw, cy + 22], 22, fill=ORANGE + (255,)); d.text((x0 + 42, cy), lab, font=lf, fill='white', anchor='lm'); tx = x0 + 46 + lw
    else: mark(d, x0 + 64, cy, 30, kind == 'v'); tx = x0 + 112
    f = fit(d, text, FB, 52, rx - tx)[0]; d.text((tx, cy), text, font=f, fill=(150, 150, 158) if kind == 'x' else CARD_INK, anchor='lm')
    if kind == 'x': tw = d.textlength(text, font=f); d.line([(tx - 4, cy + 3), (tx + tw + 4, cy + 3)], fill=(214, 48, 49), width=7)
    if sub:
        sf = fit(d, sub, FB, 40, rx - tx)[0]
        if formula: formula_text(d, tx, cy + 64, sub, sf)
        else: d.text((tx, cy + 64), sub, font=sf, fill=TEAL2, anchor='lm')
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
def share_chip(sub, y0=236):   # owner 22/10 §13 share trigger: "Send this to a friend" + who says the mistake
    im = layer(); d = ImageDraw.Draw(im); t = 'Send this to a friend'; f1 = font(FH, 46); f2 = fit(d, sub, FB, 36, CW - 80, 28)[0]
    w = max(d.textlength(t, font=f1), d.textlength(sub, font=f2)) + 70; x0 = CX - w / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + 120], 30, fill=TEAL + (255,)); d.text((CX, y0 + 36), t, font=f1, fill='white', anchor='mm'); d.text((CX, y0 + 88), sub, font=f2, fill=YEL, anchor='mm')
    return shadowed(im), (int(x0), y0, int(x0 + w), y0 + 120)
def badge(level, y0=400):   # difficulty badge (owner 22/10 §13): EASY green / MEDIUM amber / HARD CHALLENGE red
    im = layer(); d = ImageDraw.Draw(im); t = {'easy': 'EASY', 'medium': 'MEDIUM', 'hard': 'HARD CHALLENGE'}[level]; col = {'easy': (40, 160, 90), 'medium': (230, 160, 30), 'hard': (214, 48, 49)}[level]
    f = font(FH, 28); tw = d.textlength(t, font=f); x0 = CX - tw / 2 - 28
    d.rounded_rectangle([x0, y0, x0 + tw + 56, y0 + 44], 22, fill=col + (255,)); d.text((CX, y0 + 22), t, font=f, fill='white', anchor='mm')
    return shadowed(im), (int(x0), y0, int(x0 + tw + 56), y0 + 44)
def card_recap(title, rows, y0=CARD_Y):
    im = layer(); d = ImageDraw.Draw(im); w = CW; x0 = CX0; rh = 38; h = 66 + rh * len(rows) + 8
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 30, fill=CARD_BG + (250,), outline=CARD_LINE + (255,), width=5)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + 62], 30, fill=TEAL + (255,)); d.rectangle([x0, y0 + 34, x0 + w, y0 + 62], fill=TEAL + (255,))
    d.text((CX, y0 + 31), title, font=font(FH, 38), fill=(255, 255, 255), anchor='mm')
    f = fit(d, max(rows, key=len), FB, 40, w - 150)[0]
    for i, r in enumerate(rows):
        cy = y0 + 66 + i * rh + rh // 2; d.ellipse([x0 + 30, cy - 20, x0 + 70, cy + 20], fill=ORANGE + (255,)); d.text((x0 + 50, cy), str(i + 1), font=font(FH, 28), fill='white', anchor='mm')
        d.text((x0 + 112, cy), r, font=f, fill=CARD_INK, anchor='lm')
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
def hook_card(txt, sub, y0=236):   # owner 22/10: big bold hook at the top-safe line
    im = layer(); d = ImageDraw.Draw(im); f, fs = fit(d, txt, FH, 92, CW - 80, 70)
    tw = d.textlength(txt, font=f); bx = CX - tw / 2 - 36
    d.rounded_rectangle([bx, y0, bx + tw + 72, y0 + fs + 52], 26, fill=ORANGE + (255,))
    d.text((CX, y0 + 22), txt, font=f, fill='white', anchor='ma')
    return shadowed(im), (int(bx), y0, int(bx + tw + 72), y0 + fs + 52), fs   # v4: one line only (layout zone)
def series_bar(top, sub, y0=240, prog=1.0):   # top-left under the safe line (payoff promise); name titles use y0=NAME_Y
    """US-broadcast lower third: orange tag block + dark-teal strip with white title, thin yellow rule; slides in from the left."""
    im = layer(); d = ImageDraw.Draw(im); x0 = CX0 + 12; tf = font(FH, 44); sf = font(FB, 38)
    tw = d.textlength(top, font=tf) + 48; sw = d.textlength(sub, font=sf) + 56; full = tw + sw
    for fs_ in (36, 34, 32, 30):   # fit inside the safe column (right 14 % clear)
        if x0 + full <= CX0 + CW: break
        sf = font(FB, fs_); sw = d.textlength(sub, font=sf) + 56; full = tw + sw
    for ft_ in (40, 36, 32):
        if x0 + full <= CX0 + CW: break
        tf = font(FH, ft_); tw = d.textlength(top, font=tf) + 48; full = tw + sw
    while x0 + full > CX0 + CW and len(sub) > 4: sub = sub[:-2].rstrip() + '…'; sw = d.textlength(sub, font=sf) + 56; full = tw + sw
    off = int((1 - prog) * -(full + 80))
    d.rectangle([x0 + off, y0, x0 + off + tw, y0 + 76], fill=ORANGE + (255,)); d.text((x0 + off + 24, y0 + 38), top, font=tf, fill='white', anchor='lm')
    d.rectangle([x0 + off + tw, y0, x0 + off + full, y0 + 76], fill=TEAL + (240,)); d.text((x0 + off + tw + 28, y0 + 38), sub, font=sf, fill=CREAM, anchor='lm')
    d.rectangle([x0 + off, y0 + 76, x0 + off + full, y0 + 84], fill=YEL + (255,))
    return im, (x0, y0, int(x0 + full), y0 + 84)
def ring_card(txt, prog, y0=CARD_Y + 40):
    im = layer(); d = ImageDraw.Draw(im); f = font(FH, 56); tw = d.textlength(txt, font=f); w = tw + 190; x0 = CX - w / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + 124], 62, fill=CARD_BG + (250,), outline=CARD_LINE + (255,), width=5)
    cx, cy, r = x0 + 72, y0 + 62, 38; d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(225, 225, 230), width=10)
    d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * prog, fill=ORANGE, width=10)
    d.rounded_rectangle([cx - 16, cy - 12, cx + 16, cy + 10], 6, fill=TEAL); d.polygon([(cx - 8, cy + 8), (cx - 12, cy + 20), (cx + 4, cy + 9)], fill=TEAL)
    d.text((x0 + 130, y0 + 62), txt, font=f, fill=INK, anchor='lm')
    return shadowed(im), (int(x0), y0, int(x0 + w), y0 + 124)
def follow_chip(y0=CARD_Y + 60):
    im = layer(); d = ImageDraw.Draw(im); f = font(FH, 50); t = 'Follow for more'; tw = d.textlength(t, font=f); x0 = CX - (tw + 80) / 2
    d.rounded_rectangle([x0, y0, x0 + tw + 80, y0 + 96], 48, fill=ORANGE + (255,)); d.text((CX, y0 + 48), t, font=f, fill='white', anchor='mm')
    return shadowed(im), (int(x0), y0, int(x0 + tw + 80), y0 + 96)
# karaoke caption: one line per page, current word yellow; pages split so each fits 900 px at >= 74 px
CAP_Y, CAP_FS, CAP_LH, NAME_Y = 1238, 60, 74, 1413   # owner 22/10: 2-line phrase chunks; name lower-third sits on the bottom safe line
FUNCW = set("a an the to of in on at for from by with and or but so is are was were be been am do does did have has had will would can could should "
            "may might must my your his her its our their this that these those than as if".split())
_cd = ImageDraw.Draw(Image.new('RGBA', (8, 8)))
def _fits(ws_): return _cd.textlength(' '.join(ws_), font=font(FB, CAP_FS)) <= CW - 24
def _nrm(w_): return re.sub(r"[^a-z']", '', w_.lower())
def cap_split(ws_):   # <= 2 lines, balanced, a line never ends on a function word unless punctuated; None if it cannot fit
    if _fits(ws_): return [ws_]
    best = None
    for i in range(1, len(ws_)):
        a, b = ws_[:i], ws_[i:]
        if not (_fits(a) and _fits(b)): continue
        bad = _nrm(a[-1]) in FUNCW and not re.search(r'[,.;:!?]$', a[-1])
        sc_ = abs(len(' '.join(a)) - len(' '.join(b))) + (100 if bad else 0) - (30 if re.search(r'[,;:]$', a[-1]) else 0)
        if best is None or sc_ < best[0]: best = (sc_, [a, b])
    return best[1] if best else None
def cap_chunks(ws):
    """phrase chunks (word index lists): punctuation first, one sentence per screen where possible, <= 2 lines, never ending on a function word"""
    ch, cur = [], []
    for i, w_ in enumerate(ws):
        cur.append(i)
        if i + 1 == len(ws): break
        nxt_ok = cap_split([ws[k] for k in cur + [i + 1]]) is not None
        if re.search(r'[.!?]$', w_) or (re.search(r'[,;:]$', w_) and len(cur) >= 3 and not nxt_ok) or not nxt_ok: ch.append(cur); cur = []
    if cur: ch.append(cur)
    if len(ch) > 1 and len(ch[-1]) == 1 and len(ch[-2]) >= 3 and _nrm(ws[ch[-2][-2]]) not in FUNCW and not re.search(r'[.!?]$', ws[ch[-2][-1]]) and cap_split([ws[j] for j in ch[-2][-1:] + ch[-1]]): ch[-1].insert(0, ch[-2].pop())   # no one-word tail chunk
    for k in range(len(ch) - 1):   # move a dangling function word to the next chunk
        while len(ch[k]) > 1 and _nrm(ws[ch[k][-1]]) in FUNCW and not re.search(r'[,.;:!?]$', ws[ch[k][-1]]) and cap_split([ws[j] for j in [ch[k][-1]] + ch[k + 1]]):
            ch[k + 1].insert(0, ch[k].pop())
    return ch
def cap_img(lines_, k, fs=CAP_FS):   # lines_: [[word, ...], ...]; k = index of the current word within the chunk
    im = layer(); d = ImageDraw.Draw(im); f = font(FB, fs); n = 0; x0b, x1b = 9999, 0
    if CAP_BOX:   # boxed caption skin: one dark rounded box behind the chunk, no stroke
        wmax = max(d.textlength(' '.join(lw), font=f) for lw in lines_); d.rounded_rectangle([CX - wmax / 2 - 22, CAP_Y - 10, CX + wmax / 2 + 22, CAP_Y + (len(lines_) - 1) * CAP_LH + fs * 1.25 + 4], 18, fill=(18, 22, 28, 200))
    for li, lw in enumerate(lines_):
        txt = ' '.join(lw); tw = d.textlength(txt, font=f); x = CX - tw / 2; y = CAP_Y + li * CAP_LH; x0b, x1b = min(x0b, x), max(x1b, x + tw)
        for w_ in lw:
            d.text((x, y), w_, font=f, fill=YEL if n == k else (255, 255, 255), stroke_width=0 if CAP_BOX else 8, stroke_fill=(20, 22, 28)); x += d.textlength(w_ + ' ', font=f); n += 1
    return im, (int(x0b) - 8, CAP_Y - 8, int(x1b) + 8, CAP_Y + (len(lines_) - 1) * CAP_LH + int(fs * 1.25))
def captions(s):
    for ln in s['lines']:
        k = ln['id']; s0, s1 = speech(k); T_ = ln['tempo']; a = s['t0'] + ln['at'] + s0 / T_; b = s['t0'] + ln['at'] + s1 / T_; ws = TEXT[k].split()
        WJ = json.load(open(f'{N}/vis3/{k}.words.json'))['words']; norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower())
        assert [norm(x['w']) for x in WJ] == [norm(x) for x in ws], ('whisper words != text', k, [x['w'] for x in WJ])
        base = s['t0'] + ln['at']
        def snap(t_):
            for c in CUES[k]:
                if c['value'] == 'X' and c['start'] - 1e-6 <= t_ < c['end'] and c['end'] - c['start'] >= 0.06: return c['end']
            return t_
        bnd = [c['start'] for c in CUES[k] if c['value'] != 'X']; prev = -1
        for x in WJ:   # whisper gives word order + rough time; the start is snapped to the nearest Rhubarb mouth-cue onset (<= 160 ms) = what the viewer sees
            t_ = snap(x['s']); x['w0'] = x['s']; cand = [b_ for b_ in bnd if b_ > prev + 1e-6 and abs(b_ - t_) <= 0.12]   # whisper start -> nearest later Rhubarb onset within 120 ms
            x['s'] = min(cand, key=lambda b_: abs(b_ - t_)) if cand else max(t_, prev + 0.05); prev = x['s']
        edges = [base + x['s'] / T_ for x in WJ]; ln['words'] = [[round(base + x['s'] / T_, 3), round(base + x['e'] / T_, 3), round(base + x['w0'] / T_, 3)] for x in WJ]
        CH = cap_chunks(ws)
        for _ in range(3):   # merge chunks shorter than 0.8 s on screen into a neighbour when the pair still fits 2 lines
            dur_ = lambda c: (edges[c[-1] + 1] if c[-1] + 1 < len(ws) else b + 0.39) - (a - 0.095 if c[0] == 0 else edges[c[0]])
            for ci in range(len(CH)):
                if dur_(CH[ci]) < 0.8 and len(CH) > 1:
                    cj = ci + 1 if ci + 1 < len(CH) else ci - 1; mg = sorted(CH[ci] + CH[cj])
                    if cap_split([ws[x] for x in mg]): CH[min(ci, cj)] = mg; del CH[max(ci, cj)]; break
        for chi, cw_ in enumerate(CH):
            lines_ = cap_split([ws[x] for x in cw_]) or [[ws[x] for x in cw_]]
            for j, gi in enumerate(cw_):
                t0 = max(a - 0.095, s['t0']) if gi == 0 else edges[gi]; t1 = b + 0.39 if gi == len(ws) - 1 else edges[gi + 1]   # a caption chunk never starts before its shot's cut
                im, box = cap_img(lines_, j); ov('Cap', TEXT[k], t0, t1, box, s['id'], line=k, part=gi, fs=CAP_FS, img=im); OV[-1]['chunk'] = [chi, ' '.join(ws[x] for x in cw_), len(lines_)]
# ------------------------------------------------------------------ lesson script
STYLE = dict(moves=['push'], transition='cut')
HTOP = {}   # bank_gestures safe_zone.hand_top_min per clip (source px)
for _p in (f'{A}/green/bank_gestures.json',):
    if os.path.exists(_p): HTOP.update({c['id']: (c.get('safe_zone') or {}).get('hand_top_min') for c in json.load(open(_p)).get('clips', []) if (c.get('safe_zone') or {}).get('hand_top_min')})   # replaced by news_tpl.py (owner 22/10 §15 edit style)
if os.path.exists(f'{N}/lessons/{LID}.json'): SPEC = json.load(open(f'{N}/lessons/{LID}.json')); exec(open(f'{HERE}/news_tpl.py').read())   # generated (gen_news.py)
else: exec(open(f'{N}/lessons/{LID}.py').read())
TOTAL = sum(x['dur'] for x in S); NF = int(round(TOTAL * FPS))
for s in S: captions(s)
_caps = sorted([o for o in OV if o['style'] == 'Cap'], key=lambda o: o['t'][0])
for o, o2 in zip(_caps, _caps[1:]):   # J-cuts: a caption's tail never overlaps the next line's first chunk
    if o2['line'] != o['line'] and o['t'][1] > o2['t'][0]: o['t'][1] = round(max(o['t'][0] + 0.05, o2['t'][0]), 3)
if os.environ.get('NEWS_DRY'):   # dry run (Mac): timeline only, no frames
    for s in S: print(f"{s['t0']:6.2f} {s['dur']:5.2f} {s['id']:7s} {s['clip']:14s} {s['who']:6s} {s['frame']}")
    for o in OV:
        if o['style'] != 'Cap': print('  ', o['style'], o['t'], o['box'], o['text'][:50])
    print('TOTAL', round(TOTAL, 2)); sys.exit(0)
# ------------------------------------------------------------------ host frames (mouth swap on the keyed full-frame clip) + alpha
RD = f'{N}/render5_{LID}_en'; os.makedirs(RD, exist_ok=True)
def finish_mask(M, k=1): x, y, w, h = [v * k for v in L.WM_CROP]; return cv2.resize(M[y:y + h, x:x + w], (1080 * k, 1920 * k), interpolation=cv2.INTER_LINEAR)
def host_frames(s, clip, who, lines, raw):
    cf, cm, ll = MR.layer_paths(G, clip)   # PRO mattes (ViTMatte, lossless alpha) when NEWS_MATTE=pro
    KX = 2 if os.environ.get('NEWS_SR') and os.path.exists(f'{G}/kfull_x2/{clip}.mp4') and os.path.exists(f'{G}/kmask_x2/{clip}.mkv') else 1   # host_sr.py x2 layers
    if KX == 2: cf, cm, ll = f'{G}/kfull_x2/{clip}.mp4', f'{G}/kmask_x2/{clip}.mkv', True
    mo = [] if raw else [dict(mouth=L.scale_mouth(L.Mouth(f'{TL}/meta/{clip}/{who}'), KX) if KX > 1 else L.Mouth(f'{TL}/meta/{clip}/{who}'), lines=[dict(cues=CUES[l['id']], at=l['at'], tempo=l['tempo']) for l in lines])]
    fr, log = L.render(cf, s['frames'], speakers=mo, k=KX); s.setdefault('kx', {})[clip] = KX
    PADB = (600 if clip.startswith('ga') else 0) * KX   # standing Ama's clip ends at her thighs: extend the (dark) trousers by edge replication so a smaller Ama still exits the frame bottom
    if PADB: fr = [np.concatenate([F_, np.repeat(F_[-1:], PADB, 0)]) for F_ in fr]
    cap = cv2.VideoCapture(cm); MM = []
    while True:
        ok, M = cap.read()
        if not ok: break
        MM.append(M[..., 0])
    ramp = 1.0
    al = []
    for i in s['frames']:
        m = MR.mask_levels(finish_mask(MM[min(i, len(MM) - 1)], KX), ll)
        if KX > 1: m = np.clip((m - 0.5) * 1.5 + 0.5, 0, 1)   # the x2 Lanczos alpha has a 2x wider ramp -> back to the PRO matte's 1-2 px   # h264 white ~250 -> exactly opaque; no morphology (it made stair-steps)
        al.append(np.concatenate([m, np.repeat(m[-1:], PADB, 0)]) * ramp if PADB else m * ramp)
    tops = [int(np.argmax((m[:, 300:800] > 0.5).any(1))) for m in al[::4]]; top = HAIR.setdefault(clip, int(np.median(tops)))
    return fr, al, log, top
HAIR = {}
# owner 22/10: STANDING hosts only (bank_gestures.json layout, equal eye->mouth on screen). FACEH = 2.6 x eye->mouth (source px); SEAT = lowest
# solid source row (no legs gap / clip edge); eye lines leave the chin above the text column and the body exits the real frame bottom.
HOST = {'ama_s': dict(eye=(530, 680)), 'carlos_s': dict(eye=(545, 390)), 'carlos_q': dict(eye=(465, 310))}
FACEH = {'ama_s': 348, 'carlos_s': 265, 'carlos_q': 175}   # calibrated on rendered frames (#57): measured face width Ama/Carlos was 1.05-1.11 -> Ama x0.97, Carlos x1.04
SEAT = {'ama_s': 2500, 'carlos_s': 1600, 'carlos_q': 1880}
FACE_PX = {'mcu': 346, 'wide': 290, 'mws': 290, 'two': 230}; EYE_Y = {'mcu': 605, 'wide': 720, 'mws': 720, 'two': 960}   # coordinator 22/10: face size + sharpness first, headroom as low as the hands-vs-caption rule allows (Ama's resting hands stay below the caption band)   # owner 22/10 composition: MCU face 18 % for explanations, MS (waist) 14 % for openers / reactions; eye on the upper third (33-36 %); x2 SR layers keep every host layer <= 1.0x   # owner 22/10 sharpness: no host layer above 1.0x (Carlos mcu = 1.0x source)
FRAME = {(g, f_): (round(FACE_PX[f_] / FACEH[g], 4), EYE_Y[f_] - (50 if g == 'carlos_q' else 0)) for g in FACEH for f_ in FACE_PX}
for (g_, f_), (sc_, ey_) in list(FRAME.items()):   # equal head-top line for both hosts: Carlos's eye moves by the hair-height difference
    if g_ != 'ama_s' and f_ in ('mcu', 'wide', 'mws'): top_a = FRAME[('ama_s', f_)][1] - 293 * FRAME[('ama_s', f_)][0]; FRAME[(g_, f_)] = (sc_, round(top_a + (197 if g_ == 'carlos_s' else 149) * sc_))
SIDE = {(g, f_): ({'mcu': 380, 'wide': 380, 'mws': 360, 'two': 220} if g == 'ama_s' else {'mcu': 700, 'wide': 700, 'mws': 720, 'two': 880})[f_] for g in FACEH for f_ in FACE_PX}   # thirds; two-shot gap >= 4 % width
DESK_Y = 1880; VBOT = lambda frame: 1920
GK = lambda clip, who: 'ama_s' if clip.startswith('ga') else 'carlos_q' if 'q34' in clip else 'carlos_s'
def place(sid, who, frame, top):
    sc, ey = FRAME[(who, frame)]; ex, sy = HOST[who]['eye']; ey = max(ey, VBOT(frame) - (SEAT[who] - sy) * sc); low = sy + (VBOT(frame) - ey) / sc   # body must still exit the frame bottom above the clip's last solid row
    assert low <= SEAT[who] and sc <= 2.0 + 1e-6, ('seat/lap would be visible or body ends in frame', sid, who, low)
    return sc, ex, sy, SIDE[(who, frame)], ey
# ------------------------------------------------------------------ backgrounds (Ken Burns + crossfade on swaps)
BGI = {}
PLATES = json.load(open(f'{N}/plates.json')) if os.path.exists(f'{N}/plates.json') else {}
PL = {}
def plate_frame(name, t):
    if name not in PL:
        cap = cv2.VideoCapture(PLATES[name]); fr = []
        while True:
            ok, F = cap.read()
            if not ok: break
            fr.append(cv2.resize(F, (648, 1152), interpolation=cv2.INTER_AREA))
        PL.clear() if len(PL) > 1 else None; PL[name] = fr
    fr = PL[name]; n = len(fr); k = int(round(t * FPS)) % (2 * n - 2); k = k if k < n else 2 * n - 2 - k   # seamless ping-pong loop
    im = cv2.resize(fr[k], (1296, 2304), interpolation=cv2.INTER_LINEAR); im = cv2.GaussianBlur(im, (0, 0), 5.0)
    return (im.astype(np.float32) * 0.86 + 8).clip(0, 255).astype(np.uint8)
def bgimg(name, t=0):
    if name in PLATES: return plate_frame(name, t)
    if name not in BGI:
        im = cv2.imread(f'{TL}/dl/{name}.png'); im = cv2.resize(im, (1296, 2304), interpolation=cv2.INTER_AREA)
        im = cv2.GaussianBlur(im, (0, 0), 5.0);   # shallow depth of field (~1 % of width) so the host pops
        BGI[name] = (im.astype(np.float32) * 0.86 + 8).clip(0, 255).astype(np.uint8)
    return BGI[name]
SEG = []   # background segments: (name, t0, t1, direction)
for s in S:
    if SEG and SEG[-1][0] == s['bg']: SEG[-1][2] = s['t0'] + s['dur']
    else: SEG.append([s['bg'], s['t0'], s['t0'] + s['dur'], 1 if len(SEG) % 2 == 0 else -1])
import bg3d
BGP = lambda n: f'{A}/bg/{n}.png' if os.path.exists(f'{A}/bg/{n}.png') else f'{TL}/dl/{n}.png'   # bg library (index.json topics) or the pilot plates
BGL = {}
def layers(name):
    if name not in BGL: BGL.clear() if len(BGL) > 2 else None; BGL[name] = bg3d.Layers(BGP(name), f'{DEPTH}/{name}.depth.png')
    return BGL[name]
MOVES = [dict(z=(1.10, 1.135), tx=(-4, 4), ty=(0, -2), rot=(0, 0)),   # owner 21/10: minimal camera = slow push-in 2-4 % per shot + barely visible drift
         dict(z=(1.11, 1.14), tx=(4, -4), ty=(2, 0), rot=(0, 0)),
         dict(z=(1.10, 1.13), tx=(0, 3), ty=(-3, 0), rot=(0, 0)),
         dict(z=(1.12, 1.15), tx=(-3, 2), ty=(0, 2), rot=(0, 0)),
         dict(z=(1.10, 1.14), tx=(3, -2), ty=(1, -1), rot=(0, 0))]
ANG = {}
# ------------------------------------------------------------------ scene logic (owner 22/10, VIDEO-SCALE-PLAN §11): bg zones -> camera tilt + host x
ZD = os.environ.get('NEWS_ZONES', f'{N}/zones'); ZP = f"{ZD}/{S[0]['bg']}.zones.json"; ZN = json.load(open(ZP)) if os.path.exists(ZP) else None
PLACE = dict(bg=S[0]['bg'], zones=bool(ZN)); CAM_TY = 0.0; ZBASE = 1.10
HALFW = {'ama_s': 240, 'carlos_s': 420, 'carlos_q': 300}; CHIN = {'ama_s': 220, 'carlos_s': 170, 'carlos_q': 140}; TOPH = {'ama_s': 293, 'carlos_s': 197, 'carlos_q': 149}
def zfrac(x0, y0, x1, y1, keys, z, tx, ty):   # fraction of grid cells of `keys` inside a frame rectangle, mapped back into the background image
    G_ = ZN['grid']; gw, gh = G_['w'], G_['h']; xs = np.linspace(x0, x1, 12); ys = np.linspace(y0, y1, 16); n = k = 0
    for yy in ys:
        v = 0.5 + (yy - 960 + ty) / (1920 * z)
        for xx in xs:
            u = 0.5 + (xx - 540 - tx) / (1080 * z)
            if 0 <= u < 1 and 0 <= v < 1: n += 1; k += G_['rows'][int(v * gh)][int(u * gw)] in keys
    return k / max(1, n)
if ZN:
    EYM = float(np.mean([FRAME[(GK(x['clip'], x['who']), x['frame'])][1] for x in S if not x['other']]))
    for _ in range(3):   # horizon position depends on the zoom, the zoom on the tilt
        HZ0 = 960 + (ZN['horizon'] - 0.5) * 1920 * ZBASE; CAM_TY = float(np.clip(HZ0 - EYM, -260, 260)); ZBASE = max(1.10, 1.03 + 2 * abs(CAM_TY) / 1920)
    HZ0 = 960 + (ZN['horizon'] - 0.5) * 1920 * ZBASE   # zoom keeps the tilted canvas covering the frame (canvas 1.33x: no upscale up to 1.33)
    HDY = 0.0   # owner 22/10 composition: eyes stay on the upper third; only the camera tilts   # horizon still below the eyes after the max tilt: lower both hosts (chins stay above the text column)
    if HDY:
        for k_ in list(FRAME): FRAME[k_] = (FRAME[k_][0], FRAME[k_][1] + HDY)
    PLACE.update(valid=ZN['valid'], horizon=ZN['horizon'], cam_ty=round(CAM_TY, 1), zbase=round(ZBASE, 3), host_dy=round(HDY, 1), eye_dev=round(abs(HZ0 - CAM_TY - EYM - HDY), 1), hosts={})
    for (g_, f_) in sorted({(GK(x['clip'], x['who']), x['frame']) for x in S if not x['other']}):
        sc_, ey_ = FRAME[(g_, f_)]; side0 = SIDE[(g_, f_)]; band = (260, 400) if g_ == 'ama_s' else (680, 820); best = None
        for dx in (0, -40, 40, -80, 80, -120, 120):
            ox_ = side0 + dx
            if not band[0] <= ox_ <= band[1]: continue
            hw = HALFW[g_] * sc_; tx_ = -26 if g_ == 'ama_s' else 26
            fx = zfrac(ox_ - hw, ey_ + CHIN[g_] * sc_, ox_ + hw, 1919, 'XN', ZBASE, tx_, CAM_TY)   # under / behind the torso: no table, seat, bed, water...
            fn = zfrac(ox_ - hw, ey_ - TOPH[g_] * sc_, ox_ + hw, 1919, 'N', ZBASE, tx_, CAM_TY)   # nearer foreground object covered by the host
            sc2 = fx + 2 * fn + abs(dx) / 1000
            if best is None or sc2 < best[0]: best = (sc2, ox_, round(fx, 3), round(fn, 3))
        SIDE[(g_, f_)] = best[1]; PLACE['hosts'][f'{g_}/{f_}'] = dict(ox=best[1], under=best[2], near=best[3])
    PLACE['ok'] = bool(ZN['valid'] and PLACE['eye_dev'] <= 115 and all(v['under'] <= 0.35 and v['near'] <= 0.12 for v in PLACE['hosts'].values()))
    print('placement', json.dumps(PLACE))
QA['placement'] = PLACE
_JJ = f'{N}/judge_{LID}.json'; QA['judge'] = json.load(open(_JJ)) if os.path.exists(_JJ) else None   # AI script judge + rules (script_judge.py)
_VJ = f'{N}/pre_{LID}/vision.json'; QA['vision'] = json.load(open(_VJ)) if os.path.exists(_VJ) else None   # AI vision gate result (scripts/cine/vision_gate.py, run before the full render)
if os.environ.get('NEWS_PREFLIGHT') and ZN and not PLACE['ok']: print('PLACEMENT FAIL', S[0]['bg']); sys.exit(3)
# owner 22/10 scene continuity: ONE location, each host keeps the SAME crop window of it (Ama = left portion, Carlos = right portion);
# every shot restarts at that host's anchor (z, tx, ty) and only adds a small move (push / pull <= 2.5 %, slide / tilt <= 8 px, handheld, rack)
MARG = 1080 * (ZBASE - 1) / 2; WIN = {'ama': (-0.7 * MARG, ZBASE), 'carlos': (0.7 * MARG, ZBASE), 'two': (0.0, ZBASE)}
for x in S:
    ang = 'two' if x['other'] else x['who']; side, zb = WIN[ang]; z0 = zb; z1 = zb + min(0.025, 0.008 * x['dur'])
    mv = STYLE['moves'][S.index(x) % len(STYLE['moves'])] if x['id'] not in ('hook', 'loop') else 'push'; x['move'] = mv   # owner 22/10 §15: varied light moves, <= 3 per clip
    if mv == 'pull': z0, z1 = z1, z0
    sd = (side - 8, side + 8) if mv == 'slide' else (side, side); tl_ = (CAM_TY - 6, CAM_TY + 6) if mv == 'tilt' else (CAM_TY, CAM_TY)
    if mv in ('slide', 'tilt', 'handheld', 'rack'): z1 = z0 + 0.004 * x['dur']
    x['cam'] = dict(z=(z0, z1), tx=sd, ty=tl_, rot=(0, 0)); x['angle'] = ang; x['window'] = dict(tx=round(side, 1), z=round(zb, 4), bg=x['bg'])
if S[-1]['id'] == 'loop':   # loop settles back to the hook's first camera state (last frame == first frame)
    S[-1]['cam']['z'] = (S[-1]['cam']['z'][0], S[0]['cam']['z'][0])
ease = bg3d.ease
def cam_at(s, u):
    m = s['cam']; e = bg3d.ease(u); c = {k: m[k][0] + (m[k][1] - m[k][0]) * e for k in ('z', 'tx', 'ty', 'rot')}
    if s.get('move') == 'handheld': t_ = u * s['dur']; c['tx'] += 3.2 * np.sin(2 * np.pi * 0.7 * t_) + 1.4 * np.sin(2 * np.pi * 1.9 * t_ + 1); c['ty'] += 2.6 * np.sin(2 * np.pi * 0.5 * t_ + 2)   # ~0.3 % handheld
    return c
BOK = bg3d.Bokeh(); BQA = []; ZONES = [[24, 212, 948, 400], [24, 992, 948, 1521]]   # card + caption + lower-third band (+24 px)
PZ = lambda s, j: 1 + 0.08 * (1 - (1 - min(1.0, j / FPS / 0.4)) ** 2) if s['id'] == 'hook' else 1.0   # owner 22/10: punch-in 1.0 -> 1.08 in 0.4 s
def bg_frame(s, j, t):
    u = j / max(1, s['n'] - 1); L_ = layers(s['bg']); qa = j % 6 == 0
    c_ = cam_at(s, u); c_['z'] *= PZ(s, j); r = L_.render(c_, qa=qa); B = r[0] if qa else r
    if s.get('move') == 'rack' and j < 12: B = cv2.GaussianBlur(B, (0, 0), 1.6 * (1 - j / 12) + 1e-3)   # fake rack focus: bg settles sharp in 0.5 s
    if qa: BQA.append(dict(t=round(t, 2), fill=r[1], uncovered=r[2]))
    k = S.index(s); D = 7
    if k > 0 and S[k - 1]['bg'] != s['bg'] and j < D:   # cross-dissolve 7 frames, outgoing camera keeps moving (zoom-through) with 3-sample motion blur
        p = S[k - 1]; w = bg3d.ease((j + 1) / (D + 1)); acc = 0
        for d in (-0.5, 0, 0.5):
            c = cam_at(p, 1.0); c['z'] *= 1 + 0.006 * (j + 1 + d); acc = acc + layers(p['bg']).render(c)
        B = acc / 3 * (1 - w) + B * w
    BOK.avoid = ZONES + [[b[0] - 24, b[1] - 24, b[2] + 24, b[3] + 24] for b in s.get('faceboxes', [])]
    return BOK.apply(B, t)   # owner 22/10: no vignette
SEG = [[x['bg'], x['t0'], x['t0'] + x['dur'], 1] for x in S]
for k_, x in enumerate(S[1:], 1):
    if S[k_ - 1]['bg'] != x['bg']: SFX.append(('whoosh.wav', round(x['t0'] - 0.12, 3)))
# ------------------------------------------------------------------ render
def _desk():   # flat 2D broadcast desk (brand teal, yellow rule, orange stripe), full width from DESK_Y down
    im = np.zeros((1920, 1080, 3), np.float32); al = np.zeros((1920, 1080, 1), np.float32); al[DESK_Y:] = 1
    im[DESK_Y:] = np.array(TEAL[::-1], np.float32); im[DESK_Y:DESK_Y + 22] = np.array(TEAL2[::-1], np.float32) * 1.25; im[DESK_Y + 22:DESK_Y + 28] = np.array(YEL[::-1], np.float32)
    im[DESK_Y + 120:DESK_Y + 132] = np.array(ORANGE[::-1], np.float32); g = np.clip((np.arange(1920) - DESK_Y) / 420.0, 0, 1)[:, None, None]; im = im * (1 - 0.35 * g)
    return im, al
DESK = _desk()
BOT = np.clip((np.arange(1920) - 1180) / 740.0, 0, 1)[:, None, None] ** 1.6 * 0.3   # owner 22/10: soft bottom scrim for text legibility (no solid band)
def qblur(x, sg):   # large Gaussian at 1/4 resolution (same look, ~10x cheaper)
    h_, w_ = x.shape[:2]; y = cv2.GaussianBlur(cv2.resize(x, (w_ // 4, h_ // 4), interpolation=cv2.INTER_AREA), (0, 0), sg / 4)
    return cv2.resize(y, (w_, h_), interpolation=cv2.INTER_LINEAR)
def comp(F, Al, sc, cx, cy, ox, oy, drift):   # premultiplied resample (MR.place), returned un-premultiplied for the per-host grading below
    M = np.float32([[sc, 0, ox - cx * sc + drift], [0, sc, oy - cy * sc]]); Fp, a = MR.place(F.astype(np.float32), Al.astype(np.float32), sc, M, (1080, 1920))
    return Fp / np.maximum(a, 1e-3)[..., None], a
enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-threads', '2', '-profile:v', 'high', '-preset', 'slow', '-tune', 'animation', '-b:v', '10M', '-maxrate', '14M', '-bufsize', '28M', '-pix_fmt', 'yuv420p', f'{RD}/video.mp4'], stdin=subprocess.PIPE)
KEYM = {}; EQ = []; BGC = []; HB = {}; EXPO = None; HOSTG = 1.0; PREV_OUT = None; OVS = sorted(OV, key=lambda o: o['t'][0]); fi = 0; COVER = None; QC = []; PA = None
_x = np.arange(256) / 255.0; _l = _x ** 0.86; _s = np.clip(_l - 0.16 * np.sin(2 * np.pi * _l) / (2 * np.pi), 0, 1)   # owner 22/10: mids lifted ~+10 %, soft S-curve
_sh = np.clip(1 - _x * 2.2, 0, 1); _hi = np.clip(_x * 2 - 1.1, 0, 1); _fl = lambda v: 18 / 255 + np.clip(v, 0, 1) * (1 - 22 / 255)   # black floor 18/255
GRADE = np.stack([_fl(_s + 0.02 * _sh - 0.015 * _hi), _fl(_s + 0.01 * _sh + 0.003 * _hi), _fl(_s - 0.01 * _sh + 0.02 * _hi)], 1)   # BGR: slight teal shadows / warm highlights
GRADE = (GRADE * 255).astype(np.uint8)[:, None, :]
PRE = os.environ.get('NEWS_PREFLIGHT'); PRE_IDS = {'hook'} | {next((x['id'] for x in S[1:] if not x['other'] and x['who'] == w and x['lines']), 'hook') for w in ('ama', 'carlos')}
PRE_D = f'{N}/pre_{LID}'; os.makedirs(PRE_D, exist_ok=True) if PRE else None
for s in S:
    if PRE and s['id'] not in PRE_IDS: continue
    HS = [(s['clip'], s['who'], s['lines'], s['raw'], s['frame'])] + ([(s['other'], 'carlos' if s['who'] == 'ama' else 'ama', [], False, 'two')] if s['other'] else [])
    if s['other']: HS[0] = HS[0][:4] + ('two',)
    R_ = []; logs = []; s['xfs'] = {}; s['mouths'] = []
    for clip, who, lines, raw, frame in HS:
        fr, al, log, top = host_frames(s, clip, who, lines, raw); gk = GK(clip, who); xf = place(s['id'], gk, frame, top); s['xfs'][clip] = list(xf); s.setdefault('faceh', {})[who] = round(FACEH[gk] * xf[0]); s.setdefault('lowsrc', {})[who] = round(xf[2] + (VBOT(frame) - xf[4]) / xf[0]); s.setdefault('lowlim', {})[who] = SEAT[gk]; _fb = json.load(open(f'{TL}/meta/{clip}/{who}/mouth.json'))['face_box'] if not raw else ([380, 170, 850, 850] if who == 'ama' else [395, 480, 720, 865]); s.setdefault('faceboxes', []).append([(_fb[0] - xf[1]) * xf[0] + xf[3], (_fb[1] - xf[2]) * xf[0] + xf[4], (_fb[2] - xf[1]) * xf[0] + xf[3], (_fb[3] - xf[2]) * xf[0] + xf[4]]); R_.append((fr, al, xf, who)); logs.append(log)
        if not raw: s['mouths'].append([clip, who])
    def _band(al, xf, dy):   # worst mean alpha (over the shot's frames) of the torso band at frame rows 1900..1958 (= 2 % below the bottom), mapped back to source rows
        sc, ex, sy, ox, oy = xf; k_ = al[0].shape[1] // 1080; VB = VBOT('two' if s['other'] else s['frame']); rows = np.clip(((sy + (np.arange(VB - 20, VB + 40, 4) - oy - dy) / sc) * k_).astype(int), 0, al[0].shape[0] - 1); c0, c1 = int((ex - 60 / sc) * k_), int((ex + 60 / sc) * k_)
        return min(float(m[rows, c0:c1].mean()) for m in al[::2])
    DY = 0
    while DY < 160 and min(_band(al, xf, DY) for fr, al, xf, who in R_) < 0.95: DY += 8   # whole composition down (both hosts: equal heads + eye line kept)
    if DY:
        print('bottom anchor: shot', s['id'], 'shifted down', DY, 'px')
        R_ = [(fr, al, xf[:4] + (xf[4] + DY,), who) for fr, al, xf, who in R_]; s['xfs'] = {c: v[:4] + [v[4] + DY] for c, v in s['xfs'].items()}
        s['faceboxes'] = [[b[0], b[1] + DY, b[2], b[3] + DY] for b in s['faceboxes']]; s['lowsrc'] = {w: round(v - DY / s['xfs'][c][0]) for (w, v), c in zip(s['lowsrc'].items(), s['xfs'])}
    s['bottom_dy'] = DY
    k_ = 0; merged = [dict() for _ in range(s['n'])]
    for (clip, who, lines, raw, frame), log in zip(HS, logs):
        if raw: continue
        for j in range(s['n']): merged[j][str(k_)] = log[j].get(0, 'X'); merged[j]['r%d' % k_] = log[j].get('r0', 0)
        k_ += 1
    s['outfit'] = {w_: OUTFIT.get(c_, 'outfit1') for c_, w_, *_ in HS}   # QA: one outfit per host per clip
    json.dump(merged, open(f'{RD}/{s["id"]}.vis.json', 'w')); s['vis'] = f'{RD}/{s["id"]}.vis.json'
    order = sorted(range(len(R_)), key=lambda i: R_[i][3] == 'ama')   # Ama (screen-left, front) composited last
    SAMP = os.environ.get('NEWS_SAMPLE')   # smoke test (Mac): composite 1 frame per shot, repeat it
    for j in range(s['n']):
        if PRE:
            if j != s['n'] // 2: continue
            fi = int(round(s['t0'] * FPS)) + j
        t = fi / FPS; u = j / max(1, s['n'] - 1); drift = 0.0
        if SAMP and j > 0: enc.stdin.write(out.tobytes()); fi += 1; continue
        B = bg_frame(s, j, t); FRs = []; bot = []; AL = []
        if j == 0: BGC.append(dict(shot=s['id'], bgr=[round(float(v), 2) for v in B.reshape(-1, 3).mean(0)]))   # continuity QA: mean bg colour per shot
        if EXPO is None:   # one background exposure per lesson, fixed BEFORE frame 0: graded bg mean -> target so that bg 70 % + hosts 30 % (~0.35) lands near 0.48
            tg_ = (0.48 - 0.3 * 0.35) / 0.7; HOSTG = 1.0
            EXPO = min([(abs(cv2.LUT((B * g_).clip(0, 255).astype(np.uint8), GRADE).mean() / 255 - tg_), g_) for g_ in np.arange(0.6, 2.81, 0.03)])[1]; print('bg exposure gain %.2f' % EXPO)
        B = B * EXPO
        for i in order:
            fr, al, (sc, cx, cy, ox, oy), who = R_[i]; pz_ = PZ(s, j); k_ = fr[j].shape[1] // 1080; f, a = comp(fr[j], al[j], sc * pz_ / k_, cx * k_, cy * k_, 540 + (ox - 540) * pz_, 960 + (oy - 960) * pz_, drift)   # x2 layers: half the scale, doubled anchor   # hook punch-in about the frame centre
            sh = qblur(a, 16); sh = np.roll(np.roll(sh, 16, 0), 10, 1)[..., None] * 0.38
            B = B * (1 - sh) + np.array([30, 24, 14], np.float32) * sh
            ao = qblur(a, 45)[..., None] * 0.22; B = B * (1 - ao)   # ambient occlusion / contact shadow around the body
            B0 = B.copy()
            f = f.astype(np.float32)
            if (s['id'], i) not in KEYM:   # soft key-light match: host colour temperature + brightness pulled 20 % toward the background behind it
                m_ = a > 0.9; ring_ = (cv2.dilate((a > 0.5).astype(np.uint8), np.ones((61, 61), np.uint8)) > 0) & ~m_
                hm_ = f[m_].mean(0) + 1; bm_ = B[ring_].mean(0) + 1; KEYM[(s['id'], i)] = np.clip((bm_ / hm_) ** 0.2, 0.92, 1.08) * np.clip((bm_.mean() / hm_.mean()) ** 0.15, 0.94, 1.10)
            f = f * KEYM[(s['id'], i)] * 1.06 * HOSTG   # +6 % key (owner: brighter, real-camera exposure)
            if (s['id'], i, 'c') not in KEYM:   # contrast match + light direction from the background (left vs right third)
                m_ = a > 0.9; hs_ = float(f[m_].std()) + 1; bs_ = float(B.std()) + 1; L3 = B.mean(2); KEYM[(s['id'], i, 'c')] = (float(np.clip((bs_ / hs_) ** 0.2, 0.92, 1.08)), f[m_].mean(0), 1 if L3[:, 720:].mean() > L3[:, :360].mean() else -1)
            kc_, hm0_, ld_ = KEYM[(s['id'], i, 'c')]; f = hm0_ + (f - hm0_) * kc_
            if who == 'carlos': lum = f.mean(2, keepdims=True); f = f * (1 - 0.16 * np.clip((lum - 150) / 90, 0, 1))
            eo = (a > 0.08) & (a < 0.92); FRs.append(float(((f[..., 1] > f[..., 2] + 25) & (f[..., 1] > f[..., 0] + 25))[eo].mean()) if eo.any() else 0.0)
            f = MR.finish_host(f, a, B, ld_)   # e2922ec5 PRO edge treatment: 3 px subtle rim from the bg light side + 1 px light wrap, no extra despill
            if j % 2 == 0:   # hands: skin-coloured blobs inside the matte below chin + 0.4 face (quarter res) -> per-frame boxes for the no-occlusion QA
                q_ = cv2.resize(f, (270, 480), interpolation=cv2.INTER_AREA).clip(0, 255).astype(np.uint8); aq_ = cv2.resize(a, (270, 480)) > 0.6
                hv_ = cv2.cvtColor(q_, cv2.COLOR_BGR2HSV); sk_ = (hv_[..., 0] <= 25) & (hv_[..., 1] >= 60) & (hv_[..., 2] >= 45) & (hv_[..., 2] <= (190 if who == 'ama' else 255)) & aq_   # Ama: dark skin, not the bright coral blouse
                gk_ = GK(HS[i][0], who); ht_ = HTOP.get(HS[i][0]); ytop_ = (oy + (ht_ - HOST[gk_]['eye'][1]) * sc - 30) if ht_ else (oy + (CHIN.get(gk_, 200) + 0.4 * FACEH[gk_]) * sc)   # hands never above the clip's measured hand_top_min
                sk_[:max(0, int(ytop_ / 4))] = False
                n_, lb_, st_, _ = cv2.connectedComponentsWithStats(sk_.astype(np.uint8))
                HB.setdefault(fi, []).extend([[int(st_[c][0] * 4), int(st_[c][1] * 4), int((st_[c][0] + st_[c][2]) * 4), int((st_[c][1] + st_[c][3]) * 4)] for c in range(1, n_) if st_[c][4] >= 40])
            a3 = a[..., None]; B = MR.over(f * a3, a, B, wrap_px=0); xs = int(np.clip(ox, 80, 1000)); VB = VBOT('two' if s['other'] else s['frame']); bot.append(float(a[VB - 8:VB, xs - 60:xs + 60].mean())); AL.append(a)
        QC.append(dict(t=round(t, 3), fringe=max(FRs), flick=0.0, bottom=min(bot)))
        if j == s['n'] // 2 and len(AL) == 1: EQ.append(dict(shot=s['id'], **MR.edge_qa(B, AL[0], bg=B0)))   # edge QA on the rendered frame (singles)
        if s['other']:   # two-shot: gap between the silhouettes (above the desk)
            if j % 4 == 0 and len(AL) == 2:
                g_ = []
                for y_ in range(300, DESK_Y, 12):
                    ca = [np.nonzero(x_[y_] > 0.5)[0] for x_ in AL]
                    if len(ca[0]) and len(ca[1]): g_.append(int(ca[0].min()) - int(ca[1].max()))   # AL = [Carlos (screen-right), Ama (screen-left)]: Carlos's left edge - Ama's right edge
                QC[-1]['gap'] = min(g_) if g_ else 999
        B = cv2.LUT(B.clip(0, 255).astype(np.uint8), GRADE).astype(np.float32)
        B = B + 0.4 * (B - cv2.GaussianBlur(B, (0, 0), 0.7))   # owner 22/10: mild unsharp (r 0.7, 0.4) before text, compensates the H.264 encode
        if False:   # (exposure is fixed before frame 0 now - the frame-0 re-aim made a 22 % luma jump at frame 1) small host lift -> mean luma ~0.48
            m_ = float(B.mean()) / 255
            if not 0.45 <= m_ <= 0.52: EXPO = float(np.clip(EXPO * (0.48 / m_) ** 1.3, 0.55, 2.8)); HOSTG = float(np.clip((0.48 / m_) ** 0.6, 0.95, 1.25)); print('frame-0 luma %.3f -> bg gain %.2f, host gain %.2f' % (m_, EXPO, HOSTG))                         # one grade for host + background
        pass   # hook punch-in is done in camera space (host scale + bg zoom: one resample, no softening)
        TR = STYLE.get('transition', 'cut'); k_s = S.index(s)
        if k_s > 0 and PREV_OUT is not None and TR == 'dissolve' and j < 4: B = B * ((j + 1) / 5) + PREV_OUT * (1 - (j + 1) / 5)   # 4-frame dissolve
        elif k_s > 0 and TR == 'whip' and j < 3: B = cv2.filter2D(B, -1, np.ones((1, 31 - 10 * j), np.float32) / (31 - 10 * j))   # whip: horizontal motion blur settling in 3 frames
        elif k_s > 0 and TR == 'zoom' and j < 4: z2 = 1.05 - 0.0125 * j; B = cv2.warpAffine(B, np.float32([[z2, 0, 540 * (1 - z2)], [0, z2, 960 * (1 - z2)]]), (1080, 1920), flags=cv2.INTER_LINEAR)
        if j == s['n'] - 1: PREV_OUT = B.copy()
        img = Image.fromarray(cv2.cvtColor(B.clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)).convert('RGBA')
        for o in OVS:
            if o['t'][0] - 1e-6 <= t < o['t'][1] - 1e-6 and o['_img'] is not None:
                im = o['_img'](t) if callable(o['_img']) else o['_img']; age = t - o['t'][0]
                if o['style'] not in ('Cap',) and age < 0.16 and not o.get('_chain'):
                    k = age / 0.16; im = im.copy(); im.putalpha(im.split()[3].point(lambda v: int(v * k)))
                img.alpha_composite(im)
        out = cv2.cvtColor(np.array(img.convert('RGB')), cv2.COLOR_RGB2BGR)
        if fi == int(0.9 * FPS): COVER = out.copy()
        if j == s['n'] // 2: cv2.imwrite(f'{RD}/ref_{fi:05d}.png', out)   # pre-encode reference for the SSIM gate
        if PRE: cv2.imwrite(f'{PRE_D}/{s["id"]}.jpg', cv2.resize(out, (432, 768), interpolation=cv2.INTER_AREA), [cv2.IMWRITE_JPEG_QUALITY, 82]); continue
        enc.stdin.write(out.tobytes()); fi += 1
if PRE: enc.stdin.close(); enc.wait(); print('preflight frames', sorted(os.listdir(PRE_D))); sys.exit(0)
enc.stdin.close(); enc.wait()
# ------------------------------------------------------------------ audio: line wavs + studio room tone + sfx -> -16 LUFS
# owner 22/10 "tiếng ồn lớn quá": the VOICE stem alone is normalised to -16 LUFS (digital silence in pauses stays silent), then the quiet bed
# (room tone AMB_DB, default -40 dB) and SFX (-8 dB vs v3) are mixed in AFTER normalisation, so loudnorm never lifts the bed in the pauses
FD = f'{TL}/foley/'; ins = ['-i', FD + 'tone0.wav', '-stream_loop', '-1', '-i', AMB]; vl = []; fl = []; k = 2
for s in S:
    for ln in s['lines']:
        ms = int(round((s['t0'] + ln['at']) * 1000)); ins += ['-i', f'{N}/vis3/{ln["id"]}.wav']; fl.append(f'[{k + 1}]highpass=f=80,equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=2,' + (f'atempo={ln["tempo"]},' if ln['tempo'] != 1 else '') + f'adelay={ms}|{ms}[v{k}]'); vl.append(f'[v{k}]'); k += 1
fl.append(f'[1]adelay=0|0[s0]'); fl.append(''.join(vl) + f'[s0]amix=inputs={len(vl) + 1}:normalize=0:duration=longest,apad=whole_dur={TOTAL:.3f},atrim=0:{TOTAL:.3f},loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[voice]')
bl = ['[voice]', '[b1]']; fl.append(f'[2]volume={AMB_DB}dB,atrim=0:{TOTAL:.3f},aresample=48000[b1]')
for f_, t_ in SFX:
    ms = int(round(max(0, t_) * 1000)); ins += ['-i', FD + f_]; fl.append(f'[{k + 1}]volume={-22 if f_ == "pop.wav" else -8 if t_ == 0 else -25}dB,adelay={ms}|{ms},aresample=48000[x{k}]'); bl.append(f'[x{k}]'); k += 1
fl.append(''.join(bl) + f'amix=inputs={len(bl)}:normalize=0:duration=first,atrim=0:{TOTAL:.3f},alimiter=limit=0.89:level=0[out]')
os.makedirs(f'{OUTD}/covers', exist_ok=True); OUTF = f'{OUTD}/{META["out"]}'
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-threads', '2', '-i', f'{RD}/video.mp4'] + ins + ['-filter_complex', ';'.join(fl), '-map', '0:v', '-map', '[out]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-t', f'{TOTAL:.3f}', OUTF], check=True)
_lu = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', subprocess.run(['ffmpeg', '-nostdin', '-threads', '2', '-i', OUTF, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr)[-1])
if abs(_lu + 14) > 0.3:   # linear make-up gain to -16 LUFS (the bed stays as far below the voice as mixed)
    os.replace(OUTF, OUTF + '.tmp.mp4'); subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', OUTF + '.tmp.mp4', '-c:v', 'copy', '-af', f'volume={-14 - _lu:.2f}dB,alimiter=limit=0.89:level=0', '-c:a', 'aac', '-b:a', '192k', OUTF], check=True); os.remove(OUTF + '.tmp.mp4')
    print(f'loudness {_lu:.1f} LUFS -> make-up {-14 - _lu:+.1f} dB')
cv2.imwrite(f'{OUTD}/covers/' + os.path.basename(OUTF).replace('.mp4', '.jpg'), COVER if COVER is not None else out, [cv2.IMWRITE_JPEG_QUALITY, 95])   # cover from the pre-encode master frame, q95
for o in OV: o.pop('_img', None); o.pop('_chain', None)
json.dump(dict(lesson=dict(META, out=META['out']), shots=[{k: v for k, v in s.items()}  for s in S],
               overlays=OV, safe=SAFE, viral=True, punch={'hook': 0.0}, hook_kind='question', qa=QA, scene=TOTAL, total=TOTAL, end=0, endcard_boxes=[], sfx=SFX, avoid={}),
          open(f'{RD}/timeline.json', 'w'), indent=1)
json.dump(dict(bg_fill_visible_max=max(q['fill'] for q in BQA), bg_uncovered_max=max(q['uncovered'] for q in BQA), bottom_min=min(q['bottom'] for q in QC), two_gap_min=min([q['gap'] for q in QC if 'gap' in q] or [999]), fringe_max=max(q['fringe'] for q in QC), edge=EQ, bg_colour=BGC, hands={str(k): v for k, v in HB.items()}, flicker_max=max(q['flick'] for q in QC), flicker_mean=float(np.mean([q['flick'] for q in QC])), frames=len(QC)), open(f'{RD}/qc.json', 'w'))
print('done', OUTF, f'{TOTAL:.2f} s', len(S), 'shots')
