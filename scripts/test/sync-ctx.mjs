// Câu ngữ cảnh (P2-1.1): ctx ≤200 + src (tên miền) trong thẻ, đi trong gói đồng bộ 1 dòng/người – KHÔNG thêm dòng ghi D1.
// Kiểm: làm sạch/PII (máy khách Core.Ctx ≡ máy chủ _ctx.js) · vòng đẩy–kéo giữ ctx · máy chủ làm sạch thẻ bị sửa (cờ x:1) · máy khách cũ (không ctx/không cờ) vẫn chạy ·
// xóa thẻ → ctx biến mất · 1 lượt đẩy = 1 dòng ghi · ngân sách dung lượng · Cards.add/ctxOf (lõi thật chạy trong vm).
// Chạy: node scripts/test/sync-ctx.mjs
import fs from 'node:fs';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { webcrypto } from 'node:crypto';
import { sqliteD1, meter } from '../capacity/meter.mjs';
import { cleanCtx, cleanSrc } from '../../functions/api/_ctx.js';

let fails = 0, n = 0; const ok = (c, m) => { n++; if (!c) { fails++; console.log('✗', m); } };

// ---------- lõi thật (web/js/core.js) với chrome.storage giả ----------
const mem = {};
const sb = { chrome: { storage: { local: { get: async k => (typeof k === 'string' ? (k in mem ? { [k]: mem[k] } : {}) : { ...mem }), set: async o => { Object.assign(mem, structuredClone(o)); }, remove: async k => { delete mem[k]; } }, onChanged: { addListener() {} } } }, console, setTimeout, clearTimeout, structuredClone };
sb.self = sb; sb.globalThis = sb; vm.createContext(sb);
vm.runInContext(fs.readFileSync('web/js/core.js', 'utf8'), sb);
vm.runInContext(fs.readFileSync('web/js/ctx.js', 'utf8'), sb);
const Core = sb.Core;

// 1) làm sạch: máy khách ≡ máy chủ
const long = 'word '.repeat(80), emoji = 'a'.repeat(199) + '😀😀';
const T = [
  ['  He   said <b>hello</b>\u0000 world. ', 'He said hello world.'],
  ['Email me at bob@example.com please', ''], ['Call +84 912 345 678 now', ''], ['Call (415) 555-0132 now', ''],
  ['In 2020-10-23 we met', 'In 2020-10-23 we met'], ['<script>alert(1)</script>', 'alert(1)'], ['', ''], [null, ''], [123, ''],
  [long, long.slice(0, 200).trim()], [emoji, 'a'.repeat(199)], ['A‮B​C', 'A B C'],
];
for (const [i, o] of T) { ok(cleanCtx(i) === o, `server cleanCtx(${JSON.stringify(i)})`); ok(Core.Ctx.text(i) === o, `client Ctx.text(${JSON.stringify(i)})`); }
const H = [['https://www.Example.com/a/b?q=secret#x', 'example.com'], ['news.bbc.co.uk', 'news.bbc.co.uk'], ['https://user:pw@evil.com/x', 'evil.com'], ['http://10.0.0.1/admin', ''], ['javascript:alert(1)', ''], ['a'.repeat(70) + '.com', ''], ['', ''], ['https://exa mple.com', ''], ['localhost', 'localhost']];
for (const [i, o] of H) { ok(cleanSrc(i) === o, `server cleanSrc(${i})`); ok(Core.Ctx.host(i) === o, `client Ctx.host(${i})`); }

// 2) Cards.add → ctx/src; ctxOf; xóa → mất
const c1 = await Core.Cards.add({ word: 'resilient', vi: 'kiên cường' }, { text: 'The town was <i>resilient</i> after the flood.', source: 'https://www.bbc.com/news/x?id=1', title: 'BBC' });
ok(c1.ctx === 'The town was resilient after the flood.' && c1.src === 'bbc.com', 'Cards.add: ctx sạch + src chỉ tên miền: ' + c1.ctx + ' | ' + c1.src);
ok(JSON.stringify(c1).indexOf('id=1') >= 0, 'contexts[] (tính năng cũ) giữ nguyên liên kết – không đổi hành vi cũ');
ok(Core.Cards.ctxOf(c1).own === true && Core.Cards.ctxOf(c1).src === 'bbc.com', 'ctxOf: câu của người học');
ok(Core.Cards.ctxOf({ word: 'x', ex: 'Lib example.' }).own === false && Core.Cards.ctxOf({ word: 'x', ex: 'Lib example.' }).text === 'Lib example.', 'ctxOf: rơi về ví dụ thư viện');
ok(Core.Cards.ctxOf({ word: 'x' }) === null, 'ctxOf: không có gì → null');
const c2 = await Core.Cards.add({ word: 'tenant', vi: 'người thuê' }, { text: 'Write to jane.doe@mail.com about the tenant.', source: 'https://x.com/p', title: 't' });
ok(!c2.ctx && !c2.src, 'PII (email) → không lưu ctx/src');
await Core.Cards.remove('resilient');
ok(!(await Core.Cards.all()).resilient, 'xóa từ → thẻ (kèm ctx) mất'); 

// 3) máy chủ: vòng đẩy–kéo
const S = await import('../../functions/api/sync.js');
const be = sqliteD1(), M = meter(be.raw), DB = M.db, ENV = { DB };
const kp = await webcrypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await webcrypto.subtle.exportKey('jwk', kp.publicKey)), kid: 'k1' };
const b64u = b => Buffer.from(b).toString('base64url'), sec = Math.floor(Date.now() / 1000);
const tok = async sub => { const h = b64u(JSON.stringify({ alg: 'RS256', kid: 'k1' })), p = b64u(JSON.stringify({ aud: 'lexkite-app', iss: 'https://securetoken.google.com/lexkite-app', exp: sec + 3600, iat: sec, sub, email: sub + '@x.y' })), sig = await webcrypto.subtle.sign('RSASSA-PKCS1-v1_5', kp.privateKey, Buffer.from(h + '.' + p)); return h + '.' + p + '.' + b64u(sig); };
globalThis.fetch = async u => String(u).includes('googleapis') ? new Response(JSON.stringify({ keys: [jwk] })) : new Response('{}', { status: 404 });
const call = async (uid, payload, ip = 1) => { const r = await S.onRequestPost({ request: new Request('https://lexkite.com/api/sync', { method: 'POST', headers: { Authorization: 'Bearer ' + await tok(uid), Origin: 'https://lexkite.com', 'CF-Connecting-IP': '192.0.2.' + ip }, body: JSON.stringify(payload) }), env: ENV }); return { status: r.status, j: await r.json() }; };
const gzBody = obj => JSON.stringify({ z: zlib.gzipSync(JSON.stringify(obj)).toString('base64') });
const unBody = b => { const o = JSON.parse(b); return JSON.parse(o.z ? zlib.gunzipSync(Buffer.from(o.z, 'base64')).toString() : o.json); };
const doc = (obj, x) => ({ h: 'h' + JSON.stringify(obj).length, body: gzBody(obj), ...(x ? { x: 1 } : {}) });
const meta = () => ({ h: 'm1', body: JSON.stringify({ chunks: 32, updated: 1, json: '{}' }) });
const wr = async fn => { M.begin('w'); const r = await fn(); return { ...r, writes: M.end().writes }; };

await call('warm', { op: 'push', docs: { meta: meta() } }, 20); // khởi tạo lược đồ trước khi đếm
const clean = { hello: { word: 'hello', ctx: 'Say hello to the world.', src: 'bbc.com', srs: { last: 1 } } };
let r = await wr(() => call('u1', { op: 'push', docs: { meta: meta(), cards_3: doc(clean, true) } }));
ok(r.status === 200 && r.writes === 1, 'đẩy thẻ có ctx: 1 dòng ghi D1 (gói): ' + r.writes);
let p = await call('u1', { op: 'pull', have: {} }, 2);
ok(unBody(p.j.docs.cards_3.z ? JSON.stringify(p.j.docs.cards_3) : JSON.stringify(p.j.docs.cards_3)).hello.ctx === 'Say hello to the world.', 'kéo về: ctx còn nguyên');
ok(unBody(JSON.stringify(p.j.docs.cards_3)).hello.src === 'bbc.com', 'kéo về: src còn nguyên');

// thẻ bị sửa (HTML, email, URL đầy đủ, quá dài)
const dirty = { a: { word: 'a', ctx: '<img src=x onerror=alert(1)>Nice day', src: 'https://evil.com/p?token=1' }, b: { word: 'b', ctx: 'mail me: x@y.com', src: 'bbc.com' }, c: { word: 'c', ctx: 'z'.repeat(5000), src: 'q'.repeat(300) }, d: { word: 'd', ctx: 42, src: {} }, e: { word: 'e', vi: 'không ctx' } };
r = await call('u2', { op: 'push', docs: { cards_5: doc(dirty, true) } }, 3);
p = await call('u2', { op: 'pull', have: {} }, 4);
const got = unBody(JSON.stringify(p.j.docs.cards_5));
ok(got.a.ctx === 'Nice day' && got.a.src === 'evil.com', 'server: bỏ HTML + rút URL về tên miền: ' + JSON.stringify(got.a));
ok(!('ctx' in got.b) && !('src' in got.b), 'server: email → bỏ ctx và src');
ok(got.c.ctx.length === 200 && !('src' in got.c), 'server: cắt 200, src dài → bỏ');
ok(!('ctx' in got.d) && !('src' in got.d) && got.e.vi === 'không ctx', 'server: sai kiểu → bỏ; thẻ khác nguyên vẹn');
// không cờ (máy khách cũ) → không giải nén, đi thẳng
const old = { z: { word: 'z', vi: 'cũ', srs: { last: 5 } } };
const od = doc(old, false); r = await call('u3', { op: 'push', docs: { cards_1: od } }, 5);
p = await call('u3', { op: 'pull', have: {} }, 6);
ok(r.status === 200 && JSON.stringify(p.j.docs.cards_1) === od.body, 'máy khách cũ (không cờ, không ctx): thân lưu nguyên byte');
// thân hỏng có cờ → 400
r = await call('u4', { op: 'push', docs: { cards_1: { h: 'q', body: '{"z":"@@@"}', x: 1 } } }, 7);
ok(r.status === 400, 'cờ x:1 + thân hỏng → 400 bad-doc: ' + r.status);
// xóa thẻ: đẩy nhóm không còn thẻ → ctx biến mất khỏi dữ liệu
await call('u1', { op: 'push', docs: { cards_3: doc({}, false) } }, 8);
p = await call('u1', { op: 'pull', have: {} }, 9);
ok(!JSON.stringify(unBody(JSON.stringify(p.j.docs.cards_3))).includes('Say hello'), 'xóa từ → ctx đi theo (nhóm đồng bộ không còn)');

// 4) ngân sách dung lượng: 300 thẻ có ctx (≈ câu 90 ký tự) so với không có
const mk = withCtx => Object.fromEntries(Array.from({ length: 300 }, (_, i) => [`w${i}`, { word: 'w' + i, vi: 'nghĩa ' + i, srs: { last: 1e12 + i, due: 1e12 + i * 7, iv: 3 }, added: 1e12, contexts: [{ text: `This is a sample sentence number ${i} that uses the word w${i} in real context.`, source: 'https://www.bbc.com/news/' + i, title: 'BBC', at: 1e12 }], ...(withCtx ? { ctx: `This is a sample sentence number ${i} that uses the word w${i} in real context.`, src: 'bbc.com' } : {}) }]));
const sz = o => Buffer.byteLength(gzBody(o)), a0 = sz(mk(false)), a1 = sz(mk(true));
ok((a1 - a0) / 300 <= 25, `dung lượng: +${((a1 - a0) / 300).toFixed(1)} byte/thẻ sau gzip (≤ 25)`);
ok(Buffer.byteLength(JSON.stringify({ ctx: 'x'.repeat(200), src: 'q'.repeat(64) })) < 320, 'trần thô mỗi thẻ ≤ ~270 byte');

console.log(fails ? `✗ sync-ctx: ${fails}/${n} lỗi` : `✓ sync-ctx: ${n}/${n} đạt`);
process.exit(fails ? 1 : 0);
