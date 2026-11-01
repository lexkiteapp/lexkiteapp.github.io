"""Merge per-candidate reports -> reports/pron-eval.json + markdown table (stdout) with P0 gates (plan section 6)."""
import glob, json, os
rs = [json.load(open(f)) for f in sorted(glob.glob('parts/**/pron-eval-*.json', recursive=True))]
assert rs, 'no per-candidate reports found'
os.makedirs('reports', exist_ok=True)
json.dump(rs, open('reports/pron-eval.json', 'w'), indent=1)
ok = lambda v, lim, le=True: '' if v is None else (' ✅' if (v <= lim if le else v >= lim) else ' ❌')
print('| cand | quant | PER LS | PCC phone (default calib) | PCC after calib (fit on SO train) | false-alarm LS | FA LS after calib | FA good SO | ms / 1 s audio (p50) | size MB |\n|---|---|---|---|---|---|---|---|---|---|')
for r in rs:
    for q, m in r['quant'].items():
        c = m.get('calibrated') or {}
        pa, fa = c.get('PCC_after'), c.get('false_alarm_native_ls_after')
        print(f"| {r['cand']} | {q} | {m['PER_librispeech']}{ok(m['PER_librispeech'], 0.12)} | {m['PCC_phone_so762']}{ok(m['PCC_phone_so762'], 0.5, False)} | "
              f"{pa}{ok(pa, 0.5, False)} {('(' + c['feature'] + ')') if c else ''} | {m['false_alarm_native_ls']}{ok(m['false_alarm_native_ls'], 0.08)} | {fa}{ok(fa, 0.08)} | "
              f"{m['false_alarm_so_good_phones']} | {m['latency_ms_per_audio_s']['p50']} | {m['size_mb']}{ok(m['size_mb'], 70)} |")
    for n in r.get('notes', []): print(f"\n- {r['cand']}: {n}")
print('\nGates (plan section 6, P0): PER<=12%, PCC>=0.50, false-alarm<=8%, size<=70 MB. Calibration is fitted on the speechocean762 TRAIN sample only '
      '(feature chosen by train PCC); all PCC/FA numbers are on TEST. B1/B2 are TIMIT-trained: benchmark only, not shippable.')
