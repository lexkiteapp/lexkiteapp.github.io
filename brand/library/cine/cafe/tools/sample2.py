# v2 zero-credit sample: lesson structure (hook -> mistake -> why -> fix -> repeat -> pattern -> your turn -> hand-over/thanks -> recap -> end card)
# All voices = Kokoro (CI, free): Ama af_bella, Carlos am_adam (one voice per character). Visemes = Rhubarb (CI). Picture = cafe bank clips only.
import os, sys, json, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lipsync as L
D = os.path.dirname(os.path.abspath(__file__)); CINE = os.path.dirname(D); ROOT = '/Users/mrquyenbk/Documents/addon dictionary'
VIS = f'{D}/vis2'; OUT = f'{D}/render2'; os.makedirs(OUT, exist_ok=True)
FB = f'{CINE}/fonts/BeVietnamPro-ExtraBold.ttf'; FH = f'{CINE}/fonts/BricolageGrotesque-ExtraBold.ttf'
FPS = 24; TEMPO = 0.87
TEXT = {l['id']: l['text'] for l in json.load(open(f'{D}/ci/lines.json'))['lines']}
CUES = {k: json.load(open(f'{VIS}/{k}.json'))['mouthCues'] for k in TEXT}
def wdur(k): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{VIS}/{k}.wav']))
def M(clip, who): return L.Mouth(f'{D}/meta/{clip}/{who}')
def line(k, at, tempo=TEMPO): return dict(id=k, cues=CUES[k], at=at, tempo=tempo, dur=wdur(k) / tempo)
def rng(a, b): return list(range(a, b))
# ---- shot list: id, clip, frames(fn of n), dur, speakers [(who-mouth, [lines])], voice lines (for audio/captions), boards, overlays
S = []
def shot(id, clip, dur, frames, mouths, lines, boards=False, ov=(), crop=None):
    n = int(round(dur * FPS)); fr = frames(n); assert len(fr) == n, (id, len(fr), n)
    S.append(dict(id=id, clip=clip, n=n, dur=n / FPS, frames=fr, mouths=mouths, lines=lines, boards=boards, ov=list(ov), crop=crop))
# 1 hook (silent, mouth closed) + the mistake + ✗ card
l1 = line('k01_ama_giveme', 1.55)
shot('mistake', 'c05_ots_ama_talk_a', 1.55 + l1['dur'] + 1.45, lambda n: rng(0, n), [('c05_ots_ama_talk_a', 'ama', [l1])], [('ama', l1)],
     ov=[('Hook', 0.0, 1.5, 'Is “Give me…” polite?'), ('Card', 1.55 + l1['dur'] + 0.15, None, '✗|“Give me…” = an order')])
# 2 why (Carlos off-face; Ama listens, mouth held closed) – c06 played in reverse from its end
l2 = line('k02_car_order', 0.12)
shot('why', 'c06_ots_ama_talk_b', 0.12 + l2['dur'] + 0.35, lambda n: list(range(120, 120 - n, -1)), [('c06_ots_ama_talk_b', 'ama', [])], [('carlos', l2)])
# 3 oops: embarrassed reaction, hand over mouth (silent)
shot('oops', 'c07_ots_ama_react', 1.1, lambda n: rng(24, 24 + n), [], [])
# 4 the fix modelled by Carlos (face, lip-synced)
l3 = line('k03_car_try', 0.10)
shot('fix', 'c03_ots_carlos_talk_a', 0.10 + l3['dur'] + 0.35, lambda n: rng(0, n), [('c03_ots_carlos_talk_a', 'carlos', [l3])], [('carlos', l3)], boards=True)
# 5 Ama repeats naturally + ✓ card (after the line)
l4 = line('k04_ama_could', 0.10)
shot('repeat', 'c06_ots_ama_talk_b', 0.10 + l4['dur'] + 1.35, lambda n: rng(0, n), [('c06_ots_ama_talk_b', 'ama', [l4])], [('ama', l4)],
     ov=[('Card', 0.10 + l4['dur'] + 0.12, None, '✓|Could I get …, please?')])
# 6 PATTERN card + two more examples, voiced one by one (Ama to camera)
l5 = line('k05_ama_muffin', 0.55); l6 = line('k06_ama_bill', 0.55 + l5['dur'] + 0.45, 0.84)
shot('pattern', 'c10_ama_mcu_talk', l6['at'] + l6['dur'] + 0.45, lambda n: rng(0, n), [('c10_ama_mcu_talk', 'ama', [l5, l6])], [('ama', l5), ('ama', l6)],
     ov=[('Pattern', 0.15, l6['at'] - 0.12, 'Could I get ___, please?|a muffin'),
         ('Pattern', l6['at'] - 0.05, None, 'Could I get ___, please?|the bill')])
# 7 YOUR TURN: prompt -> 2 s pause -> answer (Ama to camera; c10 reversed so it is not a visible repeat)
l7 = line('k07_ama_tea', 2.6)
shot('yourturn', 'c10_ama_mcu_talk', l7['at'] + l7['dur'] + 0.5, lambda n: list(range(120, 120 - n, -1)), [('c10_ama_mcu_talk', 'ama', [l7])], [('ama', l7)],
     ov=[('Prompt', 0.1, l7['at'] - 0.15, 'Your turn!|Ask for a tea.')])
# 8 hand-over as an INSERT close-up (cup + hands; faces out of frame) - Ama's "Thanks!" off-face as she takes the cup
l8 = line('k08_ama_thanks', 2.45)
shot('handover', 'c09_handover', 3.6, lambda n: rng(22, 22 + n), [], [('ama', l8)], crop=(470, 545, 540, 960))
# 9 Carlos: kind smile + nod (mouth closed) = "you're welcome"; recap card. No wave/exit shot (c12b dropped: direction rule).
shot('nod', 'c08_ots_carlos_react', 1.9, lambda n: rng(6, 6 + n), [], [], boards=True,
     ov=[('Recap', 0.15, None, 'Remember:|Could I get ___, please?')])
t = 0.0
for s in S: s['t0'] = t; t += s['dur']
SCENE = t; END = 2.0; TOTAL = SCENE + END
# ---- render shots
for s in S:
    mp4 = f'{OUT}/{s["id"]}.mp4'
    if os.path.exists(mp4) and s['id'] not in sys.argv[1:]: continue
    sp = [dict(mouth=M(c, w), lines=ls) for c, w, ls in s['mouths']]
    frames, log = L.render(f'{D}/dl/{s["clip"]}.mp4', s['frames'], sp, s['boards'], s['crop'])
    pr = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1080x1920', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', mp4], stdin=subprocess.PIPE)
    for F in frames: pr.stdin.write(F.tobytes())
    pr.stdin.close(); pr.wait(); json.dump(log, open(f'{OUT}/{s["id"]}.vis.json', 'w')); print('shot', s['id'], s['n'])
# ---- end card (Kit from web/js/kit.js, rendered to PNG; wordmark per BRAND-RULES; silent)
def end_card():
    W, H = 1080, 1920; im = Image.new('RGB', (W, H), (15, 61, 62)); dr = ImageDraw.Draw(im)
    for y in range(H):  # soft vertical teal gradient #0F3D3E -> #17595A
        k = y / H; dr.line([(0, y), (W, y)], fill=(int(15 + 8 * k), int(61 + 28 * k), int(62 + 28 * k)))
    kit = Image.open(f'{D}/end/kit.png').convert('RGBA'); kit = kit.resize((460, 460)); im.paste(kit, ((W - 460) // 2, 560), kit)
    f = ImageFont.truetype(FH, 150); wl = dr.textlength('lex', font=f); wk = dr.textlength('kite', font=f); x = (W - wl - wk) / 2; y = 1060
    dr.text((x, y), 'lex', font=f, fill=(255, 247, 234))
    g = Image.new('RGBA', (int(wk) + 4, 200)); gd = ImageDraw.Draw(g)
    for xx in range(g.width):
        k = xx / g.width; gd.line([(xx, 0), (xx, 200)], fill=(int(229 + 26 * k), int(80 + 96 * k), int(47 + 37 * k), 255))
    m = Image.new('L', g.size, 0); ImageDraw.Draw(m).text((0, 0), 'kite', font=f, fill=255); im.paste(g, (int(x + wl), y), m)
    f2 = ImageFont.truetype(FB, 54); tx = 'Practice free'; dr.text(((W - dr.textlength(tx, font=f2)) / 2, 1270), tx, font=f2, fill=(255, 231, 194))
    f3 = ImageFont.truetype(FB, 60); u = 'lexkite.com'; uw = dr.textlength(u, font=f3)
    dr.rounded_rectangle([(W - uw) / 2 - 44, 1390, (W + uw) / 2 + 44, 1490], radius=50, fill=(255, 201, 74)); dr.text(((W - uw) / 2, 1404), u, font=f3, fill=(15, 61, 62))
    im.save(f'{OUT}/endcard.png')
end_card()
# ---- overlays
def wrap(dr, txt, fnt, maxw):
    out = []
    for para in txt.split('\n'):
        cur = ''
        for w in para.split(' '):
            nx = (cur + ' ' + w).strip()
            if dr.textlength(nx, font=fnt) <= maxw: cur = nx
            else: out.append(cur); cur = w
        out.append(cur)
    return out
def card(dr, x0, y0, rows, fill, outline=(42, 43, 51, 255)):
    h = sum(r[2] for r in rows) + 56; tw = max(r[3] for r in rows) + 88; x0 = (1080 - tw) / 2 if x0 is None else x0
    dr.rounded_rectangle([x0, y0, x0 + tw, y0 + h], radius=34, fill=fill, outline=outline, width=5); return x0, h, tw
def png(style, txt, k):
    im = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); box = None
    if style == 'Sub':
        f = ImageFont.truetype(FB, 62); ls = wrap(dr, txt, f, 900); yb = 1500; y = yb - 82 * len(ls); box = [1080, y, 0, yb]
        for l in ls:
            w = dr.textlength(l, font=f); x = (1080 - w) / 2; box[0] = min(box[0], x); box[2] = max(box[2], x + w)
            dr.text((x, y), l, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(20, 24, 32, 255)); y += 82
    elif style == 'Hook':
        f = ImageFont.truetype(FH, 100); ls = wrap(dr, txt, f, 940); y = 150; box = [60, 150, 1020, 150 + 116 * len(ls)]
        for l in ls:
            w = dr.textlength(l, font=f); dr.text(((1080 - w) / 2, y), l, font=f, fill=(255, 255, 255, 255), stroke_width=9, stroke_fill=(20, 24, 32, 255)); y += 116
    elif style == 'Card':
        sym, body = txt.split('|', 1); f = ImageFont.truetype(FB, 56); tw = dr.textlength(body, font=f) + 82
        x0, h, w = card(dr, None, 300, [(None, None, 70, tw)], (255, 250, 240, 250)); cx, cy, r = x0 + 74, 300 + 28 + 35, 30
        col = (229, 63, 63, 255) if sym == '✗' else (47, 191, 113, 255); dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
        if sym == '✗': dr.line([cx - 12, cy - 12, cx + 12, cy + 12], fill='white', width=8); dr.line([cx - 12, cy + 12, cx + 12, cy - 12], fill='white', width=8)
        else: dr.line([cx - 14, cy + 1, cx - 4, cy + 12, cx + 15, cy - 11], fill='white', width=8, joint='curve')
        dr.text((x0 + 44 + 82, 300 + 30), body, font=f, fill=(42, 43, 51, 255)); box = [x0, 300, x0 + w, 300 + h]
    elif style in ('Pattern', 'Recap', 'Prompt'):
        head, chip = txt.split('|', 1); f = ImageFont.truetype(FB, 58); fc = ImageFont.truetype(FB, 54)
        y0 = 120 if style == 'Pattern' else (1560 if style == 'Recap' else 1500)
        if style == 'Recap':   # "Remember:" small label + pattern
            fl = ImageFont.truetype(FB, 44); w1 = dr.textlength(chip, font=f); x0, h, w = card(dr, None, y0, [(None, None, 52, w1), (None, None, 70, w1)], (225, 245, 232, 250))
            dr.text((x0 + 44, y0 + 26), head, font=fl, fill=(23, 89, 90, 255)); dr.text((x0 + 44, y0 + 84), chip, font=f, fill=(42, 43, 51, 255))
        elif style == 'Prompt':
            fl = ImageFont.truetype(FH, 84); w1 = max(dr.textlength(head, font=fl), dr.textlength(chip, font=f)); x0, h, w = card(dr, None, y0, [(None, None, 96, w1), (None, None, 70, w1)], (255, 247, 234, 250))
            dr.text(((1080 - dr.textlength(head, font=fl)) / 2, y0 + 22), head, font=fl, fill=(229, 80, 47, 255)); dr.text(((1080 - dr.textlength(chip, font=f)) / 2, y0 + 118), chip, font=f, fill=(42, 43, 51, 255))
        else:
            w1 = dr.textlength(head, font=f); x0, h, w = card(dr, None, y0, [(None, None, 70, w1), (None, None, 80, w1)], (255, 247, 234, 250))
            dr.text((x0 + 44, y0 + 26), head, font=f, fill=(42, 43, 51, 255))
            if chip:   # the example that fills the blank, as a highlighted chip
                cw = dr.textlength(chip, font=fc); cx0 = (1080 - cw) / 2 - 28
                dr.rounded_rectangle([cx0, y0 + 98, cx0 + cw + 56, y0 + 98 + 70], radius=35, fill=(255, 201, 74, 255)); dr.text((cx0 + 28, y0 + 104), chip, font=fc, fill=(15, 61, 62, 255))
            else:
                ff = ImageFont.truetype(FB, 40); tt = 'polite way to ask for something'; dr.text(((1080 - dr.textlength(tt, font=ff)) / 2, y0 + 112), tt, font=ff, fill=(23, 89, 90, 255))
        box = [x0, y0, x0 + w, y0 + h]
    pth = f'{OUT}/ov{k}.png'; im.save(pth); return pth, [int(v) for v in box]
def spans(c, tempo, at):   # voiced span of a line in shot time (first non-X start .. last non-X end)
    nx = [x for x in c if x['value'] != 'X']; return at + nx[0]['start'] / tempo, at + nx[-1]['end'] / tempo
ev = []
for s in S:
    end = s['t0'] + s['dur']
    for who, ln in s['lines']:
        a, b = spans(ln['cues'], ln['tempo'], ln['at']); ev.append(['Sub', s['t0'] + a - 0.09, s['t0'] + b + 0.39, TEXT[ln['id']], s['id'], ln['id']])
    for st, a, b, txt in s['ov']:
        ev.append([st, s['t0'] + a, (s['t0'] + b) if b is not None else end - 0.04, txt, s['id'], None])
# captions: clamp to own shot / next caption; cards must not show while a DIFFERENT line is spoken (checked in qa2)
ev.sort(key=lambda e: e[1])
subs = [e for e in ev if e[0] == 'Sub']
for x, y in zip(subs, subs[1:]): x[2] = min(x[2], y[1] - 0.07)
for e in ev:
    shot_ = [s for s in S if s['id'] == e[4]][0]; e[2] = min(e[2], shot_['t0'] + shot_['dur'] - 0.04) if e[0] == 'Sub' else e[2]
ovs = []; BOX = []
for k, e in enumerate(ev):
    pth, box = png(e[0], e[3], k); ovs.append((pth, e[1], e[2], e[0])); BOX.append(dict(style=e[0], text=e[3], t=[round(e[1], 3), round(e[2], 3)], shot=e[4], line=e[5], box=box))
# ---- mux (24 fps native: no 24->30 pulldown judder)
inp, fc = [], []
for i, s in enumerate(S): inp += ['-i', f'{OUT}/{s["id"]}.mp4']; fc.append(f'[{i}:v]setsar=1,format=yuv420p[v{i}]')
n = len(S); inp += ['-loop', '1', '-framerate', str(FPS), '-t', f'{END:.3f}', '-i', f'{OUT}/endcard.png']
fc.append(f'[{n}:v]format=yuv420p,setsar=1,fade=t=in:st=0:d=0.25[ve]')
fc.append(''.join(f'[v{i}]' for i in range(n)) + '[ve]' + f'concat=n={n + 1}:v=1:a=0[vall]')
cur = 'vall'; j = n + 1
for k, (pth, a, b, st) in enumerate(ovs):
    L2 = b - a; fd = 0.1 if st == 'Sub' else (0.04 if st == 'Pattern' else 0.18)
    inp += ['-loop', '1', '-t', f'{L2:.3f}', '-i', pth]
    fc.append(f'[{j}:v]format=rgba,fade=t=in:st=0:d={fd}:alpha=1,fade=t=out:st={max(0, L2 - fd):.3f}:d={fd}:alpha=1,setpts=PTS+{a:.3f}/TB[o{k}]')
    fc.append(f'[{cur}][o{k}]overlay=0:0:eof_action=pass[x{k}]'); cur = f'x{k}'; j += 1
fc.append(f'[{cur}]null[vo]')
vl = []
for s in S:
    for who, ln in s['lines']:
        d = int(round((s['t0'] + ln['at']) * 1000)); inp += ['-i', f'{VIS}/{ln["id"]}.wav']
        fc.append(f'[{j}:a]aresample=48000,aformat=channel_layouts=stereo,atempo={ln['tempo']},afade=t=in:d=0.01,afade=t=out:st={ln["dur"] - 0.03:.3f}:d=0.03,adelay={d}|{d}[va{j}]'); vl.append(f'[va{j}]'); j += 1
fc.append(''.join(vl) + f'amix=inputs={len(vl)}:normalize=0,apad,atrim=0:{TOTAL:.3f}[voice]')
for f2 in (f'{CINE}/v1.mp4', f'{CINE}/v5.mp4'): inp += ['-stream_loop', '-1', '-i', f2]
# room tone: continuous under the scene, fades out over 0.6 s into the (silent) end card; no SFX anywhere
fc.append(f'[{j}:a][{j + 1}:a]amix=inputs=2:normalize=0,highpass=f=150,lowpass=f=9000,volume=-17dB,aresample=48000,aformat=channel_layouts=stereo,atrim=0:{TOTAL:.3f},afade=t=in:d=0.05,afade=t=out:st={SCENE - 0.2:.3f}:d=0.6[amb]')
fc.append(f'[voice][amb]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st={SCENE - 0.2:.3f}:d=0.6,atrim=0:{TOTAL:.3f}[ao]')
out = f'{ROOT}/out/cine-cafe-sample-v2.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out], check=True)
json.dump(dict(total=round(TOTAL, 3), scene=round(SCENE, 3), tempo=TEMPO, shots=[dict(id=s['id'], clip=s['clip'], t0=round(s['t0'], 3), dur=round(s['dur'], 3), frames=[s['frames'][0], s['frames'][-1]],
          lines=[dict(who=w, id=l['id'], at=round(l['at'], 3), dur=round(l['dur'], 3), tempo=l['tempo']) for w, l in s['lines']], mouths=[[c, w] for c, w, _ in s['mouths']]) for s in S], overlays=BOX), open(f'{OUT}/timeline.json', 'w'), indent=1)
print(out, round(TOTAL, 2))
