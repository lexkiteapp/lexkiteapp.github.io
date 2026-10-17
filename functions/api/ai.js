/* AI chấm bài miễn phí cho mọi người (không cần tự lấy khóa) – Cloudflare Pages Functions.
 * POST /api/ai  { prompt, sys }  (Authorization: Bearer <Firebase ID token> – không bắt buộc)
 *   → { out: <JSON kết quả>, left: lượt còn lại hôm nay, model }
 * Mô hình: GEMINI_KEY (biến bí mật trên Cloudflare, nếu có) → Workers AI (miễn phí, có sẵn).
 * Hạn mức: functions/api/_quota.js (tính năng 'ai' = chấm bài, 'chat' = Roleplay kind 'rp') – theo người + theo IP + cầu dao nhà cung cấp
 * (Gemini gần trần → chỉ dùng Workers AI; cả hai gần trần → 429 'quota.busy', máy khách chấm nhanh theo quy tắc / kịch bản soạn sẵn). Xem docs/QUOTAS.md.
 * Kết quả lưu đệm trong D1 theo hash đề + bài → chấm lại cùng bài không tốn lượt. */
import { claims } from './sync.js';
import { gate } from './_quota.js';

const MAX_PROMPT = 14000;
const WAI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const GEMINI = () => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'; // khóa gửi qua header x-goog-api-key (nhận cả kiểu AIza… lẫn AQ.…)
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
let ready = false;

const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Lexkite-Device', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const parseJSON = text => { const s = String(text || '').replace(/^```(json)?|```$/g, '').trim(); try { return JSON.parse(s); } catch (e) { const m = s.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } };

async function setup(db) {
  if (ready) return;
  await db.batch([
    db.prepare('CREATE TABLE IF NOT EXISTS ai_quota (id TEXT NOT NULL, day TEXT NOT NULL, n INTEGER NOT NULL, PRIMARY KEY (id, day)) WITHOUT ROWID'),
    db.prepare('CREATE TABLE IF NOT EXISTS ai_cache (h TEXT PRIMARY KEY, out TEXT NOT NULL, at INTEGER NOT NULL) WITHOUT ROWID'),
  ]);
  ready = true;
}

// Nhiều khóa Gemini xoay vòng: biến bí mật GEMINI_KEY (nếu có) + danh sách khóa quản trị thêm ở Quản trị (D1 config 'gemini_keys').
// Khóa bị giới hạn (429/403 hết lượt) → "tạm nghỉ" 1 giờ (Cache API ở biên) → tự dùng khóa kế tiếp; hết khóa → Workers AI.
let gkCache = { v: [], at: 0 };
export async function geminiKeys(env) {
  if (Date.now() - gkCache.at > 120000) {
    let list = [];
    try { const rows = (await env.DB.prepare("SELECT k, v FROM config WHERE k IN ('gemini_keys', 'gemini_key')").all()).results || []; for (const r of rows) { if (r.k === 'gemini_keys') { try { list.push(...JSON.parse(r.v).map(x => x.k)); } catch (e) { /* bỏ qua */ } } else if (r.v) list.push(r.v); } } catch (e) { /* chưa có bảng */ }
    gkCache = { v: [...new Set(list.filter(Boolean))], at: Date.now() };
  }
  return [...new Set([env.GEMINI_KEY, ...gkCache.v].filter(Boolean))];
}
export const resetGeminiCache = () => { gkCache.at = 0; };
const coolKey = k => new Request('https://gemini-cool.lexkite.internal/' + k.slice(-10));
export async function isCooling(k) { try { return !!(await /** @type {any} */ (caches).default.match(coolKey(k))); } catch (e) { return false; } }
async function cool(k) { try { await /** @type {any} */ (caches).default.put(coolKey(k), new Response('1', { headers: { 'Cache-Control': 'max-age=3600' } })); } catch (e) { /* bỏ qua */ } }
// Gọi Google Gemini: qua Worker proxy ghim tại Mỹ (env.GEM) nếu có, tránh vùng Gemini chưa hỗ trợ; không có thì gọi thẳng
export async function gemFetch(env, path, key, body, method = 'POST') {
  if (env.GEM) return env.GEM.fetch('https://gem.internal/', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ path, method, key, body }) });
  return fetch('https://generativelanguage.googleapis.com/v1beta/' + path, { method, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key }, body: method === 'GET' ? undefined : JSON.stringify(body) });
}
// Gọi Gemini với khóa xoay vòng (bắt đầu ở vị trí ngẫu nhiên để chia tải); trả { text, key } hoặc null nếu mọi khóa đều lỗi/hết lượt
export let gemDiag = '';
// Mô hình theo thứ tự ưu tiên: Google ngừng cấp 2.5-flash cho khóa mới (2026) → dùng 3.8-flash, 2.5 dự phòng cho khóa cũ
export const GEM_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];
export let gemModel = GEM_MODELS[0];
export async function geminiCall(env, body, model) {
  const keys = await geminiKeys(env); gemDiag = `keys=${keys.length} gem=${!!env.GEM}`; if (!keys.length) return null;
  const start = Math.floor(Math.random() * keys.length);
  for (let n = 0; n < keys.length; n++) {
    const k = keys[(start + n) % keys.length]; if (await isCooling(k)) continue;
    let r; try { for (const m of model ? [model] : GEM_MODELS) { r = await gemFetch(env, `models/${m}:generateContent`, k, body); if (r.status !== 404) { gemModel = m; break; } } } catch (e) { continue; }
    if (!r.ok) gemDiag += ` …${k.slice(-4)}:${r.status}:${(await r.clone().text().catch(() => "")).replace(/\s+/g, " ").slice(0, 400)}`;
    if (!r.ok) console.log('gemini', k.slice(-4), r.status, (await r.clone().text().catch(() => '')).slice(0, 200)); // xem bằng wrangler pages deployment tail
    if (r.status === 429 || r.status === 403 || r.status === 401) { await cool(k); continue; } // hết lượt / khóa hỏng → nghỉ 1 giờ, thử khóa khác
    if (!r.ok) continue;
    const j = await r.json().catch(() => null); const text = j && (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
    if (text) return { text, key: k.slice(-4) };
  }
  return null;
}

async function runModel(env, sys, prompt, temp = 0.2, use = { gemini: true, wai: true }) {
  const g = use.gemini && await geminiCall(env, { systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: temp } });
  if (g) { const out = parseJSON(g.text); if (out) return { out, model: gemModel }; }
  if (!env.AI || !use.wai) throw new Error('no-model');
  const res = await env.AI.run(WAI_MODEL, { messages: [{ role: 'system', content: sys + '\nReply with ONE valid JSON object only, no markdown.' }, { role: 'user', content: prompt }], max_tokens: 2048, temperature: temp, response_format: { type: 'json_object' } });
  const raw = res && (res.response ?? res.result?.response);
  const out = raw && typeof raw === 'object' ? raw : parseJSON(raw); // chế độ JSON có thể trả sẵn object
  if (!out) throw new Error('bad-json');
  return { out, model: 'workers-ai/llama-3.1-8b', diag: gemDiag };
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  let body; try { body = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const prompt = String(body.prompt || ''), sys = String(body.sys || '').slice(0, 4000), rp = body.kind === 'rp';
  if (prompt.length < 40 || prompt.length > MAX_PROMPT) return json(request, 400, { error: 'size' });
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const q = await gate(request, env, rp ? 'chat' : 'ai', { who, json }); // khóa/burst/hết lượt → 429 { error:'quota', … }
  if (q.res) return q.res;
  try {
    await setup(env.DB);
    const h = await sha(sys + '\n' + prompt);
    const hit = await env.DB.prepare('SELECT out FROM ai_cache WHERE h = ?').bind(h).first();
    if (hit) return json(request, 200, { out: JSON.parse(hit.out), cached: true }); // bài đã chấm → không tốn lượt (không báo số lượt còn lại)
    await q.take(); if (q.res) return q.res;
    // Cầu dao: Gemini gần 80% trần (theo số khóa) → chỉ Workers AI; Workers AI cũng gần trần → báo bận (máy khách dùng phương án tại máy)
    const nKeys = (await geminiKeys(env)).length, use = { gemini: nKeys > 0 && !q.near('gemini', nKeys), wai: !!env.AI && !q.near('ai') };
    if (!use.gemini && !use.wai) return (await q.busy()).res;
    const { out, model, diag } = await runModel(env, sys, prompt, rp ? 0.7 : 0.2, use);
    const wai = /^workers-ai/.test(model), up = 'INSERT INTO ai_quota (id, day, n) VALUES (?1, ?2, 1) ON CONFLICT (id, day) DO UPDATE SET n = n + 1'; // '*' / '*rp': đồng hồ "AI hôm nay" ở Quản trị
    await env.DB.batch([q.use(wai ? 'ai' : 'gemini', wai ? q.cost : 1), env.DB.prepare(up).bind(rp ? '*rp' : '*', new Date().toISOString().slice(0, 10)), env.DB.prepare('INSERT OR REPLACE INTO ai_cache (h, out, at) VALUES (?, ?, ?)').bind(h, JSON.stringify(out), Date.now())]);
    out._model = model;
    if (diag) console.log("gemini fallback", diag); // xem bằng wrangler tail – không trả về công khai
    return json(request, 200, { out, left: q.left, model });
  } catch (e) {
    console.log('ai error', String(e && e.message || e).slice(0, 200));
    return json(request, 503, { error: 'ai' }); // không lộ chi tiết nội bộ
  }
}
