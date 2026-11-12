// Test kho khóa API (functions/api/_keys.js + /api/keys + nối vào ai.js + web/js/admin-keys.js):
// mã hóa khứ hồi, không lộ khóa trong mọi phản hồi, chọn/xoay vòng (nghỉ khi 429, chết khi 401), tự nhận diện nhà cung cấp,
// lọc/sắp xếp/phân trang, chặn người không phải admin, thao tác hàng loạt (+ xóa cần đăng nhập lại), ngưỡng cảnh báo + chống spam thư.
// Chạy: node scripts/test/keys.mjs (không mạng – D1 giả bằng node:sqlite, Cache API/fetch/Gemini/Workers AI giả lập)
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---------- Cache API giả ----------
const store = new Map();
globalThis.caches = { default: {
  async match(req) { const e = store.get(req.url); if (!e || e.exp <= Date.now()) return undefined; return new Response(e.body); },
  async put(req, res) { const age = +((res.headers.get('Cache-Control') || '').match(/max-age=(\d+)/) || [, 0])[1]; store.set(req.url, { body: await res.text(), exp: Date.now() + age * 1000 }); },
} };
const clearEdge = () => store.clear();
// ---------- D1 giả ----------
const sql = new DatabaseSync(':memory:');
const exec = (q, a) => /^\s*(SELECT|WITH)|RETURNING/i.test(q) ? { results: sql.prepare(q).all(...a) } : (sql.prepare(q).run(...a), { results: [] });
const DB = { prepare(q) { const st = { q, args: [], bind(...a) { return { ...st, args: a }; }, async run() { return exec(q, this.args); }, async all() { return exec(q, this.args); }, async first() { return sql.prepare(q).get(...this.args) || null; } }; return st; },
  async batch(list) { const out = []; for (const x of list) out.push(await x.run()); return out; } };
// ---------- Firebase ID token giả ----------
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (email, extra = {}) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, auth_time: sec, sub: 'u-' + email, email, email_verified: true, ...extra })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };

// ---------- Khóa giả (KHÔNG BAO GIỜ được xuất hiện trong phản hồi) ----------
const G1 = 'AIzaSyA_TEST_gemini_key_number_one_1111', G2 = 'AIzaSyB_TEST_gemini_key_number_two_2222', G3 = 'AIzaSyC_TEST_gemini_key_number_three_33';
const GROQ = 'gsk_TESTgroqKey0123456789abcdefXYZ', RESEND = 're_TEST_resend_key_abcdef123456', BREVO = 'xkeysib-' + 'a1'.repeat(32) + '-TESTbrevo99', OR = 'sk-or-v1-' + 'ab12'.repeat(12);
const ENVG = 'AIzaSyENV_gemini_env_secret_key_000000', LEGACY = 'AIzaSyLEGACY_old_config_list_key_99999', CFTOK = 'cfTESTtoken_abcdefghijklmnopqrstuvwxyz0123';
const ENCK = Buffer.alloc(32, 5).toString('base64');
const SECRETS = [G1, G2, G3, GROQ, RESEND, BREVO, OR, ENVG, LEGACY, CFTOK, ENCK];
const leak = (text, m) => ok(!SECRETS.some(k => text.includes(k)) && !SECRETS.some(k => text.includes(k.slice(0, 16))), 'không lộ khóa: ' + m);

// ---------- Nhà cung cấp giả ----------
const DEAD = new Set(), RL = new Map(); let pings = 0, gemGen = 0, mails = [];
globalThis.fetch = async (url, init = {}) => {
  url = String(url); const h = init.headers || {};
  if (url.includes('googleapis.com/robot') || url.includes('securetoken') || url.includes('service_accounts')) return { ok: true, json: async () => ({ keys: [jwk] }) };
  pings++;
  const k = (h.Authorization || '').replace(/^Bearer /, '') || h['api-key'] || h['x-api-key'] || h['x-goog-api-key'] || '';
  if (DEAD.has(k)) return new Response('{"error":{"message":"invalid key"}}', { status: 401 });
  return new Response('{}', { status: 200 });
};
const GEM = { fetch: async (u, init) => { const b = JSON.parse(init.body); if (DEAD.has(b.key)) return new Response('{"error":{"code":400,"message":"API key not valid. Please pass a valid API key.","status":"INVALID_ARGUMENT","details":[{"reason":"API_KEY_INVALID"}]}}', { status: 400 });
  if (RL.has(b.key)) return new Response(RL.get(b.key), { status: 429 });
  if (b.method === 'GET') { pings++; return new Response('{}', { status: 200 }); }
  gemGen++; GEM.last = b.key; return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '{"band":7}' }] } }] }), { status: 200 }); } };
const MAIL = { fetch: async (u, init) => { mails.push(JSON.parse(init.body)); return new Response('ok'); } };
let waiFail = '';
const WAI = { run: async () => { if (waiFail) throw new Error(waiFail); return { response: { band: 5 } }; } };
const ENV = { DB, GEM, MAIL, AI: WAI, ADMIN_EMAILS: 'boss@lexkite.com', KEYS_ENC_KEY: ENCK, GEMINI_KEY: ENVG };

const log = console.log; console.log = (...a) => { if (!/^(gemini|ai error)/.test(String(a[0]))) log(...a); };
const K = await import(new URL('../../functions/api/_keys.js', import.meta.url));
const API = await import(new URL('../../functions/api/keys.js', import.meta.url));
const AI = await import(new URL('../../functions/api/ai.js', import.meta.url));

const ADM = await tok('boss@lexkite.com'), USER = await tok('someone@gmail.com'), OLD = await tok('boss@lexkite.com', { auth_time: sec - 3600 });
const call = async (tk, body, { env = ENV, origin = 'https://lexkite.com' } = {}) => {
  const later = [];
  const r = await API.onRequestPost({ request: new Request('https://lexkite.com/api/keys', { method: 'POST', headers: { 'Content-Type': 'application/json', 'CF-Connecting-IP': '198.51.100.9', ...(origin ? { Origin: origin } : {}), ...(tk ? { Authorization: 'Bearer ' + tk } : {}) }, body: JSON.stringify(body) }), env, waitUntil: p => later.push(p) });
  await Promise.all(later);
  const text = await r.text(); let j = {}; try { j = JSON.parse(text); } catch (e) { /* bỏ qua */ }
  return { s: r.status, j, text };
};
const ALL = [];
const adm = async (body, o) => { const r = await call(ADM, body, o); ALL.push(r.text); return r; };

// 1) Mã hóa khứ hồi + AAD theo id
{
  const blob = await K.encryptKey(ENV, 'k_aaaaaaaaaaaa', G1);
  ok(/^v1\./.test(blob) && !blob.includes(G1) && !blob.includes(G1.slice(4, 20)), 'bản mã không chứa khóa');
  ok((await K.decryptKey(ENV, 'k_aaaaaaaaaaaa', blob)) === G1, 'giải mã khứ hồi');
  let threw = false; try { await K.decryptKey(ENV, 'k_bbbbbbbbbbbb', blob); } catch (e) { threw = true; } ok(threw, 'chép bản mã sang id khác → không giải được (AAD)');
  threw = false; try { await K.decryptKey({ KEYS_ENC_KEY: Buffer.alloc(32, 9).toString('base64') }, 'k_aaaaaaaaaaaa', blob); } catch (e) { threw = true; } ok(threw, 'sai KEYS_ENC_KEY → không giải được');
  ok((await K.encryptKey(ENV, 'k_aaaaaaaaaaaa', G1)) !== blob, 'iv ngẫu nhiên mỗi lần');
  ok(!K.encReady({ KEYS_ENC_KEY: 'c2hvcnQ=' }) && K.encReady(ENV), 'KEYS_ENC_KEY phải đúng 32 byte');
}
// 2) Tự nhận diện nhà cung cấp (máy chủ) + khớp bản máy khách (admin-keys.js)
{
  const cases = [[G1, 'gemini'], ['AQ.Ab8RN6TESTxxxxxxxxxxxxxxxxxx', 'gemini'], [GROQ, 'groq'], [RESEND, 'resend'], [BREVO, 'brevo'], [OR, 'openrouter'], ['sk-ant-api03-' + 'x'.repeat(30), 'anthropic'], ['sk-proj-' + 'y'.repeat(30), 'openai'], [CFTOK, ''], ['hello world', ''], ['GEMINI_KEY=' + G1, 'gemini'], ['"' + GROQ + '",', 'groq']];
  for (const [k, p] of cases) ok(K.detect(k) === p, `detect ${k.slice(0, 8)}… → ${p || '(không rõ)'}`);
  const win = { location: { hash: '' }, history: { replaceState() {} }, URLSearchParams }; win.window = win;
  vm.runInNewContext(fs.readFileSync(new URL('../../web/js/admin-keys.js', import.meta.url), 'utf8'), win);
  ok(cases.every(([k, p]) => win.AdminKeys._detect(k) === p), 'nhận diện máy khách khớp máy chủ');
  win.location.hash = '#keys?p=gemini&s=dead&q=abc&sort=uses&dir=asc&page=3';
  const hs = win.AdminKeys._hash.readHash(); ok(hs.provider === 'gemini' && hs.status === 'dead' && hs.q === 'abc' && hs.sort === 'uses' && hs.dir === 'asc' && hs.page === 3, 'trạng thái lọc đọc từ #keys?…');
  ok(K.looksSecret('note ' + G1) && !K.looksSecret('risk-assessment-for-provider-x') && !K.looksSecret('Gemini (legacy)'), 'looksSecret: bắt khóa, không bắt nhầm chữ thường');
}
// 3) Không phải admin → từ chối
{
  sql.exec("CREATE TABLE IF NOT EXISTS config (k TEXT PRIMARY KEY, v TEXT, at INTEGER, by TEXT) WITHOUT ROWID");
  sql.exec(`INSERT INTO config (k, v, at, by) VALUES ('gemini_keys', '${JSON.stringify([{ k: LEGACY, at: 1, by: 'old@lexkite.com' }])}', 1, 'x')`);
  for (const op of ['list', 'add', 'set', 'delete', 'test', 'export', 'audit', 'health']) {
    const r = await call(USER, { op, lines: G1, ids: ['env:GEMINI_KEY'], confirm: 'DELETE' }); ok(r.s === 403 && r.j.error === 'forbidden' && !r.j.rows, `người lạ ${op} → 403`); leak(r.text, 'người lạ ' + op);
  }
  ok((await call(null, { op: 'list' })).s === 403, 'không token → 403');
  ok((await call(ADM, { op: 'list' }, { origin: 'https://evil.example' })).s === 403, 'Origin lạ → 403');
  ok((await adm({ op: 'nope' })).s === 400, 'op lạ → 400');
}
// 4) Danh sách: env + nhập danh sách cũ (mã hóa), thêm nhiều khóa, không bao giờ trả giá trị
let ids = {};
{
  clearEdge();
  const l = await adm({ op: 'list' });
  ok(l.s === 200 && l.j.configured.enc === true, 'list OK');
  ok(l.j.rows.some(r => r.id === 'env:GEMINI_KEY' && r.source === 'env' && r.last4 === ENVG.slice(-4)), 'GEMINI_KEY hiện dạng env chỉ đọc (last4)');
  ok(l.j.rows.some(r => r.id === 'env:AI' && r.provider === 'cloudflare-ai'), 'binding Workers AI hiện như dòng env');
  const lg = sql.prepare("SELECT * FROM api_keys WHERE label = 'Gemini (legacy)'").get();
  ok(lg && lg.enc_key && !lg.enc_key.includes(LEGACY) && lg.added_by === 'old@lexkite.com', 'danh sách Gemini cũ được nhập + mã hóa');
  ok(!sql.prepare('SELECT * FROM api_keys').all().some(r => Object.values(r).some(v => typeof v === 'string' && SECRETS.slice(0, 9).some(s => v.includes(s)))), 'D1 không chứa khóa dạng rõ');
  const a = await adm({ op: 'add', lines: [G1, G2, '', GROQ, RESEND, BREVO, OR, 'garbage-line', G1, ENVG].join('\n'), label: 'Pool A' });
  ok(a.s === 200 && a.j.added.length === 6, 'thêm 6 khóa hợp lệ (' + (a.j.added || []).length + ')');
  ok(a.j.skipped.length === 3 && a.j.skipped.some(x => x.reason === 'unknown') && a.j.skipped.filter(x => x.reason === 'duplicate').length === 2, 'bỏ qua: dòng rác, trùng trong lô, trùng env');
  ok(a.j.added.every(x => x.status === 'live') && pings >= 6, 'khóa mới được kiểm ngay (ping rẻ nhất)');
  ok(a.j.added.find(x => x.provider === 'brevo') && a.j.added.find(x => x.provider === 'openrouter'), 'tự nhận diện khi thêm');
  for (const x of a.j.added) ids[x.provider + (ids[x.provider] ? '2' : '')] = x.id;
  const f = await adm({ op: 'add', lines: CFTOK, provider: 'groq' }); ok(f.s === 200 && f.j.added.length === 0 && f.j.skipped[0].reason === 'format', 'ép nhà cung cấp nhưng sai định dạng → bỏ qua');
  const c = await adm({ op: 'add', lines: CFTOK, provider: 'cloudflare-ai', label: 'CF token' }); ok(c.j.added.length === 1 && c.j.added[0].provider === 'cloudflare-ai', 'token Cloudflare: chọn tay nhà cung cấp');
  ok((await adm({ op: 'add', lines: GROQ.replace('gsk_TEST', 'gsk_ZZZZ'), label: 'my ' + G3 })).j.error === 'secret-in-label', 'chặn dán khóa vào nhãn');
  ok((await adm({ op: 'add', lines: Array(51).fill(0).map((_, i) => 'gsk_' + 'q'.repeat(20) + i).join('\n') })).j.error === 'too-many', 'tối đa 50 dòng/lần');
  const noenc = await call(ADM, { op: 'add', lines: G3 }, { env: { ...ENV, KEYS_ENC_KEY: '' } }); ok(noenc.s === 503 && noenc.j.error === 'not-configured', 'thiếu KEYS_ENC_KEY → không lưu');
  leak(noenc.text, 'add không cấu hình');
}
// 5) Chọn / xoay vòng / nghỉ / chết
{
  K.resetPool(); const now = Date.now(), day = new Date(now).toISOString().slice(0, 10);
  const R = (id, o = {}) => ({ id, provider: 'gemini', status: 'live', weight: 100, cooldown_until: 0, uses_today: 0, quota_day: day, ...o });
  const rows = [R('a'), R('b'), R('c', { uses_today: 15 }), R('d', { status: 'dead' }), R('e', { status: 'disabled' }), R('f', { status: 'quota', cooldown_until: now + 60e3 }), R('g', { weight: 0 }), R('h', { provider: 'groq' })];
  const st = {}, firsts = new Set(); for (let i = 0; i < 6; i++) firsts.add(K.rank(rows, 'gemini', now, st)[0].id);
  ok(firsts.size === 2 && firsts.has('a') && firsts.has('b'), 'hòa điểm → xoay vòng a/b');
  const order = K.rank(rows, 'gemini', now, st).map(r => r.id);
  ok(order.length === 3 && order[2] === 'c', 'bỏ dead/disabled/đang nghỉ/trọng số 0/nhà cung cấp khác; ít lượt còn lại xếp sau');
  ok(K.rank([R('x', { weight: 300, uses_today: 10 }), R('y', { weight: 100 })], 'gemini', now, {})[0].id === 'x', 'trọng số × lượt còn lại: 300×10 > 100×20');
  ok(K.rank([R('q', { status: 'quota', cooldown_until: now - 1 })], 'gemini', now, {}).length === 1, 'hết giờ nghỉ → dùng lại');
  // phân loại
  ok(K.classify('gemini', 401).kind === 'dead' && K.classify('groq', 403).kind === 'dead', '401/403 → dead');
  ok(K.classify('gemini', 400, '{"reason":"API_KEY_INVALID"}').kind === 'dead', 'Gemini 400 API_KEY_INVALID → dead');
  ok(K.classify('gemini', 403, 'User location is not supported').kind === 'transient', '403 vùng chưa hỗ trợ → tạm thời (không giết khóa)');
  const q1 = K.classify('gemini', 429, '"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"', { now });
  ok(q1.kind === 'quota' && q1.until === K.nextReset('gemini', now) && q1.until > now && q1.until - now <= 86400e3, 'hết lượt ngày → nghỉ tới 0 h giờ Thái Bình Dương');
  const q2 = K.classify('gemini', 429, '"retryDelay": "37s"', { now }); ok(q2.kind === 'quota' && q2.until === now + 37000, 'hết lượt phút → nghỉ theo retryDelay');
  ok(K.classify('groq', 429, '', { retryAfter: '5', now }).until === now + 30000, 'Retry-After ngắn → nghỉ tối thiểu 30 s');
  ok(K.classify('openrouter', 'net').kind === 'transient' && K.classify('groq', 503).kind === 'transient', 'mạng/5xx → tạm thời');
  ok(K.classify('resend', 401, '{"name":"restricted_api_key"}', { ping: true }).kind === 'ok', 'Resend khóa chỉ-gửi → hợp lệ');
  // vòng thử thật qua ai.js: khóa chết (401/400) bị đánh dấu dead, 429 → quota + nghỉ, còn lại vẫn chạy
  await K.loadPool(ENV, { force: true });
  DEAD.add(G1); RL.set(G2, '{"error":{"status":"RESOURCE_EXHAUSTED","details":[{"retryDelay":"120s"}]}}');
  const LG = sql.prepare("SELECT id FROM api_keys WHERE label = 'Gemini (legacy)'").get().id;
  sql.exec(`UPDATE api_keys SET status = 'disabled' WHERE id IN ('${LG}', 'env:GEMINI_KEY')`); K.resetPool(); // chỉ G1, G2 (Pool A) để thử
  const g = await AI.geminiCall(ENV, { contents: [] });
  ok(g === null, 'G1 chết + G2 hết lượt → null (ai.js lùi sang Workers AI)');
  const s1 = sql.prepare('SELECT status, last_err FROM api_keys WHERE id = ?').get(ids.gemini), s2 = sql.prepare('SELECT status, cooldown_until FROM api_keys WHERE id = ?').get(ids.gemini2);
  ok(s1.status === 'dead' && /400 dead/.test(s1.last_err), 'khóa sai → dead (last_err chỉ mã, không thông điệp)');
  ok(s2.status === 'quota' && s2.cooldown_until > Date.now() + 100e3, '429 → quota, nghỉ ~120 s');
  ok(sql.prepare("SELECT COUNT(*) AS n FROM api_key_events WHERE kind IN ('dead', 'quota')").get().n >= 2, 'ghi sự kiện lỗi (đếm lỗi 24 h)');
  sql.exec(`UPDATE api_keys SET status = 'live' WHERE id = 'env:GEMINI_KEY'`); K.resetPool();
  const g2 = await AI.geminiCall(ENV, { contents: [] }); ok(g2 && g2.text && GEM.last === ENVG, 'còn khóa env sống → dùng khóa env');
  ok(sql.prepare("SELECT uses_today FROM api_keys WHERE id = 'env:GEMINI_KEY'").get().uses_today === 1, 'gọi thành công → uses_today + 1');
  ok((await AI.geminiKeys(ENV)).length === 2 && !(await AI.geminiKeys(ENV)).includes(G1), 'geminiKeys (cầu dao theo số khóa): bỏ khóa chết/tắt, tính khóa đang nghỉ');
  // mạng lỗi 3 lần → nghỉ 15 phút
  const gid = ids.groq; for (let i = 0; i < 3; i++) await K.report(ENV, gid, 'err', 'net');
  ok(sql.prepare('SELECT cooldown_until FROM api_keys WHERE id = ?').get(gid).cooldown_until > Date.now() + 14 * 60e3, 'lỗi mạng 3 lần liên tiếp → nghỉ 15 phút');
  ok((await K.pick(ENV, 'groq')) === null, 'groq đang nghỉ → pick null');
  await K.report(ENV, gid, 'ok'); ok((await K.pick(ENV, 'groq')).id === gid, 'thành công → hết nghỉ, pick lại được');
  // Workers AI hết neuron → nghỉ tới 0 h UTC, /api/ai vẫn trả lỗi êm như cũ
  waiFail = '4006: you have used up your daily free allocation of 10,000 neurons';
  await K.report(ENV, 'env:AI', 'err', 429, { text: 'PerDay' });
  const wa = sql.prepare("SELECT status, cooldown_until FROM api_keys WHERE id = 'env:AI'").get();
  ok(wa.status === 'quota' && wa.cooldown_until === K.nextReset('cloudflare-ai'), 'Workers AI hết neuron → quota tới 0 h UTC');
  waiFail = ''; await K.report(ENV, 'env:AI', 'ok');
}
// 6) Lọc / sắp xếp / phân trang (thuần + qua API)
{
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: 'k_' + String(i).padStart(12, '0'), provider: i % 3 ? 'gemini' : 'groq', label: 'L' + i, last4: 'ab' + String(i).padStart(2, '0'), status: i % 5 ? 'live' : 'dead', source: i === 7 ? 'env' : 'db', uses_today: i, last_ok: 1000 - i, err24: i % 4, err_count: 0, created: i, notes: '' }));
  const a = K.filterRows(rows, { provider: 'groq' }); ok(a.total === 10 && a.rows.every(r => r.provider === 'groq'), 'lọc nhà cung cấp');
  ok(K.filterRows(rows, { status: 'die' }).total === 6 && K.filterRows(rows, { status: 'dead' }).total === 6, 'lọc dead (cả "die")');
  ok(K.filterRows(rows, { status: 'env' }).total === 1, 'lọc env');
  ok(K.filterRows(rows, { q: 'ab07' }).rows[0].label === 'L7' && K.filterRows(rows, { q: 'k_000000000012' }).total === 1, 'tìm theo last4 / id');
  const s = K.filterRows(rows, { sort: 'uses', dir: 'desc', per: 5 }); ok(s.rows[0].uses_today === 29 && s.pages === 6 && s.rows.length === 5, 'sắp theo lượt dùng + phân trang');
  ok(K.filterRows(rows, { sort: 'uses', dir: 'asc', per: 5, page: 99 }).page === 6, 'trang vượt → trang cuối');
  ok(K.filterRows(rows, { sort: 'errors' }).rows[0].err24 === 3, 'sắp theo lỗi');
  const l = await adm({ op: 'list', provider: 'gemini', status: 'dead' }); ok(l.s === 200 && l.j.total === 1 && l.j.rows[0].id === ids.gemini, 'API list lọc gemini+dead');
  const l2 = await adm({ op: 'list', q: RESEND.slice(-4) }); ok(l2.j.total === 1 && l2.j.rows[0].provider === 'resend', 'API list tìm theo last4');
}
// 7) Thao tác hàng loạt + xóa cần đăng nhập lại
{
  clearEdge();
  const two = [ids.groq, ids.resend];
  ok((await adm({ op: 'set', ids: two, enabled: false })).j.n === 2 && sql.prepare(`SELECT COUNT(*) AS n FROM api_keys WHERE status = 'disabled' AND id IN ('${two.join("','")}')`).get().n === 2, 'tắt hàng loạt');
  ok((await K.pick(ENV, 'groq')) === null, 'khóa tắt không được chọn');
  await adm({ op: 'set', ids: [...two, ids.gemini], enabled: true });
  ok(sql.prepare(`SELECT COUNT(*) AS n FROM api_keys WHERE status = 'live' AND id IN ('${[...two, ids.gemini].join("','")}')`).get().n === 3, 'bật hàng loạt (khóa dead → live để thử lại)');
  await adm({ op: 'set', ids: two, weight: 7 }); ok(sql.prepare('SELECT weight FROM api_keys WHERE id = ?').get(ids.groq).weight === 7, 'đặt trọng số hàng loạt');
  ok((await adm({ op: 'set', ids: two, weight: 5000 })).j.error === 'weight', 'trọng số ngoài 0–1000 → từ chối');
  ok((await adm({ op: 'set', ids: [ids.groq], notes: 'backup ' + GROQ })).j.error === 'secret-in-notes', 'chặn khóa trong ghi chú');
  const t = await adm({ op: 'test', ids: two }); ok(t.s === 200 && t.j.results.length === 2, 'kiểm ngay hàng loạt');
  mails = []; DEAD.add(BREVO); const tb = await adm({ op: 'test', ids: [ids.brevo] }); ok(tb.j.results[0].status === 'dead', 'kiểm: 401 → dead');
  const del = [ids.gemini, 'env:GEMINI_KEY'];
  const r1 = await call(OLD, { op: 'delete', ids: del, confirm: 'DELETE' }); ok(r1.s === 401 && r1.j.error === 'reauth', 'xóa: đăng nhập > 15 phút → reauth');
  ok((await adm({ op: 'delete', ids: del })).j.error === 'confirm', 'xóa thiếu confirm → từ chối');
  const r2 = await adm({ op: 'delete', ids: del, confirm: 'DELETE' });
  ok(r2.s === 200 && r2.j.deleted.length === 1 && r2.j.skipped[0].reason === 'env-readonly', 'xóa khóa db, env chỉ đọc → bỏ qua');
  ok(!sql.prepare('SELECT 1 FROM api_keys WHERE id = ?').get(ids.gemini), 'đã xóa khỏi D1');
  const LG = sql.prepare("SELECT id FROM api_keys WHERE label = 'Gemini (legacy)'").get().id;
  await adm({ op: 'delete', ids: [LG], confirm: 'DELETE' });
  K.resetPool(); await K.loadPool(ENV, { force: true });
  ok(!sql.prepare("SELECT 1 FROM api_keys WHERE label = 'Gemini (legacy)'").get() && !sql.prepare("SELECT v FROM config WHERE k = 'gemini_keys'").get().v.includes(LEGACY.slice(-8)), 'xóa khóa cũ → gỡ khỏi config, không bị nhập lại');
  const au = await adm({ op: 'audit' });
  ok(au.j.rows.some(r => r.op === 'delete' && r.ok) && au.j.rows.some(r => r.op === 'add') && au.j.rows.some(r => r.op === 'delete' && !r.ok), 'nhật ký ghi mọi thao tác (kể cả bị từ chối)');
  ok(sql.prepare("SELECT COUNT(*) AS n FROM admin_log WHERE op LIKE 'keys.%'").get().n >= 5, 'thao tác ghi còn vào admin_log');
  const ex = await adm({ op: 'export', provider: 'gemini' }); ok(ex.s === 200 && ex.j.csv.startsWith('id,provider,label,last4') && ex.j.csv.split('\n').length === ex.j.n + 1, 'xuất CSV theo bộ lọc');
}
// 8) Ngưỡng cảnh báo + thư ≤ 1/loại/24 h
{
  const S = (o) => ({ provider: 'groq', name: 'Groq', enabled: 4, usable: 2, dead: 2, quota: 0, capacity: 0.5, ...o });
  ok(K.evalAlerts([S({ usable: 0 })])[0].kind === 'nolive:groq' && K.evalAlerts([S({ usable: 0 })])[0].level === 'crit', '0 khóa dùng được → crit');
  ok(K.evalAlerts([S({ capacity: 0.19 })])[0].kind === 'cap:groq' && K.evalAlerts([S({ capacity: 0.19 })])[0].level === 'warn', 'dung lượng 19 % → warn');
  ok(!K.evalAlerts([S({ capacity: 0.2 })]).length && !K.evalAlerts([S({ capacity: 0.21 })]).length, 'dung lượng ≥ 20 % → không cảnh báo');
  ok(!K.evalAlerts([S({ enabled: 0, usable: 0 })]).length, 'nhà cung cấp không có khóa bật → không cảnh báo');
  const day = new Date().toISOString().slice(0, 10);
  const sm = K.summarize([{ id: '1', provider: 'groq', status: 'live', weight: 1, uses_today: 900, quota_day: day }, { id: '2', provider: 'groq', status: 'dead', weight: 1 }], Date.now());
  ok(Math.abs(sm[0].capacity - 0.05) < 1e-9 && K.evalAlerts(sm)[0].kind === 'cap:groq', 'tổng hợp: 100 lượt còn / 2000 trần = 5 % → cảnh báo');
  // brevo chỉ có 1 khóa và đã chết → crit + đúng 1 thư
  const a1 = await adm({ op: 'alerts' }); // thư đã gửi ngay khi khóa brevo cuối cùng chết (mục 7)
  ok(a1.j.alerts.some(a => a.kind === 'nolive:brevo') && mails.filter(m => /Brevo/.test(m.subject)).length === 1, 'brevo 0 khóa sống → cảnh báo + 1 thư');
  ok(mails.every(m => !SECRETS.some(k => JSON.stringify(m).includes(k))), 'thư không chứa khóa');
  await adm({ op: 'alerts' }); sql.exec("DELETE FROM key_alerts"); await adm({ op: 'alerts' });
  ok(mails.filter(m => /Brevo/.test(m.subject)).length === 1, 'gọi lại / mở lại cảnh báo trong 24 h → không gửi thêm');
  const l = await adm({ op: 'list' }); ok(l.j.alerts.some(a => a.kind === 'nolive:brevo') && l.j.summary.find(s => s.provider === 'brevo').dead === 1, 'list trả băng cảnh báo + thẻ tổng hợp');
  ok(l.j.threshold === 0.2, 'ngưỡng 20 % gửi kèm cho giao diện');
}
// 9) Không lộ khóa trong BẤT KỲ phản hồi nào + lưới chặn
{
  for (const t of ALL) leak(t, 'phản hồi admin');
  ok(ALL.length > 20, 'đã soát ' + ALL.length + ' phản hồi');
  const pubKeys = Object.keys(K.pub({ id: 'x', enc_key: 'v1.a.b', fp: 'f' }));
  ok(!pubKeys.includes('enc_key') && !pubKeys.includes('fp'), 'pub() không có enc_key/fp');
  const orig = API.OPS.audit; API.OPS.audit = async () => ({ rows: [{ x: G3 }] });
  const g = await adm({ op: 'audit' }); API.OPS.audit = orig;
  ok(g.s === 500 && g.j.error === 'leak-guard' && !g.text.includes(G3), 'lưới an toàn: phản hồi có chuỗi dạng khóa → chặn');
  ok(!sql.prepare('SELECT detail FROM key_audit').all().some(r => SECRETS.some(k => String(r.detail).includes(k))), 'nhật ký không chứa khóa');
}
// 10) Giới hạn tốc độ thao tác kiểm
{
  clearEdge(); let last; for (let i = 0; i < 7; i++) last = await adm({ op: 'test', ids: [ids.groq] });
  ok(last.s === 429 && last.j.error === 'too-fast', 'kiểm khóa > 6 lần/phút → 429');
}

console.log = log;
if (fails) { console.log(`✗ keys: ${fails}/${n} kiểm tra lỗi`); process.exit(1); }
console.log(`✓ keys: ${n} kiểm tra – mã hóa, không lộ khóa, xoay vòng/nghỉ/chết, nhận diện, lọc, quyền admin, hàng loạt, cảnh báo`);
