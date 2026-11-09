# Spec W5: Luyện thi định dạng DELE / SIELE (tl `es`)

> TL;DR: bộ luyện thi theo ĐỊNH DẠNG DELE A1–C2 + SIELE, nạp lười theo route, câu/đoạn tiếng TBN lấy từ NGUỒN NGƯỜI VIẾT MỞ (Tatoeba, CC BY 2.0 FR) – không AI sinh câu. Cần duyệt trước khi code (CLAUDE.md #8). Soạn 09/11/2026, nối `spanish-course.md` §3/§4 W5.
> Tên hiển thị: "Luyện định dạng DELE/SIELE" (chủ chốt §9). Không liên kết Cervantes, không đề thật, không logo.

## 1. Định dạng đã đối chiếu trang chính thức (09/11/2026)
Chỉ ghi cấu trúc; số câu/điểm từng tarea **chưa xác minh được** trên trang nào → spec máy đọc để `null`, KHÔNG đoán (nguyên tắc `exam-format-check`).
| Kỳ thi | Nguồn | Cấu trúc đã xác minh |
|---|---|---|
| DELE A1 | dele.org/dele/dele-levels/level-a1 | Nhóm 1: Đọc 45′ (4 tarea) + Viết 25′ (2); Nhóm 2: Nghe 20′ (4) + Nói 15′; tối đa 100; mỗi nhóm ≥ 30 |
| DELE A2 | …/level-a2 | Đọc 60′ (5) + Viết 50′ (2); Nghe 35′ (5) + Nói 15′; mỗi nhóm ≥ 30 |
| DELE B1 | …/intermediate-mid-threshold-level | Đọc 70′ (5) + Viết 60′ (2); Nghe 40′ (5) + Nói 15′ (+15′ chuẩn bị); ≥ 60/100 và ≥ 30/50 mỗi nhóm |
| DELE B2 | …/high-intermediate-level | Đọc 70′ (4) + Viết 80′ (2); Nghe 40′ (5) + Nói 20′ (+20′); ≥ 60/100, ≥ 30/50 mỗi nhóm |
| DELE C1 | …/level-c1 | Nhóm 1 = Prueba 1 Đọc + Dùng ngôn ngữ 90′ (5) và Prueba 3 Kỹ năng tích hợp Nghe + Viết 80′ (2); Nhóm 2 = Prueba 2 Nghe + Dùng ngôn ngữ 50′ (5) và Prueba 4 Đọc + Nói 20′ (+20′); mỗi nhóm ≥ 30 |
| DELE C2 | …/superior-level | 3 prueba: P1 Dùng ngôn ngữ + Đọc + Nghe 105′ (6 tarea); P2 tích hợp Nghe/Đọc + Viết 150′ (3); P3 Đọc + Nói 20′ (+30′); mỗi prueba ≥ 60 %, ≥ 20 điểm |
| SIELE Global | siele.org/examenes | CL 5 tarea · 38 câu · ≤ 60′ · máy chấm; CA 6 tarea · 38 câu · ≤ 55′ · máy chấm; EIE 2 tarea · ≤ 50′ · người chấm; EIO 5 tarea · ≤ 15′ · người chấm; mỗi prueba 0–250, tổng 0–1000; dải cấp theo prueba (CL: A1 33, A2 66, B1 118, B2 178, C1 217; CA: 33/66/112/164/211; EIE: 34/69/104/167/215; EIO: 40/76/125/176/215); không có C2 |
Chưa xác minh (để `null`, đối chiếu sau khi có đề mẫu chính thức): số câu mỗi tarea DELE, điểm mỗi prueba, ngưỡng tổng A1/A2/C1, bảng quy đổi 0–1000 → cấp của SIELE Global. Ghi chú trang dele.org: tin 01/2020 nói định dạng A1/A2 đã đổi → khi có nguồn Cervantes mới (trang "nueva web de exámenes" đang chuẩn bị) phải đối chiếu lại.

## 2. Nguồn nội dung (luật: câu không do AI sinh)
- **Tatoeba tiếng TBN** (`spa_sentences_detailed.tsv.bz2`, 443 166 câu, CC BY 2.0 FR, ghi công tác giả từng câu): lọc bằng máy — lint es-419 (`TL_RULES.es.lint` + danh sách vùng), 20–140 ký tự, không URL/tên riêng lạ; xếp cấp bằng rank từ vựng (kho 452 từ `reviewed` + FrequencyWords chỉ làm thứ hạng). Lưu `content/exams/es/src/tatoeba-<cấp>.json` kèm id câu + tác giả (nghĩa vụ ghi công; trang Giới thiệu/Credits liệt kê).
- Đoạn đọc dài (B1–C2): ghép các câu cùng chủ đề của CÙNG một tác giả hoặc văn bản miền công cộng (Wikisource es, tác giả mất > 70 năm) – kiểm tay mẫu; không viết lại bằng AI.
- AI chỉ làm việc KHÔNG tạo câu tiếng TBN: (a) chấm Viết/Nói theo rubric (ai-pool, lúc người học nộp; mặc định chấm trên máy bằng rubric đếm/regex như `call/engine`), (b) dịch nhãn giao diện 15 ngôn ngữ. Đề nói/viết: yêu cầu (consigna) tự viết tay ngắn, rubric tự viết (không chép tiêu chí Cervantes).
- Bẫy đáp án (distractor) sinh bằng máy từ cùng từ loại/cấp (kho từ), kiểm không trùng đáp án đúng.

## 3. Phần luyện & chấm
| Phần | Dạng | Chấm |
|---|---|---|
| Đọc, Dùng ngôn ngữ | MCQ trên đoạn; điền khuyết có 3 phương án (cloze trên câu Tatoeba, từ khuyết = từ kho); nối ý | máy, tức thì |
| Nghe | câu/đoạn Tatoeba đọc bằng Kokoro (MỘT giọng/vai: Ama `ef_dora`, Carlos `em_alex`); chép chính tả, chọn nghĩa | máy (QE.gradeGap, thiếu tilde vẫn đúng + nhắc) |
| Viết | consigna + giới hạn từ (theo cấp) | rubric đếm từ/liên kết/ngữ pháp (LanguageTool trên CI cho đề mẫu; trên máy người học: đếm + regex) + gợi ý chấm AI tùy chọn qua ai-pool, người học thấy tiêu chí |
| Nói | consigna → micro (Web Speech es / Whisper đa ngôn ngữ trên máy) | độ phủ từ khoá + độ dài + tốc độ; không gửi âm thanh đi mặc định |
Kết quả: điểm theo thang SIELE (0–250/prueba, ước lượng) và "đạt/chưa" theo quy tắc DELE ĐÃ xác minh (ngưỡng chưa xác minh = chỉ báo % không phán đạt/trượt). Nhãn rõ "ước lượng luyện tập".

## 4. Kiến trúc & ngân sách (trần cpack còn ≈ 350 KB)
- Route: mode mới của route practice `#/practice/esx` (không route mới – test frame-consistency); mã `web/cpack/es-app/exam-ui.js` dùng chung khung với `espr.js` (App.esQ/esFoot/esEnd).
- Dữ liệu tải lười theo (cấp × phần): `cpack/es/x-<cấp>-<phần>.js` ~ 15–25 KB mỗi gói, nạp khi vào đúng phần; nhãn 15 ngôn ngữ ở `x-ui-<ngôn ngữ>.js` (~3 KB). Ngân sách mục tiêu: tổng W5 ≤ 300 KB cpack (đo `size-budget` trước khi đẩy); phần lớn nội dung (đoạn dài C1–C2) có thể dựng theo cấp dần qua nhiều PR nhỏ.
- Đủ ≥ 2 đề mỗi cấp A1–C2 (spec §4): chia đợt A1–B1 (đợt 1) / B2–C2 (đợt 2) nếu vượt trần; mỗi đợt 1 PR.
- Audio: `corpus-es.mjs` thêm câu đề nghe (một giọng/vai), dispatch audio.yml trên MAIN sau gộp.

## 5. Cổng QC (CI, không nới)
`scripts/target/exam-es-check.mjs`: lint es-419 mọi câu; nguồn Tatoeba có id + tác giả; mỗi câu hỏi có đáp án + căn cứ (câu trích nằm trong bài); distractor khác đáp án; đủ 15 ngôn ngữ nhãn, giữ chỗ `{n}`; spec DELE/SIELE khớp bảng §1 (giá trị chưa xác minh = `null`, cấm số đoán); LanguageTool 0 lỗi trên mọi câu tự viết (consigna); credits Tatoeba có mặt. Test jsdom `es-exam.mjs` (làm 1 phần → chấm → kết quả). Không hồi quy tiếng Anh (target-lang, ux1, cpack).

## 6. Rủi ro
- Câu Tatoeba có lỗi/văn phong Tây Ban Nha: lint + xếp cấp + soát tay mẫu ≥ 5 %; loại câu có `vosotros`, vùng.
- Bản quyền: chỉ câu CC BY 2.0 FR có ghi công; đoạn Wikisource phải miền công cộng.
- Nhãn hiệu DELE/SIELE chỉ mô tả ("luyện theo định dạng"), không dùng logo, không nói "đề thật".
- Trần cpack: đo trước; không nâng trần (quyết định nâng thuộc điều phối).

## 7. Cần chủ/điều phối duyệt
1. Dùng Tatoeba (CC BY 2.0 FR, ghi công) làm nguồn câu người viết; đoạn dài từ Wikisource miền công cộng.
2. Chia 2 đợt PR (A1–B1, B2–C2) để giữ trần cpack.
3. Chấm Viết/Nói: mặc định trên máy (rubric), AI qua ai-pool chỉ là tùy chọn có hạn mức.
