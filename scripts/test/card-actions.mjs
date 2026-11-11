// 🃏 Thẻ cùng hàng: nút ghim đáy, thẳng hàng, cùng bề rộng khi xuống dòng. Đo trên trang thật: qa-bot/detect.js (card-actions).
import fs from 'node:fs';
let fails = 0; const ok = (c, m) => { if (c) return console.log('✓ ' + m); fails++; console.error('✗ ' + m); };
const css = fs.readFileSync('web/css/style.css', 'utf8') + fs.readFileSync('web/css/lazy-ui.css', 'utf8'), // + luật trang lười (css-lazy.mjs)
  det = fs.readFileSync('scripts/test/qa-bot/detect.js', 'utf8');
ok(/\.grid > \.card:has\([^{]*\{ display: flex; flex-direction: column; \}/.test(css), 'thẻ có hàng nút là cột flex');
ok(/margin-top: auto !important/.test(css), 'hàng nút ghim đáy, thắng margin-top nội tuyến');
ok(/\.card-acts > \.btn[^{]*\{ width: 100%; min-height: 44px; \}/.test(css), 'nút trong .card-acts cùng rộng, cao ≥ 44 px');
ok(/\.row:has\(> \.btn ~ \.btn\) > \.btn \{ flex: 1 1 auto; \}/.test(css), '2 nút chia đều dòng');
ok(/add\('card-actions', 'fail'/.test(det), 'QA bot báo đỏ khi nút lệch');
for (const f of ['listening', 'toeic']) { const s = fs.readFileSync(`web/js/${f}.js`, 'utf8'); ok(/class="card-acts"/.test(s) && !/<div class="row"[^>]*><a class="btn sm primary" href="#\/(listen|toeic-r)[^"]*">[^\n]*Nghe 1 lần/.test(s), `${f}: 3 nút dùng .card-acts`); }
if (fails) process.exit(1); console.log('✓ card-actions');
