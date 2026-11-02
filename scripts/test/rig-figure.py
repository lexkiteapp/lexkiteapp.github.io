#!/usr/bin/env python3
"""Test hồi quy cổng teacher_full_1x (scripts/rig/figure.py) – chỉ cần Pillow, chạy trong social-clips.yml trước khi dựng.
1) Bố cục hiện tại của MỌI khuôn × Ama/Carlos phải qua: 1:1, thấy ≥ 55 % thân, đường cắt ảnh khuất.
2) Không lộ đoạn mờ dần/hàng cắt (sau thẻ hoặc ngoài khung); say4/mispron: đỉnh tóc dưới dòng 04 (danh sách không đè đầu), miệng trong vùng an toàn.
3) Tiêm lỗi → cổng phải ĐỎ: bố cục cũ 03/11 (0,62× ở y 1150 + dải đáy 1470), thu nhỏ 0,62 không che, cắt còn đầu, thẻ đè lên ngực.
Dùng: python3 scripts/test/rig-figure.py"""
import json, subprocess, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts/rig'))
import figure as F

TPLS = ['tip-card', 'stop', 'pair', 'phrase', 'minpair', 'say4', 'mispron']
A = {w: Image.open(ROOT / f'web/teach/{w}/head-bare-2x.webp').getchannel('A') for w in ('ama', 'carlos')}
try: RIG = json.loads(subprocess.check_output(['node', '-e', "console.log(JSON.stringify(require('./web/js/call/face.js').RIG))"], cwd=ROOT))
except Exception: RIG = {}
fails = []
def check(name, cond, extra=''):
    print(('✓ ' if cond else '✗ ') + name + (f'  {extra}' if extra else ''))
    if not cond: fails.append(name)

for tpl in TPLS:
    for w, a in A.items():
        ok, m = F.gate(F.compose_mask(a, tpl), a)
        check(f'{tpl}/{w} giáo viên đầy đủ 1:1', ok, m)
        x, y, keep = F.place(tpl, a.width)
        top = y + a.getbbox()[1]
        fr = F.fade_row(a)
        if keep is None: check(f'{tpl}/{w} đoạn mờ dần + hàng cắt ngoài khung', y + fr >= F.H, f'mờ từ {y + fr} ≥ {F.H}')
        else: check(f'{tpl}/{w} hàng cắt ảnh sau thẻ, không lộ đoạn mờ', F.CARD_Y0 < y + keep <= F.CARD_Y1 + 14 and keep <= fr, f'cắt {y + keep} · mờ từ hàng {fr}')
        if tpl in F.LIST_TPL:
            check(f'{tpl}/{w} dòng 04 không đè đầu', F.LIST_Y1 + 12 <= top, f'đáy dòng 04 {F.LIST_Y1} · đỉnh tóc {top}')
            if w in RIG: check(f'{tpl}/{w} miệng trong vùng an toàn', y + RIG[w]['mouth'][1] <= F.H - 380, y + RIG[w]['mouth'][1])

# tiêm lỗi → cổng phải đỏ
for w, a in A.items():
    bad = {
        'bố cục cũ 0,62× + dải đáy (03/11)': F.compose_mask(a, 'say4', scale=.62, xy=((F.W - round(a.width * .62)) // 2, 1150), extra=[(0, 1470, F.W, F.H)]),
        'thu nhỏ 0,62 không che': F.compose_mask(a, 'say4', scale=.62, xy=((F.W - round(a.width * .62)) // 2, 1150)),
        'cắt còn đầu (giữ 360 hàng)': F.compose_mask(a, 'phrase', keep=360),
        'thẻ đè lên ngực (thẻ ở 1000)': F.compose_mask(a, 'tip-card', extra=[(48, 1000, F.W - 48, F.H)]),
        'lộ đoạn mờ (TY 975 bản nháp)': None,
        'phóng 1,25×': F.compose_mask(a, 'tip-card', scale=1.25, xy=((F.W - round(a.width * 1.25)) // 2, 520)),
    }
    for nm, mk in bad.items():
        if mk is None: check(f'tiêm lỗi {w}: {nm} → đỏ', 975 + F.fade_row(a) < F.H, f'mờ từ {975 + F.fade_row(a)}'); continue
        ok, m = F.gate(mk, a)
        check(f'tiêm lỗi {w}: {nm} → đỏ', not ok, m)

print(f'\n{len(fails)} lỗi' if fails else '\nrig-figure: đạt')
sys.exit(1 if fails else 0)
