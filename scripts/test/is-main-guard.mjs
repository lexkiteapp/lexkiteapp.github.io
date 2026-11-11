#!/usr/bin/env node
// Khối "chạy trực tiếp" của script phải so ĐÚNG đường dẫn: `import.meta.url === \`file://${process.argv[1]}\`` sai khi đường dẫn có dấu cách
// (import.meta.url mã hoá %20, argv[1] thì không) → khối main bị bỏ qua, test/script thoát 0 mà không làm gì = xanh giả (checkout "addon dictionary", 07/11, css-lazy).
// Dùng isMain(import.meta.url) từ scripts/lib/is-main.mjs (realpath + fileURLToPath) hoặc pathToFileURL(argv[1]).href.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { isMain } from '../lib/is-main.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
const sp = '/tmp/dir with space/x.mjs';
ok(isMain(pathToFileURL(sp).href, sp), 'isMain đúng với đường dẫn có dấu cách');
ok(!isMain(pathToFileURL(sp).href, '/tmp/other.mjs'), 'isMain sai với file khác');
ok(pathToFileURL(sp).href !== `file://${sp}`, 'xác nhận kiểu so chuỗi `file://${argv[1]}` lệch khi có dấu cách');
const RE = /import\.meta\.url\s*(?:===|==)\s*(?:`file:\/\/\$\{|['"]file:\/\/['"]\s*\+)/;
const hits = [], walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name);
  if (e.isDirectory()) { if (e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p); }
  else if (/\.(m?js)$/.test(e.name) && fs.readFileSync(p, 'utf8').split('\n').some(l => !/^\s*\/\//.test(l) && RE.test(l))) hits.push(p); } };
walk('scripts');
ok(!hits.length, 'so import.meta.url với `file://${…}` (hỏng khi đường dẫn có dấu cách) – dùng isMain(import.meta.url): ' + hits.join(', '));
if (bad) process.exit(1); console.log('✓ is-main-guard: không script nào so import.meta.url bằng chuỗi file://… (an toàn với đường dẫn có dấu cách)');
