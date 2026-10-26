#!/usr/bin/env python3
"""QC gates for the v9 template family (docs/VIDEO-TEMPLATES.md §14). python3 scripts/video/tpl/qc_v9.py <video.mp4> <reviewed-hooks.json>
Reads <video>.timeline.json + <video>.samples/ + <video>.src0.png (render_v9.py); decodes the encoded file where a gate needs pixels. Exit 1 on any fail.
New vs qc_v8: head_clear (NO text/pop/caption box may touch the head mask of the clip(s) on screen, moved with the camera), caption_center
(|page centre - 540| <= 6 px), no_pad (pauses <= 0.45 s, only declared count/turn beats are silent, TTS speed as written), continuity (forward-only
source frames, cross-dissolves >= 8 frames between talk clips, no reverse/ping-pong), hook_truth (reviewed verdict per template + the hook's promise
is delivered: N cards, count + reveal, twin tiles + quiz, your-turn pause, stress dots), cta (deep link == content/video/ecosystem.json area link).
Board mode (classroom, docs/VIDEO-TEACHERS.md §5): text_on_board (hook + text pops written inside the measured board zone, moved with the
camera; widgets that fall back to the under-chin band are listed), caption_clear (caption boxes never touch the head mask or the measured
moving-body envelope of the clip, bank.json board.body), caption_center on the measured caption column, locked camera allowed (smax 1.0)."""
import sys, os, re, json, subprocess
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import SAFE, MIN_READ, MIN_PX
SYNC = 0.050
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
def frames_px(vid, idx, color=False):
    sel = '+'.join(f"eq(n\\,{i})" for i in idx); pf, ch = ('bgr24', 3) if color else ('gray', 1)
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', vid, '-vf', f"select='{sel}'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', pf, '-'], capture_output=True).stdout
    n = 1080 * 1920 * ch; return [np.frombuffer(raw[j * n:(j + 1) * n], np.uint8).reshape((1920, 1080, ch) if color else (1920, 1080)) for j in range(len(raw) // n)]
lap = lambda g: float(cv2.Laplacian(g, cv2.CV_64F).var())
med = lambda a: sorted(a)[len(a) // 2] if a else 0
def inter(a, b): return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
vid, hooks = sys.argv[1], sys.argv[2]
T = json.load(open(vid + '.timeline.json')); fr = T['frames']; fps = T['fps']; SP = T['spec']; R = {}
els = lambda f: [dict(zip(('name', 'text', 'x0', 'y0', 'x1', 'y1', 'alpha', 'px', 'group', 'digit', 'where', 'm'), e)) for e in f['els']]
BD = T.get('board')
S = T['script']; W_ = T['words']; CP = T['captions']; POPS = {p['id']: p for p in T['pops']}
# ---- hook truth: reviewed verdict + promise delivered
HV = json.load(open(hooks))['verdicts'].get(SP['id']) or {}; pr = HV.get('promise', {}); chk = {}
chk['verdict'] = bool(HV) and HV.get('hook_true') is True and HV.get('script_reviewed') is True
chk['on_screen_hook_is_reviewed'] = T['hook']['text'] == HV.get('hook')
chk['script_is_reviewed'] = HV.get('script') == S
if 'wrong' in pr: chk['wrong_spoken'] = S.get(pr['wrong_line']) == pr['wrong'] and pr['wrong'].rstrip('.?!') in T['hook']['text']
if 'right' in pr: chk['right_spoken'] = all(pr['right'] in S[l] for l in pr['right_lines'])
if 'cards' in pr: chk['cards'] = sum(1 for p in T['pops'] if p['kind'] == 'card' and p['id'] != 'hook') == pr['cards'] and all(p.get('url') for p in T['pops'] if p['kind'] == 'card')
if pr.get('count'): chk['count_beat'] = any(b['kind'] == 'count' for b in T['beats'].values())
if 'reveal' in pr: chk['reveal'] = any(pr['reveal'] in p['text'] and p['t0'] >= max(b['e'] for b in T['beats'].values()) - 0.05 for p in T['pops'])
if 'pair' in pr: chk['pair'] = any(p['kind'] == 'pair' and all(w.lower() in p['text'].lower() for w in pr['pair']) for p in T['pops'] if p['id'] != 'hook')
if pr.get('quiz'): chk['quiz'] = any(p['kind'] == 'quiz' for p in T['pops'])
if pr.get('turn'): chk['turn'] = any(b['kind'] == 'turn' for b in T['beats'].values()) and any(p['kind'] == 'turn' for p in T['pops'])
if 'tags' in pr: chk['tags'] = sum(1 for p in T['pops'] if p['id'].startswith('t') and p['id'][1:].isdigit()) == pr['tags']
if 'stress' in pr: chk['stress'] = any(p['kind'] == 'stress' and p['text'].split('·')[0] == pr['stress'] for p in T['pops'])
if 'slow_line' in pr: chk['slow_line'] = T['lines'][pr['slow_line']]['speed'] <= 0.8
R['hook_truth'] = dict(ok=all(chk.values()), checks=chk, hook=T['hook']['text'], note=HV.get('note'))
f_on = [f['t'] for f in fr if any(e['group'] == 'hook' and e['alpha'] >= 0.999 for e in els(f))]
hpx = [e['px'] for f in fr for e in els(f) if e['group'] == 'hook' and e['alpha'] >= 0.999]
R['hook_readable'] = dict(ok=bool(f_on) and min(f_on) <= 0.40 and (len(f_on) / fps) >= 1.2 and min(hpx) >= 60, first_full=min(f_on, default=None), seconds=round(len(f_on) / fps, 2), px=min(hpx, default=0))
# ---- captions == script
D = T.get('display', {}); bad = []
inv = lambda w: next((k + w[len(v):] for k, v in D.items() if w.startswith(v)), w)
for lid, txt in S.items():
    pages = [c for c in CP.values() if c['line'] == lid]; cap = ' '.join(inv(x) for c in pages for x in c['text'].split())
    toks = [W_[w]['w'] for c in pages for w in c['words']]
    if cap != txt or ' '.join(toks) != txt: bad.append((lid, cap, txt))
sizes = [c['n'] for c in CP.values()]   # 2-3 words per page; a one-word page only as the natural final word of its line
def _solo_ok(c):   # v10: a one-word page is the last word of a sentence, or both of its two-word pages measured wider than the caption column
    if c['text'][-1] in '.?!:' and c.get('last') is not False: return True
    if T.get('style') == 'v10' and c['text'][-1] in '.?!:,;': return True   # v10: last word of a sentence / clause
    if T.get('style') == 'v10' and c.get('nosplit'): return True   # v10: the line has no 2-3 word pagination that fits the column (render proved it)
    return bool(c.get('solo_pairs')) and all(w > c['colw'] for w in c['solo_pairs'])
single_bad = [c['text'] for c in CP.values() if c['n'] == 1 and not _solo_ok(c)]
erx = SP.get('error_re'); err_lines = sorted({c['line'] for c in CP.values() if erx and re.search(erx, c['text'].lower())})
R['caption_script'] = dict(ok=bool(CP) and not bad and max(sizes) <= 3 and not single_bad and set(err_lines) <= set(SP.get('error_lines', [])),
                           pages=len(CP), words_per_page=sorted(set(sizes)), mismatch=bad[:3], single_word_pages=single_bad, error_only_in=err_lines)
CAPR = T.get('cap_ratio', 0.74)
R['caption_style'] = dict(ok=min(c['size'] for c in CP.values()) * CAPR >= ((T.get('min_cap') or {}).get('caption', 80) if T.get('style') == 'v10' else 53) and min(c['stroke'] for c in CP.values()) >= 12, sizes=sorted({c['size'] for c in CP.values()}),
                          cap_px=round(min(c['size'] for c in CP.values()) * CAPR, 1), strokes=sorted({c['stroke'] for c in CP.values()}))
# ---- v10 min_text_px: rendered glyph cap height per element type (caption / board hook+headline / board body) + card picture side, every fully visible frame
MC = dict(T.get('min_cap') or dict(caption=80, hook=72, body=56)); MC['image'] = T.get('min_img', 300); mins = {}; low = []; unmeasured = set()
for f in fr:
    for e in els(f):
        if e['alpha'] < 0.999: continue
        ms = e.get('m') or []
        if not ms: unmeasured.add(e['name']); continue
        for et, v in ms:
            mins[et] = min(mins.get(et, 1e9), v)
            if v < MC[et] - 0.05: low.append((f['t'], e['name'], et, v))
R['min_text_px'] = dict(ok=T.get('style') == 'v10' and not low and not unmeasured and 'caption' in mins and 'hook' in mins, min_by_type={k: round(v, 1) for k, v in mins.items()}, need=MC,
                        too_small=low[:6], n_small=len(low), unmeasured=sorted(unmeasured)[:6], note='cap height = font size x measured H ratio x on-screen scale (fit x camera x board perspective); image = picture side px')
pc = {}
for f in fr:
    for e in els(f):
        if e['group'] == 'caption': pc.setdefault(e['name'], []).append((e['x0'] + e['x1']) / 2)
CCX = T.get('cap_cx', 540)
off = {k: round(med(v) - CCX, 1) for k, v in pc.items()}; layout = {k: round(c['cx'] - CCX, 1) for k, c in CP.items() if 'ink' in c}
R['caption_center'] = dict(ok=bool(off) and max(map(abs, off.values())) <= 12 and bool(layout) and max(map(abs, layout.values())) <= 1, max_ink_offset_px=max(map(abs, off.values()), default=None),
                           max_layout_offset_px=max(map(abs, layout.values()), default=None), column_cx=CCX, note='layout = rest-state page ink centre vs 540 (<= 1 px; v8 was -54); animated = median over frames, the active word bounces 1.16x about its own centre (<= 12 px)')
# ---- head mask: no box touches the head of the clip(s) on screen
HD = T['head']; hits = []; nchk = 0
for f in fr:
    M = f['M']; heads = [HD[c] for c, k, w in f['src'] if w > 0.02]
    zr = [[M[0] * b[0] + M[2], M[4] * b[1] + M[5], M[0] * b[2] + M[2], M[4] * b[3] + M[5]] for b in heads]
    for e in els(f):
        if e['alpha'] <= 0.004: continue
        bx = [e['x0'], e['y0'], e['x1'], e['y1']]
        for z in zr:
            nchk += 1
            if inter(bx, z): hits.append((f['t'], e['name'], [round(v) for v in z]))
ov = []
for f in fr:
    E = [e for e in els(f) if e['alpha'] > 0.3]
    for i_ in range(len(E)):
        for j_ in range(i_ + 1, len(E)):
            a_, b_ = E[i_], E[j_]
            if inter([a_['x0'], a_['y0'], a_['x1'], a_['y1']], [b_['x0'], b_['y0'], b_['x1'], b_['y1']]): ov.append((f['t'], a_['name'], b_['name']))
R['no_overlap'] = dict(ok=not ov, n=len(ov), hits=ov[:6], note='pops / captions never cover each other (alpha > 0.3)')
R['body_clear'] = dict(ok=T.get('n_body_hits', 0) == 0, n=T.get('n_body_hits', 0), hits=(T.get('body_hits') or [])[:6], note='settled board text never covers the moving teacher (hands/arms) of the clip shown in that frame – measured per clip, chained and listen clips included')
R['head_clear'] = dict(ok=not hits and nchk > 0, checks=nchk, hits=hits[:6], n_hits=len(hits), band=T['band'])
if BD:   # ---- board mode: text on the whiteboard, captions clear of face AND body
    Z = BD['zone']; off_b = []; band_fb = sorted({e['name'] for f in fr for e in els(f) if e['group'] in ('hook', 'pop', 'cta') and e.get('where') == 'band'})
    for f in fr:
        M = f['M']; zs = [M[0] * Z[0] + M[2] - 3, M[4] * Z[1] + M[5] - 3, M[0] * Z[2] + M[2] + 3, M[4] * Z[3] + M[5] + 3]
        for e in els(f):
            if e['group'] not in ('hook', 'pop', 'cta') or e['alpha'] <= 0.004 or e.get('where') != 'board': continue
            if e['x0'] < zs[0] or e['y0'] < zs[1] or e['x1'] > zs[2] or e['y1'] > zs[3]: off_b.append((f['t'], e['name'], [e['x0'], e['y0'], e['x1'], e['y1']], [round(v) for v in zs]))
    kinds = {p['id']: p['kind'] for p in T['pops']}; where = BD['where']
    text_band = [k for k, w in where.items() if w != 'board' and (kinds[k] == 'rich' or k == 'hook')]
    chest = [k for k, w in where.items() if w != 'board' and kinds[k] in ('quiz', 'cta')]   # quiz + CTA are written on the board, never on the chest
    R['text_on_board'] = dict(ok=not off_b and where.get('hook') == 'board' and not [k for k in text_band if k == 'hook'] and not chest, outside_zone=off_b[:4], n_outside=len(off_b), quiz_cta_on_chest=chest,
                              text_pops_on_band=text_band, widgets_on_band=[k for k, w in where.items() if w != 'board' and k not in text_band], zone=Z,
                              note='hook always on the board; a text pop / widget that cannot reach 50 / 52 px on the board falls back to the under-chin band (listed)')
    bm = np.zeros((1920, 1080), bool); st_ = BD['body']['step']
    for row in filter(None, BD['body']['rows'].split(';')):
        y, ivs = row.split(':'); y = int(y)
        for iv in ivs.split(','): a_, b_ = map(int, iv.split('-')); bm[y:y + st_, a_:b_] = True
    ch = []; worst = 0
    for f in fr:
        M = f['M']; s_ = M[0]; tx, ty = M[2], M[5]; heads = [HD[c] for c, k, w in f['src'] if w > 0.02]
        zr = [[s_ * b[0] + tx, s_ * b[1] + ty, s_ * b[2] + tx, s_ * b[3] + ty] for b in heads]
        for e in els(f):
            if e['group'] != 'caption': continue
            bx = [e['x0'], e['y0'], e['x1'], e['y1']]; hh = any(inter(bx, z) for z in zr)
            sx0, sy0, sx1, sy1 = [int(round((bx[0] - tx) / s_)), int(round((bx[1] - ty) / s_)), int(round((bx[2] - tx) / s_)), int(round((bx[3] - ty) / s_))]
            sub = bm[max(0, sy0):max(0, sy1), max(0, sx0):max(0, sx1)]; rows_ = int(sub.any(1).sum()) if sub.size else 0; worst = max(worst, rows_)
            if hh or rows_: ch.append((f['t'], e['name'], e['text'], 'head' if hh else f'body {rows_} rows'))
    R['caption_clear'] = dict(ok=not ch, n_frames=len(ch), worst_body_rows=worst, hits=ch[:5], cap_box=BD['cap_box'],
                              note='caption ink box vs head mask + measured moving-body envelope (any frame, bank.json board.body), in source px')
first, done = {}, {}
for f in fr:
    for wid, p in f['wipe'].items():
        if p > 0 and wid not in first: first[wid] = f['t']
        if p >= 1 and wid not in done: done[wid] = f['t']
d0 = {w: round(first[w] - W_[w]['s'], 3) for w in W_ if w in first}; d1 = {w: round(done[w] - W_[w]['e'], 3) for w in W_ if w in done}
miss = [w for w in W_ if w not in first or w not in done]; late = {w: d for w, d in list(d0.items()) + list(d1.items()) if abs(d) > SYNC}
R['caption_sync'] = dict(ok=bool(W_) and not miss and not late, words=len(W_), max_start_ms=round(1000 * max(map(abs, d0.values()), default=0)),
                         max_end_ms=round(1000 * max(map(abs, d1.values()), default=0)), missing=miss[:6], over=list(late.items())[:6], limit_ms=1000 * SYNC)
chkd = [w for w in W_.values() if w['checked']]; dv = [abs(w['s'] - w['onset']) for w in chkd]; fw = [w for w in W_.values() if w['k'] == 0]
R['align_audio'] = dict(ok=bool(chkd) and all(d <= SYNC for d in dv) and all(w['checked'] for w in fw), checked=len(chkd), words=len(W_),
                        line_starts_checked=sum(w['checked'] for w in fw), lines=len(fw), max_ms=round(1000 * max(dv, default=0)))
spoke = {}
for f in fr:
    for lid, L in T['lines'].items():
        if L['at'] <= f['t'] <= L['at'] + L['dur']: spoke.setdefault(lid, set()).add(f['vis'])
nomouth = [lid for lid in T['lines'] if len(spoke.get(lid, set()) - {'X'}) < 2]
R['lipsync_rhubarb'] = dict(ok=all(str(l.get('gen') or '').startswith('rhubarb') and l['cues'] > 0 for l in T['lines'].values()) and not nomouth, lines_without_mouth_motion=nomouth)
if (T.get('motion') or {}).get('host_fx') == 'raw': R['lipsync_rhubarb'] = dict(ok=True, host_fx='raw', note='raw host (owner 26/10): the mouth is the Kling clip as generated – it talks but is NOT synced word by word to the voice; no swap applied')
# ---- no padding: natural gaps, only declared beats are silent, TTS speed as written
GAP_GATE = 1.05   # natural sentence pause (silence incl. TTS tail); v8 stretched these to hit 25 s
gp = [g for g in T['gaps'] if g['gap'] > GAP_GATE + 0.011]; bt = [b for b in T['beats'].values() if b['kind'] not in ('count', 'turn') or b['e'] - b['s'] > 3.2]
want_speed = {l['id']: l.get('speed', SP.get('speed', 1.0)) for l in SP['lines'] if l.get('text')}
spd = [lid for lid, L in T['lines'].items() if abs(L['speed'] - want_speed[lid]) > 1e-6 or (L['speed'] < 0.65 and lid not in [x['id'] for x in SP['lines'] if x.get('speed')])]   # spec-level teaching pace 0.75–0.8 is declared, not padding
speech_end = max(L['at'] + L['dur'] for L in T['lines'].values())
R['no_pad'] = dict(ok=not gp and not bt and not spd and T['total'] - speech_end <= 1.6 and 18 <= T['total'] <= 45, long_gaps=gp[:4], beats=T['beats'], speed_mismatch=spd,
                   max_gap=max((g['gap'] for g in T['gaps']), default=0), tail=round(T['total'] - speech_end, 2), total=T['total'])
# ---- pace (owner 26/10: v10 "nói hơi nhanh"): teaching speed for learners – articulation <= 240 wpm inside lines (whisper word bounds; sanity cap), overall <= 130 is the target (owner 26/10 second review: still a bit fast), over the talk
_byl = {}
for w_ in T['words'].values(): _byl.setdefault(w_['line'], []).append(w_)
_art_t = sum(max(x['e'] for x in v) - min(x['s'] for x in v) for v in _byl.values()); _nw = sum(len(v) for v in _byl.values())
_span = max(x['e'] for x in T['words'].values()) - min(x['s'] for x in T['words'].values()) - sum(b['e'] - b['s'] for b in T['beats'].values())
_art = 60 * _nw / max(_art_t, 1e-3); _ovr = 60 * _nw / max(_span, 1e-3)
R['pace'] = dict(ok=_art <= 240 and _ovr <= 130, articulation_wpm=round(_art), overall_wpm=round(_ovr), words=_nw, note='articulation = words / time inside spoken lines; overall = words / talk span minus count/turn beats')
# ---- continuity: forward-only source frames, dissolves between talk clips, no reverse playback
rev = []; holds = []; prev = None
CUTS = {j['at_frame'] for j in T['joins'] if j.get('cut') == 'hard'}
n_end = T['xfe']
for i, f in enumerate(fr):
    cur = [(c, k) for c, k, w in f['src']]
    if prev is not None and i < len(fr) - n_end and i not in CUTS:   # gated plan: declared hard cuts (talk <-> listen) are edits, not reverse steps
        for j, (c, k) in enumerate(cur):
            if (c, k - 1) in prev: continue
            if j == 1 and len(cur) == 2 and len(prev) == 1: continue   # first frame of a dissolve: the incoming clip enters here
            (rev if any(pc_ == c and pk > k for pc_, pk in prev) else holds).append((f['t'], c, [p_[1] for p_ in prev if p_[0] == c], k))
    prev = cur
xf_runs = []; run = 0
for f in fr[:len(fr) - n_end]:
    if len(f['src']) > 1: run += 1
    elif run: xf_runs.append(run); run = 0
_gi = [i for k in range(0, T['n'] - 1, 60) for i in range(k, min(T['n'] - 1, k + 60), 6)]
g = [x for k in range(0, T['n'] - 1, 60) for x in frames_px(vid, list(range(k, min(T['n'] - 1, k + 60), 6)))]
BY = int(T['band'][0]) - 8   # cut detector on the host area only (above the pop band): a pop or caption never trips it, a scene cut does
def _host(x):
    if BD:   # board text is drawn above the band: blank the board zone (+ camera margin) so writing never trips the cut detector
        Z = BD['zone']; x = x.copy(); x[max(0, int(Z[1] * 0.94) - 10):int(Z[3] * 1.06) + 10, max(0, int(Z[0] * 0.94) - 10):int(Z[2] * 1.06) + 10] = 0
    return x
hist = lambda x: cv2.calcHist([cv2.resize(_host(x)[:BY], (270, BY // 4))], [0], None, [64], [0, 256]); dd = [1 - float(cv2.compareHist(hist(a), hist(b), cv2.HISTCMP_CORREL)) for (a, b, ia, ib) in zip(g, g[1:], _gi, _gi[1:]) if not any(ia < c_ <= ib for c_ in CUTS)]   # a declared talk/listen cut is an edit, not a scene change
sets = {T['spec']['set']}
R['continuity'] = dict(ok=not rev and not holds and all(r >= 8 for r in xf_runs) and max(dd, default=99) < 0.10 and len(sets) == 1, reverse_steps=rev[:4], holds=holds[:4],
                       dissolves=xf_runs, joins=[(j.get('from_clip'), j.get('exit'), j['to_clip'], j['entry'], j.get('diff', j.get('cut'))) for j in T['joins']], max_hist_change_6f=round(max(dd, default=0), 4),
                       note='forward playback only; talk clips cross-dissolve (10 f) at their best-matching frames; last 10 f dissolve to frame 0 (loop)')
badT = []
for f in fr:
    M = f['M']; w = f['win']
    if abs(M[0] - M[4]) > 1e-6 or M[1] != 0 or M[3] != 0 or M[0] < 1 - 1e-6 or w[0] < -0.01 or w[1] < -0.01 or w[2] > 1080.01 or w[3] > 1920.01: badT.append((f['t'], M))
g0 = frames_px(vid, [0], True); s0 = cv2.imread(vid + '.src0.png'); psnr = 0
if g0 and s0 is not None:
    m = np.ones(s0.shape[:2], bool); hb = HD[SP['clips'][0]]; m[hb[1]:hb[3], hb[0]:hb[2]] = False   # mouth swap lives inside the head box
    mse = float(np.mean((g0[0].astype(np.float32)[m] - s0.astype(np.float32)[m]) ** 2)); psnr = 99 if mse == 0 else 10 * np.log10(255 ** 2 / mse)
R['no_stretch'] = dict(ok=not badT and psnr >= 32, bad_frames=badT[:4], frame0_vs_native_psnr=round(psnr, 2))
ss = [f['s'] for f in fr]; runs = 0; prevup = False
for i in range(1, len(ss)):
    up = ss[i] - ss[i - 1] > 0.0012; runs += up and not prevup; prevup = up
locked = T['smax'] <= 1.0 + 1e-9   # classroom MCU: locked camera (board text + desk-lip captions), no push
R['camera'] = dict(ok=abs(ss[0] - 1) < 1e-6 and abs(ss[-1] - 1) < 1e-6 and max(ss) <= T['smax'] + 1e-6 and ((runs == 0 and max(ss) <= 1 + 1e-9) if locked else 1 <= runs <= 3),
                   max_scale=round(max(ss), 4), punch_ins=runs, locked=locked)
digits = {}
for f in fr:
    for e in els(f):
        if e['digit'] and e['alpha'] >= 0.999: digits[e['digit']] = digits.get(e['digit'], 0) + 1 / fps
has_count = any(b['kind'] == 'count' for b in T['beats'].values())
R['countdown'] = dict(ok=(not has_count) or all(digits.get(k, 0) >= 0.8 for k in '321'), digits={k: round(v, 2) for k, v in digits.items()}, applies=has_count)
LESSON = {'pop.' + p['id'] for p in SP['pops'] if p.get('kind') in ('lesson', 'note')}
out, full, small = [], {}, []
for f in fr:
    for e in els(f):
        if e['alpha'] <= 0.004: continue
        if e['x0'] < SAFE['x0'] or e['x1'] > SAFE['x1'] or e['y0'] < SAFE['y0'] or e['y1'] > SAFE['y1']: out.append((f['t'], e['name'], [e['x0'], e['y0'], e['x1'], e['y1']]))
        if e['group'] != 'caption': full.setdefault(e['name'], []).append(f['t'] if e['alpha'] >= 0.999 else None)
        if e['px'] < (34 if e['name'] in LESSON else MIN_PX) and e['alpha'] >= 0.999: small.append((f['t'], e['name'], e['px']))   # lesson cards: owner-approved mock (38 px examples, >= 0.9x)
R['safe_area'] = dict(ok=not out, safe=SAFE, outside=out[:6], n_outside=len(out))
def vis_runs(ts):
    rs, cur = [], 0
    for x in ts:
        if x is None: (rs.append(cur) if cur else None); cur = 0
        else: cur += 1 / fps
    if cur: rs.append(cur)
    return rs
short = {k: [round(r, 2) for r in vis_runs(v) if r < MIN_READ] for k, v in full.items()}; short = {k: v for k, v in short.items() if v}
R['readability'] = dict(ok=not short and not small, min_visible_s=MIN_READ, too_short=short, too_small=small[:6])
# ---- read time per text line: a text pop (not the hook, hook_readable owns it) is fully visible >= words / 3 per second + 0.6 s
nwords = lambda t: len(re.findall(r"[A-Za-z0-9$][A-Za-z0-9$'’.\-]*", t))
rt = {}
for p_ in T['pops']:
    if p_['kind'] != 'rich' or p_.get('role') == 'hook' or p_['id'] == 'hook': continue
    need = nwords(p_['text']) / 3 + 0.6; got = max(vis_runs(full.get('pop.' + p_['id'], [])), default=0)
    if got + 0.5 / fps < need: rt[p_['id']] = dict(visible=round(got, 2), need=round(need, 2), text=p_['text'])
R['read_time'] = dict(ok=not rt, short=rt, rule='fully visible >= words / 3 + 0.6 s')
g = frames_px(vid, [0, T['n'] - 1]); md = float(np.abs(g[0].astype(np.int16) - g[1].astype(np.int16)).mean()) if len(g) == 2 else 99
tl = [e['name'] for e in els(fr[-1]) if e['alpha'] > 0.004]; tf = [e['name'] for e in els(fr[0]) if e['alpha'] > 0.004 and e['group'] != 'hook']
R['loop_end'] = dict(ok=md <= 3.0 and not tl and not tf, first_last_mean_abs_diff=round(md, 2), els_first=tf, els_last=tl)
ECO = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}; cta = SP['cta']; ctap = POPS.get('cta')
R['cta'] = dict(ok=cta['area'] in ECO and ECO[cta['area']]['link'] == cta['link'] and bool(ctap) and 'lexkite.com' in ctap['text'] and any('lexkite.com' in s_ for s_ in S.values()),
                area=cta['area'], link=cta['link'], on_screen=ctap and ctap['text'])
R['emoji'] = dict(ok=all(v == 'noto' for v in T['emoji'].values()), used=T['emoji'])
Sh = T['sharp']; up = [x['var_render'] / max(1e-6, x['var_native']) for x in Sh]
gs = frames_px(vid, [x['frame'] for x in Sh]); enc = []
for x, ge in zip(Sh, gs):
    rp = f"{vid}.samples/f{x['frame']:04d}.png"; r = x['rect']
    if os.path.exists(rp): gr = cv2.cvtColor(cv2.imread(rp), cv2.COLOR_BGR2GRAY); enc.append(lap(ge[r[1]:r[3], r[0]:r[2]]) / max(1e-6, lap(gr[r[1]:r[3], r[0]:r[2]])))
R['host_sharp'] = dict(ok=bool(Sh) and len(enc) == len(Sh) and med(up) >= 0.80 and min(up) >= 0.65 and med(enc) >= 0.80,
                       push_vs_native_median=round(med(up), 3), push_vs_native_min=round(min(up, default=0), 3), encoded_vs_rendered_median=round(med(enc), 3), samples=len(Sh))
prb = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,width,height,bit_rate,r_frame_rate', '-of', 'json', vid], capture_output=True, text=True).stdout)
v = [s_ for s_ in prb['streams'] if s_['codec_type'] == 'video'][0]; dur = float(prb['format']['duration']); vb = int(v.get('bit_rate') or 0) / 1e6
R['file'] = dict(ok=18 <= dur <= 45.5 and (v['width'], v['height']) == (1080, 1920) and 8.0 <= vb <= 9.5, duration=round(dur, 2), video_mbps=round(vb, 2), size_mb=round(int(prb['format']['size']) / 1e6, 1), fps=v['r_frame_rate'])
fails = [k for k, r in R.items() if not r['ok']]
J = lambda x: x.item() if hasattr(x, 'item') else str(x)
json.dump(dict(video=vid, template=SP['template'], ok=not fails, failed=fails, gates=R), open(vid + '.qc.json', 'w'), indent=1, default=J)
for k, r in R.items(): print(('PASS ' if r['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in r.items() if a != 'ok'}, ensure_ascii=False, default=J)[:420])
print(f"{vid}: {'OK' if not fails else 'FAILED ' + ','.join(fails)} ({len(R) - len(fails)}/{len(R)} gates)")
sys.exit(0 if not fails else 1)
