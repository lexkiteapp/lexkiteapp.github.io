# Cambridge English A2–C2: định dạng đề, màn thi, cổng (O2)

> TL;DR: Mỗi đề = 1 file `web/cpack/cambridge/<cấp>/t<N>.js` đẩy vào `self.CAMBRIDGE` (Reading & Writing · Listening · Speaking), tiêu chí chấm tự diễn đạt ở `web/cpack/cambridge/rubric.js`. Màn `#/cambridge` dùng lại QE/ChoiceKit/trình phát nghe/UI.recognize, không CSS riêng. Cổng: `exam-format-check` (spec `content/exams/spec/cam-*.json`) + `scripts/test/cambridge.mjs`. Mẫu chuẩn: đề gold `a2/t1.js`.
> Đọc khi: viết/soát đề Cambridge (lô S-CAM-*), sửa màn `web/js/cambridge.js` hoặc cổng đề Cambridge.

## 1. Dữ liệu một đề
`{ id: '<cấp>-t<N>', level, spec: 'cam-<cấp>', n, title, rw: { parts }, listening: { parts }, speaking: { parts } }` – số phần, số câu, dạng (`type`), `min_words` khớp đúng spec cấp đó.
- Câu khách quan: `mcq` / `mcq-picture` / `mcq-gap` (`options` ≥ 3, `a` = chỉ số), `matching` (`a` = mã A–H của `texts`/`options`), `gap` / `open-gap` (`a` = mảng đáp án chấp nhận). Mọi câu có `cue` (cụm nguyên văn có trong bài/lời thoại; ngắt bằng `…`) + `explain` tiếng Anh ngắn, đúng cấp.
- Bài đọc: `text` (chuỗi hoặc mảng đoạn; chỗ trống ghi `(19)`), `texts` cho Part nối người/đoạn. Part 1 ngắn: mỗi câu có `text` riêng (biển báo, tin nhắn).
- Nghe: mỗi phần có `units[{ speakers{ id: { name, accent, gender } }, script[{ say } | { s, t }], items }]`; giọng Anh (`en-GB`) mặc định; audio Kokoro sinh trên CI từ script (`scripts/sentence-audio/corpus.mjs`, nhóm `cambridge-listening`).
- Viết (sản sinh): `prompt`, `points` (ý bắt buộc) + `checks` (mỗi ý 1 nhóm từ khóa, để màn thi tự kiểm ý), `model` ≥ `min_words` và dùng ≥ 2 từ nối, `tips`. Picture story: `pictures[{ ic, alt }]` (ảnh thật thay `ic` khi có ảnh CF free).
- Nói (sản sinh): Part phỏng vấn `phases[{ topic, q[], extended }]`, Part thảo luận `prompt`, `options`, `partnerLines`, `follow[]`, `useful[]`; `models{ câu hỏi: câu trả lời mẫu }` (khóa phải đúng nguyên văn câu hỏi).
- Nội dung tự soạn, trung tính văn hoá, không chép đề/sách Cambridge; tiêu chí chấm chỉ diễn đạt lại ý chung.

## 2. Màn thi `#/cambridge` (`web/js/cambridge.js`, gói tải lười `cambridge` trong `web/js/app.js`)
Danh sách theo cấp → 3 tab bài thi. Khách quan: QE chấm + lời giải + "xem chỗ có đáp án"; nghe 2 lần như thi thật, hiện lời thoại sau khi nộp. Viết: đếm từ trực tiếp, sau khi nộp hiện ý đạt/thiếu, từ nối, tiêu chí 0–5, bài mẫu, nhận xét AI (tùy chọn, khóa người dùng). Nói: nghe câu hỏi (giọng Kokoro dựng sẵn), trả lời → bản ghi + độ dài + lý do + câu mẫu. Điểm = % đúng để tự theo dõi, không quy đổi Cambridge English Scale.
**Thêm đề mới = thêm 1 đường dẫn file vào gói `cambridge`** (test `cambridge.mjs` đỏ nếu quên).

## 3. Cổng (phải xanh, không hạ ngưỡng)
`node scripts/content-qa/exam-format-check.mjs` (phần/câu/dạng/min_words theo spec, đáp án hợp lệ, căn cứ cue, đánh số liền, câu hỏi + câu mẫu Speaking, tiêu chí cấp) · `node scripts/test/cambridge.mjs` (gói app, bài mẫu qua kiểm ý, checks không quá rộng, corpus audio) · `node scripts/content-qa/gate.mjs` · `node scripts/content-score.mjs` (đếm đề nạp được; trọng số/đích không đổi). Lệch mới KHÔNG được ghi vào `deviations.json` – sửa đề.
