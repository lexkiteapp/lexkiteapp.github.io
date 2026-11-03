// Test required-gate: hàm đánh giá thuần (xanh/đỏ/chờ, bỏ chính mình, lượt mới nhất thắng), nhận diện workflow chạy trên PR,
// gác hồi quy workflow (bộ canh, không workflow_run), chọn sha cần đánh giá, và luồng --sha/--sweep/--watch với API giả (không mạng).
// Chạy: node scripts/test/required-gate.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluate, prCapable, checkWorkflow, dirtyShas, run, CONTEXT, SELF_JOB, SELF_PATH } from '../ci/required-gate.mjs';
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

// ---------- 3) workflow: bộ canh lịch, không quay lại ~20 runner/commit (3/11) ----------
{
  const y = fs.readFileSync(new URL('../../.github/workflows/required-gate.yml', import.meta.url), 'utf8');
  ok(checkWorkflow(y).length === 0, 'required-gate.yml đạt checkWorkflow: ' + checkWorkflow(y).join('; '));
  ok(checkWorkflow(y.replace('on:\n', "on:\n  workflow_run:\n    types: [completed]\n    workflows: ['npm test']\n")).some(v => /workflow_run/.test(v)), 'hồi quy: thêm lại workflow_run → lỗi');
  ok(checkWorkflow(y.replace('on:\n', 'on:\n  check_suite:\n    types: [completed]\n')).some(v => /check_suite/.test(v)), 'hồi quy: thêm lại check_suite → lỗi');
  ok(checkWorkflow(y.replace('on:\n', 'on:\n  pull_request:\n')).some(v => /pull_request/.test(v)), 'hồi quy: thêm pull_request (1 runner/commit) → lỗi');
  ok(checkWorkflow(y.replace('cancel-in-progress: false', 'cancel-in-progress: true')).length === 1, 'huỷ lượt đang canh → lỗi');
  ok(checkWorkflow(y.replace('--watch 54', '--sweep')).some(v => /--watch/.test(v)), 'thiếu --watch → lỗi');
  ok(!/^\s*paths(-ignore)?:/m.test(y.split('\njobs:')[0]), 'không paths-filter');
  const watch = +(y.match(/--watch (\d+)/) || [])[1], tmo = +(y.match(/timeout-minutes: (\d+)/) || [])[1], crons = (y.match(/cron: '([\d,]+) \* \* \* \*'/) || [, ''])[1].split(',').length;
  ok(watch < tmo && watch >= 60 / crons, `canh ${watch} phút < timeout ${tmo}, ≥ khoảng cách lịch ${60 / crons} phút (nối tiếp không hở)`);
  ok(/group: required-gate-\$\{\{ inputs\.pr \|\| 'watch' \}\}/.test(y), 'dispatch theo PR nhóm riêng, không xếp sau bộ canh');
  ok(/statuses: write/.test(y) && !/contents: write/.test(y) && !/ref: \$\{\{/.test(y), 'quyền tối thiểu, không checkout mã PR');
  ok(new RegExp(`name: ${SELF_JOB}\\n`).test(y), `tên job = ${SELF_JOB}`);
  const pp = fs.readFileSync(new URL('../prepush.sh', import.meta.url), 'utf8');
  ok(/required-gate\.mjs --check/.test(pp), 'prepush chạy --check');
}
// chọn sha cần đánh giá (dirtyShas)
{
  const R = (head_sha, status, conclusion, updated_at, name = 'w') => ({ head_sha, status, conclusion, updated_at: new Date(updated_at).toISOString(), name, path: `.github/workflows/${name}.yml` });
  const seen = new Map([['a', { at: 1000e3, state: 'pending' }], ['b', { at: 1000e3, state: 'success' }], ['c', { at: 1000e3, state: 'pending' }], ['d', { at: 1000e3, state: 'pending' }]]);
  const d = (runs, now = 1001e3, shas = ['a', 'b', 'c', 'd', 'n']) => dirtyShas({ shas, runs, seen, now });
  ok(d([]).join() === 'n', 'không đổi gì → chỉ sha mới');
  ok(!d([R('a', 'completed', 'success', 1001e3), R('a', 'in_progress', null, 900e3, 'x')]).includes('a'), 'pending + lượt khác của sha còn chạy + lượt vừa xong xanh → bỏ qua (gate chỉ có thể vẫn pending)');
  ok(d([R('a', 'completed', 'failure', 1001e3), R('a', 'in_progress', null, 900e3, 'x')]).includes('a'), 'lượt vừa xong ĐỎ → đánh giá ngay dù còn lượt chạy');
  ok(d([R('a', 'completed', 'success', 1001e3), R('a', 'completed', 'success', 900e3, 'x')]).includes('a'), 'lượt cuối của sha xong → đánh giá (lên xanh)');
  ok(d([R('b', 'queued', null, 1001e3)]).includes('b'), 'gate xanh nhưng có lượt chạy lại mới → đánh giá (về pending)');
  ok(!d([R('c', 'completed', 'success', 999e3)]).includes('c'), 'lượt cũ hơn lần đọc trước không tính');
  ok(d([], 1000e3 + 10 * 60e3).includes('d') && !d([], 1000e3 + 10 * 60e3).includes('b'), 'pending lâu không đổi (status/app ngoài) → đánh giá lại sau 10 phút; xanh thì không');
  ok(!d([{ ...R('a', 'completed', 'failure', 1001e3), path: SELF_PATH }]).includes('a'), 'lượt của chính required-gate không tính');
  ok(d([]).length === 1 && !d([], 1001e3, ['a']).length, 'sha không còn là head PR thì không đánh giá');
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

// bộ canh --watch: mô phỏng 1 PR qua nhiều vòng – số lần đánh giá ít, đỏ ngay, xanh khi lượt cuối xong, không đăng lặp
{
  let t = 0; const clock = { now: () => t, sleep: async ms => { t += ms; } };
  const posted = [], gathers = [];
  const runsAt = [   // [từ ms, danh sách lượt chạy của sha h1]
    [0, [{ head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'A' }, { head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'B' }, { head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'C' }]],
    [60e3, [{ head_sha: 'h1', status: 'completed', conclusion: 'success', updated_at: 50e3, n: 'A' }, { head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'B' }, { head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'C' }]],
    [120e3, [{ head_sha: 'h1', status: 'completed', conclusion: 'success', updated_at: 50e3, n: 'A' }, { head_sha: 'h1', status: 'completed', conclusion: 'success', updated_at: 110e3, n: 'B' }, { head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'C' }]],
    [180e3, [{ head_sha: 'h1', status: 'completed', conclusion: 'success', updated_at: 50e3, n: 'A' }, { head_sha: 'h1', status: 'completed', conclusion: 'success', updated_at: 110e3, n: 'B' }, { head_sha: 'h1', status: 'completed', conclusion: 'success', updated_at: 170e3, n: 'C' }]],
  ];
  const cur = () => runsAt.filter(([f]) => t >= f).pop()[1].map(r => ({ ...r, name: r.n, workflow_id: r.n, run_number: 1, path: `.github/workflows/${r.n}.yml`, updated_at: new Date(r.updated_at).toISOString() }));
  const A = {
    openPrs: async () => [{ number: 9, head: { sha: 'h1' }, updated_at: new Date(Date.now()).toISOString() }],
    gateState: async () => undefined,
    recentRuns: async () => cur(),
    gather: async sha => { gathers.push(t); return { workflowRuns: cur().filter(r => r.head_sha === sha) }; },
    post: async (sha, r) => posted.push(r.state),
  };
  await run(['--watch', '6'], {}, A, () => {}, clock);
  ok(posted.join() === 'pending,success', 'bộ canh: pending rồi xanh khi lượt cuối xong, không đăng lặp: ' + posted.join());
  ok(gathers.length <= 3, `bộ canh: ≤ 3 lần đánh giá cho 3 workflow trong 6 phút (cũ: 1 runner mỗi workflow xong + mỗi check_suite) – thực tế ${gathers.length}`);
  // commit mới chưa kịp có lượt chạy nào → không xanh sớm; workflow xuất hiện sau đó → pending; không có workflow nào → xanh sau 90 s
  {
    let t2 = 0, runs2 = [], p2 = [];
    const B = { openPrs: async () => (t2 >= 30e3 ? [{ number: 5, head: { sha: 'n1' }, updated_at: new Date(t2).toISOString() }] : []), gateState: async () => undefined,
      recentRuns: async () => runs2, gather: async () => ({ workflowRuns: runs2 }), post: async (sha, r) => p2.push(r.state + ':' + Math.round(t2 / 1e3)) };
    await run(['--watch', '4'], {}, B, () => {}, { now: () => t2, sleep: async ms => { t2 += ms; } });
    ok(p2[0] === 'pending:60' && p2.at(-1).startsWith('success:') && +p2.at(-1).split(':')[1] >= 150, 'commit mới không có check: pending trước, xanh sau ≥ 90 s: ' + p2.join());
  }
  // đỏ: lượt hỏng → đỏ ở vòng kế tiếp dù lượt khác còn chạy
  t = 0; posted.length = 0;
  runsAt.splice(1, 3, [60e3, [{ head_sha: 'h1', status: 'completed', conclusion: 'failure', updated_at: 50e3, n: 'A' }, { head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'B' }]]);
  await run(['--watch', '3'], {}, A, () => {}, clock);
  ok(posted.join() === 'pending,failure', 'bộ canh: lượt đỏ → đỏ ngay ở vòng sau: ' + posted.join());
  // hạn mức API sắp hết → giãn vòng tới lúc đặt lại
  t = 0; const sl = []; const A2 = { ...A, rate: { remaining: 10, reset: 600e3 } };
  await run(['--watch', '30', '--dry'], {}, A2, () => {}, { now: () => t, sleep: async ms => { sl.push(ms); t += ms; } });
  ok(sl[0] >= 600e3 - 1, 'hạn mức < 150 → chờ tới lúc đặt lại: ' + sl[0]);
}

console.log(fails ? `✗ required-gate: ${fails}/${n} lỗi` : `✓ required-gate: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
