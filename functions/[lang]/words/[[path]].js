/* Trang từ điển /<lang>/words/<slug> của 13 ngôn ngữ ngoài en/vi: file nằm ở R2 (bucket lexkite-words, binding WORDS), Function đọc ra
 * (docs/specs/words-off-pages.md). URL KHÔNG đổi. Luật sống còn: MỌI thứ lạ (ngôn ngữ lạ, đường dẫn lạ, thiếu binding, thiếu đối tượng,
 * R2 lỗi/chậm, cầu dao WORDS_R2=0) → context.next() = Pages phục vụ file tĩnh/404 như cũ; không bao giờ trả 5xx.
 * Chỉ ngôn ngữ có trong web/_routes.json mới đi qua đây (PR bật từng ngôn ngữ); danh sách dưới là trần an toàn. */
export const R2_LANGS = ['es', 'ja', 'id', 'pt', 'fr', 'de', 'tr', 'ru', 'ar', 'hi', 'ko', 'zh', 'th'];
export const R2_TIMEOUT_MS = 1500;
export const CACHE_CONTROL = 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Khoá R2 cho đường dẫn đã tách; null = không thuộc phạm vi (→ next). */
export function keyOf(lang, rest) {
  if (!R2_LANGS.includes(lang)) return null;
  if (rest.length === 0) return `${lang}/words/index.html`;   // /<lang>/words/
  if (rest.length === 1 && SLUG.test(rest[0])) return `${lang}/words/${rest[0]}.html`;
  return null;
}
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('r2 timeout')), ms))]);

export async function onRequest(context) {
  const { request, env, params } = context;
  try {
    if (!['GET', 'HEAD'].includes(request.method) || !env || !env.WORDS || String(env.WORDS_R2) === '0') return context.next();
    const rest = [].concat(params.path || []);
    const url = new URL(request.url), slash = url.pathname.endsWith('/');
    if (rest.length && slash) return context.next();            // /xx/words/slug/ → để Pages xử lý (chuyển hướng như cũ)
    const key = keyOf(String(params.lang), rest);
    if (!key) return context.next();
    const cache = typeof caches !== 'undefined' ? caches.default : null, ck = new Request(url.origin + url.pathname, { method: 'GET' });
    if (cache) { try { const hit = await cache.match(ck); if (hit) return request.method === 'HEAD' ? new Response(null, hit) : hit; } catch (e) { /* bỏ qua cache */ } }
    const obj = await withTimeout(env.WORDS.get(key), R2_TIMEOUT_MS);
    if (!obj) return context.next();
    const headers = { 'content-type': 'text/html; charset=utf-8', 'cache-control': CACHE_CONTROL };
    if (obj.httpEtag) headers.etag = obj.httpEtag;
    const body = await withTimeout(obj.arrayBuffer(), R2_TIMEOUT_MS);
    const res = new Response(body, { status: 200, headers });
    if (cache && context.waitUntil) context.waitUntil(cache.put(ck, res.clone()).catch(() => {}));
    return request.method === 'HEAD' ? new Response(null, { status: 200, headers }) : res;
  } catch (e) { return context.next(); }                        // R2 lỗi/chậm → Pages như cũ
}
