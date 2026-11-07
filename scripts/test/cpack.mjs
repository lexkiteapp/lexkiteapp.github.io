// Gói nội dung tải lười web/cpack (docs/METHODS.md §3): (a) khung dưới ngưỡng – size-budget; (b) mỗi gói tải được, đúng mã băm, immutable; (c) offline mở lại bài đã học.
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import crypto from 'node:crypto'; import { execFileSync } from 'node:child_process';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cpack-')); const w = (f, t) => { const p = path.join(tmp, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, t); };
const run = () => { try { return { code: 0, out: execFileSync('node', ['scripts/build-cpack.mjs', tmp], { encoding: 'utf8', stdio: 'pipe' }) }; } catch (e) { return { code: e.status, out: String(e.stderr) }; } };
// (b) băm + sửa tham chiếu
w('cpack/x/a.js', 'window.A=1;'); w('js/app.js', "const B={x:['cpack/x/a.js']};");
const r = run(), h = crypto.createHash('sha256').update('window.A=1;').digest('hex').slice(0, 10);
ok(r.code === 0 && fs.existsSync(path.join(tmp, `cpack/x/a.${h}.js`)) && !fs.existsSync(path.join(tmp, 'cpack/x/a.js')), 'gói đổi tên theo mã băm nội dung');
ok(fs.readFileSync(path.join(tmp, 'js/app.js'), 'utf8').includes(`cpack/x/a.${h}.js`), 'tham chiếu trong js/app.js trỏ tên băm');
ok(JSON.parse(fs.readFileSync(path.join(tmp, 'cpack/manifest.json'), 'utf8'))['cpack/x/a.js'] === `cpack/x/a.${h}.js`, 'manifest ánh xạ tên gốc → tên băm');
// gói mồ côi / tham chiếu hỏng bị chặn
w('cpack/x/b.js', 'window.B=1;'); ok(run().code === 1, 'gói mồ côi (không ai tham chiếu) → lỗi');
fs.rmSync(tmp, { recursive: true }); fs.mkdirSync(path.join(tmp, 'js'), { recursive: true }); fs.mkdirSync(path.join(tmp, 'cpack'), { recursive: true }); w('cpack/ok.js', '1'); w('js/app.js', "['cpack/ok.js','cpack/missing.js']"); ok(run().code === 1, 'tham chiếu tới gói không tồn tại → lỗi');
fs.rmSync(tmp, { recursive: true });
// (c) service worker cache-first cho tên băm (offline), tên không băm không bị cache-first; header immutable
const sw = fs.readFileSync('web/sw.js', 'utf8'), m = sw.match(/const STATIC = (\/.*\/);/); const re = m && eval(m[1]);
ok(re && re.test('/cpack/toefl/data4.0123456789.js') && !re.test('/cpack/toefl/data4.js') && !re.test('/js/app.js'), 'SW: /cpack/*.<băm>.js cache-first (offline chạy lại bài đã mở), file không băm thì không');
ok(/\/cpack\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/.test(fs.readFileSync('web/_headers', 'utf8')), '_headers: /cpack/* immutable 1 năm');
ok(/build-cpack\.mjs/.test(fs.readFileSync('scripts/build-web.sh', 'utf8')) && /cpack/.test(fs.readFileSync('scripts/lib/sw-version.mjs', 'utf8')), 'build-web.sh gọi build-cpack; mã băm khung app tính cả cpack (đổi gói → app.js/SW làm mới)');
// mọi gói trong web/cpack được BUNDLES (app.js) tham chiếu
const app = fs.readFileSync('web/js/app.js', 'utf8'), walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const miss = walk('web/cpack').map(f => path.relative('web', f)).filter(f => !app.includes(f)); ok(!miss.length, 'mọi gói web/cpack có trong BUNDLES' + (miss.length ? ': ' + miss.join(', ') : ''));
process.exit(bad ? 1 : 0);
