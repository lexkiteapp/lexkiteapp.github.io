#!/usr/bin/env python3
"""Teach2D text-fit maths (docs/VIDEO-TEACH2D.md), shared by build.py (sizes every chip / pill from it + hard assert) and qc.py (layout gate).
Measures with the fonts TeachShort.jsx renders (Plus Jakarta Sans 800 / Noto Sans 500, copied by build.py) and the CSS it uses:
letter-spacing (em, after every character), the pill's own furniture (flag, letter chip, check mark), borders and a minimum side padding.
A glyph the Jakarta font lacks (emoji, ✓, ✗) falls back in Chrome to Noto Color Emoji, about 1.25 em wide: it is measured as that.
need(node) -> list of (what, text, needed_px, available_px) for every one-line text of a pill / chip node that does not fit; [] = fits."""
import os
from PIL import ImageFont
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
FONTS = f'{ROOT}/brand/social/src/fonts'; _fc = {}; _nd = {}
EMOJI_EM = 1.25


def font(sz, ipa=False):
    k = (sz, ipa)
    if k not in _fc:
        f = ImageFont.truetype(f'{FONTS}/NotoSans-Medium.ttf' if ipa else f'{FONTS}/PlusJakartaSans-VF.ttf', sz)
        if not ipa: f.set_variation_by_axes([800])
        _fc[k] = f
    return _fc[k]


def _sig(f, ch): m = f.getmask(ch); return m.size, bytes(list(m))


def missing(ch, sz, ipa=False):   # the font has no glyph for ch (renders as .notdef here, falls back in the browser)
    f = font(sz, ipa)
    if (sz, ipa) not in _nd: _nd[(sz, ipa)] = _sig(f, '\U000F0000')
    return ch.strip() != '' and _sig(f, ch) == _nd[(sz, ipa)]


def width(s, sz, ipa=False, ls=0.0):
    """rendered width of one line: glyph advances (fallback glyphs at 1.25 em) + CSS letter-spacing ls em after each character."""
    f = font(sz, ipa); w = 0.0; n = 0
    for ch in s:
        if ch in '️‍': continue   # variation selector / joiner: no advance
        w += EMOJI_EM * sz if missing(ch, sz, ipa) else f.getlength(ch); n += 1
    return w + ls * sz * n


MINPAD = 14   # minimum free space each side of a text inside its pill (on top of the border)


def chip_w(text, sz): return width(text, sz, ls=0.06) + 2 * (MINPAD + 2) + 24   # chip / series chip: border 2 + pad 14 + breathing room
def tag_w(text, sz): return 12 + 48 + 12 + width(text, sz, ls=0.06) + 18 + 4 + 2 * MINPAD   # flag tag: pad 12 · flag 48 · gap 12 · text · pad 18 · borders


def need(n):
    """one-line text furniture of every pill / chip node type TeachShort.jsx draws (the same numbers as its CSS)."""
    t = n['type']; b = n.get('box') or [0, 0, 0, 0]; w = b[2] - b[0]; out = []
    def chk(what, s, sz, avail, ipa=False, ls=0.0, extra=0.0):
        if not s: return
        nd = width(s, sz, ipa, ls) + extra
        if nd > avail + 0.5: out.append((what, s, round(nd, 1), round(avail, 1)))
    if t == 'chip': chk('chip', n['text'], n['size'], w - 4 - 2 * MINPAD, ls=0.06)
    elif t == 'tag': chk('tag', n['text'], n['size'], w - (12 + 48 + 12 + 18 + 4), ls=0.06)
    elif t == 'pill': chk('pill', n['label'], n['size'], w - 104 - 100)   # letter chip column 104 px, the ✓ mark + its margin on the right 100 px
    elif t == 'cta': chk('cta', ' '.join(n['lines']) + ' →', n['size'], w - 2 * MINPAD)
    elif t in ('ipapill',): chk(t, n['text'], n['size'], w - 4 - 2 * MINPAD, ipa=True)
    elif t in ('rhythm', 'score', 'grade'): chk(t, n['text'] if t != 'score' else f"🏆 {n.get('tot', 3)} / {n.get('tot', 3)}", n['size'], w - 6 - 2 * MINPAD)
    elif t == 'stamp': chk('stamp', n['text'], n['size'], w - 8 - 2 * MINPAD, ls=0.04)
    elif t == 'opt':
        chk('opt', n['text'], n['size'], w - 6 - 2 * MINPAD); chk('opt label', '✓ CORRECT', 40, w - 6 - 2 * MINPAD, ls=0.06); chk('opt label', n.get('label', ''), 40, w - 6 - 2 * MINPAD, ls=0.06)
    elif t == 'brick':
        chk('brick', n['word'], n['size'], w - 6 - 2 * MINPAD); chk('brick label', n.get('label', ''), 40, w - 6 - 2 * MINPAD, ls=0.06)
    elif t == 'candy':
        chk('candy', n['word'], n['size'], w - 6 - 2 * MINPAD); chk('candy label', n.get('label', ''), n.get('lsize', 40), w - 6 - 2 * MINPAD, ls=0.06)
    elif t == 'beat': chk('beat', n['text'], n['size'], w - 6 - 2 * 8)
    elif t == 'slot': chk('slot', n['word'], n['size'], w - 8 - 2 * 8)
    return out
