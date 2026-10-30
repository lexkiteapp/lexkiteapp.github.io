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
