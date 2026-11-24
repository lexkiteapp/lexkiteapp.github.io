# Bảng "Bạn đang luyện kỳ thi nào?" – ngôn ngữ trước, kỳ thi sau (23/11)
> TL;DR: một bảng dưới (sheet) chọn NGÔN NGỮ rồi KỲ THI lọc theo ngôn ngữ; một kiểu chọn (radio); "Xong" áp dụng. Mã: `web/cpack/tl-app/tl-pick.js` (`TLPick.exam`, gói lười `tlpick`), `App.examPicker` ở `hubs.js` chỉ nạp gói này (byte tải đầu giảm).

- Thứ tự: tiêu đề dính (tay nắm · tên · nút đóng ≥ 44) → **Ngôn ngữ đang học** (lưới cờ + tên bản địa + tiến độ; chỉ ngôn ngữ đã mở) → **Kỳ thi** lọc theo ngôn ngữ → **Hoặc chỉ học giao tiếp** (chỉ English: mục tiêu, không phải kỳ thi) → **Sắp ra mắt** (kỳ thi của ngôn ngữ chưa mở + "Báo tôi khi có") → nút **Xong** dính đáy.
- English: IELTS Academic, IELTS GT, TOEIC, TOEFL iBT. Español: DELE/SIELE · Français: DELF/DALF/TCF · 日本語: JLPT · 한국어: TOPIK · Português: CELPE-Bras (tên riêng, không dịch).
- Chọn: `role=radio` + `aria-checked`; `.on` = nền `--accent-soft` + viền `--done` + ✓ (token Stitch, không hex). Hover chỉ đổi nền; focus-visible = vòng `--accent` riêng → không thể trông như "chọn 2 thứ".
- Xong: en + đổi kỳ → `App.setExam`; đổi ngôn ngữ → `TLPick.choose` (về trang chủ khóa); không đổi → đóng.
- Kiểm: `scripts/test/exam-sheet.mjs` (jsdom) + ảnh CI `exam-sheet-shots.yml` (390/768 × sáng/tối × en/de/ar, trước/sau).
