# Phép thử A/B giọng đọc: Kokoro ↔ ElevenLabs

> TL;DR: So giọng Kokoro (đang dùng, 0 đồng) với ElevenLabs trên CÙNG bộ câu, chấm tự động trên CI + nghe mù A/B; chủ chỉ mua gói nếu ElevenLabs hơn rõ. Ngân sách: ≤ 10.000 credit (chủ duyệt 1/11), kế hoạch ~6.700.
> Đọc khi: chọn/đổi engine giọng đọc, chạy lại phép thử, xem sổ chi ElevenLabs.

## Cách chạy (chỉ CI – `.github/workflows/tts-ab.yml`, chạy tay)
Theo [CREDIT-RULES.md](CREDIT-RULES.md): làm phần 0 credit trước, dry-run, pilot, soát, rồi mới batch.
1. `phase=dryrun` (0 credit): dựng bộ câu (`scripts/tts-ab/texts.mjs`) và in ký tự/credit từng cấu hình. Nếu có khóa: đọc số dư và kiểm giọng.
2. `phase=kokoro` (0 credit): `scripts/tts-ab/kokoro.mjs` → `kokoro-video` (Ama af_bella / Carlos am_fenrir, tốc độ 0,8 như teach2d) + `kokoro-app` (af_heart / am_michael, 1,0).
3. `phase=pilot max_credits=400`: 10 mục, 300 ký tự, cấu hình `el-v2-a`. Nghe và soát điểm trước.
4. `phase=batch max_credits=7000 reuse_runs=<kokoro>,<pilot>`: phần còn lại (bỏ file đã có) + chấm chung mọi cấu hình.
- Cấu hình ElevenLabs (`scripts/tts-ab/eleven.py`): `el-v2-a` = eleven_multilingual_v2, giọng 1 (Ama: Sarah, Carlos: Brian), toàn tập.
  `el-v2-b` = cùng model, giọng 2 (Jessica, Chris), tập core. `el-flash-a` = eleven_flash_v2_5, giọng 1, tập core.
- Trần cứng: `max_credits` mỗi lượt, cộng `APPROVED_TOTAL = 10000` so với số đã dùng của tài khoản. Trần tính thận trọng 1 credit/ký tự cho mọi model.
  2 lỗi liên tiếp thì dừng. Sổ chi: `ledger-<run>.json` trong artifact `tts-ab-audio-<run>`, và bảng ở tóm tắt lượt chạy.
- Khóa: secret repo `ELEVENLABS_API_KEY` do chủ tạo. Không in ra, không hỏi trong chat.

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
Muốn dùng trong app thì phải có gói trả phí (từ Starter trở lên) và render lại.
