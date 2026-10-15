/* Cấu hình công khai do quản trị đặt (thông báo đầu trang…) – GET /api/config, đệm 5 phút ở biên Cloudflare. */
export const PUBLIC_KEYS = ['banner', 'banner_url', 'banner_level'];
export async function onRequestGet({ env }) {
  const out = {};
  try {
    const { results } = await env.DB.prepare(`SELECT k, v FROM config WHERE k IN (${PUBLIC_KEYS.map(() => '?').join(',')})`).bind(...PUBLIC_KEYS).all();
    for (const r of results || []) out[r.k] = r.v;
  } catch (e) { /* chưa có bảng config */ }
  return new Response(JSON.stringify(out), { headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=300', 'Access-Control-Allow-Origin': '*' } });
}
