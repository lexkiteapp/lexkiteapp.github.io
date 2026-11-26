// Máy gác 4/4 (23/11, docs/CI-RUNNERS.md › Máy gác main đỏ): chống dispatch TRÙNG + hai tín hiệu hàng chờ.
// Đo 23/11: required-gate ×5, ci-filler ×3, d1-usage-watch ×3, youtube-manual ×3, lexicon-expand ×3, cdn-mirror ×2, ci-triage ×2 cùng lúc (cron-kick + cron-watch + bộ canh + filler đều dispatch).
//   dupActive/dispatchOnce: cùng workflow + cùng ref đang chờ/chạy (không zombie) → không dispatch. Dùng ở filler, cron-watch, required-gate (nhịp PACED).
//   fillerAllowed: ci-filler chỉ dispatch khi đang chạy < FILLER_MAX_BUSY job. yieldsToPr: nhường khi PR nhãn main-red-fix/ui có lượt chờ/chạy.
//   queueAlert: < 30 job chạy mà hàng chờ > 10 = khoá concurrency/trùng chứ không thiếu runner (08:40: 37 xếp, 17 chạy).
// Test thuần: scripts/test/main-guards.mjs.
import { isZombie } from './zombie.mjs';

export const FILLER_MAX_BUSY = 24, ALERT_RUNNING = 30, ALERT_QUEUED = 10, YIELD_LABELS = ['main-red-fix', 'ui'];
const LIVE = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);

/** Hàm thuần: runs (mọi workflow hoặc 1 workflow) có lượt chưa xong, không zombie, cùng ref (head_branch) → lượt đó | null. */
export const dupActive = (runs, ref, now = Date.now()) => (runs || []).find(r => LIVE.has(r.status) && r.head_branch === ref && !isZombie(r, now)) || null;
/** Hàm thuần: ci-filler được dispatch không? running = job đang chạy. */
export const fillerAllowed = running => running < FILLER_MAX_BUSY;
/** Hàm thuần: có lượt chờ/chạy của PR mang nhãn nhường (prNumbersByLabel = Set số PR có nhãn main-red-fix/ui) → true. runs có pull_requests[].number. */
export const yieldsToPr = (runs, prNumbers) => (runs || []).some(r => LIVE.has(r.status) && (r.pull_requests || []).some(p => prNumbers.has(p.number)));
/** Hàm thuần: cảnh báo khoá/trùng khi ít job chạy mà hàng chờ dài; null nếu bình thường. */
export const queueAlert = ({ running, queued }) => running < ALERT_RUNNING && queued > ALERT_QUEUED ? `${queued} job xếp hàng nhưng chỉ ${running} chạy (< ${ALERT_RUNNING}/40): khoá concurrency hoặc dispatch trùng, KHÔNG phải thiếu runner – xem ci-triage` : null;

/** Dispatch nếu chưa có lượt trùng. api = { runs(file) → runs[] (queued+in_progress), dispatch(file, ref, inputs) }. → { sent, why, res }. */
export async function dispatchOnce(api, file, ref, inputs, now = Date.now()) {
  const dup = dupActive(await api.runs(file), ref, now);
  if (dup) return { sent: false, why: `đã có lượt ${dup.status} (#${dup.id}) trên ${ref}` };
  const res = await api.dispatch(file, ref, inputs); return { sent: true, res };
}
