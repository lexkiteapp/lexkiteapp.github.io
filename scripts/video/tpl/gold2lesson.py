#!/usr/bin/env python3
"""Gold script (content/video/scripts/gold/src/*.jsonl) -> template-1b lesson for render_tpl.py (docs/VIDEO-TEMPLATES.md §8-9).
One lesson:
  python3 scripts/video/tpl/gold2lesson.py <pid> --plate airport_gate --host carlos --clip gc4_talk_natural --area grammar-check \
      --series "AIRPORT ENGLISH" --formula "TOO + adjective" [--quote "too much"] [--hook-mode strong|soft] --out content/video/cine/news/tpl1b
All gold scripts (batch pipeline, §9):
  python3 scripts/video/tpl/gold2lesson.py --all [--out DIR]   -> one lesson per mappable script + <out>/plan.json (order, batches of 12,
  skipped scripts with the reason). Plate = topic/keyword match on tokens.PLATES, host = round robin over tokens.HOST_CLIPS.
Writes <out>/<id>.json (news 'fix' schema + plate/host/cta/quiz) and merges its lines into <out>/lines.json (one voice = the host).
Hook truth: every lesson starts as a STRONG-hook candidate ('Stop saying this.') with hook.judge = null. scripts/video/tpl/hook-judge.mjs
(Groq judge) then keeps the strong hook only when the learner line is a real error, rewrites it to a soft hook otherwise
('Americans usually say this.' / 'Sound more natural.') and rejects the lesson when the correction itself is wrong. qc_tpl gate hook_truth."""
import json, os, re, sys, glob, argparse, hashlib
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import PLATES, HOSTS, HOST_CLIPS, HOOKS
from hookquote import hook_quote   # the quoted phrase = the real wrong phrase (strong) / natural phrase (soft), never a correct fragment

def gold():
    G = {}
    for p in sorted(glob.glob(f'{ROOT}/content/video/scripts/gold/src/*.jsonl')):
        for l in open(p):
            if l.strip(): r = json.loads(l); G[r['p']] = r
    return G

def h6_of(pid): return hashlib.sha1(pid.encode()).hexdigest()[:6]

def hook_pick(pid, mode):
    """deterministic pick inside the strong / soft family -> (spoken line, display text)"""
    fam = HOOKS[mode]; return fam[int(h6_of(pid), 16) % len(fam)]

def lines_for(g, h6, host, hook_line, mode, cta):
    q_sent, (qa, qb) = g['q'][0], g['q'][1]
    pre, post = [s.strip() for s in q_sent.split('___')]; post = post.rstrip('.').strip()
    cap = lambda s: s[0].upper() + s[1:]
    guess = 'Pause and guess. What sounds right?' if mode == 'strong' else 'Pause and guess. What sounds better?'
    L = dict(h=hook_line, m=f"Many learners say: {g['w']}", g=guess, k=f"Say: {g['r']}", y=g['y'],
             rn=f"Now at normal speed: {g['r']}", r2="Teacher's tip: save these lines.",
             e=f"Quiz: {pre} blank{(' ' + post) if post else ''}{'' if post.endswith(('?', '!')) else '.'} {cap(qa)}, or {qb}? Comment below.", s=f'{cta}.')
    return [dict(id=f'n_{h6}_{k}', who=host, text=v) for k, v in L.items()], (pre, post, qa, qb)

def make(g, plate, host, clip, area, series, formula, quote=None, mode='strong', out=None, eco=None):
    if plate not in PLATES: raise SystemExit(f'plate {plate} is not in tokens.PLATES (human-checked clean plates)')
    if host not in HOSTS: raise SystemExit(f'host {host} not in tokens.HOSTS')
    eco = eco or {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
    A = eco.get(area) or sys.exit(f'unknown area {area}')
    h6 = h6_of(g['p']); lid = f"tpl1b_{plate}_{h6}"; cta = A['cta'].rstrip('.')
    hook_line, hook_disp = hook_pick(g['p'], mode)
    L, (pre, post, qa, qb) = lines_for(g, h6, host, hook_line, mode, cta)
    SP = dict(v=1, id=lid, template='fix', tpl='1b', source=dict(gold=g['p']), topic=g['t'], cefr=g['l'], area=area,
              plate=plate, host=host, clip=clip, hook=dict(line=f'n_{h6}_h', quote=quote or hook_quote(g['w'], g['r'], mode), kind=g['h'], mode=mode, display=hook_disp, judge=None),
              wrong_line=g['w'], key_line=g['r'], series=[series, formula],
              beats=[dict(kind='k', line=f'n_{h6}_k', card=dict(formula=formula)), dict(kind='y', line=f'n_{h6}_y', card=dict(text=g['y']))],
              recap=dict(rows=[g['r']] + g['e'][:2]), quiz=dict(pre=pre, post=post, a=qa, b=qb, answer=g['q'][2]),
              cta=dict(text=cta, link=A['link'], label=A['label']))
    out = out or f'{ROOT}/content/video/cine/news/tpl1b'
    os.makedirs(out, exist_ok=True)
    json.dump(SP, open(f'{out}/{lid}.json', 'w'), indent=1, ensure_ascii=False)
    return SP, L

def merge_lines(out, L_all):
    lp = f'{out}/lines.json'
    LJ = json.load(open(lp)) if os.path.exists(lp) else dict(voices={}, speed=0.88, lines=[])
    LJ['voices'].update({k: v['voice'] for k, v in HOSTS.items()})
    pre = {l['id'][:9] for l in L_all}
    LJ['lines'] = [l for l in LJ['lines'] if l['id'][:9] not in pre] + L_all
    json.dump(LJ, open(lp, 'w'), indent=1, ensure_ascii=False)

# ---------------------------------------------------------------- batch mapping (all 261 gold scripts)
AREA = {'u:p': 'grammar-check', 'u:a': 'grammar-check', 'u:s': 'grammar', 'u:v': 'verbs', 'u:c': 'word-usage', 'cf': 'roleplay',
        'w': 'phrases', 'm': 'word-usage', 'x': 'dictionary'}
# keyword (in the script text) -> plate; checked in order, then the topic default. A plate is used only when the script topic is in its tags.
KEYS = [(r'\b(hotel|room service|check[- ]?in|check[- ]?out|key card|minibar|reception|twin room|guest|disturb)\b', 'hotel_lobby'),
        (r'\b(flight|airport|boarding|gate|luggage|suitcase|passport|immigration|plane)\b', 'airport_gate'),
        (r'\b(coffee|latte|cafe|café|tea)\b', 'coffee_shop_day'),
        (r'\b(restaurant|menu|bill|waiter|order|dinner|table|dish|vegetarian)\b', 'restaurant_night'),
        (r'\b(meeting|agenda|presentation|present|slides?)\b', 'meeting_room'),
        (r'\b(laptop|computer|app|email|online|wifi|password|phone|software|latency)\b', 'coworking'),
        (r'\b(supermarket|grocer(y|ies)|checkout|self-checkout|cart|fruit|milk|bread)\b', 'supermarket'),
        (r'\b(kitchen|cook|cooking|fridge|dishes|oven)\b', 'kitchen'),
        (r'\b(library|book|books|read|reading)\b', 'library')]
TOPIC = dict(travel=['airport_gate', 'hotel_lobby'], food=['restaurant_night', 'restaurant_day', 'coffee_shop_day'],
             work=['office_open_plan', 'meeting_room', 'coworking'], exam=['exam_hall', 'library'], study=['library', 'exam_hall'],
             shopping=['clothing_store', 'supermarket'], health=['pharmacy'], home=['living_room', 'kitchen'], daily=['kitchen', 'living_room', 'park'],
             social=['coffee_shop_day', 'park', 'living_room'], tech=['coworking', 'office_open_plan'])

def skip_reason(g):
    if g['p'].startswith('p:'): return 'pronunciation script (stress pattern): TTS cannot voice the wrong stress'
    if '___' not in g['q'][0]: return 'quiz has no blank'
    if g['t'] not in TOPIC: return f"no human-checked scene plate for topic '{g['t']}' (bank/ATM plate rejected: wall signs)"
    return None

def plate_for(g, i):
    txt = ' '.join([g['w'], g['r'], g['y'], g['p']] + g['e']).lower()
    for rx, pl in KEYS:
        if re.search(rx, txt) and g['t'] in PLATES[pl]['tags']: return pl
    opts = TOPIC[g['t']]; return opts[i % len(opts)]

def short_formula(f, n=24):
    """series chip + formula card must fit one line: keep the first clause, then cut at a word boundary"""
    f = f.strip()
    if len(f) > n: f = re.split(r'[,;(]', f)[0].strip()
    if len(f) > n: f = f[:n].rsplit(' ', 1)[0].rstrip(' =+-')
    return f

def area_for(pid):
    k = ':'.join(pid.split(':')[:2]) if pid.startswith('u:') else pid.split(':')[0]
    return AREA.get(k, 'phrases')

def build_all(out, batch=12):
    G = gold(); eco = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
    prev = {}   # keep judge verdicts / rejections of an earlier run (hook-judge.mjs writes them into the lesson files)
    for f in glob.glob(f'{out}/tpl1b_*.json'):
        d = json.load(open(f)); prev[d['source']['gold']] = d
    NEEDS_FIX = {'p': 'phoneme-controlled TTS (Kokoro/espeak phoneme input or SSML <phoneme>) so the wrong stress can be voiced, then render as tpl1b', 'm': 'clean bank plates: add human-checked bank/ATM scene plates without wall signs/text (or inpaint the signs), register in tokens.PLATES'}   # owner 24/10: unrenderable scripts stay listed with a fix, never dropped
    hosts = list(HOST_CLIPS); order, skipped, L_all, k = [], [], [], 0
    for pid, g in G.items():
        why = skip_reason(g)
        if why: skipped.append(dict(gold=pid, topic=g['t'], reason=why, proposed_fix=NEEDS_FIX['p' if why.startswith('pronunciation') else 'm'])); continue
        pl = plate_for(g, k); host = hosts[k % len(hosts)]; k += 1
        old = prev.get(pid); mode = (old or {}).get('hook', {}).get('mode', 'strong') if old and old.get('plate') == pl else 'strong'
        SP, L = make(g, pl, host, HOST_CLIPS[host], area_for(pid), PLATES[pl]['series'], short_formula(g['m']), mode=mode, out=out, eco=eco)
        if old and old['id'] == SP['id'] and old['hook'].get('judge') and old['hook'].get('mode') == mode:   # same text -> keep the verdict
            SP['hook']['judge'] = old['hook']['judge']; SP['reject'] = old.get('reject')
            if not SP['reject']: SP.pop('reject')
            json.dump(SP, open(f"{out}/{SP['id']}.json", 'w'), indent=1, ensure_ascii=False)
        L_all += L; order.append(dict(id=SP['id'], gold=pid, topic=g['t'], plate=pl, host=host))
    merge_lines(out, L_all)
    for i, o_ in enumerate(order): o_['batch'] = i // batch + 1
    plan = dict(v=1, note='docs/VIDEO-TEMPLATES.md §9 – batch N = items with batch == N; video-tpl1b.yml renders one batch (<= 10 jobs) · needs_solution = gold scripts NOT rendered yet (never deleted) + the proposed fix',
                total_gold=len(G), lessons=len(order), batches=(len(order) + batch - 1) // batch, items=order, needs_solution=skipped)
    json.dump(plan, open(f'{out}/plan.json', 'w'), indent=1, ensure_ascii=False)
    print(f'{len(order)} lessons, {len(skipped)} needs-solution, {plan["batches"]} batches')
    return plan

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('pid', nargs='?'); ap.add_argument('--all', action='store_true'); ap.add_argument('--plate'); ap.add_argument('--host'); ap.add_argument('--clip')
    ap.add_argument('--area'); ap.add_argument('--series'); ap.add_argument('--formula')
    ap.add_argument('--quote', default=None); ap.add_argument('--hook-mode', default='strong', choices=['strong', 'soft'])
    ap.add_argument('--out', default=f'{ROOT}/content/video/cine/news/tpl1b')
    o = ap.parse_args()
    if o.all: build_all(o.out); sys.exit(0)
    g = gold().get(o.pid) or sys.exit(f'gold script not found: {o.pid}')
    SP, L = make(g, o.plate, o.host, o.clip, o.area, o.series, o.formula, o.quote, o.hook_mode, o.out)
    merge_lines(o.out, L)
    print(SP['id'], '|', g['w'], '->', g['r'])
