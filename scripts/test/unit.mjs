// Test riêng cho phần dễ gây mất dữ liệu học nhất: thuật toán ôn thẻ FSRS (web/js/core.js) và API đồng bộ D1 (functions/api/sync.js).
// Chạy: node scripts/test/unit.mjs  (không cần thư viện ngoài; CI chạy mỗi lần đẩy code)
import fs from 'node:fs'; import vm from 'node:vm'; import { webcrypto } from 'node:crypto';
let fails = 0; const ok = (c, m) => { if (!c) { fails++; console.log('✗', m); } };
const DAY = 864e5, MIN = 6e4;

// ---------- FSRS ----------
const ctx = { console, Date, Math, JSON, setTimeout, clearTimeout, t: (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => (o || {})[k]), localStorage: { getItem: () => null, setItem() {} }, navigator: {} };
ctx.self = ctx; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(new URL('../../web/js/data.js', import.meta.url), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(new URL('../../web/js/core.js', import.meta.url), 'utf8'), ctx);
const { SRS } = ctx.Core;
const t0 = new Date('2026-01-10T09:00:00').getTime();
let s = SRS.newState();
s = SRS.review(s, 2, t0, true); ok(s.reps === 0 && s.due === t0 + 10 * MIN, 'thẻ mới "Nhớ" lần 1 → ôn lại sau 10 phút');
s = SRS.review(s, 2, t0 + 10 * MIN, true); ok(s.reps === 1 && s.interval >= 1, 'thẻ mới "Nhớ" lần 2 → tốt nghiệp, khoảng ≥ 1 ngày');
const i1 = s.interval; s = SRS.review(s, 2, s.due, true); ok(s.interval > i1, 'ôn đúng hạn "Nhớ" → khoảng cách tăng');
const easy = SRS.review({ ...s }, 3, s.due, true), hard = SRS.review({ ...s }, 1, s.due, true);
ok(easy.interval > hard.interval, '"Dễ" cho khoảng dài hơn "Khó"');
const lapse = SRS.review({ ...s }, 0, s.due, true); ok(lapse.reps === 0 && lapse.lapses === 1 && lapse.due === s.due + MIN, '"Quên" → về học lại, đếm lapse, ôn sau 1 phút');
ok(lapse.S < s.S, '"Quên" → độ ổn định giảm');
let big = SRS.newState(); let now = t0; for (let i = 0; i < 40; i++) { big = SRS.review(big, 3, now, true); now = Math.max(now + MIN, big.due); }
ok(big.interval <= 36500 && Number.isFinite(big.S) && Number.isFinite(big.D), 'ôn "Dễ" 40 lần → khoảng không vượt giới hạn, số hữu hạn');
ok(big.D >= 1 && big.D <= 10, 'độ khó D luôn trong [1, 10]');
SRS.retentionTarget = 0.95; const r95 = SRS.review({ ...s }, 2, s.due, true); SRS.retentionTarget = 0.85; const r85 = SRS.review({ ...s }, 2, s.due, true); SRS.retentionTarget = 0.9;
ok(r95.interval < r85.interval, 'mục tiêu ghi nhớ 95% → khoảng ngắn hơn 85%');
const fz = Array.from({ length: 30 }, () => SRS.review({ ...s }, 2, s.due).interval); ok(Math.max(...fz) - Math.min(...fz) <= Math.ceil(r85.interval * 0.2) + 2, 'giãn ngẫu nhiên nhỏ (±5%)');
const d = new Date(SRS.review({ ...s }, 2, s.due, true).due); ok(d.getHours() === 4, 'hạn ôn đặt lúc 4 giờ sáng (qua ngày mới là ôn được)');

// ---------- Đóng băng chuỗi: freezeInfo đọc từ dữ liệu game (nguồn duy nhất) ----------
{
  const fi = ctx.Core.Stats.freezeInfo({ freezes: 2, frozen: { '2026-10-01': 1, '2026-09-20': 1 }, freezeSaved: '2026-10-02' });
  ok(fi.left === 2 && fi.max === 2 && fi.used.join() === '2026-09-20,2026-10-01' && fi.lastSave === '2026-10-02', 'freezeInfo đọc game.freezes/frozen/freezeSaved');
  ok(ctx.Core.Stats.freezeInfo(null).left === 0, 'freezeInfo(null) an toàn');
}

// ---------- API đồng bộ (functions/api/sync.js) với D1 giả lập ----------
const { DatabaseSync } = await import('node:sqlite');
const mod = await import(new URL('../../functions/api/sync.js', import.meta.url));
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { sql.prepare(q).run(...this.args); return {}; }, async all() { return { results: sql.prepare(q).all(...this.args) }; }, async first() { return sql.prepare(q).get(...this.args) ?? null; } }; return st; }, async batch(list) { for (const x of list) await x.run(); } };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async (sub, extra = {}) => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, sub, ...extra })); return h + '.' + p + '.' + b64u(await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, new TextEncoder().encode(h + '.' + p))); };
globalThis.fetch = async () => ({ ok: true, json: async () => ({ keys: [jwk] }) });
const call = async (tk, body, origin = 'https://lexkite.com') => { const r = await mod.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, Origin: origin }, body: JSON.stringify(body) }), env: { DB } }); return { s: r.status, j: await r.json(), h: r.headers }; };
const A = await tok('alice'), B = await tok('bob');
ok((await call('x.y.z', { op: 'pull' })).s === 401, 'token giả → 401');
ok((await call(await tok('a', { exp: sec - 5 }), { op: 'pull' })).s === 401, 'token hết hạn → 401');
ok((await call(await tok('a', { aud: 'other' }), { op: 'pull' })).s === 401, 'token dự án khác → 401');
let r = await call(A, { op: 'push', docs: { meta: { h: 'm1', body: '{"chunks":1}' }, cards_0: { h: 'c1', body: '{}' } } }); ok(r.s === 200 && r.j.n === 2, 'ghi 2 tài liệu');
r = await call(A, { op: 'pull', have: { cards_0: 'c1' } }); ok(Object.keys(r.j.docs).join() === 'meta', 'chỉ tải tài liệu đã đổi');
ok(Object.keys((await call(B, { op: 'pull', have: {} })).j.docs).length === 0, 'người khác không đọc được dữ liệu');
ok((await call(A, { op: 'push', docs: { '../x': { h: 'a', body: '{}' } } })).s === 400, 'chặn khóa lạ');
ok((await call(A, { op: 'pull' }, 'https://evil.example')).h.get('Access-Control-Allow-Origin') === null, 'CORS chặn trang lạ');
// [N2] Quản trị khóa đồng bộ (users.blocked) → kéo/đẩy đều 403 'blocked'; người khác không bị ảnh hưởng; mở khóa → đồng bộ lại
sql.prepare('UPDATE users SET blocked = 1 WHERE uid = ?').run('bob');
{ const p1 = await call(B, { op: 'pull', have: {} }), p2 = await call(B, { op: 'push', docs: { meta: { h: 'x', body: '{}' } } });
  ok(p1.s === 403 && p1.j.error === 'blocked' && p2.s === 403, 'tài khoản bị khóa → kéo/đẩy 403 blocked');
  ok(!sql.prepare("SELECT 1 FROM docs WHERE uid = 'bob'").get(), 'tài khoản bị khóa không ghi được dữ liệu');
  ok((await call(A, { op: 'pull', have: {} })).s === 200, 'khóa 1 người không ảnh hưởng người khác'); }
sql.prepare('UPDATE users SET blocked = 0 WHERE uid = ?').run('bob');
ok((await call(B, { op: 'pull', have: {} })).s === 200, 'mở khóa → đồng bộ lại bình thường');

// Lời giải dịch sẵn (QE.exT): đổi chữ cái đáp án theo vị trí đã xoay, dùng bản dịch khi có, giữ bản gốc khi chưa có
{
  const fsm = await import('fs'), src = fsm.readFileSync(new URL('../../web/js/qengine.js', import.meta.url), 'utf8');
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
  const orig = 'Chọn B vì (C) sai', mv = L => 'ABCD'[('ABCD'.indexOf(L) + 1) % 4];
  const mk = async (lang, tr) => { const g = { I18N: { learnLang: () => lang }, document: {}, location: { protocol: 'https:' }, fetch: async () => ({ ok: !!tr, json: async () => tr }) }; new Function('self', 'I18N', 'document', 'location', 'fetch', src)(g, g.I18N, g.document, g.location, g.fetch); await new Promise(r => setTimeout(r, 5)); return g.QE; };
  ok((await mk('vi')).exT(orig, mv) === 'Chọn C vì (D) sai', 'lời giải: đổi chữ cái theo vị trí xoay');
  ok((await mk('en', { [fnv(orig)]: 'Pick {B} since ({C}) is wrong' })).exT(orig, mv) === 'Pick C since (D) is wrong', 'lời giải: bản dịch + đổi chữ cái');
  ok((await mk('ja', null)).exT(orig) === orig, 'lời giải: chưa có bản dịch → giữ bản gốc');
}

// ---------- ✍️ Soát lỗi viết (web/js/writecheck-rules.js + bản tiếng Anh cho add-on) ----------
{
  const w = { console }; w.self = w; vm.createContext(w);
  vm.runInContext(fs.readFileSync(new URL('../../web/js/writecheck-rules.js', import.meta.url), 'utf8'), w);
  const W = w.LK_WRITE, fix = t => { let out = t; for (const x of W.check(t).reverse()) out = out.slice(0, x.s) + (x.reps[0] ?? '') + out.slice(x.e); return out; };
  const CASES = [['She have a apple.', 'She has an apple.'], ['I recieve your email.', 'I receive your email.'], ['You should to study more harder then me.', 'You should study harder than me.'],
    ['Although it rained, but we went out.', 'Although it rained, we went out.'], ['I enjoy to read and look forward to meet you.', 'I enjoy reading and look forward to meeting you.'], ['I have went there and he don\'t know.', 'I have gone there and he doesn\'t know.'],
    ['It depends of the weather.', 'It depends on the weather.'], ['If it will rain, we stay.', 'If it rains, we stay.'], ['i think its a good idea.', 'I think it\'s a good idea.']];
  for (const [a, b] of CASES) ok(fix(a) === b, `soát lỗi viết: "${a}" → "${b}" (nhận "${fix(a)}")`);
  for (const good of ['An hour ago, a university student met an MBA graduate.', 'The house had had a fire. E.g. this is fine.', 'They are happy and she has a lot.'.replace(' a lot', ' plenty'), 'He was interested in it and arrived at the station.'])
    ok(!W.check(good).filter(x => x.type !== 'style').length, `soát lỗi viết: câu đúng không bị gạch "${good}" (${JSON.stringify(W.check(good).map(x => x.rule))})`);
  ok(W.check('This is very important.').some(x => x.rule === 'lk:upgrade' && x.reps.includes('crucial') && x.levels[0]), 'soát lỗi viết: gợi ý nâng cấp từ vựng kèm cấp CEFR');
  // service worker đọc bản tiếng Anh bằng JSON.parse (background.js uiDict) → phải là JSON một dòng & đủ khóa
  const src = fs.readFileSync(new URL('../../web/js/i18n/en/writecheck.js', import.meta.url), 'utf8');
  let EN = {}; try { EN = JSON.parse(src.slice(src.indexOf('{"', src.indexOf('Object.assign(')), src.lastIndexOf('});') + 1)); } catch (e) { ok(false, 'soát lỗi viết: en/writecheck.js không đọc được bằng JSON.parse – ' + e.message); }
  const keys = new Set(W.rules.flatMap(r => [r.title, r.why]));
  for (const f of ['../../extension/writecheck.js']) for (const m of fs.readFileSync(new URL(f, import.meta.url), 'utf8').matchAll(/\btx\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1]);
  const miss = [...keys].filter(k => !EN[k]); ok(!miss.length, 'soát lỗi viết: thiếu bản tiếng Anh ' + JSON.stringify(miss.slice(0, 5)));
}

// ---------- 📦 Xuất Excel .xlsx [X1] (web/js/export.js + AnkiKit.zipWrite) ----------
{
  const xc = { console, TextEncoder, TextDecoder, Uint8Array, Uint32Array, DataView, ArrayBuffer, Blob, Response, CompressionStream, DecompressionStream, Date, Math, JSON, String, Number, Object, Array, Promise, Error, Map, Set, RegExp, isNaN };
  xc.self = xc; vm.createContext(xc);
  vm.runInContext(fs.readFileSync(new URL('../../web/js/anki.js', import.meta.url), 'utf8'), xc);
  vm.runInContext(fs.readFileSync(new URL('../../web/js/export.js', import.meta.url), 'utf8'), xc);
  const { Export, AnkiKit: K } = xc;
  const cards = [{ word: 'résumé', ipa: '/ˈrez.ə.meɪ/', pos: 'noun', vi: 'sơ yếu lý lịch <b>&</b> "CV"', def: 'a summary', ex: '=SUM(A1) is not a formula', contexts: [{ text: 'Send your résumé\u0007 today' }], level: 'b2', topic: 'mine', srs: { due: Date.UTC(2026, 9, 20, 5), last: 1, reps: 3 } }];
  const rows = Export.rowsOf(cards);
  ok(rows.length === 1 && rows[0][0] === 'résumé' && rows[0][8] === 'B2' && rows[0][9] === '2026-10-20' && rows[0][10] === 3, 'X1: rowsOf đúng cột (từ, CEFR, ngày ôn ISO, số lần ôn) ' + JSON.stringify(rows[0]));
  const bytes = await Export.buildXlsx(Export.HEAD(), rows, 'Sổ từ: a/b');
  const z = await K.zipOpen(bytes), want = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/worksheets/sheet1.xml'];
  ok(want.every(n => z.has(n)), 'X1: .xlsx đủ phần OpenXML ' + JSON.stringify(z.names));
  // CRC32 trong từng local header phải khớp dữ liệu giải nén (Excel báo "file hỏng" nếu sai)
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); let off = 0, crcOk = 0;
  while (dv.getUint32(off, true) === 0x04034b50) { const nl = dv.getUint16(off + 26, true), csz = dv.getUint32(off + 18, true), name = new TextDecoder().decode(bytes.subarray(off + 30, off + 30 + nl)); if (K.crc32(await z.get(name)) === dv.getUint32(off + 14, true)) crcOk++; off += 30 + nl + dv.getUint16(off + 28, true) + csz; }
  ok(crcOk === want.length, `X1: CRC32 khớp ${crcOk}/${want.length} phần`);
  const sheet = new TextDecoder().decode(await z.get('xl/worksheets/sheet1.xml')), wb = new TextDecoder().decode(await z.get('xl/workbook.xml'));
  ok(sheet.includes('sơ yếu lý lịch &lt;b&gt;&amp;&lt;/b&gt; &quot;CV&quot;') && !/[\x00-\x08]/.test(sheet), 'X1: ký tự XML được thoát, ký tự điều khiển bị bỏ');
  ok(/<row r="2">/.test(sheet) && /<c r="K2"><v>3<\/v><\/c>/.test(sheet) && /<autoFilter ref="A1:L2"\/>/.test(sheet), 'X1: 2 dòng, cột số dạng số, có lọc');
  ok(/<sheet name="Sổ từ  a b"/.test(wb), 'X1: tên trang tính bỏ ký tự cấm của Excel (: / ? * [ ])');
}

console.log(fails ? `✗ unit: ${fails} lỗi` : '✓ unit: FSRS, API đồng bộ & xuất Excel – tất cả đạt'); process.exit(fails ? 1 : 0);
