// Thử lại lỗi TẠM THỜI khi gọi mạng: HTTP 5xx và lỗi socket/DNS/timeout (fetch ném "fetch failed"/"terminated", UND_ERR_*, ECONNRESET…).
// 4xx / lỗi khác (lỗi code, JSON hỏng…): ném hoặc trả ngay, không thử lại.
//   await retry5xx(() => fetch(...))   → fn trả Response; 5xx hoặc lỗi mạng thì chờ 3s/9s rồi gọi lại (tối đa 3 lần thử)
//   await fetchRetry(url, opts)       → như trên NHƯNG đọc trọn body BÊN TRONG vòng thử (10/11 cdn-mirror đỏ: socket GitHub đóng giữa lúc
//                                       đọc body – "TypeError: terminated / SocketError: other side closed" – ngoài vòng retry5xx cũ)
// Bản shell cùng luật: scripts/ci/net-retry.sh (gh-retry.sh = tên cũ). Test: scripts/test/retry5xx.mjs.
import { isRateLimited, waitSeconds } from '../ci/gh-api.mjs';
// Hạn mức GitHub API (GITHUB_TOKEN ≈ 1000 lượt/giờ/repo trong Actions; 26/11: ci-autopilot, merge-recheck, pr-unconflict đỏ cùng lúc vì 403 rate limit): mọi lời gọi qua retry5xx
//  (1) đọc x-ratelimit-* để biết đã đốt bao nhiêu (quota), (2) gặp 403/429 do hạn mức thì chờ retry-after/reset (≤ RL_BUDGET_MS tổng) rồi gọi lại – không coi là lỗi thật,
//  (3) khi thoát tiến trình trong Actions in 1 dòng "gh-quota" (số lượt, còn lại, %) và ::warning:: nếu còn < 20 %.
export const RL_BUDGET_MS = +(process.env.GH_RL_BUDGET_MS || 100e3), RL_WARN = 0.2;
export const quota = { calls: 0, limited: 0, waitedMs: 0, remaining: null, limit: null, firstRemaining: null, reset: 0, resource: '' };
export function noteQuota(r) {
  const h = k => r?.headers?.get?.(k); quota.calls++;
  const rem = h('x-ratelimit-remaining'), lim = h('x-ratelimit-limit');
  if (rem != null && rem !== '') { quota.remaining = +rem; quota.limit = +lim || quota.limit; quota.reset = +h('x-ratelimit-reset') || quota.reset; quota.resource = h('x-ratelimit-resource') || quota.resource; if (quota.firstRemaining == null) quota.firstRemaining = +rem + 1; }
}
export const quotaPct = (q = quota) => (q.remaining != null && q.limit) ? q.remaining / q.limit : null;
export function quotaLine(label = '', q = quota) {
  const pct = quotaPct(q), used = q.firstRemaining != null && q.remaining != null ? q.firstRemaining - q.remaining : null;
  return `gh-quota ${label}: ${q.calls} lượt${used != null ? ` (trừ ${used} hạn mức)` : ''}${pct != null ? ` · còn ${q.remaining}/${q.limit} = ${(pct * 100).toFixed(0)} %${q.resource ? ' [' + q.resource + ']' : ''}` : ''}${q.limited ? ` · bị giới hạn ${q.limited} lần, chờ ${Math.round(q.waitedMs / 1000)} s` : ''}`;
}
let hooked = false;
function hook() {
  if (hooked || !process.env.GITHUB_ACTIONS) return; hooked = true;
  process.on('exit', () => { if (!quota.calls) return; const label = process.env.GITHUB_WORKFLOW || require_basename(process.argv[1]), pct = quotaPct();
    console.log(quotaLine(label)); if (pct != null && pct < RL_WARN) console.log(`::warning::gh-quota ${label}: hạn mức API còn ${(pct * 100).toFixed(0)} % (${quota.remaining}/${quota.limit}) – giảm polling/gộp lời gọi`); });
}
const require_basename = p => String(p || '').split('/').pop();
/** Số giây cần chờ nếu r là 403/429 do hạn mức (đọc thân qua clone, không tiêu thân của r); 0 = không phải. */
export async function rateWaitOf(r, now = Date.now()) {
  if (!r || (r.status !== 403 && r.status !== 429)) return 0;
  const hd = {}; try { r.headers?.forEach?.((v, k) => { hd[k.toLowerCase()] = v; }); } catch { /* không có headers */ }
  let text = ''; if (r.status === 403) { try { text = await r.clone().text(); } catch { /* không đọc được */ } }
  return isRateLimited(r.status, hd, text) ? waitSeconds(hd, { now, limited: true }) : 0;
}
export const BACKOFF_MS = [3000, 9000];   // 3 lần thử = 2 lần chờ giữa các lần
export const is5xx = s => Number(s) >= 500 && Number(s) <= 599;
const NET_CODES = /^(UND_ERR_|ECONNRESET|ECONNREFUSED|ECONNABORTED|ETIMEDOUT|EPIPE|EAI_AGAIN|ENOTFOUND|ENETUNREACH|EHOSTUNREACH)/;
export function isNetErr(e) {
  for (let x = e, d = 0; x && d < 4; x = x.cause, d++) {
    if (NET_CODES.test(String(x.code || ''))) return true;
    if (x.name === 'AbortError' || x.name === 'TimeoutError') return true;
    if (/^(fetch failed|terminated|other side closed|socket hang up)$/i.test(String(x.message || ''))) return true;
  }
  return false;
}
export async function retry5xx(fn, { backoff = BACKOFF_MS, sleep = ms => new Promise(r => setTimeout(r, ms)), log = m => console.warn(m), rlBudget = RL_BUDGET_MS } = {}) {
  hook(); let rlLeft = rlBudget;
  for (let i = 0; ; i++) {
    let r;
    try { r = await fn(); }
    catch (e) {
      if (!isNetErr(e) || i >= backoff.length) throw e;
      log(`⚠ lỗi mạng tạm thời (${e.cause?.code || e.code || e.message}) – thử lại ${i + 2}/${backoff.length + 1} sau ${backoff[i] / 1000}s`);
      await sleep(backoff[i]); continue;
    }
    noteQuota(r);
    const w = await rateWaitOf(r);
    if (w > 0) { // hạn mức: chờ đúng retry-after/reset nếu còn trong ngân sách chờ; không thì trả nguyên 403/429 cho nơi gọi
      quota.limited++; const ms = w * 1000;
      if (ms > rlLeft) { log(`⚠ GitHub API hết hạn mức, phải chờ ${w}s > ngân sách ${Math.round(rlLeft / 1000)}s – trả ${r.status}`); return r; }
      log(`⚠ GitHub API ${r.status} do hạn mức – chờ ${w}s rồi gọi lại`); rlLeft -= ms; quota.waitedMs += ms; await sleep(ms); i = Math.max(-1, i - 1); continue;
    }
    if (!is5xx(r?.status) || i >= backoff.length) return r;
    await sleep(backoff[i]);
  }
}
export const fetchRetry = (url, opts = {}, ro) => retry5xx(async () => {
  const r = await fetch(url, opts);
  const body = await r.arrayBuffer();   // đọc trọn trong vòng thử: socket đứt giữa body cũng được thử lại
  return new Response([101, 204, 205, 304].includes(r.status) ? null : body, { status: r.status, statusText: r.statusText, headers: r.headers });
}, ro);
/** fetch có chờ hạn mức + thử lại 5xx/lỗi mạng + đếm quota (dùng cho MỌI lời gọi api.github.com trong script CI). */
export const ghFetch = (url, init = {}, ro) => retry5xx(() => fetch(url, init), ro);
