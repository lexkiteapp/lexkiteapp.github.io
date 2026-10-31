#!/usr/bin/env python3
"""Teach2D episode generator (docs/VIDEO-TEACH2D.md): data row -> episode spec, deterministic, no AI.
  python3 scripts/video/teach2d/gen.py [--check]        -> content/video/teach2d/eps/<id>.json for every row of content/video/teach2d/pilots.json
Every taught fact comes from our own data: gold script bank (content/video/scripts/bank/g0000.jsonl), the verb engine (web/js/verbs-core.js),
the audited IPA bank (scripts/scriptbank, checked again by qc.py) and the curated US/UK + stress tables in pilots.json.
Each template = ONE point, hook first (<= 6 words, on screen from frame 0), example, 3-second quiz, share line, deep-link CTA.
Lines are short sentences (TTS + captions + whisper clock all come from the same text: voice = subtitle = mouth)."""
import json, os, re, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
REG = json.load(open(f'{ROOT}/web/teach/characters.json'))
PIL = json.load(open(f'{ROOT}/content/video/teach2d/pilots.json'))
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
        L('q', f"Quick quiz! You're in {p['quiz_city']}. What do you look for?", 3.0, quiz=True),
        L('a', f"The {uk}!"),
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
        data=dict(base=base, past=past, pp=pp, over=over, quiz=dict(stem=p['quiz_stem'], options=[past, pp], answer=[past, pp].index(p['quiz_right']))),
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
        cta=cta('pronunciation', f"#/pron/{b['word']}", 'Check word stress'), hook=dict(line='h', text="Where's the stress?"))


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
    w = p['word']; ipa, dfn, ex = bank(w); assert dfn and ipa, ('word not in the audited bank', w)
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
    w = p['word']; ipa, dfn, ex = bank(w); assert dfn and ex, ('word not in the audited bank', w)
    return dict(lines=[
        L('h', 'Remember this word?'),
        L('f', f"Here's your card: {w}."),
        L('q', 'Think! What does it mean?', 3.0, quiz=True),
        L('b', f"It means {dfn}."),
        L('x', ex),
        L('g', 'Got it? Tap Good. Forgot? Tap Again.'),
        L('c', 'Save this. Free on lexkite.com.')],
        data=dict(word=w, ipa=ipa, mean=dfn, ex=ex, grades=['Again', 'Hard', 'Good', 'Easy']),
        cta=cta('review', f'#/review?w={w}', 'Review your words'), hook=dict(line='h', text='Remember this word?'))


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
    ep['est'] = dict(words=n, seconds=round(est, 1), wpm=round(60 * n / est))
    return ep


if __name__ == '__main__':
    out = f'{ROOT}/content/video/teach2d/eps'; os.makedirs(out, exist_ok=True)
    for row in PIL['pilots']:
        ep = make(row); print(f"{ep['id']:28s} {ep['template']:8s} {ep['teacher']:7s} {ep['theme']:5s} {ep['est']}")
        if '--check' not in sys.argv: json.dump(ep, open(f"{out}/{ep['id']}.json", 'w'), indent=1, ensure_ascii=False)
