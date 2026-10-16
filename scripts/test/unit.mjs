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

// ---------- API đồng bộ (functions/api/sync.js) với D1 giả lập ----------
const { DatabaseSync } = await import('node:sqlite');
const mod = await import(new URL('../../functions/api/sync.js', import.meta.url));
const sql = new DatabaseSync(':memory:');
const DB = { prepare(q) { const st = { args: [], bind(...a) { return { ...st, args: a }; }, async run() { sql.prepare(q).run(...this.args); return {}; }, async all() { return { results: sql.prepare(q).all(...this.args) }; } }; return st; }, async batch(list) { for (const x of list) await x.run(); } };
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
  CASES.push(['Yesterday I go to the market.', 'Yesterday I went to the market.'], ['I have 25 years and I am student.', 'I am 25 years old and I am a student.'], ['Is important to study.', 'It is important to study.'],
    ['Are many people in the park.', 'There are many people in the park.'], ['I am knowing him.', 'I know him.'], ['She very tall.', 'She is very tall.'], ['I very like it.', 'I really like it.'],
    ['One of the best student is here.', 'One of the best students is here.'], ['Every students has a book.', 'Every student has a book.'], ['We go to shopping and go to home.', 'We go shopping and go home.'],
    ['I listen music and wait you.', 'I listen to music and wait for you.'], ['He said me the news.', 'He told me the news.'], ['I did a mistake.', 'I made a mistake.'], ['Let us make a photo.', 'Let us take a photo.'],
    ['Please open the light.', 'Please turn on the light.'], ['I am here since 2010.', 'I have been here since 2010.'], ['I met him before three days.', 'I met him three days ago.'],
    ['See you in Monday.', 'See you on Monday.'], ['I goed there.', 'I went there.'], ['You can\'t to go.', 'You can\'t go.'], ['I like very much football.', 'I like football very much.'], ['How do you think?', 'What do you think?']);
  for (const [a, b] of CASES) ok(fix(a) === b, `soát lỗi viết: "${a}" → "${b}" (nhận "${fix(a)}")`);
  for (const good of ['An hour ago, a university student met an MBA graduate.', 'The house had had a fire. E.g. this is fine.', 'They are happy and she has a lot.'.replace(' a lot', ' plenty'), 'He was interested in it and arrived at the station.'])
    ok(!W.check(good).filter(x => x.type !== 'style').length, `soát lỗi viết: câu đúng không bị gạch "${good}" (${JSON.stringify(W.check(good).map(x => x.rule))})`);
  for (const good of ['There are 570 word families in the list.', 'Choose a Task 2 question and write.', 'Poor sleep and lack of exercise are risks.', 'Learn them as chunks.', 'Arrive with time to spare.', 'I have gone to the market twice this week.', 'Seeing you is a pleasure.', 'They are meaning to call you.', 'I like it very much.', 'On Monday we met in 2020 at night.'])
    ok(!W.check(good).filter(x => x.type !== 'style').length, `soát lỗi viết: câu đúng không bị gạch "${good}" (${JSON.stringify(W.check(good).map(x => x.rule))})`);
  ok(W.rewrite("I don't think it's gonna work, thanks.", 'formal') === 'I do not think it is going to work, thank you.', 'viết lại trang trọng: ' + W.rewrite("I don't think it's gonna work, thanks.", 'formal'));
  ok(W.rewrite('I do not think that it is ready. Therefore, we will wait.', 'casual') === "I don't think that it's ready. So we'll wait.", 'viết lại thân mật: ' + W.rewrite('I do not think that it is ready. Therefore, we will wait.', 'casual'));
  ok(W.rewrite('Due to the fact that it rained, the majority of people are not able to come in order to help.', 'concise') === 'Because it rained, most people cannot come to help.', 'viết lại ngắn gọn: ' + W.rewrite('Due to the fact that it rained, the majority of people are not able to come in order to help.', 'concise'));
  ok(W.check('This is very important.').some(x => x.rule === 'lk:upgrade' && x.reps.includes('crucial') && x.levels[0]), 'soát lỗi viết: gợi ý nâng cấp từ vựng kèm cấp CEFR');
  // service worker đọc bản tiếng Anh bằng JSON.parse (background.js uiDict) → phải là JSON một dòng & đủ khóa
  const src = fs.readFileSync(new URL('../../web/js/i18n/en/writecheck.js', import.meta.url), 'utf8');
  let EN = {}; try { EN = JSON.parse(src.slice(src.indexOf('{"', src.indexOf('Object.assign(')), src.lastIndexOf('});') + 1)); } catch (e) { ok(false, 'soát lỗi viết: en/writecheck.js không đọc được bằng JSON.parse – ' + e.message); }
  const keys = new Set(W.rules.flatMap(r => [r.title, r.why]));
  for (const f of ['../../extension/writecheck.js']) for (const m of fs.readFileSync(new URL(f, import.meta.url), 'utf8').matchAll(/\btx\('((?:[^'\\]|\\.)*)'/g)) keys.add(m[1]);
  const miss = [...keys].filter(k => !EN[k]); ok(!miss.length, 'soát lỗi viết: thiếu bản tiếng Anh ' + JSON.stringify(miss.slice(0, 5)));
}

console.log(fails ? `✗ unit: ${fails} lỗi` : '✓ unit: FSRS & API đồng bộ – tất cả đạt'); process.exit(fails ? 1 : 0);
