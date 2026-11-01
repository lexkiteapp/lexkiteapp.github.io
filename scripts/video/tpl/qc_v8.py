#!/usr/bin/env python3
"""QC gates for the pilot v8 one-shot talking head (docs/VIDEO-TEMPLATES.md §13). python3 scripts/video/tpl/qc_v8.py <video.mp4> [reviewed-hooks.json]
Reads <video>.timeline.json + <video>.samples/ + <video>.src0.png written by render_v8.py; decodes the encoded file where a gate needs pixels. Exit 1 on any fail.
Gates: hook_truth (reviewed-hooks.json verdict, on-screen quote == reviewed wrong line, correct pop == tail of the reviewed right line) · hook_readable (top hook
fully visible at 1.0 s, gone by 2.8 s) · caption_script (caption text == script text, word for word, display map only; 2-3 words per page; the error appears
only in the marked wrong line) · caption_style · caption_clear (captions never touch the head zone, no text/icon touches the face zone, zones moved with the camera) ·
caption_sync (karaoke <= 50 ms) · align_audio · lipsync_rhubarb · single_shot (one clip, continuous source frames, no cuts) · no_stretch (uniform scale >= 1 about the
anchor, window inside the source, frame 0 == native source frame) · camera (slow push + 1-2 punch-ins, <= smax) · quiz (3-2-1 + A/B pills) · safe_area · readability ·
loop_end · host_sharp · file (25-30.5 s, 1080x1920, 8-9.5 Mbps)."""
import sys, os, re, json, subprocess
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import SAFE, MIN_READ, MIN_PX
SYNC = 0.050
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..'))
def frames_gray(vid, idx, color=False):
    sel = '+'.join(f"eq(n\\,{i})" for i in idx); pf, ch = ('bgr24', 3) if color else ('gray', 1)
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', vid, '-vf', f"select='{sel}'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', pf, '-'], capture_output=True).stdout
    n = 1080 * 1920 * ch; return [np.frombuffer(raw[j * n:(j + 1) * n], np.uint8).reshape((1920, 1080, ch) if color else (1920, 1080)) for j in range(len(raw) // n)]
lap = lambda g: float(cv2.Laplacian(g, cv2.CV_64F).var())
med = lambda a: sorted(a)[len(a) // 2] if a else 0
norm = lambda s: re.sub(r"[^a-z0-9' ]", '', s.lower().replace('✓', '')).split()
def inter(a, b): return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
vid = sys.argv[1]; hooks = sys.argv[2] if len(sys.argv) > 2 else f'{ROOT}/content/video/cine/news/tpl1b/reviewed-hooks.json'
T = json.load(open(vid + '.timeline.json')); fr = T['frames']; fps = T['fps']; R = {}
els = lambda f: [dict(zip(('name', 'text', 'x0', 'y0', 'x1', 'y1', 'alpha', 'px', 'group'), e)) for e in f['els']]
at = lambda t: min(fr, key=lambda f: abs(f['t'] - t))
# ---- hook truth: verdict re-read from the reviewed file (not from the timeline)
HV = (json.load(open(hooks))['verdicts']).get(T['lesson']['id']) or {}; Lz = T['lesson']; S = T['script']
corr = norm(T['correct_pop']); right = norm(HV.get('right', ''))
hk = dict(verdict=bool(HV), hook_true=HV.get('hook_true') is True, right_ok=HV.get('right_ok') is True, wrong_is_error=HV.get('wrong_is_error') is True,
          lesson_matches=HV.get('wrong') == Lz['wrong'] and HV.get('right') == Lz['right'] and not Lz.get('reject'),
          quote_is_reviewed_wrong=T['hook_quote'] == '“' + HV.get('wrong', '') + '”' and T['hook_quote'] in T['hook_full'],
          spoken_wrong=S.get('v8_w') == HV.get('wrong'), spoken_right=HV.get('right', '#') in S.get('v8_k', '') and HV.get('right', '#') in S.get('v8_a', ''),
          correct_pop_is_right=bool(corr) and right[-len(corr):] == corr)
R['hook_truth'] = dict(ok=all(hk.values()), checks=hk, wrong=HV.get('wrong'), right=HV.get('right'), note=HV.get('note'))
f1 = at(1.0); v1 = {e['name']: e for e in els(f1)}; h = v1.get('top.hook')
gone = all('top.hook' not in [e['name'] for e in els(f)] for f in fr if f['t'] >= 2.8)
first_on = min([f['t'] for f in fr if any(e['name'] == 'top.hook' and e['alpha'] >= 0.999 for e in els(f))], default=99)
R['hook_readable'] = dict(ok=bool(h) and h['alpha'] >= 0.999 and h['text'] == T['hook_full'] and h['px'] >= 64 and gone and first_on <= 0.35,
                          text=h and h['text'], px=h and h['px'], fully_visible_from=first_on, gone_by_2_8=gone)
# ---- captions == script
W_ = T['words']; CP = T['captions']; D = T.get('display', {}); bad = []
inv = lambda w: next((k + w[len(v):] for k, v in D.items() if w.startswith(v)), w)
for lid, txt in S.items():
    pages = [c for c in CP.values() if c['line'] == lid]; cap = ' '.join(inv(x) for c in pages for x in c['text'].split())
    toks = [W_[w]['w'] for c in pages for w in c['words']]
    if cap != txt or ' '.join(toks) != txt: bad.append((lid, cap, txt))
sizes = [c['n'] for c in CP.values()]; single_bad = [c['text'] for c in CP.values() if c['n'] == 1 and c['text'][-1] not in '.?!']
err_lines = sorted({c['line'] for c in CP.values() if 'is change' in c['text'].lower() or re.search(r"\bit's has\b", c['text'].lower())})
R['caption_script'] = dict(ok=bool(CP) and not bad and max(sizes) <= 3 and not single_bad and err_lines in ([], ['v8_w']) and
                           all(re.search(r"\bit's has\b", s_.lower()) is None for s_ in S.values()),
                           pages=len(CP), words_per_page=sorted(set(sizes)), mismatch=bad[:3], single_word_pages=single_bad, error_only_in=err_lines,
                           note='captions = script tokens (lines.json) + TTS word times; whisper transcript is logged for reference only')
R['caption_style'] = dict(ok=min(c['size'] for c in CP.values()) >= 72 and min(c['stroke'] for c in CP.values()) >= 10 and min(c['ss'] for c in CP.values()) >= 2,
                          sizes=sorted({c['size'] for c in CP.values()}), stroke=sorted({c['stroke'] for c in CP.values()}))
Z = T['zones']; hits = []; nchk = 0
for f in fr:
    M = f['M']; zr = {k: [M[0] * b[0] + M[2], M[4] * b[1] + M[5], M[0] * b[2] + M[2], M[4] * b[3] + M[5]] for k, b in Z.items()}
    for e in els(f):
        if e['alpha'] <= 0.004: continue
        bx = [e['x0'], e['y0'], e['x1'], e['y1']]
        for zn in (['head', 'face'] if e['group'] == 'caption' else ['face']):
            nchk += 1
            if inter(bx, zr[zn]): hits.append((f['t'], e['name'], zn))
R['caption_clear'] = dict(ok=not hits and nchk > 0, checks=nchk, hits=hits[:6], n_hits=len(hits))
first, done = {}, {}
for f in fr:
    for wid, p in f['wipe'].items():
        if p > 0 and wid not in first: first[wid] = f['t']
        if p >= 1 and wid not in done: done[wid] = f['t']
d0 = {w: round(first[w] - W_[w]['s'], 3) for w in W_ if w in first}; d1 = {w: round(done[w] - W_[w]['e'], 3) for w in W_ if w in done}
miss = [w for w in W_ if w not in first or w not in done]; late = {w: d for w, d in list(d0.items()) + list(d1.items()) if abs(d) > SYNC}
R['caption_sync'] = dict(ok=bool(W_) and not miss and not late, words=len(W_), max_start_ms=round(1000 * max(map(abs, d0.values()), default=0)),
                         max_end_ms=round(1000 * max(map(abs, d1.values()), default=0)), missing=miss[:6], over=list(late.items())[:6], limit_ms=1000 * SYNC)
chk = [w for w in W_.values() if w['checked']]; dv = [abs(w['s'] - w['onset']) for w in chk]; fw = [w for w in W_.values() if w['k'] == 0]
R['align_audio'] = dict(ok=bool(chk) and all(d <= SYNC for d in dv) and all(w['checked'] for w in fw), checked=len(chk), words=len(W_),
                        line_starts_checked=sum(w['checked'] for w in fw), lines=len(fw), max_ms=round(1000 * max(dv, default=0)))
spoke = {}
for f in fr:
    for lid, L in T['lines'].items():
        if L['at'] <= f['t'] <= L['at'] + L['dur']: spoke.setdefault(lid, set()).update(f['vis'].values())
nomouth = [lid for lid in T['lines'] if len(spoke.get(lid, set()) - {'X'}) < 2]
R['lipsync_rhubarb'] = dict(ok=all(str(l.get('gen') or '').startswith('rhubarb') and l['cues'] > 0 for l in T['lines'].values()) and not nomouth, lines_without_mouth_motion=nomouth)
# ---- one continuous shot
src = [f['src'] for f in fr]; jumps = [(fr[i]['t'], src[i - 1], src[i]) for i in range(1, len(src)) if abs(src[i] - src[i - 1]) > 1]
g = [x for k in range(0, T['n'] - 1, 60) for x in frames_gray(vid, list(range(k, min(T['n'] - 1, k + 60), 6)))]; hist = lambda x: cv2.calcHist([cv2.resize(x, (270, 480))], [0], None, [64], [0, 256]); dd = [1 - float(cv2.compareHist(hist(a), hist(b), cv2.HISTCMP_CORREL)) for a, b in zip(g, g[1:])]   # cut detector: luma histogram (a zoom or a caption keeps it, a scene cut breaks it)
R['single_shot'] = dict(ok=not jumps and len(fr) == T['n'] and bool(T['clip']) and len(g) >= T['n'] // 6 - 1 and max(dd, default=99) < 0.10, decoded=len(g), clip=T['clip'], source_jumps=jumps[:4],
                        max_hist_change_6f=round(max(dd, default=0), 4), note='one bank clip, ping-pong source frames, no cut to another clip or scene')
badT = []
for f in fr:
    M = f['M']; w = f['win']; sw, sh_ = T['src_size']
    if abs(M[0] - M[4]) > 1e-6 or M[1] != 0 or M[3] != 0 or M[0] < 1 - 1e-6 or w[0] < -0.01 or w[1] < -0.01 or w[2] > sw + 0.01 or w[3] > sh_ + 0.01: badT.append((f['t'], M))
g0 = frames_gray(vid, [0], True); s0 = cv2.imread(vid + '.src0.png'); psnr = 0
if g0 and s0 is not None:
    m = np.ones(s0.shape[:2], bool); m[400:900, 280:740] = False   # mouth swap region excluded
    mse = float(np.mean((g0[0].astype(np.float32)[m] - s0.astype(np.float32)[m]) ** 2)); psnr = 99 if mse == 0 else 10 * np.log10(255 ** 2 / mse)
R['no_stretch'] = dict(ok=not badT and psnr >= 32, bad_frames=badT[:4], frame0_vs_native_psnr=round(psnr, 2), note='uniform scale about the anchor, window inside the clip; frame 0 is the native bank frame')
ss = [f['s'] for f in fr]; smax = T['v8']['smax']
peaks = sum(1 for i in range(1, len(ss) - 1) if ss[i] - ss[i - 1] > 0.0012)   # fast rises = punch-in frames
runs = 0; prev = False
for i in range(1, len(ss)):
    up = ss[i] - ss[i - 1] > 0.0012; runs += up and not prev; prev = up
R['camera'] = dict(ok=abs(ss[0] - 1) < 1e-6 and abs(ss[-1] - 1) < 1e-6 and max(ss) <= smax + 1e-6 and 1 <= runs <= 2, max_scale=round(max(ss), 4), punch_ins=runs, start=ss[0], end=ss[-1])
c0 = T['count'][0]; digits = {}
for f in fr:
    for e in els(f):
        if e['name'].startswith('count.') and e['alpha'] >= 0.999: digits[e['text']] = digits.get(e['text'], 0) + 1 / fps
pills = {e['name'] for f in fr for e in els(f) if e['name'].startswith('pill.')}
R['quiz'] = dict(ok=all(digits.get(k, 0) >= 0.8 for k in '321') and pills == {'pill.a', 'pill.b'}, digits={k: round(v, 2) for k, v in digits.items()}, pills=sorted(pills))
out, full, small = [], {}, []
for f in fr:
    for e in els(f):
        if e['alpha'] <= 0.004 or not e['text']: continue
        if e['x0'] < SAFE['x0'] or e['x1'] > SAFE['x1'] or e['y0'] < SAFE['y0'] or e['y1'] > SAFE['y1']: out.append((f['t'], e['name'], [e['x0'], e['y0'], e['x1'], e['y1']]))
        if e['group'] in ('pop', 'pill'):
            nm = e['name']; full.setdefault(nm, []).append(f['t'] if e['alpha'] >= 0.999 else None)
        if e['px'] < MIN_PX and e['alpha'] >= 0.999: small.append((f['t'], e['name'], e['px']))
icons_out = [(f['t'], e['name']) for f in fr for e in els(f) if e['group'] == 'icon' and (e['x1'] > SAFE['x1'] + 2 or e['y0'] < SAFE['y0'])]
R['safe_area'] = dict(ok=not out and not icons_out, safe=SAFE, outside=out[:6], n_outside=len(out), icons_outside=icons_out[:3])
def vis_runs(ts):
    rs, cur = [], 0
    for x in ts:
        if x is None: (rs.append(cur) if cur else None); cur = 0
        else: cur += 1 / fps
    if cur: rs.append(cur)
    return rs
short = {k: [round(r, 2) for r in vis_runs(v) if r < MIN_READ] for k, v in full.items() if not k.startswith('count.')}
short = {k: v for k, v in short.items() if v}
R['readability'] = dict(ok=not short and not small, min_visible_s=MIN_READ, too_short=short, too_small=small[:6])
g = frames_gray(vid, [0, T['n'] - 1]); md = float(np.abs(g[0].astype(np.int16) - g[1].astype(np.int16)).mean()) if len(g) == 2 else 99
tl = [e['name'] for e in els(fr[-1]) if e['alpha'] > 0.004 and e['text']]; tf = [e['name'] for e in els(fr[0]) if e['alpha'] > 0.004 and e['text']]
R['loop_end'] = dict(ok=md <= 3.0 and not tl and not tf and str((T.get('cta') or {}).get('link') or '').startswith('https://lexkite.com/') and 'lexkite.com' in T['cta']['text'],
                     first_last_mean_abs_diff=round(md, 2), text_first=tf, text_last=tl, cta=T['cta'])
Sh = T['sharp']; up = [x['var_render'] / max(1e-6, x['var_native']) for x in Sh]
gs = frames_gray(vid, [x['frame'] for x in Sh]); enc = []
for x, ge in zip(Sh, gs):
    rp = f"{vid}.samples/f{x['frame']:04d}.png"; r = x['rect']
    if os.path.exists(rp): gr = cv2.cvtColor(cv2.imread(rp), cv2.COLOR_BGR2GRAY); enc.append(lap(ge[r[1]:r[3], r[0]:r[2]]) / max(1e-6, lap(gr[r[1]:r[3], r[0]:r[2]])))
R['host_sharp'] = dict(ok=bool(Sh) and len(enc) == len(Sh) and med(up) >= 0.80 and min(up) >= 0.70 and med(enc) >= 0.80,
                       push_vs_native_median=round(med(up), 3), push_vs_native_min=round(min(up, default=0), 3), encoded_vs_rendered_median=round(med(enc), 3), samples=len(Sh))
pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,width,height,bit_rate,r_frame_rate', '-of', 'json', vid], capture_output=True, text=True).stdout)
v = [s_ for s_ in pr['streams'] if s_['codec_type'] == 'video'][0]; dur = float(pr['format']['duration']); vb = int(v.get('bit_rate') or 0) / 1e6
R['file'] = dict(ok=25 <= dur <= 30.5 and (v['width'], v['height']) == (1080, 1920) and 8.0 <= vb <= 9.5, duration=round(dur, 2), video_mbps=round(vb, 2), size_mb=round(int(pr['format']['size']) / 1e6, 1), fps=v['r_frame_rate'])
fails = [k for k, r in R.items() if not r['ok']]
json.dump(dict(video=vid, ok=not fails, failed=fails, emoji=T.get('emoji'), gates=R), open(vid + '.qc.json', 'w'), indent=1, default=lambda x: x.item() if hasattr(x, 'item') else str(x))
for k, r in R.items(): print(('PASS ' if r['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in r.items() if a != 'ok'}, ensure_ascii=False, default=lambda x: x.item() if hasattr(x, 'item') else str(x))[:500])
print(f"{vid}: {'OK' if not fails else 'FAILED ' + ','.join(fails)} ({len(R) - len(fails)}/{len(R)} gates), emoji={T.get('emoji')}")
sys.exit(0 if not fails else 1)
