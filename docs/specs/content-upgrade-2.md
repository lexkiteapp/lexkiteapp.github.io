# Nâng cấp nội dung Đợt 2 (05/11/2026, chủ duyệt hướng)

> TL;DR: Thứ tự thực hiện + cổng của Đợt 2 (gộp lô đã viết, Opus mở khoá O1–O6, Sonnet viết lô). Không lặp số liệu: đích/trọng số ở `CONTENT-WORLD-PLAN.md` §6, lô + trạng thái O1–O6 ở `content-lots.md`, điểm sống ở `content/pipeline/SCORE.md`.
> Đọc khi: mở phiên content-lead, phiên Sonnet viết lô, hoặc trưởng gộp xếp hàng PR nội dung.

## 1. Vì sao chậm (đo 05/11, không đoán)
1. Lô đã viết nhưng chưa gộp (tình huống Play & Speak, #430) → main chưa tăng điểm.
2. Lô Opus mở khoá O2–O6 chưa làm → 30+ lô Sonnet bị chặn (cột "Chặn bởi" trong [content-lots.md](../content-lots.md)).
3. Hàng PR dài, CI kín → mỗi lô 1 PR nhỏ, gộp xong mới mở lô kế.

## 2. Ba làn (≤ 2 phiên làm việc + trưởng gộp)
| Làn | Ai | Thứ tự |
|---|---|---|
| A · Gộp | trưởng gộp | PR tình huống → #430 → mọi PR `lot/*` xanh |
| B · Mở khoá | 1 phiên Opus "content-lead" | O2 Cambridge → O5 native-score + 3 bài en gốc → O3 trung gian → O4 band 6/7 → O6 |
| C · Viết | 1 phiên Sonnet, ≤ 1 PR mở | S-CALL → S-RP → (sau O2) S-CAM → (sau O5) S-EN → S-SKILL → S-GRAM |
| Đêm CI | workflow sẵn có | lexicon-expand, vimg (CF_POOL ≤ 0,6), lexicon-i18n, audio Kokoro cho lô vừa gộp |

UI màn học: không mở tính năng mới khi > 15 PR mở; màn của lô mới (Cambridge, trung gian) dùng khung có sẵn (ExamKit / khung bài tập Stitch), không tự vẽ CSS.

## 3. Cổng QC (mọi lô, không hạ ngưỡng)
- `scripts/content-qa/gate.mjs` + cổng riêng lô (cột "Cổng phải xanh" trong content-lots.md); `content:score` chỉ tăng.
- Opus đọc ≥ 10 % mỗi lô, sai > 2 % → trả lô.
- Âm thanh: Whisper khớp ≥ 98 %, −16 LUFS; ảnh: TEXT_OBJ + khớp `word#pos`; UI: frame 390 px, tương phản 4,5:1, nút Thoát.
- Đầu ra: mỗi đề/bài có phần sản sinh nói/viết có phản hồi (mục tiêu nói + viết tự tin sau 3–6 tháng).

## 4. 15 ngôn ngữ, âm thanh, hình – 100 % miễn phí
Giải thích viết gốc tiếng Anh, rồi viết thẳng từng L1 (không qua tiếng Việt) – cổng `native-score` (O5). Giọng Kokoro trên CI, ảnh CF free pool; việc nặng chạy CI theo shard.

## 5. Xong khi
SCORE ≥ 60 → ≥ 75 → ≥ 95 theo mốc ở `CONTENT-WORLD-PLAN.md` §6. Mỗi lô: PR xanh + gộp + audio CI xong + điểm trước→sau ghi trong PR.
