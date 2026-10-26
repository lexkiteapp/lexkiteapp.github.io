// Chặn lỗi đường dẫn có dấu cách: new URL(..., import.meta.url).pathname trả về "%20" → hỏng khi thư mục repo có dấu cách. Dùng fileURLToPath(...).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = fileURLToPath(new URL('../', import.meta.url)), bad = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.(mjs|js)$/.test(e.name)) fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => { if (/import\.meta\.(url|resolve)/.test(l) && /\)\.pathname\b/.test(l) && !/fileURLToPath\(new URL\([^)]*\)\)\.pathname/.test(l)) bad.push(`${path.relative(ROOT, p)}:${i + 1}`); }); } };
walk(ROOT);
if (bad.length) { console.error('✗ no-url-pathname: dùng fileURLToPath() thay .pathname của import.meta.url:\n  ' + bad.join('\n  ')); process.exit(1); }
console.log('✓ no-url-pathname: không script nào lấy đường dẫn bằng .pathname của import.meta.url');
