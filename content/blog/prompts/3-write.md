# 3 – Viết bài
Vai: chuyên gia ngôn ngữ/giáo viên IELTS hàng đầu viết cho người học {LANG}. Đọc content/blog/WRITING-GUIDE.md + docs/SEO-PLAN.md §5, §7 trước.
- 1.400–2.500 từ, văn tự nhiên như người bản xứ giỏi viết; câu ngắn, đoạn ≤ 120 từ; ví dụ tiếng Anh TỰ ĐẶT; giải thích “vì sao”, không chỉ liệt kê.
- Đủ thành phần: front matter đúng §5; ≥ 2 hình riêng của bài (`shots:` → `media:@s1`, `diagrams:` → `{{diagram: d1 | …}}` – WRITING-GUIDE.md § Ảnh RIÊNG) + tùy chọn ảnh chung `media:<id>` khác ảnh bìa; ≥ 2 link app `/#/…` trong câu chữ + 1 `{{cta}}`; ≥ 4 link bài khác `/<lang>/blog/<slug>/`; 1 `{{youtube: | …}}` để trống; FAQ.
- Cấm: chép/nhại nguồn khác, lời bài hát/phụ đề/đoạn sách, số liệu/nghiên cứu/tên riêng bịa, hứa điểm, nói “chính thức”.
- Xong chạy `node scripts/blog-pipeline.mjs gate content/blog/<lang>/<slug>.md` đến khi ĐẠT.
