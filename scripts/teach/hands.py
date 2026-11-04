#!/usr/bin/env python3
"""✋ Đo tay từng clip giáo viên: tay nằm ở đâu trong khung, ở mức che nào thì bị cắt ngang. Chỉ cần ffmpeg + thư viện chuẩn.
Tay = điểm da (màu da đo ngay trên mặt người đó) dưới cằm. "Cắt" ở mức che v (phần khung nhìn thấy từ đỉnh, 0–1) = có da nằm sát đường y=v và cả hai phía:
một phần bàn tay hiện, phần còn lại khuất. Tay xuôi khuất hẳn dưới đường che không tính là cắt.
Dùng: hands.py [web/teach] [--step 2] [--json scripts/teach/hands.json]"""
import json, os, subprocess, sys
args = sys.argv[1:]; opt = lambda k, d: args[args.index(k) + 1] if k in args else d
ROOT = next((a for a in args if not a.startswith('--') and a not in (opt('--step', ''), opt('--json', ''))), 'web/teach')
STEP = int(opt('--step', 2)); OUT = opt('--json', ''); W, H = 138, 120
LEVELS = [.55, .6, .65, .7, .75, .8, .85]
def frames(path, step):
    p = subprocess.run(['ffmpeg', '-v', 'error', '-threads', '1', '-i', path, '-vf', f"select='not(mod(n\\,{step}))',scale={W}:{H * 2}", '-vsync', '0', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    sz = W * H * 2 * 3
    return [p[i:i + sz] for i in range(0, len(p), sz)]
# dải màu da đo trên ảnh tham chiếu (áo Ama cam san hô, tóc đen; áo Carlos xanh, sơ mi trắng): lệch bộ tham chiếu thì cổng ref_gate đỏ trước
SKIN = {'ama': lambda r, g, b: 60 <= r <= 150 and g <= 80 and b <= 60 and r - g >= 25, 'carlos': lambda r, g, b: r >= 150 and 70 <= g <= 175 and b <= 125 and r - b >= 70}
reg = json.load(open(os.path.join(ROOT, 'characters.json'))); res = {}
for who, P in reg['people'].items():
    res[who] = {}
    for pose, c in P['clips'].items():
        F = frames(os.path.join(ROOT, who, pose + '.mp4'), STEP); sf = round(c.get('still_frame', 0) / STEP)
        rows = []; 
        # đầu: hàng bán kính lớn nhất của phần người ở nửa trên; màu da = trung vị dải giữa mặt dưới mắt
        for fr in F:
            px = lambda x, y: fr[(y * W + x) * 3:(y * W + x) * 3 + 3]
            al = lambda x, y: fr[((y + H) * W + x) * 3]
            top = next((y for y in range(H) if any(al(x, y) > 128 for x in range(0, W, 2))), 0)
            chin = top + int(H * .40); test = SKIN[who]
            ys = []; xmin, xmax = W, 0
            for y in range(chin, H):
                n = 0
                for x in range(W):
                    if al(x, y) < 128: continue
                    r, g, b = px(x, y); a = max(al(x, y), 1) / 255
                    if test(r / a, g / a, b / a): n += 1; xmin = min(xmin, x); xmax = max(xmax, x)
                ys.append(n)
            edge = any(al(x, y) > 128 for y in range(0, chin) for x in (0, W - 1))
            rows.append((chin, ys, xmin, xmax, edge, top))
        def cut(row, v):
            chin, ys, *_ = row; line = int(v * H) - chin
            if line < 2 or line >= len(ys) - 2: return False
            return sum(ys[line - 2:line]) >= 3 and sum(ys[line:line + 3]) >= 3
        def low(row):
            chin, ys, *_ = row; idx = [i for i, n in enumerate(ys) if n >= 2]
            return (chin + idx[-1]) / H if idx else 0
        hero = rows[min(sf, len(rows) - 1)]
        chin, ys = hero[0], hero[1]; bands = []  # dải da liền nhau của khung ảnh tĩnh (%, từ đỉnh khung)
        for i, n in enumerate(ys):
            if n < 2: continue
            y = (chin + i) / H
            if bands and y - bands[-1][1] <= 2.5 / H: bands[-1][1] = y
            else: bands.append([y, y])
        res[who][pose] = { 'src': c.get('src'), 'still_frame': c.get('still_frame', 0), 'hand_low': round(low(hero), 3), 'hand_low_max': round(max(low(r) for r in rows), 3), 'bands': [[round(a * 100), round(b * 100)] for a, b in bands if b - a >= .03],
          'still_cut': {str(v): cut(hero, v) for v in LEVELS}, 'clip_cut_pct': {str(v): round(100 * sum(cut(r, v) for r in rows) / len(rows)) for v in LEVELS}, 'touch_edge': sum(r[4] for r in rows), 'n': len(rows) }
        r = res[who][pose]; print(f"{who:6} {pose:9} {r['src']:18} ảnh tay thấp nhất {r['hand_low']:.2f} · clip {r['hand_low_max']:.2f} · cắt ảnh @ " + ' '.join(f"{v}:{'X' if r['still_cut'][str(v)] else '.'}" for v in LEVELS) + ' · cắt clip % ' + ' '.join(str(r['clip_cut_pct'][str(v)]) for v in LEVELS) + f" · chạm mép {r['touch_edge']}")
if OUT: json.dump(res, open(OUT, 'w'), ensure_ascii=False, indent=0)
