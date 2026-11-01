# ADMIN-SECURITY – bảo vệ trang quản trị (/admin) nhiều lớp (22/10/2026)

> TL;DR: Các lớp bảo vệ trang /admin: adminGate ở API (Origin, rate-limit, Firebase token + email_verified + ADMIN_EMAILS), cổng whoami ở trình duyệt, lớp biên Cloudflare Access (chưa bật). Người lạ nhận 403 và bị ghi admin_log.
> Đọc khi: sửa trang/API quản trị hoặc bật Cloudflare Access.

## Các lớp đã bật trong mã
1. **API** (`functions/api/admin.js` → `adminGate`): Origin của mình · giới hạn 120 lệnh/phút/IP · Firebase ID token + `email_verified` + email trong `ADMIN_EMAILS` (bí mật Pages). Người lạ → 403 `forbidden` và ghi `admin_log` (`denied`); quá 10 lần bị từ chối/10 phút → 429. **Giữ nguyên.**
2. **Cổng cửa phía trình duyệt** (`web/js/admin.js`): ngay sau đăng nhập gọi op `whoami` (qua `adminGate`, chỉ trả `{admin:true}`, không lộ danh sách email). 403 → chỉ hiện "Tài khoản này không có quyền quản trị" + nút "Đăng nhập bằng tài khoản khác" (Google `prompt=select_account`), không vẽ thanh bên/nội dung, tự đăng xuất. Test: `scripts/test/admin-gate.mjs`, `api-security.mjs`.
3. **Header**: `web/admin.html` có `noindex, nofollow`; `/admin*` trả `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`, `frame-ancestors 'none'`; mọi `/api/admin` trả `no-store`.
4. **Chọn tài khoản Google**: mọi `GoogleAuthProvider` trên web/admin/add-on đặt `prompt=select_account`. App native: plugin `@capacitor-firebase/authentication` 8.x — `signOut()` đăng xuất cả Firebase lẫn Google SDK gốc nên lần sau hiện bảng chọn tài khoản.
5. **Cài đặt quản trị cá nhân hóa (`adm_pref`) & Email cảnh báo (`workers/mail`)**: lưu trong D1 `config` theo khóa `adm_pref:<email>` (blob JSON ≤ 4 KB, kiểm tra schema whitelist qua `/api/admin-prefs`). Worker `workers/mail/index.js` khi gửi bản tin hằng ngày (cron 01:00 UTC) hoặc thư cảnh báo trực tiếp đọc cấu hình 1 lần theo khóa (không quét bảng), áp dụng loại cảnh báo (`alertTypes`) và ngưỡng (`jsErrorThreshold`, `quotaThresholdPct`) cho từng quản trị viên. Test: `scripts/test/admin-prefs.mjs`, `scripts/test/mail-prefs.mjs`.

## Lớp biên: Cloudflare Access (CHƯA bật – cần anh làm 1 lần)
Token `~/.config/lexkite/cf-token` có quyền gọi API Access nhưng tài khoản **chưa bật Zero Trust** (API trả `access.api.error.not_enabled`); bật là thao tác trên trang web (có thể đòi thẻ dù gói Free 0 đ), em không làm thay được. Danh sách `ADMIN_EMAILS` là bí mật Pages, API không đọc lại được → anh tự nhập email.

Các bước:
1. dash.cloudflare.com → **Zero Trust** → chọn tên team (vd `lexkite`) → gói **Free** (≤ 50 người dùng).
2. Zero Trust → **Settings → Authentication → Login methods**: dùng **One-time PIN** (mặc định, không cần cấu hình) hoặc thêm Google.
3. **Access → Applications → Add → Self-hosted**: tên `Lexkite Admin`; thêm 3 đích `lexkite.com/admin` , `lexkite.com/admin.html` , `lexkite.com/admin/*`; session 24 giờ.
4. **Policy** `admins`: Action **Allow**, Include → **Emails** = đúng các email trong `ADMIN_EMAILS` (Pages → lexkite → Settings → Variables). Không thêm "Everyone".
5. Lưu, mở `https://lexkite.com/admin.html` trong cửa sổ ẩn danh: phải thấy trang đăng nhập Cloudflare Access, không thấy giao diện quản trị. Lưu ý: `/api/admin*` **không** đưa vào Access (trang web gọi bằng ID token Firebase; `adminGate` đã chặn).
6. Khi thêm/bớt admin: sửa cả `ADMIN_EMAILS` và policy Access.

Sau khi anh bật Zero Trust (bước 1), nhắn em: em tạo ứng dụng + policy qua API (`/accounts/<id>/access/apps`) bằng token hiện có.
