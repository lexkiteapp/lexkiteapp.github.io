/* Kết nối Meta MỘT CHẠM cho autopilot social (docs/DISTRIBUTION.md §6b) – thay bước dán token (ô dán vẫn giữ làm dự phòng).
 *  · FB: Facebook Login (scope pages_show_list, pages_read_engagement, pages_manage_posts) → code → user token ngắn → user token dài hạn
 *    → GET /me/accounts → Page token KHÔNG hết hạn → soc_tokens của kênh. Nhiều Page → lưu tạm (mã hóa, 10 phút) để owner chọn trong Quản trị.
 *    Page ở tài khoản khác: người giữ Page (Tester của app) bấm nút khi đang đăng nhập FB của họ.
 *  · IG: Business Login for Instagram (instagram_business_basic, instagram_business_content_publish) → code → token ngắn → token 60 ngày → soc_tokens;
 *    cron refresh hiện có (refreshIg) giữ tiếp.
 * Chống CSRF: lk/auto/oauth/start chỉ chạy sau adminGate → state = body.HMAC(KEYS_ENC_KEY) gồm {nền tảng, kênh, email quản trị, nonce, hạn 10 phút}
 *  + cookie HttpOnly lk_meta = nonce (Path /api/social/meta, SameSite=Lax) + nonce dùng 1 lần (D1 soc_oauth). Callback: GET /api/social/meta/callback.
 * App dạng Business dùng "Facebook Login for Business": nếu Meta đòi cấu hình, đặt env META_LOGIN_CONFIG_ID (config_id thay cho scope; cấu hình gồm 3 quyền trên).
 * App ID không bí mật (env META_APP_ID / IG_APP_ID, mặc định app "Lexkite Autopilot"); App Secret: env META_APP_SECRET / IG_APP_SECRET,
 *  hoặc owner dán 1 lần ở Quản trị → D1 soc_app mã hóa AES-GCM (KEYS_ENC_KEY). Token/secret không bao giờ vào log, URL chuyển hướng hay nội dung trả về. */
import { encryptKey, decryptKey, encReady } from './_keys.js';
import { GRAPH, IGRAPH, VER, okId, scrubTok, metaClient, igMe } from './_meta.js';
import { CH, platOfCh, store } from './_meta_tokens.js';
import { once } from './_schema.js';

export const REDIRECT = 'https://lexkite.com/api/social/meta/callback';
export const SCOPES = { fb: 'pages_show_list,pages_read_engagement,pages_manage_posts', ig: 'instagram_business_basic,instagram_business_content_publish' };
export const APP_DEFAULT = { fb: '1719433119146024', ig: '1421796229590607' }; // "Lexkite Autopilot" / "Lexkite Autopilot-IG" (Development, không gắn Business Portfolio)
export const STATE_TTL = 600, PENDING_TTL = 600e3, COOKIE = 'lk_meta';
const PLAT = { fb: 'facebook_page', ig: 'instagram' }, ENV = { fb: ['META_APP_ID', 'META_APP_SECRET'], ig: ['IG_APP_ID', 'IG_APP_SECRET'] };
const TIMEOUT = 20000;
const te = new TextEncoder();
const one = (db, q, ...a) => db.prepare(q).bind(...a).first();
const run = (db, q, ...a) => db.prepare(q).bind(...a).run();
const fail = (status, code) => Object.assign(new Error(code), { status, code });
const b64u = b => btoa(String.fromCharCode(...new Uint8Array(b))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = s => Uint8Array.from(atob(String(s).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const SECRET = /^[0-9a-f]{32}$/i;

export async function setupOAuth(db, env) {
  await once(db, 'soc-oauth', 1, () => db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS soc_oauth (n TEXT PRIMARY KEY, kind TEXT NOT NULL, channel_id TEXT NOT NULL, who TEXT NOT NULL, at INTEGER NOT NULL, enc TEXT, pages TEXT)'), // nonce 1 lần + Page chờ chọn (mã hóa)
    db.prepare('CREATE TABLE IF NOT EXISTS soc_app (kind TEXT PRIMARY KEY, app_id TEXT, enc TEXT, last4 TEXT, who TEXT, updated INTEGER)'), // App Secret Meta/IG (mã hóa)
  ]), { env });
}

/** App ID + Secret cho fb|ig: env trước, rồi D1 soc_app, App ID mặc định. → { id, secret, src } (secret '' = chưa có). */
export async function appCreds(env, db, kind) {
  const [ik, sk] = ENV[kind], row = await one(db, 'SELECT app_id, enc FROM soc_app WHERE kind = ?', kind);
  const id = okId(env[ik]) ? String(env[ik]) : row && okId(row.app_id) ? row.app_id : APP_DEFAULT[kind];
  if (SECRET.test(String(env[sk] || ''))) return { id, secret: String(env[sk]), src: 'env' };
  if (row && row.enc) { try { return { id, secret: await decryptKey(env, 'socapp:' + kind, row.enc), src: 'd1' }; } catch (e) { /* khóa đổi → coi như chưa có */ } }
  return { id, secret: '', src: '' };
}
/** Trạng thái cho thẻ Quản trị (không lộ secret). */
export async function appStatus(env, db) {
  const out = {};
  for (const k of ['fb', 'ig']) { const c = await appCreds(env, db, k), r = c.src === 'd1' ? await one(db, 'SELECT last4, updated FROM soc_app WHERE kind = ?', k) : null; out[k] = { app_id: c.id, secret: !!c.secret, src: c.src || null, last4: r ? r.last4 : null }; }
  return out;
}
/** Quản trị: lưu App Secret (32 hex) – FB kiểm bằng 1 lượt client_credentials; IG kiểm ở lần kết nối đầu. */
export async function setAppSecret(env, db, b, who, { fetcher = fetch, now = Date.now() } = {}) {
  const kind = String(b.kind || ''), secret = String(b.secret || '').trim();
  if (!ENV[kind] || !SECRET.test(secret) || (b.app_id && !okId(b.app_id))) throw fail(400, 'bad-input');
  if (!encReady(env)) throw fail(412, 'no-enc-key');
  const id = b.app_id ? String(b.app_id) : (await appCreds(env, db, kind)).id;
  if (kind === 'fb') {
    const r = await jget(fetcher, `${GRAPH}/${VER}/oauth/access_token?` + new URLSearchParams({ client_id: id, client_secret: secret, grant_type: 'client_credentials' }), {}, secret);
    if (r.status >= 400 || !r.data.access_token) throw fail(422, 'secret-check:' + errCode(r));
  }
  await run(db, `INSERT INTO soc_app (kind, app_id, enc, last4, who, updated) VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(kind) DO UPDATE SET app_id = excluded.app_id, enc = excluded.enc, last4 = excluded.last4, who = excluded.who, updated = excluded.updated`,
    kind, id, await encryptKey(env, 'socapp:' + kind, secret), secret.slice(-4), String(who || '').slice(0, 120), now);
  return { kind, app_id: id, last4: secret.slice(-4) };
}

// ---------- state ký HMAC ----------
const hkey = env => { const k = unb64u(String(env.KEYS_ENC_KEY || '').trim().replace(/=+$/, '')); return crypto.subtle.importKey('raw', k, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']); };
const sign = async (env, body) => b64u(await crypto.subtle.sign('HMAC', await hkey(env), te.encode('meta-oauth|' + body)));
export async function signState(env, { kind, channel_id, email }, now = Date.now()) {
  const n = b64u(crypto.getRandomValues(new Uint8Array(16)));
  const body = b64u(te.encode(JSON.stringify({ k: kind, c: channel_id, e: String(email).toLowerCase(), n, x: Math.floor(now / 1000) + STATE_TTL })));
  return { state: body + '.' + await sign(env, body), nonce: n };
}
/** → { k, c, e, n } khi chữ ký đúng + còn hạn, ngược lại null. */
export async function verifyState(env, state, now = Date.now()) {
  if (!encReady(env) || typeof state !== 'string' || state.length > 600) return null;
  const [body, sig] = state.split('.'); if (!body || !sig) return null;
  const want = await sign(env, body); let d = want.length ^ sig.length; for (let i = 0; i < want.length; i++) d |= want.charCodeAt(i) ^ (sig.charCodeAt(i) || 0);
  if (d) return null;
  let p; try { p = JSON.parse(new TextDecoder().decode(unb64u(body))); } catch (e) { return null; }
  if (!p || typeof p.x !== 'number' || p.x < Math.floor(now / 1000) || !PLAT[p.k] || !CH.test(String(p.c)) || platOfCh(p.c) !== PLAT[p.k] || !p.e || !p.n) return null;
  return { k: p.k, c: p.c, e: p.e, n: p.n };
}

/** Quản trị (sau adminGate): → { url, _cookie } – trình duyệt chuyển sang hộp thoại đăng nhập Meta/Instagram. */
export async function startOAuth(env, db, b, who, now = Date.now()) {
  const kind = String(b.kind || ''), ch = String(b.channel_id || '');
  if (!PLAT[kind] || !CH.test(ch) || platOfCh(ch) !== PLAT[kind]) throw fail(400, 'bad-input');
  if (!encReady(env)) throw fail(412, 'no-enc-key');
  if (!(await one(db, 'SELECT 1 AS x FROM dist_ext WHERE channel_id = ?', ch))) throw fail(404, 'no-channel');
  const c = await appCreds(env, db, kind); if (!c.secret) throw fail(412, 'no-app-secret');
  const { state, nonce } = await signState(env, { kind, channel_id: ch, email: who }, now);
  const url = kind === 'fb'
    ? `https://www.facebook.com/${VER}/dialog/oauth?` + new URLSearchParams({ client_id: c.id, redirect_uri: REDIRECT, state, response_type: 'code', auth_type: 'rerequest', ...(okId(env.META_LOGIN_CONFIG_ID) ? { config_id: String(env.META_LOGIN_CONFIG_ID) } : { scope: SCOPES.fb }) })
    : 'https://www.instagram.com/oauth/authorize?' + new URLSearchParams({ enable_fb_login: '0', force_authentication: '1', client_id: c.id, redirect_uri: REDIRECT, response_type: 'code', scope: SCOPES.ig, state });
  return { url, _cookie: `${COOKIE}=${nonce}; Path=/api/social/meta; Max-Age=${STATE_TTL}; HttpOnly; Secure; SameSite=Lax` };
}

// ---------- gọi Meta (token/secret không vào log; lỗi chỉ giữ mã) ----------
async function jget(fetcher, url, o = {}, ...secrets) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
  try { const r = await fetcher(url, { ...o, signal: ctl.signal }); let text = await r.text(); for (const s of secrets) text = scrubTok(text, s); let data; try { data = JSON.parse(text); } catch (e) { data = {}; } return { status: r.status, data: data && typeof data === 'object' ? data : {} }; }
  catch (e) { return { status: 504, data: { error: { code: 'timeout' } } }; } finally { clearTimeout(timer); }
}
const errCode = r => String(((r.data.error || {}).code) || r.data.error_type || r.status).replace(/[^\w.-]+/g, '_').slice(0, 30);

/** FB: code → user token dài hạn → Page có quyền đăng. → { pages: [{ id, name, token }] } | { err } */
export async function fbExchange(env, c, code, fetcher = fetch) {
  const t1 = await jget(fetcher, `${GRAPH}/${VER}/oauth/access_token?` + new URLSearchParams({ client_id: c.id, redirect_uri: REDIRECT, client_secret: c.secret, code }), {}, c.secret);
  const short = String(t1.data.access_token || ''); if (t1.status >= 400 || short.length < 20) return { err: 'exchange-' + errCode(t1) };
  const t2 = await jget(fetcher, `${GRAPH}/${VER}/oauth/access_token?` + new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: c.id, client_secret: c.secret, fb_exchange_token: short }), {}, c.secret, short);
  const user = String(t2.data.access_token || ''); if (t2.status >= 400 || user.length < 20) return { err: 'long-lived-' + errCode(t2) };
  const auth = { headers: { Authorization: 'Bearer ' + user, Accept: 'application/json' } };
  const pm = await jget(fetcher, `${GRAPH}/${VER}/me/permissions`, auth, user);
  if (pm.status < 400 && Array.isArray(pm.data.data)) { const g = new Set(pm.data.data.filter(x => x.status === 'granted').map(x => x.permission)); if (!SCOPES.fb.split(',').every(s => g.has(s))) return { err: 'scope' }; }
  const ac = await jget(fetcher, `${GRAPH}/${VER}/me/accounts?fields=id,name,access_token,tasks&limit=100`, auth, user);
  if (ac.status >= 400) return { err: 'accounts-' + errCode(ac) };
  const pages = (ac.data.data || []).filter(p => okId(p.id) && String(p.access_token || '').length >= 20 && (!Array.isArray(p.tasks) || p.tasks.includes('CREATE_CONTENT') || p.tasks.includes('MANAGE')))
    .slice(0, 50).map(p => ({ id: String(p.id), name: String(p.name || '').slice(0, 80), token: String(p.access_token) }));
  return pages.length ? { pages } : { err: 'no-page' };
}
/** IG: code → token ngắn → token 60 ngày → /me. → { token, expires_at, user_id, username } | { err } */
export async function igExchange(env, c, code, fetcher = fetch, now = Date.now()) {
  const t1 = await jget(fetcher, 'https://api.instagram.com/oauth/access_token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' }, body: new URLSearchParams({ client_id: c.id, client_secret: c.secret, grant_type: 'authorization_code', redirect_uri: REDIRECT, code }).toString() }, c.secret);
  const d1 = Array.isArray(t1.data.data) ? t1.data.data[0] || {} : t1.data, short = String(d1.access_token || '');
  if (t1.status >= 400 || short.length < 20) return { err: 'exchange-' + errCode(t1) };
  const perms = Array.isArray(d1.permissions) ? d1.permissions : String(d1.permissions || '').split(',').filter(Boolean);
  if (perms.length && !SCOPES.ig.split(',').every(s => perms.includes(s))) return { err: 'scope' };
  const t2 = await jget(fetcher, `${IGRAPH}/access_token?` + new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: c.secret, access_token: short }), {}, c.secret, short);
  const tok = String(t2.data.access_token || ''); if (t2.status >= 400 || tok.length < 20) return { err: 'long-lived-' + errCode(t2) };
  const me = await igMe(metaClient(env, { token: tok, host: 'ig', fetcher })); if (!me.ok) return { err: 'me-' + String(me.code || 'x').slice(0, 20) };
  return { token: tok, expires_at: now + (+t2.data.expires_in || 5184000) * 1000, user_id: me.user_id, username: me.username };
}

/** GET /api/social/meta/callback – Meta/Instagram quay về đây. ctx = { limit, adminAudit, onStored(ch), fetcher, now } (route nối). */
export async function handleCallback(request, env, ctx = {}) {
  const { fetcher = fetch, now = Date.now(), onStored = async () => {}, audit = async () => {}, limited = async () => false } = ctx;
  const u = new URL(request.url), back = (q, extra = '') => new Response(null, { status: 302, headers: { Location: '/admin.html?meta=' + q + extra + '#social/queue', 'Cache-Control': 'no-store', 'Set-Cookie': `${COOKIE}=; Path=/api/social/meta; Max-Age=0; HttpOnly; Secure; SameSite=Lax` } });
  let who = '?'; const bad = async q => { await audit(who, 'meta.callback.' + q, false); return back(q); };
  if (await limited('metacb:' + (request.headers.get('CF-Connecting-IP') || '?'))) return back('rate');
  if (!env.DB || !encReady(env)) return back('not-configured');
  const db = env.DB; await setupOAuth(db, env);
  const st = await verifyState(env, u.searchParams.get('state') || '', now), ck = (/(?:^|;\s*)lk_meta=([^;]+)/.exec(request.headers.get('Cookie') || '') || [])[1] || '';
  const admins = String(env.ADMIN_EMAILS || '').toLowerCase().split(/[,\s]+/).filter(Boolean);
  if (st) who = st.e;
  if (!st || !admins.includes(st.e) || !ck || ck !== st.n) return bad('bad-state');
  try { await run(db, 'INSERT INTO soc_oauth (n, kind, channel_id, who, at) VALUES (?, ?, ?, ?, ?)', st.n, st.k, st.c, st.e, now); } catch (e) { return bad('replay'); }
  await run(db, 'DELETE FROM soc_oauth WHERE at < ?', now - 864e5).catch(() => {});
  const code = String(u.searchParams.get('code') || '').replace(/#_$/, '');
  if (u.searchParams.get('error') || !code || code.length > 2000) return bad('denied');
  if (!(await one(db, 'SELECT 1 AS x FROM dist_ext WHERE channel_id = ?', st.c))) return bad('no-channel');
  const c = await appCreds(env, db, st.k); if (!c.secret) return bad('no-app-secret');
  try {
    if (st.k === 'ig') {
      const r = await igExchange(env, c, code, fetcher, now); if (r.err) return bad(r.err);
      await store(env, db, st.c, 'ig', r.user_id, r.username ? '@' + r.username : null, r.token, r.expires_at, now); await onStored(st.c);
      await audit(st.e, 'meta.callback.ig', true); return back('ok', '&ch=' + encodeURIComponent(st.c));
    }
    const r = await fbExchange(env, c, code, fetcher); if (r.err) return bad(r.err);
    if (r.pages.length === 1) {
      const p = r.pages[0]; await store(env, db, st.c, 'fb', p.id, p.name, p.token, 0, now); await onStored(st.c);
      await audit(st.e, 'meta.callback.fb', true); return back('ok', '&ch=' + encodeURIComponent(st.c));
    }
    await run(db, 'UPDATE soc_oauth SET enc = ?, pages = ? WHERE n = ?', await encryptKey(env, 'socoauth:' + st.n, JSON.stringify(r.pages)), JSON.stringify(r.pages.map(p => ({ id: p.id, name: p.name }))), st.n);
    await audit(st.e, 'meta.callback.fb.pick', true); return back('pick', '&id=' + encodeURIComponent(st.n));
  } catch (e) { return bad('error'); }
}

const pending = async (db, b, who, now) => {
  const r = await one(db, 'SELECT * FROM soc_oauth WHERE n = ?', String(b.id || '').slice(0, 40));
  if (!r || !r.enc || r.kind !== 'fb' || now - r.at > PENDING_TTL) throw fail(404, 'expired');
  if (r.who !== String(who || '').toLowerCase()) throw fail(403, 'not-yours');
  return r;
};
/** Quản trị: danh sách Page chờ chọn (không token). */
export async function pendingPages(env, db, b, who, now = Date.now()) { const r = await pending(db, b, who, now); return { channel_id: r.channel_id, pages: JSON.parse(r.pages || '[]') }; }
/** Quản trị: chọn 1 Page → lưu Page token cho kênh; xóa phần chờ. */
export async function pickPage(env, db, b, who, now = Date.now()) {
  const r = await pending(db, b, who, now), id = String(b.page_id || '');
  let pages; try { pages = JSON.parse(await decryptKey(env, 'socoauth:' + r.n, r.enc)); } catch (e) { throw fail(410, 'expired'); }
  const p = pages.find(x => x.id === id); if (!okId(id) || !p) throw fail(400, 'bad-page-id');
  await store(env, db, r.channel_id, 'fb', p.id, p.name, p.token, 0, now);
  await run(db, 'UPDATE soc_oauth SET enc = NULL, pages = NULL WHERE n = ?', r.n);
  return { channel_id: r.channel_id, kind: 'fb', target_id: p.id, name: p.name, last4: p.token.slice(-4) };
}
/** Link "Kết nối lại" thẳng tới nút của kênh (cảnh báo issue social-alert). */
export const reconnectUrl = ch => 'https://lexkite.com/admin.html?meta_reconnect=' + encodeURIComponent(ch) + '#social/queue';
