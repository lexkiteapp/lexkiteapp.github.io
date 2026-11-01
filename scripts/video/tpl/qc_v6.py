#!/usr/bin/env python3
"""QC gates for the pilot v6 presenter show (docs/VIDEO-TEMPLATES.md §11). python3 scripts/video/tpl/qc_v6.py <video.mp4>
Reads <video>.timeline.json + <video>.samples/ written by render_v6.py, decodes the encoded file where a gate needs pixels. Exit 1 on any fail; writes <video>.qc.json.
Gates: hook_truth · hook_readable · safe_area · readability · caption_layout · caption_sync (karaoke wipe start/end vs word times <= 50 ms) ·
align_audio (word starts after a pause = measured speech onset <= 50 ms; whisper drift reported) · lipsync_rhubarb · scene_native · lower_third ·
loop_end (encoded last frame == first frame, no text, CTA deep link) · host_sharp (no upscale blur vs the native bank frame + no encode blur) ·
no_light_panels · file (25-35 s, 1080x1920, 8-9.5 Mbps video)."""
import sys, os, json, subprocess, hashlib
import numpy as np, cv2
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import SAFE, MIN_READ, MIN_PX
SYNC = 0.050
def frames_gray(vid, idx):
    sel = '+'.join(f"eq(n\\,{i})" for i in idx)
    raw = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', vid, '-vf', f"select='{sel}'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
    n = 1080 * 1920; return [np.frombuffer(raw[j * n:(j + 1) * n], np.uint8).reshape(1920, 1080) for j in range(len(raw) // n)]
lap = lambda g: float(cv2.Laplacian(g, cv2.CV_64F).var())
ok_all = True
for vid in sys.argv[1:]:
    T = json.load(open(vid + '.timeline.json')); fr = T['frames']; fps = T['fps']; R = {}
    els = lambda f: [dict(zip(('name', 'text', 'x0', 'y0', 'x1', 'y1', 'alpha', 'px', 'group'), e)) for e in f['els']]
    # hook truth: reviewed verdict for THIS hook text / wrong / right (same hash as tpl1b-pipeline + hook-judge)
    Lz = T['lesson']; hk = Lz.get('hook') or {}; jd = hk.get('judge') or {}
    cur = hashlib.sha1('\n'.join([Lz.get('hook_text') or '', Lz.get('wrong') or '', Lz.get('right') or '']).encode()).hexdigest()[:12]
    R['hook_truth'] = dict(ok=bool(jd) and jd.get('hash') == cur and jd.get('right_ok') is True and jd.get('hook_true') is True and not Lz.get('reject') and (hk.get('mode') == 'soft' or jd.get('wrong_is_error') is True),
                           hash=cur, judge_hash=jd.get('hash'), wrong_is_error=jd.get('wrong_is_error'), model=jd.get('model'), note=jd.get('note'))
    f15 = min(fr, key=lambda f: abs(f['t'] - 1.5)); vis = {e['name']: e for e in els(f15) if e['alpha'] >= 0.999}
    shown = ' '.join(vis[n]['text'] for n in T['hook_blocks'] if n in vis)
    R['hook_readable'] = dict(ok=shown == T['hook_full'], at=f15['t'], expected=T['hook_full'], visible=shown)
    # safe area + readability (screen + overlays; captions follow the voice -> caption_sync instead)
    out, full, small = [], {}, []
    for f in fr:
        for e in els(f):
            if e['alpha'] <= 0.004 or not e['text']: continue
            if e['x0'] < SAFE['x0'] or e['x1'] > SAFE['x1'] or e['y0'] < SAFE['y0'] or e['y1'] > SAFE['y1']: out.append((f['t'], e['name'], [e['x0'], e['y0'], e['x1'], e['y1']]))
            if e['group'] != 'caption':
                if e['alpha'] >= 0.999: full[e['name']] = full.get(e['name'], 0) + 1 / fps
                else: full.setdefault(e['name'], 0)
            if e['px'] < MIN_PX: small.append((f['t'], e['name'], e['px']))
    R['safe_area'] = dict(ok=not out, safe=SAFE, outside=out[:6], n_outside=len(out))
    short = {k: round(v, 2) for k, v in full.items() if v < MIN_READ}
    R['readability'] = dict(ok=not short and not small, min_visible_s=MIN_READ, too_short=short, too_small=small[:6], blocks=len(full))
    CP = T['captions']; bad = {k: (c['lines'], len(c['words'])) for k, c in CP.items() if c['lines'] > 2 or len(c['words']) > 8}
    R['caption_layout'] = dict(ok=bool(CP) and not bad, pages=len(CP), bad=bad, sizes=sorted({c['size'] for c in CP.values()}))
    # karaoke sync: frame interval [t, t+1/fps) shows the wipe started (>0) / finished (=1); error = frame start vs word start/end
    W = T['words']; first, done = {}, {}
    for f in fr:
        for wid, p in f['wipe'].items():
            if p > 0 and wid not in first: first[wid] = f['t']
            if p >= 1 and wid not in done: done[wid] = f['t']
    d0 = {w: round(first[w] - W[w]['s'], 3) for w in W if w in first}; d1 = {w: round(done[w] - W[w]['e'], 3) for w in W if w in done}
    miss = [w for w in W if w not in first or w not in done]; late = {w: d for w, d in list(d0.items()) + list(d1.items()) if abs(d) > SYNC}
    R['caption_sync'] = dict(ok=bool(W) and not miss and not late, words=len(W), max_start_ms=round(1000 * max(map(abs, d0.values()), default=0)), max_end_ms=round(1000 * max(map(abs, d1.values()), default=0)),
                             missing=miss[:6], over=list(late.items())[:6], limit_ms=1000 * SYNC)
    # word times vs the audio: every word after a pause must sit on a measured speech onset
    chk = [w for w in W.values() if w['checked']]
    dr = [abs(w['raw_s'] - w['onset']) for w in chk]; dv = [abs(w['s'] - w['onset']) for w in chk]
    first_words = [w for w in W.values() if w['k'] == 0]
    R['align_audio'] = dict(ok=bool(chk) and all(d <= SYNC for d in dv) and all(w['checked'] for w in first_words), checked=len(chk), words=len(W),
                            line_starts_checked=sum(w['checked'] for w in first_words), lines=len(first_words), max_ms=round(1000 * max(dv, default=0)),
                            whisper_raw_ms_max=round(1000 * max(dr, default=0)), whisper_raw_ms_median=round(1000 * sorted(dr)[len(dr) // 2]) if dr else None,
                            note='in-run words (no pause before them) keep the faster-whisper time: not independently measurable on the waveform')
    R['lipsync_rhubarb'] = dict(ok=all(str(l.get('gen') or '').startswith('rhubarb') and l['cues'] > 0 for l in T['lines'].values()), lines={k: l.get('gen') for k, l in T['lines'].items()})
    clips = sorted({f['clip'] for f in fr})
    R['scene_native'] = dict(ok=T.get('scene_bank') == 'anchor' and all(f['clip'] for f in fr), clips=clips, note='every frame = a native anchor-bank frame (host generated inside the set), mouth swap only')
    lt = [f['lt'] for f in fr]; lt15 = f15['lt']; after = max((f['lt'] for f in fr if f['t'] >= 3.0), default=0)
    R['lower_third'] = dict(ok=lt15 >= 0.999 and after == 0 and fr[0]['lt'] == 0, at_1_5=lt15, after_3s=after)
    # loop: encoded last frame == encoded first frame, no text on either, CTA deep link
    g = frames_gray(vid, [0, T['n'] - 1]); md = float(np.abs(g[0].astype(np.int16) - g[1].astype(np.int16)).mean()) if len(g) == 2 else 99
    txt_last = [e['name'] for e in els(fr[-1]) if e['alpha'] > 0.004]; txt_first = [e['name'] for e in els(fr[0]) if e['alpha'] > 0.004]
    R['loop_end'] = dict(ok=md <= 3.0 and not txt_last and not txt_first and str((T.get('cta') or {}).get('link') or '').startswith('https://lexkite.com/'),
                         first_last_mean_abs_diff=round(md, 2), text_first=txt_first, text_last=txt_last, cta=(T.get('cta') or {}).get('link'))
    # sharpness: (a) rendered face vs the native bank face (camera push must not blur) (b) encoded vs rendered (encode must not blur)
    S = T['sharp']; up = [x['var_render'] / max(1e-6, x['var_native']) for x in S]
    gs = frames_gray(vid, [x['frame'] for x in S]); enc = []
    for x, ge in zip(S, gs):
        rp = f"{vid}.samples/f{x['frame']:04d}.png"; r = x['rect']
        if os.path.exists(rp): gr = cv2.cvtColor(cv2.imread(rp), cv2.COLOR_BGR2GRAY); enc.append(lap(ge[r[1]:r[3], r[0]:r[2]]) / max(1e-6, lap(gr[r[1]:r[3], r[0]:r[2]])))
    med = lambda a: sorted(a)[len(a) // 2] if a else 0
    smax = max(f['s'] for f in fr)
    R['host_sharp'] = dict(ok=bool(S) and len(enc) == len(S) and med(up) >= 0.80 and min(up) >= 0.70 and med(enc) >= 0.80 and smax <= T['v6']['punch'] + 1e-3,
                           push_vs_native_median=round(med(up), 3), push_vs_native_min=round(min(up, default=0), 3), encoded_vs_rendered_median=round(med(enc), 3),
                           encoded_vs_rendered_min=round(min(enc, default=0), 3), samples=len(S), max_scale=smax)
    P = [x['luma'] for x in T['panel']]
    R['no_light_panels'] = dict(ok=bool(P) and max(P) <= 110, max_luma=max(P, default=None), median_luma=med(P), samples=len(P))
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,width,height,bit_rate,r_frame_rate', '-of', 'json', vid], capture_output=True, text=True).stdout)
    v = [s_ for s_ in pr['streams'] if s_['codec_type'] == 'video'][0]; dur = float(pr['format']['duration']); vb = int(v.get('bit_rate') or 0) / 1e6
    R['file'] = dict(ok=25 <= dur <= 35 and (v['width'], v['height']) == (1080, 1920) and 8.0 <= vb <= 9.5, duration=round(dur, 2), video_mbps=round(vb, 2), size_mb=round(int(pr['format']['size']) / 1e6, 1), fps=v['r_frame_rate'])
    fails = [k for k, r in R.items() if not r['ok']]; ok_all &= not fails
    json.dump(dict(video=vid, ok=not fails, failed=fails, gates=R), open(vid + '.qc.json', 'w'), indent=1)
    for k, r in R.items(): print(('PASS ' if r['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in r.items() if a != 'ok'}, ensure_ascii=False)[:400])
    print(f"{vid}: {'OK' if not fails else 'FAILED ' + ','.join(fails)} ({len(R) - len(fails)}/{len(R)} gates)")
sys.exit(0 if ok_all else 1)
