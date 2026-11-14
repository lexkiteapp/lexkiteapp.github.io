// busyJobs phải đếm cả job đang chạy trong lượt mang trạng thái "queued" (4/11: đo 28 khi thực tế 40/40), không đếm job xếp hàng.
import assert from 'node:assert/strict';
import { busyJobs, shardCount, videoCount, VIDEO_MAX, TOTAL, RESERVE } from '../ci/shards.mjs';

// 13/11 (chủ): video ≤ 3 máy khi CI còn việc khác; CI rảnh → lấy hết máy rảnh.
assert.equal(videoCount({ left: 48, busy: 10, video: 0 }), 3, 'còn việc khác → tối đa 3');
assert.equal(videoCount({ left: 48, busy: 12, video: 2 }), 1, 'video đã chiếm 2 → còn 1');
assert.equal(videoCount({ left: 48, busy: 13, video: 3 }), 1, 'đủ 3 rồi vẫn ≥1 để ma trận chạy được');
assert.equal(videoCount({ left: 48, busy: 0, video: 0 }), Math.min(24, TOTAL - RESERVE), 'CI rảnh → dùng hết máy rảnh');
assert.equal(videoCount({ left: 48, busy: 5, video: 5 }), Math.min(24, TOTAL - 5 - RESERVE), 'chỉ có video chạy = CI rảnh');
assert.equal(VIDEO_MAX, 3);

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
