#!/usr/bin/env node
// push-main.sh: bot đẩy vào main không bao giờ kẹt vì rebase dở (10/11 codemap + World scorecard: "Pulling is not possible because you have
// unmerged files") – kiểm trên kho git thật (bare + 2 bản sao) các tình huống đua; và KHÔNG workflow nào còn vòng `git pull --rebase` tự viết.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { execFileSync, spawnSync } from 'node:child_process';
const ROOT = process.cwd(), SH = path.join(ROOT, 'scripts/ci/push-main.sh');
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗', m); } else console.log('  ✓', m); };
const T = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'pushmain-'));
const g = (cwd, ...a) => execFileSync('git', a, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const ENV = { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', PUSH_MAIN_SLEEP: '0' };
const run = (cwd, args, env = {}) => spawnSync('bash', [SH, ...args], { cwd, env: { ...ENV, ...env }, encoding: 'utf8' });
const W = (d, f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
const R = (d, f) => { try { return fs.readFileSync(path.join(d, f), 'utf8'); } catch { return null; } };
try {
  const bare = path.join(T, 'o.git'); g(T, 'init', '-q', '--bare', '-b', 'main', bare);
  const seed = path.join(T, 'seed'); g(T, 'clone', '-q', bare, seed);
  for (const [k, v] of Object.entries({ 'user.name': 't', 'user.email': 't@t' })) g(seed, 'config', k, v);
  W(seed, 'out/a.json', '1'); W(seed, 'out/b.json', '1'); W(seed, 'out/old.json', 'x'); W(seed, 'idx.txt', 'v1');
  g(seed, 'add', '-A'); g(seed, 'commit', '-qm', 'seed'); g(seed, 'push', '-q', 'origin', 'HEAD:main');
  const clone = n => { const d = path.join(T, n); g(T, 'clone', '-q', bare, d); return d; };
  const A = clone('A'), B = clone('B');
  const other = (f, v, m) => { g(B, 'fetch', '-q', 'origin', 'main'); g(B, 'reset', '-q', '--hard', 'origin/main'); W(B, f, v); g(B, 'commit', '-qam', m); g(B, 'push', '-q', 'origin', 'HEAD:main'); };   // bot khác đẩy thẳng

  // 1) hai bot cùng thư mục, khác tệp: B đẩy sau khi main đã đổi → cả hai thay đổi đều còn
  W(A, 'out/a.json', '2'); W(B, 'out/b.json', '2'); fs.rmSync(path.join(B, 'out/old.json'));
  let r = run(A, ['bot A', 'out']); ok(r.status === 0, 'bot A đẩy');
  r = run(B, ['bot B', 'out']); ok(r.status === 0, 'bot B đẩy dù main vừa đổi (không rebase)');
  const C = clone('C1');
  ok(R(C, 'out/a.json') === '2' && R(C, 'out/b.json') === '2' && R(C, 'out/old.json') === null, 'main có cả a của A, b + xoá old của B (không ghi đè tệp không đổi)');
  ok(/\[CF-Pages-Skip\] \[skip ci\]$/.test(g(C, 'log', '-1', '--format=%s')), 'thông điệp tự gắn [CF-Pages-Skip] [skip ci]');

  // 2) xung đột cùng tệp + rebase dở do bước cũ để lại → vẫn đẩy được, bản của bot thắng, không còn trạng thái dở
  const D = clone('D'); W(D, 'idx.txt', 'v2-D'); g(D, 'commit', '-qam', 'local D');
  other('idx.txt', 'v2-B', 'B');
  spawnSync('git', ['pull', '-q', '--rebase', 'origin', 'main'], { cwd: D, env: ENV });   // tạo đúng tình huống "unmerged files"
  ok(fs.existsSync(path.join(D, '.git/rebase-merge')) || fs.existsSync(path.join(D, '.git/rebase-apply')), '(chuẩn bị) D đang kẹt rebase');
  r = run(D, ['bot D', 'idx.txt']);
  ok(r.status === 0, 'kẹt rebase → push-main tự gỡ + đẩy: ' + (r.stderr || r.stdout).trim().split('\n').pop());
  ok(R(clone('C2'), 'idx.txt') === 'v2-D', 'tệp xung đột: bản sản phẩm của bot thắng');

  // 3) không đổi gì → mã 0, không commit; đường dẫn không tồn tại không làm hỏng đường dẫn khác
  const E = clone('E'), before = g(E, 'rev-parse', 'HEAD');
  r = run(E, ['noop', 'out']); ok(r.status === 0 && g(bare, 'rev-parse', 'main') === before, 'không đổi → không commit');
  W(E, 'out/c.json', '3'); r = run(E, ['missing path', 'khong-co/', 'out']);
  ok(r.status === 0 && R(clone('C3'), 'out/c.json') === '3', 'pathspec không tồn tại không chặn tệp còn lại');

  // 4) chế độ sinh lại (PUSH_MAIN_REGEN): chạy lệnh trên main mới nhất
  const F = clone('F'); other('idx.txt', 'v3', 'B2');
  r = run(F, ['regen', 'idx.txt'], { PUSH_MAIN_REGEN: 'cat idx.txt > /dev/null && printf "%s+F" "$(cat idx.txt)" > idx.txt' });
  ok(r.status === 0 && R(clone('C4'), 'idx.txt') === 'v3+F', 'REGEN chạy trên main mới nhất (v3+F)');

  // 5) remote hỏng → hết lượt → mã 1 + ::error:: (không treo vô hạn)
  const G = clone('G'); g(G, 'remote', 'set-url', 'origin', path.join(T, 'khong-co.git')); W(G, 'out/a.json', '9');
  r = run(G, ['dead', 'out'], { PUSH_MAIN_TRIES: '2' }); ok(r.status === 1 && /::error::push-main/.test(r.stdout + r.stderr), 'remote hỏng → đỏ rõ sau N lần');
} finally { fs.rmSync(T, { recursive: true, force: true }); }

// 6) máy gác: không workflow nào còn vòng pull --rebase tự viết để đẩy main (dùng scripts/ci/push-main.sh / commit-regen.sh)
const WF = '.github/workflows', naked = [];
for (const f of fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f))) fs.readFileSync(path.join(WF, f), 'utf8').split('\n').forEach((l, i) => {
  if (!/^\s*#/.test(l) && /git pull\b[^\n]*--rebase/.test(l)) naked.push(`${f}:${i + 1}`);
});
ok(!naked.length, 'không còn `git pull --rebase` trong workflow' + (naked.length ? ': ' + naked.join(', ') : ''));
if (bad) { console.error(`✗ push-main: ${bad} lỗi`); process.exit(1); }
console.log('✓ push-main: đua/xung đột/rebase dở/không đổi/sinh lại/remote hỏng đều đúng; workflow không còn pull --rebase');
