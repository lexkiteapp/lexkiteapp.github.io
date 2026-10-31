# Trang không phải app – kiểm kê + trạng thái Stitch (Lexkite Kit)

> TL;DR: Bảng 100 % loại trang công khai + admin (route · nguồn sinh · trạng thái Stitch · screen · PR chủ), danh sách "cần giải pháp", và cổng CI `web-sweep` chặn lỗi ẩn (tương phản, tràn, chạm < 44 px, JS, 4xx, meta/OG, lang, CLS/LCP, sáng/tối).
> Đọc khi: đổi giao diện/bố cục bất kỳ trang tĩnh, blog, SEO, công cụ, pháp lý, 404, nhúng hoặc admin.

Chuẩn: design system Kit `assets/1b7a8a3d3d52404bb332d9ba3f783547` (key 3 = bản sao `assets/16469239436252875897`, project `18075333702575270507`).
Cách port: [STITCH-V2-PORT.md](STITCH-V2-PORT.md) (`stitch-v2-convert.mjs --web`, Tailwind biên dịch trên CI, cổng SSIM `stitch-web.yml` – PR #244). Token: [DESIGN-SYSTEM.md](DESIGN-SYSTEM.md).
Header/footer chung lấy từ bind `home` (`"chrome": true`) → mọi trang mới chỉ port phần thân. Admin: khung desktop riêng (thanh bên + top-bar), cùng token; admin không nhúng màn app (đã soát 31/10).

Screen nhóm 2–4: project `18075333702575270507` (key 3), 31/10; HTML + tờ duyệt: side-session-notes coordinator `web-refs/`.

Trạng thái: **xong** = gộp main · **PR** = đã port, chờ chủ duyệt ảnh · **ref** = có screen Kit, chưa port · **chưa** = chưa có gì.
Nguồn kiểu cũ: `site` = `scripts/lib/site-layout.mjs` (có tối tự động) · `app-css` = `web/css/style.css` (pháp lý/credits/schools không có tối).

## 1. Trang công khai

| # | Route | Nguồn sinh | ~Trang | Kiểu cũ | Trạng thái | Screen Kit (sáng / tối) | PR chủ |
|---|---|---|---|---|---|---|---|
| 1 | `/`, `/<lang>/` landing | build-landing.mjs | 15 | site | PR | home `7bfa0941…` / `fa2d1b99…` | #244 (HOLD) |
| 2 | `/samples/*`, `/en/samples/*` | build-samples(-en).mjs | ~1k | site | PR | sample `19d00841…` / `27bd68a6…` | #244 |
| 3 | `/speaking/*`, `/en/speaking/*` | như trên | ~500 | site | PR | speaking `2a9b62bf…` / `7918d3fb…` | #244 |
| 4 | `/<lang>/blog/<slug>/` bài | build-blog.mjs | ~400 | site | PR | post `2e22ce68…` / `07770904…` | #244 |
| 5 | `/<lang>/blog/` + trang số, chuyên mục, thẻ | build-blog.mjs | ~150 | site | PR (dùng hub) | hub `8d3c34f5…` / `4c2bd949…` | #244 |
| 6 | `/tu-vung/`, `/en/vocabulary/` (hub) | build-samples(-en).mjs | 2 | site | ref | vocab-hub `bd4bc76a…` / `cb10e1b8…` | nhóm 2 |
| 7 | `/tu-vung/<bộ>/`, `/en/vocabulary/<set>/` | như trên | ~170 | site | ref | vocab-set `7cc9acf0…` / `da1d5c8f…` | nhóm 2 |
| 8 | `/ngu-phap/*`, `/viet-thu/*` | build-samples.mjs | ~300 | site | ref | grammar `743d5c04…` / `1cc97eb9…` | nhóm 2 |
| 9 | `/<lang>/words/<slug>/` + 7 hub | build-seo-pages.mjs | nghìn × 15 | site | ref | word `16a4524e…` / `c20fce3b…` | nhóm 2 |
| 10 | `/<lang>/conversations/<id>/` | build-seo-pages.mjs | 24 × 15 | site | ref | conversation `900c9990…` / `afeb3ea2…` | nhóm 2 |
| 11 | `/vi/tu-dien/*`, `/en/dictionary/*` (hub, A–Z, từ) + Worker `lexkite-dict` | scripts/dict/build.mjs, workers/dict/render.mjs | ~10k | site + app-css (thẻ từ) | ref | dict-hub `5697e41b…` / `94627e08…` (thẻ từ = thẻ app, theo khung app) | nhóm 2 |
| 12 | `/<lang>/cefr-test/` (bài thi) | build-tools.mjs + web/js/tools | 15 | site | ref | cefr-test `3d6585fb…` / `91fe19a0…` | nhóm 2 |
| 13 | 6 trang cấp CEFR + kết quả | build-tools.mjs | 90 | site | ref | cefr-result `2b5189b5…` / `ba12a237…` | nhóm 2 |
| 14 | TOEIC Part 5 quiz | build-tools.mjs | 15 | site | ref | toeic `64a974bc…` / `78f34ac6…` | nhóm 2 |
| 15 | `/video/<slug>/`, `/<lang>/video/<slug>/` | build-video-pages.mjs | ~360 | site | ref | video `dc6a6e53…` / `6bbae977…` | nhóm 2 |
| 16 | `/<lang>/about/` + editorial-team/-policy, corrections, sources | build-authority.mjs | 75 | site | ref | about `156420a8…` / `b010346d…` | nhóm 3 |
| 17 | `/<lang>/research/confused-words/`, `/research/*` | build-authority.mjs | 16 | site | ref | research `856cd303…` / `eaf106e2…` | nhóm 3 |
| 18 | `/<lang>/embed/` + iframe `/embed/pair/` + huy hiệu `cefr-*.svg` | build-authority.mjs | 16 | site | ref | embed `dc3e0329…` / `c98b1c2f…` | nhóm 3 |
| 19 | `/privacy`, `/terms` (+ 15 ngôn ngữ) | build-legal.mjs | 32 | app-css, không tối | ref | legal `6017002c…` / `70f50ce7…` | nhóm 3 (sau #303, #301) |
| 20 | `/credits` (+15) | web/credits.html | 16 | app-css, không tối | ref | credits `e90c94e3…` / `3386dfd8…` | nhóm 3 (sau #303) |
| 21 | `/schools` (+15) | web/schools.html | 16 | app-css, không tối | ref | schools `6ff5ec07…` / `559a4916…` | nhóm 3 (sau #303) |
| 22 | `/404` | web/404.html (render404 trong build-landing) | 1 | inline | ref | notfound `98212622…` / `5f232911…` | nhóm 3 (sau #303) |
| 23 | `/bye` | web/bye.html | 1 | inline | ref | bye `5553cc2f…` / `babdd288…` | nhóm 3 (sau #303) |
| 24 | `/blog` chọn ngôn ngữ | web/blog-lang.html | 1 | inline | ref | blog-lang `eb9f22af…` / `d1655fdd…` | nhóm 3 (sau #303) |

Không phải trang hiển thị (không cần Stitch): sitemap*, rss + `rss.xsl`, robots, ads.txt, app-ads.txt, `seo-twins.json`.

## 2. Admin `/admin.html` (khung desktop riêng, 20 tab)

| Kiểu màn | Tab dùng chung bố cục | Trạng thái | Screen Kit | PR chủ |
|---|---|---|---|---|
| Bảng điều khiển KPI + biểu đồ | overview, analytics, ads, quota, storage, services | ref | adm-overview `f4e98443…` / `861991ed…` | nhóm 4 |
| Bảng dữ liệu + bộ lọc + ngăn chi tiết | users, inbox, notices, alerts, reports, quality | ref | adm-users `dcece03c…` / `2225d956…` | nhóm 4 (sau #301) |
| Lưới media + QC | video, social, dist (kênh & phân phối), clips | ref | adm-video `c7bb4992…` / `7e565381…` | nhóm 4 |
| Trình biên tập 3 ngăn | studio | ref | adm-studio `d8888e90…` / `5de733e3…` | nhóm 4 |
| Bảng khoá/biểu mẫu | keys, backlinks, drive, settings | ref | adm-keys `fba9036f…` / `e42eb117…` | nhóm 4 |

`css/adm.css` dùng chung với ô "Quản trị" trong Cài đặt app → ô đó theo khung app 390 px, không đổi theo admin.

## 3. Cần giải pháp (chưa port được, lý do)

| Mục | Lý do | Hướng |
|---|---|---|
| `web/design/gallery.html` | trang QA nội bộ, đã dùng CSS Stitch app (`st-*.css`) | giữ, không công khai |
| `web/templates/weekly-digest.html` | không file nào tham chiếu (mail gửi chữ thường) | hỏi chủ: bỏ hay nối vào mail – thẻ email Stitch nằm ở #257/#259 |
| Nhóm 1 (#244) | port xong, đang HOLD chờ chủ duyệt ảnh | không làm lại; nhóm sau xếp chồng sau khi #244 gộp |
| Trang pháp lý/404/bye/blog-lang/credits/schools | file đang thuộc PR mở #303 (nút giao diện) và #301 (privacy) | port sau khi 2 PR gộp |

## 4. Cổng CI `web-sweep` (chống tái phát)

`.github/workflows/web-sweep.yml` chạy khi PR đụng trang công khai: dựng `dist` (+ 40 từ điển tĩnh) →
`seo-pages.mjs` (canonical, hreflang hai chiều, trùng title/description, mồ côi) → `links-js.mjs` (link nội bộ, kể cả do JS sinh) →
`scripts/test/web-sweep.mjs`: tự gom loại trang từ `dist` (loại mới tự vào cổng), 1 trang mẫu/loại (+ bản vi, ar) × 390/1280 × sáng/tối:
lỗi console, tài nguyên 4xx, tràn ngang, cắt/chồng/tràn chữ (`layout-scan.mjs`), vùng chạm < 44 px, tương phản + axe AA, CLS > 0,1, LCP > 2,5 s,
nền sai giao diện (không có tối), meta/OG thiếu, `lang`/`dir=rtl` sai. Ngưỡng `scripts/test/web-sweep.known.json` = số lỗi hiện có mỗi loại × kiểm,
**chỉ được hạ**; mỗi nhóm port phải đưa loại của mình về 0. Admin: `admin-guard.yml` (bố cục). i18n chuỗi: `seo-pages.mjs` mục 6 + `i18n.yml`.
