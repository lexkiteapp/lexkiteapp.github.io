/* POST /api/social/webhook – sự kiện bài từ GrabCast (đã đăng / lỗi / hủy) → cập nhật bảng duyệt + dist_social ngay, khỏi chờ lượt đồng bộ 6 giờ.
 * Sẵn sàng cho khi GrabCast mở webhook: secret GRABCAST_WEBHOOK_SECRET (≥ 24 ký tự, Pages). Thiếu → 503 not-configured (không nhận gì).
 * Ký: X-GrabCast-Timestamp (giây) + X-GrabCast-Signature = "sha256=" + hex(HMAC-SHA256(secret, "<ts>.<body thô>")), lệch ≤ 300 s. Logic: functions/api/_social_auto.js. */
import { limit } from '../sync.js';
import { verifyWebhook, onWebhook } from '../_social_auto.js';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const secret = String(env.GRABCAST_WEBHOOK_SECRET || ''); if (secret.length < 24) return json(503, { error: 'not-configured' });
  if (await limit('gcwh:' + (request.headers.get('CF-Connecting-IP') || '?'), 60, 60)) return json(429, { error: 'too-fast' });
  const text = await request.text().catch(() => ''); if (text.length > 64 * 1024) return json(413, { error: 'too-large' });
  if (!(await verifyWebhook(secret, request.headers.get('X-GrabCast-Timestamp'), request.headers.get('X-GrabCast-Signature'), text))) return json(401, { error: 'bad-signature' });
  let ev; try { ev = JSON.parse(text); } catch (e) { return json(400, { error: 'json' }); }
  if (!env.DB) return json(412, { error: 'not-configured' });
  const out = await onWebhook(env, ev), st = out.status || 200; delete out.status; return json(st, out);
}
