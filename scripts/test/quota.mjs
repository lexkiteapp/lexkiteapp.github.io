// Test hạn mức dùng chung (functions/api/_quota.js) + áp vào /api/ai, /api/handoff, /api/contact + quản trị /api/quota.
// Bậc · danh sách không giới hạn · burst & ngày · chặn theo IP khi xoay mã thiết bị · cầu dao nhà cung cấp (hạ cấp/bận) · dạng 429 · chỉ quản trị sửa cấu hình · khóa tự động.
// Chạy: node scripts/test/quota.mjs  (không mạng – D1 giả bằng node:sqlite, Cache API/fetch/Workers AI giả lập)
import fs from 'node:fs';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---------- Cache API giả (caches.default) có hết hạn theo max-age ----------
const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
  async delete(req) { return store.delete(req.url); }, // resetState() xoá bản đệm trạng thái dùng chung
} };
const clearEdge = () => store.clear();

// ---------- D1 giả: prepare/bind/run/all/first/batch (batch trả kết quả, hỗ trợ RETURNING) ----------
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
let writes = 0;
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { if (!/^\s*SELECT/i.test(q)) writes++; return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; sql.exec('BEGIN'); try { for (const x of list) out.push(await x.run()); sql.exec('COMMIT'); } catch (e) { sql.exec('ROLLBACK'); throw e; } return out; } };

// ---------- Firebase ID token giả (JWKS qua fetch giả) ----------
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (sub, email) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub, email, email_verified: true })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
let gemCalls = 0, waiCalls = 0, mails = 0;
globalThis.fetch = async url => { if (String(url).includes('googleapis.com/service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) }; throw new Error('mạng bị chặn trong test: ' + url); };

const log = console.log; console.log = (...a) => { if (!/^(gemini fallback|gemini |ai error)/.test(String(a[0]))) log(...a); };
sql.exec('CREATE TABLE users (uid TEXT PRIMARY KEY, email TEXT, name TEXT, created INTEGER NOT NULL, seen INTEGER NOT NULL, plat TEXT, n INTEGER DEFAULT 1)');
sql.exec("INSERT INTO users (uid, email, created, seen) VALUES ('user1', 'learner@gmail.com', 0, 0)");
const Q = await import(new URL('../../functions/api/_quota.js', import.meta.url));
const AI = await import(new URL('../../functions/api/ai.js', import.meta.url));
const HO = await import(new URL('../../functions/api/handoff.js', import.meta.url));
const CT = await import(new URL('../../functions/api/contact.js', import.meta.url));
const QA = await import(new URL('../../functions/api/quota.js', import.meta.url));

const GEM = { fetch: async () => { gemCalls++; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"band":6}' }] } }] }), { status: 200 }); } };
const WAI = { run: async () => { waiCalls++; return { response: { band: 5 } }; } };
const MAIL = { fetch: async () => { mails++; return new Response('ok'); } };
const ENV = { DB, AI: WAI, GEM, MAIL, GEMINI_KEY: 'gk_test_SECRET_1', ADMIN_EMAILS: 'boss@lexkite.com', UNLIMITED_EMAILS: 'teacher@school.edu' };
const ORIGIN = 'https://lexkite.com';
let ipSeq = 1; const freshIp = () => `203.0.113.${ipSeq++}`;
const req = (path, body, { tk, dev, ip = '198.51.100.7', origin = ORIGIN } = {}) => new Request('https://lexkite.com' + path, { method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin, 'CF-Connecting-IP': ip, ...(tk ? { Authorization: 'Bearer ' + tk } : {}), ...(dev ? { 'X-Lexkite-Device': dev } : {}) }, body: JSON.stringify(body) });
const parse = async r => { const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ } return { s: r.status, j, text, h: r.headers }; };
let pn = 0; const prompt = () => 'Please grade this IELTS essay about technology and society, number ' + (++pn) + '. '.repeat(3);
const ai = (o = {}, body = {}) => AI.onRequestPost({ request: req('/api/ai', { prompt: prompt(), sys: 'grader', ...body }, o), env: o.env || ENV }).then(parse);
const dev = s => ('dev' + s + 'x'.repeat(20)).slice(0, 24);
const SHAPE = ['error', 'feature', 'tier', 'msg', 'resetAt', 'wait', 'signIn', 'left'];
const shapeOk = j => JSON.stringify(Object.keys(j).sort()) === JSON.stringify([...SHAPE].sort()) && j.error === 'quota';

// 1) Bậc: khách 10/ngày, đã đăng nhập 30/ngày (burst 5/phút – xóa bộ đệm biên giữa các đợt để chỉ thử giới hạn ngày)
{
  const ip = freshIp(), d = dev('anon1'); let last;
  for (let i = 0; i < 10; i++) { if (i % 5 === 0) clearEdge(); last = await ai({ dev: d, ip }); }
  ok(last.s === 200 && last.j.left === 0, 'khách: 10 lượt đầu OK, left về 0');
  clearEdge(); const r = await ai({ dev: d, ip });
  ok(r.s === 429 && r.j.msg === 'quota.daily' && r.j.tier === 'anon' && r.j.signIn === true && r.j.feature === 'ai', 'khách: lượt 11 → 429 quota.daily, gợi ý đăng nhập');
  ok(shapeOk(r.j), '429 đúng dạng {error, feature, tier, msg, resetAt, wait, signIn, left}: ' + Object.keys(r.j).join());
  ok(r.j.resetAt === Q.nextMidnight() && r.j.wait > 0 && +r.h.get('Retry-After') > 0, '429 có resetAt = 0h UTC hôm sau + Retry-After');
  ok(!/SECRET|limit|count|quota_|\bk\b|DB/i.test(r.text.replace(/"error":"quota"|quota\.daily/g, '')), 'không lộ nội bộ trong 429: ' + r.text);
  const U = await tok('user1', 'learner@gmail.com'), ip2 = freshIp();
  for (let i = 0; i < 30; i++) { if (i % 5 === 0) clearEdge(); last = await ai({ tk: U, ip: ip2 }); }
  ok(last.s === 200 && last.j.left === 0, 'đã đăng nhập: 30 lượt/ngày');
  clearEdge(); const r2 = await ai({ tk: U, ip: ip2 });
  ok(r2.s === 429 && r2.j.tier === 'free' && r2.j.signIn === false, 'đã đăng nhập: lượt 31 → 429 tier free, không gợi ý đăng nhập');
  clearEdge(); const c = await ai({ tk: U, ip: ip2 });
  ok(c.s === 429, 'đã hết lượt: lượt sau cũng bị chặn (đánh dấu ở biên)');
}
// 2) Bài đã chấm (đệm) không tốn lượt
{
  clearEdge(); const ip = freshIp(), d = dev('cache'), p = { prompt: 'Cached essay text that is long enough for the grader to accept it, yes.' };
  const a = await ai({ dev: d, ip }, p), b = await ai({ dev: d, ip }, p);
  const used = sql.prepare('SELECT n FROM quota_count WHERE k = ?').get('ai|d:' + d);
  ok(a.s === 200 && b.s === 200 && b.j.cached && used && used.n === 1, 'bài đã chấm trả từ đệm, không trừ lượt');
}
// 3) Burst: 5/phút → lượt 6 trong 1 phút = quota.burst
{
  clearEdge(); const ip = freshIp(), d = dev('burst'); let r;
  for (let i = 0; i < 6; i++) r = await ai({ dev: d, ip });
  ok(r.s === 429 && r.j.msg === 'quota.burst' && r.j.wait <= 60 && r.j.resetAt <= Date.now() + 61e3, 'burst: lượt 6/phút → 429 quota.burst, chờ ≤ 60 s');
}
// 4) Theo IP: xoay mã thiết bị không lách được (trần IP = ipx × mức cao nhất)
{
  sql.exec("INSERT OR REPLACE INTO quota_config (feature, v, at, by) VALUES ('handoff', '{\"anon\":[100,2],\"free\":[100,2],\"ipx\":2}', 0, 't')"); Q.resetState();
  const ip = freshIp(); let okN = 0, last;
  for (let i = 0; i < 8; i++) { last = await parse(await HO.onRequestPost({ request: req('/api/handoff', { op: 'put', blob: 'QUJD' }, { dev: dev('rot' + i), ip }), env: ENV })); if (last.s === 200) okN++; clearEdge(); }
  ok(okN === 4 && last.s === 429 && last.j.msg === 'quota.daily' && last.j.feature === 'handoff', `xoay mã thiết bị: chỉ ${okN}/8 qua (trần IP 2×2=4)`);
  const other = await parse(await HO.onRequestPost({ request: req('/api/handoff', { op: 'put', blob: 'QUJD' }, { dev: dev('rot9'), ip: freshIp() }), env: ENV }));
  ok(other.s === 200, 'IP khác không bị ảnh hưởng');
  const d1 = dev('same'), ip3 = freshIp(); let r;
  for (let i = 0; i < 3; i++) { r = await parse(await HO.onRequestPost({ request: req('/api/handoff', { op: 'put', blob: 'QUJD' }, { dev: d1, ip: ip3 }), env: ENV })); clearEdge(); }
  ok(r.s === 429, 'cùng thiết bị: lượt 3 > 2/ngày → 429');
  ok(Q.dayKey && (await Q.ipId('2001:db8:1:2:aaaa::1')) === (await Q.ipId('2001:db8:1:2:bbbb::9')), 'IPv6 gộp theo /64');
}
// 5) Danh sách không giới hạn: ADMIN_EMAILS, UNLIMITED_EMAILS, bảng quota_allow
{
  const T = await tok('teacher', 'teacher@school.edu'), A = await tok('boss', 'boss@lexkite.com'), ip = freshIp(); let bad = 0;
  for (let i = 0; i < 12; i++) { const r = await ai({ tk: i % 2 ? T : A, ip }); if (r.s !== 200 || r.j.left != null) bad++; }
  ok(!bad, 'ADMIN_EMAILS + UNLIMITED_EMAILS: 12 lượt liên tục (vượt burst & ngày) đều OK, không hiện "còn lượt"');
  const d = dev('vip'); sql.exec(`INSERT OR REPLACE INTO quota_allow (id, note, at, by) VALUES ('d:${d}', 't', 0, 't')`); Q.resetState();
  let fine = 0; for (let i = 0; i < 12; i++) if ((await ai({ dev: d, ip })).s === 200) fine++;
  ok(fine === 12, 'quota_allow (d:<thiết bị>): không giới hạn');
}
// 6) Cầu dao nhà cung cấp: Gemini gần trần → hạ cấp Workers AI; cả hai gần trần → quota.busy (máy khách chấm nhanh tại máy)
{
  clearEdge(); const day = Q.dayKey(), ip = freshIp(); sql.exec("DELETE FROM quota_count WHERE k LIKE 'p:%'");
  sql.exec(`INSERT OR REPLACE INTO quota_count (k, day, n) VALUES ('p:gemini', '${day}', ${Math.ceil(Q.PROVIDERS.gemini.day * Q.BREAKER)})`);
  const g0 = gemCalls, w0 = waiCalls, r = await ai({ dev: dev('brk1'), ip });
  ok(r.s === 200 && gemCalls === g0 && waiCalls === w0 + 1 && /workers-ai/.test(r.j.model), 'Gemini ≥ 80% trần → tự dùng Workers AI');
  const pai = sql.prepare("SELECT n FROM quota_count WHERE k = 'p:ai' AND day = ?").get(day);
  ok(pai && pai.n === Q.DEFAULTS.ai.cost, 'tính neuron Workers AI theo cost (' + (pai && pai.n) + ')');
  sql.exec(`INSERT OR REPLACE INTO quota_count (k, day, n) VALUES ('p:ai', '${day}', ${Q.PROVIDERS.ai.day * Q.BREAKER})`);
  const b = await ai({ dev: dev('brk2'), ip });
  ok(b.s === 429 && b.j.msg === 'quota.busy' && shapeOk(b.j), 'cả hai ≥ 80% → 429 quota.busy');
  sql.exec("DELETE FROM quota_count WHERE k LIKE 'p:%'");
  // Thư: gần trần → vẫn lưu tin nhắn nhưng không gửi
  sql.exec(`INSERT OR REPLACE INTO quota_count (k, day, n) VALUES ('p:mail', '${day}', ${Q.PROVIDERS.mail.day * Q.BREAKER})`);
  const m0 = mails, c = await parse(await CT.onRequestPost({ request: req('/api/contact', { name: 'A', email: 'a@b.co', msg: 'Hello there, a question', ms: 5000 }, { ip: freshIp() }), env: ENV }));
  ok(c.s === 200 && c.j.ok && c.j.sent === false && mails === m0, 'thư gần trần → lưu tin, chưa gửi thư');
  sql.exec("DELETE FROM quota_count WHERE k LIKE 'p:%'");
  const c2 = await parse(await CT.onRequestPost({ request: req('/api/contact', { name: 'A', email: 'a@b.co', msg: 'Hello there, a question', ms: 5000 }, { ip: freshIp() }), env: ENV }));
  ok(c2.j.sent === true && mails === m0 + 1, 'thư dưới trần → gửi & đếm p:mail');
}
// 7) Khớp sổ hạ tầng: PROVIDERS.day = cap.day trong infra/resources.json
{
  const R = JSON.parse(fs.readFileSync(new URL('../../infra/resources.json', import.meta.url), 'utf8'));
  for (const [p, P] of Object.entries(Q.PROVIDERS)) { const s = R.services.find(x => x.key === P.infra); ok(s && s.cap && s.cap.day === P.day, `PROVIDERS.${p} khớp infra/resources.json cap (${s && s.cap && s.cap.day} vs ${P.day})`); }
}
// 8) Quản trị: chỉ admin xem/sửa; sửa cấu hình/khóa/danh sách có hiệu lực + ghi nhật ký
{
  const A = await tok('boss', 'boss@lexkite.com'), U = await tok('user1', 'learner@gmail.com');
  const qa = (tk, body) => QA.onRequestPost({ request: req('/api/quota', body, { tk, ip: freshIp() }), env: ENV }).then(parse);
  ok((await qa(null, { op: 'state' })).s === 403, 'quản trị hạn mức: không token → 403');
  ok((await qa(U, { op: 'configSet', feature: 'ai', v: { anon: [99, 999], free: [99, 999], ipx: 3 } })).s === 403, 'người dùng thường không sửa được cấu hình → 403');
  ok(!sql.prepare("SELECT 1 FROM quota_config WHERE feature = 'ai'").get(), 'cấu hình không đổi sau lệnh bị từ chối');
  ok((await qa(A, { op: 'configSet', feature: 'ai', v: { anon: [-1, 5], free: [5, 30], ipx: 3 } })).s === 400, 'cấu hình sai → 400');
  ok((await qa(A, { op: 'configSet', feature: 'nope', v: { anon: [1, 5], free: [5, 30], ipx: 3 } })).s === 400, 'tính năng lạ → 400');
  const s1 = await qa(A, { op: 'configSet', feature: 'ai', v: { anon: [5, 1], free: [5, 30], ipx: 3 } });
  ok(s1.s === 200 && !('detail' in s1.j), 'admin đổi hạn mức ai khách → 1/ngày');
  clearEdge(); const ip = freshIp(), d = dev('cfg');
  const a1 = await ai({ dev: d, ip }), a2 = await ai({ dev: d, ip });
  ok(a1.s === 200 && a2.s === 429, 'hạn mức mới có hiệu lực ngay');
  const st = await qa(A, { op: 'state' });
  ok(st.s === 200 && st.j.top.ai && st.j.top.ai.some(x => x.id === 'u:user1' && x.email === 'learner@gmail.com' && x.n >= 30), 'state: top dùng nhiều hôm nay kèm email');
  ok(st.j.providers.length === 3 && st.j.providers.every(p => p.cap > 0 && p.breaker < p.cap), 'state: nhà cung cấp so với trần');
  ok(st.j.features.find(f => f.feature === 'ai').custom && !JSON.stringify(st.j).includes('SECRET'), 'state: cấu hình tùy chỉnh, không lộ khóa');
  // Khóa / mở khóa thiết bị
  const bd = dev('blk'), bl = await qa(A, { op: 'blockSet', target: 'd:' + bd, minutes: 0, reason: 'spam' });
  ok(bl.s === 200 && bl.j.id === 'd:' + bd, 'khóa thiết bị');
  clearEdge(); const blocked = await ai({ dev: bd, ip: freshIp() });
  ok(blocked.s === 429 && blocked.j.msg === 'quota.blocked' && blocked.j.resetAt === null, 'thiết bị bị khóa → quota.blocked (vô thời hạn)');
  await qa(A, { op: 'blockDelete', id: 'd:' + bd }); clearEdge();
  ok((await ai({ dev: bd, ip: freshIp() })).s === 200, 'mở khóa → dùng lại được');
  const bip = await qa(A, { op: 'blockSet', target: '192.0.2.55', minutes: 30, reason: 'bot' });
  ok(bip.s === 200 && /^i:[0-9a-f]{20}$/.test(bip.j.id), 'khóa IP gốc → lưu dạng băm');
  ok((await ai({ dev: dev('ipb'), ip: '192.0.2.55' })).j.msg === 'quota.blocked', 'IP bị khóa → mọi thiết bị trên IP đó bị chặn');
  ok((await qa(A, { op: 'blockSet', target: 'not an id', minutes: 1 })).s === 400, 'mục tiêu lạ → 400');
  ok((await qa(A, { op: 'allowSet', target: 'Learner@Gmail.com', note: 'tester' })).j.id === 'e:learner@gmail.com', 'thêm email vào danh sách không giới hạn');
  clearEdge(); ok((await ai({ tk: U, ip: freshIp() })).s === 200, 'email trong quota_allow → không giới hạn (dù đã hết 30 lượt)');
  await qa(A, { op: 'allowDelete', id: 'e:learner@gmail.com' }); clearEdge();
  ok((await ai({ tk: U, ip: freshIp() })).s === 429, 'gỡ khỏi danh sách → hạn mức thường');
  await qa(A, { op: 'configReset', feature: 'ai' });
  const audit = sql.prepare('SELECT op, email, target FROM quota_audit ORDER BY id').all();
  ok(audit.length === 7 && audit.every(r => r.email === 'boss@lexkite.com') && audit.map(r => r.op).join() === 'configSet,blockSet,blockDelete,blockSet,allowSet,allowDelete,configReset', 'mọi thay đổi ghi quota_audit: ' + audit.map(r => r.op).join());
}
// 9) Chống lạm dụng: từ chối dồn dập → lỗi → 3 lỗi = khóa tạm; lần khóa sau gấp đôi
{
  sql.exec("INSERT OR REPLACE INTO quota_config (feature, v, at, by) VALUES ('ai', '{\"anon\":[1,1000],\"free\":[1,1000],\"ipx\":100}', 0, 't')"); Q.resetState(); clearEdge();
  const d = dev('abuse'), ip = freshIp(), hit = () => ai({ dev: d, ip });
  const round = async () => { for (let i = 0; i < Q.STRIKE.denies + 3; i++) await hit(); clearEdge(); }; // xóa bộ đệm biên = cửa sổ 10 phút trôi qua
  await round(); await round();
  let f = sql.prepare('SELECT strikes, bans, until FROM quota_flag WHERE id = ?').get('d:' + d);
  ok(f && f.strikes === 2 && f.bans === 0, '2 đợt từ chối dồn dập → 2 lỗi, chưa khóa');
  await round(); f = sql.prepare('SELECT strikes, bans, until FROM quota_flag WHERE id = ?').get('d:' + d);
  const m1 = (f.until - Date.now()) / 60e3;
  ok(f.bans === 1 && m1 > 14 && m1 <= 15, 'lỗi thứ 3 → khóa tạm 15 phút');
  const r = await hit(); ok(r.s === 429 && r.j.msg === 'quota.blocked' && r.j.resetAt === f.until, 'đang bị khóa tạm → quota.blocked kèm thời điểm mở');
  sql.exec(`UPDATE quota_flag SET until = 0 WHERE id = 'd:${d}'`); Q.resetState();
  await round(); await round(); await round(); f = sql.prepare('SELECT bans, until FROM quota_flag WHERE id = ?').get('d:' + d);
  const m2 = (f.until - Date.now()) / 60e3; ok(f.bans === 2 && m2 > 29 && m2 <= 30, 'lần khóa thứ 2 → 30 phút (tăng gấp đôi)');
  const A = await tok('boss', 'boss@lexkite.com');
  ok((await QA.onRequestPost({ request: req('/api/quota', { op: 'state' }, { tk: A, ip: freshIp() }), env: ENV }).then(parse)).j.flags.some(x => x.id === 'd:' + d && x.bans === 2), 'state: hiện id bị gắn cờ tự động');
}
// 10) Endpoint đếm ở biên (sync/hit) không tốn lượt ghi D1; hạ tầng lỗi → cho qua
{
  const w0 = writes, U = await tok('syncer', 's@x.co');
  const q = await Q.gate(req('/api/sync', {}, { tk: U, ip: freshIp() }), ENV, 'sync');
  ok(!q.res && q.tier === 'free' && writes === w0, 'sync: kiểm hạn mức ở biên, 0 lượt ghi D1');
  const anon = await Q.gate(req('/api/sync', {}, { ip: freshIp() }), ENV, 'sync');
  ok(anon.res && anon.res.status === 429, 'sync khách (ngân sách 0) → 429');
  const broken = { DB: { prepare() { throw new Error('d1 down'); }, batch() { throw new Error('d1 down'); } } }; Q.resetState();
  const g = await Q.gate(req('/api/ai', {}, { dev: dev('down'), ip: freshIp() }), broken, 'ai'); await g.take();
  ok(!g.res, 'D1 hỏng → cho qua (không chặn nhầm người học)');
}

console.log(fails ? `✗ quota: ${fails}/${n} kiểm tra lỗi` : `✓ quota: ${n} kiểm tra – bậc, danh sách không giới hạn, burst/ngày, chặn theo IP, cầu dao, dạng 429, quản trị, khóa tự động`);
process.exit(fails ? 1 : 0);
