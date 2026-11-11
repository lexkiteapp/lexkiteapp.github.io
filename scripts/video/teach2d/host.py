#!/usr/bin/env python3
"""Teach2D host layer (docs/VIDEO-TEACH2D.md): the ONE 2D character set (web/teach/characters.json, docs/CHARACTERS.md) -> alpha video for Remotion.
  python3 scripts/video/teach2d/host.py <who> <out_dir>      (CI only – refuses to run outside $CI)
Reads the registry's stacked-alpha clips web/teach/<who>/{talk,listen}[-hd].mp4 (top half colour, bottom half alpha; the app plays the same
files), writes <out>/talk.webm + listen.webm (VP9 yuva420p, lossless-ish CRF 12) and <out>/geom.json:
  {w, h, bbox (alpha > 0.5 union over every frame), head (top 34 % of the figure, widened 8 %), clips: {talk|listen: {frames, fps, src, sha}}}.
The registry is never edited here; when the 1080p bank lands (teach-build) the same paths simply carry more pixels.
Reaction pose (template react): `host.py <who> <out> [pose]` or the render job's $E episode spec `pose.clip` -> <out>/pose.webm (clip key 'pose', played by
build.py in one silence). A pose without a -hd file -> the SD bank for ALL clips of that episode (one resolution, one transform; geom.json bank = sd)."""
import hashlib, json, os, subprocess, sys
import numpy as np
if not os.environ.get('CI'): sys.exit('host.py: CI only (docs/METHODS.md §4 – no heavy video work on the Mac)')
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
sys.path.insert(0, f'{ROOT}/scripts'); from teach.registry import REG, clip_src  # noqa: E402
who, out = sys.argv[1], sys.argv[2]; os.makedirs(out, exist_ok=True)
assert who in REG['people'], f'{who} is not in web/teach/characters.json'
PZ = sys.argv[3] if len(sys.argv) > 3 else ''
if not PZ and os.environ.get('E') and os.path.exists(os.environ['E']): PZ = (json.load(open(os.environ['E'])).get('pose') or {}).get('clip', '')
assert PZ not in ('talk', 'listen'), ('the reaction pose must be a third clip', PZ)
SD = bool(PZ) and not os.path.exists(f'{ROOT}/web/teach/{who}/{PZ}-hd.mp4')   # no -hd pose -> SD bank for every clip of the episode
def bank_src(pose): return next(f for f in ([] if SD else [f'{ROOT}/web/teach/{who}/{pose}-hd.mp4']) + [f'{ROOT}/web/teach/{who}/{pose}.mp4'] if os.path.exists(f))
G = dict(clips={}, bank='sd' if SD else 'hd', pose=PZ or None)
for pose in ('talk', 'listen') + ((PZ,) if PZ else ()):
    clip_src(who, pose)   # registry lookup: raises when the pose is missing
    src = bank_src(pose); key = 'pose' if pose == PZ else pose
    pr = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', 'stream=width,height,nb_read_frames,r_frame_rate', '-of', 'json', src]))['streams'][0]
    w, h2 = pr['width'], pr['height']; h = h2 // 2; nf = int(pr['nb_read_frames']); a, b = pr['r_frame_rate'].split('/'); fps = int(a) / int(b)
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', src, '-filter_complex', f'[0]crop={w}:{h}:0:0[c];[0]crop={w}:{h}:0:{h},format=gray[m];[c][m]alphamerge,format=yuva420p[o]',
                    '-map', '[o]', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-crf', '12', '-b:v', '0', '-auto-alt-ref', '0', '-row-mt', '1', '-an', f'{out}/{key}.webm'], check=True)
    al = np.frombuffer(subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', src, '-vf', f'crop={w}:{h}:0:{h},format=gray', '-f', 'rawvideo', '-']), np.uint8).reshape(-1, h, w)
    m = (al > 128).any(0); ys, xs = np.where(m)
    G['clips'][key] = dict(pose=pose, frames=nf, fps=fps, src=os.path.relpath(src, ROOT), sha=hashlib.sha256(open(src, 'rb').read()).hexdigest()[:16], bbox=[int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1],
                            alpha_mean=round(float((al > 128).mean()), 4))
    assert (G.get('w', w), G.get('h', h)) == (w, h), ('mixed clip sizes (HD + SD) in one episode', pose, w, h)
    G.update(w=w, h=h)
bb = [min(c['bbox'][0] for c in G['clips'].values()), min(c['bbox'][1] for c in G['clips'].values()), max(c['bbox'][2] for c in G['clips'].values()), max(c['bbox'][3] for c in G['clips'].values())]
fh = bb[3] - bb[1]; top = bb[1]; hy1 = top + 0.34 * fh
al = np.frombuffer(subprocess.check_output(['ffmpeg', '-nostdin', '-v', 'error', '-i', bank_src('talk'),
                                             '-vf', f"crop={G['w']}:{G['h']}:0:{G['h']},format=gray", '-f', 'rawvideo', '-']), np.uint8).reshape(-1, G['h'], G['w'])
hm = (al[:, int(top):int(hy1)] > 128).any(0); hx = np.where(hm.any(0))[0]; pad = 0.08 * (hx.max() - hx.min())
G['bbox'] = bb; G['head'] = [int(hx.min() - pad), int(top), int(hx.max() + pad), int(hy1)]; G['who'] = who; G['voice'] = REG['people'][who]['voice']['video']
json.dump(G, open(f'{out}/geom.json', 'w'), indent=1); print(json.dumps(G))
