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

**Bản tiếng Việt** (page "Lexkite - Học Tiếng Anh"): cùng bố cục/code, chỉ đổi chữ (`COPY.vi`), file hậu tố `-vi`:
`facebook/lexkite-facebook-cover-1640x624-vi.png`, `youtube/lexkite-youtube-banner-2560x1440-vi.png`, `youtube/lexkite-youtube-thumbnail-template-1280x720-vi.png`.
Avatar/watermark không có chữ nên dùng chung bản trên. Cổng riêng cho `-vi`: dấu hiển thị đúng bằng phông kit (Plus Jakarta Sans), không rơi về phông hệ thống; các cổng còn lại như bản EN.

`contact-sheet.jpg`: xem trước crop tròn (300/96/40 px), điện thoại/máy tính bảng/máy tính/TV. `manifest.json`: số đo QC (tương phản, cỡ chữ, dung lượng).

## Page theo ngôn ngữ (es · pt · de · fr · ru · tr · ar · hi + vi) – 11/11
**Trang tải cho chủ: [`download.html`](download.html)** (mở từ thư mục này; mỗi ngôn ngữ: xem bìa, tải bìa/@2x/ảnh đại diện/banner, nút "Chép" cho tên page, bio, Giới thiệu, CTA, link web + link tải).
Văn bản từng ngôn ngữ: `<lang>/page-info.md` (bio ≤ 100 ký tự, Giới thiệu, hạng mục, nút CTA, link web `lexkite.com/<lang>/` + UTM `utm_source=facebook&utm_medium=page&utm_campaign=<lang>`, link add-on/Google Play/App Store lấy từ `web/js/ext-config.js` – nguồn duy nhất, dịch ngược để soát nghĩa).
- **Ảnh**: cùng bố cục với bản vi, hậu tố `-<lang>`: bìa FB 1640×624 (+`@2x` 3280×1248), banner YouTube, mẫu thumbnail. Ảnh đại diện = logo nguyên bản, dùng chung (đổi logo phải hỏi chủ). Ả Rập dựng RTL (`dir=rtl`, bỏ giãn chữ); phông Noto Sans (Cyrillic) / Noto Sans Arabic / Noto Sans Devanagari; cổng QC: tràn chữ, vùng an toàn, tương phản, phông không rơi về hệ thống, đúng hệ chữ, không lẫn chữ Việt.
- **Chữ**: `scripts/social/channel-copy.mjs` (một nguồn cho ảnh + văn bản). Sửa → `node scripts/social/build-page-info.mjs` (sinh lại `page-info.md` + `download.html`, nhẹ) và PR kích hoạt workflow dựng ảnh trên CI → `bash scripts/ci/bot-output.sh channel-kit` → commit PNG + `manifest.json` + `contact-sheet.jpg`.
- **Không tự đăng**: chủ tự tải lên Facebook; phiên làm bộ này không đăng nhập Facebook.
- **Bài đăng của page** (`functions/api/_first_comment.js`, `_role_meta.js`, `scripts/video/publish-grabcast.mjs`): caption luôn có link web + UTM (`utm_term` = ngôn ngữ clip); FB/YouTube/Threads/X thêm bình luận đầu qua `targets[].options.first_comment` khi kênh có quyền. Ghim: không có API ghim ở GrabCast/nền tảng → không ghim được.

## Dựng lại (chỉ trên CI)
Sửa `scripts/social/build-channel-kit.mjs` (chữ ở `COPY`, tư thế giáo viên ở `POSES`) → mở PR: workflow **Social channel kit** dựng + QC
(kích thước, vùng an toàn, tương phản ≥ 4.5:1, cỡ chữ đọc được trên điện thoại, chữ không đè giáo viên, không tiếng Việt, dung lượng, logo nguyên bản)
→ `bash scripts/ci/bot-output.sh channel-kit` → commit. `npm test` chạy `--check` (file đủ, đúng cỡ, logo không đổi).

## Đề xuất về logo (chưa làm – cần chủ duyệt)
- Wordmark `brand/lexkite-logo-dark.svg` dùng `<text>` (phông Bricolage) – máy không có phông sẽ hiện phông khác. Nên chuyển chữ thành path.
