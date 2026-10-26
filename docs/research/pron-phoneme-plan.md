# Lexkite – Chấm phát âm từng âm vị (kiểu ELSA), 100 % miễn phí – kế hoạch R&D

> TL;DR: Chạy mô hình nhận dạng âm vị CTC (họ wav2vec2, ONNX lượng tử hoá q4, ~50–60 MB, tải 1 lần) ngay trên máy người học trong Web Worker; căn chỉnh cưỡng bức theo chuỗi âm vị Mỹ đã tính sẵn trên CI (CMUdict) → GOP theo từng âm → điểm 0–100 + 1–2 mẹo lấy từ `web/js/pron/sounds.js`/`skills.js`. Web Speech hiện tại vẫn là dự phòng. Viết 26/10/2026, chỉ nghiên cứu, chưa đổi code.
> Đọc khi: làm chấm phát âm theo âm vị (P0–P3), chọn mô hình/kiến trúc.
> Độ chắc: kiến trúc & cách chấm = cao (đã có trong văn liệu, chạy được trong trình duyệt). **Chưa chắc**: mô hình nào ≤ 60 MB đạt chất lượng, độ trễ trên Android tầm trung khi chỉ có WASM 1 luồng, iOS WebKit. P0 tồn tại để trả lời 3 câu này bằng số đo.

## 1. Hiện trạng (repo `lk4`, main 26/10)
- `UI.recognize()` (web/js/ui.js ~279–345): Web Speech `SpeechRecognition` (maxAlternatives 5) + `MediaRecorder` ghi song song để nghe lại; điểm = `similarity(heard, target)` theo **chữ**, không biết sai âm nào. Dự phòng: Whisper tiny.en q8 (~40 MB) qua transformers.js 3.7.5 từ jsdelivr, WASM, tải sau modal đồng ý (`vb.whisper`). Add-on: không hỗ trợ (`isExtension` → `unsupported`).
- `confidence.js` dùng lại `UI.recognize` + getUserMedia riêng (echoCancellation/noiseSuppression/AGC).
- Nội dung: `sounds.js` 44 âm IPA (id `iː`, `ɪ`, `æ`, `θ`…; có `mouth`, `how`, `vn`, `tip`, `words`, `pairs`, `sentences`), `skills.js` chuyên đề (vd `final-consonants`). Đã có bản dịch ở `web/i18n/content/*.json` → mẹo dùng lại được cho 15 ngôn ngữ, không phải viết mới.
- IPA Mỹ: CMUdict (BSD-2) qua `scripts/build-lexicon.mjs` (`content/lexicon/cmudict-subset.txt` 8k từ, `ipaus-manual.json` thắng). CSP đã cho `wasm-unsafe-eval`, `worker-src blob:`, connect tới huggingface.co/jsdelivr/audio.lexkite.com. COOP = `same-origin-allow-popups`, **không** cross-origin-isolated → WASM đa luồng (SharedArrayBuffer) KHÔNG có trên trang chính.

## 2. Kiến trúc đề xuất
**Luồng:** mic (AudioWorklet → PCM 16 kHz mono, bỏ giải mã webm/mp4 lắt léo trên iOS; vẫn giữ MediaRecorder để nghe lại) → VAD cắt lặng (năng lượng đơn giản) → Web Worker `pron-worker.js` (lazy, ngoài shell) chạy mô hình → logit CTC [T×~40] → `gop.js` (JS thuần, dùng chung cho Node CI và trình duyệt) → kết quả `{word, phones:[{p, score, heard, start, end}], tips}` → UI.

**Mô hình (ứng viên, P0 chọn bằng số đo):**
| # | Ứng viên | Tham số | q4 ước tính | Giấy phép | Ghi chú |
|---|---|---|---|---|---|
| A | wav2vec2-base (95 M) fine-tune CTC 39 âm ARPAbet trên LibriSpeech 960h (CC BY 4.0) + speechocean762 train (CC BY 4.0), nhãn từ CMUdict | 95 M | ~50–58 MB | Apache-2.0 (gốc facebook/wav2vec2-base) + dữ liệu thương mại được | **Đề xuất chính.** Cần GPU 1 lần (~6–10 h): Kaggle Notebook miễn phí (30 h GPU/tuần), CI gọi qua Kaggle API. GitHub Actions không có GPU miễn phí. |
| B | Checkpoint cộng đồng sẵn có (vd `mostafaashahin/wav2vec2-base-timit-phoneme-arpa-39-v2`, `robg/speako-phoneme-recognizer` = xls-r-300m TIMIT, 355 MB q8) | 95–300 M | 55–170 MB | Apache trên thẻ, **nhưng train trên TIMIT (LDC, không phải giấy phép mở)** | Chỉ dùng để đo so sánh trong P0, không ship. |
| C | `facebook/wav2vec2-xlsr-53-espeak-cv-ft` / `lv-60-espeak-cv-ft` | 300 M | ~170 MB | Apache-2.0 | Quá nặng cho máy; dùng làm **thầy** (gán nhãn giả/chưng cất) và trần chất lượng trên CI. |
| D | ZIPA-CR small (ACL 2025, Zipformer, đa ngôn ngữ IPA) | ~60 M? | ~35 MB? | **chưa xác minh** | Theo dõi; xuất ONNX Zipformer phức tạp hơn. Chỉ thử nếu giấy phép trọng số cho thương mại. |
- Nếu A quá chậm: A' = cắt còn 8/12 lớp transformer rồi fine-tune lại (≈ −30 % tính toán), hoặc chưng cất từ C.
- Bảng âm vị: 39 ARPAbet (không trọng âm) + blank; bảng ánh xạ ARPAbet → id `sounds.js` (AA→ɑː, ER→ɜːr/ər, OW→oʊ, flap T/D cho phép làm biến thể).

**Runtime:** transformers.js (đang dùng cho Whisper, cùng phiên bản ghim) `AutoModelForCTC` → lấy logit thô, không dùng pipeline giải mã. WebGPU nếu `navigator.gpu` + adapter OK (Chrome Android 121+, Safari 26), còn lại WASM SIMD 1 luồng. Tuỳ chọn tăng tốc: trang con `/pron-lab/` riêng có COOP `same-origin` + COEP `require-corp` (không YouTube/Ads/Firebase popup) → bật WASM 4 luồng; chỉ làm nếu P0 cho thấy 1 luồng > 3 s.

**Lưu trữ mô hình:** file băm nội dung `models/pron/<sha16>/model_q4.onnx` (+config/vocab ~2 KB). Gốc chính: repo HF của Lexkite (miễn phí, CDN, transformers.js đọc trực tiếp, đã nằm trong CSP) **và** bản sao `audio.lexkite.com/models/…` (Worker lexkite-audio, `Cache-Control: immutable, max-age=31536000`; gốc GitHub Pages file < 100 MB hoặc R2 khi có secret R2_* – 22/10 vẫn chưa có). App thử domain mình trước, lỗi → HF. Mỗi người dùng chỉ ~3 lượt tải → không áp lực 100k lượt/ngày. Lưu Cache Storage + `navigator.storage.persist()`. Đăng ký `infra/resources.json` (mục `pron-model`) trước khi ship (infra-check).

**Tải lười + đồng ý:** modal lần đầu: "Chấm từng âm (tải 1 lần ~55 MB, nên dùng Wi-Fi)"; cảnh báo thêm nếu `navigator.connection.saveData` hoặc `effectiveType` ≠ 4g / type = cellular; thanh tiến độ, huỷ được, tải tiếp khi mở lại. Không tải khi `deviceMemory < 3` hoặc thiếu WASM → giữ luồng Web Speech/Whisper hiện tại (điểm theo chữ, ghi rõ "chấm cơ bản").

## 3. Cách chấm
1. **Chuỗi âm vị mong đợi tính sẵn trên CI** (mọi câu/từ luyện là nội dung của app): CMUdict đầy đủ (BSD-2) + espeak-ng en-us cho từ ngoài từ điển; lưới biến thể: các biến thể CMU, dạng yếu hư từ (to/for/and → ə), flap /t,d/ giữa nguyên âm, rơi /t/ trong cụm (nhận cả 2), nối âm giữa từ. Xuất JSON nhỏ theo bài (`pron-exp/<bài>.json`, có cả ánh xạ âm vị ↔ chữ cái để tô màu đúng chữ). Từ người dùng tự nhập: tra shard CMUdict lười (~1 MB gz chia theo chữ cái), không có → chỉ chấm cơ bản.
2. **Căn chỉnh cưỡng bức CTC** (Viterbi trên chuỗi mong đợi + blank, O(T·N), < 5 ms) → khoảng thời gian từng âm.
3. **GOP trên CTC** (Evaluating Logit-Based GOP 2506.12067; Segmentation-free GOP 2507.16838; GOP + tri thức âm vị 2506.02080): đặc trưng mỗi âm = (a) LPP: trung bình log-posterior âm mong đợi trên đoạn; (b) GOP-AF: log P(chuỗi đúng) − max log P(chuỗi thay âm i bằng âm nhầm / xoá âm i) qua thuật toán forward CTC – chỉ thử tập nhầm lẫn nhỏ (theo L1, vd VN: iː↔ɪ, æ↔e, θ→t/s, ð→d/z, ʃ↔s, z→s, v→b/j, l↔n, mất âm cuối /t d k s z/); (c) thời lượng; (d) âm đối thủ mạnh nhất = "anh nói thành /s/".
4. **Hiệu chỉnh 0–100:** hồi quy logistic/isotonic nhỏ (tham số JSON < 5 KB) học trên speechocean762 train (nhãn âm 0–2) → 0–100; màu: ≥ 80 xanh, 50–79 vàng, < 50 đỏ. Từ = trung bình có trọng số nghiêng về âm kém nhất; câu = trung bình từ × độ đầy đủ (từ bị bỏ). Trọng âm/ngữ điệu = P3 (chưa hứa).
5. **Mẹo (1–2):** lấy 1–2 âm điểm thấp nhất < 60 → mục `sounds.js` cùng id: hiện `tip` + `mouth`; nếu nhầm thành âm có trong `pairs` → nút luyện cặp tối thiểu ngay; mất âm cuối → `skills.js#final-consonants`; văn bản đã dịch 15 ngôn ngữ lấy từ i18n content. Không bao giờ quá 2 mẹo/lần.

## 4. UX
Bấm mic → sóng âm trực tiếp → thả/tự dừng theo VAD → (< 1,5 s) từ hiện màu theo chữ cái (vd "**th**ink": "th" đỏ) + điểm tổng → chạm phần đỏ: "Bạn nói giống /s/, cần /θ/" + mẹo + nghe mẫu (giọng Mỹ audio.lexkite.com) ↔ nghe lại mình (chậm 0,75×) → "Thử lại". Âm < 50 lặp 3 lần → đề xuất bài âm đó trong mục Phát âm. Điểm lưu cục bộ theo âm để vẽ "bản đồ âm yếu" (không gửi âm thanh lên mạng – giữ cam kết riêng tư hiện có).

## 5. Các pha
**P0 – Spike đo được trên CI (không giao diện).** Workflow `pron-eval.yml`: tải ứng viên → xuất ONNX (optimum) → lượng tử q8/q4 (onnxruntime `MatMulNBits` block 32; conv giữ fp16/fp32 vì q-conv hay lỗi) → chạy `gop.js` qua onnxruntime-node trên: speechocean762 test (2.500 câu), 300 câu LibriSpeech test-clean (người bản ngữ), bộ lỗi tổng hợp (Kokoro TTS đọc chuỗi đã thay âm theo cặp nhầm VN, ~500 mẫu) → báo cáo JSON + bảng. Song song: thử train A trên Kaggle (CI đẩy kernel bằng API, secret KAGGLE_*). Đầu ra: chọn mô hình hoặc kết luận "chưa đạt" (dừng sau 2 lần trượt theo quy tắc).
**P1 – Cấp từ (ship sau cờ `pron_gop`).** Worker + tải lười + modal + tô màu chữ + mẹo; tính sẵn chuỗi âm cho toàn bộ từ trong `sounds.js`/`skills.js`/từ vựng; dự phòng Web Speech; i18n 15 ngôn ngữ (theo docs/I18N-PIPELINE.md); Playwright mic giả (`--use-file-for-fake-audio-capture` với wav mẫu) khẳng định điểm nằm trong dải mong đợi.
**P2 – Cấp câu.** Câu ≤ 15 từ, căn chỉnh liên từ (bỏ từ/chèn từ), điểm đầy đủ, chèn vào `confidence.js`, bài nghe–nói, roleplay; chunk 10 s cho câu dài.
**P3 (tuỳ chọn).** Trọng âm từ (năng lượng + F0 + thời lượng), ngữ điệu câu; ORT gốc trong Capacitor (nhanh hơn WKWebView); add-on (MV3 cấm mã từ xa → phải đóng gói runtime trong add-on, xin duyệt CWS).

## 6. Cổng chất lượng (đo trên CI, chặn ship)
| Chỉ số | P0 "đi tiếp" | P1 ship | Tham chiếu |
|---|---|---|---|
| PER (LibriSpeech test-clean, q4) | ≤ 12 % | ≤ 10 %, q4 kém fp32 ≤ 1,5 điểm | xls-r-300m TIMIT ~8 % |
| PCC cấp âm speechocean762 test | ≥ 0,50 | ≥ 0,58 | GOP Kaldi ~0,36–0,45; SOTA nghiên cứu ~0,68–0,70 |
| Báo nhầm trên giọng bản ngữ (âm đỏ) | ≤ 8 % | ≤ 4 % | quan trọng nhất cho niềm tin người dùng |
| Phát hiện lỗi tổng hợp (cặp nhầm VN) | ≥ 70 % | ≥ 85 %, gợi ý đúng âm thay ≥ 70 % | tự xây |
| Kích thước tải | ≤ 70 MB | ≤ 60 MB | Whisper tiny hiện ~40 MB |
| Trễ 1 từ (~1 s âm thanh) | đo | p50 ≤ 1,5 s WebGPU, ≤ 3 s WASM 1 luồng | ước: 95 M tham số ≈ 10–15 GFLOP/từ |
| RAM đỉnh worker | đo | ≤ 400 MB | giới hạn per-process iOS |
| Shell | +0 | ≤ +1,5 KB gz (chỉ nút + loader) | trần 377 KB |
Thiết bị thật (CI không có): 1 lần chủ app tự thử Android tầm trung + iPhone qua trang `/pron-lab/` in số đo – không dùng tài khoản thật.

## 7. Rủi ro (trung thực)
- **Độ trễ WASM 1 luồng trên Android yếu** (cao): có thể 3–6 s/từ. Giảm: WebGPU, cắt lớp (A'), trang cô lập đa luồng, chỉ chấm sau khi thả mic.
- **iOS Safari/WKWebView** (cao): giới hạn RAM theo tiến trình (WebKit 256703), lỗi WebGPU iOS 26.0–26.1 (302711, đã sửa), rò bộ nhớ WASM (304810). Giảm: q4 + 1 phiên trong worker riêng, giải phóng sau 2 phút rảnh, phát hiện crash → tự lùi về Web Speech và ghi cờ.
- **Giấy phép** (trung bình): mô hình train trên TIMIT/L2-ARCTIC (NC) → không ship. Chỉ dùng dữ liệu CC BY/CC0/BSD; ghi `docs/CREDITS.md` (speechocean762, LibriSpeech, CMUdict). ZIPA chưa rõ giấy phép trọng số. Điều khoản Kaggle cho đầu ra – cần đọc trước khi train.
- **Thiếu GPU miễn phí trên CI** (trung bình): train A phụ thuộc Kaggle/Colab; nếu không được → chỉ còn checkpoint sẵn có (có thể không đạt cổng).
- **Lệch giọng người học**: speechocean762 là người Trung Quốc, chưa có dữ liệu người Việt có nhãn → hiệu chỉnh có thể lệch; bổ sung bộ lỗi tổng hợp + sau này (opt-in rõ ràng) người dùng tự nguyện đóng góp nhãn.
- **Quyền micro**: đã có thông điệp lỗi `REC_ERR`; Capacitor cần quyền RECORD_AUDIO/NSMicrophoneUsageDescription (đã có cho Web Speech? cần kiểm).
- **Kỳ vọng "top 1 thế giới"**: ELSA dùng dữ liệu độc quyền rất lớn; mục tiêu thực tế P1 = ngang GOP nghiên cứu (PCC ~0,6), chưa bằng ELSA ở trọng âm/ngữ điệu.

## 8. Tự động hoá CI (GitHub Actions)
- `pron-eval.yml` (thủ công + khi đổi `web/js/pron/gop.js`/mô hình): xuất, lượng tử, đánh giá, cổng §6, đăng báo cáo `content/qa/pron-eval.json`.
- `pron-publish.yml`: đạt cổng → đẩy file băm lên HF repo + gốc audio.lexkite.com, cập nhật manifest `web/js/pron/model.json` (sha, kích thước).
- `pron-expected.yml`: tính chuỗi âm + biến thể + ánh xạ chữ cái cho mọi nội dung mới (CMUdict + espeak-ng tất định), test chặn từ thiếu.
- `npm test`: test đơn vị căn chỉnh/GOP trên logit mẫu cố định (vài KB), parity Node ↔ trình duyệt, kiểm shell size, infra-check.
- Playwright: mic giả với wav mẫu đúng/sai → điểm & mẹo đúng dải.

## 9. Ước tính token cho agent làm (≤ 2 agent cùng lúc, ≤ ~150k/agent, sonnet cho việc cơ khí)
| Pha | Việc | Token |
|---|---|---|
| P0 | Agent 1: workflow xuất/lượng tử/đánh giá + tải dữ liệu (sonnet) ~120k · Agent 2: `gop.js` căn chỉnh + GOP-AF + hiệu chỉnh (opus) ~130k · Kaggle train A (nếu cần) ~60k | **~250–310k** |
| P1 | Worker + tải lười/modal ~100k · UI tô màu + mẹo + nghe lại ~110k · pron-expected + i18n 15 ngôn ngữ + Playwright ~100k | **~300–350k** |
| P2 | Căn chỉnh câu + tích hợp confidence/roleplay + test | **~180–230k** |
| P3 | Trọng âm/ngữ điệu, Capacitor ORT gốc, add-on | ~200–300k (để sau) |
Tổng P0–P2 ≈ 0,75–0,9 M token. Không có chi phí tiền/credit; chỉ phút CI (eval ~40–60 phút/lượt CPU).
