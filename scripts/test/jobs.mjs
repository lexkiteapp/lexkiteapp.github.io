// Điều phối việc nền (functions/api/_jobs.js): thuê tài nguyên độc quyền, không chạy song song, ngân sách theo ưu tiên, nhật ký bỏ qua/chạy, timeline.
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const J = await import(new URL('../../functions/api/_jobs.js', import.meta.url)), G = await import(new URL('../../functions/api/_d1guard.js', import.meta.url));
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { sql.prepare(q).run(...this.args); return {}; }, async all() { return { results: sql.prepare(q).all(...this.args) }; }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; }, async batch(l) { for (const x of l) await x.run(); } };
await J.setupJobs(DB, 't');
const ENV = {}, T0 = Date.UTC(2026, 9, 24, 1, 45);
// 1) nhận thuê, việc khác dùng cùng tài nguyên độc quyền bị bỏ qua (không chạy song song)
let r = await J.acquire(ENV, DB, { job: 'footage-archive', run: 'r1' }, T0); ok(r.ok && r.leased.includes('drive_pool') && r.leased.includes('d1_internal'), 'footage-archive thuê drive_pool + d1_internal');
r = await J.acquire(ENV, DB, { job: 'drive-shorts', run: 'r2' }, T0 + 60e3); ok(!r.ok && r.skip && /footage-archive/.test(r.reason), 'drive-shorts bị bỏ qua vì footage-archive đang giữ: ' + r.reason);
r = await J.acquire(ENV, DB, { job: 'health', run: 'r3' }, T0 + 60e3); ok(r.ok && r.leased.length === 0, 'health (không tài nguyên độc quyền) chạy song song được');
// 2) trả thuê → việc kế nhận được; nhật ký
r = await J.release(ENV, DB, { job: 'footage-archive', run: 'r1', status: 'success', reads: 1234 }, T0 + 3600e3); ok(r.ok, 'release');
r = await J.acquire(ENV, DB, { job: 'drive-shorts', run: 'r4' }, T0 + 3601e3); ok(r.ok, 'sau khi trả thuê, drive-shorts nhận được');
await J.release(ENV, DB, { job: 'drive-shorts', run: 'r4', status: 'failure', reason: 'x' }, T0 + 3700e3);
// 3) thuê hết hạn tự giải phóng (ttl = phút × 1,5)
r = await J.acquire(ENV, DB, { job: 'footage-archive', run: 'r5' }, T0 + 7200e3); ok(r.ok, 'archive thuê lại');
r = await J.acquire(ENV, DB, { job: 'footage-verify', run: 'r6' }, T0 + 7200e3 + 150 * 1.5 * 60e3 + 1000); ok(r.ok, 'thuê quá hạn → việc khác lấy được');
// 4) ngân sách: D1 (tài khoản 1) đã dùng 55 % → 'archive' (trần 50 %) bỏ qua, 'publishing' (70 %) vẫn chạy
G.resetD1Cache();
const ENVB = { CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'e34e14b7ab35eaf2b3d9d84fcce011f7' }, f0 = globalThis.fetch;
globalThis.fetch = async () => ({ json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: 2750000, rowsWritten: 10 } }] }] } } }) });
await J.release(ENV, DB, { job: 'footage-verify', run: 'r6', status: 'success' }, T0 + 8e6);
r = await J.acquire(ENVB, DB, { job: 'drive-shorts', run: 'r7' }, T0 + 9e6); ok(!r.ok && /55%/.test(r.reason), 'drive-shorts (archive, trần 50 %) bỏ qua khi D1 55 % (chưa tách tài khoản): ' + r.reason);
r = await J.acquire(ENVB, DB, { job: 'youtube-manual', run: 'r8' }, T0 + 9.2e6); ok(r.ok, 'youtube-manual (publishing, trần 70 %) vẫn chạy ở 55 %');
r = await J.acquire(ENVB, DB, { job: 'storage-watch', run: 'r9' }, T0 + 9.3e6); ok(r.ok, 'storage-watch không dùng D1 → không bị chặn bởi ngân sách');
globalThis.fetch = async () => ({ json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: 2250000, rowsWritten: 10 } }] }] } } }) }); G.resetD1Cache();
// 5) tách tài khoản: có D1B → việc d1_internal đo tài khoản 2, d1_main_read đo tài khoản 1
G.resetD1Cache();
let call = 0; globalThis.fetch = async (u, init) => { call++; const acct = JSON.parse(init.body).query.match(/accountTag:"([a-f0-9]+)"/)[1]; return { json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: acct === 'f5641879aaaa' ? 3000000 : 100, rowsWritten: 1 } }] }] } } }) }; };
const ENV2 = { CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'e34e14b7ab35eaf2b3d9d84fcce011f7', D1B: '1', D1B_ACCOUNT_ID: 'f5641879aaaa', D1B_TOKEN: 'tb' };
r = await J.acquire(ENV2, DB, { job: 'footage-archive', run: 'r10' }, T0 + 20e6); ok(!r.ok && /nội bộ/.test(r.reason) && /60%/.test(r.reason), 'tài khoản 2 ở 60 % → footage-archive (d1_internal) bỏ qua, nêu rõ "nội bộ": ' + r.reason);
r = await J.acquire(ENV2, DB, { job: 'youtube-manual', run: 'r11' }, T0 + 20e6); ok(r.ok, 'youtube-manual chỉ đo D1 chính (100 dòng) → chạy');
globalThis.fetch = f0;
// 6) timeline + job lạ
const tl = await J.timeline(ENV, DB, { day: '2026-10-24' }, T0 + 30e6);
ok(tl.runs.some(x => x.job === 'drive-shorts' && x.status === 'skipped' && /footage-archive/.test(x.reason)) && tl.runs.some(x => x.job === 'footage-archive' && x.status === 'ok' && x.reads === 1234), 'timeline: có dòng bỏ qua (lý do) và dòng đã chạy (số dòng đọc)');
ok(tl.jobs.length >= 25 && tl.jobs.every(j => j.cron.length && j.priority), 'timeline kèm sổ việc');
ok((await J.acquire(ENV, DB, { job: 'khong-co', run: 'x' })).status === 400, 'job lạ → 400');
// 8) gốc rễ 23/10: điều phối hỏng (D1 hết hạn mức → trước đây 500 mơ hồ) → 503 rõ ràng; việc nặng FAIL-CLOSED; đặt chỗ neuron Workers AI chính = 0
{
  const { createHmac, createHash } = await import('node:crypto');
  const mod = await import(new URL('../../functions/api/jobs.js', import.meta.url)), L = await import(new URL('../jobs/lease.mjs', import.meta.url));
  const KEY = 'k'.repeat(40), body = JSON.stringify({ op: 'acquire', job: 'storage-watch', run: 'x1' }), ts = Math.floor(Date.now() / 1000);
  const sig = createHmac('sha256', KEY).update(ts + '.' + createHash('sha256').update(body).digest('hex')).digest('hex');
  const brokenDb = { prepare() { throw new Error('D1_ERROR: Your account has exceeded D1 free tier daily row read limit [code: 7500]'); }, async batch() { throw new Error('7500 exceeded'); } };
  const res = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/jobs', { method: 'POST', headers: { 'X-Drive-Ts': String(ts), 'X-Drive-Sig': sig, 'CF-Connecting-IP': '1.2.3.4' }, body }), env: { DB: brokenDb, LEXKITE_DRIVE_CLI_KEY: KEY } });
  const jb = await res.json(); ok(res.status === 503 && jb.error === 'coordinator-unavailable' && jb.cause === 'd1-quota', 'D1 hết hạn mức → /api/jobs trả 503 coordinator-unavailable (không phải 500 mơ hồ): ' + res.status + ' ' + JSON.stringify(jb));
  // fail-closed phía máy khách
  ok(L.failClosed('script-bank') && L.failClosed('footage-archive') && L.failClosed('vocab-img') && L.failClosed('news-auto') && L.failClosed('khong-co-trong-so'), 'việc dùng Workers AI/Drive/D1 và việc lạ → fail-closed');
  ok(!L.failClosed('storage-watch') && !L.failClosed('blog-publish'), 'việc tầm thường (chỉ phút GitHub) → fail-open');
  ok(L.decide(503, jb, true).skip === 1 && L.decide(0, { error: 'network' }, true).skip === 1 && L.decide(500, {}, true).skip === 1, 'việc nặng + điều phối 503/mạng/500 → KHÔNG chạy');
  ok(L.decide(503, jb, false).skip === 0 && L.decide(200, { ok: true }, true).skip === 0 && L.decide(200, { skip: true, reason: 'x' }, false).skip === 1 && L.decide(429, {}, false).skip === 1, 'việc tầm thường chạy khi điều phối hỏng; thuê được → chạy; bị từ chối/429 → bỏ qua');
  // đặt chỗ neuron: mặc định 0, cấp riêng theo việc
  const rr = await J.acquire({}, DB, { job: 'script-bank', run: 'g1' }, T0 + 40e6); ok(rr.ok && rr.grants.workers_ai === 0, 'script-bank: neuron Workers AI chính được cấp = 0 (đặt chỗ cho người dùng)');
  await J.release({}, DB, { job: 'script-bank', run: 'g1', status: 'success' }, T0 + 40.1e6);
  const REGM = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG; REGM.reservations.workers_ai.grants['script-bank'] = 750;
  const r2 = await J.acquire({}, DB, { job: 'script-bank', run: 'g2' }, T0 + 41e6); ok(r2.ok && r2.grants.workers_ai === 750, 'cấp riêng grants → 750 neuron'); delete REGM.reservations.workers_ai.grants['script-bank'];
  await J.release({}, DB, { job: 'script-bank', run: 'g2', status: 'success' }, T0 + 41.1e6);
  const rv = await J.acquire({}, DB, { job: 'vocab-img', run: 'g3' }, T0 + 42e6); ok(!rv.ok && /paused/.test(rv.reason), 'vocab-img paused: không --force thì bỏ qua');
  const rf = await J.acquire({}, DB, { job: 'vocab-img', run: 'g4', force: true }, T0 + 42e6); ok((rf.ok && rf.grants.workers_ai === 0) || (!rf.ok), 'vocab-img --force: nếu chạy thì neuron chính = 0'); if (rf.ok) await J.release({}, DB, { job: 'vocab-img', run: 'g4', status: 'success' }, T0 + 42.1e6);
  // đường nền (CI) không dùng binding Workers AI của tài khoản chính khi nền = 0 neuron; DB và các biến khác giữ nguyên
  { const AIB = { run() { return 1; } }, e0 = { AI: AIB, DB: 'db', X: 'x' }, e1 = G.stripBackgroundAI(e0);
    ok(e1.AI === null && e1.DB === 'db' && e1.X === 'x' && e0.AI === AIB, 'stripBackgroundAI: env.AI = null cho đường nền, DB/biến khác giữ nguyên, env gốc không đổi');
    const R0 = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG.reservations.workers_ai; R0.background_neurons = 500;
    ok(G.stripBackgroundAI(e0).AI === AIB, 'sổ cấp background_neurons > 0 → giữ binding'); R0.background_neurons = 0; }
  // skip() chịu được DB hỏng (vẫn trả lý do)
  const rb = await J.acquire({}, brokenDb, { job: 'vocab-img', run: 'g5' }, T0 + 43e6); ok(rb.skip === true, 'DB hỏng + paused → vẫn trả skip (không ném lỗi)');
}
// 7) sổ: footage-archive trước d1b-migrate; mọi việc d1_internal đều có lease
const reg = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG;
ok(reg.jobs.filter(j => j.resources.includes('d1_internal')).every(j => j.lease), 'mọi việc dùng d1_internal đều thuê (lease)');
if (fails) { console.log(`✗ jobs: ${fails}/${n} kiểm thất bại`); process.exit(1); }
console.log(`✓ jobs: ${n} kiểm (thuê độc quyền, không song song, hết hạn, ngân sách theo ưu tiên/tài khoản, nhật ký, timeline)`);
