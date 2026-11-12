// Lớp lỗi "focus vào phần tử không tồn tại" (journey-e2e tìm ra: màn thiết lập gọi $('[data-exam]').focus() sau khi giao diện đổi sang data-track → null.focus() ném lỗi).
// Kiểm: mọi $(…).focus()/.select() trong web/js phải trỏ tới id/thuộc tính có được vẽ ở đâu đó (bắt focus vào phần tử đã bị xóa hẳn; phần tử chỉ thiếu trên 1 màn → journey-e2e bắt lúc chạy).
// + UI.closeModal trả focus về phần tử còn trong trang (không rơi về <body> khi phần tử cũ đã bị vẽ lại).
import fs from 'node:fs';
import path from 'node:path';
const files = []; const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) { if (!/vendor|i18n/.test(e.name)) walk(f); } else if (f.endsWith('.js')) files.push(f); } };
walk('web/js');
const src = Object.fromEntries(files.map(f => [f, fs.readFileSync(f, 'utf8')]));
const all = Object.values(src).join('\n');
const bad = [];
for (const [f, s] of Object.entries(src)) {
  for (const m of s.matchAll(/\$\((['"`])([#\[][^'"`]+)\1\)\.(focus|select)\(\)/g)) {
    const sel = m[2], idm = /^#([\w-]+)$/.exec(sel), am = /^\[([\w-]+)(?:=|\])/.exec(sel);
    const need = idm ? new RegExp(`id=\\\\?["']${idm[1]}\\\\?["']|id="\\$\\{[^}]*\\}|\\.id\\s*=\\s*['"]${idm[1]}['"]`) : am ? new RegExp(`\\s${am[1]}(=|[\\s>])`) : null;
    if (need && !need.test(all)) bad.push(`${f}: ${m[0]} – không có phần tử ${sel} nào được vẽ trong web/js`);
  }
}
const ui = src['web/js/ui.js'] || '';
if (!/closeModal = \(\) => \{[^\n]*isConnected/.test(ui)) bad.push('web/js/ui.js: closeModal phải kiểm lastFocus.isConnected (trả focus khi phần tử cũ đã bị vẽ lại)');
const rem = src['web/js/remind.js'] || '';
if (!/canAsk[\s\S]{0,400}lk\.edu/.test(rem)) bad.push('web/js/remind.js: canAsk phải loại học sinh lớp học (lk.edu) – không mời nhắc học');
for (const b of bad) console.log('✗ ' + b);
console.log(bad.length ? `✗ focus-targets: ${bad.length} lỗi` : '✓ focus-targets: mọi lệnh focus trỏ tới phần tử có thật, hộp thoại trả focus an toàn, lớp học không bị mời nhắc học');
process.exit(bad.length ? 1 : 0);
