# Teacher sprite voice data (docs/TEACHER-IN-APP.md §5.4): Kokoro WAV + Rhubarb mouthCues (both already produced on CI) →
#   <who>_lines.json: text, duration, raw cues, cues GATED by audio VAD (mouth closed wherever the audio is silent – Rhubarb sometimes keeps
#   the mouth moving through a pause), and a 20 ms loudness envelope (0–9) the page uses to pick small/mid/wide in-between shapes;
#   <who>_timing.json: speech/silence boundary error of raw Rhubarb vs the audio; mp3 48 kbps mono.
# Usage: python scripts/teacher/sprite_cues.py <voices dir (id.wav + id.json)> <lines.json with {id,text}> <out dir> <who> id1 id2 …
import json, sys, wave, subprocess, numpy as np

V, LINES, OUT, who, ids = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5:]
text = {l['id']: l['text'] for l in json.load(open(LINES))['lines']}
out, errs, per = {}, [], {}
CLOSED = 'XA'   # A (M/B/P) is a closed mouth too

def runs(b):
    r, s = [], None
    for i, v in enumerate(b):
        if v and s is None: s = i
        if not v and s is not None: r.append([s, i]); s = None
    if s is not None: r.append([s, len(b)])
    return r

for id in ids:
    w = wave.open(f'{V}/{id}.wav'); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    if w.getnchannels() > 1: x = x.reshape(-1, w.getnchannels()).mean(1)
    hop = int(sr * .01); rms = np.array([np.sqrt((x[i:i + hop * 2] ** 2).mean()) for i in range(0, len(x) - hop * 2, hop)])
    db = 20 * np.log10(rms + 1e-9); sp = db > db.max() - 35
    M = []
    for a in runs(sp):                     # fill gaps < 80 ms, drop blips < 40 ms
        if M and a[0] - M[-1][1] < 8: M[-1][1] = a[1]
        else: M.append(a)
    vad = [(a / 100, b / 100) for a, b in M if b - a >= 4]
    cues = json.load(open(f'{V}/{id}.json'))['mouthCues']
    cs = []
    for c in cues:
        on = c['value'] not in CLOSED
        if on and cs and abs(cs[-1][1] - c['start']) < 1e-6: cs[-1][1] = c['end']
        elif on: cs.append([c['start'], c['end']])
    cb = [t for a, b in cs if b - a >= .04 for t in (a, b)]
    e = [min(abs(t - c) for c in cb) * 1000 for seg in vad for t in seg] if cb else []
    errs += e; per[id] = [round(v) for v in e]
    g = []
    for c in cues:
        a, b, v = c['start'], c['end'], c['value']; segs = [(max(a, s), min(b, t)) for s, t in vad if min(b, t) > max(a, s)] if v != 'X' else []; t0 = a
        for s, t in segs:
            if s > t0 + 1e-3: g.append([round(t0, 2), 'X'])
            g.append([round(s, 2), v]); t0 = t
        if t0 < b - 1e-3: g.append([round(t0, 2), 'X'])
    gated = []
    for q in g:
        if not gated or gated[-1][1] != q[1]: gated.append(q)
    env = db[::2]; lo, hi = db.max() - 35, db.max(); lvl = ''.join(str(int(np.clip((v - lo) / (hi - lo) * 10, 0, 9))) for v in env)
    out[id] = {'text': text[id], 'dur': cues[-1]['end'], 'cues': [[round(c['start'], 2), c['value']] for c in cues], 'gated': gated, 'env20': lvl}
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', f'{V}/{id}.wav', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', f'{OUT}/{id}.mp3'], check=True)
e = np.array(errs)
json.dump(out, open(f'{OUT}/{who}_lines.json', 'w'), separators=(',', ':'))
json.dump({'boundary_err_ms': {'mean': round(float(e.mean())), 'median': round(float(np.median(e))), 'p90': round(float(np.percentile(e, 90))), 'max': round(float(e.max())), 'n': len(e)}, 'per_line': per}, open(f'{OUT}/{who}_timing.json', 'w'), indent=1)
print(who, 'raw Rhubarb boundary err ms: mean %.0f median %.0f p90 %.0f max %.0f (n=%d)' % (e.mean(), np.median(e), np.percentile(e, 90), e.max(), len(e)))
