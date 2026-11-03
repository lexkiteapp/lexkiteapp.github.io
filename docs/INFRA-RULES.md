# Quy tắc tài nguyên hệ thống (lưu trữ · mail · dịch vụ ngoài)

> TL;DR: Quy tắc tài nguyên hệ thống: mọi dịch vụ/Worker/lưu trữ phải đăng ký ở infra/resources.json; hiện trạng lưu trữ, ngưỡng nâng cấp, mail. Sổ không ghi khóa/mật khẩu.
> Đọc khi: thêm dịch vụ/host/Worker/lưu trữ mới.

**Sổ đăng ký duy nhất:** `infra/resources.json` → tự hiện ở **Quản trị → Dịch vụ & tài khoản** (D1 `services`).
Repo công khai: sổ chỉ ghi mục đích, bảng điều khiển, hạn mức miễn phí, cách nâng cấp – **không** ghi khóa/mật khẩu/token. Tài khoản & nơi để khóa nhập tay ở trang Quản trị (cột account/secret/note, chỉ 3 email quản trị xem được).

## Khi thêm bất kỳ tài nguyên nào (dịch vụ, Worker, D1/R2, tên miền con, API ngoài, kho file, mail)
1. Thêm/sửa 1 mục trong `infra/resources.json`: `key, name, kind, purpose, console, free, upgrade, status, match[]` (`match` = tên miền / tên Worker / tên DB mà code dùng).
2. `npm test` chạy `scripts/test/infra-check.mjs`: code có tên miền ngoài hoặc Worker/D1/R2 chưa đăng ký → **chặn ship**. Tên miền chỉ là liên kết tham khảo → `links.hosts`.
3. Ship (`scripts/ship2.sh`) tự chạy `scripts/infra-sync.mjs` → cập nhật trang Quản trị (giữ nguyên phần quản trị nhập tay).
4. Tài nguyên có hạn mức → ghi rõ ngưỡng nâng cấp ở `upgrade`.

## Lưu trữ – hiện trạng & ngưỡng nâng cấp
| Thứ | Ở đâu | Miễn phí | Khi nào nâng cấp |
|---|---|---|---|
| Web + nội dung học (JSON/JS tải lười) + bản dịch sẵn `web/i18n/content` | Cloudflare Pages | băng thông không giới hạn, 20.000 file/bản | gần 20.000 file → tách nội dung sang R2 |
| Âm thanh | gốc GitHub Pages `lexkiteapp.github.io/audio` → phục vụ qua `audio.lexkite.com` (Worker `workers/audio`, cache 1 năm, app tự lùi về GitHub nếu lỗi) | GitHub ≤ 1 GB; Worker 100k lượt/ngày | gần 1 GB hoặc > 100k lượt/ngày → R2 + tên miền tùy chỉnh |
| Ảnh blog (chung) | repo `lexkite-media` | ≤ 1 GB | R2 |
| Ảnh riêng từng bài blog | R2 `lexkite-blog-media` qua `media.lexkite.com/blog/p/` (dự phòng repo `lexkite-media`) | 10 GB + 1M ghi + 10M đọc/tháng | > 10 GB: $0,015/GB-tháng; Worker > 100k lượt/ngày → Workers Paid |
| Video | nhúng YouTube (youtube-nocookie) | không giới hạn | — |
| Dữ liệu người dùng | D1 `lexkite-sync` | 5 GB | Workers Paid |

## D1 – luật đọc (sự cố 03/11)
- Câu SQL mới **không được** quét toàn bảng `sessions` (hay bảng nhật ký lớn): đọc bảng tổng hợp (`stats_day`, `pageviews_day`) hoặc theo chỉ mục. Cổng `scripts/test/sessions-scan-gate.mjs` (EXPLAIN) đỏ khi có SCAN mới; ngoại lệ ghi lý do ở `scripts/test/sessions-scan-allow.json`.
- Trang Quản trị: mọi op đọc qua ngân sách route (`functions/api/_readbudget.js`) + `cached()`; tự làm mới chỉ khi tab hiển thị **và** có thao tác trong 10 phút.
- Gói: tài khoản chính **Workers Paid** từ 03/11/2026 (D1 25 tỷ đọc + 50 triệu ghi/tháng đã gồm, vượt tính tiền) – bộ chặn & ngân sách route giữ nguyên, ngưỡng tính trên dự báo tháng. Cảnh báo 50 % / 75 %, tiết kiệm ≥ 85 %, trần chi tiêu ≥ 100 % (báo ngay): docs/CAPACITY.md §6. Khoá đọc số liệu Cloudflare cho Pages chỉ được quyền *Account Analytics: Read* (không đặt token có quyền Edit làm secret Pages). Đường người dùng (đồng bộ, đăng nhập, tiến độ) không bao giờ gọi cầu dao. Nâng gói trả phí = quyết định của chủ.
- CI không gọi prod `/api` (docs/CAPACITY.md §A5, `scripts/test/no-prod-hosts.mjs`).

## Mail
- Nhận: `support@`, `contact@lexkite.com` → Gmail chính (Cloudflare Email Routing).
- Gửi nội bộ: Worker `lexkite-mail` (binding `SEB`, chỉ tới địa chỉ đã xác minh) – bản tin quản trị 8h, duyệt dịch đêm.
- Gửi người dùng (bản tin tuần, opt-in): **chờ chọn Resend/Brevo** + DNS SPF/DKIM + trang hủy đăng ký.
