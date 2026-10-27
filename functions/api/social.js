/* Proxy GrabCast cho Quản trị → Video & Social (/admin.html#social). Chỉ quản trị viên (cùng cổng với /api/admin).
 * POST /api/social  (Authorization: Bearer <Firebase ID token>)  { method, path, query?, body?, idem? }
 *   method + path phải khớp danh sách cho phép (ROUTES) – path tương đối sau /api/social, ví dụ "posts/abc/schedule".
 * Khóa GrabCast (secret GRABCAST_API_KEY) chỉ gắn vào header ở máy chủ: không bao giờ trả về trình duyệt, không ghi log.
 * Thiếu GRABCAST_API_KEY → 503 { error: 'not-configured' } để giao diện hiện hướng dẫn cài đặt.
 * Kết nối/ngắt kênh, xóa: KHÔNG qua đây (khóa không có quyền) – làm trên grabcast.click.
 * path "lk/…" = quản lý social của Lexkite ở D1 (duyệt bài, bộ kênh, sức khỏe, hàng đợi, số liệu, AI caption) – functions/api/_social_mgr.js.
 * CỔNG DUYỆT (luật chủ): POST posts có scheduled_at/publish → 403; posts/:id/schedule|publish-now|retry chỉ chạy khi bài đã duyệt và nội dung chưa đổi. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';
import { opFor, approvalFor, setupMgr } from './_social_mgr.js';
import { gcClient, WS_DEFAULT } from './_grabcast.js';
import { autoOpFor } from './_social_auto.js';

const MAX_BODY = 64 * 1024;
const ID = '[A-Za-z0-9_-]{1,100}'; // không cho '.' → chặn posts/.. (đi ngược thư mục)
// [method, mẫu path, tên ngắn ghi nhật ký]
const ROUTES = [
  ['GET', 'accounts'], ['GET', 'posts'], ['GET', `posts/${ID}`], ['GET', `media/${ID}`],
  ['POST', 'media/upload-url'], ['POST', `media/${ID}/complete`],
  ['POST', 'validate'], ['POST', 'posts/validate'], ['POST', 'posts'], ['PATCH', `posts/${ID}`],
  ['GET', `posts/${ID}/insights`], ['GET', `tiktok/creator-info/${ID}`], // ngăn chi tiết (số liệu) · biểu mẫu TikTok (quyền riêng tư của creator)
  ['POST', `posts/${ID}/(?:schedule|unschedule|publish-now|retry|cancel)`],
  ['POST', `storage/objects/${ID}/use`],
  ['GET', 'storage/stores'], ['GET', 'storage/objects'],
  ['POST', 'storage/objects'], ['POST', `storage/objects/${ID}/(?:complete|abort)`],
].map(([m, p]) => [m, new RegExp('^' + p + '$')]);
export const allowed = (method, path) => ROUTES.some(([m, re]) => m === method && re.test(path));

const json = (req, status, data, extra = {}) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req), ...extra } });

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'soc'); if (!g.who) return json(request, g.status, { error: g.error });
  if (+(request.headers.get('Content-Length') || 0) > MAX_BODY) return json(request, 413, { error: 'too-large' });
  let b; try { b = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const method = String((b && b.method) || 'GET').toUpperCase(), path = String((b && b.path) || '').replace(/^\/+|\/+$/g, '').replace(/^api\/social\//, '');
  if (!path.startsWith('lk/') && !allowed(method, path)) return json(request, 400, { error: 'route', message: `${method} ${path.slice(0, 80)} không nằm trong danh sách cho phép` });
  const key = env.GRABCAST_API_KEY, ws = String(env.GRABCAST_WORKSPACE || WS_DEFAULT).trim();
  if ((!key || !ws) && !/^lk\/auto(\/|$)/.test(path)) return json(request, 503, { error: 'not-configured' }); // thẻ autopilot vẫn mở được khi thiếu khóa (báo 'no-key')
  // Hạn mức GrabCast: 60 lượt/phút, 3.000/ngày – chặn sớm ở đây (đếm theo trung tâm dữ liệu, chừa biên an toàn)
  if (await limit('gc:min', 55, 60) || await limit('gc:day', 2900, 86400)) return json(request, 429, { error: 'grabcast-rate' });

  // Gọi GrabCast (máy chủ) → { status, data } – khóa đã được xóa khỏi nội dung trả về (functions/api/_grabcast.js)
  const gc = gcClient(env);
  const short = path.replace(new RegExp(ID.replace('{1,100}', '{16,}'), 'g'), ':id');

  // ---- Lexkite: lk/… ----
  if (path.startsWith('lk/')) {
    const op = opFor(method, path) || autoOpFor(method, path); if (!op) return json(request, 400, { error: 'route' });
    if (!env.DB) return json(request, 412, { error: 'not-configured' });
    const who = g.who.email;
    if (await limit('lk:' + who, 120, 60) || (path === 'lk/ai/caption' && await limit('lkai:' + who, 10, 60)) || (/^lk\/(clips\/push|queue\/apply|auto\/run)$/.test(path) && await limit('lkpush:' + who, 12, 60))) return json(request, 429, { error: 'too-fast' });
    const bb = b.body && typeof b.body === 'object' && !Array.isArray(b.body) ? b.body : {};
    try {
      await setupMgr(env.DB);
      const out = await op({ db: env.DB, env, b: bb, who, gc, idem: b.idem && /^[A-Za-z0-9_-]{8,80}$/.test(String(b.idem)) ? String(b.idem) : null, request });
      const st = out.status || 200, cookie = out._cookie; delete out.status; delete out._cookie; // _cookie: phiên OAuth Meta (lk_meta, HttpOnly) – không vào JSON
      if (method !== 'GET') await adminAudit(env, request, who, 'soc:' + path, st < 400);
      return json(request, st, out, cookie ? { 'Set-Cookie': cookie } : {});
    } catch (e) {
      if (method !== 'GET') await adminAudit(env, request, who, 'soc:' + path, false);
      return json(request, e.status && e.status < 600 ? e.status : 500, { error: e.code || 'error', ...(e.extra ? { detail: e.extra } : {}) });
    }
  }

  // ---- Cổng duyệt: không gì công khai khi chưa duyệt ----
  const bd = b.body && typeof b.body === 'object' ? b.body : {};
  if (method === 'POST' && path === 'posts' && (bd.scheduled_at || bd.publish_now || (bd.status && bd.status !== 'draft'))) return json(request, 403, { error: 'needs-approval' });
  const pm = method === 'POST' && /^posts\/([A-Za-z0-9_-]{1,100})\/(schedule|publish-now|retry)$/.exec(path);
  if (pm) {
    const a = await approvalFor(env, pm[1], gc);
    if (!a.ok) { await adminAudit(env, request, g.who.email, 'gc:blocked ' + short, false); return json(request, a.error === 'needs-approval-db' ? 412 : 403, { error: a.error }); }
  }
  const r = await gc(method, path, b.body, b.query, b.idem);
  if (method !== 'GET') await adminAudit(env, request, g.who.email, 'gc:' + method + ' ' + short, r.status < 400);
  if (r.status === 504) return json(request, 504, r.data);
  const status = r.status, data = r.data;
  return json(request, status >= 200 && status < 600 ? status : 502, data);
}
