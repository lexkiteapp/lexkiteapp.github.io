#!/usr/bin/env node
// 🗣️ Sổ mẫu câu theo chức năng (#/phrases, mục "Phrase book by function"): content/framework/functions.json (+ functions.vi.json) → gói lười web/cpack/framework/functions.js
// (build-cpack.mjs đặt tên theo mã băm lúc dựng web; app.js gói 'pbook' nạp khi mở mục này). Bỏ `qa`; CHỈ giao mục đã qua 2 giám khảo (qa.j ≥ 2 điểm)
// hoặc mục không có dấu `qa.gen` (soạn tay). Mục chưa chấm đủ → chưa giao.
// Tiếng Việt (name, note, avoid.why) soạn tay ở functions.vi.json {id:{name,note,why}} → gói mang `vi` cho người học tiếng Việt. O5 (docs/I18N-PIPELINE.md §3):
// content/i18n/en-src/functions.json { "<chuỗi vi>": "<en>" } → CI dịch L1 khác TỪ en vào web/i18n/content/<lang>.json, app tra theo chuỗi vi; thiếu → hiện tiếng Anh.
//   node scripts/framework/build-functions.mjs           kiểm bản sinh khớp nguồn (npm test / prepush)
//   node scripts/framework/build-functions.mjs --write   sinh lại
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SRC = 'content/framework/functions.json', SRC_VI = 'content/framework/functions.vi.json', OUT = 'web/cpack/framework/functions.js', EN = 'content/i18n/en-src/functions.json';
export const MIN_JUDGES = 2;
/** Mục được giao: đủ 2 điểm giám khảo, hoặc không mang dấu sinh tự động (qa.gen). Thuần. */
export const shipped = e => { const q = e.qa || {}; return Object.keys(q.j || {}).length >= MIN_JUDGES || !q.gen; };
/** Bỏ `qa` (nội bộ xưởng). Thuần. */
export const strip = ({ qa, ...rest }) => rest;
/** Cặp (vi → en) của name, note, avoid.why. Ném lỗi nếu mục giao thiếu vi hoặc hai en khác nhau trùng một chuỗi vi. Thuần. */
export function enSrc(items) {
  const m = {};
  for (const e of items) {
    if (!e.vi || !e.vi.name || !e.vi.note || !e.vi.why) throw new Error(`${e.id}: thiếu tiếng Việt (name, note, why) trong ${SRC_VI}`);
    for (const [k, en] of [['name', e.name], ['note', e.note], ['why', e.avoid.why]]) { const vi = e.vi[k]; if (m[vi] && m[vi] !== en) throw new Error(`${e.id}: chuỗi Việt trùng cho hai câu Anh khác nhau: ${vi}`); m[vi] = en; }
  }
  return m;
}
const HEAD = '/* TỰ SINH bởi scripts/framework/build-functions.mjs từ content/framework/functions.json + functions.vi.json – KHÔNG sửa tay. Sổ mẫu câu theo chức năng (tải lười). */\n';
/** all = functions.json; vi = functions.vi.json. Thuần. */
export function build(all, vi = {}) {
  const items = all.filter(shipped).map(strip).map(e => (vi[e.id] ? { ...e, vi: vi[e.id] } : e));
  return { js: `${HEAD}self.PHRASEBOOK = ${JSON.stringify({ v: 1, items })};\n`, en: JSON.stringify(enSrc(items), null, 0).replace(/","/g, '",\n"') + '\n', items };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rd = f => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } };
  const all = JSON.parse(rd(SRC)).functions, { js, en, items } = build(all, JSON.parse(rd(SRC_VI) || '{}'));
  if (process.argv.includes('--write')) {
    for (const [f, t] of [[OUT, js], [EN, en]]) { fs.mkdirSync(path.dirname(path.join(ROOT, f)), { recursive: true }); fs.writeFileSync(path.join(ROOT, f), t); }
    console.log(`✓ ${OUT}: ${items.length}/${all.length} mục (${js.length} B)`);
  } else if (rd(OUT) !== js || rd(EN) !== en) { console.error(`✗ ${OUT} hoặc ${EN} cũ – chạy node scripts/framework/build-functions.mjs --write`); process.exit(1); }
  else console.log(`✓ functions: ${items.length}/${all.length} mục giao, khớp nguồn`);
}
