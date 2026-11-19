# Một kịch bản – bốn đầu ra (media-one-source)

> TL;DR: mỗi đơn vị bài học có MỘT kịch bản (`content/video/teach2d/eps/*.json`, đã qua `reviewed.json`); từ đó CI sinh (a) video ngang nhúng bài học, (b) bản dọc 30–60 s, (c) tập podcast MP3 + RSS tĩnh, (d) truyện đọc theo cấp. $0, chỉ CI, không Kling.
> Đọc khi: thêm đầu ra media từ kịch bản, nhúng video vào bài học, làm podcast / graded reader.

## 1. Kịch bản chung (đã có, không đổi schema)
`eps/<id>.json` = `{ id, template, series, teacher (ama|carlos), voice, speed, lines[{id,text,pause,quiz?}], data{…} }` + thẻ `tags` (words, grammar, cefr) suy từ `data`. Một dòng `lines[].text` = một câu = đơn vị đồng bộ (audio, caption, highlight). Thêm cho (d): `story{cefr,title,paras[]}` ở file riêng `content/story/<id>.json` (cùng khoá `words`/`cefr`, không nhân đôi kịch bản video).

## 2. Ánh xạ
| đầu ra | nguồn | dựng | đặt ở | QC (không hạ ngưỡng) |
|---|---|---|---|---|
| a. video ngang 16:9 (`wide`) | bản `wide` của tập đã bank (`bank.json`) | `teach-video.yml` (có sẵn) → `embed-publish.mjs` đưa lên Release `wv-<id>` qua `media.lexkite.com/video/` | `web/data/videos.json` `embeds[]`; bước video của `#/lesson` (`lv_embed`, `LessonVideo.embed`) | `qc.py` ≥ 90 mọi cổng, ≤150 wpm, −16 LUFS, `validateEmbeds`, `verifyAssets` (200 + CORS) |
| b. dọc 9:16 30–60 s (`short`) | bản `short` cùng tập | cùng lượt render | chỉ xuất ra kho (`lexkite-shorts` → Drive); phiên video-daily-fix đăng | như (a) + `autopub_gate` |
| c. podcast MP3 | dòng `lines[]` ghép 1 tập 3–6 phút (mở – ví dụ – câu hỏi – tóm tắt), cùng giọng Kokoro | `podcast.yml`: ffmpeg loudnorm −16 LUFS, mono 64 kbps, ID3 | `web/podcast/feed.xml` tĩnh + MP3 trên R2/Release; 1 tập/ngày | RSS hợp lệ (iTunes tags, `enclosure` length/type khớp), ≤150 wpm, LUFS ±1.5, mô tả EN |
| d. truyện đọc A1–B1 | `content/story/*.json` | ảnh `img.json` (không chữ), audio Kokoro theo câu + mốc từ (whisper) | `#/read/<id>` (màn Stitch), không tải gì trước khi mở | độc lập ≥ 90 (grader riêng), từ vựng đúng cấp, `TEXT_OBJ` cho ảnh, quiz ≥ 3 câu, 15 ngôn ngữ giải thích |

Luật chung: nội dung dạy chỉ tiếng Anh; chỉ nút/nhãn/giải thích theo 15 ngôn ngữ (en vi es fr de pt ru tr id th zh ja ko ar hi); web nhẹ: facade (poster WebP, 0 byte player trước khi bấm), ngân sách byte giữ trần; khoá `words`/`grammar` → khớp bài học.

## 3. Chỗ đặt trong app (Stitch "Lexkite Kit")
- (a) bước video đầu bài học: `#lsnVid`, 4:5 điện thoại / 16:9 máy tính, chương + phụ đề EN, hết video → "Next step".
- (c) thẻ "Podcast hôm nay" ở Today (1 hàng, không popup) + trang `#/podcast` liệt kê; liên kết ra Spotify/Apple/YouTube Podcasts.
- (d) tab "Đọc truyện" trong Học: danh sách theo cấp → màn đọc (câu đang đọc + từ sáng lên, bấm từ = nghĩa), cuối truyện quiz.
Mọi màn mới phải qua `Stitch` trước khi code (khoá thiết kế tại nguồn).

## 4. Ưu tiên phủ
50 bài mở nhiều nhất (D1/analytics, `content/video/web/views.json` khi có) → mở rộng theo lượt mở. Khớp bài ↔ video qua `words` (embed) và `grammar`.

## 5. Thước đo (mỗi tuần, ghi vào `content/video/web/coverage.json`)
`embed_coverage` = % bài có video nhúng (mẫu số = bài trong lộ trình; mục tiêu: top-50 100 %, rồi ≥ 40 %); `embed_views`/`done` (qua `/api/hit t:v`); podcast: số tập, tải RSS; truyện: số truyện, tỉ lệ hoàn thành quiz.

## 6. Lát cắt
1. Embeds ≥ 50 + `embed_coverage`; 2. Podcast + RSS + test; 3. Truyện 20 cái đầu. Mỗi lát một PR, tối đa 1 PR mở.
