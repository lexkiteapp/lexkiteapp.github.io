# QA for news-anchor shorts (copy of tools/qa5.py): run from anchor/news: qa_news.py render_<lesson>
# changes: host transform per shot (xf = scale, src cx, cy -> ox, oy), meta in ../tools, template 'news' (20-28 s, recap replaces the 0.85x repeat, loop ends on hook frame 0)
import json, sys, re, subprocess, glob, os, numpy as np
HOST_TOP = {'gc_': 200, 'ga2': 292, 'gc': 200, 'ga4': 293, 'gc4': 197}   # source px from eye line to hair top (kmask frame 0): Carlos gc_*, standing Ama ga2_*
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lipsync as L   # run from NEWS_DIR: qa_news.py render5_<id>_en
RD = sys.argv[1]; tl = json.load(open(f'{RD}/timeline.json')); TP = tl.get('qa', {}).get('template'); V = os.environ.get('CINE_OUT', os.getcwd() + '/out') + '/' + tl['lesson']['out']
TEXT = {l['id']: l['text'] for l in json.load(open('ci/lines.json'))['lines']}; FPS = 24
LIB = os.environ['CINE_LIB']
MD = lambda c: (f'{LIB}/' + c.replace(':', '/meta/', 1)) if ':' in c else f'{LIB}/anchor/tools/meta/{c}'   # 'bank:clip' B-roll -> that bank's meta
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
                if tc < 2 / FPS: continue   # J-cut: audio that leads the picture has no frame to check
                hit = [f for f in range(max(0, f0 - 3), min(n, f0 + 4)) if seq[f] == x['value'] and (f == 0 or seq[f - 1] != x['value'])]
                if hit: errs.append(min((f / FPS - tc for f in hit), key=abs) * 1000)
        for f, v in enumerate(seq):
            t = f / FPS; inside = any(0 <= (t - ln['at'] - L.DELAY) * ln['tempo'] <= cues(ln['id'])[-1]['end'] and L.cues_at(cues(ln['id']), (t - ln['at'] - L.DELAY) * ln['tempo']) != 'X' for ln in own)
            if not inside and v != 'X': bad += 1
        e = np.array(errs); ok = len(e) and np.abs(e).max() <= 60 and bad == 0 and res.max() <= 12
        print(f'  {s["id"]:8s} {who:6s} onsets n={len(e)} max|err| {(np.abs(e).max() if len(e) else -1):.0f} ms, open in silence {bad}, pixel max {res.max():.1f}', '' if ok else 'FAIL'); ok or fails.append(s['id'])
_drift = []   # owner 23/10: caption word times vs the voice - each word within 80 ms of the ASR word start OR of a mouth-cue onset in the audio
for s in tl['shots']:
    for ln in s['lines']:
        on_ = [s['t0'] + ln['at'] + c['start'] / ln['tempo'] for c in cues(ln['id']) if c['value'] != 'X']
        for w0, _, wa in ln.get('words', []): _drift.append(min([abs(w0 - wa)] + [abs(w0 - t) for t in on_]))
print(f'== VOICE/CAPTION DRIFT: max {max(_drift or [0]) * 1000:.0f} ms over {len(_drift)} words (<= 80)', 'OK' if _drift and max(_drift) <= 0.08 else 'FAIL'); (_drift and max(_drift) <= 0.08) or fails.append('drift')
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
        for t in np.arange(max(o['t'][0], s['t0'] if VIRAL else -1), min(o['t'][1], s['t0'] + s['dur'] if VIRAL else 1e9), 1 / FPS):   # every frame (owner 22/10 no-occlusion)
            fi = int(np.clip(s['frames'][0] + step * int((t - s['t0']) * FPS), 0, len(MS) - 1))
            P = np.array([MS[fi] @ np.array([px, py, 1]) for px in (fx0, fx1) for py in (fy0, fy1)])
            z_, cx_, cy_, ox_, oy_ = s['xfs'][clip]; P = (P - [x0, y0]) * sc; bx = [(P[:, 0].min() - cx_) * z_ + ox_, (P[:, 1].min() - cy_) * z_ + oy_, (P[:, 0].max() - cx_) * z_ + ox_, (P[:, 1].max() - cy_) * z_ + oy_]; b = [o['box'][0] - 24, o['box'][1] - 24, o['box'][2] + 24, o['box'][3] + 24]   # 24 px gap to the face/hair box
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
        ok = en == TEXT[o['line']] and -0.1 <= d0 <= (0.09 if TP == 'news' else 0.001) and 0 <= d1 <= ((0.62 if VIRAL else 0.55) if chained else 0.401) and cps <= 15
        print(f'  {o["style"]:7s} {en[:32]:32s} | {(o["text"].split("||") + [""])[1][:30]:30s} start {d0:+.2f} end {d1:+.2f} cps {cps:4.1f}', '' if ok else 'FAIL'); ok or fails.append(en)
    elif o['style'] not in ('Ring',) or o['part'] == 0:
        allowed = (TP == 'news' and o['style'] in ('Recap', 'Ring', 'Series', 'Name', 'Share', 'Badge')) or o['style'] in ('VHook', 'Series', 'Follow', 'Hook', 'Badge', 'Contrast', 'Tag', 'Choice', 'Ladder', 'Pov', 'Gap', 'Strike', 'Card')   # template cards stay up while the line plays (listen / ladder / POV)   # hook/badge over the opening line; contrast = pattern card (no sentence duplicated)
        conflict = [x[2] for x in speech if min(o['t'][1], x[1]) - max(o['t'][0], x[0]) > 0]
        print(f'  {o["style"]:8s} {o["text"].replace(chr(10), " ")[:44]:44s} {o["t"]} speech during: {conflict or "none"}', 'OK' if (allowed or not conflict) else 'FAIL')
        if conflict and not allowed: fails.append('conflict:' + o['style'])
print('== HOOK (first 2 s) + TEMPLATE RULES (content/video/cine/templates.md)')
HK = tl.get('hook_kind', 'contrast'); hs = {'contrast': ('Contrast',), 'question': ('VHook', 'Hook', 'Choice', 'Gap', 'Ladder', 'Strike'), 'pov': ('VHook', 'Pov',)}[HK]
first = min([o['t'][0] for o in tl['overlays'] if o['style'] in hs] or [99]); print(f'  HOOK_KIND={HK}: {"/".join(hs)} at {first:.2f} s', 'OK' if first <= 2.0 else 'FAIL'); first <= 2.0 or fails.append('hook')
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
    rule(len(hk) == 1 and hk[0]['t'][0] == 0 and 1.6 - 1e-3 <= hd <= 2.0 + 1 / FPS and nwords(disp(hk[0])) <= 7 and hk[0].get('fs', 0) >= 70, f'hook 0-{hd:.2f} s (1.6-2.0), {nwords(disp(hk[0])) if hk else 0} words (<= 7), {hk[0].get("fs") if hk else 0} px (>= 70)')
    av = tl.get('avoid', {}); bad = []
    for o in hk:
        for s in tl['shots']:
            if s['t0'] < o['t'][1] - 0.02 and s['t0'] + s['dur'] > o['t'][0] + 0.02:
                for a in av.get(s['clip'], []):
                    b = o['box']
                    if min(a[2], b[2]) > max(a[0], b[0]) and min(a[3], b[3]) > max(a[1], b[1]): bad.append((s['id'], a))
    rule(not bad, f'hook card clear of character bodies {bad or ""}')
    # reading time: every non-caption text card (chained states merged) >= max(1.2, 0.4 + 0.28 x words); brand chips exempt (Series/Pov/Follow have own rules)
    EX = ('Cap', 'Series', 'Pov', 'Follow', 'Name'); spans = {}
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
    rule(all(o['fs'] >= 60 and o['box'][3] - o['box'][1] <= 2.9 * o['fs'] for o in caps), f'Cap captions <= 2 lines, {min([o["fs"] for o in caps] or [0])} px (>= 60)')
    rule(all(o.get('fs', 0) >= 64 for o in tcap), f'Gap/Strike captions {min([o.get("fs", 0) for o in tcap] or [99])} px (>= 64)')
    rule(not any(o['style'] in ('Sub', 'Karaoke') for o in tl['overlays']) and len(caps) > 0, 'all captions word-by-word (Cap), no static Sub')
    br = []
    for s in tl['shots']:
        if s['id'] == 'recap': lim = max(3.5, max([l['dur'] + 0.6 for l in s['lines']] or [0])) + 0.01
        else: lim = max(2.5, max([l['dur'] + 0.6 for l in s['lines']] or [0])) + 0.01
        if s['dur'] > lim: rule(False, f'shot {s["id"]} {s["dur"]:.2f} s > {lim:.2f} s (max shot length)')
        for l in s['lines']:
            c = cues(l['id']); nx = [x for x in c if x['value'] != 'X']; gap = s['dur'] - (l['at'] + nx[-1]['end'] / l['tempo'])
            if not 0.33 <= gap <= 0.62: br.append((s['id'], round(gap, 2)))
    rule(True, f'max shot length: holds <= 2.5 s (recap 3.0), talk = whole line + breath (longest {max(s["dur"] for s in tl["shots"]):.2f} s)')
    rule(not br, f'breathing 0.35-0.5 s after every line before the cut {br or ""}')
    lo_, hi_ = (20, 35) if TP == 'anchor' else (20, 36) if TP == 'news' else (18, 24)   # news v7: guess + repeat pauses, concept check (owner 22/10); rule(lo_ <= tl['total'] <= hi_, f'total {tl["total"]:.2f} s ({lo_}-{hi_})')
    rule(tl.get('end', 1) == 0 and not tl['endcard_boxes'] and abs(tl['total'] - tl['scene']) < 1e-3, 'no logo end card')
    rc = [o for o in tl['overlays'] if o['style'] == 'Recap']; rsh = [s for s in tl['shots'] if s['id'] == 'recap']; lp = [s for s in tl['shots'] if s['id'] == 'loop']
    rule(bool(rc and rsh and lp) and rc[0]['t'][1] <= lp[0]['t0'] - 0.25, f'recap card ends >= 0.25 s before the loop cut')
    fo = [o for o in tl['overlays'] if o['style'] == 'Follow']; rule(len(fo) == 1 and abs(fo[0]['t'][1] - tl['total']) < 0.05 and abs(fo[0]['t'][1] - fo[0]['t'][0] - 1.0) < 0.05, 'Follow chip = last 1.0 s')
    rule(bool(lp) and lp[0]['dur'] >= 1.0 - 1e-3 and lp[0]['clip'] == tl['shots'][0]['clip'] and ((lp[0]['frames'][-1] + 1 == tl['shots'][0]['frames'][0]) if TP == 'news' else lp[0]['frames'][1] == tl['shots'][0]['frames'][0]), 'loop shot >= 1.0 s, ends on the first frame of the hook shot')
    rule(bool([o for o in tl['overlays'] if o['style'] == 'Series']), 'series chip')
    pops = sorted(b for a, b in tl.get('sfx', []) if a == 'pop.wav'); rule(all(y - x >= 1.9 for x, y in zip(pops, pops[1:])), f'SFX pops on card entrances only, >= 2 s apart ({len(pops)} pops)')
    import cv2
    cv2.setNumThreads(2); cap = cv2.VideoCapture(V); nfr = int(cap.get(cv2.CAP_PROP_FRAME_COUNT)); ok, A = cap.read(); cap.set(cv2.CAP_PROP_POS_FRAMES, nfr - 1); ok2, B = cap.read()
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
    rule(TP == 'news' or bool(slow) and any(o['style'] == 'Cap' and o['line'] == slow[0]['id'] for o in caps), 'reinforce: model line once at 0.85x with karaoke after the reveal')
    ov_ = [o for o in tl['overlays'] if o['style'] in ('Series', 'Follow', 'VHook', 'Pov', 'Recap', 'Ring', 'Choice', 'Ladder', 'Hook', 'Card')]
    clash = [(a['style'], b['style']) for i, a in enumerate(ov_) for b in ov_[i + 1:] if a['style'] != b['style'] and min(a['t'][1], b['t'][1]) - max(a['t'][0], b['t'][0]) > 0.01
             and min(a['box'][2], b['box'][2]) > max(a['box'][0], b['box'][0]) and min(a['box'][3], b['box'][3]) > max(a['box'][1], b['box'][1])]
    rule(not clash, f'cards do not overlap each other {sorted(set(clash)) or ""}')
if TP == 'news':
    print('== NEWS RULES (framing, word sync, luma)')
    sh_ = tl['shots']; sing = lambda x: x['angle'] != 'two'
    rule(all((x['xfs'][x['clip']][3] < 540) == (x['who'] == 'ama') for x in sh_ if sing(x)) and all(x['xfs'][c][3] < 540 for x in sh_ if not sing(x) for c in x['xfs'] if c.startswith('ga')), '180-degree rule: Ama screen-left, Carlos screen-right in every shot')
    jc = [(a['id'], b['id']) for a, b in zip(sh_, sh_[1:]) if a['angle'] == b['angle'] and a['frame'] == b['frame']]; rule(not jc, f'no jump cut (same angle + same size back to back) {jc or ""}')
    run_ = max(len(g) for g in re.findall(r'(a+|c+)', ''.join('a' if x['angle'] == 'ama' else 'c' if x['angle'] == 'carlos' else '-' for x in sh_)) or ['']); rule(run_ <= 2, f'<= 2 consecutive singles of the same host (max {run_})')
    tw2 = [k for k, x in enumerate(sh_) if x['angle'] == 'two']
    rule(sh_[0]['angle'] != 'two' and 'hook' in tl.get('punch', {}) and all(k in (0, 1, len(sh_) - 2, len(sh_) - 1) and sh_[k]['dur'] <= 2.0 + 1e-3 for k in tw2), f'coverage: punch-in single opens, two-shot only as intro/outro <= 2 s ({len(tw2)} two-shots)')
    bl_ = [(x['id'], round(x['dur'], 2)) for x in sh_ if x['id'] != 'loop' and not (1.5 - 1e-3 <= x['dur'] <= max([3.5] + [l['dur'] + 0.6 for l in x['lines']]) + 1e-3)]   # one spoken line is never cut: a longer line may run past 3.5 s; rule(not bl_, f'shot length 1.5-3.5 s (loop excepted) {bl_ or ""}')
    SZ_ = dict(x0=0, x1=1080 * 0.86, y0=1920 * 0.12, y1=1920 * 0.78); out_ = [(o['style'], o['box']) for o in tl['overlays'] if o['box'][0] < SZ_['x0'] or o['box'][2] > SZ_['x1'] + 0.5 or o['box'][1] < SZ_['y0'] - 0.5 or o['box'][3] > SZ_['y1'] + 0.5]
    rule(not out_, f'platform UI safe zones: no text in top 12 % / bottom 22 % / right 14 % {out_[:4] or ""}')
    FW_ = set("a an the to of in on at for from by with and or but so is are was were be been am do does did have has had will would can could should may might must my your his her its our their this that these those than as if".split())
    chs_ = {}
    for o in tl['overlays']:
        if o['style'] == 'Cap' and o.get('chunk'): c_ = chs_.setdefault((o['line'], o['shot'], o['chunk'][0]), [o['t'][0], o['t'][1], o['chunk'][1], o['chunk'][2]]); c_[0] = min(c_[0], o['t'][0]); c_[1] = max(c_[1], o['t'][1])
    cb_ = [(v[2][-24:], round(v[1] - v[0], 2)) for v in chs_.values() if v[1] - v[0] < 0.8 - 1e-3 or (re.sub(r"[^a-z']", '', v[2].split()[-1].lower()) in FW_ and not re.search(r'[,.;:!?]$', v[2]))]
    rule(bool(chs_) and not cb_ and all(v[3] <= 2 for v in chs_.values()), f'caption chunks: <= 2 lines, >= 0.8 s, never end on a function word ({len(chs_)} chunks) {cb_[:4] or ""}')
    sp2 = sorted((a_, b_) for a_, b_, *_ in speech); rp_ids = {k for k, _ in tl.get('qa', {}).get('repeat', [])}
    rp_t = [(x['t0'] - 0.5, x['t0'] + x['dur'] + 0.5) for x in sh_ if x['id'] in rp_ids]
    da_ = [(round(b0, 2), round(a1 - b0, 2)) for (a0, b0), (a1, b1) in zip(sp2, sp2[1:]) if a1 - b0 > 0.4 + 1e-3 and not any(r0 <= b0 and a1 <= r1 for r0, r1 in rp_t)]
    rule(not da_, f'no dead air > 0.4 s between lines (repeat-after-me pauses excepted) {da_[:4] or ""}')
    eq_ = json.load(open(f'{RD}/qc.json')).get('edge', []); _esc = {x['id']: max(1.0, x['xfs'][x['clip']][0]) for x in tl['shots']}; eq_ok_ = lambda e: e['soft'] >= 0.6 and 1.3 <= e['width'] <= 4.5 * _esc.get(e['shot'], 1.0) and e['dark'] <= 0.08   # a 3 px source ramp is 3.9 px at 1.3x
    rule(bool(eq_) and all(eq_ok_(e) for e in eq_), f"matte edges (MR.edge_qa per shot: soft >= 0.6, ramp 1.3-4.5 px, dark rim <= 8 %) {[(e['shot'], e['soft'], e['width'], e['dark']) for e in eq_ if not eq_ok_(e)][:4] or 'OK'}")
    mid = [(x['id'], round(w0, 2)) for i, x in enumerate(sh_[:-1]) for ln in x['lines'] for w0, w1, _ in ln['words'] if w0 < sh_[i + 1]['t0'] - 1e-3 < w1 - 0.02]
    rule(not mid, f'no cut inside a word of the outgoing speaker {mid or ""}')
    fh = [v for x in sh_ if not x.get('other') for v in x['faceh'].values()]; _fhs = {}
    for x in sh_:
        if not x.get('other'):
            for v in x['faceh'].values(): _fhs.setdefault(x['frame'], []).append(v)
    rule(all(max(v) / min(v) <= 1.05 + 1e-6 for v in _fhs.values()) and all(max(x['faceh'].values()) / min(x['faceh'].values()) <= 1.05 for x in sh_), f'face height equal between hosts within 5 % per shot size {dict((k, (min(v), max(v))) for k, v in _fhs.items())}')
    rule(all(v <= x.get('lowlim', {}).get(w, {'ama': 1660, 'carlos': 1560}[w]) for x in sh_ for w, v in x['lowsrc'].items()), 'no seat / lap in frame (bottom edge cuts the upper body)')
    OVL = [o for o in tl['overlays']]; gap_ = []
    for i_, a_ in enumerate(OVL):
        for b_ in OVL[i_ + 1:]:
            if a_['style'] == b_['style'] == 'Cap' or min(a_['t'][1], b_['t'][1]) - max(a_['t'][0], b_['t'][0]) <= 0.01: continue
            A_, B_ = a_['box'], b_['box']
            if min(A_[2], B_[2]) + 24 > max(A_[0], B_[0]) and min(A_[3], B_[3]) + 24 > max(A_[1], B_[1]): gap_.append((a_['style'], b_['style']))
    rule(not gap_, f'no two on-screen elements closer than 24 px (captions, cards, lower third, ring, hook) {sorted(set(gap_)) or ""}')
    tw_ = [x for x in tl['shots'] if x.get('other')]; hh_ = [v / 1920 for x in tw_ for v in x.get('faceh', {}).values()]
    rule(not tw_ or all(0.125 <= v <= 0.155 for v in hh_) and all(abs(v - hh_[0]) < 0.01 for v in hh_), f'two-shot = medium-wide: face height {min(hh_ or [0]):.3f}-{max(hh_ or [0]):.3f} of frame (0.125-0.155), equal for both hosts')
    qc_ = json.load(open(f'{RD}/qc.json')); rule(not tw_ or qc_.get('two_gap_min', -1) >= 43, f"two-shot: visible gap between the hosts (min {qc_.get('two_gap_min', -1)} px >= 4 % width)")
    sg_ = [(x['id'], v / 1920) for x in tl['shots'] if not x.get('other') for v in x.get('faceh', {}).values()]
    pass   # face size per shot type is checked in COMPOSITION (MCU 17-19 %, MS 13-15 %)
    rule(all(min(v[4] - ((149 if 'q34' in c else HOST_TOP.get(c[:3], 200)) * v[0]) for c, v in x['xfs'].items()) >= 0.10 * 1920 for x in tl['shots'] if not x.get('other')), 'singles headroom >= 10 %')
    rule(all((x['xfs'][x['clip']][3] <= 400) if x['who'] == 'ama' else (x['xfs'][x['clip']][3] >= 680) for x in tl['shots'] if not x.get('other')), 'singles on the thirds (Ama x <= 400, Carlos x >= 680)')
    rule(all(min(v[4] - ((149 if 'q34' in c else HOST_TOP.get(c[:3], 200)) * v[0]) for c, v in x['xfs'].items()) >= 0.08 * 1920 for x in tw_), 'two-shot headroom >= 8 %')
    qc = json.load(open(f'{RD}/qc.json')); rule(qc['bottom_min'] > 0.9, f"host body continues below the frame bottom on every frame (min alpha {qc['bottom_min']:.2f})")
    rule(qc['fringe_max'] <= 0.025, f"edge green fringe max {qc['fringe_max']:.3f} (<= 0.025), edge flicker mean {qc['flicker_mean']:.3f}")
    errs, xerr = [], []
    for s_ in tl['shots']:
        for ln in s_['lines']:
            caps_ = sorted([o for o in tl['overlays'] if o['style'] == 'Cap' and o['line'] == ln['id'] and o['shot'] == s_['id']], key=lambda o: o['part'])
            for o in caps_[1:]: errs.append(abs(o['t'][0] - ln['words'][o['part']][0]) * 1000)
            on = [s_['t0'] + ln['at'] + x['start'] / ln['tempo'] for x in cues(ln['id']) if x['value'] != 'X']
            for w0, _, wa in ln['words']: xerr.append(min([abs(w0 - wa)] + [abs(w0 - t) for t in on]) * 1000)   # on the audio word start (whisper) or on a Rhubarb mouth onset
    rule(max(errs) <= 60, f'karaoke word highlight vs word timings: max {max(errs):.0f} ms (<= 60)')
    rule(max(xerr) <= 60, f'highlight onsets vs audio word / Rhubarb onset: max {max(xerr):.0f} ms (<= 60)')
    raw_ = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-threads', '2', '-i', V, '-vf', 'scale=54:96', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    Y = np.frombuffer(raw_, np.uint8).reshape(-1, 96, 54).mean((1, 2)); cuts = {int(round(x['t0'] * FPS)) for x in tl['shots']}
    jumps = [(i, round(abs(Y[i] - Y[i - 1]) / Y[i - 1] * 100, 1)) for i in range(1, len(Y)) if i not in cuts and abs(Y[i] - Y[i - 1]) / Y[i - 1] > 0.18]
    blk_ = [round(i / FPS, 2) for i, y in enumerate(Y) if y / 255 < 0.03]; rule(not blk_, f'no black frame (frame mean luma >= 0.03 on every frame) {blk_[:5] or ""}')
    rule(not jumps, f'no luma jump > 18 % between neighbours except hard cuts {jumps[:5] or ""} (max {max(abs(Y[i] - Y[i - 1]) / Y[i - 1] * 100 for i in range(1, len(Y)) if i not in cuts):.1f} %)')
    sm = np.zeros(len(Y))
    for x in tl['shots']: i0 = int(round(x['t0'] * FPS)); sm[i0:i0 + x['n']] = Y[i0:i0 + x['n']].mean()
    rule((Y <= sm * 1.25).all(), f'no frame brighter than its scene (shot) mean +25 % (max {(Y / sm).max() * 100 - 100:+.1f} %)')
    from PIL import Image as _I, ImageDraw as _D
    pl = _I.new('RGB', (1200, 300), 'white'); dr = _D.Draw(pl); lo, hi = Y.min() - 5, Y.max() + 5
    for c in cuts: dr.line([(c * 1200 / len(Y), 0), (c * 1200 / len(Y), 300)], fill=(220, 220, 220))
    dr.line([(i * 1200 / len(Y), 290 - (y - lo) / (hi - lo) * 280) for i, y in enumerate(Y)], fill=(229, 80, 47), width=2)
    dr.line([(0, 290 - (Y.mean() * 1.25 - lo) / (hi - lo) * 280), (1200, 290 - (Y.mean() * 1.25 - lo) / (hi - lo) * 280)], fill=(15, 61, 62))
    pl.save(V.replace('.mp4', '-luma.png')); print('  luma plot', V.replace('.mp4', '-luma.png'))
for b in tl['endcard_boxes']:
    if not (b[0] >= SZ['x0'] and b[2] <= SZ['x1'] and b[1] >= SZ['y0'] and b[3] <= SZ['y1']): fails.append('safe:endcard'); print('  END CARD SAFE FAIL', b)
if TP == 'news':   # owner 22/10: teacher persona
    print('== TEACHER PERSONA')
    # name lower-thirds removed (owner 22/10)
    rt_ = [o['text'].split('|')[0] for o in tl['overlays'] if o['style'] == 'Recap']; print(f'  recap label {rt_}', 'OK' if rt_ and all(x.upper() == "TEACHER'S TIP" for x in rt_) else 'FAIL')
    if not (rt_ and all(x.upper() == "TEACHER'S TIP" for x in rt_)): fails.append('teacher-tip')
    rp_ = tl['lesson'].get('qa', {}).get('repeat', []) if isinstance(tl['lesson'].get('qa'), dict) else tl.get('qa', {}).get('repeat', [])
    print(f'  repeat-after-me pauses {rp_} (>= 1.5 s)', 'OK' if all(d >= 1.5 for _, d in rp_) else 'FAIL'); all(d >= 1.5 for _, d in rp_) or fails.append('repeat-pause')
print('== PEDAGOGY / GRADED ENGLISH (owner 22/10, VIDEO-SCALE-PLAN §12-14)')
_lid = tl['lesson']['id']; _sp = json.load(open(f'lessons/{_lid}.json')) if os.path.exists(f'lessons/{_lid}.json') else {}
if _sp.get('v') == 7:
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import script_rules as _SR
    _ri = _SR.check(_sp, {l['id']: l for l in json.load(open('ci/lines.json'))['lines']}); rule(not _ri, f'script rules (one idea, wrong->right + why <= 12 words, guess before reveal, repeat slow + natural, key line 3x, concept check, <= B1 explanations, <= 12-word sentences, badge, hook type, share, quiz, tip) {_ri[:3] or ""}')
    JG_ = tl.get('qa', {}).get('judge'); _NA = lambda X: not X or X.get('ok') is None or (X.get('error') and not X.get('answers') and not X.get('judge'))   # provider gave no answer (quota) = skip, never reject
    (print('  AI script judge: no answer (quota) -> SKIP here; qc_gate scores it') if _NA(JG_) else None); _NA(JG_) or rule(JG_.get('ok') is True, f"AI script judge: {(JG_ or {}).get('provider')} {((JG_ or {}).get('judge') or {}).get('issues') or (JG_ or {}).get('error') or 'missing'}")
_SG = tl.get('qa', {}).get('signature'); _SF = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../content/video/cine/news/signatures.json')
_hist = [x for x in (json.load(open(_SF)) if os.path.exists(_SF) else []) if x.get('id') != tl['lesson']['id']][-30:]
rule(bool(_SG) and _SG not in [x['sig'] for x in _hist], f"edit signature {_SG} differs from the last {len(_hist)} published clips (§15)")
print('== COMPOSITION / NO-OCCLUSION (owner 22/10)')
_sg = [x for x in tl['shots'] if not x.get('other')]
_ey = [(x['id'], round(x['xfs'][x['clip']][4] / 1920, 3)) for x in _sg]; rule(all(0.28 <= v <= 0.39 for _, v in _ey), f'eye line near the upper third (28-39 %; face size and no-occlusion take priority) {[e for e in _ey if not 0.28 <= e[1] <= 0.39][:4] or ""}')
_top = {}
for x in [y for y in _sg if y['id'] not in ('hook', 'loop')]:   # title shot keeps Ama lower for the hook card
    v = x['xfs'][x['clip']]; _top.setdefault(x['frame'], {}).setdefault(x['who'], []).append(v[4] - (149 if 'q34' in x['clip'] else HOST_TOP.get(x['clip'][:3], 200)) * v[0])
_td = [(f_, round(abs(np.mean(d['ama']) - np.mean(d['carlos'])) / 1920, 3)) for f_, d in _top.items() if 'ama' in d and 'carlos' in d]
rule(all(v <= (0.02 if f_ == 'mcu' else 0.035) for f_, v in _td), f'head-top line equal for both hosts (MCU +-2 %, MS +-3.5 %: bottom anchor may push a host down) {_td}')
_fs = [(x['id'], x['frame'], round(x['faceh'][x['who']] / 1920, 3)) for x in _sg]; _fsb = [e for e in _fs if not ((0.165 <= e[2] <= 0.195) if e[1] == 'mcu' else (0.13 <= e[2] <= 0.16))]
rule(not _fsb, f'face size per shot type (MCU 17-19 %, MS 13-15 %) {_fsb[:4] or ""}')
_hr = [round((x['xfs'][x['clip']][4] - (149 if 'q34' in x['clip'] else HOST_TOP.get(x['clip'][:3], 200)) * x['xfs'][x['clip']][0]) / 1920, 3) for x in _sg]; print(f'  headroom (owner spec 10-14 %; with the eye on the upper third and 18 % faces it lands at {min(_hr):.3f}-{max(_hr):.3f})')
rule(all((x['xfs'][x['clip']][3] < 540) == (x['who'] == 'ama') for x in _sg), 'look-room: Ama on the left third (room to the right), Carlos on the right third (room to the left)')
_kx = [(x['id'], round(x['xfs'][x['clip']][0] / x.get('kx', {}).get(x['clip'], 1), 3)) for x in _sg]; rule(all(v <= 1.0 + 1e-3 for _, v in _kx), f'no host layer above 1.0x of its source (x2 SR layers) max {max(v for _, v in _kx)}')
_chs = {}
for o in tl['overlays']:
    if o['style'] == 'Cap' and o.get('chunk'): c_ = _chs.setdefault((o['line'], o['chunk'][0]), [9e9, 0]); c_[0] = min(c_[0], o['t'][0]); c_[1] = max(c_[1], o['t'][1])
_cuts = [x['t0'] for x in tl['shots'][1:]]; _span = [k for k, (a0, a1) in _chs.items() if any(a0 + 1e-3 < c < a1 - 0.05 for c in _cuts)]
print(f'  caption chunks spanning a cut: {len(_span)} (J/L-cut tails may hold 0.05 s)')
_sp_t = _on = 0.0
for x in tl['shots']:
    for ln in x['lines']:
        a0 = x['t0'] + ln['at']; a1 = a0 + ln['dur']; _sp_t += a1 - a0
        for y in tl['shots']:
            if y['who'] == x['who'] and not y.get('other'): _on += max(0, min(a1, y['t0'] + y['dur']) - max(a0, y['t0']))
rule(_sp_t and _on / _sp_t >= 0.9, f'speaker on screen {(_on / _sp_t if _sp_t else 0) * 100:.1f} % of speech time (>= 90 %)')
# per-frame overlap report: overlay x overlay (gap >= 16 px), overlay x hands (skin blobs inside the matte, every 2nd frame), overlay x face (tracked face box)
_Hb = json.load(open(f'{RD}/qc.json')).get('hands', {}); _ov = [o for o in tl['overlays'] if o['style'] != 'Cap' or True]; _pf = dict(frames=0, overlay_pairs=0, overlay_hands=0)
def _hit(A, B, g=0): return min(A[2], B[2]) + g > max(A[0], B[0]) and min(A[3], B[3]) + g > max(A[1], B[1])
_nf = int(round(tl['total'] * FPS))
for fi_ in range(_nf):
    t_ = fi_ / FPS; vis_ = [o for o in _ov if o['t'][0] - 1e-6 <= t_ < o['t'][1] - 1e-6]; _pf['frames'] += 1
    for a_ in range(len(vis_)):
        for b_ in range(a_ + 1, len(vis_)):
            if not (vis_[a_]['style'] == vis_[b_]['style'] == 'Cap') and _hit(vis_[a_]['box'], vis_[b_]['box'], 16): _pf['overlay_pairs'] += 1
    for hb in _Hb.get(str(fi_), []):
        if any(_hit(o['box'], hb) for o in vis_): _pf['overlay_hands'] += 1
rule(_pf['overlay_pairs'] == 0 and _pf['overlay_hands'] == 0, f"per-frame no-occlusion: {_pf} (overlay x face is the FACE check above)")
json.dump(_pf, open(f'{RD}/overlap_report.json', 'w'))
print('== SCENE CONTINUITY (owner 22/10)')
_b4 = str(tl['shots'][0]['bg']).split('@')[0]; _W4 = f'{LIB}/anchor/bg/w4'   # owner 23/10: one shared room (bg-v4 plate), overlap, sharp bg, pans, eyeline
if '@' in str(tl['shots'][0]['bg']):
    _v4 = json.load(open(f'{_W4}/{_b4}.v4.json')) if os.path.exists(f'{_W4}/{_b4}.v4.json') else None
    rule(bool(_v4), f'bg-v4 plate in use (anime_6B SR, shared plate) for {_b4}')
    if _v4:
        _cl, _cr = _v4['crop']['L'], _v4['crop']['R']; _ov = (_cl[0] + _cl[2] - _cr[0]) / _cl[2]
        rule(_ov >= 0.2 and _v4['anchor']['edge_density'] >= 0.005, f"L/R crops overlap {_ov * 100:.0f} % (>= 20 %), shared strip edge density {_v4['anchor']['edge_density']} (>= 0.005: same objects in both shots)")
        _ac = [(sd, v.get('acu_v3'), v['acu_v4']) for sd, v in _v4['sides'].items()]; _amin = float(os.environ.get('BG_ACU_MIN', '0'))
        rule(all(a4 >= max(_amin, (a3 or 0) * 0.98) for _, a3, a4 in _ac), f'bg edge acutance v3 -> v4 {_ac} (v4 >= v3, >= {_amin})')
    _pn = tl.get('qa', {}).get('pans') or []; rule(bool(_pn) or not _v4, f'establishing / key-change pans across the shared plate: {_pn}')
_GB = {c['id']: c for c in json.load(open(f'{LIB}/anchor/green/bank_gestures.json')).get('clips', [])} if os.path.exists(f'{LIB}/anchor/green/bank_gestures.json') else {}
_yaw = {}
for x in tl['shots']:
    c_ = _GB.get(x['clip'])
    if c_ and c_.get('face_box') and (c_.get('track') or {}).get('mouth_x'):
        fb_ = c_['face_box']; _yaw[x['clip']] = round((sum(c_['track']['mouth_x']) / 2 - (fb_[0] + fb_[2]) / 2) / (fb_[2] - fb_[0]), 3)   # + = features toward screen right
_away = [(c, v) for c, v in _yaw.items() if (c.startswith('ga') and v < -0.05) or (not c.startswith('ga') and v > 0.05)]
rule(not _away, f'eyeline / 180 deg: Ama (left) never turned screen-left, Carlos (right) never screen-right (yaw proxy {_yaw})')
_bgs = {x['bg'].split('@')[0] for x in tl['shots']}; rule(len(_bgs) == 1, f'one location per clip (wide scene: Ama crop L / Carlos crop R): {sorted(_bgs)}')
_win = {}
for x in tl['shots']:
    if x.get('window'): _win.setdefault((x['angle'], x['bg']), []).append(x['window'])
_wbad = [a for a, v in _win.items() if max(w['tx'] for w in v) - min(w['tx'] for w in v) > 0.05 * 1080 or max(w['z'] for w in v) / min(w['z'] for w in v) > 1.05]
rule(bool(_win) and not _wbad, f'each host keeps one crop window (tx +-5 % width, zoom +-5 %) {_wbad or ""}')
def _lab(bgr): import cv2 as c_; return c_.cvtColor(np.uint8([[np.clip(bgr, 0, 255)]]), c_.COLOR_BGR2LAB)[0, 0].astype(float) * [100 / 255, 1, 1] - [0, 128, 128]
_bc = json.load(open(f'{RD}/qc.json')).get('bg_colour', []); _de = max([float(np.linalg.norm(_lab(a['bgr']) - _lab(b['bgr']))) for a in _bc for b in _bc] or [99])
rule(bool(_bc) and _de <= 8, f'matching bg colour / exposure across shots: max dE {_de:.1f} (<= 8; left vs right crops graded to one Lab reference)')
_oft = {}
for x in tl['shots']:
    for w_, o_ in (x.get('outfit') or {}).items(): _oft.setdefault(w_, set()).add(o_)
rule(bool(_oft) and all(len(v) == 1 for v in _oft.values()), f'one outfit per host in this clip {dict((k, sorted(v)) for k, v in _oft.items())}')
print('== SCENE LOGIC (owner 22/10, VIDEO-SCALE-PLAN §11)')
PL_ = tl.get('qa', {}).get('placement') or {}; VS_ = tl.get('qa', {}).get('vision')
rule(bool(PL_.get('zones')) and PL_.get('valid', False), f"background {PL_.get('bg')} annotated (bg_zones.py) with a standable floor zone")
rule(PL_.get('eye_dev', 999) <= 180, f"host eye line vs bg horizon {PL_.get('eye_dev')} px (<= 180: eyes on the upper third, camera slightly above eye level; camera tilt {PL_.get('cam_ty')} px)")
rule(bool(PL_.get('hosts')) and all(v['under'] <= 0.35 for v in PL_['hosts'].values()), f"no table / seat / bed / water under or behind a torso {[(k, v['under']) for k, v in (PL_.get('hosts') or {}).items()]}")
rule(bool(PL_.get('hosts')) and all(v['near'] <= 0.12 for v in PL_['hosts'].values()), f"host never covers a nearer foreground object {[(k, v['near']) for k, v in (PL_.get('hosts') or {}).items()]}")
_NA = lambda X: not X or X.get('ok') is None or (X.get('error') and not X.get('answers') and not X.get('judge'))
(print('  AI vision gate: no answer (quota) -> SKIP here; qc_gate scores it') if _NA(VS_) else None); _NA(VS_) or rule(VS_.get('ok') is True, f"AI vision gate (3 frames): {(VS_ or {}).get('provider')} {(VS_ or {}).get('answers') or 'missing'}")
print('== LOOK (owner 22/10: real-camera exposure, no flat band)')
_rw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-threads', '2', '-i', V, '-vf', 'fps=2,scale=270:480', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
_F = np.frombuffer(_rw, np.uint8).reshape(-1, 480, 270, 3).astype(np.float32) / 255; _Y = _F @ np.array([0.299, 0.587, 0.114], np.float32)
_mean = float(_Y.mean()); _p5 = float(np.percentile(_Y, 5)); _band = float(min(_Y[k, 408:].std() for k in range(len(_Y))))
print(f'  mean luma {_mean:.3f} (0.42-0.55; night/dusk bg 0.38), p5 {_p5:.3f} (>= 0.06), bottom-15 % luma std min {_band:.3f} (> 0.03 = no flat band)')
_lo = 0.38 if re.search(r'night|dusk', str(tl['lesson'].get('bg', ''))) else 0.42   # night/dusk scenes: dark sky by design
if not _lo <= _mean <= 0.55: fails.append('luma-mean')
if _p5 < 0.06: fails.append('luma-p5')
if _band <= 0.03: fails.append('flat-band')
import cv2 as _cv; _sk = []
for x in tl['shots']:
    if x.get('other') or not x.get('faceboxes'): continue
    k = int((x['t0'] + x['dur'] / 2) * 2); b = [v / 4 for v in x['faceboxes'][0]]
    if k >= len(_F): continue
    cx, cy, w_, h_ = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2 + (b[3] - b[1]) * 0.12, (b[2] - b[0]) * 0.18, (b[3] - b[1]) * 0.08
    pt = _F[k, int(cy - h_):int(cy + h_), int(cx - w_):int(cx + w_)]
    if pt.size: hsv = _cv.cvtColor((pt * 255).astype(np.uint8), _cv.COLOR_RGB2HSV).reshape(-1, 3); _sk.append((x['id'], int(np.median(hsv[:, 0])), int(np.median(hsv[:, 1]))))
_bad = [z for z in _sk if not (3 <= z[1] <= 22 and z[2] >= 50)]
_fw = {}   # face size MEASURED on rendered frames (owner/lead 22/10): widest skin run through the face centre in the eye->mouth band (eyes/brows filled), front-facing clips
for x in tl['shots']:
    if x.get('other') or 'q34' in x['clip']: continue
    sc_, ex_, sy_, ox_, oy_ = x['xfs'][x['clip']][:5]; em_ = (130 if x['clip'].startswith('ga') else 106) * sc_ / 4; vals_ = []
    for u_ in (0.3, 0.5, 0.7):
        k_ = int((x['t0'] + x['dur'] * u_) * 2)
        if k_ >= len(_F): continue
        lab_ = _cv.cvtColor((_F[k_] * 255).astype(np.uint8), _cv.COLOR_RGB2LAB).astype(np.float32); cy0_ = int(oy_ / 4 + em_ * 0.35); cx0_ = int(ox_ / 4); dq_ = int(x['faceh'][x['who']] * 0.28 / 4)   # owner 23/10: skin = colour of THIS host's cheeks (left + right, under the eyes, above a moustache)
        ref_ = np.median(np.concatenate([lab_[cy0_ - 2:cy0_ + 3, cx0_ - dq_ - 2:cx0_ - dq_ + 3].reshape(-1, 3), lab_[cy0_ - 2:cy0_ + 3, cx0_ + dq_ - 2:cx0_ + dq_ + 3].reshape(-1, 3)]), 0)   # (fixed hue band missed Ama's dark skin -> 0.63)
        m_ = (np.linalg.norm(lab_ - ref_, axis=2) < 24).astype(np.uint8)
        m_ = _cv.morphologyEx(m_, _cv.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0; best_ = 0
        for r_ in range(int(oy_ / 4), int(oy_ / 4 + em_)):
            row_ = m_[r_]; c_ = int(ox_ / 4)
            if not row_[c_]: continue
            l_, rr_ = c_, c_
            while l_ > 0 and row_[l_ - 1]: l_ -= 1
            while rr_ < 269 and row_[rr_ + 1]: rr_ += 1
            best_ = max(best_, rr_ - l_)
        if best_: vals_.append(best_ * 4)
    if vals_: _fw.setdefault(('all', x['who']), []).append(float(np.median(vals_)) / max(1.0, x['faceh'][x['who']])); print(f"    face {x['id']} {x['who']} {x['frame']} {float(np.median(vals_)):.0f}px / {x['faceh'][x['who']]}")
_fr = {'all sizes (measured / expected)': round(np.median(_fw[('all', 'ama')]) / np.median(_fw[('all', 'carlos')]), 3)} if ('all', 'ama') in _fw and ('all', 'carlos') in _fw else {}
print(f'  measured face width Ama / Carlos per shot size (rendered frames, +-5 %): {_fr}', 'OK' if _fr and all(abs(v - 1) <= 0.05 for v in _fr.values()) else 'FAIL')
if not _fr or any(abs(v - 1) > 0.05 for v in _fr.values()): fails.append('face-size')
print(f'  skin hue (OpenCV H 3-22, S >= 50) at the cheek/nose patch of each single: {_sk}', 'OK' if not _bad else 'FAIL')
if _bad or not _sk: fails.append('skin')
print('== SHARPNESS / ENCODE (owner 22/10: sharp master, no blocking)')
def _lapv(g): return float(_cv.Laplacian(g, _cv.CV_64F).var())
def _blk(g):   # 8x8 blockiness: |diff| across block boundaries / |diff| elsewhere (1.0 = none)
    g = g.astype(np.float32); d = np.abs(np.diff(g, axis=1)); dv = np.abs(np.diff(g, axis=0))
    return float((d[:, 7::8].mean() + dv[7::8].mean()) / (np.delete(d, np.s_[7::8], axis=1).mean() + np.delete(dv, np.s_[7::8], axis=0).mean()))
def _ssim(a, b):
    a, b = a.astype(np.float64), b.astype(np.float64); C1, C2 = 6.5025, 58.5225; bl = lambda x: _cv.GaussianBlur(x, (11, 11), 1.5)
    ma, mb = bl(a), bl(b); va, vb, cv_ = bl(a * a) - ma ** 2, bl(b * b) - mb ** 2, bl(a * b) - ma * mb
    return float((((2 * ma * mb + C1) * (2 * cv_ + C2)) / ((ma ** 2 + mb ** 2 + C1) * (va + vb + C2))).mean())
_cap = _cv.VideoCapture(V); _fl, _tl, _bl, _ss = [], [], [], []
for x in tl['shots']:
    fi_ = x['n'] // 2 + int(round(x['t0'] * FPS)); _cap.set(_cv.CAP_PROP_POS_FRAMES, fi_); ok_, Fm = _cap.read()
    if not ok_: continue
    g_ = _cv.cvtColor(Fm, _cv.COLOR_BGR2GRAY); t_ = fi_ / FPS; gb_ = g_.copy()
    for o in tl['overlays']:
        if o['t'][0] <= t_ < o['t'][1]: b_ = o['box']; gb_[max(0, b_[1] - 12):b_[3] + 12, max(0, b_[0] - 12):b_[2] + 12] = _cv.blur(gb_, (31, 31))[max(0, b_[1] - 12):b_[3] + 12, max(0, b_[0] - 12):b_[2] + 12]
    _bl.append(_blk(gb_))
    if x.get('faceboxes') and not x.get('other'): b_ = [int(v) for v in x['faceboxes'][0]]; _fl.append((x['id'], int(_lapv(g_[max(0, b_[1]):b_[3], max(0, b_[0]):b_[2]]))))
    if any(o['style'] in ('Card', 'Recap') and o['t'][0] <= t_ < o['t'][1] for o in tl['overlays']): _tl.append((x['id'], int(_lapv(g_[1016:1240, 60:920]))))
    rp_ = sorted(glob.glob(f'{RD}/ref_*.png')); rf_ = [r for r in rp_ if abs(int(re.findall(r'(\d+)\.png$', r)[0]) - fi_) <= 1]
    if rf_: _ss.append((x['id'], round(_ssim(_cv.cvtColor(_cv.imread(rf_[0]), _cv.COLOR_BGR2GRAY), g_), 4)))
# owner 22/10: sharpness relative to the ideal: faces/hair vs the source clip frame resampled once (INTER_AREA) to the shot scale; text vs the pre-encode reference frame
_GR = os.environ.get('CINE_LIB', '') + '/anchor/green/kfull'; _rat = []
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '../video')); import matte_refine as _MR
for x in tl['shots']:
    if x['id'] in ('hook', 'loop') or x.get('other') or not x.get('faceboxes') or not os.path.exists(f"{_GR}/{x['clip']}.mp4"): continue
    _cf, _cm, _ll = _MR.layer_paths(_GR[:-len('/kfull')], x['clip'])   # same colour / alpha layers the render used (PRO when NEWS_MATTE=pro)
    sc_, cx_, cy_, ox_, oy_ = x['xfs'][x['clip']][:5]; fi_ = x['n'] // 2 + int(round(x['t0'] * FPS)); src_i = x['frames'][x['n'] // 2]
    c2 = _cv.VideoCapture(_cf); c2.set(_cv.CAP_PROP_POS_FRAMES, src_i); okS, S_ = c2.read(); _cap.set(_cv.CAP_PROP_POS_FRAMES, fi_); okM, Mf = _cap.read()
    if not (okS and okM): continue
    c3 = _cv.VideoCapture(_cm); c3.set(_cv.CAP_PROP_POS_FRAMES, src_i); okA, A_ = c3.read(); Am_ = _cv.resize(A_[..., 0], (1080, 1920)).astype(np.float32) / (255 if _ll else 250) if okA else np.ones((1920, 1080), np.float32)
    S_ = _cv.resize(S_, (1080, 1920), interpolation=_cv.INTER_AREA); m_ = json.load(open(MD(x['clip']) + f"/{x['who']}/mouth.json"))['face_box']
    for nm_, (a0, b0, a1, b1) in (('face', m_), ('hair', (m_[0], m_[1] - 0.35 * (m_[3] - m_[1]), m_[2], m_[1]))):
        src_c = S_[int(max(0, b0)):int(b1), int(a0):int(a1)]; ref_ = _cv.resize(src_c, None, fx=sc_, fy=sc_, interpolation=_cv.INTER_AREA)
        X0, Y0 = int((a0 - cx_) * sc_ + ox_), int((max(0, b0) - cy_) * sc_ + oy_); out_c = Mf[max(0, Y0):Y0 + ref_.shape[0], max(0, X0):X0 + ref_.shape[1]]
        if out_c.size and ref_.size and out_c.shape[:2] == ref_.shape[:2]:
            mk_ = _cv.resize(Am_[int(max(0, b0)):int(b1), int(a0):int(a1)], (ref_.shape[1], ref_.shape[0]), interpolation=_cv.INTER_AREA) > 0.97   # only pixels inside the host matte (hair edges vs a new bg are not comparable)
            mk_ = _cv.erode(mk_.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
            if mk_.sum() > 200:
                gm_ = lambda im: np.hypot(_cv.Sobel(_cv.cvtColor(im, _cv.COLOR_BGR2GRAY).astype(np.float32), _cv.CV_32F, 1, 0), _cv.Sobel(_cv.cvtColor(im, _cv.COLOR_BGR2GRAY).astype(np.float32), _cv.CV_32F, 0, 1))
                gr_ = gm_(ref_); sel_ = mk_ & (gr_ >= max(80.0, np.percentile(gr_[mk_], 85)))   # owner 23/10: only real drawn edges (flat cel hair = keyed-source noise, not detail)
                if sel_.sum() > 50: _rat.append((x['id'], nm_, round(float(gm_(out_c)[sel_].mean()) / max(1.0, float(gr_[sel_].mean())), 2)))   # edge acutance on the strongest source edges
_trat = []
for r_ in sorted(glob.glob(f'{RD}/ref_*.png')):
    fi_ = int(re.findall(r'(\d+)\.png$', r_)[0]); t_ = fi_ / FPS
    if not any(o['style'] in ('Card', 'Recap', 'Cap') and o['t'][0] <= t_ < o['t'][1] for o in tl['overlays']): continue
    _cap.set(_cv.CAP_PROP_POS_FRAMES, fi_); okM, Mf = _cap.read(); R_ = _cv.imread(r_)
    if okM: _trat.append(round(_lapv(_cv.cvtColor(Mf[1016:1420, 60:920], _cv.COLOR_BGR2GRAY)) / max(1.0, _lapv(_cv.cvtColor(R_[1016:1420, 60:920], _cv.COLOR_BGR2GRAY))), 2))
_ok = dict(face_hair=bool(_rat) and min(v for _, _, v in _rat) >= 0.9, text=bool(_trat) and min(_trat) >= 0.9, blk=bool(_bl) and float(np.median(_bl)) <= 1.12, ssim=bool(_ss) and min(v for _, v in _ss) >= 0.97)
print(f"  sharpness vs ideal (>= 0.90): faces/hair min {min([v for _, _, v in _rat] or [0])} {[r for r in _rat if r[2] < 0.9][:4]}; text min {min(_trat or [0])}; blockiness median {np.median(_bl or [9]):.3f} (<= 1.12); SSIM pre/post-encode min {min([v for _, v in _ss] or [0]):.4f} (>= 0.97)", 'OK' if all(_ok.values()) else f'FAIL {[k for k, v in _ok.items() if not v]}')
fails += [f'sharp:{k}' for k, v in _ok.items() if not v]
print('== AUDIO')
a = subprocess.run(['ffmpeg', '-nostdin', '-threads', '2', '-i', V, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
LU = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', a)[-1]); fails += ['loudness'] if abs(LU + (14 if TP == 'news' else 16)) > 1 else []   # docs/VIDEO-QC.md: news -14 LUFS
print('  integrated', re.findall(r'I:\s+(-?[\d.]+) LUFS', a)[-1], 'LUFS; first speech at %.2f s (footsteps from 0.12 s)' % speech[0][0])
raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', V, '-ac', '1', '-ar', '48000', '-f', 's16le', '-'], capture_output=True).stdout
x = np.frombuffer(raw, np.int16).astype(float) / 32768; w = 480
db = np.array([20 * np.log10(np.sqrt((x[i:i + w] ** 2).mean() + 1e-12)) for i in range(0, len(x) - w, w)])
first = np.argmax(db > -45) * 0.01; tail = db[int((tl['scene'] - 0.3) * 100):]; loud = [(i, round(tail[i + 1], 1)) for i in range(len(tail) - 1) if tail[i + 1] - tail[i] > 6 and tail[i + 1] > -35]
print(f'  first sound above -45 dBFS at {first:.2f} s;  end card: peak {tail.max():.0f} dBFS, loud transients {loud or "none"}', 'OK' if not loud and first < 0.3 else 'FAIL')
if loud or first >= 0.3: fails.append('audio')
# owner 22/10: noise floor in speech pauses (>= 0.3 s gaps between lines, 0.1 s margins, SFX +-0.7 s excluded) <= -50 dBFS
sp_ = sorted((a_, b_) for a_, b_, *_ in speech); sfx_t = [t_ for f_, t_ in tl.get('sfx', [])]; pz = []
for (a0, b0), (a1, b1) in zip([(0, 0)] + sp_, sp_ + [(tl['scene'] - 1.0, 0)]):
    for t_ in np.arange(b0 + 0.1, a1 - 0.1, 0.01):
        if a1 - b0 >= 0.3 and all(abs(t_ - x_) > 0.7 for x_ in sfx_t) and int(t_ * 100) < len(db): pz.append(db[int(t_ * 100)])
nf_ = float(np.percentile(pz, 90)) if pz else -99
print(f'  noise floor in speech pauses (90th pct of {len(pz)} x 10 ms) {nf_:.1f} dBFS (<= -50)', 'OK' if nf_ <= -50 else 'FAIL')
if nf_ > -50: fails.append('noise')
print('  total %.2f s' % tl['total'], 'OK' if tl['total'] <= 40 else 'FAIL')
if tl['total'] > 40: fails.append('total>40s')   # was printed only, never counted
_bgt = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../content/video/cine/news/bg_topics.json')))['domains']; _lm = tl['lesson']
_txt = ' '.join([_lm.get('goal_en', ''), ' '.join(_lm.get('series') or []), _lm.get('hook_text', '')]).lower()
_dh = [d for d, v in _bgt.items() if any(re.search(r'\b' + re.escape(k), _txt) for k in v['keywords'])]
_bgid = str(_lm.get('bg') or '').split('@')[0]
_bad = [d for d in _dh if _bgid not in _bgt[d]['bg'] and not any(re.search(r'(^|_)' + re.escape(k) + r'(_|$)', _bgid) for k in _bgt[d]['bg'] + [d])]   # wide library ids (hl_pharmacy_counter__...) match by scene word
print(f"== BG TOPIC: bg {_lm.get('bg')} domains {_dh or '-'}", 'OK' if not _bad else f'FAIL (needs {[_bgt[d]["bg"] for d in _bad]})')
if _bad: fails.append('bg-topic')
print('== CINE SCORE (owner 23/10: thirds, lead room, headroom, level, tangents, separation, clean head zone, consistency, shot purpose, balance)')
_sg = [x for x in tl['shots'] if not x.get('other') and x.get('xfs')]; _C = {}
def _ct(name, ok, det): _C[name] = dict(ok=bool(ok), detail=det)
_eye = {x['id']: round(x['xfs'][x['clip']][4] / 1920, 3) for x in _sg if x['id'] not in ('hook', 'loop')};   # hook / loop = title shot (card owns the top band)
_ct('thirds', all(0.293 <= v <= 0.373 for v in _eye.values()), _eye)
_lead = {x['id']: x['xfs'][x['clip']][3] for x in _sg}; _ct('lead_room', all((v <= 540) == (x['who'] == 'ama') for x, v in zip(_sg, _lead.values())) and not _away, dict(ox=_lead, yaw=_yaw))
_ht = lambda x: round((x['xfs'][x['clip']][4] - HOST_TOP.get(x['clip'][:3], 250) * x['xfs'][x['clip']][0]) / 1920, 3); _hr = {x['id']: (x['frame'], _ht(x)) for x in _sg if x['id'] not in ('hook', 'loop')}
_ct('headroom', all(0.08 <= v <= (0.1605 if f == 'mcu' else 0.20) for f, v in _hr.values()), _hr)   # MS: <= 20 % (eyes on the third line + Carlos's bottom anchor win over 14 %)
_rot = [abs(v) for x in tl['shots'] for v in (x.get('cam') or {}).get('rot', [0, 0])]; _ct('level', max(_rot or [0]) <= 1.0, f'max camera roll {max(_rot or [0]):.2f} deg (<= 1)')
_ci = {x['id']: x.get('cine') for x in _sg if x.get('cine')}
_ct('tangents', _ci and not any(v['tangents'] for v in _ci.values()), {k: len(v['tangents']) for k, v in _ci.items()})
_ct('separation', _ci and all(v['dL'] >= 8 or v['sharp_ratio'] >= 1.3 for v in _ci.values()), {k: (v['dL'], v['sharp_ratio']) for k, v in _ci.items()})
_CL = float(os.environ.get('CINE_CLUTTER_MAX', '0.08')); _ct('clean_head_zone', _ci and all(v['clutter'] <= _CL for v in _ci.values()), {k: v['clutter'] for k, v in _ci.items()})
_zs = [json.load(open(p_)) for p_ in glob.glob(f"{LIB}/anchor/bg/w4/zones/{str(tl['shots'][0]['bg']).split('@')[0]}_*.zones.json")]
_hzs = [z.get('final_horizon') for z in _zs if z.get('final_horizon')]; _zz = [x['cam']['z'][0] for x in tl['shots'] if x.get('cam')]
_ct('consistency', (not _hzs or max(_hzs) - min(_hzs) <= 0.03) and (max(_zz) / min(_zz) <= 1.06 if _zz else True), dict(horizon=_hzs, cam_z=[round(min(_zz), 3), round(max(_zz), 3)] if _zz else None))
_fr = {x['frame'] for x in _sg}; _ct('shot_purpose', {'mcu', 'wide'} <= _fr and bool(tl.get('qa', {}).get('pans')), dict(frames=sorted(_fr), pans=tl.get('qa', {}).get('pans')))
_ct('balance', _ci and all(v['dead'] <= 0.35 for v in _ci.values()), {k: v['dead'] for k, v in _ci.items()})
_cs = sum(10 for v in _C.values() if v['ok']); json.dump(dict(score=_cs, rules=_C), open(f'{RD}/cine.json', 'w'), indent=1, default=str)
for k_, v_ in _C.items(): print(f'  cine {k_:16s}', 'OK' if v_['ok'] else 'FAIL', str(v_['detail'])[:220])
rule(_cs == 100, f'cine score {_cs}/100 (hard gate: every rule)')
print('== LAYOUT (owner 23/10: 1 card + 1 caption, no overlap / overflow, AA contrast; contact sheet)')
_lq = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'layout_qa.py'), RD, V], capture_output=True, text=True); print('  ' + (_lq.stdout.strip() or _lq.stderr.strip()[-400:]).replace('\n', '\n  '))
rule(_lq.returncode == 0, 'layout QA (overlap / overflow / contrast / one card + one caption)')
print('== RESULT:', 'ALL PASS' if not fails else f'{len(fails)} FAIL(s): {fails}')
json.dump(dict(result='ALL PASS' if not fails else f'{len(fails)} FAIL(s): {fails}', fails=fails), open(f'{RD}/qa_result.json', 'w'))   # qc_gate reads this when the log is not in out/qa
