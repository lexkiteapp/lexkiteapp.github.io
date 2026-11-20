// queue-report (05/11, PR #719 – dọn CI trước khi tính nâng gói GitHub): đo hàng chờ Actions mỗi ngày ở MỨC JOB và so với mốc 05/11.
// Đo: lượt/giờ, phút-runner/giờ, % phút bị huỷ (commit mới thay), lượt trùng cùng workflow + sha, chờ runner p50/p90 (mẫu job), job PR
// khởi động/giờ + % job < 90 s, ảnh chụp lúc chạy (job chạy/chờ, lượt zombie 0 job). Ghi 1 comment vào issue "CI hàng chờ – đo hằng ngày"
// (nhãn ci-queue, tự mở) + Summary. Chỉ ĐỌC API Actions. Chạy: ci-queue-report.yml (07:20Z) · node scripts/ci/queue-report.mjs [--dry]
// Test: scripts/test/queue-report.mjs. Bối cảnh + mốc: docs/CI-RUNNERS.md § Lượt thừa.
import { pathToFileURL } from 'node:url';
import { fetchRuns } from './ci-hog.mjs';

/** Mốc 05/11 05:50Z (1.000 lượt = 4,7 giờ, trước #719). */
export const BASELINE = { at: '2026-11-05T05:50Z', runsH: 213, minH: 2595, cancelPct: 13, dup: 0, waitP50: 2.7, waitP90: 15.3, prJobsH: 381, smallPct: 30, busy: 37, queued: 102, zombies: 18 };
export const SAMPLE = 150, SMALL_S = 90, LABEL = 'ci-queue', TITLE = 'CI hàng chờ – đo hằng ngày', MARK = '<!-- ci-queue-report -->';
const pct = (a, p) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const min = (a, b) => Math.max(0, (Date.parse(b) - Date.parse(a)) / 60e3);
const PR = new Set(['pull_request', 'pull_request_target']);

/** Lượt mẫu đều nhau (thuần): ≤ n lượt completed, không skipped. */
export function sampleRuns(runs, n = SAMPLE) {
  const c = runs.filter(r => r.status === 'completed' && r.conclusion !== 'skipped'), step = Math.max(1, Math.ceil(c.length / n));
  return c.filter((_, i) => i % step === 0).slice(0, n);
}
/** Hàm thuần: runs 24 h + jobs của lượt mẫu ({ runId: [job] }) + ảnh chụp { busy, queued, zombies } → { m, md }. */
export function report(runs, jobsByRun = {}, live = {}, { hours = 24 } = {}) {
  const done = runs.filter(r => r.status === 'completed' && r.conclusion !== 'skipped' && r.run_started_at);
  const runMin = done.reduce((s, r) => s + min(r.run_started_at, r.updated_at), 0);
  const cancMin = done.filter(r => r.conclusion === 'cancelled').reduce((s, r) => s + min(r.run_started_at, r.updated_at), 0);
  const g = new Map();
  for (const r of done) { if (r.conclusion === 'cancelled' || !(PR.has(r.event) || r.event === 'push')) continue; const k = `${r.path}|${r.head_sha}|${r.event}`; g.set(k, (g.get(k) || 0) + 1); }
  const dupBy = {}; let dup = 0;
  for (const [k, n] of g) if (n > 1) { dup += n - 1; const w = k.split('|')[0].split('/').pop(); dupBy[w] = (dupBy[w] || 0) + n - 1; }
  const waits = [], prJobs = [], sampled = Object.keys(jobsByRun);
  const byId = new Map(runs.map(r => [String(r.id), r]));
  for (const id of sampled) for (const j of jobsByRun[id] || []) {
    if (!j.started_at || j.conclusion === 'skipped') continue;
    waits.push(min(j.created_at, j.started_at));
    if (PR.has((byId.get(id) || {}).event) && j.completed_at) prJobs.push(min(j.started_at, j.completed_at) * 60);
  }
  const prSampled = sampled.filter(id => PR.has((byId.get(id) || {}).event)).length, prRuns = done.filter(r => PR.has(r.event)).length;
  const m = {
    runsH: Math.round(runs.length / hours), minH: Math.round(runMin / hours), cancelPct: runMin ? Math.round(100 * cancMin / runMin) : 0, dup,
    waitP50: +pct(waits, 0.5).toFixed(1), waitP90: +pct(waits, 0.9).toFixed(1),
    prJobsH: prSampled ? Math.round(prJobs.length / prSampled * prRuns / hours) : 0, smallPct: prJobs.length ? Math.round(100 * prJobs.filter(s => s < SMALL_S).length / prJobs.length) : 0,
    busy: live.busy ?? null, queued: live.queued ?? null, zombies: live.zombies ?? null,
  };
  const B = BASELINE, rows = [
    ['Lượt / giờ', 'runsH'], ['Phút lượt chạy / giờ (wall, gồm job chờ trong lượt)', 'minH'], ['% phút bị huỷ (commit mới thay)', 'cancelPct'], ['Lượt trùng cùng workflow + sha (24 h)', 'dup'],
    ['Chờ runner p50 (phút, mẫu job)', 'waitP50'], ['Chờ runner p90 (phút)', 'waitP90'], ['Job PR khởi động / giờ', 'prJobsH'], [`% job PR < ${SMALL_S} s`, 'smallPct'],
    ['Lúc đo: job chạy /40', 'busy'], ['Lúc đo: job chờ', 'queued'], ['Lúc đo: lượt zombie 0 job', 'zombies'],
  ];
  const top = Object.entries(dupBy).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([w, n]) => `${w} ×${n}`).join(', ');
  const md = `${MARK}\n### Hàng chờ CI ${new Date().toISOString().slice(0, 16)}Z (24 h: ${runs.length} lượt, mẫu ${sampled.length} lượt / ${waits.length} job)\n\n| Chỉ số | Mốc ${B.at} | Nay |\n|---|---|---|\n`
    + rows.map(([t, k]) => `| ${t} | ${B[k]} | ${m[k] ?? '–'} |`).join('\n')
    + `\n\n${top ? `Trùng nhiều nhất: ${top}.` : 'Không có lượt trùng.'} Nâng gói chỉ khi chờ p90 > 15 phút kéo dài sau khi đã hết lãng phí (docs/CI-RUNNERS.md).`;
  return { m, md };
}
/** Ảnh chụp lúc chạy (đọc): job in_progress/queued trong lượt queued + in_progress, lượt queued 0 job > 2 giờ. */
export async function snapshot(gh, now = Date.now()) {
  let busy = 0, queued = 0, zombies = 0;
  for (const st of ['in_progress', 'queued']) {
    const runs = ((await gh(`/actions/runs?status=${st}&per_page=100`)) || {}).workflow_runs || [];
    for (const r of runs) {
      const js = ((await gh(`/actions/runs/${r.id}/jobs?per_page=100`)) || {}).jobs || [];
      if (!js.length && st === 'queued' && now - Date.parse(r.created_at) > 2 * 3600e3) zombies++;
      busy += js.filter(j => j.status === 'in_progress').length; queued += js.filter(j => j.status === 'queued').length;
    }
  }
  return { busy, queued, zombies };
}
async function main() {
  const { ghApi } = await import('./gh-api.mjs'), dry = process.argv.includes('--dry'), R = `/repos/${process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io'}`;
  const gh = async (p, o = {}) => { const r = await ghApi(o.method || 'GET', R + p, o.body ? { data: JSON.stringify(o.body) } : {}); if (r.rateLimited) throw new Error('rate-limited'); if (r.status >= 400) throw new Error(`${o.method || 'GET'} ${p.slice(0, 60)} → ${r.status}`); return typeof r.body === 'string' ? JSON.parse(r.body || '{}') : r.body; };
  const now = Date.now(), runs = await fetchRuns(gh, now, 24, 2), jobs = {};
  for (const r of sampleRuns(runs)) jobs[r.id] = ((await gh(`/actions/runs/${r.id}/jobs?per_page=100`)) || {}).jobs || [];
  const { md } = report(runs, jobs, await snapshot(gh, now));
  console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) (await import('node:fs')).appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  if (dry) return;
  if (!runs.length) throw new Error('0 lượt trong 24 giờ – API hỏng, không ghi số 0');
  let issue = ((await gh(`/issues?state=open&labels=${LABEL}&per_page=20`)) || []).find(i => (i.body || '').includes(MARK));
  if (!issue) issue = await gh('/issues', { method: 'POST', body: { title: TITLE, labels: [LABEL], body: `${MARK}\nĐo hàng chờ CI mỗi ngày (ci-queue-report.yml) – so với mốc 05/11 trước PR #719. Mỗi ngày 1 comment.` } });
  await gh(`/issues/${issue.number}/comments`, { method: 'POST', body: { body: md } });
  console.log(`→ issue #${issue.number}`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch(e => { console.log('::error::queue-report: ' + e.message); process.exit(1); });
