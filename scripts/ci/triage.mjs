#!/usr/bin/env node
/* Tự phân loại workflow đỏ (ci-triage.yml) – thay cho hàng loạt thư "Run failed" của GitHub.
 *   node scripts/ci/triage.mjs run     ← workflow_run completed + failure (payload ở $GITHUB_EVENT_PATH)
 *   node scripts/ci/triage.mjs sweep   ← cron mỗi giờ: đóng issue khi workflow xanh lại; giờ 00 UTC (sau 00:10): chạy lại lượt hoãn vì hạn mức + bản tin ngày
 * Phân loại theo log của các job lỗi:
 *   quota     – 429 quota-guard / d1-budget / D1 hết hạn mức ngày → không làm gì, lượt quét sau 00:10 UTC (hạn mức đặt lại) chạy lại lượt mới nhất 1 lần
 *   transient – 5xx/mạng/Google/AI tạm hỏng → chờ TRIAGE_DELAY giây rồi "Re-run failed jobs" 1 lần (chỉ khi run_attempt = 1 → không bao giờ lặp;
 *               không bao giờ chạy lại lượt đã bị thay thế: có lượt mới hơn hoặc workflow/script của nó đã đổi – supersededWhy)
 *   real      – còn lại (hoặc tạm thời nhưng đã chạy lại vẫn đỏ) → mở/cập nhật 1 issue / workflow (nhãn ci-failure, trích log); sửa thân issue, không bình luận
 * Bản tin: tóm tắt job + cảnh báo Quản trị (op ext_alert kind 'ci' của /api/drive) + 1 thư/ngày (khi có đỏ). Không đụng _d1guard/coordinator/footage-archive. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isQuota } from './quota-skip.mjs';

export const LABEL = 'ci-failure';
const REAL_RE = /AssertionError|SyntaxError|TypeError|ReferenceError|ModuleNotFoundError|ImportError|Cannot find module|ERR_MODULE_NOT_FOUND|Permission denied \(publickey\)|cannot pull with rebase|unstaged changes|npm ERR!|not ok \d|✗ [^\n]*(horizontal overflow|vi-lint)|thiếu secret|Invalid workflow file|No such file or directory|command not found|Unexpected token|is not defined|is not a function/;
const TRANSIENT_RE = /→ 5\d\d\b|HTTP (Error )?5\d\d|\b50[234]\b[^\n]{0,30}(Gateway|Unavailable)|Internal Server Error|ETIMEDOUT|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ENOTFOUND|socket hang up|fetch failed|Name or service not known|Could not resolve host|TLS handshake|Connection reset|timed out|Timeout|rate limit|secondary rate|too-fast|\b429\b|google-network|unavailable|lost communication with the server|The runner has received a shutdown signal|Unable to download artifact|Failed to download action|RPC failed|early EOF/i;
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
export const issueTitle = name => `CI đỏ: ${name}`;
export function issueBody({ name, file, run, cls, log }) {
  return `${marker(file)}\nWorkflow **${name}** (\`${file}\`) đỏ – ci-triage xếp loại **${cls.kind}** (${cls.why}).\n\n` +
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
export function digest(runs, latest, issues, video) {
  const by = {}; for (const r of runs) (by[r.name] = by[r.name] || []).push(r);
  const names = Object.keys(by).sort((a, b) => by[b].length - by[a].length);
  const red = names.filter(n => latest[n] === 'failure');
  const lines = names.map(n => `- ${n}: ${by[n].length} lượt đỏ · hiện ${latest[n] === 'failure' ? '🔴 vẫn đỏ' : latest[n] === 'success' ? '🟢 đã xanh' : (latest[n] || '?')}`);
  const iss = issues.map(i => `- #${i.number} ${i.title} – ${i.html_url}`);
  const msg = names.length ? `${runs.length} lượt đỏ ở ${names.length} workflow, ${red.length} còn đỏ` : 'không có workflow đỏ';
  const text = `Bản tin CI 24 h (${new Date().toISOString().slice(0, 16)}Z): ${msg}.\n\n${lines.join('\n') || '- (trống)'}\n\nIssue ci-failure đang mở:\n${iss.join('\n') || '- (không có)'}\n\n` +
    'Lỗi hạn mức D1 (quota-guard) giờ là bỏ qua trung tính; lỗi tạm thời được chạy lại 1 lần; lỗi thật → issue. Tắt thư từng lượt: GitHub → Settings → Notifications → Actions → "Only notify for failed workflows" hoặc bỏ chọn Email.';
  const vl = video === undefined ? '' : videoLine(video);
  return { msg, text: vl ? `${text}\n\nPipeline video:\n${vl}` : text, red: red.length, failed: names.length, md: `## 🧾 Bản tin CI 24 h\n${msg}\n\n${lines.join('\n')}\n\n### Issue ci-failure\n${iss.join('\n') || '- (không có)'}\n${vl ? `\n### Pipeline video\n${vl}\n` : ''}` };
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
  if (!r.ok && r.status !== 404) throw new Error(`GitHub ${method} ${path.slice(0, 80)} → ${r.status}`);
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
  const file = String(run.path || '').replace(/^\.github\/workflows\//, '').replace(/@.*$/, ''), body = issueBody({ name: run.name, file, run, cls, log });
  const cur = (await openIssues()).find(i => (i.body || '').includes(marker(file)));
  if (cur) { await gh(`/issues/${cur.number}`, { method: 'PATCH', body: { body } }); return `cập nhật #${cur.number}`; }
  await ensureLabel();
  const i = await gh('/issues', { method: 'POST', body: { title: issueTitle(run.name), body, labels: [LABEL] } });
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

async function onRun() {
  const ev = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8')), run = ev.workflow_run;
  if (!run || run.conclusion !== 'failure') return summary('Không phải lượt đỏ – bỏ qua.');
  if (run.event === 'pull_request') return summary('Lượt PR – để người mở PR xử lý.');
  const log = await failedLog(run.id), cls = classify(log, { attempt: run.run_attempt || 1 });
  let act;
  if (cls.kind === 'quota') act = 'hạn mức D1 → hoãn: lượt quét sau 00:10 UTC chạy lại lượt mới nhất (1 lần)';
  else if (cls.kind === 'transient') {
    const d = Math.max(0, Math.min(1800, +(process.env.TRIAGE_DELAY ?? 300)));
    console.log(`tạm thời (${cls.why}) → chờ ${d}s rồi chạy lại 1 lần`); await new Promise(r => setTimeout(r, d * 1000));
    const now = await gh(`/actions/runs/${run.id}`);
    const sup = await superseded(run).catch(e => `không kiểm được (${e.message}) – an toàn: không chạy lại`);
    if (now && (now.run_attempt || 1) > 1) act = 'đã có người chạy lại – bỏ qua';
    else if (sup) act = `không chạy lại: lượt đã bị thay thế – ${sup}`;
    else { await gh(`/actions/runs/${run.id}/rerun-failed-jobs`, { method: 'POST' }); act = 'đã chạy lại các job lỗi (lần duy nhất)'; }
  } else act = await upsertIssue(run, cls, log);
  summary(`### ci-triage: ${run.name} #${run.run_number} (attempt ${run.run_attempt})\n- Loại: **${cls.kind}** – ${cls.why}\n- Xử lý: ${act}\n- ${run.html_url}`);
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
  if (now.getUTCHours() !== 0 && !force) return summary('Quét giờ: xong (hoãn hạn mức + bản tin chỉ chạy ở giờ 00 UTC).');
  // 2) lượt hoãn vì hạn mức: sau 00:10 UTC (hạn mức D1 đã đặt lại) chạy lại lượt đỏ MỚI NHẤT của mỗi workflow – 1 lần (attempt 1), bỏ nếu đã có lượt mới hơn
  const since = new Date(now - 26 * 3600e3).toISOString().slice(0, 19) + 'Z';
  const failed = ((await gh(`/actions/runs?status=failure&created=%3E%3D${since}&per_page=100`)) || {}).workflow_runs || [];
  const newest = {}; for (const r of failed) if (!newest[r.workflow_id] || r.created_at > newest[r.workflow_id].created_at) newest[r.workflow_id] = r;
  const latest = {};
  for (const r of Object.values(newest)) {
    const last = (((await gh(`/actions/workflows/${r.workflow_id}/runs?per_page=1`)) || {}).workflow_runs || [])[0];
    latest[r.name] = last ? (last.conclusion || last.status) : 'failure';
    if (!last || last.id !== r.id || (r.run_attempt || 1) > 1 || r.name === 'ci-triage') continue;
    const cls = classify(await failedLog(r.id), { attempt: 1 });
    const sup = cls.kind === 'quota' && await superseded(r).catch(e => `không kiểm được (${e.message})`);
    if (sup) { summary(`- Không chạy lại ${r.name} (đã bị thay thế – ${sup}) ${r.html_url}`); continue; }
    if (cls.kind === 'quota') { await gh(`/actions/runs/${r.id}/rerun-failed-jobs`, { method: 'POST' }).catch(e => console.log(e.message)); summary(`- Chạy lại (hạn mức đã đặt lại): ${r.name} ${r.html_url}`); }
  }
  // 3) bản tin ngày → tóm tắt job + cảnh báo Quản trị + 1 thư/ngày (chỉ khi có đỏ)
  const day = failed.filter(r => r.created_at >= new Date(now - 24 * 3600e3).toISOString() && r.name !== 'ci-triage');
  const d = digest(day, latest, await openIssues(), await videoSummary(now).catch(e => { console.log('video summary:', e.message); return null; }));
  summary(d.md);
  if (!process.env.LEXKITE_DRIVE_CLI_KEY) return console.log('Không có LEXKITE_DRIVE_CLI_KEY – chỉ ghi tóm tắt job.');
  try {
    const { driveApi } = await import('../video/library.mjs');
    const r = await driveApi('ext_alert', { kind: 'ci', ok: d.red === 0, n: Math.max(1, d.red), level: d.red ? (d.red > 2 ? 'crit' : 'warn') : undefined, msg: d.msg, text: d.text, mail: d.failed > 0, repo: REPO });
    console.log('Quản trị → cảnh báo ci:', JSON.stringify(r));
  } catch (e) { console.log(`::warning::không ghi được bản tin vào Quản trị (${e.message}) – xem tóm tắt job`); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2];
  (mode === 'run' ? onRun() : mode === 'sweep' ? sweep() : Promise.reject(new Error('dùng: triage.mjs run|sweep')))
    .catch(e => { console.log(`::warning::ci-triage lỗi: ${e.message}`); process.exitCode = 0; }); // triage không bao giờ tự báo đỏ (tránh vòng thư)
}
