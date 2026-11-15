// Test email nhắc học / tổng kết tuần opt-in (functions/api/mail.js): D1 giả bằng node:sqlite, nhà cung cấp giả, không mạng.
// Chạy: node scripts/test/mail-digest.mjs
import { DatabaseSync } from 'node:sqlite';
const M = await import('../../functions/api/mail.js');
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const sql = new DatabaseSync(':memory:');
const mk = s => ({ prepare(q) { const st = { async run() { s.prepare(q).run(); return {}; }, bind: (...a) => ({ async run() { const x = s.prepare(q).run(...a); return { meta: x }; }, async first() { return s.prepare(q).get(...a) || null; }, async all() { return { results: s.prepare(q).all(...a) }; } }) }; return st; }, async batch(l) { const o = []; for (const x of l) o.push(await x.run()); return o; } });
const DB = mk(sql); const usql = new DatabaseSync(':memory:'); const UD = mk(usql);
usql.exec("CREATE TABLE users (uid TEXT PRIMARY KEY, email TEXT)"); usql.exec("INSERT INTO users VALUES ('u1','a@example.com'), ('u2','b@example.com')");
const NOW = Date.UTC(2026, 10, 16, 13, 0); // Thứ 2 16/11/2026 20:00 giờ VN
const ENV = { PUSH_CRON_SECRET: 's3cret', DB: UD, MAIL_DAY_CAP: '2' };
await M.setupMail(DB);
const post = (body, hdr = {}) => new Request('https://x.test/api/mail', { method: 'POST', headers: hdr, body: JSON.stringify(body) });
const claimsOf = (uid, ev = true) => async () => ({ sub: uid, email: uid + '@example.com', email_verified: ev });
const call = (body, uid, extra = {}) => M.handle(post(body, { Authorization: 'Bearer t' }), ENV, { db: DB, now: NOW, claims: claimsOf(uid, extra.ev ?? true), rate: async () => 0 });

// 1. Đăng ký (opt-in): cần email đã xác minh
ok((await call({ op: 'sub', rem: 1 }, 'u1', { ev: false })).status === 403, 'email chưa xác minh → 403');
ok((await M.handle(post({ op: 'sub', rem: 1 }), ENV, { db: DB, now: NOW, claims: async () => null })).status === 401, 'không đăng nhập → 401');
let r = await call({ op: 'sub', rem: 1, wk: 1, lmin: 20 * 60, q: [22 * 60, 8 * 60], tz: 'Asia/Ho_Chi_Minh', lang: 'vi', opened: true, recap: { w: '2026-11-09', nw: 12, mins: 34, ad: 5 } }, 'u1');
ok(r.status === 200 && (await r.json()).wk === 1, 'sub ok');
const row = () => sql.prepare("SELECT * FROM mail_subs WHERE uid='u1'").get();
ok(row().act === Math.floor((NOW + 7 * 36e5) / 864e5) && row().seq === 0, 'act = ngày địa phương mở app');
ok(!JSON.stringify(row()).includes('example.com'), 'KHÔNG lưu email trong mail_subs');

// 2. decide: tuần Thứ 2 trong cửa sổ → week; ngoài cửa sổ/giờ yên lặng → null; đã gửi hôm nay → null
ok(M.decide(row(), NOW) === 'week', 'Thứ 2 đúng giờ hay học có recap → week');
ok(M.decide(row(), NOW + 3 * 3600e3) === null, 'lệch 3 giờ so với giờ hay học → không gửi');
ok(M.decide({ ...row(), q1: 19 * 60, q2: 21 * 60 }, NOW) === null, 'trong giờ yên lặng → không gửi');
ok(M.decide({ ...row(), sent_day: Math.floor((NOW + 7 * 36e5) / 864e5) }, NOW) === null, '≤ 1 email/ngày');
const day = Math.floor((NOW + 7 * 36e5) / 864e5), rem = (gap, seq) => ({ ...row(), wk: 0, rem: 1, act: day - gap, seq });
ok(M.decide(rem(1, 0), NOW) === null && M.decide(rem(2, 0), NOW) === 'rem', 'nhắc chỉ khi nghỉ ≥ 2 ngày');
ok(M.decide(rem(4, 1), NOW) === null && M.decide(rem(5, 1), NOW) === 'rem', 'bậc 5 ngày');
ok(M.decide(rem(60, 4), NOW) === null, 'sau 4 email nhắc thì DỪNG tới khi họ quay lại');
ok(M.decide({ ...row(), wk: 1, rem: 0, recap_sent: '2026-11-09' }, NOW) === null, 'tuần đã gửi → không gửi lại');

// 3. build: 15 ngôn ngữ, có hủy một chạm + header List-Unsubscribe, escape
const { COPY } = await import('../../functions/api/_mail_copy.js');
for (const l of Object.keys(COPY)) { const m = M.build({ ...row(), lang: l }, 'week', 'https://lexkite.com', 'tok'); ok(m.subject.includes('12') && !/\{\w+\}/.test(m.html) && m.html.includes('t=tok') && /^<https:.*u=u1&t=tok>$/.test(m.headers['List-Unsubscribe']), 'email ' + l); }
ok(Object.keys(COPY).length === 15 && !/[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(JSON.stringify({ ...COPY, vi: 0 })), '15 ngôn ngữ, không lẫn tiếng Việt ngoài vi');
ok(M.build({ ...row(), lang: 'ar' }, 'rem', 'https://lexkite.com', 't').html.includes('dir="rtl"'), 'Ả Rập RTL');

// 4. tick: gửi qua nhà cung cấp giả, đánh dấu, trần ngày, không khóa → không đánh dấu
const sent = []; const send = async (env, to, m) => { sent.push([to, m.subject]); return 'ok'; };
let t = await M.tick(ENV, DB, NOW, send);
ok(t.sent === 1 && sent[0][0] === 'a@example.com', 'tick gửi tuần cho u1 – ' + JSON.stringify(t));
ok(row().recap_sent === '2026-11-09' && row().sent_day === day, 'đánh dấu đã gửi');
t = await M.tick(ENV, DB, NOW, send); ok(t.sent === 0 && sent.length === 1, 'chạy lại cùng ngày không gửi lần 2');
sql.prepare("UPDATE mail_subs SET sent_day = 0, recap_sent = NULL WHERE uid='u1'").run();
t = await M.tick(ENV, DB, NOW, async () => 'nokey'); ok(t.skip === 'no-key' && row().sent_day === 0, 'chưa có khóa nhà cung cấp → không gửi, không đánh dấu');
t = await M.tick({ ...ENV, MAIL_DAY_CAP: '1' }, DB, NOW, send); ok(t.skip === 'cap', 'trần ngày');
// tài khoản đã xóa → dòng mồ côi bị xóa
sql.prepare("INSERT INTO mail_subs (uid, tz, lmin, lang, wk, recap, slot) VALUES ('gone','Asia/Ho_Chi_Minh',1200,'en',1,'{\"w\":\"2026-11-09\",\"nw\":1,\"mins\":1,\"ad\":1}', ?1)").run(row().slot);
await M.tick({ ...ENV, MAIL_DAY_CAP: '9' }, DB, NOW, send); ok(!sql.prepare("SELECT 1 FROM mail_subs WHERE uid='gone'").get(), 'tài khoản đã xóa → xóa dòng');

// 5. Hủy một chạm (GET/POST, không đăng nhập) + status + tắt hết = xóa dòng
const tok = await M.unsubToken('s3cret', 'u1');
ok((await M.handle(new Request(`https://x.test/api/mail?u=u1&t=bad`), ENV, { db: DB })).status === 200 && !!row(), 'mã sai không hủy được');
const g = await M.handle(new Request(`https://x.test/api/mail?u=u1&t=${tok}`), ENV, { db: DB });
ok(g.status === 200 && (await g.text()).includes('Bạn đã hủy') && !row(), 'GET hủy một chạm (đúng ngôn ngữ) xóa dòng');
await call({ op: 'sub', rem: 1, tz: 'Asia/Ho_Chi_Minh', lang: 'en' }, 'u1');
ok((await M.handle(new Request(`https://x.test/api/mail?u=u1&t=${tok}`, { method: 'POST', body: 'List-Unsubscribe=One-Click' }), ENV, { db: DB })).status === 204 && !row(), 'POST one-click 204');
await call({ op: 'sub', rem: 1 }, 'u1'); await call({ op: 'sub', rem: 0, wk: 0 }, 'u1'); ok(!row(), 'tắt cả hai = xóa dòng');
ok((await M.handle(post({ op: 'tick' }), ENV, { db: DB })).status === 401, 'tick cần bí mật cron');
console.log(fails ? `FAIL ${fails}` : 'OK mail-digest'); process.exit(fails ? 1 : 0);
