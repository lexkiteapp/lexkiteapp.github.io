#!/usr/bin/env python3
"""👩‍🏫 Dựng bộ nhân vật DUY NHẤT (web/teach/characters.json) từ clip phông xanh đã tách nền PRO (footage/anchor/green/{kfull_pro,kmask_pro}).

Mọi tư thế của MỘT người dùng CÙNG khung cắt; Ama và Carlos cùng cỡ đầu + cùng đường mắt (chuẩn hoá theo khoảng mắt→miệng đo trong
bank_gestures.json layout) → đặt cạnh nhau, đổi tư thế, đổi màn hình đều trông y hệt. Xuất web/teach/<who>/:
  <pose>.mp4  H.264 "xếp chồng" (nửa trên màu đã nhân alpha, nửa dưới alpha), vòng ping-pong liền mạch – app ghép alpha bằng WebGL
  poster.webp (khung đầu clip talk, alpha) · avatar.webp (vuông, đầu-vai, alpha)
rồi ghi sha256/bytes vào characters.json "files" (cổng CI scripts/test/characters-gate.mjs so hash).
Chạy trên CI (.github/workflows/teach-build.yml) – không render trên máy cá nhân. Dùng: build.py <footage/anchor/green> [web/teach]
"""
import hashlib, json, os, subprocess, sys

G = sys.argv[1]; OUT = sys.argv[2] if len(sys.argv) > 2 else 'web/teach'
REG = f'{OUT}/characters.json'
R = json.load(open(REG)); F = R['frame']; W, H = F['w'], F['h']
errs = []


def run(*a): return subprocess.run(a, check=True, capture_output=True, text=True)


def probe(f, entries): return run('ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', f'stream={entries}', '-of', 'csv=p=0', f).stdout.strip()


def bbox(mask, crop):   # bao alpha (ngưỡng 24) gộp mọi khung, toạ độ trong khung cắt
    out = subprocess.run(['ffmpeg', '-nostats', '-i', mask, '-vf', f'format=gray,crop={crop},bbox=min_val=24', '-f', 'null', '-'], capture_output=True, text=True).stderr
    bs = [[int(x) for x in (l.split('x1:')[1].split()[0], l.split('y1:')[1].split()[0], l.split('x2:')[1].split()[0], l.split('y2:')[1].split()[0])] for l in out.splitlines() if 'x1:' in l]
    return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)] if bs else None


for who, P in R['people'].items():
    os.makedirs(f'{OUT}/{who}', exist_ok=True)
    s = P['eye_mouth'] / F['eye_mouth']                     # px nguồn / px đích → cùng cỡ đầu cho cả 2 người
    CW, CH = round(W * s / 2) * 2, round(H * s / 2) * 2
    CX, CY = round(P['eye'][0] - CW / 2), round(P['eye'][1] - F['eye_y'] * CH)
    t0 = P['clips']['talk']['src']; FW, FH = map(int, probe(f'{G}/kmask_pro/{t0}.mkv', 'width,height').split(',')[:2])
    if CX < 0 or CY < 0 or CX + CW > FW or CY + CH > FH: errs.append(f'{who}: khung {CW}x{CH}+{CX}+{CY} ra ngoài clip {FW}x{FH}'); continue
    crop = f'{CW}:{CH}:{CX}:{CY}'; print(f'{who}: crop {crop} → {W}x{H}')
    for pose in R['poses']:
        c = P['clips'][pose]; src = c['src']; cf, cm = f'{G}/kfull_pro/{src}.mp4', f'{G}/kmask_pro/{src}.mkv'
        if not (os.path.exists(cf) and os.path.exists(cm)):
            (print if c.get('pending') else errs.append)(f'{who}/{pose}: thiếu nguồn {src}' + (' (pending – để sau)' if c.get('pending') else '')); continue
        c.pop('pending', None)
        # 🚧 đầu không bị cắt: đỉnh tóc dưới mép trên ≥ 3 % khung; người không lấn ra 2 bên quá 4 %
        b = bbox(cm, crop)
        if not b: errs.append(f'{who}/{pose}: alpha rỗng'); continue
        if b[1] < CH * 0.03: errs.append(f'{who}/{pose}: đỉnh đầu sát/mất mép trên (y1={b[1]} / {CH})')
        fps = probe(cf, 'r_frame_rate').split(',')[0]
        n = min(int(probe(f, 'nb_read_frames')) for f in (cf, cm)); a, z = c.get('from', 0), min(c.get('to', n - 1), n - 1) + 1; N = z - a
        g = (f"[1:v]trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB,format=gray,crop={crop},scale={W}:{H}:flags=lanczos[a];"
             f"[0:v]trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB,crop={crop},scale={W}:{H}:flags=lanczos,format=rgba[c];"
             "[c][a]alphamerge,premultiply=inplace=1,format=rgba,split[p1][p2];[p1]format=rgb24[pm];[p2]alphaextract,format=gray,format=rgb24[ar];"
             f"[pm][ar]vstack=2,split[f][r];[r]reverse,trim=start_frame=1:end_frame={N - 1},setpts=N/({fps})/TB[b];[f][b]concat=n=2:v=1,setpts=N/({fps})/TB,format=yuv420p")
        o = f'{OUT}/{who}/{pose}.mp4'
        run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', g, '-an', '-r', fps, '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'veryslow',
            '-crf', str(F['crf']), '-tune', 'animation', '-movflags', '+faststart', o)
        got = probe(o, 'width,height,nb_read_frames')
        if got != f'{W},{H * 2},{2 * N - 2}': errs.append(f'{o}: {got} (cần {W},{H * 2},{2 * N - 2})')
        if os.path.getsize(o) > 240 * 1024: errs.append(f'{o}: {os.path.getsize(o) // 1024} KB > 240 KB')
        print(f'  {pose:9s} {src}[{a}:{z}] {os.path.getsize(o) // 1024} KB')
    cf, cm = f'{G}/kfull_pro/{t0}.mp4', f'{G}/kmask_pro/{t0}.mkv'
    run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', f'[1:v]format=gray[a];[0:v][a]alphamerge,crop={crop},scale={W}:{H}:flags=lanczos',
        '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '88', f'{OUT}/{who}/poster.webp')
    S = round(P['eye_mouth'] * 5 / 2) * 2; AX, AY = round(P['eye'][0] - S / 2), round(P['eye'][1] - P['eye_mouth'] * 2.6); A = F['avatar']
    run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', f'[1:v]format=gray[a];[0:v][a]alphamerge,crop={S}:{S}:{AX}:{AY},scale={A}:{A}:flags=lanczos',
        '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '88', f'{OUT}/{who}/avatar.webp')
    kb = sum(os.path.getsize(f'{OUT}/{who}/{k}') for k in ('talk.mp4', 'listen.mp4', 'poster.webp')) // 1024
    if kb > 420: errs.append(f'{who}: talk+listen+poster {kb} KB > 420 KB')

# sha256 mọi tệp – cổng CI + kiểm hình trên ảnh chụp so với đây
R['files'] = {}
for who in R['people']:
    for f in sorted(os.listdir(f'{OUT}/{who}')):
        p = f'{OUT}/{who}/{f}'; d = open(p, 'rb').read(); R['files'][f'{who}/{f}'] = {'sha256': hashlib.sha256(d).hexdigest(), 'bytes': len(d)}
json.dump(R, open(REG, 'w'), ensure_ascii=False, indent=2); open(REG, 'a').write('\n')
for e in errs: print(f'::error::{e}')
sys.exit(1 if errs else 0)
