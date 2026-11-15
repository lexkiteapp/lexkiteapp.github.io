// Lượt "zombie" (3/11): lượt workflow_dispatch nằm "queued" mãi, 0 job; huỷ và force-cancel đều 409 "has not been queued yet" (12 lượt, cũ nhất 26/10).
// Vì sao phải canh: lượt này vẫn tính là "đang chờ" → cron-watch ("đã có lượt queued gần đây – không bù"), cron-kick (in-flight) và ci-filler (đang chạy) không dispatch workflow đó nữa.
// required-gate: 15 phút – bộ canh chết thì không PR nào có status (3/11: 07:53Z→13:18Z, 21:30Z→00:04Z); lượt nối khoẻ chờ concurrency ở trạng thái 'pending', không phải 'queued'.
// 05/11: lượt 26/10 vẫn nằm queued 10 ngày dù đã báo vào issue mỗi giờ – issue chỉ ghi "chỉ còn DELETE" và không ai bấm (bộ canh không mù mà
// dừng ở bước người làm) → số "queued" mà điều phối đo bị thổi phồng (18/70 lượt queued là zombie). Nay: huỷ → force-cancel → quá DELETE_MIN
// mà vẫn 0 job thì DELETE (lượt 0 job không có log/artifact – không mất gì). Job THẬT xếp hàng > STUCK_JOB_MIN (max-parallel giữ, nhãn runner
// không có) → stuckJobs() báo vào cùng issue (chỉ báo, không huỷ – có thể là batch chờ hợp lệ).
export const ZOMBIE_MIN = 120, GATE_ZOMBIE_MIN = 15, MAX_CHECK = 30, DELETE_MIN = 24 * 60, STUCK_JOB_MIN = 120;
const minOf = r => (/required-gate\.yml$/.test(r.path || '') ? GATE_ZOMBIE_MIN : ZOMBIE_MIN);
/** Quá hạn queued (thuần). Chỉ tuổi: đủ để không để nó chặn lượt bù; job thật xếp hàng lâu thì dispatch thừa 1 lượt, concurrency của workflow gộp lại. */
export const isZombie = (r, now = Date.now()) => r.status === 'queued' && now - Date.parse(r.created_at) > minOf(r) * 6e4;
/** Mọi lượt theo trạng thái, nhiều trang (≤ MAX_PAGES), CŨ NHẤT TRƯỚC. 05/11: chỉ đọc trang 1 (100 lượt MỚI nhất) → khi hàng chờ > 100 lượt, zombie cũ nhất (26/10) nằm ở trang 2 và không bao giờ bị thấy/xoá. */
export const MAX_PAGES = 5;
export async function listRuns(gh, status) {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const rs = ((await gh(`/actions/runs?status=${status}&per_page=100${page > 1 ? `&page=${page}` : ''}`)) || {}).workflow_runs || [];
    all.push(...rs);
    if (rs.length < 100) break;
  }
  return all.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at));
}

/** → lượt queued quá hạn và không có job nào; thử huỷ khi cancel = true, ghi kết quả vào .cancel ('ok' | lý do). */
/** Lượt còn chưa xong sau khi huỷ? (thuần) – POST /cancel trả 202 kể cả với zombie: 06/11 báo "đã huỷ" mỗi giờ cho 17 lượt vẫn queued 2–16 ngày. */
export const stillOpen = r => !!r && r.status !== 'completed';
export async function zombieRuns(gh, { now = Date.now(), cancel = true, settleMs = 4000, sleep = ms => new Promise(r => setTimeout(r, ms)) } = {}) {
  const queued = await listRuns(gh, 'queued'), out = [];
  // 06/11: 17 lượt > 24 giờ KHÔNG gỡ được qua API (cancel/force-cancel 409, DELETE 403) – chiếm hết MAX_CHECK + mỗi giờ tốn ~2 phút ngủ vô ích và che lượt zombie mới.
  // Lượt ≥ DELETE_MIN: DELETE thẳng (1 lệnh, không huỷ/ngủ, không tính vào MAX_CHECK); không gỡ được → ghi rõ "cần GitHub Support", không thử lại bằng huỷ.
  const all = queued.filter(x => isZombie(x, now)), oldRuns = all.filter(x => now - Date.parse(x.created_at) >= DELETE_MIN * 6e4), youngRuns = all.filter(x => !oldRuns.includes(x)).slice(0, MAX_CHECK);
  const why = e => String(e.message || e).replace(/^.*→ /, '');
  for (const r of [...oldRuns, ...youngRuns]) {
    const jobs = (await gh(`/actions/runs/${r.id}/jobs?per_page=1`)) || {};
    if (jobs.total_count !== 0) continue;
    const z = { id: r.id, file: String(r.path || '').split('/').pop() || r.name, min: Math.round((now - Date.parse(r.created_at)) / 6e4) };
    if (cancel && z.min >= DELETE_MIN) {
      try { await gh(`/actions/runs/${r.id}`, { method: 'DELETE' }); /* gh của required-gate nuốt lỗi → đọc lại: còn thì DELETE chưa có hiệu lực (05/11) */ { const back = await gh(`/actions/runs/${r.id}`).catch(() => null); if (back && back.id) throw new Error('DELETE không hiệu lực'); } z.deleted = true; z.cancel = 'xoá'; } catch (e) { z.deleted = why(e); z.cancel = 'không gỡ được qua API (cancel 409 / DELETE ' + why(e) + ') – cần GitHub Support'; }
    } else if (cancel) {
      const open = async () => { await sleep(settleMs); return stillOpen(await gh(`/actions/runs/${r.id}`).catch(() => null)); };   // 202 ≠ đã huỷ: đọc lại
      try { await gh(`/actions/runs/${r.id}/cancel`, { method: 'POST' }); z.cancel = 'ok'; } catch (e) { z.cancel = why(e); }
      if (z.cancel === 'ok' && await open()) z.cancel = 'cancel 202 nhưng vẫn queued';
      if (z.cancel !== 'ok') try { await gh(`/actions/runs/${r.id}/force-cancel`, { method: 'POST' }); z.cancel = 'ok'; if (await open()) z.cancel = 'force-cancel 202 nhưng vẫn queued'; } catch (e) { /* giữ lý do của cancel */ }
    }
    out.push(z);
  }
  return out;
}

/** Job thật nằm queued quá lâu (thuần): [{ id, file, jobs, min }] – lượt có ≥ 1 job queued > STUCK_JOB_MIN phút. jobsOf(run) → mảng job. */
export async function stuckJobs(gh, { now = Date.now(), min = STUCK_JOB_MIN } = {}) {
  const out = [];
  for (const st of ['queued', 'in_progress']) {
    const runs = await listRuns(gh, st);
    for (const r of runs.filter(x => now - Date.parse(x.created_at) > min * 6e4).slice(0, MAX_CHECK)) {
      const jobs = (((await gh(`/actions/runs/${r.id}/jobs?per_page=100`)) || {}).jobs || []).filter(j => j.status === 'queued' && now - Date.parse(j.created_at) > min * 6e4);
      if (jobs.length) out.push({ id: r.id, file: String(r.path || '').split('/').pop() || r.name, jobs: jobs.length, min: Math.round(Math.max(...jobs.map(j => now - Date.parse(j.created_at))) / 6e4) });
    }
  }
  return out;
}
