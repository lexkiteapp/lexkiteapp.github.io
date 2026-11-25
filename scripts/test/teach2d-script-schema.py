#!/usr/bin/env python3
"""Standard script schema (scripts/video/teach2d/script_schema.py): every episode in content/video/teach2d/eps validates; each rule has a red case."""
import copy, glob, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import script_schema as S
bad = {}
for f in glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json'):
    p = S.validate(json.load(open(f)))
    if p: bad[os.path.basename(f)] = p
known = set(json.load(open(f'{ROOT}/content/video/teach2d/schema-known.json'))['known']); new = {k[:-5]: v for k, v in bad.items()}
assert set(new) == known, ('new violations', sorted(set(new) - known)[:5], 'fixed (remove from schema-known.json)', sorted(known - set(new))[:5])
assert all(v == ['spoken hook > 6 words'] for v in new.values()), 'the only tolerated violation is the long spoken hook of l1 rows'
ep = json.load(open(f'{ROOT}/content/video/teach2d/eps/t2s_ace.json'))
def red(mut, frag):
    e = copy.deepcopy(ep); mut(e); p = S.validate(e); assert any(frag in x for x in p), (frag, p)
red(lambda e: e.pop('cta'), 'missing cta')
red(lambda e: e['lines'][0].update(text='one two three four five six seven'), 'hook > 6')
red(lambda e: e['lines'].pop(), 'CTA')
red(lambda e: e['lines'].__delitem__(slice(1, 3)), 'beats')
red(lambda e: e['est'].update(wpm=151), 'wpm')
red(lambda e: e.update(lang='xx'), '15')
red(lambda e: e.update(teacher='bob'), 'registry')
red(lambda e: e['cta'].update(link='https://evil.example/x'), 'cta link')
print('teach2d-script-schema: OK')
