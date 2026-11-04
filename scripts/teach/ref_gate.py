#!/usr/bin/env python3
"""🔒 So từng clip giáo viên với bộ tham chiếu khoá (brand/characters/ref). Lệch thì đỏ.
ĐO ĐƯỢC: màu da + áo (ΔE Lab, trung vị theo cụm), tỉ lệ đầu/khung, đổi nhân vật giữa clip (nhảy phân bố màu), đầu trôi vị trí.
CHƯA ĐO ĐƯỢC TỐT: nhận dạng từng nét mặt và "đúng phong cách 2D" — chỉ có điểm tương đồng vùng mặt làm tín hiệu báo cáo, không kết luận đạt. Vẫn cần soi mắt tờ ảnh.
Dùng: ref_gate.py [web/teach] [--report] [--out bảng.md]"""
import hashlib, json, os, sys
import cv2, numpy as np
A = sys.argv[1:]; REPORT = '--report' in A; OUT = A[A.index('--out') + 1] if '--out' in A else ''
ROOT = next((a for a in A if not a.startswith('--') and a != OUT), 'web/teach'); REF = 'brand/characters/ref'
DE_MAX, HEAD_MAX, SWAP_MAX, DRIFT_MAX = 14.0, .10, 18.0, .06  # ΔE; lệch tỉ lệ đầu; ΔE nhảy giữa 2 khung; đầu trôi /chiều cao khung (đặt theo số đo CI đầu tiên)
SKIN = {'ama': lambda r, g, b: (r > 60) & (r < 150) & (g < 80) & (b < 60) & (r - g > 25), 'carlos': lambda r, g, b: (r > 150) & (g > 70) & (g < 175) & (b < 125) & (r - b > 70)}
COAT = {'ama': lambda r, g, b: (r > 170) & (g > 50) & (g < 130) & (b < 90), 'carlos': lambda r, g, b: (b > 150) & (r < 110) & (g > 70) & (g < 150)}
def lab(px): return cv2.cvtColor(np.float32(px).reshape(1, -1, 3) / 255, cv2.COLOR_RGB2LAB)[0]
def stats(rgb, alpha, who):
    fg = alpha > 200; r, g, b = [rgb[..., i].astype(np.int32) for i in range(3)]; out = {}
    for k, f in (('skin', SKIN[who]), ('coat', COAT[who])):
        m = fg & f(r, g, b); out[k] = np.median(lab(rgb[m]), axis=0) if m.sum() > 40 else None
    ys = np.where(fg.any(axis=1))[0]; top = ys[0] if len(ys) else 0
    sk = fg & SKIN[who](r, g, b); head = sk[:top + int(.5 * rgb.shape[0])]; xs = np.where(head.any(axis=0))[0]
    out['top'] = top / rgb.shape[0]; out['head_w'] = (xs[-1] - xs[0]) / rgb.shape[1] if len(xs) else 0; return out
def ref(who):
    im = cv2.imread(f'{REF}/{who}.png', cv2.IMREAD_UNCHANGED); rgb = im[..., :3][..., ::-1]
    if im.shape[2] == 4: a = im[..., 3]
    else: g = rgb.astype(np.int32); a = np.where((g[..., 1] > g[..., 0] + 40) & (g[..., 1] > g[..., 2] + 40), 0, 255).astype(np.uint8)  # phông xanh
    return stats(cv2.resize(rgb, (277, 480)), cv2.resize(a, (277, 480)), who)
errs = []; meta = json.load(open(f'{REF}/refs.json')); reg = json.load(open(os.path.join(ROOT, 'characters.json')))
md = ['| người | tư thế | ΔE da | ΔE áo | nhảy màu max | đầu trôi | rộng đầu/tham chiếu |', '|---|---|---:|---:|---:|---:|---:|']
for who, m in meta['people'].items():
    if hashlib.sha256(open(f'{REF}/{m["file"]}', 'rb').read()).hexdigest() != m['sha256']: errs.append(f'{who}: ảnh tham chiếu sai checksum')
    R = ref(who)
    for pose in reg['people'][who]['clips']:
        c = cv2.VideoCapture(os.path.join(ROOT, who, pose + '.mp4')); S = []; i = 0
        while True:
            ok, f = c.read()
            if not ok: break
            if i % 4 == 0:
                h = f.shape[0] // 2; a = np.maximum(f[h:, :, 0], 1)[..., None].astype(np.float32) / 255
                rgb = np.clip(f[:h][..., ::-1].astype(np.float32) / a, 0, 255).astype(np.uint8); S.append(stats(cv2.resize(rgb, (277, 240)), cv2.resize(f[h:, :, 0], (277, 240)), who))
            i += 1
        c.release()
        dE = lambda k: max((float(np.linalg.norm(s[k] - R[k])) for s in S if s[k] is not None and R[k] is not None), default=-1)
        de_s, de_c = dE('skin'), dE('coat'); sw = max((float(np.linalg.norm(a['coat'] - b['coat'])) for a, b in zip(S, S[1:]) if a['coat'] is not None and b['coat'] is not None), default=0)
        tops = [s['top'] for s in S]; drift = max(tops) - min(tops); hw = np.median([s['head_w'] for s in S])
        md.append(f'| {who} | {pose} | {de_s:.1f} | {de_c:.1f} | {sw:.1f} | {drift:.3f} | {hw:.3f} |')
        if de_s > DE_MAX: errs.append(f'{who}/{pose}: màu da lệch ΔE {de_s:.1f} > {DE_MAX}')
        if de_c > DE_MAX: errs.append(f'{who}/{pose}: màu áo lệch ΔE {de_c:.1f} > {DE_MAX}')
        if sw > SWAP_MAX: errs.append(f'{who}/{pose}: màu áo nhảy {sw:.1f} giữa 2 khung: nghi đổi nhân vật')
        if drift > DRIFT_MAX: errs.append(f'{who}/{pose}: đầu trôi {drift:.3f} > {DRIFT_MAX}')
t = '\n'.join(md); print(t)
if OUT: os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True); open(OUT, 'w').write(t + '\n')
if errs: print('\nĐỎ:\n' + '\n'.join(errs))
sys.exit(1 if errs and not REPORT else 0)
