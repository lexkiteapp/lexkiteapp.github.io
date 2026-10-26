"""Markdown lines for the pron-train step summary. usage: summary.py wait w.json [--require-done] | summary.py export DIR/train_report.json"""
import json, sys
kind, path = sys.argv[1], sys.argv[2]
d = json.load(open(path))
if kind == 'wait':
    r = d.get('result') or {}
    print(f"- train ({'done' if d['done'] else 'still running'}): step {r.get('step')}, best dev-clean PER {r.get('best_per')} @ {r.get('best_step')}, stop {r.get('stop')}")
    if '--require-done' in sys.argv and not d['done']: sys.exit('training call not finished after the second wait window')
else:
    print('| variant | size MB | PER dev-clean (100 utt) | max diff vs torch |\n|---|---|---|---|')
    for k, v in d['variants'].items(): print(f"| {k} | {v['size_mb']} | {v['PER_dev_clean_100']} | {v['max_abs_diff_vs_torch']} |")
    for n in d.get('notes', []): print('- ' + n)
