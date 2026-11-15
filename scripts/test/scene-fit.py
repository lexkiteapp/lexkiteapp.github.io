#!/usr/bin/env python3
"""scene-fit gate test (owner 12/11 "ghép thầy cô không lơ lửng, không lệch"): real app stills on a 16:9 plate.
A correct placement passes; floating, visible bottom fade, eye off the horizon, mismatched scale/light, overlap all FAIL."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'video')); import scene_fit as F
R = os.path.join(os.path.dirname(__file__), '..', '..'); C = json.load(open(f'{R}/web/teach/characters.json'))
k = 960 / C['frame']['h']; EY, EM = C['frame']['eye_y'] * 960, C['frame']['eye_mouth'] * k   # app stills = 2x the registry frame
W, H, HZ = 1920, 1080, 0.42; plate = dict(horizon=HZ, light='evening')
def host(who, cx, **o):
    a = F.load_alpha(f'{R}/web/teach/{who}/still-point.webp'); sb, _ = F.solid_bottom(a); cols = np.nonzero(a[int(EY)] > 0)[0]; ex = (cols.min() + cols.max()) / 2
    p = F.place((W, H), HZ, EY, sb, cx, ex); h = dict(alpha=a, eye=[ex, EY], eye_mouth=EM, grade='evening', **p); h.update(o); return h, sb
def fails(hosts, pl=plate): return sorted({k for ok, k, _ in F.check((W, H), pl, hosts) if not ok})
(a, sb), (c, _) = host('ama', 0.30), host('carlos', 0.70)
assert 60 < a['alpha'].shape[0] - 1 - sb < 140, ('app stills must keep their bottom fade measured', a['alpha'].shape[0] - 1 - sb)
bad = {}
bad['ok'] = fails([a, c])
bad['floating'] = fails([dict(a, y=a['y'] - 120), c])
fade = dict(a); fade['y'] = H - a['alpha'].shape[0] * a['s']; bad['fade'] = fails([fade, c])   # whole layer incl. the soft fade on-frame = ghost legs
bad['eye'] = fails([a, c], dict(plate, horizon=0.60))
bad['scale'] = fails([a, dict(c, eye_mouth=EM * 1.25)])
bad['light'] = fails([a, dict(c, grade='day')])
bad['apart'] = fails([a, host('carlos', 0.34)[0]])
bad['size'] = fails([dict(a, eye_mouth=EM * 1.6), dict(c, eye_mouth=EM * 1.6)])          # giant teachers in a small room
g = dict(w=54, h=96, rows=['.' * 54] * 96); g['rows'] = [('N' * 30 + '.' * 24) if 48 <= r < 70 else '.' * 54 for r in range(96)]
bad['proportion'] = fails([a, c], dict(plate, grid=g))                                   # a near counter at chest height = teacher too small
bad['clear_room'] = fails([a, c], dict(plate, grid=dict(w=54, h=96, rows=['.' * 54] * 60 + ['F' * 54] * 36)))
bad['occlude'] = bad['apart']                                                             # standing too close: the face is covered too
print(json.dumps(bad))
assert bad['ok'] == [] and bad['clear_room'] == [], (bad['ok'], bad['clear_room'])
for k, want in dict(floating='ground', fade='ground', eye='eye', scale='scale', light='light', apart='apart', size='size', proportion='proportion', occlude='occlude').items(): assert want in bad[k], (k, bad[k])
print('scene-fit OK: good placement passes, 9 bad placements fail (float, fade, horizon, scale, light, overlap, size, room proportion, face covered)')
