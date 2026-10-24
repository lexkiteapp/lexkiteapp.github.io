// Đọc/ghi kho từ vựng gốc (web/js/data.js + web/js/lib/*.js) theo DÒNG – nguồn sự thật duy nhất.
// Mỗi dòng mục từ: ['word', '/ipa/', 'pos', 'vi', 'def', 'ex', 'col', 'syn', 'level', 'emoji', 'ipaUS?']
import fs from 'fs';
export const ROOT = new URL('../../', import.meta.url);
export const rd = p => fs.readFileSync(new URL(p, ROOT), 'utf8');
export const wr = (p, s) => fs.writeFileSync(new URL(p, ROOT), s);

// Thứ tự ưu tiên khi chọn nghĩa chung (nghĩa thông dụng nhất): danh sách tần suất chung trước, chuyên ngành sau
export const PRIORITY = ['ngsl.js', 'ngsl2.js', 'data.js', 'topics-more.js', 'skills.js', 'exam-vocab.js', 'exam-vocab2.js', 'exam-vocab3.js',
  'awl.js', 'nawl.js', 'tsl-a.js', 'tsl-b.js', 'office.js', 'bsl.js', 'domain-a.js', 'domain-b.js'];
export const SOURCES = PRIORITY.map(f => (f === 'data.js' ? 'web/js/data.js' : 'web/js/lib/' + f));

const ROW = /^(\s*)\[\s*'(.*)\](,?)\s*$/;
export function parseRow(line) {
  const m = ROW.exec(line);
  if (!m) return null;
  try { const r = Function('"use strict";return [\'' + m[2] + ']')(); return Array.isArray(r) && typeof r[0] === 'string' ? { indent: m[1], comma: m[3], row: r } : null; } catch { return null; }
}
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
export const formatRow = (indent, row, comma) => indent + '[' + row.map(q).join(', ') + ']' + comma;

// Nạp mọi mục: [{ file, line, set, row }]
export function loadAll() {
  const out = [];
  for (const file of SOURCES) {
    const lines = rd(file).split('\n');
    let set = '';
    lines.forEach((ln, i) => {
      const s = /(?:add|T)\('([\w-]+)'/.exec(ln); if (s) set = s[1];
      const p = parseRow(ln); if (p && p.row.length >= 9) out.push({ file, line: i, set, row: p.row });
    });
  }
  return out;
}

// Ghi lại các dòng đã đổi (chỉ dòng khác – diff nhỏ)
export function saveAll(entries) {
  const byFile = new Map();
  for (const e of entries) { if (!byFile.has(e.file)) byFile.set(e.file, []); byFile.get(e.file).push(e); }
  let changed = 0;
  for (const [file, list] of byFile) {
    const lines = rd(file).split('\n');
    for (const e of list) {
      const p = parseRow(lines[e.line]);
      const row = e.row.slice(); while (row.length > 10 && !row[row.length - 1]) row.pop();
      if (JSON.stringify(p.row) === JSON.stringify(row)) continue;
      lines[e.line] = formatRow(p.indent, row, p.comma); changed++;
    }
    wr(file, lines.join('\n'));
  }
  return changed;
}

export const key = r => r[0].toLowerCase().trim() + '#' + normPos(r[2]);
export function normPos(p) {
  p = String(p || '').toLowerCase().trim();
  if (/^(n|noun)\b/.test(p)) return 'n';
  if (/^(phr ?v|phrasal)/.test(p)) return 'phrv';
  if (/^(v|verb)\b/.test(p)) return 'v';
  if (/^adj/.test(p)) return 'adj';
  if (/^adv/.test(p)) return 'adv';
  return p || '?';
}

// Kho + mục mở rộng đã xuất (content/lexicon/expand – docs/LEXICON.md §Mở rộng 20k) cho việc Node HẠ NGUỒN chỉ đọc (âm thanh, kịch bản, dist/lexicon.json…).
// KHÔNG dùng cho saveAll (mục mở rộng không có dòng trong web/js). Test scripts/test/lexicon-consumers.mjs chặn việc hạ nguồn bỏ sót.
export async function loadAllPlus() { const { expandRows } = await import('./expand/lib.mjs'); const base = loadAll(), have = new Set(base.map(e => e.row[0].toLowerCase().trim())); return [...base, ...expandRows().filter(e => !have.has(e.row[0].toLowerCase()))]; }
