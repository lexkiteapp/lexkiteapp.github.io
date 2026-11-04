# Sinh brand/stitch/web/bind/home.json cho landing v3 (brand/stitch/web/landing-v3, DOM sau unwrap: 1 header · 2 hero · 3 trust · 4 tính năng ·
#   5 cách học · 6 tài nguyên · 7 FAQ · 8 CTA cuối · 9 footer). Chạy: python3 scripts/stitch/bind-home-v3.py && node scripts/stitch-v2-convert.mjs --web
import json
def P(*n, base=':scope'): return ' > '.join([base] + [f':nth-child({i})' for i in n])
def R(*n): return P(*n)  # trong khuôn lặp (:scope = phần tử khuôn)
LOGO = lambda w: f"'<img src=\"/icons/icon.svg?v=3\" width=\"{w}\" height=\"{w}\" alt=\"\">'"
STATIC = lambda s: "'" + s.replace("'", "\\'") + "'"  # chữ mẫu tiếng Anh (câu học viên/từ ví dụ) – giữ nguyên mọi ngôn ngữ
b = {'chrome': True, 'unwrap': ':scope > div', 'i18n': {}, 'repeat': [], 'html': {}, 'after': {}, 'attr': {}, 'tag': {}, 'remove': [], 'text': {}, 'addClass': {}}
I = b['i18n']
def key(en, vi): I[en] = vi
# ---- 1 đầu trang (→ chrome.js, d = siteChrome) ----
b['attr'][P(1, 1, 1)] = {'href': 'd.home'}; b['text']['Lexkite'] = "'Lexkite'"
b['after'][P(1, 1, 1, 1)] = LOGO(40); b['remove'].append(P(1, 1, 1, 1))
b['repeat'].append({'list': 'd.nav.slice(1)', 'as': 'n', 'sel': P(1, 1, 2, 1), 'samples': P(1, 1, 2) + ' > a',
                    'attr': {':scope': {'href': 'n[0]', 'hreflang': 'n[2]'}}, 'text': {'Blog': 'n[1]'}})
# khối data-lsw CHỈ quanh nút + menu (link "Mở app" nằm ngoài → LANG_JS của #303 đổi được ?hl= theo ngôn ngữ đã chọn)
b['wrap'] = {P(1, 2, 1): {'to': 'div', 'class': 'relative', 'attr': {'data-lsw': "''"}, 'append': 'd.menu'}}
# điện thoại = bố cục mẫu mobile v3: hàng 1 logo + nút, hàng 2 Blog/Từ vựng (nav xuống dòng); nút ngôn ngữ chỉ còn icon < sm (không cuộn ngang ở 390)
b['addClass'][P(1)] = 'flex-wrap gap-y-1'
b['cls'] = {P(1, 1): {'flex': "'contents md:flex'"}, P(1, 1, 2): {'hidden': "'flex order-last w-full md:w-auto md:order-none'"}, P(1, 2): {'gap-3': "'gap-2 sm:gap-3'"}}
b['addClass'][P(1, 2, 1, 2)] = 'hidden sm:inline'
b['attr'][P(1, 2, 1)] = {'type': "'button'", 'aria-haspopup': "'true'", 'aria-expanded': "'false'", 'aria-controls': "'lsw-m'", 'aria-label': 'd.lswLabel'}
b['text']['English'] = 'd.langName'
b['attr'][P(1, 2, 2)] = {'data-tsw': "''", 'data-l': 'd.tswL', 'aria-label': 'd.tswA'}
b['html'][P(1, 2, 2)] = 'd.tswSvg'
b['attr'][P(1, 2, 3)] = {'href': 'd.nav[0][0]'}; b['text']['Open app'] = 'd.nav[0][1]'
# ---- 2 hero ----
b['text']['Free Web App + Chrome Extension'] = 'd.hero.eyebrow'
b['html'][P(2, 1, 2)] = "e(d.hero.h1a) + '<br>' + e(d.hero.h1b)"
b['html'][P(2, 1, 3)] = 'e(d.hero.lead)'
b['attr'][P(2, 1, 4, 1)] = {'href': 'd.start', 'data-cta': "'start'"}
b['html'][P(2, 1, 4, 1, 1)] = 'e(d.hero.cta)'
b['attr'][P(2, 1, 4, 2)] = {'href': 'd.store', 'target': "'_blank'", 'rel': "'noopener'", 'data-ext-cta': "'land'", 'hidden': "''"}
key('Add to Chrome', 'Thêm vào Chrome')
b['attr'][P(2, 1, 4, 3)] = {'href': 'd.appQ', 'data-get-app': "'head'", 'hidden': "''"}
b['text']['Get the app'] = 'd.getAppL'
# dòng liên kết phụ dưới CTA: "Tôi đã có tài khoản" (chữ mẫu) + kiểm tra trình độ (giữ lối vào cũ) – cùng khuôn liên kết của mẫu
b['repeat'].append({'list': 'd.heroLinks', 'as': 'k', 'sel': P(2, 1, 5, 1), 'samples': P(2, 1, 5) + ' > a', 'attr': {':scope': {'href': 'k[0]'}}, 'html': {':scope': 'e(k[1])'}})
b['addClass'][P(2, 1, 5)] = 'flex flex-wrap gap-x-6'
key('“Hi! Ready for 5 minutes today?”', '“Chào bạn! Học 5 phút hôm nay nhé?”')
b['after'][P(2, 2, 3, 1)] = 'd.ama'; b['remove'].append(P(2, 2, 3, 1))
# mẫu: bong bóng lời chào animate-pulse lặp vô hạn → lúc mờ chữ < 4,5:1 (Lighthouse color-contrast, web-sweep) + chuyển động không dừng gây khó chịu → bỏ (known-issues.json)
b['cls'][P(2, 2, 2)] = {'animate-pulse': "''"}
# ---- 3 dải tin cậy ----
for en, vi in [('100% free', 'Miễn phí 100%'), ('Forever, no paywalls', 'Mãi mãi, không tường phí'), ('No ads blocking lessons', 'Không quảng cáo chặn bài học'),
               ('Pure uninterrupted focus', 'Tập trung, không bị ngắt'), ('15 interface languages', 'Giao diện 15 ngôn ngữ'), ('Learn in your native tongue', 'Học bằng tiếng mẹ đẻ'),
               ('A1 to C2 levels', 'Trình độ A1 đến C2'), ('CEFR mapped curriculum', 'Lộ trình theo khung CEFR')]: key(en, vi)
# ---- 4 tính năng: 6 thẻ (4 khuôn có minh hoạ + khuôn trơn cho 2 tính năng còn lại), d.feat = [{v, h, p}] theo thứ tự hiển thị ----
b['text']['Designed for how your brain retains English'] = 'd.featuresH'
b['text']['Four thoughtfully calibrated tools built into one free daily routine.'] = 'd.featuresSub'
card = lambda: {'html': {R(1, 2): 'e(f.h)', R(1, 3): 'e(f.p)'}}
plain = card(); plain['remove'] = [R(1, 1), R(2)]
fb = {'fsrs': card(), 'call': card(), 'exam': card(), 'ext': card(), 'plain': plain}
fb['ext']['tag'] = {R(2): {'to': 'a'}}; fb['ext']['attr'] = {R(2): {'href': 'd.store', 'target': "'_blank'", 'rel': "'noopener'"}}
fb['ext']['addClass'] = {R(2): 'min-h-[44px]'}
fb['fsrs']['text'] = {'ubiquitous': STATIC('ubiquitous'), 'FSRS-v5': STATIC('FSRS-v5')}
fb['call']['text'] = {'“Great sentence! Try ‘although’.”': STATIC('“Great sentence! Try ‘although’.”')}
fb['exam']['text'] = {'IELTS': STATIC('IELTS'), 'TOEIC': STATIC('TOEIC'), 'TOEFL': STATIC('TOEFL'), 'Task 2 Academic': STATIC('Task 2 Academic')}
fb['ext']['text'] = {'disparities': STATIC('disparities'), '...economic': STATIC('...economic'), 'continue...': STATIC('continue...')}
b['repeat'].append({'list': 'd.feat', 'as': 'f', 'variants': {'fsrs': P(4, 2, 1), 'call': P(4, 2, 2), 'exam': P(4, 2, 3), 'ext': P(4, 2, 4), 'plain': P(4, 2, 1)},
                    'samples': P(4, 2) + ' > div', 'pick': 'f.v', 'bind': fb})
for en, vi in [('Optimal: 94%', 'Tối ưu: 94%'), ('Review scheduled in 3 days', 'Ôn lại sau 3 ngày'), ('Free spaced repetition', 'Lặp lại ngắt quãng miễn phí'),
               ('Audio Call · 02:14', 'Cuộc gọi thoại · 02:14'), ('Gentle grammar correction', 'Sửa ngữ pháp nhẹ nhàng'), ('Safe speaking room', 'Không gian luyện nói an toàn'),
               ('Scored: Band 7.5', 'Điểm: Band 7.5'), ('Realistic score evaluation', 'Chấm điểm sát đề thật'), ('browser tab', 'thẻ trình duyệt'),
               ('Added to your Deck', 'Đã thêm vào bộ thẻ'), ('Double-click instant card', 'Bấm đúp là có thẻ'),
               ('Chrome Web Store add-on', 'Add-on trên Chrome Web Store')]: key(en, vi)
# ---- 5 cách học ----
b['text']['How it works'] = 'd.stepsH'
key('A simple, bite-sized habit that fits effortlessly into your day.', 'Một thói quen nhỏ, đơn giản, vừa vặn với ngày của bạn.')
for i in range(3):
    b['html'][P(5, 2, 1, i + 1, 2, 1)] = f'e(d.steps[{i}][0])'; b['html'][P(5, 2, 1, i + 1, 2, 2)] = f'e(d.steps[{i}][1])'
key('“Step by step, together.”', '“Từng bước, cùng nhau.”')
b['after'][P(5, 2, 2, 2, 1)] = 'd.carlos'; b['remove'].append(P(5, 2, 2, 2, 1))
# ---- 6 tài nguyên: d.rescards [{v: blog|doc|list, href, hl, h, p, more}] ----
b['text']['Free resources'] = 'd.resH'
b['text']['Open-access materials curated to boost your fluency and test scores.'] = 'd.resSub'
rb = lambda: {'attr': {':scope': {'href': 'r.href', 'hreflang': 'r.hl'}}, 'html': {R(1, 2): 'e(r.h)', R(1, 3): 'e(r.p)', R(2, 1): 'e(r.more)'}}
b['repeat'].append({'list': 'd.rescards', 'as': 'r', 'variants': {'blog': P(6, 2, 1), 'doc': P(6, 2, 2), 'list': P(6, 2, 3)}, 'samples': P(6, 2) + ' > a', 'pick': 'r.v',
                    'bind': {'blog': rb(), 'doc': rb(), 'list': rb()}})
# ---- 7 FAQ: <details>/<summary> (mở/đóng không cần JS), câu đầu mở sẵn như mẫu ----
b['text']['Frequently asked questions'] = 'd.faqH'
key('Everything you need to know about learning with Lexkite.', 'Mọi điều bạn cần biết khi học với Lexkite.')
qb = lambda first: {'tag': {R(1): {'to': 'summary'}, ':scope': {'to': 'details'}}, 'html': {R(1, 1): 'e(q[0])', R(2): 'e(q[1])', **({} if first else {R(1, 2): "'expand_more'"})},
                    **({'attr': {':scope': {'open': "''"}}} if first else {})}
b['repeat'].append({'list': 'd.faq', 'as': 'q', 'variants': {'first': P(7, 2, 1), 'one': P(7, 2, 1)}, 'samples': P(7, 2) + ' > div', 'pick': "i === 0 ? 'first' : 'one'",
                    'bind': {'first': qb(True), 'one': qb(False)}})
# ---- 8 CTA cuối ----
b['text']['Ready for your first 5 minutes?'] = 'd.finalH'
b['html'][P(8, 3)] = 'e(d.finalP)'
b['attr'][P(8, 4)] = {'href': 'd.start'}; b['html'][P(8, 4, 1)] = 'e(d.hero.cta)'
# ---- 9 chân trang (→ chrome.js) ----
b['after'][P(9, 1, 1, 1, 1)] = LOGO(32); b['remove'].append(P(9, 1, 1, 1, 1))
b['tag'][P(9, 1, 1, 1)] = {'to': 'a', 'addClass': 'min-h-[44px] min-w-[44px]'}; b['attr'][P(9, 1, 1, 1)] = {'href': 'd.home'}
b['html'][P(9, 1, 1, 2)] = 'e(d.foot)'
b['html'][P(9, 1, 1, 3)] = "e(d.copy) + '<span class=\"block mt-2 font-medium\">' + e(d.tm) + '</span>'"
b['after'][P(9, 1, 1, 3)] = 'd.getApp'
cb = {'html': {R(1): 'e(c.h)'}, 'tag': {R(1): {'to': 'h3'}},  # h4 → h3: không nhảy cấp tiêu đề (h2 CTA cuối → h3 chân trang; Lighthouse heading-order)
      'repeat': [{'list': 'c.items', 'as': 'it', 'sel': ':scope > ul > li:nth-child(1)', 'samples': ':scope > ul > li',
      'attr': {':scope > a': {'href': 'it[0]'}}, 'html': {':scope > a': 'e(it[1])'}, 'addClass': {':scope > a': 'min-w-[44px]'}}]}
b['repeat'].append({'list': 'd.cols', 'as': 'c', 'sel': P(9, 1, 2), 'samples': ', '.join(P(9, 1, i) for i in (2, 3, 4)), **cb})
b['html'][P(9, 2, 1, 1)] = 'e(d.langLabel)'
b['attr'][P(9, 2, 1)] = {'data-lsw': "''"}; b['addClass'][P(9, 2, 1)] = 'relative'
b['attr'][P(9, 2, 1, 2)] = {'type': "'button'", 'aria-haspopup': "'true'", 'aria-expanded': "'false'", 'aria-controls': "'lsw-m2'", 'aria-label': 'd.lswLabel'}
b['text']['English (US)'] = 'd.langName'
b['after'][P(9, 2, 1, 2)] = 'd.menu2'
b['after'][P(9, 2, 2)] = 'd.pill'; b['remove'].append(P(9, 2, 2))
b['after'][P(9)] = "d.js ? '<script>' + d.js + '</script>' : ''"
json.dump(b, open('brand/stitch/web/bind/home.json', 'w'), ensure_ascii=False, indent=1); open('brand/stitch/web/bind/home.json', 'a').write('\n')
print('ok', len(I), 'khóa')
