// Chia shard audio.yml phải trùng khít bản chạy 1 shard (cùng tập câu → cùng file → cùng chỉ mục), mọi N; + concurrency theo nhánh, sàn shard khi CI đầy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { sortedJobs, partitionJobs } from '../sentence-audio/partition.mjs';
import { shardCount, TOTAL, RESERVE } from '../ci/shards.mjs';

const all = new Map(Array.from({ length: 1237 }, (_, i) => [`k${(i * 7919 % 1237).toString(36)}`, { voice: 'af_heart', text: `câu ${i}` }]));
const have = new Set(['k0', 'k1', 'k2']);
const sorted = sortedJobs(all, k => have.has(k));
const single = partitionJobs(sorted, 0, 1);
assert.equal(single.size, all.size - [...have].filter(k => all.has(k)).length);
for (const N of [2, 3, 4, 7, 24, 1237, 2000]) {
  const seen = new Map();
  for (let i = 0; i < N; i++) for (const [k, v] of partitionJobs(sorted, i, N)) { assert.ok(!seen.has(k), `N=${N}: khóa ${k} nằm ở 2 shard`); seen.set(k, v); }
  assert.deepEqual([...seen.keys()].sort(), [...single.keys()].sort(), `N=${N}: hợp các shard ≠ bản 1 shard`);
  for (const [k, v] of seen) assert.deepEqual(v, single.get(k), `N=${N}: nội dung ${k} khác`);
  const sizes = Array.from({ length: Math.min(N, 24) }, (_, i) => partitionJobs(sorted, i, N).size);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1, `N=${N}: shard lệch > 1 câu`);
}
// kết quả không phụ thuộc thứ tự đầu vào (corpus đổi thứ tự → vẫn cùng chia)
const rev = sortedJobs(new Map([...all].reverse()), k => have.has(k));
assert.deepEqual([...partitionJobs(rev, 1, 5).keys()], [...partitionJobs(sorted, 1, 5).keys()]);

// số shard: CI đầy vẫn có sàn (min) nhưng không vượt ⌈việc/per⌉ hay cap; CI rảnh dùng hết máy rảnh chừa RESERVE
assert.equal(shardCount({ left: 1200, busy: TOTAL, per: 200, min: 4 }), 4, '14/11: CI đầy + 1.200 câu → 4 shard thay vì 1');
assert.equal(shardCount({ left: 1200, busy: TOTAL, per: 200 }), 1, 'không min → như cũ');
assert.equal(shardCount({ left: 150, busy: TOTAL, per: 200, min: 4 }), 1, 'việc nhỏ không bị ép 4 shard');
assert.equal(shardCount({ left: 500, busy: TOTAL, per: 200, min: 4 }), 3, 'không vượt ⌈việc/per⌉');
assert.equal(shardCount({ left: 99999, busy: 0, per: 200, min: 4, cap: 24 }), Math.min(24, TOTAL - RESERVE), 'CI rảnh: dùng hết, chừa reserve');
assert.equal(shardCount({ left: 99999, busy: 30, per: 200, min: 4 }), Math.max(4, TOTAL - 30 - RESERVE));

// workflow: concurrency theo nhánh, không hủy lượt đang render; sàn shard + 200 câu/shard
const wf = fs.readFileSync('.github/workflows/audio.yml', 'utf8');
assert.match(wf, /concurrency:\n\s+group: audio-\$\{\{ github\.ref \}\}/, 'concurrency theo ref');
assert.match(wf, /cancel-in-progress: false/);
assert.match(wf, /--per 200 --min 4/);
console.log('audio-shard-equiv: OK');
