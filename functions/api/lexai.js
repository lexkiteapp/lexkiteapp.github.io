/* Dịch nghĩa từ vựng theo NGHĨA + TỪ LOẠI và duyệt AI cho 13 ngôn ngữ – CHỈ cho CI (workflow lexicon-i18n.yml).
 * Xác thực: JWT OIDC của GitHub Actions (repo lexkiteapp/lexkiteapp.github.io, aud "lexkite-lexai") – không cần secret, người lạ 401.
 * Mô hình: kho khóa Gemini miễn phí (xoay khóa, functions/api/ai.js) → dự phòng Workers AI. Mỗi lần ≤ 30 mục.
 * POST { mode: 'translate'|'judge', lang, items: [{ k, w, pos, def, ex, tr? }] } → { out: { k: "bản dịch" | điểm 1–5 }, model }
 * Lời giải bài luyện (scripts/explain/job.mjs, docs/EXPLAIN.md): mode 'xgen' (lang en: soạn mẫu + vì sao + vì sao sai + mẹo + ví dụ),
 *   'xtr' (viết lại phần giải thích cho người nói <lang>, kể cả vi), 'xjudge' (chấm đúng/sư phạm 1–5). Mỗi lần ≤ 15 mục. */
import { candidates, report, gemFetch } from './_keys.js';

import { stripBackgroundAI } from './_d1guard.js';
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

// ---------- Mở rộng kho từ 20k (scripts/lexicon/expand/job.mjs, docs/LEXICON.md §Mở rộng) ----------
// 'lxgen' (Gemini, ≤ 10 mục): soạn mục từ từ nghĩa WordNet · 'lxtr' (Gemini, ≤ 10 mục × 13 ngôn ngữ) · 'lxjudge' (model = gemini-* HOẶC gemma-* – 2 họ khác nhau, ≤ 10 mục): chấm + dịch ngược.
export const LX_GEN = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'], LX_JUDGE = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3-flash-preview', 'gemma-3-27b-it'];
export const LX_LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
// Prompt v3 (pilot 7 run 40080605181 soát tay 19/25: lệch nghĩa prop/tweet, vi sai palm, viết tắt sec, CEFR assault): KHÓA NGHĨA + câu hỏi giám khảo sense/cefr/vi/bad.
// Prompt v2 (pilot 40077853589: 104/500 đạt; ~100 trượt dịch/dịch ngược, 32 trượt giám khảo – xem docs/LEXICON.md §Mở rộng 20k / Pilot 5).
const LXGEN = `You are a senior lexicographer writing a learner's dictionary (Oxford Learner's / Cambridge style) for Vietnamese and international learners.
Each item: "k" id, "w" headword, "pos" (n|v|adj|adv), "gloss" (the LOCKED sense: the most frequent learner sense of the word – WordNet), "lemmas" (other words with this exact sense), "wnex" (WordNet usage examples of this sense), "cefr" (estimated level), "lex" (WordNet category), "topics" (allowed topic ids).
SENSE LOCK (hard rule): describe ONLY the gloss sense. Every field – def, both examples, col, syn, vi, note_vi – must express exactly this sense; never another sense, a homonym, a figurative/specialist sense (a theatre "prop" when the gloss is a support) or a sense of a different subject (birds "tweet", crickets do not). If you cannot write natural examples of this sense, return "keep": false with "why": "sense".
For EACH item return an object:
- "keep": false if "w" is a proper noun or derived from a name, first name, brand, abbreviation or clipped form (sec, info), offensive/slur, misspelling, slang or not a real dictionary headword in this part of speech; else true. If false add "why" (≤ 8 words) and nothing else.
- "pos": n|v|adj|adv (normally the given one).
- "def": ONE learner definition of THIS sense, ≤ 16 words, using only common words (CEFR B1 or easier); do not use the headword itself. Be factually exact (an ion IS a charged atom, not part of one; a verb definition keeps the right subject/object: "dwarf" = to make something seem small). The gloss may be written for a synonym in "lemmas": keep only what is true of "w" itself (confiscate = take away by authority, NOT "for a short time" like impound; outset = the start, not "when something is planned to start").
- "ex": exactly 2 natural, modern, grammatical example sentences (8–16 words each) that use "w" itself (or its inflection) in this sense and part of speech, with a typical subject/object for this sense; everyday or academic contexts; no names of real people. Each example must be literally true/possible in the real world and agree with "def" (ice does not melt INTO a cube; a "boyfriend" example must fit the def's partner) – re-read it as a native editor would.
- "col": 2–3 frequent collocations containing "w" (e.g. "strictly forbidden").
- "syn": 1–3 synonyms in this sense (single words or short phrases), [] if none. Only true synonyms (a frog is not a toad).
- "cefr": A1|A2|B1|B2|C1|C2 – how advanced the word is for learners (English Vocabulary Profile style; news/crime/legal/technical words are B2+ even when frequent in news, e.g. assault = B2; rare/technical = C1–C2).
- "topic": ONE id from "topics" that clearly fits, or "" if none fits.
- "emoji": ONE emoji that clearly shows this sense, or "" if none fits well.
- "vi": Vietnamese meaning: 1–3 short equivalents separated by "; " in exactly this sense and part of speech (most common first), as printed in a good English–Vietnamese dictionary (palm of the hand = lòng bàn tay). Standard terms only (bronze = đồng thiếc, not đồng thau; established loanwords like "hydro", "ion" are fine); never a made-up descriptive phrase. Same part of speech in Vietnamese: an adjective gets a Vietnamese adjective phrase (rocky = nhiều đá; lởm chởm, never the noun "đá"), a verb a verb (outgrow = lớn quá khổ, không còn vừa). Exactly the def's thing or effect, not a near neighbour (fatal "causing death" = gây tử vong; chết người, not nghiệt ngã; derby hat = mũ quả dưa, not mũ nồi = beret; brad = đinh nhỏ không mũ, not đinh tán = rivet).
- "note_vi": ONE short Vietnamese note (≤ 20 words) about a typical mistake Vietnamese learners make with this word (false friend, wrong preposition, confusing pair, spelling) – "" if there is no real, useful one. Never invent; never give pronunciation advice.
ONE SENSE ONLY: def, both examples, col, syn, vi and note_vi must all describe the SAME single sense (the gloss sense). Re-read each example and collocation: if it shows another sense (crown of a tooth vs a dental crown; a mill as a factory vs a flour mill; cricket the insect vs the sport) rewrite it.
Return ONE JSON object mapping each "k" to its object.`;
const LXTR = `You are a senior bilingual lexicographer. Each item: "k", English headword "w", "pos", WordNet "gloss", learner definition "def" and 2 examples "ex" – together they fix ONE sense.
Translate the headword in EXACTLY this sense and part of speech into each language listed in the item's \"need\" (all of the following when \"need\" is absent): vi (Vietnamese), es (Spanish), pt (Brazilian Portuguese), fr (French), de (German), id (Indonesian), th (Thai), zh (Simplified Chinese), ja (Japanese), ko (Korean), hi (Hindi), ar (Arabic), ru (Russian), tr (Turkish).
Rules:
- 1–3 short native dictionary equivalents separated by "; " (most common first). Each is a word or a short fixed expression (≤ 3 words); use a multi-word equivalent only when the language has no single word (e.g. "take aback" → es "desconcertar", ko "당황하게 하다").
- Same sense: neither broader nor narrower (berry ≠ blueberry, bronze ≠ brass, naval ≠ fleet). It must fit the examples.
- Same part of speech in dictionary form: verbs as infinitive/dictionary form (ko/ja verbs end in -다 / -る/-う form), adjectives as adjectives (never "X rate" nouns for an adjective), adverbs as adverbs, nouns as nouns.
- Native script only; never transliterate the English word when a native word exists; a standard loanword only if it is what dictionaries give (then still put a native word first when one exists).
- No explanations, brackets, notes, romanization or English.
Return ONE JSON object mapping each "k" to {"<lang>": "…"} with exactly the requested languages.
If the item has "fix", a checker rejected your previous answer for that reason (e.g. a word that does not exist in that language, or a word from another language): give a common, real dictionary word of THAT language.`;
// SOURCE-FIRST v4 (24/10, pilot 8 soát 50 → ~10 sai): nghĩa + định nghĩa = WordNet (AI CHỈ viết lại gloss cho dễ, cấm đổi nghĩa) · ví dụ = câu NGƯỜI VIẾT
// (Tatoeba / Wiktionary, giám khảo chọn câu đúng nghĩa) · dịch = bảng dịch Wiktionary theo nghĩa (giám khảo khớp gloss) · AI chỉ lấp chỗ trống, chấm 2 họ + dịch ngược.
const LXDEF = `You simplify WordNet glosses for a learner's dictionary (Oxford Learner's style). Each item: "k", headword "w", "pos" (n|v|adj|adv), "gloss" (the LOCKED WordNet sense), "lemmas" (other words with this exact sense), "wnex" (WordNet examples), "topics" (allowed topic ids).
For EACH item return {"keep": true|false, "def": "…", "topic": "…"}:
- "keep": false (plus "why" ≤ 8 words, nothing else) if "w" is a proper noun or derived from a name, a brand, an abbreviation or clipped form, offensive/slur, slang, a misspelling or not a real dictionary headword in this part of speech.
- "def": rewrite the gloss as ONE learner definition of ≤ 16 words using only common words (CEFR B1 or easier), without the headword itself. It MUST NOT change the meaning: same scope (not broader, not narrower), keep every essential element of the gloss (who/what, purpose, manner), add nothing that the gloss does not say, never add examples or qualifiers. The gloss may be written for a synonym in "lemmas": keep only what is true of "w". Verbs start with "to …"; nouns with "a/an …", "the …" or an uncountable phrase; adjectives/adverbs describe. If the gloss is already simple, keep its wording. The def must still fit ONLY "w": if the gloss alone would equally describe a clearly different thing (seawater "water containing salts" also fits mineral water), add the one defining feature that the headword itself states ("salty water from the sea") – nothing else. If the item has "fix", a reviewer rejected your previous def for that reason: write a new def that stays very close to the gloss wording (only replace hard words).
- "topic": ONE id from "topics" that clearly fits this sense, or "".
Return ONE JSON object mapping each "k" to its object.`;
const LXSRC = `You are a strict senior lexicographer verifying a learner's dictionary entry that is assembled from HUMAN sources. Each item: "k", headword "w", "pos", "gloss" (the LOCKED WordNet sense), "lemmas" (synonyms in this sense), "def" (a simplified rewrite of the gloss), "ex" (numbered candidate example sentences written by people – Tatoeba / Wiktionary), "cols" (candidate phrases), "ts" (numbered sense labels of Wiktionary translation tables).
For EACH item return {"def": "same"|"changed", "f": "…", "ex": [indices], "col": [phrases], "ts": index}:
- "def": "same" only if "def" means exactly what "gloss" means for "w" (same scope, no essential element lost, nothing added, right part of speech) – adding only what the headword itself obviously states (seawater → "from the sea") still counts as "same"; else "changed" and "f" = ≤ 12-word reason.
- "ex": indices (0-based) of the sentences in which "w" (or its inflection) is used in EXACTLY the gloss sense and part of speech, and the sentence is natural, correct, sensible and suitable for teenage learners (no sex, drugs, gore, insults). Exclude a sentence that uses another sense, a figurative or idiomatic sense, a phrasal verb with another meaning, a name, or that is odd or unclear out of context. [] if none.
- "col": the phrases from "cols" that are common, natural phrases using "w" in exactly the gloss sense ([] if none). Never add new phrases.
- "ts": index of the "ts" label that means the gloss sense (same meaning, not a different sense of the word), or -1 if none clearly matches. A label for a similar but different thing (cookie vs. a soft-bread biscuit, a skin wrinkle vs. a fold line) is NOT a match.
Return ONE JSON object mapping each "k" to its object.`;
const LXEX = `You are a senior lexicographer. Each item: "k", headword "w", "pos", "gloss" (the LOCKED WordNet sense), "def", "lemmas", "wnex" (WordNet examples), "n" (how many sentences to write), "avoid" (sentences already chosen).
Write exactly "n" new example sentences (8–14 words each) that use "w" itself (or its inflection) in EXACTLY this sense and part of speech, with a typical subject/object for this sense; plain modern English with common words; no names of real people. Each sentence must describe a typical, everyday real situation for this sense (no unlikely events, no transformations like "the field became a minefield"), be literally true/possible, agree with "def" and differ from "avoid". Re-read each as a native editor: if it shows another sense or sounds odd, rewrite it.
Return ONE JSON object mapping each "k" to {"ex": ["…"]}.`;
// "RA LÀ OK" (29/10): trắc nghiệm NGHĨA thay cho câu hỏi có/không – giám khảo hay trả "sense yes" cho ví dụ dùng nghĩa lân cận (railroad, palate,
// muscular), vi sai nghĩa khoá (idol "thần tượng", daze "chạng vạng") và bảng dịch ghép nhầm nghĩa. Mỗi trường (câu, vi, bản dịch, nghĩa 1 Wiktionary)
// là một "probe": giám khảo phải CHỌN SỐ nghĩa WordNet (0 = không nghĩa nào/không tự nhiên/không có thật). Nhận khi CẢ 3 giám khảo chọn đúng số nghĩa khoá.
const LXWSD = `You are a careful lexicographer doing word-sense disambiguation for a learner's dictionary. Each item: "k", headword "w", "pos", numbered "senses" (the WordNet senses of "w" as this part of speech) and "probes" (an object: probe id → text).
Probe kinds by id prefix: "wk" = a definition of "w" taken from another dictionary; "ex" = an English sentence that uses "w"; "vi" = a Vietnamese word offered as a translation of "w"; "tr_xx" = a word in language xx (ISO 639-1 code) offered as a translation of "w".
For EACH probe answer ONE integer: the number of the sense the probe expresses. "wk": the sense this definition describes. "ex": the sense in which "w" is used in this sentence. "vi" / "tr_xx": the sense of "w" that this word means as a native speaker of that language understands it.
Answer 0 when no listed sense fits exactly: another meaning, a broader, narrower or neighbouring meaning, a related thing or effect (a worshipped statue ≠ an admired celebrity: Vietnamese "thần tượng" = celebrity idol; twilight ≠ shock). Also 0 for "ex" when "w" is used as another part of speech, in an idiom, phrasal verb or name, or when the sentence is unnatural, implausible (an unlikely event or transformation: "A man was hit by a waterfall", "the abandoned field became a minefield"), forced or something a careful native editor would not write. Also 0 for "vi" / "tr_xx" when it is not a real, common dictionary word of that language, is another part of speech than "w" (adjective vs noun, adverb vs adjective), is a transliteration while a native word exists, or is in another language.
Judge what the probe text actually means, never what it is supposed to mean. If unsure, answer 0.
Return ONE JSON object mapping each "k" to {"<probe id>": number, ...} with every probe id of that item.`;
// nguồn vi THỨ HAI, độc lập (họ mô hình khác bản lxtr): vi nhận khi ≥ 2 nguồn (Wiktionary / lxtr / lxvi) cùng đưa ra + trắc nghiệm nghĩa 3 giám khảo
const LXVI = `You are a senior English–Vietnamese lexicographer. Each item: "k", headword "w", "pos", WordNet "gloss" (the ONE sense), "lemmas" (synonyms in this sense), learner definition "def".
Give 1–3 standard Vietnamese dictionary equivalents of "w" in EXACTLY this sense and part of speech, most common first, separated by "; " – as printed in a good English–Vietnamese dictionary. Same part of speech (adjective → Vietnamese adjective phrase, verb → verb). Not a neighbouring thing or a broader/narrower word; never a made-up descriptive phrase; no explanations or brackets.
Return ONE JSON object mapping each "k" to {"vi": "…"}.`;
const LXJUDGE = `You are a careful senior lexicographer and native-level reviewer of a learner's dictionary. Each item: headword "w", "pos", WordNet "gloss" (the LOCKED sense), "lemmas"/"wnex" (WordNet synonyms/examples of that sense), entry fields "def", "ex" (2 examples), "col", "syn", "cefr", "vi" (Vietnamese), "note_vi", "tr" (translations by language code) and sometimes "vi_wikt" (Vietnamese equivalents from Wiktionary, any sense of this part of speech, sense in brackets).
OUTPUT SHAPE: ONE JSON object whose KEYS are the items' "k" values, e.g. {"<k1>": {…}, "<k2>": {…}} – never a bare item object, never an array. For EACH item the value is {"sense": "yes"|"no", "s": score, "f": reason, "cefr": level, "tr": {lang: score}, "bt": {lang: back}, "bad": {lang: "translit"|"pos"}, "bt_vi": back} plus "vi": "ok"|"alt"|"unsure" and "vi_fix" when "vi_wikt" is given:
- "sense": Do the definition, BOTH examples, the collocations, vi and the translations use exactly the gloss sense (same meaning, same part of speech, a natural subject/object for it)? "no" if any of them shows another sense, a homonym, a specialist sense or an unnatural/ungrammatical use.
- "s" 1–5 for the English entry + Vietnamese: 5 = def accurate and simple (≤ B1 words), both examples correct and natural, collocations real, synonyms right, cefr plausible, vi exact, note_vi true or empty; 4 = correct with minor issues (slightly broad/narrow def, a missing nuance, a weaker collocation, cefr one level off, style); 3 = one doubtful element; 2 = one clear error (factually wrong def, an example or collocation in another sense or part of speech, a false synonym, a false note, a wrong vi – including a vi in another part of speech (adjective rocky → noun "đá") or naming a neighbouring thing/effect (fatal → "nghiệt ngã", derby → "mũ nồi")); 1 = several errors or not a real headword.
  The entry must describe exactly the gloss sense; a different sense (even a common one) is an error (s ≤ 2, sense "no"). Also a clear error (s ≤ 2): an example that is physically/logically impossible, contradicts the def, or that a native editor would never write ("The ice melted into a perfect cube"); a def carrying a qualifier from a synonym's sense that is false for "w" (confiscate "for a short time"). Not a real headword, an abbreviation or clipped form (sec, info) or slang → s = 1.
- "cefr": YOUR independent CEFR level A1–C2 for this word in this sense (English Vocabulary Profile style), ignoring the entry's cefr.
  Give 3 or lower ONLY for a concrete error you can name in "f". Never lower the score for established loanwords or scientific terms in vi or tr (hydro, ion, caramel).
- "f": ≤ 12-word reason naming the concrete error when s ≤ 3, else "".
- "tr": for each language in "tr" a score 1–5: 5 exact natural equivalent in this sense; 4 correct equivalent in this sense (also when it is one of several valid choices, slightly broader, or a correct multi-word expression); 3 noticeably vague or only partly this sense; 2 wrong sense or part of speech, or a transliteration where a native word exists; 1 wrong, wrong language or script, or empty. Score against the LOCKED gloss sense, not the word's most common sense: a translation of another sense or a similar-but-different thing is 2 (US-style biscuit = soft bread ≠ cookie; aristocracy the class ≠ the system of government; crease = fold line ≠ skin wrinkle). A misspelled, non-existent or archaic word, or a form natives do not use, is 1. Translations often come from a Wiktionary table of ANOTHER sense or a related headword: check the translation means exactly this gloss (relive "experience again" ≠ ar أحيا "revive/bring to life" → 2). A literal word-by-word calque that is not a dictionary word or set phrase is 1 (jeopardize → zh 使受危险; use 危及). Whenever you see ANY concrete problem (any field), name it in \"f\".
- "bt": for each language in "tr" a literal back-translation of the WHOLE translation into English, in the same part of speech (verbs as "to …"): 1–3 English equivalents separated by "; " (in English only, never the original script).
- "bt_vi": a literal back-translation of the entry's "vi" into English as a Vietnamese reader understands it, in the same part of speech (verbs as "to …"): 1–3 English equivalents separated by "; ". Translate what the Vietnamese actually means, NOT the headword (cúm → "flu", kỷ niệm → "souvenir; fond memory").
- "bad": ONLY languages whose translation is (a) "translit": a sound-alike transliteration of the English word (e.g. hi सेकंड for "second") when the language has a common native word, or (b) "pos": a different part of speech or a different word (trump → "trumpet"). {} if none.
- "vi" (only when "vi_wikt" is given): "ok" if the entry's vi is a correct standard equivalent in the gloss sense; "alt" if it is wrong or unnatural but one of vi_wikt is right for the gloss sense – then "vi_fix" = that vi_wikt equivalent exactly as written (without the bracket); "unsure" otherwise.
Return ONE JSON object mapping each "k" to its object.`;
async function gemCall(env, model, sys, user, temp) {
  const gemma = /^gemma/.test(model); // Gemma: không có systemInstruction / JSON mime → ghép vào lời nhắn
  const body = gemma ? { contents: [{ role: 'user', parts: [{ text: sys + '\nReply with ONE valid JSON object only, no markdown.\n\nINPUT:\n' + user }] }], generationConfig: { temperature: temp } }
    : { systemInstruction: { parts: [{ text: sys }] }, contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig: { responseMimeType: 'application/json', temperature: temp } };
  const list = await candidates(env, 'gemini'); let diag = `keys=${list.length}`;
  for (const c of list) {
    let r; try { r = await gemFetch(env, `models/${model}:generateContent`, c.key, body); } catch (e) { diag += ' net'; continue; }
    if (!r.ok) { const t = (await r.text().catch(() => '')).replace(/\s+/g, ' '); diag += ` ${r.status}:${(/PerDay/.test(t) ? 'PerDay ' : /PerMinute/.test(t) ? 'PerMinute ' : '') + t.replace(/AIza[\w-]+|AQ\.[\w.-]+/g, '').slice(0, 120)}`; if (r.status !== 429 && r.status !== 503) await report(env, c.id, 'err', r.status, { text: t }); continue; }
    const j = await r.json().catch(() => null), text = j && (((j.candidates || [])[0] || {}).content || { parts: [] }).parts.map(p => p.text || '').join('');
    const out = parseJSON(text); if (out) { await report(env, c.id, 'ok'); return { out, model, usage: j.usageMetadata || null }; }
    diag += ' bad-json';
  }
  return { error: 'no-model', diag };
}
const arr = (a, n, m) => (Array.isArray(a) ? a : []).slice(0, n).map(e => cut(e, m));
const cutL = x => ({ ...(Array.isArray(x.senses) ? { senses: arr(x.senses, 12, 260) } : {}), ...(x.probes && typeof x.probes === 'object' ? { probes: Object.fromEntries(Object.entries(x.probes).slice(0, 24).map(([i, t]) => [cut(i, 12), cut(t, 220)])) } : {}), k: cut(x.k, 60), w: cut(x.w, 60), pos: cut(x.pos, 8), gloss: cut(x.gloss, 300), lemmas: arr(x.lemmas, 4, 40), wnex: arr(x.wnex, 2, 160), cefr: cut(x.cefr, 3), lex: cut(x.lex, 30), ...(Array.isArray(x.vi_wikt) && x.vi_wikt.length ? { vi_wikt: arr(x.vi_wikt, 8, 90) } : {}), topics: (Array.isArray(x.topics) ? x.topics : []).slice(0, 60).map(t => cut(t, 24)),
  def: cut(x.def, 200), ex: (Array.isArray(x.ex) ? x.ex : []).slice(0, 2).map(e => cut(e, 200)), col: (Array.isArray(x.col) ? x.col : []).slice(0, 3).map(e => cut(e, 60)), syn: (Array.isArray(x.syn) ? x.syn : []).slice(0, 3).map(e => cut(e, 40)),
  vi: cut(x.vi, 120), note_vi: cut(x.note_vi, 200), cand: arr(x.cand, 8, 220), ts: arr(x.ts, 8, 120), cols: arr(x.cols, 8, 60), fix: cut(x.fix, 200), need: arr(x.need, 14, 3).filter(l => l === 'vi' || LX_LANGS.includes(l)), n: Math.max(1, Math.min(2, +x.n || 2)), avoid: arr(x.avoid, 2, 220), tr: Object.fromEntries(Object.entries(x.tr && typeof x.tr === 'object' ? x.tr : {}).filter(([l]) => LX_LANGS.includes(l)).map(([l, v]) => [l, cut(v, 100)])) });
const parseJSON = t => { try { const m = String(t || '').match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null; } catch (e) { return null; } };
const cut = (v, n) => String(v == null ? '' : v).slice(0, n);
const cleanX = x => ({ k: cut(x.k, 120), type: cut(x.type, 40), s: cut(x.s, 300), ans: cut(x.ans, 80), alts: (Array.isArray(x.alts) ? x.alts : []).slice(0, 8).map(a => cut(a, 160)), ctx: cut(x.ctx, 600),
  ...(x.p ? { p: cut(x.p, 120) } : {}), ...(x.why ? { why: cut(x.why, 400), hook: cut(x.hook, 300), wrong: Object.fromEntries(Object.entries(x.wrong || {}).slice(0, 8).map(([a, v]) => [cut(a, 160), cut(v, 300)])) } : {}), ...(Array.isArray(x.ex) ? { ex: x.ex.slice(0, 2).map(e => cut(e, 200)) } : {}) });

const J = (o, s = 200) => new Response(JSON.stringify(o), { status: s, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const JSON_ONLY = '\nReply with ONE valid JSON object only, no markdown.';
/** Lời nhắn chuẩn cho mỗi mode (cùng cắt/lọc như khi gọi Gemini) – nguồn DUY NHẤT của prompt cho mọi nhà cung cấp (scripts/lib/ai-pool.mjs):
 *  Gemini đi thẳng ở đây; GrabCast / Workers AI tài khoản 2 lấy { sys, user, temp } qua `prompt: true` rồi tự gọi. null = yêu cầu sai. */
export function build(b) {
  if (b.mode === 'vgen') { const items = Array.isArray(b.items) ? b.items.slice(0, 20).map(cutV) : []; return items.length ? { sys: VGEN, user: JSON.stringify(items), temp: 0.5, models: VMODELS } : null; }
  if (b.mode === 'vjudge') { const items = Array.isArray(b.items) ? b.items.slice(0, 25).map(cutJ) : []; return items.length ? { sys: VJUDGE, user: JSON.stringify(items), temp: 0.1, models: LX_JUDGE } : null; }
  if (['lxgen', 'lxtr', 'lxjudge', 'lxdef', 'lxsrc', 'lxex', 'lxwsd', 'lxvi'].includes(b.mode)) {
    const items = Array.isArray(b.items) ? b.items.slice(0, 10).map(cutL) : []; if (!items.length) return null;
    const strip = b.mode === 'lxgen' ? items.map(({ k, w, pos, gloss, lemmas, wnex, cefr, lex, topics }) => ({ k, w, pos, gloss, lemmas, wnex, cefr, lex, topics })) : b.mode === 'lxtr' ? items.map(({ k, w, pos, gloss, lemmas, def, ex }) => ({ k, w, pos, gloss, lemmas, def, ex })) : items.map(({ topics, lex, ...x }) => x);
    if (b.mode === 'lxwsd') return { sys: LXWSD, user: JSON.stringify(items.map(({ k, w, pos, senses, probes }) => ({ k, w, pos, senses, probes }))), temp: 0, models: LX_JUDGE };
    if (b.mode === 'lxvi') return { sys: LXVI, user: JSON.stringify(items.map(({ k, w, pos, gloss, lemmas, def }) => ({ k, w, pos, gloss, lemmas, def }))), temp: 0.1, models: LX_JUDGE };
    if (b.mode === 'lxdef') return { sys: LXDEF, user: JSON.stringify(items.map(({ k, w, pos, gloss, lemmas, wnex, topics, fix }) => ({ k, w, pos, gloss, lemmas, wnex, topics, ...(fix ? { fix } : {}) }))), temp: 0.1, models: LX_GEN };
    if (b.mode === 'lxsrc') return { sys: LXSRC, user: JSON.stringify(items.map(({ k, w, pos, gloss, lemmas, def, cand, cols, ts }) => ({ k, w, pos, gloss, lemmas, def, ex: cand, cols, ts }))), temp: 0.1, models: LX_JUDGE };
    if (b.mode === 'lxex') return { sys: LXEX, user: JSON.stringify(items.map(({ k, w, pos, gloss, def, lemmas, wnex, n, avoid }) => ({ k, w, pos, gloss, def, lemmas, wnex, n, avoid }))), temp: 0.3, models: LX_GEN };
    if (b.mode === 'lxtr') return { sys: LXTR, user: JSON.stringify(items.map(({ k, w, pos, gloss, lemmas, def, ex, need, fix }) => ({ k, w, pos, gloss, lemmas, def, ex, ...(need && need.length ? { need } : {}), ...(fix ? { fix } : {}) }))), temp: 0.2, models: LX_GEN };
    return { sys: b.mode === 'lxgen' ? LXGEN : b.mode === 'lxtr' ? LXTR : LXJUDGE, user: JSON.stringify(strip), temp: b.mode === 'lxjudge' ? 0.1 : 0.3, models: b.mode === 'lxjudge' ? LX_JUDGE : LX_GEN };
  }
  if (['xgen', 'xtr', 'xjudge'].includes(b.mode)) {
    const L = NAMES[b.lang], items = Array.isArray(b.items) ? b.items.slice(0, 15).map(cleanX) : [];
    if (!L || !items.length || (b.mode === 'xgen' && b.lang !== 'en')) return null;
    return { sys: b.mode === 'xgen' ? XGEN : b.mode === 'xtr' ? XTR(L) : XJUDGE(L), user: JSON.stringify(items), temp: b.mode === 'xjudge' ? 0.1 : 0.3, models: b.mode === 'xjudge' ? LX_JUDGE : LX_GEN };
  }
  if (['translate', 'judge'].includes(b.mode)) {
    const L = b.lang !== 'en' && b.lang !== 'vi' && NAMES[b.lang], items = Array.isArray(b.items) ? b.items.slice(0, 30) : [];
    if (!L || !items.length) return null;
    const clean = items.map(x => ({ k: String(x.k).slice(0, 80), w: String(x.w).slice(0, 80), pos: String(x.pos || '').slice(0, 20), def: String(x.def || '').slice(0, 240), ex: String(x.ex || '').slice(0, 240), ...(b.mode === 'judge' ? { tr: String(x.tr || '').slice(0, 120) } : {}) }));
    return { sys: b.mode === 'judge' ? SYS_JUDGE(L) : SYS_TR(L), user: JSON.stringify(clean), temp: 0.1, models: LX_GEN };
  }
  return null;
}
export async function onRequestPost({ request, env }) {
  const claims = await verifyOidc((request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '')).catch(() => null);
  if (!claims) return J({ error: 'unauthorized' }, 401);
  env = stripBackgroundAI(env); // lexai chỉ dành cho CI (OIDC) = việc nền: KHÔNG bao giờ tiêu Workers AI tài khoản chính (đặt chỗ cho người dùng)
  const b = await request.json().catch(() => ({}));
  if (b.mode === 'ping') { const list = await candidates(env, 'gemini').catch(() => []); return J({ gemini: list.length }); } // sức khỏe kho Gemini – không gọi mô hình
  const p = build(b); if (!p) return J({ error: 'bad-request' }, 400);
  if (b.prompt === true) return J({ sys: p.sys + JSON_ONLY, user: p.user, temp: p.temp }); // cho nhà cung cấp khác (ai-pool) – không gọi mô hình
  // Gemini/Gemma kho khóa Lexkite (xoay khóa; 429/503 theo mô hình không cho cả khóa nghỉ). Không còn dự phòng Workers AI ở đây: chuỗi dự phòng nằm ở ai-pool (CI).
  const model = p.models.includes(b.model) ? b.model : p.models[0];
  const r = b.mode === 'vgen' ? await vgen(env, JSON.parse(p.user), model) : await gemCall(env, model, p.sys, p.user, p.temp);
  return r.out ? J(r) : J(r, 503);
}
