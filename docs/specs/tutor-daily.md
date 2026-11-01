# Gia sư 1-1 hằng ngày (Ama / Carlos) – spec-lite (01/11/2026)

> TL;DR: Mỗi ngày gia sư chọn sẵn một **buổi 5–15 phút** (ôn FSRS + sửa lỗi cũ + 1 bài mới + 1 lượt nói), nói lời cá nhân bằng mẫu soạn sẵn, nhắc **≤ 1 lần/ngày** đúng giờ người học hay học, báo cáo tuần ngắn. Toàn bộ logic chạy trên máy (`web/js/tutor/core.js`), server không thêm bảng hay dòng nào → $0 ở mọi quy mô cho phần gia sư.
> Đọc khi: sửa "Buổi học hôm nay", thẻ gia sư ở trang chủ, lời gia sư, lời nhắc giọng gia sư.

## 1. Đã có, chỉ dùng lại (kiểm kê 01/11)
| Có sẵn | Ở đâu | Gia sư dùng thế nào |
|---|---|---|
| FSRS-5 + R(t) | `core.js` SRS | `due[{id, r}]`, R thấp ôn trước |
| Kế hoạch hôm nay (danh sách liên kết) | `plan.js` `App.todayPlan` | giữ nguyên; thẻ gia sư thay phần "việc chính" khi bật cờ |
| Ngày N trộn dạng bài | `path-day.js` `DayPath.todayTask` · lộ trình v3 `PathV3.recommend` (PR #315) | nguồn của "1 bài mới" |
| Sổ lỗi sai | `plan.js` `App.logMistake` (`mistakes`) | nguồn "sửa lỗi cũ", "lỗi hôm qua" |
| Nhắc học: ≤ 1/ngày, giờ theo thói quen, giờ yên lặng, giãn 0-1-2-3-5-7-10-14 rồi dừng, Web Push rỗng VAPID, Periodic Sync, add-on `alarms`, LocalNotifications | `remind.js`, `functions/api/push.js`, `workers/push`, `extension/background.js`, `docs/REMINDERS.md` | chỉ thêm **loại `tutor`** (nội dung giọng gia sư); lịch giữ nguyên |
| Chuỗi ngày, đóng băng (+1/7 ngày, tối đa 2), mốc, rương | `app.js`, `retention.js`, `docs/RETENTION.md` | gia sư chỉ khen ở mốc, không bao giờ nhắc "mất chuỗi" |
| Tốc độ học (pace 10/20/40) | `onboard.js` | 5 / 10 / 15 phút; chỉnh trong Cài đặt (`tutorMins`) |
| Trí nhớ người học | `call/memory.js` (PR #311, chưa gộp) | gia sư **đọc** qua adapter; không viết bản thứ hai |
| Mặt vẽ khớp miệng | PR #293 · chỗ giáo viên chung PR #314 | thẻ gia sư dùng đúng khung đó |
| Báo cáo tuần (mẫu Stitch) | PR #267 (HOLD) | dùng lại màn đó, nạp số từ `Tutor.week` |

## 2. Thiết kế (mỗi quyết định có nguồn)
- **Buổi học** `Tutor.session`: khởi động 1–2 thẻ R cao (thắng nhanh) → sửa ≤ 3 lỗi (hôm qua trước) → ôn FSRS khối 1 → 1 bài mới → ôn khối 2 → 1 lượt nói. Thẻ dư để dành, không mất.
  - Ôn đúng lúc sắp quên: FSRS ([Ye và cs., KDD 2022](https://dl.acm.org/doi/10.1145/3534678.3539081)); gợi nhớ chủ động ([Roediger & Karpicke 2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x)).
  - Xen kẽ dạng bài thay vì dồn khối ([Rohrer & Taylor 2007](https://doi.org/10.1007/s11251-007-9015-8)).
  - Vừa sức ≈ 80–85 % đúng ([Wilson và cs. 2019, "85 % rule"](https://doi.org/10.1038/s41467-019-12552-4)): đúng 7 ngày < 70 % → buổi ngắn hơn, chưa thêm bài mới; > 92 % → bài mới khó hơn một nấc.
  - Kết bằng lượt nói vui (quy tắc đỉnh–kết, [Kahneman và cs. 1993](https://doi.org/10.1111/j.1467-9280.1993.tb00589.x)).
- **Lời gia sư** `Tutor.line`: chào theo tên + giờ địa phương, "mừng quay lại" sau ≥ 2 ngày nghỉ, nhắc đúng lỗi hôm qua, khen **cụ thể** (độ chính xác +x %, số từ đã thuộc, âm vừa luyện; khen quá trình, không khen "thông minh": [Mueller & Dweck 1998](https://doi.org/10.1037/0022-3514.75.1.33)), mục tiêu nhỏ có số phút ([Gollwitzer 1999](https://doi.org/10.1037/0003-066X.54.7.493)). Không lặp mẫu 7 ngày; trong ngày giữ cùng câu.
  - Chữ: khóa tiếng Việt → I18N 15 ngôn ngữ (gói lười `tutor`). Lời nói: câu tiếng Anh ≤ 12 từ, **Kokoro sinh sẵn trên CI** (Ama nữ, Carlos nam) + clip từ có sẵn cho `{w}`; số chỉ hiện trên màn, không đọc → không cần TTS lúc chạy. AI (Nano / bậc A) chỉ là tuỳ chọn viết lại câu, đối chiếu mẫu duyệt.
- **Nhắc học**: dùng `Remind.plan` (đã đúng: ≤ 1/ngày, giờ học thật, giãn khi bị bỏ qua, dừng sau ngày 14, giờ yên lặng, tắt/đổi giờ ở Cài đặt). Thêm loại `tutor` (`Tutor.nudge`): "Ama: Hôm qua 'affect' hơi khó – thử lại 1 phút nhé?". Bỏ hẳn câu kiểu "chuỗi đang gặp nguy". Cơ sở giãn nhắc: [Yancey & Settles, KDD 2020 (Duolingo)](https://doi.org/10.1145/3394486.3403351); thói quen gắn với cùng giờ ([Lally và cs. 2010](https://doi.org/10.1002/ejsp.674)); tự chủ – người học chọn giờ, tắt được ([Ryan & Deci 2000](https://doi.org/10.1037/0003-066X.55.1.68)).
- **Không gây tội lỗi**: test cấm từ (nguy, mất chuỗi, lười, lose, last chance…) trên mọi mẫu; đóng băng chuỗi sẵn có; không đếm ngược, không bán gì (RETENTION §3).
- **Báo cáo tuần** `Tutor.week`: số ngày, phút, từ đã thuộc, kỹ năng tăng nhiều nhất (≥ 10 lượt mỗi tuần, ≥ +3 %), trọng tâm tuần tới = kỹ năng < 80 % hoặc nhiều lỗi nhất. Ít dữ liệu → không khen bừa.

## 3. Kỹ thuật $0 ở 1 triệu người/ngày
- Chọn bài, lời gia sư, báo cáo tuần: thuần JS trên máy, ~5 KB gz, gói lười (`tutor`), **0 byte vào shell** (trần 377 KB gz). Lịch sử mẫu (7 dòng) chỉ ở `localStorage`.
- Server: **0 bảng, 0 dòng mới**. Đồng bộ đi theo `game`/`meta` sẵn có (PR #318).
- Kênh nhắc theo chi phí server: LocalNotifications (app gốc), add-on `alarms`, Periodic Sync (PWA Chromium đã cài) = **0 lượt gọi**, không giới hạn quy mô. Web Push (VAPID, payload rỗng): mỗi lần gửi = 1 subrequest + 1 dòng ghi D1 nội bộ. Gói Free: [Workers 100.000 lượt/ngày, 50 subrequest/lượt](https://developers.cloudflare.com/workers/platform/limits/), [D1 100.000 dòng ghi/ngày](https://developers.cloudflare.com/d1/platform/pricing/) → trần thực tế ≈ 43 × 1.440 lượt cron (`*/1`) ≈ **60.000 push/ngày**, không đủ 1 triệu. Vì vậy Web Push chỉ cho thiết bị **không có kênh trên máy** (Safari/iOS PWA, Firefox), giữ cờ `PUSH_PCT` + cầu dao D1 70 % sẵn có; vượt trần → bỏ lượt, người học vẫn có thẻ gia sư khi mở app. Không SMS, không email trả phí.

## 4. Màn (Stitch, Lexkite Kit, khung 390 px, sáng/tối – chủ duyệt ảnh trước khi port)
S1 "Buổi học hôm nay" (gia sư + 4 bước + nút lớn Bắt đầu, thanh tiến độ trong buổi) · S2 thẻ gia sư trên trang chủ (sau #284/#314) · S3 Cài đặt nhắc (bật/tắt, giờ, tự theo thói quen, thời lượng 5/10/15, giáo viên). Giáo viên đặt theo khung chung #314.

## 5. Mốc & cổng
- **M1 (PR này, chỉ logic, gộp khi xanh)**: `web/js/tutor/core.js` + `scripts/test/tutor.mjs` (163 kiểm: chọn bài trong ngân sách, xen kẽ, vừa sức, biên, múi giờ HCM/NY qua đổi giờ/Kolkata/Auckland, lời gia sư không lặp/không tội lỗi/đúng giọng, báo cáo tuần, nhắc). Chạy kèm `reminders.mjs` vì `package.json` đang bị #311/#314/#317/#318 giữ.
- **M2**: Stitch S1–S3 (refs sáng/tối) → ảnh gửi anh duyệt.
- **M3** (sau #284, #314, #293, #311): adapter `tutor/ui.js` (route `#/tutor`, cờ `lk.tutor`), i18n 15 ngôn ngữ (I18N-PIPELINE), câu Kokoro vào `corpus.mjs`, loại nhắc `tutor` trong `remind.js` + `workers/push/copy.json`, e2e cả buổi trong QA bot, đo **mở app → bài đầu tiên** (cổng p95 ≤ 2,5 s trên CPU 4×), ảnh trước/sau → anh duyệt rồi mới gộp.
