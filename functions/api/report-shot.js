// Ảnh chụp báo lỗi cho quản trị (docs/REPORTS.md § Ảnh chụp): GET /api/report-shot?id=…&e=…&s=… – URL do op 'shot' (report.js) ký HMAC, sống 5 phút.
// Đọc nhị phân từ R2 riêng (REPORT_SHOTS, khóa report/<id>); không cache, không nhúng được vào trang khác, chỉ kiểu ảnh.
import { SHOT_KEY, shotOk } from './report.js';
const TYPES = ['image/jpeg', 'image/webp', 'image/png'];
export async function onRequestGet({ request, env }) {
  const u = new URL(request.url), id = +u.searchParams.get('id') || 0;
  if (!env || !env.REPORT_SHOTS || !(await shotOk(env, id, u.searchParams.get('e'), u.searchParams.get('s')))) return new Response('Forbidden', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  const o = await env.REPORT_SHOTS.get(SHOT_KEY(id)); if (!o) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const ct = (o.httpMetadata && o.httpMetadata.contentType) || '';
  return new Response(o.body, { headers: { 'Content-Type': TYPES.includes(ct) ? ct : 'application/octet-stream', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", 'Cross-Origin-Resource-Policy': 'same-origin', 'Referrer-Policy': 'no-referrer' } });
}
