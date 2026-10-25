# VIDEO – nguồn sự thật hiện hành (22/10/2026)

> TL;DR: Nguồn sự thật video hiện hành: chiến lược (NEWS-ANCHOR), look v5, builder scripts/cine/, CI cine-render, lưu trữ, kho footage. Tài liệu video cũ toàn văn ở archive/.
> Đọc khi: mọi việc video.

Tiêu credit → `docs/CREDIT-RULES.md` trước. Tài liệu cũ (toàn văn, giữ số §): `docs/archive/{VIDEO-PIPELINE,VIDEO-SYSTEM-PLAN,CINE-SCENE-STANDARD,KLING-PLAN,LISTENING-CHANNEL-PLAN,VIDEO-CONTENT-PLAN}.md`.

## 1. Chiến lược (chủ chốt)
- **Định dạng CHÍNH = NEWS-ANCHOR**: 2 người dẫn trên phông xanh nói về 1 tình huống, nền ảnh tĩnh theo chủ đề. 0 credit, 0 token mỗi clip khi scale; sinh & dựng trên GitHub Actions.
- **Chỉ tiếng Anh**, 1 bản cho mọi quốc gia (chỉ dịch chú thích bài đăng). **1 ý/clip**, nhiều ý khác nhau; ưu tiên khu vực app chưa có clip, CTA deep link về đúng tính năng trên lexkite.com.
- **Diễn cảnh (scene-acting) TẠM DỪNG** (`gen_lessons.py` từ chối `--batch` khi PAUSED; mở lại `CINE_SCENE_RESUME=1`). **Nhà hàng + Priya bị LOẠI** (nhân vật không kiểu Mỹ + lỗi tư thế). Kho cảnh còn: cafe, airport, hotel (paused).
- Nhân vật/giọng phải cảm giác Mỹ. Kênh luyện nghe dài: để sau (`docs/archive/LISTENING-CHANNEL-PLAN.md`).

## 2. Look news-anchor (v5, chủ duyệt 22/10)
- **Host**: Ama ĐỨNG (clip `ga2_*`) bên TRÁI, Carlos (clip `gc_*`) bên PHẢI – luật 180°, không đổi phía. Ama ×0,81 (khớp mắt–cằm với Carlos). `ga2_react` chỉ dùng khi không nói; không dùng clip `*_explain` dưới thẻ (tay lơ lửng).
- **Khung**: từ ngực trở lên, **neo đáy** (host đi ra khỏi mép dưới khung thật), full frame, **KHÔNG bàn/dải desk**. Two-shot hook/recap; singles xen kẽ (≤ 2 single liền), cắt chỉ ở ranh giới câu, **J-cut** (tiếng vào trước ~0,15 s).
- **Nền**: ảnh tĩnh (không vật chuyển động), parallax 2.5D 3 lớp sâu (`bg3d.py`, Depth-Anything-V2-Small trên CI) + **đẩy vào chậm** 2–4 %/shot + **bokeh nhẹ** sau lưng host. Không dùng lại nền trong 6 bài liên tiếp (`publish_pack` kiểm).
- **Grade**: filmic sáng (mids +, black floor 18, teal/orange), khớp key-light, light wrap, grain 2 %. qa_news LOOK: luma TB 0,42–0,55, p5 ≥ 0,06, không dải đáy phẳng, hue da.
- **Chữ**: caption **≥ 80 px** (1 dòng, karaoke theo mốc từ faster-whisper bám onset Rhubarb), thẻ **≥ 52 px** (mẫu → ✗ → ✓ + lý do), chip ≥ 36 px. Vùng chữ = 1/3 dưới đè lên thân (thẻ y≈1300, caption y≈1536, lower third y≈1657) với scrim mềm. Đặt chữ **né đầu** (mặt + tóc + lề 15 %: `place.py` `HEAD()`); mọi lớp chữ có hộp & bị QA kiểm chồng lấn.
- **Âm thanh**: stem giọng chuẩn **−16 LUFS**; room tone/bed **−40 dB** + SFX trộn SAU loudnorm; nền trong khoảng lặng ≤ −50 dBFS. ffmpeg `-nostdin`, `alimiter level=0`.
- **Nhịp viral**: hook ≤ 5 từ, 1,6–2,0 s (câu hook ngắn đọc ≥ 0,86×), whoosh khung 0 (âm đầu < 0,3 s); mỗi single mang 1 trạng thái thẻ; thẻ giữ ≥ max(1,2 s; 0,4 + 0,28 s × số từ); vòng "Comment …" trước đáp án; recap/Save 2,5 s; loop 1,0 s về khung hook; tổng 20–28 s; caption ≤ 15 ký tự/giây.
- **Giáo viên (22/10)**: Ama "American English Teacher", Carlos "English Coach" (lower-third tên lần nói đầu); recap = "TEACHER'S TIP"; beat "Repeat after me: …" + ngưng ≥ 1,6 s; tự giới thiệu ≤ 1/4 clip, giãn cách (`no_intro`); TTS 0,88×. Bài grammar/word-usage: nền lớp học xoay vòng (`bg_topics.json` teaching_bg); 6 bài liền không lặp nền (publish_pack). Sức khoẻ: pharmacy (chưa có nền phòng khám).

## 3. Builder (`scripts/cine/`)
| Script | Việc |
|---|---|
| `gen_news.py [--n 24]` | Sinh bài từ `content/video/cine/news/bank.json` (5 mẫu three · fix · ab · ways · pov; cổng hook ≤ 5 từ, câu ≤ 12/14 từ, thẻ vừa 52 px, ước 20–28 s; nền theo `news/bg_topics.json`; ledger `used.json` scene `news`). `--mark-rendered <ids> <run>` sau khi ĐẠT. |
| `news_voice.py` | CI: Kokoro (`tts.mjs`) → Rhubarb → faster-whisper khớp token caption. |
| `news_depth.py` / `bg3d.py` | Bản đồ sâu nền (cache `news-depth-v1-*`) / camera ảo 2.5D + bokeh. |
| `news.py` + `news_tpl.py` | Dựng 1 bài. Chạy khô: `NEWS_DRY=1 NEWS_DIR=… CINE_LIB=… python scripts/cine/news.py <id>`. |
| `qa_news.py` | QA (luật qa5 + biến đổi host từng shot, LOOK, 180°, jump cut, âm). Phải ALL PASS. |
| `place.py` | Xếp thẻ/chip/caption né đầu & overlay khác (≥ 24 px). |
| `store_shorts.py` | Copy bài ĐẠT vào repo `lexkite-shorts`. |
| `shorts_index.py` | Manifest `shorts/index.json` cho tab 🎬 Video quản trị. |
| `publish_pack.py` | Gói đăng `content/video/cine/publish/<id>.json` + `calendar.json` (2 news/ngày; tiêu đề ≤ 60 ký tự, UTM, hashtag). Đăng tự động cần chủ cấp tài khoản. |

Diễn cảnh (paused): `lesson5.py`, `qa5.py`, `gen_lessons.py`, … – `docs/archive/CINE-SCENE-STANDARD.md` §7–8.

## 4. CI – `.github/workflows/cine-render.yml` (workflow_dispatch)
- Inputs: `scene` (`news` | hotel | cafe | airport | anchor; nhiều cảnh phẩy ngăn), `lessons` (`all` | `id,id` | `id:lang` | `auto`), `lang` (mặc định `en`), `viral` (bool, mặc định bật), `outsuf` (mặc định `-v3`).
- scene=news: `news-plan` (6 bài/job) → `news-depth` → `news` (voice → dựng → qa_news) → đẩy `lexkite-shorts/shorts/news/<id>/` + tờ soát `sheet_news_<n>.jpg`. Job đỏ nếu QA FAIL.
- Dispatch qua API: `POST /repos/lexkiteapp/lexkiteapp.github.io/actions/workflows/cine-render.yml/dispatches` (curl + `gh auth token`).
- Footage lấy sparse từ repo riêng `lexkiteapp/lexkite-footage` (secret `FOOTAGE_DEPLOY_KEY`, chỉ-đọc).
- Sau ĐẠT: `gen_news.py --mark-rendered …` → `publish_pack.py`.

## 5. Lưu trữ
- **lexkite-shorts** (repo riêng): `shorts/<cảnh>/<bài>/` (mp4, jpg, qa.log, timeline, meta.json), ghi bằng `SHORTS_DEPLOY_KEY`. Artifact CI chỉ 14 ngày.
- **Kho Drive** (pool nhiều Google Drive của chủ, `functions/api/drive.js`, `docs/ASSET-LIBRARY.md` §8.6): `drive-shorts.yml` chạy sau mỗi `cine-render` (`workflow_run`) → `scripts/video/drive-shorts.mjs`, idempotent theo sha, ghi `item.drive` vào `shorts/index.json` (secret `LEXKITE_DRIVE_CLI_KEY`).
- Xem trong Quản trị → 🎬 Video (`functions/api/admin-shorts.js`, URL ký ngắn hạn, `SHORTS_READ_TOKEN`; `docs/SHORTS-ACCESS.md`).
- Footage gốc: `bash scripts/footage-backup.sh` sau mỗi lần thêm cảnh/clip/bài/giọng (→ Kho Drive + manifest, xem §5b).

## 5b. Kho footage (lưu trữ cẩn thận, 22/10/2026)
- **Bản gốc media** (mp4/mkv/png/jpg/webp/wav/npz/zip ≥ 32 KB, mọi file ≥ 1 MB) → **Kho Drive**, folder `footage/<cảnh>`, cls `original`, **2 bản sao trên 2 Drive KHÁC NHAU**, chống trùng sha256 (máy chủ trả `done` nếu sha đã đủ bản). Mã: `scripts/footage/{lib,archive,verify,restore,small-list}.mjs`, dùng lại `driveUpload` của `scripts/video/library.mjs` → `functions/api/drive.js` (chọn Drive, HMAC `LEXKITE_DRIVE_CLI_KEY`, 429 tự chờ).
- **Git chỉ giữ**: `bank*.json`, `index.json`, ledger, QA JSON, code `tools/`, file nhỏ không-media (~2.9k file, 20 MB) và **`brand/library/cine/archive-manifest.json`** (đường dẫn → sha256, size, `copies[{driveId,email,fileId}]`, ~1 MB, commit vào main).
- **Lưu**: `bash scripts/footage-backup.sh` (Mac: archive từ thư mục cine → đẩy manifest + file nhỏ lên `lexkite-footage`; mặc định VẪN đẩy binary (additive); `--manifests-only` khi đã chuyển hết workflow) hoặc CI `footage-archive.yml` (đọc `lexkite-footage`, tiếp tục được, ghi manifest vào main).
- **Khôi phục**: `node scripts/footage/restore.mjs --out brand/library/cine [--match 'regex'] [--sample N]` — bỏ qua file đã đúng sha, tải `.part` rồi đổi tên, thử bản sao kia nếu một bản lỗi, kiểm sha256 từng file.
- **Kiểm hằng tuần** `footage-verify.yml` (thứ Hai 03:17 UTC): mọi mục manifest ≥ 2 bản/≥ 2 Drive + dung lượng khớp; mẫu ngẫu nhiên tải mọi bản sao so sha256; diễn tập khôi phục (2 mp4 + 5 file bất kỳ). Lỗi → workflow đỏ + cảnh báo `footage` ở Quản trị → Kho Drive (`op footage_alert`, không bị health ghi đè). Daily `health.yml`/`drive-health` vẫn báo "file chỉ còn 1 bản sao".
- **Quyền CLI**: `render_link` đọc được file `footage/` (không `retire`/`set_want`); `refs_sync` nguồn `footage` để dọn dẹp Drive không gắn "mồ côi".
- **Kế hoạch di chuyển `lexkite-footage` (KHÔNG viết lại lịch sử)**: đo 22/10: pack git ≈ 3,3 GiB (.git 3,5 GB; 2.354 file/4,3 GB sẽ lên Drive = 8,6 GB cho 2 bản, pool còn ~156 GB) so với manifest + file nhỏ ≈ 16 MB (gz) → tiết kiệm ≈ 99,5 % dung lượng repo, clone CI từ 3,3 GB còn vài chục MB.
- **CI đọc footage từ Drive (22/10)**: `matte-pro`, `cine-render`, `bg-gates`, `shorts-rebuild` gọi `scripts/footage/fetch.mjs` (cùng cú pháp mẫu sparse-checkout): mục manifest khớp mẫu → tải từ Kho Drive vào `.footage-cache` (kiểm sha256) → liên kết vào `footage/`; file nhỏ và binary chưa vào manifest/Drive lỗi → `git checkout` từ `lexkite-footage` (dự phòng). `actions/cache` khoá `footage-<job>-<hash archive-manifest.json>` (restore-keys theo tiền tố), **trần 6 GB** (dọn file cũ nhất, giữ bộ nóng `scripts/footage/hot.json` + file job đang dùng), chừa **≥ 20 GB đĩa** runner (tự gỡ dotnet/android/ghc nếu thiếu), in giây tải Drive/git + dung lượng trong bước tóm tắt. `shorts-rebuild` với sha footage cũ trong công thức → `--git-only` (Drive chỉ có phiên bản hiện tại; giữ lịch sử git ≥ 30 ngày).
- **Chuyển `footage-backup.sh` sang `--manifests-only`** chỉ sau khi cả 4 workflow xanh với `fetch.mjs`; từ đó cảnh mới chỉ lên Drive + manifest.
- **Repo mỏng (chuẩn bị, CHƯA tạo)**: `lexkite-footage-slim` = `archive-manifest.json` + file nhỏ < 1 MB (≈ 20 MB, `node scripts/footage/small-list.mjs <cine> | rsync -a --from0 --files-from=- <cine>/ slim/`). Repo cũ (~5 GB) đặt **chỉ-đọc 30 ngày** làm dự phòng (Settings → Archive); KHÔNG viết lại/xoá lịch sử, KHÔNG xoá repo nếu chủ chưa đồng ý. Đổi `FOOTAGE_DEPLOY_KEY` + URL trong 4 workflow + `footage-backup.sh` sang repo mỏng rồi.
- **Video đã dựng — luật dung lượng**: master theo công thức trước (`recipes/`), mp4 ở Kho Drive; **chưa duyệt: 1 bản, tự bỏ thùng rác Google sau 30 ngày** (`shorts-archive.mjs`, op `retire`); **đã duyệt/đăng: 2 bản/2 Drive**. Trung gian (lớp x2, matte tạm, `render*/`) chỉ nằm trên runner / bị `walk` bỏ qua → xoá sau QC, không lên Drive. Bản xem web: nhúng YouTube trước, `media.lexkite.com` chỉ là bản nhỏ dự phòng. **Nén lưu trữ**: `python3 scripts/video/archive_reencode.py src.mp4 out.mp4` (HEVC CRF 20) chỉ giữ bản nén khi SSIM ≥ 0.98 và nhỏ hơn; chỉ sau khi bản nén lên Drive đủ 2 bản mới gỡ master cũ.
- **Giám sát**: Quản trị › Kho Drive cảnh báo khi cả pool ≥ 80 % (`poolpct`) hoặc từng Drive ≥ 80/90 %, hiện **dự báo GB/tháng + số ngày tới khi đầy** (ảnh chụp dung lượng mỗi ngày trong `drive_meta used:<ngày>`, vài chục dòng — không quét bảng). `storage-watch.yml` (thứ Hai): repo git > 2 GB (mục tiêu ≤ 1 GB) → cảnh báo `gitsize`. Thêm 1 tài khoản Drive (15 GB miễn phí) khi pool ≥ 70 % hoặc còn < 10 GB / dự báo < 60 ngày.
- **Cầu dao D1 (23/10, gốc rễ)**: Cloudflare D1 miễn phí = 5 triệu dòng ĐỌC/ngày cho CẢ tài khoản; archive đã cạn 2 lần. Nay: (1) footage dùng **manifest trong git** làm nguồn thật cho dedupe/tra cứu, D1 chỉ nhận ghi theo lô ≤ 100 dòng (`refs_sync`) và tra theo KHOÁ (sha256, file_id, drive_id — có chỉ mục; `list` của CLI không quét `drive_files`); (2) `functions/api/_d1guard.js`: đọc dòng đọc/ghi hôm nay của cả tài khoản từ Cloudflare GraphQL (`d1AnalyticsAdaptiveGroups`, cache 5 phút; cần secret Pages `CF_ANALYTICS_TOKEN` quyền đọc Analytics + `CF_ACCOUNT_ID`; thiếu → tự đếm phần Kho Drive qua `metered()` → `drive_meta d1r:<ngày>`, trần 1,5 M/ngày cho đường CLI); việc nền/quản trị `drive.*` trả **429 `quota-guard` khi ≥ 50 %**, đồng bộ/đăng nhập/bài học không bao giờ gọi cầu dao; (3) **cảnh báo 60 %** = thư + chuông (`drive_alerts` kind `d1`) + thẻ **Admin › Hạn mức › D1 hôm nay** (đọc/ghi so với hạn mức); (4) CI gặp 429 → `archive`/`verify`/`restore`/`fetch` dừng sạch (exit 0, fetch lấy git dự phòng), **không thử lại, không thăm dò `/api/drive` bằng vòng lặp** (đọc log workflow); (5) test `scripts/test/drive.mjs` chạy `EXPLAIN QUERY PLAN` cho mọi truy vấn của đường upload_session/complete/where/list/render_link/refs_sync — quét `drive_files`/`drive_refs` là đỏ. Phương án dự phòng (chưa làm): chuyển sổ nội bộ sang tài khoản Cloudflare miễn phí thứ hai (hạn mức riêng).
- **Tách D1 nội bộ (tài khoản Cloudflare thứ 2) + điều phối việc nền (23/10)**: D1 `lexkite-internal` (uuid `2cd585e3-f322-46d6-913e-9dd7139d583f`, tài khoản 2) nhận các bảng `drives`, `drive_*` (files, audit, refs, folders, alerts, meta, nonce) và `job_leases`/`job_runs`; D1 chính chỉ còn dữ liệu người dùng + `admin_log`/báo cáo/quota (giai đoạn 2). Pages không bind D1 khác tài khoản → `functions/api/_d1b.js` gọi REST (`POST /accounts/{id}/d1/database/{uuid}/query`, lô `batch`, chỉ truy vấn theo khoá). Cờ biến Pages `D1B`: tắt (mặc định, dùng D1 chính) → `dual` (ghi CẢ HAI, đọc D1 chính; `d1b-migrate.yml` sao dữ liệu cũ + `d1b_counts` đối chiếu số dòng) → sau ≥ 1 ngày khớp đặt `D1B=on` (chỉ D1 nội bộ; D1 chính ngừng ghi, `d1b_copy` từ chối để không ghi đè). Cầu dao đo RIÊNG từng tài khoản (`d1Usage(..., which)`: 'main' | 'b'). Bí mật Pages: `D1B_ACCOUNT_ID`, `D1B_TOKEN` (quyền D1 Edit + Account Analytics Read), tuỳ chọn `CF_ANALYTICS_TOKEN` + `CF_ACCOUNT_ID` (đọc số dòng của tài khoản chính). Điều phối: `infra/jobs.json` → `docs/JOBS.md` (sinh), thuê tài nguyên độc quyền (`lease.mjs`, `functions/api/jobs.js`), trần ngân sách theo ưu tiên, view Quản trị › Hạn mức › "Lịch việc nền". Lịch sau reset 00:00 UTC: footage-archive 01:45 → drive-shorts 04:23 → video-web 04:47 → d1b-migrate 05:30 → footage-verify (thứ Hai) 06:20.
- **Fail-closed + đặt chỗ AI (23/10)**: xem `docs/METHODS.md` (bài học cuối) — việc nặng cần thuê mới chạy; neuron Workers AI chính nền = 0 (cấp riêng qua `reservations.workers_ai.grants` trong `infra/jobs.json`).
  1. (xong) Drive là nguồn bền; `footage-backup.sh` mặc định cộng thêm Drive (vẫn đẩy binary); workflow cần chuyển sang restore trước khi bỏ binary: `matte-pro.yml` (bước "Footage (sparse)"), `cine-render.yml`, `bg-gates.yml`, `shorts-rebuild.yml` (cả 4 dùng FOOTAGE_DEPLOY_KEY).
  2. Binary cũ ở đầu nhánh `lexkite-footage` **giữ nguyên** vì `cine-render.yml`/`matte-pro.yml` clone sparse từ đó. Cảnh mới chưa vào git → giữ mặc định (vẫn đẩy binary) cho tới khi làm bước 3.
  3. Đổi hai workflow đó sang `restore.mjs --match <đường dẫn cảnh>` (cần `LEXKITE_DRIVE_CLI_KEY`), chạy 1 lượt render thử so kết quả.
  4. Sau bước 3 xanh: commit xoá binary khỏi đầu nhánh (lịch sử vẫn ~3,3 GiB — chỉ thu nhỏ khi chủ đồng ý tạo repo mới `lexkite-footage-2` chỉ chứa manifest, rồi lưu trữ repo cũ).

## 6. Kho tài sản (bank)
- `brand/library/cine/anchor/green/` – clip phông xanh host (Ama `ga2_*`, Carlos `gc_*`; chuỗi interp24 → `chroma_key.py` → asset_check → expand → bank.py).
  - **PRO matte (22/10)**: `green/kfull_pro/<id>.mp4` (H.264 4:4:4 CRF 6) + `green/kmask_pro/<id>.mkv` (alpha FFV1 lossless) từ `scripts/video/matte_pro.py` (trimap chroma → ViTMatte-S → `estimate_foreground_ml` → spill Keylight ở dải mép → alpha ổn định theo DIS flow). Chạy CI `matte-pro.yml` (inputs `clips`, `sheet`, `video`), kéo artifact về `green/`, rồi `footage-backup.sh`. Cổng: `scripts/video/matte_qa.py gate <green> <clips>` (recon, edge dE, spill, dark/light, flicker, hair_frac). Bật trong news: `NEWS_MATTE=pro` + `MR.layer_paths/mask_levels(lossless)/finish_host`.
- `brand/library/cine/anchor/bg/` + `index.json` – thư viện nền news (≥ 23 cảnh, Kling i2i với `style_ref_bg.jpg`).
- `brand/library/cine/<cafe|airport|hotel>/` – kho diễn cảnh (`bank.json`, `dl24/`, `vis3/`, `tools/`); `restaurant/` bị loại.
- Nội dung: `content/video/cine/news/{bank,bg_topics,lines}.json`, `content/video/cine/{used,coverage}.json`, `content/video/cine/publish/`.
- `brand/library/cine` là gitignore → nguồn bền = Kho Drive theo `archive-manifest.json` (§5b); `lexkite-footage` giữ manifest + file nhỏ (+ binary cũ đóng băng).

## 7. Credit (tóm tắt – đầy đủ `docs/CREDIT-RULES.md`)
0 credit trước · phiếu phân tích · dry-run in lệnh · ảnh (1 cr) đạt rồi mới clip (25 cr) · thử 1 cái, lần lượt · hỏng 2 lần → DỪNG, báo chủ · trần credit mỗi việc · chỉ dùng kết quả ≥ 90 (`docs/MEDIA-QA-RUBRIC.md`) · ghi ledger. Không tiêu nếu chủ chưa duyệt rõ trong chat.
- Kling cử chỉ tay (22/10): chỉ 1 dáng tay ĐƠN giữ yên (ngón trỏ / lòng bàn tay mở, ngang ngực) – chuỗi đếm ngón theo thời gian KHÔNG làm được. Ảnh ¾ hay sai hướng → xin 2 ảnh/lượt, xác định hướng bằng tai/khuyên tai.

## 8. Pipeline cũ (2D Remotion)
`video.yml` / `video-auto.yml` / Video Studio (`scripts/video/*`) – `docs/archive/VIDEO-PIPELINE.md`; không phải định dạng chính.

## Thư viện clip quy mô lớn (22/10/2026)
- `/api/admin-clips` (functions/api/admin-clips.js, logic thuần `_clip_logic.js`): `query` (lọc + sắp xếp + phân trang con trỏ, bìa ký chỉ cho trang đó), `ids` ("chọn tất cả N kết quả"), `export` (CSV), `bulk` (approve · unapprove · pause · resume · reject{reason} · restore · web_on/off · reschedule{start,days,from,to} · channel · delete{hard}). Lô ≤ 100 id, kết quả từng clip, giới hạn tốc độ, nhật ký `admin_log` (`clips.bulk.<action>`); delete = DANGER (đăng nhập ≤ 15 phút), xoá mềm giữ công thức, `hard` đánh dấu deleted=2 + bỏ khỏi hàng đợi YouTube.
- Trạng thái duyệt/loại/tạm dừng/lịch/kênh/web nằm ở D1 `clip_review` (lớp phủ trên manifest). Mục: Chờ duyệt · Đã duyệt · Đã đăng · Lỗi QA · Lưu trữ (loại/tạm dừng – mặc định ẩn khỏi các mục khác).
- Giao diện `web/js/admin-clips.js`: lưới ảo hóa (thẻ cao cố định, < 300 nút DOM), chọn nhiều O(1), thanh thao tác sticky, tác vụ dang dở tiếp tục được (localStorage). Ngân sách hiệu năng: `scripts/test/clips-perf.mjs` (CI `clips-perf.yml`); logic: `scripts/test/clip-bulk.mjs`.
- Phân phối nhiều kênh (22/10/2026): `/api/distribution` + `_distribution.js` (định tuyến luật đầu tiên thắng + dự phòng, hạn mức/ngày, giãn cách, khung giờ theo múi giờ kênh, jitter ±20 phút, chống trùng tiêu đề/bìa, không lặp mẫu liền kề), D1 `yt_chan_cfg` / `yt_rules` / `yt_plan`; gói đăng hiện kênh + giờ; sync báo `wrong-channel`; kênh tự tạm dừng khi sync gặp forbidden/revoked hoặc ≥ 5 lần tải lỗi (cảnh báo ở status.alerts). Phân loại: `_taxonomy.js` (một nguồn), loại nội dung short/long/podcast ở `_clip_logic.js`. Chưa làm: giao diện tab "Kênh & phân phối", vai trò embed/social + metadata viral, facade nhúng nhẹ.
