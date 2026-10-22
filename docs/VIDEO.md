# VIDEO – nguồn sự thật hiện hành (22/10/2026)

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
- Footage gốc: `bash scripts/footage-backup.sh` sau mỗi lần thêm cảnh/clip/bài/giọng.

## 6. Kho tài sản (bank)
- `brand/library/cine/anchor/green/` – clip phông xanh host (Ama `ga2_*`, Carlos `gc_*`; chuỗi interp24 → `chroma_key.py` → asset_check → expand → bank.py).
  - **PRO matte (22/10)**: `green/kfull_pro/<id>.mp4` (H.264 4:4:4 CRF 6) + `green/kmask_pro/<id>.mkv` (alpha FFV1 lossless) từ `scripts/video/matte_pro.py` (trimap chroma → ViTMatte-S → `estimate_foreground_ml` → spill Keylight ở dải mép → alpha ổn định theo DIS flow). Chạy CI `matte-pro.yml` (inputs `clips`, `sheet`, `video`), kéo artifact về `green/`, rồi `footage-backup.sh`. Cổng: `scripts/video/matte_qa.py gate <green> <clips>` (recon, edge dE, spill, dark/light, flicker, hair_frac). Bật trong news: `NEWS_MATTE=pro` + `MR.layer_paths/mask_levels(lossless)/finish_host`.
- `brand/library/cine/anchor/bg/` + `index.json` – thư viện nền news (≥ 23 cảnh, Kling i2i với `style_ref_bg.jpg`).
- `brand/library/cine/<cafe|airport|hotel>/` – kho diễn cảnh (`bank.json`, `dl24/`, `vis3/`, `tools/`); `restaurant/` bị loại.
- Nội dung: `content/video/cine/news/{bank,bg_topics,lines}.json`, `content/video/cine/{used,coverage}.json`, `content/video/cine/publish/`.
- `brand/library/cine` là gitignore → nguồn bền = `lexkite-footage`.

## 7. Credit (tóm tắt – đầy đủ `docs/CREDIT-RULES.md`)
0 credit trước · phiếu phân tích · dry-run in lệnh · ảnh (1 cr) đạt rồi mới clip (25 cr) · thử 1 cái, lần lượt · hỏng 2 lần → DỪNG, báo chủ · trần credit mỗi việc · chỉ dùng kết quả ≥ 90 (`docs/MEDIA-QA-RUBRIC.md`) · ghi ledger. Không tiêu nếu chủ chưa duyệt rõ trong chat.
- Kling cử chỉ tay (22/10): chỉ 1 dáng tay ĐƠN giữ yên (ngón trỏ / lòng bàn tay mở, ngang ngực) – chuỗi đếm ngón theo thời gian KHÔNG làm được. Ảnh ¾ hay sai hướng → xin 2 ảnh/lượt, xác định hướng bằng tai/khuyên tai.

## 8. Pipeline cũ (2D Remotion)
`video.yml` / `video-auto.yml` / Video Studio (`scripts/video/*`) – `docs/archive/VIDEO-PIPELINE.md`; không phải định dạng chính.

## Thư viện clip quy mô lớn (22/10/2026)
- `/api/admin-clips` (functions/api/admin-clips.js, logic thuần `_clip_logic.js`): `query` (lọc + sắp xếp + phân trang con trỏ, bìa ký chỉ cho trang đó), `ids` ("chọn tất cả N kết quả"), `export` (CSV), `bulk` (approve · unapprove · pause · resume · reject{reason} · restore · web_on/off · reschedule{start,days,from,to} · channel · delete{hard}). Lô ≤ 100 id, kết quả từng clip, giới hạn tốc độ, nhật ký `admin_log` (`clips.bulk.<action>`); delete = DANGER (đăng nhập ≤ 15 phút), xoá mềm giữ công thức, `hard` đánh dấu deleted=2 + bỏ khỏi hàng đợi YouTube.
- Trạng thái duyệt/loại/tạm dừng/lịch/kênh/web nằm ở D1 `clip_review` (lớp phủ trên manifest). Mục: Chờ duyệt · Đã duyệt · Đã đăng · Lỗi QA · Lưu trữ (loại/tạm dừng – mặc định ẩn khỏi các mục khác).
- Giao diện `web/js/admin-clips.js`: lưới ảo hóa (thẻ cao cố định, < 300 nút DOM), chọn nhiều O(1), thanh thao tác sticky, tác vụ dang dở tiếp tục được (localStorage). Ngân sách hiệu năng: `scripts/test/clips-perf.mjs` (CI `clips-perf.yml`); logic: `scripts/test/clip-bulk.mjs`.
