// media.lexkite.com – CDN ảnh (blog, ảnh chụp app) + kho dựng video /library/ (scripts/video/library.mjs): Cloudflare đứng trước kho GitHub Pages lexkiteapp/lexkite-media.
// Máy chủ gần người dùng. Ảnh blog: tên có mã băm → cache 1 năm immutable. /library/: tên chuẩn cố định (có thể cập nhật bằng _vN) → cache 1 ngày.
// MP4 hỗ trợ Range (tua video). Khi kho gần 1 GB: đổi ORIGIN sang R2, URL giữ nguyên.
const ORIGIN = 'https://lexkiteapp.github.io/lexkite-media';
const YEAR = 31536000, DAY = 86400;
const TYPES = { avif: 'image/avif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', mp4: 'video/mp4', json: 'application/json' };
export default {
  async fetch(req) {
    const url = new URL(req.url), m = url.pathname.match(/^\/([a-z0-9/_.-]+)\.(avif|webp|png|jpe?g|svg|mp4|json)$/i);
    const ext = m && m[2].toLowerCase(), lib = url.pathname.startsWith('/library/');
    if (!['GET', 'HEAD'].includes(req.method) || !m || url.pathname.includes('..') || ((ext === 'mp4' || ext === 'json') && !lib)) return new Response('Not found', { status: 404 });
    const range = ext === 'mp4' ? req.headers.get('Range') : null;
    const ttl = lib ? DAY : YEAR;
    const r = await fetch(ORIGIN + url.pathname, { method: req.method, headers: range ? { Range: range } : {}, cf: range ? {} : { cacheEverything: true, cacheTtlByStatus: { '200-299': ttl, '404': 600, '500-599': 0 } } });
    const h = new Headers({ 'Content-Type': TYPES[ext], 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Timing-Allow-Origin': '*' });
    h.set('Cache-Control', r.ok ? (lib ? `public, max-age=${DAY}` : `public, max-age=${YEAR}, immutable`) : 'public, max-age=600');
    for (const k of ['etag', 'content-range', 'last-modified'].concat(ext === 'json' ? [] : ['content-length'])) if (r.headers.get(k)) h.set(k, r.headers.get(k));
    if (ext === 'mp4') h.set('Accept-Ranges', 'bytes');
    return new Response(r.body, { status: r.status, headers: h });
  },
};
