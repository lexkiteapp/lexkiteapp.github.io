// 📚 Cổng gọn docs/ (chạy trong npm test): tài liệu hiện hành không phình quá ngân sách, mọi doc có trong docs/INDEX.md, có khối TL;DR.
//   1) Mỗi .md hiện hành trong docs/ (trừ docs/archive/ và file *-ARCHIVE.md = kho nguyên văn) ≤ MAX_DOC byte; METHODS.md ≤ MAX_METHODS (dài hơn → chuyển lịch sử sang docs/archive/).
//   2) Mọi .md dưới docs/ (kể cả archive/ và thư mục con) phải có dòng `[tên](đường-dẫn-tương-đối)` trong docs/INDEX.md; INDEX không được trỏ tới file không tồn tại.
//   3) Doc hiện hành (không phải con trỏ < 400 byte) phải có dòng `> TL;DR:` ở đầu (500 byte đầu sau tiêu đề → trong 1500 byte đầu).
// KHÔNG nới ngân sách để qua test: tách/chuyển phần cũ sang docs/archive/ (giữ nguyên văn) rồi để lại 1 dòng con trỏ.
import fs from 'fs';
import path from 'path';
export const MAX_DOC = 45 * 1000, MAX_METHODS = 20 * 1000, STUB_BYTES = 400;
const DOCS = 'docs';
const walk = d => fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith('.md') ? [path.join(d, e.name)] : []);
const files = walk(DOCS).map(f => path.relative(DOCS, f).split(path.sep).join('/')).sort();
const errs = [];
const indexPath = path.join(DOCS, 'INDEX.md');
if (!fs.existsSync(indexPath)) { console.error('✗ thiếu docs/INDEX.md'); process.exit(1); }
const index = fs.readFileSync(indexPath, 'utf8');
const linked = new Set([...index.matchAll(/\]\(([^)#\s]+\.md)\)/g)].map(m => m[1]));
for (const f of files) {
  const abs = path.join(DOCS, f), size = fs.statSync(abs).size, archived = f.startsWith('archive/') || /-ARCHIVE\.md$/.test(f);
  if (!linked.has(f)) errs.push(`${f}: thiếu trong docs/INDEX.md (thêm 1 dòng "- [tên](${f}) — là gì; đọc khi nào")`);
  if (archived) continue;
  const cap = f === 'METHODS.md' ? MAX_METHODS : MAX_DOC;
  if (size > cap) errs.push(`${f}: ${size} byte > ngân sách ${cap} – chuyển phần lịch sử/nhật ký cũ sang docs/archive/ (nguyên văn) và để lại con trỏ 1 dòng`);
  if (size >= STUB_BYTES && !/^> TL;DR:/m.test(fs.readFileSync(abs, 'utf8').slice(0, 1500))) errs.push(`${f}: thiếu khối "> TL;DR:" ở đầu file`);
}
for (const l of linked) if (!fs.existsSync(path.join(DOCS, l))) errs.push(`INDEX.md trỏ tới file không tồn tại: ${l}`);
if (errs.length) { console.error('✗ docs-budget:\n  ' + errs.join('\n  ')); process.exit(1); }
console.log(`✓ docs-budget: ${files.length} doc, đều có trong INDEX; hiện hành ≤ ${MAX_DOC / 1000} KB (METHODS ≤ ${MAX_METHODS / 1000} KB), có TL;DR`);
