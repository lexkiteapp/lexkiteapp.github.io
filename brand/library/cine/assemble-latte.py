# Pilot "điện ảnh": ghép shot Kling (đã Lip Sync) + phụ đề ASS chuẩn (≤ 2 dòng, fade 130 ms) + thẻ ✗/✓ + mẹo + màn kết.
import subprocess, os, json, sys
D = os.path.dirname(os.path.abspath(__file__))
ROOT = '/Users/mrquyenbk/Documents/addon dictionary'
FONT_DIR = os.path.join(D, 'fonts')
def dur(f): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).decode())
def speech(f):  # (đầu, cuối) giọng: bỏ im lặng đầu; cuối = đầu đoạn im lặng kéo tới hết file (khoảng ngắt giữa câu không tính)
    out = subprocess.run(['ffmpeg', '-i', f, '-af', 'silencedetect=n=-35dB:d=0.25', '-f', 'null', '-'], capture_output=True, text=True).stderr
    st = [float(l.split('silence_start: ')[1]) for l in out.splitlines() if 'silence_start' in l]
    en = [float(l.split('silence_end: ')[1].split(' ')[0]) for l in out.splitlines() if 'silence_end' in l]
    d = dur(f); a = en[0] if st and st[0] < 0.05 and en else 0.0
    b = d
    for i, s in enumerate(st):
        e = en[i] if i < len(en) else d
        if s > a + 0.3 and e - s >= 0.55: b = s; break
    return a, b
# (file, cắt tới, có giọng, phụ đề [(chữ)], lớp phủ)
S = [
    ('v1.mp4', 2.0, False, [], {'hook': 'Is “give me” rude?'}),
    ('v2l.mp4', None, True, ['Hey. Give me a latte.', 'A large one.'], {'card': ('✗', 'Too direct', '&H003F3FE5')}),
    ('v3l.mp4', None, True, ['That sounds a bit bossy.', 'Try: could I get a latte, please?'], {}),
    ('v4l.mp4', None, True, ['Oh! Sorry.', 'Could I get a latte, please?'], {'card': ('✓', 'Could I get…, please?', '&H0071BF2F')}),
    ('v5l.mp4', None, True, ['Here you go.', 'One latte, nice and warm.'], {'tip': 'Kit’s tip: add “please”.\\NIt makes any request softer.'}),
]
segs, t, ev = [], 0.0, []
TIP = None
ass_t = lambda x: f'{int(x // 3600)}:{int(x % 3600 // 60):02d}:{x % 60:05.2f}'
for f, cut, voiced, subs, ov in S:
    p = os.path.join(D, f); d = dur(p)
    a, b = speech(p) if voiced else (0, 0)
    L = min(d, max(b + 0.2, min(b + 0.45, cut or 99))) if voiced else (cut or d)
    if voiced and 'card' in ov and ov['card'][0] == '✗': L = min(d, b + 1.4)
    if voiced and 'tip' in ov: L = min(d, b + 2.6)  # mẹo hiện SAU câu thoại, đủ đọc ~2,4 s  # giữ shot cho thẻ ✗ đọc được (≥ 1,2 s)
    segs.append((p, L, voiced))
    sub_ev = []
    if subs:  # chia thời gian giọng theo số ký tự từng trang, kẹp trong shot
        n = sum(len(s) for s in subs); x = t + max(0.05, a - 0.08)
        span = (b - a) + 0.16
        for s in subs:
            k = span * len(s) / n
            sub_ev.append(('Sub', x, min(t + L - 0.05, x + k + 0.25), s)); x += k
        ev.extend(sub_ev)
    if 'hook' in ov: ev.append(('Hook', t + 0.0, t + L - 0.05, ov['hook']))
    if 'card' in ov:
        sym, txt, col = ov['card']; c0 = (t + b - 0.2) if sym == '✗' else (sub_ev[-1][1] if sub_ev else t + 0.35)
        ev.append(('Card', c0, t + L - 0.05, sym + '|' + txt))
    if 'tip' in ov: TIP = ov['tip']
    t += L
end = os.path.join(ROOT, 'out/calm-latte.mp4'); ed = dur(end)
if TIP: ev.append(('Tip', t + 0.25, t + 2.95, TIP))
from PIL import Image, ImageDraw, ImageFont
FB = os.path.join(FONT_DIR, 'BeVietnamPro-ExtraBold.ttf'); FH = os.path.join(FONT_DIR, 'BricolageGrotesque-ExtraBold.ttf')
def wrap(dr, txt, fnt, maxw):
    lines = []
    for para in txt.split('\\N'):
        cur = ''
        for w in para.split(' '):
            nx = (cur + ' ' + w).strip()
            if dr.textlength(nx, font=fnt) <= maxw: cur = nx
            else: lines.append(cur); cur = w
        lines.append(cur)
    return lines
def png(style, txt, k):
    im = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    if style == 'Sub':
        f = ImageFont.truetype(FB, 64); ls = wrap(dr, txt, f, 900); y = 1920 - 430 - 84 * len(ls)
        for l in ls:
            w = dr.textlength(l, font=f); dr.text(((1080 - w) / 2, y), l, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(20, 24, 32, 255)); y += 84
    elif style == 'Hook':
        f = ImageFont.truetype(FH, 96); ls = wrap(dr, txt, f, 920); y = 1300
        for l in ls:
            w = dr.textlength(l, font=f); dr.text(((1080 - w) / 2, y), l, font=f, fill=(255, 255, 255, 255), stroke_width=9, stroke_fill=(20, 24, 32, 255)); y += 112
    else:  # Card / Tip: thẻ bo góc kem / xanh, chữ mực
        sym, body = (txt.split('|', 1) + [''])[:2] if '|' in txt else ('', txt)
        f = ImageFont.truetype(FB, 54); ls = wrap(dr, body, f, 760); h = 66 * len(ls) + 64
        bg = (234, 247, 255, 245) if style == 'Card' else (201, 230, 183, 245)
        x0, y0 = 110, (170 if style == 'Tip' else 330); dr.rounded_rectangle([x0, y0, 970, y0 + h], radius=34, fill=(255, 250, 240, 250) if style == 'Card' else (225, 245, 232, 250), outline=(42, 43, 51, 255), width=5)
        tx = x0 + 44
        if sym:
            col = (229, 63, 63, 255) if sym == '✗' else (47, 191, 113, 255); cx, cy, r = tx + 30, y0 + h / 2, 30
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
            if sym == '✗': dr.line([cx - 12, cy - 12, cx + 12, cy + 12], fill=(255, 255, 255, 255), width=8); dr.line([cx - 12, cy + 12, cx + 12, cy - 12], fill=(255, 255, 255, 255), width=8)
            else: dr.line([cx - 14, cy + 1, cx - 4, cy + 12, cx + 15, cy - 11], fill=(255, 255, 255, 255), width=8, joint='curve')
            tx += 82
        y = y0 + 32
        for l in ls: dr.text((tx, y), l, font=f, fill=(42, 43, 51, 255)); y += 66
    pth = os.path.join(D, f'ov{k}.png'); im.save(pth); return pth
subs_i = [k for k, e in enumerate(ev) if e[0] == 'Sub']
for x, y in zip(subs_i, subs_i[1:]):  # trang trước tắt trước trang sau 2 khung
    if ev[x][2] > ev[y][1] - 0.07: ev[x] = (ev[x][0], ev[x][1], ev[y][1] - 0.07, ev[x][3])
ovs = [(png(st, txt, k), a, b) for k, (st, a, b, txt) in enumerate(ev)]
# ghép: mỗi shot 1080×1920 30 fps; giọng từ file Lip Sync, shot không giọng = im lặng; màn kết = 2,6 s cuối bản calm-latte
inp, fc, cat = [], [], ''
for i, (p, L, voiced) in enumerate(segs):
    inp += ['-t', f'{L:.3f}', '-i', p]
    fc.append(f'[{i}:v]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,fps=30,setsar=1,format=yuv420p[v{i}]')
    fc.append(f'[{i}:a]aresample=48000,aformat=channel_layouts=stereo,volume=1.0[a{i}]' if voiced else f'anullsrc=r=48000:cl=stereo,atrim=0:{L:.3f}[a{i}]')
    cat += f'[v{i}][a{i}]'
n = len(segs)
fc.append(f'{cat}concat=n={n}:v=1:a=1[vc][ac]')
inp += ['-ss', f'{ed - 2.0:.3f}', '-i', end]
fc.append(f'[{n}:v]fps=30,format=yuv420p,setsar=1,tpad=stop_mode=clone:stop_duration=1[ve];[{n}:a]aresample=48000,aformat=channel_layouts=stereo,apad=pad_dur=1[ae]')
fc.append('[vc][ac][ve][ae]concat=n=2:v=1:a=1[vall][ao0]')  # nối shot + màn kết TRƯỚC, rồi mới chồng chữ (mẹo nằm trên màn kết)
cur = 'vall'
for k, (pth, a, b) in enumerate(ovs):
    L2 = b - a; fd = 0.13 if ev[k][0] == 'Sub' else 0.22
    inp += ['-loop', '1', '-t', f'{L2:.3f}', '-i', pth]
    j = len(segs) + 1 + k
    fc.append(f'[{j}:v]format=rgba,fade=t=in:st=0:d={fd}:alpha=1,fade=t=out:st={max(0, L2 - fd):.3f}:d={fd}:alpha=1,setpts=PTS+{a:.3f}/TB[o{k}]')
    fc.append(f'[{cur}][o{k}]overlay=0:0:eof_action=pass[x{k}]'); cur = f'x{k}'
fc.append(f'[{cur}]null[vo]')
tot = t + 3.0
amb = [os.path.join(D, 'v1.mp4'), os.path.join(D, 'v5.mp4')]  # tiếng nền Kling tự sinh (không phải nhạc – độ phẳng phổ 0,36–0,46)
k0 = sum(1 for x in inp if x == '-i')
for f2 in amb: inp += ['-stream_loop', '-1', '-i', f2]
fc.append(f'[{k0}:a][{k0 + 1}:a]amix=inputs=2:normalize=0,highpass=f=150,lowpass=f=9000,volume=-22dB,atrim=0:{tot:.3f},aresample=48000,aformat=channel_layouts=stereo,afade=t=out:st={tot - 1.2:.3f}:d=1.2[amb]')
fc.append('[ao0][amb]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=9[ao]')
out = os.path.join(ROOT, 'out/cine-latte-pilot.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out], check=True)
print(out, round(dur(out), 2), json.dumps([(e[0], round(e[1], 2), round(e[2], 2), e[3][:30]) for e in ev]))
