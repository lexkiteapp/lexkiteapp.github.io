#!/usr/bin/env python3
"""💇 Thử đổi màu tóc trên clip phông xanh đã tách nền PRO (0 credit, chạy CI hair-try.yml – KHÔNG chạy trên máy cá nhân).
Mặt nạ tóc = điểm gần đen (độ sáng < ~6 %) trong vùng tóc: phía trên lông mày, hoặc hai bên ngoài khuôn mặt (búi tóc Ama) –
không chạm mắt, ria, miệng (nằm giữa mặt, dưới lông mày). Pha màu theo độ tối → giữ nét và bóng đổ của tóc.
Xuất: <out>/<clip>_hair.mp4 (màu đã đổi, cùng khung với kfull_pro) + <out>/<clip>_cmp.mp4 (trước | sau trên nền tối + sáng).
Dùng: hair.py <green dir> <clip> <who> <#rrggbb> <out>"""
import json, os, subprocess, sys
import numpy as np, cv2

G, CLIP, WHO, HEX, OUT = sys.argv[1:6]
R = json.load(open(os.path.join(os.path.dirname(__file__), '..', '..', 'web', 'teach', 'characters.json')))['people'][WHO]
EX, EY = R['eye']; EM = R['eye_mouth']; TGT = np.array([int(HEX[i:i + 2], 16) for i in (1, 3, 5)], np.float32)
os.makedirs(OUT, exist_ok=True)
W, H = 1080, 1920
def frames(path, fmt, ch):
    p = subprocess.Popen(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', fmt, '-'], stdout=subprocess.PIPE)
    while True:
        b = p.stdout.read(W * H * ch)
        if len(b) < W * H * ch: break
        yield np.frombuffer(b, np.uint8).reshape(H, W, ch)
yy, xx = np.mgrid[0:H, 0:W]
brow = EY - 0.42 * EM; face = 1.55 * EM          # trên lông mày | ngoài khuôn mặt (ngang), tới dưới cằm
region = (yy < brow) | ((np.abs(xx - EX) > face) & (yy < EY + 1.6 * EM))
enc = lambda o: subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', '24', '-i', '-',
                                  '-c:v', 'libx264', '-crf', '8', '-pix_fmt', 'yuv444p', '-preset', 'medium', o], stdin=subprocess.PIPE)
cw, VW = 360, 640
cmp_ = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{cw * 4}x{VW}', '-r', '24', '-i', '-',
                         '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', f'{OUT}/{CLIP}_cmp.mp4'], stdin=subprocess.PIPE)
out = enc(f'{OUT}/{CLIP}_hair.mp4'); n = 0
for c, a in zip(frames(f'{G}/kfull_pro/{CLIP}.mp4', 'rgb24', 3), frames(f'{G}/kmask_pro/{CLIP}.mkv', 'gray', 1)):
    c = c.astype(np.float32); al = a[..., 0].astype(np.float32) / 255
    lum = (0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]) / 255
    w = np.clip((0.075 - lum) / 0.045, 0, 1) * region * (al > 0.05)          # mức "tóc" 0..1 theo độ tối
    shade = np.clip(lum / 0.03, 0.55, 1.15)[..., None]                       # giữ sáng/tối trong tóc
    n2 = c * (1 - w[..., None]) + np.clip(TGT * shade, 0, 255) * w[..., None]
    out.stdin.write(n2.astype(np.uint8).tobytes())
    tiles = []
    for img in (c, n2):
        for bg in ((24, 26, 36), (247, 248, 252)):
            comp = img * al[..., None] + np.array(bg, np.float32) * (1 - al[..., None])
            y0 = max(0, int(EY - 3.2 * EM)); crop = comp[y0:y0 + int(cw * 1920 / 1080 * 0.6), int(EX - 0.9 * cw * 1.5):int(EX + 0.9 * cw * 1.5)]
            t = np.ascontiguousarray(crop.astype(np.uint8)); tiles.append(t)
    row = np.concatenate([cv2.resize(t, (cw, VW)) for t in (tiles[0], tiles[2], tiles[1], tiles[3])], 1)   # trước tối | sau tối | trước sáng | sau sáng
    cmp_.stdin.write(row.tobytes()); n += 1
for p in (out, cmp_): p.stdin.close(); p.wait()
print(json.dumps({'clip': CLIP, 'frames': n, 'hex': HEX}))
