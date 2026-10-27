// Đồng bộ local-first qua Google Drive appDataFolder (docs/SYNC-DRIVE.md) – chạy MÃ THẬT web/js/sync.js + web/js/sync-drive.js trong jsdom
// (nhiều "máy", kho cục bộ bền qua khởi động lại) ↔ Drive GIẢ trong bộ nhớ (đếm đơn vị quota như Google) + máy chủ D1 thật (functions/api/sync.js trên node:sqlite).
// Không dùng tài khoản thật. Kiểm: gộp xác định (giao hoán/lũy đẳng, dấu xóa) · người mới không tạo dòng D1 · 2 máy hội tụ · mở lại không đổi = 1 lượt get (5 đv)
// · ngoại tuyến → lùi cấp số nhân rồi tự gửi · token hết hạn → không popup khi không chạm; chạm 1 lần → gia hạn (prompt=none), giới hạn 1 lần/45 phút
// · ngân sách ngày không bao giờ vượt · bỏ ô Drive → quay về D1 + nút bật · di chuyển D1 → Drive giữ đủ dữ liệu, máy chưa cập nhật vẫn thấy · xóa tài khoản xóa tệp Drive.
// Chạy: node scripts/test/sync-drive.mjs
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { sqliteD1, meter } from '../capacity/meter.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = await import('../../functions/api/sync.js');
const be = sqliteD1(), DB = meter(be.raw).db, ENV = { DB };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const idTok = async sub => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, sub, email: sub + '@x.y', email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async u => String(u).includes('service_accounts') ? new Response(JSON.stringify({ keys: [jwk] })) : new Response('{}', { status: 404 });
const d1Rows = uid => be.sql.prepare('SELECT k FROM docs WHERE uid = ?').all(uid).length;
let d1Calls = 0;

// ---------- Drive giả (v3: list/get/alt=media/PATCH media/POST multipart/DELETE) ----------
const COST = { list: 100, get: 5, download: 200, update: 50, create: 50, delete: 50 };
const drive = { users: new Map(), tokens: new Map(), units: new Map(), offline: false, fail: null, noScope: new Set(), seq: 0 };
const grant = uid => { const t = 'ya29.' + uid + '.' + (++drive.seq); drive.tokens.set(t, uid); return t; };
const unitsOf = uid => drive.units.get(uid) || 0;
const fileOf = uid => [...(drive.users.get(uid) || new Map()).values()][0];
const jres = (st, o) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } });
async function driveFetch(url, init = {}) {
  if (drive.offline) throw new TypeError('Failed to fetch');
  const uid = drive.tokens.get(String((init.headers || {}).Authorization || '').replace('Bearer ', ''));
  if (!uid) return jres(401, { error: { status: 'UNAUTHENTICATED', errors: [{ reason: 'authError' }] } });
  if (drive.noScope.has(uid)) return jres(403, { error: { status: 'PERMISSION_DENIED', errors: [{ reason: 'insufficientPermissions' }] } });
  if (drive.fail) { const f = drive.fail; drive.fail = null; return jres(f, { error: { errors: [{ reason: 'rateLimitExceeded' }] } }); }
  const u = new URL(url), m = (init.method || 'GET').toUpperCase(), files = drive.users.get(uid) || new Map(); drive.users.set(uid, files);
  const spend = op => drive.units.set(uid, unitsOf(uid) + COST[op]);
  const id = (u.pathname.match(/\/files\/([^/]+)$/) || [])[1];
  if (m === 'GET' && !id) { spend('list'); ok(u.searchParams.get('spaces') === 'appDataFolder', 'chỉ liệt kê trong appDataFolder'); return jres(200, { files: [...files.values()].map(f => ({ id: f.id, version: String(f.version) })) }); }
  if (m === 'GET' && u.searchParams.get('alt') === 'media') { spend('download'); const f = files.get(id); return f ? new Response(f.bytes) : jres(404, {}); }
  if (m === 'GET') { spend('get'); const f = files.get(id); return f ? jres(200, { version: String(f.version) }) : jres(404, { error: { errors: [{ reason: 'notFound' }] } }); }
  if (m === 'PATCH') { spend('update'); const f = files.get(id); if (!f) return jres(404, {}); f.bytes = Buffer.from(await new Response(init.body).arrayBuffer()); f.version++; return jres(200, { id, version: String(f.version) }); }
  if (m === 'DELETE') { spend('delete'); files.delete(id); return new Response(null, { status: 204 }); }
  if (m === 'POST') {
    spend('create');
    const raw = Buffer.from(await new Response(init.body).arrayBuffer()), b = '--' + init.headers['Content-Type'].split('boundary=')[1];
    const p1 = raw.indexOf(b), p2 = raw.indexOf(b, p1 + 1), meta = JSON.parse(raw.slice(raw.indexOf('\r\n\r\n', p1) + 4, raw.lastIndexOf('\r\n', p2)).toString());
    ok(meta.parents && meta.parents[0] === 'appDataFolder' && meta.name === 'lexkite-sync.v2.json.gz', 'tạo tệp trong appDataFolder');
    const start = raw.indexOf('\r\n\r\n', p2) + 4, end = raw.indexOf('\r\n' + b + '--');
    const f = { id: 'f' + (++drive.seq), version: 1, bytes: raw.slice(start, end) }; files.set(f.id, f);
    return jres(200, { id: f.id, version: '1' });
  }
  return jres(400, {});
}
const driveSnap = async uid => { const f = fileOf(uid); return f ? JSON.parse(await new Response(new Blob([f.bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text()) : null; };
const d1Server = async (url, init) => {
  if (drive.offline) throw new TypeError('Failed to fetch');
  d1Calls++;
  const req = new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { ...init.headers, Origin: 'https://lexkite.com', 'CF-Connecting-IP': '192.0.2.' + (1 + Math.floor(Math.random() * 200)) }, body: init.body });
  const r = await S.onRequestPost({ request: req, env: ENV });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
};

// ---------- máy khách ----------
const card = (word, last, extra = {}) => ({ word, vi: 'nghĩa ' + word, srs: { last, due: last + 864e5, interval: 1 }, added: 1_700_000_000_000, ...extra });
async function device(uid, disk, { drive: on = true, cfg = {} } = {}) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast"></div><div id="modal" hidden><div id="modalBox"></div></div></body></html>', { url: 'https://lexkite.com/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
  w.t = k => k; w.I18N = { lang: () => 'vi' };
  disk.store = disk.store || {}; disk.cards = disk.cards || {}; disk.ls = disk.ls || {};
  for (const [k, v] of Object.entries(disk.ls)) w.localStorage.setItem(k, v);
  w.localStorage.setItem('lk.syncDrive', on ? '1' : '0');
  const persistLs = () => { for (let i = 0; i < w.localStorage.length; i++) { const k = w.localStorage.key(i); disk.ls[k] = w.localStorage.getItem(k); } for (const k of Object.keys(disk.ls)) if (w.localStorage.getItem(k) === null) delete disk.ls[k]; };
  w.Core = {
    Store: { get: async (k, d) => (k in disk.store ? structuredClone(disk.store[k]) : d), set: async (k, v) => { disk.store[k] = structuredClone(v); }, isExtension: false, sandbox: false },
    Cards: { all: async () => structuredClone(disk.cards), save: async c => { disk.cards = structuredClone(c); }, make: x => ({ ...x }) },
    Stats: { get: async () => disk.store.stats || { days: {} } },
  };
  w.Game = { get: async () => disk.store.game || { xp: 0, days: {} } };
  w.IELTS_DATA = { INDEX: {} };
  w.LK_SYNC = { drive: true, ...cfg };
  w.fetch = (url, init) => /googleapis\.com\/(upload\/)?drive\//.test(String(url)) ? driveFetch(url, init) : d1Server(url, init);
  for (const k of ['CompressionStream', 'DecompressionStream', 'Response', 'Blob', 'TextEncoder', 'TextDecoder']) w[k] = globalThis[k];
  w.UI = { icon: n => `<svg data-i="${n}"></svg>`, addIcons: () => {}, glyph: e => e, $: s => w.document.querySelector(s), esc: s => String(s), toast: () => {}, modal: () => w.document.getElementById('modalBox'), closeModal: () => {} };
  w.App = { state: { cards: {} }, updateChrome: () => {}, load: async () => {}, route: () => {}, need: async () => {} };
  w.FIREBASE_CONFIG = { apiKey: 'test' };
  w.confirm = () => true; w.scrollTo = () => {};
  let authCb = null; const token = await idTok(uid);
  const stat = { popups: [], scopes: [] };
  const user = { uid, email: uid + '@x.y', displayName: uid, providerData: [{ providerId: 'google.com' }], getIdToken: async () => token,
    reauthenticateWithPopup: async p => { stat.popups.push(p.params); return { user, credential: { accessToken: p.scopes.includes('https://www.googleapis.com/auth/drive.appdata') ? grant(uid) : '' } }; } };
  const auth = { currentUser: null, onAuthStateChanged: cb => { authCb = cb; cb(null); }, getRedirectResult: async () => null,
    signInWithPopup: async p => { stat.scopes.push(...p.scopes); auth.currentUser = user; authCb(user); return { user, credential: { accessToken: drive.declineAtLogin ? '' : (p.scopes.includes('https://www.googleapis.com/auth/drive.appdata') ? grant(uid) : '') } }; },
    signOut: async () => { auth.currentUser = null; authCb && authCb(null); } };
  class GoogleAuthProvider { constructor() { this.scopes = []; this.params = {}; } addScope(s) { this.scopes.push(s); } setCustomParameters(p) { this.params = p; } }
  w.firebase = { initializeApp: () => ({}), auth: Object.assign(() => auth, { GoogleAuthProvider }) };
  w.eval(fs.readFileSync('web/js/sync-drive.js', 'utf8')); // trên web sync.js tải lười tệp này
  w.eval(fs.readFileSync('web/js/sync.js', 'utf8'));
  await sleep(1300);
  const idle = async () => { await sleep(30); for (let i = 0; i < 400 && w.Sync.status === 'syncing'; i++) await sleep(10); await sleep(30); persistLs(); };
  const resume = async () => { auth.currentUser = user; authCb(user); await idle(); }; // mở app khi phiên Firebase còn (không popup)
  return {
    w, disk, stat, idle,
    signIn: async () => { await w.Sync.signIn('google'); await idle(); },
    resume,
    edit: async (word, last, extra) => { disk.cards[word] = card(word, last, extra); w.Sync.schedule(); },
    hide: async () => { Object.defineProperty(w.document, 'hidden', { value: true, configurable: true }); w.document.dispatchEvent(new w.Event('visibilitychange')); await idle(); Object.defineProperty(w.document, 'hidden', { value: false, configurable: true }); },
    tap: async () => { w.dispatchEvent(new w.Event('pointerdown')); await idle(); },
    st: async () => ((disk.store.driveSync || {})[uid]) || {},
    close: () => { persistLs(); w.close(); },
  };
}

// ---------- 1) Gộp xác định: giao hoán + lũy đẳng + dấu xóa (kiểm tính chất, ngẫu nhiên có hạt giống) ----------
{
  const disk = {}, D = await device('prop', disk, { drive: false }); const m = D.w.Sync._m;
  let seed = 7; const rnd = k => (seed = (seed * 1103515245 + 12345) % 2147483648) % k;
  const randCards = () => { const o = {}; for (let i = 0; i < 6; i++) { const w = 'w' + rnd(8); o[w] = card(w, 1_700_000_000_000 + rnd(3) * 1000, { contexts: rnd(2) ? [{ text: 'c' + rnd(4) }] : [], note: 'n' + rnd(3) }); } return o; };
  const randGame = () => ({ xp: rnd(50), days: { ['2026-10-0' + rnd(3)]: { xp: rnd(9) } }, total: { review: rnd(9) }, best: { match: 10 + rnd(5) }, badges: { ['b' + rnd(3)]: rnd(5) }, freezes: rnd(3), frozen: { ['d' + rnd(3)]: 1 }, readDone: { ['r' + rnd(3)]: rnd(5) } });
  let comm = 0, idem = 0, gcomm = 0;
  for (let i = 0; i < 300; i++) {
    const a = randCards(), b = randCards(), del = rnd(2) ? { w1: 1_700_000_001_500 } : {};
    if (m.stable(m.mergeCards(a, b, del)) === m.stable(m.mergeCards(b, a, del))) comm++;
    if (m.stable(m.mergeCards(a, a)) === m.stable(a)) idem++;
    const ga = randGame(), gb = randGame();
    if (m.stable(m.mergeGame(ga, gb)) === m.stable(m.mergeGame(gb, ga)) && m.stable(m.mergeStats({ days: { x: rnd(5) } }, { days: { x: rnd(5) } })) !== '') gcomm++;
  }
  ok(comm === 300, 'mergeCards giao hoán 300/300 (kể cả hòa giờ hoạt động): ' + comm);
  ok(idem === 300, 'mergeCards lũy đẳng: ' + idem);
  ok(gcomm === 300, 'mergeGame giao hoán: ' + gcomm);
  const dd = m.mergeCards({ a: card('a', 100) }, { b: card('b', 100) }, { a: 1_800_000_000_000 });
  ok(!dd.a && dd.b, 'dấu xóa mới hơn hoạt động cuối → thẻ bị bỏ ở mọi máy');
  D.close();
}

// ---------- 2) Người mới: quyền Drive hỏi ở màn đăng nhập, 0 dòng D1, tạo đúng 1 tệp ----------
const diskA = {}, diskA2 = {};
{
  const A = await device('ann', diskA);
  for (let i = 0; i < 20; i++) diskA.cards['a' + i] = card('a' + i, 1_700_000_000_000 + i);
  await A.signIn();
  ok(A.stat.scopes.includes('https://www.googleapis.com/auth/drive.appdata'), 'scope drive.appdata xin ngay ở popup đăng nhập Google');
  ok(A.w.Sync.mode === 'drive', 'đăng nhập có quyền Drive → chế độ drive: ' + A.w.Sync.mode);
  ok(d1Rows('ann') === 0, 'người mới không tạo dòng D1 nào: ' + d1Rows('ann'));
  const sn = await driveSnap('ann');
  ok(sn && sn.v === 2 && Object.keys(sn.cards).length === 20, 'ảnh chụp v2 trên Drive đủ 20 thẻ');
  ok(unitsOf('ann') <= 155, 'lượt đầu ≤ list + create (150 đv): ' + unitsOf('ann'));
  ok(A.stat.popups.length === 0, 'không popup nào ngoài màn đăng nhập');
  // mở lại, không đổi gì → chỉ 1 lượt get (5 đv), không tải, không ghi
  A.close(); const u0 = unitsOf('ann'); const A1 = await device('ann', diskA); await A1.resume();
  ok(unitsOf('ann') - u0 === 5, 'mở app không đổi gì = 5 đơn vị (1 get): ' + (unitsOf('ann') - u0));
  // sửa nhiều lần trong phiên → gom 1 lượt ghi khi rời trang
  for (let i = 0; i < 5; i++) await A1.edit('a' + i, 1_800_000_000_000 + i);
  const u1 = unitsOf('ann'); await A1.hide();
  ok(unitsOf('ann') - u1 === 55, '5 thay đổi → 1 get + 1 update (55 đv): ' + (unitsOf('ann') - u1));
  A1.close();
}

// ---------- 3) Máy thứ 2 + sửa đồng thời → hội tụ bất kể thứ tự ----------
{
  const A = await device('ann', diskA), B = await device('ann', diskA2);
  await A.resume(); await B.signIn();
  ok(Object.keys(diskA2.cards).length === 20, 'máy 2 kéo đủ thẻ từ Drive: ' + Object.keys(diskA2.cards).length);
  await A.edit('same', 1_900_000_000_100, { note: 'A' }); await B.edit('same', 1_900_000_000_200, { note: 'B' });
  await A.edit('onlyA', 1_900_000_000_000); await B.edit('onlyB', 1_900_000_000_000);
  diskA2.store.deleted = { a19: 1_950_000_000_000 }; // B xóa thẻ a19
  await B.hide(); await A.hide(); const dbg = unitsOf('ann'); const rr = await B.w.Sync.now(); await B.idle(); if (process.env.DBG) console.log('now→', rr, unitsOf('ann') - dbg, JSON.stringify(await B.st()), B.w.Sync.mode, fileOf('ann').version);
  const ka = Object.keys(diskA.cards).sort().join(), kb = Object.keys(diskA2.cards).sort().join();
  ok(ka === kb, 'hai máy cùng tập thẻ sau 3 lượt: ' + ka + ' | ' + kb);
  ok(diskA.cards.same.note === 'B' && diskA2.cards.same.note === 'B', 'thẻ sửa ở 2 máy → bản hoạt động muộn hơn thắng ở cả 2');
  ok(diskA.cards.onlyA && diskA.cards.onlyB && !diskA.cards.a19, 'thêm ở mỗi máy giữ đủ, thẻ bị xóa biến mất ở máy kia');
  A.close(); B.close();
}

// ---------- 4) Ngoại tuyến → lùi cấp số nhân, có mạng → tự gửi ----------
{
  const A = await device('ann', diskA); await A.resume();
  drive.offline = true; await A.edit('off1', 1_990_000_000_000); await A.hide();
  const s1 = await A.st();
  ok(s1.fail === 1 && s1.nextAt > Date.now() + 15e3, 'mất mạng → fail=1, chờ ≥ 22 s trước khi thử lại');
  ok(A.disk.cards.off1, 'dữ liệu vẫn trên máy khi ngoại tuyến');
  drive.fail = 429; drive.offline = false; await A.w.Sync.now(); await A.idle();
  const s2 = await A.st(); ok(s2.fail === 2 && s2.nextAt - Date.now() > 40e3, '429 → lùi gấp đôi (≥ 45 s): fail=' + s2.fail);
  await A.w.Sync.now(); await A.idle();
  ok((await driveSnap('ann')).cards.off1 && (await A.st()).fail === 0, 'có mạng lại → đã gửi, xóa bộ đếm lỗi');
  A.close();
}

// ---------- 5) Token hết hạn → không popup khi không chạm; 1 chạm → gia hạn prompt=none; giới hạn tần suất ----------
{
  delete diskA.ls['lk.dt'];
  const A = await device('ann', diskA); await A.resume();
  await A.edit('tok1', 1_995_000_000_000); await A.hide();
  ok(A.stat.popups.length === 0, 'không có token → không popup tự phát');
  await A.tap();
  ok(A.stat.popups.length === 1 && A.stat.popups[0].prompt === 'none', 'chạm đầu tiên → 1 popup gia hạn prompt=none');
  ok((await driveSnap('ann')).cards.tok1, 'sau gia hạn đã gửi thay đổi chờ');
  A.disk.ls = {}; A.w.localStorage.removeItem('lk.dt'); await A.edit('tok2', 1_996_000_000_000); await A.hide(); await A.tap(); await A.tap();
  ok(A.stat.popups.length === 1, 'gia hạn tối đa 1 lần/45 phút dù chạm nhiều: ' + A.stat.popups.length);
  A.close();
}

// ---------- 6) Ngân sách ngày không bao giờ vượt ----------
{
  const disk = {}, C = await device('cap', disk, { cfg: { cap: 160 } });
  disk.cards.x = card('x', 1); await C.signIn(); // list 100 + create 50 = 150
  await C.edit('y', 2); await C.hide(); // get 5 → 155, update 50 vượt 160 → chờ
  ok(unitsOf('cap') <= 160 && (await C.st()).units <= 160, 'đơn vị/ngày ≤ trần (160): ' + unitsOf('cap'));
  ok(C.w.Sync.status === 'ok' && /tạm nghỉ/.test(C.w.Sync.msg), 'hết ngân sách → "tạm nghỉ – dữ liệu vẫn trên máy"');
  C.close();
}

// ---------- 7) Bỏ ô Drive ở màn đồng ý → đường D1 cũ + nút bật trong thẻ tài khoản ----------
{
  const disk = {}; drive.declineAtLogin = true;
  const E = await device('eve', disk); disk.cards.e1 = card('e1', 5); await E.signIn(); drive.declineAtLogin = false;
  ok(E.w.Sync.mode === 'd1' && E.w.Sync.driveOffer === true, 'không có token Drive → D1 + driveOffer');
  ok(d1Rows('eve') > 0, 'D1 vẫn sao lưu như cũ (không mất tính năng)');
  const box = E.w.document.createElement('div'); E.w.document.body.appendChild(box); E.w.Sync.renderBox(box);
  ok(/data-acct="drive"/.test(box.innerHTML), 'thẻ tài khoản có nút "Sao lưu vào Google Drive của bạn"');
  await E.w.Sync.driveConnect(); await E.idle();
  ok(E.w.Sync.mode === 'drive' && (await driveSnap('eve')).cards.e1, 'bấm nút → chuyển sang Drive, dữ liệu đủ');
  // token có nhưng quyền bị thu hồi (403 insufficientPermissions) → quay về D1
  drive.noScope.add('eve'); await E.edit('e2', 6); await E.hide();
  ok(E.w.Sync.mode === 'd1' && E.w.Sync.driveOffer, '403 thiếu quyền → về D1, hiện lại nút');
  drive.noScope.delete('eve'); E.close();
}

// ---------- 8) Di chuyển D1 → Drive: người dùng cũ, máy chưa cập nhật vẫn thấy dữ liệu ----------
{
  const dOld = {}, dNew = {};
  const Old = await device('olga', dOld, { drive: false });
  for (let i = 0; i < 8; i++) dOld.cards['o' + i] = card('o' + i, 1_700_000_000_000 + i);
  await Old.signIn(); ok(d1Rows('olga') > 0 && Old.w.Sync.mode === 'd1', 'bản cũ: dữ liệu ở D1');
  const New = await device('olga', dNew); dNew.cards.n1 = card('n1', 1_800_000_000_000);
  await New.signIn();
  const sn = await driveSnap('olga'), st = await New.st();
  ok(sn && Object.keys(sn.cards).length === 9, 'lần đăng nhập đầu sau cập nhật: D1 (8) + máy (1) lên Drive = 9: ' + (sn && Object.keys(sn.cards).length));
  ok(st.on === 1 && st.d1Had === 1, 'đánh dấu đã di chuyển, có cầu nối D1 30 ngày');
  await Old.w.Sync.now(); await Old.idle();
  ok(dOld.cards.n1, 'máy chưa cập nhật (D1) vẫn thấy thẻ mới');
  const c0 = d1Calls; New.close(); const N2 = await device('olga', dNew); await N2.resume();
  ok(d1Calls === c0, 'trong ngày: không gọi D1 thêm (cầu nối ≤ 1 lần/20 giờ)');
  N2.close(); Old.close();
}

// ---------- 9) Xóa tài khoản xóa tệp Drive ----------
{
  const disk = {}, F = await device('fay', disk); disk.cards.f = card('f', 1); await F.signIn();
  ok(fileOf('fay'), 'có tệp trước khi xóa');
  await F.w.SyncDrive.wipe('fay');
  ok(!fileOf('fay') && !F.w.localStorage.getItem('lk.dt'), 'wipe: tệp appData bị xóa, token bị bỏ');
  F.close();
}

console.log(fails ? `✗ sync-drive: ${fails}/${n} lỗi` : `✓ sync-drive: ${n} kiểm tra đạt`);
process.exit(fails ? 1 : 0);
