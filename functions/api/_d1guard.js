/* Cầu dao D1 dùng chung (22/10/2026: 2 lần việc nền cạn hạn mức miễn phí 5 triệu dòng đọc/ngày làm sập tính năng người dùng).
 * - d1Usage(env, db): dòng đọc/ghi D1 CỦA CẢ TÀI KHOẢN hôm nay, từ Cloudflare GraphQL (d1AnalyticsAdaptiveGroups) khi có bí mật CF_ANALYTICS_TOKEN (quyền đọc Analytics) + CF_ACCOUNT_ID;
 *   không có → tự đếm (drive_meta 'd1r:<ngày>', chỉ phần Kho Drive qua metered()). Cache 5 phút trong isolate.
 * - guardBackground(env, db): việc nền/quản trị (drive.*, archive, verify, youtube.sync, báo cáo QC…) → Response 429 {error:'quota-guard'} khi dùng ≥ 50 % hạn mức đọc.
 *   Việc người dùng (đồng bộ, đăng nhập, bài học) KHÔNG BAO GIỜ gọi hàm này. CI: gặp 429 → dừng, mai chạy tiếp (không thử lại).
 * - Cảnh báo ≥ 60 %: thư + chuông Quản trị (drive_alerts kind 'd1'), tối đa 1 thư/24 h. */
import { REG } from './_jobs_reg.js';
export const D1_LIMITS = { reads: 5e6, writes: 1e5 };
export const GUARD_PCT = 0.5, ALERT_PCT = 0.6, OWN_BUDGET = 1.5e6;
const CACHE = {}; // theo tài khoản: 'main' | 'b'
// 27/10: GraphQL Analytics không có hạn chờ → chậm/treo kéo cả yêu cầu Quản trị theo. ≤ 4 s, quá hạn → số tự đếm (đường dự phòng sẵn có, như khi thiếu token).
export const GQL_TIMEOUT_MS = 4000;
export const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
/** → { reads, writes|null, source: 'cloudflare'|'own', pct, at } */
export async function d1Usage(env, db, now = Date.now(), fetcher = fetch, which = 'main') {
  const C = CACHE[which];
  if (C && now - C.at < 300e3 && C.day === day(now)) return C.v;
  let v = null;
  const tok = env && (which === 'b' ? env.D1B_TOKEN : (env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN)), acct = env && (which === 'b' ? env.D1B_ACCOUNT_ID : env.CF_ACCOUNT_ID);
  if (tok && acct) {
    try {
      const d = day(now), r = await fetcher('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(+env.GQL_TIMEOUT_MS || GQL_TIMEOUT_MS) : undefined, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { viewer { accounts(filter:{accountTag:"${String(acct).replace(/[^a-f0-9]/gi, '')}"}) { d1AnalyticsAdaptiveGroups(limit:1, filter:{date_geq:"${d}", date_leq:"${d}"}) { sum { rowsRead rowsWritten } } } } }` }) });
      const j = await r.json(), s = (((j.data || {}).viewer || {}).accounts || [])[0], g = s && s.d1AnalyticsAdaptiveGroups && s.d1AnalyticsAdaptiveGroups[0];
      v = g ? { reads: +g.sum.rowsRead || 0, writes: +g.sum.rowsWritten || 0, source: 'cloudflare' } : { reads: 0, writes: 0, source: 'cloudflare' };
    } catch (e) { v = null; }
  }
  if (!v) {
    let n = 0; try { const r = await db.prepare('SELECT v FROM drive_meta WHERE k = ?').bind('d1r:' + day(now)).first(); n = r ? +r.v || 0 : 0; } catch (e) { n = 0; }
    v = { reads: n, writes: null, source: 'own' };
  }
  const cloud = v.source === 'cloudflare'; // tự đếm chỉ thấy phần Kho Drive → dùng ngân sách riêng 1,5 M (chặn ở 100 % ngân sách đó); số liệu cả tài khoản → chặn ở 50 % của 5 M
  // 26/10: tính CẢ dòng GHI (100k/ngày) – trước chỉ tính dòng đọc nên việc nền ghi vượt hạn mức mà cầu dao không ngắt ("D1 row write requests are temporarily blocked").
  v.limit = cloud ? D1_LIMITS.reads : OWN_BUDGET; const rr = v.reads / v.limit, rw = cloud && v.writes != null ? v.writes / D1_LIMITS.writes : 0;
  v.ratio = Math.max(rr, rw); v.kind = rw > rr ? 'writes' : 'reads'; v.block = v.ratio >= (cloud ? GUARD_PCT : 1); v.alert = v.ratio >= ALERT_PCT;
  v.at = now; v.which = which; CACHE[which] = { at: now, day: day(now), v };
  return v;
}
export const resetD1Cache = () => { for (const k of Object.keys(CACHE)) delete CACHE[k]; };
/** which: 'main' | 'b' | ['main','b'] — mỗi tài khoản D1 đo RIÊNG. → null (cho qua) | Response 429. */
export async function guardBackground(env, db, json, which = 'main') {
  for (const w of [].concat(which)) {
    const u = await d1Usage(env, db, Date.now(), fetch, w);
    if (u.block) return json(429, { error: 'quota-guard', account: w, pct: Math.round(u.ratio * 100), kind: u.kind, source: u.source });
  }
  return null;
}
/** Cho endpoint Pages (youtube, backlinks, studio, report admin/CLI, distribution, admin-clips, admin-shorts…): → null | Response 429 quota-guard.
 * json(request, status, data) là hàm trả Response của endpoint. Lỗi đọc số liệu → cho qua (không bao giờ chặn nhầm). Việc người dùng KHÔNG gọi hàm này. */
export async function guardBg(request, env, json, which = 'main') {
  try { const u = await d1Usage(env, env.DB, Date.now(), fetch, which); if (u.block) return json(request, 429, { error: 'quota-guard', pct: Math.round(u.ratio * 100), kind: u.kind, source: u.source }); } catch (e) { /* cho qua */ }
  return null;
}

/** Workers AI qua REST của TÀI KHOẢN 2 (cùng giao diện env.AI.run(model, input) → result). Token cần quyền Account › Workers AI › Read + Edit. */
export function restAi(accountId, token, fetcher = (...a) => fetch(...a)) {
  return { run: async (model, input) => {
    const r = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) { const e = new Error('ai-b-' + ((j.errors && j.errors[0] && j.errors[0].code) || r.status)); e.status = r.status; throw e; }
    return j.result;
  } };
}
/** Đặt chỗ Workers AI tài khoản CHÍNH cho đường người dùng (infra/jobs.json › reservations.workers_ai): đường NỀN (CI: studio X-Studio-Secret, lexai OIDC) KHÔNG dùng binding env.AI chính
 * (trừ khi sổ cấp background_neurons > 0) mà dùng Workers AI của TÀI KHOẢN 2 qua REST (AI_B_ACCOUNT_ID/AI_B_TOKEN, mặc định D1B_ACCOUNT_ID/D1B_TOKEN); chưa cấu hình → env.AI = null (cổng AI rơi sang Gemini/GrabCast). Không đọc D1. */
export function stripBackgroundAI(env, fetcher) {
  const R = (REG.reservations || {}).workers_ai || {};
  if (+R.background_neurons > 0 || !env) return env;
  const acct = env.AI_B_ACCOUNT_ID || env.D1B_ACCOUNT_ID, tok = env.AI_B_TOKEN || env.D1B_TOKEN;
  if (!env.AI && !(acct && tok)) return env;
  return Object.create(env, { AI: { value: acct && tok ? restAi(acct, tok, fetcher) : null, enumerable: true } });
}
