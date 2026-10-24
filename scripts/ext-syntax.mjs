// node --check cho mọi extension/**/*.js: lỗi cú pháp không bao giờ lọt vào main nữa
import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import { spawnSync } from 'child_process';
const walk = d => readdirSync(d).flatMap(f => { if (f === 'node_modules') return []; const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
let bad = 0;
for (const f of walk('extension')) { const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' }); if (r.status) { bad++; console.error('SYNTAX ERROR ' + f + '\n' + r.stderr); } }
if (bad) process.exit(1);
console.log('ext-syntax OK');
// Kiểm thử E2E add-on chỉ chạy trên CI → kiểm cú pháp ngay ở npm test
{ const r = spawnSync(process.execPath, ['--check', 'scripts/test/ext-e2e.mjs'], { encoding: 'utf8' }); if (r.status) { console.error('SYNTAX ERROR scripts/test/ext-e2e.mjs\n' + r.stderr); process.exit(1); } }
// content.js khai báo hằng CSS (chuỗi kiểu bảng tra) → CSS.highlights trần sẽ là undefined: phải dùng window.CSS
{ const s = (await import('fs')).readFileSync('extension/content.js', 'utf8');
  if (/(^|[^.\w])CSS\.highlights/m.test(s)) { console.error('content.js: dùng window.CSS.highlights (hằng CSS che đối tượng toàn cục)'); process.exit(1); }
  if (!/::highlight\(lexkite-acad\)/.test(s) || !/caretPositionFromPoint/.test(s)) { console.error('content.js: thiếu đường gạch chân CSS Highlight API'); process.exit(1); } }
console.log('ext-syntax highlight OK');
