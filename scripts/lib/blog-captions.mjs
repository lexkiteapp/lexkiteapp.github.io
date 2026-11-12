// Cổng "caption truth": alt/chú thích ảnh chụp dùng chung (media:<id>) không được khẳng định điều màn hình không có.
// Dữ liệu: content/blog/shot-facts.json (khái niệm + từ khóa 15 ngôn ngữ, kỳ thi, sự thật từng ảnh); desc gốc: shots.json.
// Luật: (a) notFeature/hứa quá trong alt hoặc caption → lỗi; (b) màn hình khóa 1 kỳ thi (vd IELTS) trong bài về kỳ thi khác → alt/caption phải gọi tên kỳ thi đó;
//       (c) alt gán kỳ thi khác kỳ thi của màn hình (hoặc gán kỳ thi cho màn hình trung lập), caption gọi tên kỳ thi khác mà không nói kỳ thi thật → lỗi;
//       (d) alt không chứa thuật ngữ tính năng/neo nào của ảnh → cảnh báo.
import fs from 'node:fs'; import path from 'node:path';
import { ROOT } from './blog-content.mjs';

const NONSPACE = /[\p{Script=Arabic}\p{Script=Devanagari}\p{Script=Thai}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const WORD = '[\\p{Script=Latin}\\p{Script=Cyrillic}\\p{Script=Greek}\\p{N}]'; // ranh giới từ chỉ xét chữ cùng hệ (để "pollution" trong câu tiếng Nhật vẫn khớp)
export const norm = s => String(s ?? '').normalize('NFC').toLowerCase().replace(/i̇/g, 'i').replace(/[’‘`]/g, "'").replace(/[‐‑‒]/g, '-').replace(/[   ]/g, ' ');
const reCache = new Map();
/** Từ khóa → RegExp: Latin/Kirin khớp trọn từ ('*' cuối = gốc từ, '*' đầu = nằm giữa từ ghép); chữ không cách (Ả Rập, Hindi, Thái, CJK, Hàn) = chuỗi con. */
export function termRe(t) {
  if (reCache.has(t)) return reCache.get(t);
  const pre = t.startsWith('*'), suf = t.endsWith('*'), core = norm(t.replace(/^\*/, ''));
  const esc = core.split(/\s+/).map(w => w.replace(/\*$/, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (w.endsWith('*') ? "[\\p{L}\\p{M}\\p{N}'-]*" : '')).join('\\s+');
  const re = NONSPACE.test(core) ? new RegExp(esc.replaceAll("[\\p{L}\\p{M}\\p{N}'-]*", ''), 'u') : new RegExp((pre ? '' : `(?<!${WORD})`) + esc + (suf ? '' : `(?!${WORD})`), 'u');
  reCache.set(t, re); return re;
}
export const hitOf = (text, terms) => { const s = norm(text); for (const t of terms || []) { const m = s.match(termRe(t)); if (m) return m[0]; } return null; };

let cache = null;
export function loadFacts(root = ROOT) {
  const f = [path.join(root, 'shot-facts.json'), path.join(ROOT, 'shot-facts.json')].find(x => fs.existsSync(x));
  const s = [path.join(root, 'shots.json'), path.join(ROOT, 'shots.json')].find(x => fs.existsSync(x));
  if (cache && cache.f === f) return cache.v;
  const v = f ? JSON.parse(fs.readFileSync(f, 'utf8')) : null;
  if (v && s) v.desc = Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(s, 'utf8')).shots || {}).map(([k, o]) => [k, o.desc || '']));
  cache = { f, v }; return v;
}

// Từ khóa của 1 khái niệm cho ngôn ngữ: luật cấm chỉ dùng từ của đúng ngôn ngữ (+ '_' mọi ngôn ngữ) – tránh 'ai' tiếng Anh khớp "j'ai" tiếng Pháp;
// luật (d) (tìm thuật ngữ tính năng) dùng thêm từ tiếng Anh vì alt hay giữ nhãn giao diện tiếng Anh ("Flip", "Mistake log").
const termsOf = (F, c, lang, withEn = false) => { const o = F.concepts[c] || {}; return [...(o[lang] || []), ...(o._ || []), ...(withEn && lang !== 'en' ? o.en || [] : [])]; };
export const examsIn = (F, text) => new Set(Object.entries(F.exams).filter(([, e]) => hitOf(text, e.terms)).map(([k]) => k));
/** Kỳ thi bài viết nói tới: thẻ (tags), từ khóa chính, tiêu đề. */
export function postExams(F, p) {
  const out = examsIn(F, `${p.title || ''} \n ${p.keyword || ''}`);
  for (const t of Array.isArray(p.tags) ? p.tags : []) for (const [k, e] of Object.entries(F.exams)) if (new RegExp(e.tags).test(String(t).toLowerCase())) out.add(k);
  return out;
}
const examName = k => ({ ielts: 'IELTS', toeic: 'TOEIC', toefl: 'TOEFL', cambridge: 'Cambridge', ege: 'ЕГЭ', yds: 'YDS', cet: 'CET (四级/六级)', eiken: '英検' }[k] || k);

/** Lỗi/cảnh báo cho 1 ảnh: { id, lang, alt, caption, postExams:Set, keyword } → [{ level: 'error'|'warn', rule, msg }] */
export function captionIssues(F, { id, lang, alt = '', caption = '', postExams: pex = new Set(), keyword = '' }) {
  const out = [], S = F.shots[id]; if (!S) return out;
  const E = (msg, rule = 'caption-truth') => out.push({ level: 'error', rule, msg }), W = msg => out.push({ level: 'warn', rule: 'caption-truth', msg });
  const desc = (F.desc && F.desc[id]) ? ` – màn hình thật: ${F.desc[id]}` : '';
  const feats = new Set(S.features || []), notF = [...new Set([...(F._default?.notFeatures || []), ...(S.notFeatures || [])])].filter(c => !feats.has(c));
  // (a) khẳng định tính năng không có / hứa quá
  const kw = norm(keyword).trim(), unkw = t => (kw.length >= 4 ? norm(t).split(kw).join(' ') : t); // đuôi "– <từ khóa bài>" là nhắc chủ đề, không phải khẳng định tính năng
  const altOnly = (S.altNotFeatures || []).filter(c => !feats.has(c)); // chỉ cấm trong alt (alt tả ảnh; caption được nói ngữ cảnh bài, vd "ôn phrasal verb bằng flashcard")
  for (const [field, text] of [['alt', unkw(alt)], ['caption', unkw(caption)]]) {
    if (!text.trim()) continue;
    for (const c of field === 'alt' ? [...notF, ...altOnly] : notF) { const h = hitOf(text, termsOf(F, c, lang)); if (h) E(`${field} media:${id} nói "${h}" (${c}: ${F.concepts[c]?._note || c}) – ảnh không thể hiện điều này${desc}`); }
  }
  // (b)(c) kỳ thi
  const all = Object.keys(F.exams), lock = typeof S.exam === 'string' && S.exam !== 'any' ? S.exam : null;
  const allowed = S.exam === 'any' ? all : lock ? [lock] : (S.exam || []);
  const altEx = examsIn(F, alt), capEx = examsIn(F, caption), named = lock && (altEx.has(lock) || capEx.has(lock));
  for (const e of altEx) if (!allowed.includes(e)) E(`alt media:${id} gán kỳ thi ${examName(e)} – màn hình ${lock ? 'chỉ là ' + examName(lock) : allowed.length ? 'thuộc ' + allowed.map(examName).join('/') : 'không thuộc kỳ thi nào'}${desc}`, 'caption-exam');
  if (lock && !named) {
    const other = [...capEx].filter(e => e !== lock);
    if (other.length) E(`caption media:${id} nhắc ${other.map(examName).join(', ')} nhưng ảnh là màn hình ${examName(lock)} – ghi rõ "${examName(lock)}" trong alt/caption`, 'caption-exam');
    else { const pOther = [...pex].filter(e => e !== lock); if (pOther.length) E(`bài về ${pOther.map(examName).join(', ')} dùng ảnh màn hình ${examName(lock)} (media:${id}) – alt hoặc caption phải ghi rõ "${examName(lock)}"`, 'caption-exam'); }
  }
  // (d) alt không chứa thuật ngữ nào của ảnh (cảnh báo – alt chung chung hoặc tả nhầm màn hình)
  if (alt.trim()) {
    const terms = [...(S.anchors || []), ...[...feats].flatMap(c => termsOf(F, c, lang, true)), ...allowed.flatMap(e => F.exams[e]?.terms || [])];
    if (!hitOf(alt, terms)) W(`alt media:${id} "${alt.slice(0, 70)}" không có thuật ngữ nào của màn hình (${[...feats].join(', ')}) – tả đúng màn hình theo shots.json${desc}`);
  }
  return out;
}

const IMG_RE = /!\[([^\]]*)\]\(\s*media:([\w-]+)(?:\s+"([^"]*)")?\s*\)/g; // chỉ ảnh dùng chung (ảnh riêng media:@… đã có alt-truth theo chữ trên ảnh)
/** Toàn bộ ảnh dùng chung của 1 bài → [{ id, alt, caption, line, issues }] */
export function postCaptionIssues(F, p, body = p.body || '') {
  const pex = postExams(F, p), out = [];
  for (const m of body.matchAll(IMG_RE)) {
    const line = body.slice(0, m.index).split('\n').length;
    out.push({ id: m[2], alt: m[1], caption: m[3] || '', line, issues: captionIssues(F, { id: m[2], lang: p.lang, alt: m[1], caption: m[3] || '', postExams: pex, keyword: typeof p.keyword === 'string' ? p.keyword : '' }) });
  }
  return out;
}
