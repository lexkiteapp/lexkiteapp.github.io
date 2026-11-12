// Test hồi quy "mọi tài nguyên Admin dùng chung cho TẤT CẢ admin" (owner 03/11):
//  · admin A thêm khóa API → admin B thấy (chỉ last4); B xóa → A mất; người không phải admin → 403 (khóa, trạng thái chung, dấu thay đổi)
//  · /api/admin-shared: get/set/patch dùng chung, kiểm giá trị, ghi admin_log (ai/lúc nào), email luôn che (a***@…), không bí mật
//  · dấu thay đổi (stamp) báo khu vực do admin KHÁC sửa; Cài đặt cảnh báo (admin-prefs) hợp nhất giữa các admin
//  · web/js/admin-sync.js: thăm dò khi tab hiện, chỉ báo khi người khác sửa, không tải lại khi đang gõ
// Chạy: node scripts/test/admin-share.mjs (không mạng, không tài khoản thật – D1 giả node:sqlite, token Firebase giả)
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const store = new Map();
globalThis.caches = { default: { async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); } } };
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return exec(q, this.args).results[0] || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async email => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
const GKEY = 'AIzaSyA_TEST_gemini_key_number_one_1111', ENCK = Buffer.alloc(32, 5).toString('base64');
globalThis.fetch = async url => { url = String(url); if (url.includes('googleapis.com/robot') || url.includes('securetoken') || url.includes('service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) }; return new Response('{}', { status: 200 }); };
// Hai admin (chuỗi giả cho test – KHÔNG phải email thật) + 1 người lạ
const A_MAIL = 'alice.admin@example.test', B_MAIL = 'bob.admin@example.test', X_MAIL = 'stranger@example.test';
const ENV = { DB, ADMIN_EMAILS: A_MAIL + ',' + B_MAIL, KEYS_ENC_KEY: ENCK };
const log = console.log; console.log = (...a) => { if (!/^(gemini|ai error)/.test(String(a[0]))) log(...a); };
const KEYS = await import(new URL('../../functions/api/keys.js', import.meta.url));
const SH = await import(new URL('../../functions/api/admin-shared.js', import.meta.url));
const PREFS = await import(new URL('../../functions/api/admin-prefs.js', import.meta.url));
const A = await tok(A_MAIL), B = await tok(B_MAIL), X = await tok(X_MAIL);
const post = (mod, path) => async (tk, body, origin = 'https://lexkite.com') => {
  const r = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.7', Origin: origin, ...(tk ? { Authorization: 'Bearer ' + tk } : {}) }, body: JSON.stringify(body) }), env: ENV, waitUntil: () => {} });
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ } return { s: r.status, j, text };
};
const keys = post(KEYS, 'keys'), shared = post(SH, 'admin-shared'), prefs = post(PREFS, 'admin-prefs');
const ALL = [], SHR = [];
const rec = async (p) => { const r = await p; ALL.push(r.text); if (/"ns"|"areas"|"shared"/.test(r.text)) SHR.push(r.text); return r; };

// 1) Khóa API: A thêm → B thấy; B xóa → A mất
let kid;
{
  const add = await rec(keys(A, { op: 'add', lines: GKEY, provider: 'gemini', label: 'chung', test: false }));
  ok(add.s === 200 && add.j.added && add.j.added.length === 1, 'A thêm khóa');
  kid = add.j.added[0].id;
  const lb = await rec(keys(B, { op: 'list' }));
  const row = (lb.j.rows || []).find(r => r.id === kid);
  ok(lb.s === 200 && row && row.last4 === GKEY.slice(-4), 'B đọc thấy khóa A vừa thêm (last4)');
  ok(!ALL.join('').includes(GKEY), 'không phản hồi nào lộ khóa');
  const aud = await rec(keys(B, { op: 'audit', page: 0 }));
  ok((aud.j.rows || []).some(r => String(r.email || '').toLowerCase() === A_MAIL || /alice|a\*\*\*/.test(JSON.stringify(r))), 'nhật ký khóa có người thêm (A)');
  const del = await rec(keys(B, { op: 'delete', ids: [kid], confirm: 'DELETE' }));
  ok(del.s === 200, 'B xóa khóa của A');
  const la = await rec(keys(A, { op: 'list' }));
  ok(!(la.j.rows || []).some(r => r.id === kid), 'A không còn thấy khóa đã bị B xóa');
}
// 2) Người không phải admin → 403 ở mọi cửa chia sẻ
{
  for (const body of [{ op: 'list' }, { op: 'add', lines: GKEY }, { op: 'delete', ids: ['x'], confirm: 'DELETE' }]) { const r = await rec(keys(X, body)); ok(r.s === 403 && !r.j.rows, 'người lạ keys.' + body.op + ' → 403'); }
  for (const body of [{ op: 'get', ns: 'ytck' }, { op: 'set', ns: 'clipviews', v: [] }, { op: 'patch', ns: 'ytck', k: 'c1', v: [1] }, { op: 'stamp' }]) { const r = await rec(shared(X, body)); ok(r.s === 403, 'người lạ shared.' + body.op + ' → 403'); }
  ok((await shared(null, { op: 'stamp' })).s === 403, 'không token → 403');
  ok((await shared(A, { op: 'stamp' }, 'https://evil.example')).s === 403, 'Origin lạ → 403');
  const r = await rec(prefs(X, { op: 'get' })); ok(r.s === 403, 'người lạ admin-prefs → 403');
}
// 3) Trạng thái chung: A ghi → B đọc; patch bản đồ không đè nhau; kiểm giá trị; che email
{
  const v = [{ name: 'Chờ duyệt', q: 'status=pending' }];
  const s1 = await rec(shared(A, { op: 'set', ns: 'clipviews', v }));
  ok(s1.s === 200 && s1.j.by === 'a***@example.test', 'A ghi clipviews, "by" đã che');
  const g1 = await rec(shared(B, { op: 'get', ns: 'clipviews' }));
  ok(g1.j.v && g1.j.v[0].name === 'Chờ duyệt' && g1.j.by === 'a***@example.test', 'B đọc thấy bản của A + ai sửa');
  await rec(shared(A, { op: 'patch', ns: 'ytck', k: 'clip-1', v: [0, 2] }));
  await rec(shared(B, { op: 'patch', ns: 'ytck', k: 'clip-2', v: [1] }));
  const g2 = (await rec(shared(A, { op: 'get', ns: 'ytck' }))).j.v;
  ok(g2['clip-1'].join() === '0,2' && g2['clip-2'].join() === '1', 'A và B sửa 2 mục khác nhau → cả hai còn');
  await rec(shared(B, { op: 'patch', ns: 'ytck', k: 'clip-1', v: null }));
  ok(!('clip-1' in (await rec(shared(A, { op: 'get', ns: 'ytck' }))).j.v), 'B xóa mục → A mất mục đó');
  for (const [body, why] of [[{ op: 'set', ns: 'nope', v: [] }, 'ns lạ'], [{ op: 'set', ns: 'clipviews', v: [{ name: 'x'.repeat(41), q: '' }] }, 'tên quá dài'], [{ op: 'patch', ns: 'ytck', k: 'a b', v: [1] }, 'khóa mục sai'],
    [{ op: 'patch', ns: 'ytck', k: 'c', v: ['x'] }, 'giá trị sai'], [{ op: 'set', ns: 'ytck', v: {} }, 'set trên map'], [{ op: 'patch', ns: 'clipviews', k: 'c', v: [] }, 'patch trên doc']]) {
    const r = await rec(shared(A, body)); ok(r.s === 400, 'từ chối: ' + why);
  }
  const lg = sql.prepare("SELECT email, op, ok FROM admin_log WHERE op LIKE 'shared.%'").all();
  ok(lg.some(r => r.email === A_MAIL && r.op === 'shared.set.clipviews' && r.ok === 1) && lg.some(r => r.email === B_MAIL && r.op === 'shared.patch.ytck'), 'admin_log ghi ai đã sửa gì');
  ok(SHR.length > 3 && !SHR.join('').toLowerCase().includes('alice.admin') && !SHR.join('').toLowerCase().includes('bob.admin'), 'phản hồi dùng chung/stamp không in email đầy đủ (chỉ a***@…)');
}
// 4) Dấu thay đổi: B thấy khu vực do A sửa (đã che), me = chính mình
{
  const add = await rec(keys(A, { op: 'add', lines: 'AIzaSyB_TEST_gemini_key_number_two_2222', provider: 'gemini', test: false }));
  const st = await rec(shared(B, { op: 'stamp' }));
  ok(st.s === 200 && st.j.me === 'b***@example.test' && st.j.areas.keys && st.j.areas.keys.by === 'a***@example.test' && st.j.areas.keys.at > 0, 'stamp.keys: A sửa, B thấy (đã che)');
  ok(st.j.areas['shared:clipviews'] && st.j.areas['shared:ytck'], 'stamp có các khu vực chia sẻ');
  ok(!st.text.includes('AIzaSyB_TEST'), 'stamp không lộ khóa');
  void add;
}
// 5) Cảnh báo quản trị dùng chung: A đổi → B thấy (trước đây theo từng email)
{
  const set = await rec(prefs(A, { op: 'set', pref: { tab: 'keys', lang: 'vi', theme: 'dark', autoLogoutMin: 30, alertTypes: ['js_error'], jsErrorThreshold: 77, quotaThresholdPct: 90 } }));
  ok(set.s === 200, 'A lưu cài đặt');
  const gb = await rec(prefs(B, { op: 'get' }));
  ok(gb.j.pref.alertTypes.join() === 'js_error' && gb.j.pref.jsErrorThreshold === 77 && gb.j.pref.quotaThresholdPct === 90, 'B thấy ngưỡng/loại cảnh báo do A đặt');
  ok(gb.j.pref.theme === 'auto' && gb.j.pref.tab === 'overview', 'giao diện/tab vẫn là của riêng B');
  ok(gb.j.shared && gb.j.shared.by === 'a***@example.test', 'B biết ai đặt');
  const nb = sql.prepare("SELECT COUNT(*) AS c FROM config WHERE k = 'adm_shared:alerts'").get().c; ok(nb === 1, 'một bản chung duy nhất');
}
// 6) admin-sync.js (máy khách): thăm dò chỉ khi tab hiện; chỉ báo khi người khác sửa
{
  let stamp = { me: 'b***@example.test', areas: { keys: { at: 100, by: 'a***@example.test' } } }, calls = 0, hidden = false, typing = false; const timers = [], got = [];
  const doc = { hidden: false, body: { appendChild() {} }, createElement: () => ({ setAttribute() {}, style: {} }), addEventListener() {}, removeEventListener() {}, get activeElement() { return typing ? { tagName: 'INPUT' } : null; } };
  Object.defineProperty(doc, 'hidden', { get: () => hidden });
  const win = { firebase: { auth: () => ({ currentUser: { getIdToken: async () => 'tok' } }) }, document: doc, setInterval: f => timers.push(f), clearInterval() {}, setTimeout: () => 0, clearTimeout() {},
    fetch: async (u, o) => { calls++; return { ok: true, json: async () => stamp }; }, JSON, Promise };
  win.window = win; win.firebase = win.firebase; vm.runInNewContext(fs.readFileSync(new URL('../../web/js/admin-sync.js', import.meta.url), 'utf8'), win);
  const box = { isConnected: true, contains: () => typing };
  const tick = async () => { await timers[0](); await new Promise(r => setImmediate(r)); };
  const stop = win.AdminSync.watch(['keys'], (a, p) => got.push(a + ':' + p.by), { box, S: s => s }); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r));
  ok(got.length === 0 && calls === 1, 'lần đầu chỉ ghi mốc, không báo');
  stamp = { ...stamp, areas: { keys: { at: 200, by: 'b***@example.test' } } }; await tick();
  ok(got.length === 0, 'chính mình sửa → không báo/không tải lại');
  stamp = { ...stamp, areas: { keys: { at: 300, by: 'a***@example.test' } } }; typing = true; await tick();
  ok(got.length === 0, 'đang gõ trong ô nhập → hoãn');
  typing = false; await tick();
  ok(got.join() === 'keys:a***@example.test', 'admin khác sửa → onChange đúng 1 lần với email đã che');
  await tick(); ok(got.length === 1, 'không báo lặp khi không có thay đổi mới');
  hidden = true; const c0 = calls; stamp = { ...stamp, areas: { keys: { at: 400, by: 'a***@example.test' } } }; await tick(); ok(calls === c0 && got.length === 1, 'tab ẩn → không thăm dò');
  hidden = false; await tick(); ok(got.length === 2, 'tab hiện lại → bắt kịp thay đổi');
  stop();
  const src = fs.readFileSync(new URL('../../web/js/admin-sync.js', import.meta.url), 'utf8'); ok(/45000/.test(src), 'chu kỳ 45 s');
}
// 7) Không còn nơi nào giữ tài nguyên admin theo trình duyệt (trừ giao diện cá nhân)
{
  const vid = fs.readFileSync(new URL('../../web/js/admin-video.js', import.meta.url), 'utf8'), clip = fs.readFileSync(new URL('../../web/js/admin-clips.js', import.meta.url), 'utf8'), soc = fs.readFileSync(new URL('../../web/js/admin-social.js', import.meta.url), 'utf8');
  ok(/AdminSync\.store\('ytck'\)\.patch/.test(vid) && /AdminSync\.store\('clipviews'\)/.test(clip) && /AdminSync\.store\('socused'\)/.test(soc), 'danh sách kiểm / chế độ xem / bài đã dùng ghi lên kho chung');
  for (const f of ['admin-keys', 'admin-drive']) ok(/AdminSync\.watch\(\['(keys|drive)'\]/.test(fs.readFileSync(new URL(`../../web/js/${f}.js`, import.meta.url), 'utf8')), f + ' tự làm mới khi admin khác sửa');
}
console.log = log;
if (fails) { console.log(`✗ admin-share: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ admin-share: ${n} kiểm tra – A thêm/B thấy, B xóa/A mất, người lạ 403, kho chung + audit + che email, dấu thay đổi, đồng bộ máy khách`);
