# Kokoro trên máy cho chữ chưa có file dựng sẵn

> TL;DR: Một giọng Kokoro mọi nơi. Chữ đã có file thì phát mp3 dựng sẵn như cũ. Chữ chưa có file (từ tự gõ, đoạn dịch, câu AI, ví dụ nguồn ngoài) do kokoro-js đọc ngay trên máy, trong Web Worker – **bật mặc định từ 5/11** (trước đó không có cấu hình = tắt → 100 % chữ động ra giọng máy). Máy yếu, mạng tính phí, iOS, add-on thì giữ giọng máy. Không có máy chủ suy luận, 0 đồng.
> Đọc khi: sửa `web/js/klocal*.js`, đổi giọng/mô hình, bật/tắt từ xa, xem số đo `kl`.

## Quyết định của chủ (03/11)
CI chỉ dựng sẵn phần **cố định** đi kèm mã nguồn của app web: corpus `scripts/sentence-audio/corpus.mjs` gồm bài nghe, câu ví dụ có sẵn, bài học, ngân hàng ý tưởng, từ trong kho… Corpus đổi theo commit, không đổi theo người dùng. Mọi chữ động (từ tự gõ ngoài kho, đoạn bôi đen, AI/Call, ví dụ lấy từ nguồn ngoài) do kokoro-js đọc trên máy. Máy không đủ sức thì dùng giọng máy.
**Không** ghi nhận chữ người dùng thiếu file, **không** có hàng đợi làm bù, **không** endpoint hay bảng D1 cho việc này.
Lý do:
- Chi phí CI không tăng theo số người dùng.
- Không có văn bản riêng tư nào lên máy chủ.
- CI dừng hay lỡ một đêm thì người dùng không bị ảnh hưởng.

## Chuỗi phát (nguồn sự thật – chú thích trong `web/js/ui.js`/`audio.js` trỏ về đây)
- `UI.speak(từ)`: từ trong kho → file `audio/w/<fnv(giọng|từ|s3)>.mp3` (giọng `Target.wordVoice(accent)`: en-US `af_heart`, còn lại `bf_emma`). 🐢 = **cùng file** phát 0,7× giữ cao độ (`preservesPitch`). Lỗi/404 → `UI.tts`.
- Bản ghi ngoài (Wiktionary/dictionaryapi) bị bỏ khi máy có giọng đọc – chỉ file của Lexkite (một giọng).
- `UI.tts(text, accent, rate, opts)`: opts `{ onSentence, onEnd, voice (mã Kokoro) | who ('ama'|'carlos') }`; giọng mặc định theo accent (`Target.kokoroVoice`). Thứ tự CỐ ĐỊNH (test `klocal.mjs`): file `audio/l/<KVoice.lineKey>` (cả đoạn hoặc từng câu, nghỉ `SENT_GAP` 280 ms) → Kokoro trên máy → giọng HĐH (app Capacitor) → `speechSynthesis`. 🐢 câu = cùng file ở tốc độ thấp.
- Gốc CDN: `audio.lexkite.com` (Worker `workers/audio`, cache 1 năm) → Pages kho media m2 → `lexkiteapp.github.io/audio`; mỗi lần phát thử gốc hiện hành rồi các gốc sau (lỗi/404/quá 7 s → gốc kế), 2 lỗi liên tiếp → chuyển gốc cả phiên. Đăng ký `infra/resources.json`, `docs/STORAGE.md`.
- Native SwiftUI/Compose (khi thay Capacitor): dùng CÙNG `KVoice.lineKey` + `LISTEN_AUDIO` + `audio/w` + chuỗi trên; chỉ gọi TTS hệ điều hành khi không có file và không chạy được Kokoro. Điều kiện tải mô hình giữ nguyên `netWhy`: iOS `NWPathMonitor` (`isExpensive`/`isConstrained` = di động/tiết kiệm dữ liệu), Android `ConnectivityManager` (`NET_CAPABILITY_NOT_METERED`); chỗ trống qua `volumeAvailableCapacityForImportantUsage` / `StatFs`; cùng 4 điều khiển trong Cài đặt › Âm thanh. App Capacitor hiện dùng `navigator.connection` của WebView (iOS không có → coi là di động).

## Luồng
1. `UI.tts(text)`: có đủ khóa trong `LISTEN_AUDIO` thì phát file như cũ.
2. Chưa có file và `KLocal.ready()` thì đọc từng câu: Worker sinh PCM → WAV blob → `LKAudio.play` (vẫn một trình phát, chặn chồng tiếng như cũ). Câu kế được sinh trong lúc câu trước đang phát. Giữa hai câu nghỉ `SENT_GAP`.
3. Chưa sẵn thì giọng máy/giọng hệ điều hành phát ngay, người dùng **không bao giờ phải chờ**. Đồng thời gọi `KLocal.want('dynamic')` để lần sau có Kokoro. Câu đang đọc không bị cắt giữa chừng.
4. Lỗi bất kỳ (tải, Worker chết, hết bộ nhớ, quá giờ 8 s/câu) thì phần còn lại đọc bằng giọng máy, ghi `LKAudio.note('kl', …)`. Không bao giờ im lặng.

## Cấp máy (`KLocalPolicy.tier`, thuần, có test)
- **wasm-q8** (`onnx/model_quantized.onnx`, 92 MB, bản nhẹ nhất): cần RAM ≥ 4 GB (`deviceMemory`; không đo được thì tính là đủ trên máy tính) và ≥ 4 nhân.
- **off**: iOS/iPadOS (WebKit giới hạn bộ nhớ tab; bật riêng bằng cờ `kl_ios`), RAM < 4 GB, < 4 nhân, đã đo chậm, hoặc người dùng tắt.
- WebGPU chưa dùng ở v1: q8 trên WebGPU lỗi tiếng, còn fp32 tải nặng 3,5 lần (326 MB). Xem lại khi có số đo `tts-ab.yml phase=free`.
- **Đo thử** ngay sau lần nạp đầu: sinh 1 câu 8 từ, RTF = thời gian sinh / thời lượng âm. RTF > 0,6 thì tắt và nhớ kết quả `lk.kl.probe` theo máy + phiên bản. Chạy lại sau 30 ngày.

## Khi nào tải (`KLocalPolicy.mayLoad`)
- Không có trong gói app (shell không đổi). `js/klocal.js` (~6 KB) nạp lười qua `App.need('klocal')`, Worker và mô hình nạp riêng.
- Lý do tải: (a) app đã ổn định: `requestIdleCallback` sau `idleDelay` (phiên đầu 60 s, sau 20 s); hoặc (b) người dùng gặp chỗ đọc động hay mở Listening lần đầu.
- Mạng & chỗ trống (`KLocalPolicy.netWhy`, chủ 5/11): chỉ Wi-Fi/mạng không tính cước; không `saveData`, không 2g/3g; `cellular`, `connection.metered` hoặc điện thoại không rõ loại mạng (iOS WebView) = di động → chỉ tải khi người dùng bật «Cho phép tải bằng dữ liệu di động» (`lk.kl.cell`). Cần ≥ 300 MB trống (`storage.estimate`). Tab ẩn thì không tải. Đã có trong Cache Storage thì nạp ở mọi mạng. Không hộp thoại/quyền HĐH nào: `storage.persist()` bỏ qua trên Firefox (Firefox hỏi quyền).
- Cài đặt › Âm thanh (`KLocal.settings`, vẽ trong `klocal.js`, settings.js chỉ chừa `#klBox`; add-on không có): bật/tắt (`lk.kl`), trạng thái (sẵn sàng / đang tải % / chờ Wi-Fi / thiếu chỗ / máy yếu), MB đã dùng (3 kho `transformers-cache`, `kokoro-voices`, `lk-kl-audio`), Xóa khỏi máy (xóa 3 kho + `lk.kl.ok/probe`, tắt), dữ liệu di động. Chính sách quyền riêng tư §4 (15 ngôn ngữ) mô tả đúng hành vi này.
- Bật từ xa (`/api/config`): `kl` `'0'` tắt khẩn / `'1'` bật hết; `kl_pct` (nếu đặt) = canary (nhóm `lk.kb` 0–99, cố định theo máy). **Không có cấu hình thì BẬT** (chủ 5/11); cấp máy + đo RTF vẫn chặn máy yếu.
- Nạp nền lúc rảnh ở MỌI phiên: phiên đầu chờ 60 s (màn chào mượt), sau đó 20 s (`idleDelay`). Không hỏi, không popup.

## Lưu trữ, hàng triệu người/ngày
- Mô hình + giọng ở **R2 `lexkite-audio-cdn`** (`audio.lexkite.com/kokoro/v1.0-1939ad2/…`, cache 1 năm immutable, trúng Cache Rule thì 0 lượt R2). `scripts/cdn/kokoro-model.mjs` (workflow `kokoro-model.yml`, chạy tay) chép từ Hugging Face, kiểm sha256 LFS rồi mới đẩy. Dự phòng: Hugging Face (đường gốc của kokoro-js).
- Thư viện: `kokoro-js@1.2.1` + onnxruntime wasm từ jsDelivr (đã khai trong infra).
- Worker chặn `fetch` để đổi `huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/` sang host của mình. Lỗi hoặc sai sha256 (ONNX) thì về Hugging Face.
- Cache Storage do transformers.js/kokoro-js tự lưu (`transformers-cache`, `kokoro-voices`) + `navigator.storage.persist()`.
- Âm đã sinh: Cache Storage `lk-kl-audio`, khóa = giọng + fnv(văn bản), LRU 300 mục.

## Mượt
- Worker module: hàng đợi tuần tự. `cancel` bỏ các câu còn chờ khi người dùng bấm câu khác.
- 10 phút không dùng thì `terminate` Worker để thả bộ nhớ (mô hình vẫn nằm trong cache). Lần sau nạp lại trong vài giây, trong lúc đó đọc bằng giọng máy.
- Giọng: đúng mã giọng của file dựng sẵn (`af_heart`/`bf_emma` theo accent, `Chars.voice` cho nhân vật).
- Âm lượng: đỉnh chuẩn hóa về −1 dBFS rồi nhân hệ số `KL_GAIN` khớp file dựng sẵn (đo bằng LUFS ở CI là việc sau).

## Số đo (không mù)
`LKAudio.stats`: `kl_ok`, `kl_fail`, `kl_wait` (rơi giọng máy vì chưa sẵn), `kl_ttfa` (ms ra tiếng câu đầu, trung bình trượt), `kl_tier`. Test: `scripts/test/klocal.mjs` (chính sách, WAV, LRU, rơi giọng máy).
- **Nguồn giọng thực phát** (5/11): `LKAudio.src('f'|'k'|'s', lý do)` lúc ra tiếng – f file dựng sẵn, k Kokoro trên máy, s giọng máy với lý do `off` (máy/nền tảng không chạy Kokoro: iOS, add-on, máy yếu, `kl=0`) · `wait` (đang nạp) · `load` (chưa có klocal.js) · `fail` (lỗi giữa chừng) · `lang` (ngôn ngữ đích khác tiếng Anh) · `pref` (người dùng tắt giọng HQ). Ẩn tab → beacon `/api/hit` `{t:'vo'}` (chỉ số đếm; bỏ CI/localhost/`lk.noTrack`/bot/bản dev) → `ext_events` `vo:*` → **Quản trị › Live: "Giọng đọc 7 ngày: x % giọng máy"**. Test `scripts/test/voice-source.mjs`.
- Độ phủ file dựng sẵn: `scripts/audio/coverage.mjs` (npm test `audio-coverage.mjs`, sàn chỉ lên) – đo cả từ mở rộng của Lex (5/11).

## Chưa làm (việc sau, có thứ tự)
0. Add-on: đóng gói kokoro-js + onnxruntime wasm VÀO add-on (CWS cấm mã tải từ xa → hiện `EXT_NO`), mô hình là dữ liệu tải từ R2. iOS: thử cờ `kl_ios` sau khi có số đo `vo:s_off` theo nền tảng.
1. Nút Cài đặt "Giọng chất lượng cao trên máy" (Tự động/Tắt + dung lượng + xóa), i18n 15 ngôn ngữ.
2. Playwright Chromium + WebKit với Worker giả (cấp máy, long task < 50 ms, lùi khi lỗi, công tắc tắt).
3. WebGPU fp16 cho máy mạnh khi có số đo; LUFS chuẩn −16 khớp video.
