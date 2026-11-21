// Cổng chống tái phát (kiểm toán 18/11, lesson-perf): `:has()` gắn vào html/body/:root với ĐUÔI HẬU DUỆ bị đánh giá lại ở MỖI lần DOM đổi
// → hơn 1700 lượt tính lại style/bài học (≈ 25 % thời gian luồng chính ở CPU 4×). Dùng cờ data-has-* (js/ui.js watchFlags) hoặc `:has(> con trực tiếp)`.
// Cũng chặn `void el.offsetWidth` (ép layout đồng bộ trong lượt chạm) ở lesson/ui.js: khởi động lại animation bằng requestAnimationFrame.
import fs from 'node:fs';
let bad = 0; const fail = m => { console.error('✗ no-root-has: ' + m); bad++; };
for (const f of fs.readdirSync('web/css').filter(x => x.endsWith('.css') && !/^(adm|admin)\.css$/.test(x))) {
  const s = fs.readFileSync('web/css/' + f, 'utf8');
  for (const m of s.matchAll(/(?:^|[},\s])((?:html|body|:root)(?:[.#\[][^{},\s:]*)*)\s*:has\(\s*(?!>)([^)]*)\)/g)) fail(`web/css/${f}: «${m[1]}:has(${m[2].slice(0, 40)})» – dùng cờ data-has-* hoặc :has(> …)`);
}
const ui = fs.readFileSync('web/js/lesson/ui.js', 'utf8');
if (/void\s+\w+\.offsetWidth/.test(ui)) fail('web/js/lesson/ui.js: `void x.offsetWidth` ép layout trong lượt chạm – dùng requestAnimationFrame');
if (!/watchFlags/.test(fs.readFileSync('web/js/ui.js', 'utf8'))) fail('web/js/ui.js: thiếu watchFlags (cờ data-has-*)');
// 21/11 (Scroll perf main đỏ): ngọn lửa SVG (.st-fl, transform-box:fill-box, vô hạn) tính lại layout MỖI khung khi cuộn (~400 lần, 117–294 ms; --variant noanim → 2 lần). Các tuyến ux1 KHÔNG nạp lazy-ui.css (app.js LZCSS) nên luật tạm dừng ở đó không tới → runtime.js phải tự mang luật tạm dừng khi cuộn.
const rt = fs.readFileSync('web/js/st/v2/runtime.js', 'utf8');
if (!/\.lk-scrolling \.st-fl \.fl-mid[^{]*\{[^}]*animation-play-state:\s*paused/.test(rt)) fail('web/js/st/v2/runtime.js: ngọn lửa .st-fl chạy vô hạn mà thiếu `.lk-scrolling … {animation-play-state:paused}` (lazy-ui.css không nạp ở ux1) → layout mỗi khung khi cuộn');
if (bad) process.exit(1);
console.log('✓ no-root-has: không còn :has() hậu duệ ở html/body, lesson/ui.js không ép layout bằng offsetWidth');
