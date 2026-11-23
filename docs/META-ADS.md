# META-ADS – Đo quảng cáo cài app Facebook/Instagram (Meta)

> TL;DR: Đo lượt cài + bài học đầu tiên cho quảng cáo cài app Meta mà KHÔNG SDK/pixel: Android = Play Install Referrer → máy chủ → Conversions API; iOS = SKAdNetwork. Mặc định TẮT (cờ `ads_meta_capi`), chỉ gửi khi người dùng đồng ý; chủ chỉ cần tạo app Meta, dán 2 bí mật, bật cờ.
> Đọc khi: chạy quảng cáo cài app Meta, đụng `_meta_capi.js` / `meta-attr.js`, hoặc khai nhãn quyền riêng tư liên quan Meta.

Một nguồn duy nhất cho chủ đề này. Thiết kế: nhẹ, không SDK Meta, không mã quảng cáo/thiết bị, không IP lưu thô, tôn trọng quyền riêng tư; mọi thứ nằm sau công tắc khẩn nên **bản hiện hành không đổi gì cho người dùng cho tới khi chủ bật**.

## 1. Luồng (đã code, TẮT)
| Bước | Ở đâu | Ghi chú |
|---|---|---|
| Người dùng bấm quảng cáo Meta → Google Play | Meta | Play ghi `utm_source=apps.facebook.com` (hoặc `instagram`), `utm_campaign=fb4a/ig4a`, `utm_content` mã hoá của Meta vào **Install Referrer** |
| Lần mở đầu: đọc referrer 1 lần | `mobile/.../InstallReferrerPlugin.kt` (thư viện Google `installreferrer:2.2`, ~30 KB, không cần quyền) | Không phải referrer Meta → app nhớ `lk.ir='-'` và **không bao giờ nạp thêm mã** (người dùng tự nhiên tốn 0 B) |
| Gửi `install` | `mobile/meta-attr.js` (2,3 KB, chỉ app Android: `build-mobile.sh` chép vào app, KHÔNG vào web/add-on; native.js +~0,6 KB) → `POST /api/hit {t:'ma'}` | `iid` = 16 byte ngẫu nhiên (`lk.iid`), không phải GAID/IDFA |
| Xong bài học đầu tiên = **ACTIVATE** | `remind.js firstWin` → sự kiện `lexkite:first-win` → `MetaAttr.activate()` | Cùng định nghĩa `first_win` của phễu (không tính máy đã học từ trước) |
| Máy chủ → Meta | `functions/api/_meta_capi.js` → `POST graph.facebook.com/v21.0/<META_APP_ID>/activities` | `MOBILE_APP_INSTALL`, và `CUSTOM_APP_EVENTS` `_eventName: ACTIVATE`; `anon_id=XZ<iid>`, `install_referrer`, `extinfo` (a2) |
| iOS | `scripts/mobile-ads.mjs` (`SKAN_META`, chạy trong `build-mobile.sh`, kể cả khi AdMob tắt) + `native/ios/project.yml` | Chỉ thêm 2 mã SKAdNetwork Meta; **không SDK, không ATT, `NSPrivacyTracking` vẫn false** |

Cổng ở máy chủ (theo thứ tự, mỗi cổng dừng im lặng): thiếu `META_APP_ID`/`META_CAPI_TOKEN` → cờ `ads_meta_capi` ≠ `1` (**mặc định TẮT; tắt = không ghi, không gửi, không đếm**) → đồng ý → giới hạn 20 lượt/giờ/IP băm (IP không lưu) → chỉ referrer Meta (cài tự nhiên chỉ đếm `ma:install:other`) → chống trùng (bảng `meta_attr`, PK `(iid, loại)`, giữ ≤ 90 ngày) → `activate` luôn dùng referrer **đã lưu** của lượt cài, không tin giá trị máy khách gửi.

**Đồng ý:** công tắc "Đo quảng cáo cài app (Meta)" ở Cài đặt › Dữ liệu (Android), mặc định TẮT; bật → `c:'y'`. Mặc định chỉ `c:'y'` được gửi. Muốn bật sẵn NGOÀI EEA/UK/CH (số liệu nhiều hơn rõ rệt) đặt biến Pages `META_CONSENT_DEFAULT=row` – quyết định pháp lý của chủ; trong EEA/UK/CH luôn cần bật tay.

## 2. Việc của chủ (làm 1 lần, ~20 phút, không cần code)
1. **Meta Events Manager / developers.facebook.com** → tạo **App** (loại Business/Other), thêm nền tảng **Android**: package `com.lexkite.app`, Google Play link. Lấy **App ID**.
2. Events Manager → nguồn dữ liệu của app → **Settings → Conversions API for App Events → Generate access token** (token hệ thống). Lưu lại (không dán vào chat/commit).
3. Đặt bí mật cho Pages (tên đúng): `META_APP_ID` và `META_CAPI_TOKEN`:
   ```bash
   printf '%s' "<APP_ID>" | CLOUDFLARE_API_TOKEN=$(cat ~/.config/lexkite/cf-token) npx wrangler pages secret put META_APP_ID --project-name lexkite
   printf '%s' "<TOKEN>"  | CLOUDFLARE_API_TOKEN=$(cat ~/.config/lexkite/cf-token) npx wrangler pages secret put META_CAPI_TOKEN --project-name lexkite
   ```
   (GitHub Actions không cần: chỉ Functions đọc.) Sửa lại bí mật ngay nếu đổi token.
4. Quản trị (cờ công tắc) hoặc D1: đặt cấu hình `ads_meta_capi = 1`. Tắt khẩn: đặt `0`/xoá → có hiệu lực ngay ở bản ghi kế tiếp.
5. Có bản Android chứa plugin trên Play (bản kế tiếp sau PR này). Bản cũ chưa có plugin không gửi gì.
6. Play Console → **Data safety** cập nhật theo `STORE-READINESS.md` §G **cùng lúc** với bản đầu tiên có plugin.
7. iOS: chưa gửi duyệt (khoá cổng Apple); 2 mã SKAdNetwork tự vào bản iOS kế tiếp.

## 3. Chiến dịch đầu tiên (khuyến nghị)
- **Android trước**, quốc gia ngoài EEA có người học thật (VN, ID, PH, BR, MX…), vì ở EEA cần bật tay nên số liệu rất thưa.
- Mục tiêu "App installs" (Facebook/Instagram), ngân sách nhỏ cố định **5–10 USD/ngày** trong 7 ngày đầu; 1 bộ quảng cáo, 3–4 mẫu (clip 9:16 ngắn từ kho video, bản ngữ).
- **Tối ưu cho sự kiện `ACTIVATE`** (Meta cần ~50 sự kiện/tuần để thoát giai đoạn học). Mới chạy mà chưa đủ sự kiện → tạm tối ưu "App installs" vài ngày rồi chuyển.
- Giữ chặt: không đổi giữa tuần, không bật nhiều bộ cùng lúc, không tăng ngân sách quá 20 %/lần.
- Mở **Events Manager → Test events** trước khi chi tiền: tự cài từ link quảng cáo thử, bật công tắc, học 1 bài → phải thấy `MOBILE_APP_INSTALL` + `ACTIVATE`. Nếu Meta báo trường nào sai, sửa `capiParams()` (hàm thuần, có test) – đây là chỗ DUY NHẤT cần đối chiếu tài liệu Meta mới nhất.

## 4. Đọc kết quả
- **Meta Ads Manager:** CPI (chi phí/cài), chi phí/`ACTIVATE` (= chi phí mỗi người học xong bài đầu), tỷ lệ cài→ACTIVATE. Đây là số quyết định tăng/giảm ngân sách.
- **Quản trị Lexkite (bảng `ext_events`, ngày VN):** `ma:install:sent|fail|other`, `ma:activate:sent|fail`. `fail` > 5 % = token hết hạn/trường sai → xem Test events. Lưu ý: số đếm chỉ có từ lúc bật cờ.
- Con số thật luôn **thấp hơn** số cài trên Play vì chỉ người đã bật đồng ý (hoặc ngoài EEA nếu bật `META_CONSENT_DEFAULT=row`) được gửi. Đừng so tuyệt đối; so CPI/ACTIVATE giữa các mẫu quảng cáo.
- iOS (sau này): số cài lấy từ báo cáo SKAdNetwork trong Ads Manager (có trễ 24–48 giờ, nhiễu có chủ ý) – không có ACTIVATE.
- Chuẩn thành công 7 ngày đầu: chi phí/ACTIVATE thấp hơn giá trị chủ chấp nhận; D1 người cài từ quảng cáo so với tự nhiên xem `docs/RETENTION.md`.

## 5. Quyền riêng tư & cửa hàng
Đã cập nhật: trang riêng tư 15 ngôn ngữ (mục 7 + bảng bên thứ ba), công tắc Cài đặt › Dữ liệu 15 ngôn ngữ, Data safety/App Privacy ở `STORE-READINESS.md` §G. Không gửi: tên, email, nội dung học, mã quảng cáo, IP. Giữ 90 ngày.

## 6. Kiểm thử & gỡ
`node scripts/test/meta-attr.mjs` (trong `npm test`): đọc referrer, cổng đồng ý, công tắc khẩn, dạng gói CAPI, chống trùng, máy khách (vm), SKAdNetwork, không lộ cờ ở `/api/config`, không có SDK/pixel Meta. Gỡ hoàn toàn: đặt `ads_meta_capi=0` (dừng gửi) → gỡ plugin ở bản Android kế tiếp.
Native rewrite: cùng hợp đồng, xem `specs/native-apps.md` › "Đo quảng cáo cài app Meta".
