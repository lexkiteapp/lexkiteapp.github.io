# Lexkite – Từ vựng IELTS thông minh

**Lexkite** (Vocabulary + Band) là bộ công cụ học từ vựng cho người luyện thi IELTS, gồm 2 phần dùng **chung một mã nguồn**:

| Phần | Thư mục | Địa chỉ |
|---|---|---|
| Web app (PWA, cài được như app) | `web/` | https://vocaband.web.app |
| Add-on Chrome | `extension/` (bản sao `web/` trong `extension/app`) | Chrome Web Store (xem `store/LISTING.md`) |

## Tính năng chính
- **Từ điển Anh–Việt:** định nghĩa Oxford Languages, phiên âm UK/US, nghe chuẩn và chậm, nghĩa theo từ loại, câu song ngữ, collocation, từ liên quan. Kết quả hiện ngay rồi bổ sung dần, có lưu đệm.
- **Thư viện khoảng 1.200 từ:** 24 chủ đề IELTS, toàn bộ AWL (570 từ), phrasal verb, idiom, tính từ miêu tả, từ nối, collocation band 7+, cụm nêu quan điểm.
- **Thư viện cá nhân tự phân loại theo nguồn:** YouTube, trang web, bài đọc, từ điển, thư viện.
- **Ôn tập khoa học:**
  - FSRS-5 (thuật toán mặc định của Anki) kèm bước học 1→10 phút; mục tiêu ghi nhớ chỉnh được 80–95%.
  - Đường cong quên lãng (% còn nhớ), danh sách "Sắp quên".
  - **Thời điểm vàng** có giờ yên lặng.
  - 5 cấp độ nhớ, giới hạn số thẻ mỗi phiên.
  - Ô tự đặt câu (hiệu ứng tự tạo).
- **Luyện tập:** Học thông minh (thẻ giới thiệu → trắc nghiệm → gõ từ), Ghép thẻ tính giờ, Trắc nghiệm, Điền từ, Nghe & chép, **Luyện phát âm có chấm điểm**, Bài kiểm tra ước tính band.
- **10 bài đọc IELTS (B1–C1):** chạm vào từ để tra và lưu kèm câu, có câu hỏi True/False/Not Given và trắc nghiệm.
- **Gamification:** XP, cấp độ, 3 nhiệm vụ mỗi ngày, 16 huy hiệu, chuỗi ngày, lịch học 6 tháng, dự báo số thẻ đến hạn.
- **Tài khoản:** đăng nhập Google, đồng bộ Firestore gọn nhẹ (chỉ gửi phần thay đổi, tối đa 1 lần mỗi phút).
- **Add-on:**
  - Bấm đúp để tra từ, bôi đen để dịch câu (có nút 🌐), menu chuột phải.
  - **Chạm vào từ trong phụ đề YouTube:** video tự dừng; từ được lưu kèm câu phụ đề và mốc thời gian.
  - Badge số thẻ cần ôn, nhắc học hằng ngày và thời điểm vàng.

## Chạy & phát triển
```bash
cd web && python3 -m http.server 5173          # chạy thử web app
./scripts/build-extension.sh                   # chép web/ vào extension/app
./scripts/build-extension.sh --zip             # tạo vocaband-extension.zip để nộp Chrome Web Store
./scripts/deploy.sh "mô tả thay đổi"           # build + commit + push GitHub + deploy Firebase
./scripts/store-assets.sh                      # chụp ảnh Store bằng Chrome headless (dữ liệu mẫu ?demo=1)
./scripts/deploy-cloudflare.sh                 # (tùy chọn) deploy lên Cloudflare Pages
python3 scripts/make_icons.py web/icons 16 32 48 128 192 512 128:16   # vẽ lại icon
```
Cài add-on khi phát triển: `chrome://extensions` → bật Developer mode → **Load unpacked** → chọn `extension/`. Mỗi lần sửa code, chạy lại script build rồi bấm ↻ trên thẻ add-on.

## Cấu trúc
```
web/
  index.html, privacy.html, sw.js, manifest.webmanifest, css/style.css, icons/
  js/data.js            bộ từ gốc + registry IELTS_DATA.add()
  js/lib/*.js           thư viện mở rộng: topics-more (240), skills (290), awl (570)
  js/readings.js        10 bài đọc IELTS
  js/core.js            lưu trữ, SRS (SM-2 + learning steps + retention), thời điểm vàng, thống kê
  js/dictionary.js      tra từ nhanh/đầy đủ + cache bền
  js/game.js            XP, cấp độ, nhiệm vụ, huy hiệu, âm thanh, pháo giấy
  js/ui.js              tiện ích giao diện
  js/app.js             khung app, trang chủ, thư viện, từ điển, sổ từ, tiến độ, phương pháp, cài đặt, onboarding
  js/study.js           ôn tập & 7 chế độ luyện tập
  js/reading.js         bài đọc tương tác
  js/sync.js            đăng nhập Google & đồng bộ Firestore
extension/               manifest MV3, background.js, content.js (tra từ/dịch/YouTube), popup.*
brand/                   logo SVG/PNG
store/                   ảnh & hồ sơ đăng Chrome Web Store (LISTING.md)
firestore.rules          mỗi người chỉ đọc/ghi dữ liệu của mình
```

## Chi phí khi mở rộng
- **Tra từ:** trình duyệt của mỗi người dùng gọi thẳng các API miễn phí, không qua máy chủ riêng, nên không phát sinh chi phí máy chủ. Kết quả được lưu đệm trên máy.
- **Dữ liệu học:** lưu ngay trên thiết bị (local-first). Đồng bộ đám mây là tùy chọn. Mỗi lượt đồng bộ chỉ gửi phần thay đổi và đã được thu gọn khoảng 72%.
- **Hosting:** Firebase Spark miễn phí khoảng 10 GB băng thông mỗi tháng, đủ cho khoảng 50.000 lượt mở app đầu tiên (mỗi lượt khoảng 190 KB gzip; các lần sau dùng cache). Khi lớn hơn, chuyển sang **Cloudflare Pages** (miễn phí, băng thông không giới hạn) bằng `scripts/deploy-cloudflare.sh`.
- **Firestore (gói miễn phí):** 20.000 lượt ghi và 50.000 lượt đọc mỗi ngày, tương đương vài nghìn người đồng bộ mỗi ngày. Khi vượt mức này, cần bật Blaze (khoảng 0,18 USD mỗi 100.000 lượt ghi), hoặc chuyển đồng bộ sang Google Drive appData của chính người dùng (miễn phí với nhà phát triển).

## Lộ trình app di động
Toàn bộ là HTML/CSS/JS thuần, local-first, nên có thể đóng gói thành app iOS/Android bằng **Capacitor** mà gần như không phải viết lại. Khi đó thêm thông báo đẩy native cho "thời điểm vàng" và widget từ của ngày.

---
“IELTS” là nhãn hiệu của British Council, IDP: IELTS Australia và Cambridge University Press & Assessment. Lexkite là sản phẩm độc lập, không liên kết với các tổ chức này.

<!-- Pages: lexkiteapp.github.io -->
