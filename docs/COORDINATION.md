# Phối hợp Claude ⇄ Antigravity (chia việc, tránh chồng chéo)

Mục đích: chia tải để không ai chạm giới hạn token, không sửa đè lên nhau. Repo là "bảng giao việc" chung.

## Quy tắc vàng
0. **Mỗi bên một thư mục làm việc** (bắt buộc – dùng chung 1 thư mục thì lệnh ship của bên này sẽ gom luôn file bên kia đang sửa dở, như đã xảy ra ở commit c0e088db). Antigravity làm trong worktree riêng:
   `git worktree add ../lexkite-ag -b antigravity origin/main` → làm & commit ở `../lexkite-ag` → `git push <remote> antigravity:main` (hoặc rebase lên main rồi đẩy). Claude làm ở thư mục gốc.
1. **Trước khi làm**: `git pull` (nhánh `lexkite-main`), đọc mục *Đang làm* bên dưới – file nào đang có người giữ thì **không sửa**.
2. **Nhận việc** = ghi 1 dòng vào *Đang làm* (tên – việc – file/khu vực) và commit ngay.
3. **Chỉ commit file của việc mình** (`git add <file>` cụ thể, **không** `git add -A`) – tránh gom phần người kia đang sửa dở.
4. **Trước khi commit**: `npm test` phải PASS (chính tả, i18n 15 ngôn ngữ, unit, smoke, lẫn tiếng, lời giải, axe, crawl).
5. **Chuỗi giao diện mới** luôn qua `t('…')` (khóa tiếng Việt) + thêm tiếng Anh vào `web/js/i18n/en/*.js`.
6. **Xong việc**: xóa dòng ở *Đang làm*, thêm 2–4 dòng vào *Nhật ký bàn giao* (đã làm gì, file nào, cần bên kia kiểm gì).
7. Không đụng: khóa/bí mật, cấu hình Cloudflare/GitHub secrets, `functions/api/admin.js` & `web/js/admin.js` (Claude giữ), `scripts/ship2.sh` của Claude.

## Phân vùng mặc định
| Khu vực | Người giữ chính |
|---|---|
| Máy chủ (`functions/`, `workers/`), bảo mật, quản trị, CI/workflow, pipeline dịch/giọng đọc | **Claude** |
| Giao diện & CSS (`web/css/`, bố cục trang người học), thông báo/nhắc học, email mẫu, blog/SEO nội dung | **Antigravity** |
| Nội dung đề thi, từ vựng | Ai nhận trước ghi ở *Đang làm* |

## Đang làm
- (trống)

## Việc mở – Antigravity nhận được ngay
1. **Email "Báo cáo não bộ" hằng tuần**: nối `web/templates/weekly-digest.html` vào worker `workers/mail` (cron Chủ nhật), dữ liệu từ D1 (`users`, `sessions`), chỉ gửi người đã đăng nhập & bật nhận email (thêm tùy chọn trong Cài đặt). Báo Claude để triển khai worker.
2. **Rà ảnh chụp giao diện tự động** (nhánh `screens`, workflow `screens.yml`): sửa lỗi bố cục mobile/dark mode trong `web/css/style.css`, mỗi lỗi 1 commit.
3. **Blog**: viết bài theo `content/blog/WRITING-GUIDE.md` cho các ngôn ngữ chưa có bài (es, ja, id…), kiểm `node scripts/blog-check.mjs`.
4. **Câu hỏi có biểu đồ TOEIC Part 3/4**: đề xuất định dạng dữ liệu `graphic` (bảng HTML đơn giản) + giao diện; Claude duyệt phần `web/js/qengine.js` trước khi sửa.

## Nhật ký bàn giao
- 2026-10-16 · Claude: duyệt giao diện Admin mới (bento, sparkline, skeleton, dark mode) – OK, tương thích API & các hộp thoại khóa Gemini. Lưu ý: thay đổi này lên live trong commit c0e088db của Claude do dùng chung thư mục → từ nay Antigravity dùng worktree riêng (quy tắc 0). `web/js/admin.js` vẫn do Claude giữ – Antigravity muốn sửa thì ghi vào *Đang làm* trước.
- 2026-10-16 · Claude: duyệt commit 0e7c6c3c (nhắc học thông minh) – OK; sửa deep link `#/review?src=forgetting`; lưu ý commit đã gom nhầm phần `admin.js` đang sửa dở của Claude → từ nay chỉ `git add` file của mình.
