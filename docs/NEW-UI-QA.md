# Soát hình các màn mới (new-ui-qa)

> TL;DR: CI chụp từng màn mới × trạng thái × 4 khung × sáng/tối × 15 ngôn ngữ, đầu dò trong trang tự đỏ khi lỗi, rồi ghép contact sheet để người soát xem bằng mắt.
> Đọc khi: thêm/sửa màn bài học trộn, Truyện/Radio, chuỗi/rã băng/rương/thẻ khoe, giáo viên sprite, mặt tiền video YouTube.

- Script: `scripts/test/new-ui-qa.mjs` (chụp + đầu dò) · `scripts/test/new-ui-sheets.mjs` (gộp shard, tìm chuỗi chưa dịch, contact sheet) · workflow `new-ui-qa.yml`.
- Cờ chỉ bật trong trình duyệt thử (`lk.lesson=1`, `?ret=1`, `?demo=1`), không đổi cấu hình người dùng. `App.lessonDemo` (nhảy tới 1 dạng bài) chỉ có ở `?demo=1`.
- PR chạm các màn → cổng nhanh (en,ar · ru,de · vi,ja,hi × 360 + 1280 × sáng/tối). Đủ bộ: đẩy nhánh `nuq-*` hoặc chạy tay `full=1` → artifact `new-ui-sheets-<nhãn>`.
- FAIL: tràn ngang · chữ cắt · nút < 44 px (cả nút phụ; liên kết trong câu được miễn) · tương phản < AA (axe) · ảnh/video hỏng · chữ Việt rò · chuỗi giao diện y bản en (chưa dịch) · nhân vật ngoài Ama/Carlos 3D (Kit, Mia, emoji mặt người/con vật) · CLS > 0 khi chuyển bước bằng thao tác thật · giáo viên bị lớp cố định che · ar không `dir=rtl` · lỗi JS.
- WARN: khung hình > 50 ms khi chuyển bước (runner không GPU).
- Thêm màn mới: thêm 1 hàm trạng thái trong `new-ui-qa.mjs` + đường dẫn vào `paths` của workflow. Không nới ngưỡng; sửa gốc.
