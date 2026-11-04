#!/usr/bin/env python3
"""Khung vung tay nhanh của clip giáo viên: làm mượt theo dòng chảy quang học (0 credit, chạy trên CI trong build.py).
Nguồn Kling ở khung tay vung nhanh (> vài px/khung) méo: lòng bàn tay biến dạng, vệt đen, mép tay áo răng cưa, lọt đốm phông xanh (live 3/11, iPhone).
Clip 2× vẫn méo y hệt vì lỗi nằm ở nguồn. Cách xử lý như hoạt hình vẽ tay: chỗ chuyển động nhanh → nhoè theo hướng chuyển động; chỗ chậm/đứng yên (mặt, miệng, mắt) giữ nguyên từng điểm ảnh.
Vào/ra: khung RGBA thẳng uint8 (H×W×4). despill() khử xanh; smear() trả về danh sách khung mới và số đo."""
import glob, json, os, subprocess, sys

import cv2
import numpy as np


def despill(f):
    """Bảng màu Ama/Carlos không có xanh lá: G > max(R,B) ở người = vết phông xanh → kéo về max(R,B)."""
    o = f.copy(); o[..., 1] = np.minimum(f[..., 1], np.maximum(f[..., 0], f[..., 2])); return o


def _gray(f): return ((f[..., :3].astype(np.float32).mean(axis=2) * .5 + f[..., 3] * .5) * (f[..., 3] > 8)).astype(np.uint8)


def _warp(p, fx, fy, k, X, Y): return cv2.remap(p, X - fx * k, Y - fy * k, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def smear(frames, scale=1.0, lo=4.0, hi=9.0, taps=9):
    """Tốc độ (px/khung, quy về khung 554 px) ≤ lo: giữ nguyên · ≥ hi: nhoè đủ. taps = số mẫu dọc đường đi."""
    H, W = frames[0].shape[:2]; n = len(frames)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM)
    g = [_gray(f) for f in frames]
    Y, X = np.mgrid[0:H, 0:W].astype(np.float32); out = []; fast = 0
    def pm(f): return np.dstack([f[..., :3].astype(np.float32) * (f[..., 3:] / 255.), f[..., 3].astype(np.float32)])   # trộn ở không gian nhân alpha: không lem viền đen
    for i in range(n):
        a, b = max(0, i - 1), min(n - 1, i + 1)
        flow = dis.calc(g[a], g[b], None) / max(1, b - a)   # px/khung quanh khung i
        mask = (frames[i][..., 3] > 8) | (frames[a][..., 3] > 8) | (frames[b][..., 3] > 8)
        sp = np.hypot(flow[..., 0], flow[..., 1]) * mask
        sp = cv2.GaussianBlur(sp, (0, 0), 6 * scale)        # tốc độ theo vùng, không theo điểm ảnh
        w = np.clip((sp / scale - lo) / (hi - lo), 0, 1)
        w = w * w * (3 - 2 * w)
        if w.max() < .02: out.append(frames[i]); continue
        fast += 1
        fx, fy = cv2.GaussianBlur(flow[..., 0], (0, 0), 3 * scale), cv2.GaussianBlur(flow[..., 1], (0, 0), 3 * scale)
        p = pm(frames[i]); acc = np.zeros_like(p)
        for k in np.linspace(-.5, .5, taps): acc += _warp(p, fx, fy, float(k), X, Y)
        acc /= taps
        m = p * (1 - w[..., None]) + acc * w[..., None]
        al = np.clip(m[..., 3], 0, 255)
        rgb = np.where(al[..., None] > .5, m[..., :3] / np.maximum(al[..., None], .5) * 255, 0)
        out.append(np.dstack([np.clip(rgb, 0, 255), al]).round().astype(np.uint8))
    return out, {'frames': n, 'smeared': fast}


def warp_score(frames, scale=1.0, hi=9.0):
    """Vệt đen mảnh còn sắc nét trong vùng đang vung nhanh (cùng phép đo tốc độ với smear, quy về khung 554 px), từng khung. Chỗ chậm (mặt, miệng) không tính."""
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(5 * scale) | 1, int(5 * scale) | 1)); out = []
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_MEDIUM); g = [_gray(f) for f in frames]; n = len(frames)
    for i in range(n):
        a, b = max(0, i - 1), min(n - 1, i + 1)
        flow = dis.calc(g[a], g[b], None) / max(1, b - a); A = frames[i][..., 3]
        sp = cv2.GaussianBlur(np.hypot(flow[..., 0], flow[..., 1]) * (A > 8), (0, 0), 6 * scale) / scale
        reg = sp >= hi
        if not reg.any(): out.append(0); continue
        lines = cv2.morphologyEx(frames[i][..., :3].max(axis=2), cv2.MORPH_BLACKHAT, k) > 45
        out.append(int((lines & reg & (A > 200)).sum() / scale ** 2))
    return out


def read_clip(src):
    """Nửa đầu (đi xuôi) của clip xếp chồng → khung RGBA thẳng."""
    w, h = (int(x) for x in subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', src], capture_output=True, text=True, check=True).stdout.strip().split(',')[:2])
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-threads', '1', '-i', src, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
    n = len(raw) // (w * h * 3); hh = h // 2; fr = []
    for i in range(n // 2 + 1):
        a = np.frombuffer(raw, np.uint8, w * h * 3, i * w * h * 3).reshape(h, w, 3); A = a[hh:, :, 0]
        fr.append(np.dstack([np.where(A[..., None] > 4, np.minimum(a[:hh].astype(np.float32) / np.maximum(A[..., None], 1) * 255, 255), 0).astype(np.uint8), A]))
    return fr, w / 554


MAX_WARP = float(os.environ.get('MAX_WARP', 30))   # px mỗi khung, xem docs/CHARACTERS.md


if __name__ == '__main__':   # Dùng: motion_smear.py <web/teach> [--report]  – đỏ khi còn clip có khung vung tay méo
    D = sys.argv[1]; REPORT = '--report' in sys.argv; R = json.load(open(f'{D}/characters.json')); bad = []
    for who in R['people']:
        for f in sorted(glob.glob(f'{D}/{who}/*.mp4')):
            if os.path.basename(f).startswith('idle'): continue
            fr, sc = read_clip(f); s = warp_score(fr, sc); top = sorted(s)[-3:]; v = sum(top) / max(1, len(top))
            print(f'{who}/{os.path.basename(f):20s} vệt đen trong khung vung tay: {v:6.1f} px (đỉnh {max(s or [0])}, {sum(1 for x in s if x)} khung vung)')
            if v > MAX_WARP: bad.append(f'{who}/{os.path.basename(f)}: {v:.0f} px > {MAX_WARP:.0f}')
    print('\n'.join(['✗ khung vung tay méo:'] + bad) if bad else '✓ khung vung tay sạch')
    if bad and not REPORT: sys.exit(1)
