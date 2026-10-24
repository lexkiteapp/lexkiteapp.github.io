#!/usr/bin/env python3
"""Edit-style pilot deliverables (cine-render edit_pilot): python3 scripts/cine/pilot_sheet.py <out/pilot> A,B,C
  style-X-preview.mp4  2-pass H.264, <= 8 MB, >= 5 Mbps total (owner preview rule)
  transitions.jpg      side-by-side contact sheet: one column block per style, one row per shot boundary (frames cut-4 .. cut+3),
                       plus the punch-in moments (eased zoom inside a shot), labelled with the edit-craft numbers."""
import json, os, subprocess, sys
import cv2, numpy as np
D, ST = sys.argv[1], [x for x in sys.argv[2].split(',') if x]
def dur(p): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', p]))
ok = True
for st in ST:
    src, dst = f'{D}/style-{st}.mp4', f'{D}/style-{st}-preview.mp4'
    if not os.path.exists(src): ok = False; continue
    d = dur(src); vb = min(6000, int(7.85e6 * 8 / d / 1000) - 128)
    for _ in range(3):
        assert vb + 128 >= 5000, f'{st}: {d:.1f} s cannot fit 8 MB at >= 5 Mbps'
        for ps in (1, 2):
            subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', src, '-c:v', 'libx264', '-preset', 'slow', '-b:v', f'{vb}k', '-maxrate', f'{int(vb * 1.3)}k', '-bufsize', f'{vb * 2}k',
                            '-pass', str(ps), '-passlogfile', f'{D}/x264_{st}', '-pix_fmt', 'yuv420p', '-profile:v', 'high'] + (['-an', '-f', 'mp4', '/dev/null'] if ps == 1 else ['-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', dst]), check=True)
        sz = os.path.getsize(dst)
        if sz <= 8_000_000: break
        vb = int(vb * 0.97)
    mbps = sz * 8 / dur(dst) / 1e6; print(f'preview {st}: {sz / 1e6:.2f} MB, {mbps:.2f} Mbps, {d:.2f} s'); ok &= sz <= 8_000_000 and mbps >= 5.0
TW, TH, FPS = 120, 213, 24
def frames(p, idx):
    cap = cv2.VideoCapture(p); out = {}; i = 0; want = set(idx)
    while want and i <= max(idx):
        r, f = cap.read()
        if not r: break
        if i in want: out[i] = cv2.resize(f, (TW, TH), interpolation=cv2.INTER_AREA)
        i += 1
    return [out.get(k, np.zeros((TH, TW, 3), np.uint8)) for k in idx]
cols = []
for st in ST:
    tp, vp = f'{D}/timeline_{st}.json', f'{D}/style-{st}.mp4'
    if not (os.path.exists(tp) and os.path.exists(vp)): continue
    tl = json.load(open(tp)); ed = tl['qa']['edit']; qe = json.load(open(f'{D}/edit_craft_{st}.json')) if os.path.exists(f'{D}/edit_craft_{st}.json') else {}
    rows = [(b['t'], f"{b['kind'].upper()} {b['frm']}>{b['to']}") for b in ed['bounds']] + [(k[0] + k[1] / 2 / FPS, f"PUNCH {'in' if k[2] > 1 else 'out'} {k[1]}f") for T in ed['takes'] for k in T['kf']]
    rows.sort(); blk = []
    head = np.full((70, 8 * TW, 3), 245, np.uint8)
    cv2.putText(head, f'STYLE {st}', (8, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (40, 40, 40), 2)
    cv2.putText(head, f"mid-cut {qe.get('mid_sentence_cuts')}  pause {qe.get('cut_on_pause')}  pans {qe.get('slow_pans')}  pops {qe.get('pop_ins')}", (8, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (40, 40, 40), 1)
    blk.append(head)
    for t, lab in rows:
        c = int(round(t * FPS)); fr = frames(vp, list(range(max(0, c - 4), c + 4)))
        for i, f in enumerate(fr):
            if i == 4: cv2.rectangle(f, (0, 0), (TW - 1, TH - 1), (0, 140, 255), 3)   # first frame after the cut
        lb = np.full((24, 8 * TW, 3), 255, np.uint8); cv2.putText(lb, f'{t:5.2f}s  {lab}', (6, 17), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (30, 30, 30), 1)
        blk += [lb, np.hstack(fr)]
    cols.append(np.vstack(blk))
if cols:
    H = max(c.shape[0] for c in cols); cols = [np.vstack([c, np.full((H - c.shape[0], c.shape[1], 3), 255, np.uint8)]) for c in cols]
    sep = np.full((H, 16, 3), 200, np.uint8); sheet = cols[0]
    for c in cols[1:]: sheet = np.hstack([sheet, sep, c])
    cv2.imwrite(f'{D}/transitions.jpg', sheet, [cv2.IMWRITE_JPEG_QUALITY, 85]); print('sheet', sheet.shape)
else: ok = False
sys.exit(0 if ok else 1)
