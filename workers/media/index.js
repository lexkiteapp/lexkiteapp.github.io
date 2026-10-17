// media.lexkite.com – CDN ảnh (blog, ảnh chụp app) + kho dựng video /library/ (scripts/video/library.mjs): Cloudflare đứng trước kho GitHub Pages lexkiteapp/lexkite-media.
// Máy chủ gần người dùng. Ảnh blog: tên có mã băm → cache 1 năm immutable. /library/: tên chuẩn cố định (có thể cập nhật bằng _vN) → cache 1 ngày.
// MP4 hỗ trợ Range (tua video). Khi kho gần 1 GB: đổi ORIGIN sang R2, URL giữ nguyên.
const ORIGIN = 'https://lexkiteapp.github.io/lexkite-media';
const YEAR = 31536000, DAY = 86400;
const TYPES = { avif: 'image/avif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', mp4: 'video/mp4', json: 'application/json' };
export default {
  async fetch(req, env = {}, ctx) {
    const url = new URL(req.url), m = url.pathname.match(/^\/([a-z0-9/_.-]+)\.(avif|webp|png|jpe?g|svg|mp4|json)$/i);
    const ext = m && m[2].toLowerCase(), lib = url.pathname.startsWith('/library/');
    if (!['GET', 'HEAD'].includes(req.method) || !m || url.pathname.includes('..') || ((ext === 'mp4' || ext === 'json') && !lib)) return new Response('Not found', { status: 404 });
    // Ảnh riêng từng bài (/blog/p/<hash>-<w>.<ext>, scripts/blog-images.mjs): R2 bucket lexkite-blog-media (binding BLOG_MEDIA) nếu đã gắn,
    // không có/không thấy → lùi về ORIGIN GitHub Pages (dự phòng khi CI đẩy vào repo lexkite-media). Tên theo mã băm → immutable.
    if (env.BLOG_MEDIA && url.pathname.startsWith('/blog/p/')) {
      const cache = typeof caches !== 'undefined' ? caches.default : null, key = new Request(url.origin + url.pathname); // cache biên: lượt đọc R2 (Class B) chỉ khi trượt cache
      const hit = cache && req.method === 'GET' ? await cache.match(key) : null; if (hit) return hit;
      const obj = await env.BLOG_MEDIA.get(url.pathname.slice(1));
      if (obj) {
        const h = new Headers({ 'Content-Type': TYPES[ext], 'Cache-Control': `public, max-age=${YEAR}, immutable`, 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Timing-Allow-Origin': '*', ETag: obj.httpEtag, 'Content-Length': String(obj.size) });
        const res = new Response(req.method === 'HEAD' ? null : obj.body, { status: 200, headers: h });
        if (cache && req.method === 'GET' && ctx) ctx.waitUntil(cache.put(key, res.clone()));
        return res;
      }
    }
    const range = ext === 'mp4' ? req.headers.get('Range') : null;
    const ttl = lib ? DAY : YEAR;
    const r = await fetch(ORIGIN + url.pathname, { method: req.method, headers: range ? { Range: range } : {}, cf: range ? {} : { cacheEverything: true, cacheTtlByStatus: { '200-299': ttl, '404': 600, '500-599': 0 } } });
    const h = new Headers({ 'Content-Type': TYPES[ext], 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Timing-Allow-Origin': '*' });
    h.set('Cache-Control', r.ok ? (lib ? `public, max-age=${DAY}` : `public, max-age=${YEAR}, immutable`) : 'public, max-age=600');
    for (const k of ['etag', 'content-range', 'last-modified'].concat(ext === 'json' ? [] : ['content-length'])) if (r.headers.get(k)) h.set(k, r.headers.get(k));
    if (ext === 'mp4') h.set('Accept-Ranges', 'bytes');
    if (ext === 'svg') h.set('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; img-src data:; sandbox"); // mở SVG trực tiếp: không chạy script (ảnh <img> không bị ảnh hưởng)
    return new Response(r.body, { status: r.status, headers: h });
  },
};
