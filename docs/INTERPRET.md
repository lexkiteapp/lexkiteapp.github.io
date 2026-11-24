# Phiên dịch (#/interpret) – hai người, hai ngôn ngữ, miễn phí

> TL;DR: Màn chia đôi (nửa trên xoay 180°), mỗi bên một micro; nói → dịch trên máy → hiện ở nửa đối diện + đọc thành tiếng. Lớp học: lưu Sổ từ, nghe chậm, nói lại chấm điểm, tóm tắt từ mới. 100 % miễn phí, tải lười, không vào khung app.
> Đọc khi: sửa Phiên dịch web, làm bản iOS/Android cùng tính năng, thêm câu mẫu.

## Vị trí & tải
- Route `#/interpret[/phrases[/<nhóm>]|/history|/recap/<id>]`; thẻ ở Kỹ năng (hubs.js) và danh sách Nói. KHÔNG vào thanh tab chính.
- Gói lười `interpret` (js/bundles.js): `js/i18n/en/interpret.js` + `cpack/interpret/{core,interpret}.js` (+ `css/interpret.css` qua BCSS). Câu mẫu `cpack/interpret/phrases.js` chỉ tải khi mở "Câu mẫu" (22 câu × 15 ngôn ngữ, người soạn, không dịch máy).
- Lõi thuần `core.js` (ngôn ngữ ↔ mã giọng, chọn bên nói theo ngôn ngữ dò, lịch sử localStorage `lk.interp.v1` ≤ 30 cuộc × 200 lượt, thẻ ôn, từ khóa). Test: `scripts/test/interpret.mjs` (lõi + 15 ngôn ngữ + nối dây), `interpret-ui.mjs` (jsdom, luồng đầy đủ).

## Chuỗi xử lý (đều miễn phí, trên máy trước)
| Bước | Web | iOS | Android |
|---|---|---|---|
| Nhận giọng | `UI.speechSession` (Web Speech) | Speech framework | SpeechRecognizer |
| Dò ngôn ngữ | `AILocal.detect` (LanguageDetector) | NLLanguageRecognizer | ML Kit Language ID |
| Dịch | `AILocal.translate` (Translator/ML Kit/Apple Translation) → `Dict.translateTo` (có chuỗi dự phòng) | Translation framework | ML Kit Translation |
| Đọc | `UI.tts` (Kokoro tiếng Anh, giọng hệ thống còn lại) | AVSpeech | TextToSpeech |
Offline: nút "Tải gói dùng offline" gọi `AILocal.download('translate', {from,to})` (chỉ khi người dùng bấm, nhắc Wi-Fi). Huy hiệu "Trên máy" / "Trực tuyến" cho biết nguồn dịch.

## Lớp học (vượt ông lớn)
Mỗi bản dịch: nghe lại · nghe chậm (0,55×) · lưu Sổ từ (cụm ngoại ngữ + nghĩa tiếng mẹ đẻ, topic `interpret`) · nói lại → `UI.recognize` chấm 0–100. Kết thúc → "Từ mới sau cuộc hội thoại": câu đáng nhớ + từ khóa, lưu hàng loạt.

## Quy tắc
Không API trả phí; không gửi lịch sử đi đâu; chuỗi giao diện theo I18N-PIPELINE (en nguồn ở `i18n/en/interpret.js`, 13 ngôn ngữ do bot dịch); RTL theo `dir` từng nửa; chữ ngoài đọc qua `esc()`.
Thiết kế: Stitch project 7268539912208977707, design system "Lexkite" (sáng/tối). Màn Phiên dịch tạo bằng Stitch bị quá giờ 23/11 (2 lần, không ra màn) → bản đầu dựng bằng token Tactile có sẵn; khi Stitch trả màn thì đối chiếu (docs/STITCH-WEB.md).
