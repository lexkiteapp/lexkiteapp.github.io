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
  // chia đều: tỉ lệ đã dùng thấp nhất thắng (không phải chỗ trống tuyệt đối); ≥ 90 % bị loại
  ok(mod.pickDrive(rows, 1e6).id === 2, 'tỉ lệ thấp nhất thắng (33 % < 50 %, dù Drive 3 trống nhiều hơn); Drive 1 (93 %) bị loại');
  ok(mod.pickDrive(rows.map(r => r.id === 2 ? { ...r, weight: 50 } : r), 1e6).id === 3, 'trọng số 50 → tỉ lệ ×2 (66 % > 50 %)');
  ok(mod.pickDrive(rows.map(r => r.id === 2 ? { ...r, status: 'draining' } : r), 1e6).id === 3, 'Drive đang rút (drain) không nhận file mới');
  ok(mod.pickDrive(rows.map(r => r.id === 2 ? { ...r, weight: 0 } : r), 1e6).id === 3, 'trọng số 0 = loại');
  const tight = [{ id: 9, status: 'ok', weight: 100, quota_total: 100 * G, quota_used: 89 * G }];
  ok(mod.pickDrive(tight, 7 * G) === null, '11 GB trống − 5 GB chừa (5 %) < 7 GB → không chọn');
  ok(mod.pickDrive(tight, 1 * G).id === 9, 'file nhỏ vừa chỗ sau khi chừa trống');
  ok(mod.pickDrive([{ id: 8, status: 'ok', weight: 100, quota_total: 100 * G, quota_used: 90 * G }], 1) === null, '≥ 90 % → tự loại khỏi luồng nhận file');
  const eq = [{ id: 1, status: 'ok', weight: 100, quota_total: 10 * G, quota_used: 2 * G }, { id: 2, status: 'ok', weight: 100, quota_total: 20 * G, quota_used: 4 * G }, { id: 3, status: 'ok', weight: 100, quota_total: 10 * G, quota_used: 5 * G }];
  ok([0, 1, 2, 3].map(rot => mod.pickDrive(eq, 1, { rot }).id).join() === '1,2,1,2', 'cùng tỉ lệ (20 %) → xoay vòng 1,2,1,2');
  const two = mod.pickDrives(eq, 1, 2); ok(two.length === 2 && two[0].id !== two[1].id, '2 bản sao → 2 Drive khác nhau');
  ok(mod.pickDrives([eq[0]], 1, 2).length === 1, 'chỉ 1 Drive → 1 bản (báo thiếu)');
  ok(mod.pickDrive([{ id: 4, status: 'ok', weight: 1, quota_total: null, quota_used: 0 }, ...rows], 1e6).id === 4, 'Drive không giới hạn dung lượng');
  ok(mod.clsOf(null, 'stacked/clips') === 'render' && mod.clsOf(null, 'originals/chars') === 'original' && mod.replicasFor('original') === 2 && mod.replicasFor('render') === 1 && mod.replicasFor('render', 3) === 3, 'lớp bản sao: original 2 · render 1');
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

// ======================= 11) Trình duyệt file + dọn dẹp + bản sao + tra soát + cảnh báo (Google giả có trạng thái) =======================
{
  const G = 1024 ** 3, now = Date.now(), iso = t => new Date(t).toISOString();
  const ACC = {}; // refresh → tài khoản giả
  const mkAcc = (key, email, limit, usage) => (ACC['1//R_' + key] = { key, email, access: 'ya29.A_' + key + '_SECRET', limit, usage, files: new Map(), n: 0, revoked: false, down: 0 });
  const A1 = mkAcc('one', 'alpha.drive@gmail.com', 100 * G, 20 * G), A2 = mkAcc('two', 'beta.drive@gmail.com', 100 * G, 20 * G), A3 = mkAcc('three', 'gamma@gmail.com', 100 * G, 50 * G);
  const SEC2 = [...SECRETS, ...Object.keys(ACC), ...Object.values(ACC).map(a => a.access), 'lh3.googleusercontent.com'];
  const leak2 = (t, m) => ok(!SEC2.some(k => String(t).includes(k)), 'không lộ token/thumbnailLink: ' + m);
  const byTok = h => Object.values(ACC).find(a => h && h === 'Bearer ' + a.access);
  const md5 = b => createHash('md5').update(b).digest('hex');
  const add = (a, f) => { const id = f.id || ('F' + a.key + String(++a.n).padStart(10, '0')); const x = { mimeType: 'application/octet-stream', parents: [], trashed: false, createdTime: iso(now), modifiedTime: iso(now), appProperties: {}, ...f, id }; if (x.mimeType !== 'application/vnd.google-apps.folder' && x.size == null) x.size = '0'; a.files.set(id, x); return x; };
  const mails = []; ENV.MAIL = { fetch: async (u, i) => { mails.push(JSON.parse(i.body)); return new Response('{}'); } }; const ENV2 = ENV;
  const putMeta = new Map();
  const view = (f, fields) => { const o = { ...f }; if (o.mimeType && /^image\/|^video\//.test(o.mimeType)) o.thumbnailLink = `https://lh3.googleusercontent.com/thumb/${f.id}=s220`; o.webViewLink = `https://drive.google.com/file/d/${f.id}/view`; delete o._bytes; return o; };
  globalThis.fetch = async (url, init = {}) => {
    url = String(url); const H = new Headers(init.headers || {}), auth = H.get('Authorization');
    const body = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : init.body;
    const J = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', ...h } });
    if (url.includes('googleapis.com/robot') || url.includes('securetoken')) return { ok: true, json: async () => ({ keys: [jwk] }) };
    if (url === 'https://oauth2.googleapis.com/token') { const a = ACC[body.refresh_token]; if (a && a.down > 0) { a.down--; throw new TypeError('network'); } return a && !a.revoked ? J({ access_token: a.access, expires_in: 3599 }) : J({ error: 'invalid_grant' }, 400); }
    if (url.startsWith('https://lh3.googleusercontent.com/thumb/')) return byTok(auth) ? new Response('PNGDATA', { status: 200, headers: { 'Content-Type': 'image/png' } }) : new Response('no', { status: 403 });
    const a = byTok(auth);
    if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable') && init.method !== 'PUT') {
      if (!a) return J({}, 401); const m = JSON.parse(init.body), uid = a.key + '_' + (++a.n); putMeta.set(uid, { a, m });
      return new Response('', { status: 200, headers: { Location: 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&upload_id=' + uid } });
    }
    if (url.startsWith('https://www.googleapis.com/upload/drive/v3/files?') && init.method === 'PUT') {
      const pm = putMeta.get(new URL(url).searchParams.get('upload_id')); let buf = init.body;
      if (buf && typeof buf.getReader === 'function') buf = Buffer.from(await new Response(buf).arrayBuffer()); else buf = Buffer.from(buf);
      const f = add(pm.a, { name: pm.m.name, mimeType: pm.m.mimeType, parents: pm.m.parents, appProperties: pm.m.appProperties, size: String(buf.length), md5Checksum: md5(buf), _bytes: buf });
      pm.a.usage += buf.length; return J({ id: f.id, size: f.size, md5Checksum: f.md5Checksum, webViewLink: view(f).webViewLink });
    }
    if (url.startsWith('https://www.googleapis.com/drive/v3/about')) return a ? J({ storageQuota: { limit: String(a.limit), usage: String(a.usage) }, user: { emailAddress: a.email } }) : J({}, 401);
    if (!a) return J({ error: 'auth' }, 401);
    const u = new URL(url), m = u.pathname.match(/^\/drive\/v3\/files(?:\/([^/]+))?$/); if (!m) return J({ error: 'unexpected ' + url }, 500);
    const id = m[1] && decodeURIComponent(m[1]);
    if (!id && (init.method || 'GET') === 'GET') {
      const q = u.searchParams.get('q') || ''; let list = [...a.files.values()];
      const par = q.match(/'([^']+)' in parents/); if (par) list = list.filter(f => (f.parents || []).includes(par[1]));
      if (/trashed = false/.test(q)) list = list.filter(f => !f.trashed); if (/trashed = true/.test(q) && !/or trashed/.test(q)) list = list.filter(f => f.trashed);
      const nm = q.match(/name = '([^']+)'/); if (nm) list = list.filter(f => f.name === nm[1]);
      const nc = q.match(/name contains '([^']+)'/); if (nc) list = list.filter(f => f.name.includes(nc[1]));
      if (/mimeType = 'application\/vnd.google-apps.folder'/.test(q)) list = list.filter(f => f.mimeType === 'application/vnd.google-apps.folder');
      if (/^'root' in parents/.test(q) || /'root' in parents/.test(q)) list = list.filter(f => (f.parents || []).includes('root'));
      if ((u.searchParams.get('orderBy') || '').includes('name')) list.sort((x, y) => x.name.localeCompare(y.name));
      const size = +u.searchParams.get('pageSize') || 100, off = +(u.searchParams.get('pageToken') || 0), page = list.slice(off, off + size);
      return J({ files: page.map(f => view(f)), ...(off + size < list.length ? { nextPageToken: String(off + size) } : {}) });
    }
    if (!id && init.method === 'POST') { const b2 = JSON.parse(init.body); const f = add(a, { name: b2.name, mimeType: b2.mimeType, parents: b2.parents, appProperties: b2.appProperties }); return J({ id: f.id }); }
    const f = a.files.get(id); if (!f) return J({ error: 'notFound' }, 404);
    if (u.searchParams.get('alt') === 'media') return new Response(f._bytes || Buffer.alloc(+f.size || 0), { status: 200, headers: { 'Content-Length': String(f.size) } });
    if (init.method === 'PATCH') { const b2 = JSON.parse(init.body || '{}'); if ('trashed' in b2) f.trashed = b2.trashed; if (b2.name) f.name = b2.name; const ap = u.searchParams.get('addParents'), rp = u.searchParams.get('removeParents'); if (ap) f.parents = [...(f.parents || []).filter(p => !(rp || '').split(',').includes(p)), ap]; return J(view(f)); }
    if (init.method === 'DELETE') { a.files.delete(id); a.usage -= +f.size || 0; return new Response(null, { status: 204 }); }
    return J(view(f));
  };
  mod._tokenCache.clear();
  // 3 Drive trong D1 (refresh token mã hoá)
  const insDrive = async a => { const e = await mod.encryptToken(ENV, '1//R_' + a.key, a.email); sql.prepare("INSERT INTO drives (email, enc_token, iv, quota_total, quota_used, status, weight, created) VALUES (?, ?, ?, ?, ?, 'ok', 100, ?)").run(a.email, e.enc_token, e.iv, a.limit, a.usage, now); return sql.prepare('SELECT id FROM drives WHERE email = ?').get(a.email).id; };
  const D1 = await insDrive(A1), D2 = await insDrive(A2), D3 = await insDrive(A3);
  // cây thư mục Lexkite Library trên Drive 1
  const root = add(A1, { name: 'Lexkite Library', mimeType: 'application/vnd.google-apps.folder', parents: ['root'] });
  const orig = add(A1, { name: 'originals', mimeType: 'application/vnd.google-apps.folder', parents: [root.id] });
  const tmp = add(A1, { name: 'tmp', mimeType: 'application/vnd.google-apps.folder', parents: [root.id] });
  sql.prepare('INSERT INTO drive_folders (drive_id, path, folder_id) VALUES (?, ?, ?), (?, ?, ?)').run(D1, 'Lexkite Library', root.id, D1, 'Lexkite Library/originals', orig.id);
  const old = iso(now - 120 * 864e5), SHA_A = 'a1'.repeat(32), SHA_R = 'b2'.repeat(32), SHA_O = 'c3'.repeat(32);
  const img = add(A1, { name: 'ama_dna.png', mimeType: 'image/png', parents: [orig.id], size: '1000', md5Checksum: 'M1', appProperties: { lexkite: 'library', sha256: SHA_A }, createdTime: old, modifiedTime: old });
  const dupOld = add(A1, { name: 'ama_dna (1).png', mimeType: 'image/png', parents: [orig.id], size: '1000', md5Checksum: 'M1', createdTime: old, modifiedTime: old });
  const dupNew = add(A1, { name: 'ama_dna (2).png', mimeType: 'image/png', parents: [orig.id], size: '1000', md5Checksum: 'M1', createdTime: iso(now - 864e5), modifiedTime: iso(now - 864e5) });
  const rej = add(A1, { name: 'leo_bad.png', mimeType: 'image/png', parents: [orig.id], size: '500', md5Checksum: 'M2', appProperties: { lexkite: 'library', sha256: SHA_R }, createdTime: iso(now - 40 * 864e5), modifiedTime: iso(now - 40 * 864e5) });
  const rejNew = add(A1, { name: 'leo_bad2.png', mimeType: 'image/png', parents: [orig.id], size: '500', md5Checksum: 'M5', appProperties: { lexkite: 'library', sha256: 'e5'.repeat(32) }, createdTime: iso(now - 5 * 864e5), modifiedTime: iso(now - 5 * 864e5) });
  const tmpOld = add(A1, { name: 'render_01.mp4', mimeType: 'video/mp4', parents: [tmp.id], size: '300', md5Checksum: 'M3', createdTime: iso(now - 10 * 864e5), modifiedTime: iso(now - 10 * 864e5) });
  const tmpNew = add(A1, { name: 'render_02.mp4', mimeType: 'video/mp4', parents: [tmp.id], size: '300', md5Checksum: 'M4', createdTime: iso(now - 864e5), modifiedTime: iso(now - 864e5) });
  const zero = add(A1, { name: 'broken.mp4', mimeType: 'video/mp4', parents: [orig.id], size: '0' });
  const orphan = add(A1, { name: 'lost.webp', mimeType: 'image/webp', parents: [orig.id], size: '700', md5Checksum: 'M6', appProperties: { lexkite: 'library', sha256: SHA_O } });
  const inTrash = add(A1, { name: 'old.png', mimeType: 'image/png', parents: [orig.id], size: '800', md5Checksum: 'M7', trashed: true });
  for (let i = 0; i < 5; i++) add(A1, { name: `bulk_${i}.png`, mimeType: 'image/png', parents: [orig.id], size: '10', md5Checksum: 'MB' + i });
  const insF = (d, f, sha, st = 'ok', extra = {}) => sql.prepare('INSERT INTO drive_files (drive_id, file_id, sha256, name, folder, mime, size, status, created, done, want, cls, email, asset_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(d, f ? f.id : null, sha, extra.name || (f && f.name), extra.folder || 'originals', extra.mime || (f && f.mimeType) || 'image/png', extra.size ?? +(f && f.size), st, extra.created || now, extra.done || now, extra.want ?? 2, extra.cls || 'original', extra.email || (d === D1 ? A1.email : d === D2 ? A2.email : A3.email), extra.asset || null);
  insF(D1, img, SHA_A, 'ok', { asset: 'chars/ama/dna.png' }); insF(D1, rej, SHA_R, 'ok', { asset: 'chars/leo/bad.png', want: 1 });
  for (let i = 0; i < 5; i++) insF(D1, [...A1.files.values()].find(f => f.name === `bulk_${i}.png`), String(i).repeat(64), 'ok', { want: 1, asset: 'bulk/' + i });

  // --- cổng: người thường / CLI không dùng được op quản trị mới
  for (const op of ['browse', 'trash', 'cleanup_scan', 'cleanup_apply', 'delete', 'ledger', 'audit_list', 'rebalance']) ok((await call(USER, { op, drive_id: D1 })).s === 403, 'người thường bị từ chối: ' + op);
  ok((await cli({ op: 'trash', drive_id: D1, file_ids: [img.id] })).s === 403 && (await cli({ op: 'browse', drive_id: D1 })).s === 403, 'CLI không được browse/trash');

  // --- browse: thư mục gốc, breadcrumbs, phân trang, thumb proxy ký (không thumbnailLink/token)
  let r = await call(ADM, { op: 'browse', drive_id: D1, page_size: 20 });
  ok(r.s === 200 && r.j.root === root.id && r.j.crumbs.length === 1 && r.j.items.some(x => x.name === 'originals' && x.folder && x.sys), 'browse gốc kho + thư mục hệ thống'); leak2(r.text, 'browse');
  r = await call(ADM, { op: 'browse', drive_id: D1, folder_id: orig.id, page_size: 5, order: 'name' });
  ok(r.j.items.length === 5 && r.j.next && r.j.crumbs.map(c => c.name).join('/') === 'Lexkite Library/originals', 'browse phân trang (5/lượt) + breadcrumbs');
  const p2 = await call(ADM, { op: 'browse', drive_id: D1, folder_id: orig.id, page_size: 5, order: 'name', page_token: r.j.next });
  ok(p2.j.items.length === 5 && !p2.j.items.some(x => r.j.items.some(y => y.id === x.id)), 'trang 2 khác trang 1');
  const ii = [...r.j.items, ...p2.j.items].find(x => x.id === img.id) || (await call(ADM, { op: 'browse', drive_id: D1, q: 'ama_dna.png' })).j.items.find(x => x.id === img.id);
  ok(ii && /^\/api\/drive\/thumb\?d=\d+&f=/.test(ii.thumb) && ii.copies === 1 && ii.want === 2 && ii.asset === 'chars/ama/dna.png', 'mục ảnh: thumb = link proxy ký + số bản sao 1/2 + asset');
  ok((await call(ADM, { op: 'browse', drive_id: D1, folder_id: 'bad id!' })).s === 400, 'folder_id xấu → 400');
  r = await call(ADM, { op: 'browse', drive_id: D1, trash: true }); ok(r.j.items.length === 1 && r.j.items[0].id === inTrash.id, 'xem thùng rác');
  // thumb proxy
  const th = await mod.handleThumb(new Request('https://lexkite.com' + ii.thumb), ENV);
  const thBody = await th.text(), thHdr = JSON.stringify([...th.headers]);
  ok(th.status === 200 && thBody === 'PNGDATA' && th.headers.get('Content-Type') === 'image/png' && /private/.test(th.headers.get('Cache-Control')), 'thumb proxy trả ảnh + cache riêng tư');
  leak2(thHdr + thBody, 'thumb proxy');
  ok((await mod.handleThumb(new Request('https://lexkite.com' + ii.thumb.replace(/s=[^&]+$/, 's=AAAA')), ENV)).status === 403, 'thumb sửa chữ ký → 403');
  ok((await mod.handleThumb(new Request('https://lexkite.com' + ii.thumb.replace(/f=[^&]+/, 'f=' + rej.id)), ENV)).status === 403, 'thumb đổi file_id → 403');
  r = await call(ADM, { op: 'thumb', drive_id: D1, file_id: img.id }); ok(r.s === 200 && r.j.url.startsWith('/api/drive/thumb?'), 'op thumb → link ký'); leak2(r.text, 'op thumb');
  // preview (= get_link, + d cho file chưa có trong drive_files)
  r = await call(ADM, { op: 'preview', drive_id: D1, file_id: orphan.id }); ok(r.s === 200 && /&d=\d+&s=/.test(r.j.url) && r.j.kind === 'image', 'preview file ngoài drive_files → link ký kèm id Drive');
  res = await mod.handleDownload(new Request('https://lexkite.com' + r.j.url), ENV); ok(res.status === 200 && res.headers.get('X-Content-Type-Options') === 'nosniff', 'tải/preview qua link ký (nosniff)');
  ok((await mod.handleDownload(new Request('https://lexkite.com' + r.j.url.replace(/d=\d+/, 'd=' + D2)), ENV)).status === 403, 'đổi id Drive trong link → 403');

  // --- rename / move (giữa thư mục kho cùng Drive), D1 cập nhật
  r = await call(ADM, { op: 'rename', drive_id: D1, file_id: img.id, name: 'ama/dna?.png' }); ok(r.s === 200 && A1.files.get(img.id).name === 'ama_dna?.png' && sql.prepare('SELECT name FROM drive_files WHERE file_id = ?').get(img.id).name === 'ama_dna?.png', 'rename: tên an toàn + D1 khớp');
  ok((await call(ADM, { op: 'rename', drive_id: D1, file_id: orig.id, name: 'x' })).j.error === 'system-folder', 'không đổi tên thư mục hệ thống');
  r = await call(ADM, { op: 'move', drive_id: D1, file_ids: [rej.id], folder_id: tmp.id }); ok(r.s === 200 && r.j.done.length === 1 && A1.files.get(rej.id).parents[0] === tmp.id && sql.prepare('SELECT folder FROM drive_files WHERE file_id = ?').get(rej.id).folder === 'tmp', 'move → thư mục kho khác, D1 folder cập nhật');
  const outside = add(A1, { name: 'Other', mimeType: 'application/vnd.google-apps.folder', parents: ['root'] });
  ok((await call(ADM, { op: 'move', drive_id: D1, file_ids: [rej.id], folder_id: outside.id })).j.error === 'outside-library', 'không chuyển ra ngoài "Lexkite Library"');
  ok((await call(ADM, { op: 'move', drive_id: D1, file_ids: [tmp.id], folder_id: tmp.id })).j.failed[0].error === 'into-itself', 'không chuyển thư mục vào chính nó');
  await call(ADM, { op: 'move', drive_id: D1, file_ids: [rej.id], folder_id: orig.id });

  // --- trash / restore / xoá vĩnh viễn (confirm + reauth + chỉ file trong thùng rác)
  r = await call(ADM, { op: 'trash', drive_id: D1, file_ids: [rejNew.id] }); ok(r.j.done.length === 1 && A1.files.get(rejNew.id).trashed, 'trash → Google trashed=true');
  r = await call(ADM, { op: 'restore', drive_id: D1, file_ids: [rejNew.id] }); ok(r.j.done.length === 1 && !A1.files.get(rejNew.id).trashed, 'restore');
  ok((await call(ADM, { op: 'trash', drive_id: D1, file_ids: [orig.id] })).j.failed[0].error === 'system-folder', 'không vứt thư mục hệ thống');
  await call(ADM, { op: 'trash', drive_id: D1, file_ids: [img.id] }); ok(sql.prepare('SELECT status FROM drive_files WHERE file_id = ?').get(img.id).status === 'trashed', 'D1: trash → trashed');
  await call(ADM, { op: 'restore', drive_id: D1, file_ids: [img.id] }); ok(sql.prepare('SELECT status FROM drive_files WHERE file_id = ?').get(img.id).status === 'ok', 'D1: restore → ok');
  ok((await call(OLD, { op: 'delete', drive_id: D1, file_ids: [inTrash.id], confirm: 'DELETE' })).s === 401, 'xoá vĩnh viễn với phiên cũ → reauth');
  ok((await call(ADM, { op: 'delete', drive_id: D1, file_ids: [inTrash.id] })).j.error === 'confirm', 'xoá vĩnh viễn thiếu confirm → 400');
  ok((await call(ADM, { op: 'delete', drive_id: D1, file_ids: [img.id], confirm: 'DELETE' })).j.failed[0].error === 'not-in-trash' && A1.files.has(img.id), 'chỉ xoá vĩnh viễn file đã ở thùng rác');
  ok((await call(OLD, { op: 'empty_trash', drive_id: D1, confirm: 'DELETE' })).s === 401, 'dọn thùng rác cần đăng nhập lại');

  // --- cleanup_scan: phân loại (dry-run, không đổi gì)
  await cli({ op: 'refs_sync', source: 'library', items: [{ s: SHA_A, f: img.id, st: 'approved' }, { s: SHA_R, st: 'reject' }, { s: 'e5'.repeat(32), st: 'reject' }, ...[0, 1, 2, 3, 4].map(i => ({ s: String(i).repeat(64), st: 'approved' }))] });
  ok(sql.prepare("SELECT COUNT(*) AS n FROM drive_refs WHERE src = 'library'").get().n === 8, 'refs_sync (CLI) lưu tham chiếu library.json');
  insF(D1, null, 'd4'.repeat(32), 'pending', { name: 'half.mp4', created: now - 3 * 864e5 });
  const half = add(A1, { name: 'half.mp4', mimeType: 'video/mp4', parents: [orig.id], size: '900', md5Checksum: 'M8', appProperties: { lexkite: 'library', sha256: 'd4'.repeat(32) }, createdTime: iso(now - 3 * 864e5), modifiedTime: iso(now - 3 * 864e5) });
  const before = JSON.stringify([...A1.files.values()]);
  r = await call(ADM, { op: 'cleanup_scan', drive_id: D1, reject_days: 30, temp_days: 7 });
  const G2 = r.j.groups || {}, has2 = (c, id) => (G2[c] || []).some(x => x.id === id);
  ok(r.s === 200 && r.j.dry_run && JSON.stringify([...A1.files.values()]) === before, 'cleanup_scan chỉ đọc – không đổi file nào');
  ok(has2('duplicate', dupOld.id) && has2('duplicate', dupNew.id) && !has2('duplicate', img.id) && G2.duplicate.every(x => x.keep.id === img.id && x.reason === 'dup-keep-referenced'), 'trùng: giữ bản manifest trỏ tới, 2 bản kia là ứng viên');
  ok(has2('old_reject', rej.id) && !has2('old_reject', rejNew.id), 'reject > 30 ngày là ứng viên, reject 5 ngày thì không');
  ok(has2('temp', tmpOld.id) && !has2('temp', tmpNew.id), 'bản tạm > 7 ngày là ứng viên, bản mới thì không');
  ok(has2('partial', zero.id) && G2.partial.find(x => x.id === zero.id).reason === 'zero-byte' && has2('partial', half.id) && G2.partial.find(x => x.id === half.id).reason === 'incomplete-upload', 'tải dở: 0 byte + tải xong nhưng chưa complete');
  ok(has2('orphan', orphan.id) && !has2('orphan', img.id) && !has2('orphan', rejNew.id), 'mồ côi: không có trong drive_files lẫn manifest');
  ok(has2('trashed', inTrash.id), 'file đã ở thùng rác');
  ok(r.j.total === CATS_SUM(G2) && r.j.refs_synced, 'tổng dung lượng thu hồi = tổng ứng viên');
  { const s2 = (await call(ADM, { op: 'cleanup_scan', drive_id: D1, reject_days: 60, temp_days: 30 })).j.groups; ok(!s2.old_reject.some(x => x.id === rej.id) && !s2.temp.some(x => x.id === tmpOld.id), 'ngưỡng ngày cấu hình được (60/30 → không còn)'); }
  // cleanup_apply → thùng rác + undo
  r = await call(ADM, { op: 'cleanup_apply', drive_id: D1, file_ids: [dupOld.id, dupNew.id] });
  ok(r.j.done.length === 2 && A1.files.get(dupOld.id).trashed && A1.files.has(dupOld.id) && r.j.undo.length === 2, 'cleanup_apply chỉ chuyển vào thùng rác + trả undo');
  r = await call(ADM, { op: 'restore', drive_id: D1, file_ids: r.j.undo }); ok(r.j.done.length === 2 && !A1.files.get(dupOld.id).trashed, 'Undo = restore');
  // xoá vĩnh viễn hợp lệ + empty_trash chỉ file của kho
  r = await call(ADM, { op: 'delete', drive_id: D1, file_ids: [inTrash.id], confirm: 'DELETE' }); ok(r.j.done.length === 1 && !A1.files.has(inTrash.id), 'xoá vĩnh viễn file trong thùng rác');
  const foreign = add(A1, { name: 'notours.txt', mimeType: 'text/plain', parents: [outside.id], size: '5', trashed: true });
  await call(ADM, { op: 'trash', drive_id: D1, file_ids: [zero.id] });
  r = await call(ADM, { op: 'empty_trash', drive_id: D1, confirm: 'DELETE' }); ok(r.j.done.includes(zero.id) && A1.files.has(foreign.id), 'empty_trash: chỉ file kho Lexkite (không dùng emptyTrash của Google)');
  // báo cáo dung lượng
  r = await call(ADM, { op: 'storage_report', drive_id: D1 }); ok(r.s === 200 && r.j.by_folder.originals && r.j.by_type.image && r.j.largest.length && r.j.largest[0].size >= r.j.largest[r.j.largest.length - 1].size, 'storage_report: theo thư mục/loại + top lớn nhất'); leak2(r.text, 'storage_report');
  // nhật ký drive_audit
  const acts = new Set(sql.prepare('SELECT act FROM drive_audit').all().map(x => x.act));
  ok(['trash', 'restore', 'delete', 'move', 'rename', 'cleanup', 'empty_trash'].every(a => acts.has(a)), 'drive_audit ghi trash/restore/delete/move/rename/cleanup/empty_trash');
  ok(sql.prepare("SELECT * FROM drive_audit WHERE act = 'delete'").all().every(x => x.who === 'boss@lexkite.com' && x.drive_id === D1 && x.email === A1.email && x.file_id), 'audit: ai · Drive nào · file nào');
  r = await call(ADM, { op: 'audit_list', act: 'move' }); ok(r.j.rows.length >= 1 && r.j.rows.every(x => x.act === 'move'), 'audit_list lọc theo act');

  // --- bản sao: upload 2 bản trên 2 Drive khác nhau (tỉ lệ thấp nhất), render 1 bản
  const SHA_N = createHash('sha256').update('new-orig').digest('hex');
  r = await cli({ op: 'upload_session', name: 'mia.png', mime: 'image/png', size: 8, sha256: SHA_N, folder: 'originals/chars', asset_id: 'chars/mia/dna.png', run: '12345' });
  ok(r.j.sessions && r.j.sessions.length === 2 && r.j.sessions[0].drive_id !== r.j.sessions[1].drive_id && !r.j.sessions.some(x => x.drive_id === D3), 'bản gốc → 2 phiên trên 2 Drive khác nhau, bỏ Drive tỉ lệ cao (50 %)');
  for (const ss of r.j.sessions) { const pu = await fetch(ss.upload_url, { method: 'PUT', body: Buffer.from('new-orig') }); const fid = (await pu.json()).id; const c = await cli({ op: 'complete', drive_id: ss.drive_id, file_id: fid, sha256: SHA_N }); ok(c.j.ok && /\*\*\*/.test(c.j.email_masked) && !c.text.includes('alpha.drive@') && !c.text.includes('beta.drive@'), 'complete: email che một phần cho CLI'); }
  const rowsN = sql.prepare('SELECT * FROM drive_files WHERE sha256 = ?').all(SHA_N);
  ok(rowsN.length === 2 && rowsN.every(x => x.status === 'ok' && x.email && x.by_who === 'ci:12345' && x.asset_id === 'chars/mia/dna.png' && /^https:\/\/drive\.google\.com/.test(x.web) && x.want === 2), 'drive_files ghi đủ: email, người tải (CI run), asset, link, want');
  ok(sql.prepare("SELECT COUNT(*) AS n FROM drive_audit WHERE act = 'upload' AND sha256 = ?").get(SHA_N).n === 2, 'audit ghi upload từng bản sao');
  r = await cli({ op: 'upload_session', name: 'mia.png', mime: 'image/png', size: 8, sha256: SHA_N, folder: 'originals/chars' }); ok(r.j.done && r.j.copies === 2, 'đủ 2 bản → bỏ qua');
  r = await cli({ op: 'upload_session', name: 'r.mp4', mime: 'video/mp4', size: 4, sha256: 'f9'.repeat(32), folder: 'stacked/clips' }); ok(r.j.sessions.length === 1 && r.j.want === 1, 'bản dựng (stacked) → 1 bản');
  // tra cứu theo từng khoá
  for (const [k, q] of [['tên', 'mia.png'], ['asset', 'chars/mia'], ['sha (một phần)', SHA_N.slice(0, 12)], ['file_id', rowsN[0].file_id]]) { const w = await call(ADM, { op: 'where', q }); ok(w.j.copies.length >= (k === 'file_id' ? 1 : 2) && w.j.copies.every(c => c.email && c.email_masked), 'tra cứu theo ' + k + ' (admin thấy email đầy đủ)'); }
  r = await cli({ op: 'where', q: SHA_N }); ok(r.j.copies.length === 2 && r.j.copies.every(c => !c.email && /\*\*\*/.test(c.email_masked)) && !/alpha\.drive@|beta\.drive@/.test(r.text), 'CLI where: email che một phần');
  ok(mod.maskEmail('alpha.drive@gmail.com') === 'al***e@gmail.com' && mod.maskEmail('ab@x.com') === 'a*@x.com', 'maskEmail');
  // sổ kho: bộ lọc máy chủ + CSV
  const led = async f => (await call(ADM, { op: 'ledger', f })).j;
  ok((await led({ drive_id: D1 })).rows.every(x => x.drive_id === D1), 'lọc theo drive_id');
  ok((await led({ email: A2.email })).rows.every(x => x.email === A2.email) && (await led({ email: A2.email })).total >= 1, 'lọc theo email Drive');
  ok((await led({ q: 'bulk_' })).total === 5, 'tìm tên khớp một phần');
  ok((await led({ q: SHA_N.slice(5, 20) })).total === 2, 'tìm sha khớp một phần');
  ok((await led({ type: 'image' })).rows.every(x => /^image\//.test(x.mime)) && (await led({ type: 'render' })).total === 0, 'lọc loại ảnh/render');
  ok((await led({ lib: 'reject' })).rows.every(x => x.lib === 'reject') && (await led({ lib: 'reject' })).total === 1, 'lọc trạng thái kho (reject)');
  ok((await led({ copies: '2+' })).rows.every(x => x.sha256 === SHA_N) && (await led({ copies: '1' })).rows.every(x => x.copies <= 1), 'lọc số bản sao 1 / ≥ 2');
  ok((await led({ folder: 'originals' })).rows.every(x => x.folder === 'originals' || x.folder.startsWith('originals/')), 'lọc thư mục (gồm thư mục con)');
  ok((await led({ min: 900 })).rows.every(x => x.size >= 900) && (await led({ max: 10 })).rows.every(x => x.size <= 10), 'lọc khoảng dung lượng');
  ok((await led({ from: Date.now() + 1e6 })).total === 0 && (await led({ to: now + 1e9 })).total > 0, 'lọc khoảng ngày');
  { const a2 = await led({ sort: 'size', dir: 'asc', limit: 3 }), b2 = await led({ sort: 'size', dir: 'asc', limit: 3, offset: 3 }); ok(a2.rows.length === 3 && a2.rows[0].size <= a2.rows[2].size && b2.rows[0].size >= a2.rows[2].size, 'sắp xếp + phân trang'); }
  r = await call(ADM, { op: 'ledger', f: { q: 'bulk_' }, format: 'csv' });
  const csv = r.j.csv.trim().split('\r\n'); ok(csv[0] === 'file,asset,drive_email,file_id,sha256,size,date,folder,copies,status' && csv.length === 6 && csv[1].split(',')[2] === A1.email, 'CSV sổ kho: đúng cột + theo bộ lọc');
  ok(mod.ledgerCsv([{ name: '=cmd()', asset_id: 'a,b', email: 'x@y.z', file_id: 'f', sha256: 's', size: 1, at: 0 }]).split('\r\n')[1].startsWith("'=cmd()") , 'CSV chống chèn công thức');
  // verify_files: 404 → gone
  const goneId = [...A1.files.values()].find(f => f.name === 'bulk_4.png').id; A1.files.delete(goneId);
  r = await call(ADM, { op: 'verify_files', drive_id: D1, batch: 100 }); ok(r.j.changed >= 1 && sql.prepare('SELECT status FROM drive_files WHERE file_id = ?').get(goneId).status === 'gone', 'verify_files: Google 404 → mất (gone)');
  ok((await led({ gstate: 'gone' })).total === 1, 'lọc tình trạng Google: mất');

  // --- repair khi 1 Drive hỏng + rebalance dry-run
  ACC['1//R_two'].revoked = true; mod._tokenCache.clear();
  r = await call(ADM, { op: 'health' }); ok(r.j.drives.find(x => x.id === D2).state === 'disconnected' && sql.prepare('SELECT status FROM drives WHERE id = ?').get(D2).status === 'disconnected', 'invalid_grant → disconnected');
  ok(r.j.alerts.some(a => a.kind === 'conn:' + D2 && a.level === 'crit') && r.j.single >= 1, 'cảnh báo nghiêm trọng mất kết nối + báo "chỉ còn 1 bản"');
  ok(mails.length === 1 && /mất kết nối/.test(mails[0].text), 'gửi 1 thư nghiêm trọng');
  r = await call(ADM, { op: 'repair', dry_run: true }); ok(r.j.dry_run && r.j.plan.some(p => p.sha === SHA_N && p.to === D3), 'repair dry-run: kế hoạch chép sang Drive còn lại');
  r = await call(ADM, { op: 'repair' }); ok(r.j.done.some(x => x.sha === SHA_N && x.drive_id === D3) && [...A3.files.values()].some(f => f.appProperties.sha256 === SHA_N && f.size === '8'), 'repair: chép bù Drive → Drive (đủ byte)');
  ok(sql.prepare("SELECT COUNT(*) AS n FROM drive_files f JOIN drives d ON d.id = f.drive_id WHERE f.sha256 = ? AND f.status = 'ok' AND d.status = 'ok'").get(SHA_N).n === 2 && sql.prepare("SELECT COUNT(*) AS n FROM drive_audit WHERE act = 'repair' AND ok = 1").get().n >= 1, 'đủ 2 bản trên Drive khỏe + audit repair');
  { const pl = mod.planRebalance([{ id: 1, status: 'ok', weight: 100, quota_total: 100 * G, quota_used: 80 * G }, { id: 2, status: 'ok', weight: 100, quota_total: 100 * G, quota_used: 20 * G }], [{ drive_id: 1, file_id: 'a', sha256: 'x', size: 25 * G, name: 'a' }, { drive_id: 1, file_id: 'b', sha256: 'y', size: 10 * G, name: 'b' }, { drive_id: 2, file_id: 'c', sha256: 'y', size: 10 * G, name: 'c' }]);
    ok(pl.plan.length === 1 && pl.plan[0].file_id === 'a' && pl.plan[0].to === 2 && pl.after[1] === 0.55, 'planRebalance: chuyển file lớn từ Drive 80 % sang 20 %, không chép bản đã có ở đích'); }
  const filesBefore = A3.files.size;
  r = await call(ADM, { op: 'rebalance' }); ok(r.s === 200 && r.j.dry_run && Array.isArray(r.j.plan) && A3.files.size === filesBefore, 'rebalance mặc định dry-run (không đổi gì)');

  // --- cảnh báo: ngưỡng 80/90 %, chống spam thư, khôi phục
  const rowOf = id => sql.prepare('SELECT * FROM drives WHERE id = ?').get(id);
  A1.usage = 85 * G; r = await call(ADM, { op: 'health' }); ok(r.j.alerts.some(a => a.kind === 'quota:' + D1 && a.level === 'warn'), '80 % → cảnh báo');
  ok(rowOf(D1).weight === 100, '80 % chưa ngừng nhận file');
  A1.usage = 92 * G; r = await call(ADM, { op: 'health' }); ok(r.j.alerts.some(a => a.kind === 'quota:' + D1 && a.level === 'crit') && rowOf(D1).weight === 0 && rowOf(D1).auto_weight === 100, '90 % → nghiêm trọng + tự weight 0');
  ok(mod.pickDrive(sql.prepare('SELECT * FROM drives').all(), 1).id === D3, 'Drive đầy tự bị loại → file mới sang Drive khác');
  const nMail = mails.length; await call(ADM, { op: 'health' }); await call(ADM, { op: 'health' });
  ok(mails.length === nMail, 'chống spam: không gửi lại cùng loại trong 24 h');
  ok(mails.filter(m => /92%/.test(m.text)).length === 1, 'đúng 1 thư cho "đầy 90 %"');
  A1.usage = 50 * G; r = await call(ADM, { op: 'health' }); ok(!r.j.alerts.some(a => a.kind === 'quota:' + D1) && rowOf(D1).weight === 100 && rowOf(D1).auto_weight == null, 'xuống < 90 % → tự nhận file lại (trả trọng số cũ)');
  ok(mails.some(m => /khôi phục/.test(m.subject) && /quota/.test(m.subject)), 'thư "đã khôi phục" khi hết lỗi');
  // lỗi mạng: thử lại, 3 lần liên tiếp mới là lỗi
  mod._tokenCache.clear(); ACC['1//R_three'].down = 2; r = await call(ADM, { op: 'health' }); ok(r.j.drives.find(x => x.id === D3).ok && !r.j.alerts.some(a => a.kind === 'net:' + D3), 'lỗi mạng 2 lần rồi thông → không báo');
  mod._tokenCache.clear(); ACC['1//R_three'].down = 3; r = await call(ADM, { op: 'health' }); ok(r.j.alerts.some(a => a.kind === 'net:' + D3 && a.level === 'crit') && rowOf(D3).status === 'ok', '3 lần liên tiếp → nghiêm trọng (vẫn giữ kết nối)');
  // alerts op (banner) + list kèm alerts
  r = await call(ADM, { op: 'alerts' }); ok(r.s === 200 && r.j.alerts.some(a => a.level === 'crit') && r.j.alerts.every(a => a.t), 'op alerts cho banner'); leak2(r.text, 'alerts');
  ok((await call(USER, { op: 'alerts' })).s === 403, 'người thường không xem cảnh báo');
  // kết nối lại: giữ id cũ, chỉ đúng tài khoản
  r = await call(ADM, { op: 'connect', reconnect_id: D2 }); const st2 = new URL(r.j.url).searchParams.get('state'), ck2 = (r.cookie.match(/lk_drv=([^;]+)/) || [])[1];
  ok(new URL(r.j.url).searchParams.get('login_hint') === A2.email, 'Kết nối lại: gợi ý đúng tài khoản');
  aboutEmail = 'someone.else@gmail.com';
  const g0 = globalThis.fetch; globalThis.fetch = async (url, init = {}) => { url = String(url); const b2 = init.body instanceof URLSearchParams ? Object.fromEntries(init.body) : {}; if (url === 'https://oauth2.googleapis.com/token' && b2.grant_type === 'authorization_code') { ACC['1//R_two'].revoked = false; return new Response(JSON.stringify({ access_token: A2.access, refresh_token: '1//R_two', expires_in: 3599, scope: 'openid https://www.googleapis.com/auth/drive.file' }), { status: 200 }); } return g0(url, init); };
  A2.email = 'wrong@gmail.com'; res = await mod.handleCallback(new Request(`https://lexkite.com/api/drive/callback?code=GOOD&state=${encodeURIComponent(st2)}`, { headers: { Cookie: 'lk_drv=' + ck2 } }), ENV2);
  ok(/drive=wrong-account/.test(res.headers.get('Location')), 'kết nối lại bằng tài khoản khác → từ chối');
  A2.email = 'beta.drive@gmail.com';
  r = await call(ADM, { op: 'connect', reconnect_id: D2 }); const st3 = new URL(r.j.url).searchParams.get('state'), ck3 = (r.cookie.match(/lk_drv=([^;]+)/) || [])[1];
  const nm2 = mails.length; res = await mod.handleCallback(new Request(`https://lexkite.com/api/drive/callback?code=GOOD&state=${encodeURIComponent(st3)}`, { headers: { Cookie: 'lk_drv=' + ck3 } }), ENV2);
  ok(/drive=reconnected/.test(res.headers.get('Location')) && rowOf(D2).status === 'ok' && sql.prepare('SELECT COUNT(*) AS n FROM drives').get().n === 3, 'kết nối lại → giữ id cũ (không tạo Drive mới)');
  ok(sql.prepare('SELECT COUNT(*) AS n FROM drive_files WHERE drive_id = ?').get(D2).n >= 1 && mails.slice(nm2).some(m => /khôi phục/.test(m.subject) && /conn/.test(m.subject)), 'lịch sử file giữ nguyên + thư khôi phục kết nối');
  globalThis.fetch = g0;
  // pure: evalAlerts pool < 10 GB
  ok(mod.evalAlerts([{ id: 1, email: 'a@b.c', status: 'ok', quota_total: 15 * G, quota_used: 6 * G }]).some(a => a.kind === 'pool' && a.level === 'warn'), 'pool còn < 10 GB → cảnh báo');
  ok(!mod.evalAlerts([{ id: 1, email: 'a@b.c', status: 'ok', quota_total: null, quota_used: 6 * G }]).some(a => a.kind === 'pool'), 'Drive không giới hạn → không cảnh báo pool');
  leak2(JSON.stringify(sql.prepare('SELECT * FROM drive_audit').all()) + JSON.stringify(mails), 'audit + thư');
  globalThis.__ENV2 = ENV2;
}
// 12) library.mjs: che email, locations.drive dạng mảng (đọc được dạng cũ), tham chiếu manifest cho dọn dẹp
{
  const L = await import(new URL('../video/library.mjs', import.meta.url));
  ok(['alpha.drive@gmail.com', 'ab@x.com', 'q@z.io'].every(e => L.maskEmail(e) === mod.maskEmail(e)), 'maskEmail CLI = máy chủ');
  ok(L.driveCopies({ status: 'ok', driveId: 1, fileId: 'F1' }).length === 1 && L.driveCopies({ status: 'pending' }).length === 0 && L.driveCopies([{ driveId: 1, fileId: 'a' }, { driveId: 2, fileId: 'b' }]).length === 2, 'driveCopies: mảng mới + đối tượng cũ');
  ok(L.driveWant({ status: 'approved' }) === 2 && L.driveWant({ status: 'reserve' }) === 2 && L.driveWant({ status: 'reject' }) === 1, 'số bản sao: approved/reserve 2, reject 1');
  const rf = L.driveRefs({ items: [{ sha256: 'a'.repeat(64), status: 'approved', locations: { drive: [{ driveId: 1, fileId: 'FILEaaaaaaaaaa' }] }, variants: { stacked: { sha256: 'b'.repeat(64), drive: [{ driveId: 2, fileId: 'FILEbbbbbbbbbb' }] } } }] }, { clips: [{ file: 'clips/mia.mp4', drive: [{ driveId: 2, fileId: 'FILEbbbbbbbbbb' }] }] });
  ok(rf.library.some(x => x.f === 'FILEaaaaaaaaaa') && rf.library.some(x => x.f === 'FILEbbbbbbbbbb') && rf.manifest.some(x => x.n === 'mia.mp4') && rf.manifest.some(x => x.f === 'FILEbbbbbbbbbb'), 'driveRefs: library.json + manifest dựng (file_id, sha, tên)');
}
function CATS_SUM(g) { return Object.values(g).flat().reduce((s, x) => s + x.size, 0); }

// Kho footage (docs/VIDEO.md): CLI chỉ ĐỌC (render_link) file footage/ cls original; shorts vẫn riêng; không lẫn nhau
ok(mod.isFootageRow({ cls: 'original', folder: 'footage/cafe' }), 'footage/cafe original → isFootageRow');
ok(!mod.isFootageRow({ cls: 'render', folder: 'footage/cafe' }) && !mod.isFootageRow({ cls: 'original', folder: 'shorts/news' }) && !mod.isFootageRow({ cls: 'original', folder: 'originals/x' }), 'footage: chỉ cls original + folder footage/');
ok(!mod.isShortsRow({ cls: 'original', folder: 'footage/cafe' }), 'footage không bị coi là short (retire/set_want không chạm)');

// Dự báo dung lượng + cảnh báo ngoài (22/10): forecastPool, poolpct, EXT_KINDS không bị health xoá
{ const G = 1073741824, f = mod.forecastPool([{ day: '2026-10-01', used: 10 * G }, { day: '2026-10-11', used: 20 * G }], 30 * G);
  ok(f && f.gb_month === 30 && f.days_left === 30, 'forecastPool: +1 GB/ngày → 30 GB/tháng, còn 30 ngày');
  ok(mod.forecastPool([{ day: '2026-10-01', used: 5 }], 1) === null && mod.forecastPool([{ day: '2026-10-01', used: 9 }, { day: '2026-10-05', used: 9 }], 1).days_left === null, 'forecastPool: thiếu dữ liệu → null; không tăng → days_left null');
  const rows = [{ id: 1, email: 'a@x', status: 'ok', weight: 100, quota_total: 100 * G, quota_used: 85 * G }];
  ok(mod.evalAlerts(rows, {}).some(a => a.kind === 'poolpct'), 'pool ≥ 80% → cảnh báo poolpct');
  ok(mod.EXT_KINDS.has('footage') && mod.EXT_KINDS.has('gitsize'), 'EXT_KINDS: footage + gitsize'); }

if (fails) { console.log(`✗ drive: ${fails}/${n} kiểm thất bại`); process.exit(1); }
console.log(`✓ drive: ${n} kiểm (state/CSRF, AES-GCM, không lộ token, chọn Drive theo tỉ lệ, bản sao, cổng admin, CLI HMAC, link tải, trình duyệt file, dọn dẹp, sổ kho, cảnh báo)`);
