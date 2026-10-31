// Mở rộng kho từ – cổng + nạp mục đã xuất (một nguồn: content/lexicon/expand/<lô>.json). docs/LEXICON.md §Mở rộng 20k.
// Mọi giao diện/việc hạ nguồn đọc mục mở rộng QUA ĐÂY (loadExpand / expandRows) – test scripts/test/lexicon-consumers.mjs chặn việc bỏ sót.
import fs from 'fs';
import { ROOT, rd } from '../lib.mjs';
import { badChars, ukStyleBad } from '../ipa.mjs';
import { agree, trIssues, VI, CE, SCRIPT } from '../../content-qa/lib.mjs';
export const LANGS = ['es', 'pt', 'fr', 'de', 'id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'ru', 'tr'];
export const QUEUE = 'content/qa/review-queue.json';
const DIR = 'content/lexicon/expand/';
// chủ đề sẵn có (bộ theo chủ đề) + bộ mới cho từ mở rộng (xw-*)
export const TOPIC_CHOICES = ['education', 'environment', 'technology', 'health', 'work', 'society', 'crime', 'media', 'urban', 'travel', 'culture', 'sport', 'science', 'government', 'economy', 'energy', 'wildlife', 'architecture', 'consumerism', 'space', 'language', 'food',
  'office-it', 'office-hr', 'us-housing', 'us-money', 'us-health', 'dom-it', 'dom-biz', 'dom-med', 'dom-eng', 'dom-law', 'dom-mkt', 'dom-env', 'dom-hosp', 'dom-edu', 'dom-log',
  'xw-people', 'xw-feelings', 'xw-body', 'xw-home', 'xw-nature', 'xw-objects', 'xw-actions', 'xw-qualities', 'xw-time-place', 'xw-arts', 'xw-religion-history', 'xw-military', 'xw-everyday'];
const ex = p => fs.existsSync(new URL(p, ROOT));
const J = p => JSON.parse(rd(p));
const words = s => String(s || '').toLowerCase().match(/[a-z]+/g) || [];
// dịch ngược khớp: bản dịch ngược chứa từ đầu mục / đồng nghĩa / cùng gốc 5 chữ / lồng nhau ≥ 4 chữ (after ⊂ afterwards, claim ⊂ reclaim, clean ⊂ cleanse)
const STOP = new Set('that this with from into onto than then them they their there what when which while where your have been being very some something someone thing things person people make made used using part kind type often usually especially other another about over under after before more most less such each every much many only also just like feel feeling become state quality act action way ways able something'.split(' '));
export function btMatch(bt, w, syn = []) {
  const T = new Set([...words(w), ...syn.flatMap(words)].filter(Boolean)), stem = x => x.slice(0, Math.max(4, Math.min(5, x.length - 1)));
  const S = new Set([...T].map(stem)), H = words(w).filter(x => x.length >= 4);
  // lồng nhau: bản dịch ngược NGẮN hơn đầu mục (after ⊂ afterwards) được; DÀI hơn chỉ khi phần thêm là phụ tố (reclaim, cleanse) – trump ⊄ trumpet (pilot 7)
  return words(bt).some(t => T.has(t) || (t.length >= 4 && S.has(stem(t))) || (t.length >= 4 && H.some(h => h.includes(t) || (t.includes(h) && affixOnly(t, h)))));
}
const PRE = ['re', 'un', 'dis', 'in', 'im', 'mis', 'over', 'out', 'up', 'de', 'be', 'en'], SUF = ['s', 'es', 'd', 'ed', 'ing', 'er', 'ers', 'ly', 'ness', 'ment', 'ments', 'ation', 'ion', 'ity', 'ful', 'less', 'able', 'ible', 'al', 'ize', 'ise', 'se', 'ive', 'y', 'ic', 'ical', 'wards', 'ward'];
const affixOnly = (t, h) => { const i = t.indexOf(h), pre = t.slice(0, i), suf = t.slice(i + h.length); return (!pre || PRE.includes(pre)) && (!suf || SUF.includes(suf)); };
// Dung sai dịch ngược THEO NGÔN NGỮ (pilot 40077853589: 140 mục trượt dịch ngược, phần lớn dịch đúng nhưng dịch ngược ra từ rộng hơn:
// savor→'taste', bureau→'office', enchantment→'charm'). Ngôn ngữ xa tiếng Anh (khác họ/chữ viết) được khớp 'lỏng' = dịch ngược trùng
// một từ nội dung của định nghĩa – CHỈ khi cả 2 giám khảo chấm bản dịch ≥ 4. es/pt/fr/de/ru giữ khớp chặt.
export const BT_LOOSE = new Set(['id', 'th', 'zh', 'ja', 'ko', 'hi', 'ar', 'tr']);
export function btOk(e, l) {
  const bts = (e.qa.btw || {})[l] || [];
  if (bts.some(b => btMatch(b, e.w, e.syn))) return true;
  const sc = (e.qa.tr || {})[l] || [];
  if (!BT_LOOSE.has(l) || sc.length < 2 || Math.min(...sc) < 4) return false;
  const D = new Set(words(e.def).filter(x => x.length >= 4 && !STOP.has(x)));
  return bts.some(b => words(b).some(t => t.length >= 4 && !STOP.has(t) && D.has(t)));
}
// vi do AI lấp (pilot 20261028 lần 2: bight "cúm", caucus "bầu chọn", recollection "kỷ niệm", heighten "tăng cường" – cả 3 giám khảo cho 5):
// dịch ngược vi→Anh của giám khảo (qa.viBtw) phải khớp ở ≥ 2 giám khảo: đầu mục / đồng nghĩa / lemma WordNet (btMatch) hoặc cùng gốc 5 chữ với 1 từ nội dung của def.
export function viBtOk(e) {
  const bts = (e.qa && e.qa.viBtw) || [], syn = [...(e.syn || []), ...((e.qa && e.qa.viLem) || [])], st = x => x.slice(0, 5);
  // gốc def: chỉ 3 từ nội dung ĐẦU (lõi nghĩa) – bequest "…left in a will": "will" ở đuôi def không chứng minh "di chúc" đúng nghĩa
  const D = new Set(words(e.def).filter(x => x.length >= 4 && !STOP.has(x)).slice(0, 3).map(st));
  return bts.filter(b => btMatch(b, e.w, syn) || words(b).some(t => t.length >= 4 && !STOP.has(t) && D.has(st(t)))).length >= 2;
}
// Lỗ dữ liệu NGUỒN (IPA từ Wiktionary/CMUdict/espeak – không do AI soạn) ≠ lỗi nội dung → không bao giờ vào hàng duyệt; lượt sau làm lại.
// 'ipa: lệch Britfone/CMU' (ipa-check.mjs checkEntry) KHÔNG phải lỗ: sinh lại vẫn ra cùng IPA nguồn → hàng duyệt (người soát sửa/giữ)
const GAP = /^ipa(?=[ :])(?!: lệch Britfone)|^dịch vi: thiếu dịch ngược/; // thiếu dịch ngược vi = giám khảo bỏ sót trường → lượt sau sinh lại
export const sourceGap = r => !!(r && !r.ok && r.why.length && r.why.every(x => GAP.test(x)));
// Có ÍT NHẤT 1 lỗ nguồn (kể cả kèm lỗi nội dung) → không vào hàng duyệt (người soát không sửa được IPA nguồn); lượt sau sinh lại cả mục – cùng luật requeue.mjs --gaps
export const hasGap = r => !!(r && !r.ok && (r.why || []).some(x => GAP.test(x)));
const formOf = (w, s) => { const t = words(s), st = w.split('-')[0].slice(0, Math.min(w.length, 4)); return t.some(x => x === w || x.startsWith(st)); }; // biến tố/bất quy tắc (forsook) vẫn khớp 4 chữ đầu
// Cổng 1 mục (CỨNG): lược đồ · IPA hợp lệ (Anh từ Wiktionary, Mỹ từ CMUdict) · 2 giám khảo khác họ ≥ 4 lệch ≤ 1 · CEFR · dịch (≥ 4 cả 2 giám khảo, đúng chữ viết, không lẫn tiếng Việt, dịch ngược ≥ 0.8)
// định nghĩa đúng HÌNH từ loại (quy ước kho, đo 26/10: v 1348/1348 "to …", adj/adv 0 mạo từ/"to", n 0 "to") – pilot 11: purple#adj "a colour that…"
export const DEF_POS_FIX = { v: 'a verb definition must start with "to …"', adj: 'an adjective definition must describe a quality (no "a/an/the …" noun phrase, no "to …")', adv: 'an adverb definition must not start with "a/an/the" or "to"', n: 'a noun definition must not start with "to …"' };
export function defPosOk(def, pos) {
  const d = String(def || '').trim().toLowerCase();
  if (pos === 'v') return /^to /.test(d);
  if (pos === 'adj' || pos === 'adv') return !/^(to|a|an|the) /.test(d);
  if (pos === 'n') return !/^to /.test(d);
  return true;
}
export const SENSITIVE = /\b(muslims?|islam(ic|ists?)?|jews?|jewish|christians?|christianity|hindus?|buddhists?|catholics?|protestants?|atheists?|gays?|lesbians?|homosexuals?|transgender|blacks|whites|negro(es)?|arabs?|immigrants?|refugees?|terrorists?)\b/i;
// ví dụ cho người học tuổi teen: không nội dung tình dục (pilot 20261028: virgin "I am still a virgin.") → hàng duyệt
export const ADULT = /\b(virgins?|virginity|sex|sexual(ly)?|sexy|intercourse|naked|nude|porn\w*|erotic|condoms?|prostitut\w*|orgasm\w*)\b/i;
// ví dụ phải là CÂU hoàn chỉnh (pilot 20261028: ballet "a classically-trained ballet dancer" – cụm danh từ, không phải câu)
export const isSentence = x => /^["'“‘(]?[A-Z0-9]/.test(String(x || '').trim()) && /[.!?]["'”’)]?$/.test(String(x || '').trim());
/** biến tố của từ (không phái sinh): s/es/ed/d/ing/er/est, y→ies/ied, e câm, phụ âm đôi; bất quy tắc qua 4 chữ đầu chỉ khi từ ≥ 5 chữ và đuôi ngắn (forsook) */
export function inflRe(w) { const b = String(w).toLowerCase().replace(/[^a-z-]/g, ''), st = b.replace(/e$/, ''), y = b.replace(/y$/, ''), dbl = b + b.slice(-1);
  return new RegExp(`\\b(${b}(s|es|d|ed|ing|er|est)?|${st}(ed|ing|er|est)|${y}(ies|ied|ier|iest)|${dbl}(ed|ing|er|est))\\b`, 'i'); }
// ---- "RA LÀ OK" (29/10): trắc nghiệm nghĩa 3 giám khảo (lxwsd) – một luật cho mọi trường (docs/LEXICON.md §Mở rộng 20k)
/** probe đạt khi CẢ 3 giám khảo (khác họ) chọn đúng số nghĩa khoá (1-based); thiếu phiếu = không đạt */
export const wsdOk = (votes, lock) => Array.isArray(votes) && votes.length >= 3 && votes.every(v => Number(v) === lock);
/** KHÓA NGHĨA THÔNG DỤNG (lớp L3): nghĩa 1 của Wiktionary (xếp theo độ thông dụng) → số nghĩa WordNet mà CẢ 3 giám khảo chọn.
 *  Không đồng thuận → chấp nhận nghĩa SemCor chỉ khi nghĩa 2 Wiktionary được cả 3 chọn ĐÚNG nghĩa đó (nghĩa phổ biến thật); còn lại null = bỏ từ (hàng duyệt). */
export function lockSense(v1, v2, semIdx, n) {
  const one = v => Array.isArray(v) && v.length >= 3 && v.every(x => Number(x) === Number(v[0])) && Number(v[0]) >= 1 && Number(v[0]) <= n ? Number(v[0]) : 0;
  if (one(v1)) return { idx: one(v1), by: 'wiktionary-1' };
  if (one(v2) && one(v2) === semIdx) return { idx: semIdx, by: 'wiktionary-2+semcor' };
  // 2/3 giám khảo chọn nghĩa 1 Wiktionary = ĐÚNG nghĩa SemCor (tần suất ngữ liệu) → hai tín hiệu độc lập cùng chỉ một nghĩa (pilot 29/10: expel, transcend)
  const maj = v => (Array.isArray(v) && v.length >= 3 ? [...new Set(v.map(Number))].find(x => x >= 1 && v.filter(y => Number(y) === x).length >= 2) : 0) || 0;
  if (maj(v1) && maj(v1) === semIdx) return { idx: semIdx, by: 'wiktionary-1-2of3+semcor' };
  return null;
}
/** vi chuẩn hoá để so nguồn: thường, bỏ ngoặc, NFC */
export const viNorm = v => String(v || '').toLowerCase().normalize('NFC').replace(/\([^)]*\)/g, '').split(/[;,]/).map(x => x.trim().replace(/\s+/g, ' ')).filter(Boolean);
/** vi HAI NGUỒN ĐỘC LẬP (lớp L1): nguồn = { wk: Wiktionary (bảng khớp nghĩa ∪ mục vi cùng từ loại), a: lxtr, b: lxvi (họ khác) }.
 *  Trả [{ v, src: [...] }] theo thứ tự wk → a → b, chỉ phương án có ≥ 2 nguồn. */
// khoá so khớp vi (pilot 29/10: "khinh bỉ" ≠ "sự khinh bỉ" → trượt oan): bỏ từ chỉ loại đầu (sự/việc/cái/con/nỗi/niềm/cuộc/chiếc; "tính" chỉ khi còn ≥ 2 âm tiết – tính toán ≠ toán; KHÔNG bỏ "lòng": lòng bàn tay ≠ bàn tay),
// giữ thứ tự âm tiết (đảo = đổi nghĩa). Phương án hiển thị = dạng gặp đầu tiên (Wiktionary trước).
export const viKey = v => viNorm(v)[0] ? viNorm(v)[0].replace(/^(sự|việc|cái|con|nỗi|niềm|cuộc|chiếc) (?=\S)/, '').replace(/^tính (?=\S+ \S)/, '') : ''; // KHÔNG đảo âm tiết: thần tượng ≠ tượng thần
export function viAgreeSources(srcs) {
  const m = new Map();
  for (const s of Object.keys(srcs)) for (const v of [].concat(srcs[s] || []).flatMap(viNorm)) { const k = viKey(v); if (!k) continue; const o = m.get(k) || m.set(k, { v, src: [] }).get(k); if (!o.src.includes(s)) o.src.push(s); }
  return [...m.values()].filter(o => o.src.length >= 2);
}
/** bản dịch 12 ngôn ngữ cũng cần ≥ 2 nguồn độc lập (pilot 29/10: detriment ko 상해 – chỉ bảng Wiktionary + trắc nghiệm nghĩa vẫn lọt) */
// soát 50 mẫu pilot 29/10: 9/11 bản dịch sai chỉ 1 nguồn; 2 còn lại khớp Wiktionary ∩ OMW nhưng không tự nhiên (pt surpresa, zh 蚤) → AI họ A xác nhận + nguồn người viết;
export const TR2 = /^wiktionary\+omw\+ai$/; // soát pilot 2: 5/7 lỗi dịch chỉ 2 nguồn (omw+ai, wiktionary+ai) → cần ĐỦ 3 nguồn
export function trNorm(l, t) { return String(t || '').split(/\s*;\s*/)[0].toLowerCase().trim().replace(/[\u064B-\u0652\u0670]/g, '').replace(/[+_]/g, l === 'ja' ? '' : ' ').replace(/\s+/g, ' ').replace(l === 'ja' ? /する$/ : /$^/, ''); }
export const trIn = (l, t, list) => { const T = trNorm(l, t); return !!T && [].concat(list || []).flatMap(x => String(x || '').split(/\s*;\s*/)).some(x => trNorm(l, x) === T); };
// HÌNH TỪ LOẠI của bản dịch (lớp D3: carelessly es "descuidado" tính từ, dizzy tr danh từ) – luật tất định cho đuôi rõ ràng; không có luật → đạt (giám khảo lxwsd chặn tiếp)
export function posShapeOk(l, pos, t, w = '') {
  const x = String(t || '').trim().split(/\s*;\s*/)[0] || '', f = x.split(/\s+/)[0], last = x.split(/\s+/).pop();
  if (!x) return false;
  if (pos === 'adv' && /ly$/.test(w)) { if (['es', 'pt'].includes(l)) return /mente$/.test(last); if (l === 'fr') return /ment$/.test(last); if (l === 'ru') return /[оеи]$/.test(f); }
  if (pos === 'v') { if (['es', 'pt'].includes(l)) return /(r|rse|r-se)$/.test(f); if (l === 'fr') return /^(se |s')?\S*(er|ir|re|oir)$/.test(x.replace(/^(se |s')/, '')) || /(er|ir|re|oir)$/.test(f); if (l === 'ru') return /(ть|ти|чь)(ся|сь)?$/.test(f); if (l === 'tr') return /(mak|mek)$/.test(last); if (l === 'de') return /n$/.test(last); if (l === 'ko') return /다$/.test(last); }
  if (pos === 'adj') { if (l === 'ru') return /(ый|ий|ой|ая|яя|ое|ее|ые|ие)$/.test(f); if (l === 'ko') return /(다|운|은|는|한|인|른|된)$/.test(last); }
  if (pos === 'n' && l === 'de') return /^[A-ZÄÖÜ]/.test(last);
  return true;
}
/** khớp OMW (lớp D1): bản dịch (từ đầu) có trong lemma OMW của CHÍNH synset (chuẩn hoá: thường, bỏ harakat, bỏ "する" đuôi tiếng Nhật) */
export const omwHas = (l, t, list) => trIn(l, t, list);
export function gateEntry(e, { keep } = {}) {
  // mục ĐÃ QUA cổng và đã lưu (qa.trKeep, perLang bị xoá, ngôn ngữ trượt bị bỏ, qa.btw gộp vào qa.bt) – xét lại theo đúng dạng lưu:
  // ngôn ngữ còn lại vẫn phải đủ mọi điều kiện, dịch ngược dùng kết quả đã chấm (qa.bt). Trước 30/10 chưa từng có lô xuất nên test chưa chạm tới.
  const stored = !!(e && !e.perLang && e.qa && Array.isArray(e.qa.trKeep));
  if (stored) e = { ...e, perLang: true, _stored: true };
  const why = [];
  if (!e) return { ok: false, why: ['gen: không sinh được'] };
  if (keep === false) return { ok: false, why: ['keep: không phải mục từ chuẩn'] };
  if (!['n', 'v', 'adj', 'adv'].includes(e.pos)) why.push('schema: pos');
  if (!e.ipa) why.push('ipa: thiếu IPA Anh (Wiktionary + espeak)'); else if (badChars(e.ipa).length) why.push('ipa: ký hiệu ngoài bảng ' + badChars(e.ipa).join(''));
  if (e.ipa && ukStyleBad(e.ipa)) why.push('ipa: Anh sai kiểu kho (a đơn / ký hiệu tuỳ chọn) ' + e.ipa);
  // IPA lệch Britfone (Anh) / CMUdict (Mỹ) mà không tự sửa được (job.mjs chạy ipa-check.mjs checkEntry trước cổng) – chủ 28/10: không ghi IPA lệch vào kho
  for (const b of [].concat(e.ipaBad || [])) why.push('ipa: lệch Britfone/CMU ' + b);
  if (!e.ipaUS) why.push('ipa: thiếu IPA Mỹ'); else if (badChars(e.ipaUS).length) why.push('ipa: Mỹ ngoài bảng ' + badChars(e.ipaUS).join(''));
  if (!e.def || words(e.def).length > 18 || words(e.def).includes(e.w)) why.push('schema: định nghĩa');
  else if (!defPosOk(e.def, e.pos)) why.push('schema: định nghĩa sai hình từ loại ' + e.pos);
  if (!Array.isArray(e.ex) || e.ex.length !== 2 || e.ex[0] === e.ex[1] || e.ex.some(s => !formOf(e.w, s))) why.push('schema: 2 ví dụ chứa từ');
  else if (e.ex.some(x => !isSentence(x))) why.push('ví dụ: không phải câu hoàn chỉnh (viết hoa đầu, có dấu câu cuối)');
  if (!Array.isArray(e.col)) why.push('schema: cụm từ'); // source-first: cụm chỉ từ nguồn (WordNet/Tatoeba) – không có thì để trống, không bịa
  if (e.trBad && !e.perLang) for (const [l, w] of Object.entries(e.trBad)) why.push(`dịch ${l}: từ không có thật trong ngôn ngữ (wordfreq: ${[].concat(w).join(', ')})`);
  if (e.defChanged) why.push('def: viết lại khác nghĩa gloss WordNet (' + String(e.defChanged).slice(0, 80) + ')');
  if (!CE.includes(e.level)) why.push('cefr: cấp');
  else if ((e.cefrSrc || 'freq') === 'freq' && Math.abs(CE.indexOf(e.level) - CE.indexOf(e.cefrF || e.level)) > 2) why.push('cefr: lệch tần suất > 2 bậc');
  if (!e.vi || !VI.test(e.vi) && !/[àáâãèéêìíòóôõùúýđ]/i.test(e.vi)) why.push('dịch vi: không phải tiếng Việt');
  const a = agree(e.qa); if (!a.ok) why.push('giám khảo: ' + a.why);
  // đồng thuận 3 giám khảo khác họ (chủ 27/10): mục ghi qa.n = 3 phải đủ 3 điểm, mỗi bản dịch đủ 3 điểm
  if (e.qa.n === 3 && new Set(Object.keys(e.qa.j || {}).map(k => k.split(':')[0])).size < 3) why.push('giám khảo: cần 3 giám khảo khác họ đồng thuận');
  // pilot 20261027 (soát tay 7/50 sai): giám khảo đã NÊU lỗi cụ thể ("Vietnamese translation incorrect", "synonym … unrelated") mà điểm vẫn 4 → mục lọt. Có lý do = có lỗi → hàng duyệt.
  const fl = (Array.isArray(e.qa.f) ? e.qa.f : [e.qa.f]).filter(x => x && String(x).trim()); if (fl.length) why.push('giám khảo nêu lỗi: ' + fl.join(' · ').slice(0, 120));
  // ví dụ cho người học tuổi teen: không nhắc nhóm tôn giáo/sắc tộc/xu hướng (pilot 20261027: categorize "…all Muslims as murderers")
  if (Array.isArray(e.ex) && e.ex.some(x => SENSITIVE.test(x))) why.push('ví dụ: nhắc nhóm tôn giáo/sắc tộc – không hợp người học teen');
  if ([e.def].concat(e.ex || []).some(x => ADULT.test(String(x || '')))) why.push('ví dụ/định nghĩa: nội dung tình dục – không hợp người học teen');
  // KHÓA NGHĨA (pilot 7: prop/tweet lệch nghĩa): cả 2 giám khảo phải trả lời "yes" – thiếu = trượt
  if (Array.isArray(e.qa.sense) && !(e.qa.sense.length >= 2 && e.qa.sense.every(x => x === 'yes'))) why.push('nghĩa: ví dụ/dịch không đúng nghĩa khóa (' + e.qa.sense.join('/') + ')');
  if (e.posDrift) why.push('nghĩa: đổi từ loại ' + e.pos + '→' + e.posDrift);
  // khoá nghĩa thông dụng (lớp L3) + trắc nghiệm nghĩa 3 giám khảo (lớp L1/L2): thiếu đồng thuận = trượt, không bao giờ nhận
  if (e.senseLock === false) why.push('nghĩa: không khoá được nghĩa thông dụng (nghĩa 1 Wiktionary ↔ WordNet, 3 giám khảo)');
  const W = e.qa.wsd;
  if (W) { if (!Array.isArray(W.ex) || W.ex.length !== 2 || !W.ex.every(Boolean)) why.push('nghĩa: ví dụ chưa qua trắc nghiệm nghĩa 3 giám khảo');
    if (W.vi !== true) why.push('dịch vi: chưa qua trắc nghiệm nghĩa 3 giám khảo');
    if (!Array.isArray(e.qa.viSrc) || e.qa.viSrc.length < 2 || !e.qa.viSrc.includes('wk')) why.push('dịch vi: cần Wiktionary + ≥ 1 AI trùng (2 nguồn độc lập)'); }
  if (e.ipaPos === false) why.push('ipa-pos: không có IPA Anh khớp từ loại (cặp đổi trọng âm danh–động)');
  // CEFR: nguồn kiểu EVP (CEFR-J/Octanove) thắng; chỉ dải tần suất → giám khảo kiểm, lệch ≥ 2 bậc → trượt (pilot 7: assault A2)
  if (CE.includes(e.level) && (e.cefrSrc || 'freq') === 'freq' && Array.isArray(e.qa.cefrJ)) { const off = e.qa.cefrJ.filter(x => CE.includes(x)).map(x => Math.abs(CE.indexOf(x) - CE.indexOf(e.level))); if (off.some(d => d >= 2)) why.push('cefr: giám khảo lệch ≥ 2 bậc (' + e.qa.cefrJ.join('/') + ' ≠ ' + e.level + ')'); }
  // vi khác Wiktionary → giám khảo phân xử: cả 2 "ok" (giữ) hoặc đã sửa theo Wiktionary; còn lại → hàng duyệt
  if (Array.isArray(e.qa.vi) && !(e.qa.vi.every(x => x === 'ok') || e.qa.vi.every(x => x === 'fixed'))) why.push('dịch vi: khác Wiktionary, giám khảo chưa chắc (' + e.qa.vi.join('/') + ')');
  // vi Wiktionary cũng dịch ngược (pilot 20261028@13:31Z: vanity "tính hư ảo", sway "đu" – Wiktionary đúng nghĩa KHÁC của từ)
  if (e.qa.viBtw) { const ai = ((e.src && e.src.tr) || {}).vi === 'ai'; if (e.qa.viBtw.length < 2) why.push('dịch vi: thiếu dịch ngược (giám khảo bỏ sót bt_vi)');
    else if (!viBtOk(e)) why.push('dịch vi: ' + (ai ? 'AI lấp' : 'Wiktionary') + ', dịch ngược không khớp (' + e.qa.viBtw.join(' / ').slice(0, 80) + ')'); }
  let bt = 0; const drop = {};
  for (const l of LANGS) {
    const t = (e.m || {})[l], sc = (e.qa.tr || {})[l] || [];
    if (e._stored && !t && !e.qa.trKeep.includes(l)) continue; // dạng lưu: ngôn ngữ đã bỏ ở cổng (qa.trDrop) – không có bản dịch là đúng
    const is = trIssues(e.w, t, l); if (t && SCRIPT[l] && !SCRIPT[l].test(t)) is.push('không có chữ bản địa'); if (t && String(t).toLowerCase().trim() === e.w && !['es', 'pt', 'fr', 'de', 'id', 'tr'].includes(l)) is.push('chép nguyên từ tiếng Anh');
    if (e.qa.bad && e.qa.bad[l]) is.push(/translit/.test(e.qa.bad[l]) ? 'phiên âm tiếng Anh' : 'khác từ loại/khác từ');
    if (e.perLang) {
      // CỔNG THEO TRƯỜNG (chủ 27/10): ngôn ngữ chỉ HIỆN khi bản dịch đó đạt – nguồn người viết (bảng Wiktionary khớp nghĩa chắc chắn), đủ 3 giám khảo ≥ 4,
      // từ có thật (trcheck), dịch ngược khớp; trượt → bỏ ngôn ngữ đó khỏi mục (app dùng đường dịch hiện có của kho), KHÔNG làm trượt cả mục.
      if (t && !/^(wiktionary|omw)/.test(((e.src && e.src.tr) || {})[l] || '')) is.push('không phải nguồn người viết (Wiktionary/OMW)');
      else if (t && W && !TR2.test(((e.src && e.src.tr) || {})[l] || '')) is.push('cần 2 nguồn độc lập (Wiktionary / OMW / AI)');
      if (t && W && !(W.tr && W.tr[l] === true)) is.push('chưa qua trắc nghiệm nghĩa 3 giám khảo');
      if (t && !posShapeOk(l, e.pos, t, e.w)) is.push('sai hình từ loại ' + e.pos);
      if (t && e.trBad && e.trBad[l]) is.push('từ không có thật (wordfreq: ' + [].concat(e.trBad[l]).join(', ') + ')');
      if (t && !is.length && (sc.length < 3 || Math.min(...sc) < 4)) is.push('giám khảo < 4 (' + sc.join('/') + ')');
      if (t && !is.length && !e._stored && !btOk(e, l)) is.push('dịch ngược không khớp');
      if (t && e._stored && !e.qa.trKeep.includes(l)) is.push('ngôn ngữ không nằm trong trKeep');
      if (is.length) drop[l] = is.join(', '); else bt++;
      continue;
    }
    if (is.length) { why.push(`dịch ${l}: ${is.join(', ')}`); continue; }
    if (sc.length < (e.qa.n || 2) || Math.min(...sc) < 4) why.push(`dịch ${l}: giám khảo < 4 (${sc.join('/')})`);
    if (btOk(e, l)) bt++;
  }
  if (e._stored) for (const [l, d] of Object.entries(drop)) why.push(`dịch ${l}: ${d}`); // dạng lưu: không còn quyền bỏ ngôn ngữ – mọi bản dịch còn lại phải đạt
  if (e.perLang) return why.length ? { ok: false, why } : { ok: true, bt: +(bt / LANGS.length).toFixed(2), keep: LANGS.filter(l => !(l in drop)), drop };
  const btr = e.qa.btw ? bt / LANGS.length : e.qa.bt;
  if (!(btr >= 0.8)) why.push(`dịch ngược ${btr && btr.toFixed(2)} < 0.8`);
  return why.length ? { ok: false, why } : { ok: true, bt: +btr.toFixed(2) };
}
const files = sub => ex(DIR + sub) ? fs.readdirSync(new URL(DIR + sub, ROOT)).filter(f => /^[\w.-]+\.json$/.test(f) && f !== 'candidates.json').map(f => DIR + sub + f) : [];
// từ đã xử lý (đã xuất + chờ soát + hàng duyệt) – để chạy lại không làm trùng
export function doneWords() {
  const s = new Set();
  for (const f of [...files(''), ...files('pending/')]) for (const k of Object.keys(J(f).items || {})) s.add(k.split('#')[0]);
  if (ex(QUEUE)) for (const q of J(QUEUE).items || []) if (q.src === 'lexicon-expand' && !sourceGap({ ok: false, why: q.why || [] })) s.add(String(q.id).split('#')[0]);
  return s;
}
// Mục ĐÃ XUẤT: lô ở content/lexicon/expand/<lô>.json có tệp kiểm mẫu content/qa/batches/lx-<lô>.json đạt (status published)
export function loadExpand() {
  const out = [];
  for (const f of files('')) {
    const b = J(f), bf = `content/qa/batches/lx-${b.id}.json`;
    if (!ex(bf) || J(bf).status !== 'published') continue;
    for (const [k, e] of Object.entries(b.items)) out.push({ k, e, batch: b.id, file: f });
  }
  return out;
}
// Dạng INDEX (giống IELTS_DATA.INDEX của trình duyệt) cho mảnh tra từ
export const toIndex = e => ({ word: e.w, ipa: e.ipa, pos: e.pos, vi: e.vi, def: e.def, ex: e.ex[0], col: e.col, syn: e.syn, level: e.level, emoji: e.emoji || '', ipaUS: e.ipaUS === e.ipa ? '' : e.ipaUS, topic: e.topic || '', ex2: e.ex[1], ...(e.note_vi ? { note: e.note_vi } : {}), x: 1 });
// Dạng dòng kho (scripts/lexicon/lib.mjs loadAll) cho việc Node hạ nguồn (âm thanh, kịch bản, dist/lexicon.json…)
export const expandRows = () => loadExpand().map(({ e, batch, file }) => ({ file, line: -1, set: e.topic || 'xw-everyday', x: 1, batch, row: [e.w, e.ipa, e.pos, e.vi, e.def, e.ex[0], e.col.join('|'), e.syn.join('|'), e.level, e.emoji || '', e.ipaUS === e.ipa ? '' : e.ipaUS] }));

// ---- lỗi hạ tầng ≠ lỗi nội dung (pilot 40070729116: kho Gemini 1 khóa hết hạn mức ngày → 503 no-model keys=0 → 500 từ bị đẩy nhầm vào hàng duyệt
// và doneWords() loại chúng vĩnh viễn). Hạ tầng hỏng → dừng gọi (cầu dao), KHÔNG ghi hàng duyệt, job đỏ với lý do rõ.
/** Phản hồi /api/lexai cho biết kho khóa rỗng/hết hạn mức (không phải lỗi mục) */
export function poolEmpty(status, body) { return (status === 503 || status === 429) && /no-model/.test(String(body || '')) && /keys=0\b/.test(String(body || '')); }
/** Mục chỉ vào hàng duyệt khi lỗi do NỘI DUNG; gen hỏng vì gọi API thất bại (callOk=false) → bỏ qua, lượt sau thử lại */
export function queueable(r, callOk) { return !r.ok && !(callOk === false && /^gen:/.test(r.why[0] || '')); }
/** Cầu dao: sau `max` lần liên tiếp kho rỗng thì mở (ngừng gọi) */
export function breaker(max = 3) { let n = 0; const b = { open: false, hit(empty) { n = empty ? n + 1 : 0; if (n >= max) b.open = true; return b.open; } }; return b; }

/** câu trả lời trắc nghiệm nghĩa của 1 mục → {probeId: số}. Mô hình hay bọc thêm 1 tầng ({probes:{…}}, {answers:{…}}, [{id, sense}]) – 30/10 gpt-oss trên Groq
 *  trả khuôn bọc nên giám khảo A luôn "null" → khoá nghĩa trượt hàng loạt. null = không đọc được (ghi nhật ký, không đoán). */
export function wsdUnwrap(o, ids) {
  const num = v => (typeof v === 'number' || (typeof v === 'string' && /^\d+$/.test(v.trim())) ? Number(v) : (v && typeof v === 'object' && !Array.isArray(v) && ['sense', 'n', 'answer', 'value'].some(x => x in v) ? num(v.sense ?? v.n ?? v.answer ?? v.value) : undefined));
  const flat = x => { if (!x || typeof x !== 'object') return null;
    if (Array.isArray(x)) { const r = {}; for (const y of x) if (y && typeof y === 'object') { const id = y.id ?? y.probe ?? y.k; if (id != null) r[id] = num(y.sense ?? y.n ?? y.answer ?? y.value); } return r; }
    const r = {}; for (const id of ids) if (id in x) r[id] = num(x[id]); return Object.values(r).some(v => v !== undefined) ? r : null; };
  const d = flat(o); if (d) return d;
  if (o && typeof o === 'object') for (const key of ['probes', 'answers', 'senses', 'result', 'results', 'out']) { const r = flat(o[key]); if (r && Object.values(r).some(v => v !== undefined)) return r; }
  return null;
}
