// Đồng bộ "gói" (functions/api/sync.js – docs/CAPACITY.md §Kiến trúc B1) + ngoại tuyến trước (offline-first) – chạy MÃ THẬT:
// máy khách web/js/sync.js trong jsdom (2 "máy", kho cục bộ sống qua "khởi động lại") ↔ máy chủ functions/api/sync.js trên D1 node:sqlite có đếm dòng ghi.
// Kiểm: di chuyển lười dòng cũ → 1 dòng 'pack' · 1 lượt đẩy = 1 dòng ghi · đẩy lại y hệt / mở app không đổi = 0 dòng ghi · thay đổi ngoại tuyến sống qua khởi động lại ·
// 2 máy sửa cùng thẻ → hội tụ theo hoạt động gần nhất bất kể thứ tự · ghi đồng thời không mất dữ liệu · gói quá lớn → dòng riêng · SYNC_PACK=0 (rollback) vẫn đúng.
// Chạy: node scripts/test/sync-pack.mjs
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { JSDOM } from 'jsdom';
import { sqliteD1, meter } from '../capacity/meter.mjs';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const S = await import('../../functions/api/sync.js');
const be = sqliteD1(), M = meter(be.raw), DB = M.db;
let ENV = { DB };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async sub => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, sub, email: sub + '@x.y', email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async u => String(u).includes('googleapis') ? new Response(JSON.stringify({ keys: [jwk] })) : new Response('{}', { status: 404 });
let offline = false, hold = null;
const server = async (url, init) => {
  if (offline) throw new TypeError('Failed to fetch');
  const req = new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { ...init.headers, Origin: 'https://lexkite.com', 'CF-Connecting-IP': '192.0.2.' + (1 + Math.floor(Math.random() * 200)) }, body: init.body });
  if (hold) await hold;
  const r = await S.onRequestPost({ request: req, env: ENV });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
};
const writes = async fn => { M.begin('w'); await fn(); return M.end().writes; };
const rows = uid => be.sql.prepare('SELECT k FROM docs WHERE uid = ? ORDER BY k').all(uid).map(r => r.k);

// ---------- máy khách: web/js/sync.js thật, kho cục bộ = đối tượng bền (giả lập IndexedDB) ----------
const card = (word, last, extra = {}) => ({ word, vi: 'nghĩa ' + word, srs: { last, due: last + 864e5, iv: 1 }, added: 1_700_000_000_000, ...extra });
async function device(uid, disk) {
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="toast"></div><div id="modal" hidden><div id="modalBox"></div></div></body></html>', { url: 'https://lexkite.com/app/#/home', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window;
  w.matchMedia = q => ({ matches: false, media: q, addEventListener() {}, removeEventListener() {} });
  w.t = k => k; w.I18N = { lang: () => 'vi' };
  disk.store = disk.store || {}; disk.cards = disk.cards || {};
  w.Core = {
    Store: { get: async (k, d) => (k in disk.store ? structuredClone(disk.store[k]) : d), set: async (k, v) => { disk.store[k] = structuredClone(v); }, isExtension: false, sandbox: false },
    Cards: { all: async () => structuredClone(disk.cards), save: async c => { disk.cards = structuredClone(c); }, make: x => ({ ...x }) },
    Stats: { get: async () => disk.store.stats || { days: {} } },
  };
  w.Game = { get: async () => disk.store.game || { xp: 0, days: {} } };
  w.IELTS_DATA = { INDEX: {} };
  w.fetch = server;
  w.CompressionStream = globalThis.CompressionStream; w.DecompressionStream = globalThis.DecompressionStream; w.Response = globalThis.Response; w.Blob = globalThis.Blob;
  w.UI = { $: s => w.document.querySelector(s), esc: s => String(s), toast: () => {}, modal: () => w.document.getElementById('modalBox'), closeModal: () => {} };
  w.App = { state: { cards: {} }, updateChrome: () => {}, load: async () => {}, route: () => {}, need: async () => {} };
  w.FIREBASE_CONFIG = { apiKey: 'test' };
  w.confirm = () => true; w.scrollTo = () => {};
  let authCb = null; const token = await tok(uid);
  const auth = { onAuthStateChanged: cb => { authCb = cb; cb(null); }, signInWithPopup: async () => {}, signOut: async () => authCb && authCb(null) };
  w.firebase = { initializeApp: () => ({}), auth: Object.assign(() => auth, { GoogleAuthProvider: class { setCustomParameters() {} } }) };
  w.eval(fs.readFileSync('web/js/sync.js', 'utf8'));
  await sleep(1300); // sync.js khởi động Firebase sau 1,2 s
  const idle = async () => { for (let i = 0; i < 200 && w.Sync.status === 'syncing'; i++) await sleep(10); await sleep(20); };
  const dev = {
    w, disk,
    signIn: async () => { authCb({ uid, email: uid + '@x.y', displayName: uid, getIdToken: async () => token }); await sleep(30); await idle(); },
    edit: async (word, last, extra) => { disk.cards[word] = card(word, last, extra); w.Sync.schedule(); },
    hide: async () => { Object.defineProperty(w.document, 'hidden', { value: true, configurable: true }); w.document.dispatchEvent(new w.Event('visibilitychange')); await sleep(30); await idle(); Object.defineProperty(w.document, 'hidden', { value: false, configurable: true }); },
    open: async () => { await w.Sync.now(); await idle(); },
    close: () => w.close(),
  };
  return dev;
}

// ---------- 1) người dùng cũ (dòng riêng meta + cards_i) → di chuyển lười sang gói ----------
{
  const diskA = {}, A = await device('alice', diskA);
  for (let i = 0; i < 12; i++) diskA.cards['w' + i] = card('w' + i, 1_700_000_000_000 + i);
  ENV = { DB, SYNC_PACK: '0' }; // máy chủ cũ: dòng riêng
  await A.signIn();
  const legacy = rows('alice');
  ok(legacy.length > 5 && legacy.includes('meta') && !legacy.includes('pack'), 'SYNC_PACK=0: lưu kiểu cũ (mỗi tài liệu 1 dòng): ' + legacy.length + ' dòng');
  ENV = { DB };
  await A.edit('w3', 1_800_000_000_000);
  const w1 = await writes(() => A.hide());
  ok(rows('alice').join() === 'pack', 'lượt đẩy đầu tiên gộp mọi dòng cũ vào 1 dòng pack: ' + rows('alice').join());
  const logical = await S.userDocs(DB, 'alice');
  ok(logical.length === legacy.length && logical.some(d => d.k === 'meta'), 'tài liệu logic còn đủ sau di chuyển (' + logical.length + ')');
  ok(w1 >= 1, 'di chuyển: ghi gói + xoá dòng cũ (1 lần): ' + w1 + ' dòng');
  // lượt thường: sửa 5 thẻ ở các gói khác nhau → 1 dòng ghi
  for (const k of ['w1', 'w5', 'w7', 'w9', 'w11']) await A.edit(k, 1_800_000_000_100);
  const w2 = await writes(() => A.hide());
  ok(w2 === 1, 'sửa 5 thẻ (nhiều gói thẻ) → 1 dòng ghi (trước: 1/tài liệu): ' + w2);
  // mở app lại, không đổi gì → 0 dòng ghi (trước: luôn ghi lại meta)
  A.close(); const A1 = await device('alice', diskA); await A1.signIn(); A1.close(); // lần mở đầu: gộp/chuẩn hoá thống kê có thể đổi meta 1 lần
  const A2 = await device('alice', diskA);
  const snap = Object.fromEntries((await S.userDocs(DB, 'alice')).map(d => [d.k, d]));
  const before = new Map([...M.queries].map(([k, v]) => [k, v.writes]));
  const w3 = await writes(() => A2.signIn());
  if (w3) for (const [k, v] of M.queries) if (v.writes !== (before.get(k) || 0)) console.log('  ghi:', k.slice(0, 120), v.writes - (before.get(k) || 0));
  if (w3) for (const d of await S.userDocs(DB, 'alice')) if (!snap[d.k] || snap[d.k].body !== d.body) console.log('  đổi:', d.k, snap[d.k] && snap[d.k].h, d.h, (snap[d.k] || {}).body?.slice(0, 200), '\n   →', d.body.slice(0, 200));
  ok(w3 === 0, 'mở app (khởi động lại) không đổi gì → 0 dòng ghi docs: ' + w3);
  // đẩy lại y hệt (thử lại do mạng) → 0
  const body = JSON.stringify({ op: 'push', docs: Object.fromEntries((await S.userDocs(DB, 'alice')).map(d => [d.k, { h: d.h, body: d.body }])) });
  const tk = await tok('alice'); await sleep(21); // giới hạn 1 lượt/20 s nằm ở Cache API – ở test không có caches → không chặn
  const r = await S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body }), env: ENV });
  const j = await r.json(); ok(r.status === 200 && j.same === true, 'đẩy lại y hệt → bỏ qua (khóa bất biến = hash)');
  A2.close();
}

// ---------- 2) ngoại tuyến: thay đổi chưa gửi sống qua khởi động lại ----------
{
  const disk = {}; let B = await device('bob', disk);
  for (let i = 0; i < 6; i++) disk.cards['b' + i] = card('b' + i, 1_700_000_000_000);
  await B.signIn();
  offline = true;
  await B.edit('offline1', 1_800_000_000_000); await B.hide();
  ok(!(await S.userDocs(DB, 'bob')).some(d => d.body.includes('offline1')), 'ngoại tuyến: chưa lên máy chủ');
  B.close(); offline = false;
  B = await device('bob', disk); await B.signIn(); // khởi động lại → kéo + đẩy
  const has = async w => { const docs = await S.userDocs(DB, 'bob'); for (const d of docs) { const o = JSON.parse(d.body); const txt = o.z ? await new Response(new Blob([Uint8Array.from(atob(o.z), c => c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).text() : (o.json || ''); if (txt.includes(w)) return true; } return false; };
  ok(await has('offline1'), 'sau khởi động lại: thẻ tạo lúc ngoại tuyến đã đồng bộ');
  ok(disk.cards.offline1, 'kho cục bộ vẫn giữ thẻ');
  B.close();
}

// ---------- 3) 2 máy sửa cùng thẻ → hội tụ, không phụ thuộc thứ tự ----------
for (const order of [['P', 'Q'], ['Q', 'P']]) {
  const uid = 'carol' + order.join(''), dp = {}, dq = {};
  const P = await device(uid, dp); await P.signIn();
  for (let i = 0; i < 5; i++) await P.edit('c' + i, 1_700_000_000_000);
  await P.hide();
  const Q = await device(uid, dq); await Q.signIn();
  ok(Object.keys(dq.cards).length === 5, `[${order}] máy 2 nhận đủ thẻ`);
  await P.edit('c2', 1_800_000_000_500, { note: 'P-new' }); // P mới hơn
  await Q.edit('c2', 1_800_000_000_100, { note: 'Q-old' });
  await Q.edit('q-only', 1_800_000_000_000);
  await P.edit('p-only', 1_800_000_000_000);
  const first = order[0] === 'P' ? P : Q, second = order[0] === 'P' ? Q : P;
  await first.hide(); await second.open(); await second.hide(); await first.open();
  for (const [name, d] of [['P', dp], ['Q', dq]]) {
    ok(d.cards.c2 && d.cards.c2.note === 'P-new', `[${order}] máy ${name}: thẻ sửa ở 2 nơi → bản hoạt động gần nhất thắng`);
    ok(d.cards['q-only'] && d.cards['p-only'], `[${order}] máy ${name}: thẻ mới ở cả 2 máy đều còn`);
  }
  ok(JSON.stringify(Object.keys(dp.cards).sort()) === JSON.stringify(Object.keys(dq.cards).sort()), `[${order}] 2 máy hội tụ cùng tập thẻ`);
  P.close(); Q.close();
}

// ---------- 4) ghi đồng thời: lượt 2 chen giữa lúc lượt 1 đọc và ghi → không mất tài liệu nào ----------
{
  const tk = await tok('dave'), call = docs => S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body: JSON.stringify({ op: 'push', docs }) }), env: ENV });
  await call({ meta: { h: 'm0', body: '{"chunks":32}' } });
  const realBatch = DB.batch.bind(DB); let once = true;
  DB.batch = async list => { if (once) { once = false; await call({ cards_5: { h: 'h5', body: '{"json":"{}"}' } }); } return realBatch(list); };
  const r = await call({ cards_9: { h: 'h9', body: '{"json":"{}"}' } });
  DB.batch = realBatch;
  const ks = (await S.userDocs(DB, 'dave')).map(d => d.k).join();
  ok(r.status === 200 && ks === 'cards_5,cards_9,meta', 'chen ngang → ghi có điều kiện thất bại → đọc lại, gộp, đủ cả 2: ' + ks);
}

// ---------- 5) gói quá lớn → dòng riêng; 6) SYNC_PACK=0 (rollback) trên người đã có gói ----------
{
  const tk = await tok('erin'), call = (docs, env = ENV) => S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body: JSON.stringify({ op: 'push', docs }) }), env });
  const pull = async (have = {}) => (await (await S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body: JSON.stringify({ op: 'pull', have }) }), env: ENV })).json()).docs;
  await call({ meta: { h: 'm1', body: '{"chunks":32}' }, cards_1: { h: 'a1', body: '{"json":"{\\"x\\":1}"}' } });
  ok(rows('erin').join() === 'pack', 'người mới → gói');
  const big = c => '{"json":"' + c.repeat(950_000) + '"}';
  ok((await call({ cards_3: { h: 'big3', body: big('y') } })).status === 200 && rows('erin').join() === 'pack', 'tài liệu 950 KB vẫn vừa gói');
  await call({ cards_2: { h: 'big', body: big('x') } });
  ok(rows('erin').includes('cards_2') && rows('erin').includes('pack'), 'gói vượt PACK_MAX (1,8 MB) → tài liệu đó ghi dòng riêng: ' + rows('erin').join());
  let d = await pull({}); ok(d.cards_2 && d.cards_3 && d.cards_1 && d.meta, 'kéo: gói + dòng riêng đều có');
  await call({ cards_1: { h: 'a2', body: '{"json":"{\\"x\\":2}"}' } }, { DB, SYNC_PACK: '0' });
  d = await pull({ cards_2: 'big', cards_3: 'big3' });
  ok(d.cards_1 && d.cards_1.json === '{"x":2}' && !d.cards_2, 'SYNC_PACK=0: dòng riêng mới hơn đè lên gói, chỉ trả tài liệu khác hash');
  const p = await pull({ meta: 'm1', cards_1: 'a2', cards_2: 'big', cards_3: 'big3' });
  ok(Object.keys(p).length === 0, 'kéo khi đã có đủ → không trả gì');
}

// ---------- 7) chi phí đọc: kéo = 1 truy vấn liệt kê (1 dòng gói) ----------
{
  M.begin('r'); await S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + await tok('alice') }, body: JSON.stringify({ op: 'pull', have: {} }) }), env: ENV });
  const c = M.end(); ok(c.queries <= 4, 'kéo: ≤ 4 truy vấn (người dùng, ghi sổ, docs): ' + c.queries);
}

// ---------- 8) bộ định tuyến mảnh (_shard.js): N = 1 mặc định; mảnh 1 = binding DB_S1 ----------
{
  const Sh = await import('../../functions/api/_shard.js');
  ok(Sh.pickShard({ DB }, 'x') === 0 && Sh.docsDb({ DB }, 0) === DB, 'mặc định: mọi người ở env.DB');
  const s1 = sqliteD1(), env2 = { DB, DB_S1: s1.raw, SYNC_SHARDS_OPEN: '0,1' };
  const picks = new Set(Array.from({ length: 40 }, (_, i) => Sh.pickShard(env2, 'user' + i)));
  ok(picks.has(0) && picks.has(1), 'mở 2 mảnh → người mới chia theo băm uid');
  ok(Sh.pickShard({ DB, SYNC_SHARDS_OPEN: '0,1' }, 'user1') === 0, 'mảnh chưa có binding → không chọn');
  let thrown = false; try { Sh.docsDb({ DB }, 3); } catch (e) { thrown = e.message === 'shard-missing'; } ok(thrown, 'người ở mảnh thiếu binding → lỗi, không ghi nhầm mảnh');
  be.sql.prepare("INSERT INTO users (uid, email, name, created, seen, plat, n, shard) VALUES ('frank', 'f@x.y', 'F', 1, 1, 'web', 1, 1)").run();
  const tk = await tok('frank');
  const r = await S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body: JSON.stringify({ op: 'push', docs: { meta: { h: 'mf', body: '{"chunks":32}' } } }) }), env: env2 });
  ok(r.status === 200 && s1.sql.prepare("SELECT k FROM docs WHERE uid = 'frank'").all().length === 1 && !rows('frank').length, 'users.shard = 1 → dữ liệu học ghi ở mảnh 1, không ở DB chính');
  const p = await (await S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk }, body: JSON.stringify({ op: 'pull', have: {} }) }), env: env2 })).json();
  ok(p.docs && p.docs.meta, 'kéo đọc từ mảnh 1');
}

console.log(fails ? `✗ sync-pack: ${fails}/${n} lỗi` : `✓ sync-pack: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
