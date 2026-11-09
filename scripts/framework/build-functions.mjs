#!/usr/bin/env node
// 🗣️ Sổ mẫu câu theo chức năng (#/phrases, mục "Phrase book by function"): content/framework/functions.json → gói lười web/cpack/framework/functions.js
// (build-cpack.mjs đặt tên theo mã băm lúc dựng web; app.js gói 'pbook' nạp khi mở mục này). Bỏ `qa`; CHỈ giao mục đã qua 2 giám khảo (qa.j ≥ 2 điểm)
// hoặc mục không có dấu `qa.gen` (soạn tay). Mục chưa chấm đủ → chưa giao. Kèm content/i18n/en-src/functions.json (O5): name, note, avoid.why
// viết gốc tiếng Anh → CI dịch ra các ngôn ngữ (docs/I18N-PIPELINE.md §3), app tra web/i18n/content/<lang>.json, thiếu thì hiện tiếng Anh.
//   node scripts/framework/build-functions.mjs           kiểm bản sinh khớp nguồn (npm test / prepush)
//   node scripts/framework/build-functions.mjs --write   sinh lại
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SRC = 'content/framework/functions.json', OUT = 'web/cpack/framework/functions.js', EN = 'content/i18n/en-src/functions.json';
export const MIN_JUDGES = 2;
/** Mục được giao: đủ 2 điểm giám khảo, hoặc không mang dấu sinh tự động (qa.gen). Thuần. */
export const shipped = e => { const q = e.qa || {}; return Object.keys(q.j || {}).length >= MIN_JUDGES || !q.gen; };
/** Bỏ `qa` (nội bộ xưởng). Thuần. */
export const strip = ({ qa, ...rest }) => rest;
/** Chuỗi cần bản dịch L1 (name, note, avoid.why), nguyên văn tiếng Anh → chính nó là en gốc. Thuần. */
export const enKeys = items => Object.fromEntries(items.flatMap(e => [e.name, e.note, e.avoid && e.avoid.why]).filter(s => typeof s === 'string' && s.trim()).map(s => [s, s]));
const HEAD = '/* TỰ SINH bởi scripts/framework/build-functions.mjs từ content/framework/functions.json – KHÔNG sửa tay. Sổ mẫu câu theo chức năng (tải lười). */\n';
export function build(all) {
  const items = all.filter(shipped).map(strip);
  return { js: `${HEAD}self.PHRASEBOOK = ${JSON.stringify({ v: 1, items })};\n`, en: JSON.stringify(enKeys(items), null, 0).replace(/","/g, '",\n"') + '\n', items };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rd = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } };
  const all = JSON.parse(rd(SRC)).functions, { js, en, items } = build(all);
  if (process.argv.includes('--write')) {
    for (const [f, t] of [[OUT, js], [EN, en]]) { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), t); }
    console.log(`✓ ${OUT}: ${items.length}/${all.length} mục (${js.length} B)`);
  } else if (rd(OUT) !== js || rd(EN) !== en) { console.error(`✗ ${OUT} hoặc ${EN} cũ – chạy node scripts/framework/build-functions.mjs --write`); process.exit(1); }
  else console.log(`✓ functions: ${items.length}/${all.length} mục giao, khớp nguồn`);
}
