# SEO-AUTHORITY – uy tín / E-E-A-T + tài sản đáng dẫn link (hạng mục 4 lộ trình SEO, 26/10/2026)

> TL;DR: 7 trang × 15 ngôn ngữ (Giới thiệu, Đội ngũ biên tập, Quy trình biên tập & kiểm chứng, Sửa lỗi, Nguồn tham khảo, Nghiên cứu "cặp từ dễ nhầm" CC BY + CSV, Widget nhúng), schema Organization/ProfilePage/Dataset dùng chung, tác giả blog = Lexkite Editorial Team. 100 % tĩnh. Nguồn: scripts/build-authority.mjs. Cổng: scripts/test/authority-pages.mjs. Backlink: docs/BACKLINKS.md.
> Đọc khi: sửa trang Giới thiệu/biên tập/nghiên cứu/widget, schema Organization, tác giả blog, thêm kênh sameAs.

## 1. Luật
1. **Trung thực tuyệt đối:** không bịa người, chức danh, bằng cấp, đánh giá sao, lời chứng thực. Đội biên tập là tên chung; trang đội nói rõ có dùng công cụ AI + quy trình 6 bước thật (`docs/BLOG-RUNBOOK.md`, `content/blog/prompts/1…6`). Test chặn mẫu bằng cấp/chức danh/sao.
2. **sameAs chỉ kênh THẬT** (`content/authority/profiles.json`): repo GitHub, add-on Chrome (`web/js/ext-config.js`), hồ sơ `status: live` trong `content/pr/placements.json`. Kênh mới → placements (live) trước.
3. **Không EducationalOrganization** (Lexkite là app, không phải trường). **Không SearchAction:** Google bỏ sitelinks search box (11/2024) và site chưa có URL tìm kiếm phía máy chủ (từ điển dùng `/en/dictionary/<từ>/` + `#/dict` trong app) – khai template giả là sai schema.
4. **Dữ liệu nghiên cứu không có dữ liệu người dùng:** chỉ đọc `web/js/usage/pair.js` (đội biên tập soạn). Ghi rõ giới hạn: danh sách tuyển chọn, không phải tần suất lỗi đo được.
5. **Widget không theo dõi:** `/embed/pair/` 0 request ngoài, 0 cookie/storage, `Referrer-Policy: no-referrer`, noindex; `_headers` khối `/embed/*` cho phép nhúng (`frame-ancestors *`).
6. **Chủ file:** phiên seo-authority (memory seo-top1-roadmap › Ownership). Hook nhỏ ở file chung: `authFoot/authAbout` trong `site-layout.mjs` siteFooter (cột Thông tin), `orgNode()` trong `build-landing.mjs`, `editorialNode/blogByline` trong `build-blog.mjs`, 1 bước trong `build-web.sh`, khối `/embed/*` trong `web/_headers`.
7. **Công tắc tắt:** `AUTHORITY_PAGES=0` → trang biến mất lần deploy sau (chân trang tự về link blog cũ chỉ khi xoá chuỗi). Quay lại: revert commit.

## 2. URL (slug tiếng Anh vĩnh viễn, mọi ngôn ngữ)
`/<lang>/about/` · `about/editorial-team/` · `about/editorial-policy/` · `about/corrections/` · `about/sources/` · `research/confused-words/` · `embed/` – 105 trang, `sitemap-authority.xml` (tự vào sitemap index). Dữ liệu: `/research/confused-words.csv|json`. Nhúng: `/embed/pair/?hl=<lang>`, `/embed/cefr-<a1…c2>.svg` (link về trang cấp độ của bài test CEFR).

## 3. Schema
Trang chủ + trang Giới thiệu: `Organization` `@id https://lexkite.com/#org` (logo, email, legalName, sameAs, publishingPrinciples, correctionsPolicy). Blog: `author` = `Organization` `#editorial` "Lexkite Editorial Team" (parentOrganization #org, url = hồ sơ đội theo ngôn ngữ bài) + dòng tác giả hiển thị + "Đã kiểm chứng <factChecked>". Đội: `ProfilePage`. Nghiên cứu: `Dataset` (license CC BY 4.0, 2 DataDownload, creator, version = ngày git nguồn) → Google Dataset Search. Mọi trang: `BreadcrumbList`, `dateModified` = ngày git nguồn.

## 4. Chuỗi 15 ngôn ngữ
`content/authority/i18n/<lang>.json` (en nguồn). Thêm khóa → đủ 15 file; test kiểm cấu trúc, {biến}, chữ Việt lọt, chuỗi chưa dịch.

## 5. Kiểm tra
`npm test` → `scripts/test/authority-pages.mjs`. PR chạm phần này → `.github/workflows/authority-pages.yml`: cổng + Lighthouse điện thoại (median 3 lần; performance ≥ 90, accessibility ≥ 95, best-practices ≥ 90, SEO ≥ 95) trên vi/en/ja/ar.
