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
GOLD_FILES = ('g0000', 'gold-curated-b')   # audited gold banks; a row id may live in only one file (teach2d-gen test)
for _f in GOLD_FILES:
    for x in open(f'{ROOT}/content/video/scripts/bank/{_f}.jsonl'):
        r = json.loads(x); assert r['id'] not in GOLD, ('gold id in two bank files', r['id'], _f); GOLD[r['id']] = r
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
        L('q', 'Got it? Take a guess!', 3.0, quiz=True),
        L('a', f"{w.capitalize()}! {ex}"),
        L('sh', 'Send this to a friend!'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(word=w, ipa=ipa, clue=clue, n=n, img=p['img'], ex=ex),
        cta=cta('dictionary', f'#/dict/{w}', 'Look up any word'), hook=dict(line='h', text='Guess the word!'))


def level(p):   # Level Check (3 gold quiz items): progress dots, question card, score pill, trophy
    Q = [gq(GOLD[x]) for x in p['gold']]; lines = [L('h', 'Level check! Ready?')]
    for i, (stem, opts, ans, right) in enumerate(Q, 1):
        lines += [L(f'q{i}', f"Question {['one', 'two', 'three'][i - 1]}.", 2.4, quiz=True), L(f'a{i}', stem.replace('___', right))]   # the answer = the full sentence (no lone word first: whisper drops it)
    lines += [L('s', 'Three out of three? Well done!'), L('c', 'Save this. Free on lexkite.com.')]
    return dict(lines=lines, data=dict(qs=[dict(stem=s_, options=o_, answer=a_) for s_, o_, a_, _ in Q]),
                cta=cta('placement', '#/placement', 'Take the level test'), hook=dict(line='h', text='Level check!'), src=dict(gold=p['gold']))


def appdata(files, expr):   # the app's own content files (web/js/...), evaluated exactly as the browser does -> JSON of `expr`
    js = ("const vm=require('vm'),fs=require('fs');const c={};c.window=c;c.self=c;c.g=c;vm.createContext(c);"
          "for(const f of JSON.parse(process.argv[1]))vm.runInContext(fs.readFileSync(f,'utf8'),c);"
          "console.log(JSON.stringify(vm.runInContext(process.argv[2],c)))")
    return json.loads(subprocess.run(['node', '-e', js, json.dumps([next((q for q in (f'{ROOT}/web/js/{f}', f'{ROOT}/web/cpack/{f}') if os.path.exists(q)), f'{ROOT}/web/js/{f}') for f in files]), expr], capture_output=True, text=True, check=True).stdout)


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


# ---------------- roots: "Gốc từ" word-root family (content/video/teach2d/roots.json; IPA / definition / example from the audited bank) ----------------
ROOTS_F = f'{ROOT}/content/video/teach2d/roots.json'
ROOTS_BIAS, ROOTS_MAX = 0.9, 27.0   # real CI shorts run ~0.9 s over short_secs (rule clips 25.7-25.9 vs 24.9 predicted); QC ceiling is 28 s, so plan against 27 with the bias
_RB = None


def roots_bank():
    global _RB
    if _RB is None:
        j = json.load(open(ROOTS_F)); _RB = dict(pfx=j['prefixes'], roots={r['id']: r for r in j['roots']})
    return _RB


def seg_parts(seg, R):   # "de-|pos|-it" -> dict(pre, root, suf, parts=[(text, kind)]) ; the root part must be one of the root's variants
    parts = []
    for x in seg.split('|'):
        kind = 'pre' if x.endswith('-') else 'suf' if x.startswith('-') else 'root'; parts.append((x.strip('-'), kind))
    rp = [t for t, k in parts if k == 'root']; assert len(rp) == 1 and rp[0] in R['variants'], ('root part not a variant', seg, R['variants'])
    return dict(parts=parts, root=rp[0], pre=next((t for t, k in parts if k == 'pre'), None))


def roots(p):   # Gốc từ: one root, N real words. ring preview -> "did you know" (Latin/Greek source) -> each word: prefix + root = meaning, IPA -> 2-option quiz -> CTA
    B = roots_bank(); R = B['roots'][p['root']]; W = {x['w']: x for x in R['words']}; ws = []
    tight = bool(p.get('tight')); sy = R['say'].split(' or ')[0] if tight else R['say']   # tight (calibrated ceiling, like rule): the spoken gloss is its first sense only, the quiz pause is shorter; the card still shows the full gloss
    assert 2 <= len(p['words']) <= 4 and all(w in W for w in p['words']), ('roots: words must be in the root bank', p['words'])
    for w in p['words']:
        ipa, dfn, ex = bank(w); assert ipa and dfn and ex, ('word not in the audited bank', w)
        x = W[w]; sp = seg_parts(x['seg'], R); pm = x.get('pm') or (B['pfx'][sp['pre']] if sp['pre'] else None); assert not sp['pre'] or pm, ('prefix without meaning', x['seg'])
        ws.append(dict(w=w, ipa=ipa, mean=x['mean'], seg=x['seg'], parts=sp['parts'], pre=sp['pre'], pm=pm, pms=pm.split(' or ')[0] if pm else None, ex=ex, em=(facts()['words'].get(w) or {}).get('em', '')))
    cap, rt = (lambda t: t[0].upper() + t[1:]), R['root'].capitalize(); lines = [
        L('h', f'One root, {["zero", "one", "two", "three", "four"][len(ws)]} words!', 0.3),
        L('r', f"The root is {rt}! " + ', '.join(w['w'].capitalize() if i == 0 else w['w'] for i, w in enumerate(ws)) + '.', 0.3),
        L('k', f"{'' if tight else 'Did you know? '}{rt} is {R['lang']} for {R['say']}.", 0.3)]
    for i, w in enumerate(ws):
        lines.append(L(f'w{i}', f"{cap(w['w'])}: {w['pms']} plus {sy}." if w['pre'] else f"{cap(w['w'])}: {w['mean']}.", 0.3))
    qw = next((w for w in reversed(ws) if w['pre']), ws[-1]); other = next(w for w in ws if w is not qw)   # asked word = the last prefixed one taught; the distractor = another word of the lesson
    opts = [other['w'], qw['w']]; ans = 1; ask = f"{qw['pms']} plus {sy}" if qw['pre'] else qw['mean']
    lines += [L('q', f"Quick quiz! Which means {ask}?", 2.4 if tight else 3.0, quiz=True),
              L('a', f"{cap(qw['w'])}! {cap(qw['pms'])} plus {sy}." if qw['pre'] else f"{cap(qw['w'])}! It means {qw['mean']}."),
              L('c', 'Save this. Free on lexkite.com.')]
    return dict(lines=lines, data=dict(root=R['root'], rid=R['id'], say=R['say'], src=R['src'], src_lang=R['lang'], src_mean=R['src_mean'], words=ws,
                                       quiz=dict(stem=ask, options=opts, answer=ans)),
                cta=cta('dictionary', f"#/dict/{ws[0]['w']}", 'See the whole word family'), hook=dict(line='h', text=lines[0]['text'].rstrip('!')), src=dict(root=R['id']))


T['roots'] = roots; SERIES['roots'] = 'Word Roots'


# ---------------- rule: Spell->Sound (docs/specs/spell-sound.md; content/video/teach2d/rules.json mined into rules-words.json by rules.py) ----------------
_RJ = None


def rules_bank():
    global _RJ
    if _RJ is None:
        import rules as RU; _RJ = {r['id']: r for r in json.load(open(RU.RULES_F))['rules']}
    return _RJ


_HOMO = None
def homophone_words():   # bank words whose US IPA another bank word shares (know/no, write/right, knight/night)
    global _HOMO
    if _HOMO is None:
        by = {}
        for w, A in facts()['words'].items():
            if A.get('ipa'): by.setdefault(A['ipa'], set()).add(w)
        _HOMO = {w for g in by.values() if len(g) > 1 for w in g}
    return _HOMO


def rule(p):   # Spell->Sound: ONE rule, 2-3 real words. Hook -> the rule -> each word slow then normal (silent letter struck on its spoken word) -> repeat -> which letter is silent? -> CTA
    import rules as RU
    R = rules_bank()[p['rule']]; ws = []
    assert 1 <= len(p['words']) <= 3, ('rule: 1-3 words per lesson', p['words'])
    tight = bool(p.get('tight'))   # long words (-ally, -ement): shorter think/repeat pauses so the short still fits 28 s
    for w in p['words']:
        ipa, dfn, ex = bank(w); assert ipa and dfn, ('word not in the audited bank', w)
        sp = RU.check(R, w, ipa); assert sp, ('the IPA does not show the rule', w, ipa)   # never override an IPA: the row is dropped
        ws.append(dict(w=w, ipa=ipa, silent=sp, letter=w[sp[0]:sp[1]], mean=gloss(dfn) or clue_of(dfn), em=(facts()['words'].get(w) or {}).get('em', '')))
    assert len({x['letter'] for x in ws}) == 1, ('one silent letter per lesson', [x['letter'] for x in ws])
    cap = lambda t: t[0].upper() + t[1:]; LT = ' '.join(ws[0]['letter'].upper()); qw = ws[-1]; lines = [L('h', f'The {LT} is silent!', 0.3), L('r', R['say'], 0.3)]
    homo = homophone_words()
    for i, x in enumerate(ws): lines += [L(f'w{i}', cap(x['w']) + '.', 0.25, speed=0.6), L(f'v{i}', f"{cap(x['w'])}. Say: {x['w']}." if x['w'] in homo else cap(x['w']) + '.', 0.3)]   # slow, then normal; a word with a commoner homophone (know/no, write/right) gets a carrier phrase: whisper writes the commoner spelling of a lone 0.6 s word (caption_sync)
    other = next(c for c in qw['w'] if c not in qw['letter'])   # a different letter of the asked word: the first one that is not the silent one
    opts = [qw['letter'].upper(), other.upper()]; ans = 0
    if int(hashlib.sha1(qw['w'].encode()).hexdigest(), 16) % 2: opts.reverse(); ans = 1
    lines += [L('p', 'Repeat after me!', 1.6 if tight else 2.4), L('q', f"Quick quiz! Which letter is silent in {qw['w']}?", 2.4 if tight else 3.0, quiz=True),
              L('a', f'{LT}! The {LT} is silent.'), L('c', 'Save this. Free on lexkite.com.')]
    return dict(lines=lines, data=dict(rule=R['id'], title=R['title'], target=R['target'], letter=ws[0]['letter'], say=R['say'], words=ws,
                                       quiz=dict(stem=f"Which letter is silent in {qw['w']}?", options=opts, answer=ans)),
                cta=cta('pronunciation', f"#/pron/{ws[0]['w']}", 'Practise this sound'), hook=dict(line='h', text=lines[0]['text'].rstrip('!')), src=dict(rule=R['id']))


T['rule'] = rule; SERIES['rule'] = 'Spell to Sound'

BANDS_F = f'{ROOT}/content/video/teach2d/bands.json'
_BJ = None
def bands_bank():
    global _BJ
    if _BJ is None: _BJ = json.load(open(BANDS_F))
    return _BJ


def band(p):   # Band 5 -> 7 -> 9: ONE idea said three ways (bands.json). Hook -> the band-5 sentence -> band 7 + why -> band 9 + why -> CTA. The reason lines name the IELTS criterion the upgrade earns.
    B = bands_bank(); T_ = next((t for t in B['topics'] if t['id'] == p['topic']), None); assert T_, ('topic not in bands.json', p['topic'])
    st = T_['steps']; assert [x['band'] for x in st] == [5, 7, 9], ('three bands 5 / 7 / 9', p['topic'])
    lines = [L('h', 'Band five to nine!', 0.3)]
    for x in st:
        lines.append(L(f"s{x['band']}", x['text'], 0.3))
        if x['band'] > 5: lines.append(L(f"w{x['band']}", B['reasons'][x['why']]['en'], 0.3))
    lines.append(L('c', 'Save this. Free on lexkite.com.'))
    area = 'writing-ielts' if T_['skill'] == 'writing' else 'speaking'
    return dict(lines=lines, data=dict(topic=T_['id'], skill=T_['skill'], steps=[dict(x, **({'crit': B['reasons'][x['why']]['criterion']} if x['band'] > 5 else {})) for x in st]),
                cta=cta(area, '#/write' if area == 'writing-ielts' else '#/speaking', 'Try an IELTS model answer' if area == 'writing-ielts' else 'Practise IELTS speaking'),
                hook=dict(line='h', text='Band five to nine'), src=dict(band=T_['id']))


T['band'] = band; SERIES['band'] = 'Band 5 to 9'

T['l1'] = l1; SERIES['l1'] = 'Stop Saying This'
T['react'] = react; SERIES['react'] = 'Say it like a native'   # 9:16 reaction-card short (owner OK Stitch brand/stitch/say/video-frame 31/10)


# ---------------- slang: "Slang Card" 7-12 s reels (content/say-native/slang.json, docs/SAY-NATIVE.md "Slang Card") ----------------
SLANG_F, SLANG_SPEED, SLANG_WORDS, SLANG_SECS = f'{ROOT}/content/say-native/slang.json', 1.1, (10, 24), (7.0, 12.0)   # owner 22/11: 7-12 s vertical, ≤ 150 wpm (silences included)
_SX = None


def slang_src():   # (bank by lowercase key, TeacherRig EXPR + GESTURES) – the expression set lives in web/js/teacher-rig.js (one source with the app)
    global _SX
    if _SX is None:
        B = json.load(open(SLANG_F))
        X = json.loads(subprocess.run(['node', '-e', 'const R=require(process.argv[1]);console.log(JSON.stringify({x:R.EXPR,g:R.GESTURES}))', f'{ROOT}/web/js/teacher-rig.js'],
                                      capture_output=True, text=True, check=True).stdout)
        _SX = ({i['key'].lower(): i for i in B['items']}, X)
    return _SX


SL_M_F, SL_L_F, SL_FR_F = f'{ROOT}/content/say-native/meanings.json', f'{ROOT}/content/say-native/slang-lines.json', f'{ROOT}/content/say-native/slang-l1-frames.json'
SL_LANGS = ['vi', 'ar', 'de', 'es', 'fr', 'hi', 'id', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'zh']   # = scripts/say-native/build.mjs LANGS (pages with their own language)


def slang_l1_src(it, lang):   # the card's page-language texts (None when one is missing: the row is not planned / not rendered)
    J = lambda f: json.load(open(f)) if os.path.exists(f) else {}
    k = it['key'].lower(); m = it['vi'] if lang == 'vi' else (J(SL_M_F).get(k) or {}).get(lang); LN = J(SL_L_F)
    if m and lang != 'vi':   # ONE sense: the first that is really in the page language (fr 'bet' = "OK; Ça marche" → Ça marche); a judged gloss can also list a literal sense (ar 'salty' … ; حامض = sour)
        S_ = [x.strip() for x in re.split(r'\s*[;；]\s*', m) if x.strip()]; m = next((x for x in S_ if not re.fullmatch(r"[A-Za-z' .!-]+", x)), S_[0] if S_ else m)
    h, e = (LN.get(f'{k}|hook') or {}).get(lang), (LN.get(f'{k}|ex') or {}).get(lang)
    if lang == 'vi': h, e = it.get('vi_hook'), it.get('vi_ex')   # vi = hand-written on the card (lexai 'translate' has no vi), like the vi gloss
    return dict(m=m, hook=h, ex=e) if m and h and e else None


def slang_native(it, lang, T):   # post copy in the page language from the hand-written frames (slang-l1-frames.json) + the judged translations
    F = json.load(open(SL_FR_F))['langs'][lang]; k = it['key']; hook = F['hook'].replace('{k}', k)
    if len(hook) > 34: hook = F['hook'].replace('{k}', k.split()[0] + '…')   # the frame-0 hook stays <= 34 characters (native-qa lengths)
    ex = it['example']['text']   # the English example rides along in the tip + first comment: useful for the learner, and an acronym slang (ASAP, AFK) never makes the post 'all caps'
    tip = f'“{k}” = {T["m"]}. {F["eg"]}: “{ex}”'
    if len(tip) > 140: tip = f'“{k}” = {T["m"]}'   # native-qa: the tip stays <= 140 characters (the example is still in the caption + first comment)
    return dict(hook=hook, tip=tip, caption=f'{hook}\n“{k}” = {T["m"]}.\n{F["eg"]}: “{it["example"]["text"]}” ({T["ex"]})\n{F["cta"]}',
                comment=f'{F["ans"]}: “{k}” = {T["m"]}. “{ex}” {F["more"]}: {{link}}', hashtags=F['hashtags'])


def slang_variant(key): return 'quiz' if int(hashlib.sha1(key.lower().encode()).hexdigest(), 16) % 2 == 0 else 'misuse'


def slang(p):   # Slang Card: hook + STRONG expression (drawn face or approved pose in the silence) -> the slang + IPA -> meaning -> example -> silent quick quiz | "don't use it when…" -> CTA
    S_, X = slang_src(); it = S_[p['key'].lower()]; var = p.get('variant') or slang_variant(it['key'])
    assert var in ('quiz', 'misuse'), var
    XP = X['x'][it['expr']]; g = XP.get('gesture'); ex = it['example']
    said = it['key'][0].upper() + it['key'][1:]
    def secs(ls): return sum(len(words(l['text'])) for l in ls) / (2.55 * SLANG_SPEED) + sum(l['pause'] for l in ls)   # = make()'s estimate
    for pose_ok in ((True, False) if g else (False,)):   # the approved pose image needs a long reaction silence; when the card would pass 12 s the drawn face carries the expression alone
        lines = [L('h', it['hook'], 1.25 if pose_ok else 0.55),                   # the reaction silence: a pose gesture needs a voiced gap >= rig_plan LONG (1.2 s) to split the speak blocks; a drawn face just holds (T.expr)
             L('k', said.rstrip('.!?') + '!', 0.25),
             L('m', it['mean'], 0.2),
             L('e', ex['text'], 2.2 if var == 'quiz' else 2.4, quiz=True),   # silent card in this pause: 2-option quiz (answer lights on 'c') or the misuse card
             L('c', 'lexkite.com', 0.5)]
        if secs(lines) <= SLANG_SECS[1]: break
    pose = dict(clip=X['g'][g]['pose'], after='h') if g and pose_ok else None
    out = dict(lines=lines, expr=it['expr'], **({'pose': pose} if pose else {}),
                data=dict(key=it['key'], forms=it.get('forms') or [], ipa=it['ipa'], mean=it['mean'], define=it['def'], vi=it['vi'], reg=it['reg'], region=it['region'], level=it['level'],
                          era=it['era'], theme=it['theme'], example=ex, variant=var, quiz=it['quiz'], misuse=it['misuse']),
                cta=cta('phrases', '#/phrases', 'Learn real slang free'), hook=dict(line='h', text=it['hook']), src=dict(slang=it['key']))
    if p.get('lang'):   # L1 page: same English lesson; the meaning, the hook and the example also in the page language (shown under the English), post copy in that language
        T_ = slang_l1_src(it, p['lang']); assert T_, ('slang L1 texts missing', it['key'], p['lang'])
        out['data'].update(l1=T_['m'], l1_hook=T_['hook'], l1_ex=T_['ex'], right=it['key'], native=slang_native(it, p['lang'], T_))
    return out


T['slang'] = slang; SERIES['slang'] = 'Slang Card'
import progress as PROG; PROG.install(globals())   # Day 1 vs Day 30 (progress.py, docs/specs/voice-diary-video.md): T['progress'] + planner + gates


def words(s): return re.findall(r"[A-Za-z0-9'’-]+", s)


def make(row):
    t = row['template']; who = row['teacher']
    assert who in REG['people'], ('teacher not in web/teach/characters.json', who)
    sp = T[t](row['in'])
    if 'teacher' in sp:   # react: the series' own teacher (Ama = female voice, Carlos = male voice) + a pose from that teacher's registry clips
        assert sp.pop('teacher') == who and sp['pose']['clip'] in REG['people'][who]['clips'], ('react: series teacher / pose mismatch', who, sp['pose'])
    ep = dict(id=row['id'], template=t, series=SERIES[t], part=row.get('part', 1), theme=row['theme'], teacher=who,
              voice=REG['people'][who]['voice']['video'], speed=row.get('speed', SLANG_SPEED if t == 'slang' else 0.8), area=sp['cta']['area'], **sp)
    # self-checks (the CI gates re-check on the real audio): hook <= 6 words, one point, 55-95 words, est. <= 150 wpm
    n = sum(len(words(l['text'])) for l in ep['lines']); est = n / (2.55 * ep['speed']) + sum(l['pause'] for l in ep['lines'])
    hk = ep['lines'][0]['text']
    assert len(words(hk)) <= 7, ('hook too long', hk)
    lo, hi = SLANG_WORDS if t == 'slang' else (30, 70)   # slang reels are 7-12 s (owner 22/11); every other template 18-28 s
    assert lo <= n <= hi, ('word count', n)
    assert 60 * n / est <= 150, ('pace', 60 * n / est)
    if row.get('lang'): ep['lang'] = row['lang']   # L1 clip: routed only to pages whose cfg.lang == lang (functions/api/_distribution.js blockOf)
    ep['est'] = dict(words=n, seconds=round(est, 1), wpm=round(60 * n / est))
    if t == 'slang': assert SLANG_SECS[0] <= est <= SLANG_SECS[1], ('slang clip length', round(est, 1), SLANG_SECS)
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
AUTO_T = dict(usuk='ama', verbs='carlos', stress='carlos', guess='carlos', review='carlos', mistake='ama', phrasal='ama')   # one teacher per series (the pilot's)
AREA = dict(usuk='dictionary', verbs='verbs', stress='pronunciation', guess='dictionary', review='vocab-review', mistake='grammar-check', phrasal='phrases')
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
    elif t == 'roots':   # Word Roots: root + words in the root bank, every word a real row of the audited bank (IPA + definition + example), segmentation consistent
        R = roots_bank()['roots'].get(p['root']); ok = {x['w']: x for x in (R or {}).get('words', [])}
        if not R: bad.append('root not in roots.json')
        for w in p['words']:
            if w not in ok: bad.append(f'{w} not a word of the root'); continue
            b = W.get(w) or {}
            if not (b.get('ipa') and b.get('def') and b.get('ex')): bad.append(f'{w} not in the audited bank')
            try: seg_parts(ok[w]['seg'], R)
            except AssertionError: bad.append(f'{w} segmentation')
    elif t == 'rule':   # Spell->Sound: every lesson word is a live bank word whose US IPA proves the rule (rules.py), one silent letter per lesson, nothing family-unsafe
        import rules as RU
        R = rules_bank().get(p['rule'])
        if not R: bad.append('rule not in rules.json')
        for w in p['words']:
            b = W.get(w) or {}
            if not (b.get('ipa') and b.get('def')): bad.append(f'{w} not in the audited bank')
            elif R and RU.check(R, w, b['ipa']) is None: bad.append(f"{w}: the IPA {b['ipa']} does not show the rule")
            if w in TOPIC_SKIP: bad.append(f'{w} not family-safe')
    elif t == 'band':   # Band 5->7->9: the topic is in bands.json, bands 5 / 7 / 9 in order, every upgrade mark inside its sentence, every reason known, three different sentences
        B = bands_bank(); T_ = next((x for x in B['topics'] if x['id'] == p['topic']), None)
        if not T_: bad.append('topic not in bands.json')
        else:
            st = T_['steps']
            if [x['band'] for x in st] != [5, 7, 9] or len({x['text'] for x in st}) != 3: bad.append('bands 5 / 7 / 9 must be three different sentences')
            for x in st[1:]:
                if x.get('mark', '\0') not in x['text']: bad.append(f"band {x['band']}: the mark is not in the sentence")
                if x.get('why') not in B['reasons']: bad.append(f"band {x['band']}: unknown reason")
            if not all(len(x['text'].split()) <= 14 for x in st): bad.append('a sentence is longer than 14 words')
    elif t == 'progress': bad += PROG.FN['data_gate'](row)   # Day 1 vs Day 30: the written sample in progress.json (marks inside the sentence, scores, lengths)
    elif t == 'slang':   # Slang Card: the row froze the bank card it was planned with; the live bank (slang.json, slang.mjs gates) must still say the same
        it = slang_src()[0].get(p['key'].lower())
        if not it: bad.append('slang key gone from slang.json')
        elif slang_facts(it, row.get('lang')) != row.get('facts'): bad.append('slang card or its page-language texts changed (re-plan + review)')
    elif t in ('mistake', 'phrasal'):   # hand-written rows (hand.json): the gold-bank row is the audited fact
        g = GOLD.get(p['gold']) or {}
        if not g: bad.append('gold row gone')
        else:
            if p['wrong_say'] != g.get('wrong') or p['right_say'] != g.get('right'): bad.append('gold wrong/right changed')
            if p['strike'] not in g['wrong']: bad.append('strike not in the wrong sentence')
            if p['answer_say'] != hand_answer(g): bad.append('quiz answer changed')
    else:
        w = p['word']
        for f in ('ipa', 'ex'): eq(w, f, p[f])
        eq(w, 'def', p.get('bank_def', p['def']))
        if 'bank_def' in p and gloss(p['bank_def']) != p['def']: bad.append('gloss != first clause of the bank definition')
        if t == 'guess':
            it = img_items().get(p['img']) or {}
            if p['img'] != f'{w}#n' or (W.get(w) or {}).get('key') != p['img'] or not it.get('ph') or it.get('rejected'): bad.append('picture is not this word sense')
    return bad


def p_letter(row):   # the silent letter(s) the hook names, from the lesson's first word (the data gate has proven it against the IPA)
    import rules as RU
    w = row['in']['words'][0]; sp = RU.check(rules_bank()[row['in']['rule']], w, bank(w)[0]); return w[sp[0]:sp[1]].upper()


def hook_gate(row, ep):   # the on-screen hook is a true claim about these facts (and short)
    t, p = row['template'], row['in']; hk = ep['hook']['text']
    ok = len(words(hk)) <= 6 and len(words(ep['lines'][0]['text'])) <= 7
    if t == 'verbs': ok = ok and hk == f"{p['base']} · {p['P']} · {p['PP']}"
    if t == 'stress': ok = ok and p['a']['stress'] != p['b']['stress']
    if t == 'band': ok = ok and hk == 'Band five to nine'
    if t == 'progress': ok = ok and hk == PROG.HOOK
    if t == 'rule': ok = ok and hk == f"The {' '.join(p_letter(row))} is silent"
    if t == 'usuk': ok = ok and p['us'] != p['uk'] and p['ipa_us'] != p['ipa_uk']
    if t == 'slang': ok = ok and hk == slang_src()[0][p['key'].lower()]['hook'] and hk[-1:] in '?!'   # a situation question/shout from the reviewed card, never a definition
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


HAND_F = f'{ROOT}/content/video/teach2d/hand.json'
HAND_REVIEWER = 'gen.py --hand gates v1 (data == gold bank row · level <= B1 NGSL · hook <= 6 words, true for the facts · no duplicate gold row / approved sample / L1 error) + independent review by a fresh Opus reviewer 15/11/2026, score >= 90 per row (hand.json)'


def hand_answer(g):   # the spoken quiz answer: right option + the stem filled in ("Discuss! We need to discuss the budget.")
    q = g['quiz']; opt = q['options'][q['answer']]
    if '___' not in q['q'] or opt.startswith('('): return None
    return f"{opt[0].upper()}{opt[1:]}! {q['q'].replace('___', opt)}"


def hand_hook_text(s):
    m = re.fullmatch(r"(Stop saying|Don't say|Say) (.+?)!", s)
    return f'{m[1]} “{m[2]}”' if m else s.rstrip('!')


def hand_rows():   # hand.json -> auto.json-shaped rows (same shape as the pilots, facts frozen), mistake / phrasal alternating
    H = json.load(open(HAND_F)); out = {t: [] for t in ('mistake', 'phrasal')}
    for t in out:
        for h in H[t]:
            g = GOLD[h['gold']]; ans = hand_answer(g)
            i = dict(gold=g['id'], hook_say=h['hook_say'], hook_text=hand_hook_text(h['hook_say']), wrong_say=g['wrong'], right_say=g['right'], strike=h['strike'], answer_say=ans)
            if t == 'phrasal': i.update(pv=h['pv'], mean_say=h['mean_say'], mean_card=h['mean_card'])
            sp = ' '.join([g['wrong'], g['right'], h['strike'], h.get('pv', '')])
            out[t].append(dict(id=f"t2a_{t}_{g['id'][3:]}", template=t, teacher=AUTO_T[t], theme='dusk', area=AREA[t], point=g['pid'], hash=chash(t, g['id']),
                               heads=[g['id']], taught=re.findall(r"[A-Za-z']+", sp), **{'in': i}))
    return [r for pair in zip(out['mistake'], out['phrasal']) for r in pair] + out['mistake'][len(out['phrasal']):] + out['phrasal'][len(out['mistake']):]


def plan_hand():
    F = facts(); A = load_auto(); R = json.load(open(REV_F)); rows = A['rows']; why = {}
    used_h = {r['hash'] for r in rows} | {chash(r['template'], pilot_point(r)) for r in PIL['pilots']}
    used_g = {r['in'].get('gold') for r in rows} | {g for r in PIL['pilots'] for g in ([r['in'].get('gold')] if not isinstance(r['in'].get('gold'), list) else r['in']['gold'])}
    appr = {x['id'].split('_', 1)[1] for x in json.load(open(f'{ROOT}/content/video/cine/news/approved.json'))['approved'] if re.fullmatch(r'(sts|sod)_[0-9a-f]{8}', x['id'])}   # approved sample = already an episode of that gold row
    l1w = ' | '.join(r['in']['wrong'].lower() for r in l1_rows())
    cand = [r for r in hand_rows() if r['id'] not in {x['id'] for x in rows}]; ok = []
    def skip(k, r): why.setdefault(k, []).append(r['id'])
    for r in cand:
        g = r['in']['gold']
        if not r['in']['answer_say']: skip('no-spoken-answer', r); continue
        if g in used_g or r['hash'] in used_h or g[3:] in appr: skip('dup', r); continue
        if r['in']['strike'].lower() in l1w: skip('l1-dup', r); continue
        b = data_gate(r, F)
        if b: skip('data:' + b[0], r); continue
        try: ep = make(r)
        except AssertionError as e: skip('shape:' + str(e.args[0][0]), r); continue
        if not hook_gate(r, ep): skip('hook', r); continue
        if not 18 <= short_secs(ep) <= 28: skip('duration', r); continue
        ok.append([r, ep, taught_re(r['taught']).sub(' ', ' '.join(l['text'] for l in ep['lines']))])
    for x, un in zip(ok, unknown([x[2] for x in ok])): x[2] = [u for u in un if u.lower() not in FRAME and not lvl_ok(u, F)]
    new = []
    for r, ep, un in ok:
        if un: skip('level:' + ','.join(un), r); continue
        rows.append(r); new.append(r)
        R['verdicts'][r['id']] = dict(template=r['template'], hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=HAND_REVIEWER, machine=True,
                                      gates=dict(data=True, level=True, hook=True, dup=True), hash=r['hash'], script={l['id']: l['text'] for l in ep['lines']})
    json.dump(A, open(AUTO_F, 'w'), indent=1, ensure_ascii=False); open(AUTO_F, 'a').write('\n')
    json.dump(R, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n')
    print(f"hand: +{len(new)} rows (mistake {sum(r['template'] == 'mistake' for r in new)}, phrasal {sum(r['template'] == 'phrasal' for r in new)}), total {len(rows)}")
    for k, v in why.items(): print(f'  skipped {k}: {v}')


def roots_groups(R):   # a root's words -> lessons of 3 (2 when 1 is left over); the order of the bank is kept (best-known first)
    ws = [x['w'] for x in R['words']]; n = len(ws); sizes = [3] * (n // 3) + ([n % 3] if n % 3 else [])
    if sizes and sizes[-1] == 1: sizes = sizes[:-2] + [2, 2] if len(sizes) > 1 else [1]
    out, i = [], 0
    for z in sizes: out.append(ws[i:i + z]); i += z
    return [g for g in out if len(g) >= 2]




RULE_REVIEWER = 'gen.py --rule-eps gates v1 (words in rules-words.json · every word live in the audited bank with a US IPA that PROVES the rule (rules.py) · family-safe · level <= B1 NGSL except the taught words · hook true · no duplicate lesson)'


def rule_lessons(R, words):   # a rule's mined words (best first, family-unsafe dropped) -> lessons of 3 (2 when 1 is left over)
    ws = [w for w in words if w not in TOPIC_SKIP]; n = len(ws); sizes = [3] * (n // 3) + ([n % 3] if n % 3 else [])
    if sizes and sizes[-1] == 1: sizes = sizes[:-2] + [2, 2] if len(sizes) > 1 else [1]
    out, i = [], 0
    for z in sizes: out.append(ws[i:i + z]); i += z
    return [g for g in out if len(g) >= 2]


ROOTS_REVIEWER = 'gen.py --roots gates v1 (roots.json words == audited word bank (IPA / definition / example) · root part == a variant of the root · level <= B1 NGSL except the taught words · hook true · no duplicate lesson) + etymology checked against Etymonline / Wiktionary when the bank was written'


def plan_roots():
    F = facts(); A = load_auto(); R_ = json.load(open(REV_F)); rows = A['rows']; why = {}; B = roots_bank(); have = {r['id'] for r in rows}; used_h = {r['hash'] for r in rows}
    def skip(k, r): why.setdefault(k, []).append(r)
    cand = []
    for ri, R in enumerate(B['roots'].values()):
        for gi, ws in enumerate(roots_groups(R)): cand.append((gi, ri, R, ws))
    cand.sort(key=lambda x: (x[0], x[1]))   # first lessons of every root first (variety), then the second lessons ...
    ok = []
    for k, (gi, ri, R, ws) in enumerate(cand):
        rid = f"t2a_roots_{R['id']}_{gi + 1}"
        if rid in have: continue
        row = dict(id=rid, template='roots', teacher='ama' if len(ok) % 2 == 0 else 'carlos', theme='dusk', area='dictionary', point=f"{R['id']}:{'/'.join(ws)}",
                   hash=chash('roots', f"{R['id']}:{'/'.join(ws)}"), heads=[f"root:{R['id']}:{w}" for w in ws], taught=ws + [R['root'].lower(), R['lang'].lower()], **{'in': dict(root=R['id'], words=ws)})
        if row['hash'] in used_h: skip('dup', rid); continue
        if data_gate(row, F): skip('data:' + ','.join(data_gate(row, F)), rid); continue
        ep = None
        opts = [(ws, 0), (ws[:2], 0), (ws, 1), (ws[:2], 1)] + ([(ws[1:], 1), (ws[::2], 1)] if len(ws) == 3 else [])   # all words, else 2, else the tight read (first sense spoken, no 'Did you know?', shorter quiz pause), else another pair - a lesson is never dropped
        for wz, tg in opts:
            row['in'] = dict(root=R['id'], words=wz, **({'tight': 1} if tg else {}))
            try: ep = make(row)
            except AssertionError as e: skip('shape:' + str(e.args[0][0]), rid); ep = None; break
            if 18 <= short_secs(ep) + ROOTS_BIAS <= ROOTS_MAX: break
            ep = None
        if not ep: skip('duration', rid); continue
        row['heads'] = [f"root:{R['id']}:{w}" for w in row['in']['words']]; row['taught'] = row['in']['words'] + [R['root'].lower(), R['lang'].lower()]
        row['point'] = f"{R['id']}:{'/'.join(row['in']['words'])}"; row['hash'] = chash('roots', row['point'])
        if not hook_gate(row, ep): skip('hook', rid); continue
        ok.append([row, ep, taught_re(row['taught']).sub(' ', ' '.join(l['text'] for l in ep['lines']))])
    for x, un in zip(ok, unknown([x[2] for x in ok])): x[2] = [u for u in un if u.lower() not in FRAME | {'plus', 'latin', 'greek'} and not lvl_ok(u, F)]
    new = []
    for row, ep, un in ok:
        if un: skip('level:' + ','.join(un), row['id']); continue
        rows.append(row); new.append(row)
        R_['verdicts'][row['id']] = dict(template='roots', hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=ROOTS_REVIEWER, machine=True,
                                         gates=dict(data=True, level=True, hook=True, dup=True), hash=row['hash'], script={l['id']: l['text'] for l in ep['lines']})
    json.dump(A, open(AUTO_F, 'w'), indent=1, ensure_ascii=False); open(AUTO_F, 'a').write('\n')
    json.dump(R_, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n')
    print(f"roots: +{len(new)} rows, total {len(rows)}")
    for k, v in why.items(): print(f'  skipped {k}: {len(v)} {v[:4]}')


RULE_BIAS, RULE_MAX = 0.9, 27.0
STOCK_MIN = 7 * 15   # kho tối thiểu = 7 ngày x 15 kênh x 1 video/ngày (owner 16/11); gen.py --todo --count cảnh báo khi thấp hơn   # real short length = short_secs + ~0.9 s (kn 25.81 / mb 25.92 / wr 25.66 s vs 24.9 predicted); QC ceiling 28 s keeps 1 s of room


def rule_secs(ep): return short_secs(ep) + RULE_BIAS


def plan_rules(n):   # first lessons of every rule first (variety), then the second lessons ... ; n = how many new rows
    import rules as RU
    F = facts(); A = load_auto(); R_ = json.load(open(REV_F)); rows = A['rows']; why = {}; have = {r['id'] for r in rows}; used_h = {r['hash'] for r in rows}
    mined = json.load(open(RU.OUT_F))['rules']; cand = []
    for ri, m in enumerate(mined):
        for gi, ws in enumerate(rule_lessons(rules_bank()[m['id']], [x['word'] for x in m['words']])): cand.append((gi, ri, m['id'], ws))
    cand.sort(key=lambda x: (x[0], x[1])); ok = []
    def skip(k, r): why.setdefault(k, []).append(r)
    q = 0
    while q < len(cand):
        gi, ri, rid_, ws = cand[q]; q += 1
        if len(ok) >= n: break
        rid = f"t2a_rule_{re.sub('[^a-z0-9]', '', rid_)}_{gi + 1}"
        if rid in have: continue
        row = dict(id=rid, template='rule', teacher='ama' if (len(rows) + len(ok)) % 2 == 0 else 'carlos', theme='dusk', area='pronunciation', point=f"{rid_}:{'/'.join(ws)}",
                   hash=chash('rule', f"{rid_}:{'/'.join(ws)}"), heads=[f'rule:{rid_}:{w}' for w in ws], taught=ws + [rid_.split('-')[-1], 'gh'], **{'in': dict(rule=rid_, words=ws)})
        if row['hash'] in used_h: skip('dup', rid); continue
        if data_gate(row, F): skip('data:' + ','.join(data_gate(row, F)), rid); continue
        ep = None
        for z, tg in dict.fromkeys([(len(ws), 0), (2, 0), (len(ws), 1), (2, 1), (1, 1)]):   # 3 words, else 2, else tighter pauses, else a single word; fit = CALIBRATED length <= RULE_MAX (real renders ran +0.9 s over short_secs, bank 19/11)
            if z > len(ws): continue
            row['in'] = dict(rule=rid_, words=ws[:z], **({'tight': 1} if tg else {}))
            try: ep = make(row)
            except AssertionError as e: skip('shape:' + str(e.args[0]), rid); ep = None; break
            if 18 <= rule_secs(ep) <= RULE_MAX: break
            ep = None
        if not ep:
            skip('duration', rid)
            nxt = next((j for j in range(q, len(cand)) if cand[j][2] == rid_ and cand[j][0] == gi + 1), None)   # a rule whose first lesson is too long (long words) tries its next lesson right away
            if nxt is not None and gi == 0: cand.insert(q, cand.pop(nxt))
            continue
        row['heads'] = [f'rule:{rid_}:{w}' for w in row['in']['words']]; row['taught'] = row['in']['words'] + [rid_.split('-')[-1], 'gh']
        row['point'] = f"{rid_}:{'/'.join(row['in']['words'])}"; row['hash'] = chash('rule', row['point'])
        if not hook_gate(row, ep): skip('hook', rid); continue
        ok.append([row, ep, taught_re(row['taught']).sub(' ', ' '.join(l['text'] for l in ep['lines']))])
    for x, un in zip(ok, unknown([x[2] for x in ok])): x[2] = [u for u in un if u.lower() not in FRAME | {'silent', 'sound'} and not lvl_ok(u, F)]
    new = []
    for row, ep, un in ok:
        if un: skip('level:' + ','.join(un), row['id']); continue
        rows.append(row); new.append(row)
        R_['verdicts'][row['id']] = dict(template='rule', hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=RULE_REVIEWER, machine=True,
                                         gates=dict(data=True, level=True, hook=True, dup=True), hash=row['hash'], script={l['id']: l['text'] for l in ep['lines']})
    json.dump(A, open(AUTO_F, 'w'), indent=1, ensure_ascii=False); open(AUTO_F, 'a').write('\n')
    json.dump(R_, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n')
    print(f"rule: +{len(new)} rows, total {len(rows)}")
    for k, v in why.items(): print(f'  skipped {k}: {len(v)} {v[:4]}')


BAND_BIAS, BAND_MAX = 0.9, 27.0   # same calibration as rule / roots (real shorts ~0.9 s over short_secs; QC ceiling 28 s)
BAND_REVIEWER = 'gen.py --band-eps gates v1 (bands.json sentences == the row · mark inside its sentence · known reason · <= 14 words a sentence · spoken frame level <= B1 NGSL except the taught upgrade words · hook true · no duplicate topic)'
def band_secs(ep): return short_secs(ep) + BAND_BIAS


def band_taught(T_): return [w for x in T_['steps'][1:] for w in re.findall(r"[A-Za-z']+", x['text'])]   # the upgraded sentences are the lesson: their words are exempt from the level gate


def plan_bands(n):   # one episode per bands.json topic, writing and speaking alternating; n = how many new rows
    F = facts(); A = load_auto(); R_ = json.load(open(REV_F)); rows = A['rows']; why = {}; have = {r['id'] for r in rows}; used_h = {r['hash'] for r in rows}; ok = []
    def skip(k, r): why.setdefault(k, []).append(r)
    for T_ in bands_bank()['topics']:
        if len(ok) >= n: break
        rid = f"t2a_band_{re.sub('[^a-z0-9]', '', T_['id'])}_1"
        if rid in have: continue
        row = dict(id=rid, template='band', teacher='ama' if (len(rows) + len(ok)) % 2 == 0 else 'carlos', theme='dusk', area='writing-ielts' if T_['skill'] == 'writing' else 'speaking', point=f"band:{T_['id']}",
                   hash=chash('band', T_['id']), heads=[f"band:{T_['id']}"], taught=band_taught(T_), **{'in': dict(topic=T_['id'])})
        if row['hash'] in used_h: skip('dup', rid); continue
        if data_gate(row, F): skip('data:' + ','.join(data_gate(row, F)), rid); continue
        try: ep = make(row)
        except AssertionError as e: skip('shape:' + str(e.args[0]), rid); continue
        if not 18 <= band_secs(ep) <= BAND_MAX: skip(f'duration {band_secs(ep):.1f}', rid); continue
        if not hook_gate(row, ep): skip('hook', rid); continue
        ok.append([row, ep, taught_re(row['taught']).sub(' ', ' '.join(l['text'] for l in ep['lines']))])
    for x, un in zip(ok, unknown([x[2] for x in ok])): x[2] = [u for u in un if u.lower() not in FRAME | {'band', 'five', 'nine', 'idea'} and not lvl_ok(u, F)]
    new = []
    for row, ep, un in ok:
        if un: skip('level:' + ','.join(un), row['id']); continue
        rows.append(row); new.append(row)
        R_['verdicts'][row['id']] = dict(template='band', hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=BAND_REVIEWER, machine=True,
                                         gates=dict(data=True, level=True, hook=True, dup=True), hash=row['hash'], script={l['id']: l['text'] for l in ep['lines']})
    json.dump(A, open(AUTO_F, 'w'), indent=1, ensure_ascii=False); open(AUTO_F, 'a').write('\n')
    json.dump(R_, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n')
    print(f"band: +{len(new)} rows, total {len(rows)}")
    for k, v in why.items(): print(f'  skipped {k}: {len(v)} {v[:6]}')


SLANG_REVIEWER = 'gen.py slang gates v1 (data == slang.json card · level <= B1 NGSL except the slang + its forms · hook = the card situation <= 6 words · one card = one episode per language · 7-12 s) + slang.mjs bank gates (ad-safety, IPA, lengths)'


def slang_facts(it, lang=None): return dict({k: it[k] for k in ('key', 'ipa', 'mean', 'def', 'hook', 'example', 'quiz', 'misuse', 'expr', 'reg', 'region')}, **({'l1': slang_l1_src(it, lang)} if lang else {}))


def plan_slang(n, keys=None):   # one episode per slang card (English channels; L1 variants follow the same rows), themes interleaved so no two neighbours share a theme
    F = facts(); A = load_auto(); R_ = json.load(open(REV_F)); rows = A['rows']; why = {}; have = {r['id'] for r in rows}; used_h = {r['hash'] for r in rows}; ok = []
    def skip(k, r): why.setdefault(k, []).append(r)
    by = {}
    for it in json.load(open(SLANG_F))['items']: by.setdefault(it['theme'], []).append(it)
    order = [x for grp in __import__('itertools').zip_longest(*by.values()) for x in grp if x]   # round-robin over themes
    if keys: K_ = [k.lower() for k in keys]; order = sorted([x for x in order if x['key'].lower() in K_], key=lambda x: K_.index(x['key'].lower()))   # --keys: hand-picked pilots first
    k0 = sum(1 for r in rows if r['template'] == 'slang')
    for it in order:
        if len(ok) >= n: break
        rid = 't2s_' + re.sub('[^a-z0-9]', '', it['key'].lower())[:24]
        if rid in have: continue
        row = dict(id=rid, template='slang', teacher='ama' if (k0 + len(ok)) % 2 == 0 else 'carlos', theme='dusk', part=k0 + len(ok) + 1, area='phrases', point=f"slang:{it['key'].lower()}",
                   hash=chash('slang', it['key']), heads=[f"slang:{it['key'].lower()}"], taught=[it['key']] + (it.get('forms') or []), facts=slang_facts(it), **{'in': dict(key=it['key'])})
        if row['hash'] in used_h: skip('dup', rid); continue
        if data_gate(row, F): skip('data:' + ','.join(data_gate(row, F)), rid); continue
        try: ep = make(row)
        except AssertionError as e: skip('shape:' + str(e.args[0]), rid); continue
        if not hook_gate(row, ep): skip('hook', rid); continue
        spoken = ' '.join(l['text'] for l in ep['lines'] if l['id'] in ('m', 'e'))   # the meaning + example must be learner English (the hook is the card's own situation line)
        ok.append([row, ep, taught_re(row['taught']).sub(' ', spoken)])
    for x, un in zip(ok, unknown([x[2] for x in ok])): x[2] = [u for u in un if u.lower() not in FRAME and not lvl_ok(u, F)]
    new = []
    for row, ep, un in ok:
        if len(un) > 1: skip('level:' + ','.join(un), row['id']); continue   # one B2 word may stay (real slang talk); two or more -> the card is rewritten first
        rows.append(row); new.append(row)
        R_['verdicts'][row['id']] = dict(template='slang', hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=SLANG_REVIEWER, machine=True,
                                         gates=dict(data=True, level=True, hook=True, dup=True), hash=row['hash'], script={l['id']: l['text'] for l in ep['lines']})
    json.dump(A, open(AUTO_F, 'w'), indent=1, ensure_ascii=False); open(AUTO_F, 'a').write('\n')
    json.dump(R_, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n')
    print(f"slang: +{len(new)} rows, total {sum(1 for r in rows if r['template'] == 'slang')}")
    for k, v in why.items(): print(f'  skipped {k}: {len(v)} {v[:6]}')


def plan_slang_l1(n):   # L1 pages: the first n slang episodes of the batch (auto.json order) per page language, when the meaning + hook + example exist in that language
    A = load_auto(); R_ = json.load(open(REV_F)); rows = A['rows']; have = {r['id'] for r in rows}; used_h = {r['hash'] for r in rows}; B = slang_src()[0]; why = {}; new = []
    EN = [r for r in rows if r['template'] == 'slang' and not r.get('lang')]
    for lang in SL_LANGS:
        k_ = 0
        for r in EN:
            if k_ >= n: break
            it = B.get(r['in']['key'].lower())
            if not it: continue
            rid = f"t2s_{lang}_{r['id'][4:]}"[:40]
            if rid in have: k_ += 1; continue
            if not slang_l1_src(it, lang): why.setdefault(f'{lang}:texts-missing', []).append(it['key']); continue
            row = dict(id=rid, template='slang', lang=lang, teacher=r['teacher'], theme='dusk', part=r.get('part', 1), area='phrases', point=f"slang:{lang}:{it['key'].lower()}",
                       hash=chash('slang', f"{lang}:{it['key']}"), heads=[f"slang:{lang}:{it['key'].lower()}"], taught=r['taught'], facts=slang_facts(it, lang), **{'in': dict(key=it['key'], lang=lang)})
            if row['hash'] in used_h or data_gate(row): why.setdefault('dup-or-data', []).append(rid); continue
            try: ep = make(row)
            except AssertionError as e: why.setdefault('shape:' + str(e.args[0]), []).append(rid); continue
            if not hook_gate(row, ep): why.setdefault('hook', []).append(rid); continue
            rows.append(row); new.append(row); k_ += 1
            R_['verdicts'][rid] = dict(template='slang', hook=ep['hook']['text'], hook_true=True, script_reviewed=True, reviewer=SLANG_REVIEWER + ' · L1: page-language texts = 2-judge translations (say-native translate.mjs) + hand frames (slang-l1-frames.json), native-qa.mjs',
                                        machine=True, gates=dict(data=True, level=True, hook=True, dup=True), hash=row['hash'], script={l['id']: l['text'] for l in ep['lines']})
    json.dump(A, open(AUTO_F, 'w'), indent=1, ensure_ascii=False); open(AUTO_F, 'a').write('\n')
    json.dump(R_, open(REV_F, 'w'), indent=1, ensure_ascii=False); open(REV_F, 'a').write('\n')
    cnt = {L: sum(1 for x in new if x['lang'] == L) for L in SL_LANGS}
    print(f'slang L1: +{len(new)} rows {cnt}')
    for k, v in why.items(): print(f'  skipped {k}: {len(v)} {v[:5]}')


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


GRADE_F = f'{ROOT}/content/video/teach2d/l1-grade.json'   # independent-grader verdict per L1 row: {id: score >= 90}


def l1_graded(i, G):   # an L1 row is rendered only when an independent grader gave it >= 90 (coordinator 16/11): unscored or <90 rows never become a video
    g = G.get(i); return isinstance(g, (int, float)) and g >= 90


def todo():
    ok, stale = verify(); B = (json.load(open(BANK_F)) if os.path.exists(BANK_F) else {}).get('eps', {})
    for i, b in stale: print(f'::warning::stale (fact changed, not rendered): {i}: {b}', file=sys.stderr)
    G = json.load(open(GRADE_F)).get('grades', {}) if os.path.exists(GRADE_F) else {}; L1 = {r['id'] for r in load_l1()}
    for i in sorted(L1 & set(ok)):
        if not l1_graded(i, G): print(f'::warning::L1 row without grader score >= 90 (not rendered): {i}', file=sys.stderr)
    ok = [i for i in ok if i not in L1 or l1_graded(i, G)]
    return [i for i in ok if not (B.get(i, {}).get('state') == 'banked' or B.get(i, {}).get('tries', 0) >= 2)]   # 2 red renders -> left for a person (sheet lists it)


if __name__ == '__main__':
    A_ = sys.argv
    if '--plan' in A_: plan(int(A_[A_.index('--plan') + 1])); sys.exit(0)
    if '--hand' in A_: plan_hand(); sys.exit(0)
    if '--roots' in A_: plan_roots(); sys.exit(0)
    if '--slang-l1' in A_: plan_slang_l1(int(A_[A_.index('--slang-l1') + 1])); sys.exit(0)
    if '--slang-eps' in A_: plan_slang(int(A_[A_.index('--slang-eps') + 1]), A_[A_.index('--keys') + 1].split('|') if '--keys' in A_ else None); sys.exit(0)
    if '--progress-eps' in A_: PROG.FN['plan'](int(A_[A_.index('--progress-eps') + 1])); sys.exit(0)
    if '--band-eps' in A_: plan_bands(int(A_[A_.index('--band-eps') + 1])); sys.exit(0)
    if '--rule-eps' in A_: plan_rules(int(A_[A_.index('--rule-eps') + 1])); sys.exit(0)
    if '--rules' in A_:   # Spell->Sound word mining (rules.py): rules-words.json regenerates identically (--check) or is rewritten
        import rules as RU; F_ = facts(); W_ = sorted(F_['words']); U_ = set(W_) - {w for w, u in zip(W_, unknown(W_)) if u}
        txt = RU.dump(RU.build(F_['words'], U_))
        if '--check' in A_: sys.exit(0 if open(RU.OUT_F).read() == txt else 'rules-words.json differs from gen.py --rules - regenerate and review')
        open(RU.OUT_F, 'w').write(txt); print('rules-words', sum(len(r['words']) for r in json.loads(txt)['rules']), 'words'); sys.exit(0)
    if '--todo' in A_:
        T_ = todo()
        if '--count' in A_:
            print(f'cần render {len(T_)}')
            if len(T_) < STOCK_MIN: print(f'::warning::Teach2D còn {len(T_)} tập chưa render < {STOCK_MIN} (7 ngày x 15 kênh x 1 video/ngày): thêm hàng (gen.py --plan / --rule-eps / --band-eps / --hand) trước khi hết kho', file=sys.stderr)
            sys.exit(0)
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
