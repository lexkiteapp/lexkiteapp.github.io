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
# mép cắt dưới (hông/vai) mờ dần → không lộ đường cắt ngang/khung khi đặt trên nền trang (chủ: tách nền sạch, hoà vào nền, không khung)
fade = lambda f: f"geq=lum='if(gte(lum(X,Y),12),lum(X,Y),0)*min(1,(H-Y)/(H*{f}))'"
FADE = fade(0.10)


def run(*a): return subprocess.run(a, check=True, capture_output=True, text=True)


def probe(f, entries): return run('ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', f'stream={entries}', '-of', 'csv=p=0', f).stdout.strip()


def bbox(mask, crop):   # bao alpha (ngưỡng 24) gộp mọi khung, toạ độ trong khung cắt
    out = subprocess.run(['ffmpeg', '-nostats', '-i', mask, '-vf', f'format=gray,crop={crop},bbox=min_val=24', '-f', 'null', '-'], capture_output=True, text=True).stderr
    bs = [[int(x) for x in (l.split('x1:')[1].split()[0], l.split('y1:')[1].split()[0], l.split('x2:')[1].split()[0], l.split('y2:')[1].split()[0])] for l in out.splitlines() if 'x1:' in l]
    return [min(b[0] for b in bs), min(b[1] for b in bs), max(b[2] for b in bs), max(b[3] for b in bs)] if bs else None


def edge_qc(name, rgba, tol=2):   # tol: webp 2; video H.264 8 (nhiễu nén)   # 🚧 tách nền sạch: mép trên/trái/phải trong suốt (không còn nền), viền tóc không ánh xanh, thân đặc
    import numpy as np
    A = rgba[..., 3].astype(float); C = rgba[..., :3].astype(float)
    if max(A[0].max(), A[:, 0].max(), A[:, -1].max()) > tol: errs.append(f'{name}: người/nền chạm mép trên/trái/phải (alpha > {tol}) – khung phải chứa trọn người, không che bằng làm mờ')
    e = (A > 16) & (A < 240); col = C[e]
    if e.sum():
        spill = ((col[:, 1] > np.maximum(col[:, 0], col[:, 2]) + 22) & (col[:, 1] > 50)).mean()
        if spill > 0.004: errs.append(f'{name}: viền ánh xanh {spill:.2%} > 0,4 %')
    print(f'    qc {name}: viền {int(e.sum())} px, ánh xanh {spill if e.sum() else 0:.3%}')


# lượt 1: bề ngang thật của người (vai/tay mọi tư thế, trong dải khung) → 1 bề rộng canvas CHUNG cho cả 2 (cùng cỡ đầu, không cắt vai)
geo = {}
for who, P in R['people'].items():
    s = P['eye_mouth'] / F['eye_mouth']; CH = round(H * s / 2) * 2; CY = round(P['eye'][1] - F['eye_y'] * CH)   # px nguồn / px đích → cùng cỡ đầu
    t0 = P['clips']['talk']['src']; FW, FH = map(int, probe(f'{G}/kmask_pro/{t0}.mkv', 'width,height').split(',')[:2])
    xs = [b for c in P['clips'].values() if os.path.exists(f"{G}/kmask_pro/{c['src']}.mkv") for b in [bbox(f"{G}/kmask_pro/{c['src']}.mkv", f'{FW}:{CH}:0:{CY}')] if b]
    hw = max(max(P['eye'][0] - b[0], b[2] - P['eye'][0]) for b in xs) * 1.06 + 4 * s
    geo[who] = dict(s=s, CH=CH, CY=CY, FW=FW, FH=FH, need=2 * hw / s)
W = max(F['w'], *(round(g['need'] / 2 + 0.5) * 2 for g in geo.values())); F['w'] = W; print(f'canvas {W}x{H}')

for who, P in R['people'].items():
    os.makedirs(f'{OUT}/{who}', exist_ok=True)
    s, CH, CY, FW, FH = (geo[who][k] for k in ('s', 'CH', 'CY', 'FW', 'FH'))
    X0 = P['eye'][0] - W * s / 2; cx0, cx1 = max(0, round(X0)), min(FW, round(X0 + W * s))   # khung lý tưởng; phần ngoài clip gốc = đệm trong suốt
    CW, CX = (cx1 - cx0) // 2 * 2, cx0; SW = min(W, round(CW / s / 2) * 2); PX = min(W - SW, max(0, round((cx0 - X0) / s)))
    t0 = P['clips']['talk']['src']
    if CY < 0 or CY + CH > FH: errs.append(f'{who}: khung cao {CH}+{CY} ra ngoài clip {FW}x{FH}'); continue
    crop = f'{CW}:{CH}:{CX}:{CY}'; SC = f'scale={SW}:{H}:flags=lanczos,pad={W}:{H}:{PX}:0:black'
    # alpha: vùng đệm = 0 TUYỆT ĐỐI (pad xám tô 16 = 'đen dải hẹp' → lộ khung mờ), mép dưới mờ dần
    FA = f"geq=lum='if(between(X,{PX},{PX + SW - 1})*gte(lum(X,Y),12),lum(X,Y),0)*min(1,(H-Y)/(H*0.10))'"
    # bản 2× (màn retina, chỗ lớn: ăn mừng, Call): cùng khung, gấp đôi điểm ảnh
    SC2 = f'scale={SW * 2}:{H * 2}:flags=lanczos,pad={W * 2}:{H * 2}:{PX * 2}:0:black'
    FA2 = f"geq=lum='if(between(X,{PX * 2},{PX * 2 + SW * 2 - 1})*gte(lum(X,Y),12),lum(X,Y),0)*min(1,(H-Y)/(H*0.10))'"
    still = lambda cf, cm, fr, sc, fa, out: run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex',
        f'[1:v]select=eq(n\\,{fr}),format=gray,crop={crop},{sc},{fa}[a];[0:v]select=eq(n\\,{fr}),crop={crop},{sc}[c];[c][a]alphamerge', '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '88', out)
    print(f'{who}: crop {crop} → {SW}x{H} đệm {PX} → {W}x{H}')
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
        g = (f"[1:v]trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB,format=gray,crop={crop},{SC},{FA}[a];"
             f"[0:v]trim=start_frame={a}:end_frame={z},setpts=N/({fps})/TB,crop={crop},{SC},format=rgba[c];"
             "[c][a]alphamerge,premultiply=inplace=1,format=rgba,split[p1][p2];[p1]format=rgb24[pm];[p2]alphaextract,format=gray,format=rgb24[ar];"
             f"[pm][ar]vstack=2,split[f][r];[r]reverse,trim=start_frame=1:end_frame={N - 1},setpts=N/({fps})/TB[b];[f][b]concat=n=2:v=1,setpts=N/({fps})/TB,format=yuv420p")
        o = f'{OUT}/{who}/{pose}.mp4'
        run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', g, '-an', '-r', fps, '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'veryslow',
            '-crf', str(F['crf']), '-tune', 'animation', '-movflags', '+faststart', o)
        got = probe(o, 'width,height,nb_read_frames')
        if got != f'{W},{H * 2},{2 * N - 2}': errs.append(f'{o}: {got} (cần {W},{H * 2},{2 * N - 2})')
        if os.path.getsize(o) > 240 * 1024: errs.append(f'{o}: {os.path.getsize(o) // 1024} KB > 240 KB')
        print(f'  {pose:9s} {src}[{a}:{z}] {os.path.getsize(o) // 1024} KB')
        # ảnh tĩnh từng tư thế @2× (khung tiêu biểu: 'still' trong registry, mặc định 40 % clip) – Chars.still / Chars.img({pose})
        still(cf, cm, c.get('still', a + N * 2 // 5), SC2, FA2, f'{OUT}/{who}/still-{pose}.webp')
        if pose in ('talk', 'listen'):   # clip HD cho chỗ lớn sống (Call): 2× điểm ảnh, ≤ 900 KB
            oh = f'{OUT}/{who}/{pose}-hd.mp4'
            run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', g.replace(f',{SC},{FA}[a]', f',{SC2},{FA2}[a]').replace(f',{SC},format=rgba[c]', f',{SC2},format=rgba[c]'),
                '-an', '-r', fps, '-c:v', 'libx264', '-profile:v', 'main', '-preset', 'veryslow', '-crf', str(F['crf']), '-tune', 'animation', '-movflags', '+faststart', oh)
            if probe(oh, 'width,height,nb_read_frames') != f'{W * 2},{H * 4},{2 * N - 2}': errs.append(f'{oh}: sai cỡ/khung')
            if os.path.getsize(oh) > 900 * 1024: errs.append(f'{oh}: {os.path.getsize(oh) // 1024} KB > 900 KB')
    cf, cm = f'{G}/kfull_pro/{t0}.mp4', f'{G}/kmask_pro/{t0}.mkv'
    run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', f'[1:v]format=gray,crop={crop},{SC},{FA}[a];[0:v]crop={crop},{SC}[c];[c][a]alphamerge',
        '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '88', f'{OUT}/{who}/poster.webp')
    S = round(P['eye_mouth'] * 5 / 2) * 2; AX, AY = round(P['eye'][0] - S / 2), round(P['eye'][1] - P['eye_mouth'] * 2.6); A = F['avatar']
    run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', f'[1:v]format=gray,crop={S}:{S}:{AX}:{AY},scale={A}:{A}:flags=lanczos,{fade(0.22)}[a];[0:v]crop={S}:{S}:{AX}:{AY},scale={A}:{A}:flags=lanczos[c];[c][a]alphamerge',
        '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '88', f'{OUT}/{who}/avatar.webp')
    still(cf, cm, 0, SC2, FA2, f'{OUT}/{who}/poster-2x.webp')
    A2 = A * 2
    run('ffmpeg', '-v', 'error', '-y', '-i', cf, '-i', cm, '-filter_complex', f'[1:v]format=gray,crop={S}:{S}:{AX}:{AY},scale={A2}:{A2}:flags=lanczos,{fade(0.22)}[a];[0:v]crop={S}:{S}:{AX}:{AY},scale={A2}:{A2}:flags=lanczos[c];[c][a]alphamerge',
        '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '88', f'{OUT}/{who}/avatar-2x.webp')
    from PIL import Image
    import numpy as np
    for k in ['poster', 'avatar', 'poster-2x', 'avatar-2x'] + [f'still-{p}' for p in R['poses'] if os.path.exists(f'{OUT}/{who}/still-{p}.webp')]: edge_qc(f'{who}/{k}.webp', np.array(Image.open(f'{OUT}/{who}/{k}.webp').convert('RGBA')))
    for pose in R['poses']:
        o = f'{OUT}/{who}/{pose}.mp4'
        if not os.path.exists(o): continue
        grab = lambda vf, fmt, ch: np.frombuffer(subprocess.run(['ffmpeg', '-v', 'error', '-i', o, '-vf', f'select=eq(n\\,12),{vf}', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', fmt, '-'], capture_output=True).stdout, np.uint8).reshape(H, W, ch).astype(float)
        a = grab(f'crop={W}:{H}:0:{H}', 'gray', 1); c = grab(f'crop={W}:{H}:0:0', 'rgb24', 3)   # alpha đọc thẳng luma (không lem chroma từ nửa màu)
        c = np.where(a > 0, np.clip(c * 255 / np.maximum(a, 1), 0, 255), 0)
        edge_qc(f'{who}/{pose}.mp4', np.concatenate([c, a], 2).astype(np.uint8), tol=8)
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
