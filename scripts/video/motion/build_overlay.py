#!/usr/bin/env python3
"""Stitch overlay builder (docs/VIDEO-MOTION.md): spec + host-plate timeline -> Remotion props + the QC timeline.

  python3 scripts/video/motion/build_overlay.py --spec S.json --plate P.mp4 --fonts brand/social/src/fonts --public PUB --out PROPS.json

Reads <plate>.timeline.json (render_v9.py --overlay: host + captions, Kokoro word times, head boxes, per-clip moving-body mask).
- layout: the free area = SAFE minus the host (head + moving body of every clip of the spec, widened by the camera push) minus the caption
  plate; ONE top card rectangle (fixed for the whole video) + ONE left column under it (Stitch "Tactile Night" frames, project
  "Lexkite English Exam Prep"). Text is measured with the same fonts Remotion draws (Plus Jakarta Sans 800, Noto Sans for IPA).
- timing: every element is keyed to a spoken word: in.t = word start - HALF[kind] (core.py), so it "appears" (alpha 0.5 / half drawn)
  exactly on the word; cards in one slot hand over without overlap; nothing moves after SETTLE while it is read.
Writes PROPS (nodes for src/stitch/Overlay.jsx), <public>/qr.png + icon.png + fonts, and <out>.timeline.json = plate timeline + overlay
pops as per-frame elements (24 fps grid) + the overlay contract of scripts/video/tpl/overlay_gates.py."""
import os, sys, json, math, argparse, shutil
import numpy as np
from PIL import ImageFont
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); sys.path.insert(0, f'{ROOT}/scripts/video/tpl')
import core as C
from tokens import SAFE as SAFE_SHORT

ap = argparse.ArgumentParser()
for a in ('spec', 'plate', 'fonts', 'public', 'out'): ap.add_argument('--' + a, required=True)
ap.add_argument('--fps', type=int, default=60)
ap.add_argument('--format', default='short', choices=['short', 'wide', 'sq45'], help='short = 9:16 social; wide = 16:9 lesson/blog embed; sq45 = 4:5 in-lesson mobile embed (no burned captions: VTT track, no QR / follow CTA, calmer motion)')
ap.add_argument('--host-geom', default='', help='host geometry JSON {head:[x0,y0,x1,y1], envelope:[[y,x0,x1],...]} in 1080x1920 canvas px (puppet host); default = the plate mask')
ap.add_argument('--tag', default='PLACEHOLDER HOST', help='small label burned top-left (inside the platform UI band) while the host is the temporary footage plate; empty = none')
ap.add_argument('--icon', default=f'{ROOT}/brand/social/logo/lexkite-app-icon.png')
o = ap.parse_args()
SP = json.load(open(o.spec)); T = json.load(open(o.plate + '.timeline.json')); M = SP['motion']
WORDS = T['words']; TOTAL = T['total']; EMBED = o.format != 'short'
# ---------------- formats: canvas, where the host plate goes (source crop -> destination), the free area for the cards ----------------
_hd = [T['head'][c] for c in SP['clips'] + SP.get('listen', []) if c in T['head']]; HEAD_TOP = min(b[1] for b in _hd)
if o.format == 'short':
    W, H = 1080, 1920; SAFE = SAFE_SHORT; PLATE = dict(sx=0, sy=0, sw=1080, sh=1920, dx=0, dy=0, dw=1080, dh=1920, r=0)
elif o.format == 'wide':   # lesson player: cards on the left (dark canvas), the teacher in a rounded video window on the right
    W, H = 1920, 1080; _sy = max(0, HEAD_TOP - 170); _sh = min(1920 - _sy, 1250); _sw = round(_sh * 0.8)
    PLATE = dict(sx=1080 - _sw, sy=_sy, sw=_sw, sh=_sh, dx=1080, dy=40, dw=800, dh=1000, r=40)
    SAFE = dict(x0=64, x1=1016, y0=56, y1=1024)
else:   # 4:5 in-lesson: cards on the dark canvas (top + left column), the teacher in a rounded window lower-right
    W, H = 1080, 1350; _sy = max(0, HEAD_TOP - 170); _sh = min(1920 - _sy, 1250); _sw = round(_sh * 0.8)
    PLATE = dict(sx=1080 - _sw, sy=_sy, sw=_sw, sh=_sh, dx=460, dy=566, dw=576, dh=720, r=36)
    SAFE = dict(x0=44, x1=1036, y0=44, y1=1306)
_k = PLATE['dw'] / PLATE['sw']
def to_canvas(x, y): return PLATE['dx'] + (x - PLATE['sx']) * _k, PLATE['dy'] + (y - PLATE['sy']) * _k

# ---------------- Stitch "Tactile Night" tokens (DESIGN.md, 390 px frames x 2.77) ----------------
INK, MUTED, DIM = '#F3F8F8', '#94A8AB', '#7F9497'
CARD, RAISED, EDGE, LEDGE = '#172427', '#1E2F33', '#22383D', '#0E181A'
TEAL, TEALT, GREEN, GOLD, CORAL, CORALT = '#2BA39A', '#6BD8CE', '#2FBF71', '#FFC94A', '#F2553B', '#FF8F75'
TONE = dict(gold=('#2C2618', '#6B5A2A', GOLD), coral=('#3A1C17', '#7A3A2E', CORALT), teal=('#123634', '#2B6F69', TEALT), green=('#123A26', '#2C7A4E', GREEN))
COL_OF = dict(ink=INK, muted=MUTED, gold=GOLD, teal=TEALT, green=GREEN, coral=CORALT, dim=DIM)
PILL = dict(idle=dict(fill=RAISED, edge='#2A4146', ledge='#0D1618', ink=INK, ring='#10191B', ring_ink=INK),
            right=dict(fill='#12382C', edge=GREEN, ledge='#166E40', ink=INK, ring=GREEN, ring_ink='#0E2919'),
            dim=dict(fill=CARD, edge='#1F3337', ledge='#0D1618', ink=DIM, ring='#10191B', ring_ink=DIM))
R_CARD, PAD, GAP, LEDGE_H, BORDER = 48, 40, 22, 12, 3
S_HOOK, S_BODY, S_SUB, S_CHIP, S_IPA = 100, 76, 46, 34, 46   # cap height x0.75 (Jakarta): hook 75 >= 72, body 57 >= 56, card lines >= 25 (qc_v9 min_text_px)
CAP_J, CAP_N = 0.75, 0.714

FJ = f'{o.fonts}/PlusJakartaSans-VF.ttf'; FN = f'{o.fonts}/NotoSans-Medium.ttf'; _fc = {}
def font(sz, ipa=False):
    k = (sz, ipa)
    if k not in _fc:
        f = ImageFont.truetype(FN if ipa else FJ, sz)
        if not ipa: f.set_variation_by_axes([800])
        _fc[k] = f
    return _fc[k]
def tw(s, sz, ipa=False, ls=0.0): return font(sz, ipa).getlength(s) + ls * sz * len(s)

# ---------------- time anchors (same grammar as render_v9 tm_of) ----------------
def word(lid, k):
    n = sum(1 for key in WORDS if key.startswith(lid + '.')); return WORDS[f'{lid}.{k % n}']
def at(a):
    if a[0] == 't': return float(a[1])
    if a[0] == 'end': return TOTAL + float(a[1])
    if a[0] == 'beat': b = T['beats'][a[1]]; return b['s' if a[2] == 's' else 'e'] + (a[3] if len(a) > 3 else 0)
    w = word(a[0], a[1]); return w[a[2] if len(a) > 2 else 's'] + (a[3] if len(a) > 3 else 0)
def cue(a, k):   # entrance keyed to a spoken word: appears (HALF) exactly at the word start
    if EMBED and k == 'pop': k = 'fade'   # embed: calmer motion (no bounce)
    if a[0] in ('t', 'end', 'beat'): return dict(t=round(at(a), 4), k=k), None
    w = word(a[0], a[1]); return dict(t=round(w['s'] - C.HALF[k], 4), k=k), dict(w=f"{a[0]}.{a[1] % sum(1 for x in WORDS if x.startswith(a[0] + '.'))}", at=w['s'], tok=w['w'])

# ---------------- free area: SAFE minus host (head + moving body, camera push) minus captions ----------------
Fb = np.zeros((H, W), bool)
clips = [c for c in SP['clips'] + SP.get('listen', []) if c in (T.get('host_move') or {})]
assert clips, 'plate has no host_move mask (render_v9.py --overlay)'
SM = max(1.0, T.get('smax', 1.0)); AX, AY = T['anchor']
def mark(x0, y0, x1, y1, pad):
    for s in (1.0, SM):
        a = [AX + (x0 - AX) * s, AY + (y0 - AY) * s, AX + (x1 - AX) * s, AY + (y1 - AY) * s]
        a = [*to_canvas(a[0], a[1]), *to_canvas(a[2], a[3])]
        Fb[max(0, int(a[1]) - pad):min(H, int(math.ceil(a[3])) + pad), max(0, int(a[0]) - pad):min(W, int(math.ceil(a[2])) + pad)] = True
HG = json.load(open(o.host_geom)) if o.host_geom else None
for c in ([None] if HG else clips):   # puppet: its declared envelope; placeholder plate: the measured move mask of every clip
    for y, x0, x1 in (HG['envelope'] if HG else T['host_move'][c]): mark(x0, y, x1, y + 8, 14)   # the move mask is already dilated 1 cell
    hb = HG['head'] if HG else T['head'][c]; mark(hb[0], hb[1], hb[2], hb[3], 28)
cs = T.get('cap_strip'); cap_top = ((cs[1] if cs else 1328) - 26) if not EMBED else SAFE['y1']   # caption plate (short: fixed lower band; embed: captions are a VTT track)
if EMBED: Fb[:] = False; Fb[PLATE['dy'] - 40:, PLATE['dx'] - 40:] = True   # the teacher lives in its own window: everything else is free
X0, X1, Y0 = SAFE['x0'], SAFE['x1'], SAFE['y0'] + 18   # + the 14 px exit lift stays inside SAFE
TOP_Y1 = next((y for y in range(Y0, H) if Fb[y, X0:X1].any()), SAFE['y1']) - 6   # full-width card above the head
def col_x1(y0, y1):   # left column right edge over rows y0..y1
    row = Fb[y0:y1, X0:X1].any(0); return X0 + (int(np.argmax(row)) if row.any() else X1 - X0) - 14
print(f'free: top card y {Y0}..{TOP_Y1} (h {TOP_Y1 - Y0}), caption top {cap_top}, clips {clips}', flush=True)

NODES = []; CARDS = {}; IPA = []; CUES = []
def node(**kw):
    kw = {k: v for k, v in kw.items() if v is not None}; kw['box'] = [round(v, 1) for v in kw['box']]; NODES.append(kw); return kw

class Card:
    """Vertical stack of rows inside a card (x0, y0, w). Rows are added with local coordinates; place() makes them absolute."""
    def __init__(s, cid, x0, y0, w, kind='lesson', group='pop', tone=None, pad=PAD):
        s.id, s.x0, s.y0, s.w, s.kind, s.group, s.tone, s.pad = cid, x0, y0, w, kind, group, tone, pad; s.y = pad; s.rows = []; s.text = []; s.m = []; s.px = []
    def inner(s): return s.w - 2 * s.pad
    def add(s, h, items, gap=GAP):
        para = items and items[0].get('type') == 'text' and s.rows and s.rows[-1].get('type') in ('text', 'slot') and gap == GAP
        if s.rows: s.y += 4 if para else gap
        for it in items: it['box'] = [it['box'][0], s.y + it['box'][1], it['box'][2], s.y + it['box'][3]]; s.rows.append(it)
        s.y += h
    def chip(s, text, tone, extra=None):
        h = 60; w = tw(text.upper(), S_CHIP, ls=0.06) + 52
        it = [dict(type='chip', box=[s.pad, 0, s.pad + w, h], text=text.upper(), label=text, tone=tone, size=S_CHIP)]
        if extra: it += extra(h)
        s.add(h, it); s.text.append(text.upper()); s.m.append(['card', S_CHIP * CAP_J]); s.px.append(S_CHIP)
    def line(s, runs, size, mtype='body', ipa=False, slot=None, align='l'):
        txt = ''.join(r[0] for r in runs); w = tw(txt, size, ipa); lh = round(size * 1.18)
        if w > s.inner() + 1 and mtype == 'card' and not slot:   # small lines wrap word by word (colour runs kept); body lines are laid out by the spec
            out = []; cur = []
            for a_, c_ in runs:
                for k_, wd in enumerate(a_.split(' ')):
                    tok = (' ' if k_ else '') + wd
                    if cur and tw(''.join(x[0] for x in cur) + tok, size, ipa) > s.inner(): out.append(cur); cur = [[tok.lstrip(), c_]]
                    else: cur.append([tok, c_])
            out.append(cur); allit = []
            for ln in out: allit += [x for x in s.line([[a_, c_] for a_, c_ in ln if a_], size, mtype, ipa, None, align) if x['type'] == 'text']
            return allit   # every wrapped line (a cue set by the caller applies to all of them)
        assert w <= s.inner() + 1, (s.id, 'line too wide', txt, round(w), round(s.inner()))
        x = s.pad if align == 'l' else s.pad + (s.inner() - w) / 2
        it = dict(type='text', box=[x, 0, x + w, lh], runs=[[a, COL_OF.get(b, b)] for a, b in runs], size=size, ipa=ipa)
        items = [it]
        if slot:   # blank slot "___" replaced by the answer: a dashed underline as wide as the answer word, positioned under the slot run
            pre = ''.join(r[0] for r in runs[:slot['run']]); sx = x + tw(pre, size, ipa); sw = tw(runs[slot['run']][0], size, ipa)
            items.append(dict(type='slot', box=[sx, 0, sx + sw, lh], word=slot['word'], size=size, color=GREEN))
        s.add(lh, items); s.text.append(txt); s.m.append([mtype, size * (CAP_N if ipa else CAP_J)]); s.px.append(size)
        return items
    def custom(s, h, items, text=None, m=None, px=None, gap=GAP):
        s.add(h, items, gap)
        if text: s.text.append(text)
        if m: s.m.append(m)
        if px: s.px.append(px)
    def height(s): return s.y + s.pad + LEDGE_H
    def place(s, h=None, ins=None, out=None, st=None, extra=None):
        hh = h or s.height(); box = [s.x0, s.y0, s.x0 + s.w, s.y0 + hh]
        assert box[3] <= cap_top or s.id == '_m', (s.id, 'card runs into the caption plate', box, cap_top)
        assert hh >= s.height() - 0.5, (s.id, 'content taller than the slot', s.height(), hh)
        cn = node(id=s.id, type='card', box=box, **{'in': ins}, out=out, st=st, fill=CARD, edge=EDGE, ledge=LEDGE, accent=s.tone, kind=s.kind)
        for i, it in enumerate(s.rows):
            b = it['box']; it = dict(it, id=it.get('id') or f'{s.id}.{i}', parent=s.id, box=[s.x0 + b[0], s.y0 + b[1], s.x0 + b[2], s.y0 + b[3]])
            if 'in' not in it: it['in'] = ins
            node(**it)
        CARDS[s.id] = dict(card=cn, kind=s.kind, group=s.group, text=' / '.join(s.text), m=s.m, px=max(s.px) if s.px else S_BODY, extra=extra or {})   # px = the card's main text size (min sizes per type are in m)
        return cn

def handover(slots):   # cards sharing one slot: each leaves 0.17 s before the next appears (fade 0.16 s) -> never two at alpha > 0.3
    for a, b in zip(slots, slots[1:]): a['out'] = dict(t=round(b['in']['t'] - 0.17, 4))

# ---------------- templates ----------------
def chip_ring(cid, beat):   # countdown ring at the right end of a chip row (3-2-1 beat)
    def f(h):
        d = 96; b = T['beats'][beat]
        return [dict(id=f'{cid}.ring', type='ring', box=[0, 0, d, d], ring=dict(t0=b['s'], t1=b['e']), size=48, **{'in': dict(t=round(b['s'], 4), k='fade' if EMBED else 'pop'), 'out': dict(t=round(b['e'] - 0.02, 4))})]
    return f

def top_card(cid, kind='lesson', group='pop', tone=None): return Card(cid, X0, Y0, X1 - X0, kind, group, tone)
def col_card(cid, y0, kind='lesson', group='pop', tone=None):
    x1 = col_x1(y0, min(cap_top, y0 + 640)); return Card(cid, X0, y0, x1 - X0, kind, group, tone, pad=30)

def fix_ring(card, h_chip=60):   # move the ring item to the card's top-right corner
    for it in card.rows:
        if it.get('type') == 'ring':
            d = it['box'][2] - it['box'][0]; it['box'] = [card.w - PAD - d, PAD - 18, card.w - PAD, PAD - 18 + d]

def pills(y0, opts, cues, reveal, right, cid='opts'):
    """Stacked A-D option pills in the left column; each appears on its spoken word, the index ring turns into a check on the reveal word."""
    x1 = col_x1(y0, y0 + len(opts) * 140); x1 = min(x1, X0 + 640); w = x1 - X0; out = []
    h = min(118, (SAFE['y1'] - y0 + 24) // len(opts) - 24); assert h >= round(S_BODY * 1.18) + 16, ('option pills do not fit inside SAFE', h)   # 16:9 embed: the 4 pills shrink to stay inside SAFE (never below the text line + 16 px)   # embed (wide): pills keep a pill shape, not the full panel
    need = max(tw(t, S_BODY) for t in opts) + 60 + 18 + 2 * 20
    assert need <= w, ('option column too narrow', round(need), w)
    rin, rcue = cue(reveal, 'pop')
    for i, (txt, c) in enumerate(zip(opts, cues)):
        y = y0 + i * (h + 24); ins, cw = cue(c, 'rise'); CUES.append(dict(node=f'{cid}.{i}', **cw))
        st = [dict(t=round(rcue['at'] - 0.02, 4), s='right' if i == right else 'dim')]
        out.append(node(id=f'{cid}.{i}', type='pill', box=[X0, y, x1, y + h], idx='ABCD'[i], label=txt, size=S_BODY, **{'in': ins}, st=st, pal=PILL, card=cid))
    out.append(node(id=f'{cid}.chk', type='check', parent=f'{cid}.{right}', box=[X0 + 20, y0 + right * (h + 24) + (h - 60) // 2, X0 + 20 + 60, y0 + right * (h + 24) + (h - 60) // 2 + 60], **{'in': rin}))
    CUES.append(dict(node=f'{cid}.chk', **rcue))
    CARDS[cid] = dict(card=None, nodes=[n['id'] for n in out[:-1]], kind='lesson', group='pop', text=' / '.join(f'{"ABCD"[i]} {t}' for i, t in enumerate(opts)),
                      m=[['body', S_BODY * CAP_J]], px=S_BODY, extra={})
    return out, y0 + len(opts) * (h + 24) - 24

END_TOP_H = PAD + 132 + GAP + round(S_BODY * 1.18) + PAD + LEDGE_H
def end_card_embed(c_line, top_h):
    """Embed end card: no QR, no follow CTA – it hands over to the next lesson step (the lesson UI owns the real button)."""
    ins, cw = cue([c_line, 0], 'rise'); CUES.append(dict(node='endtop', **cw)); out = dict(t=round(TOTAL - 0.40 - C.OUT, 4))
    A = top_card('endtop', kind='lesson', group='pop'); A.chip('Up next', 'teal'); A.line([[SP['cta']['say'], INK]], S_BODY, 'body')
    ch = round(S_SUB * 1.2) + 44; A.custom(ch, [dict(type='cta', box=[A.pad, 0, A.pad + tw('Next step →', S_SUB) + 120, ch], lines=['Next step →'], size=S_SUB, lh=round(S_SUB * 1.2))], text='Next step →', m=['card', S_SUB * CAP_J], px=S_SUB)
    A.place(h=max(top_h, A.height()), ins=ins, out=out); CARDS['endtop']['px'] = S_BODY

def end_card(c_line, top_h, col_y0):
    """End card (Stitch end frame): app icon + Lexkite + 100% FREE on top; QR + gradient CTA + lexkite.com in the column."""
    cta = SP['cta']; ins, cw = cue([c_line, 0], 'rise'); CUES.append(dict(node='endtop', **cw)); out = dict(t=round(TOTAL - 0.40 - C.OUT, 4))
    A = top_card('endtop', kind='lesson', group='cta')
    A.custom(132, [dict(type='img', box=[PAD, 0, PAD + 132, 132], src='icon.png', radius=32),
                   dict(type='text', box=[PAD + 160, 4, PAD + 160 + tw('Lexkite', S_BODY), 84], runs=[['Lexkite', INK]], size=S_BODY),
                   dict(type='text', box=[PAD + 160, 84, PAD + 160 + tw('IELTS · TOEIC · TOEFL', S_SUB), 132], runs=[['IELTS · TOEIC · TOEFL', MUTED]], size=S_SUB)],
             text='Lexkite · IELTS · TOEIC · TOEFL', m=['card', S_SUB * CAP_J], px=S_SUB)
    A.custom(round(S_BODY * 1.18), [dict(type='text', box=[PAD, 0, PAD + tw('100% FREE', S_BODY), round(S_BODY * 1.18)], runs=[['100% ', GOLD], ['FREE', GOLD]], size=S_BODY)], text='100% FREE', m=['body', S_BODY * CAP_J], px=S_BODY)
    A.place(h=top_h, ins=ins, out=out)
    CARDS['endtop']['px'] = S_BODY
    B = col_card('endcol', col_y0, kind='cta', group='cta')
    say = cta['say'] + ' →'; words = say.split(); lines, cur = [], ''
    for w_ in words:
        if tw((cur + ' ' + w_).strip(), S_SUB) <= B.inner() - 48: cur = (cur + ' ' + w_).strip()
        else: lines.append(cur); cur = w_
    lines.append(cur); lh = round(S_SUB * 1.2); ch = len(lines) * lh + 44
    q = int(min(250, cap_top - col_y0 - (2 * B.pad + LEDGE_H + ch + 2 * GAP + round(S_SUB * 1.2)) - 2)); assert q >= 180, ('no room for the QR code', q)   # QR shrinks to the room left above the captions
    B.custom(q, [dict(type='img', box=[(B.w - q) / 2, 0, (B.w + q) / 2, q], src='qr.png', radius=24)], text='QR ' + cta['link'], gap=0)
    B.custom(ch, [dict(type='cta', box=[B.pad, 0, B.w - B.pad, ch], lines=lines, size=S_SUB, lh=lh)], text=' '.join(lines), m=['card', S_SUB * CAP_J], px=S_SUB)
    B.custom(round(S_SUB * 1.2), [dict(type='text', box=[(B.w - tw('lexkite.com', S_SUB)) / 2, 0, (B.w + tw('lexkite.com', S_SUB)) / 2, round(S_SUB * 1.2)], runs=[['lexkite.com', TEALT]], size=S_SUB)],
             text='lexkite.com', m=['card', S_SUB * CAP_J], px=S_SUB)
    B.place(ins=ins, out=out, extra=dict(url=cta['link']))

def runs_of(spec_runs): return [[r[0], r[1] if len(r) > 1 else 'ink'] for r in spec_runs]

def build():
    tops, cols = [], []
    top_h = max([_measure_top(c) for c in M['top']] + [END_TOP_H]); col_y0 = Y0 + top_h + 32
    assert Y0 + top_h <= TOP_Y1, ('top card does not fit above the head', top_h, TOP_Y1 - Y0)
    for c in M['top']: tops.append(_top(c, top_h))
    for c in M.get('col', []): cols.append(_col(c, col_y0))
    if M.get('bar'):   # under the option stack; wide: beside the (640 px) pills
        if o.format == 'wide': _bar(M['bar'], col_y0, X0 + 640 + 28)
        else: _bar(M['bar'], col_y0 + max(len(c['opts']) for c in M['col'] if c['t'] == 'opts') * 142 + 10)
    if EMBED: end_card_embed(M['end_line'], top_h)
    else: end_card(M['end_line'], top_h, col_y0)
    tops.append(CARDS['endtop']['card'])
    cols.append(CARDS['endcol']['card'] if 'endcol' in CARDS else CARDS['endtop']['card'])   # embed: the end card alone also closes the column slot
    handover(tops); handover([x for x in cols if x is not None])
    if M.get('bar'): NODES_BY[M['bar']['id']]['out'] = dict(t=round(CARDS['endtop']['card']['in']['t'] - 0.17, 4))
    for oid, c in CARDS.items():   # option pills leave with the column slot that follows them
        if c.get('nodes'):
            nxt = next((x for x in cols + [CARDS['endtop']['card']] if x and x['in']['t'] > NODES_BY[c['nodes'][-1]]['in']['t']), None)
            for nid in c['nodes']:
                if nxt: NODES_BY[nid]['out'] = dict(t=round(nxt['in']['t'] - 0.17, 4))
    for n in NODES:   # children leave with their card
        if n.get('parent') and n['parent'] in NODES_BY and NODES_BY[n['parent']].get('out') and not n.get('out'): n['out'] = NODES_BY[n['parent']]['out']

class _NB(dict):
    def __missing__(s, k):
        for n in NODES:
            if n['id'] == k: return n
        raise KeyError(k)
NODES_BY = _NB()

def _fill_top(cd, c, measure=False):
    for r in c['rows']:
        if r['t'] == 'chip': cd.chip(r['text'], r.get('tone', 'gold'), chip_ring(cd.id, r['ring']) if r.get('ring') else None)
        elif r['t'] == 'line': cd.line(runs_of(r['runs']), S_HOOK if r.get('hook') else S_BODY, 'hook' if r.get('hook') else 'body', slot=r.get('slot'))
        elif r['t'] == 'sub': cd.line(runs_of(r['runs']), S_SUB, 'card')
        elif r['t'] == 'ipa': cd.line(runs_of(r['runs']), S_IPA, 'card', ipa=True)
    fix_ring(cd)
    return cd

def _measure_top(c): return _fill_top(Card('_m', X0, Y0, X1 - X0), c, True).height()

def _top(c, top_h):
    cd = _fill_top(top_card(c['id'], c.get('kind', 'lesson'), 'hook' if c.get('hook') else 'pop', c.get('tone')), c)
    if c.get('hook'): ins = dict(t=0.0, k='rise'); cw = None   # hook: on screen from the first frame (fully visible <= 0.40 s)
    else: ins, cw = cue(c['at'], 'rise'); CUES.append(dict(node=c['id'], **cw))
    st = [dict(t=round(at(x['at']) - (0.0 if x['at'][0] in ('t', 'beat') else 0.02), 4), s=x['s']) for x in c.get('st', [])]
    extra = {}
    if c.get('ipa'): IPA.append(dict(pop=c['id'], **c['ipa']))
    cn = cd.place(h=top_h, ins=ins, st=st or None, extra=extra)
    for it in NODES:
        if it.get('parent') == c['id'] and it['type'] == 'slot' and c.get('reveal'):
            rin, rcw = cue(c['reveal'], 'pop'); it['st'] = [dict(t=round(rcw['at'] - 0.02, 4), s='filled')]; CUES.append(dict(node=it['id'], **rcw))
    for x in c.get('strike', []):   # strike-through drawn over one run of a line, on the spoken word
        ln = [n for n in NODES if n.get('parent') == c['id'] and n['type'] == 'text'][x['line']]
        pre = ''.join(r[0] for r in ln['runs'][:x['run']]); sx = ln['box'][0] + tw(pre, ln['size']); sw = tw(ln['runs'][x['run']][0].rstrip(), ln['size'])
        cy = (ln['box'][1] + ln['box'][3]) / 2 + 4; ins_, cw_ = cue(x['at'], 'draw'); CUES.append(dict(node=f"{c['id']}.strike", **cw_))
        node(id=f"{c['id']}.strike", type='strike', parent=c['id'], box=[sx - 8, cy - 9, sx + sw + 8, cy + 9], color=CORAL, **{'in': ins_})
    for x in ([] if EMBED else c.get('xp', [])):   # +XP is a social-short reward; the embedded lesson stays calm
        ins_, cw_ = cue(x['at'], 'pop'); CUES.append(dict(node=f"{c['id']}.xp", **cw_)); wx = tw('+10 XP', S_CHIP) + 60
        node(id=f"{c['id']}.xp", type='xp', parent=c['id'], box=[cn['box'][2] - PAD - wx, cn['box'][1] + PAD - 4, cn['box'][2] - PAD, cn['box'][1] + PAD + 60], size=S_CHIP,
             val=dict(t=ins_['t'] + 0.05, d=0.45, a=0, b=x['n']), **{'in': ins_})
    return cn

def _bar(b, y0, x0=None):
    """Band bar card (Stitch readiness gauge): chip + band number counting up + teal->gold track with ticks and the target flag; steps up on each correct answer."""
    cd = col_card(b['id'], y0, 'lesson', 'pop'); lo, hi = b['lo'], b['hi']
    if x0: cd.w = cd.x0 + cd.w - x0; cd.x0 = x0
    segs = []
    for a_, v0, v1 in b['steps']:
        ins_, cw_ = cue(a_, 'pop'); segs.append(dict(t=round(cw_['at'], 4), d=0.6, a=v0, b=v1))
    nw = tw('9.0', S_BODY); cd.chip('Band', 'gold')
    num = dict(id=f"{b['id']}.num", type='num', box=[cd.w - cd.pad - nw, cd.pad - 14, cd.w - cd.pad, cd.pad - 14 + 90], size=S_BODY, dec=1, color=GOLD, val=segs)
    cd.rows.append(dict(num, box=num['box']))
    th = 30; lab = 50; iw = cd.inner()
    cd.custom(th + 18 + lab, [dict(id=f"{b['id']}.bar", type='bar', box=[cd.pad, 0, cd.pad + iw, th + 18 + lab], lo=lo, hi=hi, target=b['target'], track=th, size=S_CHIP, val=segs)],
              text=' '.join(str(x) for x in range(int(lo), int(hi) + 1)), m=['card', S_CHIP * CAP_J], px=S_CHIP)
    ins, cw = cue(b['at'], 'rise'); CUES.append(dict(node=b['id'], **cw))
    cn = cd.place(ins=ins); CARDS[b['id']]['text'] += ' / band ' + str(b['target'])
    return cn

def _col(c, y0):
    if c['t'] == 'opts':
        ps, _ = pills(y0, c['opts'], c['cues'], c['reveal'], c['right'], c['id']); return ps[0]
    cd = col_card(c['id'], y0, 'lesson', 'pop', c.get('tone'))
    for r in c['rows']:
        if r['t'] == 'chip': cd.chip(r['text'], r.get('tone', 'gold'))
        elif r['t'] == 'line': cd.line(runs_of(r['runs']), S_BODY, 'body')
        elif r['t'] == 'sub': cd.line(runs_of(r['runs']), S_SUB, 'card')
        elif r['t'] == 'ipa': cd.line(runs_of(r['runs']), S_IPA, 'card', ipa=True)
        elif r['t'] == 'dots':   # stress dots: one per syllable, the stressed one gold and larger (switches on the stress word)
            n = len(r['syl']); d0, d1 = 30, 48; it = []; x = cd.pad
            for i, sy in enumerate(r['syl']):
                big = i == r['stress']; d = d1 if big else d0; lw = tw(sy.upper() if big else sy, S_SUB)
                it.append(dict(id=f"{c['id']}.dot{i}", type='dot', box=[x + (lw - d) / 2, (d1 - d) / 2, x + (lw + d) / 2, (d1 + d) / 2], big=big, hit=at(r['hit']) - 0.02 if big else None))
                it.append(dict(type='text', box=[x, d1 + 10, x + lw, d1 + 10 + 56], runs=[[sy.upper() if big else sy, GOLD if big else MUTED]], size=S_SUB)); x += lw + 18
            cd.custom(d1 + 66, it, text='·'.join(sy.upper() if i == r['stress'] else sy for i, sy in enumerate(r['syl'])), m=['card', S_SUB * CAP_J], px=S_SUB)
        elif r['t'] == 'tile':   # rule tile: tone pill + meaning (+ example appearing on its own word)
            hp = 58; n0 = len(cd.rows); it = [dict(type='chip', box=[cd.pad, 0, cd.pad + tw(r['tag'], S_SUB, ls=0.04) + 44, hp], text=r['tag'], tone=r['tone'], size=S_SUB)]
            cd.custom(hp, it, text=r['tag'], m=['card', S_SUB * CAP_J], px=S_SUB, gap=GAP if not n0 else 34)
            for ln in r['lines']: cd.line(runs_of(ln), S_SUB, 'card')
            if r.get('at') and r['at'] != c['at']:   # a later tile appears on its own spoken word
                ins_, cw_ = cue(r['at'], 'rise'); CUES.append(dict(node=f"{c['id']}.tile{n0}", **cw_))
                for k_, x in enumerate(cd.rows[n0:]): x['in'] = ins_; x['id'] = x.get('id') or f"{c['id']}.tile{n0}" + ('' if not k_ else f'.{k_}')
            if r.get('ex'):
                items = [x for x in cd.line(runs_of(r['ex']), S_SUB, 'card') if x['type'] == 'text']; ins_, cw_ = cue(r['ex_at'], 'rise')
                for j_, x in enumerate(items): x['in'] = ins_; x['id'] = f"{c['id']}.ex{len(cd.rows)}" + (f'.{j_}' if j_ else '')
                CUES.append(dict(node=items[0]['id'], **cw_))
    ins, cw = cue(c['at'], 'rise'); CUES.append(dict(node=c['id'], **cw))
    if c.get('ipa'): IPA.append(dict(pop=c['id'], **c['ipa']))
    cn = cd.place(ins=ins)
    for n in NODES:
        if n.get('parent') == c['id'] and n['type'] == 'dot' and n.get('hit'):
            n['st'] = [dict(t=round(n.pop('hit'), 4), s='hit')]
    return cn

build()
NODES = [n for n in NODES if n['id'] != '_m']
for n in NODES: n.pop('hit', None)
# ---------------- assets: QR (deep link), app icon, fonts -> Remotion public dir ----------------
os.makedirs(o.public, exist_ok=True)
import qrcode
qr = qrcode.QRCode(border=2, box_size=12, error_correction=qrcode.constants.ERROR_CORRECT_M); qr.add_data(SP['cta']['link']); qr.make(fit=True)
qr.make_image(fill_color='#10191B', back_color='white').save(f'{o.public}/qr.png')
shutil.copy(o.icon, f'{o.public}/icon.png')
os.makedirs(f'{o.public}/fonts', exist_ok=True); shutil.copy(FJ, f'{o.public}/fonts/jakarta.ttf'); shutil.copy(FN, f'{o.public}/fonts/noto.ttf')

# ---------------- per-frame elements (24 fps plate grid) + overlay contract for qc_v9 / overlay_gates ----------------
def card_nodes(cid):
    c = CARDS[cid]; return [NODES_BY[x] for x in c['nodes']] if c.get('nodes') else [c['card']]
def digit_at(cid, t):
    for n in NODES:
        if n.get('parent') == cid and n['type'] == 'ring' and n['ring']['t0'] <= t < n['ring']['t1']: return str(min(3, math.ceil(n['ring']['t1'] - t - 1e-9)))
    return None
def els_at(t):
    E = []
    for cid, c in CARDS.items():
        bs = [(C.visible_box(n, t)) for n in card_nodes(cid)]; bs = [(b, p) for b, p in bs if b]
        if not bs: continue
        bx = [min(b[0] for b, _ in bs), min(b[1] for b, _ in bs), max(b[2] for b, _ in bs), max(b[3] for b, _ in bs)]; al = max(p['a'] for _, p in bs)
        E.append([f'pop.{cid}', c['text'], *[round(v) for v in bx], round(al, 3), c['px'], c['group'], digit_at(cid, t), 'overlay', c['m']])
    return E
FPS_P = T['fps']
for f in T['frames']: f['els'] = [e for e in f['els'] if not e[0].startswith('pop.') and not EMBED] + els_at(f['t'])   # embed: no burned captions

def pairs_for(cid):   # every text colour on the fill it sits on, per state
    P = []
    for n in NODES:
        if n.get('parent') != cid and n['id'] != cid and not (CARDS[cid].get('nodes') and n['id'] in CARDS[cid]['nodes']): continue
        if n['type'] == 'text': P += [dict(name=f"{n['id']}:{r[0][:12]}", fg=_rgb(r[1]), bg=_rgb(CARD)) for r in n['runs']]
        elif n['type'] == 'chip': bg, _, ink = TONE[n['tone']]; P.append(dict(name=n['id'], fg=_rgb(ink), bg=_rgb(bg)))
        elif n['type'] == 'pill': P += [dict(name=f"{n['id']}:{k}", fg=_rgb(v['ink']), bg=_rgb(v['fill'])) for k, v in PILL.items()] + [dict(name=f"{n['id']}:ring:{k}", fg=_rgb(v['ring_ink']), bg=_rgb(v['ring'])) for k, v in PILL.items()]
        elif n['type'] == 'cta': P.append(dict(name=n['id'], fg=_rgb('#FFFFFF'), bg=_rgb('#EE5A3C')))
        elif n['type'] == 'slot': P.append(dict(name=n['id'], fg=_rgb(n['color']), bg=_rgb(CARD)))
        elif n['type'] == 'xp': P.append(dict(name=n['id'], fg=_rgb(GOLD), bg=_rgb('#2C2618')))
        elif n['type'] == 'ring': P.append(dict(name=n['id'], fg=_rgb(CORALT), bg=_rgb(CARD)))
    return P
def _rgb(h): return [int(h[i:i + 2], 16) for i in (1, 3, 5)]
def boxes_for(cid):
    c = CARDS[cid]; cn = c['card']
    if cn is None: return [1080, 1920], [dict(name=n['id'], box=n['box']) for n in card_nodes(cid)]
    ox, oy = cn['box'][0], cn['box'][1]; B = []
    for n in NODES:
        if n.get('parent') == cid and n['type'] in ('text', 'chip', 'img', 'cta', 'ring', 'xp'):
            B.append(dict(name=n['id'], box=[n['box'][0] - ox, n['box'][1] - oy, n['box'][2] - ox, n['box'][3] - oy]))
    return [cn['box'][2] - ox, cn['box'][3] - oy], B
OV = dict(pops={}, measured=[], ipa=IPA, cues=CUES)
for cid in CARDS:
    size, B = boxes_for(cid)
    # ring (count beat) and +XP (after the reveal) share the chip-row corner, never at the same time: one state each
    base = [b for b in B if not b['name'].endswith(('.ring', '.xp'))]; var = [b for b in B if b['name'].endswith(('.ring', '.xp'))]
    OV['pops'][cid] = dict(states=[dict(state=v['name'].rsplit('.', 1)[-1] if v else 'all', size=size, pairs=pairs_for(cid), boxes=base + ([v] if v else [])) for v in (var or [None])])
POPS = []
for cid, c in CARDS.items():
    ns = card_nodes(cid); t0 = min(n['in']['t'] for n in ns); t1 = max((n.get('out') or {}).get('t', TOTAL) for n in ns)
    POPS.append(dict(id=('cta' if cid == 'endcol' else 'hook' if c['group'] == 'hook' else cid), cid=cid, kind=('cta' if cid == 'endcol' else 'rich' if c['group'] == 'hook' else c['kind']),
                     text=c['text'] + (' lexkite.com' if cid == 'endcol' else ''), t0=round(t0, 3), t1=round(t1, 3), url=c['extra'].get('url'), where='overlay', role='hook' if c['group'] == 'hook' else None))
REN = {p['cid']: p['id'] for p in POPS}
for f in T['frames']:
    for e in f['els']:
        if e[0].startswith('pop.') and e[0][4:] in REN: e[0] = 'pop.' + REN[e[0][4:]]
OV['pops'] = {REN[k]: v for k, v in OV['pops'].items()}
for x in IPA: x['pop'] = REN.get(x['pop'], x['pop'])
T['pops'] = [{k: v for k, v in p.items() if k != 'cid'} for p in POPS]; T['overlay'] = OV
hk = next(p for p in POPS if p['role'] == 'hook'); T['hook'] = dict(text=M['hook_text'], t0=hk['t0'], t1=hk['t1'])
T['spec'] = dict(T['spec'], pops=[dict(id=p['id'], kind=p['kind'], role=p['role']) for p in T['pops']])
if T.get('board'): T['board'] = dict(T['board'], where={p['id']: 'overlay' for p in T['pops']})
T['board_contrast'] = None   # no marker ink on the board: the cards are gated by overlay_contrast
T['motion'] = dict(fps=o.fps, nodes=len(NODES), layout=dict(top=[X0, Y0, X1, Y0 + max(_measure_top(c) for c in M['top'])], top_max_y=TOP_Y1, cap_top=cap_top))
json.dump(T, open(o.out + '.timeline.json', 'w'), default=lambda x: x.item() if hasattr(x, 'item') else str(x))
props = dict(fps=o.fps, w=W, h=H, durationInFrames=int(round(TOTAL * o.fps)), plate='plate.mp4', audio='plate.wav', plateBox=PLATE, bg='#10191B', tag=(o.tag or None) if not o.host_geom else None, nodes=NODES, total=TOTAL, format=o.format, safe=SAFE)
if EMBED:   # captions + chapters as WebVTT tracks (translatable, never burned in): one cue per spoken line, display forms ('blank' -> ___)
    D = SP.get('display', {}); vt = lambda x: f'{int(x // 3600):02d}:{int(x % 3600 // 60):02d}:{x % 60:06.3f}'
    cap = ['WEBVTT', '']
    for l in SP['lines']:
        if not l.get('text'): continue
        ws = [WORDS[f"{l['id']}.{k}"] for k in range(len(l['text'].split()))]
        txt = ' '.join(D.get(w['w'].rstrip('.,?!:;').lower(), w['w'].rstrip('.,?!:;')) + w['w'][len(w['w'].rstrip('.,?!:;')):] for w in ws)
        cap += [f"{vt(ws[0]['s'])} --> {vt(ws[-1]['e'] + 0.25)}", txt, '']
    open(o.out[:-5] + '.en.vtt', 'w').write('\n'.join(cap))
    ch = ['WEBVTT', '']; tops = sorted((n for n in NODES if n['type'] == 'card' and not n.get('parent') and n['box'][1] <= Y0 + 1), key=lambda n: n['in']['t'])
    for i, n in enumerate(tops):
        t1 = tops[i + 1]['in']['t'] if i + 1 < len(tops) else TOTAL; title = next((x.get('label') or x['text'] for x in NODES if x.get('parent') == n['id'] and x['type'] == 'chip'), n['id'])
        ch += [f"{vt(max(0, n['in']['t']))} --> {vt(t1)}", title, '']
    open(o.out[:-5] + '.chapters.vtt', 'w').write('\n'.join(ch))
    props['poster_t'] = round(next((n['in']['t'] + 0.8 for n in tops if n['id'] != 'hook'), 1.0), 3)
json.dump(props, open(o.out, 'w'), indent=0)
print(f'overlay: {len(NODES)} nodes, {len(CARDS)} cards, {len(CUES)} word cues, {len(IPA)} IPA -> {o.out}')
