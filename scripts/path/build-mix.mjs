// Sinh web/js/path-mix.js: chỉ mục gọn bài ngữ pháp + phát âm theo CEFR cho lộ trình theo ngày (path-day.js, gói lười 'pathx').
// Không nạp cả gói grammar/pron vào lộ trình – chỉ id, trình độ, emoji, tên (vi) và tên trung tính (en / IPA).
// Chạy: node scripts/path/build-mix.mjs        (ghi file)
//       node scripts/path/build-mix.mjs --check (đỏ nếu file cũ so với dữ liệu bài học – chạy trong npm test)
import fs from 'node:fs';
import vm from 'node:vm';
const WEB = new URL('../../web/js/', import.meta.url);
const OUT = new URL('path-mix.js', WEB);
const CE = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const g = {}; g.self = g; g.window = g; vm.createContext(g);
const run = f => vm.runInContext(fs.readFileSync(new URL(f, WEB), 'utf8'), g, { filename: f });
// cùng thứ tự với BUNDLES.grammar / BUNDLES.pron trong app.js
for (const f of ['tenses', 'verbs', 'sentences', 'foundation', 'academic', 'chapters', 'book2']) run('grammar/' + f + '.js');
for (const f of ['sounds', 'skills']) run('pron/' + f + '.js');
const byLv = a => a.map((x, i) => [x, i]).filter(([x]) => CE.includes(x.level)).sort((a, b) => CE.indexOf(a[0].level) - CE.indexOf(b[0].level) || a[1] - b[1]).map(([x]) => x);
const G = byLv(g.GRAMMAR || []).map(x => [x.id, x.level, x.emoji || '📐', x.title, x.en || x.title]);
const P = byLv(g.PRON || []).map(x => [x.id, x.level, x.emoji || '🗣️', x.title, x.ipa || x.id]);
const src = `/* FILE SINH TỰ ĐỘNG – scripts/path/build-mix.mjs. Đừng sửa tay. Chỉ mục bài ngữ pháp (g) + phát âm (p) theo CEFR cho lộ trình theo ngày.
 * Mỗi dòng: [id, CEFR, emoji, tên (vi), tên trung tính (en / IPA)] – sắp dễ → khó. */
self.PATH_MIX = ${JSON.stringify({ g: G, p: P })};
`;
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== src) { console.error('✗ web/js/path-mix.js cũ – chạy: node scripts/path/build-mix.mjs'); process.exit(1); }
  console.log(`✓ path-mix: ${G.length} bài ngữ pháp · ${P.length} bài phát âm (khớp dữ liệu)`);
} else { fs.writeFileSync(OUT, src); console.log(`path-mix.js: ${G.length} ngữ pháp · ${P.length} phát âm · ${src.length} B`); }
