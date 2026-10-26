// Test free-tier-guard (scripts/free-tier/*) + workers/lib/edge.mjs – không gọi mạng (fetch/cache giả). docs/FREE-TIER.md
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluate, markdown, r2Class, level, LIMITS, WARN, ALERT } from '../free-tier/limits.mjs';
import { cfUsage, pagesBuilds, writeState } from '../free-tier/guard.mjs';
import { edgeCached, mode, _resetMode, shedRobots, cacheControl, STATE_URL } from '../../workers/lib/edge.mjs';

let n = 0; const ok = (name, fn) => Promise.resolve().then(fn).then(() => { n++; }, e => { console.error('✗ ' + name); throw e; });

// ngưỡng: không hạ (no-cuts) – 60 % cảnh báo, 80 % issue; trần đúng tài liệu Cloudflare/GitHub
await ok('thresholds', () => { assert.equal(WARN, 0.6); assert.equal(ALERT, 0.8); assert.equal(level(0.59), 'ok'); assert.equal(level(0.6), 'warn'); assert.equal(level(0.8), 'alert'); });
await ok('limits', () => {
  assert.equal(LIMITS.cf_requests.limit, 100000); assert.equal(LIMITS.pages_builds.limit, 500); assert.equal(LIMITS.pages_files.limit, 20000);
  assert.equal(LIMITS.r2_storage.limit, 10 * 1024 ** 3); assert.equal(LIMITS.r2_class_a.limit, 1e6); assert.equal(LIMITS.r2_class_b.limit, 10e6);
  assert.equal(LIMITS.d1_reads.limit, 5e6); assert.equal(LIMITS.d1_writes.limit, 1e5); assert.equal(LIMITS.gh_repo.limit, 1024 ** 3);
  for (const [k, L] of Object.entries(LIMITS)) assert.ok(L.action && L.label, k + ' thiếu action/label');
});
await ok('r2 class', () => { assert.equal(r2Class('PutObject'), 'a'); assert.equal(r2Class('ListObjects'), 'a'); assert.equal(r2Class('GetObject'), 'b'); assert.equal(r2Class('HeadObject'), 'b'); assert.equal(r2Class('DeleteObject'), 'free'); });

await ok('evaluate + shed', () => {
  const ev = evaluate([{ key: 'cf_requests', value: 85000 }, { key: 'd1_writes', value: 65000 }, { key: 'd1_reads', value: 10 }, { key: 'nope', value: 1 }, { key: 'pages_builds', value: NaN }]);
  assert.equal(ev.rows.length, 3); assert.equal(ev.rows[0].key, 'cf_requests'); assert.equal(ev.worst, 'alert'); assert.equal(ev.mode, 'shed');
  assert.deepEqual(ev.alerts.map(r => r.key), ['cf_requests']); assert.equal(ev.rows[1].level, 'warn');
  const md = markdown(ev, { date: '2026-10-26', skipped: ['x'] }); assert.match(md, /🔴/); assert.match(md, /Hành động đề xuất/); assert.match(md, /⏭ x/); assert.match(md, /shed/);
  assert.equal(evaluate([{ key: 'cf_requests', value: 79999 }]).mode, 'normal');
});
await ok('soft limit never opens issue', () => { const ev = evaluate([{ key: 'gh_cache', value: 11 * 1024 ** 3 }]); assert.equal(ev.rows[0].level, 'warn'); assert.equal(ev.alerts.length, 0); });
await ok('per-row action override', () => { assert.equal(evaluate([{ key: 'gh_repo', value: 1, action: 'X' }]).rows[0].action, 'X'); });

await ok('cfUsage', () => {
  const a = {
    wk: [{ dimensions: { date: '2026-10-25', scriptName: 'lexkite-audio' }, sum: { requests: 6000 } }, { dimensions: { date: '2026-10-24', scriptName: 'lexkite-audio' }, sum: { requests: 20000 } }],
    fn: [{ dimensions: { date: '2026-10-25' }, sum: { requests: 4000 } }],
    d1: [{ dimensions: { date: '2026-10-25', databaseId: '7ce39cd0-9333-4843-bd6f-5ccbefbde670' }, sum: { rowsRead: 100, rowsWritten: 50 } }, { dimensions: { date: '2026-10-25', databaseId: 'other' }, sum: { rowsRead: 9e9, rowsWritten: 9e9 } }],
    r2s: [{ dimensions: { bucketName: 'b' }, max: { payloadSize: 1000, metadataSize: 24 } }],
    r2o: [{ dimensions: { actionType: 'PutObject' }, sum: { requests: 3 } }, { dimensions: { actionType: 'GetObject' }, sum: { requests: 7 } }, { dimensions: { actionType: 'DeleteObject' }, sum: { requests: 9 } }],
  };
  const u = Object.fromEntries(cfUsage({ a, y: '2026-10-25' }).map(x => [x.key, x]));
  assert.equal(u.cf_requests.value, 10000); assert.match(u.cf_requests.note, /đỉnh 7 ngày 20000/); assert.match(u.cf_requests.note, /lexkite-audio 6000/);
  assert.equal(u.d1_reads.value, 100); assert.equal(u.d1_writes.value, 50); // DB khác không tính vào lexkite-sync
  assert.equal(u.r2_storage.value, 1024); assert.equal(u.r2_class_a.value, 3); assert.equal(u.r2_class_b.value, 7);
  const u2 = Object.fromEntries(cfUsage({ a, y: '2026-10-25' }, { second: true }).map(x => [x.key, x]));
  assert.ok(u2.cf_requests_2 && u2.d1b_writes && !u2.r2_storage); assert.equal(u2.d1b_writes.value, 9e9 + 50); // tài khoản 2: mọi DB
});

await ok('pagesBuilds skips [CF-Pages-Skip], stops at month start', async () => {
  const now = Date.parse('2026-10-26T05:00:00Z'); let calls = 0;
  const dep = (d, msg, env = 'production') => ({ created_on: d + 'T01:00:00Z', environment: env, deployment_trigger: { metadata: { commit_message: msg } } });
  const pages = [[dep('2026-10-26', 'a'), dep('2026-10-25', 'b [CF-Pages-Skip]'), dep('2026-10-20', 'c', 'preview')], [dep('2026-10-01', 'd'), dep('2026-09-30', 'old')], [dep('2026-09-01', 'never')]];
  const f = async url => { calls++; const p = +new URL(url).searchParams.get('page'); return { ok: true, json: async () => ({ success: true, result: pages[p - 1] || [] }) }; };
  const r = await pagesBuilds('t', 'a', 'lexkite', now, f);
  assert.equal(r.value, 3); assert.equal(calls, 2); assert.match(r.note, /1 preview/);
});

await ok('writeState only on change', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ft-')), 's.json');
  assert.equal(writeState('normal', 0, f), true); assert.equal(writeState('normal', 1, f), false); assert.equal(writeState('shed', 2, f), true);
  assert.equal(JSON.parse(fs.readFileSync(f, 'utf8')).mode, 'shed');
});
await ok('committed state file valid', () => { const j = JSON.parse(fs.readFileSync('web/free-tier-state.json', 'utf8')); assert.ok(['normal', 'shed'].includes(j.mode)); });

// ---- workers/lib/edge.mjs
class FakeCache { constructor() { this.m = new Map(); } async match(k) { const r = this.m.get(k.url); return r ? r.clone() : undefined; } async put(k, r) { this.m.set(k.url, r.clone()); } }
const req = u => new Request(u);
await ok('edgeCached miss → hit → stale (SWR) → shed-hit', async () => {
  const cache = new FakeCache(); let produced = 0; const waits = [];
  const ctx = { waitUntil: p => waits.push(p) };
  const produce = async () => { produced++; return new Response('v' + produced, { status: 200, headers: { 'Content-Type': 'text/html', 'Cache-Control': 'public, max-age=3600' } }); };
  const t0 = 1e12;
  let r = await edgeCached(req('https://x.test/vi/tu-dien/a/?utm=1'), ctx, produce, { cache, fresh: 60, now: t0 }); await Promise.all(waits);
  assert.equal(r.headers.get('x-lexkite-edge'), 'miss'); assert.equal(await r.text(), 'v1'); assert.equal(r.headers.get('Cache-Control'), 'public, max-age=3600'); // header trình duyệt giữ nguyên
  r = await edgeCached(req('https://x.test/vi/tu-dien/a/'), ctx, produce, { cache, fresh: 60, now: t0 + 30e3 });
  assert.equal(r.headers.get('x-lexkite-edge'), 'hit'); assert.equal(await r.text(), 'v1'); assert.equal(produced, 1); assert.equal(r.headers.get('x-lexkite-stored'), null);
  r = await edgeCached(req('https://x.test/vi/tu-dien/a/'), ctx, produce, { cache, fresh: 60, now: t0 + 120e3 }); await Promise.all(waits);
  assert.equal(r.headers.get('x-lexkite-edge'), 'stale'); assert.equal(await r.text(), 'v1'); assert.equal(produced, 2); // trả cũ ngay, làm mới nền
  r = await edgeCached(req('https://x.test/vi/tu-dien/a/'), ctx, produce, { cache, fresh: 60, now: t0 + 999e6, shed: true });
  assert.equal(r.headers.get('x-lexkite-edge'), 'shed-hit'); assert.equal(await r.text(), 'v2'); assert.equal(produced, 2); // shed: không làm mới
});
await ok('edgeCached does not store non-200', async () => {
  const cache = new FakeCache(); let produced = 0;
  const produce = async () => { produced++; return new Response('nf', { status: 404 }); };
  await edgeCached(req('https://x.test/z'), null, produce, { cache }); const r = await edgeCached(req('https://x.test/z'), null, produce, { cache });
  assert.equal(r.status, 404); assert.equal(produced, 2); assert.equal(cache.m.size, 0);
});
await ok('mode() reads state, memoizes, fails open', async () => {
  _resetMode(); let calls = 0;
  const f = async u => { calls++; assert.equal(u, STATE_URL); return { ok: true, json: async () => ({ mode: 'shed' }) }; };
  assert.equal(await mode(f, 1e6), 'shed'); assert.equal(await mode(f, 1e6 + 1000), 'shed'); assert.equal(calls, 1);
  _resetMode(); assert.equal(await mode(async () => { throw new Error('down'); }, 1), 'normal');
  _resetMode(); assert.equal(await mode(async () => ({ ok: true, json: async () => ({ mode: 'weird' }) }), 1), 'normal');
});
await ok('shedRobots + cacheControl', () => {
  assert.equal(shedRobots(new Headers(), { shed: true, pilot: true }).get('X-Robots-Tag'), 'noindex, follow');
  assert.equal(shedRobots(new Headers(), { shed: true, pilot: false }).get('X-Robots-Tag'), null);
  assert.equal(shedRobots(new Headers(), { shed: false, pilot: true }).get('X-Robots-Tag'), null);
  assert.equal(cacheControl({ maxAge: 3600, sMaxAge: 86400, swr: 604800 }), 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800');
});
await ok('media worker /library/ has stale-while-revalidate', () => { assert.match(fs.readFileSync('workers/media/index.js', 'utf8'), /max-age=\$\{DAY\}, stale-while-revalidate=\$\{7 \* DAY\}/); });
await ok('workflow wired', () => {
  const y = fs.readFileSync('.github/workflows/free-tier-guard.yml', 'utf8');
  for (const s of ['schedule', 'scripts/free-tier/guard.mjs', 'CF_ANALYTICS_TOKEN', 'issues: write']) assert.ok(y.includes(s), 'thiếu ' + s);
  const jobs = JSON.parse(fs.readFileSync('infra/jobs.json', 'utf8')).jobs; assert.ok(jobs.find(j => j.workflow === 'free-tier-guard.yml'));
  const svc = JSON.parse(fs.readFileSync('infra/resources.json', 'utf8')).services; assert.ok(svc.find(s => s.key === 'free-tier-guard'));
});
await ok('dict: shed holds stage advance, rollback path untouched', async () => {
  const { decide } = await import('../dict/stage.mjs');
  const s0 = { stage: 'S0', index: '', n: 200, since: '2026-10-01' };
  assert.equal(decide(s0, null, { live: true }).change, true);
  const h = decide(s0, null, { live: true, shed: true }); assert.equal(h.change, false); assert.match(h.why, /shed/);
  const w = fs.readFileSync('workers/dict/index.mjs', 'utf8'); assert.match(w, /edgeCached\(/); assert.match(w, /mode\(\)/); assert.match(w, /stale-while-revalidate|cacheControl\(/);
});
console.log(`free-tier: ${n}/${n} ok`);
