// media.lexkite.com – CDN ảnh (blog, ảnh chụp app): Cloudflare đứng trước kho GitHub Pages lexkiteapp/lexkite-media.
// Máy chủ gần người dùng, cache 1 năm (tên file có mã băm nội dung → không bao giờ đổi). Khi kho gần 1 GB: đổi ORIGIN sang R2, URL giữ nguyên.
const ORIGIN = 'https://lexkiteapp.github.io/lexkite-media';
const YEAR = 31536000;
const TYPES = { avif: 'image/avif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml' };
export default {
  async fetch(req) {
    const url = new URL(req.url), m = url.pathname.match(/^\/([a-z0-9/_.-]+)\.(avif|webp|png|jpe?g|svg)$/i);
    if (!['GET', 'HEAD'].includes(req.method) || !m || url.pathname.includes('..')) return new Response('Not found', { status: 404 });
    const r = await fetch(ORIGIN + url.pathname, { cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': YEAR, '404': 600, '500-599': 0 } } });
    const h = new Headers({ 'Content-Type': TYPES[m[2].toLowerCase()], 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Timing-Allow-Origin': '*' });
    h.set('Cache-Control', r.ok ? `public, max-age=${YEAR}, immutable` : 'public, max-age=600');
    if (r.headers.get('etag')) h.set('ETag', r.headers.get('etag'));
    return new Response(r.body, { status: r.status, headers: h });
  },
};
