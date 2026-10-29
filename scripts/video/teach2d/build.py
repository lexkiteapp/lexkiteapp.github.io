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

ap = argparse.ArgumentParser()
for a in ('ep', 'vo', 'host', 'public', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--format', default='short', choices=['short', 'wide'])
ap.add_argument('--fps', type=int, default=30)
ap.add_argument('--theme', default='', help='override the episode theme (dark | dusk | light)')
ap.add_argument('--fonts', default=f'{ROOT}/brand/social/src/fonts')
ap.add_argument('--layout', default='', help='short layout: corner (teacher bottom-centre) | side (teacher left, larger) | bubble (big card, teacher in a round call window)')
o = ap.parse_args()
EP = json.load(open(o.ep)); THEME = o.theme or EP['theme']; _TJ = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json')); TH = _TJ[THEME]
TINT = _TJ['tints'][EP['template']]   # series colour: the big canvas blob carries it, so each series is recognisable from frame 0
HG = json.load(open(f'{o.host}/geom.json')); EMBED = o.format == 'wide'
LAYOUTS = dict(   # same cards / timing; only where the card region, captions and teacher sit (owner 29/10: varied layouts)
    corner=dict(region=[60, 324, 960, 1150], cap=[60, 1168, 960, 1282], host_h=640, host_cx=540),
    side=dict(region=[60, 324, 960, 1150], cap=[480, 1196, 960, 1310], host_h=760, host_cx=260),
    bubble=dict(region=[60, 324, 960, 1396], cap=[60, 1410, 610, 1496], host_h=744, host_cx=None, bubble=[632, 1440, 1032, 1840]))
FMT = dict(short=dict(W=1080, H=1920, chip=[60, 236], safe=[48, 232, 960, 1497], **LAYOUTS[o.layout or 'corner']),
           wide=dict(W=1920, H=1080, region=[96, 150, 1056, 990], chip=[96, 70], safe=[60, 48, 1860, 1032], cap=None, host_h=960, host_cx=1460))[o.format]
LAYOUT = (o.layout or 'corner') if o.format == 'short' else 'wide'
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
        width = width or s.inner; toks = [(w, c) for txt, c in runs for w in re.findall(r'\s*\S+\s*', txt)]
        lines, cur, cw = [], [], 0
        for w, c in toks:
            ww = tw(w.rstrip(), sz, ipa)
            if cur and cw + tw(w, sz, ipa) - (tw(w, sz, ipa) - ww) > width: lines.append(cur); cur, cw = [], 0
            cur.append([w, c]); cw += tw(w, sz, ipa)
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
        c = dict(id=s.id, type='card', tone=s.tone, box=s.box, **{'in': cue(t_in, k)}, **({'out': dict(t=round(t_out, 4))} if t_out else {}))
        NODES.append(c)
        for n in s.rows:
            n['parent'] = s.id; n.setdefault('in', c['in']); n['in'] = dict(n['in'], t=max(n['in']['t'], c['in']['t']))
            NODES.append(n)
        SLOTS.append(dict(slot=slot, card=s.id, t_in=c['in']['t'], t_out=t_out))
        return s.box


def chip(c, text, t_in, tone='chip'):
    w = tw(text, S['chip']) * 1.06 + 56
    return c.add(dict(type='chip', text=text, tone=tone, size=S['chip'], box=[PAD, 0, PAD + w, 0], **{'in': cue(t_in)}), S['chip'] + 28)


def flag(cc, x, sz, t_in): return dict(type='flag', cc=cc, box=[x, 0, x + sz * 1.5, 0], **{'in': cue(t_in)})


def pills(c, opts, t_in, t_ans, right, ws=None):
    """A/B answer cards (Kit answer card: letter chip, 2 px border, 5 px ledge); the right one turns green + check on its spoken word."""
    for i, lab in enumerate(opts):
        n = dict(type='pill', idx='AB'[i], label=lab, size=S['pill'], box=[PAD, 0, PAD + c.inner, 0],
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
    txt = f"{EP['series'].upper()} · PART {EP['part']}"; x0, y0 = FMT['chip']; w = tw(txt, S['chip']) * 1.06 + 56
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


def T_usuk():
    D = EP['data']; series_chip()
    hook_card([['US', 'primary'], [' or ', 'ink'], ['UK', 'coral'], ['?', 'ink']], at('us', D['us']) - 0.2,
              extra=lambda c: c.add(dict(type='flags', box=[PAD + (c.inner - 300) / 2, 0, PAD + (c.inner + 300) / 2, 0]), 120))
    # twin tiles (Stitch screen 4cb4e39f…: two candy tiles, flag tag chip, huge word, IPA, accent bar, '=' badge)
    GAPT = 104; tw2 = (RW - GAPT) // 2; y = RY0; t_out = start('q') - 0.2   # gap wide enough for the '=' badge (never on a word)
    for i, (cc, wd, ipa, col, lid) in enumerate([('us', D['us'], D['ipa_us'], 'primary', 'us'), ('uk', D['uk'], D['ipa_uk'], 'coral', 'uk')]):
        c = Card(y, tone='tile', x0=RX0 + i * (tw2 + GAPT), w=tw2); t_w = at(lid, wd)
        c.add(dict(type='tag', cc=cc, text=cc.upper(), size=S['chip'], box=[PAD, 0, PAD + 150, 0], **{'in': cue(t_w)}), S['chip'] + 28)
        sz = min(S['big'], int(S['big'] * (c.inner) / max(1, tw(wd, S['big'])))); c.text([[wd, 'ink']], sz, t_w, align='c', gap=8)
        c.text([[ipa, 'muted']], S['ipa'], t_w, align='c', ipa=True, gap=18); IPA.append(dict(token=wd, ipa=ipa, node=c.rows[-1]['id']))
        c.add(dict(type='bar', tone=col, box=[PAD + (c.inner - 90) / 2, 0, PAD + (c.inner + 90) / 2, 0], **{'in': cue(t_w)}), 8)
        bx = c.place(t_w, t_out, 'tiles' + cc)
    NODES.append(dict(id='eq', type='eq', size=56, box=[RX0 + tw2 + GAPT / 2 - 44, y + 150, RX0 + tw2 + GAPT / 2 + 44, y + 238], **{'in': cue(at('uk', 'same'), 'pop')}, out=dict(t=round(t_out, 3))))
    c = Card(bx[3] + 28); c.text([[D['same'], 'accent']], S['body'], at('uk', 'same'), align='c', gap=GAP)
    c.text(runs_hl(LINES['x']['text'], D['us']), S['body'], start('x'), align='c'); c.place(at('uk', 'same'), t_out, 'b')
    quiz_card([["You're in London.", 'ink']], [D['us'], D['uk']], 1, start('q'), at('a', D['uk']), start('sh') - 0.2)
    save_card([[['US ', 'muted'], [D['us'], 'primary']], [['UK ', 'muted'], [D['uk'], 'coral']]], start('sh'), start('c') - 0.2)
    end_card()


def T_verbs():
    D = EP['data']; series_chip()
    hook_card([[D['base'], 'ink'], [' → ', 'muted'], ['?', 'accent'], [' → ', 'muted'], ['?', 'accent']], start('b') - 0.2)
    c = Card(RY0); t_out = start('q') - 0.2
    for lab, wd, lid, col in [('BASE', D['base'], 'b', 'ink'), ('PAST', D['past'], 'p', 'primary'), ('PAST PART.', D['pp'], 'pp', 'accent')]:
        row2(c, lab, wd, col, at(lid, 0), at(lid, wd))
    c.place(start('b'), t_out, 'a'); b1 = c.box
    c2 = Card(b1[3] + 28, tone='bad', badge='cross', t_badge=start('w')); tn = c2.text([['Not ', 'ink'], [D['over'], 'bad'], ['!', 'ink']], S['body'], start('w'), align='c')[0]
    c2.place(start('w'), t_out, 'b'); strike_on(tn, D['over'], at('w', D['over']) + 0.25)
    stem = D['quiz']['stem']
    quiz_card([[stem, 'ink']], D['quiz']['options'], D['quiz']['answer'], start('q'), at('a', D['quiz']['options'][D['quiz']['answer']]), start('sh') - 0.2,
              opt_ws=[at('q', D['quiz']['options'][0]), at('q', D['quiz']['options'][1])])
    save_card([[[f"{D['base']} · {D['past']} · {D['pp']}", 'primary']], [[f"Not {D['over']}", 'bad']]], start('sh'), start('c') - 0.2)
    end_card()


def T_stress():
    D = EP['data']; A, B = D['a'], D['b']; series_chip()
    hook_card([["Where's the ", 'ink'], ['stress', 'accent'], ['?', 'ink']], start('a') - 0.2)
    t_out = start('q') - 0.2
    c = Card(RY0); dots(c, A['syl'], A['stress'], start('a'), at('a', 'first'))
    c.text([[A['ipa'], 'muted']], S['ipa'], start('a'), align='c', ipa=True); IPA.append(dict(token=A['word'], ipa=A['ipa'], syl=A['syl'], stress=A['stress'], node=c.rows[-1]['id']))
    c.place(start('a'), t_out, 'a'); b1 = c.box
    c2 = Card(b1[3] + 28); dots(c2, B['syl'], B['stress'], at('b', B['word']), at('m', B['say']))
    c2.text([[B['ipa'], 'muted']], S['ipa'], at('b', B['word']), align='c', ipa=True); IPA.append(dict(token=B['word'], ipa=B['ipa'], syl=B['syl'], stress=B['stress'], node=c2.rows[-1]['id']))
    c2.text([['Say it with me!', 'primary']], S['sub'], start('r'), align='c'); c2.place(at('b', B['word']), t_out, 'b')
    o = D['quiz']['options']
    quiz_card([[B['word'], 'ink']], [f"{o[0]}-…", f"…-{o[1]}-…"], 1, start('q'), at('ans', B['say']), start('sh') - 0.2)
    save_card([[[A['word'] + ' → ', 'muted'], ['1st', 'accent']], [[B['word'] + ' → ', 'muted'], ['2nd', 'accent']]], start('sh'), start('c') - 0.2)
    end_card()


def _fix(D, t_hook_out, wrong_l, right_l, strike_tok_line):
    c = Card(RY0, tone='bad', badge='cross', t_badge=start(wrong_l)); tn = c.text([[D['wrong'], 'ink']], S['body'], start(wrong_l))[0]; b1 = c.place(start(wrong_l), start('q') - 0.2, 'a')
    strike_on(tn, D['strike'], at(wrong_l, D['strike'].split()[0]) + 0.15)
    return b1


def T_mistake():
    D = EP['data']; series_chip()
    hook_card([[EP['hook']['text'], 'ink']], start('w') - 0.2)
    b1 = _fix(D, None, 'w', 'r', None)
    NODES.append(dict(id='guess', type='qmark', size=96, box=[RX1 - 130, b1[3] + 20, RX1 - 20, b1[3] + 130], **{'in': cue(start('g'))}, out=dict(t=round(start('r') - 0.2, 3))))
    c = Card(b1[3] + 28, tone='good', badge='check', t_badge=at('r', 'better')); c.text(runs_hl(D['right'], 'discuss the', 'good'), S['body'], at('r', 'better'))
    c.text([[D['why'], 'muted']], S['sub'], start('y'))
    c.text([[D['memory'], 'accent']], S['sub'], start('k')); c.place(at('r', 'better'), start('q') - 0.2, 'b')
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[D['right'], 'good']], [[D['memory'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


def T_phrasal():
    D = EP['data']; series_chip()
    hook_card([[EP['hook']['text'], 'ink']], start('w') - 0.2)
    b1 = _fix(D, None, 'w', 'r', None)
    c = Card(b1[3] + 28, tone='good', badge='check', t_badge=at('r', 'say')); c.text(runs_hl(D['right'], D['pv'], 'good'), S['body'], at('r', 'say'))
    c.text([[D['pv'], 'primary'], [' ' + D['mean'], 'ink']], S['sub'], start('m'))
    c.text([[D['aha'], 'accent']], S['sub'], start('k')); c.place(at('r', 'say'), start('x') - 0.2, 'b')
    c3 = Card(b1[3] + 28); c3.text([['EXAMPLE', 'muted']], S['sub'], start('x'), gap=4); c3.text(runs_hl(D['ex'], 'hung out'), S['body'], start('x'))
    c3.place(start('x'), start('q') - 0.2, 'b')
    q = D['quiz']; quiz_card([[q['stem'], 'ink']], q['options'], q['answer'], start('q'), at('a', 0), start('sh') - 0.2)
    save_card([[[D['pv'], 'primary'], [' ' + D['mean'], 'ink']], [[D['aha'], 'muted']]], start('sh'), start('c') - 0.2)
    end_card()


dict(usuk=T_usuk, verbs=T_verbs, stress=T_stress, mistake=T_mistake, phrasal=T_phrasal)[EP['template']]()

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
else: box = [round(FMT['host_cx'] - hw / 2, 1), H - FMT['host_h'], round(FMT['host_cx'] + hw / 2, 1), H]
HOST = dict(who=EP['teacher'], talk='host_talk.webm', listen='host_listen.webm', box=box, segs=SEG, xfade=4, len=LEN, bubble=BB)
if BB: HEAD = list(BB); BODY = list(BB)
else:
    HEAD = [box[0] + hb[0] * k, box[1] + hb[1] * k, box[0] + hb[2] * k, box[1] + hb[3] * k]
    BODY = [box[0] + HG['bbox'][0] * k, box[1] + HG['bbox'][1] * k, box[0] + HG['bbox'][2] * k, H]

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
    if n['type'] == 'check' and n['in']['k'] == 'pop': tone(n['in']['t'] + C.HALF['pop'], 660, 0.22, -27, 990)
wav_out(f'{o.public}/voice.wav', mix); os.remove(raw); os.remove(f'{o.public}/_voice_n.wav')

# ---------------- assets ----------------
import qrcode   # noqa: E402
qr = qrcode.QRCode(border=2, box_size=12, error_correction=qrcode.constants.ERROR_CORRECT_M); qr.add_data(EP['cta']['link']); qr.make(fit=True)
qr.make_image(fill_color=TH['qr_ink'], back_color='white').save(f'{o.public}/qr.png')
shutil.copy(f'{ROOT}/brand/social/logo/lexkite-app-icon.png', f'{o.public}/icon.png')
os.makedirs(f'{o.public}/fonts', exist_ok=True); shutil.copy(FJ, f'{o.public}/fonts/jakarta.ttf'); shutil.copy(FN, f'{o.public}/fonts/noto.ttf')
for k_ in ('talk', 'listen'): shutil.copy(f'{o.host}/{k_}.webm', f'{o.public}/host_{k_}.webm')

# ---------------- props + QC timeline ----------------
props = dict(w=W, h=H, fps=FPS, durationInFrames=NF, theme=THEME, tint=TINT, layout=LAYOUT, format=o.format, total=TOTAL, nodes=NODES, caps=CAPS, capBox=FMT['cap'], host=HOST, audio='voice.wav')
json.dump(props, open(o.out, 'w'))
json.dump(dict(ep=EP['id'], template=EP['template'], theme=THEME, layout=LAYOUT, format=o.format, fps=FPS, total=TOTAL, safe=FMT['safe'], region=FMT['region'], cap_box=FMT['cap'],
               lines={k: dict(t0=v['t0'], t1=v['t1'], text=v['text'], words=v['words'], interp=v['interp'], whisper=v['whisper'], pause=v['pause']) for k, v in LINES.items()},
               speech=SPEECH, segs=SEG, host_xfade=HOST['xfade'], host_len=LEN, head=[round(v, 1) for v in HEAD], body=[round(v, 1) for v in BODY], cues=CUES, ipa=IPA, slots=SLOTS, sfx=SFX, vtt=VTT,
               voice=EP['voice'], teacher=EP['teacher'], hook=EP['hook'], cta=EP['cta'], nodes=NODES, caps=CAPS),
          open(o.out + '.timeline.json', 'w'), indent=0)
if EMBED:   # captions + chapters as WebVTT (translatable, one cue per line)
    ts = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}'
    open(o.out.replace('.json', '.en.vtt'), 'w').write('WEBVTT\n\n' + '\n'.join(f"{i + 1}\n{ts(v['t0'])} --> {ts(v['t1'])}\n{v['text']}\n" for i, v in enumerate(VTT)))
print(f"{EP['id']} {o.format} {THEME}: {TOTAL:.1f}s, {len(NODES)} nodes, {len(CAPS)} caption pages, {len(SEG)} host segments")
