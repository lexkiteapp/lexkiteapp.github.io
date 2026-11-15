#!/usr/bin/env python3
"""news_kit_preview.py OUT_DIR - before/after stills of the cine/news overlay (old palette vs Stitch v2 Kit tokens). PIL only, no video, runs on a laptop or CI.
Executes the real renderers (news_cards.py + news_kit.py) against helper defs lifted from news.py, so the preview cannot drift from the render."""
import ast, os, re, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')); HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else '.'; os.makedirs(OUT, exist_ok=True)
def make(kit):
    g = dict(ROOT=ROOT, HERE=HERE, Image=Image, ImageDraw=ImageDraw, ImageFont=ImageFont, ImageFilter=ImageFilter, os=os, re=re, W=1080, H=1920)
    src = open(f'{HERE}/news.py').read(); tree = ast.parse(src); want_f = {'font', 'layer', 'shadowed', 'mark', 'icon', 'fit', 'bbox_of'}; want_v = {'SAFE', 'CW', 'FB', 'FH', 'TEAL', 'CARD_BG', 'CARD_Y', 'FUNCW', '_cd', 'NW'}
    for n in tree.body:
        if isinstance(n, ast.FunctionDef) and n.name in want_f: exec(compile(ast.Module([n], []), 'news.py', 'exec'), g)
        elif isinstance(n, ast.Assign):
            names = {t.id for t in n.targets if isinstance(t, ast.Name)} | {e.id for t in n.targets if isinstance(t, ast.Tuple) for e in t.elts if isinstance(e, ast.Name)}
            if names & (want_v | {'CX', 'CX0', 'ORANGE', 'YEL', 'INK', 'CREAM', 'CARD_Y'}) and 'LID' not in src[n.col_offset:n.end_col_offset]: exec(compile(ast.Module([n], []), 'news.py', 'exec'), g)
    g['NW'] = lambda x: len(re.findall(r"[A-Za-z0-9']+", x)); g['CARD_BG'], g['CARD_LINE'], g['CARD_INK'], g['CAP_BOX'] = (255, 255, 255), (34, 36, 44), (34, 36, 44), False
    g['TEAL'], g['ORANGE'] = (15, 61, 62), (229, 80, 47); g.update(CAP_FS=60, CAP_LH=74, CAP_Y=1238)
    if kit: exec(open(f'{HERE}/news_kit.py').read(), g); g['kit_palette']()
    exec(open(f'{HERE}/news_cards.py').read(), g)
    if kit: g['kit_renderers']()
    return g
def bg(kit):
    im = Image.new('RGB', (1080, 1920), (222, 178, 120) if not kit else (21, 67, 74)); d = ImageDraw.Draw(im)   # placeholder scene; the real clip keeps Ama on top
    d.ellipse([400, 560, 680, 940], fill=(60, 40, 30)); d.rectangle([250, 940, 830, 1920], fill=(24, 40, 70)); return im   # head box HEAD = [400,560,680,940] (real chin <= 945, news.py CARD_Y comment)
HEAD = (400, 560, 680, 940); SAFE_BOX = (48, 232, 924, 1497)   # news.py SAFE: top 12 %, bottom 22 %, right 14 % clear of all text
BOXES = {}
def frame(kit, shot):
    g = make(kit); im = bg(kit).convert('RGBA'); BOXES.clear()
    def put(k, r):
        im.alpha_composite(r[0]); BOXES[k] = tuple(r[1][:4])
    if shot == 'wordcheck':
        put('series', g['series_bar']('WORD CHECK', 'make vs do', y0=240)); put('hook', g['hook_card']('MAKE OR DO?', '', y0=336)[:2]); put('card', g['card_one']('p', "I'll make dinner.", num='B', y0=g['CARD_Y']))
        put('cap', g['cap_img']([['Which', 'one', 'is', 'right?']], 0))
        if kit: put('cta', g['cta_pill']('Free practice on lexkite.com', y0=1330)[:2])
        else:
            d = ImageDraw.Draw(im); d.rounded_rectangle([200, 1330, 880, 1426], 48, fill=(229, 80, 47)); d.text((540, 1378), 'Com' 'ment below', font=g['font'](g['FH'], 50), fill='white', anchor='mm')
    elif shot == 'fix':
        put('series', g['series_bar']('FIX IT', 'agree', y0=240, level='easy')); put('card', g['card_one']('x', 'I am agree.', num='NOT', y0=g['CARD_Y'])); put('cap', g['cap_img']([['Stop', 'saying', 'this.']], 0))
    else:
        put('card', g['card_recap']("TEACHER'S TIP", ['make dinner', 'make coffee'], y0=g['CARD_Y'])); put('cap', g['cap_img']([['Save', 'this', 'tip.']], 0))
    return im.convert('RGB')
def violations():
    """Kit overlay geometry gate: every box inside SAFE (top 12 %, bottom 22 %, right 14 %) and clear of the head box (24 px gap, news_layout.py rule)."""
    out = []
    for shot in ('wordcheck', 'fix', 'tip'):
        frame(True, shot)
        for k, b in BOXES.items():
            if b[0] < SAFE_BOX[0] or b[2] > SAFE_BOX[2] or b[1] < SAFE_BOX[1] or b[3] > SAFE_BOX[3]: out.append(f'{shot}/{k} {b} outside SAFE {SAFE_BOX}')
            if b[0] < HEAD[2] + 24 and b[2] > HEAD[0] - 24 and b[1] < HEAD[3] + 24 and b[3] > HEAD[1] - 24: out.append(f'{shot}/{k} {b} touches the head {HEAD}')
    return out
if __name__ == '__main__':
    v = violations()
    if v: print('\n'.join('GEOM ' + x for x in v)); sys.exit(1)
    for shot in ('wordcheck', 'fix', 'tip'):
        a, b = frame(False, shot), frame(True, shot); s = Image.new('RGB', (2200, 1920), (40, 40, 40)); s.paste(a, (0, 0)); s.paste(b, (1120, 0)); s.resize((1100, 960)).save(f'{OUT}/{shot}-before-after.png'); b.save(f'{OUT}/{shot}-new.png')
    print('ok')
