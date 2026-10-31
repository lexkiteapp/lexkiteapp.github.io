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

## M3 – nói tự do có rào
Khung kịch bản theo kỳ thi giữ nguyên; AI chỉ sinh **câu hỏi nối tiếp** ≤ 20 từ. Thứ tự: Gemini Nano (Prompt API) → đệm → `/api/ai` (cầu dao hạn mức sẵn có) → câu kịch bản. Đọc dần, nói từng câu: `speechSynthesis` + miệng live; kokoro-js tuỳ chọn.

## Xong khi
Mỗi mốc: test node + e2e xanh, số đo + GIF gửi anh duyệt trước khi gộp, mặc định tắt sau cờ `lk.call_rt` (localStorage `1` hoặc config `call_rt`). Không sửa `call/{face,lipsync,mouths}.js`, `lesson/teacher.js` tới khi #293 gộp.
