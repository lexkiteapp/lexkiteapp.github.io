#!/usr/bin/env node
/* Tự phân loại workflow đỏ (ci-triage.yml) – thay cho hàng loạt thư "Run failed" của GitHub.
 *   node scripts/ci/triage.mjs scan    ← cron 10 phút: mọi lượt đỏ (không phải PR) kết thúc từ lượt quét trước (thay workflow_run của mọi workflow, 2/11)
 *   node scripts/ci/triage.mjs run     ← gỡ lỗi tay 1 lượt (payload workflow_run ở $GITHUB_EVENT_PATH)
 *   node scripts/ci/triage.mjs sweep   ← cron mỗi giờ: đóng issue khi workflow xanh lại; mỗi 4 giờ (buổi sáng UTC thêm chạy lại hạn mức, thư): chạy lại lượt hoãn vì hạn mức + bản tin ngày
 * Phân loại theo log của các job lỗi:
 *   quota     – 429 quota-guard / d1-budget / D1 hết hạn mức ngày → không làm gì, lượt quét sau 00:10 UTC (hạn mức đặt lại) chạy lại lượt mới nhất 1 lần
 *   transient – 5xx/mạng/Google/AI tạm hỏng → đủ TRIAGE_DELAY giây sau khi đỏ (lượt quét kế tiếp, không ngủ giữ runner) thì "Re-run failed jobs" 1 lần (chỉ khi run_attempt = 1 → không bao giờ lặp;
 *               không bao giờ chạy lại lượt đã bị thay thế: có lượt mới hơn hoặc workflow/script của nó đã đổi – supersededWhy)
 *   real      – còn lại (hoặc tạm thời nhưng đã chạy lại vẫn đỏ) → mở/cập nhật 1 issue / workflow (nhãn ci-failure, trích log); sửa thân issue, không bình luận
 * Bản tin: tóm tắt job + cảnh báo Quản trị (op ext_alert kind 'ci' của /api/drive) + 1 thư/ngày (khi có đỏ). Không đụng _d1guard/coordinator/footage-archive. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isQuota } from './quota-skip.mjs';

export const LABEL = 'ci-failure';
const REAL_RE = /AssertionError|SyntaxError|TypeError|ReferenceError|ModuleNotFoundError|ImportError|Cannot find module|ERR_MODULE_NOT_FOUND|Permission denied \(publickey\)|cannot pull with rebase|unstaged changes|npm ERR!|not ok \d|✗ [^\n]*(horizontal overflow|vi-lint)|thiếu secret|Invalid workflow file|No such file or directory|command not found|Unexpected token|is not defined|is not a function/;
const TRANSIENT_RE = /Error on ZipFile|→ 5\d\d\b|HTTP (Error )?5\d\d|\b50[234]\b[^\n]{0,30}(Gateway|Unavailable)|Internal Server Error|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|socket hang up|fetch failed|Name or service not known|Could not resolve host|TLS handshake|Connection reset|timed out|Timeout|rate limit|secondary rate|too-fast|\b429\b|google-network|unavailable|lost communication with the server|The runner has received a shutdown signal|Unable to download artifact|Failed to download action|RPC failed|early EOF/i;
const strip = l => l.replace(/^\d{4}-\d\d-\d\dT[\d:.]+Z ?/, '');
export const scrubLog = s => String(s).replace(/\b(gh[pousr]_\w{20,}|github_pat_\w{20,}|x-access-token:[^@\s]+|eyJ[\w-]{10,}\.[\w-]+\.[\w-]+|sk-[\w-]{16,}|AIza[\w-]{20,})/g, '[secret]').replace(/[^\s@<>"'(),;]+@[^\s@<>"'(),;]+\.[a-z]{2,}/gi, '[email]');

/** → { kind: 'quota'|'transient'|'real', why } (thuần, có test). attempt > 1 + tạm thời = đã chạy lại vẫn đỏ → real. */
export function classify(log, { attempt = 1 } = {}) {
  const t = String(log || '');
  if (isQuota(t)) return { kind: 'quota', why: (t.match(/quota-guard|d1-budget|d1-limit|D1[^\n]{0,60}limit/i) || ['D1'])[0] };
  const real = t.match(REAL_RE), tr = t.match(TRANSIENT_RE);
  if (real) return { kind: 'real', why: real[0] };
  if (tr) return attempt > 1 ? { kind: 'real', why: `tạm thời nhưng chạy lại vẫn đỏ (${tr[0]})` } : { kind: 'transient', why: tr[0] };
  return { kind: 'real', why: 'không khớp mẫu tạm thời' };
}

/** Trích ≤ 40 dòng lỗi cuối (bỏ dấu giờ, che bí mật) – cho thân issue (repo công khai). */
export function excerpt(log, max = 40) {
  const lines = String(log || '').split('\n').map(strip).filter(Boolean);
  const hit = lines.filter(l => /##\[error\]|Error|error:|✗|FAIL|Traceback|fatal:|denied|→ [45]\d\d|exit code/i.test(l) && !/^\s*\[36;1m/.test(l));
  const pick = (hit.length ? hit : lines).slice(-max).map(l => l.slice(0, 300));
  return scrubLog(pick.join('\n')).replace(/```/g, "'''").slice(0, 6000);
}

export const marker = file => `<!-- ci-triage:wf=${file} -->`;
export const STREAK_ALERT = 3;
export const issueTitle = (name, streak = 0) => `CI đỏ: ${name}` + (streak >= STREAK_ALERT ? ` (đỏ ${streak} lượt liền)` : '');
/** Số lượt đỏ LIÊN TIẾP mới nhất (thuần, có test) trên cùng nhánh, bỏ PR + huỷ/bỏ qua – 3/11: quality-sweep đỏ 6 đêm liền, issue chỉ ghi "đỏ". */
export function redStreak(runs) {
  let n = 0, since = '';
  for (const r of [...(runs || [])].filter(r => r && r.event !== 'pull_request' && r.status === 'completed' && !['cancelled', 'skipped'].includes(r.conclusion))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))) { if (r.conclusion !== 'failure') break; n++; since = r.created_at; }
  return { n, since };
}
/** Cổng kiểm thử lõi trên main (tên báo cáo → file). Dùng chung: bản tin dưới đây + scripts/world/ci-status.mjs. */
export const CORE_TESTS = { 'npm-test': 'ci.yml', 'visual-qa': 'visual-qa.yml', 'new-ui-qa': 'new-ui-qa.yml', 'mobile-qa': 'mobile-qa.yml', 'journey-e2e': 'journey-e2e.yml', 'stitch-quality-qc': 'stitch-quality-qc.yml', 'ext-e2e': 'ext-e2e.yml', 'native-auth-e2e': 'native-auth-e2e.yml', 'qa-bot': 'qa-bot.yml' };
/** Sức khỏe cổng lõi (thuần): 4/11 ext-e2e đỏ 8 lượt từ 30/10 mà bản tin không nói, vì bản tin chỉ kể lượt đỏ TRONG 24 h – workflow chạy theo paths, hôm đó không có lượt là biến mất;
 *  còn new-ui-qa chỉ nằm trên nhánh PR nên chưa từng có lượt main. runsByKey: { key → lượt trên main }. Đỏ xếp trước, đỏ lâu nhất trước. */
export function coreHealth(runsByKey, now = Date.now()) {
  const rows = Object.entries(runsByKey || {}).map(([key, runs]) => {
    const st = redStreak(runs), done = (runs || []).filter(r => r && r.event !== 'pull_request' && r.status === 'completed' && !['cancelled', 'skipped'].includes(r.conclusion));
    const days = st.n ? Math.floor((now - new Date(st.since)) / 864e5) : 0;
    return { key, n: st.n, since: st.since, days, state: !done.length ? 'none' : st.n ? 'red' : 'green' };
  });
  const bad = rows.filter(r => r.state !== 'green').sort((a, b) => (a.state === 'red' ? 0 : 1) - (b.state === 'red' ? 0 : 1) || b.days - a.days || b.n - a.n);
  return { rows, bad, lines: bad.map(r => (r.state === 'red' ? `- 🔴 ${r.key}: đỏ ${r.n} lượt liền, ${r.days} ngày (từ ${String(r.since).slice(0, 10)})` : `- ⚪ ${r.key}: chưa có lượt nào trên main – cổng đang không canh main`)) };
}
/** Issue ci-failure của workflow đã xóa khỏi repo: không bao giờ xanh lại nên không bao giờ tự đóng → rác che tín hiệu thật. Trả file nếu issue thuộc loại đó (thuần). */
export function orphanIssueFile(body, wfExists) { const m = String(body || '').match(/ci-triage:wf=([\w.-]+)/); return m && !wfExists(m[1]) ? m[1] : null; }
export function issueBody({ name, file, run, cls, log, streak }) {
  return `${marker(file)}\nWorkflow **${name}** (\`${file}\`) đỏ – ci-triage xếp loại **${cls.kind}** (${cls.why}).\n\n` +
    (streak && streak.n >= 2 ? `- ${streak.n >= STREAK_ALERT ? '🔥' : '🔁'} Đỏ **${streak.n} lượt liên tiếp** trên ${run.head_branch || 'main'} (từ ${String(streak.since).slice(0, 16)}Z)${streak.n >= STREAK_ALERT ? ' – lỗi lặp lại, không phải nhiễu: cần người sửa gốc' : ''}\n` : '') +
    `- Lượt mới nhất: ${run.html_url} (attempt ${run.run_attempt || 1}, sự kiện ${run.event}, ${run.updated_at || run.created_at})\n` +
    `- Issue tự đóng khi workflow xanh lại (ci-triage quét mỗi giờ). Thân issue được cập nhật tại chỗ, không bình luận → không thêm thư.\n\n` +
    '```\n' + excerpt(log) + '\n```\n';
}

/** Bản tin ngày (thuần). runs = lượt failure 24 h, latest = {name → conclusion mới nhất}, issues = issue ci-failure đang mở. */
export function videoLine(v) { // owner 23/10: video pipeline in the daily digest (news-auto ledger summary, scripts/cine/news_auto.py summary)
  if (!v) return '- Video: chưa có lượt news-auto trong 24 h (tự động tắt cho tới khi chủ duyệt mẫu).';
  const g = Object.entries(v.failed_by_gate || {}).map(([k, n]) => `${k} ${n}`).join(', ');
  return `- Video 24 h: dựng ${v.rendered || 0} · đạt ${v.passed || 0} · trượt ${v.failed || 0} · bỏ trước dựng ${v.dropped || 0}${g ? ` (cổng: ${g})` : ''} · chờ duyệt ${v.pending_approval || 0} · đã duyệt ${v.approved || 0}`;
}
// Bản tin chạy theo lượt quét có thật (lịch GitHub rớt giờ 00 UTC: cờ ci kẹt từ 27/10 tới 4/11). Thư vẫn chỉ buổi sáng, server chặn ≤ 1 thư/20 h.
export const digestDue = (now, force) => !!force || now.getUTCHours() % 4 === 0;
export const morning = (now, force) => !!force || now.getUTCHours() < 8;
// Cờ "workflow đỏ" đo sức khoẻ main: lượt đỏ của PR/nhánh thuộc về PR đó, không tính.
export const mainRuns = runs => runs.filter(r => r.head_branch === 'main' && !/^pull_request/.test(r.event || '') && r.name !== 'ci-triage');
export function digest(runs, latest, issues, video, core) {
  const by = {}; for (const r of runs) (by[r.name] = by[r.name] || []).push(r);
  const names = Object.keys(by).sort((a, b) => by[b].length - by[a].length);
  const red = names.filter(n => latest[n] === 'failure');
  const lines = names.map(n => `- ${n}: ${by[n].length} lượt đỏ · hiện ${latest[n] === 'failure' ? '🔴 vẫn đỏ' : latest[n] === 'success' ? '🟢 đã xanh' : (latest[n] || '?')}`);
  const iss = issues.map(i => `- #${i.number} ${i.title} – ${i.html_url}`);
  const msg0 = names.length ? `${runs.length} lượt đỏ ở ${names.length} workflow, ${red.length} còn đỏ` : 'không có workflow đỏ';
  // Cổng lõi đỏ/chưa chạy luôn đứng đầu bản tin và luôn gửi thư, kể cả khi 24 h qua không có lượt nào của nó
  const coreBad = (core && core.bad) || [], coreRed = coreBad.filter(b => b.state === 'red' && !red.includes(b.key)).length;
  const msg = coreBad.length ? `${coreBad.length} cổng kiểm thử lõi chưa xanh (nặng nhất ${coreBad[0].key}${coreBad[0].state === 'red' ? ` ${coreBad[0].days} ngày` : ''}) · ${msg0}` : msg0;
  const coreT = coreBad.length ? `Cổng kiểm thử lõi chưa xanh (đỏ lâu nhất trước):\n${core.lines.join('\n')}\n\n` : '', coreM = coreBad.length ? `### 🚨 Cổng kiểm thử lõi chưa xanh\n${core.lines.join('\n')}\n\n` : '';
  const text = `Bản tin CI 24 h (${new Date().toISOString().slice(0, 16)}Z): ${msg}.\n\n${coreT}${lines.join('\n') || '- (trống)'}\n\nIssue ci-failure đang mở:\n${iss.join('\n') || '- (không có)'}\n\n` +
    'Lỗi hạn mức D1 (quota-guard) giờ là bỏ qua trung tính; lỗi tạm thời được chạy lại 1 lần; lỗi thật → issue. Tắt thư từng lượt: GitHub → Settings → Notifications → Actions → "Only notify for failed workflows" hoặc bỏ chọn Email.';
  const vl = video === undefined ? '' : videoLine(video);
  return { msg, text: vl ? `${text}\n\nPipeline video:\n${vl}` : text, red: red.length + coreRed, failed: names.length + coreBad.length, md: `## 🧾 Bản tin CI 24 h\n${msg}\n\n${coreM}${lines.join('\n')}\n\n### Issue ci-failure\n${iss.join('\n') || '- (không có)'}\n${vl ? `\n### Pipeline video\n${vl}\n` : ''}` };
}

async function videoSummary(now) { // latest news-auto run (24 h) -> artifact video-summary-<run> (news_auto.py summary json)
  const runs = (((await gh(`/actions/workflows/news-auto.yml/runs?per_page=5`)) || {}).workflow_runs || []).filter(r => r.status === 'completed' && new Date(r.created_at) > now - 26 * 3600e3);
  for (const r of runs) {
    const a = (((await gh(`/actions/runs/${r.id}/artifacts`)) || {}).artifacts || []).find(x => x.name.startsWith('video-summary'));
    if (!a) continue;
    const z = await fetch(a.archive_download_url, { headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN }, redirect: 'follow', signal: AbortSignal.timeout(30e3) });
    if (!z.ok) continue;
    const { execFileSync } = await import('child_process'); const fs = await import('fs'); const f = `${process.env.RUNNER_TEMP || '/tmp'}/vs-${r.id}.zip`;
    fs.writeFileSync(f, Buffer.from(await z.arrayBuffer())); return JSON.parse(execFileSync('unzip', ['-p', f, 'summary.json'], { timeout: 20e3 }).toString());
  }
  return null;
}
// ---------- GitHub API ----------
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com') + '/repos/' + REPO;
async function gh(path, { method = 'GET', body, raw = false, accept, fetcher = fetch } = {}) {
  const r = await fetcher(path.startsWith('http') ? path : API + path, { method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: accept === 'raw' ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'lexkite-ci-triage', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok && r.status !== 404) throw new Error(`GitHub ${method} ${path.slice(0, 80)} → ${r.status}${[401, 403, 409].includes(r.status) ? ' ' + String(await r.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 140) : ''}`);   // 06/11: 403/409 của DELETE/cancel không kèm lý do → không biết vì sao 17 lượt không gỡ được
  if (r.status === 404) return null;
  return raw ? r.text() : r.status === 204 ? {} : r.json().catch(() => ({}));
}
async function failedLog(runId) {
  const jobs = ((await gh(`/actions/runs/${runId}/jobs?per_page=100`)) || {}).jobs || [];
  let out = '';
  for (const j of jobs.filter(x => x.conclusion === 'failure').slice(0, 4)) {
    const t = await gh(`/actions/jobs/${j.id}/logs`, { raw: true }).catch(() => '');
    out += `\n=== job ${j.name}\n` + String(t || '').split('\n').slice(-600).join('\n');
  }
  return out;
}
const summary = md => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); console.log(md); };
async function openIssues() { return ((await gh(`/issues?state=open&labels=${LABEL}&per_page=100`)) || []).filter(i => !i.pull_request); }
async function ensureLabel() { if (!(await gh(`/labels/${LABEL}`))) await gh('/labels', { method: 'POST', body: { name: LABEL, color: 'b60205', description: 'Workflow đỏ thật – ci-triage tự mở/đóng' } }).catch(() => {}); }

async function upsertIssue(run, cls, log) {
  const file = String(run.path || '').replace(/^\.github\/workflows\//, '').replace(/@.*$/, '');
  const br = encodeURIComponent(run.head_branch || 'main'), streak = redStreak((((await gh(`/actions/workflows/${run.workflow_id}/runs?branch=${br}&per_page=20`).catch(() => null)) || {}).workflow_runs) || []);
  const body = issueBody({ name: run.name, file, run, cls, log, streak });
  const cur = (await openIssues()).find(i => (i.body || '').includes(marker(file)));
  if (cur) { await gh(`/issues/${cur.number}`, { method: 'PATCH', body: { body, title: issueTitle(run.name, streak.n) } }); return `cập nhật #${cur.number}${streak.n >= STREAK_ALERT ? ` (đỏ ${streak.n} lượt liền)` : ''}`; }
  await ensureLabel();
  const i = await gh('/issues', { method: 'POST', body: { title: issueTitle(run.name, streak.n), body, labels: [LABEL] } });
  return `mở #${i && i.number}`;
}

/** Lượt đã bị THAY THẾ thì không bao giờ chạy lại ("Re-run" dùng lại commit cũ → chạy code cũ; 25/10: 2 lượt word-audio cũ bị chạy lại).
 *  Thay thế = có lượt mới hơn của cùng workflow trên cùng nhánh, HOẶC từ commit của lượt tới đầu nhánh đã sửa file workflow,
 *  một script workflow gọi (scripts/… trong file workflow) hay module mà script đó import trực tiếp. Thuần, có test. → lý do hoặc ''. */
export const scriptRefs = wfText => [...new Set(String(wfText).match(/scripts\/[\w./-]+\.(?:mjs|js|cjs|py|sh)/g) || [])];
export const importRefs = (file, src) => [...String(src).matchAll(/(?:from\s+|import\s*\(\s*)['"](\.{1,2}\/[\w./-]+)['"]/g)].map(m => {
  const parts = file.split('/').slice(0, -1); for (const x of m[1].split('/')) x === '..' ? parts.pop() : x !== '.' && parts.push(x); return parts.join('/'); });
export function supersededWhy(run, { newer = [], changed = [], refs = [] } = {}) {
  const n = newer.find(r => r.id !== run.id && new Date(r.created_at) > new Date(run.created_at));
  if (n) return `có lượt mới hơn #${n.run_number || n.id}`;
  const watch = new Set([run.path, ...refs]), hit = changed.find(f => watch.has(f));
  return hit ? `code đã đổi sau lượt này (${hit})` : '';
}
async function superseded(run) {
  const br = encodeURIComponent(run.head_branch || 'main'), raw = async f => (await gh(`/contents/${f}?ref=${br}`, { raw: true, accept: 'raw' }).catch(() => '')) || '';
  const newer = (((await gh(`/actions/workflows/${run.workflow_id}/runs?branch=${br}&per_page=10`)) || {}).workflow_runs) || [];
  const cmp = (await gh(`/compare/${run.head_sha}...${br}`)) || {}, changed = (cmp.files || []).map(f => f.filename);
  if (changed.length >= 300) return 'quá nhiều thay đổi từ lượt này (≥ 300 file)';
  const refs = scriptRefs(await raw(run.path));
  for (const f of refs.slice(0, 15)) refs.push(...importRefs(f, await raw(f)));
  return supersededWhy(run, { newer, changed, refs });
}

/** Lượt đỏ cần triage trong cửa sổ quét (thuần, có test): failure, không phải PR (người mở PR lo), không phải chính ci-triage,
 *  kết thúc từ `since`. Sắp cũ → mới để issue giữ lượt mới nhất. */
export function pickFailures(runs, since) {
  const t = new Date(since).getTime();
  return (runs || []).filter(r => r && r.conclusion === 'failure' && r.event !== 'pull_request' && r.name !== 'ci-triage' && new Date(r.updated_at || r.created_at).getTime() >= t)
    .sort((a, b) => new Date(a.updated_at || a.created_at) - new Date(b.updated_at || b.created_at));
}
/** Mốc bắt đầu quét (thuần): lượt ci-triage thành công trước đó − (độ trễ chạy lại + 3 phút chồng lấn), không xa hơn 3 giờ.
 *  Chồng lấn an toàn vì mọi xử lý đều lũy đẳng (issue sửa tại chỗ; chạy lại chỉ khi attempt = 1). */
export function scanSince(prevStartedAt, now, delaySec) {
  const floor = now - 3 * 3600e3, p = prevStartedAt ? new Date(prevStartedAt).getTime() - (delaySec + 180) * 1e3 : floor;
  return new Date(Math.max(floor, Math.min(p, now))).toISOString();
}

/** Xử lý 1 lượt đỏ. Tạm thời: chỉ chạy lại khi đã qua TRIAGE_DELAY kể từ lúc đỏ (không giữ runner ngủ chờ – lượt quét sau làm tiếp). */
async function handleRun(run, { now = Date.now(), delay = 300 } = {}) {
  const log = await failedLog(run.id), cls = classify(log, { attempt: run.run_attempt || 1 });
  let act;
  if (cls.kind === 'quota') act = 'hạn mức D1 → hoãn: lượt quét sau 00:10 UTC chạy lại lượt mới nhất (1 lần)';
  else if (cls.kind === 'transient') {
    const age = (now - new Date(run.updated_at || run.created_at).getTime()) / 1e3;
    if (age < delay) act = `tạm thời – đợi đủ ${delay}s (mới ${Math.round(age)}s), lượt quét sau chạy lại`;
    else {
      const cur = await gh(`/actions/runs/${run.id}`);
      const sup = await superseded(run).catch(e => `không kiểm được (${e.message}) – an toàn: không chạy lại`);
      if (cur && (cur.run_attempt || 1) > 1) act = 'đã có người chạy lại – bỏ qua';
      else if (sup) act = `không chạy lại: lượt đã bị thay thế – ${sup}`;
      else { await gh(`/actions/runs/${run.id}/rerun-failed-jobs`, { method: 'POST' }); act = 'đã chạy lại các job lỗi (lần duy nhất)'; }
    }
  } else act = await upsertIssue(run, cls, log);
  summary(`### ci-triage: ${run.name} #${run.run_number} (attempt ${run.run_attempt})\n- Loại: **${cls.kind}** – ${cls.why}\n- Xử lý: ${act}\n- ${run.html_url}`);
}

/** Quét định kỳ (cron 10 phút) thay cho workflow_run của MỌI workflow: trước 2/11 mỗi lượt workflow xong sinh 1 lượt ci-triage
 *  (~3.400 lượt/ngày, 93 % bị bỏ qua) và lượt đỏ giữ runner ngủ 5 phút. Giờ: 1 lượt/10 phút phủ mọi workflow, kể cả workflow mới. */
async function scan() {
  const now = Date.now(), delay = Math.max(0, Math.min(1800, +(process.env.TRIAGE_DELAY ?? 300)));
  const prev = ((((await gh('/actions/workflows/ci-triage.yml/runs?status=success&per_page=3')) || {}).workflow_runs) || [])
    .find(r => String(r.id) !== String(process.env.GITHUB_RUN_ID || ''));
  const since = scanSince(prev && (prev.run_started_at || prev.created_at), now, delay);
  const created = new Date(now - 24 * 3600e3).toISOString().slice(0, 19) + 'Z';
  const runs = [];
  for (let page = 1; page <= 3; page++) {
    const d = await gh(`/actions/runs?status=failure&created=%3E%3D${created}&per_page=100&page=${page}`);
    if (!d || !Array.isArray(d.workflow_runs)) throw new Error('không liệt kê được lượt đỏ');
    const w = d.workflow_runs;
    runs.push(...w); if (w.length < 100) break;
  }
  const todo = pickFailures(runs, since);
  summary(`Quét lượt đỏ từ ${since}: ${todo.length} lượt (trong ${runs.length} lượt đỏ 24 h).`);
  for (const r of todo) await handleRun(r, { now, delay }).catch(e => console.log(`::warning::triage ${r.name} #${r.run_number}: ${e.message}`));
}

async function onRun() { // dùng tay: GITHUB_EVENT_PATH chứa payload workflow_run (giữ để gỡ lỗi 1 lượt)
  const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')), run = ev.workflow_run;
  if (!run || run.conclusion !== 'failure') return summary('Không phải lượt đỏ – bỏ qua.');
  if (run.event === 'pull_request') return summary('Lượt PR – để người mở PR xử lý.');
  return handleRun(run, { delay: 0 });
}

async function sweep() {
  const now = new Date(), force = process.env.TRIAGE_FORCE_DAILY === '1';
  // 1) đóng issue khi workflow xanh lại
  const issues = await openIssues();
  for (const i of issues) {
    const m = (i.body || '').match(/ci-triage:wf=([\w.-]+)/); if (!m) continue;
    const runs = ((await gh(`/actions/workflows/${m[1]}/runs?status=completed&per_page=5`)) || {}).workflow_runs || [];
    const last = runs.find(r => ['success', 'failure'].includes(r.conclusion));
    if (last && last.conclusion === 'success' && new Date(last.updated_at) > new Date(i.updated_at) - 60e3) {
      await gh(`/issues/${i.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'completed', body: (i.body || '') + `\n\n✅ Xanh lại: ${last.html_url} (ci-triage tự đóng ${now.toISOString().slice(0, 16)}Z)` } });
      summary(`- Đóng #${i.number} (${m[1]} xanh lại)`);
    }
  }
  // 1a) issue của workflow đã xóa: đóng (không bao giờ xanh lại được). Chỉ khi thấy được thư mục workflow (checkout thưa của ci-triage có .github/workflows)
  if (fs.existsSync('.github/workflows')) for (const i of issues) {
    const f = orphanIssueFile(i.body, x => fs.existsSync(`.github/workflows/${x}`)); if (!f) continue;
    await gh(`/issues/${i.number}`, { method: 'PATCH', body: { state: 'closed', state_reason: 'not_planned', body: (i.body || '') + `\n\n🗑 Workflow ${f} không còn trong repo (ci-triage tự đóng ${now.toISOString().slice(0, 16)}Z)` } }).catch(e => console.log(e.message));
    summary(`- Đóng #${i.number} (${f} đã xóa)`);
  }
  // 1b) lịch cron không chạy / workflow bị tắt ngoài ý muốn (scripts/ci/cron-watch.mjs) – mỗi giờ
  try { const cw = await import('./cron-watch.mjs'), r = await cw.cronWatch(gh, { now: +now }); summary(r.md); summary(`- Issue lịch cron: ${await cw.syncIssue(gh, r, LABEL)}`); if (r.bad.length) console.log(`::error::${r.bad.length} workflow lịch không chạy: ${r.bad.map(b => b.file).join(', ')}`); }
  catch (e) { console.log('::warning::cron-watch: ' + e.message); }
  // 1c) cùng 1 check đỏ trên ≥ 3 PR mở = gốc chung ở main/workflow (scripts/ci/pr-common-red.mjs) – 3 giờ/lần (~50 lượt API) + bản tin ngày
  let common = null;
  if (now.getUTCHours() % 3 === 0 || force) try { const pc = await import('./pr-common-red.mjs'); common = pc.commonRed(await pc.scanPrs(gh)); summary(common.md); summary(`- Issue check đỏ chung: ${await pc.syncIssue(gh, common, LABEL)}`); if (common.groups.length) console.log(`::error::${common.groups.length} check đỏ chung trên PR mở: ${common.groups.map(g => `${g.check} (${g.prs.length})`).join(', ')}`); }
  catch (e) { console.log('::warning::pr-common-red: ' + e.message); }
  // 1c) workflow tốn runner bất thường (scripts/ci/ci-hog.mjs) – mỗi 3 giờ: ~12–40 lệnh API (hạn mức GITHUB_TOKEN dùng chung với required-gate)
  if (now.getUTCHours() % 3 === 0 || force) try {
    const h = await import('./ci-hog.mjs'), r = h.hogReport(await h.fetchRuns(gh, +now), h.shardedNames());
    summary(r.md); summary(`- Issue runner: ${await h.syncIssue(gh, r, LABEL)}`);
    if (r.bad.length) console.log(`::error::${r.bad.length} workflow tốn runner bất thường: ${r.bad.map(b => b.name).join(', ')}`);
    if (process.env.LEXKITE_DRIVE_CLI_KEY) { const { driveApi } = await import('../video/library.mjs'); await driveApi('ext_alert', { kind: 'ci_hog', ok: !r.bad.length, n: Math.max(1, r.bad.length), msg: r.bad.map(b => `${b.name}: ${b.why}`).join(' · ').slice(0, 300), repo: REPO }); }
  } catch (e) { console.log('::warning::ci-hog: ' + e.message); }
  // 1d) issue ci-failure > 12 giờ chưa có PR liên kết → p0 (scripts/ci/guards.mjs stale-ci) – mỗi giờ, 2 lệnh API + 2/issue mới quá hạn
  let stale = null;
  try { stale = await (await import('./guards.mjs')).staleCiRun(gh, +now); summary(stale.md); if (stale.n) console.log(`::error::${stale.text}`); }
  catch (e) { console.log('::warning::stale-ci: ' + e.message); }
  if (!digestDue(now, force)) return summary('Quét giờ: xong (bản tin chạy mỗi 4 giờ).');
  // 2) lượt hoãn vì hạn mức: sau 00:10 UTC (hạn mức D1 đã đặt lại) chạy lại lượt đỏ MỚI NHẤT của mỗi workflow – 1 lần (attempt 1), bỏ nếu đã có lượt mới hơn
  const since = new Date(now - 26 * 3600e3).toISOString().slice(0, 19) + 'Z';
  const failed = ((await gh(`/actions/runs?status=failure&created=%3E%3D${since}&per_page=100`)) || {}).workflow_runs || [];
  const newest = {}; for (const r of failed) if (!newest[r.workflow_id] || r.created_at > newest[r.workflow_id].created_at) newest[r.workflow_id] = r;
  const latest = {};
  if (morning(now, force)) for (const r of Object.values(newest)) {
    const last = (((await gh(`/actions/workflows/${r.workflow_id}/runs?per_page=1`)) || {}).workflow_runs || [])[0];
    latest[r.name] = last ? (last.conclusion || last.status) : 'failure';
    if (!last || last.id !== r.id || (r.run_attempt || 1) > 1 || r.name === 'ci-triage') continue;
    const cls = classify(await failedLog(r.id), { attempt: 1 });
    const sup = cls.kind === 'quota' && await superseded(r).catch(e => `không kiểm được (${e.message})`);
    if (sup) { summary(`- Không chạy lại ${r.name} (đã bị thay thế – ${sup}) ${r.html_url}`); continue; }
    if (cls.kind === 'quota') { await gh(`/actions/runs/${r.id}/rerun-failed-jobs`, { method: 'POST' }).catch(e => console.log(e.message)); summary(`- Chạy lại (hạn mức đã đặt lại): ${r.name} ${r.html_url}`); }
  }
  // 3) bản tin ngày → tóm tắt job + cảnh báo Quản trị + 1 thư/ngày (chỉ khi có đỏ)
  const dayStart = new Date(now - 24 * 3600e3).toISOString(), day = mainRuns(((await gh(`/actions/runs?status=failure&branch=main&created=%3E%3D${dayStart.slice(0, 19)}Z&per_page=100`)) || {}).workflow_runs || []);
  const latestMain = {}; for (const id of new Set(day.map(r => r.workflow_id))) { const r0 = day.find(r => r.workflow_id === id), last = (((await gh(`/actions/workflows/${id}/runs?branch=main&per_page=1`)) || {}).workflow_runs || [])[0]; latestMain[r0.name] = last ? (last.conclusion || last.status) : 'failure'; }
  const coreRuns = {}; for (const [k, f] of Object.entries(CORE_TESTS)) coreRuns[k] = ((await gh(`/actions/workflows/${f}/runs?branch=main&status=completed&per_page=30`).catch(() => null)) || {}).workflow_runs || [];
  const d = digest(day, latestMain, await openIssues(), await videoSummary(now).catch(e => { console.log('video summary:', e.message); return null; }), coreHealth(coreRuns, +now));
  // 4) runner 24 h (ci-filler): TB/đỉnh theo giờ + phút-runner rảnh khi còn tồn đọng (KPI → ~0)
  try { const f = await import('./filler.mjs'), u = f.report(await f.readLog()); d.md += '\n' + u.md; d.text += `\n\nRunner 24 h: ${u.msg}`; } catch (e) { console.log('runner report:', e.message); }
  if (common) { d.md += '\n' + common.md; d.text += `\n\nPR mở – ${common.text}`; }
  if (stale && stale.n) { d.md += '\n' + stale.md; d.text += `\n\n${stale.text}`; }
  summary(d.md);
  if (!process.env.LEXKITE_DRIVE_CLI_KEY) return console.log('Không có LEXKITE_DRIVE_CLI_KEY – chỉ ghi tóm tắt job.');
  try {
    const { driveApi } = await import('../video/library.mjs');
    const r = await driveApi('ext_alert', { kind: 'ci', ok: d.red === 0, n: Math.max(1, d.red), level: d.red ? (d.red > 2 ? 'crit' : 'warn') : undefined, msg: d.msg, text: d.text, mail: d.failed > 0 && morning(now, force), repo: REPO });
    console.log('Quản trị → cảnh báo ci:', JSON.stringify(r));
  } catch (e) { console.log(`::warning::không ghi được bản tin vào Quản trị (${e.message}) – xem tóm tắt job`); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  (mode === 'scan' ? scan() : mode === 'run' ? onRun() : mode === 'sweep' ? sweep() : Promise.reject(new Error('dùng: triage.mjs scan|sweep|run')))
    .catch(e => { // triage/sweep không tự báo đỏ (tránh thư). Riêng scan hỏng (API liệt kê lỗi) → đỏ để lượt quét sau KHÔNG lấy lượt này làm mốc
      console.log(`::warning::ci-triage lỗi: ${e.message}`); process.exitCode = mode === 'scan' ? 1 : 0; });  // (cửa sổ lùi về lượt xanh trước, ≤ 3 giờ – không mất lượt đỏ nào)
}
