# mkgap.py <src_id> <new_id> <word> <cut0> <cut1> [sil=0.6] : Fill-the-gap line = source wav with [cut0,cut1) replaced by silence;
# cues shifted, mouth X during the silence; gap facts stored in vis3/<new_id>.json["gap"] for qa5. Add <new_id> to ci/lines.json (derived).
import sys, json, subprocess, numpy as np
import os as _os
if _os.environ.get('CINE_SCENE_DIR'): _os.chdir(_os.environ['CINE_SCENE_DIR'])   # scene dir (default cwd)
src, new, word, c0, c1 = sys.argv[1], sys.argv[2], sys.argv[3], float(sys.argv[4]), float(sys.argv[5]); sil = float(sys.argv[6]) if len(sys.argv) > 6 else 0.6
raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', f'vis3/{src}.wav', '-f', 's16le', '-ac', '1', '-ar', '48000', '-'], capture_output=True, check=True).stdout
x = np.frombuffer(raw, np.int16).astype(np.float32); sr = 48000; a, b = int(c0 * sr), int(c1 * sr); f = int(0.008 * sr)
pre, post = x[:a].copy(), x[b:].copy(); pre[-f:] *= np.linspace(1, 0, f); post[:f] *= np.linspace(0, 1, f)
y = np.concatenate([pre, np.zeros(int(sil * sr), np.float32), post]).clip(-32768, 32767).astype(np.int16)
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 's16le', '-ar', str(sr), '-ac', '1', '-i', '-', f'vis3/{new}.wav'], input=y.tobytes(), check=True)
d = json.load(open(f'vis3/{src}.json')); sh = sil - (c1 - c0); out = []
for c in d['mouthCues']:
    s, e = c['start'], c['end']
    if e <= c0: out.append(dict(c)); continue
    if s < c0: out.append(dict(c, end=c0))
    if e > c1: out.append(dict(c, start=round(max(s, c1) + sh, 3), end=round(e + sh, 3)))
out.insert(next(i for i, c in enumerate(out) if c['start'] >= c0 - 1e-6) if any(c['start'] >= c0 - 1e-6 for c in out) else len(out), dict(start=c0, end=round(c0 + sil, 3), value='X'))
d['mouthCues'] = out; d['gap'] = dict(src=src, word=word, cut=[c0, c1], silence=[c0, round(c0 + sil, 3)]); d['metadata']['duration'] = round(len(y) / sr, 3)
json.dump(d, open(f'vis3/{new}.json', 'w'), indent=1); print(new, len(y) / sr, 's', [(c['start'], c['value']) for c in out])
