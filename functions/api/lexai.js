/* Dịch nghĩa từ vựng theo NGHĨA + TỪ LOẠI và duyệt AI cho 13 ngôn ngữ – CHỈ cho CI (workflow lexicon-i18n.yml).
 * Xác thực: JWT OIDC của GitHub Actions (repo lexkiteapp/lexkiteapp.github.io, aud "lexkite-lexai") – không cần secret, người lạ 401.
 * Mô hình: kho khóa Gemini miễn phí (xoay khóa, functions/api/ai.js) → dự phòng Workers AI. Mỗi lần ≤ 30 mục.
 * POST { mode: 'translate'|'judge', lang, items: [{ k, w, pos, def, ex, tr? }] } → { out: { k: "bản dịch" | điểm 1–5 }, model }
 * Lời giải bài luyện (scripts/explain/job.mjs, docs/EXPLAIN.md): mode 'xgen' (lang en: soạn mẫu + vì sao + vì sao sai + mẹo + ví dụ),
 *   'xtr' (viết lại phần giải thích cho người nói <lang>, kể cả vi), 'xjudge' (chấm đúng/sư phạm 1–5). Mỗi lần ≤ 15 mục. */
import { runModel, gemDiag } from './ai.js';
import { candidates, report, gemFetch } from './_keys.js';

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

// ---------- Kho kịch bản video ngắn (scripts/scriptbank/job.mjs, docs/VIDEO-SCALE-PLAN.md §16) ----------
// 'vgen': Gemini (mô hình chọn trong VMODELS – mỗi mô hình 1 hạn mức ngày riêng của CÙNG dự án) soạn ≤ 20 kịch bản/lần.
// 'vjudge': Llama 3.3 70B (Workers AI) CHỈ chấm điểm – không viết lại. 429 theo mô hình KHÔNG làm khóa nghỉ (kho lời giải vẫn dùng mô hình khác).
export const VMODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'];
const VGEN = `You are a senior American EFL teacher and short-video scriptwriter. Two US English teachers, Ama and Carlos, teach ONE point per 20-second video to learners worldwide.
Each input item is one teaching point: "k" id, "type", "point" (what to teach), "cefr" (target level), "diff", "hook_type", "topic", and "facts" (dictionary/usage facts – the ONLY source of truth; never contradict them).
For EACH item return an object:
- "point": the teaching point in one plain sentence (≤ 16 words).
- "cefr": A1|A2|B1|B2|C1|C2 of the taught language.
- "topic": one of daily, travel, work, study, shopping, food, health, home, social, tech, money, exam.
- "hook": ≤ 5 words, matching hook_type (question, mistake_callout, challenge, myth, pov, quiz, contrast, number_list, secret_tip, story, surprise, fill_gap, listen_diff, native_says).
- "wrong": ONE sentence many learners really say that is truly wrong or clearly unnatural; "right": the same idea said correctly and naturally (American English). For pronunciation: wrong/right are respellings with the stressed syllable in CAPITALS (e.g. "com-FOR-ta-ble" / "COMF-ter-bul").
- "why": ≤ 12 words, a simple rule a learner can remember (no grammar jargon).
- "ex": exactly 2 new short natural example sentences (≤ 12 words each) using the right form, in everyday situations.
- "memory": ≤ 14 words: an image, contrast pair or tiny formula (e.g. "interested + IN + thing").
- "quiz": {"q": one gap or choice question, "options": 2–3 options, "answer": index of the ONLY correct option, "explain": ≤ 16 words}.
- "lines": 7–9 spoken lines alternating "ama"/"carlos" (start with ama), each ≤ 12 words, 40–55 words in total (the video is 18–28 seconds): hook → "Many learners say …" (wrong) → a pause-to-guess prompt → the right form → why → one example → memory tip → "Repeat after me: …" → the quiz question. Teacher talk is simple English (B1 or easier) except the taught words; friendly, globally neutral: no slang jokes, no religion, politics, brands, celebrities or one-country culture; never blame a nationality ("Many learners…").
- For pronunciation items also "syl": number of syllables and "stress": 1-based stressed syllable (from the IPA in facts).
Every claim must be true for standard American English. If a point is doubtful or has no real learner mistake, still teach it but make "wrong" a genuine common error (wrong preposition, word form, word order, false friend, wrong word choice).
Return ONE JSON object mapping each "k" to its object.`;
const VJUDGE = `You are a strict senior American English teacher reviewing 20-second teaching scripts for learners worldwide. Score each item 1–5:
5 = every fact correct: "wrong" really is wrong/unnatural, "right" is correct natural American English, "why" and "memory" are true, both "ex" are correct and natural, the quiz has exactly ONE correct option and it is "answer", teacher lines are simple (≤ B1) and culturally neutral.
4 = correct, small style issues only. 3 = vague, or one doubtful claim. 2 = one factual error (wrong is actually fine, right is wrong, false rule, quiz has 0 or 2 correct options, bad example). 1 = several errors.
Return ONE JSON object mapping each "k" to {"s": score, "f": "≤ 12-word reason when score ≤ 3, else empty"}.`;
const cutV = x => ({ k: cut(x.k, 80), type: cut(x.type, 30), point: cut(x.point, 300), cefr: cut(x.cefr, 4), diff: cut(x.diff, 8), hook_type: cut(x.hook_type, 20), topic: cut(x.topic, 20), facts: cut(JSON.stringify(x.facts || {}), 900) });
const cutJ = x => ({ k: cut(x.k, 80), type: cut(x.type, 30), point: cut(x.point, 200), facts: cut(x.facts, 400), hook: cut(x.hook, 60), wrong: cut(x.wrong, 160), right: cut(x.right, 160), why: cut(x.why, 120), ex: (Array.isArray(x.ex) ? x.ex : []).slice(0, 2).map(e => cut(e, 140)), memory: cut(x.memory, 120), quiz: { q: cut(x.quiz && x.quiz.q, 160), options: ((x.quiz && x.quiz.options) || []).slice(0, 4).map(o => cut(o, 60)), answer: +(x.quiz && x.quiz.answer) || 0, explain: cut(x.quiz && x.quiz.explain, 140) }, lines: cut((x.lines || []).map(l => l.say || l).join(' / '), 700) });
async function vgen(env, items, model) {
  const body = { systemInstruction: { parts: [{ text: VGEN }] }, contents: [{ role: 'user', parts: [{ text: JSON.stringify(items) }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0.5 } };
  const list = await candidates(env, 'gemini'); let diag = `keys=${list.length}`;
  for (const c of list) {
    let r; try { r = await gemFetch(env, `models/${model}:generateContent`, c.key, body); } catch (e) { diag += ' net'; continue; }
    if (!r.ok) {
      const t = (await r.text().catch(() => '')).replace(/\s+/g, ' ');
      diag += ` ${r.status}:${(/PerDay/.test(t) ? 'PerDay ' : /PerMinute/.test(t) ? 'PerMinute ' : '') + t.replace(/AIza[\w-]+|AQ\.[\w.-]+/g, '').slice(0, 160)}`;
      if (r.status !== 429 && r.status !== 503) await report(env, c.id, 'err', r.status, { text: t }); // 429/503 theo mô hình: không cho cả khóa nghỉ
      continue;
    }
    const j = await r.json().catch(() => null), text = j && (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
    const out = parseJSON(text); if (out) { await report(env, c.id, 'ok'); return { out, model, usage: j.usageMetadata || null }; }
    diag += ' bad-json';
  }
  return { error: 'no-model', diag };
}
const parseJSON = t => { try { const m = String(t || '').match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } };
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const cleanX = x => ({ k: cut(x.k, 120), type: cut(x.type, 40), s: cut(x.s, 300), ans: cut(x.ans, 80), alts: (Array.isArray(x.alts) ? x.alts : []).slice(0, 8).map(a => cut(a, 160)), ctx: cut(x.ctx, 600),
  ...(x.p ? { p: cut(x.p, 120) } : {}), ...(x.why ? { why: cut(x.why, 400), hook: cut(x.hook, 300), wrong: Object.fromEntries(Object.entries(x.wrong || {}).slice(0, 8).map(([a, v]) => [cut(a, 160), cut(v, 300)])) } : {}), ...(Array.isArray(x.ex) ? { ex: x.ex.slice(0, 2).map(e => cut(e, 200)) } : {}) });

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const claims = await verifyOidc((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  if (!claims) return J({ error: 'unauthorized' }, 401);
  const b = await request.json().catch(() => ({}));
  if (b.mode === 'vgen') {
    const items = Array.isArray(b.items) ? b.items.slice(0, 20).map(cutV) : [], model = VMODELS.includes(b.model) ? b.model : VMODELS[0];
    if (!items.length) return J({ error: 'bad-request' }, 400);
    const r = await vgen(env, items, model);
    return r.out ? J(r) : J(r, 503);
  }
  if (b.mode === 'vjudge') {
    const items = Array.isArray(b.items) ? b.items.slice(0, 25).map(cutJ) : [];
    if (!items.length || !env.AI) return J({ error: 'bad-request' }, 400);
    try {
      const res = await env.AI.run(X_WAI, { messages: [{ role: 'system', content: VJUDGE + '\nReply with ONE valid JSON object only, no markdown.' }, { role: 'user', content: JSON.stringify(items) }], max_tokens: 2048, temperature: 0.1, response_format: { type: 'json_object' } });
      const raw = res && (res.response ?? (res.result && res.result.response)), out = raw && typeof raw === 'object' ? raw : parseJSON(raw);
      return out ? J({ out, model: X_WAI, usage: res.usage || null }) : J({ error: 'bad-json', model: X_WAI }, 503);
    } catch (e) { return J({ error: String((e && e.message) || e).slice(0, 120) }, 503); }
  }
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
