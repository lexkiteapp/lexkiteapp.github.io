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

console.log(fails ? `✗ unit: ${fails} lỗi` : '✓ unit: FSRS & API đồng bộ – tất cả đạt'); process.exit(fails ? 1 : 0);
