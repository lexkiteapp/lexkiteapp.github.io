#!/usr/bin/env python3
"""Tách sprite từ bảng ảnh Kling (nền trơn sáng) → PNG trong suốt + SVG (vtracer).

  python scripts/video/cutout.py sheet.png outdir [--prefix office] [--min 4000] [--svg]

- Nền = vùng sáng, ít bão hòa nối liền với mép ảnh (gồm cả viền trắng kiểu sticker),
  lấp loang từ mép → các vật có viền đậm khép kín được giữ nguyên phần trắng bên trong.
- Mỗi mảng liền khối còn lại (≥ --min px) = 1 sprite; cắt sát khung bao + đệm 8 px.
- Mép alpha làm mềm 1 px để không răng cưa; loại viền sáng còn sót (halo) bằng co mask 1 px.
- --svg: chuyển sprite sang SVG bằng vtracer (màu, chế độ spline), giữ trong suốt.
Phụ thuộc: pillow, numpy, scipy (+ vtracer nếu --svg).
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageFilter
from scipy import ndimage as ndi


def background_mask(rgb, lum_min=228, sat_max=0.12):
    f = rgb.astype(np.float32)
    mx, mn = f.max(2), f.min(2)
    sat = (mx - mn) / np.maximum(mx, 1)
    light = (mx >= lum_min) & (sat <= sat_max)
    lab, _ = ndi.label(light)
    edge = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    edge = edge[edge > 0]
    return np.isin(lab, edge)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('sheet'); ap.add_argument('out')
    ap.add_argument('--prefix', default='sprite')
    ap.add_argument('--min', type=int, default=4000)
    ap.add_argument('--svg', action='store_true')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    rgb = np.array(Image.open(a.sheet).convert('RGB'))
    fg = ~background_mask(rgb)
    fg = ndi.binary_opening(fg, iterations=1)
    # vùng trắng nằm trong nét viền đậm (giày trắng, cổ áo, bảng trắng) phải giữ lại:
    # khép kín nét viền (đóng 3 px) rồi lấp lỗ → gộp vào tiền cảnh
    ink = rgb.astype(np.int16).max(2) < 185
    shell = ndi.binary_fill_holes(ndi.binary_closing(ink, iterations=6))
    fg = ndi.binary_fill_holes(fg | shell)
    fg = ndi.binary_erosion(fg, iterations=1)  # bỏ 1 px halo sáng
    lab, n = ndi.label(ndi.binary_dilation(fg, iterations=6))  # gộp chi tiết rời của cùng 1 vật
    items = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        m = (lab[sl] == i) & fg[sl]
        if m.sum() < a.min:
            continue
        px = rgb[sl][m].astype(np.float32)
        mx, mn = px.max(1), px.min(1)
        # mảnh bóng đổ / viền sticker sót: sáng, xám nhạt, không có nét viền đậm
        if (mx < 90).mean() < 0.02 and ((mx - mn) / np.maximum(mx, 1)).mean() < 0.15:
            continue
        y0, x0 = sl[0].start, sl[1].start
        pad = 8
        h, w = m.shape
        alpha = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
        rgba = np.dstack([rgb[sl], np.array(alpha)])
        canvas = np.zeros((h + 2 * pad, w + 2 * pad, 4), np.uint8)
        canvas[pad:pad + h, pad:pad + w] = rgba
        items.append((y0, x0, canvas))
    # thứ tự đọc: theo hàng (trên → dưới), trong hàng trái → phải
    items.sort(key=lambda t: (t[0] // 250, t[1]))
    meta = []
    for k, (y0, x0, canvas) in enumerate(items, 1):
        name = f'{a.prefix}-{k:02d}'
        p = os.path.join(a.out, name + '.png')
        Image.fromarray(canvas).save(p, optimize=True)
        rec = {'id': name, 'png': os.path.basename(p), 'w': canvas.shape[1], 'h': canvas.shape[0], 'src': [x0, y0]}
        if a.svg:
            import vtracer
            sp = os.path.join(a.out, name + '.svg')
            vtracer.convert_image_to_svg_py(p, sp, colormode='color', hierarchical='stacked', mode='spline',
                                            filter_speckle=6, color_precision=6, layer_difference=24,
                                            corner_threshold=60, length_threshold=4.0, splice_threshold=45, path_precision=2)
            rec['svg'] = os.path.basename(sp); rec['svgBytes'] = os.path.getsize(sp)
        meta.append(rec)
    with open(os.path.join(a.out, f'{a.prefix}.json'), 'w') as fh:
        json.dump(meta, fh, indent=1)
    print(f'{len(meta)} sprites → {a.out}')


if __name__ == '__main__':
    sys.exit(main())
