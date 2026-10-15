# Hướng dẫn viết bài blog Lexkite (cho người & AI viết)

Đọc trước: docs/SEO-PLAN.md §4 (quy trình), §5 (định dạng), §7 (sự thật đã xác minh); content/blog/briefs.json (brief); content/blog/shots.json (ảnh app thật + mô tả màn hình).

## Bắt buộc
- File `content/blog/vi/<slug>.md`, front matter đúng §5. `publishAt:` để TRỐNG (bộ xếp lịch điền). `status: ready`, `factChecked: 2026-10-15`, `author: Lexkite`, `lang: vi`, `translationKey` = slug, `cover` = ảnh đầu tiên của brief, `coverAlt` mô tả đúng màn hình.
- Tiêu đề 30–65 ký tự, chứa từ khóa chính (có thể viết hoa chữ đầu/tên riêng); mô tả 110–160 ký tự, có từ khóa, hấp dẫn để bấm.
- Thân bài ≥ 1.200 từ (đếm theo khoảng trắng; nhắm 1.400–1.800), không có H1, ≥ 4 H2, không nhảy cấp tiêu đề; từ khóa chính xuất hiện trong 120 từ đầu và trong ≥ 1 H2.
- 2–3 ảnh `![alt cụ thể ≥ 10 ký tự](media:<id> "chú thích")` lấy id trong shots.json; alt/chú thích phải đúng với mô tả `desc` của ảnh, không bịa chi tiết không có trên màn hình.
- ≥ 2 liên kết vào app dạng `[chữ](/#/route)` (route trong brief/shots), ≥ 1 liên kết tới bài khác `/blog/<slug>/` (slug có trong briefs.json, chọn bài liên quan thật), có thể thêm trang tĩnh `/samples/`, `/speaking/`, `/tu-vung/`, `/ngu-phap/`, `/viet-thu/`.
- Đúng 1 hộp `{{cta: /#/route | Lời mời hành động}}` và đúng 1 slot video tùy chọn `{{youtube: | Gợi ý video: …}}` (để trống ID – KHÔNG bịa ID).
- Phần `## Câu hỏi thường gặp` với 3–4 câu `### …?`, mỗi câu 1 đoạn trả lời (câu hỏi người học thật sự tìm).
- Chính tả kiểu bỏ dấu mới: hóa, khỏe, thủy, quý, tòa, họa (KHÔNG hoá, khoẻ, thuỷ, quí, toà, hoạ). Không lỗi gõ, không trộn tiếng Anh khi đã có từ Việt tự nhiên; thuật ngữ thi giữ tiếng Anh (Task 2, band, collocation…).

## Chất lượng
- Văn phong: người thầy giỏi nói chuyện với người học Việt – rõ, ấm, cụ thể; câu ngắn; ví dụ thật; bảng khi so sánh; danh sách khi có bước.
- 100% tự viết. Ví dụ tiếng Anh tự đặt, đúng ngữ pháp, tự nhiên. Không chép/nhại câu của sách, đề thi thật, website khác.
- Chính xác: chỉ dùng sự thật trong §7 hoặc kiến thức phổ thông chắc chắn; không bịa nghiên cứu, số liệu, trích dẫn, tên người; không hứa điểm số; không nói Lexkite “chính thức” hay liên kết với IELTS/ETS. Tính năng Lexkite chỉ mô tả những gì có trong shots.json/README.
- Mỗi bài có phần “Làm ngay trong Lexkite” (H2) hướng dẫn từng bước bằng tính năng thật, nhưng không biến bài thành quảng cáo: ≥ 70% nội dung là kiến thức hữu ích độc lập.
- Không lặp đoạn/câu giữa các bài (có máy kiểm trùng 8 từ liên tiếp). Mở bài khác nhau, tránh khuôn “Trong bài viết này…”.
