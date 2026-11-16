// Vùng quét chung (scripts/lib/scan-roots.mjs): gói nội dung tải lười web/cpack được kiểm đủ như web/js – dời dữ liệu sang cpack (size-budget) không mở lỗ quét.
// Kiểm: (1) mọi file trong web/cpack nằm trong SCAN_ROOTS; (2) các bộ quét "toàn web/js" đọc từ SCAN_ROOTS, không còn gốc cứng 'web/js';
// (3) đề nghe ở cả hai nơi được dataFiles gom đủ, đúng thứ tự số, và đều có trong gói app.js. Chạy: node scripts/test/scan-roots.mjs
import fs from 'node:fs'; import path from 'node:path';
import { SCAN_ROOTS, dataFiles } from '../lib/scan-roots.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } };
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name).split(path.sep).join('/')]);
ok(SCAN_ROOTS.includes('web/js') && SCAN_ROOTS.includes('web/cpack'), 'SCAN_ROOTS gồm web/js + web/cpack');
const cp = fs.existsSync('web/cpack') ? walk('web/cpack') : [];
for (const f of cp) ok(SCAN_ROOTS.some(r => f.startsWith(r + '/')), `${f} nằm ngoài vùng quét SCAN_ROOTS`);
// Bộ quét toàn kho: phải dùng SCAN_ROOTS (thêm bộ quét mới → thêm vào đây)
const SCANNERS = { 'scripts/i18n-missing.mjs': "walk('web/js')", 'scripts/vi-lint.mjs': 'walk(ROOT,', 'scripts/test/comment-code.mjs': "walk('web/js')", 'scripts/audio/tts-sites.mjs': "walk('web/js')", 'scripts/test/frame-consistency.mjs': "walk('web/js')", 'scripts/content-qa/gate.mjs': "readdirSync(P('web/js')" };
for (const [f, old] of Object.entries(SCANNERS)) { const s = fs.readFileSync(f, 'utf8'); ok(/\bSCAN_ROOTS\b/.test(s) && /scan-roots\.mjs/.test(s), `${f}: chưa đọc gốc quét từ scripts/lib/scan-roots.mjs`); ok(!s.includes(old), `${f}: còn gốc quét cứng ${old}`); }
// Đề nghe IELTS: web/js/listen + web/cpack/listen
const L = dataFiles('listen', /^test\d+\.js$/), app = fs.readFileSync('web/js/app.js', 'utf8');
ok(L.length >= 10 && L.some(f => f.startsWith('web/cpack/')), `dataFiles('listen') gom cả web/cpack (${L.length} đề)`);
ok(L.map(f => +f.match(/test(\d+)/)[1]).every((n, i, a) => !i || n > a[i - 1]) && /test1\.js$/.test(L[0]), 'dataFiles sắp theo số (test1 trước, định nghĩa g.LTI)');
const line = (app.match(/\n\s*listening: (\[.*\]),/) || [])[1]; let bundle = []; try { bundle = new Function(`return ${line}`)(); } catch (e) { ok(false, 'không đọc được gói listening trong web/js/app.js'); }
for (const f of L) { const rel = f.replace(/^web\//, ''); ok(bundle.includes(rel), `${rel} chưa có trong gói listening của web/js/app.js`); }
// nguồn dữ liệu đọc đề nghe không còn readdir cứng web/js/listen
for (const f of ['scripts/sentence-audio/corpus.mjs', 'scripts/world-scorecard.mjs', 'scripts/test/next-step.mjs', 'scripts/test/readtest-dedupe.mjs']) ok(!/readdirSync\('web\/js\/listen'\)|n\('web\/js\/listen'|map\(k => `listen\/test/.test(fs.readFileSync(f, 'utf8')), `${f}: còn đọc cứng web/js/listen (dùng dataFiles)`);
if (bad) { console.error(`✗ scan-roots: ${bad} lỗi`); process.exit(1); }
console.log(`✓ scan-roots: ${cp.length} file cpack trong vùng quét · ${Object.keys(SCANNERS).length} bộ quét dùng SCAN_ROOTS · ${L.length} đề nghe (web/js + web/cpack) có trong gói`);
