#!/usr/bin/env python3
"""review_queue – next N unreviewed series specs, compact, for a reviewer (expert US English teacher) to approve or fix in batches.

  python3 scripts/video/tpl/review_queue.py stop-saying-this [N=5]          print the next N unreviewed episodes (plan order)
  python3 scripts/video/tpl/review_queue.py stop-saying-this --ok ID "note"  record: hook true + script reviewed (verdict must match the spec)
  python3 scripts/video/tpl/review_queue.py stop-saying-this --bad ID "why"  record: hook_true false (render gate refuses it)
A fix is made in the gold bank (content/video/scripts/bank/*.jsonl), then `gold2v9.py` regenerates the spec and resets its verdict.
"""
import json, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
slug = sys.argv[1]; D = f'{ROOT}/content/video/cine/news/series/{slug}'; VF = f'{D}/reviewed-hooks.json'
V = json.load(open(VF)); plan = json.load(open(f'{D}/plan.json'))['order']

if len(sys.argv) > 3 and sys.argv[2] in ('--ok', '--bad'):
    sid, note = sys.argv[3], (sys.argv[4] if len(sys.argv) > 4 else '')
    s = json.load(open(f'{D}/{sid}.json')); v = V['verdicts'][sid]
    assert v['script'] == {l['id']: l['text'] for l in s['lines'] if l.get('text')}, 'verdict script != spec (regenerate first)'
    v.update(hook_true=sys.argv[2] == '--ok', script_reviewed=sys.argv[2] == '--ok', reviewer=os.environ.get('REVIEWER', 'Claude (expert American English teacher review)'), note=note)
    json.dump(V, open(VF, 'w'), ensure_ascii=False, indent=1); print(sid, 'ok' if v['hook_true'] else 'REJECTED'); sys.exit(0)

n = int(sys.argv[2]) if len(sys.argv) > 2 else 5; todo = [o for o in plan if V['verdicts'].get(o['id'], {}).get('hook_true') is None][:n]
print(f'{slug}: {sum(1 for o in plan if V["verdicts"].get(o["id"], {}).get("hook_true") is None)} unreviewed of {len(plan)}')
for o in todo:
    s = json.load(open(f'{D}/{o["id"]}.json')); v = V['verdicts'][o['id']]
    print(f'\n## ep {o["ep"]} {o["id"]} [{o["cefr"]} {o["diff"]}, {o["words"]} w, ~{o["est_s"]} s] {o["point"]}')
    print(f'   hook on screen: {v["hook"]}' + (f'   error_re: {s["error_re"]}' if s.get('error_re') else ''))
    for l in s['lines']:
        if l.get('text'):
            ws = l['text'].split(); k = {i: c[0].upper() for c, ix in l.get('key', {}).items() for i in ix}
            print(f'   {l["id"]:5} ' + ' '.join(f'{w}^{k[i]}' if i in k else w for i, w in enumerate(ws)))
        else: print(f'   {l["id"]:5} [{l["beat"]} {l.get("dur")} s]')
    q = next(p for p in s['pops'] if p['kind'] == 'quiz'); print(f'   quiz: A {q["a"]} | B {q["b"]} -> {q["correct"].upper()}')
