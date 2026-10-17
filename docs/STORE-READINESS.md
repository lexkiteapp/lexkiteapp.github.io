# Sẵn sàng lên Google Play & App Store – Lexkite (com.lexkite.app)

Rà soát ngày 17/10/2026 trên mã nguồn + log CI (android.yml, ios.yml đều xanh). Ký hiệu: ✅ đạt · ⚠️ cần kiểm/làm thêm nhưng không chặn nộp · ❌ chặn nộp.
**👤 = anh chủ làm** (tài khoản, giấy tờ, bấm trên dashboard) · **🛠 = dev làm** (code/CI).

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

### A1. 👤 Tạo khóa ký Android & GitHub Secrets (làm 1 lần)
1. Trên Mac (Terminal, nhẹ): `keytool -genkeypair -v -keystore ~/lexkite-upload.jks -alias lexkite-upload -keyalg RSA -keysize 4096 -validity 10000` → đặt mật khẩu mạnh (ghi vào trình quản lý mật khẩu).
2. **Sao lưu** `~/lexkite-upload.jks` + mật khẩu ở 2 nơi (mất upload key vẫn xin Google đặt lại được, nhưng mất vài ngày).
3. GitHub repo `lexkiteapp/lexkiteapp.github.io` → Settings → Secrets and variables → Actions → New repository secret:
   - `ANDROID_KEYSTORE_BASE64` = nội dung `base64 -i ~/lexkite-upload.jks | pbcopy` (dán)
   - `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS` (= `lexkite-upload`), `ANDROID_KEY_PASSWORD`
   (hoặc nhắn em – em đẩy secret bằng API mã hóa libsodium, không in ra.)
4. Chạy workflow **Build Android app** → artifact `lexkite-play-aab` → tải `.aab` lên Play Console → **Testing → Internal testing** trước, rồi Production.

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
| Device or other IDs | Không (mã khách là số ngẫu nhiên do app tạo; Play coi là "App interactions" kèm định danh – khai "Có liên kết với thiết bị: Không") | | | | |

Khi bật đăng nhập/AdMob: cập nhật bảng này + nhãn Apple trước khi phát hành bản đó.

---

## B. Apple App Store

| | Hạng mục | Trạng thái | Ghi chú / việc cần làm |
|---|---|---|---|
| ✅ | 4.2 Minimum functionality (app bọc web) | Có tính năng gốc thật | **Widget màn hình chính + màn hình khóa (WidgetKit)**, thông báo nhắc học cục bộ (chạm mở thẳng phiên ôn), Haptics, đọc phát âm bằng TTS gốc, học rảnh tay phát âm thanh khi khóa màn hình (điều khiển trên màn hình khóa/tai nghe qua MediaSession), chạy **offline** (toàn bộ app trong gói), deep link `lexkite://review`. ⚠️ Gợi ý thêm (🛠, nhỏ): `@capacitor/share` (chia sẻ thẻ/kết quả bằng share sheet gốc), App Shortcuts (nhấn giữ icon → "Ôn ngay"), Spotlight. Ghi rõ các tính năng gốc trong Review Notes. |
| ✅ | 2.5.2 Không tải mã thực thi | `www/` **đóng gói sẵn** (`scripts/build-mobile.sh`), không `server.url`, không service worker; iOS không tải Firebase SDK | Chỉ tải **dữ liệu** (âm thanh audio.lexkite.com, nội dung JSON, API). ⚠️ Khi bật đăng nhập trong app: đóng gói Firebase SDK vào `www/js/vendor/` (đừng tải từ gstatic) – hoặc dùng plugin gốc. |
| ✅ | 4.8 Sign in with Apple | **Hiện không bắt buộc**: app iOS chưa có đăng nhập (chỉ trên web) | Bắt buộc **ngay khi** app iOS có "Đăng nhập Google". Đã chuẩn bị: web Firebase Apple provider sau cờ `LK_AUTH.apple`. Cho app gốc nên dùng `@capacitor-firebase/authentication` (Google + Apple gốc, 1 plugin) + capability "Sign in with Apple". Các bước 👤 ở B2. |
| ✅ | 5.1.1(v) Xóa tài khoản trong app | Đã làm | Như mục A. |
| ✅ | Privacy manifest | `App/PrivacyInfo.xcprivacy` (UserDefaults CA92.1 + 1C8F.1 App Group, NSPrivacyTracking=false, dữ liệu thu thập), widget có manifest riêng; Capacitor có manifest riêng | |
| ✅ | Info.plist | Micro + Speech Recognition (mới thêm), không cần Camera/Ảnh/Vị trí | ⚠️ 🛠 Mô tả quyền hiện chỉ tiếng Anh; nên thêm `vi.lproj/InfoPlist.strings` (+ ngôn ngữ khác) – cần sửa project Xcode, làm khi có máy build. |
| ✅ | ATT (App Tracking Transparency) | Không theo dõi, không IDFA | Không cần hỏi ATT. Khi bật AdMob cá nhân hóa → phải thêm ATT + `NSUserTrackingUsageDescription`. |
| ✅ | Export compliance | `ITSAppUsesNonExemptEncryption = false` (chỉ dùng HTTPS của hệ điều hành) | App Store Connect sẽ không hỏi lại. |
| ✅ | UIBackgroundModes `audio` | Dùng thật cho Học rảnh tay (`#/handsfree`) | Ghi trong Review Notes cách thử, kẻo bị hỏi 2.5.4. |
| ✅ | Icon & Launch screen | AppIcon 1024 (không alpha), LaunchScreen.storyboard + splash sáng/tối | |
| ⚠️ | iPad | `TARGETED_DEVICE_FAMILY = 1,2`, xoay đủ 4 hướng | App phải dùng tốt trên iPad (giao diện web có bố cục rộng ≥ 900 px ✅). Bắt buộc ảnh iPad 13" (2064×2752). Nếu không muốn làm ảnh iPad → đổi sang chỉ iPhone (1). |
| ❌ | Xcode 26 | CI đã chuyển sang chọn Xcode 26 (nếu máy chủ có) | 🛠 sau khi ship xem log bước "Chọn Xcode 26"; nếu cảnh báo "chưa có" → đổi `runs-on: macos-26`. |
| ❌ | Ký + TestFlight | Chưa có | 👤 sau khi có tài khoản: tạo App ID `com.lexkite.app` + `com.lexkite.app.widget`, App Group `group.com.lexkite.app` (bật cho cả 2), App Store Connect API key (.p8, Issuer ID, Key ID) → nhắn em thêm job archive + upload TestFlight trên CI (cần `CURRENT_PROJECT_VERSION` tăng mỗi bản – sẽ lấy theo số lần chạy). Hoặc dùng Xcode Cloud (miễn phí 25 giờ/tháng). |
| ⚠️ | Age rating | | 👤 Bảng hỏi mới của Apple: không bạo lực/tình dục; có **nội dung người dùng tạo** hạn chế (biệt danh bảng xếp hạng có lọc) và **AI chatbot** (Roleplay) → dự kiến **13+**. Khớp chính sách: không dành cho dưới 13. |
| ❌ | Ảnh App Store | Chưa có | 🛠 iPhone 6.9" (1320×2868 hoặc 1290×2796) ≥ 3 ảnh; iPad 13" (2064×2752) nếu giữ iPad. |
| ✅ | Demo account | Không cần | Ghi "No login required" trong Review Notes. |

### B1. Nhãn quyền riêng tư App Store (App Privacy)
- Data Used to Track You: **None**.
- Data Not Linked to You: Product Interaction (Analytics), Performance Data (Analytics), Crash Data (Analytics), Coarse Location (Analytics – quốc gia từ IP), Other User Content (App Functionality – văn bản gửi chấm AI/Roleplay, báo lỗi), Customer Support (App Functionality).
- Data Linked to You: Email Address (App Functionality – chỉ khi người dùng tự nhập để được trả lời).
- Khi bật đăng nhập trong app: thêm Name, Email, User ID (Linked, App Functionality) và chuyển dữ liệu học/tương tác sang Linked; sửa `PrivacyInfo.xcprivacy` theo ghi chú trong file.

### B2. 👤 Sign in with Apple (chỉ cần khi bật đăng nhập trong app iOS)
1. developer.apple.com → Certificates, IDs & Profiles → Identifiers → `com.lexkite.app` → bật **Sign In with Apple**.
2. Identifiers → **Services IDs** → tạo `com.lexkite.web` → bật Sign In with Apple → Configure: Primary App ID `com.lexkite.app`; Domains: `lexkite-app.firebaseapp.com`, `lexkite.com`; Return URL: `https://lexkite-app.firebaseapp.com/__/auth/handler`.
3. Keys → tạo key có **Sign in with Apple** → tải file `.p8` (chỉ tải được 1 lần), ghi Key ID + Team ID.
4. Firebase Console → dự án **lexkite-app** → Authentication → Sign-in method → **Apple** → Enable: Services ID `com.lexkite.web`, Team ID, Key ID, dán nội dung `.p8`. Kiểm Authorized domains có `lexkite.com`.
5. Apple → Email relay: thêm `noreply@lexkite-app.firebaseapp.com` / domain gửi mail của mình (để email "Hide my email" nhận được thư báo lỗi).
6. Nhắn em: em đổi `LK_AUTH.apple = true` (web), cài plugin đăng nhập gốc cho app (Google + Apple) và bật capability trên Xcode.

### B3. Review Notes (dán vào App Store Connect)
> Lexkite is a free English vocabulary and IELTS/TOEIC/TOEFL practice app. No login is required – every feature works without an account. Native features: Home Screen & Lock Screen widgets (long-press Home Screen → add "Lexkite"), daily study reminders (local notifications; Settings → Daily reminder), offline use, haptic feedback, native text-to-speech, and hands-free audio study that keeps playing with the screen locked (Menu → Hands-free, lock-screen controls) – this is why the app declares the "audio" background mode. The microphone and speech recognition are used only when the user taps the mic button in Speaking/Pronunciation practice. The app does not track users and shows no ads.

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

## D. 👤 Thứ tự việc của anh
1. D-U-N-S cho MODIAN LUXURY JEWELRY LLC (miễn phí, 5–14 ngày; tra/ xin tại developer.apple.com/enroll/duns-lookup). Tên, địa chỉ phải **khớp từng chữ** với giấy tờ Wyoming.
2. Apple Developer Program → Enroll as Organization (99 USD/năm), đăng nhập bằng Apple ID dùng email tên miền.
3. Google Play Console → Organization (25 USD), cùng D-U-N-S; xác minh danh tính + số điện thoại + email.
4. Tạo upload key + secrets (A1).
5. Báo em khi xong 2 tài khoản → em làm: job TestFlight, ảnh cửa hàng, mô tả cửa hàng 15 ngôn ngữ, nộp bản Internal testing / TestFlight đầu tiên.
6. Trên Play Console: App content (Privacy policy, Ads = No, App access, Content rating, Target audience 13+, Data safety theo A2, Government/Financial/Health = No) → Internal testing → Production.
7. Trên App Store Connect: App Privacy (B1), Age rating, Review Notes (B3), Export compliance (đã tự khai), ảnh → Submit for Review.
