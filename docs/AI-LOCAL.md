# AI trên máy (built-in AI của Chrome/Edge) – lớp dùng chung `web/js/ai-local.js`

> TL;DR: `AILocal.*` dùng AI có sẵn trong trình duyệt (miễn phí, riêng tư) trước, trả `null` khi không dùng được → nơi gọi dùng đường cũ (máy chủ/dữ liệu). Tải lười, không trong khung app, không bao giờ tự tải mô hình.
> Đọc khi: thêm/sửa tính năng AI, đụng tới dịch trên máy, hoặc Chrome đổi API.

## Trạng thái API (kiểm docs developer.chrome.com/docs/ai, 26/10/2026)
| API (tên toàn cục) | Web | Add-on | Ghi chú |
|---|---|---|---|
| `Translator` | Ổn định Chrome 138 | Ổn định | Mô hình chuyên biệt theo cặp ngôn ngữ; không có trên di động |
| `LanguageDetector` | Ổn định 138 | Ổn định | Không có trên di động |
| `Summarizer` | Ổn định 138 | Ổn định | Gemini Nano |
| `LanguageModel` (Prompt API) | Web: Chrome 148 (trước đó origin trial) | Ổn định 138 | Đầu ra en/es/ja; `responseConstraint` (JSON schema), `promptStreaming` |
| `Proofreader` | Origin trial | Origin trial | `expectedInputLanguages: ['en']` |
| `Writer`, `Rewriter` | Dev/origin trial | Dev trial | |
| Edge | Prompt + Writing Assistance: dev trial (Canary/Dev, Phi-4-mini) – cùng tên API | | |

Chung: `X.availability(opts)` → `'unavailable' | 'downloadable' | 'downloading' | 'available'`; `X.create({...opts, monitor(m){ m.addEventListener('downloadprogress', e => e.loaded) }})`. Khi chưa `available`, `create()` cần user activation (`navigator.userActivation.isActive`). Phần cứng: ~22 GB trống, GPU > 4 GB VRAM hoặc 16 GB RAM; mạng không đo lưu lượng khi tải. Add-on không cần quyền mới trong manifest (đã kiểm CWS-RULES + permissions.lock).

## Quy tắc trong Lexkite
- `App.need('ailocal')` chỉ khi một tính năng cần; không dò gì lúc mở app. `caps()`/`status()` có bộ đệm; mọi lời gọi có timeout (mặc định 8 s, chấm bài 15 s) + `signal`.
- Không tự tải: chỉ `AILocal.download()` từ nút người dùng bấm (hiện dung lượng + gợi ý Wi-Fi); chặn khi Save-Data/di động/2G-3G; bỏ qua máy `deviceMemory < 4`.
- Cài đặt "Dùng AI trên máy (miễn phí, riêng tư)" = `state.settings.aiLocal` (mặc định bật).
- Kiểm chất lượng: JSON theo schema (`AILocal.valid`), độ dài, ngôn ngữ (`AILocal.check`) – sai → máy chủ. Kết quả trên máy gắn `_local: true` (huy hiệu "Trên máy").
- Đang dùng: chấm Writing (`AI.grade` → `localAI`), mẹo nhớ/giải thích (`AI.askLocal`, `AI.explain`), dịch nghĩa (`Dict.translateTo/translateVi` → Translator đã có sẵn gói).
- Kiểm thử: `scripts/test/ai-local.mjs` (giả lập các global).
