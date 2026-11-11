/* ⏰ lexkite-cronkick – nguồn kích cron ngoài GitHub (lưới an toàn cuối khi chuỗi canh required-gate đứt VÀ cron GitHub bị bỏ: 02/11 13 giờ, 03/11 00–03Z).
 * Mỗi 30 phút ký HMAC(ts + "." + body) bằng CRON_KICK_SECRET rồi POST lexkite.com/api/cron-kick; Pages (có GH_DISPATCH_TOKEN) tự chống trùng + trần + danh sách cho phép.
 * Worker KHÔNG có token GitHub. Giới hạn giờ phía Worker: ≤ HOURLY_MAX lượt gọi/giờ/isolate (cron 30 phút nên thường 2). Logic thuần: functions/api/_cronkick.js. */
import { sign, ORDER, HOURLY_MAX } from '../../functions/api/_cronkick.js';

let bucket = -1, count = 0;
export async function run(env, now = Date.now(), fetchFn = fetch) {
  if (!env.CRON_KICK_SECRET) { console.log('cronkick', 'no-secret'); return { skip: 'no-secret' }; }
  const h = Math.floor(now / 36e5); if (h !== bucket) { bucket = h; count = 0; }
  if (count >= HOURLY_MAX) { console.log('cronkick', 'rate'); return { skip: 'rate' }; }
  count++;
  const body = JSON.stringify({ op: 'kick', wfs: ORDER }), ts = String(now);
  const r = await fetchFn((env.API || 'https://lexkite.com') + '/api/cron-kick', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Kick-Ts': ts, 'X-Kick-Sig': await sign(env.CRON_KICK_SECRET, ts, body) }, body });
  const out = r.ok ? await r.json().catch(() => ({})) : { error: r.status };
  console.log('cronkick', JSON.stringify(out));
  return out;
}
export default { async scheduled(ev, env, ctx) { ctx.waitUntil(run(env).catch(e => console.log('cronkick', 'error', String((e && e.message) || e)))); } };
