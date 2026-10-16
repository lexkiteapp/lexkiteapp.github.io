# Lexkite – Social media kit

Ảnh đại diện, ảnh bìa, mẫu bài đăng và watermark cho mọi kênh, dựng từ đúng logo, màu và phông của Lexkite (`brand/`, `web/css/style.css`).
Xem trước toàn bộ (bật/tắt vùng an toàn): mở `brand/social/index.html`.

## Dựng lại

```bash
node scripts/build-social-kit.mjs
```

- Chữ trên ảnh (slogan, mẫu bài, nhãn Highlights) nằm ở `src/copy.json`. Sửa rồi chạy lại lệnh trên.
- Lần chạy đầu, script tự cài `@resvg/resvg-js`, `sharp`, `opentype.js` vào thư mục tạm, không đụng tới repo. Muốn chọn chỗ cài thì đặt biến `SOCIAL_KIT_DEPS=/đường/dẫn`.
- Toàn bộ chữ được chuyển thành đường vector, nên SVG nguồn (`src/svg/`, `logo/`) hiển thị giống hệt ở mọi máy mà không cần cài phông.
- Ảnh xuất ra theo hệ màu sRGB. JPG dùng chất lượng 88 (mozjpeg); ảnh đại diện, watermark và logo dùng PNG.

## Nhận diện

| Màu | Hex | RGB | Dùng cho |
|---|---|---|---|
| Deep Teal | `#0F3D3E` | 15, 61, 62 | nền, chữ trên nền sáng |
| Teal Glow | `#2A7D7A` | 42, 125, 122 | điểm sáng của nền trời |
| Swallow Coral | `#F2553B` | 242, 85, 59 | logo, nút |
| Coral UI | `#E5502F` | 229, 80, 47 | màu chính của web, đầu gradient "kite" |
| Apricot | `#FFB054` | 255, 176, 84 | cuối gradient |
| Sun | `#FFC94A` | 255, 201, 74 | đuôi én, phần thưởng, điểm nhấn |
| Sky | `#CFE9F2` | 207, 233, 242 | chữ phụ trên nền tối |
| Paper | `#F4FBF8` | 244, 251, 248 | nền sáng, chữ trên nền tối |
| Correct | `#2FBF71` | 47, 191, 113 | trạng thái đúng |

- **Phông** (đều theo giấy phép SIL OFL 1.1, file nằm trong `src/fonts/`):
  - Bricolage Grotesque ExtraBold: wordmark và tiêu đề.
  - Be Vietnam Pro: nội dung, tiếng Việt.
  - Noto Sans: phiên âm IPA.
- **Khoảng trống quanh logo**: tối thiểu ½ chiều cao dấu hiệu ở mọi cạnh. Xem `logo/lexkite-clearspace.png`.
- **Kích thước tối thiểu**:
  - dấu hiệu: 24 px (16 px chỉ dùng cho favicon);
  - logo ngang: rộng 96 px.
- **Chọn bản logo theo nền**:
  - nền tối: `*-on-dark` hoặc `*-white`;
  - nền sáng: `*-on-light` hoặc `*-teal`.
- **Không được**:
  - đổi màu, xoay, kéo giãn, thêm bóng hay viền cho logo;
  - đặt logo lên ảnh rối mà không có nền;
  - dùng logo hay nhãn hiệu của IELTS, ETS, British Council. Chỉ được nhắc tên kỳ thi bằng chữ thường.

## File → nơi tải lên

| Nền tảng | File | Tải lên ở đâu | Lưu ý |
|---|---|---|---|
| Facebook | `facebook/facebook-avatar-720x720.png` | Trang → ảnh đại diện → *Cập nhật ảnh đại diện* | hiển thị tròn |
| | `facebook/facebook-cover-1640x624.jpg` (EN) · `facebook-cover-vi-1640x624.jpg` (VI) | Trang → *Chỉnh sửa ảnh bìa* → *Tải ảnh lên* | điện thoại cắt hai bên, chỉ còn khoảng giữa rộng 1110 px; ảnh đại diện che góc dưới bên trái. Nội dung nằm trong vùng 990×460 (x 385–1375). Xem `guides/` |
| | `facebook/facebook-post-1080x1080.jpg` | Tạo bài viết → Ảnh/video | mẫu quảng bá |
| | `facebook/facebook-link-1200x630.jpg` | Ảnh xem trước khi chia sẻ link (thẻ `og:image`), hoặc ảnh bài viết có link | |
| | `facebook/facebook-event-1920x1005.jpg` | Sự kiện → *Thêm ảnh bìa* | |
| Instagram | `instagram/instagram-avatar-1080x1080.png` | Hồ sơ → *Chỉnh sửa trang cá nhân* → *Sửa ảnh* | IG hiển thị tối đa 320 px, cắt tròn |
| | `instagram-post-word-1080x1080.jpg`, `instagram-post-quiz-1080x1350.jpg` | + → Bài viết | lưới hồ sơ cắt mỗi bên khoảng 34 px |
| | `instagram-story-1080x1920.jpg` | + → Tin | vùng an toàn 1080×1420: chừa 250 px ở trên và 250 px ở dưới |
| | `instagram-reel-cover-1080x1920.jpg` | Khi đăng Reel → *Chỉnh sửa ảnh bìa* → *Thêm từ thư viện* | lưới hồ sơ cắt khung 3:4 ở giữa (y 240–1680) |
| | `instagram-highlight-*-1080x1920.jpg` (Từ vựng, IELTS, TOEIC, Mẹo, Ứng dụng, Review) | Hồ sơ → giữ tin nổi bật → *Chỉnh sửa* → *Chỉnh sửa ảnh bìa* | icon nằm giữa, IG cắt tròn. Tên tin nổi bật gõ trong app |
| TikTok | `tiktok/tiktok-avatar-1080x1080.png` | Hồ sơ → *Sửa hồ sơ* → *Thay đổi ảnh* | hiển thị tròn |
| | `tiktok/tiktok-cover-1080x1920.jpg` | Khi đăng → *Chọn ảnh bìa* → *Tải lên* (hoặc ghép vào khung đầu video) | tránh 160 px ở trên, 150 px cột nút bên phải, 300 px chú thích ở dưới. Lưới hồ sơ cắt khung 3:4 |
| YouTube | `youtube/youtube-avatar-800x800.png` | YouTube Studio → *Tùy chỉnh* → *Thương hiệu* → *Ảnh* | ≤ 4 MB, hiển thị tròn |
| | `youtube/youtube-banner-2560x1440.jpg` | Studio → *Tùy chỉnh* → *Thương hiệu* → *Hình ảnh biểu ngữ* | ≤ 6 MB. Mọi chữ nằm trong vùng 1546×423 ở giữa. TV hiện cả ảnh, máy tính hiện dải 2560×423, máy tính bảng hiện 1855×423. Xem `guides/youtube-banner-2560x1440-guide.jpg` |
| | `youtube/youtube-watermark-150x150.png` | Studio → *Tùy chỉnh* → *Thương hiệu* → *Hình mờ video* | PNG nền trong suốt, nhỏ hơn 1 MB. Nên chọn hiển thị *Toàn bộ video* |
| | `youtube/youtube-thumbnail-1280x720.jpg` | Studio → video → *Hình thu nhỏ* → *Tải lên* | ≤ 2 MB. Không đặt chữ ở góc dưới bên phải vì bị thời lượng video che. Đây là mẫu: thay số và chữ trong `copy.json` |
| | `youtube/youtube-endscreen-1920x1080.jpg` | Ghép vào 5–20 giây cuối video, rồi vào Studio → *Màn hình kết thúc* → *Thêm phần tử* | đặt 2 phần tử video trùng 2 khung nét đứt (720×405 tại x 200 và x 1000, y 340), nút *Đăng ký* trùng vòng tròn ở dưới |
| Watermark | `watermark/lexkite-watermark-mark-light-300x300.png` (trắng) · `-dark-` (teal) · `-color-` | Lớp phủ trong CapCut, Premiere, DaVinci… | bản *light* dùng cho cảnh tối, bản *dark* cho cảnh sáng |
| | `watermark/lexkite-watermark-horizontal-light-720x180.png` · `-dark-` | như trên | đặt ở góc trên bên phải, cách mép khoảng 3–4%. **Độ mờ khuyến nghị 60–75%.** Video dọc nên cao khoảng 5% khung hình |
| X / Twitter | `x/x-avatar-400x400.png`, `x/x-header-1500x500.jpg` | Hồ sơ → *Edit profile* | ảnh đại diện che góc dưới bên trái của ảnh bìa |
| LinkedIn | `linkedin/linkedin-avatar-400x400.png`, `linkedin/linkedin-cover-1584x396.jpg` | Trang hoặc hồ sơ → biểu tượng bút chì ở ảnh bìa | ảnh đại diện che góc bên trái |
| Zalo OA | `zalo/zalo-avatar-720x720.png`, `zalo/zalo-cover-1280x1400.jpg` (VI) | oa.zalo.me → *Quản lý* → *Thông tin OA* | ảnh bìa gấp đôi khung 640×700 mà các nguồn hay nêu; nội dung nằm trong dải giữa 1280×680. Thông số chính thức của Zalo chưa thống nhất, nên xem trước trong trang quản trị OA trước khi lưu |

`logo/` chứa logo gốc dạng SVG kèm PNG:

- dấu hiệu: màu, trắng, teal;
- icon ứng dụng;
- logo ngang: on-dark, on-dark-bg, on-light, trắng, teal;
- logo xếp dọc;
- hình quy tắc khoảng trống.

`guides/` chứa ảnh vẽ đè vùng an toàn, vùng hiển thị theo thiết bị và vùng bị giao diện che. Ý nghĩa màu: xanh lá là vùng an toàn, xanh nhạt là vùng hiển thị theo thiết bị, đỏ là phần bị giao diện che, vàng là phần bị cắt tròn.

## Lưu ý

- Kích thước theo các hướng dẫn được cập nhật năm 2026. Nền tảng có thể đổi giao diện, nên luôn xem bản xem trước khi tải lên.
- Kit (chú én) và mọi hình minh họa đều là tài sản của Lexkite. Bộ ảnh không dùng ảnh có bản quyền của bên thứ ba.
- Không lưu mật khẩu hay token trong thư mục này (repo công khai).
