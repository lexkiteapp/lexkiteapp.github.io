#!/usr/bin/env python3
"""manual_gate.py <qc.json> --judge ok|fail --vision ok|fail [--issues "..."] [--notes "..."] - record a MANUAL review of the two AI gates
(owner 23/10: while no free AI API answers, the reviewer applies the same rubric: script judge = correctness, <= B1, wrong really wrong /
right really right, tip correct, neutrality; vision = ~12 frames: logic, placement, overlap, hands, sharpness, scene fit).
Same weights as qc_gate.py (judge 10, vision 8); provider recorded as 'claude-manual'; score recomputed; ok = every gate ok."""
import argparse, json, time
ap = argparse.ArgumentParser(); ap.add_argument('qc'); ap.add_argument('--judge', choices=['ok', 'fail'], required=True); ap.add_argument('--vision', choices=['ok', 'fail'], required=True)
ap.add_argument('--issues', default=''); ap.add_argument('--notes', default=''); a = ap.parse_args()
q = json.load(open(a.qc)); G = q['gates']; at = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
G['ai_script_judge'] = dict(ok=a.judge == 'ok', detail=dict(provider='claude-manual', issues=[x for x in a.issues.split('|') if x], at=at), weight=G.get('ai_script_judge', {}).get('weight', 10))
G['ai_vision'] = dict(ok=a.vision == 'ok', detail=dict(provider='claude-manual', notes=a.notes, at=at), weight=G.get('ai_vision', {}).get('weight', 8))
q['score'] = 100 - sum(g['weight'] for g in G.values() if not g['ok']); q['ok'] = all(g['ok'] for g in G.values()); q['judge'] = 'claude-manual'
json.dump(q, open(a.qc, 'w'), indent=1); print(f"QC {q['id']}: {'PASS' if q['ok'] else 'FAIL'} score {q['score']}/100 (AI gates: claude-manual)")
