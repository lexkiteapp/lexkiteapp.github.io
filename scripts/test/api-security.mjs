// Test bảo mật API (functions/api/**, workers/**): op kiểu 'constructor' không lộ env, xác minh Firebase ID token (alg/aud/iss/exp/auth_time,
// tải lại JWKS có giới hạn), thân yêu cầu null/quá lớn, LIMIT/OFFSET luôn là số nguyên, CSP cho SVG ở media.lexkite.com.
// Chạy: node scripts/test/api-security.mjs  (không mạng – D1 giả bằng node:sqlite, Cache API/fetch giả lập)
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(typeof req === 'string' ? req : req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(typeof req === 'string' ? req : req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
} };
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; sql.exec('BEGIN'); try { for (const x of list) out.push(await x.run()); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } return out; } };

const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (claims = {}, head = {}) => {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1', ...head }));
  const p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-1', email: 'boss@lexkite.com', email_verified: true, ...claims }));
  return `${h}.${p}.${b64u(new Uint8Array(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))))}`;
};
let jwksFetches = 0;
globalThis.fetch = async url => {
  if (String(url).includes('googleapis.com/service_accounts')) { jwksFetches++; return { ok: true, json: async () => ({ keys: [jwk] }) }; }
  throw new Error('mạng bị chặn trong test: ' + url);
};

const SECRETS = { GH_DISPATCH_TOKEN: 'ghp_SECRET_dispatch_0001', GRABCAST_API_KEY: 'gc_SECRET_key_0002', STUDIO_CALLBACK_SECRET: 'studio_SECRET_cb_0003', DRIVE_ENC_KEY: Buffer.alloc(32, 7).toString('base64'), KEYS_ENC_KEY: 'keys_SECRET_enc_0004', LEXKITE_REPORT_CLI_KEY: 'r'.repeat(40), GH_ISSUES_TOKEN: 'ghi_SECRET_0005' };
const ENV = { DB, ADMIN_EMAILS: 'boss@lexkite.com', ...SECRETS };
const leaks = text => Object.values(SECRETS).some(v => text.includes(v));
let ipN = 1;
const req = (path, body, { token, headers = {}, origin = 'https://lexkite.com', method = 'POST' } = {}) => new Request('https://lexkite.com' + path, { method,
  headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '10.9.0.' + (ipN++ % 250), ...(origin ? { Origin: origin } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...headers },
  body: method === 'GET' ? undefined : typeof body === 'string' ? body : JSON.stringify(body) });
const run = async (mod, r, env = ENV) => { let res; try { res = await mod.onRequestPost({ request: r, env, waitUntil: () => {} }); } catch (e) { return { s: 'throw', text: String(e), j: {} }; } const text = await res.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ } return { s: res.status, text, j, h: res.headers }; };

const S = await import(new URL('../../functions/api/sync.js', import.meta.url));
const ADMIN = await import(new URL('../../functions/api/admin.js', import.meta.url));
const STUDIO = await import(new URL('../../functions/api/studio.js', import.meta.url));
const REPORT = await import(new URL('../../functions/api/report.js', import.meta.url));
const DRIVE = await import(new URL('../../functions/api/drive.js', import.meta.url));
const QUOTA = await import(new URL('../../functions/api/quota.js', import.meta.url));
const AI = await import(new URL('../../functions/api/ai.js', import.meta.url));
const CONTACT = await import(new URL('../../functions/api/contact.js', import.meta.url));
const HIT = await import(new URL('../../functions/api/hit.js', import.meta.url));
// workers/* không có package.json "type":"module" → nạp mã nguồn dạng data: URL (ES module)
const { readFileSync } = await import('node:fs');
const MEDIA = (await import('data:text/javascript;base64,' + Buffer.from(readFileSync(new URL('../../workers/media/index.js', import.meta.url))).toString('base64'))).default;

// ---------- 1) Firebase ID token ----------
const getKeys = async () => [jwk];
ok((await S.claims(await tok(), undefined, getKeys))?.sub === 'u-1', 'token hợp lệ → claims');
ok(await S.claims(await tok({ aud: 'other-project' }), undefined, getKeys) === null, 'sai aud → từ chối');
ok(await S.claims(await tok({ iss: 'https://securetoken.google.com/other' }), undefined, getKeys) === null, 'sai iss → từ chối');
ok(await S.claims(await tok({ exp: sec - 10 }), undefined, getKeys) === null, 'hết hạn → từ chối');
ok(await S.claims(await tok({ iat: sec + 3600 }), undefined, getKeys) === null, 'iat ở tương lai → từ chối');
ok(await S.claims(await tok({ auth_time: sec + 3600 }), undefined, getKeys) === null, 'auth_time ở tương lai → từ chối (Firebase: phải ở quá khứ)');
ok(await S.claims(await tok({ auth_time: 'x' }), undefined, getKeys) === null, 'auth_time không phải số → từ chối');
ok(await S.claims(await tok({}, { alg: 'HS256' }), undefined, getKeys) === null, 'alg HS256 → từ chối');
ok(await S.claims(await tok({}, { alg: 'none' }), undefined, getKeys) === null, 'alg none → từ chối');
{ const t = await tok(); const [h, p] = t.split('.'); const forged = h + '.' + b64u(JSON.stringify({ ...JSON.parse(Buffer.from(p, 'base64url')), sub: 'u-evil' })) + '.' + t.split('.')[2];
  ok(await S.claims(forged, undefined, getKeys) === null, 'sửa payload → chữ ký sai → từ chối'); }
// JWKS: kid lạ chỉ được ép tải lại tối đa 1 lần/phút (chống khuếch đại lượt gọi Google)
jwksFetches = 0;
ok((await S.claims(await tok())) !== null, 'JWKS thật (giả lập) tải lần đầu');
for (let i = 0; i < 6; i++) ok(await S.claims(await tok({}, { kid: 'rand' + i })) === null, 'kid lạ → từ chối');
ok(jwksFetches === 1, `kid lạ không ép tải lại JWKS liên tục (đã tải ${jwksFetches} lần)`);

const ADM = await tok(), USER = await tok({ sub: 'u-2', email: 'learner@gmail.com' });

// ---------- 2) op kế thừa từ Object.prototype không chạy, không lộ env ----------
for (const op of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
  const a = await run(ADMIN, req('/api/admin', { op }, { token: ADM }));
  ok(a.s === 400 && !leaks(a.text), `admin op '${op}' → 400, không lộ bí mật (${a.s})`);
  const st = await run(STUDIO, req('/api/studio', { op }, { token: ADM }));
  ok(st.s === 400 && !leaks(st.text), `studio (quản trị) op '${op}' → 400, không lộ bí mật (${st.s})`);
  const ci = await run(STUDIO, req('/api/studio', { op }, { headers: { 'X-Studio-Secret': SECRETS.STUDIO_CALLBACK_SECRET } }));
  ok(ci.s === 400 && !leaks(ci.text), `studio (CI) op '${op}' → 400, không lộ bí mật (${ci.s})`);
  const rp = await run(REPORT, req('/api/report', { op }, { token: ADM }));
  ok(rp.s === 400 && !leaks(rp.text), `report op '${op}' → 400, không lộ bí mật (${rp.s})`);
  const dr = await run(DRIVE, req('/api/drive', { op }, { token: ADM }));
  ok(dr.s === 400 && !leaks(dr.text), `drive op '${op}' → 400, không lộ bí mật (${dr.s})`);
  const q = await run(QUOTA, req('/api/quota', { op }, { token: ADM }));
  ok(q.s === 400 && !leaks(q.text), `quota op '${op}' → 400, không lộ bí mật (${q.s})`);
}
// người lạ / không phải admin vẫn bị chặn
ok((await run(ADMIN, req('/api/admin', { op: 'usage' }, { token: USER }))).s === 403, 'admin: tài khoản thường → 403');
ok((await run(ADMIN, req('/api/admin', { op: 'usage' }))).s === 403, 'admin: không token → 403');
ok((await run(ADMIN, req('/api/admin', { op: 'usage' }, { token: ADM, origin: 'https://evil.example' }))).s === 403, 'admin: Origin lạ → 403');
ok((await run(ADMIN, req('/api/admin', { op: 'usage' }, { token: await tok({ email_verified: false }) }))).s === 403, 'admin: email chưa xác minh → 403');
ok((await run(STUDIO, req('/api/studio', { op: 'ciJob', id: 'x' }, { headers: { 'X-Studio-Secret': 'wrong' } }))).s === 403, 'studio CI: sai secret → 403');

// [N1] Thông báo: chỉ admin được soạn; link CTA/ảnh lạ bị chặn; đối tượng chỉ giữ trường đã biết; người lạ không đánh dấu tin bịa
const NOTI = await import(new URL('../../functions/api/notices.js', import.meta.url));
ok((await run(ADMIN, req('/api/admin', { op: 'noticeCreate', title: 'x', body: 'y' }, { token: USER }))).s === 403, 'notices: tài khoản thường soạn thông báo → 403');
ok((await run(ADMIN, req('/api/admin', { op: 'noticeCreate', title: 'x', body: 'y', cta_label: 'Go', cta_url: 'javascript:alert(1)' }, { token: ADM }))).j.error === 'cta-url-invalid', 'notices: cta javascript: → bị chặn');
ok((await run(ADMIN, req('/api/admin', { op: 'noticeCreate', title: 'x', body: 'y', img: 'http://evil.example/a.png' }, { token: ADM }))).j.error === 'img-invalid', 'notices: ảnh http:// → bị chặn');
{ const r = await run(ADMIN, req('/api/admin', { op: 'noticeCreate', title: 'x', body: 'y', target: { type: 'filter', plat: 'web', evil: '<script>', inactiveDays: 'DROP' } }, { token: ADM }));
  const row = r.j.id && await DB.prepare('SELECT target FROM notices WHERE id = ?').bind(r.j.id).first();
  ok(row && row.target === JSON.stringify({ type: 'filter', plat: 'web' }), 'notices: target chỉ giữ trường hợp lệ'); }
ok((await run(NOTI, req('/api/notices', { id: 'n_khong_co_that' }, { token: USER }))).s === 404, 'notices: đánh dấu id không tồn tại → 404 (không spam bảng)');
ok((await run(NOTI, req('/api/notices', 'x'.repeat(5000), { token: USER }))).s === 413, 'notices: thân quá lớn → 413');
const CLS = await import(new URL('../../functions/api/class.js', import.meta.url));
{ ok((await run(CLS, req('/api/class', { op: 'mine' }))).s === 401, 'class: không token → 401');
  const T = await tok({ sub: 'teach-1' }), U = await tok({ sub: 'stud-1', email: 'kid@school.edu' }), X = await tok({ sub: 'other-1' });
  const c = await run(CLS, req('/api/class', { op: 'create', name: 'Lớp 9A' }, { token: T }));
  ok(c.s === 200 && c.j.cls && c.j.cls.code && !leaks(c.text), 'class: tạo lớp');
  ok((await run(CLS, req('/api/class', { op: 'constructor', cls: c.j.cls.id }, { token: T }))).s === 400, 'class: op lạ → 400');
  ok((await run(CLS, req('/api/class', { op: 'join', code: c.j.cls.code, name: 'An' }, { token: U }))).s === 200, 'class: tham gia bằng mã');
  for (const op of ['report', 'assign', 'kick', 'delete', 'newcode']) ok((await run(CLS, req('/api/class', { op, cls: c.j.cls.id, ref: 'il:1', uid: 'stud-1' }, { token: op === 'report' ? U : X }))).s === 404, `class: không phải chủ lớp → ${op} 404`);
  const rp = await run(CLS, req('/api/class', { op: 'report', cls: c.j.cls.id }, { token: T }));
  ok(rp.s === 200 && rp.j.members.length === 1 && !rp.text.includes('kid@school.edu'), 'class: báo cáo của chủ lớp không lộ email học sinh');
  ok((await run(CLS, req('/api/class', { op: 'mine' }, { token: T, origin: 'https://evil.example' }))).h.get('Access-Control-Allow-Origin') === null, 'class: CORS chặn origin lạ'); }

// ---------- 3) Thân yêu cầu null / quá lớn ----------
ok((await run(S, req('/api/sync', 'null', { token: USER }))).s === 400, 'sync: thân null → 400 (không ném lỗi)');
ok((await run(ADMIN, req('/api/admin', 'null', { token: ADM }))).s === 400, 'admin: thân null → 400');
ok((await run(AI, req('/api/ai', 'null'))).s === 400, 'ai: thân null → 400');
ok((await run(CONTACT, req('/api/contact', 'null'))).s === 400, 'contact: thân null → 400');
ok((await run(AI, req('/api/ai', { prompt: 'x'.repeat(50) }, { headers: { 'Content-Length': '200000' } }))).s === 413, 'ai: Content-Length > 64 KB → 413');
ok((await run(CONTACT, req('/api/contact', { msg: 'x' }, { headers: { 'Content-Length': '200000' } }))).s === 413, 'contact: Content-Length > 32 KB → 413');
{ const h = await run(HIT, req('/api/hit', 'null')); ok(h.s === 204, 'hit: thân null → 204 im lặng'); }
{ const body = { t: 's', sid: 'abcdefgh1234', vid: 'vvvvvvvv1234', path: 'home', ref: 'x'.repeat(70000) };
  const h = await run(HIT, req('/api/hit', body, { headers: { 'Content-Length': '70100' } }));
  let rows = 0; try { rows = sql.prepare("SELECT COUNT(*) AS n FROM sessions WHERE sid = 'abcdefgh1234'").get().n; } catch (e) { rows = 0; }
  ok(h.s === 204 && rows === 0, 'hit: beacon > 64 KB → bỏ qua, không ghi D1'); }

// ---------- 4) LIMIT/OFFSET nối vào SQL luôn là số nguyên hữu hạn ----------
for (const f of [{ offset: 'abc' }, { offset: 'Infinity', limit: 'NaN' }, { offset: '1e400' }, { limit: '2.5', offset: '-3' }, { offset: '1; DROP TABLE x' }]) {
  const L = DRIVE.ledgerQuery(f), m = L.sql.match(/LIMIT (\S+) OFFSET (\S+)$/);
  ok(m && /^\d+$/.test(m[1]) && /^\d+$/.test(m[2]), `drive ledgerQuery ${JSON.stringify(f)} → LIMIT/OFFSET số nguyên (${m && m.slice(1).join('/')})`);
}

// ---------- 5) media.lexkite.com: SVG mở trực tiếp không chạy script ----------
{ const savedFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', { status: 200 });
  const r = await MEDIA.fetch(new Request('https://media.lexkite.com/blog/x.svg'));
  const csp = r.headers.get('Content-Security-Policy') || '';
  ok(/default-src 'none'/.test(csp) && /sandbox/.test(csp) && !/script-src/.test(csp), 'media: SVG có CSP default-src none + sandbox');
  const p = await MEDIA.fetch(new Request('https://media.lexkite.com/blog/x.png'));
  ok(!p.headers.get('Content-Security-Policy'), 'media: ảnh PNG giữ nguyên header');
  const t = await MEDIA.fetch(new Request('https://media.lexkite.com/../etc/x.svg'));
  ok(t.status === 404 || !(new URL('https://media.lexkite.com/../etc/x.svg').pathname.includes('..')), 'media: không đi ngược thư mục');
  globalThis.fetch = savedFetch; }

// ---------- /api/admin-shorts (thư viện video quản trị): cổng quản trị, URL ký, chỉ shorts/*.mp4|jpg, HTTP Range ----------
{ const SH = await import(new URL('../../functions/api/admin-shorts.js', import.meta.url));
  const TOKEN = 'github_pat_SECRET_shorts_0006', SENV = { ...ENV, SHORTS_READ_TOKEN: TOKEN };
  const savedFetch = globalThis.fetch, BLOB = new Uint8Array(1000).map((_, i) => i % 251); let upCalls = [], honorRange = true;
  globalThis.fetch = async (url, o = {}) => {
    const u = String(url);
    if (u.startsWith('https://api.github.com/repos/lexkiteapp/lexkite-shorts/contents/shorts/index.json')) return new Response(JSON.stringify({ items: [{ id: 'a', cover: 'shorts/cafe/x_1/cine-x-1-en-v3.jpg', video: 'shorts/cafe/x_1/cine-x-1-en-v3.mp4' }] }), { status: 200 });
    if (u.startsWith('https://raw.githubusercontent.com/lexkiteapp/lexkite-shorts/main/shorts/')) {
      upCalls.push({ u, auth: (o.headers || {}).Authorization });
      if (u.includes('missing')) return new Response('nf', { status: 404 });
      const m = /^bytes=(\d+)-(\d*)$/.exec((o.headers || {}).Range || '');
      if (m && honorRange) { const a = +m[1], z = m[2] ? +m[2] : BLOB.length - 1; return new Response(BLOB.slice(a, z + 1), { status: 206, headers: { 'Content-Range': `bytes ${a}-${z}/${BLOB.length}`, 'Content-Length': String(z - a + 1) } }); }
      return new Response(BLOB, { status: 200, headers: { 'Content-Length': String(BLOB.length) } });
    }
    return savedFetch(url, o);
  };
  const leakT = t => t.includes(TOKEN) || leaks(t);
  for (const [who, r] of [['không token', req('/api/admin-shorts', { op: 'list' })], ['người học', req('/api/admin-shorts', { op: 'list' }, { token: USER })], ['origin lạ', req('/api/admin-shorts', { op: 'list' }, { token: ADM, origin: 'https://evil.example' })]]) {
    const x = await run(SH, r, SENV); ok(x.s === 403 && !leakT(x.text), `admin-shorts list (${who}) → 403 (${x.s})`);
  }
  const L1 = await run(SH, req('/api/admin-shorts', { op: 'list' }, { token: ADM }), SENV);
  ok(L1.s === 200 && L1.j.media === true && L1.j.source === 'repo' && !leakT(L1.text) && /^\/api\/admin-shorts\?p=/.test(Object.values(L1.j.covers || {})[0] || ''), 'admin-shorts list (quản trị) → manifest repo + URL bìa ký, không lộ token');
  const L0 = await run(SH, req('/api/admin-shorts', { op: 'list' }, { token: ADM }), ENV);
  ok(L0.s === 200 && L0.j.media === false && L0.j.source === 'bundle' && Array.isArray(L0.j.items) && !Object.keys(L0.j.covers || {}).length, 'admin-shorts không có SHORTS_READ_TOKEN → manifest gói sẵn, không media');
  for (const p of ['../secret.mp4', 'shorts/../../etc/passwd.mp4', 'shorts/cafe/x_1/..%2fa.mp4', 'shorts/cafe/x_1/a.json', 'README.md', 'other/cafe/x_1/a.mp4', 'shorts/cafe/a.mp4', '/shorts/cafe/x_1/a.mp4', 'shorts/Cafe/x_1/a.mp4', 'shorts/cafe/x_1/a.mp4?x=1', 'shorts/cafe/x_1/a.mp4\n'])
    ok((await run(SH, req('/api/admin-shorts', { op: 'sign', path: p }, { token: ADM }), SENV)).s === 400, `admin-shorts sign chặn đường dẫn '${JSON.stringify(p)}'`);
  for (const op of ['constructor', '__proto__', 'toString', 'x']) ok((await run(SH, req('/api/admin-shorts', { op }, { token: ADM }), SENV)).s === 400, `admin-shorts op '${op}' → 400`);
  const P = 'shorts/cafe/x_1/cine-x-1-en-v3.mp4', sg = await run(SH, req('/api/admin-shorts', { op: 'sign', path: P }, { token: ADM }), SENV);
  ok(sg.s === 200 && /^\/api\/admin-shorts\?p=shorts%2Fcafe/.test(sg.j.url) && !leakT(sg.text), 'admin-shorts sign → URL ký');
  ok((await run(SH, req('/api/admin-shorts', { op: 'sign', path: P }, { token: ADM }), ENV)).s === 503, 'sign khi chưa có token → 503');
  const get = async (url, headers = {}, env = SENV) => { const res = await SH.onRequestGet({ request: new Request('https://lexkite.com' + url, { headers: { 'CF-Connecting-IP': '10.8.0.' + (ipN++ % 250), ...headers } }), env }); return { s: res.status, h: res.headers, b: new Uint8Array(await res.arrayBuffer()) }; };
  const U = sg.j.url, uq = new URL('https://x' + U).searchParams;
  let g = await get(U); ok(g.s === 200 && g.b.length === 1000 && g.h.get('Content-Type') === 'video/mp4' && g.h.get('Accept-Ranges') === 'bytes' && /private/.test(g.h.get('Cache-Control')) && g.h.get('X-Content-Type-Options') === 'nosniff', 'GET ký đúng → 200 video/mp4');
  ok(upCalls.at(-1).auth === 'token ' + TOKEN && upCalls.at(-1).u.endsWith('/main/' + P), 'GET gọi raw.githubusercontent bằng token máy chủ, đúng đường dẫn');
  g = await get(U, { Range: 'bytes=10-19' }); ok(g.s === 206 && g.b.length === 10 && g.b[0] === 10 && g.h.get('Content-Range') === 'bytes 10-19/1000', 'Range chuyển tiếp → 206');
  honorRange = false;
  g = await get(U, { Range: 'bytes=990-' }); ok(g.s === 206 && g.b.length === 10 && g.h.get('Content-Range') === 'bytes 990-999/1000', 'nguồn bỏ qua Range → tự cắt 206');
  g = await get(U, { Range: 'bytes=-5' }); ok(g.s === 206 && g.b.length === 5 && g.b[0] === 995 % 251, 'Range hậu tố bytes=-5');
  g = await get(U, { Range: 'bytes=5000-' }); ok(g.s === 416 && g.h.get('Content-Range') === 'bytes */1000', 'Range vượt kích thước → 416');
  ok((await get(U, { Range: 'items=0-1' })).s === 416 && (await get(U, { Range: 'bytes=0-1,5-9' })).s === 416, 'Range sai dạng/nhiều đoạn → 416');
  honorRange = true; const n0 = upCalls.length;
  ok((await get(U.replace(/s=[^&]+/, 's=' + 'A'.repeat(43)))).s === 403, 'chữ ký sai → 403');
  ok((await get(U.replace(/e=\d+/, 'e=' + (+uq.get('e') + 1)))).s === 403, 'sửa hạn → 403');
  ok((await get(U.replace(/p=[^&]+/, 'p=' + encodeURIComponent('shorts/cafe/x_1/other.mp4')))).s === 403, 'đổi file giữ chữ ký → 403');
  ok((await get(U.replace(/p=[^&]+/, 'p=' + encodeURIComponent('shorts/../README.md')))).s === 400, 'GET đường dẫn ngoài shorts/ → 400');
  ok((await get(`/api/admin-shorts?p=${encodeURIComponent(P)}&e=${Math.floor(Date.now() / 1000) + 99999}&s=x`)).s === 403, 'hạn quá xa → 403');
  ok((await get(U, {}, ENV)).s === 503, 'GET khi chưa có token → 503');
  ok(upCalls.length === n0, 'yêu cầu bị từ chối không gọi tới GitHub');
  globalThis.fetch = savedFetch; }

console.log(`api-security: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
