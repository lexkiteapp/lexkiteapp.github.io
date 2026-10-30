#!/usr/bin/env python3
"""QC of a Stitch motion short (docs/VIDEO-MOTION.md). Exit 1 on any failed gate.

  python3 scripts/video/motion/qc_motion.py --master M.mp4 --props P.json --plate PLATE.mp4 --hooks reviewed-hooks.json

1. The approved v9/v14 gates (qc_v9.py, incl. overlay_contrast / overlay_layout / overlay_ipa) run on a 24 fps proxy of the master with the
   builder's timeline (plate host + captions + the overlay cards as per-frame elements); the card fills are first re-measured on the
   composited master frames (overlay contract 'measured').
2. Motion gates on the 60 fps master:
   overlay_timing   every word-keyed element appears (alpha 0.5 / half drawn / state switch) within +-80 ms of its spoken word (plate word clock)
   overlay_sync_px  pixel proof: the element's box changes across its word and is unchanged just before it (nothing early)
   overlay_host     no card ever touches the head box or the moving-body mask of the clip(s) on screen (camera transform applied)
   overlay_still    no motion while text is read: transform == identity from settle to the next event, and the card pixels hold still
   file60           1080x1920, 60 fps, duration == plate, AAC audio; av_sync: master audio == plate audio (lag <= 10 ms)
Writes <master>.motion-qc.json, <master>.sheet.jpg (one tile per word cue, settled) and <master>.frames/ (every 2 s)."""
import os, sys, json, math, argparse, subprocess, shutil
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); import core as C

ap = argparse.ArgumentParser()
for a in ('master', 'props', 'plate', 'hooks'): ap.add_argument('--' + a, required=True)
o = ap.parse_args()
P = json.load(open(o.props)); NODES = P['nodes']; BY = {n['id']: n for n in NODES}; TL = json.load(open(o.props + '.timeline.json'))
PT = json.load(open(o.plate + '.timeline.json')); W_ = PT['words']; R = {}
FMT = P.get('format', 'short'); EMBED = FMT != 'short'; PB = P.get('plateBox') or dict(sx=0, sy=0, sw=1080, dx=0, dy=0, dw=1080, dh=1920); KP = PB['dw'] / PB['sw']
CW, CH = P.get('w', 1080), P.get('h', 1920)
inter = lambda a, b: a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]

def probe(v):
    return json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,codec_name,width,height,r_frame_rate,bit_rate', '-of', 'json', v], capture_output=True, text=True).stdout)
def grab(v, ts):   # BGR frames at times ts (exact frame = round(t * 60))
    out = {}
    for t in sorted(set(round(x, 4) for x in ts)):
        r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-ss', f'{max(0, t):.4f}', '-i', v, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-'], capture_output=True).stdout
        if len(r) == CW * CH * 3: out[t] = np.frombuffer(r, np.uint8).reshape(CH, CW, 3)
    return out
def crop(F, b, m=0):
    x0, y0, x1, y1 = [int(round(v)) for v in b]; return F[max(0, y0 + m):min(CH, y1 - m), max(0, x0 + m):min(CW, x1 - m)].astype(np.float32)

# ---------------- 1. measured card fills on the composited master ----------------
def first(f, lo, hi, step=1 / 600):
    t = lo
    while t <= hi:
        if f(t): return t
        t += step
    return None
def appear_t(n):   # the instant the element "appears": alpha 0.5, half drawn, or its state switch
    k = n['in']['k']
    if k == 'draw': return first(lambda t: C.pose(n, t)['p'] >= 0.5, n['in']['t'], n['in']['t'] + 1)
    return first(lambda t: C.pose(n, t)['a'] >= 0.5, n['in']['t'], n['in']['t'] + 1)
def settle(n): return n['in']['t'] + C.SETTLE[n['in']['k']]
cards = [n for n in NODES if n['type'] in ('card', 'pill')]
meas_t = {}
for n in cards:
    t0 = settle(n) + 0.05; t1 = (n.get('out') or {}).get('t', P['total']) - 0.05
    if t1 > t0: meas_t[n['id']] = round(min(t1, t0 + 0.3), 4)
FR = grab(o.master, list(meas_t.values()))
TXT = {}
for n in NODES:
    if n['type'] == 'text' and n.get('parent'): TXT.setdefault(n['parent'], []).extend(c for _, c in n['runs'])
hx = lambda h: [int(h[i:i + 2], 16) for i in (1, 3, 5)]
measured = []
for n in cards:
    t = meas_t.get(n['id'])
    if t is None or t not in FR: continue
    x0, y0, x1, y1 = n['box']; ledge = 12 if n['type'] == 'card' else 9
    pt = crop(FR[t], [x0 + 12, y1 - ledge - 26, x0 + 44, y1 - ledge - 10]).reshape(-1, 3).mean(0)   # bottom-left inner corner: always card fill, never text
    fg = [hx(c) for c in TXT.get(n['id'], [])] or ([hx(n['pal'][s]['ink']) for s in ('idle',)] if n['type'] == 'pill' else [])
    if fg: measured.append(dict(t=t, pop=n.get('card') or n['id'], fg=fg, bg=[int(round(v)) for v in pt[::-1]]))
for m in measured: m['pop'] = {'endcol': 'cta'}.get(m['pop'], m['pop'])   # card ids -> overlay pop ids (the builder renames the end column 'cta')
TL['overlay']['measured'] = measured

# ---------------- 2. qc_v9: pixel gates (continuity, cut, sharpness, loop, file) on the host plate re-encoded at the delivery bitrate, timeline
#      gates (hook, sizes, safe area, overlap, head, countdown, CTA, overlay_*) on the overlay geometry; embeds: overlay gates on their canvas ----------------
if EMBED:
    sys.path.insert(0, f'{ROOT}/scripts/video/tpl'); from overlay_gates import overlay_gates
    els = lambda f: [dict(zip(('name', 'text', 'x0', 'y0', 'x1', 'y1', 'alpha', 'px', 'group', 'digit', 'where', 'm'), e)) for e in f['els']]
    R.update({f'og.{k}': v for k, v in overlay_gates(TL, [(f['t'], els(f)) for f in TL['frames']], P['safe'], ROOT).items()})
    low = [(f['t'], e[0], m_) for f in TL['frames'] for e in f['els'] if e[6] >= 0.999 for m_ in e[11] if m_[1] < {'hook': 72, 'body': 56, 'card': 25}[m_[0]] - 0.05]
    R['min_text_px'] = dict(ok=not low, too_small=low[:4], note='same phone floors as the shorts: cap height hook >= 72, body >= 56, card lines >= 25')
    import re as _re
    vt = open(o.props[:-5] + '.en.vtt').read(); cues_ = _re.findall(r'(\d\d:\d\d:\d\d\.\d+) --> (\d\d:\d\d:\d\d\.\d+)\n(.+)', vt)
    sec = lambda x: int(x[:2]) * 3600 + int(x[3:5]) * 60 + float(x[6:])
    S_ = [l for l in TL['spec']['lines'] if l.get('text')] if TL['spec'].get('lines') else []
    D = TL.get('display') or {}; norm = lambda x: ' '.join(D.get(w.rstrip('.,?!:;').lower(), w.rstrip('.,?!:;')) + w[len(w.rstrip('.,?!:;')):] for w in x.split())
    vbad = [(a, t_, l['text']) for (a, b, t_), l in zip(cues_, S_) if t_ != norm(l['text']) or abs(sec(a) - W_[f"{l['id']}.0"]['s']) > 0.04]
    R['vtt_captions'] = dict(ok=len(cues_) == len(S_) and not vbad, cues=len(cues_), lines=len(S_), bad=vbad[:3], note='one cue per spoken line == script (display forms), starts on its first word (<= 40 ms); burned captions off')
    R['chapters'] = dict(ok=os.path.exists(o.props[:-5] + '.chapters.vtt') and open(o.props[:-5] + '.chapters.vtt').read().count('-->') >= 3)
    cta_txt = ' '.join(n.get('text', '') + ' '.join(r[0] for r in n.get('runs', [])) + ' '.join(n.get('lines', [])) for n in NODES).lower()
    R['embed_no_follow_cta'] = dict(ok=not any(w in cta_txt for w in ('follow', 'subscribe', 'lexkite.com', 'qr')) and not any(n.get('src') == 'qr.png' for n in NODES) and 'next step' in cta_txt,
                                    note='embedded lesson video: no follow / site CTA, no QR; the end card hands over to the next lesson step')
if not EMBED:
    px = o.master[:-4] + '.p24.mp4'
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.plate, '-c:v', 'libx264', '-preset', 'slow', '-b:v', '8800k', '-maxrate', '11880k', '-bufsize', '17600k',
                    '-pix_fmt', 'yuv420p', '-g', '48', '-c:a', 'copy', '-movflags', '+faststart', px], check=True)
    json.dump(TL, open(px + '.timeline.json', 'w'), default=str)
    for suf in ('.samples', '.src0.png'):
        s_, d_ = o.plate + suf, px + suf
        if os.path.isdir(s_): shutil.rmtree(d_, ignore_errors=True); shutil.copytree(s_, d_)
        elif os.path.exists(s_): shutil.copy(s_, d_)
    q = subprocess.run([sys.executable, f'{ROOT}/scripts/video/tpl/qc_v9.py', px, o.hooks], capture_output=True, text=True); print(q.stdout[-6000:], q.stderr[-2000:])
    QV = json.load(open(px + '.qc.json')) if os.path.exists(px + '.qc.json') else dict(gates={}, failed=['qc_v9 crashed'])
    R.update({f'v9.{k}': v for k, v in QV['gates'].items()})
    if not QV['gates']: R['v9.run'] = dict(ok=False, note='qc_v9 crashed', err=q.stderr[-800:])

# ---------------- 3. motion gates ----------------
cues = TL['overlay'].get('cues') or []; late = []; tok_bad = []; rows = []
for c in cues:
    n = BY[c['node']]; w = W_[c['w']]
    if w['w'] != c['tok']: tok_bad.append((c['node'], c['tok'], w['w']))
    ta = appear_t(n) if not n.get('st') or n['type'] not in ('pill', 'slot', 'dot') or c['node'].endswith('.chk') else None
    if n['type'] == 'slot': ta = next(x['t'] for x in n['st']) + C.MIX / 2
    if ta is None: ta = appear_t(n)
    d = ta - w['s']; rows.append(dict(node=c['node'], word=w['w'], at=round(w['s'], 3), appears=round(ta, 3), ms=round(1000 * d)))
    if abs(d) > 0.080: late.append(rows[-1])
R['overlay_timing'] = dict(ok=bool(cues) and not late and not tok_bad, cues=len(cues), max_ms=max((abs(r['ms']) for r in rows), default=None), off=late[:6], token_mismatch=tok_bad[:4],
                           note='appear instant (alpha 0.5 / half drawn / state mix midpoint) - spoken word start (plate word clock), |d| <= 80 ms')
ts = []
for r in rows: ts += [r['appears'] - 0.30, r['appears'] - 0.15, r['appears'] + 0.20]
FS = grab(o.master, ts); bad = []; early = []; okn = 0
cardin = sorted((n['in']['t'], n['id']) for n in NODES if n['type'] == 'card')
def handed(n):   # a card that takes over a slot right after another card left it (the outgoing fade sits in the 'before' window)
    return n['type'] == 'card' and any(0 < n['in']['t'] - (m.get('out') or {}).get('t', -9) < 0.5 for m in NODES if m['type'] == 'card' and m is not n and inter(m['box'], n['box']))
lum = lambda F, b: cv2.cvtColor(crop(F, b, 10).astype(np.uint8), cv2.COLOR_BGR2GRAY)
frac = lambda F, b: float(((lum(F, b) < 80) if not EMBED else (lum(F, b) > 150)).mean())   # short: dark card on the light board; embed: light text on the dark canvas
FSH = grab(o.master, [r['appears'] - 0.075 for r in rows if handed(BY[r['node']])])
_ts_h = [r['appears'] + d for r in rows if handed(BY[r['node']]) for d in (-0.075, 0.20)]
PLH = grab(o.plate, _ts_h) if not EMBED else {}   # short: the plate (same frame size, no overlay) at the same instants
DARKBG = bool(PLH) and float(np.median(cv2.cvtColor(next(iter(PLH.values())), cv2.COLOR_BGR2GRAY)[240:700])) < 110   # dark canvas (registry 2D set) – "dark pixels" can't tell a card from the canvas
if DARKBG: frac_at = lambda F, b, t: float((np.abs(crop(F, b, 10) - crop(PLH[round(t, 4)], b, 10)).max(2) > 8).mean()) if round(t, 4) in PLH else frac(F, b)   # overlay coverage = differs from the plate
else: frac_at = lambda F, b, t: frac(F, b)
for r in rows:
    n = BY[r['node']]; b = n['box']; a, b0, c_ = [FS.get(round(r['appears'] + d, 4)) for d in (-0.30, -0.15, 0.20)]
    if handed(n) and c_ is not None and FSH.get(round(r['appears'] - 0.075, 4)) is not None:   # the gap between the two cards: neither shown
        f0, f1 = frac_at(FSH[round(r['appears'] - 0.075, 4)], b, r['appears'] - 0.075), frac_at(c_, b, r['appears'] + 0.20)
        if f0 < 0.25 and f1 > max(0.4, f0 + 0.25): okn += 1
        else: early.append((r['node'], 'handover', round(f0, 2), round(f1, 2)))
        continue
    if a is None or b0 is None or c_ is None: bad.append((r['node'], 'no frame')); continue
    ch = float(np.abs(crop(c_, b, 4) - crop(b0, b, 4)).mean()); pre = float(np.abs(crop(b0, b, 4) - crop(a, b, 4)).mean())
    if ch < 4.0: bad.append((r['node'], round(ch, 2)))
    elif pre > max(2.5, ch * 0.25): early.append((r['node'], round(pre, 2), round(ch, 2)))
    else: okn += 1
R['overlay_sync_px'] = dict(ok=bool(rows) and not bad and not early, checked=len(rows), ok_n=okn, no_change=bad[:6], changed_early=early[:6],
                            note='mean |diff| inside the element box: after-vs-just-before its word >= 4, and the 0.15 s before it holds still')
HM = {c: v for c, v in (PT.get('host_move') or {}).items()}; HD = PT['head']; hits = []; nchk = 0
mask = {}
for c, rws in HM.items():
    m_ = np.zeros((1920, 1080), bool)
    for y, x0, x1 in rws: m_[y:y + 8, x0:x1] = True
    mask[c] = m_
for f in TL['frames']:
    Mx = f['M']; s, tx, ty = Mx[0], Mx[2], Mx[5]; srcs = [c for c, k, w in f['src'] if w > 0.02]
    for e in f['els']:
        if e[10] != 'overlay' or e[6] <= 0.004: continue
        cb = e[2:6]; bx = [(cb[0] - PB['dx']) / KP + PB['sx'], (cb[1] - PB['dy']) / KP + PB['sy'], (cb[2] - PB['dx']) / KP + PB['sx'], (cb[3] - PB['dy']) / KP + PB['sy']]   # canvas -> plate screen
        if EMBED and inter(cb, [PB['dx'], PB['dy'], PB['dx'] + PB['dw'], PB['dy'] + PB['dh']]) and FMT == 'wide': hits.append((f['t'], e[0], 'window', 'teacher window')); continue
        sb = [int((bx[0] - tx) / s), int((bx[1] - ty) / s), int(math.ceil((bx[2] - tx) / s)), int(math.ceil((bx[3] - ty) / s))]
        for c in srcs:
            nchk += 1; hb = HD[c]
            if inter(bx, [s * hb[0] + tx, s * hb[1] + ty, s * hb[2] + tx, s * hb[3] + ty]): hits.append((f['t'], e[0], c, 'head'))
            elif c in mask and mask[c][max(0, sb[1]):max(0, sb[3]), max(0, sb[0]):max(0, sb[2])].any(): hits.append((f['t'], e[0], c, 'body'))
R['overlay_host'] = dict(ok=nchk > 0 and not hits, checks=nchk, hits=hits[:6], n_hits=len(hits), note='overlay boxes vs head box + measured moving-body mask of the clip(s) on screen, every plate frame')
mv = []; pxm = []; tsel = {}
ANIM = ('ring', 'xp', 'num', 'bar', 'dot', 'slot', 'check', 'strike')
for n in NODES:
    ev = sorted([x['t'] for x in n.get('st') or []] + [(n.get('out') or {}).get('t', P['total'])])
    a_ = settle(n); b_ = min([e for e in ev if e > a_] or [P['total']])
    for t in np.arange(a_, b_, 1 / 60):
        p = C.pose(n, float(t))
        if abs(p['s'] - 1) > 0.002 or abs(p['dy']) > 0.25: mv.append((n['id'], round(float(t), 3), p)); break
    if n['type'] in ('card', 'pill') and b_ - a_ > 0.9: tsel[n['id']] = (round(a_ + 0.1, 4), round(b_ - 0.15, 4))
FS2 = grab(o.master, [t for ab in tsel.values() for t in ab])
for nid, (a_, b_) in tsel.items():
    n = BY[nid]; A, B = FS2.get(a_), FS2.get(b_)
    if A is None or B is None: continue
    sub = [x for x in NODES if x.get('parent') == nid and x['type'] in ANIM]   # value / state widgets inside the card may change (countdown, +XP, band); their boxes are excluded
    mA = crop(A, n['box'], 6); mB = crop(B, n['box'], 6); keep = np.ones(mA.shape[:2], bool)
    for x in sub:
        xb = [x['box'][0] - n['box'][0] - 6 - 12, x['box'][1] - n['box'][1] - 6 - 12, x['box'][2] - n['box'][0] - 6 + 12, x['box'][3] - n['box'][1] - 6 + 12]
        keep[max(0, int(xb[1])):max(0, int(xb[3])), max(0, int(xb[0])):max(0, int(xb[2]))] = False
    for x in NODES:   # later children (an example line, a tile, a check) appear inside the card by design – exclude their boxes too
        if x.get('parent') == nid and x['in']['t'] > a_:
            xb = [x['box'][0] - n['box'][0] - 6 - 12, x['box'][1] - n['box'][1] - 6 - 50, x['box'][2] - n['box'][0] - 6 + 12, x['box'][3] - n['box'][1] - 6 + 12]
            keep[max(0, int(xb[1])):max(0, int(xb[3])), max(0, int(xb[0])):max(0, int(xb[2]))] = False
    d = float(np.abs(mA - mB)[keep].mean()) if keep.any() else 0.0
    if d > 2.0: pxm.append((nid, a_, b_, round(d, 2)))
R['overlay_still'] = dict(ok=not mv and not pxm, moving=mv[:4], pixels_moved=pxm[:4], checked=len(tsel), note='transform identity from settle to the next event (core) + card pixels hold still (|diff| <= 2, animated widgets excluded)')
BANK = {x['id']: x for x in json.load(open(f'{ROOT}/brand/library/cine/teachers/bank.json'))['clips']}
sys.path.insert(0, f'{ROOT}/scripts'); from teach.registry import sources as _reg_src   # ONE character set (docs/CHARACTERS.md): registry 2D clips are their own family
REG_SRC = _reg_src()
style = lambda c: 'registry2d' if c in REG_SRC else (None if c not in BANK else ('3d' if '3d' in (BANK[c].get('tags') or []) else '2d'))
used = sorted({c for f in PT['frames'] for c, k, w in f['src'] if w > 0.02}); par = PT.get('host_parent') or {}
styles = {c: style(par.get(c, c)) for c in used}
R['host_one_style'] = dict(ok=bool(used) and None not in styles.values() and len(set(styles.values())) == 1, styles=styles,
                           note='owner 28/10: one video = ONE host bank/style (all 3D or all 2D, never mixed); every clip on screen traced to its bank family')
pm, pp = probe(o.master), probe(o.plate); vm = [s for s in pm['streams'] if s['codec_type'] == 'video'][0]; am = [s for s in pm['streams'] if s['codec_type'] == 'audio']
dm, dp = float(pm['format']['duration']), float(pp['format']['duration'])
mbs = int(pm['format']['size']) / 1e6 / dm
R['file'] = dict(ok=(vm['width'], vm['height']) == (CW, CH) and vm['r_frame_rate'] == ('60/1' if not EMBED else '30/1') and abs(dm - dp) <= 0.06 and bool(am) and am[0]['codec_name'] == 'aac'
                 and (not EMBED or (mbs <= 0.30 and os.path.exists(o.master[:-4] + '.poster.jpg'))), format=FMT, mb_per_s=round(mbs, 3),
                   fps=vm['r_frame_rate'], duration=round(dm, 3), plate=round(dp, 3), mbps=round(int(pm['format']['size']) * 8 / dm / 1e6, 2), audio=am[0]['codec_name'] if am else None)
def env(v):
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', v, '-t', '12', '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], capture_output=True).stdout
    a = np.abs(np.frombuffer(r, np.int16).astype(np.float32)); return a[:len(a) // 8 * 8].reshape(-1, 8).mean(1)   # 1 ms envelope
ea, eb = env(o.master), env(o.plate); n_ = min(len(ea), len(eb)); ea, eb = ea[:n_] - ea[:n_].mean(), eb[:n_] - eb[:n_].mean()
lags = range(-40, 41); cc = [float(np.dot(ea[max(0, l):n_ + min(0, l)], eb[max(0, -l):n_ - max(0, l)])) for l in lags]; lag = list(lags)[int(np.argmax(cc))]
R['av_sync'] = dict(ok=abs(lag) <= 10, lag_ms=lag, note='master audio vs plate audio (the word clock): cross-correlation of the 1 ms envelope over 12 s')

# ---------------- 4. contact sheet (settled frame per cue) + frames every 2 s ----------------
sel = sorted({round(min(P['total'] - 0.5, r['appears'] + 0.6), 3) for r in rows} | {0.6, round(P['total'] - 1.0, 3)})
FS3 = grab(o.master, sel); tiles = []
for t in sel:
    if t not in FS3: continue
    im = cv2.resize(FS3[t], (270, round(270 * CH / CW)), interpolation=cv2.INTER_AREA); cv2.rectangle(im, (0, 0), (92, 26), (16, 25, 27), -1)
    cv2.putText(im, f'{t:5.2f}s', (4, 19), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (243, 248, 248), 1, cv2.LINE_AA); tiles.append(im)
tiles = [cv2.resize(x, (270, round(270 * CH / CW))) for x in tiles]; cols = 6; rows_ = [tiles[i:i + cols] for i in range(0, len(tiles), cols)]
rows_ = [np.hstack(r + [np.zeros_like(tiles[0])] * (cols - len(r))) for r in rows_]
cv2.imwrite(o.master[:-4] + '.sheet.jpg', np.vstack(rows_), [cv2.IMWRITE_JPEG_QUALITY, 82])
fd = o.master[:-4] + '.frames'; os.makedirs(fd, exist_ok=True)
for t, F in grab(o.master, list(np.arange(0.5, P['total'], 2.0))).items(): cv2.imwrite(f'{fd}/t{t:05.2f}.jpg', F, [cv2.IMWRITE_JPEG_QUALITY, 88])
fails = [k for k, r in R.items() if not r['ok']]
json.dump(dict(master=o.master, ok=not fails, failed=fails, n=len(R), gates=R, cues=rows), open(o.master + '.motion-qc.json', 'w'), indent=1, default=str)
for k, r in R.items(): print(('PASS ' if r['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in r.items() if a not in ('ok', 'note')}, ensure_ascii=False, default=str)[:300])
print(f"{o.master}: {'OK' if not fails else 'FAILED ' + ','.join(fails)} ({len(R) - len(fails)}/{len(R)} gates)")
sys.exit(1 if fails else 0)
