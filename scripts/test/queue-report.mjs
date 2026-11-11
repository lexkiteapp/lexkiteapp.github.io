// Test thuần cho scripts/ci/queue-report.mjs (đo hàng chờ CI hằng ngày, 05/11).
import assert from 'node:assert/strict';
import { report, sampleRuns, snapshot, BASELINE } from '../ci/queue-report.mjs';
const T = m => new Date(Date.parse('2026-11-06T00:00:00Z') + m * 60e3).toISOString();
const run = (id, o = {}) => ({ id, path: '.github/workflows/a.yml', event: 'pull_request', head_sha: 's' + id, status: 'completed', conclusion: 'success', created_at: T(0), run_started_at: T(0), updated_at: T(10), ...o });
const runs = [run(1), run(2, { head_sha: 's1' }), run(3, { head_sha: 's1', conclusion: 'cancelled', updated_at: T(5) }), run(4, { event: 'schedule', head_sha: 's1' }), run(5, { conclusion: 'skipped' }), run(6, { path: '.github/workflows/b.yml', event: 'push', head_sha: 'p' }), run(7, { path: '.github/workflows/b.yml', event: 'push', head_sha: 'p' })];
const job = (c, s, e, o = {}) => ({ created_at: T(c), started_at: T(s), completed_at: T(e), conclusion: 'success', ...o });
const jobs = { 1: [job(0, 2, 12), job(0, 10, 10.5)], 6: [job(0, 20, 30)], 2: [job(0, 0, 1, { conclusion: 'skipped' })] };
const { m, md } = report(runs, jobs, { busy: 40, queued: 7, zombies: 0 }, { hours: 1 });
assert.equal(m.runsH, 7); assert.equal(m.minH, 55, 'phút: 5 lượt xong × 10 + 1 lượt huỷ × 5, không tính skipped');
assert.equal(m.cancelPct, 9); assert.equal(m.dup, 2, 'trùng: a.yml s1 PR ×2 (1 thừa) + b.yml push ×2 (1 thừa); huỷ/schedule không tính');
assert.deepEqual([m.waitP50, m.waitP90], [10, 20], 'chờ runner theo job, không tính job skipped');
assert.equal(m.smallPct, 50, '1/2 job PR < 90 s');
assert.ok(md.includes(`| Lượt trùng cùng workflow + sha (24 h) | ${BASELINE.dup} | 2 |`) && /a\.yml ×1/.test(md) && md.includes('| Lúc đo: job chạy /40 | 37 | 40 |'));
assert.equal(sampleRuns(Array.from({ length: 300 }, (_, i) => run(i)), 150).length, 150); assert.equal(sampleRuns([run(1, { conclusion: 'skipped' })]).length, 0);
const gh = async p => { if (p.includes('status=in_progress')) return { workflow_runs: [{ id: 1, created_at: T(0) }] }; if (p.includes('status=queued')) return { workflow_runs: [{ id: 2, created_at: '2026-10-26T04:23:15Z' }, { id: 3, created_at: T(0) }] };
  if (p.startsWith('/actions/runs/1/')) return { jobs: [{ status: 'in_progress' }, { status: 'queued' }] }; if (p.startsWith('/actions/runs/3/')) return { jobs: [{ status: 'queued' }] }; return { jobs: [] }; };
assert.deepEqual(await snapshot(gh, Date.parse(T(30))), { busy: 1, queued: 2, zombies: 1 }, 'zombie = queued 0 job > 2 giờ; lượt mới 0 job không tính');
console.log('✓ queue-report: phút/huỷ/trùng, chờ runner mức job, job PR nhỏ, ảnh chụp busy/queued/zombie, bảng so mốc 05/11');
