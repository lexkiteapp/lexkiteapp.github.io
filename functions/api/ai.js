/* AI chấm bài miễn phí cho mọi người (không cần tự lấy khóa) – Cloudflare Pages Functions.
 * POST /api/ai  { prompt, sys }  (Authorization: Bearer <Firebase ID token> – không bắt buộc)
 *   → { out: <JSON kết quả>, left: lượt còn lại hôm nay, model }
 * Mô hình: GEMINI_KEY (biến bí mật trên Cloudflare, nếu có) → Workers AI (miễn phí, có sẵn).
 * Hạn mức/ngày: đã đăng nhập 5 lượt, chưa đăng nhập 3 lượt (theo IP đã băm) + trần chung toàn hệ thống để không vượt gói miễn phí.
 * Kết quả lưu đệm trong D1 theo hash đề + bài → chấm lại cùng bài không tốn lượt. */
import { verify, limit } from './sync.js';

const LIMIT_USER = 5, LIMIT_ANON = 3, GLOBAL_DAY = 400, MAX_PROMPT = 14000;
const WAI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const GEMINI = k => `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(k)}`;
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
let ready = false;

const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
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

// Khóa Gemini: biến bí mật GEMINI_KEY (nếu có) hoặc khóa quản trị dán trong trang Quản trị → Cài đặt (D1 config, không công khai)
let gkCache = { v: '', at: 0 };
async function geminiKey(env) {
  if (env.GEMINI_KEY) return env.GEMINI_KEY;
  if (Date.now() - gkCache.at > 300000) { try { gkCache = { v: ((await env.DB.prepare("SELECT v FROM config WHERE k = 'gemini_key'").first()) || {}).v || '', at: Date.now() }; } catch (e) { gkCache = { v: '', at: Date.now() }; } }
  return gkCache.v;
}

async function runModel(env, sys, prompt) {
  const gk = await geminiKey(env);
  if (gk) {
    const r = await fetch(GEMINI(gk), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2, maxOutputTokens: 4096 } }) });
    if (r.ok) { const j = await r.json(); const out = parseJSON((((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('')); if (out) return { out, model: 'gemini-2.5-flash' }; }
  }
  if (!env.AI) throw new Error('no-model');
  const res = await env.AI.run(WAI_MODEL, { messages: [{ role: 'system', content: sys + '\nReply with ONE valid JSON object only, no markdown.' }, { role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.2, response_format: { type: 'json_object' } });
  const raw = res && (res.response ?? res.result?.response);
  const out = raw && typeof raw === 'object' ? raw : parseJSON(raw); // chế độ JSON có thể trả sẵn object
  if (!out) throw new Error('bad-json');
  return { out, model: 'workers-ai/llama-3.1-8b' };
}

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  let body; try { body = await request.json(); } catch (e) { return json(request, 400, { error: 'json' }); }
  const prompt = String(body.prompt || ''), sys = String(body.sys || '').slice(0, 4000);
  if (prompt.length < 40 || prompt.length > MAX_PROMPT) return json(request, 400, { error: 'size' });
  const uid = await verify((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  // Chống bắn liên tục (kể cả bài đã lưu đệm): mỗi người tối đa 6 yêu cầu/phút
  { const w = await limit('ai:' + (uid || request.headers.get('CF-Connecting-IP') || '?'), 6, 60); if (w) return json(request, 429, { error: 'too-fast', wait: w }); }
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const id = uid ? 'u:' + uid : 'ip:' + (await sha('lexkite|' + ip)).slice(0, 24); // không lưu IP gốc
  let cfg = {}; try { cfg = Object.fromEntries(((await env.DB.prepare("SELECT k, v FROM config WHERE k IN ('ai_user', 'ai_anon', 'ai_global')").all()).results || []).filter(r => r.v !== '').map(r => [r.k, +r.v])); } catch (e) { /* chưa có bảng config */ }
  const quota = uid ? (cfg.ai_user >= 0 ? cfg.ai_user : LIMIT_USER) : (cfg.ai_anon >= 0 ? cfg.ai_anon : LIMIT_ANON), day = new Date().toISOString().slice(0, 10);
  try {
    await setup(env.DB);
    const h = await sha(sys + '\n' + prompt);
    const hit = await env.DB.prepare('SELECT out FROM ai_cache WHERE h = ?').bind(h).first();
    const used = (await env.DB.prepare('SELECT n FROM ai_quota WHERE id = ? AND day = ?').bind(id, day).first())?.n || 0;
    if (hit) return json(request, 200, { out: JSON.parse(hit.out), left: Math.max(0, quota - used), cached: true });
    if (used >= quota) return json(request, 429, { error: 'quota', left: 0, signIn: !uid, message: `Bạn đã dùng hết ${quota} lượt AI miễn phí hôm nay. Hãy quay lại vào ngày mai hoặc dùng khóa cá nhân.` });
    const all = (await env.DB.prepare("SELECT n FROM ai_quota WHERE id = '*' AND day = ?").bind(day).first())?.n || 0;
    if (all >= (cfg.ai_global > 0 ? cfg.ai_global : GLOBAL_DAY)) return json(request, 429, { error: 'busy', left: quota - used });
    const { out, model } = await runModel(env, sys, prompt);
    const up = 'INSERT INTO ai_quota (id, day, n) VALUES (?1, ?2, 1) ON CONFLICT (id, day) DO UPDATE SET n = n + 1';
    await env.DB.batch([env.DB.prepare(up).bind(id, day), env.DB.prepare(up).bind('*', day), env.DB.prepare('INSERT OR REPLACE INTO ai_cache (h, out, at) VALUES (?, ?, ?)').bind(h, JSON.stringify(out), Date.now())]);
    out._model = model;
    return json(request, 200, { out, left: Math.max(0, quota - used - 1), model });
  } catch (e) {
    return json(request, 503, { error: 'ai', detail: String(e && e.message || e).slice(0, 120) });
  }
}
