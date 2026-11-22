# Spec: thêm 3 dạng bài lôi cuốn vào khung bài học trộn + bật kho tình huống

> TL;DR: Kiểm kê (21/11) cho thấy khung `#/lesson` chỉ có 8 dạng; thiếu "nghe → chọn tranh", "ghép cặp có hình", "sửa lỗi câu", chính tả câu dài. Thêm 4 dạng vào khung sẵn có (engine.js + ui.js), không làm khung mới; bật `speak_pack` (40 tình huống) sau cổng QC. 4 PR nối tiếp (chung engine.js/ui.js → 1 người viết).

Trạng thái: ĐỀ XUẤT (chủ nội dung content-95; chủ yêu cầu 21/11 "nâng cấp nội dung học, kho đề đa dạng lôi cuốn"). Liên quan: `docs/LESSON-ENGINE.md` §3, `web/js/lesson/{engine,ui}.js`, `web/js/vocab-img.js`, `docs/CONTENT-WORLD-PLAN.md` §7.

## Hiện trạng (đo)
Lesson: gap, build, tr, type, say, pic, match, mean (+q/line/video trong Truyện). Ngoài khung: chính tả (listening.js), grammar error/rewrite (~440 drill), call.js ~35 cuộc, roleplay ~60, speak_pack 40 tình huống (cờ TẮT).

## Phạm vi (mỗi dạng 1 PR, thứ tự)
1. `lpic` – nghe → chọn 1/4 ảnh (tái dùng VImg `từ#loại`, TTS có 🐢; từ không có ảnh bị loại).
2. `mpic` – ghép cặp từ ↔ ảnh (mở rộng `match`, cùng chấm).
3. `fix` – sửa lỗi câu: chọn từ sai rồi chọn bản đúng; nguồn = grammar `error`/`rewrite` có sẵn (không viết lại kho).
4. `dict` – chính tả câu ngắn (≤8 từ) từ câu ví dụ có Kokoro; dùng `type` + diff từng từ.
5. (song song, không đụng engine) bật `speak_pack` sau QC hình + test situations.

## Khung chung (không khung mới)
engine.js: HINTS + make() + build() + grade; ui.js: nhánh render + sự kiện; bundles.js không đổi; test thêm vào `scripts/test/lesson.mjs`. Chuỗi UI mới qua `t()` + en/lesson.js + 13 ngôn ngữ gen-i18n; mã mới ≤3 KB vào web/js, phần dư lazy.

## Không làm
Không đổi nội dung kho đề (do E1–E5), không tạo ảnh mới (chỉ VImg hiện có), không đổi logo/khung Stitch.

## Xong khi
Mỗi dạng xuất hiện trong bài trộn ≥1 lần/bài khi đủ dữ liệu, chấm + XP + sổ lỗi đúng, âm thanh/ảnh đủ, ảnh QC sáng/tối × en/vi/ar/de qua CI, i18n 15 ngôn ngữ, mọi gate xanh.
