#!/usr/bin/env python3
"""News-anchor lesson generator (owner 21/10: PRIMARY shorts format). 0 credits, 0 tokens per clip.
  python3 scripts/cine/gen_news.py [--n 24]            pick unused bank entries -> content/video/cine/news/<id>.json + lines.json + ledger
  python3 scripts/cine/gen_news.py --mark-rendered ID,ID RUN   (after qa_news ALL PASS; publish_pack.py then builds the packs)
Source = curated banks content/video/cine/news/bank.json (natural American English, one learning point per entry: situations per background
topic, grammar points, confusables, L1 mistakes, exam tips). Templates: three | fix | ab | ways | pov. Gates: hook <= 5 spoken words and the
hook card fits 84 px on one line, lines <= 12 words (A1/A2) / 14 (B1+), cards fit 52 px, estimated length 20-28 s, background chosen by topic
(must exist in anchor/bg/index.json), CTA = ecosystem deep link of the entry's area, no learning point twice (content/video/cine/used.json)."""
import json, os, re, sys, hashlib, argparse
from PIL import ImageFont, ImageDraw, Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); D = f'{ROOT}/content/video/cine/news'; LEDGER = f'{ROOT}/content/video/cine/used.json'
ECO = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
FD = f'{ROOT}/brand/social/src/fonts'; FB = ImageFont.truetype(f'{FD}/BeVietnamPro-ExtraBold.ttf', 52); FS = ImageFont.truetype(f'{FD}/BeVietnamPro-ExtraBold.ttf', 40)
FL = ImageFont.truetype(f'{FD}/BricolageGrotesque-ExtraBold.ttf', 30); FH = ImageFont.truetype(f'{FD}/BricolageGrotesque-ExtraBold.ttf', 84); dr = ImageDraw.Draw(Image.new('RGB', (8, 8)))
TOPICS = {'classroom', 'meeting_room', 'exam_hall', 'library', 'kitchen', 'living_room', 'supermarket', 'clothing_store', 'pharmacy', 'waiting_room', 'metro_station', 'street_dusk',
          'park', 'gym', 'bank', 'hotel_room_night', 'airplane_cabin', 'beach_cafe', 'coffee_counter', 'restaurant_night', 'bookstore', 'post_office', 'taxi_interior'}   # anchor/bg/index.json
RECAP = {'three': 'Save these three phrases.', 'fix': 'Screenshot this one.', 'ab': 'Save this for later.', 'ways': 'Save all three.', 'pov': 'Save these answers.'}
END = ['Practice it free on Lexkite.', 'Try the full lesson on Lexkite.', 'More free practice on Lexkite.']
LABELS = {'EXAMPLE', 'RULE', 'TIP', 'WHY', 'POV', 'POLITE', 'NEUTRAL', 'CASUAL', 'A', 'B', '?'}
norm = lambda s: re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip(); NW = lambda s: len(re.findall(r"[A-Za-z0-9']+", s))

def card(t, i, c, n):
    """bank card [text, sub|LABEL] -> card_one args (kind, text, sub, label) + width check at 52 px (news.py card_one geometry)."""
    text, x = c; sub = None
    if t == 'three': kind, label, sub = 'p', f'#{n}', x
    elif x in LABELS: kind, label = 'p', {'?': 'COMMENT'}.get(x, x)
    elif x is None: kind, label = 'x', None
    else: kind, label, sub = 'v', None, x
    tx = 46 + dr.textlength(label, font=FL) + 32 if kind == 'p' else 112
    room = 960 - 30 - tx; errs = []
    if dr.textlength(text, font=FB) > room: errs.append(f'card "{text}" {dr.textlength(text, font=FB):.0f} > {room:.0f} px at 52')
    if sub and dr.textlength(sub, font=FS) > room: errs.append(f'sub "{sub}" too wide at 40')
    return dict(kind=kind, text=text, sub=sub, label=label), errs

def build(e, k):
    h6 = hashlib.sha1(norm(e['point']).encode()).hexdigest()[:6]; lid = f"news_{e['topic']}_{e['t']}_{h6}"; errs = []
    assert e['topic'] in TOPICS and e['area'] in ECO and e['t'] in RECAP, e['point']
    lim = 12 if e['cefr'] in ('A1', 'A2') else 14; lines = [dict(id=f'n_{h6}_h', who='ama', text=e['hook'][1])]
    if NW(e['hook'][1]) > 5: errs.append('hook > 5 words')
    if dr.textlength(e['hook'][0], font=FH) > 920 - 72: errs.append(f'hook card "{e["hook"][0]}" too wide')
    beats = []; n = 0
    for i, (say, c) in enumerate(e['beats']):
        who = ('ama', 'carlos')[i % 2]; lid_ = f'n_{h6}_{i + 1}'; lines.append(dict(id=lid_, who=who, text=say))
        if NW(say) > lim: errs.append(f'line > {lim} words: {say}')
        cd = None
        if c: n += 1; cd, ce = card(e['t'], i, c, n); errs += ce
        beats.append(dict(who=who, line=lid_, card=cd))
    lines += [dict(id=f'n_{h6}_r', who='carlos', text=RECAP[e['t']]), dict(id=f'n_{h6}_e', who='ama', text=END[k % len(END)])]
    est = 1.8 + sum(0.55 + NW(l['text']) / 2.55 for l in lines[1:-2]) + 2.86 + 0.55 + NW(lines[-1]['text']) / 2.55 + 1.0
    if not 20 <= est <= 28: errs.append(f'estimated {est:.1f} s outside 20-28')
    if e['t'] == 'three': dr_ = [r for r in e['rows']]
    spec = dict(id=lid, template=e['t'], bg=e['topic'], area=e['area'], cefr=e['cefr'], point=e['point'], hook=dict(card=e['hook'][0], line=f'n_{h6}_h'),
                series=e['series'], beats=beats, recap=dict(title='SAVE THIS', line=f'n_{h6}_r', rows=e['rows']), end_line=f'n_{h6}_e',
                link=ECO[e['area']]['link'], cta=ECO[e['area']]['cta'], est=round(est, 1))
    return lid, spec, lines, errs

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--n', type=int, default=24); ap.add_argument('--mark-rendered', nargs=2); ap.add_argument('--check', action='store_true'); o = ap.parse_args()
    L = json.load(open(LEDGER))
    if o.mark_rendered:
        ids, run = o.mark_rendered
        for p in L['points'].values():
            if p.get('scene') == 'news' and p['id'] in ids.split(','): p['status'] = 'rendered'; p['run'] = int(run)
        json.dump(L, open(LEDGER, 'w'), ensure_ascii=False, indent=1); return
    bank = json.load(open(f'{D}/bank.json'))['items']; lp = f'{D}/lines.json'
    LJ = json.load(open(lp)) if os.path.exists(lp) else dict(voices={'ama': 'af_bella', 'carlos': 'am_fenrir'}, speed=0.92, lines=[])
    have = {l['id'] for l in LJ['lines']}; made = bad = 0
    for k, e in enumerate(bank):
        key = norm(e['point']); lid, spec, lines, errs = build(e, k)
        if errs: bad += 1; print('REJECT', lid, '; '.join(errs)); continue
        if o.check: continue
        if key in L['points'] and L['points'][key].get('status') != 'generated': continue
        if made >= o.n: break
        json.dump(spec, open(f'{D}/{lid}.json', 'w'), ensure_ascii=False, indent=1); LJ['lines'] += [l for l in lines if l['id'] not in have]; have |= {l['id'] for l in lines}
        L['points'][key] = dict(id=lid, point=e['point'], scene='news', template=e['t'], area=e['area'], cefr=e['cefr'], topic=e['topic'], status='generated', est=spec['est']); made += 1
        print(f"{lid:42s} {e['t']:5s} {e['topic']:16s} est {spec['est']:4.1f}s  {e['point']}")
    if not o.check:
        json.dump(LJ, open(lp, 'w'), ensure_ascii=False, indent=1); json.dump(L, open(LEDGER, 'w'), ensure_ascii=False, indent=1)
    print(f'{made} generated, {bad} rejected')
    if bad: sys.exit(1)

if __name__ == '__main__': main()
