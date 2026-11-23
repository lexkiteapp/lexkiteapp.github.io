#!/usr/bin/env python3
"""Slang Card / Guess in 3 Seconds carousel (owner 22/11, docs/SAY-NATIVE.md "Slang Card"): 3 square 1080x1080 images for Facebook / Instagram from the SAME episode as the
7-12 s reel – same words, same IPA, same teacher with the SAME strong expression (the frame is cut from the reel's own rig.webm, never a stock/meme photo).
  python3 scripts/video/teach2d/card.py --ep content/video/teach2d/eps/<id>.json [--rig out/<id>/short/host/rig.webm --timeline <props.json.timeline.json>]
                                        [--teacher-png <png>] --out <dir>        (CI only: teach-video render job, after the short)
Slides: 1 cover (hook, teacher expression, the slang big in coral, IPA, meaning [+ the page language]) · 2 in real life (example bubble with the slang
highlighted + "don't use it here") · 3 quick quiz (A/B, answer in the first comment) + CTA lexkite.com. Colours = theme.json 'dusk' (Stitch Lexkite Kit).
Gates written to <out>/cards.json (the job fails on any): every text inside its box (no overflow / clipping), contrast >= 4.5:1 (>= 3:1 for >= 56 px),
teacher cut-out present (alpha area > 8 %), no English text other than the episode's own data + fixed labels."""
import argparse, json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
ap = argparse.ArgumentParser(); ap.add_argument('--ep', required=True); ap.add_argument('--rig'); ap.add_argument('--timeline'); ap.add_argument('--teacher-png'); ap.add_argument('--pic', help='guess3: the episode picture (pub/pic.png)')
ap.add_argument('--out', required=True); ap.add_argument('--theme', default='dusk'); o = ap.parse_args()
EP = json.load(open(o.ep)); D = EP['data']; GUESS3, LV3 = EP['template'] == 'guess3', EP['template'] == 'levels3'; assert EP['template'] in ('slang', 'guess3', 'levels3'), 'card.py: slang / guess3 / levels3 episodes only'; KEY = D['word'] if GUESS3 else D.get('key')
TH = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json')); C = TH[o.theme]; TINT = TH['tints'][EP['template']]
FD = f'{ROOT}/brand/social/src/fonts'; FJ, FN = f'{FD}/PlusJakartaSans-VF.ttf', f'{FD}/NotoSans-Medium.ttf'
N = 1080; PAD = 64; GATES = dict(overflow=[], contrast=[], teacher=None)
os.makedirs(o.out, exist_ok=True)


import glob
from PIL import features
# L1 pages: page-language lines need Noto for their script (render job installs fonts-noto-core + fonts-noto-cjk; Cyrillic = the repo Noto Sans).
# Arabic / Devanagari / Thai need text shaping (Pillow + libraqm); without it the card is NOT written (gate 'shaping') instead of a broken image.
SCRIPTS = [('cjk', r'[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af\uff00-\uffef]', ['/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc', '/usr/share/fonts/opentype/noto/NotoSansCJK*.ttc']),
           ('ara', r'[\u0600-\u06ff]', [f'{ROOT}/scripts/cine/fonts/NotoSansArabic.ttf', '/usr/share/fonts/truetype/noto/NotoSansArabic-Bold.ttf', '/usr/share/fonts/truetype/noto/NotoSansArabic-*.ttf']),
           ('dev', r'[\u0900-\u097f]', ['/usr/share/fonts/truetype/noto/NotoSansDevanagari-Bold.ttf', '/usr/share/fonts/truetype/noto/NotoSansDevanagari*.ttf']),
           ('tha', r'[\u0e00-\u0e7f]', ['/usr/share/fonts/truetype/noto/NotoSansThai-Bold.ttf', '/usr/share/fonts/truetype/noto/NotoSansThai*.ttf']),
           ('cyr', r'[\u0400-\u04ff]', [FN])]
COMPLEX, RAQM = {'ara', 'dev', 'tha'}, features.check_feature('raqm')


def script_of(s):
    import re as _re
    return next((k for k, rx, _ in SCRIPTS if _re.search(rx, s or '')), None)


def font(sz, ipa=False, text=''):
    k = script_of(text)
    if k:
        path = next((g for _, rx, pats in SCRIPTS if _ == k for p_ in pats for g in sorted(glob.glob(p_))), None)
        if not path: GATES['overflow'].append(dict(tag='font', why=f'no Noto font for {k}')); path = FN
        if k in COMPLEX and not RAQM: GATES['overflow'].append(dict(tag='shaping', why=f'{k} needs libraqm (Pillow raqm feature)'))
        return ImageFont.truetype(path, sz)
    f = ImageFont.truetype(FN if ipa else FJ, sz)
    if not ipa:
        try: f.set_variation_by_axes([800])
        except Exception: pass
    return f


def rgb(h):
    h = h.lstrip('#'); return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def rgba(s):   # 'rgba(r,g,b,a)' -> (r,g,b,A)
    v = [float(x) for x in s[s.index('(') + 1:-1].split(',')]; return (int(v[0]), int(v[1]), int(v[2]), int(v[3] * 255))


def lum(c):
    def ch(x): x /= 255; return x / 12.92 if x <= 0.03928 else ((x + 0.055) / 1.055) ** 2.4
    r, g, b = c[:3]; return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)


def cr(a, b): la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)


import re as _re
NOLATIN = {'dev', 'tha'}   # Noto Devanagari / Thai carry no Latin glyphs: a mixed line ("… 'salty' …") is drawn run by run (Latin runs in the brand font)


def _runs(s, k):   # [(text, is_script)] – script letters (+ the spaces/punctuation between them) vs Latin runs
    rx = [r for kk, r, _ in SCRIPTS if kk == k][0]
    out, cur, cs = [], '', None
    for ch in s:
        isk = bool(_re.match(rx, ch)) or (ch in ' ,.!?:;-–()' and cs)
        if cs is None or isk == cs: cur += ch; cs = isk if cs is None else cs
        else: out.append((cur, cs)); cur, cs = ch, isk
    if cur: out.append((cur, cs))
    return out


def tlen(d, s, f):   # text width, run by run when the font has no Latin
    k = script_of(s)
    if k not in NOLATIN: return d.textlength(s, font=f)
    lat = font(f.size)
    return sum(d.textlength(t, font=f if isk else lat) for t, isk in _runs(s, k))


def draw(d, xy, s, f, fill, **kw):
    k = script_of(s)
    if k not in NOLATIN: d.text(xy, s, font=f, fill=fill, **kw); return
    x, y, lat = xy[0], xy[1], font(f.size)
    for t, isk in _runs(s, k):
        ff = f if isk else lat; d.text((x, y), t, font=ff, fill=fill); x += d.textlength(t, font=ff)


def wrap(d, text, f, width):
    out, cur = [], ''
    for w in text.split():
        t = (cur + ' ' + w).strip()
        if tlen(d, t, f) <= width or not cur: cur = t
        else: out.append(cur); cur = w
    if cur: out.append(cur)
    return out


def text(d, xy, s, sz, fg, bg, width, align='c', ipa=False, max_lines=3, tag=''):
    """centred/left text block, shrinks (down to 70 %) until it fits max_lines; records overflow + contrast gates."""
    x, y = xy; size = sz
    while True:
        f = font(size, ipa, s); ls = wrap(d, s, f, width)
        if len(ls) <= max_lines and all(tlen(d, l, f) <= width for l in ls): break
        if size <= sz * 0.7: GATES['overflow'].append(dict(tag=tag, text=s)); break
        size -= 4
    lim = 3.0 if size >= 56 else 4.5; c_ = cr(rgb(fg), rgb(bg))
    if c_ < lim: GATES['contrast'].append(dict(tag=tag, fg=fg, bg=bg, ratio=round(c_, 2), need=lim))
    lh = round(size * 1.2)
    for i, l in enumerate(ls):
        lw = tlen(d, l, f); xx = x + (width - lw) / 2 if align == 'c' else x
        draw(d, (xx, y + i * lh), l, f, fg, **({'direction': 'rtl'} if RAQM and script_of(l) == 'ara' else {}))
    return y + len(ls) * lh


def canvas():
    im = Image.new('RGBA', (N, N), rgb(C['bg']) + (255,)); g = Image.new('RGBA', (N, N)); gd = ImageDraw.Draw(g)
    for i in range(N):   # vertical bg -> bg2 gradient (Kit canvas)
        a, b = rgb(C['bg']), rgb(C['bg2']); t = i / N; gd.line([(0, i), (N, i)], fill=tuple(int(a[k] + (b[k] - a[k]) * t) for k in range(3)) + (255,))
    im = Image.alpha_composite(im, g); bl = Image.new('RGBA', (N, N)); bd = ImageDraw.Draw(bl)
    bd.ellipse([-260, -200, 620, 560], fill=rgba(TINT)); bd.ellipse([640, 620, 1300, 1260], fill=rgba(C['blobB'])); bd.ellipse([720, -160, 1180, 300], fill=rgba(C['blobC']))
    return Image.alpha_composite(im, bl)


def card(d, box, fill, edge, ledge, r=44):
    x0, y0, x1, y1 = box; d.rounded_rectangle([x0, y0 + 8, x1, y1 + 8], r, fill=rgb(ledge)); d.rounded_rectangle(box, r, fill=rgb(fill), outline=rgb(edge), width=2)


def chip(d, x, y, s, fill=None, ink=None, edge=None):
    f = font(34); w = d.textlength(s, font=f) + 48
    d.rounded_rectangle([x, y, x + w, y + 58], 29, fill=rgb(fill or C['chip_bg']), outline=rgb(edge or C['chip_edge']), width=2)
    d.text((x + 24, y + 9), s, font=f, fill=ink or C['chip_ink']); return x + w


def brand(d, im):
    ic = Image.open(f'{ROOT}/brand/lexkite-icon-512.png').convert('RGBA').resize((64, 64)); im.alpha_composite(ic, (N - PAD - 64 - 230, PAD - 4))
    d.text((N - PAD - 220, PAD + 6), 'lexkite.com', font=font(38), fill=C['ink'])


def teacher_png():
    if o.teacher_png: return Image.open(o.teacher_png).convert('RGBA')
    T = json.load(open(o.timeline)); h = T['lines']['h']; t = h['words'][-1]['e'] + 0.45   # inside the reaction silence: the strong expression at full weight
    p = f'{o.out}/teacher.png'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-c:v', 'libvpx-vp9', '-ss', f'{t:.2f}', '-i', o.rig, '-frames:v', '1', p], check=True)   # libvpx keeps the VP9 alpha
    return Image.open(p).convert('RGBA')


def cutout(maxh):
    im = teacher_png(); bb = im.getchannel('A').point(lambda a: 255 if a > 24 else 0).getbbox()
    area = sum(1 for a in im.getchannel('A').getdata() if a > 24) / (im.width * im.height)
    GATES['teacher'] = round(area, 3)
    im = im.crop(bb); top = im.crop((0, 0, im.width, min(im.height, int(im.width * 1.05))))   # head -> chest (the half body ends in the Kit ledge)
    s = maxh / top.height; return top.resize((int(top.width * s), maxh))


def save(im, i): p = f'{o.out}/{EP["id"]}-card{i}.png'; im.convert('RGB').save(p, optimize=True); return p



def tiles(d, ty, letters=False):   # the hidden word as blank tiles (slide 1) / the filled tiles (slide 3); returns the bottom y
    n = D['n']; lw = min(96, (N - 2 * PAD - 14 * (n - 1)) // n); tx = (N - (lw * n + 14 * (n - 1))) // 2
    for i in range(n):
        xx = tx + i * (lw + 14); fill, edge, ledge = (('#FFC524', '#FFF1A8', '#A87803') if letters else (C['tile'], C['tile_edge'], C['tile_ledge']))
        d.rounded_rectangle([xx, ty + 8, xx + lw, ty + lw * 1.2 + 8], 16, fill=rgb(ledge)); d.rounded_rectangle([xx, ty, xx + lw, ty + lw * 1.2], 16, fill=rgb(fill), outline=rgb(edge), width=2)
        if letters: text(d, (xx, ty + lw * 0.12), D['word'][i].upper(), int(lw * 0.7), '#382600', fill, lw, max_lines=1, tag=f'tile{i}')
    return ty + lw * 1.2 + 8


def cta_block(d):
    c0 = N - PAD - 190; d.rounded_rectangle([PAD, c0 + 10, N - PAD, c0 + 160], 40, fill=rgb(C['cta_ledge'])); d.rounded_rectangle([PAD, c0, N - PAD, c0 + 150], 40, fill=rgb(C['cta_a']))
    text(d, (PAD, c0 + 22), 'Learn real English free', 50, C['cta_ink'], C['cta_a'], N - 2 * PAD, max_lines=1, tag='cta')
    text(d, (PAD, c0 + 86), 'lexkite.com', 40, C['cta_ink'], C['cta_a'], N - 2 * PAD, max_lines=1, tag='url')


L1 = D.get('l1'); RG = {'very-casual': 'VERY CASUAL', 'casual': 'CASUAL', 'neutral': 'EVERYDAY'}
files = []
if GUESS3:   # 1) the picture with the word hidden (blank tiles) + the hook; the answer slide follows (the shared cover below), then the example + CTA
    im = canvas(); d = ImageDraw.Draw(im); chip(d, PAD, PAD, 'GUESS IN 3 SECONDS'); brand(d, im)
    y = text(d, (PAD, 140), EP['hook']['text'], 60, C['ink'], C['bg'], N - 2 * PAD, max_lines=2, tag='hook')
    P = 520; x0 = (N - P) // 2; y0 = int(y + 20); card(d, [x0, y0, x0 + P, y0 + P], '#FFFFFF', C['edge'], C['ledge'])
    pic = Image.open(o.pic).convert('RGBA'); pic.thumbnail((P - 60, P - 60)); im.alpha_composite(pic, (x0 + (P - pic.width) // 2, y0 + (P - pic.height) // 2)); d = ImageDraw.Draw(im)
    yb = tiles(d, y0 + P + 34); text(d, (PAD, yb + 28), 'Comment your guess!', 48, C['accent'], C['bg'], N - 2 * PAD, max_lines=1, tag='bait')
    GATES['pic'] = pic.width * pic.height > 0; files.append(save(im, 1))
if LV3:   # One Situation, 3 Levels: 1 cover (hook + teacher + the situation + A1 / B1 / C1) · 2 the three lines with their level badges and notes · 3 the quick quiz + CTA (shared below)
    im = canvas(); d = ImageDraw.Draw(im); chip(d, PAD, PAD, '3 LEVELS'); brand(d, im)
    y = text(d, (PAD, 140), EP['hook']['text'], 60, C['ink'], C['bg'], N - 2 * PAD, max_lines=2, tag='hook')
    fig = cutout(430); fx = (N - fig.width) // 2; fy = int(y + 10)
    card(d, [PAD, fy + fig.height - 30, N - PAD, N - PAD - 8], C['card'], C['edge'], C['ledge'])
    im.alpha_composite(fig, (fx, fy)); d = ImageDraw.Draw(im)
    yy = text(d, (PAD + 40, fy + fig.height), D['chip'], 84, C['coral'], C['card'], N - 2 * PAD - 80, max_lines=1, tag='situation')
    yy = text(d, (PAD + 40, yy + 14), 'A1  \u2192  B1  \u2192  C1', 64, C['ink'], C['card'], N - 2 * PAD - 80, max_lines=1, tag='levels')
    if yy > N - PAD - 20: GATES['overflow'].append(dict(tag='cover', why='levels below the card', y=yy))
    files.append(save(im, 1))
    im = canvas(); d = ImageDraw.Draw(im); chip(d, PAD, PAD, D['chip'].upper()); brand(d, im); y = 140
    for k, (lv, nm) in zip('abc', (('A1', 'BEGINNER'), ('B1', 'EVERYDAY'), ('C1', 'LIKE A NATIVE'))):
        x = D['levels'][k]; nat = k == 'c'; fill, edge, ink, mute = (C['bubble_good'], C['bubble_good_edge'], C['ongood'], C['ongood']) if nat else (C['card'], C['edge'], C['ink'], C['muted'])
        card(d, [PAD, y, N - PAD, y + 288], fill, edge, C['ledge']); chip(d, PAD + 32, y + 24, f'{lv} \u00b7 {nm}', **({'fill': C['good_bg'], 'ink': C['ongood'], 'edge': C['good_edge']} if nat else {}))
        yy = text(d, (PAD + 32, y + 100), x['text'], 48, ink, fill, N - 2 * PAD - 64, align='l', max_lines=2, tag=f'line{lv}')
        text(d, (PAD + 32, max(yy + 4, y + 192)), x['note'], 34, mute, fill, N - 2 * PAD - 64, align='l', max_lines=1, tag=f'note{lv}'); y += 304
    files.append(save(im, 2))
else:
    # cover (slang: hook + expression + the slang + IPA + meaning) / answer (guess3: the same layout with the word)
    im = canvas(); d = ImageDraw.Draw(im); chip(d, PAD, PAD, 'THE ANSWER' if GUESS3 else 'SLANG CARD'); brand(d, im)
    y = text(d, (PAD, 140), 'Did you guess it?' if GUESS3 else EP['hook']['text'], 60, C['ink'], C['bg'], N - 2 * PAD, max_lines=2, tag='hook')
    ml = len(wrap(d, L1 or D['mean'], font(52, text=L1 or D['mean']), N - 2 * PAD - 80)); need = 134 + 53 + 18 + ml * 62 + 60   # key + IPA + meaning lines + card padding
    fig = cutout(int(max(320, min(520, N - PAD - 8 - (y + 10) - need + 30)))); fx = (N - fig.width) // 2; fy = y + 10
    card(d, [PAD, fy + fig.height - 30, N - PAD, N - PAD - 8], C['card'], C['edge'], C['ledge'])
    im.alpha_composite(fig, (fx, fy)); d = ImageDraw.Draw(im)
    yy = text(d, (PAD + 40, fy + fig.height), KEY, 112, C['coral'], C['card'], N - 2 * PAD - 80, max_lines=1, tag='key')
    yy = text(d, (PAD + 40, yy + 4), D['ipa'], 44, C['muted'], C['card'], N - 2 * PAD - 80, ipa=True, max_lines=1, tag='ipa')
    yy = text(d, (PAD + 40, yy + 14), L1 or D['mean'], 52, C['ink'], C['card'], N - 2 * PAD - 80, max_lines=2, tag='meaning')
    if yy > N - PAD - 20: GATES['overflow'].append(dict(tag='cover', why='meaning below the card', y=yy))
    files.append(save(im, len(files) + 1))
    # example (slang: in real life + "don't use it here" · guess3: the sentence + the filled tiles + CTA)
    im = canvas(); d = ImageDraw.Draw(im); x = chip(d, PAD, PAD, 'IN A SENTENCE' if GUESS3 else RG[D['reg']]); (not GUESS3 and D['region'] != 'global') and chip(d, x + 16, PAD, D['region']); brand(d, im)
    y = text(d, (PAD, 170), 'THE WORD IN USE' if GUESS3 else 'IN REAL LIFE', 44, C['accent'], C['bg'], N - 2 * PAD, max_lines=1, tag='label')
    if not GUESS3: y = text(d, (PAD, y + 6), D['example']['ctx'], 42, C['muted'], C['bg'], N - 2 * PAD, max_lines=2, tag='ctx')
    EX = D['ex'] if GUESS3 else D['example']['text']
    b0 = y + 24; nl = len(wrap(d, f'\u201c{EX}\u201d', font(64), N - 2 * PAD - 96)); bh = 100 + nl * 77 + (len(wrap(d, D['l1_ex'], font(44, text=D['l1_ex']), N - 2 * PAD - 96)) * 53 + 10 if D.get('l1_ex') else 0)
    card(d, [PAD, b0, N - PAD, b0 + bh], C['bubble_good'], C['bubble_good_edge'], C['ledge'])
    ye = text(d, (PAD + 48, b0 + 50), f'\u201c{EX}\u201d', 64, C['ongood'], C['bubble_good'], N - 2 * PAD - 96, max_lines=4, tag='example')
    if D.get('l1_ex'): text(d, (PAD + 48, ye + 10), D['l1_ex'], 44, C['ongood'], C['bubble_good'], N - 2 * PAD - 96, max_lines=2, tag='l1_example')
    if GUESS3: tiles(d, b0 + bh + 70, letters=True); cta_block(d)
    else:
        m0 = b0 + bh + 56; card(d, [PAD, m0, N - PAD, m0 + 270], C['bad_bg'], C['bad_edge'], C['ledge'])
        chip(d, PAD + 40, m0 + 34, "DON'T USE IT HERE", fill=C['bad_bg'], ink=C['onbad'], edge=C['bad_edge'])
        yy = text(d, (PAD + 40, m0 + 110), D['misuse']['text'], 44, C['onbad'], C['bad_bg'], N - 2 * PAD - 80, align='l', max_lines=2, tag='misuse')
        text(d, (PAD + 40, yy + 4), D['misuse']['why'], 36, C['muted'], C['bad_bg'], N - 2 * PAD - 80, align='l', max_lines=1, tag='why')
    files.append(save(im, len(files) + 1))
if not GUESS3:   # slang / levels3: quick quiz + CTA
    im = canvas(); d = ImageDraw.Draw(im); chip(d, PAD, PAD, 'QUICK QUIZ'); brand(d, im); q = D['quiz']
    y = text(d, (PAD, 230), q['ask'], 64, C['ink'], C['bg'], N - 2 * PAD, max_lines=3, tag='ask') + 40
    for i, opt in enumerate(q['options']):
        card(d, [PAD, y, N - PAD, y + 130], C['pill'], C['pill_edge'], C['pill_ledge'], r=36)
        d.rounded_rectangle([PAD + 30, y + 31, PAD + 98, y + 99], 18, fill=rgb(C['chip_bg']), outline=rgb(C['chip_edge']), width=2)
        d.text((PAD + 50, y + 38), 'AB'[i], font=font(46), fill=C['chip_ink'])
        text(d, (PAD + 130, y + 36), opt, 48, C['ink'], C['pill'], N - 2 * PAD - 170, align='l', max_lines=1, tag=f'opt{i}'); y += 160
    text(d, (PAD, y + 10), 'Answer in the first comment', 40, C['muted'], C['bg'], N - 2 * PAD, max_lines=1, tag='hint'); cta_block(d)
    files.append(save(im, len(files) + 1))

ok = not GATES['overflow'] and not GATES['contrast'] and (GATES['teacher'] or 0) > 0.08 and (not GUESS3 or GATES.get('pic'))
json.dump(dict(ep=EP['id'], ok=ok, files=[os.path.basename(f) for f in files], gates=GATES,
               caption=EP['publish']['platforms']['instagram']['caption'], hashtags=EP['publish']['hashtags'], first_comment=EP['publish']['first_comment']),
          open(f'{o.out}/cards.json', 'w'), indent=1, ensure_ascii=False)
print(('\u2713' if ok else '\u2717'), EP['template'], 'cards', EP['id'], GATES)
sys.exit(0 if ok else 1)
