/* Cầu dao D1 dùng chung (22/10/2026: 2 lần việc nền cạn hạn mức miễn phí 5 triệu dòng đọc/ngày làm sập tính năng người dùng).
 * - d1Usage(env, db): dòng đọc/ghi D1 CỦA CẢ TÀI KHOẢN hôm nay, từ Cloudflare GraphQL (d1AnalyticsAdaptiveGroups) khi có bí mật CF_ANALYTICS_TOKEN (quyền đọc Analytics) + CF_ACCOUNT_ID;
 *   không có → tự đếm (drive_meta 'd1r:<ngày>', chỉ phần Kho Drive qua metered()). Cache 5 phút trong isolate.
 * - guardBackground(env, db): việc nền/quản trị (drive.*, archive, verify, youtube.sync, báo cáo QC…) → Response 429 {error:'quota-guard'} khi dùng ≥ 50 % hạn mức đọc.
 *   Việc người dùng (đồng bộ, đăng nhập, bài học) KHÔNG BAO GIỜ gọi hàm này. CI: gặp 429 → dừng, mai chạy tiếp (không thử lại).
 * - Cảnh báo ≥ 60 %: thư + chuông Quản trị (drive_alerts kind 'd1'), tối đa 1 thư/24 h. */
import { REG } from './_jobs_reg.js';
export const D1_LIMITS = { reads: 5e6, writes: 1e5 };
export const GUARD_PCT = 0.5, ALERT_PCT = 0.6, OWN_BUDGET = 1.5e6;
// Sự cố 03/11 (Phân tích quét `sessions` → 5,1 M/5 M dòng đọc, Cloudflare báo 90 % trước mình): báo chủ ở 50 % & 75 % (functions/api/_d1watch.js, cron-kick 30 phút),
// từ 85 % mọi đường đọc KHÔNG thiết yếu (Quản trị, thông báo…) trả số liệu đệm hoặc 429 nhẹ 'quota-shed'. Đồng bộ thẻ, đăng nhập, tiến độ học không bao giờ bị cắt.
export const WARN_PCTS = [0.5, 0.75, 1], SHED_PCT = 0.85; // 1 = trần chi tiêu (gói Paid: dự báo vượt phần đã gồm → tốn tiền)
const CACHE = {}; // theo tài khoản: 'main' | 'b'
// 27/10: GraphQL Analytics không có hạn chờ → chậm/treo kéo cả yêu cầu Quản trị theo. ≤ 4 s, quá hạn → số tự đếm (đường dự phòng sẵn có, như khi thiếu token).
export const GQL_TIMEOUT_MS = 4000;
export const CI_FRESH_MS = 45 * 60e3; // số D1 do CI đẩy lên (20 phút/lần): quá 45 phút (2 lượt hỏng) → coi như không có
export const day = (t = Date.now()) => new Date(t).toISOString().slice(0, 10);
// 03/11 ~13:40Z: tài khoản CHÍNH lên Workers Paid ($5/tháng) – D1 hết trần ngày, có sẵn 25 tỷ dòng đọc + 50 triệu dòng ghi/THÁNG, vượt thì tính tiền.
// Tài khoản 2 (D1 nội bộ) vẫn Free. Gói Paid: ratio = DỰ BÁO cuối tháng / phần đã gồm (lấy max của nhịp cả tháng và nhịp hôm nay → vòng lặp lỗi lộ ra trong vài giờ).
// Mọi ngưỡng giữ nguyên trên ratio này: việc nền dừng 50 %, chuông 60 %, báo chủ 50/75 %, tiết kiệm 85 %, TRẦN CHI TIÊU ≥ 100 % (sắp tốn tiền thật) báo ngay. env.D1_PLAN ghi đè (free|paid).
export const D1_PAID = { reads: 25e9, writes: 5e7, since: '2026-11-03', usd: { readsPerM: 0.001, writesPerM: 1 } };
export const planOf = (env, which = 'main') => (env && /^(free|paid)$/.test(env.D1_PLAN || '') ? env.D1_PLAN : which === 'b' ? 'free' : 'paid');
export const month = (t = Date.now()) => day(t).slice(0, 7);
const monthStart = t => Date.parse(month(t) + '-01T00:00:00Z'), monthEnd = t => { const d = new Date(monthStart(t)); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); };
/** Dự báo tổng tháng: max(nhịp trung bình tháng × số ngày tháng, đã dùng + nhịp hôm nay × thời gian còn lại). Tối thiểu 1 ngày / 1 giờ để đầu kỳ không phóng đại. */
export function project(mtd, today, now = Date.now()) {
  const ms = monthStart(now), me = monthEnd(now), ds = Date.parse(day(now) + 'T00:00:00Z');
  const p1 = mtd / Math.max(86400e3, now - ms) * (me - ms), p2 = mtd + today / Math.max(3600e3, now - ds) * (me - now);
  return Math.round(Math.max(p1, p2, mtd));
}
/** @typedef {{ reads: number, writes: number|null, source: string, mReads?: number, mWrites?: number, via?: string, seen?: number,
 *   plan?: 'free'|'paid', period?: 'day'|'month', limit?: number, projReads?: number, projWrites?: number,
 *   ratio?: number, kind?: 'reads'|'writes', block?: boolean, alert?: boolean, spend?: boolean, at?: number, which?: string }} D1Usage */
/** → { reads, writes|null, source: 'cloudflare'|'own', ratio, at… }
 * @returns {Promise<D1Usage>} */
export async function d1Usage(env, db, now = Date.now(), fetcher = fetch, which = 'main') {
  const C = CACHE[which];
  if (C && now - C.at < 300e3 && C.day === day(now)) return C.v;
  /** @type {D1Usage|null} */ let v = null;
  const paid = planOf(env, which) === 'paid';
  const tok = env && (which === 'b' ? env.D1B_TOKEN : (env.CF_ANALYTICS_TOKEN || env.CF_API_TOKEN)), acct = env && (which === 'b' ? env.D1B_ACCOUNT_ID : env.CF_ACCOUNT_ID);
  if (tok && acct) {
    try {
      const d = day(now), r = await fetcher('https://api.cloudflare.com/client/v4/graphql', { method: 'POST', signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(+env.GQL_TIMEOUT_MS || GQL_TIMEOUT_MS) : undefined, headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: `query { viewer { accounts(filter:{accountTag:"${String(acct).replace(/[^a-f0-9]/gi, '')}"}) { d1AnalyticsAdaptiveGroups(limit:31, filter:{date_geq:"${paid ? month(now) + '-01' : d}", date_leq:"${d}"}) { dimensions { date } sum { rowsRead rowsWritten } } } } }` }) });
      const j = await r.json(), s = (((j.data || {}).viewer || {}).accounts || [])[0], gs = (s && s.d1AnalyticsAdaptiveGroups) || [];
      if (!s) throw new Error('graphql');
      v = { reads: 0, writes: 0, mReads: 0, mWrites: 0, source: 'cloudflare' };
      for (const g of gs) { const R = +g.sum.rowsRead || 0, W = +g.sum.rowsWritten || 0, gd = g.dimensions && g.dimensions.date; v.mReads += R; v.mWrites += W; if (!gd || gd === d) { v.reads += R; v.writes += W; } }
    } catch (e) { v = null; }
  }
  // 03/11: Pages chưa có CF_ANALYTICS_TOKEN → số Cloudflare do CI ghi (workflow d1-usage-watch.yml, 20 phút/lần → POST /api/capacity op usage → drive_meta 'd1u:<ngày>'); còn tươi ≤ 45 phút thì tin như số Cloudflare
  if (!v && which === 'main' && db) {
    try { const r = await db.prepare('SELECT v FROM drive_meta WHERE k = ?').bind('d1u:' + day(now)).first(), j = r && r.v ? JSON.parse(r.v) : null;
      if (j && now - (+j.at || 0) <= CI_FRESH_MS) v = { reads: +j.reads || 0, writes: +j.writes || 0, mReads: +j.mReads || +j.reads || 0, mWrites: +j.mWrites || +j.writes || 0, source: 'cloudflare', via: 'ci', seen: +j.at }; } catch (e) { /* không có số CI */ }
  }
  if (!v) {
    let n = 0; try { const r = await db.prepare('SELECT v FROM drive_meta WHERE k = ?').bind('d1r:' + day(now)).first(); n = r ? +r.v || 0 : 0; } catch (e) { n = 0; }
    v = { reads: n, writes: null, source: 'own' };
  }
  const cloud = v.source === 'cloudflare'; // tự đếm chỉ thấy phần Kho Drive → dùng ngân sách riêng 1,5 M (chặn ở 100 % ngân sách đó); số liệu cả tài khoản → chặn ở 50 % của 5 M
  // 26/10: tính CẢ dòng GHI (100k/ngày) – trước chỉ tính dòng đọc nên việc nền ghi vượt hạn mức mà cầu dao không ngắt ("D1 row write requests are temporarily blocked").
  let rr, rw;
  if (cloud && paid) { // gói Paid: dự báo tháng / phần đã gồm
    v.plan = 'paid'; v.period = 'month'; v.limit = D1_PAID.reads; v.projReads = project(v.mReads, v.reads, now); v.projWrites = project(v.mWrites, v.writes, now);
    rr = v.projReads / D1_PAID.reads; rw = v.projWrites / D1_PAID.writes;
  } else { v.plan = 'free'; v.period = 'day'; v.limit = cloud ? D1_LIMITS.reads : OWN_BUDGET; rr = v.reads / v.limit; rw = cloud && v.writes != null ? v.writes / D1_LIMITS.writes : 0; }
  v.ratio = Math.max(rr, rw); v.kind = rw > rr ? 'writes' : 'reads'; v.block = v.ratio >= (cloud ? GUARD_PCT : 1); v.alert = v.ratio >= ALERT_PCT; v.spend = cloud && paid && v.ratio >= 1;
  v.at = now; v.which = which; CACHE[which] = { at: now, day: day(now), v };
  return v;
}
export const resetD1Cache = () => { for (const k of Object.keys(CACHE)) delete CACHE[k]; delete PEEK.p; };
/** Giây tới 00:00 UTC (hạn mức D1 đặt lại) – dùng cho Retry-After của 429 'quota-shed' / 'quota'. */
export const secsToReset = (now = Date.now()) => Math.max(60, Math.ceil((Date.parse(day(now) + 'T00:00:00Z') + 86400e3 - now) / 1000));
const PEEK = {};
/** Xem nhanh mức dùng D1 (tài khoản chính) KHÔNG chờ mạng: có số trong bộ nhớ isolate (≤ 5 phút) → trả ngay; chưa có → làm mới nền, lần này trả null (cho qua).
 * Cho đường người dùng/không thiết yếu: không bao giờ thêm độ trễ GraphQL vào yêu cầu. */
export function usagePeek(env, db, now = Date.now(), fetcher = fetch) {
  const C = CACHE.main;
  if (C && now - C.at < 300e3 && C.day === day(now)) return C.v;
  if (!PEEK.p) PEEK.p = d1Usage(env, db, now, fetcher, 'main').catch(() => null).finally(() => { delete PEEK.p; });
  return C && C.day === day(now) ? C.v : null; // số cũ cùng ngày (quá 5 phút) vẫn tốt hơn không có
}
/** ≥ 85 % dòng đọc/ghi hôm nay (số Cloudflare cả tài khoản) → chế độ tiết kiệm. Tự đếm (thiếu token) không đủ tin để cắt → false. */
export const isShed = u => !!(u && u.source === 'cloudflare' && u.ratio >= SHED_PCT);
export const SHED_BODY = { error: 'quota-shed', reason: 'd1-85' };
/** Endpoint đọc không thiết yếu (thông báo, quản trị phụ…): ≥ 85 % → Response 429 nhẹ (Retry-After tới 00:00 UTC), ngược lại null. Không chờ mạng. */
export function shedRead(env, mk, now = Date.now()) {
  try {
    const u = usagePeek(env, env && env.DB, now); if (!isShed(u)) return null;
    const s = secsToReset(now), r = mk(429, { ...SHED_BODY, pct: Math.round(u.ratio * 100), retry: s });
    try { r.headers.set('Retry-After', String(s)); } catch (e) { /* header bất biến */ }
    return r;
  } catch (e) { /* cho qua */ }
  return null;
}
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
export function restAi(accountId, token, fetcher = /** @type {typeof fetch} */ ((input, init) => fetch(input, init))) {
  return { run: async (model, input) => {
    const r = await fetcher(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${model}`, { method: 'POST', headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.success === false) { const e = /** @type {Error & { status?: number }} */ (new Error('ai-b-' + ((j.errors && j.errors[0] && j.errors[0].code) || r.status))); e.status = r.status; throw e; }
    return j.result;
  } };
}
/** Đặt chỗ Workers AI tài khoản CHÍNH cho đường người dùng (infra/jobs.json › reservations.workers_ai): đường NỀN (CI: studio X-Studio-Secret, lexai OIDC) KHÔNG dùng binding env.AI chính
 * (trừ khi sổ cấp background_neurons > 0) mà dùng Workers AI của TÀI KHOẢN 2 qua REST (AI_B_ACCOUNT_ID/AI_B_TOKEN, mặc định D1B_ACCOUNT_ID/D1B_TOKEN); chưa cấu hình → env.AI = null (cổng AI rơi sang Gemini/GrabCast). Không đọc D1. */
export function stripBackgroundAI(env, fetcher) {
  const R = /** @type {{ background_neurons?: number }} */ ((REG.reservations || {}).workers_ai || {});
  if (+R.background_neurons > 0 || !env) return env;
  const acct = env.AI_B_ACCOUNT_ID || env.D1B_ACCOUNT_ID, tok = env.AI_B_TOKEN || env.D1B_TOKEN;
  if (!env.AI && !(acct && tok)) return env;
  return Object.create(env, { AI: { value: acct && tok ? restAi(acct, tok, fetcher) : null, enumerable: true } });
}
