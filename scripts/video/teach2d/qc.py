#!/usr/bin/env python3
"""Teach2D QC (docs/VIDEO-TEACH2D.md): every gate must pass and the weighted score must be >= 90, else exit 1 (nothing ships).
  python3 scripts/video/teach2d/qc.py --timeline PROPS.json.timeline.json [--video OUT.mp4] [--sheet OUT.sheet.jpg] [--out qc.json]
Gates: voice_teacher · pace (<= 150 wpm) · caption_sync (caption == script == whisper) · mouth (talk only while speaking, listen in pauses)
· hook (on screen at frame 0, <= 6 words, spoken by 2.2 s) · cue_timing (+-80 ms on the word) · layout (text in SAFE, no overlap, head clear)
· contrast (text >= 4.5:1, large >= 3:1, both on the real fill) · min_text · ipa (== audited bank, stress dot == IPA stress mark) · cta (deep link)
· duration · file (fps, AAC, duration, -16 LUFS) · frames (teacher visible every second, no blank frame) – the last two need --video."""
import argparse, json, math, os, re, subprocess, sys, difflib
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, f'{ROOT}/scripts/video/motion'); sys.path.insert(0, f'{ROOT}/scripts/video/tpl')
import core as C  # noqa: E402
from overlay_gates import contrast as _cr, bank_ipa, stress_index  # noqa: E402
def contrast(a, b): return _cr(*[[int(x[i:i + 2], 16) for i in (1, 3, 5)] for x in (a, b)])
ap = argparse.ArgumentParser(); ap.add_argument('--timeline', required=True); ap.add_argument('--video'); ap.add_argument('--sheet'); ap.add_argument('--out')
o = ap.parse_args(); T = json.load(open(o.timeline)); TH = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json'))[T['theme']]
REG = json.load(open(f'{ROOT}/web/teach/characters.json')); R = {}; N = {n['id']: n for n in T['nodes']}
norm = lambda x: re.sub(r"[^a-z0-9']", '', x.lower().replace('’', "'"))
def gate(name, ok, w=1, **kw): R[name] = dict(ok=bool(ok), w=w, **kw)
def inter(a, b, m=0): return a[0] < b[2] - m and b[0] < a[2] - m and a[1] < b[3] - m and b[1] < a[3] - m
def alpha(n, t):
    a = C.pose(n, t)['a']; p = n.get('parent')
    while p: a *= C.pose(N[p], t)['a']; p = N[p].get('parent')
    return a

# voice = teacher (owner 29/10): the voice id of the registry teacher shown
gate('voice_teacher', T['voice'] == REG['people'][T['teacher']]['voice']['video'], 3, voice=T['voice'], teacher=T['teacher'])
# pace
L = T['lines']; nw = sum(len(v['words']) for v in L.values()); span = max(v['words'][-1]['e'] for v in L.values()) - min(v['words'][0]['s'] for v in L.values())
lw = {k: round(60 * len(v['words']) / max(0.3, v['words'][-1]['e'] - v['words'][0]['s'])) for k, v in L.items()}
gate('pace', 60 * nw / span <= 150 and max(lw.values()) <= 200, 2, wpm=round(60 * nw / span), line_wpm_max=max(lw.values()))
# caption == script == whisper
bad = []
for k, v in L.items():
    script = [norm(w) for w in v['text'].split()]; spoken = [norm(w['w']) for w in v['words']]; heard = [norm(w) for w in v['whisper'].split()]
    r = difflib.SequenceMatcher(None, script, heard).ratio() if heard else 0
    if spoken != script or r < 0.85 or v['interp'] > 1: bad.append(dict(line=k, whisper_ratio=round(r, 2), interp=v['interp']))
if T['format'] == 'short':
    capw = [norm(w['w']) for c in T['caps'] for w in c['words']]; allw = [norm(w['w']) for v in L.values() for w in v['words']]
    if capw != allw: bad.append(dict(captions='caption tokens != spoken tokens'))
gate('caption_sync', not bad, 3, bad=bad[:6])
# mouth: talk frames cover every spoken word, no talk in silences > 0.35 s
fps = T['fps']; nf = int(round(T['total'] * fps)); talk = [False] * nf
for s in T['segs']:
    for f in range(s['from'], min(nf, s['from'] + s['dur'])): talk[f] = s['clip'] == 'talk'
miss = [w['w'] for v in L.values() for w in v['words'] if not all(talk[f] for f in range(int(w['s'] * fps) + 1, max(int(w['s'] * fps) + 2, int(w['e'] * fps))) if f < nf)]
sp = sorted(T['speech']); long_talk = []
for (a0, a1), (b0, b1) in zip(sp, sp[1:]):
    if b0 - a1 > 0.35 and any(talk[f] for f in range(int((a1 + 0.15) * fps), int((b0 - 0.1) * fps))): long_talk.append(round(a1, 2))
gate('mouth', not miss and not long_talk, 3, words_without_talk=miss[:5], talk_in_silence=long_talk[:5], segments=len(T['segs']))
# hook
hk = [n for n in T['nodes'] if n.get('hook')]
gate('hook', hk and alpha(hk[0], 0.0) >= 0.99 and len(L['h']['text'].split()) <= 6 and L['h']['words'][-1]['e'] <= 2.2, 3,
     hook_words=len(L['h']['text'].split()), spoken_by=L['h']['words'][-1]['e'])
# cue timing: every element appears on its word
off = [dict(node=c['node'], tag=c['tag'], d=round(N[c['node']]['in']['t'] + C.HALF[N[c['node']]['in']['k']] - c['t'], 3)) for c in T['cues'] if c['t'] is not None and c['node'] in N]
offb = [x for x in off if abs(x['d']) > 0.08 and N[x['node']]['in']['t'] >= N[N[x['node']]['parent']]['in']['t'] + 1e-6 if N[x['node']].get('parent')]
gate('cue_timing', not offb, 2, checked=len(off), bad=offb[:6])
# layout: sampled every 0.1 s
SAFE = T['safe']; head = T['head']; prob = []; leaf = {'text', 'chip', 'pill', 'ring', 'img', 'cta', 'tag', 'cross', 'check', 'qmark', 'eq', 'flags'}
for i in range(int(T['total'] * 10)):
    t = i / 10; vis = [n for n in T['nodes'] if alpha(n, t) > 0.3]
    for n in vis:
        if n['type'] in leaf and not (SAFE[0] - 1 <= n['box'][0] and n['box'][2] <= SAFE[2] + 1 and SAFE[1] - 1 <= n['box'][1] and n['box'][3] <= SAFE[3] + 1) and n['id'] != 'series':
            prob.append(dict(t=t, id=n['id'], why='outside SAFE', box=n['box']))
        if n['type'] != 'confetti' and inter(n['box'], head): prob.append(dict(t=t, id=n['id'], why='on the teacher head', box=n['box']))
    tx = [n for n in vis if n['type'] in leaf]
    for a in range(len(tx)):
        for b in range(a + 1, len(tx)):
            A, B = tx[a], tx[b]
            if inter(A['box'], B['box'], 2) and not ({A['type'], B['type']} & {'check'}) and not (A['type'] == 'ring' or B['type'] == 'ring') and A.get('parent') != B['id'] and B.get('parent') != A['id']:
                prob.append(dict(t=t, ids=[A['id'], B['id']], why='overlap'))
    cards = [n for n in vis if n['type'] == 'card' and not n.get('parent')]
    for a in range(len(cards)):
        for b in range(a + 1, len(cards)):
            if inter(cards[a]['box'], cards[b]['box']): prob.append(dict(t=t, ids=[cards[a]['id'], cards[b]['id']], why='cards overlap'))
if T['cap_box'] and inter(T['cap_box'], head): prob.append(dict(why='caption band on the head', cap=T['cap_box'], head=head))
rings = [n for n in T['nodes'] if n['type'] == 'ring']
for r in rings:
    for n in T['nodes']:
        if n['type'] == 'text' and n.get('parent') and abs(r['in']['t'] - N[n['parent']]['in']['t']) < 6 and inter(r['box'], n['box']): prob.append(dict(id=n['id'], why='text under the countdown ring'))
seen = set(); prob = [p for p in prob if not (json.dumps({k: v for k, v in p.items() if k != 't'}, sort_keys=True) in seen or seen.add(json.dumps({k: v for k, v in p.items() if k != 't'}, sort_keys=True)))]
gate('layout', not prob, 3, problems=prob[:8])
# contrast on the real fill (card tone / chip / pill / caption plate), both themes are separate renders
def rgb(c, over=None):
    if c.startswith('#'): return c
    m = re.match(r'rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)', c); r, g, b, a = int(m[1]), int(m[2]), int(m[3]), float(m[4]); ov = [int(over[i:i + 2], 16) for i in (1, 3, 5)]
    return '#' + ''.join(f'{round(x * a + y * (1 - a)):02x}' for x, y in zip((r, g, b), ov))
FILL = dict(card=TH['card'], tile=TH['tile'], good=TH['good_bg'], bad=TH['bad_bg'])
low = []
def need(sz): return 3.0 if sz >= 56 else 4.5
for n in T['nodes']:
    if n['type'] == 'text':
        bg = FILL.get(N[n['parent']]['tone'], TH['card']) if n.get('parent') else TH['bg']
        for s, k in n['runs']:
            if s.strip():
                cr = contrast(TH.get(k, k), bg)
                if cr < need(n['size']): low.append(dict(id=n['id'], text=s.strip()[:20], cr=cr, need=need(n['size'])))
pairs = [('chip', TH['chip_ink'], TH['chip_bg'], 40), ('pill', TH['ink'], TH['pill'], 56), ('pill-right', TH['ink'], TH['good_bg'], 56), ('pill-dim', TH['muted'], TH['pill'], 56),
         ('caption', TH['cap_ink'], rgb(TH['cap_plate'], TH['bg2']), 58), ('caption-now', TH['cap_now'], rgb(TH['cap_plate'], TH['bg2']), 58), ('cta', TH['cta_ink'], TH['cta_a'], 60), ('ring', TH['ring_ink'], TH['ring_bg'], 54)]
for name, fg, bg, sz in pairs:
    cr = contrast(fg, bg)
    if cr < need(sz): low.append(dict(id=name, cr=cr, need=need(sz)))
gate('contrast', not low, 3, low=low[:8], theme=T['theme'])
# min text size
fl = 40 if T['format'] == 'short' else 34; small = [n['id'] for n in T['nodes'] if n.get('size') and n['size'] < fl]
gate('min_text', not small, 2, floor=fl, small=small)
# IPA == audited bank; stress dot == IPA stress
bk = bank_ipa({x['token'].lower() for x in T['ipa']}, ROOT); ib = []
for x in T['ipa']:
    if bk.get(x['token'].lower()) != x['ipa']: ib.append(dict(token=x['token'], shown=x['ipa'], bank=bk.get(x['token'].lower())))
    if 'stress' in x and stress_index(x['ipa']) != x['stress']: ib.append(dict(token=x['token'], why='stress dot != IPA stress mark', ipa=x['ipa'], dot=x['stress']))
gate('ipa', not ib, 3, checked=len(T['ipa']), bad=ib)
# CTA deep link into the matching app feature
cta = T['cta']; ROUTES = ('#/dict/', '#/verb/', '#/pron/', '#/fix', '#/phrases', '#/usage', '#/grammar', '#/lesson', '#/call', '#/confidence', '#/placement', '#/toeic', '#/reading', '#/review')
gate('cta', cta['link'].startswith('https://lexkite.com/app/') and cta['route'].startswith(ROUTES) and cta['link'].endswith(cta['route']), 2, **cta)
gate('duration', 18 <= T['total'] <= 42, 1, seconds=T['total'])
# rendered file
if o.video:
    pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,codec_name,width,height,r_frame_rate:format=duration', '-of', 'json', o.video]))
    v = [s for s in pr['streams'] if s['codec_type'] == 'video'][0]; a = [s for s in pr['streams'] if s['codec_type'] == 'audio']; d = float(pr['format']['duration'])
    lo = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', o.video, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', lo)[-1])
    gate('file', eval(v['r_frame_rate']) == T['fps'] and a and a[0]['codec_name'] == 'aac' and abs(d - T['total']) < 0.2 and -17.5 <= I <= -14.5, 2,
         fps=v['r_frame_rate'], size=[v['width'], v['height']], dur=round(d, 2), lufs=I)
    import numpy as np
    W, H = v['width'], v['height']; raw = subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', o.video, '-vf', 'fps=1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'])
    fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3); bgc = np.array([int(TH['bg2'][i:i + 2], 16) for i in (1, 3, 5)])
    hx = [int(max(0, x)) for x in T['body']]; hostvis = []; blank = []
    for i, im in enumerate(fr):
        crop = im[hx[1]:hx[3], hx[0]:hx[2]].astype(int); diff = (np.abs(crop - bgc).sum(2) > 60).mean(); hostvis.append(round(float(diff), 3))
        if im.std() < 4: blank.append(i)
    gate('frames', min(hostvis) > 0.12 and not blank, 3, host_cover_min=min(hostvis), blank=blank)
    if o.sheet:   # contact sheet: one frame per line (middle), for the review sheet
        ts = [round((x['t0'] + x['t1']) / 2, 2) for x in L.values()]
        sel = '+'.join(f'between(t\\,{t - 0.02}\\,{t + 0.02})' for t in ts)
        subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', o.video, '-vf', f"select='{sel}',scale={W // 3}:-2,tile={len(ts)}x1", '-frames:v', '1', '-q:v', '3', o.sheet], check=True)
tot = sum(g['w'] for g in R.values()); score = round(100 * sum(g['w'] for g in R.values() if g['ok']) / tot, 1)
res = dict(ep=T['ep'], format=T['format'], theme=T['theme'], score=score, ok=score >= 90 and all(g['ok'] for g in R.values()), gates=R)
if o.out: json.dump(res, open(o.out, 'w'), indent=1)
for k, g in R.items(): print(('PASS ' if g['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in g.items() if a not in ('ok', 'w')}, ensure_ascii=False)[:300])
print(f"{T['ep']} {T['format']} {T['theme']}: score {score} ({len([g for g in R.values() if g['ok']])}/{len(R)} gates)")
sys.exit(0 if res['ok'] else 1)
