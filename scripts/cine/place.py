# Overlay placer (exec'd inside lesson5.py after the overlay PNGs exist; uses its globals S, ev, BOX, ovs, SAFE, PUNCH, CDIR, FPS).
# Every card / chip / caption group is moved (vertical shift, horizontal clamp into SAFE) to the nearest position that keeps
#   >= CLEAR px from every tracked face (bank meta face_box x track, the same model qa5 checks) on every shot the group spans,
#   >= CLEAR px from every other overlay visible at the same time (global no-overlap), and, for the VHook, from character bodies
#   (head + torso model from the face box, plus the scene's AVOID rects).
# Groups move as one (all states / pages of a card keep one position). Order = priority: hook, chips, template cards, ring, recap, captions last
# (a caption whose default band is taken by a card switches to the nearest free band).
import glob as _g
CLEAR = int(globals().get('PLACE_CLEAR', 24)); _x0, _y0, _w0, _h0 = L.WM_CROP; _sc = 1080 / _w0
_FM = {}
def HEAD(b):   # face box -> head box (hair above, ears at the side, chin below) + 15 % margin; same model in qa5
    w, h = b[2] - b[0], b[3] - b[1]; return [b[0] - 0.30 * w, b[1] - 0.60 * h, b[2] + 0.30 * w, b[3] + 0.25 * h]
def _facemeta(clip):
    if clip not in _FM:
        out = []
        for p in sorted(_g.glob(CDIR(clip, 'meta') + '/*/mouth.json')):
            m = json.load(open(p))
            if m.get('track', {}).get('cc_mean', 1) > 0.6: out.append((m['face_box'], np.load(os.path.dirname(p) + '/track.npy')))
        _FM[clip] = out
    return _FM[clip]
def _rects(s, t, body=False):
    out = []; k = int((t - s['t0']) * FPS); step = 1 if s['frames'][-1] >= s['frames'][0] else -1
    for fb, MS in _facemeta(s['clip']):
        for fi in {s['frames'][min(max(k, 0), len(s['frames']) - 1)], s['frames'][0] + step * k}:   # real frame + qa5's linear estimate
            fi = int(np.clip(fi, 0, len(MS) - 1)); P = np.array([MS[fi] @ np.array([px, py, 1.0]) for px in (fb[0], fb[2]) for py in (fb[1], fb[3])])
            bx = [(P[:, 0].min() - _x0) * _sc, (P[:, 1].min() - _y0) * _sc, (P[:, 0].max() - _x0) * _sc, (P[:, 1].max() - _y0) * _sc]
            if s['id'] in PUNCH:
                u = min(1, max(0, (t - s['t0'] - PUNCH[s['id']]) / 0.4)); z = 1 + 0.08 * (1 - (1 - u) ** 2); bx = [540 + (bx[0] - 540) * z, 960 + (bx[1] - 960) * z, 540 + (bx[2] - 540) * z, 960 + (bx[3] - 960) * z]
            out.append(HEAD(bx))   # full head: face + hair + 15 % margin (owner 22/10: cards sat on hair)
            if body:   # torso widening below the chin
                w, h = bx[2] - bx[0], bx[3] - bx[1]; out.append([bx[0] - 0.5 * w, bx[3] - 0.1 * h, bx[2] + 0.5 * w, 1920])
    out += [list(a) for a in globals().get('HEADS', {}).get(s['clip'], [])]   # heads without a face track (OTS foreground back-of-head, news hosts): per-clip rects
    if body: out += [list(a) for a in globals().get('AVOID', {}).get(s['clip'], [])]
    return out
def _gkey(e):
    if e[0] in ('Cap', 'Sub', 'Karaoke'): return ('cap', e[5], e[4])
    if e[0] in ('Ring', 'Pov', 'Series'): return (e[0], e[4])   # ring = one card per shot; chips may sit differently on each shot (they jump only at a cut)
    return (e[0], e[3])
PRIO = ['VHook', 'Follow', 'Pov', 'Choice', 'Ladder', 'Strike', 'Gap', 'Card', 'Contrast', 'Ring', 'Recap', 'Hook', 'Tag', 'Badge', 'Series', 'Cap', 'Sub', 'Karaoke']
FIXED = ('Follow',)
_grp = {}
for k, e in enumerate(ev): _grp.setdefault(_gkey(e), []).append(k)
_order = sorted(_grp, key=lambda g: (PRIO.index(ev[_grp[g][0]][0]) if ev[_grp[g][0]][0] in PRIO else 99, ev[_grp[g][0]][1]))
OFF = {}; _placed = []   # (t0, t1, box)
def _hit(box, R, m=CLEAR):
    if not len(R): return 0.0
    R = np.asarray(R, float); ix = np.minimum(box[2] + m, R[:, 2]) - np.maximum(box[0] - m, R[:, 0]); iy = np.minimum(box[3] + m, R[:, 3]) - np.maximum(box[1] - m, R[:, 1])
    return float((np.clip(ix, 0, None) * np.clip(iy, 0, None)).sum())
def _place(g, ks, split_ok=True):
    st = ev[ks[0]][0]; boxes = {k: BOX[k]['box'] for k in ks}; face = {}
    for k in ks:   # faces (and bodies for the hook) under each member, sampled every 0.1 s
        a, b = ev[k][1], ev[k][2]; R = []
        for s in S:
            if s['t0'] < b - 0.02 and s['t0'] + s['dur'] > a + 0.02:
                for t in np.arange(max(a, s['t0']), min(b, s['t0'] + s['dur']), 0.1): R += _rects(s, t, body=(st == 'VHook'))
        face[k] = R
    others = {k: [p[2] for p in _placed if min(ev[k][2], p[1]) - max(ev[k][1], p[0]) > 0.01] for k in ks}
    ux0 = min(b[0] for b in boxes.values()); ux1 = max(b[2] for b in boxes.values()); uy0 = min(b[1] for b in boxes.values()); uy1 = max(b[3] for b in boxes.values())
    dx = int(np.ceil(SAFE['x0'] - ux0) if ux0 < SAFE['x0'] else (np.floor(SAFE['x1'] - ux1) if ux1 > SAFE['x1'] else 0))
    cost = lambda dy: sum(_hit([b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy], face[k]) + _hit([b[0] + dx, b[1] + dy, b[2] + dx, b[3] + dy], others[k]) for k, b in boxes.items())
    best = 0
    if st not in FIXED:
        lo, hi = int(SAFE['y0'] - uy0), int(SAFE['y1'] - uy1); cands = sorted(set(range(lo, hi + 1, 4)) | {max(lo, min(hi, 0))}, key=abs)
        best = next((dy for dy in cands if cost(dy) == 0), None)
        if best is None:
            shots = sorted({ev[k][4] for k in ks})
            if split_ok and len(shots) > 1:   # no single spot for the whole card -> one spot per shot (it moves only at a cut)
                print(f'place {st:7s} {str(ev[ks[0]][3])[:28]:28s} split per shot {shots}')
                for sh in shots: _place(g, [k for k in ks if ev[k][4] == sh], False)
                return
            best = min(cands, key=lambda dy: (cost(dy), abs(dy))); print(f'PLACE WARN {st} {str(g)[:50]} {shots}: no free position (overlap {cost(best):.0f} px2)')
    if best or dx: print(f'place {st:7s} {str(ev[ks[0]][3])[:28]:28s} dx {dx:+d} dy {best:+d}')
    for k in ks:
        b = boxes[k]; BOX[k]['box'] = [int(b[0] + dx), int(b[1] + best), int(b[2] + dx), int(b[3] + best)]; OFF[k] = (int(dx), int(best)); _placed.append((ev[k][1], ev[k][2], BOX[k]['box']))
for g in _order: _place(g, _grp[g])
