// Hồi quy 1/11: sổ bản phát hành đẩy lên main bị xung đột rebase → release-archive đỏ. ledger-push gộp theo nội dung. Chạy: node scripts/test/ledger-push.mjs (git cục bộ, không mạng)
import fs from 'fs'; import os from 'os'; import path from 'path'; import { execFileSync } from 'child_process';
import { mergeLedger, main } from '../ops/ledger-push.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const m = mergeLedger({ kinds: { a: [{ run: 3, run_number: 3 }, { run: 1, run_number: 1 }] } }, { kinds: { a: [{ run: 2, run_number: 2 }, { run: 1, run_number: 1 }], b: [{ run: 9, run_number: 9 }] } });
ok(m.kinds.a.map(x => x.run).join() === '3,2' && m.kinds.b.length === 1, 'gộp: hợp theo run, mới trước, cắt theo độ dài lớn nhất, giữ khoá chỉ có bên kia: ' + JSON.stringify(m));
const d = fs.mkdtempSync(path.join(os.tmpdir(), 'lp-')), sh = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
sh(d, 'init', '-q', '--bare', 'o.git'); const O = path.join(d, 'o.git');
const clone = nm => { const c = path.join(d, nm); sh(d, 'clone', '-q', O, c); sh(c, 'config', 'user.email', 't@t'); sh(c, 'config', 'user.name', 't'); return c; };
const A = clone('a'); fs.mkdirSync(path.join(A, 'infra')); const F = 'infra/l.json';
fs.writeFileSync(path.join(A, F), JSON.stringify({ kinds: { x: [{ run: 1, run_number: 1 }] } }, null, 1) + '\n'); sh(A, 'add', '.'); sh(A, 'commit', '-qm', 'i'); sh(A, 'branch', '-M', 'main'); sh(A, 'push', '-q', 'origin', 'main');
const B = clone('b'); sh(B, 'checkout', '-q', 'main');
const w = (c, runs) => fs.writeFileSync(path.join(c, F), JSON.stringify({ kinds: { x: runs.map(r => ({ run: r, run_number: r })) } }, null, 1) + '\n');
w(A, [2, 1]); sh(A, 'add', '.'); sh(A, 'commit', '-qm', 'a2'); sh(A, 'push', '-q', 'origin', 'main'); // main đã có run 2
w(B, [3, 1]); // B chưa biết run 2 → cùng dòng đổi → xung đột rebase
const cwd = process.cwd(); process.chdir(B);
const rc = main(F, 'ledger b', 2); process.chdir(cwd);
const fin = JSON.parse(sh(A, 'show', 'HEAD:' + F)); sh(A, 'pull', '-q', 'origin', 'main');
const got = JSON.parse(fs.readFileSync(path.join(A, F), 'utf8')).kinds.x.map(x => x.run).join();
ok(rc === 0 && got === '3,2', 'xung đột rebase → gộp, push thành công, giữ run mới nhất của cả hai bên (cắt theo keep): rc=' + rc + ' got=' + got);
fs.rmSync(d, { recursive: true, force: true });
if (fails) { console.log(`✗ ledger-push: ${fails}/${n}`); process.exit(1); }
console.log(`✓ ledger-push: ${n} kiểm`);
