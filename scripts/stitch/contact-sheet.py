# Ảnh ghép xem nhanh kho Stitch v3: mỗi màn 1 ô (sáng | tối), thu nhỏ ~360px rộng/cặp, cắt cao tối đa 640px.
# Chỉ mở ảnh ghép này để duyệt (không đọc HTML). Dùng: python3 scripts/stitch/contact-sheet.py [out/stitch/v3] [sheet.jpg]
import sys, os
from PIL import Image, ImageDraw
SRC = sys.argv[1] if len(sys.argv) > 1 else 'out/stitch/v3'
DST = sys.argv[2] if len(sys.argv) > 2 else os.path.join(SRC, 'sheet.jpg')
W, H, COLS, PAD = 180, 640, 6, 8  # 180px mỗi chế độ → 360px mỗi cặp
cells = []
for d in sorted(os.listdir(SRC)):
    p = os.path.join(SRC, d)
    if not os.path.isdir(p): continue
    ims = []
    for m in ('light', 'dark'):
        f = os.path.join(p, m + '.png')
        try: ok = os.path.exists(f) and Image.open(f).verify() is None
        except Exception: ok = False  # ảnh tải hỏng → ô xám, không làm hỏng cả tờ
        if ok:
            im = Image.open(f).convert('RGB'); im = im.resize((W, max(1, round(im.height * W / im.width))))
            ims.append(im.crop((0, 0, W, min(H, im.height))))
        else: ims.append(Image.new('RGB', (W, 120), '#999'))
    cell = Image.new('RGB', (2 * W, H + 18), '#777'); ImageDraw.Draw(cell).text((4, 3), d, fill='white')
    for i, im in enumerate(ims): cell.paste(im, (i * W, 18))
    cells.append(cell)
if not cells: sys.exit('no screens')
rows = (len(cells) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (2 * W + PAD) + PAD, rows * (H + 18 + PAD) + PAD), '#444')
for i, c in enumerate(cells): sheet.paste(c, (PAD + (i % COLS) * (2 * W + PAD), PAD + (i // COLS) * (H + 18 + PAD)))
sheet.save(DST, quality=72); print(DST, len(cells), 'màn', sheet.size)
