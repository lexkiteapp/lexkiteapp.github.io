"""Đặt giáo viên 2D trên khung 9:16 (render.py) + cổng `teacher_full_1x` – thuần Pillow, test: scripts/test/rig-figure.py.
Mọi khuôn: ảnh đầu trơn 1108×960 tỉ lệ 1:1 (không thu nhỏ), từ đỉnh tóc xuống tới vai/ngực; đường cắt ảnh luôn khuất (sau thẻ phụ đề hoặc ngoài mép đáy khung).
Lỗi 03/11: say4/mispron thu nhỏ 0,62× ở y 1150 rồi dải đáy đặc che từ 1470 → chỉ còn ~270 px (cái đầu nhỏ) – cổng cũ không đo giáo viên nên vẫn xanh."""
from PIL import Image, ImageChops

W, H = 1080, 1920
CARD_Y0, CARD_Y1 = 1270, 1450           # thẻ phụ đề (khuôn có thẻ): che thân dưới
LIST_TPL = ('say4', 'mispron')
# say4/mispron: thẻ hook (hook bản địa · "đọc theo"/viên đến lượt bạn · CTA) + 4 dòng 01–04, giáo viên 1:1 bên dưới, thân chạy quá mép đáy khung
LIST_HOOK_Y1 = 462
LIST_Y0, LIST_RH, LIST_GAP = LIST_HOOK_Y1 + 14, 150, 12            # dòng giữ cỡ cũ 150 px
LIST_Y1 = LIST_Y0 + 4 * (LIST_RH + LIST_GAP) - LIST_GAP          # đáy dòng 04 = 1112
LIST_TY = 1066   # ảnh mờ dần từ hàng 864 (fade_row) → 1066 + 864 > 1920: đoạn mờ và hàng cắt ở ngoài khung; đỉnh tóc Ama 1143 dưới dòng 04
ZOOM = (W - 48 - 320 - 8, CARD_Y0 - 196 - 30 - 8, W - 48 + 8, CARD_Y0 - 30 + 8)   # minpair: khung cận cảnh miệng ở vai phải

MIN_VIS = .55      # phần thân thấy được ≥ 55 % chiều cao nhân vật ở 1:1 (phrase thấp nhất ≈ 0,60; lỗi cũ 0,31)
SCALE_TOL = .07    # bề ngang tóc/đầu thấy được so với ảnh gốc 1:1 (thu nhỏ 0,62 → 0,62–0,67)
HEAD_ROWS = 250

def fade_row(alpha, solid=250):
    """hàng đầu tiên (từ vai trở xuống) mà ảnh bắt đầu mờ dần – phải khuất (sau thẻ / ngoài khung), cấm 'thân mờ dần'"""
    for r in range(alpha.height // 2, alpha.height):
        if max(alpha.crop((0, r, alpha.width, r + 1)).getdata()) < solid: return r
    return alpha.height

def place(tpl, base_w=1108):
    """→ (x, y, keep_rows): toạ độ góc trên-trái ảnh 1:1; keep_rows = số hàng ảnh giữ lại (thân dừng sau thẻ) hoặc None (ảnh chạy quá mép đáy)"""
    x = (W - base_w) // 2
    if tpl in LIST_TPL: return x, LIST_TY, None
    y = {'phrase': 650, 'minpair': 580}.get(tpl, 520)
    return x, y, CARD_Y0 + 40 - y

def occluders(tpl):
    """hình chữ nhật vẽ ĐÈ lên giáo viên (thẻ phụ đề kèm gờ, khung cận cảnh miệng)"""
    if tpl in LIST_TPL: return []
    r = [(48, CARD_Y0, W - 48, CARD_Y1 + 14)]
    return r + [ZOOM] if tpl == 'minpair' else r

def visible_mask(with_t, without_t, thr=6):
    """mask điểm ảnh giáo viên thấy được = khác nhau giữa khung có / không có giáo viên"""
    d = ImageChops.difference(with_t.convert('RGB'), without_t.convert('RGB')).convert('L')
    return d.point(lambda v: 255 if v > thr else 0)

def gate(mask, alpha):
    """mask (khung W×H, 255 = giáo viên thấy được), alpha = kênh A ảnh gốc 1:1 → (ok, số đo)"""
    ob, bb = alpha.getbbox(), mask.getbbox()
    if not bb: return False, {'visH': 0, 'visFrac': 0, 'scale': 0}
    oh, vh = ob[3] - ob[1], bb[3] - bb[1]
    hv = mask.crop((0, bb[1], mask.width, bb[1] + HEAD_ROWS)).getbbox()
    hb = alpha.crop((0, ob[1], alpha.width, ob[1] + HEAD_ROWS)).getbbox()
    sc = (hv[2] - hv[0]) / (hb[2] - hb[0]) if hv else 0
    m = {'visH': vh, 'visFrac': round(vh / oh, 3), 'scale': round(sc, 3), 'top': bb[1]}
    return bool(vh >= MIN_VIS * oh and abs(sc - 1) <= SCALE_TOL), m

def compose_mask(alpha, tpl, scale=1.0, xy=None, keep=None, extra=()):
    """mask dựng từ bố cục khai báo (cho test): ảnh ở place(tpl) (hoặc xy/scale/keep tiêm lỗi), trừ occluders + extra"""
    x, y, k = place(tpl, alpha.width)
    if xy: x, y = xy
    k = keep if keep is not None else k
    a = alpha.crop((0, 0, alpha.width, k)) if k else alpha
    if scale != 1: a = a.resize((round(a.width * scale), round(a.height * scale)), Image.LANCZOS)
    m = Image.new('L', (W, H), 0); m.paste(a.point(lambda v: 255 if v > 24 else 0), (x, y))
    for r in list(occluders(tpl)) + list(extra): m.paste(0, tuple(map(int, r)))
    return m
