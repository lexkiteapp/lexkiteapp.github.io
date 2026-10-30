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

# one head size for both teachers: the smallest eye->mouth (px, output) whose crop window fits inside EVERY registry source
size = {}
for who, Q in REG['people'].items():
    t0 = Q['clips']['talk']['src']; size[who] = tuple(map(int, probe(f"{o.green}/kmask_pro/{t0}.mkv", 'width,height').split(',')[:2]))
em_out = 0
for who, Q in REG['people'].items():
    FW, FH = size[who]; em = Q['eye_mouth']; ex, ey = Q['eye']
    em_out = max(em_out, H * FY * em / ey, H * (1 - FY) * em / (FH - ey), W * FX * em / ex, W * (1 - FX) * em / (FW - ex))
em_out = int(em_out) + 1
s = P['eye_mouth'] / em_out; CW, CH = round(W * s / 2) * 2, round(H * s / 2) * 2
CX, CY = round(P['eye'][0] - FX * CW), round(P['eye'][1] - FY * CH); FW, FH = size[WHO]
CX = max(0, min(FW - CW, CX)); CY = max(0, min(FH - CH, CY))
EX, EY = (P['eye'][0] - CX) / s, (P['eye'][1] - CY) / s
print(f'{WHO}: source {FW}x{FH}, crop {CW}x{CH}+{CX}+{CY}, eye->mouth {em_out} px, eye at ({EX:.0f}, {EY:.0f})', flush=True)

out = dict(TR); out['clips'] = dict(TR['clips']); errs = []
for c in dict.fromkeys(IDS):
    pose = POSE.get(c); spec = P['clips'][pose]
    cf, cm = f"{o.green}/kfull_pro/{c}.mp4", f"{o.green}/kmask_pro/{c}.mkv"
    if not (os.path.exists(cf) and os.path.exists(cm)): errs.append(f'{c}: missing green source'); continue
    fps = probe(cf, 'r_frame_rate').split(',')[0]
    n = min(int(probe(f, 'nb_read_frames')) for f in (cf, cm)); a, z = spec.get('from', 0), min(spec.get('to', n - 1), n - 1) + 1
    crop = f'{CW}:{CH}:{CX}:{CY}'; trim = f'trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB'
    al = lambda i: f'[{i}:v]{trim},format=gray,crop={crop},scale={W}:{H}:flags=lanczos'
    g = (f"{al(2)}[al];[1:v]{trim},crop={crop},scale={W}:{H}:flags=lanczos,despill=type=green:mix=0.6:expand=0.1,format=rgba[co];"
         "[co][al]alphamerge[fg];[0:v]format=rgba[bg];[bg][fg]overlay=shortest=1,format=yuv420p")
    v = f'{LIB}/clips/{c}.mp4'
    run('ffmpeg', '-v', 'error', '-y', '-loop', '1', '-r', fps, '-i', BG, '-i', cf, '-i', cm, '-filter_complex', g, '-an', '-r', str(FPS),
        '-c:v', 'libx264', '-preset', 'medium', '-crf', '12', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', v)
    nf = int(probe(v, 'nb_read_frames')); got = probe(v, 'width,height')
    if got != f'{W},{H}' or nf < 48: errs.append(f'{v}: {got}, {nf} frames'); continue
    # head box = union over the clip of the alpha around the face (hair top .. chin), measured at 4 fps on the output frames
    m = subprocess.run(['ffmpeg', '-v', 'error', '-i', cm, '-filter_complex', f'{al(0)},fps=4[o]', '-map', '[o]', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'],
                       check=True, capture_output=True).stdout
    A = np.frombuffer(m, np.uint8).reshape(-1, H, W) > 128
    em = em_out; xa, xb = int(EX - 1.6 * em), int(EX + 1.6 * em); chin = int(EY + 2.0 * em)
    rows = np.where(A[:, :chin, max(0, xa):min(W, xb)].any((0, 2)))[0]
    cols = np.where(A[:, int(EY - 0.5 * em):int(EY + 1.2 * em), :].any((0, 1)))[0]
    head = [int(max(0, max(cols.min(), xa) - 6)), int(max(0, rows.min() - 6)), int(min(W, min(cols.max(), xb) + 6)), min(H, chin + 6)]
    out['clips'][c] = dict(set=SP['set'], who=WHO, usable=[0, nf - 1], head=head, anchor=[round(EX), round(EY)], mood=MOOD.get(pose, 'talk'),
                           src=c, pose=pose, note='registry 2D (web/teach/characters.json) over the Teach2D canvas – registry_plate.py')
    print(f'  {c:20s} {pose:9s} [{a}:{z}] {nf} f  head {head}  {os.path.getsize(v) // 1024} KB', flush=True)

for e in errs: print(f'::error::{e}')
if errs: sys.exit(1)
json.dump(out, open(o.out_teachers, 'w'), indent=1, ensure_ascii=False)
