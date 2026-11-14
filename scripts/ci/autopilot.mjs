#!/usr/bin/env node
/* ci-autopilot (12/11, chủ giận: CI nhàn rỗi trong khi 65 PR chất đống): mỗi 10 phút duyệt MỌI PR mở không draft và làm đúng 4 việc, dùng lại hạ tầng có sẵn
 * (pr-unconflict.fix để gộp main bằng khoá deploy → CI của PR chạy lại; filler.measure/countJobs đo runner; ngân sách 40 runner giữ ≥16 trống):
 *   1. PR tụt sau main, không xung đột → gộp main vào nhánh (bắt xung đột ẩn sớm). Có ngân sách: chỉ khi busy < 24/40, số PR ≤ floor((24 − busy) / 4), cũ nhất trước.
 *   2. Xung đột → nhãn needs-rebase + 1 bình luận nêu tên tệp (có nhãn rồi thì im; hết xung đột thì gỡ nhãn).
 *   3. Check đỏ vì hạ tầng (runner mất, cài đặt/mạng/apt/playwright treo, bị huỷ) → chạy lại job hỏng, tối đa 2 lần/lượt (run_attempt ≤ 2).
 *   4. Check bắt buộc required-gate xanh + gộp được + không nhãn chặn → squash-merge. KHÔNG bao giờ gộp khi đỏ/đang chạy/thiếu status; không bỏ check nào.
 *      Gộp bằng github.token KHÔNG kích workflow push-main (deploy, codemap…) → chỉ gộp khi có secret AUTOPILOT_MERGE_TOKEN; không có thì gắn nhãn ready-to-merge + liệt kê để điều phối gộp.
 * Trạng thái: job summary + 1 issue ghim "CI autopilot" cập nhật tại chỗ (busy/queued, gộp/chạy lại/cập nhật 24 h, PR kẹt > 24 h + lý do).
 * Chạy: node scripts/ci/autopilot.mjs [--dry]. Test: scripts/test/ci-autopilot.mjs. Cùng chung luật với phiên khác (merge-captain…): chỉ đụng PR xanh hẳn hoặc hỏng hạ tầng rõ. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { measure } from './filler.mjs';
import { retry5xx } from '../lib/retry5xx.mjs';
import { TAKE_MAIN } from '../pr-unconflict.mjs';

export const TOTAL = 40, KEEP_FREE = 16, BUSY_MAX = TOTAL - KEEP_FREE;   // 24: dưới mức này mới nạp thêm việc
export const PER_PR = 4, MAX_UPDATES = 8, MAX_MERGES = 3, MAX_RERUN_ATTEMPT = 2, STUCK_H = 24, WINDOW_H = 24;
export const HOLD_LABELS = ['do-not-merge', 'frozen', 'hold', 'wip', 'blocked'];
export const L_REBASE = 'needs-rebase', L_READY = 'ready-to-merge', ISSUE_TITLE = 'CI autopilot', ISSUE_LABEL = 'ci-autopilot';
const INFRA_STEP = /\b(set up job|setup[- ]node|checkout|apt|apt-get|install|npm ci|npm install|playwright|download|upload artifact|cache|ffmpeg|wrangler|retry|network|curl)\b/i;
const INFRA_MSG = /(runner (has )?(received a shutdown signal|lost)|lost communication|operation was canceled|the hosted runner|no space left|ECONNRESET|ETIMEDOUT|EAI_AGAIN|socket hang up|fetch failed|503|502|timed? ?out while|could not resolve host|unable to (fetch|connect)|temporary failure)/i;

/** Số PR được nạp thêm (cập nhật nhánh / chạy lại) cho mức busy hiện tại (thuần): busy ≥ 24 → 0; mỗi PR ≈ 4 job. */
export const budget = busy => busy >= BUSY_MAX ? 0 : Math.min(MAX_UPDATES, Math.floor((BUSY_MAX - busy) / PER_PR));
/** Job hỏng do hạ tầng (thuần): bị huỷ/timeout, không có bước nào chạy (runner mất), hoặc bước hỏng là cài đặt/mạng; hoặc thông điệp chú thích khớp lỗi hạ tầng. */
export function isInfraJob(job, msg = '') {
  if (!job || !['failure', 'cancelled', 'timed_out'].includes(job.conclusion)) return false;
  if (job.conclusion !== 'failure') return true;
  const steps = job.steps || [];
  if (!steps.length || !steps.some(s => s.conclusion && s.conclusion !== 'skipped')) return true;
  if (INFRA_MSG.test(msg)) return true;
  const bad = steps.filter(s => s.conclusion === 'failure');
  return bad.length > 0 && bad.every(s => INFRA_STEP.test(s.name || ''));
}
/** Lượt hỏng đáng chạy lại (thuần): mọi job hỏng đều là hạ tầng và lượt còn trong hạn 2 lần chạy lại. */
export const shouldRerun = (run, failedJobs) => ['failure', 'cancelled', 'timed_out'].includes(run.conclusion) && (run.run_attempt || 1) <= MAX_RERUN_ATTEMPT && failedJobs.length > 0 && failedJobs.every(j => j.infra);
export const held = pr => pr.labels.some(l => HOLD_LABELS.includes(l));
/** Quyết định cho 1 PR (thuần). pr: { draft, labels[], mergeable: MERGEABLE|CONFLICTING|UNKNOWN, gate: SUCCESS|FAILURE|PENDING|ERROR|null, behind }. */
export function decide(pr) {
  if (pr.draft) return { act: 'skip', why: 'draft' };
  if (pr.mergeable === 'CONFLICTING') return { act: 'conflict' };
  if (held(pr)) return { act: 'skip', why: 'nhãn chặn gộp' };
  if (pr.gate === 'SUCCESS' && pr.mergeable === 'MERGEABLE') return { act: 'merge' };
  if (pr.gate === 'FAILURE' || pr.gate === 'ERROR') return { act: 'triage-red' };
  if (pr.behind > 0) return { act: 'update' };
  return { act: 'wait', why: pr.gate ? 'check đang chạy' : 'chưa có check trên head' };
}
/** Lý do kẹt > 24 h (thuần). */
export function stuckReason(pr, d) {
  if (d.act === 'skip') return d.why;
  if (d.act === 'conflict') return 'xung đột với main';
  if (d.act === 'merge') return 'xanh, đang chờ gộp';
  if (d.act === 'triage-red') return 'check đỏ (lỗi thật)';
  if (d.act === 'update') return `tụt ${pr.behind} commit sau main`;
  return d.why;
}
/** Nhật ký 24 h nhúng trong thân issue (thuần): lọc còn trong cửa sổ, đếm theo loại. */
export function tally(events, now = Date.now()) {
  const keep = events.filter(e => now - Date.parse(e.t) <= WINDOW_H * 3600e3), n = k => keep.filter(e => e.k === k).length;
  return { keep, merged: n('merge'), rerun: n('rerun'), updated: n('update'), conflicts: n('conflict'), ready: n('ready') };
}
export const parseLog = body => { const m = /<!-- autopilot-log:(.*?) -->/s.exec(body || ''); try { return m ? JSON.parse(m[1]) : []; } catch { return []; } };
export function renderIssue({ busy, queued, tallyR, stuck, ready, ts, dry, canMerge }) {
  const row = s => `| #${s.n} | ${s.age} h | ${s.reason} |`;
  return `Cập nhật ${ts}${dry ? ' (chạy thử)' : ''} · tự động mỗi 10 phút bởi \`ci-autopilot\` (cập nhật tại chỗ, không tạo issue mới).\n\n` +
    `**Runner** busy ${busy}/${TOTAL} (chừa ≥ ${KEEP_FREE} trống) · queued ${queued}\n\n` +
    `**24 giờ qua:** gộp ${tallyR.merged} · chạy lại ${tallyR.rerun} · cập nhật nhánh ${tallyR.updated} · báo xung đột ${tallyR.conflicts}\n\n` +
    `**Sẵn sàng gộp (xanh hẳn)${canMerge ? '' : ' – chưa có AUTOPILOT_MERGE_TOKEN nên điều phối gộp tay'}:** ${ready.length ? ready.map(n => '#' + n).join(' ') : 'không'}\n\n` +
    `**PR kẹt > ${STUCK_H} giờ (${stuck.length}):**\n\n${stuck.length ? '| PR | Tuổi | Lý do |\n|---|---|---|\n' + stuck.map(row).join('\n') : 'không'}\n\n` +
    `<!-- autopilot-log:${JSON.stringify(tallyR.keep)} -->`;
}

// ---------- GitHub ----------
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io';
const API = 'https://api.github.com';
async function call(token, method, p, body) {
  const r = await retry5xx(() => fetch(p.startsWith('http') ? p : `${API}${p}`, { method, headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'lexkite-ci-autopilot', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30e3) }));
  const text = await r.text(); let j = null; try { j = text ? JSON.parse(text) : null; } catch { /* không JSON */ }
  return { status: r.status, ok: r.ok, body: j };
}
const QUERY = `query($o:String!,$r:String!){repository(owner:$o,name:$r){pullRequests(states:OPEN,first:100,orderBy:{field:CREATED_AT,direction:ASC}){nodes{number isDraft createdAt updatedAt mergeable headRefName headRefOid isCrossRepository labels(first:20){nodes{name}} commits(last:1){nodes{commit{status{context(name:"required-gate"){state}}}}}}}}}`;
export async function listPRs(token) {
  const [o, r] = REPO.split('/'), res = await call(token, 'POST', '/graphql', { query: QUERY, variables: { o, r } });
  const nodes = res.body?.data?.repository?.pullRequests?.nodes;
  if (!nodes) throw new Error('GraphQL lỗi: ' + JSON.stringify(res.body).slice(0, 200));
  return nodes.map(n => ({ number: n.number, draft: n.isDraft, createdAt: n.createdAt, updatedAt: n.updatedAt, mergeable: n.mergeable, branch: n.headRefName, sha: n.headRefOid, fork: n.isCrossRepository,
    labels: n.labels.nodes.map(l => l.name), gate: n.commits.nodes[0]?.commit.status?.context?.state ?? null, behind: 0 }));
}
/** Số commit main mà head chưa có, TÍNH CHO VIỆC CẬP NHẬT (thuần, nhận body của compare head...main). 14/11: bot codemap đẩy main sau MỖI lần gộp
 *  (~30 commit/ngày chỉ đổi docs/CODEMAP.md + codemap.json) → mọi PR đang chạy check thành "tụt" → autopilot gộp main → toàn bộ CI của PR chạy lại.
 *  Main chỉ đổi tệp báo cáo bot sinh (TAKE_MAIN – không có cổng nào trên PR đọc chúng, gộp sau vẫn lấy bản main) → 0. Thiếu/≥300 tệp (API cắt) → giữ ahead_by. */
export function behindOf(cmp, auto = TAKE_MAIN) {
  const n = cmp?.ahead_by ?? 0, files = cmp?.files;
  if (!n || !Array.isArray(files) || !files.length || files.length >= 300) return n;
  return files.every(f => auto.includes(f.filename)) ? 0 : n;
}
const behindBy = async (token, sha) => behindOf((await call(token, 'GET', `/repos/${REPO}/compare/${sha}...main`)).body);   // main có bao nhiêu commit (đáng gộp) mà head chưa có

async function ensureLabels(token) {
  for (const [name, color, description] of [[L_REBASE, 'd93f0b', 'Xung đột với main – người phụ trách gỡ'], [L_READY, '0e8a16', 'Xanh hẳn, sẵn sàng gộp'], [ISSUE_LABEL, '5319e7', 'Bản tin CI autopilot']])
    await call(token, 'POST', `/repos/${REPO}/labels`, { name, color, description });   // 422 nếu đã có – bỏ qua
}
async function rerunInfra(token, pr, dry) {
  const runs = (await call(token, 'GET', `/repos/${REPO}/actions/runs?head_sha=${pr.sha}&per_page=100`)).body?.workflow_runs || [];
  let n = 0;
  for (const run of runs.filter(r => r.status === 'completed' && ['failure', 'cancelled', 'timed_out'].includes(r.conclusion) && r.event === 'pull_request')) {
    if ((run.run_attempt || 1) > MAX_RERUN_ATTEMPT) continue;
    const jobs = (await call(token, 'GET', `/repos/${REPO}/actions/runs/${run.id}/jobs?filter=latest&per_page=100`)).body?.jobs || [];
    const failed = [];
    for (const j of jobs.filter(j => ['failure', 'cancelled', 'timed_out'].includes(j.conclusion))) {
      const ann = j.conclusion === 'failure' ? ((await call(token, 'GET', `/repos/${REPO}/check-runs/${j.id}/annotations`)).body || []).map(a => a.message).join(' ') : '';
      failed.push({ name: j.name, infra: isInfraJob(j, ann) });
    }
    if (!shouldRerun(run, failed)) continue;
    if (dry || (await call(token, 'POST', `/repos/${REPO}/actions/runs/${run.id}/rerun-failed-jobs`)).ok) n++;
  }
  return n;
}

export async function main({ dry = process.argv.includes('--dry') } = {}) {
  const token = process.env.GITHUB_TOKEN, mergeToken = process.env.AUTOPILOT_MERGE_TOKEN || '', now = Date.now(), ts = new Date(now).toISOString().slice(0, 16) + 'Z';
  const uc = await import('../pr-unconflict.mjs');
  const m = await measure(), prs = (await listPRs(token)).filter(p => !p.draft), events = [], log = [];
  const issues = (await call(token, 'GET', `/repos/${REPO}/issues?labels=${ISSUE_LABEL}&state=open&per_page=5`)).body || [];
  const issue = issues.find(i => i.title === ISSUE_TITLE), prev = parseLog(issue?.body);
  if (!dry) await ensureLabels(token);
  let left = budget(m.busy), merges = 0;
  const ready = [], stuck = [], mark = (k, n) => events.push({ k, n, t: new Date().toISOString() });
  const decided = [];
  for (const pr of prs) {   // cũ nhất trước (GraphQL ASC)
    let d = decide(pr);
    if (['wait', 'triage-red'].includes(d.act) && !pr.fork) { pr.behind = await behindBy(token, pr.sha); /* chỉ PR chưa gộp được cần biết tụt bao nhiêu */ if (pr.behind > 0 && d.act === 'wait') d = decide(pr); }
    decided.push([pr, d]);
  }
  for (const [pr, d] of decided) {
    const n = pr.number;
    if (d.act === 'merge') {
      ready.push(n);
      if (!pr.labels.includes(L_READY) && !dry) await call(token, 'POST', `/repos/${REPO}/issues/${n}/labels`, { labels: [L_READY] });
      if (mergeToken && merges < MAX_MERGES && !dry) {
        const fresh = (await listOne(token, n));   // đọc lại ngay trước khi gộp: không bao giờ gộp theo ảnh cũ
        if (fresh && decide(fresh).act === 'merge' && fresh.sha === pr.sha) {
          const r = await call(mergeToken, 'PUT', `/repos/${REPO}/pulls/${n}/merge`, { merge_method: 'squash', sha: pr.sha });
          log.push(`#${n}: gộp → ${r.status}`); if (r.ok) { merges++; mark('merge', n); ready.splice(ready.indexOf(n), 1); continue; }
        }
      }
    } else {
      if (pr.labels.includes(L_READY) && !dry) await call(token, 'DELETE', `/repos/${REPO}/issues/${n}/labels/${L_READY}`);
      if (d.act === 'conflict' && !pr.fork) {
        const r = dry ? 'dry' : uc.fix({ number: n, head: { ref: pr.branch } }, false);   // tự gỡ tệp tự sinh; ngoài ra 'manual'
        if (r === 'fixed') { mark('update', n); log.push(`#${n}: gỡ xung đột tệp tự sinh`); continue; }
        if (r === 'manual' && !pr.labels.includes(L_REBASE) && !dry) {
          await call(token, 'POST', `/repos/${REPO}/issues/${n}/labels`, { labels: [L_REBASE] });
          await call(token, 'POST', `/repos/${REPO}/issues/${n}/comments`, { body: `⚠️ **ci-autopilot:** nhánh xung đột với \`main\` ở tệp: ${uc.lastConflicts.map(f => '`' + f + '`').join(', ') || '(không rõ)'}. Phiên phụ trách gộp main vào nhánh rồi đẩy lại; nhãn \`${L_REBASE}\` tự gỡ khi hết xung đột. (Chỉ báo 1 lần.)` });
          mark('conflict', n);
        }
      } else if (pr.labels.includes(L_REBASE) && d.act !== 'conflict' && !dry) await call(token, 'DELETE', `/repos/${REPO}/issues/${n}/labels/${L_REBASE}`);
      if (d.act === 'triage-red' && left > 0) { const k = await rerunInfra(token, pr, dry); if (k) { left--; mark('rerun', n); log.push(`#${n}: chạy lại ${k} lượt (hạ tầng)`); } }
      if (d.act === 'update' && left > 0 && !pr.fork) { const r = dry ? 'dry' : uc.fix({ number: n, head: { ref: pr.branch } }, false); if (r === 'fixed') { left--; mark('update', n); log.push(`#${n}: gộp main vào nhánh`); } }
    }
    if (now - Date.parse(pr.createdAt) > STUCK_H * 3600e3 && !(d.act === 'merge' && !ready.includes(n))) stuck.push({ n, age: Math.round((now - Date.parse(pr.createdAt)) / 3600e3), reason: stuckReason(pr, d) });
  }
  const tallyR = tally([...prev, ...events], now), body = renderIssue({ busy: m.busy, queued: m.queued, tallyR, stuck, ready, ts, dry, canMerge: !!mergeToken });
  const head = `busy ${m.busy}/${TOTAL} · queued ${m.queued} · PR mở ${prs.length} · ngân sách nạp việc ${budget(m.busy)}`;
  const md = `### ci-autopilot\n${head}\n${log.map(l => '- ' + l).join('\n') || '- không có hành động'}\n\n${body.replace(/<!--.*?-->/s, '')}`;
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); console.log(md);
  if (!dry) {
    if (issue) await call(token, 'PATCH', `/repos/${REPO}/issues/${issue.number}`, { body });
    else {
      const c = await call(token, 'POST', `/repos/${REPO}/issues`, { title: ISSUE_TITLE, body, labels: [ISSUE_LABEL] });
      if (c.body?.node_id) await call(token, 'POST', '/graphql', { query: 'mutation($i:ID!){pinIssue(input:{issueId:$i}){issue{number}}}', variables: { i: c.body.node_id } });
    }
  }
  console.log(`RESULT merged=${events.filter(e => e.k === 'merge').length} updated=${events.filter(e => e.k === 'update').length} rerun=${events.filter(e => e.k === 'rerun').length} ready=${ready.length} stuck=${stuck.length}`);
}
async function listOne(token, n) {
  const r = (await call(token, 'GET', `/repos/${REPO}/pulls/${n}`)).body; if (!r) return null;
  const st = (await call(token, 'GET', `/repos/${REPO}/commits/${r.head.sha}/status`)).body?.statuses?.find(s => s.context === 'required-gate');
  return { draft: r.draft, labels: r.labels.map(l => l.name), mergeable: r.mergeable === false ? 'CONFLICTING' : r.mergeable ? 'MERGEABLE' : 'UNKNOWN', gate: st ? st.state.toUpperCase() : null, behind: 0, sha: r.head.sha };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { execFileSync } = await import('node:child_process');
  if (!process.argv.includes('--dry')) for (const [k, v] of [['user.name', 'Lexkite CI'], ['user.email', 'lexkiteapp@users.noreply.github.com']]) execFileSync('git', ['config', k, v]);
  main().catch(e => { console.log(`::error::ci-autopilot: ${e.message}`); process.exitCode = 1; });
}
