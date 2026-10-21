# Overlay styles for the 5 template lessons (spec: content/video/cine/templates.md). exec'd inside lesson5.py (uses its globals).
# Each fn(im, dr, txt, sub) draws on the 1080x1920 RGBA layer and returns the bbox [x0, y0, x1, y1].
TPL_CAP_FS = globals().get('TPL_CAP_FS', 66 if VIRAL else 52)   # Gap/Strike caption size (viral: bigger, CapCut-like)
INK = (42, 43, 51, 255); CREAM = (255, 247, 234, 248); GOLD = (255, 201, 74, 255); WHITE = (255, 255, 255, 255); STROKE = (20, 24, 32, 255)
def _tick(dr, cx, cy, r, col, w=8): dr.line([cx - r, cy, cx - r * 0.3, cy + r * 0.7, cx + r, cy - r * 0.7], fill=col, width=w, joint='curve')
def _sub_layout(dr, en, nat, fe, fn, extra=0):
    """Same anchor as Sub: English grows up from the native block, native grows down to SAFE y1."""
    le = wrapw(dr, en, fe, MAXW - 40 - extra); ln = wrapw(dr, nat, fn, MAXW - 40, True) if nat else []
    assert len(le) <= 2 and len(ln) <= 2, en
    yb = SAFE['y1'] - 14; yN = yb - 2 * 54 if not EN_ONLY else yb - 4; y = yN - 10 - (fe.size + 16) * len(le); return le, ln, y, yN, yb
def _words_line(dr, l, fe, special, wfn):
    """Lay out one line word by word; `special` word gets width wfn(word) (gap box / strike) -> identical x for every state."""
    ws = l.split(' '); sp = dr.textlength(' ', font=fe); wid = [wfn(w) if w.strip('.,?!') == special else dr.textlength(w, font=fe) for w in ws]
    x = CX - (sum(wid) + sp * (len(ws) - 1)) / 2; out = []
    for w, wd in zip(ws, wid): out.append((w, x, wd)); x += wd + sp
    return out
def st_choice(im, dr, txt, sub):
    q, *opts, ans = txt.split('|'); fq = ImageFont.truetype(FONT_EN, 48); fo = ImageFont.truetype(FONT_EN, 44)
    lq = wrapw(dr, q, fq, MAXW - 64); assert len(lq) <= 2 and len(opts) == 3, txt
    y0 = globals().get('CHOICE_Y', 1040); pad = 26; h = pad + 60 * len(lq) + 18 + 3 * 96 + 2 * 18 + pad; x0 = SAFE['x0']
    dr.rounded_rectangle([x0, y0, x0 + MAXW, y0 + h], radius=30, fill=CREAM, outline=INK, width=5); y = y0 + pad
    for l in lq: dr.text((CX - dr.textlength(l, font=fq) / 2, y), l, font=fq, fill=INK); y += 60
    y += 18
    for j, o in enumerate(opts):
        L_ = 'ABC'[j]; ok = L_ == ans; lay = Image.new('RGBA', im.size, (0, 0, 0, 0)); d2 = ImageDraw.Draw(lay); rx0, rx1 = x0 + 22, x0 + MAXW - 22
        if sub and ok: d2.rounded_rectangle([rx0, y, rx1, y + 96], radius=24, fill=(225, 245, 232, 255), outline=(23, 120, 70, 255), width=5)
        d2.rounded_rectangle([rx0 + 12, y + 12, rx0 + 84, y + 84], radius=20, fill=GOLD); fl = ImageFont.truetype(FONT_EN, 44)
        d2.text((rx0 + 48 - d2.textlength(L_, font=fl) / 2, y + 16), L_, font=fl, fill=(15, 61, 62, 255)); d2.text((rx0 + 108, y + 18), o, font=fo, fill=INK)
        if sub and ok: _tick(d2, rx1 - 50, y + 48, 22, (23, 120, 70, 255))
        if sub and not ok: a = np.asarray(lay).copy(); a[..., 3] = (a[..., 3] * 0.45).astype(np.uint8); lay = Image.fromarray(a)
        im.alpha_composite(lay); y += 96 + 18
    return [x0, y0, x0 + MAXW, y0 + h]
def st_gap(im, dr, txt, sub):
    global CUR_FS
    en, nat = txt.split('||'); word = GAP_WORD; fe = ImageFont.truetype(FONT_EN, TPL_CAP_FS); CUR_FS = TPL_CAP_FS; fn = fnat(40); bw = lambda w: dr.textlength(word, font=fe) + 24
    le, ln, y, yN, yb = _sub_layout(dr, en, nat, fe, fn, 24); box = [1080, y, 0, yb]
    for l in le:
        for w, x, wd in _words_line(dr, l, fe, word, bw):
            box[0] = min(box[0], x); box[2] = max(box[2], x + wd)
            if w.strip('.,?!') == word:
                dr.rounded_rectangle([x, y + 2, x + wd, y + fe.size + 12], radius=12, outline=GOLD, width=6, fill=(20, 24, 32, 150))
                if sub: dr.text((x + 12, y), word, font=fe, fill=GOLD, stroke_width=7, stroke_fill=STROKE)
                tail = w[len(word):] if w.startswith(word) else ''
                if tail: dr.text((x + wd + 2, y), tail, font=fe, fill=WHITE, stroke_width=7, stroke_fill=STROKE)
            else: dr.text((x, y), w, font=fe, fill=WHITE, stroke_width=7, stroke_fill=STROKE)
        y += fe.size + 16
    y += 10
    for l in ln:
        w = dr.textlength(l, font=fn); dr.text((CX - w / 2, y), l, font=fn, fill=(255, 231, 194, 255), stroke_width=6, stroke_fill=STROKE); box[0] = min(box[0], CX - w / 2); box[2] = max(box[2], CX + w / 2); y += 54
    return [int(box[0] - 7), int(box[1]), int(box[2] + 7), int(box[3])]
LADDER_LABELS = (('POLITE', (15, 61, 62, 255)), ('NEUTRAL', (90, 96, 110, 255)), ('CASUAL', (229, 80, 47, 255)))
def st_ladder(im, dr, txt, sub):
    ss = txt.split('|'); y0 = globals().get('LADDER_Y', 980); fl = ImageFont.truetype(FONT_EN, 30); fs = ImageFont.truetype(FONT_EN, 42); x0 = SAFE['x0']; y = y0
    for j in range(int(sub or 1)):
        dr.rounded_rectangle([x0, y, x0 + MAXW, y + 132], radius=26, fill=CREAM, outline=INK, width=4)
        lab, col = LADDER_LABELS[j]; dr.rounded_rectangle([x0 + 14, y + 14, x0 + 164, y + 118], radius=20, fill=col)
        dr.text((x0 + 89 - dr.textlength(lab, font=fl) / 2, y + 48), lab, font=fl, fill=WHITE)
        ls = wrapw(dr, ss[j], fs, MAXW - 220); assert len(ls) <= 2, ss[j]; yy = y + 66 - 26 * len(ls)
        for l in ls: dr.text((x0 + 190, yy), l, font=fs, fill=INK); yy += 52
        y += 132 + 16
    return [x0, y0, x0 + MAXW, y - 16]
def st_strike(im, dr, txt, sub):
    global CUR_FS
    en, nat = txt.split('||'); wrong, right = STRIKE; fe = ImageFont.truetype(FONT_EN, TPL_CAP_FS); CUR_FS = TPL_CAP_FS; fn = fnat(40); fr = ImageFont.truetype(FONT_EN, 46); sub = sub or 0
    le, ln, y, yN, yb = _sub_layout(dr, en, nat if sub == 2 else '', fe, fn); box = [1080, y, 0, yb]
    for l in le:
        for w, x, wd in _words_line(dr, l, fe, wrong, lambda w: dr.textlength(w, font=fe)):
            box[0] = min(box[0], x); box[2] = max(box[2], x + wd); hit = w.strip('.,?!') == wrong
            dr.text((x, y), w, font=fe, fill=WHITE, stroke_width=7, stroke_fill=STROKE)
            if hit and sub == 2:
                ww = dr.textlength(wrong, font=fe); dr.line([x - 4, y + fe.size * 0.73, x + ww + 4, y + fe.size * 0.73], fill=(229, 80, 47, 255), width=6)
                rw = dr.textlength(right, font=fr); rx = x + ww / 2 - rw / 2; ry = y - 8 - 58
                dr.text((rx, ry), right, font=fr, fill=(60, 200, 120, 255), stroke_width=7, stroke_fill=STROKE); box[1] = min(box[1], ry); box[0] = min(box[0], rx); box[2] = max(box[2], rx + rw)
        y += fe.size + 16
    y += 10
    for l in ln:
        w = dr.textlength(l, font=fn); dr.text((CX - w / 2, y), l, font=fn, fill=(255, 231, 194, 255), stroke_width=6, stroke_fill=STROKE); y += 54
    box = [int(box[0] - 7), int(box[1]), int(box[2] + 7), int(box[3])]
    if sub == 1:   # sticker (no emoji: the fonts have none)
        fh = ImageFont.truetype(FONT_H, 46); t = 'Spot the mistake!'; w = dr.textlength(t, font=fh); hy = globals().get('HOOK_Y', 330)
        dr.rounded_rectangle([CX - w / 2 - 34, hy, CX + w / 2 + 34, hy + 86], radius=28, fill=GOLD, outline=INK, width=5); dr.text((CX - w / 2, hy + 14), t, font=fh, fill=(15, 61, 62, 255))
        box = [int(min(box[0], CX - w / 2 - 34)), hy, int(max(box[2], CX + w / 2 + 34)), box[3]]
    return box
def st_pov(im, dr, txt, sub):
    f = ImageFont.truetype(FONT_H, 44); x0, y0 = SAFE['x0'], globals().get('POV_Y', 240); w = dr.textlength(txt, font=f)
    dr.rounded_rectangle([x0, y0, x0 + w + 56, y0 + 62], radius=30, fill=(20, 24, 32, 200)); dr.text((x0 + 28, y0 + 3), txt, font=f, fill=WHITE)
    return [x0, y0, int(x0 + w + 56), y0 + 62]
TPL_STYLES = dict(Choice=st_choice, Gap=st_gap, Ladder=st_ladder, Strike=st_strike, Pov=st_pov)

def st_card(im, dr, txt, sub):
    """anchor-explainer rule / contrast card: 'Title|x:wrong line|v:right line|AT:label row' ; sub = rows visible (build-up). x = red cross, v = green tick, else a gold label chip."""
    ti, *rows = txt.split('|'); n = len(rows) if sub is None else int(sub); y0 = globals().get('CARD_Y_BY', {}).get(SHOT_ID, globals().get('CARD_Y', 960)); x0 = SAFE['x0']
    ft = ImageFont.truetype(FONT_H, 44); fr = ImageFont.truetype(FONT_EN, globals().get('CARD_FS', 50)); fl = ImageFont.truetype(FONT_H, 40); y = y0
    if ti:
        w = dr.textlength(ti, font=ft); dr.rounded_rectangle([CX - w / 2 - 30, y, CX + w / 2 + 30, y + 72], radius=36, fill=(15, 61, 62, 240)); dr.text((CX - w / 2, y + 10), ti, font=ft, fill=(255, 247, 234, 255)); y += 72 + 14
    for j in range(n):
        kind, t_ = rows[j].split(':', 1); ls = wrapw(dr, t_.strip(), fr, MAXW - 230); assert len(ls) <= 2, rows[j]; h = 40 + 60 * len(ls)
        bad = kind == 'x'; fill = (255, 236, 230, 250) if bad else ((225, 245, 232, 250) if kind == 'v' else CREAM)
        dr.rounded_rectangle([x0, y, x0 + MAXW, y + h], radius=26, fill=fill, outline=INK, width=4); cy = y + h / 2
        tx = x0 + 146
        if kind in ('x', 'v'): face(dr, x0 + 70, cy, 40, 'cross' if bad else 'check')
        else:
            lw = dr.textlength(kind, font=fl); cw = max(104, lw + 30); dr.rounded_rectangle([x0 + 18, cy - 38, x0 + 18 + cw, cy + 38], radius=20, fill=GOLD); dr.text((x0 + 18 + cw / 2 - lw / 2, cy - 27), kind, font=fl, fill=(15, 61, 62, 255)); tx = x0 + 18 + cw + 24
        yy = y + 20
        for l in ls:
            dr.text((tx, yy), l, font=fr, fill=INK)
            if bad: lw = dr.textlength(l, font=fr); dr.line([tx - 4, yy + 34, tx + 4 + lw, yy + 34], fill=(229, 63, 63, 230), width=5)
            yy += 60
        y += h + 14
    return [x0, y0, x0 + MAXW, max(y - 14, y0 + 72)]
TPL_STYLES['Card'] = st_card
