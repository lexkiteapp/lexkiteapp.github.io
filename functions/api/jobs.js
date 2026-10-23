// POST /api/jobs { op: acquire | release } — CI (HMAC X-Drive-Ts/X-Drive-Sig = LEXKITE_DRIVE_CLI_KEY, cùng cách ký /api/drive). Quản trị xem lịch: /api/quota op 'jobs'.
// Chỉ vài truy vấn theo khoá; không qua cầu dao (phải ghi được lý do bỏ qua), tự giới hạn tốc độ. Logic: _jobs.js · sổ: infra/jobs.json · tài liệu: docs/JOBS.md
import { cliVerify } from './drive.js';
import { limit } from './sync.js';
import { internalDb, d1bMode, d1bReady } from './_d1b.js';
import { setupJobs, acquire, release } from './_jobs.js';

const json = (status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const text = await request.text().catch(() => ''); if (text.length > 4096) return json(413, { error: 'too-large' });
  let b; try { b = JSON.parse(text || '{}'); } catch (e) { return json(400, { error: 'json' }); }
  if (!request.headers.get('X-Drive-Sig') || !(await cliVerify(env, request, text))) return json(403, { error: 'forbidden' });
  if (await limit('jobs:' + (request.headers.get('CF-Connecting-IP') || '?'), 60, 60)) return json(429, { error: 'too-fast' });
  if (!env.DB) return json(412, { error: 'not-configured' });
  try {
    const db = internalDb(env); await setupJobs(db, d1bReady(env) ? d1bMode(env) + env.D1B_ACCOUNT_ID : 'main');
    const out = b.op === 'acquire' ? await acquire(env, db, b) : b.op === 'release' ? await release(env, db, b) : { status: 400, error: 'op' };
    const st = out.status || 200; delete out.status; return json(st, out);
  } catch (e) { // D1 hết hạn mức (7500) / REST lỗi: KHÔNG trả 500 mơ hồ – 503 rõ ràng để máy khách xử lý fail-closed cho việc nặng
    const m = String((e && e.message) || e); return json(503, { error: 'coordinator-unavailable', cause: /7500|row read limit|exceeded/i.test(m) ? 'd1-quota' : 'db' });
  }
}
