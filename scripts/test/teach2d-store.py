#!/usr/bin/env python3
"""Teach2D store bridge (scripts/video/teach2d/store.py): only a clip through the gate reaches the store, index fields are complete, a re-run adds nothing.
python3 scripts/test/teach2d-store.py"""
import json, os, subprocess, sys, tempfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import store as S   # noqa: E402
fails = []; EP = 't2_call_mytreat'; LV = {'my': 'A1', 'treat': 'B1'}


def ok(c, m):
    if not c: fails.append(m)


Q = dict(score=97, ok=True, gates=dict(pace=dict(ok=True, wpm=120), caption_sync=dict(ok=True)))
with tempfile.TemporaryDirectory() as t:
    art, bank, repo, delta = f'{t}/art', f'{t}/bank', f'{t}/repo', f'{t}/d.json'; os.makedirs(bank); os.makedirs(f'{repo}/shorts')
    for fm, score in (('short', 97), ('wide', 95)):
        os.makedirs(f'{art}/tv-{EP}-{fm}-1'); json.dump(dict(Q, score=score), open(f'{art}/tv-{EP}-{fm}-1/qc.json', 'w'))
    for f in (f'{EP}-short.mp4', f'{EP}-wide.mp4', f'{EP}-poster.jpg'): open(f'{bank}/{f}', 'wb').write(b'x')
    subprocess.run(['git', 'init', '-q', repo], check=True)
    D = {EP: dict(state='banked', sha=dict(short='aa', wide='bb')), 'other': dict(state='failed', why=['x'])}
    json.dump(D, open(delta, 'w'))
    blocked = S.run_store(art, bank, delta, repo, 7, level_map={})
    d = json.load(open(delta))[EP]; ok(not blocked and d.get('publish_block') == ['cefr'] and not os.path.exists(f'{repo}/shorts/teach2d'), f'blocked clip must stay out and carry its reason: {d}')
    new = S.run_store(art, bank, delta, repo, 7, level_map=LV)
    ok(len(new) == 1 and 'publish_block' not in json.load(open(delta))[EP], 'clean clip must be stored and the old block cleared')
    idx = json.load(open(f'{repo}/shorts/index.json')); it = idx['items'][0]; base = S.base_of(EP); bd = f'shorts/teach2d/{EP}'
    want = dict(id=base, lesson=EP, scene='teach2d', format='teach2d', area='call', cefr='B1', lang='en', video=f'{bd}/{base}.mp4', cover=f'{bd}/{base}.jpg', wide=f'{bd}/{base}-wide.mp4')
    ok(all(it.get(k) == v for k, v in want.items()), f'index fields: {it}')
    ok(it['qa']['status'] == 'pass' and it['qa']['score'] == 95 and 'pace' in it['qa']['gates'] and it['publish']['keyword'] == 'my treat' and it['title'] and it['link'].endswith('#/call/coffee'), f'qa/publish: {it}')
    ok(__import__('re').fullmatch('[a-z0-9-]{3,120}', it['id']), 'id must fit CLIP of _social_auto.js')
    ok(not S.run_store(art, bank, delta, repo, 8, level_map=LV), 'same videos stored twice')
    import shorts_index as I
    p, n = I.full(repo); r = json.load(open(p))['items'][0]; ok(n == 1 and r['qa'].get('score') == 95 and r.get('publish') and r.get('wide'), f'full rebuild must keep Teach2D fields: {r}')
print('\n'.join(fails) if fails else 'teach2d-store: ok'); sys.exit(1 if fails else 0)
