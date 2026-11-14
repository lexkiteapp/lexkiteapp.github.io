/* GET /api/funnel-digest – số phễu hôm qua cho bản tóm tắt hằng ngày (.github/workflows/funnel-digest.yml → scripts/growth/funnel-digest.mjs).
 * Xác thực: X-Studio-Secret = STUDIO_CALLBACK_SECRET (như /api/ads-report), chỉ đọc, đệm 10 phút. Chỉ SỐ ĐẾM đã tổng hợp – không vid/email.
 * (bot lấy từ sessions của đúng ngày đầu máy → dùng chỉ mục sessions_day, không quét bảng)
 * Người thật: lượt cài app (vid_attr) bỏ máy tự động (sessions.bot: ci · ci-app · ua · bot · dc); lượt xem/bấm trang /go chỉ là bộ đếm theo kênh nên không tách được. */
import { channelData } from './_funnel.js';
import { limit } from './sync.js';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(x => x.toString(16).padStart(2, '0')).join('');
async function secretOk(env, given) {
  const want = env.STUDIO_CALLBACK_SECRET; if (!want || !given) return false;
  const [a, b] = await Promise.all([hex('fd|' + want), hex('fd|' + given)]); let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0;
}
export async function digest(db, now = Date.now()) {
  const c = await channelData(db, 7, now), s = c.summary;
  const bots = async day => { try { const r = await db.prepare('SELECT COUNT(*) AS n FROM vid_attr WHERE day = ?1 AND vid IN (SELECT vid FROM sessions WHERE day = ?1 AND bot IS NOT NULL)').bind(day).first(); return (r && r.n) || 0; } catch (e) { return 0; } };
  const day2 = new Date(Date.parse(s.day + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
  const [b1, b2] = await Promise.all([bots(s.day), bots(day2)]);
  return {
    day: s.day, views: s.views, prevViews: s.prevViews, ctas: s.ctas, prevCtas: s.prevCtas,
    app: Math.max(0, s.app - b1), prevApp: Math.max(0, s.prevApp - b2), fl: s.fl, prevFl: s.prevFl,
    install: c.install, top: c.rows.slice(0, 5).map(r => ({ src: r.src, camp: r.camp, code: r.code, views: r.go_view, app: r.app, fl: r.fl })),
  };
}
export async function onRequestGet({ request, env }) {
  if (!env.STUDIO_CALLBACK_SECRET) return json(503, { error: 'not-configured' });
  if (await limit('funnel-digest:' + (request.headers.get('CF-Connecting-IP') || '?'), 10, 600)) return json(429, { error: 'too-fast' });
  if (!(await secretOk(env, request.headers.get('X-Studio-Secret')))) return json(403, { error: 'forbidden' });
  try { return json(200, await digest(env.DB)); } catch (e) { return json(500, { error: 'server' }); }
}
