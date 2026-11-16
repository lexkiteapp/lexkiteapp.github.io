# CSS-NOTES – chú thích dài của web/css/style.css

> TL;DR: chú thích dài (> 120 ký tự) chuyển từ style.css sang đây để khung app (first-load, trần shellGz) nhẹ hơn mà không mất kiến thức; trong CSS còn `/* CSS-NOTES §n */`. Neo theo selector đứng ngay sau chú thích.
> Đọc khi: sửa một khối trong style.css có dấu `CSS-NOTES §n`.

## §1 – `(đầu khối)`

Design tokens (docs/DESIGN-SYSTEM.md): khoảng cách 4/8/12/16/24/32 · bo góc · cỡ chữ (Be Vietnam Pro đã nạp) · độ nổi · chuyển động M3

## §2 – `@media (prefers-reduced-motion: no-preference)`

Đổi sáng/tối mượt (app.js fadeTheme → html.lk-theming ~240 ms): chỉ chuyển MÀU 180 ms, không chớp; tắt khi giảm chuyển động (docs/DESIGN-SYSTEM.md §2a)

## §3 – `@media (max-width: 374px)`

Máy tính: màn hub v2 cùng độ rộng trang thường (816 px), không kẹt khổ điện thoại 480 px; màn học tập trung (body.focus) giữ khổ hẹp

## §4 – `.btn.btn[disabled]`

Nút bị vô hiệu vẫn đọc được (AA ≥ 4.5:1 cả sáng/tối): nền nhạt + chữ muted + viền đứt, không làm mờ cả nút. Lý do chưa bấm được: .next-why ngay dưới

## §5 – `select, input, textarea`

Quét tràn khung cùng LOẠI lỗi ô ngày iOS (24/10): select/ô nhập không vượt khung cha (bề rộng nội tại của option dài, ô số);
   chữ rất dài (URL, từ ghép de/ru/tr, email) tự xuống dòng thay vì đẩy trang tràn ngang trên điện thoại

## §6 – `.fade-end`

Thanh cuộn ngang (tab, bước, thanh tab Cài đặt): mờ dần ở mép còn nội dung bị khuất – báo còn mục để vuốt (app.js edgeFade)

## §7 – `.entry-word`

điện thoại: ảnh giữ đúng 160×160 (vai dict, CLS 0) → xếp dưới nút hành động (CTA không bị đẩy; ảnh lỗi gỡ hộp không xê dịch phần trên), chữ đủ bề ngang

## §8 – `.flash:not(.flipped) .face.back, .flash.flipped .face.front`

Mặt thẻ đang quay lưng: ẩn hẳn sau khi lật xong (nút ở mặt sau không đè/không nhận Tab, chạm khi mặt trước đang hiện – quality-sweep overlap #/review)

## §9 – `.bars.dense`

Nhãn chữ (Mon, Hôm nay, Сегодня) rộng hơn ô cột: ô cuối tràn thì bị cắt, các ô giữa đè nhau. Nhãn đầu canh trái, cột hẹp thì nhãn thưa (cột chẵn giữ dòng trống để đáy cột thẳng hàng).

## §10 – `@media (max-width: 1023px)`

Vỏ app: MỘT mốc 1024 px cho menu trái ↔ thanh tab dưới (khớp vỏ Stitch v2 ≤ 1023 px) – không bao giờ hiện cả hai, logo chỉ một lần

## §11 – `.bottom-nav a.active`

thanh Stitch (h-20 = 80 px) nằm trong #bnav cao 64 px + safe-area (tactile.css): ô tab tràn đáy 4 px → vừa đúng chiều cao thanh, tính cả safe-area

## §12 – `.proc`

Quy trình = bậc thang dọc ở mọi độ rộng: hàng ngang tự xuống dòng làm mũi tên cuối hàng chỉ vào khoảng trống (figure-layout kiểm hướng mũi tên)

## §13 – `.shake`

nhãn dài (Ghép công thức/Build the formula, de/ru) xuống dòng trong ô, không tràn đè ô bên (visual-qa btn-text-overflow 05/11)

## §14 – `@media (max-width: 1023px)`

Thanh trên chung điện thoại/máy tính bảng = 56 px như mẫu Stitch (frame-consistency topbar.h): nút 44 px + viền 1 px, không đệm dọc; vùng tai thỏ (standalone/native) cộng thêm ở dưới

## §15 – `html`

Đầu trang dính (.topbar 56 px) + thanh tab dưới cố định: focus ô nhập / liên kết #… / scrollIntoView dừng NGOÀI hai thanh,
 * không để tiêu đề thẻ hay ô đang gõ nằm dưới thanh (lỗi "Desert Plants" bị che nửa trên iPhone)

## §16 – `(đầu khối)`

Điền chữ còn thiếu (TOEFL Complete the Words): ô inline gọn, rộng theo SỐ CHỮ THIẾU (--n, đơn vị ch), cao bằng dòng chữ, gạch chân sát baseline;
 * vùng chạm ≥ 44 px nằm ở nhãn bọc ngoài (::after trong suốt – chạm vào nhãn = focus ô), không làm ô to ra

## §17 – `.learn-bar`

Thanh "Tiếp tục" dính đáy, nằm sau nội dung (không che khi cuộn hết); :hover chỉ cho chuột (iOS giữ :hover chỗ vừa chạm)

## §18 – `(đầu khối)`

không che thanh điều hướng dưới; KHÔNG phụ thuộc body.bare: gỡ 'bare' lúc đổi màn khi toast đang hiện làm toast nhảy 56 px = CLS (mqa #/home 360, 07/11)

## §19 – `html.native body.bare.v2on #view`

Khung Stitch màn chào/thiết lập (không có topbar): chừa tai thỏ; đầu trang dính của Welcome tự chừa để không trôi dưới tai thỏ

## §20 – `html.native input:not([type=checkbox]):not([type=radio]):not([type=range]), html.native se`

--kb: app.js đặt = chiều cao bàn phím khi chỉ visualViewport thấp lại → trang cuộn được để đưa ô nhập lên trên bàn phím

## §21 – `.bottom-nav:not(.st-nav) a span`

Mục đang mở: viên nền sau biểu tượng (kiểu Material 3 / Duolingo) + nhãn đậm – nhìn thấy ngay cả khi không phân biệt màu.
 * Chỉ thanh tab cũ: thanh Stitch (.st-nav) có MỘT chỉ báo active là khối nền + viền của cả tab (build-stitch-css.mjs) – viên nền ở đây từng chồng lên icon và nhãn thành 2–3 khối

## §22 – `body.v2on #view nav.fixed.bottom-0`

Thanh tab Stitch (shell.js, trong #view): dính đáy NGAY cả khi CSS màn (css/st-v2-*.css) chưa nạp xong – loadCss thôi chờ sau 1,5 s; trước đây lần nạp đầu
   trên máy chậm (WebKit/iPhone) thanh tab nằm trong luồng ở cuối trang. Cùng giá trị với lớp Tailwind fixed bottom-0 w-full z-50 → không đổi giao diện.

## §23 – `.skel-block`

chỗ ô "Lưu vào flashcard kèm ngữ cảnh" ở lần vẽ nhanh của tra từ: giữ sẵn chiều cao của thẻ thật (~378 px ở 360 px) để lần vẽ đủ thay vào không đẩy/dãn (CLS 0.68 ở mobile-qa dict/hello 360)

## §24 – `:where(button, a, [role="button"], summary, label, [tabindex]):focus:not(:focus-visible)`

===== Cảm giác app (app-feel): hộp thoại = bottom sheet, không chọn/bôi chữ khung, vòng focus chỉ khi bàn phím =====

## §25 – `.lsw`

lsw – nút đổi ngôn ngữ (js/lang-menu.js): app + trang tĩnh dùng chung khối này (scripts/lib/site-layout.mjs chép nguyên văn)

## §26 – `(đầu khối)`

Trang chào mừng trên màn hẹp: ẩn menu chữ (Tính năng/Thi thử/Add-on) để không xuống dòng – đã có nút Bắt đầu & Đăng nhập

## §27 – `.gsi`

Tài khoản (sync.js gBtn/Sync.chrome): nút "Đăng nhập với Google" theo hướng dẫn thương hiệu Google – nền trung tính, viền, logo G 4 màu

## §28 – `@media (pointer: coarse)`

nút chính + hàng chuyển phần của đề thi ≥ 44 px trên desktop (journey-matrix); khổ hẹp: chuột giả lập không đẩy ô nhập khỏi vùng nhìn thấy khi có bàn phím (mobile-qa-keyboard), cảm ứng thật đã có --tap

## §29 – `.tabs a, .set-nav button, :is(div, nav, section, header, th) > a.small, :is(div, th, dt) >`

Liên kết-nút đứng riêng (không nằm trong câu p/li/td/span – WCAG 2.5.8 chỉ miễn liên kết trong câu): tab dạng <a>, nút nav cài đặt, liên kết .small/.tiny cuối khối, từ trong bảng/danh sách thẻ

## §30 – `body:has(.sheet-up) .view`

Thanh kết quả (.sheet) cố định đáy: chừa chỗ (khoá vào .sheet-up gắn SAU lần vẽ – :has(.sheet) lúc chèn từng tính lại style cả body trong lượt bấm, INP 200 ms) để cuộn thấy hết đáp án phía dưới, không bị che

## §31 – `.ext-card`

giữ chỗ mục từ khi đang tra: thẻ add-on bên dưới không bị đẩy xuống khi kết quả hiện (visual-qa cls 0.30 #/dict 05/11)

## §32 – `:root:lang(th)`

Chữ đa ngôn ngữ (0 KB font tải về): Be Vietnam Pro cho Latin, chữ Thái/CJK/Ả Rập/Devanagari rơi về font Noto/hệ thống theo :lang(); ngắt dòng ja/zh/th/ko chuẩn bản địa

## §33 – `.i`

---------- Icon UI: một bộ duy nhất (Lucide, ISC) – sprite #lk-sprite, UI.icon(tên) · docs/DESIGN-SYSTEM.md ----------

## §34 – `.top-stats .pill.fire`

lượt đóng băng điền SAU khi nạp dữ liệu (App.updateChrome): huy hiệu nổi ở góc pill chuỗi – không đổi bề rộng hàng chỉ số (CLS top-stats 0,041, mqa #/home 360 07/11); min-width làm ô tra từ < 44 px

## §35 – `.card.mb`

📕 Thẻ Sổ lỗi sai (#/mistakes): đầu thẻ = câu hỏi + (IPA + 1 loa) · hàng Câu trả lời ✗ / Đáp án ✓ · giải thích ngắn · nút một hàng. Chỉ dùng token.

## §36 – `:where(a.card)`

<a class="card"> mặc định là inline → nền/viền vỡ thành mảnh rời đè thẻ khác (ảnh owner 28/10 trang chủ). Mọi thẻ-liên-kết là khối.

## §37 – `.lk-hit44`

🚪 ExitGuard (web/js/exit-guard.js, khung §5d FOCUS): vùng chạm nút thoát ≥ 44 px (không đổi hình); thanh FOCUS chung khi màn thiếu nút (cờ lk.exitbar)

## §38 – `.lk-grow`

ExitGuard grow(): nút = hộp trong suốt ≥ 44 bọc phần nhìn thấy (.lk-face, cùng lớp với nút) – điểm ảnh giữ nguyên (docs/specs/exit-button.md)

## §39 – `.ck-hint-l2`

ChoiceKit thang gợi ý + dòng dịch chạm để hiện (docs/specs/learn-flow-nav.md) – không dùng opacity cho chữ (cổng tương phản)

## §40 – `.lk-rep`

report-pill – nút ⚑ Báo lỗi + chân thanh bên gọn + token vai trò (trước đây chèn bằng JS trong js/report-pill.js; nay nạp cùng khung CSS → không nháy, không xô bố cục).
 * Chân thanh bên: trước khi js/report-pill-ui.js gom link phụ vào "⋯ Xem thêm" (.sf-ok), link phụ ẩn sẵn + chừa đúng 1 hàng 44 px cho nút ⋯ → không dịch chuyển (CLS 0).

## §41 – `@media (min-width:901px)`

side-menu (05/11): chân thanh bên gọn = 1 hàng hồ sơ + ⋯ menu (js/report-pill-ui.js). Trước khi JS chạy: ẩn link phụ, chừa ô ⋯ → CLS 0; lỗi tải → .sf-ok không .sp-on = chân cũ

## §42 – `:root`

🌤️ Sắc thái theo giờ (game.js daypart → html[data-daypart]): CHỈ màu nhấn lời chào; nền/chữ giữ nguyên (tối = --bg). Sáng = đậm hơn để ≥3:1 trên nền sáng

## §43 – `.st-ti`

Thanh tab Stitch (điện thoại < 1024 px): icon SVG cùng nét với menu trái – thường = viền, đang chọn = tô đầy nhạt + màu thương hiệu (viên mềm có sẵn); vùng chạm ≥ 44 px, viền focus rõ, nhún nhẹ khi bấm (tắt khi giảm chuyển động)

## §44 – `html.ic-wait-o .material-symbols-outlined,html.ic-wait-r .material-symbols-rounded`

icon-flash: chữ ligature chưa có phông → trong suốt, rộng 1em (lớp do iconGuard trong js/app.js gắn/gỡ theo họ phông)

