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
- Kho vẫn 8.230 nghĩa. Chủ chọn (27/10): mục xuất khi LÕI (def/ví dụ/IPA/CEFR + vi) đạt sai ≤ 1/50; mỗi ngôn ngữ khác chỉ giữ khi bản dịch Wiktionary khớp nghĩa chắc chắn + 3 giám khảo ≥ 4 + dịch ngược + từ có thật (ca744dd); thiếu → app dùng đường dịch hiện có. AI chỉ lấp vi.
- Lịch sử: pilot 2 giám khảo ~9/50 sai, 3 giám khảo ~6–9/34 – lỗi gần hết ở dịch 12 ngôn ngữ do AI/bảng ghép nhầm.
- Soát 28/10 `20261028-pilot` (75 mục, giữ TB 5,4 ngôn ngữ/mục): LÕI 9/50 sai (vi sai nghĩa/từ loại: fatal, derby, brad, rocky, outgrow; IPA Anh /brad/, armchair (r) giữa từ, ointment (ə); ví dụ cụm ballet; virgin không hợp teen), DỊCH 2/50 (relive ar أحيا, jeopardize zh 使受危险) → TRƯỢT, giữ LX_PILOT=1.
- Đã thêm: ukStyle (ipa.mjs) + cổng IPA kiểu kho, cổng ví dụ phải là câu, cổng ADULT; prompt vi cùng từ loại + giám khảo bắt bảng Wiktionary khác nghĩa/calque; requeue 75 mục.
- IPA (c) XONG 28/10: `ipa-check.mjs checkEntry` (Britfone đầy đủ + CMUdict) chạy trong job trước cổng + lưới cuối trước khi ghi pending; promote.mjs từ chối lô lệch (`--fix-ipa` áp bản sửa theo nguồn). Lô chờ cũ: pool-pilot5 (6 mục), pool-pilot8 (1), src-pilot9 (1) đang bị từ chối. Tác vụ "lexicon-pilot-28-10" soát lô kế.
- Đã soát: 20261027-pilot (lần 1–3), 20261028-pilot.

## Chờ chủ
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
