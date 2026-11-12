// /api/img: nguồn ngoài treo không được làm máy khách đợi quá hạn của nó (12 s, web/js/dictionary.js), và không được ghi nhớ "không có ảnh" 7 ngày.
// Gốc: lượt trượt đệm không có hạn thời gian → > 40 s (đo prod 4/11, w=action) → thẻ add-on chỉ có emoji, ext-e2e đỏ ngẫu nhiên từ 30/10.
import assert from 'node:assert';
import { onRequestGet, UP_MS } from '../../functions/api/img.js';

assert.ok(UP_MS * 2 < 12000, 'Wikipedia + Openverse cộng lại < hạn máy khách 12 s');
const puts = [], alive = setInterval(() => {}, 500); // timer của AbortSignal.timeout không giữ tiến trình sống
globalThis.caches = { default: { match: async () => null, put: async (k, r) => { puts.push(r.headers.get('Cache-Control')); } } };
const call = async () => { const t0 = Date.now(), r = await onRequestGet({ request: new Request('https://lexkite.com/api/img?w=action', { headers: { 'CF-Connecting-IP': '1.2.3.4' } }), env: {}, waitUntil: p => p }); return { j: await r.json(), ms: Date.now() - t0 }; };

// 1) cả hai nguồn treo → trả nhanh, báo retry, đệm ngắn
globalThis.fetch = (u, o) => new Promise((_, rej) => { assert.ok(o && o.signal, 'mọi lệnh gọi nguồn ngoài phải có signal: ' + u); o.signal.addEventListener('abort', () => rej(o.signal.reason)); });
{ const { j, ms } = await call(); assert.ok(ms < 12000, `treo → trả trong ${ms} ms`); assert.ok(j.none && j.retry, 'treo → retry: ' + JSON.stringify(j)); assert.match(puts.at(-1), /max-age=600\b/); }

// 2) Wikipedia treo + Openverse không có ảnh → không ghi nhớ "không có ảnh" 7 ngày
globalThis.fetch = (u, o) => (/wikipedia/.test(u) ? Promise.reject(new Error('timeout')) : Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 })));
{ const { j } = await call(); assert.ok(j.retry, 'wiki lỗi + openverse rỗng → retry'); assert.match(puts.at(-1), /max-age=600\b/); }

// 3) thật sự không có ảnh (cả hai trả lời bình thường) → vẫn đệm 7 ngày như trước
globalThis.fetch = (u, o) => (/wikipedia/.test(u) ? Promise.resolve(new Response('{}', { status: 404 })) : Promise.resolve(new Response(JSON.stringify({ results: [] }), { status: 200 })));
{ const { j } = await call(); assert.ok(j.none && !j.retry, 'không có ảnh thật'); assert.match(puts.at(-1), /max-age=604800\b/); }
clearInterval(alive);
console.log('✓ img-api: nguồn ngoài có hạn, lỗi tạm không thành "không có ảnh"');
