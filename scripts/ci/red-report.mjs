// Báo cáo PR đỏ THEO NGUYÊN NHÂN (17/11, điều phối: 21/32 PR đỏ mà không biết giao ai). Mỗi PR đỏ vào đúng 1 nhóm:
//   real  = lỗi thật của chính PR (check đỏ riêng của PR)      → giao phiên sở hữu PR
//   drift = trôi so với main (cổng main đổi / cùng check đỏ ở ≥ MIN PR khác = gốc ở main) → gộp main / sửa 1 lần ở main, không sửa từng PR
//   flaky = check đỏ nhưng cùng sha từng đạt (chập chờn)        → chạy lại + tracker flake, sửa gốc test
//   infra = chỉ huỷ / startup_failure / timeout (hạ tầng)       → chạy lại job, không đụng mã PR
// Kèm danh sách PR quá cũ (> STALE_DAYS) để điều phối đóng/gom, và cảnh báo WIP > 15. CHỈ liệt kê, không đóng gì.
//   node scripts/ci/red-report.mjs [--issue] [--json]     (--issue: mở/cập nhật 1 issue ci-failure; cần token ghi issue)
// Dùng thư viện: classify(pr, commonChecks). Test: scripts/test/red-report.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ghApi, REPO } from './gh-api.mjs';

export const STALE_DAYS = 5, WIP_MAX = 15, COMMON_MIN = 3;
export const GROUPS = { real: 'Lỗi thật của PR', drift: 'Trôi so với main', flaky: 'Chập chờn', infra: 'Hạ tầng' };
const base = n => String(n).replace(/\s*\(.*\)\s*$/, '');
const INFRA = new Set(['cancelled', 'startup_failure', 'timed_out', 'stale']);

/** Check đỏ chung ≥ min PR (tên bỏ phần "(…)") → Set tên. Thuần. */
export function commonChecks(prs, min = COMMON_MIN) {
  const by = {}; for (const p of prs) for (const c of new Set((p.failed || []).map(f => base(f.name)))) by[c] = (by[c] || 0) + 1;
  return new Set(Object.keys(by).filter(k => by[k] >= min));
}
/** pr: { number, failed: [{ name, conclusion, passedBefore }], gateDesc } → { group, why } hoặc null nếu không đỏ. Thuần. */
export function classify(pr, common = new Set()) {
  const f = pr.failed || [];
  if (!f.length) return null;
  const names = f.map(x => x.name).slice(0, 4).join(', ') + (f.length > 4 ? ` +${f.length - 4}` : '');
  if (f.every(x => INFRA.has(x.conclusion))) return { group: 'infra', why: `${names} (${[...new Set(f.map(x => x.conclusion))].join('/')})` };
  const hard = f.filter(x => !INFRA.has(x.conclusion));
  if (hard.every(x => x.passedBefore)) return { group: 'flaky', why: `${hard.map(x => x.name).join(', ')} đạt ở lượt khác cùng sha` };
  if (/Main đã đổi tệp cổng/.test(pr.gateDesc || '') || hard.every(x => common.has(base(x.name)))) return { group: 'drift', why: `${names} đỏ chung ở nhiều PR / cổng main đổi` };
  return { group: 'real', why: names };
}
/** prs đã phân loại → { md, text, groups, stale, wip }. Thuần. */
export function report(prs, now = Date.now()) {
  const common = commonChecks(prs), g = { real: [], drift: [], flaky: [], infra: [] };
  for (const p of prs) { const c = classify(p, common); if (c) g[c.group].push({ n: p.number, owner: p.owner || '', why: c.why }); }
  const stale = prs.filter(p => p.createdAt && (now - Date.parse(p.createdAt)) / 864e5 > STALE_DAYS).map(p => ({ n: p.number, days: Math.floor((now - Date.parse(p.createdAt)) / 864e5), red: !!classify(p, common) })).sort((a, b) => b.days - a.days);
  const red = Object.values(g).reduce((s, a) => s + a.length, 0);
  let md = `## 🔴 PR đỏ theo nguyên nhân: ${red}/${prs.length} PR mở\n`;
  for (const k of Object.keys(GROUPS)) md += `\n### ${GROUPS[k]} (${g[k].length})\n` + (g[k].length ? g[k].map(x => `- #${x.n}: ${x.why}`).join('\n') : '_không có_') + '\n';
  md += `\n### PR quá ${STALE_DAYS} ngày (đề xuất đóng/gom; điều phối quyết) (${stale.length})\n` + (stale.length ? stale.map(s => `- #${s.n} (${s.days} ngày${s.red ? ', đỏ' : ''})`).join('\n') : '_không có_') + '\n';
  if (prs.length > WIP_MAX) md += `\n⚠️ WIP ${prs.length} > ${WIP_MAX}: cần đóng/gom ≥ ${prs.length - WIP_MAX} PR (ưu tiên danh sách trên).\n`;
  return { md, groups: g, stale, wip: prs.length, red, text: Object.keys(GROUPS).map(k => `${GROUPS[k]} ${g[k].length}`).join(' · ') + ` · đỏ ${red}/${prs.length}` };
}

const MARK = '<!-- red-report -->', TITLE = 'CI: PR đỏ theo nguyên nhân';
async function scan(gh) {
  const pulls = ((await gh('/pulls?state=open&per_page=100')) || []).filter(p => !p.draft), out = [];
  for (const p of pulls) {
    const sha = p.head.sha, all = ((await gh(`/commits/${sha}/check-runs?per_page=100&filter=all`)) || {}).check_runs || [];
    const latest = ((await gh(`/commits/${sha}/check-runs?per_page=100&filter=latest`)) || {}).check_runs || [];
    const ok = new Set(all.filter(r => r.conclusion === 'success').map(r => r.name));
    const failed = latest.filter(r => ['failure', 'timed_out', 'cancelled', 'startup_failure'].includes(r.conclusion)).map(r => ({ name: r.name, conclusion: r.conclusion, passedBefore: ok.has(r.name) }));
    const st = (await gh(`/commits/${sha}/status`)) || {}, g = (st.statuses || []).find(s => s.context === 'required-gate');
    out.push({ number: p.number, owner: p.user?.login, createdAt: p.created_at, failed, gateDesc: g?.description || '' });
  }
  return out;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const gh = async (p, o = {}) => { const r = await ghApi(o.method || 'GET', `/repos/${REPO}${p}`, { data: o.body && JSON.stringify(o.body) }); if (r.status >= 400 || r.rateLimited) throw new Error(`GitHub ${r.status || 'rate-limited'} ${p}`); return typeof r.body === 'string' ? JSON.parse(r.body) : r.body; };
  const rep = report(await scan(gh));
  if (process.argv.includes('--json')) console.log(JSON.stringify(rep.groups, null, 1)); else console.log(rep.md);
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, rep.md + '\n');
  if (process.argv.includes('--issue')) {
    const open = ((await gh('/issues?state=open&labels=ci-failure&per_page=100')) || []).find(i => (i.body || '').includes(MARK)), body = `${MARK}\n${rep.md}`;
    if (open) await gh(`/issues/${open.number}`, { method: 'PATCH', body: { title: TITLE, body } }); else await gh('/issues', { method: 'POST', body: { title: TITLE, body, labels: ['ci-failure'] } });
  }
}
