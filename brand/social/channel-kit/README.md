# Lexkite – Bộ ảnh kênh social (tiếng Anh, dùng chung mọi nước)

Ảnh đại diện + ảnh bìa cho kênh **Facebook, Instagram, TikTok, YouTube** (thay bộ cũ ở `brand/social/` có chữ tiếng Việt).
Chữ trên ảnh **chỉ tiếng Anh**. Logo = nguyên `web/icons/icon.svg` + `brand/lexkite-logo-dark.svg` (không sửa/vẽ lại/đổi màu; đổi logo cần chủ duyệt).
Bố cục từ Stitch (Lexkite Kit, queue `scripts/stitch/queues/social-brandkit-1105.json`), giáo viên 2D thật Ama + Carlos (`web/teach/*/still-*.webp`).

| Nền tảng | File | Kích thước | Tải lên ở đâu | Lưu ý |
|---|---|---|---|---|
| Facebook | `facebook/lexkite-facebook-profile-1080.png` | 1080×1080 | Trang → ảnh đại diện | hiển thị tròn |
| | `facebook/lexkite-facebook-cover-1640x624.png` (+ `@2x` 3280×1248) | 1640×624 | Trang → *Chỉnh sửa ảnh bìa* | máy tính hiện cả ảnh; điện thoại cắt giữa 16:9 (x 265–1375). Chữ nằm trong 1030×500 ở giữa; góc dưới trái để trống cho ảnh đại diện. Bản `@2x` cho màn hình nét cao |
| Instagram | `instagram/lexkite-instagram-profile-1080.png` | 1080×1080 | Hồ sơ → *Sửa ảnh* | tròn, hiển thị 110–150 px |
| TikTok | `tiktok/lexkite-tiktok-profile-1080.png` | 1080×1080 | Hồ sơ → *Thay đổi ảnh* | tròn |
| YouTube | `youtube/lexkite-youtube-profile-800.png` | 800×800 | Studio → Tùy chỉnh → Thương hiệu → Ảnh | tròn, ≤ 4 MB |
| | `youtube/lexkite-youtube-banner-2560x1440.png` | 2560×1440 | Studio → Thương hiệu → Hình ảnh biểu ngữ | ≤ 6 MB. Mọi chữ trong vùng an toàn 1546×423 ở giữa (điện thoại); máy tính bảng 1855×423, máy tính 2560×423, TV cả ảnh |
| | `youtube/lexkite-youtube-watermark-150.png` | 150×150 | Studio → Thương hiệu → Hình mờ video | PNG trong suốt, ≤ 1 MB |
| | `youtube/lexkite-youtube-thumbnail-template-1280x720.png` | 1280×720 | Studio → video → Hình thu nhỏ | ≤ 2 MB; mẫu – đổi chữ ở `COPY.thumb` trong script; góc dưới phải để trống (nhãn thời lượng) |

`contact-sheet.jpg`: xem trước crop tròn (300/96/40 px), điện thoại/máy tính bảng/máy tính/TV. `manifest.json`: số đo QC (tương phản, cỡ chữ, dung lượng).

## Dựng lại (chỉ trên CI)
Sửa `scripts/social/build-channel-kit.mjs` (chữ ở `COPY`, tư thế giáo viên ở `POSES`) → mở PR: workflow **Social channel kit** dựng + QC
(kích thước, vùng an toàn, tương phản ≥ 4.5:1, cỡ chữ đọc được trên điện thoại, chữ không đè giáo viên, không tiếng Việt, dung lượng, logo nguyên bản)
→ `bash scripts/ci/bot-output.sh channel-kit` → commit. `npm test` chạy `--check` (file đủ, đúng cỡ, logo không đổi).

## Đề xuất về logo (chưa làm – cần chủ duyệt)
- Wordmark `brand/lexkite-logo-dark.svg` dùng `<text>` (phông Bricolage) – máy không có phông sẽ hiện phông khác. Nên chuyển chữ thành path.
