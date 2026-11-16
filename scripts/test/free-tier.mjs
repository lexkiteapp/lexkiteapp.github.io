// Test free-tier-guard (scripts/free-tier/*) + workers/lib/edge.mjs – không gọi mạng (fetch/cache giả). docs/FREE-TIER.md
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { evaluate, markdown, r2Class, level, LIMITS, WARN, ALERT } from '../free-tier/limits.mjs';
import { cfUsage, pagesBuilds, writeState, intradayMain } from '../free-tier/guard.mjs';
import { project, decide, hourly, writeIntraday, pauseWorkflows, query as iQuery, PAUSE, r2Gate, r2Usage, R2_FREE } from '../free-tier/intraday.mjs';
import { r2Frozen } from '../lib/r2-freeze.mjs';
import { r2Config } from '../lib/media-store.mjs';
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
// ---- Bản trong ngày (mỗi giờ) – hồi quy sự cố 01/11: lượt THẬT theo giờ (174k/100k) phải bật shed TRƯỚC khi chạm 100k ----
const FX = JSON.parse(fs.readFileSync(new URL('./fixtures/cf-hourly-2026-11-01.json', import.meta.url), 'utf8'));
const D0 = Date.parse(FX.day + 'T00:00:00Z');
const gqlAt = now => { // GraphQL giả: các giờ đã qua đủ, giờ đang chạy theo tỉ lệ phút
  const h = (now - D0) / 36e5, wk = [], fn = [];
  for (const [hr, s, n] of FX.rows) { if (hr > h) continue; const v = hr + 1 <= h ? n : Math.round(n * (h - hr)); const dt = new Date(D0 + hr * 36e5).toISOString(); (s === 'fn' ? fn : wk).push({ dimensions: { datetimeHour: dt, scriptName: s }, sum: { requests: v } }); }
  return { wk, fn };
};
await ok('intraday query: 1 truy vấn từ 00:00Z hôm nay', () => { const q = iQuery('abc', D0 + 5 * 36e5); assert.match(q, /datetime_geq:"2026-11-01T00:00:00Z"/); assert.match(q, /workersInvocationsAdaptive/); assert.match(q, /pagesFunctionsInvocationsAdaptiveGroups/); assert.doesNotMatch(q, /date_leq/); });
await ok('intraday 01/11: shed bật trước 100k, cảnh báo/dừng trước nữa', () => {
  let cur = {}, firstWarn = null, firstShed = null;
  for (let m = 17; m < 24 * 60; m += 60) { // cron :17 mỗi giờ
    const now = D0 + m * 6e4, { hours } = hourly(gqlAt(now)), p = project(hours, now), d = decide(p, cur, now);
    if (d.pause && firstWarn === null) firstWarn = { m, total: p.total };
    if (d.mode === 'shed' && firstShed === null) firstShed = { m, total: p.total };
    cur = { ...d };
  }
  assert.ok(firstShed, 'phải bật shed trong ngày 01/11'); assert.ok(firstShed.total < 100000, `shed lúc ${firstShed.total} ≥ 100k`);
  assert.ok(firstShed.total < 10000 && firstShed.m <= 77, `shed quá muộn (${firstShed.total} lúc phút ${firstShed.m})`); assert.ok(firstWarn.m <= firstShed.m);
  assert.equal(cur.mode, 'shed'); // không tự gỡ trong ngày dù 17:00Z trở đi lượt về ~0
});
await ok('intraday: không hạ mức trong ngày, sang ngày mới tự gỡ', () => {
  const now = D0 + 20 * 36e5, low = { total: 100, projected: 200 };
  assert.equal(decide(low, { day: FX.day, level: 'alert' }, now).mode, 'shed');
  const next = decide(low, { day: FX.day, level: 'alert' }, now + 5 * 36e5); assert.equal(next.mode, 'normal'); assert.equal(next.pause, false); assert.equal(next.day, '2026-11-02');
  assert.equal(decide({ total: 59999, projected: 1 }, {}, now).level, 'ok'); assert.equal(decide({ total: 1, projected: 60000 }, {}, now).level, 'warn'); assert.equal(decide({ total: 80000, projected: 0 }, {}, now).mode, 'shed');
});
await ok('intraday: ngoại suy theo nhịp ≤ 3 giờ gần nhất', () => {
  const hours = Array(24).fill(0); hours[0] = 100000; hours[9] = 1000; hours[10] = 500; // 10:30Z
  const e = Array(24).fill(0); e[0] = 3000; assert.equal(project(e, D0 + 0.3 * 36e5).projected, 3000); // < 1 giờ: không ngoại suy (nhiễu)
  const p = project(hours, D0 + 10.5 * 36e5); assert.equal(p.total, 101500); assert.equal(Math.round(p.rate), Math.round(1500 / 3.5)); assert.ok(p.projected > p.total);
});
await ok('intraday: ghi trạng thái chỉ khi đổi', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftgi-')), 's.json');
  const d = { mode: 'normal', level: 'warn', day: FX.day, paused: ['ci-filler.yml'] };
  assert.deepEqual(writeIntraday(d, 0, f), { changed: true, modeChanged: true }); assert.deepEqual(writeIntraday(d, 1, f), { changed: false, modeChanged: false });
  assert.deepEqual(writeIntraday({ ...d, mode: 'shed', level: 'alert' }, 2, f), { changed: true, modeChanged: true }); assert.equal(JSON.parse(fs.readFileSync(f, 'utf8')).mode, 'shed');
});
const ghFake = (states, calls) => async (u, o = {}) => { const w = u.split('/workflows/')[1]; calls.push(`${o.method || 'GET'} ${w}`); return { ok: true, json: async () => ({ state: states[w] }) }; };
await ok('intraday: chỉ dừng workflow đang active, mở lại đúng cái đã dừng', async () => {
  const calls = [], states = Object.fromEntries(PAUSE.map(w => [w, 'active'])); states['i18n.yml'] = 'disabled_manually';
  const paused = await pauseWorkflows('t', { pause: true, already: [] }, ghFake(states, calls));
  assert.ok(!paused.includes('i18n.yml') && paused.includes('ci-filler.yml')); assert.ok(!calls.includes('PUT i18n.yml/disable'));
  const c2 = []; assert.deepEqual(await pauseWorkflows('t', { pause: false, already: paused }, ghFake(states, c2)), []); assert.deepEqual(c2, paused.map(w => `PUT ${w}/enable`));
});
await ok('intraday hồi quy 02→03/11: workflow trong danh sách dừng CŨ mà đã bị bật tay → dừng lại theo mức hôm nay, không tưởng còn dừng', async () => {
  const states = Object.fromEntries(PAUSE.map(w => [w, 'active'])); states['lighthouse.yml'] = 'disabled_manually';   // guard dừng hôm qua, chưa ai mở
  const calls = [], old = ['ci-filler.yml', 'vocab-img-scene.yml', 'lighthouse.yml'];   // ci-filler + vocab-img-scene đã được bật tay
  const paused = await pauseWorkflows('t', { pause: true, already: old }, ghFake(states, calls));
  assert.ok(calls.includes('PUT ci-filler.yml/disable') && calls.includes('PUT vocab-img-scene.yml/disable'), 'workflow bật tay phải bị dừng lại: ' + calls.join(','));
  assert.ok(paused.includes('lighthouse.yml') && !calls.includes('PUT lighthouse.yml/disable'), 'cái vẫn đang tắt do guard: giữ quyền mở lại, không gọi disable lần nữa');
  assert.ok(paused.includes('ci-filler.yml') && paused.includes('vocab-img-scene.yml'));
  const c2 = []; await pauseWorkflows('t', { pause: false, already: paused }, ghFake(states, c2));
  assert.ok(['ci-filler.yml', 'vocab-img-scene.yml', 'lighthouse.yml'].every(w => c2.includes(`PUT ${w}/enable`)), 'hết mức → mở lại đủ');
});
await ok('intraday end-to-end 01/11 03:17Z: shed + dừng + issue, không đóng issue', async () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftge-')), 's.json'), now = D0 + (3 * 60 + 17) * 6e4, calls = [];
  const fetcher = async (u, o = {}) => {
    if (u.includes('/graphql')) return { ok: true, json: async () => ({ data: { viewer: { accounts: [gqlAt(now)] } } }) };
    calls.push(`${o.method || 'GET'} ${u.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+/, '')}`);
    if (u.includes('/actions/workflows/')) return { ok: true, json: async () => ({ state: 'active' }) };
    if (u.includes('/issues?')) return { ok: true, json: async () => [] };
    return { ok: true, json: async () => ({}) };
  };
  const r = await intradayMain({ now, env: { CF_ANALYTICS_TOKEN: 'x', CF_ACCOUNT_ID: 'e34e', GITHUB_TOKEN: 'g' }, fetcher, file: f });
  assert.equal(r.mode, 'shed'); assert.ok(r.total < 100000); assert.deepEqual(r.paused, PAUSE);
  const st = JSON.parse(fs.readFileSync(f, 'utf8')); assert.equal(st.mode, 'shed'); assert.equal(st.day, FX.day);
  assert.ok(calls.some(c => c === 'POST /issues')); assert.ok(!calls.some(c => /PATCH \/issues\/\d+$/.test(c)));
});
await ok('workflow: cron mỗi giờ chạy --intraday, bản ngày vẫn quét đủ', () => {
  const wf = fs.readFileSync('.github/workflows/free-tier-guard.yml', 'utf8');
  assert.match(wf, /cron: '17 \* \* \* \*'/); assert.match(wf, /cron: '35 1 \* \* \*'/); assert.match(wf, /--intraday/); assert.match(wf, /mode_changed/);
});

// ---- Chốt $0 R2: ≥ 80 % → issue, ≥ 90 % → về Worker + GitHub + đóng băng ghi R2 (không hạ ngưỡng) ----
await ok('r2 gate: ngưỡng 80/90 % trên cả 3 hạn mức Free', () => {
  assert.deepEqual(R2_FREE, { storage: 10 * 1024 ** 3, a: 1e6, b: 10e6 });
  assert.equal(r2Gate({ storage: 2.3 * 1024 ** 3, a: 1e5, b: 1e6 }).level, 'ok');
  assert.equal(r2Gate({ storage: 8 * 1024 ** 3, a: 0, b: 0 }).level, 'alert'); assert.equal(r2Gate({ storage: 9 * 1024 ** 3, a: 0, b: 0 }).level, 'fallback');
  assert.equal(r2Gate({ storage: 0, a: 799999, b: 0 }).level, 'ok'); assert.equal(r2Gate({ storage: 0, a: 800000, b: 0 }).level, 'alert');
  const g = r2Gate({ storage: 1, a: 1, b: 9e6 }); assert.equal(g.level, 'fallback'); assert.equal(g.key, 'b');
  assert.equal(r2Gate({ storage: 0, a: 0, b: 4999999 }).level, 'ok'); assert.equal(r2Gate({ storage: 0, a: 0, b: 5e6 }).level, 'warn'); // Class B ≥ 50 %: cảnh báo trượt cache
  assert.deepEqual(r2Usage({ r2s: [{ max: { payloadSize: 10, metadataSize: 2 } }], r2o: [{ dimensions: { actionType: 'PutObject' }, sum: { requests: 3 } }, { dimensions: { actionType: 'GetObject' }, sum: { requests: 5 } }, { dimensions: { actionType: 'DeleteObject' }, sum: { requests: 9 } }] }), { storage: 12, a: 3, b: 5 });
});
const r2Run = async (r2, { cur } = {}) => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftr2-')), 's.json'); if (cur) fs.writeFileSync(f, JSON.stringify(cur));
  const now = Date.parse('2026-11-20T10:17:00Z'), calls = [], fb = [];
  const fetcher = async (u, o = {}) => {
    if (u.includes('/graphql')) return { ok: true, json: async () => ({ data: { viewer: { accounts: [{ wk: [{ dimensions: { datetimeHour: '2026-11-20T09:00:00Z', scriptName: 'lexkite-push' }, sum: { requests: 60 } }], fn: [], ...r2 }] } } }) };
    calls.push(`${o.method || 'GET'} ${u.replace(/^https:\/\/api\.github\.com\/repos\/[^/]+\/[^/]+/, '')}`);
    if (u.includes('/issues?')) return { ok: true, json: async () => [] };
    return { ok: true, json: async () => ({ state: 'active' }) };
  };
  const r = await intradayMain({ now, env: { CF_ANALYTICS_TOKEN: 'x', CF_ACCOUNT_ID: 'e34e', GITHUB_TOKEN: 'g' }, fetcher, file: f, fallback: async () => fb.push(1) });
  return { r, calls, fb, st: JSON.parse(fs.readFileSync(f, 'utf8')) };
};
const store = gb => ({ r2s: [{ max: { payloadSize: gb * 1024 ** 3, metadataSize: 0 } }], r2o: [] });
await ok('r2 2,3 GB: không issue, không về GitHub', async () => { const x = await r2Run(store(2.3)); assert.equal(x.r.r2.level, 'ok'); assert.equal(x.fb.length, 0); assert.ok(!x.calls.includes('POST /issues')); assert.equal(x.st.r2, undefined); });
await ok('r2 8,2 GB (≥ 80 %): mở issue, chưa về GitHub', async () => { const x = await r2Run(store(8.2)); assert.equal(x.r.r2.level, 'alert'); assert.ok(x.calls.includes('POST /issues')); assert.equal(x.fb.length, 0); assert.notEqual(x.st.r2, 'frozen'); });
await ok('r2 9,1 GB (≥ 90 %): về Worker + GitHub 1 lần, đóng băng ghi, issue', async () => {
  const x = await r2Run(store(9.1)); assert.equal(x.r.r2.level, 'fallback'); assert.equal(x.fb.length, 1); assert.equal(x.st.r2, 'frozen'); assert.ok(x.calls.includes('POST /issues'));
  const y = await r2Run(store(9.1), { cur: x.st }); assert.equal(y.fb.length, 0, 'đã đóng băng → không rollback lại'); assert.equal(y.st.r2, 'frozen');
  const z = await r2Run(store(1), { cur: x.st }); assert.equal(z.st.r2, 'frozen', 'không tự gỡ – gỡ tay (docs/FREE-TIER.md §R2)');
});
await ok('r2 Class B 6 triệu (≥ 50 %): chỉ cảnh báo, không issue, không về GitHub', async () => { const x = await r2Run({ r2s: [], r2o: [{ dimensions: { actionType: 'GetObject' }, sum: { requests: 6e6 } }] }); assert.equal(x.r.r2.level, 'warn'); assert.equal(x.fb.length, 0); assert.ok(!x.calls.includes('POST /issues')); });
await ok('r2 Class B 9,5 triệu (≥ 90 %): về GitHub', async () => { const x = await r2Run({ r2s: [], r2o: [{ dimensions: { actionType: 'GetObject' }, sum: { requests: 9.5e6 } }] }); assert.equal(x.fb.length, 1); assert.equal(x.st.r2, 'frozen'); });
await ok('đóng băng: mirror + media-store ngừng ghi R2', () => {
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ftz-')), 's.json');
  fs.writeFileSync(f, '{"mode":"normal","r2":"frozen"}'); assert.equal(r2Frozen(f), true); assert.equal(r2Config({ R2_ACCESS_KEY_ID: 'a', R2_SECRET_ACCESS_KEY: 'b' }, { stateFile: f }), null);
  fs.writeFileSync(f, '{"mode":"normal"}'); assert.equal(r2Frozen(f), false); assert.ok(r2Config({ R2_ACCESS_KEY_ID: 'a', R2_SECRET_ACCESS_KEY: 'b' }, { stateFile: f }));
  assert.equal(r2Frozen('/không/có'), false);
  assert.match(fs.readFileSync('scripts/cdn/mirror.mjs', 'utf8'), /if \(r2Frozen\(\) && !DRY\)/);
  assert.match(fs.readFileSync('.github/workflows/cdn-mirror.yml', 'utf8'), /web\/free-tier-state\.json/);
  assert.match(fs.readFileSync('.github/workflows/free-tier-guard.yml', 'utf8'), /CLOUDFLARE_API_TOKEN/);
});

console.log(`free-tier: ${n}/${n} ok`);
