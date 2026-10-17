"""Kiểm "anatomy & style" cho ảnh/khung nhân vật (dùng bởi asset_check.py).

MediaPipe Tasks (Pose + Hands + FaceMesh/FaceLandmarker, CPU) chạy được trên tranh 2D ở mức khá: KHÔNG phát hiện được → WARN
(không FAIL). Đo phong cách (nét viền, màu da/tóc/áo theo DNA, kết cấu ảnh thật) chỉ cần numpy.
Mô hình .task: .tools/mediapipe/ (gitignored) hoặc env LEXKITE_MP_MODELS – tải từ storage.googleapis.com/mediapipe-models.
Mỗi nhân vật có "ref" đo từ chars/<who>/dna.png (headRatio, strokeW, palette Lab, eyeEdges) lưu trong content/video/library.json.
"""
import math, os

import numpy as np

A = {
    'head_tol': 0.12,      # tỉ lệ đầu/thân lệch DNA ≤ 12 %
    'elbow_min': 3.0,      # góc khuỷu tối thiểu (độ) – tay chạm mặt/vai cho góc ~5° là bình thường
    'knee_min': 55.0,      # góc gối tối thiểu (đứng)
    'seg_ratio': (0.4, 2.6),  # tỉ lệ cánh tay trên/cẳng tay, đùi/cẳng chân
    'de_warn': 10.0, 'de_fail': 25.0,   # ΔE76 màu vùng so với DNA
    'stroke_tol': 0.45,    # nét viền lệch biên chuẩn dàn ± 45 %
    'noise': 4.0,          # trung vị |Laplace| vùng nhân vật – tranh phẳng ≈ 0–2; ảnh thật/nhiễu σ≥1,5 > 4
    'glasses': 0.55,       # mật độ cạnh vùng mắt / DNA < 0,55 → mất kính
    'vis': 0.35,           # ngưỡng visibility của khớp
}
GLASSES = {'leo', 'diane'}
_M = {}


def models():
    """Nạp lười 3 landmarker; trả None nếu thiếu mediapipe hoặc file mô hình."""
    if 'ok' in _M:
        return _M.get('m')
    _M['ok'] = True
    try:
        os.environ.setdefault('GLOG_minloglevel', '3')
        from mediapipe.tasks import python as mpt
        from mediapipe.tasks.python import vision as V
        d = os.environ.get('LEXKITE_MP_MODELS') or os.path.join(os.path.dirname(__file__), '..', '..', '.tools', 'mediapipe')
        d = os.path.abspath(d)
        bo = lambda f: mpt.BaseOptions(model_asset_path=os.path.join(d, f))
        _M['m'] = {
            'pose': V.PoseLandmarker.create_from_options(V.PoseLandmarkerOptions(base_options=bo('pose_landmarker_full.task'), num_poses=3, min_pose_detection_confidence=0.3)),
            'hand': V.HandLandmarker.create_from_options(V.HandLandmarkerOptions(base_options=bo('hand_landmarker.task'), num_hands=6, min_hand_detection_confidence=0.3)),
            'face': V.FaceLandmarker.create_from_options(V.FaceLandmarkerOptions(base_options=bo('face_landmarker.task'), num_faces=3, min_face_detection_confidence=0.3)),
        }
    except Exception as e:  # noqa: BLE001 – thiếu thư viện/mô hình → bỏ qua phần MediaPipe (WARN)
        _M['err'] = str(e)[:200]
        _M['m'] = None
    return _M['m']


# ---------- hình học ----------
def angle(a, b, c):
    """Góc tại b (độ) giữa ba điểm (x, y)."""
    v1, v2 = np.subtract(a, b), np.subtract(c, b)
    n = np.linalg.norm(v1) * np.linalg.norm(v2)
    if n == 0:
        return 180.0
    return float(np.degrees(np.arccos(np.clip(np.dot(v1, v2) / n, -1, 1))))


def seg_ratio(a, b, c):
    l1, l2 = np.linalg.norm(np.subtract(a, b)), np.linalg.norm(np.subtract(b, c))
    return float(l1 / l2) if l2 else 99.0


# chỉ số khớp MediaPipe Pose
L = dict(nose=0, leye=2, reye=5, lsh=11, rsh=12, lel=13, rel=14, lwr=15, rwr=16, lhip=23, rhip=24, lkn=25, rkn=26, lank=27, rank=28)


def limbs_from_pose(pts, vis):
    """pts: {tên: (x, y)} theo pixel, vis: {tên: visibility}. → số tay/chân thấy được + góc khớp + tỉ lệ đoạn."""
    ok = lambda *ks: all(vis.get(k, 0) >= A['vis'] for k in ks)
    arms = [s for s in 'lr' if ok(s + 'sh', s + 'el', s + 'wr')]
    legs = [s for s in 'lr' if ok(s + 'hip', s + 'kn', s + 'ank')]
    out = {'arms': len(arms), 'legs': len(legs), 'elbow': {}, 'knee': {}, 'armSeg': {}, 'legSeg': {}}
    for s in arms:
        out['elbow'][s] = round(angle(pts[s + 'sh'], pts[s + 'el'], pts[s + 'wr']), 1)
        out['armSeg'][s] = round(seg_ratio(pts[s + 'sh'], pts[s + 'el'], pts[s + 'wr']), 2)
    for s in legs:
        out['knee'][s] = round(angle(pts[s + 'hip'], pts[s + 'kn'], pts[s + 'ank']), 1)
        out['legSeg'][s] = round(seg_ratio(pts[s + 'hip'], pts[s + 'kn'], pts[s + 'ank']), 2)
    return out


def limb_checks(lm):
    """→ danh sách (tên, ok, giá trị, lý do, mức)."""
    res = []
    bad_e = {k: v for k, v in lm['elbow'].items() if v < A['elbow_min']}
    bad_k = {k: v for k, v in lm['knee'].items() if v < A['knee_min']}
    lo, hi = A['seg_ratio']
    bad_s = {k: v for k, v in {**{'arm_' + k: v for k, v in lm['armSeg'].items()}, **{'leg_' + k: v for k, v in lm['legSeg'].items()}}.items() if not lo <= v <= hi}
    res.append(('joints', not (bad_e or bad_k or bad_s), {**lm['elbow'], **{'knee_' + k: v for k, v in lm['knee'].items()}}, f'khớp bất thường (ước lượng MediaPipe trên tranh 2D – AI thị giác quyết định FAIL) {dict(bad_e, **bad_k, **bad_s)}', 'WARN'))
    return res


# ---------- màu ----------
def srgb_to_lab(rgb):
    c = np.asarray(rgb, np.float64) / 255.0
    c = np.where(c > 0.04045, ((c + 0.055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], axis=-1)


def delta_e(a, b):
    return float(np.linalg.norm(np.subtract(a, b)))


def dominant(px):
    """Màu chủ đạo (bin lượng tử 16 mức có nhiều điểm nhất, lấy trung bình) → Lab."""
    if len(px) < 30:
        return None
    q = (px // 16).astype(np.int32)
    idx = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
    top = np.bincount(idx).argmax()
    return [round(float(v), 1) for v in srgb_to_lab(px[idx == top].mean(axis=0))]


def regions(rgb, mask, pts, vis, top=None, fig_h=None):
    """Vùng da (giữa mắt–mũi), tóc (trên mắt), áo (thân giữa vai–hông) theo khớp Pose."""
    h, w = mask.shape
    need = ('leye', 'reye', 'nose', 'lsh', 'rsh')
    if not all(vis.get(k, 0) >= A['vis'] * 0.6 for k in need):
        return {}
    ex = (pts['leye'][0] + pts['reye'][0]) / 2; ey = (pts['leye'][1] + pts['reye'][1]) / 2
    ed = max(4.0, abs(pts['leye'][0] - pts['reye'][0]))
    def box(x0, y0, x1, y1):
        x0, x1 = int(max(0, min(x0, x1))), int(min(w, max(x0, x1))); y0, y1 = int(max(0, min(y0, y1))), int(min(h, max(y0, y1)))
        m = np.zeros_like(mask); m[y0:y1, x0:x1] = True
        return rgb[m & mask].reshape(-1, 3)
    out = {'skin': dominant(box(ex - ed * 0.35, pts['nose'][1] - ed * 0.1, ex + ed * 0.35, pts['nose'][1] + ed * 0.45)),
           'hair': dominant(box(pts['nose'][0] - fig_h * 0.03, top + fig_h * 0.012, pts['nose'][0] + fig_h * 0.03, top + fig_h * 0.04)) if top is not None and fig_h else None}
    if vis.get('lhip', 0) >= A['vis'] * 0.6 and vis.get('rhip', 0) >= A['vis'] * 0.6:
        sx = (pts['lsh'][0] + pts['rsh'][0]) / 2; sy = (pts['lsh'][1] + pts['rsh'][1]) / 2
        hy = (pts['lhip'][1] + pts['rhip'][1]) / 2; sw = abs(pts['lsh'][0] - pts['rsh'][0])
        out['top'] = dominant(box(sx - sw * 0.25, sy + (hy - sy) * 0.2, sx + sw * 0.25, sy + (hy - sy) * 0.6))
    return {k: v for k, v in out.items() if v}


def palette_sig(rgb, mask, k=8):
    """Bảng màu chính của nhân vật (không phụ thuộc tư thế): gom bin 16 mức → tối đa k màu Lab kèm tỉ lệ diện tích."""
    px = rgb[mask].reshape(-1, 3)
    if len(px) < 200:
        return []
    if len(px) > 300000:
        px = px[:: len(px) // 300000 + 1]
    q = (px.astype(np.int32) // 16); idx = q[:, 0] * 256 + q[:, 1] * 16 + q[:, 2]
    cnt = np.bincount(idx); order = np.argsort(cnt)[::-1]
    out = []
    for b in order[: 40]:
        if cnt[b] < 0.005 * len(px):
            break
        lab = srgb_to_lab(px[idx == b].mean(axis=0))
        for o in out:  # gộp màu gần nhau (ΔE < 12)
            if delta_e(o[0], lab) < 12:
                o[1] += cnt[b] / len(px); break
        else:
            out.append([lab, cnt[b] / len(px)])
    out.sort(key=lambda o: -o[1])
    return [[[round(float(v), 1) for v in o[0]], round(float(o[1]), 3)] for o in out[:k]]


def palette_distance(ref_sig, sig, major=0.06):
    """Màu lớn của DNA (≥ 6 % diện tích) phải có màu gần trong khung → ΔE lớn nhất (màu da/tóc/áo nào bị đổi)."""
    if not ref_sig or not sig:
        return None
    worst = 0.0
    for lab, share in ref_sig:
        if share < major:
            continue
        worst = max(worst, min(delta_e(lab, s2) for s2, sh in sig if sh >= 0.005))
    return worst


# ---------- phong cách ----------
def stroke_width(rgb, mask, fig_h):
    """Độ dày nét viền: trung vị độ dài các đoạn rất tối (luma < 55) nằm kẹp giữa 2 vùng sáng hơn ≥ 35 (đúng là "nét", không phải
    mảng tối như da/tóc sẫm), theo hàng & cột, chuẩn hoá về người cao 1000 px."""
    g = rgb.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    dark = (g < 55) & mask
    maxlen = max(3, int(fig_h * 0.02))
    runs = []
    for arr, gg in ((dark, g), (dark.T, g.T)):
        a = arr.astype(np.int8)
        d = np.diff(np.pad(a, ((0, 0), (1, 1))), axis=1)
        st = np.argwhere(d == 1); en = np.argwhere(d == -1)
        if not len(st):
            continue
        ln = en[:, 1] - st[:, 1]
        r_, s_, e_ = st[:, 0], st[:, 1], en[:, 1]
        W = gg.shape[1]
        left = gg[r_, np.clip(s_ - 2, 0, W - 1)]; right = gg[r_, np.clip(e_ + 1, 0, W - 1)]
        core = gg[r_, np.clip(s_ + ln // 2, 0, W - 1)]
        keep = (ln >= 1) & (ln <= maxlen) & (left - core >= 35) & (right - core >= 35)
        runs.append(ln[keep])
    allr = np.concatenate(runs) if runs else np.zeros(0)
    if len(allr) < 50:
        return None
    return float(np.median(allr) * 1000.0 / max(1, fig_h))


def photo_noise(rgb, mask):
    """Kết cấu ảnh thật: trung vị |Laplace| trên điểm nhân vật (bỏ nét viền mạnh ≥ 40). Tranh phẳng 2D ≈ 0–2, ảnh/nhiễu ≈ 3σ."""
    g = rgb.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    lap = np.abs(4 * g[1:-1, 1:-1] - g[:-2, 1:-1] - g[2:, 1:-1] - g[1:-1, :-2] - g[1:-1, 2:])
    m = mask[1:-1, 1:-1] & (lap < 40)
    return float(np.median(lap[m])) if m.sum() > 100 else 0.0


def eye_edges(rgb, pts, vis):
    if not (vis.get('leye', 0) >= A['vis'] * 0.6 and vis.get('reye', 0) >= A['vis'] * 0.6):
        return None
    g = rgb.astype(np.float32) @ np.array([0.299, 0.587, 0.114], np.float32)
    ex = (pts['leye'][0] + pts['reye'][0]) / 2; ey = (pts['leye'][1] + pts['reye'][1]) / 2
    ed = max(4.0, abs(pts['leye'][0] - pts['reye'][0]))
    y0, y1, x0, x1 = int(ey - ed * 0.45), int(ey + ed * 0.45), int(ex - ed * 1.1), int(ex + ed * 1.1)
    reg = g[max(0, y0):y1, max(0, x0):x1]
    if reg.size < 50:
        return None
    gx = np.abs(np.diff(reg, axis=1)); gy = np.abs(np.diff(reg, axis=0))
    return float(((gx[:-1] + gy[:, :-1]) > 50).mean())


# ---------- phân tích 1 khung ----------
def analyze(rgb, mask, use_mp=True):
    """→ dict số đo (pose, tay/chân, khuôn mặt, tỉ lệ đầu, vùng màu, nét, nhiễu)."""
    h, w = mask.shape
    ys, xs = np.nonzero(mask)
    out = {'figH': int(ys.max() - ys.min() + 1) if len(ys) else 0}
    out['noise'] = round(photo_noise(rgb, mask), 2)
    out['paletteSig'] = palette_sig(rgb, mask)
    out['strokeW'] = None if not len(ys) else (lambda v: None if v is None else round(v, 2))(stroke_width(rgb, mask, out['figH']))
    m = models() if use_mp else None
    if m is None:
        out['mp'] = 'unavailable: ' + _M.get('err', 'disabled')
        return out
    import mediapipe as mp
    img = mp.Image(image_format=mp.ImageFormat.SRGB, data=np.ascontiguousarray(rgb))
    p = m['pose'].detect(img)
    hd = m['hand'].detect(img)
    fc = m['face'].detect(img)
    out['people'] = len(p.pose_landmarks)
    out['hands'] = len(hd.hand_landmarks)
    out['fingersMax'] = max([len(x) for x in hd.hand_landmarks] or [0]) and 5  # mô hình luôn ra 21 điểm = 5 ngón
    out['faces'] = len(fc.face_landmarks)
    if not p.pose_landmarks:
        return out
    pl = p.pose_landmarks[0]
    pts = {k: (pl[i].x * w, pl[i].y * h) for k, i in L.items()}
    vis = {k: float(pl[i].visibility or 0) for k, i in L.items()}
    out['limbs'] = limbs_from_pose(pts, vis)
    if len(ys) and vis['lsh'] >= A['vis'] and vis['rsh'] >= A['vis']:
        nx = pts['nose'][0]; band = max(4, int(out['figH'] * 0.08))
        col = mask[:, max(0, int(nx) - band):min(w, int(nx) + band)]
        top = int(np.argmax(col.any(axis=1))) if col.any() else int(ys.min())
        sy = (pts['lsh'][1] + pts['rsh'][1]) / 2
        bot = (pts['lank'][1] + pts['rank'][1]) / 2 if min(vis['lank'], vis['rank']) >= A['vis'] else ys.max()
        out['headRatio'] = round((sy - top) / max(1, bot - top), 3)
    out['palette'] = regions(rgb, mask, pts, vis, locals().get('top'), out['figH'])
    ee = eye_edges(rgb, pts, vis)
    out['eyeEdges'] = None if ee is None else round(ee, 4)
    if fc.face_landmarks:
        f = fc.face_landmarks[0]
        P = lambda i: np.array([f[i].x * w, f[i].y * h])
        dl, dr = np.linalg.norm(P(1) - P(33)), np.linalg.norm(P(1) - P(263))  # mũi ↔ khoé mắt ngoài trái/phải
        out['faceSym'] = round(float(dl / dr) if dr else 99.0, 2)
    return out


def checks(fig, ref=None, who=None, cast_stroke=None):
    """So số đo khung với DNA (ref) & biên chuẩn dàn → [(tên, ok, giá trị, lý do, mức)]."""
    C = []
    if 'mp' in fig:
        C.append(('pose_detect', False, None, 'MediaPipe không chạy được (' + fig['mp'][:80] + ') – cần duyệt tay', 'WARN'))
    elif not fig.get('people'):
        C.append(('pose_detect', False, 0, 'MediaPipe không nhận ra dáng người (tranh 2D) – cần duyệt tay', 'WARN'))
    else:
        C.append(('one_person', fig['people'] == 1, fig['people'], f'Pose thấy {fig["people"]} người (kiểm lại thừa người/thừa chi)', 'WARN'))
        lm = fig.get('limbs') or {}
        C.append(('limbs', lm.get('arms', 0) <= 2 and lm.get('legs', 0) <= 2 and lm.get('arms', 0) + lm.get('legs', 0) >= 3, [lm.get('arms'), lm.get('legs')], 'không thấy đủ 2 tay + 2 chân rõ ràng', 'WARN'))
        C.append(('hands', fig.get('hands', 0) <= 2, fig.get('hands'), f'phát hiện {fig.get("hands")} bàn tay (> 2 = thừa tay)', 'WARN'))
        for c in limb_checks(lm):
            C.append(c)
        if ref and ref.get('headRatio') and fig.get('headRatio'):
            dev = abs(fig['headRatio'] / ref['headRatio'] - 1)
            C.append(('head_ratio', dev <= A['head_tol'], round(dev, 3), f'tỉ lệ đầu/thân lệch DNA {dev * 100:.0f} % (> 12 %)', 'FAIL'))
        if ref and ref.get('paletteSig') and fig.get('paletteSig'):
            worst = palette_distance(ref['paletteSig'], fig['paletteSig'])
            if worst is not None:
                lvl = 'FAIL' if worst > A['de_fail'] else 'WARN'
                C.append(('palette_dna', worst <= A['de_warn'], round(worst, 1), f'bảng màu (da/tóc/áo) lệch DNA ΔE {worst:.0f}', lvl))
        if who in GLASSES and ref and ref.get('eyeEdges') and fig.get('eyeEdges') is not None:
            rr = fig['eyeEdges'] / ref['eyeEdges']
            C.append(('glasses', rr >= A['glasses'], round(rr, 2), 'vùng mắt mất nét gọng kính so với DNA', 'FAIL'))
        if fig.get('faces', 0) == 0:
            C.append(('face_detect', False, 0, 'FaceMesh không nhận ra mặt (tranh 2D) – mắt/miệng cần duyệt tay', 'WARN'))
        elif 'faceSym' in fig:
            s = fig['faceSym']
            C.append(('face_sym', 0.45 <= s <= 2.2, s, 'mặt lệch bất thường (mắt/mũi)', 'WARN'))
    if cast_stroke and fig.get('strokeW'):
        lo, hi = cast_stroke[0] * (1 - A['stroke_tol']), cast_stroke[1] * (1 + A['stroke_tol'])
        C.append(('stroke', lo <= fig['strokeW'] <= hi, fig['strokeW'], f'nét viền {fig["strokeW"]} ngoài biên dàn [{lo:.1f}, {hi:.1f}]', 'WARN'))
    C.append(('flat_2d', fig.get('noise', 0) <= A['noise'], fig.get('noise'), 'không phẳng 2D (kết cấu/nhiễu kiểu ảnh thật)', 'WARN'))
    return C
