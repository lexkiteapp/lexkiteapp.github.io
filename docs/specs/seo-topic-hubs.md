# Spec: trang chủ đề từ vựng /<lang>/words/topic/<id> (23/11/2026)

> TL;DR: Thêm trang tập hợp theo chủ đề (128 nhóm trong kho: ngsl1–10, science, health, society, ex-ielts-*, toeic*, dom-*…) ở 15 ngôn ngữ: tiêu đề + số từ + đoạn dẫn + chip chủ đề liên quan + danh sách từ (chỉ từ `indexable`) + CTA app. Mục đích: nội bộ link dày cho 8.000+ trang /words/ (hiện chỉ có mục lục A–Z), bắt truy vấn "từ vựng chủ đề X". Chỉ dùng dữ liệu có sẵn, không viết nội dung mới.
> Đọc khi: sửa `scripts/build-seo-pages.mjs` (khối chủ đề), `scripts/lib/seo-words.mjs › topicOf`.

## 1. Phạm vi
- Trang index khi chủ đề có ≥ 12 từ `indexable` trong ngôn ngữ đó; ít hơn → không sinh (không noindex rác).
- Nguồn: `e.topic` + `topicOf` (nhãn chủ đề); nhãn dịch ở `S[lang]` (`seo-pages-i18n.mjs`), viết tay 15 ngôn ngữ.
- Mỗi thẻ từ: từ, loại từ, nghĩa 1 dòng (cùng hàm `gloss` mục lục A–Z), link `/<lang>/words/<slug>`.
- Mục lục A–Z và trang từ thêm link ngược lên chủ đề (breadcrumb Home › Từ › Chủ đề › từ).
- JSON-LD `CollectionPage` + `BreadcrumbList`; sitemap/hreflang như trang words; không JS mới.

## 2. Thiết kế (khoá trước code)
Stitch "Lexkite Kit", khung app 390 px (`docs/DESIGN-SYSTEM.md` §5d), sáng = Bright Day, tối = Tactile Night. Ref: Stitch project 7268539912208977707, màn "Topic Hub (Light)". Code port trung thành, không style lại; CI so ảnh. Chủ OK ảnh trước khi gộp (rule 6).

## 2b. Đã làm (23/11)
- Builder: khối chủ đề trong `build-seo-pages.mjs` + `scripts/lib/seo-topics.mjs` (không pipeline thứ hai); nội dung `content/seo/topics/<lang>.json` (tên + giới thiệu 45–80 chữ bản ngữ, 34 chủ đề ≥ 10 từ index được) + `_ui.json` (khung chữ). 13 ngôn ngữ (en/vi đã có /en/vocabulary/, /tu-vung/ → không tạo trang cạnh tranh). Trang ghi vào dist/ (Pages), không qua R2; ≈ 322 trang.
- Trang tĩnh, 0 JS mới, dùng khung + CSS của trang từ; liên kết ngược: trang từ → chủ đề, chủ đề → chủ đề khác.
- Cổng: `scripts/test/seo-topics.mjs` (suite).

## 3. Cổng
`scripts/test/seo-pages.mjs`: mọi link thẻ từ tới trang index được; canonical + hreflang hai chiều; không mồ côi; mô tả/tiêu đề không trùng. Test nhẹ cục bộ, nặng trên CI.

## 4. Lô
1 PR: builder + nhãn 15 ngôn ngữ + test (≈ 1 ngày) → đo GSC 28 ngày (số trang chủ đề có hiển thị, vị trí TB /words/).
