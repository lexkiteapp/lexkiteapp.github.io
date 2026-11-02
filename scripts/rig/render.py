#!/usr/bin/env python3
"""Dựng MP4 9:16 từ frames.json (scripts/rig/timeline.mjs) – headless (resvg + Pillow + ffmpeg), chạy trên CI rig-sample.yml, KHÔNG trên Mac.
Khung tạm "tip-card" theo brand/tokens.json (light) – loạt sau lấy khung từ Stitch (template), nhân vật từ characters.json (who).
Lớp: nền --bg · thẻ hook (≤ 1,5 s: có từ khung 0) · giáo viên (đầu trơn poster-2x + mặt vẽ face.js, nghiêng/gật quanh cổ, thở) · tay vẽ phẳng (không viền)
mọc từ sau thẻ phụ đề · thẻ phụ đề 1 dòng karaoke (cùng mốc từ Kokoro) · CTA. Âm thanh: loudnorm 2 lượt → −16 LUFS, đỉnh ≤ −1,5 dBTP.
Clip L1 (docs/specs/social-l1-clips.md): spec có lang + native → hàng tiêu đề bản địa trên thẻ hook (có từ khung 0), template stop (sai ✗ → đúng ✓) | pair (X vs Y,
từ đang nói sáng màu); mọi chữ trong vùng an toàn 9:16 (220 trên / 380 dưới). Cổng thêm: vùng an toàn, phụ đề khớp mốc Kokoro, chính tả (aspell), mức từ ≤B1
(content/wordlists/cefr-oxford.json), deep-link là route app có thật, logic kịch bản, chữ bản địa (native-qa.json), đủ glyph phông bản địa.
Ra: <out>/<id>.mp4, <id>-reduced.mp4, cover.jpg, key-*.jpg, sheet.jpg, qc.json, report.md. Dùng: python3 scripts/rig/render.py content/video/rig/ama-agree.json qa/rig"""
import io, json, re, subprocess, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import resvg_py
from bidi import base_rtl, visual   # scripts/rig/bidi.py (cùng thư mục)

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
SAFE_T, SAFE_B, SAFE_X = 220, H - 380, 40   # vùng an toàn 9:16 (nút/tiêu đề của TikTok/Reels/Shorts)
TPL = spec.get('template', 'tip-card')
REEL = TPL in ('say4', 'mispron', 'phrase', 'minpair')   # khuôn Reels (docs/specs/social-reels-templates.md)
LISTT = TPL in ('say4', 'mispron')                        # danh sách 01–04: giáo viên thu nhỏ dưới danh sách, không thẻ phụ đề (dòng đang đọc = karaoke)
HOOK_Y0, HOOK_Y1 = 232, {'phrase': 640, 'minpair': 600, 'say4': 400, 'mispron': 400}.get(TPL, 470)
TX, TY = (W - 1108) // 2, {'phrase': 650, 'minpair': 580}.get(TPL, 520)          # giáo viên: tỉ lệ 1:1 (không phóng to ảnh), thân dưới nằm sau thẻ phụ đề → không lộ đường cắt
HDY = TY - 420                          # tay vẽ theo toạ độ thân (bản đầu TY = 420)
CARD_Y0, CARD_Y1 = 1270, 1450
CTA_Y = 1500
LIST_TY, LIST_BAND = 1150, 1470   # say4/mispron: đỉnh ảnh giáo viên thu nhỏ · dải đáy (chữ CTA trong vùng an toàn ≤ 1540)
BOXES = []                              # mọi khung chữ đã vẽ → cổng safe_zone
FB, FT = [], {}                         # khung chữ + vùng giáo viên của khung hình đang vẽ → frames-check.json (scripts/rig/framecheck.py)
def txt(dr, xy, s, font, fill, anchor='la'):
    dr.text(xy, s, font=font, fill=fill, anchor=anchor); b = dr.textbbox(xy, s, font=font, anchor=anchor); BOXES.append(b); FB.append([s, *b])
def fit(s, f, sz, maxw, lo):
    while sz > lo and ImageDraw.Draw(Image.new('RGB', (1, 1))).textlength(s, font=f(sz)) > maxw: sz -= 2
    return f(sz)
LANG = spec.get('lang')
def native_font_path():
    """phông bản địa: Latin/Cyrillic = phông thương hiệu (Be Vietnam Pro); chữ khác = Noto (fonts-noto-core/-cjk trên CI) qua fc-match"""
    fam = {'ja': 'Noto Sans CJK JP', 'ko': 'Noto Sans CJK KR', 'zh_CN': 'Noto Sans CJK SC', 'hi': 'Noto Sans Devanagari', 'th': 'Noto Sans Thai', 'ar': 'Noto Sans Arabic', 'ru': 'Noto Sans'}.get(LANG)
    if not fam: return str(FD / 'BeVietnamPro-Bold.ttf'), 0
    out = subprocess.check_output(['fc-match', '-f', '%{file}|%{index}', f'{fam}:style=Bold'], text=True).split('|')
    assert fam.split()[-1].lower() in Path(out[0]).name.lower() or 'cjk' in out[0].lower(), ('thiếu phông', fam, out)
    return out[0], int(out[1] or 0)
NPATH, NIDX = native_font_path() if spec.get('native') else (None, 0)
NQA = json.loads((OUT / 'native-qa.json').read_text()) if (OUT / 'native-qa.json').exists() else {}
NHOOK = NQA.get('hook') or (spec.get('native') or {}).get('hook')
# Dòng bản địa = nhiều đoạn chữ: chữ Latin/dấu ngoặc (vd. “Good name”) bằng phông thương hiệu, chữ bản địa bằng Noto – phông Devanagari/Thai/Arabic
# không có chữ Latin (lô thử 01/11: hi-good-name hiện ô vuông, cổng native_glyphs bắt được). Mỗi đoạn được raqm dựng hình riêng.
BRAND_B = str(FD / 'BeVietnamPro-Bold.ttf')
def _cmap(path, idx=0):
    from fontTools.ttLib import TTFont
    return set(TTFont(path, fontNumber=idx).getBestCmap())
CMAP = {BRAND_B: _cmap(BRAND_B), NPATH: _cmap(NPATH, NIDX)} if NPATH else {}
def nruns(s):
    """[(đoạn, đường dẫn phông)]: ký tự Latin/dấu câu chung → phông thương hiệu (nếu có glyph), còn lại → phông bản địa; khoảng trắng theo đoạn đang chạy"""
    out = []
    for c in s:
        latin = ord(c) < 0x250 or 0x2000 <= ord(c) <= 0x206F
        f = BRAND_B if (latin and ord(c) in CMAP[BRAND_B]) or not NPATH else NPATH
        if c.isspace() and out: f = out[-1][1]
        if out and out[-1][1] == f: out[-1][0] += c
        else: out.append([c, f])
    return [(a, b) for a, b in out]
def nfont_at(path, sz): return ImageFont.truetype(path, sz, index=NIDX if path == NPATH else 0, layout_engine=ImageFont.Layout.RAQM)
def native_line(dr, cx, cy, s, size, lo, maxw, fill, left=False):
    rtl = base_rtl(s); rs = visual(nruns(s), rtl); m = ImageDraw.Draw(Image.new('RGB', (1, 1)))   # ar: thứ tự đoạn theo bidi (scripts/rig/bidi.py)
    width = lambda sz: sum(m.textlength(a, font=nfont_at(f, sz)) for a, f in rs)
    while size > lo and width(size) > maxw: size -= 2
    x = (cx + maxw - width(size) if rtl else cx) if left else cx - width(size) / 2   # dòng RTL canh lề phải của cột
    for a, f in rs:
        F = nfont_at(f, size); txt(dr, (x, cy), a, F, fill, 'lm'); x += dr.textlength(a, font=F)
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
        x, y = 610, 1010 + HDY + dy
        g = (f'<rect x="{x + 8}" y="{y + 130}" width="140" height="420" rx="44" fill="{SLEEVE}"/><rect x="{x + 12}" y="{y + 118}" width="132" height="34" rx="14" fill="{CUFF}"/>'
             f'<rect x="{x}" y="{y}" width="156" height="134" rx="44" fill="{SKIN}"/><rect x="{x + 8}" y="{y - 96}" width="56" height="136" rx="28" fill="{SKIN}"/>'
             + ''.join(f'<rect x="{x + 66}" y="{y + 18 + 30 * i}" width="80" height="7" rx="3.5" fill="{SKIN_D}"/>' for i in range(3)))
    else:                 # bàn tay xòe chào/khích lệ, phía phải màn hình
        x, y = 300, 990 + HDY + dy
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
    x = (W - sum(widths) + dr.textlength(' ', font=F_CAP)) / 2; y = (CARD_Y0 + CARD_Y1) / 2
    for (t, w), wd in zip(toks, widths):
        col = LIP if w['start'] <= lt < w['end'] + .08 else (HEAD if w['start'] <= lt else MUTED)
        txt(dr, (x, y), t, F_CAP, col, 'lm'); x += wd

norm = lambda x: re.sub(r"[^a-z0-9' ]+", ' ', x.lower().replace('’', "'")).split()

def switch_time():
    """stop: thẻ đổi sai → đúng đúng lúc giáo viên nói chữ "Say" lần 2 trong câu đầu (sau "Don't say …"); không có thì đầu câu hook.after"""
    ws = [w for w in segs[0]['words'] if re.search(r'[A-Za-z]', w['w'])]
    says = [segs[0]['start'] + w['start'] for w in ws if norm(w['w']) == ['say']]
    return says[1] - .1 if len(says) > 1 else segs[spec['hook'].get('after', 1)]['start'] - .1

def mark(dr, cx, cy, good):
    if good: dr.line([(cx - 24, cy + 2), (cx - 6, cy + 22), (cx + 26, cy - 22)], fill=TEAL, width=12, joint='curve')
    else: dr.line((cx - 20, cy - 20, cx + 20, cy + 20), fill=LIP, width=12); dr.line((cx - 20, cy + 20, cx + 20, cy - 20), fill=LIP, width=12)

def hook(dr, t):
    """Thẻ hook 2 hàng: tiêu đề bản địa (≤ 1,5 s: có từ khung 0, giữ suốt clip làm tựa) + dòng tiếng Anh (stop: sai ✗ → đúng ✓ | pair: X vs Y)"""
    hk, tpl = spec['hook'], spec.get('template', 'tip-card')
    dr.rounded_rectangle((48, HOOK_Y0 + 14, W - 48, HOOK_Y1 + 14), 44, fill=LEDGE); dr.rounded_rectangle((48, HOOK_Y0, W - 48, HOOK_Y1), 44, fill=CARD)
    if NHOOK: native_line(dr, W / 2, HOOK_Y0 + 62, NHOOK, 52, 30, W - 2 * 96, LIP)
    cy = HOOK_Y1 - 82 if NHOOK else (HOOK_Y0 + HOOK_Y1) / 2
    if tpl == 'pair':
        a, b = hk['a'], hk['b']; cur = None
        for sg in segs:
            for w in sg['words']:
                if sg['start'] + w['start'] <= t and norm(w['w']) in ([a], [b]): cur = norm(w['w'])[0]
        line = f'{a}  vs  {b}'; F = fit(line, font, 84, W - 2 * 110, 52); x = W / 2 - dr.textlength(line, font=F) / 2
        for part, col in ((a, TEAL if cur == a else HEAD), ('  vs  ', MUTED), (b, TEAL if cur == b else HEAD)):
            txt(dr, (x, cy), part, F, col, 'lm'); x += dr.textlength(part, font=F)
        return
    good = t >= switch_time()
    line = f"\u201c{hk['good'] if good else hk['bad']}\u201d"; MW = 74   # dấu ✓/✗ VẼ (font thương hiệu không có glyph) – teal = đúng, đỏ đậm = sai
    F = fit(line, font, 84, W - 2 * 96 - MW, 52); tw = dr.textlength(line, font=F); x0 = W / 2 - (tw + MW) / 2
    txt(dr, (x0, cy), line, F, TEAL if good else HEAD, 'lm'); mark(dr, x0 + tw + MW / 2 + 14, cy, good)
    if not good and hk.get('strike'):   # gạch chữ thừa ("am", "have", "good")
        pre = line[:line.index(hk['strike'])]; xs = x0 + dr.textlength(pre, font=F); xe = xs + dr.textlength(hk['strike'], font=F)
        dr.line((xs - 4, cy + 5, xe + 4, cy + 5), fill=LIP, width=9)
    if good:                            # gạch dưới phần thêm vào ("likes", "a", "am … old")
        for a in hk.get('add', []):
            m = re.search(rf'(?<![A-Za-z]){re.escape(a)}(?![A-Za-z])', line)
            if m: xs = x0 + dr.textlength(line[:m.start()], font=F); dr.rounded_rectangle((xs, cy + F.size * .42, xs + dr.textlength(a, font=F), cy + F.size * .42 + 8), 4, fill=TEAL)


# ---------- khuôn Reels (docs/specs/social-reels-templates.md): say4 · mispron (danh sách 01–04) · phrase (thẻ một cụm) · minpair (bộ từ gần âm + cận cảnh miệng)
F_IPA_PATH = str(FD / 'NotoSans-Medium.ttf')   # IPA (ʃ ɪ ə ˈ …): phông thương hiệu không có glyph → Noto Sans (OFL, đã có trong brand)
f_ipa = lambda sz: ImageFont.truetype(F_IPA_PATH, sz)
ITEMS, UI = NQA.get('items') or [], NQA.get('ui') or {}
WHITE = (255, 255, 255)
def turn_k(t):
    """trong khoảng lặng đọc theo của câu nào (s['turn'] = [đầu, cuối] do tts.py ghi) → (câu, tỉ lệ đã qua 0..1)"""
    for sg in segs:
        a, b = sg.get('turn') or (0, 0)
        if a <= t < b: return sg, (t - a) / (b - a)
    return None, 0
def cur_item(t):
    """mục đang học: mục của câu đang nói hoặc vừa nói xong (kể cả khoảng lặng đọc theo); trước câu đầu có mục = None"""
    cur = None
    for sg in segs:
        if sg['start'] - .15 <= t and ('item' in sg or 'pair' in sg): cur = sg
    return cur
def turn_pill(dr, cx, cy, k):
    """viên "Đến lượt bạn!" (chữ bản địa) + thanh đếm lùi trong khoảng lặng"""
    s = UI.get('turn') or 'Your turn!'; m = ImageDraw.Draw(Image.new('RGB', (1, 1)))
    w = sum(m.textlength(a, font=nfont_at(f, 40)) for a, f in nruns(s)) + 72
    dr.rounded_rectangle((cx - w / 2, cy - 36, cx + w / 2, cy + 36), 36, fill=TEAL)
    native_line(dr, cx, cy, s, 40, 30, w - 40, WHITE)
    dr.rounded_rectangle((cx - w / 2 + 24, cy + 24, cx + w / 2 - 24, cy + 30), 3, fill=hx(TOK['--teal-2']))
    dr.rounded_rectangle((cx - w / 2 + 24, cy + 24, cx - w / 2 + 24 + (w - 48) * (1 - k), cy + 30), 3, fill=WHITE)
def karaoke_line(dr, x, cy, sg, lt, F, maxw):
    """dòng tiếng Anh tô theo mốc từ Kokoro (cùng nguồn với tiếng + miệng); trả về bề rộng"""
    ws = words_of(sg); disp = sg['text'].split() if len(sg['text'].split()) == len(ws) else [w['w'] for w in ws]
    for tk, w in zip(disp, ws):
        col = LIP if w['start'] <= lt < w['end'] + .08 else HEAD
        txt(dr, (x, cy), tk, F, col, 'lm'); x += dr.textlength(tk + ' ', font=F)
def reel_list(dr, t):
    """say4 / mispron: hook bản địa + 4 dòng 01–04 (câu/từ EN · IPA từ kho · dòng bản địa), dòng đang học sáng, viên đến lượt bạn trong khoảng lặng"""
    dr.rounded_rectangle((48, HOOK_Y0 + 14, W - 48, HOOK_Y1 + 14), 44, fill=LEDGE); dr.rounded_rectangle((48, HOOK_Y0, W - 48, HOOK_Y1), 44, fill=CARD)
    native_line(dr, W / 2, HOOK_Y0 + 62, NHOOK, 58, 34, W - 2 * 96, LIP)
    native_line(dr, W / 2, HOOK_Y0 + 128, UI.get('cta', ''), 38, 28, W - 2 * 96, MUTED)
    cs, (tsg, tk) = cur_item(t), turn_k(t); ci = cs['item'] if cs else -1
    y0, RH = HOOK_Y1 + 40, 150
    for i, it in enumerate(ITEMS):
        y = y0 + i * (RH + 14); on = i == ci
        dr.rounded_rectangle((48, y, W - 48, y + RH), 32, fill=CARD, outline=TEAL if on else LEDGE, width=6 if on else 3)
        dr.rounded_rectangle((72, y + 22, 72 + 64, y + 22 + 52), 16, fill=TEAL if on else LEDGE)
        txt(dr, (104, y + 48), f'{i + 1:02d}', font(32, 'BeVietnamPro-Bold.ttf'), WHITE if on else HEAD, 'mm')
        X, MW = 160, W - 48 - 160 - 28
        line = it['en'] if TPL == 'say4' else it['en'].capitalize(); F = fit(line, font, 48, MW, 32)
        if on and cs and cs['start'] <= t < cs['start'] + cs['dur'] + .1 and TPL == 'say4': karaoke_line(dr, X, y + 40, cs, t - cs['start'], F, MW)
        else: txt(dr, (X, y + 40), line, F, LIP if on and TPL == 'mispron' else HEAD, 'lm')
        txt(dr, (X, y + 86), it['ipa'], fit(it['ipa'], f_ipa, 34, MW, 24), TEAL, 'lm')
        native_line(dr, X, y + 124, it['native'], 32, 24, MW, MUTED, left=True)
    if tsg is not None: turn_pill(dr, W / 2, y0 + 4 * (RH + 14) + 40, tk)
def reel_phrase(dr, t):
    """phrase: thẻ lớn = hook bản địa + cụm EN to + IPA + nghĩa bản địa"""
    it = ITEMS[0]
    dr.rounded_rectangle((48, HOOK_Y0 + 14, W - 48, HOOK_Y1 + 14), 44, fill=LEDGE); dr.rounded_rectangle((48, HOOK_Y0, W - 48, HOOK_Y1), 44, fill=CARD)
    native_line(dr, W / 2, HOOK_Y0 + 64, NHOOK, 56, 34, W - 2 * 96, LIP)
    cs = cur_item(t); on = bool(cs) and cs['start'] <= t < cs['start'] + cs['dur'] + .1
    F = fit(it['en'], font, 120, W - 2 * 110, 64); txt(dr, (W / 2, HOOK_Y0 + 196), it['en'], F, TEAL if on else HEAD, 'mm')
    txt(dr, (W / 2, HOOK_Y0 + 294), it['ipa'], fit(it['ipa'], f_ipa, 52, W - 2 * 110, 32), TEAL, 'mm')
    native_line(dr, W / 2, HOOK_Y0 + 360, it['native'], 46, 30, W - 2 * 110, MUTED)
def mouth_zoom(im, fr):
    """minpair: cận cảnh miệng (cùng khung mặt đang vẽ, phóng ~1,8×) trong khung bo góc ở vai phải – người xem nhìn khẩu hình.
    Khung chỉ từ dưới mũi tới cằm (mắt cách miệng 76 px: khung ±85 cũ lấy cả mắt, miệng nhỏ – key frame lượt 02/11)"""
    R = RIGS[fr['who']]; mx, my = R['mouth']; base = BASES[fr['who']]
    face = base.copy(); face.alpha_composite(svg_img(fr['g'], base.width, base.height))
    ZW, ZH = 320, 196
    crop = face.crop((mx - 90, my - 48, mx + 90, my + 62)).resize((ZW, ZH), Image.LANCZOS)   # 180×110 → 320×196: môi mở xuống dưới → khung lệch xuống 7 px
    x0, y0 = W - 48 - ZW, CARD_Y0 - ZH - 30; FT['excl'] = [x0 - 8, y0 - 8, x0 + ZW + 8, y0 + ZH + 8]
    mask = Image.new('L', crop.size, 0); ImageDraw.Draw(mask).rounded_rectangle((0, 0, *crop.size), 44, fill=255)
    dr = ImageDraw.Draw(im); dr.rounded_rectangle((x0 - 8, y0 - 8, x0 + ZW + 8, y0 + ZH + 8), 50, fill=CARD, outline=TEAL, width=6)
    im.paste(crop, (x0, y0), mask)
def reel_minpair(dr, t):
    """minpair: hook bản địa + 4 từ (IPA từ kho dưới mỗi từ), từ đang đọc sáng (mốc từ Kokoro)"""
    dr.rounded_rectangle((48, HOOK_Y0 + 14, W - 48, HOOK_Y1 + 14), 44, fill=LEDGE); dr.rounded_rectangle((48, HOOK_Y0, W - 48, HOOK_Y1), 44, fill=CARD)
    native_line(dr, W / 2, HOOK_Y0 + 62, NHOOK, 56, 34, W - 2 * 96, LIP)
    cur = None
    for sg in segs:
        for w in sg['words']:
            if sg['start'] + w['start'] - .05 <= t < sg['start'] + w['end'] + .25 and norm(w['w']) in [[x['en']] for x in ITEMS]: cur = norm(w['w'])[0]
    cw = (W - 2 * 72) / len(ITEMS)
    for i, it in enumerate(ITEMS):
        cx = 72 + cw * (i + .5); on = cur == it['en']
        # khung từ đang đọc ôm cả từ + IPA + nghĩa (đáy 28 px dưới dòng nghĩa; lượt 02/11 viền cắt ngang "con cừu"), lùi 14 px khỏi mép thẻ
        if on: dr.rounded_rectangle((cx - cw / 2 + 14, HOOK_Y0 + 118, cx + cw / 2 - 14, HOOK_Y0 + 298 + 44), 28, fill=hx(TOK['--surface-2']), outline=TEAL, width=5)
        txt(dr, (cx, HOOK_Y0 + 180), it['en'], fit(it['en'], font, 70, cw - 44, 40), TEAL if on else HEAD, 'mm')
        txt(dr, (cx, HOOK_Y0 + 250), it['ipa'], fit(it['ipa'], f_ipa, 40, cw - 30, 26), TEAL, 'mm')
        native_line(dr, cx, HOOK_Y0 + 298, it['native'], 30, 22, cw - 40, MUTED)

def frame(fr, t):
    FB.clear(); FT.clear(); im = Image.new('RGBA', (W, H), BG + (255,))
    base = BASES[fr['who']]; face = svg_img(fr['g'], base.width, base.height); body = base.copy(); body.alpha_composite(face)
    if fr['tilt'] or fr['nod']:
        body = body.rotate(fr['tilt'], resample=Image.BICUBIC, center=tuple(RIGS[fr['who']]['pivot']), translate=(0, fr['nod']))
    if LISTT:   # giáo viên thu nhỏ 0,62 dưới danh sách; dải đáy che đường cắt ảnh
        sc = .62; b2 = body.resize((round(body.width * sc), round(body.height * sc)), Image.LANCZOS)
        im.alpha_composite(b2, ((W - b2.width) // 2, int(round(LIST_TY + fr['breath'] * sc))))
        FT.update(xy=[(W - b2.width) // 2, int(round(LIST_TY + fr['breath'] * sc))], sc=sc, clip=[0, 0, W, LIST_BAND])
        ImageDraw.Draw(im).rectangle((0, LIST_BAND, W, H), fill=LEDGE)
    else:
        body = body.crop((0, 0, body.width, CARD_Y0 + 40 - TY))   # thân dừng sau thẻ phụ đề: không lòi tà áo dưới thẻ (ảnh đầu trơn cao hơn thẻ)
        im.alpha_composite(body, (TX, int(round(TY + fr['breath'])))); FT.update(xy=[TX, int(round(TY + fr['breath']))], sc=1, clip=[0, 0, W, CARD_Y0])
    if fr['hand'] and fr['who'] in HANDPAL and not LISTT:
        hl = svg_img(hand_svg(fr['hand'], fr['hk'], fr['hmode'], fr['who']), W, H)
        hl.paste((0, 0, 0, 0), (0, CARD_Y0 + 60, W, H))   # khuỷu/tay áo dừng sau thẻ phụ đề, không lòi xuống dưới thẻ
        im.alpha_composite(hl)
    if TPL == 'minpair': mouth_zoom(im, fr)
    dr = ImageDraw.Draw(im)
    if LISTT:
        reel_list(dr, t); txt(dr, (W / 2, LIST_BAND + 40), spec['cta'], F_CTA, HEAD, 'mm')
        return im.convert('RGB')
    dr.rounded_rectangle((48, CARD_Y0 + 14, W - 48, CARD_Y1 + 14), 48, fill=LEDGE); dr.rounded_rectangle((48, CARD_Y0, W - 48, CARD_Y1), 48, fill=CARD)
    seg = segs[fr['seg']]; tsg, tk = turn_k(t) if REEL else (None, 0)
    if tsg is not None: turn_pill(dr, W / 2, (CARD_Y0 + CARD_Y1) / 2, tk)
    elif fr['lt'] >= -.2: caption(dr, seg, fr['lt'])
    {'phrase': reel_phrase, 'minpair': reel_minpair}.get(TPL, hook)(dr, t)
    txt(dr, (W / 2, CTA_Y), spec['cta'], F_CTA, MUTED, 'mm')
    return im.convert('RGB')

def sh(*a): return subprocess.run(a, check=True, capture_output=True, text=True)

def render(name, fj):
    D = json.loads((OUT / fj).read_text()); d = OUT / f'fr-{name}'; d.mkdir(exist_ok=True)
    fc, n = OUT / 'fc', len(D['frames']); fc.mkdir(exist_ok=True); chk = []
    for i, fr in enumerate(D['frames']):
        im = frame(fr, i / D['fps']); im.save(d / f'{i:05d}.png', compress_level=1)
        if name == 'full' and (i % D['fps'] == 0 or i == n - 1):   # tờ khung hình ~1 khung/s + khung cuối → framecheck.py
            im.save(fc / f'{i:05d}.png'); chk.append({'i': i, 't': round(i / D['fps'], 2), 'who': fr['who'], 'seg': fr['seg'], 'boxes': [list(b) for b in FB], 'teacher': dict(FT)})
    if name == 'full': (OUT / 'frames-check.json').write_text(json.dumps({'template': TPL, 'W': W, 'H': H, 'safe': [SAFE_X, SAFE_T, W - SAFE_X, SAFE_B], 'frames': chk}))
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
fps, keys = D['fps'], [('hook', 0.6)] + ([('fix', switch_time() + .7)] if TPL in ('stop', 'tip-card') else []) + [(f'turn{i}', (s['turn'][0] + s['turn'][1]) / 2) for i, s in enumerate(segs) if s.get('turn')][:2] + [('explain', segs[1]['start'] + 1.0)] + [(s['emo'], s['start'] + min(1.2, s['dur'] * .6)) for s in segs if s.get('hand')]
ims = []
for nm, t in keys:
    k = min(int(t * fps), len(D['frames']) - 1)
    while k < len(D['frames']) - 1 and D['frames'][k]['blink'] > .05: k += 1   # khung chính: mắt mở
    p = OUT / f'key-{nm}.jpg'; Image.open(d / f'{k:05d}.png').convert('RGB').save(p, quality=90); ims.append(Image.open(p))
sheet = Image.new('RGB', (len(ims) * 540, 960), BG)
for i, x in enumerate(ims): sheet.paste(x.resize((540, 960), Image.LANCZOS), (i * 540, 0))
sheet.save(OUT / 'sheet.jpg', quality=88)
Image.open(OUT / 'key-hook.jpg').save(OUT / 'cover.jpg', quality=92)   # ảnh bìa bài đăng = khung hook (tựa bản địa + câu sai), mắt mở
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
# --- cổng clip L1 / mạng xã hội (docs/specs/social-l1-clips.md)
X0, Y0, X1, Y1 = min(b[0] for b in BOXES), min(b[1] for b in BOXES), max(b[2] for b in BOXES), max(b[3] for b in BOXES)
def sync_ok(sg):   # chữ phụ đề hiển thị = đúng từng từ Kokoro đọc (mốc thời gian karaoke cùng nguồn với tiếng + miệng)
    ws = words_of(sg); disp = sg['text'].split()
    return len(ws) == len(disp) and all(norm(a) == norm(b['w']) for a, b in zip(disp, ws))
ALLOW = {'ama', 'carlos', 'lexkite'}
toks = sorted({w for w in norm(text + ' ' + spec['cta']) if w not in ALLOW})
spell = subprocess.run(['aspell', 'list', '--lang=en_US', '--ignore-case'], input=' '.join(toks), capture_output=True, text=True)
missp = sorted(set(spell.stdout.split())) if spell.returncode == 0 else ['<aspell lỗi>']
CEFR = json.loads((ROOT / 'content/wordlists/cefr-oxford.json').read_text())
lvl = lambda w: max([v for e in [CEFR.get(w), CEFR.get(re.sub(r'(ing|ed|es|s)$', '', w))] if e for v in e.values()] or ['A1'])
hard = [w for w in toks if lvl(w) >= 'B2']
routes = set()
for f in (ROOT / 'web/js').rglob('*.js'):
    routes |= {a or b for a, b in re.findall(r"routes(?:\.([A-Za-z0-9_-]+)|\['([A-Za-z0-9_-]+)'\])\s*=", f.read_text(errors='ignore'))}
dl = spec.get('deeplink', '')
def logic():
    hk, tpl, said = spec.get('hook', {}), TPL, ' '.join(norm(text))
    sayn = lambda x: ' '.join(norm(re.sub(r'\d+', lambda m: hk.get('say', {}).get(m.group(0), m.group(0)), x)))
    ok = 3 <= len(spec['segments']) <= 6 and 'repeat after me' in said and all(not sg.get('hand') or sg.get('who', spec['who']) in HANDPAL for sg in spec['segments'])
    if REEL:   # khuôn Reels: mục nào cũng có IPA từ kho + dòng bản địa, giáo viên đọc đúng mục, có khoảng lặng đọc theo cho mục
        SG, its = spec['segments'], spec.get('items', [])
        rep = [sg for sg in SG if sg.get('repeat')]
        ok &= len(its) == len(ITEMS) and all(x.get('ipa') and x.get('native') for x in ITEMS) and bool(rep) and all(sg.get('turn') for sg in segs if sg.get('repeat'))
        if TPL == 'say4': ok &= len(its) == 4 and [norm(sg['text']) for sg in SG if 'item' in sg] == [norm(x['en']) for x in its] and all('item' in sg for sg in rep)
        if TPL == 'mispron': ok &= len(its) == 4 and all(norm(SG[[sg.get('item') for sg in SG].index(i)]['text']).count(x['en']) >= 2 for i, x in enumerate(its))
        if TPL == 'phrase': ok &= len(its) == 1 and said.count(' '.join(norm(its[0]['en']))) >= 3
        if TPL == 'minpair': ok &= 3 <= len(its) <= 4 and all(x['en'] in norm(SG[0]['text']) and x['en'] in ' '.join(norm(' '.join(sg['text'] for sg in rep))).split() for x in its) \
            and len({x['ipa'] for x in ITEMS}) == len(ITEMS)
        return bool(ok and spec.get('mistake', {}).get('en') and spec['lang'] in LANGS15)
    if tpl == 'pair': ok &= hk['a'] in norm(spec['segments'][0]['text']) and hk['b'] in norm(spec['segments'][0]['text'])
    else:
        s0 = ' '.join(norm(spec['segments'][0]['text']))
        ok &= sayn(hk['bad']) in s0 and sayn(hk['good']) in s0 and hk['bad'] != hk['good']
        ok &= not hk.get('strike') or (hk['strike'] in hk['bad'] and hk['strike'] not in norm(hk['good']))
        ok &= all(a in hk['good'] for a in hk.get('add', []))
    if spec.get('native'): ok &= bool(spec.get('mistake', {}).get('en')) and spec['lang'] in LANGS15
    return bool(ok)
LANGS15 = 'ar de en es fr hi id ja ko pt_BR ru th tr vi zh_CN'.split()
def glyphs_ok():
    if not NHOOK: return True
    from PIL import features
    if LANG in ('hi', 'th', 'ar') and not features.check('raqm'): return False   # chữ ghép (Devanagari/Thai/Arabic) cần raqm, không thì vỡ dấu
    return all(ord(c) in CMAP[f] for a, f in nruns(NHOOK) for c in a if not c.isspace())   # mỗi ký tự có glyph trong đúng phông vẽ nó
g.update({
  'safe_zone_9x16': X0 >= SAFE_X and X1 <= W - SAFE_X and Y0 >= SAFE_T and Y1 <= SAFE_B,
  'caption_sync_kokoro': all(sync_ok(sg) for sg in segs),
  'english_spelling': not missp,
  'english_le_b1': not hard,
  'deeplink_real_route': bool(re.fullmatch(r'#/([a-z0-9-]+)(/.*)?', dl)) and dl[2:].split('/')[0] in routes,
  'script_logic': logic(),
})
if spec.get('native'):
  g.update({'native_text_qa': bool(NQA.get('ok')), 'native_glyphs': glyphs_ok()})
if REEL:   # IPA: đúng chuỗi kho từ (native-qa ghi từ loadAllPlus) và phông IPA có đủ glyph
  IC = _cmap(F_IPA_PATH)
  g.update({'ipa_from_lexicon': bool(NQA.get('gates', {}).get('ipa_from_lexicon')) and all(x['ipa'] for x in ITEMS),
            'ipa_glyphs': all(ord(c) in IC for x in ITEMS for c in x['ipa'] if not c.isspace()),
            'items_native_glyphs': all(ord(c) in CMAP[f] for x in ITEMS + [{'native': UI.get('turn', '')}, {'native': UI.get('cta', '')}] for a, f in nruns(x['native']) for c in a if not c.isspace()),
            'turn_contrast': contrast(WHITE, TEAL) >= 4.5 and contrast(TEAL, CARD) >= 4.5 and contrast(HEAD, LEDGE) >= 4.5})
score = round(100 * sum(g.values()) / len(g))
qc = {'score': score, 'gates': g, 'safe_box': [X0, Y0, X1, Y1], 'misspelled': missp, 'above_b1': hard, 'deeplink': dl, 'native_font': Path(NPATH).name if NPATH else None, 'lufs': I, 'truePeak': tp, **{k: M[k] for k in ['voices', 'total', 'words', 'wpmSpeech', 'wpmOverall', 'firstVoicedS', 'lagMaxAbsMs', 'visemePctMin', 'flicker', 'blinksPerMin']}, 'rows': M['rows'],
      'cost': {'kling_credits': 0, 'usd': 0, 'ci_minutes_note': 'xem thời gian job rig-sample'}}
(OUT / 'qc.json').write_text(json.dumps(qc, indent=1))
rep = [f"## Rig 2D {spec['id']} – điểm {score}/100", '', '| cổng | ok |', '|---|---|'] + [f'| {k} | {"✅" if v else "❌"} |' for k, v in g.items()] + ['', '```', json.dumps({k: v for k, v in qc.items() if k not in ('gates', 'rows')}), '```', '', '| câu | emo | tay | s | lệch ms | đúng hình % | nháy |', '|---|---|---|---|---|---|---|'] + [f"| {r['k']} | {r['emo']} | {r['hand']} | {r['dur']:.2f} | {r['lagMs']} | {r['visemePct']} | {r['flicker']} |" for r in M['rows']]
(OUT / 'report.md').write_text('\n'.join(rep) + '\n'); print('\n'.join(rep))
for x in OUT.glob('fr-*'): subprocess.run(['rm', '-rf', str(x)])
sys.exit(0 if all(g.values()) else 1)
