# Lexkite – Social templates (nhân vật + Kit)

Xem tất cả mẫu: mở `index.html`. Ô "bản trống" bật/tắt các bản `-blank`, tức bản đã bỏ chữ hook để anh tự gõ.

## Dựng lại

```bash
node scripts/build-social-templates.mjs
```

- Mọi chữ hook nằm trong `templates.json`. Sửa ở đó rồi chạy lại lệnh trên.
- **Nhân vật:**
  - script cắt ảnh từ `brand/characters/_candidates/` (thư mục này không commit; đường dẫn đổi được bằng biến `CHAR_SRC=…`) và lưu vào `assets/chars/*-bust.jpg`, `*-face.jpg`;
  - các ảnh đã cắt này có commit, nên máy không có ảnh gốc vẫn dựng lại được;
  - muốn chọn vùng cắt khác thì sửa `bust` / `face` trong `templates.json`.
- **Kit:** chỉ lấy từ `web/js/kit.js`, theo `docs/BRAND-RULES.md`.

## Danh sách mẫu

| Nhóm | File | Ghi chú |
|---|---|---|
| Thumbnail YouTube 1280×720 | `yt-dont-say`, `yt-big-hook`, `yt-quiz` | đều có bản `-blank`. Không đặt chữ ở góc dưới bên phải, vì YouTube hiện thời lượng video ở đó |
| Ảnh bìa Shorts / Reels / TikTok 1080×1920 | `short-pov`, `short-native`, `short-why` | nội dung nằm trong vùng x 90–930, y 270–1600, tránh thanh trên cùng, cột nút bên phải và chú thích bên dưới |
| Ảnh bài đăng IG/FB | `post-word` và `post-idiom` (1:1), `post-dont-say` và `post-quiz` (4:5) | đều có bản `-blank` |
| End card | `endcard-qr-1080x1920` (dọc), `endcard-qr-1920x1080` (ngang) | mã QR dẫn tới https://lexkite.com, đã quét thử và đọc đúng. Đặt ở 5–20 giây cuối video |
| Lower-third | `lower-third-<mia\|leo\|ama\|diane\|carlos\|kit>-1920x1080.png` và `-1080x1920.png` | PNG nền trong suốt, đặt chồng lên video. Bản dọc nằm ở y≈1330, phía trên phần chú thích |
| Bảng nhận diện | `brand-sheet-1920x1080` | bảng màu theo BRAND-RULES, phông chữ, nhân vật, Kit |

- **Thư mục:** `png/` chứa ảnh dùng ngay (JPG q88, sRGB; lower-third là PNG). `svg/` chứa bản sửa được: chữ hook và tên trong lower-third là chữ thật (`<text class="hook">`, `id="name"`, `id="role"`). Ảnh nhân vật được tham chiếu tương đối tới `../assets/chars/`.
- **Mở SVG trong Figma / Illustrator / Inkscape:** cần cài phông (Google Fonts, SIL OFL, file có sẵn trong `../src/fonts/`):
  - Bricolage Grotesque 800;
  - Be Vietnam Pro 600–800;
  - Noto Sans 500.
- **Dùng trong Canva / CapCut:** tải bản `-blank` lên, rồi gõ chữ hook bằng Bricolage Grotesque ExtraBold, màu Paper `#F4FBF8` hoặc Sun `#FFC94A`.

## Quy tắc

- **Màu:** chỉ dùng bảng màu trong `docs/BRAND-RULES.md`. Mọi ảnh dùng nền teal bầu trời `#0F3D3E`. Mảng màu lệch kiểu sticker sau khung nhân vật chỉ dùng coral hoặc sun.
- **Hook:** tối đa 3–5 chữ trên thumbnail, đọc được trong 2 giây. Mỗi ảnh chỉ tô một từ khoá bằng sun hoặc coral.
- **Nhân vật:** không đổi màu hay kéo giãn. Chỉ dùng ảnh tạo từ Element đã khoá trên Kling, theo `docs/ASSET-LIBRARY.md`. Không dùng ảnh, logo hay nhãn hiệu của bên thứ ba.
