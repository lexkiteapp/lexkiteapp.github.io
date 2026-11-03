// Lượt "zombie" (3/11): lượt workflow_dispatch nằm "queued" mãi, 0 job; huỷ và force-cancel đều 409 "has not been queued yet" (12 lượt, cũ nhất 26/10).
// Vì sao phải canh: lượt này vẫn tính là "đang chờ" → cron-watch ("đã có lượt queued gần đây – không bù"), cron-kick (in-flight) và ci-filler (đang chạy) không dispatch workflow đó nữa.
export const ZOMBIE_MIN = 120, MAX_CHECK = 30;
/** Quá hạn queued (thuần). Chỉ tuổi: đủ để không để nó chặn lượt bù; job thật xếp hàng tới 2 giờ thì dispatch thừa 1 lượt, concurrency của workflow gộp lại. */
export const isZombie = (r, now = Date.now()) => r.status === 'queued' && now - Date.parse(r.created_at) > ZOMBIE_MIN * 6e4;
/** → lượt queued quá hạn và không có job nào; thử huỷ khi cancel = true, ghi kết quả vào .cancel ('ok' | lý do). */
export async function zombieRuns(gh, { now = Date.now(), cancel = true } = {}) {
  const queued = ((await gh('/actions/runs?status=queued&per_page=100')) || {}).workflow_runs || [], out = [];
  for (const r of queued.filter(x => isZombie(x, now)).slice(0, MAX_CHECK)) {
    const jobs = (await gh(`/actions/runs/${r.id}/jobs?per_page=1`)) || {};
    if (jobs.total_count !== 0) continue;
    const z = { id: r.id, file: String(r.path || '').split('/').pop() || r.name, min: Math.round((now - Date.parse(r.created_at)) / 6e4) };
    if (cancel) { try { await gh(`/actions/runs/${r.id}/cancel`, { method: 'POST' }); z.cancel = 'ok'; } catch (e) { z.cancel = String(e.message || e).replace(/^.*→ /, ''); } }
    out.push(z);
  }
  return out;
}
