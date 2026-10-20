// Test thống kê truy cập (functions/api/hit.js → admin.js op live/analytics/overview, growth.js): không mạng – D1 giả bằng node:sqlite.
// Loại máy tự động (header CI, UA bot/headless, ASN máy chủ đám mây) · loại quản trị (#/admin, vid gắn tài khoản ADMIN_EMAILS) ·
// gộp trùng theo sid (bot không "hoá người") · ngày theo giờ Việt Nam (ranh giới 17:00 UTC) · % quốc gia khớp số khách · di chuyển dữ liệu cũ 1 lần.
// Chạy: node scripts/test/analytics.mjs
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
} };

const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; sql.exec('BEGIN'); try { for (const x of list) out.push(await x.run()); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } return out; } };

// Giờ giả lập
const realNow = Date.now; let NOW = Date.UTC(2026, 9, 17, 9, 0, 0); Date.now = () => NOW;

// Firebase ID token giả
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url');
const tok = async (sub, email) => { const sec = Math.floor(NOW / 1000), h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub, email, email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async url => { if (String(url).includes('googleapis.com/service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) }; throw new Error('mạng bị chặn trong test: ' + url); };

// ---------- Dữ liệu CŨ (trước khi có cột bot, ngày UTC): 3 phiên app máy ảo CI ở Mỹ + 1 người thật VN + lượt xem ----------
sql.exec('CREATE TABLE sessions (sid TEXT PRIMARY KEY, vid TEXT, day TEXT NOT NULL, at INTEGER NOT NULL, country TEXT, ref TEXT, dev TEXT, lang TEXT, plat TEXT, path TEXT, dur INTEGER, pages INTEGER, ret INTEGER, lcp INTEGER, last INTEGER, last_path TEXT) WITHOUT ROWID');
sql.exec('CREATE TABLE pageviews_day (day TEXT NOT NULL, path TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (day, path)) WITHOUT ROWID');
const T16 = Date.UTC(2026, 9, 16, 8, 0, 0), ins = sql.prepare("INSERT INTO sessions (sid, vid, day, at, country, plat, path, last_path, pages, dur, ret, last) VALUES (?, ?, ?, ?, ?, ?, 'home', 'welcome', 2, 15, 0, ?)");
ins.run('ci1aaaaaaaa', 'v1ciaaaaaa', '2026-10-16', T16, 'US', 'android', T16); ins.run('ci2aaaaaaaa', 'v2ciaaaaaa', '2026-10-16', T16 + 1, 'US', 'android', T16);
ins.run('ci3aaaaaaaa', 'v3ciaaaaaa', '2026-10-16', T16 + 2, 'US', 'ios', T16);
ins.run('old0aaaaaaa', 'v0oldaaaaa', '2026-10-15', Date.UTC(2026, 9, 15, 8), 'US', 'android', 0); // trước mốc CI → giữ nguyên
ins.run('vn1aaaaaaaa', 'v4vnaaaaaa', '2026-10-16', Date.UTC(2026, 9, 16, 18), 'VN', 'android', 0);  // người thật VN, 01:00 ngày 17 giờ VN
sql.exec("INSERT INTO pageviews_day VALUES ('2026-10-16', 'home', 5), ('2026-10-16', 'welcome', 4), ('2026-10-16', 'review', 2)");

const H = await import(new URL('../../functions/api/hit.js', import.meta.url));
const A = await import(new URL('../../functions/api/admin.js', import.meta.url));
const env = { DB, ADMIN_EMAILS: 'boss@lexkite.com' };
const CHROME = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36';
const hit = async (body, { ua = CHROME, country = 'VN', asn = 45899, headers = {}, ip = '1.2.3.4' } = {}) => {
  const r = new Request('https://lexkite.com/api/hit', { method: 'POST', body: JSON.stringify(body), headers: { 'User-Agent': ua, 'CF-Connecting-IP': ip, ...headers } });
  Object.defineProperty(r, 'cf', { value: { country, asn } });
  return (await H.onRequestPost({ request: r, env })).status;
};
const S = (sid, vid, x = {}) => ({ t: 's', sid, vid, ret: 0, path: 'home', cur: 'home', dev: 'mobile', plat: 'web', lang: 'vi', dur: 20, pages: 1, pv: { home: 1 }, ...x });
const row = sid => sql.prepare('SELECT * FROM sessions WHERE sid = ?').get(sid);
const pv = (day, path) => (sql.prepare('SELECT n FROM pageviews_day WHERE day = ? AND path = ?').get(day, path) || {}).n || 0;

// ---------- 1) Di chuyển dữ liệu cũ (chạy ở lần ghi đầu tiên) ----------
ok(await hit(S('hum1aaaaaaa', 'h1humanaaa', { pv: { home: 1, review: 2 } })) === 204, 'hit trả 204');
ok(row('ci1aaaaaaaa').bot === 'ci-app' && row('ci3aaaaaaaa').bot === 'ci-app', 'phiên app máy ảo CI cũ (Mỹ, sau 16/10 04:00 UTC) → bot = ci-app');
ok(row('old0aaaaaaa').bot === null && row('vn1aaaaaaaa').bot === null, 'phiên trước mốc CI và phiên VN giữ là người thật');
ok(pv('2026-10-16', 'home') === 2 && pv('2026-10-16', 'welcome') === 1 && pv('2026-10-16', 'review') === 2, 'lượt xem home/welcome của phiên CI cũ được trừ (5−3, 4−3)');
ok(row('vn1aaaaaaaa').day === '2026-10-17', 'ngày cũ đổi sang giờ VN (18:00 UTC 16/10 → 17/10)');
const migN = sql.prepare('SELECT COUNT(*) AS n FROM hit_meta').get().n;
await H.setup(DB); ok(pv('2026-10-16', 'home') === 2, 'di chuyển không chạy lần 2'); ok(migN === 2, 'hit_meta ghi 2 dấu di chuyển');

// ---------- 2) Phân loại máy tự động ----------
await hit(S('ci4aaaaaaaa', 'c4ciheader'), { headers: { 'X-Lexkite-CI': 'secret-value' } });
await hit(S('ua1aaaaaaaa', 'u1headless'), { ua: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/129.0 Safari/537.36' });
await hit(S('ua2aaaaaaaa', 'u2curlaaaa'), { ua: 'curl/8.5.0' });
await hit(S('ua3aaaaaaaa', 'u3gbotaaaa'), { ua: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)' });
await hit(S('dc1aaaaaaaa', 'd1azureaaa', { plat: 'android' }), { country: 'US', asn: 8075 });
await hit(S('cub1aaaaaaa', 'c1cubotaaa'), { ua: 'Mozilla/5.0 (Linux; Android 10; CUBOT P40) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' });
ok(row('ci4aaaaaaaa').bot === 'ci', 'header X-Lexkite-CI → ci');
ok(row('ua1aaaaaaaa').bot === 'ua' && row('ua2aaaaaaaa').bot === 'ua' && row('ua3aaaaaaaa').bot === 'ua', 'HeadlessChrome / curl / Googlebot → ua');
ok(row('dc1aaaaaaaa').bot === 'dc', 'ASN Azure 8075 (runner GitHub, máy ảo Android) → dc');
ok(row('cub1aaaaaaa').bot === null, 'điện thoại hãng CUBOT không bị nhầm là bot');
ok(H.automation(new Request('https://x/', { headers: { 'User-Agent': CHROME } })) === null, 'trình duyệt thường → người thật');
ok(H.BOT.test('') && H.BOT.test('python-requests/2.31') && H.BOT.test('Go-http-client/1.1') && H.BOT.test('Mozilla/5.0 (compatible; bingbot/2.0)'), 'UA rỗng/python/Go/bingbot là bot');
const pvAfter = pv(H.dayOf(NOW), 'home');
ok(pvAfter === 2, 'máy tự động không cộng lượt xem từng trang (chỉ người thật + cubot = 2)');
// bot gửi lỗi JS / add-on → bỏ
await hit({ t: 'e', msg: 'boom', src: 'x.js' }, { asn: 8075 }); ok(!sql.prepare("SELECT 1 FROM errors WHERE msg = 'boom'").get(), 'lỗi JS từ máy chủ đám mây không ghi');
await hit({ t: 'x', vid: 'extciaaaaaa', ev: { install: 1 } }, { asn: 8075 }); ok(!sql.prepare("SELECT 1 FROM ext_events WHERE kind = 'install'").get(), 'add-on cài trên CI không tính lượt cài');

// ---------- 3) Gộp trùng theo sid · bot không "hoá người" · trang quản trị ----------
await hit(S('hum1aaaaaaa', 'h1humanaaa', { dur: 80, pages: 3, cur: 'review', pv: { review: 1 } }));
ok(sql.prepare("SELECT COUNT(*) AS n FROM sessions WHERE sid = 'hum1aaaaaaa'").get().n === 1 && row('hum1aaaaaaa').pages === 3 && row('hum1aaaaaaa').last_path === 'review', 'cùng sid gửi lại → cập nhật 1 dòng');
await hit(S('dc1aaaaaaaa', 'd1azureaaa', { plat: 'android', pages: 2 }), { country: 'US', asn: 1234 });
ok(row('dc1aaaaaaaa').bot === 'dc', 'phiên đã là máy tự động giữ nguyên dù nhịp sau đổi mạng');
await hit(S('adm1aaaaaaa', 'a1adminpgx', { path: 'admin', cur: 'admin', pv: { admin: 1 } }));
ok(row('adm1aaaaaaa').bot === 'admin' && row('adm1aaaaaaa').last_path === null && pv(H.dayOf(NOW), 'admin') === 0, 'phiên mở #/admin → bot = admin, không ghi lượt xem/đang xem');
await hit(S('hum2aaaaaaa', 'h2humanaaa', { cur: 'admin', pv: { home: 1, admin: 1 } }));
ok(row('hum2aaaaaaa').bot === null && row('hum2aaaaaaa').last_path === null && pv(H.dayOf(NOW), 'admin') === 0, 'người thật ghé #/admin: không ghi route admin');

// ---------- 4) Ranh giới ngày giờ Việt Nam ----------
ok(H.dayOf(Date.UTC(2026, 9, 17, 16, 59, 59)) === '2026-10-17' && H.dayOf(Date.UTC(2026, 9, 17, 17, 0, 0)) === '2026-10-18', 'ngày VN đổi lúc 17:00 UTC');
NOW = Date.UTC(2026, 9, 17, 17, 30); await hit(S('late1aaaaaa', 'l1lateaaaa'));
ok(row('late1aaaaaa').day === '2026-10-18', 'phiên 00:30 giờ VN ghi vào ngày mới');
NOW = Date.UTC(2026, 9, 17, 9, 0, 0);

// ---------- 5) Quản trị: chỉ người thật, loại tài khoản quản trị, "đã loại", % quốc gia ----------
sql.exec('CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID');
sql.exec(`INSERT INTO users (uid, email, created, seen) VALUES ('uBoss', 'boss@lexkite.com', 0, 0)`);
sql.exec(`INSERT INTO vid_uid (vid, uid, at) VALUES ('b1bossvida', 'uBoss', 0)`);
await hit(S('boss1aaaaaa', 'b1bossvida'));
await hit(S('fi1aaaaaaaa', 'f1finland1'), { country: 'FI', asn: 719 });
const api = async (op, extra = {}) => { store.clear(); const r = await A.onRequestPost({ request: new Request('https://lexkite.com/api/admin', { method: 'POST', headers: { Origin: 'https://lexkite.com', 'CF-Connecting-IP': '9.9.9.9', Authorization: 'Bearer ' + await tok('uBoss', 'boss@lexkite.com'), 'Content-Type': 'application/json' }, body: JSON.stringify({ op, ...extra }) }), env }); return { status: r.status, j: await r.json() }; };
const live = await api('live', { days: 7 });
ok(live.status === 200, 'op live 200 (' + JSON.stringify(live.j).slice(0, 200) + ')');
const L = live.j, today = H.dayOf(NOW);
// người thật hôm nay (17/10 giờ VN): hum1, hum2, cub1, fi1, vn1 (di chuyển sang 17/10) – không có bot, admin, sếp
ok(L.today.visitors === 5, 'khách hôm nay = 5 người thật (được ' + L.today.visitors + ')');
ok(!L.countries.some(c => c.k === 'US'), 'Mỹ (máy ảo CI, Azure) không còn trong "Quốc gia hôm nay"');
ok(L.countries.reduce((a, c) => a + c.n, 0) === L.today.visitors, 'tổng khách theo quốc gia = khách hôm nay (% cộng = 100)');
const ex = Object.fromEntries(L.excluded.kinds.map(k => [k.k, k.s]));
ok(ex.ci === 1 && ex.ua === 3 && ex.dc === 1 && ex.admin === 2, '"đã loại" tách theo loại: ci 1 · ua 3 · dc 1 · admin 2 (phiên #/admin + tài khoản quản trị) – ' + JSON.stringify(ex));
ok(L.tz === 'Asia/Ho_Chi_Minh' && L.day === today, 'trả kèm múi giờ & ngày đang tính');
ok(!L.viewing.some(v => v.k === 'admin'), '"Đang xem" không có #/admin');
ok(L.online === 5, '"Đang online" chỉ đếm người thật (5 phút) – được ' + L.online);
const an = await api('analytics', { days: 7 });
ok(an.status === 200 && an.j.sum.v === 7, 'op analytics: 7 khách thật từ 11/10 (5 hôm nay + phiên cũ 15/10 + phiên 18/10 giờ VN) – được ' + (an.j.sum && an.j.sum.v));
ok(an.j.excluded.s >= 8, 'op analytics trả số phiên đã loại (≥ 8: 3 ci-app + ci + 3 ua + dc + admin…)');
const ov = await api('overview'); ok(ov.status === 200 && ov.j.sessions.today === 5, 'op overview: phiên hôm nay chỉ người thật (hum1, hum2, cub1, fi1, vn1) – được ' + (ov.j.sessions && ov.j.sessions.today));
const gr = await api('growth', { days: 7 }); ok(gr.status === 200, 'op growth chạy được với cột bot');

// ---------- 6) Add-on: ngày máy khách nhanh hơn VN (UTC+8…+14) vẫn nhận ----------
NOW = Date.UTC(2026, 9, 17, 16, 30); // 23:30 VN; Nhật đã sang 18/10
await hit({ t: 'x', vid: 'extjpaaaaaa', day: '2026-10-18', ev: { lookup: 3 } }, { ip: '5.5.5.5' });
ok(!!sql.prepare("SELECT 1 FROM ext_daily WHERE vid = 'extjpaaaaaa' AND day = '2026-10-18'").get(), 'ngày add-on +1 (múi giờ phía đông) được nhận');

// ---------- 7) Mini-quiz blog: chỉ nhận tên sự kiện cho phép ----------
await hit({ t: 'q', ev: 'quiz_done' }, { ip: '6.6.6.6' });
await hit({ t: 'q', ev: 'drop table' }, { ip: '6.6.6.6' });
ok(!!sql.prepare("SELECT 1 FROM ext_events WHERE kind = 'blog:quiz_done'").get(), 'quiz_done blog được đếm');
ok(!sql.prepare("SELECT 1 FROM ext_events WHERE kind LIKE 'blog:drop%'").get(), 'sự kiện quiz lạ bị bỏ');

Date.now = realNow;
console.log(fails ? `✗ analytics: ${fails}/${n} lỗi` : `✓ analytics: ${n} kiểm tra đạt (loại bot/CI/quản trị, gộp sid, ngày giờ VN, % quốc gia, di chuyển dữ liệu)`);
process.exit(fails ? 1 : 0);
