// 05/11: hàng chờ > 100 lượt thì zombie cũ nhất (26/10) nằm ở TRANG 2 của /actions/runs?status=queued – bộ canh chỉ đọc trang 1 nên không bao giờ thấy/xoá (10 ngày).
import assert from 'node:assert/strict';
import { zombieRuns, stuckJobs, listRuns } from '../ci/zombie.mjs';

const now = Date.parse('2026-11-05T16:00:00Z');
const fresh = Array.from({ length: 100 }, (_, i) => ({ id: 1000 + i, status: 'queued', created_at: '2026-11-05T15:50:00Z', path: '.github/workflows/npm-test.yml' }));
const ghost = { id: 9, status: 'queued', created_at: '2026-10-26T04:23:15Z', path: '.github/workflows/vocab-img-scene.yml' };
const calls = [];
const gh = async (p, o = {}) => { calls.push(`${o.method || 'GET'} ${p}`);
  if (p.startsWith('/actions/runs?status=queued&per_page=100&page=2')) return { workflow_runs: [ghost] };
  if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: fresh };
  if (p.endsWith('/9/jobs?per_page=1')) return { total_count: 0 };
  if (/\/9\/(force-)?cancel$/.test(p)) throw new Error('GitHub POST /x → 409');
  if (p.startsWith('/actions/runs/9/jobs')) return { jobs: [] };
  return {}; };
const all = await listRuns(gh, 'queued');
assert.equal(all.length, 101); assert.equal(all[0].id, 9, 'cũ nhất đứng đầu');
const z = await zombieRuns(gh, { now });
assert.deepEqual(z.map(x => x.id), [9], 'zombie ở trang 2 vẫn được thấy');
assert.ok(calls.includes('DELETE /actions/runs/9'), 'và bị xoá sau 24 giờ');
assert.ok(!calls.some(c => /runs\/10\d\d\/jobs/.test(c)), 'lượt mới không tốn lệnh API');
const sj = await stuckJobs(async p => p.includes('status=queued') ? (p.includes('page=2') ? { workflow_runs: [ghost] } : { workflow_runs: fresh }) : p.includes('status=in_progress') ? { workflow_runs: [] } : { jobs: [{ status: 'queued', created_at: '2026-10-26T04:30:00Z' }] }, { now });
assert.deepEqual(sj.map(x => x.id), [9], 'job kẹt ở trang 2 cũng được báo');
console.log('✓ zombie-pages: zombie/job kẹt ở trang 2+ của hàng chờ được thấy, xoá lượt cũ nhất');

// 05/11: gh của required-gate nuốt lỗi (trả null) → cancel/force-cancel 409 không throw. Trước: z.cancel='ok' sai → không bao giờ DELETE.
{
  const calls2 = []; let deleted = false;
  const swallow = async (p, o = {}) => { const m = o.method || 'GET'; calls2.push(`${m} ${p}`);
    if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: [ghost] };
    if (p.endsWith('/9/jobs?per_page=1')) return { total_count: 0 };
    if (m === 'POST') return null;
    if (m === 'DELETE') { deleted = true; return {}; }
    if (p === '/actions/runs/9') return deleted ? null : { id: 9, status: 'queued' };
    return {}; };
  const [r] = await zombieRuns(swallow, { now, cancel: true });
  assert.ok(calls2.includes('DELETE /actions/runs/9'), 'gh nuốt lỗi: vẫn tới DELETE');
  assert.equal(r.deleted, true, 'xoá xong thì đọc lại không còn');
  assert.notEqual(r.cancel, 'ok', 'cancel 409 bị nuốt không được tính là ok');
}
console.log('✓ zombie-delete: gh nuốt lỗi vẫn force-cancel → DELETE');
// DELETE bị nuốt (lượt vẫn còn khi đọc lại) → KHÔNG được báo đã xoá
{
  const stuck = async (p, o = {}) => { const m = o.method || 'GET';
    if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: [ghost] };
    if (p.endsWith('/9/jobs?per_page=1')) return { total_count: 0 };
    if (m === 'POST' || m === 'DELETE') return null;
    if (p === '/actions/runs/9') return { id: 9, status: 'queued' };
    return {}; };
  const [r] = await zombieRuns(stuck, { now, cancel: true });
  assert.notEqual(r.deleted, true, 'DELETE không hiệu lực không được tính là đã xoá');
}
console.log('✓ zombie-delete: DELETE bị nuốt không báo đã xoá');
