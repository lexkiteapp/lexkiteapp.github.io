# Hồ sơ cửa hàng – Lexkite

Bản mới nhất cho Chrome Web Store nằm ở **`store/chrome/`**:
- `store/chrome/LISTING.md` – tên, mô tả ngắn/dài (en, vi, es, pt_BR, id), danh mục, URL.
- `store/chrome/PRIVACY-PRACTICES.md` – single purpose, lý do từng quyền, khai báo dữ liệu, remote code.
- `store/chrome/SUBMIT.md` – các bước đăng (phần nào người dùng phải tự bấm).
- `store/chrome/screenshots/` – ảnh 1280×800 chụp từ add-on thật (`scripts/store-shots.mjs`, chạy bằng workflow "Ảnh + video cửa hàng"; bộ v2 cho cả 3 store: `store/assets-v2/UPLOAD.md`).

Gói tải lên: `bash scripts/build-extension.sh --zip` → `store/lexkite-extension.zip` (không đưa vào git).
