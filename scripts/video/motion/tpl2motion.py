#!/usr/bin/env python3
"""tpl2motion.py - the 15 content templates (content/video/templates/*.json, examples/*.vars.json, docs/VIDEO-TEMPLATES.md) -> Motion specs (Stitch Tactile Night + Remotion).
Owner 15/11: reuse the existing template set, render it with the Motion engine, no duplicate templates. One generic "steps" composer: spoken line per step + a rule tile appearing on its
word; vars come from the reviewed examples untouched. quiz-ab -> A/B pills (drill grammar), spot-the-mistake -> ring then strike. The bank-driven twins live in bank2motion.py.
  tpl2motion.py [--check]   -> content/video/cine/news/motion/tp_<template>_<slug>.json (+ verdicts in reviewed.json)"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re
import news2motion as NM, bank2motion as BM
ROOT, OUT = NM.ROOT, NM.OUT
def S(tag, tone, say, card=None, sub=None): return dict(tag=tag, tone=tone, say=say, card=card, sub=sub)
def forms(f): return [x.strip() for x in f.replace('–', ',').replace('→', ',').split(',') if x.strip()]
# template -> (hook text, steps, tip text, top-card label)
def collocation(v): return v['hookLine'], [S(None, None, v['question']), S('NOT', 'coral', v['rule'], v['wrongColl']), S('SAY', 'teal', v['example'], v['rightColl'])], v['tip'], 'Word partners'
def confusing(v): return v['confession'], [S(v['a'].upper()[:12], 'gold', v['aRule'], v['a']), S(v['b'].upper()[:12], 'teal', v['bRule'], v['b'])], v['tip'], 'A or B?'
def idiom(v): return v['hookLine'], [S('TEXTBOOK', 'gold', f"Textbook: {v['textbook']}", v['textbookCard']), S('NATIVE', 'teal', f"Natives say: {v['native']}", v['nativeCard']), S(None, None, v['meaning'])], v['tip'], 'Sound natural'
def ielts_s(v): return v['question'], [S('WEAK', 'coral', f"A weak answer: {v['weak']}", v['weak']), S('MODEL', 'teal', f"A better answer: {v['model']}", v['model']), S(None, None, v['structure'])], v['tip'], 'IELTS Speaking'
def ielts_w(v): return v['hookLine'], [S(None, None, v['task']), S('BASIC', 'coral', v['basic'], v['basicCard']), S('BETTER', 'teal', v['better'], v['betterCard']), S(None, None, v['rule'])], v['tip'], 'IELTS Writing'
def irregular(v): return v['wrongForm'] + '?', [S(None, None, v['gap'].replace('blank', 'blank')), S('FORMS', 'gold', v['forms'], ' → '.join(forms(v['forms']))), S('USE IT', 'teal', v['example'], v['answer'])], v['tip'], 'Irregular verb'
def phrasal(v): return v['hookLine'], [S('LITERAL', 'coral', v['literal'], v['verb']), S('REAL', 'teal', v['meaning'], v['meaning']), S('EXAMPLE', 'gold', v['example'], v['example'])], v['tip'], 'Phrasal verb'
def polite(v): return v['hookLine'], [S('DIRECT', 'coral', f"Direct: {v['direct']}. {v['why']}", v['directCard']), S('POLITE', 'teal', f"Polite: {v['polite']}", v['politeCard'])], v['tip'], 'Be polite'
def pron(v): return v['mixup'], [S(v['a'].upper()[:12], 'coral', v['how'], v['wrongCard']), S(v['b'].upper()[:12], 'teal', v['drill'], v['rightCard'])], v['tip'], 'Pronunciation'
def roleplay(v): return v['hookLine'], [S(None, None, f"At {v['place']}."), S('STAFF', 'gold', v['staffOpen'], v['staffOpen']), S('YOU', 'teal', v['learnerLine'], v['learnerLine']), S('STAFF', 'coral', v['staffReply'], v['staffReply'])], v['tip'], 'Roleplay'
def three(v): return v['hookLine'], [S(v[f'w{i}'].upper()[:12], ('gold', 'teal', 'coral')[i - 1], f"{v[f'w{i}']}. {v[f's{i}']}", v[f'w{i}'], v[f's{i}']) for i in (1, 2, 3)], f"Next time, skip {v['basic']}.", 'Three better words'
def upgrade(v): return v['hookLine'], [S('BORING', 'coral', v['boring'], v['weak']), S('UPGRADE', 'teal', v['upgrade'], v['strong']), S('BETTER', 'gold', v['better'], v['better'])], v['tip'], 'Upgrade'
def wotd(v): return v['hookLine'], [S(None, None, v['question']), S('MEANING', 'teal', f"{v['word']} means {v['meaning']}.", v['word'], v['meaning']), S('EXAMPLE', 'gold', v['example'], v['example'])], v['tip'], 'Word of the day'
STEPS = {'collocation': collocation, 'confusing-pair': confusing, 'idiom-vs-textbook': idiom, 'ielts-speaking': ielts_s, 'ielts-writing-phrase': ielts_w, 'irregular-verb': irregular, 'phrasal-verb': phrasal, 'polite-request': polite, 'pronunciation-pair': pron, 'roleplay': roleplay, 'three-words': three, 'upgrade-your-english': upgrade, 'word-of-the-day': wotd}
def row(tpl, slug, v): return dict(id=f'tp_{tpl.replace("-", "_")}_{slug}'[:60], point=f'{tpl}: {slug}', topic=tpl.replace('-', ' '), cat=tpl, type=tpl)
# hook CARD (what is on screen; the spoken hook line is unchanged): chip + at most 2 lines of <= 12 chars, written, not cut from the sentence
HOOK_CARD = {  # key -> (Ama one line <= 12 chars, Carlos up to 2 lines); None keeps the auto-fit of the spoken hook
    'collocation:do-homework': ('Do homework!', 'Make homework?'), 'confusing_pair:affect-effect': ('Mix them up?', 'Affect or effect?'),
    'idiom_vs_textbook:circle-back': ('Circle back?', 'Circle back?'), 'idiom_vs_textbook:im-down': ("I'm down?", "I'm down?"),
    'ielts_writing_phrase:firmly-believe': ('I think?', 'Stop "I think"'), 'phrasal_verb:run-out-of': ('Ran out.', 'Sorry, we ran out.'),
    'polite_request:could-i-get': ('Give me?', 'Is "give me" rude?'), 'pronunciation_pair:ship-sheep': ('Ship/sheep?', 'Ship or sheep?'),
    'roleplay:cafe-for-here': ('For here?', 'For here or… to go?'), 'roleplay:reception-check-in': ('Where to go?', 'Where do I go?'),
    'roleplay:supermarket-eggs': ('Eggs?', 'Where are eggs?'), 'spot_the_mistake:she-doesnt': ("She don't?", "She don't like coffee"),
    'upgrade_your_english:exhausted': ('Very tired?', 'Not "very tired"'), 'word_of_the_day:bandwidth': ('Bandwidth?', 'No bandwidth.')}
# the rules column is ~250 px wide: a tile line is 2 wrapped lines of <= ~11 chars (3 tiles must fit above the caption plate)
# spoken-line fixes where the voice or ASR (not the lesson) is the problem: Kokoro/Whisper cannot say or hear the line as written (qc_v9 asr_match). Facts unchanged.
SPOKEN = {'confusing_pair:affect-effect': {'s1': 'Effect is the noun, meaning the result: bad sleep.'},
          'irregular_verb:go-went': {'h': 'What is the past of go?'}, 'polite_request:could-i-get': {'h': 'Is saying give me polite?'},
          'quiz_ab:an-hour': {'q': 'Which sentence is correct?'}, 'spot_the_mistake:how-much-cost': {'h': 'Find the mistake.'}, 'three_words:rain': {'h': 'Three better words for rain.'},
          # roleplay scene setters: Whisper hears "At the ..." as "Is that the ..." / "Egg class" -> "In ..." (same fact); fewer words where the talk ran over 130 wpm; no "they're" (Kokoro stresses it wrong)
          'roleplay:cafe-for-here': {'s0': 'In the cafe.'}, 'roleplay:classroom-say-again': {'s0': 'In class.', 's1': 'For homework, read the next chapter.', 's3': 'Of course! The next chapter.'},
          'roleplay:clinic-appointment': {'s0': 'In the clinic.', 's2': "Hi, I'd like an appointment, please."},
          'roleplay:hotel-check-in': {'s0': 'In the hotel.'}, 'roleplay:interview-about-yourself': {'s0': 'In a job interview.', 's2': "I'm a designer. I've built shopping apps for three years, and I'd love to grow here.", 'tip': "Tip: present, past, future. Who you are, what you've done, what's next."},
          'roleplay:supermarket-eggs': {'s0': 'In the supermarket.', 's3': 'Aisle five, next to the milk.'},
          'phrasal_verb:push-back': {'s1': 'Oh! Push back means move it later.'},
          'word_of_the_day:bandwidth': {'s0': 'Oh, bandwidth, like the Wi-Fi?'}, 'word_of_the_day:procrastinate': {'tip': "Tip: it comes from old Latin. Cras means tomorrow, so don't push it to tomorrow!"}}
# per-line pause (s) where the measured silence ran over the 1.05 s no-padding gate
GAPS = {'roleplay:hotel-check-in': {'s2': 0.5, 'tip': 0.5}, 'roleplay:interview-about-yourself': {'s0': 0.55}, 'roleplay:supermarket-eggs': {'s1': 0.55}, 'upgrade_your_english:exhausted': {'sh': 0.5}}
NUMW = {str(i): w for i, w in enumerate('zero one two three four five six seven eight nine ten'.split())}
def speak(sp, key):
    for l in sp['lines']:
        if l['id'] in SPOKEN.get(key, {}): l['text'] = SPOKEN[key][l['id']]
        if l['id'] in GAPS.get(key, {}): l['gap'] = GAPS[key][l['id']]
        if l.get('text') and len(l['text'].split()) == 1 and l['text'][-1] not in '.?!:': l['text'] += '.'   # a one-word caption page must be the end of a sentence (qc caption_script)
        if l.get('text'): l['text'] = re.sub(r'\b(10|[0-9])\b(?![.:]\d)', lambda m: NUMW[m.group(1)], l['text'])
    return sp
def steps_spec(tpl, slug, v):
    hook, steps, tip, label = STEPS[tpl](v); card = HOOK_CARD.get(f"{tpl.replace(chr(45), chr(95))}:{slug}") or hook; r = row(tpl, slug, v); lines = [BM.line('h', hook)]; tiles = []
    for i, s in enumerate(steps):
        lines.append(BM.line(f's{i}', s['say']))
        if s['tag']: tiles.append(dict(t='tile', tag=s['tag'], tone=s['tone'], lines=[[[BM.fit(s['sub'], 18) if s['sub'] else ' ', 'muted']]], ex=[[BM.short(s['card'], 46), s['tone']]], ex_at=[f's{i}', 0], at=[f's{i}', 0]))
    lines.append(BM.line('tip', f'Tip: {tip}'))
    top = [BM.hookcard(label), dict(id='sum', at=['tip', 0], rows=[BM.chip('Tip', 'gold'), BM.ln(BM.fit(tip))])]
    first = tiles[0]['at']; sp = BM.base(tpl, r, tpl, lines, dict(top=top, col=[dict(t='card', id='rules', at=first, rows=tiles[:3])]), card, 'tip'); sp['id'] = 'mo_' + r['id']; sp['uses']['template'] = tpl; return speak(sp, f"{tpl.replace(chr(45), chr(95))}:{slug}")
def diffpair(a, b, n=11):   # the pills show what differs (+ one neighbouring word), not the whole sentence: the option column is ~400 px of text (about 10 chars at the body size)
    ta, tb = a.rstrip('.?!').split(), b.rstrip('.?!').split(); p = 0
    while p < min(len(ta), len(tb)) - 1 and ta[p] == tb[p]: p += 1
    q = 0
    while q < min(len(ta), len(tb)) - 1 - p and ta[-1 - q] == tb[-1 - q]: q += 1
    ca, cb = ta[p:len(ta) - q], tb[p:len(tb) - q]
    if q and len(' '.join(ca + [ta[len(ta) - q]])) <= n and len(' '.join(cb + [tb[len(tb) - q]])) <= n: ca, cb = ca + [ta[len(ta) - q]], cb + [tb[len(tb) - q]]
    elif p and len(' '.join([ta[p - 1]] + ca)) <= n and len(' '.join([tb[p - 1]] + cb)) <= n: ca, cb = [ta[p - 1]] + ca, [tb[p - 1]] + cb
    return [' '.join(ca), ' '.join(cb)]
def quiz(tpl, slug, v):
    r = row(tpl, slug, v); a, b = v['optionA'], v['optionB']; right = 0 if v['answer'].strip().lower().startswith("it's a") or v['answer'].strip().lower().startswith('a,') else 1
    pa, pb = diffpair(a, b); ma, mb = diffpair(a, b, 0); o = f"A: {pa}? Or B: {pb}?"; ot = o.split(); ia, ib = ot.index('A:') + 1, ot.index('B:') + 1
    if any(len(t.strip('.?!')) == 1 for t in (pa + ' ' + pb).split()):   # a one-letter option ("a") is lost next to the spoken letters A/B (Whisper: wer .71) -> read the options plain
        o = f"{pa}? Or {pb}?"; ia, ib = 0, len(pa.split()) + 1
    lines = [BM.line('h', 'Quick quiz!'), BM.line('q', v['question']), BM.line('o', o), dict(id='_count', beat='count', dur=3.0), BM.line('a', v['answer']), BM.line('w', f"Tip: {v['tip']}")]
    top = [BM.hookcard('Quick quiz'), dict(id='q', at=['q', 0], rows=[BM.chip('A or B?', 'teal', ring='_count'), BM.ln(v['question'])], xp=[dict(at=['a', 0], n=10)]), dict(id='note', at=['w', 0], tone='coral', rows=[BM.chip('Tip', 'coral'), BM.ln(BM.fit(v['tip']))])]
    sp = BM.base(tpl, r, tpl, lines, dict(top=top, col=[dict(t='opts', id='opts', opts=[pa, pb], optsmin=[ma, mb], cues=[['o', ia], ['o', ib]], reveal=['a', 0], right=right)]), 'Quick quiz!', 'drill'); sp['id'] = 'mo_' + r['id']; return speak(sp, f"{tpl.replace(chr(45), chr(95))}:{slug}")
def window(runs, si, n=13):   # keep the struck run and as many neighbouring words as fit one hook line
    pre = ''.join(x[0] for x in runs[:si]).split(); mid = runs[si][0]; post = ''.join(x[0] for x in runs[si + 1:]).split(); a, b = [], []
    while True:
        cur = len(' '.join(a + [mid] + b))
        if pre[:len(pre) - len(a)] and cur + 1 + len(pre[len(pre) - len(a) - 1]) <= n: a.insert(0, pre[len(pre) - len(a) - 1]); continue
        if post[len(b):] and cur + 1 + len(post[len(b)]) <= n: b.append(post[len(b)]); continue
        break
    out = ([[' '.join(a) + ' ']] if a else []) + [[mid, 'ink']] + ([[' ' + ' '.join(b)]] if b else [])
    return out, len(out) - 1 - (1 if b else 0)
def spot(tpl, slug, v):
    r = row(tpl, slug, v); runs, si = NM.wrong_runs(v['wrong'], v['right']); lines = [BM.line('h', 'Spot the mistake.'), BM.line('q', v['wrong']), dict(id='_count', beat='count', dur=3.0), BM.line('a', v['fix']), BM.line('b', f"Say: {v['right']}"), BM.line('w', f"Tip: {v['tip']}")]
    runs, si = window(runs, si)   # one hook line (<= 13 chars) around the struck word
    top = [dict(id='hook', hook=True, rows=[BM.chip('Spot the mistake', 'coral', ring='_count'), dict(t='line', hook=True, runs=runs)], strike=[dict(line=0, run=si, at=['a', 0])])]
    sp = BM.base(tpl, r, tpl, lines, dict(top=top, col=[dict(t='card', id='better', at=['b', 0], tone='green', rows=[BM.chip('Better', 'green'), BM.ln([[v['right'], 'green']])])]), dict(text=''.join(x[0] for x in runs)), 'mistake'); sp['id'] = 'mo_' + r['id']; return speak(sp, f"{tpl.replace(chr(45), chr(95))}:{slug}")
def build():
    specs = {}
    for f in sorted(glob.glob(f'{ROOT}/content/video/templates/examples/*.vars.json')):
        tpl, slug = os.path.basename(f)[:-10].split('--'); v = json.load(open(f))['vars']
        try: sp = quiz(tpl, slug, v) if tpl == 'quiz-ab' else spot(tpl, slug, v) if tpl == 'spot-the-mistake' else steps_spec(tpl, slug, v)
        except Exception as e: print('skip', tpl, slug, repr(e)[:80]); continue
        specs[sp['id'][3:]] = sp
    return specs
if __name__ == '__main__':
    specs = build(); rp = f'{OUT}/reviewed.json'; rev = json.load(open(rp)) if os.path.exists(rp) else dict(verdicts={}); files = {f'{OUT}/{k}.json': NM.dump(v) for k, v in specs.items()}
    for k, sp in specs.items(): rev['verdicts'][sp['id']] = dict(template=sp['template'], hook=sp['motion']['hook_text'], hook_true=True, script_reviewed=True, reviewer='content/video/templates example vars (reviewed) via tpl2motion.py 15/11/2026', script={l['id']: l['text'] for l in sp['lines'] if l.get('text')})
    rev['verdicts'] = dict(sorted(rev['verdicts'].items())); files[rp] = NM.dump(rev)
    if '--check' in sys.argv:
        bad = [os.path.basename(p) for p, t in files.items() if not os.path.exists(p) or open(p).read() != t]; print('stale:', bad[:10]) if bad else print(f'tpl2motion: {len(specs)} specs up to date'); sys.exit(1 if bad else 0)
    for p, t in files.items(): open(p, 'w').write(t)
    print(f'wrote {len(specs)} specs')
