/* GET /api/ads-reward – URL gọi lại Server-Side Verification (SSV) của AdMob cho quảng cáo CÓ THƯỞNG (docs/ADS.md §4c).
 * Google ký URL (ECDSA P-256) → xác minh bằng khóa công khai gstatic → cộng lượt AI hôm nay cho đúng máy/tài khoản (trừ bộ đếm quota_count).
 * TẮT mặc định: chỉ chạy khi biến môi trường ADS_SSV = '1' (bật cùng lúc với AdMob thật). Không ghi PII: user_id = mã thiết bị ngẫu nhiên lk.dev. */
import { verifySsv } from './_ads.js';
import { dayKey, setupQuota } from './_quota.js';

export const REWARD = { ai: 3, chat: 10 };    // lượt thêm mỗi lần xem hết: ai = chấm/giải thích bằng AI, chat = lượt thoại Roleplay
export const MAX_PER_DAY = 3;                 // tối đa 3 lần thưởng / tính năng / máy / ngày
const UP = 'INSERT INTO quota_count (k, day, n) VALUES (?1, ?2, ?3) ON CONFLICT (k, day) DO UPDATE SET n = n + ?3 RETURNING n';
const res = (s, b = '') => new Response(b, { status: s, headers: { 'Cache-Control': 'no-store' } });

export async function onRequestGet({ request, env }, fetchKeys) {
  if (String(env.ADS_SSV || '') !== '1' || !env.DB) return res(404);
  let p; try { p = await verifySsv(request.url, fetchKeys); } catch (e) { p = null; }
  if (!p) return res(403);
  const [feature, uid] = String(p.custom_data || '').split('|'), dev = String(p.user_id || '');
  if (!REWARD[feature] || !/^[A-Za-z0-9_-]{16,64}$/.test(dev) || !/^[\w.-]{6,80}$/.test(p.transaction_id || '')) return res(200); // 200: Google không gửi lại
  const db = env.DB, day = dayKey();
  await setupQuota(db);
  const [tx, cnt] = await db.batch([db.prepare(UP).bind('ssv|' + p.transaction_id, day, 1), db.prepare(UP).bind(`rw|${feature}|d:${dev}`, day, 1)]);
  if ((((tx.results || [])[0]) || {}).n > 1 || (((cnt.results || [])[0]) || {}).n > MAX_PER_DAY) return res(200); // trùng giao dịch / quá trần ngày
  const keys = [`${feature}|d:${dev}`, ...(uid && /^[\w-]{6,128}$/.test(uid) ? [`${feature}|u:${uid}`] : [])];
  await db.batch(keys.map(k => db.prepare(UP).bind(k, day, -REWARD[feature])));
  return res(200, 'ok');
}
