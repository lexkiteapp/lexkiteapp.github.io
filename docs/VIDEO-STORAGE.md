# Lưu trữ short theo công thức (recipe-first) – $0, mở rộng tới 100k clip

> TL;DR: Lưu trữ short theo công thức (recipe-first) $0, mở rộng tới 100k clip: nơi lưu, luồng, dựng lại từ công thức, di trú repo cũ. Duyệt 22/10/2026.
> Đọc khi: lưu/dựng lại short.

Duyệt 22/10/2026. Liên quan: `docs/SHORTS-ACCESS.md` (thư viện quản trị), `docs/YOUTUBE-SETUP.md`, `docs/VIDEO-SCALE-PLAN.md`.

## 1. Ở đâu

| Thứ | Nơi | Ghi chú |
|---|---|---|
| Công thức `recipes/<cảnh>/<bài>/<clip>.recipe.json` (~3–5 KB) | repo riêng `lexkite-shorts` | kịch bản + dòng TTS, điểm học, mẫu, nền (kể cả nền đổi khi thử lại), kế hoạch shot, clip người dẫn, giọng/tốc độ + phiên bản công cụ, seed, `pipeline.sha` (repo web), `footage.sha` (lexkite-footage), `recipe_id` = sha256 phần `inputs` chuẩn hoá |
| Manifest `shorts/index.json`, `meta.json`, `qa.log`, `timeline.json` | `lexkite-shorts` | nhỏ; `.gitignore` chặn `*.mp4 *.jpg *.webp *.wav` |
| Master mp4 + bìa jpg | Kho Drive riêng (`functions/api/drive.js`) | API xếp chỗ của kho (Drive dùng ít nhất trước, ≥ 90 % ngừng nhận) – không gán cứng Drive nào; Drive mới tự được dùng |
| Bản web nhỏ (720p ~2,5 MB) | R2 `lexkite-blog-media` prefix `video/` (top ~3.000 clip theo lượt xem) → dự phòng GitHub Release qua `media.lexkite.com/video/` | **22/10: R2 chưa bật** (token Cloudflare cục bộ không có quyền R2, chưa có secret `R2_*`) → vẫn Release. Bật: thêm secret `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` + bỏ `#` binding `BLOG_MEDIA` trong `workers/media/wrangler.toml` |
| YouTube | kênh Lexkite (chỉ clip chủ duyệt) | `docs/YOUTUBE-SETUP.md` |

## 2. Luồng

1. `cine-render.yml` → `store_shorts.py` (meta + công thức) → `archive_new.sh` = `drive-shorts.mjs` tải master + bìa lên kho ngay (dedupe sha, tiếp tục được)
   → commit chỉ file nhỏ. Kho lỗi → media của lượt đó tạm vào git (không mất), `shorts-migrate` dọn sau.
2. `drive-shorts.yml` (sau mỗi cine-render + 04:23 UTC): bù tải nếu thiếu → **luật kho** `scripts/video/shorts-archive.mjs` → manifest quản trị lên kho.
3. Luật kho (giữ dung lượng):
   - clip **đã duyệt / đã đăng / trong hàng chờ YouTube** (`content/video/web/approved.json`, `/api/youtube` op `ids`, `youtube_id`) → master + bìa **2 bản trên 2 Drive khác nhau** (`set_want 2` → `repair` chép phía máy chủ);
   - clip **chưa duyệt / mẫu thử** → 1 bản; quá **30 ngày** → `retire` (thùng rác Google, Google xoá hẳn sau 30 ngày nữa); công thức + bìa + manifest giữ nguyên, thư viện ghi "dựng lại từ công thức";
   - **cân bằng**: kế hoạch `rebalance` (chênh > 10 %, ví dụ khi nối Drive mới) → áp dụng theo lô ≤ 10 file/≤ 1 GB mỗi lượt, nghỉ 4 s, tối đa 10 lượt/ngày; phần còn lại chạy tiếp lần sau (kế hoạch tính lại từ sổ kho = tiếp tục được).
4. Thẻ Drive trong Quản trị → Kho Drive: phần dung lượng shorts trên mỗi Drive + "còn chứa ≈ N clip" (≈ 10 MB/master, tới ngưỡng 90 %).

## 3. Dựng lại từ công thức

`shorts-rebuild.yml` (ô `ids`): lấy công thức → checkout `pipeline.sha` (worktree) + footage `footage.sha` → `rebuild_from_recipe.py`
(news_voice → news.py, `NEWS_BG` = nền trong công thức) → so với master (kho Drive, dự phòng lịch sử git): **trùng byte** hoặc **SSIM ≥ 0,99**
cùng số khung. 0 credit (không Kling, không AI judge/vision gate). Clip cảnh cũ (lesson5, trước bản tin) chỉ có công thức "legacy" = meta.

## 4. Di trú repo cũ (2,8 GB, 124 short)

`shorts-migrate.yml` (mặc định `dry_run`): báo cáo dung lượng → mọi mp4/bìa lên kho → công thức legacy → (`dry_run: false`) `git rm --cached` mọi
media đã kiểm sha trên kho + `.gitignore` → push. **Không viết lại lịch sử.** Purge lịch sử (chủ quyết, mất khả năng lấy master từ git):
`git clone --mirror … && git filter-repo --invert-paths --path-glob '*.mp4' --path-glob '*.jpg' && git push --force --mirror`.

## 5. Web

`web/js/lesson-video.js`: có `youtube_id` → mặt tiền nhẹ (poster; bấm mới nạp IFrame API + iframe `youtube-nocookie` rel=0, playsinline,
modestbranding; `ended` → câu đố EN). YouTube không sẵn sàng trong 4 s / lỗi / vùng chặn (múi giờ Trung Quốc, giao diện zh + máy zh-CN) → bản tự
lưu trữ. Không có `youtube_id` → bản tự lưu trữ. Đo `yt_fallback` qua `/api/hit`.

Kiểm thử: `node scripts/test/shorts-scale.mjs` (công thức tất định, schema manifest, hàng chờ YouTube giả lập, tải resumable, luật kho, sức chứa, mặt tiền jsdom).
