# Spec: bài thi thử chuẩn thi thật (exam-real)

> TL;DR: Mọi màn thi thử chạy như thi thật (đồng hồ theo mốc thời gian thật, bảng câu, cờ, nộp có xác nhận) + màn chữa bài chung `ExamKit.review`. Giao diện port từ ref Stitch `brand/stitch/exam/`. Trạng thái: M1 + M2 (#/toeic-test) xong trên nhánh `exam-real`; còn M3–M4.
> Đọc khi: sửa bất kỳ màn thi thử/chữa bài nào.

**Mục tiêu:** mọi màn làm bài thi trong app chạy như thi thật (đồng hồ chuẩn, bảng câu, đánh dấu, nộp có xác nhận) và chữa bài đầy đủ (điểm quy đổi, thống kê, lọc, giải thích 15 ngôn ngữ, làm lại câu sai). $0, không gọi AI lúc người học mở.

## Kiểm kê (01/11, main 408788038)
| Màn | Giờ | Bảng câu | Đánh dấu | Nộp+xác nhận | Lưu khi tải lại | Chữa bài | Quy đổi |
|---|---|---|---|---|---|---|---|
| `#/toeic-test/:n` (toeic.js) | chỉ Reading, setInterval, ~75' | Reading | – | confirm() | có (24h, 15 s) | câu sai + % Part | tuyến tính 5–495 |
| `#/toeic-r/:id` | – | – | – | không xác nhận | – | tại chỗ | % |
| `#/listen/:id`, `#/listen-test/:n` (listening.js) | theo audio; pre-read 30 s | – | – | chỉ khi audio chạy | – | listen-test: không | band IELTS |
| `#/mock` (mock.js) | setInterval L/R/W/S | Reading | – | có | chỉ theo kỹ năng | câu sai Reading | band |
| `#/cbt` (cbt.js) | setInterval, 20'/bài | có + lọc | có (F) | có | **không** | giải thích vi | % |
| `#/placement` (CEFR) | – | – | – | – | – | – | band + CEFR |
| `#/toefl-p`, `#/toeic-sw`, `#/write`, `#/speaking` | đồng hồ từng task | – | – | – | nháp | tự chấm/mẫu | ước tính |
Không có đồng hồ theo mốc thời gian thật ở đâu cả (tab ẩn → lệch); không có màn chữa bài chung.

## Thời lượng chuẩn (nguồn chính thức)
- TOEIC L&R: Listening ≈45', Reading 75' (ETS, ets.org/toeic/test-takers/about/listening-reading.html).
- IELTS: Listening ≈30' (+2' soát ở bản máy tính), Reading 60', Writing 60', Speaking 11–14' (ielts.org "Test format").
- TOEFL iBT (từ 21/01/2026): Reading ≈18–27', Listening ≈18–27', Writing ≈23', Speaking ≈8' (ets.org/toefl, "TOEFL iBT test changes").
- CEFR placement: không có chuẩn chính thức → mặc định đếm xuôi, không giới hạn.

## Thiết kế
- **`web/js/exam-kit.js`** (tải lười, gói `examkit`, ≤12 KB gz) + `css/st-exam.css` (port Stitch): `ExamKit.session({id, sections, mode})`
  - Đồng hồ: `endAt` tuyệt đối (Date.now), chế độ `exam` (đếm ngược, tự nộp khi hết), `practice` (đếm xuôi) hoặc `off`; cảnh báo 5' và 1' (toast + chip đổi màu + aria-live); `visibilitychange` tính lại; hết giờ khi tab ẩn → nộp ngay lúc quay lại.
  - Lưu `lk.exam.<id>` (đáp án, cờ, giây từng câu, endAt, câu đang làm) mỗi lần đổi + mỗi 5 s; tải lại → hỏi "Làm tiếp"; hạn 24 h.
  - Bảng câu (sheet): đã làm / trống / đánh dấu, bấm để nhảy. Phím: ←/→ câu, 1–4 hoặc A–D chọn, F đánh dấu, M bảng câu, Enter tiếp.
  - Nộp: sheet xác nhận (đã làm / trống / đánh dấu / giờ còn) + "Xem câu trống".
- **Chữa bài chung `ExamKit.review(result)`**: điểm + quy đổi (TOEIC bảng ước tính 10–990 theo % từng phần; IELTS `QE.bandOf`; TOEFL 1–6; CEFR) ghi "Ước tính, không phải điểm chính thức"; thanh theo Part/dạng câu; giây trung bình + từng câu; lọc Tất cả/Sai/Đánh dấu/Trống; mỗi câu: đáp án đúng, vì sao đúng (`QE.exT` → 15 ngôn ngữ), vì sao từng phương án sai, từ vựng (+ thêm thẻ ôn), ngữ pháp liên quan; nút "Làm lại câu sai".
- **Giải thích thiếu** (vì sao sai từng phương án, từ/ngữ pháp): job CI một lần `explain-options.yml` (kho Gemini / Workers AI tài khoản 2, `infra/jobs.json` + lease) → `content/explain/opts/<test>.json` qua `content-qa/gate` + cổng riêng (đáp án khớp, không lộ tiếng Việt sai ngôn ngữ, độ dài) → dịch bằng `gen-explain.mjs` sẵn có → tĩnh. App chỉ đọc file tĩnh.

## Việc (mỗi mốc 1 PR)
1. M0: 3 màn Stitch sáng+tối (đang làm bài, xác nhận nộp, chữa bài) → chủ duyệt.
2. M1: exam-kit (đồng hồ, lưu, bảng câu, phím, nộp) + test đơn vị đồng hồ (tab ẩn, tải lại, hết giờ tự nộp) + gắn `#/toeic-test` (cả Listening).
3. M2: chữa bài chung + bảng quy đổi TOEIC + gắn toeic-test; e2e một đề (journey-e2e J9 `h.shot`). **Xong:** khung focus từng đơn vị câu, sheet nộp, `ExamKit.review`, "Làm lại câu sai" (`#/toeic-test/n?retry=1`). Dữ liệu tùy chọn mỗi câu cho M4: `whyWrong` (khóa = chỉ số hoặc chữ phương án), `grammar {href,label}`, `vocab [từ]`.
4. M3: gắn mock, listen-test, cbt (thêm lưu), toeic-r, placement (đếm xuôi), toefl-p/toeic-sw (đồng hồ chuẩn).
5. M4: job CI giải thích phương án sai + từ/ngữ pháp → tĩnh 15 ngôn ngữ.

## Cổng
Shell ≤ 377 KB gz (exam-kit tải lười), i18n 15 ngôn ngữ (`en/exam.js` nhóm lười), tương phản ≥ 4,5:1, ô chạm ≥ 44 px, journey-e2e, bump CACHE `web/sw.js`, chủ OK ảnh trước/sau sáng/tối. Không cắt tính năng cũ (giữ nghe 1 lần, highlight, AI chấm Writing…).
