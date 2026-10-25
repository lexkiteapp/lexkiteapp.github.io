# JOBS – sổ việc nền & điều phối (sinh từ infra/jobs.json — KHÔNG sửa tay)

> TL;DR: Sổ việc nền & điều phối, SINH TỰ ĐỘNG từ infra/jobs.json (không sửa tay): luật, tài nguyên, lịch UTC, đồ thị kho từ. Sinh lại: node scripts/jobs/gen.mjs --write; jobs-check chặn lệch.
> Đọc khi: thêm cron/CI nền.

Nguồn duy nhất: `infra/jobs.json`. Sinh lại: `node scripts/jobs/gen.mjs --write`. CI (`npm test` → `scripts/test/jobs-check.mjs`) chặn: lịch lệch workflow, trùng, việc dùng chung tài nguyên ĐỘC QUYỀN chồng giờ, việc nặng chung phút bắt đầu, việc có lease thiếu bước thuê.

## Luật
- **Ưu tiên**: user > publishing > render > archive > reports > bulk. Hạn mức D1 hôm nay còn lại quyết định việc nào được khởi động: trần dùng user 100% · publishing 70% · render 60% · archive 50% · reports 40% · bulk 30% (vượt → bỏ qua tới khung kế, ghi lý do).
- **Thuê (lease)**: việc nặng gọi `node scripts/jobs/lease.mjs acquire <id>` đầu job và `release` cuối job (`if: always()`). Máy chủ (`functions/api/jobs.js`, bảng `job_leases`/`job_runs` ở D1 nội bộ) cấp thuê toàn bộ tài nguyên độc quyền hoặc từ chối (đang có việc khác giữ → bỏ qua, không chạy song song). Thuê tự hết hạn (ttl = phút ước lượng × 1,5).
- **Ngân sách**: mỗi tài khoản D1 đo riêng (cầu dao `_d1guard.js`); việc nền dừng sạch khi vượt trần, không thử lại.
- **Xem**: Quản trị › Hạn mức › "Lịch việc nền" (dòng thời gian hôm nay: đã chạy / bỏ qua + lý do / dùng bao nhiêu).

## Tài nguyên
- `d1_main` — D1 chính (người dùng)
- `d1_main_read` — Đọc D1 chính
- `d1_internal` — D1 nội bộ (tài khoản 2) (độc quyền)
- `drive_pool` — Kho Drive (Google API) (độc quyền)
- `youtube_api` — YouTube API (độc quyền)
- `gemini` — Gemini (miễn phí) (độc quyền)
- `workers_ai` — Workers AI tài khoản CHÍNH (neuron) – dành cho AI người dùng; việc nền mặc định 0 neuron (reservations) (độc quyền)
- `gh_minutes` — Phút GitHub Actions
- `workers_ai_b` — Workers AI tài khoản 2 (neuron, 10.000/ngày miễn phí) – dành cho việc nền (độc quyền)
- `grabcast_ai` — GrabCast AI pool (ảnh + chữ – tuyến dự phòng của scripts/lib/ai-pool.mjs)
- `web_push` — Nhắc học: Web Push + FCM (cron Worker lexkite-push, D1 nội bộ tra theo khóa, ≤ 40 thiết bị/lượt)

## Lịch (UTC, theo giờ trong ngày)
| Giờ UTC | Việc | Lịch cron | Ưu tiên | Tài nguyên | Phút | Ước lượng | Thuê |
|---|---|---|---|---|---|---|---|
| 00:00 | `health` | `0 0 * * *` | reports | gh_minutes | 45 | d1_main_reads≈20000 | — |
| 00:00 | `push` | `*/10 * * * *` | publishing | web_push | 1 | d1_internal_reads≈17000, d1_internal_writes≈2000 | — |
| 00:07 | `blog-publish` | `7 * * * *` | publishing | gh_minutes | 10 | — | — |
| 00:07 | `youtube-manual` | `7,37 * * * *` | publishing | youtube_api, d1_main_read | 5 | d1_main_reads≈300 | — |
| 00:12 | `ci-triage` | `12 * * * *` | reports | gh_minutes | 5 | d1_internal_reads≈10 | — |
| 00:15 | `d1-backup` | `15 0 * * 1,2` | archive | d1_main_read, drive_pool, gh_minutes | 30 | d1_main_reads≈60000, drive_calls≈80 | ✓ |
| 00:20 | `word-audio` | `20 */4 * * *` | render | gh_minutes | 150 | — | — |
| 00:50 | `script-bank` | `50 0 * * *` | render | workers_ai_b, grabcast_ai, gh_minutes | 60 | workers_ai_b_neurons≈2000, grabcast_text≈60 | ✓ |
| 01:00 | `lighthouse` | `0 1 * * 1` | reports | gh_minutes | 15 | — | — |
| 01:00 | `mail-digest` | `0 1 * * *` | reports | d1_main_read | 2 | d1_main_reads≈3000 | — |
| 01:15 | `youtube-upload` | `15 1,8,14,20 * * *` | publishing | youtube_api, drive_pool, d1_internal | 20 | d1_internal_reads≈200, d1_main_reads≈100, drive_calls≈60 | ✓ |
| 01:25 | `capacity-watch` | `25 1 * * *` | reports | d1_main, gh_minutes | 2 | d1_main_reads≈40 | — |
| 01:30 | `pr-check` | `30 1 * * *` | publishing | gh_minutes | 10 | — | — |
| 01:30 | `screens` | `30 1 * * *` | render | gh_minutes | 25 | — | — |
| 01:40 | `vocab-img-scene` | `40 1,7,13,19 * * *` | bulk | grabcast_ai, gh_minutes | 120 | grabcast_images≈6000, grabcast_text≈300, shards_max≈10, per_shard_images≈max_gc / shards, judge≈local CPU (0 token), grabcast_vision≈6000 | ✓ |
| 01:45 | `footage-archive` | `45 1,2,6,14,15,16,17,18,20,21,22 * * *` | archive | drive_pool, d1_internal, gh_minutes | 50 | d1_internal_reads≈3000, drive_calls≈700 | ✓ |
| 01:50 | `contrast` | `50 1 * * *` | reports | gh_minutes | 15 | — | — |
| 02:10 | `nav-render` | `10 2 * * *` | render | gh_minutes | 20 | — | — |
| 02:17 | `content-protect` | `17 2 * * 0` | reports | gh_minutes | 10 | — | — |
| 02:30 | `i18n` | `30 2 * * *` | render | gemini, gh_minutes | 90 | — | — |
| 03:20 | `visual-qa` | `20 3 * * 1` | reports | gh_minutes | 30 | — | — |
| 03:41 | `storage-watch` | `41 3 * * 1` | reports | gh_minutes | 5 | d1_internal_reads≈10 | ✓ |
| 04:23 | `drive-shorts` | `23 4 * * *` | archive | drive_pool, d1_internal | 20 | d1_internal_reads≈20000, drive_calls≈1500 | ✓ |
| 04:40 | `capacity-sim` | `40 4 * * 1` | reports | gh_minutes | 10 | — | — |
| 04:40 | `vocab-img-free` | `40 4 * * 1` | bulk | gh_minutes | 6 | images≈0 | — |
| 04:47 | `video-web` | `47 4 * * *` | render | gh_minutes, drive_pool, d1_internal | 40 | d1_internal_reads≈300, drive_calls≈100 | ✓ |
| 05:30 | `d1b-migrate` | `30 5 * * *` | archive | d1_internal, d1_main_read, drive_pool | 45 | d1_main_reads≈40000, d1_internal_reads≈2000 | ✓ |
| 06:20 | `footage-verify` | `20 6 * * 1` | reports | drive_pool, d1_internal | 20 | d1_internal_reads≈8000, drive_calls≈300 | ✓ |
| 07:30 | `explain` | `30 7 * * *` | render | gemini, grabcast_ai, gh_minutes | 40 | gemini_calls≈400, grabcast_text≈200 | — |
| 08:53 | `news-auto` | `53 8 * * *` | render | gh_minutes, workers_ai_b, gemini, drive_pool | 150 | clips≈6, gemini_calls≈12, drive_calls≈60, workers_ai_b_neurons≈3000 | ✓ |
| 11:30 | `release-archive` | `30 11 * * 6` | archive | drive_pool, gh_minutes | 30 | drive_calls≈40 | ✓ |
| 12:00 | `code-bundle` | `0 12 * * 0` | archive | drive_pool, gh_minutes | 60 | drive_calls≈20 | ✓ |
| 13:05 | `video-tpl1b` | `5 13 * * *` | render (tạm dừng) | gh_minutes, grabcast_ai, drive_pool | 45 | clips≈12, grabcast_calls≈6, drive_calls≈40 | ✓ |
| 13:10 | `vocab-img` | `10 13 * * *` | bulk | grabcast_ai, gh_minutes | 85 | grabcast_images≈400, grabcast_text≈220, senses≈220, images≈130 | ✓ |
| 15:40 | `lexicon-expand` | `40 15 * * *` | render | gemini, grabcast_ai, workers_ai_b, gh_minutes | 120 | gemini_calls≈400, grabcast_text≈7000, workers_ai_b_neurons≈1500 | ✓ |
| 19:00 | `audio` | `0 19 * * *` | render | gh_minutes | 60 | — | — |
| 20:30 | `word-packs` | `30 20 * * *` | render | gh_minutes, gemini | 45 | — | — |
| 21:00 | `wordlists` | `0 21 * * *` | render | gh_minutes | 20 | — | — |
| 21:30 | `lexicon-i18n` | `30 21 * * *` | render | gemini, gh_minutes | 60 | — | — |
| 22:00 | `i18n-leak` | `0 22 * * *` | reports | gh_minutes | 20 | — | — |
| 22:40 | `quality-sweep` | `40 22 * * *` | reports | gh_minutes | 45 | — | ✓ |
| 23:10 | `content-qa` | `10 23 * * *` | reports | gh_minutes | 5 | — | — |
| 23:17 | `video-auto` | `17 23 * * *` | render | gh_minutes | 90 | — | — |
| 23:30 | `blog-daily` | `30 23 * * *` | publishing | gemini, gh_minutes | 30 | — | — |

Sau mốc reset 00:00 UTC (hạn mức D1 miễn phí làm mới), thứ tự: việc nền "đăng bài" trước, rồi dựng, lưu trữ (footage-archive 01:45 → drive-shorts → d1b-migrate 05:30), báo cáo.

## Đồ thị kho từ (sinh từ infra/lexicon-consumers.json – test scripts/test/lexicon-expand.mjs chặn việc hạ nguồn bỏ sót)
`lexicon-expand` 15:40 UTC → `content/lexicon/expand/pending` → soát mẫu ≥ 5 % (`promote.mjs`) → `content/lexicon/expand/<lô>.json` (nguồn duy nhất, 0 byte web/js) → mỗi push: npm test (dict-consistency, content-qa, lexicon-expand) → build-web (mảnh Lex, /words/ + sitemap + IndexNow) → các việc đêm đọc cùng nguồn:

| Việc hạ nguồn | Đọc qua | Việc/lịch |
|---|---|---|
| `scripts/lexicon/shards.mjs` – mảnh tra từ (web, mobile, add-on qua Lex) + mảnh nghĩa 13 ngôn ngữ | `loadExpand` | build-web (mỗi lần deploy) |
| `scripts/lexicon/surfaces.mjs` – dict-consistency: mảnh = INDEX | `loadBrowserIndex` | npm test |
| `scripts/build-lexicon.mjs` – dist/lexicon.json (vimg, video-web, i18n) + cổng ảnh | `loadExpand` | build / npm test |
| `scripts/build-seo-pages.mjs` – /<lang>/words/ + sitemap-words + IndexNow (.seo-urls.txt) | `loadBrowserIndex` | build-web → indexnow |
| `scripts/gen-word-audio.mjs` – hàng âm thanh Kokoro Anh/Mỹ (kho từ qua scripts/word-audio/lib.mjs) | `loadAllPlus` | word-audio mỗi 4 giờ |
| `scripts/word-audio/lib.mjs` – kho từ cần giọng đọc từ đơn s3 (gen-word-audio.mjs, merge.mjs) | `loadAllPlus` | word-audio mỗi 4 giờ |
| `scripts/scriptbank/lib.mjs` – điểm học kịch bản video (từ#loại tra kho) | `expandRows` | script-bank 00:50 UTC |
| `scripts/vocab-img/imageability.py` – hàng ảnh theo nghĩa (chấm vẽ được) | `dist/lexicon.json` | vocab-img (tạm dừng) |
| `scripts/vocab-img/gen.mjs` – vẽ ảnh nghĩa | `dist/lexicon.json` | vocab-img |
| `scripts/vocab-img/icons.mjs` – icon Noto theo nghĩa | `dist/lexicon.json` | vocab-img |
| `scripts/vocab-img/judge.mjs` – giám khảo ảnh | `dist/lexicon.json` | vocab-img |
| `scripts/vocab-img/qc.py` – QC ảnh | `dist/lexicon.json` | vocab-img |
| `scripts/video/web-rendition.mjs` – thẻ từ trong video web | `dist/lexicon.json` | video-web |
| `scripts/lib/video-web.mjs` – thẻ clip | `dist/lexicon.json` | video-web |
| `scripts/gen-newtab.mjs` – tab mới add-on | `loadBrowserIndex` | build-extension (bản phát hành) |
| `scripts/content-qa/gate.mjs` – cổng QA nội dung (kiểm lại mục mở rộng đã xuất) | `loadExpand` | npm test / content-qa |
| `scripts/lexicon/expand/existing.mjs` – đầu vào chọn từ (không trùng) | `loadExpand` | lexicon-expand |
| `scripts/lexicon/expand/lib.mjs` – nguồn | `loadExpand` | — |
| `scripts/lexicon/lib.mjs` – nạp kho | `loadAllPlus` | — |
| `scripts/lexicon/i18n-job.mjs` –  | bỏ qua: mục mở rộng đã có nghĩa 13 ngôn ngữ qua 2 giám khảo trong nguồn (x: 1 bị lọc) | — |
| `scripts/lexicon/expand/espeak-calib.mjs` –  | bỏ qua: chỉ lấy mẫu từ kho viết tay để hiệu chuẩn IPA Anh espeak ↔ Wiktionary; không ghi/xuất | — |
| `scripts/lexicon/cefr-check.mjs` –  | bỏ qua: chỉ gắn cờ CEFR bộ viết tay; mục mở rộng có cổng CEFR riêng (gateEntry) | — |
| `scripts/scriptbank/gold.mjs` –  | bỏ qua: bộ mẫu vàng cố định từ bộ viết tay | — |
| `scripts/vocab-img/cards.mjs` – thẻ nghĩa vimg | `dist/lexicon.json` | vocab-img |
| `scripts/vocab-img/publish.mjs` – đăng ảnh vimg | `dist/lexicon.json` | vocab-img |
| `scripts/vocab-img/spot.mjs` – kiểm mẫu ảnh | `dist/lexicon.json` | vocab-img |
| `scripts/vocab-img/scene.mjs` – vẽ ảnh nghĩa | `dist/lexicon.json` | vocab-img-scene |
| `scripts/vocab-img/scene-gen.mjs` – vẽ ảnh nghĩa | `dist/lexicon.json` | vocab-img-scene |
| `scripts/vocab-img/local_judge.py` – vẽ ảnh nghĩa | `dist/lexicon.json` | vocab-img-scene |
| `scripts/vocab-img/calibrate.py` – vẽ ảnh nghĩa | `dist/lexicon.json` | vocab-img-scene |
| `scripts/vocab-img/icons-lex.mjs` – icon theo nghĩa (tầng icon) | `dist/lexicon.json` | vocab-img |
| `scripts/vocab-img/wiki.mjs` – ảnh Wikimedia theo nghĩa | `dist/lexicon.json` | vocab-img |
| `scripts/lexicon/expand/job.mjs` – tập vi của kho hiện có = danh sách kiểm vi do AI lấp (cùng Viet74K) | bỏ qua: chỉ đọc nghĩa vi để kiểm chính tả/từ có thật; không ghi/xuất kho | — |
| **CÒN THIẾU** srs-topics | bộ chủ đề SRS/Từ vựng trong app (IELTS_DATA.TOPICS) chưa có bộ xw-*: từ mở rộng tra được (mảnh) nhưng chưa vào danh sách bộ học – cần bộ tải lười JSON từ mảnh (không thêm vào web/js, ngân sách 19 MB) | — |
