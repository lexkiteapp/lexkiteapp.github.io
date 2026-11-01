#!/usr/bin/env python3
"""Tờ soát bộ nhân vật (owner duyệt bằng mắt): mỗi người 1 hàng – avatar, poster, rồi khung giữa của từng tư thế; nền sáng + tối của app.
Dùng: sheet.py <web/teach> <out.jpg>  (CI teach-build.yml)"""
import json, os, subprocess, sys, tempfile
from PIL import Image, ImageChops, ImageDraw, ImageOps

T, OUT = sys.argv[1], sys.argv[2]; R = json.load(open(f'{T}/characters.json')); F = R['frame']; W, H = F['w'], F['h']
tmp = tempfile.mkdtemp(); CELL = (W // 2, H // 2); BGS = [(245, 247, 248), (15, 26, 28)]


def frame(mp4):   # khung giữa của vòng xếp chồng → RGBA (màu đã nhân alpha → chia lại)
    n = int(subprocess.run(['ffprobe', '-v', 'error', '-count_frames', '-select_streams', 'v', '-show_entries', 'stream=nb_read_frames', '-of', 'csv=p=0', mp4], capture_output=True, text=True).stdout)
    p = f'{tmp}/f.png'; subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-vf', f'select=eq(n\\,{n // 4})', '-frames:v', '1', p], check=True)
    im = Image.open(p).convert('RGB'); c, a = im.crop((0, 0, W, H)), im.crop((0, H, W, 2 * H)).convert('L')
    return c, a


cols = ['avatar', 'poster'] + R['poses']; pw = CELL[0] + 8
sheet = Image.new('RGB', (pw * len(cols) + 8, (CELL[1] + 24) * len(R['people']) * 2 + 8), (255, 255, 255)); d = ImageDraw.Draw(sheet)
y = 4
for who in R['people']:
    for bg in BGS:
        for i, k in enumerate(cols):
            x = 4 + i * pw; base = Image.new('RGB', (W, H), bg)
            if k in ('avatar', 'poster'):
                im = Image.open(f'{T}/{who}/{k}.webp').convert('RGBA'); im = im.resize((W, W)) if k == 'avatar' else im
                b = Image.new('RGBA', (W, H), bg + (255,)); b.alpha_composite(im, (0, (H - im.height) // 2)); base = b.convert('RGB')
            elif os.path.exists(f'{T}/{who}/{k}.mp4'):
                c, a = frame(f'{T}/{who}/{k}.mp4')   # màu đã nhân alpha: ghép "over" = c + nền·(1−a)
                base = ImageChops.add(c, ImageChops.multiply(base, Image.merge('RGB', [ImageOps.invert(a)] * 3)))
            else:
                ImageDraw.Draw(base).text((20, H // 2), 'PENDING', fill=(220, 40, 40))
            sheet.paste(base.resize(CELL), (x, y + 20)); d.text((x, y + 4), f'{who} · {k}', fill=(0, 0, 0))
        y += CELL[1] + 24
# 🔍 phóng 2× mép (đỉnh tóc · vai trái · vai phải) trên nền sáng + tối – soát viền: không quầng, không ánh xanh, không khung
crops = []
for who in R['people']:
    im = Image.open(f'{T}/{who}/poster.webp').convert('RGBA'); A = im.getchannel('A'); x0, y0, x1, y1 = A.getbbox(); cx = (x0 + x1) // 2
    ys = int(H * 0.72); row = [x for x in range(im.width) if A.getpixel((x, ys)) > 24]; l, r = (row[0], row[-1]) if row else (x0, x1)   # mép vai ở giữa khung
    for name, box in (('tóc', (cx - 50, max(0, y0 - 8), cx + 50, y0 + 67)), ('vai trái', (l - 30, ys - 37, l + 70, ys + 38)), ('vai phải', (r - 70, ys - 37, r + 30, ys + 38))):
        for bg in BGS:
            b = Image.new('RGBA', (box[2] - box[0], box[3] - box[1]), bg + (255,)); b.alpha_composite(im.crop(box)); crops.append((f'{who} {name}', b.convert('RGB').resize((200, 150), Image.NEAREST)))
cols2 = 6; strip = Image.new('RGB', (sheet.width, ((len(crops) + cols2 - 1) // cols2) * 172 + 30), (255, 255, 255)); d2 = ImageDraw.Draw(strip); d2.text((6, 6), 'Mép phóng 2× (soát tách nền)', fill=(0, 0, 0))
for i, (lbl, c) in enumerate(crops): x, y = 6 + (i % cols2) * 210, 26 + (i // cols2) * 172; strip.paste(c, (x, y + 16)); d2.text((x, y), lbl, fill=(0, 0, 0))
full = Image.new('RGB', (sheet.width, sheet.height + strip.height), (255, 255, 255)); full.paste(sheet, (0, 0)); full.paste(strip, (0, sheet.height)); sheet = full
os.makedirs(os.path.dirname(OUT) or '.', exist_ok=True); sheet.save(OUT, quality=85); print(OUT, sheet.size)
