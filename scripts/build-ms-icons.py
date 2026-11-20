#!/usr/bin/env python3
"""web/fonts/ms-paths.js = đường vẽ SVG của icon Material Symbols, cắt từ CHÍNH hai phông web/fonts/msym.woff2 (Outlined) + msymr.woff2 (Rounded).
Vì sao (P0 15/11): trên iPhone Safari ô icon trống – ligature của phông icon không ra hình. Icon vẽ bằng SVG thì mọi engine giống nhau; phông chỉ còn là dự phòng.
Chỉ cắt icon ĐANG DÙNG (tên trong web/fonts/msym.json): kiểu nào (Rounded/Outlined, rỗng/đặc) mà mã nguồn gọi thì có kiểu đó; mọi tên có cả Outlined + Rounded (rỗng).
Dùng:  pip install fonttools brotli && python3 scripts/build-ms-icons.py        (chạy lại khi đổi web/fonts/msym.json hoặc phông: node scripts/build-stitch-css.mjs --fonts)
Cổng CI: scripts/test/ms-icons.mjs (mọi icon mã nguồn gọi phải có đường vẽ, file không lệch phông)."""
import glob, json, re, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

names = json.load(open('web/fonts/msym.json'))
files = [p for p in glob.glob('web/js/**/*.js', recursive=True) if not False] + glob.glob('web/app/*.html') + glob.glob('web/*.html')
use = set()  # (họ r|o, tên, đặc)
for p in files:
    t = open(p, encoding='utf8', errors='ignore').read()
    for m in re.finditer(r"""\bms\(\s*['"]([a-z_0-9]+)['"]([^)]*)\)""", t):  # ms(tên, lớp, đặc) của web/js/st/common.js = Outlined
        a = m.group(2); use.add(('o', m.group(1), a.count(',') >= 2 and not re.search(r",\s*(false|0|null|'')\s*$", a.strip())))
    for m in re.finditer(r"""class=\\?["']material-symbols-(rounded|outlined)([^"'>]*)\\?["'][^>]*>\s*([a-z_0-9]+)\s*<""", t):
        use.add((m.group(1)[0], m.group(3), bool(re.search(r'\bfill\b', m.group(2)))))
for n in names: use |= {('o', n, False), ('r', n, False)}  # tên chỉ gọi động (icon theo dữ liệu) có thể dùng họ nào cũng được → đủ cả hai, rỗng
use = {u for u in use if u[1] in names}
out = {}
for fam, fn in (('r', 'web/fonts/msymr.woff2'), ('o', 'web/fonts/msym.woff2')):
    for fill in (0, 1):
        want = sorted(n for f, n, fl in use if f == fam and bool(fl) == bool(fill))
        if not want: continue
        font = TTFont(fn); axes = {a.axisTag for a in font['fvar'].axes}
        font = instantiateVariableFont(font, {k: v for k, v in {'FILL': fill, 'wght': 400, 'GRAD': 0, 'opsz': 24}.items() if k in axes})
        cm = font.getBestCmap(); inv = {}; [inv.setdefault(v, k) for k, v in cm.items()]; gs = font.getGlyphSet(); lig = {}
        for lk in font['GSUB'].table.LookupList.Lookup:
            for st in lk.SubTable:
                st = getattr(st, 'ExtSubTable', st)
                for first, ls in getattr(st, 'ligatures', {}).items():
                    for x in ls: lig[''.join(chr(inv[g]) for g in [first] + x.Component)] = x.LigGlyph
        d = out.setdefault(fam + ('f' if fill else ''), {})
        for n in want:
            if n not in lig: sys.exit('✗ phông %s thiếu icon %s' % (fn, n))
            pen = SVGPathPen(gs, ntos=lambda v: str(int(round(v)))); gs[lig[n]].draw(TransformPen(pen, (1, 0, 0, -1, 0, 0)))
            d[n] = re.sub(r'(?<=\d) (?=-)', '', pen.getCommands().replace(' ', ' '))
        print(fam, 'đặc' if fill else 'rỗng', len(d[n if want else ''] if False else d), 'icon')
js = '/* SINH TỰ ĐỘNG bởi scripts/build-ms-icons.py từ web/fonts/msym*.woff2 – KHÔNG sửa tay. viewBox 0 -960 960 960. Nạp lười bởi js/ms-icons.js */\nwindow.MSP=' + json.dumps(out, separators=(',', ':'), sort_keys=True) + ';\n'
open('web/fonts/ms-paths.js', 'w').write(js); print('web/fonts/ms-paths.js', len(js), 'byte')
