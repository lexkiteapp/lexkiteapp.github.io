// busyJobs phải đếm cả job đang chạy trong lượt mang trạng thái "queued" (4/11: đo 28 khi thực tế 40/40), không đếm job xếp hàng.
import assert from 'node:assert/strict';
import { busyJobs, shardCount, TOTAL, RESERVE } from '../ci/shards.mjs';

const run = (id, jobs) => ({ id, jobs });
const fake = (lists) => {
  const all = [...lists.in_progress, ...lists.queued];
  const calls = [];
  const api = async (u) => {
    calls.push(u);
    const m = u.match(/status=(\w+).*page=(\d+)/);
    if (m) return { workflow_runs: +m[2] === 1 ? lists[m[1]] : [] };
    const id = +u.match(/runs\/(\d+)\/jobs/)[1];
    return { jobs: all.find(r => r.id === id).jobs.map(status => ({ status })) };
  };
  return { api, calls };
};

{ // lượt queued có job đang chạy được tính; job queued và lượt không job thì không
  const { api } = fake({
    in_progress: [run(1, ['in_progress', 'in_progress', 'completed']), run(2, ['in_progress', 'queued'])],
    queued: [run(3, ['in_progress', 'in_progress', 'queued']), run(4, ['queued']), run(5, [])],
  });
  assert.equal(await busyJobs('o/r', 't', api), 5);
}
{ // đã đủ TOTAL thì dừng, không gọi thêm API
  const big = Array.from({ length: 3 }, (_, i) => run(i + 1, Array(TOTAL).fill('in_progress')));
  const { api, calls } = fake({ in_progress: big, queued: [run(9, ['in_progress'])] });
  assert.equal(await busyJobs('o/r', 't', api), TOTAL);
  assert.equal(calls.filter(u => u.includes('/jobs')).length, 1);
}
{ // đang đầy máy thì chỉ 1 shard, không tràn thêm
  assert.equal(shardCount({ left: 9999, busy: TOTAL }), 1);
  assert.equal(shardCount({ left: 9999, busy: 28 }), TOTAL - 28 - RESERVE);
}
console.log('ci-shards-busy: OK');
