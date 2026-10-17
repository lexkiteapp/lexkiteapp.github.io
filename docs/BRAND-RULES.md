# Quy tắc thương hiệu Lexkite (nguồn duy nhất – không vẽ lại ở nơi khác)

| Thành phần | Nguồn DUY NHẤT | Ghi chú |
|---|---|---|
| Linh vật **Kit** (6 cảm xúc: happy, win, cheer, think, sad, sleep) | `web/js/kit.js` → `Kit.svg(cảm xúc, cỡ, hoạt cảnh)` | `brand/kit-*.svg` được **xuất tự động** từ file này (`node scripts/build-social-kit.mjs`) – không sửa tay |
| Icon app | `web/icons/icon.svg` | nền #0F3D3E, diều gradient #F2553B → #FFB054, vàng #FFC94A, kem #FFE7C2 |
| Logo ngang / đơn sắc | `brand/lexkite-logo-{light,dark}.svg`, `brand/lexkite-mark*.svg` | cùng tông icon.svg |
| Wordmark | "lex" màu chữ + "kite" gradient #E5502F → #FFB054 (`.wordmark b`, `.grad-text` trong `web/css/style.css`) | |
| Mạng xã hội | `brand/social/` (dựng bằng `scripts/build-social-kit.mjs`) | đọc Kit từ kit.js |
| Trang trình bày brand | `brand/brand-kit.html` | nạp `../web/js/kit.js` |

## Nhãn hiệu "Lexkite™"
- Chủ sở hữu: **MODIAN LUXURY JEWELRY LLC** (chưa đăng ký → dùng **™**, không dùng ®).
- Chỉ gắn ™ ở: (1) lần nhắc nổi bật đầu tiên trong văn bản pháp lý (Điều khoản: "Lexkite™ is operated by…") và điều khoản nhãn hiệu `#trademarks` (`content/legal/{en,vi}/terms.html` → `node scripts/build-legal.mjs`); (2) chân trang: đoạn giới thiệu + dòng "Lexkite™ is a trademark of …" 15 ngôn ngữ – nguồn duy nhất `TM_NOTE`/`tmFirst` trong `scripts/lib/site-layout.mjs` (landing, blog, trang SEO, pháp lý); (3) chân trang chào mừng của app (`t('Lexkite™ là nhãn hiệu của {owner}.')`, bản dịch tay `scripts/i18n-fixed.json`).
- **Không** đổi logo/wordmark/icon, không thêm ™ vào `<title>`, tiêu đề, nút hay mọi lần nhắc tên trong bài. `brand-check.mjs` kiểm.

## Bảng màu
Teal đậm **#0F3D3E** (chủ đạo) · teal phụ #17595A · cam **#E5502F** / #F2553B · vàng cam #FFB054 · vàng #FFC94A / #FFD36A · má hồng #FF8FA3 · kem #FFF7EA / #FFE7C2 · xanh thành công #2FBF71.

## Đã bỏ (không dùng)
Kit "lưng xanh dương" cũ: **#2F62C0, #244E9E** – `scripts/test/brand-check.mjs` (trong `npm test`) chặn ship nếu màu này xuất hiện lại.

## Đổi thương hiệu
Sửa ở nguồn (kit.js / icon.svg / logo) → chạy `node scripts/build-social-kit.mjs` → `npm test` → ship. Mọi nơi khác tự cập nhật.

## Watermark video
- Chỉ dùng **wordmark chữ** "lexkite" (phông Bricolage Grotesque ExtraBold – OFL, `brand/social/src/fonts/`) kèm mark diều nhỏ không nền (`brand/lexkite-mark-mono.svg` đổi màu trắng). **Không** đặt ô vuông app icon lên video.
- Chữ trắng, độ mờ 55–70% (mặc định 62%), bóng mềm; cao 36–44 px ở khung 1080 (mặc định 40 px).
- Cố định góc **trên trái** trong vùng an toàn (x = 60, y = 236 – dưới thanh tab của app), không bao giờ nhảy vị trí, không che phụ đề/mặt nhân vật/hook.
- Hiện dần từ giây **1,5** (sau hook, fade 0,5 s), ẩn ở end card – end card mới hiện logo đầy đủ (`brand/lexkite-logo-dark.svg`) + Kit (chỉ từ `web/js/kit.js`).
- Nguồn code: `scripts/video/remotion/src/Short.jsx` (Watermark) + `scripts/video/motion.mjs` (`watermark` trong timeline); `scripts/test/motion.mjs` kiểm cỡ/độ mờ/vị trí.
