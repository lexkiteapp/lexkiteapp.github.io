"""Đo miệng có cử động trong clip tư thế (xếp chồng màu/alpha, khung build.py 554×480) – cổng "lệch miệng" của chỗ giáo viên im lặng.
Clip Kling được tạo khi nhân vật đang NÓI → phát lặp KHÔNG tiếng ở Home/lộ trình = miệng nhép không lời (chủ 05/11). Chỉ clip có điểm < NGƯỠNG
mới được phép phát im (danh sách QUIET trong web/js/teacher-live.js). Điểm = p98 (bắt cả lần há ngắn) độ lệch vùng miệng so với khung trung vị của clip (đã trừ cử động cả đầu
bằng cách căn vùng miệng theo đỉnh đầu từng khung). Chạy: python scripts/teach/mouth_motion.py [--check] (CI teacher-quality.yml)."""
import json, os, re, subprocess, sys
import numpy as np
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
REG = json.load(open(f'{ROOT}/web/teach/characters.json'))
F = REG['frame']; W, H = F['w'], F['h']; EY = F['eye_y'] * H; EM = F['eye_mouth']
LIMIT = 6.0  # điểm cử động miệng tối đa cho clip phát im (miệng ngậm thật ~1–3, nói ~10+)

def frames(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.uint8).reshape(-1, 2 * H, W).astype(np.float32)
    return a[:, :H], a[:, H:]

def score(path):
    col, al = frames(path)
    def top(k):  # đỉnh đầu (hàng alpha đầu tiên > 128 ở dải giữa) – căn vùng miệng theo cử động gật/nghiêng cả đầu
        rows = np.where(al[k][:, W // 2 - 60: W // 2 + 60].max(1) > 128)[0]
        return int(rows[0]) if len(rows) else 0
    t0 = int(np.median([top(k) for k in range(len(col))])); y0 = int(EY + EM - 28); cx = W // 2
    rois = []
    for k in range(len(col)):
        y = max(0, y0 + top(k) - t0); r = col[k][y: y + 56, cx - 50: cx + 50]
        if r.shape == (56, 100): rois.append(r)
    if not rois: return 0.0
    R = np.stack(rois); med = np.median(R, 0)
    dev = np.abs(R - med).mean((1, 2))  # miệng lệch khỏi dáng nghỉ của chính clip (há/nói = lệch lớn ở vài khung)
    return round(float(np.percentile(dev, 98)), 2)

def dims(path):
    o = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], capture_output=True, text=True).stdout.strip().split(',')
    return (int(o[0]), int(o[1])) if len(o) == 2 else None

def quiet_list():
    src = open(f'{ROOT}/web/js/teacher-live.js', encoding='utf8').read()
    m = re.search(r'const QUIET = new Set\(\[([^\]]*)\]\)', src)
    return set(re.findall(r"'([^']+)'", m.group(1))) if m else None

if __name__ == '__main__':
    res = {}
    for who in REG['people']:
        for f in sorted(os.listdir(f'{ROOT}/web/teach/{who}')):
            if f.endswith('.mp4') and dims(f'{ROOT}/web/teach/{who}/{f}') == (W, 2 * H):  # chỉ clip khung chuẩn (bản -hd khác khung, không phát ở chỗ giáo viên)
                res[f'{who}/{f[:-4]}'] = score(f'{ROOT}/web/teach/{who}/{f}')
    for k, v in res.items(): print(f'  {k:22s} miệng {v:5.2f} {"ngậm" if v < LIMIT else "NÓI"}')
    if '--check' in sys.argv:
        q = quiet_list()
        if q is None: sys.exit('mouth_motion: không tìm thấy QUIET trong teacher-live.js')
        bad = [f'{k} (miệng {res.get(k)})' for k in q if res.get(k) is None or res[k] >= LIMIT]
        if bad: sys.exit('mouth_motion: clip trong QUIET nhép miệng / không tồn tại – phát im sẽ lệch miệng: ' + ', '.join(bad))
        if not res: sys.exit('mouth_motion: 0 clip đo được')
        print(f'mouth_motion OK: {len(res)} clip đo, {len(q)} clip được phát im')
