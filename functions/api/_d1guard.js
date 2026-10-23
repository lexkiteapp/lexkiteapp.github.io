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
export const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
/** → { reads, writes|null, source: 'cloudflare'|'own', pct, at } */
export async function d1Usage(env, db, now = Date.now(), fetcher = fetch, which = 'main') {
  const C = CACHE[which];
  if (C && now - C.at < 300e3 && C.day === day(now)) return C.v;
  let v = null;
  const tok = env && (which === 'b' ? env.D1B_TOKEN : (env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN)), acct = env && (which === 'b' ? env.D1B_ACCOUNT_ID : env.CF_ACCOUNT_ID);
  if (tok && acct) {
    try {
      const d = day(now), r = await fetcher('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
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
  v.limit = cloud ? D1_LIMITS.reads : OWN_BUDGET; v.ratio = v.reads / v.limit; v.block = v.ratio >= (cloud ? GUARD_PCT : 1); v.alert = v.ratio >= ALERT_PCT;
  v.at = now; v.which = which; CACHE[which] = { at: now, day: day(now), v };
  return v;
}
export const resetD1Cache = () => { for (const k of Object.keys(CACHE)) delete CACHE[k]; };
/** which: 'main' | 'b' | ['main','b'] — mỗi tài khoản D1 đo RIÊNG. → null (cho qua) | Response 429. */
export async function guardBackground(env, db, json, which = 'main') {
  for (const w of [].concat(which)) {
    const u = await d1Usage(env, db, Date.now(), fetch, w);
    if (u.block) return json(429, { error: 'quota-guard', account: w, pct: Math.round(u.ratio * 100), source: u.source });
  }
  return null;
}
/** Cho endpoint Pages (youtube, backlinks, studio, report admin/CLI, distribution, admin-clips, admin-shorts…): → null | Response 429 quota-guard.
 * json(request, status, data) là hàm trả Response của endpoint. Lỗi đọc số liệu → cho qua (không bao giờ chặn nhầm). Việc người dùng KHÔNG gọi hàm này. */
export async function guardBg(request, env, json, which = 'main') {
  try { const u = await d1Usage(env, env.DB, Date.now(), fetch, which); if (u.block) return json(request, 429, { error: 'quota-guard', pct: Math.round(u.ratio * 100), source: u.source }); } catch (e) { /* cho qua */ }
  return null;
}

/** Đặt chỗ Workers AI tài khoản CHÍNH cho đường người dùng (infra/jobs.json › reservations.workers_ai): đường NỀN (CI: studio X-Studio-Secret, lexai OIDC) không được dùng binding env.AI
 * trừ khi sổ cấp background_neurons > 0 → các cổng AI rơi sang Gemini / tài khoản 2 / GrabCast. Không đọc D1. */
export function stripBackgroundAI(env) {
  const R = (REG.reservations || {}).workers_ai || {};
  if (+R.background_neurons > 0 || !env || !env.AI) return env;
  return Object.create(env, { AI: { value: null, enumerable: true } });
}
