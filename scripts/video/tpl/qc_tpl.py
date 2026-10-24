#!/usr/bin/env python3
"""QC gate for the clean templates (docs/VIDEO-TEMPLATES.md §QC). python3 scripts/video/tpl/qc_tpl.py <video.mp4> [...]
Reads <video>.timeline.json (per-frame element log written by render_tpl.py) + ffprobe. Exit 1 on any fail. Writes <video>.qc.json.
Gates: host transform variance = 0 | motion tokens only | text inside the safe area | readability (>= 0.8 s fully visible, >= 48 px)
| no jitter (static elements never move by a sub-pixel; tweens monotonic) | <= 1 moving group per frame | no cuts | file: 25-35 s, >= 5.5 Mbps, <= 25 MB."""
import sys, os, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import SAFE, DUR, EASE, MIN_READ, MIN_PX, TYPE
ok_all = True
for vid in sys.argv[1:]:
    T = json.load(open(vid + '.timeline.json')); fr = T['frames']; E = T['elements']; fps = T['fps']; R = {}
    # 1 host variance
    hs = [tuple(sorted((k, v) for k, v in f['host'].items() if k in ('scale', 'x', 'y'))) for f in fr if f['host']]
    R['host_variance'] = dict(ok=len(set(hs)) <= 1, frames_with_host=len(hs), distinct_transforms=len(set(hs)))
    # 2 motion tokens
    bad = [(i, tw) for i, e in E.items() for tw in e['tweens'] if tw['dur'] not in DUR or tw['ease'] not in EASE]
    bad += [('progress', tw) for tw in T['progress']['tweens'] if tw['dur'] not in DUR or tw['ease'] not in EASE]
    R['motion_tokens'] = dict(ok=not bad, bad=bad[:5], tweens=sum(len(e['tweens']) for e in E.values()))
    # per-element tracks
    tr = {}
    for f in fr:
        for rec in f['els']:
            i, x, y, w, h, a, sc, mv, g, txt = rec; tr.setdefault(i, []).append((f['t'], x, y, w, h, a, sc, mv, g, txt))
    # 3 safe area (text only, any visible frame)
    out = []
    for i, L in tr.items():
        for (t, x, y, w, h, a, sc, mv, g, txt) in L:
            if txt and a > 0.05 and (x < SAFE['x0'] - 2 or y < SAFE['y0'] or x + w > SAFE['x1'] + 2 or y + h > SAFE['y1']): out.append((i, t, round(x), round(y), w, h)); break
    R['safe_area'] = dict(ok=not out, outside=out[:8])
    # 4 readability
    short, small = [], []
    for i, L in tr.items():
        if not L[0][9]: continue
        full = sum(1 for r in L if r[5] >= 0.99) / fps
        if full < MIN_READ: short.append((i, round(full, 2)))
        fs = E.get(i, {}).get('fs')
        if fs and fs < MIN_PX: small.append((i, fs))
    R['readability'] = dict(ok=not short and not small, min_visible_s=MIN_READ, too_short=short[:8], too_small=small[:8],
                            text_elements=sum(1 for L in tr.values() if L[0][9]))
    # 5 jitter: a static element keeps exactly one position; a tween moves monotonically (no back-and-forth)
    jit = []
    for i, L in tr.items():
        st = {(r[1], r[2], r[6]) for r in L if not r[7]}
        if len(st) > 1: jit.append((i, 'static positions', len(st)))
        for k in (1, 2, 6):
            seq = [r[k] for r in L if r[7]]; d = [b - a for a, b in zip(seq, seq[1:]) if abs(b - a) > 1e-6]
            if any(p * q < 0 for p, q in zip(d, d[1:])) and not (k == 6 and len(set(seq)) <= 2): jit.append((i, 'reversal', k))
    R['no_jitter'] = dict(ok=not jit, bad=jit[:8])
    # 6 one moving group at a time
    multi = []
    for f in fr:
        gs = {r[8] for r in f['els'] if r[7]}
        if len(gs) > 1: multi.append((f['t'], sorted(gs)))
    R['one_moving_group'] = dict(ok=not multi, frames=len(multi), first=multi[:4])
    # 7 cuts
    R['no_unmotivated_cut'] = dict(ok=not T.get('cuts'), cuts=T.get('cuts'))
    # 8 file
    pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,bit_rate,size:stream=codec_type,width,height,avg_frame_rate', '-of', 'json', vid]))
    dur, br, size = float(pr['format']['duration']), int(pr['format']['bit_rate']), int(pr['format']['size'])
    R['file'] = dict(ok=25 <= dur <= 35 and br >= 5.5e6 and size <= 25 * 1024 * 1024, duration=round(dur, 2), mbps=round(br / 1e6, 2), mb=round(size / 1048576, 2))
    R['audio'] = dict(ok=True, **T.get('audio', {}))
    ok = all(v['ok'] for v in R.values()); ok_all &= ok
    json.dump(dict(video=os.path.basename(vid), ok=ok, gates=R), open(vid + '.qc.json', 'w'), indent=1)
    print(os.path.basename(vid), 'PASS' if ok else 'FAIL')
    for k, v in R.items(): print(f"  {'ok ' if v['ok'] else 'BAD'} {k:20s} {json.dumps({a: b for a, b in v.items() if a != 'ok'})[:220]}")
sys.exit(0 if ok_all else 1)
