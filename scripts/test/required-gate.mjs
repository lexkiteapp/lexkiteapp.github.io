// Test required-gate: hàm đánh giá thuần (xanh/đỏ/chờ, bỏ chính mình, lượt mới nhất thắng), nhận diện workflow chạy trên PR,
// danh sách workflow_run khớp .github/workflows, và luồng --sha/--sweep với API giả (không mạng).
// Chạy: node scripts/test/required-gate.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluate, prCapable, sync, run, CONTEXT, SELF_JOB, SELF_PATH } from '../ci/required-gate.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const cr = (name, status, conclusion, id = 1) => ({ name, status, conclusion, id });
const wr = (name, status, conclusion, run_number = 1, extra = {}) => ({ name, status, conclusion, run_number, workflow_id: name, path: `.github/workflows/${name}.yml`, ...extra });
const st = (context, state, updated_at = '2026-11-01T00:00:00Z') => ({ context, state, updated_at });

// ---------- 1) đánh giá ----------
ok(evaluate({}).state === 'success', 'không có check nào → xanh');
{
  const r = evaluate({ checkRuns: [cr('npm test', 'completed', 'success'), cr('lint', 'completed', 'skipped'), cr('x', 'completed', 'neutral')], statuses: [st('ext', 'success')], workflowRuns: [wr('npm test', 'completed', 'success')] });
  ok(r.state === 'success' && r.total === 5, 'success/skipped/neutral + status success → xanh ' + JSON.stringify(r));
}
for (const c of ['failure', 'timed_out', 'cancelled', 'startup_failure', 'stale']) {
  const r = evaluate({ checkRuns: [cr('npm test', 'completed', 'success'), cr('perf', 'completed', c)] });
  ok(r.state === 'failure' && r.failed[0] === `perf (${c})`, `${c} → đỏ`);
}
ok(evaluate({ statuses: [st('ci/ext', 'failure')] }).state === 'failure', 'status failure → đỏ');
ok(evaluate({ statuses: [st('ci/ext', 'error')] }).state === 'failure', 'status error → đỏ');
ok(evaluate({ statuses: [st('ci/ext', 'pending')] }).state === 'pending', 'status pending → chờ');
for (const s of ['queued', 'in_progress', 'waiting', 'requested', 'pending']) ok(evaluate({ checkRuns: [cr('npm test', s, null)] }).state === 'pending', `check-run ${s} → chờ`);
ok(evaluate({ workflowRuns: [wr('npm test', 'queued', null)] }).state === 'pending', 'workflow run queued (chưa có job/check-run) → chờ');
ok(evaluate({ checkRuns: [cr('fork', 'completed', 'action_required')] }).state === 'pending', 'action_required (PR fork chờ duyệt) → chờ, không đỏ');
{
  const r = evaluate({ checkRuns: [cr('a', 'completed', 'failure'), cr('b', 'in_progress', null)] });
  ok(r.state === 'failure', 'có đỏ + có đang chạy → đỏ ngay (không chờ)');
}
// bỏ chính mình
ok(evaluate({ checkRuns: [cr(SELF_JOB, 'in_progress', null)], statuses: [st(CONTEXT, 'pending')], workflowRuns: [{ ...wr('required-gate', 'in_progress', null), path: SELF_PATH }] }).state === 'success', 'bỏ job/status/workflow của chính required-gate');
ok(evaluate({ statuses: [st(CONTEXT, 'failure')] }).state === 'success', 'status required-gate cũ đỏ không tự kéo đỏ');
// lượt mới nhất thắng
ok(evaluate({ checkRuns: [cr('npm test', 'completed', 'failure', 1), cr('npm test', 'completed', 'success', 2)] }).state === 'success', 'check-run chạy lại xanh (id lớn hơn) thắng lượt đỏ cũ');
ok(evaluate({ checkRuns: [cr('npm test', 'completed', 'success', 2), cr('npm test', 'completed', 'failure', 1)] }).state === 'success', 'thứ tự mảng không ảnh hưởng');
ok(evaluate({ workflowRuns: [wr('perf', 'completed', 'cancelled', 1), wr('perf', 'completed', 'success', 2)] }).state === 'success', 'lượt workflow cũ bị hủy (concurrency) không tính khi lượt mới xanh');
ok(evaluate({ workflowRuns: [wr('perf', 'queued', null, 1), wr('perf', 'completed', 'success', 2)] }).state === 'success', 'lượt "ma" queued cũ không giữ gate chờ mãi');
ok(evaluate({ statuses: [st('ext', 'failure', '2026-11-01T00:00:00Z'), st('ext', 'success', '2026-11-01T01:00:00Z')] }).state === 'success', 'status mới nhất theo context thắng');
{
  const many = Array.from({ length: 30 }, (_, i) => cr('check-có-tên-khá-dài-số-' + i, 'completed', 'failure', i));
  const r = evaluate({ checkRuns: many });
  ok(r.description.length <= 140 && / \+\d+$/.test(r.description), 'mô tả ≤ 140 ký tự, rút gọn danh sách: ' + r.description);
}

// ---------- 2) nhận diện workflow chạy trên head PR ----------
ok(prCapable('name: a\non:\n  pull_request:\n    branches: [main]\njobs: {}\n'), 'pull_request → có');
ok(prCapable('name: a\non:\n  pull_request_target:\njobs: {}\n'), 'pull_request_target → có');
ok(prCapable('name: a\non: [push, pull_request]\njobs: {}\n'), 'on: [push, pull_request] → có');
ok(prCapable('name: a\non:\n  push:\n    branches: [main, \'dict-perf*\']\njobs: {}\n'), 'push nhánh khác main → có');
ok(prCapable('name: a\non:\n  push:\n    paths: [x]\njobs: {}\n'), 'push không lọc nhánh → có');
ok(!prCapable('name: a\non:\n  push:\n    branches: [main]\n  schedule:\n    - cron: \'0 0 * * *\'\njobs: {}\n'), 'chỉ push main + lịch → không');
ok(!prCapable('name: a\non:\n  schedule:\n    - cron: \'0 0 * * *\'\n  workflow_dispatch:\njobs:\n  x:\n    if: github.event_name == \'pull_request\'\n'), 'chữ pull_request ngoài khối on: không tính');
ok(!prCapable('name: a\non:\n  workflow_run:\n    workflows: [b]\njobs: {}\n'), 'workflow_run → không');

// ---------- 3) danh sách workflow_run khớp repo (2 chiều; sửa: node scripts/ci/required-gate.mjs --sync) ----------
{ const d = sync(false); ok(!d.missing.length && !d.stale.length, `required-gate.yml lệch .github/workflows (thiếu: ${d.missing.join(', ') || '-'}; thừa: ${d.stale.join(', ') || '-'}) → chạy: node scripts/ci/required-gate.mjs --sync`); }
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'rgate-'));
  fs.writeFileSync(path.join(tmp, 'a.yml'), 'name: A\non:\n  pull_request:\njobs: {}\n');
  fs.writeFileSync(path.join(tmp, 'b.yml'), 'name: B\non:\n  schedule:\n    - cron: \'0 0 * * *\'\njobs: {}\n');
  fs.writeFileSync(path.join(tmp, 'ci-triage.yml'), 'name: ci-triage\non:\n  pull_request:\njobs: {}\n');
  const g = path.join(tmp, 'required-gate.yml');
  fs.writeFileSync(g, "name: required-gate\non:\n  pull_request:\n  workflow_run:\n    types: [completed]\n    workflows:\n      - 'Old'\n  schedule:\n    - cron: '17,47 * * * *'\njobs: {}\n");
  const d = sync(true, g, tmp);
  ok(d.missing.join() === 'A' && d.stale.join() === 'Old' && /workflows:\n      - 'A'\n  schedule:/.test(fs.readFileSync(g, 'utf8')), '--sync: thêm A, bỏ Old, không tự liệt kê chính nó / ci-triage / workflow chỉ lịch');
  fs.rmSync(tmp, { recursive: true, force: true });
}
{
  const y = fs.readFileSync(new URL('../../.github/workflows/required-gate.yml', import.meta.url), 'utf8');
  ok(!/^\s*paths(-ignore)?:/m.test(y.split('\njobs:')[0]), 'không paths-filter (gate phải báo trên mọi PR)');
  ok(/timeout-minutes: [1-3]\n/.test(y) && /cancel-in-progress: true/.test(y), 'job ngắn (timeout ≤ 3) + concurrency hủy lượt cũ theo sha');
  ok(/statuses: write/.test(y) && !/contents: write/.test(y), 'quyền tối thiểu: statuses write, không ghi mã');
  ok(/head\.repo\.full_name == github\.repository/.test(y) && !/ref: \$\{\{ github\.event\.workflow_run/.test(y), 'PR fork: không checkout mã PR, job pull_request chỉ cho PR cùng repo');
  ok(new RegExp(`name: ${SELF_JOB}\\n`).test(y), `tên job = ${SELF_JOB} (để tự loại khỏi đánh giá)`);
}

// ---------- 4) luồng CLI với API giả ----------
{
  const posted = [];
  const fake = (data, gates = {}) => ({
    gather: async sha => data[sha],
    post: async (sha, r) => posted.push([sha, r.state]),
    pr: async num => ({ head: { sha: 'p' + num } }),
    openPrs: async () => [{ number: 1, head: { sha: 's1' }, updated_at: new Date().toISOString() }, { number: 2, head: { sha: 's2' }, updated_at: new Date().toISOString() }, { number: 3, head: { sha: 's3' }, updated_at: '2020-01-01T00:00:00Z' }],
    gateState: async sha => gates[sha],
  });
  const data = { s1: { checkRuns: [cr('t', 'completed', 'success')] }, s2: { checkRuns: [cr('t', 'completed', 'failure')] }, s3: {}, p7: { checkRuns: [cr('t', 'in_progress', null)] } };
  const quiet = () => {};
  await run(['--sha', 's2'], {}, fake(data), quiet);
  ok(posted.pop().join() === 's2,failure', '--sha: đăng failure');
  await run(['--pr', '7'], {}, fake(data), quiet);
  ok(posted.pop().join() === 'p7,pending', '--pr: lấy head PR, đăng pending');
  await run(['--sha', 's1', '--dry'], {}, fake(data), quiet);
  ok(!posted.length, '--dry: không đăng');
  await run(['--sweep'], {}, fake(data, { s1: { state: 'pending' }, s2: { state: 'success' } }), quiet);
  ok(JSON.stringify(posted) === '[["s1","success"]]', '--sweep: chỉ PR gate pending/thiếu và cập nhật ≤ 14 ngày ' + JSON.stringify(posted));
}

console.log(fails ? `✗ required-gate: ${fails}/${n} lỗi` : `✓ required-gate: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
