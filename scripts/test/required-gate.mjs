// Test required-gate: hàm đánh giá thuần (xanh/đỏ/chờ, bỏ chính mình, lượt mới nhất thắng), nhận diện workflow chạy trên PR,
// gác hồi quy workflow (bộ canh, không workflow_run), chọn sha cần đánh giá, và luồng --sha/--sweep/--watch với API giả (không mạng).
// Chạy: node scripts/test/required-gate.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { api, evaluate, gateDrift, applyDrift, applyWindow, gateFilesOf, inMergeWindow, rerunCancelled, MAX_AUTO_RERUN, prCapable, checkWorkflow, dirtyShas, run, paceDue, PACED, chainAlive, CHAIN_CHECK_MS, CHAIN_RETRIES, CONTEXT, SELF_JOB, SELF_PATH } from '../ci/required-gate.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const cr = (name, status, conclusion, id = 1) => ({ name, status, conclusion, id });
const wr = (name, status, conclusion, run_number = 1, extra = {}) => ({ name, status, conclusion, run_number, workflow_id: name, path: `.github/workflows/${name}.yml`, ...extra });
const st = (context, state, updated_at = '2026-11-01T00:00:00Z') => ({ context, state, updated_at });

// ---------- 1) đánh giá ----------
ok(evaluate({ checkRuns: [{ name: 'npm test', status: 'in_progress', conclusion: 'success', completed_at: '2026-11-16T07:49:05Z' }] }).state === 'success', 'check ma: in_progress nhưng đã có conclusion+completed_at → xong (#1448 treo 1h20)');
ok(evaluate({ checkRuns: [{ name: 'npm test', status: 'in_progress', conclusion: 'success' }, cr('lint', 'completed', 'success')] }).state === 'pending', 'in_progress chưa có completed_at → vẫn CHỜ');
ok(evaluate({}).state === 'pending', 'không có check nào → CHỜ (CI chưa chạy), không xanh');
ok(evaluate({ workflowRuns: [wr('report-autofix', 'completed', 'skipped')] }).state === 'pending', 'chỉ có lượt skipped → CHỜ, không xanh (sự cố #584 ngày 05/11)');
ok(evaluate({ checkRuns: [cr('lint', 'completed', 'neutral')] }).state === 'pending', 'chỉ neutral → CHỜ, không xanh');
{
  const r = evaluate({ checkRuns: [cr('npm test', 'completed', 'success'), cr('lint', 'completed', 'skipped'), cr('x', 'completed', 'neutral')], statuses: [st('ext', 'success')], workflowRuns: [wr('npm test', 'completed', 'success')] });
  ok(r.state === 'success' && r.total === 5, 'success/skipped/neutral + status success → xanh ' + JSON.stringify(r));
}
for (const c of ['failure', 'timed_out', 'cancelled', 'startup_failure', 'stale']) {
  const r = evaluate({ checkRuns: [cr('npm test', 'completed', 'success'), cr('perf', 'completed', c)] });
  ok(r.state === 'failure' && r.failed[0] === `perf (${c})`, `${c} → đỏ`);
}

// ---------- 1b) lượt workflow bị huỷ (15/11): chờ + tự chạy lại, không đỏ oan; quá số lần cho phép / lỗi thật vẫn đỏ ----------
{
  const c1 = wr('teach-video', 'completed', 'cancelled', 5, { id: 777, run_attempt: 1 });
  const r = evaluate({ checkRuns: [cr('npm test', 'completed', 'success'), cr('preqc', 'completed', 'cancelled', 2)], workflowRuns: [c1, wr('npm-test', 'completed', 'success', 3)] });
  ok(r.state === 'pending' && r.failed.length === 0 && r.cancelled.length === 1 && r.cancelled[0].runId === 777, 'lượt workflow mới nhất bị huỷ → CHỜ + yêu cầu chạy lại ' + JSON.stringify(r));
  ok(/huỷ/.test(r.description), 'mô tả nói rõ đang chờ chạy lại: ' + r.description);
  const r2 = evaluate({ checkRuns: [cr('preqc', 'completed', 'cancelled', 2)], workflowRuns: [wr('teach-video', 'completed', 'cancelled', 5, { id: 777, run_attempt: MAX_AUTO_RERUN + 1 }), wr('npm-test', 'completed', 'success', 3)] });
  ok(r2.state === 'failure' && r2.cancelled.length === 0, 'huỷ quá ' + MAX_AUTO_RERUN + ' lần chạy lại → đỏ');
  const r3 = evaluate({ workflowRuns: [wr('teach-video', 'completed', 'cancelled', 5, { id: 777, run_attempt: 1 }), wr('npm-test', 'completed', 'failure', 3, { id: 9 })] });
  ok(r3.state === 'failure' && r3.failed.some(x => x.startsWith('workflow: npm-test')), 'lỗi thật cùng sha vẫn đỏ dù có lượt huỷ chờ chạy lại');
  const r4 = evaluate({ workflowRuns: [wr('teach-video', 'completed', 'cancelled', 5, { id: 777, run_attempt: 1 }), wr('teach-video', 'completed', 'success', 6, { id: 778 }), wr('npm-test', 'completed', 'success', 3)] });
  ok(r4.state === 'success' && r4.cancelled.length === 0, 'có lượt mới hơn cùng workflow → lượt huỷ cũ bị bỏ qua, không chạy lại');
  const calls = [], A = { rerun: async id => { calls.push(id); } }, done = new Set();
  await rerunCancelled(A, r, done, () => {}); await rerunCancelled(A, r, done, () => {});
  ok(calls.length === 1 && calls[0] === 777, 'chạy lại đúng 1 lần mỗi (lượt, lần) – không dội API: ' + calls);
  await rerunCancelled({ rerun: async () => { throw new Error('403'); } }, { cancelled: [{ runId: 5, attempt: 1, name: 'x' }] }, new Set(), () => {});
  ok(true, 'lỗi API khi chạy lại không làm sập bộ canh');
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
ok(evaluate({ checkRuns: [cr(SELF_JOB, 'in_progress', null), cr('npm test', 'completed', 'success')], statuses: [st(CONTEXT, 'pending')], workflowRuns: [{ ...wr('required-gate', 'in_progress', null), path: SELF_PATH }] }).state === 'success', 'bỏ job/status/workflow của chính required-gate');
ok(evaluate({ statuses: [st(CONTEXT, 'failure'), st('ci/ext', 'success')] }).state === 'success', 'status required-gate cũ đỏ không tự kéo đỏ');
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

// 16/11: job bị huỷ của lượt cũ (concurrency nhường lượt) khi lượt MỚI đang chạy → CHỜ, không đỏ (#1427, #1475: Stitch diff)
{
  const stitchNew = wr('Stitch diff', 'in_progress', null, 9, { id: 900 });
  const a = evaluate({ checkRuns: [cr('npm test', 'completed', 'success'), cr('diff', 'completed', 'cancelled', 5)], workflowRuns: [stitchNew] });
  ok(a.state === 'pending' && a.failed.length === 0 && /diff \(huỷ – chờ lượt mới\)/.test(a.description), 'job bị huỷ + lượt workflow mới đang chạy → CHỜ lượt mới: ' + a.description);
  const b = evaluate({ checkRuns: [cr('npm test', 'completed', 'success'), cr('diff', 'completed', 'cancelled', 5)], workflowRuns: [wr('Stitch diff', 'completed', 'success', 9, { id: 900 })] });
  ok(b.state === 'failure' && b.failed.some(x => x.startsWith('diff')), 'huỷ mà KHÔNG còn lượt nào chạy (lượt mới đã xong) → vẫn đỏ, không giấu');
  const c = evaluate({ checkRuns: [cr('npm test', 'completed', 'success')], workflowRuns: [wr('Stitch diff', 'completed', 'cancelled', 9, { id: 900, run_attempt: MAX_AUTO_RERUN })] });
  ok(c.state === 'pending' && c.cancelled.length === 1, 'workflow huỷ ở lần chạy lại thứ ' + MAX_AUTO_RERUN + ' vẫn được chạy lại (cap nâng 2→4)');
}
// 16/11: wip-guard startup_failure (GitHub brownout pull_request_target) là lỗi hạ tầng, không chặn PR xanh
{
  const wr2 = (name, conclusion, id = 1) => ({ name, path: `.github/workflows/${name}.yml`, workflow_id: id, status: 'completed', conclusion, run_number: 1, id, run_attempt: 1 });
  const base = [cr('npm test', 'completed', 'success')];
  const g = evaluate({ checkRuns: base, workflowRuns: [wr2('wip-guard', 'startup_failure', 7), wr2('npm test', 'success', 8)] });
  ok(g.state === 'success' && g.infra.join() === 'wip-guard' && /bỏ qua wip-guard/.test(g.description) && g.description.length <= 140, 'wip-guard startup_failure → xanh, ghi chú hạ tầng: ' + g.description);
  ok(evaluate({ checkRuns: base, workflowRuns: [wr2('wip-guard', 'failure', 7)] }).state === 'failure', 'wip-guard FAILURE thật vẫn đỏ');
  ok(evaluate({ checkRuns: base, workflowRuns: [wr2('npm test', 'startup_failure', 8)] }).state === 'failure', 'workflow KHÁC startup_failure vẫn đỏ (không bỏ qua bừa)');
  ok(evaluate({ workflowRuns: [wr2('wip-guard', 'startup_failure', 7)] }).state === 'pending', 'chỉ có wip-guard hỏng, chưa có check thật nào → vẫn CHỜ, không xanh');
  ok(evaluate({ checkRuns: base, workflowRuns: [wr2('gate-impact', 'cancelled', 7), wr2('npm test', 'success', 8)] }).state === 'success', 'gate-impact cancelled (concurrency) = tư vấn → không đỏ');
  ok(evaluate({ checkRuns: base, workflowRuns: [wr2('gate-impact', 'failure', 7), wr2('npm test', 'success', 8)] }).state === 'failure', 'gate-impact failure thật vẫn đỏ');
}

// ---------- 3) workflow: bộ canh lịch, không quay lại ~20 runner/commit (3/11) ----------
{
  const y = fs.readFileSync(new URL('../../.github/workflows/required-gate.yml', import.meta.url), 'utf8');
  ok(checkWorkflow(y).length === 0, 'required-gate.yml đạt checkWorkflow: ' + checkWorkflow(y).join('; '));
  ok(checkWorkflow(y.replace('on:\n', "on:\n  workflow_run:\n    types: [completed]\n    workflows: ['npm test']\n")).some(v => /workflow_run/.test(v)), 'hồi quy: thêm lại workflow_run → lỗi');
  ok(checkWorkflow(y.replace('on:\n', 'on:\n  check_suite:\n    types: [completed]\n')).some(v => /check_suite/.test(v)), 'hồi quy: thêm lại check_suite → lỗi');
  ok(checkWorkflow(y.replace('on:\n', 'on:\n  pull_request:\n')).some(v => /pull_request/.test(v)), 'hồi quy: thêm pull_request (1 runner/commit) → lỗi');
  ok(checkWorkflow(y.replace('cancel-in-progress: false', 'cancel-in-progress: true')).length === 1, 'huỷ lượt đang canh → lỗi');
  ok(checkWorkflow(y.replace('--watch 54', '--sweep')).some(v => /--watch/.test(v)), 'thiếu --watch → lỗi');
  ok(checkWorkflow(y.replace("CRON_WATCH: '1'", "CRON_WATCH: '0'")).some(v => /canh lịch cron/.test(v)), 'bỏ canh lịch cron độc lập → lỗi (hồi quy 02/11)');
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
  // commit mới chưa kịp có lượt chạy nào → không xanh sớm; workflow xuất hiện sau đó → pending; không có workflow nào → vẫn chờ (05/11)
  {
    let t2 = 0, runs2 = [], p2 = [];
    const B = { openPrs: async () => (t2 >= 30e3 ? [{ number: 5, head: { sha: 'n1' }, updated_at: new Date(t2).toISOString() }] : []), gateState: async () => undefined,
      recentRuns: async () => runs2, gather: async () => ({ workflowRuns: runs2 }), post: async (sha, r) => p2.push(r.state + ':' + Math.round(t2 / 1e3)) };
    await run(['--watch', '4'], {}, B, () => {}, { now: () => t2, sleep: async ms => { t2 += ms; } });
    // 05/11: npm-test chạy trên MỌI PR (all-paths) → head PR không có check nào = CI chưa kích, KHÔNG BAO GIỜ xanh (sự cố #584)
    ok(p2[0] === 'pending:60' && !p2.some((x) => x.startsWith('success')), 'commit mới không có check: chờ, không bao giờ tự xanh: ' + p2.join());
  }
  // đỏ: lượt hỏng → đỏ ở vòng kế tiếp dù lượt khác còn chạy
  t = 0; posted.length = 0;
  runsAt.splice(1, 3, [60e3, [{ head_sha: 'h1', status: 'completed', conclusion: 'failure', updated_at: 50e3, n: 'A' }, { head_sha: 'h1', status: 'in_progress', updated_at: 0, n: 'B' }]]);
  await run(['--watch', '3'], {}, A, () => {}, clock);
  ok(posted.join() === 'pending,failure', 'bộ canh: lượt đỏ → đỏ ngay ở vòng sau: ' + posted.join());
  // tự nối: đúng 1 lần dispatch khi còn ≤ 6 phút (không phụ thuộc cron); --dry hoặc thiếu GATE_CHAIN_REF thì không
  {
    const disp = []; t = 0;
    await run(['--watch', '20'], { GATE_CHAIN_REF: 'main' }, { ...A, dispatchSelf: async ref => disp.push([ref, t]) }, () => {}, clock);
    ok(disp.length === 1 && disp[0][0] === 'main' && disp[0][1] >= 14 * 60e3 && disp[0][1] < 20 * 60e3, 'tự nối: 1 dispatch khi còn ≤ 6 phút: ' + JSON.stringify(disp));
    // nhịp ci-filler/d1-usage-watch: đúng khoảng lịch, không chồng lượt đang chạy, lượt zombie không chặn, --dry và lỗi API không làm hỏng bộ canh
    const N = Date.parse('2026-11-03T23:00:00Z'), ago = m => new Date(N - m * 6e4).toISOString();
    ok(paceDue(null, 10, N) && paceDue({ status: 'completed', created_at: ago(11) }, 10, N) && !paceDue({ status: 'completed', created_at: ago(5) }, 10, N), 'nhịp: quá khoảng mới dispatch');
    ok(!paceDue({ status: 'in_progress', created_at: ago(30) }, 10, N) && !paceDue({ status: 'queued', created_at: ago(30) }, 10, N) && paceDue({ status: 'queued', created_at: ago(500) }, 10, N), 'nhịp: đang chạy thì chờ, zombie thì không');
    { const sent = [], lastAt = {}; t = 0;
      const P = { ...A, dispatchSelf: async () => {}, lastRun: async f => (lastAt[f] === undefined ? null : { status: 'completed', created_at: new Date(lastAt[f]).toISOString() }), dispatchFile: async (f, ref) => { sent.push(f); lastAt[f] = t; ok(ref === 'main', 'nhịp dispatch đúng nhánh'); } };
      await run(['--watch', '25'], { GATE_CHAIN_REF: 'main' }, P, () => {}, clock);
      ok(sent.filter(f => f === 'ci-filler.yml').length === 3 && sent.filter(f => f === 'd1-usage-watch.yml').length === 2, 'nhịp 25 phút: ci-filler 3 lần, d1-usage-watch 2 lần: ' + sent.join());
      ok(PACED['ci-filler.yml'] === 10, 'ci-filler 10 phút');
      t = 0; const dry = []; await run(['--watch', '25', '--dry'], { GATE_CHAIN_REF: 'main' }, { ...P, dispatchFile: async f => dry.push(f) }, () => {}, clock); ok(!dry.length, '--dry không làm nhịp');
      t = 0; const lg = []; await run(['--watch', '5'], { GATE_CHAIN_REF: 'main' }, { ...P, lastRun: async () => { throw new Error('502'); } }, m => lg.push(m), clock); ok(lg.some(m => /nhịp .*502/.test(m)), 'lỗi API nhịp: cảnh báo, bộ canh vẫn chạy'); }
    // lượt tự nối kẹt queued (3/11 07:48Z, 21:25Z): dispatch lại; 'pending' (chờ concurrency) là khoẻ
    ok(chainAlive([{ status: 'pending', created_at: new Date(1e6).toISOString() }], 1e6) && !chainAlive([{ status: 'queued', created_at: new Date(1e6).toISOString() }], 1e6) && !chainAlive([{ status: 'completed', created_at: new Date(1).toISOString() }], 1e6), 'chainAlive: pending sống, queued kẹt, lượt cũ không tính');
    { const go = async st => { const d = []; t = 0; const lg = []; await run(['--watch', '20'], { GATE_CHAIN_REF: 'main' }, { ...A, dispatchSelf: async () => d.push(t), dispatchRuns: async () => d.map(x => ({ status: st, created_at: new Date(x).toISOString() })) }, m => lg.push(m), clock); return { d, lg }; };
      const a = await go('pending'); ok(a.d.length === 1 && a.lg.some(m => /đã sống/.test(m)), 'lượt nối pending: không dispatch lại: ' + a.d.length);
      const b = await go('queued'); ok(b.d.length === 1 + CHAIN_RETRIES && b.d[1] - b.d[0] >= CHAIN_CHECK_MS && b.lg.some(m => /vẫn kẹt|chưa xác nhận/.test(m)), 'lượt nối kẹt: dispatch lại đúng trần rồi báo: ' + b.d.length); }
    const d2 = []; t = 0;
    await run(['--watch', '20', '--dry'], { GATE_CHAIN_REF: 'main' }, { ...A, dispatchSelf: async () => d2.push(1) }, () => {}, clock);
    ok(!d2.length, '--dry không tự nối');
    t = 0; const logs = [];
    await run(['--watch', '20'], { GATE_CHAIN_REF: 'main' }, { ...A, dispatchSelf: async () => { throw new Error('403'); } }, m => logs.push(m), clock);
    ok(logs.some(m => /không tự nối/.test(m)), 'dispatch lỗi → cảnh báo, bộ canh vẫn chạy hết lượt');
  }
  // hồi quy 02/11: cron của ci-triage (nơi duy nhất chạy cron-watch) chết 13 giờ → monitor mù. Bộ canh (tự nối, không cần cron) chạy cron-watch mỗi lượt
  {
    let cw = 0; t = 0;
    await run(['--watch', '3'], { CRON_WATCH: '1' }, { ...A, cronWatch: async () => { cw++; return { bad: [{ file: 'free-tier-guard.yml', why: '193 phút không có lượt schedule' }] }; } }, () => {}, clock);
    ok(cw === 1, 'bộ canh chạy cron-watch đúng 1 lần mỗi lượt: ' + cw);
    t = 0; const lg = []; const out = await run(['--watch', '3'], { CRON_WATCH: '1' }, { ...A, cronWatch: async () => { throw new Error('API 500'); } }, m => lg.push(m), clock);
    ok(lg.some(m => /cron-watch lỗi/.test(m)) && Array.isArray(out), 'cron-watch lỗi không làm dừng bộ canh');
    t = 0; let c3 = 0; await run(['--watch', '3', '--dry'], { CRON_WATCH: '1' }, { ...A, cronWatch: async () => { c3++; return { bad: [] }; } }, () => {}, clock);
    ok(!c3, '--dry không đá lịch');
  }
  // hạn mức API sắp hết → giãn vòng tới lúc đặt lại
  t = 0; const sl = []; const A2 = { ...A, rate: { remaining: 10, reset: 600e3 } };
  await run(['--watch', '30', '--dry'], {}, A2, () => {}, { now: () => t, sleep: async ms => { sl.push(ms); t += ms; } });
  ok(sl[0] >= 600e3 - 1, 'hạn mức < 150 → chờ tới lúc đặt lại: ' + sl[0]);
}

// ---------- 1c) preqc của teach-video: trần ≥ 8 phút (đo 15/11: 87–300 s, 5 phút cắt → 'cancelled' đỏ oan) + các kiểm độc lập vẫn đủ 4 nhóm, chạy song song ----------
{
  const y = fs.readFileSync(new URL('../../.github/workflows/teach-video.yml', import.meta.url), 'utf8'), pre = y.slice(y.indexOf('\n  preqc:'), y.indexOf('\n  voice:'));
  ok(/timeout-minutes: (8|9|1\d|20)\b/.test(pre), 'preqc timeout-minutes >= 8');
  for (const need of ['teach2d-gen.py', 'teach2d-autopub.py', 'teach2d-store.py', 'mix.py --check', 'teach2d-mix.py', 'native-qa.mjs --online', 'publish.py --check']) ok(pre.includes(need), 'preqc vẫn chạy ' + need);
  ok(/wait "\$\{pids\[\$i\]\}"/.test(pre) && /\[ "\$bad" = 0 \] \|\| exit 1/.test(pre), 'preqc đợi mọi nhóm song song và đỏ nếu bất kỳ nhóm nào đỏ');
}

// ---------- 1d) main đổi tệp cổng sau lần gộp main cuối của PR (15/11, #1316 lọt cổng Sie) → gate xanh phải CHỜ ----------
{
  const F = (filename, status = 'modified') => ({ filename, status });
  ok(gateDrift([F('scripts/i18n-qa.mjs')]).length === 1 && gateDrift([F('scripts/lib/i18n-rules.mjs')]).length === 1 && gateDrift([F('.github/workflows/npm-test.yml', 'added')]).length === 1, 'i18n-qa / bộ luật / workflow đổi → cổng đổi (mọi trạng thái)');
  ok(gateDrift([F('scripts/test/ci-policy.mjs')]).length === 1 && gateDrift([F('scripts/test/x.mjs', 'renamed')]).length === 1, 'test SỬA/ĐỔI TÊN (chưa biết nguồn/PR) → cổng đổi');
  ok(gateDrift([F('scripts/test/old.mjs', 'removed')]).length === 0, 'test bị XOÁ không làm PR đỏ → không bắt gộp lại');
  ok(gateDrift([F('scripts/test/brand-new.mjs', 'added'), F('web/js/app.js'), F('docs/CODEMAP.md')]).length === 0, 'test MỚI thêm + mã/tài liệu thường → không đổi cổng');
  // 16/11: workflow main đổi chỉ tính khi PR cũng sửa đúng file đó; luật/policy vẫn mọi PR
  { const wf = [F('.github/workflows/audio.yml'), F('.github/workflows/call-rt.yml', 'added'), F('.github/workflows/x.yml')];
    ok(gateDrift(wf, ['web/js/app.js']).length === 0, 'PR không chạm workflow → main đổi workflow KHÔNG bắt gộp lại');
    ok(gateDrift(wf, ['.github/workflows/audio.yml', 'web/js/app.js']).join() === '.github/workflows/audio.yml', 'PR cũng sửa audio.yml → chỉ file đó tính');
    ok(gateDrift([F('scripts/test/ci-policy.mjs'), F('scripts/ci/required-gate.mjs'), F('scripts/i18n-qa.mjs'), ...wf], []).join() === 'scripts/test/ci-policy.mjs,scripts/i18n-qa.mjs', 'chưa biết nguồn → ci-policy / i18n-qa vẫn bắt; required-gate.mjs (tự chấm bằng bản main) thì không');
    ok(gateDrift([F('.github/workflows/(>300 tệp đổi)')], ['a']).length === 1, 'main đổi >300 tệp → vẫn chờ (không đo được)'); }
  // 16/11 liên quan: tệp cổng main đổi chỉ bắt PR khi CÓ THỂ đổi kết quả PR này (#1397 rebase 3 lần 28/28 xanh vẫn kẹt)
  { const wfSrc = "on:\n  pull_request:\n    paths: ['web/js/call.js', 'web/js/call/**', '!web/js/call/old/**']\n  workflow_dispatch:\n";
    const testSrc = "const rd = f => fs.readFileSync('web/js/' + f); // đọc web/js/study.js\nconst css = 'web/css/study.css';";
    const src = { 'scripts/test/learn-flow.mjs': testSrc, 'scripts/test/dict-only.mjs': "readdirSync('web/dict')", '.github/workflows/call-rt.yml': wfSrc, '.github/workflows/cron.yml': 'on:\n  schedule:\n    - cron: "1 * * * *"\n', '.github/workflows/all.yml': 'on:\n  pull_request:\njobs: {}\n' };
    const fl = [F('scripts/test/learn-flow.mjs'), F('scripts/test/dict-only.mjs'), F('.github/workflows/call-rt.yml'), F('.github/workflows/cron.yml'), F('.github/workflows/all.yml'), F('scripts/ci/required-gate.mjs')];
    ok(gateDrift(fl, ['docs/CODEMAP.md'], src).join() === '.github/workflows/all.yml', 'PR chỉ đổi docs: test/workflow không liên quan → chấp nhận check xanh; workflow chạy cho MỌI PR (không bộ lọc) vẫn bắt');
    ok(gateDrift(fl, ['web/js/study.js'], src).join() === 'scripts/test/learn-flow.mjs,.github/workflows/all.yml', 'PR đổi web/js/study.js → learn-flow (nhắc web/js/) bắt; call-rt (paths không khớp) không');
    ok(gateDrift(fl, ['web/js/call/rt.js'], src).includes('.github/workflows/call-rt.yml'), 'paths của call-rt NAY khớp PR → bắt gộp lại (workflow sẽ chạy với PR này)');
    ok(!gateDrift(fl, ['web/js/call/old/x.js'], src).includes('.github/workflows/call-rt.yml'), 'tệp bị loại bởi !paths → không bắt');
    ok(gateDrift(fl, ['web/dict/a.json'], src).includes('scripts/test/dict-only.mjs') && !gateDrift(fl, ['web/js/app.js'], src).includes('scripts/test/dict-only.mjs'), 'test đọc thư mục web/dict: PR đụng web/dict → bắt, PR khác → không');
    ok(gateDrift([F('scripts/test/learn-flow.mjs')], ['web/js/app.js'], {}).length === 1, 'không tải được nguồn → giữ cách cũ (bắt), không mở cổng oan');
    ok(gateDrift([F('scripts/test/learn-flow.mjs')], ['scripts/test/learn-flow.mjs'], src).length === 1, 'PR cũng sửa đúng test đó → bắt (xung đột kết quả)'); }
  // 16/11: compare chỉ liệt kê 300 tệp/lần → phân trang, không còn mặc định "(>300 tệp đổi)" = luôn chờ gộp lại (#1478 tự kẹt)
  { const mk = n => Array.from({ length: n }, (_, i) => ({ filename: `docs/f${i}.md`, status: 'modified' }));
    const b64 = t => Buffer.from(t).toString('base64');
    const fake = ({ mainFiles, prFiles, src = {} }) => async u => {
      const url = new URL(u), pth = url.pathname.replace('/repos/o/r', ''), pg = +(url.searchParams.get('page') || 1), page = a => a.slice((pg - 1) * 100, pg * 100);
      const res = b => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => b, text: async () => '' });
      if (pth.startsWith('/compare/main...')) return res({ merge_base_commit: { sha: 'mb' }, files: page(prFiles) });
      if (pth.startsWith('/compare/mb...main')) return res({ total_commits: 3, files: page(mainFiles) });
      const m = pth.match(/^\/contents\/(.+)$/); if (m && src[decodeURIComponent(m[1])] != null) return res({ encoding: 'base64', content: b64(src[decodeURIComponent(m[1])]) });
      return { ok: false, status: 404, headers: { get: () => null }, json: async () => ({}), text: async () => 'nf' };
    };
    const learn = { filename: 'scripts/test/learn-flow.mjs', status: 'modified' }, srcs = { 'scripts/test/learn-flow.mjs': "rd('web/js/study.js')" };
    const big = [...mk(399), learn];   // 400 tệp main đổi (> 300), gồm 1 test cổng
    ok((await api('t', 'o/r', fake({ mainFiles: big, prFiles: [{ filename: 'docs/CODEMAP.md', status: 'modified' }], src: srcs })).drift('sha')).length === 0, 'main đổi 400 tệp nhưng test cổng không nhắc tệp PR → KHÔNG chờ (phân trang, không còn dấu >300)');
    ok((await api('t', 'o/r', fake({ mainFiles: big, prFiles: [{ filename: 'web/js/study.js', status: 'modified' }], src: srcs })).drift('sha')).join() === 'scripts/test/learn-flow.mjs', 'cùng 400 tệp nhưng PR đụng web/js/study.js → bắt đúng test cổng liên quan');
    const huge = mk(1200);   // quá 10 trang → vẫn cắt cụt → dấu hiệu chờ (không đo được, không mở cổng oan)
    ok((await api('t', 'o/r', fake({ mainFiles: huge, prFiles: [{ filename: 'a.md', status: 'modified' }] })).drift('sha')).join() === '.github/workflows/(>300 tệp đổi)', 'main đổi > 1000 tệp (cắt cụt) → vẫn chờ');
    ok((await api('t', 'o/r', fake({ mainFiles: [learn], prFiles: mk(1200), src: srcs })).drift('sha')).join() === 'scripts/test/learn-flow.mjs', 'PR > 1000 tệp (không biết đủ) → tính hết như cách cũ'); }
  // 16/11: suite.txt (danh sách test) đổi → chỉ bắt PR đụng đúng test có trong danh sách
  { const suite = 'node scripts/test/learn-flow.mjs\nnode scripts/test/required-gate.mjs\n', src = { 'scripts/test/suite.txt': suite };
    const f = [F('scripts/test/suite.txt')];
    ok(gateDrift(f, ['web/js/app.js', 'scripts/test/not-in-suite.mjs'], src).length === 0, 'suite.txt đổi, PR không đụng test nào trong danh sách → KHÔNG bắt gộp lại');
    ok(gateDrift(f, ['scripts/test/learn-flow.mjs'], src).length === 1, 'PR đụng một test có trong danh sách → bắt');
    ok(gateDrift(f, ['scripts/test/suite.txt'], src).length === 1, 'PR tự sửa suite.txt → bắt');
    ok(gateDrift(f, ['web/js/app.js'], {}).length === 1, 'không tải được nguồn suite.txt → giữ cách cũ (bắt)'); }
  const green = { state: 'success', description: 'Xanh: 5 check đều đạt', failed: [], pending: [], total: 5, cancelled: [] };
  const w = applyDrift(green, ['scripts/i18n-qa.mjs', 'scripts/lib/i18n-rules.mjs', '.github/workflows/a.yml']);
  ok(w.state === 'pending' && /gộp lại main/.test(w.description) && w.description.length <= 140 && /\+1/.test(w.description), 'xanh + cổng đổi → CHỜ, mô tả ≤140 ký tự: ' + w.description);
  { const at = h => Date.UTC(2026, 10, 17, h, 30), gf = gateFilesOf([F('.github/workflows/x.yml', 'added'), F('scripts/test/old.mjs', 'removed'), F('scripts/test/brand-new.mjs', 'added'), F('scripts/test/ci.mjs'), F('web/js/app.js')]);
    ok(gf.length === 2 && gf.includes('.github/workflows/x.yml') && gf.includes('scripts/test/ci.mjs'), 'khung merge: tệp cổng của PR = workflow + test sửa; bỏ xoá/test mới/mã thường');
    ok(inMergeWindow(at(2)) && !inMergeWindow(at(1)) && !inMergeWindow(at(3)) && !inMergeWindow(at(14)), 'khung merge = 02:00–03:00Z (09–10 VN)');
    const w = applyWindow(green, gf, at(14));
    ok(w.state === 'pending' && /khung merge cổng 09–10 VN/.test(w.description), 'PR đổi tệp cổng, gate xanh, ngoài khung → pending "chờ khung merge cổng 09–10 VN"');
    ok(applyWindow(green, gf, at(2)).state === 'success', 'trong khung → vẫn xanh');
    ok(applyWindow(green, [], at(14)).state === 'success' && applyWindow({ ...green, state: 'failure' }, gf, at(14)).state === 'failure', 'PR thường / gate đỏ → không đụng');
  }
  ok(applyDrift(green, []).state === 'success' && applyDrift({ ...green, state: 'failure' }, ['scripts/i18n-qa.mjs']).state === 'failure' && applyDrift({ ...green, state: 'pending' }, ['x']).state === 'pending', 'không đổi cổng → vẫn xanh; đỏ/chờ không bị đụng');
  // --sha: đăng pending khi cổng đổi; lỗi đo → mở cổng (xanh)
  const posted = [], base = { gather: async () => ({ workflowRuns: [wr('npm-test', 'completed', 'success', 3)] }), post: async (sha, r) => posted.push(r.state) };
  await run(['--sha', 'abc'], {}, { ...base, drift: async () => ['scripts/i18n-qa.mjs'] }, () => {});
  await run(['--sha', 'abc'], {}, { ...base, drift: async () => { throw new Error('502'); } }, () => {});
  await run(['--sha', 'abc'], {}, { ...base, drift: async () => [] }, () => {});
  ok(posted.join() === 'pending,success,success', 'cổng đổi → pending; lỗi API đo → xanh (không chặn oan); không đổi → xanh: ' + posted.join());
  // 16/11 gate-retest: drift toàn test trong suite → chạy thật trên đầu PR thay vì bắt gộp main
  { const out = [], mk = r => ({ ...base, post: async (sha, x) => out.push(x), drift: async () => ['scripts/test/story-stage.mjs'], retest: async () => r });
    await run(['--sha', 'abc'], {}, mk({ clear: true }), () => {});
    await run(['--sha', 'abc'], {}, mk({ wait: true, note: 'Chạy lại 1 test cổng đổi trên head PR (gate-retest, main@abcd1234)' }), () => {});
    await run(['--sha', 'abc'], {}, mk({}), () => {});
    await run(['--sha', 'abc'], {}, { ...mk({}), retest: async () => { throw new Error('502'); } }, () => {});
    ok(out[0].state === 'success', 'gate-retest ĐẠT cho main hiện tại → drift giải, KHÔNG bắt gộp main');
    ok(out[1].state === 'pending' && /gate-retest/.test(out[1].description) && !/gộp lại main/.test(out[1].description), 'đang chạy lại → CHỜ với lý do gate-retest (không bảo gộp main): ' + out[1].description);
    ok(out[2].state === 'pending' && /gộp lại main/.test(out[2].description), 'bất định / đỏ / lỗi thời ({}) → cách cũ: đòi gộp main');
    ok(out[3].state === 'pending' && /gộp lại main/.test(out[3].description), 'retest ném lỗi → cách cũ (không mở cổng, không đỏ oan)'); }

}

// ---------- 1e) bộ canh KHÔNG chết khi API lỗi 1 lần (15/11: #1355/#1376 kẹt pending, phải dispatch tay) ----------
{
  let t = 0, openFail = 1, gatherFail = 1; const posted = [], logs = [];
  const A = {
    openPrs: async () => { if (openFail-- > 0) throw new Error('GET /pulls → 502'); return [{ number: 7, head: { sha: 'h7' }, updated_at: new Date(0).toISOString() }]; },
    gateState: async () => undefined, recentRuns: async () => [],
    gather: async () => { if (gatherFail-- > 0) throw new Error('GET commits → 502'); return { workflowRuns: [wr('npm-test', 'completed', 'success', 1, { head_sha: 'h7' })] }; },
    post: async (sha, r) => posted.push(r.state),
  };
  await run(['--watch', '8'], {}, A, m => logs.push(m), { now: () => t, sleep: async ms => { t += ms; } });
  ok(posted.includes('success'), 'sau 1 lỗi liệt kê PR + 1 lỗi gather, bộ canh vẫn đánh giá và đăng gate: ' + posted.join() + ' | ' + logs.filter(l => /::warning::/.test(l)).join(' ; '));
  ok(logs.filter(l => /lỗi API/.test(l)).length >= 2, 'lỗi API được ghi cảnh báo (không im lặng)');
}

console.log(fails ? `✗ required-gate: ${fails}/${n} lỗi` : `✓ required-gate: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
