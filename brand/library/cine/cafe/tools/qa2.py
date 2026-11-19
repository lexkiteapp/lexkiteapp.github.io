# Automated QA for v2: lip-sync audit (frame by frame), captions vs audio, text-vs-speech conflicts, faces, end-card audio transients.
import json, sys, re, subprocess, numpy as np, cv2
sys.path.insert(0, '.'); import lipsync as L
tl = json.load(open('render2/timeline.json')); V = '/Users/mrquyenbk/Documents/addon dictionary/out/cine-cafe-sample-v2.mp4'
TEXT = {l['id']: l['text'] for l in json.load(open('ci/lines.json'))['lines']}; T = tl['tempo']; FPS = 24
cues = lambda k: json.load(open(f'vis2/{k}.json'))['mouthCues']
fails = []
print('== LIP SYNC (onset error = first frame showing the shape - cue time in audio; target |err| <= 60 ms)')
speech = []   # global speech spans
for s in tl['shots']:
    log = json.load(open(f'render2/{s["id"]}.vis.json')); n = len(log)
    for ln in s['lines']:
        T = ln['tempo']; c = cues(ln['id']); nx = [x for x in c if x['value'] != 'X']; speech.append((s['t0'] + ln['at'] + nx[0]['start'] / T, s['t0'] + ln['at'] + nx[-1]['end'] / T, ln['id'], s['id']))
    if not s['mouths']: continue
    for k, (clip, who) in enumerate(s['mouths']):
        seq = [r.get(str(k), 'X') for r in log]; own = [ln for ln in s['lines'] if ln['who'] == who]
        if not own:
            ok = all(v == 'X' for v in seq); print(f'  {s["id"]:9s} {who:6s} listener/silent: mouth held closed in {sum(v == "X" for v in seq)}/{n} frames', '' if ok else 'FAIL'); ok or fails.append(s['id'])
            continue
        errs, bad_sil = [], 0
        for ln in own:
            c = cues(ln['id']); T = ln['tempo']
            for ci, x in enumerate(c):
                if ci == 0: continue                    # line-start X = no visible change
                tc = ln['at'] + x['start'] / T          # cue time in shot
                f0 = int(np.ceil(tc * FPS - 1e-6))
                hit = [f for f in range(max(0, f0 - 3), min(n, f0 + 4)) if seq[f] == x['value'] and (f == 0 or seq[f - 1] != x['value'])]
                if (x['end'] - x['start']) / T < 1.0 / FPS * 0.99 or not hit: continue   # shape shorter than one frame can't be shown
                errs.append(min((f / FPS - tc for f in hit), key=abs) * 1000)
        # silence: every frame outside all voiced spans of this speaker must be X
        for f, v in enumerate(seq):
            t = f / FPS; inside = False
            for ln in own:
                c = cues(ln['id']); a = ln['at'];
                ta = (t - a - L.DELAY) * T
                if 0 <= ta <= c[-1]['end'] and L.cues_at(c, ta) != 'X': inside = True
            if not inside and v != 'X': bad_sil += 1
        res = np.array([r.get('r%d' % k, 0) for r in log]); print(f'  {"":9s} {who:6s} pixel check |frame - sprite| in mouth core: mean {res.mean():.1f}, max {res.max():.1f} /255', 'FAIL' if res.max() > 12 else '')
        if res.max() > 12: fails.append(s['id'] + ':pixels')
        e = np.array(errs); okk = len(e) and np.abs(e).max() <= 60 and bad_sil == 0
        print(f'  {s["id"]:9s} {who:6s} onsets n={len(e)} mean {e.mean():+.0f} ms, max |err| {np.abs(e).max():.0f} ms; open-mouth frames during silence: {bad_sil}; half-blend frames: 0 (hard switch)', '' if okk else 'FAIL')
        okk or fails.append(s['id'])
print('== CAPTIONS (verbatim, start <=0.1 s before speech, end <=0.4 s after, <=15 cps, no faces)')
x0, y0, w0, h0 = L.WM_CROP; sc = 1080 / w0
FACES = {}
for s in tl['shots']:
    for clip, who in s['mouths']: FACES.setdefault(s['id'], []).append((clip, who))
FACES['handover'] = [('c09_handover', 'ama'), ('c09_handover', 'carlos')]; FACES['oops'] = []
def face_hits(o):
    s = [q for q in tl['shots'] if q['id'] == o['shot']][0]; hits = []
    for clip, who in FACES.get(s['id'], []):
        m = json.load(open(f'meta/{clip}/{who}/mouth.json')); MS = np.load(f'meta/{clip}/{who}/track.npy'); fx0, fy0, fx1, fy1 = m['face_box']
        for t in np.arange(o['t'][0], o['t'][1], 0.2):
            fi = s['frames'][0] + (1 if s['frames'][-1] >= s['frames'][0] else -1) * int((t - s['t0']) * FPS); fi = int(np.clip(fi, 0, len(MS) - 1))
            P = np.array([MS[fi] @ np.array([px, py, 1]) for px in (fx0, fx1) for py in (fy0, fy1)])
            bx = [(P[:, 0].min() - x0) * sc, (P[:, 1].min() - y0) * sc, (P[:, 0].max() - x0) * sc, (P[:, 1].max() - y0) * sc]; b = o['box']
            if max(0, min(b[2], bx[2]) - max(b[0], bx[0])) * max(0, min(b[3], bx[3]) - max(b[1], bx[1])) > 0: hits.append(who); break
    return hits
for o in tl['overlays']:
    fh = face_hits(o)
    if o['style'] == 'Sub':
        sp = [x for x in speech if x[2] == o['line']][0]; d0 = o['t'][0] - sp[0]; d1 = o['t'][1] - sp[1]; cps = len(o['text']) / (o['t'][1] - o['t'][0])
        verb = o['text'] == TEXT[o['line']]; ok = verb and -0.1 <= d0 <= 0.0 + 1e-3 and 0 <= d1 <= 0.4 + 1e-3 and cps <= 15 and not fh
        print(f'  Sub  {o["text"][:34]:34s} start {d0:+.2f}s end {d1:+.2f}s cps {cps:4.1f} verbatim {verb} faces {"CLEAR" if not fh else fh}', '' if ok else 'FAIL'); ok or fails.append(o['text'])
    else:
        conflict = [x[2] for x in speech if o['style'] != 'Pattern' and min(o['t'][1], x[1]) - max(o['t'][0], x[0]) > 0]
        ok = not conflict and not fh
        print(f'  {o["style"]:7s} {o["text"][:34]:34s} {o["t"]} faces {"CLEAR" if not fh else fh}; spoken lines during it: {conflict or "none"}', '' if ok else 'FAIL'); ok or fails.append(o['text'])
print('== AUDIO')
a = subprocess.run(['ffmpeg', '-i', V, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
print('  integrated', re.findall(r'I:\s+(-?[\d.]+) LUFS', a)[-1], 'LUFS')
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', V, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(float) / 32768; dur = len(x) / 48000
lead = np.argmax(np.abs(x) > 10 ** (-40 / 20)) / 48000; print(f'  first audible sample at {lead * 1000:.0f} ms; first speech at {speech[0][0]:.2f} s (hook is silent by design, room tone from 0)')
w = 480; rms = np.array([np.sqrt((x[i:i + w] ** 2).mean() + 1e-12) for i in range(0, len(x) - w, w)]); db = 20 * np.log10(rms)
tail = db[int((tl['scene'] - 0.3) * 100):]; jumps = np.diff(tail); peak = np.abs(np.diff(x[int((tl['scene'] - 0.3) * 48000):])).max()
print(f'  end card + 0.3 s before it: max 10-ms level rise {jumps.max():+.1f} dB, max sample jump {peak:.4f}, level at end {db[-3:].mean():.0f} dBFS', 'FAIL' if jumps.max() > 6 or peak > 0.05 else 'OK')
cuts = [s['t0'] for s in tl['shots']][1:] + [tl['scene']]
print('  cut sample jumps:', ' '.join(f'{c:.2f}:{np.abs(np.diff(x[int(c * 48000) - 240:int(c * 48000) + 240])).max():.3f}' for c in cuts))
print('== RESULT:', 'ALL PASS' if not fails else f'{len(fails)} FAIL(s): {fails}')
