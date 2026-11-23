# IELTS – độ phủ định dạng so với format công khai (ielts.org) – 23/11

> Phạm vi: kiểm đọc-chỉ trên checkout `claude/topic-depth-w3`; số đếm bằng cách nạp dữ liệu (`READTESTS`, `LISTENING`, `MODELS`, `GT_LETTERS`, `TASK1_MORE`). Spec định dạng: `content/exams/spec/ielts-ac.json`, `ielts-gt.json`; cổng `scripts/content-qa/exam-format-check.mjs`. Nội dung đều tự biên soạn (CONTENT-RULES §1) – không lấy từ sách Cambridge.

## 1. Tóm tắt dữ liệu hiện có
- Reading: 19 đề (12 Academic `web/js/readtest/test1–10`, `cpack/readtest/rt11–12`; 7 GT `gt1–gt7`), 760 câu (736 câu có `items` + 24 câu "multi"). Mọi câu đều có `a` + `cue` (câu trích chứa đáp án).
- Listening: 20 đề x 4 phần = 80 phần (`web/js/listen/test1–8`, `cpack/listen/test9–11`; còn lại nằm ở gói khác), 800 câu (756 + 44 multi). Mọi câu có `a`, `cue`, `explain`; `script` ~36 dòng/phần.
- Chấm điểm/hiển thị dùng chung: `web/js/qengine.js` (239 dòng). Writing: `web/cpack/write/models*.js` (164 bài mẫu), `web/js/write/gt-letters.js`, `web/js/task1.js`, `web/js/ai.js`.

## 2. Bảng độ phủ

| # | Hạng mục | Trạng thái | Số liệu / con trỏ | Ghi chú |
|---|---|---|---|---|
| 1a | Form completion (L) | present | 20 nhóm / 126 câu (`LISTENING` type `form`) | Có đủ giới hạn từ trong `instr` |
| 1b | Note completion (L, R) | present | L 32 nhóm / 200 câu; R 11 nhóm / 55 câu | |
| 1c | Table completion (L, R) | present | L 7 nhóm / 27 câu; R 6 nhóm / 25 câu | L ít |
| 1d | Flow-chart completion | **missing** | 0 trong cả L và R | Không có kiểu dữ liệu `flow`, không có UI vẽ mũi tên/hộp |
| 1e | Map / plan labelling (L) | **partial** | 3 nhóm `match` có chữ "map" (vd "What can visitors find at each place on the map?") | Chỉ có danh sách chữ, KHÔNG có ảnh bản đồ để người học xem ô A–G; `qengine.js` chỉ có `it.img` cho ảnh từng câu TOEIC |
| 1f | Diagram labelling (L, R) | **missing** | 0 | Không có kiểu `diagram`, không có ảnh/SVG nhãn |
| 1g | Matching headings (R) | present | 19 nhóm | |
| 1h | Matching information (para) (R) | present | 17 nhóm | |
| 1i | Matching features (R, L) | present | R 18 nhóm; L 40 nhóm `match` (đặc điểm/địa điểm) | |
| 1j | Matching sentence endings (R) | partial | R 5 nhóm; L 0 | Listening chưa có "sentence endings" |
| 1k | TFNG / YNNG (R) | present | TFNG 23 nhóm/124 câu; YNNG 16 nhóm/79 câu | GT dùng TFNG, AC dùng cả hai – khớp spec |
| 1l | Summary completion KHÔNG word bank | present | R 15 nhóm/53 câu; L 10 nhóm/39 câu | |
| 1m | Summary completion CÓ word bank (list of words) | **missing** | R: 0/15 nhóm có `options`; L: không có nhóm kèm ngân hàng từ | Cần kiểu `summary-bank` (chọn chữ cái A–I) |
| 1n | Sentence completion (R) | present | 12 nhóm / 40 câu | L chưa có nhóm riêng (Part 3-4 dùng note) |
| 1o | Short-answer questions (L, R) | **missing** | Không có kiểu riêng ("Answer the questions below") | Spec Part 1 L và R đều liệt kê `short-answer` |
| 1p | Multiple choice đơn | present | L 42 nhóm / 177 câu; R 29 nhóm / 84 câu | |
| 1q | Multiple choice chọn nhiều | partial | R 12 nhóm; L 22 nhóm; tất cả "TWO letters" | Thiếu "THREE letters" (chọn 3/5–7); `multi` chấm theo số đúng, không phân biệt cặp |
| 1r | Pick from a list (nhiều ô, 2–3 đáp án) | partial | gộp vào `multi` | Thiếu mẫu 3 đáp án |
| 2a | Writing T1 Academic: line/bar/pie/table | present | `task1.js` + `TASK1_MORE` (line 9, bar 9, pie 6, table 7) + đề dựng sẵn; 52 bài mẫu T1 | Có vẽ biểu đồ (`App.task1.draw`) |
| 2b | Writing T1 Academic: process / map | present | process 7, map 6 (`TASK1_MORE`) | Chưa kiểm số bài mẫu band 7/6 riêng của map/process |
| 2c | Writing T1 General: thư formal / semi-formal / informal | present | 24 đề (8/8/8) ở `gt-letters.js` + 24 bài mẫu `task:'gt'` band 8.0 | Có `open` (câu mở đầu) và `close` |
| 2d | GT letter có bài mẫu band 7 / 6 | **missing** | `band7`: 0, `band6`: 0 trên 24 bài GT | |
| 3a | Giới hạn từ ("NO MORE THAN TWO WORDS AND/OR A NUMBER" – dài hơn thì sai) | present | `qengine.js` `gradeGap` + `words()`; số có dấu ngăn tính là 1; `over` hiện "vượt quá số từ" | |
| 3b | Phạm vi giới hạn đang dùng | partial | L: chỉ "ONE WORD AND/OR A NUMBER" (44) và "ONE WORD ONLY" (25); R: ≤ 2 từ (limit 1–2) | Không có đề "NO MORE THAN THREE WORDS" (đặc biệt Reading) |
| 3c | Biến thể UK/US | partial | Không có bộ chuẩn hoá tự động; chỉ do tác giả liệt kê thêm vào mảng `a` (174 câu L có >1 đáp án chấp nhận) | `norm()` không có bảng colour/color, centre/center…; đáp án người học dễ bị chấm sai oan |
| 3d | Số: 1,000 = 1000 | present | `norm()` bỏ dấu phẩy nghìn, ký hiệu tiền | |
| 3e | Số: chữ ↔ số ("twenty" = 20) và ordinal | **missing** | `norm()` không đổi | IELTS thường chấp nhận cả hai; cần ánh xạ có kiểm soát |
| 3f | Gạch nối / viết liền ("well-known" vs "well known"), chữ hoa, "the/a" | partial | Có bỏ "the/a/an" đầu, chữ thường; không gộp gạch nối/dấu cách | Cần danh sách biến thể chuẩn |
| 4a | Transcript Listening tô chỗ đáp án | present | `listening.js` `transcriptHtml`: `mark.evi` + nhãn "Câu n" + bấm nghe lại đoạn; cần `cue` khớp nguyên văn câu thoại | 756/756 item có `cue` |
| 4b | Reading tô chỗ đáp án trong bài đọc | present | nút "xem chỗ có đáp án" qua `data-ev` trong `qengine.mark`, cue 736/736 | |
| 4c | Giải thích từng câu (Vi + 14 ngôn ngữ) | present | L: `explain` mỗi câu; R: `readtest/explain-*.js`; dịch `i18n/explain/<lang>.json` | |
| 4d | Bài tập kiểu "tìm đáp án khi bị bẫy" (paraphrase map) | partial | Chưa có view riêng đối chiếu câu hỏi ↔ cue paraphrase | Chỉ hiển thị cue, chưa gắn nhãn dạng bẫy (distractor) |
| 5a | Bài mẫu Writing band 8 | present | 164 bài: T1 52, T2 88, GT 24 | |
| 5b | Bài band 7 và band 6 kèm nhận xét | partial | `band7` 40 (T1 20, T2 20); `band6` 60 (T1 20, T2 40) | Không có band 5 / 9; GT 0; nhận xét ở 5c |
| 5c | Nhận xét theo 4 tiêu chí | partial | band 8: `notes` {TR, CC, LR, GRA} trên 20 bài; band7 40 bài, band6 60 bài có `notes` (TA/TR, CC, LR, GRA); `pitfalls` 6 bài | Phần lớn bài band 8 (144/164) chưa có nhận xét 4 tiêu chí; GT không có |
| 5d | Chấm tự động theo 4 tiêu chí | partial | `ai.js` (4 tiêu chí đúng tên), `mock.js` heuristic, `task1.js` chỉ ước TA | Heuristic Task 2 dựa số từ/từ nối – không giải thích tiêu chí cho từng band |

## 3. Khoảng trống xếp ưu tiên (mỗi lô = 1 PR ≤ ~100 KB nội dung tự viết HOẶC 1 thay đổi engine)

Ưu tiên theo: (a) lệch spec công khai lớn nhất; (b) kiểu câu có trong MỌI kỳ thi thật; (c) rủi ro chấm sai oan.

1. **B1 – Engine: chuẩn hoá đáp án (3c, 3e, 3f).** `qengine.js`: thêm bảng UK/US (khoảng 150 cặp), số chữ↔số 0–100 + ordinal + "1st", bỏ gạch nối/dấu cách; thêm test `scripts/test/qengine-norm.mjs` có vector. Không đổi dữ liệu, không giảm ngưỡng. Rủi ro thấp, hiệu quả lớn ngay trên 1.500+ câu điền từ.
2. **B2 – Engine: kiểu `shortanswer` + `summary-bank` (1m, 1o).** Thêm 2 kiểu vào `qengine.js` `groupHtml/collect` (select A–I cho word bank; ô nhập có giới hạn cho short-answer), tương thích mọi đề cũ; cập nhật `content/exams/spec` + `exam-format-check.mjs` nhận kiểu mới.
3. **B3 – Engine + nội dung: `diagram` và `map` có hình (1e, 1f).** Kiểu `figure` (SVG nội tuyến, nhãn A–H trên hình) + chấm bằng chọn chữ; viết 6 phần Listening Part 2 có bản đồ/sơ đồ SVG (≤ 40 KB). Hình do tự vẽ (Stitch frame), cần owner duyệt hình theo CLAUDE.md luật 6.
4. **B4 – Engine + nội dung: `flowchart` (1d).** Kiểu hộp–mũi tên có ô trống, hiển thị lại trong CSS `.lq-*`; 4 phần Listening Part 3/4 + 4 nhóm Reading (≤ 50 KB).
5. **B5 – Nội dung: bài mẫu GT band 7 và 6 (2d, 5b).** 24 thư x (band 7 + band 6) ≈ 48 bài ~ 90 KB, kèm `notes` 4 tiêu chí; ghi vào file mới `web/cpack/write/gt-bands.js`.
6. **B6 – Nội dung: nhận xét 4 tiêu chí cho 144 bài band 8 còn thiếu (5c)**, chia 2 PR (Task 1 trước: 32 bài; Task 2: 68 bài, ~100 KB mỗi PR), viết lại Việt, 14 ngôn ngữ qua pipeline i18n.
7. **B7 – Nội dung: dạng câu còn thiếu trong dữ liệu có sẵn (1j, 1q, 1r, 3b).** Listening "sentence endings" (6 nhóm), "choose THREE letters" (R 4 + L 4), 8 nhóm Reading có "NO MORE THAN THREE WORDS" (≤ 60 KB).
8. **B8 – Nội dung: bài band 5 và 9 cho Task 2 (5b)** để đủ thang 5→7→9 (khớp `docs/specs/band-upgrade.md`); mỗi đề 3 bài, 20 đề ≈ 100 KB.
9. **B9 – Engine: view "bẫy paraphrase" (4d)** – đối chiếu câu hỏi / cue có nhãn kiểu bẫy (synonym, số liệu, phủ định). Nhỏ, sau khi B1–B4 xong.
10. **B10 – Cổng QA:** mở rộng `exam-format-check.mjs` để đo số nhóm theo từng loại câu so với `ielts-ac.json`/`ielts-gt.json` (hiện kiểm đếm phần/câu, chưa kiểm phủ kiểu câu) – chạy trên CI.

## 4. Lưu ý
- Số đếm trên chỉ gồm các file Reading/Listening đã nạp từ `web/js/*` và `web/cpack/*`; gói tải lười khác (nếu có) chưa tính.
- Chưa kiểm số bài mẫu band 7/6 theo từng loại T1 (process/map), chưa chạy test (không chạy nặng theo yêu cầu).
