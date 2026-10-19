#!/usr/bin/env python3
"""Ghép video chế độ cine (docs/VIDEO-PIPELINE.md §13) – tổng quát hoá từ pilot latte (brand/library/cine/assemble-latte.py).
Không cần libass: chữ (phụ đề, hook, thẻ ✗/✓, mẹo) vẽ bằng PIL thành PNG trong suốt rồi overlay bằng ffmpeg.

  python assemble.py endcard <spec.json>   → PNG màn kết DỰNG RIÊNG (Kit + wordmark + CTA), không bao giờ cắt từ video khác
  python assemble.py layout <spec.json>    → chỉ vẽ lớp chữ + chọn vị trí tránh mặt → in JSON events (có box) – cổng bố cục đọc lại
  python assemble.py render <spec.json>    → layout + ffmpeg ghép (shot đã Lip Sync + màn kết + lớp chữ + tiếng nền −22 dB HPF 150 Hz + loudnorm −16 LUFS)

spec: {out, workdir, W, H, fps, fonts{body,head}, segments[{id,file,in,dur,voiced,kind,image?}], events[{style,t0,t1,text,sym?,shot,faces[[x0,y0,x1,y1]]}],
       ambience{files[],gainDb,highpass,lowpass}, loudnorm{I,TP,LRA}, endcard{kit,cta,brand,out}}
In 1 dòng JSON kết quả.
"""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

INK = (20, 24, 32, 255)
TEAL, TEAL2, CORAL, AMBER, CREAM = (15, 61, 62), (23, 89, 90), (229, 80, 47), (255, 176, 84), (255, 247, 234)


def font(spec, k, size):
    return ImageFont.truetype(spec['fonts'][k], size)


def wrap(dr, txt, fnt, maxw):
    lines = []
    for para in str(txt).replace('\\N', '\n').split('\n'):
        cur = ''
        for w in para.split(' '):
            nx = (cur + ' ' + w).strip()
            if dr.textlength(nx, font=fnt) <= maxw or not cur:
                cur = nx
            else:
                lines.append(cur); cur = w
        lines.append(cur)
    return lines


def inter(a, b):
    return max(0, min(a[2], b[2]) - max(a[0], b[0])) * max(0, min(a[3], b[3]) - max(a[1], b[1]))


def bbox_alpha(im):
    b = im.getchannel('A').getbbox()
    return list(b) if b else [0, 0, 0, 0]


def draw_event(spec, e, y):
    W, H = spec['W'], spec['H']
    im = Image.new('RGBA', (W, H), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    st = e['style']
    if st == 'Sub':  # 1 đường đáy cố định (1/3 dưới, trên vùng UI 420 px), ≤ 2 dòng
        f = font(spec, 'body', 64); ls = wrap(dr, e['text'], f, 900); yy = y - 84 * len(ls)
        for l in ls:
            w = dr.textlength(l, font=f); dr.text(((W - w) / 2, yy), l, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=INK); yy += 84
    elif st == 'Hook':
        f = font(spec, 'head', 96); ls = wrap(dr, e['text'], f, 920); yy = y
        for l in ls:
            w = dr.textlength(l, font=f); dr.text(((W - w) / 2, yy), l, font=f, fill=(255, 255, 255, 255), stroke_width=9, stroke_fill=INK); yy += 112
    else:  # Card ✗/✓ (kem) · Tip (xanh nhạt): thẻ bo góc, chữ mực
        sym = e.get('sym') or ''
        f = font(spec, 'body', 54); ls = wrap(dr, e['text'], f, 760 if sym else 820); h = 66 * len(ls) + 64
        x0 = 110
        dr.rounded_rectangle([x0, y, W - 110, y + h], radius=34, fill=(255, 250, 240, 250) if st == 'Card' else (225, 245, 232, 250), outline=(42, 43, 51, 255), width=5)
        tx = x0 + 44
        if sym:
            col = (229, 63, 63, 255) if sym == '✗' else (47, 191, 113, 255); cx, cy, r = tx + 30, y + h / 2, 30
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
            if sym == '✗':
                dr.line([cx - 12, cy - 12, cx + 12, cy + 12], fill=(255, 255, 255, 255), width=8); dr.line([cx - 12, cy + 12, cx + 12, cy - 12], fill=(255, 255, 255, 255), width=8)
            else:
                dr.line([cx - 14, cy + 1, cx - 4, cy + 12, cx + 15, cy - 11], fill=(255, 255, 255, 255), width=8, joint='curve')
            tx += 82
        yy = y + 32
        for l in ls:
            dr.text((tx, yy), l, font=f, fill=(42, 43, 51, 255)); yy += 66
    return im


CANDS = {'Sub': [1490], 'Hook': [1300, 300, 980], 'Card': [330, 170, 1060], 'Tip': [170, 330, 1060]}


def layout(spec):
    """Vẽ từng lớp chữ ở vị trí ứng viên đầu tiên KHÔNG đè mặt của shot đó (> 2 % diện tích mặt); hết ứng viên → giữ vị trí ít đè nhất + cờ overlap."""
    wd = spec['workdir']; os.makedirs(wd, exist_ok=True)
    out = []
    for k, e in enumerate(spec['events']):
        best = None
        for y in e.get('candidates') or CANDS.get(e['style'], [330]):
            im = draw_event(spec, e, y); box = bbox_alpha(im)
            ov = max([inter(box, f) / max(1, (f[2] - f[0]) * (f[3] - f[1])) for f in e.get('faces') or []] or [0])
            if best is None or ov < best[2] - 1e-6:
                best = (im, box, ov, y)
            if ov <= 0.02:
                break
        im, box, ov, y = best
        p = os.path.join(wd, f'ov{k:02d}.png'); im.save(p)
        out.append({**{x: e[x] for x in e if x != 'faces'}, 'png': p, 'box': box, 'y': y, 'faceOverlap': round(ov, 4)})
    return out


def endcard(spec):
    """Màn kết riêng: nền teal thương hiệu, Kit (PNG từ web/js/kit.js), wordmark lex|kite, CTA. Không lấy khung từ video nào."""
    W, H = spec['W'], spec['H']; ec = spec['endcard']
    im = Image.new('RGB', (W, H), TEAL); dr = ImageDraw.Draw(im)
    for i in range(H):  # gradient dọc teal → teal phụ
        t = i / H; dr.line([(0, i), (W, i)], fill=tuple(int(TEAL[c] * (1 - t) + TEAL2[c] * t) for c in range(3)))
    if ec.get('kit') and os.path.exists(ec['kit']):
        k = Image.open(ec['kit']).convert('RGBA'); k = k.resize((520, round(520 * k.height / k.width)), Image.LANCZOS)
        im.paste(k, ((W - k.width) // 2, 560), k)
    fh = font(spec, 'head', 132); lex, kite = 'lex', 'kite'
    wl, wk = dr.textlength(lex, font=fh), dr.textlength(kite, font=fh); x = (W - wl - wk) / 2; y = 1160
    dr.text((x, y), lex, font=fh, fill=CREAM); dr.text((x + wl, y), kite, font=fh, fill=AMBER)
    fb = font(spec, 'body', 58); cta = ec.get('cta') or 'lexkite.com'
    for i, l in enumerate(wrap(dr, cta, fb, 900)):
        w = dr.textlength(l, font=fb); dr.text(((W - w) / 2, 1360 + i * 76), l, font=fb, fill=CREAM)
    pill = 'lexkite.com'; fp = font(spec, 'body', 54); wp = dr.textlength(pill, font=fp)
    dr.rounded_rectangle([(W - wp) / 2 - 44, 1560, (W + wp) / 2 + 44, 1660], radius=50, fill=CORAL)
    dr.text(((W - wp) / 2, 1578), pill, font=fp, fill=(255, 255, 255))
    os.makedirs(os.path.dirname(ec['out']), exist_ok=True); im.save(ec['out'])
    return {'endcard': ec['out']}


def render(spec):
    evs = layout(spec)
    W, H, FPS = spec['W'], spec['H'], spec.get('fps', 30)
    inp, fc, cat = [], [], ''
    segs = spec['segments']
    for i, s in enumerate(segs):
        if s.get('image'):
            n = round(s['dur'] * FPS)
            inp += ['-loop', '1', '-t', f"{s['dur']:.3f}", '-i', s['file']]
            fc.append(f"[{i}:v]scale={W}:{H},zoompan=z='min(zoom+0.0006,1.05)':d={n}:s={W}x{H}:fps={FPS},fade=t=in:st=0:d=0.25,setsar=1,format=yuv420p,trim=duration={s['dur']:.3f}[v{i}]")
        else:
            inp += ['-ss', f"{s.get('in', 0):.3f}", '-t', f"{s['dur']:.3f}", '-i', s['file']]
            fc.append(f'[{i}:v]scale={W}:{H}:force_original_aspect_ratio=increase,crop={W}:{H},fps={FPS},setsar=1,format=yuv420p[v{i}]')
        fc.append(f"[{i}:a]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:{s['dur']:.3f}[a{i}]" if s.get('voiced') else f"anullsrc=r=48000:cl=stereo,atrim=0:{s['dur']:.3f}[a{i}]")
        cat += f'[v{i}][a{i}]'
    fc.append(f'{cat}concat=n={len(segs)}:v=1:a=1[vall][ao0]')
    cur = 'vall'
    for k, e in enumerate(evs):
        L = e['t1'] - e['t0']; fd = 0.13 if e['style'] == 'Sub' else 0.22
        inp += ['-loop', '1', '-t', f'{L:.3f}', '-i', e['png']]
        j = len(segs) + k
        fin = '' if e['t0'] <= 0.001 else f'fade=t=in:st=0:d={fd}:alpha=1,'  # hook từ khung 0: không mờ vào
        fc.append(f"[{j}:v]format=rgba,{fin}fade=t=out:st={max(0, L - fd):.3f}:d={fd}:alpha=1,setpts=PTS+{e['t0']:.3f}/TB[o{k}]")
        fc.append(f'[{cur}][o{k}]overlay=0:0:eof_action=pass[x{k}]'); cur = f'x{k}'
    fc.append(f'[{cur}]null[vo]')
    tot = sum(s['dur'] for s in segs)
    amb = spec.get('ambience') or {}
    files = [f for f in amb.get('files') or [] if os.path.exists(f)]
    if files:
        k0 = sum(1 for x in inp if x == '-i')
        for f in files:
            inp += ['-stream_loop', '-1', '-i', f]
        mix = ''.join(f'[{k0 + i}:a]' for i in range(len(files)))
        fc.append(f"{mix}{'amix=inputs=%d:normalize=0,' % len(files) if len(files) > 1 else ''}highpass=f={amb.get('highpass', 150)},lowpass=f={amb.get('lowpass', 9000)},volume={amb.get('gainDb', -22)}dB,atrim=0:{tot:.3f},aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st={max(0, tot - 1.2):.3f}:d=1.2[amb]")
        fc.append('[ao0][amb]amix=inputs=2:normalize=0:duration=first[am]')
    else:
        fc.append('[ao0]anull[am]')
    ln = spec.get('loudnorm') or {'I': -16, 'TP': -1.5, 'LRA': 9}
    fc.append(f"[am]loudnorm=I={ln['I']}:TP={ln['TP']}:LRA={ln['LRA']}[ao]")
    out = spec['out']; os.makedirs(os.path.dirname(out), exist_ok=True)
    cmd = ['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-preset', spec.get('preset', 'medium'), '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-t', f'{tot:.3f}', out]
    subprocess.run(cmd, check=True)
    return {'out': out, 'duration': round(tot, 3), 'events': evs}


def main(a):
    if len(a) < 2:
        print(__doc__); return 2
    spec = json.load(open(a[1], encoding='utf8'))
    res = endcard(spec) if a[0] == 'endcard' else {'events': layout(spec)} if a[0] == 'layout' else render(spec) if a[0] == 'render' else None
    if res is None:
        print(__doc__); return 2
    print(json.dumps(res, ensure_ascii=False, separators=(',', ':')))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
