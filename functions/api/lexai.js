/* Dịch nghĩa từ vựng theo NGHĨA + TỪ LOẠI và duyệt AI cho 13 ngôn ngữ – CHỈ cho CI (workflow lexicon-i18n.yml).
 * Xác thực: JWT OIDC của GitHub Actions (repo lexkiteapp/lexkiteapp.github.io, aud "lexkite-lexai") – không cần secret, người lạ 401.
 * Mô hình: kho khóa Gemini miễn phí (xoay khóa, functions/api/ai.js) → dự phòng Workers AI. Mỗi lần ≤ 30 mục.
 * POST { mode: 'translate'|'judge', lang, items: [{ k, w, pos, def, ex, tr? }] } → { out: { k: "bản dịch" | điểm 1–5 }, model }
 * Lời giải bài luyện (scripts/explain/job.mjs, docs/EXPLAIN.md): mode 'xgen' (lang en: soạn mẫu + vì sao + vì sao sai + mẹo + ví dụ),
 *   'xtr' (viết lại phần giải thích cho người nói <lang>, kể cả vi), 'xjudge' (chấm đúng/sư phạm 1–5). Mỗi lần ≤ 15 mục. */
import { runModel, gemDiag } from './ai.js';

const ISS = 'https://token.actions.githubusercontent.com', AUD = 'lexkite-lexai', REPO = 'lexkiteapp/lexkiteapp.github.io';
const NAMES = { en: 'English', vi: 'Vietnamese', es: 'Spanish', pt: 'Brazilian Portuguese', fr: 'French', de: 'German', id: 'Indonesian', th: 'Thai', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish' };
const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
let JWKS = null, JWKS_AT = 0;
export async function verifyOidc(token, now = Date.now()) {
  const [h, p, s] = String(token || '').split('.'); if (!s) return null;
  const head = JSON.parse(new TextDecoder().decode(b64u(h))), body = JSON.parse(new TextDecoder().decode(b64u(p)));
  if (head.alg !== 'RS256' || body.iss !== ISS || body.aud !== AUD || body.repository !== REPO || !(body.exp * 1000 > now)) return null;
  if (!JWKS || now - JWKS_AT > 3600e3) { JWKS = (await (await fetch(ISS + '/.well-known/jwks')).json()).keys || []; JWKS_AT = now; }
  const jwk = JWKS.find(k => k.kid === head.kid); if (!jwk) return null;
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  return (await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(s), new TextEncoder().encode(h + '.' + p))) ? body : null;
}

const SYS_TR = L => `You are a senior bilingual lexicographer writing an English–${L} learner's dictionary (like Oxford/Cambridge bilingual editions).
For EACH item translate the English headword into ${L} in EXACTLY the sense shown by its part of speech, definition and example.
Rules: 1–3 short ${L} equivalents separated by "; " (most common first); keep the part of speech (verb → verb, adjective → adjective);
never translate a different sense or a homonym; no explanations, no romanization, no English unless it is the normal loanword.
Return ONE JSON object mapping each item's "k" to its ${L} translation.`;
const SYS_JUDGE = L => `You are a strict native ${L} reviewer of an English–${L} learner's dictionary.
For EACH item rate how well "tr" translates the English headword in the sense given by pos, def and ex:
5 = exact natural equivalent; 4 = acceptable; 3 = vague or slightly off; 2 = wrong sense or wrong part of speech; 1 = wrong.
Return ONE JSON object mapping each item's "k" to an integer 1–5.`;

// ---------- Lời giải bài luyện ----------
const XGEN = `You are an expert EFL teacher and author of a learner's usage guide (Cambridge/Oxford style). Each item is one multiple-choice gap question:
"s" = sentence with ___, "ans" = correct option, "alts" = wrong options the learner may pick, "type" = question type, "ctx" = existing notes (may be empty).
For EACH item write accurate, short, learner-friendly English:
- "p": the pattern with the answer in [brackets], e.g. "be engaged [in] + N / V-ing", "forgive sb [for] + N / V-ing", "stop + [V-ing]" (≤ 8 words; for word-choice pairs just the collocation frame).
- "why": ONE sentence (≤ 22 words) explaining WHY the answer is right: fixed collocation / dependent preposition / rule, plus the meaning nuance (e.g. "for" = reason).
- "wrong": object mapping EVERY string in "alts" to ONE line (≤ 14 words): what that option would mean instead, or that the combination does not exist. Never claim a wrong option is also correct here; if it is grammatical with another meaning, say so.
- "hook": a tiny memory tip or contrast pair (≤ 14 words), e.g. "apologize for / forgive for / thank for = reason".
- "ex": 2 new short natural example sentences (≤ 12 words each) using the same pattern, different from "s".
Put English words being discussed between *asterisks*. No invented facts. Return ONE JSON object mapping each item's "k" to {p, why, wrong, hook, ex}.`;
const XTR = L => `You are an expert teacher of English for ${L} speakers. Each item has an English explanation of one quiz answer: "why", "hook", "wrong" (option → note).
Rewrite them in natural, simple ${L} for learners (not word-for-word): keep the meaning exactly, keep every *asterisked* English word unchanged inside asterisks,
keep the same keys of "wrong", ≤ 30 words per line. If a typical ${L}-speaker mistake explains the error, you may mention it briefly; never invent rules.
Return ONE JSON object mapping each item's "k" to {why, hook, wrong}.`;
const XJUDGE = L => `You are a strict senior English teacher and native ${L} reviewer. Each item: quiz sentence "s", correct answer "ans", and an explanation in ${L} ("why", "hook", "wrong": option → note), plus "p" (pattern) and "ex" (examples).
Rate 1–5: 5 = fully correct English grammar/usage facts, natural ${L}, every wrong-option note is true; 4 = correct with minor style issues; 3 = vague or one doubtful claim; 2 = a factual error (e.g. calls a wrong option correct, wrong meaning, bad example); 1 = wrong or wrong language.
Return ONE JSON object mapping each item's "k" to an integer 1–5.`;
const X_WAI = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
const parseJSON = t => { try { const m = String(t || '').match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } };
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const cleanX = x => ({ k: cut(x.k, 120), type: cut(x.type, 40), s: cut(x.s, 300), ans: cut(x.ans, 80), alts: (Array.isArray(x.alts) ? x.alts : []).slice(0, 8).map(a => cut(a, 160)), ctx: cut(x.ctx, 600),
  ...(x.p ? { p: cut(x.p, 120) } : {}), ...(x.why ? { why: cut(x.why, 400), hook: cut(x.hook, 300), wrong: Object.fromEntries(Object.entries(x.wrong || {}).slice(0, 8).map(([a, v]) => [cut(a, 160), cut(v, 300)])) } : {}), ...(Array.isArray(x.ex) ? { ex: x.ex.slice(0, 2).map(e => cut(e, 200)) } : {}) });

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const claims = await verifyOidc((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  if (!claims) return J({ error: 'unauthorized' }, 401);
  const b = await request.json().catch(() => ({}));
  if (['xgen', 'xtr', 'xjudge'].includes(b.mode)) {
    const L = NAMES[b.lang], items = Array.isArray(b.items) ? b.items.slice(0, 15).map(cleanX) : [];
    if (!L || !items.length || (b.mode === 'xgen' && b.lang !== 'en')) return J({ error: 'bad-request' }, 400);
    const sys = b.mode === 'xgen' ? XGEN : b.mode === 'xtr' ? XTR(L) : XJUDGE(L), temp = b.mode === 'xjudge' ? 0.1 : 0.3;
    try { // Soạn/viết lại: CHỈ Gemini (Llama 3.3 70B soạn sai ~13/30 mẫu + ghi chú sai chung chung, soát 22/10). Chấm: Gemini → Llama 70B (chấm chéo).
      const r = await runModel(env, sys, JSON.stringify(items), temp, { gemini: true, wai: false });
      return J({ out: r.out || {}, model: r.model });
    } catch (e) {
      if (!env.AI || b.mode !== 'xjudge') return J({ error: String((e && e.message) || e).slice(0, 80), diag: String(gemDiag || '').replace(/…\S{4}:/g, '…').slice(0, 300) }, 503);
      try {
        const res = await env.AI.run(X_WAI, { messages: [{ role: 'system', content: sys + '\nReply with ONE valid JSON object only, no markdown.' }, { role: 'user', content: JSON.stringify(items) }], max_tokens: 4096, temperature: temp, response_format: { type: 'json_object' } });
        const raw = res && (res.response ?? (res.result && res.result.response)), out = raw && typeof raw === 'object' ? raw : parseJSON(raw);
        if (!out) return J({ error: 'bad-json', model: X_WAI }, 503);
        return J({ out, model: X_WAI });
      } catch (e2) { return J({ error: String((e2 && e2.message) || e2).slice(0, 80), diag: String(gemDiag || '').replace(/…\S{4}:/g, '…').slice(0, 200) }, 503); }
    }
  }
  const L = b.lang !== 'en' && b.lang !== 'vi' && NAMES[b.lang], items = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
  if (!L || !items.length || !['translate', 'judge'].includes(b.mode)) return J({ error: 'bad-request' }, 400);
  const clean = items.map(x => ({ k: String(x.k).slice(0, 80), w: String(x.w).slice(0, 80), pos: String(x.pos || '').slice(0, 20), def: String(x.def || '').slice(0, 240), ex: String(x.ex || '').slice(0, 240), ...(b.mode === 'judge' ? { tr: String(x.tr || '').slice(0, 120) } : {}) }));
  try {
    const r = await runModel(env, b.mode === 'judge' ? SYS_JUDGE(L) : SYS_TR(L), JSON.stringify(clean), 0.1);
    return J({ out: r.out || {}, model: r.model });
  } catch (e) { return J({ error: String((e && e.message) || e).slice(0, 80) }, 503); }
}
