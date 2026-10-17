// Test Kho Drive (functions/api/drive.js): state ký/hết hạn/CSRF, mã hoá AES-GCM, không lộ token, chọn Drive theo chỗ trống × trọng số,
// chừa trống 5 % / 256 MB, chặn người không phải admin, đường CLI HMAC (chỉ list/upload_session/complete).
// Chạy: node scripts/test/drive.mjs (không cần mạng – D1 giả bằng node:sqlite, fetch Google giả lập)
import { webcrypto, createHmac, createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const mod = await import(new URL('../../functions/api/drive.js', import.meta.url));
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { sql.prepare(q).run(...this.args); return {}; }, async all() { return { results: sql.prepare(q).all(...this.args) }; }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; }, async batch(list) { for (const x of list) await x.run(); } };

const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (email, extra = {}) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true, ...extra })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };

// Bí mật giả (phải KHÔNG BAO GIỜ xuất hiện trong phản hồi)
const REFRESH = '1//REFRESH_SECRET_abcdef123456', ACCESS = 'ya29.ACCESS_SECRET_zyx987', CSECRET = 'GOCSPX-CLIENT_SECRET_42', CLI = 'cli_SECRET_key_0123456789abcdef';
const KEY = Buffer.alloc(32, 7).toString('base64');
const ENV = { DB, ADMIN_EMAILS: 'boss@lexkite.com', GOOGLE_DRIVE_CLIENT_ID: 'cid.apps.googleusercontent.com', GOOGLE_DRIVE_CLIENT_SECRET: CSECRET, DRIVE_ENC_KEY: KEY, LEXKITE_DRIVE_CLI_KEY: CLI };
const SECRETS = [REFRESH, ACCESS, CSECRET, CLI, KEY];

// Google giả
let quota = { limit: String(15 * 1024 ** 3), usage: String(2 * 1024 ** 3) }, aboutEmail = 'mydrive@gmail.com', gcalls = [], files = {};
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body;
  if (url.includes('googleapis.com/robot') || url.includes('securetoken')) return { ok: true, json: async () => ({ keys: [jwk] }) };
  gcalls.push({ url, init, body });
  const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
  if (url === 'https://oauth2.googleapis.com/token') {
    if (body.client_secret !== CSECRET) return J({ error: 'invalid_client' }, 401);
    if (body.grant_type === 'authorization_code') return body.code === 'GOOD' ? J({ access_token: ACCESS, refresh_token: REFRESH, expires_in: 3599, scope: 'openid https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email', id_token: 'x.y.z' }) : J({ error: 'invalid_grant' }, 400);
    return body.refresh_token === REFRESH ? J({ access_token: ACCESS, expires_in: 3599 }) : J({ error: 'invalid_grant' }, 400);
  }
  if (url === 'https://oauth2.googleapis.com/revoke') return J({}, body.token === REFRESH ? 200 : 400);
  if (url.startsWith('https://www.googleapis.com/drive/v3/about')) return J({ storageQuota: quota, user: { emailAddress: aboutEmail } });
  if (url.startsWith('https://www.googleapis.com/drive/v3/files?fields=files')) return J({ files: [] });
  if (url.startsWith('https://www.googleapis.com/drive/v3/files?fields=id')) return J({ id: 'fold' + (gcalls.length) + 'xxxxxxxx' });
  if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files')) { const m = JSON.parse(init.body); files.last = m; return new Response('', { status: 200, headers: { Location: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=SESSION1' } }); }
  const fm = url.match(/drive\/v3\/files\/([^?]+)\?(alt=media|fields)/);
  if (fm) return fm[2] === 'alt=media' ? new Response('BYTES', { status: 200, headers: { 'Content-Length': '5' } }) : J({ id: fm[1], size: String(files.size || 0), trashed: false, appProperties: files.last && files.last.appProperties });
  return J({ error: 'unexpected ' + url }, 500);
};

const leak = (text, m) => ok(!SECRETS.some(k => text.includes(k)), 'không lộ bí mật: ' + m);
const call = async (tk, body, { env = ENV, origin = 'https://lexkite.com', headers = {} } = {}) => {
  const h = { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}), ...(tk ? { Authorization: 'Bearer ' + tk } : {}), ...headers };
  const r = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/drive', { method: 'POST', headers: h, body: JSON.stringify(body) }), env });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ }
  return { s: r.status, j, text, cookie: r.headers.get('Set-Cookie') || '' };
};
const cliSign = (bodyText, key = CLI, ts = Math.floor(Date.now() / 1000)) => ({ 'X-Drive-Ts': String(ts), 'X-Drive-Sig': createHmac('sha256', key).update(ts + '.' + createHash('sha256').update(bodyText).digest('hex')).digest('hex') });
const cli = async (body, opt = {}) => { const t = JSON.stringify(body); return call(null, body, { origin: null, headers: cliSign(opt.bodyForSig || t, opt.key, opt.ts) }); };
const ADM = await tok('boss@lexkite.com'), USER = await tok('someone@gmail.com'), OLD = await tok('boss@lexkite.com', { auth_time: sec - 3600 });

// 1) state: ký, hết hạn, sửa đổi
{
  const { state, nonce } = await mod.signState(ENV, 'Boss@Lexkite.com');
  const v = await mod.verifyState(ENV, state); ok(v && v.e === 'boss@lexkite.com' && v.n === nonce, 'state hợp lệ → email + nonce');
  ok(!(await mod.verifyState(ENV, state, Date.now() + 11 * 60e3)), 'state quá 10 phút → từ chối');
  const [b, s] = state.split('.'); const forged = b64u(JSON.stringify({ e: 'evil@x.com', n: 'n', x: sec + 999 })) + '.' + s;
  ok(!(await mod.verifyState(ENV, forged)), 'state sửa nội dung → từ chối');
  ok(!(await mod.verifyState({ ...ENV, DRIVE_ENC_KEY: Buffer.alloc(32, 9).toString('base64') }, state)), 'state ký bằng khoá khác → từ chối');
  ok(!(await mod.verifyState(ENV, 'garbage')), 'state rác → từ chối');
}
// 2) mã hoá khứ hồi + AAD
{
  const e = await mod.encryptToken(ENV, REFRESH, 'a@gmail.com');
  ok(!e.enc_token.includes(REFRESH) && e.iv.length >= 16, 'bản mã không chứa token');
  ok((await mod.decryptToken(ENV, { ...e, email: 'a@gmail.com' })) === REFRESH, 'giải mã khứ hồi');
  let threw = false; try { await mod.decryptToken(ENV, { ...e, email: 'b@gmail.com' }); } catch (x) { threw = true; } ok(threw, 'AAD sai email → không giải được');
  const e2 = await mod.encryptToken(ENV, REFRESH, 'a@gmail.com'); ok(e2.iv !== e.iv && e2.enc_token !== e.enc_token, 'iv ngẫu nhiên mỗi lần');
}
// 3) chọn Drive + chừa trống
{
  const G = 1024 ** 3;
  ok(mod.headroom(100 * G) === 5 * G && mod.headroom(1 * G) === 256 * 1048576, 'chừa trống = max(5 %, 256 MB)');
  const rows = [{ id: 1, status: 'ok', weight: 100, quota_total: 15 * G, quota_used: 14 * G }, { id: 2, status: 'ok', weight: 100, quota_total: 15 * G, quota_used: 5 * G }, { id: 3, status: 'ok', weight: 100, quota_total: 100 * G, quota_used: 50 * G }];
  ok(mod.pickDrive(rows, 1e6).id === 3, 'nhiều chỗ trống nhất thắng');
  ok(mod.pickDrive(rows.map(r => r.id === 3 ? { ...r, weight: 10 } : r), 1e6).id === 2, 'trọng số kéo xuống (50 GB × 10 < 10 GB × 100)');
  ok(mod.pickDrive(rows.map(r => r.id === 3 ? { ...r, status: 'draining' } : r), 1e6).id === 2, 'Drive đang rút (drain) không nhận file mới');
  ok(mod.pickDrive(rows.map(r => r.id === 3 ? { ...r, weight: 0 } : r), 1e6).id === 2, 'trọng số 0 = loại');
  const tight = [{ id: 9, status: 'ok', weight: 100, quota_total: 10 * G, quota_used: 10 * G - 600 * 1048576 }];
  ok(mod.pickDrive(tight, 300 * 1048576) === null, '600 MB trống − 512 MB chừa (5 %) < 300 MB → không chọn');
  ok(mod.pickDrive(tight, 50 * 1048576).id === 9, 'file nhỏ vừa chỗ sau khi chừa trống');
  ok(mod.pickDrive([{ id: 4, status: 'ok', weight: 1, quota_total: null, quota_used: 0 }, ...rows], 1e6).id === 4, 'Drive không giới hạn dung lượng');
  ok(mod.pickDrive([], 1) === null, 'không có Drive → null');
}
// 4) cổng quản trị
ok((await call(null, { op: 'list' })).s === 403, 'không token → 403');
ok((await call(USER, { op: 'list' })).s === 403, 'người dùng thường → 403');
ok((await call(USER, { op: 'connect' })).s === 403, 'người dùng thường không lấy được URL nối Drive');
ok((await call(ADM, { op: 'list' }, { origin: 'https://evil.example' })).s === 403, 'Origin lạ → 403');
ok((await call(ADM, { op: 'nope' })).s === 400, 'op lạ → 400');
let r = await call(ADM, { op: 'list' }); ok(r.s === 200 && r.j.drives.length === 0 && r.j.configured.client && r.j.configured.key, 'list rỗng + cấu hình (chỉ true/false)'); leak(r.text, 'list');
r = await call(ADM, { op: 'connect' }, { env: { ...ENV, GOOGLE_DRIVE_CLIENT_ID: '' } }); ok(r.s === 412 && r.j.error === 'not-configured' && r.j.configured.client === false, 'thiếu GOOGLE_DRIVE_CLIENT_ID → 412 + cờ cấu hình');

// 5) connect → callback (CSRF: state + cookie + 1 lần + email admin)
r = await call(ADM, { op: 'connect' });
const au = new URL(r.j.url), state = au.searchParams.get('state'), ck = (r.cookie.match(/lk_drv=([^;]+)/) || [])[1];
ok(au.origin === 'https://accounts.google.com' && au.searchParams.get('scope') === 'https://www.googleapis.com/auth/drive.file openid email' && au.searchParams.get('access_type') === 'offline' && au.searchParams.get('prompt') === 'consent' && au.searchParams.get('include_granted_scopes') === 'false' && au.searchParams.get('redirect_uri') === 'https://lexkite.com/api/drive/callback', 'URL OAuth đúng scope/offline/consent/redirect');
ok(ck && /HttpOnly/.test(r.cookie) && /Secure/.test(r.cookie) && /SameSite=Lax/.test(r.cookie), 'cookie phiên HttpOnly+Secure+Lax'); leak(r.text, 'connect');
const cb = (q, cookie) => mod.handleCallback(new Request('https://lexkite.com/api/drive/callback?' + q, { headers: cookie ? { Cookie: 'lk_drv=' + cookie } : {} }), ENV);
const loc = res => res.headers.get('Location') || '';
ok(/drive=bad-state/.test(loc(await cb(`code=GOOD&state=${encodeURIComponent(state)}`))), 'callback thiếu cookie → bad-state (CSRF)');
ok(/drive=bad-state/.test(loc(await cb(`code=GOOD&state=${encodeURIComponent(state)}`, 'other'))), 'cookie khác nonce → bad-state');
{ const s2 = await mod.signState(ENV, 'notadmin@x.com'); ok(/drive=bad-state/.test(loc(await cb(`code=GOOD&state=${encodeURIComponent(s2.state)}`, s2.nonce))), 'state của email không phải admin → bad-state'); }
let res = await cb(`code=GOOD&state=${encodeURIComponent(state)}`, ck);
ok(res.status === 302 && loc(res) === '/admin.html?drive=ok#drive', 'callback hợp lệ → /admin#drive (ok)');
ok(/drive=replay/.test(loc(await cb(`code=GOOD&state=${encodeURIComponent(state)}`, ck))), 'dùng lại state → replay');
const row = sql.prepare('SELECT * FROM drives').get();
ok(row && row.email === 'mydrive@gmail.com' && row.quota_total === 15 * 1024 ** 3 && !JSON.stringify(row).includes(REFRESH), 'D1 lưu email + quota, refresh token đã mã hoá');
{ const s3 = await mod.signState(ENV, 'boss@lexkite.com'); ok(/drive=denied/.test(loc(await cb(`error=access_denied&state=${encodeURIComponent(s3.state)}`, s3.nonce))), 'người dùng bấm Hủy → denied'); }

// 6) list / quota / weight / drain – không lộ token
r = await call(ADM, { op: 'list' }); ok(r.j.drives.length === 1 && r.j.drives[0].email === 'mydrive@gmail.com' && !('enc_token' in r.j.drives[0]) && !('iv' in r.j.drives[0]), 'list không có enc_token/iv'); leak(r.text, 'list có Drive');
ok(r.j.total === 15 * 1024 ** 3 && r.j.free === 13 * 1024 ** 3, 'tổng dung lượng/trống');
mod._tokenCache.clear(); quota = { limit: String(15 * 1024 ** 3), usage: String(3 * 1024 ** 3) };
r = await call(ADM, { op: 'refresh_quota' }); ok(r.s === 200 && r.j.rows[0].ok, 'refresh_quota (đổi refresh → access token)'); leak(r.text, 'refresh_quota');
ok(sql.prepare('SELECT quota_used FROM drives').get().quota_used === 3 * 1024 ** 3, 'quota cập nhật');
ok((await call(ADM, { op: 'set_weight', id: row.id, weight: 150 })).s === 400, 'trọng số > 100 → 400');
ok((await call(ADM, { op: 'set_weight', id: row.id, weight: 40 })).j.weight === 40, 'đặt trọng số');
ok((await call(ADM, { op: 'drain', id: row.id })).j.state === 'draining', 'drain → draining');
r = await call(ADM, { op: 'upload_session', name: 'a.mp4', mime: 'video/mp4', size: 1000, sha256: 'a'.repeat(64), folder: 'originals' }); ok(r.s === 507 && r.j.error === 'pool_full', 'chỉ có Drive đang drain → pool_full');
await call(ADM, { op: 'drain', id: row.id, on: false });

// 7) đường CLI HMAC
const SHA = createHash('sha256').update('hello').digest('hex');
r = await cli({ op: 'list' }); ok(r.s === 200 && r.j.drives.length === 1, 'CLI ký đúng → list'); leak(r.text, 'CLI list');
ok((await cli({ op: 'list' }, { key: 'wrong_key_wrong_key_wrong_key' })).s === 403, 'CLI sai khoá → 403');
ok((await cli({ op: 'list' }, { ts: Math.floor(Date.now() / 1000) - 600 })).s === 403, 'CLI chữ ký quá 5 phút → 403');
ok((await cli({ op: 'list' }, { bodyForSig: JSON.stringify({ op: 'other' }) })).s === 403, 'CLI body bị sửa sau khi ký → 403');
ok((await cli({ op: 'disconnect', id: row.id })).s === 403, 'CLI không được disconnect');
ok((await cli({ op: 'get_link', file_id: 'x' })).s === 403, 'CLI không được get_link');
ok((await cli({ op: 'set_weight', id: row.id, weight: 1 })).s === 403, 'CLI không được set_weight');
ok((await call(null, { op: 'list' }, { origin: null, headers: cliSign(JSON.stringify({ op: 'list' })), env: { ...ENV, LEXKITE_DRIVE_CLI_KEY: '' } })).s === 403, 'chưa đặt LEXKITE_DRIVE_CLI_KEY → CLI bị chặn');
ok((await cli({ op: 'upload_session', name: 'x', mime: 'video/mp4', size: 5, sha256: 'zz', folder: '../etc' })).s === 400, 'đầu vào xấu → 400');
r = await cli({ op: 'upload_session', name: 'clips/src/mia_idle.mp4', mime: 'video/mp4', size: 5, sha256: SHA, folder: 'originals/clips' });
ok(r.s === 200 && /^https:\/\/www\.googleapis\.com\/upload\//.test(r.j.upload_url) && r.j.drive_id === row.id, 'CLI upload_session → URL phiên resumable'); leak(r.text, 'upload_session');
ok(files.last && files.last.appProperties.sha256 === SHA && files.last.name === 'clips_src_mia_idle.mp4', 'metadata: tên an toàn (không /) + sha256 trong appProperties');
ok(gcalls.some(c => c.url.includes('/drive/v3/files?fields=id') && /Lexkite Library/.test(c.init.body || '')), 'tạo thư mục "Lexkite Library"');
ok(sql.prepare("SELECT COUNT(*) AS n FROM drive_folders WHERE path = 'Lexkite Library/originals/clips'").get().n === 1, 'nhớ id thư mục Lexkite Library/originals/clips');
files.size = 5;
r = await cli({ op: 'complete', drive_id: row.id, file_id: 'FILE_abcdefghijk', sha256: SHA }); ok(r.s === 200 && r.j.ok, 'CLI complete → ghi drive_files');
files.size = 6;
ok((await cli({ op: 'upload_session', name: 'y', mime: 'video/mp4', size: 6, sha256: 'b'.repeat(64) })).s === 200 && (await cli({ op: 'complete', drive_id: row.id, file_id: 'FILE_zzzzzzzzzzz', sha256: 'c'.repeat(64) })).s === 404, 'complete sai sha → 404 không có phiên chờ');
r = await cli({ op: 'upload_session', name: 'again', mime: 'video/mp4', size: 5, sha256: SHA }); ok(r.j.done === true && r.j.file_id === 'FILE_abcdefghijk', 'cùng sha256 → bỏ qua (đã có)');

// 7b) library.mjs (backend drive): chữ ký CLI khớp máy chủ + tải lên đầu-cuối (fetch định tuyến vào onRequestPost, PUT giả)
{
  const L = await import(new URL('../video/library.mjs', import.meta.url));
  const fsx = await import('node:fs'), os = await import('node:os'), pth = await import('node:path');
  const tmp = pth.join(os.tmpdir(), 'lexkite-drive-test.bin'); fsx.writeFileSync(tmp, 'library-bytes');
  const SHA2 = createHash('sha256').update('library-bytes').digest('hex');
  const puts = [];
  const fetcher = async (url, init) => {
    if (String(url).endsWith('/api/drive')) return mod.onRequestPost({ request: new Request('https://lexkite.com/api/drive', init), env: ENV });
    if (String(url).startsWith('https://www.googleapis.com/upload/')) { puts.push({ url, len: init.body.length }); files.size = init.body.length; return new Response(JSON.stringify({ id: 'FILE_fromlibrary1' }), { status: 200 }); }
    return globalThis.fetch(url, init);
  };
  ok((await L.driveApi('list', {}, { fetcher, key: CLI })).drives.length === 1, 'library.mjs driveSign khớp cliVerify của máy chủ');
  let e1; try { await L.driveApi('list', {}, { fetcher, key: 'x'.repeat(30) }); } catch (e) { e1 = e; } ok(e1 && e1.status === 403 && !e1.message.includes(CLI), 'library.mjs khoá sai → lỗi 403, không lộ khoá');
  ok(await L.driveReady({ fetcher, key: CLI, fresh: true }), 'driveReady: có Drive nhận file → true');
  const up = await L.driveUpload(tmp, { name: 'mia_idle.mp4', folder: 'originals/clips/src' }, { fetcher, key: CLI });
  ok(up.fileId === 'FILE_fromlibrary1' && puts.length === 1 && puts[0].len === 13, 'driveUpload: session → PUT thẳng Google → complete');
  ok(sql.prepare("SELECT status FROM drive_files WHERE sha256 = ?").get(SHA2).status === 'ok', 'drive_files ghi ok sau complete');
  const again = await L.driveUpload(tmp, { name: 'mia_idle.mp4', folder: 'originals/clips/src' }, { fetcher, key: CLI });
  ok(again.existed && puts.length === 1, 'tải lại cùng sha → bỏ qua, không PUT');
  r = await cli({ op: 'list', sha256: [SHA2, 'f'.repeat(64)] }); ok(r.j.have[SHA2] && r.j.have[SHA2].size === 13 && !r.j.have['f'.repeat(64)], 'list theo sha (verify)');
  await call(ADM, { op: 'set_weight', id: row.id, weight: 0 });
  ok(!(await L.driveReady({ fetcher, key: CLI, fresh: true })), 'driveReady: mọi Drive trọng số 0 → false (lùi về GrabCast)');
  await call(ADM, { op: 'set_weight', id: row.id, weight: 100 });
  fsx.unlinkSync(tmp);
}

// 8) get_link + tải qua link ký
r = await call(ADM, { op: 'get_link', file_id: 'FILE_abcdefghijk' }); ok(r.s === 200 && /^\/api\/drive\/dl\?f=FILE_abcdefghijk&x=\d+&s=/.test(r.j.url), 'get_link → link ký nội bộ'); leak(r.text, 'get_link');
res = await mod.handleDownload(new Request('https://lexkite.com' + r.j.url), ENV); ok(res.status === 200 && (await res.text()) === 'BYTES' && !/ya29/.test(JSON.stringify([...res.headers])), 'tải qua link ký (stream, không header token)');
res = await mod.handleDownload(new Request('https://lexkite.com' + r.j.url.replace(/s=[^&]+/, 's=AAAA')), ENV); ok(res.status === 403, 'link sửa chữ ký → 403');
ok(!(await mod.verifyLink(ENV, 'FILE_abcdefghijk', sec - 5, 'x')), 'link hết hạn → từ chối');

// 9) disconnect: cần đăng nhập gần đây, thu hồi token ở Google, xoá dòng
ok((await call(OLD, { op: 'disconnect', id: row.id })).s === 401, 'disconnect với phiên cũ > 15 phút → reauth');
gcalls = [];
r = await call(ADM, { op: 'disconnect', id: row.id }); ok(r.s === 200 && r.j.revoked === true, 'disconnect → thu hồi token ở Google'); leak(r.text, 'disconnect');
ok(gcalls.some(c => c.url === 'https://oauth2.googleapis.com/revoke'), 'gọi endpoint revoke');
ok(sql.prepare('SELECT COUNT(*) AS n FROM drives').get().n === 0 && sql.prepare('SELECT COUNT(*) AS n FROM drive_files').get().n === 0, 'xoá dòng Drive + bản ghi file');

// 10) nhật ký: có ghi, không chứa bí mật
const logs = sql.prepare("SELECT * FROM admin_log WHERE op LIKE 'drive.%'").all();
ok(logs.length >= 8 && logs.some(l => l.email === 'cli') && logs.some(l => l.op === 'drive.denied'), 'nhật ký ghi mọi thao tác (cả CLI bị từ chối)'); leak(JSON.stringify(logs), 'admin_log');

if (fails) { console.log(`✗ drive: ${fails}/${n} kiểm thất bại`); process.exit(1); }
console.log(`✓ drive: ${n} kiểm (state/CSRF, AES-GCM, không lộ token, chọn Drive, chừa trống, cổng admin, CLI HMAC, link tải)`);
