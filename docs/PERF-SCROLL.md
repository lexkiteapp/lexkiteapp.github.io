# Hiệu năng web – cuộn mượt + tải trang: chuẩn, cách đo, cổng CI

> TL;DR: Cuộn phải không xô giao diện, không tự nhảy, Back về đúng chỗ. Đo bằng cử chỉ cuộn thật trên CI (`scroll-perf.yml`), ngưỡng trong `scripts/test/scroll-perf.budget.json` chỉ được siết.
> Tải trang: 6 route chính đo trên bản thật bằng `scripts/test/route-vitals.mjs` (job `routes` của `app-lcp.yml`), số và danh sách việc ở mục "Tải trang" cuối file.
> Đọc khi: sửa khung app, đổi cách nạp JS/CSS/font/media, thêm hiệu ứng vô hạn, danh sách dài, ảnh tải lười, hoặc cổng scroll-perf đỏ.

## Luật
- Khung màn (thanh trên, tab dưới, cột bên) phải đúng từ lúc chạm và từ lần vẽ đầu. Màn mới dùng khung v2/focus thì thêm vào `V2_ROUTES` (`web/js/app.js`), `ExitGuard` và script đầu `<body>` của `web/app/index.html`. `scroll-boot.mjs` khoá các danh sách này khớp nhau.
- `content-visibility` chỉ dùng trong `@supports (overflow-anchor: auto)`. Safari/WKWebView chưa có scroll anchoring nên chiều cao ước lượng làm cả trang nhảy (đo trên WKWebView: `topic/environment` đổi 1.488 px khi cuộn).
- Đổi bố cục trong 500 ms sau thao tác không tính CLS nên ẩn thanh trên ngay lúc chạm, không đợi tải gói. Đường dẫn trang con (`crumb`) chèn trong MutationObserver, trước khi trình duyệt vẽ khung; chèn sau khi tải dữ liệu sẽ đẩy cả trang xuống khoảng 40 px.
- Hiệu ứng trang trí vô hạn: thêm selector vào khối `.lk-scrolling` trong `style.css` để tạm dừng khi cuộn; không animate `left/top/width/height` (`scroll-boot.mjs` chặn).
- Việc nền nặng lúc khởi động dùng `App.calm(fn)`; dữ liệu lớn thì tải trước vào bộ đệm rồi mới chạy (`audio-index.js`).
- Vị trí cuộn do `route()` giữ theo từng mục lịch sử. `history.replaceState` phải truyền `history.state`, truyền `null` là mất vị trí khi Back.

## Đo
- `node scripts/test/scroll-perf.mjs --root dist --device phone|desktop|webkit [--themes light,dark] [--only a,b] [--variant noblur|noshadow|nocv|noanim|nofilter] [--check]`. Chỉ chạy trên CI, kết quả ở tóm tắt job và artifact `scroll-perf-*`.
- Runner ồn: màn vượt ngưỡng khung rớt/task dài/layout được đo đủ 3 lượt và chấm **trung vị** từng chỉ số (`scripts/test/lib/perf-median.mjs`, log `↻`); ngưỡng không đổi, khựng lặp ở đa số lượt vẫn đỏ.
- Dữ liệu `?demo=1` + `lk.ux1=1`, KHÔNG `?sandbox=1`: sandbox không ghi `lk.onb` nên shell ẩn lúc tải (CLS giả). Thiếu `lk.ux1` là đo nhầm giao diện cũ vì `/api/config` hermetic rỗng.
- Điện thoại 390×844 (màn trong phiên 360×640), CPU 4×, mạng 4G chậm; ảnh ngoài về chậm 500 ms với cỡ thật để lộ chỗ thiếu giữ chỗ.
- iOS: `ios-e2e.yml` đo trong WKWebView thật trên Simulator (dòng `SCROLL` trong log driver); đổi chiều cao > 100 px, nhảy ngược hoặc thanh dính lệch thành lỗi.

## Giới hạn của phép đo
- Runner CI không có GPU. Tỉ lệ rớt khung trên WebKit Linux và Simulator là vẽ phần mềm, không đại diện cho máy thật, nên WebKit chỉ gác số tất định (nhảy cuộn, chiều cao, thanh dính, Back).
- `path` ở WebKit tăng chiều cao vì vẽ dần xuống dưới, không xô phần đang xem, nên có ngưỡng riêng.
- Chưa đo được: cảm giác trên iPhone/Android thật, bật nảy (`overscroll-behavior`), thanh địa chỉ Safari.

## Tải trang – 6 route (lexkite.com, 06/11)
Đo bằng `node scripts/test/route-vitals.mjs https://lexkite.com` trên CI (run 42230583218): điện thoại 412×823, 4G chậm (RTT 150 ms, 1,6 Mbps), CPU ×4, trung vị 3 lần. Route trong app dùng khách cũ (dữ liệu `?demo=1`, 60 thẻ), nhưng HTTP cache và SW bị xoá trước mỗi lần đo. INP là lần chạm thật vào 2 nút đầu trong `#view`. Máy đo đặt `lk.noTrack=1`, nên không ghi phiên. Lighthouse lab hằng tuần (`reports/lighthouse.json`) chỉ đo trang mở lạnh, nên không thấy các route khách cũ.

| Route | LCP | FCP | TBT | CLS | INP | Byte (request) | Nặng nhất |
|---|---|---|---|---|---|---|---|
| `#/welcome` (khách mới) | 0,75 s | 0,75 s | 87 ms | 0,046 | 160 ms | 645 KB (117) | font 174 KB, `app.js` 40, firebase-auth 39, grammar/tenses 33 + verbs 27 |
| Hôm nay `#/home` | **5,43 s** | 0,72 s | **227 ms** | 0 | 88 ms | **905 KB (259)** | `lib/ngsl.js` 151, `awl.js` 51, skills 33, topics-more 28, office 24, font 209 |
| Ôn `#/review` | **5,27 s** | **5,27 s** | 56 ms | 0,029 | **224 ms** | **944 KB (255)** | như Hôm nay + Bricolage 40 KB |
| Bài học `#/lesson/go?demo=1` | **4,81 s** | **4,81 s** | 52 ms | 0 | 80 ms | 619 KB (**311**) | CSS 105 KB, `lesson/ui.js` 20 |
| Từ điển `#/dict/hello` | 3,61 s | 0,73 s | **262 ms** | 0,001 | 56 ms | 775 KB (**325**) | **font 330 KB**, `notes/h.json` 28 |
| Trang giới thiệu `/vi/` | 0,81 s | 0,81 s | **379 ms** | 0,049 | 104 ms | 372 KB (13) | `teach/*/idle.webm` 209 KB, `fonts/msymr.woff2` 63 |
| Blog (bài) | – | – | – | – | – | – | runner CI bị Cloudflare chặn bằng trang thử thách (challenge, 400 KB): chưa đo được; Lighthouse tuần 05/11: LCP 2,0 s, TBT 0 |

Đọc số:
- Khách mới vào nhanh (LCP < 1 s). Khách cũ quay lại thì chậm 3,6–5,4 s, vì app chờ nạp mọi module và kho từ (`lib/*.js`, khoảng 300 KB) rồi mới vẽ. Mỗi route phát 250–325 request.
- `/js/*` và `/css/*` đang `Cache-Control: no-cache` (`web/_headers`), và SW ép `no-cache` cho JS/CSS. Vì vậy mỗi lần mở, mỗi file tốn thêm 1 lượt đi-về 150 ms để hỏi lại máy chủ, dù file chưa đổi.
- Font tốn 88–330 KB mỗi route: Be Vietnam Pro 7 kiểu (có nghiêng), tải từ Google, cộng thêm Bricolage.
- firebase-auth (39 KB) nạp cả khi khách chưa đăng nhập.
- `#793` đang sửa TBT màn đầu (vocab-img, i18n), không trùng với các việc dưới đây.

### Sau #799 + #804 + #816 (lexkite.com, 06/11, run 42299937992)
| Route | LCP | FCP | TBT | Byte | So với 06/11 trước sửa |
|---|---|---|---|---|---|
| `#/welcome` | 0,93 s | 0,93 s | 8 ms | 497 KB | 0,75 s (dao động, font chưa nằm trong cache) |
| Hôm nay | **3,65 s** | 0,74 s | 148 ms | 867 KB (font 126 KB) | 5,43 s |
| Ôn | **3,26 s** | 3,09 s | 29 ms | 757 KB (font 57 KB) | 5,27 s |
| Bài học | **4,05 s** | 4,05 s | 12 ms | 590 KB | 4,81 s |
| Từ điển | 3,26 s | 0,72 s | 44 ms | 475 KB | 3,61 s |
| Trang giới thiệu | 0,56 s | 0,56 s | 95 ms | 372 KB | 0,81 s · TBT 379 ms |
| Blog | – | – | – | – | runner vẫn bị Cloudflare trả trang thử thách, chưa đo được |

Còn cách mục tiêu LCP < 2,5 s:
- Hôm nay vẽ khung lúc 0,74 s, nhưng phần tử LCP (dòng chặng) tới 3,65 s. Gói `words` (ngsl 151 KB, awl 51 KB…) vẫn tải trước mốc LCP và tranh băng thông 4G với dữ liệu màn → việc 10.
- Bài học: FCP = LCP = 4 s, chuỗi gói `lesson` (CSS 105 KB, hơn 300 request) chặn lần vẽ đầu → việc 11.
- Ôn: phần tử LCP là dòng báo "Không phát được âm thanh" (máy đo không có loa), nên số này chưa phản ánh thẻ ôn.

Việc xếp theo lợi ích/chi phí (mỗi việc 1 PR nhỏ, có số trước/sau từ job `routes`):
1. **Khách cũ vẽ trước, nạp kho từ sau.** Xong ở #799: `PAINT_FIRST` = Hôm nay + Ôn, gói `words` nạp sau lần vẽ đầu (khóa ở `shell-lazy.mjs` mục 4).
2. **Cache bất biến theo mã băm.** Xong ở #804. `scripts/build-hash.mjs` sinh `/h/<đường dẫn>.<băm10>.<đuôi>` cho JS/CSS (băm theo tầng, immutable 1 năm; HTML và `sw.js` vẫn no-cache). File gốc giữ nguyên cho add-on, app di động (`NO_HASH=1`) và đường dẫn ghép động. SW và `loadScript`/`loadCss` quay về file gốc khi bản băm đã bị gỡ. Khóa bằng `build-hash.mjs`. Tải ấm trên bản dựng thử nhanh hơn 6–15 %.
3. **Font tự host, cắt gọn.** Xong ở #816. `scripts/build-fonts.mjs` khai báo 24 `@font-face` nội tuyến cho Be Vietnam Pro (swap) và Bricolage (optional).
   - Mỗi kiểu cắt 3 mảnh latin/latin-ext/vietnamese (unicode-range), phủ chữ Latin của 15 ngôn ngữ. ar/hi/ja/ko/ru/th/zh dùng font hệ thống.
   - Preload đúng 1 font LCP: ux1 → `pjs-latin`, mặc định → `bvp-400-latin`.
   - Add-on chép `web/fonts`: trước đó `pjs-*` trong add-on bị 404.
   - Khóa bằng `self-fonts.mjs`. Trên bản dựng thử, byte font Hôm nay 209 → 56 KB và LCP lạnh nhanh hơn 100–280 ms.
4. firebase-auth nạp khi bấm Đăng nhập, hoặc khi đã có phiên.
5. Trang giới thiệu: video `idle.webm` (209 KB) chỉ nạp khi rảnh và đang hiện trên màn; trước đó dùng ảnh poster. Đồng thời tìm nguồn TBT 379 ms.
6. Speculation rules / prefetch lúc rảnh cho màn kế tiếp (Hôm nay → Ôn/Bài học).
7. Ôn: INP 224 ms (lật thẻ). Tách việc nặng sau lần vẽ bằng `yield`.
8. Ảnh AVIF/WebP có srcset và đủ kích thước; `content-visibility` cho danh sách dài (đã có luật ở trên). Ảnh chưa nằm trong top 10 byte của route nào.
9. Đo blog: tìm cách để runner CI qua được trang thử thách (hoặc đo `lexkite.pages.dev`), và kiểm xem trang thử thách có chặn người hay crawler thật không.
10. Hôm nay: dời gói `words` tới SAU mốc LCP thật (chờ phần tử chặng vẽ xong + mạng rảnh), không theo hẹn giờ 2,5 s. Đo bằng `TRACE=1` để thấy thác tài nguyên.
11. Bài học: tách CSS màn học (105 KB) thành phần cần cho lần vẽ đầu và phần nạp sau; gom các request nhỏ của gói `lesson`.

## Lưu trữ phía máy người học (07/11)
Đo: `scripts/test/storage-audit.mjs` – 7 ngày học giả lập trên dist (SW thật), main vs nhánh trong workflow **Storage audit**; số ghi ở PR từng bước.
Mỗi bước 1 PR, có số byte trước/sau:
1. **Trần cache SW** – cache khung app: khung SHELL luôn giữ, phần runtime LRU ≤ `RT_MAX` 400 mục (trước: không trần); âm thanh 2000 / ảnh từ vựng 800 thành LRU thật
   (nghe/xem lại = mới nhất); đổi phiên bản xóa cache khung cũ, máy cài cũ vượt trần về trần khi kích hoạt; không cất phản hồi lỗi. Test `scripts/test/sw-storage.mjs`.
2. Dữ liệu lớn trong localStorage → IndexedDB (ngân sách `lsItemMax` trong `storage-audit.budget.json`).
3. Cài đặt: dòng "Dung lượng đang dùng" + nút dọn (15 ngôn ngữ).
4. `navigator.storage.persist()` chỉ khi người học bật học offline.
