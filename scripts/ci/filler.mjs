#!/usr/bin/env node
/* Lấp runner rảnh (ci-filler.yml, cron 10 phút): 40 runner (GitHub Pro) – giữ 8 cho PR – phần còn lại chạy việc tồn đọng trong infra/ci-backlog.json.
 *   node scripts/ci/filler.mjs gate     ← đo busy/queued; không còn chỗ hoặc không còn ứng viên → ghi 1 dòng log, xuất free=0 (khỏi checkout đầy đủ)
 *   node scripts/ci/filler.mjs run      ← (checkout đầy đủ) đo lại, dò "xong chưa" từng mục, dispatch, ghi 1 dòng log
 *   node scripts/ci/filler.mjs report   ← báo cáo 24 h (trung bình/đỉnh runner theo giờ + phút-runner rảnh khi còn tồn đọng = KPI, mục tiêu ~0)
 * Luật: busy + queued + shard ≤ 32, không job đói, không check PR đang chờ; shard = min(trần mục, 40 − 8 − busy − queued); không bao giờ dispatch workflow đang có lượt queued/in_progress;
 * mục quota_bound (CF_POOL ảnh, Gemini lexicon) không bao giờ dispatch – thêm runner không giúp gì. Log: nhánh mồ côi ci-stats/util.tsv (48 h).
 * Commit bằng GITHUB_TOKEN không kích workflow nào; thông điệp có [CF-Pages-Skip]. */
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { isZombie } from './zombie.mjs';
import { retry5xx } from '../lib/retry5xx.mjs';

export const SAMPLE_MIN = 10, LOG_BRANCH = 'ci-stats', LOG_FILE = 'util.tsv', KEEP_LINES = 288;
export const loadRegistry = (f = 'infra/ci-backlog.json') => JSON.parse(fs.readFileSync(f, 'utf8'));

/** Chỗ còn cho việc nền (thuần). Chỉ dispatch khi busy + queued + shard mới ≤ total − reserve (32): job đang xếp hàng (kể cả bị max-parallel giữ)
 *  cũng chiếm chỗ – 02/11 04:21Z busy 20, queued 118 (đói 0) mà vẫn bơm 12 job → 40/40, check PR không có runner.
 *  Không bao giờ dispatch khi có job đói runner (starved) hoặc check PR (pull_request) đang xếp hàng (prQueued). */
export function capacity({ busy, queued = 0, starved = 0, prQueued = 0 }, { total = 40, reserve = 8 } = {}) {
  if (starved > 0 || prQueued > 0) return 0;
  return Math.max(0, total - reserve - busy - queued);
}
/** Số job một mục chiếm nếu dispatch với `free` chỗ (thuần): mục có shards_input → min(max_shards, free) (≥ min_shards, không thì 0); mục cố định → jobs nếu vừa. */
export function shardsFor(entry, free) {
  if (entry.shards_input) { const n = Math.min(entry.max_shards || 1, free); return n >= (entry.min_shards || 1) ? n : 0; }
  const j = entry.jobs || 1; return j <= free ? j : 0;
}
export const eligible = e => e.eligible !== false && e.cpu_bound === true && e.quota_bound !== true;
const ACTIVE = new Set(['queued', 'in_progress', 'waiting', 'pending', 'requested']);
/** Chặn trùng (thuần): tập file workflow đang có lượt chưa xong. */
export const activeWorkflows = (runs, now = Date.now()) => new Set(runs.filter(r => ACTIVE.has(r.status) && !isZombie(r, now)).map(r => String(r.path || '').replace(/^\.github\/workflows\//, '').replace(/@.*$/, '')));
export const isActive = (entry, active) => active.has(entry.workflow);
/** Đếm từ danh sách job của các lượt chưa xong (thuần). Phần tử = mảng job, hoặc { event, jobs } để đếm job check PR đang xếp hàng (prQueued). */
/** Job xếp hàng quá lâu mà máy vẫn rảnh là job kẹt (max-parallel giữ, lượt zombie): không tính vào hàng chờ. 04/11: teach-video của 1 PR giữ 14 job ~6 giờ, filler báo "check PR chờ" dù 38 runner trống. Ngưỡng cao hơn thời gian chờ thật khi còn runner; lúc nghẽn thật busy cao nên capacity vẫn về 0. */
export const STUCK_MS = 45 * 60e3;
export function countJobs(jobsByRun, now = Date.now()) {
  let busy = 0, queued = 0, starved = 0, prQueued = 0, stuck = 0;
  for (const x of jobsByRun) {
    const jobs = Array.isArray(x) ? x : x.jobs || [], pr = !Array.isArray(x) && /^pull_request/.test(x.event || '');
    const run = jobs.filter(j => j.status === 'in_progress').length, all = jobs.filter(j => j.status === 'queued'), q = all.filter(j => now - new Date(j.created_at || now) <= STUCK_MS);
    stuck += all.length - q.length;
    busy += run; queued += q.length; if (pr) prQueued += q.length;
    if (!run) starved += q.filter(j => now - new Date(j.created_at || now) > 60e3).length;
  }
  return { busy, queued, starved, prQueued, stuck };
}
export function plan(entries, { free, active, left }) {
  const out = [];
  for (const e of entries) {
    if (!eligible(e)) { out.push({ id: e.id, act: 'skip', why: 'quota/không đủ điều kiện' }); continue; }
    if (isActive(e, active)) { out.push({ id: e.id, act: 'skip', why: 'đang chạy (chặn trùng)', backlog: true }); continue; }
    const l = left(e);
    if (l === 0) { out.push({ id: e.id, act: 'done' }); continue; }
    if (l == null) { out.push({ id: e.id, act: 'skip', why: 'không dò được' }); continue; }
    const n = shardsFor(e, free);
    if (!n) { out.push({ id: e.id, act: 'skip', why: `hết chỗ (${free})`, backlog: true }); continue; }
    out.push({ id: e.id, act: 'dispatch', n, inputs: inputsFor(e, n), left: l, backlog: true }); free -= n;
  }
  return out;
}
export function inputsFor(e, n) {
  const i = { ...(e.inputs || {}) }; if (e.shards_input) i[e.shards_input] = String(n);
  return Object.fromEntries(Object.entries(i).map(([k, v]) => [k, String(v)]));
}
/** Dòng log: ts busy queued dispatched backlog idle_min (idle = chỗ usable bỏ trống × 10 phút khi còn tồn đọng). */
export function logLine({ ts, busy, queued, dispatched, backlog }, { total = 40, reserve = 8 } = {}) {
  const idle = backlog > 0 ? Math.max(0, total - reserve - busy - dispatched) * SAMPLE_MIN : 0;
  return [ts, busy, queued, dispatched, backlog, idle].join('\t');
}
/** Báo cáo 24 h từ util.tsv (thuần). */
export function report(text, now = Date.now()) {
  const rows = String(text || '').split('\n').filter(l => /^\d{4}-/.test(l)).map(l => { const [ts, busy, queued, disp, backlog, idle] = l.split('\t'); return { t: Date.parse(ts), busy: +busy, queued: +queued, disp: +disp, backlog: +backlog, idle: +idle }; })
    .filter(r => r.t > now - 24 * 3600e3 && r.t <= now);
  const hours = {};
  for (const r of rows) { const h = new Date(r.t).toISOString().slice(11, 13); (hours[h] = hours[h] || []).push(r.busy + r.disp); }
  const per = Object.keys(hours).sort().map(h => ({ h, avg: +(hours[h].reduce((a, b) => a + b, 0) / hours[h].length).toFixed(1), peak: Math.max(...hours[h]) }));
  const all = rows.map(r => r.busy + r.disp), idle = rows.reduce((a, r) => a + r.idle, 0), disp = rows.reduce((a, r) => a + r.disp, 0);
  const avg = all.length ? +(all.reduce((a, b) => a + b, 0) / all.length).toFixed(1) : 0, peak = all.length ? Math.max(...all) : 0;
  const msg = rows.length ? `runner TB ${avg}/40 · đỉnh ${peak}/40 · rảnh khi còn tồn đọng ${idle} phút-runner · ci-filler dispatch ${disp} job (${rows.length} mẫu)` : 'chưa có mẫu ci-filler trong 24 h';
  const md = `## 🏭 Runner 24 h (ci-filler)\n${msg}\n\n| Giờ UTC | TB | Đỉnh |\n|---|---|---|\n${per.map(p => `| ${p.h} | ${p.avg} | ${p.peak} |`).join('\n')}\n`;
  return { samples: rows.length, avg, peak, idle, dispatched: disp, per, msg, md };
}

// ---------- GitHub API ----------
const REPO = process.env.GITHUB_REPOSITORY || 'lexkiteapp/lexkiteapp.github.io';
const API = (process.env.GITHUB_API_URL || 'https://api.github.com') + '/repos/' + REPO;
async function gh(p, { method = 'GET', body, raw = false } = {}) {
  const r = await retry5xx(() => fetch(p.startsWith('http') ? p : API + p, { method, headers: { Authorization: 'Bearer ' + process.env.GITHUB_TOKEN, Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', 'User-Agent': 'lexkite-ci-filler', ...(body ? { 'Content-Type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30e3) }));
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`GitHub ${method} ${p.slice(0, 80)} → ${r.status} ${(await r.text()).slice(0, 200)}`);
  return raw ? r.text() : r.status === 204 ? {} : r.json().catch(() => ({}));
}
export async function measure() {
  const runs = [];
  for (const s of ACTIVE) runs.push(...(((await gh(`/actions/runs?status=${s}&per_page=100`)) || {}).workflow_runs || []));
  const seen = new Set(), uniq = runs.filter(r => !seen.has(r.id) && seen.add(r.id));
  const jobsByRun = [];
  for (const r of uniq.filter(r => r.status === 'in_progress' || r.status === 'queued')) jobsByRun.push({ event: r.event, jobs: ((await gh(`/actions/runs/${r.id}/jobs?filter=latest&per_page=100`)) || {}).jobs || [] });
  return { ...countJobs(jobsByRun), active: activeWorkflows(uniq) };
}
/** Cùng sha main và lượt gần nhất đã xanh → chạy lại chỉ tốn runner (thuần). */
export const sameShaDone = (run, sha) => !!run && !!sha && run.head_sha === sha && run.conclusion === 'success';
let mainSha;
async function staleLeft(e) { // probe.stale_hours: còn việc nếu lượt hoàn tất gần nhất (mọi sự kiện) cũ hơn N giờ
  const r = ((((await gh(`/actions/workflows/${e.workflow}/runs?status=completed&branch=main&per_page=1`)) || {}).workflow_runs) || [])[0];
  mainSha = mainSha || ((await gh('/commits/main')) || {}).sha;
  if (sameShaDone(r, mainSha)) return 0;
  return !r || Date.now() - Date.parse(r.created_at) > e.probe.stale_hours * 3600e3 ? 1 : 0;
}
function cmdLeft(e) { // probe.cmd: in số việc còn theo left_re (nhóm 1); exit ≠ 0 → không dò được
  try {
    const out = execSync(e.probe.cmd, { encoding: 'utf8', timeout: 90e3, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...(e.probe.env || {}) } });
    const m = out.match(new RegExp(e.probe.left_re)); return m ? +m[1] : null;
  } catch (err) { console.log(`::warning::dò ${e.id} lỗi: ${String(err.message).slice(0, 200)}`); return null; }
}
async function appendLog(line) {
  const ref = await gh(`/git/ref/heads/${LOG_BRANCH}`).catch(() => null);
  let parent = ref && ref.object.sha, old = '';
  if (parent) old = (await gh(`/contents/${LOG_FILE}?ref=${LOG_BRANCH}`, { raw: true }).catch(() => '')) || '';
  const text = [...old.split('\n').filter(Boolean), line].slice(-KEEP_LINES).join('\n') + '\n';
  const blob = await gh('/git/blobs', { method: 'POST', body: { content: text, encoding: 'utf-8' } });
  const tree = await gh('/git/trees', { method: 'POST', body: { tree: [{ path: LOG_FILE, mode: '100644', type: 'blob', sha: blob.sha }] } });
  const c = await gh('/git/commits', { method: 'POST', body: { message: `ci-filler: ${line.split('\t')[0]} [CF-Pages-Skip]`, tree: tree.sha, parents: parent ? [parent] : [] } });
  if (parent) await gh(`/git/refs/heads/${LOG_BRANCH}`, { method: 'PATCH', body: { sha: c.sha, force: true } });
  else await gh('/git/refs', { method: 'POST', body: { ref: `refs/heads/${LOG_BRANCH}`, sha: c.sha } });
}
export const readLog = () => gh(`/contents/${LOG_FILE}?ref=${LOG_BRANCH}`, { raw: true }).catch(() => '');
const summary = md => { if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + '\n'); console.log(md); };
const output = (k, v) => { if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`); };

async function main(mode) {
  const reg = loadRegistry(), lim = { total: reg.total_runners, reserve: reg.reserve };
  if (mode === 'report') return summary(report(await readLog()).md);
  const m = await measure(), free = capacity(m, lim), ts = new Date().toISOString().slice(0, 16) + 'Z';
  const entries = reg.entries.filter(eligible), running = entries.filter(e => isActive(e, m.active)).length;
  const head = `busy ${m.busy}/${lim.total} · queued ${m.queued} (đói ${m.starved}, check PR chờ ${m.prQueued}) · chỗ cho việc nền ${free} · mục đang chạy ${running}`;
  const stale = {}; // dò stale bằng API (không cần checkout)
  for (const e of entries.filter(e => e.probe.stale_hours && !isActive(e, m.active))) stale[e.id] = await staleLeft(e).catch(() => null);
  const needCmd = entries.some(e => e.probe.cmd && !isActive(e, m.active));
  if (mode === 'gate' && (free === 0 || (!needCmd && !Object.values(stale).some(Boolean)))) {
    output('free', 0);
    await appendLog(logLine({ ts, busy: m.busy, queued: m.queued, dispatched: 0, backlog: free === 0 ? 0 : running + Object.values(stale).filter(Boolean).length }, lim)).catch(e => console.log(`::warning::log: ${e.message}`));
    return summary(`### ci-filler (gate)\n${head}\n- Không dispatch (${free === 0 ? 'không còn chỗ' : 'không còn ứng viên'}).`);
  }
  if (mode === 'gate') { output('free', free); return summary(`### ci-filler (gate)\n${head}\n- Có chỗ → checkout đầy đủ để dò.`); }
  const steps = plan(reg.entries, { free, active: m.active, left: e => e.probe.stale_hours ? stale[e.id] ?? null : cmdLeft(e) });
  let dispatched = 0;
  for (const s of steps.filter(s => s.act === 'dispatch')) {
    const e = reg.entries.find(x => x.id === s.id);
    try { await gh(`/actions/workflows/${e.workflow}/dispatches`, { method: 'POST', body: { ref: 'main', inputs: s.inputs } }); dispatched += s.n; }
    catch (err) { s.act = 'error'; s.why = err.message.slice(0, 160); }
  }
  await appendLog(logLine({ ts, busy: m.busy, queued: m.queued, dispatched, backlog: steps.filter(s => s.backlog).length }, lim)).catch(e => console.log(`::warning::log: ${e.message}`));
  summary(`### ci-filler\n${head}\n${steps.map(s => `- ${s.id}: ${s.act}${s.n ? ` ×${s.n}` : ''}${s.left != null ? ` (còn ${s.left})` : ''}${s.why ? ` – ${s.why}` : ''}`).join('\n')}\n- Đã dispatch ${dispatched} job.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]).catch(e => { console.log(`::error::ci-filler: ${e.message}`); process.exitCode = 1; });
}
