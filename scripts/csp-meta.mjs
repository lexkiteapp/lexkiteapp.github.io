// Bước CUỐI scripts/build-web.sh: chèn <meta http-equiv="Content-Security-Policy"> (sha256 từng script nội tuyến, không 'unsafe-inline')
// vào MỌI trang HTML của dist/ rồi tự kiểm lại – trang nào còn script nội tuyến thiếu hash hoặc handler on*= → build đỏ (docs/SECURITY-CSP.md).
// Phải chạy SAU mọi bước sửa HTML (hash = nội dung chính xác). Dùng: node scripts/csp-meta.mjs [dist] [--check|--dry]
import fs from 'fs';
import path from 'path';
import { injectMeta, checkPage, sitePolicy } from './lib/csp.mjs';

const root = process.argv.slice(2).find(a => !a.startsWith('--')) || 'dist';
const check = process.argv.includes('--check'), dry = process.argv.includes('--dry'); // --dry: chèn trong bộ nhớ + kiểm, không ghi (chạy trên web/)
const policy = sitePolicy();
let n = 0, scripts = 0; const errs = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); continue; }
    if (!e.name.endsWith('.html')) continue;
    let html = fs.readFileSync(p, 'utf8');
    if (!check) { const out = injectMeta(html, policy); if (out !== html) { html = out; if (!dry) fs.writeFileSync(p, out); } }
    n++; scripts += (html.match(/'sha256-/g) || []).length;
    for (const x of checkPage(html, policy)) errs.push(path.relative(root, p) + ': ' + x);
  }
})(root);
if (errs.length) { console.error(`✗ csp-meta: ${errs.length} lỗi\n  - ` + errs.slice(0, 40).join('\n  - ')); process.exit(1); }
console.log(`✓ csp-meta: ${n} trang HTML có meta CSP (${scripts} hash script nội tuyến, không 'unsafe-inline', không handler on*=)`);
