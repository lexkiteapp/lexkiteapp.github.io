// AI pool chung cho MỌI việc nền (lexicon-expand, explain, script-bank, vocab-img judge, content-qa) – docs/API-KEYS.md §8.
// Một client, không phụ thuộc nhà cung cấp: chuỗi dự phòng theo thứ tự cho từng loại việc (soạn / chấm), 2 giám khảo khác HỌ mô hình,
// nghỉ (cooldown) theo TỪNG (tuyến, mô hình) – 429/403 của một mô hình không bao giờ làm cả tuyến/khóa nghỉ –, ngân sách theo điều phối,
// nhật ký "ai đã trả lời", và bỏ qua trung tính khi mọi tuyến đều hỏng (trả null → việc KHÔNG xuất nội dung chưa chấm, lượt sau làm lại).
//
// Tuyến (theo thứ tự ưu tiên mặc định):
//   lexai     Gemini/Gemma kho khóa Lexkite (xoay khóa, functions/api/_keys.js) qua /api/lexai (OIDC GitHub)
//   gc-groq   GrabCast /api/owner-ai/generate provider=groq model=openai/gpt-oss-120b (24/10 nâng cấp: 600/phút, 60.000/ngày/khóa) – env GRABCAST_AI_KEY
//   gc-cf     GrabCast provider=cloudflare: @cf/openai/gpt-oss-120b · @cf/meta/llama-3.3-70b-instruct-fp8-fast
//   cf2       Workers AI TÀI KHOẢN 2 (REST, env CF_AI_TOKEN_2 + CF_ACCOUNT_2; neuron = phần cấp của điều phối LEASE_AI_B_NEURONS)
//   gc-gemini GrabCast provider=gemini (2.5-flash/pro; 29 khóa thường hết hạn mức ngày → cuối chuỗi)
//   gc-vision GrabCast /api/owner-ai/vision (CF Llama 4 Scout → Gemini → Groq) cho giám khảo ảnh
// Workers AI TÀI KHOẢN CHÍNH bị CẤM cho việc nền: không có tuyến nào tới nó (test ai-pool khẳng định).
// Lời nhắn (prompt) có MỘT nguồn: functions/api/lexai.js build(); tuyến không phải Gemini lấy { sys, user } qua `prompt: true`.
import fs from 'fs';

// ---------- mô hình: họ + hạng (chất lượng) ----------
// L = soạn + chấm · M = CHỈ chấm · S = cấm (quá nhỏ). Mô hình lạ = S (phải thêm vào đây sau khi đo).
const TIERS = [
  [/gemini-[\d.]+-flash-lite/i, 'gemini', 'M'],
  [/gemini-[\d.]+(-flash|-pro)|gemini-3-flash-preview/i, 'gemini', 'L'],
  [/gemma-3-27b/i, 'gemma', 'M'],
  [/gemma/i, 'gemma', 'S'],
  [/gpt-oss-120b/i, 'gpt-oss', 'L'],
  [/gpt-oss-20b/i, 'gpt-oss', 'M'],
  [/llama-3\.3-70b|llama-4-maverick/i, 'llama', 'L'],
  [/llama-4-scout|llama-3\.2-(90|11)b-vision/i, 'llama', 'M'],
  [/llama/i, 'llama', 'S'],
  [/qwen3-235b|qwen3-coder-480b/i, 'qwen', 'L'],
  [/qwen3-32b|qwq-32b|qwen2\.5-72b/i, 'qwen', 'M'],
  [/qwen/i, 'qwen', 'S'],
  [/kimi-k2/i, 'kimi', 'L'],
  [/mistral-small-3|mistral-large/i, 'mistral', 'M'],
  [/^gemini(:|$)/i, 'gemini', 'M'], // nhãn nhà cung cấp trần ('gemini' từ /api/studio thị giác) – chỉ chấm
];
export function modelInfo(model) {
  const m = String(model || '');
  for (const [re, fam, tier] of TIERS) if (re.test(m)) return { fam, tier };
  return { fam: 'other', tier: 'S' };
}
export const familyOf = m => modelInfo(m).fam;
/** khóa giám khảo chuẩn cho qa.j: '<họ>:<mô hình>' */
export const judgeKey = m => familyOf(m) + ':' + String(m || '?').replace(/^@cf\/[^/]+\//, '').replace(/^@cf\//, '');

// ---------- loại việc + danh sách mô hình đủ tốt ----------
// kind gen = soạn nội dung (chỉ hạng L, trừ mô hình đã đo là kém cho việc đó) · judge = chấm (L hoặc M).
// Đo 22/10: Llama 3.3 70B soạn lời giải sai ~13/30 → cấm soạn xgen/xtr. 24/10: Llama 70B bỏ trống ja/th/hi/ar khi dịch 13 ngôn ngữ → cấm lxtr.
export const TASKS = {
  lxgen: { kind: 'gen', deny: [] },
  lxtr: { kind: 'gen', deny: ['llama'] },
  xgen: { kind: 'gen', deny: ['llama'] },
  xtr: { kind: 'gen', deny: ['llama'] },
  vgen: { kind: 'gen', deny: [] },
  translate: { kind: 'gen', deny: ['llama'] },
  lxjudge: { kind: 'judge', deny: [] },
  xjudge: { kind: 'judge', deny: [] },
  vjudge: { kind: 'judge', deny: [] },
  judge: { kind: 'judge', deny: [] },
  vision: { kind: 'judge', deny: [] },
  vscene: { kind: 'gen', deny: [] }, // thẻ cảnh ảnh minh hoạ (scripts/vocab-img/scene.mjs – prompt cục bộ, không qua /api/lexai)
};
export function allowed(mode, model) {
  const t = TASKS[mode]; if (!t) return false;
  const { fam, tier } = modelInfo(model);
  if (tier === 'S' || t.deny.includes(fam)) return false;
  return t.kind === 'judge' ? true : tier === 'L';
}

// ---------- chuỗi theo loại việc ----------
// Chọn 24/10 (GrabCast nâng cấp): soạn = Groq gpt-oss-120b → CF gpt-oss-120b; giám khảo A = CF Llama 3.3 70B; giám khảo B = Groq gpt-oss-120b (khác họ).
// Gemini kho Lexkite vẫn đứng đầu soạn khi có khóa sống (ping); 0 khóa → tuyến lexai nghỉ ngay từ kiểm sức khỏe.
export const CHAINS = {
  gen: ['lexai', 'gc-groq', 'gc-cf', 'cf2', 'gc-gemini'],
  judgeA: ['gc-cf', 'lexai', 'cf2', 'gc-groq', 'gc-gemini'],
  judgeB: ['gc-groq', 'cf2', 'gc-cf', 'lexai', 'gc-gemini'], // bắt buộc khác họ của A
  vision: ['gc-vision', 'studio', 'cf2-vision'],
};
// Mô hình GrabCast theo vai (allowlist GrabCast 24/10)
const GC_MODELS = {
  groq: { gen: ['openai/gpt-oss-120b'], judge: ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] },
  cloudflare: { gen: ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'], judge: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/openai/gpt-oss-120b', '@cf/openai/gpt-oss-20b'] },
  gemini: { gen: ['gemini-2.5-flash', 'gemini-2.5-pro'], judge: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'] },
};
const LEXAI_MODELS = {
  gen: ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'],
  judge: ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview', 'gemma-3-27b-it'],
};
const CF2_MODELS = ['@cf/openai/gpt-oss-120b', '@cf/meta/llama-3.3-70b-instruct-fp8-fast'];
const CF2_VISION = '@cf/meta/llama-4-scout-17b-16e-instruct';
// neuron/token ước lượng (bảng giá Workers AI) – để trừ ngân sách tài khoản 2
const NEURON = { 'gpt-oss-120b': { in: 31818 / 1e6, out: 68182 / 1e6 }, 'llama-3.3-70b': { in: 26668 / 1e6, out: 204805 / 1e6 }, 'llama-4-scout': { in: 24545 / 1e6, out: 77273 / 1e6 } };
const neuronsOf = (model, u) => { const k = Object.keys(NEURON).find(x => String(model).includes(x)) || 'llama-3.3-70b', r = NEURON[k]; return Math.round((u.in || 3000) * r.in + (u.out || 800) * r.out); };

// ---------- nghỉ ----------
export function untilPacificMidnight(now = Date.now()) {
  const f = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Los_Angeles', hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const [h, m, s] = f.format(new Date(now)).split(':').map(Number);
  return ((24 - (h % 24)) * 3600 - m * 60 - s) * 1000 + 60e3;
}
export const untilUtcMidnight = (now = Date.now()) => { const d = new Date(now); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1) - now + 60e3; };

// mô hình hay trả sai hình: 1 mục trần { k, … } hoặc mảng [{ k, … }] → chuẩn { k: … }
export function normOut(out, items) {
  if (Array.isArray(out)) return Object.fromEntries(out.filter(x => x && x.k != null).map(({ k, ...v }) => [k, v]));
  if (out && typeof out === 'object' && typeof out.k === 'string' && !(out.k in out) && Array.isArray(items) && items.some(x => x && x.k === out.k)) { const { k, ...v } = out; return { [k]: v }; }
  if (out && Array.isArray(out.items)) return normOut(out.items, items);
  return out;
}
class PoolErr extends Error { constructor(kind, msg, ms) { super(msg); this.kind = kind; this.ms = ms; } }
// kind: model (chỉ mô hình này nghỉ ms) · route (cả tuyến nghỉ: hết khóa/không quyền) · budget (hết ngân sách lượt này) · bad (trả lời hỏng/không đủ chuẩn – thử tuyến kế, không nghỉ) · net (tạm thời)
const parseJSON = t => { if (t && typeof t === 'object') return t; try { const s = String(t || ''), m = s.match(/\{[\s\S]*\}|\[[\s\S]*\]/); return m ? JSON.parse(m[0]) : null; } catch { return null; } };

/**
 * createPool(opts)
 *  opts.env       biến môi trường (mặc định process.env)
 *  opts.fetch     fetch (test mock)
 *  opts.lexaiUrl, opts.oidc() → token, opts.gcBase, opts.studioUrl
 *  opts.budget    { lexai: số lần gọi, gc: số lần gọi GrabCast, cf2: neuron tài khoản 2 } (mặc định từ env: AI_POOL_LEXAI_MAX, AI_POOL_GC_MAX, LEASE_AI_B_NEURONS)
 *  opts.log       (line) => void; opts.now() → ms; opts.sleep(ms)
 */
export function createPool(opts = {}) {
  const env = opts.env || process.env, F = opts.fetch || globalThis.fetch, now = opts.now || Date.now, sleep = opts.sleep || (ms => new Promise(r => setTimeout(r, ms)));
  const log = opts.log || (l => console.log(l));
  const LEXAI = opts.lexaiUrl || env.LEXAI_URL || 'https://lexkite.com/api/lexai';
  const GC = String(opts.gcBase || env.GRABCAST_API_BASE || 'https://grabcast-api-342720596878.us-central1.run.app').replace(/\/+$/, '');
  const STUDIO = opts.studioUrl || env.STUDIO_API || 'https://lexkite.com/api/studio';
  const budget = { lexai: +(opts.budget?.lexai ?? env.AI_POOL_LEXAI_MAX ?? 1e9), gc: +(opts.budget?.gc ?? env.AI_POOL_GC_MAX ?? 10000), cf2: +(opts.budget?.cf2 ?? env.LEASE_AI_B_NEURONS ?? 0) };
  const used = { lexai: 0, gc: 0, cf2: 0 };
  const cool = new Map(); // `${route}|${model}` hoặc `${route}|*` → hết nghỉ lúc
  const stats = {}; // route|model → { ok, fail, bad }
  const promptCache = new Map();
  let token = '', tokenAt = 0;

  const hit = (route, model, k) => { const s = stats[route + '|' + model] = stats[route + '|' + model] || { ok: 0, fail: 0, bad: 0 }; s[k]++; };
  const cooling = (route, model) => (cool.get(route + '|*') || 0) > now() || (cool.get(route + '|' + model) || 0) > now();
  const rest = (route, model, ms, why) => { const k = route + '|' + (model || '*'); cool.set(k, now() + ms); log(`[ai-pool] nghỉ ${k} ${Math.round(ms / 60e3)} phút (${why})`); };

  async function oidc() {
    if (opts.oidc) return opts.oidc();
    if (token && now() - tokenAt < 240e3) return token;
    const u = env.ACTIONS_ID_TOKEN_REQUEST_URL, t = env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
    if (!u || !t) throw new PoolErr('route', 'thiếu OIDC (permissions: id-token: write)');
    tokenAt = now(); token = (await (await F(u + '&audience=lexkite-lexai', { headers: { Authorization: 'Bearer ' + t } })).json()).value; return token;
  }
  async function lexaiPost(body) {
    for (let i = 0; i < 2; i++) {
      const r = await F(LEXAI, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + await oidc(), 'User-Agent': 'lexkite-ci' }, body: JSON.stringify(body) }).catch(() => null);
      if (!r) throw new PoolErr('net', 'lexai net');
      if (r.status === 401 && i === 0) { token = ''; continue; }
      return r;
    }
  }
  /** { sys, user } cho tuyến không phải Gemini – một nguồn prompt (lexai build) */
  async function promptFor(req) {
    if (opts.prompt) return opts.prompt(req);
    // mặc định: dựng prompt TẠI CHỖ từ cùng nguồn (functions/api/lexai.js build) – không phụ thuộc mạng (pilot 24/10: /api/lexai prompt 500 khi tải dồn)
    try { const { build } = await import('../../functions/api/lexai.js'); const p = build(req); if (p) return { sys: p.sys + '\nReply with ONE valid JSON object only, no markdown.', user: p.user, temp: p.temp }; } catch { /* rơi về máy chủ */ }
    const key = JSON.stringify([req.mode, req.lang, req.items]);
    if (promptCache.has(key)) return promptCache.get(key);
    const r = await lexaiPost({ mode: req.mode, lang: req.lang, items: req.items, prompt: true });
    if (!r.ok) throw new PoolErr('net', 'prompt ' + r.status);
    const p = await r.json(); promptCache.set(key, p); if (promptCache.size > 200) promptCache.delete(promptCache.keys().next().value); return p;
  }

  // ---------- tuyến ----------
  const R = {};
  R.lexai = {
    ok: () => true, models: role => LEXAI_MODELS[role === 'gen' ? 'gen' : 'judge'],
    async call(model, req) {
      if (used.lexai >= budget.lexai) throw new PoolErr('budget', 'lexai budget'); used.lexai++;
      const r = await lexaiPost({ mode: req.mode, lang: req.lang, items: req.items, model });
      if (r.ok) { const j = await r.json(); return { out: j.out || {}, model: j.model || model }; }
      const t = (await r.text().catch(() => '')).replace(/\s+/g, ' ');
      if (/keys=0\b/.test(t)) throw new PoolErr('route', 'kho Gemini rỗng (keys=0)', 30 * 60e3);
      if (/PerDay/.test(t)) throw new PoolErr('model', 'hết hạn mức ngày', untilPacificMidnight(now()));
      if (r.status === 429 || /PerMinute|429/.test(t)) throw new PoolErr('model', 'hạn mức phút', 65e3);
      if (r.status === 400) throw new PoolErr('bad', 'lexai 400 ' + t.slice(0, 80));
      if (/ 403:| 401:/.test(t) && !/ 200/.test(t)) throw new PoolErr('model', 'khóa bị từ chối (403) cho mô hình này', 20 * 60e3);
      throw new PoolErr('net', `lexai ${r.status} ${t.slice(0, 100)}`);
    },
  };
  // Nhịp theo xô route GrabCast (theo IP, 24/10 MAX): generate 300/phút · vision 120/phút → chừa ~10 % (270 · 108). Khóa: 1.500/phút, 115.000/ngày.
  const RATE = { generate: +(env.AI_POOL_GC_RPM || 270), vision: +(env.AI_POOL_GC_VISION_RPM || 108) }, nextAt = { generate: 0, vision: 0 };
  async function pace(bucket) { const gap = 60e3 / RATE[bucket], t = Math.max(now(), nextAt[bucket]); nextAt[bucket] = t + gap; if (t > now()) await sleep(t - now()); }
  const retryAfter = r => { const v = +(r.headers && r.headers.get && r.headers.get('Retry-After')); return Number.isFinite(v) && v > 0 ? Math.min(600, v) * 1e3 : 65e3; };
  const GC_MAX_CHARS = 7900;
  // GrabCast cắt câu trả lời ≈ 1–2 nghìn ký tự với gpt-oss (đo 24/10: lxtr 10 mục bị cụt) → số mục tối đa mỗi lượt theo cỡ đầu ra; cụt nữa → chia đôi
  const GC_ITEMS = { lxgen: 3, lxtr: 3, lxjudge: 2, xgen: 2, xtr: 2, xjudge: 10, vgen: 1, vjudge: 6, translate: 10, judge: 15, vscene: 2 }; // GrabCast: prompt ≤ 8.000 ký tự (422 string_too_long) → chia đôi lô mục cho tới khi vừa
  const gcRoute = provider => {
    async function one(req, model, depth = 0) {
      const cap = GC_ITEMS[req.mode];
      if (depth === 0 && cap && Array.isArray(req.items) && req.items.length > cap) {
        const parts = []; for (let i = 0; i < req.items.length; i += cap) parts.push(req.items.slice(i, i + cap));
        const rs = await Promise.all(parts.map(it => one({ ...req, items: it }, model, 1).catch(e => e)));
        const good = rs.filter(r => !(r instanceof Error)); if (!good.length) throw rs[0];
        return { ...good[good.length - 1], out: Object.assign({}, ...good.map(r => normOut(r.out, req.items) || {})), fellBack: good.some(r => r.fellBack) };
      }
      try { return await one1(req, model, depth); }
      catch (e) { // câu trả lời cụt (không phải JSON) → chia đôi
        if (!(e instanceof PoolErr && e.kind === 'bad' && /JSON/.test(e.message)) || !Array.isArray(req.items) || req.items.length < 2 || depth > 4) throw e;
        const h = Math.ceil(req.items.length / 2), rs = await Promise.all([one({ ...req, items: req.items.slice(0, h) }, model, depth + 1).catch(e2 => e2), one({ ...req, items: req.items.slice(h) }, model, depth + 1).catch(e2 => e2)]);
        const good = rs.filter(r => !(r instanceof Error)); if (!good.length) throw e;
        return { ...good[good.length - 1], out: Object.assign({}, ...good.map(r => normOut(r.out, req.items) || {})), fellBack: good.some(r => r.fellBack) };
      }
    }
    async function one1(req, model, depth) {
      const p = await promptFor(req), prompt = p.sys + '\n\nINPUT:\n' + p.user;
      if (prompt.length > GC_MAX_CHARS) {
        if (!Array.isArray(req.items) || req.items.length < 2 || depth > 5) throw new PoolErr('bad', `prompt ${prompt.length} > ${GC_MAX_CHARS} ký tự`);
        const h = Math.ceil(req.items.length / 2), x = await one({ ...req, items: req.items.slice(0, h) }, model, depth + 1), y = await one({ ...req, items: req.items.slice(h) }, model, depth + 1);
        return { ...y, out: { ...(normOut(x.out, req.items) || {}), ...(normOut(y.out, req.items) || {}) }, fellBack: x.fellBack || y.fellBack };
      }
      if (used.gc >= budget.gc) throw new PoolErr('budget', 'GrabCast budget'); used.gc++;
      await pace('generate');
      const r = await F(GC + '/api/owner-ai/generate', { method: 'POST', headers: { 'X-API-Key': env.GRABCAST_AI_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt, provider, ...(model ? { model } : {}) }) }).catch(() => null);
      if (!r) throw new PoolErr('net', 'grabcast net');
      if (r.status === 429) throw new PoolErr('route', 'GrabCast 429 (Retry-After)', retryAfter(r)); // trần khóa/IP: cả tuyến chờ đúng Retry-After
      if (r.status === 401 || r.status === 403) throw new PoolErr('route', 'GrabCast ' + r.status, 6 * 3600e3);
      const j = await r.json().catch(() => ({})), code = (j.detail && j.detail.code) || (j.error && j.error.code) || '';
      // GrabCast 24/10 (sửa 500): 503 ai_busy (Retry-After 20) · ai_exhausted / ai_unavailable (Retry-After 60) – luôn theo Retry-After, không còn 500 trần
      const ra = r.headers && r.headers.get && +r.headers.get('Retry-After') > 0 ? retryAfter(r) : 0;
      if (code === 'ai_busy' || (r.status === 503 && !code)) throw new PoolErr('model', 'GrabCast 503 ai_busy (Retry-After)', ra || 20e3);
      if (code === 'ai_exhausted') throw new PoolErr('route', 'GrabCast ai_exhausted (mọi nhà cung cấp hết lượt)', ra || 10 * 60e3);
      if (code === 'ai_unavailable') throw new PoolErr('model', 'GrabCast ai_unavailable ' + JSON.stringify((j.detail && j.detail.tried) || []).slice(0, 80), ra || 5 * 60e3);
      const why = j.error && j.error.code || (Array.isArray(j.detail) ? j.detail.map(d => d.msg).join('; ') : j.detail) || '';
      if (!r.ok || !j.text) throw new PoolErr(r.status >= 500 ? 'net' : 'bad', `GrabCast ${r.status} ${String(why).slice(0, 80)}`);
      const out = parseJSON(j.text); if (!out) throw new PoolErr('bad', `không phải JSON (${String(j.text).length} ký tự: …${String(j.text).slice(-40).replace(/\s+/g, ' ')})`);
      return { out, model: j.model || model || provider, via: j.provider, fellBack: (!!j.provider && j.provider !== provider) || (!!model && !!j.model && j.model !== model) };
    }
    return { ok: () => !!env.GRABCAST_AI_KEY, models: role => GC_MODELS[provider][role === 'gen' ? 'gen' : 'judge'], call: (m, req) => one(req, m) };
  };
  R['gc-cf'] = gcRoute('cloudflare'); R['gc-gemini'] = gcRoute('gemini'); R['gc-groq'] = gcRoute('groq');
  async function cf2Run(model, input) {
    const r = await F(`https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_2}/ai/run/${model}`, { method: 'POST', headers: { Authorization: 'Bearer ' + env.CF_AI_TOKEN_2, 'Content-Type': 'application/json' }, body: JSON.stringify(input) }).catch(() => null);
    if (!r) throw new PoolErr('net', 'cf2 net');
    const j = await r.json().catch(() => ({})), code = ((j.errors || [])[0] || {}).code;
    if (code === 10000 || r.status === 401 || r.status === 403) throw new PoolErr('route', 'tài khoản 2 chưa có quyền Workers AI', 6 * 3600e3);
    if (code === 4006 || /neuron/i.test(JSON.stringify(j.errors || ''))) throw new PoolErr('route', 'hết neuron tài khoản 2', untilUtcMidnight(now()));
    if (r.status === 429) throw new PoolErr('model', 'cf2 429', 65e3);
    if (!r.ok || !j.result) throw new PoolErr(r.status >= 500 ? 'net' : 'bad', 'cf2 ' + r.status);
    const res = j.result, u = res.usage || {};
    let text = res.response ?? (res.choices && res.choices[0] && res.choices[0].message && res.choices[0].message.content);
    if (text == null && Array.isArray(res.output)) text = res.output.filter(o => o.type === 'message').flatMap(o => o.content || []).map(c => c.text || '').join('');
    used.cf2 += neuronsOf(model, { in: u.prompt_tokens || u.input_tokens, out: u.completion_tokens || u.output_tokens });
    return text;
  }
  R.cf2 = {
    ok: () => !!(env.CF_AI_TOKEN_2 && env.CF_ACCOUNT_2) && budget.cf2 > 0, models: () => CF2_MODELS,
    async call(model, req) {
      if (used.cf2 >= budget.cf2) throw new PoolErr('budget', 'neuron tài khoản 2 (phần cấp điều phối) đã hết');
      const p = await promptFor(req);
      const text = await cf2Run(model, { messages: [{ role: 'system', content: p.sys }, { role: 'user', content: p.user }], max_tokens: 4096, temperature: p.temp ?? 0.2, response_format: { type: 'json_object' } });
      return { out: parseJSON(text), model };
    },
  };
  // thị giác (vocab-img giám khảo gọi tên): GrabCast vision (khi có URL) → Gemini kho Lexkite qua /api/studio (wai:0) → tài khoản 2 Llama 4 Scout
  R['gc-vision'] = {
    ok: () => !!env.GRABCAST_AI_KEY, models: () => ['vision'],
    async call(_m, req) {
      if (used.gc >= budget.gc) throw new PoolErr('budget', 'GrabCast budget'); used.gc++;
      await pace('vision');
      const r = await F(env.GRABCAST_AI_VISION_URL || GC + '/api/owner-ai/vision', { method: 'POST', headers: { 'X-API-Key': env.GRABCAST_AI_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: req.question, image_b64: req.image, mime: 'jpeg' }) }).catch(() => null);
      if (!r) throw new PoolErr('net', 'gc-vision net'); if (r.status === 429) throw new PoolErr('route', 'GrabCast vision 429', retryAfter(r));
      const j = await r.json().catch(() => ({})), code = (j.detail && j.detail.code) || '';
      if (code === 'ai_exhausted') throw new PoolErr('route', 'GrabCast vision ai_exhausted', 10 * 60e3);
      if (!r.ok || !j.text) throw new PoolErr(r.status >= 500 ? 'net' : 'bad', 'GrabCast vision ' + r.status + ' ' + code);
      if (/no image provided/i.test(j.text || '')) throw new PoolErr('route', 'endpoint bỏ qua ảnh', 24 * 3600e3);
      return { out: parseJSON(j.text), model: j.model || 'vision', text: j.text };
    },
  };
  R.studio = {
    ok: () => !!env.STUDIO_CALLBACK_SECRET, models: () => ['gemini-vision'],
    async call(_m, req) {
      if (used.lexai >= budget.lexai) throw new PoolErr('budget', 'lexai budget'); used.lexai++;
      const r = await F(STUDIO, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Studio-Secret': env.STUDIO_CALLBACK_SECRET || '', 'User-Agent': 'lexkite-ci' }, body: JSON.stringify({ op: 'visionCheck', gemini: 1, wai: 0, question: req.question, ask: req.ask, images: [req.image] }) }).catch(() => null);
      if (!r) throw new PoolErr('net', 'studio net'); if (r.status === 429) throw new PoolErr('model', 'studio 429', 30e3);
      const j = await r.json().catch(() => ({})); if (!j.text) throw new PoolErr('route', 'Gemini thị giác không trả lời ' + (j.tried || []).join(',').slice(0, 60), 30 * 60e3);
      return { out: parseJSON(j.text), model: j.provider || 'gemini', text: j.text };
    },
  };
  R['cf2-vision'] = {
    ok: () => !!(env.CF_AI_TOKEN_2 && env.CF_ACCOUNT_2) && budget.cf2 > 0, models: () => [CF2_VISION],
    async call(model, req) {
      if (used.cf2 >= budget.cf2) throw new PoolErr('budget', 'neuron tài khoản 2 đã hết');
      const text = await cf2Run(model, { messages: [{ role: 'user', content: [{ type: 'text', text: req.question }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + req.image } }] }], max_tokens: 300, temperature: 0 });
      return { out: parseJSON(text), model, text };
    },
  };
  if (opts.routes) Object.assign(R, opts.routes); // test: tuyến giả

  /**
   * Chạy một yêu cầu qua chuỗi. req = { mode, lang?, items } (hoặc vision: { question, ask, image }).
   * exclude = tập họ mô hình không được trả lời (giám khảo B ≠ họ A). Trả { out, model, route, fam } hoặc null (mọi tuyến hỏng → bỏ qua trung tính).
   */
  async function run(chain, req, o = {}) {
    const r = await runWait(chain, req, o);
    // mô hình bỏ sót mục (hoặc nửa lô chia đôi hỏng) → hỏi lại MỘT lần riêng các mục thiếu (cùng ràng buộc họ)
    if (r && Array.isArray(req.items) && !o._again) {
      const miss = req.items.filter(x => x && x.k != null && !(x.k in r.out));
      if (miss.length && miss.length < req.items.length + 1) {
        const r2 = await runWait(chain, { ...req, items: miss }, { ...o, _again: true });
        if (r2 && (o.role !== 'judge' || r2.fam === r.fam)) r.out = { ...r.out, ...r2.out };
        log(`[ai-pool] ${req.mode}: thiếu ${miss.length}/${req.items.length} mục → hỏi lại ${r2 ? 'được ' + miss.filter(x => x.k in r.out).length : 'không được'}`);
      }
    }
    return r;
  }
  async function runWait(chain, req, o = {}) {
    for (let w = 0; ; w++) {
      const r = await run1(chain, req, o); if (r || w >= 3) return r;
      // mọi tuyến/mô hình phù hợp đang nghỉ NGẮN (≤ 2 phút) → chờ rồi thử lại thay vì bỏ qua ngay
      const soon = [...cool.entries()].filter(([k, t]) => chain.some(id => k.startsWith(id + '|')) && t > now()).map(([, t]) => t - now()).sort((a, b) => a - b)[0];
      if (!soon || soon > 120e3 || r === undefined) return r ?? null;
      await sleep(soon + 500);
    }
  }
  async function run1(chain, req, { exclude = [], role } = {}) {
    const mode = req.mode, why = [];
    role = role || (TASKS[mode] && TASKS[mode].kind) || 'gen';
    for (const id of chain) {
      const route = R[id]; if (!route || !route.ok()) continue;
      for (const model of route.models(role)) {
        if (cooling(id, model)) continue;
        // lọc trước theo mô hình dự kiến (tuyến GrabCast tự chọn mô hình → lọc theo câu trả lời thật)
        if (!/^(vision|gemini-vision)$/.test(model) && (!allowed(mode, model) || exclude.includes(familyOf(model)))) continue;
        const t0 = now();
        try {
          const r = await route.call(model, req); r.out = normOut(r.out, req.items);
          const fam = familyOf(r.model);
          if (r.fellBack) rest(id, model, 60e3, `GrabCast ${id} ${model} tự rơi về ${r.via} ${r.model}`); // chỉ mô hình đó nghỉ ngắn (thường là trần phút của nhà cung cấp)
          if (!r.out || typeof r.out !== 'object') throw new PoolErr('bad', 'không phải JSON');
          if (!allowed(mode, r.model)) { hit(id, r.model, 'bad'); why.push(`${id}:${r.model} không đủ chuẩn cho ${mode}`); continue; }
          if (exclude.includes(fam)) { hit(id, r.model, 'bad'); why.push(`${id}:${r.model} cùng họ ${fam}`); continue; }
          hit(id, r.model, 'ok');
          log(`[ai-pool] ✓ ${mode}${req.lang ? '/' + req.lang : ''} ← ${id} ${r.model} (${Math.round((now() - t0) / 1e3)} s)`);
          return { out: r.out, model: r.model, route: id, fam, text: r.text };
        } catch (e) {
          const k = e instanceof PoolErr ? e.kind : 'net';
          hit(id, model, 'fail'); why.push(`${id}:${model} ${k} ${String(e.message).slice(0, 80)}`);
          if (k === 'route') { rest(id, null, e.ms || 30 * 60e3, e.message); break; }
          if (k === 'budget') break;
          if (k === 'model') rest(id, model, e.ms || 65e3, e.message);
          if (k === 'net') { const n = (stats[id + '|' + model].fail); if (n % 3 === 0) rest(id, model, 15 * 60e3, '3 lỗi mạng/5xx'); else await sleep(3000); }
        }
      }
    }
    if (!why.length && [...cool.values()].some(t => t > now())) return null; // chỉ vì đang nghỉ → run() có thể chờ
    log(`[ai-pool] ⏭ ${mode}${req.lang ? '/' + req.lang : ''}: không tuyến nào trả lời (${why.slice(-6).join(' · ') || 'không tuyến khả dụng'}) → bỏ qua trung tính`);
    return null;
  }
  /** chia nhỏ cho tuyến yếu: items > max → nhiều lượt, gộp out */
  async function runSplit(chain, req, o = {}, max = 10) {
    if (!Array.isArray(req.items) || req.items.length <= max) return run(chain, req, o);
    let res = null;
    for (let i = 0; i < req.items.length; i += max) { const r = await run(chain, { ...req, items: req.items.slice(i, i + max) }, o); if (!r) return res && { ...res, partial: true }; res = res ? { ...res, out: { ...res.out, ...r.out } } : r; }
    return res;
  }
  const api = {
    /** soạn: chuỗi gen */
    gen: (req, o = {}) => run(o.chain || CHAINS.gen, req, { ...o, role: 'gen' }),
    /** một giám khảo (exclude: họ cấm, vd họ của mô hình soạn) */
    judge: (req, o = {}) => run(o.chain || CHAINS.judgeA, req, { ...o, role: 'judge' }),
    /** HAI giám khảo khác họ. { a, b } – b null khi không còn họ khác → người gọi KHÔNG xuất (bỏ qua trung tính, lượt sau chấm lại). */
    async judgePair(req, o = {}) {
      const a = await run(CHAINS.judgeA, req, { exclude: o.exclude || [], role: 'judge' });
      if (!a) return { a: null, b: null };
      const b = await run(CHAINS.judgeB, req, { exclude: [...(o.exclude || []), a.fam], role: 'judge' });
      return { a, b };
    },
    vision: (req) => run(CHAINS.vision, { mode: 'vision', ...req }, { role: 'judge' }),
    /** kiểm sức khỏe rẻ: lexai ping (đếm khóa Gemini sống, không gọi mô hình) + 1 lời nhắn nhỏ mỗi tuyến GrabCast/tài khoản 2 */
    async health({ grabcast = true } = {}) {
      const h = {};
      try { const r = await lexaiPost({ mode: 'ping' }); const j = r.ok ? await r.json() : {}; h.lexai = { ok: r.ok && j.gemini > 0, gemini: j.gemini ?? null }; if (r.ok && !j.gemini) rest('lexai', null, 30 * 60e3, 'kho Gemini rỗng (ping)'); } catch (e) { h.lexai = { ok: false, err: String(e.message).slice(0, 60) }; }
      if (grabcast && env.GRABCAST_AI_KEY) for (const p of ['cloudflare', 'groq', 'gemini']) {
        const r = await F(GC + '/api/owner-ai/generate', { method: 'POST', headers: { 'X-API-Key': env.GRABCAST_AI_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: 'Reply with JSON {"ok":1} only.', provider: p, model: GC_MODELS[p].gen[0] }) }).catch(() => null);
        const j = r ? await r.json().catch(() => ({})) : {}; used.gc++;
        const ok = !!(r && r.ok && j.provider === p); h['gc-' + (p === 'cloudflare' ? 'cf' : p)] = { ok, model: j.model || '', fellBack: (j.fallback_from || []).map(f => f.code).slice(0, 3) };
        if (!ok) rest('gc-' + (p === 'cloudflare' ? 'cf' : p), null, 30 * 60e3, `health: ${p} trả lời qua ${j.provider || r && r.status || 'net'}`);
      }
      if (env.CF_AI_TOKEN_2 && env.CF_ACCOUNT_2) { try { await cf2Run('@cf/meta/llama-3.1-8b-instruct-fast', { messages: [{ role: 'user', content: 'ok' }], max_tokens: 2 }); h.cf2 = { ok: true }; } catch (e) { h.cf2 = { ok: false, err: e.message }; if (e.kind === 'route') rest('cf2', null, e.ms, e.message); } }
      else h.cf2 = { ok: false, err: 'chưa có CF_AI_TOKEN_2/CF_ACCOUNT_2' };
      log('[ai-pool] sức khỏe ' + JSON.stringify(h)); return h;
    },
    stats: () => ({ used: { ...used }, budget: { ...budget }, by: JSON.parse(JSON.stringify(stats)) }),
    /** ghi nhật ký ai đã trả lời (reports/ai-pool-<job>.json) */
    report(job, file = `reports/ai-pool-${job}.json`) { try { fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync(file, JSON.stringify({ job, at: new Date(now()).toISOString(), ...api.stats() }, null, 1)); } catch { /* bỏ */ } },
  };
  return api;
}
