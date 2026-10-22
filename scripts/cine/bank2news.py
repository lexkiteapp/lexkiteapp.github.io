#!/usr/bin/env python3
"""bank2news.py <script-id> <bg> [--style json] - gold script bank item (content/video/scripts/bank/*.jsonl) -> v7 news lesson
(content/video/cine/news/news_<bg>_<type>_<id6>.json) + its TTS lines in content/video/cine/news/lines.json. 0 credits.
Keeps the bank's teaching content (hook, wrong, right, why, memory formula, examples, quiz, save line); adds the teacher-persona beats the news
template needs (Many learners say -> Pause and guess (pause) -> Say -> why -> concept check -> Repeat after me (slow, pause) -> normal speed),
Teacher's tip = right + 2 examples, end = the bank quiz as an open question, share = who says the wrong line."""
import json, os, re, sys, glob, argparse
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))); D = f'{ROOT}/content/video/cine/news'
HOOK = {'stop': 'mistake_callout', 'which': 'quiz', '90': 'challenge', 'guess': 'fill_gap', 'natives': 'native_says', 'instead': 'secret_tip', 'embarrass': 'surprise', 'rude': 'myth'}
CARDHOOK = {'stop': 'STOP SAYING THIS', 'which': 'WHICH IS CORRECT?', '90': '90% GET THIS WRONG', 'guess': 'GUESS FIRST', 'natives': 'NATIVES NEVER SAY', 'instead': 'SAY THIS INSTEAD', 'embarrass': "DON'T SAY THIS", 'rude': 'IS THIS RUDE?'}
ICON = {'health': 'doctor', 'food': 'food', 'shopping': 'bulb', 'work': 'bulb', 'exam': 'book', 'study': 'book', 'travel': 'bulb', 'tech': 'bulb'}
ap = argparse.ArgumentParser(); ap.add_argument('sid'); ap.add_argument('bg'); ap.add_argument('--style', default=''); o = ap.parse_args()
B = {}
for f in glob.glob(f'{ROOT}/content/video/scripts/bank/*.jsonl'):
    for l in open(f):
        if l.strip(): x = json.loads(l); B[x['id']] = x
b = B[o.sid]; h6 = b['id'][-6:]; lid = f"news_{o.bg}_{b['hook_type'].replace('90', 'ninety')}_{h6}"
q = b['quiz']; qtxt = re.sub(r'_{2,}', 'blank', q['q']).rstrip('.?!'); opts = ' or '.join(q['options'][:2])
hook_say = {'stop': b['hook'], 'which': 'Which is correct?', '90': '90% get this wrong.'}.get(b['hook_type'], b['hook'])
L = [('h', 'ama', hook_say), ('m', 'ama', f"Many learners say: {b['wrong']}"), ('g', 'carlos', 'Pause and guess. What sounds right?'), ('k', 'ama', f"Say: {b['right']}"),
     ('y', 'carlos', b['why']), ('c', 'ama', f"Is '{b['wrong'].rstrip('.!?')}' correct? No."), ('rs', 'carlos', f"Repeat after me: {b['right']}"),
     ('rn', 'ama', f"Now at normal speed: {b['right']}"), ('r', 'carlos', "Teacher's tip: save these lines."), ('r2', 'ama', "Teacher's tip: save these lines."),
     ('e', 'ama', f"Quiz: {qtxt}. {opts.capitalize()}? Comment below."), ('e2', 'carlos', f"Quiz: {qtxt}. {opts.capitalize()}? Comment below.")]
LJ = json.load(open(f'{D}/lines.json')); by = {l['id']: l for l in LJ['lines']}
for suf, who, text in L:
    i = f'n_{h6}_{suf}'; l = by.get(i) or {}; l.update(id=i, who=who, text=text); l.pop('speed', None)
    if suf == 'rs': l['speed'] = 0.74
    if i not in by: LJ['lines'].append(l); by[i] = l
ic = ICON.get(b['topic'], 'bulb')
card = lambda kind, text, label=None, icon=None, formula=None: dict(kind=kind, text=text, sub=None, label=label, icon=icon, **({'formula': formula} if formula else {}))
beats = [dict(who='ama', line=f'n_{h6}_m', kind='m', card=card('x', b['wrong'])),
         dict(who='carlos', line=f'n_{h6}_g', kind='g', guess=True, card=card('p', 'What sounds right?', 'GUESS', 'question')),
         dict(who='ama', line=f'n_{h6}_k', kind='k', card=card('v', b['right'], icon=ic, formula=b['memory'])),
         dict(who='carlos', line=f'n_{h6}_y', kind='y', card=card('p', b['why'], 'WHY', 'bulb')),
         dict(who='ama', line=f'n_{h6}_c', kind='c', card=card('p', f"'{b['wrong'].rstrip('.!?')}'? -> No", 'CHECK')),
         dict(who='carlos', line=f'n_{h6}_rs', kind='rs', repeat=True, slow=True, card=card('p', b['right'], 'REPEAT', 'repeat')),
         dict(who='ama', line=f'n_{h6}_rn', kind='rn', card=card('v', b['right'], icon=ic, formula=b['memory']))]
sp = dict(v=7, id=lid, template='fix', bg=o.bg, area='grammar-check', cefr=b['cefr'], difficulty=b['diff'], hook_type=HOOK.get(b['hook_type'], 'question'), part=1,
          point=b['point'], key_line=b['right'], wrong_line=b['wrong'], share=f'who says "{b["wrong"]}"', l1_tags=['many learners'], source=dict(scriptbank=b['id'], pid=b['pid']),
          hook=dict(card=CARDHOOK.get(b['hook_type'], b['hook'].upper())[:22], line=f'n_{h6}_h'), series=['GRAMMAR FIX' if b['topic'] not in ('health', 'travel', 'food') else f"{b['topic'].upper()} ENGLISH", b['memory'][:28]],
          beats=beats, recap=dict(title="TEACHER'S TIP", rows=[b['right']] + b['ex'][:2], line=f'n_{h6}_r', line_alt=f'n_{h6}_r2'), end_line=f'n_{h6}_e', end_alt=f'n_{h6}_e2',
          link='', cta='', no_intro=True, **({'style': json.loads(o.style)} if o.style else {}))
json.dump(sp, open(f'{D}/{lid}.json', 'w'), ensure_ascii=False, indent=1); json.dump(LJ, open(f'{D}/lines.json', 'w'), ensure_ascii=False, indent=1); print(lid)
