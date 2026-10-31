#!/usr/bin/env python3
"""Teach2D builder (docs/VIDEO-TEACH2D.md): episode spec + voice clock -> Remotion props (composition teach-short) + QC timeline. CI only.
  python3 scripts/video/teach2d/build.py --ep EP.json --vo VO/vis3 --host HOST_DIR --format short|wide --public PUB --out PROPS.json
- Timeline: every line's Kokoro wav placed one after another (pause after each line from the spec; quiz = 3 s countdown, repeat = 1.8 s),
  word times = faster-whisper clock aligned to the exact caption tokens (news_voice.py), so captions, cards and mouth share one clock.
- Host: the 2D registry teacher (web/teach/<who>/talk|listen, host.py -> VP9 alpha) speech-gated: talk while the voice speaks, closed-mouth
  listen in every pause > 0.3 s (owner 26/10). One fixed transform for the whole video (no zoom, no pan).
- Cards: Lexkite Kit (Stitch) components in ONE card region above the teacher's head; every element appears on its spoken word
  (in.t = word.s - HALF, gate +-80 ms), static while read, cards in a slot hand over without overlap. Calm 'soft' entrances only (owner
  rejected the bouncy #191 effects), one light celebration (check + confetti <= 0.9 s) on the quiz answer.
- Writes PUB/voice.wav (-16 LUFS, soft synth ticks mixed after loudnorm), PUB/qr.png, PUB/icon.png, fonts, and OUT.timeline.json (qc.py)."""
import os, sys, json, re, math, argparse, shutil, subprocess, wave
import numpy as np
from PIL import ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, f'{ROOT}/scripts/video/motion'); import core as C   # noqa: E402  (same maths as Remotion core.mjs)
sys.path.insert(0, f'{ROOT}/scripts/video/tpl'); from overlay_gates import bank_ipa   # noqa: E402  (audited IPA bank, same lookup as qc.py)
sys.path.insert(0, HERE); import fit as FT   # noqa: E402  (chip / pill text fit, same maths as qc.py)

ap = argparse.ArgumentParser()
for a in ('ep', 'vo', 'host', 'public', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--format', default='short', choices=['short', 'wide'])
ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--theme', default='', help='override the episode theme (dark | dusk | light)')
ap.add_argument('--fonts', default=f'{ROOT}/brand/social/src/fonts')
ap.add_argument('--layout', default='', choices=['', 'corner', 'side', 'bubble'], help='short layout: corner (teacher bottom-centre) | side (teacher left, larger) | bubble (big card, teacher in a round call window); default = the episode layout, else corner')
o = ap.parse_args()
EP = json.load(open(o.ep)); THEME = o.theme or EP['theme']; _TJ = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json')); TH = _TJ[THEME]
TINT = _TJ['tints'][EP['template']]   # series colour: the big canvas blob carries it, so each series is recognisable from frame 0
HG = json.load(open(f'{o.host}/geom.json')); EMBED = o.format == 'wide'
# same cards / timing; only where the card region, captions and teacher sit (owner 29/10: varied layouts). v2 (31/10): bigger teacher, k <= 1.0 of the
# 1108x960 HD clip: corner 864 px (k 0.90), side 920 px (k 0.96), bubble window 480 px (k 0.93-0.96; was 640 / 760 / 400). head_y = top of the head, right under the
# caption row (the clip's bust cut falls below the frame, the counter at ct grounds her); scenes.json short items are drawn for these numbers.
LAYOUTS = dict(
    corner=dict(region=[60, 324, 960, 1150], cap=[60, 1166, 960, 1280], host_h=864, host_cx=540, head_y=1292, ct=1830),
    side=dict(region=[60, 324, 960, 1150], cap=[60, 1166, 760, 1280], host_h=920, host_cx=300, head_y=1292, ct=1830),
    bubble=dict(region=[60, 324, 960, 1280], cap=[60, 1296, 960, 1410], host_h=744, host_cx=None, bubble=[552, 1428, 1032, 1908]))
LAYOUT = (o.layout or EP.get('layout') or 'corner') if o.format == 'short' else 'wide'   # --layout wins, then the pilot row's layout (gen.py ep.layout)
FMT = dict(short=dict(W=1080, H=1920, chip=[60, 236], safe=[48, 232, 960, 1497], **LAYOUTS.get(LAYOUT, LAYOUTS['corner'])),
           wide=dict(W=1920, H=1080, region=[96, 150, 1056, 990], chip=[96, 70], safe=[60, 48, 1860, 1032], cap=None, host_h=960, host_cx=1460))[o.format]
SOCIAL = o.format == 'short'   # owner 29/10: social shorts get the cinematic layer (hook punch, camera push / cuts, whoosh + music); lesson embeds stay calm
W, H = FMT['W'], FMT['H']; RX0, RY0, RX1, RY1 = FMT['region']; RW = RX1 - RX0
S = dict(hook=96, big=104, body=60, sub=48, chip=40, ipa=48, cap=58, pill=56)
PAD, GAP, LEDGE, RADIUS = 40, 24, 10, 44
FJ, FN = f'{o.fonts}/PlusJakartaSans-VF.ttf', f'{o.fonts}/NotoSans-Medium.ttf'; _fc = {}


def font(sz, ipa=False):
    k = (sz, ipa)
    if k not in _fc:
        f = ImageFont.truetype(FN if ipa else FJ, sz)
        if not ipa: f.set_variation_by_axes([800])
        _fc[k] = f
    return _fc[k]
def tw(s, sz, ipa=False): return font(sz, ipa).getlength(s)


# ---------------- timeline: lines, words, speech, pauses ----------------
T0 = 0.10; t = T0; LINES = {}; SPEECH = []
for l in EP['lines']:
    wj = json.load(open(f"{o.vo}/{l['id']}.words.json")); fn = f"{o.vo}/{l['id']}.wav"
    with wave.open(fn) as w: sr = w.getframerate(); dur = w.getnframes() / sr
    ws = [dict(w=x['w'], s=round(t + x['s'], 3), e=round(t + x['e'], 3)) for x in wj['words']]
    LINES[l['id']] = dict(l, t0=round(t, 3), t1=round(t + dur, 3), words=ws, wav=fn, interp=wj.get('interpolated', 0), whisper=wj.get('whisper', ''))
    SPEECH.append([ws[0]['s'], ws[-1]['e']]); t += dur + l['pause']
TOTAL = round(t + (0.3 if EMBED else 0.6), 3)
norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower().replace('’', "'"))


def word(lid, tok, n=0):
    """start/end of the n-th spoken token matching `tok` (case/punct-insensitive) in line lid (tok int = index)."""
    ws = LINES[lid]['words']
    if isinstance(tok, int): return ws[tok]
    hits = [w for w in ws if norm(w['w']) == norm(tok)]
    assert len(hits) > n, (lid, tok, [w['w'] for w in ws]); return hits[n]
def at(lid, tok=0, n=0): return word(lid, tok, n)['s']
def start(lid): return LINES[lid]['words'][0]['s']
def end(lid): return LINES[lid]['words'][-1]['e']


# ---------------- nodes ----------------
NODES = []; CUES = []; IPA = []; PAIRS = []; SLOTS = []


_ID = [0]
def nid(p): _ID[0] += 1; return f'{p}{_ID[0]}'
def cue(t_word, k='soft'): return dict(t=round(t_word - C.HALF[k], 4), k=k)


class Card:
    """A Lexkite Kit card (2 px border, darker bottom ledge, radius 44) stacked in the card region; rows are laid out top-down."""
    def __init__(s, y0, tone='card', x0=None, w=None, badge=None, t_badge=None):
        s.x0 = RX0 if x0 is None else x0; s.w = RW if w is None else w; s.y0 = y0; s.y = PAD; s.rows = []; s.tone = tone; s.id = nid('c'); s.lp = PAD
        if badge:   # ✗ / ✓ badge in its own left column (text never runs under it)
            s.rows.append(dict(id=nid('b'), type=badge, box=[PAD, PAD + 2, PAD + 72, PAD + 74], **{'in': cue(t_badge, 'pop' if badge == 'check' else 'soft')})); s.lp = PAD + 72 + 24
    @property
    def inner(s): return s.w - s.lp - PAD
    def wrap(s, runs, sz, width=None, ipa=False):
        """runs [[text, colour token]] -> lines of runs, greedy word wrap at width (balanced when 2 lines)."""
        width = width or s.inner; units = []   # a word split across colour runs (“ + Grab, coffee + ”?) is ONE unit: never broken between runs
        for txt, c in runs:
            for w in re.findall(r'\s*\S+\s*', txt):
                if units and not w[0].isspace() and not units[-1][-1][0][-1].isspace(): units[-1].append([w, c])
                else: units.append([[w, c]])
        lines, cur, cw = [], [], 0
        for u in units:
            uw = sum(tw(w, sz, ipa) for w, _ in u); ww = uw - tw(u[-1][0], sz, ipa) + tw(u[-1][0].rstrip(), sz, ipa)
            if cur and cw + ww > width: lines.append(cur); cur, cw = [], 0
            cur += [list(x) for x in u]; cw += uw
        if cur: lines.append(cur)
        for ln in lines: ln[0][0] = ln[0][0].lstrip()
        return lines
    def text(s, runs, sz, t_in, align='l', ipa=False, gap=GAP, k='soft', tag=None, extra=None):
        out = []
        for ln in s.wrap(runs, sz, ipa=ipa):
            ln[-1][0] = ln[-1][0].rstrip(); lw = sum(tw(x[0], sz, ipa) for x in ln); h = round(sz * 1.22)
            x = s.lp + (s.inner - lw) / 2 if align == 'c' else s.lp
            n = dict(id=nid('t'), type='text', runs=ln, size=sz, ipa=ipa, box=[x, s.y, x + lw, s.y + h], **({'in': cue(t_in, k)} if t_in is not None else {}), **(extra or {}))
            s.rows.append(n); out.append(n); s.y += h + 6
            CUES.append(dict(node=n['id'], t=t_in, tag=tag or ''.join(r[0] for r in ln)))
        s.y += gap - 6
        return out
    def add(s, n, h, gap=GAP):
        n.setdefault('id', nid(n['type'][0])); n['box'] = [n['box'][0], s.y, n['box'][2], s.y + h]; s.rows.append(n); s.y += h + gap; return n
    def place(s, t_in, t_out=None, slot='a', k='soft'):
        h = s.y - GAP + PAD + LEDGE; s.box = [s.x0, s.y0, s.x0 + s.w, s.y0 + h]
        assert s.box[3] <= RY1 + 2, ('card leaves the card region', s.box, RY1)
        c = dict(id=s.id, type='card', tone=s.tone, box=s.box, **{'in': cue(t_in, k)}, **({'out': dict(t=round(t_out, 4))} if t_out else {}), **({'tail': s.tail} if getattr(s, 'tail', None) else {}))
        NODES.append(c)
        for n in s.rows:
            n['parent'] = s.id; n.setdefault('in', c['in']); n['in'] = dict(n['in'], t=max(n['in']['t'], c['in']['t']))
            NODES.append(n)
        # sized to content (owner 31/10: no empty card half): a card whose rows arrive on later words grows with them (ease 0.24 s, same box for QC)
        steps = sorted({round(n['in']['t'], 4) for n in s.rows if n['in']['t'] > c['in']['t'] + 0.05})
        hs_ = [min(h, max([n['box'][3] for n in s.rows if n['in']['t'] <= tt + 1e-6] or [0]) + PAD + LEDGE) for tt in [c['in']['t']] + steps]
        if hs_[0] < h - 40: c['grow'] = [dict(t=round(tt, 4), h=round(hv, 1)) for tt, hv in zip([c['in']['t']] + steps, hs_)]
        SLOTS.append(dict(slot=slot, card=s.id, t_in=c['in']['t'], t_out=t_out))
        return s.box


def cw(text, sz=None): return FT.chip_w(text, sz or S['chip'])   # pill width that holds the text on ONE line (fit.py, rendered font + letter-spacing)


def chip(c, text, t_in, tone='chip'):
    w = cw(text)
    return c.add(dict(type='chip', text=text, tone=tone, size=S['chip'], box=[PAD, 0, PAD + w, 0], **{'in': cue(t_in)}), S['chip'] + 28)


def flag(cc, x, sz, t_in): return dict(type='flag', cc=cc, box=[x, 0, x + sz * 1.5, 0], **{'in': cue(t_in)})


def pills(c, opts, t_in, t_ans, right, ws=None):
    """A/B answer cards (Kit answer card: letter chip, 2 px border, 5 px ledge); the right one turns green + check on its spoken word."""
    sz = S['pill']
    while sz > 40 and max(FT.width(x, sz) for x in opts) > c.inner - 204: sz -= 2   # one line beside the letter chip and the ✓ (fit.py)
    for i, lab in enumerate(opts):
        n = dict(type='pill', idx='AB'[i], label=lab, size=sz, box=[PAD, 0, PAD + c.inner, 0],
                 st=[dict(t=round(t_ans - C.MIX / 2, 4), s='right' if i == right else 'dim')], **{'in': cue(ws[i] if ws else t_in)})
        c.add(n, 112, gap=16)
        if i == right:
            NODES.append(dict(id=nid('k'), type='check', parent=None, box=None, **{'in': cue(t_ans, 'pop')}, _pill=n['id']))
            NODES.append(dict(id=nid('f'), type='confetti', box=None, **{'in': dict(t=round(t_ans, 4), k='fade')}, _pill=n['id']))
    c.y += GAP - 16


def ring(c_box, t0, t1):
    """3-2-1 countdown ring at the top-right corner of a card (value widget: only the ring + digit change)."""
    d = 96; x1, y0 = c_box[2] - 28, c_box[1] + 22
    NODES.append(dict(id=nid('r'), type='ring', ring=dict(t0=round(t0, 3), t1=round(t1, 3)), size=54, box=[x1 - d, y0, x1, y0 + d], **{'in': cue(t0)}, out=dict(t=round(t1 + 0.4, 3))))


def runs_hl(text, hl, col='primary', base='ink'):
    """sentence runs with the tokens of `hl` (phrase) coloured."""
    if not hl: return [[text, base]]
    i = text.lower().find(hl.lower()); return [[text[:i], base], [text[i:i + len(hl)], col], [text[i + len(hl):], base]] if i >= 0 else [[text, base]]


def strike_on(tn, phrase, t_word):
    """red strike drawn across `phrase` inside text node tn (draw 0.30 s, appears on its spoken word)."""
    txt = ''.join(r[0] for r in tn['runs']); i = txt.lower().find(phrase.lower()); assert i >= 0, (phrase, txt)
    x0 = tn['box'][0] + tw(txt[:i], tn['size']); x1 = x0 + tw(txt[i:i + len(phrase)], tn['size']); ym = (tn['box'][1] + tn['box'][3]) / 2 + 4
    NODES.append(dict(id=nid('s'), type='strike', parent=tn['parent'] if 'parent' in tn else None, _rel=tn['id'], box=[x0 - 6, ym - 5, x1 + 6, ym + 5], **{'in': cue(t_word, 'draw')}))


def dots(c, syl, stress, t_in, t_hit, sz=96):
    """syllables + stress dots (big dot lit on the stressed syllable when it is spoken / revealed)."""
    disp = [x.upper() if i == stress else x for i, x in enumerate(syl)]; widths = [tw(x, sz) for x in disp]; gap = 30; tot = sum(widths) + gap * (len(syl) - 1); x = PAD + (c.inner - tot) / 2; y = c.y
    row = []
    for i, (sy, wv) in enumerate(zip(syl, widths)):
        col = 'accent' if i == stress else 'ink'
        tn = dict(id=nid('t'), type='text', runs=[[disp[i], 'ink']], size=sz, box=[x, y, x + wv, y + round(sz * 1.22)], **{'in': cue(t_in)},
                  st=[dict(t=round(t_hit, 4), s='hit')] if i == stress else [], hit_col=col)
        dn = dict(id=nid('d'), type='dot', big=i == stress, box=[x + wv / 2 - (17 if i == stress else 9), y + round(sz * 1.3), x + wv / 2 + (17 if i == stress else 9), y + round(sz * 1.3) + (34 if i == stress else 18)],
                  **{'in': cue(t_in)}, st=[dict(t=round(t_hit, 4), s='hit')] if i == stress else [])
        row += [tn, dn]; x += wv + gap
    for n in row: c.rows.append(n)
    CUES.append(dict(node=row[0]['id'], t=t_in, tag=''.join(syl)))
    c.y += round(sz * 1.3) + 40 + GAP
    return row


# ---------------- templates (one point each) ----------------
def row2(c, label, wd, col, t_label, t_word, sz=S['big']):
    """one row: small muted label left, big coloured word right (verb forms table)."""
    h = round(sz * 1.22); y = c.y; ww = tw(wd, sz); lw = tw(label, S['sub'])
    a = dict(id=nid('t'), type='text', runs=[[label, 'muted']], size=S['sub'], ipa=False, box=[PAD, y + (h - S['sub'] * 1.22) / 2, PAD + lw, y + (h + S['sub'] * 1.22) / 2], **{'in': cue(t_label)})
    b = dict(id=nid('t'), type='text', runs=[[wd, col]], size=sz, ipa=False, box=[PAD + c.inner - ww, y, PAD + c.inner, y + h], **{'in': cue(t_word)})
    c.rows += [a, b]; CUES.extend([dict(node=a['id'], t=t_label, tag=label), dict(node=b['id'], t=t_word, tag=wd)]); c.y += h + GAP


def series_chip():   # fixed series chip (whole video, inside the platform top band rule: y >= SAFE top)
    txt = f"{EP['series'].upper()} · PART {EP['part']}"; x0, y0 = FMT['chip']; w = cw(txt)
    NODES.append(dict(id='series', type='chip', text=txt, tone='chip', size=S['chip'], box=[x0, y0, x0 + w, y0 + S['chip'] + 28], **{'in': dict(t=-0.2, k='fade')}, out=dict(t=round(start('c') - 0.2, 3))))


def hook_card(text_runs, t_out, extra=None):
    """hook = fully visible from frame 0 (alpha 1 by t = 0), names the payoff in <= 6 words."""
    c = Card(RY0)
    if extra: extra(c)
    c.text(text_runs, S['hook'], None, align='c', tag='hook')
    b = c.place(-0.13, t_out, 'a', k='fade')
    for n in NODES:
        if n['id'] == c.id: n['hook'] = True
        if n.get('parent') == c.id: n['in'] = dict(t=-0.13, k='fade')
    return b


def end_card():
    """end card: app icon + Lexkite + 100% FREE, then the deep-link CTA button + QR + lexkite.com (embed: 'Next step', no QR / follow)."""
    cta = EP['cta']; t_in = start('c'); t_url = at('c', 'lexkite.com'); c = Card(RY0, tone='card')
    lw = tw('Lexkite', 84); x = PAD + (c.inner - (110 + 24 + lw)) / 2; y = c.y
    c.rows.append(dict(id=nid('i'), type='img', src='icon.png', radius=28, box=[x, y, x + 110, y + 110], **{'in': cue(t_in)}))
    c.rows.append(dict(id=nid('t'), type='text', runs=[['Lexkite', 'ink']], size=84, ipa=False, box=[x + 134, y + 4, x + 134 + lw, y + 106], **{'in': cue(t_in)}))
    CUES.append(dict(node=c.rows[-1]['id'], t=t_in, tag='Lexkite')); c.y += 110 + 16
    c.text([['100% FREE', 'accent']], S['body'], t_in, align='c')
    if EMBED:
        c.text([['Next step →', 'primary']], S['body'], t_url, align='c')
    else:
        c.add(dict(type='cta', lines=[cta['say']], size=S['body'], box=[PAD, 0, PAD + c.inner, 0], **{'in': cue(t_url)}), 118)
        q = 220; c.add(dict(type='img', src='qr.png', radius=24, box=[PAD + (c.inner - q) / 2, 0, PAD + (c.inner + q) / 2, 0], **{'in': cue(t_url)}), q, gap=14)
        c.text([['lexkite.com', 'muted']], S['sub'], t_url, align='c')
    c.place(t_in, None, 'a')


def save_card(rows, t_in, t_out):
    c = Card(RY0); chip(c, 'SAVE THIS', t_in)
    for r in rows: c.text(r, S['body'], t_in)
    c.place(t_in, t_out, 'a')


def quiz_card(stem_runs, opts, right, t_q, t_ans, t_out, opt_ws=None):
    c = Card(RY0); chip(c, 'QUICK QUIZ', t_q)
    if stem_runs: c.text(stem_runs, S['body'], t_q)
    pills(c, opts, t_q, t_ans, right, opt_ws)
    b = c.place(t_q, t_out, 'a'); ring(b, end('q') + 0.05, end('q') + LINES['q']['pause'] - 0.1)


def top(type_, box, t_in, k='soft', out=None, **kw):   # a free (card-less) element in canvas px
    n = dict(id=nid(type_[0]), type=type_, box=[round(v, 1) for v in box], **{'in': (dict(t=-0.2, k='fade') if t_in is None else cue(t_in, k))}, **kw)   # None = on screen from frame 0
    if out is not None: n['out'] = dict(t=round(out, 3))
    NODES.append(n); return n


OWN_HOOK = [bool(EP['hook'].get('style'))]   # v2 rows with a hook_style: the on-screen hook is ep.hook.text (hook_hl in accent) in every template


def title(runs, size, y, t_in, out, hook=False, align='c', x0=RX0, x1=RX1, lines=2, fit=False):
    """free headline (Stitch frames put the title on the canvas, not in a card): one or more balanced lines, centred."""
    if hook and EP['hook'].get('style'):
        if not OWN_HOOK[0]: return y   # the own hook is ONE title (the template's second hook line is dropped with its text)
        OWN_HOOK[0] = False; runs = runs_hl(EP['hook']['text'], EP['hook'].get('hl'), 'accent'); fit = True
    while fit and size > 64 and len(Card(y, x0=x0, w=x1 - x0).wrap(runs, size, width=x1 - x0)) > lines: size -= 4   # fits the template's hook space
    c = Card(y, x0=x0, w=x1 - x0); lines = c.wrap(runs, size, width=x1 - x0); ns = []; yy = y
    for ln in lines:
        ln[-1][0] = ln[-1][0].rstrip(); lw = sum(tw(r[0], size) for r in ln); h = round(size * 1.18)
        xx = x0 + ((x1 - x0) - lw) / 2 if align == 'c' else x0
        n = top('text', [xx, yy, xx + lw, yy + h], t_in, out=out, runs=ln, size=size, ipa=False)
        if hook:
            n['hook'] = True
            if SOCIAL: n['in'] = dict(t=0.0, k='punch')   # hook slams in on frame 0 (fully readable at once)
        CUES.append(dict(node=n['id'], t=t_in, tag=''.join(r[0] for r in ln))); ns.append(n); yy += h + 4
    return yy


CANDY = dict(coral=dict(a='#FF7B60', b='#F2553B', edge='#FFA18F', ledge='#9E2B16', ink='#FFFFFF', lab='#4A1208'),
             amber=dict(a='#FFB859', b='#FA8C16', edge='#FFD591', ledge='#AD4E00', ink='#381600', lab='#4A1F00'),
             gold=dict(a='#FFE266', b='#FFC524', edge='#FFF1A8', ledge='#A87803', ink='#382600', lab='#4A3300'))


def T_verbs():
    """Stitch 8a2f4328… 'Climbing candy tiles': base → past → past participle climb a staircase, each on its spoken word; 'NOT BREAKED!' stamp."""
    D = EP['data']; series_chip(); t_out = start('q') - 0.2
    y = title([['VERB CHALLENGE', 'primary']], 40, RY0, None, t_out)
    y = title([['Three forms of ', 'ink'], [D['base'], 'accent']], 84, y + 4, None, t_out, hook=True, lines=1)
    cy = y + 36; tw_, th_ = 560, 172; steps = [(RX0 + 10, cy + 404), (RX0 + (RW - tw_) / 2, cy + 206), (RX1 - 10 - tw_, cy + 8)]
    top('path', [RX0, cy, RX1, cy + 580], start('b'), out=t_out, pts=[[x + tw_ / 2 - RX0, yy + th_ / 2 - cy] for x, yy in steps])
    for i, (lab, wd, lid, tone, hint) in enumerate([('BASE FORM', D['base'], 'b', 'coral', 'now · always'), ('PAST SIMPLE', D['past'], 'p', 'amber', 'yesterday'),
                                                     ('PAST PARTICIPLE', D['pp'], 'pp', 'gold', 'has · have')]):
        x, yy = steps[i]; P = CANDY[tone]; t_w = at(lid, wd)
        n = top('candy', [x, yy, x + tw_, yy + th_], t_w, out=t_out, tone=tone, pal=P, label=lab, word=wd, step=i + 1, size=88, lsize=40,
                pairs=[[P['ink'], P['b'], 88], [P['lab'], P['a'], 40]])
        CUES.append(dict(node=n['id'], t=t_w, tag=wd))
    x, yy = steps[0]; stt = f"NOT {D['over'].upper()}!"; sw_ = max(350, FT.width(stt, 44, ls=0.04) + 8 + 2 * FT.MINPAD + 16); sx = min(x + tw_ - 50, RX1 - sw_)
    top('stamp', [sx, yy + 44, sx + sw_, yy + 128], at('w', D['over']), k='pop', out=t_out, text=stt, size=44, rot=-6,
        pairs=[['#FFFFFF', '#C92A2A', 44]])
    stem = D['quiz']['stem']
    quiz_card([[stem, 'ink']], D['quiz']['options'], D['quiz']['answer'], start('q'), at('a', D['quiz']['options'][D['quiz']['answer']]), start('sh') - 0.2,
              opt_ws=[at('q', D['quiz']['options'][0]), at('q', D['quiz']['options'][1])])
    save_card([[[f"{D['base']} · {D['past']} · {D['pp']}", 'primary']], [[f"Not {D['over']}", 'bad']]], start('sh'), start('c') - 0.2)
    end_card()


def beat_row(word, syl, stress, ipa, t_in, t_hit, t_out, y):
    """Stitch 1af83ea9… 'Word stress beat': syllable tiles on a rhythm line; the stressed tile turns gold and lifts on the word that names it."""
    y = title([['WORD STRESS BEAT', 'primary']], 40, y, t_in, t_out)
    y = title([[word, 'ink']], 96, y + 2, t_in, t_out)
    n = len(syl); gap = 22; big = 1.18; w = min(230, (RW - gap * (n - 1)) / (n - 1 + big)); h = 150; tot = w * (n - 1 + big) + gap * (n - 1); x = RX0 + (RW - tot) / 2
    ty = y + 120; pts = []; nodes = []
    for i, sy in enumerate(syl):
        ww = w * big if i == stress else w; disp = sy.upper() if i == stress else sy
        sz = min(84, int(84 * (ww - 30) / max(1, tw(disp, 84))))
        nd = top('beat', [x, ty, x + ww, ty + h], t_in, out=t_out, text=disp, size=sz, big=i == stress, st=[dict(t=round(t_hit, 4), s='hit')] if i == stress else [],
                 pairs=[[TH['ink'], TH['tile'], sz]] + ([['#382600', '#FFC524', sz]] if i == stress else []))
        nodes.append(nd); pts.append([x + ww / 2 - RX0, ty + h / 2 - (y - 10)]); x += ww + gap
    top('path', [RX0, y - 10, RX1, ty + h + 60], t_in, out=t_out, pts=pts, wave=True)
    sb = nodes[stress]['box']
    pw = max(400, cw('PRIMARY STRESS', 40)); px = min(max(RX0, (sb[0] + sb[2]) / 2 - pw / 2), RX1 - pw)   # over the stressed tile, inside the region
    top('chip', [px, ty - 116, px + pw, ty - 48], t_hit, out=t_out, text='PRIMARY STRESS', tone='chip', size=40)
    y2 = ty + h + 70; iw = tw(ipa, 52, True) + 80
    nip = top('ipapill', [RX0 + (RW - iw) / 2, y2, RX0 + (RW + iw) / 2, y2 + 88], t_in, out=t_out, text=ipa, size=52, pairs=[[TH['ink'], TH['card'], 52]])
    rh = ' · '.join('DUM' if i == stress else 'da' for i in range(n)); rw = tw(rh, 44) + 60
    top('rhythm', [RX0 + (RW - rw) / 2, y2 + 112, RX0 + (RW + rw) / 2, y2 + 182], t_hit, out=t_out, text=rh, stress=stress, size=44, pairs=[[TH['accent'], TH['card'], 44], [TH['muted'], TH['card'], 44]])
    IPA.append(dict(token=word, ipa=ipa, syl=syl, stress=stress, node=nip['id']))
    return y2 + 182


def T_stress():
    D = EP['data']; A, B = D['a'], D['b']; series_chip(); t_q = start('q') - 0.2
    title([["Where's the ", 'ink'], ['stress', 'accent'], ['?', 'ink']], 96, RY0 + 120, None, start('a') - 0.2, hook=True)
    beat_row(A['word'], A['syl'], A['stress'], A['ipa'], start('a'), at('a', 'first'), at('b', B['word']) - 0.2, RY0)
    yb = beat_row(B['word'], B['syl'], B['stress'], B['ipa'], at('b', B['word']), at('m', B['say']), t_q, RY0)
    sw_ = max(380, cw('SAY IT WITH ME', 40)); top('chip', [RX0 + (RW - sw_) / 2, yb + 24, RX0 + (RW + sw_) / 2, yb + 92], start('r'), out=t_q, text='SAY IT WITH ME', tone='chip', size=40)
    o = D['quiz']['options']
    quiz_card([[B['word'], 'ink']], [f"{o[0]}-…", f"…-{o[1]}-…"], 1, start('q'), at('ans', B['say']), start('sh') - 0.2)
    save_card([[[A['word'] + ' → ', 'muted'], ['1st', 'accent']], [[B['word'] + ' → ', 'muted'], ['2nd', 'accent']]], start('sh'), start('c') - 0.2)
    end_card()


def T_mistake():
    """Stitch 3036b5ac… 'chat bubbles': headline on the canvas, DON'T SAY bubble (strike on the extra word) → SAY THIS bubble → tip pill."""
    D = EP['data']; series_chip(); t_out = start('q') - 0.2
    ph = EP['hook']['text'].split('“')[-1].rstrip('”'); t_h = start('w') - 0.2
    y = title([['Stop saying', 'ink']], 96, RY0 + 120, None, t_h, hook=True)
    title([[f'“{ph}”!', 'coral']], 96, y, None, t_h, hook=True)
    c = Card(RY0, tone='bubble_bad', w=RW - 70, badge='cross', t_badge=start('w')); c.tail = 'l'
    tn = c.text([[D['wrong'], 'onbad']], S['body'], start('w'))[0]; b1 = c.place(start('w'), t_out, 'a')
    strike_on(tn, D['strike'], at('w', D['strike'].split()[0]) + 0.15)
    if 'g' in LINES: NODES.append(dict(id='guess', type='qmark', size=96, box=[RX1 - 114, b1[1] + 20, RX1 - 4, b1[1] + 130], **{'in': cue(start('g'))}, out=dict(t=round(at('r', 'better') - 0.2, 3))))
    c = Card(b1[3] + 30, tone='bubble_good', x0=RX0 + 70, w=RW - 70, badge='check', t_badge=at('r', 'better')); c.tail = 'r'
    c.text([[D['right'], 'ongood']], S['body'], at('r', 'better')); b2 = c.place(at('r', 'better'), t_out, 'b')
    c = Card(b2[3] + 30, tone='card'); c.text([['⚡ ', 'accent'], [D['why'], 'ink']], S['sub'], start('y')); c.place(start('y'), t_out, 'c')   # memory trick -> save card
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[D['right'], 'good']], [[D['memory'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


def T_usuk():
    """Stitch a5a31136… 'US vs UK battle': split card (US half | UK half) with a coral VS badge on the seam; example, then the quiz below it."""
    D = EP['data']; series_chip(); t_split = start('sh') - 0.2
    title([['US', 'primary'], [' or ', 'ink'], ['UK', 'coral'], ['?', 'ink']], 112, RY0 + 120, None, at('us', D['us']) - 0.2, hook=True, lines=1)
    top('flags', [RX0 + (RW - 300) / 2, RY0 + 290, RX0 + (RW + 300) / 2, RY0 + 390], None, out=at('us', D['us']) - 0.2)
    H2 = 330; half = RW / 2
    top('split', [RX0, RY0, RX1, RY0 + H2], at('us', D['us']), out=t_split)
    for i, (cc, wd, ipa, col, lid, lab) in enumerate([('us', D['us'], D['ipa_us'], 'primary', 'us', 'US ENGLISH'), ('uk', D['uk'], D['ipa_uk'], 'coral', 'uk', 'UK ENGLISH')]):
        x0 = RX0 + i * half; t_w = at(lid, wd); inner = half - 90
        top('tag', [x0 + 30, RY0 + 30, x0 + 30 + FT.tag_w(lab, 40), RY0 + 98], t_w, out=t_split, cc=cc, text=lab, size=40)   # flag + ONE-line label inside the pill
        sz = min(104, int(104 * inner / max(1, tw(wd, 104)))); ww = tw(wd, sz)
        nw = top('text', [x0 + (half - ww) / 2, RY0 + 130, x0 + (half + ww) / 2, RY0 + 130 + round(sz * 1.2)], t_w, out=t_split, runs=[[wd, col]], size=sz, ipa=False, parent=None)
        CUES.append(dict(node=nw['id'], t=t_w, tag=wd)); iw = tw(ipa, 48, True)
        ni = top('text', [x0 + (half - iw) / 2, RY0 + 260, x0 + (half + iw) / 2, RY0 + 318], t_w, out=t_split, runs=[[ipa, 'muted']], size=48, ipa=True)
        IPA.append(dict(token=wd, ipa=ipa, node=ni['id']))
    top('vs', [RX0 + half - 60, RY0 + H2 - 66, RX0 + half + 60, RY0 + H2 + 54]   # medallion on the bottom seam (never on a word)
       , at('uk', 'Britain'), k='pop', out=t_split, size=60, pairs=[['#FFFFFF', '#E0482F', 60]])
    c = Card(RY0 + H2 + 76); c.text([[D['same'], 'accent']], S['body'], at('uk', 'same'), align='c', gap=GAP)
    if 'tw' in LINES:   # the surprise line (cookie ep: in America a biscuit is soft bread) on its spoken word, same card
        c.text([['US ', 'muted'], [D['uk'], 'primary'], [' = ' + D['twist']['card'], 'ink']], S['sub'], start('tw'), align='c', gap=GAP)
    c.text(runs_hl(LINES['x']['text'], D['us']), S['body'], start('x'), align='c'); c.place(at('uk', 'same'), start('q') - 0.2, 'b')
    qc_ = Card(RY0 + H2 + 76); chip(qc_, 'QUICK QUIZ', start('q')); pills(qc_, [D['us'], D['uk']], start('q'), at('a', D['uk']), 1)
    b = qc_.place(start('q'), t_split, 'b'); ring(b, end('q') + 0.05, end('q') + LINES['q']['pause'] - 0.1)
    save_card([[['US ', 'muted'], [D['us'], 'primary']], [['UK ', 'muted'], [D['uk'], 'coral']]], start('sh'), start('c') - 0.2)
    end_card()


def _fix(D, t_hook_out, wrong_l, right_l, strike_tok_line):
    c = Card(RY0, tone='bad', badge='cross', t_badge=start(wrong_l)); tn = c.text([[D['wrong'], 'ink']], S['body'], start(wrong_l))[0]; b1 = c.place(start(wrong_l), start('q') - 0.2, 'a')
    strike_on(tn, D['strike'], at(wrong_l, D['strike'].split()[0]) + 0.15)
    return b1


def T_phrasal():
    D = EP['data']; series_chip()
    hook_card([[EP['hook']['text'], 'ink']], start('w') - 0.2)
    b1 = _fix(D, None, 'w', 'r', None)
    c = Card(b1[3] + 28, tone='good', badge='check', t_badge=at('r', 'say')); c.text(runs_hl(D['right'], D['pv'], 'good'), S['body'], at('r', 'say'))
    c.text([[D['pv'], 'primary'], [' ' + D['mean'], 'ink']], S['sub'], start('m'))
    c.text([[D['aha'], 'accent']], S['sub'], start('k')); c.place(at('r', 'say'), start('q') - 0.2, 'b')   # social cut: the example line went to the save card
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[D['pv'], 'primary'], [' ' + D['mean'], 'ink']], [[D['aha'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


def side_cards(items, y, h, t_out):   # two side-by-side Kit cards (Stitch 'Same or different?' b0acc6b3…)
    gap = 40; w2 = (RW - gap) / 2; boxes = []
    for i, it in enumerate(items):
        c = Card(y, tone='tile', x0=RX0 + i * (w2 + gap), w=w2)
        chip(c, it['tag'], it['t'], tone=it.get('tone', 'chip'))
        sz = min(96, int(96 * c.inner / max(1, tw(it['word'], 96)))); c.text([[it['word'], it['col']]], sz, it['t'], gap=4)
        c.text([[it['ipa'], 'muted']], S['ipa'], it['t'], ipa=True, gap=16); IPA.append(dict(token=it['word'], ipa=it['ipa'], node=c.rows[-1]['id']))
        c.text([[it['mean'], 'ink']], S['sub'], it['t_mean'])
        boxes.append(c.place(it['t'], t_out, f'side{i}'))
    return boxes


def T_pair():
    D = EP['data']; series_chip(); t_out = start('q') - 0.2; A, B = D['a'], D['b']
    ia, ib = bank_ipa({A, B}, ROOT)[A], bank_ipa({A, B}, ROOT)[B]
    title([['Same', 'primary'], [' or ', 'ink'], ['different?', 'coral']], 96, RY0 + 120, None, at('r', A) - 0.2, hook=True)
    tg = D.get('tags', ['SOMETHING ↑', 'BY ITSELF ↑'])
    bx = side_cards([dict(tag=tg[0], word=A, ipa=ia, col='primary', t=at('r', A), mean=D['mean_a'], t_mean=start('m1')),
                     dict(tag=tg[1], word=B, ipa=ib, col='coral', t=at('w', B), mean=D['mean_b'], t_mean=start('m2'))], RY0, None, t_out)
    yb = max(b[3] for b in bx)
    top('vs', [RX0 + RW / 2 - 56, bx[0][1] + 150, RX0 + RW / 2 + 56, bx[0][1] + 262], at('w', B), k='pop', out=t_out, size=64, text='≠', pairs=[['#FFFFFF', '#E0482F', 64]])
    c = Card(yb + 30, tone='card'); c.text([['💡 ', 'accent'], [D['aha'], 'accent']], S['sub'], start('k')); c.place(start('k'), t_out, 'b')   # memory strip
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[A, 'primary'], [' = ' + D['mean_a'].rstrip('.').lower(), 'ink']], [[B, 'coral'], [' = ' + D['mean_b'].rstrip('.').lower(), 'ink']]], start('sh'), start('c') - 0.2)
    end_card()


def T_prep():
    """Stitch bd61498a… 'Which little word?': sentence card with a glowing slot, option bubbles, the slot fills with the right word on 'At!'."""
    D = EP['data']; series_chip(); t_out = start('q') - 0.2; right = D['right']; t_rev = at('r', 0)
    y = title([['Which ', 'ink'], ['little word', 'accent'], ['?', 'ink']], 84, RY0, None, t_out, hook=True, lines=1) + 24
    pre, post = D['slot'].split('___'); pre, post = pre.rstrip(), post.lstrip()
    sz = 84; sw = max(tw(o, sz) for o in D['opts']) + 70; tot = tw(pre, sz) + sw + tw(post, sz) + 2 * 22
    while tot > RW - 40 and sz > 48:   # a longer sentence steps down until it fits the card on one row
        sz -= 4; sw = max(tw(o, sz) for o in D['opts']) + 70; tot = tw(pre, sz) + sw + tw(post, sz) + 2 * 22
    assert tot <= RW, ('slot sentence too wide for one row', D['slot'], tot); x = RX0 + (RW - tot) / 2; h = round(sz * 1.25)
    top('card', [RX0, y, RX1, y + h + 120], start('s'), out=t_out, tone='card')
    yy = y + 60
    n1 = top('text', [x, yy, x + tw(pre, sz), yy + h], start('s'), out=t_out, runs=[[pre, 'ink']], size=sz, ipa=False); x += tw(pre, sz) + 22
    top('slot', [x, yy - 6, x + sw, yy + h + 6], start('s'), out=t_out, word=right, size=sz, st=[dict(t=round(t_rev, 4), s='filled')], pairs=[[TH['good'], TH['card'], sz]]); x += sw + 22
    top('text', [x, yy, x + tw(post, sz), yy + h], start('s'), out=t_out, runs=[[post, 'ink']], size=sz, ipa=False)
    CUES.append(dict(node=n1['id'], t=start('s'), tag=D['slot']))
    ob = y + h + 160; ow = max(300, FT.width('✓ CORRECT', 40, ls=0.06) + 6 + 2 * FT.MINPAD + 4); gap = 60; ox = RX0 + (RW - (2 * ow + gap)) / 2
    for i, o in enumerate(D['opts']):
        top('opt', [ox + i * (ow + gap), ob, ox + i * (ow + gap) + ow, ob + 170], at('s', o.capitalize() if i == 0 else o), out=t_out, text=o, size=88,
            label=f'OPTION {"AB"[i]}', st=[dict(t=round(t_rev - C.MIX / 2, 4), s='right' if o == right else 'dim')], pairs=[[TH['ink'], TH['pill'], 88], [TH['ink'], TH['good_bg'], 88]])
    c = Card(ob + 210, tone='card'); c.text([['💡 ', 'accent'], [D['why'], 'ink']], S['sub'], start('y')); c.place(start('y'), t_out, 'c')
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[D['full'], 'good']], [[D['aha'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


def T_pattern():
    """Stitch 535bbc79… 'Verb patterns': snap-together bricks VERB + PATTERN, then a ✓ row and a struck ✗ row."""
    D = EP['data']; series_chip(); t_out = start('q') - 0.2
    title([[D['verb'], 'ink'], [' + ', 'muted'], ['?', 'accent']], 112, RY0 + 140, None, start('w') - 0.2, hook=True)
    y = title([['THE FORMULA', 'primary']], 40, RY0, start('r'), t_out) + 10
    bw = 360; bh = 170; gap = 120; bx = RX0 + (RW - (2 * bw + gap)) / 2
    g1, g2 = D['good'].split()[:2]   # the verb form and the first word of its pattern, as spoken in the right line (decided · to)
    s1 = 84
    while s1 > 48 and FT.width(D['verb'], s1) > bw - 6 - 2 * FT.MINPAD: s1 -= 4   # long verbs (hesitate) step down to fit the brick (fit.py)
    s2 = 72
    while s2 > 48 and FT.width(D['pat'], s2) > bw - 6 - 2 * FT.MINPAD: s2 -= 4
    top('brick', [bx, y, bx + bw, y + bh], at('r', g1), out=t_out, label='BASE VERB', word=D['verb'], tone='dark', size=s1, pairs=[[TH['ink'], TH['tile'], s1]])
    top('plus', [bx + bw + gap / 2 - 40, y + bh / 2 - 40, bx + bw + gap / 2 + 40, y + bh / 2 + 40], at('r', g2), out=t_out)
    top('brick', [bx + bw + gap, y, bx + 2 * bw + gap, y + bh], at('r', g2), out=t_out, label='ALWAYS', word=D['pat'], tone='glow', size=s2, pairs=[['#062A27', '#5FD9CC', s2]])
    y += bh + 36; bad = D['bad'].split()[-1]
    for sz in (S['body'], 52, 48):   # the ✓ / ✗ / tip cards at the largest size that stays inside the region (longer sentences step down)
        snap = (len(NODES), len(CUES), len(SLOTS))
        try:
            c = Card(y, tone='good', badge='check', t_badge=at('r', 'better')); c.text([[D['right'], 'ink']], sz, at('r', 'better')); b1 = c.place(at('r', 'better'), t_out, 'a')
            c = Card(b1[3] + 24, tone='bad', badge='cross', t_badge=start('w')); tl = c.text([[D['wrong'], 'ink']], sz, start('w')); b2 = c.place(start('w'), t_out, 'b')
            tn = next(x for x in tl if bad.lower() in ''.join(r[0] for r in x['runs']).lower())   # the wrapped line that holds the struck word
            strike_on(tn, bad, at('w', bad) + 0.15)
            c = Card(b2[3] + 24, tone='card'); c.text([['💡 ', 'accent'], [D['why'], 'ink']], S['sub'] if sz == S['body'] else 44, start('y')); c.place(start('y'), t_out, 'c'); break
        except AssertionError:
            if sz == 48: raise
            del NODES[snap[0]:], CUES[snap[1]:], SLOTS[snap[2]:]
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[f"{D['verb']} + {D['pat']}", 'primary']], [[D['right'], 'good']], [[D['aha'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


def T_native():
    """Stitch aaeb1673… 'Say it naturally': scene chip, TEXTBOOK card (muted, strike) → NATIVE card (teal glow, sparkle badge)."""
    D = EP['data']; series_chip(); t_out = start('q') - 0.2
    title([['Textbook', 'muted'], [' or ', 'ink'], ['real', 'primary'], ['?', 'ink']], 104, RY0 + 140, None, start('w') - 0.2, hook=True)
    c = Card(RY0, tone='tile'); chip(c, f"TEXTBOOK · AT THE {D['scene'].upper()}", start('w')); tn = c.text([[D['wrong'], 'muted']], S['body'], start('w'))[0]; b1 = c.place(start('w'), t_out, 'a')
    strike_on(tn, D['strike'], at('w', D['strike'].split()[0]) + 0.1)
    c = Card(b1[3] + 30, tone='bubble_good'); chip(c, '✨ NATIVE', at('r', 'natives'), tone='good'); c.text(runs_hl(D['right'], D['hl'], 'onhl', 'ongood'), S['body'], at('r', 'natives'))
    c.text([[D['why'], 'ongood']], S['sub'], start('y')); c.place(at('r', 'natives'), t_out, 'b')
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[D['right'], 'primary']], [[D['aha'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


def T_guess():
    """Guess the Word: picture card (sharpens on the reveal), 3 clue chips on their lines, letter tiles (first letter on clue 3, all on the answer)."""
    D = EP['data']; series_chip(); w = D['word']; n = D['n']; t_rev = at('a', 0); t_out = start('sh') - 0.2
    title([['Guess the ', 'ink'], ['word', 'accent'], ['!', 'ink']], 104, RY0 + 140, None, start('c1') - 0.2, hook=True)
    P = 280; px = RX0 + (RW - P) / 2
    top('pic', [px, RY0, px + P, RY0 + P], start('c1'), out=t_out, src='pic.png', st=[dict(t=round(t_rev, 4), s='clear')])
    y = RY0 + P + 30
    for i, (lid, txt) in enumerate([('c1', D['clue']), ('c2', f'{n} letters'), ('c3', f'Starts with {w[0].upper()}')]):
        wd = max(tw(txt, 44) + 90, cw(f'{i + 1} · {txt}', 44)); top('chip', [RX0 + (RW - wd) / 2, y, RX0 + (RW + wd) / 2, y + 70], start(lid), out=t_out, text=f'{i + 1} · {txt}', tone='chip', size=44); y += 80
    y += 12; lw = min(90, (RW - 12 * (n - 1)) / n); x = RX0 + (RW - (lw * n + 12 * (n - 1))) / 2
    for i, ch in enumerate(w.upper()):
        st = [dict(t=round(at('c3', -1) if i == 0 else t_rev, 4), s='show')]
        top('letter', [x, y, x + lw, y + lw * 1.2], start('c2'), out=t_out, ch=ch, size=int(lw * 0.7), st=st, pairs=[['#382600', '#FFC524', int(lw * 0.7)]]); x += lw + 12
    top('ring', [RX1 - 110, RY0 + 10, RX1 - 10, RY0 + 110], end('q') + 0.05, out=end('q') + LINES['q']['pause'] + 0.3, ring=dict(t0=round(end('q') + 0.05, 3), t1=round(end('q') + LINES['q']['pause'] - 0.1, 3)), size=54)
    nip = top('ipapill', [RX0 + (RW - 420) / 2, y + lw * 1.2 + 22, RX0 + (RW + 420) / 2, y + lw * 1.2 + 106], t_rev, out=t_out, text=D['ipa'], size=52, pairs=[[TH['ink'], TH['card'], 52]])
    IPA.append(dict(token=w, ipa=D['ipa'], node=nip['id']))
    save_card([[[w, 'primary'], ['  ' + D['ipa'], 'muted']], [[D['clue'], 'ink']]], start('sh'), start('c') - 0.2)
    end_card()


def T_level():
    """Stitch ac026299… 'Level check': 3-step progress track + score pill, one question card per step, answer tiles light green on the answer."""
    D = EP['data']; series_chip(); t_end = start('s') - 0.2; Q = D['qs']
    title([['Level ', 'ink'], ['check!', 'accent']], 112, RY0 + 160, None, start('q1') - 0.2, hook=True)
    ys = RY0; ans_t = [at(f'a{i}', 0) for i in (1, 2, 3)]
    sw_ = max(190, FT.width('🏆 3 / 3', 44) + 6 + 2 * FT.MINPAD + 4)
    top('track', [RX0 + 20, ys, RX1 - sw_ - 30, ys + 70], start('q1'), out=t_end, steps=3, st=[dict(t=round(start(f'q{i}'), 4), s=f'cur{i}') for i in (1, 2, 3)] + [dict(t=round(ans_t[2] + 0.2, 4), s='done')])
    top('score', [RX1 - sw_, ys, RX1, ys + 70], start('q1'), out=t_end, size=44, val=[dict(t=round(t, 4), d=0.3, a=i, b=i + 1) for i, t in enumerate(ans_t)], tot=3, pairs=[[TH['accent'], TH['chip_bg'], 44]])
    for i, q in enumerate(Q, 1):
        t_in = start(f'q{i}'); t_o = (start(f'q{i + 1}') if i < 3 else start('s')) - 0.2
        c = Card(ys + 100, tone='card'); chip(c, f'QUESTION {i} / 3', t_in); c.text([[q['stem'], 'ink']], S['body'], t_in); b = c.place(t_in, t_o, f'q{i}')
        tw2 = (RW - 40) / 2; yy = b[3] + 30; r = q['answer']
        for j, o in enumerate(q['options']):
            top('opt', [RX0 + j * (tw2 + 40), yy, RX0 + j * (tw2 + 40) + tw2, yy + 190], t_in, out=t_o, text=o, size=min(80, int(80 * (tw2 - 50) / max(1, tw(o, 80)))), label='AB'[j],
                st=[dict(t=round(ans_t[i - 1] - C.MIX / 2, 4), s='right' if j == r else 'dim')], pairs=[[TH['ink'], TH['pill'], 72], [TH['ink'], TH['good_bg'], 72]])
        NODES.append(dict(id=nid('r'), type='ring', ring=dict(t0=round(end(f'q{i}') + 0.05, 3), t1=round(end(f'q{i}') + LINES[f'q{i}']['pause'] - 0.1, 3)), size=54,
                          box=[b[2] - 124, b[1] + 22, b[2] - 28, b[1] + 118], **{'in': cue(end(f'q{i}') + 0.05)}, out=dict(t=round(ans_t[i - 1] + 0.3, 3))))
    c = Card(ys + 100, tone='good'); chip(c, '🏆 3 / 3', start('s'), tone='good'); c.text([['Comment below!', 'ink']], S['hook'], at('s', 'comment'), align='c'); c.place(start('s'), start('c') - 0.2, 'a')   # same slot as the question cards (clear of their rings)
    end_card()


def bricks_row(items, y, bh, t_out, size=52):
    """formula rail: snap-together bricks joined by + (Stitch 3fcef434… 'Grammar in 60s'); items = [(label, word, tone, t_in)], width fits the word."""
    pg = 70
    while True:   # largest word size (>= 40 px) at which the rail fits the card width
        ws = [max(190, tw(wd, size) + 56) for _, wd, _, _ in items]; tot = sum(ws) + pg * (len(ws) - 1)
        if tot <= RW or size <= 40: break
        size -= 2
    assert tot <= RW, ('formula rail too wide', tot); x = RX0 + (RW - tot) / 2
    for i, ((lab, wd, tone, t_in), w_) in enumerate(zip(items, ws)):
        top('brick', [x, y, x + w_, y + bh], t_in, out=t_out, label=lab, word=wd, tone=tone, size=size,
            pairs=[['#062A27', '#5FD9CC', size]] if tone == 'glow' else [[TH['ink'], TH['tile'], size]]); x += w_
        if i < len(items) - 1: top('plus', [x + pg / 2 - 30, y + bh / 2 - 30, x + pg / 2 + 30, y + bh / 2 + 30], items[i + 1][3], out=t_out); x += pg


def T_grammar():
    """Stitch 3fcef4347cac… 'Grammar in 60s': ONE RULE kicker + title, formula bricks (last one glows), ✗ row with strike → ✓ row, then the quiz."""
    D = EP['data']; series_chip(); t_out = start('q') - 0.2
    if EP['hook'].get('style'):   # own hook first (until the rule line), then the grammar point's title takes the top row
        title(None, 96, RY0 + 140, None, start('r') - 0.2, hook=True)
        y = title([[D['en'], 'ink'], [' · ' + D['level'], 'primary']], 84, RY0, start('r'), t_out, lines=1, fit=True) + 26
    else: y = title([[D['en'], 'ink'], [' · ' + D['level'], 'primary']], 84, RY0, None, t_out, hook=True) + 26
    b = D['bricks']; labs = D.get('brick_labels', ['WHO', 'VERB', 'ADD']); cues = D.get('brick_cues', [0, 'verb', -1])
    bricks_row([(lab, wd, 'glow' if i == len(b) - 1 else 'dark', at('r', cu)) for i, (lab, wd, cu) in enumerate(zip(labs, b, cues))], y, 124, t_out)
    y += 124 + 28
    c = Card(y, tone='bad', badge='cross', t_badge=start('w')); tn = c.text([[D['wrong'], 'ink']], 52, start('w'))[0]; b1 = c.place(start('w'), t_out, 'a')
    strike_on(tn, D['strike'], at('w', D['strike'].split()[0]) + 0.1)
    c = Card(b1[3] + 20, tone='good', badge='check', t_badge=at('b', 'say')); c.text(runs_hl(D['right'], D['hl'], 'good'), 52, at('b', 'say')); c.place(at('b', 'say'), t_out, 'b')
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[' + '.join(b) if 'brick_labels' in D else f"{b[0]} + {b[1]}{b[2].split(' /')[0]}", 'primary']], [[D['right'], 'good']]], start('sh'), start('c') - 0.2)
    end_card()


def T_dictation():
    """Stitch 96c97a4a8606… 'What did she say?': headline, listening card (headphones + waveform that moves only while the line plays + 1/2 · 2/2 pill),
    sentence card with a glowing dashed gap that fills with the heard words on the answer."""
    D = EP['data']; series_chip(); t_out = start('sh') - 0.2; t_rev = at('a', 0)
    title([['What did she ', 'ink'], ['say?', 'primary']], 92, RY0 + 140, None, start('s1') - 0.2, hook=True)
    plays = [[start('s1'), end('s1')], [start('q'), end('q')]]; t_mean = start('a') - 0.2
    c = Card(RY0, tone='card'); y_ = c.y; chip(c, '🎧 LISTEN', start('s1')); c.y = y_   # chip + play counter share the top row, the waveform sits under them
    pw = max(200, cw('▶ 2 / 2', 40))
    for txt, t_a, t_b in [('▶ 1 / 2', start('s1'), start('q') - 0.5), ('▶ 2 / 2', start('q'), None)]:
        c.rows.append(dict(id=nid('h'), type='chip', text=txt, tone='chip', size=40, box=[PAD + c.inner - pw, y_, PAD + c.inner, y_ + 68],
                           **{'in': cue(t_a)}, **({'out': dict(t=round(t_b, 3))} if t_b else {})))
    c.y = y_ + 68 + GAP
    c.add(dict(type='wave', bars=28, plays=[[round(a, 3), round(b_, 3)] for a, b_ in plays], box=[PAD, 0, PAD + c.inner, 0], **{'in': cue(start('s1'))}), 84, gap=GAP)
    b1 = c.place(start('s1'), t_mean, 'a')
    pre, post = D['line'].split(D['gap']); sz = 60; y = b1[3] + 30
    c = Card(y, tone='card'); chip(c, f"FILL THE GAP · {len(D['gap'].split())} WORDS", start('g'))
    # one row per wrapped line; the gap is a slot node sized to the heard words (the answer drops in on its spoken word)
    gw = tw(D['gap'], sz) + 40; x = c.lp; yy = c.y; h = round(sz * 1.3)
    for tok in re.findall(r'\S+|___', pre.rstrip() + ' ___ ' + post.lstrip()):
        ww = gw if tok == '___' else tw(tok, sz)
        if x + ww > c.lp + c.inner: x = c.lp; yy += h + 14
        if tok == '___':
            c.rows.append(dict(id=nid('s'), type='slot', word=D['gap'], size=sz, box=[x, yy - 4, x + ww, yy + h + 4], **{'in': cue(start('g'))}, st=[dict(t=round(t_rev, 4), s='filled')],
                               pairs=[[TH['good'], TH['card'], sz]]))
        else:
            n = dict(id=nid('t'), type='text', runs=[[tok, 'ink']], size=sz, ipa=False, box=[x, yy, x + ww, yy + round(sz * 1.22)], **{'in': cue(start('g'))}); c.rows.append(n)
        x += ww + tw(' ', sz)
    CUES.append(dict(node=c.rows[1]['id'], t=start('g'), tag=D['line'])); c.y = yy + h + 14 + GAP
    b2 = c.place(start('g'), t_out, 'b'); ring(b2, end('q') + 0.05, end('q') + LINES['q']['pause'] - 0.1)
    c = Card(RY0, tone='good'); c.text([[D['word'], 'primary'], ['  ' + D['ipa'], 'muted']], S['body'], at('a', D['word'], 1 if D['word'] in D['gap'].lower() else 0), gap=8)   # meaning card takes the listening card's place
    IPA.append(dict(token=D['word'], ipa=D['ipa'], node=c.rows[-1]['id'])); c.text([['= ' + D['mean'], 'ink']], S['sub'], at('a', 'means')); c.place(start('a'), t_out, 'a')
    save_card([[[D['line'], 'ink']], [[D['word'], 'primary'], [' = ' + D['mean'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


def T_toeic():
    """TOEIC Word (Kit question card + 2×2 answer tiles from Stitch ac026299… Level Check): Part 5 tag, the clue phrase lights gold on 'clue', B turns green."""
    D = EP['data']; series_chip(); t_out = start('sh') - 0.2; t_ans = at('a', 0)
    title([['TOEIC', 'accent'], [' in 10 seconds', 'ink']], 84, RY0 + 160, None, start('s') - 0.2, hook=True)
    c = Card(RY0, tone='card'); chip(c, f"PART 5 · Q{D['n']}", start('s'))
    pre, post = D['stem'].split('___'); c.text(runs_hl(pre.rstrip() + ' _____ ' + post.lstrip(), D['cue'], 'accent'), 54, start('s'))
    c.text([['🔍 CLUE: ', 'muted'], [D['cue'], 'accent']], S['sub'], start('k')); b = c.place(start('s'), t_out, 'a')
    tw2 = (RW - 30) / 2; yy = b[3] + 30
    for j, o in enumerate(D['options']):
        x = RX0 + (j % 2) * (tw2 + 30); y_ = yy + (j // 2) * 156; sz = min(60, int(60 * (tw2 - 50) / max(1, tw(o, 60))))
        top('opt', [x, y_, x + tw2, y_ + 140], start('q'), out=t_out, text=o, size=sz, label='ABCD'[j],
            st=[dict(t=round(t_ans - C.MIX / 2, 4), s='right' if j == D['answer'] else 'dim')], pairs=[[TH['ink'], TH['pill'], sz], [TH['ink'], TH['good_bg'], sz]])
    NODES.append(dict(id=nid('r'), type='ring', ring=dict(t0=round(end('q') + 0.05, 3), t1=round(end('q') + LINES['q']['pause'] - 0.1, 3)), size=54,
                      box=[b[2] - 124, b[1] + 22, b[2] - 28, b[1] + 118], **{'in': cue(end('q') + 0.05)}, out=dict(t=round(t_ans + 0.3, 3))))
    save_card([[[D['cue'], 'accent'], [' → ', 'muted'], [D['right'], 'good']], [[D['stem'].replace('___', D['right']), 'ink']]], start('sh'), start('c') - 0.2)
    end_card()


def T_review():
    """Remember This? (the app's flashcard): card front word + IPA, 3-2-1 think ring, flips to the meaning on 'means', example below, the app's 4 grade buttons."""
    D = EP['data']; series_chip(); t_out = start('c') - 0.2; t_flip = at('b', 'means') - 0.1
    title([['Remember ', 'ink'], ['this', 'primary'], ['?', 'ink']], 104, RY0 + 120, None, start('f') - 0.2, hook=True)
    fh = 400; n = top('flip', [RX0 + 40, RY0, RX1 - 40, RY0 + fh], at('f', D['word']), out=t_out, word=D['word'], ipa=D['ipa'], mean=D['mean'], size=104, msize=60,
                      st=[dict(t=round(t_flip, 4), s='back')], pairs=[[TH['ink'], TH['card'], 60], [TH['primary'], TH['card'], 104], [TH['muted'], TH['card'], 48]])
    CUES.append(dict(node=n['id'], t=at('f', D['word']), tag=D['word'])); IPA.append(dict(token=D['word'], ipa=D['ipa'], node=n['id']))
    NODES.append(dict(id=nid('r'), type='ring', ring=dict(t0=round(end('q') + 0.05, 3), t1=round(end('q') + LINES['q']['pause'] - 0.1, 3)), size=54,
                      box=[RX1 - 40 - 124, RY0 + 22, RX1 - 40 - 28, RY0 + 118], **{'in': cue(end('q') + 0.05)}, out=dict(t=round(t_flip, 3))))
    c = Card(RY0 + fh + 30, tone='card'); c.text(runs_hl(D['ex'], D['word'], 'primary'), S['sub'], start('x')); bx = c.place(start('x'), t_out, 'b')
    gw = (RW - 3 * 20) / 4; y = bx[3] + 30; tone = dict(Again='bad', Hard='amber', Good='good', Easy='easy')
    for i, g in enumerate(D['grades']):
        x = RX0 + i * (gw + 20); t_g = at('g', g) if g in ('Good', 'Again') else start('g')
        top('grade', [x, y, x + gw, y + 110], start('g'), out=t_out, text=g, tone=tone[g], size=48, st=[dict(t=round(t_g, 4), s='lit')] if g in ('Good', 'Again') else [],
            pairs=[[TH['ink'], TH['pill'], 48]])
    end_card()


def T_call():
    """Ask Ama → Call (the app's speaking call): call header (phone + call title + live dot), the caller's bubble with the phrase in gold,
    meaning card, the reply chip the app offers, then the quiz."""
    D = EP['data']; series_chip(); t_out = start('q') - 0.2
    title([[f"“{D['phrase'].capitalize()}”", 'accent'], ['?', 'ink']], 112, RY0 + 140, None, start('m') - 0.2, hook=True)
    for sz in (S['body'], 52, 48):   # the three cards at the largest text size that keeps them inside the region (longer call lines step down)
        snap = (len(NODES), len(CUES), len(SLOTS))
        try:
            c = Card(RY0, tone='tile'); chip(c, f"📞 {D['em']} {D['title'].upper()}", start('m'))
            c.text(runs_hl(D['line'], D['phrase'], 'accent'), sz, at('m', 'says')); b1 = c.place(start('m'), t_out, 'a')
            c = Card(b1[3] + 28, tone='good', badge='check', t_badge=start('y')); c.text([[D['phrase'], 'primary'], [' = ' + D['mean'], 'ink']], sz, start('y')); b2 = c.place(start('y'), t_out, 'b')
            c = Card(b2[3] + 28, tone='bubble_good', x0=RX0 + 120, w=RW - 120); c.tail = 'r'; chip(c, 'YOU SAY', at('o', 'say'), tone='good')
            c.text([[D['reply'], 'ongood']], sz, at('o', 'say')); c.place(at('o', 'say'), t_out, 'c'); break
        except AssertionError:
            if sz == 48: raise
            del NODES[snap[0]:], CUES[snap[1]:], SLOTS[snap[2]:]
    q = D['quiz']; quiz_card(None, q['options'], q['answer'], start('q'), at('a', 0), start('c') - 0.2)
    end_card()


dict(usuk=T_usuk, verbs=T_verbs, stress=T_stress, mistake=T_mistake, phrasal=T_phrasal, pair=T_pair, prep=T_prep, pattern=T_pattern, native=T_native, guess=T_guess, level=T_level,
     grammar=T_grammar, dictation=T_dictation, toeic=T_toeic, review=T_review, call=T_call)[EP['template']]()

# ---------------- region offset: card-local -> canvas; satellites (check, confetti, strike, badges) resolve their boxes ----------------
BY = {n['id']: n for n in NODES}
for n in NODES:
    if n.get('parent'):
        p = BY[n['parent']]['box']; n['abs'] = [p[0] + n['box'][0], p[1] + n['box'][1], p[0] + n['box'][2], p[1] + n['box'][3]]
    elif n.get('box'): n['abs'] = list(n['box'])
for n in NODES:
    if n['type'] == 'strike' and n.get('_rel'):
        r = BY[n['_rel']]; n['parent'] = r.get('parent'); p = BY[n['parent']]['box']; n['abs'] = [p[0] + n['box'][0], p[1] + n['box'][1], p[0] + n['box'][2], p[1] + n['box'][3]]
    if n['type'] in ('check', 'confetti') and n.get('_pill'):
        cd = BY[BY[n['_pill']]['parent']]
        if cd.get('out'): n['out'] = dict(cd['out'])   # the ✓ / confetti leave with their quiz card
        pb = BY[n['_pill']]['abs']; d = 64; n['abs'] = [pb[2] - d - 26, (pb[1] + pb[3] - 8) / 2 - d / 2, pb[2] - 26, (pb[1] + pb[3] - 8) / 2 + d / 2] if n['type'] == 'check' else [pb[0], pb[1] - 120, pb[2], pb[3] + 40]
for n in NODES:
    n['box'] = [round(v, 1) for v in n.pop('abs')]
    for k in [k for k in n if k.startswith('_')]: n.pop(k)
NODES.sort(key=lambda n: (0 if n['type'] == 'card' else 1))   # parents first; Remotion draws flat absolute boxes in this order
_fit = [dict(id=n['id'], type=n['type'], what=w_, text=s_, need=a_, room=b_) for n in NODES for (w_, s_, a_, b_) in FT.need(n)]
assert not _fit, ('chip / pill text does not fit on ONE line inside its pill (fit.py)', _fit[:4])   # qc.py layout gate re-checks

# ---------------- captions (short only; embed ships them as VTT): one row, karaoke, never over the face ----------------
CAPS = []; VTT = []
for l in EP['lines']:
    L_ = LINES[l['id']]; ws = L_['words']; page = []; pw = 0
    def flush(pg, nxt):
        if pg: CAPS.append(dict(words=pg, t0=round(pg[0]['s'] - 0.06, 3), t1=round(min(nxt, pg[-1]['e'] + 0.45), 3)))
    for i, w in enumerate(ws):
        ww = tw(w['w'] + ' ', S['cap'])
        if page and (pw + ww > (FMT['cap'][2] - FMT['cap'][0] - 80 if FMT['cap'] else 1e9) or (page[-1]['w'][-1] in '.!?' and not re.fullmatch(r'(?:[A-Z]\.)+', page[-1]['w']))): flush(page, w['s'] - 0.02); page, pw = [], 0   # new page at each sentence end
        page.append(w); pw += ww
    flush(page, (ws[-1]['e'] + l['pause']))
    VTT.append(dict(t0=L_['t0'], t1=round(L_['t1'] + 0.2, 3), text=l['text']))
if not FMT['cap']: CAPS = []

# ---------------- host: speech-gated talk / listen segments (frames), one fixed transform ----------------
FPS = o.fps; NF = int(round(TOTAL * FPS)); LEN = {k: int(HG['clips'][k]['frames'] * FPS / HG['clips'][k]['fps'] - 0.25 * FPS) for k in ('talk', 'listen')}   # loop 0.25 s before the clip end (alpha webm tail can decode empty)
spk = np.zeros(NF, bool)
for a, b in SPEECH: spk[max(0, int((a - 0.05) * FPS)):min(NF, int(math.ceil((b + 0.05) * FPS)))] = True
# close short silences (< 0.3 s) so the mouth does not flicker shut between words of one sentence
i = 0
while i < NF:
    if not spk[i]:
        j = i
        while j < NF and not spk[j]: j += 1
        if 0 < i and j < NF and (j - i) / FPS < 0.3: spk[i:j] = True
        i = j
    else: i += 1
SEG = []; pos = dict(talk=0, listen=0); f = 0
while f < NF:
    k = 'talk' if spk[f] else 'listen'; g = f
    while g < NF and spk[g] == spk[f]: g += 1
    n = g - f
    while n > 0:
        take = min(n, LEN[k] - pos[k]); SEG.append(dict(clip=k, from_=f, dur=take, start=pos[k])); pos[k] = (pos[k] + take) % LEN[k]; f += take; n -= take
for s_ in SEG: s_['from'] = s_.pop('from_')
k = FMT['host_h'] / HG['h']; hw = HG['w'] * k; hb = HG['head']; BB = FMT.get('bubble')
assert k <= 1.0, ('teacher would be enlarged > 1.0x', k)
if BB:   # round call window: head + shoulders centred, head ~55 % of the window height (pure framing of the raw clip, no processing)
    D = BB[2] - BB[0]; k = min(1.0, 0.55 * D / (hb[3] - hb[1])); hw = HG['w'] * k; cx, cy = (hb[0] + hb[2]) / 2 * k, (hb[1] + hb[3]) / 2 * k
    x0, y0 = (BB[0] + BB[2]) / 2 - cx, BB[1] + 0.44 * D - cy; box = [round(x0, 1), round(y0, 1), round(x0 + hw, 1), round(y0 + HG['h'] * k, 1)]
elif FMT.get('head_y'):   # v2 short layouts: the head top sits right under the caption row; the clip's bust cut is below the frame bottom
    y0 = FMT['head_y'] - hb[1] * k; box = [round(FMT['host_cx'] - hw / 2, 1), round(y0, 1), round(FMT['host_cx'] + hw / 2, 1), round(y0 + HG['h'] * k, 1)]
    assert y0 + HG['bbox'][3] * k >= H, ('the bust cut of the clip would show above the frame bottom', round(y0 + HG['bbox'][3] * k), H)
    assert FMT['cap'][3] < FMT['head_y'] <= FMT['cap'][3] + 40, ('caption must sit directly above the head', FMT['cap'], FMT['head_y'])
else: box = [round(FMT['host_cx'] - hw / 2, 1), H - FMT['host_h'], round(FMT['host_cx'] + hw / 2, 1), H]
HOST = dict(who=EP['teacher'], talk='host_talk.webm', listen='host_listen.webm', box=box, segs=SEG, xfade=4, len=LEN, bubble=BB)
# ---- camera (social shorts): push-in on the hook, then a hard cut to a new framing at every sentence start, slow push inside each shot.
# Scale is anchored at the top of the teacher's head, so the head never rises into the captions; source pixels never exceed 1.0x.
SHOTS = []
if SOCIAL and not BB:
    ox, oy = box[0] + (hb[0] + hb[2]) / 2 * k, box[1] + hb[1] * k; side = LAYOUT == 'side'
    FR = [(0, 1.0, 0), (1, 1.07, 60), (2, 1.07, -60)]; cap_s = min(1.12, 1.0 / k)
    ids = [l['id'] for l in EP['lines']]
    for i, lid in enumerate(ids):
        f0 = 0 if i == 0 else int(round(LINES[lid]['t0'] * o.fps)) - 2; f1 = int(round((LINES[ids[i + 1]]['t0'] if i + 1 < len(ids) else TOTAL) * o.fps)) - 2
        if i == 0: s0, s1, dx = 1.0, min(cap_s, 1.08), 0          # the push-in on the hook
        else: _, s0, dx = FR[i % 3]; s0 = min(cap_s, s0); s1 = min(cap_s, s0 + 0.03); dx = 0 if side else dx
        SHOTS.append(dict(f0=max(0, f0), f1=f1, s0=round(s0, 4), s1=round(s1, 4), dx=dx))
    HOST['cam'] = dict(ox=round(ox, 1), oy=round(oy, 1), shots=SHOTS)
if BB: HEAD = list(BB); BODY = list(BB); BODYC = list(BB)
else:
    HEAD = [box[0] + hb[0] * k, box[1] + hb[1] * k, box[0] + hb[2] * k, box[1] + hb[3] * k]
    BODY = [box[0] + HG['bbox'][0] * k, box[1] + HG['bbox'][1] * k, box[0] + HG['bbox'][2] * k, H]; BODYC = list(BODY)
    if SHOTS:   # the head (and body) box in every framing (QC keeps cards / captions off the head, scene props off head + body)
        cx_, cy_ = HOST['cam']['ox'], HOST['cam']['oy']
        def _cam(B_):
            hs = [[cx_ + (x - cx_) * sh_[q] + sh_['dx'], cy_ + (y - cy_) * sh_[q]] for sh_ in SHOTS for q in ('s0', 's1') for x, y in ((B_[0], B_[1]), (B_[2], B_[3]))]
            return [min(p_[0] for p_ in hs + [B_[:2]]), min(p_[1] for p_ in hs + [B_[:2]]), max(p_[0] for p_ in hs + [B_[2:]]), max(p_[1] for p_ in hs + [B_[2:]])]
        HEAD = _cam(HEAD); BODYC = _cam(BODY)

# ---------------- matching 2D scene (scenes.json via scene.py): backdrop behind the teacher + foreground counter above her (grounding) ----------------
import scene as SC   # noqa: E402  (scripts/video/teach2d/scene.py, same items qc.py re-checks)
SCENE = SC.resolve(EP.get('scene'), o.format, LAYOUT, W, H, FMT['host_cx'], hw, FMT['host_h'], NODES, FMT['region'], ct=FMT.get('ct'), clear=[HEAD, BODYC])
if SCENE:
    SCENE['tint'] = TINT
    hit = SC.on_teacher(SCENE, HEAD, BODYC)   # no front-layer item (counter props) over the teacher's head or her body above the counter
    assert not hit, ('scene prop drawn over the teacher', hit[:4], HEAD, BODYC)
    fg = [SCENE['counter']] + [SC.bbox(x) for x in SCENE['items'] if x.get('l') == 'front' and SC.bbox(x)[1] < SCENE['counter'][1]] if SCENE['counter'] else []
    for r_ in fg:   # the counter and the props standing on it never cover a caption, card, text, QR or CTA (lift the node or shrink the band)
        assert not (FMT['cap'] and r_[0] < FMT['cap'][2] and FMT['cap'][0] < r_[2] and r_[1] < FMT['cap'][3] and FMT['cap'][1] < r_[3]), ('scene counter over the captions', r_, FMT['cap'])
        hit = [n['id'] for n in NODES if n['type'] != 'confetti' and r_[0] < n['box'][2] and n['box'][0] < r_[2] and r_[1] < n['box'][3] and n['box'][1] < r_[3]]
        assert not hit, ('scene counter over nodes', r_, hit)

# ---------------- audio: voice track (-16 LUFS) + soft synth ticks (countdown 3-2-1, answer chime) after loudnorm ----------------
os.makedirs(o.public, exist_ok=True); SR = 48000
vo = np.zeros(int(TOTAL * SR) + SR, np.float32)
for l in EP['lines']:
    L_ = LINES[l['id']]
    with wave.open(L_['wav']) as w:
        sr = w.getframerate(); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        if w.getnchannels() == 2: a = a.reshape(-1, 2).mean(1)
    a = np.interp(np.arange(int(len(a) * SR / sr)) / SR, np.arange(len(a)) / sr, a).astype(np.float32); i0 = int(L_['t0'] * SR); vo[i0:i0 + len(a)] += a
def wav_out(fn, x):
    x = np.clip(x, -1, 1); st = np.repeat((x * 32767).astype(np.int16)[:, None], 2, 1)
    with wave.open(fn, 'wb') as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(st.tobytes())
raw = f'{o.public}/_voice_raw.wav'; wav_out(raw, vo[:int(TOTAL * SR)])
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11,alimiter=limit=0.89:level=0', '-ar', str(SR), '-ac', '2', f'{o.public}/_voice_n.wav'], check=True)
with wave.open(f'{o.public}/_voice_n.wav') as w: mix = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32).reshape(-1, 2)[:, 0] / 32768
mix = np.pad(mix, (0, max(0, int(TOTAL * SR) - len(mix))))[:int(TOTAL * SR)]
SFX = []
def tone(t0, f0, dur, db, f1=None):
    n = int(dur * SR); tt = np.arange(n) / SR; fr = f0 if f1 is None else f0 + (f1 - f0) * tt / dur
    x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-tt * 9) * 10 ** (db / 20); i0 = int(t0 * SR); mix[i0:i0 + n] += x[:len(mix) - i0]; SFX.append(dict(t=round(t0, 3), f=f0, db=db))
for n in NODES:
    if n['type'] == 'ring':
        for d in range(3): tone(n['ring']['t0'] + d * (n['ring']['t1'] - n['ring']['t0']) / 3, 880, 0.09, -30)
    if n['type'] == 'check' and n['in']['k'] == 'pop' and not SOCIAL: tone(n['in']['t'] + C.HALF['pop'], 660, 0.22, -27, 990)
if SOCIAL:   # owner 29/10: whoosh + light music for social shorts (CC0 Lexkite synth bank brand/library/sfx + scripts/video/synth.mjs), mixed AFTER the voice loudnorm
    MAN = {x['id']: x for x in json.load(open(f'{ROOT}/brand/library/sfx/manifest.json'))['items']}
    def sample(name):
        with wave.open(f"{ROOT}/brand/library/{MAN[name]['file']}") as w: sr_ = w.getframerate(); a_ = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
        return np.interp(np.arange(int(len(a_) * SR / sr_)) / SR, np.arange(len(a_)) / sr_, a_).astype(np.float32)
    def put(name, t0, extra_db=0.0):
        x = sample(name) * 10 ** ((MAN[name]['gainDb'] + extra_db) / 20); i0 = max(0, int(t0 * SR)); m_ = min(len(x), len(mix) - i0)
        if m_ > 0: mix[i0:i0 + m_] += x[:m_]; SFX.append(dict(t=round(t0, 3), sfx=name, db=MAN[name]['gainDb'] + extra_db))
    put('bass-drop', 0.0, -4)                                     # the hook slam
    seen = []
    for n in sorted(NODES, key=lambda n: n['in']['t']):
        t_ = n['in']['t']
        if n.get('parent') or t_ < 0.3 or n['type'] not in ('card', 'split', 'candy', 'pic', 'brick', 'flip') or any(abs(t_ - x) < 0.35 for x in seen): continue
        put('whoosh', max(0, t_ - 0.12), -6); seen.append(t_)    # one soft whoosh per entering card group
        if n['type'] in ('candy', 'brick'): put('pop', t_ + 0.1, -2)
    for n in NODES:
        if n['type'] in ('check',) and n['in']['k'] == 'pop': put('riser', max(0, n['in']['t'] - 1.45), -8); put('ding', n['in']['t'], -4)
        if n['type'] in ('stamp', 'vs'): put('pop', n['in']['t'], 0)
    # music bed: preset by series, -40 dBFS RMS (rule: background bed ~ -40 dB, the voice dominates), ducked 12 dB under the voice (smooth 0.25 s), fades in/out
    PRE = dict(usuk='pop-bright', verbs='upbeat-claps', stress='chill-keys', mistake='quiz-pulse', phrasal='lofi-warm', pair='chill-keys', prep='pop-bright',
               pattern='upbeat-claps', native='lofi-warm', guess='quiz-pulse', level='quiz-pulse',
               grammar='upbeat-claps', dictation='chill-keys', toeic='quiz-pulse', review='lofi-warm', call='pop-bright')
    mf = f'{o.public}/_music.wav'; subprocess.run(['node', f'{ROOT}/scripts/video/synth.mjs', '--music', PRE.get(EP['template'], 'lofi-warm'), str(TOTAL + 0.5), mf], check=True, capture_output=True)
    with wave.open(mf) as w: sr_ = w.getframerate(); ch_ = w.getnchannels(); mu = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if ch_ == 2: mu = mu.reshape(-1, 2).mean(1)
    mu = np.interp(np.arange(len(mix)) / SR, np.arange(len(mu)) / sr_, mu).astype(np.float32); os.remove(mf)
    BED_DB = -40; mu *= 10 ** (BED_DB / 20) / max(1e-6, float(np.sqrt(np.mean(mu ** 2))))
    duck = np.zeros(len(mix), np.float32)
    for a_, b_ in SPEECH: duck[max(0, int((a_ - 0.1) * SR)):int((b_ + 0.15) * SR)] = 1
    kk = int(0.25 * SR); duck = np.convolve(duck, np.ones(kk) / kk, 'same'); gain = 10 ** (-12 * duck / 20)
    env = np.minimum(1, np.minimum(np.arange(len(mix)) / (0.6 * SR), (len(mix) - np.arange(len(mix))) / (0.8 * SR)))
    bed = mu * env; mix += bed * gain
    SFX.append(dict(music=PRE.get(EP['template']), rms_db=BED_DB, rms_meas=round(20 * math.log10(max(1e-9, float(np.sqrt(np.mean(bed ** 2))))), 2), duck_db=-12))   # qc.py bed gate
    mix = np.tanh(mix * 1.1) / 1.1   # soft limiter
wav_out(f'{o.public}/voice.wav', mix); os.remove(raw); os.remove(f'{o.public}/_voice_n.wav')

# ---------------- assets ----------------
import qrcode   # noqa: E402
qr = qrcode.QRCode(border=2, box_size=12, error_correction=qrcode.constants.ERROR_CORRECT_M); qr.add_data(EP['cta']['link']); qr.make(fit=True)
qr.make_image(fill_color=TH['qr_ink'], back_color='white').save(f'{o.public}/qr.png')
shutil.copy(f'{ROOT}/brand/social/logo/lexkite-app-icon.png', f'{o.public}/icon.png')
os.makedirs(f'{o.public}/fonts', exist_ok=True); shutil.copy(FJ, f'{o.public}/fonts/jakarta.ttf'); shutil.copy(FN, f'{o.public}/fonts/noto.ttf')
for k_ in ('talk', 'listen'): shutil.copy(f'{o.host}/{k_}.webm', f'{o.public}/host_{k_}.webm')
if EP['template'] == 'guess':   # picture from content/lexicon/img.json (licensed bank image, the same one the app shows) -> pic.png
    it = json.load(open(f'{ROOT}/content/lexicon/img.json'))['items'][EP['data']['img']]; raw_ = f'{o.public}/_pic.webp'
    subprocess.run(['curl', '-fsSL', '--retry', '3', '-o', raw_, it['url']], check=True)
    from PIL import Image as _I; _I.open(raw_).convert('RGBA').save(f'{o.public}/pic.png'); os.remove(raw_)

# ---------------- props + QC timeline ----------------
props = dict(w=W, h=H, fps=FPS, durationInFrames=NF, theme=THEME, tint=TINT, layout=LAYOUT, format=o.format, total=TOTAL, nodes=NODES, caps=CAPS, capBox=FMT['cap'], host=HOST, audio='voice.wav', scene=SCENE)
json.dump(props, open(o.out, 'w'))
json.dump(dict(ep=EP['id'], template=EP['template'], theme=THEME, layout=LAYOUT, format=o.format, fps=FPS, total=TOTAL, safe=FMT['safe'], region=FMT['region'], cap_box=FMT['cap'],
               lines={k: dict(t0=v['t0'], t1=v['t1'], text=v['text'], words=v['words'], interp=v['interp'], whisper=v['whisper'], pause=v['pause']) for k, v in LINES.items()},
               speech=SPEECH, segs=SEG, host_xfade=HOST['xfade'], host_len=LEN, head=[round(v, 1) for v in HEAD], body=[round(v, 1) for v in BODY], cues=CUES, ipa=IPA, slots=SLOTS, sfx=SFX, vtt=VTT,
               voice=EP['voice'], teacher=EP['teacher'], hook=EP['hook'], body_clear=[round(v, 1) for v in BODYC], hook_by=EP.get('hook_by', 2.2), cta=EP['cta'], nodes=NODES, caps=CAPS, scene=SCENE),
          open(o.out + '.timeline.json', 'w'), indent=0)
if EMBED:   # captions + chapters as WebVTT (translatable, one cue per line)
    ts = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}'
    open(o.out.replace('.json', '.en.vtt'), 'w').write('WEBVTT\n\n' + '\n'.join(f"{i + 1}\n{ts(v['t0'])} --> {ts(v['t1'])}\n{v['text']}\n" for i, v in enumerate(VTT)))
print(f"{EP['id']} {o.format} {THEME}: {TOTAL:.1f}s, {len(NODES)} nodes, {len(CAPS)} caption pages, {len(SEG)} host segments")
