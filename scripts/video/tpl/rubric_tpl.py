#!/usr/bin/env python3
"""docs/MEDIA-QA-RUBRIC.md §C (video, 100 points) for template-1b renders, computed from qc_tpl.py gates + the file itself.
  python3 scripts/video/tpl/rubric_tpl.py <video.mp4> [...]           -> <video>.rubric.json, prints score; exit 1 if any < RUBRIC_MIN
  python3 scripts/video/tpl/rubric_tpl.py --batch <dir with *.qc.json>  -> batch framing gate (hostframe.batch: shoulders ±5 % of the median, same head top, crop spread cap)
Accept = every qc gate ok AND score >= tokens.RUBRIC_MIN (90). Points (rubric C):
  hook 15 (hook beat on screen <= 0.3 s, COMPLETE hook text readable by 1.5 s = gate hook_readable, hook_truth) · knowledge 20 (Groq judge: correction ok + honest hook)
  lip-sync 15 (Rhubarb cues on every line + one host transform) · audio 10 (-16 LUFS ±1, true peak <= -1 dBTP, music bed <= -24 dB)
  text 10 (safe area + readability + no jitter) · pacing 10 (one moving group, no unmotivated cut, 25-35 s) · brand 10 (clean plate, motion tokens,
  host framing standard) · CTA 5 (deep link + loop end) · share value 5 (quiz + recap present; real saves/shares are measured after publishing)."""
import sys, os, json, re, subprocess, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import RUBRIC_MIN, HOST_LOCK
import hostframe as HF

def loudness(vid):
    r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', vid, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r); TP = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)
    return (float(I[-1]) if I else None), (float(TP[-1]) if TP else None)

def score(vid):
    Q = json.load(open(vid + '.qc.json')); G = Q['gates']; T = json.load(open(vid + '.timeline.json'))
    ok = lambda *k: all(G.get(x, {}).get('ok') for x in k)
    hb = T['beats']['h']; hook_on = hb['vin'] <= 0.3
    pts = {}
    pts['hook'] = 15 if (hook_on and ok('hook_truth', 'hook_readable')) else (8 if hook_on else 0)
    pts['knowledge'] = 20 if ok('hook_truth') else 0
    pts['lipsync'] = 15 if ok('lipsync_rhubarb', 'host_variance') else 0
    I, TP = loudness(vid); mus = (T.get('audio') or {}).get('music_rms_dbfs', 0)
    pts['audio'] = (6 if I is not None and abs(I + 16) <= 1 else 0) + (2 if TP is not None and TP <= -1.0 else 0) + (2 if mus <= -24 else 0)
    pts['text'] = round(10 * sum(ok(k) for k in ('safe_area', 'readability', 'no_jitter')) / 3)
    pts['pacing'] = round(10 * sum(ok(k) for k in ('one_moving_group', 'no_unmotivated_cut', 'file')) / 3)
    pts['brand'] = round(10 * sum(ok(k) for k in ('plate_clean', 'plate_topic', 'motion_tokens', 'host_frame_std', 'host_frame', 'plate_contrast')) / 6)
    pts['cta'] = 5 if ok('loop_end') and (T.get('cta') or {}).get('link', '').startswith('https://lexkite.com/') else 0
    pts['share'] = 5 if any(k.startswith('e.') for k in T['elements']) and T.get('beats', {}).get('r2') else 3
    total = sum(pts.values()); gates_ok = all(g['ok'] for g in G.values())
    R = dict(video=os.path.basename(vid), id=T['id'], score=total, points=pts, lufs=I, true_peak=TP, gates_ok=gates_ok,
             failed=[k for k, g in G.items() if not g['ok']], accept=gates_ok and total >= RUBRIC_MIN, host=T.get('host_name'), host_head=T.get('host_head'))
    json.dump(R, open(vid + '.rubric.json', 'w'), indent=1)
    print(f"{R['video']}: {total}/100 {'ACCEPT' if R['accept'] else 'REJECT'} {pts} failed={R['failed']}")
    return R

def batch(d):
    H = []
    for f in sorted(os.listdir(d)):
        if f.endswith('.rubric.json'):
            r = json.load(open(os.path.join(d, f))); hh = r.get('host_head') or {}
            if hh.get('screen'): H.append((r['id'], r['host'], HF.check(hh['screen'], HOST_LOCK, hh.get('ext_rows', 0))))
    if not H: print('batch host gate: no renders'); return dict(ok=False, reason='no renders')
    R = HF.batch(H, HOST_LOCK); print('batch host-framing gate', 'PASS' if R['ok'] else 'FAIL', json.dumps(R)); return R

if __name__ == '__main__':
    if sys.argv[1] == '--batch':
        r = batch(sys.argv[2]); json.dump(r, open(os.path.join(sys.argv[2], 'host-scale.json'), 'w'), indent=1); sys.exit(0 if r['ok'] else 1)
    rs = [score(v) for v in sys.argv[1:]]
    sys.exit(0 if all(r['accept'] for r in rs) else 1)
