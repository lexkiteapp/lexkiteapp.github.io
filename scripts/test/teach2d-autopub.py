#!/usr/bin/env python3
"""Teach2D auto-publish gate: one red and one green case per reason (scripts/video/teach2d/autopub_gate.py); real episodes stay publishable.
python3 scripts/test/teach2d-autopub.py"""
import copy, glob, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import autopub_gate as A   # noqa: E402
fails = []
AREAS = A.areas(); EP = json.load(open(f'{ROOT}/content/video/teach2d/eps/t2_call_mytreat.json')); LV = {'my': 'A1', 'treat': 'B1'}
Q = dict(score=100, ok=True, gates=dict(pace=dict(ok=True, wpm=120), caption_sync=dict(ok=True)))
BASE = dict(ep=EP, entry=dict(sha=dict(short='aa', wide='bb')), qc=dict(short=Q, wide=Q), levels=LV, area_map=AREAS, posted=[])


def run(**kw): return A.gate(**copy.deepcopy(dict(BASE, **kw)))


def expect(name, reason, **kw):
    r = run(**kw)
    if reason not in r['why'] or r['ok']: fails.append(f'{name}: want {reason}, got {r}')


def mut(f):
    e = copy.deepcopy(EP); f(e); return e


g = run()
if not g['ok'] or g['cefr'] != 'B1': fails.append(f'clean clip blocked: {g}')
low = dict(Q, score=89); bad = dict(Q, gates=dict(Q['gates'], caption_sync=dict(ok=False)), ok=False)
expect('qc short', 'qc<90:short', qc=dict(short=low, wide=Q)); expect('qc wide', 'qc<90:wide', qc=dict(short=Q, wide=low)); expect('no render', 'qc<90:wide', qc=dict(short=Q))
expect('gate', 'gate:caption_sync', qc=dict(short=bad, wide=Q))
expect('lang', 'lang≠en', ep=mut(lambda e: e.update(lang='vi')))
expect('teacher', 'teacher∉{ama,carlos}', ep=mut(lambda e: e.update(teacher='mei')))
expect('wpm', 'wpm>150', qc=dict(short=dict(Q, gates=dict(pace=dict(ok=True, wpm=151))), wide=Q))
expect('publish', 'publish:title-length:0', ep=mut(lambda e: e['publish'].update(title='')))
expect('topic keyword', 'topic', ep=mut(lambda e: e['publish'].update(keyword='umbrella')))
expect('topic route', 'topic', ep=mut(lambda e: e['cta'].update(route='#/nowhere/x')))
expect('topic area', 'topic', ep=mut(lambda e: e.update(area='no-such-area')))
expect('cefr missing', 'cefr', levels={})
expect('cefr mismatch', 'cefr', ep=mut(lambda e: e.update(cefr='A1')))
expect('dup sha', 'dup', posted=[dict(id='x', sha=dict(short='aa'))])
expect('dup title', 'dup', posted=[dict(id='x', title=EP['publish']['title'].upper())])
if not run(posted=[dict(id=EP['id'], sha=dict(short='aa'), title=EP['publish']['title'])])['ok']: fails.append('a clip is a duplicate of itself')
if not run(posted=[dict(id='x', sha=dict(short='zz'), title='Another title')])['ok']: fails.append('unrelated posted clip blocks')
if A.has_words('treat', 'a treatment plan') or not A.has_words('my treat', 'Is it “My Treat”?'): fails.append('keyword match must be whole words')
for f in sorted(glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json')):   # the route check must fit every real episode, or the bridge silently publishes nothing
    ep = json.load(open(f)); a = AREAS.get(ep['area'])
    if not a or A.route_seg(ep['cta']['route']) != A.route_seg(a['route']): fails.append(f"{ep['id']}: {ep['area']} → {ep['cta']['route']}")
print('\n'.join(fails[:40]) if fails else 'teach2d-autopub: ok'); sys.exit(1 if fails else 0)
