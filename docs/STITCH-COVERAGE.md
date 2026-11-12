# Phủ Stitch – màn nào đã port, màn nào còn viết tay

> TL;DR: 18 bề mặt đã port từ Stitch (id + cổng SSIM); còn 51 chia 18 lô ≤5 màn. Nguồn: `docs/stitch-coverage.json` (sinh bằng `node scripts/test/stitch-coverage.mjs --write`); CI cảnh báo route/màn thiếu id (chưa fail).
> Đọc khi: chọn lô port Stitch kế tiếp, thêm route/màn mới (phải thêm vào JSON), hoặc kiểm cổng.

Chuẩn: Lexkite Kit (assets/1b7a8a3d3d52404bb332d9ba3f783547), cách port [STITCH-V2-PORT.md](STITCH-V2-PORT.md), trang web [WEB-PAGES.md](WEB-PAGES.md). Cổng `diff:k` = khóa trong `scripts/test/stitch-screens.mjs` (SSIM + tương phản + a11y).

## Đã port (theo lượt thấy, màn học và Hôm nay trước)
| Màn | Route | Stitch id sáng / tối | Cổng |
|---|---|---|---|
| Hôm nay / Lộ trình | #/home | 8d1f597a / 9fa7728b… | diff:home |
| Học: câu hỏi | #/lesson | e085ef84 / ddf7a88a… | diff:lesson |
| Phản hồi đúng | - | eea2095d / d2dc627f… | diff:feedback |
| Phản hồi sai | - | 08b5c91c / e5a327f7… | diff:feedback-wrong |
| Hoàn thành bài | - | 55d0558e / d63ad24f… | diff:complete |
| Truyện đôi | - | fc621f97 / d845f393… | diff:story |
| Ôn tập | #/review | 8a4b46cf / d99cb2ce… | diff:review |
| Luyện tập | #/practice #/train | 6c30fd9f / bd1af8e9… | diff:practice |
| Giải đấu | #/league | ecbce2a2 / 028981cb… | diff:leagues |
| Tôi | #/me | 6bb9884c / 240decab… | diff:me |
| Chuỗi ngày | #/streak | dd88917b / 3f5c8fc5… | diff:streak |
| Mục tiêu / sẵn sàng thi | #/goal | 7f694052 / c6877409… | diff:readiness |
| Gọi giáo viên | #/call | d5c26ebf / d486adc2… | diff:call |
| Play&Speak: tình huống | #/speak | 45068b5f / c08d044d… | diff:speak-sit |
| Play&Speak: luyện nói | - | d99a0c00 / 3af03960… | diff:speak-drill |
| Chào mừng / thiết lập | #/welcome | d2c0773b / de3f3ff3… | diff:welcome |
| Hub Từ vựng | #/vocab | 66a8a4f8 / 95826e15… | diff:vocab-hub |
| Hub Thi thử | #/tests | 39a612e2 / d6518e5f… | diff:hub-tests |

## Còn thiếu – theo lô (thứ tự = lượt người dùng thấy)
| Lô | Màn | Trạng thái |
|---|---|---|
| A1 Học: biến thể + vào học | Học: dạng nối/gõ/nói/nghe/đúng-sai · Thoát giữa chừng · gợi ý · hết giờ · lên cấp · Kiểm tra trình độ · Lộ trình từ vựng / ngày / phần thưởng | có screen Kit, chưa port |
| A2 Hub | Hub Kỹ năng · Thư viện + chủ đề · Bộ thẻ của tôi (+Anki) | có screen Kit, chưa port |
| A3 Từ điển & tra | Từ điển + thẻ từ (sheet) · Cụm từ / mẫu câu · Động từ + bảng chữ · Cách dùng / kết hợp từ · Sổ lỗi sai | có screen Kit, chưa port |
| A4 Luyện kỹ năng | Nghe (hub, chép chính tả, rảnh tay) · Đọc · Viết (editor, task1, sửa văn) · Nói + nhập vai · Phát âm | có screen Kit, chưa port |
| A5 Game · thống kê · ngữ pháp · lớp | Trò chơi từ vựng · Thống kê + huy hiệu · Độ tự tin · Ngữ pháp · Khóa học + lớp | có screen Kit, chưa port |
| A6 Thi + trang thông tin | Thi thử IELTS / quick · TOEIC · TOEFL · Thi trên máy (CBT) · Tài nguyên · phương pháp · liên hệ · ý tưởng | có screen Kit, chưa port |
| A7 Cài đặt & tài khoản | Cài đặt · Tài khoản / đồng bộ (sheet) · Đăng xuất · xóa tài khoản · Bàn giao đăng nhập add-on · Báo lỗi / góp ý | có screen Kit, chưa port |
| A8 Popup/sheet chung | Bảng thông báo · Popup chuỗi (đóng băng/mất/cột mốc) · Thẻ chia sẻ · Chọn ngôn ngữ · chọn kỳ thi · popup giải đấu · Modal/confirm/toast chung · cookie · banner add-on · tìm kiếm | có screen Kit, chưa port |
| V Video | Học qua video | đang làm |
| W1 Web nhóm 1 | Landing · mẫu · speaking · bài blog · hub blog | PR chờ duyệt |
| W2a Web nhóm 2a | Từ vựng hub/bộ · ngữ pháp · từ SEO · hội thoại | có screen Kit, chưa port |
| W2b Web nhóm 2b | Từ điển · CEFR test/kết quả · TOEIC · video | có screen Kit, chưa port |
| W3a Web nhóm 3a | About · research · embed · privacy/terms · credits | có screen Kit, chưa port |
| W3b Web nhóm 3b | Schools · 404 · bye · chọn ngôn ngữ blog | có screen Kit, chưa port |
| W4 Admin | Admin: KPI · bảng · media · studio · khóa (5 kiểu) | có screen Kit, chưa port |
| X1 Add-on | Add-on: popup · Add-on: tab mới · Add-on: popup từ trên trang + FAB/tooltip/toast · Add-on: gạch chân & gợi ý viết | có screen Kit, chưa port |
| E1 Email · OG | Thư tuần (weekly-digest) · Ảnh OG / mạng xã hội | có screen Kit, chưa port |
| -  | Trung gian: luyện chuyển ý | PR chờ duyệt |

Không cần Stitch: Ảnh cửa hàng (Chrome/iOS/Play) (chụp từ màn khác); web/design/gallery.html (QA nội bộ). Sitemap/rss/robots không hiển thị.
Brief từng lô (≤15 dòng): side-session-notes `stitch-batches.md`. Mỗi lô cần chủ duyệt ảnh; tối đa 2 phiên port cùng lúc.
