#!/usr/bin/env python3
"""tpl2motion.py - the 15 content templates (content/video/templates/*.json, examples/*.vars.json, docs/VIDEO-TEMPLATES.md) -> Motion specs (Stitch Tactile Night + Remotion).
Owner 15/11: reuse the existing template set, render it with the Motion engine, no duplicate templates. One generic "steps" composer: spoken line per step + a rule tile appearing on its
word; vars come from the reviewed examples untouched. quiz-ab -> A/B pills (drill grammar), spot-the-mistake -> ring then strike. The bank-driven twins live in bank2motion.py.
  tpl2motion.py [--check]   -> content/video/cine/news/motion/tp_<template>_<slug>.json (+ verdicts in reviewed.json)"""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
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
def steps_spec(tpl, slug, v):
    hook, steps, tip, label = STEPS[tpl](v); r = row(tpl, slug, v); lines = [BM.line('h', hook)]; tiles = []
    for i, s in enumerate(steps):
        lines.append(BM.line(f's{i}', s['say']))
        if s['tag']: tiles.append(dict(t='tile', tag=s['tag'], tone=s['tone'], lines=[[[BM.short(s['sub'], 46) if s['sub'] else ' ', 'muted']]], ex=[[BM.short(s['card'], 46), s['tone']]], ex_at=[f's{i}', 0], at=[f's{i}', 0]))
    lines.append(BM.line('t', f'Tip: {tip}'))
    top = [BM.hookcard(label), dict(id='sum', at=['t', 0], rows=[BM.chip('Tip', 'gold'), BM.ln(BM.short(tip, 52))])]
    first = tiles[0]['at']; sp = BM.base(tpl, r, tpl, lines, dict(top=top, col=[dict(t='card', id='rules', at=first, rows=tiles[:3])]), hook, 'tip'); sp['id'] = 'mo_' + r['id']; sp['uses']['template'] = tpl; return sp
def quiz(tpl, slug, v):
    r = row(tpl, slug, v); a, b = v['optionA'], v['optionB']; right = 0 if v['answer'].strip().lower().startswith("it's a") or v['answer'].strip().lower().startswith('a,') else 1
    o = f"A: {a.rstrip('.')}? Or B: {b.rstrip('.')}?"; ot = o.split(); ia, ib = ot.index('A:') + 1, ot.index('B:') + 1
    lines = [BM.line('h', 'Quick quiz!'), BM.line('q', v['question']), BM.line('o', o), dict(id='_count', beat='count', dur=3.0), BM.line('a', v['answer']), BM.line('w', f"Tip: {v['tip']}")]
    top = [BM.hookcard('Quick quiz'), dict(id='q', at=['q', 0], rows=[BM.chip('A or B?', 'teal', ring='_count'), BM.ln(v['question'])], xp=[dict(at=['a', 0], n=10)]), dict(id='note', at=['w', 0], tone='coral', rows=[BM.chip('Tip', 'coral'), BM.ln(BM.short(v['tip'], 52))])]
    sp = BM.base(tpl, r, tpl, lines, dict(top=top, col=[dict(t='opts', id='opts', opts=[BM.short(a, 30), BM.short(b, 30)], cues=[['o', ia], ['o', ib]], reveal=['a', 0], right=right)]), 'Quick quiz!', 'drill'); sp['id'] = 'mo_' + r['id']; return sp
def spot(tpl, slug, v):
    r = row(tpl, slug, v); runs, si = NM.wrong_runs(v['wrong'], v['right']); lines = [BM.line('h', 'Spot the mistake.'), BM.line('q', v['wrong']), dict(id='_count', beat='count', dur=3.0), BM.line('a', v['fix']), BM.line('b', f"Say: {v['right']}"), BM.line('w', f"Tip: {v['tip']}")]
    top = [dict(id='hook', hook=True, rows=[BM.chip('Spot the mistake', 'coral', ring='_count'), dict(t='line', hook=True, runs=runs)], strike=[dict(line=0, run=si, at=['a', 0])])]
    sp = BM.base(tpl, r, tpl, lines, dict(top=top, col=[dict(t='card', id='better', at=['b', 0], tone='green', rows=[BM.chip('Better', 'green'), BM.ln([[v['right'], 'green']])])]), v['wrong'], 'mistake'); sp['id'] = 'mo_' + r['id']; return sp
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
