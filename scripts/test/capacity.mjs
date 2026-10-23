// Test hạn mức & tối ưu chi phí D1 (docs/CAPACITY.md) – không mạng, D1 giả bằng node:sqlite.
//  1) mô phỏng người dùng (scripts/capacity/sim.mjs): không truy vấn đường người dùng nào quét cả bảng; số đo > 0; ngoại suy có đủ 3 mốc
//  2) _quota.js: trạng thái hạn mức dùng chung qua Cache API (isolate thứ 2 không đọc D1), quản trị đổi → đọc lại; chỉ mục quota_count không chứa n
//  3) notices.js: danh sách công khai đệm biên 60 s (lần 2 không đọc D1), hẹn giờ không trễ, hết hạn không thừa, thu hồi + purge → biến mất
//  4) hit.js: dọn phiên cũ theo chỉ mục day (không SCAN sessions)
//  5) _capacity.js evaluate(): 3 ngày ≥ 60 %, dự báo 80 % trong 14 ngày, đi ngang → không cảnh báo; capacity.js check(): lưu chuỗi, chuông, ≤ 1 thư/24 h, gỡ chuông
//  6) /api/capacity: người lạ 403, chữ ký sai 401, thiếu CF_ANALYTICS_TOKEN → 503
// Chạy: node scripts/test/capacity.mjs
import { webcrypto, createHmac, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sqliteD1, meter } from '../capacity/meter.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---------- 1) mô phỏng ----------
{
  // tiến trình riêng: biến module của functions (ready, trạng thái hạn mức) không lẫn với D1 của các test dưới
  const f = join(mkdtempSync(join(tmpdir(), 'cap-')), 'sim.json');
  try { execFileSync(process.execPath, [new URL('../capacity/sim.mjs', import.meta.url).pathname, '--users=1', '--seed=60', '--json=' + f], { stdio: 'pipe' }); } catch (e) { /* có SCAN → mã thoát 1, vẫn đọc kết quả */ }
  const r = JSON.parse(readFileSync(f, 'utf8'));
  ok(r.scans.length === 0, 'không truy vấn đường người dùng nào quét cả bảng: ' + r.scans.map(s => s.q.slice(0, 60)).join(' | '));
  const t = r.profiles.typical;
  ok(t.requests > 5 && t.reads > 0 && t.writes > 0, `typical có số đo (${t.requests} lượt, ${t.reads} đọc, ${t.writes} ghi)`);
  ok(r.profiles.heavy.writes > t.writes && t.writes > r.profiles.light.writes, 'heavy > typical > light (ghi)');
  ok(r.quotaState.readsSecondIsolate === 0, 'isolate thứ 2 cùng trung tâm không đọc lại trạng thái hạn mức từ D1');
  ok(r.projection.scale.length === 4 && r.projection.scale.some(p => p.dau === 1e6), 'ngoại suy 1k/10k/100k/1M DAU');
  ok(['writes', 'reads', 'requests'].includes(r.projection.bottleneckFree), 'có nút thắt gói Free');
}

// ---------- môi trường chung cho các test đơn vị ----------
const RealDate = Date; let OFF = 0;
class SimDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + OFF); } static now() { return RealDate.now() + OFF; } }
globalThis.Date = SimDate;
const store = new Map(), keyOf = r => typeof r === 'string' ? r : r.url;
globalThis.caches = { default: {
  async match(r) { const e = store.get(keyOf(r)); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body, { headers: e.headers }); },
  async put(r, res) { const m = (res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/); store.set(keyOf(r), { body: await res.text(), headers: [...res.headers], exp: Date.now() + (m ? +m[1] : 0) * 1000 }); },
  async delete(r) { return store.delete(keyOf(r)); },
} };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(RealDate.now() / 1000);
const tok = async (email, sub = 'u-' + email) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 7 * 86400, iat: sec, auth_time: sec, sub, email, email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
let gql = null; const mails = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('googleapis.com/service_accounts')) return new Response(JSON.stringify({ keys: [jwk] }));
  if (url === 'https://api.cloudflare.com/client/v4/graphql') return gql ? gql(JSON.parse(init.body)) : new Response('{}', { status: 500 });
  return new Response('{}', { status: 404 });
};
const be = sqliteD1(), M = meter(be.raw), DB = M.db;
const reads = async fn => { M.begin('t'); await fn(); return M.end().reads; };

// ---------- 2) _quota.js ----------
{
  const Q = await import('../../functions/api/_quota.js');
  const env = { DB }, req = () => new Request('https://lexkite.com/api/sync', { headers: { 'CF-Connecting-IP': '192.0.2.7' } });
  Q.resetState(); store.clear();
  const r1 = await reads(() => Q.gate(req(), env, 'sync', { who: null }));
  ok(r1 >= 0, 'lần đầu đọc D1');
  Q.resetState({ memoryOnly: true });
  const r2 = await reads(() => Q.gate(req(), env, 'sync', { who: null }));
  const stateQ = [...M.queries.values()].filter(e => /FROM quota_config/.test(e.q)).reduce((t, e) => t + e.n, 0);
  ok(stateQ === 1, `isolate mới cùng trung tâm dùng bản đệm chung (truy vấn quota_config: ${stateQ})`);
  Q.resetState(); // quản trị đổi cấu hình → xoá bản đệm chung
  await Q.gate(req(), env, 'sync', { who: null });
  ok([...M.queries.values()].filter(e => /FROM quota_config/.test(e.q)).reduce((t, e) => t + e.n, 0) === 2, 'quản trị đổi → đọc lại D1');
  OFF += 61e3; Q.resetState({ memoryOnly: true });
  await Q.gate(req(), env, 'sync', { who: null });
  ok([...M.queries.values()].filter(e => /FROM quota_config/.test(e.q)).reduce((t, e) => t + e.n, 0) === 3, 'hết 60 s → đọc lại D1');
  const idx = be.sql.prepare("SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name IN ('quota_count', 'quota_flag')").all();
  ok(!idx.some(i => i.name === 'quota_count_day') && idx.some(i => i.name === 'quota_count_d' && !/\bn\b/.test(i.sql.split('(')[1])), 'chỉ mục quota_count chỉ theo day (đếm không ghi thêm dòng chỉ mục)');
  ok(idx.some(i => i.name === 'quota_flag_until'), 'chỉ mục quota_flag(until)');
  r1 && r2;
}

// ---------- 3) notices.js ----------
{
  const N = await import('../../functions/api/notices.js');
  const env = { DB }, uid = 'u-n@x.y', T = await tok('n@x.y');
  const get = async () => (await (await N.onRequestGet({ request: new Request('https://lexkite.com/api/notices?lang=vi', { headers: { Authorization: 'Bearer ' + T, 'CF-Connecting-IP': '192.0.2.8' } }), env })).json());
  be.sql.exec('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID');
  const g0 = await get(); ok(g0.ok, 'GET /api/notices ' + JSON.stringify(g0)); store.clear();
  const now = Date.now();
  await be.raw.batch([
    be.raw.prepare("INSERT INTO notices (id, at, title, body, kind, target, send_at, expire_at, lang, revoked) VALUES ('n_live1', ?1, 'A', 'B', 'info', '{\"type\":\"all\"}', NULL, NULL, 'all', 0)").bind(now - 1000),
    be.raw.prepare("INSERT INTO notices (id, at, title, body, kind, target, send_at, expire_at, lang, revoked) VALUES ('n_soon1', ?1, 'S', 'B', 'info', '{\"type\":\"all\"}', ?2, NULL, 'all', 0)").bind(now, now + 30e3),
    be.raw.prepare("INSERT INTO notices (id, at, title, body, kind, target, send_at, expire_at, lang, revoked) VALUES ('n_exp01', ?1, 'E', 'B', 'info', '{\"type\":\"all\"}', NULL, ?2, 'all', 0)").bind(now - 2000, now + 20e3),
    be.raw.prepare("INSERT INTO notices (id, at, title, body, kind, target, send_at, expire_at, lang, revoked) VALUES ('n_user1', ?1, 'U', 'B', 'info', ?2, NULL, NULL, 'all', 0)").bind(now - 3000, JSON.stringify({ type: 'users', uids: [uid] })),
  ]);
  const a = await get(), ids = x => x.notices.map(y => y.id).sort().join(',');
  ok(ids(a) === 'n_exp01,n_live1,n_user1', 'lần 1: đúng danh sách (hẹn giờ chưa tới không hiện) → ' + ids(a));
  const listQ = () => [...M.queries.values()].filter(e => /FROM notices WHERE revoked = 0 AND/.test(e.q)).reduce((t, e) => t + e.n, 0);
  const q0 = listQ(); const b = await get();
  ok(listQ() === q0 && ids(b) === ids(a), 'lần 2 trong 60 s: không đọc lại danh sách công khai từ D1');
  OFF += 31e3; const c = await get();
  ok(listQ() === q0 && ids(c) === 'n_live1,n_soon1,n_user1', 'đệm vẫn còn: hẹn giờ tới đúng lúc, hết hạn biến mất → ' + ids(c));
  ok(c.notices.find(x => x.id === 'n_user1') && !JSON.stringify(c).includes('"uids"'), 'thông báo theo người vẫn lọc theo uid, không lộ danh sách uid');
  await be.raw.prepare("UPDATE notices SET revoked = 1 WHERE id = 'n_live1'").run(); await N.purgeNotices();
  const d = await get();
  ok(!ids(d).includes('n_live1') && listQ() === q0 + 1, 'thu hồi + purgeNotices → đọc lại, biến mất');
  const plan = be.sql.prepare("EXPLAIN QUERY PLAN SELECT id FROM notices WHERE revoked = 0 AND (send_at IS NULL OR send_at <= 1) AND (expire_at IS NULL OR expire_at > 1) AND (lang = 'all' OR lang IS NULL OR lang = 'vi') ORDER BY at DESC LIMIT 50").all().map(p => p.detail).join(' / ');
  ok(/USING INDEX notices_live/.test(plan) && !/TEMP B-TREE/.test(plan), 'danh sách thông báo dùng chỉ mục notices_live: ' + plan);
}

// ---------- 4) hit.js dọn phiên theo chỉ mục ----------
{
  const H = await import('../../functions/api/hit.js');
  const rnd = Math.random; Math.random = () => 0;
  await H.onRequestPost({ request: new Request('https://lexkite.com/api/hit', { method: 'POST', headers: { 'User-Agent': 'Mozilla/5.0 Chrome/130', 'CF-Connecting-IP': '192.0.2.9' }, body: JSON.stringify({ t: 's', sid: 'abcdefgh1', vid: 'vidvidvid1', path: 'home', pages: 1, dur: 3 }) }), env: { DB } });
  Math.random = rnd;
  const del = [...M.queries.values()].find(e => /^DELETE FROM sessions/.test(e.q));
  ok(del && /day </.test(del.q), 'dọn phiên cũ chạy (Math.random = 0)');
  const plan = del ? be.sql.prepare('EXPLAIN QUERY PLAN ' + del.q).all(...del.args).map(p => p.detail).join(' / ') : '';
  ok(/SEARCH sessions USING (COVERING )?INDEX sessions_day/.test(plan), 'DELETE sessions dùng chỉ mục day: ' + plan);
}

// ---------- 4a) hit.js: Analytics Engine + chế độ hybrid (nhịp hb chỉ vào AE) ----------
{
  const H = await import('../../functions/api/hit.js');
  const pts = [], HITS = { writeDataPoint: p => pts.push(p) };
  ok(H.hitMode({}) === 'd1' && H.hitMode({ HITS }) === 'd1', 'không khoá đọc AE → d1 (Quản trị vẫn đọc được "đang online")');
  ok(H.hitMode({ HITS, CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'a' }) === 'hybrid' && H.hitMode({ HITS, CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'a', HIT_STORE: 'd1' }) === 'd1', 'đủ binding + khoá → hybrid; HIT_STORE=d1 → rollback');
  ok(H.hitMode({ HIT_STORE: 'hybrid' }) === 'd1', 'ép hybrid mà thiếu binding → d1');
  const sessW = () => [...M.queries.values()].filter(e => /^INSERT INTO sessions/.test(e.q)).reduce((t, e) => t + e.n, 0);
  const pvW = () => [...M.queries.values()].filter(e => /^INSERT INTO pageviews_day/.test(e.q)).reduce((t, e) => t + e.n, 0);
  const beacon = (env, extra) => H.onRequestPost({ request: new Request('https://lexkite.com/api/hit', { method: 'POST', headers: { 'User-Agent': 'Mozilla/5.0 Chrome/130', 'CF-Connecting-IP': '192.0.2.31' }, body: JSON.stringify({ t: 's', sid: 'sidae0001', vid: 'vidae0001', path: 'home', cur: 'review', pages: 3, dur: 200, pv: { review: 2 }, ...extra }) }), env });
  const hyb = { DB, HITS, CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'a' };
  let s0 = sessW(), p0 = pvW();
  await beacon(hyb, {});
  ok(sessW() === s0 + 1 && pvW() === p0 + 1 && pts.length === 1 && pts[0].blobs[11] === 's', 'beacon thường: D1 + 1 điểm AE');
  s0 = sessW(); p0 = pvW();
  await beacon(hyb, { hb: 1 });
  ok(sessW() === s0 && pvW() === p0 && pts.length === 2 && pts[1].blobs[11] === 'hb' && pts[1].indexes[0] === 'vidae0001', 'hybrid: nhịp hb → chỉ AE, 0 dòng D1');
  s0 = sessW(); p0 = pvW();
  await beacon({ DB }, { hb: 1 });
  ok(sessW() === s0 + 1 && pvW() === p0, 'd1: nhịp hb vẫn ghi phiên nhưng KHÔNG cộng lượt xem (máy khách gửi cộng dồn, tính ở lần sau)');
  const fake = async (u, init) => { ok(/analytics_engine\/sql$/.test(u) && /FROM lexkite_hits/.test(init.body) && /blob11 = ''/.test(init.body), 'SQL AE đúng bảng, loại máy tự động'); return new Response(JSON.stringify({ data: [{ vid: 'v1', cur: 'review', at: 3 }, { vid: 'v2', cur: 'home', at: 2 }, { vid: 'v1', cur: 'home', at: 1 }, { vid: 'adm', cur: 'admin', at: 1 }] })); };
  const on = await H.aeOnline(hyb, Date.now(), ['adm'], fake);
  ok(on && on.n === 2 && on.viewing.find(v => v.k === 'review').n === 1 && on.viewing.find(v => v.k === 'home').n === 1, 'đang online từ AE: đếm khách khác nhau, trang mới nhất, bỏ quản trị');
  ok(await H.aeOnline({}, Date.now(), [], fake) === null, 'thiếu khoá → null (Quản trị lùi về D1)');
}

// ---------- 4b) config.js: đệm biên 5 phút + ETag/304 ----------
{
  const CF = await import('../../functions/api/config.js');
  be.sql.exec('CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID');
  be.sql.prepare("INSERT OR REPLACE INTO config (k, v) VALUES ('banner', 'Xin chào')").run();
  const cq = () => [...M.queries.values()].filter(e => /FROM config WHERE k IN \(\?/.test(e.q)).reduce((t, e) => t + e.n, 0);
  const g = (h = {}) => CF.onRequestGet({ request: new Request('https://lexkite.com/api/config', { headers: h }), env: { DB } });
  const a = await g(), et = a.headers.get('ETag'), q0 = cq();
  ok(a.status === 200 && (await a.json()).banner === 'Xin chào' && et, 'config: 200 + ETag');
  const b = await g({ 'If-None-Match': et });
  ok(b.status === 304 && cq() === q0, 'config: If-None-Match khớp → 304, lấy từ đệm biên (không đọc D1)');
  be.sql.prepare("UPDATE config SET v = 'Mới' WHERE k = 'banner'").run();
  ok((await (await g()).json()).banner === 'Xin chào', 'config: trong 5 phút dùng bản đệm');
  await CF.purgeConfig();
  const c = await g({ 'If-None-Match': et });
  ok(c.status === 200 && (await c.json()).banner === 'Mới' && c.headers.get('ETag') !== et, 'quản trị lưu → purgeConfig → bản mới, ETag mới');
  OFF += 301e3; await g(); ok(cq() === q0 + 2, 'config: hết 5 phút → đọc lại D1');
}

// ---------- 5) luật cảnh báo + check() ----------
const C = await import('../../functions/api/_capacity.js');
const CAP = await import('../../functions/api/capacity.js');
{
  const rows = (vals, k = 'writes') => vals.map((v, i) => ({ day: `2026-10-${String(10 + i).padStart(2, '0')}`, reads: 0, writes: 0, requests: 0, [k]: v }));
  let e = C.evaluate(rows([10e3, 20e3, 61e3, 62e3, 65e3]), C.LIMITS.free, C.ALERT, '2026-10-15');
  ok(e.alert && e.metrics[0].streak === 3 && e.upgradeBy, '≥ 60 % 3 ngày liền → cảnh báo, có hạn chót ' + e.upgradeBy);
  e = C.evaluate(rows([61e3, 30e3, 62e3, 65e3]), C.LIMITS.free, C.ALERT, '2026-10-14');
  ok(!e.metrics[0].streak || e.metrics[0].streak < 3, '2 ngày ≥ 60 % chưa đủ chuỗi');
  e = C.evaluate(rows([10e3, 15e3, 20e3, 25e3, 30e3]), C.LIMITS.free, C.ALERT, '2026-10-15');
  ok(e.alert && e.metrics[0].eta === 10 && /80%/.test(e.reason), 'dự báo chạm 80 % sau 10 ngày → cảnh báo');
  ok(C.alertText(e) === 'Nâng gói Cloudflare 5 USD trước ngày ' + C.fmtVN(e.upgradeBy) && /^\d{2}\/\d{2}\/\d{4}$/.test(C.fmtVN(e.upgradeBy)), 'nội dung: ' + C.alertText(e));
  e = C.evaluate(rows([10e3, 10e3, 10e3, 10e3]), C.LIMITS.free, C.ALERT, '2026-10-14');
  ok(!e.alert && e.upgradeBy === null, 'đi ngang 10 % → không cảnh báo');
  e = C.evaluate(rows([1e6, 2e6, 3e6], 'reads'), C.LIMITS.free, C.ALERT, '2026-10-13');
  ok(e.alert && e.metrics.find(m => m.k === 'reads').eta != null, 'dòng đọc cũng được theo dõi');
  e = C.evaluate([...rows([10e3, 10e3, 10e3]), { day: '2026-10-13', writes: 99e3, reads: 0, requests: 0 }], C.LIMITS.free, C.ALERT, '2026-10-13');
  ok(!e.alert, 'hôm nay (còn dở) không tính vào luật');

  // check(): GraphQL giả
  let series = (k, f) => Array.from({ length: 30 }, (_, i) => ({ dimensions: { date: new RealDate(Date.now() - (29 - i) * 864e5).toISOString().slice(0, 10) }, sum: f(i) }));
  let high = true;
  gql = body => { ok(/databaseId:"7ce39cd0-9333-4843-bd6f-5ccbefbde670"/.test(body.query), 'GraphQL lọc đúng D1 lexkite-sync');
    return new Response(JSON.stringify({ data: { viewer: { accounts: [{ d1: series('d1', i => ({ rowsRead: 1000, rowsWritten: high && i >= 25 ? 70e3 : 5e3 })), fn: series('fn', () => ({ requests: 2000 })), wk: [...series('wk', () => ({ requests: 300 })), ...series('wk', () => ({ requests: 200 }))] }] } } })); };
  const env = { DB, CF_ANALYTICS_TOKEN: 't', CF_ACCOUNT_ID: 'e34e14b7ab35eaf2b3d9d84fcce011f7', MAIL: { fetch: async (u, init) => { mails.push(JSON.parse(init.body)); return new Response('{}'); } } };
  let out = await CAP.check(env, DB);
  ok(out.ok && out.rows === 30 && out.evaluation.alert, 'check: 30 ngày, cảnh báo ghi ≥ 60 %');
  const row = await be.raw.prepare('SELECT * FROM capacity_daily ORDER BY day DESC LIMIT 1').first();
  ok(row && row.requests === 2500 && row.workers === 500, 'requests = Pages Functions + mọi Worker');
  const bell = await be.raw.prepare("SELECT * FROM drive_alerts WHERE kind = 'capacity'").first();
  ok(bell && bell.level === 'crit' && JSON.parse(bell.msg).msg.startsWith('Nâng gói Cloudflare 5 USD trước ngày '), 'chuông Quản trị: ' + (bell && JSON.parse(bell.msg).msg.slice(0, 60)));
  ok(mails.length === 1 && /Nâng gói Cloudflare 5 USD trước ngày/.test(mails[0].subject), 'thư cảnh báo đã gửi');
  out = await CAP.check(env, DB);
  ok(mails.length === 1, 'chạy lại trong 24 h → không gửi thư lần 2');
  OFF += 25 * 3600e3; await CAP.check(env, DB);
  ok(mails.length === 2, 'sau 24 h còn nguy cơ → nhắc lại');
  high = false; out = await CAP.check(env, DB);
  ok(!out.evaluation.alert && !(await be.raw.prepare("SELECT 1 AS x FROM drive_alerts WHERE kind = 'capacity'").first()), 'hết nguy cơ → gỡ chuông');
  const D = await import('../../functions/api/drive.js');
  ok(D.EXT_KINDS.has('capacity'), "Kho Drive health không xoá chuông 'capacity'");
  const tr = await CAP.trend(env, DB);
  ok(tr.rows.length >= 30 && tr.limits.free.writes === 100000, 'trend: chuỗi + hạn mức cho Quản trị');
  let err = null; try { await CAP.check({ DB }, DB); } catch (e2) { err = e2; }
  ok(err && err.code === 503 && err.message === 'no-analytics-token', 'thiếu CF_ANALYTICS_TOKEN → 503');
}

// ---------- 6) /api/capacity: quyền ----------
{
  const CLI = 'cli_SECRET_key_0123456789abcdef';
  const env = { DB, ADMIN_EMAILS: 'boss@lexkite.com', LEXKITE_DRIVE_CLI_KEY: CLI };
  const post = async (body, headers = {}) => { const r = await CAP.onRequestPost({ request: new Request('https://lexkite.com/api/capacity', { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://lexkite.com', 'CF-Connecting-IP': '192.0.2.10', ...headers }, body: JSON.stringify(body) }), env }); return { s: r.status, j: await r.json() }; };
  ok((await post({ op: 'trend' })).s === 403, 'không đăng nhập → 403');
  ok((await post({ op: 'trend' }, { Authorization: 'Bearer ' + await tok('someone@gmail.com') })).s === 403, 'người lạ → 403');
  const adm = await post({ op: 'trend' }, { Authorization: 'Bearer ' + await tok('boss@lexkite.com') });
  ok(adm.s === 200 && Array.isArray(adm.j.rows) && adm.j.analytics === false, 'quản trị xem trend (analytics=false khi thiếu khoá)');
  ok((await post({ op: 'check' }, { Authorization: 'Bearer ' + await tok('boss@lexkite.com') })).s === 400, 'quản trị không chạy check qua trình duyệt');
  const ts = Math.floor(Date.now() / 1000), text = JSON.stringify({ op: 'check' });
  const sig = k => createHmac('sha256', k).update(ts + '.' + createHash('sha256').update(text).digest('hex')).digest('hex');
  ok((await post({ op: 'check' }, { 'X-Drive-Ts': String(ts), 'X-Drive-Sig': sig('wrong-key-wrong-key-wrong-key') })).s === 401, 'chữ ký sai → 401');
  const good = await post({ op: 'check' }, { 'X-Drive-Ts': String(ts), 'X-Drive-Sig': sig(CLI) });
  ok(good.s === 503 && good.j.error === 'no-analytics-token', 'chữ ký đúng, thiếu khoá Analytics → 503 (workflow bỏ qua trung tính)');
}

globalThis.Date = RealDate;
console.log(fails ? `✗ capacity: ${fails}/${n} lỗi` : `✓ capacity: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
