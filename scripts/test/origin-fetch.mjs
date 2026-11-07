// Kiểm scripts/test/lib/origin-fetch.mjs (memo promise + hedge cho tải media CI) và preload poster của trang video.
import assert from 'node:assert/strict'; import fs from 'node:fs';
import { makeOriginFetcher, hedged } from './lib/origin-fetch.mjs';
const sleep = ms => new Promise(r => setTimeout(r, ms)), ok = { status: 200, body: 'x' };

// 1) 5 yêu cầu đồng thời cùng URL → chỉ 1 lần tải (trước đây mỗi context tự tải → đuôi chậm của GitHub làm LCP poster 8-10 s)
{ const f = makeOriginFetcher({ hedgeMs: 1000 }); let n = 0;
  const rs = await Promise.all([1, 2, 3, 4, 5].map(() => f.load('u', ['g1'], async () => { n++; await sleep(30); return ok; })));
  assert.equal(n, 1); assert.ok(rs.every(r => r === ok)); assert.equal(f.stats.shared, 4);
  assert.equal(await f.load('u', ['g1'], async () => { n++; return ok; }), ok); assert.equal(n, 1); }

// 2) hedge: lần đầu treo → sau hedgeMs bắn lần 2, lấy bản về trước (không chờ lần treo)
{ let n = 0; const t0 = Date.now();
  const r = await hedged(async () => { const i = ++n; if (i === 1) await sleep(3000); return { status: 200, i }; }, 'g', 50);
  assert.equal(r.i, 2); assert.ok(Date.now() - t0 < 1000, 'không được chờ lần treo'); }

// 3) lỗi không được nhớ; gốc đầu 404 → thử gốc kế; mọi gốc lỗi → null
{ const f = makeOriginFetcher({ hedgeMs: 1000 }); const seen = [];
  assert.equal(await f.load('a', ['g1', 'g2'], async g => { seen.push(g); return g === 'g2' ? ok : null; }), ok); assert.deepEqual(seen, ['g1', 'g2']);
  assert.equal(await f.load('b', ['g1'], async () => null), null); assert.equal(f.memo.has('b'), false);
  assert.equal(await f.load('b', ['g1'], async () => ok), ok); // lần sau thử lại được
  assert.equal(await f.load('c', ['g1'], async () => { throw new Error('boom'); }), null); }

// 4) không key (request Range) → không memo
{ const f = makeOriginFetcher(); let n = 0; for (let i = 0; i < 2; i++) await f.load('', ['g'], async () => { n++; return ok; }); assert.equal(n, 2); }

// 5) trang video: poster có preload ưu tiên cao + preconnect media CDN (người dùng thật cũng LCP nhanh hơn)
const b = fs.readFileSync(new URL('../build-video-pages.mjs', import.meta.url), 'utf8');
assert.match(b, /rel="preload" as="image" href="\$\{esc\(it\.poster\)\}" fetchpriority="high"/); assert.match(b, /rel="preconnect" href="https:\/\/media\.lexkite\.com"/);
console.log('origin-fetch: OK');
