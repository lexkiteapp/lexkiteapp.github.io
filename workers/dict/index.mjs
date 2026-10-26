// 📖 Worker lexkite-dict – trang từ điển (docs/SEO-DICT-PAGES.md §6).
// Tầng 1: Workers Static Assets (dist-dict/assets) – trang dựng sẵn, sitemap, hub: Cloudflare phục vụ thẳng, KHÔNG gọi script này, KHÔNG tính lượt.
// Tầng 2 (script này, chỉ khi không có asset): trang đuôi dài = JSON trên R2 (binding DICT, bucket lexkite-dict-data) → render.mjs → Cache API ở biên.
// Không D1, không KV, không gọi mạng ngoài. noindex mặc định: DICT_INDEX rỗng (wrangler.toml [vars]); mở dần theo docs §5.
import { renderWord, parseOpen, DICT_PATH, ENABLED, hubPath } from './render.mjs';

const ROUTE = new Map(ENABLED.map(l => [`/${l}/${DICT_PATH[l]}/`, l]));
let SHELL = null; // khung chung đọc 1 lần mỗi isolate (R2 v1/shell.json)
const nf = (msg = 'Not found') => new Response(msg, { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8', 'x-robots-tag': 'noindex', 'cache-control': 'public, max-age=300' } });

export function parse(pathname) {
  for (const [base, lang] of ROUTE) {
    if (!pathname.startsWith(base)) continue;
    const rest = pathname.slice(base.length);
    const m = rest.match(/^([^/]+)(\/?)$/);
    if (!m) return null;
    const raw = decodeURIComponent(m[1]), slug = raw.toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return null;
    if (slug !== raw || !m[2]) return { redirect: `${base}${slug}/` }; // 1 URL chuẩn: chữ thường + gạch chéo cuối
    return { lang, slug };
  }
  return null;
}

export default {
  async fetch(req, env, ctx) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('', { status: 405, headers: { allow: 'GET, HEAD' } });
    const u = new URL(req.url);
    if (ROUTE.has(u.pathname.replace(/\/?$/, '/')) && !u.pathname.endsWith('/')) return Response.redirect(u.origin + u.pathname + '/', 301);
    const r = parse(u.pathname);
    if (!r) return nf();
    if (r.redirect) return Response.redirect(u.origin + r.redirect, 301);
    const cache = typeof caches !== 'undefined' ? caches.default : null, key = new Request(u.origin + u.pathname);
    const hit = cache && (await cache.match(key));
    if (hit) return hit;
    if (!env.DICT) return nf();
    const [obj, shell] = await Promise.all([env.DICT.get(`v1/${r.lang}/${r.slug}.json`), SHELL || env.DICT.get('v1/shell.json').then(o => (o ? o.json() : null))]);
    if (!obj || !shell) return nf();
    SHELL = shell;
    const d = await obj.json(), open = parseOpen(env.DICT_INDEX || '');
    const html = renderWord(d, shell, { open }), idx = !/<meta name="robots" content="noindex/.test(html);
    const res = new Response(req.method === 'HEAD' ? null : html, { headers: {
      'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600, s-maxage=86400', 'x-content-type-options': 'nosniff',
      ...(idx ? {} : { 'x-robots-tag': 'noindex, follow' }), etag: `"${obj.etag || ''}${open[r.lang] || 0}"`, link: `<https://lexkite.com${hubPath(r.lang)}>; rel="up"` } });
    if (cache && req.method === 'GET') ctx.waitUntil(cache.put(key, res.clone()));
    return res;
  },
};
