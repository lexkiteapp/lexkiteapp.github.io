# Bàn giao – trạng thái việc đang chạy

> TL;DR: Một trang ngắn: việc nền đang chạy, số liệu mới nhất, việc tiếp theo, việc chờ chủ. Cập nhật mỗi mốc (≤ 6 dòng mỗi mục), không chép lại tài liệu khác.
> Đọc khi: đầu phiên, trước khi nhận việc ảnh từ vựng / kho từ 20k.

Cập nhật: 27/10/2026.

## Ảnh từ vựng (`vocab-img-scene`) – ĐANG CHẠY tự động
- Vẽ `flux-2-klein-4b` qua kho CF_POOL (121 tài khoản, chỉ Lexkite dùng). Cơ chế, cổng chất lượng, bài học: `docs/VOCAB-IMG-STYLE.md` §11 – không chép lại ở đây.
- Chạy: tự nối lượt → kho nửa đầu cạn (4006) thì dừng → `cf-pool-probe` (mỗi 3 giờ) thấy ≥ 30 tài khoản mở thì tự khởi động lại. Fill ≤ 5 máy GitHub cùng lúc. Tắt: biến `VIMG_SCHEDULE`≠1 / `VIMG_CHAIN=0`.
- Số liệu: 639 ảnh (27/10 10:15 UTC); lượt đầu 6.000 ảnh → 264 đạt; ảnh chỉ tăng khi cả lượt xong (bước fillpub).
- Chưa xong: soát giám khảo kép (`mode=rejudge lab_run=40271446755,40271452785` → tờ `cons-*.jpg`, sai > 1/20 thì đặt `VIMG_CONSENSUS: '0'`); neuron/ảnh thật chưa đo (token kho không có quyền analytics).

## Kho từ 20k (`lexicon-expand`) – CHỜ kho CF có neuron
- Kho vẫn 8.230 nghĩa. Đường chạy sẵn sàng: AI qua kho CF_POOL (ai-pool cf2), tự nối lượt khi hàng loạt (8fa4687), biến LX_PILOT=1/LX_N=300.
- Hạn mức CF = 10k neuron / 24 giờ TRƯỢT mỗi tài khoản (đã xác nhận 27/10). Lịch lexicon-expand mỗi 3 giờ (:17), kho cạn = dừng ~40 s, cảnh báo không đỏ (2b4cb5c).
- Pilot theo lịch → lô pending/<ngày>-pilot.json (bỏ qua nếu lô hôm nay đã có). Tác vụ hẹn giờ máy chủ "lexicon-pilot-28-10" (mỗi 6 giờ, 01:40/07:40/13:40/19:40 giờ VN) soát 50 mẫu → sai ≤ 1/50 thì LX_PILOT=0, LX_N=2400, promote, dispatch hàng loạt.
- Lô đã soát: **20261027-pilot** (27/10) – 7/50 sai (dịch lệch nghĩa khoá: biscuit/aristocracy/crease; từ không có thật th ภมุ, ja 忙しむ; vi calmness; ví dụ nhạy cảm categorize) → KHÔNG bật hàng loạt. Sửa: cổng chặn mọi lý do `qa.f` của giám khảo + ví dụ nhắc nhóm tôn giáo/sắc tộc; prompt lxjudge/lxsrc chấm theo nghĩa khoá + từ sai chính tả = 1. Lô đã requeue (101 → retry), LX_PILOT giữ 1.

## Chờ chủ
- Xoá `~/Downloads/keys_export.txt` (khoá thật dạng chữ thường); cân nhắc đổi khoá quan trọng.

## Luật khi tiếp việc
- Làm trong bản clone mới của repo thật dưới `$TMPDIR` (mỗi phiên một thư mục riêng); không dùng checkout chính.
- Không hạ ngưỡng / cắt nội dung để "qua". Việc nặng chạy GitHub Actions; agent chỉ đọc số liệu tóm tắt.
- Agent không đọc/chép kho khoá; chủ tự nạp secret.
