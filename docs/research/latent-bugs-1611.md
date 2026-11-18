# Soát lỗi tiềm ẩn trên main – 16/11

> TL;DR: 6 vùng soát chỉ-đọc + 1 lượt kiểm lại độc lập. 2 P0 (cùng cơ chế: máy rỗng đẩy gói rỗng đè cloud), 6 P1, còn lại P2. Không sửa code trong PR này; mỗi mục giao chủ vùng.
> Đọc khi: nhận việc sửa lỗi trong vùng của mình.

Cách soát: đọc code + chạy node nhỏ + curl HEAD (chỉ đọc), trên bản main lúc ~abeaa266e5 (bot đã đẩy tiếp tới 524f29e84c, số dòng có thể lệch vài dòng). Phán quyết: **CONFIRMED** = tự tái hiện hoặc đọc thấy rõ; **PLAUSIBLE** = đúng theo code, cần thiết bị/môi trường (Swift, Kotlin, iPhone, env Cloudflare) mới chốt. Không có mục nào bị kiểm lại bác bỏ hoàn toàn; 2 mục chỉ đúng một phần (ghi ở cuối). Mức là mức SAU kiểm lại.

## Chủ vùng: điều phối (không có chủ riêng) – lưu & đồng bộ, lõi game

### P0
- **S1. "Xóa dữ liệu trên thiết bị này" làm rỗng cả cloud (đường D1)** – CONFIRMED. `web/js/settings.js:229-233` đặt cards/stats/game rỗng nhưng không xóa `pulledHashes` (chỉ ghi ở `web/js/sync.js:269,427`); lần đồng bộ sau `sync.js:244` gửi `have` cũ, `:260` đặt `sentHashes`, `:410-419` đẩy gói rỗng; `functions/api/sync.js:161-190` thay nguyên khóa, không chặn gói ít thẻ hơn. Tái hiện (harness `scripts/test/account-flow.mjs` + server giả tôn trọng `have`): đồng bộ 2 thẻ → reset → đồng bộ ⇒ server còn 0 gói. Đường Drive tương tự (`sync-drive.js:156-166` ghi ảnh rỗng đè tệp chính) – PLAUSIBLE, nhẹ hơn nhờ 3 khe sao lưu xoay vòng (`:167-171`). Nhãn nút nói "trên thiết bị này" nên người dùng không biết sẽ mất cloud.
- **S2. Đổi tài khoản + "Hủy" gộp rồi đăng nhập lại → gói rỗng đè cloud** – CONFIRMED, cùng cơ chế S1. B có 2 thẻ → đăng nhập A, "Hủy" → đăng nhập lại B ⇒ gói thẻ trên server B: 2 → 0. `Sync.restoreBackup` (`sync.js:512`) không có UI nên không tự cứu được. Điều kiện hẹp hơn S1: web mặc định Drive (`firebase-config.js:14`), đường D1 chỉ cho Apple/email/Google không cấp Drive.
  - Hướng sửa chung (gợi ý): xóa `pulledHashes[uid]` khi xóa local; server từ chối/cảnh báo gói mới ít thẻ hơn hẳn mà không có dấu xóa.

### P1
- **S3. Drive: đổi tài khoản không hỏi, trộn dữ liệu 2 người** – CONFIRMED (đọc). `lastUid` chỉ kiểm trong `pullMerge0` (`sync.js:250-255`); `start0` (`:352-368`) → `driveRun` → `sync-drive.js once()` gộp thẻ tài khoản trước rồi đẩy lên Drive người mới. Cần: A đăng xuất (dữ liệu giữ trên máy), B từng dùng Drive trên máy này đăng nhập.

### P2
- `web/js/game.js:72` `Game.mutate` không có nhánh lỗi: một lần `Store.set` ném (quota/IDB) thì mọi `mutate` sau bị từ chối đến khi có `track` (CONFIRMED bằng node: m1,m2,m3 rej, track ok, m4 ok). Dùng bởi đóng băng chuỗi, cứu chuỗi, retention, undo.
- `web/js/sync.js:128-131` `mergeGame`: `questsDone` ghi đè theo ngày trong khi `days` gộp max → nhận lại +30 XP nhiệm vụ (CONFIRMED đọc); `freezes`/`frozen` có thể cho lượt đóng băng đã tiêu sống lại (PLAUSIBLE); `xp` lấy max nên mất XP bên thấp (theo thiết kế).
- Chuỗi/đóng băng: `app.js:177-181` huy hiệu streak3/7/30 sớm 1 ngày khi học bằng thẻ ôn (`study.js:363` logReview trước `reward`) – CONFIRMED đọc; `app.js:185-186` `freezeAt` không xóa khi đứt chuỗi nên dựng lại chuỗi 7 không được thưởng lượt; `study.js:382` `App.reward` không await → 2 lần chấm sát nhau nhận 2 lượt đóng băng; `streak-ui.js:104-106` `openExplainer()` truyền `stats` thay `game` nên luôn "0/2" (so `stats-page.js:103`, `retention.js:355`).
- `web/js/handoff.js:50-56` nhận QR bỏ qua dấu xóa → thẻ đã xóa hồi sinh (CONFIRMED đọc).
- PLAUSIBLE chưa kiểm từng dòng: D1 không kéo định kỳ, push thay cả gói (`sync.js:440-455`; lành khi máy kia tải lại, mất thật chỉ khi máy kia mất dữ liệu); `core.js` `Store.get` nuốt lỗi trả `{}` rồi ghi đè, `idb()` giữ promise lỗi; nhánh dọn quota không try; `extension/content.js:39-53` đọc-ghi map thẻ không khóa + `manifest.json` thiếu `unlimitedStorage`; `app.js:1361` nhập JSON đè thẻ mới hơn; `handoff.js` SELECT rồi DELETE không nguyên tử; Drive PATCH không If-Match; LWW theo `Date.now()` máy.
- Lõi học (P2/P3): `engine.js:6` `norm` bỏ ký tự ngoài `[a-z0-9' -]` ('café' nhập 'cafe' sai) – CONFIRMED; từ mới đúng hết không vào lịch ôn; `lesson/ui.js` thoát giữa bài mất hết (có thể chủ ý); bài học không tăng `newToday`. `core.js` SRS S không chặn nhưng interval đã kẹp `MAX_IVL` nên vô hại.

## Chủ vùng: điều phối – âm thanh (chưa có chủ riêng)

### P1
- **A1. Gốc CDN thứ 3 chết + `cdnFail` đầu độc cả phiên** – CONFIRMED. `web/js/ui.js:195-200`, `:242`, `:343`; `web/js/audio.js:101`. Gốc 3 `https://lexkiteapp.github.io/audio/l/` trả 404 (đúng phải có tên kho, vd `/lexkite-media-2/audio/l/`; xuất hiện sau commit d5b3820). curl HEAD: `audio.lexkite.com/audio/l/1001tz8.mp3`=200, `lexkiteapp.github.io/lexkite-media-2/audio/l/1001tz8.mp3`=200, `lexkiteapp.github.io/audio/l/1001tz8.mp3`=404 (và `audio/w` cũng 404). Mỗi file thiếu ở cả 3 gốc cộng `cdnFail` +3, không bao giờ giảm; chỉ 2 file thiếu là `baseAt()=2` ⇒ cả phiên chỉ còn gốc chết, rơi giọng máy (mất Kokoro tới khi tải lại).
- **A2. `audio/w/index.txt` (cờ theo từ) lệch file theo giọng** – CONFIRMED. `ui.js:335,343`, `scripts/word-audio/merge.mjs`. 375 từ chỉ có giọng Mỹ, 116 chỉ có giọng Anh nhưng đều nằm trong index. curl: `she|bf_emma`=404, `seem|af_heart`=404, trong khi `she|af_heart`/`seem|bf_emma`=200. Mặc định en-GB (bf_emma) nên "he", "she"… 404 và cộng `cdnFail` (liên hệ A1).
- **A3. Mic sáng mãi khi rời trang lúc hộp xin quyền đang mở** – CONFIRMED (đọc). `web/js/confidence.js:273-279` cleanup chạy khi `sess=null`, sau đó `await speechSession` gán và chạy tiếp (`speech-session.js:10-21`), không ai gọi `cancel`. Bấm "Bắt đầu nói" 2 lần khi chờ quyền tạo 2 session. Chưa kiểm speaking/mock có cùng mẫu.

### P2
- `audio.js:101-106` `stop()` không hủy timer 7 s; chỉ xảy ra khi mạng chậm + bấm nhanh (PLAUSIBLE).
- `ui.js:33-41` `similarity`: "2024" vs "twenty twenty four" = 0%; target rỗng-sau-lọc + người học im lặng = 100% (CONFIRMED đọc).
- `ui.js:179-188` + `listen/kvoice.js` tách câu giữa "3.5", "10:30", "Dr." (CONFIRMED regex).
- Carlos es/pt/fr: `kokoro('em_alex'|'pm_alex')` = null (CONFIRMED bằng node) ⇒ rơi `ef_dora` giọng nữ; vi phạm luật "Ama nữ, Carlos nam" ở các ngôn ngữ cờ beta.
- `ui.js:430,469` `srDown` vĩnh viễn sau 1 lỗi `network` (CONFIRMED đọc).
- PLAUSIBLE chưa kiểm: `recognizeWhisper` rò stream/AudioContext và báo `not-allowed` cho mọi lỗi (`ui.js:404-418`); `toefl.js:102-107`, `toeic.js:245` `record()` không khóa vào lại.
- Chưa xác nhận (cần thiết bị): iOS unlock gắn `pointerdown` (`audio.js:74`) – cần iPhone thật; SW trả 200 cho request Range (`sw.js:78-84`) có thể hỏng cache media Safari; `speech-session.js:17` lỗi fatal không release stream.
- Đã đối chiếu, không lỗi: 58 474 khóa `LISTEN_AUDIO` đều có trong index, `fnv36` khớp giữa web/script, 40/40 câu mẫu 200.

## Chủ vùng: content-95 (native gen, L10nKey) + điều phối (LessonEngine native)

### P1
- **N1. `L10nKey.kt` có thể chạm giới hạn 64 KB của một method** – PLAUSIBLE (cần `javap -c` trên bản build thật). `native/android/design/src/main/kotlin/com/lexkite/app/i18n/generated/L10nKey.kt` (3438 hằng enum, sinh bởi `scripts/native/gen.mjs:164-169` thành 1 enum duy nhất, không tách chunk, không có test/guard cỡ method). Ước lượng ~19 byte/hằng ≈ 65,3 KB; Kotlin 2.2.20 đưa `$values()` ra riêng nên còn dư khoảng 15 key – thêm ~15–20 key là "Method too large". Khớp sự cố L10nKey vượt 64 KB hôm nay. Nên: gen.mjs tách enum/dùng map + test cỡ.
- **N2. iOS ghi kết quả bài học thiếu `quizzes`/`perfect`/`spoken`/`total.*`** – CONFIRMED. `native/ios/LexkiteKit/Sources/LKFeatures/Lesson/LessonStore.swift:65-70` chỉ cộng xp; Android `LessonWriter.kt:50-58` có; web `lesson/ui.js:646`. Sau sync, nhiệm vụ/huy hiệu "quiz", "perfect" lệch giữa nền tảng.

### P2
- Native chưa có `Game._track` (XP thưởng nhiệm vụ, level, huy hiệu): hoãn có chủ ý (chú thích `LessonWriter.kt:49`), không phải lỗi bất ngờ nhưng XP/level cùng tài khoản khác web.
- Native không fuzz ±5% khi ôn (web `core.js:159`); chú thích `SRS.swift:38`/`SRS.kt:38` nói "UI áp riêng" nhưng grep không thấy nơi nào áp. Vector chỉ phủ `noFuzz`.
- PLAUSIBLE chưa kiểm (không có Swift/Kotlin toolchain): streak iOS trừ 24h theo ms sai DST (`VocabBase.swift:150-156`); `storyItems` id lệch (`LessonEngine.swift:430`); match fallback chuỗi rỗng (`:429`); `perWord:0` ra bài rỗng (`:183`); `toks` tách NEL/BOM khác web (`:49`); Kotlin `Regex("\\s")` chỉ ASCII (`LessonEngine.kt:172,197`); letterBank theo grapheme (`:174`); số theo locale ở `L10n.kt:19` vs Swift/web; SRS `last==0`.
- Khoảng trống vector: sinh với TZ=UTC (không DST), không có ca Unicode trắng/tổ hợp, không có vector `Game._track`/streak/lưu bài.
- Sạch: 3438 key × 15 ngôn ngữ đủ, không rỗng, placeholder/thẻ HTML khớp vi 100%.

## Chủ vùng: b-o-m-t-port-742 (bảo mật, CSP)
Không có P0/P1 sau kiểm lại.
- **P2 (hạ từ P1)** `functions/api/_human.js:75-84`: Origin không phải web + `AI_HUMAN_ENFORCE != '1'` ⇒ `humanGate` trả ok (legacy), tức `/api/contact`, `/api/report`, `/api/ai` bỏ Turnstile khi không gửi Origin. Là lớp chuyển tiếp có chủ ý (`docs/HUMAN.md:26-28`), vẫn có `_quota.js` + WAF; không kiểm được env thật. Nên đặt hạn chót tắt legacy.
- P2 `functions/api/community.js:97-100,76-78`: `leave` rồi `join` xóa strike/ban và khóa nhóm tuổi (PLAUSIBLE; tính năng đang tắt `COMMUNITY!=='1'`, `:183`). `account.js` cũng xóa `cm_profile`.
- P2 `functions/api/account.js:24-39` xóa tài khoản bỏ sót `duel_run` (CONFIRMED đọc; yêu cầu "xóa dữ liệu liên quan" của store).
- P2 `web/_headers:10` CSP chỉ Report-Only, `unsafe-inline` + `cdn.jsdelivr.net` (CONFIRMED).
- P2 chưa kiểm: `report.js:316-325` khách gửi thư tới email tùy ý; `hit.js` `t=v`/`t=e` id/msg tự do làm phình D1; `workers/mail/wrangler.toml:10` + `index.js` lộ Gmail chủ (đã ghi ở `docs/HUMAN.md:40`); `push.js:156`, `mail.js:113,129` so sánh bí mật không hằng thời gian, `secretOf` dùng chung khóa, hủy đăng ký qua GET; `community.js:136-147` reason `minor`/`selfharm` tự ẩn; `duel.js:20-31` điểm do client báo.
- Đã soát và ổn: JWT Firebase, adminGate, OIDC GitHub ghim repo/workflow/nhánh, OAuth state HMAC+nonce, SSRF `readable.js`, IDOR (uid luôn từ token), không thấy SQL injection, không lộ bí mật thật trong repo.

## Chủ vùng: stitch-cover (UI Stitch) / beat-top-ux (màn Today, onboarding) – trợ năng, RTL, hiệu năng
Không có P0/P1 sau kiểm lại. Tương phản token đạt ≥ 4,5:1 cả sáng/tối (tính bằng node; `scripts/test/token-contrast.mjs` đã gác). Hộp thoại có trap focus, font-display swap, reduced-motion, vùng chạm ép `--tap`.
- **P2 (hạ từ P1)** `web/css/style.css:1449,1467` `outline:none` trên `:focus-visible` của `.sf-m` và `.lk-rep.in-side`, chỉ còn nền `accent-soft` (~1,15:1, chưa đo lại) – lỗi focus bàn phím (CONFIRMED đọc). Gợi ý `box-shadow: inset 0 0 0 2px var(--primary)` như `:1213`.
- P2 PLAUSIBLE chưa kiểm: công tắc tắt thiếu viền (`style.css:180`, ~1,28:1); `.gsearch` và `.switch::after` không lật RTL (`:87,95,181,183,498,499`); margin/padding cứng trái/phải (`:411,450`, ~68 chỗ vs 17 `[dir=rtl]`, ước lượng); ảnh động thiếu width/height (`app.js:141,1335`, `hubs.js:200`).
- Chưa soát: các `st-v2-*.css` (40–60 KB mỗi file), khung 390 px bằng dựng thật, parse JSON lớn (`grammar-pack.json` 1,3 MB), `i18n.js` đồng bộ.

## Ghi chú độ chính xác
- 2 mục chỉ đúng một phần: "Drive fileId 404 tạo tệp mới" là hành vi có chủ ý (`sync-drive.js:140-145`); "native thiếu Game._track" là hoãn có chủ ý.
- Mức đã chỉnh sau kiểm lại: nâng S1 lên P0; hạ P2: humanGate, community leave/join, outline focus, native thiếu quest/fuzz, các lỗi streak/freeze, `stop()` timer, D1 không kéo định kỳ.
- Phần P2 ở Swift/Kotlin, RTL, mail worker, `report.js`, `hit.js`, Whisper, `toefl/toeic record()` chưa kiểm được: coi là gợi ý, không phải lỗi đã xác nhận.
