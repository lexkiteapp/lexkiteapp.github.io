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
- Trước: 20261027 (3 lần) + 20261028 lần 1 (LÕI 9/50) + lần 2 @07:28Z (LÕI 5/38, IPA 1 lệch) → trượt; đã thêm ukStyle, ví dụ là câu, ADULT, dịch ngược vi AI (`viBtOk`).
- Soát 29/10 `20261028-pilot@13:31Z` (54 mục, TB 5,4 ngôn ngữ/mục): LÕI 7/50 (vi Wiktionary sai nghĩa khoá: vanity "tính hư ảo", sway "đu"; vi AI: bequest "di chúc", pyre "lò hỏa táng"; ví dụ khác nghĩa: muscular a.01 vs "very muscular", snail ví dụ gượng; vinegar IPA Anh /ˈvɪnəɡəː/), DỊCH 2/50 (detriment ko 상해, resuscitate fr ressusciter), IPA 0/54 lệch → trượt, LX_PILOT=1.
- Đã thêm: dịch ngược vi cho MỌI nguồn vi (cả Wiktionary), gốc def chỉ 3 từ nội dung đầu, `əː` = lỗ IPA Anh; test; requeue 54 mục. Còn ngỏ: ví dụ dùng nghĩa lân cận (muscular) mà giám khảo vẫn "sense yes".
- Đã soát (so cả `at`): 20261027-pilot (lần 1–3), 20261028-pilot@lần 1, @07:28Z, @13:31Z.

## Chờ chủ
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
