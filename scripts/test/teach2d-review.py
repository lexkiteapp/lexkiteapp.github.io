#!/usr/bin/env python3
"""Eye-review sampling (docs/VIDEO-V3.md): first clip of each template x language, then every 20th; < 90 or missing review blocks publishing."""
import glob, json, os, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); sys.path.insert(0, f'{ROOT}/scripts/video/teach2d')
import autopub_gate as A
ids = lambda tpl, lang, n: [d['id'] for d in (json.load(open(f)) for f in sorted(glob.glob(f'{ROOT}/content/video/teach2d/eps/*.json'))) if d['template'] == tpl and (d.get('lang') or 'en') == lang][:n]
en, ja = ids('slang', 'en', 25), ids('slang', 'ja', 3); me = json.load(open(f'{ROOT}/content/video/teach2d/eps/{en[0]}.json'))
assert A.review_due(me, [], {}) == 'first', 'first clip of the pair'
assert A.review_due(me, ja, {}) == 'first', 'another page language is another pair'
assert A.review_due(me, en[1:4], {}) is None, 'clips 2-4 need no review'
assert A.review_due(me, en[1:20], {}) == 'every20', 'the 20th clip of the pair'
assert A.review_due(me, en[1:21], {}) is None, 'the 21st'
# gate integration: missing / low review blocks, >= 90 passes; reviews=None keeps the old behaviour
base = dict(ep=me, entry=dict(sha=dict(short='aa', wide='bb')), qc={}, levels={}, area_map=A.areas(), posted=[])
why = lambda rv: [w for w in A.gate(**dict(base, reviews=rv))['why'] if w.startswith('review')]
assert why({}) == ['review:first'] and why({me['id']: {'score': 85}}) == ['review:first'] and why({me['id']: {'score': 92}}) == [] and not [w for w in A.gate(**base)['why'] if w.startswith('review')]
print('teach2d-review: OK')
