# SEO audit 12/11 – trang từ/từ điển × 15 ngôn ngữ (thị trường CPM cao)
> TL;DR: Kỹ thuật trang từ ổn (canonical, 15 hreflang + x-default, DefinedTerm/FAQ/Breadcrumb); lỗ hổng lớn là quy mô index (≈42 URL/ngôn ngữ trong sitemap), lastmod đồng loạt "hôm nay" ở sitemap-pages/grammar, và trước đây không có liên kết vào trang học thử. PR này thêm liên kết /go + sitemap /go; hai việc còn lại ghi dưới.
> Đọc khi: làm SEO từ/từ điển, sitemap, hoặc chọn việc tăng index cho thị trường CPM cao (docs/SEO-GROWTH-PLAN.md).

Đo trên lexkite.com (12/11/2026, curl; không đăng nhập):
| # | Phát hiện | Mức | Xử lý |
|---|---|---|---|
| 1 | `/es/words/` liệt kê 404 từ nhưng `sitemap-words-es.xml` chỉ 42 URL (cổng độ dày `DEPTH_MIN` + noindex trang mỏng); `sitemap-dict-en-1`/`-vi-1` 30 URL (DICT_INDEX gác) | Cao – nút cổ chai tăng trưởng | Không phải lỗi kỹ thuật: tăng độ dày dữ liệu (kho từ, "Cách dùng từ", ghi chú) rồi mở `SEO_N_*`/`DICT_INDEX` theo ngôn ngữ CPM cao (en, de, fr, es, pt) – chủ mảng nội dung |
| 2 | `sitemap-pages` (593 URL) + `sitemap-grammar` (77): mọi `<lastmod>` = hôm nay (`gitDate` của nhóm file nguồn dùng chung ở `build-samples*.mjs`); words dùng sổ băm đúng (`lastmod.mjs`) | Trung – Google bỏ lastmod nếu không kiểm chứng được | Chuyển `addSm` sang `lastmodStore` theo từng URL (băm `<main>`), thêm prefix vào `save({prefixes})` và `LASTMOD_WRITE` của seo-indexnow.yml – PR riêng, cần test seo-sitemap trên dist |
| 3 | Trang từ/hub/giao tiếp chỉ có CTA `/app/?hl=` (vào app, cần cài/đăng ký ngầm), không có liên kết vào trang học thử | Trung | **Đã làm (PR này):** `goLine()` thêm liên kết `/go/<lang>/?utm_source=seo&utm_medium=word|hub|conv` (chữ = H1 trang /go đã dịch 15 ngôn ngữ); đo ở Quản trị › Kênh & mã bài |
| 4 | `/go/<lang>/` chưa có trong sitemap | Thấp | **Đã làm:** `build-seo.mjs` thêm 15 URL + hreflang + x-default |
| 5 | Trang từ điển do Worker `lexkite-dict` dựng (`workers/dict/render.mjs`) chưa có liên kết /go | Thấp (đang noindex theo DICT_INDEX) | Thêm cùng `goLine` khi mở index (sửa Worker + deploy riêng) |
Đã đúng, không cần sửa: canonical tuyệt đối, hreflang hai chiều 15 + x-default, JSON-LD hợp lệ (DefinedTerm, DefinedTermSet, FAQPage, BreadcrumbList), robots cho phép Googlebot, `Disallow` chỉ sandbox/demo/admin.
