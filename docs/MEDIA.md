# MEDIA – Học qua video/audio (transcript tương tác) – spec (01/11/2026)

> TL;DR: Trình phát video/audio có transcript tương tác (tô sáng, tự cuộn, bấm để tua, song ngữ 15 ngôn ngữ, cụm từ tra + lưu SRS) và 4 chế độ Phụ đề/Shadowing/Chính tả/Điền từ; mã web/js/media/ dùng chung với Truyện/Podcast; giọng + mốc giờ trên CI media-clips.yml.
> Đọc khi: làm trình phát, transcript, thẻ tra từ, clip học hoặc reader/podcast.

Ý tưởng tham khảo: trình phát có transcript tương tác (ảnh quảng cáo app khác). Chỉ lấy ý tưởng tính năng; KHÔNG dùng thương hiệu, câu chữ, hình ảnh, clip của họ.

## 1. Tính năng
- Video/sân khấu ở trên, transcript cuộn bên dưới. Mỗi câu có mốc giờ; câu đang phát được tô sáng và tự cuộn theo, nhưng không cuộn khi người học vừa tự cuộn (2,5 s). Bấm câu thì tua tới câu đó. Karaoke từng từ chạy theo mốc từ.
- Phụ đề song ngữ: câu gốc tiếng Anh + bản dịch sang ngôn ngữ mẹ đẻ, đủ 14 ngôn ngữ ngoài en. Mặc định dịch theo `I18N.lang()`; nếu giao diện là en thì mặc định vi. Có nút bật/tắt bản dịch và chọn ngôn ngữ dịch.
- Cụm từ/thành ngữ được gạch chân. Chạm vào cụm sẽ mở thẻ tra với nghĩa đã dịch sẵn và def tiếng Anh, có nút **Lưu vào ôn tập** (`App.addWord`, kèm câu ngữ cảnh và bản dịch câu). Trong câu đang phát, chạm 1 từ thì tra từ đó bằng `Dict.quick`.
- 4 chế độ trên cùng clip:
  - **Phụ đề**.
  - **Shadowing**: phát 1 câu rồi dừng. Người học bấm 🎤 Nói theo, `UI.recognize` (Web Speech, dự phòng Whisper trên máy) chấm 0–100, xếp mức great ≥ 85 / good ≥ 65 / retry, rồi nghe lại bản ghi của mình.
  - **Chính tả**: chữ bị làm mờ. Nghe câu, gõ lại, chấm từng từ (căn LCS, từ thừa bị trừ điểm).
  - **Điền từ**: 2 chỗ trống mỗi câu, ưu tiên từ trong cụm gạch chân, chấm từng ô.
- Thanh công cụ: A−/A+ (5 cỡ chữ), 🔁 lặp câu, bật/tắt bản dịch, chọn ngôn ngữ dịch, **Live** (chỉ hiện câu đang phát, chữ lớn), **Thu gọn** (ẩn sân khấu). Lựa chọn lưu ở `localStorage vb.media`.

## 2. Nội dung (luật)
- Chỉ dùng clip tự làm. `kind: teacher` = giáo viên 2D Ama/Carlos (`LessonTeacher`, chỉ qua `Chars`) diễn nói/nghe theo audio Kokoro, chỉ tiếng Anh, ≤ 150 wpm, giọng = `Chars.voice`. `kind: video` = mp4 tự host (`media/…`): video tự dựng, hoặc nguồn public domain/CC **có `source.url` + `author`**. Cổng `scripts/test/media.mjs` chặn nguồn khác.
- Nguồn: `content/media/clips/<id>.json` gồm `{ id, kind, level, title, speakers{A,B→ama|carlos}, speed, source, license, phrases{ key: { def, tr{14} } }, lines[{ who, text, tr{14} }] }`.
- Bản dịch câu/cụm viết tay đủ 14 ngôn ngữ. Cổng chất lượng: đủ ngôn ngữ, không trùng tiếng Anh, đúng hệ chữ (zh/ja-kana/ko/th/hi/ar/ru), ngôn ngữ Latin không lẫn hệ chữ khác, vi có dấu, tỉ lệ độ dài hợp lý, giữ số và tên riêng (Ama/Carlos). Chuỗi giao diện đi qua pipeline G0: `en/media.js` (nhóm lười `media`) → `i18n-fixed.json` → `build-i18n.sh` + `i18n-fix.mjs` → `i18n-missing --strict` + `i18n-qa --strict`.

## 3. Mã (thư mục `web/js/media/`, dùng chung với Truyện/Podcast)
| File | Việc |
|---|---|
| `cues.js` | Logic thuần (UMD, chạy được trên node): `at` (= `Stories.sentenceAt` khi có), `wordAt`, `tokens`, `phraseSpans`/`segments`, `dictation`, `cloze`, `sameWord`, `loopSeek`, `trOf`, `grade`, `wpm`. |
| `transcript.js` | `MediaTranscript.mount(el, { cues, phrases, lang, showTr, mode, onSeek, onPhrase, onWord, onGap })` → `{ setTime, setLang, showTr, setFont, setMode, score, active, destroy }`. Tùy chọn `skin` (`row`/`state`/`word`) + `onPlay`: khung Stitch đưa class thẻ câu vào (M1/Truyện không đổi). |
| `lookup-card.js` | `LookupCard.open(anchor, { text, info?, sentence, sentenceTr, title, lang })`: nghĩa + def + ngữ cảnh + lưu SRS; đóng bằng Esc, ✕ hoặc chạm ra ngoài. Khi đã nạp khung `ST2['watch-lookup']` → bottom sheet theo mẫu Stitch (Lưu vào ôn tập cam + Đã biết viền, ✕/Esc/chạm lớp mờ); `sheet:false` hoặc chưa nạp khung → thẻ nổi M1. |
| `player.js` | Route `#/watch` (danh sách), `#/watch/<id>`: sân khấu + điều khiển + 4 chế độ + thanh công cụ; dùng 1 vòng rAF. Clip `teacher` + có khung Stitch v2 → `ST2.mount(view, 'watch' | 'watch-mini')` (khung tự sinh từ `brand/stitch/v2/watch*-light|dark.html` + `bind/watch*.json`, CSS `st-v2-watch*.css`); thẻ câu mẫu = khuôn class cho transcript; Ama trái / Carlos phải qua `LessonTeacher`; **Ẩn sân khấu** ↔ `watch-mini` (audio ngoài DOM, không ngắt); ← / Esc = quay lại (`#/skills` dự phòng). Clip `video` / thiếu khung → M1. |
| `css/media.css` | Kiểu tạm M1, chỉ dùng token màu của style.css (sáng/tối). |
Cue = `{ i, who, start, end, text, tr, words[{w,s,e}] }`, cùng dạng `Stories.timeline()`. `LessonTeacher` có thêm `talk(on)` để trình phát điều khiển miệng giáo viên theo audio.

## 4. Phối hợp với Truyện/Podcast
- Phiên Truyện giữ `web/js/stories/*`, `content/stories/*` và UI reader/podcast. `timeline()`/`sentenceAt()` chỉ có ở `stories/core.js`.
- Phiên này giữ `web/js/media/*`. Reader/podcast gọi `MediaTranscript.mount` (`getTime` = `audio.currentTime`) và `LookupCard.open`, không viết karaoke hay popup tra từ riêng. Định dạng dịch chung: `tr{lang}`; cụm từ chung: `phrases{key:{def,tr}}`.

## 5. Giọng + mốc giờ (CI `media-clips.yml`, 0 credit)
PR sửa `content/media/clips/**` sẽ kích hoạt CI. Các bước:
1. `scripts/media/voice-clips.mjs` tạo giọng Kokoro từng câu (`scripts/cine/tts.mjs`, −16 LUFS), ghép thành 1 file (Kokoro 0,75×, đệm 0,3 s, nghỉ 0,7 s) và xuất `web/media/clips/<id>.mp3` 64 kbps.
2. **Mốc câu = vị trí thật của từng file trong bản ghép**, nên đúng tuyệt đối theo audio. **Mốc từ** lấy từ faster-whisper base.en chạy trên từng câu (`scripts/video/align.py`, có snap onset), khớp ngược về từ kịch bản; từ không khớp thì nội suy.
3. Kết quả ghi vào `content/media/timing/<id>.json`, rồi `build-clips.mjs` xuất `web/data/media/*`, chạy `media.mjs --strict` và bot commit vào nhánh PR. Sau đó cần 1 commit thường để npm-test chạy lại.
4. Cổng strict: mốc câu tăng dần và không chồng nhau, mốc từ nằm trong câu, độ khớp whisper ≥ 0,6/câu và trung bình ≥ 0,85, tốc độ 80–150 wpm (từ / quãng câu đầu → câu cuối), có mp3, dữ liệu khớp nguồn.
5. Lượt đầu (01/11): Kokoro 0,9× ra ~200 wpm → cổng chặn; 0,75× + nghỉ 0,7 s → coffee-to-go 20,4 s / 132 wpm, monday-plan 23,6 s / 135 wpm; whisper khớp kịch bản 100 % mọi câu.

## 6. Kế hoạch
- **M1** (PR này): lõi + transcript + 4 chế độ + thẻ tra + 2 clip mẫu (coffee-to-go A2 Ama↔Carlos, monday-plan B1 Carlos) + test + CI giọng/mốc giờ. Route `#/watch` chỉ mở được qua URL, chưa có lối vào giao diện.
- **M2** (Stitch, chờ chủ duyệt ảnh trước khi viết code): 4 màn × sáng/tối gồm (a) trình phát + transcript (Phụ đề, bản dịch bật), (b) Shadowing sau khi chấm, (c) Chính tả sau Kiểm tra, (d) thẻ tra cụm từ + Lưu. Thêm danh sách clip + thanh công cụ thu gọn trên mobile 390 px. Dùng design system Kit hiện hành, tương phản AA, chạm ≥ 44 px, chỉ nhân vật 2D Ama/Carlos, không dùng chữ hay logo của app tham khảo. Gửi anh ảnh 8 màn, chờ OK.
  - Port (01/11, PR #344): player + transcript (mini) + thẻ tra từ đã vào app qua bộ chuyển `scripts/stitch-v2-convert.mjs` (watch, watch-mini, watch-lookup). Bảng Shadowing/Chính tả vẫn dùng kiểu M1 trong khung đến khi có mẫu (b)(c). Chưa có lối vào (M3).
- **M3** (sau khi duyệt): port màn Stitch vào `player.js`/`media.css` (theo `docs/stitch-html-port`), thêm lối vào (thẻ Luyện tập + deep link `lexkite.com/app/#/watch`), sửa SW precache, e2e mobile (Playwright 390×844, sáng/tối: phát → tô sáng/tự cuộn → tua → bản dịch 3 ngôn ngữ (vi/ja/ar RTL) → tra + lưu SRS → Shadowing (micro giả) → Chính tả → Điền từ). Sau đó cho phiên Truyện/Podcast nối `MediaTranscript` vào reader.
- Về sau: thêm clip theo lô (gen kịch bản + bản dịch qua pipeline + cổng), video teach2d dựng sẵn (`kind: video`), tiến độ/XP mỗi clip.
