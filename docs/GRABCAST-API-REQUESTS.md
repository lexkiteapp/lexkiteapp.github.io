# GrabCast API – các endpoint cần mở cho khoá API (workspace) để Lexkite quản lý 100 % (22/10/2026)

> TL;DR: Danh sách endpoint GrabCast cần mở cho khóa API workspace để Lexkite quản lý 100% (connect, insights, comments, inbox…). Khóa workspace 4 đang bị chặn các endpoint này.
> Đọc khi: làm việc với GrabCast API.

Hiện khoá API workspace 4 bị chặn: `connect/*`, `insights`, `comments`, `inbox`, `approval`, `best-times`, `queue/slots`, `hashtag-groups`, `caption-templates`, `accounts/{id}/check`. Lexkite gọi qua proxy máy chủ `functions/api/social.js` (khoá chỉ ở server, admin-gated, idempotency key).

Yêu cầu chung: scope theo workspace của khoá; trả JSON; lỗi `{error:{code,message}}`; phân trang `cursor`; giới hạn tốc độ có header `RateLimit-*`; webhook ký HMAC.

| # | Endpoint | Mục đích | Ghi chú |
|---|---|---|---|
| 1 | `POST /v1/connect/{meta\|tiktok\|youtube\|threads}` body `{workspace, return_to}` → `{auth_url, state}` | Lexkite mở màn hình đồng ý của nền tảng dưới app đã duyệt của GrabCast, xong quay về `return_to` (lexkite.com/admin) | `return_to` phải nằm trong danh sách cho phép của workspace |
| 2 | `GET /v1/connect/{state}/candidates` → Page/IG/kênh tìm được; `POST /v1/connect/{state}/select` `{ids:[]}` | Chọn Page/IG/kênh nào thêm vào workspace | |
| 3 | `POST /v1/accounts/{id}/check` | Kiểm tra token/quyền/hạn mức ngay | đã có trong UI |
| 4 | `GET /v1/insights?account=&post=&from=&to=&metrics=` | Lượt xem, thích, bình luận, lưu, chia sẻ, thời lượng xem | theo bài & theo tài khoản |
| 5 | `GET /v1/inbox?account=&cursor=`, `POST /v1/inbox/{comment_id}/reply` `{text}` | Hộp bình luận + trả lời | |
| 6 | `GET/POST/PATCH/DELETE /v1/caption-templates`, `/v1/hashtag-groups` | Đồng bộ 2 chiều mẫu caption & bộ hashtag | |
| 7 | `GET /v1/best-times?account=` , `GET/PUT /v1/queue/slots?account=` | Khung giờ vàng & luật hàng đợi | |
| 8 | `POST /v1/posts/{id}/approval` `{state, note}` | Đồng bộ trạng thái duyệt | |
| 9 | Webhook `post.published`, `post.failed`, `account.needs_reconnect`, `insights.updated` → `https://lexkite.com/api/social/webhook` | Đồng bộ tức thì thay vì hỏi định kỳ | **Lexkite đã sẵn sàng (27/10)**: `X-GrabCast-Timestamp` (giây) + `X-GrabCast-Signature: sha256=<hex HMAC-SHA256(secret, "<ts>.<body thô>")>`, lệch ≤ 300 s; thân `{type, post:{id, status, targets[], …}}`; secret Pages `GRABCAST_WEBHOOK_SECRET` |

Sau khi mở: Lexkite bỏ cửa sổ popup GrabCast, kết nối/duyệt/số liệu/bình luận làm hoàn toàn trong Quản trị Lexkite; phần đăng chạy nền vẫn ở GrabCast.
