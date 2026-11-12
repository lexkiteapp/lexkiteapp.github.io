// Kho tài khoản Workers AI miễn phí (secret CF_POOL) – MỘT nguồn cho vẽ ảnh (vocab-img/cf-direct.mjs) và văn bản/thị giác (ai-pool tuyến cf2).
// Bỏ VIMG_POOL_SKIP (5) tài khoản đầu (GrabCast còn dùng); thêm tài khoản 2 (CF_ACCOUNT_2) cuối; KHÔNG BAO GIỜ tài khoản chính (CF_ACCOUNT_1).
/** đọc CF_POOL → [[account, token]] – chỉ dòng Cloudflare (account = 32 hex), bỏ mọi dòng khác (tiêu đề, khoá Gemini/Groq…).
 *  Nhận "cf:<acct>:<token>" (tệp xuất kho khoá GrabCast), "<acct>:<token>", "<acct> <token>", hoặc JSON [{account, token}]. */
export function parsePool(raw) {
  raw = String(raw || '').trim();
  if (raw.startsWith('[')) { try { return JSON.parse(raw).map(o => [o.account || o.account_id || o.acct, o.token || o.api_token || o.tok]).filter(([a, t]) => a && t); } catch { return []; } }
  const out = [];
  for (const line of raw.split(/[\n,;]+/)) { const m = line.trim().match(/^(?:cf[:=\s])?([0-9a-f]{32})[:=\s|]+(\S+)$/i); if (m) out.push([m[1].toLowerCase(), m[2]]); }
  return out;
}

/** giữ chỗ cho pilot ảnh (02/11): biến repo CF_POOL_HOLD = "<n>@<hết hạn ISO>" → n tài khoản CUỐI kho chỉ dành cho job CF_POOL_ROLE=pilot tới khi hết hạn.
 *  Kho về 0 lúc 00:00 UTC và lexicon-expand (00:17, trần 600k, mọi tài khoản) + fill vét hết trong ~1 giờ → pilot 92 nghĩa (đuôi: 10 giám khảo + phần vẽ) không bao giờ đủ chỗ.
 *  Hết hạn → tự trả lại (không cần ai xoá biến). Sai định dạng → 0 (không giữ gì). → số tài khoản đang giữ */
export function poolHold(env = process.env, now = Date.now()) {
  const m = String(env.CF_POOL_HOLD || '').trim().match(/^(\d{1,3})@(\d{4}-\d{2}-\d{2}T[\d:.]+Z)$/);
  return m && Date.parse(m[2]) > now ? Math.min(+m[1], 60) : 0;
}
/** danh sách tài khoản dùng để vẽ (gộp token trùng tài khoản – token sau dự phòng khi token trước hỏng; không tài khoản chính) */
export function poolAccounts(env = process.env) {
  const by = new Map();
  for (const [a, t] of parsePool(env.CF_POOL)) (by.get(a) || by.set(a, []).get(a)).push(t);
  const skip = Math.max(0, +(env.VIMG_POOL_SKIP ?? 5)), out = [];
  [...by].slice(skip).forEach(([a, toks], i) => out.push({ id: 'pool' + (i + skip), acct: a, tok: toks[0], toks }));
  if (env.CF_ACCOUNT_2 && env.CF_AI_TOKEN_2 && env.VIMG_CF_USE_CF2 !== '0') out.push({ id: 'cf2', acct: env.CF_ACCOUNT_2, tok: env.CF_AI_TOKEN_2, toks: [env.CF_AI_TOKEN_2] });
  const main = String(env.CF_ACCOUNT_1 || '').toLowerCase(), seen = new Set();
  const all = out.filter(x => x.acct.toLowerCase() !== main && !seen.has(x.acct) && seen.add(x.acct)), hold = env.CF_POOL_ROLE === 'pilot' ? 0 : poolHold(env);
  return hold ? all.slice(0, Math.max(0, all.length - hold)) : all;   // giữ chỗ pilot: việc khác (fill, lexicon-expand, giám khảo fill) không thấy n tài khoản cuối
}

