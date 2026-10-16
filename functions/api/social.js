/* Proxy GrabCast cho Quản trị → Video & Social (/admin.html#social). Chỉ quản trị viên (cùng cổng với /api/admin).
 * POST /api/social  (Authorization: Bearer <Firebase ID token>)  { method, path, query?, body?, idem? }
 *   method + path phải khớp danh sách cho phép (ROUTES) – path tương đối sau /api/social, ví dụ "posts/abc/schedule".
 * Khóa GrabCast (secret GRABCAST_API_KEY) chỉ gắn vào header ở máy chủ: không bao giờ trả về trình duyệt, không ghi log.
 * Thiếu GRABCAST_API_KEY → 503 { error: 'not-configured' } để giao diện hiện hướng dẫn cài đặt.
 * Kết nối/ngắt kênh, xóa: KHÔNG qua đây (khóa không có quyền) – làm trên grabcast.click. */
import { adminGate, adminAudit, adminCors } from './admin.js';
import { limit } from './sync.js';

const BASE = 'https://grabcast-api-342720596878.us-central1.run.app'; // ghi đè bằng env GRABCAST_API_BASE
const WS_DEFAULT = '4'; // workspace Lexkite trên GrabCast (không phải bí mật) – ghi đè bằng env GRABCAST_WORKSPACE
const TIMEOUT = 15000, MAX_BODY = 64 * 1024;
const ID = '[A-Za-z0-9_-]{1,100}'; // không cho '.' → chặn posts/.. (đi ngược thư mục)
// [method, mẫu path, tên ngắn ghi nhật ký]
const ROUTES = [
  ['GET', 'accounts'], ['GET', 'posts'], ['GET', `posts/${ID}`], ['GET', `media/${ID}`],
  ['POST', 'media/upload-url'], ['POST', `media/${ID}/complete`],
  ['POST', 'posts/validate'], ['POST', 'posts'], ['PATCH', `posts/${ID}`],
  ['POST', `posts/${ID}/(?:schedule|unschedule|publish-now|retry|cancel)`],
  ['POST', `storage/objects/${ID}/use`],
  ['GET', 'storage/stores'], ['GET', 'storage/objects'],
  ['POST', 'storage/objects'], ['POST', `storage/objects/${ID}/(?:complete|abort)`],
].map(([m, p]) => [m, new RegExp('^' + p + '$')]);
export const allowed = (method, path) => ROUTES.some(([m, re]) => m === method && re.test(path));

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...adminCors(req) } });
// Xóa mọi lần xuất hiện của khóa (phòng máy chủ GrabCast lỡ trả lại khóa trong nội dung/lỗi)
const scrub = (text, key) => (key && key.length >= 6 ? String(text).split(key).join('***') : String(text));

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: adminCors(request) });

export async function onRequestPost({ request, env }) {
  const g = await adminGate(request, env, 'soc'); if (!g.who) return json(request, g.status, { error: g.error });
  if (+(request.headers.get('Content-Length') || 0) > MAX_BODY) return json(request, 413, { error: 'too-large' });
  let b; try { b = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const method = String((b && b.method) || 'GET').toUpperCase(), path = String((b && b.path) || '').replace(/^\/+|\/+$/g, '').replace(/^api\/social\//, '');
  if (!allowed(method, path)) return json(request, 400, { error: 'route', message: `${method} ${path.slice(0, 80)} không nằm trong danh sách cho phép` });
  const key = env.GRABCAST_API_KEY, ws = String(env.GRABCAST_WORKSPACE || WS_DEFAULT).trim();
  if (!key || !ws) return json(request, 503, { error: 'not-configured' });
  // Hạn mức GrabCast: 60 lượt/phút, 3.000/ngày – chặn sớm ở đây (đếm theo trung tâm dữ liệu, chừa biên an toàn)
  if (await limit('gc:min', 55, 60) || await limit('gc:day', 2900, 86400)) return json(request, 429, { error: 'grabcast-rate' });

  const url = new URL((String(env.GRABCAST_API_BASE || BASE).replace(/\/+$/, '')) + '/api/social/' + path);
  if (b.query && typeof b.query === 'object') for (const [k, v] of Object.entries(b.query)) if (/^[a-z_]{1,24}$/.test(k) && v != null && v !== '') url.searchParams.set(k, String(v).slice(0, 200));
  const headers = { 'X-API-Key': key, 'X-Workspace': String(ws), Accept: 'application/json' };
  if (method !== 'GET') headers['Content-Type'] = 'application/json';
  if (b.idem && /^[A-Za-z0-9_-]{8,80}$/.test(String(b.idem))) headers['Idempotency-Key'] = String(b.idem);
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), TIMEOUT);
  let status = 502, text = '';
  try {
    const r = await fetch(url.toString(), { method, headers, body: method === 'GET' ? undefined : JSON.stringify(b.body || {}), signal: ctl.signal });
    status = r.status; text = await r.text();
  } catch (e) {
    clearTimeout(timer);
    if (method !== 'GET') await adminAudit(env, request, g.who.email, 'gc:' + method + ' ' + path, false);
    return json(request, 504, { error: ctl.signal.aborted ? 'timeout' : 'upstream' }); // không đưa e.message (có thể chứa URL/headers)
  }
  clearTimeout(timer);
  if (method !== 'GET') await adminAudit(env, request, g.who.email, ('gc:' + method + ' ' + path.replace(new RegExp(ID.replace('{1,100}', '{16,}'), 'g'), ':id')), status < 400);
  let data; try { data = JSON.parse(scrub(text, key)); } catch (e) { data = { error: 'upstream', message: scrub(text, key).slice(0, 300) }; }
  if (status >= 400 && data && typeof data === 'object' && !Array.isArray(data) && !data.error) data.error = 'upstream';
  return json(request, status >= 200 && status < 600 ? status : 502, data);
}
