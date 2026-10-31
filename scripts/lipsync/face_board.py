#!/usr/bin/env python3
"""Mặt VẼ nhiều lớp (web/js/call/face.js) cho Ama/Carlos: dựng "đầu trơn" (poster-2x xoá mắt/mày/miệng/ria bằng nội suy điều hoà từ màu da xung quanh)
rồi đặt lớp vector lên → bảng duyệt: 9 miệng + biểu cảm (chớp, liếc, nhướng mày, nhíu, nghiêng đầu). Dùng chung render() cho video (drawn_video.py).
Dùng: python3 scripts/lipsync/face_board.py OUT.png   (cần: numpy pillow resvg-py; node 22)"""
import io, json, subprocess, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import resvg_py

ROOT = Path(__file__).resolve().parents[2]
CROP = {'ama': (400, 190, 700, 460), 'carlos': (420, 200, 720, 470)}
VCROP = {'ama': (310, 70, 790, 590), 'carlos': (326, 80, 806, 600)}  # khung video: cả đầu + vai
BG = (221, 239, 240, 255)
SOUNDS = {'X': 'nghỉ', 'A': 'M B P', 'B': 'K S T EE', 'C': 'EH AE', 'D': 'AA', 'E': 'AO ER', 'F': 'OO W', 'G': 'F V', 'H': 'L'}


def node(js):
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def rig():
    return node("console.log(JSON.stringify(require('./web/js/call/face.js').RIG))")


def font(sz):
    for p in ['/System/Library/Fonts/Supplemental/Arial Bold.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf']:
        if Path(p).exists():
            return ImageFont.truetype(p, sz)
    return ImageFont.load_default()


def bare_head(who, R=None):
    """poster-2x → đầu trơn: mỗi elip `erase` (cx, cy, rx, ry) được lấp bằng nghiệm Laplace (Jacobi) từ viền ngoài → da liền, không vệt."""
    R = R or rig()[who]
    im = np.asarray(Image.open(ROOT / f'web/teach/{who}/poster-2x.webp').convert('RGBA')).astype(np.float32).copy()
    H, W = im.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W]
    for cx, cy, rx, ry in R['erase']:
        m = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
        x0, x1, y0, y1 = int(cx - rx - 3), int(cx + rx + 4), int(cy - ry - 3), int(cy + ry + 4)
        sub, mm = im[y0:y1, x0:x1, :3], m[y0:y1, x0:x1]
        sub[mm] = sub[~mm].mean(0)
        for _ in range(900):
            avg = (np.roll(sub, 1, 0) + np.roll(sub, -1, 0) + np.roll(sub, 1, 1) + np.roll(sub, -1, 1)) / 4
            sub[mm] = avg[mm]
        im[y0:y1, x0:x1, :3] = sub
    return Image.fromarray(im.clip(0, 255).astype(np.uint8))


def render(who, base, g, st=None, crop=True, box=None):
    """đầu trơn + lớp vector g (svg <g>) → nghiêng đầu (tilt độ) quanh cổ + gật (nod px) → khung cắt mặt trên nền."""
    W, H = base.size
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}">{g}</svg>'
    lay = Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=svg)))).convert('RGBA')
    out = base.copy(); out.alpha_composite(lay)
    st = st or {}
    if abs(st.get('tilt', 0)) > 0.01 or abs(st.get('nod', 0)) > 0.01:
        out = out.rotate(st.get('tilt', 0), resample=Image.BICUBIC, center=tuple(rig_cache(who)['pivot']), translate=(0, st.get('nod', 0)))
    bg = Image.new('RGBA', out.size, BG); bg.alpha_composite(out)
    return bg.crop(box or CROP[who]).convert('RGB') if crop else bg.convert('RGB')


_R = {}


def rig_cache(who):
    if not _R:
        _R.update(rig())
    return _R[who]


def states(who):
    """9 miệng (mắt mở) + 6 biểu cảm → [(nhãn, phụ đề, svg, st)]"""
    js = """const F=require('./web/js/call/face.js'),R=F.RIG[%s],L={x:R.look[0],y:R.look[1]},o=[];
for(const s of 'XABCDEFGH')o.push([s,%s[s],F.svg(%s,{mouth:s,look:L,open:'XA'.includes(s)?0:.6},'b'+s),{}]);
const ex=[['chớp ½',{blink:.5}],['nhắm',{blink:1}],['liếc trái',{look:{x:-.9,y:0}}],['liếc phải',{look:{x:.9,y:-.1}}],['nhướng mày',{brow:1,mouth:'C',tilt:2.5}],['nhíu (nghĩ)',{knit:.9,look:{x:-.4,y:-.5},tilt:-3}]];
ex.forEach(([n,s],i)=>o.push(['',n,F.svg(%s,Object.assign({look:L},s),'e'+i),{tilt:s.tilt||0}]));console.log(JSON.stringify(o))""" % (
        json.dumps(who), json.dumps(SOUNDS), json.dumps(who), json.dumps(who))
    return node(js)


def main():
    out_path = sys.argv[1] if len(sys.argv) > 1 else 'qa/lipsync/face-board.png'
    T, PAD, LAB, COLS = 230, 12, 36, 5
    bg = (238, 245, 245)
    cols = []
    for who in ['ama', 'carlos']:
        base = bare_head(who, rig_cache(who))
        S = states(who)
        cw, ch = CROP[who][2] - CROP[who][0], CROP[who][3] - CROP[who][1]
        th = int(T * ch / cw)
        rows = (len(S) + COLS - 1) // COLS
        sheet = Image.new('RGB', (COLS * T + (COLS + 1) * PAD, 56 + rows * (th + LAB + PAD) + PAD), bg)
        d = ImageDraw.Draw(sheet)
        d.text((PAD, 12), who.capitalize() + ' – mặt vector', fill=(15, 42, 51), font=font(30))
        for i, (lab, sub, g, st) in enumerate(S):
            tile = render(who, base, g, st).resize((T, th), Image.LANCZOS)
            x, y = PAD + (i % COLS) * (T + PAD), 56 + (i // COLS) * (th + LAB + PAD)
            sheet.paste(tile, (x, y))
            if lab:
                d.text((x + 6, y + th + 4), lab, fill=(14, 124, 134), font=font(24))
            d.text((x + (34 if lab else 6), y + th + 9), sub, fill=(70, 85, 90), font=font(17))
        cols.append(sheet)
    board = Image.new('RGB', (max(c.width for c in cols), sum(c.height for c in cols)), bg)
    y = 0
    for c in cols:
        board.paste(c, (0, y)); y += c.height
    Path(out_path).parent.mkdir(parents=True, exist_ok=True)
    board.save(out_path)
    print(out_path, board.size)


if __name__ == '__main__':
    main()
