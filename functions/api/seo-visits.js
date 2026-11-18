/* GET /api/seo-visits?days=28 – khách THẬT từ công cụ tìm kiếm vào trang tĩnh theo ngày × nhóm CPM (ext_events 'land:…' do hit.js t:'l' ghi) cho báo cáo tuần
 * (scripts/seo/gsc.mjs → issue seo-weekly). Xác thực: X-Studio-Secret = STUDIO_CALLBACK_SECRET (như /api/funnel-digest), chỉ đọc, chỉ SỐ ĐẾM đã gộp – không URL/IP/vid. */
import { searchDaily } from './_cpm.js';
import { dayOf } from './hit.js';
import { limit } from './sync.js';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
async function secretOk(env, given) {
  const want = env.STUDIO_CALLBACK_SECRET; if (!want || !given) return false;
  const [a, b] = await Promise.all([hex('sv|' + want), hex('sv|' + given)]); let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
export async function visits(db, days, now = Date.now()) {
  const from = dayOf(now - (days - 1) * 864e5);
  const rows = (await db.prepare("SELECT day, kind, n FROM ext_events WHERE day >= ?1 AND kind >= 'land:' AND kind < 'land;'").bind(from).all()).results || [];
  return { from, to: dayOf(now), days: searchDaily(rows) };
}
export async function onRequestGet({ request, env }) {
  if (!env.STUDIO_CALLBACK_SECRET) return json(503, { error: 'not-configured' });
  if (await limit('seo-visits:' + (request.headers.get('CF-Connecting-IP') || '?'), 10, 600)) return json(429, { error: 'too-fast' });
  if (!(await secretOk(env, request.headers.get('X-Studio-Secret')))) return json(403, { error: 'forbidden' });
  const days = Math.min(90, Math.max(1, parseInt(new URL(request.url).searchParams.get('days'), 10) || 28));
  try { return json(200, await visits(env.DB, days)); } catch (e) { return json(500, { error: 'server' }); }
}
