"""pron-eval plan: resolve candidates (verify HF repo exists), validate inputs, emit matrix."""
import json, os, re, sys, urllib.request
cands = json.load(open('scripts/pron/candidates.json'))
want = [c.strip() for c in os.environ['CANDS'].split(',') if c.strip()]
quant = [q.strip() for q in os.environ['QUANT'].split(',') if q.strip()]
assert quant and all(q in ('fp32', 'q8') for q in quant), f'quant must be fp32/q8: {quant}'
assert os.path.exists('scripts/pron/gop.mjs'), 'scripts/pron/gop.mjs missing - wait until the GOP agent has landed it on main'
ok, notes = [], []
for c in want:
    if c not in cands: notes.append(f'{c}: unknown candidate id, skipped'); continue
    repo = cands[c]['repo']
    try:
        urllib.request.urlopen(urllib.request.Request(f'https://huggingface.co/api/models/{repo}'), timeout=30).read()
        ok.append({'id': c, 'repo': repo})
    except Exception as e:
        notes.append(f'{c}: HF repo {repo} not reachable ({e}), skipped')
for n in notes: print('::warning::' + n)
assert ok, 'no usable candidate: ' + '; '.join(notes)
with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
    f.write('matrix=' + json.dumps(ok) + '\n')
with open(os.environ['GITHUB_STEP_SUMMARY'], 'a') as f:
    for n in notes: f.write(f'- note: {n}\n')
