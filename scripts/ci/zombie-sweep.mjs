#!/usr/bin/env node
// Dọn lượt "queued" 0 job (zombie): GitHub mất lượt khởi tạo → lượt kẹt vĩnh viễn ở "queued", giữ chỗ trong nhóm concurrency
// (cancel-in-progress:false) nên lượt MỚI cùng nhóm không bao giờ chạy (21/11: 23 lượt cũ từ 26/10, đều workflow_dispatch).
// Chỉ huỷ lượt queued > 30 phút VÀ 0 job (lượt đang xếp hàng bình thường luôn có job). Token-free, không workflow_run.
//   node scripts/ci/zombie-sweep.mjs [--dry]. Test: scripts/test/zombie-sweep.mjs · lịch: zombie-sweep.yml (infra/jobs.json).
import { pathToFileURL } from 'node:url';
export const MIN_AGE_MIN = 30;
/** Tuổi theo attempt hiện tại (run_started_at), không theo created_at của lượt gốc – chạy lại không bị huỷ oan (26/11). */
const t0 = r => Date.parse(r.run_started_at || r.created_at);
/** Lượt zombie (thuần): queued, tuổi > minAge, 0 job. jobsOf(id) → mảng job. */
export async function findZombies(runs, jobsOf, now = Date.now(), minAge = MIN_AGE_MIN) {
  const out = [];
  for (const r of runs) {
    if (r.status !== 'queued' || now - t0(r) <= minAge * 60e3) continue;
    if (!((await jobsOf(r.id)) || []).length) out.push(r);
  }
  return out;
}
export const line = r => `${r.id} ${r.created_at} ${r.event} ${r.name || r.path}`;
async function main() {
  const { ghApi } = await import('./gh-api.mjs'), dry = process.argv.includes('--dry'), R = `/repos/${process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io'}`;
  const gh = async (m, p) => { const r = await ghApi(m, R + p); if (r.rateLimited) throw new Error('rate-limited'); if (r.status >= 400) throw new Error(`${m} ${p.slice(0, 60)} → ${r.status}`); return typeof r.body === 'string' ? JSON.parse(r.body || '{}') : r.body; };
  const runs = []; for (let pg = 1; pg <= 5; pg++) { const w = ((await gh('GET', `/actions/runs?status=queued&per_page=100&page=${pg}`)) || {}).workflow_runs || []; runs.push(...w); if (w.length < 100) break; }
  const z = await findZombies(runs, async id => ((await gh('GET', `/actions/runs/${id}/jobs?per_page=1`)) || {}).jobs);
  const md = `zombie-sweep: ${runs.length} lượt queued, ${z.length} zombie (0 job > ${MIN_AGE_MIN} phút)${dry ? ' [dry]' : ''}\n` + z.map(r => '- ' + line(r)).join('\n');
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  if (dry) return;
  for (const r of z) {
    try { await gh('POST', `/actions/runs/${r.id}/cancel`); } catch (e) { console.log(`::warning::cancel ${r.id}: ${e.message}`); }
    try { await gh('POST', `/actions/runs/${r.id}/force-cancel`); } catch { /* cancel thường đã đủ; force-cancel chỉ khi cancel bị từ chối */ }
  }
  if (z.length) console.log(`::notice::zombie-sweep: đã huỷ ${z.length} lượt queued 0 job`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.log('::error::zombie-sweep: ' + e.message); process.exit(1); });
