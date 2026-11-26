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
import { workflowMatches, readsAny, skipsOnPr } from './gate-relevance.mjs';
import { dispatchOnce } from './dispatch-once.mjs';
import { CONTEXT as RECHECK_CONTEXT, recheckVerdict } from './cheap.mjs';
import { retestPlan, verdict as retestVerdict, tagOf, CONTEXT as RETEST_CONTEXT, WORKFLOW as RETEST_WORKFLOW } from './gate-retest.mjs';

export const CONTEXT = 'required-gate';            // tên commit status (thứ ruleset sẽ yêu cầu)
export const SELF_JOB = 'required-gate-eval';      // tên job của chính workflow này – không tự chờ mình (bộ canh chạy trên main nên không bám head PR)
export const SELF_PATH = '.github/workflows/required-gate.yml';
const OK = new Set(['success', 'skipped', 'neutral']);
const BAD = new Set(['failure', 'timed_out', 'cancelled', 'startup_failure', 'stale', 'error']);
// 15/11: 'cancelled' KHÔNG phải lỗi thật – concurrency (cancel-in-progress) / runner mất huỷ lượt chạy mà không có lượt mới hơn cùng sha. Trước đây gate đỏ oan (#1340, #1324…).
// Lượt workflow mới nhất của sha bị huỷ → CHỜ + bộ canh tự chạy lại (≤ MAX_AUTO_RERUN lần); quá số lần đó mới tính đỏ. Lỗi thật (failure/timed_out…) vẫn đỏ ngay.
export const MAX_AUTO_RERUN = 4;   // 16/11: 2 → 4 (huỷ do concurrency nhường lượt nhiều lần liền); quá 4 lần vẫn huỷ = vòng lặp thật → đỏ
export const ADVISORY_CANCEL = new Set(['gate-impact']);   // 19/11: workflow chỉ comment tư vấn, nhóm concurrency toàn cục (#1592) thay lượt chờ cũ bằng 'cancelled' → KHÔNG tính đỏ/không chạy lại
export const INFRA_STARTUP = new Set(['wip-guard']);   // workflow chỉ gác/gắn nhãn (không chấm mã PR): startup_failure = lỗi hạ tầng GitHub, không phải lỗi PR

/** Hàm thuần: { checkRuns, statuses, workflowRuns } (dạng REST API) → { state, description, failed, pending, total }. */
/** Check-run "ma" của GitHub: status vẫn in_progress nhưng đã có conclusion + completed_at (16/11: npm test treo #1448 1h20) → coi là đã xong. */
export const effStatus = c => (c.status !== 'completed' && c.conclusion && c.completed_at) ? 'completed' : c.status;

export function evaluate({ checkRuns = [], statuses = [], workflowRuns = [] } = {}) {
  const items = [];
  // check-run: lấy bản mới nhất theo tên (API filter=latest đã làm, làm lại cho chắc khi gộp nhiều trang/bộ)
  const cr = new Map();
  // 25/11: workflow CHỈ TƯ VẤN (gate-impact) có job con `check #N` xếp hàng hàng giờ (nhóm concurrency toàn cục) → required-gate coi là pending, PR không gộp được (#2039: "Chờ 8/40: check (2047, …)").
  // Check-run thuộc lượt của workflow tư vấn (cùng check_suite) không bao giờ chặn cổng: bỏ khỏi danh sách (workflow-level được trung hoà ở dưới).
  const advSuites = new Set(workflowRuns.filter(r => ADVISORY_CANCEL.has(r.name) && r.check_suite_id != null).map(r => r.check_suite_id));
  for (const c of checkRuns) {
    if (c.name === SELF_JOB) continue;
    if (c.check_suite && advSuites.has(c.check_suite.id)) continue;
    const prev = cr.get(c.name);
    if (!prev || (c.id || 0) > (prev.id || 0)) cr.set(c.name, c);
  }
  for (const c of cr.values()) items.push({ name: c.name, status: effStatus(c), conclusion: c.conclusion });
  // workflow run: bản mới nhất theo workflow (lượt cũ bị hủy do concurrency hay lượt "ma" queued không tính)
  const wr = new Map();
  for (const r of workflowRuns) {
    if (r.path === SELF_PATH || (r.path || '').startsWith(SELF_PATH + '@')) continue;
    const k = r.workflow_id ?? r.name, prev = wr.get(k);
    // 20/11: lượt 'cancelled' (concurrency nhường lượt, vd. sự kiện labeled huỷ lượt cùng head) KHÔNG che lượt thật của cùng workflow trên cùng head:
    // luôn ưu tiên lượt mới nhất KHÔNG bị huỷ; chỉ khi mọi lượt đều bị huỷ mới dùng lượt huỷ mới nhất (rồi chạy lại ≤ MAX_AUTO_RERUN).
    const newer = (a, b) => (a.run_number || 0) > (b.run_number || 0) || ((a.run_number || 0) === (b.run_number || 0) && (a.id || 0) > (b.id || 0));
    const canc = x => x.conclusion === 'cancelled';
    if (!prev || (canc(prev) === canc(r) ? newer(r, prev) : canc(prev))) wr.set(k, r);
  }
  // 16/11 (điều phối): GitHub brownout `pull_request_target` (16:00–18:00 UTC) → wip-guard startup_failure trên mọi PR mở lúc đó, KHÔNG chạy lại được (rerun 403, chỉ chạy khi PR mở/mở lại) → gate đỏ oan cả PR xanh.
  // wip-guard chỉ gắn nhãn `frozen` (cảnh báo WIP), KHÔNG chấm mã PR → startup_failure của nó là lỗi hạ tầng: bỏ qua (neutral) và ghi vào `infra`, không chặn PR. Lỗi thật của wip-guard (failure) vẫn đỏ.
  const infra = [];
  for (const r of wr.values()) {
    const isInfra = INFRA_STARTUP.has(r.name) && r.conclusion === 'startup_failure';
    if (isInfra) infra.push(r.name);
    const advCancel = ADVISORY_CANCEL.has(r.name) && (r.conclusion === 'cancelled' || r.status !== 'completed');   // tư vấn: huỷ hoặc còn xếp hàng → trung hoà
    items.push({ name: 'workflow: ' + r.name, status: advCancel ? 'completed' : r.status, conclusion: (isInfra || advCancel) ? 'neutral' : r.conclusion, runId: r.id, attempt: r.run_attempt });
  }
  // commit status: mới nhất theo context, bỏ chính mình
  const st = new Map();
  for (const s of statuses) {
    if (s.context === CONTEXT || s.context === RETEST_CONTEXT || s.context === RECHECK_CONTEXT) continue;   // gate-retest (kết quả chạy lại test cổng) do phần drift xử lý, không phải check của PR
    const prev = st.get(s.context);
    if (!prev || String(s.updated_at || s.created_at || '') > String(prev.updated_at || prev.created_at || '') || (!s.updated_at && (s.id || 0) > (prev.id || 0))) st.set(s.context, s);
  }
  for (const s of st.values()) items.push(s.state === 'pending' ? { name: s.context, status: 'in_progress' } : { name: s.context, status: 'completed', conclusion: s.state });

  const failed = [], pending = [], cancelled = [];
  const active = items.some(i => i.runId && i.status !== 'completed');   // có lượt workflow chưa xong (lượt mới thay lượt bị concurrency huỷ) → job bị huỷ của lượt cũ không phải lỗi
  const retry = items.some(i => i.runId && i.conclusion === 'cancelled' && i.status === 'completed' && (i.attempt || 1) <= MAX_AUTO_RERUN);   // có lượt workflow bị huỷ còn được chạy lại
  for (const i of items) {
    if (i.status !== 'completed') pending.push(i.name);
    else if (OK.has(i.conclusion)) continue;
    else if (i.conclusion === 'cancelled' && i.runId && (i.attempt || 1) <= MAX_AUTO_RERUN) { cancelled.push({ runId: i.runId, attempt: i.attempt || 1, name: i.name }); pending.push(`${i.name} (huỷ – chạy lại)`); }
    else if (i.conclusion === 'cancelled' && !i.runId && (retry || active)) pending.push(`${i.name} (huỷ – chờ lượt ${retry ? 'chạy lại' : 'mới'})`);   // job/check bị huỷ của lượt workflow đang chạy lại / đã có lượt MỚI hơn đang chạy (concurrency nhường lượt: #1427, #1475 đỏ oan)
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
  else { state = 'success'; description = `Xanh: ${total} check đều đạt${infra.length ? ` (bỏ qua ${infra.join(', ')}: hạ tầng GitHub không khởi động)` : ''}`.slice(0, 140); }
  return { state, description, failed, pending, total, cancelled, infra };
}

// ---------- bộ canh (3/11): thay ~20 lượt workflow_run/commit bằng 1 runner canh liên tục ----------
// 15/11 (#1316 lọt cổng Sie): CI của PR chạy trên head + main LÚC ĐÓ; nếu sau đó main đổi chính FILE CỔNG (i18n-qa, bộ luật, test, workflow) thì kết quả xanh cũ chưa qua cổng mới.
// → gate xanh mà main đã đổi file cổng kể từ lần gộp main cuối của PR = CHỜ ("gộp lại main rồi chờ CI"). Chỉ tệp SỬA/XOÁ/ĐỔI TÊN trong scripts/test (tệp test mới thêm không đổi cổng cũ); workflow/i18n-qa/luật: mọi trạng thái.
// 16/11: workflow main đổi KHÔNG còn bắt mọi PR gộp lại (audio.yml, call-rt.yml… → 150 lượt chờ, 0 merge). Workflow chỉ tính khi CHÍNH PR cũng sửa file đó (GATE_WORKFLOW + prFiles); luật/policy (ci-policy, required-gate, i18n-qa, luật dịch) vẫn mọi PR.
export const GATE_WORKFLOW = /^\.github\/workflows\//;
// 16/11 (điều phối, #1397 rebase 3 lần 28/28 xanh vẫn kẹt): required-gate.mjs bỏ khỏi danh sách (nó tự chấm bằng bản main mới nhất, không làm đổi kết quả check của PR).
export const GATE_ANY = [/^scripts\/i18n-qa\.mjs$/, /^scripts\/lib\/[^/]*rules[^/]*\.mjs$/];
export const GATE_CHANGED = [/^scripts\/test\//];
export const SUITE = 'scripts/test/suite.txt';
/** Hàm thuần: files = [{ filename, status }] main đã đổi kể từ merge-base của PR → tệp cổng đã đổi VÀ có thể đổi kết quả PR này.
 *  prFiles = tệp PR đổi (null = chưa biết → tính hết); srcs = { tên tệp: nguồn bản main } đã tải sẵn (thiếu → giữ cách cũ: test/luật tính, workflow chỉ tính khi PR cũng sửa nó).
 *  Liên quan = PR cũng sửa đúng tệp đó · workflow có `pull_request.paths` khớp tệp PR · test/luật nhắc tới tệp PR (lib/gate-relevance.mjs). Tệp bị xoá không làm PR đỏ → bỏ qua. */
export const gateDrift = (files = [], prFiles = null, srcs = {}, ready = false) => files.filter(f => {
  const n = f.filename;
  if (/\(>300 tệp đổi\)/.test(n)) return true;
  if (GATE_WORKFLOW.test(n)) {
    if (!prFiles || prFiles.includes(n)) return true;
    if (typeof srcs[n] === 'string' && !ready && skipsOnPr(srcs[n])) return false;   // 20/11: workflow nặng bỏ qua trên PR không nhãn → không làm đổi kết quả PR
    return typeof srcs[n] === 'string' && f.status !== 'removed' && workflowMatches(srcs[n], prFiles);
  }
  if (!(GATE_ANY.some(r => r.test(n)) || (GATE_CHANGED.some(r => r.test(n)) && f.status !== 'added')) || f.status === 'removed') return false;
  if (!prFiles || prFiles.includes(n)) return true;
  // 18/11 (điều phối: #1587 đổi ads-demo-android.mjs → ~170 run chạy lại ở 12Z): test cấp trên cùng KHÔNG nằm trong suite.txt chỉ chạy bởi workflow riêng của nó (ads-demo.yml…, lượt PR của workflow đó luôn dùng main mới nhất) → không làm đổi kết quả PR khác.
  if (/^scripts\/test\/[^/]+\.mjs$/.test(n) && typeof srcs[SUITE] === 'string' && !srcs[SUITE].split('\n').some(l => l.includes(n))) return false;
  // 16/11 (điều phối): suite.txt = DANH SÁCH test, đổi mỗi khi thêm/bớt test → chỉ bắt PR khi PR đụng ĐÚNG một test có trong danh sách (khớp nguyên đường dẫn), không phải mọi PR chạm scripts/test
  if (n === 'scripts/test/suite.txt' && typeof srcs[n] === 'string') { const listed = new Set(srcs[n].split('\n').flatMap(l => l.match(/scripts\/test\/[\w./-]+/g) || [])); return prFiles.some(f => listed.has(f)); }
  return typeof srcs[n] !== 'string' || readsAny(srcs[n], prFiles);
}).map(f => f.filename);
/** Gate xanh nhưng main đã đổi tệp cổng → CHỜ (thuần). Không đụng đỏ/chờ. */
export const applyDrift = (res, drift) => res.state === 'success' && drift.length
  ? { ...res, state: 'pending', description: `Main đã đổi tệp cổng (${drift.slice(0, 2).map(f => f.split('/').pop()).join(', ')}${drift.length > 2 ? ` +${drift.length - 2}` : ''}): gộp lại main rồi chờ CI`.slice(0, 140), drift }
  : res;
/** 17/11 (điều phối): khung merge cổng 02:00–03:00Z (= 09–10 VN). PR TỰ đổi tệp cổng (cùng vị từ với gateDrift: workflow mọi trạng thái, luật, test sửa/đổi tên; bỏ tệp xoá) mà gate xanh ngoài khung → CHỜ, để main không đổi cổng cả ngày làm mọi PR khác phải gộp lại. */
export const MERGE_WINDOW_UTC = [2, 3];
export const inMergeWindow = (now = Date.now()) => { const h = new Date(now).getUTCHours(); return h >= MERGE_WINDOW_UTC[0] && h < MERGE_WINDOW_UTC[1]; };
export const gateFilesOf = (files = []) => files.filter(f => f.status !== 'removed' && (GATE_WORKFLOW.test(f.filename) || GATE_ANY.some(r => r.test(f.filename)) || (GATE_CHANGED.some(r => r.test(f.filename)) && f.status !== 'added'))).map(f => f.filename);
/** 21/11: PR gắn nhãn `main-red-fix` (chỉ điều phối gắn; sửa để mở main đang đỏ) không bị giữ bởi khung — main đỏ thì mọi PR đều kẹt, không chờ 24h. */
export const WINDOW_EXEMPT_LABEL = 'main-red-fix';
/** 25/11 (chủ: "làm luôn đừng đợi tới giờ hay khung"): TẮT giữ khung – PR đổi tệp cổng mà mọi check xanh được merge ngay; drift (applyDrift) vẫn bắt PR phải gộp lại main khi cổng đổi, nên an toàn. Bật lại = true. */
export const WINDOW_HOLD = false;
export const applyWindow = (res, gateFiles = [], now = Date.now(), labels = [], hold = WINDOW_HOLD) => hold && res.state === 'success' && gateFiles.length && !inMergeWindow(now) && !labels.includes(WINDOW_EXEMPT_LABEL)
  ? { ...res, state: 'pending', description: `Chờ khung merge cổng 09–10 VN (PR đổi tệp cổng: ${gateFiles.slice(0, 2).map(f => f.split('/').pop()).join(', ')}${gateFiles.length > 2 ? ` +${gateFiles.length - 2}` : ''})`.slice(0, 140), window: true }
  : res;
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
  const act = c => effStatus(c) !== 'completed';
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
    rerun: id => call(`/actions/runs/${id}/rerun`, { method: 'POST', body: '{}' }),
    // tệp main đã đổi kể từ merge-base với sha (2 lệnh, chỉ gọi cho sha sắp xanh); lỗi API → [] (mở cổng, không chặn oan)
    // 16/11 (điều phối): compare chỉ liệt kê 300 tệp/lần → trước đây ≥300 tệp = "(>300 tệp đổi)" = LUÔN chờ gộp lại (#1478 tự kẹt). Nay phân trang tới 10×100 tệp; chỉ khi vẫn cắt cụt mới dùng dấu hiệu chờ.
    // PR: cắt cụt → prFiles = null (chưa biết → tính hết, cách cũ). Tệp cổng: tải nguồn bản main để xét liên quan (≤ 40 tệp), lỗi/quá lớn → không có nguồn → giữ cách cũ.
    // tệp cổng mà CHÍNH PR đổi (khung merge cổng); lỗi API → [] (mở cổng)
    prLabels: async sha => ((await call(`/commits/${sha}/pulls`)) || []).filter(p => p.state === 'open').flatMap(p => (p.labels || []).map(l => l.name)),
    prGateFiles: async sha => { const files = []; for (let pg = 1; pg <= 10; pg++) { const r = await call(`/compare/main...${sha}?per_page=100&page=${pg}`); const f = r.files || []; files.push(...f); if (f.length < 100) break; } return gateFilesOf(files); },
    drift: async sha => {
      const cmp = async (spec, max = 10) => { let first, files = []; for (let pg = 1; pg <= max; pg++) { const r = await call(`/compare/${spec}?per_page=100&page=${pg}`); first ??= r; const f = r.files || []; files.push(...f); if (f.length < 100) return { first, files, truncated: false }; } return { first, files, truncated: true }; };
      const pc = await cmp(`main...${sha}`), mb = pc.first.merge_base_commit?.sha; if (!mb) return [];
      const prFiles = pc.truncated ? null : pc.files.map(x => x.filename);
      const c = await cmp(`${mb}...main`), all = c.truncated ? [...c.files, { filename: '.github/workflows/(>300 tệp đổi)', status: 'modified' }] : c.files;
      const cand = all.filter(f => f.status !== 'removed' && (GATE_WORKFLOW.test(f.filename) || GATE_ANY.some(r => r.test(f.filename)) || (GATE_CHANGED.some(r => r.test(f.filename)) && f.status !== 'added')) && !(prFiles || []).includes(f.filename) && !/\(>300/.test(f.filename)).slice(0, 40);
      const srcs = {};
      await Promise.all([...cand, ...(cand.some(f => /^scripts\/test\/[^/]+\.mjs$/.test(f.filename)) && !cand.some(f => f.filename === SUITE) ? [{ filename: SUITE }] : [])].map(async f => { try { const r = await call(`/contents/${f.filename.split('/').map(encodeURIComponent).join('/')}?ref=main`); if (r && r.encoding === 'base64' && typeof r.content === 'string') srcs[f.filename] = Buffer.from(r.content, 'base64').toString('utf8'); } catch {} }));
      let ready = true; try { ready = ((await call(`/commits/${sha}/pulls`))[0]?.labels || []).some(l => l.name === 'ready' || l.name === 'ready-heavy'); } catch { /* không biết nhãn → coi là có (cách cũ) */ }
      return gateDrift(all, prFiles, srcs, ready);
    },
    // gate-retest (docs/CI-RUNNERS.md): drift toàn là test trong suite → chạy THẬT các test đó (bản main) trên đầu PR bằng workflow nhẹ thay vì bắt gộp main (~100 job). Trả { clear } | { wait, note } | {} (= cách cũ).
    // Mọi bất định (không phải PR cùng repo, lỗi API, dispatch lỗi, kết quả đỏ/lỗi thời) → {} = đòi gộp main như cũ; không bao giờ mở cổng khi chưa có kết quả ĐẠT cho đúng sha main hiện tại.
    retest: async (sha, drift) => {
      const suite = await call('/contents/scripts/test/suite.txt?ref=main'); if (!suite || suite.encoding !== 'base64') return {};
      let prFiles = null;
      if (drift.includes(SUITE)) { const c = await call(`/compare/main...${sha}?per_page=100`); if (c && !(c.files && c.files.length >= 100)) prFiles = (c.files || []).map(x => x.filename); }   // suite.txt trong drift: cần biết PR đụng test nào
      const plan = retestPlan(drift, Buffer.from(suite.content, 'base64').toString('utf8'), prFiles); if (!plan.ok) return {};
      const prs = await call(`/commits/${sha}/pulls`); if (!(prs || []).some(p => p.head && p.head.sha === sha && p.head.repo && p.head.repo.full_name === repo)) return {};   // chỉ PR cùng repo
      const main = (await call('/branches/main')).commit.sha, st = ((await call(`/commits/${sha}/status?per_page=100`)).statuses || []).find(x => x.context === RETEST_CONTEXT), v = retestVerdict(st, main);
      if (v === 'clear') return { clear: true };
      const note = `Chạy lại ${plan.cmds.length} test cổng đổi trên head PR (gate-retest, main@${tagOf(main)}) thay cho gộp main`;
      if (v === 'wait') return { wait: true, note };
      if (v === 'inconclusive') return {};
      const runs = ((await call(`/actions/workflows/${RETEST_WORKFLOW}/runs?per_page=30`)).workflow_runs || []).filter(r => String(r.display_title || '').includes(sha) && String(r.display_title).includes(main));
      const live = runs.some(r => r.status !== 'completed' || Date.now() - new Date(r.created_at) < 20 * 60e3);
      if (!live) {
        await call(`/actions/workflows/${RETEST_WORKFLOW}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { sha, main, cmds: plan.cmds.join('\n') } }) });
        await call(`/statuses/${sha}`, { method: 'POST', body: JSON.stringify({ state: 'pending', context: RETEST_CONTEXT, description: `main@${tagOf(main)}: đang chạy lại ${plan.cmds.length} test cổng` }) });
      }
      return { wait: true, note };
    },
    // merge-recheck (máy gác 2/4): trả {} = đạt/không áp dụng · { wait, note } = đang đo · { fail, note } = ghép main làm đỏ check rẻ. Chỉ PR cùng repo.
    recheck: async sha => {
      const prs = await call(`/commits/${sha}/pulls`); if (!(prs || []).some(p => p.head && p.head.sha === sha && p.head.repo && p.head.repo.full_name === repo)) return {};
      const main = (await call('/branches/main')).commit.sha, st = ((await call(`/commits/${sha}/status?per_page=100`)).statuses || []).find(x => x.context === RECHECK_CONTEXT);
      const m = st && /main@([0-9a-f]{8})/.exec(st.description || ''), ahead = m ? ((await call(`/compare/${m[1]}...${main}`).catch(() => null)) || {}).ahead_by ?? null : null;
      const v = recheckVerdict(st, ahead);
      if (v === 'clear') return {};
      if (v === 'fail') return { fail: true, note: st.description };
      const note = `Chờ kiểm check rẻ trên PR ghép main@${tagOf(main)} (merge-recheck)`;
      const runs = ((await call('/actions/workflows/merge-recheck.yml/runs?per_page=30')).workflow_runs || []).filter(r => String(r.display_title || '').includes(sha));
      if (!(runs.some(r => r.status !== 'completed' || Date.now() - new Date(r.created_at) < 15 * 60e3))) {
        await call('/actions/workflows/merge-recheck.yml/dispatches', { method: 'POST', body: JSON.stringify({ ref: 'main', inputs: { sha, main } }) });
        await call(`/statuses/${sha}`, { method: 'POST', body: JSON.stringify({ state: 'pending', context: RECHECK_CONTEXT, description: `main@${tagOf(main)}: đang đo check rẻ khi ghép main` }) });
      }
      return { wait: true, note };
    },
    pr: n => call(`/pulls/${n}`),
    openPrs: () => pages('/pulls?state=open&sort=updated&direction=desc', null, 2),
    // tự nối (3/11): cron GitHub có lúc bỏ lượt hàng giờ (02/11: ci-triage + free-tier-guard 13 giờ) → bộ canh tự xếp lượt kế tiếp
    dispatchRuns: async () => (await call(`/actions/workflows/${path.basename(SELF_PATH)}/runs?event=workflow_dispatch&per_page=5`)).workflow_runs || [],
    lastRun: async file => ((await call(`/actions/workflows/${file}/runs?per_page=1`)).workflow_runs || [])[0] || null,
    // 23/11: nhịp PACED không dispatch khi cùng workflow + ref đang chờ/chạy (dispatch-once.mjs)
    dispatchFile: async (file, ref) => dispatchOnce({ runs: async f => (await Promise.all(['queued', 'in_progress'].map(async s => (await call(`/actions/workflows/${f}/runs?status=${s}&per_page=20`)).workflow_runs || []))).flat(), dispatch: (f, r) => call(`/actions/workflows/${f}/dispatches`, { method: 'POST', body: JSON.stringify({ ref: r }) }) }, file, ref),
    dispatchSelf: async (ref, slot) => call(`/actions/workflows/${path.basename(SELF_PATH)}/dispatches`, { method: 'POST', body: JSON.stringify({ ref, ...(slot ? { inputs: { slot } } : {}) }) }),
    // bộ canh khác đang chạy/xếp hàng (tên lượt `required-gate watch …`, không phải lượt theo PR, không phải chính mình; lượt cron cũng tính là bộ canh sống)
    otherWatchers: async self => (await Promise.all(['in_progress', 'queued'].map(async st => (await call(`/actions/workflows/${path.basename(SELF_PATH)}/runs?status=${st}&per_page=20`)).workflow_runs || []))).flat()
      .filter(r => /^required-gate watch/.test(r.display_title || r.name || '') && String(r.id) !== String(self)),
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
// 24/11 (#580): GitHub cũng không bao giờ chạy lịch của 5 workflow này (cron-watch: "CHƯA TỪNG có lượt schedule", đã đá disable→enable mà vẫn không; hàng chờ > 20 nên không dispatch bù) → cùng cách: bộ canh làm nhịp theo ĐÚNG khoảng cron của từng workflow (ngày/tuần), cron giữ làm lưới. video-junk chỉ liệt kê (dry-run), không xoá.
// 25/11: ci-autopilot (cron 7-57/10) cũng không chạy theo lịch: lượt cuối 23:22Z, 2 giờ không ai gỡ xung đột/huỷ lượt treo → bộ canh làm nhịp 10 phút.
/** Chu kỳ hỏi API của bộ canh (thuần). 26/11: "API rate limit exceeded for installation" – GITHUB_TOKEN dùng chung ~1.000 lệnh/giờ/repo bị các workflow cùng cạn; bộ canh (30–60 s/vòng, vài lệnh mỗi vòng) là
 *  một trong những nơi tiêu nhiều nhất. Nới theo hạn mức còn lại (<500 → 90 s, <300 → 180 s, <150 → chờ tới reset) và khi đã có bộ canh KẾ TIẾP sống (lượt cũ chỉ còn là dự phòng): ≥ 180 s. */
export function nextWait({ remaining = Infinity, reset = 0, now = 0, busy = false, backup = false } = {}) {
  if (remaining < 150) return Math.max(60e3, reset - now);
  const base = busy ? 30e3 : 60e3;
  const byRate = remaining < 300 ? 180e3 : remaining < 500 ? 90e3 : 0;
  return Math.max(base, byRate, backup ? 180e3 : 0);
}
export const PACED = { 'ci-filler.yml': 10, 'ci-autopilot.yml': 10, 'd1-usage-watch.yml': 20, 'tr-packs.yml': 1440, 'words-r2-sync.yml': 1440, 'say-native.yml': 1440, 'teacher-motion.yml': 1440, 'video-junk.yml': 10080, 'main-red-retry.yml': 10 };
/** Tới nhịp chưa (thuần): không có lượt đang chờ/chạy thật và lượt cuối đã quá khoảng lịch. */
export const paceDue = (last, gapMin, now) => !last || (last.status === 'completed' || isZombie(last, now)) && now - Date.parse(last.created_at) >= gapMin * 6e4;
/** Chạy lại các lượt workflow bị huỷ (res.cancelled); mỗi runId:attempt chỉ 1 lần mỗi lượt canh. */
export async function rerunCancelled(A, res, done, log = console.log) {
  for (const c of res.cancelled || []) {
    const k = c.runId + ':' + c.attempt; if (done.has(k)) continue; done.add(k);
    try { await A.rerun(c.runId); log(`↻ chạy lại ${c.name} (lượt huỷ #${c.runId}, lần ${c.attempt})`); } catch (e) { log(`::warning::không chạy lại được ${c.name}: ${e.message}`); }
  }
}
export async function run(argv, env = process.env, A = null, log = console.log, clock = { now: () => Date.now(), sleep: ms => new Promise(r => setTimeout(r, ms)) }) {
  const arg = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const dry = argv.includes('--dry'), url = env.RUN_URL || '';
  A = A || api(env.GITHUB_TOKEN, env.GITHUB_REPOSITORY);
  const reran = new Set();
  // máy gác 2/4 (23/11): gate xanh còn phải qua check rẻ (size/docs/content-qa/fmt) trên PR GHÉP với main hiện tại (merge-recheck.yml) – hai PR riêng xanh, ghép vượt ngân sách.
  const withRecheck = async (res, sha) => {
    if (res.state !== 'success' || !A.recheck) return res;
    try { const k = await A.recheck(sha); if (k.wait) return { ...res, state: 'pending', description: String(k.note).slice(0, 140) }; if (k.fail) return { ...res, state: 'failure', description: String(k.note).slice(0, 140) }; }
    catch (e) { log('::warning::merge-recheck lỗi (mở cổng, kiểm lại khi gộp): ' + e.message); }
    return res;
  };
  const withDrift = async (res, sha) => withRecheck(await withDrift0(res, sha), sha);
  const withDrift0 = async (res, sha) => {
    if (res.state !== 'success') return res;
    if (A.prGateFiles && !inMergeWindow(clock.now())) { try { const w = applyWindow(res, await A.prGateFiles(sha), clock.now(), A.prLabels ? await A.prLabels(sha).catch(() => []) : []); if (w.window) return w; } catch (e) { log('::warning::đo tệp cổng của PR lỗi (mở cổng): ' + e.message); } }
    if (!A.drift) return res;
    try {
      let d = await A.drift(sha);
      if (d.length && A.retest) {
        let r = {}; try { r = await A.retest(sha, d) || {}; } catch (e) { log('::warning::gate-retest lỗi (dùng cách cũ: đòi gộp main): ' + e.message); }
        if (r.clear) d = [];
        else if (r.wait) return { ...res, state: 'pending', description: String(r.note).slice(0, 140), drift: d };
      }
      return applyDrift(res, d);
    } catch (e) { log('::warning::đo tệp cổng lỗi (mở cổng): ' + e.message); return res; }
  };
  const one = async sha => {
    const res = await withDrift(evaluate(await A.gather(sha)), sha);
    log(`${sha.slice(0, 8)} → ${res.state}: ${res.description}`);
    if (!dry) { await A.post(sha, res, url); await rerunCancelled(A, res, reran, log); }
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
    // 25/11: lượt canh dài (330 phút) + HAI Ô luân phiên (a/b, mỗi ô một nhóm concurrency): lượt kế tiếp được dispatch khi còn 45 phút và xếp hàng runner TRONG KHI lượt này còn chạy
    // → hàng chờ 133 lượt (25/11 04:14Z–04:51Z) không còn làm gate hở 37 phút. Lượt ngắn (≤ 90 phút, test/dry) giữ cách cũ: nối ở 6 phút cuối cùng một ô.
    const longWatch = Number(arg('--watch')) > 90, CHAIN_BEFORE = (longWatch ? 45 : 6) * 60e3, slot = env.GATE_SLOT === 'b' ? 'b' : 'a', nextSlot = longWatch ? (slot === 'a' ? 'b' : 'a') : undefined;
    // lượt `schedule` (lưới 17,47) mà đã có bộ canh khác sống (chạy hoặc đang xếp hàng) → thoát ngay, không chạy bộ canh thứ hai song song
    if (env.GATE_EVENT === 'schedule' && A.otherWatchers && !dry) { try { const o = await A.otherWatchers(env.GITHUB_RUN_ID); if (o.length) { log(`• đã có bộ canh khác sống (${o.map(r => r.id + ':' + r.status).join(', ')}) – lượt lịch thoát`); return out; } } catch (e) { log('::warning::kiểm bộ canh khác: ' + e.message); } }
    const paceAt = new Map(); let chainAt = 0, chainTries = 0, nextAlive = false;   // nextAlive: lượt canh kế tiếp đã sống → lượt này chỉ còn là dự phòng (hỏi API thưa hơn)
    while (clock.now() < end) {
      if (chainAt && A.dispatchRuns && clock.now() - chainAt >= CHAIN_CHECK_MS) try {
        if (chainAlive(await A.dispatchRuns(), chainAt)) { chainAt = 0; nextAlive = true; log('↻ lượt canh kế tiếp đã sống – lượt này chuyển sang nhịp thưa (dự phòng)'); }
        else if (chainTries++ < CHAIN_RETRIES) { await A.dispatchSelf(env.GATE_CHAIN_REF, nextSlot); chainAt = clock.now(); log(`::warning::lượt nối kẹt queued → dispatch lại (${chainTries}/${CHAIN_RETRIES})`); }
        else { chainAt = 0; log('::error::lượt nối vẫn kẹt sau khi dispatch lại – chờ lịch 17,47 / cron-kick (15 phút)'); }
      } catch (e) { log('::warning::kiểm lượt nối: ' + e.message); }
      if (env.GATE_CHAIN_REF && !dry && A.dispatchFile) for (const [file, gap] of Object.entries(PACED)) {
        if (clock.now() < (paceAt.get(file) || 0)) continue;
        paceAt.set(file, clock.now() + 60e3);
        try { if (paceDue(await A.lastRun(file), gap, clock.now())) { await A.dispatchFile(file, env.GATE_CHAIN_REF); log(`⏱ nhịp ${file}: đã dispatch`); paceAt.set(file, clock.now() + gap * 60e3); } } catch (e) { log(`::warning::nhịp ${file}: ${e.message}`); }
      }
      if (!chained && end - clock.now() <= CHAIN_BEFORE) { chained = true; try { await A.dispatchSelf(env.GATE_CHAIN_REF, nextSlot); chainAt = clock.now(); log('↻ đã xếp lượt canh kế tiếp'); } catch (e) { log('::warning::không tự nối được (lịch 17,47 vẫn là lưới): ' + e.message); } }
      // 15/11 (#1355, #1376 kẹt pending phải dispatch tay): 1 lỗi API (502/429) ném ra khỏi vòng làm bộ canh chết tới lượt nối kế (15–30 phút) → vòng nào lỗi thì ghi cảnh báo, chờ rồi thử lại
      let t, prs, shas;
      try { t = clock.now(); prs = (await A.openPrs()).filter(p => Date.parse(p.updated_at) >= since()); shas = [...new Set(prs.map(p => p.head.sha))]; }
      catch (e) { log('::warning::liệt kê PR lỗi API – thử lại sau 60 s: ' + e.message); if (clock.now() + 60e3 >= end) break; await clock.sleep(60e3); continue; }
      if (first) {   // mồi: gate đã xanh/đỏ thì ghi nhận (1 lệnh/PR), pending/thiếu thì đánh giá ngay
        for (const sha of shas) { const g = await A.gateState(sha); if (g && g.state !== 'pending') seen.set(sha, { at: Date.parse(g.updated_at || g.created_at) || t, state: g.state, desc: g.description }); }
        first = false;
      }
      let runs; try { runs = await A.recentRuns(); } catch (e) { log('::warning::liệt kê lượt chạy lỗi API – thử lại sau 60 s: ' + e.message); if (clock.now() + 60e3 >= end) break; await clock.sleep(60e3); continue; }
      const probes = new Map(), why = new Map();
      // thăm dò chỉ khi còn hạn mức dư (≥ 400/giờ): lúc CI bận ETag đổi liên tục, 20 sha × 60–120 vòng/giờ có thể ăn hết 1.000 lệnh của GITHUB_TOKEN → nhường cho đánh giá chính (lưới recheck 10 phút vẫn còn)
      if (A.probe && ((A.rate && A.rate.remaining) ?? Infinity) >= 600) for (const sha of shas.filter(x => ['pending', 'failure'].includes(seen.get(x)?.state)).slice(0, 20)) try { probes.set(sha, await A.probe(sha)); } catch (e) { log('::warning::probe ' + sha.slice(0, 8) + ': ' + e.message); }
      const dirty = dirtyShas({ shas, runs, seen, now: t, probes, why }).slice(0, 25);   // ≤ 25 sha/vòng: hạn mức GITHUB_TOKEN 1.000 lệnh/giờ
      for (const p of prs) if (!born.has(p.head.sha)) born.set(p.head.sha, first ? Date.parse(p.updated_at) : t);   // lượt mồi: lấy lúc PR cập nhật
      for (const sha of dirty) try {
        const at = clock.now(), s = seen.get(sha);
        if (why.get(sha) === 'stale' || why.get(sha) === 'rerun') log(`gate-${why.get(sha)}: PR #${prs.find(p => p.head.sha === sha)?.number} tự đánh giá lại`);
        // 20/11 (#1664 kẹt "Chờ 2/18: npm test" dù npm test xong 14 s sau lần đánh giá): chữ ký thăm dò phải lấy TRƯỚC khi đọc dữ liệu đánh giá.
        // Trước đây sha mới (không có trong probes) bị thăm dò SAU gather → check xong giữa hai lệnh làm chữ ký mới khớp chữ ký đã lưu → không bao giờ thấy thay đổi
        // (chỉ lưới 'stale' 5 phút cứu). Lấy trước: chữ ký cũ ≠ chữ ký hiện tại ở vòng sau → đánh giá lại ngay.
        let pre = probes.get(sha) || null; if (!pre && A.probe) try { pre = await A.probe(sha); } catch { /* lần sau */ }
        let res = await withDrift(evaluate(await A.gather(sha)), sha), recheckAt = 0;
        if (res.state === 'success' && at - born.get(sha) < YOUNG) { recheckAt = born.get(sha) + YOUNG; res = { ...res, state: 'pending', description: 'Chờ workflow khởi động trên commit mới' }; }
        if (!s || s.state !== res.state || s.desc !== res.description) {
          log(`${sha.slice(0, 8)} → ${res.state}: ${res.description}`);
          if (!dry) await A.post(sha, res, url);
          out.push({ sha, ...res });
        }
        if (!dry) await rerunCancelled(A, res, reran, log);
        const attempts = {}; for (const r of runs) if (r.head_sha === sha) attempts[r.id] = r.run_attempt || 1;
        let sig = null; if (A.probe && (res.state === 'pending' || res.state === 'failure')) try { sig = (pre || await A.probe(sha)).sig; } catch { /* lần sau */ }
        seen.set(sha, { at: at - 5e3, state: res.state, desc: res.description, recheckAt, attempts, sig });   // lùi 5 s: lượt xong sát lúc đọc vẫn được thấy ở vòng sau
      } catch (e) { log(`::warning::đánh giá ${sha.slice(0, 8)} lỗi API – giữ nguyên, thử lại vòng sau: ${e.message}`); }
      for (const k of seen.keys()) if (!shas.includes(k)) seen.delete(k), born.delete(k);   // PR đã gộp/đóng/đẩy commit mới
      const rate = A.rate || { remaining: Infinity };
      const wait = nextWait({ remaining: rate.remaining, reset: rate.reset, now: clock.now(), busy: [...seen.values()].some(v => v.state === 'pending') || dirty.length > 0, backup: nextAlive });
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
