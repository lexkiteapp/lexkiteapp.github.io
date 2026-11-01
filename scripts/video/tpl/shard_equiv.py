"""Equivalence proof sharded vs single-process render (video-templates9): python3 shard_equiv.py <dirA> <dirB> <template>
A = shards=1, B = shards=N (each the downloaded tpl9 artifact folder). Checks: frame-by-frame PSNR of the decoded video (>= 45 dB), qc gate pass/fail + numbers, timeline JSON (dict order ignored)."""
import sys, json, subprocess, re, glob, os
A, B, T = sys.argv[1:4]; bad = []
def diff(a, b, path='', out=None, tol=0.0):
    out = [] if out is None else out
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(set(a) | set(b)):
            if k not in a or k not in b: out.append(f'{path}/{k}: only in {"B" if k not in a else "A"}')
            else: diff(a[k], b[k], f'{path}/{k}', out, tol)
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b): out.append(f'{path}: len {len(a)} != {len(b)}')
        else:
            for i, (x, y) in enumerate(zip(a, b)): diff(x, y, f'{path}[{i}]', out, tol)
    elif isinstance(a, (int, float)) and isinstance(b, (int, float)) and not isinstance(a, bool):
        if abs(a - b) > tol * max(abs(a), abs(b)): out.append(f'{path}: {a} != {b}')
    elif a != b: out.append(f'{path}: {str(a)[:60]} != {str(b)[:60]}')
    return out
# 1. PSNR per frame
va, vb = f'{A}/{T}.mp4', f'{B}/{T}.mp4'; log = 'psnr.log'
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', va, '-i', vb, '-lavfi', f'[0:v][1:v]psnr=stats_file={log}', '-f', 'null', '-'], check=True)
ps = [float(re.search(r'psnr_avg:(\S+)', l).group(1)) for l in open(log)]; ps = [min(p, 100.0) for p in ps]   # inf = identical frame
na = int(subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', va], capture_output=True, text=True).stdout.strip())
print(f'frames: A={na} compared={len(ps)}  PSNR min={min(ps):.2f} mean={sum(ps)/len(ps):.2f} dB  frames<45dB: {sum(p < 45 for p in ps)}')
if len(ps) != na or min(ps) < 45: bad.append('psnr')
# 2. QC
qa = json.load(open(glob.glob(f'{A}/*.qc.json')[0])); qb = json.load(open(glob.glob(f'{B}/*.qc.json')[0]))
d = diff(qa, qb, tol=0.01); print(f'qc.json differences (numbers within 1 % allowed: file size / bitrate / sharpness follow the lossy encode; every pass/fail flag and string must match exactly): {len(d)}'); [print('  ', x) for x in d[:30]]
if d: bad.append('qc')
print('qc.log identical:', open(f'{A}/qc.log').read() == open(f'{B}/qc.log').read())
# 3. timeline
ta = json.load(open(f'{A}/{T}.mp4.timeline.json')); tb = json.load(open(f'{B}/{T}.mp4.timeline.json'))
d = diff(ta, tb); print(f'timeline differences: {len(d)}'); [print('  ', x) for x in d[:30]]
if d: bad.append('timeline')
print('RESULT:', 'EQUIVALENT' if not bad else 'DIFFERENT ' + ','.join(bad)); sys.exit(1 if bad else 0)
