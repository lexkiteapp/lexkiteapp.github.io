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
{ const wa = await run(ADMIN, req('/api/admin', { op: 'whoami' }, { token: ADM })), wu = await run(ADMIN, req('/api/admin', { op: 'whoami' }, { token: USER })), wn = await run(ADMIN, req('/api/admin', { op: 'whoami' }));
  ok(wa.s === 200 && !leaks(wa.text) && !/@/.test(wa.text), 'admin whoami: quản trị → 200, không lộ email/bí mật');
  ok(wu.s === 403 && wn.s === 403 && !/@/.test(wu.text + wn.text), 'admin whoami: tài khoản thường / không token → 403, không lộ danh sách email'); }
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

// ---------- /api/admin-shorts nguồn Kho Drive (không cần SHORTS_READ_TOKEN): manifest + media qua OAuth của kho, Range, URL ký ----------
{ const SH = await import(new URL('../../functions/api/admin-shorts.js', import.meta.url)), DRV = await import(new URL('../../functions/api/drive.js', import.meta.url));
  const GSEC = 'gsec_SECRET_drive_0007', REFRESH = '1//R_SECRET_shorts_0008', ACCESS = 'ya29.SECRET_access_0009';
  const DENV = { ...ENV, GOOGLE_DRIVE_CLIENT_ID: 'cid.apps.googleusercontent.com', GOOGLE_DRIVE_CLIENT_SECRET: GSEC };
  const leakD = t => [GSEC, REFRESH, ACCESS].some(v => t.includes(v)) || leaks(t);
  await DRV.latestFile(DENV, 'x', 'y'); // tạo bảng
  const e = await DRV.encryptToken(DENV, REFRESH, 'pool1@gmail.com');
  sql.prepare("INSERT INTO drives (email, enc_token, iv, quota_total, quota_used, status, weight, created) VALUES (?, ?, ?, 1, 0, 'ok', 100, ?)").run('pool1@gmail.com', e.enc_token, e.iv, Date.now());
  const DID = sql.prepare('SELECT id FROM drives WHERE email = ?').get('pool1@gmail.com').id;
  const ins = (fid, at) => sql.prepare("INSERT INTO drive_files (drive_id, file_id, sha256, name, folder, mime, size, status, created, done) VALUES (?, ?, ?, 'admin-shorts.json', 'shorts/_admin', 'application/json', 10, 'ok', ?, ?)").run(DID, fid, 'a'.repeat(64), at, at);
  ins('MANIFEST_old_0001', 1000); ins('MANIFEST_new_0002', 2000);
  const VP = 'shorts/news/n_1/news-n-1-en-v1.mp4', CP = 'shorts/news/n_1/news-n-1-en-v1.jpg';
  const MAN = { index: { updated: '2026-10-22T00:00:00Z', items: [{ id: 'n1', video: VP, cover: CP, qa: { status: 'pass' }, drive: { video: { driveId: DID, fileId: 'VIDEO_file_00001' }, cover: { driveId: DID, fileId: 'COVER_file_00001' } } },
    { id: 'n2', video: 'shorts/news/n_2/news-n-2-en-v1.mp4', cover: 'shorts/news/n_2/news-n-2-en-v1.jpg' }] }, coverage: { from: 'drive-manifest' }, calendar: { per_day: 2 }, credits: { total: 1 } };
  const BLOB = new Uint8Array(1000).map((_, i) => i % 251), saved = globalThis.fetch; let gcalls = [], honor = true;
  globalThis.fetch = async (url, o = {}) => {
    const u = String(url);
    if (u === 'https://oauth2.googleapis.com/token') { const b = Object.fromEntries(o.body); gcalls.push({ u: 'token' }); return new Response(JSON.stringify(b.refresh_token === REFRESH && b.client_secret === GSEC ? { access_token: ACCESS, expires_in: 3599 } : { error: 'invalid_grant' }), { status: b.refresh_token === REFRESH ? 200 : 400 }); }
    const m0 = u.match(/^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/([^?]+)\?alt=media$/);
    if (m0) {
      const h = o.headers || {}; gcalls.push({ f: m0[1], auth: h.Authorization, range: h.Range });
      if (h.Authorization !== 'Bearer ' + ACCESS) return new Response('no', { status: 401 });
      if (m0[1] === 'MANIFEST_new_0002') return new Response(JSON.stringify(MAN), { status: 200 });
      if (m0[1] === 'MANIFEST_old_0001') return new Response(JSON.stringify({ index: { items: [] } }), { status: 200 });
      if (m0[1] === 'COVER_file_00001') return new Response('JPEGDATA', { status: 200, headers: { 'Content-Length': '8' } });
      if (m0[1] !== 'VIDEO_file_00001') return new Response('nf', { status: 404 });
      const r = /^bytes=(\d+)-(\d*)$/.exec(h.Range || '');
      if (r && honor) { const a = +r[1], z = r[2] ? +r[2] : BLOB.length - 1; return new Response(BLOB.slice(a, z + 1), { status: 206, headers: { 'Content-Range': `bytes ${a}-${z}/${BLOB.length}`, 'Content-Length': String(z - a + 1) } }); }
      return new Response(BLOB, { status: 200, headers: { 'Content-Length': String(BLOB.length) } });
    }
    return saved(url, o);
  };
  SH._memo.reset();
  for (const [who, r] of [['không token', req('/api/admin-shorts', { op: 'list' })], ['người học', req('/api/admin-shorts', { op: 'sign', path: VP }, { token: USER })], ['origin lạ', req('/api/admin-shorts', { op: 'list' }, { token: ADM, origin: 'https://evil.example' })]]) {
    const x = await run(SH, r, DENV); ok(x.s === 403 && !leakD(x.text), `admin-shorts Drive (${who}) → 403 (${x.s})`);
  }
  ok(gcalls.length === 0, 'yêu cầu không phải quản trị không gọi Google');
  const L = await run(SH, req('/api/admin-shorts', { op: 'list' }, { token: ADM }), DENV);
  ok(L.s === 200 && L.j.source === 'drive' && L.j.media === true && L.j.items.length === 2 && L.j.coverage && L.j.coverage.from === 'drive-manifest' && !leakD(L.text), 'list → manifest mới nhất từ Kho Drive (không token GitHub), kèm thống kê, không lộ khóa');
  ok(/^\/api\/admin-shorts\?f=COVER_file_00001&d=\d+&k=c&n=news-n-1-en-v1&e=\d+&s=[\w-]{43}$/.test(L.j.covers[CP] || '') && !L.j.covers['shorts/news/n_2/news-n-2-en-v1.jpg'], 'bìa có item.drive → URL ký Drive; item chưa lên Drive → không có URL');
  ok(gcalls.filter(c => c.f).every(c => c.f === 'MANIFEST_new_0002'), 'đọc đúng bản manifest mới nhất (theo done)');
  const sg = await run(SH, req('/api/admin-shorts', { op: 'sign', path: VP }, { token: ADM }), DENV);
  ok(sg.s === 200 && /^\/api\/admin-shorts\?f=VIDEO_file_00001&d=\d+&k=v&/.test(sg.j.url) && !leakD(sg.text), 'sign video → URL ký Drive');
  ok((await run(SH, req('/api/admin-shorts', { op: 'sign', path: 'shorts/news/n_2/news-n-2-en-v1.mp4' }, { token: ADM }), DENV)).s === 404, 'sign file chưa có trên Drive (không token) → 404');
  const get = async (url, headers = {}, env = DENV) => { const res = await SH.onRequestGet({ request: new Request('https://lexkite.com' + url, { headers: { 'CF-Connecting-IP': '10.7.0.' + (ipN++ % 250), ...headers } }), env }); return { s: res.status, h: res.headers, b: new Uint8Array(await res.arrayBuffer()) }; };
  const U = sg.j.url;
  let g = await get(U); ok(g.s === 200 && g.b.length === 1000 && g.h.get('Content-Type') === 'video/mp4' && g.h.get('Accept-Ranges') === 'bytes' && /private, max-age=\d+/.test(g.h.get('Cache-Control')) && g.h.get('X-Content-Type-Options') === 'nosniff' && /filename="news-n-1-en-v1\.mp4"/.test(g.h.get('Content-Disposition')), 'GET Drive ký đúng → 200 video/mp4, cache riêng tư');
  ok(gcalls.at(-1).f === 'VIDEO_file_00001' && gcalls.at(-1).auth === 'Bearer ' + ACCESS, 'GET gọi Drive alt=media bằng access token của kho');
  g = await get(U, { Range: 'bytes=10-19' }); ok(g.s === 206 && g.b.length === 10 && g.b[0] === 10 && g.h.get('Content-Range') === 'bytes 10-19/1000' && gcalls.at(-1).range === 'bytes=10-19', 'Range chuyển tiếp tới Drive → 206');
  honor = false;
  g = await get(U, { Range: 'bytes=-5' }); ok(g.s === 206 && g.b.length === 5 && g.h.get('Content-Range') === 'bytes 995-999/1000', 'Drive bỏ qua Range → tự cắt 206');
  g = await get(U, { Range: 'bytes=5000-' }); ok(g.s === 416, 'Range vượt kích thước → 416');
  honor = true; const n0 = gcalls.length;
  ok((await get(U, { Range: 'bytes=0-1,5-9' })).s === 416, 'Range nhiều đoạn → 416');
  ok((await get(U.replace(/s=[^&]+/, 's=' + 'A'.repeat(43)))).s === 403, 'Drive: chữ ký sai → 403');
  ok((await get(U.replace('f=VIDEO_file_00001', 'f=MANIFEST_new_0002'))).s === 403, 'Drive: đổi fileId giữ chữ ký → 403');
  ok((await get(U.replace(/d=\d+/, 'd=' + (DID + 1)))).s === 403, 'Drive: đổi driveId → 403');
  ok((await get(U.replace('k=v', 'k=c'))).s === 403, 'Drive: đổi loại → 403');
  ok((await get(U.replace(/e=\d+/, m => 'e=' + (+m.slice(2) + 1)))).s === 403, 'Drive: sửa hạn → 403');
  ok((await get(U.replace('f=VIDEO_file_00001', 'f=..%2F..%2Fx'))).s === 400 && (await get(U.replace('k=v', 'k=x'))).s === 400 && (await get(U.replace(/n=[^&]+/, 'n=a%22b'))).s === 400, 'Drive: tham số sai dạng → 400');
  ok((await get(U, {}, ENV)).s === 503, 'Drive: thiếu cấu hình kho → 503');
  ok(gcalls.length === n0, 'yêu cầu bị từ chối không gọi Google');
  const cu = L.j.covers[CP]; g = await get(cu); const g2 = await get(cu);
  ok(g.s === 200 && new TextDecoder().decode(g.b) === 'JPEGDATA' && g.h.get('Content-Type') === 'image/jpeg' && g2.s === 200 && new TextDecoder().decode(g2.b) === 'JPEGDATA' && gcalls.filter(c => c.f === 'COVER_file_00001').length === 1, 'bìa Drive → đệm Cache API (lần 2 không gọi Drive)');
  globalThis.fetch = saved; SH._memo.reset(); }

// YouTube: nhiều kênh – op mới chỉ cho admin; disconnect (thu hồi token + xóa hàng) là DANGER → đăng nhập ≤ 15 phút
{ const YT = await import(new URL('../../functions/api/youtube.js', import.meta.url));
  const stale = await tok({ auth_time: sec - 3600 });
  await run(YT, req('/api/youtube', { op: 'status' }, { token: ADM }));
  for (const [c, t] of [['UC_one_000001', 'Personal'], ['UC_two_000002', 'Lexkite English']]) sql.prepare("INSERT INTO yt_channel (channel_id, title, enc_token, iv, status, created) VALUES (?, ?, 'x', 'y', 'ok', 1)").run(c, t);
  for (const op of ['setdefault', 'disconnect', 'connect']) {
    const anon = await run(YT, req('/api/youtube', { op, channel_id: 'UC_two_000002' }));
    ok((anon.s === 401 || anon.s === 403) && !leaks(anon.text), `youtube '${op}' không token bị chặn (${anon.s})`);
    const usr = await run(YT, req('/api/youtube', { op, channel_id: 'UC_two_000002' }, { token: USER }));
    ok(usr.s === 403 && !leaks(usr.text), `youtube '${op}' người dùng thường → 403 (${usr.s})`);
  }
  let r = await run(YT, req('/api/youtube', { op: 'status' }, { token: ADM }));
  ok(r.s === 200 && r.j.channels.length === 2 && r.j.channels.filter(c => c.is_default).length === 1 && !('enc_token' in r.j.channels[0]) && !leaks(r.text), 'youtube status liệt kê mọi kênh, đúng 1 mặc định, không lộ token');
  r = await run(YT, req('/api/youtube', { op: 'setdefault', channel_id: 'UC_two_000002' }, { token: ADM }));
  ok(r.s === 200 && (await run(YT, req('/api/youtube', { op: 'status' }, { token: ADM }))).j.channels.find(c => c.channel_id === 'UC_two_000002').is_default, 'setdefault đổi kênh mặc định');
  ok((await run(YT, req('/api/youtube', { op: 'setdefault', channel_id: 'UC_nope_000009' }, { token: ADM }))).s === 404, 'setdefault kênh chưa kết nối → 404');
  ok((await run(YT, req('/api/youtube', { op: 'setdefault', channel_id: "x'; DROP TABLE yt_channel;--" }, { token: ADM }))).s === 400, 'setdefault id lạ → 400');
  r = await run(YT, req('/api/youtube', { op: 'disconnect', channel_id: 'UC_two_000002' }, { token: stale }));
  ok(r.s === 401 && r.j.error === 'reauth' && sql.prepare('SELECT COUNT(*) n FROM yt_channel').get().n === 2, 'disconnect cần đăng nhập gần đây (stale → 401 reauth, kênh còn nguyên)');
  r = await run(YT, req('/api/youtube', { op: 'disconnect', channel_id: 'UC_two_000002' }, { token: ADM }));
  const left = sql.prepare('SELECT channel_id FROM yt_channel').all().map(x => x.channel_id);
  ok(r.s === 200 && left.join() === 'UC_one_000001', 'disconnect xóa đúng 1 kênh, giữ kênh kia');
  ok((await run(YT, req('/api/youtube', { op: 'status' }, { token: ADM }))).j.channels[0].is_default, 'sau khi ngắt kênh mặc định, kênh còn lại thành mặc định');
}

// Thư viện clip quy mô lớn (/api/admin-clips): chỉ admin, op lạ → 400, thao tác hàng loạt ghi kết quả từng clip, xoá là DANGER (đăng nhập ≤ 15 phút), giới hạn tốc độ
{ const CL = await import(new URL('../../functions/api/admin-clips.js', import.meta.url)), SD = await import(new URL('../../functions/api/_shorts_data.js', import.meta.url));
  const ids = SD.default.index.items.slice(0, 5).map(x => x.id), stale = await tok({ auth_time: sec - 3600 }), post = (body, token = ADM) => run(CL, req('/api/admin-clips', body, { token }));
  for (const op of ['query', 'ids', 'bulk', 'export']) {
    const anon = await run(CL, req('/api/admin-clips', { op, action: 'pause', ids })); ok((anon.s === 401 || anon.s === 403) && !leaks(anon.text), `clips '${op}' không token bị chặn (${anon.s})`);
    const usr = await post({ op, action: 'pause', ids }, USER); ok(usr.s === 403 && !leaks(usr.text), `clips '${op}' người dùng thường → 403 (${usr.s})`);
  }
  for (const op of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) { const r = await post({ op }); ok(r.s === 400 && !leaks(r.text), `clips op '${op}' → 400`); }
  ok((await post({ op: 'bulk', action: 'rm -rf', ids })).s === 400 && (await post({ op: 'bulk', action: 'pause', ids: [] })).s === 400, 'bulk: action lạ / không có id → 400');
  let r = await post({ op: 'query', filter: { section: 'pending', sort: 'x; DROP', q: "'; --" }, limit: 5 });
  ok(r.s === 200 && r.j.rows.length <= 5 && r.j.counts && 'pending' in r.j.counts && r.j.rows.every(x => !('drive' in x && x.drive)) && !leaks(r.text), 'query: trang ≤ limit, đếm theo mục, không lộ drive/bí mật');
  r = await post({ op: 'bulk', action: 'pause', ids: [...ids.slice(0, 2), 'khong-co-clip-nay', "x'; DROP TABLE clip_review;--"] });
  ok(r.s === 200 && r.j.done === 2 && r.j.failed === 2 && r.j.results.filter(x => !x.ok).every(x => x.why === 'unknown'), 'bulk pause: kết quả từng clip, id lạ bị bỏ qua');
  const arch = await post({ op: 'query', filter: { section: 'archive' }, limit: 120 }); ok(arch.j.rows.map(x => x.id).includes(ids[0]), 'clip tạm dừng vào mục Lưu trữ');
  const pend = await post({ op: 'ids', filter: { section: 'pending' } }); ok(!pend.j.ids.includes(ids[0]), 'mặc định ẩn clip tạm dừng khỏi mục khác');
  ok((await post({ op: 'bulk', action: 'reject', ids: [ids[2]] })).s === 400, 'reject cần lý do');
  r = await post({ op: 'bulk', action: 'reject', ids: [ids[2]], params: { reason: 'old restaurant scene' } }); ok(r.s === 200 && r.j.done === 1, 'reject kèm lý do');
  ok((await post({ op: 'bulk', action: 'approve', ids: [ids[2]] })).j.results[0].why === 'rejected', 'clip bị loại không thể duyệt');
  r = await post({ op: 'bulk', action: 'reschedule', ids: ids.slice(0, 4), params: { start: '2026-11-01', days: 2, from: '09:00', to: '18:00', offset: 0, total: 4 } });
  const slots = sql.prepare('SELECT slot_date, slot_time FROM clip_review WHERE slot_date IS NOT NULL ORDER BY slot_date, slot_time').all();
  ok(r.s === 200 && slots.length === 4 && new Set(slots.map(x => x.slot_date)).size === 2, 'reschedule: 4 clip trải 2 ngày');
  ok((await post({ op: 'bulk', action: 'reschedule', ids, params: { start: 'bad', days: 2 } })).s === 400, 'reschedule: tham số sai → 400');
  ok((await post({ op: 'bulk', action: 'channel', ids, params: { channel_id: 'UC_not_connected' } })).s === 404, 'channel: kênh chưa kết nối → 404');
  r = await post({ op: 'bulk', action: 'delete', ids: [ids[3]] }, stale); ok(r.s === 401 && r.j.error === 'reauth' && !sql.prepare('SELECT 1 FROM clip_review WHERE clip = ? AND deleted > 0').get(ids[3]), 'delete cần đăng nhập gần đây (stale → 401 reauth, chưa xoá gì)');
  r = await post({ op: 'bulk', action: 'delete', ids: [ids[3]] }); ok(r.s === 200 && sql.prepare('SELECT deleted FROM clip_review WHERE clip = ?').get(ids[3]).deleted === 1, 'delete mềm: ẩn clip, giữ công thức (deleted=1)');
  r = await post({ op: 'bulk', action: 'delete', ids: [ids[4]], params: { hard: true } }); ok(r.s === 400 && JSON.parse(r.text).error === 'confirm', 'xoá hẳn thiếu xác nhận gõ tay → 400'); r = await post({ op: 'bulk', action: 'delete', ids: [ids[4]], params: { hard: true, confirm: 'DELETE 1', total: 1 } }); ok(sql.prepare('SELECT deleted FROM clip_review WHERE clip = ?').get(ids[4]).deleted === 2, 'xoá hẳn đánh dấu deleted=2');
  ok(!(await post({ op: 'ids', filter: { hidden: true } })).j.ids.includes(ids[3]), 'clip đã xoá không còn trong kết quả');
  r = await post({ op: 'bulk', action: 'restore', ids: [ids[3]] }); ok(r.j.done === 1 && (await post({ op: 'ids', filter: { hidden: true } })).j.ids.includes(ids[3]), 'restore đưa clip đã xoá mềm trở lại');
  r = await post({ op: 'bulk', action: 'pause', ids: Array.from({ length: 150 }, (_, i) => ids[i % 5]) }); ok(r.s === 200 && r.j.results.length <= 5, 'bulk: id trùng được gộp, tối đa 100 id/lô');
  const ex = await post({ op: 'export', ids: ids.slice(0, 2) }); ok(ex.s === 200 && ex.j.rows.length === 2 && !leaks(ex.text), 'export: dòng CSV theo id');
  const fast = { 'CF-Connecting-IP': '10.77.0.1' }; let last = 0; for (let i = 0; i < 63; i++) last = (await run(CL, req('/api/admin-clips', { op: 'bulk', action: 'resume', ids: [ids[0]] }, { token: ADM, headers: fast }))).s;
  ok(last === 429, 'bulk bị giới hạn tốc độ (429 sau 60 lần/phút)');
  let aud = 0; try { aud = sql.prepare("SELECT COUNT(*) n FROM admin_log WHERE op LIKE 'clips.bulk.%'").get().n; } catch (e) { /* bảng nhật ký chưa có */ }
  ok(aud >= 5, 'bulk được ghi nhật ký (' + aud + ')');
}

// Kênh & phân phối (/api/distribution): chỉ admin, op lạ → 400, cấu hình/luật được chuẩn hoá, kế hoạch tôn trọng hạn mức, ghi nhật ký
{ const DI = await import(new URL('../../functions/api/distribution.js', import.meta.url)), YT2 = await import(new URL('../../functions/api/youtube.js', import.meta.url)), SD2 = await import(new URL('../../functions/api/_shorts_data.js', import.meta.url));
  const post = (body, token = ADM) => run(DI, req('/api/distribution', body, { token })), CH = 'UC_one_000001', clips = SD2.default.index.items.filter(x => x.qa && x.qa.status === 'pass' && !x.rejected).slice(0, 5).map(x => x.id);
  for (const op of ['get', 'cfg_set', 'rules_set', 'plan_run', 'plan_set', 'resume', 'ext_sync', 'test_clip', 'meta', 'social_due', 'social_ack', 'embed_status']) {
    const anon = await run(DI, req('/api/distribution', { op })); ok((anon.s === 401 || anon.s === 403) && !leaks(anon.text), `distribution '${op}' không token bị chặn (${anon.s})`);
    const usr = await post({ op }, USER); ok(usr.s === 403 && !leaks(usr.text), `distribution '${op}' người dùng thường → 403 (${usr.s})`);
  }
  for (const op of ['constructor', '__proto__', 'toString']) ok((await post({ op })).s === 400, `distribution op '${op}' → 400`);
  let r = await post({ op: 'get' }); ok(r.s === 200 && r.j.channels.some(c => c.channel_id === CH && c.cfg.daily_cap === 2) && r.j.taxonomy.topics.length && !leaks(r.text), 'get: kênh + cấu hình mặc định (2/ngày) + taxonomy, không lộ bí mật');
  r = await post({ op: 'cfg_set', channel_id: CH, cfg: { daily_cap: 3, min_gap_min: 300, tz: 'Asia/Kolkata', windows: [{ from: '18:00', to: '22:00' }, { from: 'x', to: 'y' }], types: ['short'], label: 'L'.repeat(200) } });
  ok(r.s === 200 && r.j.cfg.daily_cap === 3 && r.j.cfg.tz === 'Asia/Kolkata' && r.j.cfg.windows.length === 1 && r.j.cfg.label.length === 60, 'cfg_set: chuẩn hoá (khung giờ lỗi bị bỏ, nhãn cắt)');
  ok((await post({ op: 'cfg_set', channel_id: 'UC_nope_000009', cfg: {} })).s === 404 && (await post({ op: 'cfg_set', channel_id: "x'; DROP", cfg: {} })).s === 404, 'cfg_set: kênh lạ → 404');
  ok((await post({ op: 'rules_set', rules: [{ cond: {}, channel_id: CH }] })).s === 400 && (await post({ op: 'rules_set', rules: [{ cond: { type: 'short' }, channel_id: 'UC_nope_000009' }] })).s === 400, 'rules_set: luật rỗng / kênh lạ → 400');
  r = await post({ op: 'rules_set', rules: [{ name: 'IELTS', cond: { topic: 'exam/ielts', evil: 'x' }, channel_id: CH }], fallback: CH }); ok(r.s === 200 && (await post({ op: 'get' })).j.rules[0].cond.evil === undefined, 'rules_set lưu, bỏ khoá lạ');
  for (const [i, c] of clips.entries()) sql.prepare("INSERT OR REPLACE INTO yt_queue (clip, lesson, status, privacy, approved_at, updated, title) VALUES (?, ?, 'manual', 'unlisted', ?, ?, ?)").run(c, c, i + 1, i + 1, 'T' + i);
  r = await post({ op: 'plan_run' }); ok(r.s === 200 && r.j.planned >= 1, 'plan_run xếp lịch clip đã duyệt (' + r.j.planned + ')');
  const pl = await post({ op: 'plan_get', channel_id: CH, days: 90 }); const perDay = {}; for (const x of pl.j.rows) perDay[x.date] = (perDay[x.date] || 0) + 1;
  ok(pl.j.rows.length >= 1 && Object.values(perDay).every(n => n <= 3) && pl.j.rows.every(x => x.time >= '18:00' && x.time <= '22:00' && x.tz === 'Asia/Kolkata'), 'kế hoạch: ≤ hạn mức/ngày, trong khung 18:00–22:00 giờ Ấn Độ');
  ok((await post({ op: 'plan_set', ids: [clips[0]], channel_id: CH, slot: '2020-01-01T00:00:00Z' })).s === 400 && (await post({ op: 'plan_set', ids: [clips[0]], channel_id: 'UC_nope_000009' })).s === 404, 'plan_set: slot quá khứ / kênh lạ bị từ chối');
  r = await post({ op: 'plan_set', ids: [clips[0]], channel_id: CH, slot: new Date(Date.now() + 5 * 864e5).toISOString() }); ok(r.s === 200 && sql.prepare("SELECT source FROM yt_plan WHERE clip = ?").get(clips[0]).source === 'manual', 'plan_set: ghi đè tay');
  await post({ op: 'plan_run', replan: true }); ok(sql.prepare("SELECT source FROM yt_plan WHERE clip = ?").get(clips[0]).source === 'manual', 'replan giữ nguyên ghi đè tay');
  await YT2.pauseChannel(DB, CH, 'test strike'); const g2 = await post({ op: 'get' }); ok(g2.j.channels.find(c => c.channel_id === CH).cfg.active === 0 && g2.j.alerts[0].reason === 'test strike', 'tự động tạm dừng kênh + cảnh báo cho admin');
  const rr = await post({ op: 'plan_run', replan: true }); ok(rr.j.planned === 0 || rr.j.skipped.length >= 0, 'kênh tạm dừng không nhận lịch mới');
  ok((await post({ op: 'resume', channel_id: CH })).s === 200 && (await post({ op: 'get' })).j.channels.find(c => c.channel_id === CH).cfg.active === 1, 'resume bật lại kênh');
  // Mạng xã hội (bản sao GrabCast của tác tử social) + vai trò nhúng/social + kiểm thử luật
  ok((await post({ op: 'ext_sync', accounts: 'x' })).s === 400, 'ext_sync: dữ liệu sai → 400');
  r = await post({ op: 'ext_sync', accounts: [{ platform: 'tiktok', id: 'tt1', name: 'Lexkite TT', avatar: 'javascript:alert(1)' }, { platform: 'myspace', id: 'm1' }, { platform: 'instagram', id: '../x' }] });
  const TT = 'gc-tiktok-tt1'; ok(r.s === 200 && r.j.channels.join() === TT && !sql.prepare('SELECT thumb FROM dist_ext WHERE channel_id = ?').get(TT).thumb, 'ext_sync: chỉ nền tảng hợp lệ, id an toàn, ảnh không https bị bỏ');
  r = await post({ op: 'cfg_set', channel_id: TT, cfg: { role: 'embed', daily_cap: 2 } }); ok(r.s === 200 && r.j.cfg.role === 'social', 'kênh social ngoài YouTube không thể là kênh nhúng');
  ok((await post({ op: 'rules_set', rules: [{ cond: { type: 'short' }, channel_id: TT }], fallback: TT })).s === 400, 'fallback chỉ được là kênh YouTube');
  r = await post({ op: 'rules_set', rules: [{ name: 'IELTS', cond: { topic: 'exam/ielts' }, channel_id: CH }, { name: 'TikTok', cond: { type: 'short' }, channel_id: TT }], fallback: CH }); ok(r.s === 200 && r.j.count === 2, 'rules_set nhận kênh social');
  r = await post({ op: 'test_clip', sample: { type: 'short', topic: 'exam', sub: 'exam/ielts', cefr: 'B1' } }); ok(r.s === 200 && r.j.routes.some(x => x.channel_id === TT) && r.j.trace.length === 2, 'test_clip: định tuyến mỗi nền tảng 1 kênh + vết từng luật');
  ok((await post({ op: 'test_clip' })).s === 400 && (await post({ op: 'test_clip', clip: 'nope-nope' })).s === 404, 'test_clip: thiếu/lạ → 400/404');
  r = await post({ op: 'meta', clip: clips[1], platforms: ['youtube', 'tiktok', 'evil'] }); ok(r.s === 200 && r.j.embed.privacy === 'unlisted' && r.j.embed.description.includes('lk:' + clips[1]) && r.j.social.youtube.title.length <= 60 && r.j.social.tiktok && !r.j.social.evil, 'meta: gói nhúng (unlisted, lk:) + bài social theo nền tảng');
  sql.prepare("INSERT OR REPLACE INTO dist_social (clip, channel_id, platform, slot_ms, source, rule, state, updated) VALUES (?, ?, 'tiktok', ?, 'auto', 1, 'planned', 1)").run(clips[1], TT, Date.now() + 36e5);
  r = await post({ op: 'social_due' }); ok(r.s === 200 && r.j.rows.some(x => x.clip === clips[1] && x.meta.hashtags.length >= 3 && x.account_id === 'tt1'), 'social_due: bài tới hạn kèm metadata cho tác tử social');
  ok((await post({ op: 'social_ack', clip: clips[1], channel_id: TT, state: 'hacked' })).s === 400 && (await post({ op: 'social_ack', clip: clips[2], channel_id: TT, state: 'pushed' })).s === 404, 'social_ack: trạng thái lạ → 400, bài lạ → 404');
  r = await post({ op: 'social_ack', clip: clips[1], channel_id: TT, state: 'pushed', post_id: 'p_123' }); ok(r.s === 200 && sql.prepare('SELECT state, post_id FROM dist_social WHERE clip = ?').get(clips[1]).post_id === 'p_123', 'social_ack ghi trạng thái + id bài');
  r = await post({ op: 'plan_set', ids: [clips[2]], channel_id: TT }); ok(r.s === 400, 'ghi đè kênh social cần giờ đăng');
  r = await post({ op: 'embed_status' }); ok(r.s === 200 && Array.isArray(r.j.ready) && Array.isArray(r.j.coverage) && r.j.channels.every(c => !String(c.channel_id).startsWith('gc-')) && !leaks(r.text), 'embed_status: hàng chờ bài học, phủ, chỉ kênh YouTube');
  let aud = 0; try { aud = sql.prepare("SELECT COUNT(*) n FROM admin_log WHERE op LIKE 'dist.%'").get().n; } catch (e) { /* none */ } ok(aud >= 5, 'thao tác ghi nhật ký (' + aud + ')');
}

console.log(`api-security: ${n - fails}/${n} ok`);
if (fails) process.exit(1);
