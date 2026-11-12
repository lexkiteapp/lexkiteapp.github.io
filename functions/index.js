/* Trang gốc quốc tế (docs/SEO-ARCH.md §10): "/" → 302 tới /<ngôn ngữ>/ theo cookie đã chọn → nước theo IP → Accept-Language → /en/.
 * Không xét User-Agent: Googlebot đi theo cùng luật. Chỉ chạy ở đúng "/" (web/_routes.json); URL có ngôn ngữ không bao giờ bị chuyển. */
import { rootTarget } from './api/_rootlang.js';

export function onRequest({ request }) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  let to = '/en/';
  try { const h = request.headers; to = rootTarget(h.get('Cookie'), request.cf && request.cf.country, h.get('Accept-Language'), new URL(request.url).search); } catch (e) { /* lỗi lạ vẫn đưa về /en/ */ }
  return new Response(null, { status: 302, headers: { Location: to, Vary: 'Accept-Language, Cookie', 'Cache-Control': 'private, no-store' } });
}
