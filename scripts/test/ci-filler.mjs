// Kiểm ci-filler (scripts/ci/filler.mjs): công thức shard, chặn trùng, đếm job đói runner, log/báo cáo 24 h,
// và sổ infra/ci-backlog.json ↔ .github/workflows (tồn tại, có concurrency + timeout-minutes mọi job, có workflow_dispatch + input shards).
import fs from 'node:fs';
import { capacity, shardsFor, plan, activeWorkflows, countJobs, logLine, report, eligible, loadRegistry } from '../ci/filler.mjs';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };

// --- công thức chỗ trống + shard
ok(capacity({ busy: 13, starved: 0 }) === 19, '13 busy → 40 − 13 − 8 = 19');
ok(capacity({ busy: 32, starved: 0 }) === 0 && capacity({ busy: 35, starved: 0 }) === 0, 'busy ≥ 32 → 0');
ok(capacity({ busy: 5, starved: 1 }) === 0, 'có job đói runner → 0');
// hồi quy 02/11 04:21Z: busy 20, queued 118 (đói 0) → mã cũ bơm 12 job (40/40, check PR #406/#418 không có runner) – phải 0
ok(capacity({ busy: 20, queued: 118, starved: 0 }) === 0, '04:21Z busy 20 + queued 118 → 0 shard');
ok(capacity({ busy: 20, queued: 5, starved: 0 }) === 7, 'busy + queued + shard ≤ 32 → 32 − 20 − 5 = 7');
ok(capacity({ busy: 10, queued: 0, starved: 0, prQueued: 1 }) === 0, 'check PR đang xếp hàng → 0');
const W = { id: 'w', workflow: 'w.yml', cpu_bound: true, shards_input: 'shards', max_shards: 6 };
ok(shardsFor(W, 19) === 6 && shardsFor(W, 4) === 4 && shardsFor(W, 0) === 0, 'shard = min(trần, chỗ)');
ok(shardsFor({ ...W, min_shards: 3 }, 2) === 0, 'dưới min_shards → không dispatch');
ok(shardsFor({ id: 'f', jobs: 2 }, 1) === 0 && shardsFor({ id: 'f', jobs: 2 }, 2) === 2, 'mục cố định chỉ chạy khi vừa');
// --- chặn trùng + kế hoạch
const active = activeWorkflows([{ status: 'in_progress', path: '.github/workflows/w.yml' }, { status: 'completed', path: '.github/workflows/x.yml' }, { status: 'pending', path: '.github/workflows/y.yml@refs/heads/main' }]);
ok(active.has('w.yml') && active.has('y.yml') && !active.has('x.yml'), 'activeWorkflows: queued/in_progress/pending, bỏ completed');
const E = [W, { ...W, id: 'x', workflow: 'x.yml' }, { ...W, id: 'y', workflow: 'y.yml' }, { ...W, id: 'z', workflow: 'z.yml' }, { id: 'q', workflow: 'q.yml', quota_bound: true, cpu_bound: false, eligible: false }];
const p = plan(E, { free: 8, active, left: e => ({ x: 100, z: 50, q: 9 })[e.id] ?? 0 });
const by = Object.fromEntries(p.map(s => [s.id, s]));
ok(by.w.act === 'skip' && /trùng/.test(by.w.why) && by.y.act === 'skip', 'không dispatch workflow đang chạy');
ok(by.x.act === 'dispatch' && by.x.n === 6 && by.x.inputs.shards === '6', 'x: 6 shard');
ok(by.z.act === 'dispatch' && by.z.n === 2, 'z: phần còn lại (8 − 6 = 2)');
ok(by.q.act === 'skip', 'quota_bound không bao giờ dispatch');
ok(plan([W], { free: 8, active: new Set(), left: () => 0 })[0].act === 'done', 'probe 0 → xong');
ok(plan([W], { free: 8, active: new Set(), left: () => null })[0].act === 'skip', 'probe lỗi → bỏ qua');
// --- đếm job
const now = Date.parse('2026-11-01T12:00:00Z'), old = '2026-11-01T11:58:00Z', fresh = '2026-11-01T11:59:50Z';
const c = countJobs([[{ status: 'in_progress' }, { status: 'queued', created_at: old }], [{ status: 'queued', created_at: old }, { status: 'queued', created_at: fresh }]], now);
ok(c.busy === 1 && c.queued === 3 && c.starved === 1, 'job queued trong lượt đang chạy = bị giữ (max-parallel), không phải đói');
const cp = countJobs([{ event: 'pull_request', jobs: [{ status: 'in_progress' }, { status: 'queued', created_at: fresh }] }, { event: 'schedule', jobs: [{ status: 'queued', created_at: fresh }] }], now);
ok(cp.prQueued === 1 && cp.queued === 2 && cp.busy === 1, 'job check PR đang xếp hàng được đếm riêng (prQueued)');
{ const now = Date.parse('2026-11-04T10:00:00Z'), old = '2026-11-04T04:25:00Z', fresh = '2026-11-04T09:59:30Z';
  const st = countJobs([{ event: 'pull_request', jobs: [{ status: 'in_progress' }, ...Array(14).fill({ status: 'queued', created_at: old })] }], now);
  ok(st.prQueued === 0 && st.queued === 0 && st.stuck === 14 && capacity(st) === 31, 'job PR kẹt lâu không chặn lấp runner (04/11: 14 job teach-video)');
  const st2 = countJobs([{ event: 'pull_request', jobs: [{ status: 'in_progress' }, { status: 'queued', created_at: fresh }] }], now);
  ok(st2.prQueued === 1 && capacity(st2) === 0, 'check PR mới xếp hàng vẫn được ưu tiên');
  const st3 = countJobs([{ event: 'workflow_dispatch', jobs: [{ status: 'queued', created_at: old }] }], now);
  ok(st3.starved === 0 && st3.stuck === 1, 'lượt zombie không bị tính là đói runner'); }
// --- log + báo cáo
ok(logLine({ ts: 't', busy: 13, queued: 0, dispatched: 12, backlog: 2 }) === 't\t13\t0\t12\t2\t70', 'idle = (32 − 13 − 12) × 10');
ok(logLine({ ts: 't', busy: 13, queued: 0, dispatched: 0, backlog: 0 }).endsWith('\t0'), 'không tồn đọng → idle 0');
const r = report('2026-11-01T10:04Z\t10\t0\t6\t1\t160\n2026-11-01T10:14Z\t30\t0\t0\t1\t20\n2026-10-30T10:04Z\t1\t0\t0\t1\t310\n', now);
ok(r.samples === 2 && r.peak === 30 && r.idle === 180 && r.per[0].h === '10' && r.per[0].avg === 23, 'báo cáo 24 h: TB/đỉnh theo giờ + idle');

// --- sổ ↔ workflow thật
const reg = loadRegistry(), ids = new Set();
ok(reg.total_runners === 40 && reg.reserve === 8, 'sổ: 40 runner, chừa 8');
for (const e of reg.entries) {
  ok(!ids.has(e.id), `trùng id ${e.id}`); ids.add(e.id);
  const f = `.github/workflows/${e.workflow}`;
  if (!fs.existsSync(f)) { ok(false, `${e.id}: ${f} không tồn tại`); continue; }
  const s = fs.readFileSync(f, 'utf8');
  if (e.quota_bound) { ok(!eligible(e), `${e.id}: quota_bound phải eligible:false`); continue; }
  ok(/^concurrency:/m.test(s), `${e.id}: ${e.workflow} thiếu concurrency cấp workflow`);
  const jobs = s.split(/^jobs:\s*$/m)[1] || '', n = (jobs.match(/^\s{4}runs-on:/gm) || []).length + (jobs.match(/^\s{4}uses:/gm) || []).length;
  ok(n > 0 && (jobs.match(/^\s{4}timeout-minutes:/gm) || []).length >= (jobs.match(/^\s{4}runs-on:/gm) || []).length, `${e.id}: mọi job phải có timeout-minutes`);
  ok(/^\s+workflow_dispatch:/m.test(s), `${e.id}: thiếu workflow_dispatch`);
  if (e.shards_input) ok(new RegExp(`^\\s+${e.shards_input}:`, 'm').test(s) && e.max_shards > 0, `${e.id}: thiếu input ${e.shards_input}/max_shards`);
  const mp = s.match(/max-parallel:\s*(\d+)/); if (mp && e.shards_input) ok(e.max_shards <= +mp[1], `${e.id}: max_shards ${e.max_shards} > max-parallel ${mp[1]}`);
  for (const k of Object.keys(e.inputs || {})) ok(new RegExp(`^\\s+${k}:`, 'm').test(s), `${e.id}: input ${k} không có trong workflow`);
  ok(e.probe && (e.probe.cmd ? e.probe.left_re : e.probe.stale_hours > 0), `${e.id}: thiếu probe (cmd + left_re hoặc stale_hours)`);
}
const self = fs.readFileSync('.github/workflows/ci-filler.yml', 'utf8'), tm = self.match(/timeout-minutes:\s*(\d+)/);
ok(/^concurrency:/m.test(self) && tm && +tm[1] <= 5 && /cron: '[^']*\/10 /.test(self) && /workflow_dispatch/.test(self), 'ci-filler.yml: cron 10 phút, concurrency, timeout ≤ 5');
await import('./qa-fill.mjs');
await import('./gh-api.mjs');   // helper GitHub API dùng chung (ETag, poll ≥ 5 phút, hạn mức) – cùng lệnh npm test   // phần QA mở rộng (sổ 8 QA, cùng sha, qa-backlog, upgrade-audit) – cùng 1 lệnh trong npm test
if (fail) { console.error(`✗ ci-filler: ${fail} lỗi`); process.exit(1); }
console.log('✓ ci-filler: shard, chặn trùng, log/báo cáo, sổ ↔ workflow');
