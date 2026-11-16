// Ngân sách web/js đếm đúng "byte người học tải" (scripts/lib/js-budget.mjs): nguồn dựng en.js không bị tính 2 lần,
// nhưng nhóm nào được nạp lúc chạy (đường dẫn trực tiếp hoặc map tên → js/i18n/en/${n}.js) thì VẪN tính – không có lỗ hổng che byte thật.
import fs from 'node:fs';
import { langPacks, learnerBytes, enBuildGroups, loadedAtRuntime, buildOnlyEn, jsTotal, isAdmin, adminRefs, learnerUses, adminOnlyDeps } from '../lib/js-budget.mjs';
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
// Mã chỉ trang quản trị: admin.js (3/11: regex cũ chỉ bắt admin-*.js → 180 KB bị đếm như byte người học) + thư viện chỉ quản trị nạp
ok(isAdmin('web/js/admin.js') && isAdmin('web/js/admin-users.js') && !isAdmin('web/js/badmin.js') && !isAdmin('web/js/admin/x.js') && !isAdmin('web/js/lib/administer.js'), 'isAdmin: admin.js + admin-*.js, không bắt nhầm tên khác');
ok(JSON.stringify(adminRefs("js('js/vendor/m.min.js').then(() => js('js/vendor/w.js')); <script src=\"js/admin.js\">")) === JSON.stringify(['web/js/vendor/m.min.js', 'web/js/vendor/w.js', 'web/js/admin.js']), 'adminRefs đọc đường dẫn js/… trong mã quản trị');
ok(learnerUses('web/js/vendor/fzstd.js', "s.src = 'js/vendor/fzstd.js'") && learnerUses('web/js/vendor/fzstd.js', "require(__dirname + '/vendor/fzstd.js')"), 'người học nạp (đường dẫn js/… hoặc tương đối /vendor/…) → vẫn tính');
ok(!learnerUses('web/js/vendor/jsvectormap/world.js', "const SHELL = ['/js/app.js'];"), 'không ai ngoài quản trị nạp → không tính');
const adm = adminOnlyDeps('.');
ok(adm.includes('web/js/vendor/jsvectormap/world.js') && adm.includes('web/js/vendor/jsvectormap/jsvectormap.min.js'), 'jsvectormap (bản đồ tab Phân tích) là thư viện chỉ quản trị');
ok(!adm.includes('web/js/firebase-config.js'), 'firebase-config.js (admin.html nạp nhưng người học cũng nạp) vẫn được tính');
ok(!adm.some(f => /\/(app|core|i18n)\b/.test(f)), 'không bỏ nhầm mã lõi người học');
// App Android/iOS (build-mobile.sh) không được mang mã chỉ quản trị: mọi file bị bỏ khỏi ngân sách phải bị loại khỏi mobile/www
const excl = [...fs.readFileSync('scripts/build-mobile.sh', 'utf8').matchAll(/--exclude '([^']+)'/g)].map(m => m[1]);
const rx = pat => new RegExp('(^|/)' + pat.replace(/^\//, '').replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\/$/, '/.*') + '$');
const inApp = f => !excl.some(p => rx(p).test(f.replace(/^web\//, '')));
ok(!inApp('js/admin-users.js') && inApp('js/app.js') && !inApp('js/vendor/jsvectormap/world.js'), 'bộ so mẫu --exclude của rsync hoạt động');
const { total, skipped, admin } = jsTotal('.');
for (const { file } of admin) ok(!inApp(file), `${file} chỉ quản trị dùng nhưng vẫn bị đóng vào app Android/iOS (thêm --exclude trong scripts/build-mobile.sh)`);
ok(total > 0 && skipped.length === skip.length, 'jsTotal đếm được và bỏ đúng các nguồn dựng');
ok(admin.some(x => x.file === 'web/js/admin.js'), 'admin.js không bị tính vào byte người học');
// Thước mới 5/11: nền + gói ngôn ngữ LỚN NHẤT (không phải trung bình, không phải tổng 13 gói)
const LB = learnerBytes('.'), pk = langPacks('.'), vals = Object.values(pk);
ok(vals.length >= 12 && !('en' in pk), `langPacks: ≥ 12 gói ngoài en (có ${vals.length})`);
ok(LB.topSize === Math.max(...vals) && pk[LB.topLang] === LB.topSize, 'gói lớn nhất = max thật, không phải trung bình');
ok(LB.learner === LB.total - LB.sum + LB.topSize, 'learner = total − Σ gói + gói lớn nhất');
ok(LB.learner < LB.total && LB.learner > LB.total - LB.sum, 'thước mới nằm giữa: nhỏ hơn tổng cả kho, lớn hơn nền thuần (vẫn tính 1 gói)');
// Tình huống Play & Speak (speak/s/<id>[.<lang>].js) nay ở web/cpack/speak/s (tải lười, băm tên) → KHÔNG tính vào nền hay gói ngôn ngữ; kho JS không được mọc lại thư mục này
ok(!fs.existsSync('web/js/speak/s'), 'tình huống Play & Speak nằm trong web/cpack/speak/s, không phải web/js/speak/s');
const bj = JSON.parse(fs.readFileSync('scripts/test/budget.json', 'utf8'));
ok(Math.max(...vals) <= bj.langPackMax, `gói ${LB.topLang} ${LB.topSize} B ≤ langPackMax ${bj.langPackMax}`);
ok(LB.total <= bj.totalAll && bj.totalAll >= bj.totalJs, 'totalAll (chặn tổng cả kho) tồn tại và ≥ totalJs');
console.log(fails ? `js-budget: ${fails} lỗi` : `✓ js-budget: bỏ ${skipped.length} nguồn dựng en.js (${(skipped.reduce((s, x) => s + x.size, 0) / 1024).toFixed(0)} KB, đã có trong en.js) · bỏ ${admin.length} file chỉ quản trị (${(admin.reduce((s, x) => s + x.size, 0) / 1024).toFixed(0)} KB) · tổng ${(total / 1048576).toFixed(2)} MB`);
process.exit(fails ? 1 : 0);
