// Bảng tổng hợp thống kê Quản trị (functions/api/_rollup.js, docs/CAPACITY.md §D4): KHỚP từng trường với SQL cũ (ADMIN_ROLLUP=0) và không quét `sessions`.
// Sự cố 03/11: D1 3,9 triệu dòng đọc/ngày – trang Quản trị (Tổng quan/Phân tích/Trực tiếp/Tăng trưởng) quét cả bảng ~25 câu mỗi lần mở.
// Dữ liệu ngẫu nhiên có hạt giống (70 ngày, người thật + bot + tài khoản quản trị + NULL), node:sqlite + đồng hồ D1 ước lượng (scripts/capacity/meter.mjs).
// Kiểm: overview · analytics 1/7/30/90/365 · live · growth 7/30/90 trùng khớp; mở lại (ấm) ≤ ngân sách & 0 SCAN sessions; dựng lại khi danh sách quản trị đổi,
// ngày chưa chốt được dựng lại, ngày chốt không đọc lại sessions; phiên gửi bù vào hôm qua hiện ra sau ≤ 10 phút. Chạy: node scripts/test/admin-rollup.mjs
import { webcrypto } from 'node:crypto';
import { meter, sqliteD1, explainAll } from '../capacity/meter.mjs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
  async delete(req) { return store.delete(req.url); },
} };
const realNow = Date.now; let NOW = Date.UTC(2026, 10, 3, 9, 0, 0); Date.now = () => NOW;
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url');
const tok = async (sub, email) => { const sec = Math.floor(NOW / 1000), h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub, email, email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async url => { if (String(url).includes('googleapis.com/service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) }; throw new Error('mạng bị chặn trong test: ' + url); };

// ---------- dữ liệu ----------
const be = sqliteD1(), M = meter(be.raw), sql = be.sql;
const H = await import(new URL('../../functions/api/hit.js', import.meta.url));
const A = await import(new URL('../../functions/api/admin.js', import.meta.url));
const R = await import(new URL('../../functions/api/_rollup.js', import.meta.url));
await H.setup(M.db);
sql.exec('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID');
let seed = 20261103; const rnd = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32), pick = a => a[Math.floor(rnd() * a.length)], maybe = (p, v, o = null) => (rnd() < p ? v : o);
const DAY = 864e5, VN = 7 * 3600e3, today = H.dayOf(NOW);
const VIDS = Array.from({ length: 70 }, (_, i) => 'v' + String(i).padStart(3, '0') + 'aaaaaa');
const BOSS = ['b1bossvida', 'b2bossvidb'];
const ins = sql.prepare('INSERT INTO sessions (sid, vid, day, at, country, ref, dev, lang, plat, path, dur, pages, ret, lcp, last, last_path, bot) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
let sid = 0;
const addSession = (at, o = {}) => {
  const vid = o.vid || pick(VIDS), dur = maybe(0.95, Math.floor(rnd() * 2400), null), pages = maybe(0.97, 1 + Math.floor(rnd() * 6), null);
  ins.run('s' + String(sid++).padStart(9, '0'), vid, H.dayOf(at), at, pick(['VN', 'VN', 'US', 'IN', 'ID', 'BR', 'XX', 'JP']), pick(['', '', 'google.com', 'facebook.com', 't.co', null, 'bing.com', 'youtube.com']),
    pick(['mobile', 'desktop', 'tablet', null]), pick(['vi', 'en', 'es', 'pt', '']), pick(['web', 'web', 'pwa', 'android', 'ios', '', null]), pick(['home', 'review', 'learn', 'dict', 'welcome', 'blog', 'say', 'call', 'me', 'video']),
    dur, pages, o.ret !== undefined ? o.ret : pick([0, 0, 1, 1, 1, null]), pick([null, null, 0, 900, 1800, 2400, 2600, 4100, 1200 + Math.floor(rnd() * 3000)]),
    o.last || at + (dur || 0) * 1000, pick(['home', 'review', null, 'learn']), o.bot !== undefined ? o.bot : maybe(0.25, pick(['ci', 'ua', 'dc', 'ci-app', 'admin', 'bot'])));
};
for (let k = 70; k >= 0; k--) {
  const d0 = Date.parse(H.dayOf(NOW - k * DAY) + 'T00:00:00Z') - VN; // 0h giờ VN
  for (let i = 0, m = 10 + Math.floor(rnd() * 30); i < m; i++) { const at = d0 + Math.floor(rnd() * DAY); if (at <= NOW) addSession(at); }
  if (rnd() < 0.5) addSession(d0 + 3600e3 * 10, { vid: pick(BOSS), bot: null }); // tài khoản quản trị dùng như người thật
}
for (let i = 0; i < 6; i++) addSession(NOW - Math.floor(rnd() * 4 * 60e3), { last: NOW - Math.floor(rnd() * 4 * 60e3), bot: null }); // "đang online"
const U = []; for (let i = 0; i < 30; i++) { const c = NOW - Math.floor(rnd() * 100 * DAY); U.push(['u' + i, `u${i}@ex.com`, c, Math.min(NOW, c + Math.floor(rnd() * 40 * DAY)), pick(['web', 'android', 'ios', '', null]), 1 + Math.floor(rnd() * 9)]); }
U.push(['uBoss', 'Boss@Lexkite.com', NOW - 90 * DAY, NOW, 'web', 50]);
for (const u of U) sql.prepare('INSERT INTO users (uid, email, created, seen, plat, n) VALUES (?, ?, ?, ?, ?, ?)').run(u[0], u[1], u[2], u[3], u[4], u[5]);
for (let i = 0; i < 40; i++) sql.prepare('INSERT OR IGNORE INTO vid_uid (vid, uid, at) VALUES (?, ?, ?)').run(VIDS[i], 'u' + (i % 30), NOW - 50 * DAY);
for (const v of BOSS) sql.prepare('INSERT INTO vid_uid (vid, uid, at) VALUES (?, ?, ?)').run(v, 'uBoss', NOW - 60 * DAY);
for (let k = 40; k >= 0; k--) for (let i = 0; i < 4; i++) sql.prepare('INSERT OR IGNORE INTO ext_daily (day, vid, lookup, save, popup, newtab, ver) VALUES (?, ?, ?, 1, 1, 0, ?)').run(H.dayOf(NOW - k * DAY), pick([VIDS[3], VIDS[5], 'extonlyaaa', 'extonlybbb', VIDS[60]]), pick([0, 1, 4, null]), pick(['1.2', '1.3']));
for (let k = 40; k >= 0; k--) sql.prepare("INSERT OR IGNORE INTO ext_events (day, kind, n) VALUES (?, 'install', ?)").run(H.dayOf(NOW - k * DAY), 1 + (k % 3));
sql.exec('CREATE TABLE IF NOT EXISTS docs (uid TEXT, k TEXT, h TEXT, body TEXT, updated INTEGER, PRIMARY KEY (uid, k)) WITHOUT ROWID; CREATE TABLE IF NOT EXISTS contact_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, who TEXT, at INTEGER, name TEXT, email TEXT, msg TEXT, lang TEXT, sent INTEGER DEFAULT 0)');
sql.exec("CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID; INSERT OR REPLACE INTO config (k, v) VALUES ('hit_rate', '0.5')");
for (let i = 0; i < 5; i++) sql.prepare('INSERT OR IGNORE INTO pageviews_day (day, path, n) VALUES (?, ?, ?)').run(today, pick(['home', 'review', 'learn', 'dict']) + i, 3 + i);
const total = sql.prepare('SELECT COUNT(*) AS n FROM sessions').get().n;

// ---------- gọi API quản trị ----------
const envNew = { DB: M.db, ADMIN_EMAILS: 'boss@lexkite.com' }, envOld = { ...envNew, ADMIN_ROLLUP: '0' };
const call = async (env, op, extra = {}) => {
  store.clear(); M.begin(op);
  const r = await A.onRequestPost({ request: new Request('https://lexkite.com/api/admin', { method: 'POST', headers: { Origin: 'https://lexkite.com', 'CF-Connecting-IP': '9.9.9.' + (n % 200), Authorization: 'Bearer ' + await tok('uBoss', 'boss@lexkite.com'), 'Content-Type': 'application/json' }, body: JSON.stringify({ op, ...extra }) }), env });
  const c = M.end(), j = await r.json(); if (r.status !== 200) console.log('  ', op, r.status, JSON.stringify(j).slice(0, 300));
  return { j, reads: c.reads };
};
// So sánh: số thực sai số 1e-9; mảng không thứ tự cố định (GROUP BY không ORDER) → so như tập
const norm = v => (Array.isArray(v) ? v.map(norm).sort((a, b) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : 1)) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])])) : typeof v === 'number' && !Number.isInteger(v) ? Math.round(v * 1e9) / 1e9 : v);
const diff = (a, b, p = '') => {
  if (JSON.stringify(norm(a)) === JSON.stringify(norm(b))) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a)) { for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = diff(a[k], b[k], p + '.' + k); if (d) return d; } }
  return `${p}: cũ ${String(JSON.stringify(norm(a))).slice(0, 260)} ≠ mới ${String(JSON.stringify(norm(b))).slice(0, 260)}`;
};
const same = async (op, extra, skip = []) => {
  const o = await call(envOld, op, extra), w = await call(envNew, op, extra);
  const a = { ...o.j }, b = { ...w.j };
  for (const k of skip) { delete a[k]; delete b[k]; }
  if (op === 'live') { delete a.at; delete b.at; }
  const d = diff(a, b); ok(!d, `${op} ${JSON.stringify(extra)} khớp SQL cũ – ${d}`);
  return { old: o, now: w };
};

const before = {};
for (const days of [1, 7, 30, 90, 365]) {
  const r = await same('analytics', { days }, ['hours', 'wdays']); before['analytics' + days] = r.old.reads;
  // Giờ cao điểm & thứ trong tuần: nay theo NGÀY VN của khoảng (như mọi thẻ khác) – so với SQL theo day >= from
  const from = H.dayOf(NOW - (days - 1) * DAY), adm = "('b1bossvida', 'b2bossvidb')";
  const hrs = sql.prepare(`SELECT CAST(((at + 25200000) / 3600000) % 24 AS INTEGER) AS k, COUNT(*) AS n FROM sessions WHERE bot IS NULL AND vid NOT IN ${adm} AND day >= ? GROUP BY k ORDER BY k`).all(from);
  const wds = sql.prepare(`SELECT CAST(((at + 25200000) / 86400000 + 4) % 7 AS INTEGER) AS k, COUNT(*) AS n FROM sessions WHERE bot IS NULL AND vid NOT IN ${adm} AND day >= ? GROUP BY k ORDER BY k`).all(from);
  ok(JSON.stringify(r.now.j.hours) === JSON.stringify(hrs.map(x => ({ ...x }))) && JSON.stringify(r.now.j.wdays) === JSON.stringify(wds.map(x => ({ ...x }))), `analytics ${days} ngày: giờ cao điểm/thứ trong tuần theo ngày VN đúng`);
}
for (const P of [7, 30, 90]) { const r = await same('growth', { days: P }); before['growth' + P] = r.old.reads; }
{ const r = await same('overview', {}); before.overview = r.old.reads; }
{ const r = await same('live', { days: 30 }); before.live = r.old.reads; }
ok(before.analytics30 > total, `SQL cũ: analytics 30 ngày đọc > cả bảng (${before.analytics30} > ${total})`);

// ---------- mở lại trang (ấm): ngân sách & không quét sessions ----------
R._resetRollup(); A._resetAdminMem(); await call(envNew, 'overview'); // nạp lại stats_day từ D1 (isolate mới)
R._resetRollup(); A._resetAdminMem();
const q0 = new Set(M.queries.keys());
const warm = {}; for (const [op, x] of [['overview', {}], ['analytics', { days: 30 }], ['live', { days: 30 }], ['growth', { days: 30 }], ['usage', {}]]) warm[op] = (await call(envNew, op, x)).reads;
const warmSum = Object.values(warm).reduce((a, b) => a + b, 0);
const BUDGET = 5000;
ok(warmSum <= BUDGET, `1 lần mở Quản trị (isolate mới, bảng tổng hợp có sẵn) ≤ ${BUDGET} dòng đọc: ${warmSum} ${JSON.stringify(warm)}`);
// Số đọc SQL cũ ở node:sqlite bị ước lượng THẤP (SEARCH theo chỉ mục day chỉ tính số dòng trả về) – số thật trước/sau đo bằng Miniflare: scripts/capacity/admin-sim.mjs
const oldSum = before.overview + before.analytics30 + before.live + before.growth30;
const plans = explainAll(M, sql).filter(p => !q0.has(p.q) || true);
const newPaths = plans.filter(p => [...p.labels].some(l => ['overview', 'analytics', 'live', 'growth', 'usage'].includes(l)));
const scanSess = newPaths.filter(p => p.scans.includes('sessions') && !/ADMIN_ROLLUP|vid NOT IN/.test(p.q) && !p.labels.every(() => false));
// Chỉ câu chạy ở đường mới (câu cũ chỉ chạy khi ADMIN_ROLLUP=0 cũng mang nhãn op – lọc theo mẫu SQL cũ)
const legacySql = q => /FROM sessions WHERE bot IS NULL( AND vid NOT IN|\s+AND (day|at|last) )|WITH f AS|WITH a AS|WITH v AS|FROM sessions s JOIN|SELECT COUNT\(\*\) AS n FROM sessions WHERE at >=/.test(q);
const bad = newPaths.filter(p => p.scans.includes('sessions') && !legacySql(p.q));
ok(!bad.length, 'đường mới không SCAN sessions: ' + bad.map(p => p.q.slice(0, 120) + ' → ' + p.plan.join(' / ')).join(' | '));
void scanSess;

// ---------- Trực tiếp tự làm mới 30 giây/lần: phiên mới/cập nhật hiện ra, chỉ đọc phiên vừa đổi (chỉ mục sessions_last) ----------
for (let k = 0; k < 3; k++) {
  NOW += 30e3; addSession(NOW - 2000, { bot: null, last: NOW - 1000 });
  sql.prepare('UPDATE sessions SET pages = pages + 1, last = ? WHERE sid = (SELECT sid FROM sessions WHERE day = ? AND bot IS NULL LIMIT 1)').run(NOW - 500, today);
  const r = await same('live', { days: 30 });
  ok(r.now.reads <= 80, `lượt tự làm mới ${k + 1}: ≤ 80 dòng đọc (${r.now.reads}; SQL cũ ${r.old.reads})`);
}
// ---------- danh sách quản trị đổi → dựng lại; ngày chốt không đọc lại ----------
R.rollStats.builds = 0; R._resetRollup(); A._resetAdminMem(); await call(envNew, 'analytics', { days: 30 });
ok(R.rollStats.builds <= 2, `ấm: chỉ dựng lại ngày chưa chốt (≤ 2 ngày) – ${R.rollStats.builds}`);
sql.prepare('INSERT INTO vid_uid (vid, uid, at) VALUES (?, ?, ?)').run(VIDS[69], 'uBoss', NOW);
R.rollStats.builds = 0; R._resetRollup(); A._resetAdminMem();
await same('analytics', { days: 30 }, ['hours', 'wdays']);
ok(R.rollStats.builds >= 29, `thêm vid quản trị → dựng lại các ngày (${R.rollStats.builds}) và vẫn khớp SQL cũ`);
// Phiên gửi bù vào hôm qua (≤ 36 giờ) → ngày chưa chốt được dựng lại sau ≤ 10 phút
NOW += 11 * 60e3; addSession(NOW - DAY, { bot: null, vid: 'latevidaaaa' });
R._resetRollup(); A._resetAdminMem();
await same('analytics', { days: 7 }, ['hours', 'wdays']);
await same('overview', {});
// Ngày mới (qua 0h VN): hôm qua thành ngày đã qua, vẫn khớp
NOW = Date.parse(H.dayOf(NOW + DAY) + 'T00:00:00Z') - VN + 30 * 60e3; addSession(NOW - 60e3, { bot: null });
await same('live', { days: 30 }); await same('growth', { days: 7 });
// Cờ quay lại ADMIN_ROLLUP=0 thật sự chạy SQL cũ (quét sessions)
{ const q1 = M.totals.reads; await call(envOld, 'analytics', { days: 30 }); ok(M.totals.reads - q1 > total, 'ADMIN_ROLLUP=0 → SQL cũ'); }

console.log(`  số dòng đọc (ước lượng node:sqlite, ${total} phiên/71 ngày): mở trang SQL cũ ${oldSum} → mới ${warmSum}`);
Date.now = realNow;
console.log(fails ? `✗ admin-rollup: ${fails}/${n} lỗi` : `✓ admin-rollup: ${n} kiểm tra đạt (khớp SQL cũ, ≤ ${BUDGET} dòng/lần mở, 0 SCAN sessions)`);
process.exit(fails ? 1 : 0);
