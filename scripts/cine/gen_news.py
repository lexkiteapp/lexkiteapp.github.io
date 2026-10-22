#!/usr/bin/env python3
"""News-anchor lesson generator (owner 21/10: PRIMARY shorts format). 0 credits, 0 tokens per clip.
  python3 scripts/cine/gen_news.py [--n 24]            pick unused bank entries -> content/video/cine/news/<id>.json + lines.json + ledger
  python3 scripts/cine/gen_news.py --mark-rendered ID,ID RUN   (after qa_news ALL PASS; publish_pack.py then builds the packs)
Source = curated banks content/video/cine/news/bank.json (natural American English, one learning point per entry: situations per background
topic, grammar points, confusables, L1 mistakes, exam tips). Templates: three | fix | ab | ways | pov. Gates: hook <= 5 spoken words and the
hook card fits 84 px on one line, lines <= 12 words (A1/A2) / 14 (B1+), cards fit 52 px, estimated length 20-28 s, background chosen by topic
(must exist in anchor/bg/index.json), CTA = ecosystem deep link of the entry's area, no learning point twice (content/video/cine/used.json)."""
import json, os, re, sys, hashlib, argparse, glob
from PIL import ImageFont, ImageDraw, Image
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); D = f'{ROOT}/content/video/cine/news'; LEDGER = f'{ROOT}/content/video/cine/used.json'
ECO = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
FD = f'{ROOT}/brand/social/src/fonts'; FB = ImageFont.truetype(f'{FD}/BeVietnamPro-ExtraBold.ttf', 52); FS = ImageFont.truetype(f'{FD}/BeVietnamPro-ExtraBold.ttf', 40)
FL = ImageFont.truetype(f'{FD}/BricolageGrotesque-ExtraBold.ttf', 30); FH = ImageFont.truetype(f'{FD}/BricolageGrotesque-ExtraBold.ttf', 84); dr = ImageDraw.Draw(Image.new('RGB', (8, 8)))
TOPICS = {'classroom', 'meeting_room', 'exam_hall', 'library', 'kitchen', 'living_room', 'supermarket', 'clothing_store', 'pharmacy', 'waiting_room', 'metro_station', 'street_dusk',
          'park', 'gym', 'bank', 'hotel_room_night', 'airplane_cabin', 'beach_cafe', 'coffee_counter', 'restaurant_night', 'bookstore', 'post_office', 'taxi_interior'}   # anchor/bg/index.json
RECAP = {'three': "Teacher's tip: save these three phrases today.", 'fix': "Teacher's tip: screenshot this and say it right.", 'ab': "Teacher's tip: save this and pick the right one.", 'ways': "Teacher's tip: save all three and pick your style.", 'pov': "Teacher's tip: save these answers and say them aloud."}   # owner 22/10: spoken teacher's tip (recap shot <= 3.5 s)
END = ['Save this and practice it free on Lexkite.', 'Save this, then try the full lesson on Lexkite.', 'Save this and practice more on Lexkite.']   # loop line + save
LABELS = {'EXAMPLE', 'RULE', 'TIP', 'WHY', 'POV', 'POLITE', 'NEUTRAL', 'CASUAL', 'A', 'B', '?'}
norm = lambda s: re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip(); NW = lambda s: len(re.findall(r"[A-Za-z0-9']+", s))

BGT = json.load(open(f'{D}/bg_topics.json'))['domains']
def dom_hits(text):   # lesson domains whose keywords occur in the text (word start)
    t = text.lower(); return [d for d, v in BGT.items() if any(re.search(r'\b' + re.escape(k), t) for k in v['keywords'])]
TEACH = set(json.load(open(f'{D}/bg_topics.json')).get('teaching_areas', [])); TPOOL = json.load(open(f'{D}/bg_topics.json')).get('teaching_bg', [])
def bg_for(e, k=0):   # owner 22/10: grammar / vocab / pronunciation = TEACHER lessons -> classroom-type backgrounds (rotating); situational lessons keep their scene
    if e['area'] in TEACH and TPOOL: return TPOOL[k % len(TPOOL)]
    hits = dom_hits(' '.join([e['point'], ' '.join(e.get('series') or []), ' '.join(e['hook'])]))
    return e['topic'] if not hits or e['topic'] in BGT[hits[0]]['bg'] else BGT[hits[0]]['bg'][0]

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

HOOK_TYPES = ['question', 'mistake_callout', 'challenge', 'myth', 'pov', 'quiz', 'contrast', 'number_list', 'secret_tip', 'story', 'surprise', 'fill_gap', 'listen_diff', 'native_says']   # >= 12, rotated
DIFF_CYCLE = ['easy', 'medium', 'easy', 'medium', 'hard']   # 40 % easy / 40 % medium / 20 % hard challenge
def make_v7(spec, lines, z, h6):
    """owner 22/10 (VIDEO-SCALE-PLAN §12-14 + graded English): wrong -> guess (pause) -> right (say + show + formula + icon) -> why <= 12 words ->
    concept check -> Repeat after me (slow, pause) -> natural speed; Teacher's tip 3 lines, share trigger, end quiz. z = bank entry field 'v7'."""
    key = z['key']; ic = z.get('icon', 'bulb')
    B = [('ama', 'm', z['mistake'], dict(kind='x', text=z['wrong'], sub=None, label=None, icon=None), {}),
         ('carlos', 'g', z['guess'], dict(kind='p', text=z.get('guesscard', 'What sounds right?'), sub=None, label='GUESS', icon='question'), {'guess': True}),
         ('ama', 'k', 'Say: ' + key, dict(kind='v', text=key, sub=None, label=None, icon=ic, formula=z.get('formula')), {}),
         ('carlos', 'y', z['why'], dict(kind='p', text=z['why'], sub=None, label='WHY', icon='bulb'), {}),
         ('ama', 'c', z['check'], dict(kind='p', text=z['checkcard'], sub=None, label='CHECK', icon=None), {}),
         ('carlos', 'rs', 'Repeat after me: ' + key, dict(kind='p', text=key, sub=None, label='REPEAT', icon='repeat'), {'repeat': True, 'slow': True}),
         ('ama', 'rn', 'Natural speed: ' + key, dict(kind='v', text=key, sub=None, label=None, icon=ic, formula=z.get('formula')), {})]
    bs = []
    for who, suf, text, card, ex in B:
        i = f'n_{h6}_{suf}'; l = dict(id=i, who=who, text=text)
        if ex.get('slow'): l['speed'] = 0.74
        lines.append(l); b = dict(who=who, line=i, card=card, kind=suf); b.update(ex); bs.append(b)
    if z.get('callback'): bs[0]['card']['sub'] = 'Remember: ' + z['callback']   # spaced callback to an earlier part of the series
    spec.update(v=7, difficulty=z['difficulty'], hook_type=z['hook_type'], part=z.get('part', 1), key_line=key, wrong_line=z['wrong'], share=z['share'], beats=bs, l1_tags=['many learners'])
    spec['recap'].update(title="TEACHER'S TIP", rows=z['rows'][:3]); lines.append(dict(id=f'n_{h6}_e', who='ama', text=z['quiz']))
def build(e, k):
    h6 = hashlib.sha1(norm(e['point']).encode()).hexdigest()[:6]; lid = f"news_{e['topic']}_{e['t']}_{h6}"; errs = []
    assert e['topic'] in TOPICS and e['area'] in ECO and e['t'] in RECAP, e['point']
    lim = 12 if e['cefr'] in ('A1', 'A2') else 14; lines = [dict(id=f'n_{h6}_h', who='ama', text=e['hook'][1])]
    if NW(e['hook'][1]) > 5: errs.append('hook > 5 words')
    if 'v7' not in e: errs.append('needs the v7 teacher fields (key, wrong, mistake, guess, why, check, checkcard, formula, icon, rows, quiz, share, hook_type, difficulty)')
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
    spec = dict(id=lid, template=e['t'], bg=bg_for(e, k), area=e['area'], cefr=e['cefr'], point=e['point'], hook=dict(card=e['hook'][0], line=f'n_{h6}_h'),
                series=e['series'], beats=beats, recap=dict(title="TEACHER'S TIP", line=f'n_{h6}_r', rows=e['rows']), end_line=f'n_{h6}_e',
                link=ECO[e['area']]['link'], cta=ECO[e['area']]['cta'], est=round(est, 1))
    if 'v7' in e: make_v7(spec, lines, e['v7'], h6); lines[:] = [l for l in lines if l['id'] != f'n_{h6}_e' or l['text'] == e['v7']['quiz']]
    teacherize(spec, lines, h6)
    spec['recap']['line_alt'] = f'n_{h6}_r2'; spec['end_alt'] = f'n_{h6}_e2'; lines += [dict(id=f'n_{h6}_r2', who='ama', text=RECAP[e['t']]), dict(id=f'n_{h6}_e2', who='carlos', text=e['v7']['quiz'] if 'v7' in e else END[k % len(END)])]
    return lid, spec, lines, errs

def teacherize(spec, lines, h6):
    """owner 22/10: TEACHER persona. Recap card = Teacher's tip; a 'Repeat after me' beat (line + >= 1.6 s pause) when the lesson has a short model
    phrase; the self-intro 'I'm Ama, your American English teacher.' in ~1 of 4 clips (hash-rotated)."""
    spec['recap']['title'] = "TEACHER'S TIP"; bs = spec['beats']
    if not any(b.get('repeat') for b in bs):
        cs = [b['card'] for b in bs if b.get('card') and b['card']['kind'] == 'v'] + [b['card'] for b in bs if b.get('card') and b['card']['kind'] == 'p' and b['card'].get('label') not in ('COMMENT', 'A', 'B')]
        ph = next((c['text'] for c in cs if '?' not in c['text'] and 2 <= NW(c['text']) <= 8 and not re.search(r'[/=]|\.\.\.|…|\b(but|for|to|a|the)\W*$', c['text'])), None)
        if ph:
            who = 'carlos' if bs[-1]['who'] == 'ama' else 'ama'; ph = ph[0].upper() + ph[1:].rstrip('.!') + '.'
            lines.append(dict(id=f'n_{h6}_rp', who=who, text=f'Repeat after me: {ph}'))
            bs.append(dict(who=who, line=f'n_{h6}_rp', card=dict(kind='p', text=ph, sub=None, label='REPEAT'), repeat=True))
    if int(h6, 16) % 4 == 0 and not spec.get('no_intro') and not any(b.get('intro') for b in bs):   # no_intro: spaced out in the calendar by hand
        lines.append(dict(id=f'n_{h6}_in', who='ama', text="I'm Ama, your American English teacher."))
        bs.insert(0, dict(who='ama', line=f'n_{h6}_in', card=None, intro=True))
        lines.append(dict(id=f'n_{h6}_in2', who='carlos', text="And I'm Carlos, your English coach.")); bs.insert(1, dict(who='carlos', line=f'n_{h6}_in2', card=None, intro2=True))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--n', type=int, default=24); ap.add_argument('--mark-rendered', nargs=2); ap.add_argument('--check', action='store_true'); ap.add_argument('--teacherize', action='store_true'); o = ap.parse_args()
    L = json.load(open(LEDGER))
    if o.mark_rendered:
        ids, run = o.mark_rendered
        for p in L['points'].values():
            if p.get('scene') == 'news' and p['id'] in ids.split(','): p['status'] = 'rendered'; p['run'] = int(run)
        json.dump(L, open(LEDGER, 'w'), ensure_ascii=False, indent=1); return
    bank = json.load(open(f'{D}/bank.json'))['items']; lp = f'{D}/lines.json'
    LJ = json.load(open(lp)) if os.path.exists(lp) else dict(voices={'ama': 'af_bella', 'carlos': 'am_fenrir'}, speed=0.88, lines=[])
    if o.teacherize:   # migrate already generated lessons to the teacher persona (same ids; new lines get voiced on CI)
        have = {l['id'] for l in LJ['lines']}
        for f in sorted(glob.glob(f'{D}/news_*.json')):
            sp = json.load(open(f)); new = []; teacherize(sp, new, sp['hook']['line'][2:8])
            json.dump(sp, open(f, 'w'), ensure_ascii=False, indent=1); LJ['lines'] += [l for l in new if l['id'] not in have]
            print(sp['id'], 'repeat' if any(b.get('repeat') for b in sp['beats']) else '-', 'intro' if any(b.get('intro') for b in sp['beats']) else '')
        json.dump(LJ, open(lp, 'w'), ensure_ascii=False, indent=1); return
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
