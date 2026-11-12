# Mẫu lệnh quy trình viết blog Lexkite (dùng cho AI hoặc người viết)
Chạy theo thứ tự; mỗi bước có đầu ra rõ ràng. Lệnh máy: `node scripts/blog-pipeline.mjs …` (xem đầu file).

| # | Bước | Mẫu | Đầu ra | Cổng |
|---|---|---|---|---|
| 1 | Nghiên cứu từ khóa & ý định | 1-brief.md | 1 mục trong `briefs.json` | không trùng từ khóa chính |
| 2 | Dàn ý theo SERP | 2-outline.md | H2/H3 trong file nháp (`pipeline new`) | trả lời đủ câu hỏi top 10 |
| 3 | Viết | 3-write.md | bài hoàn chỉnh | `pipeline gate` |
| 4 | Kiểm chứng | 4-factcheck.md | `factChecked: YYYY-MM-DD` | mọi số liệu có nguồn chính thức |
| 5 | Bản địa hóa (ngôn ngữ mới) | 5-localize.md | `content/blog/<lang>/<slug>.md` | như bước 3–4 + 6 |
| 6 | Chấm chất lượng | 6-review.md | `qualityScore: NN` (≥ 90) | blog-check chặn < 85 |
| 7 | Xếp lịch | – | `publishAt` | `pipeline queue` (gate toàn bộ trước) |

Ảnh: dùng chung ảnh chụp app giao diện TIẾNG ANH (`shots.json` → `media.json`), chỉ viết alt/chú thích theo ngôn ngữ bài. Ảnh mới: thêm id vào shots.json → `node scripts/blog-shots.mjs <id>` → `node scripts/blog-media.mjs --push`.
