"""👀 Độ mở mắt của giáo viên 2D (Ama/Carlos) – một phép đo dùng chung cho build.py (chọn khung ảnh tĩnh), idle.py (vòng lặp nghỉ)
và cổng CI (scripts/teach/idle.py --check). Lỗi gốc 3/11: ảnh tĩnh lấy cứng ở 40 % clip → trúng lúc chớp mắt (Ama still-point, chủ báo
"cô đứng nhắm mắt"). Mắt người vẽ có lòng trắng; mắt nhắm thì không → đếm điểm ảnh lòng trắng (sáng, gần như không màu, đặc) trong dải
mắt. Khung nhân vật: mắt nằm giữa bề ngang, ở eye_y × cao (characters.json frame; build.py căn mọi tư thế theo đường mắt)."""
import numpy as np


def eye_box(w, h, eye_y=0.32):   # dải mắt theo tỉ lệ khung (đo trên khung 1108×960: x 334–774, y 257–357)
    return int(w * 0.30), int(h * (eye_y - 0.052)), int(w * 0.70), int(h * (eye_y + 0.052))


def openness(rgba, eye_y=0.32):
    """tỉ lệ điểm ảnh lòng trắng trong dải mắt (0 = nhắm). rgba: mảng HxWx4 uint8, màu KHÔNG nhân alpha."""
    x0, y0, x1, y1 = eye_box(rgba.shape[1], rgba.shape[0], eye_y)
    c = rgba[y0:y1, x0:x1].astype(int); mx, mn = c[..., :3].max(-1), c[..., :3].min(-1)
    white = (mx > 200) & ((mx - mn) * 255 < 60 * np.maximum(mx, 1)) & (c[..., 3] > 200)
    return float(white.mean())


def is_open(score, ref):   # ref = độ mở bình thường của người đó (ảnh poster/talk); mắt nhắm ≈ 0, mở ≈ ref
    return score >= 0.45 * ref


def pick(scores, want, ref):
    """khung gần `want` nhất mà mắt mở rõ (≥ 70 % ref, không nằm sát một cái chớp) → None nếu cả clip nhắm mắt."""
    ok = [i for i, s in enumerate(scores) if s >= 0.7 * ref and all(scores[j] >= 0.45 * ref for j in range(max(0, i - 3), min(len(scores), i + 4)))]
    return min(ok, key=lambda i: abs(i - want)) if ok else None
