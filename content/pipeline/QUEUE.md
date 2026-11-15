# Hàng đợi nội dung (tự sinh – `npm run content:queue`, 2026-11-02)

Quy trình & tiêu chí nghiệm thu: `docs/CONTENT-PIPELINE.md`. Lấy lô ĐẦU TIÊN chưa có người nhận.

| # | Loại | Có / chỉ tiêu | % | Lô tiếp theo | Trọng tâm | File | Chi tiết hiện có |
|---|---|---|---|---|---|---|---|
| 1 | Ngữ pháp – bài A1 | 3 / 15 bài | 20% | 3 bài | cấp chưa có bài nào: be, hiện tại đơn, có/không, câu hỏi wh-, số nhiều, a/an/the, giới từ thời gian & nơi chốn – mỗi bài gom 2–4 điểm cùng mảng (điểm chờ: content/framework/grammar-inventory.json – kiểm grammar-map-check) | `web/js/grammar/*.js` |  |
| 2 | Ngữ pháp – bài C2 | 0 / 10 bài | 0% | 3 bài | cấp chưa có bài nào: đảo ngữ đầy đủ, điều kiện ngầm, giả định trang trọng, end-weight, ngữ pháp thể loại… (điểm chờ: content/framework/grammar-inventory.json – kiểm grammar-map-check) | `web/js/grammar/*.js` |  |
| 3 | Ngữ pháp – bài C1 | 6 / 15 bài | 40% | 3 bài | nâng C1 từ 6 lên 15 bài: bị động nâng cao, động từ tường thuật thể hiện quan điểm, mệnh đề quan hệ với lượng từ, nhượng bộ nâng cao… (điểm chờ: content/framework/grammar-inventory.json – kiểm grammar-map-check) | `web/js/grammar/*.js` |  |
| 4 | IELTS Writing Task 2 | 80 / 100 đề | 80% | 10 đề | mỗi đề: bài mẫu band 8 + bài band 6 kèm nhận xét theo 4 tiêu chí, dàn ý, từ vựng chủ đề; phủ đủ dạng opinion/discussion/advantages/problem-solution/two-part | `web/js/write/models*.js` |  |
| 5 | Ngữ pháp – trắc nghiệm | 1056 / 1200 câu | 88% | 60 câu | thêm ~9 chủ đề C1 lý thuyết (hiện 6) + C1 ≥ 200 câu | `web/js/grammar/*.js` | A2: 168, B1: 360, B2: 324, C1: 168, A1: 36 |
| 6 | Bài đọc ngắn | 285 / 300 bài | 95% | 15 bài | — | `web/cpack/readings/more.js` | B1: 75, B2: 75, C1: 70, A2: 65 |
| 7 | Từ vựng (mục) | 9588 / 10000 mục | 96% | 100 mục | C2 ≥ 500 (hiện 213) + 193 thiếu phiên âm | `web/js/lib/*.js` | B2: 2948, C1: 2459, B1: 2052, A2: 1103, A1: 827, C2: 199 |
| 8 | Ngữ pháp – tự luận | 980 / 1000 câu | 98% | 20 câu | mọi chủ đề đã có ≥ 10 câu; nâng chủ đề còn 10 câu lên ≥ 20 (ưu tiên C1/IELTS) | `web/js/grammar/*.js` | A2: 140, B1: 300, B2: 350, C1: 130, A1: 60 |
| 9 | Ngữ pháp – bài A2 | 14 / 18 bài | 78% | 3 bài | điểm A2 hiện chỉ dạy ở bài B1 (quá khứ tiếp diễn bối cảnh, hiện tại hoàn thành trải nghiệm, will/going to…) – bài A2 nhẹ hơn (điểm chờ: content/framework/grammar-inventory.json – kiểm grammar-map-check) | `web/js/grammar/*.js` |  |
| 10 | IELTS Listening | 400 / 480 câu | 83% | 40 câu | — | `web/js/listen/test*.js` | Part 1: 100, Part 2: 100, Part 3: 100, Part 4: 100 |
| 11 | IELTS Reading AC | 400 / 480 câu | 83% | 40 câu | — | `web/js/readtest/test*.js` | Passage 1: 130, Passage 2: 130, Passage 3: 140 |
| 12 | TOEFL Reading | 240 / 280 câu | 86% | 40 câu | — | `web/cpack/toefl/data*.js` | Complete the Words: 100, daily: 40, academic: 100 |
| 13 | TOEIC Listening | 700 / 800 câu | 88% | 50 câu | Part 1 (ảnh) ≥ 60 | `web/js/toeic/listening*.js` | Part 1: 42, Part 2: 175, Part 3: 273, Part 4: 210 |
| 14 | TOEIC Reading | 700 / 800 câu | 88% | 50 câu | — | `web/js/toeic/reading*.js` | Part 5: 210, Part 6: 112, Part 7: 378 |
| 15 | Ngữ pháp – bài B1 | 30 / 33 bài | 91% | 3 bài | bổ sung điểm B1 chưa có bài riêng (be able to, unless/in case, câu hỏi gián tiếp…) (điểm chờ: content/framework/grammar-inventory.json – kiểm grammar-map-check) | `web/js/grammar/*.js` |  |
| 16 | Ngữ pháp – bài B2 | 27 / 29 bài | 93% | 2 bài | bổ sung điểm B2 chưa có bài riêng (điểm chờ: content/framework/grammar-inventory.json – kiểm grammar-map-check) | `web/js/grammar/*.js` |  |
| 17 | IELTS Writing Task 1 Academic | 38 / 40 đề | 95% | 2 đề | đủ 6 dạng: line, bar, pie, table, process, map; dữ liệu biểu đồ tự tạo (SVG), bài mẫu band 8 + overview | `web/js/task1.js` |  |

Đã đạt chỉ tiêu: IELTS Reading GT, TOEFL Writing, TOEFL Speaking, TOEFL Listening, TOEIC Speaking & Writing
