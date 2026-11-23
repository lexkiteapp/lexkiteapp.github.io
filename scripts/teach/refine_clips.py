#!/usr/bin/env python3
"""Làm sạch clip giáo viên ĐÃ DỰNG (web/teach/<who>/<pose>[-hd].mp4) mà cổng motion_smear.py còn đỏ – 0 credit, không cần kho footage.
Lý do (23/11, main đỏ teacher-motion từ 20/11): #1375 thêm cổng + motion_smear vào build.py nhưng chỉ 6 clip HD mới đi qua nó; clip 1× và nhiều clip HD cũ đã commit từ trước
nên còn nét đen da tay / vung tay méo / đốm phông xanh. Ở đây: giải mã clip xếp chồng (màu×alpha / alpha) → nửa đi xuôi → despill + clean_hands + smear (đúng các bước build.py) →
dựng lại vòng ping-pong → nén lại cùng thông số (crf, ≤ 240 KB 1× / ≤ 900 KB HD, ánh xanh viền ≤ 0,4 %) → ghi sha256/bytes vào characters.json.
Chỉ động vào clip đang vượt ngưỡng cổng (không nới ngưỡng). Chạy trên CI (.github/workflows/teach-refine.yml).
Dùng: refine_clips.py <web/teach> [pose/clip ...]  (không tên = mọi clip vượt cổng)"""
import hashlib, json, os, subprocess, sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import motion_smear as M   # noqa: E402

D = sys.argv[1]; ONLY = set(a for a in sys.argv[2:])
R = json.load(open(f'{D}/characters.json')); F = R['frame']; CRF = F['crf']


def run(*a, **k): return subprocess.run(a, check=True, capture_output=True, **k)


def dims(f):
    w, h2, n = run('ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries', 'stream=width,height,nb_read_frames', '-of', 'csv=p=0', f).stdout.decode().strip().split(',')[:3]
    return int(w), int(h2), int(n)


def decode(f):
    """→ (w, h, đi xuôi: RGBA thẳng uint8 N khung) từ clip xếp chồng 2N−2 khung."""
    w, h2, n = dims(f); h = h2 // 2; N = (n + 2) // 2
    raw = run('ffmpeg', '-v', 'error', '-i', f, '-frames:v', str(N), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-').stdout
    v = np.frombuffer(raw, np.uint8).reshape(-1, h2, w, 3); fr = []
    for x in v:
        a = x[h:, :, 0]; c = x[:h].astype(np.float32)
        fr.append(np.dstack([np.where(a[..., None] > 4, np.minimum(c / np.maximum(a[..., None], 1) * 255, 255), 0).astype(np.uint8), a]))
    return w, h, fr


def encode(fr, w, h, o, crf, cq):
    N = len(fr); seq = fr + fr[N - 2:0:-1]; out = []
    for x in seq:
        a = x[..., 3:4].astype(np.float32) / 255.; c = (x[..., :3] * a).round().astype(np.uint8); al = np.repeat(x[..., 3:], 3, 2)
        out.append(np.vstack([c, al]).tobytes())
    run('ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{w}x{h * 2}', '-r', str(F['fps']), '-i', '-', '-an', '-vf', 'format=yuv420p', '-c:v', 'libx264', '-color_range', 'tv', '-colorspace', 'bt709',
        '-color_primaries', 'bt709', '-color_trc', 'bt709', '-profile:v', 'main', '-preset', 'veryslow', '-crf', str(crf), '-tune', 'animation', '-x264-params', f'chroma-qp-offset={cq}', '-movflags', '+faststart', o, input=b''.join(out))


def spill(o, w, h):   # = build.py vid_spill (khung 12)
    g = lambda vf, fmt, ch: np.frombuffer(run('ffmpeg', '-v', 'error', '-i', o, '-vf', f'select=eq(n\\,12),{vf}', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', fmt, '-').stdout, np.uint8).reshape(h, w, ch).astype(float)
    a = g(f'crop={w}:{h}:0:{h}', 'gray', 1); c = g(f'crop={w}:{h}:0:0', 'rgb24', 3); c = np.where(a > 0, np.clip(c * 255 / np.maximum(a, 1), 0, 255), 0)
    A = a[..., 0]; e = (A > 16) & (A < 240); col = c[e]
    return float(((col[:, 1] > np.maximum(col[:, 0], col[:, 2]) + 22) & (col[:, 1] > 50)).mean()) if e.sum() else 0.0


def measure(fr, sc):
    s = M.warp_score(fr, sc); top = sorted(s)[-3:]
    return dict(warp=sum(top) / max(1, len(top)), lines=max(int(M._hand_lines(x, sc, 45)[0].sum() / sc ** 2) for x in fr[::4]), olive=max(int(M.olive_px(x).sum() / sc ** 2) for x in fr))


def inpaint_olive(f, sc):
    """Lỗ phông xanh sót (Kling vẽ hai tay chồng nhau) → vá bằng màu liền kề (alpha giữ nguyên)."""
    m = M.olive_px(f).astype(np.uint8)
    if not m.any(): return f
    import cv2
    m = cv2.dilate(m, np.ones((3, 3), np.uint8)) * 255; o = f.copy(); o[..., :3] = cv2.inpaint(np.ascontiguousarray(f[..., :3]), m, max(2, int(3 * sc)), cv2.INPAINT_TELEA); return o


def bad(m): return m['warp'] > M.MAX_WARP or m['lines'] > M.MAX_LINES or m['olive'] > M.MAX_OLIVE


errs = []
for who in R['people']:
    for p in sorted(os.listdir(f'{D}/{who}')):
        if not p.endswith('.mp4') or p.startswith('idle'): continue
        name = f'{who}/{p[:-4]}'
        if ONLY and name not in ONLY: continue
        f = f'{D}/{who}/{p}'; w, h, fr = decode(f); sc = w / 554
        before = measure(fr, sc)
        if not ONLY and not bad(before): continue
        res, info = M.smear([M.clean_hands(M.despill(x), sc) for x in fr], sc); after = measure(res, sc)
        for _ in range(3):   # còn dư (đốm phông xanh, nét đen ở HD, vung): vá đốm bằng inpaint rồi lại lấp nét + nhoè thêm, tối đa 3 vòng
            if not bad(after): break
            res, info2 = M.smear([M.clean_hands(inpaint_olive(x, sc), sc) for x in res], sc); after = measure(res, sc); info['smeared'] = max(info['smeared'], info2['smeared'])
        cap = (900 if p.endswith('-hd.mp4') else 240) * 1024; tmp = f + '.new.mp4'; done = False
        for q in range(CRF, CRF + 6):
            for cq in (0, -2, -4):
                encode(res, w, h, tmp, q, cq)
                if os.path.getsize(tmp) > cap: break
                if spill(tmp, w, h) <= 0.004: done = True; break
            if done: break
        if not done: errs.append(f'{name}: không đạt ≤ {cap // 1024} KB + viền ánh xanh ≤ 0,4 %'); os.remove(tmp); continue
        os.replace(tmp, f); R['files'][name + '.mp4'] = {'sha256': hashlib.sha256(open(f, 'rb').read()).hexdigest(), 'bytes': os.path.getsize(f)}
        print(f'{name:18s} vung {before["warp"]:.0f}→{after["warp"]:.0f} · nét đen {before["lines"]}→{after["lines"]} · xanh {before["olive"]}→{after["olive"]} · nhoè {info["smeared"]}/{len(fr)} · {os.path.getsize(f) // 1024} KB', flush=True)
        if bad(after): errs.append(f'{name}: sau khi làm sạch vẫn vượt cổng {after}')
json.dump(R, open(f'{D}/characters.json', 'w'), indent=2, ensure_ascii=False); open(f'{D}/characters.json', 'a').write('\n')
if errs: print('\n'.join(['✗ refine_clips:'] + errs)); sys.exit(1)
print('✓ refine_clips')
