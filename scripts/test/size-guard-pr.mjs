// size-guard trên PR (--base): chỉ tính commit RIÊNG của PR + TỔNG cả PR; commit nặng của main đi vào qua merge KHÔNG được tính (08/11: e8c38ec4f làm mọi PR đỏ).
// Dựng repo git thật trong $TMPDIR (ngưỡng 1 MB cho gọn): chạy node scripts/test/size-guard-pr.mjs
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
const GUARD = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'size-guard.mjs');
const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'sg-'));
const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8', env: { ...process.env, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } }).trim();
const put = (f, mb, seed) => fs.writeFileSync(path.join(dir, f), Buffer.alloc(Math.round(mb * 1e6), seed));
const commit = (m, f, mb, seed) => { put(f, mb, seed); git('add', '-A'); git('commit', '-q', '-m', m); };
const guard = () => spawnSync('node', [GUARD, '--base', 'main', '--commit-mb', '1'], { cwd: dir, encoding: 'utf8' });
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.error('✗ ' + m); } };
git('init', '-q', '-b', 'main'); commit('gốc', 'a.txt', 0.01, 97);
// PR rẽ nhánh từ main cũ
git('switch', '-q', '-c', 'pr'); commit('PR: nhỏ', 'small.bin', 0.2, 1);
// main tiến thêm commit NẶNG (như e8c38ec4f)
git('switch', '-q', 'main'); commit('main: nặng', 'heavy.bin', 3, 2);
// 1) PR merge main (commit gộp kiểu GitHub: cha 1 = main mới, cha 2 = đầu PR) → xanh
git('switch', '-q', 'pr'); git('merge', '-q', '--no-edit', 'main');
let r = guard(); ok(r.status === 0, 'PR merge main có commit nặng → xanh\n' + r.stderr + r.stdout);
// 1b) giống GitHub: HEAD là commit gộp trên main mới
git('switch', '-q', '-c', 'mergeref', 'main'); git('merge', '-q', '--no-ff', '--no-edit', 'pr'); r = guard(); ok(r.status === 0, 'commit gộp kiểu GitHub (cha1 = main, cha2 = PR) → xanh\n' + r.stderr + r.stdout);
// 2) PR tự thêm tệp > ngưỡng trong 1 commit → đỏ
git('switch', '-q', 'main'); git('switch', '-q', '-c', 'pr2'); commit('PR: nặng', 'big.bin', 1.5, 3); r = guard();
ok(r.status === 1 && /commit [0-9a-f]{9} thêm/.test(r.stderr), 'PR tự thêm > ngưỡng trong 1 commit → đỏ\n' + r.stderr);
// 3) nhiều commit nhỏ cộng dồn > ngưỡng (squash) → đỏ nhờ kiểm tổng
git('switch', '-q', 'main'); git('switch', '-q', '-c', 'pr3'); commit('p1', 'x1.bin', 0.6, 4); commit('p2', 'x2.bin', 0.6, 5); commit('p3', 'x3.bin', 0.6, 6); r = guard();
ok(r.status === 1 && /cả PR thêm/.test(r.stderr) && !/commit [0-9a-f]{9} thêm/.test(r.stderr), 'mỗi commit nhỏ nhưng tổng cả PR > ngưỡng → đỏ (tính cộng dồn)\n' + r.stderr);
// 4) cùng ca nhưng có Size-Guard: allow → xanh
git('commit', '-q', '--allow-empty', '-m', 'ghi chú\n\nSize-Guard: allow – media của bài kiểm tra'); r = guard(); ok(r.status === 0, 'Size-Guard: allow trong một commit của PR → xanh\n' + r.stderr);
// 5) PR không đụng gì (chỉ merge main) → xanh, và sửa/xóa tệp nặng của main không bị tính
git('switch', '-q', 'main'); git('switch', '-q', '-c', 'pr5'); fs.unlinkSync(path.join(dir, 'heavy.bin')); git('add', '-A'); git('commit', '-q', '-m', 'xóa tệp nặng'); r = guard(); ok(r.status === 0, 'PR xóa tệp nặng → xanh\n' + r.stderr);
fs.rmSync(dir, { recursive: true, force: true });
console.log(fails ? `size-guard-pr: ${fails} lỗi` : '✓ size-guard-pr: merge main nặng → xanh; PR tự thêm > ngưỡng (1 commit hoặc cộng dồn) → đỏ; Size-Guard: allow → xanh');
process.exit(fails ? 1 : 0);
