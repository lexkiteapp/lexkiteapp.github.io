#!/usr/bin/env python3
"""scene_fit.py – teachers on scene plates never float or mismatch (owner 12/11). 0 credits, CPU.
Every compositor that puts a teacher layer (app still, green-keyed clip frame, Rive) on a scene plate/insert
(brand/library/cine/scenes/bank.json) MUST call check() (or `scene_fit.py check <placement.json>`) and refuse to render on FAIL.

Rules (waist-up teachers, eye-level camera):
  ground   the SOLID body (alpha >= 250; app stills fade out over their last ~94 rows) reaches the frame bottom -> the fade is off-frame
  eye      teacher eye line within ±0.07 H of the plate horizon (bg_zones.py) – an eye-level camera sees eyes on the horizon
  scale    every teacher in one frame has the same head size (eye→mouth px) ±8 %
  frame    eyes inside 6–94 % of the width, head top not cut, ≥ 85 % of the body width visible
  apart    two teachers overlap ≤ 20 % of the narrower body
  light    layer grade == plate light (day | evening)
  furniture lower body over near forbidden cells (bg_zones grid 'N': table/counter right at the camera) ≤ 35 %

  python3 scene_fit.py slots <zones_dir> <bank.json>   -> plates[].fit {horizon, floor_top, valid, host_ok, slots}
  python3 scene_fit.py check <placement.json>          -> PASS/FAIL lines, exit 1 on FAIL
placement.json: {frame:[W,H], plate:{horizon, light, grid?}, hosts:[{layer:<png/webp>, eye:[x,y], eye_mouth, x, y, s, grade}]}
"""
import json, os, sys
import numpy as np

EYE_TOL, SCALE_TOL, OVERLAP, NEAR_MAX = 0.07, 0.08, 0.20, 0.35
HZ_OK = (0.30, 0.55)          # a horizon outside this makes a waist-up host absurdly big/small -> plate excluded from host shots
SLOT_X = {1: [0.5], 2: [0.30, 0.70]}


def solid_bottom(alpha):
    """last layer row whose body is solid (median alpha of the body columns >= 250) – rows below it are the soft fade"""
    rows = np.nonzero(alpha.max(1) > 0)[0]
    if not len(rows): return None, None
    bot = int(rows.max()); cols = alpha[int(rows.min() + 0.8 * (bot - rows.min()))] > 0
    for r in range(bot, -1, -1):
        if np.median(alpha[r, cols]) >= 250: return r, int(rows.min())
    return None, int(rows.min())


def load_alpha(p):
    from PIL import Image
    return np.array(Image.open(p).convert('RGBA'))[..., 3]


def check(frame, plate, hosts):
    """hosts: [{alpha (ndarray) | layer (path), eye:[x,y] layer px, eye_mouth layer px, x, y (layer top-left in frame px), s (scale), grade}] -> [(ok, rule, msg)]"""
    W, H = frame; res = []; boxes = []; heads = []
    for i, h in enumerate(hosts):
        a = h['alpha'] if 'alpha' in h else load_alpha(h['layer'])
        sb, top = solid_bottom(a); s, x, y = h['s'], h['x'], h['y']
        cols = np.nonzero(a.max(0) > 0)[0]; bx0, bx1 = x + cols.min() * s, x + (cols.max() + 1) * s
        by0 = y + top * s; ey = y + h['eye'][1] * s; ex = x + h['eye'][0] * s
        boxes.append((bx0, bx1, ey)); heads.append(h['eye_mouth'] * s)
        res.append((sb is not None and y + (sb + 1) * s >= H - 2, 'ground', f'host{i}: solid body ends at y={y + ((sb or 0) + 1) * s:.0f}, frame bottom {H} (floating if above; fade must be off-frame)'))
        if plate.get('horizon') is not None:
            res.append((abs(ey / H - plate['horizon']) <= EYE_TOL, 'eye', f"host{i}: eye {ey / H:.3f} H vs horizon {plate['horizon']:.3f} (±{EYE_TOL})"))
        vis = (min(bx1, W) - max(bx0, 0)) / (bx1 - bx0)
        res.append((0.06 * W <= ex <= 0.94 * W and by0 >= 0 and vis >= 0.85, 'frame', f'host{i}: eye x {ex / W:.2f} W, head top {by0:.0f}, visible width {vis:.0%}'))
        res.append((h.get('grade') == plate.get('light'), 'light', f"host{i}: grade {h.get('grade')} vs plate {plate.get('light')}"))
        g = plate.get('grid')
        if g:
            R = g['rows']; gh, gw = len(R), len(R[0]); c0, c1 = int(max(bx0, 0) / W * gw), int(min(bx1, W) / W * gw); r0 = int(0.68 * gh)
            cells = [R[r][c] for r in range(r0, gh) for c in range(c0, max(c1, c0 + 1))]
            n = sum(ch == 'N' for ch in cells) / max(1, len(cells))
            res.append((n <= NEAR_MAX, 'furniture', f'host{i}: {n:.0%} of the lower body over near furniture'))
    if len(heads) > 1:
        r = max(heads) / min(heads) - 1; res.append((r <= SCALE_TOL, 'scale', f'head sizes differ {r:.0%}'))
        for i in range(len(boxes)):
            for j in range(i + 1, len(boxes)):
                a, b = boxes[i], boxes[j]; ov = max(0, min(a[1], b[1]) - max(a[0], b[0])) / min(a[1] - a[0], b[1] - b[0])
                res.append((ov <= OVERLAP, 'apart', f'host{i}/host{j} overlap {ov:.0%}'))
    return res


def place(frame, horizon, layer_eye_y, layer_solid_bottom, cx_frac, layer_eye_x):
    """scale + top-left that put the eye on the horizon and the solid body bottom on the frame bottom"""
    W, H = frame; s = (H - horizon * H) / (layer_solid_bottom + 1 - layer_eye_y)
    return dict(s=s, x=cx_frac * W - layer_eye_x * s, y=H - (layer_solid_bottom + 1) * s)


def slots(zones_dir, bank):
    b = json.load(open(bank)); n = 0
    for sit in b['situations'].values():
        for p in sit.get('plates', []):
            zf = f"{zones_dir}/{p['id']}.zones.json"
            if not os.path.exists(zf): continue
            z = json.load(open(zf)); hz = z['horizon']; ok = bool(z['valid'] and HZ_OK[0] <= hz <= HZ_OK[1])
            p['fit'] = dict(horizon=hz, horizon_src=z.get('horizon_src'), floor_top=z['floor_top'], valid=z['valid'], host_ok=ok,
                            slots={str(k): v for k, v in SLOT_X.items()} if ok else {}, zones=f"cine/scenes/{p['src'].rsplit('/plates/', 1)[0]}/zones/{p['id']}.zones.json")
            n += 1
    json.dump(b, open(bank, 'w'), indent=1, ensure_ascii=False); open(bank, 'a').write('\n'); print(f'{n} plates fitted')


if __name__ == '__main__':
    if sys.argv[1] == 'slots': slots(sys.argv[2], sys.argv[3])
    else:
        P = json.load(open(sys.argv[2])); r = check(P['frame'], P['plate'], P['hosts'])
        for ok, k, m in r: print(('PASS ' if ok else 'FAIL ') + k + ': ' + m)
        sys.exit(0 if all(ok for ok, _, _ in r) else 1)
