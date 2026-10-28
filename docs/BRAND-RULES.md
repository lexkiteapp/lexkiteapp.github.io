# Quy tắc thương hiệu Lexkite (nguồn duy nhất – không vẽ lại ở nơi khác)

> TL;DR: Nguồn thương hiệu duy nhất cho Lexkite: bảng màu (Kit chỉ từ web/js/kit.js, teal), thứ đã bỏ (xanh cũ #2F62C0), đổi tên thương hiệu, watermark video. brand-check chặn lệch.
> Đọc khi: đụng logo, màu, tên, watermark.

| Thành phần | Nguồn DUY NHẤT | Ghi chú |
|---|---|---|
| Linh vật **Kit** (6 cảm xúc: happy, win, cheer, think, sad, sleep) | `web/js/kit.js` → `Kit.svg(cảm xúc, cỡ, hoạt cảnh)` | `brand/kit-*.svg` được **xuất tự động** từ file này (`node scripts/build-social-kit.mjs`) – không sửa tay |
| **Màu (mọi bề mặt)** | `brand/tokens.json` → `node scripts/build-tokens.mjs` | sinh :root sáng/tối của `web/css/style.css`, trang tĩnh (`site-layout.mjs` đọc JSON), bong bóng dịch/kiểm câu add-on (`--d-*`), `web/icons/icon.svg`, logo tối, end card video (`Short.jsx`), `build-social-kit.mjs` |
| Icon app | `web/icons/icon.svg` (sinh từ `tokens.json` → `icon`) | nền #0F3D3E + vệt sáng trên #17595A, diều #FFB054 → #FF7A4D (≥ 3:1 trên cả vệt sáng), vàng #FFC94A, kem #FFE7C2. PNG (16–512, maskable, Apple, cửa hàng) dựng trên CI |
| Logo ngang / đơn sắc | `brand/lexkite-logo-{light,dark}.svg`, `brand/lexkite-mark*.svg` | cùng tông icon.svg |
| Wordmark | "lex" màu chữ + "kite" gradient #E5502F → #FFB054 (`.wordmark b`, `.grad-text` trong `web/css/style.css`) | |
| Mạng xã hội | `brand/social/` (dựng bằng `scripts/build-social-kit.mjs`) | đọc Kit từ kit.js |
| Trang trình bày brand | `brand/brand-kit.html` | nạp `../web/js/kit.js` |

## Nhãn hiệu "Lexkite™"
- Chủ sở hữu: **MODIAN LUXURY JEWELRY LLC** (chưa đăng ký → dùng **™**, không dùng ®).
- Chỉ gắn ™ ở: (1) lần nhắc nổi bật đầu tiên trong văn bản pháp lý (Điều khoản: "Lexkite™ is operated by…") và điều khoản nhãn hiệu `#trademarks` (`content/legal/{en,vi}/terms.html` → `node scripts/build-legal.mjs`); (2) chân trang: đoạn giới thiệu + dòng "Lexkite™ is a trademark of …" 15 ngôn ngữ – nguồn duy nhất `TM_NOTE`/`tmFirst` trong `scripts/lib/site-layout.mjs` (landing, blog, trang SEO, pháp lý); (3) chân trang chào mừng của app (`t('Lexkite™ là nhãn hiệu của {owner}.')`, bản dịch tay `scripts/i18n-fixed.json`).
- **Không** đổi logo/wordmark/icon, không thêm ™ vào `<title>`, tiêu đề, nút hay mọi lần nhắc tên trong bài. `brand-check.mjs` kiểm.

## Bảng màu
Nguồn: `brand/tokens.json` (không ghi hex ở nơi khác). Teal đậm **#0F3D3E** (chủ đạo – không làm sáng trên icon/logo) · teal phụ #17595A · **teal sáng #1F7A75 / #2BA39A** (`--done`: thanh tiến độ, nút bài đã học, huy hiệu) · cam **#E5502F** / #F2553B (nút chính – CTA luôn cam) · cam sáng #FF7A4D · vàng cam #FFB054 · vàng #FFC94A / #FFD36A · má hồng #FF8FA3 · kem #FFF7EA / #FFE7C2 · xanh thành công #2FBF71.
- **Hai chế độ**, mặc định theo máy (như Duolingo), chọn tay trong Cài đặt (`data-theme`). Tối = teal đậm ấm (nền #10191B · thẻ #172427 · #1E2F33), không đen lạnh; sáng giữ nền #f5f6fb. Cùng CTA cam, teal sáng, diều, giáo viên.
- Ngưỡng (`brand-check`, không nới): chữ/nền ≥ 15:1 · chữ phụ ≥ 7:1 · teal sáng/thẻ ≥ 3:1 · diều/nền icon ≥ 3:1.
- Dựng PNG icon/logo/mạng xã hội + ảnh trước/sau: đẩy nhánh `brand-build*` (`.github/workflows/brand-build.yml`).

## Đã bỏ (không dùng)
Kit "lưng xanh dương" cũ: **#2F62C0, #244E9E**; nền tối lạnh cũ #0f1017… (`tokens.json` → `retired`). `scripts/test/brand-check.mjs` (trong `npm test`) chặn ship nếu chúng quay lại, và chặn màu lạ MỚI trong CSS app/add-on (màu cũ đã khóa ở `scripts/test/brand-colors.lock.json`, chỉ được bớt).

## Đổi thương hiệu
Sửa ở nguồn (`brand/tokens.json` / kit.js) → `node scripts/build-tokens.mjs` → đẩy nhánh `brand-build*` (CI chạy `build-social-kit.mjs`) → `npm test` → ship. Mọi nơi khác tự cập nhật.

## Watermark video
- Chỉ dùng **wordmark chữ** "lexkite" (phông Bricolage Grotesque ExtraBold – OFL, `brand/social/src/fonts/`) kèm mark diều nhỏ không nền (`brand/lexkite-mark-mono.svg` đổi màu trắng). **Không** đặt ô vuông app icon lên video.
- Chữ trắng, độ mờ 55–70% (mặc định 62%), bóng mềm; cao 36–44 px ở khung 1080 (mặc định 40 px).
- Cố định góc **trên trái** trong vùng an toàn (x = 60, y = 236 – dưới thanh tab của app), không bao giờ nhảy vị trí, không che phụ đề/mặt nhân vật/hook.
- Hiện dần từ giây **1,5** (sau hook, fade 0,5 s), ẩn ở end card – end card mới hiện logo đầy đủ (`brand/lexkite-logo-dark.svg`) + Kit (chỉ từ `web/js/kit.js`).
- Nguồn code: `scripts/video/remotion/src/Short.jsx` (Watermark) + `scripts/video/motion.mjs` (`watermark` trong timeline); `scripts/test/motion.mjs` kiểm cỡ/độ mờ/vị trí.
