#!/usr/bin/env python3
"""Test các hàm đo của scripts/video/asset_check.py + asset_anatomy.py bằng ảnh/clip tổng hợp nhỏ (không cần kho thật).
Chạy: .tools/pyenv/bin/python scripts/test/asset_check_test.py  (scripts/test/library.mjs tự gọi nếu có numpy)."""
import os, shutil, subprocess, sys, tempfile

import numpy as np

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'video'))
import asset_check as A  # noqa: E402
import asset_anatomy as N  # noqa: E402

fails = []


def ok(cond, msg):
    if not cond:
        fails.append(msg)


BG = (250, 246, 238)


def canvas(h=400, w=300):
    return np.full((h, w, 3), BG, np.uint8)


def person(img, x0=110, y0=60, x1=190, y1=360, hair=(90, 50, 30), top=(15, 61, 62)):
    img[y0:y1, x0:x1] = (60, 40, 30)              # thân/viền tối
    img[y0:y0 + 30, x0 + 10:x1 - 10] = hair        # tóc
    img[y0 + 30:y0 + 70, x0 + 15:x1 - 15] = (200, 140, 110)  # mặt
    img[y0 + 90:y0 + 160, x0 + 5:x1 - 5] = top     # áo
    return img


# ---------- ảnh ----------
im = person(canvas())
bg, mad, p95 = A.border_uniformity(im)
ok(mad < 1 and p95 < 1, f'nền trơn phải mad≈0 (mad={mad}, p95={p95})')
noisy = im.copy(); noisy[:, :] = np.clip(noisy.astype(int) + np.random.default_rng(1).integers(-40, 40, noisy.shape), 0, 255)
_, mad2, _ = A.border_uniformity(noisy)
ok(mad2 > A.T['bg_mad'], f'nền nhiễu phải vượt ngưỡng (mad={mad2})')

mask = A.fg_mask(im, bg)
mg = A.bbox_margins(mask)
ok(min(mg) >= A.T['margin'], f'nhân vật giữa khung phải cách mép ≥ 2 % ({mg})')
edge = person(canvas(), y1=400)
mg2 = A.bbox_margins(A.fg_mask(edge, bg))
ok(mg2[3] < A.T['margin'], f'nhân vật chạm đáy phải bị bắt ({mg2})')
spec = im.copy(); spec[0, 5:20] = 0  # 1 hàng điểm rác ở mép (Kling) không được tính là chạm mép
ok(min(A.bbox_margins(A.fg_mask(spec, bg))) >= A.T['margin'], 'điểm rác 1 hàng ở mép không được làm FAIL in_frame')

ok(A.text_score(im, mask) < A.T['text_density'], 'ảnh sạch không được nghi chữ')
wm = im.copy()
for i in range(8):  # "chữ" ở góc phải dưới: các nét dọc mảnh tương phản cao
    wm[372:392, 240 + i * 6:242 + i * 6] = 20
ok(A.text_score(wm, A.fg_mask(wm, bg)) >= A.T['text_density'], 'watermark ở góc phải bị nghi chữ')

brand = canvas(); brand[100:300, 100:200] = (229, 80, 47)
ok(A.brand_share(brand, A.fg_mask(brand, bg)) > 0.9, 'mảng cam thương hiệu phải gần màu thương hiệu')
off = canvas(); off[100:300, 100:200] = (40, 40, 200)
ok(A.brand_share(off, A.fg_mask(off, bg)) < A.T['brand_share'], 'mảng xanh dương (Kit cũ) phải xa màu thương hiệu')

ok(A.ratio_ok(1760, 2336, A.parse_ratio('3:4')) and not A.ratio_ok(1080, 1920, A.parse_ratio('3:4')), 'tỉ lệ 3:4')


def room(h=640, w=360, busy=False):
    r = np.zeros((h, w, 3), np.uint8)
    r[: int(h * 0.6)] = (230, 210, 180)    # tường
    r[int(h * 0.6):] = (170, 120, 80)      # sàn
    vx, vy = w // 2, int(h * 0.45)
    for x_end in (-200, 0, 90, 270, 360, 560):  # vạch sàn hội tụ về điểm tụ
        for t in np.linspace(0, 1, 800):
            y = int(h * 0.6 + t * (h - 1 - h * 0.6)); x = int(vx + (x_end - vx) * (y - vy) / (h - 1 - vy))
            if 0 <= x < w:
                r[y, max(0, x - 1):x + 1] = (90, 60, 40)
    if busy:
        r[int(h * 0.62):int(h * 0.9):6, int(w * 0.3):int(w * 0.7)] = 20
    return r


rm = room()
ok(A.floor_busy(rm) <= A.T['floor_busy'], f'sàn trống phải qua (busy={A.floor_busy(rm):.3f})')
ok(A.floor_busy(room(busy=True)) > A.T['floor_busy'], 'sàn có đồ giữa phải bị bắt')
fp = A.estimate_floor(rm)
ok(abs(fp['floor']['yFar'] - 384) <= 640 * 0.03, f'đường sàn ước lượng ≈ 384 ({fp["floor"]})')
ok(abs(fp['vanish'][0] - 180) < 40 and abs(fp['vanish'][1] - 288) < 70, f'điểm tụ ≈ (180, 288) ({fp["vanish"]})')
ok(fp['scaleAt']['hNear'] > fp['scaleAt']['hFar'] > 0, 'người gần cao hơn người xa')

# ---------- clip ----------
def clip(n=48, move_feet=0, spike=None, black=None, hair_grow=False, dup=0):
    fr = []
    for i in range(n):
        f = person(canvas(), x0=110 + (i % 2), y1=360 + (int(move_feet * i / n)))
        if hair_grow and i > n // 2:
            f[62:100, 80:112] = (90, 50, 30)  # tóc buộc đuôi mọc ra bên trái đầu
        if spike is not None and i == spike:
            f[:] = (10, 200, 10)
        if black is not None and i == black:
            f[:] = 0
        fr.append(f)
    for i in range(dup):
        fr[10 + i] = fr[10].copy()
    return np.stack(fr)


c = clip()
d = A.frame_diffs(c)
ok(A.black_frames(c) == [], 'clip sạch không có khung đen')
ok(A.black_frames(clip(black=5)) == [5], 'bắt khung đen #5')
ok(A.dup_runs(A.frame_diffs(clip(dup=8))) >= A.T['dup_run'], 'bắt chuỗi khung trùng')
ok(A.jerk_frames(A.frame_diffs2(c)) == [], 'clip đều không bị tính giật')
jf = A.jerk_frames(A.frame_diffs2(clip(spike=20)))
ok(any(abs(j - 20) <= 2 for j in jf), f'bắt khung đột biến #20 ({jf})')
masks = A.masks_for(c, BG)
ok(A.foot_wobble(masks) < A.T['foot'], 'chân đứng yên')
ok(A.foot_wobble(A.masks_for(clip(move_feet=30), BG)) >= A.T['foot'], 'bắt chân trôi')
dr, _ = A.identity_drift(c, masks)
ok(dr < 0.5, f'không đổi nhận dạng → drift thấp ({dr})')
hg = clip(hair_grow=True)
dr2, det = A.identity_drift(hg, A.masks_for(hg, BG))
ok(dr2 > dr and det.get('hairGrowth', 1) > 1.2, f'tóc mọc thêm → hairGrowth tăng ({det})')
ok(A.cadence_twos(np.array([5, 0.1] * 20)) >= 0.45, 'nhận ra hoạt hình on twos')

al = np.zeros((10, 50, 50), np.uint8); al[:, 10:40, 20:30] = 255
ok(A.alpha_flicker(al) == 0, 'mask ổn định không nhấp nháy')
fl = al.copy(); fl[1::2, 10:40, 30:34] = 255
ok(A.alpha_flicker(fl) > A.T['flicker'], 'bắt mép alpha nhấp nháy')
sh = np.zeros((100, 60), np.uint8); sh[10:95, 25:35] = 255; sh[94:97, 5:55] = 120
ok(A.floor_shadow(sh) >= A.T['shadow_ratio'], 'bắt bóng sàn dính')
ok(A.floor_shadow(np.pad(sh[:94], ((0, 6), (0, 0)))) < A.T['shadow_ratio'], 'không bóng sàn → qua')

ok(A.stacked_mask_stats(np.repeat(np.repeat(al[..., None], 3, axis=3), 1, axis=0))['binary'] > 0.95, 'mặt nạ thật: nhị phân')
raw = np.stack([person(canvas())] * 4)  # clip gốc khai nhầm "stacked": nửa dưới là ảnh màu
sv = A.stacked_mask_stats(raw[:, 200:])
ok(not (sv['chroma'] < 8 and sv['binary'] >= 0.85 and 0.02 <= sv['cover'] <= 0.9), f'clip gốc không được coi là mặt nạ ({sv})')

# ---------- anatomy & style ----------
ok(abs(N.angle((0, 0), (1, 0), (2, 0)) - 180) < 1e-6 and abs(N.angle((0, 0), (1, 0), (1, 1)) - 90) < 1e-6, 'góc khớp')
pts = {k: (0.0, 0.0) for k in N.L}
pts.update(lsh=(100, 100), lel=(100, 200), lwr=(100, 300), rsh=(200, 100), rel=(200, 200), rwr=(201, 110),
           lhip=(120, 300), lkn=(120, 420), lank=(120, 540), rhip=(180, 300), rkn=(180, 420), rank=(180, 540))
vis = {k: 0.9 for k in N.L}
lm = N.limbs_from_pose(pts, vis)
ok(lm['arms'] == 2 and lm['legs'] == 2, 'đếm 2 tay 2 chân')
ok(lm['elbow']['r'] < N.A['elbow_min'] + 1, f'khuỷu phải gập ngược ({lm["elbow"]})')
ok(any(not c[1] for c in N.limb_checks(lm)), 'khớp gãy bị bắt')
ok(abs(N.srgb_to_lab([255, 255, 255])[0] - 100) < 0.5 and N.delta_e(N.srgb_to_lab([255, 0, 0]), N.srgb_to_lab([255, 0, 0])) == 0, 'đổi màu Lab')
lines = np.full((400, 200, 3), 250, np.uint8); lm2 = np.ones((400, 200), bool)
for x in range(10, 190, 20):
    lines[:, x:x + 4] = 20
sw = N.stroke_width(lines, lm2, 1000)
ok(sw is not None and 3 <= sw <= 5, f'nét viền dày 4 px ({sw})')
flat = np.full((200, 200, 3), 128, np.uint8)
ok(N.photo_noise(flat, np.ones((200, 200), bool)) < N.A['noise'], 'tranh phẳng không nhiễu')
photo = np.clip(128 + np.random.default_rng(2).normal(0, 4, (200, 200, 3)), 0, 255).astype(np.uint8)
ok(N.photo_noise(photo, np.ones((200, 200), bool)) > N.A['noise'], 'kết cấu ảnh thật bị bắt')
fig = {'people': 1, 'hands': 2, 'faces': 0, 'limbs': {'arms': 2, 'legs': 2, 'elbow': {}, 'knee': {}, 'armSeg': {}, 'legSeg': {}}, 'headRatio': 0.33, 'noise': 1.0, 'strokeW': 4.0,
       'paletteSig': [[[50, -20, -20], 0.4], [[60, 30, 30], 0.2]], 'eyeEdges': 0.02}
ref = {'headRatio': 0.25, 'paletteSig': [[[50, -20, -20], 0.5], [[61, 30, 30], 0.2]], 'eyeEdges': 0.09}
res = {c[0]: c for c in N.checks(fig, ref, 'leo', [3.0, 6.0])}
ok(not res['head_ratio'][1] and res['head_ratio'][4] == 'FAIL', 'tỉ lệ đầu lệch 32 % → FAIL')
ok(not res['glasses'][1], 'Leo mất kính → FAIL')
ok(res['palette_dna'][1] and res['stroke'][1], 'màu áo & nét viền khớp DNA → qua')
sig = N.palette_sig(person(canvas()), A.fg_mask(person(canvas()), BG))
sig2 = N.palette_sig(person(canvas(), top=(229, 80, 47)), A.fg_mask(person(canvas(), top=(229, 80, 47)), BG))
ok(N.palette_distance(sig, sig) < 1 and N.palette_distance(sig, sig2) > N.A['de_fail'], 'đổi màu áo → bảng màu lệch DNA')
ok(N.checks({'mp': 'unavailable'}, None, 'mia')[0][4] == 'WARN', 'không chạy được MediaPipe → WARN (không FAIL)')

# ---------- đầu-cuối: clip mp4 tổng hợp qua ffprobe ----------
if shutil.which('ffmpeg') and shutil.which('ffprobe'):
    d = tempfile.mkdtemp()
    f = os.path.join(d, 't.mp4')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0xFAF6EE:s=96x128:d=2:r=24', '-vf', 'drawbox=x=36:y=20:w=24:h=90:color=0x3C281E:t=fill', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', f], check=True)
    r = A.check_clip(f)
    st = {c['name']: c['status'] for c in r['checks']}
    ok(st['codec'] == 'PASS' and st['fps'] == 'PASS', f'h264 24 fps qua ({st})')
    ok(st['duration'] == 'FAIL' and st['resolution'] == 'FAIL', f'2 s & 96 px phải FAIL ({st})')
    ok(r['status'] == 'FAIL' and st['black_frames'] == 'PASS', 'tổng FAIL vì thời lượng/độ phân giải, không khung đen')
    shutil.rmtree(d)

if fails:
    print('✗ asset_check_test: ' + str(len(fails)) + ' lỗi'); [print('  - ' + f) for f in fails]; sys.exit(1)
print('✓ asset_check_test: các hàm đo ảnh/clip/anatomy đúng trên dữ liệu tổng hợp')
