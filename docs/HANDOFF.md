# Bàn giao – trạng thái việc đang chạy

> TL;DR: Một trang ngắn: việc nền đang chạy, số liệu mới nhất, việc tiếp theo, việc chờ chủ. Cập nhật mỗi mốc (≤ 6 dòng mỗi mục), không chép lại tài liệu khác.
> Đọc khi: đầu phiên, trước khi nhận việc ảnh từ vựng / kho từ 20k.

Cập nhật: 26/10/2026.

## Ảnh từ vựng (`vocab-img-scene`) – ĐANG CHẠY hàng loạt
- Vẽ `flux-2-klein-4b` (thắng A/B 40 nghĩa khó) thẳng trên Workers AI qua kho tài khoản secret `CF_POOL` (`scripts/lib/cf-pool.mjs`, `scripts/vocab-img/cf-direct.mjs`). GrabCast KHÔNG dùng nữa (500 từ 24/10).
- Tự nối lượt: fill xong còn neuron + còn nghĩa thiếu → tự gọi lượt kế (tắt: biến `VIMG_CHAIN=0`); cron 8 lượt/ngày (`40 1,4,…,22 * * *`) chỉ là dự phòng/khởi động lại sau 00:00 UTC.
- Mỗi lượt: 10 shard × 600 ảnh, 6 biến thể/nghĩa; vắt hết kho (`VIMG_POOL_SKIP=0`, `VIMG_CF_UNCAPPED=1`), lượt dừng sạch khi mọi tài khoản báo 4006. Tắt lịch: biến repo `VIMG_SCHEDULE` ≠ 1.
- Cổng tự động trên CI, ngưỡng giữ nguyên: OCR · NSFW · phong cách · pHash · CLIP câu ví dụ · Llama 4 Scout (mô tả mù + có/không) · ≤ 6 KB. Trượt đủ biến thể → `vimg-scene-queue.json`, thử lại sau 2 ngày.
- Lượt đầu 40277982540: 6.000 ảnh → 264 đạt (~4,4 %). Ước 900–2.000 ảnh đạt/ngày; 6.425 nghĩa thiếu ≈ 4–7 ngày. Neuron/ảnh thật chưa đo (đang ước 26–60).
- Ảnh gốc cho video: Release `vimg-masters` (zip mỗi lượt, ≤ 768 px WebP + manifest.json). Ảnh app: `media.lexkite.com/vimg/` (kho m4).
- Chia kho (26/10): vẽ 50 % đầu (`VIMG_DRAW_SHARE`), giám khảo thị giác từ đuôi, văn bản/kho từ từ mốc 50 % (~600k neuron); ảnh không bắt đầu 00–02 UTC (kho từ chạy 00:12) (`AI_POOL_CF_START`) – lượt 26/10 vẽ cạn kho làm 0 ảnh được chấm. Giám khảo hết neuron → vòng vẽ dừng.
- Giám khảo KÉP (`VIMG_CONSENSUS=1`): ảnh qua cổng cứng nhưng trượt cổng mềm được llama-4-scout + mistral-small-3.1 chấm (yes câu ví dụ + no câu anh em). Soát: `mode=rejudge lab_run=<run>` → tờ `cons-*.jpg`. CHƯA soát được (kho cạn 26/10) – soát sau 00:00 UTC 27/10.
- Tiếp: đo neuron/ảnh sau 1 ngày; nâng sản lượng 3–5× bằng hiệu chỉnh giám khảo theo phong cách klein (`calibrate_scene.py`) – cần chủ gán nhãn 1 tờ ảnh (~5 phút).

## Kho từ 20k (`lexicon-expand`) – ĐANG LÀM (phiên riêng)
- Kho 9.010 từ đầu mục (8.230 nghĩa). AI = kho CF_POOL xoay vòng (ai-pool cf2: gpt-oss-120b soạn + giám khảo A, llama-3.3-70b giám khảo B); Gemini bỏ (kho rỗng), không cần điều phối.
- Pilot 11 (run 40289481506): 3/300 đạt, 2/3 sai → KHÔNG xuất. Đã sửa: JSON giám khảo bị cắt (16k + chia đôi lô), cổng định nghĩa đúng hình từ loại. Pilot 12 (26/10 ~09 UTC): kho đã 4006 hết (ảnh vắt) → 0 chạy.
- Lịch: 00:12 UTC (ngay sau neuron đặt lại, trước ảnh 01:40), trần 600k neuron. Biến repo LX_PILOT=1, LX_N=300 → lượt 27/10 là pilot.
- Tiếp: soát 50 mẫu lô `20261027-pilot` (sai ≤ 1/50) → LX_PILOT=0, LX_N=2400 (hàng loạt) → `promote.mjs <lô> --checked` sau soát 5 %/lô.
- Thứ tự từ: tầng 0 hồ sơ người học CEFR-J/Octanove/NGSL/NAWL/BSL (2.546 từ, A1→C2) rồi tầng 1 tần suất. Ước ~2–3k từ/ngày → ~5 ngày tới 20k.

## Chờ chủ
- Gán nhãn đúng/sai 1 tờ ảnh để hiệu chỉnh giám khảo (tuỳ chọn, tăng sản lượng).
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
