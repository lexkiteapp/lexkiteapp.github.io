// Sự cố 03/11/2026 (D1 5,1 M/5 M dòng đọc từ Quản trị › Phân tích): kiểm các lớp chặn mới.
// (1) _readbudget.js: meter đếm dòng, stale → ShedError không chạm D1; ngân sách op/tổng; (2) admin.js cached(): ShedError → bản cũ kèm _stale
// (3) _d1watch.js: báo 50 % & 75 %, 1 thư/bậc/ngày, giờ yên lặng cho 50 %, không báo khi thiếu số Cloudflare; (4) _d1guard.js: usagePeek không chờ mạng, shedRead ≥ 85 %
// (5) đồng bộ khi D1 hết hạn mức: máy chủ 429 {error:'quota', retry} (tới 00:00 UTC), máy khách nghỉ tới đó (+ rải), không mất dữ liệu (dirty giữ nguyên)
// Chạy: node scripts/test/d1-cap.mjs
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const imp = p => import(new URL('../../functions/api/' + p, import.meta.url));

// Cache API giả (caches.default) – Map theo URL
const store = new Map();
globalThis.caches = { default: { match: async r => { const v = store.get(r.url); return v ? new Response(v) : undefined; }, put: async (r, res) => { store.set(r.url, await res.text()); } } };

const G = await imp('_d1guard.js'), B = await imp('_readbudget.js'), W = await imp('_d1watch.js'), A = await imp('admin.js'), L = await imp('_d1limit.js');

// ---------- (1) meter + ngân sách ----------
let touched = 0;
const fakeDb = { prepare: q => ({ bind() { return this; }, all: async () => { touched++; return { results: [{ a: 1, q }], meta: { rows_read: 700 } }; }, run: async () => { touched++; return { meta: { rows_read: 5 } }; } }), batch: async l => l.map(() => ({ meta: { rows_read: 10 } })) };
const m = B.meter(fakeDb);
ok((await m.prepare('SELECT a FROM t').bind(1).first('a')) === 1, 'meter: first(col)');
await m.prepare('SELECT 1').all(); await m.batch([m.prepare('x'), m.prepare('y')]);
ok(m.reads === 700 + 700 + 20, 'meter: cộng meta.rows_read (first/all/batch) = ' + m.reads);
const ms = B.meter(fakeDb, { stale: true, why: 'route' }); touched = 0;
let err = null; try { await ms.prepare('SELECT 1').first(); } catch (e) { err = e; }
ok(B.isShedError(err) && err.why === 'route' && touched === 0, 'meter stale: ném ShedError TRƯỚC khi chạm D1');
B._resetBudget(); store.clear();
const T0 = Date.parse('2026-11-03T10:00:00Z');
ok(B.overBudget(await B.spent('analytics', T0), 'analytics') === null, 'ngân sách: đầu ngày chưa vượt');
await B.addSpent('analytics', B.ROUTE_DAY.analytics, T0);
ok(B.overBudget(await B.spent('analytics', T0), 'analytics') === 'route', 'ngân sách: op vượt ROUTE_DAY → route');
ok(B.overBudget(await B.spent('users', T0), 'users') === null, 'ngân sách: op khác chưa vượt');
await B.addSpent('users', B.ADMIN_DAY, T0);
ok(B.overBudget(await B.spent('errors', T0), 'errors') === 'admin', 'ngân sách: tổng Quản trị vượt ADMIN_DAY → admin');
B._resetBudget();
ok(B.overBudget(await B.spent('analytics', T0), 'analytics') === 'route', 'ngân sách: sống qua isolate mới (Cache API)');
ok(B.overBudget(await B.spent('analytics', T0 + 86400e3), 'analytics') === null, 'ngân sách: đặt lại ngày UTC mới');
ok(B.ADMIN_DAY <= 0.1 * G.D1_LIMITS.reads, 'ngân sách Quản trị ≤ 10 % hạn mức Free (không nới)');

// ---------- (2) cached(): bản cũ khi bị cắt ----------
store.clear();
const v1 = await A.cached('t-key', 1, async () => ({ x: 1 }));
store.delete('https://cache.lexkite.internal/t-key'); // hết hạn bản tươi
const v2 = await A.cached('t-key', 1, async () => { throw new B.ShedError('d1-85'); });
ok(v1.x === 1 && v2.x === 1 && v2._stale > 0, 'cached: ShedError → trả bản cũ kèm _stale');
err = null; try { await A.cached('t-none', 1, async () => { throw new B.ShedError('route'); }); } catch (e) { err = e; }
ok(B.isShedError(err), 'cached: không có bản cũ → ShedError (endpoint trả 429 quota-shed)');
err = null; try { await A.cached('t-err', 1, async () => { throw new Error('sql'); }); } catch (e) { err = e; }
ok(err && err.message === 'sql', 'cached: lỗi thường không bị nuốt');
const adminSrc = fs.readFileSync(new URL('../../functions/api/admin.js', import.meta.url), 'utf8');
ok(/isRead = !WRITE\.test\(b\.op\)/.test(adminSrc) && /meter\(env\.DB, \{ stale: !!why, why \}\)/.test(adminSrc), 'admin.js: op đọc đi qua meter; thao tác ghi không bị ngân sách chặn');

// ---------- (3) thang cảnh báo ----------
const gql = (reads, writes = 0) => async () => ({ json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: [{ sum: { rowsRead: reads, rowsWritten: writes } }] }] } } }) });
const env = { D1_PLAN: 'free', CF_ANALYTICS_TOKEN: 'x', CF_ACCOUNT_ID: 'abc' }; // (3)/(4): đường gói Free theo ngày (tài khoản 2 vẫn Free); gói Paid: (6)
const meta = new Map(), alerts = new Map();
const db = { prepare: q => ({ _a: [], bind(...a) { this._a = a; return this; },
  first: async function () { if (/FROM drive_meta/.test(q)) { const v = meta.get(this._a[0]); return v == null ? null : { v }; } return null; },
  run: async function () { if (/INTO drive_meta/.test(q)) meta.set(this._a[0], this._a[1]); else if (/INTO drive_alerts/.test(q)) alerts.set('d1', { level: this._a[0], msg: this._a[1] }); else if (/DELETE FROM drive_alerts/.test(q)) alerts.delete('d1'); return {}; } }) };
const mails = []; const mail = async (s, t) => { mails.push({ s, t }); return true; };
const at = h => Date.parse('2026-11-03T' + String(h).padStart(2, '0') + ':00:00Z');
const run = async (reads, h, x = {}) => { G.resetD1Cache(); return W.watchD1({ ...env, ...x }, db, at(h), { mail, fetcher: gql(reads) }); };
let r = await run(2.4e6, 3);
ok(r.level === 0 && !mails.length && !alerts.has('d1'), '48 %: im lặng');
r = await run(2.6e6, 3); // 10:00 VN
ok(r.level === 0.5 && mails.length === 1 && alerts.get('d1').level === 'warn', '52 %: 1 thư + chuông warn');
ok(/52 %/.test(mails[0].s) && /00:00 UTC/.test(mails[0].t) && !/@/.test(mails[0].t), 'thư: có %, giờ đặt lại, không lộ email');
r = await run(3.2e6, 5);
ok(mails.length === 1 && r.already === 0.5, '64 %: không gửi lại bậc 50 %');
r = await run(3.9e6, 6);
ok(r.level === 0.75 && mails.length === 2 && alerts.get('d1').level === 'crit' && /85 %/.test(mails[1].t), '78 %: thư bậc 75 % (nhắc chế độ tiết kiệm 85 %)');
r = await run(4.9e6, 9);
ok(mails.length === 2, '98 %: tối đa 2 thư/ngày');
meta.clear(); mails.length = 0;
r = await run(2.6e6, 16); // 23:00 VN
ok(r.quiet && !mails.length && alerts.has('d1'), '50 % trong giờ yên lặng (22–07 VN): chỉ chuông, chưa gửi thư');
r = await run(3.8e6, 17);
ok(mails.length === 1 && r.level === 0.75, '75 % trong giờ yên lặng: vẫn gửi (khẩn)');
meta.clear(); mails.length = 0;
G.resetD1Cache(); r = await W.watchD1({ D1_PLAN: 'free' }, { prepare: () => ({ bind() { return this; }, first: async () => null }) }, at(5), { mail });
ok(r.skip === 'no-analytics' && !mails.length, 'thiếu CF_ANALYTICS_TOKEN: bỏ qua, không đoán');
G.resetD1Cache(); r = await W.watchD1(env, db, at(5), { mail, fetcher: gql(1e6, 80e3) });
ok(r.level === 0.75 && /ghi/.test(mails[0].s), 'dòng GHI 80 % cũng báo');
ok(W.etaFull(0.5, at(6)) === '12:00Z' && W.etaFull(0.2, at(6)) === null, 'dự báo giờ chạm 100 %');

// ---------- (3b) Pages chưa có CF_ANALYTICS_TOKEN: số do CI đẩy (capacity.js op usage → drive_meta d1u:<ngày>) ----------
const C = await imp('capacity.js');
meta.clear(); mails.length = 0; alerts.clear();
const capDb = { prepare: q => { const st = db.prepare(q); return { ...st, bind(...a) { st.bind(...a); return this; }, first: st.first.bind(st), run: async () => { if (/^CREATE|^ALTER/.test(q)) return {}; return st.run(); } }; }, batch: async () => [] };
const FREE = { D1_PLAN: 'free' };
r = await C.usage(FREE, capDb, { day: '2026-11-03', reads: 9e5, writes: 0 }, at(3)); // không token Pages
ok(r.skip == null && r.level === 0 && JSON.parse(meta.get('d1u:2026-11-03')).reads === 9e5, 'op usage: lưu số CI vào drive_meta d1u:<ngày>');
G.resetD1Cache(); let u0 = await G.d1Usage(FREE, capDb, at(3) + 10 * 60e3);
ok(u0.source === 'cloudflare' && u0.via === 'ci' && u0.reads === 9e5, 'd1Usage không token: dùng số CI còn tươi (≤ 45 phút)');
G.resetD1Cache(); u0 = await G.d1Usage(FREE, capDb, at(3) + 50 * 60e3);
ok(u0.source === 'own', 'd1Usage không token: số CI quá 45 phút → không tin (tự đếm)');
r = await C.usage(FREE, capDb, { day: '2026-11-03', reads: 4.4e6, writes: 0 }, at(4));
ok(r.level === 0.75 && mails.length === 0 && alerts.get('d1').level === 'crit', 'op usage 88 %: chuông crit (thư cần MAIL binding – env rỗng → không gửi, không đánh dấu đã báo)');
ok(!meta.has('d1warn:2026-11-03'), 'thư chưa gửi được → lượt sau thử lại (không đánh dấu)');
G.resetD1Cache(); ok(G.isShed(await G.d1Usage(FREE, capDb, at(4) + 60e3)), 'số CI 88 % → chế độ tiết kiệm bật dù Pages thiếu token');
ok((await C.usage(FREE, capDb, { day: '2026-11-02', reads: 1, writes: 1 }, at(4))).error === 'bad-usage' && (await C.usage(FREE, capDb, { day: '2026-11-03', reads: -1, writes: 0 }, at(4))).error === 'bad-usage', 'op usage: chặn ngày cũ / số âm');
G.resetD1Cache(); u0 = await G.d1Usage(env, capDb, at(4) + 60e3, gql(1e6));
ok(u0.source === 'cloudflare' && !u0.via && u0.reads === 1e6, 'có CF_ANALYTICS_TOKEN: đo trực tiếp GraphQL, bỏ qua số CI');
G.resetD1Cache(); meta.clear(); alerts.clear();

// ---------- (4) usagePeek / shedRead ----------
G.resetD1Cache();
const e2 = { ...env, DB: null };
let calls = 0; const slow = async () => { calls++; return gql(4.4e6)(); };
ok(G.usagePeek(e2, null, at(10), slow) === null && calls === 1, 'usagePeek: chưa có số → null ngay (không chờ), làm mới nền');
await new Promise(res => setTimeout(res, 10));
const u = G.usagePeek(e2, null, at(10), slow);
ok(u && G.isShed(u) && calls === 1, 'usagePeek: lần sau có số 88 % → chế độ tiết kiệm');
// truyền giờ của test: dùng giờ thật thì sau 00:00Z ngày 4/11 cache lệch ngày, test đỏ trên mọi PR
const sr = G.shedRead(e2, (st, d) => new Response(JSON.stringify(d), { status: st }), at(10));
ok(sr && sr.status === 429 && +sr.headers.get('Retry-After') > 0 && (await sr.json()).error === 'quota-shed', 'shedRead ≥ 85 %: 429 nhẹ + Retry-After');
G.resetD1Cache(); await G.d1Usage(e2, null, at(10), gql(4.0e6));
ok(G.shedRead(e2, () => new Response('', { status: 429 }), at(10)) === null, 'shedRead 80 %: cho qua');
ok(!G.isShed({ source: 'own', ratio: 0.99 }), 'số tự đếm không đủ tin để cắt');
ok(G.secsToReset(Date.parse('2026-11-03T23:00:00Z')) === 3600 && G.secsToReset(Date.parse('2026-11-03T23:59:59Z')) === 60, 'secsToReset: tới 00:00 UTC (tối thiểu 60 s)');

// ---------- (6) gói Paid (tài khoản chính từ 03/11): dự báo tháng / phần đã gồm + trần chi tiêu ----------
ok(G.planOf({}) === 'paid' && G.planOf({}, 'b') === 'free' && G.planOf({ D1_PLAN: 'free' }) === 'free', 'planOf: chính Paid, tài khoản 2 Free, env ghi đè');
const noon3 = Date.parse('2026-11-03T12:00:00Z');
ok(G.project(2.5e9, 0.4e9, noon3) === 30e9, 'project: nhịp tháng (2,5 tỷ/2,5 ngày × 30)');
ok(G.project(1e9, 0.9e9, Date.parse('2026-11-03T03:00:00Z')) > 25e9, 'project: vòng lặp lỗi hôm nay (0,3 tỷ/giờ) lộ ngay → vượt phần đã gồm');
const gqlM = (days, today = '2026-11-03') => async (u, init) => { gqlM.q = JSON.parse(init.body).query; return { json: async () => ({ data: { viewer: { accounts: [{ d1AnalyticsAdaptiveGroups: days.map(([d, R, Wr = 0]) => ({ dimensions: { date: d }, sum: { rowsRead: R, rowsWritten: Wr } })) }] } } }) }; };
const PAID = { CF_ANALYTICS_TOKEN: 'x', CF_ACCOUNT_ID: 'abc' };
G.resetD1Cache(); let up = await G.d1Usage(PAID, null, noon3, gqlM([['2026-11-01', 3e7], ['2026-11-02', 4e7], ['2026-11-03', 3e7]]));
ok(/date_geq:"2026-11-01"/.test(gqlM.q) && up.plan === 'paid' && up.mReads === 1e8 && up.reads === 3e7 && up.ratio < 0.1 && !up.block, 'Paid: đọc cả tháng; 100 M dòng/2,5 ngày ≈ 5 % → bình thường');
G.resetD1Cache(); up = await G.d1Usage(PAID, null, noon3, gqlM([['2026-11-01', 3e7], ['2026-11-02', 5e9]]));
ok(up.spend && G.isShed(up) && up.block, 'Paid: dự báo vượt phần đã gồm → trần chi tiêu + tiết kiệm + dừng việc nền');
G.resetD1Cache(); up = await G.d1Usage(PAID, null, noon3, gqlM([['2026-11-03', 1e5, 4e6]]));
ok(up.kind === 'writes' && up.ratio > 1, 'Paid: dòng GHI (50 M/tháng) cũng tính');
meta.clear(); mails.length = 0; alerts.clear();
const runP = async (days, t) => { G.resetD1Cache(); return W.watchD1(PAID, db, t, { mail, fetcher: gqlM(days) }); };
r = await runP([['2026-11-01', 6e8], ['2026-11-02', 7e8]], noon3); // 1,3 tỷ/2,5 ngày → 15,6 tỷ ≈ 62 %
ok(r.level === 0.5 && mails.length === 1 && /dự báo tháng/.test(mails[0].s) && meta.get('d1warn:2026-11') === '0.5', 'Paid 50 %: 1 thư, khoá theo THÁNG');
r = await runP([['2026-11-01', 6e8], ['2026-11-02', 7e8], ['2026-11-04', 1e8]], Date.parse('2026-11-04T05:00:00Z'));
ok(r.level === 0.5 && mails.length === 1, 'Paid: hôm sau vẫn 50 % → không gửi lại trong tháng');
r = await runP([['2026-11-01', 5e9], ['2026-11-02', 5e9]], Date.parse('2026-11-03T16:00:00Z')); // 23:00 VN
ok(r.level === 1 && mails.length === 2 && /TỐN TIỀN/.test(mails[1].s) && /USD/.test(mails[1].t) && alerts.get('d1').level === 'crit', 'Paid trần chi tiêu: thư ngay cả giờ yên lặng, có ước tính USD');
r = await runP([['2026-11-01', 5e9], ['2026-11-02', 5e9]], Date.parse('2026-11-03T18:00:00Z'));
ok(mails.length === 2, 'trần chi tiêu: 1 thư/ngày');
r = await runP([['2026-11-01', 5e9], ['2026-11-02', 5e9], ['2026-11-04', 1e9]], Date.parse('2026-11-04T03:00:00Z'));
ok(mails.length === 3, 'trần chi tiêu: ngày mới còn vượt → nhắc lại (tiền thật)');
meta.clear(); mails.length = 0; alerts.clear();
r = await C.usage({}, capDb, { day: '2026-11-03', reads: 3e8, writes: 0, mReads: 6e9, mWrites: 0 }, noon3);
ok(r.level === 1 && JSON.parse(meta.get('d1u:2026-11-03')).mReads === 6e9, 'op usage (CI) Paid: gửi số tháng → máy chủ dự báo, bật trần chi tiêu');
ok((await C.usage({}, capDb, { day: '2026-11-03', reads: 5, writes: 0, mReads: 4, mWrites: 0 }, noon3)).error === 'bad-usage', 'op usage: số tháng < hôm nay → từ chối');
G.resetD1Cache(); meta.clear(); alerts.clear(); mails.length = 0;

// ---------- (5) đồng bộ khi D1 hết hạn mức ----------
ok(L.isD1Limit(new Error('D1_ERROR: Exceeded maximum daily rows read limit')) && !L.isD1Limit(new Error('D1_ERROR: no such column x')), 'isD1Limit: nhận lỗi hạn mức, bỏ lỗi SQL');
const syncSrv = fs.readFileSync(new URL('../../functions/api/sync.js', import.meta.url), 'utf8');
ok(/quota \? \{ error: 'quota', retry: secsToReset\(\) \}/.test(syncSrv), 'sync.js: 429 quota kèm retry (giây tới 00:00 UTC)');
const cli = fs.readFileSync(new URL('../../web/js/sync.js', import.meta.url), 'utf8');
const pm = cli.match(/const pauseMs = (\(retry, rnd = Math\.random\(\)\) => [^;]+);/);
ok(pm, 'web/js/sync.js: có pauseMs');
const pauseMs = pm ? (0, eval)(pm[1]) : () => 0;
ok(pauseMs(3600, 0) === (3600 + 60) * 1000 && pauseMs(3600, 1) === (3600 + 1260) * 1000, 'pauseMs: nghỉ tới lúc đặt lại + rải 1–21 phút');
ok(pauseMs(0) === 6 * 3600e3 && pauseMs(86400) === 6 * 3600e3, 'pauseMs: thiếu retry/quá xa → tối đa 6 giờ');
ok((cli.match(/syncPausedUntil', Date\.now\(\) \+ pauseMs\(e\.retry\)\)/g) || []).length === 2 && /retry: \+j\.retry \|\| 0/.test(cli), 'máy khách dùng retry cho cả kéo & đẩy');
// Không mất dữ liệu: nhánh quota của push() return TRƯỚC "dirty = false" (dữ liệu vẫn chờ, tự đẩy sau)
const pushBody = cli.slice(cli.indexOf('Object.assign(sentHashes, pending)') - 2000, cli.indexOf('Object.assign(sentHashes, pending)') + 200);
ok(/dirty = false/.test(pushBody.slice(pushBody.indexOf('Object.assign(sentHashes'))), 'push: chỉ xoá cờ dirty sau khi gửi thành công');
const qb = cli.split('\n').filter(l => l.includes("e.code === 'resource-exhausted'")).join('\n');
ok(/return; \}/.test(qb) && !/dirty = false/.test(qb), 'push lỗi quota: giữ dirty, báo nhẹ "dữ liệu vẫn lưu trên máy"');
ok(/Đồng bộ tạm nghỉ vài giờ \(máy chủ miễn phí đã đủ lượt hôm nay\) – dữ liệu vẫn lưu trên máy/.test(cli), 'thông báo nhẹ cho người học');

console.log(fails ? `✗ d1-cap: ${fails}/${n} lỗi` : `✓ d1-cap: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
