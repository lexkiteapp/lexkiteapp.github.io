# REMINDERS – nhắc học thông minh (24/10/2026)

> TL;DR: Nhắc học thông minh: một nguồn lập lịch, máy chủ push.js (D1 nội bộ), hỏi quyền không dark pattern, cờ, FCM, test. Mục tiêu đồng ý ≥40%, CTR ≥8%, hủy <5%/tháng.
> Đọc khi: sửa nhắc học/push.

Mục tiêu đo được: tỉ lệ đồng ý ≥ 40 % ở lần hỏi mềm, CTR ≥ 8 % theo mẫu, hủy đăng ký < 5 %/tháng; 0 byte khung app; 0 dòng D1 người dùng; 100 % miễn phí.

## 1. Kiến trúc (một nguồn lập lịch)
| Kênh | Khi app đóng | Ai gửi | Nội dung |
|---|---|---|---|
| App gốc – LocalNotifications (CHÍNH) | ✓ hệ điều hành tự bắn | máy (không máy chủ) | cá nhân hóa đầy đủ, đã dịch |
| App gốc – FCM (mặc định bật, `FCM_ON=0` tắt khẩn) | ✓ | cron Worker `lexkite-push` → FCM HTTP v1 | kéo lại sau ≥ 3 ngày không mở app (ngày 0–2 kể cả tiến bộ tuần = lịch cục bộ, không trùng ngày); câu 15 ngôn ngữ `workers/push/copy.json` (thiếu → en, không bao giờ vi); lời mới thay lời cũ (tag/`apns-collapse-id`) |
| Web/PWA – Web Push (cờ `PUSH_PCT`) | ✓ (iOS chỉ khi đã thêm vào MH chính) | cron Worker → push RỖNG (VAPID) | service worker lấy kế hoạch 7 ngày đã dịch trong cache `lk-meta` |
| Web – trong app / Periodic Sync | khi trang mở / Chrome đã cài | máy | như trên |

- **`web/js/remind.js`** (gói lười `remind`, nhóm i18n `remind`): `Remind.plan()` thuần – giờ = 30 phút trước giờ hay học (histogram `stats.hours`, cần ≥ 8 lượt / 3 ngày; không đủ → giờ người dùng chọn hoặc 20:00); giờ yên lặng (mặc định 22:00–07:00) dời ra mép; ≤ 1/ngày; ngày kể từ lần mở app cuối `[0,1,2,3,5,7,10,14]` = giãn cách sau 3 lần bỏ qua, ngày 14 "Kit nhớ bạn" là lời cuối rồi dừng; nội dung theo ngày: chuỗi sắp mất (chỉ khi chưa học hôm nay) → thẻ đến hạn / từ trong sổ kèm câu ngữ cảnh (P2-1.1 `ctx`) / bài tự tin xoay vòng → tiến bộ tuần (Chủ nhật); 15 mẫu, không lặp mẫu trong 7 ngày (`lk.remh`). Liên kết sâu: `#/review`, `#/review?w=<từ>`, `#/confidence`, `#/stats`, `#/home`.
- App gốc: mỗi lần mở app / lưu Cài đặt → hủy & lên lịch lại cả chu kỳ (id 100–111). Có FCM → lịch cục bộ giữ ngày 0–2 (cả tiến bộ tuần), máy chủ chỉ lo ngày ≥ 3. Lên lịch lại nền: FCM chính là "lần chạm" khi app đóng lâu; Background Runner chưa dùng (cần plugin native riêng – để sau).
- **Sửa 2/11** (số đo 24/10–2/11): web dựng kế hoạch với `past` (giữ lời nhắc HÔM NAY dù mở trang sau giờ nhắc – trước đó rơi về `gen1`, 20/32 lượt hiện); người mới (chưa thẻ đến hạn/từ kèm câu) → mẫu `path` (bài đang học dở, `App.pathNext`, loại "Bài đang học") + `gstart` (mục tiêu ngày, theo loại "Mục tiêu").
- Khung app: `app.js`/`native.js` chỉ gọi `App.need('remind')` (khung giảm ~2,2 KB gz). `settings` nạp kèm `remind`.

- **Nâng cấp 26/10** (thuần, test trong `reminders.mjs`): giờ = 30 phút trước giờ BẮT ĐẦU phiên học gần đây (`lk.rems`, cuộn 21 phiên, chỉ trên máy, cần ≥ 5 ngày; phiên mới nặng hơn; trung bình vòng tròn) → rồi mới tới histogram; giờ yên lặng mặc định 22:00–08:00; "chuỗi sắp mất" chỉ khi giờ nhắc ≥ 17:00 và chưa học; học dở mục tiêu ngày → lời nhắc `goal` ("{n}/{g} thẻ", còn {r}); bỏ qua ≥ 3 lời nhắc liên tiếp (đã hiện mà không học) → cách ≥ 2 ngày. Add-on: `sendReminder` tôn trọng giờ yên lặng.

## 2. Máy chủ (`functions/api/push.js`) – D1 NỘI BỘ `lexkite-internal` (coordDb), không có D1B → 503, không bao giờ ghi D1 người dùng
- `push_subs`: 1 dòng/thiết bị (id = sha256(endpoint|token)), `k` web|fcm, `tz` IANA, `lmin` giờ địa phương, `q1/q2` giờ yên lặng, `lang`, `act/std` ngày địa phương mở app/học, `last`, `n`, `done`. Chỉ mục `(slot, last)`.
- `slot` (UTC) do máy chủ tính từ `tz + lmin` bằng `Intl` cho NGÀY kế tiếp → đúng đổi giờ mùa hè; tính lại sau mỗi lần gửi và mỗi `touch`. Cron vẫn kiểm giờ ĐỊA PHƯƠNG (cửa sổ 40 phút) + giờ yên lặng địa phương. Đi du lịch/đổi ngôn ngữ → máy khách `touch` (chỉ khi chữ ký `lmin|quiet|tz|lang`, ngày mở app hoặc "đã học" đổi → ≤ 2 ghi/ngày/thiết bị).
- Cron `*/10` (Worker `workers/push`, jobs.json id `push`, ưu tiên publishing): `{op:'due'}` → cờ → ngân sách D1 nội bộ (`d1Usage('b')` ≥ trần 70 % → bỏ lượt) → truy vấn theo khung slot `[now-30, now]` LIMIT 120 → `pickDue` ≤ 40 → cập nhật `last/n/slot` từng dòng. Lượt gọi ra/lượt ≤ 43 (< 50 gói Free). 404/410/UNREGISTERED → `{op:'gone'}` xóa.
- Chống SSRF: endpoint chỉ nhận máy chủ push thật (`PUSH_HOST`). Payload Web Push RỖNG (không dữ liệu cá nhân qua dịch vụ push, không cần mã hóa).
- Số liệu: `ntf_daily(day,k,n)` – shown/open theo mẫu (web: SW `notificationclick`; app gốc: `Remind.opened()` ngay trong listener; add-on: id `reminder-<t>~<mẫu>|<url>`), ask_show/ask_yes/ask_no theo lần hỏi (`:a1`/`:a2`), optin/optout (`:os` = quyền hệ điều hành ĐỔI, đếm 1 lần/thiết bị qua `lk.remperm` – trước 2/11 đếm lặp mỗi lần lưu Cài đặt), sent, subs, unsub, gone (+ điểm Analytics Engine khi bật binding HITS). Quản trị › 📣 Thông báo › thẻ "⏰ Nhắc học" (`web/js/admin-push.js`, đọc 30 ngày theo khóa ngày – không quét).

## 3. Hỏi quyền (không dark pattern)
- Không bao giờ hỏi lúc mở app; lưu Cài đặt KHÔNG tự xin quyền (chỉ khi người dùng bật "Nhắc học" – `saveSettings({ ask: true })`). Hỏi mềm sau bài học hoàn thành (`lexkite:practice-done` / `test-done` / màn kết thúc ôn tập) chỉ khi quyền hệ thống còn "chưa hỏi"; tối đa 2 lần đời: lần 2 chỉ khi đã "Để sau" + ≥ 7 ngày + ≥ 3 ngày học mới (`askDue`). Hộp hỏi: giáo viên `Chars`, xem trước đúng lời nhắc sẽ nhận, 3 cam kết (đúng giờ hay học · ≤ 1/ngày · không ban đêm), "Để sau" ngang hàng "Có", đóng = để sau. Chờ ref Stitch (hết lượt 2/11) rồi port theo khung Kit. Cài đặt › Nhắc học: bật/tắt, giờ, tự động theo thói quen, giờ yên lặng, 5 loại, "Nhắc cả khi đóng app" (nhóm thử), hướng dẫn iOS thêm MH chính, báo khi hệ điều hành chặn.

## 4. Cờ & quay lại
| Cờ (bí mật Pages) | Mặc định | Ý nghĩa |
|---|---|---|
| `PUSH_PCT` | `10` (24/10) – bậc kế: 50 → 100, mỗi bậc chỉ khi bản sửa 2/11 đã live ≥ 3 ngày, D1 nội bộ < 70 % và hủy (`unsub`+`optout:push`+`gone`)/đăng ký < 5 %; ghi ngày đặt ở đây | % thiết bị (ngẫu nhiên cố định/máy) được thấy Web Push; `0` = tắt hẳn (cron trả rỗng, đăng ký mới 400) |
| `FCM_ON` | chưa đặt = **bật** (05/11, qua mã) | `0` = tắt khẩn. Chỉ hiệu lực khi đủ 3 điều kiện: Worker báo gửi được (`{op:'due', fcm:1}` → nhịp `push_meta` ≤ 2 giờ, tức Worker có `FCM_SA`), app có plugin FirebaseMessaging (`fcmCapable` – iOS 1.0 chưa có → chỉ lịch cục bộ), lấy token ≤ 8 giây. Thiếu 1 → app giữ lịch cục bộ đủ 14 ngày và hủy dòng FCM cũ |
| `VAPID_PUBLIC`, `PUSH_CRON_SECRET` | đã đặt | khóa công khai VAPID; bí mật cron (cũng ở Worker) |
Worker: `PUSH_CRON_SECRET`, `VAPID_PUBLIC`, `VAPID_PRIVATE_JWK`, `FCM_SA` (JSON service account). Bản sao khóa: `~/.config/lexkite/vapid.json` (chmod 600, không in). Tắt khẩn: `PUSH_PCT=0` (hoặc `wrangler delete` Worker) – lịch cục bộ vẫn chạy.

## 5. Việc của chủ (FCM) – 05/11: APNs .p8 đã tải lên Firebase; `FCM_ON` đã bật qua mã, chỉ còn bước 4 (service account)
Kiểm 05/11: Android 1.0.1 (27/10) có plugin + google-services.json → nhận FCM ngay khi Worker có `FCM_SA`. iOS 1.0 trên App Store (bản 22/10) **chưa** có plugin FirebaseMessaging/`aps-environment` → chỉ lịch cục bộ (không lỗi, không hỏi quyền thừa); FCM iOS cần bản cửa hàng kế tiếp dựng từ main sau 02/11 (archive TestFlight 04/11 đã có `aps-environment`). CI: `push-fcm.yml` (test + dry-run `validate_only` cần secret repo `FCM_SA` = cùng file JSON).
Repo đã sẵn (2/11): `aps-environment` trong `App.entitlements`, `remote-notification` trong Info.plist, AppDelegate chuyển token APNs, `FirebaseMessaging.presentationOptions`; TestFlight ký tự động bằng khóa ASC nên có thể tự bật Push cho App ID. File `~/.config/lexkite/AuthKey_*.p8` là khóa EC P-256 đang dùng làm khóa App Store Connect (secret `ASC_KEY_P8`) – KHÔNG chắc là khóa APNs → vẫn cần bước 1–2 (bước 3 đã làm).
1. **APNs key** (iOS): developer.apple.com › Certificates, IDs & Profiles › Keys › "+" › tick **Apple Push Notifications service (APNs)** › tải file `.p8` (ghi Key ID, Team ID). Identifiers › `com.lexkite.app` › bật **Push Notifications** › lưu (tạo lại profile nếu Xcode báo).
2. console.firebase.google.com › dự án **lexkite-app** › ⚙️ Project settings › **Cloud Messaging** › Apple app configuration › **Upload** APNs Authentication Key (.p8 + Key ID + Team ID).
3. Xcode: target App › Signing & Capabilities › **+ Push Notifications** và **+ Background Modes › Remote notifications** (tạo `aps-environment` trong `App.entitlements`) – hoặc báo em thêm vào repo khi App ID đã bật Push.
4. Service account: console.cloud.google.com/iam-admin/serviceaccounts?project=lexkite-app › Create › tên `lexkite-push` › vai trò **Firebase Cloud Messaging API Admin** › Keys › Add key › JSON. Sau đó trong Terminal của anh (KHÔNG dán vào chat): `cd workers/push && CLOUDFLARE_API_TOKEN=$(cat ~/.config/lexkite/cf-token) npx wrangler secret put FCM_SA < ~/Downloads/<file>.json` rồi xóa file tải về.
   Thêm cùng file làm secret repo cho dry-run CI: `gh secret set FCM_SA --repo lexkiteapp/lexkiteapp.github.io < ~/Downloads/<file>.json` (rồi mới xóa file). Worker sửa ở `workers/push` deploy bằng `wrangler deploy` trong thư mục đó.
5. Không cần đặt `FCM_ON` nữa (mặc định bật; `wrangler pages secret put FCM_ON` = `0` để tắt khẩn). Lần cron kế tiếp sau khi có `FCM_SA` → nhịp → app gốc đăng ký FCM ở lần mở app sau (≤ 1 giờ cache cfg).

## 6. Test
Chuẩn giọng/toast chung: [specs/notifications.md](specs/notifications.md) – `scripts/test/notify-ux.mjs` chặn lời dọa/trách ở 15 ngôn ngữ + câu FCM, độ dài, biến, hành vi toast.
`scripts/test/reminders.mjs` (npm test): lập lịch ở 4 múi giờ thật (Asia/Ho_Chi_Minh, America/New_York qua mốc DST 01/11, Asia/Kolkata +5:30, Pacific/Auckland) – đúng giờ địa phương, ≤ 1/ngày, giờ yên lặng, giãn cách, lời cuối ngày 14, không lặp mẫu 7 ngày, lọc loại, FCM chỉ ngày ≥ 3; máy chủ `slotFor`/`pickDue` cùng 4 múi + DST; chống SSRF; SW push/click; câu FCM 15 ngôn ngữ (`scripts/push-copy.mjs --check`). Cùng các cổng chung: i18n-missing/qa/leak/switch, size-budget, axe, d1-scan, jobs-check, infra-check.
