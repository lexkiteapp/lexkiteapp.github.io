# JOBS – sổ việc nền & điều phối (sinh từ infra/jobs.json — KHÔNG sửa tay)

Nguồn duy nhất: `infra/jobs.json`. Sinh lại: `node scripts/jobs/gen.mjs --write`. CI (`npm test` → `scripts/test/jobs-check.mjs`) chặn: lịch lệch workflow, trùng, việc dùng chung tài nguyên ĐỘC QUYỀN chồng giờ, việc nặng chung phút bắt đầu, việc có lease thiếu bước thuê.

## Luật
- **Ưu tiên**: user > publishing > render > archive > reports. Hạn mức D1 hôm nay còn lại quyết định việc nào được khởi động: trần dùng user 100% · publishing 70% · render 60% · archive 50% · reports 40% (vượt → bỏ qua tới khung kế, ghi lý do).
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
- `workers_ai` — Workers AI (neuron) (độc quyền)
- `gh_minutes` — Phút GitHub Actions

## Lịch (UTC, theo giờ trong ngày)
| Giờ UTC | Việc | Lịch cron | Ưu tiên | Tài nguyên | Phút | Ước lượng | Thuê |
|---|---|---|---|---|---|---|---|
| 00:00 | `health` | `0 0 * * *` | reports | gh_minutes | 45 | d1_main_reads≈20000 | — |
| 00:07 | `blog-publish` | `7 * * * *` | publishing | gh_minutes | 10 | — | — |
| 00:07 | `youtube-manual` | `7,37 * * * *` | publishing | youtube_api, d1_main_read | 5 | d1_main_reads≈300 | — |
| 00:12 | `ci-triage` | `12 * * * *` | reports | gh_minutes | 5 | d1_internal_reads≈10 | — |
| 00:50 | `script-bank` | `50 0 * * *` | render | workers_ai, gh_minutes | 60 | workers_ai_neurons≈4000 | — |
| 01:00 | `lighthouse` | `0 1 * * 1` | reports | gh_minutes | 15 | — | — |
| 01:00 | `mail-digest` | `0 1 * * *` | reports | d1_main_read | 2 | d1_main_reads≈3000 | — |
| 01:15 | `youtube-upload` | `15 1,8,14,20 * * *` | publishing | youtube_api, drive_pool, d1_internal | 20 | d1_internal_reads≈200, d1_main_reads≈100, drive_calls≈60 | ✓ |
| 01:30 | `pr-check` | `30 1 * * *` | publishing | gh_minutes | 10 | — | — |
| 01:30 | `screens` | `30 1 * * *` | render | gh_minutes | 25 | — | — |
| 01:45 | `footage-archive` | `45 1 * * *` | archive | drive_pool, d1_internal, gh_minutes | 150 | d1_internal_reads≈150000, drive_calls≈6000 | ✓ |
| 01:50 | `contrast` | `50 1 * * *` | reports | gh_minutes | 15 | — | — |
| 02:10 | `nav-render` | `10 2 * * *` | render | gh_minutes | 20 | — | — |
| 02:17 | `content-protect` | `17 2 * * 0` | reports | gh_minutes | 10 | — | — |
| 02:30 | `i18n` | `30 2 * * *` | render | gemini, gh_minutes | 90 | — | — |
| 03:20 | `visual-qa` | `20 3 * * 1` | reports | gh_minutes | 30 | — | — |
| 03:41 | `storage-watch` | `41 3 * * 1` | reports | gh_minutes | 5 | d1_internal_reads≈10 | ✓ |
| 04:23 | `drive-shorts` | `23 4 * * *` | archive | drive_pool, d1_internal | 20 | d1_internal_reads≈20000, drive_calls≈1500 | ✓ |
| 04:47 | `video-web` | `47 4 * * *` | render | gh_minutes, drive_pool, d1_internal | 40 | d1_internal_reads≈300, drive_calls≈100 | ✓ |
| 05:30 | `d1b-migrate` | `30 5 * * *` | archive | d1_internal, d1_main_read, drive_pool | 45 | d1_main_reads≈40000, d1_internal_reads≈2000 | ✓ |
| 06:20 | `footage-verify` | `20 6 * * 1` | reports | drive_pool, d1_internal | 20 | d1_internal_reads≈8000, drive_calls≈300 | ✓ |
| 07:30 | `explain` | `30 7 * * *` | render | gemini, gh_minutes | 40 | — | — |
| 18:00 | `word-audio` | `0 18 * * *` | render | gh_minutes | 60 | — | — |
| 19:00 | `audio` | `0 19 * * *` | render | gh_minutes | 60 | — | — |
| 20:30 | `word-packs` | `30 20 * * *` | render | gh_minutes, gemini | 45 | — | — |
| 21:00 | `wordlists` | `0 21 * * *` | render | gh_minutes | 20 | — | — |
| 21:30 | `lexicon-i18n` | `30 21 * * *` | render | gemini, gh_minutes | 60 | — | — |
| 22:00 | `i18n-leak` | `0 22 * * *` | reports | gh_minutes | 20 | — | — |
| 23:17 | `video-auto` | `17 23 * * *` | render | gh_minutes, workers_ai | 90 | — | — |
| 23:30 | `blog-daily` | `30 23 * * *` | publishing | gemini, gh_minutes | 30 | — | — |

Sau mốc reset 00:00 UTC (hạn mức D1 miễn phí làm mới), thứ tự: việc nền "đăng bài" trước, rồi dựng, lưu trữ (footage-archive 01:45 → drive-shorts → d1b-migrate 05:30), báo cáo.
