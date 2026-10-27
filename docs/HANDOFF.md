# Bàn giao – trạng thái việc đang chạy

> TL;DR: Một trang ngắn: việc nền đang chạy, số liệu mới nhất, việc tiếp theo, việc chờ chủ. Cập nhật mỗi mốc (≤ 6 dòng mỗi mục), không chép lại tài liệu khác.
> Đọc khi: đầu phiên, trước khi nhận việc ảnh từ vựng / kho từ 20k.

Cập nhật: 27/10/2026.

## Ảnh từ vựng (`vocab-img-scene`) – ĐANG CHẠY tự động
- Vẽ `flux-2-klein-4b` qua kho CF_POOL (121 tài khoản, chỉ Lexkite dùng). Cơ chế, cổng chất lượng, bài học: `docs/VOCAB-IMG-STYLE.md` §11 – không chép lại ở đây.
- Chạy: tự nối lượt → kho nửa đầu cạn (4006) thì dừng → `cf-pool-probe` (mỗi 3 giờ) thấy ≥ 30 tài khoản mở thì tự khởi động lại. Fill ≤ 5 máy GitHub cùng lúc. Tắt: biến `VIMG_SCHEDULE`≠1 / `VIMG_CHAIN=0`.
- Số liệu: 639 ảnh (27/10 10:15 UTC); lượt đầu 6.000 ảnh → 264 đạt; ảnh chỉ tăng khi cả lượt xong (bước fillpub).
- Chưa xong: soát giám khảo kép (`mode=rejudge lab_run=40271446755,40271452785` → tờ `cons-*.jpg`, sai > 1/20 thì đặt `VIMG_CONSENSUS: '0'`); neuron/ảnh thật chưa đo (token kho không có quyền analytics).

## Kho từ 20k (`lexicon-expand`) – TẠM DỪNG, chờ chủ chọn hướng dịch
- Kho vẫn 8.230 nghĩa. Workflow lexicon-expand TẮT + tác vụ hẹn giờ "lexicon-pilot-28-10" TẮT (27/10 ~17:30 UTC) để không phí neuron/token.
- Pilot 2 giám khảo (74 đạt) ~9/50 sai; pilot 3 giám khảo đồng thuận (6da278b, run 40535213005: 34/300 đạt) ~6–9/34 sai – lỗi gần hết ở BẢN DỊCH 12 ngôn ngữ (puff vi "hú", overshadow id/ja/ko, fissure ko, disincentive hi ngược nghĩa, mistreat id) + 1 ví dụ lệch nghĩa (palate). Giám khảo LLM miễn phí không bắt được lỗi dịch ngôn ngữ ít tài nguyên.
- Phần tiếng Anh (def WordNet, ví dụ Tatoeba, IPA, CEFR-J) gần như sạch. Lô đã requeue.
- Hướng khả thi: cổng THEO TRƯỜNG – mục mới xuất khi lõi Anh + vi đạt; mỗi ngôn ngữ chỉ hiện khi bản dịch đó đạt (Wiktionary khớp nghĩa chắc chắn), thiếu thì dùng đường dịch hiện có của kho.

## Chờ chủ
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
