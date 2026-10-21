#!/usr/bin/env python3
"""Publishing packs for rendered auto cine lessons (docs/VIDEO-SYSTEM-PLAN.md item 6). 0 tokens / 0 credits.

  python3 scripts/cine/publish_pack.py [--start 2026-10-22]

For every ledger point with status 'rendered' (content/video/cine/used.json, set by gen_lessons.py --mark-rendered after qa5 ALL PASS):
  content/video/cine/publish/<id>.json  title (<= 60 chars, hook-style, built only from the lesson's own text), description (2-3 lines +
  "Practice free on lexkite.com" + feature deep link with per-platform UTM), 5-8 hashtags, TikTok/Reels/Shorts variants, video + cover path
  (CI artifact cine-<scene>-<run>), posting slot.
  content/video/cine/publish/calendar.json  2 posts/day, scenes rotate (never the same scene twice in a row), templates spread.
Posting itself needs the owner's accounts (not automated here).
"""
import json, os, re, ast, glob, argparse, datetime as dt
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AUTO = f'{ROOT}/content/video/cine/auto'; OUT = f'{ROOT}/content/video/cine/publish'
ECO = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
PLACE = {'cafe': 'coffee shop', 'hotel': 'hotel', 'airport': 'airport', 'restaurant': 'restaurant'}
SCENE_TAG = {'cafe': '#coffeeshopenglish', 'hotel': '#hotelenglish', 'airport': '#airportenglish', 'restaurant': '#restaurantenglish'}
TPL_TAGS = {'mistake': ['#commonmistakes', '#englishgrammar'], 'fix': ['#commonmistakes', '#englishgrammar'], 'choose': ['#listeningpractice', '#englishlistening'],
            'quiz': ['#englishquiz', '#speakpolitely'], 'gap': ['#englishvocabulary', '#fillintheblank'], 'ladder': ['#politeenglish', '#englishphrases'],
            'pov': ['#englishconversation', '#roleplay'], 'speak': ['#speakenglish', '#pronunciation'], 'series': ['#englishconversation', '#smalltalk']}
BROAD = ['#learnenglish', '#englishtips', '#travelenglish']
PLAT = {'tiktok': dict(tags=6, cap=150), 'reels': dict(tags=8, cap=300), 'shorts': dict(tags=5, cap=500)}
SLOTS = ['11:30', '20:00']; TZ = 'Asia/Ho_Chi_Minh'   # lunch + evening peak for the main (Asian) learner audience

def lesson(sc, lid):
    src = open(f'{AUTO}/{sc}/{lid}.py').read(); g = lambda k: (re.search(rf"^{k} = (.+)$", src, re.M) or [None, None])[1]
    meta = ast.literal_eval(g('META')); tpl = re.search(r'template (\w+)', src)[1]; point = re.search(r'point "(.*)"', src)[1]
    recap = ast.literal_eval(re.search(r"^vend\(('(?:[^'\\]|\\.)*'|\"[^\"]*\")", src, re.M)[1])
    lines = {x['id']: x['text'] for x in json.load(open(f'{AUTO}/{sc}/lines.json'))['lines']}
    talks = re.findall(r"^talk\('(\w+)', \w+, (?:'ama'|BW), '(\w+)'", src, re.M); T = {sid: lines.get(k, '') for sid, k in talks}
    Q = ast.literal_eval(g('Q')) if g('Q') else ''; ST = ast.literal_eval(g('STRIKE')) if g('STRIKE') else None
    return dict(tpl=tpl, point=point, meta=meta, recap=recap, T=T, Q=Q, ST=ST, series=re.search(r"SERIES = '([^']*)'", src)[1])

def fit(*opts):
    for o in opts:
        if o and len(o) <= 60: return o
    return opts[-1][:57].rstrip() + '...'

def title(sc, x):
    t, T, P = x['tpl'], x['T'], PLACE[sc].title()
    if t == 'mistake': return fit(f'Spot the mistake: "{T["wrong"]}"', f'Can you spot the mistake? {P} English')
    if t == 'fix': return fit(f'Stop saying "{T["wrong"]}"', f'Don\'t say "{x["ST"][0]}" here. Say "{x["ST"][1]}"')
    if t == 'choose':
        q, *o, a = x['Q'].split('|'); return fit(f'{q} Listen once and choose!', f'One listen: can you catch it? {P} English')
    if t == 'quiz':
        q, a, b, ans = x['Q'].split('|'); return fit(f'{q} "{a}" or "{b}"', f'{q} {P} English quiz')
    if t == 'gap': return fit(f'One word is missing: "{x["meta"]["pattern"]}"', f'Guess the missing word ({P} English)')
    if t == 'ladder': return fit(f'3 ways to ask for {x["point"].replace("polite request ", "")} in English', f'3 polite ways to ask at the {PLACE[sc]}')
    if t == 'pov': return fit(f'POV: "{T["q1"]}" What do you say?', f'POV: you are at the {PLACE[sc]}. Answer this!')
    if t == 'speak': return fit(f'Say this at the {PLACE[sc]}: "{T["model"]}"', f'Say it with me: "{T["model"]}"', f'Useful {P} English phrase')
    if t == 'series': return fit(f'"{T["q"]}" How would you answer?', f'Real {P} English: what would you say?')
    return f'{P} English'

def desc_lines(sc, x):
    t, T = x['tpl'], x['T']; where = f'at the {PLACE[sc]}'
    first = {'mistake': f'A learner says "{T.get("wrong", "")}" {where}. The fix: "{T.get("right", "")}"',
             'fix': f'Not "{x["ST"][0] if x["ST"] else ""}". Say: "{x["recap"]}"',
             'choose': f'Listen once {where} and pick the right answer. Answer: "{x["recap"]}"',
             'quiz': f'Which one would you say {where}? Model answer: "{x["recap"]}"',
             'gap': f'Fill in the missing word, then say the full sentence: "{x["recap"]}"',
             'ladder': f'Polite, neutral and casual ways to ask {where}. Most polite: "{x["recap"]}"',
             'pov': f'You are {where}. One natural answer: "{x["recap"]}"',
             'speak': f'Say it out loud with Ama {where}: "{x["recap"]}"',
             'series': f'A real mini conversation {where}. Ama says: "{x["recap"]}"'}[t]
    return [first, f'Comment your answer below and follow for daily English ({x["series"]}).']

def utm(link, plat, sc, lid):
    base, _, frag = link.partition('#'); q = f'utm_source={plat}&utm_medium=social&utm_campaign=cine_{sc}&utm_content={lid}'
    return f'{base}{"&" if "?" in base else "?"}{q}' + (f'#{frag}' if frag else '')

def tags(sc, x, n):
    tg = [BROAD[0], BROAD[1], SCENE_TAG[sc]] + TPL_TAGS[x['tpl']] + [BROAD[2], '#esl', '#englishlearning']
    out = list(dict.fromkeys(tg)); return out[:max(5, min(8, n))]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--start', default=(dt.date.today() + dt.timedelta(days=1)).isoformat()); o = ap.parse_args()
    L = json.load(open(f'{ROOT}/content/video/cine/used.json'))['points']; os.makedirs(OUT, exist_ok=True)
    rows = sorted((p for p in L.values() if p.get('status') == 'rendered' and p.get('scene') in PLACE), key=lambda p: (p['scene'], p['id']))
    packs = {}
    for p in rows:
        sc, lid = p['scene'], p['id']; x = lesson(sc, lid); eco = ECO[x['meta']['area']]; name = f'cine-{lid.replace("_", "-")}-en-v3'
        ti = title(sc, x); assert len(ti) <= 60, ti; dl = desc_lines(sc, x); art = f'cine-{sc}-{p.get("run", "?")}'
        plats = {}
        for pl, cfg in PLAT.items():
            link = utm(eco['link'], {'reels': 'instagram', 'shorts': 'youtube'}.get(pl, pl), sc, lid); tg = tags(sc, x, cfg['tags'])
            if pl == 'shorts': tg = ['#shorts'] + tg[:4]
            d = dl if pl != 'tiktok' else dl[:1]
            plats[pl] = dict(title=ti if pl != 'shorts' else fit(ti + ' #shorts', ti), caption='\n'.join(d + ['Practice free on lexkite.com', link]), link=link, hashtags=tg,
                             caption_with_tags='\n'.join(d + ['Practice free on lexkite.com', link, ' '.join(tg)]))
        packs[lid] = dict(id=lid, scene=sc, template=x['tpl'], area=x['meta']['area'], cefr=x['meta']['cefr'], point=x['point'], series=x['series'],
                          title=ti, description='\n'.join(dl + ['Practice free on lexkite.com', utm(eco['link'], 'social', sc, lid)]), hashtags=tags(sc, x, 7),
                          video=f'out/{name}.mp4', cover=f'out/covers/{name}.jpg', ci_artifact=art, run=p.get('run'), platforms=plats)
    # calendar: 2/day, never the same scene twice in a row, rotate templates inside each scene
    Q = {}
    for lid, pk in packs.items(): Q.setdefault(pk['scene'], []).append(pk)
    for sc, q in Q.items():   # interleave templates
        by = {}
        for pk in q: by.setdefault(pk['template'], []).append(pk)
        q[:] = []
        while any(by.values()):
            for t in sorted(by, key=lambda t: -len(by[t])):
                if by[t]: q.append(by[t].pop(0))
    order, last = [], None
    while any(Q.values()):
        c = [s for s in Q if Q[s] and s != last] or [s for s in Q if Q[s]]
        s = max(c, key=lambda s: (len(Q[s]), -list(PLACE).index(s))); order.append(Q[s].pop(0)); last = s
    d0 = dt.date.fromisoformat(o.start); cal = []
    for i, pk in enumerate(order):
        day = d0 + dt.timedelta(days=i // len(SLOTS)); slot = dict(date=day.isoformat(), time=SLOTS[i % len(SLOTS)], tz=TZ)
        packs[pk['id']]['slot'] = slot; cal.append(dict(n=i + 1, **slot, id=pk['id'], scene=pk['scene'], template=pk['template'], title=pk['title'], pack=f'content/video/cine/publish/{pk["id"]}.json'))
    assert all(a['scene'] != b['scene'] for a, b in zip(cal, cal[1:])), 'same scene twice in a row'
    for lid, pk in packs.items(): json.dump(pk, open(f'{OUT}/{lid}.json', 'w'), ensure_ascii=False, indent=1)
    json.dump(dict(updated=dt.date.today().isoformat(), per_day=len(SLOTS), slots=SLOTS, tz=TZ, rule='2/day, scenes rotate, never the same scene twice in a row',
                   platforms=list(PLAT), posts=cal), open(f'{OUT}/calendar.json', 'w'), ensure_ascii=False, indent=1)
    print(f'{len(packs)} packs, calendar {cal[0]["date"] if cal else "-"} -> {cal[-1]["date"] if cal else "-"}')

if __name__ == '__main__': main()
