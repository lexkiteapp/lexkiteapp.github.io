# v5 bilingual lesson builder: lesson5.py <lang>   (locale text: content/video/cine/locales/latte.<lang>.json)
# English audio + verbatim English captions, native line under each caption, native-only explanation, visual contrast card,
# 3x target sentence (model / repeat / slow 0.8x karaoke), "repeat after me" + "your turn" with 2 s progress rings, foley, localized CTA.
import os, sys, json, subprocess, numpy as np, cv2
TH = os.environ.get('CINE_THREADS', '2')   # Mac: 2 threads (cool-Mac rule); CI (cine-render.yml) sets 0 = all cores
cv2.setNumThreads(int(TH) if TH != '0' else (os.cpu_count() or 4))
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))   # lipsync / foley from scripts/cine
import lipsync as L
# Paths (canonical builder scripts/cine/, see docs/CINE-SCENE-STANDARD.md "Dựng trên CI"):
#   CINE_SCENE_DIR = scene tools dir with meta/ dl24/ vis3/ ci/lines.json lessons/ end/ foley/ amb_*.wav (default: current dir; scripts/cine/prep_scene.sh links them)
#   CINE_LIB = footage root holding <bank>/{meta,dl24,bank.json} for 'bank:clip' B-roll (default: 2 levels above the scene dir)
#   CINE_ROOT = public repo root (locales, ecosystem.json, brand fonts); CINE_OUT = mp4 output dir (default ROOT/out)
CODE = os.path.dirname(os.path.abspath(__file__))
D = os.path.abspath(os.environ.get('CINE_SCENE_DIR', os.getcwd())); CINE = D; LIB = os.path.abspath(os.environ.get('CINE_LIB', os.path.dirname(os.path.dirname(D))))
ROOT = os.path.abspath(os.environ.get('CINE_ROOT', os.path.dirname(os.path.dirname(CODE)))); OUTDIR = os.path.abspath(os.environ.get('CINE_OUT', f'{ROOT}/out')); os.makedirs(OUTDIR, exist_ok=True)
def FONT(name):   # OFL fonts: scripts/cine/fonts (Noto Sans Arabic) + brand/social/src/fonts (Be Vietnam Pro, Bricolage); legacy <scene>/../fonts still works
    for d in (os.environ.get('CINE_FONTS', ''), f'{CODE}/fonts', f'{ROOT}/brand/social/src/fonts', f'{os.path.dirname(D)}/fonts', f'{os.path.dirname(D)}/fonts/ext', f'{D}/fonts'):
        if d and os.path.exists(f'{d}/{name}.ttf'): return f'{d}/{name}.ttf'
    raise FileNotFoundError(name + '.ttf')
GREET = os.environ.get('GREET', 'c04_ots_carlos_talk_b'); GREET_F0 = int(os.environ.get('GREET_F0', '0'))
LANG = sys.argv[1]; LID = sys.argv[2] if len(sys.argv) > 2 else 'latte'; LOC = json.load(open(f'{ROOT}/content/video/cine/locales/{LID}.{LANG}.json'))
VIS = f'{D}/vis3'; OUT = f'{D}/render5_{LID}_{LANG}'; os.makedirs(OUT, exist_ok=True)
FPS = 24; SAFE = dict(x0=60, x1=940, y0=230, y1=1500); CX = (SAFE['x0'] + SAFE['x1']) / 2; MAXW = SAFE['x1'] - SAFE['x0']
ECO = {a['id']: a for a in json.load(open(f'{ROOT}/content/video/ecosystem.json'))['areas']}
TEXT = {l['id']: l['text'] for l in json.load(open(f'{D}/ci/lines.json'))['lines']}
CUES = {k: json.load(open(f'{VIS}/{k}.json'))['mouthCues'] for k in TEXT if os.path.exists(f'{VIS}/{k}.json')}
FONT_EN = FONT('BeVietnamPro-ExtraBold'); FONT_H = FONT('BricolageGrotesque-ExtraBold')
FONT_N = FONT({'BeVietnamPro-ExtraBold': 'BeVietnamPro-ExtraBold', 'NotoSansArabic': 'NotoSansArabic'}[LOC['font']])
RTL = LOC['dir'] == 'rtl'
EN_ONLY = LANG == 'en' or LOC.get('english_only', False)   # English-only mode: no native line anywhere (one version for every country); locale lines may be omitted
NATL = (lambda k: '') if EN_ONLY else (lambda k: LOC['lines'][k])
VIRAL = os.environ.get('VIRAL', '1' if EN_ONLY else '0') == '1'   # viral mode (docs/CINE-SCENE-STANDARD.md §7): requested by default in English-only; a lesson opts in by defining VIRAL_HOOK inside `if VIRAL:`
KAR = ('Karaoke', 'Cap'); PUNCH = {}; SFX = []; KEYWORDS = set(); CAP_FS = 72; VHOOK_DUR = 1.2; CUR_FS = None
if RTL:
    import arabic_reshaper; from bidi import get_display
import re
def shp(s):
    """RTL: isolate embedded English (LRI..PDI) so its punctuation stays with it, force RTL paragraph direction, then shape + reorder."""
    if not RTL: return s
    s = re.sub(r"([A-Za-z][A-Za-z0-9 ,.'’…?!:]*[A-Za-z0-9…?!.])", "\u2066\\1\u2069", s)
    return get_display(arabic_reshaper.reshape(s), base_dir='R').replace('\u2066', '').replace('\u2069', '').translate(str.maketrans('«»', '»«'))   # python-bidi leaves guillemets unmirrored next to isolates -> mirror explicitly
def fnat(size):
    f = ImageFont.truetype(FONT_N, size)
    try: f.set_variation_by_name('Bold')
    except Exception: pass
    return f
def wrapw(dr, txt, fnt, maxw, shape=False):
    out, cur = [], ''
    for w in txt.split(' '):
        nx = (cur + ' ' + w).strip()
        if dr.textlength(shp(nx) if shape else nx, font=fnt) <= maxw: cur = nx
        else: out.append(cur); cur = w
    out.append(cur); return [shp(l) if shape else l for l in out]
def wdur(k): return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f'{VIS}/{k}.wav']))
def CDIR(clip, kind):   # 'bank:clip' -> that scene bank's dl24/meta (B-roll reuse); plain id -> anchor bank
    if ':' in clip: b, c = clip.split(':', 1); return f'{LIB}/{b}/{kind}/{c}'
    return f'{D}/{kind}/{clip}'
def M(clip, who): return L.Mouth(CDIR(clip, 'meta') + f'/{who}')
def line(k, at, tempo=None):
    if tempo is None:
        nx = [x for x in CUES[k] if x['value'] != 'X']; span = nx[-1]['end'] - nx[0]['start']; need = len(TEXT[k]) / 14.8 - 0.48
        tempo = 1.0 if need <= span else max(0.85, round(span / need - 0.005, 3))
    return dict(id=k, cues=CUES[k], at=at, tempo=tempo, dur=wdur(k) / tempo)
def rng(a, b): return list(range(a, b))
S = []
def shot(id, clip, dur, frames, mouths, lines, boards=False, ov=(), foley=()):
    n = int(round(dur * FPS)); fr = frames(n); assert len(fr) == n, (id, len(fr), n)
    S.append(dict(id=id, clip=clip, n=n, dur=n / FPS, frames=fr, mouths=mouths, lines=lines, boards=boards, ov=list(ov), foley=list(foley)))
def SCENE_AMB():   # scene room tone: tools/amb_<scene>.wav (cafe: amb_cafe.wav = pre-mix of the two Kling-clip beds), else any amb_*.wav
    import glob as _g; c = sorted(_g.glob(f'{D}/amb_*.wav')); assert c, 'no amb_*.wav in ' + D; return c[0]
# ------------------------------------------------------------------ script (≤ 40 s)
exec(open(f'{D}/lessons/{LID}.py').read())
VIRAL = VIRAL and 'VIRAL_HOOK' in globals()   # old lessons never define it -> unchanged output
if VIRAL: OUT += os.environ.get('OUTSUF', '-v2').replace('-', '_'); os.makedirs(OUT, exist_ok=True)
LESSON = dict(META, goal=LOC['goal'], lang=LANG, link=ECO[META['area']]['link'], cta_en=ECO[META['area']]['cta'], cta=LOC['cta'] + ' lexkite.com', out=f'cine-{LID.replace("_", "-")}-{LANG}' + (os.environ.get('OUTSUF', '-v2') if VIRAL else '') + '.mp4')
t = 0.0
for s in S: s['t0'] = t; t += s['dur']
SCENE = t; AFST, AFD = (0.4, 0.4) if VIRAL else (0.5, 0.55); END = 0.0 if VIRAL else 2.5; TOTAL = SCENE + END   # viral: no logo end card (Follow chip in the last 0.6 s instead)
# footsteps synced to heel strikes (bank: frame indices where a foot lands, read from a feet-zoom contact sheet)
FOOT = dict({'c14_entrance': [26, 43, 61, 77, 95]}, **globals().get('FOOT_EXTRA', {}))
import foley as FL
for s in S:
    for k, (fw, at) in enumerate(s['foley']):
        if fw != 'steps': continue
        ts = [s['frames'].index(f) / FPS - 0.01 for f in FOOT[s['clip']] if f in s['frames']]
        assert ts, ('no footfall inside shot', s['id'])
        FL.save(f'{OUT}/steps_{s["id"]}.wav', FL.footsteps([max(0, x) for x in ts], s['dur'] + 0.3)); s['foley'][k] = (f'{OUT}/steps_{s["id"]}.wav', 0.0)
# ------------------------------------------------------------------ render shots (clip renders are language-independent -> shared cache)
SH = f'{D}/render5_shots'; os.makedirs(SH, exist_ok=True)
for s in S:
    key = f'{s["id"]}_{s["clip"].replace(":", "__")}_{s["frames"][0]}_{s["frames"][-1]}_{s["n"]}_' + '-'.join(l['id'] + str(l['at']) for _, _, ls in s['mouths'] for l in ls); mp4 = f'{SH}/{key}.mp4'; s['mp4'] = mp4
    if os.path.exists(mp4): continue
    sp = [dict(mouth=M(c, w), lines=ls) for c, w, ls in s['mouths']]
    src = CDIR(s['clip'], 'dl24') + '.mp4'; src = src if os.path.exists(src) else f'{D}/dl/{s["clip"]}.mp4'
    frames, log = L.render(src, s['frames'], sp, s['boards'])
    pr = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1080x1920', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-threads', TH, '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', mp4], stdin=subprocess.PIPE)
    for F in frames: pr.stdin.write(F.tobytes())
    pr.stdin.close(); pr.wait(); json.dump(log, open(mp4[:-4] + '.vis.json', 'w')); print('shot', s['id'], s['n'])
def punch(src, t0, z1=1.08, d=0.4):
    dst = src[:-4] + f'_p{t0:.2f}.mp4'
    if os.path.exists(dst): return dst
    cap = cv2.VideoCapture(src); pr = subprocess.Popen(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'bgr24', '-s', '1080x1920', '-r', str(FPS), '-i', '-', '-c:v', 'libx264', '-threads', TH, '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', dst], stdin=subprocess.PIPE); i = 0
    while True:
        ok, F = cap.read()
        if not ok: break
        u = min(1, max(0, (i / FPS - t0) / d)); z = 1 + (z1 - 1) * (1 - (1 - u) ** 2)
        M_ = np.float32([[z, 0, 540 * (1 - z)], [0, z, 960 * (1 - z)]]); pr.stdin.write(cv2.warpAffine(F, M_, (1080, 1920), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT).tobytes()); i += 1
    pr.stdin.close(); pr.wait(); return dst
for s in S:
    if s['id'] in PUNCH: s['vis'] = s['mp4'][:-4] + '.vis.json'; s['mp4'] = punch(s['mp4'], PUNCH[s['id']])
# ------------------------------------------------------------------ overlays
BOX = []; ev = []
def card(dr, y0, w, h, fill): x0 = CX - w / 2; dr.rounded_rectangle([x0, y0, x0 + w, y0 + h], radius=34, fill=fill, outline=(42, 43, 51, 255), width=5); return x0
def icon(dr, cx, cy, r, kind):   # drawn hook icons (no emoji font): 'grimace' face, else a gold disc with a short glyph ('?', '!', 'Zz')
    if kind == 'grimace':
        dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 201, 74, 255), outline=(42, 43, 51, 255), width=6)
        for sx in (-1, 1): dr.ellipse([cx + sx * r * 0.35 - 8, cy - r * 0.3 - 10, cx + sx * r * 0.35 + 8, cy - r * 0.3 + 10], fill=(42, 43, 51, 255))
        tw, th = r * 0.62, r * 0.24; dr.rounded_rectangle([cx - tw, cy + r * 0.18, cx + tw, cy + r * 0.18 + 2 * th], radius=10, fill=(255, 255, 255, 255), outline=(42, 43, 51, 255), width=5)
        dr.line([cx - tw, cy + r * 0.18 + th, cx + tw, cy + r * 0.18 + th], fill=(42, 43, 51, 255), width=4)
        for k in (-1, 0, 1): dr.line([cx + k * tw / 2, cy + r * 0.18, cx + k * tw / 2, cy + r * 0.18 + 2 * th], fill=(42, 43, 51, 255), width=4)
        return
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 201, 74, 255), outline=(42, 43, 51, 255), width=6); f = ImageFont.truetype(FONT_H, int(r * 1.15))
    bb = dr.textbbox((0, 0), kind, font=f); dr.text((cx - (bb[0] + bb[2]) / 2, cy - (bb[1] + bb[3]) / 2), kind, font=f, fill=(15, 61, 62, 255))
def face(dr, cx, cy, r, kind):   # simple drawn icons (no emoji font needed): angry vs smiling face
    if kind in ('cross', 'check'):   # wrong/right form (grammar contrast, not tone)
        col = (229, 63, 63, 255) if kind == 'cross' else (47, 191, 113, 255); dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col); w = (255, 255, 255, 255); q = r * 0.42
        if kind == 'cross': dr.line([cx - q, cy - q, cx + q, cy + q], fill=w, width=10); dr.line([cx - q, cy + q, cx + q, cy - q], fill=w, width=10)
        else: dr.line([cx - q * 1.1, cy + 2, cx - q * 0.25, cy + q * 0.9, cx + q * 1.2, cy - q * 0.8], fill=w, width=10, joint='curve')
        return
    col = (229, 80, 47, 255) if kind == 'angry' else (47, 191, 113, 255)
    dr.ellipse([cx - r, cy - r, cx + r, cy + r], fill=(255, 201, 74, 255), outline=col, width=6)
    for sx in (-1, 1): dr.ellipse([cx + sx * r * 0.35 - 6, cy - r * 0.15 - 6, cx + sx * r * 0.35 + 6, cy - r * 0.15 + 6], fill=(42, 43, 51, 255))
    if kind == 'angry':
        for sx in (-1, 1): dr.line([cx + sx * r * 0.55, cy - r * 0.5, cx + sx * r * 0.15, cy - r * 0.32], fill=(42, 43, 51, 255), width=6)
        dr.arc([cx - r * 0.45, cy + r * 0.2, cx + r * 0.45, cy + r * 0.75], 200, 340, fill=(42, 43, 51, 255), width=6)
    else:
        dr.arc([cx - r * 0.5, cy - r * 0.1, cx + r * 0.5, cy + r * 0.6], 20, 160, fill=(42, 43, 51, 255), width=6)
RING_Y = dict({'ring1': 1080}, **globals().get('RING_EXTRA', {})); SHOT_ID = None
def png(style, txt, k, sub=None):
    global CUR_FS
    im = Image.new('RGBA', (1080, 1920), (0, 0, 0, 0)); dr = ImageDraw.Draw(im); box = None; CUR_FS = None
    if style == 'Cap':   # viral CapCut-style caption: ONE line ~72 px, 2-4 word pages of the verbatim line, active word gold, spec keywords green
        en = txt.split('||')[0]; fe = ImageFont.truetype(FONT_EN, CAP_FS); CUR_FS = CAP_FS; ws = en.split(' '); pages, cur = [], []
        for i, w in enumerate(ws):
            if cur and (len(cur) >= 4 or dr.textlength(' '.join(ws[j] for j in cur + [i]), font=fe) > MAXW - 40): pages.append(cur); cur = []
            cur.append(i)
        pages.append(cur); pg = next(p for p in pages if (sub or 0) in p); sp = dr.textlength(' ', font=fe)
        wid = [dr.textlength(ws[j], font=fe) for j in pg]; x = CX - (sum(wid) + sp * (len(pg) - 1)) / 2; y = SAFE['y1'] - 14 - CAP_FS - 18; box = [x - 8, y, x + sum(wid) + sp * (len(pg) - 1) + 8, y + CAP_FS + 24]
        for j, wd in zip(pg, wid):
            key = re.sub(r"[^a-z0-9']", '', ws[j].lower()) in KEYWORDS
            col = (255, 201, 74, 255) if j == sub else ((95, 220, 140, 255) if key else (255, 255, 255, 255))
            dr.text((x, y), ws[j], font=fe, fill=col, stroke_width=8, stroke_fill=(20, 24, 32, 255)); x += wd + sp
    elif style == 'VHook':   # viral hook: big text (>= 84 px) fitted into VHOOK_BOX (free wall area, never over a body), *word span* = gold, drawn icon as the last token
        en, ic = (txt.split('|') + [''])[:2]; ws = en.split(' '); cl = [w.strip('*') for w in ws]; hl, ins = [], False
        for w in ws: ins = ins or w.startswith('*'); hl.append(ins); ins = ins and not w.endswith('*')   # *several words* = one gold span
        bx0, by0, bx1, by1 = globals().get('VHOOK_BOX', (60, 236, 585, 552)); fs = 104   # box: wall left of Daniel, above Ama, left of the series chip
        while True:
            fh = ImageFont.truetype(FONT_H, fs); sp = dr.textlength(' ', font=fh); wd_ = [dr.textlength(c, font=fh) for c in cl] + ([fs * 0.95] if ic else []); lines, cur = [], []
            for i in range(len(wd_)):
                if cur and sum(wd_[j] for j in cur + [i]) + sp * len(cur) > bx1 - bx0 - 20: lines.append(cur); cur = []
                cur.append(i)
            lines.append(cur)
            if len(lines) * fs * 1.1 <= by1 - by0 or fs <= 84: break
            fs -= 4
        CUR_FS = fs; y = by0; box = [bx1, by0, bx0, by0]; cxb = (bx0 + bx1) / 2
        for ln_ in lines:
            tw = sum(wd_[j] for j in ln_) + sp * (len(ln_) - 1); x = cxb - tw / 2; box[0] = min(box[0], x - 10); box[2] = max(box[2], x + tw + 10)
            for j in ln_:
                if j == len(cl): icon(dr, x + fs * 0.47, y + fs * 0.55, fs * 0.45, ic)
                else: dr.text((x, y), cl[j], font=fh, fill=(255, 201, 74, 255) if hl[j] else (255, 255, 255, 255), stroke_width=10, stroke_fill=(20, 24, 32, 255))
                x += wd_[j] + sp
            y += int(fs * 1.1)
        box[3] = y + 6
    elif style == 'Series':   # series chip, top-right ("Hotel English #3")
        f = ImageFont.truetype(FONT_EN, 34); w = dr.textlength(txt, font=f); y0 = globals().get('SERIES_Y', 240); x1 = SAFE['x1'] if globals().get('SERIES_ALIGN', 'right') == 'right' else SAFE['x0'] + w + 44
        dr.rounded_rectangle([x1 - w - 44, y0, x1, y0 + 58], radius=29, fill=(15, 61, 62, 230)); dr.text((x1 - w - 22, y0 + 7), txt, font=f, fill=(255, 247, 234, 255)); box = [x1 - w - 44, y0, x1, y0 + 58]
    elif style == 'Follow':   # last 0.6 s instead of the logo end card: small corner chip (bottom-right)
        a_, b_ = txt.split('|'); f1 = ImageFont.truetype(FONT_EN, 36); f2 = ImageFont.truetype(FONT_EN, 42); x1 = SAFE['x1']; yb = SAFE['y1'] - 10
        w2 = dr.textlength(b_, font=f2); dr.rounded_rectangle([x1 - w2 - 48, yb - 68, x1, yb], radius=34, fill=(255, 201, 74, 255)); dr.text((x1 - w2 - 24, yb - 62), b_, font=f2, fill=(15, 61, 62, 255))
        w1 = dr.textlength(a_, font=f1); dr.rounded_rectangle([x1 - w1 - 44, yb - 140, x1, yb - 80], radius=30, fill=(15, 61, 62, 235)); dr.text((x1 - w1 - 22, yb - 133), a_, font=f1, fill=(255, 247, 234, 255))
        box = [x1 - max(w1 + 44, w2 + 48), yb - 140, x1, yb]
    elif style in ('Sub', 'Karaoke'):
        en, nat = txt.split('||'); fe = ImageFont.truetype(FONT_EN, 52 if nat else 58); fn = fnat(40); LH = 68 if nat else 76
        le = wrapw(dr, en, fe, MAXW - 40); ln = wrapw(dr, nat, fn, MAXW - 40, True) if nat else []; assert len(le) <= 2 and len(ln) <= 2, txt
        he = LH * len(le); yb = SAFE['y1'] - 14; yN = yb - 2 * 54 if nat else yb - 4; y = yN - 10 - he; box = [1080, y, 0, yb]   # fixed anchor: EN grows up, native grows down
        words = en.split(' '); wi = 0
        for l in le:
            w = dr.textlength(l, font=fe); x = CX - w / 2; box[0] = min(box[0], x); box[2] = max(box[2], x + w)
            if style == 'Karaoke':   # word-by-word highlight (index = sub)
                for wd in l.split(' '):
                    col = (255, 201, 74, 255) if wi == sub else (255, 255, 255, 255)
                    dr.text((x, y), wd, font=fe, fill=col, stroke_width=7, stroke_fill=(20, 24, 32, 255)); x += dr.textlength(wd + ' ', font=fe); wi += 1
            else: dr.text((x, y), l, font=fe, fill=(255, 255, 255, 255), stroke_width=7, stroke_fill=(20, 24, 32, 255))
            y += LH
        y += 10
        for l in ln:
            w = dr.textlength(l, font=fn); x = CX - w / 2; box[0] = min(box[0], x); box[2] = max(box[2], x + w)
            dr.text((x, y), l, font=fn, fill=(255, 231, 194, 255), stroke_width=6, stroke_fill=(20, 24, 32, 255)); y += 54
        box = [box[0] - 7, box[1], box[2] + 7, box[3]]
    elif style == 'Hook':
        en, nat = txt.split('|'); fh = ImageFont.truetype(FONT_H, 84); fn = fnat(46); y = globals().get('HOOK_Y', 330)   # lesson may move the hook off a high face
        while dr.textlength(en, font=fh) > MAXW - 18: fh = ImageFont.truetype(FONT_H, fh.size - 2)
        w = dr.textlength(en, font=fh); dr.text((CX - w / 2, y), en, font=fh, fill=(255, 255, 255, 255), stroke_width=9, stroke_fill=(20, 24, 32, 255))
        ln = wrapw(dr, nat, fn, MAXW - 40, True) if nat else []; y2 = y + 104; wmax = w
        for l in ln:
            w2 = dr.textlength(l, font=fn); wmax = max(wmax, w2); dr.text((CX - w2 / 2, y2), l, font=fn, fill=(255, 231, 194, 255), stroke_width=6, stroke_fill=(20, 24, 32, 255)); y2 += 60
        box = [CX - wmax / 2 - 9, y, CX + wmax / 2 + 9, y2]
    elif style == 'Badge':
        lv, goal = txt.split('|'); f = ImageFont.truetype(FONT_EN, 38); fn = fnat(38); g = shp(goal); w1 = dr.textlength(lv, font=f); w2 = dr.textlength(g, font=fn)
        x0, y0 = SAFE['x0'], globals().get('BADGE_Y', 240); x1 = x0 + 28 + w1 + 22 + w2 + 28
        dr.rounded_rectangle([x0, y0, x1, y0 + 62], radius=31, fill=(15, 61, 62, 235)); dr.rounded_rectangle([x0 + 6, y0 + 6, x0 + 6 + w1 + 40, y0 + 56], radius=25, fill=(255, 201, 74, 255))
        dr.text((x0 + 26, y0 + 9), lv, font=f, fill=(15, 61, 62, 255)); dr.text((x0 + 28 + w1 + 34, y0 + 7), g, font=fn, fill=(255, 247, 234, 255)); box = [x0, y0, x1, y0 + 62]
    elif style == 'Contrast':   # visual contrast instead of reading: two columns + ONE native sentence
        y0 = globals().get('CONTRAST_Y', 250); colw = (MAXW - 30) / 2; h = 330; fe = ImageFont.truetype(FONT_EN, 44); fn = fnat(40); fs = fnat(38)
        for j, (en, kind, gl) in enumerate(globals().get('CONTRAST_BY', {}).get(SHOT_ID, CONTRAST)):
            x0 = SAFE['x0'] + j * (colw + 30); fill = (255, 236, 230, 248) if kind in ('angry', 'cross') else (225, 245, 232, 248)
            dr.rounded_rectangle([x0, y0, x0 + colw, y0 + h], radius=30, fill=fill, outline=(42, 43, 51, 255), width=5)
            face(dr, x0 + colw / 2, y0 + 68, 46, kind); yy = y0 + 132
            for l in wrapw(dr, en, fe, colw - 40):
                w = dr.textlength(l, font=fe); dr.text((x0 + colw / 2 - w / 2, yy), l, font=fe, fill=(42, 43, 51, 255)); yy += 54
            g = shp('= ' + gl) if not RTL else shp(gl)
            w = dr.textlength(g, font=fn); dr.text((x0 + colw / 2 - w / 2, y0 + h - 64), g, font=fn, fill=(229, 80, 47, 255) if kind in ('angry', 'cross') else (23, 120, 70, 255))
        ln = wrapw(dr, txt, fs, MAXW - 40, True); yy = y0 + h + 18; hb = 56 * len(ln) + 24
        dr.rounded_rectangle([SAFE['x0'], yy, SAFE['x1'], yy + hb], radius=26, fill=(15, 61, 62, 235))
        for l in ln:
            w = dr.textlength(l, font=fs); dr.text((CX - w / 2, yy + 10), l, font=fs, fill=(255, 247, 234, 255)); yy += 56
        box = [SAFE['x0'], y0, SAFE['x1'], y0 + h + 18 + hb]
    elif style == 'Ring':   # 2 s practice pause with a progress ring (sub = 0..12)
        en, nat = txt.split('|'); arrow = en.endswith('👇'); en = en.replace('👇', '').strip(); fe = ImageFont.truetype(FONT_EN, 58 if VIRAL else 50); fn = fnat(42); le = wrapw(dr, en, fe, MAXW - (300 if arrow else 220)); ln = wrapw(dr, nat, fn, MAXW - 220, True) if nat else []
        LHr = 70 if VIRAL else 62; h = 40 + LHr * len(le) + 56 * len(ln) + 20; h = max(h, globals().get('RING_MINH', 190)); y0 = RING_Y.get(SHOT_ID, 250); x0 = card(dr, y0, MAXW, h, (255, 247, 234, 248))
        cx, cy, r = x0 + 95, y0 + h / 2, 62
        dr.ellipse([cx - r, cy - r, cx + r, cy + r], outline=(220, 214, 200, 255), width=14)
        if sub: dr.arc([cx - r, cy - r, cx + r, cy + r], -90, -90 + 360 * sub / 12, fill=(229, 80, 47, 255), width=14)
        if arrow:   # comment bait -> speech bubble (not a mic)
            dr.rounded_rectangle([cx - 30, cy - 24, cx + 30, cy + 14], radius=12, fill=(15, 61, 62, 255)); dr.polygon([(cx - 14, cy + 12), (cx - 2, cy + 12), (cx - 18, cy + 28)], fill=(15, 61, 62, 255))
            for dx in (-14, 0, 14): dr.ellipse([cx + dx - 4, cy - 9, cx + dx + 4, cy - 1], fill=(255, 247, 234, 255))
        else: mic = [cx - 12, cy - 26, cx + 12, cy + 8]; dr.rounded_rectangle(mic, radius=12, fill=(15, 61, 62, 255)); dr.arc([cx - 22, cy - 12, cx + 22, cy + 22], 0, 180, fill=(15, 61, 62, 255), width=5); dr.line([cx, cy + 22, cx, cy + 32], fill=(15, 61, 62, 255), width=5)
        yy = y0 + 30
        if len(le) == 1: yy = y0 + h / 2 - LHr / 2 - 4
        for l in le: dr.text((x0 + 190, yy), l, font=fe, fill=(42, 43, 51, 255)); yy += LHr
        for l in ln: dr.text((x0 + 190, yy), l, font=fn, fill=(23, 89, 90, 255)); yy += 56
        if arrow:   # drawn "point down to the comments" arrow
            ax = x0 + MAXW - 70; dr.rectangle([ax - 11, cy - 46, ax + 11, cy + 4], fill=(229, 80, 47, 255)); dr.polygon([(ax - 36, cy + 2), (ax + 36, cy + 2), (ax, cy + 46)], fill=(229, 80, 47, 255))
        box = [x0, y0, x0 + MAXW, y0 + h]
    elif style == 'Tag':   # quiz option label: big A / B chip, top-left of the safe zone
        f = ImageFont.truetype(FONT_H, 92); x0, y0 = SAFE['x0'], 330; dr.rounded_rectangle([x0, y0, x0 + 150, y0 + 150], radius=40, fill=(255, 201, 74, 255), outline=(42, 43, 51, 255), width=6)
        w = dr.textlength(txt, font=f); dr.text((x0 + 75 - w / 2, y0 + 18), txt, font=f, fill=(15, 61, 62, 255)); box = [x0, y0, x0 + 150, y0 + 150]
    elif style == 'Recap':
        en, nat = txt.split('|'); fe = ImageFont.truetype(FONT_EN, 56); fn = fnat(42); g = shp(nat)
        while dr.textlength(en, font=fe) + 88 > MAXW: fe = ImageFont.truetype(FONT_EN, fe.size - 2)   # auto-fit long recaps
        w = max(dr.textlength(en, font=fe), dr.textlength(g, font=fn)) + 88; h = 168 if nat else 104; y0 = 1130; x0 = card(dr, y0, w, h, (225, 245, 232, 250))
        dr.text((CX - dr.textlength(en, font=fe) / 2, y0 + 24), en, font=fe, fill=(42, 43, 51, 255)); dr.text((CX - dr.textlength(g, font=fn) / 2, y0 + 98), g, font=fn, fill=(23, 89, 90, 255)); box = [x0, y0, x0 + w, y0 + h]
    elif style in TPL_STYLES: box = TPL_STYLES[style](im, dr, txt, sub)
    pth = f'{OUT}/ov{k}_{sub if sub is not None else 0}.png'; im.save(pth); return pth, [int(v) for v in box]
exec(open(f'{CODE}/tpl_styles.py').read())   # Choice / Gap / Ladder / Strike / Pov (content/video/cine/templates.md)
def spans(c, tempo, at):
    nx = [x for x in c if x['value'] != 'X']; return at + nx[0]['start'] / tempo, at + nx[-1]['end'] / tempo
CAPSTYLE = globals().get('CAPSTYLE', {})
ALLSHOTS = globals().get('ALLSHOTS_OV', [])
if VIRAL and globals().get('SERIES'):   # series chip on the hook + loop shots (wide master: no face under the top-right corner; punch-ins push faces into it)
    for s in S:
        if s['id'] in globals().get('SERIES_SHOTS', ('hook', 'loop')): s['ov'].append(('Series', 0.0, None, SERIES, None))
def word_ev(style, s, ln, a, b, txt):   # word-by-word timing (char-proportional over the Rhubarb speech span), shared by Karaoke and Cap
    words = TEXT[ln['id']].split(' '); wl = np.array([len(w) + 1.5 for w in words]); cum = np.concatenate([[0], np.cumsum(wl)]) / wl.sum()
    tb = a + cum * (b - a)
    if style == 'Cap':   # viral: snap each word boundary to the nearest Rhubarb cue boundary (+-0.15 s), keep order, >= 0.08 s per word
        cb = np.array(sorted({ln['at'] + x['start'] / ln['tempo'] for x in ln['cues']} | {ln['at'] + x['end'] / ln['tempo'] for x in ln['cues']}))
        for i in range(1, len(words)):
            c = cb[np.argmin(np.abs(cb - tb[i]))]
            if abs(c - tb[i]) <= 0.15: tb[i] = c
            tb[i] = min(max(tb[i], tb[i - 1] + 0.08), b - 0.08 * (len(words) - i))
    for i in range(len(words)):
        ws = s['t0'] + tb[i]; we = s['t0'] + tb[i + 1]
        ev.append([style, (s['t0'] + a - 0.09) if i == 0 else ws, (s['t0'] + b + 0.39) if i == len(words) - 1 else we, txt, s['id'], ln['id'], i])
for st_, txt_, sub_ in ALLSHOTS:   # overlay on every shot (e.g. Pov chip); identical consecutive overlays chain without a blink
    for s in S:
        if s['id'] not in globals().get('ALLSHOTS_SKIP', ()): s['ov'].append((st_, 0.0, None, txt_, sub_))   # (auto lessons skip hook + loop: the hook owns the wall, the loop stays clean)
for s in S:
    end = s['t0'] + s['dur']; kar = next((o[3] for o in s['ov'] if o[0] == 'Karaoke'), None)
    for who, ln in s['lines']:
        a, b = spans(ln['cues'], ln['tempo'], ln['at']); txt = TEXT[ln['id']] + '||' + NATL(ln['id'])
        if s['id'] in CAPSTYLE:   # template caption: Gap/Strike/Karaoke(keyword index) as one event, or None = no caption
            cst, csub = CAPSTYLE[s['id']]
            if VIRAL and cst == 'Karaoke': KEYWORDS.add(re.sub(r"[^a-z0-9']", '', TEXT[ln['id']].split(' ')[csub].lower())); word_ev('Cap', s, ln, a, b, txt)
            elif cst: ev.append([cst, s['t0'] + a - 0.09, s['t0'] + b + 0.39, txt, s['id'], ln['id'], csub])
            continue
        if VIRAL: word_ev('Cap', s, ln, a, b, txt)
        elif kar and ln['id'] == kar: word_ev('Karaoke', s, ln, a, b, txt)
        else: ev.append(['Sub', s['t0'] + a - 0.09, s['t0'] + b + 0.39, txt, s['id'], ln['id'], None])
    for o in s['ov']:
        st, a, b, txt = o[:4]; osub = o[4] if len(o) > 4 else None
        if st == 'Karaoke': continue   # (viral: every spoken line is already a Cap karaoke)
        a = s['t0'] + a; b = (s['t0'] + b) if b is not None else end - 0.04
        if st == 'Ring':
            for i in range(13): ev.append(['Ring', a + i * (b - a) / 13, a + (i + 1) * (b - a) / 13, txt, s['id'], None, i])
        else: ev.append([st, a, b, txt, s['id'], None, osub])
ev.sort(key=lambda e: e[1])
iscap = lambda e: e[0] in ('Sub', 'Karaoke', 'Cap') or (e[0] in ('Gap', 'Strike') and e[5] is not None)   # captions = overlays bound to a spoken line
subs = [e for e in ev if (iscap(e) and e[0] not in KAR) or (e[0] in KAR and (e[6] == 0 or e[4] in CAPSTYLE))]
for x, y in zip(subs, subs[1:]):
    if x[0] not in KAR: x[2] = min(x[2], y[1] - 0.07)
for e in ev:
    if iscap(e):
        sh = [s for s in S if s['id'] == e[4]][0]; e[2] = min(e[2], sh['t0'] + sh['dur'] - 0.04)
import math
snap = lambda x: round(x * FPS) / FPS
for e in ev:   # starts snap UP onto the frame grid (lead-in stays within -0.10 s), ends to nearest frame
    e[1] = math.floor((e[1] + 0.035) * FPS + 1e-6) / FPS if iscap(e) else snap(e[1])   # lead -0.09 -> [-0.097, -0.055] after flooring; e[2] = max((math.floor(e[2] * FPS + 1e-6) / FPS) if e[0] in ('Sub', 'Karaoke', 'Cap') else snap(e[2]), e[1] + 1 / FPS)
fam = lambda e: 'text' if iscap(e) else ('ring:' + e[4] if e[0] == 'Ring' else (e[0], e[3]))   # same overlay (any sub state) repeated on consecutive shots = one continuous card
FIN, FOUT = set(), set()
for k, e in enumerate(ev): FIN.add(k); FOUT.add(k)
for k, e in enumerate(ev):
    if e[0] in ('VHook', 'Series') and e[1] < 0.05: FIN.discard(k)   # frame 0 shows the hook fully (cover + loop)
for f in {fam(e) for e in ev if fam(e)}:
    ks = sorted([k for k, e in enumerate(ev) if fam(e) == f], key=lambda k: ev[k][1])
    for x, y in zip(ks, ks[1:]):
        if ev[y][1] - ev[x][2] < 0.5 and not (iscap(ev[x]) and ev[y][1] - ev[x][2] > 0.22):   # short gap (a caption is stretched at most 0.22 s: qa5 end <= +0.62 s) -> swap pages on the same frame (a blank 1-12 frame gap reads as a blink)
            ev[x][2] = ev[y][1]; FOUT.discard(x); FIN.discard(y)
ovs = []
for k, e in enumerate(ev):
    SHOT_ID = e[4]; pth, box = png(e[0], e[3], k, e[6]); ovs.append((pth, e[1], e[2], e[0])); BOX.append(dict(style=e[0], text=e[3], t=[round(e[1], 3), round(e[2], 3)], shot=e[4], line=e[5], part=e[6], box=box, **({'fs': CUR_FS} if CUR_FS else {})))
OFF = {}
if VIRAL or globals().get('PLACE'): exec(open(f'{CODE}/place.py').read())   # overlay placer: faces / bodies / other cards (viral lessons; old v1/v2 renders unchanged)
if VIRAL:   # SFX: "pop" when a card appears / changes state, soft "whoosh" on cuts into or out of a non-dialogue shot
    last = {}
    for k, e in enumerate(ev):
        if e[0] not in ('VHook', 'Choice', 'Ring', 'Tag', 'Ladder', 'Recap', 'Follow', 'Strike', 'Gap', 'Card') or (e[0] in ('Strike', 'Gap') and e[6] in (0, None)): continue
        f_ = fam(e); new = k in FIN and e[0] not in ('Strike', 'Gap')   # entrances only (state changes are silent)
        last[f_] = e[6]
        if new and (e[0] != 'Ring' or e[6] == 0) and all(abs(e[1] - x) >= 1.95 for _, x in SFX): SFX.append((globals().get('FD', D + '/foley/') + 'pop.wav', e[1]))
    for x, y in zip(S, S[1:]):
        if x['clip'] != y['clip'] and (not x['lines'] or not y['lines']): SFX.append((globals().get('FD', D + '/foley/') + 'whoosh.wav', max(0, y['t0'] - 0.22)))
# ------------------------------------------------------------------ localized end card
def end_card():
    W, H = 1080, 1920; im = Image.new('RGB', (W, H)); dr = ImageDraw.Draw(im)
    for y in range(H): k = y / H; dr.line([(0, y), (W, y)], fill=(int(15 + 8 * k), int(61 + 28 * k), int(62 + 28 * k)))
    kit = Image.open(f'{D}/end/kit.png').convert('RGBA').resize((420, 420)); im.paste(kit, (int(CX - 210), 560), kit)
    f = ImageFont.truetype(FONT_H, 140); wl = dr.textlength('lex', font=f); wk = dr.textlength('kite', font=f); x = CX - (wl + wk) / 2; y = 1010
    dr.text((x, y), 'lex', font=f, fill=(255, 247, 234))
    g = Image.new('RGBA', (int(wk) + 4, 190)); gd = ImageDraw.Draw(g)
    for xx in range(g.width): k = xx / g.width; gd.line([(xx, 0), (xx, 190)], fill=(int(229 + 26 * k), int(80 + 96 * k), int(47 + 37 * k), 255))
    m = Image.new('L', g.size, 0); ImageDraw.Draw(m).text((0, 0), 'kite', font=f, fill=255); im.paste(g, (int(x + wl), y), m)
    fn = fnat(48); ls = wrapw(dr, LOC['cta'], fn, MAXW - 60, True); yy = 1215; EB = [[x, y, x + wl + wk, y + 180]]
    for l in ls:
        w = dr.textlength(l, font=fn); dr.text((CX - w / 2, yy), l, font=fn, fill=(255, 231, 194)); EB.append([CX - w / 2, yy, CX + w / 2, yy + 62]); yy += 64
    f3 = ImageFont.truetype(FONT_EN, 60); u = 'lexkite.com'; uw = dr.textlength(u, font=f3); yy += 18
    dr.rounded_rectangle([CX - uw / 2 - 44, yy, CX + uw / 2 + 44, yy + 100], radius=50, fill=(255, 201, 74)); dr.text((CX - uw / 2, yy + 14), u, font=f3, fill=(15, 61, 62)); EB.append([CX - uw / 2 - 44, yy, CX + uw / 2 + 44, yy + 100])
    im.save(f'{OUT}/endcard.png'); return EB
ENDBOX = [] if VIRAL else end_card()
# ------------------------------------------------------------------ mux
inp, fc = [], []
for i, s in enumerate(S): inp += ['-i', s['mp4']]; fc.append(f'[{i}:v]setsar=1,format=yuv420p[v{i}]')
n = len(S)
if END > 0:
    inp += ['-loop', '1', '-framerate', str(FPS), '-t', f'{END:.3f}', '-i', f'{OUT}/endcard.png']
    fc.append(f'[{n}:v]format=yuv420p,setsar=1,fade=t=in:st=0:d=0.25[ve]'); fc.append(''.join(f'[v{i}]' for i in range(n)) + f'[ve]concat=n={n + 1}:v=1:a=0[vall]')
else: inp += ['-f', 'lavfi', '-i', 'nullsrc=s=16x16:d=0.1']; fc.append(''.join(f'[v{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=0[vall]')   # dummy input keeps input indices (n+1 = overlay)
NF = int(round(TOTAL * FPS)); LAY = f'{OUT}/overlay.mov'
IMG = []
for k, (pth, a, b, st) in enumerate(ovs):
    im = Image.open(pth); bb = im.getbbox() or (0, 0, 1, 1); arr = np.asarray(im.crop(bb)).astype(np.float32) / 255
    dx_, dy_ = OFF.get(k, (0, 0)); bb = (bb[0] + dx_, bb[1] + dy_, bb[2] + dx_, bb[3] + dy_)   # placer shift
    fd = (0.125 if st in ('Sub', 'Karaoke', 'Ring', 'Gap', 'Strike') else 0.16)
    IMG.append((bb, arr, int(round(a * FPS)), int(round(b * FPS)), fd if k in FIN else 0, fd if k in FOUT else 0))
pl = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', '1080x1920', '-r', str(FPS), '-i', '-', '-c:v', 'qtrle', LAY], stdin=subprocess.PIPE)
for i in range(NF):
    acc = np.zeros((1920, 1080, 4), np.float32)   # premultiplied RGBA
    for bb, arr, f0, f1, fi, fo in IMG:
        if not f0 <= i < f1: continue
        op = 1.0
        if fi: op = min(op, (i - f0 + 1) / (fi * FPS))
        if fo: op = min(op, (f1 - i) / (fo * FPS))
        al = arr[..., 3:4] * min(1.0, op); reg = acc[bb[1]:bb[3], bb[0]:bb[2]]
        reg[..., :3] = arr[..., :3] * al + reg[..., :3] * (1 - al); reg[..., 3:] = al + reg[..., 3:] * (1 - al)
    a = acc[..., 3:4]; rgb = np.where(a > 0, acc[..., :3] / np.maximum(a, 1e-6), 0)
    pl.stdin.write((np.concatenate([rgb, a], 2) * 255 + 0.5).clip(0, 255).astype(np.uint8).tobytes())
pl.stdin.close(); pl.wait()
inp += ['-i', LAY]; fc.append(f'[{n + 1}:v]format=rgba[lay]'); fc.append('[vall][lay]overlay=0:0:eof_action=pass:format=auto[vov]'); cur = 'vov'; j = n + 2
fc.append(f'[{cur}]null[vo]')
vl = []
for s in S:
    for who, ln in s['lines']:
        d = int(round((s['t0'] + ln['at']) * 1000)); inp += ['-i', f'{VIS}/{ln["id"]}.wav']
        fc.append(f'[{j}:a]aresample=48000,aformat=channel_layouts=stereo,atempo={ln["tempo"]},afade=t=in:d=0.01,afade=t=out:st={ln["dur"] - 0.03:.3f}:d=0.03,adelay={d}|{d}[va{j}]'); vl.append(f'[va{j}]'); j += 1
    for fw, at in s['foley']:
        d = int(round((s['t0'] + at) * 1000)); inp += ['-i', fw if fw.startswith('/') else f'{D}/{fw}']
        fc.append(f'[{j}:a]aresample=48000,aformat=channel_layouts=stereo,volume=0.55,adelay={d}|{d}[va{j}]'); vl.append(f'[va{j}]'); j += 1
for fw, at in SFX:   # viral SFX at their own level (-22/-26 dBFS peak files), no extra gain
    d = int(round(at * 1000)); inp += ['-i', fw]; fc.append(f'[{j}:a]aresample=48000,aformat=channel_layouts=stereo,adelay={d}|{d}[va{j}]'); vl.append(f'[va{j}]'); j += 1
pass   # (anullsrc bed removed: deadlocked the mux; lessons anchor t=0 with foley/tone0.wav instead)
fc.append(''.join(vl) + f'amix=inputs={len(vl)}:normalize=0,apad,atrim=0:{TOTAL:.3f}[voice]')
AMB_DB_ = globals().get('AMB_DB', -17)   # hotel/cafe/airport/restaurant bed -17 dB; anchor lessons set their own
inp += ['-stream_loop', '-1', '-i', globals().get('AMB') or SCENE_AMB()]   # studio room tone (or the topic scene's ambience)
fc.append(f'[{j}:a]anull,highpass=f=150,lowpass=f=9000,volume={AMB_DB_}dB,aresample=48000,aformat=channel_layouts=stereo,atrim=0:{TOTAL:.3f},afade=t=in:d=0.05,afade=t=out:st={SCENE - AFST:.3f}:d={AFD}[amb]')
fc.append(f'[voice][amb]amix=inputs=2:normalize=0:duration=first,loudnorm=I=-16:TP=-1.5:LRA=9,afade=t=out:st={SCENE - AFST:.3f}:d={AFD},apad,atrim=0:{TOTAL:.3f}[ao]')
out = f'{OUTDIR}/{LESSON["out"]}'
subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-filter_complex_threads', TH, *inp, '-filter_complex', ';'.join(fc), '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-threads', TH, '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', str(FPS),
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out], check=True)
import re as _re   # 2nd pass: one-pass loudnorm drifts (-18 LUFS seen) -> measure and correct the AAC track to -16 LUFS
_m = subprocess.run(['ffmpeg', '-nostdin', '-i', out, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr; _I = float(_re.findall(r'I:\s+(-?[\d.]+) LUFS', _m)[-1])
print('loudness pass1', _I)
if abs(_I + 16) > 0.4:
    subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', out, '-c:v', 'copy', '-af', f'volume={-16 - _I:.2f}dB,alimiter=limit=0.84:level=0', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', out + '.tmp.mp4'], check=True); os.replace(out + '.tmp.mp4', out)
if VIRAL:   # upload cover: frame with the big hook text
    os.makedirs(f'{OUTDIR}/covers', exist_ok=True); subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', '0.5', '-i', out, '-frames:v', '1', '-q:v', '2', f'{OUTDIR}/covers/{LESSON["out"][:-4]}.jpg'], check=True)
json.dump(dict(lesson=LESSON, safe=SAFE, viral=VIRAL, avoid=globals().get('AVOID', {}), beats=globals().get('BEATS', {}), end=END, punch=PUNCH, sfx=[[os.path.basename(a), round(b, 3)] for a, b in SFX], endcard_boxes=[[int(v) for v in b] for b in ENDBOX], total=round(TOTAL, 3), scene=round(SCENE, 3),
               shots=[dict(id=s['id'], clip=s['clip'], t0=round(s['t0'], 3), dur=round(s['dur'], 3), frames=[s['frames'][0], s['frames'][-1]], vis=s.get('vis', s['mp4'][:-4] + '.vis.json'),
                           lines=[dict(who=w, id=l['id'], at=round(l['at'], 3), dur=round(l['dur'], 3), tempo=l['tempo']) for w, l in s['lines']], mouths=[[c, w] for c, w, _ in s['mouths']]) for s in S],
               overlays=BOX, hook_kind=globals().get('HOOK_KIND'), qa=globals().get('QA', {})), open(f'{OUT}/timeline.json', 'w'), indent=1, ensure_ascii=False)
print(out, round(TOTAL, 2))
