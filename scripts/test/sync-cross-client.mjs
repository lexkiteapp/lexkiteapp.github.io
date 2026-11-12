// Test CI chéo client (docs/specs/native-apps.md §4, C02): web, add-on, iOS, Android dùng CHUNG một backend + schema.
// Máy chủ giả: handler THẬT functions/api/sync.js trên SQLite bộ nhớ (node:sqlite) + Drive appDataFolder giả; 1 tài khoản test giả
// mỗi kịch bản (không dùng tài khoản thật). Máy khách: mã THẬT web/js/{core,data,game,sync-drive,sync}.js trong jsdom (+ extension/content.js
// làm cầu nối add-on, chrome.storage giả). Kiểm:
//   1) vector native/shared/gen/vectors/sync.json khớp merge JS web (scripts/native/web-ref.mjs) + tính chất giao hoán/lũy đẳng/hấp thụ
//      (chỉ các ca web tự ghi nhận trong nonCommutative – luật settings theo settingsAt khi hòa – được phép không giao hoán)
//   2) mọi ca merge chạy đầu-cuối qua D1 thật: máy B đẩy "remote", máy A có "local" kéo về → đúng "out"
//   3) mọi kịch bản chạy đầu-cuối qua D1 VÀ qua Drive: mỗi client cuối cùng đúng expect, 1 máy mới đăng nhập thấy đúng expect.server
//   4) vector migration.json: script xuất (migration-export.js) chạy lại trên kho giả cho đúng export; expect = core.js thật đọc lại.
// Chạy: node scripts/test/sync-cross-client.mjs   (nhanh, < 30 s, không mạng)
import fs from 'node:fs';
import path from 'node:path';
import { webcrypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import { sqliteD1 } from '../capacity/meter.mjs';
import { webClient, addonClient, messageBus, DOC_KEYS, ORIGIN, LEX_FILES } from '../native/web-ref.mjs';
import { mergeDocs, migrateExpect, runExport, exportScript, NOW } from '../native/gen-sync.mjs';
import { fakeIndexedDB, memStorage } from '../native/fake-idb.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const t0 = Date.now();
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const V = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/gen/vectors/sync.json'), 'utf8'));
const MIG = JSON.parse(fs.readFileSync(path.join(ROOT, 'native/shared/gen/vectors/migration.json'), 'utf8'));
const ref = await webClient({ now: NOW });
const stable = ref.m.stable;
const same = (a, b) => stable(a) === stable(b);
const diff = (a, b) => { for (const k of DOC_KEYS) if (stable(a && a[k]) !== stable(b && b[k])) return `${k}: ${stable(a && a[k]).slice(0, 300)} ≠ ${stable(b && b[k]).slice(0, 300)}`; return ''; };

// ---------- 1) vectors = web merge; properties ----------
ok(V.v === 1 && V.now === NOW && Array.isArray(V.merge) && Array.isArray(V.scenarios), 'sync.json có v/now/merge/scenarios');
ok(V.merge.length >= 30, `≥ 30 ca merge: ${V.merge.length}`);
const ALLOWED_NONCOMM = /^settings: /; // luật settings của web: chỉ thay khi remote.settingsAt > local (hòa → giữ bản máy) – ghi nhận, không "sửa" web
for (const name of V.nonCommutative || []) ok(ALLOWED_NONCOMM.test(name), `ca không giao hoán ngoài luật settings: "${name}"`);
ok(!V.nonIdempotent, 'mọi ca merge lũy đẳng + hấp thụ: ' + (V.nonIdempotent || []).join(', '));
for (const c of V.merge) {
  const out = await mergeDocs(ref, c.local, c.remote);
  ok(same(out, c.out), `merge "${c.name}": vector lệch web – ${diff(out, c.out)}`);
  if (!(V.nonCommutative || []).includes(c.name)) ok(same(await mergeDocs(ref, c.remote, c.local), c.out), `merge "${c.name}" giao hoán`);
  ok(same(await mergeDocs(ref, c.out, c.out), c.out), `merge "${c.name}" lũy đẳng`);
  ok(same(await mergeDocs(ref, c.out, c.remote), c.out) && same(await mergeDocs(ref, c.out, c.local), c.out), `merge "${c.name}" hấp thụ (kéo lại cùng bản không đổi gì)`);
}
const names = V.scenarios.map(s => s.name).join(' | ');
ok(/web edits → iOS reads/.test(names) && /Android offline edits card X \+ deletes card Y/.test(names) && /later edit wins/.test(names), 'đủ 3 kịch bản bắt buộc của spec');

// ---------- máy chủ giả: D1 thật trên SQLite + Drive giả ----------
const S = await import('../../functions/api/sync.js');
const be = sqliteD1(), ENV = { DB: be.raw };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'xc1' };
const b64u = b => Buffer.from(b).toString('base64url');
const idTok = async sub => { const sec = Math.floor(Date.now() / 1000), h = b64u(JSON.stringify({ alg: 'RS256', kid: 'xc1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, sub, email: sub + '@test.invalid', email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async u => (String(u).includes('service_accounts') ? new Response(JSON.stringify({ keys: [jwk] })) : new Response('{}', { status: 404 }));
let ip = 0;
const d1 = async (url, init) => {
  const req = new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { ...init.headers, Origin: 'https://lexkite.com', 'CF-Connecting-IP': '198.51.100.' + (1 + (ip++ % 250)) }, body: init.body });
  const r = await S.onRequestPost({ request: req, env: ENV });
  return new Response(await r.text(), { status: r.status, headers: { 'Content-Type': 'application/json' } });
};
const d1Rows = uid => be.sql.prepare('SELECT COUNT(*) AS n FROM docs WHERE uid = ?').get(uid).n;
const drive = { files: new Map(), tokens: new Map(), seq: 0 }; // uid → Map(id → {name, version, bytes})
const jres = (st, o) => new Response(JSON.stringify(o), { status: st, headers: { 'Content-Type': 'application/json' } });
const grant = uid => { const t = 'ya29.test.' + uid + '.' + (++drive.seq); drive.tokens.set(t, uid); return t; };
async function driveFetch(url, init = {}) {
  const uid = drive.tokens.get(String((init.headers || {}).Authorization || '').replace('Bearer ', ''));
  if (!uid) return jres(401, { error: { status: 'UNAUTHENTICATED', errors: [{ reason: 'authError' }] } });
  const u = new URL(url), m = (init.method || 'GET').toUpperCase(), files = drive.files.get(uid) || new Map(); drive.files.set(uid, files);
  const id = (u.pathname.match(/\/files\/([^/]+)$/) || [])[1], upload = u.pathname.startsWith('/upload/');
  if (m === 'GET' && !id) { const name = (u.searchParams.get('q').match(/name contains '([^']+)'/) || [])[1] || ''; return jres(200, { files: [...files.entries()].filter(([, f]) => f.name.includes(name)).map(([fid, f]) => ({ id: fid, name: f.name, version: String(f.version) })) }); }
  if (m === 'GET' && u.searchParams.get('alt') === 'media') { const f = files.get(id); return f ? new Response(f.bytes) : jres(404, {}); }
  if (m === 'GET') { const f = files.get(id); return f ? jres(200, { version: String(f.version) }) : jres(404, { error: { errors: [{ reason: 'notFound' }] } }); }
  if (m === 'PATCH' && !upload) { const f = files.get(id); if (!f) return jres(404, {}); f.name = JSON.parse(init.body).name; f.version++; return jres(200, { id }); }
  if (m === 'PATCH') { const f = files.get(id); if (!f) return jres(404, {}); f.bytes = Buffer.from(await new Response(init.body).arrayBuffer()); f.version++; return jres(200, { id, version: String(f.version), size: String(f.bytes.length) }); }
  if (m === 'DELETE') { files.delete(id); return new Response(null, { status: 204 }); }
  if (m === 'POST') {
    const raw = Buffer.from(await new Response(init.body).arrayBuffer()), b = '--' + init.headers['Content-Type'].split('boundary=')[1];
    const p1 = raw.indexOf(b), p2 = raw.indexOf(b, p1 + 1), meta = JSON.parse(raw.slice(raw.indexOf('\r\n\r\n', p1) + 4, raw.lastIndexOf('\r\n', p2)).toString());
    if (!(meta.parents && meta.parents[0] === 'appDataFolder')) return jres(400, { error: 'not appDataFolder' });
    const start = raw.indexOf('\r\n\r\n', p2) + 4, end = raw.indexOf('\r\n' + b + '--'), fid = 'f' + (++drive.seq);
    files.set(fid, { name: meta.name, version: 1, bytes: raw.subarray(start, end) });
    return jres(200, { id: fid, version: '1', size: String(end - start) });
  }
  return jres(400, {});
}
const driveDoc = async uid => {
  const f = [...(drive.files.get(uid) || new Map()).values()].find(x => x.name === 'lexkite-sync.v2.json.gz'); if (!f) return null;
  const env = JSON.parse(await new Response(new Blob([f.bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).text());
  const snap = JSON.parse(env.data), o = {}; for (const k of DOC_KEYS) o[k] = snap[k]; return o;
};

// ---------- thiết bị: mã web thật trong node:vm (cửa sổ tối giản, đồng hồ điều khiển được, timer thật) ----------
const SCRIPTS = Object.fromEntries(['web/js/core.js', 'web/js/data.js', ...LEX_FILES, 'web/js/game.js', 'web/js/sync-drive.js', 'web/js/sync.js'].map(f => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
let refLock = Promise.resolve(); // ref (web-ref) là 1 cài đặt dùng chung → tuần tự hoá
const withRef = fn => { const p = refLock.then(fn); refLock = p.catch(() => {}); return p; };
const rawOf = doc => withRef(async () => { ref.reset(NOW); await ref.load(doc); const r = ref.raw(); delete r['lk.syncDrive']; return r; });
const docOfLs = ls => withRef(async () => { ref.reset(NOW); for (const [k, v] of Object.entries(ls)) if (k.startsWith('ielts.')) ref.ls.setItem(k, v); return ref.build(); });
const slimOf = cards => withRef(async () => JSON.parse(JSON.stringify(Object.fromEntries(Object.keys(cards).sort().map(k => [k, ref.lib.slim(cards[k])])))));
async function device(uid, { mode, raw = {}, at = NOW, addon = false }) {
  const clock = { t: at }, ls = memStorage({ ...raw, 'lk.syncDrive': mode === 'drive' ? '1' : '0' }), listeners = {}, timers = new Set();
  const bus = addon ? messageBus() : null;
  const token = await idTok(uid);
  let authCb = null;
  const user = { uid, email: uid + '@test.invalid', displayName: uid, providerData: [{ providerId: 'google.com' }], getIdToken: async () => token,
    reauthenticateWithPopup: async p => ({ user, credential: { accessToken: p.scopes.includes('https://www.googleapis.com/auth/drive.appdata') ? grant(uid) : '' } }) };
  const auth = { currentUser: null, onAuthStateChanged: cb => { authCb = cb; cb(null); }, getRedirectResult: async () => null,
    signInWithPopup: async p => { auth.currentUser = user; authCb(user); return { user, credential: { accessToken: p.scopes.includes('https://www.googleapis.com/auth/drive.appdata') ? grant(uid) : '' } }; }, signOut: async () => {} };
  class GoogleAuthProvider { constructor() { this.scopes = []; this.params = {}; } addScope(x) { this.scopes.push(x); } setCustomParameters(p) { this.params = p; } }
  const noop = () => {};
  const sb = {
    console, Math, JSON, structuredClone, Promise, URL, URLSearchParams, Request, Response, Headers, Blob, CompressionStream, DecompressionStream, TextEncoder, TextDecoder, AbortController, atob, btoa, crypto: globalThis.crypto,
    Date: class extends Date { constructor(...a) { if (a.length) super(...a); else super(clock.t); } static now() { return clock.t; } },
    localStorage: ls, navigator: { onLine: true, language: 'vi' },
    location: { hostname: 'lexkite.com', origin: ORIGIN, protocol: 'https:', host: 'lexkite.com', href: ORIGIN + '/app/#/home', hash: '#/home', search: '', pathname: '/app/' },
    setTimeout: (fn, ms, ...a) => { const id = setTimeout(() => { timers.delete(id); fn(...a); }, ms === 1200 ? 0 : ms); timers.add(id); return id; }, clearTimeout: id => { clearTimeout(id); timers.delete(id); }, setInterval: () => 0, clearInterval: noop,
    addEventListener: (ev, fn) => { (listeners[ev] ||= []).push(fn); }, removeEventListener: (ev, fn) => { listeners[ev] = (listeners[ev] || []).filter(f => f !== fn); },
    document: { hidden: false, addEventListener: noop, removeEventListener: noop, body: { contains: () => false, appendChild: noop }, getElementById: () => null, querySelector: () => null, createElement: () => ({ style: {}, setAttribute: noop, appendChild: noop }), head: { appendChild: noop } },
    t: k => k, I18N: { lang: () => 'vi' }, confirm: () => true, scrollTo: noop, scrollY: 0, requestAnimationFrame: noop, open: noop, matchMedia: q => ({ matches: false, media: q, addEventListener: noop }),
    UI: { icon: () => '', addIcons: noop, glyph: e => e, $: () => null, esc: x => String(x), toast: noop, modal: () => null, closeModal: noop },
    App: { state: { cards: {} }, updateChrome: noop, load: async () => {}, route: noop, need: async () => {} },
    FIREBASE_CONFIG: { apiKey: 'test-only' }, LK_SYNC: { drive: true },
    firebase: { initializeApp: () => ({}), auth: Object.assign(() => auth, { GoogleAuthProvider }) },
    fetch: (url, init) => (/googleapis\.com\/(upload\/)?drive\//.test(String(url)) ? driveFetch(url, init) : d1(url, init)),
  };
  sb.window = sb; sb.self = sb; sb.globalThis = sb;
  vm.createContext(sb);
  const win = vm.runInContext('window', sb);
  const deliver = data => Promise.all((listeners.message || []).map(f => f({ source: win, origin: ORIGIN, data })));
  sb.postMessage = data => (bus ? bus.post('web', data) : void setTimeout(() => deliver(data), 0));
  for (const f of Object.keys(SCRIPTS)) vm.runInContext(SCRIPTS[f], sb, { filename: f });
  let ad = null;
  if (bus) { bus.web = { deliver }; ad = await addonClient(bus, { now: at }); } // add-on cùng máy: content.js THẬT + core.js của add-on (chrome.storage giả)
  for (let i = 0; i < 100 && !authCb; i++) await sleep(5);
  const idle = async () => { await sleep(10); for (let i = 0; i < 800 && sb.Sync.status === 'syncing'; i++) await sleep(5); await sleep(10); if (bus) await bus.idle(); };
  const keyParts = key => (/^[a-z]{2,3}:/.test(key) ? [key.slice(0, key.indexOf(':')), key.slice(key.indexOf(':') + 1)] : ['en', key]);
  const C = sb.Core;
  return {
    sb, clock, ad, user,
    signIn: async () => { await sb.Sync.signIn('google'); await idle(); },
    sync: async t => { clock.t = t; await sb.Sync.now(); await idle(); },
    edit: async (key, patch, t) => { clock.t = t; const [tl, word] = keyParts(key); if (!(await C.Cards.all())[key]) { const lib = tl === 'en' && sb.IELTS_DATA.INDEX[word.toLowerCase()]; await C.Cards.add({ ...(lib || {}), word, ...(tl !== 'en' ? { tl } : {}) }); } const p = JSON.parse(JSON.stringify(patch || {})); await C.Cards.patch(word, c => Object.assign(c, p), tl); },
    remove: async (key, t) => { clock.t = t; const [tl, word] = keyParts(key); await C.Cards.remove(word, tl); },
    doc: () => docOfLs(ls._dump()),
    close: () => { for (const id of timers) clearTimeout(id); timers.clear(); },
  };
}

// ---------- 2) merge vectors end-to-end over the real D1 handler ----------
const pool = async (items, k, fn) => { const out = []; let i = 0; await Promise.all(Array.from({ length: k }, async () => { while (i < items.length) { const j = i++; out[j] = await fn(items[j], j); } })); return out; };
await pool(V.merge, 6, async (c, i) => {
  const uid = `xc-merge-${i}`;
  const B = await device(uid, { mode: 'd1', raw: await rawOf(c.remote) }); await B.signIn();
  ok(d1Rows(uid) > 0, `D1 "${c.name}": máy B đã đẩy lên D1 thật`);
  const A = await device(uid, { mode: 'd1', raw: await rawOf(c.local) }); await A.signIn();
  const got = await A.doc();
  ok(same(got, c.out), `D1 đầu-cuối "${c.name}": ${diff(got, c.out)}`);
  B.close(); A.close();
});

// ---------- 3) scenarios end-to-end over D1 and over Drive ----------
// D1 (pullMerge luôn nhận meta → luôn gộp) phải khớp vector TUYỆT ĐỐI. Drive bỏ qua bước gộp khi tệp không đổi kể từ lần ghi của chính máy đó
// (sync-drive.js once(): remoteVer === st.ver) → máy có thể không nhận lại dấu xoá "trơ" (thẻ cùng khoá vẫn còn, hoạt động mới hơn dấu xoá:
// mergeCards không bao giờ dùng tới). Chỉ đúng phần trơ đó được bỏ khi so ở chế độ Drive; mọi thứ khác so tuyệt đối.
const inert = d => (d ? { ...d, deleted: Object.fromEntries(Object.entries(d.deleted || {}).filter(([k]) => !(d.cards || {})[k])) } : d);
// Lỗi web ĐÃ BIẾT (ca phải còn đỏ; khi web sửa → test báo "bỏ khỏi KNOWN", không thể âm thầm che lỗi). Trống từ #730 (Drive + add-on, 05/11).
const KNOWN = new Set([]);
const check = (mode, sc, who, got, want) => {
  const key = `${mode}|${sc}|${who}`, pass = mode === 'drive' ? same(inert(got), inert(want)) : same(got, want);
  if (KNOWN.has(key)) { ok(!pass, `[${mode}] "${sc}" ${who}: lỗi web đã biết nay đã khớp → bỏ khỏi KNOWN`); if (!pass) console.log(`⚠ lỗi web đã biết [${mode}] "${sc}" ${who}: ${diff(got, want).slice(0, 160)}`); return; }
  ok(pass, `[${mode}] "${sc}" ${who}: ${diff(mode === 'drive' ? inert(got) : got, mode === 'drive' ? inert(want) : want)}`);
};
for (const mode of ['d1', 'drive']) {
  await pool(V.scenarios, 3, async (sc, si) => {
    const uid = `xc-${mode}-${si}`, used = new Set(sc.steps.map(s => s.client)), dev = {};
    dev.web = await device(uid, { mode, at: NOW - 60 * 864e5, addon: used.has('addon') });
    for (const k of ['ios', 'android']) if (used.has(k)) dev[k] = await device(uid, { mode, at: NOW - 60 * 864e5 });
    const signed = new Set();
    for (const s of sc.steps) {
      if (s.client === 'addon' && s.op !== 'sync') { if (s.op === 'delete') await dev.web.ad.remove(s.card, s.at); else await dev.web.ad.edit(s.card, s.patch, s.at); continue; }
      const d = dev[s.client === 'addon' ? 'web' : s.client];
      if (s.op === 'sync') { if (!signed.has(d)) { signed.add(d); d.clock.t = s.at; await d.signIn(); } else await d.sync(s.at); }
      else if (s.op === 'delete') await d.remove(s.card, s.at);
      else await d.edit(s.card, s.patch, s.at);
    }
    for (const k of ['web', 'ios', 'android']) if (dev[k] && sc.expect[k]) { dev[k].clock.t = NOW; check(mode, sc.name, k, await dev[k].doc(), sc.expect[k]); }
    if (sc.expect.addon) { const a = dev.web.ad.store(), got = { cards: await slimOf(a.cards), deleted: a.deleted, stats: a.stats }; ok(same(got, sc.expect.addon), `[${mode}] "${sc.name}" add-on: ${stable(got).slice(0, 300)} ≠ ${stable(sc.expect.addon).slice(0, 300)}`); }
    // a brand-new install signing in to the account sees exactly the account Doc
    const fresh = await device(uid, { mode, at: NOW }); await fresh.signIn();
    const fd = await fresh.doc();
    check(mode, sc.name, 'fresh-install', fd, sc.expect.server);
    if (mode === 'drive') check(mode, sc.name, 'appDataFolder-file', await driveDoc(uid), sc.expect.server);
    for (const d of [...Object.values(dev), fresh]) d.close();
  });
}

// ---------- 4) migration vectors ----------
ok(MIG.v === 1 && MIG.cases.length >= 5, 'migration.json ≥ 5 ca');
ok(MIG.cases.some(c => Object.keys(c.expect.cards).length >= 2000), 'có ca 2k thẻ');
const js = fs.readFileSync(path.join(ROOT, 'native/shared/gen/migration-export.js'), 'utf8');
ok(js === exportScript(), 'migration-export.js = bản sinh từ template + core.js');
for (const c of MIG.cases) {
  const seed = {}; for (const [db, kv] of Object.entries(c.export.idb)) seed[db] = { kv };
  const idb = fakeIndexedDB(seed), again = await runExport(js, { idb, ls: memStorage(c.export.ls) });
  ok(same({ ...again, skipped: c.export.skipped }, c.export), `export "${c.name}" tái lập được (script chỉ đọc)`);
  ok(same(idb._dump(), Object.fromEntries(Object.entries(seed).map(([d, s]) => [d, s]))), `export "${c.name}" không ghi/xoá gì trong IndexedDB`);
  ok(same(await migrateExpect(c.export), c.expect), `migrate "${c.name}" = core.js thật đọc lại`);
  ok(c.export.errors.length === 0, `export "${c.name}" không lỗi: ${c.export.errors.join(', ')}`);
}

const secs = (Date.now() - t0) / 1000;
ok(secs < 30, `chạy < 30 s: ${secs.toFixed(1)} s`);
if (fails) { console.log(`✗ sync-cross-client: ${fails}/${n} lỗi`); process.exit(1); }
console.log(`✓ sync-cross-client: ${n} kiểm – ${V.merge.length} ca merge (+ D1 đầu-cuối), ${V.scenarios.length} kịch bản × D1/Drive, ${MIG.cases.length} ca migration (${secs.toFixed(1)} s)`);
process.exit(0);
