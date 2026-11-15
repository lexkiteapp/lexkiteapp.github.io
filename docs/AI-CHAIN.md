# AI người dùng – chuỗi model theo chất lượng

> TL;DR: Mọi tính năng AI cho người học (/api/ai: chấm Writing/Speaking, Roleplay, Call, tutor, fixer, TOEIC/TOEFL…) đi qua MỘT chuỗi `functions/api/_aichain.js`: Gemini Flash (tên đọc từ danh sách thật) → Groq gpt-oss-120b → không còn model đạt chất lượng thì báo bận (máy khách tự chấm/kịch bản). Llama 8B không phục vụ người học. Cổng: bộ golden `ai-golden.yml`; giám sát tỉ lệ model + cảnh báo > 10 %/giờ.
> Đọc khi: sửa ai.js/_aichain.js, thêm/bớt model, thấy cảnh báo `ai:weak`, chủ hỏi "AI trên site ổn không".

## 1. Sự cố gốc (03/11)
Gọi thử live: cả 3 lượt trả `workers-ai/llama-3.1-8b` – roleplay barista hỏi "whole bean or ground coffee?", chấm IELTS chỉ bắt 1/5 lỗi và sửa sai chỗ.
Nguyên nhân gốc (D1 `api_keys`): kho khóa của **site** chỉ có 1 khóa Gemini, chết 403 từ 24/10 (sống lại/chết lặp lại tới 02/11), và **0 khóa Groq**; 85 khóa Gemini + 109 khóa Groq chủ nạp 30/10 chỉ nằm trong secret GitHub (`GEMINI_POOL`/`GROQ_POOL`) cho CI. Cảnh báo `nolive:gemini` có gửi thư nhưng chuỗi vẫn âm thầm rơi về Llama 8B nên không ai thấy chất lượng tụt (giám sát mù: chỉ đếm khóa, không đếm model phục vụ).

## 2. Chuỗi (`_aichain.js` `runChain`)
| Thứ tự | Tuyến | Model | Khóa | Ghi chú |
|---|---|---|---|---|
| 1 | `gemini` | Flash số lớn nhất từ `GET /v1beta/models` (`pickGemini`, đệm 6 h; vùng chặn → dò tên qua Worker `GEM`) | kho `_keys.js` provider gemini | mỗi lượt ≤ 12 s thoại / 30 s chấm, luôn chừa giờ cho Groq |
| 2 | `groq` | `GROQ_OK` (hiện `openai/gpt-oss-120b`), lọc theo danh sách thật | kho `_keys.js` provider groq | `reasoning_effort` low (thoại) / medium (chấm); 400 "Failed to generate JSON" (~10 % bài dài) → thử lại không ép JSON (`groqRetry`) |
| – | `wai` | Llama 3.1 8B (binding `env.AI`, tài khoản chính) | – | **tắt cho người học** (`WEAK_OK = false`); chỉ người gọi nội bộ Quản trị (`runModel`, `allowWeak`) – trả `tier: 'low'` |
- Kết quả phải đúng khuôn người gọi (`validOut`: chấm IELTS cần `overall` + `criteria`; thoại cần `reply`), sai khuôn → model kế.
- Mỗi tuyến thử ≤ 3 khóa; 401/403 → khóa chết, 429 → nghỉ tới giờ reset (`report` của `_keys.js`).
- Không model nào → `/api/ai` trả 429 `quota.busy`; máy khách: chấm theo quy tắc / Chrome AI / kịch bản soạn sẵn. Không trả câu sai.
- Cầu dao `_quota.js`: `gemini` 20/khóa/ngày, `groq` 1.000/khóa/ngày (khớp `infra/resources.json`), ngắt ở 80 %.
- Đệm `ai_cache`: tiền tố `v2|` (bỏ đệm cũ có câu Llama sai), chỉ lưu kết quả `tier: 'high'`.
- Gói Pages miễn phí: 50 subrequest + 50 truy vấn D1/lượt, 10 ms CPU → `candidates(env, p, 3)` chỉ giải mã khóa cần thử, `poolCount` đếm không giải mã, kiểm sức khỏe theo lô `HEALTH_BATCH` khóa.

## 3. Khóa (`ai-keys-sync.yml` → `/api/keysync`)
Workflow (chạy tay + thứ Hai hằng tuần, chỉ `main`) đọc `GEMINI_POOL`/`GROQ_POOL`, gửi qua JWT OIDC GitHub (aud `lexkite-keysync`, đúng file workflow @main) tới `functions/api/keysync.js` → mã hóa AES-GCM vào `api_keys` (nhãn `GEMINI_POOL #n`, `notes = 'ci-sync'`). Khóa trùng (dấu vân tay) giữ nguyên trạng thái; khóa bị gỡ khỏi secret → xóa. Không bao giờ in/trả khóa. Nạp khóa mới: thêm vào secret → chạy `ai-keys-sync`.

## 4. Golden (`ai-golden.yml`, `scripts/ai-golden/`)
- `ielts.json`: 20 bài (10 Task 2, 4 Task 1, 6 Speaking) tự soạn, 83 lỗi đã biết (`q` phải nằm trong `errors[].quote`, `fix` một phương án đúng và không còn nguyên chỗ sai) + band kỳ vọng; 4 ngôn ngữ người học (vi/es/ar/ja).
- `roleplay.json`: 20 lượt trên kịch bản thật (`web/js/roleplay/data-*.js`), có 2 lượt người học nói khó hiểu (phải hỏi lại) + câu mồi kiểm giám khảo (có câu "whole bean" thật).
- Lời nhắn lấy THẲNG từ máy khách (`AI._p`, `RP._p` nạp trong vm – `client.mjs`), thân yêu cầu từ máy chủ (`gemBody`/`groqBody`/`waiBody`) → golden đo đúng thứ người dùng nhận.
- Giám khảo roleplay khác họ, theo thứ tự còn gọi được: gpt-oss-120b → Gemini Flash → Llama 3.3 70B (CF_POOL) → Qwen (Groq); chỉ họ qua MỌI câu mồi mới được chấm (cần ≥ 2 họ); ≥ 90 % lượt phải có điểm.
- Ngưỡng (`score.mjs` `GATE`): IELTS bắt ≥ 90 % lỗi, band lệch TB ≤ 0,5, ≥ 95 % đúng khuôn, lời giải đúng ngôn ngữ 100 %; roleplay giám khảo TB ≥ 4/5, ≤ 1 câu vô lý, câu khó hiểu → hỏi lại 100 %.
- Đỏ khi: giám khảo trượt câu mồi, hoặc model ĐANG trong chuỗi gọi được mà không đạt, hoặc không model nào trong chuỗi gọi được. Model ngoài chuỗi (kimi/qwen/llama Groq, Llama 8B) chỉ báo điểm – muốn thêm: đạt golden rồi thêm vào `GROQ_OK`.
- Chạy: hằng ngày 06:41 UTC + PR đụng `_aichain.js`/`ai.js`/`web/js/ai.js`/`roleplay.js`/`scripts/ai-golden`; tay: `workflow_dispatch` (input `only`).

## 5. Giám sát (`_aimix.js`)
Mỗi lượt /api/ai đếm tuyến phục vụ vào `ai_quota` (id `m:gemini|m:groq|m:wai|m:busy`, khung 10 phút). Quản trị → Khóa API và → Hạn mức hiện tỉ lệ 1 giờ / 24 giờ. Cảnh báo `ai:weak` (banner + thư ≤ 1/24 h qua `syncAlerts`) khi > 10 % lượt trong 1 giờ rơi về Llama hoặc báo bận (≥ 5 lượt; > 50 % = crit).

## 6. Ngôn ngữ lời giải
`web/js/ai.js` `forLang`: mọi lời nhắn gửi /api/ai (SYS/SCHEMA chấm IELTS và mọi `AI.ask` của toeic/toefl/fixer/assist…) viết mẫu "Vietnamese" → thay bằng ngôn ngữ người học (`I18N.learnLang`, 15 ngôn ngữ). Roleplay nhận xét cuối dùng `learnLang`. Đệm máy khách theo ngôn ngữ.

## 7. Kết quả golden (lịch sử ngắn)
- 03/11 (PR #535, lần 2): giám khảo qua câu mồi ("whole bean" = 1/5, câu tốt = 5/5). gpt-oss-120b: IELTS bắt 78 %, band lệch 0,44, 2/20 lỗi JSON Groq; roleplay đọc tay đúng vai (chưa có giám khảo khác họ vì Gemini chết). gpt-oss-20b: 59 %. Llama 3.1 8B: 30 %, 1 câu vô lý, không hỏi lại khi người học nói khó hiểu → loại. Gemini: cả GEMINI_POOL không gọi được hôm đó. Sửa: thử lại lỗi JSON, khuôn chấm liệt kê MỌI lỗi ngữ pháp (≤ 12), giám khảo dự phòng Llama 70B.
- 03/11 lần 3: gpt-oss-120b roleplay 5/5 (giám khảo Llama 70B), band lệch 0,35, JSON 100 %; bắt lỗi 81 % do bộ so khớp chuỗi con thô ("it helps" bị coi còn "it help") → sửa so theo ranh giới từ + chồng lấn; chấm lại cùng dữ liệu: gpt-oss-120b 98 % (sót thật: "an unique", "neither … or"), gpt-oss-20b 81 %, Llama 8B 34 %. GEMINI_POOL: 187 lần 429 + 23 lần 503 – kho bị job CI dùng hết lượt → người dùng chủ yếu được Groq phục vụ.
- 03/11 lần 4: gpt-oss-120b bắt 96 %, roleplay 5/5, band lệch 0,55 – khắt khe nhất quán với bài NÓI (trừ điểm/liệt kê viết hoa, dấu câu của bản chép máy) và dao động ±0,5 giữa các lần. Sửa thật: lời nhắn Nói bỏ qua viết hoa/dấu câu/ranh giới câu của bản chép máy; chấm ở nhiệt độ 0.
- 03/11 lần 5: gpt-oss-120b bắt 98 %, band lệch 0,30, JSON 100 %, roleplay 4,93/5, 0 vô lý, hỏi lại 100 % – chỉ trượt vì 6/20 lượt không có giám khảo (Gemini 277 lần 429, Llama 70B không gọi được) → thêm giám khảo Qwen + thử lại.
- 04/11 lần 7: gpt-oss-120b 87 % – bọc chỗ sửa bằng markdown (`**in**`, người học thấy dấu * thô) → lời nhắn yêu cầu chữ thường, bộ so khớp bỏ `*`.
- 04/11 lần 8: gpt-oss-120b IELTS 94 % / band 0,48 / JSON 100 %, nhưng đáp "ehm the… yes" cho câu hỏi cỡ ly thì hỏi tiếp sang ý mới → lời nhắn roleplay: trả lời không đúng câu hỏi ("yes" cho câu lựa chọn) phải hỏi lại câu đó bằng lời đơn giản.
