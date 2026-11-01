# Spec: luồng tài khoản & đồng bộ (account-flow)

> TL;DR: học trước không cần tài khoản, đăng nhập 1 chạm, gộp theo bản ghi không mất gì, đồng bộ offline-first; 8 lỗi tìm thấy, sửa theo 5 mốc (M1 = logic + test `scripts/test/account-flow.mjs`).

**Mục tiêu:** học ngay không cần tài khoản; đăng nhập 1 chạm; gộp tiến độ không mất gì; đồng bộ offline-first kín đáo; $0 ở 1 triệu DAU.

## Hiện trạng (01/11)
- Khách: mọi dữ liệu ở IndexedDB (Core.Store), onboarding 5 màn (goal→level→target→pace→ready, `web/js/onboard.js`) rồi vào thẳng Ngày 1.
- Mời đăng nhập: sau Ngày 1 (`path-reward.js`, hỏi lại sau 3 ngày) + thẻ ≥10 (`nudgeLogin`, 3 ngày/lần).
- Đăng nhập: Firebase Auth Google (popup → redirect khi bị chặn), Apple (tắt), app gốc qua SDK gốc. Không có email/passkey.
- Đồng bộ (`web/js/sync.js`): Google → Drive appDataFolder của người học (`sync-drive.js`); còn lại → D1 `/api/sync` (32 gói thẻ + meta).
  Gộp xác định: thẻ LWW theo mốc hoạt động + dấu xoá 90 ngày; stats/game theo max/hợp; settings LWW theo `settingsAt`.
- Khách → tài khoản: lần đầu (`lastUid` rỗng) gộp im lặng. Add-on: cầu `extCall('set')` cùng máy.
- Xoá tài khoản: `account-delete.js` + `functions/api/account.js`. Đăng xuất: dữ liệu ở lại máy.

## Lỗi tìm thấy (cách tái hiện → mốc sửa)
1. **Mất dữ liệu khi đổi tài khoản** – A đăng xuất lúc offline (đẩy hỏng) → B đăng nhập → `confirm()` → Hủy = xoá thẻ/stats/game không bản sao. Trong WebView FB/Zalo `confirm()` có thể trả `false` ngay → xoá luôn. → **M1** (bản sao `acctBackup` trước khi xoá; confirm trả về <40 ms = bị chặn → gộp).
2. **D1 offline không gửi lại** – tắt mạng, học, bật mạng: chỉ đường Drive nghe `online`; D1 chờ thay đổi kế tiếp, trạng thái báo "lỗi". → **M1** (thử lại lùi dần 30 s→10 ph + `online`, offline báo "tạm nghỉ" thay vì lỗi).
3. **Đua lệnh giữa bài** – `mergeIn` đọc thẻ/game rồi qua nhiều `await` mới ghi → câu trả lời/XP ghi trong khoảng đó bị đè. → **M1** (đọc lại sát lúc ghi, gộp với bản mới nhất).
4. **Kéo đôi** – đăng nhập redirect: `getRedirectResult` và `onAuth` cùng gọi `start()` → 2 `pullMerge` song song. → **M1** (một luồng: chạy-một-lần, lượt sau xếp hàng).
5. **mergeGame mất trường** – trường game chỉ có ở bản xếp sau (field mới của tính năng khác) bị bỏ. → **M1** (`{...b, ...a}` rồi mới gộp riêng).
6. **Safari/iOS, Firefox: redirect hỏng** – `authDomain` = `lexkite-app.firebaseapp.com` khác miền → chặn lưu trữ bên thứ ba, popup bị chặn → redirect quay về không đăng nhập. → **M2** (proxy `/__/auth/*` trên Pages Function, cờ `LK_AUTH.proxy`; chủ thêm redirect URI rồi bật).
7. **WebView FB/Zalo/Instagram** – Google trả `403 disallowed_useragent`. → **M2** (nhận diện UA, mời "Mở trong trình duyệt", Android `intent://`).
8. **Dữ liệu không đồng bộ**: `mistakes`, `mocks`, `essays`, `pathSteps/pathDays` chỉ ở máy → đổi máy mất. → **M3** (thêm vào meta, gộp theo id, sau khi PR #315 path v3 gộp).

## Thiết kế đích
- Không chặn cửa: giữ học trước, mời đúng lúc (sau bài đầu, chuỗi ≥3 ngày sắp mất, mở máy thứ 2 qua `lk.vid`).
- Đăng nhập 1 chạm: Google One Tap/FedCM trên web (GIS, miễn phí) → `signInWithCredential`; passkey (WebAuthn, Pages Function + D1 + Firebase custom token, cần service-account của chủ); email magic link chỉ khi hạn mức Firebase miễn phí đủ (đo trước).
- Gộp: theo bản ghi, giao hoán + lũy đẳng + không mất (property test), không hỏi khi là dữ liệu khách.
- Onboarding ≤3 màn: mục tiêu → trình độ (xếp lớp 5 phút, bỏ qua được) → thời gian/ngày; điểm mục tiêu suy từ mục tiêu. Nối PathV3 (#315) + learner memory.
- Quyền riêng tư: Cài đặt → Xem / Xuất (JSON) / Xoá dữ liệu; đăng xuất máy dùng chung → tuỳ chọn xoá dữ liệu trên máy.

## Mốc & cổng
| Mốc | Nội dung | Loại | Cổng |
|---|---|---|---|
| M1 | lỗi 1–5 + `scripts/test/account-flow.mjs` (sync.js thật trong vm) | logic | npm test xanh, gộp khi xanh |
| M2 | proxy auth + WebView + One Tap | logic + 1 sheet | e2e Firebase Auth emulator trên CI; ảnh trước/sau → chủ duyệt |
| M3 | đồng bộ mistakes/mocks/essays/path | logic | test gộp; sau #315 |
| M4 | onboarding 3 màn (Stitch, khung 390) | giao diện | ảnh → chủ duyệt; đo bước/giây tới bài đầu |
| M5 | passkey + privacy center | logic + giao diện | chủ tạo service account; ảnh → duyệt |

**Việc của chủ:** (M2) thêm `https://lexkite.com/__/auth/handler` vào OAuth client Google + Apple; (M2) bật One Tap client ID; (M5) secret service account Firebase.
