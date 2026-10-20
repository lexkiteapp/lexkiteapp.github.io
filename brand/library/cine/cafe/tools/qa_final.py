# Automated continuity / layout / audio checks on the assembled sample
import json, numpy as np, subprocess, re, sys
sys.path.insert(0, '.'); import lipsync as L
tl = json.load(open('render/timeline.json')); V = '/Users/mrquyenbk/Documents/addon dictionary/out/cine-cafe-sample.mp4'
x, y, w, h = L.WM_CROP; sc = 1080 / w
FACES = {'c05_ots_ama_talk_a': ['ama'], 'c06_ots_ama_talk_b': ['ama'], 'c07_ots_ama_react': ['ama'], 'c03_ots_carlos_talk_a': ['carlos'],
         'c08_ots_carlos_react': ['carlos'], 'c10_ama_mcu_talk': ['ama'], 'c09_handover': ['ama', 'carlos'], 'c12b_closing': ['carlos']}
res = []
for o in tl['overlays']:
    s = [q for q in tl['shots'] if q['id'] == o['shot']][0]; bad = []
    for who in FACES.get(s['clip'], []):
        m = json.load(open(f'meta/{s["clip"]}/{who}/mouth.json')); MS = np.load(f'meta/{s["clip"]}/{who}/track.npy')
        fx0, fy0, fx1, fy1 = m['face_box']
        for t in np.arange(o['t'][0], o['t'][1], 0.25):
            f = min(len(MS) - 1, s['f_in'] + int((t - s['t0']) * 24))
            P = np.array([MS[f] @ np.array([px, py, 1]) for px in (fx0, fx1) for py in (fy0, fy1)])
            bx0, by0 = (P[:, 0].min() - x) * sc, (P[:, 1].min() - y) * sc; bx1, by1 = (P[:, 0].max() - x) * sc, (P[:, 1].max() - y) * sc
            b = o['box']; ov = max(0, min(b[2], bx1) - max(b[0], bx0)) * max(0, min(b[3], by1) - max(b[1], by0))
            if ov > 0: bad.append((who, round(t, 2))); break
    cps = len(o['text']) / max(0.01, o['t'][1] - o['t'][0]) if o['style'] == 'Sub' else 0
    res.append((o['style'], o['text'][:28], o['t'], 'FACE-OVERLAP ' + str(bad) if bad else 'faces clear', round(cps, 1), round(o['t'][1] - o['t'][0], 2)))
for r in res: print('%-5s %-30s %-14s %-14s cps=%-5s dur=%s' % r)
# audio: leading silence, loudness, clicks at cuts (sample-to-sample jumps around cut times)
a = subprocess.run(['ffmpeg', '-i', V, '-af', 'silencedetect=n=-40dB:d=0.15,ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
st = re.findall(r'silence_start: ([\d.]+)', a); en = re.findall(r'silence_end: ([\d.]+)', a)
print('silences (start,end):', list(zip(st, en))[:12]); print('integrated loudness:', re.findall(r'I:\s+(-?[\d.]+) LUFS', a)[-1:])
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', V, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
pcm = np.frombuffer(raw, np.int16).astype(float) / 32768
cuts = [q['t0'] for q in tl['shots']][1:] + [tl['total'] - 2.0]
for c in cuts:
    i = int(c * 48000); seg = pcm[max(0, i - 480):i + 480]; d = np.abs(np.diff(seg)).max() if len(seg) > 2 else 0
    print('cut %.2fs max sample jump %.3f' % (c, d))
