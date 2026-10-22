# Lớp học (Teacher / Classroom mode)

Mô hình: như Kami (18 triệu người dùng nhờ trường học) – giáo viên tạo lớp, giao bài qua Google Classroom, nhà trường cài add-on cho cả tên miền.

## Thành phần
| Phần | File |
|---|---|
| API | `functions/api/class.js` – POST `/api/class` (Firebase ID token). Lõi `run(db, uid, req, now)` tách khỏi xác thực để test |
| D1 `lexkite-sync` | `classes` (id, code UNIQUE, owner, name) · `class_member` (cls, uid, name, joined, last) · `class_task` (id, cls, ref, due) · `class_progress` (task, uid, cls, best, last, tries, updated) |
| Giao diện | `web/js/classroom.js` (bundle `classroom`, tải lười) – route `#/class`, `#/class/join/<MÃ>[?task=<ref>]`, `#/class/<id>` |
| Chuỗi | `web/js/i18n/en/classroom.js` (nhóm LAZY) + `scripts/i18n-fixed.json` (nhãn ngắn) |
| Trang nhà trường | `content/legal/{en,vi}/schools.html` → `scripts/build-legal.mjs` → `/<lang>/schools` (15 ngôn ngữ) |
| Quyền riêng tư | `content/legal/*/privacy.html` mục 2, 8, 10 (`#schools`: COPPA/FERPA, không quảng cáo) |
| Hạn mức | `_quota.js` tính năng `classroom` (30/phút, 1.500/ngày/uid); tham gia lớp 10 lần/10 phút (chống dò mã) |
| Test | `scripts/test/classroom.mjs` (SQLite: tạo → tham gia → giao → tiến độ → báo cáo → xóa, xóa tài khoản) |

## Chi phí D1 (gói miễn phí: 5 triệu dòng đọc · 100.000 dòng ghi · 5 GB/ngày) – ước tính 10.000 học sinh
| Thao tác | Mỗi học sinh/ngày | 10k học sinh/ngày |
|---|---|---|
| `ping` (≤ 1 lần/ngày, chỉ khi đang trong lớp) | 1 ghi (~1–2 dòng `class_member`) | ~15.000 ghi |
| `progress` khi xong bài được giao (giả định 3 lượt; 1 dòng gộp/bài, KHÔNG ghi từng câu) | ~3 ghi · ~6 đọc | ~30.000 ghi · 60.000 đọc |
| `mine` khi mở #/class (giả định 1 lần) | ~10 đọc | 100.000 đọc |
| Giáo viên `report` (333 lớp × 30 em × 20 bài, 5 lần/ngày) | – | ~1.000.000 đọc |
| **Tổng** | | **~45.000 ghi (45%) · ~1,2 triệu đọc (24%)** · lưu trữ ~200 B/dòng → 10k × 20 bài ≈ 40 MB |
Thiết kế giữ rẻ: tiến độ 1 dòng/(bài, học sinh) cập nhật tại chỗ (best/last/tries), không lưu từng câu trả lời; 1 batch/lượt; `last` chỉ ghi qua ping 1 lần/ngày; báo cáo đọc theo chỉ mục `cls`. Vượt 80% → đệm `report` trong Cache API 60 s.

## Bài giao (`ref`) – chỉ nội dung có sẵn
| ref | Mở | Ghi tiến độ khi |
|---|---|---|
| `topic:<id>` | `#/topic/<id>` | study.js phát `lexkite:practice-done` `{src:'topic:<id>', pct}` (Kiểm tra/Ghép thẻ/quiz có điểm) |
| `il:<n>` (1–10) | `#/listen-test/<n>` | qtips.js `QT.record('il')` → `lexkite:test-done` (hoặc thi thử `#/mock/run?l=<n>`) |
| `ir:<n>` (1–10, GT 101–105) | `#/mock/run?s=reading&r=<n>` | `QT.record('ir')` trên trang mock |
| `toeic:<n>` (1–7) | `#/toeic-test/<n>` | `QT.record('tl')` + `('tr')` gộp trong 2,5 s |

Thêm loại bài mới: mở rộng `cleanRef` (API) + `info()`/`NUM` + bộ nghe sự kiện trong `classroom.js`.

## Luồng học sinh
- `mine` đặt cờ `lk.cls=1` (đang học ≥ 1 lớp) và `lk.edu=1` (tài khoản lớp học → `ads.js` tắt quảng cáo).
- `sync.js` (onAuth): có `lk.cls` → `App.need('classroom')` để nghe sự kiện xong bài ở mọi trang. Mất mạng → hàng đợi `lk.clsq` (≤ 20), gửi lại cùng `ping` (≤ 1 lần/ngày).

## Dữ liệu tối thiểu
Chỉ uid + tên hiển thị học sinh tự nhập (1–40 ký tự, chặn email/link/từ tục) + kết quả bài giao. Không email/ảnh cho giáo viên, không quyền Google Classroom (nút chia sẻ = `classroom.google.com/share?url=…&title=…&body=…`). Xóa lớp/xóa học sinh/rời lớp xóa ngay; xóa tài khoản dọn qua `account.js` `DELETE_SQL`.

## Giới hạn
30 lớp/giáo viên · 300 học sinh/lớp · 200 bài/lớp · 20 lớp/học sinh.
