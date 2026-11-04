// Nguồn kích cron ngoài GitHub (functions/api/cron-kick.js + _cronkick.js + workers/cronkick): khoá sai / request cũ / workflow ngoài danh sách bị từ chối,
// chống trùng, trần, kịch bản GitHub bỏ hết cron (03/11), Worker ký đúng + giới hạn giờ, hằng số khớp cron-watch + workflow thật. Không gọi mạng.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as K from '../../functions/api/_cronkick.js';
import { kick } from '../../functions/api/cron-kick.js';
import os from 'node:os'; import path from 'node:path'; import { pathToFileURL } from 'node:url';
import { limitMin, BACKFILL_MAX, cronsOf, maxGap, FLOOR_MIN, TIMES, LONG_GAP, GRACE_MIN } from '../ci/cron-watch.mjs';

// Worker (.js không có package type=module): nạp bản .mjs tạm với import trỏ tuyệt đối tới mô-đun thuần
const tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ck-')), 'w.mjs');
fs.writeFileSync(tmp, fs.readFileSync('workers/cronkick/index.js', 'utf8').replace("'../../functions/api/_cronkick.js'", JSON.stringify(pathToFileURL(path.resolve('functions/api/_cronkick.js')).href)));
const { run: workerRun, default: workerDef } = await import(pathToFileURL(tmp).href);
assert.equal(typeof workerDef.scheduled, 'function');

// (1) hằng số khớp cron-watch + khoảng lịch khớp workflow thật + C2 (khoá lạ không lọt qua bảng tra)
assert.equal(K.BACKFILL_MAX, BACKFILL_MAX); assert.deepEqual([K.FLOOR_MIN, K.TIMES, K.LONG_GAP, K.GRACE_MIN], [FLOOR_MIN, TIMES, LONG_GAP, GRACE_MIN]);
for (const g of [1, 10, 30, 60, 719, 720, 1440, 10080]) assert.equal(K.limitMin(g), limitMin(g), 'limitMin ' + g);
assert.deepEqual(K.ORDER, ['free-tier-guard.yml', 'required-gate.yml', 'ci-triage.yml']);
for (const [f, gap] of Object.entries(K.ALLOW)) assert.equal(maxGap(cronsOf(fs.readFileSync('.github/workflows/' + f, 'utf8'))), gap, f + ': khoảng lịch trong _cronkick.ALLOW lệch cron thật');
for (const bad of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'ci-filler.yml', '../x.yml', 'required-gate.yml/../x', '', null, undefined, 5]) assert.equal(K.isAllowed(bad), false, String(bad));
assert.equal(K.plan(K.ORDER, { constructor: { status: 'queued' } }).length, 3);

// (2) chữ ký + thời gian
const SECRET = 'k'.repeat(40), NOW = Date.parse('2026-11-03T03:00:00Z'), ts = String(NOW), body = JSON.stringify({ op: 'kick', wfs: K.ORDER });
const sig = await K.sign(SECRET, ts, body);
assert.match(sig, /^[0-9a-f]{64}$/); assert.equal(await K.verify(SECRET, ts, body, sig, NOW), 'ok');
assert.equal(await K.verify('x'.repeat(40), ts, body, sig, NOW), 'bad', 'khoá sai'); assert.equal(await K.verify(SECRET, ts, body + ' ', sig, NOW), 'bad', 'body bị sửa');
assert.equal(await K.verify(SECRET, String(NOW + 1), body, sig, NOW), 'bad', 'ts bị sửa'); assert.equal(await K.verify(SECRET, ts, body, sig.slice(0, 63), NOW), 'bad'); assert.equal(await K.verify(SECRET, ts, body, '', NOW), 'bad');
assert.equal(await K.verify('short', ts, body, await K.sign('short', ts, body), NOW), 'bad', 'khoá ngắn bị từ chối'); assert.equal(await K.verify('', ts, body, sig, NOW), 'bad');
assert.equal(await K.verify(SECRET, ts, body, sig, NOW + 5 * 6e4), 'ok'); assert.equal(await K.verify(SECRET, ts, body, sig, NOW + 5 * 6e4 + 1), 'stale'); assert.equal(await K.verify(SECRET, ts, body, sig, NOW - 6 * 6e4), 'stale');

// (3) endpoint với GitHub giả
const mkEnv = (o = {}) => ({ CRON_KICK_SECRET: SECRET, GH_DISPATCH_TOKEN: 'tok-secret-123', ...o });
const memLimit = () => { const m = new Map(); return async (key, max) => { const n = (m.get(key) || 0) + 1; m.set(key, n); return n > max ? 99 : 0; }; };
const req = async (b = body, { secret = SECRET, t = NOW, method = 'POST', sg } = {}) => new Request('https://lexkite.com/api/cron-kick', { method, headers: { 'X-Kick-Ts': String(t), 'X-Kick-Sig': sg ?? await K.sign(secret, t, b) }, body: method === 'POST' ? b : undefined });
const mkGh = lastBy => { const calls = []; return { calls, fetchGh: async (tok, path, init = {}) => { calls.push((init.method || 'GET') + ' ' + path + ' ' + tok);
  const f = path.split('/')[0]; if (path.includes('/runs')) return { ok: true, status: 200, json: async () => ({ workflow_runs: lastBy[f] ? [lastBy[f]] : [] }) };
  return { ok: true, status: 204 }; } }; };
const ago = m => new Date(NOW - m * 6e4).toISOString(), done = m => ({ status: 'completed', event: 'schedule', created_at: ago(m) });
const dispatched = g => g.calls.filter(c => c.startsWith('POST')).map(c => c.split(' ')[1].split('/')[0]);
const go = async (r, env = mkEnv(), g = mkGh({}), limit = memLimit()) => { const res = await kick(r, env, { now: NOW, limit, fetchGh: g.fetchGh }); return { res, body: await res.json(), g }; };

let o = await go(await req(body, { secret: 'z'.repeat(40) })); assert.equal(o.res.status, 401, 'khoá sai'); assert.equal(o.g.calls.length, 0);
o = await go(await req(body, { t: NOW - 6 * 6e4 })); assert.equal(o.res.status, 401); assert.equal(o.body.error, 'stale', 'request cũ'); assert.equal(o.g.calls.length, 0);
o = await go(await req(body, { sg: 'a'.repeat(64) })); assert.equal(o.res.status, 401); o = await go(await req(body, { sg: '' })); assert.equal(o.res.status, 401);
o = await go(await req(body, { method: 'GET' })); assert.equal(o.res.status, 405);
o = await go(await req(body), mkEnv({ CRON_KICK_SECRET: '' })); assert.equal(o.res.status, 503, 'thiếu khoá → tắt hẳn'); o = await go(await req(body), mkEnv({ GH_DISPATCH_TOKEN: '' })); assert.equal(o.res.status, 503);
o = await go(await req('x'.repeat(2000))); assert.equal(o.res.status, 413);
// workflow ngoài danh sách: ký đúng nhưng body liệt kê workflow lạ → 403, không gọi GitHub
for (const w of [['video.yml'], ['required-gate.yml', 'ci-filler.yml'], ['constructor'], ['__proto__'], ['../../x.yml']]) { const b = JSON.stringify({ op: 'kick', wfs: w }); o = await go(await req(b)); assert.equal(o.res.status, 403, w.join()); assert.equal(o.g.calls.length, 0); }
for (const b of ['not json', '{"op":"x"}', JSON.stringify({ op: 'kick', wfs: [] }), JSON.stringify({ op: 'kick', wfs: 'required-gate.yml' }), JSON.stringify({ op: 'kick', wfs: ['a', 'b', 'c', 'd'] })]) { o = await go(await req(b)); assert.equal(o.res.status, 400, b); }
// phát lại cùng chữ ký + giới hạn giờ (ở Pages)
{ const limit = memLimit(), r1 = await req(); const a = await go(r1.clone(), mkEnv(), mkGh({}), limit); assert.equal(a.res.status, 200); const b = await go(r1.clone(), mkEnv(), mkGh({}), limit); assert.equal(b.res.status, 409, 'phát lại');
  for (let i = 0; i < K.HOURLY_MAX - 1; i++) assert.equal((await go(await req(JSON.stringify({ op: 'kick', wfs: K.ORDER, n: i })), mkEnv(), mkGh({}), limit)).res.status, 200);
  const c = await go(await req(JSON.stringify({ op: 'kick', n: 'last' })), mkEnv(), mkGh({}), limit); assert.equal(c.res.status, 429); assert.ok(c.res.headers.get('Retry-After')); }
// lượt zombie (queued > 2 giờ, scripts/ci/zombie.mjs) không chặn lượt kích
assert.deepEqual(K.plan(['free-tier-guard.yml'], { 'free-tier-guard.yml': { status: 'queued', created_at: new Date(Date.now() - 500 * 6e4).toISOString() } }).map(p => p.act), ['dispatch']);
{ const q = (f, m) => K.plan([f], { [f]: { status: 'queued', created_at: new Date(Date.now() - m * 6e4).toISOString() } })[0].act;
  assert.deepEqual([q('required-gate.yml', 10), q('required-gate.yml', 20)], ['skip', 'dispatch'], 'required-gate kẹt queued > 15 phút → kích ngay, không chờ ngưỡng 90 phút');
  assert.equal(q('ci-triage.yml', 20), 'skip', 'workflow khác giữ nguyên ngưỡng 2 giờ');
  assert.deepEqual(K.plan(['required-gate.yml'], { 'required-gate.yml': { status: 'pending', created_at: new Date(Date.now() - 20 * 6e4).toISOString() } }).map(p => p.act), ['skip'], "'pending' = lượt nối khoẻ chờ concurrency"); }
// chống trùng: đang chờ/chạy, lượt mới trong ngưỡng → không dispatch; hết hạn → dispatch
o = await go(await req(), mkEnv(), mkGh({ 'free-tier-guard.yml': { status: 'queued', created_at: ago(100) }, 'required-gate.yml': { status: 'in_progress', created_at: ago(500) }, 'ci-triage.yml': done(30) }));
assert.deepEqual(dispatched(o.g), [], 'đang chờ/chạy + lượt gần đây → không dispatch'); assert.deepEqual(o.body.results.map(r => r.why.split(' ')[0]), ['in-flight', 'in-flight', 'recent']);
o = await go(await req(), mkEnv(), mkGh({ 'free-tier-guard.yml': done(179), 'required-gate.yml': done(89), 'ci-triage.yml': done(59) })); assert.deepEqual(dispatched(o.g), [], 'sát ngưỡng chưa bù');
o = await go(await req(), mkEnv(), mkGh({ 'free-tier-guard.yml': done(181), 'required-gate.yml': done(91), 'ci-triage.yml': done(61) })); assert.deepEqual(dispatched(o.g), K.ORDER, 'quá ngưỡng một chút → bù đủ');
// kịch bản 03/11: GitHub bỏ hết cron → mọi workflow quá hạn / không có lượt nào → dispatch đủ 3, đúng thứ tự, không quá trần
o = await go(await req(), mkEnv(), mkGh({ 'free-tier-guard.yml': done(700), 'required-gate.yml': done(400), 'ci-triage.yml': done(900) }));
assert.deepEqual(dispatched(o.g), ['free-tier-guard.yml', 'required-gate.yml', 'ci-triage.yml']); assert.ok(dispatched(o.g).length <= K.BACKFILL_MAX); assert.ok(o.g.calls.filter(c => c.startsWith('POST')).every(c => c.includes('dispatches')));
o = await go(await req(), mkEnv(), mkGh({})); assert.deepEqual(dispatched(o.g), K.ORDER, 'repo chưa có lượt nào');
o = await go(await req(JSON.stringify({ op: 'kick', wfs: ['ci-triage.yml', 'free-tier-guard.yml'] })), mkEnv(), mkGh({})); assert.deepEqual(dispatched(o.g), ['free-tier-guard.yml', 'ci-triage.yml'], 'thứ tự theo ưu tiên, không theo body');
// GitHub lỗi → không dispatch mù; dispatch bị từ chối → báo skip, token không lộ ra phản hồi
{ const g = { calls: [], fetchGh: async (t, p) => { g.calls.push(p); return p.includes('/runs') ? { ok: false, status: 502 } : { ok: true, status: 204 }; } }; o = await go(await req(), mkEnv(), g); assert.equal(g.calls.filter(c => c.includes('dispatches')).length, 0); assert.ok(o.body.results.every(r => r.why === 'github-error')); }
{ const g = { calls: [], fetchGh: async (t, p) => p.includes('/runs') ? { ok: true, json: async () => ({ workflow_runs: [] }) } : { ok: false, status: 403 } }; o = await go(await req(), mkEnv(), g); assert.ok(o.body.results.every(r => r.act === 'skip' && r.why === 'dispatch-403')); assert.ok(!JSON.stringify(o.body).includes('tok-secret')); }

// (4) Worker: ký đúng, đúng URL/body, giới hạn giờ, thiếu khoá thì không gọi
{ const calls = []; const f = async (u, init) => { calls.push({ u, init }); return { ok: true, json: async () => ({ ok: true }) }; }, T0 = Date.parse('2026-11-03T10:00:00Z');
  const r = await workerRun({ CRON_KICK_SECRET: SECRET }, T0, f); assert.deepEqual(r, { ok: true }); const c = calls[0];
  assert.equal(c.u, 'https://lexkite.com/api/cron-kick'); assert.equal(c.init.method, 'POST'); assert.equal(await K.verify(SECRET, c.init.headers['X-Kick-Ts'], c.init.body, c.init.headers['X-Kick-Sig'], T0), 'ok');
  assert.deepEqual(K.parseWfs(c.init.body), K.ORDER); assert.ok(!JSON.stringify(c).includes(SECRET));
  for (let i = 1; i < K.HOURLY_MAX; i++) await workerRun({ CRON_KICK_SECRET: SECRET }, T0 + i, f); assert.equal(calls.length, K.HOURLY_MAX);
  assert.deepEqual(await workerRun({ CRON_KICK_SECRET: SECRET }, T0 + 99, f), { skip: 'rate' }); assert.equal(calls.length, K.HOURLY_MAX);
  await workerRun({ CRON_KICK_SECRET: SECRET }, T0 + 36e5, f); assert.equal(calls.length, K.HOURLY_MAX + 1, 'giờ mới đếm lại');
  assert.deepEqual(await workerRun({}, T0 + 72e5, f), { skip: 'no-secret' }); assert.equal(calls.length, K.HOURLY_MAX + 1);
  const bad = await workerRun({ CRON_KICK_SECRET: SECRET }, T0 + 108e5, async () => ({ ok: false, status: 401 })); assert.deepEqual(bad, { error: 401 }); }
// (5) cấu hình: cron */30, sổ việc + bí mật không commit
assert.match(fs.readFileSync('workers/cronkick/wrangler.toml', 'utf8'), /crons = \["\*\/30 \* \* \* \*"\]/);
assert.ok(JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8')).jobs.some(j => j.id === 'cron-kick' && j.worker === 'workers/cronkick' && j.cron[0] === '*/30 * * * *'));
assert.ok(!/CRON_KICK_SECRET\s*=/.test(fs.readFileSync('workers/cronkick/wrangler.toml', 'utf8')));
console.log('✓ cron-kick: khoá sai/ts cũ/ngoài danh sách bị từ chối, chống trùng, kịch bản bỏ hết cron, Worker ký + giới hạn giờ');
