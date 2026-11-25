// Test thuần cho scripts/ci/zombie-sweep.mjs (dọn lượt queued 0 job).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { findZombies, MIN_AGE_MIN } from '../ci/zombie-sweep.mjs';
import { isZombie } from '../ci/zombie.mjs';
const now = Date.parse('2026-11-21T10:00:00Z'), ago = m => new Date(now - m * 60e3).toISOString();
const runs = [
  { id: 1, status: 'queued', created_at: '2026-11-03T21:25:23Z' },   // zombie cũ, 0 job
  { id: 2, status: 'queued', created_at: ago(31) },                  // vừa quá ngưỡng, 0 job → zombie
  { id: 3, status: 'queued', created_at: ago(29) },                  // 0 job nhưng còn mới (đang khởi tạo) → giữ
  { id: 4, status: 'queued', created_at: ago(600) },                 // xếp hàng thật (có job) → giữ
  { id: 5, status: 'in_progress', created_at: ago(900) },            // không phải queued → giữ
];
const jobs = { 4: [{ status: 'queued' }] };
assert.deepEqual((await findZombies(runs, async id => jobs[id] || [], now)).map(r => r.id), [1, 2]);
assert.equal(MIN_AGE_MIN, 30);
const wf = readFileSync(new URL('../../.github/workflows/zombie-sweep.yml', import.meta.url), 'utf8');
assert.ok(/schedule:/.test(wf) && !/workflow_run:/.test(wf) && /actions: write/.test(wf) && /--dry/.test(wf), 'workflow: schedule, không workflow_run, quyền huỷ, PR chỉ --dry');
console.log('✓ zombie-sweep: chọn đúng lượt queued 0 job quá 30 phút; workflow đúng quyền');

// 26/11 chạy lại: created_at giữ của lượt gốc, run_started_at = attempt hiện tại → tuổi theo run_started_at, rerun vừa xếp hàng (0 job) không bị coi zombie
{ const rerun = { id: 9, status: 'queued', created_at: ago(900), run_started_at: ago(2) };
  assert.equal((await findZombies([rerun], async () => [], now)).length, 0, 'zombie-sweep: rerun mới (run_started_at 2 phút) không bị huỷ');
  assert.equal((await findZombies([{ ...rerun, run_started_at: ago(MIN_AGE_MIN + 1) }], async () => [], now)).length, 1, 'zombie-sweep: rerun 0 job quá hạn theo run_started_at vẫn là zombie');
  assert.ok(!isZombie({ status: 'queued', path: '.github/workflows/npm-test.yml', created_at: ago(900), run_started_at: ago(2) }, now) && isZombie({ status: 'queued', path: '.github/workflows/npm-test.yml', created_at: ago(900) }, now), 'zombie.mjs: isZombie theo run_started_at, thiếu thì created_at'); }
