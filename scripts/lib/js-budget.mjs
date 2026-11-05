// Tổng web/js cho ngân sách size-budget (scripts/test/size-budget.mjs) – một chỗ định nghĩa "byte người học tải".
//  - admin.js + admin-*.js: chỉ web/admin.html nạp, không tải cho người học/add-on (build-mobile.sh cũng bỏ admin.js).
//    3/11: regex cũ chỉ bắt admin-*.js → admin.js (180 KB) bị đếm như byte người học.
//  - Thư viện chỉ mã quản trị nạp (vd. vendor/jsvectormap – bản đồ tab Phân tích, ~134 KB): đường dẫn js/… xuất hiện trong mã quản trị
//    nhưng KHÔNG xuất hiện trong mã người học (web/extension ngoài admin) → không tính. Người học tham chiếu tới là tính lại ngay.
//  - Nguồn dựng en.js (web/js/i18n/en/<nhóm>.js của vòng `for f in …` trong scripts/build-i18n.sh): build-i18n.sh GỘP chúng vào en.js,
//    trình duyệt chỉ tải en.js → đếm cả hai là tính chuỗi tiếng Anh HAI lần (3/11: ~126 KB, main kẹt 19 958 132/19 970 000 B → mọi PR thêm JS đỏ).
//    Chỉ bỏ nhóm KHÔNG được nạp lúc chạy: nhóm nào có đường dẫn `i18n/en/<nhóm>.js` (hoặc tên nhóm cạnh `i18n/en/` – kiểu map tên → `js/i18n/en/${n}.js`)
//    trong web/ hay extension/ (ngoài thư mục i18n) thì vẫn đếm (vd. writecheck: add-on nạp en/writecheck.js). Test: scripts/test/js-budget.mjs
import fs from 'node:fs';
import path from 'node:path';

const isAdmin = p => /(^|\/)admin(-[^/]*)?\.js$/.test(p);
export { isAdmin };
/** Danh sách nhóm nguồn gộp vào en.js – đọc từ chính build-i18n.sh (thuần). */
export function enBuildGroups(sh) { const m = String(sh).match(/for f in ([\w ]+); do cat "en\/\$f\.js"/); return m ? m[1].trim().split(/\s+/) : []; }
/** Nhóm có được nạp lúc chạy không (thuần): corpus = văn bản mã web/extension (ngoài web/js/i18n). */
export function loadedAtRuntime(group, corpus) {
  if (String(corpus).includes(`i18n/en/${group}.js`)) return true;
  const q = new RegExp(`['"\`]${group}['"\`]`);
  return String(corpus).split('\n').some(l => l.includes('i18n/en/') && q.test(l));
}
function corpusOf(root, skip = () => false) {
  let out = '';
  const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name), rel = path.relative(root, p);
    if (e.isDirectory()) { if (!/^(web\/js\/i18n|extension\/app)$/.test(rel) && e.name !== 'node_modules' && !e.name.startsWith('.')) walk(p); }
    else if (/\.(m?js|html|json)$/.test(e.name) && !skip(rel) && fs.statSync(p).size < 2e6) out += fs.readFileSync(p, 'utf8') + '\n'; } };
  for (const d of ['web', 'extension']) if (fs.existsSync(path.join(root, d))) walk(path.join(root, d));
  return out;
}
/** Nguồn en chỉ dùng lúc dựng (không trình duyệt/add-on nào nạp) → [đường dẫn tương đối]. */
export function buildOnlyEn(root = '.') {
  const sh = path.join(root, 'scripts/build-i18n.sh'); if (!fs.existsSync(sh)) return [];
  const corpus = corpusOf(root);
  return enBuildGroups(fs.readFileSync(sh, 'utf8')).filter(g => !loadedAtRuntime(g, corpus)).map(g => `web/js/i18n/en/${g}.js`).filter(f => fs.existsSync(path.join(root, f)));
}
const isAdminSrc = rel => rel === 'web/admin.html' || (rel.startsWith('web/js/') && isAdmin(rel));
/** Đường dẫn web/js/… mà mã quản trị nạp (thuần): adminText = admin.html + admin*.js. */
export function adminRefs(adminText) { return [...new Set((String(adminText).match(/\bjs\/[\w./-]+\.js\b/g) || []).map(r => 'web/' + r))]; }
/** Tham chiếu có thuộc người học không (thuần): corpus = mã web/extension ngoài trang quản trị. So cả 'js/x/y.js' lẫn 'x/y.js'. */
export function learnerUses(file, corpus) { const r = file.replace(/^web\//, ''); return String(corpus).includes(r) || String(corpus).includes(r.replace(/^js\//, '/')); }
/** File web/js chỉ trang quản trị nạp (ngoài admin*.js) → [đường dẫn tương đối]. */
export function adminOnlyDeps(root = '.') {
  const W = path.join(root, 'web'); if (!fs.existsSync(path.join(W, 'admin.html'))) return [];
  let txt = fs.readFileSync(path.join(W, 'admin.html'), 'utf8');
  for (const f of fs.readdirSync(path.join(W, 'js'))) if (isAdmin(f)) txt += '\n' + fs.readFileSync(path.join(W, 'js', f), 'utf8');
  const corpus = corpusOf(root, isAdminSrc);
  return adminRefs(txt).filter(f => !isAdmin(f) && fs.existsSync(path.join(root, f)) && !learnerUses(f, corpus));
}
/** { total, skipped: [{file, size}], admin: [{file, size}] } – byte thô web/js/**.js trừ admin*.js, thư viện chỉ quản trị dùng và nguồn dựng en. */
export function jsTotal(root = '.') {
  const skip = new Set(buildOnlyEn(root)), adm = new Set(adminOnlyDeps(root)); let total = 0; const skipped = [], admin = [];
  const walk = d => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) { const s = fs.statSync(path.join(root, p)).size;
      if (isAdmin(p) || adm.has(p)) admin.push({ file: p, size: s }); else if (skip.has(p)) skipped.push({ file: p, size: s }); else total += s; } } };
  walk('web/js');
  return { total, skipped, admin };
}

// ---- 5/11: thước "người học thật tải" = nền + MỘT gói ngôn ngữ (chủ duyệt: "Đồng ý đổi"). Mỗi người học chỉ tải en (nền) + gói ngôn ngữ của mình
// (web/js/i18n/<lang>.js + i18n/<lang>/**.js), không tải 12 gói còn lại → đếm cả 13 gói là đếm byte không ai tải cùng lúc.
/** { en, packs: {lang: byte}} – gói ngôn ngữ ≠ en; en nằm trong nền. Nguồn dựng en.js (đã bỏ khỏi total) không vào đây. */
export function langPacks(root = '.') {
  const I = path.join(root, 'web/js/i18n'), packs = {}, sizeOf = d => { let n = 0; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); n += e.isDirectory() ? sizeOf(p) : p.endsWith('.js') ? fs.statSync(p).size : 0; } return n; };
  for (const e of fs.readdirSync(I, { withFileTypes: true })) { const m = e.name.match(/^([a-z]{2})(\.js)?$/); if (!m || m[1] === 'en') continue; const p = path.join(I, e.name); packs[m[1]] = (packs[m[1]] || 0) + (e.isDirectory() ? sizeOf(p) : fs.statSync(p).size); }
  return packs;
}
/** Thước mới: total (đã trừ admin + nguồn dựng) − Σ gói ngôn ngữ + gói LỚN NHẤT (người học xấu nhất, không phải trung bình). */
export function learnerBytes(root = '.') {
  const { total } = jsTotal(root), packs = langPacks(root), sum = Object.values(packs).reduce((a, b) => a + b, 0), top = Object.entries(packs).sort((a, b) => b[1] - a[1])[0] || ['', 0];
  return { learner: total - sum + top[1], total, packs, sum, topLang: top[0], topSize: top[1] };
}
