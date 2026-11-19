# Kling cartoon clips animate "on twos" (each pose held 2 frames = 12 poses/s) -> visible judder, worse after reversed playback.
# One-time bank fix (0 credits): detect held frames and replace them with optical-flow midpoints (DIS flow, bidirectional warp).
# Frame count/indices unchanged -> tracks, mouth sets and bank frame ranges stay valid.  Output: dl24/<clip>.mp4
import cv2, numpy as np, glob, os, subprocess, sys, json; cv2.setNumThreads(int(os.environ.get('CINE_THREADS', '2')) or (os.cpu_count() or 4))
import os as _os
if _os.environ.get('CINE_SCENE_DIR'): _os.chdir(_os.environ['CINE_SCENE_DIR'])   # scene dir (default cwd)
os.makedirs('dl24', exist_ok=True); DIS = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
def flow(a, b):   # at half res, returned at full res (pixels)
    g = lambda x: cv2.resize(cv2.cvtColor(x, cv2.COLOR_BGR2GRAY), None, fx=.5, fy=.5)
    f = DIS.calc(g(a), g(b), None); return cv2.resize(f, (a.shape[1], a.shape[0])) * 2
def mid(a, b, t):
    H, W = a.shape[:2]; gx, gy = np.meshgrid(np.arange(W, dtype=np.float32), np.arange(H, dtype=np.float32))
    fab, fba = flow(a, b), flow(b, a)
    wa = cv2.remap(a, gx - t * fab[..., 0], gy - t * fab[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    wb = cv2.remap(b, gx - (1 - t) * fba[..., 0], gy - (1 - t) * fba[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    bl = cv2.addWeighted(wa, 1 - t, wb, t, 0)
    # discrete cartoon changes (blink, mouth shape, pop) cannot be flow-interpolated -> where the two warps disagree, hold the nearest pose (no ghost)
    bad = (np.abs(wa.astype(np.int16) - wb.astype(np.int16)).max(2) > 22).astype(np.uint8)
    m = cv2.GaussianBlur(cv2.dilate(bad, np.ones((9, 9), np.uint8)).astype(np.float32), (0, 0), 3)[..., None].clip(0, 1)
    near = wa if t <= 0.5 else wb
    return (m * near + (1 - m) * bl).astype(np.uint8)
rep = {}
for f in sorted(glob.glob('dl/c*.mp4')) if len(sys.argv) < 2 else [f'dl/{x}.mp4' for x in sys.argv[1:]]:
    cap = cv2.VideoCapture(f); fr = []
    while True:
        ok, x = cap.read()
        if not ok: break
        fr.append(x)
    sm = [cv2.resize(cv2.cvtColor(x, cv2.COLOR_BGR2GRAY), (270, 480)).astype(np.int16) for x in fr]
    d = np.array([np.abs(sm[i] - sm[i - 1]).mean() for i in range(1, len(sm))])
    big = np.median(np.sort(d)[len(d) // 2:])
    hold = [i for i in range(1, len(fr)) if d[i - 1] < 0.3 * big]   # frame i ~= frame i-1
    keys = [i for i in range(len(fr)) if i not in hold]
    out = list(fr)
    for k0, k1 in zip(keys, keys[1:]):
        for i in range(k0 + 1, k1): out[i] = mid(fr[k0], fr[k1], (i - k0) / (k1 - k0))
    name = os.path.basename(f); rep[name] = dict(holds=len(hold), frames=len(fr))
    p = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-threads', _os.environ.get('CINE_THREADS', '2'), '-pix_fmt', 'bgr24', '-s', f'{fr[0].shape[1]}x{fr[0].shape[0]}', '-r', '24', '-i', '-', '-c:v', 'libx264', '-crf', '14', '-preset', 'medium', '-pix_fmt', 'yuv420p', f'dl24/{name}'], stdin=subprocess.PIPE)
    for x in out: p.stdin.write(x.tobytes())
    p.stdin.close(); p.wait(); json.dump(dict(keys=keys, n=len(fr)), open(f'dl24/{name[:-4]}.json', 'w')); print(name, rep[name], flush=True)
