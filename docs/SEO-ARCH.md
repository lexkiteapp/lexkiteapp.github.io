# SEO-ARCH – nội dung công khai của app thành trang tĩnh có thể index (24/10/2026)

> TL;DR: Biến nội dung công khai của app thành trang tĩnh index được: kiểm kê, mô hình trang tĩnh, sitemap/hreflang/IndexNow, cổng, nhân rộng. Nguồn: scripts/build-seo-pages.mjs.
> Đọc khi: sửa SEO twin/trang tĩnh.

Một nguồn: `scripts/build-seo-pages.mjs` (sinh) · `scripts/test/seo-pages.mjs` (cổng) · `web/js/seo-twin.js` (app → trang tĩnh).
Đọc kèm: docs/SEO-PLAN.md, docs/SEO-GROWTH-PLAN.md §4, docs/BLOG-RUNBOOK.md, docs/LEXICON.md.

## 0. Thiết kế 10 dòng (METHODS "Làm đúng 1 lần")
1. **Mục tiêu đo được:** nội dung giá trị trong app (`#/dict/<từ>`, `#/confidence/<bài>`) có URL tĩnh, index được, 15 ngôn ngữ; GSC "Đã index" tăng theo từng loại (sitemap riêng từng loại × ngôn ngữ để đo).
2. **Tài nguyên:** 0 đồng. Pages ≤ 18.000 file (cổng an toàn; trần Cloudflare 20.000). D1/AI/Worker: 0 lượt (trang sinh lúc build). Khung app: **+0 byte** (`seo-twin.js` nạp lười từ `notices.js`, không thuộc SHELL).
3. **Điểm hỏng & chặn:** trùng tiêu đề / thiếu canonical / hreflang không hai chiều / trang mồ côi / vượt số file → `scripts/test/seo-pages.mjs` đỏ (npm test). Trang mỏng → `noindex,follow` + không vào sitemap/hreflang. Trang từ: thêm cổng độ dày `DEPTH_MIN` (`scripts/lib/word-depth.mjs`, docs/specs/seo-words-depth.md). Bản dịch máy thô (cờ gói 0) → noindex.
4. **Ai giữ file nào:** generator + cổng + seo-twin = mảng SEO (phiên chính). Nguồn dữ liệu vẫn của chủ mảng: kho từ (`web/js/data.js`, `web/js/lib/*`, `web/packs/*`), Giao tiếp tự tin (`content/confidence/**`). Generator chỉ ĐỌC.
5. **Công tắc tắt:** `SEO_PAGES=0 npm run build` bỏ bước sinh (trang cũ biến mất ở lần deploy sau; sitemap tự bỏ). Quay lại: revert commit generator.

## 1. Kiểm kê (build 24/10, `dist/` 2.924 file trước thay đổi)
| Nội dung app | Route app | Trang tĩnh có sẵn | Ngôn ngữ | Số trang | Chất lượng |
|---|---|---|---|---|---|
| Bộ từ vựng (chủ đề, AWL…) | `#/topic/<id>` | `/tu-vung/<id>`, `/en/vocabulary/<id>` | vi, en | 83 + 83 | tốt: canonical, hreflang vi↔en, LearningResource, sitemap |
| Ngữ pháp | `#/grammar/<id>` | `/ngu-phap/<id>`, `/en/grammar/<id>` | vi, en | 77 + 77 | tốt (24/10: en viết riêng, hreflang vi↔en, 3 câu quiz có đáp án) |
| Phát âm | `#/pron/<id>` | `/phat-am/<slug>`, `/en/pronunciation/<slug>` | vi, en | 56 + 56 | mới 24/10: khẩu hình, từ ví dụ + audio, cặp tối thiểu |
| IELTS Writing Task 1 / GT | `#/model/t1-…`, `#/letters/…` | `/en/ielts-writing/task-1/<id>`, `/en/ielts-writing/general-task-1/<id>` (↔ `/viet-thu/`) | en (+vi thư) | 38 + 24 | mới 24/10; Task 2 vẫn ở `/en/samples/` (không nhân đôi) |
| Bài mẫu Writing | `#/model/…` | `/samples/`, `/en/samples/` | vi, en | 80 + 80 | tốt |
| Speaking IELTS | `#/speaking/…` | `/speaking/`, `/en/speaking/` | vi, en | 40 + 40 | tốt |
| Thư mẫu GT | `#/letters/…` | `/viet-thu/` | vi | 24 | tốt |
| Blog | – | `/<lang>/blog/` | 15 | 185 | tốt (sitemap theo ngôn ngữ, IndexNow) |
| **Từ điển (8.177 mục)** | `#/dict/<từ>` | **không có** | – | 0 | – |
| **Giao tiếp tự tin (24 bài)** | `#/confidence/<id>` | **không có** | – | 0 | – |
| Chia động từ, Cách dùng | `#/verb/…`, `#/usage/…` | không có | – | 0 | để đợt sau (§6) |

Lỗ hổng lớn nhất: 13 ngôn ngữ ngoài vi/en chỉ có landing + blog → không có trang công cụ nào để xếp hạng long-tail ("achieve significado", "achieve 뜻", "achieve là gì").

## 2. Mô hình chọn: (a) trang tĩnh dựng sẵn cho long-tail + (b) app gắn canonical về bản tĩnh
### (a) Trang tĩnh
- **Từ:** `/<lang>/words/<slug>` (cả vi: `/vi/words/…`, nhất quán với `/vi/blog/`). Mục lục `/<lang>/words/` (A–Z).
- **Bài giao tiếp:** `/<lang>/conversations/<id>`, mục lục `/<lang>/conversations/` (theo cấp A1–B2).
- Mỗi trang: canonical = chính nó; hreflang = các ngôn ngữ có bản **index được** của cùng mục + `x-default` → bản en; nút "Mở trong app" → `/app/?hl=<lang>#/dict/<từ>` hoặc `#/confidence/<id>`.
- Dữ liệu ngôn ngữ: nghĩa bản địa từ `web/packs/<lang>.json` (cờ ≥ 1 = theo từ loại/bảng tay; cờ 0 = dịch máy thô → noindex); vi lấy nghĩa soạn tay trong kho; ghi chú học từ `web/js/notes/*.json` (chỉ trang vi – soạn tiếng Việt). Bài giao tiếp: `content/confidence/units/*.json` + `content/confidence/i18n/<lang>.json` (chính bản dịch app đang dùng); thiếu > 10 % chuỗi → noindex.
- **JSON-LD (chỉ loại hợp lệ):** từ = `DefinedTerm` + `inDefinedTermSet` (mục lục = `DefinedTermSet`); bài = `LearningResource` (`educationalLevel` CEFR, `isPartOf` → `Course` ở mục lục); `BreadcrumbList` mọi trang. **FAQPage chỉ trên trang từ** có khối "Câu hỏi thường gặp" ≥ 2 câu, chữ = đúng chữ `<details>` hiển thị (cổng seo-pages kiểm) – Google chỉ hiện rich result FAQ cho trang chính phủ/y tế từ 08/2023, nên không cược thứ hạng vào nó (3/11, docs/specs/seo-words-depth.md).

### Chọn top N theo giá trị tìm kiếm (không sinh tất cả)
Điểm mỗi mục (tính lúc build, ổn định): cấp CEFR (B1–C1 cao nhất – nhóm người học tra nhiều nhất; A1 thấp – từ quá dễ ít ai tra), thuộc bộ thi (AWL/IELTS/TOEIC/đề thi +), độ giàu (ví dụ, collocation, đồng nghĩa, IPA Mỹ, có file đọc, có ghi chú), trừ điểm cụm dài ≥ 4 từ và từ ≤ 2 chữ. Lọc cứng: phải có định nghĩa + ví dụ.
| Ngôn ngữ | N | Lý do |
|---|---|---|
| en, vi | 1.500 | dữ liệu soạn tay đầy đủ; vi có ghi chú lỗi người Việt |
| de, fr, ja, ko, ar | 650 | 4/11: thị trường CPM cao (`PRIORITY_LANGS`, `functions/api/_cpm.js`), `SEO_N_PRIORITY`. Dữ liệu đủ tới ≈ 1.300 từ có nghĩa thật mỗi ngôn ngữ; giới hạn ở 650 vì ngân sách file (xem dưới) |
| 8 ngôn ngữ còn lại | 400 | chỉ từ có nghĩa cờ ≥ 1; nhân dần theo số liệu GSC (§5) – tránh nghìn trang chưa được index làm loãng crawl budget domain mới |
| Bài giao tiếp | 24 × 15 | toàn bộ (ít, giá trị cao: "how to order coffee in English") |
Tập 13 ngôn ngữ ⊂ tập en → x-default luôn tồn tại.

### Ngân sách file
| | file |
|---|---|
| Trước | 2.924 |
| Từ: 2 × 1.500 + 13 × 400 + 15 mục lục | 8.215 |
| Giao tiếp: 24 × 15 + 15 mục lục | 375 |
| Sitemap mới (words × 15 + conversations) | 16 |
| **Sau (ước)** | **≈ 11.530** (cổng 18.000 → còn ≈ 6.400 cho blog/đợt sau) |
Đo 4/11: `dist` 13.696 file (Web sweep trên main), 5 ngôn ngữ × +250 trang → ≈ 14.950, dưới mốc 15.000. Dist tăng ≈ 100 file trong 9 giờ đo được 4/11 (blog đăng hằng ngày), nên nâng tiếp lên 1.000 phải làm cùng đường chuyển trang từ dưới đây. Không cần host ngoài Pages lúc này. Khi vượt 15.000: chuyển trang từ 13 ngôn ngữ sang repo GitHub Pages `lexkite-media` (đã dùng cho ảnh blog) qua Worker `lexkite-media` phục vụ cùng tên miền con, hoặc shard theo chữ cái – generator đã tách `--out`, chỉ cần đổi thư mục đích.

### (b) App → bản tĩnh
`web/js/seo-twin.js` (≈ 2 KB, ngoài SHELL, chỉ chạy trên web lexkite.com/pages.dev – không chạy trong Capacitor/add-on): khi đổi route `#/dict/<từ>`, `#/confidence/<id>`, `#/topic/<id>`, `#/grammar/<id>` mà bản tĩnh tồn tại (danh mục `/data/seo-twins.json`, sinh cùng lúc, no-cache) → đặt `<link rel=canonical>` tới bản tĩnh + một liên kết nhỏ "🌐 Trang web" cuối trang (chia sẻ link index được thay vì link #/). Không đổi luồng học, không chặn vẽ trang.
Nạp: dòng cuối `notices.js` (đã tải lười 2,5 s sau khi mở app) → **khung app +0 byte**.

## 3. Có chuyển app sang đường dẫn History API (`/app/dict/achieve`) không? **Không.**
- **Capacitor (iOS/Android)** nạp `www/` từ file nội bộ: đường dẫn sâu không có máy chủ trả `index.html` → phải viết lại toàn bộ deep link, Universal/App Links, nút Quay lại Android.
- **Service worker** (`/app/` scope, SHELL, chế độ LEGACY phạm vi "/") phải phục vụ fallback điều hướng cho mọi đường dẫn – rủi ro cache trộn bản cũ/mới (đã từng lỗi, xem METHODS).
- **Add-on Chrome** chạy `chrome-extension://…/app/index.html#/…` – không có History fallback; ~40 nơi trong code sinh `#/…` (popup, thông báo, widget, liên kết chia sẻ cũ đã phát tán).
- **Lợi ích SEO gần như 0**: `/app/` là SPA cần JS + dữ liệu lười; trang tĩnh dựng sẵn cho Google HTML đầy đủ ngay, nhẹ hơn (≤ 10 KB gz), Core Web Vitals tốt hơn SPA. Cùng nội dung, hai URL index = trùng lặp – vẫn phải chọn 1 canonical, và bản tĩnh thắng.
→ Giữ hash route trong app; SEO thuộc về trang tĩnh. Xem lại chỉ khi bỏ Capacitor/add-on.

## 4. Sitemap, hreflang, IndexNow, cổng
- Sitemap theo loại × ngôn ngữ: `sitemap-words-<lang>.xml` (15 file), `sitemap-conversations.xml`; `build-sitemap-index.mjs` tự gom mọi `sitemap-*.xml`. Mỗi `<url>` kèm `xhtml:link` cụm hreflang như trong `<head>`.
- Trang noindex không có trong sitemap và không nằm trong cụm hreflang của trang khác.
- **lastmod thật theo URL (§4b, 3/11):** trước đây `gitDate()` lấy ngày commit của cả thư mục code (`web/js/lib`, `web/packs` đổi hằng ngày) → ~8.500 URL luôn "hôm nay" → Google bỏ qua lastmod cả site. Nay `scripts/lib/lastmod.mjs` băm phần `<main>` (bỏ script/style/`?v=`/thủy ấn) và tra sổ `content/seo/lastmod.json`: trùng → giữ ngày, đổi → hôm nay, chưa có → gitDate. `seo-indexnow.yml` (`LASTMOD_WRITE=1`) ghi sổ + commit; IndexNow dùng cùng băm nên đổi khung trang không ping lại cả site. Test `scripts/test/lastmod.mjs`.
- **IndexNow:** `dist/seo-urls.txt` (URL + băm nội dung). Workflow `seo-indexnow.yml` (push main đụng nguồn, hoặc chạy tay): build → so với bản lưu ở cache Actions lần trước → chờ deploy (URL mẫu trả 200) → `scripts/indexnow.mjs` (dùng lại của blog, ≤ 10.000 URL/lần).
- **Cổng `scripts/test/seo-pages.mjs`** (npm test, chạy trên `dist/`): mọi trang HTML index được có canonical tuyệt đối = chính nó; tiêu đề + mô tả không trùng (toàn site); hreflang hai chiều (A trỏ B ⇒ B trỏ A), có chính nó và x-default; không trang index được nào mồ côi (≥ 1 liên kết vào từ trang khác); không trang noindex trong sitemap; `dist` < 18.000 file. `seo-sitemap.mjs` vẫn kiểm sitemap ↔ canonical.
- Lighthouse SEO: thêm 2 trang mẫu (`/es/words/…`, `/en/conversations/…`) vào `lighthouse.yml` (GitHub Actions, không đo trên máy).

## 5. Nhân rộng (thử nhỏ → đo → mới nhân)
- Tuần 1–2 sau deploy: GSC theo sitemap từng loại × ngôn ngữ. Ngôn ngữ nào ≥ 60 % trang "Đã index" và có hiển thị → tăng N 400 → 1.000 (`SEO_N_OTHER`). Tỷ lệ < 30 % → giữ, bổ sung nội dung bản địa (ví dụ dịch, lỗi hay gặp theo L1) trước.
- Nghĩa cờ 2 (AI theo nghĩa + từ loại, `lexicon-i18n.yml`) phủ thêm ngôn ngữ nào → trang ngôn ngữ đó tự giàu hơn ở build sau, không cần sửa generator.

## 6. Bài học app → trang en (24/10)
- Generator: `scripts/build-samples-en.mjs` (khối "Bài học app") + vi `/phat-am/` trong `build-samples.mjs`; hreflang vi↔en qua `out()`; sitemap riêng `sitemap-{grammar,pronunciation,ielts-writing}.xml`; IndexNow: `.seo-urls-en.txt` → `build-seo-pages.mjs` gộp vào `.seo-urls.txt`.
- Chữ tiếng Anh: `content/seo-en/{grammar,pron}.json` (khóa = chuỗi gốc tiếng Việt, giá trị = bản viết riêng cho người học quốc tế; `""` = câu chỉ đúng với người Việt → bỏ; `pron.json › _meta` = slug + tên trang). KHÔNG dùng `web/i18n/content/en.json` (dịch máy). Sửa/thêm bài trong app → chuỗi mới chưa có bản en → thiếu > 10 % thì trang tự noindex (không hreflang/sitemap) tới khi bổ sung.
- Không làm: trang 13 ngôn ngữ (chỉ có dịch máy); đề TOEIC/TOEFL đầy đủ (lộ đáp án); Speaking đã có `/en/speaking/` (40).

## 7. Còn lại (đợt sau)
- Ngữ pháp/phát âm 13 ngôn ngữ: cần bản viết riêng (dịch máy = trang mỏng). Task 1 Academic bản vi (`/samples/task-1/`) – nội dung chú thích vi đã có.
- Chia động từ `#/verb/<v>` (SEO-GROWTH-PLAN §4: 300 động từ × 15) – dùng cùng khung generator.
- Speaking/bài mẫu cho 13 ngôn ngữ.

## 9. Đo theo nước & nhóm CPM (4/11)
- **Một nguồn:** `functions/api/_cpm.js` – 30 nước `HIGH_CPM` (GIẢ ĐỊNH; có RPM thật từ `scripts/ads/report.mjs` thì thay ở đây), `tierOf` nhận mã Cloudflare (`US`) lẫn GSC (`usa`), chuẩn hoá nguồn `srcOf`/`normRef`.
- **Mốc 4/11** (D1 `sessions` từ 15/10, người thật = `bot IS NULL` và `dur ≥ 10`, 309 khách): VN 40 %, CPM cao 34 %, khác 26 %. Đo lại: `SELECT country, COUNT(DISTINCT vid) FROM sessions WHERE day >= '<ngày>' AND bot IS NULL AND dur >= 10 GROUP BY country`.
- **GSC hằng tuần:** `scripts/seo/gsc.mjs` kéo thêm dimension `country` (28 ngày, 7 ngày, 7 ngày trước – không mất lượt ẩn danh như query×page×country) → bảng "Theo nhóm CPM" + "Theo nước" trong báo cáo/issue `seo-weekly`.
- **Vì sao `ref` luôn trống (gốc):** `sessions` chỉ ghi app, mà người từ Google vào trang tĩnh trước rồi mới bấm sang `/app/` → `document.referrer` là chính lexkite.com → bị lọc thành trực tiếp.
- **Sửa:** `SRC_JS` (`site-layout.mjs`, nằm trong `/js/site-ui.js`) khi khách từ ngoài vào trang tĩnh: lưu tên miền nguồn 30 phút (`lk.src`, không cookie) và gửi `/api/hit t:'l'` tối đa 1 lần/nguồn/30 phút/máy. App đọc `lk.src`, nếu không có thì ghi `site:<loại trang>`.
- **Lưu:** `ext_events` kind `land:<nguồn>:<nước>:<loại trang>:<ngôn ngữ trang>` – không URL, không IP, không vid; nguồn ngoài danh sách → `other`. Bot và bản preview bị bỏ ở máy chủ.
- **Quota:** +1 lượt Functions và +1 dòng ghi D1 cho mỗi lượt khách ngoài (không tính lượt xem nội bộ); 1.000 lượt/ngày ≈ 1 % trần ghi D1 miễn phí, 1 % Functions. Trần 30 lượt/giờ/IP. Tắt: biến Pages `HIT_LAND=0`.
- **Admin:** Quản trị › Thống kê có thẻ "Nhóm CPM cao" và "Khách từ ngoài vào trang tĩnh". Số 692 Mỹ là truy vấn thô trên D1 (gồm bot); bảng nước của admin vốn đã lọc, nay có test khoá từng loại `dc, ci-app, ua, admin, bot` (`scripts/test/analytics.mjs`).
- **Nội dung theo thị trường:** `gsc-priority.json` có `cpmShare` + `score = gain × (1 + CPM_W × cpmShare)`, xếp theo `score` (nhu cầu tiếng Việt lớn hơn hẳn vẫn đứng trên, không mục nào bị loại). Cụm US/UK/CA/AU/NZ: `content/blog/plan/2027-01-cpm-clusters.json` (IELTS định cư, người mới nhập cư, nghĩa từ, PTE/CELPIP so sánh trung thực vì app không có đề thi của hai kỳ này; cổng `scripts/test/cpm-plan.mjs`). NL, SE, NO, DK, FI… dùng trang en, không mở ngôn ngữ mới.

## 10. Trang gốc quốc tế (4/11)
- **Trước:** `/` là tiếng Việt nên mọi lượt tìm thương hiệu và backlink từ mọi nước vào tiếng Việt. **Nay:** tiếng Việt ở `/vi/`; `/` = 302 theo `functions/index.js` + `functions/api/_rootlang.js`, `Vary: Accept-Language`, không đệm. `/tu-vung/`, `/samples/`, `/blog/*` → `/vi/blog/` giữ nguyên.
- **Luật chọn (chủ quyết 4/11):** (1) cookie `lk_lang` = ngôn ngữ người dùng đã bấm chọn, luôn thắng; (2) nước theo IP (`request.cf.country`) qua bảng GEO; (3) nước không có trong bảng (NL, SE, US…) theo Accept-Language; (4) `/en/`. Không xét User-Agent: Googlebot đi cùng luật, 302 sang URL ngôn ngữ riêng, không đổi nội dung tại cùng URL. Chỉ `/`; URL có ngôn ngữ không bị chuyển. Test `scripts/test/root-lang.mjs`.
- **Một bảng GEO:** nguồn là `web/js/i18n.js`; `functions/api/_geo.gen.js` sinh từ đó bằng `build-landing.mjs` (Function không nạp được script cổ điển), `--check` và test chặn lệch.
- **Cookie `lk_lang`:** chỉ ghi khi người dùng bấm chọn (menu ngôn ngữ, dải gợi ý, `I18N.set` trong app), không ghi khi đoán theo nước; 1 năm, `Secure`, `SameSite=Lax`, đọc ở `/`; ghi trong chính sách riêng tư §5.
- **Crumb JSON-LD (5/11):** trang chủ trong BreadcrumbList luôn là `/<lang>/` (trang vi cũ `/samples/`, `/ngu-phap/`… trước trỏ `/` → Google đi theo 302 sang /en/). Cổng `seo-pages` §9 chặn mọi crumb trỏ `/`; `samples-seo-parity` chỉ chấp nhận đúng chuyển `/`→`/vi/` này.
- **x-default** của 15 trang giới thiệu trỏ `/`. Trang khác (từ, bài viết) giữ x-default về bản en.
- **Không vòng lặp:** `/vi/` trước đây 301 về `/` không kèm hạn dùng, Chromium coi là tươi vô hạn. Đích vi là `/vi/?r=1`, `ROUTE_JS` xoá `r` khỏi địa chỉ. Bỏ được dấu này sau khoảng 1 năm.
- **Vì sao chọn Function, không Redirect Rule:** gói Free không có regex/`q` để chọn đúng theo thứ tự ngôn ngữ, 10 luật không đủ 15 ngôn ngữ, và cấu hình nằm ngoài repo.
- **Hạn mức:** `/` ≈ 2.000 lượt/ngày (đo 4/11) ≈ 2 % trần 100k Workers + Functions. **Rủi ro:** hết trần trong ngày thì `/` lỗi tới khi hạn mức đặt lại (`/<lang>/` tĩnh vẫn sống); `free-tier` đo mỗi giờ (docs/FREE-TIER.md).
- **Công tắc tắt:** bỏ `"/"` khỏi `web/_routes.json` → `/` phục vụ `web/index.html` tĩnh (trang chọn ngôn ngữ, sinh bởi `build-landing.mjs`). Quay lại hoàn toàn: revert PR.
