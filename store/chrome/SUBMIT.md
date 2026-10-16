# Đăng Lexkite lên Chrome Web Store – các bước

Dashboard: https://chrome.google.com/webstore/devconsole

## Anh tự làm (không ai làm thay được)
1. **Đăng ký tài khoản nhà phát triển** bằng Gmail chính (vintagezulilyjewelry@gmail.com) → đồng ý *Developer Agreement* → trả **phí 5 USD một lần**.
2. Tab **Account**: xác minh email liên hệ; điền tên nhà phát triển hiển thị (vd. "Lexkite"); nếu Google yêu cầu thì xác minh danh tính / địa chỉ (trader/non-trader – chọn theo thực tế công ty).
3. Sau khi Claude điền sẵn: xem lại toàn bộ rồi bấm **Submit for review** (chọn "Publish automatically after review" hoặc tự bấm xuất bản).

## Claude điền sẵn (khi đã có tài khoản)
1. **New item** → tải `store/lexkite-extension.zip` (tạo bằng `bash scripts/build-extension.sh --zip`).
2. **Store listing**: theo `store/chrome/LISTING.md`; ảnh `store/chrome/screenshots/en-1..5.png` (bản vi cho ngôn ngữ Tiếng Việt), ô nhỏ `promo-440x280.png`, ô lớn `promo-1400x560.png`.
3. **Privacy practices**: theo `store/chrome/PRIVACY-PRACTICES.md`.
4. **Distribution**: Public, mọi khu vực, miễn phí.

## Mỗi lần cập nhật
- Tăng `version` trong `extension/manifest.json` (CWS từ chối số phiên bản không tăng) → build zip → **Package → Upload new package** → Submit.
- Thêm quyền mới ⇒ cập nhật `PRIVACY-PRACTICES.md`, chính sách `content/legal/{en,vi}/privacy.html` (`node scripts/build-legal.mjs`) và lý do quyền trên dashboard trước khi gửi.
