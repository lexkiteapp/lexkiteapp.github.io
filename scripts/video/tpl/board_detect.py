#!/usr/bin/env python3
"""Detect the whiteboard of every classroom talk clip ONCE and store it in brand/library/cine/teachers/bank.json (clips[*].board).
  python3 scripts/video/tpl/board_detect.py --foot <lexkite-footage> [--clips a,b] [--debug DIR]
Works on the renderer's normalised frame (1080x1916 -> uniform 1920 scale, 1 px side crop). Per clip:
  quad   board corners TL,TR,BR,BL (screen px; lines fitted to the visible board edges, may lie outside the frame) -> text perspective
  zone_free  the same rectangle inside SAFE at scale 1 (board captions + pops; render_v9 anchors the camera on the captions and trims it)
  zone   largest rectangle [x0,y0,x1,y1] that is board-white in EVERY frame (head / hands never pass), >= 14 px inside the board edge and the
         head mask, inside the platform safe area at every camera scale 1..smax about the camera anchor -> where board text is written
  cap    caption placement in the calm lower area: centre (cx, cy), column width, measured overlap with the body (px) and the camera anchor
  body   moving-body envelope (any frame) + filled silhouette rows as run-lengths per 8 px row [y, [[x0, x1], ...]] -> qc_v9 caption_clear
Pure measurement (0 credits); re-run only when a clip changes."""
import os, sys, json, argparse
import numpy as np, cv2
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, HERE); from tokens import SAFE
ap = argparse.ArgumentParser(); ap.add_argument('--foot', required=True); ap.add_argument('--clips', default=''); ap.add_argument('--debug', default='')
ap.add_argument('--bank', default=f'{ROOT}/brand/library/cine/teachers/bank.json'); ap.add_argument('--teachers', default=f'{ROOT}/content/video/cine/teachers.json')
ap.add_argument('--cap_h', type=int, default=104, help='caption ink height incl. the active-word bounce (render_v9 classroom captions)')
o = ap.parse_args()
W, H = 1080, 1920
B = json.load(open(o.bank)); TR = json.load(open(o.teachers))
def norm(F):
    if F.shape[0] == H: return F
    r = cv2.resize(F, (round(W * H / F.shape[0]), H), interpolation=cv2.INTER_LANCZOS4); x0 = (r.shape[1] - W) // 2; return r[:, x0:x0 + W]
def frames(c):
    st = TR['sets'][TR['clips'][c]['set']]; cap = cv2.VideoCapture(f"{o.foot}/{st['lib']}/{st['path']}/{c}.mp4"); out = []
    while True:
        ok, f = cap.read()
        if not ok: break
        out.append(f)
    lo, hi = TR['clips'][c]['usable']; return [norm(f) for f in out[lo:hi + 1]]
def white(f):
    f = f.astype(np.int16); mn = f.min(2); return (mn > 188) & (f.max(2) - mn < 42)
def fit(pts, vertical=False, it=400, thr=3.0):   # RANSAC line y = a x + b (or x = a y + b)
    P = np.array(pts, np.float64)
    if vertical: P = P[:, ::-1]
    rng = np.random.default_rng(7); best = None
    for _ in range(it):
        i, j = rng.choice(len(P), 2, replace=False)
        if abs(P[j, 0] - P[i, 0]) < 20: continue
        a = (P[j, 1] - P[i, 1]) / (P[j, 0] - P[i, 0])
        if abs(a) > 0.15: continue
        b = P[i, 1] - a * P[i, 0]; inl = np.abs(P[:, 1] - (a * P[:, 0] + b)) < thr
        if best is None or inl.sum() > best[0]: best = (inl.sum(), inl)
    q = P[best[1]]; a, b = np.polyfit(q[:, 0], q[:, 1], 1); return float(a), float(b), int(best[0])
def inter(l1, l2):   # l1: y = a1 x + b1 (horizontal-ish); l2: x = a2 y + b2 (vertical-ish)
    a1, b1 = l1[:2]; a2, b2 = l2[:2]; y = (a1 * b2 + b1) / (1 - a1 * a2); return [round(a2 * y + b2, 1), round(y, 1)]
def max_rect(ok, score):
    h, w = ok.shape; hist = np.zeros(w, np.int32); best = (0, None)
    for y in range(h):
        hist = np.where(ok[y], hist + 1, 0); st = []
        for x in range(w + 1):
            cur = hist[x] if x < w else 0; start = x
            while st and st[-1][1] >= cur:
                sx, sh = st.pop(); s = score(x - sx, sh)
                if s > best[0]: best = (s, (sx, y - sh + 1, x, y + 1))
                start = sx
            st.append((start, cur))
    return best[1]
def rle(m, step=8):   # 'y:x0-x1,x0-x1;...' per 8 px row (compact; qc_v9 caption_clear decodes it)
    rows = []
    for y in range(0, H, step):
        r = m[y:y + step].any(0); d = np.diff(np.r_[0, r.astype(np.int8), 0]); s = np.nonzero(d == 1)[0]; e = np.nonzero(d == -1)[0]
        if len(s): rows.append(f'{y}:' + ','.join(f'{a}-{b}' for a, b in zip(s, e)))
    return dict(step=step, rows=';'.join(rows))
sel = [c for c in (o.clips.split(',') if o.clips else [c['id'] for c in B['clips']]) if c]
for cl in B['clips']:
    c = cl['id']
    if c not in sel or c not in TR['clips']: continue
    tc = TR['clips'][c]; st = TR['sets'][tc['set']]; smax = st['smax']; standing = tc['set'] == 'classroom_board'
    fr = frames(c); n = len(fr); print(c, n, 'frames', flush=True)
    vis = np.ones((H, W), bool); sub = fr[::max(1, n // 40)]
    for f in fr[::2]: vis &= white(f)
    med = np.median(np.stack(sub), 0).astype(np.int16); mv = np.zeros((H, W), np.float32)
    for f in fr[::2]: mv += (np.abs(f.astype(np.int16) - med).max(2) > 40)
    busy = mv / len(fr[::2]) > 0.01
    if cl.get('body_ignore'): ix0, iy0, ix1, iy1 = cl['body_ignore']; busy[iy0:iy1, ix0:ix1] = False   # bank.json: a static-but-morphing prop (3D clip: the person-shadow on the board) is not the body
    hd = tc['head']; hy = [round(v * H / 1916) if i % 2 else v for i, v in enumerate(hd)]
    busy[max(0, hy[1]):hy[3], max(0, hy[0]):hy[2]] = True
    busy = cv2.morphologyEx(busy.astype(np.uint8), cv2.MORPH_OPEN, np.ones((5, 5), np.uint8)) > 0
    sil = busy.copy()   # fill each row between busy runs that are < 420 px apart (static trousers / torso inside a moving outline)
    for y in range(H):
        xs = np.nonzero(busy[y])[0]
        if len(xs) < 2: continue
        g = np.nonzero(np.diff(xs) > 1)[0]
        for k in g:
            if xs[k + 1] - xs[k] < 420: sil[y, xs[k]:xs[k + 1]] = True
    body = cv2.dilate(sil.astype(np.uint8), np.ones((9, 9), np.uint8)) > 0
    # ---- board quad from the frame-0 white component
    w0 = cv2.morphologyEx(white(fr[0]).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    k_, lab, stt, _ = cv2.connectedComponentsWithStats(w0); big = 1 + int(np.argmax(stt[1:, cv2.CC_STAT_AREA])); comp = lab == big
    cols = [x for x in range(W) if comp[:, x].any()]; rows = [y for y in range(H) if comp[y].any()]
    top = fit([(x, int(np.argmax(comp[:, x]))) for x in cols]); bot = fit([(x, H - 1 - int(np.argmax(comp[::-1, x]))) for x in cols])
    lef = fit([(int(np.argmax(comp[y])), y) for y in rows], vertical=True)
    rx = [(W - 1 - int(np.argmax(comp[y, ::-1])), y) for y in rows]
    rig = fit(rx, vertical=True) if np.mean([x < W - 4 for x, _ in rx]) > 0.5 else (0.0, float(W + 40), 0)
    quad = [inter(top, lef), inter(top, rig), inter(bot, rig), inter(bot, lef)]
    # ---- camera anchor = caption centre (captions are screen-space: whatever sits next to them does not move into them on a push)
    def span(y0, y1):
        band = body[y0:y1].any(0); xs = np.r_[True, band[SAFE['x0']:SAFE['x1']], True]; best = (0, 0, 0)
        d = np.diff(xs.astype(np.int8)); s_ = np.nonzero(d == -1)[0]; e_ = np.nonzero(d == 1)[0]
        for a, b in zip(s_, e_):
            if b - a > best[0]: best = (int(b - a), int(SAFE['x0'] + a), int(SAFE['x0'] + b))
        return best
    hc = o.cap_h; y1c = SAFE['y1'] - 3; y0c = y1c - hc; best = span(y0c, y1c); lines = 1
    if best[0] < 600:   # no wide calm span: a narrow calm column (standing teacher beside the board) takes 2-line pages
        b2 = span(y1c - 2 * hc + 10, y1c)
        if b2[0] >= 600: best, lines, y0c = b2, 2, y1c - 2 * hc + 10
    if best[0] >= 340 and lines == 1 and best[0] < 600:   # narrow calm floor beside a standing teacher: 480 px column from the calm side
        capw = max(640, best[0] - 24); left = best[1] - SAFE['x0'] < SAFE['x1'] - best[2]   # >= 640: two 72 px words per page (CapCut 2-3 words)
        cx = int(SAFE['x0'] + 4 + capw // 2) if left else int(SAFE['x1'] - 4 - capw // 2)
    elif best[0] >= 340 and (lines == 2 or best[0] >= 600):   # centre the captions on the calm desk / floor span
        capw = int(min(768, best[0] - 24)); cx = round((best[1] + best[2]) / 2); cx = int(round(min(max(cx, SAFE["x0"] + capw / 2 + 4), SAFE["x1"] - capw / 2 - 4)))
    else: capw = 2 * (SAFE['x1'] - 540); cx = 540
    cy = round((y0c + y1c) / 2); x0c, x1c = round(cx - capw / 2), round(cx + capw / 2)
    ov = body[y0c:y1c, max(0, x0c):x1c]; ov_rows = int(ov.any(1).sum()); ov_px = int(ov.sum())
    AX, AY = cx, cy
    # ---- text zone: board-white in every frame, away from edges/head, inside SAFE at every scale 1..smax about (AX, AY)
    inq = np.zeros((H, W), np.uint8); cv2.fillPoly(inq, [np.int32(np.round(quad))], 1)   # inside the board (not the bright window)
    ok = cv2.erode((vis & (inq > 0)).astype(np.uint8), np.ones((15, 15), np.uint8)) > 0
    hb = [hy[0] - 3, hy[1] - 3, hy[2] + 3, hy[3] + 3]; ok[max(0, hb[1]):hb[3], max(0, hb[0]):hb[2]] = False
    ok &= ~(cv2.dilate(busy.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0)
    sx0 = AX - (AX - SAFE['x0']) / smax; sx1 = AX + (SAFE['x1'] - AX) / smax; sy0 = AY - (AY - SAFE['y0']) / smax; sy1 = min(SAFE['y1'], y0c - 20)
    m = np.zeros_like(ok); m[int(np.ceil(sy0)):int(sy1), int(np.ceil(sx0)):int(sx1)] = True
    ok_free = ok.copy(); mf = np.zeros_like(ok); mf[SAFE['y0'] + 2:SAFE['y1'] - 2, SAFE['x0'] + 2:SAFE['x1'] - 2] = True; ok_free &= mf
    ok &= m
    zone = max_rect(ok[::2, ::2], lambda w, h: min(w, 520) * min(h, 300) + 0.01 * w * h)
    zone = [int(2 * v) for v in zone]
    # zone_free: the same board-white / off-head / off-body rectangle inside SAFE at scale 1 (no camera margin): render_v9 writes the hook, the pops
    # AND the captions here (board captions, lower strip) and puts the camera anchor on the captions, then trims it to the camera-safe window
    zf = max_rect(ok_free[::2, ::2], lambda w, h: min(w, 420) * min(h, 220) + 0.01 * w * h); zone_free = [int(2 * v) for v in zf]
    board = dict(quad=quad, edges=dict(top=[round(top[0], 5), round(top[1], 1)], bottom=[round(bot[0], 5), round(bot[1], 1)], left=[round(lef[0], 5), round(lef[1], 1)], right=[round(rig[0], 5), round(rig[1], 1)]),
                 zone=zone, zone_wh=[zone[2] - zone[0], zone[3] - zone[1]], zone_free=zone_free, frame='normalised 1080x1920 (1916 -> 1920 uniform, 1 px side crop)',
                 cam_anchor=[AX, AY], smax=smax, cap=dict(cx=cx, cy=cy, w=capw, lines=lines, box=[x0c, y0c, x1c, y1c], body_overlap_rows=ov_rows, body_overlap_px=ov_px, calm_span=[int(v) for v in best]),
                 body=rle(body), method='scripts/video/tpl/board_detect.py (white in every frame, RANSAC board edges, max rectangle)')
    cl['board'] = board
    print(c, json.dumps({k: v for k, v in board.items() if k != 'body'}), flush=True)
    if o.debug:
        os.makedirs(o.debug, exist_ok=True); im = fr[0].copy(); im[body] = (im[body] * 0.5 + np.array([0, 0, 120])).astype(np.uint8)
        cv2.polylines(im, [np.int32(quad)], True, (255, 0, 0), 4); cv2.rectangle(im, tuple(zone[:2]), tuple(zone[2:]), (0, 160, 0), 5)
        cv2.rectangle(im, (x0c, y0c), (x1c, y1c), (0, 200, 255), 4); cv2.rectangle(im, (SAFE['x0'], SAFE['y0']), (SAFE['x1'], SAFE['y1']), (200, 200, 0), 2)
        cv2.imwrite(f'{o.debug}/{c}.jpg', cv2.resize(im, (360, 640)))
json.dump(B, open(o.bank, 'w'), indent=1, ensure_ascii=False); open(o.bank, 'a').write('\n')
print('bank updated', o.bank)
