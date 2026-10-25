#!/usr/bin/env python3
"""QC gates for the pilot v7 news + scene show (docs/VIDEO-TEMPLATES.md §12). python3 scripts/video/tpl/qc_v7.py <video.mp4>
Reads <video>.timeline.json + <video>.samples/ written by render_v7.py, decodes the encoded file where a gate needs pixels. Exit 1 on any fail; writes <video>.qc.json.
Gates: hook_truth · hook_readable · structure (anchor hook -> scene wrong X -> scene right check -> anchor rule/examples -> quiz 3-2-1 -> end card;
angles alternate; punch-ins; scene reaction shot) · safe_area · readability · caption_layout · caption_style (>= 64 px, stroke >= 10, 2x supersampled) ·
caption_clear (caption ink+stroke never touches a protected face/torso/prop zone) · caption_sync (karaoke wipe <= 50 ms) · align_audio · lipsync_rhubarb ·
scene_native (anchor + airport bank frames only, no cut-out) · no_stretch (uniform similarity, scale >= 1, source window inside the clip + top-band texture) ·
no_name_lower_third · loop_end · host_sharp · no_light_panels · file (25-35 s, 1080x1920, 8-9.5 Mbps video)."""
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
med = lambda a: sorted(a)[len(a) // 2] if a else 0
def inter(a, b): return a[0] < b[2] and b[0] < a[2] and a[1] < b[3] and b[1] < a[3]
ok_all = True
for vid in sys.argv[1:]:
    T = json.load(open(vid + '.timeline.json')); fr = T['frames']; fps = T['fps']; R = {}; SH = T['shots']
    els = lambda f: [dict(zip(('name', 'text', 'x0', 'y0', 'x1', 'y1', 'alpha', 'px', 'group'), e)) for e in f['els']]
    Lz = T['lesson']; hk = Lz.get('hook') or {}; jd = hk.get('judge') or {}
    cur = hashlib.sha1('\n'.join([Lz.get('hook_text') or '', Lz.get('wrong') or '', Lz.get('right') or '']).encode()).hexdigest()[:12]
    R['hook_truth'] = dict(ok=bool(jd) and jd.get('hash') == cur and jd.get('right_ok') is True and jd.get('hook_true') is True and not Lz.get('reject') and (hk.get('mode') == 'soft' or jd.get('wrong_is_error') is True),
                           hash=cur, judge_hash=jd.get('hash'), wrong_is_error=jd.get('wrong_is_error'), model=jd.get('model'), note=jd.get('note'))
    f15 = min(fr, key=lambda f: abs(f['t'] - 1.5)); vis = {e['name']: e for e in els(f15) if e['alpha'] >= 0.999}
    shown = ' '.join(vis[n]['text'] for n in T['hook_blocks'] if n in vis)
    R['hook_readable'] = dict(ok=shown == T['hook_full'] and f15['bank'] == 'anchor', at=f15['t'], expected=T['hook_full'], visible=shown, shot=f15['shot'])
    # structure: TV grammar of the brief
    ids = [s['id'] for s in SH]; banks = [s['bank'] for s in SH]; ls = T['line_shot']; sh_of = {s['id']: s for s in SH}
    first_scene = banks.index('airport') if 'airport' in banks else 99; last_scene = len(banks) - 1 - banks[::-1].index('airport') if 'airport' in banks else -1
    wrong_sh, right_sh = sh_of.get(ls.get('v7_w')), sh_of.get(ls.get('v7_k'))
    cnt = sh_of.get('count'); anchor_kinds = sorted({s['kind'] for s in SH if s['bank'] == 'anchor'})
    angle_cuts = sum(1 for a, b in zip(SH, SH[1:]) if a['bank'] == b['bank'] == 'anchor' and a['kind'] != b['kind']) + sum(1 for a, b in zip(SH, SH[1:]) if a['bank'] != b['bank'])
    react = [s['id'] for s in SH if s['bank'] == 'airport' and (s['raw'] or (not s['lines']))]
    st = dict(hook_anchor_screen=SH[0]['bank'] == 'anchor' and SH[0]['screen'] == 'hook' and SH[0]['f0'] == 0 and SH[1]['f0'] / fps <= 2.2,
              scene_block=all(b == 'airport' for b in banks[first_scene:last_scene + 1]) and first_scene == 1,
              wrong_in_scene_with_x=bool(wrong_sh) and wrong_sh['bank'] == 'airport' and wrong_sh['mark'] == 'x',
              right_in_scene_with_check=bool(right_sh) and right_sh['bank'] == 'airport' and right_sh['mark'] == 'ok' and right_sh['f0'] > wrong_sh['f0'],
              back_to_anchor_rule=sh_of[ls['v7_y']]['bank'] == 'anchor' and sh_of[ls['v7_x']]['screen'] == 'ex' and sh_of[ls['v7_y']]['f0'] > SH[last_scene]['f0'],
              quiz_countdown_3s_on_screen=bool(cnt) and cnt['screen'] == 'quiz' and abs(cnt['n'] / fps - 3.0) < 0.05,
              end_card_last=SH[-1]['screen'] == 'end', two_anchor_angles=len(anchor_kinds) >= 2, punch_ins=sum(s['cam'] == 'punch' for s in SH) >= 2,
              scene_reaction=bool(react))
    R['structure'] = dict(ok=all(st.values()), checks=st, shots=[f"{s['id']}:{s['bank']}:{s['kind']}@{s['f0'] / fps:.2f}" for s in SH], angle_cuts=angle_cuts, anchor_angles=anchor_kinds, reactions=react)
    # safe area + readability (screen + badges; captions follow the voice -> caption_sync instead)
    out, full, small = [], {}, []
    for f in fr:
        for e in els(f):
            if e['alpha'] <= 0.004 or not e['text']: continue
            if e['x0'] < SAFE['x0'] or e['x1'] > SAFE['x1'] or e['y0'] < SAFE['y0'] or e['y1'] > SAFE['y1']: out.append((f['t'], e['name'], [e['x0'], e['y0'], e['x1'], e['y1']]))
            if e['group'] == 'screen':
                if e['alpha'] >= 0.999: full[e['name']] = full.get(e['name'], 0) + 1 / fps
                else: full.setdefault(e['name'], 0)
            if e['px'] < MIN_PX: small.append((f['t'], e['name'], e['px']))
    R['safe_area'] = dict(ok=not out, safe=SAFE, outside=out[:6], n_outside=len(out))
    short = {k: round(v, 2) for k, v in full.items() if v < MIN_READ}
    R['readability'] = dict(ok=not short and not small, min_visible_s=MIN_READ, too_short=short, too_small=small[:6], blocks=len(full))
    CP = T['captions']; bad = {k: (c['lines'], len(c['words'])) for k, c in CP.items() if c['lines'] > T['v7']['cap'][c['mode']]['lines'] or len(c['words']) > 8}
    R['caption_layout'] = dict(ok=bool(CP) and not bad, pages=len(CP), bad=bad, modes=sorted({c['mode'] for c in CP.values()}))
    R['caption_style'] = dict(ok=bool(CP) and min(c['size'] for c in CP.values()) >= 64 and min(c['stroke'] for c in CP.values()) >= 10 and min(c['ss'] for c in CP.values()) >= 2,
                              sizes=sorted({c['size'] for c in CP.values()}), stroke=sorted({c['stroke'] for c in CP.values()}), supersample=sorted({c['ss'] for c in CP.values()}))
    # captions vs protected zones (face / torso / laptop / cup), zones moved with the camera of THAT frame
    Z = T['zones']; hits = []; nchk = 0
    for f in fr:
        caps = [e for e in els(f) if e['group'] == 'caption']
        if not caps: continue
        M = f['M']
        for zn, zb in Z.get(f['kind'], {}).items():
            r = [M[0] * zb[0] + M[2], M[4] * zb[1] + M[5], M[0] * zb[2] + M[2], M[4] * zb[3] + M[5]]
            for c in caps:
                nchk += 1
                if inter([c['x0'], c['y0'], c['x1'], c['y1']], r): hits.append((f['t'], f['shot'], zn, c['name']))
    nokind = sorted({f['kind'] for f in fr if any(e['group'] == 'caption' for e in els(f)) and not Z.get(f['kind'])})
    R['caption_clear'] = dict(ok=not hits and not nokind and nchk > 0, checks=nchk, hits=hits[:6], n_hits=len(hits), kinds_without_zones=nokind)
    W_ = T['words']; first, done = {}, {}
    for f in fr:
        for wid, p in f['wipe'].items():
            if p > 0 and wid not in first: first[wid] = f['t']
            if p >= 1 and wid not in done: done[wid] = f['t']
    d0 = {w: round(first[w] - W_[w]['s'], 3) for w in W_ if w in first}; d1 = {w: round(done[w] - W_[w]['e'], 3) for w in W_ if w in done}
    miss = [w for w in W_ if w not in first or w not in done]; late = {w: d for w, d in list(d0.items()) + list(d1.items()) if abs(d) > SYNC}
    R['caption_sync'] = dict(ok=bool(W_) and not miss and not late, words=len(W_), max_start_ms=round(1000 * max(map(abs, d0.values()), default=0)), max_end_ms=round(1000 * max(map(abs, d1.values()), default=0)),
                             missing=miss[:6], over=list(late.items())[:6], limit_ms=1000 * SYNC)
    chk = [w for w in W_.values() if w['checked']]
    dr = [abs(w['raw_s'] - w['onset']) for w in chk]; dv = [abs(w['s'] - w['onset']) for w in chk]
    first_words = [w for w in W_.values() if w['k'] == 0]
    R['align_audio'] = dict(ok=bool(chk) and all(d <= SYNC for d in dv) and all(w['checked'] for w in first_words), checked=len(chk), words=len(W_),
                            line_starts_checked=sum(w['checked'] for w in first_words), lines=len(first_words), max_ms=round(1000 * max(dv, default=0)),
                            whisper_raw_ms_max=round(1000 * max(dr, default=0)), whisper_raw_ms_median=round(1000 * sorted(dr)[len(dr) // 2]) if dr else None)
    # lip-sync: Rhubarb cues for every line AND the speaker's mouth set really switches during the line in its shot
    spoke = {}
    for f in fr:
        for w, v in f['vis'].items(): spoke.setdefault((f['shot'], w), set()).add(v)
    nomouth = [lid for lid, sid in T['line_shot'].items() if len(spoke.get((sid, T['who'][lid]), set()) - {'X'}) < 2]
    R['lipsync_rhubarb'] = dict(ok=all(str(l.get('gen') or '').startswith('rhubarb') and l['cues'] > 0 for l in T['lines'].values()) and not nomouth,
                                lines={k: l.get('gen') for k, l in T['lines'].items()}, lines_without_mouth_motion=nomouth)
    R['scene_native'] = dict(ok=all(f['bank'] in ('anchor', 'airport') and f['clip'] for f in fr), clips=sorted({f"{f['bank']}:{f['clip']}" for f in fr}),
                             note='every frame = one native bank frame (person generated inside the set) + mouth swap; overlays only (monitor = set object, captions, badges, bug)')
    # stretch: transform must be a uniform similarity with scale >= cover scale and the visible window inside the clip; plus top-band texture vs native
    badT = []
    for f in fr:
        M = f['M']; sw, shh = f['src_size']; w = f['win']; b = f['b']
        if abs(M[0] - M[4]) > 1e-6 or M[1] != 0 or M[3] != 0 or M[0] < b - 1e-6 or w[0] < -0.01 or w[1] < -0.01 or w[2] > sw + 0.01 or w[3] > shh + 0.01: badT.append((f['t'], M, w))
    er = [e['ratio'] for e in T['edges']]
    R['no_stretch'] = dict(ok=not badT and bool(er) and min(er) >= 0.60, bad_frames=badT[:4], n_bad=len(badT), top_band_texture_min=round(min(er, default=0), 3), top_band_texture_median=round(med(er), 3),
                           note='v6 stretched the wall rows above the head; v7 = crop/cover only (uniform scale about an anchor, window inside the source)')
    lt = [e['name'] for f in fr for e in els(f) if e['name'] == 'lt' or 'Lexkite English' in (e['text'] or '')]
    R['no_name_lower_third'] = dict(ok=not lt, found=len(lt))
    g = frames_gray(vid, [0, T['n'] - 1]); md = float(np.abs(g[0].astype(np.int16) - g[1].astype(np.int16)).mean()) if len(g) == 2 else 99
    txt_last = [e['name'] for e in els(fr[-1]) if e['alpha'] > 0.004 and e['text']]; txt_first = [e['name'] for e in els(fr[0]) if e['alpha'] > 0.004 and e['text']]
    R['loop_end'] = dict(ok=md <= 3.0 and not txt_last and not txt_first and str((T.get('cta') or {}).get('link') or '').startswith('https://lexkite.com/'),
                         first_last_mean_abs_diff=round(md, 2), text_first=txt_first, text_last=txt_last, cta=(T.get('cta') or {}).get('link'))
    S = T['sharp']; up = [x['var_render'] / max(1e-6, x['var_native']) for x in S]
    gs = frames_gray(vid, [x['frame'] for x in S]); enc = []
    for x, ge in zip(S, gs):
        rp = f"{vid}.samples/f{x['frame']:04d}.png"; r = x['rect']
        if os.path.exists(rp): gr = cv2.cvtColor(cv2.imread(rp), cv2.COLOR_BGR2GRAY); enc.append(lap(ge[r[1]:r[3], r[0]:r[2]]) / max(1e-6, lap(gr[r[1]:r[3], r[0]:r[2]])))
    smax = max(f['s'] for f in fr)
    R['host_sharp'] = dict(ok=bool(S) and len(enc) == len(S) and med(up) >= 0.80 and min(up) >= 0.70 and med(enc) >= 0.80 and smax <= T['v7']['punch'] + 1e-3,
                           push_vs_native_median=round(med(up), 3), push_vs_native_min=round(min(up, default=0), 3), encoded_vs_rendered_median=round(med(enc), 3),
                           encoded_vs_rendered_min=round(min(enc, default=0), 3), samples=len(S), max_scale=smax)
    P = [x['luma'] for x in T['panel']]
    R['no_light_panels'] = dict(ok=bool(P) and max(P) <= 110, max_luma=max(P, default=None), median_luma=med(P), samples=len(P))
    pr = json.loads(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,size:stream=codec_type,width,height,bit_rate,r_frame_rate', '-of', 'json', vid], capture_output=True, text=True).stdout)
    v = [s_ for s_ in pr['streams'] if s_['codec_type'] == 'video'][0]; dur = float(pr['format']['duration']); vb = int(v.get('bit_rate') or 0) / 1e6
    R['file'] = dict(ok=25 <= dur <= 35 and (v['width'], v['height']) == (1080, 1920) and 8.0 <= vb <= 9.5, duration=round(dur, 2), video_mbps=round(vb, 2), size_mb=round(int(pr['format']['size']) / 1e6, 1), fps=v['r_frame_rate'])
    fails = [k for k, r in R.items() if not r['ok']]; ok_all &= not fails
    json.dump(dict(video=vid, ok=not fails, failed=fails, gates=R), open(vid + '.qc.json', 'w'), indent=1)
    for k, r in R.items(): print(('PASS ' if r['ok'] else 'FAIL ') + k, json.dumps({a: b for a, b in r.items() if a != 'ok'}, ensure_ascii=False)[:500])
    print(f"{vid}: {'OK' if not fails else 'FAILED ' + ','.join(fails)} ({len(R) - len(fails)}/{len(R)} gates)")
sys.exit(0 if ok_all else 1)
