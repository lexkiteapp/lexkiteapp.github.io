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
// Gói tham chiếu gói khác (gốc tình huống → bản dịch): lá băm trước, gói cha mang TÊN BĂM của lá; đổi lá → đổi băm cha; vòng → lỗi
{
  const mk = leaf => { fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(path.join(tmp, 'js'), { recursive: true }); w('js/app.js', "load('cpack/p/base.js')"); w('cpack/p/base.js', "L={vi:'cpack/p/base.vi.js'}"); w('cpack/p/base.vi.js', leaf); return run(); };
  const r1 = mk('A'), m1 = JSON.parse(fs.readFileSync(path.join(tmp, 'cpack/manifest.json'), 'utf8')), base1 = fs.readFileSync(path.join(tmp, m1['cpack/p/base.js']), 'utf8');
  ok(r1.code === 0 && base1.includes(m1['cpack/p/base.vi.js']) && fs.existsSync(path.join(tmp, m1['cpack/p/base.vi.js'])), 'gói cha trỏ tên băm của lá, lá tồn tại');
  mk('B'); const m2 = JSON.parse(fs.readFileSync(path.join(tmp, 'cpack/manifest.json'), 'utf8'));
  ok(m1['cpack/p/base.js'] !== m2['cpack/p/base.js'], 'đổi nội dung lá → băm gói cha đổi (cache immutable không giữ gốc cũ)');
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(path.join(tmp, 'js'), { recursive: true }); w('js/app.js', "load('cpack/q/a.js')"); w('cpack/q/a.js', "'cpack/q/b.js'"); w('cpack/q/b.js', "'cpack/q/a.js'");
  ok(run().code === 1, 'gói tham chiếu vòng → build đỏ');
  fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(path.join(tmp, 'js'), { recursive: true }); w('js/app.js', "x"); w('cpack/q/a.js', "'cpack/q/b.js'"); w('cpack/q/b.js', '1');
  ok(run().code === 1, 'gốc không ai tham chiếu vẫn là mồ côi (chỉ lá được gói khác trích mới thoát)');
  fs.rmSync(tmp, { recursive: true, force: true });
}
// (c) service worker cache-first cho tên băm (offline), tên không băm không bị cache-first; header immutable
const sw = fs.readFileSync('web/sw.js', 'utf8'), m = sw.match(/const STATIC = (\/.*\/);/); const re = m && eval(m[1]);
ok(re && re.test('/cpack/toefl/data4.0123456789.js') && !re.test('/cpack/toefl/data4.js') && !re.test('/js/app.js'), 'SW: /cpack/*.<băm>.js cache-first (offline chạy lại bài đã mở), file không băm thì không');
ok(/\/cpack\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/.test(fs.readFileSync('web/_headers', 'utf8')), '_headers: /cpack/* immutable 1 năm');
ok(/build-cpack\.mjs/.test(fs.readFileSync('scripts/build-web.sh', 'utf8')) && /cpack/.test(fs.readFileSync('scripts/lib/sw-version.mjs', 'utf8')), 'build-web.sh gọi build-cpack; mã băm khung app tính cả cpack (đổi gói → app.js/SW làm mới)');
// mọi gói trong web/cpack được BUNDLES (app.js) tham chiếu – riêng web/cpack/speak/s/* nạp động: gốc qua bảng SPK_P (speak/data.js), bản dịch qua SPK_L nằm trong gói gốc (tự sinh bởi scripts/speak/build.mjs) → gói khác tham chiếu cũng hợp lệ (build-cpack băm lá trước)
const app = fs.readFileSync('web/js/app.js', 'utf8'), walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
const spk = fs.readFileSync('web/js/speak/data.js', 'utf8'), all = walk('web/cpack'), body = new Map(all.map(f => [f, fs.readFileSync(f, 'utf8')])), miss = all.map(f => [f, path.relative('web', f)]).filter(([f, r]) => !app.includes(r) && !(r.startsWith('cpack/speak/s/') && spk.includes(r)) && ![...body].some(([g, t]) => g !== f && t.includes(r))).map(x => x[1]); ok(!miss.length, 'mọi gói web/cpack có trong BUNDLES' + (miss.length ? ': ' + miss.join(', ') : ''));
process.exit(bad ? 1 : 0);
