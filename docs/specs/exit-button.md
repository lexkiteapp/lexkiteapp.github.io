# Lối thoát mọi màn học (spec-lite, owner 1/11)
> TL;DR: Mọi màn học (bài học, luyện, ôn, nghe, nói, đọc, viết, thi/TOEIC/TOEFL, gọi giáo viên, trò chơi…) có nút X/Quay lại rõ ràng ở top-bar (khung §5d biến thể FOCUS/INNER), Esc, back hệ thống và vuốt iOS đều thoát; đang dở thì hỏi nhẹ. Một module chung: `web/js/exit-guard.js`.
> Đọc khi: thêm màn học/route mới, sửa top-bar màn học, exit-sweep đỏ.

## Cách làm (một chỗ, không vá từng màn)
- `ExitGuard` nối `App.afterRoute`: màn học → tìm nút thoát sẵn có (`.lsn-x`, `.study-top .icon-btn`, `#mkQuit`, nút có nhãn/biểu tượng X/←) → gắn `[data-exit]`, aria-label, vùng chạm ≥ 44 (`.lk-hit44`, không đổi hình).
- Màn thiếu nút → chèn thanh FOCUS chung (nút X tròn `.icon-btn` + thanh tiến độ đồng bộ từ `[role=progressbar]`/`<progress>` của màn). **Bật mặc định** từ 2/11 (exit-sweep xanh, luật duyệt 2/11); tắt thử `?exitbar=0` / `lk.exitbar=0`. Enter = nút chính, khung chung: `docs/specs/learn-flow-nav.md`.
- Esc / back trình duyệt / vuốt iOS = bấm nút thoát. Back nhận bằng Navigation API (`traverse`), không có thì hash mới = mục trước trong lịch sử phiên. Nghe cả `popstate` lẫn `hashchange` (back từ mục do `pushState` tạo chỉ có `popstate`); lượt bị giữ có đích → "Thoát" đi đúng đích đó.
- Nút thoát < 44 px (vd. `.icon-btn` 36 px trên máy có chuột) → hộp THẬT 44×44 mà không đổi pixel: phần nhìn thấy chuyển nguyên vào `span.lk-face` (cùng lớp, cùng hộp), chính nút thành hộp trong suốt bọc ngoài (`.lk-grow`, padding + lề âm bội 1/64 px giữ bố cục) (`grow()`); `::after` không đủ (qa-bot đo hộp thật, chạm WebKit không theo). exit-sweep đo 390/768/1440 và so ảnh có/không nới (diff = 0).
- Màn kết: `.lsn-done`, `.lesson-complete`, `#wDone`, `[data-lesson-done]` hoặc `ExitGuard.done()` – không dùng `[data-done]` (cờ "đã nạp" của ô ghi chú từ/quảng cáo/usage).
- Chữ của ExitGuard nằm ở từ điển khung (`en/shell.js` → `en.js`, `<lang>.js`), không ở gói lười (`node scripts/test/exit-guard.mjs`).
- Đang làm dở (đã chạm nội dung, chưa xong) → hộp `#modal` chung: "Thoát bây giờ sẽ mất tiến độ bài này?" · **Tiếp tục học** · **Thoát**. Màn lưu được (`ExitGuard.onSave(fn)`) → "Thoát bài? Tiến độ đã được lưu…". Chưa làm gì / màn kết quả (`ExitGuard.done()`) → thoát ngay.
- Thoát về đúng màn trước: trang trung tâm cuối cùng đã mở (Hôm nay hoặc tab gốc); link thoát của màn giữ href của nó. Màn tự có hộp hỏi riêng (`el.onclick`, vd. study/placement/mock) giữ nguyên.

## Thêm màn mới
Thêm tên route vào `ALWAYS` (luôn là màn học), `WITH_ARG` (màn học khi có `#/<route>/<id>`) hoặc `NOT_LEARN` (trang trung tâm). Gói lười tự đăng ký: `ExitGuard.learn('story')`. Route chưa phân loại → exit-sweep đỏ.

## Cổng CI (`scripts/test/exit-sweep.mjs`, bước trong qa-bot.yml)
Mọi route phải được phân loại; mỗi màn học × 390 sáng/tối: nút `[data-exit]` nhìn thấy, aria-label, ≥ 44×44, ở top-bar, tương phản ≥ 3:1; bấm nút, Esc, back khi làm dở (hỏi → Tiếp tục học ở lại → Thoát rời màn) đều không kẹt. Chỉ được siết, không nới.
