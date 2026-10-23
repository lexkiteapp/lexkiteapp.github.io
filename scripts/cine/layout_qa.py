#!/usr/bin/env python3
"""layout_qa.py <render_dir> [mp4] - owner 23/10 automated layout QA for news shorts (run from NEWS_DIR, after news.py).
Every frame: <= 1 card (Card/Recap/Ring/Share) + <= 1 caption chunk on screen, no overlay x overlay overlap, no overlay over the head (hair top
-> chin, from the host matte) or the hands (matte skin blobs + the renderer's per-frame hand boxes). Every overlay state: text glyph boxes
inside the card's inner padding (>= 24 px, from news_cards.py meta), WCAG AA contrast (>= 4.5, or >= 3.0 for bold text >= 24 px).
Writes a contact sheet of every distinct overlay state (boxes drawn: green ok / red fail, head blue, hands magenta) + layout_qa.json.
Exit 1 on any failure."""
import json, os, sys, cv2, numpy as np
RD = sys.argv[1]; tl = json.load(open(f'{RD}/timeline.json')); FPS = 24
OUT = os.environ.get('CINE_OUT', os.path.join(os.getcwd(), 'out')); V = sys.argv[2] if len(sys.argv) > 2 else f"{OUT}/{tl['lesson']['out']}"
K = json.load(open(f'{RD}/keepout.json')) if os.path.exists(f'{RD}/keepout.json') else {}
HB = json.load(open(f'{RD}/qc.json')).get('hands', {}) if os.path.exists(f'{RD}/qc.json') else {}
CARDS = ('Card', 'Recap', 'Ring', 'Share'); OV = tl['overlays']; NF = int(round(tl['total'] * FPS))
def lum(c): c = [((v / 255) / 12.92) if v / 255 <= 0.03928 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c[:3]]; return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
def contrast(a, b): la, lb = sorted([lum(a), lum(b)], reverse=True); return (la + 0.05) / (lb + 0.05)
def hit(a, b, g=0): return min(a[2], b[2]) + g > max(a[0], b[0]) and min(a[3], b[3]) + g > max(a[1], b[1])
def vis(o, fi): return o['t'][0] - 1e-6 <= fi / FPS < o['t'][1] - 1e-6
ckey = lambda o: ('cap', o['shot'], o['line'], (o.get('chunk') or [0])[0]) if o['style'] == 'Cap' else ('ov', OV.index(o))
# --- static: overflow + contrast per overlay
over, lowc = [], []
for i, o in enumerate(OV):
    m = o.get('meta')
    if not m: continue
    ir = m['inner']
    for b in m['tb']:
        if not (b[0] >= ir[0] - 1 and b[1] >= ir[1] - 1 and b[2] <= ir[2] + 1 and b[3] <= ir[3] + 1): over.append((o['style'], o['text'][:30], b, ir)); break
    for fg, bg, fs in m.get('cols', []):
        c = contrast(fg, bg); need = 3.0 if fs >= 24 else 4.5
        if c < need: lowc.append((o['style'], o['text'][:30], round(c, 2), need))
SZ = tl.get('safe') or dict(x0=48, x1=924, y0=232, y1=1497); offf = []   # owner 23/10: every overlay box and glyph box inside the platform-safe frame area
for o in OV:
    bx = [o['box']] + ((o.get('meta') or {}).get('tb') or [])
    if any(b[0] < SZ['x0'] - 2 or b[2] > SZ['x1'] + 2 or b[1] < SZ['y0'] - 2 or b[3] > SZ['y1'] + 2 for b in bx): offf.append((o['style'], o['text'][:30], o['box']))
over += [('SAFE', *x) for x in offf]
mincon = min([contrast(fg, bg) for o in OV if o.get('meta') for fg, bg, fs in o['meta'].get('cols', [])] or [0])
# --- per frame
bad = dict(cards=[], caps=[], pairs=[], head=[], hands=[]); states = []; prev = None
for fi in range(NF):
    v = [o for o in OV if vis(o, fi)]; sig = tuple(sorted({ckey(o) for o in v}, key=str))
    if sig != prev: states.append([fi, fi, sig]); prev = sig
    else: states[-1][1] = fi
    if sum(o['style'] in CARDS for o in v) > 1: bad['cards'].append(fi)
    if len({ckey(o) for o in v if o['style'] == 'Cap'}) > 1: bad['caps'].append(fi)
    vv = list({ckey(o): o for o in v}.values())
    for a in range(len(vv)):
        for b in range(a + 1, len(vv)):
            if hit(vv[a]['box'], vv[b]['box']): bad['pairs'].append((fi, vv[a]['style'], vv[b]['style']))
    k = K.get(str(fi), {}); hands = k.get('hands', []) + HB.get(str(fi), [])
    for o in vv:
        if any(hit(o['box'], r) for r in k.get('head', [])): bad['head'].append((fi, o['style']))
        if any(hit(o['box'], r) for r in hands): bad['hands'].append((fi, o['style']))
nbad = {k_: len(v_) for k_, v_ in bad.items()}; ok = not over and not lowc and not any(nbad.values())
# --- contact sheet: one tile per distinct overlay state (frame = state start + 4, after the 0.16 s fade-in)
pick = {min(a + 4, b): (a, b, s) for a, b, s in states if s}; frames = {}
cap = cv2.VideoCapture(V); fi = 0
while pick and fi <= max(pick):
    okr, F = cap.read()
    if not okr: break
    if fi in pick: frames[fi] = F
    fi += 1
tiles = []
for fi in sorted(frames):
    F = frames[fi].copy(); a, b, s = pick[fi]; k = K.get(str(fi), {}); fbad = fi in bad['cards'] or fi in bad['caps'] or any(x[0] == fi for x in bad['pairs'] + bad['head'] + bad['hands'])
    for r in k.get('head', []): cv2.rectangle(F, (int(r[0]), int(r[1])), (int(r[2]), int(r[3])), (255, 120, 0), 3)
    for r in k.get('hands', []) + HB.get(str(fi), []): cv2.rectangle(F, (int(r[0]), int(r[1])), (int(r[2]), int(r[3])), (255, 0, 255), 3)
    for o in OV:
        if vis(o, fi):
            ob = any(x[0] == o['style'] for x in over) or fbad; cv2.rectangle(F, tuple(o['box'][:2]), tuple(o['box'][2:]), (0, 0, 255) if ob else (0, 200, 0), 4)
            if o.get('meta'): ir = o['meta']['inner']; cv2.rectangle(F, (ir[0], ir[1]), (ir[2], ir[3]), (0, 220, 255), 1)
    T = cv2.resize(F, (360, 640), interpolation=cv2.INTER_AREA)
    cv2.rectangle(T, (0, 0), (360, 26), (0, 0, 0), -1); lab = f'{a / FPS:5.2f}s ' + ' '.join(sorted({o["style"] for o in OV if vis(o, fi)}))
    cv2.putText(T, lab[:44], (6, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255) if fbad else (255, 255, 255), 1, cv2.LINE_AA); tiles.append(T)
cols = 6; rows_ = []
_cj = json.load(open(f'{RD}/cine.json')) if os.path.exists(f'{RD}/cine.json') else None
if _cj and tiles:   # owner 23/10: the cine score on the sheet
    T = np.zeros_like(tiles[0]); cv2.putText(T, f"CINE {_cj['score']}/100", (10, 40), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (255, 255, 255), 2, cv2.LINE_AA)
    for n_, (k_, v_) in enumerate(_cj['rules'].items()): cv2.putText(T, f"{'OK ' if v_['ok'] else 'FAIL'} {k_}", (10, 80 + 30 * n_), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 200, 0) if v_['ok'] else (0, 0, 255), 1, cv2.LINE_AA)
    tiles.insert(0, T)
for i in range(0, len(tiles), cols):
    r = tiles[i:i + cols]; r += [np.zeros_like(tiles[0])] * (cols - len(r)); rows_.append(np.hstack(r))
os.makedirs(f'{OUT}/qa', exist_ok=True); lid = tl['lesson'].get('id') or os.path.basename(RD); sheet = f'{OUT}/qa/layout_{lid}.jpg'
if rows_: cv2.imwrite(sheet, np.vstack(rows_), [cv2.IMWRITE_JPEG_QUALITY, 86])
rep = dict(ok=ok, states=len(tiles), overflow=over, low_contrast=lowc, min_contrast=round(mincon, 2), frames=nbad, sheet=sheet,
           examples={k_: v_[:5] for k_, v_ in bad.items() if v_})
json.dump(rep, open(f'{RD}/layout_qa.json', 'w'), indent=1, default=str)
print(f"LAYOUT QA {'PASS' if ok else 'FAIL'}: {len(tiles)} overlay states, overflow {len(over)}, low contrast {len(lowc)} (min {mincon:.2f}), frames with >1 card {nbad['cards']}, >1 caption {nbad['caps']}, overlay pairs {nbad['pairs']}, over head {nbad['head']}, over hands {nbad['hands']} -> {sheet}")
for x in over[:5]: print('  OVERFLOW', x)
for x in lowc[:5]: print('  CONTRAST', x)
sys.exit(0 if ok else 1)
