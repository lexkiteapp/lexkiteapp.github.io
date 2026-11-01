# OTA – cập nhật app Android/iOS không qua cửa hàng

> TL;DR: Bản web (mobile/www) được ký ECDSA và phát qua GitHub Release `ota-<bản>` mỗi lần Prod release xanh; app kiểm khi mở/quay lại, tải nền, kiểm chữ ký + sha256 + `minNative`, áp ở lần mở nguội hoặc lúc app xuống nền (không giữa bài học), tự quay lại bản cũ nếu bản mới không gọi `notifyAppReady`. Phần native (Android Play In-App Update, iOS "Mở App Store") nhắc qua `@capawesome/capacitor-app-update`. Chủ chỉ cần: `node scripts/ota/keygen.mjs` + 1 secret.

## Luồng
1. `prod-release.yml` job `ota` (sau `gate` + `smoke`): `OTA_ONLY=1 scripts/build-mobile.sh` → `scripts/ota/release.mjs publish` zip `mobile/www`, ký `[version,url,sha256,minNative]` bằng `OTA_SIGNING_KEY`, tạo Release `ota-<bản>` (bundle.zip + manifest.json), trỏ `ota-manifest/latest.json`. Chưa có secret → job bỏ qua, không đỏ. Giữ 10 bản.
2. `GET /api/ota` (functions/api/ota.js) chuyển manifest (đệm 60 s); không D1, không bí mật.
3. `web/js/ota.js` (gói lười `ota`, chỉ app gốc; `native.js` gọi `notifyAppReady` ngay và nạp gói sau 8 s): kiểm khi mở + khi quay lại (cách ≥ 6 giờ) → `verify` chữ ký bằng `web/js/ota-key.js` (trống = từ chối mọi bản) → `download` (plugin kiểm sha256) → `next` (chạy ở lần mở nguội) → `set` khi app xuống nền nếu không ở giữa bài (`busy()`).
4. `minNative` (mobile/package.json › ota.minNative): app gốc cũ hơn → không nhận OTA, hiện nhắc cập nhật bắt buộc (Android: immediate; iOS: chỉ nút "Mở App Store"). Còn lại: Android flexible (nhắc lại ≥ 3 ngày), iOS so bản App Store.
5. Hỏng: bản mới không gọi `notifyAppReady` trong 15 s → plugin tự quay lại; bản đó vào danh sách xấu, không tải lại.

## Rollback
Actions › OTA rollback (`ota-rollback.yml`, để trống = bản ngay trước) → trỏ lại manifest đã ký của bản đích; máy đang chạy bản lỗi tải bản đích ở lần kiểm kế tiếp. Không cần khóa riêng. Tay: `node scripts/ota/release.mjs list|rollback [bản]`.

## Chủ làm một lần
1. `node scripts/ota/keygen.mjs` (ghi khóa riêng ngoài repo, khóa công khai vào `web/js/ota-key.js`).
2. `gh secret set OTA_SIGNING_KEY --repo lexkiteapp/lexkiteapp.github.io < ~/.config/lexkite/ota-signing.b64`.
3. Đưa `web/js/ota-key.js` lên main, build lại app gốc (android.yml / ios.yml) để app mang khóa + plugin. Bản app cũ chưa có plugin thì không nhận OTA.
Đổi khóa = mọi app cũ ngừng nhận OTA; sao lưu khóa riêng. Kiểm thử: `node scripts/test/ota.mjs`. Tài nguyên: infra/resources.json › `ota`.
