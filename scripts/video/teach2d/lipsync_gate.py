#!/usr/bin/env python3
"""Teach2D gate `lipsync_rig` (qc.py, host = TeacherRig – docs/specs/video-production-v2.md §1), stdlib only.
  python3 scripts/video/teach2d/lipsync_gate.py <timeline.json> [rig.frames.json] [vo dir]   -> JSON result, exit 1 when red
Reads rig.frames.json (rig_host.mjs: one logged state per video frame) and the episode's Rhubarb cues (vo/<id>.json):
- the cue track is rebuilt here (twin of rig_plan.mjs cueTrack) and must equal the one the renderer used (+-1 ms);
- every Rhubarb cue >= 50 ms shows its shape within +-33 ms (frame time f / fps of the first frame carrying the new shape, nearest to the
  cue start – same rule and tolerance as scripts/test/teacher-rig.mjs; Rhubarb letters == rig shapes);
- silences > 0.35 s: mouth X on every frame fully inside the silence (one frame of margin at the start);
- no pose weight > 0.5 on a frame where the voice is on (a pose still covers the drawn mouth);
- frame count == labels.nf_of(timeline) (the count build.py rendered; half-up, never banker's rounding)."""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); from labels import nf_of   # noqa: E402  one frame-count formula

SHAPES = set('XABCDEFGH')
TOL, MIN_CUE, SIL = 0.033, 0.05, 0.35


def ms(x): return math.floor(x * 1000 + 0.5)
def r3(x): return ms(x) / 1000


def cue_track(lines, read, total):
    """lines: [(id, t0)] in timeline order; read(id) -> Rhubarb mouthCues. Same algorithm as rig_plan.mjs cueTrack."""
    raw = []
    for i, (lid, t0) in enumerate(lines):
        lim = lines[i + 1][1] if i + 1 < len(lines) else total
        for c in read(lid):
            if c['value'] not in SHAPES: raise ValueError(f"unknown Rhubarb shape {c['value']} in line {lid}")
            s, e = r3(t0 + c['start']), min(r3(t0 + c['end']), r3(lim))
            if e > s: raw.append(dict(value=c['value'], start=s, end=e))
    out = []; cur = 0
    def push(v, a, b):
        if b <= a: return
        if out and out[-1]['value'] == v and abs(out[-1]['end'] - a) < 1e-9: out[-1]['end'] = b
        else: out.append(dict(value=v, start=a, end=b))
    for c in raw:
        if c['start'] > cur: push('X', cur, c['start'])
        push(c['value'], max(cur, c['start']), c['end']); cur = max(cur, c['end'])
    if cur < r3(total): push('X', cur, r3(total))
    return out


def check(T, F, vo):
    """T timeline, F rig.frames.json, vo Rhubarb dir -> dict(ok, ...)."""
    fps = T['fps']; nf = nf_of(T); fr = F.get('frames') or []
    lines = [(k, v['t0']) for k, v in T['lines'].items()]
    track = cue_track(lines, lambda i: json.load(open(os.path.join(vo, f'{i}.json')))['mouthCues'], T['total'])
    used = F.get('track') or []
    same = len(used) == len(track) and all(a['value'] == b['value'] and abs(a['start'] - b['start']) <= 0.001 and abs(a['end'] - b['end']) <= 0.001 for a, b in zip(used, track))
    shape = [x['shape'] for x in fr]
    tr = []; ps = None   # transitions: (frame time, new shape)
    for f, s in enumerate(shape):
        if s != ps: tr.append((f / fps, s)); ps = s
    n = 0; bad = []; ds = []
    for i, c in enumerate(track):
        prev = track[i - 1]['value'] if i else 'X'
        if c['end'] - c['start'] < MIN_CUE or c['value'] == prev: continue
        d = 1.0
        for t, s in tr:
            if s == c['value'] and abs(t - c['start']) < abs(d): d = t - c['start']
        n += 1; ds.append(d)
        if abs(d) > TOL: bad.append(dict(t=c['start'], shape=c['value'], off_ms=round(d * 1000)))
    sil = []   # silences = X cues (holes are X in the track) longer than SIL
    for c in track:
        if c['value'] != 'X' or c['end'] - c['start'] <= SIL: continue
        for f in range(int(math.ceil((c['start'] + 0.04) * fps)), len(shape)):
            if (f + 1) / fps > c['end'] + 1e-9: break
            if shape[f] != 'X': sil.append(dict(f=f, t=round(f / fps, 3), shape=shape[f])); break
    on = [False] * len(shape)   # voice on during the frame's display interval
    for c in track:
        if c['value'] == 'X': continue
        for f in range(max(0, int(c['start'] * fps)), min(len(shape), int(math.ceil(c['end'] * fps)))): on[f] = True
    cover = [dict(f=f, pose=x.get('pose'), w=x['poseW']) for f, x in enumerate(fr) if on[f] and x['poseW'] > 0.5]
    ds.sort(); p = lambda q: round(ds[min(len(ds) - 1, int(len(ds) * q))] * 1000) if ds else None
    ok = same and n > 0 and not bad and not sil and not cover and len(fr) == nf
    return dict(ok=ok, cues=n, p50_ms=p(0.5), p99_ms=p(0.99), off=bad[:6], mouth_open_in_silence=sil[:6], pose_over_mouth=cover[:6],
                frames=len(fr), need_frames=nf, track_matches=same, src=F.get('src'))


if __name__ == '__main__':
    T = json.load(open(sys.argv[1])); rg = T.get('rig') or {}
    F = json.load(open(sys.argv[2] if len(sys.argv) > 2 else rg['frames'])); vo = sys.argv[3] if len(sys.argv) > 3 else rg['vo']
    r = check(T, F, vo); print(json.dumps(r)); sys.exit(0 if r['ok'] else 1)
