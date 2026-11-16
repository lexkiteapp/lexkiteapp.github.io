#!/usr/bin/env python3
"""🙂 Vòng lặp nghỉ (idle) 1–3 s cho giáo viên 2D – Home/lộ trình "cô giáo sống" thay ảnh tĩnh (chủ 3/11: "cô đứng nhắm mắt lỗi,
cần 1 cô hình gif hay video 1–3 s nhẹ"). 0 credit: dựng từ clip đã có trong web/teach/<who>/<pose>.mp4 (H.264 xếp chồng màu đã nhân
alpha / alpha, vòng ping-pong – xem build.py), không cần kho footage, không dịch vụ trả phí.

Cách làm (characters.json "idle": {who: {pose, min_s, max_s}}):
  1. giải mã nửa xuôi của clip, bỏ nhân alpha (mép không quầng đen trên nền sáng);
  2. tìm đoạn [a, a+L) dài min_s…max_s sao cho khung a và a+L gần như trùng nhau (vòng lặp không giật), khung đầu mắt mở rõ (poster),
     trong vòng có đúng 1 cái chớp tự nhiên nếu clip có chớp; không đoạn nào khớp → ping-pong (luôn liền);
  3. xuất 3 biến thể cùng khung W×H với ảnh tĩnh (cùng đường mắt, cùng tỉ lệ → đặt cạnh UI như mọi tư thế khác):
       idle.webm  VP9 có alpha (Chrome/Edge/Firefox/Android)
       idle.mp4   H.264 "xếp chồng" (nửa trên màu nhân alpha, nửa dưới alpha) – đúng định dạng mọi clip tư thế, app ghép alpha bằng
                  WebGL (Safari/iOS: Safari bỏ alpha của VP9). WebP động đã thử: 450–530 KB/2 s vì cả thân cử động → loại.
       idle-poster.webp  khung đầu, mắt mở (reduced-motion, chế độ nhẹ, trước khi clip tải xong)
     mỗi tệp ≤ 150 KB (tự hạ chất lượng từng nấc, không hạ ngưỡng).
  4. ghi meta vào characters.json "idle" (đoạn, số khung, bytes, sha256) để cổng CI so.

Dùng:  idle.py [web/teach]           dựng lại (CI / máy có ffmpeg+libvpx-vp9, Pillow có webp_anim, numpy)
       idle.py --check [web/teach]   cổng CI: tệp có đủ, đúng định dạng/khung/thời lượng, ≤ 150 KB, sha khớp, poster + mọi ảnh tĩnh mắt mở.
"""
import hashlib, io, json, os, subprocess, sys

import numpy as np
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from eyes import openness, is_open   # noqa: E402

CHECK = '--check' in sys.argv
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
OUT = ARGS[0] if ARGS else 'web/teach'
REG = f'{OUT}/characters.json'
R = json.load(open(REG))
F = R['frame']; W, H, FPS = F['w'], F['h'], F['fps']
CAP = 150 * 1024
errs = []


def sha(p): return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def decode(mp4):   # nửa xuôi của clip ping-pong → list RGBA (màu đã bỏ nhân alpha)
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', mp4, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    v = np.frombuffer(raw, np.uint8).reshape(-1, H * 2, W, 3)
    n = (len(v) + 2) // 2   # 2N-2 khung → N khung xuôi
    out = []
    for f in v[:n]:
        c = f[:H].astype(float); a = f[H:, :, :1].astype(float)   # alpha: kênh luma của nửa dưới (xám)
        a = np.where(a < 6, 0, a)   # nhiễu nén ở vùng trong suốt → 0 tuyệt đối (không viền mờ)
        c = np.where(a > 0, np.clip(c * 255 / np.maximum(a, 1), 0, 255), 0)
        out.append(np.concatenate([c, a], 2).astype(np.uint8))
    return out


def small(f):   # ảnh nhỏ để so khung (màu nhân alpha, 1/4)
    x = f[::4, ::4].astype(float); return x[..., :3] * x[..., 3:] / 255


def find_loop(fr, sc, ref, lo, hi):
    sm = [small(f) for f in fr]; d = lambda i, j: float(np.abs(sm[i] - sm[j]).mean())
    blink = [not is_open(s, ref) for s in sc]
    best = None
    for L in range(lo, hi + 1):
        for a in range(0, len(fr) - L - 1):
            if blink[a] or blink[a + L] or not all(s >= 0.7 * ref for s in sc[a:a + 2]): continue
            nb = sum(1 for i in range(a + 1, a + L) if blink[i] and not blink[i - 1])   # số lần chớp trong vòng
            seam = d(a, a + L) + 0.5 * d(a + 1, (a + L + 1) if a + L + 1 < len(fr) else a + L)
            cost = seam + (0 if nb == 1 else 0.6 if nb == 0 else 2.0) + 0.002 * abs(L - (lo + hi) / 2)
            if best is None or cost < best[0]: best = (cost, a, L, seam, nb)
    return best


def enc_webm(frames, path, crf):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', str(crf), '-deadline', 'good', '-cpu-used', '1',
                        '-row-mt', '1', '-auto-alt-ref', '0', '-g', str(len(frames)), '-an', '-metadata', 'title=', path],
                       input=b''.join(f.tobytes() for f in frames), capture_output=True)
    if p.returncode: raise SystemExit(p.stderr.decode()[-400:])


def enc_stacked(frames, path, crf):   # như build.py: màu nhân alpha trên, alpha dưới, yuv420p, faststart
    st = b''.join(np.concatenate([(f[..., :3].astype(float) * f[..., 3:] / 255).round().astype(np.uint8), np.repeat(f[..., 3:], 3, 2)], 0).tobytes() for f in frames)
    p = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H * 2}', '-r', str(FPS), '-i', '-',
                        '-c:v', 'libx264', '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-profile:v', 'main', '-preset', 'veryslow', '-crf', str(crf), '-tune', 'animation', '-pix_fmt', 'yuv420p',
                        '-g', str(len(frames)), '-an', '-movflags', '+faststart', path], input=st, capture_output=True)
    if p.returncode: raise SystemExit(p.stderr.decode()[-400:])


def probe(p):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-count_frames', '-show_entries',
                        'stream=codec_name,width,height,nb_read_frames:stream_tags=alpha_mode', '-of', 'json', p], capture_output=True, text=True).stdout
    return json.loads(o)['streams'][0]


def ref_open(who):   # độ mở bình thường = ảnh poster (khung đầu clip talk – build.py)
    return openness(np.array(Image.open(f'{OUT}/{who}/poster-2x.webp').convert('RGBA')), F['eye_y'])


def check_stills(who, ref):   # mọi ảnh tĩnh/poster: mắt mở (lỗi chủ báo 3/11). Ngoại lệ có chủ đích ghi trong idle.closed_ok (mặc định rỗng)
    ok = set(R.get('idle', {}).get('closed_ok', []))
    for f in sorted(os.listdir(f'{OUT}/{who}')):
        if not f.endswith('.webp') or f.startswith('avatar') or f'{who}/{f}' in ok: continue
        im = Image.open(f'{OUT}/{who}/{f}')
        if im.mode != 'RGBA': errs.append(f'{who}/{f}: mất alpha ({im.mode}) – nền đặc, không đặt được lên UI')
        s = openness(np.array(im.convert('RGBA')), F['eye_y'])
        if not is_open(s, ref): errs.append(f'{who}/{f}: mắt nhắm (độ mở {s:.3f} < 45 % của {ref:.3f}) – chọn khung mắt mở (build.py dùng eyes.pick)')


IDLE = R.get('idle', {})
for who, cfg in IDLE.get('people', {}).items():
    d = f'{OUT}/{who}'; ref = ref_open(who); meta = cfg.setdefault('out', {})
    paths = {k: f'{d}/{n}' for k, n in (('webm', 'idle.webm'), ('mp4', 'idle.mp4'), ('poster', 'idle-poster.webp'))}
    if not CHECK:
        fr = decode(f"{d}/{cfg['pose']}.mp4"); sc = [openness(f, F['eye_y']) for f in fr]
        lo, hi = round(cfg.get('min_s', 1.5) * FPS), round(cfg.get('max_s', 3) * FPS)
        b = find_loop(fr, sc, ref, lo, min(hi, len(fr) - 2))
        if b and b[3] <= 6.0:
            _, a, L, seam, nb = b; loop = fr[a:a + L]; kind = 'seam'
        else:   # không đoạn nào liền → ping-pong nửa thời lượng tối đa (luôn liền, chậm dần ở 2 đầu tự nhiên)
            a = next(i for i, s in enumerate(sc) if s >= 0.7 * ref); L = hi // 2; seg = fr[a:a + L]; loop = seg + seg[-2:0:-1]; seam, nb, kind = 0.0, 0, 'pingpong'
        print(f'{who}: {cfg["pose"]} [{a}:{a + L}] {len(loop)} khung = {len(loop) / FPS:.2f} s, nối {seam:.2f}, chớp {nb} ({kind})')
        for crf in range(30, 52, 2):
            enc_webm(loop, paths['webm'], crf)
            if os.path.getsize(paths['webm']) <= CAP: break
        for q in range(F['crf'], F['crf'] + 12):
            enc_stacked(loop, paths['mp4'], q)
            if os.path.getsize(paths['mp4']) <= CAP: break
        Image.fromarray(loop[0]).save(paths['poster'], quality=88, method=6)
        meta.clear(); meta.update(src=f"{who}/{cfg['pose']}.mp4", src_sha256=sha(f"{d}/{cfg['pose']}.mp4"), frame=[a, a + L], kind=kind,
                                  frames=len(loop), seconds=round(len(loop) / FPS, 2), webm_crf=crf, mp4_crf=q, seam=round(seam, 2), blinks=nb)
    # ── kiểm (cả khi dựng lẫn --check) ──
    for k, p in paths.items():
        if not os.path.exists(p): errs.append(f'{p}: thiếu'); continue
        n = os.path.getsize(p)
        if n > CAP: errs.append(f'{p}: {n // 1024} KB > 150 KB')
        if not CHECK: meta[k] = {'bytes': n, 'sha256': sha(p)}; R.setdefault('files', {})[os.path.relpath(p, OUT)] = {'sha256': sha(p), 'bytes': n}
        elif meta.get(k, {}).get('sha256') != sha(p) or R.get('files', {}).get(os.path.relpath(p, OUT), {}).get('sha256') != sha(p): errs.append(f'{p}: sha256 khác characters.json idle.out – chạy lại scripts/teach/idle.py')
    if os.path.exists(paths['webm']):
        s = probe(paths['webm']); nf = int(s.get('nb_read_frames', 0))
        if s.get('codec_name') != 'vp9' or s.get('tags', {}).get('alpha_mode') != '1': errs.append(f"{paths['webm']}: cần VP9 có alpha (alpha_mode=1), có {s}")
        if (s.get('width'), s.get('height')) != (W, H): errs.append(f"{paths['webm']}: khung {s.get('width')}x{s.get('height')} ≠ {W}x{H}")
        if not FPS <= nf <= 3 * FPS: errs.append(f"{paths['webm']}: {nf} khung = {nf / FPS:.2f} s, cần 1–3 s")
    if os.path.exists(paths['mp4']):
        s = probe(paths['mp4']); nf = int(s.get('nb_read_frames', 0))
        if s.get('codec_name') != 'h264' or (s.get('width'), s.get('height')) != (W, 2 * H): errs.append(f"{paths['mp4']}: cần H.264 xếp chồng {W}x{2 * H}, có {s}")
        if not FPS <= nf <= 3 * FPS: errs.append(f"{paths['mp4']}: {nf} khung = {nf / FPS:.2f} s, cần 1–3 s")
    if os.path.exists(paths['poster']):
        pa = np.array(Image.open(paths['poster']).convert('RGBA'))
        if pa.shape[:2] != (H, W): errs.append(f"{paths['poster']}: khung {pa.shape[1]}x{pa.shape[0]} ≠ {W}x{H}")
        if max(pa[0, :, 3].max(), pa[:, 0, 3].max(), pa[:, -1, 3].max()) > 8: errs.append(f"{paths['poster']}: người chạm mép trên/trái/phải (bị xén)")
        e = (pa[..., 3] > 16) & (pa[..., 3] < 240)
        if e.sum() and float((pa[..., :3].max(-1)[e] < 40).mean()) > 0.35: errs.append(f"{paths['poster']}: viền đen (quầng premultiply) {float((pa[..., :3].max(-1)[e] < 40).mean()):.0%}")
    if CHECK and meta.get('src_sha256') != sha(f"{d}/{cfg['pose']}.mp4"): errs.append(f"{who}: clip nguồn {cfg['pose']}.mp4 đã đổi sau lần dựng idle – chạy lại scripts/teach/idle.py (teach-build tự chạy)")
    if who in R['people']: check_stills(who, ref)

if not CHECK:
    json.dump(R, open(REG, 'w'), ensure_ascii=False, indent=2); open(REG, 'a').write('\n')
for e in errs: print(f'::error::{e}')
print('idle:', 'ĐỎ' if errs else 'xanh', f'({len(errs)} lỗi)')
sys.exit(1 if errs else 0)
