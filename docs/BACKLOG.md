# Việc tồn đọng (cập nhật mỗi vòng – xong thì chuyển xuống "Đã xong")

Thứ tự = ưu tiên. Quy trình làm theo [PLAYBOOK.md](PLAYBOOK.md), chuẩn công nghệ theo [TECH-RADAR.md](TECH-RADAR.md).

## Đang làm / làm tiếp
Đã xong thêm 15/10 tối: gói bảo mật (rate-limit biên, headers A+), gia cố kiến trúc (32 nhóm đồng bộ, persist, đệm từ điển IndexedDB, pull 2 bước, onCleanup), SEO blog (liên kết nội bộ + bản quyền), tinh chỉnh add-on (loa + chấm FSRS, ô tra, bóng đổ, cuộn), ảnh minh họa qua proxy /api/img, nghĩa theo từ loại.
00000. ✓ **Ngữ pháp thi cử** (2.6.214–215) – (1) tab lọc Tất cả · Trọng tâm IELTS 7.0+ (15 bài) · TOEIC Part 5&6 (12 bài) kèm tiến độ nhóm; (2) "✍️ Thử thách tự đặt câu" trong mỗi bài – kiểm tra bằng regex structures.js, đúng → tô xanh +15 XP + lưu câu; (3) add-on: bôi đen câu nhận diện cấu trúc → nút "📖 Học bài: …" mở #/grammar/<id>.
0000. ✓ **Đợt toàn cầu** (chia sẻ bộ thẻ, gạch chân học thuật, phím tắt YouTube A/S/D). Ghi chú gốc: (1) Chia sẻ bộ thẻ qua link nén (#/deck?share=…) + xem trước + "Thêm vào lộ trình FSRS"; (2) add-on gạch chân từ học thuật B2–C2 (AWL/NAWL/CEFR) trên mọi trang, bật mặc định, tắt được; (3) phím tắt phụ đề YouTube A (câu trước) / D (câu sau) / S (lặp câu) / Space.
0001. ✓ **Quy mô hàng triệu người/ngày**: lấy mẫu thống kê (`hit_rate` trong Cài đặt quản trị), ghi phiên tối đa 1 lần/60 s, đệm cấu hình 1 giờ ở client, đệm ảnh Openverse 30 ngày ở biên Cloudflare, hoàn tất tài liệu kế hoạch mở rộng Workers [`docs/SCALING-PLAN.md`](SCALING-PLAN.md) khi > 100k người/ngày.
000. **Đợt hiện đại** ✓ (2.6.204–206: vuốt thẻ, 3 vòng mục tiêu, rảnh tay trong Ôn tập, Tab mới add-on) – (1) nút 🎧 Rảnh tay trong #/review + khoảng lặng 2,5 s tự nhớ + giao diện tối (đã có lõi #/handsfree); (2) vuốt thẻ kiểu Tinder (phải = Nhớ, trái = Quên, lên = nghe lại, translate3d 60fps); (3) 3 vòng tròn mục tiêu ở trang chủ (ôn FSRS · từ mới · nói/shadowing), đủ 3 → pháo hoa + 50 XP; (4) add-on Tab mới: thẻ "thời điểm vàng" + Đã nhớ / Cần ôn + ô tìm kiếm chrome.search, tắt được (tắt → về trang tab mặc định).
00. **Học rảnh tay khi tắt màn hình** ✓ (2.6.202) – còn: theo dõi pipeline Kokoro 14.261 đoạn (1.500/đêm); kiểm tra trên Android thật, nếu WebView dừng âm thanh khi tắt màn hình → thêm plugin trình phát gốc (foreground service media).
0. ✓ **Gói người đi làm** (công sở, cứu chuỗi, thì thầm 2.6.203, phản xạ 60 giây 2.6.216–217). Ghi chú gốc: (c) Thì thầm: tăng gain 1,5–2× cho đường Whisper trên máy, nới ngưỡng chấm cho Web Speech; (d) Phản xạ 60 giây: clip YouTube 3–5 s (đoạn đã lưu có t=) + câu audio của mình → nhại lại → tô xanh/đỏ từng từ trên máy.
1. **Gói nghĩa 13 ngôn ngữ** ✓ (6.880 từ/ngôn ngữ) · **kho từ NAWL/BSL** đang sinh (Wiktionary dự phòng vì dictionaryapi.dev lỗi 522): sinh bằng curl shim trên máy (Google gtx chặn GitHub runner) → commit; CI chạy tiếp phần tinh chỉnh. Thêm nguồn dịch dự phòng Workers AI m2m100 cho CI.
2. ~~Chrome Translator API~~ ✓ (dịch trên máy khi gói ngôn ngữ đã có).
3. ✓ (2.6.220) **Nghe chép chính tả 3 mức** (dễ/khó/cả câu) + phím tắt + tab transcript có bản dịch theo ngôn ngữ người học; dùng chung cho Listening/TOEIC/TOEFL.
4. ✓ (2.6.223) **Lời giải 3 phần** cho đề (trích đoạn · từ khóa ↔ paraphrase · giải thích) + tô đoạn trong bài khi bấm.
5. ✓ (2.6.225) **Lớp Khóa học**: Khóa → Chương → Bài → Hoạt động; % tiến độ, "Tiếp tục bài học", tự đánh dấu hoàn thành khi đạt; dựa trên chương trình tự biên soạn (tham khảo cấu trúc `docs/research/study4-syllabi.md`).
6. ✓ (đã có: học, trắc nghiệm, ghép thẻ, điền từ, nghe chép, kiểm tra) **Gói 6 trò từ vựng** cho mọi bộ từ (chọn nghĩa, ghép cặp, nghe chọn, gõ từ, nghe chép, thẻ).
7. ✓ (đã có: kế hoạch hôm nay, mục tiêu + đếm ngược, tuần, 3 vòng mục tiêu) **Kế hoạch học**: checklist mỗi ngày + tuần + đếm ngược ngày thi theo band mục tiêu.
8. ✓ (đã có trong Speaking + Phản xạ 60 giây) **Nói đuổi (shadowing)** từng câu có chấm phát âm AI.
9. ✓ (2.6.229) **Luyện paraphrase** (bài đọc/transcript ↔ câu hỏi, tô màu cặp).
10. ✓ (TOEIC đủ 200 câu/đề: L 6/25/39/30, R 30/16/54; Part 1 mô tả tranh 7 đề × 6 câu, ảnh CC0; lời giải dịch sẵn 14 ngôn ngữ; IELTS L/R đúng 40 câu/đề; TOEIC P5/P6 đúng 30/16, P7 có đủ bài đơn/kép/ba văn bản (29 câu), đề rút gọn có cột số câu đề thật; TOEFL đủ 11 dạng bài format 2026; lời giải dịch sẵn: scripts/gen-explain.mjs → web/i18n/explain/<lang>.json, en chạy tay, 13 ngôn ngữ trong i18n.yml) **Rà đề thi so với đặc tả chính thức** (số câu, thời gian, dạng bài) IELTS/TOEIC/TOEFL; dịch sẵn lời giải 13 ngôn ngữ.
11. ✓ **Add-on (Gói 3 còn lại)**: popup thanh công cụ – 🔊 + chấm FSRS trong danh sách gần đây, "Ôn nhanh 3 thẻ", mã QR SVG chuẩn ISO 18004 mở app, tự đồng bộ nền `scheduleBgSync` khi lưu thẻ/ôn tập.
12. ✓ (phát lại YouTube trong ôn tập; thiết lập #/welcome/setup đã có kỳ thi + mục tiêu + cường độ phút/ngày + chủ đề) **Gói 1/2 còn lại**: thiết lập 2 bước (mục tiêu + thời gian/ngày); nút phát lại đoạn YouTube trong ôn tập (thẻ có `t=`).
13. ✓ **Tốc độ**: LCP < 1 s (in-place hydration cho khung dựng sẵn `#lkHero`, không hủy/vẽ lại `h1`; LCP giữ nguyên 0,66 s); Speculation Rules (tải trước blog ngầm lúc rảnh); `content-visibility: auto` cho `.w-feats` và `.w-foot`.
14. ✓ **Bảo mật & Trợ năng**: **Turnstile** cho form liên hệ (hỗ trợ xác thực phía server và fallback); **axe-core** kiểm thử tự động 20 màn hình đạt 0 vi phạm nghiêm trọng; nâng độ tương phản WCAG AAA (`--muted: #4e526b`, `--accent: #0D6964`).
15. **Rà dịch câu dài bằng AI** (đã duyệt) cho 13 ngôn ngữ; xem ảnh chụp giao diện tự động (nhánh `screens`).
16. ✓ workflow ios.yml (build simulator không ký, tải App.app) – còn ký & TestFlight khi có Apple Developer. **iOS**: workflow build trên máy macOS của GitHub (simulator) – khi có Apple Developer thì ký & phát hành.
17. **Kiến trúc** (PLAN §12): tách app.js/study.js theo module, mở rộng kiểm tra kiểu.

## Chờ anh (không tự làm được)
- Apple Developer: xin D-U-N-S cho MODIAN LUXURY JEWELRY LLC → đăng ký Organization (99 USD/năm).
- AdMob/PingPong: hỏi PingPong có nhận nguồn tiền Google AdMob & Apple không.
- (Tùy chọn) Gửi email từ support@lexkite.com: cần dịch vụ SMTP miễn phí (vd. Zoho Mail).
- (Tùy chọn) Biến bí mật `GEMINI_KEY` trên Cloudflare Pages để chấm AI tốt hơn.

## Đã xong hôm nay (15/10/2026)
Email tên miền + form liên hệ · trang quản trị (người dùng, hộp thư, thống kê, cảnh báo, dịch vụ & API, cài đặt) · email cảnh báo 8h · chính sách/điều khoản 15 ngôn ngữ (thông tin công ty) · header trang chào mừng · ngôn ngữ theo quốc gia + nút 🌐 · /blog theo ngôn ngữ · giọng đọc thống nhất · popup tra từ màu thương hiệu · bài mẫu: khung nghĩa, nhãn đoạn dịch tay, gợi ý theo ngôn ngữ người học, ✓ chế độ + chế độ tiếp theo · đề: thống kê theo dạng câu hỏi + làm lại câu sai · hết lẫn tiếng 14 ngôn ngữ + công cụ rà tự động · 2.809 định nghĩa NGSL · khảo sát Study4 · PLAYBOOK + TECH-RADAR.
