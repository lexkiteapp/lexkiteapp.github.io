# Bàn giao – trạng thái việc đang chạy

> TL;DR: Một trang ngắn: việc nền đang chạy, số liệu mới nhất, việc tiếp theo, việc chờ chủ. Cập nhật mỗi mốc (≤ 6 dòng mỗi mục), không chép lại tài liệu khác.
> Đọc khi: đầu phiên, trước khi nhận việc ảnh từ vựng / kho từ 20k.

Cập nhật: 29/10/2026.

Phương pháp chung cho mọi pipeline nội dung: `docs/QUALITY-PIPELINE.md` (pilot mẫu khó trên nhánh → đạt mới hàng loạt).

## Ảnh từ vựng (`vocab-img-scene`) – TẠM DỪNG nhường kho CF cho pilot kho từ (29/10 05:15 UTC)
- Vẽ `flux-2-klein-4b` qua kho CF_POOL (121 tài khoản, 10k neuron / 24 giờ TRƯỢT mỗi tài khoản, ~110 neuron/ảnh). Cơ chế + bài học: `docs/VOCAB-IMG-STYLE.md` §11; phương pháp: `docs/QUALITY-PIPELINE.md`.
- Đang tắt: biến repo `VIMG_SCHEDULE=0`, `VIMG_CHAIN=0`; tác vụ hẹn giờ "vimg-e4-pilot-merge" đã disable. Bật lại khi phiên kho từ nhắn "xong pilot": `VIMG_SCHEDULE=1`, `VIMG_CHAIN=1`, bật lại tác vụ (đặt fireAt mới khi probe ≥ 40 tài khoản).
- Nhánh `vimg-e4` (9d32c35, CHƯA gộp): thẻ cảnh e4 (câu cảnh ≤ 20 từ `ps` + câu hỏi `check` + `draw` ≥ 4), prompt ngắn, giám khảo chấm câu cảnh + kiểm nghĩa 2 mô hình. Pilot 40 nghĩa khó (trước 0 %): ~30 %/ảnh, 11/13 đúng nghĩa. Đo lại sạch rồi gộp nếu ≥ 15 %/ảnh và sai ≤ 1/20.
- Số liệu: 1.240 ảnh (29/10 00:07 UTC); main hiện ~200–350 ảnh/ngày (prompt e3 đạt 2–7 %). Chỉ mục app v3 = 64 mảnh `web/js/vimg/` (tải theo từ).

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
