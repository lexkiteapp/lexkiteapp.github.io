// media.lexkite.com – CDN ảnh (blog, ảnh chụp app) + kho dựng video /library/ (scripts/video/library.mjs): Cloudflare đứng trước kho GitHub Pages lexkiteapp/lexkite-media.
// Máy chủ gần người dùng. Ảnh blog: tên có mã băm → cache 1 năm immutable. /library/: tên chuẩn cố định (có thể cập nhật bằng _vN) → cache 1 ngày.
// MP4 hỗ trợ Range (tua video). Khi kho gần 1 GB: đổi ORIGIN sang R2, URL giữ nguyên.
const ORIGIN = 'https://lexkiteapp.github.io/lexkite-media';
const YEAR = 31536000, DAY = 86400;
const TYPES = { avif: 'image/avif', webp: 'image/webp', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', svg: 'image/svg+xml', mp4: 'video/mp4', json: 'application/json' };
// /video/<bài>/<tên>-<băm>.(mp4|webp|vtt): bản web của short bản tin (scripts/video/web-rendition.mjs) – gốc = GitHub Release 'wv-<bài>' của repo web.
// Tên theo mã băm → immutable 1 năm; MP4 chuyển tiếp Range (tua), VTT cho <track crossorigin>.
const VIDEO_ORIGIN = 'https://github.com/lexkiteapp/lexkiteapp.github.io/releases/download/wv-';
const VTYPES = { mp4: 'video/mp4', webp: 'image/webp', vtt: 'text/vtt; charset=utf-8' };
// R2 trước (binding BLOG_MEDIA, khoá video/<bài>/<tên> – top ~3.000 clip theo lượt xem, docs/VIDEO-STORAGE.md), không thấy → GitHub Release cũ.
export function parseRange(h, size) {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(h || '').trim()); if (!m || (!m[1] && !m[2])) return null;
  let a = m[1] ? +m[1] : size - +m[2], b = m[1] && m[2] ? Math.min(+m[2], size - 1) : size - 1; if (a < 0) a = 0;
  return a <= b && a < size ? { offset: a, length: b - a + 1 } : null;
}
async function videoR2(req, env, m) {
  const key = `video/${m[1]}/${m[2]}`, range = m[3] === 'mp4' ? req.headers.get('Range') : null;
  const head = await env.BLOG_MEDIA.head(key); if (!head) return null;
  const rg = range ? parseRange(range, head.size) : null;
  const obj = req.method === 'HEAD' ? head : await env.BLOG_MEDIA.get(key, rg ? { range: rg } : {}); if (!obj) return null;
  const h = new Headers({ 'Content-Type': VTYPES[m[3]], 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Timing-Allow-Origin': '*', 'Cache-Control': `public, max-age=${YEAR}, immutable`, ETag: head.httpEtag, 'X-Origin': 'r2' });
  if (m[3] === 'mp4') h.set('Accept-Ranges', 'bytes');
  if (rg) { h.set('Content-Range', `bytes ${rg.offset}-${rg.offset + rg.length - 1}/${head.size}`); h.set('Content-Length', String(rg.length)); } else h.set('Content-Length', String(head.size));
  return new Response(req.method === 'HEAD' ? null : obj.body, { status: rg ? 206 : 200, headers: h });
}
async function video(req, url, env = {}) {
  const m = url.pathname.match(/^\/video\/([a-z0-9_]{6,80})\/([a-z0-9_-]{1,40}-[0-9a-f]{8}\.(mp4|webp|vtt))$/);
  if (!m || !['GET', 'HEAD'].includes(req.method)) return new Response('Not found', { status: 404 });
  if (env.BLOG_MEDIA) { try { const r2 = await videoR2(req, env, m); if (r2) return r2; } catch (e) { /* R2 lỗi → Release */ } }
  const range = m[3] === 'mp4' ? req.headers.get('Range') : null;
  const r = await fetch(VIDEO_ORIGIN + m[1] + '/' + m[2], { method: req.method, redirect: 'follow', headers: range ? { Range: range } : {}, cf: { cacheEverything: true, cacheTtlByStatus: { '200-299': YEAR, '404': 300, '500-599': 0 } } });
  const h = new Headers({ 'Content-Type': VTYPES[m[3]], 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', 'Timing-Allow-Origin': '*', 'Cache-Control': r.ok ? `public, max-age=${YEAR}, immutable` : 'public, max-age=300' });
  for (const k of ['etag', 'content-range', 'content-length', 'last-modified']) if (r.headers.get(k)) h.set(k, r.headers.get(k));
  if (m[3] === 'mp4') h.set('Accept-Ranges', 'bytes');
  return new Response(r.body, { status: r.status, headers: h });
}
export default {
  async fetch(req, env = {}, ctx) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/video/')) return video(req, url, env);
    const m = url.pathname.match(/^\/([a-z0-9/_.-]+)\.(avif|webp|png|jpe?g|svg|mp4|json)$/i);
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
