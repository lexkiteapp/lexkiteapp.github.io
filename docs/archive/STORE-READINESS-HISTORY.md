# STORE-READINESS – mục đã xong/cũ (lưu nguyên văn 22/10/2026)

> Bản hiện hành: `docs/STORE-READINESS.md`.

## Kết luận

**Chưa nộp ngay được, nhưng code đã gần xong.** Các điểm chặn còn lại:
1. 👤 Tài khoản Apple Developer (Organization, D-U-N-S) và Google Play Console (Organization) đang đăng ký.
2. 👤 Khóa ký Android (upload key) + 4 GitHub Secrets → CI tự ra file `.aab`.
3. 🛠 Ảnh cửa hàng cho app điện thoại (ảnh chụp điện thoại/máy tính bảng, feature graphic 1024×500) – chưa có (hiện chỉ có ảnh của add-on Chrome).
4. 🛠/👤 iOS: ký + archive + tải lên TestFlight (chưa có pipeline; cần tài khoản Apple trước).

Không chặn nộp nhưng **phải giữ đúng thứ tự**: nếu sau này bật **đăng nhập trong app**, phải bật **Sign in with Apple** trên iOS cùng lúc (Apple 4.8). Xóa tài khoản trong app đã làm xong (Play + Apple 5.1.1(v)).

## Em đã sửa trong lần này (chưa commit)

| Việc | File |
|---|---|
| **Xóa tài khoản** đầy đủ: nút "Xóa tài khoản" ở thẻ tài khoản (Cài đặt / trang Tôi), hộp xác nhận 2 bước, đăng nhập lại nếu > 10 phút, xóa D1 (dữ liệu đồng bộ, hồ sơ, liên kết mã khách, bảng xếp hạng), gỡ uid/email khỏi báo lỗi, xóa tài khoản Firebase (REST, dự phòng `user.delete()` phía máy), tùy chọn xóa luôn dữ liệu trên máy. Liên kết web: `https://lexkite.com/app/#/settings?delete=account` | `functions/api/account.js` (mới), `web/js/account-delete.js` (mới, tải lười), `web/js/sync.js`, `web/css/me.css` |
| Bản dịch 15 ngôn ngữ (viết tay, không dịch máy) cho mọi chữ mới + nhãn ngắn vào `i18n-fixed.json` | `web/js/i18n/en/account.js` (nhóm tải lười mới), `en/shell.js`, `en/core.js`, 13 file `web/js/i18n/<lang>.js`, `scripts/i18n-fixed.json`, `scripts/build-i18n.sh` (LAZY += account) |
| Test API + giao diện xóa tài khoản (đưa vào `npm test`) | `scripts/test/account-delete.mjs`, `package.json` |
| **Sign in with Apple** cho web/Firebase, sau cờ `LK_AUTH.apple = false` (nút đen chuẩn Apple, đăng nhập lại đúng nhà cung cấp) | `web/js/firebase-config.js`, `web/js/sync.js`, `web/icons/apple.svg` |
| App gốc chưa có đăng nhập gốc → **tắt hẳn** đăng nhập/đồng bộ trong app (trước đây Android vẫn tải Firebase SDK từ gstatic và mời "Đăng nhập Google" rồi báo "chưa có" → dễ bị đánh giá là tính năng hỏng) | `web/js/sync.js` |
| **Bug Android 12+**: nhắc học lên lịch bằng báo thức *chính xác* → plugin mở màn "Báo thức & lời nhắc" mỗi lần mở app khi đã cho phép thông báo. Đổi sang nhắc không chính xác + gỡ quyền `SCHEDULE_EXACT_ALARM` | `web/js/native.js`, `mobile/android/app/src/main/AndroidManifest.xml` |
| Gỡ `FOREGROUND_SERVICE` + `FOREGROUND_SERVICE_MEDIA_PLAYBACK` (app không có service gốc nào → Play sẽ bắt khai báo + video FGS vô cớ) | `AndroidManifest.xml` |
| Ký bản phát hành + versionCode/versionName từ biến môi trường; job `aab` trong CI (chỉ chạy khi có secrets) | `mobile/android/app/build.gradle`, `.github/workflows/android.yml` |
| iOS Info.plist: `ITSAppUsesNonExemptEncryption=false`, thêm `NSSpeechRecognitionUsageDescription` (app dùng webkitSpeechRecognition – thiếu khóa này iOS sẽ đóng app khi luyện nói), mô tả micro bằng tiếng Anh, `UIRequiredDeviceCapabilities` armv7 → arm64 | `mobile/ios/App/App/Info.plist` |
| Privacy manifest: thêm `NSPrivacyCollectedDataTypes` (khớp nhãn quyền riêng tư bên dưới) | `mobile/ios/App/App/PrivacyInfo.xcprivacy` |
| CI iOS dùng **Xcode 26** (App Store từ 28/04/2026 chỉ nhận bản build bằng Xcode 26 / iOS 26 SDK; CI đang dùng Xcode 16.4) | `.github/workflows/ios.yml` |
| Chính sách quyền riêng tư (en + vi) mục 9: thêm cách xóa tài khoản ngay trong app; 13 ngôn ngữ khác tự dịch dòng mới khi workflow i18n chạy | `content/legal/{en,vi}/privacy.html`, `web/**/privacy.html` (sinh bằng `build-legal.mjs`) |
| Đăng ký host `identitytoolkit.googleapis.com` (infra-check) | `infra/resources.json` |
| README mobile: dự án Firebase đúng là `lexkite-app` (không phải ielts-lexi-2026) | `mobile/README.md` |

Test đã chạy (xanh): `account-delete`, `account-ui`, `unit`, `api-security`, `client-security`, `league`, `size-budget` (khung 379/380 KB gz), `infra-check`, `vi-lint`, `i18n-missing --strict`, `i18n-qa --strict`, `i18n-switch --scan`, `brand-check`. Chưa build Gradle/Xcode cục bộ (theo quy định) → **sau khi ship phải xem 2 workflow Android/iOS xanh**.

---

### A1. 👤 Tạo khóa ký Android & GitHub Secrets (làm 1 lần)
1. Trên Mac (Terminal, nhẹ): `keytool -genkeypair -v -keystore ~/lexkite-upload.jks -alias lexkite-upload -keyalg RSA -keysize 4096 -validity 10000` → đặt mật khẩu mạnh (ghi vào trình quản lý mật khẩu).
2. **Sao lưu** `~/lexkite-upload.jks` + mật khẩu ở 2 nơi (mất upload key vẫn xin Google đặt lại được, nhưng mất vài ngày).
3. GitHub repo `lexkiteapp/lexkiteapp.github.io` → Settings → Secrets and variables → Actions → New repository secret:
   - `ANDROID_KEYSTORE_BASE64` = nội dung `base64 -i ~/lexkite-upload.jks | pbcopy` (dán)
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (= `lexkite-upload`), `ANDROID_KEY_PASSWORD`
   (hoặc nhắn em – em đẩy secret bằng API mã hóa libsodium, không in ra.)
4. Chạy workflow **Build Android app** → artifact `lexkite-play-aab` → tải `.aab` lên Play Console → **Testing → Internal testing** trước, rồi Production.

#### B1a. Bấm từng bước – App Privacy (không có API công khai, phải làm trên web)
App Store Connect → Apps → **Lexkite: English Vocabulary** → (thanh trái) **App Privacy**.
1. **Privacy Policy** → Edit → `https://lexkite.com/en/privacy` → Save. (Privacy Choices URL: để trống.)
2. **Data Collection** → Get Started (hoặc Edit) → "Do you or your third-party partners collect data from this app?" → **Yes, we collect data from this app** → Next.
3. Tick đúng 12 ô (để trống mọi ô khác):
   - Contact Info: ☑ **Name** ☑ **Email Address**
   - Identifiers: ☑ **Device ID** (KHÔNG tick User ID)
   - Usage Data: ☑ **Product Interaction**
   - Diagnostics: ☑ **Crash Data** ☑ **Performance Data** ☑ **Other Diagnostic Data**
   - Location: ☑ **Coarse Location** (KHÔNG tick Precise)
   - Search History: ☑ **Search History**
   - User Content: ☑ **Photos or Videos** ☑ **Customer Support** ☑ **Other User Content** (KHÔNG tick Audio Data, Emails or Text Messages, Gameplay Content)
   → Save.
4. Với MỖI loại, bấm "Set Up <loại>" và trả lời 3 câu (Purposes → Linked to user? → Used for tracking?):

   | Loại | Purposes (tick) | Linked to the user? | Tracking? |
   |---|---|---|---|
   | Name | App Functionality | **Yes** | No |
   | Email Address | App Functionality | **Yes** | No |
   | Customer Support | App Functionality | **Yes** | No |
   | Photos or Videos | App Functionality | **Yes** | No |
   | Other User Content | App Functionality | No | No |
   | Search History | App Functionality | No | No |
   | Device ID | Analytics + App Functionality | No | No |
   | Product Interaction | Analytics | No | No |
   | Coarse Location | Analytics | No | No |
   | Crash Data | Analytics | No | No |
   | Performance Data | Analytics | No | No |
   | Other Diagnostic Data | Analytics + App Functionality | No | No |

   (Không tick Third-Party Advertising, Developer's Advertising or Marketing, Product Personalization, Other Purposes ở bất kỳ loại nào.)
5. Xem lại trang tóm tắt: "Data Used to Track You" **trống**; "Data Linked to You" = Contact Info (Name, Email), User Content (Photos or Videos, Customer Support); "Data Not Linked to You" = phần còn lại → bấm **Publish** (góc trên phải).

### B4. Nộp bản 1.0 – trạng thái & các bước anh chủ bấm
**Đã chuẩn bị (🛠):** niêm yết 15 ngôn ngữ (+ es-MX) `store/apple/listing.json` / `LISTING.md` (kiểm giới hạn ký tự + luật Apple trong `npm test`), ảnh iPhone/iPad, `scripts/asc-upload.mjs` (JWT ES256, idempotent, `--dry-run`) chạy trong workflow **iOS → ảnh App Store** (`asc = dry-run | upload`). Script chỉ ghi chữ, danh mục (Education / Reference), bản quyền, ghi chú duyệt và ảnh của bản 1.0 khi đang *Prepare for Submission*; không nộp, không đổi giá/phân phối/độ tuổi/App Privacy.

**Trạng thái 20/10/2026:** ✅ đã đẩy thật lên App Store Connect (bản 1.0, Prepare for Submission): danh mục Education/Reference, tên + phụ đề + URL chính sách 16 ngôn ngữ, mô tả/từ khóa/quảng bá/URL hỗ trợ & marketing, bản quyền, ghi chú duyệt (demo account = không). Chạy lại = "đã đổi 0" phần chữ (idempotent). ⏸ **Ảnh CHƯA đẩy** – chờ sửa 3 lỗi app dưới đây rồi chụp lại.

**Cài đặt nộp duyệt qua API** (`node scripts/asc-upload.mjs --only settings`, workflow `only = settings`): quyền nội dung = USES_THIRD_PARTY_CONTENT, bảng độ tuổi (mọi mục None/No) + `ageRatingOverrideV2 = THIRTEEN_PLUS`, giá Free (gốc USA), quốc gia: 148/175 mở, tắt EU-27, availableInNewTerritories = false, liên hệ người duyệt (Quyen / Khieu Dinh / support@lexkite.com; số điện thoại CHỈ qua secret `ASC_REVIEW_PHONE`, không lưu repo), phát hành MANUAL. Không chọn build, không nộp. Dry-run 20/10: 6 mục sẽ đổi, mọi khóa độ tuổi có trong API. **Chỉ chạy thật khi anh chủ đồng ý trực tiếp** (cam kết quyền nội dung, độ tuổi, giá/quốc gia là khai báo của chủ tài khoản).

**Trạng thái 21/10/2026:** iOS E2E 118/118 PASS (iPhone 17 Pro Max + iPad Pro 13", iOS 26.2) sau khi sửa tên bài ở Ngữ pháp Trộn; build **5** (1.0, từ main 7a535019) VALID và đã gắn vào bản 1.0; 28 ảnh (iPhone 6.9" + iPad 13", en/vi) chụp lại – bỏ hộp xin quyền thông báo – và đã đẩy. Apple kiểm hồ sơ (`only = review`) chỉ còn 1 lỗi: `APP_DATA_USAGES_REQUIRED` → làm **B1a App Privacy → Publish**, rồi chạy **iOS → ảnh App Store** `capture = false`, `asc = upload`, `only = review`, `submit = true` để gửi duyệt (submission READY_FOR_REVIEW đã tạo sẵn). 3 lỗi app bên dưới đã sửa trước đó.

**❌ Lỗi app phải sửa trước khi nộp (thấy trên ảnh Simulator, nhánh `ios-shots`; vùng `web/js` – báo phiên chính):**
1. **Đăng nhập Google vẫn hiện trong app gốc** dù `nativeNoAuth` đã tắt đồng bộ: nút "Tôi đã có tài khoản" ở màn chào (`app.js` ~1550, `#loginW`), nút G ở thanh trên, "Sign in with Google" ở thanh bên iPad; bấm vào ra hộp "sẽ có ở bản phát hành chính thức" (`sync.js` ~298) = tính năng "sắp có" → rủi ro Apple 2.1 + 4.8 (đăng nhập bên thứ ba mà không có Sign in with Apple). Sửa: ẩn mọi lối đăng nhập khi `nativeNoAuth`.
2. **Vùng an toàn trên cùng**: trang ôn thẻ (`#/review`, iPhone) và thanh trên iPad đè lên thanh trạng thái (giờ/pin) – thiếu `env(safe-area-inset-top)` ở các bố cục đó.
3. Gợi ý phím tắt ("Shortcuts: Space flip…") hiện trên cảm ứng ở trang ôn thẻ (Simulator báo hover) – nên ẩn khi `VBNative.is`.
Sau khi sửa + build TestFlight mới: chạy **iOS → ảnh App Store** với `capture = true`, `asc = upload`, `only = all` (hoặc `only = shots`), soi ảnh ở nhánh `ios-shots` trước.

**👤 Anh chủ bấm trên App Store Connect (app 6824714708):**
1. (Sau khi sửa lỗi app ở trên) Actions → **iOS → ảnh App Store** → Run workflow `capture = true`, `asc = upload` → xem Summary "✓ đã đổi …" và ảnh trên App Store Connect.
2. App Information: kiểm Name/Subtitle/Category đã có; **Content Rights** → "Yes, contains third-party content" + "I have the necessary rights"; **Age Rating** → Edit theo bảng trong LISTING.md, Override **13+**.
3. **App Privacy** → Get Started → khai đúng bảng § App Privacy (12 loại, Tracking = No) → Publish. Privacy Policy URL `https://lexkite.com/en/privacy`.
4. **Pricing and Availability**: Free; quốc gia: tất cả **trừ EU** cho tới khi khai DSA trader (xem Trạng thái phát hành bên dưới).
5. Bản iOS 1.0 → **Build**: chọn build TestFlight mới nhất (nên chạy lại `ios-testflight.yml` trước để có `PrivacyInfo.xcprivacy` mới); Export compliance đã tự khai (`ITSAppUsesNonExemptEncryption = false`).
6. **App Review Information**: bỏ tick "Sign-in required"; điền họ tên, số điện thoại, email liên hệ (support@lexkite.com); Notes đã có.
7. Version Release: chọn **Manually release** (an toàn cho bản đầu) → **Add for Review → Submit for Review**.

---

## D. 👤 Thứ tự việc của anh
1. D-U-N-S cho MODIAN LUXURY JEWELRY LLC (miễn phí, 5–14 ngày; tra/ xin tại developer.apple.com/enroll/duns-lookup). Tên, địa chỉ phải **khớp từng chữ** với giấy tờ Wyoming.
2. Apple Developer Program → Enroll as Organization (99 USD/năm), đăng nhập bằng Apple ID dùng email tên miền.
3. Google Play Console → Organization (25 USD), cùng D-U-N-S; xác minh danh tính + số điện thoại + email.
4. Tạo upload key + secrets (A1).
5. Báo em khi xong 2 tài khoản → em làm: job TestFlight, ảnh cửa hàng, mô tả cửa hàng 15 ngôn ngữ, nộp bản Internal testing / TestFlight đầu tiên.
6. Trên Play Console: App content (Privacy policy, Ads = No, App access, Content rating, Target audience 13+, Data safety theo A2, Government/Financial/Health = No) → Internal testing → Production.
7. Trên App Store Connect: làm theo **B4** (chữ + ảnh đã đẩy bằng script; anh chủ khai App Privacy, Age rating, giá/quốc gia, liên hệ duyệt → Submit for Review).

### Trạng thái phát hành (18/10/2026)
- **Google Play:** bản 1.0.0 (1406) ở **Internal testing** (danh sách "Lexkite team"); App content đã khai đủ (quảng cáo Không, Data safety khớp chính sách, IARC, 13+). Khóa upload PKCS12 ở `~/.config/lexkite/android-upload.*` + 4 GitHub Secrets. Bước sau: Production → gửi duyệt sau khi anh thử bản nội bộ.
- **Apple:** App ID `com.lexkite.app`, `com.lexkite.app.widget`, App Group `group.com.lexkite.app` đã tạo; PLA đã chấp nhận 18/10. **DSA (EU): chưa khai, chưa phát hành EU** – tài khoản Individual sẽ phải công khai địa chỉ nhà. Khi chuyển sang Organization (LLC, D-U-N-S 141146874) → khai trader bằng địa chỉ LLC rồi mở EU.
