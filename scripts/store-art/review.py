# Trang duyệt duy nhất của bộ ảnh: <out>/review/index.html + ảnh thu nhỏ, kèm điểm QC từng ảnh (đọc <out>/qc.json). Dùng: python3 -I scripts/store-art/review.py <out>
import html, json, os, sys
from PIL import Image
out = sys.argv[1]; q = json.load(open(os.path.join(out, 'qc.json'))); rv = os.path.join(out, 'review'); os.makedirs(rv, exist_ok=True)
GROUPS = [('apple/iphone-69', 'App Store · iPhone 6.9"'), ('apple/ipad-13', 'App Store · iPad 13"'), ('play/', 'Google Play'), ('chrome/', 'Chrome Web Store'), ('web/', 'Web và mạng xã hội')]
body = []
for pre, title in GROUPS:
    items = [i for i in q['items'] if i['file'].startswith(pre)]
    if not items: continue
    cards = []
    for i in items:
        src = os.path.join(out, i['file'])
        if not os.path.exists(src):
            cards.append(f'<figure class="miss"><figcaption><b>{i["score"]}</b> {html.escape(i["file"])}<br>{"<br>".join(map(html.escape, i["issues"]))}</figcaption></figure>'); continue
        im = Image.open(src); w, h = im.size
        im = im.convert('RGB'); im.thumbnail((720, 900)); name = i['file'].replace('/', '_').replace('.png', '.jpg'); im.save(os.path.join(rv, name), quality=80)
        bad = any(x.startswith('✗') for x in i['issues'])
        cards.append(f'<figure class="{"bad" if bad else ""}"><a href="{name}"><img loading="lazy" src="{name}" width="{im.width}" height="{im.height}" alt=""></a><figcaption><b>{i["score"]}</b> {html.escape(i["file"])} · {w}×{h}{"<br>" + "<br>".join(map(html.escape, i["issues"])) if i["issues"] else ""}</figcaption></figure>')
    body.append(f'<h2>{title}</h2><div class="grid">{"".join(cards)}</div>')
note = 'Ảnh Apple trong bản xem thử dùng ảnh chụp web, không dùng để nộp.' if q['preview'] else ''
page = f'''<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Duyệt ảnh giới thiệu</title><style>
:root{{--bg:#f7f3ea;--ink:#123;--mut:#546;--card:#fff;--line:#ddd3bf;--bad:#b3261e}}
@media (prefers-color-scheme:dark){{:root:not([data-theme=light]){{--bg:#0b171a;--ink:#eef6f7;--mut:#a9bcc0;--card:#122025;--line:#284149;--bad:#ff8a80}}}}
:root[data-theme=dark]{{--bg:#0b171a;--ink:#eef6f7;--mut:#a9bcc0;--card:#122025;--line:#284149;--bad:#ff8a80}}
body{{margin:0;padding:24px 16px;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,sans-serif}}main{{max-width:1320px;margin:auto}}h1{{font-size:26px;margin:0 0 4px}}h2{{font-size:19px;margin:28px 0 12px}}p{{color:var(--mut);margin:0}}
.grid{{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:14px}}figure{{margin:0;background:var(--card);border:1px solid var(--line);border-radius:12px;overflow:hidden}}figure.bad,figure.miss{{border-color:var(--bad)}}img{{display:block;width:100%;height:auto}}figcaption{{padding:8px 10px;font-size:12px;color:var(--mut);overflow-wrap:anywhere}}figcaption b{{color:var(--ink);font-size:14px}}
</style></head><body><main><h1>Duyệt ảnh giới thiệu Lexkite</h1><p>{q["total"]} ảnh · ngôn ngữ {", ".join(q["langs"])} · QC trung bình {q["avg"]}/100 · {q["fail"]} ảnh đỏ. {note}</p>{"".join(body)}</main></body></html>'''
open(os.path.join(rv, 'index.html'), 'w', encoding='utf-8').write(page)
print('✓ review', q['total'])
