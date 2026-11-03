// Ngân sách web/js đếm đúng "byte người học tải" (scripts/lib/js-budget.mjs): nguồn dựng en.js không bị tính 2 lần,
// nhưng nhóm nào được nạp lúc chạy (đường dẫn trực tiếp hoặc map tên → js/i18n/en/${n}.js) thì VẪN tính – không có lỗ hổng che byte thật.
import fs from 'node:fs';
import { enBuildGroups, loadedAtRuntime, buildOnlyEn, jsTotal } from '../lib/js-budget.mjs';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const sh = fs.readFileSync('scripts/build-i18n.sh', 'utf8'), groups = enBuildGroups(sh);
ok(groups.includes('core') && groups.includes('shell') && groups.length >= 8, `đọc được danh sách nhóm gộp en.js từ build-i18n.sh (${groups.join(' ')})`);
ok(enBuildGroups('echo x').length === 0, 'không có vòng for → [] (không bỏ gì)');
ok(loadedAtRuntime('core', "loadOne('js/i18n/en/core.js')"), 'đường dẫn trực tiếp → đang nạp');
ok(loadedAtRuntime('core', "i18nx: ['structs', 'core'].map(n => `js/i18n/en/${n}.js`)"), 'map tên → js/i18n/en/${n}.js → đang nạp');
ok(!loadedAtRuntime('core', "const SHELL = ['/js/i18n/en.js', '/js/core.js'];"), 'en.js + js/core.js (khác nhóm i18n) → không tính là nạp en/core.js');
ok(!loadedAtRuntime('ext', "load('js/i18n/en/extpanel.js')"), 'extpanel không làm nhóm ext bị coi là nạp');
const skip = buildOnlyEn('.');
ok(!skip.includes('web/js/i18n/en/writecheck.js'), 'writecheck (add-on nạp en/writecheck.js) vẫn được tính');
for (const f of skip) ok(groups.includes(f.match(/en\/(\w+)\.js$/)[1]), `${f} phải là nhóm gộp vào en.js`);
// mọi chuỗi của nguồn bị bỏ phải có trong en.js (đúng là bản gộp, không mất byte thật)
const en = fs.readFileSync('web/js/i18n/en.js', 'utf8');
for (const f of skip) { const src = fs.readFileSync(f, 'utf8').trim(); ok(en.includes(src.slice(0, 2000)) && en.includes(src.slice(-2000)), `${f} đã nằm nguyên trong en.js`); }
const { total, skipped } = jsTotal('.');
ok(total > 0 && skipped.length === skip.length, 'jsTotal đếm được và bỏ đúng các nguồn dựng');
console.log(fails ? `js-budget: ${fails} lỗi` : `✓ js-budget: bỏ ${skipped.length} nguồn dựng en.js (${(skipped.reduce((s, x) => s + x.size, 0) / 1024).toFixed(0)} KB, đã có trong en.js) · tổng ${(total / 1048576).toFixed(2)} MB`);
process.exit(fails ? 1 : 0);
