# Phép thử A/B giọng đọc: Kokoro ↔ ElevenLabs

> TL;DR: Tìm MỘT giọng MIỄN PHÍ, đồng nhất, dùng mọi nơi (chủ chốt 1/11): Kokoro dựng sẵn cho nội dung tĩnh + ứng viên miễn phí cho phần đọc động (kokoro-js trong trình duyệt, Piper, MeloTTS Workers AI), chấm trên CI cùng bộ câu. ElevenLabs KHÔNG phải ứng viên đăng ký – chỉ là thước đo trần chất lượng (≤ 10.000 credit miễn phí).
> Đọc khi: chọn/đổi engine giọng đọc, chạy lại phép thử, xem sổ chi ElevenLabs.

## Cách chạy (chỉ CI – `.github/workflows/tts-ab.yml`, chạy tay)
Theo [CREDIT-RULES.md](CREDIT-RULES.md): làm phần 0 credit trước, dry-run, pilot, soát, rồi mới batch.
1. `phase=dryrun` (0 credit): dựng bộ câu (`scripts/tts-ab/texts.mjs`) và in ký tự/credit từng cấu hình. Nếu có khóa: đọc số dư và kiểm giọng.
2. `phase=kokoro` (0 credit): `scripts/tts-ab/kokoro.mjs` → `kokoro-video` (Ama af_bella / Carlos am_fenrir, tốc độ 0,8 như teach2d) + `kokoro-app` (af_heart / am_michael, 1,0).
3. `phase=pilot max_credits=400`: 10 mục, 300 ký tự, cấu hình `el-v2-a`. Nghe và soát điểm trước.
4. `phase=free` (0 credit): ứng viên đọc động miễn phí + độ phủ (dưới).
5. `phase=batch max_credits=7000 reuse_runs=<kokoro>,<pilot>`: phần còn lại (bỏ file đã có) + chấm chung mọi cấu hình.
- Cấu hình ElevenLabs (`scripts/tts-ab/eleven.py`): `el-v2-a` = eleven_multilingual_v2, giọng 1 (Ama: Sarah, Carlos: Brian), toàn tập.
  `el-v2-b` = cùng model, giọng 2 (Jessica, Chris), tập core. `el-flash-a` = eleven_flash_v2_5, giọng 1, tập core.
- Trần cứng: `max_credits` mỗi lượt, cộng `APPROVED_TOTAL = 10000` so với số đã dùng của tài khoản. Trần tính thận trọng 1 credit/ký tự cho mọi model.
  2 lỗi liên tiếp thì dừng. Sổ chi: `ledger-<run>.json` trong artifact `tts-ab-audio-<run>`, và bảng ở tóm tắt lượt chạy.
- Khóa: secret repo `ELEVENLABS_API_KEY` do chủ tạo. Không in ra, không hỏi trong chat.

## Ứng viên đọc động miễn phí (`phase=free`)
- `scripts/tts-ab/web.mjs` + `web/worker.js`: kokoro-js trong Chromium, Web Worker, trang KHÔNG cô lập cross-origin (WASM 1 luồng như app thật):
  wasm q8, wasm q4, webgpu fp32 (CI không GPU → SwiftShader; lỗi thì ghi lỗi). Giọng video của giáo viên, tốc độ 0,8 → so với file dựng sẵn cùng voice id.
  Đo: thời gian ra tiếng (câu dài: đoạn đầu của `tts.stream`), RTF, byte model tải khi khởi động lạnh, thời gian tải.
- `scripts/tts-ab/free.py --engine piper` (en_US-lessac/ryan-medium, CPU) và `--engine melo` (@cf/myshell-ai/melotts, kho CF_POOL từ 3/4 kho, không tài khoản chính).
- Chấm thêm `sim`: cosine phổ trung bình dài hạn so với bản kokoro-video CÙNG mục (cùng voice id ≈ 1,0) → thước đo "một giọng đồng nhất".

## Quyết định đọc động (chủ, 03/11)
- **Phần cố định** trong mã nguồn app (corpus `scripts/sentence-audio/corpus.mjs`) do CI `audio.yml` dựng sẵn bằng Kokoro.
- **Chữ động** do kokoro-js đọc trên máy người dùng ([specs/kokoro-on-device.md](specs/kokoro-on-device.md)). Máy yếu thì dùng giọng máy.
- Không thu thập chữ người dùng thiếu file, không có hàng đợi làm bù. Như vậy chi phí không tăng theo số người dùng, không có dữ liệu riêng tư lên máy chủ, và CI dừng thì người dùng không bị ảnh hưởng.

## Độ phủ (`scripts/tts-ab/coverage.mjs`)
% chuỗi app sẽ phát có file dựng sẵn đúng khóa (quy tắc của `web/js/ui.js`): từ đơn audio/w theo giọng Mỹ/Anh, câu ví dụ, rảnh tay, kho câu
`collect()`; cộng danh sách chỗ phát luôn rơi về speechSynthesis (theo mã).

## Bộ câu (139 mục, 4.432 ký tự; core 36 mục, 1.111 ký tự)
50 từ + câu ví dụ (lexicon `content/lexicon/expand/20261031.json`), 20 câu thoại teach2d, 18 ca khó
(đồng tự khác âm read/lead/wind/record/close/wound, số/ngày/tiền/điện thoại, cặp tối thiểu, cách đọc Mỹ), 1 đoạn kể chuyện ~1.000 ký tự.

## Chấm (`scripts/tts-ab/score.py`)
- **WER:** dùng đúng `wer()` và `WER_MAX` (≤ 10 %) của cổng [ASR câu](WORD-AUDIO.md). Từ ≤ 3 chữ được đạt thêm theo tiêu chí từ đơn.
- **Nhịp:** wpm của câu ≥ 6 chữ, bỏ lặng đầu/cuối, trần 150.
- **Âm lượng:** LUFS và true peak (ffmpeg ebur128), cùng số file có mẫu chạm trần.
- **Khẩu hình:** Rhubarb 1.13 có chạy được không, số khẩu hình/giây, và tỉ lệ khung "miệng mở ↔ có tiếng" khớp nhau.
- **Độ trễ:** ElevenLabs đo TTFB/tổng thời gian qua mạng. Kokoro đo thời gian tạo trên CPU CI, nên hai số không cùng loại.
- **Nghe mù:** trang Artifact A/B lấy audio từ artifact, tên file ngẫu nhiên, chủ chấm MOS 1–5.

## Giấy phép
Audio gói free của ElevenLabs chỉ dùng phi thương mại và phải ghi nguồn. Vì vậy **không file nào của phép thử này được đưa vào sản xuất** (không đẩy kho media, không commit audio).
ElevenLabs chỉ dùng làm mốc so sánh.
