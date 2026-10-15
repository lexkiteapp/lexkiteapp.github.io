# Lexkite: lộ trình để thương mại hóa và cạnh tranh top đầu

## Hiện trạng (14/10/2026)

**Nền tảng chung**
- Web app (PWA) và tiện ích Chrome dùng chung dữ liệu, đồng bộ theo tài khoản Google.
- Tải theo trang: lần đầu chỉ khoảng 250 KB (gzip).

**Từ vựng**
- Hơn 4.700 từ: NGSL, AWL, chủ đề IELTS, TSL (TOEIC).
- Ôn tập bằng thuật toán FSRS (như Anki), có thời điểm vàng.
- Học từ mới kiểu Mochi: thẻ lật, nút "đã biết từ này", điền từ có gợi ý chữ cái.

**Ngữ pháp:** 77 bài, 924 câu trắc nghiệm, 770 câu tự luận.

**IELTS**
- Listening: 5 đề.
- Reading: 3 đề thi trên máy và 10 bài đọc ngắn.
- Writing: 60 đề Task 2, 20 đề Task 1, 38 bài mẫu có chú thích.
- Speaking: có ghi âm và phân tích.
- Thi thử đủ 4 kỹ năng.

**TOEIC:** từ vựng TSL, Listening Part 2–4, Reading Part 5–7, thi thử 10–990.

**AI**
- AI trên máy (Chrome, miễn phí, không cần khóa).
- Hoặc khóa Gemini riêng của người dùng: chấm Writing/Speaking, giải thích cấu trúc.

**Tiện ích Chrome**
- Tra từ, dịch, phân tích cấu trúc; chạy cả trong khung trang (Study4…) và trên YouTube.

## Điểm khác biệt nên giữ làm "điểm ăn tiền"

1. **Học từ ngay trên mọi trang web và YouTube rồi tự đưa vào FSRS.** Mochi hay ELSA không làm được việc này. Đây là lợi thế lớn nhất.
2. **Một app cho cả IELTS và TOEIC, học bằng tiếng Việt.** Có từ vựng, ngữ pháp kiểu sách Mai Lan Hương (viết mới), đề thi và chấm AI.
3. **Chi phí vận hành gần 0 đồng.** AI chạy trên máy hoặc dùng khóa của người dùng, web tĩnh phân phối qua CDN. Vì vậy có thể bán rẻ hơn đối thủ rất nhiều.

## Việc nên làm tiếp, theo thứ tự ưu tiên

### A. Trước khi bán (bắt buộc)
- **Nội dung có chuyên gia duyệt.** Mời 1–2 giáo viên IELTS/TOEIC (8.0+ / 900+) duyệt đề và bài mẫu, ghi tên họ trên app để tăng uy tín.
- **Thêm nhiều đề.** Mục tiêu tối thiểu: 10 đề Listening và Reading IELTS, 5 đề TOEIC đủ 200 câu (thêm Part 1 có ảnh minh họa giấy phép mở).
- **Điều khoản sử dụng, chính sách hoàn tiền, trang giới thiệu (landing page)** có video demo.
- **Đưa lên kho ứng dụng.**
  - Chrome Web Store: phí 5 USD, anh tự đăng ký.
  - Google Play (bản đóng gói PWA): phí 25 USD.
  - App Store: cần 99 USD/năm, nên để sau.

### B. Mô hình thu tiền đề xuất (freemium)
- **Miễn phí:** tra từ, flashcard FSRS không giới hạn, 1 đề mỗi kỹ năng, AI trên máy.
- **Pro (khoảng 49.000–79.000 đ/tháng, hoặc 399.000 đ/năm):**
  - toàn bộ đề và bài mẫu;
  - thi thử không giới hạn, báo cáo tiến bộ theo band;
  - đồng bộ đám mây;
  - lộ trình cá nhân hóa.
- **Thanh toán tại Việt Nam:** VietQR, MoMo hoặc PayOS (phí thấp). Cần backend nhỏ để xác thực gói Pro, ví dụ Cloudflare Workers (gói miễn phí 100.000 lượt/ngày).

### C. Tính năng tăng giữ chân người dùng
- **Đã có:** chuỗi ngày, lượt đóng băng chuỗi, XP, huy hiệu, linh vật.
- **Nên thêm:**
  - bảng xếp hạng theo tuần giữa bạn bè;
  - thử thách 30 ngày;
  - thông báo đẩy "thời điểm vàng" trên điện thoại (qua PWA).
- **Lộ trình theo mục tiêu:** người học nhập "band 6.5 trong 3 tháng", app chia việc theo từng tuần và tự điều chỉnh khi kết quả thi thử thay đổi.
- **Speaking có chấm phát âm từng âm** như ELSA. Cách làm miễn phí khả thi: so khớp âm vị với IPA (các thư viện mã nguồn mở chạy trong trình duyệt), làm sau.

### D. TOEIC: phần còn thiếu
- Part 1 (mô tả tranh: cần ảnh minh họa giấy phép mở).
- Thêm 4 đề.
- Từ vựng theo ngành: kế toán, khách sạn, logistics.
- TOEIC Speaking & Writing: làm sau, ít người thi hơn.

### E. IELTS: phần còn thiếu
- Listening dạng bản đồ hoặc sơ đồ (map labelling).
- Reading dạng "matching sentence endings" và "flow-chart".
- Bộ câu hỏi Speaking theo quý (viết mới theo chủ đề xu hướng).
- Ngân hàng ý tưởng cho Task 2 (idea bank) theo chủ đề.

## Nguyên tắc giữ "100% miễn phí" khi có hàng triệu người dùng
- Mọi xử lý (tra từ, chấm điểm cơ bản, FSRS, AI trên máy) chạy ở trình duyệt. Máy chủ chỉ phục vụ file tĩnh qua CDN.
- **Đồng bộ đám mây** là phần duy nhất tốn tài nguyên. Hiện đã giảm còn tối đa 1 lần ghi mỗi 3 phút, chỉ gửi phần thay đổi và dọn dữ liệu cũ. Khi lượng người dùng lớn, nên chuyển sang Cloudflare (D1/R2) hoặc giữ đồng bộ cho gói Pro.
- **AI không dùng khóa chung của hệ thống:** dùng AI trên máy hoặc khóa của người dùng, nên không phát sinh chi phí AI.
