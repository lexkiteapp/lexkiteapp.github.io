// required-gate: MỘT commit status tổng hợp cho PR (sau này là check bắt buộc DUY NHẤT của main – docs/CI-RUNNERS.md § required-gate).
// Xanh khi mọi check-run + status + workflow run trên head PR đều success/skipped/neutral và không còn gì đang chạy;
// đỏ khi có failure/timed_out/cancelled/startup_failure/stale/error; còn lại = pending. Chỉ ĐỌC API + ghi 1 status – không chạy mã PR.
//   node scripts/ci/required-gate.mjs --sha <sha> [--dry]   đánh giá 1 commit, đăng status
//   node scripts/ci/required-gate.mjs --pr <số> [--dry]     như trên với head của PR
//   node scripts/ci/required-gate.mjs --sweep [--dry]       lưới an toàn: PR mở có gate pending/thiếu → đánh giá lại
//   node scripts/ci/required-gate.mjs --sync | --check      đồng bộ/kiểm danh sách workflow_run trong required-gate.yml
// Env: GITHUB_TOKEN, GITHUB_REPOSITORY, (tùy) RUN_URL.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const CONTEXT = 'required-gate';            // tên commit status (thứ ruleset sẽ yêu cầu)
export const SELF_JOB = 'required-gate-eval';      // tên job của chính workflow này – không tự chờ mình
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
  else { state = 'success'; description = total ? `Xanh: ${total} check đều đạt` : 'Không có check nào chạy trên commit này'; }
  return { state, description, failed, pending, total };
}

// ---------- danh sách workflow_run (GitHub không cho danh sách động) ----------
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const WF = path.join(ROOT, '.github/workflows');
const nameOf = (f, s) => ((s.match(/^name:\s*(.+)$/m) || [])[1] || f).trim().replace(/^['"]|['"]$/g, '');
const META = new Set(['required-gate.yml', 'ci-triage.yml']);   // chính nó + workflow meta (chạy trên commit main, không trên head PR)

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
export function expected(dir = WF) {
  return fs.readdirSync(dir).filter(f => /\.ya?ml$/.test(f) && !META.has(f)).sort()
    .map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]).filter(([, s]) => prCapable(s)).map(([f, s]) => nameOf(f, s));
}
const RE = /(\n    workflows:\n)((?:      - '[^\n]*'[^\n]*\n)+)/;
export function sync(write = false, file = path.join(WF, 'required-gate.yml'), dir = WF) {
  const src = fs.readFileSync(file, 'utf8'), m = RE.exec(src);
  if (!m) throw new Error('required-gate.yml: không tìm thấy khối "workflows:" dạng   - \'Tên\'');
  const cur = [...m[2].matchAll(/- '([^']*)'/g)].map(x => x[1]), want = expected(dir), set = new Set(want);
  const missing = want.filter(n => !cur.includes(n)), stale = cur.filter(n => !set.has(n));
  if (write && (missing.length || stale.length)) fs.writeFileSync(file, src.replace(RE, (_, a) => a + want.map(n => `      - '${n}'\n`).join('')));
  return { missing, stale };
}

// ---------- API (chỉ đọc + ghi 1 status) ----------
export function api(token, repo, fetchImpl = globalThis.fetch) {
  const base = `https://api.github.com/repos/${repo}`;
  const call = async (p, init = {}) => {
    const r = await fetchImpl(p.startsWith('http') ? p : base + p, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28', ...(init.headers || {}) } });
    if (!r.ok) throw new Error(`${init.method || 'GET'} ${p} → ${r.status} ${(await r.text()).slice(0, 200)}`);
    return r.json();
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
    call,
    gather: async sha => ({
      checkRuns: await pages(`/commits/${sha}/check-runs?filter=latest`, 'check_runs'),
      statuses: (await call(`/commits/${sha}/status?per_page=100`)).statuses || [],
      workflowRuns: await pages(`/actions/runs?head_sha=${sha}`, 'workflow_runs', 3),
    }),
    post: (sha, { state, description }, targetUrl) => call(`/statuses/${sha}`, { method: 'POST', body: JSON.stringify({ state, description, context: CONTEXT, ...(targetUrl ? { target_url: targetUrl } : {}) }) }),
    pr: n => call(`/pulls/${n}`),
    openPrs: () => pages('/pulls?state=open&sort=updated&direction=desc', null, 2),
    gateState: async sha => ((await call(`/commits/${sha}/status?per_page=100`)).statuses || []).find(s => s.context === CONTEXT),
  };
}

export async function run(argv, env = process.env, A = null, log = console.log) {
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
  throw new Error('thiếu --sha / --pr / --sweep');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2);
  if (a.includes('--sync') || a.includes('--check')) {
    const check = a.includes('--check'), { missing, stale } = sync(!check);
    if (check && (missing.length || stale.length)) {
      console.error(`✗ required-gate.yml lệch .github/workflows – chạy: node scripts/ci/required-gate.mjs --sync\n  thiếu: ${missing.join(', ') || '-'}\n  thừa: ${stale.join(', ') || '-'}`);
      process.exit(1);
    }
    console.log(check ? '✓ required-gate.yml khớp .github/workflows' : `✓ đã đồng bộ (thêm ${missing.length}, bỏ ${stale.length})`);
  } else {
    run(a).catch(e => { console.error('✗', e.message); process.exit(1); });
  }
}
