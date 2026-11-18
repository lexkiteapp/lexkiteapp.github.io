// gate-retest (scripts/ci/gate-retest.mjs + required-gate › api().retest): chạy lại test cổng đổi trên đầu PR thay vì bắt gộp main. Hàm thuần + api với fetch giả.
import { retestPlan, verdict, tagOf, overlayFiles, MAX_CMDS } from '../ci/gate-retest.mjs';
import { api } from '../ci/required-gate.mjs';
import fs from 'node:fs';
let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.error('✗ ' + m); } else console.log('✓ ' + m); };
const SUITE = 'node scripts/test/learn-flow.mjs\nnode scripts/test/story-stage.mjs\nnode scripts/test/perf-flake.mjs --x\nnode scripts/i18n-qa.mjs --strict\n';
// retestPlan
ok(retestPlan(['scripts/test/story-stage.mjs'], SUITE).ok && retestPlan(['scripts/test/story-stage.mjs'], SUITE).cmds[0] === 'node scripts/test/story-stage.mjs', 'test trong suite → có lệnh chạy lại');
ok(retestPlan(['scripts/test/perf-flake.mjs'], SUITE).cmds[0] === 'node scripts/test/perf-flake.mjs --x', 'giữ nguyên đối số của dòng suite');
ok(!retestPlan(['scripts/test/scroll-perf.mjs'], SUITE).ok, 'test KHÔNG có trong suite (chạy bằng workflow riêng) → không chạy lại được → cách cũ');
ok(!retestPlan(['scripts/test/story-stage.mjs', '.github/workflows/x.yml'], SUITE).ok && !retestPlan(['scripts/i18n-qa.mjs'], SUITE).ok, 'lẫn workflow/i18n-qa → cách cũ (không chạy lại một phần)');
ok(!retestPlan([], SUITE).ok && !retestPlan(['scripts/test/learn-flow.mjs'], '').ok, 'rỗng / không có suite → cách cũ');
ok(!retestPlan(Array.from({ length: MAX_CMDS + 1 }, (_, i) => `scripts/test/t${i}.mjs`), Array.from({ length: MAX_CMDS + 1 }, (_, i) => `node scripts/test/t${i}.mjs`).join('\n')).ok, `quá ${MAX_CMDS} test → cách cũ`);
// verdict
const M = 'abcdef0123456789', st = (state, d) => ({ state, description: d });
ok(verdict(st('success', `main@${tagOf(M)}: 3 test đạt`), M) === 'clear', 'success đúng sha main → clear');
ok(verdict(st('success', 'main@deadbeef: 3 test đạt'), M) === 'stale' && verdict(undefined, M) === 'stale', 'success cho main CŨ / chưa có → stale (chạy lại)');
ok(verdict(st('pending', `main@${tagOf(M)}: đang chạy`), M) === 'wait', 'pending đúng main → wait');
ok(verdict(st('failure', `main@${tagOf(M)}: 1/3 đỏ`), M) === 'inconclusive' && verdict(st('error', `main@${tagOf(M)}`), M) === 'inconclusive', 'đỏ/lỗi → inconclusive (KHÔNG tin: đòi gộp main như cũ)');
// overlayFiles
ok(overlayFiles(['scripts/test/a.mjs', 'scripts/lib/x.mjs', 'web/js/app.js', 'docs/A.md'], ['scripts/test/a.mjs']).join() === 'scripts/lib/x.mjs', 'ghi đè chỉ tệp scripts/ main đổi mà PR KHÔNG đổi (giữ phần của PR)');
// api().retest với fetch giả
{ const SHA = 'f'.repeat(40), MAINSHA = 'a1b2c3d4e5f60718' + '0'.repeat(24), calls = [];
  const mk = ({ pulls, status, runs = [], suite = SUITE, fail = null }) => async (u, init = {}) => {
    const url = new URL(u), p = url.pathname.replace('/repos/o/r', ''); calls.push((init.method || 'GET') + ' ' + p);
    const res = b => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => b, text: async () => '' });
    if (fail && p.includes(fail)) return { ok: false, status: 500, headers: { get: () => null }, json: async () => ({}), text: async () => 'boom' };
    if (p === '/contents/scripts/test/suite.txt') return res({ encoding: 'base64', content: Buffer.from(suite).toString('base64') });
    if (p === `/commits/${SHA}/pulls`) return res(pulls);
    if (p === '/branches/main') return res({ commit: { sha: MAINSHA } });
    if (p === `/commits/${SHA}/status`) return res({ statuses: status ? [status] : [] });
    if (p === '/actions/workflows/gate-retest.yml/runs') return res({ workflow_runs: runs });
    if (p === '/actions/workflows/gate-retest.yml/dispatches' || p === `/statuses/${SHA}`) return { ok: true, status: 204, headers: { get: () => null }, json: async () => null, text: async () => '' };
    return { ok: false, status: 404, headers: { get: () => null }, json: async () => ({}), text: async () => 'nf' };
  };
  const same = [{ head: { sha: SHA, repo: { full_name: 'o/r' } } }], fork = [{ head: { sha: SHA, repo: { full_name: 'x/y' } } }], D = ['scripts/test/story-stage.mjs'];
  const R = o => api('t', 'o/r', mk(o)).retest(SHA, D);
  ok((await R({ pulls: same, status: { context: 'gate-retest', state: 'success', description: `main@${tagOf(MAINSHA)}: 1 test đạt` } })).clear === true, 'api.retest: success cho main hiện tại → clear');
  ok((await R({ pulls: fork })).clear !== true && Object.keys(await R({ pulls: fork })).length === 0, 'api.retest: PR từ fork → {} (cách cũ, không chạy mã fork)');
  calls.length = 0; const w = await R({ pulls: same });
  ok(w.wait === true && /gate-retest/.test(w.note) && calls.some(c => c === 'POST /actions/workflows/gate-retest.yml/dispatches') && calls.some(c => c === `POST /statuses/${SHA}`), 'api.retest: chưa có kết quả → dispatch + ghi pending + chờ');
  calls.length = 0; const live = await R({ pulls: same, runs: [{ display_title: `gate-retest ${SHA} ${MAINSHA}`, status: 'in_progress', created_at: new Date().toISOString() }] });
  ok(live.wait === true && !calls.some(c => c.startsWith('POST /actions')), 'api.retest: đã có lượt đang chạy cho đúng sha+main → KHÔNG dispatch lại (chống bão)');
  ok(Object.keys(await R({ pulls: same, status: { context: 'gate-retest', state: 'failure', description: `main@${tagOf(MAINSHA)}: 1/1 đỏ` } })).length === 0, 'api.retest: kết quả ĐỎ → {} (đòi gộp main như cũ, không tin)');
  ok(Object.keys(await R({ pulls: same, suite: 'node scripts/test/other.mjs\n' })).length === 0, 'api.retest: test không có trong suite → {}');
  let threw = false; try { await R({ pulls: same, fail: '/dispatches' }); } catch (e) { threw = true; } ok(threw, 'api.retest: dispatch lỗi → ném lỗi (required-gate bắt và dùng cách cũ)'); }
{ const y = fs.readFileSync(new URL('../../.github/workflows/gate-retest.yml', import.meta.url), 'utf8');
  ok(!/git fetch[^\n]*--depth/.test(y.replace(/#[^\n]*/g, '')), 'workflow: fetch main KHÔNG --depth (cắt nông làm git merge-base lỗi → 3/3 đỏ 17/11)'); }
if (bad) { console.error(`✗ gate-retest: ${bad} lỗi`); process.exit(1); } console.log('✓ gate-retest: đạt');
