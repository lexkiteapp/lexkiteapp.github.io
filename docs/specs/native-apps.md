# Spec – App iOS/Android native (SwiftUI + Jetpack Compose)

> TL;DR: Owner 05/11 chọn viết lại app di động NATIVE THẬT (iOS SwiftUI, Android Kotlin + Compose), chuyên nghiệp như Duolingo, không web bọc vỏ. Bản Capacitor (`mobile/`, App Store 1.0, Play 1.0.1) giữ nguyên trên store tới khi đạt đủ parity (29 mục, `native/shared/parity.json`). Chống lệch 3 bộ code: tokens, chuỗi 15 ngôn ngữ, khung 5 tab và luật chấm điểm đều SINH từ repo (`scripts/native/gen.mjs`), không chép tay; CI kiểm bằng vector chuẩn. Build/test chỉ trên CI (`native-ios.yml` macOS, `native-android.yml` Ubuntu).
> Đọc khi: sửa bất cứ gì trong `native/`, `scripts/native/`, thêm route/tính năng web (phải thêm mục parity), hoặc lên kế hoạch thay bản Capacitor trên store.

## 1. Mục tiêu & điều kiện xong
- App native thay đúng app đang live: **cùng bundle ID `com.lexkite.app`** (iOS + Android), cùng tài khoản store, cùng scheme `lexkite://`, cùng thiết bị hỗ trợ (iPhone + iPad; Android minSdk 24). Version mới 2.0.0; owner tự bấm submit.
- Xong khi: 29/29 mục parity "done" (test cả 2 nền tảng), migration dữ liệu từ bản Capacitor không mất gì (C03), QC CI xanh (snapshot, contrast, Back/X, 60/120 fps, reduced-motion), TestFlight + Play internal track chạy thật.
- Luật cứng: Stitch "Lexkite Kit" là nguồn thiết kế duy nhất; khung 390 + 5 tab Today/Vocab/Skills/Tests/Me (`docs/DESIGN-SYSTEM.md` §5d); nhân vật 2D Ama (giọng nữ) / Carlos (giọng nam); mọi màn học có Back/X ≥ 44; chuyển động mượt, tôn trọng Reduce Motion; $0; không đụng logo/icon khi chưa có OK của owner; không cắt tính năng nào.

## 2. Danh sách parity (kiểm kê app hiện tại)
Nguồn máy đọc: `native/shared/parity.json` (P01–P12 = 74 route web từ `docs/codemap.json`; C01–C16 = năng lực xuyên suốt của bản Capacitor: plugin Firebase Auth/Messaging, LocalNotifications, Haptics, Share, TTS, Filesystem, App Update, widget WidgetKit/Glance, LexAI/LexGenAI, AdMob, OTA). Gate `scripts/test/native-parity.mjs` (npm test):
- route web nào chưa thuộc mục parity → đỏ (thêm tính năng web mà quên native là không lọt);
- mục `done` phải có `testParityP##` (XCTest) **và** `parity_P##` (JUnit) – mỗi mục có test ở cả 2 nền tảng.

| Mốc | Mục |
|---|---|
| M1 | C17 onboarding lần mở đầu · C01 đăng nhập · C02 offline + sync (data contract §4) · nội dung server-driven + Remote Config + Crashlytics (§4) · C03 migration · P01 khung 5 tab · P02 Today · C08 deep link · C09 haptics · C10 i18n · C11 theme |
| M2 | P03 trình học bài · C04 âm thanh · C05 giáo viên 2D (port rig web `TeacherRig`) |
| M3 | P04 ôn tập FSRS · P05 từ vựng/từ điển |
| M4 | P06 nghe/đọc · P07 nói/phát âm · P08 gọi Ama/Carlos · P09 viết/ngữ pháp |
| M5 | P10 thi thử/readiness |
| M6 | P11 Me · P12 video · C06 thông báo · C07 widget · C12 AI · C13 quảng cáo · C14 cập nhật · C15 chia sẻ · C16 ngôn ngữ khác → thay bản Capacitor |

## 3. Một nguồn – chống lệch 3 bộ code (HARD)
`node scripts/native/gen.mjs` (ghi) / `--check` (CI: đỏ khi file sinh lệch nguồn hoặc thiếu bản dịch). Không file Swift/Kotlin nào chứa màu, chữ giao diện hay hằng số chấm điểm viết tay – `scripts/test/native-one-source.mjs` chặn (hex/`Color(0x…)`, `Text("…")`, `.strings`/`strings.xml` viết tay, hằng FSRS ngoài `SRS.*`).

| Dữ liệu | Nguồn | Sinh ra |
|---|---|---|
| Design tokens (màu sáng B/tối A, spacing, radius, typography, motion) | `brand/stitch/tokens.dtcg.json` (Stitch Kit) | `LKDesign/Generated/Tokens.swift`, `design/generated/Tokens.kt` |
| Chuỗi giao diện 15 ngôn ngữ | ID → khóa tiếng Việt ở `native/shared/strings.json`; bản dịch lấy từ `web/js/i18n/en/*.js` + `i18n/ui/<lang>` (đúng pipeline `docs/I18N-PIPELINE.md`) | `native/shared/gen/strings/<lang>.json` + `L10nKey.swift/.kt` (ID có kiểu). Thiếu 1 ngôn ngữ → gen đỏ; thêm chữ mới = thêm qua pipeline web trước |
| Khung app (5 tab, route, icon, 390/16/44) | `TABS` trong `web/js/st/v2/runtime.js` | `frame.json` |
| Luật chấm điểm | FSRS-5 `web/js/core.js` (`SRS.review`), so đáp án `web/js/lesson/engine.js` (`norm`/`check`) | `srs-params.json` trong `vectors/scoring.json` + vector chuẩn (7 chuỗi ôn, 41 ca đáp án, TZ UTC). Swift/Kotlin port phải khớp tuyệt đối (S/D 1e-9, due đúng ms) |
| Nội dung học (bài, từ, câu, ảnh, audio) | Như web: `web/data`, lexicon shards, `content/` qua build hiện có | Không nhúng vào app: app tải JSON qua CDN/API giống web, cache offline. M1 thêm `scripts/native/content-pack.mjs` sinh gói khởi động nhỏ (Today + bài đầu) từ cùng dữ liệu |

Logic lớn hơn (dựng bài `LessonEngine.build`, `pathPlan`, `Session`, rig giáo viên, URL âm thanh) cũng theo cách này: JS web là bản tham chiếu, gen xuất thêm vector cho từng hàm trước khi port (M1: merge sync; M2: engine bài học, rig giáo viên, âm thanh – xem mục Vectors). Không chạy JS trong app (JavaScriptCore/QuickJS) để giữ app nhẹ, native thật.

## 4. Kiến trúc
### iOS (SwiftUI, iOS 17+)
- `native/ios/LexkiteKit` (Swift Package): `LKDesign` (tokens, `LKFrame`), `LKStrings` (`L10n`, 15 ngôn ngữ, RTL), `LKCore` (FSRS, chấm đáp án, sau thêm engine bài học), `LKFeatures` (màn hình). App mỏng `native/ios/App` + `project.yml` (XcodeGen, không sửa tay `.pbxproj`).
- MVVM với `@Observable` view model / màn; điều hướng `NavigationStack` mỗi tab + `TabView` (giữ stack khi đổi tab); màn focus (bài học) là `fullScreenCover` có X + xác nhận nhẹ khi mất tiến độ; vuốt mép iOS + Esc hoạt động.
- Offline-first: SwiftData (`CardModel`, `StatDay`, `Settings`, `SyncMeta` – cùng lược đồ `Cards.make` của web) là nguồn thật; repository + `SyncEngine` actor.
- iOS 17+ (coordinator duyệt 05/11). iOS 15–16: Apple giữ bản 1.x tương thích cuối (last compatible version) – không mất người dùng; BẮT BUỘC ghi trong spec này và release note 2.0.0.

### Android (Kotlin + Compose, minSdk 24, target 36)
- `native/android/app` (M1 tách module `:core`, `:design`, `:feature-*`). MVVM: `ViewModel` + `StateFlow`, Navigation Compose (graph mỗi tab, `BackHandler` cho Back/X), Material 3 chỉ làm khung – mọi màu/kiểu từ token sinh.
- Offline-first: Room (cùng lược đồ) + WorkManager cho sync nền; DataStore cho settings.

### Đồng bộ & đăng nhập (cả 2)
- Firebase Auth hiện có (cùng project, cùng `GoogleService-Info.plist`/`google-services.json` của `mobile/`): Google + Sign in with Apple; khách dùng được không đăng nhập.
- **Data contract dùng chung (HARD, owner 05/11)**: web, add-on, iOS, Android dùng ĐÚNG một backend + schema hiện có, không kho riêng. Tài khoản = Firebase uid. Kho = Google Drive `appDataFolder` (scope `drive.appdata`, đường chính) hoặc D1 `/api/sync` (`functions/api/sync.js`, dự phòng: Apple/không cấp Drive). Tài liệu: `meta` = `{ v: 2, at, stats, game, settings, settingsAt, deleted }` + `cards_0..n` (thẻ theo `Core.Cards.make` + `slim()`: từ vựng, nghĩa, ngữ cảnh, trạng thái FSRS `S/D/due/last/reps/lapses/step/interval`). Gộp 2 chiều, giao hoán + lũy đẳng (`web/js/sync.js`): thẻ theo thời điểm hoạt động gần nhất của TỪNG thẻ, xoá = tombstone `deleted[k]=t` (lấy max), settings theo `settingsAt`, stats/streak/game theo `mergeStats0/mergeRet/mergeGame0`. Offline: ghi local trước (SwiftData/Room), hàng đợi đẩy khi có mạng, cùng nhịp gom như web (`LK_SYNC.d1Every`). gen.mjs xuất `native/shared/gen/contract.json` (JSON Schema sinh từ chính các hàm trên) ở M1.
- **Test CI chéo client (bắt buộc trước khi C02 "done")**: `scripts/test/sync-cross-client.mjs` dựng máy chủ giả (D1 `/api/sync` handler thật trên SQLite bộ nhớ + Drive giả) và 1 tài khoản test giả (không dùng tài khoản thật); kịch bản: web sửa → iOS đọc đúng; Android offline sửa cùng thẻ + xoá thẻ khác → đồng bộ → web/iOS thấy đúng; xung đột cùng thẻ → bản sửa sau thắng. Kịch bản sinh thành vector (`vectors/sync.json`) từ merge JS web; job matrix chạy cùng vector trên Node (web + add-on), XCTest (iOS) và JUnit (Android) song song.
- **Migration (C03)**: lần mở đầu tiên sau khi cập nhật từ bản Capacitor, app đọc IndexedDB cũ (WKWebView ẩn cùng origin `capacitor://localhost` / WebView `https://localhost` trên Android, chạy script export 1 lần) → ghi vào SwiftData/Room → đánh dấu xong. Có test với dump IndexedDB thật (ẩn danh) trên CI.

### Vectors (sinh bởi `gen.mjs` → `scripts/native/gen-sync.mjs`; nguồn = JS web thật chạy trong `node:vm` qua `scripts/native/web-ref.mjs`, không viết lại logic)
- `native/shared/gen/contract.json`: JSON Schema tài liệu sync v2 (thẻ suy từ `Cards.make`/`SRS`/`slim()` thật) + `x-lexkite`: mặc định thẻ, luật khóa (vector `tlKey`), Drive (tên tệp, phong bì gzip+SHA-256), D1 (NB=32, vector `bucketOf`/`hash`), kho IndexedDB.
- `vectors/sync.json`: `now` cố định; `merge[]` 37 ca `{local, remote, out}` (out = `mergeIn` + `snapLocal` thật); `scenarios[]` 6 kịch bản web/iOS/Android/add-on (`steps` edit|delete|offline_edit|sync, `expect.<client>` + `expect.server`); `nonCommutative` = ca web tự không giao hoán (chỉ luật settings khi `settingsAt` hòa/thiếu).
- `vectors/migration.json` + `migration-export.js` (C03): `export` = kết quả script xuất (chỉ đọc) trong WebView cũ, `expect` = Doc + `pulledHashes` do `core.js` thật đọc lại; 8 ca (trống, điển hình, 2k thẻ, unicode, hỏng, localStorage cũ, DB `vocaband`, sandbox/đệm từ điển).
- `content-pack/` (`scripts/native/content-pack.mjs`): `today.json` + `lesson-ngsl1.1.json` (19 từ NGSL đầu, ~6 KB, trần 32 KB).
- `native/shared/flags.json` → `Flags.swift` (LKCore) / `Flags.kt` (:core) + `gen/flags.json` (mặc định Remote Config an toàn offline). `vectors/compat.json` (`scripts/native/content-schema.mjs` = bộ đọc tham chiếu): JSON nội dung `{kind:"lexkite-content-v1", type: today|modules|banner, schema, minApp, version, body, signature}`, ký ECDSA P-256 như OTA web (`scripts/ota/lib.mjs`, khóa `web/js/ota-key.js`; CLI `content-schema.mjs sign` chạy trên CI với `OTA_SIGNING_KEY`), 28 ca app mới↔JSON cũ / app cũ↔JSON mới; test `scripts/test/native-compat.mjs`. Nguồn `native/shared/content/<type>.json` → `content-publish.mjs sign` (CI) → `web/native/content/<type>.json` (commit, Pages phục vụ) = `https://lexkite.com/native/content/<type>.json`. `sync_drive_enabled` mặc định TẮT ở M1 (bản Capacitor live dùng D1). `sync.json`/`migration.json`/`contract` có `lib` = mục thư viện thật cho thẻ L:1.
- **Vector M2** (`scripts/native/gen-lesson.mjs`, `gen-teach.mjs`, `gen-audio.mjs`; test `scripts/test/native-m2-vectors.mjs`, npm test; schema chi tiết: `_doc` của từng tệp + ghi chú bàn giao M2):
  - `vectors/lesson.json` (P03): từ `web/js/lesson/engine.js` thật + thẻ `Cards.make` + bộ DEMO/STARTER của `ui.js` + `web/cpack/lesson/stories.js`: `pickWords` (7 ca), `build` (20 ca: nhiều seed, có/không `off.listen`/`off.speak`, `only`, `calm`, `perWord`, `match:false`, từ không có câu), `adapt` (mỗi dạng × 4 tổ hợp tắt nghe/nói), `check` (đúng/sai mỗi dạng), `Session` (8 kịch bản đúng/sai/bỏ qua, `maxRetry`, `ease`: hàng đợi, tiến độ, combo/best, accuracy) + `results` → FSRS, `storyItems` + phiên truyện, `pathPlan`/`unitPlan`/`nextKind`, `rng`/`shuffle`/`letterBank`/`toks`/`findWord`/`sentenceOf`/`stress`/`usuk`/`visemes`/`calm`/`HARD`/`isDue`. So khớp tuyệt đối.
  - `teach/rig.json` + `vectors/rig.json` (C05): `scenarios[]` (idle · emotions · gestures · nói có mốc · hàng đợi cử chỉ khi đang nói · nói live theo chữ · nghe→nói, thường + `calm`; Ama và Carlos; 1/60 s, ghi mỗi 6 khung), `lipGate[]` (19 câu Kokoro thật: mốc → hình phải hiện trong ±33 ms), `lipsync` (`unpack`, `fromText`, `fromEnv`, `live`, `units`, `stateAt`, `gain`), `matrix[]` (biến đổi cứng), `paint[]` (lệnh vẽ canvas chính xác của lớp mắt/mày/miệng/ria cho 14 trạng thái), `mood[]` (TeacherMood).
  - `vectors/audio.json` (C04): thứ tự gốc CDN + chuyển gốc sau mỗi 2 lỗi, URL từ (`fnv36(voice|headword|s3)`) và câu (`KVoice.lineKey`, `-ls`, `-s2`), `split` câu, `ttsClean`, `genderOf`/`kokoro`/`genderFor`, `voiceScore`/`rank`/`pickVoice` trên danh sách giọng mẫu.
- `scripts/test/sync-cross-client.mjs` (npm test, ~2 s): vector = merge web; giao hoán/lũy đẳng/hấp thụ; 37 ca qua D1 thật (`functions/api/sync.js` trên node:sqlite); 6 kịch bản × D1 + Drive giả (máy mới đăng nhập = `expect.server`); script xuất chạy lại, không ghi IndexedDB.

### Lần mở đầu – onboarding (owner 05/11, HARD; mục parity C17)
- Luồng: splash thương hiệu (< 1 s, không chặn bởi mạng) → Welcome (nhân vật 2D Ama/Carlos, cùng nguồn Stitch với Welcome web PR #608) → 3–4 bước: ngôn ngữ mẹ đẻ · mục tiêu (IELTS/TOEIC/giao tiếp…) · trình độ (kiểm tra nhanh tuỳ chọn, Bỏ qua được) · thời lượng/ngày → Today với bài học đầu. TUYỆT ĐỐI không mở trang blog/trang chủ web.
- Chuẩn Duolingo/Headspace/Apple: một việc/màn, nút chính rõ, thanh tiến độ, Back + Bỏ qua luôn có; học thử trước, mời tạo tài khoản sau; không popup dồn, không quảng cáo; xin quyền thông báo sau bài đầu có giải thích (notifications-ux). Offline được (gói khởi động), i18n 15 ngôn ngữ + RTL, Reduce Motion.
- Lựa chọn lưu vào settings theo data contract (cùng khoá web) → đồng bộ khi đăng nhập sau.
- Test (XCTest + JUnit `testParityC17`/`parity_C17`): lần mở đầu luôn vào onboarding, không bao giờ vào blog; mở lại → Today; Back/Bỏ qua mọi bước; người dùng migrate từ Capacitor đã có dữ liệu → bỏ qua onboarding vào Today.

### Cập nhật không cần duyệt lại store (owner 05/11 – thay OTA của Capacitor)
- **Nội dung do server điều khiển**: bài học, chuỗi dịch, thứ tự module, banner/sự kiện, cấu hình màn Today = JSON đã ký (Ed25519, cùng khoá công khai kiểu `web/js/ota-key.js`) từ CÙNG nguồn web, app chỉ render bằng component native có sẵn. KHÔNG tải code thực thi (App Review 2.5.2 / 3.3.1(B), Play Device and Network Abuse); không đổi mục đích app. Chữ ký sai/hỏng → giữ bản cache cuối + gói khởi động.
- **Lược đồ có phiên bản**: mỗi JSON có `schema` (số nguyên) + `minApp`; app bỏ qua trường lạ, thiếu trường → mặc định; component lạ → bỏ qua khối đó. Test CI (vector `native/shared/gen/vectors/compat.json`): app mới đọc JSON cũ và app cũ (bản trước đã phát hành, snapshot lược đồ) đọc JSON mới đều không lỗi, chạy XCTest + JUnit.
- **Remote Config + feature flag** (Firebase Remote Config, miễn phí): bật/tắt tính năng, A/B, kill switch; mặc định trong app = an toàn khi offline; khoá flag sinh từ một bảng chung (`native/shared/flags.json` → gen) cho cả 2 nền tảng.
- **CI tự submit** (mở rộng `native-release.yml`): App Store Connect API + Play Developer API (fastlane hoặc script), phát hành theo giai đoạn (phased release 7 ngày / staged rollout 1→5→20→50→100 %, dừng khi crash-free < ngưỡng Crashlytics), changelog 15 ngôn ngữ sinh tự động từ commit qua pipeline i18n. Owner chỉ bấm khi Apple/Google bắt buộc.

- **Thiết kế (owner 05/11, HARD)**: mỗi màn native dựng trên Stitch TRƯỚC (design system Stitch hiện có của web/add-on, không tạo hệ mới; theo đúng màn web tương ứng, export ở `brand/stitch/v2/`), rồi mới code SwiftUI/Compose (Sonnet viết, Opus duyệt cuối). Điều hướng/cử chỉ theo HIG/Material 3, nhận diện thương hiệu giống web, dark mode, tương phản ≥ 4.5:1. QC CI `scripts/test/native-visual.mjs`: ảnh native đặt cạnh web + chặn màu lệch token (ΔE) – không cắt tính năng, logo/icon không đổi khi chưa có OK của owner.

## 5. Âm thanh, nhân vật, hệ thống
- **Âm thanh (C04)**: dùng lại file Kokoro đã prerender trên CDN (cùng URL/thứ tự gốc như `web/js/audio.js`, `/audio/{l,w}/…mp3`), cache đĩa + gói offline; chữ động → engine TTS miễn phí trên máy theo tầng (`docs/specs/kokoro-on-device.md`, model tải khi người dùng bật, không nằm trong app), cuối cùng `AVSpeechSynthesizer`/`TextToSpeech` đúng giới tính (Ama nữ, Carlos nam). −16 LUFS như web.
- **Giáo viên (C05)**: **native port của `TeacherRig` web** (`web/js/teacher-rig.js` + `web/js/call/{face,mouths,paint,lipsync}.js`), KHÔNG dùng runtime/tệp Rive. Lý do (đã đo ở #583, xem `docs/specs/teacher-rive-rig.md`): `.riv` là nhị phân không có trình ghi chính thức nên không sinh được ở $0 (rig phải dựng tay trong editor, bản không splash cần gói trả phí), runtime lớn hơn cả khung app, và phải vẽ lại vector làm đổi hình chủ đã duyệt. Native giữ ĐÚNG mô hình input kiểu Rive của rig web: `viseme` (9 hình Rhubarb, bảng `web/js/call/visemes.json`), `emotion` (9 biểu cảm), trigger `gesture` (16 cử chỉ); lõi `machine.step(now)` được port sang Swift/Kotlin và vẽ bằng SwiftUI `Canvas` / Compose `Canvas` trên ảnh đầu trơn `teach/<who>/head-bare-2x.webp` + mắt/mày/miệng/ria vector + ảnh tư thế `still-<pose>.webp` (cùng art 2D trong `web/teach/characters.json`, không vẽ mới, không 3D). Định nghĩa rig (RIG, EMOTIONS, GESTURES, LIMITS, FADE, bảng miệng/viseme, từ điển live) sinh ra `native/shared/gen/teach/rig.json`; khung tham chiếu, lip sync, nét vẽ mặt và mood nằm trong `vectors/rig.json` (chạy từ JS web thật). Lip sync: mốc viseme sinh trên CI từ audio Kokoro (`scripts/lipsync/…`, `web/js/call/cues.js`) phát kèm file âm thanh, đồng bộ theo đồng hồ của player, hình hiện đúng trong **±33 ms** (vector `lipGate`, test XCTest/JUnit chạy lõi native và so). Reduce Motion (`calm`) → khớp cổ/thở đứng yên, vẫn chớp mắt + miệng. Ama giọng nữ / Carlos giọng nam. Ảnh đầu + 9 tư thế dùng nhiều của cả 2 người đóng gói offline (~0,7 MB mỗi nền tảng, byte-for-byte từ web/teach); tư thế khác tải như web, thiếu → `happy`. Chỉ hỏi owner khi đổi style hoặc tốn credit (design-approval 2/11).
- **Thông báo (C06)**: FCM (Android) / APNs qua FCM (iOS) dùng lại backend hiện có + lịch nhắc cục bộ (`UNUserNotificationCenter`, `AlarmManager`/WorkManager) theo `docs/specs/notifications.md`: hỏi quyền mềm sau giá trị, ≤ 1/ngày, giờ yên lặng, giãn cách, lời ấm 15 ngôn ngữ (chuỗi sinh).
- **Haptics (C09)**: `sensoryFeedback` (iOS) / `HapticFeedbackConstants` (Android) cho đúng/sai/xong bài; tắt theo cài đặt hệ thống.
- **Widget (C07)**: viết lại widget hiện có (`mobile/ios/App/LexkiteWidget`, `WordWidget.kt`) bằng WidgetKit + Glance; App Group / DataStore chia sẻ với app; chuỗi 15 ngôn ngữ từ gen.
- **Deep link (C08)**: `lexkite://review`, `lexkite://word/<w>` (giữ nguyên), thêm universal/app links `https://lexkite.com/app/#/…` → cùng bảng route (`frame.json` + parity routes).
- **Chuyển động**: 60/120 fps (ProMotion), animation ≤ 200 ms + press-bounce + ăn mừng nhẹ cuối bài; `accessibilityReduceMotion` / `ANIMATOR_DURATION_SCALE` tắt hết. CI đo frame time (XCTest `XCTOSSignpostMetric`, Macrobenchmark) từ M1.

## 6. CI (không build trên Mac của owner)
| Workflow | Máy | Kiểm |
|---|---|---|
| `native-ios.yml` | `macos-15` + Xcode 26 (repo công khai, miễn phí) | gen `--check`; XCTest `LKCoreTests` (vector chuẩn, 15 ngôn ngữ, 5 tab); snapshot `swift-snapshot-testing` 390 pt sáng/tối × en/vi/ar/de; XcodeGen + build app simulator không ký |
| `native-android.yml` | `ubuntu-latest` | gen `--check`; JUnit (vector chuẩn…); snapshot Roborazzi + Robolectric (không máy ảo) cùng ma trận; APK debug |
| `npm-test` | Ubuntu | `gen.mjs --check`, `native-one-source.mjs`, `native-parity.mjs` |
- Cả 2: `paths` (`native/**`, `scripts/native/**`), `concurrency` theo PR + cancel-in-progress, `timeout-minutes`, không workflow_run.
- Snapshot: lần đầu (chưa có ảnh chuẩn) workflow tự ghi rồi chạy kiểm lại (chứng minh ổn định) và tải artifact `native-*-snapshots`; commit ảnh vào `Tests/LKSnapshotTests/__Snapshots__` / `app/src/test/snapshots` → từ đó mọi PR so ảnh. Đổi giao diện có chủ đích: dispatch với `record: true`.
- Ký + phát hành (M6): mở rộng `ios-testflight.yml` / `android.yml` với target native (cùng secret ASC/Play), owner bấm submit.

## 7. Lộ trình (owner 05/11: nhanh nhờ song song, không giảm chất lượng)
- Mỗi mốc 2–3 ngày, có bản chạy thật: CI tự build + đẩy TestFlight và Play Internal testing sau mỗi mốc xanh (thiếu chứng chỉ/API key → danh sách bước owner trong owner-pending). Bản native chỉ thay app live khi đủ parity, nhưng owner có bản thử sớm.
- Thứ tự theo luồng người học dùng nhiều nhất: **M1** đăng nhập + đồng bộ (C01, C02, C03 migration, data contract + test chéo client) + khung 5 tab + Today → **M2** trình học bài + giáo viên 2D (port rig web) + âm thanh → **M3** Vocab/SRS → **M4** Skills → **M5** Tests → **M6** Me + thông báo/widget/AI/ads → thay bản Capacitor (submit 2.0.0, owner bấm).
- Song song: iOS và Android do 2 subagent làm ở 2 thư mục riêng; CI chạy iOS/Android song song, test chia shard, snapshot theo matrix thiết bị (iPhone SE/15/Pro Max/iPad; Android compact/medium), luôn giữ paths/concurrency/timeout. Không nới ngưỡng, không bỏ test/tính năng.
- Trong lúc chờ native: gửi coordinator danh sách lỗi/tính năng vá nhanh cho bản Capacitor 1.0.x (qua OTA/bản 1.0.x).

## 8. Rủi ro
- Lệch hành vi web ↔ native → mọi logic có vector chuẩn sinh từ JS; thêm hàm = thêm vector trước khi port.
- Font/icon: M0 dùng font hệ thống + SF Symbols/Material Icons (bảng ánh xạ một chỗ trong `gen.mjs`), M1 đóng gói đúng font của web.
- Ảnh snapshot phụ thuộc phiên bản simulator/Robolectric → ghim runner image; ghi lại có chủ đích khi nâng.
- Xcode 26 bắt buộc để nộp App Store (đã chọn trong workflow).
