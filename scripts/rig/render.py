#!/usr/bin/env python3
"""Dựng MP4 9:16 từ frames.json (scripts/rig/timeline.mjs) – headless (resvg + Pillow + ffmpeg), chạy trên CI rig-sample.yml, KHÔNG trên Mac.
Khung tạm "tip-card" theo brand/tokens.json (light) – loạt sau lấy khung từ Stitch (template), nhân vật từ characters.json (who).
Lớp: nền --bg · thẻ hook (≤ 1,5 s: có từ khung 0) · giáo viên (đầu trơn poster-2x + mặt vẽ face.js, nghiêng/gật quanh cổ, thở) · tay vẽ phẳng (không viền)
mọc từ sau thẻ phụ đề · thẻ phụ đề 1 dòng karaoke (cùng mốc từ Kokoro) · CTA. Âm thanh: loudnorm 2 lượt → −16 LUFS, đỉnh ≤ −1,5 dBTP.
Ra: <out>/<id>.mp4, <id>-reduced.mp4, key-*.jpg, sheet.jpg, qc.json, report.md. Dùng: python3 scripts/rig/render.py content/video/rig/ama-agree.json qa/rig"""
import io, json, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import resvg_py

ROOT = Path(__file__).resolve().parents[2]
spec = json.loads(Path(sys.argv[1]).read_text()); OUT = Path(sys.argv[2]) / spec['id']
TOK = json.loads((ROOT / 'brand/tokens.json').read_text())['light']
hx = lambda h: tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))
BG, CARD, HEAD, TEXT, MUTED, LIP, TEAL, LEDGE = (hx(TOK[k]) for k in ['--bg', '--surface', '--heading', '--text', '--muted', '--cta-lip', '--teal-1', '--ledge'])
W, H = 1080, 1920
FD = ROOT / 'brand/social/src/fonts'
font = lambda sz, f='BricolageGrotesque-ExtraBold.ttf': ImageFont.truetype(str(FD / f), sz)
F_KICK, F_HOOK, F_CAP, F_CTA = font(46, 'BeVietnamPro-Bold.ttf'), font(84), font(64), font(36, 'BeVietnamPro-SemiBold.ttf')
RIGS = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./web/js/call/face.js').RIG))"], cwd=ROOT))
BASES = {w: Image.open(ROOT / f"web/teach/{w}/head-bare-2x.webp").convert('RGBA') for w in RIGS}  # 1108×960, cùng tọa độ face.js; người nói theo từng câu
TX, TY = (W - 1108) // 2, 420          # giáo viên: tỉ lệ 1:1 (không phóng to ảnh), thân dưới nằm sau thẻ phụ đề → không lộ đường cắt
CARD_Y0, CARD_Y1 = 1290, 1510
# màu tay lấy mẫu từ poster-2x (da, blazer, áo trong). Carlos: cần lấy mẫu + anh duyệt hình trước khi bật tay cho thầy (câu của thầy không có tay → bỏ qua, có cảnh báo)
HANDPAL = {'ama': {'skin': '#752414', 'shade': '#5A1A0E', 'sleeve': '#B8352A', 'cuff': '#FBFAE4'}}  # tay áo tối hơn blazer 1 bậc → cẳng tay tách khỏi thân

def contrast(a, b):
    L = lambda c: (lambda r, g, b_: .2126 * r + .7152 * g + .0722 * b_)(*[(x / 255 / 12.92) if x / 255 <= .03928 else ((x / 255 + .055) / 1.055) ** 2.4 for x in c])
    x, y = sorted([L(a), L(b)]); return (y + .05) / (x + .05)

def hand_svg(kind, k, mode, who):
    """Tay phẳng không viền. thumb = giơ ngón cái (khen, phải màn hình) · palm = xòe bàn tay (khích lệ, trái). k 0..1: rise = trồi lên 260 px, fade = mờ dần tại chỗ."""
    P = HANDPAL[who]; SKIN, SKIN_D, SLEEVE, CUFF = P['skin'], P['shade'], P['sleeve'], P['cuff']
    dy, op = ((1 - k) * 260, 1) if mode == 'rise' else (0, k)
    if kind == 'thumb':   # cẳng tay phải giơ trước ngực (phía trái màn hình là tay trái cô) – khuỷu khuất sau thẻ phụ đề
        x, y = 610, 1010 + dy
        g = (f'<rect x="{x + 8}" y="{y + 130}" width="140" height="420" rx="44" fill="{SLEEVE}"/><rect x="{x + 12}" y="{y + 118}" width="132" height="34" rx="14" fill="{CUFF}"/>'
             f'<rect x="{x}" y="{y}" width="156" height="134" rx="44" fill="{SKIN}"/><rect x="{x + 8}" y="{y - 96}" width="56" height="136" rx="28" fill="{SKIN}"/>'
             + ''.join(f'<rect x="{x + 66}" y="{y + 18 + 30 * i}" width="80" height="7" rx="3.5" fill="{SKIN_D}"/>' for i in range(3)))
    else:                 # bàn tay xòe chào/khích lệ, phía phải màn hình
        x, y = 300, 990 + dy
        fingers = ''.join(f'<rect x="{x + 8 + 37 * i}" y="{y - 104 + (10 if i in (0, 3) else 0) + (16 if i == 3 else 0)}" width="32" height="{124 - (16 if i == 3 else 0)}" rx="16" fill="{SKIN}"/>' for i in range(4))
        g = (f'<rect x="{x + 6}" y="{y + 134}" width="146" height="420" rx="44" fill="{SLEEVE}"/><rect x="{x + 8}" y="{y + 122}" width="142" height="34" rx="14" fill="{CUFF}"/>'
             f'{fingers}<rect x="{x}" y="{y}" width="158" height="140" rx="42" fill="{SKIN}"/>'
             f'<rect x="{x + 128}" y="{y + 30}" width="36" height="98" rx="18" fill="{SKIN}" transform="rotate(32 {x + 146} {y + 116})"/>'
             f'<path d="M{x + 36} {y + 48}Q{x + 78} {y + 72} {x + 118} {y + 52}" stroke="{SKIN_D}" stroke-width="6" fill="none" stroke-linecap="round"/>')
    return f'<g opacity="{op:.3f}">{g}</g>'

def svg_img(body, w, h):
    return Image.open(io.BytesIO(bytes(resvg_py.svg_to_bytes(svg_string=f'<svg xmlns="http://www.w3.org/2000/svg" width="{w}" height="{h}">{body}</svg>')))).convert('RGBA')

def words_of(seg):
    return [w for w in seg['words'] if re.search(r'[A-Za-z]', w['w'])]

def chunks(seg, maxc=24):
    """phụ đề 1 dòng: gom từ theo dấu câu/≤ maxc ký tự (mốc Kokoro) → [(i0, i1)]"""
    ws, out, i0, n = words_of(seg), [], 0, 0
    for i, w in enumerate(ws):
        n += len(w['w']) + 1
        nxt = ws[i + 1]['w'] if i + 1 < len(ws) else ''
        end_punct = bool(re.search(r'[.,!?]$', seg['text'].split()[min(i, len(seg['text'].split()) - 1)])) if len(seg['text'].split()) == len(ws) else False
        if i == len(ws) - 1 or n + len(nxt) > maxc or end_punct:
            out.append((i0, i + 1)); i0, n = i + 1, 0
    return ws, out

def caption(dr, seg, lt):
    ws, ch = chunks(seg)
    cur = next((c for c in ch if ws[c[0]]['start'] - .15 <= lt), ch[0]) if ch else None
    for c in ch:
        if ws[c[0]]['start'] - .15 <= lt: cur = c
    if not cur: return
    disp = seg['text'].split() if len(seg['text'].split()) == len(ws) else [w['w'] for w in ws]
    toks = [(disp[i], ws[i]) for i in range(*cur)]
    widths = [dr.textlength(t + ' ', font=F_CAP) for t, _ in toks]
    x = (W - sum(widths) + dr.textlength(' ', font=F_CAP)) / 2; y = (CARD_Y0 + CARD_Y1) / 2 - 40
    for (t, w), wd in zip(toks, widths):
        col = LIP if w['start'] <= lt < w['end'] + .08 else (HEAD if w['start'] <= lt else MUTED)
        dr.text((x, y), t, font=F_CAP, fill=col); x += wd

def hook(dr, t):
    hk = spec['hook']; good = t >= segs[hk['after']]['start'] - .1
    dr.rounded_rectangle((48, 96, W - 48, 330), 44, fill=CARD); dr.rounded_rectangle((48, 316, W - 48, 340), 12, fill=LEDGE); dr.rounded_rectangle((48, 96, W - 48, 326), 44, fill=CARD)
    kick = 'Say' if good else hk['kicker']; line = f"\u201c{hk['good'] if good else hk['bad']}\u201d"
    dr.text((W / 2, 150), kick, font=F_KICK, fill=MUTED, anchor='mm')
    col = TEAL if good else HEAD; MW = 74   # dấu ✓/✗ VẼ (font thương hiệu không có glyph) – xanh teal = đúng, đỏ đậm = sai
    tw = dr.textlength(line, font=F_HOOK); x0 = W / 2 - (tw + MW) / 2
    dr.text((x0, 245), line, font=F_HOOK, fill=col, anchor='lm')
    cx, cy = x0 + tw + MW / 2 + 14, 245
    if good: dr.line([(cx - 24, cy + 2), (cx - 6, cy + 22), (cx + 26, cy - 22)], fill=TEAL, width=12, joint='curve')
    else: dr.line((cx - 20, cy - 20, cx + 20, cy + 20), fill=LIP, width=12); dr.line((cx - 20, cy + 20, cx + 20, cy - 20), fill=LIP, width=12)
    if not good:  # gạch chữ thừa "am"
        pre = line[:line.index(hk['strike'])]; xs = x0 + dr.textlength(pre, font=F_HOOK); xe = xs + dr.textlength(hk['strike'], font=F_HOOK)
        dr.line((xs - 4, 250, xe + 4, 250), fill=LIP, width=9)

def frame(fr, t):
    im = Image.new('RGBA', (W, H), BG + (255,))
    base = BASES[fr['who']]; face = svg_img(fr['g'], base.width, base.height); body = base.copy(); body.alpha_composite(face)
    if fr['tilt'] or fr['nod']:
        body = body.rotate(fr['tilt'], resample=Image.BICUBIC, center=tuple(RIGS[fr['who']]['pivot']), translate=(0, fr['nod']))
    im.alpha_composite(body, (TX, int(round(TY + fr['breath']))))
    if fr['hand'] and fr['who'] in HANDPAL:
        hl = svg_img(hand_svg(fr['hand'], fr['hk'], fr['hmode'], fr['who']), W, H)
        hl.paste((0, 0, 0, 0), (0, CARD_Y0 + 60, W, H))   # khuỷu/tay áo dừng sau thẻ phụ đề, không lòi xuống dưới thẻ
        im.alpha_composite(hl)
    dr = ImageDraw.Draw(im)
    dr.rounded_rectangle((48, CARD_Y0 + 14, W - 48, CARD_Y1 + 14), 48, fill=LEDGE); dr.rounded_rectangle((48, CARD_Y0, W - 48, CARD_Y1), 48, fill=CARD)
    seg = segs[fr['seg']]
    if fr['lt'] >= -.2: caption(dr, seg, fr['lt'])
    hook(dr, t)
    dr.text((W / 2, 1600), spec['cta'], font=F_CTA, fill=MUTED, anchor='mm')
    return im.convert('RGB')

def sh(*a): return subprocess.run(a, check=True, capture_output=True, text=True)

def render(name, fj):
    D = json.loads((OUT / fj).read_text()); d = OUT / f'fr-{name}'; d.mkdir(exist_ok=True)
    for i, fr in enumerate(D['frames']): frame(fr, i / D['fps']).save(d / f'{i:05d}.png', compress_level=1)
    mp4 = OUT / f"{spec['id']}{'' if name == 'full' else '-' + name}.mp4"
    sh('ffmpeg', '-y', '-v', 'error', '-framerate', str(D['fps']), '-i', str(d / '%05d.png'), '-i', str(OUT / 'voice.wav'), '-map', '0:v', '-map', '1:a', '-shortest',
       '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', str(mp4))
    return D, d, mp4

def loudnorm():
    raw, dst = OUT / 'voice.raw.wav', OUT / 'voice.wav'
    p = sh('ffmpeg', '-hide_banner', '-i', str(raw), '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-').stderr
    m = json.loads(p[p.rindex('{'):p.rindex('}') + 1])
    sh('ffmpeg', '-y', '-v', 'error', '-i', str(raw), '-af', f"loudnorm=I=-16:TP=-1.5:LRA=11:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}:offset={m['target_offset']}:linear=true", '-ar', '48000', str(dst))

def measure(mp4):
    e = sh('ffmpeg', '-hide_banner', '-nostats', '-i', str(mp4), '-af', 'ebur128=peak=true', '-f', 'null', '-').stderr
    I = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', e)[-1]); tp = float(re.findall(r'Peak:\s+(-?[\d.]+) dBFS', e)[-1])
    return I, tp

loudnorm()
segs = json.loads((OUT / 'frames.json').read_text())['segments']
D, d, mp4 = render('full', 'frames.json')
_, _, mp4r = render('reduced', 'frames-reduced.json')
# khung chính: hook (0 s), giải thích, khen (tay), khích lệ (tay)
fps, keys = D['fps'], [('hook', 0.0), ('explain', segs[1]['start'] + 1.0)] + [(s['emo'], s['start'] + min(1.2, s['dur'] * .6)) for s in segs if s.get('hand')]
ims = []
for nm, t in keys:
    k = min(int(t * fps), len(D['frames']) - 1)
    while k < len(D['frames']) - 1 and D['frames'][k]['blink'] > .05: k += 1   # khung chính: mắt mở
    p = OUT / f'key-{nm}.jpg'; Image.open(d / f'{k:05d}.png').convert('RGB').save(p, quality=90); ims.append(Image.open(p))
sheet = Image.new('RGB', (len(ims) * 540, 960), BG)
for i, x in enumerate(ims): sheet.paste(x.resize((540, 960), Image.LANCZOS), (i * 540, 0))
sheet.save(OUT / 'sheet.jpg', quality=88)
# QC
M = json.loads((OUT / 'metrics.json').read_text()); I, tp = measure(mp4); people = json.loads((ROOT / 'web/teach/characters.json').read_text())['people']
for s in segs:
    if s.get('hand') and s['who'] not in HANDPAL: print('CẢNH BÁO: chưa có màu tay cho', s['who'], '→ câu', s['k'], 'không có tay')
text = ' '.join(s['text'] for s in spec['segments'])
g = {
  'voice_is_teacher': all(v['voice'] == people[v['who']]['voice']['video'] and v['voice'].startswith('af_' if people[v['who']]['role'].startswith('female') else 'am_') for v in M['voices']),
  'english_only': bool(re.fullmatch(r"[A-Za-z0-9 ,.!?'’-]+", text)),
  'pace_le_150wpm': M['wpmSpeech'] <= 150,
  'hook_le_1_5s': M['firstVoicedS'] <= 0.5,   # tiếng + thẻ hook có ngay từ khung 0
  'duration_15_30s': 15 <= M['total'] <= 30,
  'lipsync_lag_le_45ms': M['lagMaxAbsMs'] <= 45,
  'viseme_ge_80pct': M['visemePctMin'] >= 80,
  'no_mouth_flicker': M['flicker'] == 0,
  'blink_6_30_per_min': 6 <= M['blinksPerMin'] <= 30,
  'loudness_-16_lufs': abs(I + 16) <= 1.0 and tp <= -1.0,
  'reduced_motion_variant': M['reducedStill'],
  'caption_contrast': min(contrast(HEAD, CARD), contrast(LIP, CARD)) >= 4.5 and contrast(MUTED, CARD) >= 4.5,
  'frames_eq_duration': len(D['frames']) == int(-(-D['total'] * fps // 1)),
}
score = round(100 * sum(g.values()) / len(g))
qc = {'score': score, 'gates': g, 'lufs': I, 'truePeak': tp, **{k: M[k] for k in ['voices', 'total', 'words', 'wpmSpeech', 'wpmOverall', 'firstVoicedS', 'lagMaxAbsMs', 'visemePctMin', 'flicker', 'blinksPerMin']}, 'rows': M['rows'],
      'cost': {'kling_credits': 0, 'usd': 0, 'ci_minutes_note': 'xem thời gian job rig-sample'}}
(OUT / 'qc.json').write_text(json.dumps(qc, indent=1))
rep = [f"## Rig 2D {spec['id']} – điểm {score}/100", '', '| cổng | ok |', '|---|---|'] + [f'| {k} | {"✅" if v else "❌"} |' for k, v in g.items()] + ['', '```', json.dumps({k: v for k, v in qc.items() if k not in ('gates', 'rows')}), '```', '', '| câu | emo | tay | s | lệch ms | đúng hình % | nháy |', '|---|---|---|---|---|---|---|'] + [f"| {r['k']} | {r['emo']} | {r['hand']} | {r['dur']:.2f} | {r['lagMs']} | {r['visemePct']} | {r['flicker']} |" for r in M['rows']]
(OUT / 'report.md').write_text('\n'.join(rep) + '\n'); print('\n'.join(rep))
for x in OUT.glob('fr-*'): subprocess.run(['rm', '-rf', str(x)])
sys.exit(0 if all(g.values()) else 1)
