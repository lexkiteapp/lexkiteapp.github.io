/* Cấu hình công khai do quản trị đặt (thông báo đầu trang…) – GET /api/config.
 * Đệm biên 5 phút (Cache API: mỗi trung tâm dữ liệu đọc D1 ≤ 1 lần/5 phút thay vì mỗi lượt gọi) + ETag/If-None-Match → 304 (docs/CAPACITY.md).
 * Quản trị đổi banner/hit_rate → hiệu lực ≤ 5 phút ở biên (máy khách còn tự đệm 1 giờ – web/js/app.js). */
export const PUBLIC_KEYS = ['banner', 'banner_url', 'banner_level', 'hit_rate'];
export const TTL = 300;
const KEY = 'https://cache.lexkite.internal/config/v1';
const etagOf = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return '"c' + (h >>> 0).toString(36) + s.length.toString(36) + '"'; };
export async function purgeConfig() { try { await /** @type {any} */ (caches).default.delete(new Request(KEY)); } catch (e) { /* bỏ qua */ } }
export async function onRequestGet({ request, env }) {
  let body = null;
  try { const hit = await /** @type {any} */ (caches).default.match(new Request(KEY)); if (hit) body = await hit.text(); } catch (e) { body = null; }
  if (body == null) {
    const out = {};
    try {
      const { results } = await env.DB.prepare(`SELECT k, v FROM config WHERE k IN (${PUBLIC_KEYS.map(() => '?').join(',')})`).bind(...PUBLIC_KEYS).all();
      for (const r of results || []) out[r.k] = r.v;
    } catch (e) { /* chưa có bảng config */ }
    body = JSON.stringify(out);
    try { await /** @type {any} */ (caches).default.put(new Request(KEY), new Response(body, { headers: { 'Cache-Control': `max-age=${TTL}` } })); } catch (e) { /* bỏ qua */ }
  }
  const etag = etagOf(body), headers = { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${TTL}`, 'Access-Control-Allow-Origin': '*', ETag: etag };
  if ((request && request.headers.get('If-None-Match')) === etag) return new Response(null, { status: 304, headers });
  return new Response(body, { headers });
}
