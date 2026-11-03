# Kokoro trên máy cho chữ chưa có file dựng sẵn

> TL;DR: Một giọng Kokoro mọi nơi. Chữ đã có file thì phát mp3 dựng sẵn như cũ. Chữ chưa có file (từ tự gõ, đoạn dịch, câu AI, ví dụ nguồn ngoài) do kokoro-js đọc ngay trên máy, trong Web Worker. Máy yếu, mạng tính phí, hay iOS thì giữ giọng máy. Không có máy chủ suy luận, 0 đồng.
> Đọc khi: sửa `web/js/klocal*.js`, đổi giọng/mô hình, bật/tắt từ xa, xem số đo `kl`.

## Quyết định của chủ (03/11)
CI chỉ dựng sẵn phần **cố định** đi kèm mã nguồn của app web: corpus `scripts/sentence-audio/corpus.mjs` gồm bài nghe, câu ví dụ có sẵn, bài học, ngân hàng ý tưởng, từ trong kho… Corpus đổi theo commit, không đổi theo người dùng. Mọi chữ động (từ tự gõ ngoài kho, đoạn bôi đen, AI/Call, ví dụ lấy từ nguồn ngoài) do kokoro-js đọc trên máy. Máy không đủ sức thì dùng giọng máy.
**Không** ghi nhận chữ người dùng thiếu file, **không** có hàng đợi làm bù, **không** endpoint hay bảng D1 cho việc này.
Lý do:
- Chi phí CI không tăng theo số người dùng.
- Không có văn bản riêng tư nào lên máy chủ.
- CI dừng hay lỡ một đêm thì người dùng không bị ảnh hưởng.

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
- Lý do tải: (a) app đã ổn định: `requestIdleCallback` 20 s sau khi mở, từ **phiên thứ 2**; hoặc (b) người dùng gặp chỗ đọc động hay mở Listening lần đầu.
- Mạng: không `saveData`, không 2g/3g, không `connection.type = cellular`. Tab ẩn thì không tải. Đã có trong Cache Storage thì nạp ở mọi mạng.
- Bật từ xa (`/api/config`): `kl` `'0'` tắt khẩn / `'1'` bật hết; `kl_pct` = canary (nhóm `lk.kb` 0–99, cố định theo máy). Không có cấu hình thì tắt.

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

## Chưa làm (việc sau, có thứ tự)
1. Nút Cài đặt "Giọng chất lượng cao trên máy" (Tự động/Tắt + dung lượng + xóa), i18n 15 ngôn ngữ.
2. Playwright Chromium + WebKit với Worker giả (cấp máy, long task < 50 ms, lùi khi lỗi, công tắc tắt).
3. WebGPU fp16 cho máy mạnh khi có số đo; LUFS chuẩn −16 khớp video.
