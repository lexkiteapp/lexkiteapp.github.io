# Lexkite – Hạ tầng toàn cầu (miễn phí, mở rộng theo nhu cầu)

> 📒 Sổ đăng ký tài nguyên: `infra/resources.json` (tự hiện ở Quản trị → Dịch vụ) · Quy tắc thêm tài nguyên, lưu trữ & mail: `docs/INFRA-RULES.md`

## Nguyên tắc
1. **Máy người dùng làm phần nặng.** Tra từ, dịch, AI, âm thanh và lịch ôn FSRS đều chạy trên trình duyệt hoặc app, gọi thẳng các dịch vụ công khai miễn phí. Máy chủ của mình không xử lý gì, nên thêm người dùng không làm tăng chi phí.
2. **Dữ liệu học nằm ở máy người dùng** (IndexedDB, dung lượng hàng GB). Cloud chỉ để đồng bộ giữa các thiết bị: nén gzip, chỉ gửi phần thay đổi, tối đa 3 phút một lần.
3. **Một bộ mã cho mọi nền tảng:** web (PWA), add-on Chrome/Edge/Firefox, app Android/iOS (Capacitor).
4. **Không phụ thuộc một nhà cung cấp.** Mỗi lớp đều có đường dự phòng.

## Sơ đồ
```
Người dùng (mọi quốc gia)
   │  index.html + phần lõi (~400 KB gzip)       ← Firebase Hosting (CDN toàn cầu)
   │  file dữ liệu: đề thi, từ vựng, ngữ pháp     ← GitHub Pages (tự deploy mỗi lần push, ~100 GB/tháng, nhanh ~1 s)
   │    (mã xử lý luôn lấy từ Firebase → không lệch phiên bản)  └─ chưa deploy / khác nội dung → lấy từ Firebase
   │  bản dự phòng toàn site                      ← GitHub Pages
   │
   ├─ Tra từ / dịch / phát âm: Google Translate (gtx), Wiktionary, dictionaryapi.dev, Wikimedia Commons, Datamuse
   ├─ AI: Gemini bằng khóa của người dùng / Gemini Nano có sẵn trong Chrome
   ├─ Âm thanh: bài nghe IELTS/TOEIC/TOEFL + câu hỏi giám khảo = giọng Kokoro-82M (Apache-2.0) tạo sẵn trên máy (scripts/gen-audio.mjs) → mp3 trên GitHub Pages; từ vựng = bản ghi người thật (Wikimedia) + giọng tốt nhất của thiết bị; thiếu file → giọng máy
   └─ Đồng bộ: Firebase Auth (Google, miễn phí không giới hạn) + Firestore
```

## Sức chứa của gói miễn phí hiện tại
| Lớp | Giới hạn miễn phí | Ước tính chịu được | Ghi chú |
|---|---|---|---|
| Firebase Hosting | 360 MB/ngày | ~900 người dùng mới/ngày (phần lõi 411 KB) | File dữ liệu đã chuyển sang GitHub Pages; người dùng cũ lấy từ bộ nhớ đệm của Service Worker |
| GitHub Pages | ~100 GB/tháng (giới hạn mềm) | ~8.000 người dùng mới/ngày cho file dữ liệu | jsDelivr đã thử nhưng loại vì chậm (15 giây/file khi lấy thẳng từ GitHub) |
| Firestore | 50k lượt đọc + 20k lượt ghi/ngày | ~5–10k người dùng đồng bộ/ngày | Bước 2 bên dưới khi vượt mức |
| Firebase Auth | không giới hạn (Google) | không giới hạn | |
| Dịch vụ tra từ công khai | tính theo IP người dùng | không giới hạn | Mỗi người dùng có hạn mức riêng |

## Đa ngôn ngữ (i18n)
- Giao diện chỉ hiện những ngôn ngữ đã dịch đầy đủ (`SUPPORTED` trong `web/js/i18n.js`), nên không bao giờ trộn ngôn ngữ.
- **Tự động:** sửa `scripts/i18n-langs.txt` rồi push. GitHub Actions (`.github/workflows/i18n.yml`) dịch toàn bộ giao diện và commit lại. Biến `{name}` và thẻ HTML được giữ nguyên; câu dịch sai định dạng thì tự quay về tiếng Anh.
- Nội dung bài học viết bằng tiếng Việt tự được dịch sang ngôn ngữ của người học khi chạy (có bộ nhớ đệm). Vùng làm bài không bị dịch để không lộ đáp án.
- Nghĩa từ hiện theo ngôn ngữ người học: tiếng Việt, hoặc định nghĩa tiếng Anh cho người học quốc tế.

## Lộ trình mở rộng (khi cần, theo thứ tự)
1. **Tên miền riêng** (vd. vocaband.app, khoảng 10–15 USD/năm, là khoản tốn tiền duy nhất): uy tín hơn, SEO tốt hơn. Mỗi ngôn ngữ một thư mục (`/es/`, `/fr/`…) kèm `hreflang`, thay vì subdomain.
2. **Đồng bộ trên Cloudflare** (miễn phí): Workers 100k request/ngày + R2 10 GB, không tính phí băng thông. Workers xác minh mã đăng nhập Firebase rồi lưu gói dữ liệu đã nén vào R2. Chịu được khoảng 30k người dùng đồng bộ/ngày. Cần anh tạo tài khoản Cloudflare (miễn phí).
3. **Cloudflare Pages làm máy chủ chính** (băng thông không giới hạn); Firebase Hosting chuyển thành dự phòng.
4. **Theo dõi lỗi:** add-on đã có nhật ký lỗi nội bộ. Bản web có thể thêm Sentry (gói miễn phí 5k sự kiện/tháng).

## Quy trình phát hành (tự động)
`ship` = kiểm thử → build (esbuild, sinh hreflang + sitemap) → tăng phiên bản add-on → commit & push → chờ GitHub Pages deploy rồi đối chiếu nội dung từng file dữ liệu (`scripts/cdn-pin.sh`) → Firebase deploy → kiểm tra bản trên web.
App mobile: `./scripts/build-mobile.sh` (xem `mobile/README.md`).
