// Kiểm tra tính năng [N2] Thao tác quản lý tài khoản người học (D1, API admin, Sync gate, GDPR)
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { webcrypto } from 'node:crypto';

console.log('--- Kiểm tra [N2] Quản lý tài khoản người học (API, D1, Sync & GDPR) ---');

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

const now = Date.now();
sql.prepare('INSERT INTO users (uid, email, name, created, seen, plat) VALUES (?, ?, ?, ?, ?, ?)').run('u_learner1', 'learner1@lexkite.com', 'Alex Learner', now - 10 * 864e5, now, 'web');
sql.prepare('INSERT INTO users (uid, email, name, created, seen, plat) VALUES (?, ?, ?, ?, ?, ?)').run('u_learner2', 'learner2@lexkite.com', 'Sam Tester', now - 5 * 864e5, now, 'ios');
const sampleMeta = JSON.stringify({ game: { xp: 520, total: { reviews: 45, newWords: 30 } }, stats: { days: { '2026-10-18': 1 } } });
for (const [u, k, h, b] of [['u_learner1', 'meta', 'h_meta', sampleMeta], ['u_learner1', 'cards_0', 'h_c0', '{"c":[]}'], ['u_learner1', 'cards_1', 'h_c1', '{"c":[]}'], ['u_learner2', 'meta', 'h2', '{"game":{}}']])
  sql.prepare('INSERT INTO docs (uid, k, h, body, updated) VALUES (?, ?, ?, ?, ?)').run(u, k, h, b, now);
const docsOf = uid => sql.prepare('SELECT COUNT(*) AS c FROM docs WHERE uid = ?').get(uid).c;

console.log('1. Cổng quản trị:');
assert.equal((await adm('userBlock', { uid: 'u_learner1', blocked: 1, confirm: 'learner1@lexkite.com' }, null)).s, 403, 'không token → 403');
assert.equal((await adm('userBlock', { uid: 'u_learner1', blocked: 1, confirm: 'learner1@lexkite.com' }, await tok('u_learner2', { email: 'learner2@lexkite.com', email_verified: true }))).s, 403, 'người học tự gọi op quản trị → 403');
assert.equal((await adm('userTag', { uid: 'u_learner1', tags: ['x'] }, await tok('evil', { email: 'admin@lexkite.com', email_verified: false }))).s, 403, 'email chưa xác minh → 403');
for (const op of ['userBlock', 'userReset', 'userRestore', 'userExportData']) assert.equal((await adm(op, { uid: 'u_learner1', confirm: 'learner1@lexkite.com', backupId: 1 }, ADM_OLD)).j.error, 'reauth', op + ' cần đăng nhập lại ≤ 15 phút');
assert.equal(AdminApi.onRequestGet, undefined, 'không có thao tác qua GET');
console.log('✓ chặn người lạ, người học, email chưa xác minh; thao tác nguy hiểm buộc đăng nhập lại');

console.log('2. Nhãn & ghi chú:');
{ const r = await adm('userTag', { uid: 'u_learner1', tags: ['VIP', 'tester', { x: 1 }, 'a'.repeat(50), ...Array(20).fill('z')], notes: 'n'.repeat(3000) });
  assert.equal(r.s, 200); assert.equal(r.j.tags.length, 10, 'tối đa 10 nhãn'); assert.ok(r.j.tags.every(t => typeof t === 'string' && t.length <= 30), 'nhãn là chuỗi ≤ 30 ký tự'); assert.equal(r.j.notes.length, 2000, 'ghi chú ≤ 2000');
  const u = (await adm('user', { uid: 'u_learner1' })).j.user; assert.equal(u.tags[0], 'VIP'); assert.equal(u.blocked, 0); }
console.log('✓ nhãn/ghi chú được lọc độ dài & kiểu');

console.log('3. Khóa đồng bộ:');
assert.equal((await adm('userBlock', { uid: 'u_learner1', blocked: 1, confirm: 'learner2@lexkite.com' })).j.error, 'confirm', 'xác nhận sai email → từ chối');
assert.equal((await adm('userBlock', { uid: 'u_learner1', blocked: 1, confirm: 'learner1@lexkite.com' })).j.blocked, 1);
{ const p = await sync('u_learner1', { op: 'pull', have: {} }), q = await sync('u_learner1', { op: 'push', docs: { meta: { h: 'zz', body: '{}' } } });
  assert.equal(p.s, 403); assert.equal(p.j.error, 'blocked'); assert.equal(q.s, 403);
  assert.equal(sql.prepare("SELECT h FROM docs WHERE uid = 'u_learner1' AND k = 'meta'").get().h, 'h_meta', 'bị khóa → không ghi đè dữ liệu');
  assert.equal((await sync('u_learner2', { op: 'pull', have: {} })).s, 200, 'người khác vẫn đồng bộ'); }
assert.ok(sql.prepare("SELECT 1 FROM admin_log WHERE op = 'userBlock' AND ok = 1 AND email = 'admin@lexkite.com'").get(), 'ghi nhật ký quản trị');
assert.equal((await adm('userBlock', { uid: 'u_learner1', blocked: 0, confirm: 'learner1@lexkite.com' })).j.blocked, 0);
assert.equal((await sync('u_learner1', { op: 'pull', have: {} })).s, 200, 'mở khóa → đồng bộ lại');
console.log('✓ khóa có hiệu lực ngay ở /api/sync (kéo & đẩy), có nhật ký');

console.log('3b. Quốc gia & bộ lọc tab Người dùng:');
{ const cc = uid => sql.prepare('SELECT cc FROM users WHERE uid = ?').get(uid).cc, back = uid => sql.prepare('UPDATE users SET seen = seen - 7200000 WHERE uid = ?').run(uid);
  assert.equal((await sync('u_cc', { op: 'pull', have: {} }, { country: 'JP', clientIp: '203.0.113.9' })).s, 200);
  assert.equal(cc('u_cc'), 'JP', 'đăng ký → lưu mã quốc gia 2 chữ từ request.cf.country');
  const cols = sql.prepare('PRAGMA table_info(users)').all().map(c => c.name);
  assert.ok(!cols.some(c => /ip/i.test(c)), 'không có cột IP trong bảng users');
  assert.ok(!JSON.stringify(sql.prepare("SELECT * FROM users WHERE uid = 'u_cc'").get()).includes('203.0.113.9'), 'không lưu IP');
  back('u_cc'); await sync('u_cc', { op: 'pull', have: {} }, { country: 'XX' }); assert.equal(cc('u_cc'), 'JP', 'không rõ quốc gia → giữ mã cũ');
  back('u_cc'); await sync('u_cc', { op: 'pull', have: {} }, { country: '<script>' }); assert.equal(cc('u_cc'), 'JP', 'mã lạ bị bỏ');
  back('u_cc'); await sync('u_cc', { op: 'pull', have: {} }, { country: 'VN' }); assert.equal(cc('u_cc'), 'VN', 'lần đăng nhập gần nhất → cập nhật quốc gia');
  await sync('u_cc', { op: 'pull', have: {} }, { country: 'US' }); assert.equal(cc('u_cc'), 'VN', 'trong 1 giờ không ghi lại (tiết kiệm lượt ghi D1)');
  const r = (await adm('users', {})).j;
  assert.deepEqual(r.countries.find(x => x.k === 'VN'), { k: 'VN', n: 1 }, 'đếm người dùng theo quốc gia');
  assert.equal(r.countries.find(x => x.k === '').n, 2, 'tài khoản cũ chưa có mã → nhóm "không rõ"');
  assert.equal(r.rows.find(u => u.uid === 'u_cc').cc, 'VN', 'cột quốc gia trong danh sách');
  assert.deepEqual((await adm('users', { cc: 'VN' })).j.rows.map(u => u.uid), ['u_cc'], 'lọc theo quốc gia');
  assert.equal((await adm('users', { cc: '??' })).j.filtered, 2, 'lọc "chưa rõ"');
  assert.equal((await adm('users', { cc: "VN' OR 1=1 --" })).j.filtered, 3, 'mã bẩn bị bỏ qua (không chèn SQL)');
  const d = t => new Date(t + 7 * 3600e3).toISOString().slice(0, 10);
  assert.deepEqual((await adm('users', { from: d(now - 6 * 864e5), to: d(now - 4 * 864e5) })).j.rows.map(u => u.uid), ['u_learner2'], 'lọc theo ngày tham gia (từ – đến, giờ VN)');
  assert.equal((await adm('users', { from: 'hôm qua' })).j.filtered, 3, 'ngày sai định dạng bị bỏ qua');
  assert.equal((await adm('users', { sort: 'old' })).j.rows[0].uid, 'u_learner1', 'sắp xếp tham gia sớm nhất');
  assert.equal((await adm('users', { sort: 'n' })).j.rows[0].uid, 'u_cc', 'sắp xếp theo số lần vào');
  assert.equal((await adm('usersExport', { cc: 'VN' })).j.rows[0].cc, 'VN', 'CSV có quốc gia');
  const plan = sql.prepare("EXPLAIN QUERY PLAN SELECT COALESCE(cc, '') AS k, COUNT(*) AS n FROM users GROUP BY cc ORDER BY n DESC LIMIT 250").all().map(x => x.detail).join(' | ');
  assert.match(plan, /COVERING INDEX idx_users_cc/, 'thống kê quốc gia chỉ đọc chỉ mục: ' + plan);
  assert.match(sql.prepare("EXPLAIN QUERY PLAN SELECT uid FROM users WHERE cc = 'VN'").all().map(x => x.detail).join(' '), /idx_users_cc/, 'lọc quốc gia dùng chỉ mục');
  sql.prepare("DELETE FROM users WHERE uid = 'u_cc'").run(); }
console.log('✓ quốc gia từ Cloudflare (không IP), đếm/lọc/CSV, ngày tham gia, sắp xếp, đọc theo chỉ mục');

console.log('4. Đặt lại & khôi phục:');
{ const r = await adm('userReset', { uid: 'u_learner1', confirm: 'learner1@lexkite.com' });
  assert.equal(r.j.backedUp, 3); assert.equal(docsOf('u_learner1'), 0); assert.equal(docsOf('u_learner2'), 1, 'không đụng người khác');
  await adm('userReset', { uid: 'u_learner2', confirm: 'learner2@lexkite.com' });
  const bk1 = sql.prepare("SELECT id FROM user_backups WHERE uid = 'u_learner1'").get().id, bk2 = sql.prepare("SELECT id FROM user_backups WHERE uid = 'u_learner2'").get().id;
  assert.equal((await adm('userRestore', { uid: 'u_learner1', backupId: bk2, confirm: 'learner1@lexkite.com' })).j.error, 'backup-not-found', 'không khôi phục bản lưu của người khác');
  assert.equal((await adm('userRestore', { uid: 'u_learner1', backupId: 'x', confirm: 'learner1@lexkite.com' })).j.error, 'params-required');
  assert.equal((await adm('userRestore', { uid: 'u_learner1', backupId: bk1, confirm: 'learner1@lexkite.com' })).j.restored, 3); assert.equal(docsOf('u_learner1'), 3); assert.equal(docsOf('u_learner2'), 0); }
console.log('✓ đặt lại có sao lưu; khôi phục đúng chủ');

console.log('5. Xuất GDPR:');
{ const r = await adm('userExportData', { uid: 'u_learner1' });
  assert.equal(r.s, 200); assert.equal(r.j.user.email, 'learner1@lexkite.com'); assert.equal(r.j.documents.meta.parsed.game.xp, 520);
  assert.ok(!JSON.stringify(r.j).includes('learner2'), 'không lẫn dữ liệu người khác'); }
console.log('✓ xuất đủ dữ liệu của đúng 1 người');

console.log('6. Xóa:');
sql.prepare('INSERT INTO notice_reads (id, uid, read_at, clicked) VALUES (?, ?, ?, ?)').run('n1', 'u_learner2', now, 1);
await deleteUserData(DB, 'u_learner2'); // người học tự xóa tài khoản (App Store 5.1.1(v))
for (const t of ['users', 'docs', 'user_backups', 'notice_reads']) assert.equal(sql.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE uid = 'u_learner2'`).get().c, 0, 'tự xóa tài khoản → sạch ' + t);
sql.prepare('INSERT INTO notice_reads (id, uid, read_at, clicked) VALUES (?, ?, ?, ?)').run('n1', 'u_learner1', now, 1);
assert.equal((await adm('userDelete', { uid: 'u_learner1', confirm: 'u_learner1' })).s, 200);
for (const t of ['users', 'docs', 'user_backups', 'notice_reads']) assert.equal(sql.prepare(`SELECT COUNT(*) AS c FROM ${t} WHERE uid = 'u_learner1'`).get().c, 0, 'admin xóa → sạch ' + t);
console.log('✓ tự xóa & admin xóa đều dọn sao lưu, lượt đọc thông báo');

console.log('ALL TESTS PASSED: [N2] quản lý tài khoản người học');
