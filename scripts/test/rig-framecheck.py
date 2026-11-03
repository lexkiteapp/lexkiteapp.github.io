"""Hồi quy 3 cổng tờ khung hình (scripts/rig/framecheck.py) trên khung tổng hợp – chạy trong social-clips.yml (cần pillow, numpy, rapidocr).
Mỗi lỗi phải ĐỎ: chữ lạ ngoài chữ khuôn vẽ, chữ lạ dán lên áo giáo viên, giáo viên sai người (Carlos ở câu của Ama), chữ ngoài vùng an toàn;
khung đúng và ảnh giáo viên trơn phải XANH (nét tóc/áo OCR đọc nhầm thành "7011"/"10111" có sẵn trên ảnh rig trơn → không tính là chữ)."""
import json, shutil, sys, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
ROOT = Path(__file__).resolve().parents[2]; sys.path.insert(0, str(ROOT / 'scripts/rig'))
import framecheck as fc
W, H, SAFE = 1080, 1920, [40, 220, 1040, 1540]
BG = (250, 247, 240); TXY = ((W - fc.base('ama').width) // 2, 520)
FONT = ImageFont.truetype(str(ROOT / 'brand/social/src/fonts/BeVietnamPro-Bold.ttf'), 72)
spec = {'id': 't', 'who': 'ama', 'segments': [{'text': 'Repeat after me. Good morning.'}], 'cta': 'Practice on Lexkite'}

def plain(who='ama'):
    """ảnh rig trơn như render.py frame(plain=True): chỉ giáo viên, cùng tư thế/vị trí, không chữ"""
    im = Image.new('RGB', (W, H), BG); b = fc.base(who); im.paste(b, TXY, b); return im

def make(who='ama', words=(('Good morning', (120, 300)),), stray=None):
    im = plain(who); dr = ImageDraw.Draw(im); boxes = []
    for s, xy in words: dr.text(xy, s, font=FONT, fill=(20, 30, 60)); boxes.append([s, *dr.textbbox(xy, s, font=FONT)])
    if stray: dr.text(stray[1], stray[0], font=FONT, fill=(20, 30, 60))   # chữ KHÔNG khai báo (giống chữ lẫn trong ảnh/sót khung)
    return im, boxes

def run(name, want_fail, who='ama', **kw):
    d = Path(tempfile.mkdtemp()); (d / 'fc').mkdir(); im, boxes = make(who=who, **kw); im.save(d / 'fc/00000.png'); plain(who).save(d / 'fc/00000-rig.png')
    T = {'xy': list(TXY), 'sc': 1, 'clip': [0, 0, W, 1270]}
    (d / 'frames-check.json').write_text(json.dumps({'W': W, 'H': H, 'safe': SAFE, 'frames': [{'i': 0, 't': 0, 'who': 'ama', 'seg': 0, 'boxes': boxes, 'teacher': T}]}))
    (d / 'qc.json').write_text(json.dumps({'gates': {'x': True}, 'score': 100}))
    rc = fc.main_dir(spec, d); g = json.loads((d / 'qc.json').read_text())['gates']; shutil.rmtree(d)
    bad = sorted(k for k, v in g.items() if not v)
    assert bad == want_fail, (name, bad, want_fail); assert (rc != 0) == bool(want_fail), (name, rc); print('✓', name, bad or 'xanh')

run('khung đúng', [])
run('ảnh giáo viên trơn (không chữ nào)', [], words=())
run('chữ lạ ngoài khuôn', ['no_stray_text'], stray=('PROMO SALE', (120, 1000)))
run('chữ lạ dán lên áo giáo viên', ['no_stray_text'], stray=('PROMO', (395, 1100)))
run('Carlos ở câu của Ama', ['teacher_2d_match'], who='carlos')
run('chữ khuôn tràn vùng an toàn (đáy)', ['safe_zone_frames'], words=(('Good morning', (120, 300)), ('Practice on Lexkite', (200, 1600))))

# nét vẽ đã biết: cần CẢ trùng chỗ hộp ảnh trơn LẪN điểm ảnh y hệt – chữ dán đúng chỗ một nét đã biết vẫn không được miễn
p = plain(); box = [420, 1100, 700, 1180]; pb = [(box, '7011', 0.9)]
assert fc.known_stroke(box, p, p, pb), 'nét có sẵn trên ảnh trơn, điểm ảnh y hệt → nét vẽ'
assert not fc.known_stroke([420, 600, 700, 680], p, p, pb), 'hộp không trùng chỗ hộp ảnh trơn → không miễn'
f = p.copy(); ImageDraw.Draw(f).text((420, 1100), 'PROMO', font=FONT, fill=(20, 30, 60))
assert not fc.known_stroke(box, f, p, pb), 'chữ dán đè đúng chỗ nét đã biết → điểm ảnh khác → không miễn'
assert not fc.known_stroke(box, p, None, []), 'thiếu ảnh trơn → không miễn'
print('✓ known_stroke: chỉ miễn nét có sẵn trên ảnh rig trơn, không miễn chữ dán đè/thiếu ảnh trơn')
assert fc.near('mornimg', {'morning'}) and not fc.near('promo', {'morning', 'good'}); print('✓ near: sai 1 nét OCR được chấp nhận, từ lạ thì không')
print('rig-framecheck: ok')
