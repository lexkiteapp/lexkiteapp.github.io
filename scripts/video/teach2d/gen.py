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


def L(i, text, pause=0.55, **kw): return dict(id=i, text=text, pause=pause, **kw)


def cta(area, route, say): return dict(area=area, route=route, link=APP + route, say=say)


def usuk(p):
    us, uk = p['us'], p['uk']
    return dict(lines=[
        L('h', 'U.S. or U.K.?'),
        L('s', p['situation']),
        L('us', f"In America, {p['us_say']}"),
        L('uk', f"In Britain, {p['uk_say']} Same thing!"),
        L('x', p['example']),
        L('q', f"Quick quiz! You're in {p['quiz_city']}. What do you look for?", 3.0, quiz=True),
        L('a', f"The {uk}!"),
        L('sh', p['share']),
        L('c', 'Save this, and look up any word on lexkite.com.')],
        data=dict(us=us, uk=uk, ipa_us=p['ipa_us'], ipa_uk=p['ipa_uk'], same=p['same'], quiz=dict(options=[us, uk], answer=1)),
        cta=cta('dictionary', f'#/dict/{us}', 'Look up any word'), hook=dict(line='h', text='US or UK?'))


def verbforms(p):
    V = verbs(p['base']); f = V['f']; base, past, pp = f['base'], f['P'], f['PP']
    over = next((m['arg'] for m in V['m'] if m['code'] == 'overreg'), None)
    assert f['irregular'] and over, ('verb template needs an irregular verb with an over-regularised mistake', base)
    return dict(lines=[
        L('h', f'Three forms of {base}. Ready?'),
        L('b', f"Base form: {base}. {p['ex_base']}"),
        L('p', f"Past: {past}. {p['ex_past']}"),
        L('pp', f"Past participle: {pp}. {p['ex_pp']}"),
        L('w', f'Not {over}! {base.capitalize()} is irregular.'),
        L('q', f"Quick quiz! {p['quiz_q']}", 3.0, quiz=True),
        L('a', p['quiz_a']),
        L('sh', f'Send this to a friend who says {over}!'),
        L('c', 'Save this, and practice verb forms on lexkite.com.')],
        data=dict(base=base, past=past, pp=pp, over=over, quiz=dict(stem=p['quiz_stem'], options=[past, pp], answer=[past, pp].index(p['quiz_right']))),
        cta=cta('verbs', f'#/verb/{base}', 'Practice verb forms'), hook=dict(line='h', text=f'{base} · {past} · {pp}'))


def stress(p):
    a, b = p['a'], p['b']
    return dict(lines=[
        L('h', f"Where's the stress? {a['word'].capitalize()}!"),
        L('a', f"{a['word'].capitalize()}. The stress is on the {a['say']} part."),
        L('b', f"Now say {b['word']}."),
        L('m', f"The stress moves to the {b['say']} part."),
        L('r', f"Say it with me: {b['word']}.", 1.8, repeat=True),
        L('t', p['tip']),
        L('q', f"Quick quiz! Where's the stress in {b['word']}?", 3.0, quiz=True),
        L('ans', f"The {b['say']} part. {b['word'].capitalize()}."),
        L('sh', p['share']),
        L('c', "Save this, and check any word's stress on lexkite.com.")],
        data=dict(a=a, b=b, quiz=dict(options=[b['syl'][0].upper(), b['syl'][b['stress']].upper()], answer=1)),
        cta=cta('pronunciation', f"#/pron/{b['word']}", 'Check word stress'), hook=dict(line='h', text="Where's the stress?"))


def mistake(p):
    g = GOLD[p['gold']]; q = g['quiz']
    return dict(lines=[
        L('h', p['hook_say']),
        L('w', f"Many learners say: {p['wrong_say']}"),
        L('g', 'What sounds right?', 1.6, guess=True),
        L('r', f"Better: {p['right_say']}"),
        L('y', g['why']),
        L('k', g['aha']),
        L('q', 'Quick quiz! Which one fits?', 3.0, quiz=True),
        L('a', p['answer_say']),
        L('sh', p['share']),
        L('c', 'Save this, and check your grammar on lexkite.com.')],
        data=dict(wrong=p['wrong_say'], right=p['right_say'], strike=p['strike'], why=g['why'], memory=g['memory'], quiz=dict(stem=q['q'], options=q['options'], answer=q['answer'])),
        cta=cta('grammar-check', '#/fix', 'Check your grammar'), hook=dict(line='h', text=p['hook_text']), src=dict(gold=g['id'], pid=g['pid']))


def phrasal(p):
    g = GOLD[p['gold']]; q = g['quiz']
    return dict(lines=[
        L('h', p['hook_say']),
        L('w', f"Don't say: {g['wrong']}"),
        L('r', f"Say: {g['right']}"),
        L('m', p['mean_say']),
        L('k', g['aha']),
        L('x', g['ex'][0]),
        L('q', 'Quick quiz! Which one sounds natural?', 3.0, quiz=True),
        L('a', p['answer_say']),
        L('sh', p['share']),
        L('c', 'Save this, and learn phrasal verbs on lexkite.com.')],
        data=dict(pv=p['pv'], wrong=g['wrong'], right=g['right'], strike=p['strike'], mean=p['mean_card'], aha=g['aha'], ex=g['ex'][0],
                  quiz=dict(stem=q['q'], options=q['options'], answer=q['answer'])),
        cta=cta('phrases', '#/phrases', 'Learn phrasal verbs'), hook=dict(line='h', text=p['hook_text']), src=dict(gold=g['id'], pid=g['pid']))


T = dict(usuk=usuk, verbs=verbforms, stress=stress, mistake=mistake, phrasal=phrasal)
SERIES = dict(usuk='US or UK?', verbs='Verb Forms Challenge', stress="Where's the Stress?", mistake='Stop Saying This', phrasal='Phrasal Verb in 30s')


def words(s): return re.findall(r"[A-Za-z0-9'’-]+", s)


def make(row):
    t = row['template']; who = row['teacher']
    assert who in REG['people'], ('teacher not in web/teach/characters.json', who)
    sp = T[t](row['in'])
    ep = dict(id=row['id'], template=t, series=SERIES[t], part=row.get('part', 1), theme=row['theme'], teacher=who,
              voice=REG['people'][who]['voice']['video'], speed=row.get('speed', 0.8), area=sp['cta']['area'], **sp)
    # self-checks (the CI gates re-check on the real audio): hook <= 6 words, one point, 55-95 words, est. <= 150 wpm
    n = sum(len(words(l['text'])) for l in ep['lines']); est = n / (2.55 * ep['speed']) + sum(l['pause'] for l in ep['lines'])
    hk = ep['lines'][0]['text']
    assert len(words(hk)) <= 7, ('hook too long', hk)
    assert 55 <= n <= 95, ('word count', n)
    assert 60 * n / est <= 150, ('pace', 60 * n / est)
    ep['est'] = dict(words=n, seconds=round(est, 1), wpm=round(60 * n / est))
    return ep


if __name__ == '__main__':
    out = f'{ROOT}/content/video/teach2d/eps'; os.makedirs(out, exist_ok=True)
    for row in PIL['pilots']:
        ep = make(row); print(f"{ep['id']:28s} {ep['template']:8s} {ep['teacher']:7s} {ep['theme']:5s} {ep['est']}")
        if '--check' not in sys.argv: json.dump(ep, open(f"{out}/{ep['id']}.json", 'w'), indent=1, ensure_ascii=False)
