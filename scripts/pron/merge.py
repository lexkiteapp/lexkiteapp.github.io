"""Merge per-candidate reports -> reports/pron-eval.json + markdown table (stdout)."""
import glob, json, os
rs = [json.load(open(f)) for f in sorted(glob.glob('parts/**/pron-eval-*.json', recursive=True))]
assert rs, 'no per-candidate reports found'
os.makedirs('reports', exist_ok=True)
json.dump(rs, open('reports/pron-eval.json', 'w'), indent=1)
print('| cand | quant | PER LS | PCC phone | false-alarm LS | FA good SO | ms / 1 s audio (p50) | size MB |\n|---|---|---|---|---|---|---|---|')
for r in rs:
    for q, m in r['quant'].items():
        print(f"| {r['cand']} | {q} | {m['PER_librispeech']} | {m['PCC_phone_so762']} | {m['false_alarm_native_ls']} | {m['false_alarm_so_good_phones']} | {m['latency_ms_per_audio_s']['p50']} | {m['size_mb']} |")
    for n in r.get('notes', []): print(f"\n- {r['cand']}: {n}")
print('\nGates (plan section 6, P0): PER<=12%, PCC>=0.50, false-alarm<=8%, size<=70 MB. B1/B2 are TIMIT-trained: benchmark only, not shippable.')
