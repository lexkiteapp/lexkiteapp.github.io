# Đẩy lượt cài app / add-on từ web (INSTALL-GROWTH)

> TL;DR: Phần lớn người dùng ở web → mời cài app iOS/Android và add-on Chrome ở khoảnh khắc họ đã thấy giá trị, không làm phiền; đo từ bấm → cài theo nền tảng. Link cửa hàng chỉ ở `web/js/ext-config.js`.
> Đọc khi: thêm/sửa lời mời cài app, add-on, mã QR, PWA, deep link, Smart App Banner.

Chuẩn: [specs/notifications.md](specs/notifications.md) (đẹp, không ép, có trần). Link cửa hàng: `web/js/ext-config.js` (LK_APPS, LK_EXT) – không chép lại.

## Đã có (trước 12/11)
- Nút "Tải app" mọi nơi: `web/js/get-app.js` (đích theo nền tảng, utm/referrer/ct, `app_<nơi>_<đích>`).
- Lời mời add-on trên Chromium máy tính: `web/js/ext-cta.js` (toast từ lần tra thứ 3, ≤ 1/7 ngày).
- Deep link: `web/.well-known/apple-app-site-association` + `assetlinks.json`, khóa bằng `scripts/test/deep-links.mjs`.
- PWA: `web/manifest.webmanifest` (+ `sw.js`); logo KHÔNG đổi (xin chủ trước).

## Tờ cài app ở khoảnh khắc giá trị (`web/js/install-sheet.js`, gói lười `install`)
- Khoảnh khắc: xong bài đầu · chuỗi 3 ngày · lưu 20 từ. Không bao giờ ở lần mở đầu (chưa xong bài = không mời).
- Trần: mỗi khoảnh khắc 1 lần đời, ≤ 3 lần tổng, cách ≥ 14 ngày, "Để sau" 2 lần → thôi hẳn (`localStorage lk.inst`). Không hiện khi có hộp thoại khác/đã hỏi nhắc học < 2 ngày/lớp học/dưới 13 tuổi/đã là app/add-on.
- Android: intent mở app nếu đã cài, chưa cài → Google Play + referrer utm; iPhone/iPad: App Store (`ct=`). Nudge PWA cũ (`App.installNudge`) nhường khi có app cửa hàng.
- Smart App Banner (Safari iOS): `<meta name="apple-itunes-app">` ở `/app/` + 15 trang landing (`scripts/build-landing.mjs`).
- Đo: `/api/hit` `inst_<first|streak|words>_<v|c|x>_<play|ios|desk>` (xem · bấm · để sau) → `ext_events` kind `cta:<ev>`. Tỷ lệ bấm/xem theo nền tảng.
- Test: `scripts/test/install-sheet.mjs`.
