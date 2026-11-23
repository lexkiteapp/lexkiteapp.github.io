/**
 * Câu tiếng Anh rơi về giọng máy, theo khóa băm (docs/specs/kokoro-on-device.md §Số đo).
 *   CI (HMAC X-Drive-Ts/X-Drive-Sig bằng LEXKITE_DRIVE_CLI_KEY – scripts/sentence-audio/misses.mjs, 1 lần/ngày):
 *   POST { op: 'top', days?: 1–30 } → { keys: [[khóa, lần]] (≤ 3000, nhiều nhất trước), routes: { trang: lần } }
 * Nguồn: functions/api/hit.js vmRows ('vm:<khóa>' / 'vr:<trang>' trong ext_events, PK day,kind → SEARCH theo khoảng ngày + tiền tố).
 * Không có văn bản: khóa = KVoice.lineKey (FNV 32-bit giọng|câu); CI ghép khóa với nội dung tĩnh trong repo.
 */
import { cliVerify } from './drive.js';
import { readText, bodyFail } from './_body.js';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export const since = (now, days) => new Date(now - Math.min(Math.max(Math.floor(+days || 14), 1), 30) * 864e5).toISOString().slice(0, 10);

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(500, { error: 'no-db' });
  let text; try { text = await readText(request, 4096); } catch (e) { const f = bodyFail(e); return json(f.status, { error: f.error }); }
  if (!(await cliVerify(env, request, text))) return json(401, { error: 'sig' });
  let b; try { b = JSON.parse(text); } catch (e) { return json(400, { error: 'json' }); }
  if (!b || b.op !== 'top') return json(400, { error: 'op' });
  const day = since(Date.now(), b.days);
  const q = (lo, hi, lim) => env.DB.prepare(`SELECT substr(kind, 4) AS k, SUM(n) AS n FROM ext_events WHERE day >= ?1 AND kind >= '${lo}' AND kind < '${hi}' GROUP BY kind ORDER BY n DESC LIMIT ${lim}`).bind(day).all().then(r => r.results || []);
  const [keys, routes] = await Promise.all([q('vm:', 'vm;', 3000), q('vr:', 'vr;', 50)]);
  return json(200, { since: day, keys: keys.map(r => [r.k, r.n]), routes: Object.fromEntries(routes.map(r => [r.k, r.n])) });
}
