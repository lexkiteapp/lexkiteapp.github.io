#!/usr/bin/env python3
"""Teach2D automatic 2D scene (owner 31/10: unattended CI batches pick their own scene). gen.py calls pick(row, ep) once per pilot row, in batch order:
- an explicit row `scene` always wins (nothing added: those eps stay byte-identical) and becomes the scene the next row must differ from;
- otherwise candidates = scenes ranked by distinct keyword hits (scene_keys.json `keys`) in the episode's lines, data and row input, then the template's
  `fallback` list, then every other scene; the first candidate that differs from the previous episode's scene AND passes the clear check wins;
- clear check (static, before any voice / timeline): the resolved scene (scene.py, the same items build.py draws) for the episode's short layout and the
  wide embed has no prop over the caption box or the card region (where all text lives) – qc.py scene_clear re-checks it on the real timeline.
Adds ep.scene + ep.scene_why ('keyword: <word>' | 'fallback: <template>' | 'any'). `python3 scene_pick.py` prints the pick per pilot."""
import json, os, re
import scene as SC
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
K = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/scene_keys.json'))
assert set(K['keys']) <= set(SC.SCENES) and all(set(v) <= set(SC.SCENES) for v in K['fallback'].values()), 'scene_keys.json names a scene scenes.json lacks'
_last = [None]   # the previous episode's scene in this batch


def _strings(v):
    if isinstance(v, str): yield v
    elif isinstance(v, dict):
        for x in v.values(): yield from _strings(x)
    elif isinstance(v, list):
        for x in v: yield from _strings(x)


def hits(text):
    """scene -> keywords found (whole words / phrases, a plain plural too) in text, scenes with at least one hit, best first (ties: scene_keys.json order)."""
    t = ' ' + re.sub(r"[^a-z0-9'é-]+", ' ', text.lower()) + ' '
    found = {k: [w for w in ws if re.search(r'(?<![a-z0-9])' + re.escape(w) + r"(s|es)?(?![a-z0-9])", t)] for k, ws in K['keys'].items()}
    order = list(K['keys'])
    return sorted(((k, v) for k, v in found.items() if v), key=lambda kv: (-len(kv[1]), order.index(kv[0])))


def clear(key, layout):
    """True when no prop of scene `key` sits over the caption box or the card region in the short layout and the wide embed."""
    for fmt in ('short', 'wide'):
        if fmt == 'short':
            g = SC.LAYOUTS[layout]; W, H = 1080, 1920; cx = g['host_cx'] or (g['bubble'][0] + g['bubble'][2]) / 2; cap = g['cap']; region = g['region']
        else: g = dict(host_h=960, ct=None); W, H = 1920, 1080; cx = 1460; cap = None; region = [96, 150, 1056, 990]
        s = SC.resolve(key, fmt, layout if fmt == 'short' else 'wide', W, H, cx, g['host_h'] * 1108 / 960, g['host_h'], [], region, ct=g.get('ct'), clear=[])
        if SC.over_text(s, cap, [dict(id='card region', box=region, text=1)], W): return False
    return True


def pick(row, ep):
    if 'scene' in row: _last[0] = row['scene']; return {}
    text = ' '.join(list(_strings([l['text'] for l in ep['lines']])) + list(_strings(ep.get('data'))) + list(_strings(row.get('in'))))
    cand = [(k, 'keyword: ' + v[0]) for k, v in hits(text)] + [(k, 'fallback: ' + ep['template']) for k in K['fallback'].get(ep['template'], [])]
    cand += [(k, 'any') for k in SC.SCENES]
    seen = set(); layout = ep.get('layout', 'corner')
    for k, why in cand:
        if k in seen: continue
        seen.add(k)
        if k != _last[0] and clear(k, layout): _last[0] = k; return dict(scene=k, scene_why=why)
    raise AssertionError(('no scene passes the clear check', ep['id']))


if __name__ == '__main__':
    import gen   # noqa: F401  (runs nothing at import beyond loading the pilots)
    for row in gen.PIL['pilots']:
        ep = gen.make(row); print(f"{ep['id']:28s} {ep.get('scene', '-'):12s} {ep.get('scene_why', 'explicit')}")
