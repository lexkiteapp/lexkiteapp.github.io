// 🎨 Chặn dùng lại màu Kit cũ đã bỏ (lưng xanh dương #2F62C0 / #244E9E) – Kit chỉ lấy từ web/js/kit.js (docs/BRAND-RULES.md)
import fs from 'fs';
import path from 'path';
const OLD = /#(2F62C0|244E9E)\b/i, bad = [];
const walk = d => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (!/^(node_modules|\.git|app)$/.test(e.name)) walk(p); } else if (/\.(svg|html|css|js|mjs|json)$/.test(e.name) && OLD.test(fs.readFileSync(p, 'utf8'))) bad.push(p); } };
['brand', 'web', 'store', 'extension', 'mobile/www', 'scripts'].forEach(walk);
const me = 'scripts/test/brand-check.mjs', list = bad.filter(p => p !== me);
if (list.length) { console.error('✗ brand-check: màu Kit cũ (#2F62C0/#244E9E) còn ở:\n  - ' + list.join('\n  - ') + '\n  → dùng Kit.svg() từ web/js/kit.js (docs/BRAND-RULES.md)'); process.exit(1); }
console.log('✓ brand-check: không còn Kit màu cũ – nguồn Kit duy nhất web/js/kit.js');
