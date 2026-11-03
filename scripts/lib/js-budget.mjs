// Tổng web/js cho ngân sách size-budget (scripts/test/size-budget.mjs) – một chỗ định nghĩa "byte người học tải".
//  - admin-*.js: chỉ trang quản trị, không tải cho người học/add-on.
//  - Nguồn dựng en.js (web/js/i18n/en/<nhóm>.js của vòng `for f in …` trong scripts/build-i18n.sh): build-i18n.sh GỘP chúng vào en.js,
//    trình duyệt chỉ tải en.js → đếm cả hai là tính chuỗi tiếng Anh HAI lần (3/11: ~126 KB, main kẹt 19 958 132/19 970 000 B → mọi PR thêm JS đỏ).
//    Chỉ bỏ nhóm KHÔNG được nạp lúc chạy: nhóm nào có đường dẫn `i18n/en/<nhóm>.js` (hoặc tên nhóm cạnh `i18n/en/` – kiểu map tên → `js/i18n/en/${n}.js`)
//    trong web/ hay extension/ (ngoài thư mục i18n) thì vẫn đếm (vd. writecheck: add-on nạp en/writecheck.js). Test: scripts/test/js-budget.mjs
import fs from 'node:fs';
import path from 'node:path';

const isAdmin = p => /(^|\/)admin-[^/]*\.js$/.test(p);
/** Danh sách nhóm nguồn gộp vào en.js – đọc từ chính build-i18n.sh (thuần). */
export function enBuildGroups(sh) { const m = String(sh).match(/for f in ([\w ]+); do cat "en\/\$f\.js"/); return m ? m[1].trim().split(/\s+/) : []; }
/** Nhóm có được nạp lúc chạy không (thuần): corpus = văn bản mã web/extension (ngoài web/js/i18n). */
export function loadedAtRuntime(group, corpus) {
  if (String(corpus).includes(`i18n/en/${group}.js`)) return true;
  const q = new RegExp(`['"\`]${group}['"\`]`);
  return String(corpus).split('\n').some(l => l.includes('i18n/en/') && q.test(l));
}
function corpusOf(root) {
  let out = '';
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name), rel = path.relative(root, p);
    if (e.isDirectory()) { if (!/^(web\/js\/i18n|extension\/app)$/.test(rel) && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p); }
    else if (/\.(m?js|html|json)$/.test(e.name) && fs.statSync(p).size < 2e6) out += fs.readFileSync(p, 'utf8') + '\n'; } };
  for (const d of ['web', 'extension']) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));
  return out;
}
/** Nguồn en chỉ dùng lúc dựng (không trình duyệt/add-on nào nạp) → [đường dẫn tương đối]. */
export function buildOnlyEn(root = '.') {
  const sh = path.join(root, 'scripts/build-i18n.sh'); if (!fs.existsSync(sh)) return [];
  const corpus = corpusOf(root);
  return enBuildGroups(fs.readFileSync(sh, 'utf8')).filter(g => !loadedAtRuntime(g, corpus)).map(g => `web/js/i18n/en/${g}.js`).filter(f => fs.existsSync(path.join(root, f)));
}
/** { total, skipped: [{file, size}] } – byte thô web/js/**.js trừ admin-*.js và nguồn dựng en. */
export function jsTotal(root = '.') {
  const skip = new Set(buildOnlyEn(root)); let total = 0; const skipped = [];
  const walk = d => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (p.endsWith('.js') && !isAdmin(p)) { const s = fs.statSync(path.join(root, p)).size; if (skip.has(p)) skipped.push({ file: p, size: s }); else total += s; } } };
  walk('web/js');
  return { total, skipped };
}
