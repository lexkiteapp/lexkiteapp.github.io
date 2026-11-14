# Vòng giới thiệu: mời bạn → bạn học xong bài đầu → cả hai nhận quà (spec-lite, chủ 12/11)
> TL;DR: Link mời `/go/<lang>/?utm_source=ref&utm_medium=invite&c=<mã 8 ký tự>`; bạn mới học xong bài đầu trên máy mới → người mời +100 XP + 1 lượt đóng băng chuỗi, người được mời +50 XP + 1 lượt (tối đa 2). $0, chỉ trong app, không đẩy thông báo, có trần chống lạm dụng.
> Đọc khi: sửa nút "Mời bạn học cùng" (`web/js/share-card.js`), `functions/api/ref.js`, `refCount` ở `_funnel.js`, hoặc nâng/giảm phần thưởng.

- Mã: ngẫu nhiên 8 ký tự `[a-z0-9]` lưu trên máy (`lk.rc`), không liên quan mã khách (`lk.vid`) hay tài khoản; link không chứa dữ liệu cá nhân.
- Đo/chống lạm dụng ở máy chủ: `vid_attr` (máy mới, lượt đầu thắng, nguồn `ref`, mã mời, `fl` = xong bài đầu). `GET /api/ref?c=<mã>` → `n` = số bạn đã xong bài đầu, trần **3/ngày** và **10 tổng** mỗi mã; ≤ 60 lượt/IP/giờ; D1 ≥ 85 % → `n:0` (thử lại lần mở sau).
- Thưởng (app, `ShareCard.refSync`, ~20 giây sau khi mở app, chỉ khi máy có mã mời hoặc đến từ link mời): người được mời 1 lần/máy (không tự thưởng bằng link của chính mình); người mời nhận phần mới (`n − lk.refPaid`) ×100 XP + 1 lượt đóng băng; toast gộp 1 lần, không popup/đẩy thông báo (docs/specs/notifications.md).
- Giao diện: nút "🎁 Mời bạn học cùng" trong hộp "Khoe thành tích" (+ dòng giải thích lợi ích cho cả hai); chia sẻ qua `navigator.share` → không có thì chép link. Chuỗi 15 ngôn ngữ ở `en/share.js` + `i18n-fixed.json`.
- Kiểm: `scripts/test/referral.mjs` (SQLite thật + vm). Số đo (mời → học xong → D7) lấy từ Quản trị › Kênh & mã bài (nguồn `ref`).
- Chưa làm: màn "Bạn bè đã mời" trong Tôi; thưởng tăng bậc (3/5/10 bạn).
