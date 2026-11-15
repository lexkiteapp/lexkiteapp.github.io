# Trung gian (mediation): định dạng bài, cổng, màn (O3)

> TL;DR: Mỗi bài = 1 file `content/mediation/m<NN>.json` gắn một mục tiêu Can-do `M.*` (content/framework/lkf.json): người học đọc/nghe/xem một nguồn tiếng Anh rồi **chuyển lại cho một người cụ thể** (viết hoặc nói) – giữ ý người đó cần, bỏ ý thừa, dùng lời của mình. Cổng: `scripts/content-qa/mediation-check.mjs` + `scripts/test/mediation.mjs`. Mẫu chuẩn: `m01.json` (B1, chuyển thông báo nhà ga thành tin nhắn) và `m02.json` (B2, giải thích biểu đồ qua điện thoại).
> Đọc khi: viết/soát lô S-MED, làm màn luyện trung gian, sửa cổng.

## 1. Dữ liệu một bài
`{ id, level (A2–C2), lo: "M.<cấp>.<nn>", activity, title, scenario, source, task, points[], leave_out[], model, useful[], tips[], explain }`
- `activity`: relay · summarise · explain-data · simplify · notes · facilitate (theo nhóm hoạt động CEFR Companion Volume, diễn đạt tự viết).
- `source.kind`: announcement · text · email · notice · talk (`text` chuỗi/mảng đoạn) · dialogue (`lines[{ s, t }]`) · chart (`caption`, `cols`, `rows[[nhãn, số…]]`, `unit`, `note`). Độ dài nguồn tối đa: A2 120 · B1 220 · B2 350 · C1 500 · C2 650 từ.
- `task`: `mode` write | speak, `audience` (luôn có người nhận cụ thể), `prompt`, `min_words`/`max_words`.
- `points` (≥ 3, có `id`) = ý người nhận cần; `leave_out` (≥ 1) = ý nên bỏ. Mỗi ý có `checks` = các nhóm cụm khóa; ý đạt khi mọi nhóm có ít nhất một cụm xuất hiện (màn luyện dùng để tự kiểm ý giống Cambridge).
- `model`: bài mẫu đúng số từ, đạt mọi `points`, không chứa `leave_out`, không chép nguyên ≥ 8 từ liền của nguồn.
- Nội dung viết gốc tiếng Anh, tự soạn, trung tính văn hoá; giải thích L1 sinh từ en trên CI (docs/I18N-PIPELINE.md › O5), không viết tiếng Việt trong file.

## 2. Màn luyện `#/mediate` (mẫu Stitch 390 sáng/tối – project 17380622463903601788, điều phối duyệt 10/11)
- Dữ liệu: `node scripts/mediation/build.mjs` → `web/cpack/mediation/index.js` (danh sách) + `<id>.js` (tải khi mở bài); prepush ghi lại, `test/mediation.mjs` đỏ khi lệch.
- Chấm: `web/js/mediate-core.js` – MỘT nguồn cho màn và cổng `mediation-check` (words, hit, copied, check, voices).
- Màn (`web/js/mediate.js`, gói lười `mediate`): khung FOCUS (X + thanh tiến độ, ExitGuard WITH_ARG) · chip cấp + hoạt động · tình huống + giáo viên 2D (`Chars.slot`) · nguồn nguyên văn (đoạn / hội thoại / bảng biểu đồ) + nút nghe 44 px · thẻ nhiệm vụ (người nhận, đề, ô viết, đếm từ, Nói) · `learn-bar` "Kiểm tra bài".
- Nghe trước từ B2 (trừ biểu đồ): chữ ẩn tới khi nghe xong hoặc bấm Hiện chữ. Giọng Kokoro dựng sẵn nhóm `mediation-source` (`MediateCore.voices`: người dẫn bf_emma, hội thoại mỗi người một giọng Anh-Anh).
- Nút Kiểm tra tắt kèm gợi ý tới khi đủ `min_words`; bộ đếm xanh trong khoảng, đỏ khi quá `max_words`. Bài nói: ghi âm `UI.recognize` vào ô (sửa được) rồi kiểm như bài viết.
- Kết quả: ý đạt/thiếu, ý nên bỏ đã viết, cảnh báo chép nguyên văn ≥ 8 từ, giải thích, bài mẫu, cụm từ hữu ích, mẹo; nháp lưu trên máy (`lk.medDraft.<id>`), điểm tốt nhất `state.game.medBest`.
- Vào từ thẻ "Trung gian" ở Kỹ năng (`#/skills`) và ô Luyện (`#/train`). Chữ giao diện 15 ngôn ngữ (`en/mediate.js`, nhãn ngắn dịch tay trong `scripts/i18n-fixed.json`); nội dung bài tiếng Anh.

## 3. Cổng (phải xanh, không hạ ngưỡng)
`node scripts/content-qa/mediation-check.mjs` (khuôn, lo M.* có thật và lệch cấp ≤ 1, nguồn theo cấp, ý ≥ 3 + ý nên bỏ, checks không quá rộng, bài mẫu đủ ý/không thừa/không chép nguồn, không còn tiếng Việt) · `node scripts/test/mediation.mjs` (cổng bắt đủ 16 kiểu hỏng) · `node scripts/content-qa/gate.mjs` (nguồn `mediation` trong content/qa/sources.json) · `node scripts/content-score.mjs` (đếm file, đích 30).
