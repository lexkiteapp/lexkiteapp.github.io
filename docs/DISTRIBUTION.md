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
