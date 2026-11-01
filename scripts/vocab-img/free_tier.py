#!/usr/bin/env python3
"""free_tier.py – tầng MIỄN PHÍ, TẤT ĐỊNH (không giám khảo AI, không API ảnh lúc chạy app) – chạy trên CI (vocab-img-free.yml):
  python3 scripts/vocab-img/free_tier.py <out_dir> [--sheet sheet.jpg]
  1) ICON: content/lexicon/vimg-icons-lex.json → Noto Emoji png/512 (Apache-2.0) | dự phòng OpenMoji 618 (CC BY-SA 4.0)
     → nền kem phẳng s1, icon ~60 % giữa, 384 px WebP + AVIF mỗi file ≤ 6 KB.
  2) WIKI: content/lexicon/vimg-wiki.json → ảnh thu nhỏ Commons (640) → vừa khung 384 nền trắng (không cắt), WebP + AVIF ≤ 20 KB.
  Bỏ nghĩa đã có ảnh trong img.json (icon/minh hoạ đã có h; wiki đã có photo). Kết quả: <out>/final/<h>.{webp,avif} + <out>/result.json
  {k: {tier, h, fmt, src, name}} → scripts/vocab-img/publish-free.mjs gộp vào img.json + đẩy lexkite-media. --sheet: tờ soát tay."""
import hashlib, io, json, os, sys, time, urllib.request
from PIL import Image, ImageDraw
try:
    import pillow_avif  # noqa: F401
except Exception:
    pass
OUT = sys.argv[1]; arg = lambda n, d=None: sys.argv[sys.argv.index('--' + n) + 1] if '--' + n in sys.argv else d
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
J = lambda p: json.load(open(os.path.join(ROOT, p), encoding='utf-8'))
IC, WK, IMG = J('content/lexicon/vimg-icons-lex.json'), J('content/lexicon/vimg-wiki.json'), J('content/lexicon/img.json')
UA = {'User-Agent': 'LexkiteBot/1.0 (https://lexkite.com/credits/; build-time image ingest)'}
NOTO = f"https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@{IC['noto']}/png/512/emoji_u{{cp}}.png"
OPENMOJI = f"https://cdn.jsdelivr.net/npm/openmoji@{IC['openmoji']}/color/618x618/{{cp}}.png"
SIZE, CREAM, ICON_MAX, WIKI_MAX = 384, (255, 247, 234), 6000, 20000

def fetch(u, tries=3):
    for i in range(tries):
        try: return urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=40).read()
        except urllib.error.HTTPError as ex:
            if ex.code == 404: return None
            time.sleep(2 * (i + 1))
        except Exception: time.sleep(2 * (i + 1))
    return None

def enc(im, fmt, maxb, qs):
    b = b''
    for q in qs:
        o = io.BytesIO()
        if fmt == 'WEBP': im.save(o, 'WEBP', quality=q, method=6)
        else: im.save(o, 'AVIF', quality=q, speed=4)
        b = o.getvalue()
        if len(b) <= maxb: return b
    return b if len(b) <= maxb else None

def write(im, maxb):
    """→ (h, fmt) | (None, None) – WebP bắt buộc ≤ maxb; AVIF kèm nếu ≤ maxb."""
    w = enc(im, 'WEBP', maxb, (80, 70, 60, 50, 40, 30))
    if not w: return None, None
    h = hashlib.sha256(w).hexdigest()[:16]; os.makedirs(f'{OUT}/final', exist_ok=True)
    open(f'{OUT}/final/{h}.webp', 'wb').write(w); fmt = ['webp']
    try:
        a = enc(im, 'AVIF', maxb, (60, 50, 40, 30))
        if a: open(f'{OUT}/final/{h}.avif', 'wb').write(a); fmt = ['avif', 'webp']
    except Exception as ex: print('AVIF lỗi', repr(ex)[:80])
    return h, fmt

def icon_img(png):
    ic = Image.open(io.BytesIO(png)).convert('RGBA'); s = round(SIZE * 0.6); ic = ic.resize((s, s), Image.LANCZOS)
    bg = Image.new('RGBA', (SIZE, SIZE), CREAM + (255,)); bg.alpha_composite(ic, ((SIZE - s) // 2, (SIZE - s) // 2)); return bg.convert('RGB')

def wiki_img(b):
    im = Image.open(io.BytesIO(b)); im = im.convert('RGBA') if im.mode in ('P', 'LA', 'RGBA') else im.convert('RGB')
    im.thumbnail((SIZE, SIZE), Image.LANCZOS); bg = Image.new('RGB', (SIZE, SIZE), (255, 255, 255))
    bg.paste(im, ((SIZE - im.width) // 2, (SIZE - im.height) // 2), im if im.mode == 'RGBA' else None); return bg

def main():
    res, have = {}, IMG.get('items', {})
    for k, it in IC['items'].items():
        if (have.get(k) or {}).get('h') or k in IMG.get('rejected', {}): continue
        png, lic, by = fetch(NOTO.format(cp=it['cp'])), 'Apache-2.0', 'Noto Emoji © Google'
        if not png:
            png, lic, by = fetch(OPENMOJI.format(cp=it['cp'].upper().replace('_', '-'))), 'CC BY-SA 4.0', 'OpenMoji'
        if not png: print(k, 'không tải được icon', it['cp']); continue
        h, fmt = write(icon_img(png), ICON_MAX)
        if not h: print(k, 'icon > 6 KB'); continue
        res[k] = dict(tier='icon', h=h, fmt=fmt, name=it['name'], src=dict(tier='icon', lic=lic, by=by, ref=f"{it['e']} {it['name']} (U+{it['cp'].upper().replace('_', ' U+')})"))
    for k, it in WK['items'].items():
        if ((have.get(k) or {}).get('photo') or {}).get('h') or k in IMG.get('rejected', {}): continue
        b = fetch(it['thumb'])
        if not b: print(k, 'không tải được', it['file']); continue
        try: h, fmt = write(wiki_img(b), WIKI_MAX)
        except Exception as ex: print(k, 'ảnh lỗi', repr(ex)[:80]); continue
        if not h: print(k, 'wiki > 20 KB'); continue
        res[k] = dict(tier='wiki', h=h, fmt=fmt, name=it['label'], src=dict(tier='wiki', lic=it['lic'], by=it['by'], ref=it['ref']))
        time.sleep(0.3)
    json.dump({'at': time.strftime('%Y-%m-%d'), 'items': res}, open(f'{OUT}/result.json', 'w'), indent=1, ensure_ascii=False)
    n = {t: sum(1 for r in res.values() if r['tier'] == t) for t in ('icon', 'wiki')}
    print('tầng miễn phí:', n, 'webp TB', round(sum(os.path.getsize(f"{OUT}/final/{r['h']}.webp") for r in res.values()) / max(1, len(res))), 'B')
    if arg('sheet'): sheet(res, arg('sheet'))

def sheet(res, path, cell=128, cols=12):
    ks = sorted(res, key=lambda k: (res[k]['tier'], k)); rows = (len(ks) + cols - 1) // cols
    S = Image.new('RGB', (cols * cell, rows * (cell + 26)), (255, 255, 255)); d = ImageDraw.Draw(S)
    for i, k in enumerate(ks):
        x, y = (i % cols) * cell, (i // cols) * (cell + 26)
        S.paste(Image.open(f"{OUT}/final/{res[k]['h']}.webp").convert('RGB').resize((cell - 4, cell - 4)), (x + 2, y + 2))
        d.text((x + 3, y + cell), f"{i} {k.split('#')[0]}"[:20], fill=(0, 0, 0)); d.text((x + 3, y + cell + 12), res[k]['tier'], fill=(120, 120, 120))
    S.save(path, 'JPEG', quality=80)

if __name__ == '__main__': main()
