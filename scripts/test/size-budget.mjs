// 📦 Ngân sách dung lượng & chất lượng nội dung – chặn ship khi app phình to hoặc chất lượng tụt (chạy trong npm test).
//   1) Khung app (SHELL trong web/sw.js ∪ script/CSS nạp ngay trong web/app/index.html – tải ngay lần đầu, mọi thiết bị): tổng gzip ≤ budget.shellGz
//      gzip CHUẨN (pako = zlib gốc, scripts/lib/gz-canon.mjs) → máy & CI ra cùng một số; không dùng zlib của Node (lệch theo bản dựng/CPU)
//   2) Mỗi file dữ liệu tải lười (web/js/**): gzip ≤ budget.fileGz – lớn hơn thì tách lô (data1/data2…) để mạng yếu vẫn mượt
//   3) Byte người học tải = web/js (trừ admin.js/admin-*.js + thư viện chỉ trang quản trị nạp – và nguồn dựng en.js không ai nạp; scripts/lib/js-budget.mjs): − Σ gói ngôn ngữ + gói LỚN NHẤT (scripts/lib/js-budget.mjs learnerBytes; 5/11 chủ duyệt) không vượt budget.totalJs (byte thô); phụ: mỗi gói ≤ budget.langPackMax, tổng cả kho ≤ budget.totalAll
//      Còn < 1% trống → cảnh báo sớm (::warning:: trên CI) để rà dữ liệu thừa TRƯỚC khi các PR cùng đỏ (3/11: main còn 12 KB, 5 PR đỏ cùng lúc)
//   4) Cảnh báo content-check không được TĂNG so với mốc (chỉ được giảm; giảm thì tự hạ mốc bằng --update)
// Dùng: node scripts/test/size-budget.mjs [--update]
import fs from 'fs';
import path from 'path';
import { gzSize, firstLoadFiles, swShell } from '../lib/gz-canon.mjs'; // gzip chuẩn (pako = zlib gốc): cùng số trên máy & CI
import { execFileSync } from 'child_process';
import { lowHeadroom } from '../lib/headroom.mjs';
import { learnerBytes } from '../lib/js-budget.mjs'; // byte người học tải: bỏ mã chỉ quản trị + nguồn dựng en.js (đã gộp vào en.js)
const B = 'scripts/test/budget.json', budget = JSON.parse(fs.readFileSync(B, 'utf8'));
const gz = f => gzSize(fs.readFileSync(f)), kb = n => (n / 1024).toFixed(0) + ' KB';
const errs = [];
// 1) Khung app
const shell = firstLoadFiles(); // SHELL (sw.js) ∪ file nạp ngay trong /app/ – xem scripts/lib/gz-canon.mjs
let shellGz = 0; for (const u of shell) { const f = path.join('web', u); if (fs.existsSync(f)) shellGz += gz(f); }
if (!swShell().includes('/app/index.html')) errs.push('SHELL trong web/sw.js thiếu /app/ (trang app học)');
// 1b) Trang giới thiệu tĩnh (/ + /<lang>/): tách khỏi khung app, phải rất nhẹ (HTML+CSS nội tuyến, không JS nặng)
const LAND_GZ = budget.landingGz || 16384; let landMax = 0;
for (const f of ['web/index.html', ...fs.readdirSync('web').filter(d => /^[a-z]{2}$/.test(d) && fs.existsSync(`web/${d}/index.html`)).map(d => `web/${d}/index.html`)]) { const g = gz(f); landMax = Math.max(landMax, g); if (g > LAND_GZ) errs.push(`Trang giới thiệu ${f} ${kb(g)} gzip > ${kb(LAND_GZ)}`); }
if (shellGz > budget.shellGz) errs.push(`Khung app ${kb(shellGz)} gzip > ngân sách ${kb(budget.shellGz)} – chuyển dữ liệu sang tải lười (App lazy) thay vì nạp lúc mở app; xem từng module: node scripts/test/shell-size.mjs`);
// 2) + 3) File JS
const LB = learnerBytes('.'), total = LB.learner, big = []; // 5/11: nền + gói ngôn ngữ LỚN NHẤT (người học thật tải)
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) {
 const g = gz(p); if (g > budget.fileGz && !(budget.allowBig || []).includes(p)) big.push(`${p} ${kb(g)}`); } } };
walk('web/js');
const free = budget.totalJs - total;
if (free >= 0 && free < budget.totalJs * 0.01) console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : '⚠ '}size-budget: web/js chỉ còn ${kb(free)} trống (< 1%) – rà dữ liệu trùng/thừa ngay, PR thêm JS kế tiếp sẽ đỏ`);
if (big.length) errs.push(`File dữ liệu > ${kb(budget.fileGz)} gzip – tách lô: ${big.join(', ')}`);
if (total > budget.totalJs) errs.push(`Byte người học (nền + gói ${LB.topLang} lớn nhất) ${total} B > ${budget.totalJs} B – rà dữ liệu trùng/thừa trước khi thêm`);
// 3a) Kiểm tra phụ (thước nền+1 gói không được che phình): từng gói ngôn ngữ ≤ langPackMax; tổng cả kho (13 gói) ≤ totalAll → không tăng vô hạn
for (const [l, n] of Object.entries(LB.packs)) if (n > budget.langPackMax) errs.push(`Gói ngôn ngữ ${l} ${n} B > ${budget.langPackMax} B (budget.langPackMax) – rà khóa dịch thừa/trùng trước`);
if (LB.total > budget.totalAll) errs.push(`Tổng cả kho web/js ${LB.total} B > ${budget.totalAll} B (budget.totalAll) – rà dữ liệu thừa, không tăng vô hạn`);
// 3b) Trần chỉ đi xuống: tổng thực tế thấp hơn trần ≥ 200 KB → ĐỎ, nhắc hạ trần (nâng tạm 3/11 cho #284, về ≤ 19,97 MB sau tái cấu trúc i18n)
const SLACK = 200 * 1024;
if (budget.totalJs - total >= SLACK) errs.push(`Tổng web/js ${total} B thấp hơn trần ${budget.totalJs} B ≥ 200 KB – hạ "totalJs" trong ${B} về ≤ ${total + 50000} (trần chỉ đi xuống)`);
// 3c) Tải lần đầu theo route (người dùng thật, gzip chuẩn): JS gói + CSS gói (app.js BUNDLES/BCSS) không vượt mốc main – chỉ số chính, tổng trên đĩa là phụ
const APP = fs.readFileSync('web/js/app.js', 'utf8');
const list = (obj, k) => { const m = APP.match(new RegExp(`\\b${obj} = \\{[\\s\\S]*?\\b${k}: *(\\[[^\\]]*\\])`)); return m ? [...m[1].matchAll(/'([^']+)'/g)].map(x => x[1]) : null; };
const routes = [];
for (const [k, cap] of Object.entries(budget.routeGz || {})) {
  if (k.startsWith('_')) continue;
  const js = list('BUNDLES', k), css = list('BCSS', k);
  if (!js) { errs.push(`routeGz.${k}: không thấy gói "${k}" trong BUNDLES (web/js/app.js)`); continue; }
  const miss = [...js, ...(css || [])].filter(u => !fs.existsSync(path.join('web', u)));
  if (miss.length) errs.push(`routeGz.${k}: tệp gói không tồn tại: ${miss.join(', ')}`);
  const n = [...js, ...(css || [])].filter(u => fs.existsSync(path.join('web', u))).reduce((a, u) => a + gz(path.join('web', u)), 0);
  routes.push(`${k} ${kb(n)}/${kb(cap)}`);
  if (n > cap) errs.push(`Gói "${k}" tải lần đầu ${n} B gz > ${cap} B – tách màn ít dùng sang tải theo màn (vd st/v2/runtime.js LZ), không cắt tính năng`);
}
// 3d) Gói nội dung tải lười web/cpack (ngoài web/js; tải theo gói, tên băm, immutable – scripts/build-cpack.mjs): vẫn có trần, không phải đường tắt
let cpackRaw = 0; const cwalk = d => { if (!fs.existsSync(d)) return; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) cwalk(p); else if (p.endsWith('.js')) { cpackRaw += fs.statSync(p).size; const g = gz(p); if (g > budget.fileGz) errs.push(`Gói nội dung ${p} ${kb(g)} gzip > ${kb(budget.fileGz)} – tách lô`); } } };
cwalk('web/cpack');
if (cpackRaw > budget.cpackTotal) errs.push(`web/cpack ${cpackRaw} B > ${budget.cpackTotal} B (budget.cpackTotal) – rà dữ liệu thừa trước khi nâng`);
// 4) Chất lượng nội dung (ratchet)
let warn = -1; try { const out = execFileSync('node', ['scripts/test/content-check.mjs'], { encoding: 'utf8' }); warn = +((out.match(/(\d+) cảnh báo/) || [])[1] ?? -1); } catch (e) { errs.push('content-check lỗi: ' + String(e.stdout || e.message).split('\n').slice(-3).join(' ')); }
if (warn >= 0 && warn > budget.contentWarn) errs.push(`Cảnh báo nội dung tăng ${budget.contentWarn} → ${warn} – nội dung mới phải đủ phiên âm/ví dụ/lời giải (xem docs/CONTENT-RULES.md)`);
if (process.argv.includes('--update') || (warn >= 0 && warn < budget.contentWarn)) { if (warn >= 0) budget.contentWarn = warn; fs.writeFileSync(B, JSON.stringify(budget, null, 2) + '\n'); }
// 06/11: cảnh báo sớm mọi ngân sách (dư < 5 KB hoặc < 2 %) – máy gác budget-watch (scripts/ci/guards.mjs) đọc dòng HEADROOM: để mở issue
const headroom = lowHeadroom([{ name: 'khung app (gz)', used: shellGz, cap: budget.shellGz }, { name: 'byte người học (web/js)', used: total, cap: budget.totalJs }, { name: 'cả kho web/js', used: LB.total, cap: budget.totalAll },
  { name: 'web/cpack', used: cpackRaw, cap: budget.cpackTotal }, { name: 'gói ngôn ngữ lớn nhất', used: Math.max(0, ...Object.values(LB.packs)), cap: budget.langPackMax }, { name: 'trang giới thiệu (gz)', used: landMax, cap: LAND_GZ }]);
for (const h of headroom) console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : '⚠ '}size-budget: ${h.name} còn ${kb(h.free)} trống (${(100 * h.free / h.cap).toFixed(1)} %) – sắp hết ngân sách, rà dữ liệu thừa trước khi PR kế tiếp đỏ`);
// 10/11: gói ngôn ngữ nào còn dư < 5 % langPackMax → cảnh báo sớm (cả 13 gói, không chỉ gói lớn nhất) để rời nhóm nặng sang web/cpack (CPACK_I18N, scripts/lib/i18n-pack.mjs) trước khi PR kế tiếp đỏ
for (const [l, n] of Object.entries(LB.packs)) { const free = budget.langPackMax - n; if (free >= 0 && free < budget.langPackMax * 0.05) { const m = `size-budget: gói ngôn ngữ ${l} còn ${kb(free)} trống (${(100 * free / budget.langPackMax).toFixed(1)} % < 5 %) – dời nhóm dịch nặng sang web/cpack (CPACK_I18N) trước khi PR kế tiếp đỏ`; console.log(`${process.env.GITHUB_ACTIONS ? '::warning::' : '⚠ '}${m}`); headroom.push({ name: `gói ngôn ngữ ${l}`, used: n, cap: budget.langPackMax, free }); } }
if (process.argv.includes('--headroom')) console.log('HEADROOM:' + JSON.stringify(headroom));
const line = `khung ${kb(shellGz)}/${kb(budget.shellGz)} gz${routes.length ? ' · gói ' + routes.join(', ') : ''} · giới thiệu ≤ ${kb(landMax)}/${kb(LAND_GZ)} gz · người học ${(total / 1048576).toFixed(2)}/${(budget.totalJs / 1048576).toFixed(2)} MB (nền+${LB.topLang}, còn ${kb(free)}) · gói nội dung ${(cpackRaw / 1048576).toFixed(2)} MB · cả kho ${(LB.total / 1048576).toFixed(1)} MB · cảnh báo nội dung ${warn}/${budget.contentWarn}`;
if (errs.length) { console.error('✗ size-budget: ' + line + '\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log('✓ size-budget: ' + line);
