# Zero-credit sample "Could I get a latte?" assembled ONLY from cafe bank clips + existing Kling TTS wavs + Rhubarb (CI) visemes.
import os, sys, json, subprocess, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lipsync as L
D = os.path.dirname(os.path.abspath(__file__)); CINE = os.path.dirname(D); ROOT = '/Users/mrquyenbk/Documents/addon dictionary'
W8 = f'{CINE}'; VIS = f'{D}/vis'; OUT = f'{D}/render'; os.makedirs(OUT, exist_ok=True)
FB = f'{CINE}/fonts/BeVietnamPro-ExtraBold.ttf'; FH = f'{CINE}/fonts/BricolageGrotesque-ExtraBold.ttf'
cues = {k: json.load(open(f'{VIS}/{k}.json'))['mouthCues'] for k in ('l1', 'l2', 'l3')}
TEMPO = 0.92   # voices at ~0.9x (rubric dim 3) -> also lowers caption cps; visemes are time-scaled to match
def sp(clip, who, wav, w_in, w_out, lead):
    return dict(mouth=L.Mouth(f'{D}/meta/{clip}/{who}'), cues=cues[wav], wav=wav, w_in=w_in, w_out=w_out, lead=lead, delay=0.04, tempo=TEMPO)
def closed(clip, who): return dict(mouth=L.Mouth(f'{D}/meta/{clip}/{who}'), cues=None)
# id, clip, f_in(frames), dur(s), speakers, boards, overlays
SHOTS = [
    ('bossy',   'c05_ots_ama_talk_a',    0, None, [sp('c05_ots_ama_talk_a', 'ama', 'l1', 0.12, 3.30, 0.0)], False,
     dict(tail=0.75, subs=['Hey. Give me a latte.', 'A large one.'], hook='Is “give me” rude?', card=('✗', 'Too direct'))),
    ('correct', 'c03_ots_carlos_talk_a', 0, None, [sp('c03_ots_carlos_talk_a', 'carlos', 'l2', 0.10, 3.40, 0.12)], True,
     dict(tail=0.30, subs=['That sounds a bit bossy.', 'Try: could I get a latte, please?'])),
    ('oops',    'c07_ots_ama_react',    24, 2.0, [], False, {}),
    ('polite',  'c06_ots_ama_talk_b',    0, None, [sp('c06_ots_ama_talk_b', 'ama', 'l3', 0.14, 3.52, 0.10)], False,
     dict(tail=0.35, subs=['Oh! Sorry.\nCould I get a latte, please?'], card=('✓', 'Could I get…, please?'))),
    ('nod',     'c08_ots_carlos_react',  8, 1.7, [], True, {}),
    ('tip',     'c10_ama_mcu_talk',      0, None, [sp('c10_ama_mcu_talk', 'ama', 'l3', 1.82, 3.52, 0.20)], False,
     dict(tail=1.9, subs=['Could I get a latte, please?'], tip='Kit’s tip: “Could I get…, please?” is polite.')),
    ('handover', 'c09_handover',         4, 4.6, [], True, {}),
    ('bye',     'c12b_closing',          0, 4.9, [], True, {}),
]
def wav_dur(k): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{W8}/{k}.wav']))
plan, t = [], 0.0
for sid, clip, f_in, dur, spk, boards, ov in SHOTS:
    if spk:
        s0 = spk[0]; dur = s0['lead'] + (s0['w_out'] - s0['w_in']) / TEMPO + ov.get('tail', 0.3)
    n = int(round(dur * L.FPS)); dur = n / L.FPS
    plan.append(dict(id=sid, clip=clip, f_in=f_in, n=n, t0=t, dur=dur, spk=spk, boards=boards, ov=ov)); t += dur
TOTAL = t
only = sys.argv[1:]  # optional: render only these shot ids
for p in plan:
    mp4 = f'{OUT}/{p["id"]}.mp4'
    if only and p['id'] not in only and os.path.exists(mp4): continue
    if not only and os.path.exists(mp4): continue
    frames, log = L.render(f'{D}/dl/{p["clip"]}.mp4', p['n'], p['f_in'], p['spk'], p['boards'])
    pr = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1080x1920', '-r', '24', '-i', '-',
                           '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', mp4], stdin=subprocess.PIPE)
    for F in frames: pr.stdin.write(F.tobytes())
    pr.stdin.close(); pr.wait(); json.dump(log, open(f'{OUT}/{p["id"]}.vis.json', 'w')); print('shot', p['id'], p['n'], 'frames')
# ---------- overlays (PIL) ----------
def wrap(dr, txt, fnt, maxw):
    lines = []
    for para in txt.split('\n'):
        cur = ''
        for w in para.split(' '):
            nx = (cur + ' ' + w).strip()
            if dr.textlength(nx, font=fnt) <= maxw: cur = nx
            else: lines.append(cur); cur = w
        lines.append(cur)
    return lines
BOXES = []
def png(style, txt, k, y_sub=None):
    im = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); dr = ImageDraw.Draw(im)
    if style == 'Sub':
        f = ImageFont.truetype(FB, 62); ls = wrap(dr, txt, f, 900); yb = y_sub or 1500; y = yb - 82 * len(ls)
        box = [1080, y, 0, yb]
        for l in ls:
            w = dr.textlength(l, font=f); x = (1080 - w) / 2; box[0] = min(box[0], x); box[2] = max(box[2], x + w)
            dr.text((x, y), l, font=f, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(20, 24, 32, 255)); y += 82
    elif style == 'Hook':
        f = ImageFont.truetype(FH, 96); ls = wrap(dr, txt, f, 920); y = 150; box = [80, 150, 1000, 150 + 112 * len(ls)]
        for l in ls:
            w = dr.textlength(l, font=f); dr.text(((1080 - w) / 2, y), l, font=f, fill=(255, 255, 255, 255), stroke_width=9, stroke_fill=(20, 24, 32, 255)); y += 112
    else:
        sym, body = (txt.split('|', 1) + [''])[:2] if '|' in txt else ('', txt)
        f = ImageFont.truetype(FB, 52); ls = wrap(dr, body, f, 740 if sym else 800); h = 64 * len(ls) + 60
        tw = max(dr.textlength(l, font=f) for l in ls) + 88 + (82 if sym else 0)   # card hugs its text
        x0, y0 = (1080 - tw) / 2, (1560 if style == 'Tip' else 300); x1 = x0 + tw; box = [x0, y0, x1, y0 + h]
        dr.rounded_rectangle([x0, y0, x1, y0 + h], radius=34, fill=(255, 250, 240, 250) if style == 'Card' else (225, 245, 232, 250), outline=(42, 43, 51, 255), width=5)
        tx = x0 + 44
        if sym:
            col = (229, 63, 63, 255) if sym == '✗' else (47, 191, 113, 255); cx, cy, r = tx + 30, y0 + h / 2, 30
            dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col)
            if sym == '✗': dr.line([cx - 12, cy - 12, cx + 12, cy + 12], fill=(255, 255, 255, 255), width=8); dr.line([cx - 12, cy + 12, cx + 12, cy - 12], fill=(255, 255, 255, 255), width=8)
            else: dr.line([cx - 14, cy + 1, cx - 4, cy + 12, cx + 15, cy - 11], fill=(255, 255, 255, 255), width=8, joint='curve')
            tx += 82
        y = y0 + 30
        for l in ls: dr.text((tx, y), l, font=f, fill=(42, 43, 51, 255)); y += 64
    pth = f'{OUT}/ov{k}.png'; im.save(pth); return pth, box
def voiced_spans(c, a, b):  # speech spans (wav time) from Rhubarb cues: non-X runs inside [a,b], merging gaps < 0.25 s
    sp, cur = [], None
    for i, x in enumerate(c):
        s, e = max(a, x['start']), min(b, x['end'])
        if e <= s: continue
        if x['value'] != 'X':
            if cur and s - cur[1] < 0.25: cur[1] = e
            else:
                if cur: sp.append(cur)
                cur = [s, e]
    if cur: sp.append(cur)
    return sp
ev = []
for p in plan:
    ov = p['ov']; t0 = p['t0']; end = t0 + p['dur']
    if p['spk']:
        s0 = p['spk'][0]; spans = voiced_spans(cues[s0['wav']], s0['w_in'], s0['w_out'])
        to_shot = lambda x: t0 + s0['lead'] + (x - s0['w_in']) / TEMPO
        subs = ov.get('subs', [])
        if len(subs) == len(spans) or len(subs) == 1:   # one caption page per sentence span
            groups = [[spans[0][0], spans[-1][1]]] if len(subs) == 1 else spans
        else:   # split spans proportionally to characters
            a, b = spans[0][0], spans[-1][1]; n = sum(len(s) for s in subs); x = a; groups = []
            for s in subs: k = (b - a) * len(s) / n; groups.append([x, x + k]); x += k
        for j, (s, g) in enumerate(zip(subs, groups)):
            st = max(t0 + 0.02, to_shot(g[0]) - (0.25 if j == 0 else 0.08)); en = (to_shot(groups[j + 1][0]) - 0.1) if j + 1 < len(groups) else min(end - 0.04, to_shot(g[1]) + 0.45)
            en = max(en, st + 1.2); ev.append(('Sub', st, min(en, end - 0.04), s))
        if 'hook' in ov: ev.append(('Hook', t0, min(end - 0.05, t0 + 2.0), ov['hook']))
        if 'card' in ov:
            sym, txt = ov['card']; c0 = to_shot(spans[min(1, len(spans) - 1)][1]) + 0.05 if sym == '✗' else to_shot(spans[-1][0])
            ev.append(('Card', c0, end - 0.04, sym + '|' + txt))
        if 'tip' in ov: ev.append(('Tip', to_shot(spans[0][0]) + 0.3, end - 0.04, ov['tip']))
subs_i = [k for k, e in enumerate(ev) if e[0] == 'Sub']
for x, y in zip(subs_i, subs_i[1:]):
    if ev[x][2] > ev[y][1] - 0.07: ev[x] = (ev[x][0], ev[x][1], ev[y][1] - 0.07, ev[x][3])
ovs = []
for k, (st, a, b, txt) in enumerate(ev):
    shot = [p for p in plan if p['t0'] <= a + 1e-3 < p['t0'] + p['dur']][0]
    y_sub = 1440 if shot['id'] == 'tip' else None
    pth, box = png(st, txt, k, y_sub); ovs.append((pth, a, b)); BOXES.append(dict(style=st, text=txt, t=[round(a, 2), round(b, 2)], shot=shot['id'], box=[int(v) for v in box]))
# ---------- final mux ----------
end = f'{ROOT}/out/calm-latte.mp4'; ed = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', end]))
inp, fc = [], []
for i, p in enumerate(plan):
    inp += ['-i', f'{OUT}/{p["id"]}.mp4']; fc.append(f'[{i}:v]fps=30,setsar=1,format=yuv420p[v{i}]')
n = len(plan); inp += ['-ss', f'{ed - 2.0:.3f}', '-i', end]
fc.append(f'[{n}:v]fps=30,format=yuv420p,setsar=1[ve]')
fc.append(''.join(f'[v{i}]' for i in range(n)) + '[ve]' + f'concat=n={n + 1}:v=1:a=0[vall]')
cur = 'vall'; k0 = n + 1
for k, (pth, a, b) in enumerate(ovs):
    L2 = b - a; fd = 0.12 if ev[k][0] == 'Sub' else 0.2
    inp += ['-loop', '1', '-t', f'{L2:.3f}', '-i', pth]; j = k0 + k
    fc.append(f'[{j}:v]format=rgba,fade=t=in:st=0:d={fd}:alpha=1,fade=t=out:st={max(0, L2 - fd):.3f}:d={fd}:alpha=1,setpts=PTS+{a:.3f}/TB[o{k}]')
    fc.append(f'[{cur}][o{k}]overlay=0:0:eof_action=pass[x{k}]'); cur = f'x{k}'
fc.append(f'[{cur}]null[vo]')
# audio: voice lines at their shot offsets (15 ms fades = no clicks), continuous room tone bed under everything, end-card audio
ja = k0 + len(ovs); vlab = []
for p in plan:
    for s0 in p['spk']:
        inp += ['-i', f'{W8}/{s0["wav"]}.wav']; d = int(round((p['t0'] + s0['lead']) * 1000)); L3 = s0['w_out'] - s0['w_in']
        fc.append(f'[{ja}:a]atrim={s0["w_in"]:.3f}:{s0["w_out"]:.3f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.015,atempo={TEMPO},afade=t=out:st={L3 / TEMPO - 0.03:.3f}:d=0.03,adelay={d}|{d}[va{ja}]')
        vlab.append(f'[va{ja}]'); ja += 1
fc.append(''.join(vlab) + f'amix=inputs={len(vlab)}:normalize=0,apad,atrim=0:{TOTAL:.3f}[voice]')
amb = [f'{CINE}/v1.mp4', f'{CINE}/v5.mp4']
for f2 in amb: inp += ['-stream_loop', '-1', '-i', f2]
fc.append(f'[{ja}:a][{ja + 1}:a]amix=inputs=2:normalize=0,highpass=f=150,lowpass=f=9000,volume=-17dB,atrim=0:{TOTAL + 2.0:.3f},aresample=48000,aformat=channel_layouts=stereo,afade=t=in:d=0.05,afade=t=out:st={TOTAL + 0.6:.3f}:d=1.4[amb]')
fc.append(f'[{n}:a]aresample=48000,aformat=channel_layouts=stereo,atrim=0:2.0,asetpts=PTS-STARTPTS,afade=t=in:d=0.03,adelay={int(TOTAL * 1000)}|{int(TOTAL * 1000)}[ea]')
fc.append('[voice]apad[voicep];[voicep][ea][amb]amix=inputs=3:normalize=0:duration=longest,atrim=0:' + f'{TOTAL + 2.0:.3f}' + ',loudnorm=I=-16:TP=-1.5:LRA=9[ao]')
out = f'{ROOT}/out/cine-cafe-sample.mp4'
subprocess.run(['ffmpeg', '-v', 'error', '-y', *inp, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', '30',
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out], check=True)
json.dump(dict(total=round(TOTAL + 2.0, 2), shots=[dict(id=p['id'], clip=p['clip'], t0=round(p['t0'], 3), dur=round(p['dur'], 3), f_in=p['f_in'],
          speech=[dict(wav=s['wav'], w=[s['w_in'], s['w_out']], lead=s['lead']) for s in p['spk']]) for p in plan], overlays=BOXES), open(f'{OUT}/timeline.json', 'w'), indent=1)
print(out, round(TOTAL + 2.0, 2))
