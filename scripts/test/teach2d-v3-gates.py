#!/usr/bin/env python3
"""v3 gates (scripts/video/teach2d/v3_gates.py): viral_score >= 95 with every criterion scored, ypp reasons, registry == mix.py + characters.json. Green on a good fixture, red on each tamper."""
import copy, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import v3_gates as V
W = lambda t0, ws: [dict(w=w, s=round(t0 + i * 0.2, 2), e=round(t0 + i * 0.2 + 0.17, 2)) for i, w in enumerate(ws.split())]
def line(t0, text, **k): return dict(t0=t0, t1=t0 + 0.2 * len(text.split()), text=text, words=W(t0, text), **k)
T = dict(total=12.0, teacher='ama', voice='af_bella', host='rig', mix=dict(music='quiz-pulse'), cta=dict(area='phrases'), hook=dict(line='h', text='Test day. How did you do?'),
         lines=dict(h=line(0.1, 'Test day. How did you do?'), k=line(2.0, 'Ace! Really well on a test.'), e=line(4.0, 'I aced my history test today!'), q=line(6.5, 'Quick quiz. To ace a test is to do what?', quiz=True), c=line(10.0, 'Save this. Free on lexkite.com.')),
         nodes=[dict(id='a', type='card', in_=0, box=[0, 0, 1, 1], hook=True, **{'in': dict(t=-0.13)}), dict(id='b', type='card', box=[0, 0, 1, 1], **{'in': dict(t=2.0)}), dict(id='c', type='card', box=[0, 0, 1, 1], **{'in': dict(t=4.2)}),
                dict(id='d', type='card', box=[0, 0, 1, 1], **{'in': dict(t=6.4)}), dict(id='e', type='check', box=[0, 0, 1, 1], parent='d', **{'in': dict(t=8.5)}), dict(id='f', type='cta', box=[0, 0, 1, 1], lines=['Practice real phrases'], **{'in': dict(t=10.0)}),
                dict(id='g', type='text', box=[0, 0, 1, 1], runs=[['ace', 'coral']], parent='b', **{'in': dict(t=2.0)}), dict(id='h', type='pill', box=[0, 0, 1, 1], parent='d', **{'in': dict(t=6.5)})])
EP = dict(id='fx', lang='en', publish=dict(title='What does "ace" mean?', keyword='ace', value='Ace = do really well on a test. Example: I aced my history test today!'))
G = dict(pace=dict(wpm=105), end_card=dict(ok=True), cta=dict(ok=True))
r = V.viral_score(T, EP, G, 8, 6)
assert r['ok'] and r['score'] >= 95 and set(r['parts']) == set(V.WEIGHTS), r
assert sum(V.WEIGHTS.values()) == 100 and V.PASS == 95
def bad(mut, part):
    t, g = copy.deepcopy(T), copy.deepcopy(G); mut(t, g); x = V.viral_score(t, EP, g, 8, 6); assert not x['ok'] and x['parts'][part] < 100, (part, x); return x
bad(lambda t, g: t['lines']['h'].update(words=W(0.1, 'Test day how did you do today friend ok')), 'hook')                       # long hook, spoken late
bad(lambda t, g: t['nodes'][0].update({'in': dict(t=0.4)}), 'hook')                                                                    # no pop on frame 0
bad(lambda t, g: [n.update({'in': dict(t=n['in']['t'] + 30)}) for n in t['nodes'][1:]], 'retention')                                  # nothing happens for > 5 s
bad(lambda t, g: g.update(pace=dict(wpm=160)), 'pace')
bad(lambda t, g: g.update(end_card=dict(ok=False)), 'cta')
x = V.viral_score(T, EP, G, 3, 6); assert x['parts']['variation'] < 100, 'fewer looks than beats'
e2 = copy.deepcopy(EP); e2['publish']['title'] = 'x' * 70; assert V.viral_score(T, e2, G, 8, 6)['parts']['title'] < 100, 'title > 60 chars'
# ypp
pol = json.load(open(f'{ROOT}/content/video/teach2d/ypp.json'))
EPL = dict(id='fx', lang='en', lines=[dict(id='h', text='Test day. How did you do?'), dict(id='k', text='Ace! Really well on a test.')], data=dict(key='ace'), publish=EP['publish'])
sh = lambda ep, lang='en': (lang, V._shingles(V._script(ep)))
bank = dict(other=sh(dict(EPL, id='other')), ja=sh(dict(EPL, id='ja', lang='ja'), 'ja'))
y = V.ypp(T, EPL, pol, pol, bank); assert not y['ok'] and y['most_similar'] == 'other' and 'near-duplicate' in y['why'][0], y   # same-language copy is blocked
assert V.ypp(T, EPL, pol, pol, dict(ja=bank['ja']))['ok'], 'the same lesson in another page language is not a duplicate'
for k, v, w in [('synthetic_media_disclosure', False, 'disclosure'), ('made_for_kids', True, 'made-for-kids')]:
    p2 = dict(pol, **{k: v}); y = V.ypp(T, EPL, p2, p2, {}); assert not y['ok'] and any(w in z for z in y['why']), (k, y)
for k, v, w in [('mix', dict(music='stolen-track'), 'music'), ('voice', 'zz_voice', 'voice'), ('teacher', 'bob', 'teacher'), ('host', 'stock', 'footage')]:
    t = copy.deepcopy(T); t[k] = v; y = V.ypp(t, EPL, pol, pol, {}); assert not y['ok'] and any(w in z for z in y['why']), (k, y)
e3 = dict(EPL, publish=dict(EPL['publish'], value='short')); assert not V.ypp(T, e3, pol, pol, {})['ok'], 'no own educational value'
# registry == what the engine really uses
mix = open(f'{ROOT}/scripts/video/teach2d/mix.py').read(); assert json.loads(re.search(r"music=(\[[^\]]*\])", mix).group(1).replace("'", '"')) == pol['music'], 'ypp.json music == mix.py music'
ppl = json.load(open(f'{ROOT}/web/teach/characters.json'))['people']; assert sorted(pol['teachers']) == sorted(ppl) and sorted(pol['voices']) == sorted(p['voice']['video'] for p in ppl.values()), 'ypp.json teachers / voices == characters.json'
q = open(f'{ROOT}/scripts/video/teach2d/qc.py').read(); assert "gate('viral_score'" in q and "gate('ypp'" in q and "gate('native_script'" in q
print('teach2d-v3-gates: OK')
