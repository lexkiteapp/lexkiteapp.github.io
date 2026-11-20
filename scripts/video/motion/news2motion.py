#!/usr/bin/env python3
"""news2motion.py - cine/news lesson -> Motion spec (Stitch Tactile Night cards + Remotion layer, docs/VIDEO-MOTION.md). Owner 15/11: every news* clip renders with the
Motion set, not the old PIL overlay. Mapping: ab -> drill (Carlos) | fix -> mistake (Ama) | three, ways, pov -> tip (Ama).
  news2motion.py            write content/video/cine/news/motion/<news id>.json + reviewed.json (hook/script verdicts, machine-built from the reviewed news bank text)
  news2motion.py --check    exit 1 when a spec is stale (regenerated differently) - run in ci
Spoken text = the reviewed news lines (no engagement bait, scripts/cine/no_bait.py); CTA = "Practice it free"."""
import difflib, glob, json, os, re, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')); N = f'{ROOT}/content/video/cine/news'; OUT = f'{N}/motion'
L = {l['id']: l['text'] for l in json.load(open(f'{N}/lines.json'))['lines']}
BASE = {t: json.load(open(f'{N}/templates-motion/{t}.json')) for t in ('drill', 'mistake', 'tip')}
KIND = {'ab': 'drill', 'fix': 'mistake', 'three': 'tip', 'ways': 'tip', 'pov': 'tip'}
SHARE, CTA = "Send this to a friend who's learning English!", 'Save this, and practice free on lexkite.com.'
INTRO = re.compile(r"^(i'm ama|and i'm carlos)", re.I)
TONES = ['gold', 'teal', 'coral']
def toks(t): return t.split()
def norm(w): return re.sub(r"[^a-z0-9']", '', w.lower().replace('’', "'"))
def find(line, word, default=0):
    """index of the first token of `line` equal to `word` (normalised), else default"""
    w = norm(word)
    for i, t in enumerate(toks(line)):
        if norm(t) == w: return i
    return default
def split_hook(t, n=12):
    rows, cur = [], ''
    for w in t.split():
        if cur and len(cur) + 1 + len(w) > n: rows.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    return rows + [cur] if cur else rows
def hook_parts(card, tone='gold'):
    rows = split_hook(card); return [dict(t='line', hook=True, runs=[[r_]]) for r_ in rows], [[[r_, 'white' if i == 0 else 'yellow']] for i, r_ in enumerate(rows)]
def base(kind, s, lines, motion):
    b = BASE[kind]; ser = s['series']; end = lines[-1]['id']
    hl, pr = hook_parts(s['hook']['card'])
    motion['top'][0]['rows'] = [motion['top'][0]['rows'][0]] + (hl if kind != 'mistake' else motion['top'][0]['rows'][1:])
    pops = [dict(b['pops'][0], rows=pr if kind != 'mistake' else [[[mot_wrong(s), 'white']]], to=['h', -1, 'e', 0.25]), dict(b['pops'][1], **{'from': [end, 0, 's', -0.05]})]
    return dict(id='mo_' + s['id'], template=kind, title=f"News Motion – {s['point']} ({s['id']})", teacher=b['teacher'], clips=b['clips'], listen=b['listen'], set=b['set'], layout=b['layout'], host_fx=b['host_fx'], speed=b['speed'], accent=b['accent'], active=b['active'], display=b['display'], motif=b['motif'],
                cta=dict(area=s['area'], link=s['link'], say='Practice it free'), series=dict(name=ser[0].title(), ep=1), lines=lines, pops=pops, motion=dict(motion, hook_text=mot_wrong(s) if kind == 'mistake' else s['hook']['card'], end_line=end), embed=dict(drop=['sh', 'c'], end=dict(id='n', text="Next, let's practice more together.")))
def mot_wrong(s): return next(b['card']['text'] for b in s['beats'] if b.get('card') and b['card']['kind'] == 'x')
def beats(s): return [b for b in s['beats'] if not INTRO.match(L[b['line']])]
def tail(lines_): return lines_ + [dict(id='sh', text=SHARE, gap=0.7), dict(id='c', text=CTA, gap=0.6)]
def drill(s):
    bs = beats(s); ab = [b for b in bs if b['card'] and b['card']['label'] in ('A', 'B')]; a_, b_ = [x['card']['text'] for x in ab[:2]]
    ans = next(b for b in bs if b['card'] and b['card']['kind'] == 'v' and re.search(r"\b[AB]\b", L[b['line']])); right = 0 if re.search(r"\bA\b", L[ans['line']]) else 1
    ex = next((b for b in bs if b['card'] and b['card']['label'] == 'EXAMPLE'), None)
    q = 'Which one sounds natural?'; o = f"Is it A: {a_.rstrip('.')}? Or B: {b_.rstrip('.')}?"; ot = toks(o); ia, ib = ot.index('A:') + 1, ot.index('B:') + 1
    lines = [dict(id='h', text=L[s['hook']['line']]), dict(id='q', text=q, gap=0.7), dict(id='o', text=o, gap=0.7), dict(id='_count', beat='count', dur=3.0), dict(id='a', text=L[ans['line']], gap=0.7)]
    if ex: lines.append(dict(id='w', text=L[ex['line']], gap=0.7))
    rows = s['recap']['rows'][:2]
    top = [dict(id='hook', hook=True, rows=[dict(t='chip', text=s['series'][0].title(), tone='gold')]),
           dict(id='q', at=['q', 0], rows=[dict(t='chip', text=s['series'][1], tone='teal', ring='_count'), dict(t='line', runs=[[q]])], xp=[dict(at=['a', 0], n=10)])]
    if ex: top.append(dict(id='note', at=['w', 0], tone='coral', rows=[dict(t='chip', text='Remember', tone='coral')] + [dict(t='line', runs=[[r_]]) for r_ in rows]))
    return base('drill', s, tail(lines), dict(top=top, col=[dict(t='opts', id='opts', opts=[a_, b_], cues=[['o', ia], ['o', ib]], reveal=['a', 0], right=right)]))
def wrong_runs(wrong, right):
    a, b = toks(wrong), toks(right); sm = difflib.SequenceMatcher(None, [norm(x) for x in a], [norm(x) for x in b]); ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
    if not ops: return [[wrong]], None
    i1, i2 = ops[0][1], ops[-1][2]
    if i2 <= i1: i2 = min(i1 + 1, len(a))   # pure insertion in the right sentence ('how much it cost' -> '... does it ...'): mark the word after the gap
    pre, mid, post = ' '.join(a[:i1]), ' '.join(a[i1:i2]) or a[-1], ' '.join(a[i2:])
    runs = ([[pre + ' ']] if pre else []) + [[mid, 'ink']] + ([[' ' + post]] if post else []); return runs, len(runs) - (1 + (1 if post else 0))
def mistake(s):
    bs = beats(s); wrong = mot_wrong(s); xi = next(i for i, b in enumerate(bs) if b['card'] and b['card']['kind'] == 'x'); vs = [b for b in bs if b['card'] and b['card']['kind'] == 'v']; rule = next((b for b in bs if b['card'] and b['card']['label'] == 'RULE'), None)
    best = vs[0]; runs, si = wrong_runs(wrong, best['card']['text']); wl = bs[xi]['line']; mid = next((r_[0] for r_ in runs if len(r_) == 2), runs[0][0]); wi = find(L[wl], mid.split()[0], 0)
    lines = [dict(id='h', text=L[s['hook']['line']])] + [dict(id=f'b{i}', text=L[b['line']], gap=0.7) for i, b in enumerate(bs)]
    ids = {b['line']: f'b{i}' for i, b in enumerate(bs)}
    top = [dict(id='hook', hook=True, rows=[dict(t='chip', text='Common mistake', tone='coral'), dict(t='line', hook=True, runs=runs)], strike=[dict(line=0, run=si, at=[ids[wl], wi])])]
    extra = vs[1] if len(vs) > 1 else None
    if extra: top.append(dict(id='no', at=[ids[extra['line']], 0], rows=[dict(t='chip', text='Also say', tone='teal'), dict(t='line', runs=[[extra['card']['text'], 'teal']])]))
    elif rule: top.append(dict(id='no', at=[ids[rule['line']], 0], rows=[dict(t='chip', text='Rule', tone='teal'), dict(t='line', runs=[[rule['card']['text'], 'teal']])]))
    brows = [dict(t='chip', text='Better', tone='green'), dict(t='line', runs=[[best['card']['text'], 'green']])] + ([dict(t='sub', runs=[[best['card']['sub']]])] if best['card'].get('sub') else [])
    return base('mistake', s, tail(lines), dict(top=top, col=[dict(t='card', id='better', at=[ids[best['line']], 0], tone='green', rows=brows)]))
def tip(s):
    bs = beats(s); cards = [b for b in bs if b['card'] and b['card']['kind'] == 'p' and b['card']['label'] not in ('TIP',)][:3] or [b for b in bs if b['card']][:3]
    lines = [dict(id='h', text=L[s['hook']['line']])]; ids = {}
    for i, b in enumerate(bs): ids[b['line']] = f't{i}'; lines.append(dict(id=f't{i}', text=L[b['line']], gap=0.7))
    rl = L[s['recap']['line']]; lines.append(dict(id='r', text=rl, gap=0.7)); rows = s['recap']['rows'][:3]
    tiles = []
    for k, b in enumerate(cards):
        c = b['card']; tag = re.sub(r'^#', '', c['label']) if c['label'] else 'TIP'; tag = ('PHRASE ' + tag) if tag.isdigit() else tag
        tiles.append(dict(t='tile', tag=tag, tone=TONES[k % 3], lines=[[[c['sub'] or ' ', 'muted']]], ex=[[c['text'], TONES[k % 3]]], ex_at=[ids[b['line']], 0], at=[ids[b['line']], 0]))
    top = [dict(id='hook', hook=True, rows=[dict(t='chip', text=f"{s['series'][0].title()} · {s['series'][1]}"[:34], tone='gold')]), dict(id='sum', at=['r', 0], rows=[dict(t='chip', text='Remember', tone='gold')] + [dict(t='line', runs=[[r_, TONES[i % 3]]]) for i, r_ in enumerate(rows)])]
    return base('tip', s, tail(lines), dict(top=top, col=[dict(t='card', id='rules', at=tiles[0]['at'], rows=tiles)]))
def build():
    specs, rev = {}, {}
    for p in sorted(glob.glob(f'{N}/news_*.json')):
        s = json.load(open(p)); k = KIND.get(s['template'])
        if not k: continue
        sp = {'drill': drill, 'mistake': mistake, 'tip': tip}[k](s); specs[s['id']] = sp
        rev[sp['id']] = dict(template=k, hook=s['hook']['card'], hook_true=True, script_reviewed=True, reviewer='news bank text (reviewed) via news2motion.py 15/11/2026', script={l['id']: l['text'] for l in sp['lines'] if l.get('text')})
    return specs, rev
def dump(o): return json.dumps(o, indent=1, ensure_ascii=False) + '\n'
if __name__ == '__main__':
    specs, rev = build(); os.makedirs(OUT, exist_ok=True); files = {f'{OUT}/{k}.json': dump(v) for k, v in specs.items()}; rp = f'{OUT}/reviewed.json'; old = json.load(open(rp))['verdicts'] if os.path.exists(rp) else {}; keep = {k: v for k, v in old.items() if not k.startswith('mo_news_')}   # bank2motion verdicts live in the same file
    files[rp] = dump(dict(_note='machine-built verdicts for news2motion / bank2motion specs (qc hook_truth: script == rendered script, hook == on-screen hook)', verdicts=dict(sorted({**keep, **rev}.items()))))
    if '--check' in sys.argv:
        bad = [os.path.basename(p) for p, t in files.items() if not os.path.exists(p) or open(p).read() != t]; print('stale:', bad[:10]) if bad else print(f'news2motion: {len(specs)} specs up to date'); sys.exit(1 if bad else 0)
    for p, t in files.items(): open(p, 'w').write(t)
    print(f'wrote {len(specs)} specs', {k: sum(1 for v in specs.values() if v['template'] == k) for k in ('drill', 'mistake', 'tip')})
