# news_cards.py - exec'd inside news.py AFTER news_tpl.py's STYLE/palette (owner 23/10 text + layout review), overrides the card renderers.
# One text-fit engine for every card: real font metrics, icon space reserved, phrase-aware wrap (<= 2 lines), shrink to a minimum size, line
# height >= 1.3, inner padding >= 24 px; it raises when the copy does not fit (shorten it in the script bank / split the beat - never clip).
# Every renderer stores layout meta on the image (im.info['meta']): inner rect, text boxes (real glyph bboxes) and fg/bg colour pairs, so
# qa_news / layout_qa.py can gate overflow (text inside the inner padding) and WCAG contrast on every overlay state.
import difflib as _dl
FSB = f'{ROOT}/brand/social/src/fonts/BeVietnamPro-SemiBold.ttf'
PAD_IN = 24; PAD = 34   # gate: text inside the card inset by 24 px; layout inset 34 px
def _lum(c): c = [((v / 255) / 12.92) if v / 255 <= 0.03928 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c[:3]]; return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def contrast(a, b): la, lb = sorted([_lum(a), _lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)
def best_on(bg, cands=((255, 255, 255), (34, 36, 44))): return max(cands, key=lambda c: contrast(c, bg))
DARK = _lum(CARD_BG) < 0.2
RED_T = (255, 120, 120) if DARK else (190, 34, 40); GREEN_T = (120, 225, 150) if DARK else (18, 118, 58)
CAP_RED, CAP_GREEN = (255, 96, 96), (110, 235, 140)   # caption key words (white captions, dark stroke)
def _meta(im, inner, tb, cols): im.info['meta'] = dict(inner=[int(v) for v in inner], tb=[[int(v) for v in b] for b in tb], cols=cols); return im
def _endbad(w): return w.lower().strip(",.:;!?'\"") in FUNCW and not w.endswith((',', '.', ':', ';', '?', '!'))
def wrap_fit(d, text, fpath, maxw, size, minsize, maxlines=2, one_line_min=None):
    """-> (font, size, [lines]) or None. One line down to one_line_min, then 2 phrase-balanced lines, then smaller."""
    ws = text.split(); olm = one_line_min or max(minsize, int(size * 0.85))
    for fs in range(size, olm - 1, -2):
        f = font(fpath, fs)
        if d.textlength(text, font=f) <= maxw: return f, fs, [text]
    if maxlines >= 2 and len(ws) > 1:
        for fs in range(size, minsize - 1, -2):
            f = font(fpath, fs); best = None
            for i in range(1, len(ws)):
                a, b = ' '.join(ws[:i]), ' '.join(ws[i:]); wa, wb = d.textlength(a, font=f), d.textlength(b, font=f)
                if max(wa, wb) > maxw: continue
                cost = abs(wa - wb) + (4000 if _endbad(ws[i - 1]) else 0) - (300 if ws[i - 1].endswith((',', ':', ';', '.', '?')) else 0)
                if best is None or cost < best[0]: best = (cost, [a, b])
            if best: return f, fs, best[1]
    for fs in range(olm - 2, minsize - 1, -2):
        f = font(fpath, fs)
        if d.textlength(text, font=f) <= maxw: return f, fs, [text]
    return None
def must_fit(d, text, fpath, maxw, size, minsize, maxlines=2, **k):
    r = wrap_fit(d, text, fpath, maxw, size, minsize, maxlines, **k)
    if r is None: raise ValueError(f'TEXT-FIT FAIL: "{text}" does not fit {int(maxw)} px at >= {minsize} px in {maxlines} line(s) - shorten it in the script bank or split the beat')
    return r
def _chip(d, x, cy, label, col):
    lf = font(FH, 30); lw = d.textlength(label, font=lf) + 36; tc = best_on(col)
    d.rounded_rectangle([x, cy - 24, x + lw, cy + 24], 24, fill=col + (255,)); d.text((x + 18, cy), label, font=lf, fill=tc, anchor='lm')
    return lw, d.textbbox((x + 18, cy), label, font=lf, anchor='lm'), [tc, col, 30]
def card_one(kind, text, sub=None, num=None, y0=None, ic=None, formula=None):
    """kind x = wrong (red cross + red text), v = right (green tick + green text), p = label chip card. Optional chip row (label + icon)."""
    y0 = CARD_Y if y0 is None else y0; im = layer(); d = ImageDraw.Draw(im); x0, w = CX0, CW; ix0, ix1 = x0 + PAD, x0 + w - PAD
    label = num if isinstance(num, str) else (f'PHRASE {num}' if num else None); chip = bool(label or (ic and kind == 'p'))
    mk = kind in ('x', 'v'); col = RED_T if kind == 'x' else GREEN_T if kind == 'v' else CARD_INK; sub_ = formula or sub
    inline = None
    if chip and not sub_:   # compact: chip + (mark) + text on ONE row when the text fits at >= 40 px (keeps the card zone short)
        lw0 = d.textlength(label, font=font(FH, 30)) + 36 if label else 0; tx_i = ix0 + lw0 + 20 + (78 if mk else 0); ir = ix1 - (70 if ic else 0)
        r_ = wrap_fit(d, text, FB, ir - tx_i, 50, 40, 1, one_line_min=40)
        if r_: inline = (tx_i, r_)
    if inline:
        tx, (f, fs, lines) = inline; lh = int(round(fs * 1.32)); h = PAD + max(lh, 52) + PAD - 6
        d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 28, fill=CARD_BG + (248,), outline=CARD_LINE + (255,), width=4); cy = y0 + h // 2; tb, cols = [], []
        if label: _, b_, c_ = _chip(d, ix0, cy, label, ORANGE); tb.append(b_); cols.append(c_)
        if ic: icon(d, ic, ix1 - 26, cy, 26); tb.append([ix1 - 52, cy - 26, ix1, cy + 26])
        if mk: mark(d, tx - 48, cy, 30, kind == 'v'); tb.append([tx - 78, cy - 30, tx - 18, cy + 30])
        d.text((tx, cy), lines[0], font=f, fill=col, anchor='lm'); tb.append(d.textbbox((tx, cy), lines[0], font=f, anchor='lm')); cols.append([col, CARD_BG, fs])
        return _meta(shadowed(im), (x0 + PAD_IN, y0 + PAD_IN // 2, x0 + w - PAD_IN, y0 + h - PAD_IN // 2), tb, cols), (x0, y0, x0 + w, y0 + h)
    tx = ix0 + (78 if mk else 0)
    f, fs, lines = must_fit(d, text, FB, ix1 - tx, 52, 36); lh = int(round(fs * 1.32))
    sf = sfs = None
    if sub_: sf, sfs, _ = must_fit(d, sub_, FB, ix1 - tx, 40, 30, 1)
    h = PAD + (48 + 18 if chip else 0) + len(lines) * lh + (18 + int(sfs * 1.3) if sub_ else 0) + PAD - 6
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 28, fill=CARD_BG + (248,), outline=CARD_LINE + (255,), width=4)
    tb, cols = [], []; y = y0 + PAD
    if chip:
        cy = y + 24
        if label: _, b_, c_ = _chip(d, ix0, cy, label, ORANGE); tb.append(b_); cols.append(c_)
        if ic: icon(d, ic, ix1 - 26, cy, 26); tb.append([ix1 - 52, cy - 26, ix1, cy + 26])
        y += 48 + 18
    ty0 = y
    for i, ln in enumerate(lines):
        cy = y + i * lh + lh // 2; d.text((tx, cy), ln, font=f, fill=col, anchor='lm'); tb.append(d.textbbox((tx, cy), ln, font=f, anchor='lm')); cols.append([col, CARD_BG, fs])
    if mk: mcy = ty0 + len(lines) * lh // 2; mark(d, ix0 + 30, mcy, 30, kind == 'v'); tb.append([ix0, mcy - 30, ix0 + 60, mcy + 30])
    y = ty0 + len(lines) * lh
    if sub_:
        cy = y + 18 + int(sfs * 1.3) // 2; x = tx
        for w_ in sub_.split(' '):   # formula: slot words (-ING, CAPS) green, rest ink
            c_ = GREEN_T if re.search(r'[A-Z]{2,}|-ing', w_) else CARD_INK; d.text((x, cy), w_, font=sf, fill=c_, anchor='lm')
            tb.append(d.textbbox((x, cy), w_, font=sf, anchor='lm')); cols.append([c_, CARD_BG, sfs]); x += d.textlength(w_ + ' ', font=sf)
    return _meta(shadowed(im), (x0 + PAD_IN, y0 + PAD_IN, x0 + w - PAD_IN, y0 + h - PAD_IN), tb, cols), (x0, y0, x0 + w, y0 + h)
KEYSTEM = None   # set by key_tokens(): stem of the word before the taught slot ('consider'), for the Teacher's-tip bold words
def _toks(t): return re.findall(r"[A-Za-z0-9'\-]+", t.lower().replace('’', "'"))
def key_tokens(wrong, right):
    """taught slot: tokens only in the wrong line (red) / only in the right line (green), e.g. 'to buy' / 'buying'."""
    global KEYSTEM
    a, b = _toks(wrong or ''), _toks(right or ''); sm = _dl.SequenceMatcher(None, a, b); bad, good = set(), set()
    for op, i1, i2, j1, j2 in sm.get_opcodes():
        if op != 'equal': bad |= set(a[i1:i2]); good |= set(b[j1:j2])
        if op != 'equal' and j1 > 0 and KEYSTEM is None: KEYSTEM = re.sub(r'(ing|ed|s)$', '', b[j1 - 1])
    return a, b, bad, good
def card_recap(title, rows, y0=None, key=None):
    """Teacher's tip: title bar + <= 2 rows (<= 6 words), line height 1.35, number badges centred on the row, the taught word bold green."""
    y0 = CARD_Y if y0 is None else y0; im = layer(); d = ImageDraw.Draw(im); x0, w = CX0, CW; ix0, ix1 = x0 + PAD, x0 + w - PAD
    assert len(rows) <= 2 and all(NW(r) <= 6 for r in rows), ('Teacher tip: max 2 rows of <= 6 words', rows)
    tx = ix0 + 62; fs = 46
    while fs > 34 and max(d.textlength(r, font=font(FB, fs)) for r in rows) > ix1 - tx: fs -= 2
    if max(d.textlength(r, font=font(FB, fs)) for r in rows) > ix1 - tx: raise ValueError(f'TEXT-FIT FAIL tip rows {rows}')
    lh = int(round(fs * 1.35)); th = 66; h = th + 22 + len(rows) * lh + (len(rows) - 1) * 14 + PAD - 8
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 28, fill=CARD_BG + (250,), outline=CARD_LINE + (255,), width=4)
    d.rounded_rectangle([x0, y0, x0 + w, y0 + th], 28, fill=TEAL + (255,)); d.rectangle([x0, y0 + 34, x0 + w, y0 + th], fill=TEAL + (255,))
    tc = best_on(TEAL); tf = font(FH, 36); d.text((CX, y0 + th // 2), title, font=tf, fill=tc, anchor='mm')
    tb = [d.textbbox((CX, y0 + th // 2), title, font=tf, anchor='mm')]; cols = [[tc, TEAL, 36]]
    fN, fK = font(FSB, fs), font(FB, fs)
    for i, r in enumerate(rows):
        cy = y0 + th + 22 + i * (lh + 14) + lh // 2; nb = best_on(ORANGE)
        d.ellipse([ix0, cy - 22, ix0 + 44, cy + 22], fill=ORANGE + (255,)); d.text((ix0 + 22, cy), str(i + 1), font=font(FH, 28), fill=nb, anchor='mm'); cols.append([nb, ORANGE, 28])
        tb.append([ix0, cy - 22, ix0 + 44, cy + 22]); x = tx; ws = r.split(' '); prev = ''
        for w_ in ws:   # the taught word: in a key line (row 1) the green slot token, in examples the word right after the stem ('considered TAKING')
            t_ = _toks(w_); isk = bool(t_) and ((key and t_[0] in key) or (KEYSTEM and prev.startswith(KEYSTEM) and re.search(r'ing$', t_[0])))
            f_, c_ = (fK, GREEN_T) if isk else (fN, CARD_INK); d.text((x, cy), w_, font=f_, fill=c_, anchor='lm'); tb.append(d.textbbox((x, cy), w_, font=f_, anchor='lm')); cols.append([c_, CARD_BG, fs])
            x += d.textlength(w_ + ' ', font=f_); prev = (t_ or [''])[0]
    return _meta(shadowed(im), (x0 + PAD_IN, y0 + PAD_IN // 2, x0 + w - PAD_IN, y0 + h - PAD_IN), tb, cols), (x0, y0, x0 + w, y0 + h)
def ring_card(txt, prog, y0=None):
    y0 = CARD_Y if y0 is None else y0; im = layer(); d = ImageDraw.Draw(im); f = font(FH, 52); tw = d.textlength(txt, font=f); w = tw + 130 + 2 * PAD; x0 = CX - w / 2; h = 112
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 56, fill=CARD_BG + (250,), outline=CARD_LINE + (255,), width=4)
    cx, cy, r = x0 + PAD + 34, y0 + h // 2, 32; d.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(200, 200, 208), width=9)
    d.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * prog, fill=ORANGE, width=9)
    d.rounded_rectangle([cx - 14, cy - 10, cx + 14, cy + 8], 5, fill=TEAL); d.polygon([(cx - 7, cy + 7), (cx - 10, cy + 17), (cx + 4, cy + 8)], fill=TEAL)
    tx = x0 + PAD + 92; d.text((tx, cy), txt, font=f, fill=CARD_INK, anchor='lm')
    return _meta(shadowed(im), (x0 + PAD_IN, y0 + PAD_IN // 2, x0 + w - PAD_IN, y0 + h - PAD_IN // 2), [d.textbbox((tx, cy), txt, font=f, anchor='lm'), [cx - r, cy - r, cx + r, cy + r]], [[CARD_INK, CARD_BG, 52]]), (int(x0), y0, int(x0 + w), y0 + h)
def share_chip(sub, y0=236):
    im = layer(); d = ImageDraw.Draw(im); t = 'Send this to a friend'; f1 = font(FH, 44); sub = sub.replace('"', '“', 1).replace('"', '”', 1)
    f2, fs2, sl = must_fit(d, sub, FB, CW - 2 * PAD, 36, 28)
    w = max(d.textlength(t, font=f1), max(d.textlength(x, font=f2) for x in sl)) + 2 * PAD; x0 = CX - w / 2; lh2 = int(fs2 * 1.3); h = PAD + 56 + 8 + lh2 * len(sl) + PAD - 10
    tc = best_on(TEAL); sc = YEL if contrast(YEL, TEAL) >= 4.5 else tc
    d.rounded_rectangle([x0, y0, x0 + w, y0 + h], 30, fill=TEAL + (255,)); d.text((CX, y0 + PAD + 28), t, font=f1, fill=tc, anchor='mm')
    tb = [d.textbbox((CX, y0 + PAD + 28), t, font=f1, anchor='mm')]; cols = [[tc, TEAL, 44]]
    for i, x in enumerate(sl):
        cy = y0 + PAD + 64 + i * lh2 + lh2 // 2; d.text((CX, cy), x, font=f2, fill=sc, anchor='mm'); tb.append(d.textbbox((CX, cy), x, font=f2, anchor='mm')); cols.append([sc, TEAL, fs2])
    return _meta(shadowed(im), (x0 + PAD_IN, y0 + PAD_IN // 2, x0 + w - PAD_IN, y0 + h - PAD_IN // 2), tb, cols), (int(x0), y0, int(x0 + w), y0 + h)
def hook_card(txt, sub, y0=236):
    im = layer(); d = ImageDraw.Draw(im); f, fs, _ = must_fit(d, txt, FH, CW - 2 * PAD, 92, 70, 1); tw = d.textlength(txt, font=f); w = tw + 2 * PAD; bx = CX - w / 2; h = fs + 56
    tc = best_on(ORANGE); d.rounded_rectangle([bx, y0, bx + w, y0 + h], 26, fill=ORANGE + (255,)); d.text((CX, y0 + h // 2), txt, font=f, fill=tc, anchor='mm')
    return _meta(shadowed(im), (bx + PAD_IN, y0 + 6, bx + w - PAD_IN, y0 + h - 6), [d.textbbox((CX, y0 + h // 2), txt, font=f, anchor='mm')], [[tc, ORANGE, fs]]), (int(bx), y0, int(bx + w), y0 + h), fs
def series_bar(top, sub, y0=396, prog=1.0, level=None):
    """hook-only series tag: orange tag | dark strip | difficulty pill (one chip row, slides in)."""
    im = layer(); d = ImageDraw.Draw(im); tf = font(FH, 34); sf = font(FB, 30); lv = {'easy': ('EASY', (30, 130, 70)), 'medium': ('MEDIUM', (170, 100, 0)), 'hard': ('HARD', (190, 34, 40))}.get(level)
    tw = d.textlength(top, font=tf) + 40; sw = d.textlength(sub, font=sf) + 44; lw_ = (d.textlength(lv[0], font=font(FH, 28)) + 36) if lv else 0; full = tw + sw + lw_
    x0 = CX - full / 2; hh = 64; tc = best_on(ORANGE); sc_ = best_on(TEAL, (CREAM, (34, 36, 44)))   # owner 23/10: no slide-in from off-frame (it showed a clipped 'RAMMAR FIX'), fade-in only
    d.rectangle([x0, y0, x0 + tw, y0 + hh], fill=ORANGE + (255,)); d.text((x0 + 20, y0 + hh // 2), top, font=tf, fill=tc, anchor='lm')
    d.rectangle([x0 + tw, y0, x0 + tw + sw, y0 + hh], fill=TEAL + (250,)); d.text((x0 + tw + 22, y0 + hh // 2), sub, font=sf, fill=sc_, anchor='lm')
    tb = [d.textbbox((x0 + 20, y0 + hh // 2), top, font=tf, anchor='lm'), d.textbbox((x0 + tw + 22, y0 + hh // 2), sub, font=sf, anchor='lm')]; cols = [[tc, ORANGE, 34], [sc_, TEAL, 30]]
    if lv:
        lc = best_on(lv[1]); d.rectangle([x0 + tw + sw, y0, x0 + full, y0 + hh], fill=lv[1] + (255,)); d.text((x0 + tw + sw + 18, y0 + hh // 2), lv[0], font=font(FH, 28), fill=lc, anchor='lm')
        tb.append(d.textbbox((x0 + tw + sw + 18, y0 + hh // 2), lv[0], font=font(FH, 28), anchor='lm')); cols.append([lc, lv[1], 28])
    d.rectangle([x0, y0 + hh, x0 + full, y0 + hh + 6], fill=YEL + (255,))
    xs = CX - full / 2
    return _meta(im, (xs + 8, y0 + 2, xs + full - 8, y0 + hh - 2), tb if prog >= 1 else [], cols), (int(xs), y0, int(xs + full), y0 + hh + 6)
CAPKEY = {}   # line id -> {word index: colour}
def cap_key_map(spec):
    wl, kl = spec.get('wrong_line'), spec.get('key_line')
    if not (wl and kl): return
    a, b, bad, good = key_tokens(wl, kl); nz = lambda w_: re.sub(r"[^a-z0-9'\-]", '', w_.lower().replace('’', "'"))
    for k_, t_ in TEXT.items():
        ws = [nz(x) for x in t_.split()]
        for seq, keys, col in ((a, bad, CAP_RED), (b, good, CAP_GREEN)):
            for i in range(len(ws) - len(seq) + 1):
                if ws[i:i + len(seq)] == seq or [x.strip("'") for x in ws[i:i + len(seq)]] == seq:
                    for j, x in enumerate(seq):
                        if x in keys: CAPKEY.setdefault(k_, {})[i + j] = col
def cap_img(lines_, k, fs=CAP_FS, idx=None, line=None):
    """caption chunk: white, dark stroke; ONLY the taught slot is coloured (wrong red / right green), no karaoke word colour."""
    im = layer(); d = ImageDraw.Draw(im); f = font(FB, fs); x0b, x1b = 9999, 0; km = CAPKEY.get(line, {}); n = 0; tb, cols = [], []
    stroke = (20, 22, 28)
    if CAP_BOX:
        wmax = max(d.textlength(' '.join(lw), font=f) for lw in lines_); d.rounded_rectangle([CX - wmax / 2 - 22, CAP_Y - 10, CX + wmax / 2 + 22, CAP_Y + (len(lines_) - 1) * CAP_LH + fs * 1.25 + 4], 18, fill=(18, 22, 28, 200))
    for li, lw in enumerate(lines_):
        txt = ' '.join(lw); tw = d.textlength(txt, font=f); x = CX - tw / 2; y = CAP_Y + li * CAP_LH; x0b, x1b = min(x0b, x), max(x1b, x + tw)
        for w_ in lw:
            gi = idx[n] if idx else n; c_ = km.get(gi, (255, 255, 255))
            d.text((x, y), w_, font=f, fill=c_, stroke_width=0 if CAP_BOX else 8, stroke_fill=stroke); tb.append(d.textbbox((x, y), w_, font=f)); cols.append([c_, stroke, fs])
            x += d.textlength(w_ + ' ', font=f); n += 1
    box = (int(x0b) - 8, CAP_Y - 8, int(x1b) + 8, CAP_Y + (len(lines_) - 1) * CAP_LH + int(fs * 1.25))
    return _meta(im, (box[0] - 2, box[1] - 4, box[2] + 2, box[3] + 14), tb, cols), box
