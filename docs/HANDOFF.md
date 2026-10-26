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
- Tiếp: đo neuron/ảnh sau 1 ngày; nâng sản lượng 3–5× bằng hiệu chỉnh giám khảo theo phong cách klein (`calibrate_scene.py`) – cần chủ gán nhãn 1 tờ ảnh (~5 phút).

## Kho từ 20k (`lexicon-expand`) – ĐANG LÀM (phiên riêng)
- Kho hiện 8.230 nghĩa. Workflow bật lại, AI qua kho CF (`f1d9baf7`), pilot 11 run 40289481506; soát 50 mẫu (mục tiêu sai ≤ 1/50) rồi chạy hàng loạt tới ~20k.
- Lịch xen kẽ khung ảnh để cùng chia neuron kho CF. Nghĩa mới phải có câu ví dụ (ảnh vẽ theo câu này).

## Chờ chủ
- Gán nhãn đúng/sai 1 tờ ảnh để hiệu chỉnh giám khảo (tuỳ chọn, tăng sản lượng).
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
