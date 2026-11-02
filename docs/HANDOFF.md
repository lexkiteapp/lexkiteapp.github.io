# Bàn giao – trạng thái việc đang chạy

> TL;DR: Một trang ngắn: việc nền đang chạy, số liệu mới nhất, việc tiếp theo, việc chờ chủ. Cập nhật mỗi mốc (≤ 6 dòng mỗi mục), không chép lại tài liệu khác.
> Đọc khi: đầu phiên, trước khi nhận việc ảnh từ vựng / kho từ 20k.

Cập nhật: 29/10/2026.

Phương pháp chung cho mọi pipeline nội dung: `docs/QUALITY-PIPELINE.md` (pilot mẫu khó trên nhánh → đạt mới hàng loạt).

## Ảnh từ vựng (`vocab-img-scene`) – e4 trên main, chạy tự động (29/10)
- Vẽ `flux-2-klein-4b` qua CF_POOL (10k neuron / 24 giờ TRƯỢT mỗi tài khoản). Cơ chế + bài học: `docs/VOCAB-IMG-STYLE.md` §11; phương pháp: `docs/QUALITY-PIPELINE.md`.
- e4 đã gộp (pilot 40 nghĩa khó run 40865517506: 15/60 ảnh = 25 %, 11 nhận, sai nghĩa 1 = general#adj vì câu kiểm chỉ tả cảnh). Sửa thêm abb23df6: viết thẻ song song + hạn 35 phút, chỉ vẽ nghĩa có thẻ e4, `cardWins` lưu thẻ e4.
- Fill e4 đầu (run 40897839512): 272 nhận / 1.826 vẽ = 14,9 %/ảnh (e3: 2–7 %). Kho: 1.564 ảnh, 1.431/3.290 thẻ e4.
- Phiên kho từ TỰ đặt `VIMG_SCHEDULE`/`VIMG_CHAIN` = 0 quanh mỗi pilot, xong đặt lại 1. Probe tự kích fill khi phần vẽ ≥ 15 tài khoản.
- Còn ngỏ: câu `check` của thẻ đôi khi chỉ lặp câu cảnh, không hỏi nghĩa (general#adj) → giám khảo nghĩa qua oan; theo dõi tỉ lệ sai trong tờ ảnh.

## Kho từ 20k (`lexicon-expand`) – BẬT hàng loạt 30/10 (LX_PILOT=0, LX_N=600 – đo 14 s/từ, timeout 200 phút; LX_RETRY=1)
- Cổng "ra là ok": khoá nghĩa Wiktionary↔WordNet 3/3, ví dụ CHỈ người viết, vi = Wiktionary + ≥ 1 AI, 12 ngôn ngữ = AI ∩ (OMW/Wiktionary), mọi trường qua trắc nghiệm nghĩa `lxwsd` 3 giám khảo khác họ (gpt-oss · Gemini 3.x · qwen3.8); bài học L1–L8/D1–D3 ở docs/LEXICON.md.
- Pilot 9 mẫu cố định (`content/lexicon/expand/pilot/hard.json`, run 41050558083): LÕI 1/50 · DỊCH 0/50 · IPA 0 · nhãn xấu lọt 0 · yield 0.16 → `pilot/yield.json`; chuỗi tự dừng khi yield < 0.08.
- Đã đưa 2.701 mục cũ (7 lô pending + hàng duyệt) về `retry/words.json` làm lại bằng luật mới; 98 mục keep:false giữ ở hàng duyệt.
- Lượt đầu 41094203295: 600 mục → 155 đạt (yield 0.26); lô 20261030 soát 50 (sai 1) → xuất 154 (#236). Xuất: `promote.mjs <lô> --checked` sau soát mẫu. Trần: 14.056 ứng viên × 0.16 ≈ +2,2k → kho ~10,5k; 20k cần mục đa nghĩa/đa từ loại (phiên riêng).
- AI: `ai-pool` đọc danh sách mô hình thật (GEMINI_POOL 85 + GROQ_POOL 109 khoá, không in khoá); CF_POOL chỉ dự phòng (cạn khi ảnh chạy).

## Chờ chủ
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
