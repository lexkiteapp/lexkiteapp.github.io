# news_kit.py - exec'd inside news_tpl.py (owner 15/11: old clip overlay "xấu" -> Stitch v2 Lexkite Kit). ONE colour source: the Teach2D theme tokens
# (scripts/video/remotion/src/teach/theme.json, look "dusk" = Kit dark for social feeds; Stitch design system assets/1b7a8a3d3d52404bb332d9ba3f783547).
# Stage 1 (palette) runs right after STYLE is chosen; stage 2 (renderers) runs after news_cards.py. No hex literals in the renderers - only tokens.
import json as _j
_T = _j.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json'))['dusk']
def _rgb(k): h = _T[k].lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
def _rgba(k): v = _T[k]; m = re.match(r'rgba\((\d+),(\d+),(\d+),([\d.]+)\)', v); return (int(m[1]), int(m[2]), int(m[3]), int(round(float(m[4]) * 255)))
def kit_palette():
    g = globals()
    g.update(ORANGE=_rgb('cta_a'), TEAL=(13, 105, 100), TEAL2=_rgb('primary'), YEL=_rgb('accent'), CARD_BG=_rgb('card'), CARD_LINE=_rgb('edge'), CARD_INK=_rgb('ink'),
             CREAM=_rgb('ink'), INK=_rgb('cta_ink'), CAP_BOX=True, CAP_PLATE=_rgba('cap_plate'), KIT_LEDGE=_rgb('ledge'), KIT_CTA=(_rgb('cta_a'), _rgb('cta_b'), _rgb('cta_ledge')),
             KIT_GOOD=_rgb('good'), KIT_BAD=_rgb('bad'))
def kit_renderers():
    g = globals()
    def shadowed(im, r=10, off=(0, 8), a=110):   # Kit "ledge": hard darker edge under every card + a soft shadow
        al = im.split()[3]; led = Image.new('RGBA', im.size, KIT_LEDGE + (255,)); led.putalpha(al); out = layer()
        sh = Image.new('RGBA', im.size, (5, 16, 19, 0)); sh.putalpha(al.filter(ImageFilter.GaussianBlur(14)).point(lambda v: v * 120 // 255)); out.alpha_composite(sh, (0, 16)); out.alpha_composite(led, (0, 8)); out.alpha_composite(im); return out
    def series_bar(top, sub, y0=396, prog=1.0, level=None):
        """Kit chip row: coral series chip + card pill (+ level pill), rounded, centred in the safe column."""
        im = layer(); d = ImageDraw.Draw(im); tf, sf, lf = font(FH, 34), font(FB, 30), font(FH, 28); lv = {'easy': ('EASY', KIT_GOOD), 'medium': ('MEDIUM', YEL), 'hard': ('HARD', KIT_BAD)}.get(level)
        def w_(): return d.textlength(top, font=tf) + 48, d.textlength(sub, font=sf) + 48, (d.textlength(lv[0], font=lf) + 40) if lv else 0
        tw, sw, lw_ = w_(); gap = 10; full = tw + sw + lw_ + gap * (2 if lv else 1)
        while full > CW - 8 and (sf.size > 24 or tf.size > 26):
            if sf.size > 24: sf = font(FB, sf.size - 2)
            if tf.size > 26: tf = font(FH, tf.size - 2)
            tw, sw, lw_ = w_(); full = tw + sw + lw_ + gap * (2 if lv else 1)
        if full > CW - 8: raise ValueError(f'TEXT-FIT FAIL series tag "{top} | {sub}" - shorten the series / memory text in the script bank')
        x0 = CX - full / 2; hh = 64; tc = best_on(ORANGE); sc_ = CARD_INK; tb, cols = [], []
        d.rounded_rectangle([x0, y0, x0 + tw, y0 + hh], 32, fill=ORANGE + (255,)); d.text((x0 + 24, y0 + hh // 2), top, font=tf, fill=tc, anchor='lm'); tb.append(d.textbbox((x0 + 24, y0 + hh // 2), top, font=tf, anchor='lm')); cols.append([tc, ORANGE, tf.size])
        x1 = x0 + tw + gap; d.rounded_rectangle([x1, y0, x1 + sw, y0 + hh], 32, fill=CARD_BG + (252,), outline=CARD_LINE + (255,), width=3); d.text((x1 + 24, y0 + hh // 2), sub, font=sf, fill=sc_, anchor='lm')
        tb.append(d.textbbox((x1 + 24, y0 + hh // 2), sub, font=sf, anchor='lm')); cols.append([sc_, CARD_BG, sf.size])
        if lv:
            x2 = x1 + sw + gap; lc = best_on(lv[1]); d.rounded_rectangle([x2, y0, x2 + lw_, y0 + hh], 32, fill=lv[1] + (255,)); d.text((x2 + 20, y0 + hh // 2), lv[0], font=lf, fill=lc, anchor='lm')
            tb.append(d.textbbox((x2 + 20, y0 + hh // 2), lv[0], font=lf, anchor='lm')); cols.append([lc, lv[1], lf.size])
        return _meta(shadowed(im), (x0 + 8, y0 + 2, x0 + full - 8, y0 + hh - 2), tb if prog >= 1 else [], cols), (int(x0), y0, int(x0 + full), y0 + hh + 8)
    def hook_card(txt, sub, y0=236, strike=None):
        """Kit hook: big card, ink text, ledge; mistake word struck in the Kit bad colour."""
        im = layer(); d = ImageDraw.Draw(im); f, fs, _ = must_fit(d, txt, FH, CW - 2 * PAD, 92, 70, 1); tw = d.textlength(txt, font=f); w = tw + 2 * PAD; bx = CX - w / 2; h = fs + 56
        d.rounded_rectangle([bx, y0, bx + w, y0 + h], 40, fill=CARD_BG + (252,), outline=ORANGE + (255,), width=5); d.text((CX, y0 + h // 2), txt, font=f, fill=CARD_INK, anchor='mm')
        if strike:
            x = CX - tw / 2
            for i_, w_ in enumerate(txt.split(' ')):
                ww = d.textlength(w_, font=f)
                if i_ in strike:
                    x1 = x + ww + (d.textlength(' ', font=f) if i_ + 1 in strike else 0); yc = y0 + h // 2 + 2; d.line([(x - 4, yc), (x1 + 4, yc)], fill=KIT_BAD, width=max(8, fs // 9))
                x += ww + d.textlength(' ', font=f)
        return _meta(shadowed(im), (bx + PAD_IN, y0 + 6, bx + w - PAD_IN, y0 + h - 6), [d.textbbox((CX, y0 + h // 2), txt, font=f, anchor='mm')], [[CARD_INK, CARD_BG, fs]]), (int(bx), y0, int(bx + w), y0 + h), fs
    def cta_pill(txt, y0=CARD_Y):
        """Natural CTA (no engagement bait): coral->orange Kit pill with ledge, dark ink text, brand domain."""
        im = layer(); d = ImageDraw.Draw(im); f, fs, _ = must_fit(d, txt, FH, CW - 2 * PAD - 40, 56, 40, 1); tw = d.textlength(txt, font=f); w = tw + 2 * PAD + 20; h = fs + 52; x0 = CX - w / 2
        a_, b_, led = KIT_CTA; g_ = Image.new('RGBA', (int(w), int(h)))
        for i_ in range(int(w)): c_ = tuple(int(a_[k] + (b_[k] - a_[k]) * i_ / max(1, w - 1)) for k in range(3)); ImageDraw.Draw(g_).line([(i_, 0), (i_, h)], fill=c_ + (255,))
        mk = Image.new('L', g_.size, 0); ImageDraw.Draw(mk).rounded_rectangle([0, 0, w - 1, h - 1], h // 2, fill=255); lp_ = layer(); lp_.paste(g_, (int(x0), y0), mk)
        ImageDraw.Draw(lp_).text((CX, y0 + h // 2), txt, font=f, fill=INK + (255,), anchor='mm')
        led_ = layer(); lm = layer(); ImageDraw.Draw(lm).rounded_rectangle([x0, y0 + 8, x0 + w, y0 + h + 8], h // 2, fill=led + (255,)); led_.alpha_composite(lm); led_.alpha_composite(lp_)
        _mid = tuple((a_[k] + b_[k]) // 2 for k in range(3))
        return _meta(led_, (x0 + 28, y0 + 6, x0 + w - 28, y0 + h - 6), [d.textbbox((CX, y0 + h // 2), txt, font=f, anchor='mm')], [[INK, _mid, fs]]), (int(x0), y0, int(x0 + w), y0 + h + 8), fs
    g.update(shadowed=shadowed, series_bar=series_bar, hook_card=hook_card, cta_pill=cta_pill)
