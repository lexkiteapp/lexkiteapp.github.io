#!/usr/bin/env python3
"""icon_tier.py – tầng 1 ICON: Noto Emoji png/512 (Apache-2.0, © Google) cho các nghĩa có trong content/lexicon/vimg-icons.json.
  python3 scripts/vocab-img/icon_tier.py <out_dir> --keys keys.json
Đặt icon lên nền kem phẳng của phong cách s1 (1024², icon 600 px giữa) → <out>/raw/<slug>.a1.jpg, ghi nguồn + giấy phép vào <out>/src.json.
Ảnh icon đi qua CÙNG cổng (giám khảo gọi tên, OCR, an toàn, phong cách, pHash, cỡ); trượt → lần 2 = tầng AI (gen.mjs --attempt 2).
Nếu lượt trước (resume) đã có ảnh AI lần 1 → giữ lại thành <slug>.a1.ai.jpg (so sánh), xoá kết quả giám khảo cũ của nghĩa đó."""
import io, json, os, re, sys, urllib.request
from PIL import Image
OUT = sys.argv[1]; arg = lambda n, d=None: sys.argv[sys.argv.index('--' + n) + 1] if '--' + n in sys.argv else d
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
ICONS = json.load(open(os.path.join(ROOT, 'content/lexicon/vimg-icons.json')))
NOTO = f"https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@{ICONS['noto']}/png/512/emoji_u{{cp}}.png"
CREAM = (255, 247, 234)
slug = lambda k: re.sub(r'[^a-zA-Z0-9_-]+', '-', k.replace('#', '__'))

def compose(png):
    ic = Image.open(io.BytesIO(png)).convert('RGBA'); ic = ic.resize((600, 600), Image.LANCZOS)
    bg = Image.new('RGBA', (1024, 1024), CREAM + (255,)); bg.alpha_composite(ic, (212, 212)); return bg.convert('RGB')

def main():
    keys = json.load(open(arg('keys')))['items'] if arg('keys') else list(ICONS['items'])
    os.makedirs(f'{OUT}/raw', exist_ok=True)
    srcf = f'{OUT}/src.json'; src = json.load(open(srcf)) if os.path.exists(srcf) else {}
    jf = f'{OUT}/judge.a1.json'; judge = json.load(open(jf)) if os.path.exists(jf) else {}
    n = 0
    for k in keys:
        it = ICONS['items'].get(k)
        if not it: continue
        dst = f'{OUT}/raw/{slug(k)}.a1.jpg'
        if src.get(k, {}).get('tier') == 'icon' and os.path.exists(dst): n += 1; continue
        try:
            png = urllib.request.urlopen(urllib.request.Request(NOTO.format(cp=it['cp']), headers={'User-Agent': 'lexkite-ci'}), timeout=30).read()
        except Exception as ex: print(k, 'không tải được icon', it['cp'], repr(ex)[:80]); continue
        if os.path.exists(dst): os.replace(dst, dst[:-4] + '.ai.jpg')
        compose(png).save(dst, 'JPEG', quality=92); judge.pop(k, None)
        src[k] = dict(tier='icon', lic='Apache-2.0', by='Noto Emoji © Google', ref=f"emoji_u{it['cp']} ({it['name']})"); n += 1
        print(k, '→ icon', it['e'], it['name'])
    json.dump(src, open(srcf, 'w'), indent=1); json.dump(judge, open(jf, 'w'), indent=1)
    print(f'tầng icon: {n}/{len(keys)} nghĩa')

if __name__ == '__main__': main()
