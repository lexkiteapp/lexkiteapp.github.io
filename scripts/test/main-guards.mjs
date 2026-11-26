// 4 máy gác CI (23/11, docs/CI-RUNNERS.md › Máy gác main đỏ): tự revert check rẻ · kiểm lại trên main mới · không đốt runner khi main đỏ · chống dispatch trùng. Thoát 1 nếu sai.
import assert from 'node:assert/strict'; import fs from 'node:fs'; import path from 'node:path';
import { CHEAP, firstBad, statusOf, recheckVerdict, TOLERANCE, CONTEXT } from '../ci/cheap.mjs';
import { chain, MAX_BACK } from '../ci/cheap-revert.mjs';
import { revertNames, duplicate, revertable } from '../ci/revert-pr.mjs';
import { mainRed, pickRetry } from '../ci/main-red-retry.mjs';
import { dupActive, dispatchOnce, fillerAllowed, yieldsToPr, queueAlert, FILLER_MAX_BUSY } from '../ci/dispatch-once.mjs';
import { redSince, stale, issueTitle, hasIssue, redCount, firstRedRun, reportable } from '../ci/main-red-age.mjs';
import { heavyFiles } from '../ci/heavy-rerun.mjs';
let n = 0; const ok = (c, m) => { assert.ok(c, m); n++; };
const suite = fs.readFileSync('scripts/test/suite.txt', 'utf8').split('\n').map(l => l.trim());

// ---- 1) check rẻ + bisect + revert
ok(['size-budget', 'docs-budget', 'content-qa', 'fmt'].every(id => CHEAP.some(c => c.id === id)), 'đủ 4 check rẻ');
for (const c of CHEAP) ok(suite.includes(c.cmd), `${c.id}: lệnh phải có NGUYÊN DÒNG trong suite.txt (đỏ ở đây = đỏ trong npm test)`);
for (let len = 2; len <= 11; len++) for (let bad = 1; bad < len; bad++) {   // w[0] xanh, w[bad..] đỏ → firstBad(len-1, i=>i+1>=bad) = bad-1 (chỉ số trong ứng viên)
  let calls = 0; const k = firstBad(len - 1, i => { calls++; return i + 1 >= bad; });
  ok(k + 1 === bad && calls <= Math.ceil(Math.log2(len)) + 1, `bisect len ${len} thủ phạm ${bad}`);
}
ok(chain(['c', 'b', 'a']).join() === 'a,b,c' && MAX_BACK === 10, 'chuỗi cũ→mới, ≤ 10 commit');
ok(revertNames('0123456789abcdef', 'Tiêu đề dài\nthân', 'main đỏ check rẻ').branch === 'revert/01234567' && /^Revert Tiêu đề dài \(main đỏ check rẻ\)$/.test(revertNames('0123456789abcdef', 'Tiêu đề dài\nthân', 'main đỏ check rẻ').title), 'tên nhánh/tiêu đề revert');
ok(duplicate([{ head: { ref: 'revert/01234567' } }], 'revert/01234567') && !duplicate([], 'revert/x') && !duplicate(null, 'x'), 'không mở PR revert lặp');
ok(!revertable('Revert "x"') && revertable('Thêm gói nghĩa'), 'không revert commit Revert (vòng lặp)');
{ const w = fs.readFileSync('.github/workflows/main-red-revert.yml', 'utf8');
  ok(/branches: \[main\]/.test(w) && /BOT_DEPLOY_KEY/.test(w) && /cheap-revert\.mjs/.test(w) && /pull-requests: write/.test(w), 'workflow main-red-revert: push main + khoá deploy + quyền PR'); }
{ const r = JSON.parse(fs.readFileSync('infra/bot-push-tests.json', 'utf8')).rules.find(x => /content\//.test(x.paths) && x.tests.includes('node scripts/test/size-budget.mjs'));
  ok(r && r.tests.includes('node scripts/test/docs-budget.mjs') && ['content/lexicon/x.json', 'web/packs/a.json', 'docs/A.md'].every(f => new RegExp(r.paths).test(f)), 'bot dữ liệu chạy size-budget + docs-budget trước khi đẩy (vượt → bot-test-gate chặn)'); }

// ---- 2) kiểm lại trên main mới
const st = (state, main = 'abcdef01') => ({ state, description: `main@${main}: x` });
ok(recheckVerdict(null, 0) === 'stale' && recheckVerdict(st('success'), null) === 'stale' && recheckVerdict(st('success'), TOLERANCE + 1) === 'stale', 'chưa đo/không biết/lệch quá nhiều → đo lại');
ok(recheckVerdict(st('success'), 0) === 'clear' && recheckVerdict(st('success'), TOLERANCE) === 'clear', 'xanh, main đi tiếp ≤ dung sai → đạt');
ok(recheckVerdict(st('pending'), 1) === 'wait' && recheckVerdict(st('failure'), 1) === 'fail' && recheckVerdict({ state: 'success', description: 'không có main' }, 0) === 'stale', 'pending → chờ; đỏ → chặn; thiếu main@ → đo lại');
ok(statusOf([{ id: 'size-budget', ok: false }, { id: 'fmt', ok: true }], 'abcdef0123').state === 'failure' && /size-budget/.test(statusOf([{ id: 'size-budget', ok: false }], 'abcdef0123').description) && statusOf([{ id: 'fmt', ok: true }], 'abcdef0123').state === 'success' && CONTEXT === 'merge-recheck', 'status ghép kết quả');
{ const g = fs.readFileSync('scripts/ci/required-gate.mjs', 'utf8'), w = fs.readFileSync('.github/workflows/merge-recheck.yml', 'utf8');
  ok(/recheck: async sha/.test(g) && /withRecheck/.test(g) && /RECHECK_CONTEXT\) continue/.test(g), 'required-gate gọi merge-recheck và không đếm status của nó như check PR');
  { const rel = [...fs.readFileSync('scripts/ci/cheap.mjs', 'utf8').matchAll(/^import .*from '\.\.\/(lib\/[\w.-]+)'/gm)].map(m => m[1]); // cheap.mjs chạy từ bản main chép ra RUNNER_TEMP: import tương đối phải chép kèm đúng cây thư mục (26/11 ERR_MODULE_NOT_FOUND is-main.mjs)
    for (const r of rel) ok(w.includes(`show "$MAIN:scripts/${r}" > "$RUNNER_TEMP/gate/scripts/${r}"`), 'merge-recheck chép kèm phụ thuộc của cheap.mjs', r);
    ok(/RUNNER_TEMP\/gate\/scripts\/ci\/cheap\.mjs/.test(w) && !/RUNNER_TEMP\/cheap\.mjs/.test(w), 'merge-recheck chạy cheap.mjs trong cây gate/scripts/ci'); }
  ok(/git merge --no-commit/.test(w) && /show "\$MAIN:scripts\/ci\/cheap\.mjs"/.test(w) && !/GITHUB_TOKEN[^\n]*\n[^\n]*npm ci/.test(w), 'merge-recheck: ghép main, mã đo lấy từ main, bước chạy mã PR không token'); }

// ---- 3) không đốt runner khi main đỏ
const R = (conclusion, extra = {}) => ({ status: 'completed', conclusion, ...extra });
ok(mainRed([R('failure'), R('success')]) && !mainRed([R('success'), R('failure')]) && !mainRed([]) && mainRed([R('cancelled'), R('skipped'), R('failure')]) && !mainRed([{ status: 'in_progress' }, R('success')]), 'main đỏ = lượt xong gần nhất (bỏ huỷ/skipped/đang chạy) đỏ');
{ const heavy = ['size-guard.yml'], run = (id, o = {}) => ({ id, event: 'pull_request', status: 'completed', conclusion: 'failure', run_attempt: 1, path: '.github/workflows/size-guard.yml@refs/pull/1/merge', ...o });
  const jobs = { 1: [{ name: 'gate', conclusion: 'failure' }, { name: 'guard', conclusion: 'skipped' }], 2: [{ name: 'gate', conclusion: 'success' }, { name: 'guard', conclusion: 'failure' }], 3: [{ name: 'gate', conclusion: 'failure' }, { name: 'guard', conclusion: 'skipped' }] };
  ok(pickRetry([run(1)], jobs, heavy, () => false).join() === '1', 'gate dừng vì main đỏ + main xanh lại → chạy lại');
  ok(!pickRetry([run(1)], jobs, heavy, () => true).length, 'main còn đỏ → chưa chạy lại');
  ok(!pickRetry([run(2)], jobs, heavy, () => false).length, 'job nặng đỏ thật (gate xanh) → KHÔNG chạy lại');
  ok(!pickRetry([run(3, { run_attempt: 2 })], jobs, heavy, () => false).length, 'đã chạy lại 1 lần (attempt 2) → không chạy lại nữa');
  ok(!pickRetry([run(1, { path: '.github/workflows/other.yml' })], jobs, heavy, () => false).length && !pickRetry([run(1, { event: 'push' })], jobs, heavy, () => false).length, 'chỉ workflow nặng + lượt PR'); }
{ const hv = heavyFiles(), gated = hv.filter(f => /echo "go=\$go" >> "\$GITHUB_OUTPUT"/.test(fs.readFileSync(path.join('.github/workflows', f), 'utf8')));
  ok(gated.length >= 50, `đa số workflow nặng có job gate (${gated.length})`);
  for (const f of gated) { const s = fs.readFileSync(path.join('.github/workflows', f), 'utf8');
    ok(/main đỏ – chờ/.test(s) && /\[ -z "\$red" \] \|\| exit 1/.test(s) && /FIX: '\$\{\{ contains\(github\.event\.pull_request\.labels\.\*\.name, ''main-red-fix''\) \}\}'/.test(s) && /branch=main&event=push&status=completed/.test(s), `${f}: gate dừng sớm khi cùng workflow đỏ trên main (trừ PR main-red-fix)`); }
  ok(/main-red-retry\.yml': 10/.test(fs.readFileSync('scripts/ci/required-gate.mjs', 'utf8')), 'bộ canh dispatch main-red-retry theo nhịp'); }

// ---- 4) chống dispatch trùng + bơm nền
const now = Date.parse('2026-11-23T08:40:00Z'), live = (o = {}) => ({ id: 7, status: 'in_progress', head_branch: 'main', created_at: '2026-11-23T08:30:00Z', ...o });
ok(dupActive([live()], 'main', now) && dupActive([live({ status: 'queued', created_at: '2026-11-23T08:39:00Z' })], 'main', now) && !dupActive([live({ head_branch: 'x' })], 'main', now) && !dupActive([live({ status: 'completed' })], 'main', now) && !dupActive([], 'main', now), 'trùng = cùng ref đang chờ/chạy');
ok(!dupActive([live({ status: 'queued', created_at: '2026-11-23T04:00:00Z' })], 'main', now), 'lượt zombie (queued > 2 giờ) không chặn');
{ const sent = []; const api = runs => ({ runs: async () => runs, dispatch: async (f, ref, i) => { sent.push([f, ref, i]); return 'ok'; } });
  const a = await dispatchOnce(api([live()]), 'ci-filler.yml', 'main', {}, now), b = await dispatchOnce(api([]), 'ci-filler.yml', 'main', { x: '1' }, now);
  ok(!a.sent && /đã có lượt/.test(a.why) && b.sent && b.res === 'ok' && sent.length === 1 && sent[0][2].x === '1', 'dispatchOnce: có lượt → bỏ; không → gửi 1 lần'); }
ok(FILLER_MAX_BUSY === 24 && fillerAllowed(23) && !fillerAllowed(24) && !fillerAllowed(30), 'ci-filler chỉ chạy khi < 24 job');
ok(yieldsToPr([{ status: 'queued', pull_requests: [{ number: 5 }] }], new Set([5])) && !yieldsToPr([{ status: 'completed', pull_requests: [{ number: 5 }] }], new Set([5])) && !yieldsToPr([{ status: 'queued', pull_requests: [{ number: 6 }] }], new Set([5])) && !yieldsToPr([], new Set([5])), 'nền nhường PR nhãn main-red-fix/ui đang chờ/chạy');
ok(/nhường/.test(fs.readFileSync('scripts/ci/filler.mjs', 'utf8')) && /dispatchOnce/.test(fs.readFileSync('scripts/ci/cron-watch.mjs', 'utf8')) && /dispatchOnce/.test(fs.readFileSync('scripts/ci/required-gate.mjs', 'utf8')) && /dispatchOnce/.test(fs.readFileSync('scripts/ci/filler.mjs', 'utf8')), 'filler/cron-watch/required-gate dùng dispatchOnce; filler nhường');
ok(queueAlert({ running: 17, queued: 37 }) && /KHÔNG phải thiếu runner/.test(queueAlert({ running: 17, queued: 37 })) && !queueAlert({ running: 30, queued: 90 }) && !queueAlert({ running: 17, queued: 10 }) && !queueAlert({ running: 5, queued: 0 }), 'cảnh báo: < 30 chạy mà > 10 xếp (08:40 hôm nay 17 chạy / 37 xếp)');
// ---- health sweep: đỏ trên main > 24 giờ → issue main-red
{ const R = (c, t, st = 'completed') => ({ status: st, conclusion: c, created_at: t }), now2 = Date.parse('2026-11-23T12:00:00Z');
  const runs = [R('failure', '2026-11-23T10:00:00Z'), R('cancelled', '2026-11-22T09:00:00Z'), R('failure', '2026-11-20T11:49:27Z'), R('success', '2026-11-19T00:00:00Z')];
  ok(redSince(runs) === '2026-11-20T11:49:27Z', 'redSince: mốc lượt đỏ đầu của chuỗi (bỏ huỷ)');
  ok(redSince([R('success', '2026-11-23T10:00:00Z'), R('failure', '2026-11-20T00:00:00Z')]) === null && redSince([]) === null && redSince([R(null, '2026-11-23T10:00:00Z', 'in_progress')]) === null, 'xanh/không có lượt/đang chạy → không đỏ');
  ok(stale('2026-11-20T11:49:27Z', now2) && !stale('2026-11-23T00:00:00Z', now2) && !stale(null, now2), 'stale: > 24 giờ mới mở issue');
  ok(hasIssue([{ title: issueTitle('teacher-motion') }], 'teacher-motion') && !hasIssue([], 'teacher-motion') && !hasIssue([{ title: issueTitle('x') }], 'teacher-motion'), 'không mở issue lặp');
  { const F = (c, t, sha) => ({ status: 'completed', conclusion: c, created_at: t, head_sha: sha || 'a'.repeat(40) }), now3 = Date.parse('2026-11-24T12:00:00Z');
    const three = [F('failure', '2026-11-24T11:00:00Z'), F('failure', '2026-11-24T10:00:00Z'), F('failure', '2026-11-24T09:31:00Z', 'b'.repeat(40)), F('success', '2026-11-24T09:00:00Z')];
    ok(redCount(three) === 3 && redCount([F('success', '2026-11-24T11:00:00Z'), F('failure', '2026-11-24T10:00:00Z')]) === 0, 'redCount: số lượt đỏ liền');
    ok(firstRedRun(three).head_sha === 'b'.repeat(40) && firstRedRun([]) === null, 'firstRedRun: commit gây lỗi = lượt đỏ đầu chuỗi');
    ok(reportable(three, now3) && !reportable([F('failure', '2026-11-24T11:00:00Z'), F('success', '2026-11-24T10:00:00Z')], now3) && reportable([F('failure', '2026-11-20T00:00:00Z')], now3), 'reportable: ≥2 lượt đỏ liền (frame-consistency 24/11) hoặc > 24 giờ; 1 lượt đỏ mới thì chưa');
    ok(hasIssue([{ title: 'main đỏ > 24 giờ: x' }], 'x'), 'issue cũ (tiêu đề > 24 giờ) vẫn khớp – không mở lặp'); }
  const y = fs.readFileSync('.github/workflows/main-red-retry.yml', 'utf8'); ok(/main-red-age\.mjs/.test(y) && /issues: write/.test(y), 'workflow chạy sweep với quyền issues:write'); }
console.log(`✓ main-guards: ${n} kiểm tra đạt (tự revert check rẻ, kiểm lại trên main mới, không đốt runner khi main đỏ, chống dispatch trùng)`);
