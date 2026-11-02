// Test hồi quy cho scripts/lib/qa-classify.mjs (web-sweep + font-audit):
//  1/11: media.lexkite.com trả 429 (Cloudflare 1027 – Workers hết 100k lượt/ngày) → thân lỗi không có CORS → web-sweep đỏ oan
//  "Access to text track … blocked" ở /video/*/ dù Worker cấu hình CORS đúng. 404 / thiếu CORS thật vẫn phải là lỗi.
//  .sr-only đúng chuẩn (1px + clip) bị font-audit báo "chữ bị cắt mất" – chữ cho trình đọc màn hình, mắt không thấy.
import { extUnavailable, corsBlockedUrl, splitConsoleErrors, srOnlyHidden } from '../lib/qa-classify.mjs';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };

// 1) mã trạng thái "máy chủ không phục vụ"
for (const s of [429, 500, 502, 503, 520, 530]) ok(extUnavailable(s), `extUnavailable(${s})`);
for (const s of [0, 200, 206, 301, 403, 404, 410]) ok(!extUnavailable(s), `!extUnavailable(${s}) – lỗi thật / bình thường`);

// 2) URL trong thông báo CORS của Chrome (mẫu thật từ CI 1/11)
const VTT = 'https://media.lexkite.com/video/news_pharmacy_three_974c28/en-6f3dde53.vtt', IMG = 'https://media.lexkite.com/video/news_pharmacy_three_974c28/p-11aae25e.webp';
const mVtt = `Access to text track at '${VTT}' from origin 'http://localhost:8080' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`;
const mImg = `Access to image at '${IMG}' from origin 'http://localhost:8080' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.`;
const mFetch = `Access to fetch at 'https://x.example/a.json' from origin 'http://localhost:8080' has been blocked by CORS policy: Response to preflight request doesn't pass access control check`;
ok(corsBlockedUrl(mVtt) === VTT, 'text track URL');
ok(corsBlockedUrl(mImg) === IMG, 'image URL');
ok(corsBlockedUrl(mFetch) === 'https://x.example/a.json', 'fetch URL');
ok(corsBlockedUrl('Uncaught TypeError: x is not a function') === null && corsBlockedUrl(undefined) === null, 'không phải lỗi CORS → null');

// 3) tách: chỉ URL đã xác nhận 429/5xx mới sang ext; CORS thiếu thật (200/404) và lỗi JS vẫn là err
const js = 'Uncaught ReferenceError: foo is not defined';
const a = splitConsoleErrors([mVtt, mImg, js], new Map([[VTT, 429], [IMG, 429]]));
ok(a.errs.length === 1 && a.errs[0] === js && a.ext.length === 2, 'host 429 → 2 lỗi CORS sang ext, lỗi JS giữ lại: ' + JSON.stringify(a));
const b = splitConsoleErrors([mVtt, mImg], new Map());
ok(b.errs.length === 2 && !b.ext.length, 'host trả 200/404 mà thiếu CORS → vẫn là err (không giấu lỗi cấu hình)');
const c = splitConsoleErrors([mVtt, mImg], new Map([[VTT, 503]]));
ok(c.errs.length === 1 && c.errs[0] === mImg && c.ext.length === 1, 'chỉ URL đã xác nhận sập mới miễn');

// 4) .sr-only: giá trị getComputedStyle thật của Chromium
const r1 = { width: 1, height: 1 };
ok(srOnlyHidden({ clip: 'rect(0px, 0px, 0px, 0px)', clipPath: 'none' }, r1), 'Tailwind .sr-only (clip rect 0) → ẩn');
ok(srOnlyHidden({ clip: 'auto', clipPath: 'inset(50%)' }, r1), 'clip-path inset(50%) → ẩn');
ok(srOnlyHidden({ clip: 'rect(0px 0px 0px 0px)', clipPath: 'inset(50%)' }, r1), 'style.css .sr-only (cả hai) → ẩn');
ok(!srOnlyHidden({ clip: 'auto', clipPath: 'none' }, r1), '1px mà không clip (sr-only bị CSS khác đè) → vẫn kiểm');
ok(!srOnlyHidden({ clip: 'rect(0px, 0px, 0px, 0px)', clipPath: 'none' }, { width: 120, height: 20 }), 'hộp lớn có clip → vẫn kiểm (không phải sr-only)');
ok(!srOnlyHidden({ clip: 'rect(0px, 40px, 10px, 0px)', clipPath: 'none' }, r1), 'clip một phần → vẫn kiểm');

console.log(fail ? `✗ qa-classify: ${fail} lỗi` : '✓ qa-classify: host ngoài 429/5xx tách khỏi err (404/thiếu CORS vẫn đỏ), .sr-only chuẩn không bị báo cắt chữ');
process.exit(fail ? 1 : 0);
