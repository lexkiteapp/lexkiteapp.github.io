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
    d.ellipse([340, 960, 740, 1400], fill=(60, 40, 30)); d.rectangle([250, 1400, 830, 1920], fill=(24, 40, 70)); return im
def frame(kit, shot):
    g = make(kit); im = bg(kit).convert('RGBA'); L = g['layer']
    if shot == 'wordcheck':
        im.alpha_composite(g['series_bar']('WORD CHECK', 'make vs do', y0=240)[0])
        im.alpha_composite(g['hook_card']('MAKE OR DO?', '', y0=336)[0]); c, _ = g['card_one']('p', "I'll make dinner.", num='B', y0=1016); im.alpha_composite(c)
        cp, _ = g['cap_img']([['Which', 'one', 'is', 'right?']], 0); im.alpha_composite(cp)
        if kit: im.alpha_composite(g['cta_pill']('Free practice on lexkite.com', y0=1330)[0])
        else:
            d = ImageDraw.Draw(im); d.rounded_rectangle([200, 1330, 880, 1426], 48, fill=(229, 80, 47)); d.text((540, 1378), 'Com' 'ment below', font=g['font'](g['FH'], 50), fill='white', anchor='mm')
    elif shot == 'fix':
        im.alpha_composite(g['series_bar']('FIX IT', 'agree', y0=240, level='easy')[0]); c, _ = g['card_one']('x', 'I am agree.', num='NOT', y0=700); im.alpha_composite(c)
        c, _ = g['card_one']('v', 'I agree.', num='SAY', y0=880); im.alpha_composite(c)
    else:
        c, _ = g['card_recap']("TEACHER'S TIP", ['make dinner', 'make coffee'], y0=700); im.alpha_composite(c)
        im.alpha_composite(g['ring_card']('Save this', 0.6, y0=1010)[0])
    return im.convert('RGB')
if __name__ == '__main__':
    for shot in ('wordcheck', 'fix', 'tip'):
        a, b = frame(False, shot), frame(True, shot); s = Image.new('RGB', (2200, 1920), (40, 40, 40)); s.paste(a, (0, 0)); s.paste(b, (1120, 0)); s.resize((1100, 960)).save(f'{OUT}/{shot}-before-after.png'); b.save(f'{OUT}/{shot}-new.png')
    print('ok')
