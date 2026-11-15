// Canh chia shard `npm test`: hợp làn nhanh + các shard = ĐÚNG toàn bộ suite.txt (không mất, không trùng) với mọi số shard,
// số shard trong npm-test.yml khớp matrix, làn nhanh có thật. Không bao giờ được bớt test để CI nhanh.
import fs from 'node:fs'; import path from 'node:path'; import { readSuite, lanes, readWeights, FAST_RE, ROOT } from './run-suite.mjs';
let fail = 0; const ok = (c, m) => { if (!c) { console.error('✗ suite-shards: ' + m); fail++; } };
const all = readSuite(), W = readWeights(), wf = fs.readFileSync(path.join(ROOT, '.github/workflows/npm-test.yml'), 'utf8');
const key = a => [...a].sort().join('\n');
for (const n of [1, 2, 3, 8, 10, 13]) {
  const L = lanes(all, n, W), got = [...L.fast, ...L.shards.flatMap(s => s.cmds)];
  ok(L.shards.length === n && got.length === all.length && key(got) === key(all), `n=${n}: hợp fast+shard (${got.length}) ≠ suite (${all.length})`);
  ok(JSON.stringify(lanes(all, n, W)) === JSON.stringify(L), `n=${n}: chia không tất định`);
}
const N = (wf.match(/shard: \[([^\]]*)\]/) || [])[1]?.split(',').map(Number) || [];
ok(N.length >= 2 && N.every((v, i) => v === i + 1), 'npm-test.yml matrix.shard phải là 1..N liên tục');
ok(wf.includes(`--shard=\${{ matrix.shard }}/${N.length}`) && wf.includes(`shard \${{ matrix.shard }}/${N.length}`), 'npm-test.yml: số "/N" khác độ dài matrix');
ok(/^  test:\n    name: npm test$/m.test(wf) && /needs: \[fast, shard\]/.test(wf) && /if: \$\{\{ !cancelled\(\) \}\}/.test(wf), 'job tổng "npm test" phải needs fast+shard, if !cancelled() (tên check giữ nguyên)');
ok(!/^    name: npm test$/m.test(wf.replace(/^  test:\n    name: npm test$/m, '')), 'chỉ job tổng được tên đúng "npm test"');
ok(/fail-fast: false/.test(wf), 'matrix shard phải fail-fast: false (một lượt thấy mọi lỗi)');
ok(all.filter(c => FAST_RE.test(c)).length >= 5, 'làn nhanh còn < 5 lệnh');
const L = lanes(all, N.length, W), tot = L.shards.map(s => s.t), max = Math.max(...tot), avg = tot.reduce((a, b) => a + b, 0) / tot.length;
ok(max <= avg * 1.25 + 30, `shard lệch: nặng nhất ${Math.round(max)}s vs TB ${Math.round(avg)}s – cập nhật suite-weights.json`);
for (const k of Object.keys(W)) ok(all.includes(k), `suite-weights.json có lệnh không còn trong suite.txt: ${k}`);
if (fail) process.exit(1);
console.log(`✓ suite-shards: ${all.length} lệnh = ${L.fast.length} nhanh + ${N.length} shard (nặng nhất ${Math.round(max)}s ước tính), hợp đủ bộ với n=1..13`);
