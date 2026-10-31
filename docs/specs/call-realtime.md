# Call thời gian thực (#/call, cờ `lk.call_rt`), $0

> TL;DR: Màn Call phải mượt như một cuộc gọi thật: biết người học vừa nói xong (Silero VAD trên máy), cho người học nói chen ngang, che độ trễ bằng câu đệm thu sẵn, sau mỗi lượt phản hồi theo kiểu người bản xứ, và cho nói tự do có rào. Mọi thứ chạy trên máy người học; máy chủ chỉ là đường dự phòng có hạn mức.
> Đọc khi: sửa `web/js/call/{endpoint,rt,fillers}.js`, `call.js` (móc RT), `scripts/test/call-rt*.mjs`, `call-rt.yml`. Nền: [CALL.md](../CALL.md), [call-lipsync.md](call-lipsync.md).

## Các app top làm thế nào (nguồn)
| App | Cách làm | Ta lấy gì |
|---|---|---|
| Duolingo Video Call (Lily) | LLM qua prompt 3 vai, "khung cuộc gọi" cố định, nhân vật Rive ([blog](https://blog.duolingo.com/ai-and-video-call), [Rive](https://rive.app/blog/duolingo-s-ai-powered-video-call-brings-lily-to-life)); CEO nhận độ trễ là ưu tiên Q1/2025 ([tóm tắt](https://fintool.com/app/research/analyst/analyst-from-wolfe-research)); người dùng than Lily cắt lời sớm ([reddit](https://reddit.sentinel-team.org/posts/1qny1do/snapshots/2026-01-27T01%3A30%3A17.601676Z)) | khung kịch bản + AI chỉ nối tiếp (M3); ngưỡng im **thích nghi** để không cắt lời người học ngập ngừng |
| Speak (Live Roleplays) | OpenAI Realtime API nói-ra-nói; tự nhận mô hình giọng kém hơn mô hình chữ ở sửa phát âm ([Speak](https://speak.com/blog/live-roleplays), [OpenAI](https://openai.com/index/introducing-the-realtime-api/)) | tách: phản hồi chữ có cấu trúc (M2) + phát âm do bộ chấm của ta |
| Praktika | ASR máy chủ, giảm ~1–1,5 s → ~300 ms ([Baseten](https://www.baseten.co/resources/customers/praktika/)) | ASR là khúc chậm nhất → dừng ASR ngay khi VAD báo xong, câu đệm che phần còn lại |
Cả 3 dùng GPU máy chủ trả phí → không hợp $0 ở 1 triệu người/ngày. Ta đi đường **trên máy + bộ đệm + kịch bản**.

## Thư viện (đã kiểm license)
[Silero VAD](https://github.com/snakers4/silero-vad) MIT · [@ricky0123/vad-web](https://github.com/ricky0123/vad) 0.0.31 ISC (chỉ dùng xác suất từng khung 32 ms) · [onnxruntime-web](https://github.com/microsoft/onnxruntime) 1.22.0 MIT · [kokoro-js](https://www.npmjs.com/package/kokoro-js) Apache-2.0 (M3, tải thêm tuỳ chọn) · Chrome [Prompt API](https://developer.chrome.com/docs/ai/prompt-api) (M3). Nạp lười từ jsdelivr (CSP đã cho), shell không đổi.

## M1 – độ mượt
- **Biết nói xong** `CallEP` (thuần, test node): xác suất Silero (thiếu mô hình / saveData → năng lượng RMS + nền ồn thích nghi) → nói từ ≥ 3 khung > 0,5; im khi < 0,35 kéo dài *hangover*: 550 ms; 350 ms nếu đã đủ `min` từ và câu trọn; 1000 ms nếu chữ tạm (interim) dừng ở "and/because/the/um…"; Part 2: 1200 ms. Xong → `rec.stop()` ngay (Web Speech trả kết quả cuối; Whisper dừng ghi thay vì chờ khung cố định 3–15 s).
- **Ngắt lời**: khi giáo viên nói và người học đã bật micro rảnh tay: VAD chặt hơn (> 0,8, 3 khung, AEC của trình duyệt) → `hush()` + mở nghe. Đích ≤ 200 ms từ lúc có tiếng tới lúc giáo viên im.
- **Che trễ**: 180 ms sau khi VAD báo xong mà chưa có câu đáp → câu đệm ("Mm-hm.", "Okay!", "Right…") Kokoro sinh sẵn theo đúng giọng giáo viên (`call/fillers.js` → corpus audio), miệng chạy vòng nói; câu đáp thật xếp ngay sau, không cắt câu đệm. Không lặp câu đệm liền nhau.
- **Riêng tư**: VAD chỉ đọc khung âm thanh trong RAM, không ghi, không gửi. Micro chỉ mở sau khi người học bấm 🎙️ lần đầu; cúp máy → tắt hết.
- **Cổng CI** `call-rt.yml` (Chromium, CPU 4×, micro giả = AudioContext phát wav espeak biết trước mốc kết thúc): trễ "nói xong → giáo viên có tiếng" p50/p95 (cờ bật vs tắt), ngắt lời ≤ 200 ms, fps ≥ 50, 0 lỗi JS; báo cáo `report.md` + GIF.

## M2 – phản hồi kiểu bản xứ (sau mỗi lượt)
JSON `{native, why{15 ngôn ngữ}, register: polite|neutral|casual, alts[2], tip{linking, stress}}`, kiểm schema, đệm theo băm câu nói (IndexedDB + kho sinh sẵn trên CI cho câu mẫu `o[]`). Dữ liệu chung với Say-native (`web/data/say.json`) khi khớp cụm.

## M3 – nói tự do có rào, theo sức máy
Kịch bản theo kỳ thi giữ khung. AI chỉ sinh **câu hỏi nối tiếp** ≤ 20 từ, trả JSON đã kiểm; sai thì dùng câu kịch bản. **Sửa lỗi và giải thích** không giao cho LLM nhỏ (mô hình 1–3B hay sửa sai), mà lấy từ luật `CallEngine.correct`, dữ liệu đã duyệt (M2, Say-native) và bộ đệm máy chủ. Đọc dần, nói từng câu.
| Bậc | Khi nào (`CallRT.tier()`) | LLM | Nhận dạng | Giọng |
|---|---|---|---|---|
| A | có WebGPU (adapter + `maxBufferSize`), `deviceMemory` ≥ 8, ≥ 4 lõi, không saveData, chạy thử đạt | Qwen2.5-1.5B-Instruct q4 ([Apache-2.0](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct)) qua [WebLLM](https://github.com/mlc-ai/web-llm) (Apache-2.0) · dự phòng SmolLM2-1.7B (Apache-2.0) | Moonshine tiny ([MIT](https://huggingface.co/UsefulSensors/moonshine-tiny)) / Whisper tiny.en | Kokoro-82M ONNX (Apache-2.0) WebGPU |
| B | Chrome có Gemini Nano (`LanguageModel.availability()`) | Prompt API (trên máy) | như hiện tại | Kokoro sinh sẵn / `speechSynthesis` + miệng live |
| C | điện thoại yếu, iOS cũ, add-on | kịch bản → đệm → `/api/ai` (cầu dao hạn mức) | như hiện tại | câu sinh sẵn / `speechSynthesis`; Piper WASM ([MIT](https://github.com/rhasspy/piper), không dùng bản piper1-gpl) chỉ khi đo thấy nhẹ |
Loại: Qwen2.5-3B (license "other", tức Qwen Research, cấm thương mại). Llama-3.2-1B và Gemma 3 1B có điều khoản riêng, bị khoá (gated), nên chỉ dùng nếu anh đồng ý điều khoản. Dò máy một lần rồi lưu kết quả. Hạ bậc tự động khi fps < 50, khi lời đầu tiên > 1,5 s, hoặc khi `navigator.getBattery` báo pin < 20 % và không sạc.
**Đo trước khi hứa** (CI, có throttle): dung lượng tải, RAM (`performance.measureUserAgentSpecificMemory`), token/s, thời gian tới lời đầu tiên, fps khi mô hình chạy nền. Runner CI không có GPU thật, nên bậc A trên CI chỉ đo được WASM/SwiftShader và ghi rõ như vậy. Pin không đo được trên CI, chỉ có thời gian CPU làm số thay thế.

## Lưu trữ: một nguồn, app không phình
- **Nguồn duy nhất cho mô hình**: Hugging Face Hub (repo `onnx-community` / `mlc-ai`, ghim commit). Lý do: miễn phí, không ăn băng thông hay hạn mức R2 của ta (ở 1 triệu người/ngày, R2 sẽ vượt mức đọc miễn phí), và nhánh Whisper đã dùng sẵn. Mã chạy (ort, vad-web, web-llm) lấy từ jsDelivr, ghim phiên bản. Không gì nằm trong gói app/add-on; shell ≤ 377 KB gz giữ nguyên.
- **Trên máy**: chỉ tải khi người học bật và đồng ý. Mặc định chờ Wi-Fi. Trước khi tải: gọi `navigator.storage.estimate()` để kiểm chỗ trống và `persist()`. Lưu vào Cache Storage/OPFS, tải từng khúc để nối tiếp được khi đứt mạng, kiểm sha256. Tải và chạy trong Web Worker, luồng chính không giật.
- **Màn "Dữ liệu AI trên máy"** (Cài đặt): hiện từng mô hình, dung lượng và bậc, có nút xoá. Tự xoá mô hình ít dùng khi `QuotaExceededError` hoặc khi chỗ trống < 2× kích thước mô hình.

## Hiểu người học hơn sau mỗi buổi (không fine-tune)
Không huấn luyện trọng số trên máy vì nặng, tốn pin và dễ làm hỏng chất lượng. Thay vào đó là **trí nhớ người học** `call/memory.js`, vài KB trong IndexedDB:
- lưu: lỗi hay mắc (ngữ pháp, cặp âm từ `slips`), từ đã vững/chưa vững, trình độ, chủ đề thích, tốc độ nói (từ/phút), xu hướng sai theo thời gian;
- cập nhật sau mỗi lượt; đồng bộ qua tài khoản sẵn có nếu người học đăng nhập.

Trí nhớ được dùng ở hai chỗ:
- trong prompt: tóm tắt ≤ 300 token;
- trong bộ chọn cuộc gọi/câu hỏi kế: giáo viên nhắc lại lỗi cũ, ôn đúng chỗ yếu, chỉnh độ khó.

Người học xem và xoá được trí nhớ này. Test chứng minh hành vi đổi theo trí nhớ: cùng một kịch bản, trí nhớ khác thì câu hỏi hoặc lời nhắc khác.

## Xong khi
Mỗi mốc: test node + e2e xanh, số đo + GIF gửi anh duyệt trước khi gộp, mặc định tắt sau cờ `lk.call_rt` (localStorage `1` hoặc config `call_rt`). Không sửa `call/{face,lipsync,mouths}.js`, `lesson/teacher.js` tới khi #293 gộp.
