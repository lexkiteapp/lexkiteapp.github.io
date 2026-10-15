# Việc tồn đọng (cập nhật mỗi vòng – xong thì chuyển xuống "Đã xong")

Thứ tự = ưu tiên. Quy trình làm theo [PLAYBOOK.md](PLAYBOOK.md), chuẩn công nghệ theo [TECH-RADAR.md](TECH-RADAR.md).

## Đang làm / làm tiếp
0. **Gói người đi làm (yêu cầu 15/10)**: (a) Bộ "Tiếng Anh Công sở & Sự nghiệp" tự biên soạn – Email & Slack, Họp & Đàm phán, Phỏng vấn, IT & văn phòng (thư viện + Sổ cụm từ); (b) Cứu chuỗi: hộp thoại Kit khi đứt 1 ngày → xem quảng cáo thưởng (khi AdMob bật) hoặc khiên miễn phí 1 lần/tháng; (c) Thì thầm: tăng gain 1,5–2× cho đường Whisper trên máy, nới ngưỡng chấm cho Web Speech; (d) Phản xạ 60 giây: clip YouTube 3–5 s (đoạn đã lưu có t=) + câu audio của mình → nhại lại → tô xanh/đỏ từng từ trên máy.
1. **Gói nghĩa 13 ngôn ngữ + kho từ NAWL/BSL**: sinh bằng curl shim trên máy (Google gtx chặn GitHub runner) → commit; CI chạy tiếp phần tinh chỉnh. Thêm nguồn dịch dự phòng Workers AI m2m100 cho CI.
2. **Chrome Translator API** (dịch trên máy) thay gtx ở client cho nghĩa/câu – nhanh, offline, không giới hạn.
3. **Nghe chép chính tả 3 mức** (dễ/khó/cả câu) + phím tắt + tab transcript có bản dịch theo ngôn ngữ người học; dùng chung cho Listening/TOEIC/TOEFL.
4. **Lời giải 3 phần** cho đề (trích đoạn · từ khóa ↔ paraphrase · giải thích) + tô đoạn trong bài khi bấm.
5. **Lớp Khóa học**: Khóa → Chương → Bài → Hoạt động; % tiến độ, "Tiếp tục bài học", tự đánh dấu hoàn thành khi đạt; dựa trên chương trình tự biên soạn (tham khảo cấu trúc `docs/research/study4-syllabi.md`).
6. **Gói 6 trò từ vựng** cho mọi bộ từ (chọn nghĩa, ghép cặp, nghe chọn, gõ từ, nghe chép, thẻ).
7. **Kế hoạch học**: checklist mỗi ngày + tuần + đếm ngược ngày thi theo band mục tiêu.
8. **Nói đuổi (shadowing)** từng câu có chấm phát âm AI.
9. **Luyện paraphrase** (bài đọc/transcript ↔ câu hỏi, tô màu cặp).
10. **Rà đề thi so với đặc tả chính thức** (số câu, thời gian, dạng bài) IELTS/TOEIC/TOEFL; dịch sẵn lời giải 13 ngôn ngữ.
11. **Add-on (Gói 3 còn lại)**: popup thanh công cụ – 🔊 + chấm FSRS trong danh sách gần đây, "Ôn nhanh 3 thẻ", mã QR mở app, tự đồng bộ nền khi lưu.
12. **Gói 1/2 còn lại**: thiết lập 2 bước (mục tiêu + thời gian/ngày); nút phát lại đoạn YouTube trong ôn tập (thẻ có `t=`).
13. **Tốc độ**: LCP 6,4 s → mục tiêu < 2,5 s (đọc chi tiết LCP từ báo cáo Lighthouse mới); Speculation Rules, `content-visibility`.
14. **Turnstile** cho form liên hệ; **axe-core** vào kiểm thử.
15. **Rà dịch câu dài bằng AI** (đã duyệt) cho 13 ngôn ngữ; xem ảnh chụp giao diện tự động (nhánh `screens`).
16. **iOS**: workflow build trên máy macOS của GitHub (simulator) – khi có Apple Developer thì ký & phát hành.
17. **Kiến trúc** (PLAN §12): tách app.js/study.js theo module, mở rộng kiểm tra kiểu.

## Chờ anh (không tự làm được)
- Apple Developer: xin D-U-N-S cho MODIAN LUXURY JEWELRY LLC → đăng ký Organization (99 USD/năm).
- AdMob/PingPong: hỏi PingPong có nhận nguồn tiền Google AdMob & Apple không.
- (Tùy chọn) Gửi email từ support@lexkite.com: cần dịch vụ SMTP miễn phí (vd. Zoho Mail).
- (Tùy chọn) Biến bí mật `GEMINI_KEY` trên Cloudflare Pages để chấm AI tốt hơn.

## Đã xong hôm nay (15/10/2026)
Email tên miền + form liên hệ · trang quản trị (người dùng, hộp thư, thống kê, cảnh báo, dịch vụ & API, cài đặt) · email cảnh báo 8h · chính sách/điều khoản 15 ngôn ngữ (thông tin công ty) · header trang chào mừng · ngôn ngữ theo quốc gia + nút 🌐 · /blog theo ngôn ngữ · giọng đọc thống nhất · popup tra từ màu thương hiệu · bài mẫu: khung nghĩa, nhãn đoạn dịch tay, gợi ý theo ngôn ngữ người học, ✓ chế độ + chế độ tiếp theo · đề: thống kê theo dạng câu hỏi + làm lại câu sai · hết lẫn tiếng 14 ngôn ngữ + công cụ rà tự động · 2.809 định nghĩa NGSL · khảo sát Study4 · PLAYBOOK + TECH-RADAR.
