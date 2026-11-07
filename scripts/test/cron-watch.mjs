// cron-watch (scripts/ci/cron-watch.mjs, ci-triage sweep mỗi giờ): báo đỏ workflow có cron mà > 3 khoảng lịch không chạy hoặc bị tắt ngoài ý muốn.
// Hồi quy 02/11: ci-filler bật lại 03:47Z nhưng 0 lượt schedule → phải đỏ sau ≤ 60 phút. Không gọi mạng (gh giả).
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { maxGap, limitMin, cronsOf, verdict, cronWatch, syncIssue, OFF_OK, FLOOR_MIN, MARK, BACKFILL_MAX, dispatchable, backfillOrder, KICK_SETTLE_MS, KICK_EVERY_MS } from '../ci/cron-watch.mjs';
import { isZombie, zombieRuns, stuckJobs } from '../ci/zombie.mjs'; import { activeWorkflows } from '../ci/filler.mjs';

assert.equal(maxGap(['4-59/10 * * * *']), 10); assert.equal(maxGap(['17 * * * *']), 60); assert.equal(maxGap(['35 1 * * *', '17 * * * *']), 60);
assert.equal(maxGap(['0 1 * * 1']), 7 * 1440); assert.equal(maxGap(['40 2,4,7,10,13,16,19,22 * * *']), 4 * 60);
assert.deepEqual(cronsOf("on:\n  schedule:\n    - cron: '4-59/10 * * * *'\n    - cron: \"0 1 * * 1\"\n"), ['4-59/10 * * * *', '0 1 * * 1']);
const T = Date.parse('2026-11-02T04:50:00Z'), en = Date.parse('2026-11-02T03:47:12Z'), m = x => T - x * 6e4;
// ci-filler 02/11: bật lại 03:47, lượt schedule cuối 01/11 → 63 phút > sàn 60 → đỏ
const filler = { file: 'ci-filler.yml', state: 'active', crons: ['4-59/10 * * * *'], since: en, lastSched: Date.parse('2026-11-01T16:00:00Z') };
assert.equal(verdict(filler, T).kind, 'stale'); assert.equal(verdict(filler, en + 59 * 6e4), null); // chưa tới sàn 60 phút
assert.equal(verdict({ ...filler, lastSched: m(20) }, T), null);
// cron mới mỗi giờ (free-tier-guard '17 * * * *'): 3 × 60 = 180 phút
const ftg = { file: 'free-tier-guard.yml', state: 'active', crons: ['35 1 * * *', '17 * * * *'], since: m(200), lastSched: 0 };
assert.equal(verdict(ftg, T).kind, 'stale'); assert.equal(verdict({ ...ftg, since: m(170) }, T), null);
// tắt: có chủ ý (OFF_OK / paused) → không đỏ; ngoài ý muốn → đỏ; không cron → bỏ
assert.ok(OFF_OK['video.yml']); assert.equal(verdict({ file: 'video.yml', state: 'disabled_manually', crons: ['0 3 * * *'] }, T), null);
assert.equal(verdict({ file: 'ci-filler.yml', state: 'disabled_manually', crons: ['4-59/10 * * * *'] }, T).kind, 'off');
assert.equal(verdict({ file: 'ci-filler.yml', state: 'disabled_manually', crons: ['4-59/10 * * * *'] }, T, { paused: new Set(['ci-filler.yml']) }), null); // free-tier guard dừng
assert.equal(verdict({ file: 'x.yml', state: 'disabled_manually', crons: [] }, T), null);
// 3/11: quality-sweep ('40 22 * * *') mất lượt đêm 2/11 – lịch đêm báo sau 24 h + 6 h, không đợi 3 ngày; tuần: 7 ngày + 6 h
assert.equal(limitMin(1440), 1800); assert.equal(limitMin(7 * 1440), 7 * 1440 + 360); assert.equal(limitMin(60), 180); assert.equal(limitMin(10), 60);
const qs = { file: 'quality-sweep.yml', state: 'active', crons: ['40 22 * * *'], since: 0, lastSched: Date.parse('2026-11-01T23:11:08Z') };
assert.equal(verdict(qs, Date.parse('2026-11-03T05:30:00Z')).kind, 'stale'); assert.equal(verdict(qs, Date.parse('2026-11-02T23:30:00Z')), null); assert.equal(FLOOR_MIN, 60);

// cronWatch + syncIssue với gh giả: phát hiện, đá lại lịch, mở issue; hết lỗi → đóng
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cw-')), wfd = path.join(dir, 'wf'); fs.mkdirSync(wfd);
fs.writeFileSync(path.join(wfd, 'ci-filler.yml'), "on:\n  schedule:\n    - cron: '4-59/10 * * * *'\n");
fs.writeFileSync(path.join(wfd, 'ok.yml'), "on:\n  schedule:\n    - cron: '4-59/10 * * * *'\n");
fs.writeFileSync(path.join(wfd, 'manual.yml'), "on:\n  workflow_dispatch:\n");
const mk = (lastFiller, issues = []) => { const calls = []; return { calls, gh: async (p, o = {}) => {
  calls.push(`${o.method || 'GET'} ${p}`);
  if (p.startsWith('/actions/workflows?')) return { workflows: [{ id: 1, path: '.github/workflows/ci-filler.yml', state: 'active', updated_at: '2026-11-01T03:47:12Z' }, { id: 2, path: '.github/workflows/ok.yml', state: 'active', updated_at: '2026-10-01T00:00:00Z' }, { id: 3, path: '.github/workflows/manual.yml', state: 'active' }] };
  if (p.startsWith('/actions/workflows/1/runs')) return { workflow_runs: lastFiller ? [{ created_at: lastFiller }] : [] };
  if (p.startsWith('/actions/workflows/2/runs')) return { workflow_runs: [{ created_at: '2026-11-02T04:44:00Z' }] };
  if (p.startsWith('/issues?')) return issues;
  return {};
} }; };
let g = mk('2026-11-01T16:00:00Z'), r = await cronWatch(g.gh, { now: T, wfDir: wfd, root: dir, settleMs: 0 });
assert.deepEqual(r.bad.map(b => b.file), ['ci-filler.yml']); assert.ok(g.calls.includes('PUT /actions/workflows/1/disable') && g.calls.includes('PUT /actions/workflows/1/enable'));
assert.ok(!g.calls.some(c => c.includes('/workflows/3/runs'))); assert.match(r.md, /ci-filler\.yml/);
assert.equal(await syncIssue(g.gh, r), 'opened'); assert.ok(g.calls.includes('POST /issues'));
g = mk('2026-11-02T04:44:00Z', [{ number: 9, body: MARK + '\nx' }]); r = await cronWatch(g.gh, { now: T, wfDir: wfd, root: dir, settleMs: 0 });
assert.equal(r.bad.length, 0); assert.equal(await syncIssue(g.gh, r), 'closed'); assert.ok(g.calls.includes('PATCH /issues/9'));
// sweep gọi cron-watch mỗi giờ (trước nhánh chỉ-giờ-00) + checkout đủ tệp cần đọc
const tri = fs.readFileSync('scripts/ci/triage.mjs', 'utf8'); assert.ok(tri.indexOf("import('./cron-watch.mjs')") < tri.indexOf('!digestDue(now, force)'));
assert.match(fs.readFileSync('.github/workflows/ci-triage.yml', 'utf8'), /\.github\/workflows\\nweb\/free-tier-state\.json/);
// hồi quy 02/11 (kịch bản thật): free-tier-guard '17 * * * *' lượt schedule cuối 11:22Z, ci-triage '*/10' cuối 13:12Z (đổi sang cron) → 20:46Z.
{ const at = h => Date.parse('2026-11-02T' + h + 'Z');
  const ftg2 = { file: 'free-tier-guard.yml', state: 'active', crons: ['35 1 * * *', '17 * * * *'], since: Date.parse('2026-11-02T13:55:43Z'), lastSched: at('11:22:04') };
  assert.equal(verdict(ftg2, at('16:55:00')), null); assert.equal(verdict(ftg2, at('16:57:00')).kind, 'stale');   // since = lần chạm workflow (#418) + 180 phút
  const tri = { file: 'ci-triage.yml', state: 'active', crons: ['*/10 * * * *', '12 * * * *'], since: Date.parse('2026-11-02T13:12:37Z'), lastSched: at('11:02:53') };
  assert.equal(verdict(tri, at('14:13:00')).kind, 'stale', 'ci-triage tự nó trễ lịch > 60 phút cũng phải đỏ – cron-watch chạy trong bộ canh required-gate (không phụ thuộc cron ci-triage)'); }
// hồi quy 03/11 00–03Z: GitHub bỏ lịch hàng loạt (cả repo 13 lượt schedule) → bù lượt bằng dispatch: free-tier-guard trước, trần 5, chống trùng
{ const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'cwb-')), w2 = path.join(d2, 'wf'); fs.mkdirSync(w2); fs.mkdirSync(path.join(d2, 'infra'));
  const names = ['free-tier-guard.yml', 'vocab-img-scene.yml', 'a1.yml', 'a2.yml', 'a3.yml', 'a4.yml', 'a5.yml', '0busy.yml', '0req.yml'];
  for (const n of names) fs.writeFileSync(path.join(w2, n), `on:\n  schedule:\n    - cron: '17 * * * *'\n  workflow_dispatch:\n${n === '0req.yml' ? "    inputs:\n      x:\n        required: true\n" : ''}`);
  fs.writeFileSync(path.join(d2, 'infra/jobs.json'), JSON.stringify({ jobs: [{ id: 'v', workflow: 'vocab-img-scene.yml' }] }));
  const now = Date.parse('2026-11-03T03:00:00Z'), calls = [];
  const gh = async (p, o = {}) => { calls.push(`${o.method || 'GET'} ${p}`);
    if (p.startsWith('/actions/workflows?')) return { workflows: names.map((n, i) => ({ id: i + 1, path: '.github/workflows/' + n, state: 'active', updated_at: '2026-11-01T13:55:43Z' })) };
    const m = p.match(/^\/actions\/workflows\/(\d+)\/runs\?(.*)$/); if (m) { const n = names[m[1] - 1];
      if (m[2].includes('event=schedule')) return { workflow_runs: [{ created_at: '2026-11-02T22:17:00Z' }] };
      return { workflow_runs: [n === '0busy.yml' ? { status: 'queued', event: 'workflow_dispatch', created_at: '2026-11-03T02:59:00Z' } : { status: 'completed', event: 'schedule', created_at: '2026-11-02T22:17:00Z' }] }; }
    return {}; };
  const slept = []; const r = await cronWatch(gh, { now, wfDir: w2, root: d2, sleep: async ms => { slept.push([ms, calls.filter(c => c.endsWith('/dispatches')).length]); } });
  assert.deepEqual(slept, [[KICK_SETTLE_MS, 0]], 'đá lịch xong phải chờ TRƯỚC khi dispatch bù (không sinh lượt zombie)');
  const disp = calls.filter(c => c.endsWith('/dispatches')).map(c => names[+c.match(/workflows\/(\d+)/)[1] - 1]);
  assert.equal(disp[0], 'free-tier-guard.yml', 'free-tier-guard bù trước tiên'); assert.equal(disp[1], 'vocab-img-scene.yml', 'rồi job trong infra/jobs.json');
  assert.equal(disp.length, BACKFILL_MAX, 'trần bù mỗi lần gọi'); assert.ok(!disp.includes('0busy.yml') && !disp.includes('0req.yml'), 'không bù khi đang có lượt chờ / input bắt buộc');
  assert.ok(r.bad.find(b => b.file === '0busy.yml').why.includes('không bù') && r.bad.find(b => b.file === '0req.yml').why.includes('không bù được'));
  assert.ok(dispatchable("on:\n  workflow_dispatch:\n    inputs:\n      a: { description: 'x', default: '1' }\n") && !dispatchable("on:\n  schedule:\n    - cron: '1 * * * *'\n"));
  assert.deepEqual(backfillOrder(['z.yml', 'free-tier-guard.yml', 'j.yml'], new Set(['j.yml'])), ['free-tier-guard.yml', 'j.yml', 'z.yml']); }
// lượt zombie: báo vào issue, thử huỷ (409 không làm hỏng lượt canh), không để nó chặn dispatch bù; lượt queued mới hoặc có job thì không tính
{ const now = Date.parse('2026-11-03T23:00:00Z'), old = { status: 'queued', created_at: '2026-11-03T16:40:33Z', path: '.github/workflows/d1-usage-watch.yml' }, calls = [];
  assert.ok(isZombie(old, now) && !isZombie({ ...old, created_at: '2026-11-03T22:00:00Z' }, now) && !isZombie({ ...old, status: 'in_progress' }, now));
  const runs = [{ ...old, id: 1 }, { ...old, id: 2 }, { ...old, id: 3, created_at: '2026-11-03T22:30:00Z' }];
  const gh = async (p, o = {}) => { calls.push(`${o.method || 'GET'} ${p}`);
    if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: runs };
    if (p.endsWith('/1/jobs?per_page=1')) return { total_count: 0 }; if (p.endsWith('/2/jobs?per_page=1')) return { total_count: 3 };
    if (p.endsWith('/1/cancel') || p.endsWith('/1/force-cancel')) throw new Error('GitHub POST /x → 409');
    return {}; };
  const z = await zombieRuns(gh, { now });
  assert.ok(calls.includes('POST /actions/runs/1/force-cancel') && !calls.includes('DELETE /actions/runs/1'), 'cancel 409 → thử force-cancel; chưa quá 24 giờ thì chưa DELETE'); assert.deepEqual(z.map(x => [x.id, x.cancel]), [[1, '409']], 'chỉ lượt quá hạn + 0 job; 409 được ghi lại');
  assert.ok(!calls.includes('GET /actions/runs/3/jobs?per_page=1'), 'lượt mới không tốn lệnh API');
  const wf = fs.mkdtempSync(path.join(os.tmpdir(), 'cwz-')); fs.writeFileSync(path.join(wf, 'd1-usage-watch.yml'), "on:\n  schedule:\n    - cron: '*/20 * * * *'\n  workflow_dispatch:\n");
  const disp = [], gh2 = async (p, o = {}) => {
    if (p.startsWith('/actions/workflows?')) return { workflows: [{ id: 7, path: '.github/workflows/d1-usage-watch.yml', state: 'active', updated_at: '2026-11-03T10:00:00Z' }] };
    if (p.includes('event=schedule')) return { workflow_runs: [{ created_at: '2026-11-03T15:00:00Z' }] };
    if (p.startsWith('/actions/workflows/7/runs')) return { workflow_runs: [old] };
    if (p.endsWith('/dispatches')) { disp.push(p); return {}; }
    if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: [{ ...old, id: 1 }] };
    if (p.endsWith('/1/jobs?per_page=1')) return { total_count: 0 };
    if (p.endsWith('/1/cancel') || p.endsWith('/1/force-cancel')) throw new Error('GitHub POST /x → 409');
    return {}; };
  const rz = await cronWatch(gh2, { now, wfDir: wf, root: wf, settleMs: 0 });
  assert.equal(disp.length, 1, 'lượt zombie không chặn dispatch bù'); assert.ok(rz.bad.some(b => b.kind === 'zombie') && /Lượt kẹt queued/.test(rz.md) && /DELETE \/actions\/runs\/1/.test(rz.md), 'zombie vào bad + md');
  assert.ok(!activeWorkflows([{ ...old }], now).size && activeWorkflows([{ ...old, created_at: '2026-11-03T22:30:00Z' }], now).has('d1-usage-watch.yml'), 'ci-filler không coi zombie là đang chạy');
  // 05/11: zombie > 24 giờ mà cancel + force-cancel đều 409 → DELETE (lượt 26/10 nằm 10 ngày vì issue chỉ ghi "chỉ còn DELETE")
  const del = [], gh3 = async (p, o = {}) => { if (o.method) del.push(`${o.method} ${p}`);
    if (p === '/actions/runs/9') return del.includes('DELETE /actions/runs/9') ? null : { id: 9, status: 'queued' };
    if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: [{ ...old, id: 9, created_at: '2026-10-26T04:23:15Z' }] };
    if (p.endsWith('/9/jobs?per_page=1')) return { total_count: 0 };
    if (/\/9\/(force-)?cancel$/.test(p)) throw new Error('GitHub POST /x → 409');
    return {}; };
  const z3 = await zombieRuns(gh3, { now }); assert.deepEqual(del, ['DELETE /actions/runs/9'], '06/11: lượt ≥ 24 giờ DELETE thẳng (cancel 409 / 202 giả không tốn lệnh + ngủ)');
  assert.equal(z3[0].deleted, true, 'zombie 10 ngày bị DELETE');
  assert.deepEqual((await zombieRuns(gh3, { now, cancel: false })).map(x => x.deleted), [undefined], 'cancel: false (chạy khô) không xoá gì');
  // job THẬT xếp hàng > 2 giờ → báo (không huỷ); job mới hoặc đang chạy thì không
  const gh4 = async (p, o = {}) => { assert.ok(!o.method, 'stuckJobs chỉ đọc');
    if (p.startsWith('/actions/runs?status=queued')) return { workflow_runs: [{ id: 5, path: '.github/workflows/teach-video.yml', created_at: '2026-11-03T18:00:00Z' }, { id: 6, path: '.github/workflows/qa-bot.yml', created_at: '2026-11-03T22:40:00Z' }] };
    if (p.startsWith('/actions/runs?status=in_progress')) return { workflow_runs: [{ id: 7, path: '.github/workflows/video.yml', created_at: '2026-11-03T18:00:00Z' }] };
    if (p.startsWith('/actions/runs/5/jobs')) return { jobs: [{ status: 'queued', created_at: '2026-11-03T18:05:00Z' }, { status: 'queued', created_at: '2026-11-03T19:00:00Z' }, { status: 'queued', created_at: '2026-11-03T22:00:00Z' }] };
    if (p.startsWith('/actions/runs/7/jobs')) return { jobs: [{ status: 'in_progress', created_at: '2026-11-03T18:05:00Z' }] };
    throw new Error('không được gọi ' + p); };
  assert.deepEqual(await stuckJobs(gh4, { now }), [{ id: 5, file: 'teach-video.yml', jobs: 2, min: 295 }], 'chỉ job queued > 3 giờ; lượt mới không tốn API'); }
assert.ok(isZombie({ status: 'queued', path: '.github/workflows/required-gate.yml', created_at: new Date(Date.now() - 20 * 6e4).toISOString() }) && !isZombie({ status: 'pending', path: '.github/workflows/required-gate.yml', created_at: new Date(Date.now() - 20 * 6e4).toISOString() }) && !isZombie({ status: 'queued', path: '.github/workflows/ci-triage.yml', created_at: new Date(Date.now() - 20 * 6e4).toISOString() }), 'required-gate kẹt sau 15 phút, workflow khác giữ 2 giờ');
// chưa từng có lượt schedule: báo 'never' dù vừa đá/bật lại (đá không reset đồng hồ), đá ≤ 1 lần/24 giờ, vẫn dispatch bù; workflow mới trong ngưỡng thì chưa báo
{ const now = Date.parse('2026-11-03T23:00:00Z'), created = Date.parse('2026-11-01T14:21:56Z'), crons = ['4-59/10 * * * *'];
  assert.equal(verdict({ file: 'ci-filler.yml', state: 'active', crons, since: now - 6e5, created, lastSched: 0 }, now).kind, 'never');
  assert.equal(verdict({ file: 'x.yml', state: 'active', crons, since: now - 6e5, created: now - 30 * 6e4, lastSched: 0 }, now), null);
  const wf = fs.mkdtempSync(path.join(os.tmpdir(), 'cwn-')); fs.writeFileSync(path.join(wf, 'ci-filler.yml'), "on:\n  schedule:\n    - cron: '4-59/10 * * * *'\n  workflow_dispatch:\n");
  const go = async updated => { const calls = [], gh = async (p, o = {}) => { calls.push(`${o.method || 'GET'} ${p}`);
      if (p.startsWith('/actions/workflows?')) return { workflows: [{ id: 5, path: '.github/workflows/ci-filler.yml', state: 'active', created_at: '2026-11-01T14:21:56Z', updated_at: updated }] };
      if (p.startsWith('/actions/workflows/5/runs')) return { workflow_runs: [] };
      return {}; };
    return { calls, r: await cronWatch(gh, { now, wfDir: wf, root: wf, sleep: async () => {} }) }; };
  const a = await go(new Date(now - 6e5).toISOString()); assert.ok(a.r.bad[0].kind === 'never' && /CHƯA TỪNG/.test(a.r.md), 'vừa đá vẫn báo'); assert.ok(!a.calls.some(c => c.endsWith('/disable')), 'đá trong 24 giờ: không đá lại'); assert.ok(a.calls.some(c => c.endsWith('/dispatches')), 'vẫn dispatch bù');
  const b = await go(new Date(now - KICK_EVERY_MS - 6e4).toISOString()); assert.ok(b.calls.some(c => c.endsWith('/disable')), 'quá 24 giờ: đá lại'); }
console.log('✓ cron-watch: khoảng lịch, quá hạn 3× (sàn 60 phút), tắt ngoài ý muốn, đá lại lịch, issue mở/đóng, lượt zombie (huỷ → force-cancel → DELETE sau 24 giờ), job xếp hàng > 3 giờ');
