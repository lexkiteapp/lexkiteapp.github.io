#!/usr/bin/env node
// words-r2-fn: Pages Function trang từ R2 (functions/[lang]/words/[[path]].js, docs/specs/words-off-pages.md) – thiếu đối tượng/ngôn ngữ lạ/lỗi R2/timeout → next(), header đúng, cầu dao.
import fs from 'node:fs';
const { onRequest, keyOf, R2_LANGS, CACHE_CONTROL } = await import('../../functions/[lang]/words/[[path]].js');
let bad = 0; const ok = (c, m) => { console.log(`${c ? '✓' : '✗'} words-r2-fn: ${m}`); if (!c) bad++; };
const NEXT = new Response('static'), next = async () => NEXT;
const r2 = objs => ({ get: async k => (k in objs ? { httpEtag: '"e1"', arrayBuffer: async () => new TextEncoder().encode(objs[k]).buffer } : null) });
const call = async ({ url = 'https://lexkite.com/ko/words/hello', method = 'GET', env, params }) => {
  const u = new URL(url), segs = u.pathname.split('/').filter(Boolean);
  return onRequest({ request: new Request(url, { method }), env, params: params || { lang: segs[0], path: segs.slice(2) }, next, waitUntil: () => {} });
};
const env = { WORDS: r2({ 'ko/words/hello.html': '<html>안녕</html>', 'ko/words/index.html': '<html>hub</html>' }) };
let r = await call({ env });
ok(r !== NEXT && r.status === 200 && (await r.text()) === '<html>안녕</html>', 'có đối tượng → 200 từ R2');
ok(r.headers.get('content-type') === 'text/html; charset=utf-8' && r.headers.get('cache-control') === CACHE_CONTROL && /s-maxage=3600/.test(CACHE_CONTROL) && /stale-while-revalidate=86400/.test(CACHE_CONTROL), 'header content-type + cache-control đúng spec');
r = await call({ env, url: 'https://lexkite.com/ko/words/' }); ok((await r.text()) === '<html>hub</html>', '/ko/words/ → index.html');
r = await call({ env, method: 'HEAD' }); ok(r.status === 200 && (await r.text()) === '', 'HEAD → không có thân');
ok(await call({ env, url: 'https://lexkite.com/ko/words/missing' }) === NEXT, 'thiếu đối tượng → next()');
ok(await call({ env, url: 'https://lexkite.com/xx/words/hello' }) === NEXT && await call({ env, url: 'https://lexkite.com/en/words/hello' }) === NEXT && await call({ env, url: 'https://lexkite.com/vi/words/hello' }) === NEXT, 'ngôn ngữ lạ / en / vi → next()');
for (const u of ['https://lexkite.com/ko/words/a/b', 'https://lexkite.com/ko/words/..%2Fetc', 'https://lexkite.com/ko/words/Hello', 'https://lexkite.com/ko/words/hello/', 'https://lexkite.com/ko/words/hello.html'])
  ok(await call({ env, url: u }) === NEXT, `đường dẫn lạ → next(): ${u.slice(20)}`);
ok(await call({ env, method: 'POST' }) === NEXT, 'POST → next()');
ok(await call({ env: {} }) === NEXT && await call({ env: undefined }) === NEXT, 'thiếu binding WORDS → next()');
ok(await call({ env: { ...env, WORDS_R2: '0' } }) === NEXT, 'cầu dao WORDS_R2=0 → next()');
ok(await call({ env: { WORDS: { get: async () => { throw new Error('R2 down'); } } } }) === NEXT, 'R2 ném lỗi → next() (không 5xx)');
ok(await call({ env: { WORDS: { get: async () => ({ arrayBuffer: async () => { throw new Error('body'); } }) } } }) === NEXT, 'đọc thân lỗi → next()');
{ const t0 = Date.now(); const s = await call({ env: { WORDS: { get: () => new Promise(() => {}) } } }); ok(s === NEXT && Date.now() - t0 < 4000, 'R2 treo → hết giờ → next()'); }
ok(keyOf('ko', ['x']) === 'ko/words/x.html' && keyOf('ko', []) === 'ko/words/index.html' && keyOf('en', ['x']) === null, 'keyOf');
ok(R2_LANGS.length === 13 && !R2_LANGS.includes('en') && !R2_LANGS.includes('vi'), '13 ngôn ngữ, không en/vi');
const routes = JSON.parse(fs.readFileSync('web/_routes.json', 'utf8')).include.filter(x => /\/words\/\*$/.test(x)).map(x => x.split('/')[1]);
ok(routes.every(l => R2_LANGS.includes(l)), `_routes.json chỉ bật ngôn ngữ trong danh sách (${routes.join(',') || 'chưa bật'})`);
if (bad) process.exit(1); console.log('✓ words-r2-fn');
