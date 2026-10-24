# REMINDERS – nhắc học thông minh (24/10/2026)

Mục tiêu đo được: tỉ lệ đồng ý ≥ 40 % ở lần hỏi mềm, CTR ≥ 8 % theo mẫu, hủy đăng ký < 5 %/tháng; 0 byte khung app; 0 dòng D1 người dùng; 100 % miễn phí.

## 1. Kiến trúc (một nguồn lập lịch)
| Kênh | Khi app đóng | Ai gửi | Nội dung |
|---|---|---|---|
| App gốc – LocalNotifications (CHÍNH) | ✓ hệ điều hành tự bắn | máy (không máy chủ) | cá nhân hóa đầy đủ, đã dịch |
| App gốc – FCM (cờ `FCM_ON`) | ✓ | cron Worker `lexkite-push` → FCM HTTP v1 | kéo lại sau ≥ 3 ngày không mở app + tiến bộ tuần; câu 15 ngôn ngữ `workers/push/copy.json` (thiếu → en, không bao giờ vi) |
| Web/PWA – Web Push (cờ `PUSH_PCT`) | ✓ (iOS chỉ khi đã thêm vào MH chính) | cron Worker → push RỖNG (VAPID) | service worker lấy kế hoạch 7 ngày đã dịch trong cache `lk-meta` |
| Web – trong app / Periodic Sync | khi trang mở / Chrome đã cài | máy | như trên |

- **`web/js/remind.js`** (gói lười `remind`, nhóm i18n `remind`): `Remind.plan()` thuần – giờ = 30 phút trước giờ hay học (histogram `stats.hours`, cần ≥ 8 lượt / 3 ngày; không đủ → giờ người dùng chọn hoặc 20:00); giờ yên lặng (mặc định 22:00–07:00) dời ra mép; ≤ 1/ngày; ngày kể từ lần mở app cuối `[0,1,2,3,5,7,10,14]` = giãn cách sau 3 lần bỏ qua, ngày 14 "Kit nhớ bạn" là lời cuối rồi dừng; nội dung theo ngày: chuỗi sắp mất (chỉ khi chưa học hôm nay) → thẻ đến hạn / từ trong sổ kèm câu ngữ cảnh (P2-1.1 `ctx`) / bài tự tin xoay vòng → tiến bộ tuần (Chủ nhật); 15 mẫu, không lặp mẫu trong 7 ngày (`lk.remh`). Liên kết sâu: `#/review`, `#/review?w=<từ>`, `#/confidence`, `#/stats`, `#/home`.
- App gốc: mỗi lần mở app / lưu Cài đặt → hủy & lên lịch lại cả chu kỳ (id 100–111). Có FCM → lịch cục bộ chỉ giữ ngày 0–2, máy chủ lo ngày ≥ 3 + tuần. Lên lịch lại nền: FCM chính là "lần chạm" khi app đóng lâu; Background Runner chưa dùng (cần plugin native riêng – để sau).
- Khung app: `app.js`/`native.js` chỉ gọi `App.need('remind')` (khung giảm ~2,2 KB gz). `settings` nạp kèm `remind`.

## 2. Máy chủ (`functions/api/push.js`) – D1 NỘI BỘ `lexkite-internal` (coordDb), không có D1B → 503, không bao giờ ghi D1 người dùng
- `push_subs`: 1 dòng/thiết bị (id = sha256(endpoint|token)), `k` web|fcm, `tz` IANA, `lmin` giờ địa phương, `q1/q2` giờ yên lặng, `lang`, `act/std` ngày địa phương mở app/học, `last`, `n`, `done`. Chỉ mục `(slot, last)`.
- `slot` (UTC) do máy chủ tính từ `tz + lmin` bằng `Intl` cho NGÀY kế tiếp → đúng đổi giờ mùa hè; tính lại sau mỗi lần gửi và mỗi `touch`. Cron vẫn kiểm giờ ĐỊA PHƯƠNG (cửa sổ 40 phút) + giờ yên lặng địa phương. Đi du lịch/đổi ngôn ngữ → máy khách `touch` (chỉ khi chữ ký `lmin|quiet|tz|lang`, ngày mở app hoặc "đã học" đổi → ≤ 2 ghi/ngày/thiết bị).
- Cron `*/10` (Worker `workers/push`, jobs.json id `push`, ưu tiên publishing): `{op:'due'}` → cờ → ngân sách D1 nội bộ (`d1Usage('b')` ≥ trần 70 % → bỏ lượt) → truy vấn theo khung slot `[now-30, now]` LIMIT 120 → `pickDue` ≤ 40 → cập nhật `last/n/slot` từng dòng. Lượt gọi ra/lượt ≤ 43 (< 50 gói Free). 404/410/UNREGISTERED → `{op:'gone'}` xóa.
- Chống SSRF: endpoint chỉ nhận máy chủ push thật (`PUSH_HOST`). Payload Web Push RỖNG (không dữ liệu cá nhân qua dịch vụ push, không cần mã hóa).
- Số liệu: `ntf_daily(day,k,n)` – shown/open theo mẫu, ask_yes/no, optin/optout, sent, subs, unsub, gone (+ điểm Analytics Engine khi bật binding HITS). Quản trị › 📣 Thông báo › thẻ "⏰ Nhắc học" (`web/js/admin-push.js`, đọc 30 ngày theo khóa ngày – không quét).

## 3. Hỏi quyền (không dark pattern)
- Không bao giờ hỏi lúc mở app. Hỏi mềm 1 lần sau bài học hoàn thành đầu tiên (`lexkite:practice-done` / `test-done` / màn kết thúc ôn tập) chỉ khi quyền hệ thống còn "chưa hỏi"; "Để sau" ngang hàng "Có". Cài đặt › Nhắc học: bật/tắt, giờ, tự động theo thói quen, giờ yên lặng, 5 loại, "Nhắc cả khi đóng app" (nhóm thử), hướng dẫn iOS thêm MH chính, báo khi hệ điều hành chặn.

## 4. Cờ & quay lại
| Cờ (bí mật Pages) | Mặc định | Ý nghĩa |
|---|---|---|
| `PUSH_PCT` | `10` (24/10) | % thiết bị (ngẫu nhiên cố định/máy) được thấy Web Push; `0` = tắt hẳn (cron trả rỗng, đăng ký mới 400) |
| `FCM_ON` | chưa đặt (tắt) | `1` = app gốc đăng ký token FCM + cron gửi FCM |
| `VAPID_PUBLIC`, `PUSH_CRON_SECRET` | đã đặt | khóa công khai VAPID; bí mật cron (cũng ở Worker) |
Worker: `PUSH_CRON_SECRET`, `VAPID_PUBLIC`, `VAPID_PRIVATE_JWK`, `FCM_SA` (JSON service account). Bản sao khóa: `~/.config/lexkite/vapid.json` (chmod 600, không in). Tắt khẩn: `PUSH_PCT=0` (hoặc `wrangler delete` Worker) – lịch cục bộ vẫn chạy.

## 5. Việc của chủ (FCM – chỉ làm khi muốn bật `FCM_ON`)
1. **APNs key** (iOS): developer.apple.com › Certificates, IDs & Profiles › Keys › "+" › tick **Apple Push Notifications service (APNs)** › tải file `.p8` (ghi Key ID, Team ID). Identifiers › `com.lexkite.app` › bật **Push Notifications** › lưu (tạo lại profile nếu Xcode báo).
2. console.firebase.google.com › dự án **lexkite-app** › ⚙️ Project settings › **Cloud Messaging** › Apple app configuration › **Upload** APNs Authentication Key (.p8 + Key ID + Team ID).
3. Xcode: target App › Signing & Capabilities › **+ Push Notifications** và **+ Background Modes › Remote notifications** (tạo `aps-environment` trong `App.entitlements`) – hoặc báo em thêm vào repo khi App ID đã bật Push.
4. Service account: console.cloud.google.com/iam-admin/serviceaccounts?project=lexkite-app › Create › tên `lexkite-push` › vai trò **Firebase Cloud Messaging API Admin** › Keys › Add key › JSON. Sau đó trong Terminal của anh (KHÔNG dán vào chat): `cd workers/push && CLOUDFLARE_API_TOKEN=$(cat ~/.config/lexkite/cf-token) npx wrangler secret put FCM_SA < ~/Downloads/<file>.json` rồi xóa file tải về.
5. Bật: `wrangler pages secret put FCM_ON` (giá trị `1`) – app gốc bản kế tiếp (đã có plugin `@capacitor-firebase/messaging`) tự đăng ký.

## 6. Test
`scripts/test/reminders.mjs` (npm test): lập lịch ở 4 múi giờ thật (Asia/Ho_Chi_Minh, America/New_York qua mốc DST 01/11, Asia/Kolkata +5:30, Pacific/Auckland) – đúng giờ địa phương, ≤ 1/ngày, giờ yên lặng, giãn cách, lời cuối ngày 14, không lặp mẫu 7 ngày, lọc loại, FCM chỉ ngày ≥ 3; máy chủ `slotFor`/`pickDue` cùng 4 múi + DST; chống SSRF; SW push/click; câu FCM 15 ngôn ngữ (`scripts/push-copy.mjs --check`). Cùng các cổng chung: i18n-missing/qa/leak/switch, size-budget, axe, d1-scan, jobs-check, infra-check.
