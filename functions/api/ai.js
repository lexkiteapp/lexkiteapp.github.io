/* AI chấm bài miễn phí cho mọi người (không cần tự lấy khóa) – Cloudflare Pages Functions.
 * POST /api/ai  { prompt, task: 'grade'|'explain'|'rp'|'rpcoach', rp?: { kind, lv, L, name, role, persona, goal, title, you } }
 *   Prompt hệ thống do MÁY CHỦ chọn theo task (SYS/rpSys bên dưới) – trường `sys` cũ bị bỏ qua.
 *   Khách: header X-Lexkite-Human = vé người thật (web/js/human.js → /api/human); đăng nhập (Authorization: Bearer <Firebase ID token>) thì khỏi cần.
 *   → { out: <JSON kết quả>, left: lượt còn lại hôm nay, model }
 * Mô hình: GEMINI_KEY (biến bí mật trên Cloudflare, nếu có) → Workers AI (miễn phí, có sẵn).
 * Hạn mức: functions/api/_quota.js (tính năng 'ai' = chấm bài, 'chat' = Roleplay kind 'rp') – theo người + theo IP + cầu dao nhà cung cấp
 * (Gemini gần trần → chỉ dùng Workers AI; cả hai gần trần → 429 'quota.busy', máy khách chấm nhanh theo quy tắc / kịch bản soạn sẵn). Xem docs/QUOTAS.md.
 * Kết quả lưu đệm trong D1 theo hash đề + bài → chấm lại cùng bài không tốn lượt. */
import { claims } from './sync.js';
import { gate } from './_quota.js';
import { candidates, report, poolKeys, resetPool, coolingValue, isUsable, gemFetch, maybeHealth } from './_keys.js';
import { once } from './_schema.js';
import { readJSON, bodyFail } from './_body.js';
import { humanGate } from './_human.js';

const MAX_PROMPT = 14000;
const WAI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const GEMINI = () => 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent'; // khóa gửi qua header x-goog-api-key (nhận cả kiểu AIza… lẫn AQ.…)
const ORIGINS = /^(https:\/\/((www\.)?lexkite\.com|([a-z0-9-]+\.)?lexkite\.pages\.dev)|https?:\/\/localhost(:\d+)?|capacitor:\/\/localhost|chrome-extension:\/\/[a-z]{32})$/;
let ready = false;

const cors = req => { const o = req.headers.get('Origin') || ''; return ORIGINS.test(o) ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Lexkite-Device, X-Lexkite-Human', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Max-Age': '86400', Vary: 'Origin' } : {}; };
const json = (req, status, data) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...cors(req) } });
const sha = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const parseJSON = text => { const s = String(text || '').replace(/^```(json)?|```$/g, '').trim(); try { return JSON.parse(s); } catch (e) { const m = s.match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } };

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
// Mô hình theo thứ tự ưu tiên: Google ngừng cấp 2.5-flash cho khóa mới (2026) → dùng 3.8-flash, 2.5 dự phòng cho khóa cũ
export const GEM_MODELS = ['gemini-3.8-flash', 'gemini-2.5-flash'];
export let gemModel = GEM_MODELS[0];
export async function geminiCall(env, body, model) {
  const list = await candidates(env, 'gemini'); gemDiag = `keys=${list.length} gem=${!!env.GEM}`; if (!list.length) return null;
  for (const c of list) {
    const k = c.key;
    let r; try { for (const m of model ? [model] : GEM_MODELS) { r = await gemFetch(env, `models/${m}:generateContent`, k, body); if (r.status !== 404) { gemModel = m; break; } } } catch (e) { await report(env, c.id, 'err', 'net'); continue; }
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
// Workers AI (binding env.AI) – dòng 'env:AI' trong kho khóa: hết 10.000 neuron/ngày → nghỉ tới 0 h UTC; lỗi khác → tạm thời
const waiCode = e => { const m = String((e && e.message) || e); return /4006|neuron|daily free allocation/i.test(m) ? 429 : /3040|capacity|rate/i.test(m) ? 429 : 'net'; };
async function waiRun(env, input) {
  if (!isUsable('env:AI')) throw new Error('no-model'); // đang nghỉ (hết neuron hôm nay) → báo bận như cũ
  try { const res = await env.AI.run(WAI_MODEL, input); await report(env, 'env:AI', 'ok'); return res; }
  catch (e) { await report(env, 'env:AI', 'err', waiCode(e), { text: /4006|neuron|daily/i.test(String(e && e.message)) ? 'PerDay' : '' }); throw e; }
}

export async function runModel(env, sys, prompt, temp = 0.2, use = { gemini: true, wai: true }) {
  const g = use.gemini && await geminiCall(env, { systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', temperature: temp } });
  if (g) { const out = parseJSON(g.text); if (out) return { out, model: gemModel }; }
  if (!env.AI || !use.wai) throw new Error('no-model');
  const res = await waiRun(env, { messages: [{ role: 'system', content: sys + '\nReply with ONE valid JSON object only, no markdown.' }, { role: 'user', content: prompt }], max_tokens: 2048, temperature: temp, response_format: { type: 'json_object' } });
  const raw = res && (res.response ?? res.result?.response);
  const out = raw && typeof raw === 'object' ? raw : parseJSON(raw); // chế độ JSON có thể trả sẵn object
  if (!out) throw new Error('bad-json');
  return { out, model: 'workers-ai/llama-3.1-8b', diag: gemDiag };
}

// ---------- Prompt hệ thống CỐ ĐỊNH phía máy chủ (02/11 bảo mật: máy khách KHÔNG còn gửi được `sys` tùy ý) ----------
// Bản gốc ở máy khách: grade = SYS của web/js/ai.js · explain = AI_SYS của extension/background.js · rp/rpcoach = web/js/roleplay.js.
// Đổi chữ ở máy khách thì đổi CẢ ở đây (scripts/test/ai-task.mjs so khớp nguyên văn).
export const SYS = {
  grade: `You are a certified senior IELTS examiner. Assess strictly according to the official public IELTS band descriptors. Be accurate, not generous: short or off-topic answers must receive low bands. Write all comments, explanations and advice in Vietnamese (clear, encouraging, specific). Quote the learner's exact words when pointing out errors. Return ONLY valid JSON matching the requested schema.`,
  explain: 'You are an expert English teacher helping IELTS/TOEIC learners understand English in context. Be accurate and concise. Return ONLY one valid JSON object matching the requested schema.',
  // máy khách cũ (chưa có task) gửi sys roleplay động → không dùng sys đó, chỉ khung cố định này
  legacyRp: 'You are a friendly English conversation partner and speaking coach for an English learner. Stay in role, keep replies short and natural, never mention you are an AI. Return JSON only.',
  // máy khách cũ gửi sys lạ (không khớp prompt nào ở trên) → khung chung an toàn
  general: 'You are an expert English teacher. Be accurate and concise. Return ONLY one valid JSON object matching the requested schema.',
};
const RP_LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RP_STYLE = { everyday: ['very short, simple sentences with the most common words', 'short, simple sentences with common everyday words', 'natural everyday English'], work: ['short simple sentences, common words', 'natural everyday business English', 'fluent, idiomatic professional English'] };
const RP_MAX = { name: 60, role: 120, persona: 300, goal: 300, title: 160, you: 400 }; // dữ liệu thật dài nhất: 10/60/70/72/42/163
// Trường ngắn của kịch bản → 1 dòng chữ thuần (bỏ ký tự điều khiển/xuống dòng, ` { } < >), cắt theo trần
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029`{}<>]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
/** Dựng prompt hệ thống roleplay từ tham số đã kiểm (cùng mẫu với sysOf trong web/js/roleplay.js). null = tham số sai. */
export function rpSys(p) {
  if (!p || typeof p !== 'object') return null;
  const kind = p.kind === 'everyday' ? 'everyday' : 'work', L = Number.isInteger(p.L) && p.L >= 0 && p.L <= 2 ? p.L : -1, lv = RP_LV.includes(p.lv) ? p.lv : '';
  const f = {}; for (const k of Object.keys(RP_MAX)) f[k] = clean(p[k], RP_MAX[k]);
  if (L < 0 || !lv || !f.name || !f.title) return null;
  return `You are role-playing ${kind === 'everyday' ? 'an everyday' : 'a workplace'} English conversation to help a ${lv} English learner practise speaking.
Your character: ${f.name}, ${f.role}. Personality: ${f.persona}. Your goal: ${f.goal}.
Scenario: ${f.title}. The learner's goal: ${f.you}
Rules: stay in character; speak natural spoken English at ${lv} level (${RP_STYLE[kind][L]}); never correct the learner during the conversation; never mention you are an AI; keep each reply under 45 words.
Return JSON only.`;
}
export const coachSys = kind => `You are a strict but encouraging ${kind === 'everyday' ? 'everyday' : 'business'} English coach. Be accurate: very short or off-topic answers get low scores. Return JSON only.`;
export const TASKS = ['grade', 'explain', 'rp', 'rpcoach'];
/** body → { task, sys, rp } (sys luôn do máy chủ chọn) hoặc { error }. Trường `sys` của máy khách chỉ dùng để NHẬN DIỆN máy khách cũ, không bao giờ gửi cho mô hình. */
export function pickSys(body) {
  const t = body.task;
  if (t === 'grade') return { task: t, sys: SYS.grade, rp: false };
  if (t === 'explain') return { task: t, sys: SYS.explain, rp: false };
  if (t === 'rpcoach') return { task: t, sys: coachSys(body.rp && body.rp.kind), rp: true };
  if (t === 'rp') { const s = rpSys(body.rp); return s ? { task: t, sys: s, rp: true } : { error: 'rp' }; }
  if (t != null) return { error: 'task' };
  // máy khách cũ (add-on/app trong bộ đệm chưa cập nhật): suy ra task, KHÔNG dùng sys của họ
  if (body.kind === 'rp') return { task: 'legacy-rp', sys: SYS.legacyRp, rp: true };
  const old = String(body.sys || '');
  if (old === SYS.grade) return { task: 'grade', sys: SYS.grade, rp: false };
  if (old === SYS.explain) return { task: 'explain', sys: SYS.explain, rp: false };
  return { task: 'general', sys: SYS.general, rp: false };
}
// Cờ chuyển tiếp: AI_HUMAN_ENFORCE='1' → khách không vé/không đăng nhập bị chặn 403 { error:'human' }.
// Chưa bật (mặc định) → vẫn chạy nhưng hạn mức khách giảm một nửa (_quota.js lowTrust). Khi nào bật: docs/HUMAN.md.
export const enforceHuman = env => String((env && env.AI_HUMAN_ENFORCE) || '') === '1';

export const onRequestOptions = ({ request }) => new Response(null, { status: 204, headers: cors(request) });

export async function onRequestPost({ request, env, waitUntil }) {
  if (!env.DB) return json(request, 500, { error: 'no-db' });
  let body; try { body = await readJSON(request, 65536); } catch (e) { const f = bodyFail(e, 'size'); return json(request, f.status, { error: f.error }); } // đề ≤ 14 000 ký tự + tham số roleplay
  if (!body || typeof body !== 'object' || Array.isArray(body)) return json(request, 400, { error: 'json' });
  const prompt = String(body.prompt || '');
  if (prompt.length < 40 || prompt.length > MAX_PROMPT) return json(request, 400, { error: 'size' });
  const pick = pickSys(body); if (pick.error) return json(request, 400, { error: pick.error });
  const { sys, rp } = pick;
  const who = await claims((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  const hg = await humanGate(request, env, { who }); // đăng nhập → bỏ qua; khách → vé X-Lexkite-Human (web/js/human.js)
  if (!hg.ok && enforceHuman(env)) return json(request, hg.status, { error: hg.error });
  const q = await gate(request, env, rp ? 'chat' : 'ai', { who, json, lowTrust: !hg.ok }); // khóa/burst/hết lượt → 429 { error:'quota', … }
  if (q.res) return q.res;
  if (waitUntil) await maybeHealth(env, waitUntil); // kiểm sức khỏe khóa lười (> 24 h, chạy nền)
  try {
    await setup(env.DB);
    const h = await sha(pick.task + '\n' + sys + '\n' + prompt); // đệm theo task + prompt hệ thống (máy chủ dựng) + đề
    const hit = await env.DB.prepare('SELECT out FROM ai_cache WHERE h = ?').bind(h).first();
    if (hit) return json(request, 200, { out: JSON.parse(hit.out), cached: true }); // bài đã chấm → không tốn lượt (không báo số lượt còn lại)
    await q.take(); if (q.res) return q.res;
    // Cầu dao: Gemini gần 80% trần (theo số khóa) → chỉ Workers AI; Workers AI cũng gần trần → báo bận (máy khách dùng phương án tại máy)
    const nKeys = (await geminiKeys(env)).length, use = { gemini: nKeys > 0 && !q.near('gemini', nKeys), wai: !!env.AI && !q.near('ai') };
    if (!use.gemini && !use.wai) return (await q.busy()).res;
    const { out, model, diag } = await runModel(env, sys, prompt, rp ? 0.7 : 0.2, use);
    const wai = /^workers-ai/.test(model), up = 'INSERT INTO ai_quota (id, day, n) VALUES (?1, ?2, 1) ON CONFLICT (id, day) DO UPDATE SET n = n + 1'; // '*' / '*rp': đồng hồ "AI hôm nay" ở Quản trị
    await env.DB.batch([q.use(wai ? 'ai' : 'gemini', wai ? q.cost : 1), env.DB.prepare(up).bind(rp ? '*rp' : '*', new Date().toISOString().slice(0, 10)), env.DB.prepare('INSERT OR IGNORE INTO ai_cache (h, out, at) VALUES (?, ?, ?)') /* OR IGNORE: 1 dòng ghi (REPLACE = xoá + chèn = 2); chỉ chạy khi chưa có trong đệm */.bind(h, JSON.stringify(out), Date.now())]);
    out._model = model;
    if (diag) console.log("gemini fallback", diag); // xem bằng wrangler tail – không trả về công khai
    return json(request, 200, { out, left: q.left, model });
  } catch (e) {
    console.log('ai error', String(e && e.message || e).slice(0, 200));
    return json(request, 503, { error: 'ai' }); // không lộ chi tiết nội bộ
  }
}
