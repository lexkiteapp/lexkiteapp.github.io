# Quy tắc thương hiệu Lexkite (nguồn duy nhất – không vẽ lại ở nơi khác)

| Thành phần | Nguồn DUY NHẤT | Ghi chú |
|---|---|---|
| Linh vật **Kit** (6 cảm xúc: happy, win, cheer, think, sad, sleep) | `web/js/kit.js` → `Kit.svg(cảm xúc, cỡ, hoạt cảnh)` | `brand/kit-*.svg` được **xuất tự động** từ file này (`node scripts/build-social-kit.mjs`) – không sửa tay |
| Icon app | `web/icons/icon.svg` | nền #0F3D3E, diều gradient #F2553B → #FFB054, vàng #FFC94A, kem #FFE7C2 |
| Logo ngang / đơn sắc | `brand/lexkite-logo-{light,dark}.svg`, `brand/lexkite-mark*.svg` | cùng tông icon.svg |
| Wordmark | "lex" màu chữ + "kite" gradient #E5502F → #FFB054 (`.wordmark b`, `.grad-text` trong `web/css/style.css`) | |
| Mạng xã hội | `brand/social/` (dựng bằng `scripts/build-social-kit.mjs`) | đọc Kit từ kit.js |
| Trang trình bày brand | `brand/brand-kit.html` | nạp `../web/js/kit.js` |

## Bảng màu
Teal đậm **#0F3D3E** (chủ đạo) · teal phụ #17595A · cam **#E5502F** / #F2553B · vàng cam #FFB054 · vàng #FFC94A / #FFD36A · má hồng #FF8FA3 · kem #FFF7EA / #FFE7C2 · xanh thành công #2FBF71.

## Đã bỏ (không dùng)
Kit "lưng xanh dương" cũ: **#2F62C0, #244E9E** – `scripts/test/brand-check.mjs` (trong `npm test`) chặn ship nếu màu này xuất hiện lại.

## Đổi thương hiệu
Sửa ở nguồn (kit.js / icon.svg / logo) → chạy `node scripts/build-social-kit.mjs` → `npm test` → ship. Mọi nơi khác tự cập nhật.
