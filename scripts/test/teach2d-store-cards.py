#!/usr/bin/env python3
"""Slang Card carousel in the Teach2D store bridge (store.py): a slang episode with a passing cards.json gets JPEG cards + its OWN index item (id <reel>-cards, format carousel,
cards_ok, first_comment, same publish metadata); the reel item only points at it; a failing cards gate / non-slang episode stores no carousel; full index rebuild keeps it.
python3 scripts/test/teach2d-store-cards.py"""
import json, os, subprocess, sys, tempfile
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import store as S   # noqa: E402
import autopub_gate as _G   # noqa: E402
from PIL import Image   # noqa: E402
_G.AT.status = lambda tid, engine=None: 'approved'
fails = []; EP = 't2_call_mytreat'; LV = {'my': 'A1', 'treat': 'B1'}; REAL_EPS = S.EPS


def ok(c, m):
    if not c: fails.append(m)


def run(cards_ok, template):
    with tempfile.TemporaryDirectory() as t:
        art, bank, repo, delta, eps = f'{t}/art', f'{t}/bank', f'{t}/repo', f'{t}/d.json', f'{t}/eps'; os.makedirs(bank); os.makedirs(eps); os.makedirs(f'{repo}/shorts')
        ep = json.load(open(f'{REAL_EPS}/{EP}.json')); ep['template'] = template; json.dump(ep, open(f'{eps}/{EP}.json', 'w'))
        Q = dict(score=97, ok=True, gates=dict(pace=dict(ok=True, wpm=120)))
        for fm in ('short', 'wide'): os.makedirs(f'{art}/tv-{EP}-{fm}-1'); json.dump(Q, open(f'{art}/tv-{EP}-{fm}-1/qc.json', 'w'))
        d = f'{art}/tv-{EP}-short-1'; names = []
        for i in (1, 2, 3): Image.new('RGB', (1080, 1080), (30, 40, 90)).save(f'{d}/{EP}-card{i}.png'); names.append(f'{EP}-card{i}.png')
        json.dump(dict(ep=EP, ok=cards_ok, files=names, gates={}, caption='Salty = annoyed.\n\nLink in bio.', hashtags=['#englishslang'], first_comment='Quiz answer: annoyed. {link}'), open(f'{d}/cards.json', 'w'))
        for f in (f'{EP}-short.mp4', f'{EP}-wide.mp4', f'{EP}-poster.jpg'): open(f'{bank}/{f}', 'wb').write(b'x')
        subprocess.run(['git', 'init', '-q', repo], check=True); json.dump({EP: dict(state='banked', sha=dict(short='aa', wide='bb'))}, open(delta, 'w'))
        S.EPS = eps
        try: S.run_store(art, bank, delta, repo, 7, level_map=LV)
        finally: S.EPS = REAL_EPS
        import shorts_index as I
        I.full(repo)   # a full rebuild from meta.json must keep the carousel item
        items = json.load(open(f'{repo}/shorts/index.json'))['items']; ex = {i['id']: [os.path.exists(f'{repo}/{c}') for c in i.get('cards', [])] for i in items}
        fmt = Image.open(f'{repo}/{items[0]["cards"][0]}').format if items and items[0].get('cards') else None
        return items, ex, fmt


base = S.base_of(EP); items, ex, fmt = run(True, 'slang'); by = {i['id']: i for i in items}
ok(set(by) == {base, base + '-cards'}, f'slang + gate ok -> reel + carousel items: {list(by)}')
c = by.get(base + '-cards', {}); r = by.get(base, {})
ok(c.get('format') == 'carousel' and c.get('cards_ok') is True and len(c.get('cards', [])) == 3 and all(x.endswith('.jpg') for x in c.get('cards', [])) and all(ex.get(base + '-cards', [])), f'carousel item fields: {c}')
ok(c.get('first_comment', '').startswith('Quiz answer') and c.get('description', '').startswith('Salty') and c['qa']['status'] == 'pass' and c.get('title') and c.get('point') and not c.get('video'), 'caption/first comment/publish metadata, no video')
ok(r.get('carousel') == base + '-cards' and r.get('cards') == [f'{base}-card{i}.jpg' for i in (1, 2, 3)] and r.get('video') and r.get('format') == 'teach2d', f'reel entry only points at its carousel: {r}')
ok(fmt == 'JPEG', 'cards stored as JPEG (Instagram carousel = JPEG only)')
items, _, _ = run(False, 'slang'); ok(len(items) == 1 and 'cards' not in items[0], 'failing cards gate -> reel only')
items, _, _ = run(True, 'call'); ok(len(items) == 1 and 'cards' not in items[0], 'non-slang episode -> no carousel')
print('\n'.join(fails) if fails else 'teach2d-store-cards: ok'); sys.exit(1 if fails else 0)
