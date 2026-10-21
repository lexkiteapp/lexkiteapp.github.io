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
LID = sys.argv[1]; FPS = 24; W, H = 1080, 1920
SAFE = dict(x0=60, x1=1020, y0=230, y1=1500)
TEXT = {l['id']: l['text'] for l in json.load(open(f'{N}/ci/lines.json'))['lines']}
CUES = {k: json.load(open(f'{N}/vis3/{k}.json'))['mouthCues'] for k in TEXT if os.path.exists(f'{N}/vis3/{k}.json')}   # lines of this job's lessons only
FB = f'{ROOT}/brand/social/src/fonts/BeVietnamPro-ExtraBold.ttf'; FH = f'{ROOT}/brand/social/src/fonts/BricolageGrotesque-ExtraBold.ttf'
TEAL, TEAL2, ORANGE, YEL, INK, CREAM = (15, 61, 62), (23, 89, 90), (229, 80, 47), (255, 201, 74), (34, 36, 44), (255, 247, 236)
# hosts: face centre + face width in source px (1080x1920 after lipsync.finish), alpha fade line (source y) below the hands / above the seat
HOST = {'ama': dict(eye=(615, 613)), 'carlos': dict(eye=(557, 686))}   # eye line in source px (1080x1920 after lipsync.finish)
FRAME = {('ama', 'mcu'): (1.30, 640), ('ama', 'wide'): (1.22, 650), ('carlos', 'mcu'): (1.75, 640), ('carlos', 'wide'): (1.65, 650)}   # v4 (owner 21/10): chest-up, equal face height (Carlos face = 0.74 x Ama in source), equal eye line
def font(p, s): return ImageFont.truetype(p, s)
def speech(k): nx = [x for x in CUES[k] if x['value'] != 'X']; return nx[0]['start'], nx[-1]['end']
def wdur(k): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{N}/vis3/{k}.wav']))
S, OV, SFX = [], [], []
def line_tempo(line):   # caption reading speed <= 15 cps -> slow the line (>= 0.84x; news_voice.py re-synthesises lines that would need more)
    s0, s1 = speech(line); need = len(TEXT[line]) / 14.0 - 0.5
    return 1.0 if need <= s1 - s0 else max(0.84, round((s1 - s0) / need - 0.005, 3))
def talk_dur(line, at, breath=0.45, tempo=None): return at + speech(line)[1] / (tempo or line_tempo(line)) + breath
def shot(id, clip, who, frame, bg, line=None, dur=None, at=0.07, breath=0.45, frames=None, raw=False, other=None, tempo=None):
    """talk shot (line) = at + speech end + breath; hold shot = dur. frames: source indices (ping-pong through the clip by default)."""
    if line:
        tempo = tempo or line_tempo(line); dur = talk_dur(line, at, breath, tempo)
    tempo = tempo or 1.0
    n = int(round(dur * FPS)); t0 = sum(x['dur'] for x in S)
    if frames is None:
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
    im = layer(); d = ImageDraw.Draw(im); w = 940; x0 = (W - w) // 2
    f, fs = fit(d, txt, FB, 66, w - 80); th = 66 if True else fs
    lines = [txt]
    if d.textlength(txt, font=f) > w - 80 or fs < 58:   # wrap to 2 lines at 60 px
        f = font(FB, 60); fs = 60; ws = txt.split(); best = None
        for i in range(1, len(ws)):
            a, b = ' '.join(ws[:i]), ' '.join(ws[i:]); m = max(d.textlength(a, font=f), d.textlength(b, font=f))
            if best is None or m < best[0]: best = (m, [a, b])
        lines = best[1]
    h = 92 + len(lines) * (fs + 16) + 24
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 30, fill=(255, 255, 255, 250), outline=INK + (255,), width=5)
    lab = title or f'PHRASE {num}'; lf = font(FH, 38); lw = d.textlength(lab, font=lf) + 44
    d.rounded_rectangle([x0 + 30, y0 + 24, x0 + 30 + lw, y0 + 80], 28, fill=ORANGE + (255,)); d.text((x0 + 52, y0 + 30), lab, font=lf, fill=(255, 255, 255))
    y = y0 + 98
    for ln in lines:
        d.text((W // 2, y), ln, font=f, fill=INK, anchor='ma'); y += fs + 16
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
def mark(d, cx, cy, r, ok):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=((40, 160, 90) if ok else (214, 48, 49)) + (255,))
    if ok: d.line([(cx - r * .45, cy + r * .02), (cx - r * .1, cy + r * .38), (cx + r * .5, cy - r * .35)], fill='white', width=int(r * .26), joint='curve')
    else:
        k = r * .38; d.line([(cx - k, cy - k), (cx + k, cy + k)], fill='white', width=int(r * .26)); d.line([(cx - k, cy + k), (cx + k, cy - k)], fill='white', width=int(r * .26))
def card_fix(bad, good, y0=250, show_good=True):
    im = layer(); d = ImageDraw.Draw(im); w = 940; x0 = (W - w) // 2; h = 300
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 30, fill=(255, 255, 255, 250), outline=INK + (255,), width=5)
    f = fit(d, max(bad, good, key=len), FB, 64, w - 190)[0]
    mark(d, x0 + 78, y0 + 82, 40, False); d.text((x0 + 140, y0 + 82), bad, font=f, fill=(150, 150, 158), anchor='lm')
    tw = d.textlength(bad, font=f); d.line([(x0 + 136, y0 + 86), (x0 + 144 + tw, y0 + 86)], fill=(214, 48, 49), width=8)
    if show_good: mark(d, x0 + 78, y0 + 215, 40, True); d.text((x0 + 140, y0 + 215), good, font=f, fill=INK, anchor='lm')
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
CARD_Y = 1050
def card_phrase(num, pattern, note, bad=None, good=None, why=None, y0=CARD_Y):
    im = layer(); d = ImageDraw.Draw(im); w = 960; x0 = (W - w) // 2; h = 272 if bad else 158
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 28, fill=(255, 255, 255, 248), outline=INK + (255,), width=4)
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
def card_one(kind, text, sub=None, num=None, y0=CARD_Y):
    im = layer(); d = ImageDraw.Draw(im); w = 960; x0 = (W - w) // 2; h = 128 + (56 if sub else 0)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 28, fill=(255, 255, 255, 248), outline=INK + (255,), width=4); cy = y0 + 64; tx = x0 + 34
    if kind == 'p':
        lab = num if isinstance(num, str) else f'PHRASE {num}'; lf = font(FH, 30); lw = d.textlength(lab, font=lf) + 32
        d.rounded_rectangle([x0 + 26, cy - 22, x0 + 26 + lw, cy + 22], 22, fill=ORANGE + (255,)); d.text((x0 + 42, cy), lab, font=lf, fill='white', anchor='lm'); tx = x0 + 46 + lw
    else: mark(d, x0 + 64, cy, 30, kind == 'v'); tx = x0 + 112
    f = fit(d, text, FB, 52, x0 + w - 30 - tx)[0]; d.text((tx, cy), text, font=f, fill=(150, 150, 158) if kind == 'x' else INK, anchor='lm')
    if kind == 'x': tw = d.textlength(text, font=f); d.line([(tx - 4, cy + 3), (tx + tw + 4, cy + 3)], fill=(214, 48, 49), width=7)
    if sub: d.text((tx, cy + 64), sub, font=font(FB, 40), fill=TEAL2, anchor='lm')
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
def card_recap(title, rows, y0=CARD_Y):
    im = layer(); d = ImageDraw.Draw(im); w = 960; x0 = (W - w) // 2; rh = 42; h = 66 + rh * len(rows) + 8
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 30, fill=(255, 255, 255, 250), outline=INK + (255,), width=5)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + 62], 30, fill=TEAL + (255,)); d.rectangle([x0, y0 + 34, x0 + w, y0 + 62], fill=TEAL + (255,))
    d.text((W // 2, y0 + 31), title, font=font(FH, 38), fill=(255, 255, 255), anchor='mm')
    f = fit(d, max(rows, key=len), FB, 40, w - 150)[0]
    for i, r in enumerate(rows):
        cy = y0 + 66 + i * rh + rh // 2; d.ellipse([x0 + 30, cy - 20, x0 + 70, cy + 20], fill=ORANGE + (255,)); d.text((x0 + 50, cy), str(i + 1), font=font(FH, 28), fill='white', anchor='mm')
        d.text((x0 + 112, cy), r, font=f, fill=INK, anchor='lm')
    return shadowed(im), (x0, y0, x0 + w, y0 + h)
def hook_card(txt, sub, y0=CARD_Y):
    im = layer(); d = ImageDraw.Draw(im); f, fs = fit(d, txt, FH, 88, 920, 84)
    tw = d.textlength(txt, font=f); bx = (W - tw) / 2 - 36
    d.rounded_rectangle([bx, y0, bx + tw + 72, y0 + fs + 52], 26, fill=ORANGE + (255,))
    d.text((W // 2, y0 + 22), txt, font=f, fill='white', anchor='ma')
    return shadowed(im), (int(bx), y0, int(bx + tw + 72), y0 + fs + 52), fs   # v4: one line only (layout zone)
def series_bar(top, sub, y0=1410, prog=1.0):
    """US-broadcast lower third: orange tag block + dark-teal strip with white title, thin yellow rule; slides in from the left."""
    im = layer(); d = ImageDraw.Draw(im); x0 = 60; tf = font(FH, 44); sf = font(FB, 38)
    tw = d.textlength(top, font=tf) + 48; sw = d.textlength(sub, font=sf) + 56; full = tw + sw
    off = int((1 - prog) * -(full + 80))
    d.rectangle([x0 + off, y0, x0 + off + tw, y0 + 76], fill=ORANGE + (255,)); d.text((x0 + off + 24, y0 + 38), top, font=tf, fill='white', anchor='lm')
    d.rectangle([x0 + off + tw, y0, x0 + off + full, y0 + 76], fill=TEAL + (240,)); d.text((x0 + off + tw + 28, y0 + 38), sub, font=sf, fill=CREAM, anchor='lm')
    d.rectangle([x0 + off, y0 + 76, x0 + off + full, y0 + 84], fill=YEL + (255,))
    return im, (x0, y0, int(x0 + full), y0 + 84)
def ring_card(txt, prog, y0=CARD_Y + 40):
    im = layer(); d = ImageDraw.Draw(im); f = font(FH, 56); tw = d.textlength(txt, font=f); w = tw + 190; x0 = (W - w) / 2
    d.rounded_rectangle([x0, y0, x0 + w, y0 + 124], 62, fill=(255, 255, 255, 250), outline=INK + (255,), width=5)
    cx, cy, r = x0 + 72, y0 + 62, 38; d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(225, 225, 230), width=10)
    d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * prog, fill=ORANGE, width=10)
    d.rounded_rectangle([cx - 16, cy - 12, cx + 16, cy + 10], 6, fill=TEAL); d.polygon([(cx - 8, cy + 8), (cx - 12, cy + 20), (cx + 4, cy + 9)], fill=TEAL)
    d.text((x0 + 130, y0 + 62), txt, font=f, fill=INK, anchor='lm')
    return shadowed(im), (int(x0), y0, int(x0 + w), y0 + 124)
def follow_chip(y0=CARD_Y + 60):
    im = layer(); d = ImageDraw.Draw(im); f = font(FH, 50); t = 'Follow for more'; tw = d.textlength(t, font=f); x0 = (W - tw - 80) / 2
    d.rounded_rectangle([x0, y0, x0 + tw + 80, y0 + 96], 48, fill=ORANGE + (255,)); d.text((W // 2, y0 + 48), t, font=f, fill='white', anchor='mm')
    return shadowed(im), (int(x0), y0, int(x0 + tw + 80), y0 + 96)
# karaoke caption: one line per page, current word yellow; pages split so each fits 900 px at >= 74 px
CAP_Y = 1288
def cap_pages(txt, fs=78):
    d = ImageDraw.Draw(layer()); f = font(FB, fs); ws = txt.split(); pages, cur = [], []
    for w_ in ws:
        if cur and d.textlength(' '.join(cur + [w_]), font=f) > 900: pages.append(cur); cur = []
        cur.append(w_)
    pages.append(cur); return pages
def cap_img(words, k, fs=78):
    im = layer(); d = ImageDraw.Draw(im); f = font(FB, fs); txt = ' '.join(words); tw = d.textlength(txt, font=f); x = (W - tw) / 2
    for i, w_ in enumerate(words):
        d.text((x, CAP_Y), w_, font=f, fill=YEL if i == k else (255, 255, 255), stroke_width=9, stroke_fill=(20, 22, 28))
        x += d.textlength(w_ + ' ', font=f)
    return im, (int((W - tw) / 2) - 9, CAP_Y - 9, int((W + tw) / 2) + 9, CAP_Y + int(fs * 1.25))
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
        pages = cap_pages(TEXT[k]); i0 = 0
        for pi, pw in enumerate(pages):
            for j in range(len(pw)):
                gi = i0 + j; t0 = a - 0.095 if gi == 0 else edges[gi]; last = gi == len(ws) - 1
                t1 = b + 0.39 if last else edges[gi + 1]
                im, box = cap_img(pw, j); ov('Cap', TEXT[k], t0, t1, box, s['id'], line=k, part=gi, fs=78, img=im)
            i0 += len(pw)
# ------------------------------------------------------------------ lesson script
if os.path.exists(f'{N}/lessons/{LID}.json'): SPEC = json.load(open(f'{N}/lessons/{LID}.json')); exec(open(f'{HERE}/news_tpl.py').read())   # generated (gen_news.py)
else: exec(open(f'{N}/lessons/{LID}.py').read())
TOTAL = sum(x['dur'] for x in S); NF = int(round(TOTAL * FPS))
for s in S: captions(s)
if os.environ.get('NEWS_DRY'):   # dry run (Mac): timeline only, no frames
    for s in S: print(f"{s['t0']:6.2f} {s['dur']:5.2f} {s['id']:7s} {s['clip']:14s} {s['who']:6s} {s['frame']}")
    for o in OV:
        if o['style'] != 'Cap': print('  ', o['style'], o['t'], o['box'], o['text'][:50])
    print('TOTAL', round(TOTAL, 2)); sys.exit(0)
# ------------------------------------------------------------------ host frames (mouth swap on the keyed full-frame clip) + alpha
RD = f'{N}/render5_{LID}_en'; os.makedirs(RD, exist_ok=True)
def finish_mask(M): x, y, w, h = L.WM_CROP; return cv2.resize(M[y:y + h, x:x + w], (1080, 1920), interpolation=cv2.INTER_LINEAR)
def host_frames(s, clip, who, lines, raw):
    mo = [] if raw else [dict(mouth=L.Mouth(f'{TL}/meta/{clip}/{who}'), lines=[dict(cues=CUES[l['id']], at=l['at'], tempo=l['tempo']) for l in lines])]
    fr, log = L.render(f'{G}/kfull/{clip}.mp4', s['frames'], speakers=mo)
    cap = cv2.VideoCapture(f'{G}/kmask/{clip}.mp4'); MM = []
    while True:
        ok, M = cap.read()
        if not ok: break
        MM.append(M[..., 0])
    ramp = 1.0
    al = []
    for i in s['frames']:
        m = finish_mask(MM[min(i, len(MM) - 1)]).astype(np.float32) / 255
        low = m[1250:]; low = cv2.morphologyEx(low, cv2.MORPH_OPEN, np.ones((9, 9), np.uint8)); m[1250:] = low   # thin seat/bench specks
        if clip.startswith('ga2'): m[1400:] = cv2.morphologyEx(m[1400:], cv2.MORPH_CLOSE, np.ones((1, 49), np.uint8))   # standing Ama: close the <= 48 px gap between hands/legs (kfull is black there) so the torso stays opaque to the frame bottom
        al.append(m * ramp)
    tops = [int(np.argmax((m[:, 300:800] > 0.5).any(1))) for m in al[::4]]; top = HAIR.setdefault(clip, int(np.median(tops)))
    return fr, al, log, top
HAIR = {}
SIDE = {('ama', 'mcu'): 500, ('ama', 'wide'): 490, ('carlos', 'mcu'): 580, ('carlos', 'wide'): 590, ('ama', 'two'): 290, ('carlos', 'two'): 830}   # 180-degree rule: Ama screen-left, Carlos screen-right
FRAME.update({('ama', 'two'): (1.22, 660), ('carlos', 'two'): (1.65, 660)})
FACEH = {'ama': 370, 'carlos': 274}; SEAT = {'ama': 1660, 'carlos': 1560}
# standing Ama (green/README-standing.md, ga2_*): head 1.31x Carlos in source -> layer x0.765 of Carlos's scale = equal head size, eye line ~ Carlos; no seat
HOST['ama_s'] = dict(eye=(530, 680)); FACEH['ama_s'] = 358; SEAT['ama_s'] = 1916
for _f in ('mcu', 'wide', 'two'): FRAME[('ama_s', _f)] = (round(FRAME[('carlos', _f)][0] * 0.765, 4), FRAME[('carlos', _f)][1]); SIDE[('ama_s', _f)] = SIDE[('ama', _f)]
GK = lambda clip, who: 'ama_s' if clip.startswith('ga2') else who   # source face height (brow-chin); lowest source row allowed in frame (above lap / seat)
def place(sid, who, frame, top):
    sc, ey = FRAME[(who, frame)]; ex, sy = HOST[who]['eye']; low = sy + (1920 - ey) / sc
    assert low <= SEAT[who] and low < 1900, ('seat/lap would be visible or body ends in frame', sid, who, low)
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
for x in S:   # angle = two-shot / Ama single / Carlos single; each angle has its own background crop (side) and its own continuous push-in
    ang = 'two' if x['other'] else x['who']; z0 = ANG.get(ang, 1.10); z1 = z0 + 0.011 * x['dur']; side = {'two': 0, 'ama': -26, 'carlos': 26}[ang]
    x['cam'] = dict(z=(z0, z1), tx=(side, side), ty=(0, 0), rot=(0, 0)); ANG[ang] = z1; x['angle'] = ang
if S[-1]['id'] == 'loop':   # loop: the two-shot settles back to the hook's first camera state (last frame == first frame)
    S[-1]['cam']['z'] = (S[-1]['cam']['z'][0], S[0]['cam']['z'][0])
ease = bg3d.ease
def cam_at(s, u):
    m = s['cam']; e = bg3d.ease(u); return {k: m[k][0] + (m[k][1] - m[k][0]) * e for k in ('z', 'tx', 'ty', 'rot')}
BOK = bg3d.Bokeh(); BQA = []; ZONES = [[36, 1006, 1044, 1524]]   # card + caption + lower-third band (+24 px)
def bg_frame(s, j, t):
    u = j / max(1, s['n'] - 1); L_ = layers(s['bg']); qa = j % 6 == 0
    r = L_.render(cam_at(s, u), qa=qa); B = r[0] if qa else r
    if qa: BQA.append(dict(t=round(t, 2), fill=r[1], uncovered=r[2]))
    k = S.index(s); D = 7
    if k > 0 and S[k - 1]['bg'] != s['bg'] and j < D:   # cross-dissolve 7 frames, outgoing camera keeps moving (zoom-through) with 3-sample motion blur
        p = S[k - 1]; w = bg3d.ease((j + 1) / (D + 1)); acc = 0
        for d in (-0.5, 0, 0.5):
            c = cam_at(p, 1.0); c['z'] *= 1 + 0.006 * (j + 1 + d); acc = acc + layers(p['bg']).render(c)
        B = acc / 3 * (1 - w) + B * w
    BOK.avoid = ZONES + [[b[0] - 24, b[1] - 24, b[2] + 24, b[3] + 24] for b in s.get('faceboxes', [])]
    return BOK.apply(B, t) * bg3d.VIG
GRAIN = [np.random.default_rng(5 + i).normal(0, 2.6, (960, 540)).astype(np.float32) for i in range(6)]
SEG = [[x['bg'], x['t0'], x['t0'] + x['dur'], 1] for x in S]
for k_, x in enumerate(S[1:], 1):
    if S[k_ - 1]['bg'] != x['bg']: SFX.append(('whoosh.wav', round(x['t0'] - 0.12, 3)))
# ------------------------------------------------------------------ render
BOT = np.clip((np.arange(1920) - 1640) / 280.0, 0, 1)[:, None, None] ** 1.4 * 0.78   # bottom studio gradient (hides waist fade, UI legibility)
def comp(F, Al, sc, cx, cy, ox, oy, drift):
    M = np.float32([[sc, 0, ox - cx * sc + drift], [0, sc, oy - cy * sc]])
    f = cv2.warpAffine(F, M, (1080, 1920), flags=cv2.INTER_LINEAR); a = cv2.warpAffine(Al, M, (1080, 1920), flags=cv2.INTER_LINEAR)
    return f, a
enc = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1080x1920', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-threads', '2', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', f'{RD}/video.mp4'], stdin=subprocess.PIPE)
OVS = sorted(OV, key=lambda o: o['t'][0]); fi = 0; COVER = None; QC = []; PA = None
_x = np.arange(256) / 255.0; _s = np.clip(_x - 0.30 * np.sin(2 * np.pi * _x) / (2 * np.pi), 0, 1)   # gentle S-curve (+-4.8 %)
_sh = np.clip(1 - _x * 2.2, 0, 1); _hi = np.clip(_x * 2 - 1.1, 0, 1)                    # shadow / highlight weights
GRADE = np.stack([np.clip(_s + 0.035 * _sh - 0.02 * _hi, 0, 1), np.clip(_s + 0.015 * _sh + 0.005 * _hi, 0, 1), np.clip(_s - 0.02 * _sh + 0.03 * _hi, 0, 1)], 1)   # BGR: teal shadows, warm highlights
GRADE = (GRADE * 255).astype(np.uint8)[:, None, :]
for s in S:
    HS = [(s['clip'], s['who'], s['lines'], s['raw'], s['frame'])] + ([(s['other'], 'carlos' if s['who'] == 'ama' else 'ama', [], False, 'two')] if s['other'] else [])
    if s['other']: HS[0] = HS[0][:4] + ('two',)
    R_ = []; logs = []; s['xfs'] = {}; s['mouths'] = []
    for clip, who, lines, raw, frame in HS:
        fr, al, log, top = host_frames(s, clip, who, lines, raw); gk = GK(clip, who); xf = place(s['id'], gk, frame, top); s['xfs'][clip] = list(xf); s.setdefault('faceh', {})[who] = round(FACEH[gk] * xf[0]); s.setdefault('lowsrc', {})[who] = round(xf[2] + (1920 - xf[4]) / xf[0]); s.setdefault('lowlim', {})[who] = SEAT[gk]; _fb = json.load(open(f'{TL}/meta/{clip}/{who}/mouth.json'))['face_box'] if not raw else ([380, 170, 850, 850] if who == 'ama' else [395, 480, 720, 865]); s.setdefault('faceboxes', []).append([(_fb[0] - xf[1]) * xf[0] + xf[3], (_fb[1] - xf[2]) * xf[0] + xf[4], (_fb[2] - xf[1]) * xf[0] + xf[3], (_fb[3] - xf[2]) * xf[0] + xf[4]]); R_.append((fr, al, xf, who)); logs.append(log)
        if not raw: s['mouths'].append([clip, who])
    def _band(al, xf, dy):   # worst mean alpha (over the shot's frames) of the torso band at frame rows 1900..1958 (= 2 % below the bottom), mapped back to source rows
        sc, ex, sy, ox, oy = xf; rows = np.clip((sy + (np.arange(1900, 1960, 4) - oy - dy) / sc).astype(int), 0, 1919); c0, c1 = int(ex - 60 / sc), int(ex + 60 / sc)
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
    json.dump(merged, open(f'{RD}/{s["id"]}.vis.json', 'w')); s['vis'] = f'{RD}/{s["id"]}.vis.json'
    order = sorted(range(len(R_)), key=lambda i: R_[i][3] == 'ama')   # Ama (screen-left, front) composited last
    SAMP = os.environ.get('NEWS_SAMPLE')   # smoke test (Mac): composite 1 frame per shot, repeat it
    for j in range(s['n']):
        t = fi / FPS; u = j / max(1, s['n'] - 1); drift = 0.0
        if SAMP and j > 0: enc.stdin.write(out.tobytes()); fi += 1; continue
        B = bg_frame(s, j, t); FRs = []; bot = []
        for i in order:
            fr, al, (sc, cx, cy, ox, oy), who = R_[i]; f, a = comp(fr[j], al[j], sc, cx, cy, ox, oy, drift)
            sh = cv2.GaussianBlur(a, (0, 0), 16); sh = np.roll(np.roll(sh, 16, 0), 10, 1)[..., None] * 0.38
            B = B * (1 - sh) + np.array([30, 24, 14], np.float32) * sh
            f = f.astype(np.float32)
            if who == 'carlos': lum = f.mean(2, keepdims=True); f = f * (1 - 0.16 * np.clip((lum - 150) / 90, 0, 1))
            band = np.clip(a - cv2.GaussianBlur(a, (0, 0), 6), 0, 1)[..., None] * 1.6
            f[..., 1] = np.where(a < 0.97, np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2]) + 10), f[..., 1])
            eo = (a > 0.08) & (a < 0.92); FRs.append(float(((f[..., 1] > f[..., 2] + 25) & (f[..., 1] > f[..., 0] + 25))[eo].mean()) if eo.any() else 0.0)
            bgb = cv2.GaussianBlur(B, (0, 0), 12); f = f * (1 - 0.35 * band) + bgb * 0.35 * band
            a3 = a[..., None]; B = f * a3 + B * (1 - a3); xs = int(np.clip(ox, 80, 1000)); bot.append(float(a[1912:, xs - 60:xs + 60].mean()))
        QC.append(dict(t=round(t, 3), fringe=max(FRs), flick=0.0, bottom=min(bot)))
        B = B * (1 - BOT) + np.array([42, 32, 12], np.float32) * BOT
        B = cv2.LUT(B.clip(0, 255).astype(np.uint8), GRADE).astype(np.float32)                         # one grade for host + background
        B = B + cv2.resize(GRAIN[fi % 6], (1080, 1920), interpolation=cv2.INTER_NEAREST)[..., None]
        img = Image.fromarray(cv2.cvtColor(B.clip(0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB)).convert('RGBA')
        for o in OVS:
            if o['t'][0] - 1e-6 <= t < o['t'][1] - 1e-6 and o['_img'] is not None:
                im = o['_img'](t) if callable(o['_img']) else o['_img']; age = t - o['t'][0]
                if o['style'] not in ('Cap',) and age < 0.16 and not o.get('_chain'):
                    k = age / 0.16; im = im.copy(); im.putalpha(im.split()[3].point(lambda v: int(v * k)))
                img.alpha_composite(im)
        out = cv2.cvtColor(np.array(img.convert('RGB')), cv2.COLOR_RGB2BGR)
        if fi == int(0.9 * FPS): COVER = out.copy()
        enc.stdin.write(out.tobytes()); fi += 1
enc.stdin.close(); enc.wait()
# ------------------------------------------------------------------ audio: line wavs + studio room tone + sfx -> -16 LUFS
# owner 22/10 "tiếng ồn lớn quá": the VOICE stem alone is normalised to -16 LUFS (digital silence in pauses stays silent), then the quiet bed
# (room tone AMB_DB, default -40 dB) and SFX (-8 dB vs v3) are mixed in AFTER normalisation, so loudnorm never lifts the bed in the pauses
FD = f'{TL}/foley/'; ins = ['-i', FD + 'tone0.wav', '-stream_loop', '-1', '-i', AMB]; vl = []; fl = []; k = 2
for s in S:
    for ln in s['lines']:
        ms = int(round((s['t0'] + ln['at']) * 1000)); ins += ['-i', f'{N}/vis3/{ln["id"]}.wav']; fl.append(f'[{k + 1}]highpass=f=80,equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=2,' + (f'atempo={ln["tempo"]},' if ln['tempo'] != 1 else '') + f'adelay={ms}|{ms}[v{k}]'); vl.append(f'[v{k}]'); k += 1
fl.append(f'[1]adelay=0|0[s0]'); fl.append(''.join(vl) + f'[s0]amix=inputs={len(vl) + 1}:normalize=0:duration=longest,apad=whole_dur={TOTAL:.3f},atrim=0:{TOTAL:.3f},loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[voice]')
bl = ['[voice]', '[b1]']; fl.append(f'[2]volume={AMB_DB}dB,atrim=0:{TOTAL:.3f},aresample=48000[b1]')
for f_, t_ in SFX:
    ms = int(round(max(0, t_) * 1000)); ins += ['-i', FD + f_]; fl.append(f'[{k + 1}]volume={-22 if f_ == "pop.wav" else -25}dB,adelay={ms}|{ms},aresample=48000[x{k}]'); bl.append(f'[x{k}]'); k += 1
fl.append(''.join(bl) + f'amix=inputs={len(bl)}:normalize=0:duration=first,atrim=0:{TOTAL:.3f},alimiter=limit=0.89:level=0[out]')
os.makedirs(f'{OUTD}/covers', exist_ok=True); OUTF = f'{OUTD}/{META["out"]}'
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-threads', '2', '-i', f'{RD}/video.mp4'] + ins + ['-filter_complex', ';'.join(fl), '-map', '0:v', '-map', '[out]',
                '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', f'{TOTAL:.3f}', OUTF], check=True)
cv2.imwrite(f'{OUTD}/covers/' + os.path.basename(OUTF).replace('.mp4', '.jpg'), COVER if COVER is not None else out, [cv2.IMWRITE_JPEG_QUALITY, 90])
for o in OV: o.pop('_img', None); o.pop('_chain', None)
json.dump(dict(lesson=dict(META, out=META['out']), shots=[{k: v for k, v in s.items()}  for s in S],
               overlays=OV, safe=SAFE, viral=True, punch={}, hook_kind='question', qa=QA, scene=TOTAL, total=TOTAL, end=0, endcard_boxes=[], sfx=SFX, avoid={}),
          open(f'{RD}/timeline.json', 'w'), indent=1)
json.dump(dict(bg_fill_visible_max=max(q['fill'] for q in BQA), bg_uncovered_max=max(q['uncovered'] for q in BQA), bottom_min=min(q['bottom'] for q in QC), fringe_max=max(q['fringe'] for q in QC), flicker_max=max(q['flick'] for q in QC), flicker_mean=float(np.mean([q['flick'] for q in QC])), frames=len(QC)), open(f'{RD}/qc.json', 'w'))
print('done', OUTF, f'{TOTAL:.2f} s', len(S), 'shots')
