#!/usr/bin/env python3
"""QC gate for the clean templates (docs/VIDEO-TEMPLATES.md §QC). python3 scripts/video/tpl/qc_tpl.py <video.mp4> [...]
Reads <video>.timeline.json (per-frame element log written by render_tpl.py) + ffprobe. Exit 1 on any fail. Writes <video>.qc.json.
Gates: host transform variance = 0 | motion tokens only | text inside the safe area | readability (>= 0.8 s fully visible, >= 48 px)
| no jitter (static elements never move by a sub-pixel; tweens monotonic) | <= 1 moving group per frame | no cuts | file: 25-35 s, >= 5.5 Mbps, <= 25 MB
| tpl 1b: plate_topic, plate_clean, plate_motion (push-in only), loop_end (last frame text-free + CTA deep link)
| lipsync_rhubarb (every spoken line has Rhubarb cues), host_frame_std (tokens.HOST_LOCK framing standard re-measured on the screen matte: shoulder width ±5 %,
  head top, body centre, mid-thigh crop, leg extension cap), host_frame (no big side cut, body reaches the frame bottom),
  hook_readable (the COMPLETE hook string 'Americans usually say: “split the bill”' fully opaque on screen at 1.5 s),
  hook_truth (Groq judge verdict for THIS hook text: strong hook only when the learner line is a real error; correction ok)."""
import sys, os, re, json, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import SAFE, DUR, EASE, MIN_READ, MIN_PX, TYPE, PLATES, PLATE, HOST_LOCK, VIDEO, SHARP, SWAY, CAPTION
import math
import hostframe as HF
ok_all = True
for vid in sys.argv[1:]:
    T = json.load(open(vid + '.timeline.json')); fr = T['frames']; E = T['elements']; fps = T['fps']; R = {}
    # 1 host variance
    hs = [tuple(sorted((k, v) for k, v in f['host'].items() if k in ('scale', 'x', 'y'))) for f in fr if f['host']]
    R['host_variance'] = dict(ok=len(set(hs)) <= 1, frames_with_host=len(hs), distinct_transforms=len(set(hs)))
    # 2 motion tokens
    bad = [(i, tw) for i, e in E.items() for tw in e['tweens'] if tw['dur'] not in DUR or tw['ease'] not in EASE]
    bad += [('progress', tw) for tw in T['progress']['tweens'] if tw['dur'] not in DUR or tw['ease'] not in EASE]
    R['motion_tokens'] = dict(ok=not bad, bad=bad[:5], tweens=sum(len(e['tweens']) for e in E.values()))
    # per-element tracks
    tr = {}
    for f in fr:
        for rec in f['els']:
            i, x, y, w, h, a, sc, mv, g, txt = rec; tr.setdefault(i, []).append((f['t'], x, y, w, h, a, sc, mv, g, txt))
    # 3 safe area (text only, any visible frame)
    out = []
    for i, L in tr.items():
        for (t, x, y, w, h, a, sc, mv, g, txt) in L:
            n = E.get(i, {}).get('inset', 0); x, y, w, h = x + n, y + n, w - 2 * n, h - 2 * n   # cards: shadow margin is not content
            if txt and a > 0.05 and (x < SAFE['x0'] - 2 or y < SAFE['y0'] or x + w > SAFE['x1'] + 2 or y + h > SAFE['y1']): out.append((i, t, round(x), round(y), w, h)); break
    R['safe_area'] = dict(ok=not out, outside=out[:8])
    # 4 readability
    short, small = [], []
    for i, L in tr.items():
        if not L[0][9]: continue
        full = sum(1 for r in L if r[5] >= 0.99) / fps
        if full < MIN_READ and not E.get(i, {}).get('caption'): short.append((i, round(full, 2)))   # captions follow the voice word by word (caption_sync gate instead)
        fs = E.get(i, {}).get('fs')
        if fs and fs < MIN_PX: small.append((i, fs))
    R['readability'] = dict(ok=not short and not small, min_visible_s=MIN_READ, too_short=short[:8], too_small=small[:8],
                            text_elements=sum(1 for L in tr.values() if L[0][9]))
    # 5 jitter: a static element keeps exactly one position; a tween moves monotonically (no back-and-forth)
    jit = []
    def springy(i):   # spring-in (one overshoot) / correct-answer bounce: exactly ONE reversal is the designed motion, more = jitter
        e = E.get(i, {}); p = E.get(e.get('parent') or '', {})
        return any(tw.get('ease') == 'spring' or tw.get('kind') == 'bounce' for tw in (e.get('tweens') or []) + (p.get('tweens') or []))
    for i, L in tr.items():
        st = {(r[1], r[2], r[6]) for r in L if not r[7]}
        if len(st) > 1: jit.append((i, 'static positions', len(st)))
        for k in (1, 2, 6):
            seq = [r[k] for r in L if r[7]]; d = [b - a for a, b in zip(seq, seq[1:]) if abs(b - a) > 1e-6]
            rev = sum(1 for p, q in zip(d, d[1:]) if p * q < 0)
            if rev > (1 if springy(i) else 0) and not (k == 6 and len(set(seq)) <= 2): jit.append((i, 'reversal', k, rev))
    R['no_jitter'] = dict(ok=not jit, bad=jit[:8])
    # 6 one moving group at a time
    multi = []
    for f in fr:
        gs = {r[8] for r in f['els'] if r[7]}
        if len(gs) > 1: multi.append((f['t'], sorted(gs)))
    R['one_moving_group'] = dict(ok=not multi, frames=len(multi), first=multi[:4])
    # 7 cuts
    R['no_unmotivated_cut'] = dict(ok=not T.get('cuts'), cuts=T.get('cuts'))
    # 8 file
    pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration,bit_rate,size:stream=codec_type,width,height,avg_frame_rate', '-of', 'json', vid]))
    dur, br, size = float(pr['format']['duration']), int(pr['format']['bit_rate']), int(pr['format']['size'])
    vs = next((x for x in pr.get('streams', []) if x.get('codec_type') == 'video'), {})
    R['file'] = dict(ok=VIDEO['min_s'] <= dur <= VIDEO['max_s'] and br >= VIDEO['min_mbps'] * 1e6 and size <= VIDEO['max_mb'] * 1024 * 1024 and (vs.get('width'), vs.get('height')) == (1080, 1920),
                     duration=round(dur, 2), mbps=round(br / 1e6, 2), mb=round(size / 1048576, 2), size=f"{vs.get('width')}x{vs.get('height')}", encode=T.get('encode'))
    R['audio'] = dict(ok=True, **T.get('audio', {}))
    # 9 tpl 1b plate: topic-matched (lesson topic in the plate tags AND a scene-specific tag named in the on-screen lesson text),
    #   clean (human-checked people=0/text=0 in tokens.PLATES + no detected face), push-in only (monotonic, <= max rate, <= total)
    P = T.get('plate')
    if P:
        Lz = T.get('lesson', {}); txt = re.sub(r'[^a-z\- ]', ' ', (Lz.get('text') or '').lower())
        scene = [g for g in P['tags'] if g not in ('travel', 'food', 'ordering') and re.search(r'\b' + re.escape(g) + r's?\b', txt)]
        R['plate_topic'] = dict(ok=P['name'] in PLATES and Lz.get('topic') in P['tags'] and bool(scene), plate=P['name'], topic=Lz.get('topic'), scene_words=scene)
        R['plate_clean'] = dict(ok=P['name'] in PLATES and PLATES[P['name']]['people'] == 0 and PLATES[P['name']]['text'] == 0 and P.get('faces', 1) == 0,
                                people=P['people'], text=P['text'], faces=P.get('faces'), checked=P.get('checked'))
        R['plate_contrast'] = dict(ok=P.get('stage_luma', 0) >= PLATE['stage_luma'] - 2, stage_luma=P.get('stage_luma'), scrim=P.get('scrim'))   # text stage stays light enough for navy type
        z = [f['plate'] for f in fr if f.get('plate') is not None]; dz = [b - a for a, b in zip(z, z[1:])]
        rate = max(dz) * fps if dz else 0
        R['plate_motion'] = dict(ok=len(z) == len(fr) and all(d >= 0 for d in dz) and rate <= PLATE['max_push_per_s'] + 1e-6 and z[-1] - 1 <= PLATE['push'] + 1e-6,
                                 total_push=round(z[-1] - 1, 4) if z else None, max_rate_per_s=round(rate, 5))
        # loop: the last frame = frame 0 = clean plate + host (no text, scrim back at rest – no cream haze left on the plate)
        last_txt = [r[0] for r in fr[-1]['els'] if r[5] > 0.004]; s0, s1 = fr[0].get('scrim'), fr[-1].get('scrim')
        sw0, sw1 = ((fr[0].get('host') or {}).get('sway') or 0), ((fr[-1].get('host') or {}).get('sway') or 0)
        R['loop_end'] = dict(ok=not last_txt and bool(T.get('cta')) and s0 is not None and s1 is not None and abs(s1 - s0) <= 0.01 and s1 <= PLATE['scrim_rest'] + 0.01
                             and abs(sw1 - sw0) <= 0.02 and (fr[-1].get('brand') or 0) <= 0.004 and (fr[0].get('brand') or 0) <= 0.004,
                             last_frame_elements=last_txt[:4], scrim_first=s0, scrim_last=s1, sway_first=sw0, sway_last=sw1, cta=(T.get('cta') or {}).get('link'))
        # v4 host vs scene (owner 25/10): eye line on the plate horizon, host size plausible against the plate's reference object
        PP = T.get('persp') or {}; rf = PP.get('ref') or {}; tol = 0.10 * (PP.get('ppm_host') or 0)
        R['host_perspective'] = dict(ok=bool(PP.get('ppm_host')) and all(abs(h - PP['eye']) <= tol for h in PP.get('horizon', [])) and 1.0 <= (PP.get('ratio') or 0) <= 8.0
                                     and (PP.get('host_floor') or 0) >= rf.get('bottom', 1e9) and 0.5 <= rf.get('cam_h', 0) <= 2.0,
                                     eye=PP.get('eye'), horizon=PP.get('horizon'), tol_px=round(tol, 1), ratio=PP.get('ratio'), ref=rf.get('name'), ref_cam_h=rf.get('cam_h'),
                                     host_floor=PP.get('host_floor'), ref_bottom=rf.get('bottom'), zoom=PP.get('zoom'))
        # host idle sway: bounded, smooth (one sine), loops
        sw = [((f.get('host') or {}).get('sway') or 0.0) for f in fr]; d2 = max((abs(a - 2 * b + c) for a, b, c in zip(sw, sw[1:], sw[2:])), default=0)
        per = (T.get('sway') or {}).get('period') or SWAY['period']; d2max = SWAY['deg'] * (2 * math.pi / per) ** 2 / fps ** 2 * 1.5 + 1e-4
        R['host_motion'] = dict(ok=max(map(abs, sw)) <= SWAY['deg'] + 1e-6 and d2 <= d2max, max_deg=round(max(map(abs, sw)), 4), max_d2=round(d2, 6), d2_cap=round(d2max, 6), period=per)
        # host sharpness: Laplacian variance of the host core rect, encoded file vs the rendered frame (no blur added by the pipeline); never upscaled
        SH = T.get('sharp') or {}; rc = SH.get('rect'); fs_ = SH.get('frames') or []
        ratios = []
        if rc and fs_:
            import numpy as np, cv2
            sel = '+'.join(f"eq(n\\,{x['frame']})" for x in fs_)
            raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', vid, '-vf', f"select='{sel}'", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True).stdout
            fsz = 1080 * 1920; gs = [np.frombuffer(raw[j * fsz:(j + 1) * fsz], np.uint8).reshape(1920, 1080) for j in range(len(raw) // fsz)]
            for x, g_ in zip(fs_, gs): ratios.append(round(float(cv2.Laplacian(g_[rc[1]:rc[3], rc[0]:rc[2]], cv2.CV_64F).var()) / max(1e-6, x['var']), 3))
        med = sorted(ratios)[len(ratios) // 2] if ratios else 0
        R['host_sharp'] = dict(ok=bool(ratios) and len(ratios) == len(fs_) and med >= SHARP['min_ratio'] and (SH.get('scale') or 9) <= 1.0 + 1e-6,
                               median_ratio=med, min_ratio=min(ratios) if ratios else None, rendered_var=[x['var'] for x in fs_][:9], scale=SH.get('scale'), method='INTER_AREA native downscale + Lanczos sway warp')
        # captions: every word highlighted within CAPTION.sync_ms of its (audio-checked) start time, measured on the frame log
        CW = (T.get('captions') or {}).get('words') or {}; first = {}
        for f in fr:
            for rec in f['els']:
                if rec[0] in CW and rec[0] not in first: first[rec[0]] = f['t']
        dts = {i: round(first[i] - w['audio_t'], 3) for i, w in CW.items() if i in first}; miss = [i for i, w in CW.items() if i not in first and (w.get('dur') or 1) >= 1 / fps]
        bad_ = {i: d for i, d in dts.items() if abs(d) > CAPTION['sync_ms'] / 1000}
        R['caption_sync'] = dict(ok=bool(CW) and not miss and not bad_ and not (T.get('captions') or {}).get('hidden'), words=len(CW), max_ms=round(1000 * max(map(abs, dts.values()), default=0)),
                                 missing=miss[:5], late=list(bad_.items())[:5], hidden_beats=(T.get('captions') or {}).get('hidden'))
        AL = [a for v in (T.get('align') or {}).values() for a in v]; mt = [a for a in AL if a.get('w')]
        R['align_audio'] = dict(ok=bool(AL) and len(mt) >= 0.8 * len(AL), onsets=len(AL), matched=len(mt), whisper_drift_ms_max=round(1000 * max((abs(a['d_raw']) for a in mt), default=0)),
                                whisper_drift_ms_median=round(1000 * sorted(abs(a['d_raw']) for a in mt)[len(mt) // 2]) if mt else None, note='matched onsets snapped (whisper -> audio)')
    if T.get('lipsync') is not None or any(f['host'] for f in fr[:1]):
        LS_ = T.get('lipsync') or {}
        R['lipsync_rhubarb'] = dict(ok=bool(LS_) and not LS_.get('missing') and all(str(v or '').startswith('rhubarb') for v in (LS_.get('lines') or {}).values()) and bool(LS_.get('lines')),
                                    missing=LS_.get('missing'), sources=sorted({str(v) for v in (LS_.get('lines') or {}).values()}))
    if P:
        HH = T.get('host_head') or {}; SC = HH.get('screen')
        std = HF.check(SC, HOST_LOCK, HH.get('ext_rows', 0)) if SC else dict(ok=False, reason='no screen landmarks')
        R['host_frame_std'] = dict(ok=bool(SC) and std['ok'] and HH.get('scale', 9) <= HOST_LOCK['max_scale'] + 1e-6, host=T.get('host_name'), scale=HH.get('scale'),
                                   **{k: v for k, v in std.items() if k != 'ok'})
        R['host_frame'] = dict(ok=bool(HH) and HH.get('bottom', 0) >= 1920 and HH.get('side_cut_rows', 1e9) <= 0.35 * max(1, HH.get('host_rows', 0)),
                               side_cut_rows=HH.get('side_cut_rows'), host_rows=HH.get('host_rows'), bottom=HH.get('bottom'))
        hk = (Lz.get('hook') or {}); jd = hk.get('judge') or {}
        import hashlib
        cur = hashlib.sha1('\n'.join([Lz.get('hook_text') or '', Lz.get('wrong') or '', Lz.get('right') or '']).encode()).hexdigest()[:12]
        R['hook_truth'] = dict(ok=bool(jd) and jd.get('hash') == cur and jd.get('right_ok') is True and jd.get('hook_true') is True and not Lz.get('reject')
                               and (hk.get('mode') == 'soft' or jd.get('wrong_is_error') is True),
                               mode=hk.get('mode'), hook=Lz.get('hook_text'), wrong_is_error=jd.get('wrong_is_error'), right_ok=jd.get('right_ok'), model=jd.get('model'), note=jd.get('note'))
    if T.get('hook_full'):   # the COMPLETE hook sentence is on screen, fully opaque, at 1.5 s (owner: 'Americans usually' alone is not a hook)
        f15 = max((f for f in fr if f['t'] <= 1.5 + 1e-6), key=lambda f: f['t'])
        vis = ' '.join(E[r[0]]['text'] for r in f15['els'] if r[0].startswith('h.t') and r[5] >= 0.99 and E.get(r[0], {}).get('text'))
        nz = lambda x: re.sub(r'\s+', ' ', x).strip()
        R['hook_readable'] = dict(ok=nz(vis) == nz(T['hook_full']), at=f15['t'], expected=T['hook_full'], visible=vis)
    ok = all(v['ok'] for v in R.values()); ok_all &= ok
    json.dump(dict(video=os.path.basename(vid), ok=ok, gates=R), open(vid + '.qc.json', 'w'), indent=1)
    print(os.path.basename(vid), 'PASS' if ok else 'FAIL')
    for k, v in R.items(): print(f"  {'ok ' if v['ok'] else 'BAD'} {k:20s} {json.dumps({a: b for a, b in v.items() if a != 'ok'})[:220]}")
sys.exit(0 if ok_all else 1)
