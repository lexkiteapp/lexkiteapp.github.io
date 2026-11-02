"""Tờ khung hình + 3 cổng máy trên TỪNG khung lấy mẫu (~1 khung/s + khung cuối) của clip rig 2D – chạy sau render.py trong social-clips.yml.
Vào: <out>/frames-check.json + <out>/fc/*.png (render.py ghi: chữ đã vẽ + vùng giáo viên của khung đó), spec. Ra: <out>/frames.jpg (tờ khung hình,
viền đỏ = chỗ trượt), cổng thêm vào qc.json (điểm tính lại → store.mjs không xuất clip trượt) + report.md.
  no_stray_text      OCR (RapidOCR, Apache-2.0) mọi vùng chữ thấy được phải nằm trong chữ do khuôn vẽ (không chữ lẫn trong ảnh giáo viên/nền,
                     không chữ sót), và từ Latin OCR đọc chắc phải có trong văn bản spec/IPA/UI (bắt chữ chồng nhau, chữ cũ không xoá).
  teacher_2d_match   người trong khung = người nói của câu trong spec (segments[].who | who), là giáo viên 2D của web/teach/characters.json,
                     và điểm ảnh vùng giáo viên giống ảnh rig của người đó hơn hẳn người kia (bắt lẫn Ama ↔ Carlos, lẫn ảnh/kiểu khác).
  safe_zone_frames   mọi khung chữ đã vẽ + mọi chữ OCR thấy của từng khung nằm trong vùng an toàn 9:16 (không chỉ hộp gộp BOXES).
Dùng: python3 scripts/rig/framecheck.py <spec.json> <out>   (test: scripts/test/rig-framecheck.mjs)"""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
PEOPLE = json.loads((ROOT / 'web/teach/characters.json').read_text())['people']
PAD, OCR_MIN, WORD_CONF = 16, 0.5, 0.9

def norm_words(s): return re.findall(r"[a-z]+", s.lower())

def allowed_vocab(spec, nqa):
    acc = []
    def walk(x):
        if isinstance(x, str): acc.append(x)
        elif isinstance(x, dict): [walk(v) for k, v in x.items() if k not in ('_doc', '_note')]
        elif isinstance(x, list): [walk(v) for v in x]
    walk(spec); walk(nqa); return {w for s in acc for w in norm_words(s)} | {'lexkite', 'ama', 'carlos'}

def near(w, vocab):
    if w in vocab: return True
    k = max(1, len(w) // 4)
    for v in vocab:
        if abs(len(v) - len(w)) > k: continue
        d = list(range(len(v) + 1))   # Levenshtein ≤ k (OCR đọc sai 1 nét trên phông đậm)
        for i, a in enumerate(w, 1):
            p, d[0] = d[0], i
            for j, b in enumerate(v, 1): p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (a != b))
        if d[-1] <= k: return True
    return False

def inter(a, b): return max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))

def covered(box, drawn):
    """phần diện tích hộp OCR nằm trong hợp các hộp chữ đã vẽ (nới PAD) – lưới 4 px"""
    x0, y0, x1, y1 = map(int, box); m = np.zeros((max(1, (y1 - y0) // 4), max(1, (x1 - x0) // 4)), bool)
    for b in drawn:
        bx0, by0, bx1, by1 = (b[0] - PAD - x0) // 4, (b[1] - PAD - y0) // 4, -(-(b[2] + PAD - x0) // 4), -(-(b[3] + PAD - y0) // 4)
        m[max(0, int(by0)):max(0, int(by1)), max(0, int(bx0)):max(0, int(bx1))] = True
    return m.mean()

def in_safe(b, s, tol=0): return b[0] >= s[0] - tol and b[1] >= s[1] - tol and b[2] <= s[2] + tol and b[3] <= s[3] + tol

BASE = {}
def base(who):
    if who not in BASE: BASE[who] = Image.open(ROOT / f'web/teach/{who}/head-bare-2x.webp').convert('RGBA')
    return BASE[who]

def teacher_diff(im, T, who, drawn):
    """sai khác trung bình (0–255) giữa vùng giáo viên của khung và ảnh rig `who` đặt đúng vị trí/tỉ lệ; bỏ chữ + khung phóng miệng"""
    b = base(who); sc = T['sc']; bw, bh = round(b.width * sc), round(b.height * sc); x, y = T['xy']
    ref = np.asarray(b.resize((bw, bh), Image.LANCZOS) if sc != 1 else b, dtype=np.float32)
    cx0, cy0, cx1, cy1 = max(x, T['clip'][0]), max(y, T['clip'][1]), min(x + bw, T['clip'][2]), min(y + bh, T['clip'][3])
    fr = np.asarray(im.convert('RGB').crop((cx0, cy0, cx1, cy1)), dtype=np.float32); rf = ref[cy0 - y:cy1 - y, cx0 - x:cx1 - x]
    m = rf[..., 3] > 240
    for bx in drawn + ([T['excl']] if T.get('excl') else []):
        m[max(0, int(bx[1]) - PAD - cy0):max(0, int(bx[3]) + PAD - cy0), max(0, int(bx[0]) - PAD - cx0):max(0, int(bx[2]) + PAD - cx0)] = False
    sel = m.nonzero()   # cả đầu + áo: miệng/mắt động chỉ là phần nhỏ, nghiêng/thở lệch vài px → biên 8 + trần 40
    if len(sel[0]) < 500: return None
    return float(np.abs(fr[sel] - rf[..., :3][sel]).mean())

def main(spec_p, out): return main_dir(json.loads(Path(spec_p).read_text()), Path(out))

def main_dir(spec, out):
    fc = out / 'frames-check.json'
    if not fc.exists(): print('framecheck: không có frames-check.json (render.py dừng sớm)'); return 1
    C = json.loads(fc.read_text()); safe = C['safe']; nqa = json.loads((out / 'native-qa.json').read_text()) if (out / 'native-qa.json').exists() else {}
    vocab = allowed_vocab(spec, nqa); segs = spec['segments']
    from rapidocr_onnxruntime import RapidOCR
    ocr = RapidOCR()
    rows, bad = [], {'no_stray_text': [], 'teacher_2d_match': [], 'safe_zone_frames': []}
    for F in C['frames']:
        im = Image.open(out / 'fc' / f"{F['i']:05d}.png"); drawn = [b[1:] for b in F['boxes']]; marks = []
        res, _ = ocr(np.asarray(im.convert('RGB')))
        for quad, text, conf in res or []:
            if float(conf) < OCR_MIN: continue
            xs, ys = [p[0] for p in quad], [p[1] for p in quad]; ob = [min(xs), min(ys), max(xs), max(ys)]
            if covered(ob, drawn) < 0.6: bad['no_stray_text'].append((F['t'], text)); marks.append(ob)
            elif float(conf) >= WORD_CONF and re.fullmatch(r"[A-Za-z ,.!?'’-]+", text):
                odd = [w for w in norm_words(text) if len(w) >= 4 and not near(w, vocab)]
                if odd: bad['no_stray_text'].append((F['t'], ' '.join(odd))); marks.append(ob)
            if not in_safe(ob, safe, 6): bad['safe_zone_frames'].append((F['t'], 'ocr:' + text)); marks.append(ob)
        for s, *b in F['boxes']:
            if not in_safe(b, safe): bad['safe_zone_frames'].append((F['t'], s)); marks.append(b)
        want = segs[F['seg']].get('who', spec['who']) if F['seg'] < len(segs) else spec['who']
        diffs = {w: teacher_diff(im, F['teacher'], w, drawn) for w in PEOPLE} if F.get('teacher') else {}
        ok = F['who'] == want and F['who'] in PEOPLE and diffs.get(want) is not None and all(d is None or diffs[want] + 8 < d for w, d in diffs.items() if w != want) and diffs[want] < 40
        if not ok: bad['teacher_2d_match'].append((F['t'], f"khung={F['who']} spec={want} diff={ {w: d and round(d, 1) for w, d in diffs.items()} }")); marks.append(F['teacher'].get('clip', [0, 0, 0, 0]) if F.get('teacher') else [0, 0, C['W'], C['H']])
        rows.append((im, marks, F['t'], ok and not marks, {w: d and round(d, 1) for w, d in diffs.items()}))
    # tờ khung hình: 6 cột, 270×480, viền đỏ chỗ trượt, nhãn thời điểm
    cols, tw, th = 6, 270, 480; sheet = Image.new('RGB', (cols * tw, -(-len(rows) // cols) * (th + 28)), (255, 255, 255)); dr = ImageDraw.Draw(sheet)
    try: lab = ImageFont.truetype(str(ROOT / 'brand/social/src/fonts/BeVietnamPro-Bold.ttf'), 18)
    except OSError: lab = ImageFont.load_default()
    for k, (im, marks, t, ok, _) in enumerate(rows):
        x, y = (k % cols) * tw, (k // cols) * (th + 28); th_im = im.convert('RGB').resize((tw, th), Image.LANCZOS); d2 = ImageDraw.Draw(th_im); f = tw / C['W']
        d2.rectangle([safe[0] * f, safe[1] * f, safe[2] * f, safe[3] * f], outline=(40, 160, 220), width=1)
        for b in marks: d2.rectangle([b[0] * f, b[1] * f, b[2] * f, b[3] * f], outline=(230, 30, 30), width=3)
        sheet.paste(th_im, (x, y)); dr.text((x + 6, y + th + 4), f"{t:.1f}s {'✓' if ok else '✗'}", font=lab, fill=(20, 120, 60) if ok else (200, 20, 20))
    sheet.save(out / 'frames.jpg', quality=85)
    g = {k: not v for k, v in bad.items()}
    qp = out / 'qc.json'
    if qp.exists():
        qc = json.loads(qp.read_text()); qc['gates'].update(g); qc['score'] = round(100 * sum(qc['gates'].values()) / len(qc['gates']))
        qc['framecheck'] = {'frames': len(rows), **{k: v[:12] for k, v in bad.items()}}; qp.write_text(json.dumps(qc, indent=1))
    rep = ['', f"### Tờ khung hình ({len(rows)} khung, frames.jpg)", '', '| cổng | ok | chi tiết |', '|---|---|---|'] + [f"| {k} | {'✅' if not v else '❌'} | {'; '.join(f'{t}s {x}' for t, x in v[:4]).replace('|', '/')} |" for k, v in bad.items()]
    with open(out / 'report.md', 'a') as fh: fh.write('\n'.join(rep) + '\n')
    print('\n'.join(rep))
    return 0 if all(g.values()) else 1

if __name__ == '__main__':
    sp = sys.argv[1]; sys.exit(main(sp, Path(sys.argv[2]) / json.loads(Path(sp).read_text())['id']))   # cùng thư mục ra với render.py
