#!/usr/bin/env node
// Health sweep (23/11, máy gác main đỏ): workflow nào ĐỎ trên main quá 24 giờ mà chưa ai xử lý → tự mở issue nhãn `main-red` (teacher-motion đỏ 3 ngày không ai thấy).
// Hết đỏ → tự đóng issue. Không mở lặp (1 issue mở / workflow). Chạy cùng main-red-retry.yml (nhịp 30 phút).
//   node scripts/ci/main-red-age.mjs [--dry]     Env: GITHUB_TOKEN, GITHUB_REPOSITORY.   Test thuần: scripts/test/main-guards.mjs (redSince, issueFor).
import { isMain } from '../lib/is-main.mjs';
import { ghFetch } from '../lib/retry5xx.mjs';

export const LABEL = 'main-red', MAX_AGE_H = 24, MIN_REDS = 2, SKIP = new Set(['cancelled', 'skipped']);
/** Hàm thuần: runs push main của 1 workflow (mọi trạng thái, mới→cũ) → mốc ISO lượt đỏ ĐẦU TIÊN của chuỗi đỏ hiện tại; null nếu lượt xong gần nhất không đỏ. */
export function redSince(runs) {
  const done = (runs || []).filter(r => r.status === 'completed' && !SKIP.has(r.conclusion));
  if (!done.length || done[0].conclusion !== 'failure') return null;
  let since = done[0];
  for (const r of done) { if (r.conclusion === 'failure') since = r; else break; }
  return since.created_at;
}
/** Hàm thuần: số lượt đỏ LIỀN của chuỗi đỏ hiện tại (bỏ huỷ/skip); 0 nếu lượt xong gần nhất không đỏ. */
export function redCount(runs) {
  const done = (runs || []).filter(r => r.status === 'completed' && !SKIP.has(r.conclusion)); let n = 0;
  for (const r of done) { if (r.conclusion === 'failure') n++; else break; }
  return n;
}
/** Hàm thuần: lượt đỏ ĐẦU của chuỗi hiện tại (commit gây lỗi) hoặc null. */
export function firstRedRun(runs) {
  const done = (runs || []).filter(r => r.status === 'completed' && !SKIP.has(r.conclusion)); let f = null;
  for (const r of done) { if (r.conclusion === 'failure') f = r; else break; }
  return f;
}
/** Hàm thuần: có phải mở issue không = đỏ ≥ MIN_REDS lượt push liền (chặn mù 24/11: frame-consistency đỏ 3 lượt, 0 issue) HOẶC đỏ > 24 giờ. */
export const reportable = (runs, now = Date.now()) => redCount(runs) >= MIN_REDS || stale(redSince(runs), now);
/** Hàm thuần: đỏ từ `since` tới `now` có quá maxH giờ không. */
export const stale = (since, now = Date.now(), maxH = MAX_AGE_H) => !!since && now - Date.parse(since) > maxH * 36e5;
export const issueTitle = name => `main đỏ: ${name}`;
const legacyTitle = name => `main đỏ > ${MAX_AGE_H} giờ: ${name}`;   // issue cũ vẫn khớp, không mở lặp
/** Hàm thuần: issue mở của workflow này đã có chưa (khớp tiêu đề). */
export const hasIssue = (issues, name) => (issues || []).some(i => i.title === issueTitle(name) || i.title === legacyTitle(name));

async function main() {
  const dry = process.argv.includes('--dry'), repo = process.env.GITHUB_REPOSITORY, tok = process.env.GITHUB_TOKEN;
  if (!repo || !tok) { console.error('thiếu GITHUB_REPOSITORY / GITHUB_TOKEN'); process.exit(2); }
  const api = async (p, init = {}) => { const r = await ghFetch(`https://api.github.com/repos/${repo}${p}`, { ...init, headers: { Authorization: 'Bearer ' + tok, Accept: 'application/vnd.github+json', ...(init.body ? { 'content-type': 'application/json' } : {}) } }); return { status: r.status, json: await r.json().catch(() => ({})) }; };
  const wfs = []; for (let p = 1; p <= 5; p++) { const j = (await api(`/actions/workflows?per_page=100&page=${p}`)).json.workflows || []; wfs.push(...j.filter(w => w.state === 'active')); if (j.length < 100) break; }
  const open = ((await api(`/issues?state=open&labels=${LABEL}&per_page=100`)).json || []).filter(i => !i.pull_request);
  if (!dry) await api('/labels', { method: 'POST', body: JSON.stringify({ name: LABEL, color: 'b60205' }) });   // đã có → 422, bỏ qua
  let red = 0, opened = 0, closed = 0;
  for (const w of wfs) {
    const runs = (await api(`/actions/workflows/${w.id}/runs?branch=main&event=push&status=completed&per_page=20`)).json.workflow_runs || [];
    const since = redSince(runs), issue = open.find(i => i.title === issueTitle(w.name) || i.title === legacyTitle(w.name));
    if (!since) { if (issue) { closed++; console.log(`${w.name}: hết đỏ → đóng #${issue.number}`); if (!dry) { await api(`/issues/${issue.number}/comments`, { method: 'POST', body: JSON.stringify({ body: 'Workflow đã xanh lại trên main → tự đóng.' }) }); await api(`/issues/${issue.number}`, { method: 'PATCH', body: JSON.stringify({ state: 'closed' }) }); } } continue; }
    red++;
    if (!reportable(runs) || issue) continue;
    const first = firstRedRun(runs), pr = first ? ((await api(`/commits/${first.head_sha}/pulls`)).json || [])[0] : null, owner = pr && pr.user && pr.user.type !== 'Bot' ? pr.user.login : null;
    console.log(`::warning title=main đỏ::${w.name} đỏ từ ${since} (${redCount(runs)} lượt liền)`);
    opened++;
    if (!dry) await api('/issues', { method: 'POST', body: JSON.stringify({ title: issueTitle(w.name), labels: [LABEL], ...(owner ? { assignees: [owner] } : {}), body: `Workflow **${w.name}** (\`${w.path}\`) đỏ trên main từ ${since} (${redCount(runs)} lượt push liền hoặc > ${MAX_AGE_H} giờ), chưa ai xử lý.\n\nChủ: ${pr ? `PR gây lỗi #${pr.number} (@${owner || 'bot'}) – commit \`${first.head_sha.slice(0, 8)}\`` : first ? `commit \`${first.head_sha.slice(0, 8)}\` (không thấy PR)` : 'không rõ'}.\n\nChủ workflow/điều phối: sửa gốc (không nới ngưỡng) hoặc giao phiên sửa. Issue tự đóng khi workflow xanh lại.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)` }) });
  }
  console.log(`main-red-age: ${wfs.length} workflow, ${red} đỏ, ${opened} issue mở mới, ${closed} đóng`);
}
if (isMain(import.meta.url)) main().catch(e => { console.error(e); process.exit(1); });
