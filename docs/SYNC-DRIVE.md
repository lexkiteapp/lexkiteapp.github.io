# Đồng bộ local-first qua Google Drive appDataFolder

> TL;DR: Dữ liệu học đồng bộ thẳng từ máy người học vào thư mục ẩn của ứng dụng trong Google Drive **của chính họ** (scope `drive.appdata`, không sensitive) → 0 USD và 0 lượt gọi máy chủ Lexkite ở mọi quy mô. IndexedDB là nguồn thật; 1 tệp ảnh chụp gzip/người; gộp xác định; ngân sách + lùi cấp số nhân. Bật/tắt bằng `LK_SYNC` trong `web/js/firebase-config.js`; D1 cũ vẫn chạy cho Apple, người từ chối Drive và phiên cũ.
> Đọc khi: sửa đồng bộ, đăng nhập, xóa tài khoản, hoặc ước tính chi phí khi DAU tăng.

## 1. Số đo (27/10/2026)
- Kích thước 1 người (`node scripts/capacity/sync-size.mjs`, đúng lược đồ `Cards.make` + `slim()`): 100 thẻ ≈ 7 KB gzip · 500 ≈ 15 KB · 2.000 ≈ 45 KB · 5.000 ≈ 105 KB · 20.000 ≈ 400 KB (thống kê 365 ngày + game đầy đủ).
- Tần suất ghi cũ (D1): ≤ 1 lượt/3 phút khi học + 1 lượt khi rời trang + 1 lượt kéo mỗi lần mở; hồ sơ typical ≈ 8–10 lượt đẩy + 2 lượt kéo/ngày. D1 Free ≈ 2.420 DAU (nút thắt 100k lượt Functions/ngày – `CAPACITY.md`).

## 2. So sánh (hạn mức miễn phí, 1M DAU)
| Phương án | Hạn mức miễn phí | 1M DAU | Kết luận |
|---|---|---|---|
| **Drive appDataFolder** | 400 triệu đơn vị/ngày/dự án, 1 triệu/phút, 325k/phút/người; dung lượng ở Drive người học ([limits](https://developers.google.com/workspace/drive/api/guides/limits)); `drive.appdata` = **non-sensitive** ([scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)) | ≈ 60–250 đv/DAU → 60–250 triệu/ngày | **Chọn** – 0 USD tới ~1,6M DAU ở mặc định; hơn nữa: tăng `every` |
| Firestore Spark | 50k đọc · 20k ghi/ngày | ~10M ghi/ngày | ~2k DAU |
| D1 + gom lượt | 100k lượt Workers/ngày · 100k dòng ghi | ≥ 1M lượt/ngày dù 1 lượt/người | ~2,4k DAU (đo) |
| R2 | 1M thao tác ghi/tháng | 30M/tháng | ~3k DAU |
| P2P (WebRTC) | 0 | – | 2 máy phải mở cùng lúc, cần máy chủ báo hiệu |
Google ghi sẽ tính phí khi VƯỢT hạn mức "cuối 2026, báo trước ≥ 90 ngày" → giữ dưới 400 triệu/ngày bằng ngân sách máy + `every`.

## 3. Thiết kế (`web/js/sync.js` + `web/js/sync-drive.js` tải lười)
- **Nguồn thật** = IndexedDB. Drive giữ 1 tệp `lexkite-sync.v2.json.gz` (`{v:2, cards (rút gọn), deleted, stats, game, settings, settingsAt}`) = nhật ký đã nén sẵn: Drive tính phí theo LƯỢT gọi, không theo byte → 1 tệp rẻ hơn nhật ký nhiều tệp (list 100 đv).
- **Một lượt**: `get version` (5) → khác bản đã biết thì `alt=media` (200) + gộp → ảnh chụp mới khác hash thì `PATCH` (50). Mở app không đổi = 5 đv. Lần đầu: `list` (100) + `create` (50); `fileId` lưu trên máy.
- **Gộp xác định** (`Sync._m`): thẻ = hoạt động muộn nhất thắng, hòa → so chuỗi ổn định; ngữ cảnh hợp; dấu xóa (giữ 90 ngày) thắng nếu mới hơn hoạt động; thống kê/game = max/hợp, sắp 2 bản trước khi gộp → giao hoán, lũy đẳng. Không có khóa ghi (Drive v3 không có If-Match): 2 máy ghi chồng thì máy kia vẫn giữ bản của nó, lần sau thấy `version` đổi → tải, gộp, ghi lại → hội tụ.
- **Lịch**: `Sync.schedule` gom theo `every` (10 phút), đẩy ngay khi ẩn trang/`pagehide` (`keepalive` khi ≤ 60 KB), khi có mạng lại, nút "Đồng bộ ngay".
- **Bền**: lỗi mạng/429/5xx → lùi 30 s × 2ⁿ (≤ 6 giờ, ±25 %); 401 → bỏ token; 403 thiếu quyền → quay về D1 + nút bật lại. Trần `cap` = 1.200 đv/máy/ngày (chặn vòng lặp); hết → "Đồng bộ tạm nghỉ – dữ liệu vẫn trên máy".
- **Token & đồng ý**: scope `drive.appdata` xin 1 lần ngay ở popup đăng nhập Google (Firebase `addScope`). Token 1 giờ (localStorage `lk.dt`, chỉ chạm được tệp của app). Hết hạn → chỉ khi CẦN (còn thay đổi chưa gửi hoặc > 12 giờ chưa kéo) mới gia hạn trong cú chạm kế tiếp bằng popup `prompt=none` tự đóng; ≤ 1 lần/45 phút, ≤ 3 lần/ngày. Không bao giờ có hộp hỏi khi đang học.
- **Khách** học hoàn toàn trên máy như cũ. Add-on giữ đồng bộ qua cầu nối web app (không thêm quyền, `permissions.lock` không đổi; `sync-drive.js` bị loại khỏi bản add-on).

## 4. Di chuyển từ D1 (không cắt)
- Đăng nhập Google lần đầu sau cập nhật (có quyền Drive): kéo D1 → gộp vào máy → ghi Drive. Người mới: 1 lượt kéo D1 (trống) và **không tạo dòng D1 nào**.
- Có dữ liệu D1 → cầu nối 30 ngày: kéo + đẩy D1 ≤ 1 lần/20 giờ để máy chưa cập nhật vẫn khớp. Chi phí chặn trên bởi số người dùng hiện có, không tăng theo DAU mới.
- Phiên đăng nhập từ trước (chưa có token), Apple, bỏ ô Drive → D1 như cũ + nút "Sao lưu vào Google Drive của bạn" trong thẻ tài khoản (chỉ khi họ bấm).
- Xóa tài khoản: xóa tệp Drive khi còn token (nếu không, tệp nằm trong Drive của chính họ: Drive › Cài đặt › Quản lý ứng dụng).
- Rollback: `LK_SYNC.drive = false` → mọi máy về D1 (dữ liệu trên máy giữ nguyên, lần kéo D1 kế tiếp gộp lại).

## 5. Việc chủ duyệt trước khi bật `drive: true`
1. Google Cloud `lexkite-app` › APIs: bật **Google Drive API**; OAuth consent screen › Data access: thêm `.../auth/drive.appdata`; Branding: logo, trang chủ, privacy → gửi **xác minh thương hiệu** (non-sensitive: không cần đánh giá bảo mật).
2. Chính sách quyền riêng tư (`content/legal/en,vi/privacy.html` → Action dịch 13 ngôn ngữ): dòng "dữ liệu học lưu trong thư mục ẩn của ứng dụng trên Google Drive của bạn; Lexkite không đọc được từ máy chủ" + câu Limited Use của Google API Services User Data Policy.
3. Firebase Auth: kiểm dự án có nâng **Identity Platform** chưa – Spark + Identity Platform chỉ 3.000 DAU/ngày ([limits](https://firebase.google.com/docs/auth/limits)); Blaze: 50k MAU miễn phí rồi tính tiền. Ở hàng triệu DAU, đăng nhập cũng phải 0 USD → bước sau: Google Identity Services (FedCM/One Tap) trực tiếp cho người dùng Drive.
4. App gốc (`native: true`): cần gia hạn token im lặng bằng `AuthorizationClient.authorize` (plugin gốc nhỏ) – chưa làm; tới lúc đó app gốc giữ D1.

## 6. Kiểm thử
`node scripts/test/sync-drive.mjs` (trong `npm test`): mã thật trong jsdom ↔ Drive giả đếm đơn vị + D1 thật (node:sqlite). Kiểm tính chất gộp 300 ca ngẫu nhiên, người mới 0 dòng D1, mở lại = 5 đv, 2 máy hội tụ + dấu xóa, ngoại tuyến/429 lùi, gia hạn token chỉ khi chạm (≤ 1/45 phút), trần ngân sách, bỏ quyền → D1, di chuyển D1 → Drive + máy cũ vẫn thấy, xóa tài khoản xóa tệp. Không dùng tài khoản thật.
