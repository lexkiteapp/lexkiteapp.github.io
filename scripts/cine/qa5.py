# QA for v5 lessons: run inside the scene dir (CINE_SCENE_DIR, default cwd): python scripts/cine/qa5.py render5_<lesson>_<lang>[_v3]
# Same env as lesson5.py: CINE_SCENE_DIR, CINE_LIB, CINE_ROOT, CINE_OUT, CINE_THREADS. Exit code 1 on any FAIL (CI gate).
import json, sys, re, subprocess, glob, os, numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lipsync as L
if os.environ.get('CINE_SCENE_DIR'): os.chdir(os.environ['CINE_SCENE_DIR'])
TH = os.environ.get('CINE_THREADS', '2'); ROOT = os.path.abspath(os.environ.get('CINE_ROOT', os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))))
RD = sys.argv[1]; tl = json.load(open(f'{RD}/timeline.json')); V = os.path.join(os.path.abspath(os.environ.get('CINE_OUT', f'{ROOT}/out')), tl['lesson']['out'])
TEXT = {l['id']: l['text'] for l in json.load(open('ci/lines.json'))['lines']}; FPS = 24
LIB = os.path.abspath(os.environ.get('CINE_LIB', os.path.dirname(os.path.dirname(os.getcwd()))))
MD = lambda c: (f'{LIB}/' + c.replace(':', '/meta/', 1)) if ':' in c else f'meta/{c}'   # 'bank:clip' B-roll -> that bank's meta
cues = lambda k: json.load(open(f'vis3/{k}.json'))['mouthCues']; fails = []
print('== LIP SYNC'); speech = []
for s in tl['shots']:
    log = json.load(open(s['vis'])); n = len(log)
    for ln in s['lines']:
        T = ln['tempo']; c = cues(ln['id']); nx = [x for x in c if x['value'] != 'X']; speech.append((s['t0'] + ln['at'] + nx[0]['start'] / T, s['t0'] + ln['at'] + nx[-1]['end'] / T, ln['id'], s['id']))
    for k, (clip, who) in enumerate(s['mouths']):
        seq = [r.get(str(k), 'X') for r in log]; own = [ln for ln in s['lines'] if ln['who'] == who]; res = np.array([r.get('r%d' % k, 0) for r in log])
        if not own:
            ok = all(v == 'X' for v in seq) and res.max() <= 12; print(f'  {s["id"]:8s} {who:6s} silent/listener: closed {sum(v == "X" for v in seq)}/{n}, pixel max {res.max():.1f}', '' if ok else 'FAIL'); ok or fails.append(s['id']); continue
        errs, bad = [], 0
        for ln in own:
            c = cues(ln['id']); T = ln['tempo']
            for ci, x in enumerate(c):
                if ci == 0 or (x['end'] - x['start']) / T < 1 / FPS: continue
                tc = ln['at'] + x['start'] / T; f0 = int(np.ceil(tc * FPS - 1e-6))
                hit = [f for f in range(max(0, f0 - 3), min(n, f0 + 4)) if seq[f] == x['value'] and (f == 0 or seq[f - 1] != x['value'])]
                if hit: errs.append(min((f / FPS - tc for f in hit), key=abs) * 1000)
        for f, v in enumerate(seq):
            t = f / FPS; inside = any(0 <= (t - ln['at'] - L.DELAY) * ln['tempo'] <= cues(ln['id'])[-1]['end'] and L.cues_at(cues(ln['id']), (t - ln['at'] - L.DELAY) * ln['tempo']) != 'X' for ln in own)
            if not inside and v != 'X': bad += 1
        e = np.array(errs); ok = len(e) and np.abs(e).max() <= 60 and bad == 0 and res.max() <= 12
        print(f'  {s["id"]:8s} {who:6s} onsets n={len(e)} max|err| {np.abs(e).max():.0f} ms, open in silence {bad}, pixel max {res.max():.1f}', '' if ok else 'FAIL'); ok or fails.append(s['id'])
print('== CAPTIONS (EN verbatim, -0.1/+0.4 s, <=15 cps; native line under it) + FACES + SAFE ZONE')
x0, y0, w0, h0 = L.WM_CROP; sc = 1080 / w0
FACES = {s['id']: [(s['clip'], os.path.basename(os.path.dirname(p))) for p in glob.glob(MD(s['clip']) + '/*/mouth.json')] for s in tl['shots']}
FACES = {k: [(c, w) for c, w in v if json.load(open(MD(c) + f'/{w}/mouth.json'))['track']['cc_mean'] > 0.6] for k, v in FACES.items()}
VIRAL = tl.get('viral', False); PUNCH = tl.get('punch', {})
def face_hits(o):
    s0 = [q for q in tl['shots'] if q['id'] == o['shot']][0]; hits = []
    shots = [q for q in tl['shots'] if q['t0'] < o['t'][1] - 0.02 and q['t0'] + q['dur'] > o['t'][0] + 0.02] if VIRAL else [s0]   # viral: check every shot the card spans (cards may run across a cut)
    for s in shots:
     for clip, who in FACES.get(s['id'], []):
        m = json.load(open(MD(clip) + f'/{who}/mouth.json')); MS = np.load(MD(clip) + f'/{who}/track.npy'); fx0, fy0, fx1, fy1 = m['face_box']; step = 1 if s['frames'][1] >= s['frames'][0] else -1
        for t in np.arange(max(o['t'][0], s['t0'] if VIRAL else -1), min(o['t'][1], s['t0'] + s['dur'] if VIRAL else 1e9), 0.2):
            fi = int(np.clip(s['frames'][0] + step * int((t - s['t0']) * FPS), 0, len(MS) - 1))
            P = np.array([MS[fi] @ np.array([px, py, 1]) for px in (fx0, fx1) for py in (fy0, fy1)])
            bx = [(P[:, 0].min() - x0) * sc, (P[:, 1].min() - y0) * sc, (P[:, 0].max() - x0) * sc, (P[:, 1].max() - y0) * sc]; b = o['box']
            if s['id'] in PUNCH:   # punch-in 1.0 -> 1.08 about the frame centre
                u = min(1, max(0, (t - s['t0'] - PUNCH[s['id']]) / 0.4)); z = 1 + 0.08 * (1 - (1 - u) ** 2); bx = [540 + (bx[0] - 540) * z, 960 + (bx[1] - 960) * z, 540 + (bx[2] - 540) * z, 960 + (bx[3] - 960) * z]
            if max(0, min(b[2], bx[2]) - max(b[0], bx[0])) * max(0, min(b[3], bx[3]) - max(b[1], bx[1])) > 0: hits.append(who + '@' + s['id']); break
    return hits
SZ = tl['safe']; seen = set()
for o in tl['overlays']:
    b = o['box']; inside = b[0] >= SZ['x0'] and b[2] <= SZ['x1'] and b[1] >= SZ['y0'] and b[3] <= SZ['y1']; fh = face_hits(o)
    if not inside: fails.append('safe:' + o['style']); print('  SAFE-ZONE FAIL', o['style'], o['text'][:30], b)
    if fh: fails.append('face:' + o['style']); print('  FACE FAIL', o['style'], o['text'][:30], fh)
    if o['style'] in ('Sub', 'Karaoke', 'Cap') or (o['style'] in ('Gap', 'Strike') and o.get('line')):   # template captions (Gap/Strike) obey caption rules
        if (o['line'], o['shot']) in seen: continue
        seen.add((o['line'], o['shot'])); parts = [p for p in tl['overlays'] if p['line'] == o['line'] and p['shot'] == o['shot']]
        t0, t1 = min(p['t'][0] for p in parts), max(p['t'][1] for p in parts); en = o['text'].split('||')[0]
        sp = min([x for x in speech if x[2] == o['line']], key=lambda x: abs(x[0] - t0)); d0, d1 = t0 - sp[0], t1 - sp[1]; cps = len(en) / (t1 - t0)
        chained = any((q['style'] in ('Sub', 'Karaoke', 'Cap') or (q['style'] in ('Gap', 'Strike') and q.get('line'))) and abs(q['t'][0] - t1) < 0.01 for q in tl['overlays'])   # page swap into the next caption (gap < 0.5 s closed, Netflix-style)
        ok = en == TEXT[o['line']] and -0.1 <= d0 <= 0.001 and 0 <= d1 <= ((0.62 if VIRAL else 0.55) if chained else 0.401) and cps <= 15
        print(f'  {o["style"]:7s} {en[:32]:32s} | {o["text"].split("||")[1][:30]:30s} start {d0:+.2f} end {d1:+.2f} cps {cps:4.1f}', '' if ok else 'FAIL'); ok or fails.append(en)
    elif o['style'] not in ('Ring',) or o['part'] == 0:
        allowed = o['style'] in ('VHook', 'Series', 'Follow', 'Hook', 'Badge', 'Contrast', 'Tag', 'Choice', 'Ladder', 'Pov', 'Gap', 'Strike', 'Card')   # template cards stay up while the line plays (listen / ladder / POV)   # hook/badge over the opening line; contrast = pattern card (no sentence duplicated)
        conflict = [x[2] for x in speech if min(o['t'][1], x[1]) - max(o['t'][0], x[0]) > 0]
        print(f'  {o["style"]:8s} {o["text"].replace(chr(10), " ")[:44]:44s} {o["t"]} speech during: {conflict or "none"}', 'OK' if (allowed or not conflict) else 'FAIL')
        if conflict and not allowed: fails.append('conflict:' + o['style'])
print('== HOOK (first 2 s) + TEMPLATE RULES (content/video/cine/templates.md)')
HK = tl.get('hook_kind') or 'contrast'; LEGACY = tl.get('hook_kind') is None and not tl.get('viral'); hs = {'contrast': ('Contrast',), 'question': ('VHook', 'Hook', 'Choice', 'Gap', 'Ladder', 'Strike'), 'pov': ('VHook', 'Pov',)}[HK]
# LEGACY = lesson without HOOK_KIND made before the 2 s hook rule (e.g. cafe latte): hook rule reported only
first = min([o['t'][0] for o in tl['overlays'] if o['style'] in hs] or [99]); print(f'  HOOK_KIND={HK}: {"/".join(hs)} at {first:.2f} s', 'OK' if first <= 2.0 else ('WARN (legacy lesson without HOOK_KIND, not counted)' if LEGACY else 'FAIL')); first <= 2.0 or LEGACY or fails.append('hook')
Q = tl.get('qa', {}); TP = Q.get('template'); words = lambda t: re.findall(r"[a-z0-9']+", t.lower())
def rule(ok, msg): print('  ' + msg, 'OK' if ok else 'FAIL'); ok or fails.append('tpl:' + msg[:30])
spk = {ln['id']: ln for s in tl['shots'] for ln in s['lines']}
if TP == 'choose':
    ch = next(o for o in tl['overlays'] if o['style'] == 'Choice'); q, *opts, ans = ch['text'].split('|'); key = Q['choice_key']
    rule(key in words(TEXT[Q['choice_line']]) and key in words(opts['ABC'.index(ans)]), f'answer "{key}" verbatim in the spoken line and in option {ans}')
    rule(not any(o['style'] in ('Sub', 'Karaoke', 'Cap') and o['line'] == Q['choice_line'] and o['t'][0] < min(c['t'][0] for c in tl['overlays'] if c['style'] == 'Choice' and c['part'] == 1) for o in tl['overlays']), 'no caption before the reveal (listening)')
    rule(spk[Q['choice_line']]['dur'] >= 2.0, 'B line >= 2 s')
if TP == 'gap':
    g = json.load(open(f'vis3/{Q["gap_line"]}.json'))['gap']; src = cues(g['src']); c0, c1 = g['cut']
    rule(min(abs(c0 - x['start']) for x in src) <= 0.04, f'gap starts on a Rhubarb cue boundary (+-40 ms): cut {c0:.3f}')
    raw2 = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', f'vis3/{g["src"]}.wav', '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True).stdout
    y = np.frombuffer(raw2, np.int16).astype(float) / 32768; i = int(c1 * 16000); e1 = 20 * np.log10(np.sqrt((y[i - 80:i + 80] ** 2).mean() + 1e-12))
    rule(e1 < -40, f'gap ends in a closure/silence ({e1:.0f} dB) - no leaked consonant'); rule(g['word'] not in ('a', 'an', 'the') and len(g['word'].split()) == 1, f'one content word gapped ("{g["word"]}")')
    rule(sum(1 for x in json.load(open(f'vis3/{Q["gap_line"]}.json'))['mouthCues'] if x['value'] == 'X' and x['end'] - x['start'] >= 0.55) == 1, 'exactly one 0.6 s gap, mouth closed')
if TP == 'ladder':
    oa = [ln for s in tl['shots'] if s['clip'][:3] in ('h04', 'h05') for ln in s['lines']]; rule(all(ln['dur'] <= 1.5 for ln in oa), 'OTS-Ama ladder lines <= 1.5 s (else all on CU)')
    lad = [o for o in tl['overlays'] if o['style'] == 'Ladder']
    for k, lid in enumerate(Q['ladder_lines']):
        o = min([o for o in lad if o['part'] == k + 1], key=lambda o: o['t'][0]); sp = [x for x in speech if x[2] == lid][0]
        rule(o['t'][0] <= sp[0] and o['text'].split('|')[k] == TEXT[lid], f'ladder step {k + 1} verbatim, up before the line')
if TP == 'mistake':
    rv = min(o['t'][0] for o in tl['overlays'] if o['style'] == 'Strike' and o['part'] == 2)
    ctt = tl['scene'] - sum(x['dur'] for x in tl['shots'] if x['id'] in ('recap', 'loop')) if tl.get('viral') else tl['scene']   # viral: recap + loop ending excluded
    rule(rv >= 0.6 * ctt, f'reveal at {rv:.1f} s >= 60 % of the content ({ctt:.1f} s)')
    rule(not any('wrong' in o['text'].lower() for o in tl['overlays'] if o['t'][0] < rv), 'no "wrong" on screen before the reveal')
    a, b = words(TEXT[Q['strike_line']]), words(TEXT[Q['right_line']]); rule(len(a) == len(b) and sum(x != y for x, y in zip(a, b)) == 1, 'exactly one error')
if TP == 'anchor':
    seq = [x['clip'] for x in tl['shots']]; rule(all(a != b for a, b in zip(seq, seq[1:])), 'never the same clip twice in a row')
    rule(any(':' in c for c in seq) and any(':' not in c for c in seq), 'anchors + topic B-roll')
    rule(all(x['dur'] <= 5.0 + 1e-3 for x in tl['shots']), 'angle change at least every 5 s')
if TP == 'pov':
    rule(all(len(words(TEXT[k])) <= 8 for k in Q['answers']), 'model answers <= 8 words'); rule(any(o['style'] == 'Hook' and o['text'].startswith('One possible') for o in tl['overlays']), '"One possible answer" label')
    rs = {o['shot'] for o in tl['overlays'] if o['style'] == 'Ring'}
    rule(all(abs(max(o['t'][1] for o in tl['overlays'] if o['style'] == 'Ring' and o['shot'] == r) - min(o['t'][0] for o in tl['overlays'] if o['style'] == 'Ring' and o['shot'] == r) - 3.0) < 0.1 for r in rs), 'Ring 3 s')
if VIRAL:   # viral-mode rules (docs/CINE-SCENE-STANDARD.md §7, v3 pacing model)
    print('== VIRAL TIMELINE (beats)')
    for s in tl['shots']:
        cards = sorted({o['style'] for o in tl['overlays'] if o['shot'] == s['id'] and o['style'] not in ('Cap',)})
        print(f"  {s['t0']:6.2f}-{s['t0'] + s['dur']:6.2f}  {s['id']:8s} {s['clip'][:3]} {'talk ' + ','.join(l['id'] + ('@%.2fx' % l['tempo'] if l['tempo'] != 1 else '') for l in s['lines']) if s['lines'] else 'hold':38s} {' '.join(cards)}")
    print('== VIRAL RULES')
    nwords = lambda t: len(re.findall(r"[A-Za-z0-9']+", t))
    def disp(o):
        t = o['text'].split('||')[0]
        if o['style'] == 'Choice': t = ' '.join(t.split('|')[:-1])
        elif o['style'] == 'VHook': t = t.split('|')[0]
        elif o['style'] == 'Card': r = t.split('|'); n = len(r) - 1 if o['part'] is None else o['part']; t = r[0] + ' ' + ' '.join(x.split(':', 1)[1] for x in r[1:1 + n])
        else: t = t.replace('|', ' ')
        return t
    hk = [o for o in tl['overlays'] if o['style'] == 'VHook']; hd = hk[0]['t'][1] - hk[0]['t'][0] if hk else 0
    rule(len(hk) == 1 and hk[0]['t'][0] == 0 and 1.6 - 1e-3 <= hd <= 2.0 + 1 / FPS and nwords(disp(hk[0])) <= 7 and hk[0].get('fs', 0) >= 84, f'hook 0-{hd:.2f} s (1.6-2.0), {nwords(disp(hk[0])) if hk else 0} words (<= 7), {hk[0].get("fs") if hk else 0} px (>= 84)')
    av = tl.get('avoid', {}); bad = []
    for o in hk:
        for s in tl['shots']:
            if s['t0'] < o['t'][1] - 0.02 and s['t0'] + s['dur'] > o['t'][0] + 0.02:
                for a in av.get(s['clip'], []):
                    b = o['box']
                    if min(a[2], b[2]) > max(a[0], b[0]) and min(a[3], b[3]) > max(a[1], b[1]): bad.append((s['id'], a))
    rule(not bad, f'hook card clear of character bodies {bad or ""}')
    # reading time: every non-caption text card (chained states merged) >= max(1.2, 0.4 + 0.28 x words); brand chips exempt (Series/Pov/Follow have own rules)
    EX = ('Cap', 'Series', 'Pov', 'Follow'); spans = {}
    for o in sorted(tl['overlays'], key=lambda o: o['t'][0]):
        if o['style'] in EX or (o['style'] in ('Gap', 'Strike') and o.get('line')): continue
        k = (o['style'], o['shot'] if o['style'] == 'Ring' else disp(o)[:40] if o['style'] != 'Ladder' else 'L', o['part'] if o['style'] == 'Strike' else 0)   # Choice reveal = same card, new state
        sp = spans.setdefault(k, [])
        if sp and o['t'][0] - sp[-1][1] < 0.05: sp[-1][1] = max(sp[-1][1], o['t'][1]); sp[-1][2] = o
        else: sp.append([o['t'][0], o['t'][1], o])
    worst = []
    for k, sp in spans.items():
        for a, b, o in sp:
            nw_ = nwords(disp(o))
            if o['style'] == 'Card' and (o['part'] or 0) > 1: r_ = o['text'].split('|'); nw_ = nwords(r_[o['part']].split(':', 1)[1])   # build-up card: reading time of the newly added row
            need = max(1.2, 0.4 + 0.28 * nw_); need = 2.5 if o['style'] == 'Recap' else need
            if b - a < need - 1 / FPS: worst.append(f'{o["style"]} "{disp(o)[:24]}" {b - a:.2f}<{need:.2f}')
    rule(not worst, f'reading time >= max(1.2, 0.4 + 0.28 s/word), recap >= 2.5 s {worst or ""}')
    caps = [o for o in tl['overlays'] if o['style'] == 'Cap']; tcap = [o for o in tl['overlays'] if o['style'] in ('Gap', 'Strike') and o.get('line')]
    rule(all(o['fs'] >= 70 and o['box'][3] - o['box'][1] <= 1.6 * o['fs'] for o in caps), f'Cap captions one line, {min([o["fs"] for o in caps] or [0])} px (>= 70)')
    rule(all(o.get('fs', 0) >= 64 for o in tcap), f'Gap/Strike captions {min([o.get("fs", 0) for o in tcap] or [99])} px (>= 64)')
    rule(not any(o['style'] in ('Sub', 'Karaoke') for o in tl['overlays']) and len(caps) > 0, 'all captions word-by-word (Cap), no static Sub')
    br = []
    for s in tl['shots']:
        if s['id'] == 'recap': lim = 3.0
        else: lim = max(2.5, max([l['dur'] + 0.6 for l in s['lines']] or [0])) + 0.01
        if s['dur'] > lim: rule(False, f'shot {s["id"]} {s["dur"]:.2f} s > {lim:.2f} s (max shot length)')
        for l in s['lines']:
            c = cues(l['id']); nx = [x for x in c if x['value'] != 'X']; gap = s['dur'] - (l['at'] + nx[-1]['end'] / l['tempo'])
            if not 0.33 <= gap <= 0.62: br.append((s['id'], round(gap, 2)))
    rule(True, f'max shot length: holds <= 2.5 s (recap 3.0), talk = whole line + breath (longest {max(s["dur"] for s in tl["shots"]):.2f} s)')
    rule(not br, f'breathing 0.35-0.5 s after every line before the cut {br or ""}')
    lo_, hi_ = (20, 35) if TP == 'anchor' else (18, 24); rule(lo_ <= tl['total'] <= hi_, f'total {tl["total"]:.2f} s ({lo_}-{hi_})')
    rule(tl.get('end', 1) == 0 and not tl['endcard_boxes'] and abs(tl['total'] - tl['scene']) < 1e-3, 'no logo end card')
    rc = [o for o in tl['overlays'] if o['style'] == 'Recap']; rsh = [s for s in tl['shots'] if s['id'] == 'recap']; lp = [s for s in tl['shots'] if s['id'] == 'loop']
    rule(bool(rc and rsh) and rc[0]['t'][1] <= rsh[0]['t0'] + rsh[0]['dur'] - 0.25, f'recap then >= 0.3 s settle before the loop cut')
    fo = [o for o in tl['overlays'] if o['style'] == 'Follow']; rule(len(fo) == 1 and abs(fo[0]['t'][1] - tl['total']) < 0.05 and abs(fo[0]['t'][1] - fo[0]['t'][0] - 1.0) < 0.05, 'Follow chip = last 1.0 s')
    rule(bool(lp) and lp[0]['dur'] >= 1.0 - 1e-3 and lp[0]['clip'] == tl['shots'][0]['clip'] and lp[0]['frames'][1] == tl['shots'][0]['frames'][0], 'loop shot >= 1.0 s, ends on the first frame of the hook shot')
    rule(bool([o for o in tl['overlays'] if o['style'] == 'Series']), 'series chip')
    pops = sorted(b for a, b in tl.get('sfx', []) if a == 'pop.wav'); rule(all(y - x >= 1.9 for x, y in zip(pops, pops[1:])), f'SFX pops on card entrances only, >= 2 s apart ({len(pops)} pops)')
    import cv2
    cv2.setNumThreads(int(TH) if TH != '0' else (os.cpu_count() or 4)); cap = cv2.VideoCapture(V); nfr = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); ok, A = cap.read(); cap.set(cv2.CAP_PROP_POS_FRAMES, nfr - 1); ok2, B = cap.read()
    if not ok2:
        cap.set(cv2.CAP_PROP_POS_FRAMES, nfr - 2); ok2, B = cap.read()
    g = lambda F: cv2.resize(cv2.cvtColor(F, cv2.COLOR_BGR2GRAY), (270, 480)).astype(np.float64)
    def ssim(a, b):
        bl = lambda z: cv2.GaussianBlur(z, (11, 11), 1.5); ma, mb = bl(a), bl(b); va, vb, cab = bl(a * a) - ma ** 2, bl(b * b) - mb ** 2, bl(a * b) - ma * mb; C1, C2 = 6.5025, 58.5225
        return float((((2 * ma * mb + C1) * (2 * cab + C2)) / ((ma ** 2 + mb ** 2 + C1) * (va + vb + C2))).mean())
    sv = ssim(g(A), g(B)); rule(sv > 0.6, f'loop: SSIM first vs last frame {sv:.2f} (> 0.6)')
    rg = [o for o in tl['overlays'] if o['style'] == 'Ring']
    rv = {'choose': [o for o in tl['overlays'] if o['style'] == 'Choice' and o['part'] == 1], 'mistake': [o for o in tl['overlays'] if o['style'] == 'Strike' and o['part'] == 2],
          'pov': [o for o in tl['overlays'] if o['style'] == 'Hook' and o['text'].startswith('One possible')], 'gap': [o for o in tl['overlays'] if o['style'] == 'Gap' and o['part'] == 1],
          'anchor': [o for o in tl['overlays'] if o['style'] == 'Card' and o['text'] in {q['text'] for q in tl['overlays'] if q['style'] == 'Card' and q['shot'] == Q.get('reveal')}]}.get(TP)
    if rv:
        ra, rb = min(o['t'][0] for o in rv), max(o['t'][1] for o in rv); rule(rb - ra >= 1.8 - 1 / FPS, f'reveal held {rb - ra:.2f} s (>= 1.8)')
    if TP in ('choose', 'mistake', 'pov', 'anchor'):
        ring_end = max(o['t'][1] for o in rg if o['shot'] == min(rg, key=lambda q: q['t'][0])['shot']); rs = min(o['t'][0] for o in rg)
        rule(ra >= ring_end - 0.01 and ring_end - rs >= 2.95 and any('Comment' in o['text'] for o in rg), f'comment ring {rs:.2f}-{ring_end:.2f} s (3 s) BEFORE the reveal at {ra:.2f} s')
    if TP == 'choose':
        ch = [o for o in tl['overlays'] if o['style'] == 'Choice']; sp0 = [x for x in speech if x[2] == Q['choice_line']][0][0]
        rule(min(o['t'][0] for o in ch) <= sp0 - 1.5 + 1e-3 and max(o['t'][1] for o in ch if o['part'] == 0) >= ring_end - 0.05, f'options up {sp0 - min(o["t"][0] for o in ch):.2f} s before the audio (>= 1.5) and through the ring')
    slow = [l for s in tl['shots'] for l in s['lines'] if abs(l['tempo'] - 0.85) < 0.01 and s['t0'] >= (ra if rv else 0)]
    rule(bool(slow) and any(o['style'] == 'Cap' and o['line'] == slow[0]['id'] for o in caps), 'reinforce: model line once at 0.85x with karaoke after the reveal')
    ov_ = [o for o in tl['overlays'] if o['style'] in ('Series', 'Follow', 'VHook', 'Pov', 'Recap', 'Ring', 'Choice', 'Ladder', 'Hook', 'Card')]
    clash = [(a['style'], b['style']) for i, a in enumerate(ov_) for b in ov_[i + 1:] if a['style'] != b['style'] and min(a['t'][1], b['t'][1]) - max(a['t'][0], b['t'][0]) > 0.01
             and min(a['box'][2], b['box'][2]) > max(a['box'][0], b['box'][0]) and min(a['box'][3], b['box'][3]) > max(a['box'][1], b['box'][1])]
    rule(not clash, f'cards do not overlap each other {sorted(set(clash)) or ""}')
for b in tl['endcard_boxes']:
    if not (b[0] >= SZ['x0'] and b[2] <= SZ['x1'] and b[1] >= SZ['y0'] and b[3] <= SZ['y1']): fails.append('safe:endcard'); print('  END CARD SAFE FAIL', b)
print('== AUDIO')
a = subprocess.run(['ffmpeg', '-nostdin', '-threads', TH, '-i', V, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
LU = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', a)[-1]); fails += ['loudness'] if abs(LU + 16) > 1 else []
print('  integrated', re.findall(r'I:\s+(-?[\d.]+) LUFS', a)[-1], 'LUFS; first speech at %.2f s (footsteps from 0.12 s)' % speech[0][0])
raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', V, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(float) / 32768; w = 480
db = np.array([20 * np.log10(np.sqrt((x[i:i + w] ** 2).mean() + 1e-12)) for i in range(0, len(x) - w, w)])
first = np.argmax(db > -45) * 0.01; tail = db[int((tl['scene'] - 0.3) * 100):]; loud = [(i, round(tail[i + 1], 1)) for i in range(len(tail) - 1) if tail[i + 1] - tail[i] > 6 and tail[i + 1] > -35]
print(f'  first sound above -45 dBFS at {first:.2f} s;  end card: peak {tail.max():.0f} dBFS, loud transients {loud or "none"}', 'OK' if not loud and first < 0.3 else 'FAIL')
if loud or first >= 0.3: fails.append('audio')
print('  total %.2f s' % tl['total'], 'OK' if tl['total'] <= 40 else 'FAIL')
if tl['total'] > 40: fails.append('total>40s')   # was printed only, never counted
print('== RESULT:', 'ALL PASS' if not fails else f'{len(fails)} FAIL(s): {fails}')
sys.exit(1 if fails else 0)
