#!/usr/bin/env python3
"""bank2motion.py - gold script bank row -> Motion spec (Stitch Tactile Night cards + Remotion, docs/VIDEO-MOTION.md). Batch 1 (owner 15/11: 20 different Motion templates):
tf (True/False, 2 pills + 3 s ring) | gap (fill the blank, slot reveal) | pair (A vs B, two rule tiles) | phrasal (meaning + 2 examples) | pattern (formula + NOT/SAY tiles) |
native (textbook vs natural, tiles) | recall (say it before the reveal, ring + slot) | spot (spot the mistake: ring, then the strike is drawn, then the fix).
Facts = the reviewed bank row untouched (wrong/right/why/quiz/ex/memory/aha); spoken text is composed from those fields only. Variety axes per spec: teacher (Ama/Carlos), accent, highlighter, tone order; recorded in `uses`.
  bank2motion.py [--n 4]   write content/video/cine/news/motion/bm_<tpl>_<row>.json (n per template) + merge verdicts in reviewed.json
  bank2motion.py --check   exit 1 when a written spec is stale (CI)"""
import hashlib, json, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import news2motion as NM
ROOT, N, OUT = NM.ROOT, NM.N, NM.OUT
ROWS = [json.loads(l) for f in ('g0000.jsonl', 'mixups.jsonl') for l in open(f'{ROOT}/content/video/scripts/bank/{f}') if l.strip()]
TYPES = {'tf': ('stop-saying', 'misunderstanding'), 'gap': ('preposition', 'verb-pattern', 'x-vs-y', 'idiom-phrasal'), 'pair': ('x-vs-y', 'mix-up'), 'phrasal': ('idiom-phrasal', 'situational'),
         'pattern': ('verb-pattern', 'preposition'), 'native': ('situational', 'misunderstanding'), 'recall': ('stop-saying', 'preposition'), 'spot': ('stop-saying', 'misunderstanding')}
TONES = [['gold', 'teal', 'coral'], ['teal', 'gold', 'coral'], ['coral', 'teal', 'gold']]
def h(s, m): return int(hashlib.sha256(s.encode()).hexdigest(), 16) % m
def sent(t): return t.strip()
def line(i, t, gap=0.7): return dict(id=i, text=t, gap=gap)
def hook_of(r): return re.sub(r'\s+', ' ', r['hook']).strip(" '\"")
# the CTA must name a real ecosystem area with its exact link (qc_v9 'cta' gate); the old r.get('cat') was a content tag, not an area
CTA_AREA = {'collocation': 'phrases', 'confusing-pair': 'word-usage', 'idiom-vs-textbook': 'phrases', 'ielts-speaking': 'ielts', 'ielts-writing-phrase': 'writing-ielts', 'irregular-verb': 'verbs',
            'phrasal-verb': 'phrases', 'polite-request': 'speaking', 'pronunciation-pair': 'pronunciation', 'quiz-ab': 'grammar', 'roleplay': 'roleplay', 'spot-the-mistake': 'grammar-check',
            'three-words': 'dictionary', 'upgrade-your-english': 'paraphrase', 'word-of-the-day': 'dictionary',
            'tf': 'grammar', 'gap': 'grammar', 'pair': 'word-usage', 'phrasal': 'phrases', 'pattern': 'grammar', 'native': 'phrases', 'recall': 'vocab-review', 'spot': 'grammar-check'}
ECO_LINK = {a['id']: a['link'] for a in json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../content/video/ecosystem.json')))['areas']}
def short(t, n=44): return t if len(t) <= n else t[:n].rsplit(' ', 1)[0]
DANGLE = {'a', 'an', 'the', 'to', 'of', 'in', 'at', 'on', 'for', 'with', 'under', 'by', 'and', 'or', 'but', 'i', "i'm", "i'd", 'is', 'are', 'it', 'that', 'your', 'my', 'before', 'from', 'as', 'so', 'if'}
def fit(t, n=40):   # a summary card is 2 wrapped lines (~22 chars each at the body size): keep whole sentences (else whole clauses) that fit, never a cut-off one
    t = t.strip()
    if len(t) <= n: return t
    for sep in (r'(?<=[.!?]) ', r'(?<=[.!?,;:]) '):
        out = ''
        for c in re.split(sep, t):
            if len((out + ' ' + c).strip()) > n: break
            out = (out + ' ' + c).strip()
        if len(out) >= 10: return out.rstrip(',;:')
    w = short(t, n).split(); 
    while len(w) > 3 and w[-1].lower().strip(",.") in DANGLE: w.pop()   # no sentence ending on a function word
    return ' '.join(w)
def hook2(t, rows=2, n=12):   # the hook card is chip + at most 2 hook lines (a 3rd line is 536 px > the 401 px free above the head): whole words that fit, no dangling function word
    w = t.split(); out = []
    while w:
        out.append(w.pop(0))
        if len(NM.split_hook(' '.join(out), n)) > rows: out.pop(); break
    while len(out) > 2 and out[-1].lower().strip('",.?!') in DANGLE | {'every', 'just', 'only', 'so', 'told'}: out.pop()
    return ' '.join(out) if out else t
def base(kind, r, tpl, lines, motion, hook_text, base_kind):
    k = NM.BASE[base_kind]; v = h(r['id'] + tpl, 12); teacher = ('ama', 'carlos')[v % 2]; src = NM.BASE['mistake' if teacher == 'ama' else 'drill']
    if isinstance(hook_text, tuple): hook_text = hook_text[0 if teacher == 'ama' else 1]   # (ama one-liner, carlos text)
    keep = isinstance(hook_text, dict)   # spot-the-mistake: the hook rows are already laid out (struck run), keep them
    if keep: hl, pr = motion['top'][0]['rows'][1:], [[[hook_text['text'], 'white']]]; hook_text = hook_text['text']
    else: hook_text = hook2(hook_text, 1)   # the free band above the head is 401-430 px depending on the clip: chip + 1 hook line always fits (2 lines = 414 px did not on every Carlos clip)
    if not keep: hl, pr = NM.hook_parts(hook_text)
    motion['top'][0]['rows'] = [motion['top'][0]['rows'][0]] + hl
    ac, act = [('navy2', 'mint'), ('navy2', 'yellow'), ('navy', 'mint'), ('navy', 'yellow')][v // 3 % 4], None
    return dict(id=f"mo_bm_{tpl}_{r['id']}", template=tpl, title=f"Motion {tpl} – {r['point'][:70]} ({r['id']})", teacher=teacher, clips=src['clips'], listen=src['listen'], set=src['set'], layout=src['layout'], host_fx=src['host_fx'], speed=src['speed'], accent=ac[0], active=ac[1], display=src['display'], motif=src['motif'],
                cta=dict(area=CTA_AREA.get(tpl, 'grammar'), link=ECO_LINK[CTA_AREA.get(tpl, 'grammar')], say='Practice it free'), series=dict(name=r['topic'].title(), ep=1), lines=lines + [line('sh', NM.SHARE), line('c', NM.CTA, 0.6)],
                pops=[dict(k['pops'][0], rows=pr, to=['h', -1, 'e', 0.25]), dict(k['pops'][1], **{'from': ['c', 0, 's', -0.05]})], motion=dict(motion, hook_text=hook_text, end_line='c'), embed=dict(drop=['sh', 'c'], end=dict(id='n', text="Next, let's practice more together.")),
                uses=dict(template=tpl, row=r['id'], teacher=teacher, accent=ac[0], active=ac[1], tones=v % 3))
def chip(t, tone='gold', **k): return dict(t='chip', text=t, tone=tone, **k)
def ln(t, hook=False, **k): return dict(t='line', runs=[[t]] if isinstance(t, str) else t, **({'hook': True} if hook else {}), **k)
def hookcard(label): return dict(id='hook', hook=True, rows=[chip(label)])
def tf(r):
    truth = h(r['id'], 2) == 0; st = sent(r['right'] if truth else r['wrong']); q = f'Is this correct? {st}'
    a = f"True! {r['why']}" if truth else f"False! Say: {r['right']} {r['why']}"
    lines = [line('h', 'True or false?'), line('q', q), line('o', 'True, or false?'), dict(id='_count', beat='count', dur=3.0), line('a', a), line('w', r['aha'])]
    top = [hookcard('Quick check'), dict(id='q', at=['q', 0], rows=[chip('Is it correct?', 'teal', ring='_count'), ln(st)], xp=[dict(at=['a', 0], n=10)]), dict(id='note', at=['w', 0], tone='coral', rows=[chip('Bonus', 'coral'), ln(short(r['aha'], 52))])]
    return base('tf', r, 'tf', lines, dict(top=top, col=[dict(t='opts', id='opts', opts=['True', 'False'], cues=[['o', 0], ['o', 2]], reveal=['a', 0], right=0 if truth else 1)]), 'True or false?', 'drill')
def gap(r):
    qz = r['quiz']; opts = qz['options'][:3]; ans = qz['answer']; q = qz['q']; parts = q.split('___')
    if len(parts) != 2: return None
    o = ', or '.join(opts) + '?'; pre = 0
    if any(len(x.strip()) <= 3 for x in opts): o = 'Which is right: ' + o; pre = 3   # a one-word option like "on" is misheard as "son" with no lead-in
    ot = o.split(); idx = [pre]; j = pre
    for x in opts[:-1]: j += len(x.split()); idx.append(j + 1)   # word after each ", or"
    idx = [min(i, len(ot) - 1) for i in idx[:len(opts)]]
    lines = [line('h', 'Fill the blank.'), line('q', q.replace('___', 'blank')), line('o', o), dict(id='_count', beat='count', dur=3.0), line('a', f"{opts[ans]}! {qz.get('explain') or r['why']}"), line('w', r['aha'])]
    top = [hookcard('Fill the blank'), dict(id='q', at=['q', 0], rows=[chip(r['cat'].replace('-', ' ').title()[:24], 'teal', ring='_count'), dict(t='line', runs=[[''], ['_____', 'muted'], [parts[1]]], slot=dict(run=1, word=opts[ans]))], reveal=['a', 0], xp=[dict(at=['a', 0], n=10)])]
    top[1]['rows'][1]['runs'][0] = [parts[0] if parts[0].strip() else ' ']
    return base('gap', r, 'gap', lines, dict(top=top, col=[dict(t='opts', id='opts', opts=opts, cues=[['o', i] for i in idx], reveal=['a', 0], right=ans)]), 'Fill the blank.', 'drill')
def words_of(point):
    p = re.sub(r'\s*\((?:v|n|adj|adv|phrase|prep)[^)]*\)', '', point); return [w.strip() for w in re.split(r'\s+vs\.?\s+', p.split(':')[0]) if w.strip()][:3]
def pair(r):
    ws = words_of(r['point'])
    if len(ws) < 2 or len(r['ex']) < 2: return None
    tn = TONES[h(r['id'], 3)]; exs = list(r['ex'][:2]); lines = [line('h', hook_of(r)), line('w', r['why']), line('e0', exs[0]), line('e1', exs[1]), line('m', f"So remember: {r['memory']}.")]
    tiles = []
    for k, w in enumerate(ws[:2]): tiles.append(dict(t='tile', tag=w.upper()[:12], tone=tn[k], lines=[[[' ', 'muted']]], ex=[[exs[k], tn[k]]], ex_at=[f'e{k}', 0], at=[f'e{k}', 0]))
    top = [hookcard('A or B?'), dict(id='sum', at=['m', 0], rows=[chip('Remember', 'gold'), ln(short(r['memory'], 40))])]
    return base('pair', r, 'pair', lines, dict(top=top, col=[dict(t='card', id='rules', at=['e0', 0], rows=tiles)]), hook_of(r), 'tip')
def phrasal(r):
    ph, _, mean = r['point'].partition(':'); ph = re.sub(r'\s*\([^)]*\)', '', ph).strip(); mean = (mean or r['why']).strip().rstrip('.')
    if len(r['ex']) < 2: return None
    lines = [line('h', hook_of(r)), line('m', f'{ph} means: {mean}.'), line('e0', r['ex'][0]), line('e1', r['ex'][1]), line('w', r['why']), line('a', r['aha'])]
    tn = TONES[h(r['id'], 3)]
    top = [hookcard('Phrase of the day'), dict(id='mean', at=['m', 0], rows=[chip('Meaning', 'gold'), ln(short(ph, 30)), dict(t='sub', runs=[[short(mean, 60)]])])]
    tiles = [dict(t='tile', tag=f'EXAMPLE {k + 1}', tone=tn[k], lines=[[[' ', 'muted']]], ex=[[r['ex'][k], tn[k]]], ex_at=[f'e{k}', 0], at=[f'e{k}', 0]) for k in range(2)]
    return base('phrasal', r, 'phrasal', lines, dict(top=top, col=[dict(t='card', id='rules', at=['e0', 0], rows=tiles)]), hook_of(r), 'tip')
def pattern(r):
    lines = [line('h', hook_of(r)), line('x', f"Not: {r['wrong']}"), line('b', f"Say: {r['right']}"), line('w', r['why']), line('m', "Remember: " + r['memory'].replace(' / ', ', or ') + '.'), line('a', r['aha'])]
    tiles = [dict(t='tile', tag='NOT', tone='coral', lines=[[[' ', 'muted']]], ex=[[r['wrong'], 'coral']], ex_at=['x', 1], at=['x', 0]), dict(t='tile', tag='SAY', tone='teal', lines=[[[' ', 'muted']]], ex=[[r['right'], 'teal']], ex_at=['b', 1], at=['b', 0])]
    top = [hookcard('Pattern'), dict(id='mem', at=['m', 0], rows=[chip('Remember', 'gold'), ln(short(r['memory'], 38))])]
    return base('pattern', r, 'pattern', lines, dict(top=top, col=[dict(t='card', id='rules', at=['x', 0], rows=tiles)]), hook_of(r), 'tip')
def native(r):
    lines = [line('h', hook_of(r)), line('x', f"Textbook: {r['wrong']}"), line('b', f"Natural: {r['right']}"), line('w', r['why']), line('a', r['aha'])]
    tiles = [dict(t='tile', tag='TEXTBOOK', tone='gold', lines=[[[' ', 'muted']]], ex=[[r['wrong'], 'gold']], ex_at=['x', 1], at=['x', 0]), dict(t='tile', tag='NATURAL', tone='teal', lines=[[[' ', 'muted']]], ex=[[r['right'], 'teal']], ex_at=['b', 1], at=['b', 0])]
    top = [hookcard('Sound natural'), dict(id='sum', at=['w', 0], rows=[chip('Why', 'gold'), ln(short(r['why'], 50))])]
    return base('native', r, 'native', lines, dict(top=top, col=[dict(t='card', id='rules', at=['x', 0], rows=tiles)]), hook_of(r), 'tip')
def key_runs(sentence, other):
    runs, si = NM.wrong_runs(sentence, other); return runs, si
def recall(r):
    right = r['right']; wrong = r['wrong']; ra, rb = NM.toks(right), NM.toks(wrong); import difflib
    sm = difflib.SequenceMatcher(None, [NM.norm(x) for x in ra], [NM.norm(x) for x in rb]); ops = [o for o in sm.get_opcodes() if o[0] != 'equal']
    if not ops: return None
    i1, i2 = ops[0][1], max(ops[0][2], ops[0][1] + 1); i2 = min(i2, len(ra)); key = ' '.join(ra[i1:i2]); pre, post = ' '.join(ra[:i1]), ' '.join(ra[i2:])
    lines = [line('h', 'Say it before I do.'), line('q', f"How do you say this correctly? Many learners say: {wrong}"), dict(id='_count', beat='count', dur=3.0), line('a', f"{right} {r['why']}"), line('w', r['aha'])]
    if len(right) > 28:   # a long sentence wraps to 5+ lines at the body size: the slot line shows only the words around the blank
        pw, qw = pre.split(), post.split(); pre = ('… ' if len(pw) > 2 else '') + ' '.join(pw[-2:]); post = ' '.join(qw[:2]) + (' …' if len(qw) > 2 else '')
    runs = [[pre + ' ' if pre else ' '], ['_____', 'muted'], [' ' + post if post else ' ']]
    top = [hookcard('Your turn'), dict(id='q', at=['q', 0], rows=[chip('Say it right', 'teal', ring='_count'), *([ln('Fix: ' + short(wrong, 40))] if len(wrong) <= 26 else []), dict(t='line', runs=runs, slot=dict(run=1, word=key))], reveal=['a', 0], xp=[dict(at=['a', 0], n=10)])]
    return base('recall', r, 'recall', lines, dict(top=top, col=[dict(t='card', id='better', at=['a', 0], tone='green', rows=[chip('Better', 'green'), (dict(t='sub', runs=[[right, 'green']]) if len(right) > 28 or max(len(w) for w in right.split()) > 8 else ln([[right, 'green']])), *([dict(t='sub', runs=[[short(r['why'], 60)]])] if len(right) <= 34 else [])])]), 'Say it before I do.', 'mistake')
def spot(r):
    runs, si = NM.wrong_runs(r['wrong'], r['right']); lines = [line('h', hook_of(r)), line('q', f"Spot the mistake. {r['wrong']}"), dict(id='_count', beat='count', dur=3.0), line('a', f"The mistake! {r['why']}"), line('b', f"Say: {r['right']}"), line('w', r['aha'])]
    top = [dict(id='hook', hook=True, rows=[chip('Spot the mistake', 'coral', ring='_count'), dict(t='line', hook=True, runs=runs)], strike=[dict(line=0, run=si, at=['a', 0])])]
    return base('spot', r, 'spot', lines, dict(top=top, col=[dict(t='card', id='better', at=['b', 0], tone='green', rows=[chip('Better', 'green'), ln([[r['right'], 'green']])])]), r['wrong'], 'mistake')
B = dict(tf=tf, gap=gap, pair=pair, phrasal=phrasal, pattern=pattern, native=native, recall=recall, spot=spot)
def build(n=4):
    specs = {}; used = set()
    for tpl, fn in B.items():
        c = 0
        for r in sorted((r for r in ROWS if r['type'] in TYPES[tpl]), key=lambda r: hashlib.sha256((tpl + r['id']).encode()).hexdigest()):
            if c >= n or r['id'] in used and False: break
            try: sp = fn(r)
            except Exception as e: continue
            if not sp or any(len(l.get('text', '').split()) > 28 for l in sp['lines']): continue
            specs[sp['id'][3:]] = sp; c += 1
    return specs
if __name__ == '__main__':
    n = int(sys.argv[sys.argv.index('--n') + 1]) if '--n' in sys.argv else 4; specs = build(n); rp = f'{OUT}/reviewed.json'; rev = json.load(open(rp)) if os.path.exists(rp) else dict(verdicts={})
    files = {f'{OUT}/{k}.json': NM.dump(v) for k, v in specs.items()}
    for k, sp in specs.items(): rev['verdicts'][sp['id']] = dict(template=sp['template'], hook=sp['motion']['hook_text'], hook_true=True, script_reviewed=True, reviewer='gold bank row (reviewed) via bank2motion.py 15/11/2026', script={l['id']: l['text'] for l in sp['lines'] if l.get('text')})
    rev['verdicts'] = dict(sorted(rev['verdicts'].items())); files[rp] = NM.dump(rev)
    if '--check' in sys.argv:
        bad = [os.path.basename(p) for p, t in files.items() if not os.path.exists(p) or open(p).read() != t]; print('stale:', bad[:10]) if bad else print(f'bank2motion: {len(specs)} specs up to date'); sys.exit(1 if bad else 0)
    for p, t in files.items(): open(p, 'w').write(t)
    print(f'wrote {len(specs)} specs', {t: sum(1 for v in specs.values() if v['template'] == t) for t in B})
