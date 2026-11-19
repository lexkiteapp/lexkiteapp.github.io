#!/usr/bin/env python3
"""🎬 Diễn viên video hằng ngày = ĐÚNG bộ nhân vật registry (web/teach/characters.json – 2D Ama/Carlos trang phục 1, chủ 28/10).

Dựng clip "stacked" (nửa trên màu, nửa dưới mặt nạ alpha – định dạng render.mjs/keyclip.mjs đọc) cho mọi mục build:"registry"
trong brand/library/manifest.json, từ clip phông xanh nguồn PRO (footage/anchor/green/{kfull_pro,kmask_pro}) đúng id `src` của tư thế.
Khung "medium" (nửa người, neo đáy khung hình video): cùng cỡ đầu + cùng đường mắt cho Ama và Carlos (chuẩn hoá theo eye/eye_mouth
trong registry, như scripts/teach/build.py) – 720×1080 mỗi nửa. Mỗi tư thế chia 2 đoạn chuyển động (part a = nửa đầu, b = nửa sau)
để 1 video không lặp lại cùng 1 động tác. Tư thế còn `pending` trong registry → bỏ qua (render chỉ dùng clip có file).
Chạy trên CI (.github/workflows/video.yml) – KHÔNG render trên máy cá nhân. Dùng: registry_clips.py <footage/anchor/green> [brand/library]
"""
import json, os, subprocess, sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from teach.registry import REG, check  # noqa: E402

G = sys.argv[1]; LIB = sys.argv[2] if len(sys.argv) > 2 else 'brand/library'
M = json.load(open(f'{LIB}/manifest.json'))
CL = [c for c in M['clips'] if c.get('build') == 'registry']
W, H, EYE_Y = 720, 1080, 0.24        # nửa khung đích, mắt ở 24 % chiều cao (đầu + vai + thân tới hông)
errs = []


def run(*a): return subprocess.run(a, check=True, capture_output=True, text=True)


def probe(f, e): return run('ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', f'stream={e}', '-of', 'csv=p=0', f).stdout.strip()


# cỡ đầu chung: em_out (px mắt→miệng ở khung đích) lớn nhất mà khung cắt của CẢ HAI người còn nằm trong clip nguồn
size = {}
for who, P in REG['people'].items():
    t0 = P['clips']['talk']['src']; size[who] = tuple(map(int, probe(f'{G}/kmask_pro/{t0}.mkv', 'width,height').split(',')[:2]))
em_out = 0
for who, P in REG['people'].items():
    FW, FH = size[who]; em = P['eye_mouth']; ex, ey = P['eye']
    em_out = max(em_out, H * em * EYE_Y / ey, H * em * (1 - EYE_Y) / (FH - ey), W * em / 2 / min(ex, FW - ex))
em_out = int(em_out) + 1
print(f'em_out={em_out}px · {W}x{H}/nửa')

for c in CL:
    who, pose = c['who'], c['pose']; P = REG['people'][who]; spec = P['clips'][pose]
    check(who, [spec['src']])
    if c['src'] != spec['src']: errs.append(f"{c['id']}: src {c['src']} ≠ registry {spec['src']} – sửa manifest.json"); continue
    if spec.get('pending'): print(f"  {c['id']}: registry pending – bỏ qua"); continue
    cf, cm = f"{G}/kfull_pro/{spec['src']}.mp4", f"{G}/kmask_pro/{spec['src']}.mkv"
    if not (os.path.exists(cf) and os.path.exists(cm)): errs.append(f"{c['id']}: thiếu nguồn {spec['src']}"); continue
    s = P['eye_mouth'] / em_out; CW, CH = round(W * s / 2) * 2, round(H * s / 2) * 2
    CX, CY = round(P['eye'][0] - CW / 2), round(P['eye'][1] - EYE_Y * CH)
    FW, FH = size[who]; CX = max(0, min(FW - CW, CX)); CY = max(0, min(FH - CH, CY))
    fps = probe(cf, 'r_frame_rate').split(',')[0]
    n = min(int(probe(f, 'nb_read_frames')) for f in (cf, cm)); a0, z0 = spec.get('from', 0), min(spec.get('to', n - 1), n - 1) + 1
    mid = (a0 + z0) // 2; a, z = (a0, mid) if c['part'] == 'a' else (mid, z0)
    if z - a < 24: errs.append(f"{c['id']}: đoạn {a}:{z} quá ngắn (< 1 s)"); continue
    crop = f'{CW}:{CH}:{CX}:{CY}'
    g = (f"[1:v]trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB,format=gray,crop={crop},scale={W}:{H}:flags=lanczos,format=rgb24[al];"
         f"[0:v]trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB,crop={crop},scale={W}:{H}:flags=lanczos,despill=type=green:mix=0.6:expand=0.1,format=rgb24[co];"
         "[co][al]vstack=2,format=yuv420p")
    o = f"{LIB}/{c['file']}"; os.makedirs(os.path.dirname(o), exist_ok=True)
    run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', g, '-an', '-r', fps, '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-movflags', '+faststart', o)
    got = probe(o, 'width,height')
    if got != f'{W},{H * 2}': errs.append(f'{o}: {got} (cần {W},{H * 2})')
    print(f"  {c['id']:24s} {spec['src']}[{a}:{z}] crop {crop} {os.path.getsize(o) // 1024} KB")

for e in errs: print(f'::error::{e}')
sys.exit(1 if errs else 0)
