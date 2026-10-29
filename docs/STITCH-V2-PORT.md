# Stitch v2 → app: cách port 1 màn (chuẩn, tự động)

> TL;DR: bộ chuyển `scripts/stitch-v2-convert.mjs` sinh khung từ cặp HTML Stitch sáng/tối; mỗi màn chỉ viết `bind/<màn>.json` + dựng dữ liệu thật, rồi `ST2.mount`.

Nguồn duy nhất của bố cục/icon/nút/hình: HTML Stitch v2.1 trong `brand/stitch/v2/<màn>-light|dark.html` (cùng bố cục, chỉ khác màu; id màn ở `.index.txt`).
Code KHÔNG vẽ lại giao diện: bộ chuyển sinh khung, mình chỉ gắn dữ liệu thật. Người chỉ qua `Chars.*` (2D). Mẫu đầy đủ: màn Học (`bind/path.json` + `web/js/ux1.js` map()).

## Các bước
1. `node scripts/stitch-v2-convert.mjs <màn> --dump` → sơ đồ khung đã ghép (đường dẫn `·>2>1>3`, class, aria, chữ).
2. Viết `brand/stitch/v2/bind/<màn>.json` (phép bên dưới). Chạy `node scripts/stitch-v2-convert.mjs <màn>` đến khi hết lỗi
   (thiếu khóa dịch / khóa trùng nghĩa khác / bộ chọn không khớp đều ĐỎ). Ra `web/js/st/v2/<màn>.js` (KHÔNG sửa tay).
3. Trong file JS của màn: dựng `d` từ dữ liệu thật rồi `ST2.mount(view, '<màn>', d, '<tab|null>')` (web/js/st/v2/runtime.js).
   Tab: learn · review · train · league · me (null = màn không có thanh tab, vd bài học). Nút `<button data-href>` tự điều hướng.
4. Nạp: thêm `js/i18n/en/v2.js`, `js/st/v2/runtime.js`, `js/st/v2/shell.js`, `js/st/v2/<màn>.js` vào gói của màn trong `BUNDLES` (web/js/app.js) và
   `css/st-v2-<màn>.css` vào `BCSS`. Thêm file dựng dữ liệu vào `V2DATA` (scripts/build-stitch-css.mjs) nếu nó có class Tailwind viết tay.
5. CSS: `TAILWIND_DIR=$TMPDIR/tw/node_modules/tailwindcss node scripts/build-stitch-css.mjs` (icon mới: thêm `--fonts`, cần `NODE_USE_ENV_PROXY=1`). ≤ 10 KB gz/màn.
6. Dịch: khóa Việt mới trong code → `web/js/i18n/en/<nhóm>.js`; nhãn ≤ 3 chữ → dịch tay 13 ngôn ngữ vào `scripts/i18n-fixed.json`, rồi `node scripts/i18n-fix.mjs`
   (nhóm v2: file `web/js/i18n/<lang>/v2.js` đã có). Kiểm `node scripts/i18n-qa.mjs --strict`.
7. Test của màn (scripts/test/*.mjs) phải kiểm ĐỦ ý cũ trên khung mới (không xóa ý nào). `npm run prepush` rồi commit + `git push real stitch-v2`.
8. CI `Stitch diff`: thêm màn vào `SCREENS` + `V2REF` (scripts/test/stitch-diff.mjs); tờ Stitch | app tối | app sáng trong artifact `stitch-diff`.

## Phép trong bind map (bộ chọn CSS trên khung đã ghép; `:scope` = chính phần tử; hậu tố ` << n` = tổ tiên thứ n)
- `i18n` {chữ Stitch: "khóa Việt"} – chữ tĩnh; EN = chữ Stitch. Khóa đã có nghĩa khác → chọn khóa khác.
- `text` {chữ Stitch đúng nguyên văn: biểu thức} – dữ liệu thật (tự escape). `html` {bộ chọn: biểu thức HTML} (icon `r.icon`, ảnh Chars).
- `attr` {bộ chọn: {thuộc tính: biểu thức}} · `cls` {bộ chọn: {class mẫu: biểu thức class}} (class trả về phải viết nguyên văn trong file JS) ·
  `addClass` (chỉ class không đổi hình: cắt tràn, móc test) · `tag` {bộ chọn: {to:'a'}} · `after` {bộ chọn: biểu thức} (chèn, vd giáo viên) · `remove` (CHỈ chỗ giữ chỗ người/ảnh Stitch).
- `repeat` [{list, as, variants {tên: bộ chọn mẫu}, samples (mọi mẫu Stitch cần gỡ), pick (biểu thức → tên khuôn), bind {tên: {phép…}}}] – danh sách thật, nhiều khuôn.
- `shell: true` – chỉ màn Học: đầu trang + thanh tab chung (shell.js). Màn khác có header/nav riêng của Stitch → giữ; dùng chung → `remove` + tab qua mount.

## Luật
- Không cắt tính năng/nội dung/test/ngưỡng: thứ mẫu không vẽ → đặt vào chỗ có sẵn trong mẫu (vd nút Guide mở bảng) và ghi trong báo cáo.
- Giáo viên: `Chars.img/still/clip`, tư thế theo teacher-pose-map (Ama point ở lộ trình, cheer khi đúng, concern khi sai; Carlos encourage ở chuỗi, talk/listen khi gọi). Giọng = giọng của đúng giáo viên (registry).
- Game feel (cờ, mặc định tắt): `window.Feel && Feel.on` → Feel.count/fill/combo/swap (docs/GAME-FEEL.md).
- WCAG 2.2 AA (stitch-diff kiểm pixel), chạm ≥ 44 px, giảm chuyển động, 15 ngôn ngữ + RTL, khung app ≤ 377 KB gz.
- Lỗi tương phản còn trong MẪU: `brand/stitch/v2/known-issues.json` – app vẫn phải đạt.
