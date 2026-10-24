#!/usr/bin/env python3
"""ONE automatic fix for a rejected template-1b render (docs/VIDEO-TEMPLATES.md §9). Reads <video>.rubric.json + qc gates, picks the fix
by failure CLASS, prints one action line for the workflow:
  remux     – audio loudness / true peak only: two-pass loudnorm on the audio, video stream copied (written in place)
  reencode  – file gate (bitrate/size) only: CBR 5.8 Mbps re-encode (in place)
  rerender <lesson.json> – a patched copy of the lesson: other plate of the same topic (plate_* gates), other host clip (host_* / lipsync gates
              → voice is rebuilt for the new host). Never shortens/cuts content (owner rule): safe_area / readability → none
  none      – nothing automatic can fix it (hook_truth / judge reject) → straight to the batch report
  python3 scripts/video/tpl/fix_tpl.py <video.mp4> <lesson.json> <out-dir>"""
import sys, os, json, re, subprocess, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from tokens import PLATES, HOST_CLIPS
vid, lp, od = sys.argv[1:4]
R = json.load(open(vid + '.rubric.json')); F = set(R['failed']); SP = json.load(open(lp))
def run(*a): subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', *a], check=True)
if 'hook_truth' in F or SP.get('reject'): print('none'); sys.exit(0)
audio_only = R['points']['audio'] < 10 and not F
if audio_only:
    r = subprocess.run(['ffmpeg', '-nostdin', '-hide_banner', '-i', vid, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    m = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    af = f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true"
    tmp = vid + '.fix.mp4'; run('-i', vid, '-c:v', 'copy', '-af', af, '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', tmp); os.replace(tmp, vid)
    print('remux'); sys.exit(0)
if F == {'file'}:
    tmp = vid + '.fix.mp4'; run('-i', vid, '-c:v', 'libx264', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-b:v', '5800k', '-minrate', '5800k', '-maxrate', '5800k', '-bufsize', '5800k',
                                '-x264-params', 'nal-hrd=cbr:force-cfr=1', '-c:a', 'copy', '-movflags', '+faststart', tmp); os.replace(tmp, vid)
    print('reencode'); sys.exit(0)
fix = []
if F & {'plate_contrast', 'plate_clean', 'plate_topic'}:
    alt = [p for p, v in PLATES.items() if SP['topic'] in v['tags'] and p != SP['plate']]
    if alt: SP['plate'] = alt[0]; SP['series'][0] = PLATES[alt[0]]['series']; fix.append('plate→' + alt[0])
if F & {'host_frame_std', 'host_frame', 'lipsync_rhubarb', 'host_variance'}:
    hs = list(HOST_CLIPS); nh = hs[(hs.index(SP['host']) + 1) % len(hs)] if SP['host'] in hs else hs[0]
    SP['host'], SP['clip'] = nh, HOST_CLIPS[nh]; fix.append('host→' + nh)
# safe_area / readability: NO automatic fix – never shorten or cut content to pass a gate (owner rule 24/10); a human fixes layout/type
if not fix: print('none'); sys.exit(0)
SP['fix'] = fix; os.makedirs(od, exist_ok=True); np_ = os.path.join(od, os.path.basename(lp)); json.dump(SP, open(np_, 'w'), indent=1)
print('rerender', np_, ' '.join(fix))
