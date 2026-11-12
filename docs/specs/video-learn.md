# Học qua video (YouTube + kho của mình + add-on) – spec-lite (03/11/2026)

> TL;DR: Route mới `#/watch` (tải lười, gói `watch`): chủ đề CEFR A1–C2 × mục tiêu có sẵn từ khóa + bộ lọc, dán link YouTube, tìm video, rồi học bằng trình phát YouTube CHÍNH THỨC (IFrame API, youtube-nocookie) với lặp A-B, tốc độ, lùi 5 s, ghi chú, lưu từ vào SRS. Add-on trên youtube.com làm phần phụ đề song ngữ / bài tập (đọc phụ đề trình duyệt đang hiện). $0, không tải video, không chặn quảng cáo, không che player.
> Đọc khi: sửa `web/js/watch*.js`, `functions/api/watch.js`, phần YouTube của `extension/content.js`.

## 1. Mục tiêu & xong khi
- Người học tìm được video đúng trình độ/chủ đề trong ≤ 2 chạm (chủ đề → video) hoặc 1 lần dán link; học không rời app.
- Vượt Language Reactor / 4you / Lingopie / FluentU ở: miễn phí 100 %, chủ đề theo CEFR + mục tiêu thi, đồng bộ SRS/từ điển/giọng Kokoro sẵn có, chạy cả web/mobile/add-on, nhẹ (gói lười, khung app không đổi).
- Xong khi: 3 pha gộp, CI xanh (npm test + visual sáng/tối 360/390 px + frame/contrast/overlap + i18n 15 ngôn ngữ), khung app ≤ 374 KB gz (chỉ +2 dòng BUNDLES/ROUTE_BUNDLE).

## 2. Pháp lý / điều khoản đã kiểm (YouTube API Services Terms + Developer Policies, Embedded Player)
| Được | Không |
|---|---|
| Nhúng player chính thức (IFrame API, `youtube-nocookie.com`), ≥ 200×200, giữ logo/nút YouTube | Tải/lưu video, âm thanh, khung hình; phát nền khi ẩn tab |
| Điều khiển qua API công khai: play/pause/seek/`setPlaybackRate` (lặp A-B = seekTo) | Che/đè player, chặn/bỏ qua quảng cáo, tự đổi giao diện player |
| Data API v3 bằng khóa riêng; lưu đệm dữ liệu API ≤ 30 ngày (ta: 7 ngày) | Lưu đệm lâu hơn, gom dữ liệu kênh/người dùng |
| oEmbed công khai (tên, kênh, ảnh) · RSS kênh công khai `feeds/videos.xml` | Scrape trang/`timedtext` từ máy chủ |
| Phụ đề: của mình (kho video), người học tự dán (.srt/.vtt họ có quyền), add-on đọc phụ đề **trình duyệt người học đang hiển thị** (như Language Reactor) | `captions.download` video người khác (cần OAuth chủ kênh) |
- Chính sách riêng tư cần thêm đoạn "dùng YouTube API Services" + link Google Privacy Policy + YouTube ToS (file pháp lý chung → 1 PR chủ sở hữu, ghi ở pha 1).
- Không gửi PII: tìm kiếm gửi từ khóa, không gửi id người học. Lịch sử xem chỉ ở máy (`localStorage` `wt.*`), đồng bộ thẻ SRS qua đường sẵn có.

## 3. Kiến trúc
- **Client** `web/js/watch-topics.js` (dữ liệu chủ đề) + `web/js/watch.js` (route `#/watch`, `#/watch/<id>`) + `web/css/watch.css`, gói lười `watch` (BUNDLES/ROUTE_BUNDLE). Chuỗi nguồn tiếng Việt → `web/js/i18n/en/watch.js` (nhóm LAZY `watch`) → 15 ngôn ngữ.
  - Hub: ô dán link/tìm, chip lọc (trình độ, độ dài, accent, có phụ đề), lưới chủ đề, "Xem tiếp" (lịch sử máy), "Cho bạn" (chủ đề khớp từ đang học + trình độ).
  - Trình học: IFrame API (web). Bản add-on không nạp mã từ xa (`build-extension.sh` gỡ `iframe_api`) → iframe nhúng thường + nút "Mở trên YouTube" (add-on lo phụ đề ở đó).
  - Dùng chung: `App.addWord` (thẻ SRS + ngữ cảnh `source=youtube…&t=` → #/reflex dùng lại), `UI.tts` (Kokoro) đọc từ, `#/dict/<từ>` tra nghĩa. Không viết trình phát TTS thứ hai.
- **Server** `functions/api/watch.js` (GET, Cache API ở biên, D1 tối thiểu):
  - `op=info&id=` → oEmbed (không khóa, cache 7 ngày).
  - `op=feed&topic=` → RSS các kênh chủ đề (không khóa, không quota, cache 6 h).
  - `op=search&q=&dur=&cc=` → Data API `search.list` (100 đơn vị) + `videos.list` (1) với khóa `YOUTUBE_SEARCH_KEY` (dự án GCP RIÊNG, không chung 10k của upload `youtube.js`). Đệm Cache API 24 h + D1 `watch_cache` 7 ngày theo băm từ khóa đã chuẩn hóa; đếm `watch_quota(day)` theo ngày Pacific, trần `WATCH_SEARCH_UNITS` (mặc định 9.000) → hết/không khóa trả `{ fallback: 'https://www.youtube.com/results?search_query=…' }` + RSS chủ đề. Tốc độ theo IP (`limit`).
  - Đăng ký `infra/resources.json`; `docs/QUOTAS.md` thêm dòng.

## 4. Pha (mỗi pha 1 PR nhỏ, gộp xong mới mở pha sau)
1. **Chủ đề + tìm + dán link + trình phát cơ bản** (A-B, tốc độ, lùi 5 s, ghi chú, lưu từ) + API watch + test `scripts/test/watch.mjs` + mục Kỹ năng/Nghe.
2. **Trình học có phụ đề**: kho video của mình (`/data/videos.json` có phụ đề EN) + phụ đề người học dán: danh sách câu cuộn theo thời gian, chạm từ → nghĩa + lưu, lặp câu, Shadowing (UI.recognize chấm từng từ như #/reflex), Chính tả, Điền từ, Quiz.
3. **Add-on youtube.com** (`extension/content.js`, không thêm quyền – host đã có): phụ đề song ngữ dưới khung phụ đề gốc, bảng câu bên phải (từ phụ đề đang hiện + bảng "Transcript" YouTube nếu người học mở), lặp câu, tốc độ, bài tập như pha 2; quảng cáo YouTube giữ nguyên.

## 5. Hiệu năng & cổng
- Hub: 0 byte YouTube trước khi bấm (chỉ ảnh `i.ytimg.com` `loading=lazy`, ≤ 12 thẻ/lần); player chỉ nạp khi mở video. Máy yếu: không hiệu ứng nặng, `prefers-reduced-motion`.
- Quảng cáo AdSense/AdMob: route `watch` không nằm trong danh sách cho phép → không có quảng cáo của mình đè phụ đề/player.
- Test: unit (`watch.mjs`: tách id mọi dạng link, RSS, chủ đề hợp lệ, API: cache/quota/fallback với fetch giả), `journey-e2e` chụp `#/watch` sáng/tối 360/390, size-budget, i18n-missing/qa strict.
- Công tắc tắt: cờ `watch` ở Quản trị (route ẩn khỏi Kỹ năng) + `WATCH_SEARCH_UNITS=0` tắt tìm kiếm.

## 6. Việc của chủ (owner-pending)
- Tạo khóa API "YouTube Data API v3" trong một dự án Google Cloud mới (miễn phí) → secret Pages `YOUTUBE_SEARCH_KEY`. Chưa có khóa: chủ đề vẫn chạy bằng RSS kênh + nút mở YouTube search.
