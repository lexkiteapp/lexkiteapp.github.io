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
const env = { CF_ANALYTICS_TOKEN: 'x', CF_ACCOUNT_ID: 'abc' };
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
G.resetD1Cache(); r = await W.watchD1({}, { prepare: () => ({ bind() { return this; }, first: async () => null }) }, at(5), { mail });
ok(r.skip === 'no-analytics' && !mails.length, 'thiếu CF_ANALYTICS_TOKEN: bỏ qua, không đoán');
G.resetD1Cache(); r = await W.watchD1(env, db, at(5), { mail, fetcher: gql(1e6, 80e3) });
ok(r.level === 0.75 && /ghi/.test(mails[0].s), 'dòng GHI 80 % cũng báo');
ok(W.etaFull(0.5, at(6)) === '12:00Z' && W.etaFull(0.2, at(6)) === null, 'dự báo giờ chạm 100 %');

// ---------- (4) usagePeek / shedRead ----------
G.resetD1Cache();
const e2 = { ...env, DB: null };
let calls = 0; const slow = async () => { calls++; return gql(4.4e6)(); };
ok(G.usagePeek(e2, null, at(10), slow) === null && calls === 1, 'usagePeek: chưa có số → null ngay (không chờ), làm mới nền');
await new Promise(res => setTimeout(res, 10));
const u = G.usagePeek(e2, null, at(10), slow);
ok(u && G.isShed(u) && calls === 1, 'usagePeek: lần sau có số 88 % → chế độ tiết kiệm');
const sr = G.shedRead(e2, (st, d) => new Response(JSON.stringify(d), { status: st }));
ok(sr && sr.status === 429 && +sr.headers.get('Retry-After') > 0 && (await sr.json()).error === 'quota-shed', 'shedRead ≥ 85 %: 429 nhẹ + Retry-After');
G.resetD1Cache(); await G.d1Usage(e2, null, at(10), gql(4.0e6));
ok(G.shedRead(e2, () => new Response('', { status: 429 })) === null, 'shedRead 80 %: cho qua');
ok(!G.isShed({ source: 'own', ratio: 0.99 }), 'số tự đếm không đủ tin để cắt');
ok(G.secsToReset(Date.parse('2026-11-03T23:00:00Z')) === 3600 && G.secsToReset(Date.parse('2026-11-03T23:59:59Z')) === 60, 'secsToReset: tới 00:00 UTC (tối thiểu 60 s)');

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
