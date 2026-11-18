// Tracker test chập chờn (17/11, điều phối): "chập chờn" = CÙNG sha, cùng workflow: có lượt đỏ rồi có lượt xanh (chạy lại hoặc lượt sau) → lỗi không nằm ở mã PR.
// Gồm cả xanh sau khi chạy lại (run_attempt > 1: API chỉ trả lượt mới nhất của 1 run). Đọc lịch sử run (event pull_request, N ngày) → đếm theo workflow; với lượt đỏ lấy chú thích ::error của run-suite (#1536: "<lệnh>: <lý do>") để đếm theo TỪNG TEST.
//   node scripts/ci/flake-tracker.mjs [--days 2] [--detail 40] [--verify 200] [--issue] [--json]     (GH token: gh-api.mjs; --issue = mở/cập nhật issue `ci-failure` có MARK)
// Test: scripts/test/flake-tracker.mjs. Hàm thuần: groupFlakes, testOf, render.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
export const MARK = '<!-- flake-tracker -->', TITLE = 'CI: test chập chờn (đỏ rồi xanh trên cùng sha)';
const OKC = new Set(['success']), BADC = new Set(['failure', 'timed_out']);   // huỷ/bỏ qua không phải kết luận về mã

/** runs = workflow_runs → { cands: [{ name, sha, id, attempt, certain }], shas }. certain = thấy cả lượt đỏ lẫn xanh cùng (workflow, sha); !certain = xanh ở lần chạy lại > 1
 *  (API chỉ trả lượt MỚI NHẤT của 1 run) – lần trước có thể là đỏ THẬT hoặc chỉ bị huỷ/hạ tầng → phải kiểm bằng /attempts. Thuần. */
export function groupFlakes(runs = []) {
  const g = new Map();
  for (const r of runs) {
    if (!OKC.has(r.conclusion) && !BADC.has(r.conclusion)) continue;
    const k = `${r.name}\u0000${r.head_sha}`, e = g.get(k) || { name: r.name, sha: r.head_sha, fail: [], ok: [] };
    (BADC.has(r.conclusion) ? e.fail : e.ok).push(r); g.set(k, e);
  }
  const cands = [], shas = new Map();
  for (const e of g.values()) {
    shas.set(e.name, (shas.get(e.name) || 0) + 1);
    const rerun = e.ok.find(r => (r.run_attempt || 1) > 1);
    if (e.fail.length && e.ok.length) cands.push({ name: e.name, sha: e.sha.slice(0, 8), id: e.fail[0].id, attempt: e.fail[0].run_attempt || 1, certain: true });
    else if (rerun) cands.push({ name: rerun.name, sha: e.sha.slice(0, 8), id: rerun.id, attempt: rerun.run_attempt - 1, certain: false });
  }
  return { cands, shas };
}
/** cands đã xác minh (confirmed: Set khoá `${id}:${attempt}` của lần đỏ THẬT) → { byWorkflow, total, unverified }. Thuần. */
export function tally({ cands = [], shas = new Map() } = {}, confirmed = new Set(), verified = new Set()) {
  const by = new Map(); let unverified = 0;
  for (const c of cands) {
    const key = `${c.id}:${c.attempt}`;
    if (!c.certain && !confirmed.has(key)) { if (!verified.has(key)) unverified++; continue; }
    const w = by.get(c.name) || { name: c.name, shas: shas.get(c.name) || 0, flakes: 0, sample: [] };
    w.flakes++; if (w.sample.length < 5) w.sample.push({ sha: c.sha, failedRun: c.id, attempt: c.attempt }); by.set(c.name, w);
  }
  const byWorkflow = [...by.values()].sort((a, b) => b.flakes - a.flakes || a.name.localeCompare(b.name));
  return { byWorkflow, total: byWorkflow.reduce((x, w) => x + w.flakes, 0), unverified };
}
/** Chú thích ::error của run-suite ("node scripts/test/x.mjs: lý do") → tên test hoặc null. Thuần. */
export const testOf = msg => (String(msg || '').match(/^(?:node |python3? |bash )?(?:\.\/)?([\w./-]+\.(?:m?js|py|sh))\b/) || [])[1] || null;
/** perTest: Map tên test → số lần đỏ-rồi-xanh. Thuần. */
export function render({ byWorkflow = [], total = 0, unverified = 0 } = {}, perTest = new Map(), days = 3) {
  let md = `${MARK}\n### 🎲 Test chập chờn ${days} ngày qua: ${total} cặp (workflow, sha) đỏ rồi xanh\n\n`;
  md += byWorkflow.length ? '| Workflow | Chập chờn | Số sha | Mẫu lượt đỏ |\n|---|---|---|---|\n' + byWorkflow.map(w => `| ${w.name} | ${w.flakes} | ${w.shas} | ${w.sample.map(s => `${s.sha} (#${s.failedRun})`).join(', ')} |`).join('\n') + '\n' : '✓ Không có chập chờn.\n';
  if (unverified) md += `\n_${unverified} lượt xanh-sau-chạy-lại chưa kiểm lần trước (hạn mức API) – không tính ở trên; có thể là huỷ/hạ tầng, không phải test._\n`;
  const t = [...perTest].sort((a, b) => b[1] - a[1]);
  if (t.length) md += `\n**Theo từng test (từ chú thích ::error):**\n${t.map(([n, c]) => `- \`${n}\`: ${c} lần`).join('\n')}\n\nSửa GỐC (không skip, không hạ ngưỡng): đo CPU/thời gian chờ, bỏ phụ thuộc thứ tự/đồng hồ.\n`;
  return md;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { ghApi, REPO } = await import('./gh-api.mjs');
  const a = process.argv.slice(2), arg = (k, d) => { const i = a.indexOf(k); return i >= 0 ? +a[i + 1] : d; }, days = arg('--days', 2), detail = arg('--detail', 40);
  const gh = async (p, o = {}) => { const r = await ghApi(o.method || 'GET', `/repos/${REPO}${p}`, { data: o.body && JSON.stringify(o.body) }); if (r.status >= 400 || r.rateLimited) throw new Error(`GitHub ${r.status || 'rate-limited'} ${p}`); return typeof r.body === 'string' ? JSON.parse(r.body) : r.body; };
  const since = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10), runs = [];
  for (let p = 1; p <= 25; p++) { const j = await gh(`/actions/runs?event=pull_request&status=completed&per_page=100&page=${p}&created=%3E%3D${since}`); runs.push(...(j.workflow_runs || [])); if ((j.workflow_runs || []).length < 100) break; }
  const raw = groupFlakes(runs), perTest = new Map(), confirmed = new Set(), verified = new Set(), annot = [];
  // xác minh lần chạy trước của ứng viên "chạy lại": đỏ THẬT (failure/timed_out) mới tính; huỷ/hạ tầng thì không. Hạn --verify để giữ hạn mức API.
  let budget = arg('--verify', 200);
  for (const c of raw.cands) {
    const key = `${c.id}:${c.attempt}`;
    if (!c.certain) { if (budget-- <= 0) continue; try { const jobs = (await gh(`/actions/runs/${c.id}/attempts/${c.attempt}/jobs?per_page=100`)).jobs || []; verified.add(key); const red = jobs.filter(x => BADC.has(x.conclusion)); if (!red.length) continue; confirmed.add(key); annot.push({ c, red }); } catch (e) { console.error('::warning::' + e.message); continue; } }
    else if (annot.length < detail) { try { annot.push({ c, red: ((await gh(`/actions/runs/${c.id}/attempts/${c.attempt}/jobs?per_page=100`)).jobs || []).filter(x => BADC.has(x.conclusion)) }); } catch { /* bỏ qua */ } }
  }
  for (const { red } of annot.slice(0, detail)) for (const j of red) { try { for (const an of (await gh(`/check-runs/${j.id}/annotations`)) || []) { const n = an.annotation_level === 'failure' && testOf(an.message); if (n) perTest.set(n, (perTest.get(n) || 0) + 1); } } catch { /* bỏ qua */ } }
  const gf = tally(raw, confirmed, verified);
  const md = render(gf, perTest, days);
  console.log(a.includes('--json') ? JSON.stringify({ gf, perTest: [...perTest] }, null, 1) : md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n');
  if (a.includes('--issue')) {
    const open = ((await gh('/issues?state=open&labels=ci-failure&per_page=100')) || []).find(i => (i.body || '').includes(MARK));
    if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { title: TITLE, body: md } }); else await gh('/issues', { method: 'POST', body: { title: TITLE, body: md, labels: ['ci-failure'] } });
  }
}
