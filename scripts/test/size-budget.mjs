// 📦 Ngân sách dung lượng & chất lượng nội dung – chặn ship khi app phình to hoặc chất lượng tụt (chạy trong npm test).
//   1) Khung app (SHELL trong web/sw.js ∪ script/CSS nạp ngay trong web/app/index.html – tải ngay lần đầu, mọi thiết bị): tổng gzip ≤ budget.shellGz
//      gzip CHUẨN (pako = zlib gốc, scripts/lib/gz-canon.mjs) → máy & CI ra cùng một số; không dùng zlib của Node (lệch theo bản dựng/CPU)
//   2) Mỗi file dữ liệu tải lười (web/js/**): gzip ≤ budget.fileGz – lớn hơn thì tách lô (data1/data2…) để mạng yếu vẫn mượt
//   3) Tổng web/js (trừ admin-*.js – chỉ trang quản trị): không vượt budget.totalJs (byte thô)
//   4) Cảnh báo content-check không được TĂNG so với mốc (chỉ được giảm; giảm thì tự hạ mốc bằng --update)
// Dùng: node scripts/test/size-budget.mjs [--update]
import fs from 'fs';
import path from 'path';
import { gzSize, firstLoadFiles, swShell } from '../lib/gz-canon.mjs'; // gzip chuẩn (pako = zlib gốc): cùng số trên máy & CI
import { execFileSync } from 'child_process';
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
let total = 0; const big = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) { if (!/(^|\/)admin-[^/]*\.js$/.test(p)) total += fs.statSync(p).size; // admin-*.js: chỉ trang quản trị, không tải cho người học/add-on
 const g = gz(p); if (g > budget.fileGz && !(budget.allowBig || []).includes(p)) big.push(`${p} ${kb(g)}`); } } };
walk('web/js');
if (big.length) errs.push(`File dữ liệu > ${kb(budget.fileGz)} gzip – tách lô: ${big.join(', ')}`);
if (total > budget.totalJs) errs.push(`Tổng web/js ${(total / 1048576).toFixed(1)} MB > ${(budget.totalJs / 1048576).toFixed(1)} MB – rà dữ liệu trùng/thừa trước khi thêm`);
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
// 4) Chất lượng nội dung (ratchet)
let warn = -1; try { const out = execFileSync('node', ['scripts/test/content-check.mjs'], { encoding: 'utf8' }); warn = +((out.match(/(\d+) cảnh báo/) || [])[1] ?? -1); } catch (e) { errs.push('content-check lỗi: ' + String(e.stdout || e.message).split('\n').slice(-3).join(' ')); }
if (warn >= 0 && warn > budget.contentWarn) errs.push(`Cảnh báo nội dung tăng ${budget.contentWarn} → ${warn} – nội dung mới phải đủ phiên âm/ví dụ/lời giải (xem docs/CONTENT-RULES.md)`);
if (process.argv.includes('--update') || (warn >= 0 && warn < budget.contentWarn)) { if (warn >= 0) budget.contentWarn = warn; fs.writeFileSync(B, JSON.stringify(budget, null, 2) + '\n'); }
const line = `khung ${kb(shellGz)}/${kb(budget.shellGz)} gz${routes.length ? ' · gói ' + routes.join(', ') : ''} · giới thiệu ≤ ${kb(landMax)}/${kb(LAND_GZ)} gz · web/js ${(total / 1048576).toFixed(1)}/${(budget.totalJs / 1048576).toFixed(1)} MB · cảnh báo nội dung ${warn}/${budget.contentWarn}`;
if (errs.length) { console.error('✗ size-budget: ' + line + '\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log('✓ size-budget: ' + line);
