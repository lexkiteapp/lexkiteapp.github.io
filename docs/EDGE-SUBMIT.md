# Đăng Lexkite lên Microsoft Edge Add-ons – gói hồ sơ

> TL;DR: Gói hồ sơ đăng Lexkite lên Microsoft Edge Add-ons: dùng chung zip Chrome, các bước trên Partner Center, lưu ý chính sách. Anh chủ tự làm phần tài khoản và bấm gửi.
> Đọc khi: đăng/cập nhật add-on trên Edge.

Anh ơi, Edge dùng chung nhân Chromium nên **cùng một gói zip với Chrome Web Store** chạy được trên Edge, không cần sửa mã. Em đã chuẩn bị sẵn chữ, ảnh và ghi chú; phần tài khoản và bấm gửi thì anh tự làm.

Dashboard: Microsoft Partner Center → Microsoft Edge → https://partner.microsoft.com/dashboard/microsoftedge/overview
Ghi chú listing (search terms, ghi chú kiểm duyệt, tóm tắt quyền): `store/edge/listing-notes.md`.

## 1. Tài khoản – anh tự làm
1. Đăng nhập Partner Center bằng tài khoản Microsoft của anh (nên dùng email chính thức của dự án) → đăng ký chương trình **Microsoft Edge** (miễn phí). Em **không** tạo hay đăng nhập tài khoản thay anh.
2. Điền thông tin nhà phát triển: tên hiển thị **Lexkite**, email liên hệ `support@lexkite.com`, xác minh email/danh tính nếu Microsoft yêu cầu.

## 2. Build gói
```
bash scripts/build-extension.sh --zip     # → store/lexkite-extension.zip
node scripts/cws-check.mjs --zip store/lexkite-extension.zip
```
Cùng file zip dùng cho Edge. Mỗi lần cập nhật phải tăng `version` trong `extension/manifest.json` (giống Chrome).

Trước lần gửi đầu, anh nên thử nhanh trên Edge: `edge://extensions` → bật *Developer mode* → *Load unpacked* → chọn thư mục `extension/` → tra từ, dịch đoạn, popup, tab mới (ô tìm kiếm phải mở công cụ tìm kiếm mặc định của Edge), Alt+L.

## 3. Các bước trên Partner Center
1. **Create new extension** → tải `store/lexkite-extension.zip` → chờ kiểm gói tự động.
2. **Availability**: Visibility = **Public**, Markets = tất cả.
3. **Properties**:
   - Category: **Education**
   - Privacy policy: **Yes** → `https://lexkite.com/privacy`
   - Website: `https://lexkite.com`
   - Support contact: `https://lexkite.com/app/#/contact` (hoặc `support@lexkite.com`)
   - Mature content: **No**
4. **Store listings** – thêm từng ngôn ngữ (15 ngôn ngữ có sẵn trong `store/chrome/listing.json`; copy nhanh ở `store/chrome/fill.html`):
   - **Description** (Edge cho tối đa 10.000 ký tự, tối thiểu 250): `listing.json → <ngôn ngữ>.description` (dài nhất ≈ 2.800 ký tự – vừa).
   - **Short description**: `listing.json → <ngôn ngữ>.summary` (≤ 132 ký tự).
   - Tên hiển thị lấy từ gói (`_locales/*/messages.json` → appName), trùng với `listing.json → name`.
   - **Search terms**: tối đa 7 cụm, mỗi cụm ≤ 30 ký tự – dùng bảng trong `store/edge/listing-notes.md`. Không nhồi từ khóa, không tên thương hiệu khác.
   - **Logo**: `extension/icons/icon-128.png` (Edge cần ảnh vuông 300×300 trở lên – nếu dashboard báo nhỏ, em xuất bản 300×300 từ `web/icons/icon.svg` khi anh cần).
   - **Screenshots**: 1280×800 từ `store/chrome/screenshots/` (`en-1..5.png` cho English, `vi-1..5.png` cho Tiếng Việt; ngôn ngữ khác lấy từ workflow "Ảnh Chrome Web Store").
   - **Small promotional tile** 440×280: `store/chrome/promo-440x280.png`; **Large promotional tile** 1400×560: `store/chrome/promo-1400x560.png`.
5. **Notes for certification**: dán khối "Notes for certification" trong `store/edge/listing-notes.md`. Edge không có tab lý do quyền riêng như Chrome; nếu người kiểm duyệt hỏi, dùng lý do trong `store/chrome/PRIVACY-PRACTICES.md` (đã tóm tắt trong `listing-notes.md`).
6. **Publish** → chờ chứng nhận (thường vài ngày làm việc). Anh tự bấm gửi.

## 4. Lưu ý chính sách Edge
- Không quảng cáo trong add-on, không đổi công cụ tìm kiếm (tab mới dùng `chrome.search.query` → công cụ mặc định), không mã từ xa – giống quy tắc Chrome (`docs/CWS-RULES.md`).
- Mô tả không hứa tính năng không có, không "best / #1 / official", có câu không liên kết với British Council/IDP/Cambridge/ETS (đã có cuối mỗi mô tả). Kiểm: `node scripts/test/listing-check.mjs`.
- Không thêm máy chủ/dịch vụ mới, nên `infra/resources.json` không đổi.
- Cập nhật sau này: tăng version → build zip → Partner Center → extension Lexkite → **Update** → tải gói mới → Publish. (Có thể tự động hóa bằng Edge Add-ons API sau, cần API key do anh tạo trong Partner Center.)
