# CSP chặn thật – web lexkite.com

> TL;DR: Từ 2/11/2026 web chạy `Content-Security-Policy` CHẶN THẬT. Header (web/_headers khối /*) giữ allowlist host; mỗi trang HTML trong dist/ có thêm meta CSP với sha256 từng script nội tuyến và không có 'unsafe-inline' → script-src hiệu lực = header ∩ meta. Cấm handler on*= nội tuyến. Test: scripts/test/csp.mjs.
> Đọc khi: thêm script nội tuyến, host ngoài (SDK, CDN, iframe), bước build sửa HTML, hoặc bật quảng cáo.

## Cơ chế
- **Header** `/*` (`web/_headers`, MỘT nguồn): `default-src 'self'`, allowlist host cho script/connect/frame/media/font/style, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'self'`. Dòng _headers của Cloudflare Pages ≤ 2000 ký tự → không chứa nổi hash, nên script-src của header còn `'unsafe-inline'`.
- **Meta** `<meta http-equiv="Content-Security-Policy" id="lk-csp">` do `scripts/csp-meta.mjs` chèn ngay sau `<head>` (trước mọi script) ở BƯỚC CUỐI `scripts/build-web.sh`: `script-src` = script-src của header bỏ `'unsafe-inline'` + `'sha256-…'` từng script nội tuyến thực thi (JS, module, speculationrules, importmap; JSON-LD không cần) + `script-src-attr 'none'`, `object-src`, `base-uri`. Trình duyệt áp CẢ HAI chính sách → script nội tuyến phải khớp hash, handler `onclick=`… bị chặn. Build tự kiểm lại và đỏ nếu sót.
- **jsdelivr** chỉ ghim theo gói: `https://cdn.jsdelivr.net/npm/@huggingface/transformers@<phiên bản>/` (script-src + connect-src; transformers.js tải ORT wasm/mjs từ chính thư mục `dist/` đó). Đổi phiên bản trong `web/js/ui.js` → đổi luôn header (test bắt lệch).
- `/admin*`: thêm chính sách thứ 2 `frame-ancestors 'none'` (giao nhau, chỉ chặt hơn). `/embed/*`: gỡ bản chung, chính sách riêng `default-src 'none'` (+ meta hash → script-src hiệu lực chỉ còn hash).
- Add-on (MV3) và app gốc (Capacitor) có CSP riêng – không đổi.

## Luật khi sửa
- Không viết `on*=` trong HTML hay chuỗi HTML của JS → `addEventListener`. Font Google không chặn hiển thị: `media="print" data-lk-font` + script `#lk-font` (web/app/index.html).
- Script nội tuyến mới: cứ viết, build tự băm. Bước build nào sửa HTML phải chạy TRƯỚC `csp-meta.mjs`. Chèn script nội tuyến lúc chạy (`textContent`) bị chặn → dùng file `/js/*.js`.
- Thêm host ngoài: thêm vào header (đúng directive), chạy `node scripts/test/csp.mjs`, kiểm trên bản preview (Console không có "Refused to …").
- Công cụ test tiêm mã (axe) trên dist dùng `page.evaluate` (CDP, không bị CSP chặn), không `addScriptTag({content})`.

## Quảng cáo
`ADS_CONFIG.enabled = false`. Trước khi bật: AdSense/GPT cần thêm host (`securepubads.g.doubleclick.net`, `*.adtrafficquality.google`, `fundingchoicesmessages.google.com`, frame `www.google.com`…) và kiểm trên tên miền đã duyệt AdSense – `scripts/test/csp.mjs` đỏ nếu bật mà chưa mở host.

## Còn lại
- Trang từ điển do Worker `workers/dict` trả về không đi qua `_headers` của Pages → CSP riêng của Worker (chưa làm).
- `style-src` còn `'unsafe-inline'` (style nội tuyến rất nhiều; rủi ro thấp hơn script).
