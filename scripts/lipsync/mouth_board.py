#!/usr/bin/env python3
"""Bảng duyệt 9 miệng VẼ (web/js/call/mouths.js) đặt trên mặt Ama và Carlos (poster-2x) → 1 ảnh gửi anh chủ duyệt.
Xoá miệng gốc của poster (tô màu da), vẽ miệng vector (resvg), Carlos: giữ ria mép đè lên trên.
Dùng: python3 scripts/lipsync/mouth_board.py OUT.png [--zoom]   (cần: pip install resvg-py pillow; node 22)"""
import io, json, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont
import resvg_py

ROOT = Path(__file__).resolve().parents[2]
# tâm miệng (poster-2x 1108×960) · vùng xoá miệng gốc (elip) · khung mặt cắt cho bảng
FACE = {
    'ama': {'c': (550, 385), 'erase': (494, 366, 606, 406), 'crop': (430, 255, 670, 455)},
    'carlos': {'c': (560, 399), 'erase': (508, 386, 616, 424), 'crop': (440, 255, 680, 455)},
}
SOUNDS = {'X': 'nghỉ', 'A': 'M B P', 'B': 'K S T EE', 'C': 'EH AE', 'D': 'AA', 'E': 'AO ER', 'F': 'OO W', 'G': 'F V', 'H': 'L'}


def mouths(who):
    js = ("const M=require(%s);const o={};for(const s of M.SHAPES)o[s]=M.svg(%s,s,'m'+s);console.log(JSON.stringify(o))"
          % (json.dumps(str(ROOT / 'web/js/call/mouths.js')), json.dumps(who)))
    return json.loads(subprocess.check_output(['node', '-e', js]))


def font(sz):
    for p in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def face_base(who):
    F = FACE[who]
    im = Image.open(ROOT / f'web/teach/{who}/poster-2x.webp').convert('RGBA')
    x0, y0, x1, y1 = F['erase']
    skin = im.getpixel((x0 - 6, y0 - 4))
    keep = None
    if who == 'carlos':  # ria mép = mảng tối dày (mở hình thái học bỏ nét miệng mảnh)
        g = im.convert('L').point(lambda v: 255 if v < 60 else 0)
        box = (470, 350, 650, 410)
        m = Image.new('L', im.size, 0); m.paste(g.crop(box), box[:2])
        m = m.filter(ImageFilter.MinFilter(9)).filter(ImageFilter.MaxFilter(11)).filter(ImageFilter.GaussianBlur(.8))
        keep = Image.new('RGBA', im.size, (12, 6, 4, 255)); keep.putalpha(m)
    mask = Image.new('L', im.size, 0)
    ImageDraw.Draw(mask).ellipse(F['erase'], fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(3))
    im.paste(Image.new('RGBA', im.size, skin), (0, 0), mask)
    return im, keep


def render(who, base, keep, g):
    W, H = base.size
    cx, cy = FACE[who]['c']
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}"><g transform="translate({cx} {cy})">{g}</g></svg>'
    lay = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=svg)))).convert('RGBA')
    out = base.copy(); out.alpha_composite(lay)
    if keep is not None:
        out.alpha_composite(keep)
    return out


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'qa/lipsync/mouth-board.png'
    T, PAD, LAB = 300, 14, 44
    bg = (238, 245, 245)
    cols = []
    for who in ['ama', 'carlos']:
        base, keep = face_base(who)
        G = mouths(who)
        crop = FACE[who]['crop']
        th = int(T * (crop[3] - crop[1]) / (crop[2] - crop[0]))
        sheet = Image.new('RGB', (3 * T + 4 * PAD, 60 + 3 * (th + LAB) + 4 * PAD), bg)
        d = ImageDraw.Draw(sheet)
        d.text((PAD, 14), who.capitalize(), fill=(15, 42, 51), font=font(34))
        for i, s in enumerate(['X', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']):
            f = render(who, base, keep, G[s]).crop(crop)
            tile = Image.new('RGBA', f.size, (221, 239, 240, 255)); tile.alpha_composite(f)
            tile = tile.convert('RGB').resize((T, th), Image.LANCZOS)
            x, y = PAD + (i % 3) * (T + PAD), 60 + PAD + (i // 3) * (th + LAB + PAD)
            sheet.paste(tile, (x, y))
            d.text((x + 6, y + th + 6), s, fill=(14, 124, 134), font=font(28))
            d.text((x + 40, y + th + 12), SOUNDS[s], fill=(70, 85, 90), font=font(20))
        cols.append(sheet)
    W = sum(c.width for c in cols) + PAD
    board = Image.new('RGB', (W, max(c.height for c in cols)), bg)
    x = 0
    for c in cols:
        board.paste(c, (x, 0)); x += c.width + PAD
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    board.save(out_path)
    print(out_path, board.size)


if __name__ == '__main__':
    main()
