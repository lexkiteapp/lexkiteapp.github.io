#!/usr/bin/env python3
"""series_dedupe – never render/publish the same series lesson twice (video-series.yml dedupe gate).

Registry content/video/cine/news/series/registry.json: {entries: {content_hash: {id, series, key, phash: [8 x 64-bit hex], run}}}.
content hash = series name + key sentence (gold2v9.content_hash); pHash = 64-bit DCT hash of 8 frames sampled at fixed positions.
A render is a duplicate when its content hash is already registered, or when >= 6 of its 8 frame pHashes are within Hamming 6 of the
same registered (or same-run) video.
  entry SPEC FRAMES_DIR OUT.json [RUN]      write this render's registry entry (frames = the workflow's 8 frames/t*.jpg)
  check REGISTRY ENTRY.json...              compare entries with the registry and with each other; prints a table, writes
                                            <entry>.dedupe.json next to each entry; exit 1 if any duplicate
  add REGISTRY ENTRY.json...                register approved renders (owner approval gate: only after the owner OKs the videos)
"""
import glob, json, os, sys
import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gold2v9 import content_hash   # noqa: E402

HAM, NEED = 6, 6

def phash(path):
    a = np.asarray(Image.open(path).convert('L').resize((32, 32), Image.LANCZOS), dtype=np.float64)
    n = np.arange(32); C = np.cos(np.pi * (2 * n[None, :] + 1) * n[:, None] / 64)   # DCT-II basis
    d = (C @ a @ C.T)[:8, :8].flatten(); bits = d > np.median(d[1:])
    return '%016x' % int(''.join('1' if b else '0' for b in bits), 2)

ham = lambda a, b: bin(int(a, 16) ^ int(b, 16)).count('1')
def near(p, q): return len(p) == len(q) == 8 and sum(ham(a, b) <= HAM for a, b in zip(p, q)) >= NEED

def main():
    cmd = sys.argv[1]
    if cmd == 'entry':
        spec = json.load(open(sys.argv[2])); fr = sorted(glob.glob(f'{sys.argv[3]}/t*.jpg'))
        assert len(fr) == 8, f'need 8 frames, got {len(fr)}'
        L = spec['lines'][0]['id'][0]; key = next(l['text'] for l in spec['lines'] if l['id'] == f'{L}_k')
        e = dict(id=spec['id'], series=spec['series']['name'], ep=spec['series']['ep'], key=key, hash=content_hash(spec), phash=[phash(f) for f in fr],
                 run=sys.argv[5] if len(sys.argv) > 5 else None)
        json.dump(e, open(sys.argv[4], 'w'), indent=1); print(e['id'], e['hash']); return
    reg_p = sys.argv[2]; reg = json.load(open(reg_p)) if os.path.exists(reg_p) else {'entries': {}}
    ents = [(p, json.load(open(p))) for p in sys.argv[3:]]
    if cmd == 'add':
        for _, e in ents: reg['entries'][e['hash']] = {k: e[k] for k in ('id', 'series', 'ep', 'key', 'phash', 'run')}
        json.dump(reg, open(reg_p, 'w'), ensure_ascii=False, indent=1); print(f'registered {len(ents)}'); return
    dup = 0; prev = []
    for p, e in ents:
        why = []
        if e['hash'] in reg['entries']: why.append(f"content hash = {reg['entries'][e['hash']]['id']}")
        why += [f"pHash ~ {r['id']}" for h, r in reg['entries'].items() if h != e['hash'] and near(e['phash'], r['phash'])]
        why += [f"content hash = {o['id']} (same run)" for o in prev if o['hash'] == e['hash']]
        why += [f"pHash ~ {o['id']} (same run)" for o in prev if o['hash'] != e['hash'] and near(e['phash'], o['phash'])]
        prev.append(e); dup += bool(why)
        json.dump(dict(id=e['id'], ok=not why, why=why), open(p[:-5] + '.dedupe.json', 'w'))
        print(f"{e['id']:24} {'DUPLICATE ' + '; '.join(why) if why else 'unique'}")
    sys.exit(1 if dup else 0)

if __name__ == '__main__':
    main()
