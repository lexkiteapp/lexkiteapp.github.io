// Máy gác bot đẩy main (scripts/ci/bot-test-gate.mjs): chọn test theo đường dẫn, chặn khi bản bot làm đỏ, cho qua khi gốc đã đỏ, và
// mọi workflow commit [skip ci] đều qua máy gác. Gốc 15/11: lexicon-expand đẩy 9c4e52d158 [skip ci] làm lex.mjs đỏ, không cổng nào chặn.
import assert from 'node:assert/strict';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pickTests, ungated, run, MAP } from '../ci/bot-test-gate.mjs';

const ROOT = path.resolve(import.meta.dirname, '../..');
// 1) chọn test theo đường dẫn
const rules = [{ paths: '^content/lexicon/', tests: ['a', 'b'] }, { paths: '^content/qa/', tests: ['b', 'c'] }];
assert.deepEqual(pickTests(['content/lexicon/x.json'], rules), ['a', 'b']);
assert.deepEqual(pickTests(['content/lexicon/x.json', 'content/qa/y.json'], rules), ['a', 'b', 'c'], 'hợp + khử trùng');
assert.deepEqual(pickTests(['infra/backups/d1.json'], rules), [], 'sổ sao lưu: không test');
// 2) bản đồ thật: mọi lệnh có NGUYÊN DÒNG trong suite.txt (= cổng PR chạy đúng lệnh đó), mẫu là regex hợp lệ
const suite = new Set(fs.readFileSync(path.join(ROOT, 'scripts/test/suite.txt'), 'utf8').split('\n').map(l => l.trim()));
for (const r of JSON.parse(fs.readFileSync(path.join(ROOT, MAP), 'utf8')).rules) {
  new RegExp(r.paths);
  for (const t of r.tests) assert.ok(suite.has(t), `${MAP}: "${t}" không có trong scripts/test/suite.txt`);
}
{ const real = JSON.parse(fs.readFileSync(path.join(ROOT, MAP), 'utf8')).rules;   // đúng ca 9c4e52d158: tệp bot lexicon-expand đổi → lex.mjs phải được chạy
  const t = pickTests(['content/lexicon/expand/20261113-r229.json', 'content/qa/review-queue.json', 'web/data/ai-capacity.json'], real);
  assert.ok(t.includes('node scripts/test/lex.mjs') && t.includes('node scripts/test/lexicon-expand.mjs'), 'ca 9c4e52d158: lex.mjs + lexicon-expand.mjs'); }
// 3) workflow [skip ci] phải qua máy gác
assert.equal(ungated('run: git commit -m "x [skip ci]" && git push').length, 1, 'commit [skip ci] trần → vi phạm');
assert.equal(ungated('run: git commit -m "x [skip ci]" && node scripts/ci/bot-test-gate.mjs --base HEAD~1 && git push').length, 0);
assert.equal(ungated('run: bash scripts/ci/push-main.sh "x [skip ci]" a').length, 0, 'push-main.sh đã gác');
assert.equal(ungated('# chỉ ghi chú [skip ci]\nrun: echo hi').length, 0, 'chú thích không tính');
assert.equal(ungated('# ci-policy: bot-test – chỉ sổ sao lưu\nrun: git commit -m "[skip ci]"').length, 0);
assert.equal(ungated('# ci-policy: bot-test –\nrun: git commit -m "[skip ci]"').length, 1, 'miễn trừ phải có lý do');
const WF = path.join(ROOT, '.github/workflows');
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) assert.deepEqual(ungated(fs.readFileSync(path.join(WF, f), 'utf8')), [], `${f}: commit [skip ci] không qua máy gác`);
assert.ok(fs.readFileSync(path.join(ROOT, 'scripts/ci/push-main.sh'), 'utf8').includes('bot-test-gate.mjs'), 'push-main.sh phải gọi máy gác');
assert.ok(fs.readFileSync(path.join(ROOT, '.github/workflows/lexicon-expand.yml'), 'utf8').includes('bot-test-gate.mjs'), 'lexicon-expand phải gọi máy gác');
// 4) chạy thật trong repo tạm: gốc xanh + bản bot làm đỏ → 1; đỏ sẵn ở gốc → 0; không khớp luật → 0; xanh → 0
const g = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function repo(passAtBase) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'btg-'));
  g(d, 'init', '-q', '-b', 'main'); g(d, 'config', 'user.email', 'a@b'); g(d, 'config', 'user.name', 'a');
  fs.mkdirSync(path.join(d, 'infra')); fs.mkdirSync(path.join(d, 'content/lexicon'), { recursive: true });
  fs.writeFileSync(path.join(d, MAP), JSON.stringify({ rules: [{ paths: '^content/lexicon/', tests: ['node t.mjs'] }] }));
  fs.writeFileSync(path.join(d, 't.mjs'), `import fs from 'node:fs'; process.exit(fs.readFileSync('content/lexicon/d.txt','utf8').trim()==='ok'?0:1)`);
  fs.writeFileSync(path.join(d, 'content/lexicon/d.txt'), passAtBase ? 'ok' : 'bad'); fs.writeFileSync(path.join(d, 'other.txt'), '1');
  g(d, 'add', '-A'); g(d, 'commit', '-qm', 'base'); return d;
}
const quiet = () => {};
{ const d = repo(true); fs.writeFileSync(path.join(d, 'content/lexicon/d.txt'), 'bad'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'bot');
  assert.equal(run({ base: 'HEAD~1', cwd: d, log: quiet }), 1, 'gốc xanh, bản bot đỏ → chặn'); fs.rmSync(d, { recursive: true, force: true }); }
{ const d = repo(false); fs.writeFileSync(path.join(d, 'content/lexicon/d.txt'), 'bad2'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'bot');
  assert.equal(run({ base: 'HEAD~1', cwd: d, log: quiet }), 0, 'gốc đã đỏ → không chặn bot'); fs.rmSync(d, { recursive: true, force: true }); }
{ const d = repo(true); fs.writeFileSync(path.join(d, 'other.txt'), '2'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'bot');
  assert.equal(run({ base: 'HEAD~1', cwd: d, log: quiet }), 0, 'tệp không khớp luật → qua'); fs.rmSync(d, { recursive: true, force: true }); }
{ const d = repo(true); fs.writeFileSync(path.join(d, 'content/lexicon/d.txt'), 'ok\n'); g(d, 'add', '-A'); g(d, 'commit', '-qm', 'bot');
  assert.equal(run({ base: 'HEAD~1', cwd: d, log: quiet }), 0, 'bản bot xanh → qua'); fs.rmSync(d, { recursive: true, force: true }); }
{ const d = repo(true); fs.writeFileSync(path.join(d, 'content/lexicon/d.txt'), 'bad'); g(d, 'add', '-A'); // chưa commit (lexicon-expand: tệp đã add, chưa commit)
  assert.equal(run({ base: 'HEAD', cwd: d, log: quiet }), 1, 'thay đổi đã add chưa commit cũng bị gác'); fs.rmSync(d, { recursive: true, force: true }); }
console.log('✓ bot-test-gate: chọn test theo đường dẫn, chặn bản bot làm đỏ, qua khi gốc đã đỏ, mọi workflow [skip ci] đều có máy gác');
