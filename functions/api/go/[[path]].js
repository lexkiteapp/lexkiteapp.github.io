/* Link đếm click của bình luận đầu / link bio social (docs/DISTRIBUTION.md §6c, functions/api/_first_comment.js):
 *   GET /api/go/<fb|yt|th|x|ig|tt>/<clip>   → đếm ext_events 'soc:<nền tảng>:fc' + 'socc:<nền tảng>:<clip>' → 302 trang bài (/video/<slug>/ hoặc /app/) + UTM
 *   GET /api/go/<…>/bio[?l=<lang>]          → đếm 'soc:<nền tảng>:bio' → 302 landing nhẹ /<lang>/ + UTM
 * Không lưu IP/URL/cookie; bot xem trước link (facebookexternalhit, Twitterbot…) và HEAD không đếm; ≤ 20 lượt đếm/IP/giờ; lỗi D1 vẫn chuyển hướng
 * (người bấm không bao giờ kẹt). Đích chỉ là lexkite.com (không mở chuyển hướng tùy ý). Số liệu: Quản trị › #social › Autopilot (autoStatus.clicks). */
import { parseGo, goTarget, clickKeys, isBot } from '../_first_comment.js';
import { dayOf, automation } from '../hit.js';
import { limit } from '../sync.js';

let SLUGS = null, SLUGS_AT = 0;
/** id clip (…-<hex6>-<lang>) → slug trang /video/ (web/data/videos.json, id bài = news_…_<hex6>). Đệm 10 phút; lỗi → '' (về /app/). */
export async function slugOf(env, request, clip) {
  const h = /-([0-9a-f]{6})-[a-z]{2}$/.exec(clip); if (!h) return '';
  if (!SLUGS || Date.now() - SLUGS_AT > 6e5) {
    try {
      const u = new URL('/data/videos.json', request.url), r = env && env.ASSETS ? await env.ASSETS.fetch(u) : await fetch(u);
      const d = r.ok ? await r.json() : { items: [] }; SLUGS = new Map((d.items || []).filter(x => x && x.slug && !x.test).map(x => [String(x.id).split('_').pop(), String(x.slug)])); SLUGS_AT = Date.now();
    } catch (e) { return ''; }
  }
  return SLUGS.get(h[1]) || '';
}
export const _resetSlugs = () => { SLUGS = null; };

export async function onRequest({ request, env }) {
  const u = new URL(request.url), g = parseGo(u.pathname, u.search);
  if (!g) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const to = goTarget(g, g.clip ? await slugOf(env, request, g.clip) : '');
  const count = request.method === 'GET' && env && env.DB && !isBot(request.headers.get('User-Agent')) && !automation(request);
  if (count) {
    try {
      const ip = request.headers.get('CF-Connecting-IP') || '?';
      if (!(await limit('go:' + ip, 20, 3600))) {
        const day = dayOf(Date.now()), q = 'INSERT INTO ext_events (day, kind, n) VALUES (?1, ?2, 1) ON CONFLICT (day, kind) DO UPDATE SET n = n + 1';
        await env.DB.batch(clickKeys(g).map(k => env.DB.prepare(q).bind(day, k)));
      }
    } catch (e) { /* đếm hỏng không chặn người bấm */ }
  }
  return new Response(null, { status: 302, headers: { Location: to, 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer-when-downgrade' } });
}
