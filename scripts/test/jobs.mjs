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
// 7) sổ: footage-archive trước d1b-migrate; mọi việc d1_internal đều có lease
const reg = (await import(new URL('../../functions/api/_jobs_reg.js', import.meta.url))).REG;
ok(reg.jobs.filter(j => j.resources.includes('d1_internal')).every(j => j.lease), 'mọi việc dùng d1_internal đều thuê (lease)');
if (fails) { console.log(`✗ jobs: ${fails}/${n} kiểm thất bại`); process.exit(1); }
console.log(`✓ jobs: ${n} kiểm (thuê độc quyền, không song song, hết hạn, ngân sách theo ưu tiên/tài khoản, nhật ký, timeline)`);
