# Tự đăng video: kho Teach2D → kho shorts → YouTube / nhúng bài học / social (spec 1 trang, 05/11/2026)

> TL;DR: Mọi mảnh đăng bài đã có (khối `publish` viết lúc sản xuất #679, autopilot GrabCast ws4 #587→#704, nhúng facade + đồng bộ `lk:<clip>`, Gói chờ đăng tay). Thiếu **cầu nối**: clip Teach2D đạt QC chỉ nằm ở artifact CI 90 ngày + `content/video/teach2d/bank.json`, không vào `lexkite-shorts/shorts/index.json` nên autopilot/YouTube/nhúng không thấy. Spec này nối cầu, siết cổng (≥ 90 + chủ đề/CEFR + metadata, không đạt = không đăng + lý do), gộp ngân sách GrabCast < 3000/ngày, giờ vàng theo múi giờ kênh, và đo viral. $0, không lách ToS.
> Đọc khi: sửa đường clip → đăng (Teach2D, autopilot, nhúng, YouTube).

## 1. Khe hở (đã kiểm 05/11)
| # | Khe hở | Hậu quả |
|---|---|---|
| G1 | `bank.py` chỉ ghi `bank.json` + artifact `tv-bank-<run>` (90 ngày); không đẩy `lexkite-shorts`, không Drive | 0 clip Teach2D tới được autopilot/YouTube/bài học; hết 90 ngày là mất |
| G2 | `auto_queue` (`_social_auto.js`) chỉ đòi `qa.status = pass` + có tiêu đề | không có điểm ≥ 90, chủ đề/CEFR, wpm, khối `publish` hợp lệ; không ghi lý do khi loại |
| G3 | Không có bản đồ clip → bài học (khu vực app + từ khoá + CEFR) | nhúng phải gắn tay |
| G4 | Ngân sách GrabCast: autopilot đếm `daily_calls` (60) riêng; lượt từ quản trị (proxy `social.js`, kéo kênh, xem trước) đếm chỗ khác/không đếm | tổng có thể vượt giới hạn khoá 3000/ngày mà không ai thấy |
| G5 | Khung giờ mặc định 09–21 chung (`DEFAULT_CFG.windows`) | không phải giờ vàng từng nền tảng |
| G6 | Chưa đo retention/CTR; A/B tiêu đề chỉ sinh 3 biến thể, không chọn theo số liệu | không biết clip nào viral để làm thêm |

## 2. Thiết kế
1. **Cổng tự đăng** `scripts/video/teach2d/autopub_gate.py` (thuần, test): vào = mục bank + `eps/<id>.json` + `qc.json` short/wide → `{ok, why[]}`. Mã lý do: `qc<90:short|wide`, `gate:<tên>`, `lang≠en`, `teacher∉{ama,carlos}`, `wpm>150`, `publish:<lỗi publish.py check>`, `topic` (keyword không có trong tiêu đề/kịch bản, hoặc `cta.link` không phải route có thật trong `web/app` cho `area`), `cefr` (thiếu, hoặc lệch CEFR của mục từ/bài đích), `dup` (trùng sha/tiêu đề với clip đã đăng). Loại → `bank.json eps[id].publish_block = why` + bảng `content/video/teach2d/PUBLISH.md`; KHÔNG bao giờ đăng.
2. **Gửi kho** (bước mới trong job `sheet` của `teach-video.yml`, chỉ `main` + dispatch, `SHORTS_DEPLOY_KEY`, idempotent theo sha): clip qua cổng → `lexkite-shorts/shorts/teach2d/<ep>/` (`<ep>.mp4` 9:16, `<ep>-wide.mp4` 16:9, poster, `.vtt`, `meta.json`) → `shorts_index.py` thêm `scene: teach2d`, `qa {status, score: min(short, wide), gates}`, `publish` (khối #679 nguyên văn), `area`, `cefr`, `lang: en`, `lesson` (route `cta.link`). `drive-shorts.yml` đã chạy sau mỗi lần index đổi → 2 bản sao Drive. Hết phụ thuộc artifact 90 ngày.
3. **Autopilot** (`_social_auto.js`, chồng #704, không viết lại): `auto_queue` thêm điều kiện `qa.score ≥ 90` (khi có điểm) + có `publish`; clip bị chặn ghi `clip_review.why`, hiện ở thẻ 🛰️ Autopilot. `socialMeta` ưu tiên `publish.platforms.<nền tảng>` (viết lúc sản xuất) trước mẫu ghép. Đích chỉ ws4: FB "Lexkite.com", IG/TikTok "lexkitecom"; `foreignAccount`/`pausedAccount` giữ nguyên (Grabcast.click không bao giờ là đích). Bài đầu mỗi nền tảng chờ chủ duyệt 1 lần (`manual_first = 1`, đã có).
4. **Giờ vàng**: kênh chưa được chủ chỉnh `windows` → mặc định theo nền tảng, giờ địa phương của `tz` kênh: TikTok 18:00–22:00 · IG 11:00–13:00 + 19:00–21:00 · FB 12:00–14:00 + 19:00–21:00 · YouTube Shorts 14:00–16:00 + 19:00–21:00. Sau ≥ 20 bài/nền tảng: dời khung theo giờ có CTR/retention cao nhất (mục 6).
5. **Một ngân sách GrabCast**: bộ đếm D1 duy nhất `gc_budget(day UTC, n)` tăng ở MỌI lượt gọi khoá (autopilot + proxy quản trị + đồng bộ kênh + xem trước nếu có gọi); trần cứng 2700/ngày (chừa 10 % của 3000), autopilot vẫn tự giới hạn `daily_calls`; còn < 50 → quản trị chỉ đọc, báo băng vàng. Test: tổng 2 nguồn không vượt trần.
6. **Viral + đo**: cổng `hook` siết cho bản social: chữ hook có ở khung 0, lời hook xong ≤ 2,0 s (hiện 2,2 s) – không nới bản dạy; phụ đề cháy đã có (short); thumbnail/poster theo `brand/social/channel-kit` (ảnh bìa = khung hook + tiêu đề ≤ 5 từ, kiểm tương phản); A/B: 3 biến thể tiêu đề (`socialMeta.variants`) xoay theo nền tảng/ngày, số liệu về `clip_stats` (YouTube Analytics `yt-analytics.readonly` trên kênh của mình khi đã nối; FB/IG insights qua token Meta riêng đã có; TikTok chờ – `insights` GrabCast bị chặn với khoá API). Báo cáo tuần: retention 3 s, % xem hết, CTR bìa, thắng/thua A/B.
7. **YouTube**: đường chính = GrabCast (đang chờ Compliance Review của họ) → tự bật `yt_gc_auto`. Trong lúc chờ: Gói chờ đăng tay ≤ 3 phút/ngày (có sẵn). API trực tiếp chỉ sau audit (`docs/YOUTUBE-AUDIT.md`: chủ chỉ bấm nộp + quay demo 2–3 phút theo kịch bản §3). Upload-Post gói free (10 tải/tháng, cần chủ tạo tài khoản): dùng được làm cầu tạm hợp lệ cho ≤ 10 clip/tháng; đánh giá ToS/điều khoản dữ liệu trước khi nối, không dùng để lách giới hạn. Nhúng bài học: video unlisted/public trên kênh embed khớp `lk:<clip>` → `youtube` op `sync` gắn `youtube_id` vào bài; chưa có id → bài phát bản tự lưu trữ (facade, đã có).

## 3. Task
- [ ] `autopub_gate.py` + test hồi quy (mỗi mã lý do: 1 ca đỏ, 1 ca xanh)
- [ ] bước gửi kho trong `teach-video.yml` (concurrency/paths/timeout giữ nguyên; không workflow_run mới) + `shorts_index.py` scene `teach2d`
- [ ] `_social_auto.js` auto_queue điều kiện điểm + `publish`; `socialMeta` ưu tiên khối `publish`; test
- [ ] `gc_budget` chung + trần 2700; test
- [ ] giờ vàng mặc định theo nền tảng; test `schedule`
- [ ] hook ≤ 2,0 s bản social, bìa channel-kit, `clip_stats` + báo cáo tuần
- Chủ bấm: nộp form audit YouTube (hồ sơ sẵn), tạo tài khoản Upload-Post nếu đồng ý, duyệt bài đầu mỗi nền tảng.
