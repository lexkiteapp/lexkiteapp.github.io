#!/usr/bin/env python3
"""Per-clip mouth-swap residual profile (the 'pixel max' qa5 checks, <= 12): residual.py <scene_dir> <out.json> <clip> [<clip> ...]
For every frame of each clip and every tracked character: residual of the closed mouth (X, listener) and the worst speaking viseme,
computed exactly like lipsync.render(). The auto-lesson adapter only takes frame ranges whose residual stays <= 11.5 (margin to 12).
Cached in content/video/cine/auto/<scene>/residual.json (one run per scene; bank footage never changes)."""
import sys, os, json, glob, cv2, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lipsync as L
SD, OUT, clips = sys.argv[1], sys.argv[2], sys.argv[3:]; os.environ.setdefault('CINE_SCENE_DIR', SD)
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
for clip in clips:
    if clip in res or ':' in clip: continue
    src = f'{SD}/dl24/{clip}.mp4'
    if not os.path.exists(src): print('residual: no dl24 for', clip); continue
    cap = cv2.VideoCapture(src); FR = []
    while True:
        ok, F = cap.read()
        if not ok: break
        FR.append(F)
    res[clip] = {}
    for d in sorted(glob.glob(f'{SD}/meta/{clip}/*/mouth.json')):
        who = os.path.basename(os.path.dirname(d)); mo = L.Mouth(os.path.dirname(d)); core = mo.E > 0.9; pX, pT = [], []
        for i, F in enumerate(FR):
            r = {}
            for v in mo.spr:
                al = mo.aligned(mo.apply(F, i, mo.spr[v]), i).astype(np.float32); r[v] = float(np.abs(al[core] - mo.spr[v][core]).mean())
            pX.append(round(r.get('X', 0), 2)); pT.append(round(max(r.values()), 2))
        res[clip][who] = dict(X=pX, talk=pT); print(f'residual {clip} {who}: X max {max(pX):.1f}, talk max {max(pT):.1f}, frames <= 11.5: {sum(x <= 11.5 for x in pT)}/{len(pT)}')
json.dump(res, open(OUT, 'w'))
