# Sổ tài khoản & khóa (Admin → Sổ tài khoản & khóa)

> TL;DR: Một bảng cho MỌI dịch vụ/khóa/tài khoản dịch vụ: thuộc email nào, tài khoản nào, giữ ở đâu (chỉ TÊN biến), phạm vi, hạn + nhắc 14 ngày, link quản lý. Không bao giờ có giá trị bí mật.
> Đọc khi: thêm secret/dịch vụ mới (phải vào sổ, test chặn), gia hạn token, sửa `admin-accounts.js`.

| Phần | Tệp |
|---|---|
| Sổ đăng ký (công khai: tên, phạm vi, link, hạn mặc định; KHÔNG email/giá trị) | `functions/api/_accounts_reg.js` |
| API quản trị `POST /api/admin-accounts` (`list`, `set`) | `functions/api/admin-accounts.js` |
| Giao diện (tab tải lười) | `web/js/admin-accounts.js` (+ mục `accounts` trong `web/js/admin.js`) |
| Phần nhập tay (email chủ, tài khoản, hạn, ghi chú) dùng chung mọi admin | D1 `acct_ledger` |
| Nhắc gia hạn qua thư | `workers/mail/index.js` (digest hằng ngày: mốc 14/7/3/2/1/0 ngày, rồi mỗi ngày khi quá hạn) |
| Test | `scripts/test/accounts.mjs`, `mail-prefs.mjs` (4b) |

**Trạng thái "có/thiếu" (chỉ tên, không giá trị):** `pages` = `env[tên]` có giá trị ngay trên máy chủ · `github` = `GET /repos/lexkiteapp/lexkiteapp.github.io/actions/secrets` bằng `GH_DISPATCH_TOKEN` (cần quyền *Secrets: read*; cache 10 phút; thiếu quyền → "chưa rõ" và banner nhắc) · `local` = tệp `~/.config/lexkite/*`, chỉ ghi nhận. Tên secret trên GitHub chưa có trong sổ → hiện ở "extra".
**Tự đồng bộ tên:** `accounts.mjs` quét `.github/workflows` (`secrets.X`) và `functions/api` (`env.X` dạng KEY/TOKEN/SECRET/_SA/JWK) — thiếu ở sổ thì `npm test` đỏ. Thêm secret mới = thêm 1 dòng vào `_accounts_reg.js`.
**An toàn:** chỉ `adminGate`; mỗi lần xem/sửa ghi `admin_log` (`acct.list`/`acct.set`); email chủ chỉ nhập ở Admin (lưu D1, không vào repo công khai); ô nhập chặn chuỗi dạng khóa; phản hồi qua lưới `looksSecret`. File `ACCOUNTS.local.md` vẫn là bản riêng trên máy (không commit, không đọc từ máy chủ).
**Dùng chung:** admin khác sửa → `admin-sync.js` tự làm mới + "Vừa cập nhật bởi a***@…" (`docs/API-KEYS.md` §10).
Hạn đã biết: `GH_DISPATCH_TOKEN` (fine-grained, chỉ repo lexkiteapp.github.io, Actions đọc/ghi) 02/11/2027 · `GH_ISSUES_TOKEN` (classic public_repo) ~31/01/2027.
