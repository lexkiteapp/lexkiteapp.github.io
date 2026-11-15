# Spec: thư viện công khai lướt bằng mắt (samples-visual)

> TL;DR: Lớp giao diện chung cho 6 tab thư viện và trang chi tiết: huy hiệu Stitch, tiêu đề ngắn, khối đầu trang, số liệu thành dấu hiệu, hàng lọc cuộn rõ. Toàn bộ chữ SEO giữ nguyên, có cổng CI.
> Đọc khi: sửa /samples/, /speaking/, /tu-vung/, /ngu-phap/, /viet-thu/, /phat-am/ hoặc bản /en/.

**Mục tiêu (chủ 4/11, "hơi nhiều text, không trực quan"):** nhận ra thẻ bằng hình và màu, không phải đọc. Không mất nội dung, URL, title/meta/schema, link.

**Họ trang:** mọi trang đi qua `seoPage()` (`build-samples.mjs`, `build-samples-en.mjs`, chỉ có vi + en): 14 mục lục (6 tab, en, Task 1, General Task 1) + ~760 trang chi tiết. `setCard`/`sectionNav`/`typeFilter` chỉ họ này dùng nên sửa một chỗ cả họ lên. Không có chuỗi nào ra 13 ngôn ngữ còn lại; chuỗi mới vi + en ở `VIS_S`.

**Nguồn thiết kế:** Stitch Kit, hàng `scripts/stitch/queues/samples-visual-1104.json`: `sv-hub`, `sv-hub-phone` (sáng + tối) và 11 tờ huy hiệu, lưu ở `brand/stitch/web-library/`. Trang chi tiết dùng lại ref `sample`/`speaking` của #244, không vẽ thêm.

**Mã:**
- `scripts/lib/samples-visual.mjs`: CSS/JS (inline, ~9 KB thô), bản đồ hình, `catNav` (MỘT bộ chọn danh mục = bộ lọc, theo Stitch `hub-cat` a456dffa – `brand/stitch/web-library/hub-cat-dark.*`; thay bento + hàng chip trùng 05/11), `t2Key`, giáo viên trên sàn.
- `web/img/lib/*.svg`: 64 huy hiệu tách bằng `scripts/stitch/art-extract.mjs` (≈ 2,5 KB/hình, `<img>` lười + có cỡ, đệm dài, không chữ).
- `content/seo-en/sample-keys.json`: tiêu đề ngắn vi/en cho 80 đề Task 2. Thiếu file (khi nội dung chuyển repo private, `CONTENT-PROTECTION.md`) → tự cắt vài từ đầu của đề, trang vẫn dựng được.

**Quy tắc:**
- Đề đầy đủ là chữ hiển thị trên thẻ, kẹp 2–3 dòng bằng CSS; không `hidden`, không `display:none`.
- Đơn vị số liệu ẩn thị giác (`.vu`) trừ thẻ đầu nhóm; từ đó phải còn hiển thị ở đâu đó trên trang, cổng SEO kiểm.
- Không cắt chữ ngoài đề bài kẹp dòng: breadcrumb xuống dòng, dàn bài trên điện thoại xếp nhiều hàng.
- Nhân vật chỉ Ama/Carlos 2D: ảnh `still-*` có chân mờ nên luôn cắt dưới sàn (`.vh-t`), không để lộ thân mờ dần. CTA dùng avatar, bỏ Kit.

**Cổng:** `samples-ui.mjs` (npm test: huy hiệu, tiêu đề ngắn, bộ chọn danh mục: 1 nav, ô đồng nhất, ô Tất cả) · `samples-visual.yml` = `samples-seo-parity.mjs` (so từng trang với base) + `samples-visual.mjs` (390/1280 × sáng/tối: hub nhất quán – 1 điều hướng danh mục, ô/icon/tên một cỡ, ≤ 3 cỡ chữ trong lưới, số đếm cùng chỗ, lề thẳng, thẻ danh sách một độ rộng/cỡ tiêu đề; tràn ngang, chữ cắt, gãy giữa từ, dấu hiệu cuộn, tương phản, icon ≥ 3:1, giáo viên).

**Đụng PR khác:** #244 đổi trang chi tiết sang khung Stitch: lời gọi `kicker` trong build-samples và dòng import `samples-ui` sẽ xung đột nhỏ, giữ bản của #244 rồi thêm lại import. #576/#599 chỉ đụng khác vùng trong `site-layout.mjs`.

**Thay đổi SEO có chủ đích (manifest):** cổng `samples-seo-parity` vẫn đỏ với mọi mất chữ/title/meta/JSON-LD ngoài `content/seo-parity-allow.json`. Mỗi mục = một trang + `reason` bắt buộc; chỉ khai được `words` (chữ cụ thể được bỏ), `replace` (cặp [từ, thành] cho title/meta/ld, vd. "56 bài"→"62 bài") và `itemList` (mục lục chỉ được thêm, mọi url cũ phải còn). Link nội bộ mất, canonical/hreflang đổi, trang biến mất: không bao giờ khai được. Thêm bài vào nhóm có "bài liên quan": giữ nguyên các gợi ý cũ, bài mới chỉ nối thêm cuối (`relatedPron` trong `scripts/lib/seo-data.mjs`). `node scripts/test/samples-seo-parity.mjs --self-test` khoá các luật này.
