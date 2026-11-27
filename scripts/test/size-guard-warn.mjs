// size-guard cảnh báo sớm (26/11, main đỏ vì cây > 600 MB không báo trước): dựng repo git tạm, chạy size-guard.mjs --base với ngưỡng nhỏ.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const GUARD = path.resolve('scripts/test/size-guard.mjs');
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.error('✗ ' + m); } };
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sgw-')), git = (...a) => execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
const blob = (f, mb) => { fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), Buffer.alloc(Math.round(mb * 1e6), 7)); };
git('init', '-q', '-b', 'main'); blob('a/base.bin', 4); git('add', '-A'); git('commit', '-qm', 'base');
const run = (extra) => { const r = spawnSync('node', [GUARD, '--base', 'main', ...extra], { cwd: dir, encoding: 'utf8' }); return { code: r.status, out: (r.stdout || '') + (r.stderr || '') }; };
const pr = (name, files, msg = 'pr') => { git('checkout', '-q', '-b', name, 'main'); for (const [f, mb] of files) blob(f, mb); git('add', '-A'); git('commit', '-qm', msg); };
// 1) cây 4 MB + PR thêm 2 MB (cây 6 MB ≥ cảnh báo 5, tăng > 1) → đỏ kèm hướng dẫn kho ngoài
pr('grow', [['b/x.bin', 2]]); let r = run(['--tree-mb', '100', '--warn-mb', '5', '--grow-mb', '1']);
ok(r.code === 1 && /tăng 2\.0 MB/.test(r.out) && /push\.mjs/.test(r.out) && /infra\/media-repos\.json/.test(r.out), 'cây ≥ cảnh báo + PR tăng > 1 MB → đỏ kèm hướng dẫn' + (r.code === 1 ? '' : ' (mã ' + r.code + ')'));
ok(/cây sau merge 6\.0 MB \(\+2\.00 MB/.test(r.out), 'in "cây sau merge" + mức tăng');
// 2) cùng PR nhưng cây còn dưới ngưỡng cảnh báo → xanh (không phạt PR khi còn xa trần)
r = run(['--tree-mb', '100', '--warn-mb', '50', '--grow-mb', '1']); ok(r.code === 0, 'cây dưới ngưỡng cảnh báo → xanh');
// 3) cảnh báo vàng khi cây > warn (và ≤ trần), kể cả PR không tăng
git('checkout', '-q', 'main'); pr('small', [['c/y.bin', 0.4]]); r = run(['--tree-mb', '100', '--warn-mb', '3', '--grow-mb', '1']);
ok(r.code === 0 && /::warning title=cây repo gần trần/.test(r.out), 'tăng ≤ 1 MB: xanh nhưng có cảnh báo vàng');
// 4) PR thu nhỏ cây khi đang gần trần → xanh
git('checkout', '-q', 'main'); git('checkout', '-q', '-b', 'shrink'); fs.rmSync(path.join(dir, 'a/base.bin')); blob('a/new.bin', 1); git('add', '-A'); git('commit', '-qm', 'shrink');
r = run(['--tree-mb', '100', '--warn-mb', '1', '--grow-mb', '1']); ok(r.code === 0 && /\(-3\.00 MB/.test(r.out), 'PR giảm cây → xanh, in mức giảm');
// 5) ngoại lệ có chủ đích
git('checkout', '-q', 'main'); pr('allow', [['d/z.bin', 3]], 'media\n\nSize-Guard: allow – lý do thử'); r = run(['--tree-mb', '100', '--warn-mb', '5', '--grow-mb', '1']); ok(r.code === 0 && /được phép/.test(r.out), 'Size-Guard: allow → qua, có ghi chú');
// 6) trần 600 giữ nguyên (mặc định) và ngưỡng cảnh báo mặc định 585
const src = fs.readFileSync(GUARD, 'utf8'); ok(/opt\('tree-mb', 600\)/.test(src) && /opt\('warn-mb', 585\)/.test(src) && /opt\('grow-mb', 1\)/.test(src), 'mặc định: trần 600 · cảnh báo 585 · tăng 1 MB');
fs.rmSync(dir, { recursive: true, force: true });
if (bad) { console.error(`size-guard-warn: ${bad}/${n} trượt`); process.exit(1); }
console.log(`✓ size-guard-warn: ${n} kiểm tra đạt`);
