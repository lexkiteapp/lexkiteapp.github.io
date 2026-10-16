# Hàng đợi nội dung (tự sinh – `npm run content:queue`, 2026-10-16)

Quy trình & tiêu chí nghiệm thu: `docs/CONTENT-PIPELINE.md`. Lấy lô ĐẦU TIÊN chưa có người nhận.

| # | Loại | Có / chỉ tiêu | % | Lô tiếp theo | Trọng tâm | File | Chi tiết hiện có |
|---|---|---|---|---|---|---|---|
| 1 | IELTS Writing Task 1 Academic | 8 / 40 đề | 20% | 6 đề | đủ 6 dạng: line, bar, pie, table, process, map; dữ liệu biểu đồ tự tạo (SVG), bài mẫu band 8 + overview | `web/js/task1.js` |  |
| 2 | IELTS Writing Task 2 | 24 / 100 đề | 24% | 10 đề | mỗi đề: bài mẫu band 8 + bài band 6 kèm nhận xét theo 4 tiêu chí, dàn ý, từ vựng chủ đề; phủ đủ dạng opinion/discussion/advantages/problem-solution/two-part | `web/js/write/models*.js` |  |
| 3 | TOEFL Writing | 76 / 100 đề | 76% | 20 đề | — | `web/js/toefl/data*.js` | sentence: 48, email: 14, discussion: 14 |
| 4 | IELTS Reading GT | 160 / 200 câu | 80% | 40 câu | — | `web/js/readtest/gt*.js` | Passage 1: 56, Passage 2: 52, Passage 3: 52 |
| 5 | TOEIC Speaking & Writing | 0 / 60 đề | 0% | 20 đề | 11 dạng Speaking + 8 dạng Writing theo cấu trúc ETS công khai; bài mẫu + tiêu chí chấm | `web/js/toeic/sw*.js (mới – cần UI)` |  |
| 6 | TOEFL Listening | 128 / 200 câu | 64% | 32 câu | — | `web/js/toefl/data*.js` | response: 32, conversation: 32, announcement: 24, talk: 40 |
| 7 | Bài đọc ngắn | 210 / 300 bài | 70% | 15 bài | — | `web/js/readings-more.js` | B1: 55, B2: 60, C1: 50, A2: 45 |
| 8 | Ngữ pháp – trắc nghiệm | 960 / 1200 câu | 80% | 60 câu | thêm ~9 chủ đề C1 lý thuyết (hiện 6) + C1 ≥ 200 câu | `web/js/grammar/*.js` | A2: 168, B1: 360, B2: 324, C1: 108 |
| 9 | Ngữ pháp – tự luận | 860 / 1000 câu | 86% | 60 câu | mọi chủ đề đã có ≥ 10 câu; nâng chủ đề còn 10 câu lên ≥ 20 (ưu tiên C1/IELTS) | `web/js/grammar/*.js` | A2: 140, B1: 300, B2: 290, C1: 130 |
| 10 | Từ vựng (mục) | 9488 / 10000 mục | 95% | 100 mục | C2 ≥ 500 (hiện 213) + 193 thiếu phiên âm | `web/js/lib/*.js` | B2: 2814, C1: 2045, B1: 2822, A2: 972, C2: 213, A1: 622 |
| 11 | TOEFL Reading | 200 / 280 câu | 71% | 40 câu | — | `web/js/toefl/data*.js` | Complete the Words: 80, daily: 40, academic: 80 |
| 12 | IELTS Listening | 400 / 480 câu | 83% | 40 câu | — | `web/js/listen/test*.js` | Part 1: 100, Part 2: 100, Part 3: 100, Part 4: 100 |
| 13 | IELTS Reading AC | 400 / 480 câu | 83% | 40 câu | — | `web/js/readtest/test*.js` | Passage 1: 130, Passage 2: 130, Passage 3: 140 |
| 14 | TOEIC Listening | 700 / 800 câu | 88% | 50 câu | Part 1 (ảnh) ≥ 60 | `web/js/toeic/listening*.js` | Part 1: 42, Part 2: 175, Part 3: 273, Part 4: 210 |
| 15 | TOEIC Reading | 700 / 800 câu | 88% | 50 câu | — | `web/js/toeic/reading*.js` | Part 5: 210, Part 6: 112, Part 7: 378 |

Đã đạt chỉ tiêu: TOEFL Speaking
