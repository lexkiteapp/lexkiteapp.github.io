# Teacher cutout (docs/TEACHER-IN-APP.md §5.5) – 0 credits, CPU, runs on CI only (teach-cutout.yml).
# Removes the room background (whiteboard, door frame) from the in-app sprite so Ama/Carlos sit on the app's own clean surface:
#   1. BiRefNet-matting (MIT) per frame of web/teach/<who>/loop.mp4 → soft alpha (hair kept)
#   2. temporal median over a circular 5-frame window (the loop is ping-pong, camera static) → no edge shimmer
#   3. foreground colour re-estimated with pymatting (MIT) → no white halo from the whiteboard in hair / shoulders
#   4. outputs: loop-a.mp4 = stacked alpha (top RGB, bottom alpha, H.264 – plays everywhere incl. iOS, drawn by WebGL in teacher.js)
#               poster.webp (RGBA, eyes-open frame) · web/img/teach/<who>.webp 192² · Android drawable 96² · qa.json · sheet.png
# QA (exit 1 on fail): border alpha ≈ 0 (no background left), interior solid, edge flicker low, halo (edge band brighter than body) low.
# Usage: python scripts/teacher/cutout.py <who> <out_dir> [--poster-frame N]
import json, os, subprocess, sys
import numpy as np
from PIL import Image

who, OUT = sys.argv[1], sys.argv[2]
PF = int(sys.argv[sys.argv.index('--poster-frame') + 1]) if '--poster-frame' in sys.argv else 0
SRC = f'web/teach/{who}/loop.mp4'
W, H = 480, 640
os.makedirs(OUT, exist_ok=True)

def frames(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)

F = frames(SRC); N = len(F)
fps = json.load(open(f'web/teach/{who}/sprite.json')).get('fps', 24)
print(f'{who}: {N} frames @ {fps} fps')

# ---- 1. matting ----
import torch
from transformers import AutoModelForImageSegmentation
torch.set_num_threads(os.cpu_count() or 4)
model = AutoModelForImageSegmentation.from_pretrained('ZhengPeng7/BiRefNet-matting', trust_remote_code=True).eval()
MEAN, STD = np.array([0.485, 0.456, 0.406]), np.array([0.229, 0.224, 0.225])
S = 1024
A = np.zeros((N, H, W), np.float32)
with torch.no_grad():
    for i, f in enumerate(F):
        x = np.asarray(Image.fromarray(f).resize((S, S), Image.BICUBIC), np.float32) / 255
        x = torch.from_numpy(((x - MEAN) / STD).transpose(2, 0, 1)[None].astype(np.float32))
        p = model(x)[-1].sigmoid()[0, 0].numpy()
        A[i] = np.asarray(Image.fromarray((p * 255).astype(np.uint8)).resize((W, H), Image.BICUBIC), np.float32) / 255
        if i % 24 == 0: print(f'  matte {i}/{N}', flush=True)

# ---- 2. temporal median (circular – loop has no seam) ----
A = np.median(np.stack([np.roll(A, k, 0) for k in (-2, -1, 0, 1, 2)]), 0)
A[A < 0.02] = 0; A[A > 0.98] = 1

# ---- 3. foreground colour (kills the white whiteboard fringe) ----
from pymatting import estimate_foreground_ml
FG = np.zeros_like(F)
for i in range(N):
    fg = estimate_foreground_ml(F[i].astype(np.float64) / 255, A[i].astype(np.float64))
    FG[i] = np.clip(fg * 255 + 0.5, 0, 255).astype(np.uint8)

# ---- 4. outputs ----
os.makedirs(f'{OUT}/web/teach/{who}', exist_ok=True); os.makedirs(f'{OUT}/web/img/teach', exist_ok=True); os.makedirs(f'{OUT}/android', exist_ok=True)
a8 = (A * 255 + 0.5).astype(np.uint8)
stack = np.concatenate([FG, np.repeat(a8[..., None], 3, -1)], 1)  # (N, 2H, W, 3)
enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{2 * H}', '-r', str(fps), '-i', '-',
                        '-c:v', 'libx264', '-preset', 'veryslow', '-crf', '27', '-pix_fmt', 'yuv420p', '-g', str(fps), '-movflags', '+faststart',
                        '-an', f'{OUT}/web/teach/{who}/loop-a.mp4'], stdin=subprocess.PIPE)
enc.stdin.write(stack.tobytes()); enc.stdin.close(); assert enc.wait() == 0
rgba = lambda i: Image.fromarray(np.dstack([FG[i], a8[i]]), 'RGBA')
rgba(PF).save(f'{OUT}/web/teach/{who}/poster.webp', 'WEBP', quality=86, alpha_quality=92, method=6)
# head square for avatars (retention, share fallback, Android widget): top of the frame, centred on the alpha mass
ys, xs = np.nonzero(a8[PF] > 128); cx = int(xs.mean()) if len(xs) else W // 2
side = min(W, 400); x0 = max(0, min(W - side, cx - side // 2)); y0 = max(0, int(ys.min()) - 16) if len(ys) else 0
head = rgba(PF).crop((x0, y0, x0 + side, y0 + side))
head.resize((192, 192), Image.LANCZOS).save(f'{OUT}/web/img/teach/{who}.webp', 'WEBP', quality=88, alpha_quality=92, method=6)
head.resize((96, 96), Image.LANCZOS).save(f'{OUT}/android/teach_{who}.webp', 'WEBP', quality=90, alpha_quality=95, method=6)

# ---- QA ----
b = 6
border = np.concatenate([A[:, :b].ravel(), A[:, :, :b].ravel(), A[:, :, -b:].ravel()])  # top / left / right (bottom = body cut by frame)
edge = (A > 0.05) & (A < 0.95)
flick = float(np.abs(np.diff(A, axis=0))[edge[1:]].mean()) if edge[1:].any() else 0.0
lum = FG.astype(np.float32).mean(-1)
inner = A > 0.98
halo = float(lum[edge].mean() - lum[inner].mean()) if edge.any() and inner.any() else 0.0
qa = {'who': who, 'frames': N, 'border_alpha_mean': float(border.mean()), 'border_alpha_p99': float(np.percentile(border, 99)),
      'coverage': float(A.mean()), 'edge_flicker': flick, 'halo_luma': halo,
      'bytes': {k: os.path.getsize(f'{OUT}/{p}') for k, p in [('loop', f'web/teach/{who}/loop-a.mp4'), ('poster', f'web/teach/{who}/poster.webp'), ('avatar', f'web/img/teach/{who}.webp')]}}
fail = [m for m, bad in [('background left at the border', qa['border_alpha_p99'] > 0.1), ('character too small / missing', not 0.12 < qa['coverage'] < 0.75),
                          ('edge flicker', flick > 0.06), ('white halo in edges', halo > 40), ('loop too big', qa['bytes']['loop'] > 260_000)] if bad]
qa['fail'] = fail
json.dump(qa, open(f'{OUT}/qa-{who}.json', 'w'), indent=1); print(json.dumps(qa, indent=1))

# contact sheet: poster + 3 frames on light / dark / checker (for the human eye)
def on(im, bg):
    c = Image.new('RGBA', im.size, bg); c.alpha_composite(im); return c.convert('RGB')
chk = Image.new('RGBA', (W, H)); px = chk.load()
for y in range(H):
    for x in range(W): px[x, y] = (200, 200, 200, 255) if (x // 16 + y // 16) % 2 else (255, 255, 255, 255)
tiles = []
for i in (PF, N // 3, 2 * N // 3):
    im = rgba(i)
    for bg in ((244, 239, 230, 255), (15, 16, 23, 255)): tiles.append(on(im, bg))
    c = chk.copy(); c.alpha_composite(im); tiles.append(c.convert('RGB'))
sheet = Image.new('RGB', (W * 3, H * 3))
for k, t in enumerate(tiles): sheet.paste(t, ((k % 3) * W, (k // 3) * H))
sheet.resize((W * 3 // 2, H * 3 // 2)).save(f'{OUT}/sheet-{who}.png')
if fail: print('FAIL:', fail); sys.exit(1)
