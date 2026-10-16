# Hàng đợi nội dung (tự sinh – `npm run content:queue`, 2026-10-16)

Quy trình & tiêu chí nghiệm thu: `docs/CONTENT-PIPELINE.md`. Lấy lô ĐẦU TIÊN chưa có người nhận.

| # | Loại | Có / chỉ tiêu | % | Lô tiếp theo | Trọng tâm | File | Chi tiết hiện có |
|---|---|---|---|---|---|---|---|
| 1 | IELTS Reading GT | 120 / 200 câu | 60% | 40 câu | — | `web/js/readtest/gt*.js` | Passage 1: 42, Passage 2: 39, Passage 3: 39 |
| 2 | TOEFL Writing | 76 / 100 đề | 76% | 20 đề | — | `web/js/toefl/data*.js` | sentence: 48, email: 14, discussion: 14 |
| 3 | TOEFL Speaking | 118 / 150 câu | 79% | 30 câu | — | `web/js/toefl/data*.js` | repeat: 74, interview: 44 |
| 4 | Ngữ pháp – tự luận | 800 / 1000 câu | 80% | 60 câu | 31 chủ đề CHƯA có bài tự luận: participle-clauses, subjunctive, hedging, nominalisation, paraphrase-ielts, alternatives-to-if, reported-advanced… (≥ 10 câu/chủ đề) | `web/js/grammar/*.js` | A2: 140, B1: 300, B2: 270, C1: 90 |
| 5 | TOEIC Speaking & Writing | 0 / 60 đề | 0% | 20 đề | 11 dạng Speaking + 8 dạng Writing theo cấu trúc ETS công khai; bài mẫu + tiêu chí chấm | `web/js/toeic/sw*.js (mới – cần UI)` |  |
| 6 | TOEFL Listening | 128 / 200 câu | 64% | 32 câu | — | `web/js/toefl/data*.js` | response: 32, conversation: 32, announcement: 24, talk: 40 |
| 7 | Bài đọc ngắn | 210 / 300 bài | 70% | 15 bài | — | `web/js/readings-more.js` | B1: 55, B2: 60, C1: 50, A2: 45 |
| 8 | Ngữ pháp – trắc nghiệm | 960 / 1200 câu | 80% | 60 câu | thêm ~9 chủ đề C1 lý thuyết (hiện 6) + C1 ≥ 200 câu | `web/js/grammar/*.js` | A2: 168, B1: 360, B2: 324, C1: 108 |
| 9 | Từ vựng (mục) | 9488 / 10000 mục | 95% | 100 mục | C2 ≥ 500 (hiện 213) + 193 thiếu phiên âm | `web/js/lib/*.js` | B2: 2814, C1: 2045, B1: 2822, A2: 972, C2: 213, A1: 622 |
| 10 | TOEFL Reading | 200 / 280 câu | 71% | 40 câu | — | `web/js/toefl/data*.js` | Complete the Words: 80, daily: 40, academic: 80 |
| 11 | IELTS Listening | 400 / 480 câu | 83% | 40 câu | — | `web/js/listen/test*.js` | Part 1: 100, Part 2: 100, Part 3: 100, Part 4: 100 |
| 12 | IELTS Reading AC | 400 / 480 câu | 83% | 40 câu | — | `web/js/readtest/test*.js` | Passage 1: 130, Passage 2: 130, Passage 3: 140 |
| 13 | TOEIC Listening | 700 / 800 câu | 88% | 50 câu | Part 1 (ảnh) ≥ 60 | `web/js/toeic/listening*.js` | Part 1: 42, Part 2: 175, Part 3: 273, Part 4: 210 |
| 14 | TOEIC Reading | 700 / 800 câu | 88% | 50 câu | — | `web/js/toeic/reading*.js` | Part 5: 210, Part 6: 112, Part 7: 378 |


