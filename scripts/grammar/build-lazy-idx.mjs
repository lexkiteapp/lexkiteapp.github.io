#!/usr/bin/env node
// Ngữ pháp tải lười theo cấp: starter2.js (A1) và mastery.js (C2) mỗi file ~29 KB nén – không nạp khi mở màn Ngữ pháp.
// Gói 'grammar' chỉ mang mục lục gọn của các bài đó (id, unit, order, tên, cấp, emoji, tóm tắt) → danh sách, đếm, tìm bài vẫn đủ;
// bài mở ra thì grammar.js nạp gói grammarA1 / grammarC2 (BUNDLES trong app.js) rồi file nguồn thay bài rút gọn theo id, không trùng.
//   web/js/grammar/lazy-a1.js  ← starter2.js        web/js/grammar/lazy-c2.js  ← mastery.js
//   node scripts/grammar/build-lazy-idx.mjs           kiểm file sinh khớp nguồn (npm test)
//   node scripts/grammar/build-lazy-idx.mjs --write   sinh lại (prepush)
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..'), DIR = path.join(ROOT, 'web/js/grammar');
/** Gói lười: tệp mục lục sinh ra ← tệp nguồn; `lazy` trên bài rút gọn = tên gói trong BUNDLES (app.js). */
export const LAZY = [{ idx: 'lazy-a1.js', src: 'starter2.js', bundle: 'grammarA1' }, { idx: 'lazy-c2.js', src: 'mastery.js', bundle: 'grammarC2' }];
export const FIELDS = ['id', 'unit', 'order', 'title', 'en', 'level', 'emoji', 'summary'];
export const lessonsOf = file => { const g = {}; g.self = g; vm.createContext(g); vm.runInContext(fs.readFileSync(path.join(DIR, file), 'utf8'), g, { filename: file }); return g.GRAMMAR || []; };
export const stubsOf = l => l.map(x => Object.fromEntries(FIELDS.map(k => [k, x[k]])));
export const render = (L, ls) => `/* FILE SINH TỰ ĐỘNG – scripts/grammar/build-lazy-idx.mjs từ ${L.src}. Đừng sửa tay. Mục lục ${ls.length} bài (không có nội dung): grammar.js nạp gói ${L.bundle} khi mở bài rồi ${L.src} thay bài theo id. */
(function (g) {
const G = g.GRAMMAR = g.GRAMMAR || [];
for (const s of [
${stubsOf(ls).map(s => JSON.stringify(s)).join(',\n')}
]) if (!G.some(x => x.id === s.id)) G.push({ ...s, lazy: '${L.bundle}' });
})(typeof self !== 'undefined' ? self : this);
`;
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const write = process.argv.includes('--write'); let bad = 0;
  for (const L of LAZY) {
    const ls = lessonsOf(L.src), out = path.join(DIR, L.idx), want = render(L, ls), cur = fs.existsSync(out) ? fs.readFileSync(out, 'utf8') : '';
    if (cur === want) { console.log(`✓ ${L.idx}: ${ls.length} bài khớp ${L.src}`); continue; }
    if (write) { fs.writeFileSync(out, want); console.log(`${L.idx}: ${ls.length} bài · ${want.length} B`); } else { console.error(`✗ web/js/grammar/${L.idx} cũ so với ${L.src} – chạy: node scripts/grammar/build-lazy-idx.mjs --write`); bad = 1; }
  }
  process.exit(bad);
}
