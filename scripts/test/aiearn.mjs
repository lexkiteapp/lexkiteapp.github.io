// "Ôn thẻ → thêm lượt AI" (functions/api/aiearn.js, đợt 1 #10) + cộng lượt thưởng dùng chung (_quota.js credit/unmark, gate gỡ dấu biên).
// Máy chủ: quy tắc cấp lượt, trần/ngày, idempotent, song song, bằng chứng từ bản đồng bộ (bộ đếm meta ∧ srs.last của thẻ), mảnh D1, khóa, CORS.
// Giao diện (web/js/ads/run.js): chỉ gợi ý khi đăng nhập + D1, đẩy đồng bộ trước khi nhận, ẩn khi đã đủ hôm nay, đủ 15 ngôn ngữ.
// Chạy: node scripts/test/aiearn.mjs  (không mạng – D1 giả bằng node:sqlite, Cache API/JWKS giả)
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { gzipSync } from 'node:zlib';
let n = 0, fails = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---------- Cache API + D1 giả ----------
const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
  async delete(req) { return store.delete(req.url); },
} };
const mkDb = () => {
  const sql = new DatabaseSync(':memory:');
  const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
  const DB = { sql, prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
    async batch(list) { const out = []; sql.exec('BEGIN'); try { for (const x of list) out.push(await x.run()); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } return out; } };
  sql.exec('CREATE TABLE docs (uid TEXT NOT NULL, k TEXT NOT NULL, h TEXT NOT NULL, body TEXT NOT NULL, updated INTEGER NOT NULL, PRIMARY KEY (uid, k)) WITHOUT ROWID');
  return DB;
};
const DB = mkDb(), S1 = mkDb();
DB.sql.exec('CREATE TABLE users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER, seen INTEGER, plat TEXT, n INTEGER, shard INTEGER, cc TEXT, blocked INTEGER)');

// ---------- Firebase ID token giả ----------
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async sub => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub, email: sub + '@gmail.com', email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async url => { if (String(url).includes('googleapis.com/service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) }; throw new Error('mạng bị chặn trong test: ' + url); };

const Q = await import('../../functions/api/_quota.js');
const E = await import('../../functions/api/aiearn.js');
const { EARN, earnable, proofOf } = E;
const ENV = { DB, DB_S1: S1 };
const today = Q.dayKey(), NOW = Date.now();

// ---------- tài liệu đồng bộ (đúng dạng máy khách: {z: gzip base64} | {json}) ----------
const body = (o, z) => JSON.stringify(z ? { z: gzipSync(JSON.stringify(o)).toString('base64') } : { json: JSON.stringify(o) });
const cardsOf = (k, at, from = 0) => Object.fromEntries(Array.from({ length: k }, (_, i) => ['w' + (from + i), { word: 'w' + (from + i), srs: { reps: 1, last: at } }]));
const pack = (db, uid, docs) => { const d = {}; for (const [k, b] of Object.entries(docs)) d[k] = ['h' + k, b, NOW]; db.sql.prepare("INSERT OR REPLACE INTO docs (uid, k, h, body, updated) VALUES (?, 'pack', 'p', ?, ?)").run(uid, JSON.stringify({ v: 1, d }), NOW); };
const seed = (db, uid, counter, reviewed, o = {}) => pack(db, uid, { meta: body({ stats: { days: { [today]: counter } } }, o.z), cards_0: body({ ...cardsOf(reviewed, NOW - 60e3), ...cardsOf(o.old || 0, NOW - 3 * 864e5, 1000) }, o.z) });
const call = async (uid, b, o = {}) => { const r = await E.onRequestPost({ request: new Request('https://lexkite.com/api/aiearn', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': o.ip || '198.51.100.' + (++ipN), ...(o.origin ? { Origin: o.origin } : {}), ...(uid ? { Authorization: 'Bearer ' + await tok(uid) } : {}) }, body: JSON.stringify(b) }), env: ENV }); return { s: r.status, j: await r.json(), h: r.headers }; };
let ipN = 1;
const counter = (k, db = DB) => (db.sql.prepare('SELECT n FROM quota_count WHERE k = ? AND day = ?').get(k, today) || { n: 0 }).n;

// 1) Quy tắc cấp lượt (thuần)
ok(earnable(9, 0, 'ai').grant === 0, 'chưa đủ 10 thẻ → 0');
ok(earnable(10, 0, 'ai').grant === EARN.ai.grant && earnable(10, 0, 'ai').newly === 1, '10 thẻ → 1 lần');
ok(earnable(25, 1, 'ai').newly === 1 && earnable(25, 2, 'ai').newly === 0, 'nhận từng mức, không trùng');
ok(earnable(999, 0, 'ai').total === EARN.maxPerDay && earnable(999, 3, 'ai').grant === 0, 'trần/ngày');
ok(earnable(30, 0, 'chat').grant === EARN.maxPerDay * EARN.chat.grant, 'chat theo mức riêng');
ok(earnable(50, 0, 'sync').grant === 0 && earnable(-5, 0, 'ai').grant === 0 && earnable(NaN, 0, 'ai').grant === 0, 'tính năng lạ / số xấu');
ok(EARN.maxPerDay * EARN.ai.grant <= 6 && EARN.maxPerDay * EARN.chat.grant <= 15, 'trần lượt thêm/ngày nhỏ so với gói free (ai 30, chat 60)');
ok(Q.DEFAULTS.ai.store === 'd1' && Q.DEFAULTS.chat.store === 'd1', 'ai/chat đếm ở D1 → credit() có tác dụng');

// 2) Bằng chứng = min(bộ đếm meta, số thẻ có srs.last trong ngày) – không tin số máy khách
{
  const v = (c, r, o) => { const d = new Map(); const b = { meta: body({ stats: { days: { [today]: c } } }, o && o.z), cards_0: body({ ...cardsOf(r, NOW - 60e3), ...cardsOf(5, NOW - 3 * 864e5, 500), ...cardsOf(4, NOW + 864e5, 900) }, o && o.z) }; for (const k in b) d.set(k, { body: b[k] }); return d; };
  let p = await proofOf(v(25, 12), today); ok(p.counter === 25 && p.cards === 12 && p.reviews === 12, 'bộ đếm 25 nhưng chỉ 12 thẻ ôn thật → 12: ' + JSON.stringify(p));
  p = await proofOf(v(999, 0), today); ok(p.reviews === 0, 'bơm bộ đếm, không ôn thẻ nào → 0');
  p = await proofOf(v(3, 40), today); ok(p.reviews === 3, 'thẻ đổi do gộp/đồng bộ mà bộ đếm thấp → lấy số thấp');
  p = await proofOf(v(30, 30, { z: 1 }), today); ok(p.reviews === 30, 'tài liệu nén gzip (máy khách thật) đọc đúng');
  p = await proofOf(new Map([['meta', { body: '{bad' }], ['cards_0', { body: body(cardsOf(10, NOW)) }]]), today); ok(p.reviews === 0, 'meta hỏng → 0, không ném');
  ok(E.nearDay(today) && !E.nearDay('2001-01-01') && !E.nearDay('x'), 'chỉ nhận ngày gần hiện tại');
}

// 3) Endpoint: xác thực, đầu vào, cấp lượt + ghi sổ, idempotent, mảnh D1, khóa, CORS
{
  ok((await call('', { feature: 'ai' })).s === 401, 'chưa đăng nhập → 401');
  ok((await call('u-bad', { feature: 'sync' })).s === 400 && (await call('u-bad', { feature: 'ai', day: '2001-01-01' })).s === 400, 'tính năng lạ / ngày xa → 400');
  seed(DB, 'user-a', 25, 25, { z: 1, old: 40 });
  let r = await call('user-a', { feature: 'ai', day: today });
  ok(r.s === 200 && r.j.granted === 2 * EARN.ai.grant && r.j.reviews === 25, '25 thẻ → 2 mức → +4 lượt: ' + JSON.stringify(r.j));
  ok(counter('ai|u:user-a') === -2 * EARN.ai.grant && counter('rv|ai|u:user-a') === 2, 'trừ bộ đếm lượt AI của tài khoản, sổ nhận = 2');
  r = await call('user-a', { feature: 'ai', day: today });
  ok(r.s === 200 && r.j.granted === 0 && r.j.need === 30 && !r.j.maxed, 'gọi lại → 0, cần 30 thẻ cho mức sau');
  seed(DB, 'user-a', 60, 60);
  r = await call('user-a', { feature: 'ai', day: today }); const r2 = await call('user-a', { feature: 'ai', day: today });
  ok(r.j.granted === EARN.ai.grant && r2.j.granted === 0 && r2.j.maxed === true, 'tới trần 3 lần/ngày → maxed');
  r = await call('user-a', { feature: 'chat', day: today });
  ok(r.j.granted === EARN.maxPerDay * EARN.chat.grant && counter('ai|u:user-a') === -EARN.maxPerDay * EARN.ai.grant, 'chat tính riêng, không đụng sổ ai');
  // song song: 2 yêu cầu cùng lúc chỉ được cộng 1 lần
  seed(DB, 'user-p', 10, 10);
  const both = await Promise.all([call('user-p', { feature: 'ai', day: today }), call('user-p', { feature: 'ai', day: today })]);
  ok(both.reduce((a, x) => a + (x.j.granted || 0), 0) === EARN.ai.grant && counter('rv|ai|u:user-p') === 1 && counter('ai|u:user-p') === -EARN.ai.grant, 'song song: chỉ cộng 1 lần, sổ không vượt: ' + JSON.stringify(both.map(x => x.j)));
  // mảnh D1: dữ liệu học ở DB_S1 theo users.shard
  DB.sql.prepare('INSERT INTO users (uid, shard, blocked) VALUES (?, 1, 0)').run('user-s'); seed(S1, 'user-s', 12, 12);
  r = await call('user-s', { feature: 'ai', day: today }); ok(r.j.granted === EARN.ai.grant, 'đọc bằng chứng từ đúng mảnh D1 (users.shard): ' + JSON.stringify(r.j));
  DB.sql.prepare('INSERT INTO users (uid, shard, blocked) VALUES (?, 0, 1)').run('user-b'); seed(DB, 'user-b', 30, 30);
  ok((await call('user-b', { feature: 'ai', day: today })).s === 403 && counter('ai|u:user-b') === 0, 'tài khoản bị khóa đồng bộ → 403, không cộng');
  seed(DB, 'user-c', 999, 3);
  r = await call('user-c', { feature: 'ai', day: today }); ok(r.j.granted === 0 && r.j.reviews === 3, 'bơm bộ đếm 999 với 3 thẻ ôn thật → không cộng');
  r = await call('user-c', { feature: 'ai', day: today }, { origin: 'capacitor://localhost' });
  ok(r.h.get('Access-Control-Allow-Origin') === 'capacitor://localhost' && typeof E.onRequestOptions === 'function', 'app gốc gọi khác nguồn: có CORS + OPTIONS');
}

// 4) Gốc lỗi "đã được cộng lượt mà vẫn bị chặn tới nửa đêm": dấu "hết lượt" ở biên. gate gặp dấu → đọc bộ đếm, đã được cộng thì gỡ dấu, cho qua
{
  const uid = 'user-q', T = await tok(uid), ip = '192.0.2.77';
  const gq = async () => { const q = await Q.gate(new Request('https://lexkite.com/api/ai', { method: 'POST', headers: { Authorization: 'Bearer ' + T, 'CF-Connecting-IP': ip } }), ENV, 'ai'); if (!q.res) await q.take(); return q; };
  DB.sql.prepare('INSERT OR REPLACE INTO quota_count (k, day, n) VALUES (?, ?, ?)').run('ai|u:' + uid, today, Q.DEFAULTS.ai.free[1]);
  let q = await gq(); ok(q.res && q.res.status === 429, 'lượt 31 → hết lượt (đặt dấu ở biên)');
  q = await gq(); ok(q.res && q.res.status === 429, 'còn dấu, bộ đếm chưa được cộng → vẫn chặn');
  await DB.batch(Q.credit(DB, 'ai', ['u:' + uid], 3, today)); // như quảng cáo có thưởng (SSV gọi từ trung tâm dữ liệu khác: KHÔNG gỡ dấu ở đây)
  q = await gq(); ok(!q.res, 'đã được cộng lượt → gate tự gỡ dấu, cho dùng ngay (không đợi nửa đêm)');
  ok(!(await caches.default.match(new Request('https://quota.lexkite.internal/' + encodeURIComponent('qx:ai:u:' + uid)))) || !q.res, 'dấu đã gỡ');
  const brokenDb = { ...DB, prepare(qs) { if (/SELECT n FROM quota_count/.test(qs)) return { bind() { return { first: async () => { throw new Error('d1 down'); } }; } }; return DB.prepare(qs); } };
  DB.sql.prepare('UPDATE quota_count SET n = 99 WHERE k = ? AND day = ?').run('ai|u:' + uid, today); await gq();
  const q2 = await Q.gate(new Request('https://lexkite.com/api/ai', { method: 'POST', headers: { Authorization: 'Bearer ' + T, 'CF-Connecting-IP': ip } }), { ...ENV, DB: brokenDb }, 'ai');
  ok(q2.res && q2.res.status === 429, 'D1 lỗi khi đọc lại → vẫn chặn (không mở cửa khi lỗi)');
  const ar = fs.readFileSync('functions/api/ads-reward.js', 'utf8');
  ok(/credit\(db, feature, keys, REWARD\[feature\], day\)/.test(ar) && !/const UP =/.test(ar), 'ads-reward dùng credit() chung, không lặp câu SQL');
}

// 5) Giao diện (web/js/ads/run.js + sync.js): nhẹ nhàng, đúng luồng, đủ ngôn ngữ
{
  const run = fs.readFileSync('web/js/ads/run.js', 'utf8'), sync = fs.readFileSync('web/js/sync.js', 'utf8');
  ok(/canEarn = f => !!\(g\.Sync && g\.Sync\.user && g\.Sync\.mode !== 'drive' && g\.Sync\.mode !== 'off'\) && !maxedToday\(f\)/.test(run), 'gợi ý chỉ khi đăng nhập + đồng bộ D1, ẩn khi hôm nay đã nhận đủ');
  ok(/\^#\\\/review/.test(run) && /BASE \+ '\/api\/aiearn'/.test(run), 'chỉ nhận khi đã rời trang ôn; gọi đúng máy chủ cả trong app gốc (BASE)');
  ok(/g\.Sync\.flush\(\)/.test(run) && /Sync\.flush = flush;/.test(sync), 'đẩy đồng bộ ngay trước khi máy chủ đọc bằng chứng (hàm có thật trong sync.js)');
  ok(/j\.msg !== 'quota\.daily'/.test(run) && !/Notification|push\(/.test(run.slice(run.indexOf('async function claimEarn'), run.indexOf('// ---------- Đổi/rút lại'))), 'chỉ hiện khi hết lượt, không thông báo đẩy');
  ok(/gr = \{ ai: (\d+), chat: (\d+) \}/.test(run) && +RegExp.$1 === EARN.ai.grant && +RegExp.$2 === EARN.chat.grant && /'Ôn 10 thẻ/.test(run) && EARN.every === 10, 'số lượt trong lời gợi ý khớp máy chủ');
  const en = fs.readFileSync('web/js/i18n/en/ads.js', 'utf8'), fx = JSON.parse(fs.readFileSync('scripts/i18n-fixed.json', 'utf8'));
  const langs = fs.readFileSync('scripts/i18n-langs.txt', 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  for (const k of ['Ôn 10 thẻ để mở thêm {n} lượt – miễn phí.', 'Ôn thẻ ngay', 'Nhờ ôn thẻ, bạn được thêm {n} lượt.', 'Đã ôn {r}/{need} thẻ hôm nay – ôn thêm để nhận lượt.']) {
    const ph = k.match(/\{\w+\}/g) || [];
    ok(en.includes(JSON.stringify(k) + ':'), 'có tiếng Anh: ' + k);
    ok(langs.length === 13 && langs.every(l => fx[k] && fx[k][l] && ph.every(p => fx[k][l].includes(p))), '13 ngôn ngữ còn lại, giữ chỗ trống: ' + k);
    ok(langs.every(l => [`i18n/ui/${l}.js`, `i18n/ui/${l}/ads.js`].some(f => fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(fx[k][l]))), 'bản dịch tay đã áp vào nguồn i18n: ' + k);
  }
}
if (fails) { console.log(`aiearn: ${fails}/${n} kiểm tra HỎNG`); process.exit(1); }
console.log(`✓ aiearn: ${n} kiểm tra PASS (ôn thẻ → +lượt AI, bằng chứng máy chủ, gate gỡ dấu biên, giao diện, 15 ngôn ngữ)`);
