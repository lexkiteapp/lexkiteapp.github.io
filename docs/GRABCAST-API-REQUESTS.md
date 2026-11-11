# GrabCast API – các endpoint cần mở cho khoá API (workspace) để Lexkite quản lý 100 % (22/10/2026)

> TL;DR: Danh sách endpoint GrabCast cần mở cho khóa API workspace để Lexkite quản lý 100% (connect, insights, comments, inbox…). Khóa workspace 4 đang bị chặn các endpoint này.
> Đọc khi: làm việc với GrabCast API.

Hiện khoá API workspace 4 bị chặn: `connect/*`, `insights`, `comments`, `inbox`, `approval`, `best-times`, `queue/slots`, `hashtag-groups`, `caption-templates`, `accounts/{id}/check`. Lexkite gọi qua proxy máy chủ `functions/api/social.js` (khoá chỉ ở server, admin-gated, idempotency key).

Yêu cầu chung: scope theo workspace của khoá; trả JSON; lỗi `{error:{code,message}}`; phân trang `cursor`; giới hạn tốc độ có header `RateLimit-*`; webhook ký HMAC.

| # | Endpoint | Mục đích | Ghi chú |
|---|---|---|---|
| 1 | `POST /api/social/connect/{meta\|tiktok\|youtube\|threads}` body `{workspace, return_to}` → `{auth_url, state}` | Lexkite mở màn hình đồng ý của nền tảng dưới app đã duyệt của GrabCast, xong quay về `return_to` (lexkite.com/admin) | `return_to` phải nằm trong danh sách cho phép của workspace |
| 2 | `GET /api/social/connect/{state}/candidates` → Page/IG/kênh tìm được; `POST /api/social/connect/{state}/select` `{ids:[]}` | Chọn Page/IG/kênh nào thêm vào workspace | |
| 3 | `POST /v1/accounts/{id}/check` | Kiểm tra token/quyền/hạn mức ngay | đã có trong UI |
| 4 | `GET /v1/insights?account=&post=&from=&to=&metrics=` | Lượt xem, thích, bình luận, lưu, chia sẻ, thời lượng xem | theo bài & theo tài khoản |
| 5 | `GET /v1/inbox?account=&cursor=`, `POST /v1/inbox/{comment_id}/reply` `{text}` | Hộp bình luận + trả lời | |
| 6 | `GET/POST/PATCH/DELETE /v1/caption-templates`, `/v1/hashtag-groups` | Đồng bộ 2 chiều mẫu caption & bộ hashtag | |
| 7 | `GET /v1/best-times?account=` , `GET/PUT /v1/queue/slots?account=` | Khung giờ vàng & luật hàng đợi | |
| 8 | `POST /v1/posts/{id}/approval` `{state, note}` | Đồng bộ trạng thái duyệt | |
| 9 | Webhook `post.published`, `post.failed`, `account.needs_reconnect`, `insights.updated` → `https://lexkite.com/api/social/webhook` | Đồng bộ tức thì thay vì hỏi định kỳ | **Lexkite đã sẵn sàng (27/10)**: `X-GrabCast-Timestamp` (giây) + `X-GrabCast-Signature: sha256=<hex HMAC-SHA256(secret, "<ts>.<body thô>")>`, lệch ≤ 300 s; thân `{type, post:{id, status, targets[], …}}`; secret Pages `GRABCAST_WEBHOOK_SECRET` |

Sau khi mở: Lexkite bỏ cửa sổ popup GrabCast, kết nối/duyệt/số liệu/bình luận làm hoàn toàn trong Quản trị Lexkite; phần đăng chạy nền vẫn ở GrabCast.

**Kiểm lại 05/11/2026** (1 lượt GET chỉ đọc `connect/<state>/candidates` bằng khóa workspace 4): vẫn 403 `api_key_not_allowed`. Đường dẫn trong bảng đã sửa về tiền tố thật `/api/social/` (bản cũ ghi `/v1/`).

**Cần thêm – ảnh bìa video**: option bìa theo đích trong `POST posts` (`targets[].options`): TikTok `video_cover_timestamp_ms`, IG/FB Reels `cover_media_id` hoặc `cover_url`, YouTube `thumbnail_media_id`. Lexkite đã có ảnh bìa từng clip; chưa gửi vì option không có trong hợp đồng (gửi bừa → 422 làm ngắt cả lượt autopilot).

**Cần thêm – quản lý kênh (05/11/2026, đọc 1 lượt `GET accounts` ws4)**: hiện `GET accounts` trả `id, platform, external_id, parent_external_id, display_name, username, avatar_url, status, needs_reconnect, scopes, kinds, connected_at, limits{<kind>_24h,<kind>_cap}, capabilities, health{ok, needs_reconnect, expires_at, expiring_soon, error_code, reason}, fb_user_id, fb_user_name, nickname, group, last_published_at`. Thiếu:
| # | Cần | Vì sao | Lexkite tạm làm |
|---|---|---|---|
| 10 | Trạng thái **Pause publishing** trong `GET accounts` (`publishing: "paused"` hoặc `publishing_paused: true`) | Page/IG bị Pause trên grabcast.click vẫn trả `status: "active"` → Lexkite không thấy | mapper `extAccount` đã truyền 3 trường này nếu có; tạm dùng Tạm dừng của Lexkite (`cfg.active`) + loại `grabcast*` |
| 11 | `POST accounts/{id}/pause` · `POST accounts/{id}/resume` | Tạm dừng/tiếp tục từ Quản trị Lexkite | Tạm dừng phía Lexkite (không đẩy bài) |
| 12 | `DELETE accounts/{id}` (ngắt kết nối) – từ chối nếu token dùng chung workspace khác | Ngắt từ Quản trị | mở grabcast.click Accounts trong popup; cấm với `grabcast*` (token dùng chung ws1) |
| 13 | Avatar ổn định: `avatar_url` không ký/không hết hạn, hoặc `GET accounts/{id}/avatar` | URL ký fbcdn hết hạn sau ~4 ngày (`oe=`), dài 400–550 ký tự | máy chủ Lexkite tải về khi sync, cache D1 `dist_avatar`, phục vụ `/api/distribution?av=<băm>` |
| 14 | Email/tài khoản quản trị đã nối (`connected_by_email`) | Biết ai nối, khi nào token hỏng thì ai nối lại | hiện `fb_user_name` (tên FB) + "email: chưa rõ (GrabCast không trả)" |
| 15 | Số bài theo tài khoản: `posts_today`, `posts_7d`, `posts_total` | Thẻ kênh | đếm từ `dist_social` (bài autopilot) + `limits.*_24h` |
