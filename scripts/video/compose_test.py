#!/usr/bin/env python3
"""Ghép thử 1 khung Shorts 1080x1920 từ kho mô-đun (phòng + nhân vật + đạo cụ + chữ hook + phụ đề).
Bản thử để chấm chất lượng; bản sản xuất dựng bằng Remotion theo cùng quy chuẩn (docs/ASSET-LIBRARY.md)."""
import sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter

import os
C = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../brand/characters/_candidates/')
OUT = sys.argv[1] if len(sys.argv) > 1 else C + 'compose-test.png'
W, H = 1080, 1920
FONT = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'
FONT_B = '/System/Library/Fonts/Supplemental/Arial Black.ttf'
ORANGE, TEAL, INK = (255, 122, 47), (16, 132, 136), (33, 24, 20)


def fit(path, h=None, w=None):
    im = Image.open(path).convert('RGBA')
    s = (h / im.height) if h else (w / im.width)
    return im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)


def put(bg, sp, cx, foot):  # đặt sprite theo tâm ngang + chân (anchor giữa đáy)
    sh = Image.new('RGBA', sp.size, (0, 0, 0, 0))  # bóng đổ mềm dưới chân
    a = sp.split()[3].point(lambda v: 60 if v > 10 else 0)
    sh.putalpha(a)
    sh = sh.resize((sp.width, max(8, sp.height // 14))).filter(ImageFilter.GaussianBlur(10))
    bg.alpha_composite(sh, (int(cx - sp.width / 2), int(foot - sh.height / 2)))
    bg.alpha_composite(sp, (int(cx - sp.width / 2), int(foot - sp.height)))


def text(d, xy, s, size, fill, font=FONT_B, stroke=10, sfill=INK, anchor='mm'):
    f = ImageFont.truetype(font, size)
    d.text(xy, s, font=f, fill=fill, stroke_width=stroke, stroke_fill=sfill, anchor=anchor)
    return f


bg = Image.open(C + 'rooms/office-1.png').convert('RGBA').resize((W, round(W * 2720 / 1536)), Image.LANCZOS)
bg = bg.crop((0, 0, W, H)) if bg.height >= H else bg.resize((W, H))
# làm dịu nền để nhân vật nổi (độ sâu trường ảnh nhẹ)
bg = Image.blend(bg, bg.filter(ImageFilter.GaussianBlur(2.2)), 0.6)
top = Image.new('RGBA', (W, 560), (0, 0, 0, 0))
for yy in range(560):
    ImageDraw.Draw(top).line((0, yy, W, yy), fill=(20, 30, 40, int(150 * (1 - yy / 560))))
bg.alpha_composite(top)
P = C + 'props/office-a/'
desk = fit(P + 'office-01.png', w=500); put(bg, desk, 830, 1690)  # bàn tiền cảnh phải
put(bg, fit(P + 'office-09.png', h=165), 790, 1690 - desk.height + 8)  # laptop trên bàn
put(bg, fit(P + 'office-10.png', h=70), 950, 1690 - desk.height + 8)  # cốc
put(bg, fit(P + 'office-04.png', h=330), 150, 1690)          # cây tiền cảnh trái
put(bg, fit(C + 'mia/cut/mia-shock-01.png', h=1120), 420, 1700)  # Mia

d = ImageDraw.Draw(bg)
# hook (≤ 2 s): 2 dòng, chữ to, viền đậm – vùng trên an toàn của Shorts
text(d, (W // 2, 250), 'STOP SAYING', 92, (255, 255, 255))
f = text(d, (W // 2, 375), '"I\'M AGREE"', 118, ORANGE, stroke=12)
# gạch chéo đỏ trên cụm sai
bb = d.textbbox((W // 2, 375), '"I\'M AGREE"', font=f, anchor='mm')
d.line((bb[0] - 10, bb[3] - 18, bb[2] + 10, bb[1] + 18), fill=(230, 40, 40), width=16)
# phụ đề karaoke mẫu (1/3 dưới): từ đang đọc tô cam, đã đọc trắng, chưa đọc trắng mờ
y = 1560
d.rounded_rectangle((70, y - 70, W - 70, y + 70), 36, fill=(20, 20, 20, 170))
words = [('Say', 'done'), ('"I', 'done'), ('agree"', 'now'), ('instead!', 'todo')]
fw = ImageFont.truetype(FONT, 72)
total = sum(d.textlength(w + ' ', font=fw) for w, _ in words)
x = (W - total) / 2
for w, st in words:
    col = {'done': (255, 255, 255), 'now': ORANGE, 'todo': (255, 255, 255, 150)}[st]
    d.text((x, y), w, font=fw, fill=col, anchor='lm', stroke_width=4 if st == 'now' else 0, stroke_fill=INK)
    x += d.textlength(w + ' ', font=fw)
# CTA nhỏ + thương hiệu
d.rounded_rectangle((W // 2 - 250, 1790, W // 2 + 250, 1860), 35, fill=TEAL)
text(d, (W // 2, 1825), 'Practice free  |  lexkite.com', 40, (255, 255, 255), font=FONT, stroke=0)
bg.convert('RGB').save(OUT, quality=92)
print(OUT)
