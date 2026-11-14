// Chấm điểm bộ golden AI người dùng (thuần, không mạng) – docs/AI-CHAIN.md §Golden. Test: scripts/test/ai-chain.mjs.
export const GATE = {
  ielts: { recall: 0.9, mae: 0.5, valid: 0.95, lang: 1 },      // bắt ≥ 90 % lỗi đã biết · band lệch TB ≤ 0,5 · ≥ 95 % JSON đúng khuôn · lời giải đúng ngôn ngữ người học
  rp: { mean: 4.0, absurd: 1, valid: 0.95, clarify: 1 },        // giám khảo TB ≥ 4/5 · tối đa 1 câu vô lý / lạc vai · JSON đúng khuôn · câu khó hiểu → hỏi lại
};
export const LANGS = { vi: 'Vietnamese', en: 'English', es: 'Spanish', pt: 'Portuguese', fr: 'French', de: 'German', id: 'Indonesian', th: 'Thai', zh: 'Chinese', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', ar: 'Arabic', ru: 'Russian', tr: 'Turkish' };
const norm = s => String(s || '').replace(/\*+/g, '').toLowerCase().replace(/[’‘`]/g, "'").replace(/[“”"«»]/g, '').replace(/\s+/g, ' ').trim();
/** lỗi e { q, fix } có được bắt? – một mục errors[] trích ĐÚNG CHỖ (quote chứa q, q chứa quote, hoặc chung ≥ 8 ký tự liền) và fix chứa một phương án đúng
 *  (so theo RANH GIỚI TỪ – "it helps" không bị coi là còn "it help") và không còn nguyên cụm sai. Golden 03/11: so chuỗi con thô làm gpt-oss-120b bị chấm oan 81 %. */
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const hasWord = (t, w) => new RegExp('(^|[^a-z0-9\'])' + esc(w) + '($|[^a-z0-9\'])').test(t);
function lcs(a, b) { let best = 0; for (let i = 0; i < a.length; i++) for (let j = 0; j < b.length; j++) { let k = 0; while (a[i + k] && a[i + k] === b[j + k]) k++; if (k > best) best = k; } return best; }
export const sameSpot = (quote, q) => !!quote && (quote.includes(q) || (quote.length >= 4 && q.includes(quote)) || lcs(quote, q) >= Math.min(q.length, 7));
export function caught(e, errors) {
  const q = norm(e.q), alts = String(e.fix).split('|').map(norm);
  return (errors || []).some(x => { const qu = norm(x && x.quote), fx = norm(x && x.fix); return sameSpot(qu, q) && alts.some(a => hasWord(fx, a) && (a.includes(q) || !hasWord(fx, q))); });
}
/** chữ có đúng ngôn ngữ người học? (thô: chữ viết riêng cho ja/zh/ko/ar/hi/th/ru; Latin → từ chức năng phổ biến; vi → dấu tiếng Việt) */
const SCRIPT = { ja: /[぀-ヿ]/, zh: /[一-鿿]/, ko: /[가-힯]/, ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/, th: /[฀-๿]/, ru: /[Ѐ-ӿ]/ };
const WORDS = { es: /\b(el|la|los|las|de|que|y|en|para|con|una?|es|tu|su)\b/g, pt: /\b(o|a|os|as|de|que|e|em|para|com|uma?|é|você|seu)\b/g, fr: /\b(le|la|les|de|des|que|et|en|pour|avec|une?|est|vous|votre)\b/g,
  de: /\b(der|die|das|und|ist|nicht|mit|für|ein|eine|sie|ihr|zu)\b/g, id: /\b(yang|dan|di|ini|itu|untuk|dengan|anda|tidak|ada)\b/g, tr: /\b(ve|bir|bu|için|ile|çok|daha|olarak|cümle)\b/g, en: /\b(the|and|is|your|you|to|of|with)\b/g };
export function inLang(text, lang) {
  const t = String(text || ''); if (!t.trim()) return false;
  if (lang === 'vi') return /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i.test(t);
  if (SCRIPT[lang]) return SCRIPT[lang].test(t);
  const w = WORDS[lang]; return !!w && (t.toLowerCase().match(w) || []).length >= 3 && !/[ăđơư]/i.test(t);
}
/** một bài IELTS: { valid, found, total, diff, langOk } */
export function scoreIelts(c, out) {
  const valid = !!out && Number.isFinite(+out.overall) && Array.isArray(out.criteria) && out.criteria.length >= 3 && Array.isArray(out.errors);
  const found = valid ? c.errors.filter(e => caught(e, out.errors)).length : 0;
  const text = valid ? [out.summary, ...(out.improvements || []), ...(out.criteria || []).map(x => x && x.comment)].join(' ') : '';
  return { id: c.id, valid, found, total: c.errors.length, missed: valid ? c.errors.filter(e => !caught(e, out.errors)).map(e => e.q) : c.errors.map(e => e.q), band: valid ? +out.overall : null, want: c.band, diff: valid ? Math.abs(+out.overall - c.band) : 9, langOk: valid && inLang(text, c.lang || 'vi') };
}
export function sumIelts(rows) {
  const n = rows.length, v = rows.filter(r => r.valid), total = rows.reduce((s, r) => s + r.total, 0), found = rows.reduce((s, r) => s + r.found, 0);
  const lang = rows.filter(r => r.langCase), mae = v.length ? v.reduce((s, r) => s + r.diff, 0) / v.length : 9;
  const S = { n, valid: n ? v.length / n : 0, recall: total ? found / total : 0, mae: Math.round(mae * 100) / 100, lang: lang.length ? lang.filter(r => r.langOk).length / lang.length : 1 };
  S.pass = S.recall >= GATE.ielts.recall && S.mae <= GATE.ielts.mae && S.valid >= GATE.ielts.valid && S.lang >= GATE.ielts.lang;
  return S;
}
/** một lượt roleplay: out = JSON model, j = JSON giám khảo { score, absurd, in_character } */
export function scoreRp(c, out, j) {
  const valid = !!out && typeof out.reply === 'string' && !!out.reply.trim(), words = valid ? out.reply.trim().split(/\s+/).length : 0;
  const clarifyOk = !c.unclear || (valid && out.advance === false);
  const s = j && Number.isFinite(+j.score) ? Math.max(1, Math.min(5, +j.score)) : (valid ? null : 1);
  return { id: c.id, valid, words, score: s, absurd: !!(j && (j.absurd || j.in_character === false)), clarifyOk, reply: valid ? out.reply.slice(0, 200) : null, why: j && j.why ? String(j.why).slice(0, 160) : '' };
}
export function sumRp(rows) {
  const n = rows.length, scored = rows.filter(r => r.score != null), unclear = rows.filter(r => r.unclearCase);
  const S = { n, valid: n ? rows.filter(r => r.valid).length / n : 0, mean: scored.length ? Math.round(scored.reduce((s, r) => s + r.score, 0) / scored.length * 100) / 100 : 0,
    absurd: rows.filter(r => r.absurd).length, clarify: unclear.length ? unclear.filter(r => r.clarifyOk).length / unclear.length : 1, judged: scored.length };
  S.pass = S.judged >= Math.ceil(n * 0.9) && S.mean >= GATE.rp.mean && S.absurd <= GATE.rp.absurd && S.valid >= GATE.rp.valid && S.clarify >= GATE.rp.clarify;
  return S;
}
export const JUDGE_SYS = `You are a strict senior English teacher reviewing ONE reply written by an AI conversation partner in a speaking-practice role-play for English learners.
Judge only the candidate reply, in context. Score 1-5:
5 = perfectly natural spoken English for the stated level, fully in character, responds to what the learner just said, covers the required next point (or, if the learner's last line was unclear/off-topic, politely asks them to clarify), nothing odd.
4 = good, a small stylistic issue. 3 = acceptable but stiff, too long, or only partly covers the point. 2 = a clear problem: ignores the learner, skips/changes the point, wrong level, or slightly odd/irrelevant content. 1 = absurd, illogical or out-of-character (e.g. a question a real person in this role would never ask, or contradicting the scene).
"absurd": true if the reply contains any question or statement that a real person in this role would not say in this situation.
Return ONE JSON object: {"score": integer 1-5, "absurd": boolean, "in_character": boolean, "why": "≤ 20 words"}.`;
export const judgePrompt = ({ s, L, level, transcript, beat, next, unclear, reply }) => `Scenario: ${s.title}. Character: ${s.ai.name}, ${s.ai.role}. Learner level: ${level}.
Conversation so far:\n${transcript}\n
Required next point for the character: ${next ? `"${beat}" (in their own words)` : `close the conversation politely, like "${beat}"`}.${unclear ? '\nNote: the learner\'s last line is unclear or off-topic, so the ideal reply asks them to clarify instead.' : ''}
Candidate reply: "${reply}"`;
