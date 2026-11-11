# Admin IA v2 (11/11) – menu theo việc quản lý

> TL;DR: menu 7 nhóm theo việc anh làm; mỗi khái niệm một chỗ, cảnh báo gom một nơi, mỗi số một nguồn. Không bỏ chức năng, mọi hash cũ giữ nguyên. Nền: [admin-audit.md](admin-audit.md) (hub, `ALIAS`, `METRICS` đã có).
> Đọc khi: sửa `web/js/admin.js` (NAV/HUBS/ALIAS), thêm tab, đổi banner/dải luồng.

## 1. Lỗi thấy trên #drive (ảnh chủ 11/11) → sửa ở đợt 1
| Lỗi | Gốc | Sửa |
|---|---|---|
| Dải quy trình video hiện ở Kho Drive (Hệ thống) | `FLOW_TABS` có `drive` | bỏ `drive` khỏi `FLOW_TABS`; dải chỉ ở Studio/Video/Phân phối/Social |
| Banner CI lặp 2 lần | `drvBanner` (đầu trang) + danh sách `d.alerts` trong thân Drive | thân Drive lọc `NOT_DRIVE` (ci, deploy, backup\_\*, capacity\*, d1, gitsize); banner + Trung tâm cảnh báo là nơi duy nhất |
| "Connect Google Drive" nổi bật dù đã có 25 Drive | nút luôn `primary` | có Drive → nút phụ "➕ Thêm Drive"; chưa có → primary "Kết nối" |
| 119/403 GB ≠ 111/375 GB | `flowStats` lọc `status IN (ok,pending)` + đệm 60 s; `drive.js list` cộng mọi hàng | cùng tập hàng (không lọc); dải không còn ở Drive nên một nguồn hiển thị = tab Kho Drive |
| Tab con chồng tab con | hub Hệ thống › Drive › Tổng quan/File/Sổ cái | giữ 2 tầng nhưng khác kiểu (hub = nút `.hub-tabs`, trong trang = pill); đợt 3 gộp lên một thanh |

## 2. Cây menu mới
| Nhóm | Mục (hash) |
|---|---|
| — | **Hôm nay** `#overview` (hàng đợi việc + số chính) |
| Người học | Phân tích `#analytics` · Người dùng `#users` · Hộp thư `#inbox` · Báo lỗi `#reports` · Gửi tới người học `#notices` |
| Nội dung & Video | Studio `#studio` · Trung tâm video `#video` |
| Phân phối | Kênh & phân phối `#dist` · Video & Social `#social` · Backlink, PR & Thương hiệu `#backlinks` |
| Doanh thu | Quảng cáo `#ads` |
| Hệ thống | Trung tâm cảnh báo `#alerts` · Sức khỏe hệ thống `#health` (Hạn mức · Lưu trữ · Chất lượng · **Kho Drive**) · Tài khoản & khóa `#vault` (Sổ tài khoản · Khóa API · Dịch vụ) |
| — | Cài đặt `#settings` |

Đổi so với trước: nhóm "Vận hành" → **Hệ thống** (xuống dưới Doanh thu); "Nội dung & Video" tách **Phân phối** (dist, social, backlinks). Chỉ đổi nhóm/thứ tự, khóa hash giữ nguyên.

## 3. Quy tắc một chỗ
- **Cảnh báo:** `drive_alerts` + `alerts` hiện đúng 2 nơi: banner đầu trang (1 dòng + "+n") và Trung tâm cảnh báo. Trang nghiệp vụ chỉ hiện cảnh báo của chính nó (Drive: kết nối/replica/quota), không lặp CI/deploy.
- **Số liệu:** mỗi số một hàm/nguồn (`METRICS` ở admin.js; tổng Drive = `drive.js list`). Thẻ tóm tắt nơi khác phải cùng tập hàng/ngưỡng, hoặc chỉ là link không kèm số.
- **Primary** = việc chính của trạng thái hiện tại; "Kết nối" không primary khi đã có dữ liệu.
- **Hash cũ:** `ALIAS` + `HUBS` (`#quota #storage #quality #drive/… #keys #accounts #services #today #growth`) giữ; `admin-tabs.mjs` kiểm.

## 4. Mẫu Stitch (khung/thẻ/bảng/rỗng/lỗi + điện thoại)
Ref sẵn: `brand/stitch/v3/admin/adm-*-{light,dark}.html` (+ `-m-` điện thoại). Khung trang = crumb + h1 + mô tả + vùng hành động; thẻ = `.card` (tiêu đề, số, màu từ `lvc()`); bảng = `dataTable` (điện thoại → thẻ, PR #552); rỗng = lời giải thích + 1 nút; lỗi = `errBox` + Thử lại; tải = khung xương `aria-busy`. Màn đổi bố cục vẽ trên Stitch → port → cổng SSIM; ảnh visual-qa CI 390/1440 sáng/tối.

## 5. Đợt PR
1. **Đợt 1:** menu 7 nhóm, sửa Drive/Hệ thống (mục 1), spec, test.
2. **Đợt 2:** Nội dung & Video + Phân phối: một khái niệm một chỗ cho lịch (dist/social/studio) và duyệt (video/social); bỏ lặp kênh giữa `#video` "Kênh & phân phối" và `#dist`.
3. **Đợt 3:** màn còn lại: Drive một tầng tab, R6/R7/R11 (dialog gốc, API rỗng, khóa cấu hình), gom banner đầu trang (Cài đặt) với Gửi tới người học.

## 6. PR admin đang mở (11/11)
- **#597 Báo lỗi, #541 Stitch refs:** giao nhóm B (local_51138b22) hoàn tất + gộp; đợt 1 không sửa 2 PR này.
- **#552 Admin điện thoại (draft), #362 #analytics (draft):** cũ (02–04/11) → rebase + CI xanh rồi gộp, hoặc lấy ý (bảng→thẻ, thang Nền tảng chung) vào đợt 3; không viết trùng.
