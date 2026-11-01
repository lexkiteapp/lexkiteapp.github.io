# Bảng trước/sau cho Call Ama/Carlos + phát âm (call-qa.yml): ghép ảnh before/<tên>.png | after/<tên>.png thành 1 tờ, rồi lưới ảnh chỉ có ở bản mới.
# Dùng: python3 scripts/test/call-sheet.py <before_dir> <after_dir> <out.png>
import sys, os
from PIL import Image, ImageDraw
B, A, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
W = 560  # mỗi ô rộng 560 px (ảnh thu nhỏ giữ tỉ lệ)
def load(p, w=W):
    im = Image.open(p).convert('RGB'); r = w / im.width
    return im.resize((w, int(im.height * r)))
rows = []
for n in ['list-d', 'ring-d', 'call-d', 'list-m', 'ring-m', 'call-m']:
    a = os.path.join(A, n + '.png')
    if not os.path.exists(a): continue
    w = W if n.endswith('-d') else 300
    b = os.path.join(B, n + '.png')
    rows.append((n, load(b, w) if os.path.exists(b) else None, load(a, w)))
extra = sorted(f[:-4] for f in os.listdir(A) if f.endswith('.png') and f[:-4] not in [r[0] for r in rows])
H = 40 + sum(max((r[1].height if r[1] else 0), r[2].height) + 40 for r in rows)
ex = [load(os.path.join(A, f + '.png'), 360) for f in extra]
exH = 0
for i in range(0, len(ex), 3): exH += max(im.height for im in ex[i:i + 3]) + 40
sheet = Image.new('RGB', (2 * W + 60, H + exH + 60), 'white'); d = ImageDraw.Draw(sheet)
y = 10; d.text((20, y), 'BEFORE (main)', fill='black'); d.text((W + 40, y), 'AFTER (this PR)', fill='black'); y += 30
for n, b, a in rows:
    d.text((20, y), n, fill='gray'); y += 14
    if b: sheet.paste(b, (20, y))
    else: d.text((20, y + 20), '(none)', fill='gray')
    sheet.paste(a, (W + 40, y)); y += max(b.height if b else 0, a.height) + 26
d.text((20, y), 'NEW SCREENS', fill='black'); y += 20
for i in range(0, len(ex), 3):
    x = 20
    for j, im in enumerate(ex[i:i + 3]):
        d.text((x, y), extra[i + j], fill='gray'); sheet.paste(im, (x, y + 14)); x += 380
    y += max(im.height for im in ex[i:i + 3]) + 40
sheet.save(OUT, optimize=True); print('sheet', OUT, sheet.size)
