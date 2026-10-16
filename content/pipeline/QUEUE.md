# Hàng đợi nội dung (tự sinh – `npm run content:queue`, 2026-10-16)

Quy trình & tiêu chí nghiệm thu: `docs/CONTENT-PIPELINE.md`. Lấy lô ĐẦU TIÊN chưa có người nhận.

| # | Loại | Có / chỉ tiêu | % | Lô tiếp theo | Trọng tâm | File | Chi tiết hiện có |
|---|---|---|---|---|---|---|---|
| 1 | TOEFL Writing | 56 / 100 đề | 56% | 20 đề | — | `web/js/toefl/data*.js` | sentence: 40, email: 8, discussion: 8 |
| 2 | TOEFL Speaking | 88 / 150 câu | 59% | 30 câu | — | `web/js/toefl/data*.js` | repeat: 56, interview: 32 |
| 3 | IELTS Reading GT | 120 / 200 câu | 60% | 40 câu | — | `web/js/readtest/gt*.js` | Passage 1: 42, Passage 2: 39, Passage 3: 39 |
| 4 | TOEFL Listening | 128 / 200 câu | 64% | 32 câu | — | `web/js/toefl/data*.js` | response: 32, conversation: 32, announcement: 24, talk: 40 |
| 5 | Bài đọc ngắn | 210 / 300 bài | 70% | 15 bài | — | `web/js/readings-more.js` | B1: 55, B2: 60, C1: 50, A2: 45 |
| 6 | Ngữ pháp – trắc nghiệm | 960 / 1200 câu | 80% | 60 câu | C1 ≥ 200 | `web/js/grammar/*.js` | A2: 168, B1: 360, B2: 324, C1: 108 |
| 7 | TOEFL Reading | 200 / 280 câu | 71% | 40 câu | — | `web/js/toefl/data*.js` | Complete the Words: 80, daily: 40, academic: 80 |
| 8 | Ngữ pháp – tự luận | 800 / 1000 câu | 80% | 60 câu | — | `web/js/grammar/*.js` | A2: 140, B1: 300, B2: 270, C1: 90 |
| 9 | IELTS Listening | 400 / 480 câu | 83% | 40 câu | — | `web/js/listen/test*.js` | Part 1: 100, Part 2: 100, Part 3: 100, Part 4: 100 |
| 10 | IELTS Reading AC | 400 / 480 câu | 83% | 40 câu | — | `web/js/readtest/test*.js` | Passage 1: 130, Passage 2: 130, Passage 3: 140 |
| 11 | TOEIC Listening | 700 / 800 câu | 88% | 50 câu | Part 1 (ảnh) ≥ 60 | `web/js/toeic/listening*.js` | Part 1: 42, Part 2: 175, Part 3: 273, Part 4: 210 |
| 12 | TOEIC Reading | 700 / 800 câu | 88% | 50 câu | — | `web/js/toeic/reading*.js` | Part 5: 210, Part 6: 112, Part 7: 378 |
| 13 | Từ vựng (mục) | 9488 / 10000 mục | 95% | 100 mục | C2 ≥ 500 | `web/js/lib/*.js` | B2: 2814, C1: 2045, B1: 2822, A2: 972, C2: 213, A1: 622 |


