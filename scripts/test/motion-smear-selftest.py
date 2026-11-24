#!/usr/bin/env python3
"""Hồi quy cho cổng đo motion_smear.py (23/11: main đỏ teacher-motion 3 ngày vì clip cũ chưa qua pipeline, không ai thấy). Tổng hợp, không cần clip thật:
(1) tay da cam có 4 nét đen mảnh (như palm lines của clip chưa xử lý) đang vung nhanh → cổng PHẢI đỏ (warp_score/nét đen > ngưỡng);
(2) cùng khung qua despill + clean_hands + smear (đúng build.py / refine_clips.py) → cổng PHẢI xanh; (3) ngưỡng không bị nới (30 / 40 / 40)."""
import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'teach'))
import cv2, motion_smear as M  # noqa: E402

assert (M.MAX_WARP, M.MAX_LINES, M.MAX_OLIVE) == (30.0, 40.0, 40.0), ('ngưỡng cổng bị đổi', M.MAX_WARP, M.MAX_LINES, M.MAX_OLIVE)
H, W = 480, 554


def frame(i):   # người đứng yên + bàn tay da cam (Carlos: R>190, G~.6R) chạy ngang nhanh 14 px/khung, 4 nét đen mảnh dọc bàn tay
    f = np.zeros((H, W, 4), np.uint8); f[130:480, 150:400, :3] = (240, 240, 240); f[130:480, 150:400, 3] = 255   # thân áo trắng (alpha đặc)
    x = 180 + i * 14 % 120; f[300:420, x:x + 70, :3] = (225, 135, 70)
    for k in range(4): cv2.line(f, (x + 12 + k * 14, 305), (x + 6 + k * 14, 415), (20, 10, 5, 255), 2)
    f[300:420, x:x + 70, 3] = 255
    return f


fr = [frame(i) for i in range(16)]
bad_w = max(M.warp_score(fr)); bad_l = max(int(M._hand_lines(x, 1.0, 45)[0].sum()) for x in fr)
assert bad_w > M.MAX_WARP or bad_l > M.MAX_LINES, ('cổng không thấy nét đen thô', bad_w, bad_l)
out, info = M.smear([M.clean_hands(M.despill(x), 1.0) for x in fr], 1.0)
top = sorted(M.warp_score(out))[-3:]; ok_w = sum(top) / 3; ok_l = max(int(M._hand_lines(x, 1.0, 45)[0].sum()) for x in out)
assert ok_w <= M.MAX_WARP and ok_l <= M.MAX_LINES, ('sau xử lý cổng vẫn đỏ', ok_w, ok_l)
print(f'✓ motion-smear-selftest: thô vung {bad_w} nét {bad_l} → sạch vung {ok_w:.0f} nét {ok_l} (nhoè {info["smeared"]}/{len(fr)})')
