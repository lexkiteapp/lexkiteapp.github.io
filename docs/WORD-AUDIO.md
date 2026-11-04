# Giọng đọc từ đơn (audio/w) – bản s3

> TL;DR: Giọng đọc từ đơn (audio/w) bản s3: vấn đề, thí nghiệm word-audio-lab, cách làm hiện tại, giấy phép, kết quả. Không nới ASR; từ không đạt dùng giọng máy.
> Đọc khi: sửa âm thanh từ.

Mục tiêu: mọi file phát âm từ đơn trên `audio.lexkite.com/audio/w/` phải ĐÚNG. Quy tắc chủ sản phẩm: chất lượng chỉ đi lên –
không nới kiểm tra ASR, không bỏ từ; từ không đạt dùng giọng máy của thiết bị và nằm trong danh sách công khai có lý do.

## Vấn đề (25/10)
- Kokoro-82M đọc từ đứng một mình (2–6 âm vị) hay bịa âm: `away` → "The way", `after` → "laughter", `see` → "Save", `walk` → "Work",
  `just` → "Adjust". faster-whisper small.en nghe lại 100 file cũ ngẫu nhiên: 24 sai. Từ dạng mạnh (to/for/the…): chỉ 16/35 đạt cả 2 giọng.
- Nguyên nhân: đầu/cuối phát ngôn rất ngắn là vùng mô hình kém ổn định (style của Kokoro chọn theo độ dài chuỗi; chuỗi 2–6 token ít dữ liệu),
  bf_emma còn thêm đuôi "-y" ở cuối câu ("justy", "breakfasty").

## Thí nghiệm (`.github/workflows/word-audio-lab.yml`, `scripts/word-audio/lab.mjs` + `lab.py`)
20 từ khó (away, after, see, walk, just, to, for, the, of, and, a, be, we, or, so, do, upon, into, there, some) + outpost, photograph,
ice-cream, breakfast × 2 giọng = 48 (từ, giọng). Tỉ lệ đạt (Whisper small.en + độ dài, tiêu chí không đổi):

| phương án | q8 | fp32 |
|---|---|---|
| A. từ trơn, tốc độ 0,95 (cách cũ) | 25 | 29 |
| C. "từ." tốc độ 0,9 | 26 | 25 |
| C'. "từ." tốc độ 1,0 | 36 | 37 |
| B. đệm "… " / ", " trước từ (lab 1, q8, 20 từ) | 10/40 · 7/40 | – |
| D. style của chuỗi 40 token (lab 1, q8) | 9/40 | – |
| E. câu mang "Next word. X." + cắt theo Whisper | 32 | 32 |
| E. câu mang "The word is: X." + cắt theo Whisper | 37 | **39** |
| Piper (en_GB-cori-high / en_US-ljspeech-high, lab 1) | 19/40 | – |
| Gộp mọi phương án (lấy bản đầu tiên đạt) | 45 | **46** |

- Câu mang đọc trọn câu đúng gần như tuyệt đối ("The word is away." 40/40), nhưng Kokoro không ngắt hơi giữa câu mang và từ
  (dấu ":" / "." gần như không có lặng) → cắt theo khoảng lặng thất bại; cắt theo mốc thời gian từng chữ của Whisper + chỗ trũng năng lượng thì được.
- Kokoro-82M không trả độ dài âm vị (ONNX chỉ có `waveform`) → không cắt theo duration được.
- Piper không tốt hơn Kokoro và đổi âm sắc → không dùng.
- fp32 đạt nhiều hơn q8 và tạo nhanh hơn trên CPU của CI (192 bản: 3 phút so với 8 phút).

## Cách làm hiện tại
- Kokoro-82M **fp32**, cùng giọng bf_emma / af_heart (âm sắc không đổi). `scripts/word-audio/kokoro.mjs` `METHODS` theo thứ tự:
  `cut_wordis` ("The word is: X.", 0,9 → cắt) → `dot100` ("X.", 1,0) → `cut_wordis100` → `cut_next` → `plain095` → `dot090`.
  Từ dạng mạnh (to/for/the… – `scripts/word-audio-strong.mjs` `STRONG`) dùng phiên âm viết tay dạng trích dẫn trong mọi phương án.
- Cắt (`asr_lib.cut_last`): Whisper (word_timestamps) phải nghe ra đúng từ ở cuối câu; điểm cắt = chỗ trũng năng lượng quanh mốc đầu từ
  (2 điểm thử), đuôi kéo tới khi tắt (−45 dB) + 60 ms, fade vào 8 ms / ra 25 ms.
- Mọi bản thử qua `scripts/word-audio/asr_lib.py`: chữ Whisper nghe được (chuẩn hoá) phải đúng từ hoặc đồng âm trong `HOMO`, độ dài
  0,15 s … min(3 s, max(1,6 s, 0,6 + 0,09 s × số chữ)). Chỉ file đạt được chép ra `.media-out/` và đẩy lên kho media.
- Khóa file: `fnv(giọng|từ|s3)` (`scripts/word-audio-strong.mjs` `WAV`). CDN đệm 1 năm → đổi cách tạo thì đổi hậu tố, không ghi đè khóa cũ.
  App (`web/js/ui.js`), add-on (`extension/newtab.js`) chỉ giữ hằng `WAV` – không có danh sách từ.
- Trạng thái: `web/audio/w/s3.tsv` (`từ \t bf_emma \t af_heart`, `ok` hoặc lý do trượt) = danh sách dùng giọng máy, xem được;
  `web/audio/w/index.txt` = từ có ≥ 1 giọng đạt (cờ "có file" cho Lex/newtab); `web/audio/w/s3-stats.json` = cộng dồn trước/sau.
- `word-audio.yml`: cron mỗi 4 giờ, 5 shard song song, mỗi shard ≤ 400 từ, tiếp tục được (từ chưa có kết quả cuối cho cả 2 giọng được làm lại).
  Vòng 1 = phương án đầu của `METHODS`; vòng 2 = các phương án còn lại cho (từ, giọng) trượt.
- ci-triage không bao giờ "Re-run" lượt đã bị thay thế (có lượt mới hơn hoặc workflow/script/module đã đổi) – `supersededWhy` trong `scripts/ci/triage.mjs`.

## Phát trên máy người dùng (`web/js/audio.js` – LKAudio)
- Mở khóa ở lần chạm đầu (iOS Safari), một kênh giọng đọc (giọng mới dừng giọng cũ, kể cả giọng máy; sfx không tính).
- Mỗi file: thử lần lượt `AUDIO_BASES` (lỗi/404/quá 7 giây → gốc kế tiếp), hết gốc mới dùng giọng máy đúng người nói (Ama nữ, Carlos nam, UK/US);
  dự phòng ghi `console.info('[audio] dự phòng …')` + đếm theo ngày ở `localStorage lk.audio.fb`.
- Gói nghe offline (mặc định tắt, nút trong Cài đặt sau cờ `offline_pack`): `web/data/offline-pack.json` (~3000 từ đầu của s3.tsv,
  `scripts/audio/offline-pack.mjs`, word-audio.yml tự cập nhật) + audio bài đang học → cache `lk-offline` của `web/sw.js`, trần 40 MB.
- Test: `scripts/test/audio-voice.mjs`, `scripts/test/audio-play.mjs` (Chromium + WebKit, `.github/workflows/audio-play.yml`).

## Giấy phép
- Kokoro-82M (hexgrad) – Apache-2.0; kokoro-js – Apache-2.0; giọng bf_emma, af_heart đi kèm mô hình (Apache-2.0).
- faster-whisper – MIT; Whisper small.en (OpenAI) – MIT. Chỉ dùng trên CI để kiểm, không phát hành.
- Piper (đã thử làm dự phòng, KHÔNG dùng): `piper-tts==1.2.0` – MIT (bản 1.3+ là piper1-gpl, GPL-3); espeak-ng (phiên âm) – GPL-3, chỉ chạy trên CI.
  Giọng thử: en_GB-cori-high (dữ liệu LibriVox – public domain), en_US-ljspeech-high (LJ Speech – public domain).

## Kết quả lượt s3 đầu (run 40205506275, 25/10)
- 1499 từ (35 từ dạng mạnh + 909 từ có file cũ + từ NGSL tiếp theo) × 2 giọng: file s3 đạt 2844/2998 (94,9 %); file cũ cùng các từ: 1374/1820 (75,5 %).
- 126 từ có ≥ 1 giọng dùng giọng máy (s3.tsv). Nhiều từ là đồng âm thật (weight/wait, son/sun, plane/plain, wear/where, route/root) –
  Whisper không phân biệt được khi không có ngữ cảnh; theo quy tắc không nới tiêu chí, chúng giữ giọng máy tới khi có cách kiểm tốt hơn.

## Audio câu (audio/l) – cổng ASR (31/10, [spec việc 3](specs/audio-quality.md))
- `.github/workflows/sentence-audio-asr.yml`: tiếp tục được (câu chưa có kết quả cuối trong `web/audio/l/asr.tsv` được làm lại), shard song song.
  Danh sách câu: `scripts/sentence-audio/todo.mjs` (kho câu dùng chung với `scripts/gen-audio.mjs` – `scripts/sentence-audio/corpus.mjs`).
- Tiêu chí (`scripts/sentence-asr.py`, KHÔNG nới): faster-whisper small.en (cùng `asr_lib.hear`) nghe file đang phục vụ;
  sau chuẩn hoá Whisper (EnglishTextNormalizer + `CANON`: cách viết cùng lời đọc như OK/okay, Web site/website, đổi đối xứng hai bên) **WER ≤ 10 %**. Cụm ≤ 3 chữ (từ vựng đọc đơn) đạt thêm nếu đúng tiêu chí từ đơn ở trên (đồng âm `HOMO`).
- Trượt → `scripts/sentence-audio/render.mjs`: Kokoro fp32, cùng giọng của câu; câu: tốc độ 1,0 → 0,92 → 1,08; cụm ≤ 3 chữ: `METHODS` ở trên.
  Bản đầu tiên qua lại cổng → mp3 64 kbps khóa mới `<khóa>-s2.mp3` (không ghi đè khóa cũ), `LISTEN_AUDIO_S2` trong `web/js/listen/audio-index.js`,
  `web/js/ui.js` `audioUrl` tự trỏ sang. Vẫn trượt → `web/audio/l/asr-fail.tsv` (lý do: chữ Whisper nghe, WER), app phát bản cũ.
- 1/11: EnglishTextNormalizer xoá chữ trong ngoặc mà Kokoro đọc to ("(D) A man…") → `norm` bỏ dấu ngoặc trước (hai bên, ngưỡng giữ nguyên; 129/450 câu dài trượt oan); `--selftest` chạy trước mỗi shard.
  Câu trượt thử lại bằng `retry_fail` (dispatch; `todo.mjs --retry-fail`, `merge.mjs` chỉ ghi đè "fail"). Cụm ≤ 3 chữ có thêm phương án theo phiên âm từ điển (`scripts/word-audio/ipa.mjs`, hậu tố `_ipa`).
- Số liệu: `web/audio/l/asr-stats.json`; test `scripts/test/sentence-asr.mjs` (trong `npm test`). Câu mới từ `gen-audio.mjs` xuất 64 kbps và qua cổng ở lượt sau.
- Chưa làm: newtab add-on (`extension/newtab.js`) vẫn phát bản cũ cho từ có `-s2` (bản cũ còn trên CDN).
- Lượt thử 300 câu (run 41211034940, 31/10): bản đang phục vụ đạt 282/300 (94,0 %); sau render lại đạt 295/300 (98,3 %).
  Trượt thật: từ đơn đọc sai (wine → "Wind", reap → "rape", farm → "Thumbed"). Khoảng 2 s/câu (small.en int8) → 25k câu ≈ 15–20 giờ máy, 6 shard × 1500 câu/lượt.

## Độ phủ – một giọng Kokoro mọi nơi (1/11)
- `scripts/audio/coverage.mjs`: mọi nhóm nội dung tĩnh app đọc to (kho `scripts/sentence-audio/corpus.mjs` gắn `groups`; từ = `s3.tsv` hoặc khóa câu cùng giọng). Thiếu = giọng máy (mỗi máy một giọng) → mục tiêu 0.
- Sàn `web/audio/coverage.json` chỉ lên: `audio.yml` chạy `--ratchet` sau mỗi lượt; `scripts/test/audio-coverage.mjs` (npm test) đỏ khi nhóm tụt dưới sàn quá `GRACE` = 25 câu mới chưa render. Mở rộng nhóm = nhóm mới, không nhét vào nhóm cũ.
- Nhóm theo accent người học có cả `bf_emma` lẫn `af_heart` (trước 1/11 câu ví dụ, bài đọc, câu trả lời mẫu chỉ có giọng Anh). Lời giáo viên #/lesson: khóa cả câu theo giọng nhân vật; thiếu → `UI.tts` thử từng câu rồi mới giọng máy.
- `web/js/listen/audio-index.js` dạng nén Rice (`scripts/sentence-audio/keyset.mjs`, ≈ 18 bit/khóa; 2/11 dạng chuỗi 48,5k khóa = 207 KB gzip vượt ngân sách 160 KB/tệp). Đọc bằng `readIndex` (chạy tệp), không regex.
- CI nghe tệp thẳng từ gốc Pages kho media (`asr_lib.ORIGINS`, khớp `workers/audio/index.js`), không qua Worker audio.lexkite.com: gói Free 100k lượt/ngày, 2/11 các lượt nghe làm hết hạn mức (lỗi 1027) cho cả người dùng.
- `audio.yml`: ma trận shard động `scripts/ci/shards.mjs` = min(24, 40 − job đang chạy − 8, ⌈câu/500⌉) (chỉ job đang chạy, không đếm xếp hàng). Commit chỉ mục: `scripts/ci/commit-regen.sh` sinh lại trên main mới nhất thay vì rebase tệp 1 dòng (audio.yml + sentence-audio-asr.yml).
- **Chỗ gọi** (3/11): `scripts/audio/tts-sites.mjs` quét mọi file đọc to (`UI.tts/speak/sayBtn`, `data-saysent`, `data-speak-text`, giáo viên `.say`, `speechSynthesis` trực tiếp) trong `web/js` + add-on; mỗi file phải khai trong `scripts/audio/tts-sites.json` (nhóm Kokoro và/hoặc `dynamic`: lý do). File đọc to mới chưa khai → `scripts/test/tts-sites.mjs` (npm test) đỏ. Lần quét đầu tìm thêm 2 nhóm tĩnh chưa đo: `ideas` (720 câu) + `say-native` (28). `audio-coverage.mjs` trước 3/11 chưa từng nằm trong `scripts/test/suite.txt` (cổng mù) – nay đã nối. `audio.yml` còn chạy khi nguồn corpus đổi trên main (push.paths; test khóa danh sách khớp `corpus.mjs`), không chỉ cron đêm.
- Ngoài phạm vi: nghĩa tiếng mẹ đẻ ở Học rảnh tay (15 ngôn ngữ, Kokoro không có tiếng Việt) và câu động (AI, tra trang) – xem [TTS-AB](TTS-AB.md).
