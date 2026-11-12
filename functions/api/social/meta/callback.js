// GET /api/social/meta/callback – Facebook Login / Instagram Login quay về đây (state ký HMAC + cookie lk_meta + nonce 1 lần) → token kênh mã hóa ở D1 soc_tokens → /admin.html#social/queue. Logic: functions/api/_meta_oauth.js
import { handleCallback } from '../../_meta_oauth.js';
import { clearCh } from '../../_social_auto.js';
import { limit } from '../../sync.js';
import { adminAudit } from '../../admin.js';
export const onRequestGet = ({ request, env }) => handleCallback(request, env, {
  limited: k => limit(k, 20, 600),
  audit: (who, what, okk) => adminAudit(env, request, who, what, okk).catch(() => {}),
  onStored: ch => clearCh(env.DB, ch),
});
