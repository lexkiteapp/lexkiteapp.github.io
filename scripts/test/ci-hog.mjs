// ci-hog: giám sát chống mù runner (ci-triage sweep mỗi 3 giờ). Hồi quy 03/11: required-gate ~20 lượt workflow_run / sha PR,
// 43 % số lượt, 771 phút-runner / 2 h → phải báo. Không gọi mạng (gh giả).
import assert from 'node:assert/strict';
import { shardedNames, hogReport, syncIssue, fetchRuns, RUN_SHARE, MIN_SHARE, PER_SHA, MARK } from '../ci/ci-hog.mjs';
const T0 = Date.parse('2026-11-03T00:00:00Z');
const run = (name, i, { event = 'pull_request', sha = 's' + i, min = 5, conclusion = 'success', pr = false } = {}) => ({ name, event, head_sha: sha, status: 'completed', conclusion,
  run_started_at: new Date(T0 + i * 6e4).toISOString(), updated_at: new Date(T0 + i * 6e4 + min * 6e4).toISOString(), pull_requests: pr ? [{ number: 1 }] : [] });
// bình thường: 10 workflow đều nhau, mỗi sha PR 1 lượt → không báo
const ok = []; for (let w = 0; w < 10; w++) for (let i = 0; i < 60; i++) ok.push(run('w' + w, i));
assert.equal(hogReport(ok).bad.length, 0, 'phân bố đều → không báo');
// sự cố 03/11: required-gate = workflow_run của 20 workflow / sha PR, mỗi lượt 2 phút
const inc = [...ok]; for (let s = 0; s < 30; s++) for (let k = 0; k < 20; k++) inc.push(run('required-gate', s * 20 + k, { event: 'workflow_run', sha: 'pr' + s, min: 2, pr: true }));
const r = hogReport(inc), g = r.bad.find(b => b.name === 'required-gate');
assert.ok(g && /số lượt/.test(g.why) && /sha PR/.test(g.why), 'required-gate kiểu cũ → báo cả % lượt lẫn lượt/sha: ' + JSON.stringify(r.bad));
assert.equal(r.bad.length, 1, 'chỉ báo workflow vi phạm');
assert.ok(/required-gate/.test(r.md) && r.md.includes('| Workflow |'), 'bảng tóm tắt job');
// phút-runner > 15 % dù số lượt ít
const heavy = [...ok]; for (let i = 0; i < 60; i++) heavy.push(run('render', i, { min: 60, event: 'schedule' }));
assert.ok(hogReport(heavy).bad.some(b => b.name === 'render' && /phút-runner/.test(b.why)), 'phút > 15 % → báo');
// skipped không tính phút; workflow < 50 lượt không xét % (ngày vắng)
assert.equal(hogReport([run('a', 1, { conclusion: 'skipped', min: 600 }), run('b', 2)]).minutes, 5, 'skipped không tính phút');
assert.equal(hogReport([run('lẻ', 1, { min: 300, event: 'schedule' })]).bad.length, 0, '< 50 lượt → không xét %');
// 1 lần chạy lại trên 1 sha không báo (trung vị); dây chuyền 4 lượt/sha → báo
const rr = [...ok]; for (let s = 0; s < 10; s++) rr.push(run('w0', 100 + s, { sha: 's' + s }));
assert.equal(hogReport(rr).bad.length, 0, 'chạy lại lẻ tẻ không báo');
const ch = [...ok]; for (let s = 0; s < 10; s++) for (let k = 0; k < 4; k++) ch.push(run('chain', s * 4 + k, { event: 'workflow_run', sha: 'c' + s, pr: true }));
assert.ok(hogReport(ch).bad.some(b => b.name === 'chain'), `> ${PER_SHA} lượt/sha PR → báo`);
assert.ok(RUN_SHARE === 0.2 && MIN_SHARE === 0.15 && PER_SHA === 3, 'ngưỡng khớp docs/CI-RUNNERS.md');
// issue: mở khi vượt, cập nhật, tự đóng khi hết
const calls = []; let issues = [];
const gh = async (p, o = {}) => { calls.push([o.method || 'GET', p]); if (p.startsWith('/issues?')) return issues; if (o.method === 'POST') { issues = [{ number: 9, body: o.body.body }]; return issues[0]; } return {}; };
assert.equal(await syncIssue(gh, r), 'opened'); assert.ok(issues[0].body.includes(MARK));
assert.equal(await syncIssue(gh, r), 'updated');
assert.equal(await syncIssue(gh, { bad: [], md: '' }), 'closed');
// đọc 24 h: chia cửa sổ (API ≤ 1.000 kết quả / truy vấn), phân trang tới trang < 100
const seen = []; const gh2 = async p => { seen.push(p); return { workflow_runs: Array.from({ length: seen.length === 1 ? 100 : 3 }, () => ({})) }; };
const all = await fetchRuns(gh2, T0, 24, 2);
assert.equal(seen.length, 13, '12 cửa sổ 2 giờ + 1 trang thêm'); assert.equal(all.length, 100 + 12 * 3);
// #1076 (12/11): workflow chia shard có chủ đích không bị báo vì % phút thô, nhưng lượt thừa (> 2 lượt/sha) và phút của workflow KHÔNG chia shard vẫn bị bắt
const sh = [...ok]; for (let i = 0; i < 60; i++) sh.push(run('npm test', i, { min: 60 }));
assert.ok(hogReport(sh).bad.some(b => b.name === 'npm test' && /phút-runner/.test(b.why)), 'không khai báo shard → % phút vẫn báo');
assert.equal(hogReport(sh, new Set(['npm test'])).bad.length, 0, 'khai báo shard, 1 lượt/sha → không báo');
const shr = [...ok]; for (let s = 0; s < 10; s++) for (let k = 0; k < 3; k++) shr.push(run('npm test', 200 + s * 3 + k, { sha: 'q' + s }));
assert.ok(hogReport(shr, new Set(['npm test'])).bad.some(b => /lượt \/ sha/.test(b.why)), 'chia shard mà 3 lượt/sha → vẫn báo lượt thừa');
assert.ok(shardedNames().has('npm test'), 'npm-test.yml có dấu "ci-policy: matrix" → được nhận là chia shard');
console.log('✓ ci-hog: ngưỡng lượt/phút/lượt-sha, issue tự mở/đóng, đọc 24 h theo cửa sổ');
