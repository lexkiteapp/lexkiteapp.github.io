/* GET /api/ref?c=<mã mời 8 ký tự> → { n } = số bạn được mời đã học xong bài đầu (trần 3/ngày, 10 tổng) – vòng giới thiệu (docs/specs/referral.md, functions/api/_funnel.js).
 * Không đăng nhập, không lưu IP/vid; ≤ 60 lượt/IP/giờ; D1 ≥ 85 % → trả n:0 (app thử lại lần mở sau). Phần thưởng cấp TRONG app (XP + đóng băng chuỗi, $0). */
import { limit, cors } from './sync.js';
import { shedRead } from './_d1guard.js';
import { setup } from './hit.js';
import { refCount } from './_funnel.js';

const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'private, max-age=300', ...cors(req) } });
export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });
export async function onRequestGet({ request, env }) {
  const c = new URL(request.url).searchParams.get('c') || '';
  if (!/^[a-z0-9]{8}$/.test(c) || !env || !env.DB) return json(request, 200, { n: 0 });
  if (shedRead(env, (st, d) => json(request, st, d))) return json(request, 200, { n: 0, shed: 1 });
  if (await limit('ref:' + (request.headers.get('CF-Connecting-IP') || '?'), 60, 3600)) return json(request, 429, { n: 0 });
  try { await setup(env.DB); return json(request, 200, { n: await refCount(env.DB, c) }); } catch (e) { return json(request, 200, { n: 0 }); }
}
