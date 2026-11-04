# Cuộn mượt – chuẩn, cách đo, cổng CI

> TL;DR: Cuộn phải không xô giao diện, không tự nhảy, Back về đúng chỗ. Đo bằng cử chỉ cuộn thật trên CI (`scroll-perf.yml`), ngưỡng trong `scripts/test/scroll-perf.budget.json` chỉ được siết.
> Đọc khi: sửa khung app, thêm hiệu ứng vô hạn, danh sách dài, ảnh tải lười, hoặc cổng scroll-perf đỏ.

## Luật
- Khung màn (thanh trên, tab dưới, cột bên) phải đúng từ lúc chạm và từ lần vẽ đầu. Màn mới dùng khung v2/focus thì thêm vào `V2_ROUTES` (`web/js/app.js`), `ExitGuard` và script đầu `<body>` của `web/app/index.html`. `scroll-boot.mjs` khoá các danh sách này khớp nhau.
- `content-visibility` chỉ dùng trong `@supports (overflow-anchor: auto)`. Safari/WKWebView chưa có scroll anchoring nên chiều cao ước lượng làm cả trang nhảy (đo trên WKWebView: `topic/environment` đổi 1.488 px khi cuộn).
- Đổi bố cục trong 500 ms sau thao tác không tính CLS nên ẩn thanh trên ngay lúc chạm, không đợi tải gói. Đường dẫn trang con (`crumb`) chèn trong MutationObserver, trước khi trình duyệt vẽ khung; chèn sau khi tải dữ liệu sẽ đẩy cả trang xuống khoảng 40 px.
- Hiệu ứng trang trí vô hạn: thêm selector vào khối `.lk-scrolling` trong `style.css` để tạm dừng khi cuộn; không animate `left/top/width/height` (`scroll-boot.mjs` chặn).
- Việc nền nặng lúc khởi động dùng `App.calm(fn)`; dữ liệu lớn thì tải trước vào bộ đệm rồi mới chạy (`audio-index.js`).
- Vị trí cuộn do `route()` giữ theo từng mục lịch sử. `history.replaceState` phải truyền `history.state`, truyền `null` là mất vị trí khi Back.

## Đo
- `node scripts/test/scroll-perf.mjs --root dist --device phone|desktop|webkit [--themes light,dark] [--only a,b] [--variant noblur|noshadow|nocv|noanim|nofilter] [--check]`. Chỉ chạy trên CI, kết quả ở tóm tắt job và artifact `scroll-perf-*`.
- Dữ liệu `?demo=1` + `lk.ux1=1`, KHÔNG `?sandbox=1`: sandbox không ghi `lk.onb` nên shell ẩn lúc tải (CLS giả). Thiếu `lk.ux1` là đo nhầm giao diện cũ vì `/api/config` hermetic rỗng.
- Điện thoại 390×844 (màn trong phiên 360×640), CPU 4×, mạng 4G chậm; ảnh ngoài về chậm 500 ms với cỡ thật để lộ chỗ thiếu giữ chỗ.
- iOS: `ios-e2e.yml` đo trong WKWebView thật trên Simulator (dòng `SCROLL` trong log driver); đổi chiều cao > 100 px, nhảy ngược hoặc thanh dính lệch thành lỗi.

## Giới hạn của phép đo
- Runner CI không có GPU. Tỉ lệ rớt khung trên WebKit Linux và Simulator là vẽ phần mềm, không đại diện cho máy thật, nên WebKit chỉ gác số tất định (nhảy cuộn, chiều cao, thanh dính, Back).
- `path` ở WebKit tăng chiều cao vì vẽ dần xuống dưới, không xô phần đang xem, nên có ngưỡng riêng.
- Chưa đo được: cảm giác trên iPhone/Android thật, bật nảy (`overscroll-behavior`), thanh địa chỉ Safari.
