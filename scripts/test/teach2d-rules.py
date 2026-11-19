#!/usr/bin/env python3
"""Spell->Sound rule bank (docs/specs/spell-sound.md): rules.json is well formed, rules-words.json == `gen.py --rules` (regenerates identically),
every mined word matches its rule's spelling AND its US IPA proves the rule (live bank), <= 6 words per rule, silent span points at the silent letters,
rows are unique, and the miner really drops a word whose IPA does not show the rule (never an IPA override)."""
import json, os, re, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts/video/teach2d'); import rules as RU  # noqa: E402
R = json.load(open(RU.RULES_F))['rules']; D = json.load(open(RU.OUT_F))['rules']; BY = {r['id']: r for r in R}
bad = []
if len(R) < 10: bad.append(f'rules.json has {len(R)} rules (< 10)')
for r in R:
    for k in ('id', 'kind', 'title', 'pattern', 'target', 'wrong', 'say'):
        if not r.get(k): bad.append(f"{r.get('id')}: missing {k}")
    try: re.compile(r['pattern'])
    except re.error as e: bad.append(f"{r['id']}: bad pattern {e}")
    if 'ipa_re' not in r and 'ipa_absent' not in r: bad.append(f"{r['id']}: no IPA proof (ipa_re / ipa_absent)")
if len({r['id'] for r in R}) != len(R): bad.append('duplicate rule id')
if subprocess.run([sys.executable, f'{ROOT}/scripts/video/teach2d/gen.py', '--rules', '--check']).returncode: bad.append('rules-words.json != gen.py --rules')
F = json.loads(subprocess.run(['node', f'{ROOT}/scripts/video/teach2d/facts.mjs', 'bank'], capture_output=True, text=True, check=True, cwd=ROOT).stdout)['words']
n = 0
for d in D:
    r = BY[d['id']]; ws = [w['word'] for w in d['words']]
    if not RU.MIN_WORDS <= len(ws) <= RU.TOP: bad.append(f"{d['id']}: {len(ws)} words")
    if len(set(ws)) != len(ws): bad.append(f"{d['id']}: repeated word")
    for w in d['words']:
        n += 1; A = F.get(w['word'])
        if not A or A['ipa'] != w['ipa']: bad.append(f"{d['id']}/{w['word']}: IPA differs from the bank"); continue
        sp = RU.check(r, w['word'], A['ipa'])
        if sp != w['silent'] or w['word'][sp[0]:sp[1]] != w['letter']: bad.append(f"{d['id']}/{w['word']}: rule not proven by the IPA / wrong silent span")
# the proof really filters: a fake bank word whose IPA keeps the letter must be dropped
fake = {'knight': dict(ipa='/knaɪt/', cefr='A1', **{'def': 'x', 'ex': 'x', 'em': ''}), 'knife': dict(ipa='/naɪf/', cefr='A1', **{'def': 'x', 'ex': 'x', 'em': ''}), 'knit': dict(ipa='/nɪt/', cefr='A1', **{'def': 'x', 'ex': 'x', 'em': ''})}
got = [w['word'] for w in RU.mine(fake, set())['silent-kn']]
if got != ['knife', 'knit']: bad.append(f'miner kept a word whose IPA does not show the rule: {got}')
print(f'rules {len(R)}, mined {n} words in {len(D)} rules' + (' – FAIL' if bad else ' – OK'))
for b in bad: print('::error::' + b)
sys.exit(1 if bad else 0)
