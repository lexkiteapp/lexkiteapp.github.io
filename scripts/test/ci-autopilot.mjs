// Kiểm ci-autopilot (scripts/ci/autopilot.mjs + .github/workflows/ci-autopilot.yml): ngân sách runner, phân loại hạ tầng, quyết định theo PR (KHÔNG bao giờ gộp khi đỏ), nhật ký 24 h,
// và workflow giữ concurrency + timeout + không workflow_run (fan-out) + không bỏ qua check.
import fs from 'node:fs';
import { budget, isInfraJob, shouldRerun, decide, tally, parseLog, renderIssue, BUSY_MAX, KEEP_FREE, TOTAL, MAX_RERUN_ATTEMPT, isPriority, isRecent, MAX_UPDATES } from '../ci/autopilot.mjs';
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.error('✗ ' + m); } };

// --- ngân sách: chừa ≥ 16 runner trống, chỉ nạp khi busy < 24
ok(TOTAL - BUSY_MAX >= KEEP_FREE && KEEP_FREE >= 16, 'ngân sách giữ ≥ 16/40 runner trống');
ok(budget(9) === 3 && budget(20) === 1 && budget(0) === 6, 'budget = floor((24 − busy)/4)');
ok(budget(24) === 0 && budget(40) === 0, 'busy ≥ 24 → không nạp thêm');
// --- hạ tầng
const J = (conclusion, steps) => ({ conclusion, steps });
ok(isInfraJob(J('cancelled', [])) && isInfraJob(J('timed_out', [{ conclusion: 'failure', name: 'Run tests' }])), 'huỷ/timeout = hạ tầng');
ok(isInfraJob(J('failure', [])), 'không có bước nào chạy (runner mất) = hạ tầng');
ok(isInfraJob(J('failure', [{ conclusion: 'success', name: 'Set up job' }, { conclusion: 'failure', name: 'Install Playwright browsers' }])), 'playwright install treo = hạ tầng');
ok(isInfraJob(J('failure', [{ conclusion: 'success', name: 'x' }, { conclusion: 'failure', name: 'Run tests' }]), 'The runner has received a shutdown signal'), 'thông điệp runner mất = hạ tầng');
ok(!isInfraJob(J('failure', [{ conclusion: 'success', name: 'Set up job' }, { conclusion: 'failure', name: 'npm test' }])), 'test đỏ thật KHÔNG phải hạ tầng');
ok(!isInfraJob(J('success', [])), 'job xanh không phải hạ tầng');
const infra = { infra: true }, real = { infra: false };
ok(shouldRerun({ conclusion: 'failure', run_attempt: 1 }, [infra]) && shouldRerun({ conclusion: 'failure', run_attempt: MAX_RERUN_ATTEMPT }, [infra, infra]), 'chạy lại khi mọi job hỏng là hạ tầng, ≤ 2 lần');
ok(!shouldRerun({ conclusion: 'failure', run_attempt: MAX_RERUN_ATTEMPT + 1 }, [infra]), 'quá 2 lần chạy lại → thôi');
ok(!shouldRerun({ conclusion: 'failure', run_attempt: 1 }, [infra, real]) && !shouldRerun({ conclusion: 'failure', run_attempt: 1 }, []), 'có job đỏ thật → không chạy lại');
// --- quyết định: không bao giờ gộp khi đỏ / đang chạy / thiếu status / xung đột / có nhãn chặn
const P = o => ({ draft: false, labels: [], mergeable: 'MERGEABLE', gate: 'SUCCESS', behind: 0, ...o });
ok(decide(P()).act === 'merge', 'xanh + gộp được → merge');
for (const [o, m] of [[{ gate: 'FAILURE' }, 'đỏ'], [{ gate: 'ERROR' }, 'lỗi'], [{ gate: 'PENDING' }, 'đang chạy'], [{ gate: null }, 'thiếu status'], [{ mergeable: 'UNKNOWN' }, 'mergeable chưa rõ'], [{ mergeable: 'CONFLICTING' }, 'xung đột'], [{ labels: ['do-not-merge'] }, 'do-not-merge'], [{ labels: ['frozen'] }, 'frozen'], [{ draft: true }, 'draft']])
  ok(decide(P(o)).act !== 'merge', `không merge khi ${m}`);
ok(decide(P({ mergeable: 'CONFLICTING' })).act === 'conflict' && decide(P({ gate: 'PENDING', behind: 3 })).act === 'update', 'xung đột → conflict; tụt + chưa xanh → update');
ok(decide(P({ gate: 'FAILURE' })).act === 'triage-red', 'đỏ → triage (chạy lại nếu hạ tầng)');
// --- PR ưu tiên: chỉ PR sống (≤ 24 h) + xanh/hạ tầng được cập nhật nhánh; tối đa 6 PR/lượt (bão CI 12/11)
{ const N = Date.parse('2026-11-12T12:00:00Z'), at = h => new Date(N - h * 3600e3).toISOString(), Q = o => ({ draft: false, updatedAt: at(1), gate: 'SUCCESS', ...o });
  ok(MAX_UPDATES === 6 && budget(0) === 6, 'trần 6 PR mỗi lượt');
  ok(isPriority(Q(), N) && isPriority(Q({ gate: 'FAILURE', infra: true }), N), 'sống + xanh / hỏng hạ tầng → ưu tiên');
  ok(!isPriority(Q({ updatedAt: at(25) }), N) && !isPriority(Q({ draft: true }), N) && !isPriority(Q({ gate: 'PENDING' }), N) && !isPriority(Q({ gate: 'FAILURE' }), N), 'cũ > 24 h / draft / chưa xanh / đỏ thật → KHÔNG ưu tiên');
  ok(isRecent(Q({ gate: 'PENDING' }), N) && !isRecent(Q({ updatedAt: at(48) }), N), 'isRecent: động tĩnh ≤ 24 h'); }
// --- nhật ký 24 h + issue
const now = Date.parse('2026-11-12T12:00:00Z'), ev = (k, h) => ({ k, n: 1, t: new Date(now - h * 3600e3).toISOString() });
const t = tally([ev('merge', 1), ev('merge', 30), ev('rerun', 5), ev('update', 23)], now);
ok(t.merged === 1 && t.rerun === 1 && t.updated === 1 && t.keep.length === 3, 'tally chỉ đếm 24 h');
const body = renderIssue({ busy: 9, queued: 2, tallyR: t, stuck: [{ n: 5, age: 30, reason: 'x' }], ready: [7], ts: 'T', dry: false, canMerge: false });
ok(parseLog(body).length === 3 && /busy 9\/40/.test(body) && /#5/.test(body) && /#7/.test(body), 'issue: số liệu + log nhúng đọc lại được');
// --- workflow
const wf = fs.readFileSync(new URL('../../.github/workflows/ci-autopilot.yml', import.meta.url), 'utf8'), src = fs.readFileSync(new URL('../ci/autopilot.mjs', import.meta.url), 'utf8');
ok(/concurrency:\s*\{[^}]*group: ci-autopilot/.test(wf) && /timeout-minutes:\s*\d+/.test(wf), 'workflow có concurrency + timeout-minutes');
ok(/cron:/.test(wf) && /workflow_dispatch:/.test(wf) && !/workflow_run|check_suite|check_run|pull_request/.test(wf.replace(/^#.*$/gm, '')), 'lịch + dispatch, KHÔNG fan-out workflow_run/check_suite/PR');
ok(!/--no-verify|force|skip.?check|enable.?auto/i.test(src.replace(/^\s*\/?\*.*$/gm, '').replace(/\/\/.*$/gm, '').replace(/`[^`]*`/g, '')), 'mã không bỏ check / force');
ok(/decide\(fresh\)\.act === 'merge'/.test(src) && /merge_method: 'squash'/.test(src) && /sha: pr\.sha/.test(src), 'gộp: đọc lại + quyết định lại ngay trước khi gộp, squash, ghim sha');
ok(/process\.env\.AUTOPILOT_MERGE_TOKEN/.test(src) && /mergeToken && merges < MAX_MERGES/.test(src), 'chỉ gộp khi có token gộp riêng (github.token không kích workflow push-main)');
if (fail) { console.error(`ci-autopilot: ${fail} lỗi`); process.exit(1); }
console.log('ci-autopilot: OK');
