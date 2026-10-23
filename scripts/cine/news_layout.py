# news_layout.py - exec'd inside news.py right before the frame loop (owner 23/10: overlays never cover face, hair or hands).
# Per-frame keep-out map from the host layers themselves (1x PRO matte + colour, the exact source frames each shot plays):
#   head = matte extent from the hair top down to the chin (+ neck), hands = skin blobs inside the matte below the clip's hand line.
# Mapped through each shot's host transform (scale, anchor, punch-in) to screen space. Then every overlay is placed by a solver:
#   top chrome (hook card, series tag, follow chip) keeps its line if it is clear, cards go to the card zone right under the chin,
#   the caption goes right under the card (never on top of it), all clear of the keep-out boxes on EVERY frame they are visible
#   (head gap 24 px, hands 14 px, overlay-overlay 16 px). Nothing fits -> shrink to >= 80 %, else the build fails (no silent overlap).
GEO_D = f'{N}/geom'; os.makedirs(GEO_D, exist_ok=True); GEOM = {}
def clip_geom(clip, gk):
    if clip in GEOM: return GEOM[clip]
    p_ = f'{GEO_D}/{clip}.json'
    if os.path.exists(p_): GEOM[clip] = json.load(open(p_)); return GEOM[clip]
    cf, cm, ll = MR.layer_paths(G, clip); ex_, ey_ = HOST[gk]['eye']; chin = int(ey_ + CHIN[gk] + 12)
    ht = HTOP.get(clip); hy = int((ht - 30) if ht else chin + 0.4 * FACEH[gk])
    cc, mc = cv2.VideoCapture(cf), cv2.VideoCapture(cm); out = []
    while True:
        ok1, F = cc.read(); ok2, M = mc.read()
        if not (ok1 and ok2): break
        F = cv2.resize(F, (1080, 1920)); a = cv2.resize(M[..., 0] if M.ndim == 3 else M, (1080, 1920)) > 128
        rows = np.where(a[:chin, 200:900].any(1))[0]; top = int(rows[0]) if len(rows) else ey_ - TOPH[gk]
        cols = np.where(a[top:chin].any(0))[0]; head = [int(cols[0]), top, int(cols[-1]), chin] if len(cols) else [ex_ - 200, top, ex_ + 200, chin]
        q = cv2.resize(F, (270, 480), interpolation=cv2.INTER_AREA); aq = cv2.resize(a.astype(np.uint8), (270, 480)) > 0
        hv = cv2.cvtColor(q, cv2.COLOR_BGR2HSV); sk = (hv[..., 0] <= 25) & (hv[..., 1] >= 60) & (hv[..., 2] >= 45) & aq
        if gk == 'ama_s': sk &= hv[..., 2] <= 190
        sk[:max(0, hy // 4)] = False; n_, _, st_, _ = cv2.connectedComponentsWithStats(sk.astype(np.uint8))
        hands = [[int(st_[c][0] * 4), int(st_[c][1] * 4), int((st_[c][0] + st_[c][2]) * 4), int((st_[c][1] + st_[c][3]) * 4)] for c in range(1, n_) if st_[c][4] >= 30]
        out.append(dict(head=head, hands=hands))
    GEOM[clip] = out; json.dump(out, open(p_, 'w')); return out
def _scr(r, xf, pz):
    sc, cx, cy, ox, oy = xf[:5]; X = lambda x: 540 + ((x - cx) * sc + ox - 540) * pz; Y = lambda y: 960 + ((y - cy) * sc + oy - 960) * pz
    return [X(r[0]), Y(r[1]), X(r[2]), Y(r[3])]
KEEP = {}   # output frame -> {'head': [...], 'hands': [...]} screen rects
TRK = {}
for s in S:
    for c_, w_ in [(s['clip'], s['who'])] + ([(s['other'], 'carlos' if s['who'] == 'ama' else 'ama')] if s['other'] else []):
        mp_ = f'{TL}/meta/{c_}/{w_}'
        if c_ not in TRK: TRK[c_] = (json.load(open(f'{mp_}/mouth.json'))['face_box'], np.load(f'{mp_}/track.npy')) if os.path.exists(f'{mp_}/track.npy') else (None, None)
for s in S:
    HS_ = [(s['clip'], s['who'], 'two' if s['other'] else s['frame'])] + ([(s['other'], 'carlos' if s['who'] == 'ama' else 'ama', 'two')] if s['other'] else [])
    f0 = int(round(s['t0'] * FPS))
    for clip, who, frame in HS_:
        gk = GK(clip, who); xf = place(s['id'], gk, frame, None); g = clip_geom(clip, gk)
        for j in range(s['n']):
            i = s['frames'][j] if j < len(s['frames']) else s['frames'][-1]; gi = g[min(i, len(g) - 1)]; pz = PZ(s, j)
            k_ = KEEP.setdefault(f0 + j, dict(head=[], hands=[])); k_['head'].append(_scr(gi['head'], xf, pz))
            if TRK.get(clip) is not None and TRK[clip][1] is not None:   # + the tracked face box qa_news checks (mouth track affine per source frame)
                fb_, M_ = TRK[clip]; Mi = M_[min(i, len(M_) - 1)]; P_ = np.array([Mi @ np.array([px_, py_, 1]) for px_ in (fb_[0], fb_[2]) for py_ in (fb_[1], fb_[3])])
                k_['head'].append(_scr([P_[:, 0].min(), P_[:, 1].min(), P_[:, 0].max(), P_[:, 1].max()], xf, pz))
            for dj in (-2, 0, 2):   # hands move: keep-out = this frame +- 2 source frames
                gh = g[min(max(0, (s['frames'][min(max(0, j + dj), len(s['frames']) - 1)])), len(g) - 1)]['hands']
                k_['hands'] += [_scr(h_, xf, pz) for h_ in gh]
json.dump({str(k): v for k, v in KEEP.items()}, open(f'{RD}/keepout.json', 'w'))
CARDS = ('Card', 'Recap', 'Ring', 'Share'); CHROME = ('VHook', 'Series', 'Follow', 'Badge')
for o in [o_ for o_ in OV if o_['style'] != 'Cap']:   # frame-exact card times (a 3-decimal end like 1.667 showed the hook card on the first frame of the next shot); captions keep their word-sync times
    k0_, k1_ = int(np.ceil(o['t'][0] * FPS - 1e-3)), int(round(o['t'][1] * FPS))   # start never earlier (caption sync), end on the nearest cut
    o['t'] = [0.0 if k0_ <= 0 else round(k0_ / FPS - 0.0004, 4), round(max(k0_ + 1, k1_) / FPS - 0.0004, 4)]
def _frames(t):   # the frames the renderer shows it on: t0 - 1e-6 <= fi / FPS < t1 - 1e-6
    return [fi for fi in range(int(t[0] * FPS) - 1, int(t[1] * FPS) + 2) if t[0] - 1e-6 <= fi / FPS < t[1] - 1e-6]
def _keep_rects(t):
    R = []
    for fi_ in _frames(t):
        k_ = KEEP.get(fi_)
        if k_: R += [r[:2] + r[2:] + [24] for r in k_['head']] + [r + [14] for r in k_['hands']]
    return np.array(R, np.float32).reshape(-1, 5)
PLACED = []   # (t, box, group)
def _solve(items, kind, resv=0):
    """items: overlays shown together (same box); returns (dy, scale) or None. resv: caption room reserved under a card."""
    t = [min(o['t'][0] for o in items), max(o['t'][1] for o in items)]; b = items[0]['box']; R = _keep_rects(t)
    for o2, b2, g2 in PLACED:
        if min(t[1], o2[1]) - max(t[0], o2[0]) > 1e-3 and g2 is not items: R = np.vstack([R, np.array([b2 + [26]], np.float32)])   # qa: >= 24 px between elements
    for scl in ((1.0,) if kind == 'cap' else (1.0, 0.92, 0.85, 0.8)):   # captions keep >= 60 px (never shrunk)
        w_, h_ = (b[2] - b[0]) * scl, (b[3] - b[1]) * scl; cx_ = (b[0] + b[2]) / 2; x0_, x1_ = cx_ - w_ / 2, cx_ + w_ / 2
        if kind == 'card' and resv: x0_, x1_ = min(x0_, CX0), max(x1_, CX0 + CW); h_ = h_ + resv   # keep the caption zone under the card free of the body too
        Rx = R[(R[:, 0] - R[:, 4] < x1_) & (R[:, 2] + R[:, 4] > x0_)]
        Y = np.arange(SAFE['y0'], SAFE['y1'] - h_ + 1, 4, dtype=np.float32)
        ok = np.ones(len(Y), bool) if not len(Rx) else ~(((Rx[None, :, 1] - Rx[None, :, 4]) < (Y[:, None] + h_)) & ((Rx[None, :, 3] + Rx[None, :, 4]) > Y[:, None])).any(1)
        if not ok.any(): continue
        if kind == 'chrome': pref = b[1]; cost = np.abs(Y - pref)
        else:   # card zone: right under the chin; caption: right under the card that is up (or the chin)
            hb = [r[3] + 24 for fi_ in _frames(t) for r in KEEP.get(fi_, {}).get('head', [])]; pref = max(hb) if hb else CARD_Y
            if kind == 'cap':
                cb = [b2[3] + 16 for o2, b2, g2 in PLACED if g2 != 'chrome' and min(t[1], o2[1]) - max(t[0], o2[0]) > 1e-3 and b2[1] >= pref - 4]
                pref = max(cb) if cb else pref
            cost = np.where(Y >= pref - 1e-3, Y - pref, (pref - Y) * 3 + 400)
        cost = np.where(ok, cost, np.inf); y = float(Y[int(np.argmin(cost))])
        if os.environ.get('NEWS_LAYOUTDEBUG') and items[0]['style'] == os.environ['NEWS_LAYOUTDEBUG']: print('DEBUG', b, t, h_, Rx[:8].tolist(), Y[ok][:5], y)
        h0_ = (b[3] - b[1]) * scl if kind == 'card' and resv else h_
        return y - b[1] - (b[3] - b[1] - h0_) / 2, scl
    return None
def _xform(im, b, dy, scl):
    if im is None: return None
    if scl == 1.0:
        out = layer(); out.paste(im, (0, int(round(dy))))
    else:
        cx_, cy_ = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2; pad_ = 30; cr = im.crop((int(b[0]) - pad_, int(b[1]) - pad_, int(b[2]) + pad_, int(b[3]) + pad_))
        cr = cr.resize((int(cr.width * scl), int(cr.height * scl)), Image.LANCZOS); out = layer(); out.paste(cr, (int(cx_ - cr.width / 2), int(cy_ + dy - cr.height / 2)))
    out.info['meta'] = im.info.get('meta'); return out
def _mx(r, b, dy, scl):
    cx_, cy_ = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2; return [int(round(cx_ + (r[0] - cx_) * scl)), int(round(cy_ + (r[1] - cy_) * scl + dy)), int(round(cx_ + (r[2] - cx_) * scl)), int(round(cy_ + (r[3] - cy_) * scl + dy))]
def _apply(items, dy, scl):
    b = list(items[0]['box'])
    for o in items:
        img0 = o['_img']
        if callable(img0): o['_img'] = (lambda f_, b_=b, d_=dy, s_=scl: (lambda t: _xform(f_(t), b_, d_, s_)))(img0)
        else: o['_img'] = _xform(img0, b, dy, scl)
        o['box'] = _mx(o['box'], b, dy, scl)
        if o.get('meta'): m_ = o['meta']; o['meta'] = dict(m_, inner=_mx(m_['inner'], b, dy, scl), tb=[_mx(r, b, dy, scl) for r in m_['tb']], scale=scl)
        if scl != 1.0 and o.get('fs'): o['fs'] = int(o['fs'] * scl)
LAYOUT_LOG = []
_groups = []
for o in OV:
    if o['style'] == 'Cap':
        key = ('cap', o['shot'], o['line'], o['chunk'][0])
        if _groups and _groups[-1][0] == key: _groups[-1][1].append(o); continue
        _groups.append((key, [o]))
    else: _groups.append((('ov', id(o)), [o]))
_rank = lambda g: (0 if g[1][0]['style'] in CHROME else 1 if g[1][0]['style'] in CARDS else 2, g[1][0]['t'][0])
for key, items in sorted(_groups, key=_rank):
    st_ = items[0]['style']; kind = 'chrome' if st_ in CHROME else 'card' if st_ in CARDS else 'cap'
    capH = max([c['box'][3] - c['box'][1] for c in OV if c['style'] == 'Cap' and min(c['t'][1], items[-1]['t'][1]) - max(c['t'][0], items[0]['t'][0]) > 1e-3] or [0])
    r_ = (_solve(items, kind, capH + 26) if kind == 'card' and capH else None) or _solve(items, kind)
    if r_ is None: raise SystemExit(f'LAYOUT FAIL: no clear place for {st_} "{items[0]["text"][:40]}" at {items[0]["t"]} (face/hair/hands/overlays) - shorten the copy or change the framing')
    dy, scl = r_
    if abs(dy) > 0.5 or scl != 1.0: _apply(items, dy, scl)
    LAYOUT_LOG.append([st_, items[0]['text'][:30], items[0]['box'], round(dy), scl])
    PLACED.append(([min(o['t'][0] for o in items), max(o['t'][1] for o in items)], list(items[0]['box']), 'chrome' if kind == 'chrome' else items))
print('layout:', len(LAYOUT_LOG), 'groups placed;', sum(1 for x in LAYOUT_LOG if x[3] or x[4] != 1.0), 'moved')
QA['layout'] = LAYOUT_LOG
