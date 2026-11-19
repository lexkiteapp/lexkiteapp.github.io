# Quy tắc phối hợp Antigravity ⇄ Claude (Dự án Lexkite)

Luôn tuân thủ nghiêm ngặt bảng giao việc `docs/agents/BOARD.md` và thỏa ước phối hợp trong `docs/COORDINATION.md`:

## 1. Phân vùng công việc
- **Claude phụ trách chính**: Máy chủ (`functions/`, `workers/`), bảo mật, quản trị (`functions/api/admin.js`, `web/js/admin.js`), CI/workflow GitHub Actions, pipeline dịch/giọng đọc.
- **Antigravity phụ trách chính**: Giao diện & CSS (`web/css/`, bố cục trang người học), thông báo/nhắc học FSRS, email mẫu HTML, blog/SEO nội dung.
- **Vùng chung (Đề thi, từ vựng)**: Trao đổi qua bảng `docs/agents/BOARD.md`.

## 2. Quy trình làm việc qua BOARD.md (Bắt buộc cho mọi phiên)
1. **Mỗi lần được gọi**:
   - Chạy `git pull` (nhánh `lexkite-main`).
   - Đọc ngay `docs/agents/BOARD.md`.
2. **Quy trình nhận thẻ**:
   - Nhận thẻ `@antigravity` đầu tiên trong `## TODO` → chuyển sang `## ĐANG LÀM` và commit.
   - Làm việc trong worktree riêng (`../lexkite-ag`) hoặc phân nhánh riêng để tuyệt đối không xung đột working tree với Claude.
3. **Khi anh Quyền giao việc mới trực tiếp**:
   - Ghi thẻ vào `## HỎI CLAUDE` trong `docs/agents/BOARD.md` (nêu rõ yêu cầu của anh + kế hoạch + file dự định sửa) và commit.
   - Chờ Claude duyệt/phản hồi trong thẻ ở vòng kế tiếp trước khi sửa các khu vực dùng chung hoặc phức tạp.
4. **Commit an toàn (Quy tắc sống còn)**:
   - CHỈ `git add <file>` cụ thể những file mình sửa.
   - **TUYỆT ĐỐI KHÔNG** dùng `git add -A`, `git add .` hay `git commit -a` để tránh gom nhầm file Claude đang sửa dở.
5. **Kiểm thử chất lượng**:
   - Chạy `npm test` bắt buộc phải PASS 100% (chính tả `vi-lint`, i18n 14 ngôn ngữ, unit FSRS & D1, smoke, a11y axe-core, crawl 510 trang).
6. **Đa ngôn ngữ (i18n)**:
   - Mọi chuỗi mới phải qua `t('…')` và bổ sung bản dịch tiếng Anh vào `web/js/i18n/en/*.js` cùng đầy đủ 14 ngôn ngữ.
7. **Báo cáo & Bàn giao**:
   - Chuyển thẻ sang `## CHỜ DUYỆT` trên `docs/agents/BOARD.md`, điền mục *Báo cáo* (commit hash, file, kết quả kiểm thử, hướng dẫn cho Claude).
   - Cập nhật nhật ký bàn giao trong `docs/COORDINATION.md`.
8. **Khu vực cấm đụng**:
   - `functions/api/admin.js`, `web/js/admin.js`
   - Khóa API / bí mật môi trường Cloudflare & GitHub
   - `scripts/ship2.sh` của Claude.
9. **Tiết kiệm token**:
   - Không poll status trong vòng lặp vô tận, đọc có trọng tâm, trả lời ngắn gọn, cung cấp lệnh sẵn để anh gửi Claude duyệt.
