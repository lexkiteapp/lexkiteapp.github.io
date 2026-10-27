# Đồng bộ local-first: Google Drive appDataFolder + D1 dự phòng

> TL;DR: Người đăng nhập Google đồng bộ thẳng vào thư mục ẩn của ứng dụng trong Google Drive **của chính họ** (scope `drive.appdata`, non-sensitive) → 0 USD, 0 lượt gọi máy chủ Lexkite ở mọi quy mô. D1 `/api/sync` giữ làm đường dự phòng (Apple, từ chối Drive, phiên cũ, Drive lỗi kéo dài, schema mới hơn). IndexedDB là nguồn thật và không bao giờ bị thay; phong bì SHA-256, kiểm sau khi ghi, 3 bản sao lưu xoay vòng + tự khôi phục. Bật/tắt từ xa bằng `LK_SYNC` trong `web/js/firebase-config.js`.
> Đọc khi: sửa đồng bộ, đăng nhập, xóa tài khoản, hoặc ước tính chi phí khi DAU tăng.

## 1. Số đo (27/10/2026)
- Kích thước 1 người (`node scripts/capacity/sync-size.mjs`, đúng lược đồ `Cards.make` + `slim()`, thống kê 365 ngày + game đầy đủ): 100 thẻ ≈ 7 KB gzip · 500 ≈ 15 KB · 2.000 ≈ 45 KB · 5.000 ≈ 105 KB · 20.000 ≈ 400 KB. D1 đo được 23,2 KB/người typical.
- Tần suất ghi D1 (`SIM_PUSH_MS=… node scripts/capacity/sim.mjs`, hồ sơ typical 2 phiên 12 + 10 phút): gom 3 phút = 9 lượt đẩy + 2 lượt kéo = **11 lượt, 9 dòng ghi/ngày**; gom 10 phút (`LK_SYNC.d1Every`, mặc định mới) = **7 lượt, 5 dòng ghi/ngày**. Đẩy khi rời trang giữ nguyên.

## 2. So sánh (hạn mức miễn phí, 1M DAU)
| Phương án | Hạn mức miễn phí | 1M DAU | Kết luận |
|---|---|---|---|
| **Drive appDataFolder** | 400 triệu đơn vị/ngày/dự án, 1 triệu/phút, 325k/phút/người; dung lượng ở Drive người học ([limits](https://developers.google.com/workspace/drive/api/guides/limits)); `drive.appdata` = **non-sensitive** ([scopes](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)) | ≈ 60–250 đv/DAU → 60–250 triệu/ngày | **Đường chính** – 0 USD tới ~1,6M DAU ở mặc định; hơn nữa: tăng `every` |
| D1 (đã tối ưu) | 100k lượt Workers/ngày · 100k dòng ghi/ngày ([D1](https://developers.cloudflare.com/d1/platform/pricing/)) | 7M lượt/ngày | **Dự phòng** – bảng §6 |
| Firestore Spark | 50k đọc · 20k ghi/ngày | ~5M ghi/ngày | ~4k DAU |
| R2 | 1M thao tác ghi/tháng | 150M/tháng | ~6k DAU |
| P2P (WebRTC) | 0 | – | 2 máy phải mở cùng lúc, cần máy chủ báo hiệu |
Google ghi sẽ tính phí khi VƯỢT hạn mức "cuối 2026, báo trước ≥ 90 ngày" → giữ dưới 400 triệu/ngày bằng ngân sách máy + `every`.

## 3. Thiết kế (`web/js/sync.js` + `web/js/sync-drive.js` tải lười)
- **Nguồn thật** = IndexedDB. Drive giữ tệp `lexkite-sync.v2.json.gz` = gzip(`{kind, v: schema, sha: SHA-256(data), data}`), `data` = ảnh chụp `{v:2, cards (rút gọn), deleted, stats, game, settings, settingsAt}` = nhật ký delta đã nén sẵn. Drive tính theo LƯỢT gọi, không theo byte → 1 tệp trạng thái rẻ hơn nhật ký nhiều tệp (mỗi `list` 100 đv); D1 vẫn gửi delta theo 32 nhóm thẻ băm, 1 lượt = 1 dòng ghi (gói).
- **Một lượt**: `get version` (5) → khác bản đã biết thì `alt=media` (200) + kiểm SHA + gộp → ảnh chụp mới khác hash thì `PATCH` (50). Mở app không đổi = 5 đv. Lần đầu: `list` (100) + `create` (50) + bản sao lưu ngày (50).
- **Gộp xác định** (`Sync._m`): thẻ = hoạt động muộn nhất thắng (LWW từng bản ghi), hòa → so chuỗi ổn định; ngữ cảnh hợp; dấu xóa (giữ 90 ngày) thắng nếu mới hơn hoạt động; thống kê/game = max/hợp, sắp 2 bản trước khi gộp → giao hoán, lũy đẳng, hội tụ (fuzz §7).
- **Lịch**: gom theo `every` (Drive 10 phút, D1 `d1Every` 10 phút), đẩy ngay khi ẩn trang/`pagehide` (`keepalive` khi ≤ 60 KB), khi có mạng lại, nút "Đồng bộ ngay".
- **Token & đồng ý**: `drive.appdata` xin 1 lần ở popup đăng nhập Google (Firebase `addScope`); người đăng nhập từ trước: nút "Sao lưu vào Google Drive của bạn" trong thẻ tài khoản (1 lần, chỉ khi bấm). Token 1 giờ (`lk.dt`, chỉ chạm tệp của app). Hết hạn → chỉ khi CẦN (còn thay đổi chưa gửi hoặc > 12 giờ chưa kéo) mới gia hạn trong cú chạm kế tiếp bằng popup `prompt=none` tự đóng; ≤ 1 lần/45 phút, ≤ 3 lần/ngày. Không bao giờ hỏi khi đang học.
- **Khách** học hoàn toàn trên máy (0 lượt mạng); đăng nhập sau = GỘP. Add-on đồng bộ qua cầu nối web app (không thêm quyền, `permissions.lock` không đổi; `sync-drive.js` bị loại khỏi bản add-on).
- **Công tắc từ xa** (`firebase-config.js`, tệp tĩnh): `mode: 'auto' | 'd1' | 'off'`, `drive`, `native`, `every`, `cap`, `d1Every`.

## 4. Không mất dữ liệu (yêu cầu chủ 27/10)
| Yêu cầu | Cách làm |
|---|---|
| Không xóa/ghi đè dữ liệu máy trước khi ghi xa xác nhận | Máy chỉ GỘP bản xa (LWW + dấu xóa), không bao giờ thay; "đã gửi" (hash/version) chỉ ghi nhận sau khi Drive trả `size` = số byte gửi |
| Ghi lũy đẳng | Nội dung = trạng thái, không phải thao tác → gửi lại = như 1 lần; mất phản hồi → lượt sau thấy hash trùng, không ghi lại. D1: khóa bất biến = hash tài liệu |
| N bản có phiên bản + tự khôi phục | 3 bản sao lưu xoay vòng theo ngày (`bak0..2`) + bản D1 cũ giữ nguyên. Tệp chính hỏng/SHA sai → đổi tên `.corrupt` (giữ lại), gộp MỌI bản sao lưu đọc được, ghi tệp mới; cờ `pendingRestore` lưu trước → mất mạng giữa chừng vẫn khôi phục tiếp |
| Schema + migrate + dry-run | Phong bì có `v`; `MIGRATE[k]` hàm thuần; tệp schema MỚI hơn → không ghi đè, dùng D1. `await Sync.dryRun()` đọc Drive + sao lưu, gộp trong bộ nhớ, không ghi gì |
| Không chặn việc học | Mọi lỗi im lặng ("Đồng bộ tạm nghỉ – dữ liệu vẫn trên máy" chỉ ở thẻ tài khoản), lùi 30 s × 2ⁿ ≤ 6 giờ ±25 %; Drive lỗi ≥ 5 lượt → bản sao an toàn qua D1 ≤ 1 lần/6 giờ |

## 5. Di chuyển từ D1 (không cắt)
- Đăng nhập Google lần đầu sau cập nhật (có quyền Drive): kéo D1 → gộp vào máy → ghi Drive. D1 tạm nghỉ/lỗi → chưa đánh dấu, lần sau kiểm lại. Người mới: 1 lượt kéo D1 (trống), **0 dòng D1**.
- Có dữ liệu D1 → cầu nối 30 ngày: kéo + đẩy D1 ≤ 1 lần/20 giờ để máy chưa cập nhật vẫn khớp. Dữ liệu D1 không bao giờ bị xóa bởi di chuyển.
- Apple, bỏ ô Drive, thu hồi quyền (403) → D1 như cũ + nút bật lại. Xóa tài khoản: xóa mọi tệp `lexkite-sync*` khi còn token (không thì tệp nằm trong Drive của chính họ: Drive › Cài đặt › Quản lý ứng dụng).
- Rollback: `drive: false` hoặc `mode: 'd1'` → mọi máy về D1 (dữ liệu máy giữ nguyên, lượt kéo D1 kế tiếp gộp lại).

## 6. Chi phí (chỉ phần đồng bộ; người đăng nhập typical; giá [D1](https://developers.cloudflare.com/d1/platform/pricing/) + Workers Paid $5 gồm 10M lượt/tháng, $0,30/triệu)
| | Trần Free (DAU đăng nhập) | 10k DAU | 100k DAU | 1M DAU |
|---|---:|---:|---:|---:|
| D1 trước (11 lượt, 9 ghi/ngày) | ≈ 9.100 | 0 $ (trong $5) | ≈ 7 $ | ≈ 330 $ |
| D1 sau (7 lượt, 5 ghi/ngày) | ≈ 14.300 | 0 $ | ≈ 3 $ | ≈ 174 $ |
| **Hybrid** (Drive 0 $ + D1 dự phòng ~15 %) | ≈ 95.000 | 0 $ | 0 $ | ≈ 7 $ |
Tính: lượt/tháng = 30 × lượt/ngày × DAU; vượt 10M × $0,30/M; ghi vượt 50M × $1/M; lưu trữ 23 KB/người vượt 5 GB × $0,75/GB. Số trên là phần cộng thêm ngoài phí cố định $5; toàn app (thống kê, AI, bảng xếp hạng, âm thanh) xem `CAPACITY.md`. Tỉ lệ dự phòng 15 % là giả định (Apple + từ chối Drive) – đo thật bằng `driveSync`/D1 sau khi bật.

## 7. Kiểm thử (`node scripts/test/sync-drive.mjs`, trong `npm test`, 114 kiểm tra, chỉ fixture)
Mã thật trong jsdom ↔ Drive giả đếm đơn vị (list/get/media/PATCH/multipart/đổi tên/xóa, mô phỏng ghi dở, 5xx, 429, 401, 403) + D1 thật (node:sqlite).
| Chế độ lỗi | Ca kiểm | Kết quả mong đợi |
|---|---|---|
| Sửa xung đột nhiều máy | §3, §15, §19 | cùng 1 bản ở mọi máy, thẻ xóa biến mất |
| Ngoại tuyến → có mạng | §4 | dữ liệu ở máy, lùi, tự gửi |
| Token hết hạn / thu hồi quyền | §5, §7 | không popup khi không chạm; 403 → D1 + nút |
| Hạn mức / 429 / 5xx | §4, §6, §13 | lùi gấp đôi, trần ngày không vượt, D1 an toàn sau 5 lượt |
| Tệp xa hỏng / SHA sai | §10, §11 | giữ `.corrupt`, khôi phục từ sao lưu, không có sao lưu → ghi lại từ máy |
| Ghi dở | §12 | phát hiện bằng size, khôi phục, đủ dữ liệu |
| Lệch đồng hồ ±2 giờ | §15 | hội tụ, không mất thẻ |
| Schema mới hơn | §14 | không ghi đè |
| Di chuyển D1 → Drive 5.000 thẻ + dry-run | §8, §16 | đủ 5.000, nội dung giữ nguyên, máy cũ vẫn thấy |
| Khách rồi đăng nhập | §17 | gộp 10 + 10 = 20 |
| Fuzz gộp | §1 (300 ca tính chất), §18 (200 chuỗi × 3 máy × 40 thao tác), §19 (3 máy jsdom, 45 thao tác) | hội tụ 100 % |

## 8. Việc chủ duyệt trước khi bật `drive: true`
**27/10 – ĐÃ BẬT** (`drive: true`): Drive API đã bật, `drive.appdata` đã thêm ở Data Access (Google: "không cần xác minh" vì không có scope sensitive), privacy en/vi đã sửa (Action dịch 13 ngôn ngữ). Còn: gửi **Verify branding** sau khi privacy mới lên live; Identity Platform đã xác nhận ĐANG BẬT trên Spark (trần 3.000 DAU – mục 3).
1. Google Cloud `lexkite-app` › APIs: bật **Google Drive API**; OAuth consent screen › Data access: thêm `.../auth/drive.appdata`; Branding: logo, trang chủ, privacy → gửi **xác minh thương hiệu** (non-sensitive: không cần đánh giá bảo mật CASA).
2. Chính sách quyền riêng tư (`content/legal/en,vi/privacy.html` → Action dịch 13 ngôn ngữ): "dữ liệu học lưu trong thư mục ẩn của ứng dụng trên Google Drive của bạn; Lexkite không đọc được từ máy chủ" + câu Limited Use (Google API Services User Data Policy).
3. Firebase Auth: kiểm dự án có nâng **Identity Platform** chưa – Spark + Identity Platform chỉ 3.000 DAU ([limits](https://firebase.google.com/docs/auth/limits)); Blaze: 50k MAU miễn phí rồi tính tiền. Ở hàng triệu DAU đăng nhập cũng phải 0 USD → bước sau: Google Identity Services (FedCM/One Tap) trực tiếp cho người dùng Drive.
4. App gốc (`native: true`): cần gia hạn token im lặng bằng `AuthorizationClient.authorize` (plugin gốc nhỏ) – chưa làm; tới lúc đó app gốc dùng D1.
