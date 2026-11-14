#!/usr/bin/env node
// Luật 11 (làn nhanh trước làn nặng): workflow nặng trên PR có job `gate` – npm test chưa xanh thì mọi job nặng là skipped (không chiếm runner).
// Khi npm test XANH (job `heavy` của npm-test.yml chạy sau job test) script này chạy lại đúng các lượt nặng của cùng sha mà toàn bộ job (trừ gate) bị skipped.
//   node scripts/ci/heavy-rerun.mjs --sha <sha> --pr <số PR> [--dry]      Env: GITHUB_TOKEN, GITHUB_REPOSITORY
// 14/11 (#1285 Mobile QA đỏ treo): lượt của sha CŨ được chạy lại sau khi PR có commit mới → vào cùng nhóm concurrency cancel-in-progress → HUỶ lượt của head
// mới → required-gate đỏ treo. Luật: chỉ chạy lại khi sha vẫn là head của PR (đọc lại ngay trước MỖI lần POST rerun) – superseded() thuần, test: scripts/test/heavy-rerun.mjs.
// Chỉ ĐỌC API + POST /actions/runs/{id}/rerun. Workflow nặng = file .github/workflows/*.yml có dòng `# ci-policy: heavy-gate`.
import fs from 'node:fs';
import path from 'node:path';
import { isMain } from '../lib/is-main.mjs';
export const MARK = /^# ci-policy: heavy-gate\b/m;
/** Tên file workflow nặng trong thư mục workflows (thuần theo nội dung file). */
export function heavyFiles(dir = '.github/workflows') { return fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f) && MARK.test(fs.readFileSync(path.join(dir, f), 'utf8'))); }
/** Hàm thuần: lượt cần chạy lại = đã xong, thuộc workflow nặng, có job gate thành công và MỌI job khác skipped (cổng đóng, chưa làm việc nặng). */
export function pickReruns(runs, jobsByRun, heavy) {
  const set = new Set(heavy);
  return runs.filter(r => r.event === 'pull_request' && r.status === 'completed' && set.has(path.basename(r.path || '')))
    .filter(r => { const js = jobsByRun[r.id] || []; const g = js.find(j => j.name === 'gate'); const rest = js.filter(j => j.name !== 'gate');
      return g && g.conclusion === 'success' && rest.length > 0 && rest.every(j => j.conclusion === 'skipped'); })
    .map(r => r.id);
}
/** Hàm thuần: sha đã bị commit mới hơn thay (head PR đọc lại khác sha) → KHÔNG được chạy lại lượt nào của nó (sẽ huỷ lượt của head trong nhóm concurrency). Không đọc được head → coi như thay (an toàn: bỏ lỡ 1 rerun còn hơn huỷ lượt thật). */
export const superseded = (sha, headSha) => !headSha || headSha !== sha;
async function main() {
  const a = process.argv.slice(2), sha = a[a.indexOf('--sha') + 1], pr = a.includes('--pr') ? a[a.indexOf('--pr') + 1] : '', dry = a.includes('--dry');
  const repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN;
  if (!sha || !pr || !repo || !tok) { console.error('thiếu --sha / --pr / GITHUB_REPOSITORY / GITHUB_TOKEN'); process.exit(2); }
  const api = async (p, init = {}) => { for (let i = 0; ; i++) { const r = await fetch(`https://api.github.com/repos/${repo}${p}`, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json' } });
    if (r.status >= 500 && i < 2) { await new Promise(s => setTimeout(s, 3000 * 3 ** i)); continue; } return r; } };
  const head = async () => (await (await api(`/pulls/${pr}`)).json().catch(() => ({})))?.head?.sha;
  if (superseded(sha, await head())) { console.log(`${sha.slice(0, 8)} không còn là head của #${pr} → không chạy lại (tránh huỷ lượt của commit mới)`); return; }
  const runs = ((await (await api(`/actions/runs?head_sha=${sha}&event=pull_request&per_page=100`)).json()).workflow_runs) || [];
  const jobsByRun = {};
  const heavy = heavyFiles();
  for (const r of runs.filter(r => r.status === 'completed' && heavy.includes(path.basename(r.path || '')))) jobsByRun[r.id] = ((await (await api(`/actions/runs/${r.id}/jobs?per_page=100`)).json()).jobs) || [];
  const ids = pickReruns(runs, jobsByRun, heavy);
  console.log(`npm test xanh → chạy lại ${ids.length} lượt nặng của ${sha.slice(0, 8)}: ${ids.join(', ') || '(không có)'}`);
  if (!dry) for (const id of ids) {
    if (superseded(sha, await head())) { console.log(`#${pr} vừa có commit mới → dừng chạy lại`); break; }
    const r = await api(`/actions/runs/${id}/rerun`, { method: 'POST' }); if (r.status !== 201) console.log(`::warning::rerun ${id} → HTTP ${r.status}`);
  }
}
if (isMain(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
