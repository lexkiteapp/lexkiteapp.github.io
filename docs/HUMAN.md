# Xác minh người thật (Turnstile + vé human) cho API công khai

> TL;DR: Khách chưa đăng nhập phải chứng minh là người thật trước khi dùng /api/ai (AI miễn phí), /api/contact, /api/report (tạo báo lỗi). Web giải Turnstile; app gốc và add-on giải trong iframe ẩn `https://lexkite.com/human.html` rồi đổi lấy vé 12 h ở `/api/human`. Đăng nhập (Firebase) thì khỏi. Cờ `AI_HUMAN_ENFORCE` bật chế độ bắt buộc cho /api/ai.
> Đọc khi: sửa /api/ai, /api/contact, /api/report, /api/human, web/human.html, web/js/human.js, hoặc trước khi bật cờ.

## Vì sao (AUDIT-2026-10 M3 + rà bảo mật 02/11)
- /api/ai cho ẩn danh gửi prompt hệ thống `sys` tùy ý ≤ 4000 ký tự, không Turnstile → ai cũng dùng được Gemini/Workers AI của Lexkite như proxy LLM miễn phí.
- /api/contact, /api/report chỉ kiểm Turnstile khi máy khách tự gửi token, lỗi mạng tới siteverify thì cho qua.
- Mọi endpoint chỉ tin header `Content-Length` → khai nhỏ rồi gửi hàng MB vẫn bị đệm hết.

## Thiết kế
| Phần | File | Ghi chú |
|---|---|---|
| Prompt hệ thống cố định | `functions/api/ai.js` (`SYS`, `rpSys`, `coachSys`, `pickSys`) | Máy khách gửi `task`: `grade` · `explain` · `rp` (+ `rp: { kind, lv, L, name, role, persona, goal, title, you }`, máy chủ làm sạch/cắt độ dài và chèn vào mẫu) · `rpcoach` (+ `rp.kind`). Trường `sys` cũ bị bỏ qua (chỉ dùng để nhận diện máy khách cũ). Đệm D1 theo `task + sys máy chủ + prompt`. |
| Cổng người thật | `functions/api/_human.js` | `humanGate`: đăng nhập → qua · vé `X-Lexkite-Human` đúng thiết bị → qua · token Turnstile → siteverify · lỗi siteverify = 503 (fail closed). Chưa có `TURNSTILE_SECRET_KEY` → tắt (dev/test). |
| Đổi token lấy vé | `functions/api/human.js` | `POST /api/human { token, dev2? }` + header `X-Lexkite-Device` → `{ ticket, exp }` (HMAC-SHA256, 12 h, tối đa 2 mã thiết bị: trang add-on + service worker). 20 lượt/phút/IP. |
| Trang iframe | `web/human.html` + khối `/human*` trong `web/_headers` | Chỉ postMessage token tới origin trong danh sách (lexkite.com, *.lexkite.pages.dev, localhost, capacitor://localhost, chrome-extension://, moz-extension://). CSP riêng chỉ cho Turnstile; `frame-ancestors` cho app gốc + add-on. |
| Máy khách | `web/js/human.js` (tải lười qua `UI.human()`) | Vé trong localStorage `lk.human`; trang add-on chép thêm vào `chrome.storage.local['lk.human']` cho `extension/background.js` (giải thích từ trên trang web). Khung Turnstile chỉ hiện khi Cloudflare cần bấm; xác minh ngầm quá 15 s → chạy tiếp không vé. |
| Giới hạn body | `functions/api/_body.js` | `readJSON/readText(request, max)` đếm byte thật của luồng, vượt → 413 + hủy luồng. Mọi endpoint dùng (test quét mã nguồn). |

Không thêm quyền add-on mới (iframe trong trang add-on + `storage` sẵn có; xem docs/CWS-RULES.md, extension/permissions.lock).

## Biến môi trường (Cloudflare Pages → lexkite → Settings → Variables)
- `TURNSTILE_SECRET_KEY` (đã có): bật cổng người thật cho contact/report ngay khi deploy; khóa ký vé dẫn xuất từ nó.
- `HUMAN_TICKET_KEY` (tùy chọn, ≥ 32 ký tự ngẫu nhiên): khóa ký vé riêng – đặt nếu muốn xoay khóa vé độc lập với Turnstile.
- `AI_HUMAN_ENFORCE` (mặc định chưa đặt = tắt): `1` → khách /api/ai không vé bị 403 `{ error: 'human' }` (máy khách mới tự xác minh rồi thử lại; add-on hiện "Mở Lexkite một lần để xác minh"). Khi tắt: khách không vé vẫn chạy nhưng **½ hạn mức ngày** (`_quota.js` `lowTrust`), có vé thì đủ. Cùng cờ này cho `/api/contact` + `/api/report`: Origin web (lexkite.com, *.lexkite.pages.dev) thiếu token/vé luôn 403; add-on/app gốc BẢN CŨ (Origin khác/không có) chỉ bị chặn khi cờ = `1` (`humanGate` `via:'legacy'`). Token sai → 403, siteverify lỗi → 503 luôn áp dụng.

## Khi nào bật `AI_HUMAN_ENFORCE=1`
1. Bản web có `web/js/human.js` đã live ≥ 3 ngày (SW CACHE đã bump → người dùng nhận bản mới).
2. Add-on bản có `task: 'explain'` + đọc `lk.human` đã lên Chrome Web Store và ≥ 80 % người dùng add-on đã cập nhật (CWS dashboard).
3. App gốc đã nhận bản OTA có human.js (docs/OTA.md).
4. Quản trị → Hạn mức: tỉ lệ 403 `human` thử trên staging = 0 với web/app/add-on mới.
Trước khi đủ 1–4: để tắt (máy khách cũ trong bộ đệm vẫn chạy, chỉ hạn mức thấp hơn).

## Test
`scripts/test/ai-task.mjs` (prompt cố định, khớp nguyên văn máy khách) · `scripts/test/quota.mjs` mục 11 (vé giả/hết hạn/sai thiết bị, cờ, ½ hạn mức, contact fail closed) · `scripts/test/report.mjs` (báo lỗi fail closed, HMAC CI vẫn qua) · `scripts/test/body-limit.mjs` (Content-Length giả → 413, mọi endpoint dùng `_body.js`).
