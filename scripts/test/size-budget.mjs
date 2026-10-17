// 📦 Ngân sách dung lượng & chất lượng nội dung – chặn ship khi app phình to hoặc chất lượng tụt (chạy trong npm test).
//   1) Khung app (SHELL trong web/sw.js – tải ngay lần đầu, mọi thiết bị): tổng gzip ≤ budget.shellGz
//   2) Mỗi file dữ liệu tải lười (web/js/**): gzip ≤ budget.fileGz – lớn hơn thì tách lô (data1/data2…) để mạng yếu vẫn mượt
//   3) Tổng web/js (trừ admin-*.js – chỉ trang quản trị): không vượt budget.totalJs (byte thô)
//   4) Cảnh báo content-check không được TĂNG so với mốc (chỉ được giảm; giảm thì tự hạ mốc bằng --update)
// Dùng: node scripts/test/size-budget.mjs [--update]
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { execFileSync } from 'child_process';
const B = 'scripts/test/budget.json', budget = JSON.parse(fs.readFileSync(B, 'utf8'));
const gz = f => zlib.gzipSync(fs.readFileSync(f), { level: 9 }).length, kb = n => (n / 1024).toFixed(0) + ' KB';
const errs = [];
// 1) Khung app
const sw = fs.readFileSync('web/sw.js', 'utf8'), shell = [...(sw.match(/const SHELL = \[([\s\S]*?)\];/) || [, ''])[1].matchAll(/'([^']+)'/g)].map(m => m[1]).filter(u => u !== './').map(u => u.endsWith('/') ? u + 'index.html' : u); // '/app/' = web/app/index.html (app học ở /app/)
let shellGz = 0; for (const u of shell) { const f = path.join('web', u); if (fs.existsSync(f)) shellGz += gz(f); }
if (!shell.includes('/app/index.html')) errs.push('SHELL trong web/sw.js thiếu /app/ (trang app học)');
// 1b) Trang giới thiệu tĩnh (/ + /<lang>/): tách khỏi khung app, phải rất nhẹ (HTML+CSS nội tuyến, không JS nặng)
const LAND_GZ = budget.landingGz || 16384; let landMax = 0;
for (const f of ['web/index.html', ...fs.readdirSync('web').filter(d => /^[a-z]{2}$/.test(d) && fs.existsSync(`web/${d}/index.html`)).map(d => `web/${d}/index.html`)]) { const g = gz(f); landMax = Math.max(landMax, g); if (g > LAND_GZ) errs.push(`Trang giới thiệu ${f} ${kb(g)} gzip > ${kb(LAND_GZ)}`); }
if (shellGz > budget.shellGz) errs.push(`Khung app ${kb(shellGz)} gzip > ngân sách ${kb(budget.shellGz)} – chuyển dữ liệu sang tải lười (App lazy) thay vì nạp lúc mở app`);
// 2) + 3) File JS
let total = 0; const big = [];
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (p.endsWith('.js')) { if (!/(^|\/)admin-[^/]*\.js$/.test(p)) total += fs.statSync(p).size; // admin-*.js: chỉ trang quản trị, không tải cho người học/add-on
 const g = gz(p); if (g > budget.fileGz && !(budget.allowBig || []).includes(p)) big.push(`${p} ${kb(g)}`); } } };
walk('web/js');
if (big.length) errs.push(`File dữ liệu > ${kb(budget.fileGz)} gzip – tách lô: ${big.join(', ')}`);
if (total > budget.totalJs) errs.push(`Tổng web/js ${(total / 1048576).toFixed(1)} MB > ${(budget.totalJs / 1048576).toFixed(1)} MB – rà dữ liệu trùng/thừa trước khi thêm`);
// 4) Chất lượng nội dung (ratchet)
let warn = -1; try { const out = execFileSync('node', ['scripts/test/content-check.mjs'], { encoding: 'utf8' }); warn = +((out.match(/(\d+) cảnh báo/) || [])[1] ?? -1); } catch (e) { errs.push('content-check lỗi: ' + String(e.stdout || e.message).split('\n').slice(-3).join(' ')); }
if (warn >= 0 && warn > budget.contentWarn) errs.push(`Cảnh báo nội dung tăng ${budget.contentWarn} → ${warn} – nội dung mới phải đủ phiên âm/ví dụ/lời giải (xem docs/CONTENT-RULES.md)`);
if (process.argv.includes('--update') || (warn >= 0 && warn < budget.contentWarn)) { if (warn >= 0) budget.contentWarn = warn; fs.writeFileSync(B, JSON.stringify(budget, null, 2) + '\n'); }
const line = `khung ${kb(shellGz)}/${kb(budget.shellGz)} gz · giới thiệu ≤ ${kb(landMax)}/${kb(LAND_GZ)} gz · web/js ${(total / 1048576).toFixed(1)}/${(budget.totalJs / 1048576).toFixed(1)} MB · cảnh báo nội dung ${warn}/${budget.contentWarn}`;
if (errs.length) { console.error('✗ size-budget: ' + line + '\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log('✓ size-budget: ' + line);
