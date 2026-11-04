# Kiểm toán nâng cấp – Lexkite so với Duolingo · Anki · Elsa · Speak (01/11/2026)

> TL;DR: Danh sách ưu tiên cho chủ duyệt (CHƯA triển khai gì). Chỉ công nghệ miễn phí, hiện hành, hợp luật: AI trên máy, một nơi chứa mô hình miễn phí, một giọng Kokoro, thiết kế chỉ qua Stitch. Số đo làm mới mỗi thứ Hai bởi `upgrade-audit.yml`.
> Đọc khi: chọn việc nâng chất lượng tiếp theo; duyệt trước khi mở tính năng mới.

**Số đo hiện tại (Lighthouse, tự cập nhật):**
<!-- measured:start -->
Điện thoại, 10 trang (trung vị): hiệu năng 99 · trợ năng 100 · SEO 100 · LCP 1.9 s. Yếu nhất: hiệu năng `app/` 0; trợ năng `home` 100.
<!-- measured:end -->

## UX
Họ hơn ta: Duolingo – vòng lặp 1 chạm/ngày + phản hồi tức thì sau từng câu; Speak – hội thoại nói liên tục không menu. Ta đã có gia sư hằng ngày (spec tutor-daily), Stitch-first.
1. **P1** Màn "Buổi học hôm nay" là cửa chính duy nhất mở app (bỏ lối vào song song) – thuần giao diện, $0.
2. **P2** View Transitions API (CSS, Chrome 111+/Safari 18) cho chuyển câu/màn: cảm giác app, 0 thư viện.
3. **P3** Haptics (`navigator.vibrate`/Capacitor) đúng/sai trên di động.

## Hiệu năng
Họ hơn ta: app native khởi động < 1 s ở máy yếu. Ta: trang tĩnh gần tuyệt đối; điểm yếu là `app/` (CLS desktop, SEO 92).
1. **P1** Sửa CLS `desktop:app/` (đặt kích thước chỗ trống trước khi dữ liệu về) và SEO 92 của `app/` (meta/robots) – kiểm bằng `lighthouse.yml`.
2. **P2** Speculation Rules API (prefetch/prerender theo cấu hình) cho lối đi bài kế tiếp: Chrome 121+, 0 JS thêm.
3. **P3** Tách thêm lô dữ liệu lười; giữ khung ≤ 377 KB gz.

## Trợ năng
Họ hơn ta: Duolingo có chế độ giảm chuyển động + nhãn đọc màn hình đủ. Ta: Lighthouse a11y ≈ 100, axe CI xanh.
1. **P1** Tôn trọng `prefers-reduced-motion` ở mọi animation game (quét tự động bằng `scripts/test/a11y.js`, thêm luật).
2. **P2** `prefers-contrast: more` + cỡ chữ theo người dùng (rem) – kiểm với cổng contrast có sẵn.
3. **P3** Phụ đề cho mọi clip giáo viên (bật mặc định, kiểm bằng cổng video có sẵn).

## Nội dung
Họ hơn ta: Elsa – chấm phát âm theo từng âm vị + lỗi người Việt đặc thù; Anki – bộ thẻ cộng đồng khổng lồ. Ta: 20k từ, FSRS-5, GOP âm vị (pron-gop).
1. **P1** Đóng vòng "lỗi phát âm → bài sửa" cho người Việt (cặp âm khó) dùng dữ liệu `pron-pairs` đã có.
2. **P2** Nhập/xuất `.apkg` hai chiều đầy đủ (đã có `anki.js`): đo tỉ lệ nhập thành công trên bộ mẫu công khai.
3. **P3** Tăng mật độ câu ví dụ cho từ cấp B2+ (cổng Content QA giữ ≥ chuẩn hiện tại).

## AI
Họ hơn ta: Speak/Elsa dùng LLM đám mây đắt cho hội thoại. Ta: $0 bằng AI trên máy, một giọng Kokoro.
1. **P1** Chrome built-in AI (`LanguageModel`/Prompt API + `Translator`, Gemini Nano) cho sửa câu & giải thích – có sẵn `AILocal`; mở rộng nơi gọi, vẫn rơi về dữ liệu soạn sẵn khi không có.
2. **P2** WebGPU + Transformers.js (mô hình mã nguồn mở nhỏ, tải lười từ MỘT nơi chứa miễn phí, không trong bundle) cho máy không có Gemini Nano; phân tầng theo cấu hình máy.
3. **P3** Kokoro (ONNX/WebGPU) chạy trên máy cho lời gia sư dài – giữ DUY NHẤT giọng Kokoro, không thêm giọng/engine khác.

## Không làm (ngoài luật)
Giọng/LLM trả phí (ElevenLabs, API đám mây tính tiền), tinh chỉnh mô hình trên máy, thiết kế ngoài Stitch, ảnh nhân vật 3D.
