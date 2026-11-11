// required-gate: MỘT commit status tổng hợp cho PR (sau này là check bắt buộc DUY NHẤT của main – docs/CI-RUNNERS.md § required-gate).
// Xanh khi mọi check-run + status + workflow run trên head PR đều success/skipped/neutral và không còn gì đang chạy;
// đỏ khi có failure/timed_out/cancelled/startup_failure/stale/error; còn lại = pending. Chỉ ĐỌC API + ghi 1 status – không chạy mã PR.
//   node scripts/ci/required-gate.mjs --sha <sha> [--dry]   đánh giá 1 commit, đăng status
//   node scripts/ci/required-gate.mjs --pr <số> [--dry]     như trên với head của PR
//   node scripts/ci/required-gate.mjs --sweep [--dry]       1 lượt: PR mở có gate pending/thiếu → đánh giá lại
//   node scripts/ci/required-gate.mjs --watch <phút> [--dry] bộ canh: 1 runner hỏi API mỗi 30–60 s, chỉ đánh giá sha có thay đổi
//   node scripts/ci/required-gate.mjs --check               kiểm required-gate.yml không quay lại kiểu workflow_run/check_suite
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, (tùy) RUN_URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isZombie } from './zombie.mjs';
import { retry5xx } from '../lib/retry5xx.mjs';

export const CONTEXT = 'required-gate';            // tên commit status (thứ ruleset sẽ yêu cầu)
export const SELF_JOB = 'required-gate-eval';      // tên job của chính workflow này – không tự chờ mình (bộ canh chạy trên main nên không bám head PR)
export const SELF_PATH = '.github/workflows/required-gate.yml';
const OK = new Set(['success', 'skipped', 'neutral']);
const BAD = new Set(['failure', 'timed_out', 'cancelled', 'startup_failure', 'stale', 'error']);

/** Hàm thuần: { checkRuns, statuses, workflowRuns } (dạng REST API) → { state, description, failed, pending, total }. */
export function evaluate({ checkRuns = [], statuses = [], workflowRuns = [] } = {}) {
  const items = [];
  // check-run: lấy bản mới nhất theo tên (API filter=latest đã làm, làm lại cho chắc khi gộp nhiều trang/bộ)
  const cr = new Map();
  for (const c of checkRuns) {
    if (c.name === SELF_JOB) continue;
    const prev = cr.get(c.name);
    if (!prev || (c.id || 0) > (prev.id || 0)) cr.set(c.name, c);
  }
  for (const c of cr.values()) items.push({ name: c.name, status: c.status, conclusion: c.conclusion });
  // workflow run: bản mới nhất theo workflow (lượt cũ bị hủy do concurrency hay lượt "ma" queued không tính)
  const wr = new Map();
  for (const r of workflowRuns) {
    if (r.path === SELF_PATH || (r.path || '').startsWith(SELF_PATH + '@')) continue;
    const k = r.workflow_id ?? r.name, prev = wr.get(k);
    if (!prev || (r.run_number || 0) > (prev.run_number || 0) || ((r.run_number || 0) === (prev.run_number || 0) && (r.id || 0) > (prev.id || 0))) wr.set(k, r);
  }
  for (const r of wr.values()) items.push({ name: 'workflow: ' + r.name, status: r.status, conclusion: r.conclusion });
  // commit status: mới nhất theo context, bỏ chính mình
  const st = new Map();
  for (const s of statuses) {
    if (s.context === CONTEXT) continue;
    const prev = st.get(s.context);
    if (!prev || String(s.updated_at || s.created_at || '') > String(prev.updated_at || prev.created_at || '') || (!s.updated_at && (s.id || 0) > (prev.id || 0))) st.set(s.context, s);
  }
  for (const s of st.values()) items.push(s.state === 'pending' ? { name: s.context, status: 'in_progress' } : { name: s.context, status: 'completed', conclusion: s.state });

  const failed = [], pending = [];
  for (const i of items) {
    if (i.status !== 'completed') pending.push(i.name);
    else if (OK.has(i.conclusion)) continue;
    else if (BAD.has(i.conclusion)) failed.push(`${i.name} (${i.conclusion})`);
    else pending.push(`${i.name} (${i.conclusion || 'chưa rõ'})`);   // action_required (PR fork chờ duyệt chạy) … → chờ, không đỏ
  }
  const total = items.length;
  // status API giới hạn 140 ký tự: bớt dần số tên cho vừa, luôn giữ "+N" để biết còn bao nhiêu
  const say = (head, a) => {
    for (let k = Math.min(a.length, 4); k >= 1; k--) {
      const s = `${head}: ${a.slice(0, k).join(', ')}${a.length > k ? ` +${a.length - k}` : ''}`;
      if (s.length <= 140) return s;
    }
    const more = a.length > 1 ? ` +${a.length - 1}` : '';
    return `${head}: ${a[0]}`.slice(0, 139 - more.length) + '…' + more;
  };
  let state, description;
  if (failed.length) { state = 'failure'; description = say(`Đỏ ${failed.length}/${total}`, failed); }
  else if (pending.length) { state = 'pending'; description = say(`Chờ ${pending.length}/${total}`, pending); }
  // 05/11: không có check THẬT nào đạt (0 check, hoặc chỉ skipped/neutral) = CI chưa chạy (vd. commit đẩy bằng token không kích workflow) → CHỜ, không xanh.
  // Trước đây trường hợp này báo xanh → #584 gộp vào main khi chưa có CI nào chạy trên head.
  else if (!items.some((i) => i.status === 'completed' && i.conclusion === 'success')) { state = 'pending'; description = total ? `Chưa có check thật nào đạt (${total} bỏ qua) – đẩy commit thường để chạy CI` : 'Chưa có check nào chạy trên commit này – đẩy commit thường để chạy CI'; }
  else { state = 'success'; description = `Xanh: ${total} check đều đạt`; }
  return { state, description, failed, pending, total };
}

// ---------- bộ canh (3/11): thay ~20 lượt workflow_run/commit bằng 1 runner canh liên tục ----------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WF = path.join(ROOT, '.github/workflows');

/** Workflow có thể chạy trên head PR: trigger pull_request(_target), hoặc push không chỉ giới hạn ở main. */
export function prCapable(src) {
  const m = src.match(/^on:(.*)\n((?:[ \t]+.*\n|[ \t]*\n)*)/m);
  if (!m) return false;
  const block = m[1] + '\n' + m[2];
  if (/\bpull_request(_target)?\b/.test(block)) return true;
  if (/\[[^\]]*\bpush\b[^\]]*\]|^\s*push\s*$/m.test(m[1])) return true;   // on: [push, …] / on: push
  const push = block.match(/^  push:[ \t]*(.*)\n((?:    .*\n|[ \t]*\n)*)/m);
  if (!push) return false;
  const body = push[1] + '\n' + push[2], br = body.match(/^\s*branches:\s*\[([^\]]*)\]/m);
  if (!br) return true;   // push mọi nhánh (hoặc chỉ tags/branches-ignore) → tính
  return br[1].split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).some(b => b && b !== 'main');
}

/** Gác hồi quy: required-gate.yml không được nghe workflow_run/check_suite/pull_request (mỗi sự kiện = 1 runner) – chỉ lịch + dispatch. */
export function checkWorkflow(src) {
  const on = (src.match(/^on:\n((?:[ \t]+.*\n|[ \t]*\n)*)/m) || [, ''])[1], out = [];
  for (const ev of ['workflow_run', 'check_suite', 'pull_request', 'pull_request_target', 'push']) if (new RegExp(`^  ${ev}:`, 'm').test(on)) out.push(`không được nghe ${ev} (mỗi sự kiện chiếm 1 runner – bộ canh --watch thay thế)`);
  if (!/^  schedule:/m.test(on)) out.push('thiếu lịch khởi động bộ canh');
  if (!/--watch /.test(src)) out.push('thiếu bước --watch');
  if (!/CRON_WATCH: '1'/.test(src) || !/sparse-checkout:[^\n]*\n?[^\n]*\.github\/workflows/.test(src) || !/issues: write/.test(src)) out.push("thiếu canh lịch cron độc lập (CRON_WATCH: '1' + checkout .github/workflows + issues: write)");
  if (!/GATE_CHAIN_REF:/.test(src) || !/actions: write/.test(src)) out.push('thiếu tự nối (GATE_CHAIN_REF + actions: write) – cron GitHub có lúc bỏ lượt hàng giờ');
  if (/cancel-in-progress: true/.test(src)) out.push('bộ canh không được huỷ lượt đang canh (cancel-in-progress phải false)');
  return out;
}

const DONE_BAD = r => r.status === 'completed' && BAD.has(r.conclusion);
const mine = r => r.path === SELF_PATH || (r.path || '').startsWith(SELF_PATH + '@');
/**
 * Hàm thuần: sha nào cần đánh giá lại ở vòng này. seen: Map sha → { at (ms, lúc đọc), state }.
 * Còn pending và vẫn có lượt khác của sha đang chạy → bỏ qua (gate chỉ có thể vẫn pending) trừ khi vừa có lượt đỏ;
 * gate đã xanh/đỏ mà có lượt mới đổi (chạy lại) → đánh giá; pending lâu không đổi (status/app ngoài) → đánh giá lại sau recheckMs.
 */
export function dirtyShas({ shas, runs, seen, now, recheckMs = 10 * 60e3, probes = null, staleMs = 5 * 60e3, why = null }) {
  const out = [], mark = (sha, r) => { out.push(sha); why?.set(sha, r); };
  for (const sha of shas) {
    const s = seen.get(sha);
    if (!s) { mark(sha, 'new'); continue; }
    // GỐC LỖI (PR #710 05/11, #602 04/11): danh sách /actions/runs?per_page=100 là 100 lượt MỚI TẠO nhất của cả repo (sắp theo created_at).
    // Lượt 'QA bot' tạo sớm bị 100 lượt filler/cron chen ra ngoài trang → job sau (needs:) xong muộn, run.updated_at đổi mà ta không bao giờ thấy;
    // lượt chạy lại (rerun) giữ run_id, chỉ tăng run_attempt, cũng trượt như vậy. Nên ngoài so updated_at, (1) so run_attempt, (2) với sha đang pending
    // mỗi vòng thăm dò check-runs của chính sha đó (probes: sha → { sig, active }; ETag, 304 miễn phí) – chữ ký đổi → đánh giá lại,
    // (3) lưới cuối: pending ≥ staleMs mà không còn check nào queued/in_progress → bắt buộc đánh giá lại.
    const own = runs.filter(r => r.head_sha === sha && !mine(r));
    const changed = own.filter(r => Date.parse(r.updated_at) > s.at || (r.run_attempt || 1) > ((s.attempts && s.attempts[r.id]) || 1));
    const pr = probes && probes.get(sha);
    if (pr && s.state === 'pending' && s.sig != null && pr.sig !== s.sig) { mark(sha, 'sig'); continue; }
    // 10/11 (#1004, #1002 treo hàng giờ): gate ĐỎ, job đỏ được chạy lại thành xanh. Lượt rerun giữ created_at cũ → trượt khỏi trang
    // recentRuns, và trước đây chỉ sha pending mới được thăm dò → đỏ mãi. Nay sha đỏ cũng được thăm dò: check-runs mới nhất không còn
    // cái nào đỏ và chữ ký khác lần đánh giá trước (kể cả lần đầu sau khi bộ canh khởi động lại) → đánh giá lại.
    if (pr && s.state === 'failure' && !pr.bad && pr.sig !== s.sig) { mark(sha, 'rerun'); continue; }
    if (!changed.length) {
      if (pr && s.state === 'pending' && !pr.active && now - s.at >= staleMs) { mark(sha, 'stale'); continue; }
      if ((s.state === 'pending' && now - s.at >= recheckMs) || (s.recheckAt && now >= s.recheckAt)) mark(sha, 'recheck');
      continue;
    }
    if (s.state !== 'pending' || changed.some(DONE_BAD) || !own.some(r => r.status !== 'completed')) mark(sha, 'changed');
  }
  return out;
}

/** Chữ ký check-runs của 1 sha: đổi khi bất kỳ check nào đổi id/trạng thái/kết luận/lượt chạy lại. active = còn check queued/in_progress. */
export function probeOf(checkRuns = []) {
  const act = c => c.status !== 'completed';
  return { sig: checkRuns.map(c => `${c.id}:${c.status}:${c.conclusion || ''}:${c.completed_at || ''}`).sort().join('|'), active: checkRuns.some(act), n: checkRuns.length,
    bad: checkRuns.filter(c => c.name !== SELF_JOB && c.status === 'completed' && BAD.has(c.conclusion)).length };
}

// ---------- API (chỉ đọc + ghi 1 status) ----------
export function api(token, repo, fetchImpl = globalThis.fetch) {
  const base = `https://api.github.com/repos/${repo}`, etags = new Map(), rate = { remaining: Infinity, reset: 0 };
  const call = async (p, init = {}) => {
    const u = p.startsWith('http') ? p : base + p, get = !init.method || init.method === 'GET', c = get && etags.get(u);
    const r = await retry5xx(() => fetchImpl(u, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(c ? { 'If-None-Match': c.etag } : {}), ...(init.headers || {}) } }));
    const h = k => r.headers?.get?.(k);
    if (h('x-ratelimit-remaining') != null) { rate.remaining = +h('x-ratelimit-remaining'); rate.reset = +h('x-ratelimit-reset') * 1000; }
    if (r.status === 304 && c) return c.body;   // GET có điều kiện: 304 không trừ hạn mức API
    if (!r.ok) throw new Error(`${init.method || 'GET'} ${p} → ${r.status} ${(await r.text()).slice(0, 200)}`);
    if (r.status === 204) return null;   // dispatches: không có thân
    const body = await r.json();
    if (get && h('etag')) etags.set(u, { etag: h('etag'), body });
    return body;
  };
  const pages = async (p, key, max = 5) => {
    const out = [];
    for (let i = 1; i <= max; i++) {
      const j = await call(`${p}${p.includes('?') ? '&' : '?'}per_page=100&page=${i}`), a = key ? j[key] : j;
      out.push(...a); if (a.length < 100) break;
    }
    return out;
  };
  return {
    call, rate,
    recentRuns: async () => (await call('/actions/runs?per_page=100&exclude_pull_requests=true')).workflow_runs || [],
    gather: async sha => ({
      checkRuns: await pages(`/commits/${sha}/check-runs?filter=latest`, 'check_runs'),
      statuses: (await call(`/commits/${sha}/status?per_page=100`)).statuses || [],
      workflowRuns: await pages(`/actions/runs?head_sha=${sha}`, 'workflow_runs', 3),
    }),
    post: (sha, { state, description }, targetUrl) => call(`/statuses/${sha}`, { method: 'POST', body: JSON.stringify({ state, description, context: CONTEXT, ...(targetUrl ? { target_url: targetUrl } : {}) }) }),
    pr: n => call(`/pulls/${n}`),
    openPrs: () => pages('/pulls?state=open&sort=updated&direction=desc', null, 2),
    // tự nối (3/11): cron GitHub có lúc bỏ lượt hàng giờ (02/11: ci-triage + free-tier-guard 13 giờ) → bộ canh tự xếp lượt kế tiếp
    dispatchRuns: async () => (await call(`/actions/workflows/${path.basename(SELF_PATH)}/runs?event=workflow_dispatch&per_page=5`)).workflow_runs || [],
    lastRun: async file => ((await call(`/actions/workflows/${file}/runs?per_page=1`)).workflow_runs || [])[0] || null,
    dispatchFile: async (file, ref) => call(`/actions/workflows/${file}/dispatches`, { method: 'POST', body: JSON.stringify({ ref }) }),
    dispatchSelf: async ref => call(`/actions/workflows/${path.basename(SELF_PATH)}/dispatches`, { method: 'POST', body: JSON.stringify({ ref }) }),
    // thăm dò nhẹ cho sha đang pending: 1 trang check-runs (ETag → 304 không trừ hạn mức)
    probe: async sha => probeOf((await call(`/commits/${sha}/check-runs?filter=latest&per_page=100`)).check_runs || []),
    gateState: async sha => ((await call(`/commits/${sha}/status?per_page=100`)).statuses || []).find(s => s.context === CONTEXT),
  };
}

// 3/11: GitHub không chạy cron dày của 2 workflow này (0 lượt schedule từ ngày tạo) → ci-filler không lấp runner (12/40 dù còn việc tồn). Bộ canh chạy liên tục nên làm nhịp: mỗi workflow 1 dispatch/khoảng, cron giữ làm lưới.
// 3/11: 2 lượt tự nối (07:48Z, 21:25Z) kẹt 'queued' 0 job → bộ canh chết hàng giờ. Lượt nối khoẻ bị concurrency giữ nên chưa thể có job, trạng thái là 'pending'; còn 'queued' sau CHAIN_CHECK_MS = kẹt → dispatch lại.
export const CHAIN_CHECK_MS = 90e3, CHAIN_RETRIES = 2;
/** Lượt nối dispatch từ `since` đã sống chưa (thuần). */
export const chainAlive = (runs, since) => runs.some(r => Date.parse(r.created_at) >= since - 30e3 && r.status !== 'queued');
export const PACED = { 'ci-filler.yml': 10, 'd1-usage-watch.yml': 20 };
/** Tới nhịp chưa (thuần): không có lượt đang chờ/chạy thật và lượt cuối đã quá khoảng lịch. */
export const paceDue = (last, gapMin, now) => !last || (last.status === 'completed' || isZombie(last, now)) && now - Date.parse(last.created_at) >= gapMin * 6e4;
export async function run(argv, env = process.env, A = null, log = console.log, clock = { now: () => Date.now(), sleep: ms => new Promise(r => setTimeout(r, ms)) }) {
  const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const dry = argv.includes('--dry'), url = env.RUN_URL || '';
  A = A || api(env.GITHUB_TOKEN, env.GITHUB_REPOSITORY);
  const one = async sha => {
    const res = evaluate(await A.gather(sha));
    log(`${sha.slice(0, 8)} → ${res.state}: ${res.description}`);
    if (!dry) await A.post(sha, res, url);
    return res;
  };
  if (arg('--sha')) return [await one(arg('--sha'))];
  if (arg('--pr')) return [await one((await A.pr(arg('--pr'))).head.sha)];
  if (argv.includes('--sweep')) {
    // lưới an toàn khi sự kiện workflow_run bị lỡ: chỉ PR cập nhật ≤ 14 ngày, gate đang pending hoặc chưa có (1 lệnh gọi/PR nếu đã xong)
    const since = Date.now() - 14 * 864e5, out = [];
    for (const p of await A.openPrs()) {
      if (Date.parse(p.updated_at) < since) continue;
      const g = await A.gateState(p.head.sha);
      if (g && g.state !== 'pending') continue;
      log(`#${p.number}`); out.push(await one(p.head.sha));
    }
    return out;
  }
  if (arg('--watch')) {
    // Bộ canh: lịch khởi động mỗi 30 phút, mỗi lượt canh ≤ N phút (concurrency: 1 chạy + 1 chờ nối tiếp → canh liên tục).
    // Mỗi vòng: 1 lệnh liệt kê lượt chạy gần nhất + PR mở (ETag – 304 không trừ hạn mức) → chỉ đánh giá sha thật sự có thể đổi trạng thái.
    const end = clock.now() + Number(arg('--watch')) * 60e3, seen = new Map(), born = new Map(), since = () => clock.now() - 14 * 864e5, out = [];
    const YOUNG = 90e3;   // sha mới thấy < 90 s: chưa chắc các workflow đã kịp tạo lượt chạy → không cho xanh sớm
    // canh lịch cron (3/11): cron-watch trước chỉ chạy trong ci-triage – mà cron của ci-triage cũng bị GitHub bỏ 13 giờ (02/11 13:12Z→20:46Z, 2 lượt)
    // → monitor mù đúng lúc cần. Bộ canh tự nối (không phụ thuộc cron) chạy cron-watch 1 lần mỗi lượt (~1 giờ): báo + đá lại lịch chết.
    if (env.CRON_WATCH === '1' && !dry) try {
      const r = await (A.cronWatch || (async () => {
        const m = await import('./cron-watch.mjs'), gh = (p, o = {}) => A.call(p, { method: o.method, ...(o.body ? { body: JSON.stringify(o.body) } : {}) }).catch(e => { log('::warning::cron-watch API: ' + e.message); return null; });
        const res = await m.cronWatch(gh); res.issue = await m.syncIssue(gh, res); return res;
      }))();
      log(`lịch cron: ${r.bad.length ? r.bad.map(b => `${b.file} (${b.why})`).join('; ') : 'mọi workflow đúng hạn'}${r.issue ? ` · issue ${r.issue}` : ''}`);
    } catch (e) { log('::warning::cron-watch lỗi (bộ canh vẫn chạy): ' + e.message); }
    let first = true, chained = !env.GATE_CHAIN_REF || dry;
    const CHAIN_BEFORE = 6 * 60e3;   // còn ≤ 6 phút: xếp sẵn lượt kế tiếp (concurrency giữ nó chờ tới khi lượt này xong) – không phụ thuộc cron
    const paceAt = new Map(); let chainAt = 0, chainTries = 0;
    while (clock.now() < end) {
      if (chainAt && A.dispatchRuns && clock.now() - chainAt >= CHAIN_CHECK_MS) try {
        if (chainAlive(await A.dispatchRuns(), chainAt)) { chainAt = 0; log('↻ lượt canh kế tiếp đã sống'); }
        else if (chainTries++ < CHAIN_RETRIES) { await A.dispatchSelf(env.GATE_CHAIN_REF); chainAt = clock.now(); log(`::warning::lượt nối kẹt queued → dispatch lại (${chainTries}/${CHAIN_RETRIES})`); }
        else { chainAt = 0; log('::error::lượt nối vẫn kẹt sau khi dispatch lại – chờ lịch 17,47 / cron-kick (15 phút)'); }
      } catch (e) { log('::warning::kiểm lượt nối: ' + e.message); }
      if (env.GATE_CHAIN_REF && !dry && A.dispatchFile) for (const [file, gap] of Object.entries(PACED)) {
        if (clock.now() < (paceAt.get(file) || 0)) continue;
        paceAt.set(file, clock.now() + 60e3);
        try { if (paceDue(await A.lastRun(file), gap, clock.now())) { await A.dispatchFile(file, env.GATE_CHAIN_REF); log(`⏱ nhịp ${file}: đã dispatch`); paceAt.set(file, clock.now() + gap * 60e3); } } catch (e) { log(`::warning::nhịp ${file}: ${e.message}`); }
      }
      if (!chained && end - clock.now() <= CHAIN_BEFORE) { chained = true; try { await A.dispatchSelf(env.GATE_CHAIN_REF); chainAt = clock.now(); log('↻ đã xếp lượt canh kế tiếp'); } catch (e) { log('::warning::không tự nối được (lịch 17,47 vẫn là lưới): ' + e.message); } }
      const t = clock.now(), prs = (await A.openPrs()).filter(p => Date.parse(p.updated_at) >= since()), shas = [...new Set(prs.map(p => p.head.sha))];
      if (first) {   // mồi: gate đã xanh/đỏ thì ghi nhận (1 lệnh/PR), pending/thiếu thì đánh giá ngay
        for (const sha of shas) { const g = await A.gateState(sha); if (g && g.state !== 'pending') seen.set(sha, { at: Date.parse(g.updated_at || g.created_at) || t, state: g.state, desc: g.description }); }
        first = false;
      }
      const runs = await A.recentRuns(), probes = new Map(), why = new Map();
      // thăm dò chỉ khi còn hạn mức dư (≥ 400/giờ): lúc CI bận ETag đổi liên tục, 20 sha × 60–120 vòng/giờ có thể ăn hết 1.000 lệnh của GITHUB_TOKEN → nhường cho đánh giá chính (lưới recheck 10 phút vẫn còn)
      if (A.probe && ((A.rate && A.rate.remaining) ?? Infinity) >= 400) for (const sha of shas.filter(x => ['pending', 'failure'].includes(seen.get(x)?.state)).slice(0, 20)) try { probes.set(sha, await A.probe(sha)); } catch (e) { log('::warning::probe ' + sha.slice(0, 8) + ': ' + e.message); }
      const dirty = dirtyShas({ shas, runs, seen, now: t, probes, why }).slice(0, 25);   // ≤ 25 sha/vòng: hạn mức GITHUB_TOKEN 1.000 lệnh/giờ
      for (const p of prs) if (!born.has(p.head.sha)) born.set(p.head.sha, first ? Date.parse(p.updated_at) : t);   // lượt mồi: lấy lúc PR cập nhật
      for (const sha of dirty) {
        const at = clock.now(), s = seen.get(sha);
        if (why.get(sha) === 'stale' || why.get(sha) === 'rerun') log(`gate-${why.get(sha)}: PR #${prs.find(p => p.head.sha === sha)?.number} tự đánh giá lại`);
        let res = evaluate(await A.gather(sha)), recheckAt = 0;
        if (res.state === 'success' && at - born.get(sha) < YOUNG) { recheckAt = born.get(sha) + YOUNG; res = { ...res, state: 'pending', description: 'Chờ workflow khởi động trên commit mới' }; }
        if (!s || s.state !== res.state || s.desc !== res.description) {
          log(`${sha.slice(0, 8)} → ${res.state}: ${res.description}`);
          if (!dry) await A.post(sha, res, url);
          out.push({ sha, ...res });
        }
        const attempts = {}; for (const r of runs) if (r.head_sha === sha) attempts[r.id] = r.run_attempt || 1;
        let sig = null; if (A.probe && (res.state === 'pending' || res.state === 'failure')) try { sig = (probes.get(sha) || await A.probe(sha)).sig; } catch { /* lần sau */ }
        seen.set(sha, { at: at - 5e3, state: res.state, desc: res.description, recheckAt, attempts, sig });   // lùi 5 s: lượt xong sát lúc đọc vẫn được thấy ở vòng sau
      }
      for (const k of seen.keys()) if (!shas.includes(k)) seen.delete(k), born.delete(k);   // PR đã gộp/đóng/đẩy commit mới
      const rate = A.rate || { remaining: Infinity };
      const wait = rate.remaining < 150 ? Math.max(60e3, rate.reset - clock.now()) : [...seen.values()].some(v => v.state === 'pending') || dirty.length ? 30e3 : 60e3;
      if (clock.now() + wait >= end) break;
      await clock.sleep(wait);
    }
    if (chainAt) log('::warning::hết lượt canh mà chưa xác nhận được lượt nối – chờ lịch 17,47 / cron-kick (15 phút)');
    return out;
  }
  throw new Error('thiếu --sha / --pr / --sweep / --watch');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  if (a.includes('--check') || a.includes('--sync')) {   // --sync: tên cũ trong prepush – nay chỉ kiểm
    const v = checkWorkflow(fs.readFileSync(path.join(WF, 'required-gate.yml'), 'utf8'));
    if (v.length) { console.error('✗ required-gate.yml: ' + v.join('; ')); process.exit(1); }
    console.log('✓ required-gate.yml: bộ canh lịch + dispatch, không nghe sự kiện tốn runner');
  } else {
    run(a).catch(e => { console.error('✗', e.message); process.exit(1); });
  }
}
