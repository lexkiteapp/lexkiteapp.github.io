// Vẽ ảnh THẲNG trên Workers AI (REST), không qua GrabCast (26/10: GrabCast trả 500 cho 700/700 lượt ảnh → vocab-img-scene dừng).
// Tài khoản (thứ tự dùng): CF_POOL (kho tài khoản miễn phí, chủ dán vào secret; bỏ VIMG_POOL_SKIP=5 tài khoản đầu – GrabCast còn dùng) → tài khoản 2 (CF_ACCOUNT_2/CF_AI_TOKEN_2).
// CF_POOL: mỗi mục "account_id:token", ngăn bằng xuống dòng / phẩy / chấm phẩy; hoặc JSON [{"account":"…","token":"…"}]. KHÔNG bao giờ tài khoản chính (CF_ACCOUNT_1).
// Mỗi tài khoản: 10.000 neuron/ngày (về 0 lúc 00:00 UTC), chừa VIMG_CF_RESERVE (10 %) → trần ảnh = floor(phần dùng / neuron mỗi ảnh của mô hình).
// 4006 / 429 hết hạn mức / 401 / 403 → bỏ tài khoản đó tới hết lượt; 3040 (quá tải tạm) → người gọi thử lại.

/** neuron ƯỚC TÍNH mỗi ảnh (bảng giá Workers AI 10/2026; schnell ra cố định 1024² × 4 bước, các mô hình khác 512²). Đo lại bằng analytics rồi sửa; ghi đè VIMG_NPI_<tên>. */
export const NPI = {
  'flux-1-schnell': 57.6, 'flux-2-klein-4b': 60, 'flux-2-klein-9b': 1400, 'flux-2-dev': 400,
  'lucid-origin': 700, 'phoenix-1.0': 600, 'stable-diffusion-xl-lightning': 0, 'stable-diffusion-xl-base-1.0': 0,   // SDXL: bảng giá ghi 0 (beta) – nếu tính phí, sửa ở đây
};
export const DAILY_NEURONS = 10000;
const short = id => String(id).replace(/^@cf\/[^/]+\//, '');

/** neuron/ảnh cho id mô hình (env ghi đè; mô hình giá 0 tính 1 để trần ảnh hữu hạn) */
export function npiOf(model, env = process.env) {
  const s = short(model), o = env['VIMG_NPI_' + s.replace(/[^a-z0-9]/gi, '_').toUpperCase()];
  const v = o != null && o !== '' ? +o : NPI[s];
  return v == null ? 1000 : Math.max(1, v);   // mô hình lạ: giả định đắt để không làm cạn tài khoản
}

/** đọc CF_POOL → [[account, token]] – chỉ dòng Cloudflare (account = 32 hex), bỏ mọi dòng khác (tiêu đề, khoá Gemini/Groq…).
 *  Nhận "cf:<acct>:<token>" (tệp xuất kho khoá GrabCast), "<acct>:<token>", "<acct> <token>", hoặc JSON [{account, token}]. */
export function parsePool(raw) {
  raw = String(raw || '').trim();
  if (raw.startsWith('[')) { try { return JSON.parse(raw).map(o => [o.account || o.account_id || o.acct, o.token || o.api_token || o.tok]).filter(([a, t]) => a && t); } catch { return []; } }
  const out = [];
  for (const line of raw.split(/[\n,;]+/)) { const m = line.trim().match(/^(?:cf[:=\s])?([0-9a-f]{32})[:=\s|]+(\S+)$/i); if (m) out.push([m[1].toLowerCase(), m[2]]); }
  return out;
}

/** danh sách tài khoản dùng để vẽ (gộp token trùng tài khoản – token sau dự phòng khi token trước hỏng; không tài khoản chính) */
export function poolAccounts(env = process.env) {
  const by = new Map();
  for (const [a, t] of parsePool(env.CF_POOL)) (by.get(a) || by.set(a, []).get(a)).push(t);
  const skip = Math.max(0, +(env.VIMG_POOL_SKIP ?? 5)), out = [];
  [...by].slice(skip).forEach(([a, toks], i) => out.push({ id: 'pool' + (i + skip), acct: a, tok: toks[0], toks }));
  if (env.CF_ACCOUNT_2 && env.CF_AI_TOKEN_2 && env.VIMG_CF_USE_CF2 !== '0') out.push({ id: 'cf2', acct: env.CF_ACCOUNT_2, tok: env.CF_AI_TOKEN_2, toks: [env.CF_AI_TOKEN_2] });
  const main = String(env.CF_ACCOUNT_1 || '').toLowerCase(), seen = new Set();
  return out.filter(x => x.acct.toLowerCase() !== main && !seen.has(x.acct) && seen.add(x.acct));
}

/** thân yêu cầu theo họ mô hình: schnell JSON {prompt, steps} (không cỡ) · FLUX.2 multipart · còn lại JSON có width/height */
export function cfInput(model, prompt, size = '512') {
  const [w, h = w] = String(size || '512').toLowerCase().split('x').map(n => +n);
  if (/flux-1-schnell$/.test(model)) return { json: { prompt, steps: 4 } };
  if (/flux-2-/.test(model)) { const f = new FormData(); f.append('prompt', prompt); f.append('width', String(w)); f.append('height', String(h)); return { form: f }; }
  return { json: { prompt, width: w, height: h } };
}

export class CfQuota extends Error {}
export class CfSafety extends Error {}
const quotaish = s => /4006|daily free allocation|neurons?\b.*(limit|exceed)|quota/i.test(s);

/** một ảnh trên một tài khoản → Buffer (JPEG/PNG/WebP) có .meta */
export async function cfImage(a, model, prompt, size, F = fetch) {
  const inp = cfInput(model, prompt, size);
  const r = await F(`https://api.cloudflare.com/client/v4/accounts/${a.acct}/ai/run/${model}`, {
    method: 'POST', headers: { Authorization: 'Bearer ' + a.tok, ...(inp.json ? { 'Content-Type': 'application/json' } : {}) },
    body: inp.json ? JSON.stringify(inp.json) : inp.form,
  });
  const ct = String(r.headers.get('content-type') || '');
  if (r.ok && ct.startsWith('image/')) { const b = Buffer.from(await r.arrayBuffer()); b.meta = { provider: 'cloudflare', model, acct: a.id }; return b; }   // SDXL / phoenix trả ảnh nhị phân
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.success) {
    const m = `${r.status} ${JSON.stringify(j.errors || '').slice(0, 200)}`;
    if (r.status === 429 && !/3040/.test(m) || quotaish(m) || r.status === 401 || r.status === 403 || /10000|Authentication/.test(m)) throw new CfQuota(m);
    if (/refused|nsfw|safety|Input prompt/i.test(m)) throw new CfSafety(m);
    const e = new Error(m); e.status = r.status === 429 ? 503 : r.status; throw e;   // 3040 quá tải tạm → coi như 5xx để thử lại
  }
  const img = j.result && (j.result.image || (j.result.images && j.result.images[0]));
  if (!img) throw new Error('không có ảnh trong kết quả');
  const b = Buffer.from(img, 'base64'); b.meta = { provider: 'cloudflare', model, acct: a.id }; return b;
}

/** nhà vẽ xoay vòng tài khoản: max = tổng trần ảnh mọi tài khoản (≤ VIMG_MAX_CF) */
export function cfProvider(model, env = process.env, F = fetch) {
  // 26/10: vẽ chỉ dùng VIMG_DRAW_SHARE đầu kho (mặc định 1); phần đuôi để dành cho giám khảo thị giác + văn bản (kho từ) – vẽ không bao giờ làm đói việc chấm
  const all = poolAccounts(env), accts = all.slice(0, Math.max(1, Math.ceil(all.length * Math.min(1, +(env.VIMG_DRAW_SHARE || 1))))), npi = npiOf(model, env), keep = 1 - Math.min(0.9, Math.max(0, +(env.VIMG_CF_RESERVE ?? 0.1)));
  // VIMG_CF_UNCAPPED=1 (chủ 26/10: kho chỉ Lexkite dùng → vắt hết): không trần ước tính, mỗi tài khoản vẽ tới khi Cloudflare báo 4006 hết neuron ngày
  const per = env.VIMG_CF_UNCAPPED === '1' ? 1e6 : Math.floor(DAILY_NEURONS * keep / npi), left = new Map(accts.map(a => [a.id, per])), stats = { accounts: accts.length, per_account: per, npi, ok: 0, by_acct: {}, dead: [] };
  let i = 0;
  const cap = Math.min(+(env.VIMG_MAX_CF || 0), per * accts.length);
  return {
    id: 'cf', max: cap, stats, ok: () => accts.length > 0 && cap > 0,
    async run(prompt) {
      for (let n = 0; n < accts.length; n++) {
        const a = accts[(i + n) % accts.length]; if (!(left.get(a.id) > 0)) continue;
        try { const b = await cfImage(a, model, prompt, env.VIMG_SIZE, F); left.set(a.id, left.get(a.id) - 1); stats.ok++; stats.by_acct[a.id] = (stats.by_acct[a.id] || 0) + 1; i = (i + n + 1) % accts.length; return b; }
        catch (e) { if (e instanceof CfQuota && /^40[13]\b/.test(e.message) && a.toks && a.toks.indexOf(a.tok) < a.toks.length - 1) { a.tok = a.toks[a.toks.indexOf(a.tok) + 1]; n--; continue; }   // token hỏng → token kế của CÙNG tài khoản
          if (e instanceof CfQuota) { left.set(a.id, 0); stats.dead.push(a.id + ' ' + e.message.slice(0, 60)); continue; } throw e; }
      }
      throw new CfQuota('mọi tài khoản đã hết phần neuron lượt này');
    },
  };
}
