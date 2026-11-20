# Bảng 9 hình miệng 2D (Rhubarb X A B C D E F G H) + mí mắt chớp cho Ama/Carlos – cắt từ CHÍNH clip registry (web/teach/<who>/talk-hd, listen-hd), 0 credit, chạy trên CI.
# Nền = khung 0 của listen-hd (miệng nghỉ). Mỗi khung talk được căn vào nền bằng ECC affine trên vùng mặt (che miệng) → chỉ giữ khung căn khớp (corr ≥ 0.92),
# vùng miệng tự tìm theo độ biến thiên giữa các khung, đặc trưng (độ mở / răng / bề ngang) chọn khung đại diện cho từng hình. Mép mảnh mờ dần (feather) → dán không lộ viền.
# Tư thế cảm xúc (still-<pose>.webp): căn mặt nền → tư thế; khớp được thì ghi roi riêng để miệng chạy đè lên tư thế đó.
# Dùng: python3 scripts/lipsync/harvest.py <who> <out_dir>   → base.webp, mouths.webp, eye.webp, poses/<pose>.webp, sheet.json, harvest.jpg (bảng soát)
import cv2, numpy as np, json, os, sys
who, out = sys.argv[1], sys.argv[2]; os.makedirs(f'{out}/poses', exist_ok=True)
R = json.load(open('web/teach/characters.json')); F = R['frame']
ORDER = ['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

def stacked(path):  # H.264 xếp chồng: nửa trên màu (đã nhân alpha), nửa dưới alpha → RGBA
    cap, fr = cv2.VideoCapture(path), []
    while True:
        ok, f = cap.read()
        if not ok: break
        h = f.shape[0] // 2; a = f[h:, :, 1].astype(np.float32) / 255; c = f[:h].astype(np.float32)
        c = np.where(a[..., None] > 0.02, c / np.maximum(a[..., None], 0.02), 0).clip(0, 255)
        fr.append(np.dstack([c, a * 255]).astype(np.uint8))
    return fr
talk, lis = stacked(f'web/teach/{who}/talk-hd.mp4'), stacked(f'web/teach/{who}/listen-hd.mp4')
base = lis[0]; H, W = base.shape[:2]; s = H / F['h']
ex, ey = W / 2, F['eye_y'] * H; mo = F['eye_mouth'] * s           # tâm mắt + khoảng mắt–miệng chuẩn của registry
gray = lambda im: cv2.cvtColor(im[..., :3], cv2.COLOR_BGR2GRAY).astype(np.float32)
face = (int(ex - 3.4 * mo), int(ey - 2.2 * mo), int(ex + 3.4 * mo), int(ey + 2.6 * mo))
mask = np.zeros((H, W), np.uint8); mask[face[1]:face[3], face[0]:face[2]] = 255
mask[int(ey + 0.45 * mo):int(ey + 1.75 * mo), int(ex - 1.3 * mo):int(ex + 1.3 * mo)] = 0  # che miệng: căn theo mắt/mũi/má, không theo miệng đang nói
G0 = gray(base)
def align(im, tmpl=G0, m=mask):
    M = np.eye(2, 3, dtype=np.float32)
    try: cc, M = cv2.findTransformECC(tmpl, gray(im), M, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5), m, 5)
    except cv2.error: return None, 0
    return cv2.warpAffine(im, M, (W, H), flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP, borderMode=cv2.BORDER_REPLICATE), cc
A = [(i, *align(f)) for i, f in enumerate(talk[::2])]
ok = [(i, f) for i, f, cc in A if f is not None and cc >= 0.92]
print(who, 'talk frames', len(A), 'aligned', len(ok))
assert len(ok) >= 20, 'quá ít khung talk căn khớp nền'

# vùng miệng = nơi thay đổi nhiều nhất giữa các khung (quanh vị trí miệng chuẩn)
sx0, sy0, sx1, sy1 = int(ex - 1.3 * mo), int(ey + 0.8 * mo), int(ex + 1.3 * mo), int(ey + 2.0 * mo)  # dưới mí mắt: không kéo mắt/má của khung talk vào mảnh
st = np.std(np.stack([gray(f)[sy0:sy1, sx0:sx1] for _, f in ok]), 0)
ys, xs = np.where(st > max(12, np.percentile(st, 95)))
cy, cx = np.median(ys), np.median(xs); keep = (abs(ys - cy) < 0.55 * mo) & (abs(xs - cx) < 0.95 * mo); ys, xs = ys[keep], xs[keep]  # bỏ điểm lẻ xa miệng
pad = int(0.14 * mo); x0, y0 = sx0 + xs.min() - pad, sy0 + ys.min() - pad; x1, y1 = sx0 + xs.max() + pad, sy0 + ys.max() + pad
rw, rh = x1 - x0, y1 - y0
crop = lambda im: im[y0:y1, x0:x1]
B0 = crop(base)
skin = np.median(gray(B0)[gray(B0) > np.percentile(gray(B0), 30)])
def feat(c):
    g = gray(c); hsv = cv2.cvtColor(c[..., :3], cv2.COLOR_BGR2HSV)
    dark = (g < skin * 0.55); teeth = (hsv[..., 2] > 200) & (hsv[..., 1] < 60)
    m = dark | teeth; yy, xx = np.where(m)
    w = (xx.max() - xx.min()) / rw if len(xx) > 5 else 0; h = (yy.max() - yy.min()) / rh if len(yy) > 5 else 0
    return dict(op=dark.mean(), te=teeth.mean(), w=w, h=h, diff=np.abs(g - gray(B0)).mean())
FT = [(i, f, feat(crop(f))) for i, f in ok]
used, pick = set(), {}
def take(name, key, cond=lambda x: True):
    c = [t for t in FT if t[0] not in used and cond(t[2])] or [t for t in FT if t[0] not in used]
    best = max(c, key=lambda t: key(t[2])); used.add(best[0]); pick[name] = best
ops = np.array([t[2]['op'] for t in FT]); p = lambda q: np.percentile(ops, q)
take('D', lambda x: x['op'] * (0.5 + x['h']))                                       # AA: mở to nhất
take('A', lambda x: -(x['op'] + x['te']) - x['diff'] / 60)                           # M/B/P: môi khép
take('B', lambda x: x['te'] - 2 * x['op'], lambda x: x['te'] > 0.01)                 # răng khép (S T K EE)
take('G', lambda x: x['te'] - 2 * x['op'] - abs(x['w'] - 0.6), lambda x: x['te'] > 0.005)  # F/V: răng chạm môi dưới
take('C', lambda x: -abs(x['op'] - p(70)) + 0.2 * x['w'])                            # EH: mở vừa
take('H', lambda x: -abs(x['op'] - p(60)), lambda x: x['h'] > 0.3)                   # L: mở vừa, lưỡi
take('E', lambda x: -x['w'] - abs(x['op'] - p(55)), lambda x: x['op'] > p(35))       # AO/ER: tròn nhẹ
take('F', lambda x: -x['w'] - x['te'], lambda x: x['op'] > p(15))                    # OO/W: chu môi hẹp nhất
yy, xx = np.mgrid[0:rh, 0:rw]
fea = np.clip(1.25 - np.hypot((xx - rw / 2) / (rw / 2), (yy - rh / 2) / (rh / 2)), 0, 1)
fea = cv2.GaussianBlur(fea.astype(np.float32), (0, 0), max(2, rw / 18)); fea = (fea / fea.max()).clip(0, 1)
def cell(c): c = c.copy(); c[..., 3] = (c[..., 3].astype(np.float32) * fea).astype(np.uint8); return c
cells = [np.zeros((rh, rw, 4), np.uint8)] + [cell(crop(pick[k][1])) for k in ORDER[1:]]   # X = miệng gốc của nền (ô trống)
cv2.imwrite(f'{out}/mouths.webp', np.hstack(cells), [cv2.IMWRITE_WEBP_QUALITY, 90])
cv2.imwrite(f'{out}/base.webp', base, [cv2.IMWRITE_WEBP_QUALITY, 88])

# mí mắt chớp: khung listen căn khớp có vùng mắt khác nền nhiều nhất
e0, e1 = (int(ex - 2.3 * mo), int(ey - 0.75 * mo)), (int(ex + 2.3 * mo), int(ey + 0.6 * mo))
er = lambda im: gray(im)[e1[1] - (e1[1] - e0[1]):e1[1], e0[0]:e1[0]]
best, bd = None, 0
for f in lis[::2]:
    a, cc = align(f)
    if a is not None and cc >= 0.93:
        d = np.abs(er(a) - er(base)).mean()
        if d > bd: best, bd = a, d
blink = None
if best is not None and bd > 6:
    eh, ew = e1[1] - e0[1], e1[0] - e0[0]; yy2, xx2 = np.mgrid[0:eh, 0:ew]
    fe = cv2.GaussianBlur(np.clip(1.3 - np.maximum(abs(xx2 - ew / 2) / (ew / 2), abs(yy2 - eh / 2) / (eh / 2)), 0, 1).astype(np.float32), (0, 0), 4)
    ec = best[e0[1]:e1[1], e0[0]:e1[0]].copy(); ec[..., 3] = (ec[..., 3] * (fe / fe.max())).astype(np.uint8)
    cv2.imwrite(f'{out}/eye.webp', ec, [cv2.IMWRITE_WEBP_QUALITY, 90]); blink = {'img': 'eye.webp', 'roi': [e0[0], e0[1], ew, eh], 'diff': round(float(bd), 1)}

# tư thế cảm xúc: căn mặt nền vào ảnh tư thế → roi miệng trên tư thế (bỏ tư thế nghiêng mặt quá, không khớp)
poses = {}
for pz in ['happy', 'explain', 'encourage', 'thinking', 'empathy', 'concern', 'cheer', 'surprise', 'point']:
    fp = f'web/teach/{who}/still-{pz}.webp'
    if not os.path.exists(fp): continue
    im = cv2.imread(fp, cv2.IMREAD_UNCHANGED)
    if im is None or im.shape[2] != 4: continue
    im = cv2.resize(im, (W, H), interpolation=cv2.INTER_CUBIC)
    M = np.eye(2, 3, dtype=np.float32)
    try: cc, M = cv2.findTransformECC(gray(im), G0, M, cv2.MOTION_AFFINE, (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 80, 1e-5), mask, 5)
    except cv2.error: cc = 0
    # M: tọa độ tư thế = M·(tọa độ nền)? findTransformECC(template=pose, input=base) → warp input về template: pose(x) ≈ base(M·x) → nghịch đảo để đưa roi nền sang tư thế
    if cc < 0.85: print(who, pz, 'skip corr', round(float(cc), 3)); continue
    Mi = cv2.invertAffineTransform(M); P = np.array([[x0, y0, 1], [x1, y1, 1]], np.float32) @ Mi.T
    sc = float(np.sqrt(abs(np.linalg.det(Mi[:, :2]))))
    cv2.imwrite(f'{out}/poses/{pz}.webp', im, [cv2.IMWRITE_WEBP_QUALITY, 88])
    poses[pz] = {'base': f'poses/{pz}.webp', 'roi': [round(float(P[0, 0]), 1), round(float(P[0, 1]), 1), round(rw * sc, 1), round(rh * sc, 1)], 'corr': round(float(cc), 3)}
    print(who, pz, 'ok corr', round(float(cc), 3))

json.dump({'who': who, 'w': W, 'h': H, 'base': 'base.webp', 'img': 'mouths.webp', 'order': ORDER, 'roi': [int(x0), int(y0), int(rw), int(rh)],
           'frames': {k: int(v[0]) * 2 for k, v in pick.items()}, 'feat': {k: {a: round(float(b), 3) for a, b in v[2].items()} for k, v in pick.items()},
           'aligned': len(ok), 'blink': blink, 'poses': poses}, open(f'{out}/sheet.json', 'w'), indent=1)
# bảng soát: nền + 9 ô miệng dán lên nền (để mắt người xem nhanh)
show = []
for c in cells:
    b = base.copy(); r = b[y0:y1, x0:x1].astype(np.float32); a = c[..., 3:4].astype(np.float32) / 255
    b[y0:y1, x0:x1] = (r * (1 - a) + c.astype(np.float32) * a).astype(np.uint8)
    show.append(cv2.resize(b[int(ey - 2 * mo):int(ey + 2.6 * mo), int(ex - 2.4 * mo):int(ex + 2.4 * mo), :3], (200, 190)))
cv2.imwrite(f'{out}/harvest.jpg', np.hstack(show))
