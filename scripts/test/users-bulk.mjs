// Quản trị › Người dùng: thao tác hàng loạt (usersBulk), xóa mềm + hoàn tác + xóa thật sau 30 ngày, quyền AI, nhãn, bộ lọc/sắp xếp mới,
// thống kê nhóm (usersStats), nhật ký kiểm toán chi tiết, userDelete dùng chung DELETE_SQL. D1 = node:sqlite trong bộ nhớ, dữ liệu giả.
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';

console.log('--- Kiểm tra thao tác hàng loạt người dùng (usersBulk) ---');

// Mock in-memory SQLite D1 DB
const sql = new DatabaseSync(':memory:');
const exec = (q, a = []) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = {
  prepare(q) {
    const st = {
      q,
      args: [],
      bind(...a) { return { ...st, args: a }; },
      async run() { return exec(q, this.args); },
      async all() { return exec(q, this.args); },
      async first() { return sql.prepare(q).get(...this.args) || null; },
    };
    return st;
  },
  async batch(list) {
    const out = [];
    sql.exec('BEGIN');
    try {
      for (const x of list) out.push(await x.run());
      sql.exec('COMMIT');
    } catch (e) {
      sql.exec('ROLLBACK');
      throw e;
    }
    return out;
  },
};

// Khởi tạo bảng ban đầu
sql.exec(`
  CREATE TABLE IF NOT EXISTS users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS docs (uid TEXT NOT NULL, k TEXT NOT NULL, h TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (uid, k)) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS vid_uid (vid TEXT PRIMARY KEY, uid TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS admin_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at INTEGER NOT NULL, email TEXT, op TEXT, ok INTEGER, ip TEXT, country TEXT);
  CREATE TABLE IF NOT EXISTS contact_msgs (id INTEGER PRIMARY KEY AUTOINCREMENT, who TEXT NOT NULL, at INTEGER NOT NULL, name TEXT, email TEXT, msg TEXT, lang TEXT, sent INTEGER DEFAULT 0, handled INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS services (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, purpose TEXT, account TEXT, console TEXT, billing TEXT, free TEXT, secret TEXT, status TEXT, note TEXT, ord INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS i18n_fix (lang TEXT, key TEXT, val TEXT, at INTEGER, by TEXT, PRIMARY KEY (lang, key)) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS i18n_judge (h TEXT PRIMARY KEY, lang TEXT, ok INTEGER, note TEXT, at INTEGER) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS notices (id TEXT PRIMARY KEY, at INTEGER NOT NULL, by TEXT, title TEXT NOT NULL, body TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'info', img TEXT, cta_label TEXT, cta_url TEXT, target TEXT, send_at INTEGER, expire_at INTEGER, lang TEXT, revoked INTEGER DEFAULT 0) WITHOUT ROWID;
  CREATE TABLE IF NOT EXISTS notice_reads (id TEXT NOT NULL, uid TEXT NOT NULL, read_at INTEGER NOT NULL, clicked INTEGER DEFAULT 0, PRIMARY KEY (id, uid)) WITHOUT ROWID;
`);

// Gọi API THẬT (admin.js · sync.js · account.js) bằng Firebase ID token ký RS256 giả lập (JWKS giả qua fetch)
const AdminApi = await import('../../functions/api/admin.js');
const SyncApi = await import('../../functions/api/sync.js');
const { deleteUserData } = await import('../../functions/api/account.js');
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (sub, extra = {}) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec - 60, sub, ...extra })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
const env = { DB, ADMIN_EMAILS: 'admin@lexkite.com' };
const ADM = await tok('adm_999', { email: 'admin@lexkite.com', email_verified: true });
const ADM_OLD = await tok('adm_999', { email: 'admin@lexkite.com', email_verified: true, auth_time: sec - 3600 });
// cf = request.cf giả lập của Cloudflare (quốc gia suy từ IP ở biên – Node không có, gắn tay)
const call = async (mod, path, tk, body, cf) => { const request = new Request('https://lexkite.com' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://lexkite.com', ...(tk ? { Authorization: 'Bearer ' + tk } : {}) }, body: JSON.stringify(body) }); if (cf) Object.defineProperty(request, 'cf', { value: cf }); const r = await mod.onRequestPost({ request, env }); return { s: r.status, j: await r.json() }; };
const adm = (op, b = {}, tk = ADM) => call(AdminApi, '/api/admin', tk, { op, ...b });
const sync = async (uid, b, cf) => call(SyncApi, '/api/sync', await tok(uid, { email: uid + '@lexkite.com' }), b, cf);

const now = Date.now(), D = 864e5;
const ins = sql.prepare('INSERT INTO users (uid, email, name, created, seen, plat, n) VALUES (?, ?, ?, ?, ?, ?, ?)');
for (let i = 0; i < 30; i++) ins.run('u' + String(i).padStart(3, '0'), `p${i}@example.com`, 'Learner ' + i, now - (40 - i) * D, now - (i % 5) * 9 * D, i % 3 ? 'web' : 'ios', 1 + (i % 4));
ins.run('adm_999', 'admin@lexkite.com', 'Admin', now - 50 * D, now, 'web', 9);
sql.prepare('INSERT INTO docs (uid, k, h, body, updated) VALUES (?, ?, ?, ?, ?)').run('u001', 'meta', 'h', '{}', now);
const body = async r => ({ s: r.s, ...r.j });
const B = async (b, tk) => body(await adm('usersBulk', b, tk));
const U = async (b = {}) => body(await adm('users', b));
const docsOf = uid => sql.prepare('SELECT COUNT(*) AS c FROM docs WHERE uid = ?').get(uid).c;
const lastLog = () => sql.prepare('SELECT op, ok, detail FROM admin_log ORDER BY id DESC LIMIT 1').get();

console.log('1. Kiểm quyền, xác nhận số người, giới hạn:');
{ const r = await call(AdminApi, '/api/admin', await tok('x1', { email: 'evil@example.com', email_verified: true }), { op: 'usersBulk', action: 'block', uids: ['u001'], confirm: 1 });
  assert.equal(r.s, 403, 'người lạ → 403'); }
assert.equal((await B({ action: 'nuke', uids: ['u001'], confirm: 1 })).error, 'action', 'hành động lạ bị chặn');
assert.equal((await B({ action: 'constructor', uids: ['u001'], confirm: 1 })).error, 'action', 'chặn khóa nguyên mẫu');
assert.equal((await B({ action: 'tagAdd', uids: ['u001'], confirm: 1 })).error, 'tag-required');
{ const r = await B({ action: 'block', uids: ['u001', 'u002'], confirm: 1 }); assert.equal(r.error, 'confirm'); assert.equal(r.n, 2, 'sai số xác nhận → trả số đúng, không đổi gì'); }
assert.equal(sql.prepare('SELECT COUNT(*) c FROM users WHERE blocked = 1').get().c, 0);
assert.equal((await B({ action: 'block', uids: ["u001' OR 1=1 --", 'nope'], confirm: 0 })).error, 'empty', 'uid bẩn/không tồn tại bị bỏ');
assert.equal((await B({ action: 'block', uids: Array.from({ length: 2001 }, (_, i) => 'x' + i), confirm: 2001 })).error, 'too-many', 'trần 2.000 người/lệnh');
assert.equal((await adm('usersBulk', { action: 'delete', uids: ['u001'], confirm: 1 }, ADM_OLD)).s, 401, 'xóa hàng loạt cần đăng nhập lại ≤ 15 phút');
assert.equal((await adm('usersBulk', { action: 'tagAdd', tag: 'vip', uids: ['u001'], confirm: 1 }, ADM_OLD)).s, 200, 'gắn nhãn không cần đăng nhập lại');

console.log('2. Nhãn: gắn/gỡ đúng người, không trùng, tối đa 10, hoàn tác:');
sql.prepare("UPDATE users SET tags = 'not json' WHERE uid = 'u003'").run();
{ const r = await B({ action: 'tagAdd', tag: '  beta ', uids: ['u001', 'u002', 'u003'], confirm: 3 });
  assert.deepEqual(r.changed.sort(), ['u001', 'u002', 'u003']); assert.equal(r.undo, 'tagRemove');
  assert.deepEqual(JSON.parse(sql.prepare("SELECT tags FROM users WHERE uid = 'u003'").get().tags), ['beta'], 'tags hỏng → coi rỗng');
  const again = await B({ action: 'tagAdd', tag: 'beta', uids: ['u001', 'u002'], confirm: 2 }); assert.deepEqual(again.changed, [], 'gắn lại → không trùng');
  const log = lastLog(); assert.equal(log.op, 'usersBulk:tagAdd'); const d = JSON.parse(log.detail); assert.equal(d.n, 2); assert.equal(d.tag, 'beta'); }
sql.prepare(`UPDATE users SET tags = ? WHERE uid = 'u004'`).run(JSON.stringify(Array.from({ length: 10 }, (_, i) => 't' + i)));
assert.deepEqual((await B({ action: 'tagAdd', tag: 'beta', uids: ['u004'], confirm: 1 })).changed, [], 'đủ 10 nhãn → không thêm');
{ const r = await B({ action: 'tagRemove', tag: 'beta', uids: ['u001', 'u002', 'u005'], confirm: 3 }); assert.deepEqual(r.changed.sort(), ['u001', 'u002'], 'gỡ chỉ người có nhãn');
  assert.deepEqual(JSON.parse(sql.prepare("SELECT tags FROM users WHERE uid = 'u001'").get().tags), ['vip'], 'gỡ đúng nhãn, giữ nhãn khác'); }
assert.equal((await U({ tag: 'beta' })).filtered, 1, 'lọc theo nhãn');

console.log('3. Khóa / mở khóa: không khóa quản trị, hoàn tác chỉ người đã đổi, sync bị chặn:');
sql.prepare("UPDATE users SET blocked = 1 WHERE uid = 'u006'").run();
{ const r = await B({ action: 'block', uids: ['u005', 'u006', 'adm_999'], confirm: 3 });
  assert.deepEqual(r.changed, ['u005'], 'chỉ người chưa khóa'); assert.equal(r.skipped, 1, 'bỏ qua tài khoản quản trị');
  assert.equal(sql.prepare("SELECT blocked FROM users WHERE uid = 'adm_999'").get().blocked, 0);
  assert.equal((await sync('u005', { op: 'pull' })).s, 403, 'người bị khóa không đồng bộ được');
  const un = await B({ action: r.undo, uids: r.changed, confirm: r.changed.length }); assert.deepEqual(un.changed, ['u005']);
  assert.equal(sql.prepare("SELECT blocked FROM users WHERE uid = 'u006'").get().blocked, 1, 'hoàn tác không mở người bị khóa từ trước'); }
assert.equal((await U({ blocked: '1' })).filtered, 1, 'lọc người bị khóa');

console.log('4. Quyền AI (quota_allow u:<uid>):');
{ const r = await B({ action: 'aiGrant', note: 'giáo viên', uids: ['u007', 'u008'], confirm: 2 }); assert.deepEqual(r.changed.sort(), ['u007', 'u008']);
  assert.equal(sql.prepare("SELECT COUNT(*) c FROM quota_allow WHERE id IN ('u:u007', 'u:u008') AND note = 'giáo viên' AND by = 'admin@lexkite.com'").get().c, 2);
  assert.deepEqual((await B({ action: 'aiGrant', uids: ['u007'], confirm: 1 })).changed, [], 'cấp lại → không đổi');
  const l = await U({ perk: 'ai' }); assert.equal(l.filtered, 2); assert.ok(l.rows.every(x => x.ai === 1), 'cột ai');
  assert.deepEqual((await B({ action: 'aiRevoke', uids: ['u007'], confirm: 1 })).changed, ['u007']); }

console.log('5. Xóa mềm → ẩn, chặn sync, khôi phục; xóa thật sau 30 ngày / ngay trong thùng rác:');
{ const before = (await U()).total;
  const r = await B({ action: 'delete', uids: ['u001', 'u009', 'adm_999'], confirm: 3 }); assert.deepEqual(r.changed.sort(), ['u001', 'u009']); assert.equal(r.undo, 'restore');
  const l = await U(); assert.equal(l.total, before - 2, 'KPI không đếm người trong thùng rác'); assert.equal(l.kpi.trash, 2); assert.ok(!l.rows.some(x => x.uid === 'u001'), 'ẩn khỏi danh sách');
  assert.equal((await U({ trash: 1 })).filtered, 2, 'thùng rác');
  assert.equal(docsOf('u001'), 1, 'xóa mềm giữ dữ liệu');
  assert.equal((await sync('u001', { op: 'pull' })).s, 403, 'đang chờ xóa → chặn đồng bộ');
  const back = await B({ action: 'restore', uids: ['u001'], confirm: 1 }); assert.deepEqual(back.changed, ['u001']);
  assert.equal(sql.prepare("SELECT blocked FROM users WHERE uid = 'u001'").get().blocked, 0, 'khôi phục mở lại đồng bộ');
  sql.prepare("UPDATE users SET deleted = ? WHERE uid = 'u009'").run(now - 31 * D);
  await U(); assert.equal(sql.prepare("SELECT COUNT(*) c FROM users WHERE uid = 'u009'").get().c, 0, 'quá 30 ngày → xóa thật khi mở tab');
  await B({ action: 'delete', uids: ['u010'], confirm: 1 });
  const p = await B({ action: 'purge', uids: ['u010', 'u011'], confirm: 2 }); assert.deepEqual(p.changed, ['u010'], 'xóa vĩnh viễn chỉ người trong thùng rác');
  assert.equal(sql.prepare("SELECT COUNT(*) c FROM users WHERE uid = 'u011'").get().c, 1);
  assert.equal(sql.prepare("SELECT COUNT(*) c FROM users WHERE uid = 'u010'").get().c, 0); assert.equal(lastLog().op, 'usersBulk:purge'); }

console.log('6. Chọn tất cả theo bộ lọc (máy chủ tự tính lại):');
{ const f = { plat: 'ios' }, n = (await U(f)).filtered;
  assert.equal((await B({ action: 'tagAdd', tag: 'ios-wave', all: true, filter: f, confirm: n + 1 })).error, 'confirm');
  const r = await B({ action: 'tagAdd', tag: 'ios-wave', all: true, filter: f, confirm: n }); assert.equal(r.changed.length, n);
  assert.equal(JSON.parse(lastLog().detail).all, true); }

console.log('7. Sắp xếp theo cột, cỡ trang, lọc hoạt động/số lần vào, chống chèn SQL:');
{ const a = await U({ sort: 'email', dir: 'asc', limit: 25 }); assert.equal(a.rows.length, 25); assert.equal(a.limit, 25);
  const em = a.rows.map(r => r.email.toLowerCase()); assert.deepEqual(em, [...em].sort());
  const z = await U({ sort: 'email; DROP TABLE users', dir: 'sideways' }); assert.ok(z.rows.length > 0, 'cột lạ → mặc định');
  const s = await U({ seenOut: 30 }); assert.ok(s.rows.every(r => r.seen < now - 30 * D));
  const s2 = await U({ seenIn: 7 }); assert.ok(s2.rows.length && s2.rows.every(r => r.seen > now - 7 * D));
  const nn = await U({ nMin: 3 }); assert.ok(nn.rows.length && nn.rows.every(r => r.n >= 3)); }

console.log('8. Thống kê: đăng ký theo ngày, nhóm giữ chân, phễu, nhãn:');
{ const st = await body(await adm('usersStats'));
  assert.ok(st.signups.length > 0 && st.cohorts.length > 0 && st.cohorts.every(c => c.d30 <= c.d7 && c.d7 <= c.d1 && c.d1 <= c.n), 'nhóm giữ chân đơn điệu');
  assert.ok(st.funnel.signed >= st.funnel.synced2 && st.funnel.back1 >= st.funnel.back7);
  assert.ok(st.tags.some(t => t.k === 'ios-wave')); }

console.log('9. userDelete (GDPR) dùng chung DELETE_SQL: xóa cả vid_uid + quyền AI:');
{ sql.prepare("INSERT INTO vid_uid (vid, uid, at) VALUES ('v1abcdefgh', 'u008', ?)").run(now);
  const r = await adm('userDelete', { uid: 'u008', confirm: 'u008' }, ADM); assert.equal(r.s, 200);
  assert.equal(sql.prepare("SELECT COUNT(*) c FROM vid_uid WHERE uid = 'u008'").get().c, 0, 'vid_uid bị xóa (trước đây bỏ sót)');
  assert.equal(sql.prepare("SELECT COUNT(*) c FROM quota_allow WHERE id = 'u:u008'").get().c, 0, 'quyền AI bị gỡ');
  assert.equal(JSON.parse(lastLog().detail).uid, 'u008'); }

console.log('10. Ngăn chi tiết: dòng thời gian + quyền AI:');
{ await B({ action: 'aiGrant', uids: ['u012'], confirm: 1 }); const r = await body(await adm('user', { uid: 'u012' }));
  assert.ok(r.user.ai && r.user.ai.by === 'admin@lexkite.com'); assert.ok(r.timeline.some(x => x.k === 'signup') && r.timeline[0].at >= r.timeline[r.timeline.length - 1].at, 'dòng thời gian mới → cũ'); }

console.log('✅ users-bulk: mọi kiểm tra đạt');
