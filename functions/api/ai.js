/* AI chấm bài miễn phí cho mọi người (không cần tự lấy khóa) – Cloudflare Pages Functions.
 * POST /api/ai  { prompt, sys, kind? }  (Authorization: Bearer <Firebase ID token> – không bắt buộc)
 *   → { out: <JSON kết quả>, left: lượt còn lại hôm nay, model, tier }
 * Chuỗi model theo chất lượng: functions/api/_aichain.js (Gemini Flash → Groq gpt-oss-120b → [Llama 8B chỉ khi golden đạt]) – docs/AI-CHAIN.md.
 * Hạn mức: functions/api/_quota.js (tính năng 'ai' = chấm bài, 'chat' = Roleplay kind 'rp') – theo người + theo IP + cầu dao nhà cung cấp
 * (Gemini/Groq gần 80% trần theo số khóa → bỏ tuyến đó; không còn tuyến → 429 'quota.busy', máy khách chấm nhanh theo quy tắc / kịch bản soạn sẵn). Xem docs/QUOTAS.md.
 * Giám sát: mỗi lượt đếm tuyến phục vụ (_aimix.js) → cảnh báo 'ai:weak' khi > 10 % lượt/giờ rơi về model yếu hoặc báo bận.
 * Kết quả lưu đệm trong D1 theo hash đề + bài (chỉ kết quả chất lượng cao) → chấm lại cùng bài không tốn lượt. */
import { claims } from './sync.js';
import { gate } from './_quota.js';
import { candidates, report, poolKeys, poolCount, resetPool, coolingValue, gemFetch, maybeHealth, refreshAlerts } from './_keys.js';
import { runChain, gemModels, GEM_FALLBACK } from './_aichain.js';
import { mixStmt, pruneStmt, WEAK } from './_aimix.js';
import { once } from './_schema.js';

const MAX_PROMPT = 14000;
const CACHE_V = 'v2|'; // 03/11: đổi chuỗi model → bỏ đệm cũ (có câu chấm sai của Llama 8B)
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
let ready = false;

const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Lexkite-Device', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');

async function setup(db) {
  if (ready) return;
  await once(db, 'ai', 1, async () => { // lược đồ: chỉ chạy khi đổi phiên bản (_schema.js) – sửa CREATE/ALTER ở đây thì TĂNG số 1
    await db.batch([
      db.prepare('CREATE TABLE IF NOT EXISTS ai_quota (id TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (id, day)) WITHOUT ROWID'),
      db.prepare('CREATE TABLE IF NOT EXISTS ai_cache (h TEXT PRIMARY KEY, out TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID'),
    ]);
  });
  ready = true;
}

// Nhiều khóa Gemini xoay vòng – kho khóa dùng chung functions/api/_keys.js (Quản trị → Khóa API): D1 api_keys (mã hóa) + biến bí mật
// GEMINI_KEY (chỉ đọc) + danh sách cũ D1 config 'gemini_keys' (tự nhập). Chọn theo trọng số × lượt còn lại, xoay vòng khi hòa;
// 401/403/khóa sai → dead · 429 → nghỉ tới giờ reset · lỗi mạng 3 lần → nghỉ 15 phút; hết khóa dùng được → Workers AI.
export async function geminiKeys(env) { return poolKeys(env, 'gemini'); }
export const resetGeminiCache = () => resetPool();
export async function isCooling(k) { return coolingValue(k); }
export { gemFetch };
// Gọi Gemini với khóa xoay vòng; trả { text, key } hoặc null nếu mọi khóa đều lỗi/hết lượt
export let gemDiag = '';
// Mô hình: Flash mới nhất theo danh sách THẬT của Google (_aichain.js gemModels, đệm 6 h) – không ghi cứng tên sắp hết hạn
export const GEM_MODELS = GEM_FALLBACK;
export let gemModel = GEM_MODELS[0];
export async function geminiCall(env, body, model) {
  const list = await candidates(env, 'gemini', 8); gemDiag = `keys=${list.length} gem=${!!env.GEM}`; if (!list.length) return null;
  for (const c of list) {
    const k = c.key;
    let r; try { for (const m of model ? [model] : await gemModels(env, k)) { r = await gemFetch(env, `models/${m}:generateContent`, k, body); if (r.status !== 404) { gemModel = m; break; } } } catch (e) { await report(env, c.id, 'err', 'net'); continue; }
    if (!r.ok) {
      const t = (await r.clone().text().catch(() => '')).slice(0, 600);
      gemDiag += ` …${k.slice(-4)}:${r.status}:${t.replace(/\s+/g, ' ').slice(0, 400)}`;
      console.log('gemini', k.slice(-4), r.status, t.slice(0, 200)); // xem bằng wrangler pages deployment tail
      await report(env, c.id, 'err', r.status, { text: t, retryAfter: r.headers.get('Retry-After') }); // hết lượt / khóa hỏng → kho khóa cho nghỉ/đánh dấu, thử khóa khác
      continue;
    }
    const j = await r.json().catch(() => null); const text = j && (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
    if (text) { await report(env, c.id, 'ok'); return { text, key: k.slice(-4) }; }
  }
  return null;
}
// Người gọi nội bộ (Quản trị: studio, mạng xã hội) – cùng chuỗi chất lượng; được phép rơi về Llama 8B (allowWeak) như trước, vì không phải câu trả lời cho người học.
export async function runModel(env, sys, prompt, temp = 0.2, use = { gemini: true, wai: true }) {
  const r = await runChain(env, sys, prompt, { temp, use: { gemini: use.gemini !== false, groq: use.groq !== false, wai: use.wai !== false }, allowWeak: true, deadline: Date.now() + 90e3 });
  return { out: r.out, model: r.model, diag: r.diag, tier: r.tier, route: r.route };
}
let alertAt = 0; // đánh giá cảnh báo tỉ lệ model ≤ 1 lần / 10 phút / isolate, chỉ khi vừa có lượt yếu/bận

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  if (+(request.headers.get('Content-Length') || 0) > 65536) return json(request, 413, { error: 'size' }); // đề ≤ 14 000 + sys ≤ 4 000 ký tự
  let body; try { body = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  if (!body || typeof body !== 'object') return json(request, 400, { error: 'json' });
  const prompt = String(body.prompt || ''), sys = String(body.sys || '').slice(0, 4000), rp = body.kind === 'rp', imp = body.kind === 'import'; // 'import' = AI điền nghĩa cho Nhập tài liệu (tính năng `import`, đếm theo từ)
  if (prompt.length < 40 || prompt.length > MAX_PROMPT) return json(request, 400, { error: 'size' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const q = await gate(request, env, rp ? 'chat' : imp ? 'import' : 'ai', { who, json }); // khóa/burst/hết lượt → 429 { error:'quota', … }
  if (q.res) return q.res;
  if (waitUntil) await maybeHealth(env, waitUntil); // kiểm sức khỏe khóa lười (> 24 h, chạy nền)
  try {
    await setup(env.DB);
    const h = await sha(CACHE_V + sys + '\n' + prompt);
    const hit = await env.DB.prepare('SELECT out FROM ai_cache WHERE h = ?').bind(h).first();
    if (hit) return json(request, 200, { out: JSON.parse(hit.out), cached: true }); // bài đã chấm → không tốn lượt (không báo số lượt còn lại)
    await q.take(imp ? Math.min(20, Math.max(1, Math.floor(+body.n) || 1)) : 1); if (q.res) return q.res;
    // Cầu dao: nhà cung cấp gần 80% trần (theo số khóa) → bỏ tuyến đó; không còn tuyến nào → báo bận (máy khách dùng phương án tại máy)
    const [gemN, groqN] = await Promise.all([poolCount(env, 'gemini'), poolCount(env, 'groq')]); // đếm, không giải mã
    const use = { gemini: gemN > 0 && !q.near('gemini', gemN), groq: groqN > 0 && !q.near('groq', groqN), wai: !!env.AI && !q.near('ai') };
    const day = new Date().toISOString().slice(0, 10), up = 'INSERT INTO ai_quota (id, day, n) VALUES (?1, ?2, 1) ON CONFLICT (id, day) DO UPDATE SET n = n + 1'; // '*' / '*rp': đồng hồ "AI hôm nay" ở Quản trị
    const weakSeen = () => { if (waitUntil && Date.now() - alertAt > 600e3) { alertAt = Date.now(); waitUntil(refreshAlerts(env).catch(() => {})); } };
    let r;
    // chấm: nhiệt độ 0 – cùng bài ra cùng band (golden 03/11: 0,2 dao động ±0,5)
    try { r = await runChain(env, sys, prompt, { temp: rp ? 0.7 : 0, rp, use }); }
    catch (e) {
      if (e.message !== 'no-model') throw e;
      console.log('ai busy', e.diag || ''); // xem bằng wrangler pages deployment tail – không trả về công khai
      await env.DB.batch([mixStmt(env.DB, 'busy')]).catch(() => {}); weakSeen();
      return (await q.busy()).res;
    }
    const { out, model, route, tier, diag } = r, wai = route === 'wai';
    const stm = [q.use(route === 'groq' ? 'groq' : wai ? 'ai' : 'gemini', wai ? q.cost : 1), env.DB.prepare(up).bind(rp ? '*rp' : '*', day), mixStmt(env.DB, route)];
    if (tier === 'high') stm.push(env.DB.prepare('INSERT OR IGNORE INTO ai_cache (h, out, at) VALUES (?, ?, ?)') /* OR IGNORE: 1 dòng ghi (REPLACE = xoá + chèn = 2); chỉ chạy khi chưa có trong đệm */.bind(h, JSON.stringify(out), Date.now()));
    if (Math.random() < 0.01) stm.push(pruneStmt(env.DB));
    await env.DB.batch(stm);
    if (WEAK.has(route)) weakSeen();
    out._model = model;
    if (diag && route !== 'gemini') console.log('ai fallback', route, diag); // xem bằng wrangler tail – không trả về công khai
    return json(request, 200, { out, left: q.left, model, tier });
  } catch (e) {
    console.log('ai error', String(e && e.message || e).slice(0, 200));
    return json(request, 503, { error: 'ai' }); // không lộ chi tiết nội bộ
  }
}
