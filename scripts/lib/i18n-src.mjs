// MỘT định dạng cho nguồn dịch dễ đọc i18n/ui/<lang>.js và i18n/ui/<lang>/<nhóm>.js (13 ngôn ngữ) – docs/I18N-PIPELINE.md.
// Gốc 10/11 (#934 xung đột 3 lần/ngày, #983): mỗi tệp là MỘT dòng JSON khổng lồ → 2 PR thêm 2 khóa khác nhau cũng xung đột cả tệp.
// Nay: mỗi khóa một dòng `"khóa":"bản dịch",` (dòng nào cũng có dấu phẩy – literal JS cho phép), sắp xếp ổn định theo khóa →
// git tự gộp 2 PR thêm/sửa khóa khác nhau; xung đột chỉ còn khi sửa CÙNG khóa. Hợp 2 bên kiểu union (git merge-file --union /
// xóa dấu xung đột) vẫn là JS hợp lệ: khóa trùng → dòng sau thắng, writeSrc/normSrc gộp lại.
// Người ghi: split-i18n, gen-i18n, i18n-fix, i18n-dedupe, confidence/build, preview-resolve. Test: scripts/test/i18n-src.mjs.
import fs from 'node:fs';

const TAIL = "})(typeof self !== 'undefined' ? self : this);";
const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);   // theo mã UTF-16: ổn định, không phụ thuộc locale máy
export function fmtSrc(head, lang, dict) {
  const L = JSON.stringify(lang), rows = Object.keys(dict).sort(cmp).map(k => JSON.stringify(k) + ':' + JSON.stringify(dict[k]) + ',');
  return `${head}\n(function (g) { const D = g.I18N_DICT = g.I18N_DICT || {}; D[${L}] = Object.assign(D[${L}] || {}, {\n${rows.join('\n')}${rows.length ? '\n' : ''}});\n${TAIL}\n`;
}
// đọc bằng cách CHẠY tệp (mọi dạng cũ/mới, nhiều Object.assign, khóa trùng sau-thắng) → { head, lang, dict }
export function parseSrc(text) {
  const g = {}; new Function('self', 'globalThis', String(text).replace(/\(typeof self !== 'undefined' \? self : this\)/g, '(self)'))(g, g);
  const D = g.I18N_DICT || {}, lang = Object.keys(D)[0];
  const head = String(text).startsWith('/*') ? String(text).slice(0, String(text).indexOf('*/') + 2) : '/* UI ' + lang + ' */';
  return { head, lang, dict: D[lang] || {} };
}
export const normSrc = text => { const p = parseSrc(text); return fmtSrc(p.head, p.lang, p.dict); };
export const writeSrc = (file, head, lang, dict) => fs.writeFileSync(file, fmtSrc(head, lang, dict));
// tệp đúng định dạng? (đọc lại rồi ghi ra phải y hệt)
export const isCanonical = text => { try { return normSrc(text) === text; } catch { return false; } };
