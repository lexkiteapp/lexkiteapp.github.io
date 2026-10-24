#!/usr/bin/env python3
"""EDIT-CRAFT QC (owner 24/10: qa_news = 100 but the editing still looked amateur). Measures editing grammar, not pixels:
  python3 scripts/cine/qa_edit.py <timeline.json> [video.mp4|-] [out.json]
  mid_sentence_cuts  visible cuts while a sentence that started > 8 frames earlier is still being spoken          (gate: 0)
  cut_on_pause       share of visible cuts on the speech boundary: outgoing speech ended, incoming voice leads by
                     4-8 frames on a host switch (J-cut) or starts within 0..3 frames of the cut when the speaker
                     was already on screen; cuts into a silent hold sit inside the pause                              (gate: >= 0.9)
  slow_pans          camera moves across a cut longer than 8 frames: timeline pans / whips + measured runs of >= 10
                     frames of global horizontal motion (phase correlation, quarter res)                            (gate: 0)
  pop_ins            overlay entrances (cards, chips, caption chunks) whose first drawn frame is > 45 % opaque or that
                     jump > 35 % opacity / > 30 px in one frame (renderer log; old renderers: no ease = pop)         (gate: 0)
Works on old timelines too (no qa.edit): every shot boundary = visible cut, pans from shot['pan'], eases inferred."""
import json, re, sys, os
import numpy as np
TL = json.load(open(sys.argv[1])); VID = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] != '-' else None
FPS = 24; F = 1 / FPS; ED = (TL.get('qa') or {}).get('edit')
sh = TL['shots']; ov = TL['overlays']
txt = {o['line']: o['text'] for o in ov if o['style'] == 'Cap' and o.get('line')}
SEN, WORDS = [], []   # sentences / words (absolute times) from the per-word timings the renderer used for the karaoke captions
for x in sh:
    for l in x.get('lines', []):
        ws = l.get('words') or []; tk = (txt.get(l['id']) or '').split(); cur = None
        for i, w in enumerate(ws):
            WORDS.append((w[0], w[1], x['who'], l['id']))
            if cur is None: cur = [w[0], w[1], l['id'], x['who']]
            cur[1] = w[1]
            if (i < len(tk) and re.search(r'[.!?]["”’]?$', tk[i])) or i == len(ws) - 1: SEN.append(cur); cur = None
SEN.sort(); WORDS.sort()
vis = lambda x: {x['who']} | ({'carlos' if x['who'] == 'ama' else 'ama'} if x.get('other') else set())
if ED: B = [dict(b) for b in ED['bounds']]
else: B = [dict(k=k, t=sh[k]['t0'], kind='pan' if sh[k].get('pan') else 'cut', frm=sh[k - 1]['id'], to=sh[k]['id']) for k in range(1, len(sh))]
cuts = [b for b in B if b['kind'] != 'cont']
mid, rows = [], []
for b in cuts:
    c = b['t']; a_, b_ = sh[b['k'] - 1], sh[b['k']]
    span = [s for s in SEN if s[0] < c - 8 * F and s[1] > c + F]
    if span: mid.append(dict(t=round(c, 3), to=b['to'], sentence=[round(span[0][0], 2), round(span[0][1], 2)], line=span[0][2]))
    prev_end = max([w[1] for w in WORDS if w[0] < c - 8.5 * F] or [0.0]); nxt = [w for w in WORDS if w[0] >= c - 8.5 * F]
    on = nxt[0][0] if nxt else None; lead = round((c - on) * FPS, 1) if on is not None else None
    switch = b_['who'] not in vis(a_) and bool(b_.get('lines'))
    if on is None or on - c > 0.5: ok = prev_end <= c - 2 * F; why = 'hold-in-pause'   # cut into a silent hold / end
    elif switch: ok = prev_end <= c and 3.5 <= lead <= 8.5; why = 'J-cut lead 4-8 f'
    else: ok = prev_end <= c and -3.5 <= lead <= 1.5; why = 'speaker on screen: onset within 0-3 f of the cut'
    rows.append(dict(t=round(c, 3), kind=b['kind'], frm=b['frm'], to=b['to'], out_gap_f=round((c - prev_end) * FPS, 1), lead_f=lead, ok=bool(ok), rule=why))
align = sum(r['ok'] for r in rows) / max(1, len(rows))
pans = [dict(t=round(b['t'], 3), frames=int(sh[b['k']]['pan']['n'])) for b in B if b['kind'] == 'pan' and sh[b['k']]['pan']['n'] > 8]
if ED: pans += [dict(t=round(b['t'], 3), frames=b['n_out'] + b['n_in'], kind=b['kind']) for b in B if b['kind'] == 'whip' and b['n_out'] + b['n_in'] > 8]
meas = []
if VID and os.path.exists(VID):
    import cv2
    cap = cv2.VideoCapture(VID); prv = None; dx = []
    while True:
        ok, f = cap.read()
        if not ok: break
        g = cv2.cvtColor(cv2.resize(f, (270, 480), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY).astype(np.float32)[40:300]   # above the card / caption band
        dx.append(cv2.phaseCorrelate(prv, g)[0][0] * 4 if prv is not None else 0.0); prv = g
    run = 0
    for i, d in enumerate(dx + [0]):
        if abs(d) > 6: run += 1
        else:
            if run >= 10: meas.append(dict(t=round((i - run) / FPS, 3), frames=run, measured=True))
            run = 0
    pans += [m for m in meas if not any(abs(m['t'] - p['t']) < 1.0 for p in pans)]
pops, ent = [], 0
cards = sorted([o for o in ov if o['style'] == 'Card'], key=lambda o: o['t'][0])
for o in ov:
    if o['t'][0] <= 0.05 or o['style'] in ('Series', 'VHook'): continue
    if ED:
        if not o.get('entry'): continue
        ent += 1; lg = sorted(o.get('enter_log') or [])
        if not lg: pops.append(dict(style=o['style'], t=o['t'][0], why='no entrance ease')); continue
        al = [q[1] for q in lg]; dy = [q[2] for q in lg]
        jump = max([abs(b - a) for a, b in zip(al, al[1:])] + [1 - al[-1]] + [0]); jy = max([abs(b - a) for a, b in zip(dy, dy[1:])] + [abs(dy[-1])])
        if al[0] > 0.45 or jump > 0.35 or jy > 30: pops.append(dict(style=o['style'], t=o['t'][0], first=al[0], jump=round(jump, 2), dy=jy))
    elif o['style'] == 'Cap':   # old renderer: caption chunks swap in one frame, chained cards hard-swap, other cards fade 0.16 s
        if not o.get('chunk'): continue
        same = [p for p in ov if p['style'] == 'Cap' and p.get('line') == o.get('line') and (p.get('chunk') or [None])[0] == o['chunk'][0]]
        if o.get('part') != min(p['part'] for p in same): continue
        ent += 1; pops.append(dict(style='Cap', t=o['t'][0], why='chunk swaps in one frame'))
    else:
        ent += 1
        if o['style'] == 'Card' and any(abs(c['t'][1] - o['t'][0]) < 0.02 for c in cards if c is not o): pops.append(dict(style=o['style'], t=o['t'][0], why='chained card hard swap'))
R = dict(edit_style=(ED or {}).get('style', 'legacy'), cuts=len(cuts), mid_sentence_cuts=len(mid), mid=mid, cut_on_pause=round(align, 3), cut_rows=rows,
         slow_pans=len(pans), pans=pans, pop_ins=len(pops), pop=pops, entrances=ent, transitions={k: sum(1 for b in B if b['kind'] == k) for k in sorted({b['kind'] for b in B})})
R['pass'] = R['mid_sentence_cuts'] == 0 and R['cut_on_pause'] >= 0.9 and R['slow_pans'] == 0 and R['pop_ins'] == 0
if len(sys.argv) > 3: json.dump(R, open(sys.argv[3], 'w'), indent=1)
for r in rows: print(f"  cut {r['t']:6.2f} {r['kind']:5s} {r['frm']:>5s}->{r['to']:<5s} out_gap {r['out_gap_f']:5.1f} f  lead {r['lead_f']} f  {'OK ' if r['ok'] else 'BAD'} ({r['rule']})")
print(f"EDIT-CRAFT {R['edit_style']}: mid-sentence cuts {R['mid_sentence_cuts']}, cut-on-pause {R['cut_on_pause']:.2f}, slow pans {R['slow_pans']}, pop-ins {R['pop_ins']}/{ent} entrances, transitions {R['transitions']} -> {'PASS' if R['pass'] else 'FAIL'}")
sys.exit(0 if R['pass'] else 1)
