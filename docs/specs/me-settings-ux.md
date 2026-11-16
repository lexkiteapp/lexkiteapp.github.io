# Spec-lite: Tôi (#/me) + Cài đặt (#/settings) gọn, dễ quét (5/11)

> TL;DR: Cài đặt = mục lục nhóm kiểu Apple Settings (icon · nhãn 1 dòng · giá trị hiện tại · ›) + trang con `#/settings/<mục>` có nút Quay lại; Tôi gom 5–10 liên kết đọc thêm vào một hàng. Không bỏ điều khiển nào.
> Đọc khi: sửa `web/js/settings.js`, `web/js/ux1-me.js`.

**Vấn đề (soát live 390 px, sáng/tối):** Cài đặt cao 6.400 px, 7 chip nhảy nhanh + mọi nhóm mở cùng lúc, chữ gợi ý dài, emoji lẫn nhãn; chế độ tối chip thành ô trắng mất chữ. Tôi ~35 hàng, nhãn `<a>` ăn màu san hô toàn cục (trông như cảnh báo, lệch với nhãn `<button>`), 10 liên kết blog/giới thiệu dài cuối trang, nút "Đăng nhập" dùng icon đăng xuất. Lỗi tiềm ẩn: hai ô `id="sAuto"` → công tắc "Tự động theo giờ bạn hay học" không có handler, đặt giờ nhắc bỏ tick nhầm "Tự phát âm".

**Kiến trúc mới**
- `#/settings` = mục lục 4 nhóm: [Tài khoản: tên/“Đăng nhập”] · [Quản trị – chỉ admin] · [Giao diện: ngôn ngữ · màu | Mục tiêu học: từ mới · lượt ôn | Âm thanh: UK/US · tốc độ | Nhắc học: giờ/Tự động/Tắt] · [AI | Add-on | Dữ liệu] · [Pháp lý & hỗ trợ]. Giá trị hiện tại thay cho câu giải thích.
- `#/settings/<account|admin|look|study|sound|remind|ai|ext|data|help>` = chỉ một nhóm, tiêu đề = tên nhóm, Quay lại (≥ 44 px) về mục lục; mục lục Quay lại về Tôi. `?delete=account` mở Tài khoản. Back hệ thống/Esc theo lịch sử hash.
- Mọi điều khiển vẫn dựng trong DOM (ẩn bằng CSS) → id/handler/liên kết cũ không đổi; gợi ý dài chỉ hiện trong trang con.
- Tôi: hàng "Tìm hiểu thêm" (số liên kết) mở tấm chứa đúng các liên kết cũ; nhãn hàng thừa kế màu chữ; nút đăng nhập icon `login`.

**Luật:** không bỏ cài đặt/nội dung (chỉ gom, thu gọn); không chuỗi mới (dùng nhãn đã dịch 15 ngôn ngữ); CSS nạp cùng gói lười (không vào khung app, không đụng style.css); tương phản bằng token theme; reduced-motion tắt chuyển màu.
**Test:** `scripts/test/settings-subpages.mjs` (id trùng, mỗi trang con có 1 section + 1 hàng mục lục, hàng 'more', chặn màu liên kết). Hình: visual-qa/qa-bot trên PR.
