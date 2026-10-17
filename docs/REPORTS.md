# Báo lỗi người dùng (⚑ Report a problem)
Người dùng báo lỗi → mã LX-xxxx + link riêng `#/report/<mã>` → AI phân loại → quản trị/Claude Code xử lý → báo người dùng.

## Thành phần
- `web/js/report-pill.js` – nút nổi + bộ đệm 20 lỗi console; không nằm trong SHELL của `sw.js` (báo lỗi cần mạng); tự đăng ký route, **không sửa `app.js`** (chỉ 1 dòng `<script defer>` trong `web/index.html`).
- `web/js/report.js` (tải lười) – form, ảnh đính kèm nén ≤ 300 KB trên máy, màn cảm ơn có Kit + mốc dự kiến, khóa gửi 30 s, trang trạng thái có dòng thời gian, nhắc trong app ≤ 1 lần/12 h.
- `web/js/i18n/en/report.js` – nhóm chữ tải lười (`LAZY="report"` trong `build-i18n.sh`); 13 ngôn ngữ dịch tay trong `scripts/i18n-fixed.json`.
- Add-on: mục "⚑ Báo cáo sự cố" trong popup – chỉ gửi **tên miền** tab đang xem, không thêm quyền.
- `functions/api/report.js` (tạo phiếu, trạng thái theo mã riêng, lệnh admin, thư) · `functions/api/_triage.js` (AI phân loại, luật dự phòng, chữ ký lỗi, làm sạch, tạo GitHub Issue) · `web/js/admin-reports.js` (tab Báo lỗi + thẻ Chất lượng) · Worker `lexkite-mail` (`/send`, `/user` qua Resend/Brevo, tóm tắt ngày) · `scripts/report-cli.mjs`.

## Dữ liệu D1
`reports` (tok, status new/ack/prog/fixed/wontfix/dup, cat bug/content/i18n/audio/account/idea, area, msg, email+notify chỉ khi người dùng đồng ý, uid, who = IP băm, ctx đã lọc, errs, sev P0–P3, sig, ai, issue, feat, fix_ver, reply công khai, note nội bộ, dup_of) · `report_shots` (không bao giờ công khai) · `report_events` · config `report_notify`, `report_eta`. Mọi lệnh admin ghi `admin_log`. Phiếu > 24 tháng tự xóa.

## Chống lạm dụng
Hạn mức `report` + ≤ 5/giờ/IP + ô bẫy + chặn gửi < 2,5 s + điểm spam; body ≤ 600 KB; Turnstile tùy chọn.

## AI phân loại (chạy nền, sau khi người dùng đã nhận mã)
Llama 4 Scout (Workers AI qua `env.AI` hoặc REST `CF_AI_TOKEN`); JSON chặt. Nội dung người dùng **chỉ là dữ liệu** trong `<report>`, cấm làm theo chỉ dẫn trong đó; dấu hiệu chèn lệnh → P3; P0 không có bằng chứng → hạ P1; AI lỗi/hết hạn mức → luật từ khóa + lỗi console. Gom trùng theo chữ ký lỗi trong 7 ngày ("n người gặp"). Thư: P0 gửi ngay tiêu đề [P0]; P1 gửi ngay nếu chế độ instant; P2/P3 chỉ vào tóm tắt ngày.

## Ưu tiên & Claude Code
1. Hàng `queue` chỉ gồm **lỗi** (bug/content/i18n/audio) đang mở, không trùng; loại `account` không tự xử lý.
2. Sắp P0 → P1 → P2 → P3; cùng mức theo số người gặp rồi theo thời gian.
3. **Đề xuất tính năng không bao giờ tự giao Claude Code**: nằm ở mục 💡 Đề xuất (Duyệt / Từ chối / Để sau, đếm người cùng đề xuất); chỉ khi admin Duyệt mới tạo Issue `feature-approved`, luôn xếp sau mọi lỗi đang mở.

GitHub Issue: lỗi P0/P1 tự tạo, hoặc nút "Giao Claude Code"; label `bug-report` + `claude`; nội dung đã làm sạch (không email, IP, token, số điện thoại); ảnh chỉ qua link admin; cần `GH_ISSUES_TOKEN`.

Quy trình phiên Claude Code: `node scripts/report-cli.mjs queue` (HMAC `LEXKITE_REPORT_CLI_KEY`, lệch giờ ±5 phút, chỉ queue/resolve) → **chỉ tự sửa lỗi rõ ràng**; lỗi dữ liệu/tài khoản/thanh toán hoặc `needs_human` → đề xuất cho admin duyệt → `npm test`, ship → `node scripts/report-cli.mjs resolve LX-1234 "<ghi chú>" <commit> [phiên bản]` (chuyển Đã sửa, kéo theo phiếu trùng, báo người dùng).

## Người dùng thấy
Màn cảm ơn (Kit, mã, mốc theo loại: tài khoản 24 h, lỗi 2–3 ngày, nội dung/dịch 1 tuần, đề xuất "sẽ xem xét"; nút Theo dõi tiến độ, Sao chép liên kết; không để email → nhắc xem trong app). Trang trạng thái: Đã nhận → Đang xử lý → Đã sửa (phiên bản), mốc chính xác sau khi AI phân loại, phản hồi của đội, lời cảm ơn; không chứa dữ liệu cá nhân. Mốc chỉnh trong admin.

## Biến môi trường
Pages: `ADMIN_EMAILS`, `REPORT_NOTIFY_EMAIL`, `GH_ISSUES_TOKEN`, `LEXKITE_REPORT_CLI_KEY`, `CF_AI_TOKEN`/`CF_ACCOUNT_ID` (khi không có binding AI), `TURNSTILE_SECRET_KEY`. Worker mail: `RESEND_API_KEY`, `BREVO_API_KEY`.

## Test
`scripts/test/report.mjs`, `scripts/test/report-ui.mjs` (trong `npm test`).
