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
   - clip **chưa duyệt / tạm dừng** → 1 bản, giữ nguyên (từ 04/11/2026 không tự xóa); clip **bị loại** quá **30 ngày** → `retire`, và chỉ khi đọc được danh sách đã duyệt không rỗng (thùng rác Google, Google xoá hẳn sau 30 ngày nữa); công thức + bìa + manifest giữ nguyên, thư viện ghi "dựng lại từ công thức";
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

**Video nhúng bài học (28/10, cờ `lv_embed`, thử `?lvembed=1&vtest=1`):** `/data/videos.json` mảng `embeds[]` (tách `items` → trang /video/, sitemap
không đổi; schema `validateEmbeds`) – mỗi mục có `renditions.sq45` (1080×1350) + `wide` (1920×1080) = mp4 + bìa JPG + `en.vtt` + `chapters.vtt`
từ workflow video-motion (docs/VIDEO-MOTION.md §Embedded). `LessonVideo.embed()` chỉ chạy khi bước video của nút "Bài học" mở: 4:5 trên điện thoại,
16:9 khi ≥ 900 px ngang; `<track>` phụ đề EN + chương (nút tua), `ended` → bài bấm chính nút Tiếp tục. Mẫu hiện là `test: true`, file CHƯA tải lên
R2/YouTube (chờ chủ OK). Gác: `lesson-embed.yml` (fixture = artifact `motion-<t>-embed-*`, `scripts/test/lesson-embed-e2e.mjs`).

Kiểm thử: `node scripts/test/shorts-scale.mjs` (công thức tất định, schema manifest, hàng chờ YouTube giả lập, tải resumable, luật kho, sức chứa, mặt tiền jsdom).

## 6. Dọn video rác (5/11) – manifest → cách ly → xoá có chứng minh

`scripts/video/junk.py` (Python stdlib + ffprobe, 1 tiến trình, băm theo nhóm dung lượng – nhẹ cho Mac). Mọi lệnh mặc định dry-run, cần `--apply`.
- `scan --root <thư viện> --out m.json`: `broken` (ffprobe hỏng / 0 khung / 0 byte) · `dup-sha` (giữ bản cũ nhất/được tham chiếu nhiều nhất) · `failed-qc` (qc*.json `ok=false`/`score<90`, thư mục rejected/red) · `unreferenced` (grep content/docs/scripts/web/infra không thấy). In GB theo lý do.
- **Không bao giờ là rác**: footage Mei/Kai/Daniel, thư mục bank/nguồn (`green`, `bg`, `chars`, `clips`…), cache render có khoá băm (`render5_shots/`, `*_cache/` – tên file không bao giờ nằm trong repo), mục trong `archive-manifest.json` và sổ đăng ký (`characters.json`, `library*.json`, `bank*.json`) – luật no-cuts.
- `quarantine --manifest m.json --to <thư mục cùng ổ>` → `<to>/<ngày>/<đường dẫn gốc>` + `restore.json`; `restore --quarantine <to>` trả lại.
- `purge --quarantine <to> --min-days 7`: chỉ xoá mục ≥ 7 ngày, grep mới vẫn không tham chiếu, và (sha có bản sao lưu: manifest/`--backup-shas` như `shorts/index.json` · HOẶC broken/dup-sha có bản giữ đã kiểm sha). Ghi `purge-log.json` (byte giải phóng).
- Artifact Actions: `scripts/video/junk-artifacts.mjs` (lượt hỏng / bị thay bản mới **cùng tên đầy đủ + cùng nhánh** – số giữa tên như `t2`/`t4`, `e2e-100` là bản khác, không gộp / tập đã bỏ; không đụng `tv-bank-*` của lượt thành công trên main); workflow `video-junk.yml` (lịch tuần chỉ liệt kê; `apply=true` chạy tay mới xoá). Test: `scripts/test/video-junk.py`.
