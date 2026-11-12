# Thông báo tới người dùng – chuẩn & chỗ lệch (03/11/2026)

> TL;DR: Mọi push, nhắc học, toast, banner, báo lỗi theo một chuẩn (Duolingo về cá nhân hóa, Headspace về giọng, Apple HIG/Material về hiển thị). Lệch còn lại ghi ở bảng dưới, mỗi lát một PR nhỏ. Test: `scripts/test/notify-ux.mjs` + `scripts/test/reminders.mjs`.
> Đọc khi: thêm/sửa bất kỳ thông báo, toast, banner, hộp hỏi quyền. Chi tiết lập lịch: [REMINDERS.md](../REMINDERS.md).

## Tiêu chí (bắt buộc)
1. **Hỏi quyền sau khi thấy giá trị**: không hỏi lúc mở app; hỏi mềm sau bài học xong, xem trước lời nhắc thật, "Để sau" ngang hàng "Có", ≤ 2 lần đời (REMINDERS §3).
2. **Tắt dễ, được tôn trọng mọi nơi**: 1 công tắc + 5 loại trong Cài đặt; tắt → lịch cục bộ, Web Push, FCM, add-on cùng dừng; OS chặn → không xin lại, chỉ hướng dẫn cách bật.
3. **Tần suất**: ≤ 1/ngày, giờ yên lặng theo múi giờ địa phương (IANA, DST), giãn cách khi bỏ qua (3 lần → cách 2 ngày; ngày 14 là lời cuối rồi dừng), không lặp mẫu 7 ngày, máy chủ chống gửi trùng (`last`/`slot`).
4. **Lời**: ngắn (tiêu đề ≤ 60, thân ≤ 110 ký tự), ấm, cá nhân hóa (từ của bạn, bài đang học, mục tiêu ngày); **không** dọa mất chuỗi, trách móc, gấp gáp ("at risk", "đừng để", "sắp quên"…).
5. **Toast**: một cái mỗi lúc, tự ẩn theo độ dài câu (WCAG 2.2.1), không chặn chạm, cùng câu không nháy lại / không xả hàng loạt, xếp hàng sau hộp thoại, né nút đáy, safe-area, `role=status aria-live=polite`, tắt chuyển động khi `prefers-reduced-motion`.
6. **Báo lỗi**: bình tĩnh, nói việc người dùng làm được; lỗi có thể thử lại → nút hành động trong toast (`UI.toast(msg, { action, onAction })`, ≥ 44 px, giữ khi con trỏ/focus ở trên).
7. **Hình**: một hệ chung theo Lexkite Kit (Stitch): token màu `--text/--bg` đảo cho toast, đẹp ở tối/sáng, 390 px; icon Lucide, không emoji lạ trong khung HTML.
8. **15 ngôn ngữ**: mọi chữ qua `t()`, tiếng Anh tay, 13 ngôn ngữ ở `scripts/i18n-fixed.json`; `i18n-missing --strict` + `i18n-qa` + `push-copy --check` xanh.

## Hiện trạng so với chuẩn
| Mục | Hiện trạng | Lệch → việc |
|---|---|---|
| Lập lịch, giờ yên lặng, giãn cách, chống trùng | Đạt (REMINDERS, 197 kiểm) | – |
| Hỏi quyền mềm | Đạt logic; hộp hỏi chưa port Stitch | Port khi có ref Stitch "remind ask" (PR #430 có `tutor/remind`) |
| Giọng lời nhắc | **Lệch**: "Chuỗi đang gặp nguy!", "Đừng để chuỗi tắt", "{n} từ sắp quên mất" | **Sửa 03/11**: st3/st4/due4 khích lệ, 15 ngôn ngữ; test chặn từ dọa ở 15 ngôn ngữ + câu FCM |
| Lời cuối ngày 14 / FCM `miss` | Đạt (05/11): "Kit sẽ tạm ngừng nhắc bạn – quay lại lúc nào cũng được", 15 ngôn ngữ | `notify-ux` chặn "lời nhắc cuối/last reminder/misses you" |
| Toast | Đạt một-cái, né nút, aria; **lệch**: không có nút sửa, cùng câu nháy lại (mạng chập chờn) | **Sửa 03/11**: nút hành động + chống lặp; dùng ở "Thử lại" tải bộ từ |
| Báo lỗi quyền | "Bạn chưa cho phép thông báo" cả khi OS đã chặn | **Sửa 03/11**: chặn → hướng dẫn bật lại trong cài đặt trang |
| Visual guard toast/banner | Chưa có ảnh 390 px sáng/tối | Thêm cảnh toast vào `visual-qa` (lát kế, cần CI rảnh) |
| Tỉ lệ đồng ý ≥ 40 % | Đo `ask_show/yes/no` theo `:a1/:a2` (Quản trị › Thông báo) | Đọc số sau ≥ 3 ngày live bản 2/11; < 40 % → thử bản xem trước khác (A/B 2 nhánh, cùng cam kết) |
| `PUSH_PCT` 10 → 50 → 100 | Bậc tay, điều kiện ở REMINDERS §4 | Cổng tự động: script đọc `ntf_daily` + `d1Usage` → chỉ đề xuất bậc khi hủy < 5 %, D1 < 70 %, ≥ 3 ngày |
| FCM app gốc | Bật qua mã 05/11 (chờ nhịp Worker); ≤ 1 push/ngày gồm cả "đã sửa", giờ yên lặng, không trùng ngày lịch cục bộ, công tắc tắt hủy cả FCM, bản app thiếu plugin → lịch cục bộ (`scripts/test/fcm-push.mjs`) | Chờ chủ: service account `FCM_SA` (REMINDERS §5); iOS cần bản cửa hàng mới |
