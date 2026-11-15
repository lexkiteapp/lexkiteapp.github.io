/* Prompt hệ thống do MÁY CHỦ chọn theo `task` cho POST /api/ai (02/11 bảo mật): máy khách KHÔNG còn gửi được `sys` tùy ý
 * (trước đây ai cũng đặt được sys → dùng AI miễn phí của Lexkite làm chatbot/viết thư rác ở bất kỳ chủ đề nào).
 *   task: 'grade' (Writing/Speaking, web/js/ai.js) · 'explain' (add-on, extension/background.js) · 'rp' / 'rpcoach' (Roleplay, web/js/roleplay.js)
 *         · 'import' (Nhập tài liệu – điền nghĩa, web/cpack/importdeck-app/importdeck.js, kèm `lang`).
 *   `lang` (tùy chọn, đúng một tên trong LANGS): ngôn ngữ người học – thay "Vietnamese" như forLang() ở máy khách.
 * Máy khách CŨ (add-on/app gốc trong bộ đệm, chưa gửi task) vẫn chạy: suy ra task từ `kind` / `sys` cũ rồi DÙNG BẢN CỦA MÁY CHỦ – chữ của sys cũ không bao giờ tới mô hình
 *   (roleplay cũ: chỉ các trường kịch bản đã kiểm được lấy ra từ khuôn sysOf rồi dựng lại bằng rpSys).
 * Đổi chữ ở máy khách thì đổi CẢ ở đây: scripts/test/ai-task.mjs so khớp nguyên văn với mã nguồn máy khách. */
export const LANGS = ['English', 'Vietnamese', 'Spanish', 'Portuguese', 'French', 'German', 'Indonesian', 'Thai', 'Chinese (Simplified)', 'Japanese', 'Korean', 'Hindi', 'Arabic', 'Russian', 'Turkish'] // = I18N.LANGS[…][0] (web/js/i18n.js);
const forLang = (p, n) => (!n || n === 'Vietnamese' ? p : String(p).replace(/\bVietnamese\b/g, n));
export const SYS = {
  grade: `You are a certified senior IELTS examiner. Assess strictly according to the official public IELTS band descriptors. Be accurate, not generous: short or off-topic answers must receive low bands. Write all comments, explanations and advice in Vietnamese (clear, encouraging, specific). Read the response sentence by sentence and find every grammatical error before scoring; quote the learner's exact words when pointing out errors. Never skip an error because there are many: each mistake gets its own errors item (e.g. "I am agree", "an unique", "traffic jams is", "knowledges", "discuss about", "depend of", "people thinks"); errors must never be empty when the text contains mistakes. Always write the comments in the language stated above. Write plain text inside the JSON strings (no markdown, no asterisks or bold). Return ONLY valid JSON matching the requested schema.`,
  explain: 'You are an expert English teacher helping IELTS/TOEIC learners understand English in context. Be accurate and concise. Return ONLY one valid JSON object matching the requested schema.',
  // khung chung an toàn khi máy khách cũ gửi sys lạ
  general: 'You are an expert English teacher. Be accurate and concise. Return ONLY one valid JSON object matching the requested schema.',
  legacyRp: 'You are a friendly English conversation partner and speaking coach for an English learner. Stay in role, keep replies short and natural, never mention you are an AI. Return JSON only.',
};
export const importSys = L => `You write very short dictionary glosses for language learners. Input: a JSON array of {"w": word, "s": the sentence it appears in}. For each word give the meaning that fits its sentence: at most 8 words, written in ${L}. Reply with ONE JSON object {"m":{"<word>":"<gloss>"}} using exactly the input words as keys. Leave out any word you are not sure about.`;
const RP_LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const RP_STYLE = { everyday: ['very short, simple sentences with the most common words', 'short, simple sentences with common everyday words', 'natural everyday English'], work: ['short simple sentences, common words', 'natural everyday business English', 'fluent, idiomatic professional English'] };
const RP_MAX = { name: 60, role: 120, persona: 300, goal: 300, title: 160, you: 400 };
// Trường ngắn của kịch bản → 1 dòng chữ thuần (bỏ ký tự điều khiển/xuống dòng, ` { } < >), cắt theo trần
const clean = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029`{}<>]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
/** Prompt roleplay dựng từ tham số đã kiểm (cùng khuôn sysOf web/js/roleplay.js). null = tham số sai. */
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
export const TASKS = ['grade', 'explain', 'rp', 'rpcoach', 'import'];
const lang = b => (LANGS.includes(b.lang) ? b.lang : 'Vietnamese');
// Máy khách roleplay cũ: lấy lại các trường từ khuôn sysOf (khuôn không khớp → null → khung chung legacyRp)
const RP_OLD = /^You are role-playing (an everyday|a workplace) English conversation to help a (A1|A2|B1|B2|C1|C2) English learner practise speaking\.\nYour character: ([^\n]*?), ([^\n]*?)\. Personality: ([^\n]*?)\. Your goal: ([^\n]*?)\.\nScenario: ([^\n]*?)\. The learner's goal: ([^\n]*)\nRules: [^\n]*/;
function legacyRp(sys) {
  const m = RP_OLD.exec(String(sys || '')); if (!m) return null;
  const kind = m[1] === 'an everyday' ? 'everyday' : 'work', L = (RP_STYLE[kind].findIndex(x => sys.includes('(' + x + ')')));
  return L < 0 ? null : rpSys({ kind, lv: m[2], L, name: m[3], role: m[4], persona: m[5], goal: m[6], title: m[7], you: m[8] });
}
/** body → { task, sys, rp, imp } (sys luôn do máy chủ chọn) hoặc { error }. Trường `sys` của máy khách cũ chỉ để NHẬN DIỆN, không bao giờ gửi cho mô hình. */
export function pickSys(body) {
  const t = body.task, L = lang(body);
  if (t === 'grade') return { task: t, sys: forLang(SYS.grade, L) };
  if (t === 'explain') return { task: t, sys: SYS.explain };
  if (t === 'import') return { task: t, sys: importSys(LANGS.includes(body.lang) ? body.lang : 'English'), imp: true };
  if (t === 'rpcoach') return { task: t, sys: coachSys(body.rp && body.rp.kind), rp: true };
  if (t === 'rp') { const s = rpSys(body.rp); return s ? { task: t, sys: s, rp: true } : { error: 'rp' }; }
  if (t != null) return { error: 'task' };
  const old = String(body.sys || '');
  if (body.kind === 'rp') return { task: 'legacy-rp', sys: legacyRp(old) || SYS.legacyRp, rp: true };
  if (body.kind === 'import') { const n = LANGS.find(x => importSys(x) === old); return { task: 'import', sys: importSys(n || 'English'), imp: true }; }
  for (const n of LANGS) if (forLang(SYS.grade, n) === old) return { task: 'grade', sys: old };
  if (old === SYS.explain) return { task: 'explain', sys: SYS.explain };
  return { task: 'general', sys: SYS.general };
}
// Cờ chuyển tiếp: AI_HUMAN_ENFORCE='1' → khách không vé/không đăng nhập bị chặn 403 { error:'human' }.
// Chưa bật (mặc định) → vẫn chạy nhưng hạn mức khách giảm một nửa (_quota.js lowTrust). Khi nào bật: docs/HUMAN.md.
export const enforceHuman = env => String((env && env.AI_HUMAN_ENFORCE) || '') === '1';
