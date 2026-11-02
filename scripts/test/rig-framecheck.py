"""Hồi quy 3 cổng tờ khung hình (scripts/rig/framecheck.py) trên khung tổng hợp – chạy trong social-clips.yml (cần pillow, numpy, rapidocr).
Mỗi lỗi phải ĐỎ: chữ lạ ngoài chữ khuôn vẽ, giáo viên sai người (Carlos ở câu của Ama), chữ ngoài vùng an toàn; khung đúng phải XANH."""
import json, shutil, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]; sys.path.insert(0, str(ROOT / 'scripts/rig'))
import framecheck as fc
W, H, SAFE = 1080, 1920, [40, 220, 1040, 1540]
FONT = ImageFont.truetype(str(ROOT / 'brand/social/src/fonts/BeVietnamPro-Bold.ttf'), 72)
spec = {'id': 't', 'who': 'ama', 'segments': [{'text': 'Repeat after me. Good morning.'}], 'cta': 'Practice on Lexkite'}

def make(who='ama', words=(('Good morning', (120, 300)),), stray=None):
    im = Image.new('RGB', (W, H), (250, 247, 240)); b = fc.base(who); im.paste(b, ((W - b.width) // 2, 520), b)
    dr = ImageDraw.Draw(im); boxes = []
    for s, xy in words: dr.text(xy, s, font=FONT, fill=(20, 30, 60)); boxes.append([s, *dr.textbbox(xy, s, font=FONT)])
    if stray: dr.text(stray[1], stray[0], font=FONT, fill=(20, 30, 60))   # chữ KHÔNG khai báo (giống chữ lẫn trong ảnh/sót khung)
    return im, boxes

def run(name, want_fail, **kw):
    d = Path(tempfile.mkdtemp()); (d / 'fc').mkdir(); im, boxes = make(**kw); im.save(d / 'fc/00000.png')
    T = {'xy': [(W - fc.base('ama').width) // 2, 520], 'sc': 1, 'clip': [0, 0, W, 1270]}
    (d / 'frames-check.json').write_text(json.dumps({'W': W, 'H': H, 'safe': SAFE, 'frames': [{'i': 0, 't': 0, 'who': 'ama', 'seg': 0, 'boxes': boxes, 'teacher': T}]}))
    (d / 'qc.json').write_text(json.dumps({'gates': {'x': True}, 'score': 100}))
    rc = fc.main_dir(spec, d); g = json.loads((d / 'qc.json').read_text())['gates']; shutil.rmtree(d)
    bad = sorted(k for k, v in g.items() if not v)
    assert bad == want_fail, (name, bad, want_fail); assert (rc != 0) == bool(want_fail), (name, rc); print('✓', name, bad or 'xanh')

run('khung đúng', [])
run('chữ lạ ngoài khuôn', ['no_stray_text'], stray=('PROMO SALE', (120, 1000)))
run('Carlos ở câu của Ama', ['teacher_2d_match'], who='carlos')
run('chữ khuôn tràn vùng an toàn (đáy)', ['safe_zone_frames'], words=(('Good morning', (120, 300)), ('Practice on Lexkite', (200, 1600))))
assert fc.near('mornimg', {'morning'}) and not fc.near('promo', {'morning', 'good'}); print('✓ near: sai 1 nét OCR được chấp nhận, từ lạ thì không')
print('rig-framecheck: ok')
