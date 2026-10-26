// Mô phỏng chi phí D1 / Functions theo người dùng (docs/CAPACITY.md). Chạy mã THẬT của functions/api/* trên D1 cục bộ, KHÔNG gọi production.
//   node scripts/capacity/sim.mjs                      → node:sqlite (ước lượng meta) – chạy được trong sandbox Mac
//   node scripts/capacity/sim.mjs --d1=miniflare       → D1 của workerd (rows_read/rows_written THẬT) – CI .github/workflows/capacity-sim.yml
//   --users=N (mẫu mỗi hồ sơ, mặc định 3) · --seed=N (người dùng có sẵn, mặc định 400) · --json=<tệp> · --md=<tệp>
// Kết quả: chi phí / người dùng / ngày theo hồ sơ (light · typical · heavy · anon · teacher), chi phí cố định (khởi động isolate, trạng thái hạn mức),
// danh sách truy vấn SCAN (EXPLAIN QUERY PLAN) và ngoại suy 10k / 100k / 1M DAU so với gói Free / Paid.
import { webcrypto } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { meter, sqliteD1, miniflareD1, explainAll } from './meter.mjs';
import { LIMITS, MIX, project } from './model.mjs';
import { pathToFileURL } from 'node:url';

const arg = (k, d) => { const a = process.argv.find(x => x.startsWith('--' + k + '=')); return a ? a.split('=').slice(1).join('=') : d; };
export async function simulate({ backend = arg('d1', 'sqlite'), users = +arg('users', 3), seedUsers = +arg('seed', 400), quiet = false, legacy = process.argv.includes('--legacy') } = {}) {
  const log = quiet ? () => {} : (...a) => console.log(...a);
  // ---------- đồng hồ ảo (mọi Date.now()/new Date() trong functions chạy theo thời gian mô phỏng) ----------
  const RealDate = Date; let OFF = 0;
  class SimDate extends RealDate { constructor(...a) { if (a.length) super(...a); else super(RealDate.now() + OFF); } static now() { return RealDate.now() + OFF; } }
  globalThis.Date = SimDate;
  const advance = ms => { OFF += ms; };
  // ---------- Cache API giả (1 trung tâm dữ liệu) – hết hạn theo max-age và đồng hồ ảo ----------
  const store = new Map();
  const keyOf = r => typeof r === 'string' ? r : r.url;
  globalThis.caches = { default: {
    async match(r) { const e = store.get(keyOf(r)); if (!e || e.exp <= Date.now()) { store.delete(keyOf(r)); return undefined; } return new Response(e.body, { status: e.status, headers: e.headers }); },
    async put(r, res) { const cc = res.headers.get('Cache-Control') || '', m = cc.match(/max-age=(\d+)/); const body = await res.text(); store.set(keyOf(r), { body, status: res.status, headers: [...res.headers], exp: Date.now() + (m ? +m[1] : 0) * 1000 }); },
    async delete(r) { return store.delete(keyOf(r)); },
  } };
  // ---------- Khóa Google giả cho Firebase ID token ----------
  const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'sim' };
  const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(RealDate.now() / 1000);
  const tokOf = async uid => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'sim' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 30 * 86400, iat: sec - 60, auth_time: sec - 60, sub: uid, email: uid + '@example.com', email_verified: true, name: 'Sim ' + uid })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
  const realFetch = globalThis.fetch;
  globalThis.fetch = async url => { url = String(url); if (url.includes('googleapis.com/service_accounts') || url.includes('securetoken')) return new Response(JSON.stringify({ keys: [jwk] }), { headers: { 'Content-Type': 'application/json' } }); return new Response('{}', { status: 404, headers: { 'Content-Type': 'application/json' } }); };

  // ---------- D1 ----------
  // Truy vấn làm mới trạng thái theo isolate (_quota.js state(), 1 lần/phút) = chi phí CỐ ĐỊNH, không tính cho người dùng (model.mjs fixed())
  const FIXED = /^SELECT (feature, v FROM quota_config|id FROM quota_allow|id, until FROM quota_block|id, until FROM quota_flag|k, v FROM config WHERE k IN \('ai_user')/;
  const be = backend === 'miniflare' ? await miniflareD1() : sqliteD1();
  const M = meter(be.raw, { fixed: q => FIXED.test(q) }), DB = M.db;
  // --legacy = kiến trúc trước 23/10 (dòng riêng mỗi tài liệu, mọi beacon vào D1, DDL mỗi isolate) để so trước/sau trong cùng 1 lượt CI
  const AE_POINTS = { n: 0 };
  const ENV = { DB, ADMIN_EMAILS: 'boss@lexkite.com', AI: { run: async () => ({ response: { band: 6.5, feedback: 'ok', reply: 'Sure.' } }) },
    ...(legacy ? { SYNC_PACK: '0', HIT_STORE: 'd1', SCHEMA_GATE: '0' } : { HITS: { writeDataPoint: () => { AE_POINTS.n++; } }, CF_ANALYTICS_TOKEN: 'sim', CF_ACCOUNT_ID: 'e34e14b7ab35eaf2b3d9d84fcce011f7' }) };
  const F = {};
  for (const n of ['sync', 'hit', 'config', 'notices', 'league', 'class', 'ai', 'img']) F[n] = await import(new URL(`../../functions/api/${n}.js`, import.meta.url));
  const Q = await import(new URL('../../functions/api/_quota.js', import.meta.url));

  // ---------- gọi 1 endpoint = 1 lượt Functions ----------
  const per = new Map(); // nhãn → { n, reads, writes }
  let acc = null; // bộ cộng của người dùng đang mô phỏng
  const call = async (label, fn, { method = 'POST', path = '/api/' + label.split('.')[0], body, uid, ip = '203.0.113.9', origin = 'https://lexkite.com', ua = 'Mozilla/5.0 (X11; Linux x86_64) Chrome/130.0', headers = {} } = {}) => {
    const h = { 'Content-Type': 'application/json', Origin: origin, 'User-Agent': ua, 'CF-Connecting-IP': ip, ...headers };
    if (uid) h.Authorization = 'Bearer ' + await tokOf(uid);
    const req = new Request('https://lexkite.com' + path, { method, headers: h, body: method === 'GET' ? undefined : (typeof body === 'string' ? body : JSON.stringify(body || {})) });
    M.begin(label); let res;
    try { res = await fn({ request: req, env: ENV, waitUntil: () => {} }); } finally { const c = M.end(); const e = per.get(label) || { n: 0, reads: 0, writes: 0 }; e.n++; e.reads += c.reads; e.writes += c.writes; per.set(label, e); if (acc) { acc.req++; acc.reads += c.reads; acc.writes += c.writes; const b = acc.by[label] || (acc.by[label] = { n: 0, reads: 0, writes: 0 }); b.n++; b.reads += c.reads; b.writes += c.writes; } }
    return res;
  };
  const audio = n => { if (acc) { acc.workers += n; } }; // audio.lexkite.com = Worker riêng: 1 lượt/tệp chưa có trong bộ đệm trình duyệt

  // ---------- 1) khởi động lạnh: setup()/CREATE TABLE của từng module, đo riêng ----------
  const cold = {};
  const coldCall = async (label, fn, o) => { const r0 = M.totals.reads, w0 = M.totals.writes; await call('cold:' + label, fn, o); cold[label] = { reads: M.totals.reads - r0, writes: M.totals.writes - w0 }; };
  await coldCall('config', F.config.onRequestGet, { method: 'GET' });
  await coldCall('hit.s', F.hit.onRequestPost, { body: { t: 's', sid: 'coldsid01', vid: 'coldvid01', path: 'home', pages: 1, dur: 1 } });
  await coldCall('sync.pull', F.sync.onRequestPost, { uid: 'cold-u', body: { op: 'pull', have: {} } });
  await coldCall('notices.get', F.notices.onRequestGet, { method: 'GET', path: '/api/notices?lang=vi', uid: 'cold-u' });
  await coldCall('league.me', F.league.onRequestPost, { uid: 'cold-u', body: { op: 'me' } });
  await coldCall('class.mine', F.class.onRequestPost, { uid: 'cold-u', body: { op: 'mine' } });
  await coldCall('ai', F.ai.onRequestPost, { uid: 'cold-u', body: { prompt: 'Grade this IELTS essay about cities and transport please '.repeat(2), sys: 'grader' } });
  per.clear();

  // ---------- 2) dữ liệu sẵn có (không tính vào chi phí người dùng) ----------
  const now0 = Date.now(), DAY = 86400e3;
  const raw = be.raw, B = async list => { for (let i = 0; i < list.length; i += 80) await raw.batch(list.slice(i, i + 80)); };
  const fnv = k => { let x = 2166136261; for (let i = 0; i < k.length; i++) { x ^= k.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) % 32; };
  const card = (w, i) => ({ w, m: 'nghĩa ' + i, ef: 2.5, iv: i % 30, due: now0 + (i % 9) * DAY, n: i % 7, ex: 'Example sentence for ' + w + '.' });
  const seedDocs = (uid, nCards) => { const parts = Array.from({ length: 32 }, () => ({})); for (let i = 0; i < nCards; i++) { const w = 'w' + i + uid.slice(-3); parts[fnv(w)][w] = card(w, i); } return parts; };
  const st = [];
  for (let u = 0; u < seedUsers; u++) {
    const uid = 'seed-' + u; st.push(raw.prepare('INSERT INTO users (uid, email, name, created, seen, plat, n) VALUES (?1, ?2, ?3, ?4, ?4, ?5, 3)').bind(uid, uid + '@x.y', 'S', now0 - (u % 60) * DAY, 'web'));
    const parts = seedDocs(uid, 40 + (u % 7) * 60);
    parts.forEach((p, i) => { if (Object.keys(p).length) st.push(raw.prepare('INSERT INTO docs (uid, k, h, body, updated) VALUES (?1, ?2, ?3, ?4, ?5)').bind(uid, 'cards_' + i, 'h' + i, JSON.stringify(p), now0 - DAY)); });
    st.push(raw.prepare('INSERT INTO docs (uid, k, h, body, updated) VALUES (?1, ?2, ?3, ?4, ?5)').bind(uid, 'meta', 'hm', JSON.stringify({ chunks: 32 }), now0 - DAY));
    for (let d = 0; d < 6; d++) st.push(raw.prepare('INSERT INTO sessions (sid, vid, day, at, country, ref, dev, lang, plat, path, dur, pages, ret, last) VALUES (?1, ?2, ?3, ?4, \'VN\', \'\', \'mobile\', \'vi\', \'web\', \'home\', 300, 4, 1, ?4)').bind('s' + u + 'd' + d, 'v' + u, new RealDate(now0 - d * 5 * DAY).toISOString().slice(0, 10), now0 - d * 5 * DAY));
  }
  for (let i = 0; i < 40; i++) st.push(raw.prepare("INSERT INTO notices (id, at, title, body, kind, target, send_at, expire_at, lang, revoked) VALUES (?1, ?2, 'T', 'B', 'info', '{\"type\":\"all\"}', NULL, ?3, 'all', ?4)").bind('n_seed' + i, now0 - i * DAY, i < 6 ? null : now0 - (i - 5) * DAY, i % 9 === 0 ? 1 : 0));
  for (let i = 0; i < 30; i++) st.push(raw.prepare("INSERT INTO quota_flag (id, strikes, bans, last, until, feature) VALUES (?1, 1, 0, ?2, 0, 'ai')").bind('i:' + String(i).padStart(20, '0'), now0 - i * 3600e3));
  await B(st);
  log(`backend=${be.kind} seed=${seedUsers} users (docs, sessions 30 days, 40 notices)`);
  Q.resetState && Q.resetState();

  // ---------- 3) hồ sơ người dùng (1 ngày) ----------
  // sessions: [phút]; reviews/new: thẻ ôn/thẻ mới; cards: số thẻ đã có; audio: tệp âm thanh mới/ngày; lookups: tra từ có ảnh (/api/img)
  const PROFILES = {
    anon:    { signedIn: false, sessions: [4], reviews: 0, add: 3, cards: 0, ai: 0, chat: 0, audio: 8, lookups: 2, league: false, cls: false, ext: false },
    light:   { signedIn: true, sessions: [6], reviews: 10, add: 3, cards: 120, ai: 0, chat: 0, audio: 6, lookups: 2, league: false, cls: false, ext: false },
    typical: { signedIn: true, sessions: [12, 10], reviews: 40, add: 10, cards: 600, ai: 1, chat: 0, audio: 20, lookups: 5, league: true, cls: false, ext: true, lessons: 1 },
    heavy:   { signedIn: true, sessions: [30, 25, 20, 15], reviews: 150, add: 30, cards: 3000, ai: 5, chat: 10, audio: 60, lookups: 15, league: true, cls: true, ext: true, lessons: 4 },
    teacher: { signedIn: true, sessions: [20], reviews: 10, add: 0, cards: 200, ai: 0, chat: 0, audio: 5, lookups: 0, league: false, cls: 'teach', ext: false, lessons: 0 },
  };
  // lớp mẫu cho học sinh hồ sơ heavy
  const T = 'teacher-0';
  const cr = await (await call('class.create', F.class.onRequestPost, { uid: T, body: { op: 'create', name: 'Lop 10A' } })).json();
  const cls = cr.cls || {};
  for (const ref of ['topic:travel', 'il:1', 'ir:2', 'toeic:3']) await call('class.assign', F.class.onRequestPost, { uid: T, body: { op: 'assign', cls: cls.id, ref } });
  per.clear();

  const results = {};
  const PUSH_MS = +(process.env.SIM_PUSH_MS || 180e3); // web/js/sync.js Sync.schedule: đẩy ≤ 1 lần/3 phút + đẩy ngay khi rời trang
  let ipN = 10;
  for (const [name, P] of Object.entries(PROFILES)) {
    const samples = [];
    for (let s = 0; s < users; s++) {
      const uid = `${name}-${s}`, ip = `198.51.100.${ipN++ % 250}`, vid = (name + s + 'vidxxxxxxxx').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 16);
      // hôm trước: tài khoản đã có dữ liệu (không tính) – để đo "ngày thường", không phải ngày đăng ký
      const cards = {}; for (let i = 0; i < P.cards; i++) { const w = `${uid}-w${i}`; cards[w] = card(w, i); }
      const sent = {}; // hash gói đã gửi (như sentHashes của web/js/sync.js)
      const bucketJson = () => { const parts = Array.from({ length: 32 }, () => ({})); for (const [w, c] of Object.entries(cards)) parts[fnv(w)][w] = c; return parts.map(p => JSON.stringify(p)); };
      const hsh = s2 => { let x = 0; for (let i = 0; i < s2.length; i++) x = (x * 31 + s2.charCodeAt(i)) | 0; return 'h' + (x >>> 0).toString(36) + s2.length; };
      let statsTick = 0;
      // như web/js/sync.js docBody: gzip + base64 khi nhỏ hơn
      const docBody = async json => { const u = new Uint8Array(await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer()); const z = Buffer.from(u).toString('base64'); return z.length < json.length ? { z } : { json }; };
      const pushDocs = async (label) => {
        const parts = bucketJson(), out = {}; let n = 0;
        for (let i = 0; i < parts.length; i++) { const j = parts[i], h = hsh(j); if (sent['cards_' + i] !== h) { out['cards_' + i] = { h, body: JSON.stringify(await docBody(j)) }; n++; } }
        const meta = JSON.stringify({ stats: { t: statsTick }, game: {}, settings: {} }), mh = hsh(meta);
        if (sent.meta !== mh || n) { out.meta = { h: mh, body: JSON.stringify({ chunks: 32, updated: Date.now(), hs: Object.fromEntries(parts.map((j, i) => ['cards_' + i, hsh(j)])), ...(await docBody(meta)) }) }; n++; }
        if (!n) return;
        await call(label, F.sync.onRequestPost, { uid, ip, body: { op: 'push', docs: out } });
        for (const [k, d] of Object.entries(out)) sent[k] = d.h;
      };
      if (P.signedIn) {
        acc = null; await call('setup.pull', F.sync.onRequestPost, { uid, ip, body: { op: 'pull', have: {}, vid } }); advance(25e3);
        await pushDocs('setup.push'); advance(DAY);
      }
      // ---- ngày đo ----
      acc = { req: 0, reads: 0, writes: 0, workers: 0, by: {} };
      const sid0 = vid.slice(0, 8);
      let cfgAt = -Infinity, lgAt = -Infinity;
      if (P.ext) await call('hit.x', F.hit.onRequestPost, { ip, body: { t: 'x', vid, day: new Date().toISOString().slice(0, 10), ev: { lookup: P.lookups, save: 2, popup: 1, newtab: 3 }, ver: '3.1.0' } });
      for (let si = 0; si < P.sessions.length; si++) {
        const mins = P.sessions[si], sid = sid0 + 's' + si, start = Date.now();
        if (Date.now() - cfgAt > 3600e3) { await call('config', F.config.onRequestGet, { method: 'GET', ip }); cfgAt = Date.now(); }
        if (P.signedIn) {
          await call('sync.pull', F.sync.onRequestPost, { uid, ip, body: { op: 'pull', have: { ...sent } } });
          delete sent.meta; await pushDocs('sync.push'); // web/js/sync.js: mở trang → pullMerge → push() gửi lại meta (sentHashes.meta mất khi tải lại trang)
          await call('notices.get', F.notices.onRequestGet, { method: 'GET', path: '/api/notices?lang=vi', uid, ip });
          if (P.cls) await call('class.mine', F.class.onRequestPost, { uid: P.cls === 'teach' ? T : uid, ip, body: { op: 'mine' } });
          if (P.cls === true && si === 0) await call('class.join', F.class.onRequestPost, { uid, ip, body: { op: 'join', code: cls.code, name: 'Em ' + s } });
        }
        // hoạt động phân bố đều trong phiên; đẩy ≤ 1 lần/3 phút; beacon 15 s rồi 3 phút/lần
        const steps = Math.max(1, Math.round(mins * 2)); // mỗi 30 s
        const perStep = (P.reviews + P.add) / P.sessions.length / steps;
        let dirtyAt = null, lastBeacon = -Infinity, sentBeacons = 0, k = 0, pages = 1;
        const beacon = async (force, hb) => { if (!force && Date.now() - lastBeacon < 60e3) return; lastBeacon = Date.now(); sentBeacons++; await call(hb ? 'hit.hb' : 'hit.s', F.hit.onRequestPost, { ip, body: { t: 's', sid, vid, ret: 1, path: 'home', cur: 'review', lang: 'vi', dev: 'mobile', plat: 'web', dur: Math.round((Date.now() - start) / 1000), pages, pv: { review: 2, home: 1 }, ...(hb ? { hb: 1 } : {}) } }); };
        for (let t = 0; t < steps; t++) {
          advance(30e3);
          const tm = Date.now() - start;
          if (tm >= 15e3 && sentBeacons === 0) await beacon(true);
          else if (tm >= 15e3 && (tm - 15e3) % 180e3 < 30e3 && tm > 30e3) await beacon(true, 1); // nhịp 3 phút = hb (web/js/app.js)
          for (let x = 0, nOps = Math.floor(perStep) + (Math.random() < perStep % 1 ? 1 : 0); x < nOps; x++) {
            k++; pages++;
            const ws = Object.keys(cards);
            if (k % Math.max(1, Math.round((P.reviews + P.add) / Math.max(1, P.add))) === 0 || !ws.length) { const w = `${uid}-n${k}-${si}`; cards[w] = card(w, k); }
            else { const w = ws[(k * 7919) % ws.length]; cards[w] = { ...cards[w], n: cards[w].n + 1, due: Date.now() + DAY }; }
            statsTick++;
            if (P.signedIn && dirtyAt === null) dirtyAt = Date.now();
          }
          if (P.signedIn && dirtyAt !== null && Date.now() - dirtyAt >= PUSH_MS) { await pushDocs('sync.push'); dirtyAt = null; }
          if (P.league && P.signedIn && Date.now() - lgAt >= 300e3) { await call(lgAt < 0 ? 'league.me' : 'league.xp', F.league.onRequestPost, { uid, ip, body: lgAt < 0 ? { op: 'join', nick: 'Sim' + s } : { op: 'xp', xp: statsTick * 10 } }); lgAt = Date.now(); }
          if (P.lessons && t === Math.floor(steps / 2) && si < P.lessons) {
            if (P.cls === true) await call('class.progress', F.class.onRequestPost, { uid, ip, body: { op: 'progress', ref: ['topic:travel', 'il:1', 'ir:2', 'toeic:3'][si % 4], r: 8, t: 10 } });
          }
          if (t === 1) for (let a = 0; a < Math.floor(P.ai / P.sessions.length) + (si === 0 ? P.ai % P.sessions.length : 0); a++) await call('ai.grade', F.ai.onRequestPost, { uid: P.signedIn ? uid : undefined, ip, body: { prompt: `Task 2 essay by ${uid} #${si}-${a}: ` + 'Some people think cities should invest in public transport. '.repeat(3), sys: 'IELTS grader' } });
          if (t === 2) for (let a = 0; a < Math.floor(P.chat / P.sessions.length) + (si === 0 ? P.chat % P.sessions.length : 0); a++) await call('ai.chat', F.ai.onRequestPost, { uid: P.signedIn ? uid : undefined, ip, body: { kind: 'rp', prompt: `Roleplay turn ${uid} ${si}-${a}: could you help me book a meeting room for Friday?`, sys: 'roleplay' } });
        }
        if (P.cls === 'teach') await call('class.report', F.class.onRequestPost, { uid: T, ip, body: { op: 'report', cls: cls.id } });
        // từ tra có ảnh minh họa (/api/img: đệm biên, không D1) + âm thanh (Worker audio)
        for (let l = 0; l < Math.round(P.lookups / P.sessions.length); l++) await call('img', F.img.onRequestGet, { method: 'GET', path: '/api/img?w=word' + (l % 3), ip });
        audio(Math.round(P.audio / P.sessions.length));
        // rời trang: đẩy ngay + beacon
        if (P.signedIn && dirtyAt !== null) { await pushDocs('sync.push'); dirtyAt = null; }
        await beacon(false); if (si % 2 === 0) await beacon(true);
        advance(3 * 3600e3);
      }
      samples.push(acc); acc = null;
    }
    const avg = k => samples.reduce((t, x) => t + x[k], 0) / samples.length;
    const by = {}; for (const smp of samples) for (const [l, v] of Object.entries(smp.by)) { const b = by[l] || (by[l] = { n: 0, reads: 0, writes: 0 }); b.n += v.n / samples.length; b.reads += v.reads / samples.length; b.writes += v.writes / samples.length; }
    results[name] = { requests: avg('req'), reads: avg('reads'), writes: avg('writes'), workers: avg('workers'), by };
    log(`${name.padEnd(8)} req/ngày ${avg('req').toFixed(1).padStart(6)} · đọc ${avg('reads').toFixed(0).padStart(6)} · ghi ${avg('writes').toFixed(0).padStart(5)} · audio ${avg('workers')}`);
  }

  // ---------- 4) chi phí cố định: làm mới trạng thái hạn mức (_quota.js, 1 lần/phút) ----------
  Q.resetState(); store.clear();
  const r0 = M.totals.reads; M.begin('quota.state');
  await Q.gate(new Request('https://lexkite.com/api/sync', { headers: { 'CF-Connecting-IP': '192.0.2.1' } }), ENV, 'sync', { who: null });
  M.end(); const stateReads = M.totals.reads - r0;
  // isolate thứ 2 cùng trung tâm dữ liệu (biến module mới, Cache API chung): đo xem có đọc D1 lại không
  Q.resetState({ memoryOnly: true });
  const r1 = M.totals.reads; M.begin('quota.state2');
  await Q.gate(new Request('https://lexkite.com/api/sync', { headers: { 'CF-Connecting-IP': '192.0.2.1' } }), ENV, 'sync', { who: null });
  M.end(); const stateReads2 = M.totals.reads - r1;

  // ---------- 4b) đầu dò: D1 tính bao nhiêu dòng GHI cho từng kiểu câu lệnh (ghi = nút thắt gói Free) ----------
  const probe = {};
  try {
    await raw.batch([raw.prepare('CREATE TABLE IF NOT EXISTS pr (a TEXT NOT NULL, b TEXT NOT NULL, v TEXT, x INTEGER, PRIMARY KEY (a, b)) WITHOUT ROWID'), raw.prepare('CREATE INDEX IF NOT EXISTS pr_x ON pr (x)')]);
    const P = async (k, q, ...a) => { const r = await raw.prepare(q).bind(...a).run(); probe[k] = { w: r.meta.rows_written, r: r.meta.rows_read }; };
    await P('insert_new', 'INSERT INTO pr (a, b, v, x) VALUES (?1, ?2, ?3, 1)', 'u', 'k1', 'x'.repeat(3000));
    await P('upsert_existing', 'INSERT INTO pr (a, b, v, x) VALUES (?1, ?2, ?3, 1) ON CONFLICT (a, b) DO UPDATE SET v = ?3', 'u', 'k1', 'y'.repeat(3000));
    await P('upsert_existing_idxcol', 'INSERT INTO pr (a, b, v, x) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (a, b) DO UPDATE SET v = ?3, x = ?4', 'u', 'k1', 'z', 2);
    await P('upsert_same_skip', 'INSERT INTO pr (a, b, v, x) VALUES (?1, ?2, ?3, 2) ON CONFLICT (a, b) DO UPDATE SET v = ?3 WHERE pr.v IS NOT excluded.v', 'u', 'k1', 'z');
    await P('update_existing', 'UPDATE pr SET v = ?3 WHERE a = ?1 AND b = ?2', 'u', 'k1', 'w');
    await P('update_idxcol', 'UPDATE pr SET x = ?3 WHERE a = ?1 AND b = ?2', 'u', 'k1', 3);
    await P('insert_ignore_existing', 'INSERT OR IGNORE INTO pr (a, b, v, x) VALUES (?1, ?2, ?3, 1)', 'u', 'k1', 'q');
    await P('replace_existing', 'INSERT OR REPLACE INTO pr (a, b, v, x) VALUES (?1, ?2, ?3, 3)', 'u', 'k1', 'r');
    await P('update_missing', 'UPDATE pr SET v = ?3 WHERE a = ?1 AND b = ?2', 'u', 'nope', 'w');
  } catch (e) { probe.error = String(e.message).slice(0, 120); }
  log('đầu dò ghi D1: ' + JSON.stringify(probe));

  // ---------- 5) EXPLAIN QUERY PLAN ----------
  const plans = explainAll(M, be.kind === 'sqlite' ? be.sql : null);
  const live = p => p.labels.some(l => !l.startsWith('cold:')); // chỉ chạy lúc khởi động lạnh/di chuyển 1 lần → không tính là đường người dùng
  const userScans = plans.filter(p => p.scans.length && !p.small && live(p));
  const coldScans = plans.filter(p => p.scans.length && !p.small && !live(p));
  const smallScans = plans.filter(p => p.scans.length && p.small);
  let bytesPerUser = null;
  try { const r = await raw.prepare("SELECT AVG(s) AS a FROM (SELECT SUM(LENGTH(body)) AS s FROM docs WHERE uid LIKE 'typical-%' GROUP BY uid)").all(); bytesPerUser = Math.round((r.results[0] || {}).a || 0); } catch (e) { /* bỏ qua */ }
  const out = { probe, legacy, aePoints: AE_POINTS.n, backend: be.kind, at: new RealDate().toISOString(), samples: users, seedUsers, profiles: results, cold, quotaState: { readsPerRefresh: stateReads, readsSecondIsolate: stateReads2 }, bytesPerTypicalUser: bytesPerUser,
    scans: userScans.map(p => ({ q: p.q.slice(0, 220), labels: p.labels, plan: p.plan })), smallScans: smallScans.map(p => ({ q: p.q.slice(0, 160), plan: p.plan })), coldScans: coldScans.map(p => ({ q: p.q.slice(0, 160), plan: p.plan })), perEndpoint: Object.fromEntries(per) };
  out.projection = project(out, MIX, LIMITS);
  if (be.dispose) await be.dispose();
  globalThis.Date = RealDate; globalThis.fetch = realFetch;
  return out;
}

export function markdown(r) {
  const f = (n, d = 0) => (n == null ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d }));
  const L = [];
  L.push(`Nguồn đo: **${r.backend}** (${r.backend === 'miniflare' ? 'meta.rows_read/rows_written thật của D1 cục bộ' : 'ước lượng node:sqlite'}) · ${r.samples} người mẫu/hồ sơ · ${r.at}`, '');
  L.push('| Hồ sơ | Lượt Functions/ngày | Lượt Worker audio | Dòng đọc D1 | Dòng ghi D1 |', '|---|---:|---:|---:|---:|');
  for (const [k, v] of Object.entries(r.profiles)) L.push(`| ${k} | ${f(v.requests, 1)} | ${f(v.workers)} | ${f(v.reads)} | ${f(v.writes)} |`);
  L.push('', '**Theo endpoint (hồ sơ typical):**', '', '| Endpoint | Lượt | Đọc | Ghi |', '|---|---:|---:|---:|');
  for (const [k, v] of Object.entries((r.profiles.typical || {}).by || {}).sort((a, b) => b[1].writes - a[1].writes)) L.push(`| ${k} | ${f(v.n, 1)} | ${f(v.reads)} | ${f(v.writes)} |`);
  L.push('', `Khởi động lạnh (mỗi isolate, mỗi module): ${Object.entries(r.cold).map(([k, v]) => `${k} ${f(v.reads)}r/${f(v.writes)}w`).join(' · ')}`);
  L.push(`Làm mới trạng thái hạn mức: ${f(r.quotaState.readsPerRefresh)} dòng đọc/lần; isolate thứ 2 cùng trung tâm: ${f(r.quotaState.readsSecondIsolate)}`);
  if (r.bytesPerTypicalUser) L.push(`Dung lượng D1 / người typical: ${f(r.bytesPerTypicalUser / 1024, 1)} KB`);
  L.push('', '**Ngoại suy (hỗn hợp DAU ' + Object.entries(MIX).map(([k, v]) => `${k} ${Math.round(v * 100)}%`).join(', ') + '):**', '', '| DAU | Functions+Worker/ngày | Đọc/ngày | Ghi/ngày | Free vượt? | Paid $/tháng (ước) |', '|---:|---:|---:|---:|---|---:|');
  for (const p of r.projection.scale) L.push(`| ${f(p.dau)} | ${f(p.requests)} | ${f(p.reads)} | ${f(p.writes)} | ${p.freeOver.join(', ') || 'không'} | ${f(p.paidUsd, 0)} |`);
  L.push('', `Trần DAU gói Free: ${Object.entries(r.projection.ceilingFree).map(([k, v]) => `${k} ≈ ${f(v)}`).join(' · ')} → **nút thắt: ${r.projection.bottleneckFree}**`);
  L.push(`Trần DAU gói Paid (trong phần đã gồm, không phát sinh): ${Object.entries(r.projection.ceilingPaid).map(([k, v]) => `${k} ≈ ${f(v)}`).join(' · ')} → **nút thắt: ${r.projection.bottleneckPaid}**`);
  L.push('', `Truy vấn SCAN bảng lớn: ${r.scans.length ? '' : 'không có'}`);
  for (const s of r.scans) L.push(`- \`${s.q}\` (${s.labels.join(', ')}) → ${s.plan.join(' / ')}`);
  if (r.smallScans.length) L.push('', `SCAN bảng nhỏ do quản trị soạn (chấp nhận): ${r.smallScans.length}`);
  return L.join('\n');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const r = await simulate();
  const md = markdown(r); console.log('\n' + md);
  const j = arg('json', ''), m = arg('md', '');
  if (j) { mkdirSync(dirname(j), { recursive: true }); writeFileSync(j, JSON.stringify(r, null, 1)); }
  if (m) { mkdirSync(dirname(m), { recursive: true }); writeFileSync(m, md + '\n'); }
  if (r.scans.length) { console.error(`✗ ${r.scans.length} truy vấn đường người dùng quét cả bảng`); process.exitCode = 1; }
}
