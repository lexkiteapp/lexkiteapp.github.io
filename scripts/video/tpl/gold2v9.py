#!/usr/bin/env python3
"""gold2v9 – deterministic gold-script -> v9 spec generator for the numbered series (docs/VIDEO-SERIES.md "Pipeline v10").

Input : content/video/scripts/bank/*.jsonl (written gold scripts: point, hook, wrong, right, why, aha, ex, memory, quiz, save, type, lines).
Output: content/video/cine/news/series/<slug>/<id>.json   one v9 spec per episode (same line/pop/anchor pattern as templates-v2 gold specs)
        content/video/cine/news/series/<slug>/plan.json    episode order + skipped items with reasons
        content/video/cine/news/series/<slug>/reviewed-hooks.json   verdicts (new entries: hook_true null, script_reviewed false;
                                                            an existing review is kept only while script + hook are unchanged)
Series: "Stop Saying This" (mistake template, bank type stop-saying), "Same or Different?" (pair template, bank type x-vs-y).
No facts are invented: every spoken sentence is a gold-script field or a fixed connective ("Stop saying this.", "Just say:", "Quick quiz!",
"Save this, and ... on lexkite.com."). Self-checks: 50-80 words, est. length <= 45 s, every key index inside its line, quiz answer spoken in
the answer line, CTA line has lexkite.com, hook <= 6 words on screen, error phrase only in the error line, spoken text TTS-clean.
Usage: python3 scripts/video/tpl/gold2v9.py [--check]   (--check = build in memory, print the summary, write nothing)
"""
import difflib, glob, hashlib, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = f'{ROOT}/content/video/cine/news/series'
GOLD_EP1 = {'stop-saying-this': ['i am agree'], 'same-or-different': ['borrow', 'lend']}   # templates-v2 episode 1 (hand-written)
SERIES = {
    'stop-saying-this': dict(name='Stop Saying This', template='mistake', type='stop-saying', pre='sts', L='m', teacher='daniel', set='classroom_board',
                             clips=['d03_daniel_desk'], accent='red', active='cream', hook_style='stop: red X badge + quoted error, stamp-in',
                             motif='red badges + quoted lines, green check on the fix',
                             cta={'area': 'grammar-check', 'link': 'https://lexkite.com/app/#/fix', 'say': 'Check your grammar'}),
    'same-or-different': dict(name='Same or Different?', template='pair', type='x-vs-y', pre='sod', L='p', teacher='carlos', set='classroom_board',
                              clips=['c01_carlos_board'], accent='green', active='green', hook_style='versus: two tiles slide in from both sides with a VS disc',
                              motif='side-by-side twin tiles, the active one lit',
                              cta={'area': 'word-usage', 'link': 'https://lexkite.com/app/#/usage?c=pair', 'say': 'Compare tricky words'}),
}
WMIN, WMAX, WSOFT, EST_MAX, HOOK_MAX = 50, 80, 76, 45.0, 6
EMO = re.compile('[←-⇿☀-➿\U0001F000-\U0001FAFF]️?')
norm = lambda w: re.sub(r"[^a-z0-9'-]", '', w.lower().replace('’', "'")).strip("-'")
toks = lambda s: s.split()

def est_seconds(lines):   # calibrated on the gold samples: Kokoro 0.75 ~ 2.1 words/s, 0.22 s base gap, declared gaps, beats
    w = sum(len(toks(l['text'])) for l in lines if l.get('text'))
    return w / 2.1 + sum(l.get('gap', 0.22) for l in lines if l.get('text')) + sum(l.get('dur', 0) for l in lines if l.get('beat')) + 0.4

def diff_span(wrong, right):
    """Word indices of `wrong` that differ from `right` (insertion in right -> the two wrong words around it), and the right-side indices."""
    a, b = [norm(x) for x in toks(wrong)], [norm(x) for x in toks(right)]; wi, ri = set(), set()
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == 'equal': continue
        wi |= set(range(i1, i2)) if i2 > i1 else {i for i in (i1 - 1, i1) if 0 <= i < len(a)}
        ri |= set(range(j1, j2)) if j2 > j1 else {j for j in (j1 - 1, j1) if 0 <= j < len(b)}
    return sorted(wi), sorted(ri)

def segs(sentence, idx, colour, base='white', quote=False):
    """Rich-row segments: words in idx coloured, others base; one space-joined row (optionally quoted)."""
    out = []; ws = toks(sentence)
    for i, w in enumerate(ws):
        c = colour if i in idx else base; t = ('“' if quote and i == 0 else '') + w + ('”' if quote and i == len(ws) - 1 else '') + ('' if i == len(ws) - 1 else ' ')
        if out and out[-1][1] == c: out[-1][0] += t
        else: out.append([t, c])
    return out

def board_row(text, colour):
    """Board text with ✓/✗/arrows/emoji turned into badge tokens (never raw emoji glyphs in a text segment)."""
    row, buf = [], ''
    for m in re.finditer(r'(✓|✗|→|' + EMO.pattern + r')|([^✓✗→]+?)(?=✓|✗|→|' + EMO.pattern + r'|$)', text):
        if m.group(2): buf += m.group(2); continue
        if buf.strip(): row.append([buf, colour]); buf = ''
        g = m.group(1); row.append(['@ok'] if g == '✓' else ['@x'] if g == '✗' else ['@emoji:➡️'] if g == '→' else ['@emoji:' + g])
    if buf.strip(): row.append([buf, colour])
    if row and row[0][0].startswith('@') and len(row) > 1 and not row[1][0].startswith(' '): row[1][0] = ' ' + row[1][0]
    return row

def key_idx(text, words, limit=4):
    """Indices of tokens whose normalised form starts with one of `words` (len >= 2), first `limit`."""
    ws = [w for w in words if len(w) >= 2]
    return [i for i, t in enumerate(toks(text)) if any(norm(t).startswith(w) for w in ws) and norm(t)][:limit]

def mem_words(memory):
    return [w for w in (norm(x) for x in re.split(r'[\s,=+/→()]+', EMO.sub(' ', memory))) if len(w) >= 3 and w not in ('the', 'and', 'thing', 'person', 'words', 'verb', 'noun')]

def spoken_ok(s):
    return bool(s) and not EMO.search(s) and not re.search(r'[=+_/→✓✗…()"]|\.\.\.', s) and "'" not in s.replace("'s", '').replace("n't", '').replace("'m", '').replace("'re", '').replace("'ve", '').replace("'ll", '').replace("'d", '')

def quiz_parts(q):
    o = q['options']; a = q['answer']
    say = lambda s: s.strip('()').strip()
    spoken = [say(x) for x in o]
    if any(not spoken_ok(x) for x in spoken) or q['q'].count('___') != 1: return None
    filled = re.sub(r'\s+', ' ', q['q'].replace('___', '' if o[a].startswith('(') else o[a])).replace(' ,', ',').replace(' .', '.').strip()
    filled = filled[0].upper() + filled[1:]
    return dict(o=o, a=a, say=spoken, q_spoken=q['q'].replace('___', 'blank'), filled=filled,
                q_rows=[[[p, 'white'] if p != '___' else ['___', 'yellow'] for p in re.split(r'(___)', q['q']) if p]], q_win=blank_window(q['q']))

def blank_window(q, before=2, after=1):
    """Short quiz prompt: <= 2 words before the blank, 1 after, '…' where the sentence is cut (all words come from the quiz sentence)."""
    w = q.split(); i = next(k for k, x in enumerate(w) if '___' in x); lo, hi = max(0, i - before), min(len(w), i + after + 1)
    pre = ('…' if lo > 0 else '') + ' '.join(w[lo:i]); post = ' '.join(w[i + 1:hi]) + ('…' if hi < len(w) else '')
    return [[x for x in ([pre + ' ', 'white'] if pre else None, ['___', 'yellow'], [' ' + post, 'white'] if post else None) if x]]

def cap(s): return s[0].upper() + s[1:]

def build(slug, it, ep):
    C = SERIES[slug]; L = C['L']; why, aha, ex, right, wrong = it['why'], it['aha'], list(it['ex']), it['right'], it['wrong']
    for k, s in [('why', why), ('aha', aha), ('wrong', wrong), ('right', right)] + [(f'ex{i}', e) for i, e in enumerate(ex)]:
        if not spoken_ok(s): return None, f'{k} not TTS-clean (symbols/emoji/quotes): {s!r}'
    Q = quiz_parts(it['quiz'])
    if not Q: return None, 'quiz not speakable (needs one ___ and plain options)'
    wi, ri = diff_span(wrong, right)
    if not wi or not ri: return None, 'wrong/right identical'
    mw = mem_words(it['memory'])
    if slug == 'same-or-different':
        m = re.match(r'^(.+?) \([^)]*\) vs (.+?) \([^)]*\)$', it['point'])
        if not m: return None, f'not a two-way pair: {it["point"]!r}'
        X, Y = m.group(1).strip(), m.group(2).strip()
        if len(X.split()) > 2 or len(Y.split()) > 2: return None, 'pair word too long for twin tiles'
        if sorted([X.lower(), Y.lower()]) == sorted(GOLD_EP1[slug]): return None, 'already episode 1 (templates-v2 gold)'
    elif any(g in wrong.lower() for g in GOLD_EP1[slug]): return None, 'already episode 1 (templates-v2 gold)'
    lines = []
    def add(i, text, gap=None, **key):
        d = {'id': f'{L}_{i}', 'text': text}
        k = {c: v for c, v in key.items() if v}
        if k: d['key'] = k
        if gap: d['gap'] = gap
        lines.append(d); return d
    span_w = {norm(toks(wrong)[i]) for i in wi} | {norm(toks(right)[i]) for i in ri}
    if slug == 'stop-saying-this':
        add('h', 'Stop saying this.')
        add('w', wrong, red=wi)
        add('y', why, 0.6, yellow=key_idx(why, mw, 3))
        k = add('k', 'Just say: ' + right, 0.6, green=[i + 2 for i in ri])
    else:
        add('h', f'{cap(X)} or {Y}? Don\'t mix them up.', yellow=[0], green=[2])
        add('w', 'Not: ' + wrong, red=[i + 1 for i in wi])
        k = add('k', 'Say: ' + right, 0.6, green=[i + 1 for i in ri])
        xs, ys = [norm(w) for w in X.split()], [norm(w) for w in Y.split()]
        yi = key_idx(why, xs, 2); gi = [i for i in key_idx(why, ys, 2) if i not in yi]
        add('y', why, 0.6, yellow=yi, green=gi)
    exl = ' '.join(ex)
    xl = add('x', exl, None, green=key_idx(exl, sorted(span_w | set(mw)), 4))
    add('t', aha, 0.6, yellow=key_idx(aha, mw, 3))
    add('q', ('Quick quiz! ' if slug == 'stop-saying-this' else 'Quiz! ') + Q['q_spoken'], 0.6, yellow=[0, 1] if slug == 'stop-saying-this' else [0])
    add('q2', f"{cap(Q['say'][0])}, or {Q['say'][1]}?")
    lines.append({'id': '_count', 'beat': 'count', 'dur': 3.0})
    ans = Q['say'][Q['a']]; aline = f"{cap(ans)}! {Q['filled']}"
    fi = key_idx(Q['filled'], [norm(w) for w in ans.split()], 3) if not Q['o'][Q['a']].startswith('(') else []
    add('a', aline, None, green=[0] + [i + 1 for i in fi])
    add('c', f"Save this, and {C['cta']['say'][0].lower() + C['cta']['say'][1:]} on lexkite.com.", 0.6)
    # stay inside the gold-standard band (<= 76 words, <= 45 s): two examples when they fit, else one (never pad)
    nw = lambda: sum(len(toks(l['text'])) for l in lines if l.get('text'))
    if (nw() > WSOFT or est_seconds(lines) > EST_MAX - 1) and len(ex) > 1:
        xl['text'] = ex[0]; kk = key_idx(ex[0], sorted(span_w | set(mw)), 4); xl.pop('key', None)
        if kk: xl['key'] = {'green': kk}
        ex = ex[:1]
    LID = {l['id']: l for l in lines}
    # ---- pops (anchors [line, word_idx, 's'|'e', offset]; chained: each pop's `to` == the next pop's `from`, so the board is never empty)
    a = lambda lid, k=0, off=-0.1: [f'{L}_{lid}', k, 's', off]
    if slug == 'stop-saying-this':
        n_hook = 2 + len(toks(wrong))
        # badge (+ "Stop saying" / "Stop" while the hook stays <= 6 words) on its own row, the quoted error on the next row (fits the desk board)
        lead = [[' Stop saying', 'white']] if n_hook <= HOOK_MAX else [[' Stop', 'white']] if n_hook - 1 <= HOOK_MAX else []
        hook_rows = [[['@x']] + lead, segs(wrong, set(wi), 'red', quote=True)]
        wrong_sp = ' '.join(toks(wrong)[i] for i in wi); right_sp = ' '.join(toks(right)[i] for i in ri)
        P = [dict(id='hook', kind='rich', role='hook', anim='stamp', size=84, from_=['t', 0], rows=hook_rows),
             dict(id='why', kind='rich', anim='spring', size=84, from_=a('y', 0, -0.2),
                  rows=[[['“' + wrong_sp.strip('.,!?') + '”', 'red'], ['@x']], [['“' + right_sp.strip('.,!?') + '”', 'green'], ['@ok']]]),
             dict(id='fix', kind='rich', anim='spring', size=84, from_=a('k', 0, -0.2), rows=[segs(right, set(ri), 'green') + [['@ok']]]),
             dict(id='ex', kind='rich', anim='spring', size=84, from_=a('x', 0, -0.06),
                  rows=[[[e, 'green']] for e in ex] + [[['@emoji:💡']] + [[' ' + s[0], s[1]] if i == 0 and not s[0].startswith('@') else s for i, s in enumerate(board_row(r.strip(), 'yellow'))] for r in it['memory'].split(',') if r.strip()])]
    else:
        P = [dict(id='hook', kind='pair', role='hook', anim='slide', vs=True, left={'title': X.upper(), 'color': 'navy2'}, right={'title': Y.upper(), 'color': 'green'}, from_=['t', 0]),
             dict(id='fix', kind='rich', anim='spring', size=80, from_=a('w', 0, -0.1),
                  rows=[segs(wrong, set(wi), 'red') + [['@x']], segs(right, set(ri), 'green') + [['@ok']]]),
             dict(id='explain', kind='pair', anim='spring', left={'title': X, 'color': 'navy2'}, right={'title': Y, 'color': 'green'}, from_=a('y', 0, -0.06),
                  focus=[[a('y', i, 0), side] for i, side in sorted([(LID[f'{L}_y'].get('key', {}).get('yellow', [None])[0], 'left'), (LID[f'{L}_y'].get('key', {}).get('green', [None])[0], 'right')], key=lambda z: (z[0] is None, z[0] or 0)) if i is not None]),
             dict(id='ex', kind='rich', anim='spring', size=80, from_=a('x', 0, -0.06), rows=[[[e, 'green']] for e in ex]),
             dict(id='trick', kind='rich', anim='spring', size=84, from_=a('t', 0, -0.1),
                  rows=[[['@emoji:💡']] + [[' ' + s[0], s[1]] if i == 0 and not s[0].startswith('@') else s for i, s in enumerate(board_row(r.strip(), 'yellow'))] for r in it['memory'].split(',') if r.strip()])]
        if not P[2]['focus']: P[2].pop('focus')
    # full blank sentence on the board while it is read, then the A/B quiz with a short window around the blank (the quiz widget must fit
    # the smallest board zone at the v10 minimum sizes; the desk board is ~384 px tall)
    P.append(dict(id='qline', kind='rich', anim='spring', size=84, from_=a('q', 1, -0.06), rows=Q['q_rows']))
    P.append(dict(id='quiz', kind='quiz', from_=a('q2', 0, -0.06), a=Q['o'][0], b=Q['o'][1], correct='ab'[Q['a']], reveal=a('a', 0, -0.04), q=Q['q_win']))
    P.append(dict(id='cta', kind='cta', from_=a('c', 0, -0.05)))
    pops = []
    for i, p in enumerate(P):
        d = {k: v for k, v in p.items() if k != 'from_'}; d['from'] = p['from_']; d['to'] = P[i + 1]['from_'] if i + 1 < len(P) else ['end']
        pops.append(d)
    spec = {'id': f"{C['pre']}_{it['id'].split('_', 1)[1]}", 'template': C['template'],
            'title': f"{C['name']} #{ep} – {it['point']}", 'teacher': C['teacher'], 'set': C['set'], 'clips': C['clips'], 'accent': C['accent'],
            'active': C['active'], 'hook_style': C['hook_style'], 'motif': C['motif'], 'cta': C['cta'], 'speed': 0.75, 'display': {'blank': '___'}}
    if slug == 'stop-saying-this':
        # error phrase = the contiguous wrong range plus one word of context on each side (specific enough to never hit an explanation line)
        tw = [norm(x) for x in toks(wrong)]; span = tw[max(0, wi[0] - 1): min(len(tw), wi[-1] + 2)]
        spec['error_lines'] = [f'{L}_w']; spec['error_re'] = r'\b' + r'\W+'.join(re.escape(w) for w in span if w) + r'\b'
    spec.update(lines=lines, pops=pops, series={'name': C['name'], 'ep': ep}, source={'bank': it['id'], 'pid': it.get('pid'), 'cefr': it.get('cefr'), 'diff': it.get('diff')})
    err = selfcheck(spec)
    return (None, 'self-check: ' + '; '.join(err)) if err else (spec, None)

def hook_text(spec):
    tt = lambda s: s if not s.startswith('@') else {'x': '✗', 'ok': '✓', 'q': '?'}.get(s[1:], s.split(':', 1)[1] if ':' in s else '')
    h = next(p for p in spec['pops'] if p.get('role') == 'hook')
    if h['kind'] == 'pair': return h['left']['title'] + ' | ' + h['right']['title']
    return ' / '.join(''.join(tt(s[0]) for s in r) for r in h['rows'])

def selfcheck(s):
    e = []; T = [l for l in s['lines'] if l.get('text')]; S = {l['id']: l['text'] for l in T}
    w = sum(len(toks(t)) for t in S.values())
    if not WMIN <= w <= WMAX: e.append(f'{w} words (need {WMIN}-{WMAX})')
    if est_seconds(s['lines']) > EST_MAX: e.append(f'est {est_seconds(s["lines"]):.1f} s > {EST_MAX}')
    for l in T:
        for c, ix in l.get('key', {}).items():
            if any(not 0 <= i < len(toks(l['text'])) for i in ix): e.append(f'key {c} {ix} outside {l["id"]}')
    L = s['lines'][0]['id'][0]; q = next(p for p in s['pops'] if p['kind'] == 'quiz'); ans = q[q['correct']].strip('()').lower()
    if ans not in S[f'{L}_a'].lower(): e.append('quiz answer not spoken in the answer line')
    if 'lexkite.com' not in S[f'{L}_c'] or not S[f'{L}_c'].startswith('Save this, and '): e.append('CTA line')
    hw = len([x for x in re.split(r'[\s/|]+', hook_text(s)) if re.search(r'[A-Za-z]', x)])
    if hw > HOOK_MAX: e.append(f'hook {hw} words on screen')
    if s.get('error_re'):
        rx = re.compile(s['error_re']); hit = [k for k, t in S.items() if rx.search(t.lower())]
        if hit != s['error_lines']: e.append(f'error phrase in {hit}')
    for i, p in enumerate(s['pops'][:-1]):
        if p['to'] != s['pops'][i + 1]['from']: e.append(f'board gap after {p["id"]}')
    for p in s['pops']:
        for an in [p['from'], p['to']] + ([p['reveal']] if 'reveal' in p else []) + [f[0] for f in p.get('focus', [])]:
            if an[0] in S and not (-len(toks(S[an[0]])) <= an[1] < len(toks(S[an[0]]))): e.append(f'anchor {an} outside line')
    return e

def content_hash(spec):   # series + key sentence (the right form / rule): never render the same lesson twice
    L = spec['lines'][0]['id'][0]; S = {l['id']: l['text'] for l in spec['lines'] if l.get('text')}
    return hashlib.sha1((spec['series']['name'] + '|' + S[f'{L}_k'].lower()).encode()).hexdigest()[:16]

def main():
    check = '--check' in sys.argv
    bank = [json.loads(x) for f in sorted(glob.glob(f'{ROOT}/content/video/scripts/bank/*.jsonl')) for x in open(f) if x.strip()]
    order = {'easy': 0, 'mid': 1, 'medium': 1, 'hard': 2}; lv = {'A1': 0, 'A2': 1, 'B1': 2, 'B2': 3, 'C1': 4}
    for slug, C in SERIES.items():
        items = sorted([b for b in bank if b.get('type') == C['type']], key=lambda b: (order.get(b.get('diff'), 1), lv.get(b.get('cefr'), 2), b['id']))
        d = f'{OUT}/{slug}'; vf = f'{d}/reviewed-hooks.json'
        old = json.load(open(vf))['verdicts'] if os.path.exists(vf) else {}
        plan, skipped, verdicts, seen = [], [], {}, set(); ep = 2   # episode 1 = hand-written templates-v2 gold spec
        for it in items:
            spec, why = build(slug, it, ep)
            if spec and content_hash(spec) in seen: spec, why = None, 'duplicate key sentence'
            if not spec: skipped.append({'bank': it['id'], 'point': it['point'], 'reason': why}); continue
            seen.add(content_hash(spec)); S = {l['id']: l['text'] for l in spec['lines'] if l.get('text')}; L = C['L']
            pr = {'quiz': True, 'count': True, 'right': it['right'], 'right_lines': [f'{L}_k']}
            if slug == 'stop-saying-this': pr.update(wrong_line=f'{L}_w', wrong=it['wrong'])
            else: pr['pair'] = [spec['pops'][0]['left']['title'].lower(), spec['pops'][0]['right']['title'].lower()]
            v = dict(template=C['template'], hook=hook_text(spec), hook_true=None, script_reviewed=False, script=S, promise=pr, source=it['id'])
            o = old.get(spec['id'])
            if o and o.get('script') == S and o.get('hook') == v['hook']: v = o   # keep a review only while it still matches word for word
            verdicts[spec['id']] = v
            plan.append({'ep': ep, 'id': spec['id'], 'point': it['point'], 'cefr': it.get('cefr'), 'diff': it.get('diff'), 'words': sum(len(t.split()) for t in S.values()),
                         'est_s': round(est_seconds(spec['lines']), 1), 'content_hash': content_hash(spec)})
            ep += 1
            if not check:
                os.makedirs(d, exist_ok=True); json.dump(spec, open(f"{d}/{spec['id']}.json", 'w'), ensure_ascii=False, indent=1)
        print(f"{slug}: {len(plan)} specs, {len(skipped)} skipped of {len(items)}")
        if check: continue
        for f in glob.glob(f'{d}/*.json'):   # drop specs the bank no longer produces
            if os.path.basename(f)[:-5] not in verdicts and os.path.basename(f) not in ('plan.json', 'reviewed-hooks.json'): os.remove(f)
        json.dump({'series': C['name'], 'template': C['template'], 'generator': 'scripts/video/tpl/gold2v9.py', 'order': plan, 'skipped': skipped},
                  open(f'{d}/plan.json', 'w'), ensure_ascii=False, indent=1)
        json.dump({'_note': f"{C['name']}: hook + script verdicts (qc_v9 hook_truth, video-series.yml gate). Generator writes hook_true null / script_reviewed false; "
                            'a reviewer (scripts/video/tpl/review_queue.py) sets hook_true, script_reviewed, reviewer, note. Script must equal the spec word for word.',
                   'verdicts': verdicts}, open(vf, 'w'), ensure_ascii=False, indent=1)

if __name__ == '__main__':
    main()
