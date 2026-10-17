# Hạn mức & chống lạm dụng (Quotas)

Mục tiêu: không một người dùng hay bot nào chiếm hết tài nguyên dùng chung. Mọi thứ tĩnh vẫn **miễn phí và không giới hạn**,
và người trong danh sách cho phép được dùng không giới hạn.

- Module: `functions/api/_quota.js` (không phải route)
- Quản trị: `functions/api/quota.js` (chỉ admin) + tab **Quản trị → Hạn mức** (`web/js/admin-quota.js`, tải lười)
- Test: `scripts/test/quota.mjs` (`npm run test:quota`, nằm trong `npm test`)

## 1. Rà soát endpoint

| Endpoint / Worker | Tốn gì | Trước đây | Bây giờ |
|---|---|---|---|
| `/api/ai` (chấm Writing/Speaking) | Gemini (≈20 lượt/ngày/khóa) → Workers AI (10k neuron/ngày) | 6/phút; 5/ngày (đăng nhập), 3/ngày (khách, theo IP); trần chung 400/ngày | tính năng `ai` + cầu dao `gemini`/`ai` |
| `/api/ai` kind `rp` (Roleplay for Work) | như trên | 60/ngày, khách 16, trần 1.500 | tính năng `chat` + cầu dao |
| `/api/handoff` put (chuyển máy QR) | D1 ghi blob ≤ 1,5 MB | 6 lượt/10 phút/IP | giữ + tính năng `handoff` (theo thiết bị + IP) |
| `/api/handoff` get | D1 đọc | 20/10 phút/IP | giữ nguyên |
| `/api/contact` (thư qua Worker `lexkite-mail`) | D1 + gửi thư | 5 tin/giờ/IP (D1), Turnstile, ô bẫy | giữ + tính năng `contact` + cầu dao `mail` |
| `/api/sync` | D1 đọc/ghi | 1 lần/20 giây/op/uid | giữ + tính năng `sync` (đếm ở biên) |
| `/api/league` | D1 | 12/phút/uid | giữ + tính năng `league` (đếm ở biên) |
| `/api/hit` (thống kê) | Functions + D1 ghi | add-on 20/giờ/máy; `hit_rate` lấy mẫu | giữ + tính năng `hit` theo IP (vượt → bỏ qua im lặng, 204) |
| `/api/img` (ảnh minh họa) | Wikipedia/Openverse khi trượt bộ đệm | bộ đệm biên 7–30 ngày | tính năng `img` – **chỉ lượt trượt bộ đệm** |
| `/api/admin`, `/api/social`, `/api/studio` | GrabCast, GitHub | chỉ admin (adminGate 120/phút/IP); GrabCast 55/phút, 2.900/ngày | giữ nguyên (đã chỉ admin) |
| `/api/config`, `/api/i18nfix` | đọc D1, đệm 5 phút | – | không giới hạn (công khai, rẻ) |
| Worker `lexkite-gemini` | proxy Gemini | không có URL công khai (chỉ service binding) | được che bởi `/api/ai` |
| Worker `lexkite-mail` | gửi thư, cron | chỉ service binding + cron | được che bởi `/api/contact` |
| Worker `lexkite-audio`, `lexkite-media` | CDN tĩnh, cache 1 năm | – | **không giới hạn** (tĩnh) |
| Dịch máy (`translate.googleapis.com`), TTS, Call Mia, Chrome Prompt API | chạy ở máy người dùng | – | không qua máy chủ → không giới hạn. `translate` đã có sẵn ngân sách dự phòng nếu sau này thêm proxy |

Không đi qua module: file tĩnh, dữ liệu từ điển, bài học, ôn tập, chế độ ngoại tuyến.

## 2. Danh tính & bậc

- **id**: `u:<uid>` (Firebase ID token hợp lệ) → `d:<mã thiết bị>` (header `X-Lexkite-Device`, 16–64 ký tự ngẫu nhiên, `UI.dev()` sinh và lưu ở `localStorage['lk.dev']`) → `i:<IP băm>`.
- **IP**: luôn đếm thêm theo IP đã băm SHA-256 (không lưu IP gốc; IPv6 gộp theo /64). Trần IP = `ipx × mức cao nhất của các bậc` → xoay mã thiết bị không lách được.
- **Bậc**: `anon` (khách) < `free` (đã đăng nhập) < `unlimited`.
  `unlimited` = email đã xác minh trong `ADMIN_EMAILS` hoặc `UNLIMITED_EMAILS` (biến môi trường Pages, danh sách email cách nhau bởi dấu phẩy) hoặc id trong bảng `quota_allow` (`e:email`, `u:uid`, `d:thiết bị`, `i:IP băm`).
  Không giới hạn = bỏ qua hạn mức theo người/IP và khóa; cầu dao nhà cung cấp vẫn áp dụng (không thể vượt gói miễn phí).

## 3. Hạn mức mặc định

`[mỗi phút, mỗi ngày]`. Quản trị đổi trong tab Hạn mức (bảng `quota_config`, đè lên mặc định; áp dụng ≤ 1 phút).

| Tính năng | Khách | Đăng nhập | × IP | Đếm ngày | Cầu dao |
|---|---|---|---|---|---|
| `ai` – chấm bài | 5 / 10 | 5 / 30 | 3 | D1 | `gemini`, `ai` (50 neuron/lượt) |
| `chat` – Roleplay | 10 / 20 | 20 / 60 | 3 | D1 | `gemini`, `ai` (8 neuron/lượt) |
| `handoff` – tạo mã QR | 3 / 10 | 3 / 10 | 3 | D1 | – |
| `contact` – form liên hệ | 2 / 5 | 2 / 5 | 2 | D1 | `mail` |
| `sync` | – (cần đăng nhập) | 6 / 1.500 | 10 | biên | – |
| `league` | – (cần đăng nhập) | 12 / 300 | 10 | biên | – |
| `img` – lượt trượt đệm | 30 / 300 | 30 / 300 | 3 | biên | – |
| `hit` – thống kê | 120 / 10.000 | 120 / 10.000 | 1 | biên | – |
| `translate` (dự phòng) | 60 / 2.000 | 60 / 2.000 | 3 | biên | – |

- Khóa cũ `ai_user` / `ai_anon` ở tab Cài đặt vẫn được đọc cho `ai` **chỉ khi** chưa có dòng `ai` trong `quota_config`. `ai_global` đã được thay bằng cầu dao.
- Bài đã chấm (đệm `ai_cache`) không tốn lượt. Burst/phút luôn áp cho mọi yêu cầu.
- **D1** = đếm chính xác (`INSERT … ON CONFLICT DO UPDATE … RETURNING n`, gộp lượt người + IP + đọc bộ đếm nhà cung cấp trong 1 batch), hiện ở "Dùng nhiều nhất hôm nay".
  **biên** = đếm gần đúng bằng Cache API theo từng trung tâm dữ liệu (0 lượt ghi D1) cho endpoint gọi dày.
- Hết lượt ngày → đánh dấu ở biên tối đa 10 phút để các lượt sau không chạm D1.

## 4. Cầu dao nhà cung cấp (≤ 80% gói miễn phí)

`PROVIDERS` trong `_quota.js` phải khớp `cap` trong `infra/resources.json` (test kiểm). Bộ đếm `p:<provider>` theo ngày UTC trong `quota_count`.

| Provider | Trần/ngày | Gần trần (≥ 80%) thì |
|---|---|---|
| `gemini` | 20 lượt × số khóa | chỉ dùng Workers AI |
| `ai` (Workers AI) | 10.000 neuron | chỉ dùng Gemini; cả hai gần trần → 429 `quota.busy` → máy khách chấm nhanh theo quy tắc / Roleplay chuyển kịch bản soạn sẵn |
| `mail` | 100 thư | vẫn lưu tin nhắn (Quản trị → Hộp thư), chỉ không chuyển thư |

Tính năng học cốt lõi không bao giờ phụ thuộc cầu dao.

## 5. Phản hồi 429

```json
{ "error": "quota", "feature": "ai", "tier": "anon", "msg": "quota.daily", "resetAt": 1760745600000, "wait": 3600, "signIn": true, "left": 0 }
```
`msg`: `quota.daily` · `quota.burst` · `quota.busy` · `quota.blocked` (`resetAt: null` = khóa vô thời hạn). Có header `Retry-After`.
Không trả hạn mức, bộ đếm hay chi tiết nội bộ. Máy khách: `UI.quotaText(j)` / `UI.quota(j)` (toast) trong `web/js/ui.js` – câu qua `t()` (có bản dịch 15 ngôn ngữ); khách được gợi ý đăng nhập.
Các nơi xử lý: `ai.js` (chấm bài → hiện lý do + chấm nhanh), `roleplay.js` (toast + kịch bản soạn sẵn), `handoff.js` (toast), `sync.js` (burst → chờ rồi gửi lại; hết ngày → tạm nghỉ đồng bộ, dữ liệu vẫn trên máy).

## 6. Chống lạm dụng

- Một id/IP bị từ chối ≥ 20 lần trong 10 phút = 1 **lỗi** (ghi `quota_flag`, tối đa 1 lần/10 phút).
- 3 lỗi trong 24 giờ → **khóa tạm** 15 phút × 2^(lần khóa − 1), tối đa 7 ngày. Số lần khóa tự về 0 sau 7 ngày sạch.
- Quản trị thấy id bị gắn cờ, có thể mở khóa (xóa cả khóa tự động) hoặc khóa thủ công (id, email, hoặc IP gốc → tự băm).

## 7. Bảng D1 (tự tạo khi chạy lần đầu)

| Bảng | Nội dung |
|---|---|
| `quota_count (k, day, n)` | `<tính năng>|<id>` và `p:<provider>` theo ngày UTC; tự dọn > 8 ngày |
| `quota_config (feature, v, at, by)` | ngân sách tùy chỉnh `{anon:[m,d], free:[m,d], ipx}` |
| `quota_allow (id, note, at, by)` | danh sách không giới hạn |
| `quota_block (id, until, reason, at, by)` | khóa thủ công (`until = 0` = vô thời hạn) |
| `quota_flag (id, strikes, bans, last, until, feature)` | gắn cờ & khóa tự động |
| `quota_audit (at, email, op, target, detail)` | nhật ký mọi thay đổi (cũng ghi `admin_log` với op `quota.*`) |

Bộ nhớ isolate đọc cấu hình/danh sách/khóa tối đa 1 lần/phút (1 batch đọc). Lỗi D1/Cache → **cho qua** (không chặn nhầm người học).

## 8. API quản trị

`POST /api/quota` (Firebase ID token, email trong `ADMIN_EMAILS`, Origin của mình):
`state` · `blockSet {target, minutes, reason}` · `blockDelete {id}` · `configSet {feature, v}` · `configReset {feature}` · `allowSet {target, note}` · `allowDelete {id}`.

## 9. Hạ tầng

- Biến môi trường mới (tùy chọn, không phải khóa bí mật): `UNLIMITED_EMAILS` trên Cloudflare Pages.
- `infra/resources.json`: thêm `cap` cho `ai`, `gemini`, `mail`, `pages`, `d1`; `quota.lexkite.internal` (khóa Cache API nội bộ); bảng `quota_*` ghi ở mục D1.
