#!/usr/bin/env python3
"""Teach2D episode generator (docs/VIDEO-TEACH2D.md): data row -> episode spec, deterministic, no AI.
  python3 scripts/video/teach2d/gen.py [--check]        -> content/video/teach2d/eps/<id>.json for every row of content/video/teach2d/pilots.json
Every taught fact comes from our own data: gold script bank (content/video/scripts/bank/g0000.jsonl), the verb engine (web/js/verbs-core.js),
the audited IPA bank (scripts/scriptbank, checked again by qc.py) and the curated US/UK + stress tables in pilots.json.
Each template = ONE point, hook first (<= 6 words, on screen from frame 0), example, 3-second quiz, share line, deep-link CTA.
Lines are short sentences (TTS + captions + whisper clock all come from the same text: voice = subtitle = mouth)."""
import hashlib, json, os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import publish as PUBLISH  # noqa: E402
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
REG = json.load(open(f'{ROOT}/web/teach/characters.json'))
PIL = json.load(open(f'{ROOT}/content/video/teach2d/pilots.json'))
PR_SMOKE_MAX = 1   # số tập teach-video render trên pull_request (ci-policy luật 11 khoá ≤ 2)
GOLD = {}
for x in open(f'{ROOT}/content/video/scripts/bank/g0000.jsonl'):
    r = json.loads(x); GOLD[r['id']] = r
APP = 'https://lexkite.com/app/'


def verbs(base):
    js = ("import fs from 'node:fs';import vm from 'node:vm';const c={};c.self=c;vm.createContext(c);"
          "vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),c);const V=c.LK_VERBS;const f=V.forms(process.argv[2]);"
          "console.log(JSON.stringify({f,m:V.mistakes(process.argv[2])}))")
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', js, f'{ROOT}/web/js/verbs-core.js', base], capture_output=True, text=True, check=True).stdout)


def L(i, text, pause=0.42, **kw): return dict(id=i, text=text, pause=min(pause, 2.6), **kw)   # owner 29/10: social 18-28 s


def cta(area, route, say): return dict(area=area, route=route, link=APP + route, say=say)


def usuk(p):
    us, uk = p['us'], p['uk']
    return dict(lines=[
        L('h', 'U.S. or U.K.?'),
        L('us', f"In America, {p['us_say']}"),
        L('uk', f"In Britain, {p['uk_say']} Same thing!"),
        L('x', p['example']),
        L('q', f"Quick quiz! You're in {p['quiz_city']}. {p.get('quiz_say', 'What do you look for?')}", 3.0, quiz=True),
        L('a', p.get('ans_say', f"The {uk}!")),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(us=us, uk=uk, ipa_us=p['ipa_us'], ipa_uk=p['ipa_uk'], same=p['same'], quiz=dict(options=[us, uk], answer=1)),
        cta=cta('dictionary', f'#/dict/{us}', 'Look up any word'), hook=dict(line='h', text='US or UK?'))


def verbforms(p):
    V = verbs(p['base']); f = V['f']; base, past, pp = f['base'], f['P'], f['PP']
    over = next((m['arg'] for m in V['m'] if m['code'] == 'overreg'), None)
    assert f['irregular'] and over, ('verb template needs an irregular verb with an over-regularised mistake', base)
    return dict(lines=[
        L('h', f'Three forms of {base}. Ready?'),
        L('b', f"Base form: {base}."),
        L('p', f"Past: {past}. {p['ex_past']}"),
        L('pp', f"Past participle: {pp}."),
        L('w', f'Not {over}! {base.capitalize()} is irregular.'),
        L('q', f"Quick quiz! {p['quiz_q']}", 3.0, quiz=True),
        L('a', p['quiz_a']),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(base=base, past=past, pp=pp, over=over, quiz=dict(stem=p['quiz_stem'], options=p.get('quiz_opts', [past, pp]), answer=p.get('quiz_opts', [past, pp]).index(p['quiz_right']))),
        cta=cta('verbs', f'#/verb/{base}', 'Practice verb forms'), hook=dict(line='h', text=f'{base} · {past} · {pp}'))


def stress(p):
    a, b = p['a'], p['b']
    return dict(lines=[
        L('h', f"Where's the stress? {a['word'].capitalize()}!"),
        L('a', f"{a['word'].capitalize()}. Stress on the {a['say']} part."),
        L('b', f"Now say {b['word']}."),
        L('m', f"The stress moves to the {b['say']} part."),
        L('r', f"Say it with me: {b['word']}.", 1.8, repeat=True),
        L('q', "Quick quiz! Where's the stress?", 3.0, quiz=True),
        L('ans', f"The {b['say']} part. {b['word'].capitalize()}."),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(a=a, b=b, quiz=dict(options=[b['syl'][0].upper(), b['syl'][b['stress']].upper()], answer=1)),
        cta=cta('pronunciation', '#/pron/stress-shift', 'Check word stress'), hook=dict(line='h', text="Where's the stress?"))   # the app's stress-shift lesson (#/pron/<word> is not a route: pron.js lesson ids)


def mistake(p):
    g = GOLD[p['gold']]; q = g['quiz']
    return dict(lines=[
        L('h', p['hook_say']),
        L('w', f"Many learners say: {p['wrong_say']}"),
        L('r', f"Better: {p['right_say']}"),
        L('y', g['why']),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', p['answer_say']),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(wrong=p['wrong_say'], right=p['right_say'], strike=p['strike'], why=g['why'], memory=g['memory'], quiz=dict(stem=q['q'], options=q['options'], answer=q['answer'])),
        cta=cta('grammar-check', '#/fix', 'Check your grammar'), hook=dict(line='h', text=p['hook_text']), src=dict(gold=g['id'], pid=g['pid']))


def l1(p):   # clip L1 (l1.json, docs/VIDEO-TEACH2D.md): teacher speaks plain English about a mistake speakers of ONE language make; native hook / tip / caption in that language
    q = p['quiz']
    return dict(lines=[
        L('h', p['hook_say']),
        L('w', f"Many learners say: {p['wrong']}"),
        L('r', f"Better: {p['right']}"),
        L('y', p['why']),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', p['answer_say']),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(wrong=p['wrong'], right=p['right'], strike=p['strike'], why=p['why'], memory=p['memory'], quiz=dict(stem=q['stem'], options=q['options'], answer=q['answer']), native=p['native'], en=p['en']),
        cta=cta('grammar-check', '#/fix', 'Check your grammar'), hook=dict(line='h', text=p['native']['hook']), src=dict(l1=True))


def phrasal(p):
    g = GOLD[p['gold']]; q = g['quiz']
    return dict(lines=[
        L('h', p['hook_say']),
        L('w', f"Not: {g['wrong']}"),
        L('r', f"Say: {g['right']}"),
        L('m', p['mean_say']),
        L('k', g['aha']),
        L('q', 'Quick quiz! Which one sounds natural?', 3.0, quiz=True),
        L('a', p['answer_say']),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(pv=p['pv'], wrong=g['wrong'], right=g['right'], strike=p['strike'], mean=p['mean_card'], aha=g['aha'], ex=g['ex'][0],
                  quiz=dict(stem=q['q'], options=q['options'], answer=q['answer'])),
        cta=cta('phrases', '#/phrases', 'Learn phrasal verbs'), hook=dict(line='h', text=p['hook_text']), src=dict(gold=g['id'], pid=g['pid']))


def bank(word):   # audited word bank row: (US IPA else UK, definition, example) – the same source qc.py checks
    js = ("const {sources}=await import(process.argv[1]);const r=sources().byWord.get(process.argv[2]);"
          "console.log(JSON.stringify(r?[r[10]||r[1],r[4],r[5]]:null))")
    return json.loads(subprocess.run(['node', '--input-type=module', '-e', js, f'{ROOT}/scripts/scriptbank/lib.mjs', word], capture_output=True, text=True, check=True, cwd=ROOT).stdout)


def frozen(p):   # auto rows (auto.json) carry the bank facts they were planned and gated with (gen.py --verify re-checks them live); pilots read the bank
    return (p['ipa'], p['def'], p['ex']) if 'def' in p else bank(p['word'])


def gq(g):   # gold quiz -> (stem, options, answer index, right option)
    q = g['quiz']; return q['q'], q['options'], q['answer'], q['options'][q['answer']]


def pair(p):   # Same or Different? (gold x-vs-y): two word cards with one-line meanings, memory strip, quiz
    g = GOLD[p['gold']]; stem, opts, ans, right = gq(g); m1, m2 = [x.strip() + '.' for x in g['why'].split('.') if x.strip()][:2]
    return dict(lines=[
        L('h', p['hook_say']),
        L('r', g['right']),
        L('w', f"Not: {g['wrong'][0].lower() + g['wrong'][1:]}"),
        L('m1', m1), L('m2', m2),
        L('k', g['aha']),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', f"{right.capitalize()}! {stem.replace('___', right)}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(a=p['a'], b=p['b'], mean_a=m1, mean_b=m2, aha=g['aha'], right=g['right'], quiz=dict(stem=stem, options=opts, answer=ans)),
        cta=cta('word-usage', f"#/usage/{p['a']}-{p['b']}", 'Compare tricky words'), hook=dict(line='h', text=p['hook_text']), src=dict(gold=g['id'], pid=g['pid']))


def prep(p):   # Which Little Word? (gold preposition): sentence with a glowing slot, option bubbles, the slot fills on the answer
    g = GOLD[p['gold']]; stem, opts, ans, right = gq(g)
    return dict(lines=[
        L('h', 'One little word. Which one?'),
        L('s', f"{p['slot_say']} {opts[1 - ans].capitalize()}, or {right}?", 1.6, guess=True),
        L('r', f"{right.capitalize()}! {g['right']}"),
        L('y', g['why']),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', f"{right.capitalize()}! {stem.replace('___', right)}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(slot=p['slot_text'], opts=[opts[1 - ans], right], right=right, full=g['right'], why=g['why'], aha=g['aha'], quiz=dict(stem=stem, options=opts, answer=ans)),
        cta=cta('grammar-check', '#/fix', 'Check your grammar'), hook=dict(line='h', text='Which little word?'), src=dict(gold=g['id'], pid=g['pid']))


def pattern(p):   # Verb Patterns (gold verb-pattern): formula bricks verb + pattern = phrase, crossed wrong brick
    g = GOLD[p['gold']]; stem, opts, ans, right = gq(g)
    return dict(lines=[
        L('h', p['hook_say']),
        L('w', f"Many learners say: {g['wrong']}"),
        L('r', f"Better: {g['right']}"),
        L('y', g['why']),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', f"{right.capitalize()}! {stem.replace('___', right)}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(verb=p['verb'], pat=p['pat'], good=p['good'], bad=p['bad'], wrong=g['wrong'], right=g['right'], why=g['why'], aha=g['aha'], quiz=dict(stem=stem, options=opts, answer=ans)),
        cta=cta('verbs', f"#/verb/{p['verb']}", 'Practice verb patterns'), hook=dict(line='h', text=p['hook_text']), src=dict(gold=g['id'], pid=g['pid']))


def native(p):   # Say It Naturally (gold situational): textbook line vs native line with a NATIVE badge
    g = GOLD[p['gold']]; stem, opts, ans, right = gq(g)
    return dict(lines=[
        L('h', 'Textbook or real English?'),
        L('w', f"Textbook: {g['wrong']}"),
        L('r', f"Natives say: {g['right']}"),
        L('y', g['why']),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', f"{right.capitalize()}! {stem.replace('___', right)}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(wrong=g['wrong'], right=g['right'], strike=p['strike'], hl=p['hl'], why=g['why'], aha=g['aha'], scene=p['scene'], quiz=dict(stem=stem, options=opts, answer=ans)),
        cta=cta('phrases', '#/phrases', 'Learn real phrases'), hook=dict(line='h', text='Textbook or real English?'), src=dict(gold=g['id'], pid=g['pid']))


def guess(p):   # Guess the Word (audited word bank + img.json picture): 3 clues, letter tiles, picture sharpens on the reveal
    w = p['word']; ipa, dfn, ex = frozen(p); assert dfn and ipa, ('word not in the audited bank', w)
    clue = re.sub(r'^(an?|the) (object|thing|device|place|person) (that|which|for) ', 'It ', dfn.split(';')[0]).rstrip('.') + '.'
    clue = clue[0].upper() + clue[1:]; n = len(w); NUM = 'zero one two three four five six seven eight nine ten eleven twelve'.split()
    return dict(lines=[
        L('h', 'Guess the word in three clues!'),
        L('c1', f'Clue one: {clue[0].lower() + clue[1:]}'),
        L('c2', f'Clue two: it has {NUM[n]} letters.'),
        L('c3', f'Clue three: it starts with {w[0].upper()}.'),
        L('q', 'Got it? Comment your guess!', 3.0, quiz=True),
        L('a', f"{w.capitalize()}! {ex}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(word=w, ipa=ipa, clue=clue, n=n, img=p['img'], ex=ex),
        cta=cta('dictionary', f'#/dict/{w}', 'Look up any word'), hook=dict(line='h', text='Guess the word!'))


def level(p):   # Level Check (3 gold quiz items): progress dots, question card, score pill, trophy
    Q = [gq(GOLD[x]) for x in p['gold']]; lines = [L('h', 'Level check! Ready?')]
    for i, (stem, opts, ans, right) in enumerate(Q, 1):
        lines += [L(f'q{i}', f"Question {['one', 'two', 'three'][i - 1]}.", 2.4, quiz=True), L(f'a{i}', stem.replace('___', right))]   # the answer = the full sentence (no lone word first: whisper drops it)
    lines += [L('s', 'Three out of three? Comment below!'), L('c', 'Save this. Free on lexkite.com.')]
    return dict(lines=lines, data=dict(qs=[dict(stem=s_, options=o_, answer=a_) for s_, o_, a_, _ in Q]),
                cta=cta('placement', '#/placement', 'Take the level test'), hook=dict(line='h', text='Level check!'), src=dict(gold=p['gold']))


def appdata(files, expr):   # the app's own content files (web/js/...), evaluated exactly as the browser does -> JSON of `expr`
    js = ("const vm=require('vm'),fs=require('fs');const c={};c.window=c;c.self=c;c.g=c;vm.createContext(c);"
          "for(const f of JSON.parse(process.argv[1]))vm.runInContext(fs.readFileSync(f,'utf8'),c);"
          "console.log(JSON.stringify(vm.runInContext(process.argv[2],c)))")
    return json.loads(subprocess.run(['node', '-e', js, json.dumps([f'{ROOT}/web/js/{f}' for f in files]), expr], capture_output=True, text=True, check=True).stdout)


def two(opts, ans, pick):   # 4-option bank item -> [right, chosen distractor] in the data's order
    o = [opts[ans], opts[pick]]; return (o, 0) if ans < pick else (o[::-1], 1)


def grammar(p):   # Grammar in 60s (app grammar point web/js/grammar/*): rule bricks from the formula, one listed mistake, one listed quiz item
    G = appdata([f"grammar/{p['file']}.js"], f"GRAMMAR.find(x=>x.id==={json.dumps(p['gid'])})"); assert G, ('grammar point not found', p['gid'])
    mk = [b for b in G['blocks'] if b['type'] == 'mistake'][p['mistake']]; q = G['quiz'][p['quiz']]
    form = ' '.join(x['t'] for r in G['blocks'] if r['type'] == 'formula' for row in r['rows'] for x in row['parts'])
    assert all(b in form for b in p['brick_check']), ('rule bricks not in the formula', p['brick_check'], form)
    stem = re.sub(r'\s*\([^)]*\)', '', q['q']); right = q['options'][q['answer']]; opts, ans = two(q['options'], q['answer'], p['pick'])
    return dict(lines=[
        L('h', f"{G['en']}. One rule!"),
        L('r', p['rule_say']),
        L('w', f"Not: {mk['wrong']}"),
        L('b', f"Say: {mk['right']}"),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', f"{right.capitalize()}! {stem.replace('___', right)}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(en=G['en'], level=G['level'], bricks=p['bricks'], wrong=mk['wrong'], right=mk['right'], strike=p['strike'], hl=p['hl'], quiz=dict(stem=stem, options=opts, answer=ans)),
        cta=cta('grammar', f"#/grammar/{p['gid']}", 'Learn this rule'), hook=dict(line='h', text=f"{G['en']} in 60s"), src=dict(grammar=p['gid']))


def dictation(p):   # What Did She Say? (app listening script web/js/listen/*): the teacher says one script line twice, the gap fills on the answer
    s = appdata([f"listen/{p['file']}.js"], f"LISTENING.find(x=>x.id==={json.dumps(p['pid'])}).script[{p['line']}].t")
    assert p['gap'] in s and len(words(s)) >= 4, ('gap not in the script line', p['gap'], s)
    ipa, dfn, _ = bank(p['word']); assert dfn, ('word not in the audited bank', p['word'])
    return dict(lines=[
        L('h', 'What did she say? Listen!'),
        L('s1', s, 1.0),
        L('g', 'Once more. Fill the gap!'),
        L('q', s, 3.0, quiz=True),
        L('a', f"{p['gap'][0].upper() + p['gap'][1:]}! {p['word'].capitalize()} means {p['mean_say']}."),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(line=s, gap=p['gap'], word=p['word'], ipa=ipa, mean=dfn),
        cta=cta('dictation', f"#/dictation/{p['pid']}", 'Try free dictation'), hook=dict(line='h', text='What did she say?'), src=dict(listening=p['pid'], line=p['line']))


def toeic(p):   # TOEIC Word (app TOEIC reading bank web/js/toeic/reading*.js, Part 5): the clue phrase decides the answer
    it = appdata([f"toeic/{p['file']}.js"], f"TOEIC.reading.find(x=>x.id==={json.dumps(p['tid'])}).parts.find(x=>x.part===5).groups[0].items.find(x=>x.n==={p['n']})")
    assert it and it['cue'] == p['cue'], ('TOEIC item / cue mismatch', p, it and it.get('cue'))
    stem = it['q'].replace('-------', '___'); right = it['options'][it['a']]; say = stem.replace('___', 'blank')
    return dict(lines=[
        L('h', 'TOEIC question. Ten seconds!'),
        L('s', say, 0.6),
        L('k', f"Find the clue: {it['cue']}."),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', f"{right.capitalize()}! {p['why_say']}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(stem=stem, options=it['options'], answer=it['a'], cue=it['cue'], n=it['n'], right=right),
        cta=cta('toeic', '#/toeic', 'Practice TOEIC free'), hook=dict(line='h', text='TOEIC in 10 seconds'), src=dict(toeic=p['tid'], n=it['n']))


def review(p):   # Remember This? (SRS flashcard, audited word bank): front -> think 3 s -> flip -> example -> the app's 4 grade buttons
    w = p['word']; ipa, dfn, ex = frozen(p); assert dfn and ex, ('word not in the audited bank', w)
    return dict(lines=[
        L('h', 'Remember this word?'),
        L('f', f"Here's your card: {w}."),
        L('q', 'Think! What does it mean?', 3.0, quiz=True),
        L('b', f"It means {dfn}."),
        L('x', ex),
        L('g', 'Got it? Tap Good. Forgot? Tap Again.'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(word=w, ipa=ipa, mean=dfn, ex=ex, grades=['Again', 'Hard', 'Good', 'Easy']),
        cta=cta('vocab-review', f'#/review?w={w}', 'Review your words'), hook=dict(line='h', text='Remember this word?'))


def call(p):   # Ask Ama -> Call (app speaking calls web/js/call/calls.js): one phrase from a real call script, its plain meaning, a reply option
    C_ = appdata(['call/calls.js'], f"CALLS.find(x=>x.id==={json.dumps(p['cid'])})"); m = C_['turns'][p['turn']]
    ph = dict(C_['phrases']); assert p['phrase'] in ph and p['phrase'] in p['quote'].lower() and p['quote'] in m['m'], ('phrase / quote not in the call', p['phrase'], p['quote'])
    reply = m['o'][p['reply']].split('!')[0] + '!'; alt = p['alt']; assert alt in ph
    return dict(lines=[
        L('h', f"What does {p['phrase']} mean?"),
        L('m', f"Your teammate says: {p['quote']}"),
        L('y', f"{p['phrase'].capitalize()} means: {ph[p['phrase']]}."),
        L('o', f"Say: {reply}"),
        L('q', f"Quick quiz! {p['quiz_say']}", 3.0, quiz=True),
        L('a', f"It's {p['phrase']}! {p['ans_say']}"),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(title=C_['title'], em=C_['em'], line=p['quote'], phrase=p['phrase'], mean=ph[p['phrase']], reply=reply,
                  quiz=dict(options=[f"It's {p['phrase']}!", f"{alt.capitalize()}!"], answer=0)),
        cta=cta('call', f"#/call/{p['cid']}", 'Practice a real call'), hook=dict(line='h', text=f"“{p['phrase'].capitalize()}”?"), src=dict(call=p['cid'], turn=p['turn']))


T = dict(usuk=usuk, verbs=verbforms, stress=stress, mistake=mistake, phrasal=phrasal, pair=pair, prep=prep, pattern=pattern, native=native, guess=guess, level=level,
         grammar=grammar, dictation=dictation, toeic=toeic, review=review, call=call)
SERIES = dict(usuk='US or UK?', verbs='Verb Forms Challenge', stress="Where's the Stress?", mistake='Stop Saying This', phrasal='Phrasal Verb in 30s',
              pair='Same or Different?', prep='Which Little Word?', pattern='Verb Patterns', native='Say It Naturally', guess='Guess the Word', level='Level Check',
              grammar='Grammar in 60s', dictation='What Did She Say?', toeic='TOEIC Word', review='Remember This?', call='Ask Ama')


def say_mask(s): return re.sub(r'[A-Za-z]+', lambda m: m[0][0] + '•' * (len(m[0]) - 1), s)   # = mask() in scripts/say-native/build.mjs


def react(p):   # Say it like a native (content/say-native/series.json, docs/SAY-NATIVE.md): situation hook -> reaction pose -> the phrase -> repeat -> meaning -> swap / don't -> quiz
    S_ = next(s for s in json.load(open(f'{ROOT}/content/say-native/series.json'))['series'] if s['id'] == p['series'])
    k_ = [i['key'] for i in S_['items']]; it = S_['items'][k_.index(p['key'])]
    ipa, dfn, _ = bank(it['key'].lower()); assert ipa and dfn, ('phrase not in the audited lexicon (IPA + definition)', it['key'])   # same row as build.mjs: r[10]||r[1], r[4]
    hook = (p.get('hook') or it['when']).rstrip('.!?') + '?'; wh = {w.lower() for w in words(it['when'])}
    assert len(words(hook)) <= 6 and all(w.lower() in wh for w in words(hook)), ('hook must be <= 6 words taken from `when`', hook, it['when'])
    sw, dn, q = it['swap'], it.get('dont'), it['quiz']; right = q['options'][q['answer']]
    rude = bool(dn) and dn['reg'] == 'rude'; shown = dn and (say_mask(dn['text']) if rude else dn['text'])
    ans = right if right[0].isupper() else re.split(r'(?<=[.!?])\s+', q['ask'].rstrip('…').strip())[-1] + ' ' + right   # 'You are…' + 'over the moon.'
    lines = [
        L('h', hook, 1.2, pose=True),   # the silence after the hook = the teacher's reaction pose (host.py / build.py)
        L('p', it['say']),
        L('r', f"Repeat after me: {it['say']}", 1.6, repeat=True),   # 1.6 s silent gap = the learner's turn
        L('m', it['mean']),
        L('s', f"Not this! Try: {sw['text']}" if dn else f"Or say: {sw['text']}"),
        L('q', f"Quick quiz! {q['ask']}", 2.6, quiz=True),
        L('a', ans),
        L('c', 'Save this. Free on lexkite.com.')]
    if dn:   # the don't line is shown, never voiced; a rude one is masked and never in the quiz
        bad = dn['text'].lower().rstrip('!.?')
        assert not any(bad in l['text'].lower() for l in lines), ('dont line would be voiced', dn['text'])
        assert not (rude and any(bad in o.lower() for o in q['options'])), ('rude line in the quiz', dn['text'])
    return dict(lines=lines, teacher=S_['teacher'], pose=dict(clip=it['pose'], after='h'),
                data=dict(key=it['key'], say=it['say'], ipa=ipa, define=dfn, reg=it['reg'], mean=it['mean'], when=it['when'], swap=sw,
                          dont=dn and dict(text=shown, reg=dn['reg'], masked=rude), quiz=dict(stem=q['ask'], options=q['options'], answer=q['answer'])),
                cta=cta('phrases', '#/phrases', 'Learn real phrases'), hook=dict(line='h', text=hook), src=dict(say=S_['id'], key=it['key'], item=k_.index(p['key'])))


T['l1'] = l1; SERIES['l1'] = 'Stop Saying This'
T['react'] = react; SERIES['react'] = 'Say it like a native'   # 9:16 reaction-card short (owner OK Stitch brand/stitch/say/video-frame 31/10)


def words(s): return re.findall(r"[A-Za-z0-9'’-]+", s)


def make(row):
    t = row['template']; who = row['teacher']
    assert who in REG['people'], ('teacher not in web/teach/characters.json', who)
    sp = T[t](row['in'])
    if 'teacher' in sp:   # react: the series' own teacher (Ama = female voice, Carlos = male voice) + a pose from that teacher's registry clips
        assert sp.pop('teacher') == who and sp['pose']['clip'] in REG['people'][who]['clips'], ('react: series teacher / pose mismatch', who, sp['pose'])
    ep = dict(id=row['id'], template=t, series=SERIES[t], part=row.get('part', 1), theme=row['theme'], teacher=who,
              voice=REG['people'][who]['voice']['video'], speed=row.get('speed', 0.8), area=sp['cta']['area'], **sp)
    # self-checks (the CI gates re-check on the real audio): hook <= 6 words, one point, 55-95 words, est. <= 150 wpm
    n = sum(len(words(l['text'])) for l in ep['lines']); est = n / (2.55 * ep['speed']) + sum(l['pause'] for l in ep['lines'])
    hk = ep['lines'][0]['text']
    assert len(words(hk)) <= 7, ('hook too long', hk)
    assert 30 <= n <= 70, ('word count', n)
    assert 60 * n / est <= 150, ('pace', 60 * n / est)
    if row.get('lang'): ep['lang'] = row['lang']   # L1 clip: routed only to pages whose cfg.lang == lang (functions/api/_distribution.js blockOf)
    ep['est'] = dict(words=n, seconds=round(est, 1), wpm=round(60 * n / est))
    ep['publish'] = PUBLISH.build(ep)   # posting metadata written at production from this script (publish.py, docs/specs/video-production-v2.md §2)
    return ep




# ---------------- batch episodes (owner 2/11: hundreds of episodes, machine QC instead of a per-image OK) ----------------
# gen.py --plan N appends up to N new rows to auto.json – five data-driven templates, every fact frozen in the row from our own data:
#   usuk   (curated pairs usuk-pairs.json, both words + IPA in the audited bank)   verbs (verb engine forms + over-regularised mistake,
#   sentences = lexicon example rows)   stress (stress-shift families: word + suffix, IPA stress mark moves)   guess (img.json picture of
#   the exact word#n sense)   review (audited word bank card). Each row passes four machine gates, written to reviewed.json:
#   data (facts == bank / engine / img.json) · level (every spoken word NGSL <= B1 except the taught words) · hook (true for these facts,
#   <= 6 words) · dup (point content hash never reused, picture pHash >= 10 bits from every other picture). Order = least-covered app area
#   first (content/video/ecosystem.json ids), never the same template twice in a row.
# gen.py --verify re-checks every auto row against the live bank (a changed fact drops the episode from rendering, listed as stale);
# gen.py --todo [--count | --take N] = verified rows not yet in bank.json (CI renders, bank.py banks only QC >= 90 with every gate green).
AUTO_F, REV_F = f'{ROOT}/content/video/teach2d/auto.json', f'{ROOT}/content/video/teach2d/reviewed.json'
BANK_F, PAIRS_F = f'{ROOT}/content/video/teach2d/bank.json', f'{ROOT}/content/video/teach2d/usuk-pairs.json'
ECO = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
AUTO_T = dict(usuk='ama', verbs='carlos', stress='carlos', guess='carlos', review='carlos')   # one teacher per series (the pilot's)
AREA = dict(usuk='dictionary', verbs='verbs', stress='pronunciation', guess='dictionary', review='vocab-review')
REVIEWER = 'gen.py machine gates v1 (data == audited bank / verb engine / img.json · level <= B1 NGSL · hook true · no duplicate point or picture)'
FRAME = set('participle irregular quiz lexkite com u s k america britain london manchester liverpool edinburgh forgot clue clues'.split()) | set('abcdefghijklmnopqrstuvwxyz') \
    | set('one two three four five six seven eight nine ten eleven twelve'.split())   # template words (pilot-reviewed), spelled letters, letter counts
CITIES, ORD, CEFR_OK = ['London', 'Manchester', 'Liverpool', 'Edinburgh'], 'first second third fourth fifth'.split(), ('A1', 'A2', 'B1')
GUESS_SKIP = {'hike', 'biology', 'conditioner', 'drill', 'journal', 'disk', 'dent', 'explosion', 'block', 'lie', 'lover', 'fighter',
              'miss', 'spot', 'chemistry', 'chip', 'daddy', 'set', 'switch', 'scan'}   # teacher review 2/11: the bank example uses another sense (price hike, air conditioner, fire drill)
SKIP_VERBS = {'be', 'have', 'do', 'lie', 'lay', 'wind', 'spring', 'string', 'mistake', 'read', 'ring', 'hang', 'mean', 'let', 'set', 'quit', 'shut', 'rid', 'bet', 'upset', 'hit', 'hurt', 'put', 'cost', 'cut'}   # 2 meanings / reads like another word / same 3 forms
_F = None


def facts():
    global _F
    if _F is None:
        _F = json.loads(subprocess.run(['node', f'{ROOT}/scripts/video/teach2d/facts.mjs', 'bank'], capture_output=True, text=True, check=True, cwd=ROOT).stdout)
        _F['vb'] = {v['base']: v for v in _F['verbs']}; _F['exset'] = set(_F['ex'])
    return _F


def unknown(texts):   # NGSL (<= B1) gate, the scriptbank's known(): one node call for every text
    return json.loads(subprocess.run(['node', f'{ROOT}/scripts/video/teach2d/facts.mjs', 'known'], input=json.dumps(texts), capture_output=True, text=True, check=True, cwd=ROOT).stdout)


def nuclei(ipa):   # vowel nuclei, the same count qc.py's stress_index walks
    sys.path.insert(0, f'{ROOT}/scripts/video/tpl'); from overlay_gates import VOWELS
    n, prev = 0, False
    for ch in ipa.strip('/'):
        v = ch in VOWELS; n += v and not prev; prev = v
    return n


def stress_ix(ipa):
    sys.path.insert(0, f'{ROOT}/scripts/video/tpl'); from overlay_gates import stress_index
    return stress_index(ipa)


DIG, ONSET = ('ch', 'sh', 'th', 'ph', 'wh', 'gh', 'qw'), ('br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr', 'bl', 'cl', 'fl', 'gl', 'pl')


def ortho(w):   # spelling syllables: vowel groups (y after a letter = vowel, final silent e joins), V-CV, VC-CV, digraph / onset cluster to the next syllable
    s = w.replace('qu', 'qw'); vow = [c in 'aeiou' or (c == 'y' and i > 0) for i, c in enumerate(s)]; G = []
    for i, v in enumerate(vow):
        if v and (not G or G[-1][1] != i): G.append([i, i + 1])
        elif v: G[-1][1] = i + 1
    if len(G) > 1 and s.endswith('e') and G[-1] == [len(s) - 1, len(s)] and not re.search(r'[^aeiou]le$', s): G.pop()
    cuts = []
    for (a0, a1), (b0, b1) in zip(G, G[1:]):
        c = s[a1:b0]
        if len(c) == 1 and s[b0:b1][:2] in ('ia', 'io', 'iu'): cuts.append(b0)   # fa-mil-iar, not fa-mi-liar
        elif len(c) > 2 and c[:2] in DIG: cuts.append(a1 + 2)                    # ath-lete
        else: cuts.append(a1 if len(c) <= 1 or c in DIG or c in ONSET else b0 - 2 if c[-2:] in DIG + ONSET else a1 + 1)
    out, p = [], 0
    for c in cuts + [len(w)]: out.append(w[p:c]); p = c
    return out


def clean(s, lo=4, hi=10):   # a plain spoken sentence from our data: no quotes, digits or semicolons, 4-10 words
    return bool(re.fullmatch(r"[A-Z][A-Za-z ,'’-]*[a-z]\.", s)) and lo <= len(words(s)) <= hi


VAGUE = re.compile(r'^(a|an|the) (type|kind|sort|part|small part|piece|form|way|state|quality|fact|act|amount|number|time|place|thing|area|empty area|period|feeling|situation|condition)\b|^(something|someone|being|having)\b')
TOPIC_SKIP = {'alcohol', 'alcoholic', 'beer', 'wine', 'whiskey', 'gun', 'pistol', 'cigarette', 'drug', 'drugs', 'bomb', 'weapon', 'knife', 'blood', 'dead', 'death', 'kill', 'die', 'killer', 'murderer', 'murder'}   # family-safe feed


def gloss(dfn):   # the first clause of a bank definition, if it is a full noun phrase (a/an/the ...) or verb (to ...) – else None
    d = dfn.split(';')[0].strip().rstrip('.')
    return d if re.match(r'^(a|an|the|to) [a-z]', d) and not VAGUE.match(d) else None


def clue_of(dfn):
    c = re.sub(r'^(an?|the) (object|thing|device|place|person) (that|which|for) ', 'It ', dfn.split(';')[0]).rstrip('.') + '.'
    return c[0].upper() + c[1:]


def cand_usuk(F):
    for i, p in enumerate(json.load(open(PAIRS_F))['pairs']):
        us, uk = p['us'], p['uk']; A, B = F['words'].get(us), F['words'].get(uk)
        if not (A and B and A['ipa'] and B['ipa']): continue
        yield dict(template='usuk', point=f'{us}/{uk}', heads=[us, uk], taught=[us, uk], slug=us,
                   **{'in': dict(us=us, uk=uk, ipa_us=A['ipa'], ipa_uk=B['ipa'], same='Same thing!', example=p['example'], quiz_city=CITIES[i % len(CITIES)],
                                 us_say=f'people say {us}.', uk_say=f'people say {uk}.', quiz_say='Which word do people use?', ans_say=f'{uk.capitalize()}!')})


def cand_verbs(F):
    W = F['words']
    for v in sorted(F['verbs'], key=lambda v: ((W.get(v['base']) or {}).get('cefr') or 'C9', v['base'])):
        b, P, PP, over = v['base'], v['P'], v['PP'], v['over']
        if b in SKIP_VERBS or not (v['irregular'] and not v['partial'] and not v['tags'] and over and len(v['past']) == 1 and len(v['pp']) == 1): continue
        if (W.get(b) or {}).get('cefr') not in CEFR_OK: continue
        subj = r"(?:^|\b(?:I|you|he|she|we|they|You|He|She|We|They)\s+)"
        past = [s for s in F['ex'] if clean(s) and re.search(subj + rf"{P}\b", s) and not re.search(rf"\b(have|has|had|is|are|was|were|be|been|being|'ve|'s)\s+(\w+\s+)?{P}\b", s, re.I)]
        if not past: continue
        past.sort(key=lambda s: (len(words(s)), s))   # shortest first: the social short must stay <= 28 s (qc.py duration)
        if P != PP:   # quiz: past participle after have / be (the past form there is the classic mistake)
            qs = [s for s in F['ex'] if clean(s) and re.search(rf"\b(have|has|had|haven't|hasn't|is|are|was|were|been)\s+(not\s+|never\s+|just\s+|already\s+|ever\s+)?{PP}\b", s) and len(re.findall(rf'\b{PP}\b', s)) == 1]
            if not qs: continue
            q = sorted(qs, key=lambda s: (not s.endswith(f' {PP}.'), len(words(s)), s))[0]; opts, right = [P, PP], PP
        else:          # past == participle: quiz = the over-regularised form vs the real one
            qs = [s for s in past[1:] if len(re.findall(rf'\b{P}\b', s)) == 1] or past[:1]; q = min(qs, key=lambda s: (len(words(s)), s)); opts, right = [over, P], P
        stem = re.sub(rf'\b{right}\b', '___', q, count=1)
        say = (stem[:-len(' ___.')] + f' {opts[0]}, or {opts[1]}?') if stem.endswith(' ___.') else f"{stem.replace('___', 'blank')} {opts[0].capitalize()}, or {opts[1]}?"
        yield dict(template='verbs', point=b, heads=[b], taught=[b, P, PP, over], slug=b,
                   **{'in': dict(base=b, P=P, PP=PP, over=over, ex_past=past[0], quiz_q=say, quiz_stem=stem, quiz_right=right, quiz_opts=opts, quiz_a=f"{right.capitalize()}! {q}")})


def cand_stress(F):
    W, SUF = F['words'], ['er', 'ic', 'ical', 'ity', 'ian', 'ion', 'ation', 'ial', 'ous', 'al', 'ist', 'ee', 'eer', 'ese', 'ive', 'ative', 'ify', 'ics', 'ious', 'ual']
    out = []
    for a, A in sorted(W.items()):
        if not re.fullmatch('[a-z]+', a) or a in TOPIC_SKIP or not A['ipa'] or A['cefr'] not in CEFR_OK + ('B2',): continue
        for st in sorted({a, a[:-1] if a[-1] in 'ey' else a, a[:-1] + 'i' if a.endswith('y') else a}):
            for sf in SUF:
                b = st + sf; B = W.get(b)
                if not B or b in TOPIC_SKIP or not B['ipa'] or B['cefr'] not in CEFR_OK + ('B2',) or b == a: continue
                sa, sb = stress_ix(A['ipa']), stress_ix(B['ipa'])
                if None in (sa, sb) or sa == sb or sb == 0: continue
                ya, yb = ortho(a), ortho(b)
                if not (len(ya) == nuclei(A['ipa']) == A['syl'] >= 2 and len(yb) == nuclei(B['ipa']) == B['syl'] and max(sa, sb) < len(ORD)): continue
                out.append(dict(template='stress', point=f'{a}/{b}', heads=[a, b], taught=[a, b] + ya + yb, slug=b, cefr=max(A['cefr'], B['cefr']),
                                **{'in': dict(a=dict(word=a, syl=ya, stress=sa, say=ORD[sa], ipa=A['ipa']), b=dict(word=b, syl=yb, stress=sb, say=ORD[sb], ipa=B['ipa']))}))
    yield from sorted(out, key=lambda c: (c['cefr'], c['point']))


_I = None


def img_items():
    global _I
    if _I is None: _I = json.load(open(f'{ROOT}/content/lexicon/img.json'))['items']
    return _I


def cand_guess(F):
    W, I = F['words'], img_items()
    for k in sorted(I, key=lambda k: ((W.get(k[:-2]) or {}).get('cefr') or 'C9', k)):
        w, it = k[:-2], I[k]; r = W.get(w)
        if not (k.endswith('#n') and r and r['key'] == k and r['cefr'] in ('A1', 'A2') and r['em'] and re.fullmatch('[a-z]{3,12}', w) and r['ipa'] and r['def'] and r['ex']): continue   # concrete A1-A2 nouns (emoji in the bank)
        if it.get('rejected') or not it.get('ph') or ((it.get('q') or {}).get('conf') or 0) < 80: continue
        if w in TOPIC_SKIP | GUESS_SKIP or not gloss(r['def']) or gloss(r['def']).startswith('to '): continue
        cl = clue_of(gloss(r['def']))
        if len(cl) > 30 or re.search(rf'\b{w[:4]}', cl.lower()) or not clean(r['ex'], 4, 10) or not re.search(rf'\b{w}\b', r['ex'].lower()): continue
        yield dict(template='guess', point=w, heads=[w], taught=[w], slug=w, ph=it['ph'], **{'in': dict(word=w, img=k, ipa=r['ipa'], **{'def': gloss(r['def'])}, ex=r['ex'], bank_def=r['def'])})


def cand_review(F):
    W = F['words']
    for w, r in sorted(W.items(), key=lambda x: (x[1]['cefr'] != 'B1', x[1]['cefr'] or 'C9', x[0])):   # B1 first: the words learners are working on
        if r['cefr'] not in CEFR_OK or not re.fullmatch('[a-z]{3,14}', w) or not (r['ipa'] and r['def'] and r['ex']): continue
        g = gloss(r['def'])
        if w in TOPIC_SKIP | GUESS_SKIP or not g or len(g) > 60 or len(words(g)) > 12 or not clean(r['ex'], 4, 12) or not re.search(rf'\b{w}\b', r['ex'].lower()): continue
        yield dict(template='review', point=w, heads=[w], taught=[w], slug=w, **{'in': dict(word=w, ipa=r['ipa'], **{'def': g}, ex=r['ex'], bank_def=r['def'])})


CANDS = dict(usuk=cand_usuk, verbs=cand_verbs, stress=cand_stress, guess=cand_guess, review=cand_review)


def taught_re(ws):   # the taught words + their inflections are exempt from the level gate (they are the lesson)
    return re.compile(r"\b(" + '|'.join(sorted({re.escape(x.lower()) for x in ws if x}, key=len, reverse=True)) + r")(s|es|ed|d|ing|'s)?\b", re.I)


def lvl_ok(w, F):   # not in NGSL but an A1-B1 word of our audited bank (birthday, airport, laptop): still <= B1
    w = w.lower().replace('’', "'")
    return any((F['words'].get(x) or {}).get('cefr') in CEFR_OK for x in {w, re.sub(r"'s$", '', w), re.sub('s$', '', w), re.sub('es$', '', w), re.sub('ies$', 'y', w), re.sub('ed$', '', w), re.sub('d$', '', w), re.sub('ing$', '', w), re.sub('ing$', 'e', w)})


SYL_S, LINE_S, TAIL, MARGIN = 0.285, 0.16, 0.7, 1.1   # Kokoro speech time fitted on 11 CI renders 3/11 (max error 1.07 s); gaps = spec pauses + 0.7 s exactly


def syl(w):
    w = w.lower(); n = len(re.findall('[aeiouy]+', w))
    return max(1, n - (n > 1 and w.endswith('e') and not w.endswith(('le', 'ee'))))


def short_secs(ep):   # predicted social short length + fit margin (qc.py duration gate: 18-28 s, owner 29/10)
    t = ' '.join(l['text'] for l in ep['lines'])
    return SYL_S * sum(syl(w) for w in re.findall("[A-Za-z']+", t)) + LINE_S * len(ep['lines']) + sum(l['pause'] for l in ep['lines']) + TAIL + MARGIN


_FONT = {}


def text_w(s, sz, ipa=False):   # same fonts and widths as build.py (Jakarta 800 / Noto Sans for IPA)
    from PIL import ImageFont
    k = (sz, ipa)
    if k not in _FONT:
        f = ImageFont.truetype(f"{ROOT}/brand/social/src/fonts/{'NotoSans-Medium.ttf' if ipa else 'PlusJakartaSans-VF.ttf'}", sz)
        if not ipa: f.set_variation_by_axes([800])
        _FONT[k] = f
    return _FONT[k].getlength(s)


def fits(row):   # build.py card geometry that the layout gate rejects: US/UK split card = 2 halves of 450 px, the VS medallion 60 px either side of the seam
    if row['template'] == 'usuk': return all(text_w(row['in'][k], 48, True) <= 320 for k in ('ipa_us', 'ipa_uk'))
    return True


def phash_far(ph, others, bits=10): return all(bin(int(ph, 16) ^ int(o, 16)).count('1') >= bits for o in others)


def data_gate(row, F=None):   # facts in the row == live sources; returns the list of problems (empty = green)
    F = F or facts(); W, t, p, bad = F['words'], row['template'], row['in'], []
    def eq(w, field, val):
        if (W.get(w) or {}).get(field) != val: bad.append(f'{w}.{field} changed in the bank')
    if t == 'usuk':
        eq(p['us'], 'ipa', p['ipa_us']); eq(p['uk'], 'ipa', p['ipa_uk'])
        if not any(x['us'] == p['us'] and x['uk'] == p['uk'] and x['example'] == p['example'] for x in json.load(open(PAIRS_F))['pairs']): bad.append('pair not curated')
        if not re.search(rf"\b{p['us']}\b", p['example'].lower()): bad.append('example lacks the US word')
    elif t == 'verbs':
        v = F['vb'].get(p['base']) or {}
        if (v.get('P'), v.get('PP'), v.get('over')) != (p['P'], p['PP'], p['over']) or not v.get('irregular'): bad.append('verb engine forms changed')
        if p['ex_past'] not in F['exset'] or p['quiz_stem'].replace('___', p['quiz_right']) not in F['exset']: bad.append('sentence not in the lexicon examples')
    elif t == 'stress':
        for k in 'ab':
            x = p[k]; eq(x['word'], 'ipa', x['ipa'])
            if stress_ix(x['ipa']) != x['stress'] or ''.join(x['syl']) != x['word'] or len(x['syl']) != nuclei(x['ipa']): bad.append(f"{x['word']} stress / syllables")
        if p['a']['stress'] == p['b']['stress']: bad.append('stress does not move')
    else:
        w = p['word']
        for f in ('ipa', 'ex'): eq(w, f, p[f])
        eq(w, 'def', p.get('bank_def', p['def']))
        if 'bank_def' in p and gloss(p['bank_def']) != p['def']: bad.append('gloss != first clause of the bank definition')
        if t == 'guess':
            it = img_items().get(p['img']) or {}
            if p['img'] != f'{w}#n' or (W.get(w) or {}).get('key') != p['img'] or not it.get('ph') or it.get('rejected'): bad.append('picture is not this word sense')
    return bad


def hook_gate(row, ep):   # the on-screen hook is a true claim about these facts (and short)
    t, p = row['template'], row['in']; hk = ep['hook']['text']
    ok = len(words(hk)) <= 6 and len(words(ep['lines'][0]['text'])) <= 7
    if t == 'verbs': ok = ok and hk == f"{p['base']} · {p['P']} · {p['PP']}"
    if t == 'stress': ok = ok and p['a']['stress'] != p['b']['stress']
    if t == 'usuk': ok = ok and p['us'] != p['uk'] and p['ipa_us'] != p['ipa_uk']
    return ok


def chash(t, point): return hashlib.sha1(f'{t}:{point}'.lower().encode()).hexdigest()[:12]


L1_F = f'{ROOT}/content/video/teach2d/l1.json'
def l1_rows():   # l1.json (first rows) + l1/<lang>.json (one file per language, content lane of the daily reels)
    import glob
    return [r for f in [L1_F] + sorted(glob.glob(f'{ROOT}/content/video/teach2d/l1/*.json')) if os.path.exists(f) for r in json.load(open(f))['rows']]
def load_l1(): return [dict(r, template='l1', area='grammar-check') for r in l1_rows()]


def l1_gate(row, F=None):   # level <= B1 for every spoken word (the taught words are exempt) + native text complete
    p = row['in']; bad = []; n = p['native']
    taught = taught_re(re.findall(r"[A-Za-z']+", p['wrong'] + ' ' + p['right']) + [p['strike']])
    spoken = [p['hook_say'], p['wrong'], p['right'], p['why'], p['answer_say'], p['quiz']['stem']]
    for t in spoken:
        un = [w for w in unknown([taught.sub('', t)])[0] if len(w) > 1 and not lvl_ok(w, F or facts())] if t else []
        if un: bad.append(f'level>B1: {un}')
    if not all(n.get(k) for k in ('hook', 'tip', 'caption', 'comment', 'hashtags')) or not row.get('lang'): bad.append('native text incomplete')
    return bad


def load_auto(): return json.load(open(AUTO_F)) if os.path.exists(AUTO_F) else dict(_note='', rows=[])


def mkrow(c):
    return dict(id=f"t2a_{c['template']}_{re.sub('[^a-z0-9]', '', c['slug'].lower())}", template=c['template'], teacher=AUTO_T[c['template']], theme='dusk',
                area=AREA[c['template']], point=c['point'], hash=chash(c['template'], c['point']), heads=c['heads'], taught=c['taught'], **({'ph': c['ph']} if 'ph' in c else {}), **{'in': c['in']})


def plan(n):
    F = facts(); A = load_auto(); R = json.load(open(REV_F)); rows = A['rows']; why = {}
    used_h = {r['hash'] for r in rows} | {chash(r['template'], pilot_point(r)) for r in PIL['pilots']}
    used_w = {h for r in rows for h in r['heads']} | {h for r in PIL['pilots'] for h in pilot_point(r).split('/')}
    phs = [r['ph'] for r in rows if r.get('ph')] + [img_items()[r['in']['img']]['ph'] for r in PIL['pilots'] if r['template'] == 'guess' and img_items().get(r['in']['img'], {}).get('ph')]
    def skip(k): why[k] = why.get(k, 0) + 1
    pool = {t: [] for t in CANDS}
    for t in CANDS:   # shaped + data-gated candidates (bounded), then ONE level-gate call for all of them
        for c in CANDS[t](F):
            if len(pool[t]) >= 3 * n: break
            if chash(t, c['point']) in used_h or any(h in used_w for h in c['heads']): skip('dup'); continue
            row = mkrow(c)
            if data_gate(row, F): skip('data'); continue
            try: ep = make(row)
            except AssertionError as e: skip('shape:' + str(e.args[0][0])); continue
            if not hook_gate(row, ep): skip('hook'); continue
            if not 18 <= short_secs(ep) <= 28: skip('duration'); continue   # 3/11: 8 shorts ran 30-34 s (verbs with long sentences)
            if not fits(row): skip('layout'); continue
            pool[t].append([row, ep, taught_re(row['taught']).sub(' ', ' '.join(l['text'] for l in ep['lines']))])
    allc = [x for t in CANDS for x in pool[t]]
    wl = sorted({r['in']['word'] for r, _, _ in allc if r['template'] in ('review', 'guess')})
    core = {w for w, u in zip(wl, unknown(wl)) if not u} | {w for w in wl if F['words'][w]['cefr'] in ('A1', 'A2')}   # taught word = NGSL core or A1-A2 (bank CEFR alone said B1 for covariance)
    allc = [x for x in allc if x[0]['template'] not in ('review', 'guess') or x[0]['in']['word'] in core]
    pool = {t: [x for x in pool[t] if x in allc] for t in CANDS}
    for x, un in zip(allc, unknown([x[2] for x in allc])): x[2] = [u for u in un if u.lower() not in FRAME and not lvl_ok(u, F)]
    cov = {a: 0 for a in ECO}
    for f in os.listdir(f'{ROOT}/content/video/teach2d/eps'):
        ar = json.load(open(f'{ROOT}/content/video/teach2d/eps/{f}'))['cta']['area']; cov[ar] = cov.get(ar, 0) + 1
    new, last, it = [], rows[-1]['template'] if rows else None, {t: iter(pool[t]) for t in CANDS}; dead = set()
    while len(new) < n and len(dead) < len(CANDS):
        live = [t for t in CANDS if t not in dead and t != last] or [t for t in CANDS if t not in dead]
        t = min(live, key=lambda t: (cov.get(AREA[t], 0), list(CANDS).index(t)))   # least-covered app area first, never the same template twice in a row
        x = next(it[t], None)
        if x is None: dead.add(t); continue
        row, ep, un = x
        if un: skip('level'); continue
        if any(h in used_w for h in row['heads']): skip('dup'); continue
        if row.get('ph') and not phash_far(row['ph'], phs): skip('phash'); continue
        rows.append(row); new.append(row); used_h.add(row['hash']); used_w.update(row['heads']); cov[AREA[t]] = cov.get(AREA[t], 0) + 1; last = t
        if row.get('ph'): phs.append(row['ph'])
        R['verdicts'][row['id']] = dict(template=t, hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=REVIEWER, machine=True,
                                        gates=dict(data=True, level=True, hook=True, dup=True), hash=row['hash'], script={l['id']: l['text'] for l in ep['lines']})
    json.dump(A, open(AUTO_F, 'w'), indent=1, ensure_ascii=False); open(AUTO_F, 'a').write('\n')
    json.dump(R, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n')
    by = ', '.join(f"{t} {sum(r['template'] == t for r in new)}" for t in CANDS); print(f'plan: +{len(new)} rows ({by}), total {len(rows)}; skipped {why}')


def pilot_point(r):
    p = r['in']; return dict(usuk=lambda: f"{p.get('us')}/{p.get('uk')}", verbs=lambda: p.get('base'), stress=lambda: f"{p['a']['word']}/{p['b']['word']}" if 'a' in p else '',
                             guess=lambda: p.get('word'), review=lambda: p.get('word')).get(r['template'], lambda: r['id'])()


def verify():   # live re-check of every auto row: (ok ids, stale [(id, problems)])
    F = facts(); ok, stale = [], []
    for r in load_auto()['rows']:
        b = data_gate(r, F); (stale.append((r['id'], b)) if b else ok.append(r['id']))
    for r in load_l1():
        b = l1_gate(r, F); (stale.append((r['id'], b)) if b else ok.append(r['id']))
    return ok, stale


def todo():
    ok, stale = verify(); B = (json.load(open(BANK_F)) if os.path.exists(BANK_F) else {}).get('eps', {})
    for i, b in stale: print(f'::warning::stale (fact changed, not rendered): {i}: {b}', file=sys.stderr)
    return [i for i in ok if not (B.get(i, {}).get('state') == 'banked' or B.get(i, {}).get('tries', 0) >= 2)]   # 2 red renders -> left for a person (sheet lists it)


if __name__ == '__main__':
    A_ = sys.argv
    if '--plan' in A_: plan(int(A_[A_.index('--plan') + 1])); sys.exit(0)
    if '--todo' in A_:
        T_ = todo()
        if '--count' in A_: print(f'cần render {len(T_)}'); sys.exit(0)
        print(json.dumps(T_[:int(A_[A_.index('--take') + 1])] if '--take' in A_ else T_)); sys.exit(0)
    if '--pick' in A_:   # teach-video preqc: explicit ids > next N todo (ci-filler 'shards') > PR smoke (pilots + first auto ep of each template) > pilots
        i = A_.index('--pick'); ids, n, ev = [x.strip() for x in A_[i + 1].split(',') if x.strip()], int(A_[i + 2] or 0), A_[i + 3]
        par = int(A_[i + 4]) if len(A_) > i + 4 and A_[i + 4].isdigit() else 30
        if len(ids) > 120: sys.exit(f'--pick: {len(ids)} explicit episodes > 120 (render matrix = 2 formats x episodes <= 256 jobs) - dispatch in chunks of <= 120 with distinct batch ids')
        if not ids and n > 0: ids = todo()[:min(n, 120, 4 * par)]   # render matrix = 2 x episodes <= 256 jobs; ~4 episodes per free runner per run
        if not ids:
            ids = [r['id'] for r in PIL['pilots']]
            if ev == 'pull_request': R_ = load_auto()['rows']; ids += [next(r['id'] for r in R_ if r['template'] == t) for t in CANDS if any(r['template'] == t for r in R_)]
        if ev == 'pull_request': ids = ids[:PR_SMOKE_MAX]   # luật 11 (hàng chờ 48 job teach-video, 07/11): PR chỉ smoke preqc + 1 tập; render đủ chạy khi dispatch/ci-filler
        print(json.dumps(ids)); sys.exit(0)
    if '--l1-review' in A_:   # (re)write the reviewed.json verdict of every L1 clip: script + native hook as reviewed, level gate green (l1_gate); native-qa.mjs is the second gate (preqc)
        R_ = json.load(open(REV_F)); F_ = facts()
        for row in load_l1():
            assert not l1_gate(row, F_), (row['id'], l1_gate(row, F_)); ep = make(row)
            R_['verdicts'][row['id']] = dict(template='l1', hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer='gen.py l1_gate (spoken words <= B1) + Claude L1 review 11/11/2026 (one L1 mistake, English example kept verbatim in the native caption); native text: scripts/rig/native-qa.mjs', script={l['id']: l['text'] for l in ep['lines']})
        json.dump(R_, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n'); print('l1 verdicts', len(load_l1())); sys.exit(0)
    if '--verify' in A_:
        ok_, st_ = verify(); print(f'verify: {len(ok_)} ok, {len(st_)} stale'); [print(' ', i, b) for i, b in st_]; sys.exit(0)
    out = f'{ROOT}/content/video/teach2d/eps'; os.makedirs(out, exist_ok=True)
    for row in PIL['pilots'] + load_auto()['rows'] + load_l1():
        ep = make(row)
        if '-q' not in A_: print(f"{ep['id']:28s} {ep['template']:8s} {ep['teacher']:7s} {ep['theme']:5s} {ep['est']}")
        if '--check' not in A_: json.dump(ep, open(f"{out}/{ep['id']}.json", 'w'), indent=1, ensure_ascii=False)
