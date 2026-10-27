# DISTRIBUTION – kênh & phân phối (nhúng + social), 22/10/2026

> TL;DR: Kênh & phân phối (nhúng + social): vai trò kênh, định tuyến, hợp đồng cho tác tử social (GrabCast), hệ thống web/app. Admin › Kênh & phân phối, /api/distribution.
> Đọc khi: sửa phân phối/social.

Quản trị › **🛰️ Kênh & phân phối** (`web/js/admin-dist.js`, mô hình luật `web/js/lib/dist-rules.js`) → `POST /api/distribution` (`functions/api/distribution.js`, adminGate, nhật ký `dist.*`, 120 lượt/phút).
Bộ máy thuần: `functions/api/_distribution.js` (định tuyến, lịch) + `functions/api/_role_meta.js` (metadata theo vai trò). Test: `scripts/test/distribution.mjs`, `scripts/test/dist-roles.mjs`, `scripts/test/api-security.mjs`.

## 1. Vai trò kênh
| Vai trò | Kênh | Riêng tư | Metadata | Dùng cho |
|---|---|---|---|---|
| **embed** | chỉ YouTube (OAuth của mình) | unlisted | `embedMeta`: ổn định, tối giản (`<keyword> – English lesson \| Lexkite`, 1 dòng + link bài + `lk:<clip>`), không hashtag | bài học web/app nhúng – **chỉ id từ kênh embed** (`youtube.js` op `ids`) |
| **social** | YouTube công khai + FB/IG/TikTok/Threads (GrabCast) | public | `socialMeta(clip, platform)`: tiêu đề hook ≤ 60 từ khoá đứng đầu, mô tả dòng 1 hook + dòng 2 giá trị + dòng 3 link bài (utm), 3–5 hashtag, tag, 3 tiêu đề A/B, điểm SEO /100 | tăng trưởng |

Một clip đã duyệt → **1 gói nhúng** (`yt_plan`, gói Studio `yt-pack.mjs` dùng `roleMeta`) **+ tối đa 1 bài social mỗi nền tảng** (`dist_social`).
Kênh chưa đặt vai trò = `social` → bài học dùng bản tự lưu trữ cho tới khi anh đặt 1 kênh YouTube là **Nhúng** (Hệ thống › Kênh nhúng).

## 2. Định tuyến
Luật có thứ tự (`yt_rules.pos`), **mỗi nền tảng nhận luật khớp đầu tiên** (`routeAll`); kênh dự phòng chỉ cho YouTube. Điều kiện: type, topic (hoặc `topic/sub`), skill, cefr, exam, region, template, scene.
Cài đặt kênh (`normCfg`): label, role, types, topics, skills, cefr, regions, daily_cap, min_gap_min, windows, tz, active. `test_clip {clip | sample, rules?}` → vết từng luật (`win · no-match:<đk> · blocked:<cài đặt> · shadowed · off`).

## 3. Hợp đồng cho tác tử social (GrabCast) – KHÔNG sửa file của nhau
Tác tử social (`web/js/admin-social.js`, `functions/api/social.js`) gọi `/api/distribution` (cùng token quản trị):
1. `ext_sync {accounts: [{platform, id, name, avatar?, status?}]}` – đẩy bản sao tài khoản GrabCast. platform ∈ `youtube|tiktok|instagram|facebook_page|threads` (`facebook` → `facebook_page`). Id kênh = `gc-<platform>-<id>`; tài khoản biến mất → `status='gone'`. Kênh `gc-*` luôn vai trò social.
2. `plan_run {replan?}` – xếp lịch (YouTube → `yt_plan`, social → `dist_social`), tôn trọng hạn mức/ngày, giãn cách, khung giờ theo múi giờ kênh, jitter, chống trùng tiêu đề/bìa.
3. `social_due {from?, to?, channel_id?}` (ms) → `{rows: [{clip, channel_id, platform, account_id, slot_ms, at, source, state, meta}]}`; `meta` = `socialMeta` (title, variants, description, hashtags, tags, seo).
4. Đẩy lên GrabCast qua cổng duyệt của tác tử social, rồi `social_ack {clip, channel_id, state: pushed|published|failed|cancelled, post_id?, err?}`.
5. Ghi đè tay: `plan_set {ids, channel_id, slot}` (kênh `gc-*` bắt buộc có `slot`). Xem lịch: `plan_get {channel_id?, days?}` (gộp YouTube + social).
Pure import được phép: `normCfg`, `allowed`, `schedule`, `routeAll`, `platformOf` (`_distribution.js`), `socialMeta`, `seoScore` (`_role_meta.js`) – giữ chữ ký ổn định.

## 4. Hệ thống (web/app)
Nhiều kênh embed: bài học mới xoay vòng giữa các kênh embed đang hoạt động & ổn (`pickEmbed`: ít tải nhất hôm nay → tổng → hash id; clip đã có plan/video thì giữ nguyên kênh); kênh hỏng/tạm dừng bị bỏ qua, bài của nó phát bản tự lưu trữ.

`embed_status` → kênh nhúng, hàng **Sẵn sàng cho bài học** (gói đang tạo/sẵn sàng), trạng thái nhúng từng bài, **video hỏng/riêng tư/xóa/sai kênh** (`why`) → web-rendition bỏ `youtube_id` ⇒ bài học phát bản tự lưu trữ, bản đồ phủ chủ đề × CEFR. "Kiểm tra ngay" = `youtube` op `sync` (kênh đã chọn).
Mặt tiền (`web/js/lesson-video.js`): chỉ poster WebP của mình, 0 byte YouTube trước khi bấm; rê/focus/gần khung nhìn → preconnect; bấm → `<iframe loading=lazy>` youtube-nocookie (playsinline, rel=0) + IFrame API; `ended` → câu đố; lỗi / > 4 s / vùng chặn → tự lưu trữ.
Kiểm: `scripts/test/facade-perf.mjs` + `scripts/test/admin-dist-shots.mjs` (`.github/workflows/dist-ui.yml`), app gốc: `scripts/test/native-facade.js` (ios-e2e.yml → `facade.json`; android.yml APK kiểm thử → logcat `E2E-VF`).

## 5. Thư viện
Loại Shorts / Video dài / Podcast ở đầu lưới; lọc chủ đề › chủ đề con, kỹ năng, CEFR, kỳ thi. "Kênh mặc định" (Chọn kênh YouTube) lọc gói đăng + đồng bộ chỉ kênh đó. Thao tác "Đổi kênh" ghi `yt_plan` (tay).
**Xóa hẳn** = DANGER (đăng nhập ≤ 15 phút) + gõ `DELETE <n>` → `clip_review.deleted = 2`, bỏ khỏi hàng đợi/kế hoạch → `drive-shorts.yml` (`shorts-archive.mjs`) cho master + bìa vào thùng rác Drive, bỏ công thức khỏi `lexkite-shorts` → `youtube` op `purged` (`deleted = 3`).

## 6. Autopilot social (chạy nền, 27/10/2026)
Cron `.github/workflows/social-auto.yml` (mỗi 2 giờ, `52 */2 * * *`, `infra/jobs.json` id `social-auto`) → `scripts/social/auto.mjs` ký HMAC (`LEXKITE_DRIVE_CLI_KEY`) → `POST /api/social-auto {op: run|status}` (`functions/api/social-auto.js`). Logic: `functions/api/_social_auto.js`. Khóa GrabCast chỉ ở Pages (`GRABCAST_API_KEY`), Actions không có.
1. ≥ `sync_h` (6) giờ/lần: `GET accounts` → `ext_sync`, `GET posts` → `boardSync` → bài autopilot đã đăng ⇒ `dist_social.state = published`. Webhook ký HMAC `/api/social/webhook` (`GRABCAST_WEBHOOK_SECRET`) làm việc này ngay khi GrabCast mở.
2. `social_due` cửa sổ [now + 20 phút, now + 30 giờ], chỉ nền tảng bật (mặc định **FB + IG**; TikTok/YouTube tắt tới khi GrabCast được TikTok/Google duyệt app), ≤ 3 bài/lượt.
3. Mỗi bài: `pushClip` (cache `media:<clip>`) → `POST posts` NHÁP (Idempotency-Key `lkap-c-<sha(clip|kênh)>`) → `soc_board` id cố định `b_ap…`, cột **Chờ duyệt**, `want_at = slot` → `social_ack pushed`. Bài tay đã có cho clip × tài khoản → không tạo trùng.
4. **Luật duyệt**: công tắc **Tự động duyệt** (mặc định TẮT) + đủ `manual_first` (5) bài duyệt TAY trên nền tảng đó ⇒ `GET` bài → dấu băm → `schedule(scheduled_at = slot)` (`lkap-s-…`), `approved_by = autopilot`; GrabCast tự đăng lúc tới giờ. Không đủ ⇒ owner duyệt ở kanban (board/approve lên lịch đúng slot).
5. **An toàn tải**: ≤ `daily_calls` (60) lượt GrabCast/ngày (đếm ở `soc_meta auto_state`), < 3 lượt còn lại → không chạy; 401/403 (12 giờ) · 409/422 (3 giờ) · 429/503 (2 giờ) · 5xx/timeout (1 giờ) = dừng CẢ lượt + cầu dao ở D1, không thử lại; 1 bài lỗi thường 2 lượt → bỏ qua tới khi bấm **Mở lại**. Cầu dao D1 `_d1guard` (≥ 50 %) → bỏ lượt. Truy vấn theo chỉ mục `dist_social_slot`, `soc_board_clip`, `soc_board_state` (EXPLAIN trong test).
6. Quản trị › Video & Social › **Hàng đợi** › thẻ 🛰️ Autopilot: lần chạy cuối, lỗi/cầu dao, ngân sách còn, bài sắp đăng 72 giờ, công tắc (kill switch, tự duyệt, N, nền tảng), Chạy ngay (`lk/auto`, `lk/auto/save|run|reset`). `plan_daily` (mặc định tắt) = tự chạy `plan_run` 1 lần/ngày.
Test: `scripts/test/social-auto.mjs`.

## 6b. Dự phòng Meta Graph API khi GrabCast lỗi (27/10/2026)
GrabCast sập 2 lần (12/10, 24/10: Neon DB hết) → FB/IG có đường thứ hai, đăng thẳng lên **Page Lexkite + IG Business đã liên kết của chính owner**. Logic: `functions/api/_meta.js` (client Graph, token chỉ ở header, scrub) + `_social_auto.js` (provider, khóa, lượt Meta). Test: `scripts/test/social-meta.mjs`.
- **Provider** (`cfg.provider`: `auto` mặc định · `grabcast` · `meta`, nút 🔀 ở thẻ Autopilot). `auto` chuyển FB/IG sang Meta khi: không có khóa GrabCast; cầu dao 401/403/429/503 (gồm `db_budget_guard`); 5xx/timeout lặp ≥ 2 lượt; hoặc **trễ** – bài đã lên lịch trên GrabCast quá slot + 30 phút, `GET posts/{id}` vẫn chưa published. Lỗi xảy ra giữa lượt → chuyển Meta ngay trong lượt đó. Hồi phục chỉ khi một lượt GrabCast chạy trọn → tự quay về `grabcast`. 409/422 (lỗi nội dung) không failover.
- **Chống trùng**: bảng D1 `soc_lock` (PK clip + kênh; `once('soc-lock', 1)`): provider, state `claimed|scheduled|posted|skipped`, `meta_id`, `container`, `permalink`, `gc_post`, `gc_cancel`. Trước khi đăng Meta: `GET posts/{id}` (đã published → chỉ đánh dấu, không đăng) → `unschedule` + `cancel` trên GrabCast. Không gọi được GrabCast mà bài đang **scheduled** ở đó → chỉ cứu sau slot + 30 phút, ghi `gc_cancel = pending`; GrabCast hồi phục → lượt GrabCast hủy bài treo (≤ 3/lượt, chỉ mục `soc_lock_cancel`), nếu GrabCast lỡ đăng rồi → cảnh báo `dup-published`. Lượt chết sau bước start của Reel → lượt sau GET video đó, không tạo video thứ 2. Kết quả: `dist_social.post_id = meta_fb_<id>|meta_ig_<id>`, `soc_board.links[].v = 'meta'` + permalink (`post_id` GrabCast bỏ khỏi soc_board để boardSync không ghi đè), `soc_lock.permalink`.
- **Duyệt giữ nguyên**: Meta chỉ đăng bài đã duyệt (tay, hoặc tự duyệt đủ `manual_first`). Bài chưa có trên GrabCast → soc_board `review`/`approved` note `meta`; owner bấm **Duyệt (Meta)** ở bảng Sắp đăng (`lk/auto/approve`).
- **FB**: Reels API – `POST /{page}/video_reels start` → `rupload.facebook.com` (`file_url` = URL ký 6 giờ `lexkite.com/api/admin-shorts`) → `finish` `PUBLISHED`, hoặc `SCHEDULED` + `scheduled_publish_time = slot` khi slot ≥ now + 15 phút. Meta chỉ nhận slot ≤ 6 giờ tới (`META_AHEAD_H`) để GrabCast hồi phục kịp giữ phần còn lại; quá 12 giờ sau slot → bỏ.
- **IG**: container `REELS` ≤ 3 giờ trước slot → `status_code` (IN_PROGRESS chờ lượt sau · FINISHED · ERROR ghi lỗi + tạo lại, 2 lần → bỏ · EXPIRED tạo lại) → `media_publish` khi now ≥ slot − 60 phút. Trước khi publish đọc `content_publishing_limit` (Meta hiện cho **100**/24 giờ – tài liệu 27/10/2026; Lexkite tự giới hạn **25**).
- **Ngân sách**: ≤ `meta_daily` (80) lượt Graph/ngày, ≤ `max_per_run` bài/lượt, token kiểm ≤ 1 lần/ngày (`debug_token`). Lỗi Graph 190/102 (token) hoặc 10/2xx (quyền) → dừng Meta 12 giờ; 4/17/32/613 (giới hạn) 2 giờ; 5xx 1 giờ.
- **Cảnh báo**: máy chủ trả `run.alerts` (failover 1 lần/đợt, token sắp hết/bị thu hồi/thiếu quyền mỗi 3 ngày, hồi phục, đăng trùng) → `scripts/social/auto.mjs` mở **1 issue nhãn `social-alert`** (GitHub email người theo dõi), trùng tiêu đề đang mở → bình luận.
- **Token & app Meta** (owner, 1 lần): app **Business** ở chế độ **Development**, owner là **admin** của app ⇒ Standard Access cho `pages_show_list, pages_read_engagement, pages_manage_posts, instagram_basic, instagram_content_publish` – **không cần App Review** khi chỉ đăng lên Page/IG của người có vai trò trên app (developers.facebook.com/docs/graph-api/overview/access-levels, kiểm 27/10/2026). Graph Explorer → user token có các quyền trên → đổi sang user token dài hạn (`oauth/access_token?grant_type=fb_exchange_token`) → `GET /me/accounts` lấy **Page token** (từ user token dài hạn ⇒ `expires_at = 0`, không hết hạn; mất hiệu lực khi đổi mật khẩu/gỡ quyền; `data_access_expires_at` 90 ngày được gia hạn khi owner dùng app). Secret Pages: `META_PAGE_TOKEN`, `META_PAGE_ID`, `META_IG_ID` (`GET /{page}?fields=instagram_business_account`). Thay token xong → **Mở lại** để kiểm token ngay.
- **TikTok / YouTube công khai vẫn chỉ qua GrabCast**: API trực tiếp cần audit của nền tảng (TikTok Content Posting audit – chưa audit chỉ đăng SELF_ONLY; YouTube Data API upload công khai cần API audit/verification) ⇒ không có đường dự phòng, GrabCast lỗi thì 2 nền tảng này chờ.
