// audio.lexkite.com – Cloudflare đứng trước GitHub Pages (lexkiteapp.github.io/audio): máy chủ gần người dùng (có VN),
// bộ nhớ đệm 1 năm ở Cloudflare & trình duyệt (tên file băm theo nội dung nên không bao giờ đổi), giảm băng thông GitHub.
const ORIGIN = 'https://lexkiteapp.github.io';
const YEAR = 31536000;
export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, HEAD', 'Access-Control-Max-Age': '86400' } });
    if (!['GET', 'HEAD'].includes(req.method) || !/^\/audio\/[a-z0-9/_-]+\.mp3$/i.test(url.pathname)) return new Response('Not found', { status: 404 });
    const r = await fetch(ORIGIN + url.pathname, { cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': YEAR, '404': 3600, '500-599': 0 } } });
    const h = new Headers(r.headers);
    h.set('Access-Control-Allow-Origin', '*');
    h.set('Cache-Control', r.ok ? `public, max-age=${YEAR}, immutable` : 'public, max-age=3600');
    ['x-github-request-id', 'x-fastly-request-id', 'x-served-by', 'x-cache', 'x-cache-hits', 'x-timer', 'via'].forEach(k => h.delete(k));
    return new Response(r.body, { status: r.status, headers: h });
  },
};
