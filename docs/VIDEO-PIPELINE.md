# Pipeline video hội thoại tiếng Anh tự động (nhân vật ảo · khớp miệng · phụ đề karaoke)

Mục tiêu: mỗi ngày tự sinh video ngắn (Shorts/Reels/TikTok 9:16) + bài học dài (YouTube 16:9) với dàn nhân vật Lexkite đồng nhất, giọng chuẩn, khớp miệng, phụ đề karaoke tiếng Anh (+ dòng dịch theo ngôn ngữ người xem), đăng social, nhúng vào app. **Chi phí vận hành $0** (Kling chỉ dùng 1 lần để thiết kế nhân vật).

## 0. Nguyên tắc
- **Nhân vật đồng nhất tuyệt đối** = rig 2D (ảnh tách lớp + bộ khẩu hình + bộ biểu cảm), KHÔNG vẽ lại bằng AI mỗi clip (AI video mỗi lần một khác, tốn credit, không chạy trên CI miễn phí).
- Nội dung lấy từ kho học của Lexkite (từ vựng, cụm từ, ngữ pháp, roleplay công sở) → mỗi video dẫn về đúng bài trong app.
- Mọi bước có **cổng kiểm tự động**; chỉ video qua cổng mới được đăng. Không bịa số liệu, không dùng nhạc/ảnh có bản quyền.
- Nguồn thương hiệu: `docs/BRAND-RULES.md` (Kit = linh vật; nhân vật người dùng chung bảng màu).

## 1. Dàn nhân vật (thiết kế 1 lần trên Kling – dùng tài khoản anh đã đăng nhập)
| Nhân vật | Vai | Tính cách | Giọng (Kokoro) |
|---|---|---|---|
| **Mia** (nữ, ~24, nhân viên văn phòng, tóc ngắn, áo cam Lexkite) | "Lily" của Lexkite – thẳng thắn, hài khô, hay bối rối khi gặp tiếng Anh công sở | châm biếm nhẹ, đáng yêu | `af_heart` (Mỹ) |
| **Leo** (nam, ~28, đồng nghiệp người Anh, áo teal) | người giải thích, hay dùng thành ngữ | nhiệt tình, hơi "quá đà" | `bm_george` (Anh) |
| **Kit** (linh vật diều/én – `web/js/kit.js`) | người dẫn, chốt "mẹo nhớ" cuối clip | lém lỉnh | hiệu ứng ngắn, không thoại dài |

Quy trình trên Kling (Claude điều khiển Chrome của anh, **anh xác nhận trước mỗi lần tiêu credit**):
1. Tạo **ảnh gốc** mỗi nhân vật (toàn thân, nền trơn, phong cách phẳng 2D giống app – flat vector, viền mềm, bảng màu Lexkite).
2. Dùng ảnh gốc làm **ảnh tham chiếu khóa nhân vật** (character/element reference) để tạo: bảng xoay (chính diện, ¾, nghiêng), **8 biểu cảm** (vui, cười lớn, ngạc nhiên, suy nghĩ, bối rối, tự hào, buồn cười ngượng, đồng ý), **6 cử chỉ** (vẫy tay, chỉ tay, giơ ngón cái, khoanh tay, ôm đầu, vỗ tay).
3. Tải về → lưu `brand/characters/<tên>/source/` (PNG lớn).
4. Tách lớp (đầu, thân, tay, mắt, **miệng**) + vẽ **bộ khẩu hình 9 viseme** (A, B, C, D, E, F, G, H, X theo chuẩn Rhubarb) ⇒ `brand/characters/<tên>/rig/` (SVG/PNG). Làm 1 lần (Claude + chỉnh tay nếu cần); kiểm đồng nhất bằng script so màu/khung.

## 2. Pipeline tự động (GitHub Actions `video.yml`, chạy theo lịch + chạy tay)
```
chọn chủ đề → kịch bản (JSON) → kiểm kịch bản → giọng đọc → mốc thời gian từng từ → khẩu hình → dựng khung → ghép video → phụ đề karaoke → kiểm chất lượng → xuất bản
```
| Bước | Công cụ (miễn phí) | Đầu ra |
|---|---|---|
| 1. Chọn chủ đề | hàng đợi `content/video/queue.json` (từ vựng IELTS/TOEIC, cụm công sở, lỗi hay gặp, roleplay) | 1 chủ đề / video |
| 2. Kịch bản | Gemini (khóa xoay vòng sẵn có) theo khuôn: hook ≤ 2 s → tình huống hài → giải thích → câu mẫu → "Kit's tip" → CTA lexkite.com | `script.json` (lượt thoại, nhân vật, biểu cảm, cử chỉ, từ khóa nhấn) |
| 3. Kiểm kịch bản | LanguageTool + `content-check` + luật riêng (CEFR, ≤ 60 s, không bịa số, không nhãn hiệu đối thủ) | qua/không qua |
| 4. Giọng | Kokoro (pipeline `audio.yml` sẵn có), mỗi nhân vật 1 giọng, chuẩn hóa âm lượng `ffmpeg loudnorm -16 LUFS` | `line-*.wav` |
| 5. Mốc thời gian từng từ | faster-whisper `tiny.en` word_timestamps (CPU) + khớp ngược kịch bản; dự phòng chia đều | `words.json` |
| 6. Khẩu hình | **Rhubarb Lip Sync** (CPU, nhanh) | `visemes.json` |
| 7. Dựng & ghép | ffmpeg (đã chọn, §7; Remotion không cần) – trước đây dự kiến Remotion hoặc ffmpeg + SVG rig: nhân vật, biểu cảm đổi theo kịch bản, chớp mắt ngẫu nhiên, nhún nhẹ, zoom cắt cảnh | `video.mp4` 1080×1920 (+ 1920×1080) |
| 8. Phụ đề karaoke | ASS `\k` theo `words.json`: chữ tiếng Anh sáng dần từng từ, từ khóa tô cam; dòng dịch nhỏ bên dưới (15 ngôn ngữ = 15 bản) | burn-in + file `.srt/.vtt` riêng |
| 9. Kiểm chất lượng | độ dài, âm lượng, lệch khẩu hình < 80 ms, phụ đề trong vùng an toàn của từng nền tảng, chữ đủ tương phản, không khung đen | báo cáo + ảnh xem trước |
| 10. Xuất bản | **GrabCast** (backend của chính chủ, workspace Lexkite = 4): CI chạy `node scripts/video/publish-grabcast.mjs --file video.mp4 --meta script.json [--at ISO] [--accounts id,id] [--dry-run]` → tải vào kho Drive (pool bulk) → `use` → validate → tạo bài (Idempotency-Key ổn định) → lên lịch; không có `--at` = để nháp. Quản lý tay: **Quản trị → Video & Social** (Drive + cảnh báo 80/90/95%, kênh, bài đăng lên lịch/đăng ngay/hủy lịch/thử lại/hủy, tạo bài, giờ vàng Mỹ 7·8·12·19·20 giờ New York) qua proxy `/api/social` (`functions/api/social.js`, chỉ admin, whitelist endpoint). Kết nối kênh/Drive chỉ làm trên grabcast.click/scheduler.html | link bài đăng trên từng kênh |
| 11. Nhúng vào app | trang `#/videos` + gắn video vào đúng bài/từ (từ điển, chủ đề, roleplay); phụ đề chạm-để-tra như YouTube học hiện có | người học xem trong app |

## 3. Định dạng nội dung
- **Shorts 9:16 (30–45 s)**: "Đừng nói X, hãy nói Y", "3 cụm sếp nước ngoài hay dùng", "IELTS Speaking: nâng band 1 câu", hội thoại hài Mia–Leo.
- **Bài học YouTube 16:9 (5–8 phút)**: ghép 6–8 tình huống cùng chủ đề + ôn tập + câu đố cuối; chương (chapters) tự sinh.
- **Thumbnail**: khuôn cố định từ `brand/social` + biểu cảm nhân vật + 3–5 chữ.

## 4. Cổng chất lượng (chặn đăng nếu sai)
1. Kịch bản: 0 lỗi LanguageTool mức nặng, CEFR đúng nhãn, có nguồn bài học trong app.
2. Âm thanh: −16 LUFS ±1, không rè, không cắt chữ.
3. Khớp miệng: lệch < 80 ms (đo từ visemes vs. mốc từ).
4. Phụ đề: đúng chính tả với kịch bản 100%, nằm trong vùng an toàn, tương phản ≥ 4.5:1.
5. Thương hiệu: chỉ dùng nhân vật trong `brand/characters`, màu theo BRAND-RULES; không logo/nhãn hiệu bên thứ ba.
6. Người duyệt: 5 video đầu anh xem trước khi bật tự đăng hoàn toàn.

## 5. Lộ trình
| Giai đoạn | Việc | Ai | Chi phí |
|---|---|---|---|
| G1 (1–2 ngày) | Thiết kế 3 nhân vật trên Kling + bộ biểu cảm/cử chỉ; tách lớp + 9 khẩu hình | Claude điều khiển Chrome (anh duyệt credit) + phiên phụ tách lớp | credit Kling của anh (1 lần) |
| G2 (2–3 ngày) | Dựng `video.yml`: kịch bản → giọng → khẩu hình → Remotion → phụ đề karaoke → cổng kiểm; xuất 3 video mẫu | phiên phụ | $0 |
| G3 (1 ngày) | YouTube API tự đăng (anh tạo khóa OAuth như CWS) + trang `#/videos` trong app | phiên phụ + Antigravity (UI) | $0 |
| G4 | Lịch đăng: 1 Short/ngày, 1 bài dài/tuần; đo lượt xem → ưu tiên chủ đề hiệu quả | tự động | $0 |

## 6. Việc anh cần làm
- GrabCast: tạo khóa API tại grabcast.click/account.html#api (quyền social:read/write + storage:read/write) → đặt secret `GRABCAST_API_KEY` trên Cloudflare Pages và GitHub Actions; `GRABCAST_WORKSPACE=4` (mặc định sẵn trong code), `GRABCAST_API_BASE` mặc định `https://grabcast-api-342720596878.us-central1.run.app`. Kết nối kênh + Drive trên grabcast.click/scheduler.html (chọn workspace Lexkite). Giới hạn 60 lượt/phút, 3.000/ngày.
- Duyệt từng lần dùng credit Kling ở G1 (Claude báo số credit dự kiến trước).
- Tạo khóa OAuth YouTube (giống CWS, Claude mở sẵn trang).
- Xem & duyệt 5 video đầu.

## 7. Video Studio (Quản trị → Video Studio) – điều phối A→Z
Trang `admin.html#studio` (`web/js/admin-studio.js`, tải lười khi mở tab) + API `POST /api/studio` (`functions/api/studio.js`, chỉ admin qua `adminGate`, ghi `admin_log`). Dữ liệu D1 bảng `video_jobs` (tự tạo) + cài đặt ở `config` khóa `studio`.

**Luồng trạng thái** (máy chủ chặn bước sai, 409 `bad-transition`):
```
idea → script → script_ok → rendering → rendered (chờ chấm tay) → qa_ok | qa_fail → uploaded → scheduled → published
```
| Bước | Ai làm | Chi tiết |
|---|---|---|
| Ý tưởng | admin (➕ Job mới) hoặc 📥 hàng đợi `content/video/queue.json` (đọc từ nhánh main qua raw.githubusercontent.com, bỏ chủ đề trùng) | `create` / `createFromQueue` |
| Kịch bản | ✨ Gemini (khóa xoay vòng sẵn có, `geminiCall`) theo khuôn §2: hook ≤ 6 từ (≈ 2 s) → situation → explain → example → Kit's tip → CTA lexkite.com. Không có AI → khung mẫu để sửa tay | `scriptGen` · sửa từng dòng (who/beat/text/expr/gesture) `scriptSave` |
| Kiểm kịch bản | máy chủ (`checkScript`) | ≤ 60 s (bài dài ≤ 480 s, ước 2,6 từ/s), đủ 6 phần, nhân vật trong dàn, **không số liệu/thống kê**, **không thương hiệu đối thủ**, CTA về lexkite.com → `scriptApprove` |
| Dựng | GitHub Actions `video.yml` (workflow_dispatch `job_id`, ubuntu-latest miễn phí) | `render` gọi GitHub API bằng secret `GH_DISPATCH_TOKEN`. Các bước tách riêng trong yml, mỗi bước `node scripts/video/render.mjs --job <id> --step <bước>`: fetch → variant → cast → tts (Kokoro) → align (faster-whisper) → lipsync (Rhubarb) → karaoke ASS → compose (ffmpeg) → qa. Rồi artifact xem trước (14 ngày) → `publish-grabcast.mjs --store-only` (tải vào kho GrabCast, ra `object_id`) → gọi lại |
| Gọi lại | CI → `POST /api/studio` header `X-Studio-Secret` (= `STUDIO_CALLBACK_SECRET`) | `ciJob` (lấy kịch bản) · `ciResult` (files, điểm QA). Máy chủ tự cộng lại điểm; còn tiêu chí chưa chấm → `rendered`; đủ → `qa_ok` (≥ 90) / `qa_fail`. CI lỗi → về `script_ok` + ghi lỗi |
| Chấm QA | CI chấm phần đo được (hook, khẩu hình, âm thanh, phụ đề, nhịp, thương hiệu, CTA + cổng nhất quán/chống lặp §8–9) · admin chấm tay `knowledge`, `share` | thang `docs/MEDIA-QA-RUBRIC.md` mục C, `qaSet` |
| Đăng | 📤 (xác nhận) hoặc tự động | `publish`: `storage/objects/{id}/use` → media → kênh (cài đặt: kênh mặc định / nền tảng / mọi kênh còn hoạt động) → `posts/validate` → `posts` (Idempotency-Key ổn định) → `posts/{id}/schedule` |
| Lịch | máy chủ chọn **khung trống kế tiếp** giờ New York 7·8·12·19·20 (tự EST/EDT), cách bài khác ≥ 45 phút, ≤ hạn mức/ngày; hoặc admin chọn giờ | `slots` · `schedule` · `unschedule` · `sync` (GrabCast báo đã đăng → `published`) |

**Chế độ tự động** (công tắc trên trang): kịch bản AI hợp lệ → tự duyệt + tự dựng; video `qa_ok` → tự đăng & lên lịch **chỉ khi** đã có ≥ N video đăng/lên lịch bằng tay (cài đặt "duyệt tay N video đầu", mặc định 5 – §4.6) và còn hạn mức/ngày. Video bị `blocked` (lỗi nhất quán/chống lặp) hoặc thiếu giọng/khẩu hình không bao giờ đạt → không thể tự đăng.

**Bí mật cần đặt** (không bao giờ trả về trình duyệt / in log):
- Cloudflare Pages: `GH_DISPATCH_TOKEN` (PAT fine-grained, chỉ repo `lexkiteapp/lexkiteapp.github.io`, quyền **Actions: Read and write**), `STUDIO_CALLBACK_SECRET` (chuỗi ngẫu nhiên ≥ 32 ký tự), `GRABCAST_API_KEY` (đã có). Tùy chọn `STUDIO_REF` (mặc định `main`).
- GitHub Actions secrets: `STUDIO_CALLBACK_SECRET` (cùng giá trị), `GRABCAST_API_KEY`.

**Dựng thật (đã làm, `scripts/video/render.mjs` + `lib.mjs` + `variants.mjs`, mọi công cụ miễn phí, CPU ubuntu-latest)** – các bước trong `video.yml`, env `VIDEO_STRICT=1` (thiếu công cụ → lỗi, không lặng lẽ bỏ qua):
| Bước | Công cụ | Ra |
|---|---|---|
| fetch | Studio `ciJob` (kèm `recent` = dấu vân tay 30 video gần nhất) | `state.json` |
| variant | `variants.mjs` (§9) | khuôn, phòng/giờ/mùa, dàn, góc máy, hook, chuyển cảnh, nhạc, end card |
| cast | `lib.buildStage` – cổng nhất quán (§8) | sân khấu từng câu + lỗi |
| tts | Kokoro (`kokoro-js@1` như `audio.yml`), giọng theo `assets.json characters[who].voice` (+ `casting.json voices`), `loudnorm I=-16 TP=-1.5` | `line-NN.wav` |
| align | faster-whisper `tiny.en` `word_timestamps` (CPU int8, `scripts/video/align.py`) → khớp ngược từ kịch bản bằng LCS (`lib.matchWords`); khớp < 50 % → chia đều | `words.json` |
| lipsync | Rhubarb Lip Sync 1.13.0 (tải bản phát hành trong CI) `-f json -d line.txt` | `visemes.json` |
| karaoke | ASS: mỗi từ 1 sự kiện, **từ đang đọc màu cam** #E5502F, từ khóa vàng, viền mực; 1/3 dưới; hook chữ to ≤ 2 s (6 kiểu); nhãn khuôn; thẻ CTA lexkite.com | `subs.ass`, `subs.srt` |
| compose | ffmpeg: phòng theo bối cảnh → bóng tiếp xúc + bóng đổ theo `light.dir` → clip nhân vật (`brand/library/clips`, mp4 "stacked" màu/mặt nạ) chân đặt lên điểm `stand`, cao `scaleAt(y)`, lật theo hướng nhìn, chỉnh ấm → góc máy (rộng/cận/đẩy/lùi/lia/chia đôi) → chuyển cảnh màu → end card; âm: giọng + nhạc nền tự tổng hợp (aevalsrc, không bản quyền) + whoosh/pop → loudnorm 2 lượt; burn-in ASS | `video.mp4` 1080×1920 30 fps |
| qa | MEDIA-QA-RUBRIC C: thời lượng, LUFS (`ebur128` trên video cuối), lệch khẩu hình (đầu cụm từ ↔ miệng mở, trung vị, < 80 ms), phụ đề (đúng chữ 100 %, vùng an toàn, tương phản ≥ 4.5, burn-in), hook, nhịp (cảnh 0,7–4 s), thương hiệu, CTA, **nhất quán (§8)**, **chống lặp (§9)** | `qa` gửi `ciResult` (`scores`, `gates`, `blocked`, `consistency`, `variant`) |

Thiếu tài nguyên thì lùi êm: clip → ảnh tĩnh (`stills`, đã cắt bóng sàn dính bằng `cutout.trim_floor_shadow` qua `layer_prep.py`) → bỏ nhân vật; phòng thiếu file → nền màu thương hiệu (phòng "ảo"). Clip kho tạo bằng `python scripts/video/clip_to_layer.py clip.mp4 --stacked brand/library/clips/<who>_<action>.mp4` (in sẵn `foot`, `figH` để dán vào `brand/library/manifest.json`).

**Chạy thử trên máy (không bí mật, không gọi Studio)**: `node scripts/video/render.mjs --local --script content/video/samples/sample.json [--seed s] [--library thư-mục]` → `out/video/local/video.mp4`. Thiếu kokoro-js / faster-whisper / rhubarb / libass → bỏ qua có thông báo (giọng = ước lượng, mốc từ = chia đều). Độ phủ: `node scripts/video/render.mjs --coverage`. Test hàm thuần: `node scripts/test/video.mjs` (trong `npm test`).

## 8. Cổng nhất quán bối cảnh – nhân vật – lời thoại
Mục tiêu: không "râu ông nọ cắm cằm bà kia". Luật nằm trong `content/video/casting.json` (sửa file = đổi luật), kiểm ở bước `cast` (`lib.buildStage`).
1. **Bối cảnh & vai**: mỗi bối cảnh (office, school, library, exam, cafe, restaurant, home, airport) có dàn hợp lệ + vai: Diane = sếp/người phỏng vấn ở office; Carlos = barista/phục vụ/nhân viên quầy (cafe, restaurant, airport); Ama = trường, thư viện, phòng thi; Mia, Leo = office hoặc đời thường (home, cafe, restaurant, airport); Kit hợp lệ mọi nơi (huy hiệu, không đứng sàn).
2. **Chủ đề → bối cảnh + dàn**: `topics` khớp từ khóa (trọn từ) trong chủ đề/tiêu đề (job interview → office + Diane; ordering coffee → cafe + Carlos; IELTS → exam/library/school + Ama; email etiquette/meeting → office…), không khớp → `fallback`. Phòng chọn theo tag + giờ, **không ngẫu nhiên** (biến thể có seed – §9). Cả video 1 bối cảnh; đổi phòng chỉ giữa 2 câu và câu đó phải có `transition: fade|wipe` (dựng thành chuyển cảnh màu rõ ràng).
3. **Từng câu**: cảm xúc câu (`lib.lineEmotion`: hỏi → ask/think · sai → shock/facepalm/headgrab · đúng → thumbs/laugh · giải thích → talk/point · CTA → wave/thumbs/talk) quyết định clip; biểu cảm ghi trong kịch bản trái nghĩa với câu → lỗi. Người nói **bắt buộc** clip có cử động miệng (`mouth: true`); người nghe idle/nod; người nghe **nhìn về phía người nói** (lật ngang theo vị trí đứng, `facing` gốc trong manifest).
4. **Liên tục**: cùng trang phục (theo bối cảnh/kịch bản `outfit`), cùng điểm đứng suốt bối cảnh, phòng đúng ngày/tối của kịch bản (`time`), chân trên vùng sàn ±1 % khung và tỉ lệ đúng `scaleAt` ±5 % (luật §0 ASSET-LIBRARY), cùng clip hành động không lặp trong 1 video.
5. **Hậu quả**: lỗi → mục rubric tương ứng = 0 (`brand`: sai bối cảnh/dàn · `lipsync`: miệng/biểu cảm/hướng nhìn · `pacing`: liên tục/chuyển cảnh/lặp clip) + `qa.blocked = true` + lý do trong `qa_json.consistency`. Máy chủ (`studio.js`): `blocked` → `qa_fail`, chấm tay không gỡ được, không đăng được (`qa-blocked`). Dựng vẫn chạy hết để có bản xem trước.

## 9. Bộ sinh biến thể & chống lặp (hàng trăm nghìn clip không nhàm)
- `content/video/formats.json`: **22 khuôn** (Don't say/Say, POV công sở, Native vs textbook, Đố 3 giây, Ama asks why, Leo explains idiom, Phỏng vấn với Diane, Gọi đồ ở quán Carlos, Word of the day, Lỗi phát âm, Mini-drama 3 cảnh, Quiz A/B/C, Before/After, Top 3 cụm, Story 30 s, Reaction, Thử thách nói theo, Ngữ pháp 60 s, Email sửa nhanh, Small talk, IELTS band up, Sống sót ở sân bay) – mỗi khuôn: chủ đề hợp, số người nói, nhãn theo beat, góc máy theo beat. Kèm 6 kiểu hook, 6 chuyển cảnh, 6 bộ góc máy (đẩy, lùi, lia, cận, chia đôi…), nhạc nền tự tổng hợp (5 + không nhạc) × 3 gói hiệu ứng, 6 end card (gồm `brand/social/templates/png/endcard-qr-1080x1920.jpg`), mùa theo tháng (lớp `overlays/<mùa>.png` – chỉ dùng khi có file).
- `scripts/video/variants.mjs` `pickVariant(seed)`: tổ hợp khuôn × bối cảnh (phòng, ngày/tối, mùa) × dàn hợp vai (đổi vai chỉ khi lời thoại không gọi tên; ưu tiên vai đã có clip) × góc máy × hook × chuyển cảnh × nhạc × end card. Cùng seed + lịch sử → cùng kết quả.
- **Chống lặp**: dấu vân tay 8 thành phần chính (format, setting, cast, hookStyle, transition, music, endCard, cameraSet) không được trùng ≥ 3 thành phần với **30 video gần nhất** (thành phần bị kịch bản cố định không tính); giãn cách `rules.spacing` (vd. khuôn ≥ 3 video); clip hành động không lặp trong 1 video và tránh clip của 3 video trước. Lịch sử: Studio lưu `files.variant` (ciResult) và trả `recent` (ciJob); chạy thử dùng `out/video/history.json`. Không đạt luật → `variety` ✗, `pacing` = 0, chặn đăng.
- **Độ phủ**: `node scripts/video/render.mjs --coverage` → số tổ hợp khả dụng theo chủ đề + danh sách tài nguyên còn thiếu (phòng/giờ, clip từng nhân vật × cảm xúc × trang phục, lớp mùa, end card) → `out/video/coverage.json`, CI ghi vào Summary để phiên chính tạo thêm trên Kling.
- Test: `scripts/test/video.mjs` chạy 1.000 lượt bộ sinh – 0 vi phạm luật, 0 lặp clip, 1.000 tổ hợp khác nhau.

## 10. Lớp motion (Remotion) – hook, chuyển cảnh, phụ đề động, âm thanh
**Động cơ**: bước `compose` dựng hình bằng **Remotion** (React → MP4, Chrome Headless Shell chạy CPU trên ubuntu CI; miễn phí theo giấy phép Remotion cho cá nhân/công ty ≤ 3 người). ffmpeg chỉ còn lo **tiếng** (trộn, sidechain, loudnorm) và ghép tiếng vào hình. Giao diện bước/state.json giữ nguyên (fetch → … → compose → qa → report), Studio không đổi.
- Mã: `scripts/video/motion.mjs` (hàm thuần → timeline/props) · `scripts/video/remotion/` (dự án riêng, `npm ci`; **1 composition / khuôn**: `fmt-<id khuôn>`) · `scripts/video/keyclip.mjs` (lớp alpha nhân vật) · `scripts/video/synth.mjs` (SFX + nhạc nền tự tổng hợp) · `scripts/video/stress.mjs` (dựng thử đa dạng).
- Luồng compose: state.json → chuẩn bị `out/video/<id>/public/` (phông brand OFL, logo, Kit từ `web/js/kit.js`, phòng, nhân vật) → `props.json` (motion.buildTimeline) → `remotion render` → `silent.mp4` → ffmpeg + `voice.wav` → `video.mp4`.
- Chưa cài Remotion: chạy thử trên máy → đường ffmpeg cũ (ghi todo `remotion`); CI strict → lỗi. `VIDEO_ENGINE=ffmpeg` ép đường cũ. Máy có sandbox chặn Chrome: đặt `REMOTION_BROWSER=<chrome-headless-shell>` và chạy ngoài sandbox.
- **Tài nguyên**: clip `stacked` được kiểm (cao = 2× nửa khung, nửa dưới là mặt nạ xám) – sai → strict FAIL rõ ràng (chạy thử: cắt nền tạm bằng keyclip + todo). Thiếu phòng → strict FAIL; `VIDEO_ALLOW_STUDIO=1` (video-sample.yml, chưa có kho) cho nền gradient thương hiệu. Chạy thử: phòng/ảnh nhân vật tạm từ `brand/library/rooms|chars` hoặc `brand/characters/_candidates/`.
- **Đặt nhân vật**: chân trên điểm đứng của phòng, cao theo `scaleAt` (đo chân/chiều cao từ alpha – `foot`, `figH`); khung cận/đẩy máy giới hạn zoom để đỉnh đầu luôn ≥ 250 px; phụ đề tự tránh dải mặt nhân vật.

**Bộ hook 1,5 s đầu** (riêng từng khuôn: `formats.json` `hook.pattern` + `badge`): 12 kiểu – stop-saying (gạch chữ + ❌ đập), question, wait-for-it, pov (gõ chữ), quiz-timer (vòng đếm 3-2-1), myth-buster (dấu MYTH), versus, countdown-list, secret, mistake-stat, challenge, story-cold-open (dải letterbox). Kèm: chữ hook bật từng từ, **zoom punch-in** vào nhân vật, **rung** ở nhịp sốc, **thanh tiến độ** trên cùng, sticker SVG Lexkite (`remotion/src/Stickers.jsx` – không emoji/sticker bản quyền).
**Phụ đề động** (theme.caption): `pop-box` (1–3 từ/trang, bật lò xo, từ đang đọc vàng, **từ khóa hộp vàng + bóng cam**), `bounce-outline`, `karaoke-bar`, `mega-word`. Mốc từ = words.json (whisper), bật trước 40 ms.
**Payoff** (`payoff.type`): compare-cards (thẻ ❌ trượt vào + rung → thẻ ✅ + confetti), answer-reveal (mờ → nét), tip-card, checklist, meter, flip-card, stamp-correct, before-after.
**Ngắt nhịp**: mọi khoảng trống giữa 2 sự kiện hình (cut/hook/thẻ) > 2,6 s được chèn punch-in / sticker pop / flash / tilt.
**12 chuyển cảnh** (chọn theo ngữ cảnh trong `motion.pickTransitions`, không lặp liền, ≥ 4 kiểu/video): whip-pan, zoom-blur, swipe-mask, circle-reveal, glitch (nhẹ), page-flip, slide-stack, light-leak (sinh bằng gradient), match-cut, split-screen, kit-fly (Kit từ kit.js bay ngang, cảnh mới lộ sau Kit), confetti-burst. Đổi bối cảnh → kiểu "lớn"; cùng người nói → match-cut/zoom; vào end card → ăn mừng.
**Thư viện khuôn**: ≥ 40 khuôn × ≥ 3 theme (kiểu chữ × màu × bố cục; `formats.json` `themes`) → theme chọn theo LRU, ghi vào vân tay (`fp.theme`).
**Âm thanh** (tất cả tự tổng hợp – CC0, `brand/library/sfx/manifest.json`, tạo lại: `node scripts/video/synth.mjs --sfx`): whoosh/swoosh ở chuyển cảnh, pop ở chữ khóa/sticker (≥ 0,35 s/lần), buzz ở ❌, riser + ding ở ✅, bass drop ở hook/nhịp sốc, gõ phím ở hook gõ chữ, tick ở quiz. Nhạc nền = preset `synth.mjs MUSIC` (lofi-warm, pop-bright, quiz-pulse, chill-keys, night-drive, upbeat-claps) **nén sidechain dưới giọng**; loudnorm 2 lượt -16 LUFS. Không dùng nhạc có bản quyền.
**Grade màu**: xem `docs/ASSET-LIBRARY.md` §9. **Watermark**: `docs/BRAND-RULES.md` "Watermark video".
**QA thêm** (bước qa): `visual-hook` – 2 s đầu: chữ (hook ≥ 1,5 s + mật độ cạnh chữ) 40 + chuyển động (chênh lệch khung) 30 + tương phản 30 → **cổng ≥ 90** (dưới → chặn đăng); `grade` – cháy/bết < 1%, bão hòa trong biên, ΔE da↔phòng. Test: `scripts/test/motion.mjs` (trong `npm test`).
**Dựng thử đa dạng**: `node scripts/video/stress.mjs --n 12` → `brand/characters/_candidates/stress/<id>.jpg` (6 khung) + `report.json` (cổng trượt, todo, cảnh báo).
