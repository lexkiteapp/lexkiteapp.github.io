// Hồi quy máy gác CI (06/11): mỗi ý phải ĐỎ trên code cũ (không có hàm / không có bước trong workflow).
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { laneVerdict, issueAction, mainRedNeeded, wipVerdict, touchesWeb, webStall, WIP_MAX } from '../ci/guards.mjs';
import { splitUndeployed } from '../ops/smoke.mjs';
import { lowHeadroom } from '../lib/headroom.mjs';
const wf = f => fs.readFileSync(`.github/workflows/${f}`, 'utf8');

// 3) làn nhanh: chỉ huỷ khi npm test CÙNG sha đã xong và đỏ; đang chạy / chưa có / xanh → chạy tiếp (skipped ≠ xanh giả: huỷ = đỏ trong required-gate, PR vốn đã đỏ)
const run = (conclusion, status = 'completed', started_at = '2026-11-06T01:00:00Z') => ({ name: 'npm test', status, conclusion, started_at });
assert.equal(laneVerdict([run('failure')]).red, true, 'npm test failure → đỏ');
assert.equal(laneVerdict([run('timed_out')]).red, true, 'timed_out → đỏ');
assert.equal(laneVerdict([run('success')]).red, false, 'xanh → chạy tiếp');
assert.equal(laneVerdict([run(null, 'in_progress')]).red, false, 'đang chạy → không đoán, không chờ');
assert.equal(laneVerdict([]).red, false, 'chưa có check → chạy tiếp');
assert.equal(laneVerdict([{ name: 'guard', status: 'completed', conclusion: 'failure' }]).red, false, 'check khác tên không tính');
assert.equal(laneVerdict([run('failure', 'completed', '2026-11-06T01:00:00Z'), run('success', 'completed', '2026-11-06T02:00:00Z')]).red, false, 'lượt chạy lại xanh (mới nhất) thắng');
const HEAVY = ['stitch-diff', 'visual-qa', 'mobile-qa', 'web-sweep', 'scroll-perf', 'ux-cards', 'ux-shots'];
for (const f of HEAVY) {
  const s = wf(f + '.yml');
  assert.ok(/uses: \.\/\.github\/actions\/fast-lane/.test(s), `${f}: thiếu bước fast-lane`);
  assert.ok(/actions: write/.test(s) && /checks: read/.test(s), `${f}: fast-lane cần actions:write + checks:read`);
  assert.ok(/if: github\.event_name == 'pull_request'\n\s+uses: \.\/\.github\/actions\/fast-lane/.test(s), `${f}: fast-lane chỉ chạy trên PR`);
  assert.ok(!/^  workflow_run:/m.test(s), `${f}: không dùng workflow_run (ci-fanout-rule)`);
}
assert.ok(fs.existsSync('.github/actions/fast-lane/action.yml'), 'action fast-lane tồn tại');

// 1) main-red
assert.equal(mainRedNeeded('failure'), true); assert.equal(mainRedNeeded('success'), false); assert.equal(mainRedNeeded('cancelled'), null, 'huỷ = không biết → giữ nguyên');
assert.deepEqual(['create', 'update', 'close', 'none'], [issueAction(true, null), issueAction(true, { number: 1 }), issueAction(false, { number: 1 }), issueAction(false, null)]);
const pr = wf('prod-release.yml');
assert.ok(/main-red:\n\s+needs: gate/.test(pr) && /guards\.mjs main-red/.test(pr) && /issues: write/.test(pr), 'prod-release có job main-red sau gate');
assert.ok(/budget-watch:/.test(pr) && /guards\.mjs budget/.test(pr), 'prod-release có budget-watch');

// 2) cảnh báo sớm ngân sách
const K = 1024;
assert.equal(lowHeadroom([{ name: 'a', used: 374 * K - 1000, cap: 374 * K }]).length, 1, 'dư < 5 KB → vàng');
assert.equal(lowHeadroom([{ name: 'a', used: 98 * K, cap: 103 * K }]).length, 0, 'dư đúng 5 KB và ≥ 2 % → im');
assert.equal(lowHeadroom([{ name: 'a', used: 11.69e6, cap: 11.78e6 }]).length, 1, 'dư 0,8 % (< 2 %) → vàng');
assert.equal(lowHeadroom([{ name: 'a', used: 300 * K, cap: 374 * K }]).length, 0, 'còn rộng → im');
assert.equal(lowHeadroom([{ name: 'a', used: 375 * K, cap: 374 * K }]).length, 0, 'đã vượt = đỏ (size-budget lo), không phải vàng');
assert.ok(/lowHeadroom/.test(fs.readFileSync('scripts/test/size-budget.mjs', 'utf8')), 'size-budget dùng lowHeadroom');

// 4) wip-guard
assert.equal(wipVerdict({ openCount: WIP_MAX, labels: [] }).freeze, false, '15 PR mở vẫn được');
assert.equal(wipVerdict({ openCount: WIP_MAX + 1, labels: [] }).freeze, true, '16 PR mở → frozen');
assert.equal(wipVerdict({ openCount: 40, labels: ['main-red'] }).freeze, false, 'main-red miễn trừ');
assert.equal(wipVerdict({ openCount: 40, labels: ['p0'] }).freeze, false, 'p0 miễn trừ');
const wg = wf('wip-guard.yml');
assert.ok(/pull_request_target/.test(wg) && !/ref: \$\{\{ *github\.(head_ref|event\.pull_request\.head)/.test(wg), 'wip-guard không checkout mã PR');

// 5) chỉ số hằng ngày
assert.equal(touchesWeb(['docs/a.md', 'web/js/app.js']), true); assert.equal(touchesWeb(['docs/a.md']), false);
assert.equal(webStall({ mergedWeb24h: 0, openWeb: 3 }), true, '0 gộp mà còn PR web mở → stall');
assert.equal(webStall({ mergedWeb24h: 0, openWeb: 0 }), false, 'không còn PR web → không báo');
assert.equal(webStall({ mergedWeb24h: 2, openWeb: 5 }), false);
assert.ok(/cron:/.test(wf('web-merge-daily.yml')) && /guards\.mjs web-daily/.test(wf('web-merge-daily.yml')));
// 06/11 Prod release đỏ giả: Pages gom deploy 180 phút → commit chưa lên site, smoke 404 tuyến mới (AASA/assetlinks) rồi ROLLBACK giả. Lỗi 404/thiếu khi 'timeout' = chưa deploy (mềm); 5xx/mạng vẫn cứng.
{ const v = splitUndeployed(['/.well-known/assetlinks.json: HTTP 404', '/x: thiếu "abc"', '/api/config: HTTP 500', '/y: lỗi mạng']);
  assert.deepEqual(v.soft, ['/.well-known/assetlinks.json: HTTP 404', '/x: thiếu "abc"']); assert.deepEqual(v.hard, ['/api/config: HTTP 500', '/y: lỗi mạng']); }
assert.ok(/verified: '\$\{\{ steps\.smoke\.outputs\.verified/.test(pr) && (pr.match(/needs\.smoke\.outputs\.verified != 'false'/g) || []).length === 2, 'mark + ota chỉ chạy khi smoke xác minh được commit');
console.log('✓ ci-guards: làn nhanh (7 workflow nặng) · main-red · ngân sách vàng · wip-guard · chỉ số web/ hằng ngày');
