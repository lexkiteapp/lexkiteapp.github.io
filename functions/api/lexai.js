/* Dịch nghĩa từ vựng theo NGHĨA + TỪ LOẠI và duyệt AI cho 13 ngôn ngữ – CHỈ cho CI (workflow lexicon-i18n.yml).
 * Xác thực: JWT OIDC của GitHub Actions (repo lexkiteapp/lexkiteapp.github.io, aud "lexkite-lexai") – không cần secret, người lạ 401.
 * Mô hình: kho khóa Gemini miễn phí (xoay khóa, functions/api/ai.js) → dự phòng Workers AI. Mỗi lần ≤ 30 mục.
 * POST { mode: 'translate'|'judge', lang, items: [{ k, w, pos, def, ex, tr? }] } → { out: { k: "bản dịch" | điểm 1–5 }, model } */
import { runModel } from './ai.js';

const ISS = 'https://token.actions.githubusercontent.com', AUD = 'lexkite-lexai', REPO = 'lexkiteapp/lexkiteapp.github.io';
const NAMES = { es: 'Spanish', pt: 'Brazilian Portuguese', fr: 'French', de: 'German', id: 'Indonesian', th: 'Thai', zh: 'Simplified Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish' };
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

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
export async function onRequestPost({ request, env }) {
  const claims = await verifyOidc((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  if (!claims) return J({ error: 'unauthorized' }, 401);
  const b = await request.json().catch(() => ({}));
  const L = NAMES[b.lang], items = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
  if (!L || !items.length || !['translate', 'judge'].includes(b.mode)) return J({ error: 'bad-request' }, 400);
  const clean = items.map(x => ({ k: String(x.k).slice(0, 80), w: String(x.w).slice(0, 80), pos: String(x.pos || '').slice(0, 20), def: String(x.def || '').slice(0, 240), ex: String(x.ex || '').slice(0, 240), ...(b.mode === 'judge' ? { tr: String(x.tr || '').slice(0, 120) } : {}) }));
  try {
    const r = await runModel(env, b.mode === 'judge' ? SYS_JUDGE(L) : SYS_TR(L), JSON.stringify(clean), 0.1);
    return J({ out: r.out || {}, model: r.model });
  } catch (e) { return J({ error: String((e && e.message) || e).slice(0, 80) }, 503); }
}
