// cron-watch (scripts/ci/cron-watch.mjs, ci-triage sweep mỗi giờ): báo đỏ workflow có cron mà > 3 khoảng lịch không chạy hoặc bị tắt ngoài ý muốn.
// Hồi quy 02/11: ci-filler bật lại 03:47Z nhưng 0 lượt schedule → phải đỏ sau ≤ 60 phút. Không gọi mạng (gh giả).
import assert from 'node:assert/strict'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
import { maxGap, limitMin, cronsOf, verdict, cronWatch, syncIssue, OFF_OK, FLOOR_MIN, MARK } from '../ci/cron-watch.mjs';

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
  if (p.startsWith('/actions/workflows?')) return { workflows: [{ id: 1, path: '.github/workflows/ci-filler.yml', state: 'active', updated_at: '2026-11-02T03:47:12Z' }, { id: 2, path: '.github/workflows/ok.yml', state: 'active', updated_at: '2026-10-01T00:00:00Z' }, { id: 3, path: '.github/workflows/manual.yml', state: 'active' }] };
  if (p.startsWith('/actions/workflows/1/runs')) return { workflow_runs: lastFiller ? [{ created_at: lastFiller }] : [] };
  if (p.startsWith('/actions/workflows/2/runs')) return { workflow_runs: [{ created_at: '2026-11-02T04:44:00Z' }] };
  if (p.startsWith('/issues?')) return issues;
  return {};
} }; };
let g = mk('2026-11-01T16:00:00Z'), r = await cronWatch(g.gh, { now: T, wfDir: wfd, root: dir });
assert.deepEqual(r.bad.map(b => b.file), ['ci-filler.yml']); assert.ok(g.calls.includes('PUT /actions/workflows/1/disable') && g.calls.includes('PUT /actions/workflows/1/enable'));
assert.ok(!g.calls.some(c => c.includes('/workflows/3/runs'))); assert.match(r.md, /ci-filler\.yml/);
assert.equal(await syncIssue(g.gh, r), 'opened'); assert.ok(g.calls.includes('POST /issues'));
g = mk('2026-11-02T04:44:00Z', [{ number: 9, body: MARK + '\nx' }]); r = await cronWatch(g.gh, { now: T, wfDir: wfd, root: dir });
assert.equal(r.bad.length, 0); assert.equal(await syncIssue(g.gh, r), 'closed'); assert.ok(g.calls.includes('PATCH /issues/9'));
// sweep gọi cron-watch mỗi giờ (trước nhánh chỉ-giờ-00) + checkout đủ tệp cần đọc
const tri = fs.readFileSync('scripts/ci/triage.mjs', 'utf8'); assert.ok(tri.indexOf("import('./cron-watch.mjs')") < tri.indexOf('getUTCHours() !== 0'));
assert.match(fs.readFileSync('.github/workflows/ci-triage.yml', 'utf8'), /\.github\/workflows\\nweb\/free-tier-state\.json/);
console.log('✓ cron-watch: khoảng lịch, quá hạn 3× (sàn 60 phút), tắt ngoài ý muốn, đá lại lịch, issue mở/đóng');
