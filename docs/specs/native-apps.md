# Spec – App iOS/Android native (SwiftUI + Jetpack Compose)

> TL;DR: Owner 05/11 chọn viết lại app di động NATIVE THẬT (iOS SwiftUI, Android Kotlin + Compose), chuyên nghiệp như Duolingo, không web bọc vỏ. Bản Capacitor (`mobile/`, App Store 1.0, Play 1.0.1) giữ nguyên trên store tới khi đạt đủ parity (28 mục, `native/shared/parity.json`). Chống lệch 3 bộ code: tokens, chuỗi 15 ngôn ngữ, khung 5 tab và luật chấm điểm đều SINH từ repo (`scripts/native/gen.mjs`), không chép tay; CI kiểm bằng vector chuẩn. Build/test chỉ trên CI (`native-ios.yml` macOS, `native-android.yml` Ubuntu).
> Đọc khi: sửa bất cứ gì trong `native/`, `scripts/native/`, thêm route/tính năng web (phải thêm mục parity), hoặc lên kế hoạch thay bản Capacitor trên store.

## 1. Mục tiêu & điều kiện xong
- App native thay đúng app đang live: **cùng bundle ID `com.lexkite.app`** (iOS + Android), cùng tài khoản store, cùng scheme `lexkite://`, cùng thiết bị hỗ trợ (iPhone + iPad; Android minSdk 24). Version mới 2.0.0; owner tự bấm submit.
- Xong khi: 28/28 mục parity "done" (test cả 2 nền tảng), migration dữ liệu từ bản Capacitor không mất gì (C03), QC CI xanh (snapshot, contrast, Back/X, 60/120 fps, reduced-motion), TestFlight + Play internal track chạy thật.
- Luật cứng: Stitch "Lexkite Kit" là nguồn thiết kế duy nhất; khung 390 + 5 tab Today/Vocab/Skills/Tests/Me (`docs/DESIGN-SYSTEM.md` §5d); nhân vật 2D Ama (giọng nữ) / Carlos (giọng nam); mọi màn học có Back/X ≥ 44; chuyển động mượt, tôn trọng Reduce Motion; $0; không đụng logo/icon khi chưa có OK của owner; không cắt tính năng nào.

## 2. Danh sách parity (kiểm kê app hiện tại)
Nguồn máy đọc: `native/shared/parity.json` (P01–P12 = 74 route web từ `docs/codemap.json`; C01–C16 = năng lực xuyên suốt của bản Capacitor: plugin Firebase Auth/Messaging, LocalNotifications, Haptics, Share, TTS, Filesystem, App Update, widget WidgetKit/Glance, LexAI/LexGenAI, AdMob, OTA). Gate `scripts/test/native-parity.mjs` (npm test):
- route web nào chưa thuộc mục parity → đỏ (thêm tính năng web mà quên native là không lọt);
- mục `done` phải có `testParityP##` (XCTest) **và** `parity_P##` (JUnit) – mỗi mục có test ở cả 2 nền tảng.

| Mốc | Mục |
|---|---|
| M1 | P01 khung 5 tab · P02 Today · P03 trình học bài · C01 đăng nhập · C03 migration · C04 âm thanh · C05 giáo viên Rive · C08 deep link · C09 haptics · C10 i18n · C11 theme |
| M2 | P04 ôn tập FSRS · P05 từ vựng/từ điển · C02 offline + sync |
| M3 | P06 nghe/đọc · P07 nói/phát âm · P09 viết/ngữ pháp |
| M4 | P08 gọi Ama/Carlos · P10 thi thử/readiness |
| M5 | P11 Me (stats, streak, league, settings, báo lỗi…) · P12 video · C06 thông báo · C07 widget · C15 chia sẻ |
| M6 | C12 AI trên máy · C13 quảng cáo · C14 cập nhật · C16 khóa học ngôn ngữ khác → **thay bản Capacitor trên store** |

## 3. Một nguồn – chống lệch 3 bộ code (HARD)
`node scripts/native/gen.mjs` (ghi) / `--check` (CI: đỏ khi file sinh lệch nguồn hoặc thiếu bản dịch). Không file Swift/Kotlin nào chứa màu, chữ giao diện hay hằng số chấm điểm viết tay – `scripts/test/native-one-source.mjs` chặn (hex/`Color(0x…)`, `Text("…")`, `.strings`/`strings.xml` viết tay, hằng FSRS ngoài `SRS.*`).

| Dữ liệu | Nguồn | Sinh ra |
|---|---|---|
| Design tokens (màu sáng B/tối A, spacing, radius, typography, motion) | `brand/stitch/tokens.dtcg.json` (Stitch Kit) | `LKDesign/Generated/Tokens.swift`, `design/generated/Tokens.kt` |
| Chuỗi giao diện 15 ngôn ngữ | ID → khóa tiếng Việt ở `native/shared/strings.json`; bản dịch lấy từ `web/js/i18n/en/*.js` + `i18n/ui/<lang>` (đúng pipeline `docs/I18N-PIPELINE.md`) | `native/shared/gen/strings/<lang>.json` + `L10nKey.swift/.kt` (ID có kiểu). Thiếu 1 ngôn ngữ → gen đỏ; thêm chữ mới = thêm qua pipeline web trước |
| Khung app (5 tab, route, icon, 390/16/44) | `TABS` trong `web/js/st/v2/runtime.js` | `frame.json` |
| Luật chấm điểm | FSRS-5 `web/js/core.js` (`SRS.review`), so đáp án `web/js/lesson/engine.js` (`norm`/`check`) | `srs-params.json` trong `vectors/scoring.json` + vector chuẩn (7 chuỗi ôn, 41 ca đáp án, TZ UTC). Swift/Kotlin port phải khớp tuyệt đối (S/D 1e-9, due đúng ms) |
| Nội dung học (bài, từ, câu, ảnh, audio) | Như web: `web/data`, lexicon shards, `content/` qua build hiện có | Không nhúng vào app: app tải JSON qua CDN/API giống web, cache offline. M1 thêm `scripts/native/content-pack.mjs` sinh gói khởi động nhỏ (Today + bài đầu) từ cùng dữ liệu |

Logic lớn hơn (dựng bài `LessonEngine.build`, `pathPlan`, `Session`) cũng theo cách này: JS web là bản tham chiếu, gen xuất thêm vector cho từng hàm trước khi port (M1: build/Session/pathPlan; M2: merge sync). Không chạy JS trong app (JavaScriptCore/QuickJS) để giữ app nhẹ, native thật.

## 4. Kiến trúc
### iOS (SwiftUI, iOS 17+)
- `native/ios/LexkiteKit` (Swift Package): `LKDesign` (tokens, `LKFrame`), `LKStrings` (`L10n`, 15 ngôn ngữ, RTL), `LKCore` (FSRS, chấm đáp án, sau thêm engine bài học), `LKFeatures` (màn hình). App mỏng `native/ios/App` + `project.yml` (XcodeGen, không sửa tay `.pbxproj`).
- MVVM với `@Observable` view model / màn; điều hướng `NavigationStack` mỗi tab + `TabView` (giữ stack khi đổi tab); màn focus (bài học) là `fullScreenCover` có X + xác nhận nhẹ khi mất tiến độ; vuốt mép iOS + Esc hoạt động.
- Offline-first: SwiftData (`CardModel`, `StatDay`, `Settings`, `SyncMeta` – cùng lược đồ `Cards.make` của web) là nguồn thật; repository + `SyncEngine` actor.
- iOS 15–16 (bản Capacitor đang hỗ trợ): Apple giữ bản 1.x tương thích cuối cho máy đó (last compatible version) – không mất người dùng; ghi trong release note.

### Android (Kotlin + Compose, minSdk 24, target 36)
- `native/android/app` (M1 tách module `:core`, `:design`, `:feature-*`). MVVM: `ViewModel` + `StateFlow`, Navigation Compose (graph mỗi tab, `BackHandler` cho Back/X), Material 3 chỉ làm khung – mọi màu/kiểu từ token sinh.
- Offline-first: Room (cùng lược đồ) + WorkManager cho sync nền; DataStore cho settings.

### Đồng bộ & đăng nhập (cả 2)
- Firebase Auth hiện có (cùng project, cùng `GoogleService-Info.plist`/`google-services.json` của `mobile/`): Google + Sign in with Apple; khách dùng được không đăng nhập.
- Sync như web (`docs/SYNC-DRIVE.md`): Google Drive `appDataFolder` của chính người học (scope `drive.appdata`) là đường chính, D1 `/api/sync` dự phòng (Apple/không cấp Drive); gộp 2 chiều xác định theo hoạt động gần nhất + tombstone – port + vector chuẩn từ `web/js/sync.js`.
- **Migration (C03)**: lần mở đầu tiên sau khi cập nhật từ bản Capacitor, app đọc IndexedDB cũ (WKWebView ẩn cùng origin `capacitor://localhost` / WebView `https://localhost` trên Android, chạy script export 1 lần) → ghi vào SwiftData/Room → đánh dấu xong. Có test với dump IndexedDB thật (ẩn danh) trên CI.

## 5. Âm thanh, nhân vật, hệ thống
- **Âm thanh (C04)**: dùng lại file Kokoro đã prerender trên CDN (cùng URL/thứ tự gốc như `web/js/audio.js`, `/audio/{l,w}/…mp3`), cache đĩa + gói offline; chữ động → engine TTS miễn phí trên máy theo tầng (`docs/specs/kokoro-on-device.md`, model tải khi người dùng bật, không nằm trong app), cuối cùng `AVSpeechSynthesizer`/`TextToSpeech` đúng giới tính (Ama nữ, Carlos nam). −16 LUFS như web.
- **Giáo viên (C05)**: Rive native runtime (`rive-ios`, `rive-android`, MIT). Một file `.riv` / nhân vật dựng từ CHÍNH art 2D trong `web/teach/characters.json` (không vẽ mới, không 3D); state machine: input `viseme` (0–N, cùng bảng viseme `LessonEngine.visemes`/`scripts/lipsync`), `emotion`, `gesture` (thumbs_up, clap, hold_card…), `idle`. Lip sync: timeline viseme sinh trên CI từ audio Kokoro (`scripts/lipsync/visemes-sync.mjs`) phát kèm file âm thanh, đồng bộ theo đồng hồ của player, sai lệch ≤ ±33 ms (test CI đo trên frame). Reduce Motion → tư thế tĩnh + miệng tối giản. Đặt giáo viên kiểu Duolingo (cùng ánh sáng/tỉ lệ, chạm nền, không quầng). File `.riv` cần owner duyệt art trước (luật nhân vật).
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

## 7. Lộ trình
- **M0 (PR này)**: spec, gen một nguồn, khung `native/ios` + `native/android` chạy trên CI (5 tab, top bar 3 biến thể, Today card, FSRS + chấm đáp án port khớp vector, snapshot), gate parity/one-source.
- **M1**: khung 5 tab thật (port Stitch Today + lesson v2: `brand/stitch/v2`), trình học bài đủ 7 dạng + feedback sheet + lesson complete, đăng nhập Firebase, migration C03, âm thanh Kokoro, giáo viên Rive (sau khi owner duyệt `.riv`), deep link, haptics, font Plus Jakarta Sans + Material Symbols subset (cùng nguồn OFL/Apache với web) – cả 2 nền tảng, so SSIM với ref Stitch.
- **M2–M5**: theo bảng §2. **M6**: phần còn lại → TestFlight/Play internal → owner submit 2.0.0 thay bản Capacitor; sau đó `mobile/` chuyển sang chế độ chỉ-sửa-lỗi rồi lưu trữ.

## 8. Rủi ro
- Lệch hành vi web ↔ native → mọi logic có vector chuẩn sinh từ JS; thêm hàm = thêm vector trước khi port.
- Font/icon: M0 dùng font hệ thống + SF Symbols/Material Icons (bảng ánh xạ một chỗ trong `gen.mjs`), M1 đóng gói đúng font của web.
- Ảnh snapshot phụ thuộc phiên bản simulator/Robolectric → ghim runner image; ghi lại có chủ đích khi nâng.
- Xcode 26 bắt buộc để nộp App Store (đã chọn trong workflow).
