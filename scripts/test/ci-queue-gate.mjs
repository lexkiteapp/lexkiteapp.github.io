// 06/11: (1) zombie "đã huỷ" mỗi giờ nhưng 17 lượt vẫn queued 2–16 ngày – POST /cancel trả 202 mà không huỷ; (2) hàng chờ 100+ lượt mà cron-watch vẫn dispatch bù ci-filler/ci-triage.
import assert from 'node:assert/strict';
import { zombieRuns, stillOpen } from '../ci/zombie.mjs';
import { backfillAllowed, realQueued, QUEUE_MAX } from '../ci/cron-watch.mjs';
const now = Date.parse('2026-11-06T08:00:00Z'), old = { id: 7, status: 'queued', created_at: '2026-11-03T08:00:00Z', path: '.github/workflows/ci-filler.yml' }, young = { id: 8, status: 'queued', created_at: '2026-11-06T04:00:00Z', path: '.github/workflows/ci-filler.yml' };
const mk = runs => { const calls = []; const gh = async (p, o = {}) => { calls.push(`${o.method || 'GET'} ${p}`);
  if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: runs };
  if (/\/jobs/.test(p)) return { total_count: 0, jobs: [] };
  if (/\/(force-)?cancel$/.test(p)) return {};                       // 202: "đã nhận" – lượt zombie KHÔNG đổi trạng thái
  if (o.method === 'DELETE') return {};
  const id = +p.match(/runs\/(\d+)$/)?.[1]; return runs.find(r => r.id === id) || {}; }; return { gh, calls }; };
{ const { gh, calls } = mk([old]); const z = await zombieRuns(gh, { now, settleMs: 0 });
  assert.ok(calls.includes('DELETE /actions/runs/7'), 'cancel 202 mà vẫn queued > 24 giờ → xoá (trước: báo "đã huỷ" mãi)'); assert.equal(z[0].deleted, true); assert.notEqual(z[0].cancel, 'ok', 'không báo "đã huỷ" khi lượt còn queued'); }
{ const { gh, calls } = mk([young]); const z = await zombieRuns(gh, { now, settleMs: 0 });
  assert.ok(!calls.some(c => c.startsWith('DELETE')), 'lượt < 24 giờ không bị xoá'); assert.ok(calls.some(c => /force-cancel$/.test(c)), 'nhưng được leo lên force-cancel'); assert.notEqual(z[0].cancel, 'ok', 'báo thật: chưa huỷ được'); }
{ const done = { ...young, status: 'completed' }; const gh = async (p, o = {}) => (p.startsWith('/actions/runs?status=queued') ? { workflow_runs: [young] } : /\/jobs/.test(p) ? { total_count: 0 } : /\/cancel$/.test(p) ? {} : done);
  assert.equal((await zombieRuns(gh, { now, settleMs: 0 }))[0].cancel, 'ok', 'huỷ thật (completed) → ok'); }
assert.ok(stillOpen({ status: 'queued' }) && stillOpen({ status: 'in_progress' }) && !stillOpen({ status: 'completed' }) && !stillOpen(null), 'stillOpen');
// cổng bù lượt
assert.ok(backfillAllowed('ci-filler.yml', QUEUE_MAX) && !backfillAllowed('ci-filler.yml', QUEUE_MAX + 1) && !backfillAllowed('ci-triage.yml', 119), 'hàng chờ đầy → không bù ci-filler/ci-triage');
assert.ok(backfillAllowed('required-gate.yml', 500) && backfillAllowed('free-tier-guard.yml', 500), 'bộ canh/an toàn vẫn được bù');
const fresh = Array.from({ length: 30 }, (_, i) => ({ id: 100 + i, status: 'queued', created_at: '2026-11-06T07:50:00Z' }));
assert.equal(await realQueued(async () => ({ workflow_runs: [old, young, ...fresh] }), now), 30, 'zombie không tính vào hàng chờ thật (young 4 giờ > 120 phút cũng là zombie)');
console.log('✓ ci-queue-gate: zombie 202 được xoá/leo thang + báo thật, bù lượt dừng khi hàng chờ đầy');
