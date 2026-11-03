/* Chuỗi model AI phục vụ NGƯỜI DÙNG (/api/ai: chấm Writing/Speaking, Roleplay, Call, tutor, fixer…) – không phải route.
 * Thứ tự theo CHẤT LƯỢNG (bộ golden scripts/ai-golden, docs/AI-CHAIN.md), $0, không AI tài khoản chính:
 *   1. Gemini Flash – kho khóa _keys.js (provider gemini); tên model đọc từ danh sách THẬT của Google (không ghi cứng tên sắp hết hạn)
 *   2. Groq – kho khóa _keys.js (provider groq): các model trong GROQ_OK (đã đạt golden), đúng thứ tự
 *   3. (yếu) Workers AI Llama 8B – CHỈ khi WEAK_OK (golden chưa đạt → tắt) hoặc người gọi nội bộ cho phép (allowWeak). Trả kèm tier 'low'.
 * Không model nào đạt → ném 'no-model' → /api/ai trả quota.busy, máy khách dùng phương án tại máy (Nano / chấm quy tắc / kịch bản) thay vì câu sai.
 * Mỗi lượt có hạn giờ tổng (deadline) để không vượt thời gian chờ của máy khách (Roleplay 30 s, chấm bài 60 s). */
import { candidates, report, gemFetch, isUsable } from './_keys.js';

// Model được phép phục vụ người dùng. Thêm/bớt model = sửa ở đây VÀ chạy golden (ai-golden.yml) – CI trượt nếu model trong danh sách không đạt.
export const GROQ_OK = ['openai/gpt-oss-120b'];
export const GEM_RE = /^gemini-(\d+(?:\.\d+)?)-flash(-preview)?$/; // Flash (không lite/image/tts/live)
export const GEM_FALLBACK = ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-2.5-flash'];
export const WAI_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
export const WEAK_OK = false; // golden 03/11: Llama 3.1 8B trượt (bắt lỗi IELTS < 90 %, roleplay hỏi vô lý) → không phục vụ người dùng
const KEY_TRIES = 3, MODEL_TTL = 6 * 3600e3;

/** Chọn Flash mới nhất từ danh sách id model thật (bản ổn định trước preview cùng số). → tối đa 2 tên */
export function pickGemini(ids) {
  const v = m => { const x = GEM_RE.exec(m); return x ? +x[1] - (x[2] ? 0.001 : 0) : null; };
  return [...new Set((ids || []).map(x => String(x).replace(/^models\//, '')))].filter(m => v(m) != null).sort((a, b) => v(b) - v(a)).slice(0, 2);
}
/** Groq: giữ thứ tự GROQ_OK, chỉ model còn trong danh sách thật (rỗng/lỗi đọc → giữ nguyên GROQ_OK) */
export const pickGroq = ids => { const s = new Set(ids || []); const f = GROQ_OK.filter(m => s.has(m)); return ids && ids.length ? f : GROQ_OK.slice(); };

const M = { gem: null, gemAt: 0, groq: null, groqAt: 0 };
export const resetModels = () => { M.gem = M.groq = null; M.gemAt = M.groqAt = 0; };
const tmo = ms => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

export async function gemModels(env, key) {
  if (M.gem && Date.now() - M.gemAt < MODEL_TTL) return M.gem;
  let list = [];
  try { // danh sách thật (gọi thẳng; vùng bị chặn → dò từng tên qua Worker ghim Mỹ)
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?pageSize=200', { headers: { 'x-goog-api-key': key }, signal: tmo(5000) });
    if (r.ok) list = pickGemini(((await r.json()).models || []).filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => m.name));
  } catch (e) { /* dò bên dưới */ }
  if (!list.length) for (const m of GEM_FALLBACK) { try { const r = await gemFetch(env, 'models/' + m, key, null, 'GET'); if (r.ok) { list.push(m); if (list.length >= 2) break; } } catch (e) { break; } }
  M.gem = list.length ? list : GEM_FALLBACK.slice(0, 2); M.gemAt = Date.now();
  return M.gem;
}
async function groqModels(key) {
  if (M.groq && Date.now() - M.groqAt < MODEL_TTL) return M.groq;
  let ids = null;
  try { const r = await fetch('https://api.groq.com/openai/v1/models', { headers: { Authorization: 'Bearer ' + key }, signal: tmo(5000) }); if (r.ok) ids = ((await r.json()).data || []).filter(m => m.active !== false).map(m => m.id); } catch (e) { /* giữ GROQ_OK */ }
  M.groq = pickGroq(ids); M.groqAt = Date.now();
  return M.groq;
}

// Thân yêu cầu từng nhà cung cấp – MỘT nguồn cho máy chủ và bộ golden (scripts/ai-golden/run.mjs gọi y hệt)
export const gemBody = (m, sys, prompt, temp = 0.2, rp = false) => ({ systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: prompt }] }],
  generationConfig: { responseMimeType: 'application/json', temperature: temp, maxOutputTokens: 8192, thinkingConfig: /gemini-2\./.test(m) ? { thinkingBudget: rp ? 0 : 1024 } : { thinkingLevel: 'low' } } });
export const groqBody = (m, sys, prompt, temp = 0.2, rp = false) => ({ model: m, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], temperature: temp, max_completion_tokens: 8192,
  response_format: { type: 'json_object' }, ...(/gpt-oss/.test(m) ? { reasoning_effort: rp ? 'low' : 'medium' } : {}) });
/** Groq 400 do model không sinh nổi JSON hợp lệ (không phải lỗi khóa) → thử lại không response_format */
export const JSON_FAIL = /Failed to (generate|validate) JSON|json_validate_failed/i;
export const groqRetry = b => { const { response_format: _, ...rest } = b; return rest; };
export const waiBody = (sys, prompt, temp = 0.2) => ({ messages: [{ role: 'system', content: sys + '\nReply with ONE valid JSON object only, no markdown.' }, { role: 'user', content: prompt }], max_tokens: 2048, temperature: temp, response_format: { type: 'json_object' } });
/** text trả về của Gemini (bỏ phần "thought") */
export const gemText = j => (((j && j.candidates) || [])[0] || { content: { parts: [] } }).content?.parts?.filter(p => !p.thought).map(p => p.text || '').join('') || '';
export const parseJSON = text => { const s = String(text || '').replace(/^\s*```(json)?|```\s*$/g, '').trim(); try { return JSON.parse(s); } catch (e) { const m = s.match(/\{[\s\S]*\}/); try { return m ? JSON.parse(m[0]) : null; } catch (e2) { return null; } } };
/** Kết quả có đúng khuôn người gọi yêu cầu? (chấm IELTS: overall + criteria; roleplay: reply) – sai khuôn → thử model kế */
export function validOut(out, prompt) {
  if (!out || typeof out !== 'object' || Array.isArray(out) || !Object.keys(out).length) return false;
  const p = String(prompt || '');
  if (/"overall": number/.test(p) && !(Number.isFinite(+out.overall) && Array.isArray(out.criteria) && out.criteria.length)) return false;
  if (/JSON: \{"reply": string/.test(p) && !(typeof out.reply === 'string' && out.reply.trim())) return false;
  return true;
}

/** Một lượt qua chuỗi. o: { temp, rp, deadline (ms tuyệt đối), use: { gemini, groq, wai }, allowWeak, gemMs (trần mỗi lượt Gemini) }
 *  → { out, model, route: 'gemini'|'groq'|'wai', tier: 'high'|'low', diag } · không model nào được → Error('no-model') (kèm .diag) */
export async function runChain(env, sys, prompt, o = {}) {
  const temp = o.temp ?? 0.2, rp = !!o.rp, use = { gemini: true, groq: true, wai: true, ...(o.use || {}) }, end = o.deadline || Date.now() + (rp ? 25e3 : 55e3);
  const left = () => end - Date.now(), diag = [];
  const done = (out, model, route, tier) => ({ out, model, route, tier, diag: diag.join(' ') });

  if (use.gemini) {
    const list = await candidates(env, 'gemini', KEY_TRIES); diag.push('gem=' + list.length);
    if (list.length) {
      const models = await gemModels(env, list[0].key);
      const body = m => gemBody(m, sys, prompt, temp, rp);
      // mỗi lượt Gemini ≤ gemMs và luôn chừa thời gian cho Groq (Gemini treo không được ăn hết hạn giờ của máy khách)
      const reserve = use.groq ? (rp ? 8e3 : 20e3) : 2e3, cap = o.gemMs || (rp ? 12e3 : 30e3);
      for (const c of list) {
        if (left() < reserve + 3e3) break;
        let r = null, used = '';
        try {
          for (const m of models) { used = m; let to; r = await Promise.race([gemFetch(env, `models/${m}:generateContent`, c.key, body(m)), new Promise((y, n) => { to = setTimeout(() => n(new Error('timeout')), Math.max(3e3, Math.min(cap, left() - reserve))); })]).finally(() => clearTimeout(to)); if (r.status !== 404) break; M.gemAt = 0; }
        } catch (e) { diag.push('gem:' + (e.message === 'timeout' ? 'timeout' : 'net')); await report(env, c.id, 'err', 'net'); continue; }
        if (!r.ok) { const t = (await r.text().catch(() => '')).slice(0, 400); diag.push(`gem…${c.key.slice(-4)}:${r.status}`); console.log('gemini', c.key.slice(-4), r.status, t.slice(0, 160)); await report(env, c.id, 'err', r.status, { text: t, retryAfter: r.headers.get('Retry-After') }); continue; }
        const j = await r.json().catch(() => null), text = gemText(j);
        const out = parseJSON(text);
        if (validOut(out, prompt)) { await report(env, c.id, 'ok'); return done(out, used, 'gemini', 'high'); }
        diag.push('gem:bad');
      }
    }
  }

  if (use.groq && left() > 4e3) {
    const list = await candidates(env, 'groq', KEY_TRIES); diag.push('groq=' + list.length);
    if (list.length) {
      const models = await groqModels(list[0].key);
      for (const m of models) {
        let tried = 0;
        for (const c of list) {
          if (left() < 4e3 || tried >= KEY_TRIES) break; tried++;
          let r;
          try {
            const go = b => fetch('https://api.groq.com/openai/v1/chat/completions', { method: 'POST', headers: { Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' }, signal: tmo(Math.max(3e3, left() - 2e3)), body: JSON.stringify(b) });
            const b = groqBody(m, sys, prompt, temp, rp); r = await go(b);
            // golden 03/11: gpt-oss ở chế độ JSON đôi khi trả 400 "Failed to generate/validate JSON" (~10 % bài chấm dài) → thử lại 1 lần không ép chế độ JSON (parseJSON tự tách)
            if (r.status === 400 && left() > 6e3) { const t = await r.clone().text().catch(() => ''); if (JSON_FAIL.test(t)) { diag.push('groq:json-retry'); r = await go(groqRetry(b)); } }
          } catch (e) { diag.push('groq:net'); await report(env, c.id, 'err', 'net'); continue; }
          if (!r.ok) { const t = (await r.text().catch(() => '')).slice(0, 400); diag.push(`groq…${c.key.slice(-4)}:${r.status}`); await report(env, c.id, 'err', r.status, { text: t, retryAfter: r.headers.get('Retry-After') }); if (r.status === 404 || (r.status === 400 && /model/i.test(t))) { M.groqAt = 0; break; } continue; }
          const j = await r.json().catch(() => null), out = parseJSON((((j && j.choices) || [])[0] || { message: {} }).message.content);
          if (validOut(out, prompt)) { await report(env, c.id, 'ok'); return done(out, 'groq/' + m, 'groq', 'high'); }
          diag.push('groq:bad'); break; // model trả sai khuôn → model kế, không đốt thêm khóa
        }
      }
    }
  }

  if (use.wai && (WEAK_OK || o.allowWeak) && env.AI && isUsable('env:AI') && left() > 3e3) {
    try {
      const res = await env.AI.run(WAI_MODEL, waiBody(sys, prompt, temp));
      await report(env, 'env:AI', 'ok');
      const raw = res && (res.response ?? (res.result && res.result.response)), out = raw && typeof raw === 'object' ? raw : parseJSON(raw);
      if (validOut(out, prompt)) return done(out, 'workers-ai/llama-3.1-8b', 'wai', 'low');
      diag.push('wai:bad');
    } catch (e) { const m = String((e && e.message) || e); diag.push('wai:err'); await report(env, 'env:AI', 'err', /4006|neuron|daily free allocation|3040|capacity|rate/i.test(m) ? 429 : 'net', { text: /4006|neuron|daily/i.test(m) ? 'PerDay' : '' }); }
  }
  throw Object.assign(new Error('no-model'), { diag: diag.join(' ') });
}
