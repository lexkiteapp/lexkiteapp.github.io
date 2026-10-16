// Test proxy GrabCast (functions/api/social.js): chỉ quản trị viên, danh sách đường dẫn cho phép, khóa không bao giờ lộ, thiếu cấu hình → not-configured.
// Chạy: node scripts/test/social-proxy.mjs  (không cần mạng – fetch & env đều giả lập)
import { webcrypto } from 'node:crypto';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };

const mod = await import(new URL('../../functions/api/social.js', import.meta.url));
const KEY = 'gk_live_SECRET_9f8e7d6c5b4a', WS = 'ws_lexkite';
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (email, extra = {}) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true, ...extra })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };

// fetch giả: JWKS của Google + máy chủ GrabCast (ghi lại mọi lượt gọi để kiểm header)
let calls = [], reply = () => ({ status: 200, body: { items: [{ id: 'acc1', platform: 'youtube' }] } });
globalThis.fetch = async (url, init = {}) => {
  url = String(url);
  if (url.includes('googleapis.com')) return { ok: true, json: async () => ({ keys: [jwk] }) };
  calls.push({ url, init });
  const r = await reply(url, init); if (r.throw) throw new Error(r.throw);
  return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status });
};
const ENV = { ADMIN_EMAILS: 'boss@lexkite.com', GRABCAST_API_KEY: KEY, GRABCAST_WORKSPACE: WS };
const call = async (tk, body, env = ENV, origin = 'https://lexkite.com') => {
  const r = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/social', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ } return { s: r.status, j, text, h: r.headers };
};
const ADM = await tok('boss@lexkite.com'), USER = await tok('someone@gmail.com');

// 1) Chặn người không phải quản trị
ok((await call('x.y.z', { method: 'GET', path: 'accounts' })).s === 403, 'token giả → 403');
ok((await call(USER, { method: 'GET', path: 'accounts' })).s === 403, 'người dùng thường → 403');
ok((await call(await tok('boss@lexkite.com', { email_verified: false }), { method: 'GET', path: 'accounts' })).s === 403, 'email chưa xác minh → 403');
ok((await call(ADM, { method: 'GET', path: 'accounts' }, ENV, 'https://evil.example')).s === 403, 'Origin lạ → 403');
ok(calls.length === 0, 'bị chặn → không gọi GrabCast');
const nonAdmCfg = await call(USER, { method: 'GET', path: 'accounts' }, { ADMIN_EMAILS: 'boss@lexkite.com' });
ok(nonAdmCfg.s === 403 && nonAdmCfg.j.error === 'forbidden', 'người lạ không biết trạng thái cấu hình');

// 2) Thiếu cấu hình
for (const env of [{ ADMIN_EMAILS: 'boss@lexkite.com' }, { ...ENV, GRABCAST_API_KEY: '' }]) {
  const r = await call(ADM, { method: 'GET', path: 'accounts' }, env); ok(r.s === 503 && r.j.error === 'not-configured', 'thiếu env → not-configured ' + JSON.stringify(Object.keys(env)));
}
ok(calls.length === 0, 'chưa cấu hình → không gọi GrabCast');

// 3) Whitelist
const ALLOW = [['GET', 'accounts'], ['GET', 'posts'], ['GET', 'posts/p_123'], ['GET', 'media/m_1'], ['POST', 'media/upload-url'], ['POST', 'media/m_1/complete'], ['POST', 'posts/validate'], ['POST', 'posts'], ['PATCH', 'posts/p_1'],
  ['POST', 'posts/p_1/schedule'], ['POST', 'posts/p_1/unschedule'], ['POST', 'posts/p_1/publish-now'], ['POST', 'posts/p_1/retry'], ['POST', 'posts/p_1/cancel'], ['POST', 'storage/objects/o_1/use'],
  ['GET', 'storage/stores'], ['GET', 'storage/objects'], ['POST', 'storage/objects'], ['POST', 'validate'], ['GET', 'posts/p_1/insights'], ['GET', 'tiktok/creator-info/12'], ['POST', 'storage/objects/o_1/complete'], ['POST', 'storage/objects/o_1/abort'], ['GET', '/api/social/accounts']];
for (const [m, p] of ALLOW) { const r = await call(ADM, { method: m, path: p }); ok(r.s === 200, `cho phép ${m} ${p} (nhận ${r.s})`); }
const DENY = [['DELETE', 'posts/p_1'], ['DELETE', 'accounts/a_1'], ['POST', 'accounts'], ['POST', 'accounts/a_1/disconnect'], ['POST', 'accounts/connect'], ['GET', 'posts/../../admin'], ['GET', 'posts/a/b'], ['GET', 'posts/..'], ['GET', 'media/.'], ['POST', 'storage/objects/../use'],
  ['PUT', 'posts/p_1'], ['GET', 'storage/stores/s_1/disconnect'], ['POST', 'storage/stores'], ['DELETE', 'storage/objects/o_1'], ['GET', 'https://evil.example/x'], ['GET', ''], ['POST', 'posts/p_1/delete'], ['PATCH', 'posts'], ['POST', 'posts/p_1/insights'], ['GET', 'tiktok/creator-info/../x'], ['POST', 'validate/x']];
const before = calls.length;
for (const [m, p] of DENY) { const r = await call(ADM, { method: m, path: p }); ok(r.s === 400 && r.j.error === 'route', `chặn ${m} ${p} (nhận ${r.s})`); }
ok(calls.length === before, 'đường dẫn bị chặn → không gọi GrabCast');

// 4) Header & URL gửi đi
calls = [];
await call(ADM, { method: 'POST', path: 'posts', body: { caption: 'hi', media_ids: ['m1'], targets: [] }, idem: 'abc12345-xyz' });
let c = calls[0];
ok(c && c.url === 'https://grabcast-api-342720596878.us-central1.run.app/api/social/posts', 'URL mặc định Cloud Run ' + (c && c.url));
ok(c && c.init.headers['X-API-Key'] === KEY && c.init.headers['X-Workspace'] === WS, 'gắn X-API-Key + X-Workspace ở máy chủ');
ok(c && c.init.headers['Idempotency-Key'] === 'abc12345-xyz', 'chuyển Idempotency-Key');
ok(c && c.init.signal instanceof AbortSignal, 'có tín hiệu hủy (timeout 15 s)');
calls = []; await call(ADM, { method: 'GET', path: 'posts', query: { status: 'scheduled', 'bad key': 'x', limit: 20 } }, { ...ENV, GRABCAST_API_BASE: 'https://api.test.example/' });
ok(calls[0] && calls[0].url === 'https://api.test.example/api/social/posts?status=scheduled&limit=20', 'GRABCAST_API_BASE + lọc tham số query ' + (calls[0] && calls[0].url));
calls = []; await call(ADM, { method: 'POST', path: 'posts', idem: 'bad key!' }); ok(!calls[0].init.headers['Idempotency-Key'], 'Idempotency-Key sai định dạng → bỏ');

// 5) Không lộ khóa
reply = () => ({ status: 401, body: { error: 'invalid key ' + KEY, echo: { 'X-API-Key': KEY } } });
let r = await call(ADM, { method: 'GET', path: 'accounts' }); ok(r.s === 401 && !r.text.includes(KEY), 'lỗi GrabCast có khóa → đã che');
reply = () => ({ status: 500, body: '<html>boom ' + KEY + '</html>' });
r = await call(ADM, { method: 'GET', path: 'accounts' }); ok(r.s === 500 && r.j.error === 'upstream' && !r.text.includes(KEY), 'lỗi dạng HTML → upstream, không lộ khóa');
reply = () => ({ throw: 'connect failed X-API-Key=' + KEY });
r = await call(ADM, { method: 'GET', path: 'accounts' }); ok(r.s === 504 && r.j.error === 'upstream' && !r.text.includes(KEY), 'lỗi mạng → upstream, không lộ khóa');
reply = (u, init) => new Promise((_, rej) => init.signal.addEventListener('abort', () => rej(new Error('aborted'))));
{ const st = globalThis.setTimeout; globalThis.setTimeout = (f) => st(f, 5); r = await call(ADM, { method: 'GET', path: 'accounts' }); globalThis.setTimeout = st; }
ok(r.s === 504 && r.j.error === 'timeout', 'quá thời gian → timeout');
reply = () => ({ status: 200, body: { items: [] } });
r = await call(ADM, { method: 'GET', path: 'storage/stores' }); ok(r.s === 200 && !r.text.includes(KEY) && !r.text.includes(WS + '"'), 'phản hồi thường không chứa khóa');
calls = []; await call(ADM, { method: 'GET', path: 'accounts' }, { ...ENV, GRABCAST_WORKSPACE: '' }); ok(calls[0] && calls[0].init.headers['X-Workspace'] === '4', 'thiếu GRABCAST_WORKSPACE → mặc định workspace 4');
reply = () => ({ status: 401, body: { error: 'api_key_invalid' } });
r = await call(ADM, { method: 'GET', path: 'accounts' }); ok(r.s === 401 && r.j.error === 'api_key_invalid', 'giữ nguyên mã lỗi api_key_invalid cho UI');
const nc = await call(ADM, { method: 'GET', path: 'accounts' }, { ...ENV, GRABCAST_API_KEY: '' }); ok(!nc.text.includes(KEY), 'not-configured không chứa khóa');

// 6) CORS chỉ cho trang của mình
ok((await call(ADM, { method: 'GET', path: 'accounts' })).h.get('Access-Control-Allow-Origin') === 'https://lexkite.com', 'CORS cho lexkite.com');

if (fails) { console.error(`✗ social-proxy: ${fails} lỗi`); process.exit(1); }
console.log('✓ social-proxy: quản trị, whitelist, không lộ khóa, not-configured, timeout đều đạt');
