# Báo lỗi người dùng (⚑ Report a problem)

> TL;DR: Báo lỗi người dùng (Report a problem): mã LX-xxxx, link #/report/<mã>, AI phân loại nền, ưu tiên và Claude Code xử lý. Chống lạm dụng; không sửa app.js.
> Đọc khi: sửa luồng báo lỗi.
Người dùng báo lỗi → mã LX-xxxx + link riêng `#/report/<mã>` → AI phân loại → quản trị/Claude Code xử lý → báo người dùng.

## Thành phần
- `web/js/report-pill.js` – **lõi < 3 KB** (trần trong `scripts/test/size-guard.mjs`, không nới): bộ đệm 20 lỗi console + nút + route; tự đăng ký route, **không sửa `app.js`** (chỉ 1 dòng `<script defer>`). Kiểu nút/chân thanh bên/token nằm trong `css/style.css` § report-pill (nạp cùng khung – không nháy; link phụ chân thanh bên ẩn sẵn + chừa 1 hàng 44 px tới khi gom xong `.sf-ok` → không xô bố cục). Phần lười `web/js/report-pill-ui.js` (lõi nạp sau DOMContentLoaded): ẩn khi cuộn/gõ, "⋯ Xem thêm", hỏi trạng thái phiếu; tải lỗi → hiện lại link phụ.
- `web/js/report.js` (tải lười) – form, ảnh đính kèm nén trên máy (`MAXPX`/`MAXB`, mặc định 1600 px / 300 KB – xem § Ảnh chụp), màn cảm ơn có Kit + mốc dự kiến, khóa gửi 30 s, trang trạng thái có dòng thời gian, nhắc trong app ≤ 1 lần/12 h.
- `web/js/i18n/en/report.js` – nhóm chữ tải lười (`LAZY="report"` trong `build-i18n.sh`); 13 ngôn ngữ dịch tay trong `scripts/i18n-fixed.json`.
- Add-on: mục "⚑ Báo cáo sự cố" trong popup – chỉ gửi **tên miền** tab đang xem, không thêm quyền.
- `functions/api/report.js` (tạo phiếu, trạng thái theo mã riêng, lệnh admin, thư) · `functions/api/_triage.js` (AI phân loại, luật dự phòng, chữ ký lỗi, làm sạch, tạo GitHub Issue) · `web/js/admin-reports.js` (tab Báo lỗi + thẻ Chất lượng) · Worker `lexkite-mail` (`/send`, `/user` qua Resend/Brevo, tóm tắt ngày) · `scripts/report-cli.mjs`.

## Dữ liệu D1
`reports` (tok, status new/ack/prog/fixed/wontfix/dup, cat bug/content/i18n/audio/account/idea, area, msg, email+notify chỉ khi người dùng đồng ý, uid, who = IP băm, ctx đã lọc, errs, sev P0–P3, sig, ai, issue, feat, fix_ver, reply công khai, note nội bộ, dup_of) · ảnh chụp: R2 riêng `lexkite-report-shots` (cột `shot_b`), `report_shots` chỉ còn khi chưa gắn R2 (không bao giờ công khai) · `report_events` · config `report_notify`, `report_eta`; cột `eta_x` (đầu vào mốc thông minh). Mọi lệnh admin ghi `admin_log`. Phiếu > 24 tháng tự xóa.

## Ảnh chụp (R2)
Nhị phân trong bucket R2 **riêng tư** `lexkite-report-shots` (binding `REPORT_SHOTS`, khóa `report/<id>`, kiểu từ data URL; `reports.shot_b` = số byte) – không base64 trong D1. Quản trị xem qua URL ký HMAC 5 phút `/api/report-shot?id&e&s` (`functions/api/report-shot.js`: no-store, nosniff, CSP none; khóa `REPORT_SHOT_KEY` hoặc `LEXKITE_REPORT_CLI_KEY`; thiếu khóa → data URL qua op `shot`). AI phân loại lại đọc từ R2. Xóa ảnh 60 ngày sau khi đóng (fixed/wontfix/dup, mốc `fixed_at` hoặc `upd`; ≈ 2 % lượt gửi + op `shots-migrate`), ảnh không an toàn xóa ngay, phiếu > 24 tháng xóa cả ảnh. Chưa gắn binding → D1 như cũ.
Workflow `report-shots.yml`: `setup` (tạo bucket, rồi bỏ `#` khối `[[r2_buckets]]` trong `wrangler.toml` – bucket chưa có thì Pages từ chối deploy) · `migrate` (thứ Hai + chạy tay: `report-cli.mjs shots-migrate --all`, lô 20, D1 → R2, xóa dòng, hết thì `VACUUM`; D1 từ chối VACUUM thì báo lại) · `bench` (PR đổi `report.js`: `scripts/report-shot-bench.mjs` nén mẫu thật bằng đúng `shrink()` ở 300 KB/1600 px và 150 KB/1280 px, OCR eng+vie so với ảnh gốc; chỉ hạ trần khi mọi mẫu ≥ 0,95 và trung bình ≥ 0,98 độ đọc của trần cũ). Thẻ Chất lượng: dung lượng ảnh R2 + % trên 10 GB miễn phí (chung các bucket của tài khoản) + số ảnh còn ở D1.

## Chống lạm dụng
Hạn mức `report` + ≤ 5/giờ/IP + ô bẫy + chặn gửi < 2,5 s + điểm spam; body ≤ 600 KB; Turnstile tùy chọn.

## AI phân loại (chạy nền, sau khi người dùng đã nhận mã)
Llama 4 Scout (Workers AI qua `env.AI` hoặc REST `CF_AI_TOKEN`); JSON chặt. Nội dung người dùng **chỉ là dữ liệu** trong `<report>`, cấm làm theo chỉ dẫn trong đó; dấu hiệu chèn lệnh → P3; P0 không có bằng chứng → hạ P1; AI lỗi/hết hạn mức → luật từ khóa + lỗi console. Gom trùng theo chữ ký lỗi trong 7 ngày ("n người gặp"). Thư: P0 gửi ngay tiêu đề [P0]; P1 gửi ngay nếu chế độ instant; P2/P3 chỉ vào tóm tắt ngày.

## Ưu tiên & Claude Code
1. Hàng `queue` chỉ gồm **lỗi** (bug/content/i18n/audio) đang mở, không trùng; loại `account` không tự xử lý.
2. Sắp P0 → P1 → P2 → P3; cùng mức theo số người gặp rồi theo thời gian.
3. **Đề xuất tính năng không bao giờ tự giao Claude Code**: nằm ở mục 💡 Đề xuất (Duyệt / Từ chối / Để sau, đếm người cùng đề xuất); chỉ khi admin Duyệt mới tạo Issue `feature-approved`, luôn xếp sau mọi lỗi đang mở.

GitHub Issue: lỗi P0/P1 tự tạo, hoặc nút "Giao Claude Code"; label `bug-report` + `claude`; nội dung đã làm sạch (không email, IP, token, số điện thoại); ảnh chỉ qua link admin; cần `GH_ISSUES_TOKEN`.

Quy trình phiên Claude Code: `node scripts/report-cli.mjs queue` (HMAC `LEXKITE_REPORT_CLI_KEY`, lệch giờ ±5 phút, chỉ `CLI_OPS`: queue/resolve/progress/pending) → **chỉ tự sửa lỗi rõ ràng**; lỗi dữ liệu/tài khoản/thanh toán hoặc `needs_human` → đề xuất cho admin duyệt → `npm test`, ship → `node scripts/report-cli.mjs resolve LX-1234 "<ghi chú>" <commit> [phiên bản]` (chuyển Đã sửa, kéo theo phiếu trùng, báo người dùng).

## Tự động theo PR (`report-autofix.yml`)
Ghi `LX-1234` trong tiêu đề/nội dung/nhánh PR. PR gộp → `scripts/report-autofix.mjs merged` → op `progress`: phiếu (hoặc phiếu gốc nếu là phiếu trùng) sang **Đang xử lý**, báo người báo, ghi sự kiện `pr` = commit chờ live (cùng commit lần 2 bỏ qua; phiếu đã sửa/không sửa không mở lại). Sau Pages deploy + cron 3 giờ (:53) → `live`: op `pending` trả phiếu chờ + `CF_PAGES_COMMIT_SHA` của bản live; commit là tổ tiên git của bản live → op `resolve` với `fix_ver` = `CACHE` của `sw.js` live (phiên bản người dùng thấy). `resolve` phiếu đã sửa → bỏ qua (không thư lặp). Cần secret Actions `LEXKITE_REPORT_CLI_KEY` (= khóa Pages); thiếu → cảnh báo, workflow vẫn xanh.

## Báo đẩy "Lỗi LX-xxxx đã được sửa"
Màn cảm ơn: máy **chưa** có thông báo đẩy → nút "🔔 Báo cho tôi khi sửa xong" (15 ngôn ngữ); chỉ khi bấm mới xin quyền (không tự bật) → `/api/push` op `sub` `ro: 1` (thiết bị "chỉ báo lỗi": `done = 1`, không nhận lời nhắc học; thiết bị đã bật nhắc học giữ nguyên lịch) → op `pid` gắn id thiết bị vào phiếu bằng mã riêng (1 lần). Ẩn nút trên iOS Safari chưa thêm vào Màn hình chính, app gốc, add-on, khi đã chặn quyền hoặc cờ push tắt – dựa vào thư + nhắc trong app. Máy đã bật nhắc học gửi kèm `pid` (id thiết bị `push_subs`) khi tạo phiếu (không lộ ra admin/trang công khai). Phiếu chuyển **Đã sửa** (admin, `resolve`, phiếu trùng) → `pushFixed` ghi `push_now (sid, rid)` ở D1 nội bộ → cron `workers/push` (10 phút) lấy qua op `due` (`pickFixed`: tôn trọng giờ yên lặng, 1 push/thiết bị, bỏ thiết bị đã hủy/chờ > 3 ngày). Web: push rỗng → `sw.js` đọc `/__rep` (cache `lk-meta`, `report.js` ghi chữ đã dịch + mã phiếu), hỏi `mine` (≤ 4 giây) → phiếu vừa sửa → "Lỗi LX-… đã được sửa" (mở `#/report/<mã>`) thay lời nhắc; lỗi mạng → lời nhắc như cũ. FCM: kind `fixed` + `rid` (`workers/push/copy.json` lấy từ nhóm i18n `report`, `scripts/push-copy.mjs`). Mở app sau báo đẩy → nút Báo lỗi hỏi trạng thái ngay; nhắc trong app vẫn ≤ 1 lần/12 giờ (bị chặn thì giữ thay đổi cho lượt sau). Thiếu `D1B_*`/`PUSH_PCT`/`FCM_ON` → bỏ qua, thư vẫn chạy.

## Người dùng thấy
Màn cảm ơn (Kit, mã, mốc theo loại: tài khoản 24 h, lỗi 2–3 ngày, nội dung/dịch 1 tuần, đề xuất "sẽ xem xét"; nút Theo dõi tiến độ, Sao chép liên kết; không để email → nhắc xem trong app). Trang trạng thái: Đã nhận → Đang xử lý → Đã sửa (phiên bản), mốc chính xác sau khi AI phân loại, phản hồi của đội, lời cảm ơn; không chứa dữ liệu cá nhân. Mốc chỉnh trong admin (mốc gốc theo mức). **Mốc thông minh** (`smartH` trong `report.js`): mốc gốc theo P0–P3/loại, không thấp hơn trung vị thời gian sửa thật của cùng mức (90 ngày, ≥ 3 phiếu), +10 % cho mỗi phiếu đang mở cùng mức hoặc gấp hơn xếp trước (≤ 30), ≥ 48 giờ làm tròn theo ngày, trần 90 ngày. Lúc gửi: theo loại + hàng đợi; sau AI lưu `eta_x` = {m: trung vị giờ, a: số phiếu trước} → trang trạng thái và thư cảm ơn dùng mốc này, đổi mốc gốc vẫn áp cho phiếu cũ.

## Thư cho người báo (15 ngôn ngữ)
Thư cảm ơn ngay khi tạo phiếu (chỉ khi để email + đồng ý; chạy nền sau AI phân loại nên mốc theo mức P0–P3, AI lỗi vẫn gửi): mã LX, mốc dự kiến, liên kết riêng `#/report/<mã>`; lịch sử ghi `mailed`/`mail-failed` · `thanks`. Đổi trạng thái/phản hồi → thư cập nhật. Thư theo ngôn ngữ giao diện lúc gửi (`lang` của phiếu; mã lạ → tiếng Anh). Chữ lấy từ nhóm dịch `report` của app (một nguồn): `scripts/gen-report-mail-i18n.mjs` sinh `functions/api/_report-i18n.js` (chạy tự động cuối `scripts/i18n-fix.mjs`; `scripts/test/report.mjs` báo lệch nguồn). Thêm chữ thư mới: thêm khóa vào `MAIL_KEYS` + `en/report.js` + `i18n-fixed.json`, rồi `node scripts/i18n-fix.mjs`.

## Thư cho người báo (15 ngôn ngữ)
Thư cảm ơn ngay khi tạo phiếu (chỉ khi để email + đồng ý; chạy nền sau AI phân loại nên mốc theo mức P0–P3, AI lỗi vẫn gửi): mã LX, mốc dự kiến, liên kết riêng `#/report/<mã>`; lịch sử ghi `mailed`/`mail-failed` · `thanks`. Đổi trạng thái/phản hồi → thư cập nhật. Thư theo ngôn ngữ giao diện lúc gửi (`lang` của phiếu; mã lạ → tiếng Anh). Chữ lấy từ nhóm dịch `report` của app (một nguồn): `scripts/gen-report-mail-i18n.mjs` sinh `functions/api/_report-i18n.js` (chạy tự động cuối `scripts/i18n-fix.mjs`; `scripts/test/report.mjs` báo lệch nguồn). Thêm chữ thư mới: thêm khóa vào `MAIL_KEYS` + `en/report.js` + `i18n-fixed.json`, rồi `node scripts/i18n-fix.mjs`.

## Biến môi trường
Thẻ Chất lượng (admin › Tổng quan) › **Cài đặt & bí mật** liệt kê mục còn thiếu + chỗ nhập (op `cfg`: `ai`, `gh`, `cli`, `mail_st` ok/no-key (Worker thư trả 501)/no-binding/failing/unknown, `push` ok/off/no-d1b, `r2`, `shot_sign`) – chỉ cờ, không giá trị.
Pages: `ADMIN_EMAILS`, `REPORT_NOTIFY_EMAIL`, `GH_ISSUES_TOKEN`, `LEXKITE_REPORT_CLI_KEY`, `CF_AI_TOKEN`/`CF_ACCOUNT_ID` (khi không có binding AI), `TURNSTILE_SECRET_KEY`, (tùy chọn) `REPORT_SHOT_KEY`; binding R2 `REPORT_SHOTS`. Worker mail: `RESEND_API_KEY`, `BREVO_API_KEY`.

## Test
`scripts/test/report.mjs`, `scripts/test/report-ui.mjs` (trong `npm test`).
