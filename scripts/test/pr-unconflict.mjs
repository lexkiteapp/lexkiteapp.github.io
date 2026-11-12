// Hồi quy pr-unconflict (06/11 – PR xanh hết lại dirty vì docs/CODEMAP.md tự sinh lệch main, #757):
//  1) plan: chỉ tự gỡ khi MỌI tệp xung đột thuộc danh sách tự sinh; có tệp người viết → null (không đụng).
//  2) dedupeLines: giữ thứ tự, bỏ lệnh trùng, giữ dòng trống/chú thích.
//  3) pick: chỉ dirty + không draft + cùng repo + còn hoạt động, mới nhất trước, tối đa MAX.
//  4) Tình huống git thật (repo tạm, không mạng): main và PR cùng sửa CODEMAP.md + cùng thêm dòng suite.txt
//     → bản gộp lấy CODEMAP của main, suite.txt có đủ dòng của cả hai, không còn dấu xung đột.
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { plan, dedupeLines, pick, MAX, mergeEntries, regenCmds, merge3 } from '../pr-unconflict.mjs';

assert.deepEqual(plan(['docs/CODEMAP.md', 'scripts/test/suite.txt']), [{ f: 'docs/CODEMAP.md', how: 'main' }, { f: 'scripts/test/suite.txt', how: 'union' }]);
assert.equal(plan(['docs/CODEMAP.md', 'web/js/home.js']), null, 'có tệp người viết thì không tự gỡ');
// 10/11: tệp sinh lấy main (rồi dựng lại); nguồn dịch + tệp registry gỡ theo dòng mục; en là NGUỒN (không phải tệp sinh)
assert.deepEqual(plan(['web/js/i18n/de/ux1.js', 'extension/app/js/app.js', 'web/css/st-v2-today.css', 'web/cpack/lesson/pn-de.js', 'i18n/ui/de/ux1.js', 'web/js/app.js']).map(s => s.how), ['main', 'main', 'main', 'main', 'dict3', 'entries']);
assert.equal(plan(['web/js/i18n/en/ux1.js']), null, 'en là nguồn người viết');
assert.equal(plan(['web/js/i18n/en.js']), null);
assert.equal(mergeEntries('a\n<<<<<<< HEAD\n"x":"1",\n=======\n"y":"2",\n"x":"1",\n>>>>>>> m\nz'), 'a\n"x":"1",\n"y":"2",\nz', 'giữ mục cả hai phía, bỏ dòng trùng');
assert.equal(mergeEntries('<<<<<<< HEAD\n    call: \'call\', // gọi\n||||||| base\n=======\n    // dẫn\n    say: [\'say\'],\n>>>>>>> m'), "    call: 'call', // gọi\n    // dẫn\n    say: ['say'],", 'registry + diff3');
assert.equal(mergeEntries('<<<<<<< HEAD\n  const x = 1;\n=======\n  y: 2,\n>>>>>>> m'), null, 'khối có mã thường → người gỡ');
assert.deepEqual(merge3({ a: 1, b: 2, c: 3 }, { a: 1, b: 9, d: 4 }, { a: 7, b: 2, c: 3, e: 5 }), { a: 7, b: 9, e: 5, d: 4 }, 'dịch: main + thay đổi của PR (sửa b, xoá c, thêm d)');
assert.equal(merge3({ a: 1 }, { a: 2 }, { a: 3 }), null, 'hai phía sửa cùng khóa khác giá trị → người gỡ');
assert.deepEqual(merge3({ a: 1 }, { a: 2 }, { a: 2 }), { a: 2 }, 'cùng sửa giống nhau → nhận');
assert.deepEqual(regenCmds([{ f: 'docs/CODEMAP.md' }]), []);
assert.deepEqual(plan(['content/pipeline/LEARN.md', 'content/pipeline/SCORE.md', 'docs/JOBS.md']).map(s => s.how), ['main', 'main', 'main'], '#985: báo cáo sinh lấy main');
assert.deepEqual(regenCmds([{ f: 'docs/JOBS.md' }]).map(c => c.join(' ')), ['node scripts/jobs/gen.mjs --write'], 'tệp có cổng khớp nguồn → sinh lại');
assert.deepEqual(regenCmds([{ f: 'content/pipeline/LEARN.md' }]), [], 'báo cáo do bot main sinh → chỉ lấy main');
assert.deepEqual(regenCmds([{ f: 'i18n/ui/de/ux1.js' }]).map(c => c.join(' ')), ['node scripts/fmt-stable.mjs', 'node scripts/i18n-pack.mjs', 'bash scripts/build-extension.sh']);
assert.ok(regenCmds([{ f: 'web/css/st-v2-today.css' }]).some(c => c.includes('scripts/build-stitch-css.mjs')));
assert.equal(plan([]), null);

assert.equal(dedupeLines('# a\nx\n\ny\nx\n# a\nz'), '# a\nx\n\ny\n# a\nz');

const now = Date.parse('2026-11-06T03:00:00Z'), h = n => new Date(now - n * 3600e3).toISOString();
const pr = (number, o) => ({ number, draft: false, mergeable_state: 'dirty', updated_at: h(1), head: { repo: { full_name: 'o/r' } }, ...o });
const got = pick([pr(1), pr(2, { draft: true }), pr(3, { mergeable_state: 'clean' }), pr(4, { updated_at: h(30) }),
  pr(5, { head: { repo: { full_name: 'fork/r' } } }), pr(6, { updated_at: h(0.5) }), ...[7, 8, 9, 10].map(n => pr(n, { updated_at: h(2) }))], now, 'o/r');
assert.equal(got[0].number, 6, 'mới nhất trước');
assert.equal(got.length, MAX);
assert.ok(got.every(p => [1, 6, 7, 8, 9, 10].includes(p.number)), 'loại draft/clean/cũ/fork');

// 4) git thật
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'unc-t-')), g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
g('init', '-q', '-b', 'main'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't');
w('docs/CODEMAP.md', 'map v1\n'); w('docs/codemap.json', '{"v":1}\n'); w('scripts/test/suite.txt', 'node a\nnode b\n');
g('add', '-A'); g('commit', '-qm', 'base');
g('checkout', '-qb', 'feat'); w('docs/CODEMAP.md', 'map feat\n'); w('scripts/test/suite.txt', 'node a\nnode b\nnode feat\n'); w('web.js', 'x\n');
g('add', '-A'); g('commit', '-qm', 'feat');
g('checkout', '-q', 'main'); w('docs/CODEMAP.md', 'map main\n'); w('scripts/test/suite.txt', 'node a\nnode b\nnode main\n');
g('add', '-A'); g('commit', '-qm', 'main');
g('remote', 'add', 'origin', d); g('fetch', '-q', 'origin');
// mô phỏng PR dirty: gọi fix() ở chế độ dry trong repo tạm (không mạng)
const script = path.resolve('scripts/pr-unconflict.mjs'), run = execFileSync;
fs.writeFileSync(path.join(d, 'drv.mjs'), `const fixMod = await import(${JSON.stringify(script)});
process.chdir(${JSON.stringify(d)});
const r = fixMod.fix({ number: 1, head: { ref: 'feat' } }, true);
console.log('RESULT', r);`);
const out = run(process.execPath, [path.join(d, 'drv.mjs')], { cwd: d, encoding: 'utf8' });
assert.match(out, /RESULT dry/, out);
assert.equal(fs.readFileSync(path.join(d, 'docs/CODEMAP.md'), 'utf8'), 'map main\n', 'CODEMAP lấy bản main');
const suite = fs.readFileSync(path.join(d, 'scripts/test/suite.txt'), 'utf8');
for (const l of ['node a', 'node b', 'node feat', 'node main']) assert.ok(suite.split('\n').includes(l), `suite thiếu ${l}`);
assert.ok(!/^(<<<<<<<|=======|>>>>>>>)/m.test(suite), 'còn dấu xung đột');
assert.equal(suite.split('\n').filter(l => l === 'node a').length, 1, 'không nhân đôi dòng');
assert.equal(fs.readFileSync(path.join(d, 'web.js'), 'utf8'), 'x\n', 'giữ nguyên thay đổi thật của PR');
// có xung đột ở tệp người viết → không gộp
g('checkout', '-q', 'main'); w('web.js', 'main\n'); g('add', '-A'); g('commit', '-qm', 'main2'); g('fetch', '-q', 'origin');
const out2 = run(process.execPath, [path.join(d, 'drv.mjs')], { cwd: d, encoding: 'utf8' });
assert.match(out2, /RESULT manual/, out2);
// 5) gộp "sạch" nhờ merge=union nhưng nhân đôi dòng (cả hai phía cùng thêm một dòng) → vẫn khử trùng
g('checkout', '-q', '-B', 'feat2', 'main'); w('.gitattributes', 'scripts/test/suite.txt merge=union\n'); w('scripts/test/suite.txt', 'node dup\nnode a\nnode b\nnode main\n'); g('add', '-A'); g('commit', '-qm', 'f2');
g('checkout', '-q', 'main'); w('.gitattributes', 'scripts/test/suite.txt merge=union\n'); w('scripts/test/suite.txt', 'node a\nnode b\nnode main\nnode dup\n'); g('add', '-A'); g('commit', '-qm', 'm3'); g('fetch', '-q', 'origin');
fs.writeFileSync(path.join(d, 'drv2.mjs'), `const m = await import(${JSON.stringify(script)}); process.chdir(${JSON.stringify(d)}); console.log('RESULT', m.fix({ number: 2, head: { ref: 'feat2' } }, true));`);
const out3 = run(process.execPath, [path.join(d, 'drv2.mjs')], { cwd: d, encoding: 'utf8' });
const s3 = fs.readFileSync(path.join(d, 'scripts/test/suite.txt'), 'utf8').split('\n');
assert.equal(s3.filter(l => l === 'node dup').length, 1, 'union sạch vẫn phải khử trùng: ' + out3);
fs.rmSync(d, { recursive: true, force: true });
console.log('✓ pr-unconflict: chỉ tự gỡ tệp tự sinh, CODEMAP lấy main, suite.txt union không trùng, tệp người viết để nguyên');
