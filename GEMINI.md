# Quy tắc phối hợp Antigravity ⇄ Claude (Dự án Lexkite)

Luôn tuân thủ nghiêm ngặt thỏa ước phối hợp trong `docs/COORDINATION.md`:

## 1. Phân vùng công việc
- **Claude phụ trách chính**: Máy chủ (`functions/`, `workers/`), bảo mật, quản trị (`functions/api/admin.js`, `web/js/admin.js`), CI/workflow GitHub Actions, pipeline dịch/giọng đọc.
- **Antigravity phụ trách chính**: Giao diện & CSS (`web/css/`, bố cục trang người học), thông báo/nhắc học FSRS, email mẫu HTML, blog/SEO nội dung.
- **Vùng chung (Đề thi, từ vựng)**: Ai nhận trước ghi vào `## Đang làm` trong `docs/COORDINATION.md`.

## 2. Quy trình nhận & bàn giao việc (Bắt buộc)
1. **Trước khi làm**: `git pull` (nhánh `lexkite-main`), đọc `docs/COORDINATION.md` mục *Đang làm* – file nào Claude đang giữ thì tuyệt đối không sửa.
2. **Nhận việc**: Ghi 1 dòng vào `## Đang làm` trong `docs/COORDINATION.md` (tên – việc – file/khu vực).
3. **Commit an toàn (Quy tắc sống còn)**:
   - CHỈ `git add <file>` cụ thể những file mình sửa.
   - **TUYỆT ĐỐI KHÔNG** dùng `git add -A`, `git add .` hay `git commit -a` để tránh gom nhầm file Claude đang sửa dở trong working tree.
4. **Kiểm thử chất lượng**:
   - Chạy `npm test` bắt buộc phải PASS 100% (chính tả `vi-lint`, i18n 14 ngôn ngữ, unit FSRS & D1, smoke, a11y axe-core, crawl 510 trang).
5. **Đa ngôn ngữ (i18n)**:
   - Mọi chuỗi mới phải qua `t('…')` và bổ sung bản dịch tiếng Anh vào `web/js/i18n/en/*.js` (hoặc tái sử dụng các khóa đã dịch chuẩn 100% trên 14 ngôn ngữ).
6. **Bàn giao việc**:
   - Xóa dòng ở `## Đang làm`.
   - Thêm 2–4 dòng vào `## Nhật ký bàn giao` trong `docs/COORDINATION.md`.
7. **Khu vực cấm đụng**:
   - `functions/api/admin.js`, `web/js/admin.js`
   - Khóa API / bí mật môi trường Cloudflare & GitHub
   - `scripts/ship2.sh` của Claude.
