// Khoá cache kết quả đạt theo hash input (scripts/lib/test-cache.mjs, scripts/test/run-suite.mjs, npm-test.yml, npm-test-nightly.yml). Độ phủ không đổi: test đổi input/không chứng minh được input → luôn chạy.
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { gitContext, analyze, hashOf, canSkip, recordPass, flagFalsePass, emptyLedger, loadLedger, SIMPLE_CMD, VERSION } from '../lib/test-cache.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tcache-')), w = (f, s) => { fs.mkdirSync(path.dirname(path.join(tmp, f)), { recursive: true }); fs.writeFileSync(path.join(tmp, f), s); };
const g = (...a) => execFileSync('git', a, { cwd: tmp, encoding: 'utf8' });
g('init', '-q'); g('config', 'user.email', 't@t'); g('config', 'user.name', 't'); g('config', 'commit.gpgsign', 'false');
w('package-lock.json', '{}'); w('web/js/a.js', 'A1'); w('web/js/b.js', 'B1'); w('docs/x.md', 'X1'); w('scripts/lib/h.mjs', "export const h = 1;");
w('scripts/test/pure.mjs', "import { h } from '../lib/h.mjs'; import fs from 'node:fs'; const a = fs.readFileSync('web/js/a.js', 'utf8'); if (!a || !h) process.exit(1);");
w('scripts/test/dirscan.mjs', "import fs from 'node:fs'; for (const f of fs.readdirSync('web/js')) fs.readFileSync('web/js/' + f);");
w('scripts/test/net.mjs', "const r = await fetch('http://x');");
w('scripts/test/clock.mjs', "const d = new Date(); console.log(d);");
w('scripts/test/env.mjs', "if (process.env.CI) process.exit(0);");
w('scripts/test/gitread.mjs', "import { execFileSync } from 'node:child_process'; execFileSync('git', ['diff']);");
w('scripts/test/spawnnode.mjs', "import { execFileSync } from 'node:child_process'; execFileSync('node', ['scripts/lib/h.mjs']);");
w('scripts/test/gen.mjs', "import fs from 'node:fs'; fs.readFileSync('out/generated.json');");
w('scripts/test/writes.mjs', "import fs from 'node:fs'; fs.writeFileSync('web/js/a.js', 'x');");
w('scripts/test/tmpw.mjs', "import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; const d = fs.mkdtempSync(path.join(os.tmpdir(), 'x')); fs.writeFileSync(path.join(d, 'f'), 'x');");
w('out/generated.json', '{}');   // CHƯA commit
g('add', '-A', '--', ':!out'); g('commit', '-qm', 'init');
const ctx = () => gitContext(tmp), opt = { root: tmp, node: '22' };
const hash = cmd => hashOf(cmd, ctx(), opt).hash;

// --- lệnh đơn giản
for (const c of ['node scripts/test/pure.mjs', 'node scripts/test/x.mjs --check', 'node scripts/test/x.mjs web 2']) assert.ok(SIMPLE_CMD.test(c), c);
for (const c of ['node scripts/test/x.mjs | grep a', 'node scripts/test/x.mjs && echo', 'node -e "1"', 'sh scripts/x.sh', '! node scripts/x.mjs', 'node scripts/test/x.mjs $(date)']) assert.ok(!SIMPLE_CMD.test(c), 'không đơn giản: ' + c);
// --- cache được / không được
assert.ok(analyze('node scripts/test/pure.mjs', ctx(), opt).cacheable, 'test thuần cache được');
assert.ok(analyze('node scripts/test/pure.mjs', ctx(), opt).inputs.some(i => i.startsWith('f:web/js/a.js:')) && analyze('node scripts/test/pure.mjs', ctx(), opt).inputs.some(i => i.startsWith('f:scripts/lib/h.mjs:')), 'input gồm tệp đọc + tệp import');
assert.ok(analyze('node scripts/test/dirscan.mjs', ctx(), opt).inputs.some(i => i.startsWith('d:web/js:')), 'quét thư mục → hash cả cây');
for (const [f, why] of [['net', 'mạng'], ['clock', 'ngày giờ'], ['env', 'môi trường'], ['gitread', 'git'], ['gen', 'chưa commit'], ['writes', 'ghi tệp']]) {
  const a = analyze(`node scripts/test/${f}.mjs`, ctx(), opt); assert.ok(!a.cacheable && new RegExp(why).test(a.reason), `${f} không cache được (${why}): ${a.reason}`); }
assert.ok(analyze('node scripts/test/spawnnode.mjs', ctx(), opt).cacheable, 'chạy con `node` + script con theo dõi tiếp');
assert.ok(analyze('node scripts/test/tmpw.mjs', ctx(), opt).cacheable, 'ghi vào thư mục tạm không chặn cache');
// --- hash: đổi input ⇒ đổi hash; đổi tệp không liên quan ⇒ giữ hash
const h0 = hash('node scripts/test/pure.mjs');
w('docs/x.md', 'X2'); g('add', '-A'); assert.equal(hash('node scripts/test/pure.mjs'), h0, 'đổi tệp không liên quan: hash giữ nguyên');
w('web/js/b.js', 'B2'); g('add', '-A'); assert.equal(hash('node scripts/test/pure.mjs'), h0, 'đổi tệp cùng thư mục nhưng test không đọc: giữ');
const d0 = hash('node scripts/test/dirscan.mjs');
w('web/js/a.js', 'A2'); g('add', '-A'); assert.notEqual(hash('node scripts/test/pure.mjs'), h0, 'đổi tệp test đọc ⇒ hash đổi');
assert.notEqual(hash('node scripts/test/dirscan.mjs'), d0, 'đổi tệp trong thư mục test quét ⇒ hash đổi');
const h1 = hash('node scripts/test/pure.mjs'); w('scripts/lib/h.mjs', 'export const h = 2;'); g('add', '-A'); assert.notEqual(hash('node scripts/test/pure.mjs'), h1, 'đổi tệp được import ⇒ hash đổi');
const h2 = hash('node scripts/test/pure.mjs'); w('package-lock.json', '{"a":1}'); g('add', '-A'); assert.notEqual(hash('node scripts/test/pure.mjs'), h2, 'đổi lockfile ⇒ hash đổi');
assert.notEqual(hashOf('node scripts/test/pure.mjs', ctx(), { ...opt, node: '24' }).hash, hash('node scripts/test/pure.mjs'), 'đổi phiên bản node ⇒ hash đổi');
// --- sổ
const L = emptyLedger(), hh = 'abc123', cmd = 'node scripts/test/pure.mjs';
assert.ok(!canSkip(L, cmd, hh), 'chưa đạt → chạy'); recordPass(L, cmd, hh, '2026-11-25T00:00:00Z');
assert.ok(canSkip(L, cmd, hh) && !canSkip(L, cmd, 'khac') && !canSkip(L, cmd, null) && !canSkip(L, cmd, hh, { disabled: true }), 'đạt cùng hash → bỏ qua; hash khác/không hash/tắt cache → chạy');
assert.ok(flagFalsePass(L, cmd, hh) && !canSkip(L, cmd, hh) && L.bad[cmd], 'đêm: đỏ mà sổ từng đạt → đánh dấu sai, hết cache');
recordPass(L, cmd, 'h2'); assert.ok(!canSkip(L, cmd, 'h2'), 'lệnh bị đánh dấu sai không bao giờ được bỏ qua nữa');
const M = emptyLedger(); for (let i = 0; i < 12; i++) recordPass(M, 'c' + i, 'k' + i, `2026-11-${10 + i}T00:00:00Z`, 5); assert.equal(Object.keys(M.pass).length, 5, 'sổ giữ tối đa N mục mới nhất');
const lf = path.join(tmp, 'ledger.json'); fs.writeFileSync(lf, JSON.stringify({ v: VERSION + 1, pass: { x: {} } })); assert.deepEqual(loadLedger(lf), emptyLedger(), 'khác phiên bản sổ → bỏ'); assert.deepEqual(loadLedger('/khong/co'), emptyLedger(), 'không có sổ → rỗng');

// --- nối dây: run-suite + workflow
const rs = fs.readFileSync('scripts/test/run-suite.mjs', 'utf8');
assert.ok(/cached-pass/.test(rs) && /NO_TEST_CACHE/.test(rs) && /flagFalsePass/.test(rs) && /TEST_CACHE_FILE/.test(rs), 'run-suite in cached-pass, tôn trọng NO_TEST_CACHE, đánh dấu dò sai');
const nt = fs.readFileSync('.github/workflows/npm-test.yml', 'utf8');
assert.ok(/TEST_CACHE_FILE/.test(nt) && /actions\/cache@/.test(nt) && !/NO_TEST_CACHE/.test(nt), 'npm-test.yml: shard khôi phục/ghi sổ bằng actions/cache, KHÔNG tắt cache');
const nn = fs.readFileSync('.github/workflows/npm-test-nightly.yml', 'utf8');
assert.ok(/schedule:/.test(nn) && /NO_TEST_CACHE: '1'/.test(nn) && /cache-false-pass/.test(nn) && /issues: write/.test(nn) && /shard: \[1, 2, 3, 4, 5, 6, 7, 8\]/.test(nn), 'lượt đêm: không cache, 8 shard như npm test, mở issue khi dò sai');
console.log('✓ test-cache: hash theo input, deny-list (mạng/giờ/env/git/chưa commit/ghi tệp), sổ đạt, lượt đêm bắt dò sai');
