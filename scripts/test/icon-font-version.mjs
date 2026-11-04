// 🔤 Font icon thu gọn phải có ?v=<hash nội dung> ở MỌI CSS: sw.js cache-first theo URL, font cũ thiếu icon mới → icon hiện chữ cái đầu ("F", "D" ở trang giới thiệu, chủ 4/11). Icon trang giới thiệu phải có trong bộ thu gọn.
import fs from 'node:fs'; import path from 'node:path'; import { createHash } from 'node:crypto';
const V = n => createHash('md5').update(fs.readFileSync(`web/fonts/${n}.woff2`)).digest('hex').slice(0, 8), want = { msym: V('msym'), msymr: V('msymr') }, errs = [];
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(path.join(d, e.name)) : /\.css$/.test(e.name) ? [path.join(d, e.name)] : []));
let n = 0;
for (const f of walk('web/css')) for (const m of fs.readFileSync(f, 'utf8').matchAll(/fonts\/(msymr?)\.woff2(?:\?v=(\w+))?/g)) { n++; if (m[2] !== want[m[1]]) errs.push(`${f}: ${m[0]} ≠ ?v=${want[m[1]]} (chạy node scripts/build-stitch-css.mjs)`); }
if (!n) errs.push('không thấy @font-face icon nào trong web/css – cổng không được im lặng');
const have = new Set(JSON.parse(fs.readFileSync('web/fonts/msym.json', 'utf8')));
for (const m of fs.readFileSync('web/index.html', 'utf8').matchAll(/material-symbols-rounded[^>]*>([a-z_0-9]+)</g)) if (!have.has(m[1])) errs.push(`trang giới thiệu: icon "${m[1]}" không có trong web/fonts/msym.json`);
if (errs.length) { console.error('✗ icon-font-version:\n  ' + [...new Set(errs)].slice(0, 12).join('\n  ')); process.exit(1); }
console.log(`✓ icon-font-version: ${n} chỗ khai báo font đúng phiên bản`);
