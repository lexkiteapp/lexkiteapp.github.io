#!/usr/bin/env node
// stitch-diff chia shard theo màn (19/11: job `diff` 30 phút bị huỷ): mỗi màn thuộc ĐÚNG một shard, các shard cân nhau, stitch-diff/final-qc dùng chung phép chia,
// kết quả gộp lại đủ mọi màn, workflow = matrix 4 shard ≤ 15 phút + job tổng `diff` (một check cho required-gate).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawnSync } from 'node:child_process';
import { mergeShards } from '../ci/stitch-merge.mjs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗', m); } else console.log('  ✓', m); };
const N = 4, probe = i => JSON.parse(spawnSync('node', ['--input-type=module', '-e', "import('./scripts/test/stitch-screens.mjs').then(m=>console.log(JSON.stringify({s:m.shardScreens().map(x=>x[0]),f:m.FINAL.filter(f=>m.inShard(f.k)).map(f=>f.stitch),all:Object.keys(m.SCREENS),fa:m.FINAL.map(f=>f.stitch)})))"], { encoding: 'utf8', env: { ...process.env, SHARD: `${i}/${N}` } }).stdout);
const P = [...Array(N).keys()].map(probe), all = P[0].all, fa = P[0].fa;
ok(all.length >= 29 && all.every(k => P.filter(p => p.s.includes(k)).length === 1), `mỗi màn (${all.length}) thuộc đúng 1 shard`);
ok(Math.max(...P.map(p => p.s.length)) - Math.min(...P.map(p => p.s.length)) <= 1, 'các shard cân nhau (' + P.map(p => p.s.length).join('/') + ')');
ok(fa.every(f => P.filter(p => p.f.includes(f)).length === 1), `mọi màn QC cuối (${fa.length}) thuộc đúng 1 shard (mục chưa port k=null → shard 0)`);
const un = spawnSync('node', ['--input-type=module', '-e', "import('./scripts/test/stitch-screens.mjs').then(m=>console.log(m.shardScreens().length+' '+m.FINAL.filter(f=>m.inShard(f.k)).length+' '+Object.keys(m.SCREENS).length+' '+m.FINAL.length))"], { encoding: 'utf8', env: { ...process.env, SHARD: '' } }).stdout.trim().split(' ');
ok(un[0] === un[2] && un[1] === un[3], 'không đặt SHARD → chạy đủ như cũ');
const sd = fs.readFileSync('scripts/test/stitch-diff.mjs', 'utf8'), fq = fs.readFileSync('scripts/test/final-qc.mjs', 'utf8');
ok(!/Object\.(entries|keys)\(SCREENS\)/.test(sd) && /shardScreens\(\)/.test(sd) && /inShard\(null\)/.test(sd), 'stitch-diff.mjs: mọi vòng màn qua shardScreens, gallery chỉ shard 0');
ok(/FINAL_ALL\.filter\(f => inShard\(f\.k\)\)/.test(fq), 'final-qc.mjs: cùng phép chia với stitch-diff');
// gộp shard
const T = fs.mkdtempSync(path.join(process.env.TMPDIR || os.tmpdir(), 'stsh-')), W = (d, f, c) => { fs.mkdirSync(path.join(T, 'src', d), { recursive: true }); fs.writeFileSync(path.join(T, 'src', d, f), c); };
W('stitch-diff-0', 'scores.json', JSON.stringify({ res: { 'a-dark': { ssim: 1 } }, errs: ['e0'], a11y: {}, qc: { 'a-dark-360': {} }, contrast: {}, ph: {} })); W('stitch-diff-1', 'scores.json', JSON.stringify({ res: { 'b-dark': { ssim: 2 } }, errs: ['e1'], a11y: {}, qc: {}, contrast: {}, ph: {} }));
W('stitch-diff-0', 'app-a-dark.png', 'x'); W('stitch-diff-1', 'app-b-dark.png', 'y'); W('stitch-diff-0', 'SUMMARY.md', 'S0'); W('stitch-diff-1', 'SUMMARY.md', 'S1');
const n = mergeShards(path.join(T, 'src'), path.join(T, 'out')), sc = JSON.parse(fs.readFileSync(path.join(T, 'out/scores.json'), 'utf8'));
ok(n === 2 && Object.keys(sc.res).length === 2 && sc.errs.join() === 'e0,e1' && sc.qc['a-dark-360'] && fs.existsSync(path.join(T, 'out/app-b-dark.png')) && /S0\nS1/.test(fs.readFileSync(path.join(T, 'out/SUMMARY.md'), 'utf8')), 'stitch-merge: hợp scores.json (res/errs/qc), chép ảnh, nối SUMMARY');
fs.rmSync(T, { recursive: true, force: true });
// workflow
const wf = fs.readFileSync('.github/workflows/stitch-diff.yml', 'utf8'), job = id => (wf.split(/^  (?=[\w-]+:[ \t]*(?:#.*)?\n)/m).find(j => j.startsWith(id + ':')) || '');
const sh = job('diff-shard'), ag = job('diff');
ok(/shard: \[0, 1, 2, 3\]/.test(sh) && /SHARD: '\$\{\{ matrix\.shard \}\}\/4'/.test(sh) && +(sh.match(/timeout-minutes: (\d+)/) || [])[1] <= 15 && /fail-fast: false/.test(sh), 'workflow: diff-shard = matrix 4 shard, SHARD=i/4, timeout ≤ 15 phút, không fail-fast');
ok(/needs: \[gate, diff-shard\]/.test(ag) && /!cancelled\(\)/.test(ag) && /stitch-merge\.mjs/.test(ag) && /stitch-shots\.mjs/.test(ag) && /needs\.diff-shard\.result/.test(ag) && +(ag.match(/timeout-minutes: (\d+)/) || [])[1] <= 15, 'workflow: job tổng `diff` gộp + đăng ảnh + đỏ nếu một shard đỏ/huỷ (một check cho required-gate)');
ok(/node scripts\/test\/stitch-diff\.mjs web out\/stitch-diff/.test(sh) && /node scripts\/test\/final-qc\.mjs web out\/stitch-diff out\/final-qc/.test(sh), 'workflow: shard vẫn chạy stitch-diff + final-qc đủ ngưỡng (stitch-diff.json không đổi)');
process.exit(bad ? 1 : 0);
