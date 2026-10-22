#!/usr/bin/env python3
"""host_sr.py <green_dir> <clip,clip,...> [--model <pth>] - 2x super-resolution of keyed host clips (owner 22/10: never scale a host layer above
its source; MCU framing needs ~1.3x of the 1080x1920 originals). 0 credits, CPU on CI, cached.
  colour  <green>/kfull_pro/<clip>.mp4 (or kfull/)  -> <green>/kfull_x2/<clip>.mp4   2160x3840, Real-ESRGAN realesr-animevideov3 (SRVGG compact, anime/cel model), x264 CRF 10 4:4:4
  alpha   <green>/kmask_pro/<clip>.mkv (or kmask/) -> <green>/kmask_x2/<clip>.mkv   Lanczos 2x of the (soft) matte, FFV1 lossless gray
news.py uses the x2 layers when they exist (NEWS_SR=1): lip-sync runs at 2x (mouth track and sprites scaled), the layer is then only ever downscaled."""
import os, sys, subprocess, argparse, numpy as np, cv2
ap = argparse.ArgumentParser(); ap.add_argument('green'); ap.add_argument('clips'); ap.add_argument('--model', default=os.path.expanduser('~/.cache/realesr-animevideov3.pth')); o = ap.parse_args()
MURL = 'https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-animevideov3.pth'
todo = [c for c in o.clips.split(',') if c and not (os.path.exists(f'{o.green}/kfull_x2/{c}.mp4') and os.path.exists(f'{o.green}/kmask_x2/{c}.mkv'))]
print(f'{len(todo)} clip(s) to super-resolve');
if not todo: sys.exit(0)
import torch; torch.set_num_threads(max(2, os.cpu_count() or 2))
from spandrel import ModelLoader
if not os.path.exists(o.model): os.makedirs(os.path.dirname(o.model), exist_ok=True); subprocess.run(['curl', '-sL', '-o', o.model, MURL], check=True)
net = ModelLoader().load_from_file(o.model).model.eval(); assert getattr(net, 'scale', 4) in (2, 4)
def sr(img):   # BGR uint8 -> 2x BGR uint8 (the animevideov3 model is x4 -> area-downscale to x2 = extra crispness)
    with torch.no_grad():
        t = torch.from_numpy(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).permute(2, 0, 1).float().div(255).unsqueeze(0)
        y = net(t).clamp(0, 1)[0].permute(1, 2, 0).mul(255).round().byte().numpy()
    y = cv2.cvtColor(y, cv2.COLOR_RGB2BGR); H, W = img.shape[:2]
    return cv2.resize(y, (W * 2, H * 2), interpolation=cv2.INTER_AREA) if y.shape[0] != H * 2 else y
def frames(path):
    cap = cv2.VideoCapture(path)
    while True:
        ok, F = cap.read()
        if not ok: break
        yield F
os.makedirs(f'{o.green}/kfull_x2', exist_ok=True); os.makedirs(f'{o.green}/kmask_x2', exist_ok=True)
for c in todo:
    cf = f'{o.green}/kfull_pro/{c}.mp4' if os.path.exists(f'{o.green}/kfull_pro/{c}.mp4') else f'{o.green}/kfull/{c}.mp4'
    cm = f'{o.green}/kmask_pro/{c}.mkv' if os.path.exists(f'{o.green}/kmask_pro/{c}.mkv') else f'{o.green}/kmask/{c}.mp4'
    F0 = next(frames(cf)); H, W = F0.shape[:2]
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', f'{W * 2}x{H * 2}', '-r', '24', '-i', '-', '-c:v', 'libx264', '-preset', 'slow', '-crf', '10',
                            '-pix_fmt', 'yuv444p', f'{o.green}/kfull_x2/{c}.mp4'], stdin=subprocess.PIPE)
    n = 0
    for F in frames(cf):
        T = 512; out = np.zeros((H * 2, W * 2, 3), np.uint8)   # tiles with 16 px overlap (memory)
        for y0 in range(0, H, T):
            for x0 in range(0, W, T):
                ya, xa = max(0, y0 - 16), max(0, x0 - 16); yb, xb = min(H, y0 + T + 16), min(W, x0 + T + 16); t = sr(F[ya:yb, xa:xb])
                out[y0 * 2:min(H, y0 + T) * 2, x0 * 2:min(W, x0 + T) * 2] = t[(y0 - ya) * 2:(y0 - ya + min(T, H - y0)) * 2, (x0 - xa) * 2:(x0 - xa + min(T, W - x0)) * 2]
        enc.stdin.write(out.tobytes()); n += 1
    enc.stdin.close(); enc.wait()
    A = [cv2.resize(M[..., 0], (M.shape[1] * 2, M.shape[0] * 2), interpolation=cv2.INTER_LANCZOS4) for M in frames(cm)]
    enc = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', f'{A[0].shape[1]}x{A[0].shape[0]}', '-r', '24', '-i', '-', '-c:v', 'ffv1', f'{o.green}/kmask_x2/{c}.mkv'], stdin=subprocess.PIPE)
    for a in A: enc.stdin.write(np.ascontiguousarray(a).tobytes())
    enc.stdin.close(); enc.wait(); print(f'{c}: {n} frames -> x2 ({W * 2}x{H * 2})')
