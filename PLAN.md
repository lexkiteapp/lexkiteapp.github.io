# Lexkite – Kế hoạch nâng cấp tổng (làm lần lượt, đánh dấu khi xong)

Mục tiêu: chuẩn top 1 thế giới – giao diện mượt, học dễ hiểu – dễ nhớ – giữ chân, chính xác, nội dung tự biên soạn, hạ tầng 0 đồng chịu hàng triệu người dùng, 15 ngôn ngữ không lẫn tiếng, âm thanh chất lượng cao, miễn phí có quảng cáo (AdSense web, AdMob app).
Cập nhật: 15/10/2026.

## 1. Hạ tầng & tài khoản (ưu tiên cao nhất)
- [x] Cloudflare Pages `lexkite` tự build từ GitHub `lexkiteapp/lexkiteapp.github.io` (băng thông không giới hạn)
- [x] Mã nguồn sang GitHub mới, lịch sử sạch; dữ liệu + âm thanh phục vụ từ Cloudflare
- [ ] Tên miền lexkite.com: đổi nameserver sang Cloudflare (anh làm trên Dynadot) → gắn vào Pages, HTTPS, www → gốc
- [ ] Firebase mới `lexkite-app` (vintagezulily…): đồng ý điều khoản (anh) → bật Auth Google + Firestore + rules → cấu hình mới trong app
- [ ] Đổi toàn bộ đường dẫn sang lexkite.com (âm thanh, SEO, sitemap, chính sách riêng tư, add-on, app)
- [ ] vocaband.web.app chuyển hướng 301 sang lexkite.com (cần đăng nhập tài khoản cũ 1 lần)
- [ ] Kiểm tra tải: Lighthouse ≥ 95, trang đầu < 1,5 s trên 4G

## 2. Thương hiệu Lexkite trên sản phẩm
- [x] Tên, logo “cuốn sách biết bay”, icon web/add-on/iOS/Android, màn hình chờ, bảng màu
- [x] Linh vật Kit trong app: chào ở trang chủ (vui / ăn mừng / buồn khi sắp mất chuỗi), ăn mừng khi xong phiên ôn & bài luyện
- [ ] Font thương hiệu (Bricolage Grotesque + Figtree) – tải nhẹ, có dự phòng
- [ ] Bộ ảnh & mô tả cửa hàng (App Store, Google Play, Chrome Web Store) theo 15 ngôn ngữ
- [ ] App ID mới `com.lexkite.app` trước khi lên Store

## 3. Giao diện & trải nghiệm top đầu
- [x] Chuyển trang mượt, khung chờ, tải trước khi sắp bấm, phản hồi chạm
- [ ] Làm lại trang chủ (Kit + mục tiêu hôm nay + học tiếp 1 chạm), điều hướng dưới trên điện thoại
- [ ] Hệ thống chuyển động & âm thanh phản hồi thống nhất (đúng/sai/hoàn thành)
- [ ] Hướng dẫn lần đầu cùng Kit (3 bước, chọn mục tiêu → học thẻ đầu tiên trong 30 giây)
- [x] Rà khả năng truy cập (tương phản AA, bàn phím, trình đọc màn hình), chế độ tối tinh chỉnh
- [ ] Ảnh chụp trước/sau mỗi vòng gửi anh duyệt

## 4. Quảng cáo (miễn phí, có quảng cáo)
- [x] Mô-đun `Ads` chung: AdSense (web) + AdMob (app), add-on không quảng cáo, không bao giờ hiện khi đang học/làm bài, giới hạn tần suất, chừa chỗ chống nhảy trang
- [x] Tự sinh ads.txt / app-ads.txt khi có mã
- [ ] Anh đăng ký AdSense + AdMob bằng Gmail sạch → em điền mã, bật thử nghiệm
- [ ] Cài plugin AdMob cho app + màn hình đồng ý quảng cáo (GDPR/UMP)
- [ ] Cập nhật chính sách riêng tư, bỏ chữ “Không quảng cáo”, khai báo an toàn dữ liệu trên Store

## 5. Giữ chân người dùng
- [x] Huy hiệu thói quen: Cú đêm, Chim sớm, Thợ săn từ (50 từ/ngày); Mọt sách đã có
- [ ] Widget màn hình chính iOS/Android (chuỗi ngày + thẻ cần ôn)
- [x] Thông báo nhắc học bằng giọng Kit (vui, không gây áp lực)

## 6. Nội dung
- [ ] Bộ “Tiếng Anh đời thực”: slang & idiom hiện đại, du lịch – du học sinh tồn, phỏng vấn & email công sở (học theo tình huống 2 câu)
- [ ] TOEFL Essential 500 dạng thẻ + bài phản xạ
- [ ] Giọng Kokoro cho phần còn lại (bài đọc, câu mẫu Speaking) – chạy từng đợt nhỏ để máy không nóng
- [ ] Rà dịch máy sai nghĩa ở chữ ngắn trên 13 ngôn ngữ (vd. “Look up”, “Table”, “Play slowly”)

## 7. Add-on
- [x] Giao diện 15 ngôn ngữ, nghĩa theo ngôn ngữ người học
- [ ] Chèn từ tiếng Anh khi đọc báo tiếng Việt (VnExpress, Tuổi Trẻ…)
- [ ] Phụ đề song ngữ YouTube (rê chuột → dừng, đọc, xem nghĩa)
- [ ] Mã QR chuyển bộ từ sang điện thoại không cần đăng nhập

## 8. AI (miễn phí, chất lượng cao)
- [ ] AI dùng chung trên Cloudflare Workers AI (có giới hạn lượt/ngày) → ai cũng có AI chấm bài, không cần khóa
- [ ] Giám khảo Speaking AI hội thoại thật, chấm band 4 tiêu chí
- [ ] Chấm phát âm theo từng âm (chạy trên máy)
- [ ] “Hỏi AI vì sao sai” trong mọi câu hỏi

## 9. App iOS / Android lên Store
- [x] Tự build APK Android trên GitHub Actions
- [ ] Build trên kho mới + ký bản phát hành (AAB) cho Google Play
- [ ] Build iOS bằng máy macOS của GitHub (cần tài khoản Apple Developer)
- [ ] Gói cài đặt nhẹ nhất: không kèm âm thanh/trang SEO, tải khi cần + giới hạn bộ nhớ đệm
- [ ] Kiểm tra phiên bản nội dung khi có mạng → cập nhật bài mới không cần lên bản Store mới

## 10. Sắp xếp lại giao diện & tính năng (theo rà soát của chuyên gia UX – scratchpad ux-audit)
- [x] GĐ0–1: 5 mục chính mọi nền tảng (Hôm nay · Từ vựng · Kỹ năng · Thi thử · Tôi), menu nhóm gọn, chọn kỳ thi trên thanh trên, đường dẫn "Kỹ năng › Nghe", trang không tồn tại có hướng dẫn
- [ ] GĐ2: Trang "Hôm nay" chỉ 4 khối + 1 kế hoạch hôm nay duy nhất theo kỳ thi
- [ ] GĐ3: Bắt đầu bằng chọn kỳ thi → bài học đầu tiên trong 30 giây; TOEFL trong Mục tiêu; lộ trình/thư viện theo kỳ thi
- [ ] GĐ4: Gộp phần trùng (Reading trên máy thành nút bật trong bài đọc, danh sách bài mẫu)

## 11. SEO & blog tự đăng (phiên làm song song – chi tiết ở docs/SEO-PLAN.md)
- [ ] Rà SEO kỹ thuật toàn trang (thẻ meta, dữ liệu có cấu trúc, sitemap, tốc độ) + Google Search Console & Bing (IndexNow)
- [ ] Quy trình viết bài chuẩn SEO nhiều bước (ý định tìm kiếm → dàn ý → viết → ảnh chụp app → kiểm tra chất lượng/chính tả/trùng lặp)
- [ ] 50 bài viết đầu tiên, có ảnh chụp minh họa nhẹ (WebP/AVIF) + chỗ nhúng YouTube nhẹ (chỉ tải khi bấm)
- [ ] Ảnh lưu ngoài mã nguồn chính (CDN miễn phí) để hàng chục nghìn bài vẫn nhẹ
- [ ] Lịch đăng tự động 2–3 bài/ngày vào giờ ngẫu nhiên (GitHub Actions cron + hẹn giờ trong bài)

## 12. Kiến trúc mã (làm dần, mỗi bước có kiểm thử)
- [x] Test riêng: thuật toán FSRS (core.js), API đồng bộ D1 (functions/api/sync.js) – chạy trong CI
- [x] Kiểm tra kiểu bằng TypeScript chế độ JSDoc cho core.js, functions/api (tsconfig.check.json) – chạy trong CI; mở rộng dần sang sync.js, study.js
- [ ] Tách app.js (126 KB) theo trang: thư viện, từ điển, sổ từ, tiến độ, cài đặt → gói tải khi cần
- [ ] Tách study.js theo 7 chế độ luyện; tách extension/content.js (YouTube / dịch / tra từ)
- [ ] Chuyển dần sang ES Modules + esbuild (từng module, giữ deep link & kiểm thử xanh)
