# Bàn giao – trạng thái việc đang chạy

> TL;DR: Một trang ngắn: việc nền đang chạy, số liệu mới nhất, việc tiếp theo, việc chờ chủ. Cập nhật mỗi mốc (≤ 6 dòng mỗi mục), không chép lại tài liệu khác.
> Đọc khi: đầu phiên, trước khi nhận việc ảnh từ vựng / kho từ 20k.

Cập nhật: 27/10/2026.

## Ảnh từ vựng (`vocab-img-scene`) – ĐANG CHẠY tự động
- Vẽ `flux-2-klein-4b` qua kho CF_POOL (121 tài khoản, chỉ Lexkite dùng). Cơ chế, cổng chất lượng, bài học: `docs/VOCAB-IMG-STYLE.md` §11 – không chép lại ở đây.
- Chạy: tự nối lượt → kho nửa đầu cạn (4006) thì dừng → `cf-pool-probe` (mỗi 3 giờ) thấy ≥ 30 tài khoản mở thì tự khởi động lại. Fill ≤ 5 máy GitHub cùng lúc. Tắt: biến `VIMG_SCHEDULE`≠1 / `VIMG_CHAIN=0`.
- Số liệu: 639 ảnh (27/10 10:15 UTC); lượt đầu 6.000 ảnh → 264 đạt; ảnh chỉ tăng khi cả lượt xong (bước fillpub).
- Giám khảo kép ĐÃ soát (28/10, run 40614789632): 13/13 ảnh nhận thêm đúng nghĩa; tỉ lệ đạt klein 2/40 → 10/40 → giữ `VIMG_CONSENSUS=1`. klein-4b ≈ 110 neuron/ảnh (đo 27/10); phần vẽ 70 % khi `LX_PILOT=1`, 50 % khi kho từ chạy hàng loạt.

## Kho từ 20k (`lexicon-expand`) – cổng THEO TRƯỜNG, đang pilot
- Kho vẫn 8.230 nghĩa. Mục xuất khi LÕI (def/ví dụ/IPA/CEFR + vi, 3 giám khảo) sai ≤ 1/50; 12 ngôn ngữ khác chỉ giữ khi Wiktionary khớp nghĩa + 3 giám khảo ≥ 4 + dịch ngược + từ có thật (ca744dd). IPA: `ipa-check.mjs` trong job + promote (Britfone/CMU).
- Soát 28/10 lần 1 `20261028-pilot` (75 mục): LÕI 9/50, DỊCH 2/50 → trượt; thêm ukStyle, ví dụ phải là câu, ADULT, prompt vi cùng từ loại.
- Soát 28/10 lần 2 `20261028-pilot@07:28Z` (38 mục < 50, TB 5,7 ngôn ngữ/mục): LÕI 5/38 (vi AI sai nghĩa mà 3 giám khảo cho 5: bight "cúm", caucus "bầu chọn", recollection "kỷ niệm", heighten "tăng cường" + ví dụ gượng; cornet vi Wiktionary "kèn coonê"), DỊCH 1/50 (invisible zh 无形), IPA 1/38 lệch (demolition Anh ≠ Britfone) → trượt, LX_PILOT=1.
- Đã thêm: cổng dịch ngược vi cho vi do AI lấp (`viBtOk`, judge trả `bt_vi`; thiếu = lỗ, sinh lại) + test; requeue 38 mục. Còn ngỏ: vi từ Wiktionary phiên âm lạ (cornet).
- Đã soát (so cả `at` của tệp, tên lô có thể trùng ngày): 20261027-pilot (lần 1–3), 20261028-pilot@lần 1, 20261028-pilot@07:28Z.

## Chờ chủ
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
