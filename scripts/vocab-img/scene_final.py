#!/usr/bin/env python3
"""Tổng hợp lượt "mọi nghĩa": ảnh qua giám khảo cục bộ (lần 1 hoặc lần 2) + ô khái niệm SVG → WebP + AVIF ≤ 6 KB, NỀN TRONG SUỐT khi viền là nền kem
(chế độ tối không bao giờ hiện ô nền sáng – docs/LEXICON.md § Quy tắc tích hợp hình), result.json, tờ ảnh ghép có câu ví dụ dưới ảnh cảnh.
  python3 scripts/vocab-img/scene_final.py --dir out/x [--sheet out/x/abstract-pilot.jpg]
"""
import argparse, io, json, os, re, subprocess, glob
import numpy as np
from PIL import Image, ImageDraw, ImageFont
try: import pillow_avif  # noqa: F401 – Pillow < 11.2 cần plugin để lưu AVIF
except Exception: pass

SIZE, MAXB = 384, 6144
slug = lambda k: re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__'))

def keyed(im, tol=26):
    """nền kem → alpha 0 bằng loang từ viền (chỉ khi ≥ 85 % viền là nền đều) – giữ nền bên trong vật thể. Không cần scipy (ImageDraw.floodfill)."""
    from PIL import ImageDraw, ImageFilter
    rgb = im.convert('RGB'); a = np.asarray(rgb, np.int16)
    edge = np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]); bg = np.median(edge, 0)
    near = np.abs(a - bg).max(-1) <= tol
    if near[[0, -1], :].mean() < .85 or near[:, [0, -1]].mean() < .85: return im.convert('RGBA'), False
    m = Image.fromarray(np.where(near, 255, 0).astype(np.uint8))   # 255 = giống nền
    h, w = near.shape
    for x in range(0, w, 8):
        for y in (0, h - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    for y in range(0, h, 8):
        for x in (0, w - 1):
            if m.getpixel((x, y)) == 255: ImageDraw.floodfill(m, (x, y), 128)
    alpha = Image.fromarray(np.where(np.asarray(m) == 128, 0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))
    out = rgb.convert('RGBA'); out.putalpha(alpha); return out, True

def enc(im, fmt, qs):
    for q in qs:
        b = io.BytesIO()
        if fmt == 'WEBP': im.save(b, 'WEBP', quality=q, method=6, alpha_quality=70)
        else: im.save(b, 'AVIF', quality=q, speed=4)
        if b.tell() <= MAXB: return b.getvalue(), q
    return None, q

def encode(im, dst):
    for side in (384, 320, 288):   # hộp hiển thị ≤ 160 CSS px (/words/ 256 dùng @2x khi có) – thu nhỏ trước khi hạ chất lượng quá thấp
        s = im.resize((side, side), Image.LANCZOS)
        w, qw = enc(s, 'WEBP', (70, 60, 50, 42, 35));
        try: av, qa = enc(s, 'AVIF', (60, 50, 40, 32, 25))
        except Exception: av = None
        if w and av:
            open(dst + '.webp', 'wb').write(w); open(dst + '.avif', 'wb').write(av)
            return {'side': side, 'webp': len(w), 'avif': len(av), 'q': qw}
    return None

def h16(path):
    import hashlib; return hashlib.sha256(open(path, 'rb').read()).hexdigest()[:16]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--dir', required=True); ap.add_argument('--sheet'); ap.add_argument('--sheet-max', type=int, default=0); a = ap.parse_args()
    D = a.dir; T = json.load(open(os.path.join(D, 'targets.json'))); os.makedirs(os.path.join(D, 'final'), exist_ok=True)
    # biến thể 1..6 (fill: nhận lần ĐẦU qua giám khảo; pilot: 1–2)
    J = [json.load(open(f)) if os.path.exists(f) else {} for f in (os.path.join(D, f'judge.local.a{i}.json') for i in range(1, 7))]
    res, stats = {}, {'n': len(T), 'passed': 0, 'scene': 0, 'scene_pass': 0, 'concept': 0, 'lesson': 0, 'lesson_pass': 0, 'object': 0, 'alpha': 0, 'bytes': []}
    for k, t in T.items():
        kd = t['kind']; r = {'kind': kd, 'pass': False}
        if kd == 'concept' or t.get('fallback') == 'type':
            svg = os.path.join(D, 'svg', slug(k) + '.svg'); png = svg[:-4] + '.png'
            if not os.path.exists(png): subprocess.run(['rsvg-convert', '-w', '768', '-h', '768', svg, '-o', png], check=True)
            im = Image.open(png).convert('RGBA'); r.update(kind='concept' if kd == 'concept' else 'type', src='concept', fam=t.get('fam', 'type'), judge='rule', alpha=True); stats['concept'] += 1
            im_used = im
        else:
            tried = [i + 1 for i in range(6) if k in J[i]]; ok_ = [i for i in tried if J[i - 1][k].get('pass')]
            att = ok_[0] if ok_ else (tried[-1] if tried else 1); r['tries'] = len(tried)
            j = (J[att - 1].get(k) or J[0].get(k) or {}); r.update(att=att, reasons=j.get('reasons', ['not generated']), cap=(j.get('f') or {}).get('cap', ''), f={x: y for x, y in (j.get('f') or {}).items() if x != 'cap'})
            stats[kd] = stats.get(kd, 0) + 1
            raw = os.path.join(D, 'raw', f'{slug(k)}.a{att}.jpg')
            if not os.path.exists(raw): res[k] = r; continue
            im_used = Image.open(raw).convert('RGB')
            if not j.get('pass'): r['raw'] = raw; res[k] = r; continue
            im_used, al = keyed(im_used); r['alpha'] = al; stats['alpha'] += al
        tmp = os.path.join(D, 'final', slug(k)); e = encode(im_used.convert('RGBA'), tmp)
        if not e: r['reasons'] = ['size > 6 KB']; res[k] = r; continue
        hh = h16(tmp + '.webp'); os.replace(tmp + '.webp', os.path.join(D, 'final', hh + '.webp')); os.replace(tmp + '.avif', os.path.join(D, 'final', hh + '.avif'))
        r.update(h=hh, **e); r['pass'] = True; stats['passed'] += 1; stats['bytes'].append(e['webp'] + e['avif'])
        if kd == 'scene': stats['scene_pass'] += 1
        if kd in ('lesson', 'cover'): stats['lesson_pass'] += 1
        res[k] = r
    b = stats.pop('bytes'); stats['avg_pair_bytes'] = int(np.mean(b)) if b else 0; stats['max_pair_bytes'] = max(b) if b else 0
    sp = {}
    for f in glob.glob(os.path.join(D, 'speed.*.json')): sp[os.path.basename(f)[6:-5]] = json.load(open(f))
    stats['speed'] = sp
    json.dump({'stats': stats, 'items': res}, open(os.path.join(D, 'result.json'), 'w'), indent=1)
    print(json.dumps(stats))
    if a.sheet:
        T2 = T
        if a.sheet_max:   # fill: tờ ảnh chỉ ảnh NHẬN, mẫu tất định
            import hashlib; ks = sorted([k for k in T if res.get(k, {}).get('pass') and T[k]['kind'] != 'concept'], key=lambda k: hashlib.sha1(k.encode()).hexdigest())[:a.sheet_max]; T2 = {k: T[k] for k in ks}
        sheet(D, T2, res, a.sheet)

def sheet(D, T, res, out):
    """tờ ảnh: mỗi ô = ảnh (cảnh/khái niệm/bìa) + từ + câu ví dụ dưới ảnh (như thẻ học) + dấu ĐẠT/TRƯỢT"""
    W, H, C = 240, 330, 8; keys = list(T.keys()); rows = (len(keys) + C - 1) // C
    if not keys: print('tờ ảnh: 0 ảnh – không ghi', out); return   # 31/10 pilot 41146130096: kho CF cạn → 0 thẻ/0 ảnh, Image 0 px → ValueError đỏ cả lượt
    im = Image.new('RGB', (C * W, rows * H), '#ffffff'); dr = ImageDraw.Draw(im)
    try: f = ImageFont.truetype('DejaVuSans.ttf', 12); fb = ImageFont.truetype('DejaVuSans-Bold.ttf', 14)
    except Exception:
        try: f = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 12); fb = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial Bold.ttf', 14)
        except Exception: f = fb = ImageFont.load_default()
    for i, k in enumerate(keys):
        x, y = (i % C) * W, (i // C) * H; r = res.get(k, {}); t = T[k]
        p = os.path.join(D, 'final', r['h'] + '.webp') if r.get('h') else r.get('raw')
        if p and os.path.exists(p):
            th = Image.open(p).convert('RGBA').resize((W - 16, W - 16)); bg = Image.new('RGB', th.size, '#e9eef0'); bg.paste(th, (0, 0), th); im.paste(bg, (x + 8, y + 6))
        col = '#1a7f3c' if r.get('pass') else '#c0392b'
        dr.rectangle([x + 6, y + 4, x + W - 7, y + W - 8], outline=col, width=3)
        dr.text((x + 8, y + W - 4), f"{k}  [{t['kind']}]"[:34], fill='#000', font=fb)
        txt = t.get('ex') or t.get('target') or ''
        if not r.get('pass'): txt = 'TRƯỢT: ' + '; '.join(r.get('reasons') or [])[:120]
        words, line, ly = txt.split(), '', y + W + 14
        for w_ in words:
            if dr.textlength(line + ' ' + w_, font=f) > W - 12: dr.text((x + 8, ly), line, fill='#333', font=f); ly += 14; line = w_
            else: line = (line + ' ' + w_).strip()
            if ly > y + H - 16: break
        if line and ly <= y + H - 16: dr.text((x + 8, ly), line, fill='#333', font=f)
    im.save(out, quality=82); print('tờ ảnh', out, im.size)

if __name__ == '__main__':
    main()
