// Quy tắc NGHIÊM cho ảnh minh hoạ từ vựng (chủ duyệt 24/10 sau pilot s1 62 %): chỉ vẽ cái trẻ 5 tuổi gọi được tên từ ảnh.
//   1. eligible(): danh từ cụ thể + động từ hành động nhìn thấy; tính từ CHỈ màu/hình (kèm vật chuẩn); bỏ nghĩa kỹ thuật/khoa học trừ khi biểu tượng (ICONIC).
//      Ngoài luật máy còn cần THẺ (content/lexicon/vimg-cards.json) viết từ định nghĩa + câu ví dụ: vật chuẩn `o`, bối cảnh `c`, đồng nghĩa `s` – thiếu thẻ / `skip` = không vẽ.
//   2. promptFromCard(): prompt theo NGHĨA từ thẻ (vd "folded paper road map", "water dripping from a pipe"), không bao giờ đặt từ trong ngoặc kép.
//   3. matchName(): giám khảo thị giác phải GỌI ĐƯỢC TÊN mà không được biết từ; tên phải khớp danh sách đồng nghĩa (theo gốc từ). CLIP chỉ phụ.
import { STYLE, PEOPLE, fnv } from './style.mjs';

export const STRICT_V = 'x1';
const NOUN_LEX = new Set(['artifact', 'food', 'animal', 'plant', 'body', 'person', 'object']);
const VERB_LEX = new Set(['motion', 'contact', 'consumption', 'body', 'creation']);
const TECH = /^(dom-|nawl|awl|ex-toefl|space|science)/;   // bộ từ chuyên ngành/học thuật
export const COLORS = new Set(['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey', 'golden']);
export const SHAPES = new Set(['round', 'square', 'triangular', 'oval', 'circular', 'rectangular', 'straight', 'curved']);
export const ICONIC = new Set(['planet#n', 'magnet#n', 'microscope#n', 'telescope#n', 'rocket#n', 'robot#n', 'volcano#n', 'skeleton#n', 'dinosaur#n']);
const LEVEL_OK = { n: ['A1', 'A2', 'B1'], v: ['A1', 'A2', 'B1', 'B2'] };

/** luật máy (chưa xét thẻ): e = mục kho từ vựng {w,pos,level,sets}, lexname WordNet (vimg-select.json) → { ok, why } */
export function ruleCheck(key, e, lexname = '') {
  if (!e) return { ok: false, why: 'không có trong kho' };
  if (ICONIC.has(key)) return { ok: true, why: 'iconic' };
  const tech = (e.sets || []).some(s => TECH.test(s));
  if (e.pos === 'adj') return COLORS.has(e.w) || SHAPES.has(e.w) ? { ok: true, why: 'màu/hình' } : { ok: false, why: 'tính từ không phải màu/hình' };
  if (e.pos === 'n') {
    if (!NOUN_LEX.has(lexname)) return { ok: false, why: 'danh từ không cụ thể (' + (lexname || '?') + ')' };
    if (!LEVEL_OK.n.includes(e.level)) return { ok: false, why: 'cấp ' + e.level + ' (không biểu tượng)' };
    if (tech) return { ok: false, why: 'kỹ thuật/khoa học' };
    return { ok: true, why: 'danh từ cụ thể' };
  }
  if (e.pos === 'v') {
    if (!VERB_LEX.has(lexname)) return { ok: false, why: 'động từ không phải hành động nhìn thấy' };
    if (!LEVEL_OK.v.includes(e.level)) return { ok: false, why: 'cấp ' + e.level };
    return { ok: true, why: 'hành động' };
  }
  return { ok: false, why: 'loại từ ' + e.pos };
}
/** luật máy + thẻ → { ok, why } */
export function eligible(key, e, lexname, card) {
  const r = ruleCheck(key, e, lexname); if (!r.ok) return r;
  if (!card) return { ok: false, why: 'chưa có thẻ vẽ' };
  if (card.skip) return { ok: false, why: 'thẻ: ' + card.skip };
  if (!card.o || !Array.isArray(card.s) || !card.s.length) return { ok: false, why: 'thẻ thiếu o/s' };
  if (e.pos === 'adj' && !['color', 'shape'].includes(card.k)) return { ok: false, why: 'tính từ cần k=color|shape' };
  return { ok: true, why: r.why };
}
/** prompt theo NGHĨA: vật chuẩn trước (FLUX ưu tiên đầu prompt), bối cảnh tối giản, phong cách s1 đã duyệt */
export function promptFromCard(key, card, attempt = 1) {
  // người trong thẻ ('a person'/'a child') → xoay vòng tất định đa dạng (màu da/giới) theo fnv(khoá)
  const who = PEOPLE[fnv(key) % PEOPLE.length];
  const o = String(card.o).replace(/["“”]/g, '').replace(/^a person\b/, who).replace(/^a child\b/, who.replace(/\b(woman|man)\b/, m => (m === 'woman' ? 'girl' : 'boy'))), c = card.c ? ', ' + String(card.c).replace(/["“”]/g, '') : '';
  return `Illustration of ${o}${c}.${attempt > 1 ? ' ' + STYLE.retry : ''} ${STYLE.base}`;
}
// ---- khớp tên giám khảo ↔ đồng nghĩa (gốc từ đơn giản, đủ cho tiếng Anh thường) ----
const IRREG = { teeth: 'tooth', men: 'man', women: 'woman', children: 'child', mice: 'mouse', feet: 'foot', geese: 'goose', swam: 'swim', swum: 'swim', sewn: 'sew', ran: 'run', ate: 'eat', flew: 'fly', drank: 'drink' };
export function stem(t) {
  t = t.toLowerCase(); if (IRREG[t]) return IRREG[t];
  if (t.length > 5 && t.endsWith('ing')) { t = t.slice(0, -3); if (/([b-df-hj-np-tv-z])\1$/.test(t) && !/(ll|ss|zz)$/.test(t)) t = t.slice(0, -1); return t.replace(/e$/, ''); }
  if (t.length > 4 && t.endsWith('ies')) return t.slice(0, -3) + 'y';
  if (t.length > 4 && /(ches|shes|sses|xes|oes)$/.test(t)) return t.slice(0, -2);
  if (t.length > 4 && t.endsWith('ed')) { t = t.slice(0, -2); if (/([b-df-hj-np-tv-z])\1$/.test(t)) t = t.slice(0, -1); return t.replace(/e$/, ''); }
  if (t.length > 3 && t.endsWith('s') && !t.endsWith('ss')) t = t.slice(0, -1);
  return t.replace(/e$/, '');
}
const toks = s => String(s || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').split(/[\s-]+/).filter(Boolean).map(stem);
/** tên giám khảo (chuỗi tự do) có chứa một đồng nghĩa (cụm liên tiếp, theo gốc từ)? → đồng nghĩa khớp | null */
export function matchName(named, syns) {
  const n = toks(named), joined = ' ' + n.join(' ') + ' ', glued = n.join('');
  for (const s of syns) { const t = toks(s); if (!t.length) continue; if (joined.includes(' ' + t.join(' ') + ' ') || (t.length > 1 && glued.includes(t.join('')))) return s; }
  return null;
}
/** trường giám khảo cần khớp theo loại từ: danh từ → object, động từ → action, tính từ → color | shape */
export const judgeField = (pos, card) => (pos === 'v' ? 'action' : pos === 'adj' ? (card.k === 'shape' ? 'shape' : 'color') : 'object');
/** câu hỏi giám khảo – KHÔNG chứa từ đích, không gợi ý */
export const JUDGE_Q = 'You are checking one picture for a children\'s picture dictionary. Do not guess what it was meant to be; say what you SEE. ' +
  'Reply JSON only: {"object": "the single main thing shown, 1-3 words, most common everyday English name", ' +
  '"action": "the main action a person or animal is doing as an -ing verb phrase (e.g. kicking a ball), or none", ' +
  '"color": "the one dominant color of the main thing", "shape": "the dominant shape of the main thing (round, square, triangle...)", ' +
  '"text": true if any letters, words or numbers are visible, "unsafe": true if anything is unsuitable for young children, ' +
  '"flat": true if it is a flat vector cartoon illustration (not a photo or 3D render), "clear": true if a 5-year-old would recognise the main thing at a glance}';
/** quyết định từ câu trả lời giám khảo → { pass, reasons[], named, hit } */
export function judgeVerdict(pos, card, ans) {
  if (!ans || typeof ans !== 'object') return { pass: false, reasons: ['judge unavailable'], named: '', hit: null };
  const f = judgeField(pos, card), named = String(ans[f] || '');
  // động từ: chấp nhận tên hành động hoặc vật (vd 'broom' cho sweep nếu thẻ cho phép); tính từ chỉ màu/hình
  const hit = matchName(named, card.s) || (pos === 'v' ? matchName(String(ans.object || ''), card.s) : null);
  const reasons = [];
  if (!hit) reasons.push(`named "${named.slice(0, 30)}"`);
  if (ans.text === true) reasons.push('judge: text');
  if (ans.unsafe === true) reasons.push('judge: unsafe');
  if (ans.flat === false) reasons.push('judge: not flat');
  if (ans.clear === false) reasons.push('judge: unclear');
  return { pass: !reasons.length, reasons, named, hit };
}
export { fnv };
