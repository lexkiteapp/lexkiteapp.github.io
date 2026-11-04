#!/usr/bin/env python3
"""🎞️ Clip tư thế có "nhảy hình" không (số đo trên file, không cần trình duyệt). Workflow teacher-states.
Mỗi clip: ảnh tĩnh ↔ khung still_frame (lệch → ảnh→clip nhảy), khung đầu ↔ khung cuối (lặp có nối liền), bước nhảy alpha lớn nhất giữa 2 khung (giật/mất hình).
Viền/nhòe ở khung tay nhanh do scripts/teach/motion_smear.py (#546). Dùng: motion_jump.py [web/teach] [--report] [--out bảng.md]"""
import json, sys, os
import cv2, numpy as np
args = [a for a in sys.argv[1:] if not a.startswith('--')]
ROOT = args[0] if args else 'web/teach'; REPORT = '--report' in sys.argv
OUT = sys.argv[sys.argv.index('--out') + 1] if '--out' in sys.argv else ''
if OUT and args and args[-1] == OUT: args.pop()
STILL_MAX, LOOP_MAX, JUMP_MAX = 6.0, 6.0, 12.0  # /255, trung bình trên vùng người; xem docs/specs/teacher-motion.md
W, H = 277, 240
def frames(path):
    c = cv2.VideoCapture(path); out = []
    while True:
        ok, f = c.read()
        if not ok: break
        h = f.shape[0] // 2
        out.append((cv2.resize(f[:h], (W, H), interpolation=cv2.INTER_AREA).astype(np.float32), cv2.resize(f[h:, :, 0], (W, H), interpolation=cv2.INTER_AREA).astype(np.float32)))
    c.release(); return out
def still(path):
    im = cv2.imdecode(np.fromfile(path, np.uint8), cv2.IMREAD_UNCHANGED); a = im[..., 3:].astype(np.float32) / 255
    return cv2.resize((im[..., :3].astype(np.float32) * a), (W, H), interpolation=cv2.INTER_AREA), cv2.resize(im[..., 3].astype(np.float32), (W, H), interpolation=cv2.INTER_AREA)
def mad(a, b, mask): return float(np.abs(a - b).mean(axis=-1)[mask].mean()) if a.ndim == 3 else float(np.abs(a - b)[mask].mean())
reg = json.load(open(os.path.join(ROOT, 'characters.json'))); errs = []
md = ['| người | tư thế | nguồn | khung ảnh tĩnh | ảnh↔khung | đầu↔cuối | nhảy alpha max (@s) | số khung |', '|---|---|---|---|---:|---:|---:|---:|']
for who, p in reg['people'].items():
    for pose, c in p['clips'].items():
        F = frames(os.path.join(ROOT, who, pose + '.mp4'))
        if not F: errs.append(f'{who}/{pose}: không đọc được clip'); continue
        sf = c.get('still_frame', 0); s, sa = still(os.path.join(ROOT, who, f'still-{pose}.webp'))
        rgb, al = F[min(sf, len(F) - 1)]; m = (sa > 16) | (al > 16)
        sm = mad(s, rgb, m)
        m0 = (F[0][1] > 16) | (F[-1][1] > 16); lm = mad(F[0][0], F[-1][0], m0)
        js = [mad(F[i][1], F[i + 1][1], (F[i][1] > 16) | (F[i + 1][1] > 16)) for i in range(len(F) - 1)]
        j = int(np.argmax(js))
        md.append(f"| {who} | {pose} | {c.get('src', '')} | {sf} | {sm:.1f} | {lm:.1f} | {js[j]:.1f} (@{j / 24:.2f}) | {len(F)} |")
        if sm > STILL_MAX: errs.append(f'{who}/{pose}: ảnh tĩnh lệch khung {sf} = {sm:.1f} > {STILL_MAX}: ảnh→clip sẽ nhảy')
        if lm > LOOP_MAX: errs.append(f'{who}/{pose}: khung đầu↔cuối {lm:.1f} > {LOOP_MAX}: lặp không nối liền')
        if js[j] > JUMP_MAX: errs.append(f'{who}/{pose}: alpha nhảy {js[j]:.1f} > {JUMP_MAX} tại {j / 24:.2f} s')
txt = '\n'.join(md); print(txt)
if OUT: os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True); open(OUT, 'w').write(txt + '\n')
if errs: print('\n'.join(['', 'ĐỎ:'] + errs))
sys.exit(1 if errs and not REPORT else 0)
