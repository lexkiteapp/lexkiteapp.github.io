// busy-gate (chủ 10/11 "video cứ làm từ từ đăng dần"): job video nặng nhường runner cho code web/hệ thống.
// Đếm lượt queued THẬT (không zombie, dùng chung zombie.mjs + ngưỡng QUEUE_MAX của cron-watch) tạo trong 2 giờ gần nhất; ≥ ngưỡng → busy=1,
// workflow gọi bỏ lượt này và để lượt cron thấp điểm sau chạy. Lỗi API → busy=0 + cảnh báo (không chặn chết video vì một lần đọc hỏng).
//   node scripts/ci/busy-gate.mjs   → ghi busy=0|1, queued=N vào $GITHUB_OUTPUT. Test: scripts/test/busy-gate.mjs.
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isZombie, listRuns } from './zombie.mjs';
import { QUEUE_MAX } from './cron-watch.mjs';

export { QUEUE_MAX };
export const WINDOW_MS = 2 * 3600e3;
/** Thuần: lượt queued thật tạo ≤ 2 giờ. */
export const queuedRecent = (runs, now = Date.now()) => runs.filter(r => r.status === 'queued' && !isZombie(r, now) && now - Date.parse(r.created_at) <= WINDOW_MS).length;
export const isBusy = q => q >= QUEUE_MAX;

async function main() {
  const { ghApi } = await import('./gh-api.mjs'), R = `/repos/${process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io'}`;
  const gh = async p => { const r = await ghApi('GET', R + p); if (r.rateLimited || r.status >= 400) throw new Error(`GET ${p.slice(0, 60)} → ${r.status}`); return typeof r.body === 'string' ? JSON.parse(r.body || '{}') : r.body; };
  let q = 0;
  try { q = queuedRecent(await listRuns(gh, 'queued')); } catch (e) { console.log(`::warning::busy-gate: không đọc được hàng CI (${e.message}) → cho chạy`); }
  const busy = isBusy(q) ? 1 : 0;
  console.log(busy ? `::notice::Hàng CI đông (${q} lượt chờ trong 2 giờ ≥ ${QUEUE_MAX}) → dời job video sang lượt thấp điểm` : `Hàng CI vắng (${q} lượt chờ) → chạy`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `busy=${busy}\nqueued=${q}\n`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
