# Giọng đọc từ đơn (audio/w) – bản s3

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

## Giấy phép
- Kokoro-82M (hexgrad) – Apache-2.0; kokoro-js – Apache-2.0; giọng bf_emma, af_heart đi kèm mô hình (Apache-2.0).
- faster-whisper – MIT; Whisper small.en (OpenAI) – MIT. Chỉ dùng trên CI để kiểm, không phát hành.
- Piper (đã thử làm dự phòng, KHÔNG dùng): `piper-tts==1.2.0` – MIT (bản 1.3+ là piper1-gpl, GPL-3); espeak-ng (phiên âm) – GPL-3, chỉ chạy trên CI.
  Giọng thử: en_GB-cori-high (dữ liệu LibriVox – public domain), en_US-ljspeech-high (LJ Speech – public domain).

## Kết quả lượt s3 đầu (run 40205506275, 25/10)
- 1499 từ (35 từ dạng mạnh + 909 từ có file cũ + từ NGSL tiếp theo) × 2 giọng: file s3 đạt 2844/2998 (94,9 %); file cũ cùng các từ: 1374/1820 (75,5 %).
- 126 từ có ≥ 1 giọng dùng giọng máy (s3.tsv). Nhiều từ là đồng âm thật (weight/wait, son/sun, plane/plain, wear/where, route/root) –
  Whisper không phân biệt được khi không có ngữ cảnh; theo quy tắc không nới tiêu chí, chúng giữ giọng máy tới khi có cách kiểm tốt hơn.
