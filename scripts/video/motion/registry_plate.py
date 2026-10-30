#!/usr/bin/env python3
"""Host clips for the motion layer from the ONE character set (web/teach/characters.json, docs/CHARACTERS.md – owner 28/10: 2D Ama/Carlos only).

render_v9 (--overlay) plays full-frame 1080x1920 clips. The old #191 specs used 3D classroom clips (retired, blocked by teach.registry.check);
set "reg2d" (content/video/cine/teachers.json) builds those clips on CI from the registry green-screen sources instead:
  kfull_pro/<src>.mp4 + kmask_pro/<src>.mkv  ->  despill + alpha over the static Teach2D "dusk" Kit canvas (theme.json: gradient + 3 soft blobs,
  same canvas as teach-video) -> <lib>/clips/<src>.mp4, 1080x1920 24 fps.
Framing (no upscale beyond the registry crop rule of registry_clips.py): one eye line + one head size for Ama and Carlos (eye/eye_mouth in the
registry), eye at (FX, FY) of the frame, crop window fully inside the source so the body always runs off the bottom edge (never floats).
Writes a teachers JSON (= content/video/cine/teachers.json + one clip entry per registry clip: usable, head box measured on the alpha, anchor,
mood) for render_v9 --teachers. CI only (video-motion.yml), never on the Mac.

  registry_plate.py --spec S.json --green footage/anchor/green --foot footage --out-teachers T.json
"""
import argparse, json, os, subprocess, sys
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(f'{HERE}/../../..')
sys.path.insert(0, f'{ROOT}/scripts'); from teach.registry import REG, check  # noqa: E402

W, H, FPS = 1080, 1920, 24
FX, FY = 0.60, 0.40                     # eye position: right of centre (motion layout "right": full-width top card + left column free)
MOOD = dict(talk='talk', explain='present', happy='excited', thinking='question', surprise='wow', listen='listen')   # registry pose -> render_v9 mood

ap = argparse.ArgumentParser()
for a in ('spec', 'green', 'foot', 'out_teachers'): ap.add_argument('--' + a.replace('_', '-'), dest=a, required=True)
ap.add_argument('--teachers', default=f'{ROOT}/content/video/cine/teachers.json')
ap.add_argument('--look', default='dusk')
o = ap.parse_args()
SP = json.load(open(o.spec)); TR = json.load(open(o.teachers)); SET = TR['sets'][SP['set']]; WHO = SP['teacher']
assert SET.get('registry'), f"set {SP['set']} is not a registry set"
IDS = SP['clips'] + SP.get('listen', []); check(WHO, IDS)
P = REG['people'][WHO]; POSE = {c['src']: k for k, c in P['clips'].items()}
LIB = f"{o.foot}/{SET['lib']}"; os.makedirs(f'{LIB}/clips', exist_ok=True)


def run(*a): return subprocess.run(a, check=True, capture_output=True, text=True).stdout


def probe(f, e): return run('ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', f'stream={e}', '-of', 'csv=p=0', f).strip()


def rgba(s):
    if s.startswith('#'): return [int(s[i:i + 2], 16) for i in (1, 3, 5)] + [1.0]
    v = s[s.index('(') + 1:s.index(')')].split(','); return [int(v[0]), int(v[1]), int(v[2]), float(v[3])]


def canvas(T):   # TeachShort.jsx <Canvas>: 180deg gradient bg -> bg2, three static radial blobs (colour at centre -> transparent at 68-70 %)
    a, b = np.array(rgba(T['bg'])[:3], float), np.array(rgba(T['bg2'])[:3], float)
    y = np.linspace(0, 1, H)[:, None, None]; im = np.broadcast_to(a + (b - a) * y, (H, W, 3)).copy()
    Y, X = np.mgrid[0:H, 0:W].astype(float)
    for col, x0, y0, d, stop in ((T['blobA'], -0.25 * W, -0.08 * H, 0.9 * W, 0.68), (T['blobB'], W + 0.3 * W - 0.9 * W, 0.32 * H, 0.9 * W, 0.68),
                                 (T['blobC'], 0.1 * W, H + 0.1 * H - 0.8 * W, 0.8 * W, 0.70)):
        c = rgba(col); r = np.hypot(X - (x0 + d / 2), Y - (y0 + d / 2)) / (d / 2)   # CSS radial-gradient(circle) in a square box: 100 % = farthest corner
        r = r / np.sqrt(2); al = c[3] * np.clip(1 - r / stop, 0, 1)
        im = im * (1 - al[..., None]) + np.array(c[:3], float) * al[..., None]
    return Image.fromarray(np.clip(im + 0.5, 0, 255).astype(np.uint8))


T = json.load(open(f'{ROOT}/scripts/video/remotion/src/teach/theme.json'))[o.look]
BG = f'{LIB}/canvas_{o.look}.png'; canvas(T).save(BG)

# one head size + one eye line for both teachers (registry eye / eye_mouth). The registry sources are tight portrait shots (1080x1916), so
# the teacher is scaled down and placed with overlay on the canvas: hair, shoulders and gestures keep their alpha, the source's left/right/top
# edges are feathered (never a hard cut line), and the body MUST run off the bottom of the frame (never floats). Chin + 240 px pop band stays
# above render_v9's caption band (BAND_Y1 1328).
EM_OUT, EX, EY, FEATHER = 120, round(FX * W), 790, 40
FW, FH = map(int, probe(f"{o.green}/kmask_pro/{P['clips']['talk']['src']}.mkv", 'width,height').split(',')[:2])
s = EM_OUT / P['eye_mouth']; SW, SH = round(FW * s / 2) * 2, round(FH * s / 2) * 2
OX, OY = round(EX - P['eye'][0] * s), round(EY - P['eye'][1] * s)
assert OY + SH >= H, f'{WHO}: body ends at y {OY + SH} < {H} (would float) – lower EY or raise EM_OUT'
assert EY + 2 * EM_OUT + 14 + 240 <= 1328, 'no room under the chin for pops'
print(f'{WHO}: source {FW}x{FH} x{s:.3f} -> {SW}x{SH} at ({OX}, {OY}), eye->mouth {EM_OUT} px, eye at ({EX}, {EY})', flush=True)

out = dict(TR); out['clips'] = dict(TR['clips']); errs = []
for c in dict.fromkeys(IDS):
    pose = POSE.get(c); spec = P['clips'][pose]
    cf, cm = f"{o.green}/kfull_pro/{c}.mp4", f"{o.green}/kmask_pro/{c}.mkv"
    if not (os.path.exists(cf) and os.path.exists(cm)): errs.append(f'{c}: missing green source'); continue
    fps = probe(cf, 'r_frame_rate').split(',')[0]
    n = min(int(probe(f, 'nb_read_frames')) for f in (cf, cm)); a, z = spec.get('from', 0), min(spec.get('to', n - 1), n - 1) + 1
    trim = f'trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB'
    fe = f"geq=lum='p(X,Y)*clip(min(min(X,W-1-X),Y)/{FEATHER},0,1)'"   # feather the source's side + top edges (bottom runs off the frame)
    al = lambda i: f'[{i}:v]{trim},format=gray,{fe},scale={SW}:{SH}:flags=lanczos'
    g = (f"{al(2)}[al];[1:v]{trim},scale={SW}:{SH}:flags=lanczos,despill=type=green:mix=0.6:expand=0.1,format=rgba[co];"
         f"[co][al]alphamerge[fg];[0:v]format=rgba[bg];[bg][fg]overlay={OX}:{OY}:shortest=1,format=yuv420p")
    v = f'{LIB}/clips/{c}.mp4'
    run('ffmpeg', '-v', 'error', '-y', '-loop', '1', '-r', fps, '-i', BG, '-i', cf, '-i', cm, '-filter_complex', g, '-an', '-r', str(FPS),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', v)
    nf = int(probe(v, 'nb_read_frames')); got = probe(v, 'width,height')
    if got != f'{W},{H}' or nf < 48: errs.append(f'{v}: {got}, {nf} frames'); continue
    # head box = union over the clip of the alpha around the face (hair top .. chin), measured at 4 fps on the output frames
    m = subprocess.run(['ffmpeg', '-v', 'error', '-i', cm, '-filter_complex', f'{al(0)},fps=4[a0];color=black:s={W}x{H}:r=4,format=gray[k];[k][a0]overlay={OX}:{OY}:shortest=1,format=gray[o]', '-map', '[o]', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                       check=True, capture_output=True).stdout
    A = np.frombuffer(m, np.uint8).reshape(-1, H, W) > 128
    em = EM_OUT; xa, xb = int(EX - 1.6 * em), int(EX + 1.6 * em); chin = int(EY + 2.0 * em)
    rows = np.where(A[:, :chin, max(0, xa):min(W, xb)].any((0, 2)))[0]
    cols = np.where(A[:, int(EY - 0.5 * em):int(EY + 1.2 * em), :].any((0, 1)))[0]
    head = [int(max(0, max(cols.min(), xa) - 6)), int(max(0, rows.min() - 6)), int(min(W, min(cols.max(), xb) + 6)), min(H, chin + 6)]
    U = A.any(0); U = U[:H // 8 * 8].reshape(H // 8, 8, W // 8, 8).any((1, 3)); U[1:] |= U[:-1].copy(); U[:-1] |= U[1:].copy(); U[:, 1:] |= U[:, :-1].copy(); U[:, :-1] |= U[:, 1:].copy()
    body = [[y * 8, int(np.flatnonzero(r)[0]) * 8, int(np.flatnonzero(r)[-1]) * 8 + 8] for y, r in enumerate(U) if r.any()]   # whole teacher (alpha union, 8 px cells, dilated 1) = render_v9 host_move
    out['clips'][c] = dict(set=SP['set'], who=WHO, usable=[0, nf - 1], head=head, body=body, anchor=[round(EX), round(EY)], mood=MOOD.get(pose, 'talk'),
                           src=c, pose=pose, note='registry 2D (web/teach/characters.json) over the Teach2D canvas – registry_plate.py')
    print(f'  {c:20s} {pose:9s} [{a}:{z}] {nf} f  head {head}  {os.path.getsize(v) // 1024} KB', flush=True)

for e in errs: print(f'::error::{e}')
if errs: sys.exit(1)
json.dump(out, open(o.out_teachers, 'w'), indent=1, ensure_ascii=False)
