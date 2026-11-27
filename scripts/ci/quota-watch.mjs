#!/usr/bin/env node
// Giám sát hạn mức GitHub API của GITHUB_TOKEN dùng chung (~1.000 lệnh/giờ/repo; 26/11: 403 "API rate limit exceeded for installation" làm đỏ chuỗi bot/PR).
//   node scripts/ci/quota-watch.mjs   (workflow gh-quota-watch.yml, mỗi giờ)
//   1) GET /rate_limit (KHÔNG tính hạn mức) → còn bao nhiêu; < 20 % → ::warning:: + mở/cập nhật issue `gh-quota`, ≥ 20 % → đóng.
//   2) Tiêu thụ theo workflow: đọc các dòng `gh-quota <workflow>: N lượt …` (scripts/lib/retry5xx.mjs in lúc thoát tiến trình) trong log các lượt vừa chạy (≤ MAX_RUNS, mỗi lượt ~2 lệnh) → bảng top tiêu thụ vào step summary.
import fs from 'node:fs';
import { ghFetch } from '../lib/retry5xx.mjs';
import { isMain } from '../lib/is-main.mjs';
export const WARN_PCT = 0.2, MAX_RUNS = 12, LABEL = 'gh-quota';
/** Hàm thuần: các dòng "gh-quota <nhãn>: N lượt (trừ X hạn mức) · còn R/L = P %" trong log → [{ label, calls, used, remaining, limit }]. */
export function parseQuotaLines(text = '') {
  const out = [];
  for (const m of String(text).matchAll(/gh-quota ([^:\n]+): (\d+) lượt(?: \(trừ (\d+) hạn mức\))?(?: · còn (\d+)\/(\d+))?/g)) out.push({ label: m[1].trim(), calls: +m[2], used: m[3] != null ? +m[3] : null, remaining: m[4] != null ? +m[4] : null, limit: m[5] != null ? +m[5] : null });
  return out;
}
/** Hàm thuần: gộp theo nhãn → [{ label, runs, calls }] giảm dần theo calls. */
export function topConsumers(rows = []) {
  const m = new Map(); for (const r of rows) { const e = m.get(r.label) || { label: r.label, runs: 0, calls: 0 }; e.runs++; e.calls += r.calls; m.set(r.label, e); }
  return [...m.values()].sort((a, b) => b.calls - a.calls);
}
export const lowQuota = (core, pct = WARN_PCT) => !!core && core.limit > 0 && core.remaining / core.limit < pct;
export const renderSummary = (core, top) => [`### Hạn mức GitHub API (GITHUB_TOKEN)`, core ? `Còn **${core.remaining}/${core.limit}** (${(100 * core.remaining / core.limit).toFixed(0)} %), reset ${new Date(core.reset * 1000).toISOString().slice(11, 16)}Z` : 'không đọc được /rate_limit',
  '', '| Workflow | Lượt tiến trình | Lệnh gọi |', '|---|---|---|', ...top.slice(0, 15).map(t => `| ${t.label} | ${t.runs} | ${t.calls} |`)].join('\n');

async function main() {
  const repo = process.env.GITHUB_REPOSITORY, H = { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: 'application/vnd.github+json' };
  const api = async (p, raw) => { const r = await ghFetch(p.startsWith('http') ? p : `https://api.github.com/repos/${repo}${p}`, { headers: H, redirect: 'follow' }); if (!r.ok) throw new Error(`${p} → ${r.status}`); return raw ? r.text() : r.json(); };
  const rl = await (await ghFetch('https://api.github.com/rate_limit', { headers: H })).json(), core = rl.resources?.core || rl.rate;
  console.log(`quota-watch: core còn ${core?.remaining}/${core?.limit}`);
  const rows = [];
  try {
    const since = new Date(Date.now() - 65 * 60e3).toISOString().replace(/\.\d+Z$/, 'Z');
    const runs = ((await api(`/actions/runs?status=completed&created=%3E${since}&per_page=60`)).workflow_runs || []).filter(r => r.event !== 'pull_request').slice(0, MAX_RUNS);
    for (const r of runs) try { for (const j of (await api(`/actions/runs/${r.id}/jobs?per_page=10`)).jobs || []) rows.push(...parseQuotaLines(await api(`/actions/jobs/${j.id}/logs`, true))); } catch (e) { console.log(`::warning::quota-watch: bỏ lượt ${r.id}: ${e.message}`); }
  } catch (e) { console.log('::warning::quota-watch: không đọc được log lượt chạy: ' + e.message); }
  const top = topConsumers(rows), md = renderSummary(core, top); console.log(md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  const low = lowQuota(core), ex = ((await api(`/issues?labels=${LABEL}&state=open&per_page=1`).catch(() => [])) || [])[0];
  if (low) {
    console.log(`::warning title=hạn mức GitHub API::còn ${core.remaining}/${core.limit} – giảm polling/gộp lời gọi (docs/CI-RUNNERS.md)`);
    const body = md + `\n\nLượt đo: ${process.env.GITHUB_SERVER_URL}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`, title = `Hạn mức GitHub API còn ${Math.round(100 * core.remaining / core.limit)} %`;
    await ghFetch(`https://api.github.com/repos/${repo}/labels`, { method: 'POST', headers: H, body: JSON.stringify({ name: LABEL, color: 'FBCA04' }) }).catch(() => {});
    if (ex) await ghFetch(`https://api.github.com/repos/${repo}/issues/${ex.number}`, { method: 'PATCH', headers: H, body: JSON.stringify({ title, body }) });
    else await ghFetch(`https://api.github.com/repos/${repo}/issues`, { method: 'POST', headers: H, body: JSON.stringify({ title, body, labels: [LABEL] }) });
  } else if (ex) await ghFetch(`https://api.github.com/repos/${repo}/issues/${ex.number}`, { method: 'PATCH', headers: H, body: JSON.stringify({ state: 'closed' }) });
}
if (isMain(import.meta.url)) main().catch(e => { console.log('::warning::quota-watch: ' + e.message); });   // giám sát: lỗi không làm đỏ workflow
