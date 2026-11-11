// Add-on Chrome ↔ tài khoản: từ lưu bằng add-on phải lên tài khoản kể cả khi KHÔNG có máy nào khác ghi Drive/D1.
// Lỗi gốc (test chéo client PR #721): ở chế độ Drive, syncExtension() chỉ chạy trong mergeIn, mà mergeIn chỉ chạy khi máy KHÁC đổi tệp Drive
// → từ lưu ở add-on không bao giờ tới tài khoản. Chạy MÃ THẬT web/js/sync.js + web/js/sync-drive.js trong jsdom, cầu nối add-on = đoạn mã THẬT
// trích từ extension/content.js (get/set gộp), Drive GIẢ đếm lượt ghi + đơn vị quota, D1 = functions/api/sync.js thật trên node:sqlite.
// Kiểm: Drive – lưu ở add-on → có trong tệp Drive của tài khoản (Đồng bộ ngay / quay lại tab / rời trang / add-on chạy muộn) · lượt thứ 2 không đổi = 0 lượt ghi,
// 0 lượt set add-on · xóa ở add-on → dấu xóa lên tài khoản; xóa ở máy khác → add-on bỏ thẻ · 429/backoff + hết ngân sách + ngoại tuyến: không dội API,
// dữ liệu chờ trên máy rồi tự gửi · cài đặt lưu thẳng (không Sync.schedule) vẫn được gửi khi rời trang · D1: từ của add-on đi cùng lượt gửi.
// Chạy: node scripts/test/sync-ext-drive.mjs
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { sqliteD1, meter } from '../capacity/meter.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = await import('../../functions/api/sync.js');
const be = sqliteD1(), ENV = { DB: meter(be.raw).db };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const idTok = async sub => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, sub, email: sub + '@x.y', email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async u => String(u).includes('service_accounts') ? new Response(JSON.stringify({ keys: [jwk] })) : new Response('{}', { status: 404 });

// ---------- Drive giả: đếm đơn vị + lượt GHI (PATCH/POST) theo người dùng ----------
const COST = { list: 100, get: 5, download: 200, update: 50, create: 50, delete: 50 };
const drive = { users: new Map(), tokens: new Map(), units: new Map(), writes: new Map(), calls: new Map(), offline: false, fail: null, seq: 0 };
const grant = uid => { const t = 'ya29.' + uid + '.' + (++drive.seq); drive.tokens.set(t, uid); return t; };
const unitsOf = uid => drive.units.get(uid) || 0, writesOf = uid => drive.writes.get(uid) || 0, callsOf = uid => drive.calls.get(uid) || 0;
const fileOf = (uid, name = 'lexkite-sync.v2.json.gz') => [...(drive.users.get(uid) || new Map()).values()].find(f => f.name === name);
const jres = (st, o) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } });
async function driveFetch(url, init = {}) {
  if (drive.offline) throw new TypeError('Failed to fetch');
  const uid = drive.tokens.get(String((init.headers || {}).Authorization || '').replace('Bearer ', ''));
  if (!uid) return jres(401, { error: { status: 'UNAUTHENTICATED', errors: [{ reason: 'authError' }] } });
  drive.calls.set(uid, callsOf(uid) + 1);
  if (drive.fail) { const f = drive.fail; drive.fail = null; return jres(f, { error: { errors: [{ reason: 'rateLimitExceeded' }] } }); }
  const u = new URL(url), m = (init.method || 'GET').toUpperCase(), files = drive.users.get(uid) || new Map(); drive.users.set(uid, files);
  const spend = op => drive.units.set(uid, unitsOf(uid) + COST[op]);
  const wrote = () => drive.writes.set(uid, writesOf(uid) + 1);
  const id = (u.pathname.match(/\/files\/([^/]+)$/) || [])[1], upload = u.pathname.startsWith('/upload/');
  if (m === 'GET' && !id) { spend('list'); const name = (u.searchParams.get('q').match(/name contains '([^']+)'/) || [])[1] || ''; return jres(200, { files: [...files.values()].filter(f => f.name.includes(name)).map(f => ({ id: f.id, name: f.name, version: String(f.version) })) }); }
  if (m === 'GET' && u.searchParams.get('alt') === 'media') { spend('download'); const f = files.get(id); return f ? new Response(f.bytes) : jres(404, {}); }
  if (m === 'GET') { spend('get'); const f = files.get(id); return f ? jres(200, { version: String(f.version) }) : jres(404, { error: { errors: [{ reason: 'notFound' }] } }); }
  if (m === 'PATCH' && upload) { spend('update'); wrote(); const f = files.get(id); if (!f) return jres(404, {}); f.bytes = Buffer.from(await new Response(init.body).arrayBuffer()); f.version++; return jres(200, { id, version: String(f.version), size: String(f.bytes.length) }); }
  if (m === 'POST') {
    spend('create'); wrote();
    const raw = Buffer.from(await new Response(init.body).arrayBuffer()), b = '--' + init.headers['Content-Type'].split('boundary=')[1];
    const p1 = raw.indexOf(b), p2 = raw.indexOf(b, p1 + 1), meta = JSON.parse(raw.slice(raw.indexOf('\r\n\r\n', p1) + 4, raw.lastIndexOf('\r\n', p2)).toString());
    const start = raw.indexOf('\r\n\r\n', p2) + 4, end = raw.indexOf('\r\n' + b + '--');
    const f = { id: 'f' + (++drive.seq), name: meta.name, version: 1, bytes: raw.subarray(start, end) }; files.set(f.id, f);
    return jres(200, { id: f.id, version: String(f.version), size: String(f.bytes.length) });
  }
  return jres(400, {});
}
const driveSnap = async uid => { const f = fileOf(uid); if (!f) return null; const env = JSON.parse(await new Response(new Blob([f.bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()); return JSON.parse(env.data); };
let d1Pushes = 0;
const d1Server = async (url, init) => {
  if (drive.offline) throw new TypeError('Failed to fetch');
  if (/"op":"push"/.test(init.body)) d1Pushes++;
  const req = new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { ...init.headers, Origin: 'https://lexkite.com', 'CF-Connecting-IP': '192.0.2.' + (1 + Math.floor(Math.random() * 200)) }, body: init.body });
  const r = await S.onRequestPost({ request: req, env: ENV });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
};

// ---------- Cầu nối add-on: đoạn mã THẬT của extension/content.js (lexkite.com ↔ chrome.storage.local) ----------
const CS = fs.readFileSync('extension/content.js', 'utf8');
const b0 = CS.indexOf("    const KEYS = ['cards', 'stats', 'deleted'];"), b1 = CS.indexOf("    try { window.postMessage({ lkBridge: 'hello'");
if (b0 < 0 || b1 < b0) { console.error('✗ sync-ext-drive: không tìm thấy cầu nối trong extension/content.js (đổi cấu trúc → cập nhật test)'); process.exit(1); }
const BRIDGE = CS.slice(b0, b1);

const card = (word, last, extra = {}) => ({ word, vi: 'nghĩa ' + word, srs: { last, due: last + 864e5, interval: 1 }, added: 1_700_000_000_000, ...extra });
async function device(uid, disk, { drive: on = true, cfg = {}, ext = null } = {}) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast"></div></body></html>', { url: 'https://lexkite.com/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
  w.t = k => k; w.I18N = { lang: () => 'vi' };
  disk.store = disk.store || {}; disk.cards = disk.cards || {}; disk.ls = disk.ls || {};
  for (const [k, v] of Object.entries(disk.ls)) w.localStorage.setItem(k, v);
  w.localStorage.setItem('lk.syncDrive', on ? '1' : '0');
  const persistLs = () => { for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); disk.ls[k] = w.localStorage.getItem(k); } };
  w.Core = {
    Store: { get: async (k, d) => (k in disk.store ? structuredClone(disk.store[k]) : d), set: async (k, v) => { disk.store[k] = structuredClone(v); }, isExtension: false, sandbox: false },
    Cards: { all: async () => structuredClone(disk.cards), save: async c => { disk.cards = structuredClone(c); }, make: x => ({ ...x }) },
    Stats: { get: async () => disk.store.stats || { days: {} } },
  };
  w.Game = { get: async () => disk.store.game || { xp: 0, days: {} } };
  w.IELTS_DATA = { INDEX: {} };
  w.LK_SYNC = { drive: true, every: 40, d1Every: 40, ...cfg };
  w.fetch = (url, init) => /googleapis\.com\/(upload\/)?drive\//.test(String(url)) ? driveFetch(url, init) : d1Server(url, init);
  for (const k of ['CompressionStream', 'DecompressionStream', 'Response', 'Blob', 'TextEncoder', 'TextDecoder']) w[k] = globalThis[k];
  Object.defineProperty(w, 'crypto', { value: globalThis.crypto, configurable: true });
  // jsdom chưa điền event.source/origin cho postMessage → điền như trình duyệt (cùng cửa sổ)
  w.postMessage = data => setTimeout(() => w.dispatchEvent(new w.MessageEvent('message', { data, origin: w.location.origin, source: w })), 0);
  w.UI = { icon: n => `<svg data-i="${n}"></svg>`, addIcons: () => {}, glyph: e => e, $: s => w.document.querySelector(s), esc: s => String(s), toast: () => {}, modal: () => w.document.body, closeModal: () => {} };
  w.App = { state: { cards: {} }, updateChrome: () => {}, load: async () => {}, route: () => {}, need: async () => {} };
  w.FIREBASE_CONFIG = { apiKey: 'test' };
  w.confirm = () => true; w.scrollTo = () => {};
  let authCb = null; const token = await idTok(uid);
  const user = { uid, email: uid + '@x.y', displayName: uid, providerData: [{ providerId: 'google.com' }], getIdToken: async () => token, reauthenticateWithPopup: async () => ({ user, credential: { accessToken: grant(uid) } }) };
  const auth = { currentUser: null, onAuthStateChanged: cb => { authCb = cb; cb(null); }, getRedirectResult: async () => null,
    signInWithPopup: async p => { auth.currentUser = user; authCb(user); return { user, credential: { accessToken: p.scopes.includes('https://www.googleapis.com/auth/drive.appdata') ? grant(uid) : '' } }; },
    signOut: async () => { auth.currentUser = null; authCb && authCb(null); } };
  class GoogleAuthProvider { constructor() { this.scopes = []; this.params = {}; } addScope(s) { this.scopes.push(s); } setCustomParameters(p) { this.params = p; } }
  w.firebase = { initializeApp: () => ({}), auth: Object.assign(() => auth, { GoogleAuthProvider }) };
  w.eval(fs.readFileSync('web/js/sync-drive.js', 'utf8'));
  w.eval(fs.readFileSync('web/js/sync.js', 'utf8'));
  // Add-on cài trên máy: chrome.storage.local giả + cầu nối thật
  const attach = () => {
    const sget = async k => { const o = {}; for (const x of [].concat(k)) if (x in ext.store) o[x] = structuredClone(ext.store[x]); return o; };
    const sset = async o => { ext.sets++; if (process.env.DBG) console.log("SET", Object.keys(o).join(), new Error().stack.split("\n").length); for (const [k, v] of Object.entries(o)) ext.store[k] = structuredClone(v); };
    const chrome = { runtime: { id: 'ext', getManifest: () => ({ version: '9.9.9' }) } };
    const bind = (t, ev, fn) => t.addEventListener(ev, fn);
    new w.Function('window', 'location', 'chrome', 'bind', 'sget', 'sset', 'pickLang', 'UI_LANG', 'ML', BRIDGE)(w, w.location, chrome, bind, sget, sset, l => l, 'vi', () => 'vi');
    w.postMessage({ lkBridge: 'hello', version: '9.9.9' }, w.location.origin);
  };
  if (ext && !ext.late) attach();
  await sleep(1300);
  const idle = async () => { await sleep(30); for (let i = 0; i < 400 && (w.Sync.status === 'syncing'); i++) await sleep(10); await sleep(60); persistLs(); };
  const setHidden = v => { Object.defineProperty(w.document, 'hidden', { value: v, configurable: true }); w.document.dispatchEvent(new w.Event('visibilitychange')); };
  return {
    w, disk, idle, attach: async () => { attach(); await sleep(50); await idle(); },
    signIn: async () => { await w.Sync.signIn('google'); await idle(); },
    resume: async () => { auth.currentUser = user; authCb(user); await idle(); },
    now: async () => { await w.Sync.now(); await idle(); },
    hide: async () => { setHidden(true); await idle(); setHidden(false); await idle(); },
    show: async () => { setHidden(false); await idle(); },
    st: async () => ((disk.store.driveSync || {})[uid]) || {},
    close: () => { persistLs(); w.close(); },
  };
}
const extOf = (cards = {}) => ({ store: { cards, stats: { days: {} }, deleted: {} }, sets: 0 });
// Add-on lưu từ (như background.js: thẻ mới + added = bây giờ)
const extSave = (ext, word, t) => { ext.store.cards = { ...ext.store.cards, [word]: card(word, t, { added: t }) }; };
const extDelete = (ext, word, t) => { const c = { ...ext.store.cards }; delete c[word]; ext.store.cards = c; ext.store.deleted = { ...ext.store.deleted, [word]: t }; };

// ---------- 1) Drive: lưu ở add-on → lên tài khoản mà KHÔNG máy nào khác ghi ----------
const T = 1_900_000_000_000;
const diskA = {}, extA = extOf({ seed: card('seed', T - 9) });
{
  const A = await device('amy', diskA, { ext: extA });
  await A.signIn();
  ok(A.w.Sync.mode === 'drive', 'đăng nhập có quyền Drive → chế độ drive: ' + A.w.Sync.mode);
  ok((await driveSnap('amy')).cards.seed, 'lần đầu: thẻ sẵn trong add-on lên Drive');
  // (a) "Đồng bộ ngay" – Drive không đổi (version y nguyên) → trước bản sửa: mergeIn không chạy, từ add-on bị bỏ lại
  const v0 = fileOf('amy').version; extSave(extA, 'kite', T + 1);
  await A.now();
  ok(fileOf('amy').version > v0, 'Drive được ghi dù không máy nào khác đổi tệp');
  ok((await driveSnap('amy')).cards.kite, 'từ lưu ở add-on có trong tệp Drive của tài khoản (Đồng bộ ngay)');
  ok(diskA.cards.kite, 'từ add-on có trong kho web trên máy');
  // (b) Lượt 2 không đổi gì → 0 lượt ghi Drive, 0 lượt ghi add-on (không vòng ghi)
  const w0 = writesOf('amy'), s0 = extA.sets, u0 = unitsOf('amy');
  await A.now();
  ok(writesOf('amy') === w0, 'lượt 2 không đổi → 0 lượt ghi Drive: ' + (writesOf('amy') - w0));
  ok(extA.sets === s0, 'lượt 2 không đổi → không ghi lại add-on: ' + (extA.sets - s0));
  ok(unitsOf('amy') - u0 === 5, 'lượt 2 không đổi = đúng 1 get (5 đv): ' + (unitsOf('amy') - u0));
  // (c) Quay lại tab sau khi lưu từ ở trang khác → kéo về + gửi theo nhịp LK_SYNC.every (không cần thao tác nào trên web)
  extSave(extA, 'breeze', T + 2); await A.show(); await sleep(120); await A.idle();
  ok((await driveSnap('amy')).cards.breeze, 'quay lại tab → từ mới của add-on tự lên Drive theo nhịp gom sẵn có');
  // (d) Rời trang khi chỉ add-on đổi → lượt đẩy khi rời trang mang theo từ mới
  extSave(extA, 'gust', T + 3); await A.hide();
  ok((await driveSnap('amy')).cards.gust, 'rời trang → từ mới của add-on lên Drive');
  // (e) Không đổi gì, ẩn/hiện tab nhiều lần → 0 lượt gọi Drive
  const c0 = callsOf('amy'); for (let i = 0; i < 3; i++) await A.hide();
  ok(callsOf('amy') === c0, 'ẩn/hiện tab không có gì mới → 0 lượt gọi Drive: ' + (callsOf('amy') - c0));
  // (f) Xóa ở add-on → dấu xóa lên tài khoản, thẻ biến mất trên Drive
  extDelete(extA, 'breeze', T + 10); await A.now();
  const sn = await driveSnap('amy');
  ok(!sn.cards.breeze && sn.deleted.breeze === T + 10, 'xóa ở add-on → dấu xóa tới tệp Drive, thẻ bị bỏ');
  ok(!diskA.cards.breeze, 'xóa ở add-on → web trên máy cũng bỏ thẻ');
  A.close();
}

// ---------- 2) Chiều ngược: máy khác xóa/thêm → add-on nhận dấu xóa + thẻ mới ----------
{
  const diskB = {}, B = await device('amy', diskB); await B.signIn();
  ok(diskB.cards.kite && diskB.cards.gust, 'máy 2 thấy các từ lưu bằng add-on ở máy 1');
  diskB.cards.newB = card('newB', T + 20); diskB.store.deleted = { ...(diskB.store.deleted || {}), gust: T + 21 }; delete diskB.cards.gust;
  B.w.Sync.schedule(); await B.hide(); B.close();
  const A = await device('amy', diskA, { ext: extA }); await A.resume();
  ok(extA.store.cards.newB && !extA.store.cards.gust && extA.store.deleted.gust === T + 21, 'máy khác xóa/thêm → add-on nhận thẻ mới và dấu xóa');
  ok(!(await driveSnap('amy')).cards.gust, 'add-on không hồi sinh thẻ đã xóa (dấu xóa thắng)');
  A.close();
}

// ---------- 3) Add-on chạy muộn hơn lượt đồng bộ khởi động (cầu nối "hello" tới sau) ----------
{
  const disk = {}, ext = { ...extOf({ late1: card('late1', T + 30, { added: T + 30 }) }), late: true };
  const L = await device('lia', disk, { ext }); await L.signIn();
  ok(!(await driveSnap('lia')).cards.late1, '(trước khi add-on sẵn sàng: chưa thấy từ)');
  await L.attach(); await sleep(120); await L.idle();
  ok((await driveSnap('lia')).cards.late1, 'add-on sẵn sàng sau lúc khởi động → từ của add-on vẫn lên Drive');
  L.close();
}

// ---------- 4) Quota/backoff: 429 → lùi, không dội API; dữ liệu chờ trên máy rồi tự gửi ----------
{
  const disk = {}, ext = extOf(), Q = await device('quinn', disk, { ext }); await Q.signIn();
  extSave(ext, 'q1', T + 40); drive.fail = 429; await Q.now();
  const s1 = await Q.st();
  ok(s1.fail === 1 && s1.nextAt > Date.now() + 15e3, '429 → fail=1, chờ lùi trước khi thử lại');
  ok(disk.cards.q1, 'từ add-on đã vào kho trên máy dù Drive từ chối');
  const c0 = callsOf('quinn');
  extSave(ext, 'q2', T + 41); await Q.show(); await sleep(150); await Q.hide();
  ok(callsOf('quinn') === c0, 'trong thời gian lùi: quay lại tab / rời trang không gọi Drive: ' + (callsOf('quinn') - c0));
  ok(disk.cards.q2, 'từ mới của add-on vẫn vào kho trên máy trong thời gian lùi');
  const st = await Q.st(); st.nextAt = 0; disk.store.driveSync.quinn = st; // hết thời gian lùi
  await Q.hide(); await Q.now();
  const sn = await driveSnap('quinn');
  ok(sn.cards.q1 && sn.cards.q2 && (await Q.st()).fail === 0, 'hết lùi → gửi đủ từ đang chờ, xóa bộ đếm lỗi');
  // Ngoại tuyến: không lỗi, dữ liệu trên máy; có mạng lại → gửi
  drive.offline = true; extSave(ext, 'q3', T + 42); await Q.now();
  ok(disk.cards.q3 && Q.w.Sync.status === 'ok', 'ngoại tuyến → từ add-on an toàn trên máy, trạng thái "tạm nghỉ" (không lỗi)');
  drive.offline = false; const st2 = await Q.st(); st2.nextAt = 0; disk.store.driveSync.quinn = st2; await Q.now();
  ok((await driveSnap('quinn')).cards.q3, 'có mạng lại → từ add-on lên Drive');
  Q.close();
}

// ---------- 5) Hết ngân sách ngày → không vượt trần, không ghi; dữ liệu trên máy ----------
{
  const disk = {}, ext = extOf({ b0: card('b0', T) }), C = await device('cap', disk, { ext, cfg: { cap: 160 } }); await C.signIn(); // list 100 + create 50
  extSave(ext, 'b1', T + 50); await C.now(); // get 5 → 155; update 50 vượt 160
  ok(unitsOf('cap') <= 160, 'đơn vị/ngày ≤ trần (160): ' + unitsOf('cap'));
  ok(disk.cards.b1 && /tạm nghỉ/.test(C.w.Sync.msg), 'hết ngân sách → từ add-on chờ trên máy, báo "tạm nghỉ"');
  C.close();
}

// ---------- 6) Cài đặt lưu thẳng (không gọi Sync.schedule) vẫn lên tài khoản khi rời trang ----------
{
  const disk = {}, P = await device('pia', disk); await P.signIn();
  disk.store.settings = { theme: 'dark' }; disk.store.settingsAt = T + 60; // như App.saveSettings: không lên lịch đồng bộ
  await P.hide();
  const sn = await driveSnap('pia');
  ok(sn.settings && sn.settings.theme === 'dark' && sn.settingsAt === T + 60, 'cài đặt không qua Sync.schedule vẫn lên Drive khi rời trang');
  disk.store.game = { xp: 77, days: {} }; await P.hide();
  ok((await driveSnap('pia')).game.xp === 77, 'XP/game đổi không qua Sync.schedule vẫn lên Drive khi rời trang');
  P.close();
}

// ---------- 7) D1: từ lưu ở add-on đi cùng lượt gửi, không cần máy khác; không đổi → 0 lượt gửi ----------
{
  const disk = {}, ext = extOf({ d0: card('d0', T) }), E = await device('dan', disk, { drive: false, ext }); await E.signIn();
  ok(E.w.Sync.mode === 'd1', 'chế độ D1');
  extSave(ext, 'd1word', T + 70); await E.show(); await sleep(150); await E.idle();
  const p0 = d1Pushes; await E.hide(); await E.hide();
  ok(d1Pushes === p0, 'D1: ẩn/hiện tab không có gì mới → 0 lượt gửi: ' + (d1Pushes - p0));
  E.close();
  const disk2 = {}, F = await device('dan', disk2, { drive: false }); await F.signIn();
  ok(disk2.cards.d1word && disk2.cards.d0, 'D1: máy khác kéo về được từ vừa lưu bằng add-on');
  F.close();
  const diskX = {}, extX = extOf(), X = await device('dex', diskX, { drive: false, ext: extX }); await X.signIn();
  extSave(extX, 'dpush', T + 80); diskX.cards.local1 = card('local1', T + 81); X.w.Sync.schedule(); await sleep(150); await X.idle();
  X.close();
  const diskY = {}, Y = await device('dex', diskY, { drive: false }); await Y.signIn();
  ok(diskY.cards.dpush && diskY.cards.local1, 'D1: lượt gửi do web lên lịch mang theo từ mới của add-on');
  Y.close();
}

if (fails) { console.log(`✗ sync-ext-drive: ${fails}/${n} kiểm tra trượt`); process.exit(1); }
console.log(`✓ sync-ext-drive: ${n} kiểm tra đạt`);
process.exit(0);
