# Đối chiếu spec ↔ main (12/11/2026) – cái gì xong, dở, chưa làm

> TL;DR: Cập nhật 12/11: #8, #9 xong (#1136, #1125); #5 xong M1 (#1167, cờ tắt), còn link + AI nghĩa. #11/#12 do play-community; gia sư mới có logic, chưa có màn.
> Cơ sở: `real/main` 42ea12f48 + PR mở tra qua API 12/11. Chỉ đọc mã/PR, chưa chạy app. Cột Bằng chứng = tệp hoặc PR.

## upgrade-2026-11.md (12 hạng mục)
| # | Hạng mục | Trạng thái | Bằng chứng / còn thiếu |
|---|---|---|---|
| 1 | Top bar gọn | PARTIAL | `st/v2/today*.js`, `streak-ui.js`; chưa có test CTA ở 360×640 (chưa tìm thấy) |
| 2 | Rung + sắc thái giờ | DONE | #665 (`c79b6577b`) |
| 3 | Giáo viên cảm xúc | DONE | #829, `web/js/teacher-mood.js` |
| 4 | % tiến độ thẻ | PARTIAL | #823/#826 (Today/Path) — cần xác nhận `st/v2/path.js` hiện % |
| 5 | Nhập PDF/ePub/link → bộ thẻ | PARTIAL | M1 DONE #1167 (`cpack/importdeck-app`, cờ `importdeck` TẮT); còn `/api/readable` (link) + AI điền nghĩa, nhãn nguồn thẻ nhập |
| 6 | Tab mới câu đố 10 s | DONE | #664; E2E sửa #852 |
| 7 | Kiểm tra đầu vào vào luồng mới | DONE | #584 mời placement |
| 8 | Nhập vai + shadowing | DONE | #1136: 2 tình huống mới + `pron/shadow.js` (nói đuổi liên tục); chấm mức âm chờ mô hình thiết bị `Gop` |
| 9 | Sổ lỗi thông minh | DONE | #1125 mini-test biến thể (`mistake-variant.js`) + hẹn FSRS; còn ghi lỗi tra cứu từ add-on |
| 10 | Lượt AI nhờ ôn thẻ | PARTIAL | `functions/api/aiearn.js` + `scripts/test/aiearn.mjs` có; chưa xác nhận UI "ôn N thẻ → +lượt" |
| 11 | Thách đấu 1v1 / ghost duel | NOT DONE | chỉ `league.js` (bảng xếp hạng); #554 có "thách đấu bạn" 60 s trong Play (một phần nền) |
| 12 | Kho thẻ/đề cộng đồng | PARTIAL | API an toàn `functions/api/community.js` (#550, cờ TẮT); chưa UI tạo/chia sẻ/danh mục |

## Các spec khác
| Spec | Trạng thái | Bằng chứng / còn thiếu |
|---|---|---|
| content-upgrade-2 | PARTIAL | điểm nội dung 66/100 (mục tiêu ≥75→95); Trung gian đủ 30 bài (#982, #1025); O5 en gốc #1045 còn mở |
| play-and-speak | PARTIAL | M1: `cpack/speak`, `play-app`, Thử thách 60 s (#554); F5 thả diều, F6 bản đồ âm, F8 karaoke, F9 đua bạn chưa thấy |
| community | PARTIAL | đợt 1 API (#550); UI/đợt 2+ chưa |
| import-to-deck | PARTIAL | xem #5 |
| tutor-daily | PARTIAL | M1 logic `web/js/tutor/core.js` + `scripts/test/tutor.mjs`; M2 Stitch, M3 UI `#/tutor`, nhắc `tutor` chưa có |
| outcomes-3-6m | PARTIAL | mốc 1 `#/outcome` (`cpack/outcomes*`); mốc 2 thẻ lỗi→FSRS, vòng ngày, mốc 3 chưa |
| Kế hoạch bất quy tắc (#1054 + #1053) | NOT MERGED | #1054 "Bảng động từ bất quy tắc" và #1053 "Audit tổng" còn mở (feat-finish giữ) — không đụng |

## Thứ tự làm tiếp (giá trị/chi phí)
1. #9 mini-test biến thể + FSRS (nhỏ, nền sẵn) · 2. #8 shadowing + 2 tình huống · 3. #11 ghost duel · 4. #5 nhập tệp · 5. #12 UI cộng đồng · 6. gia sư M3.
