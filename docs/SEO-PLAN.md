# Lexkite – SEO & blog tự đăng

Mục tiêu: lexkite.com đứng top tìm kiếm tiếng Việt cho từ khóa học từ vựng / luyện thi IELTS, TOEIC, TOEFL; blog tĩnh nhanh, đúng chuẩn, tự đăng 2–3 bài/ngày, hạ tầng 0 đồng chịu được hàng chục nghìn bài; sau này thêm bản dịch.
Cập nhật: 15/10/2026. Nhánh: `claude/seo-blog-3eb248` (cha gộp & phát hành).

> Kế hoạch nội dung & nhịp đăng 15 quốc gia (6 tháng): `docs/SEO-GROWTH-PLAN.md`.

## 0. Kiến trúc tóm tắt
```
content/blog/vi/<slug>.md      bài viết (front matter + Markdown) – nguồn duy nhất
content/blog/briefs.json       bước 1: từ khóa, ý định tìm kiếm, tính năng app gắn kèm, ảnh dùng
content/blog/shots.json        danh sách ảnh chụp app (id → #/route)
content/blog/media.json        sổ ảnh đã xử lý (id → kích thước, mã băm, base CDN) – nhỏ, có trong git
.media/  (git bỏ qua)          ảnh gốc PNG + bản AVIF/WebP đã nén; bản sao repo ảnh
scripts/build-blog.mjs         sinh /vi/blog/… tĩnh lúc build (chỉ bài publishAt ≤ giờ build)
scripts/blog-check.mjs         kiểm tra SEO on-page + chất lượng (hỏng → build/hàng đợi dừng)
scripts/blog-dupes.mjs         tự kiểm tra trùng lặp/đạo văn nội bộ (shingle 8 từ)
scripts/blog-schedule.mjs      xếp lịch 2–3 bài/ngày, giờ ngẫu nhiên, khác giờ nhau
scripts/blog-due.mjs           liệt kê bài vừa đến giờ đăng (cho cron) 
scripts/indexnow.mjs           báo Bing/Yandex (IndexNow) URL mới
scripts/blog-shots.mjs         chụp app thật (?sandbox=1&demo=1&hl=vi) bằng Chromium headless
scripts/blog-media.mjs         PNG → AVIF/WebP 3 cỡ, ghi media.json, --push lên repo ảnh
.github/workflows/blog-publish.yml   cron mỗi giờ → deploy hook Cloudflare Pages khi có bài đến hạn → IndexNow
```

## 1. SEO kỹ thuật – rà soát & sửa
Kết quả rà (15/10/2026, curl lexkite.com):
- [x] **Canonical/sitemap trỏ URL `.html`** nhưng Cloudflare Pages chuyển 308 `/x.html → /x` → Google thấy canonical là URL chuyển hướng. Sửa: mọi canonical, sitemap, hreflang, liên kết nội bộ dùng URL không đuôi.
- [x] **Soft 404**: đường dẫn không tồn tại trả 200 + trang app (Pages bật chế độ SPA khi thiếu `404.html`). App chỉ dùng hash route → thêm `404.html` thật (noindex) để tắt fallback.
- [x] **hreflang `?hl=xx`** trỏ tới URL có canonical là `/` (tín hiệu mâu thuẫn). Sửa: bỏ hreflang theo tham số cho trang app; hreflang chỉ dùng giữa các trang tĩnh có bản dịch thật (bài mẫu vi/en, blog khi có bản dịch).
- [x] **Sitemap index**: `sitemap.xml` thành sitemapindex → `sitemap-pages.xml` (app + trang SEO cũ) + `sitemap-blog.xml` (chia 10.000 URL/file), có `lastmod`.
- [x] robots.txt: cho phép tất cả, chặn `/?sandbox`, `/*?demo=`, khai báo sitemap index.
- [x] Open Graph/Twitter: ảnh chia sẻ 1200×630 (`og-default.png` theo bộ nhận diện), `summary_large_image`, `og:url` đúng, `og:locale`.
- [x] JSON-LD: WebApplication (trang chủ), BreadcrumbList + LearningResource (trang SEO cũ), BlogPosting + BreadcrumbList (+ FAQPage chỉ khi bài có mục hỏi đáp hiển thị), Blog/CollectionPage cho trang danh sách.
- [x] Thẻ `<html lang>`, viewport, theme-color, favicon trên mọi trang tĩnh.
- [x] Core Web Vitals trang tĩnh: không JS chặn hiển thị, CSS nội tuyến < 14 KB, ảnh có width/height (CLS 0), ảnh đầu `fetchpriority=high`, ảnh sau `loading=lazy decoding=async`, font hệ thống (không tải Google Fonts cho blog), video YouTube dạng facade.
- [x] `_headers`: cache dài cho ảnh/âm thanh/icon, `X-Content-Type-Options`, `Referrer-Policy`; trang HTML luôn kiểm lại.
- [ ] Đo Lighthouse trên bản live sau khi phát hành (cha/anh chạy PageSpeed Insights) – mục tiêu ≥ 95 cho /vi/blog/.

## 2. Blog engine
- [x] **Đa ngôn ngữ theo thư mục** (chốt 15/10/2026 với phiên chính): `/<lang>/blog/<slug>/` trên cùng tên miền – `/vi/blog/` trước, sau này `/en/`, `/ja/`, `/id/`…; không subdomain, không chia theo nước, không tự chuyển theo IP. `/blog/*` → 301 sang `/vi/blog/*` (`web/_redirects`). Mỗi ngôn ngữ có RSS `/<lang>/blog/rss.xml` và sitemap `sitemap-blog-<lang>.xml`; hreflang + x-default giữa các bản cùng `translationKey`. Chỉ mở ngôn ngữ mới khi có bài bản địa hóa thật (từ khóa riêng từng thị trường), không dịch máy hàng loạt. Ảnh dùng chung, alt/chú thích theo ngôn ngữ. (`scripts/build-blog.mjs`, không phụ thuộc gói ngoài)
- [x] Đọc `content/blog/<lang>/*.md`; bỏ `status: draft`; chỉ phát hành bài có `publishAt ≤ now` (biến `BLOG_NOW` để thử, `BLOG_DRAFTS=1` xem trước tất cả).
- [x] URL sạch: `/vi/blog/<slug>/` (vi, ngôn ngữ chính); bản dịch sau này: `/<lang>/blog/<slug>/` + hreflang theo `translationKey`.
- [x] Trang danh sách `/vi/blog/` + phân trang `/vi/blog/trang/2/`; chuyên mục `/vi/blog/chu-de/<cat>/`; thẻ `/vi/blog/the/<tag>/` (chỉ thẻ có ≥ 2 bài mới được lập chỉ mục, còn lại noindex,follow).
- [x] RSS `/vi/blog/rss.xml` (20 bài mới nhất), sitemap blog có lastmod, mục lục (TOC) tự sinh, thời gian đọc, bài liên quan (cùng chuyên mục + thẻ chung), nút gọi hành động vào app (`/#/...`).
- [x] Giao diện: màu từ token `web/css/style.css` (--primary #E5502F, --brand-ink #0F3D3E, --accent #12807A…), logo `icons/icon.svg`, chế độ tối theo hệ thống, tương phản AA, có skip-link, focus rõ, `prefers-reduced-motion`.
- [x] Markdown tối giản tự viết: tiêu đề, đoạn, danh sách, bảng, trích dẫn, code, liên kết, ảnh, đậm/nghiêng + mã riêng (xem §5).

## 3. Lịch đăng tự động
- [x] Mỗi bài có `publishAt` (ISO 8601, múi +07:00). Build chỉ đưa bài đã đến giờ.
- [x] `node scripts/blog-schedule.mjs` – bài có `publishAt:` trống (hàng đợi) được xếp 2–3 bài/ngày, giờ ngẫu nhiên 06:00–22:59 (giờ VN), mỗi bài một khung giờ khác nhau, nối tiếp ngày cuối đã xếp. `--dry` xem trước, `--seed` lặp lại được, `--status` in lịch.
- [x] `.github/workflows/blog-publish.yml`: cron mỗi giờ (phút 7) – miễn phí với repo công khai. Chạy `blog-due.mjs --since 70` → nếu có bài vừa đến giờ: `curl -X POST $CF_PAGES_DEPLOY_HOOK` (secret GitHub, **không commit**) → chờ build → `indexnow.mjs`. Không có bài → không làm gì (không tốn build).
- [x] (15/10/2026: hook "blog-cron" nhánh main + secret đã tạo) **Anh/cha làm 1 lần** (cần quyền tài khoản): Cloudflare → Pages `lexkite` → Settings → Builds → Deploy hooks → tạo hook “blog-cron” (nhánh main) → GitHub `lexkiteapp/lexkiteapp.github.io` → Settings → Secrets → Actions → `CF_PAGES_DEPLOY_HOOK` = URL hook.
- Lưu ý: GitHub tắt cron của repo không có hoạt động 60 ngày – repo đang commit thường xuyên; nếu ngừng, bấm “Enable workflow”.

## 4. Quy trình viết (mỗi bài đi đủ 7 bước; bước nào hỏng → không vào hàng đợi)
1. **Brief từ khóa & ý định** – `content/blog/briefs.json`: từ khóa chính, từ khóa phụ, ý định (informational/commercial/navigational), người đọc, câu hỏi cần trả lời, tính năng Lexkite gắn kèm, ảnh. Tránh 2 bài cùng từ khóa chính (ăn thịt từ khóa).
2. **Dàn ý** – H2/H3 trả lời đúng ý định, có phần “làm ngay trong Lexkite”, FAQ chỉ khi có câu hỏi thật.
3. **Viết nháp** – văn phong tự nhiên, ví dụ tiếng Anh tự đặt, ≥ 1.200 từ, không chép/nhại câu của nguồn nào.
4. **Kiểm tra sự thật** – đối chiếu thông tin đề thi với nguồn chính thức (IELTS.org, ETS); số liệu không chắc → bỏ hoặc nói chung. Ghi `factChecked: <ngày>` khi đã soát. Danh sách sự thật đã xác minh dùng chung: §7.
5. **Chính tả tiếng Việt** – `node scripts/vi-lint.mjs` (đã mở rộng quét `content/blog/**/*.md`).
6. **Trùng lặp/đạo văn** – `node scripts/blog-dupes.mjs`: shingle 8 từ giữa mọi bài + nội dung SEO sẵn có; ngưỡng chồng lấn > 12% → lỗi. (Không kiểm được Internet offline → bước 3 bắt buộc tự viết; có thể kiểm ngẫu nhiên bằng tìm câu trong Google.)
7. **Chấm SEO on-page** – `node scripts/blog-check.mjs [file…]`: tiêu đề 30–65 ký tự, mô tả 110–160, slug ASCII, không H1 trong thân, ≥ 4 H2, không nhảy cấp, từ khóa ở tiêu đề + 120 từ đầu + ≥ 1 H2, ≥ 1.200 từ, mọi ảnh có alt ≥ 10 ký tự và có trong media.json, ≥ 3 liên kết nội bộ (≥ 2 vào app), liên kết blog nội bộ phải tồn tại, chuyên mục hợp lệ, 2–6 thẻ, `publishAt` hợp lệ, không trùng tiêu đề/mô tả/slug, có `factChecked`, slot YouTube hợp lệ. Build gọi validator → bài lỗi làm build dừng.

## 5. Định dạng bài (đặc tả)
```markdown
---
title: "Cách học từ vựng IELTS hiệu quả: 7 bước nhớ lâu"     # 30–65 ký tự
description: "…"                                            # 110–160 ký tự
slug: cach-hoc-tu-vung-ielts-hieu-qua                        # a-z0-9-, ≤ 75
lang: vi
translationKey: cach-hoc-tu-vung-ielts-hieu-qua              # khóa chung cho các bản dịch
category: tu-vung                                            # tu-vung | ielts | toeic | toefl | phuong-phap
tags: [ielts, flashcard, fsrs]                               # 2–6, chữ thường, a-z0-9-
keyword: "cách học từ vựng ielts"                            # từ khóa chính (chữ thường)
cover: review                                                # id ảnh trong media.json (ảnh đầu bài + og:image)
coverAlt: "Màn hình ôn flashcard trong Lexkite"
publishAt: 2026-10-16T08:17:00+07:00                         # trống = đang chờ xếp lịch
updated:                                                     # tùy chọn, ngày sửa nội dung
factChecked: 2026-10-15
author: Lexkite
status: ready                                                # ready | draft
---
Đoạn mở đầu (chứa từ khóa trong 120 từ đầu)…

## Tiêu đề H2
![Alt mô tả ảnh](media:review "Chú thích hiển thị dưới ảnh")
[Mở phần Ôn tập](/#/review)   ← liên kết vào app
[Bài liên quan](/vi/blog/flashcard-fsrs-la-gi/)
{{youtube: | Gợi ý nội dung video: …}}     ← slot video TÙY CHỌN: id trống = không hiển thị gì; anh tải video lên kênh rồi điền id
{{cta: /#/practice/learn | Học thử 10 từ đầu tiên}}   ← hộp kêu gọi hành động

## Câu hỏi thường gặp      ← tùy chọn; mỗi H3 là 1 câu hỏi, đoạn sau là trả lời → FAQPage JSON-LD
### Câu hỏi…?
Trả lời…
```
Dịch sau này: tạo `content/blog/en/<slug-en>.md` cùng `translationKey` → engine tự sinh `/en/blog/<slug-en>/` và hreflang hai chiều.

## 6. Ảnh & video
- **Chọn: repo GitHub riêng `lexkiteapp/lexkite-media` + GitHub Pages** (`https://lexkiteapp.github.io/lexkite-media/blog/…`), cùng mô hình CDN phụ đang dùng (`scripts/cdn-pin.sh`).
  - Vì sao: miễn phí, không cần thẻ; repo chính không phình (ảnh không bao giờ vào repo app); đường dẫn có mã băm → bất biến, cache vĩnh viễn; đổi nhà cung cấp chỉ cần sửa `mediaBase` trong `content/blog/config.json`.
  - Không chọn jsDelivr làm gốc: giới hạn kích thước gói GitHub (~50 MB/repo) không đủ cho hàng chục nghìn ảnh; vẫn có thể bật làm lớp đệm cho ảnh đơn lẻ. Không chọn R2: kích hoạt R2 đòi phương thức thanh toán.
  - Dung lượng: ~3 ảnh/bài × 3 cỡ × 2 định dạng ≈ 250–400 KB/bài → ~2.500 bài/GB. Khi repo ảnh gần 900 MB → mở repo shard mới `lexkite-media-2`, ghi `base` theo từng ảnh trong media.json (đã hỗ trợ).
- [x] `blog-media.mjs`: PNG → AVIF + WebP ở 480/960/1440 px, `<picture>` + `srcset/sizes`, width/height cố định, lazy trừ ảnh đầu.
- [x] Video: `{{youtube: ID | tiêu đề}}` → ảnh thumbnail `i.ytimg.com` + nút play; iframe `youtube-nocookie.com` chỉ tải khi bấm (0 KB JS bên thứ ba lúc tải trang). Không bịa ID – slot trống không hiển thị.
- [x] Repo `lexkiteapp/lexkite-media` đã tạo (15/10/2026, anh đồng ý), bật Pages, đã đẩy 30 ảnh. Ảnh mới: `node scripts/blog-shots.mjs <id>` → `node scripts/blog-media.mjs --push`.

## 7. Sự thật đã xác minh (dùng chung khi viết; chỉ ghi điều chắc chắn)
- IELTS: 4 kỹ năng; thang band 0–9 (bước 0,5). Listening ~30 phút, 40 câu, 4 phần. Reading 60 phút, 40 câu, 3 bài (Academic) . Writing 60 phút: Task 1 ≥ 150 từ (~20 phút), Task 2 ≥ 250 từ (~40 phút), Task 2 chiếm tỉ trọng gấp đôi Task 1. Speaking 11–14 phút, 3 phần, Part 2 có 1 phút chuẩn bị, nói 1–2 phút. 4 tiêu chí Writing: Task Achievement/Response, Coherence & Cohesion, Lexical Resource, Grammatical Range & Accuracy. Speaking: Fluency & Coherence, Lexical Resource, Grammatical Range & Accuracy, Pronunciation. Dạng Reading: True/False/Not Given, Yes/No/Not Given, Matching Headings…
- TOEIC Listening & Reading: 200 câu, ~2 giờ (Listening ~45 phút/100 câu, Reading 75 phút/100 câu), 7 Part (Part 1 Tranh 6, Part 2 Hỏi–đáp 25, Part 3 Hội thoại 39, Part 4 Bài nói 30, Part 5 Câu chưa hoàn chỉnh 30, Part 6 Hoàn thành đoạn 16, Part 7 Đọc hiểu 54), điểm 10–990.
- TOEFL iBT: định dạng mới áp dụng từ 21/01/2026 – bài ngắn hơn (khoảng 1,5 giờ), thích ứng theo năng lực, điểm theo thang band 1–6 (kèm thang 0–120 trong giai đoạn chuyển tiếp); dạng câu mới như Complete the Words, Read in Daily Life, Read an Academic Passage (theo dữ liệu app `web/js/toefl/`). Không nêu số câu chi tiết khác ngoài dữ liệu app.
- AWL (Coxhead, 2000): 570 họ từ học thuật. NGSL: ~2.800 từ cốt lõi. FSRS: thuật toán lập lịch mã nguồn mở, có trong Anki từ bản 23.10.
- Không hứa điểm số, không nói “chính thức”, không dùng logo/đề của IELTS/ETS. Ghi nhãn hiệu thuộc chủ sở hữu.

## 8. 80 bài đầu (vi): 50 bài luyện thi/tính năng + 30 bài kiến thức evergreen (1.800–2.500 từ, có bài tự kiểm tra) – xem `content/blog/briefs.json`
- [x] Brief 50 bài (từ khóa không trùng nhau, 5 chuyên mục)
- [x] Viết 50 bài, mỗi bài ≥ 1.200 từ, ≥ 2 ảnh app thật, liên kết vào app & bài liên quan, slot YouTube tùy chọn
- [x] 6 bài đăng ngày ra mắt 16/10/2026, 74 bài (đan xen evergreen) xếp lịch 2–3 bài/ngày tới 14/11/2026; liên kết nội bộ: mỗi bài ≥ 4 link bài khác, mọi bài ≥ 3 bài trỏ tới

## 9. Công cụ tìm kiếm
- [x] IndexNow: khóa công khai `web/<key>.txt`, `scripts/indexnow.mjs` gửi api.indexnow.org (Bing, Yandex, Seznam, Naver…) sau mỗi lần đăng.
- [x] (15/10/2026 – đã xác minh qua Cloudflare, đã gửi sitemap.xml) Google Search Console (tài khoản vintagezulilyjewelry@gmail.com): thêm thuộc tính miền `lexkite.com` → bản ghi TXT `google-site-verification=…` trong Cloudflare DNS → Xác minh → gửi `https://lexkite.com/sitemap.xml`. Đăng nhập/đồng ý điều khoản: anh bấm.
- [ ] Bing Webmaster Tools: nhập từ GSC (1 chạm) sau khi GSC xong.

## 10. Hoàn tất
- [x] `node scripts/vi-lint.mjs`, `node scripts/i18n-missing.mjs --strict`, `node scripts/blog-check.mjs`, `node scripts/blog-dupes.mjs` đều qua
- [x] `bash scripts/build-web.sh` sạch, có blog
- [x] Commit trên nhánh, gửi tóm tắt cho phiên cha

## 11. Vận hành blog
```bash
# 1 bài mới: content/blog/vi/<slug>.md (slug có trong briefs.json, publishAt: để trống = vào hàng đợi)
node scripts/vi-lint.mjs                         # chính tả tiếng Việt (web/js + content/blog/<lang>/*.md)
node scripts/blog-check.mjs [file.md …]          # SEO on-page; không có file → mọi bài không phải draft
node scripts/blog-dupes.mjs [file.md …]          # trùng lặp giữa các bài (> 12%) và với nội dung site (> 5%)
node scripts/blog-schedule.mjs --dry             # xem trước lịch (2–3 bài/ngày, giờ ngẫu nhiên 06–22h VN); bài chưa qua blog-check bị giữ lại
node scripts/blog-schedule.mjs                   # ghi publishAt vào các bài trong hàng đợi (--seed N, --from YYYY-MM-DD, --per 2-3)
node scripts/blog-schedule.mjs --status          # số bài đã đăng / chờ đăng / hàng đợi + lịch từng ngày
node scripts/blog-due.mjs --since 70             # URL vừa đến giờ đăng (--all-live: mọi bài đã đăng, --json)
node scripts/indexnow.mjs --dry [url…]           # xem payload IndexNow (bỏ --dry để gửi; đọc URL từ stdin nếu không có tham số)
```
- Thử nghiệm với thư mục khác: `--root <thư mục chứa vi/, briefs.json, media.json>` (blog-check, blog-dupes, blog-schedule, blog-due).
- Commit + push bài đã xếp lịch lên `main` → cron `.github/workflows/blog-publish.yml` (phút 7 mỗi giờ) gọi deploy hook khi có bài đến hạn, chờ 5 phút rồi gửi IndexNow. Chạy tay: Actions → Blog publish → Run workflow (force = build lại dù không có bài).
- Khóa IndexNow: `content/blog/config.json` → `indexNowKey`, file công khai `web/<key>.txt` (phải có trên lexkite.com). Đổi khóa = tạo file mới + sửa config.
- **Thiết lập 1 lần (anh/cha):** Cloudflare Dashboard → Workers & Pages → `lexkite` → Settings → Builds → Deploy hooks → Add (tên `blog-cron`, nhánh `main`) → sao chép URL → GitHub `lexkiteapp/lexkiteapp.github.io` → Settings → Secrets and variables → Actions → New repository secret `CF_PAGES_DEPLOY_HOOK` = URL đó. Không ghi URL hook vào repo. Thiếu secret → workflow báo lỗi rõ ràng.

## 12. Mở rộng hàng chục nghìn bài – vẫn 0 đồng, vẫn nhẹ
| Tài nguyên | Giới hạn miễn phí | Blog dùng | Cách giữ an toàn |
|---|---|---|---|
| Cloudflare Pages: số file/lần deploy | 20.000 | 1 file/bài + trang danh sách/chuyên mục/thẻ (thẻ < 2 bài không tạo trang) | `build-web.sh` cảnh báo > 15.000, chặn > 19.500. App còn ~690 file (âm thanh đã chuyển sang CDN lexkiteapp.github.io/audio ngày 15/10/2026) → còn chỗ ~18.000 bài. |
| Cloudflare Pages: build | 500 lần/tháng, 20 phút/lần | cron chỉ gọi build khi có bài đến giờ (2–3 lần/ngày ≈ 90/tháng) | engine dựng 80 bài < 1 giây |
| Repo git | khuyến nghị < 1 GB | chỉ Markdown (~15 KB/bài → 10.000 bài ≈ 150 MB) | ảnh/video KHÔNG vào repo |
| Ảnh: GitHub Pages `lexkite-media` | ~1 GB/kho, ~100 GB băng thông/tháng | ảnh chụp app tiếng Anh DÙNG CHUNG mọi bài & mọi ngôn ngữ (~5 MB tổng), AVIF/WebP 3 cỡ | kho đầy → kho shard mới, `base` theo ảnh trong media.json |
| Video | – | YouTube (kênh Lexkite), facade: chỉ tải iframe khi bấm | 0 KB lúc tải trang |
| Trang | – | ~9 KB HTML gzip, 0 JS (trừ bài có video), CSS nội tuyến, font hệ thống | CLS 0 nhờ width/height |
| Sitemap / RSS | 50.000 URL/file | `sitemap-blog-<lang>.xml` chia 10.000 URL/file; RSS 20 bài mới | sitemap index tự gom |

Khi gần 15.000 file (bước tiếp, vẫn miễn phí, làm theo thứ tự):
1. ✓ Đã làm 15/10/2026: âm thanh app (3.866 file, 120 MB) phục vụ từ `lexkiteapp.github.io/audio/` – dist còn 691 file.
2. Tách từng ngôn ngữ blog thành dự án Pages riêng (vd. `lexkite-blog-en`) và gắn đường dẫn `/en/blog/*` bằng Cloudflare Worker route (100.000 lượt/ngày miễn phí) – hoặc khi đó nâng Workers Paid 5 USD/tháng (100.000 file, 10 triệu lượt).

## 13. Tự động hóa (chạy miễn phí trên GitHub Actions)
| Việc | Khi nào | Tự động |
|---|---|---|
| Đăng bài đúng giờ + báo IndexNow | mỗi giờ (`blog-publish.yml`) | ✓ chỉ build khi có bài đến hạn |
| Xếp lịch bài mới `status: ready` (qua cổng chất lượng), từng ngôn ngữ một nhịp | 06:30 hằng ngày (`blog-daily.yml`) | ✓ tự commit |
| Nhắc sắp hết bài (< 7 ngày) / bài kiểm chứng > 12 tháng | 06:30 hằng ngày | ✓ issue `blog-health` |
| Chặn bài kém (SEO, chính tả, trùng, ảnh, điểm < 85) | mỗi build Cloudflare + `pipeline gate` | ✓ build dừng, site giữ bản cũ |
| Gợi ý liên kết nội bộ | `node scripts/blog-pipeline.mjs links` | gợi ý, người/AI chèn |
| Viết bài (brief → chấm điểm) | theo mẫu `content/blog/prompts/` | AI làm theo lô; có thể đặt lịch phiên Claude định kỳ |
