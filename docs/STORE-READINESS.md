# Sẵn sàng lên Google Play & App Store – Lexkite (com.lexkite.app)

Rà soát ngày 17/10/2026 trên mã nguồn + log CI (android.yml, ios.yml đều xanh). Ký hiệu: ✅ đạt · ⚠️ cần kiểm/làm thêm nhưng không chặn nộp · ❌ chặn nộp.
**👤 = anh chủ làm** (tài khoản, giấy tờ, bấm trên dashboard) · **🛠 = dev làm** (code/CI).

## TRẠNG THÁI HIỆN TẠI (cập nhật 22/10/2026)

| Kênh | Trạng thái |
|---|---|
| **iOS** (App Store Connect app 6824714708) | Bản **1.0 build 5** đã **gửi duyệt 22/10** (phát hành **Manual**). App Privacy đã **Publish**. 28 ảnh iPhone 6.9"/iPad 13" (en/vi) + niêm yết 16 ngôn ngữ đã đẩy bằng `scripts/asc-upload.mjs`. Chưa mở EU (DSA trader chưa khai). |
| **Android** (Play, `com.lexkite.app`) | **Production đã gửi, đang duyệt** (Play Console 22/10: Production Active, 177 quốc gia, Update status "In review"). Internal testing 1.0.0 (1406). Upload key + secrets có; CI `android.yml` ra `.aab`. |
| **Chrome add-on** (CWS `idalfipabpfcajpkfkifbdlpejcdmfcd`) | **2.6.362 live**; **2.6.430 PENDING_REVIEW** từ 22/10. Luật: `docs/CWS-RULES.md`. |

**👤 Việc anh chủ còn phải làm:**
1. iOS: chờ Apple duyệt → bấm **Release** thủ công trên App Store Connect (đã chọn Manual). Bị từ chối → gửi em nội dung để sửa.
2. Android: ✅ đã gửi Production, chờ Google duyệt (22/10).
3. Đăng nhập trong app (Google + Apple): làm các bước console ở **B2** (chưa có `GoogleService-Info.plist` / `google-services.json` trong repo), rồi cập nhật App Privacy + Data safety (B2 bước 8).
4. EU: khai **DSA trader** bằng địa chỉ LLC (D-U-N-S 141146874) rồi mở bán EU (hiện tắt EU-27).
5. (Tùy chọn) Tên người bán hiện "MODIAN LUXURY JEWELRY LLC" – muốn hiện "Lexkite" thì đăng ký DBA (mục C).
6. Kiểm hộp thư `support@lexkite.com` nhận được thư (Apple yêu cầu liên hệ thật).

Khi bật đăng nhập hoặc AdMob: cập nhật A2 + B1 + `PrivacyInfo.xcprivacy` CÙNG LÚC trước khi phát hành bản đó.
Mục đã xong/cũ (Kết luận 17/10, danh sách sửa, A1 tạo khóa ký, B1a bấm App Privacy, B4 các bước nộp 1.0, D thứ tự việc, trạng thái 18/10): `docs/archive/STORE-READINESS-HISTORY.md`.

## A. Google Play

| | Hạng mục | Trạng thái | Ghi chú / việc cần làm |
|---|---|---|---|
| ✅ | targetSdk / compileSdk | 36 / 36 | Yêu cầu từ 31/08/2026: app mới & bản cập nhật phải target **API 36 (Android 16)**. minSdk 24. |
| ✅ | Edge-to-edge (Android 15+ bắt buộc khi target ≥ 35) | Capacitor 8 SystemBars chèn inset vào CSS | ⚠️ 🛠 soi ảnh CI (`lexkite-android-screenshots`) xem thanh trên/dưới không che nội dung; `StatusBar.setBackgroundColor` không còn tác dụng trên Android 15+ (vô hại). |
| ⚠️ | Ký AAB | Code + CI xong, **thiếu khóa** | 👤 tạo upload key + 4 secrets (mục A1). Bật **Play App Signing** (mặc định) – Google giữ khóa ký app, mình chỉ giữ upload key. |
| ✅ | versionCode / versionName | CI: `versionCode = 1000 + run_number` (luôn tăng), `versionName` = `version` trong `mobile/package.json` | Phát hành bản mới: tăng `version` trong `mobile/package.json` (1.0.0 → 1.0.1…). Không build tay rồi tải lên với versionCode lớn hơn của CI. |
| ✅ | Quyền | INTERNET; RECORD_AUDIO (luyện nói, hỏi khi bấm micro); MODIFY_AUDIO_SETTINGS; WAKE_LOCK, RECEIVE_BOOT_COMPLETED, POST_NOTIFICATIONS (plugin thông báo – hỏi khi bật nhắc học); VIBRATE (Haptics) | Đã gỡ SCHEDULE_EXACT_ALARM và 2 quyền FGS. Không có quyền nhạy cảm cần form khai báo. |
| ✅ | Xóa tài khoản trong app | Đã làm (Cài đặt → thẻ tài khoản → Xóa tài khoản) | Hiện app Android **chưa cho tạo/đăng nhập tài khoản** (chỉ trên web) nên yêu cầu này chưa áp dụng, nhưng đã sẵn cho khi bật đăng nhập. |
| ✅ | URL xóa dữ liệu trên web (Data safety bắt buộc) | `https://lexkite.com/en/privacy#delete` | Nêu tên app, các bước (trong app / link / email), dữ liệu bị xóa, dữ liệu giữ lại & thời hạn. |
| ✅ | Chính sách quyền riêng tư | `https://lexkite.com/privacy` (200, 15 ngôn ngữ, nêu MODIAN LUXURY JEWELRY LLC) | |
| ✅ | Quảng cáo | `ADS_CONFIG.enabled = false`, không có SDK AdMob trong app | Play Console → App content → Ads: **No**. Khi bật AdMob: đổi khai báo, thêm UMP, cập nhật Data safety (Device ID, ads). |
| ✅ | App access | Mọi tính năng dùng được **không cần đăng nhập** | Chọn "All functionality is available without special access". |
| ⚠️ | Đối tượng & nội dung | Không hướng tới trẻ em | 👤 Target audience: **13–15, 16–17, 18+** (KHÔNG chọn dưới 13 → tránh chính sách Families). Content rating (IARC): Education/Reference; có tương tác người dùng hạn chế (biệt danh trên bảng xếp hạng, có lọc từ tục) và AI Roleplay → trả lời trung thực, thường ra Everyone/PEGI 3–12. |
| ✅ | 12 tester × 14 ngày | **Không áp dụng cho tài khoản Organization** (chỉ áp cho tài khoản Personal tạo sau 13/11/2023) | Nếu vì lý do nào phải dùng tài khoản Personal → cần 12 người opt-in liên tục 14 ngày ở track Closed testing trước khi xin Production. |
| ⚠️ | Xác minh nhà phát triển Android (2026) | Bản APK thử tải từ GitHub (`android-latest`, ký debug) | Google đang bắt buộc dần ứng dụng cài ngoài Play phải thuộc nhà phát triển đã xác minh. Sau khi có Play Console (đã xác minh) → 👤 đăng ký package `com.lexkite.app` trong tài khoản; bản cài thử nên chuyển sang **Internal testing** của Play thay vì APK debug. |
| ❌ | Ảnh cửa hàng | Có icon 512×512 (`brand/lexkite-icon-512.png`). **Thiếu** feature graphic 1024×500, ảnh điện thoại, ảnh tablet 7"/10" | 🛠 dựng trên CI (Chrome headless, dữ liệu `?demo=1`, như `scripts/mobile-shots.sh`): điện thoại 1080×1920 (≥ 4 ảnh), tablet 1600×2560 / 1920×1200, feature graphic 1024×500 (dùng promo 1400×560 làm gốc). Chữ trên ảnh theo từng ngôn ngữ niêm yết. |
| ⚠️ | Mô tả cửa hàng | Có bản cho add-on (`store/chrome/LISTING.md`) | 🛠 viết bản cho app (tên ≤ 30 ký tự, mô tả ngắn ≤ 80, dài ≤ 4000), không dùng "IELTS/TOEIC" như tên thương hiệu của mình (chỉ "luyện IELTS…" + tuyên bố không liên kết). |

### A2. Data safety (Play Console → App content → Data safety)
Mã hóa khi truyền: **Có** (HTTPS). Người dùng yêu cầu xóa được: **Có** (URL ở trên). Không bán/chia sẻ cho bên thứ ba vì quảng cáo.

| Loại dữ liệu (Play) | Thu thập? | Chia sẻ? | Bắt buộc? | Mục đích | Nguồn trong code |
|---|---|---|---|---|---|
| App activity → App interactions | Có | Không | Bắt buộc (thống kê ẩn danh, mã khách ngẫu nhiên) | Analytics | `app.js` → `/api/hit` (`functions/api/hit.js`) |
| App info & performance → Crash logs, Diagnostics | Có | Không | Bắt buộc | Analytics, App functionality | lỗi JS → `/api/hit`; tốc độ tải (LCP) |
| Location → Approximate location | Có (quốc gia suy từ IP bởi Cloudflare, không lưu IP) | Không | Bắt buộc | Analytics | `hit.js` (cột country) |
| Messages → Other in-app messages / App activity → Other user-generated content | Có (bài viết/câu nói gửi chấm AI, tin Roleplay, nội dung báo lỗi + ảnh chụp màn hình tùy chọn) | Có – **xử lý hộ** bởi Google Gemini / Cloudflare Workers AI (chọn "service provider", không tính là chia sẻ) | Tùy chọn | App functionality | `functions/api/ai.js`, `report.js` |
| Personal info → Email address | Có (chỉ khi người dùng tự nhập trong form liên hệ / muốn nhận tin báo lỗi) | Không | Tùy chọn | App functionality (hỗ trợ) | `contact.js`, `report.js` |
| Audio → Voice or sound recordings | **Không thu thập** (nhận dạng giọng nói trên máy / dịch vụ của hệ điều hành; không gửi lên máy chủ mình) | – | – | – | `speaking.js`, `ui.js` |
| Personal info → Name, Email, User IDs; App activity → learning data | **Chỉ khi bật đăng nhập trong app** – hiện app chưa có → chưa khai | | | Account management, App functionality | `sync.js`, `functions/api/sync.js` |
| Device or other IDs | Có (mã khách ngẫu nhiên do app tạo + mã thiết bị chống lạm dụng, băm IP) | Không | Bắt buộc | Analytics, Fraud prevention/security | `hit.js`, `_quota`/`report.js` |
| Personal info → Name | Có (chỉ khi tự nhập trong form liên hệ) | Không | Tùy chọn | App functionality | `contact.js` |
| Photos and videos → Photos | Có (ảnh chụp màn hình tùy chọn kèm báo lỗi) | Không | Tùy chọn | App functionality | `report.js` |
| App activity → In-app search history | Có, **xử lý tức thời** (từ tra gửi dịch vụ tra cứu, không lưu) – không hiện trên trang Play | Không | Bắt buộc | App functionality | `dictionary.js` |

**Đã khai trên Play Console 17/10/2026** theo đúng bảng này (Email: Tùy chọn · App functionality; Vị trí gần đúng/Tương tác/Crash/Diagnostics: Bắt buộc · Analytics). Xóa dữ liệu: `https://lexkite.com/en/privacy#delete`. Tài khoản: "My app does not allow users to create an account".

Khi bật đăng nhập/AdMob: cập nhật bảng này + nhãn Apple trước khi phát hành bản đó.

---

## B. Apple App Store

| | Hạng mục | Trạng thái | Ghi chú / việc cần làm |
|---|---|---|---|
| ✅ | 4.2 Minimum functionality (app bọc web) | Có tính năng gốc thật | **Widget màn hình chính + màn hình khóa (WidgetKit)**, thông báo nhắc học cục bộ (chạm mở thẳng phiên ôn), Haptics, đọc phát âm bằng TTS gốc, học rảnh tay phát âm thanh khi khóa màn hình (điều khiển trên màn hình khóa/tai nghe qua MediaSession), chạy **offline** (toàn bộ app trong gói), deep link `lexkite://review`, **bảng chia sẻ gốc** (`@capacitor/share` + `@capacitor/filesystem`, `web/js/lib/save-file.js`): thẻ thành tích PNG, Excel .xlsx, sao lưu JSON, Anki .apkg/CSV ghi vào bộ nhớ đệm rồi mở share sheet iOS/Android (Lưu vào Tệp/Drive, gửi AnkiDroid/AnkiMobile…); In/PDF ẩn trong app vì WebView không có hộp in. ⚠️ Gợi ý thêm (🛠, nhỏ): App Shortcuts (nhấn giữ icon → "Ôn ngay"), Spotlight. Ghi rõ các tính năng gốc trong Review Notes. |
| ✅ | 2.5.2 Không tải mã thực thi | `www/` **đóng gói sẵn** (`scripts/build-mobile.sh`), không `server.url`, không service worker; iOS không tải Firebase SDK | Chỉ tải **dữ liệu** (âm thanh audio.lexkite.com, nội dung JSON, API). ⚠️ Khi bật đăng nhập trong app: đóng gói Firebase SDK vào `www/js/vendor/` (đừng tải từ gstatic) – hoặc dùng plugin gốc. |
| ✅ | 4.8 Sign in with Apple | App iOS có Google **và** Apple (SDK gốc, `web/js/native-auth.js`), nút Apple trên cùng, cùng cỡ; entitlement `com.apple.developer.applesignin` đã có trong bản ký (CI kiểm) | Bật thật khi có `GoogleService-Info.plist` + Apple provider trong Firebase – các bước 👤 ở B2. |
| ✅ | 5.1.1(v) Xóa tài khoản trong app | Đã làm | Như mục A. |
| ✅ | Privacy manifest | `App/PrivacyInfo.xcprivacy` (UserDefaults CA92.1 + 1C8F.1 App Group, NSPrivacyTracking=false, dữ liệu thu thập), widget có manifest riêng; Capacitor có manifest riêng | |
| ✅ | Info.plist | Micro + Speech Recognition (mới thêm), không cần Camera/Ảnh/Vị trí | ⚠️ 🛠 Mô tả quyền hiện chỉ tiếng Anh; nên thêm `vi.lproj/InfoPlist.strings` (+ ngôn ngữ khác) – cần sửa project Xcode, làm khi có máy build. |
| ✅ | ATT (App Tracking Transparency) | Không theo dõi, không IDFA | Không cần hỏi ATT. Khi bật AdMob cá nhân hóa → phải thêm ATT + `NSUserTrackingUsageDescription`. |
| ✅ | Export compliance | `ITSAppUsesNonExemptEncryption = false` (chỉ dùng HTTPS của hệ điều hành) | App Store Connect sẽ không hỏi lại. |
| ✅ | UIBackgroundModes `audio` | Dùng thật cho Học rảnh tay (`#/handsfree`) | Ghi trong Review Notes cách thử, kẻo bị hỏi 2.5.4. |
| ✅ | Icon & Launch screen | AppIcon 1024 (không alpha), LaunchScreen.storyboard + splash sáng/tối | |
| ⚠️ | iPad | `TARGETED_DEVICE_FAMILY = 1,2`, xoay đủ 4 hướng | App phải dùng tốt trên iPad (giao diện web có bố cục rộng ≥ 900 px ✅). Bắt buộc ảnh iPad 13" (2064×2752). Nếu không muốn làm ảnh iPad → đổi sang chỉ iPhone (1). |
| ✅ | Xcode 26 | `ios-testflight.yml` + `ios-shots.yml` chọn Xcode 26 trên macos-15 | Bản build TestFlight dựng bằng Xcode 26 / iOS 26 SDK. |
| ✅ | Ký + TestFlight | `.github/workflows/ios-testflight.yml` (API key ASC_*, ký tự động) | Bản 1.0 đã lên TestFlight. Bản mới: chạy lại workflow (build number = số lần chạy). |
| ⚠️ | Age rating | Câu trả lời sẵn: `store/apple/LISTING.md` § Age rating | 👤 bấm theo bảng (mọi mục None/No vì bản iOS không có đăng nhập → không có bảng xếp hạng/biệt danh) rồi **Override → 13+** cho khớp chính sách (không dành cho dưới 13) + Play 13+ + AI Roleplay. Script KHÔNG đụng mục này. |
| ⚠️ | Ảnh App Store | Pipeline xong, ảnh thử ở nhánh `ios-shots` – chụp lại sau khi sửa lỗi app ở B4; iPhone 6.9" 1320×2868 + iPad 13" 2064×2752, 7 ảnh × en/vi, chụp từ app GỐC trên Simulator (`ios-shots.yml` → nhánh `ios-shots`) | Cùng 7 màn hình + chữ như ảnh Google Play (`scripts/lib/app-shots-copy.mjs`). Ngôn ngữ khác dùng ảnh en-US. |
| ✅ | Demo account | Không cần | Ghi "No login required" trong Review Notes. |

### B1. Nhãn quyền riêng tư App Store (App Privacy)
Bảng đầy đủ, đối chiếu từng dòng chính sách mục 2: **`store/apple/LISTING.md` § App Privacy** (cập nhật 20/10/2026 – bản cũ thiếu Name, Photos, Device ID, Search History, Other Diagnostic Data so với Play Data safety). `PrivacyInfo.xcprivacy` đã sửa khớp (có hiệu lực từ build TestFlight kế tiếp).
- Data Used to Track You: **None**.
- Data Linked to You (App Functionality, đều tùy chọn): Name, Email Address, Customer Support, Photos or Videos (form liên hệ / báo lỗi).
- Data Not Linked to You: Other User Content, Search History (App Functionality); Device ID (Analytics + App Functionality); Product Interaction, Coarse Location, Crash Data, Performance Data (Analytics); Other Diagnostic Data (Analytics + App Functionality).
- Khi bật đăng nhập trong app: thêm User ID (Linked) và chuyển dữ liệu học/tương tác sang Linked; sửa `PrivacyInfo.xcprivacy` + Play Data safety cùng lúc.

### B2. 👤 Đăng nhập trong app (Google + Apple) – việc anh chủ làm trên console
Mã, entitlement, plugin, CI đã xong (`web/js/native-auth.js`, `scripts/mobile-auth-config.mjs`). Capability **Sign In with Apple** của App ID `com.lexkite.app` đã được Xcode (ký tự động qua API key) bật – bản archive CI có `com.apple.developer.applesignin`.
1. **Apple Developer → Keys → +**: tên `Lexkite Sign in with Apple`, tích **Sign in with Apple** → Configure → Primary App ID `com.lexkite.app` → Save → Continue → Register → **Download** file `AuthKey_XXXX.p8` (chỉ tải 1 lần), ghi **Key ID**. Team ID = `B285J68262`.
2. **Firebase Console → lexkite-app → Authentication → Sign-in method → Add new provider → Apple → Enable**. Services ID: để trống được (chỉ cần cho web/Android). Mục *OAuth code flow configuration*: Apple team ID `B285J68262`, Key ID (bước 1), dán nội dung file `.p8` → Save. (Cần để thu hồi token Apple khi người dùng xóa tài khoản.)
3. **Firebase → Project settings → General → Add app → iOS**: Bundle ID `com.lexkite.app`, App nickname `Lexkite iOS`, App Store ID `6824714708` → Register app → **Download GoogleService-Info.plist** → bỏ qua các bước còn lại (Next → Continue to console).
4. **Firebase → Add app → Android**: package `com.lexkite.app`, nickname `Lexkite Android` → Register (SHA thêm ở bước 5).
5. **SHA của Android** (Firebase → Project settings → app Android → *Add fingerprint*, thêm cả 4 dòng):
   - Khóa ký của Play (người dùng cài từ Play): **Play Console → Lexkite → Test and release → App integrity → App signing** → "App signing key certificate": SHA-1 và SHA-256.
   - Upload key: cùng trang, "Upload key certificate": SHA-1 và SHA-256.
6. Sau bước 5 → **Download google-services.json** (tải SAU khi thêm SHA để file có OAuth client Android).
7. Gửi em 2 file (hoặc chép vào `mobile/ios/App/App/GoogleService-Info.plist` và `mobile/android/app/google-services.json`). File cấu hình Firebase không phải bí mật (khóa API bị giới hạn theo app); em commit, build CI kiểm (`mobile-auth-config.mjs` chặn file sai dự án/thiếu client), rồi TestFlight/Play nội bộ.
8. **App Store Connect → App Privacy**: thêm Name, Email Address, User ID (Linked to user, App Functionality); Product Interaction → Linked (khớp `PrivacyInfo.xcprivacy`). Play Console → Data safety: thêm Name, Email, User IDs (Account management, App functionality) – khớp `lexkite.com/privacy`.
9. (Tùy chọn) Apple → Sign in with Apple for Email Communication: thêm domain gửi mail để email "Hide My Email" nhận được thư.

### B3. Review Notes (dán vào App Store Connect)
> Lexkite is a free English vocabulary and IELTS/TOEIC/TOEFL practice app. No login is required – every feature works without an account. Signing in (Sign in with Apple or Google) is optional and only syncs progress across devices; account deletion is in-app: Settings → Account card → Delete account. Native features: Home Screen & Lock Screen widgets (long-press Home Screen → add "Lexkite"), daily study reminders (local notifications; Settings → Daily reminder), offline use, haptic feedback, native text-to-speech, and hands-free audio study that keeps playing with the screen locked (Menu → Hands-free, lock-screen controls) – this is why the app declares the "audio" background mode. The microphone and speech recognition are used only when the user taps the mic button in Speaking/Pronunciation practice. The app does not track users and shows no ads.

### B3. Review Notes
Nguồn: `reviewNotes` trong `store/apple/listing.json` (script `asc-upload.mjs` tự đẩy lên; bản đọc được ở cuối `store/apple/LISTING.md`). Bỏ chữ "free", mô tả đúng thanh tab (Today, Vocabulary, Skills, Tests, Me), cách tới từng tính năng gốc và lý do khai background mode "audio".

### B.x Widget "Từ mỗi giờ" (Word of the hour) – nhánh `word-widget`
- Thêm vào **chính extension `LexkiteWidget` đã có** (WidgetBundle: widget ôn tập + `LexkiteWordWidget`), nên **dùng lại** App ID `com.lexkite.app.widget` và App Group `group.com.lexkite.app` đã tạo → **không cần bước nào trên portal**, ký tự động (`-allowProvisioningUpdates` + API key) như cũ. Không tạo bundle id mới `com.lexkite.app.LexkiteWidget` (sẽ phải tạo App ID + gán App Group tay, và đổi id extension làm hỏng bản đã có).
- Nếu sau này đổi bundle id extension: Certificates, IDs & Profiles → Identifiers → + App IDs → `com.lexkite.app.<tên>` → bật **App Groups** → Configure → chọn `group.com.lexkite.app` → Save; rồi chạy lại `ios-testflight.yml` (upload = false để chỉ kiểm ký). Bước "Kiểm entitlements" phải thấy `application-groups`.
- Quyền riêng tư: chỉ đọc/ghi UserDefaults của App Group (lý do `CA92.1` + `1C8F.1` đã khai trong `App/PrivacyInfo.xcprivacy` và `LexkiteWidget/PrivacyInfo.xcprivacy`); không gọi mạng, **không thông báo**, không quyền mới. Android: AlarmManager không chính xác (không `SCHEDULE_EXACT_ALARM`), không quyền mới.
- Dữ liệu: `web/js/widget-feed.js` (gói lười `wfeed`) → plugin nội bộ `WordWidget.setWords/reload` (`App/WordWidgetPlugin.swift`, `WordWidgetPlugin.kt`); widget `LexkiteWidget/WordWidget.swift` + `WordViews.swift` + `WordFeed.swift`, Android `WordWidget.kt` + `layout/widget_word*.xml`. Chạm → `lexkite://word/<từ>` → `#/dict/<từ>`.

---

## C. Chung cho cả hai

| | Hạng mục | Trạng thái | Ghi chú |
|---|---|---|---|
| ✅ | Privacy URL | `https://lexkite.com/privacy` | |
| ✅ | Support URL | `https://lexkite.com/app/#/contact` (form liên hệ) + `support@lexkite.com` | ⚠️ Apple yêu cầu trang hỗ trợ có thông tin liên hệ thật: kiểm hộp thư support@lexkite.com nhận được thư. |
| ✅ | Điều khoản | `https://lexkite.com/terms` | |
| ✅ | Nội dung bundle vs tải từ xa | Bundled `www/` (Android `https://localhost`, iOS `capacitor://localhost`) | Cập nhật giao diện = phát hành bản app mới (không đẩy JS từ xa). |
| ✅ | Chạy lần đầu khi offline | Toàn bộ app + từ điển trong gói; âm thanh người thật & AI cần mạng (tự dùng TTS gốc khi mất mạng) | ⚠️ 🛠 thêm 1 bước CI: bật chế độ máy bay trên emulator rồi chụp màn hình lần mở đầu. |
| ✅ | Link ngoài | Capacitor mở trang ngoài app bằng trình duyệt hệ thống (không giữ trong WebView) | |
| ⚠️ | Deep link | Chỉ có `lexkite://review` | Không bắt buộc. Universal Links / App Links (`lexkite.com/app/...` mở thẳng app) làm sau – cần `apple-app-site-association` + `assetlinks.json` (SHA-256 của khóa Play App Signing). |
| ⚠️ | Bàn phím / vùng an toàn | iOS `contentInset: never` + CSS `env(safe-area-inset-*)`; Android inset CSS của Capacitor 8 | 🛠 kiểm trên ảnh CI các trang có ô nhập (Viết, tra từ) với bàn phím mở. |
| ⚠️ | Thương hiệu người bán | Tên hiển thị người bán = **MODIAN LUXURY JEWELRY LLC** (pháp nhân của D-U-N-S) | Không sai luật nhưng người dùng thấy "công ty trang sức" bán app học tiếng Anh. Nếu muốn hiện "Lexkite": đăng ký tên thương mại (DBA "Lexkite") với Wyoming + cập nhật D-U-N-S trước khi đăng ký Apple. |
| ⚠️ | Email & website khi đăng ký Organization | | Apple/Google xác minh tổ chức: dùng email tên miền (`support@lexkite.com` hoặc `admin@lexkite.com`), website `https://lexkite.com` (trang chính sách đã nêu tên LLC + địa chỉ ✅). Số điện thoại của LLC phải nghe máy được (Apple gọi xác minh). |
