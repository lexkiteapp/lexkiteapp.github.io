// Dựng web/js/grammar/bank-gen.js từ content/factory/grammar-quiz.json (câu trắc nghiệm do xưởng nội dung sinh – scripts/factory/grammar.mjs).
// Dùng: node scripts/factory/build-grammar-bank.mjs [--check]  (--check: đỏ khi file sinh ra cũ hơn nguồn – chạy trong npm test)
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
export const DATA = 'content/factory/grammar-quiz.json', OUT = 'web/js/grammar/bank-gen.js', EXT = 'extension/app/js/grammar/bank-gen.js'; // add-on = bản sao nguyên khối web/ (ext-sync) → ghi cả hai (lô thử 02/11 đỏ ext-sync)

/** nguồn → nội dung file trình duyệt (bỏ qa; mỗi bài một dòng, bài sắp theo id) */
export function render(items) {
  const lines = Object.keys(items || {}).sort().filter(id => (items[id] || []).length)
    .map(id => `${JSON.stringify(id)}: ${JSON.stringify(items[id].map(({ q, options, answer, explain }) => ({ q, options, answer, explain })))},`);
  return `/* FILE SINH TỰ ĐỘNG – scripts/factory/build-grammar-bank.mjs từ ${DATA} (xưởng nội dung, docs/CONTENT-FACTORY.md). Đừng sửa tay. Nối thêm câu trắc nghiệm vào bài ngữ pháp có sẵn. */\n(function (g) {\nconst Q = {\n${lines.join('\n')}\n};\n(g.GRAMMAR || []).forEach(l => { if (Q[l.id]) l.quiz = (l.quiz || []).concat(Q[l.id]); });\n})(typeof self !== 'undefined' ? self : this);\n`;
}
export function build({ root = '', check = false } = {}) {
  const src = fs.existsSync(root + DATA) ? JSON.parse(fs.readFileSync(root + DATA, 'utf8')).items || {} : {};
  const out = render(src), n = Object.values(src).reduce((a, l) => a + l.length, 0);
  if (check) {
    for (const f of [OUT, EXT]) { const cur = fs.existsSync(root + f) ? fs.readFileSync(root + f, 'utf8') : ''; if (cur !== out) { console.error(`✗ ${f} cũ – chạy node scripts/factory/build-grammar-bank.mjs`); return false; } }
    console.log(`✓ grammar bank-gen: ${n} câu khớp ${DATA}`); return true;
  }
  for (const f of [OUT, EXT]) { fs.mkdirSync((root + f).replace(/\/[^/]+$/, ''), { recursive: true }); fs.writeFileSync(root + f, out); } console.log(`grammar bank-gen: ${n} câu → ${OUT} (${out.length} B)`); return true;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(build({ check: process.argv.includes('--check') }) ? 0 : 1);
