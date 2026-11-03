// ci-hog (3/11, sau sự cố required-gate ~20 runner/commit): giám sát chống mù – ci-triage sweep mỗi 3 giờ đo 24 h lượt chạy Actions.
// Báo khi 1 workflow chiếm > 20 % số lượt hoặc > 15 % phút-runner (chỉ xét workflow ≥ 50 lượt), hoặc trung vị số lượt / sha PR > 3
// (dây chuyền workflow_run/check_suite). Phút-runner ≈ run_started_at → updated_at của lượt xong, không tính skipped (cận dưới với matrix).
// Kết quả: 1 issue ci-failure "CI tốn runner bất thường" (marker ci-triage:hog) – cập nhật khi còn, tự đóng khi hết; + cảnh báo Quản trị kind ci_hog.
// Ngưỡng: docs/CI-RUNNERS.md § Giám sát. Test: scripts/test/ci-hog.mjs.
export const RUN_SHARE = 0.20, MIN_SHARE = 0.15, PER_SHA = 3, MIN_RUNS = 50;
export const MARK = '<!-- ci-triage:hog -->', TITLE = 'CI tốn runner bất thường';
const median = a => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Hàm thuần: runs (REST workflow_runs, 24 h) → { bad: [{ name, why }], rows, total, minutes, md }. */
export function hogReport(runs) {
  const by = new Map(); let total = 0, minutes = 0;
  for (const r of runs) {
    const k = r.name || r.path; if (!by.has(k)) by.set(k, { name: k, runs: 0, min: 0, sha: new Map() });
    const w = by.get(k); w.runs++; total++;
    if (r.status === 'completed' && r.conclusion !== 'skipped' && r.run_started_at && r.updated_at) { const m = Math.max(0, (Date.parse(r.updated_at) - Date.parse(r.run_started_at)) / 60e3); w.min += m; minutes += m; }
    if ((r.event === 'pull_request' || r.event === 'pull_request_target' || (r.pull_requests || []).length || r.pr) && r.head_sha) w.sha.set(r.head_sha, (w.sha.get(r.head_sha) || 0) + 1);
  }
  const rows = [...by.values()].map(w => ({ name: w.name, runs: w.runs, min: Math.round(w.min), runShare: total ? w.runs / total : 0, minShare: minutes ? w.min / minutes : 0, perSha: median([...w.sha.values()]) })).sort((a, b) => b.runs - a.runs);
  const bad = [];
  for (const r of rows) {
    const why = [];
    if (r.runs >= MIN_RUNS && r.runShare > RUN_SHARE) why.push(`${Math.round(r.runShare * 100)} % số lượt (> ${RUN_SHARE * 100} %)`);
    if (r.runs >= MIN_RUNS && r.minShare > MIN_SHARE) why.push(`${Math.round(r.minShare * 100)} % phút-runner (> ${MIN_SHARE * 100} %)`);
    if (r.perSha > PER_SHA) why.push(`trung vị ${r.perSha} lượt / sha PR (> ${PER_SHA})`);
    if (why.length) bad.push({ name: r.name, why: why.join('; ') });
  }
  const pct = x => Math.round(x * 100) + ' %';
  const md = `## 🏭 Runner 24 h theo workflow\n${total} lượt, ≈ ${Math.round(minutes)} phút-runner. ${bad.length ? `⚠️ ${bad.length} workflow vượt ngưỡng.` : '✓ Không workflow nào vượt ngưỡng.'}\n\n| Workflow | Lượt | % lượt | Phút | % phút | Lượt/sha PR |\n|---|---|---|---|---|---|\n` +
    rows.slice(0, 10).map(r => `| ${r.name} | ${r.runs} | ${pct(r.runShare)} | ${r.min} | ${pct(r.minShare)} | ${r.perSha} |`).join('\n') +
    (bad.length ? `\n\n${bad.map(b => `- **${b.name}**: ${b.why}`).join('\n')}` : '');
  return { bad, rows, total, minutes: Math.round(minutes), md };
}

/** Đọc 24 h lượt chạy: API trả tối đa 1.000 kết quả / truy vấn → chia cửa sổ 2 giờ. */
export async function fetchRuns(gh, now = Date.now(), hours = 24, step = 2) {
  const out = [], iso = t => new Date(t).toISOString().slice(0, 19) + 'Z';
  for (let a = now - hours * 3600e3; a < now; a += step * 3600e3) {
    const range = `${iso(a)}..${iso(Math.min(now, a + step * 3600e3) - 1000)}`;
    for (let p = 1; p <= 10; p++) {
      const j = (await gh(`/actions/runs?per_page=100&page=${p}&created=${encodeURIComponent(range)}`)) || {}, rs = j.workflow_runs || [];
      out.push(...rs); if (rs.length < 100) break;
    }
  }
  return out;
}

/** Issue: còn vượt → mở/cập nhật; hết → đóng. */
export async function syncIssue(gh, { bad, md }, label = 'ci-failure') {
  const open = ((await gh(`/issues?state=open&labels=${label}&per_page=100`)) || []).find(i => (i.body || '').includes(MARK));
  if (!bad.length) { if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed', body: open.body + '\n\n✅ Không còn workflow vượt ngưỡng runner (ci-triage tự đóng).' } }); return open ? 'closed' : 'ok'; }
  const body = `${MARK}\n${md}\n\nSửa tận gốc: workflow_run/check_suite cần if: mức job + concurrency (scripts/test/ci-policy.mjs luật 5); ngưỡng + bài học: docs/CI-RUNNERS.md § Giám sát.`;
  if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { title: TITLE, body } });
  else await gh('/issues', { method: 'POST', body: { title: TITLE, body, labels: [label] } });
  return open ? 'updated' : 'opened';
}
