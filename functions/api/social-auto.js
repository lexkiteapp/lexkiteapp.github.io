/* POST /api/social-auto – autopilot social chạy nền (docs/DISTRIBUTION.md §6). Chỉ CI: HMAC X-Drive-Ts/X-Drive-Sig = LEXKITE_DRIVE_CLI_KEY (cùng cách ký /api/drive, /api/jobs).
 *   { op: 'run' }    → 1 lượt (.github/workflows/social-auto.yml, mỗi 2 giờ) – logic + ngân sách GrabCast + cầu dao: functions/api/_social_auto.js
 *   { op: 'status' } → trạng thái (không gọi GrabCast)
 * Cầu dao D1 (_d1guard.js): tài khoản đã đọc ≥ 50 % hạn mức → 429 quota-guard, CI bỏ qua lượt này (không thử lại). */
import { cliVerify } from './drive.js';
import { limit } from './sync.js';
import { guardBackground } from './_d1guard.js';
import { runAuto, autoStatus } from './_social_auto.js';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const text = await request.text().catch(() => ''); if (text.length > 2048) return json(413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { return json(400, { error: 'json' }); }
  if (!request.headers.get('X-Drive-Sig') || !(await cliVerify(env, request, text))) return json(403, { error: 'forbidden' });
  if (await limit('socauto:' + (request.headers.get('CF-Connecting-IP') || '?'), 6, 600)) return json(429, { error: 'too-fast' }); // CI 1 lượt/2 giờ; chặn vòng lặp lỗi
  if (!env.DB) return json(412, { error: 'not-configured' });
  if (b.op === 'status') return json(200, await autoStatus(env));
  if (b.op !== 'run') return json(400, { error: 'op' });
  const gb = await guardBackground(env, env.DB, json); if (gb) return gb;
  try { return json(200, { run: await runAuto(env, { src: 'cron', origin: request.url }) }); }
  catch (e) { return json(500, { error: 'run-error', cause: /7500|row read limit|exceeded/i.test(String((e && e.message) || e)) ? 'd1-quota' : String((e && e.code) || 'error').slice(0, 40) }); }
}
