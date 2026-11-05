# Nói với AI lên đầu: Call · Roleplay · chấm nói/viết hạng nhất (spec-lite, 05/11/2026)

> TL;DR: Đưa "Nói với AI" thành lối vào **1 chạm** từ Hôm nay, Kỹ năng và thanh bên; mỗi lượt nói có **phản hồi ngay** (câu đã sửa · vì sao 1 dòng bằng tiếng người học · câu tự nhiên hơn · phát âm theo từ/âm vị + nghe mẫu ↔ giọng mình); tổng kết buổi nối vào đo tiến bộ hằng tháng. 100 % miễn phí, một giọng Kokoro (Ama nữ, Carlos nam). Không thay vòng Play & Speak ([play-and-speak.md](play-and-speak.md)) mà là lớp IA + phản hồi cho nó.
> Đọc khi: sửa lối vào Call/Roleplay, chấm nói, sửa câu, phản hồi sau lượt nói. Nguồn khác: [CALL.md](../CALL.md), [AI-LOCAL.md](../AI-LOCAL.md), [kokoro-on-device.md](kokoro-on-device.md), [pron-phoneme-plan.md](../research/pron-phoneme-plan.md).

## 1. Hiện trạng (main 8707ebf)
| Tính năng | Chạm từ Hôm nay (người cũ) | Chấm thế nào | Engine · chi phí |
|---|---|---|---|
| Call Ama/Carlos `call.js`, `call/engine.js` | 3 (tab Kỹ năng → ô "Gọi giáo viên" → chọn cuộc). Chỉ người mới thấy `#/call` trên `today-new` | Đồ thị kịch bản; sửa câu = 11 luật regex; nhầm cặp âm qua chữ ASR; wpm/từ đệm | Không LLM. Kokoro dựng sẵn; STT Web Speech/Whisper tiny.en trên máy · $0 |
| Roleplay `roleplay.js` | 4 (Kỹ năng → Nói → Roleplay → kịch bản) | Chỉ cuối buổi: 4 tiêu chí + 3 câu viết lại | Nano (Chrome máy tính) → `/api/ai` kind `rp` (pool Gemini → Workers AI llama-3.1-8b) → kịch bản cố định. Trần `chat` 20/60 lượt, khách 2 buổi/ngày |
| Nói/phát âm `speak/score.js`, `pron/*` | 2–3 | Căn LCS chữ ASR ↔ câu mẫu, ngưỡng `CAL` **chưa hiệu chỉnh**. GOP âm vị chỉ có R&D (`scripts/pron/gop.mjs`, `pron-eval`), `window.Gop` chưa có trên web | Web Speech/Whisper · $0 |
| Chấm viết/IELTS `ai.js` | 3+ (trong bài Task/Speaking) | Prompt giám khảo IELTS, lỗi + viết lại band 8 | Gemini/Workers AI; prompt bắt viết **tiếng Việt** rồi dịch máy (`toLocalized`) cho 14 ngôn ngữ còn lại |
| Câu tự đặt `grammar/check.js` | trong bài ngữ pháp | Regex "có dùng cấu trúc", không chấm cả câu | trên máy |
| Giọng | — | — | Call: Kokoro sẵn theo `Chars.voice`. Câu động (Roleplay/AI): `KLocal` (tắt trên iOS, máy yếu) → giọng máy ⇒ **lệch giọng** |

## 2. Khoảng cách so với Speak / ELSA / Duolingo Max / Praktika
1. **Khó thấy:** 3–4 chạm, không có thẻ trên Hôm nay của người đã học. Speak/Praktika mở app là vào nói.
2. **Trên máy trước, không giới hạn (chủ 05/11: "AI chạy trên máy người dùng hoặc gói miễn phí, tối ưu 100% free, chất lượng, KHÔNG lỗi, KHÔNG giới hạn"):** đường chính luôn chạy trên máy – sửa câu = bộ luật + model nhỏ trên máy (khi máy đủ), chấm phát âm trên máy (ASR/GOP trong Worker), giọng Kokoro (dựng sẵn → `KLocal`) – nên người học không bao giờ gặp trần lượt/ngày. Gói AI miễn phí trên mạng (`/api/ai`, Nano…) chỉ là phần NÂNG THÊM (câu tự nhiên hơn, hội thoại tự do): hết quota, 429/5xx, timeout hay offline → tự chuyển im lặng sang trên máy trong cùng lượt, cùng thẻ phản hồi, cùng chất lượng hiển thị; KHÔNG chữ "hết lượt", không màn lỗi, không đếm lượt hiện ra. Máy yếu theo cấp của [AI-LOCAL.md](../AI-LOCAL.md) (A LLM trên máy · B Nano · C luật + file dựng sẵn) vẫn đủ trải nghiệm: mọi lượt có sửa câu theo luật, giọng mẫu, chấm phát âm ước lượng.
**Phản hồi mỗi lượt mỏng:** Call chỉ bắt 11 mẫu lỗi; không có "câu tự nhiên hơn"; Roleplay chỉ chấm cuối buổi. Speak/Praktika sửa ngay sau mỗi câu.
3. **Phát âm theo chữ, không theo âm:** ASR tự "sửa" giọng ⇒ báo đúng giả; không có trọng âm/âm vị tô màu, không so bản ghi của mình với giọng mẫu (ELSA có).
4. **Nói tự do bị trần & phụ thuộc máy chủ:** LLM trên máy chỉ có Nano (Chrome máy tính); tầng A (LLM 1–1,5B + Whisper/Moonshine) chưa có; `/api/ai` không stream, timeout 60 s.
5. **Ngôn ngữ phản hồi:** viết tiếng Việt rồi dịch ⇒ chậm thêm 1 vòng, sai sắc thái cho 14 ngôn ngữ.
6. **Giọng không đồng nhất** trên iOS/máy yếu; người đóng vai Roleplay không phải Ama/Carlos.
7. **Tiến bộ:** điểm nói không nối vào mốc tháng 3–6 (mục tiêu nói/viết tự tin sau 3–6 tháng).

## 3. Thiết kế
**IA (≤ 1 chạm để bắt đầu nói):** thẻ hero "Nói với AI" trên Hôm nay (mọi người, không chỉ người mới): giáo viên Ama/Carlos native + nút lớn "Gọi ngay" (tiếp tục cuộc gợi ý theo trình độ/lỗi cũ) + chip "Nhập vai" (tình huống gợi ý hôm nay). Ô đầu tiên của tab Kỹ năng = "Nói với AI"; mục cố định ở thanh bên máy tính và add-on. Ref Stitch Lexkite Kit, ONE app frame §5d, sáng + tối.
**Stack miễn phí:** TTS = file Kokoro dựng sẵn → `KLocal` Kokoro trên máy (giọng theo `Chars.voice`: Ama `af_*`, Carlos `am_*`) → giọng máy chọn đúng giới tính (cuối). STT theo cấp máy: Web Speech on-device → Whisper/Moonshine trong Worker. LLM theo [AI-LOCAL.md](../AI-LOCAL.md): A LLM 1–1,5B q4 (WebGPU, tải theo opt-in từ MỘT host) · B Nano · C `/api/ai` có cầu dao → kịch bản. Không API trả tiền theo lượt. Offline: kịch bản + luật + GOP vẫn chạy.
**Phản hồi mỗi lượt (thẻ gập dưới bong bóng, không chặn hội thoại):** ① câu đã sửa (gạch/tô diff) ② vì sao — 1 dòng, viết THẲNG bằng ngôn ngữ giao diện (prompt theo locale, luật có khóa i18n) ③ cách nói tự nhiên hơn ④ phát âm: từ tô màu + âm vị yếu (GOP khi có, nhãn "ước lượng" khi chỉ có ASR) + nút nghe mẫu ↔ nghe mình (MediaRecorder, chỉ trên máy). Sửa câu: LLM đề xuất, **đối chiếu** luật/ngân hàng ngữ pháp đã duyệt; chỉ hiện khi khớp hoặc độ tin ≥ ngưỡng.
**Quyền micro (chủ 05/11):** chỉ xin khi người học bấm nút nói LẦN ĐẦU; trước đó 1 màn giải thích ngắn, đẹp, bỏ qua được (micro để nghe và chấm phát âm; âm thanh xử lý trên máy, không lưu máy chủ). Từ chối → không hỏi lại liên tục: chỉ cách bật lại trong Cài đặt (đúng nền tảng) + cho làm tiếp bằng gõ/chọn, không chặn luồng, không popup ép. Hiện có: chuỗi iOS `NSMicrophoneUsageDescription`/`NSSpeechRecognitionUsageDescription` (chỉ tiếng Anh, chưa có `*.lproj`), Android `RECORD_AUDIO`, add-on không thêm quyền (`permissions.lock`), `privacy.html` 15 ngôn ngữ ghi "không ghi âm" → phải sửa khi có T4 (bản ghi chỉ trên máy, xoá khi đóng buổi) và ghi rõ: xử lý ở đâu (trên máy / dịch vụ nhận dạng của trình duyệt khi người học chọn / `/api/ai` chỉ nhận CHỮ), lưu không, bao lâu, xoá thế nào; nhãn App Store Privacy + Play Data safety khớp.
**Tổng kết buổi:** 3 lỗi chính → thẻ ôn FSRS, câu nói lại, wpm/ngừng, âm yếu → hồ sơ học (IndexedDB, người học xem/xóa) → biểu đồ tháng "nói/viết" theo CEFR Can-do.

**Tiêu chí xong (chủ 05/11: "100% free, chất lượng, mượt, chuyên nghiệp, chuyên sâu mà dễ hiểu dễ nhớ, đồng bộ – không được lỗi hay kém"):**
- Sửa câu (Call · luyện viết · Fixer · `grammar/check.js` · add-on · native) dùng MỘT bộ luật + MỘT thẻ hiển thị: mỗi lỗi có câu đúng, tên cấu trúc, giải thích 1–2 dòng bằng tiếng mẹ đẻ (15 ngôn ngữ), ví dụ đúng/sai, link bài ngữ pháp tương ứng, lỗi vào ôn FSRS.
- Phát âm: chấm theo âm/từ, chỉ âm sai + nghe mẫu Kokoro + thử lại; giọng do phiên kokoro-everywhere sở hữu (không sửa file của nó).
- $0: trên máy/tầng miễn phí theo [AI-LOCAL.md](../AI-LOCAL.md), hết quota → tầng dưới, không bao giờ hiện lỗi trắng. Mượt: phản hồi đầu ≤ 1 s, hoạt ảnh nhẹ, không lag.

## 4. Cổng (CI, chặn gộp)
- Độ trễ: hết lời → thẻ phản hồi luật ≤ 300 ms; LLM câu đầu ≤ 2,5 s p75 (stream); TTS chữ đầu ≤ 800 ms tầng A; ra lời mẫu Kokoro dựng sẵn ≤ 150 ms.
- Chấm đúng trên **tập có nhãn** trong repo: sửa câu: `scripts/feedback/gec-set.jsonl` (420 câu kiểu ASR, 14 L1 × 30, ⅓ câu đúng gồm câu bẫy; soạn theo lỗi chuyển di đã ghi nhận, không chép corpus) – `scripts/feedback/eval.mjs` trong npm test: precision ≥ 0,95 (không báo nhầm câu đúng) và editP (từng chỗ sửa đúng) ≥ 0,95, engine viết lại cả câu thêm fixP ≥ 0,95; tập mở rộng dần sang cấu trúc câu (thì, mệnh đề, điều kiện, bị động, trật tự từ…), recall tăng theo từng PR, recall/fixR/editP không lùi so với `baseline.json`. Mốc 05/11 luật Call: báo nhầm 0/140, precision 1, recall 0,20, editP 1, fixP 0,875 (trước khi sửa 3 lỗi gốc: fixP 0,717, recall 0,19); v2 thêm câu thật ẩn danh có opt-in; phát âm PCC âm vị speechocean762 ≥ 0,50 (cổng `pron-eval`), báo sai âm ≤ 10 %.
- Không giật trên máy tầm trung (Moto G/ Android 4 GB, iPhone 11): INP ≤ 200 ms, model chỉ trong Worker, shell ≤ ngân sách.
- Giáo viên (chủ 05/11: "khớp môi, tay chân, cử chỉ, miệng biểu cảm chuẩn như các ông lớn"): mọi lời Ama/Carlos – cả câu AI sinh động – khớp môi ±33 ms (cùng cổng [teacher-rive-rig.md](teacher-rive-rig.md)); cử chỉ/biểu cảm theo trạng thái lượt (nói · nghe · nghĩ · khen · sửa nhẹ), nhấn tay rơi vào từ nhấn; không giật, không đứng hình, không vệt viền; CI chụp + đo từng trạng thái.
- Không giới hạn, không lỗi (chủ 05/11): test giả lập `/api/ai` trả 429 (hết quota), 5xx, timeout, offline và máy cấp C → mỗi lượt vẫn ra thẻ phản hồi trên máy ≤ 300 ms, không lượt nào trống, DOM luồng Nói với AI không có chuỗi hết lượt/lỗi; chạy trong npm test.
- Tương phản sáng/tối, 15 ngôn ngữ (i18n-qa), giọng đúng giới tính (characters-gate), nút Thoát, không popup ép.

## 5. Việc theo PR (mỗi việc 1 nhánh, 1 PR)
| # | Việc | Phụ thuộc / tránh đụng |
|---|---|---|
| T1 | Thẻ hero "Nói với AI" Hôm nay + ô đầu Kỹ năng + thanh bên (ref Stitch → port, 15 ngôn ngữ) | chờ #593 (Hôm nay) và #595 (hub Kỹ năng) gộp |
| T2 | `Feedback.turn()` dùng chung: diff câu + vì sao + câu tự nhiên, luật mở rộng + khóa i18n; gắn vào Call | sau #687 (calls-lot2) |
| T3 | Prompt AI theo locale (bỏ dịch sau), stream `/api/ai`, phản hồi mỗi lượt Roleplay | sau #742 (bảo mật AI), #666 |
| T4 | Ghi âm trên máy + nghe mẫu ↔ mình ở Call/Roleplay/Speak | — |
| T5 | Tập nhãn sửa câu + `feedback-eval` (npm test) đo precision/recall/fixP, mốc không lùi | xong cùng PR spec |
| T6 | GOP lên web (`window.Gop` trong Worker) sau khi `pron-eval` đạt PCC ≥ 0,50 | R&D pron |
| T7 | Giọng động theo `Chars.voice` + giới tính đúng khi rơi về giọng máy; Roleplay do Ama/Carlos dẫn | — |
| T8 | Tổng kết buổi → hồ sơ học → biểu đồ tháng nói/viết | spec outcomes 3–6m |
| T9 | Tầng A LLM trên máy (opt-in, một host) | đo trên CI trước |
| T10 | Khớp môi + cử chỉ cho câu AI sinh động: mốc viseme lấy từ âm vị Kokoro trên máy (không đoán theo chữ), biểu cảm theo trạng thái lượt, cổng ±33 ms | dùng rig/cue của chủ sở hữu teacher-rive-rig, không sửa file rig |
| T11 | Màn giải thích trước khi xin micro + xử lý bị từ chối (Cài đặt + gõ/chọn) ở mọi chỗ nói; chuỗi quyền iOS/Android 15 ngôn ngữ; cập nhật privacy 15 ngôn ngữ + nhãn store | làm trước/cùng T4; ref Stitch |
| T12 | Lớp chọn tầng `Feedback.engine()` (trên máy trước, mạng chỉ nâng thêm) + test giả lập hết quota/offline/máy yếu theo cổng §4 | cùng/ngay sau T2; không sửa `functions/api/ai.js` (#742) |
