// Kiểm chất lượng nội dung học: từ vựng, bài ngữ pháp, đề IELTS/TOEIC/TOEFL (đáp án, phương án, lời giải, lỗi tiếng Anh dễ bắt).
// Dùng: node scripts/test/content-check.mjs [--stats] [--warn] [--json]  → in lỗi, thoát mã 1 nếu có lỗi nghiêm trọng.
//   --stats  bảng số lượng theo loại/cấp độ · --warn  in cả cảnh báo (không làm hỏng test) · --json  ghi reports/content-stats.json
import fs from 'node:fs'; import path from 'node:path';
import { loadContent, ROOT } from '../lib/content-load.mjs';
import { has } from '../lib/irregular.mjs';
const C = loadContent(), ARG = new Set(process.argv.slice(2));
const errs = [], warns = [], E = (w, m) => errs.push(w + ': ' + m), Wn = (w, m) => warns.push(w + ': ' + m);
if (C.__errors) C.__errors.forEach(e => E('nạp', e));
const L = i => 'ABCDEFGHIJ'[i], norm = s => String(s ?? '').toLowerCase().replace(/<[^>]+>/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const VI = /[àáâãèéêìíòóôõùúýăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i, VIS = /[ăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i, /* VIS: chỉ chữ riêng tiếng Việt (café, résumé… không tính) */ FOREIGN = /[Ѐ-ӿ؀-ۿऀ-ॿ฀-๿぀-ヿ㐀-鿿가-힯]/;

// ---------- Lỗi tiếng Anh dễ bắt (câu hỏi, phương án, bài đọc, kịch bản nghe, ví dụ) ----------
// a/an theo âm đầu: ngoại lệ phát âm (an hour, a university, a one-off, an MBA…)
const AN_OK = /^(hour|honest|honou?r|heir|herb(?!al)|mba|mp|mri|fbi|faq|sms|x-?ray|nhs|ma\b|msc|f\b|h\b|l\b|m\b|n\b|r\b|s\b|x\b|8|11|18|80)/i;
const A_OK = /^(uni|use|usu|usa|uk\b|ufo|ur[aeiou]|eu|ewe|one\b|one-|once|eur|uti|uto|ubiq|u-|u\b|ute|uv|ukr|ura|uro|uri(?!n))/i;
function lintEn(where, s) {
  if (typeof s !== 'string' || !s || VIS.test(s)) return;
  const t = s.replace(/<[^>]+>/g, ' ');
  for (const m of t.matchAll(/\b([A-Za-z]+)\s+\1\b/g)) { const w = m[1].toLowerCase(); if (!['that', 'had', 'is', 'very', 'bye', 'no', 'yes', 'so', 'ha', 'well', 'now', 'go', 'knock', 'hear', 'far', 'more', 'again', 'on', 'and', 'over', 'round', 'sorry', 'oh', 'ok', 'okay', 'right', 'really', 'blah', 'by', 'hi', 'hello', 'what', 'out', 'come', 'too', 'tick', 'chop', 'bit', 'wait', 'there', 'yeah', 'thank', 'please', 'do', 'boom', 'you', 'i', 'a'].includes(w)) Wn(where, `lặp từ "${m[0]}"`); }
  if (/[^\s.]\s{2,}[^\s]/.test(t.replace(/\n/g, '¶'))) Wn(where, 'thừa khoảng trắng');
  for (const m of t.matchAll(/\S\s+([,;:!?](?!\?)|\.(?!\.|\d))(?=\s|$)/g)) if (!/_{2,}|-{3,}/.test(t.slice(Math.max(0, m.index - 4), m.index + 2))) Wn(where, `khoảng trắng trước dấu "${m[1]}"`);
  for (const m of t.matchAll(/\b(a|an|A|An)\s+([A-Za-z][\w-]*)/g)) {
    const w = m[2], an = /^an$/i.test(m[1]), vowel = /^[aeiou]/i.test(w);
    if (/^A/.test(m[1]) && /[A-Z][\w’']*\s+$/.test(t.slice(Math.max(0, m.index - 20), m.index)) && !/[.!?:]\s+$/.test(t.slice(Math.max(0, m.index - 3), m.index))) continue; // Hoi An, Room A…
    if (/^[A-Z]{2,}$/.test(w) || /^[A-Z]$/.test(w)) continue; // viết tắt/chữ cái: khó xác định, bỏ qua
    if (an && !vowel && !AN_OK.test(w)) E(where, `"${m[0]}" → a`);
    else if (!an && vowel && !A_OK.test(w)) E(where, `"${m[0]}" → an`);
    else if (an && vowel && A_OK.test(w) && !/^(uni(?!v|t|q|f|s|o|c)|use(?!r|f|d|s)|und|ugl|ump|unc|unf|unk|unl|unm|unn|unp|unr|uns|unt|unw|unu)/i.test(w) && /^(uni|use|usu|eu|one\b|uti|ute|uv)/i.test(w)) E(where, `"${m[0]}" → a`);
    else if (!an && /^h/i.test(w) && AN_OK.test(w)) E(where, `"${m[0]}" → an`);
  }
}

// ---------- Câu hỏi trắc nghiệm / điền ----------
const banks = {}; // tên ngân hàng → [{q, where}] để tìm câu trùng
const stat = {};
const bump = (k, lvl = '—', n = 1) => { stat[k] ??= {}; stat[k][lvl] = (stat[k][lvl] || 0) + n; };
// lời giải có nói "đáp án X" khác đáp án đúng không; mũi tên → "phương án khác"
function checkExplain(where, ex, opts, ai, isQuote) {
  if (!ex) return;
  const m = ex.match(/^(?:[^.]{0,40}?)[Đđ]áp án(?: đúng)?(?: là)?:?\s*\(?([A-J])\b(?![a-zà-ỹ'’])/);
  if (m && ai != null && m[1] !== L(ai)) E(where, `lời giải nói đáp án ${m[1]} nhưng đáp án là ${L(ai)}`);
  if (opts && ai != null) {
    const right = norm(opts[ai]);
    for (const mm of ex.matchAll(/(?:→|=>|[Đđ]áp án(?: đúng)?(?: là)?:?|[Cc]họn)\s*["“]([^"”]{1,60})["”]/g)) {
      const x = norm(mm[1]); if (!x || x === right || right.includes(x)) continue;
      const other = opts.findIndex((o, i) => i !== ai && norm(o) === x);
      if (other >= 0 && !right.includes(x)) E(where, `lời giải chỉ tới phương án ${L(other)} "${mm[1]}" nhưng đáp án là ${L(ai)} "${opts[ai]}"`);
    }
  }
  if (FOREIGN.test(ex)) E(where, 'lời giải lẫn ký tự ngôn ngữ khác');
  if (!VI.test(ex)) Wn(where, 'lời giải không có tiếng Việt (khóa gốc phải là tiếng Việt)');
}
function mcq(where, bank, q, opts, ai, ex, needEx = true, cue = '') {
  if (!Array.isArray(opts) || opts.length < 2) return E(where, 'thiếu phương án');
  if (!Number.isInteger(ai) || ai < 0 || ai >= opts.length) E(where, `đáp án ${ai} không trỏ tới phương án nào (${opts.length} phương án)`);
  if (opts.some(o => !String(o ?? '').trim())) E(where, 'phương án rỗng');
  const n = opts.map(o => String(o).replace(/\s+/g, ' ').trim()); if (new Set(n).size !== n.length) E(where, 'trùng phương án: ' + opts.join(' | '));
  if (needEx && !String(ex ?? '').trim()) E(where, 'thiếu lời giải');
  checkExplain(where, ex, opts, ai);
  lintEn(where, q); if (opts[ai] != null) lintEn(where, String(opts[ai]).replace(/^[A-J]\s+/, '')); // phương án sai có thể sai cố ý → chỉ kiểm phương án đúng
  if (bank && q && norm(q).length > 12 && !/^\(\d+\)$/.test(q.trim())) (banks[bank] ??= []).push({ q: norm(q) + ' ‖ ' + n.slice().sort().join('|') + ' ‖ ' + norm(cue), where });
}
function gap(where, a) { const arr = Array.isArray(a) ? a : [a]; if (!arr.length || arr.some(x => !String(x ?? '').trim())) E(where, 'đáp án điền trống rỗng'); }
function letters(where, a, opts, nAns) {
  const arr = Array.isArray(a) ? a : [a], max = opts?.length;
  for (const x of arr) { if (!/^[A-J]$/.test(x)) { E(where, `đáp án "${x}" không phải chữ cái`); continue; } if (max && 'ABCDEFGHIJ'.indexOf(x) >= max) E(where, `đáp án ${x} vượt số phương án (${max})`); }
  if (new Set(arr).size !== arr.length) E(where, 'đáp án chữ cái bị trùng');
  if (nAns && arr.length !== nAns) E(where, `cần ${nAns} đáp án nhưng có ${arr.length}`);
}
// nhóm câu theo định dạng qengine (IELTS Listening/Reading, TOEIC, TOEFL)
function groups(tag, bank, gs, exOf, lvl) {
  for (const g of gs || []) {
    const gw = tag + ':' + (g.type || '?');
    if (g.type === 'multi') { const ns = [].concat(g.n); letters(`${tag} q${ns.join(',')}`, g.a, g.options, ns.length); checkExplain(`${tag} q${ns}`, g.explain, null, null); bump(bank, lvl, ns.length); lintEn(gw, g.q); (g.options || []).forEach(o => lintEn(gw, String(o).replace(/^[A-J]\s+/, ''))); continue; }
    const optLetters = Array.isArray(g.options) && g.options.every(o => /^[A-J]$/.test(String(o).trim().split(/\s/)[0]));
    for (const it of g.items || []) {
      const w = `${tag} q${it.n}`, ex = exOf(it); bump(bank, lvl);
      if (Array.isArray(it.options) && typeof it.a === 'number') mcq(w, bank, it.q, it.options, it.a, ex, true, it.cue);
      else if (['tfng', 'ynng'].includes(g.type)) { const ok = g.type === 'tfng' ? ['TRUE', 'FALSE', 'NOT GIVEN'] : ['YES', 'NO', 'NOT GIVEN']; if (!ok.includes(String(it.a).toUpperCase())) E(w, `đáp án "${it.a}" không hợp lệ cho ${g.type}`); if (!ex) E(w, 'thiếu lời giải'); checkExplain(w, ex); lintEn(w, it.text || it.q); }
      else if (g.options && typeof it.a === 'string' && /^[A-J]$/.test(it.a)) { letters(w, it.a, g.options); if (!ex) E(w, 'thiếu lời giải'); checkExplain(w, ex); lintEn(w, it.text || it.q); }
      else { gap(w, it.a); if (!ex) E(w, 'thiếu lời giải'); checkExplain(w, ex); lintEn(w, it.text || it.q); if (it.a && optLetters) {} }
    }
    (g.options || []).forEach(o => lintEn(gw, String(o).replace(/^[A-J]\s+/, '')));
  }
}
const scriptLint = (tag, sc) => (sc || []).forEach((l, i) => lintEn(`${tag} script#${i}`, l.t || l.say));

// IELTS Listening
for (const p of C.LISTENING || []) { groups(p.id, 'IELTS Listening', p.groups, it => it.explain, 'Part ' + p.part); scriptLint(p.id, p.script); }
// IELTS Reading (lời giải ở READ_EXPLAIN)
for (const t of C.READTESTS || []) for (const [pi, p] of t.passages.entries()) { groups(`${t.id}p${pi + 1}`, t.gt ? 'IELTS Reading GT' : 'IELTS Reading AC', p.groups, it => C.READ_EXPLAIN?.[t.id]?.[it.n]?.why, 'Passage ' + (pi + 1)); lintEn(`${t.id}p${pi + 1} text`, p.text); }
// TOEIC
for (const t of C.TOEIC?.reading || []) for (const pt of t.parts) { for (const [ki, ps] of [{ groups: pt.groups }, ...(pt.passages || [])].entries()) { groups(`${t.id} P${pt.part}`, 'TOEIC Reading', ps.groups, it => it.explain, 'Part ' + pt.part); if (ps.text) lintEn(`${t.id} P${pt.part} text${ki}`, ps.text); } }
for (const p of C.TOEIC?.listening || []) { groups(p.id, 'TOEIC Listening', p.groups, it => it.explain, 'Part ' + p.part); scriptLint(p.id, p.script); }
// TOEFL
for (const u of C.TOEFL?.reading || []) { if (u.task === 'cw') { const blanks = (u.text.match(/\{[^}]*\}/g) || []).length; bump('TOEFL Reading', 'Complete the Words', blanks); if (!Array.isArray(u.explain) || u.explain.length !== blanks) E(u.id, `Complete the Words: ${blanks} ô trống nhưng ${u.explain?.length ?? 0} lời giải`); } else { groups(u.id, 'TOEFL Reading', u.groups, it => it.explain, u.task); lintEn(u.id + ' text', u.text); } }
for (const u of C.TOEFL?.listening || []) { groups(u.id, 'TOEFL Listening', u.groups, it => it.explain, u.task); scriptLint(u.id, u.script); }
for (const u of C.TOEFL?.writing || []) bump('TOEFL Writing', u.task, (u.items || [1]).length);
for (const u of C.TOEFL?.speaking || []) bump('TOEFL Speaking', u.task, (u.sentences || u.questions || [1]).length);

// Ngữ pháp: quiz trắc nghiệm + drills tự luận
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
for (const g of C.GRAMMAR || []) {
  if (!LV.includes(g.level)) E('grammar ' + g.id, `cấp độ "${g.level}" không hợp lệ`);
  (g.quiz || []).forEach((q, i) => { mcq(`grammar ${g.id} quiz#${i + 1}`, 'grammar', q.q, q.options, q.answer, q.explain); bump('Ngữ pháp – trắc nghiệm', g.level); });
  (g.drills || []).forEach((d, i) => { const w = `grammar ${g.id} drill#${i + 1}`; bump('Ngữ pháp – tự luận', g.level); if (d.t === 'error') { if (!Array.isArray(d.parts) || !Number.isInteger(d.w) || d.w < 0 || d.w >= d.parts.length || !String(d.fix ?? '').trim()) E(w, 'câu tìm lỗi sai: thiếu parts/w/fix'); else if (d.fix.replace(/\s+/g, ' ').trim() === d.parts[d.w].replace(/\s+/g, ' ').trim()) E(w, 'phần sửa trùng phần lỗi'); } else if (!Array.isArray(d.a) || !d.a.length || d.a.some(x => !String(x).trim())) E(w, 'thiếu đáp án'); if (!String(d.ex ?? '').trim()) E(w, 'thiếu lời giải'); else checkExplain(w, d.ex); lintEn(w, d.q); (d.a || []).forEach(x => lintEn(w, x)); if (d.t !== 'error' && d.t !== 'fill') (banks.drills ??= []).push({ q: norm(d.q) + '‖' + norm(d.start), where: w }); });
}
// Bài đọc ngắn (READINGS)
for (const r of C.READINGS || []) { lintEn(r.id + ' text', r.text); (r.questions || []).forEach((q, i) => { const w = `reading ${r.id} q${i + 1}`; bump('Bài đọc ngắn', r.level); if (q.type === 'tfng') { if (!['TRUE', 'FALSE', 'NOT GIVEN'].includes(q.answer)) E(w, `đáp án "${q.answer}" không hợp lệ`); if (!q.explain) E(w, 'thiếu lời giải'); checkExplain(w, q.explain); } else if (q.options) mcq(w, null, q.q, q.options, q.answer, q.explain); else { gap(w, q.answer); if (!q.explain) E(w, 'thiếu lời giải'); } }); }

// Câu điền từ IELTS: đáp án phải có nguyên văn trong kịch bản nghe / bài đọc và không vượt giới hạn số từ (đáp án là số được miễn vì kịch bản đọc bằng chữ)
{ const NT = s => ' ' + String(s).toLowerCase().replace(/[’‘']/g, ' ').replace(/[^a-z0-9%£$]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const nw = a => a.trim().split(/\s+/).filter(x => !/^[£$]?\d/.test(x)).length;
  const gapCheck = (tag, T, gs) => { T = NT(T); for (const g of gs || []) for (const it of g.items || []) if (Array.isArray(it.a) && it.a.length) {
    if (!it.a.some(a => /\d/.test(a) || T.includes(NT(a))) && !(it.cue && /^([A-Z0-9], )+[A-Z0-9]\.?$/.test(it.cue.trim()))) E(`${tag} q${it.n}`, `đáp án "${it.a[0]}" không có trong kịch bản/bài đọc`);
    if (g.limit && it.a.every(a => nw(a) > g.limit)) E(`${tag} q${it.n}`, `đáp án "${it.a[0]}" vượt giới hạn ${g.limit} từ`); } };
  for (const p of C.LISTENING || []) gapCheck(p.id, (p.script || []).map(l => l.t || l.say || '').join(' '), p.groups);
  for (const t of C.READTESTS || []) for (const [i, p] of t.passages.entries()) gapCheck(`${t.id}p${i + 1}`, (p.paras || []).map(x => x.t).join(' ') + ' ' + (p.text || ''), p.groups);
}
// Câu trích căn cứ (cue) của mọi câu hỏi đề thi phải có nguyên văn trong kịch bản/bài đọc (cho phép "…" nối đoạn; bỏ qua câu có chỗ trống TOEIC Part 6)
{ const NT = s => ' ' + String(s).toLowerCase().replace(/[’‘']/g, ' ').replace(/[^a-z0-9%£$]+/g, ' ').replace(/\s+/g, ' ').trim() + ' ';
  const cueCheck = (tag, T, gs) => { T = NT(T); for (const g of gs || []) for (const it of g.type === 'multi' ? [g] : (g.items || [])) { if (!it.cue || /-{3,}/.test(it.cue)) continue;
    if (!String(it.cue).split(/\s*(?:\.\.\.|…)\s*/).filter(Boolean).every(p => T.includes(NT(p)))) E(`${tag} q${it.n}`, `câu trích căn cứ không có trong kịch bản/bài đọc: "${String(it.cue).slice(0, 60)}"`); } };
  const scr = sc => (sc || []).map(l => l.t || l.say || '').join(' ');
  for (const p of C.LISTENING || []) cueCheck(p.id, scr(p.script), p.groups);
  for (const t of C.READTESTS || []) for (const [i, p] of t.passages.entries()) cueCheck(`${t.id}p${i + 1}`, (p.paras || []).map(x => x.t).join(' '), p.groups);
  for (const p of C.TOEIC?.listening || []) cueCheck(p.id, scr(p.script), p.groups);
  for (const t of C.TOEIC?.reading || []) for (const pt of t.parts) for (const ps of pt.passages || []) cueCheck(`${t.id} P${pt.part}`, ps.text, ps.groups);
  for (const u of [...(C.TOEFL?.reading || []), ...(C.TOEFL?.listening || [])]) cueCheck(u.id, u.text || scr(u.script), u.groups);
}
// TOEIC Part 2 (phương án chỉ là chữ A/B/C): dòng kịch bản của chữ cái đáp án phải trùng câu trích căn cứ
for (const p of C.TOEIC?.listening || []) { const sc = p.script || []; for (const g of p.groups || []) for (const it of g.items || []) {
  if (!(it.options || []).every(o => /^[A-D]$/.test(o))) continue; const k = sc.findIndex(l => (l.say || '').trim() === `Number ${it.n}.`); if (k < 0) { E(`${p.id} q${it.n}`, 'không thấy "Number n." trong kịch bản'); continue; }
  const lines = {}; for (let j = k + 1; j < sc.length && !(sc[j].say || '').startsWith('Number '); j++) { const m = (sc[j].t || sc[j].say || '').match(/^\(?([A-D])[.)]\s*(.*)$/); if (m) lines[m[1]] = m[2].toLowerCase().replace(/\.$/, ''); }
  const right = lines[L(it.a)], cue = String(it.cue || '').toLowerCase().replace(/\.$/, '');
  if (!right) E(`${p.id} q${it.n}`, `kịch bản thiếu phương án ${L(it.a)}`); else if (cue && !right.includes(cue) && !cue.includes(right)) E(`${p.id} q${it.n}`, `đáp án ${L(it.a)} trong kịch bản không khớp câu trích căn cứ`); } }
// Câu trùng trong cùng ngân hàng
for (const [b, list] of Object.entries(banks)) { const seen = new Map(); for (const x of list) { if (seen.has(x.q)) E(x.where, `trùng câu với ${seen.get(x.q)} (${b})`); else seen.set(x.q, x.where); } }

// ---------- Từ vựng ----------
const D = C.IELTS_DATA, wordSeen = new Map();
for (const tp of D?.TOPICS || []) {
  const inTopic = new Set();
  for (const w of tp.words) {
    const where = `vocab ${tp.id}/${w.word}`; bump('Từ vựng (mục)', w.level || '—'); wordSeen.set(w.word.toLowerCase(), (wordSeen.get(w.word.toLowerCase()) || 0) + 1);
    if (!w.word?.trim()) { E(where, 'thiếu từ'); continue; }
    if (inTopic.has(w.word.toLowerCase())) E(where, 'trùng từ trong cùng bộ'); inTopic.add(w.word.toLowerCase());
    if (!w.vi?.trim()) E(where, 'thiếu nghĩa tiếng Việt');
    else { if (FOREIGN.test(w.vi)) E(where, `nghĩa lẫn ngôn ngữ khác "${w.vi}"`); if (norm(w.vi) === norm(w.word) && !VI.test(w.vi) && w.word.length > 3) Wn(where, `nghĩa chưa dịch "${w.vi}"`); }
    if (!w.ipa?.trim()) { if (!/^[A-Z0-9][A-Z0-9/&.-]+s?$/.test(w.word) && w.word.trim().split(/\s+/).length < 4) Wn(where, 'thiếu phiên âm'); } // từ viết tắt (API, TEU…) và mẫu câu ≥ 4 từ: không bắt buộc IPA (đã có nút nghe) else if (!/^\/.+\/$|^\[.+\]$/.test(w.ipa.trim())) E(where, `phiên âm sai định dạng "${w.ipa}"`);
    if (!w.def?.trim()) Wn(where, 'thiếu định nghĩa'); else { if (VIS.test(w.def)) E(where, 'định nghĩa tiếng Anh lẫn tiếng Việt'); if (/[⁄{}\[\]|]|\b(?:wikt|w):|&\w+;/.test(w.def)) E(where, `định nghĩa còn ký tự rác "${w.def}"`); }
    if (!w.ex?.trim()) Wn(where, 'thiếu ví dụ'); else { if (VIS.test(w.ex)) E(where, 'ví dụ lẫn tiếng Việt'); lintEn(where + ' ex', w.ex); const w1 = w.word.split(/[\s\/(]/)[0], k = w1.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z-']/g, '').slice(0, Math.max(3, w.word.length - 3)); if (k.length >= 3 && !w.ex.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(k) && !has(w1, w.ex)) Wn(where, 'ví dụ không chứa từ'); }
    if (!w.level) Wn(where, 'thiếu cấp độ'); else if (!LV.includes(w.level)) E(where, `cấp độ "${w.level}" không hợp lệ`);
  }
}
stat['Từ vựng (từ khác nhau)'] = { '—': wordSeen.size };

// ---------- Báo cáo ----------
if (ARG.has('--stats') || ARG.has('--json')) {
  const rows = Object.entries(stat).map(([k, v]) => [k, Object.values(v).reduce((a, b) => a + b, 0), Object.entries(v).sort().map(([a, b]) => `${a}:${b}`).join(' ')]);
  if (ARG.has('--stats')) for (const r of rows) console.log(r[0].padEnd(26), String(r[1]).padStart(6), ' ', r[2]);
  if (ARG.has('--json')) fs.writeFileSync(path.join(ROOT, 'reports/content-stats.json'), JSON.stringify(stat, null, 1) + '\n');
}
const group = list => { const m = {}; for (const x of list) { const k = x.replace(/^[^:]+: /, '').replace(/"[^"]*"/g, '"…"').replace(/\d+/g, '#').slice(0, 60); m[k] = (m[k] || 0) + 1; } return Object.entries(m).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}× ${k}`).join(' · '); };
if (ARG.has('--warn')) { warns.forEach(w => console.log('⚠', w)); console.log('cảnh báo:', group(warns)); }
errs.slice(0, ARG.has('--all') ? 1e9 : 80).forEach(e => console.log('✗', e));
console.log((errs.length ? '✗' : '✓') + ` content: ${errs.length} lỗi, ${warns.length} cảnh báo` + (errs.length ? ' · ' + group(errs) : ''));
process.exit(errs.length ? 1 : 0);
