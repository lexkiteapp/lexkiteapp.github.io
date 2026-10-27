// Test kết nối Meta MỘT CHẠM (functions/api/_meta_oauth.js + /api/social/meta/callback, thẻ Quản trị › Hàng đợi › Autopilot):
// App Secret (sai → 422, lưu mã hóa), start (URL + cookie), state giả mạo / hết hạn / sai cookie / không phải quản trị / phát lại, đổi code lỗi,
// FB 1 Page → lưu ngay, nhiều Page → chọn trong Quản trị (đúng người, hết hạn 10 phút), thiếu quyền, IG token 60 ngày; token/secret không lọt vào D1/URL; UI (jsdom, EN).
// Chạy: node scripts/test/social-meta-oauth.mjs
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); return e && e.exp > Date.now() ? new Response(e.body) : undefined; }, async put(req, res) { store.set(req.url, { body: await res.text(), exp: Date.now() + 6e5 }); }, async delete(req) { return store.delete(req.url); } } };
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; },
  async run() { if (/^\s*(SELECT|WITH)/i.test(q)) return { results: sql.prepare(q).all(...this.args) }; const i = sql.prepare(q).run(...this.args); return { results: [], meta: { changes: Number(i.changes) } }; },
  async all() { return /^\s*(SELECT|WITH)/i.test(q) ? { results: sql.prepare(q).all(...this.args) } : (sql.prepare(q).run(...this.args), { results: [] }); },
  async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };

const A = await import(new URL('../../functions/api/_social_auto.js', import.meta.url));
const O = await import(new URL('../../functions/api/_meta_oauth.js', import.meta.url));
const MT = await import(new URL('../../functions/api/_meta_tokens.js', import.meta.url));
const MGR = await import(new URL('../../functions/api/_social_mgr.js', import.meta.url));
const now = Date.now(), ADMIN = 'owner@lexkite.com';
const FBSEC = 'a'.repeat(32), IGSEC = 'b'.repeat(32), SHORT = 'EAAshort' + 's'.repeat(40), LONGU = 'EAAlonguser' + 'u'.repeat(40), PT1 = 'EAApage1' + '1'.repeat(40), PT2 = 'EAApage2' + '2'.repeat(40);
const IGS = 'IGAAshort' + 'x'.repeat(40), IGL = 'IGAAlong' + 'y'.repeat(40);
const ENV = { DB, KEYS_ENC_KEY: Buffer.alloc(32, 7).toString('base64'), ADMIN_EMAILS: ADMIN + ', other@lexkite.com', GRABCAST_API_KEY: 'k' };
const SC = { pages: [{ id: '111111111', name: 'Lexkite', access_token: PT1, tasks: ['CREATE_CONTENT', 'MANAGE'] }], perms: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'] };
const J = (d, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
const seen = [];
const fetcher = async (url, init = {}) => {
  const u = new URL(url); seen.push(u.origin + u.pathname);
  if (u.host === 'graph.facebook.com' && u.pathname.endsWith('/oauth/access_token')) {
    const q = u.searchParams; if (q.get('client_secret') !== FBSEC) return J({ error: { code: 101, message: 'Error validating client secret ' + q.get('client_secret') } }, 400);
    if (q.get('grant_type') === 'client_credentials') return J({ access_token: '1719433119146024|apptoken' });
    if (q.get('grant_type') === 'fb_exchange_token') return q.get('fb_exchange_token') === SHORT ? J({ access_token: LONGU, expires_in: 5184000 }) : J({ error: { code: 190 } }, 400);
    if (q.get('redirect_uri') !== O.REDIRECT) return J({ error: { code: 191 } }, 400);
    return q.get('code') === 'GOOD' ? J({ access_token: SHORT, expires_in: 3600 }) : J({ error: { code: 100, message: 'Invalid verification code ' + q.get('code') } }, 400);
  }
  if (u.host === 'graph.facebook.com' && /\/me\/permissions$/.test(u.pathname)) return J({ data: SC.perms.map(p => ({ permission: p, status: 'granted' })) });
  if (u.host === 'graph.facebook.com' && /\/me\/accounts$/.test(u.pathname)) return (init.headers || {}).Authorization === 'Bearer ' + LONGU ? J({ data: SC.pages }) : J({ error: { code: 190 } }, 401);
  if (u.host === 'api.instagram.com') { const b = new URLSearchParams(init.body); return b.get('client_secret') === IGSEC && b.get('code') === 'GOOD' && b.get('redirect_uri') === O.REDIRECT ? J({ data: [{ access_token: IGS, user_id: '9001', permissions: SC.igperm || 'instagram_business_basic,instagram_business_content_publish' }] }) : J({ error_type: 'OAuthException', code: 400 }, 400); }
  if (u.host === 'graph.instagram.com' && u.pathname === '/access_token') return u.searchParams.get('access_token') === IGS && u.searchParams.get('client_secret') === IGSEC ? J({ access_token: IGL, token_type: 'bearer', expires_in: 5183944 }) : J({ error: { code: 190 } }, 400);
  if (u.host === 'graph.instagram.com' && /\/me$/.test(u.pathname)) return (init.headers || {}).Authorization === 'Bearer ' + IGL ? J({ user_id: '17841400000000001', username: 'lexkite.app' }) : J({ error: { code: 190 } }, 401);
  return J({ error: { code: 1 } }, 404);
};

await MGR.setupMgr(DB);
sql.exec('CREATE TABLE yt_queue (clip TEXT PRIMARY KEY, status TEXT, title TEXT, approved_at INTEGER); CREATE TABLE clip_review (clip TEXT PRIMARY KEY, state TEXT, deleted INTEGER, web INTEGER)');
await A.autoStatus({ ...ENV }); // tạo bảng
const ext = sql.prepare('INSERT INTO dist_ext (channel_id, platform, account_id, title, status, updated) VALUES (?, ?, ?, ?, ?, ?)');
ext.run('gc-facebook_page-2', 'facebook_page', '2', 'Lexkite', 'ok', now); ext.run('gc-instagram-3', 'instagram', '3', 'lexkite.app', 'ok', now);
const op = p => A.autoOpFor('POST', 'lk/auto/' + p);
const errOf = async f => { try { await f(); return 0; } catch (e) { return e.status + ':' + e.code; } };
const cb = (qs, cookie, t = now) => O.handleCallback(new Request('https://lexkite.com/api/social/meta/callback?' + qs, { headers: cookie ? { Cookie: 'x=1; lk_meta=' + cookie } : {} }), ENV, { fetcher, now: t });
const loc = r => r.headers.get('Location') || '';
const start = async (kind, ch, who = ADMIN) => { const o = await op('oauth/start')({ env: ENV, db: DB, b: { kind, channel_id: ch }, who }); const u = new URL(o.url); return { o, u, state: u.searchParams.get('state'), nonce: /lk_meta=([^;]+)/.exec(o._cookie)[1] }; };

// ---------- 1) App Secret + start ----------
{
  ok(await errOf(() => op('oauth/start')({ env: ENV, db: DB, b: { kind: 'fb', channel_id: 'gc-facebook_page-2' }, who: ADMIN })) === '412:no-app-secret', 'chưa có App Secret → 412 no-app-secret');
  ok(await errOf(() => op('oauth/start')({ env: ENV, db: DB, b: { kind: 'fb', channel_id: 'gc-instagram-3' }, who: ADMIN })) === '400:bad-input' && await errOf(() => op('oauth/start')({ env: ENV, db: DB, b: { kind: 'fb', channel_id: 'gc-facebook_page-9' }, who: ADMIN })) === '404:no-channel', 'start: nền tảng ≠ kênh → 400; kênh lạ → 404');
  ok(await errOf(() => O.setAppSecret(ENV, DB, { kind: 'fb', secret: 'c'.repeat(32) }, ADMIN, { fetcher })) === '422:secret-check:101' && await errOf(() => O.setAppSecret(ENV, DB, { kind: 'fb', secret: 'nothex' }, ADMIN, { fetcher })) === '400:bad-input', 'App Secret sai → 422 (kiểm client_credentials), sai định dạng → 400');
  ok(await errOf(() => O.setAppSecret({ ...ENV, KEYS_ENC_KEY: '' }, DB, { kind: 'ig', secret: IGSEC }, ADMIN, { fetcher })) === '412:no-enc-key', 'thiếu KEYS_ENC_KEY → 412');
  const s1 = await O.setAppSecret(ENV, DB, { kind: 'fb', secret: FBSEC }, ADMIN, { fetcher }), s2 = await O.setAppSecret(ENV, DB, { kind: 'ig', secret: IGSEC }, ADMIN, { fetcher });
  ok(s1.app_id === '1719433119146024' && s2.app_id === '1421796229590607' && s1.last4 === 'aaaa', 'lưu App Secret FB + IG (App ID mặc định của app Lexkite Autopilot)');
  const ap = await O.appStatus(ENV, DB); ok(ap.fb.secret && ap.ig.secret && ap.fb.src === 'd1' && !JSON.stringify(ap).includes(FBSEC), 'appStatus: có secret, không lộ secret');
  ok((await O.appCreds({ ...ENV, META_APP_ID: '222222222', META_APP_SECRET: 'd'.repeat(32) }, DB, 'fb')).src === 'env', 'secret env (Cloudflare Pages) ưu tiên hơn D1');
  const { o, u, state } = await start('fb', 'gc-facebook_page-2');
  ok(u.origin === 'https://www.facebook.com' && u.pathname === '/v26.0/dialog/oauth' && u.searchParams.get('client_id') === '1719433119146024' && u.searchParams.get('redirect_uri') === O.REDIRECT && u.searchParams.get('scope') === 'pages_show_list,pages_read_engagement,pages_manage_posts' && state.length > 40, 'start FB: URL Facebook Login đủ client_id/redirect/scope/state');
  ok(/HttpOnly/.test(o._cookie) && /Secure/.test(o._cookie) && /SameSite=Lax/.test(o._cookie) && /Path=\/api\/social\/meta/.test(o._cookie) && /Max-Age=600/.test(o._cookie), 'cookie lk_meta: HttpOnly, Secure, Lax, chỉ /api/social/meta, 10 phút');
  const ig = await start('ig', 'gc-instagram-3');
  ok(ig.u.origin === 'https://www.instagram.com' && ig.u.pathname === '/oauth/authorize' && ig.u.searchParams.get('client_id') === '1421796229590607' && ig.u.searchParams.get('scope') === 'instagram_business_basic,instagram_business_content_publish' && ig.u.searchParams.get('force_authentication') === '1', 'start IG: Instagram Login (Business), scope đúng, buộc chọn tài khoản');
  const sock = fs.readFileSync(new URL('../../functions/api/social.js', import.meta.url), 'utf8');
  ok(/delete out\._cookie/.test(sock) && /'Set-Cookie': cookie/.test(sock), '/api/social: _cookie thành header Set-Cookie, không vào JSON');
}

// ---------- 2) state giả mạo / hết hạn / cookie / phát lại / đổi code lỗi ----------
{
  const { state, nonce } = await start('fb', 'gc-facebook_page-2');
  const [body, sig] = state.split('.'), forged = Buffer.from(JSON.stringify({ k: 'fb', c: 'gc-facebook_page-2', e: ADMIN, n: nonce, x: Math.floor(now / 1000) + 86400 })).toString('base64url') + '.' + sig;
  ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(forged), nonce)).includes('meta=bad-state'), 'state giả mạo (đổi nội dung, giữ chữ ký) → bad-state');
  const other = await O.signState({ ...ENV, KEYS_ENC_KEY: Buffer.alloc(32, 9).toString('base64') }, { kind: 'fb', channel_id: 'gc-facebook_page-2', email: ADMIN });
  ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(other.state), other.nonce)).includes('meta=bad-state'), 'state ký bằng khóa khác → bad-state');
  ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(state), nonce, now + 601e3)).includes('meta=bad-state'), 'state hết hạn (> 10 phút) → bad-state');
  ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(state), 'wrongnonce')).includes('meta=bad-state') && loc(await cb('code=GOOD&state=' + encodeURIComponent(state), '')).includes('meta=bad-state'), 'thiếu/sai cookie lk_meta (CSRF) → bad-state');
  const stranger = await start('fb', 'gc-facebook_page-2', 'stranger@x.com');
  ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(stranger.state), stranger.nonce)).includes('meta=bad-state'), 'email không trong ADMIN_EMAILS → bad-state');
  ok(loc(await cb('code=BAD&state=' + encodeURIComponent(state), nonce)).includes('meta=exchange-100'), 'đổi code lỗi → meta=exchange-100');
  ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(state), nonce)).includes('meta=replay'), 'state đã dùng → replay (nonce 1 lần)');
  const d = await start('fb', 'gc-facebook_page-2');
  ok(loc(await cb('error=access_denied&state=' + encodeURIComponent(d.state), d.nonce)).includes('meta=denied'), 'người dùng hủy → denied');
  ok(!sql.prepare("SELECT 1 FROM soc_tokens WHERE channel_id = 'gc-facebook_page-2'").get(), 'các lần lỗi: không lưu token nào');
  const r = await cb('code=GOOD&state=' + encodeURIComponent(d.state), d.nonce);
  ok(r.headers.get('Set-Cookie').includes('Max-Age=0') && r.status === 302, 'callback luôn xóa cookie + 302 về Quản trị');
}

// ---------- 3) FB: 1 Page → lưu ngay; thiếu quyền; nhiều Page → chọn ----------
{
  const s = await start('fb', 'gc-facebook_page-2'), r = await cb('code=GOOD&state=' + encodeURIComponent(s.state), s.nonce);
  const row = sql.prepare("SELECT * FROM soc_tokens WHERE channel_id = 'gc-facebook_page-2'").get();
  ok(loc(r) === '/admin.html?meta=ok&ch=gc-facebook_page-2#social/queue' && row && row.target_id === '111111111' && row.kind === 'fb' && row.expires_at === 0 && row.last4 === PT1.slice(-4) && row.status === 'ok', 'FB 1 Page → Page token (không hết hạn) lưu cho kênh, về ?meta=ok');
  ok(await MT.tokenOf(ENV, DB, { src: 'd1', channel_id: 'gc-facebook_page-2' }) === PT1, 'token giải mã đúng (AES-GCM)');
  SC.perms = ['pages_show_list'];
  const s2 = await start('fb', 'gc-facebook_page-2'); ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(s2.state), s2.nonce)).includes('meta=scope'), 'thiếu pages_manage_posts → scope');
  SC.perms = ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts']; SC.pages = [];
  const s3 = await start('fb', 'gc-facebook_page-2'); ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(s3.state), s3.nonce)).includes('meta=no-page'), 'không có Page nào → no-page');
  SC.pages = [{ id: '111111111', name: 'Lexkite', access_token: PT1, tasks: ['CREATE_CONTENT'] }, { id: '222222222', name: 'Lexkite VN', access_token: PT2, tasks: ['MANAGE', 'CREATE_CONTENT'] }, { id: '333333333', name: 'Chỉ xem', access_token: 'EAAview' + 'v'.repeat(40), tasks: ['ANALYZE'] }];
  const s4 = await start('fb', 'gc-facebook_page-2'), r4 = await cb('code=GOOD&state=' + encodeURIComponent(s4.state), s4.nonce);
  const id = new URLSearchParams(loc(r4).split('?')[1].split('#')[0]).get('id');
  ok(loc(r4).includes('meta=pick') && id === s4.nonce, 'nhiều Page → ?meta=pick&id=<phiên>');
  const P = await op('oauth/pages')({ env: ENV, db: DB, b: { id }, who: ADMIN });
  ok(P.pages.length === 2 && P.pages[1].id === '222222222' && !JSON.stringify(P).includes('EAA'), 'Page chờ chọn: chỉ Page có quyền đăng, không token');
  ok(await errOf(() => op('oauth/pages')({ env: ENV, db: DB, b: { id }, who: 'other@lexkite.com' })) === '403:not-yours', 'quản trị khác không mở được phiên chọn Page');
  ok(await errOf(() => op('oauth/pick')({ env: ENV, db: DB, b: { id, page_id: '333333333' }, who: ADMIN })) === '400:bad-page-id', 'chọn Page không có trong danh sách → 400');
  const pk = await op('oauth/pick')({ env: ENV, db: DB, b: { id, page_id: '222222222' }, who: ADMIN });
  ok(pk.target_id === '222222222' && sql.prepare("SELECT target_id FROM soc_tokens WHERE channel_id = 'gc-facebook_page-2'").get().target_id === '222222222' && await MT.tokenOf(ENV, DB, { src: 'd1', channel_id: 'gc-facebook_page-2' }) === PT2, 'chọn Page → lưu Page token của Page đó (kết nối lại thay token cũ)');
  ok(await errOf(() => O.pickPage(ENV, DB, { id, page_id: '222222222' }, ADMIN)) === '404:expired', 'phiên chọn Page dùng 1 lần');
  const s5 = await start('fb', 'gc-facebook_page-2'); await cb('code=GOOD&state=' + encodeURIComponent(s5.state), s5.nonce);
  ok(await errOf(() => O.pickPage(ENV, DB, { id: s5.nonce, page_id: '111111111' }, ADMIN, now + 11 * 60e3)) === '404:expired', 'phiên chọn Page hết hạn sau 10 phút');
}

// ---------- 4) IG: token 60 ngày ----------
{
  const s = await start('ig', 'gc-instagram-3'), r = await cb('code=GOOD&state=' + encodeURIComponent(s.state), s.nonce);
  const row = sql.prepare("SELECT * FROM soc_tokens WHERE channel_id = 'gc-instagram-3'").get();
  ok(loc(r).includes('meta=ok') && row && row.kind === 'ig' && row.target_id === '17841400000000001' && row.name === '@lexkite.app' && Math.abs(row.expires_at - (now + 5183944e3)) < 1000, 'IG: token ngắn → dài hạn (expires_in thật) → lưu kênh, IG user_id + @username');
  ok(await MT.tokenOf(ENV, DB, { src: 'd1', channel_id: 'gc-instagram-3' }) === IGL, 'IG lưu token DÀI HẠN (không phải token ngắn)');
  ok(!MT.igNeedsRefresh({ ...row, platform: 'instagram', src: 'd1' }, ENV, now) && MT.igNeedsRefresh({ ...row, platform: 'instagram', src: 'd1' }, ENV, now + 51 * 864e5), 'cron refresh hiện có tiếp quản (≤ 10 ngày còn lại)');
  SC.igperm = 'instagram_business_basic';
  const s2 = await start('ig', 'gc-instagram-3'); ok(loc(await cb('code=GOOD&state=' + encodeURIComponent(s2.state), s2.nonce)).includes('meta=scope'), 'IG thiếu content_publish → scope');
  SC.igperm = null;
  const s3 = await start('ig', 'gc-instagram-3'); ok(loc(await cb('code=BAD&state=' + encodeURIComponent(s3.state), s3.nonce)).includes('meta=exchange-'), 'IG đổi code lỗi → exchange-…');
}

// ---------- 5) Không lọt token/secret; cảnh báo có link Kết nối lại ----------
{
  const dump = JSON.stringify(sql.prepare('SELECT * FROM soc_tokens').all()) + JSON.stringify(sql.prepare('SELECT * FROM soc_oauth').all()) + JSON.stringify(sql.prepare('SELECT * FROM soc_app').all());
  ok(![SHORT, LONGU, PT1, PT2, IGS, IGL, FBSEC, IGSEC].some(t => dump.includes(t)), 'D1 (soc_tokens, soc_oauth, soc_app) không chứa token/secret bản rõ');
  const st = await A.autoStatus({ ...ENV }); ok(!JSON.stringify(st).includes(PT2) && st.meta.apps.fb.secret && st.meta.tokens.length === 2, 'thẻ Autopilot: apps + 2 kênh, không lộ token');
  ok(O.reconnectUrl('gc-instagram-3') === 'https://lexkite.com/admin.html?meta_reconnect=gc-instagram-3#social/queue', 'link Kết nối lại thẳng tới nút của kênh');
  const src = fs.readFileSync(new URL('../../functions/api/_social_auto.js', import.meta.url), 'utf8');
  ok((src.match(/reconnectUrl\(ch\)/g) || []).length >= 4, 'mọi cảnh báo meta-token (thu hồi, sức khỏe, refresh lỗi, sắp hết hạn) kèm link Kết nối lại');
  ok(fs.existsSync(new URL('../../functions/api/social/meta/callback.js', import.meta.url)), 'route GET /api/social/meta/callback tồn tại');
}

// ---------- 6) Thẻ Quản trị (jsdom) ----------
{
  const code = fs.readFileSync(new URL('../../web/js/admin-social-mgr.js', import.meta.url), 'utf8');
  const jsdom = (await import('jsdom')).default;
  sql.exec("DELETE FROM soc_tokens WHERE channel_id = 'gc-instagram-3'");
  const AS = JSON.parse(JSON.stringify(await A.autoStatus({ ...ENV }))); AS.meta.apps.ig.secret = false;
  const mk = async (url, lang = 'vi') => {
    const dom = new jsdom.JSDOM('<!doctype html><html><head></head><body><main id="m"></main></body></html>', { url, runScripts: 'outside-only', pretendToBeVisual: true });
    const w = dom.window, calls = []; w.eval(code); w.HTMLElement.prototype.scrollIntoView = () => {};
    const sapi = async (m, p, b) => { calls.push([p, b]); if (p === 'lk/auto') return JSON.parse(JSON.stringify(AS)); if (p === 'lk/auto/oauth/pages') return { channel_id: 'gc-facebook_page-2', pages: [{ id: '111111111', name: 'Lexkite' }, { id: '222222222', name: 'Lexkite VN' }] }; if (p === 'lk/auto/oauth/pick') return { name: 'Lexkite VN', target_id: '222222222' }; if (p === 'lk/auto/app') return { last4: 'bbbb' }; if (p === 'lk/rules') return { rules: MGR.cleanRules({}) }; return { url: '' }; };
    const ctx = { sapi, L: (s, v) => (v ? s.replace(/\{(\w+)\}/g, (x, k) => (v[k] != null ? v[k] : x)) : s), esc: s => String(s ?? '').replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';'), lang: () => lang, D: { accounts: [] }, errText: e => String(e && e.message || e), accById: () => null, modal: () => {}, both: x => x, alive: () => true, LS: { get: (k, d) => d, set: () => {} } };
    const main = w.document.getElementById('m'); w.AdminSocialMgr.paint('queue', main, ctx);
    for (let i = 0; i < 25; i++) await new Promise(res => setTimeout(res, 0));
    return { w, main, calls, ap: main.querySelector('#smgAP') };
  };
  const EN = (await mk('https://lexkite.com/admin.html')).w.AdminSocialMgr._t.EN;
  const card = code.slice(code.indexOf('async function autoCard'), code.indexOf('async function queue('));
  const keys = [...card.matchAll(/M\('([^']+)'/g)].map(m => m[1]).concat([...card.matchAll(/ERR = \{([^}]+)\}/g)].flatMap(m => [...m[1].matchAll(/: '([^']+)'/g)].map(x => x[1])));
  ok(keys.length > 40 && keys.every(k => k in EN), 'thẻ Autopilot: mọi chữ có bản tiếng Anh – thiếu: ' + keys.filter(k => !(k in EN)).join(' | '));
  const a = await mk('https://lexkite.com/admin.html#social/queue');
  const igBtn = [...a.ap.querySelectorAll('[data-oa]')].find(b => b.dataset.oa === 'gc-instagram-3'), fbBtn = [...a.ap.querySelectorAll('[data-oa]')].find(b => b.dataset.oa === 'gc-facebook_page-2');
  ok(igBtn && /Kết nối Instagram/.test(igBtn.textContent) && fbBtn && /Kết nối lại/.test(fbBtn.textContent) && a.ap.querySelector('#apTkSave'), 'nút Kết nối Instagram (kênh chưa có token), Kết nối lại (kênh có token), vẫn giữ ô dán token');
  igBtn.click(); for (let i = 0; i < 5; i++) await new Promise(res => setTimeout(res, 0));
  ok(!a.calls.some(([p]) => p === 'lk/auto/oauth/start') && /App Secret/.test(a.ap.querySelector('#apM').textContent), 'IG chưa có App Secret → báo, không gọi start');
  a.ap.querySelector('#apSec-ig').value = IGSEC; a.ap.querySelector('[data-sec="ig"]').click(); for (let i = 0; i < 8; i++) await new Promise(res => setTimeout(res, 0));
  ok(a.calls.some(([p, b]) => p === 'lk/auto/app' && b.kind === 'ig' && b.secret === IGSEC) && !a.main.innerHTML.includes(IGSEC), 'Lưu App Secret → lk/auto/app, ô secret xóa sau khi gửi');
  [...a.main.querySelectorAll('[data-oa]')].find(b => b.dataset.oa === 'gc-facebook_page-2').click(); for (let i = 0; i < 5; i++) await new Promise(res => setTimeout(res, 0));
  ok(a.calls.some(([p, b]) => p === 'lk/auto/oauth/start' && b.kind === 'fb' && b.channel_id === 'gc-facebook_page-2'), 'Kết nối lại FB → lk/auto/oauth/start');
  const p = await mk('https://lexkite.com/admin.html?meta=pick&id=abcdefgh#social/queue');
  ok(p.w.location.search === '' && p.w.location.hash === '#social/queue', 'tham số ?meta bị xóa khỏi URL sau khi xử lý');
  const sel = p.main.querySelector('#apPickSel'); ok(sel && sel.options.length === 2, 'quay về ?meta=pick → chọn Page trong Quản trị');
  sel.value = '222222222'; p.main.querySelector('#apPickGo').click(); for (let i = 0; i < 8; i++) await new Promise(res => setTimeout(res, 0));
  ok(p.calls.some(([q, b]) => q === 'lk/auto/oauth/pick' && b.id === 'abcdefgh' && b.page_id === '222222222') && /Lexkite VN/.test(p.main.querySelector('#apM').textContent), 'chọn Page → lk/auto/oauth/pick + báo đã kết nối');
  const e = await mk('https://lexkite.com/admin.html?meta=bad-state#social/queue');
  ok(/hết hạn \(10 phút\)/.test(e.main.querySelector('#apM').textContent), '?meta=bad-state → thông báo dễ hiểu');
  const rc = await mk('https://lexkite.com/admin.html?meta_reconnect=gc-facebook_page-2#social/queue');
  ok(rc.w.document.activeElement && rc.w.document.activeElement.dataset.oa === 'gc-facebook_page-2', 'link cảnh báo ?meta_reconnect → focus đúng nút Kết nối lại');
  const en = await mk('https://lexkite.com/admin.html?meta=scope#social/queue', 'en'), te = en.ap.textContent;
  ok(/Reconnect/.test(te) && /Connect Instagram/.test(te) && /Permissions missing/.test(te) && !/[ăđơư]|[ạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(te), 'tiếng Anh: khối kết nối không sót tiếng Việt');
}

console.log(fails ? `✗ social-meta-oauth: ${fails}/${n} lỗi` : `✓ social-meta-oauth: ${n} kiểm tra đạt (App Secret, state/CSRF, đổi code, chọn Page, IG 60 ngày, không lộ token, UI)`);
process.exit(fails ? 1 : 0);
