// 🧱 Lưới nhiều cột của màn Stitch không được vỡ thành 1 cột trên điện thoại: style.css ép `.grid { grid-template-columns: 1fr !important }` (≤ 760px), nên
// MỌI lớp grid-cols-N dùng trong web/css/st-*.css phải có luật bật lại `.st .grid.grid-cols-N{…!important}` cùng file (build-stitch-css.mjs sinh 2–7 sẵn, N ≥ 8 theo lớp dùng).
// Lỗi gốc: bàn cờ 8×8 (grid-cols-8) hiện thành 1 cột dọc; ô chữ 9 cột, irregular 10, welcome-desk 12 cũng vậy.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const style = fs.readFileSync(new URL('../../web/css/style.css', import.meta.url), 'utf8');
assert.match(style, /\.g2, \.g3, \.g4, \.grid \{ grid-template-columns: minmax\(0, 1fr\) !important; \}/, 'luật ép 1 cột của app cũ còn đó – nếu đã bỏ thì test này không còn cần');
const dir = new URL('../../web/css/', import.meta.url), bad = [];
for (const f of fs.readdirSync(dir).filter(x => /^st-.*\.css$/.test(x) && !/^st-w-/.test(x))) { // st-w-*: trang web tĩnh, không nạp style.css của app
  const css = fs.readFileSync(new URL(f, dir), 'utf8');
  if (/^\/\*[^\n]*tiền tố chung/m.test(css.split('\n')[1] || '')) continue; // dùng tiền tố chung của file khác
  const used = [...new Set([...css.matchAll(/\.grid-cols-(\d+)\b/g)].map(m => +m[1]))].filter(n => n >= 2);
  for (const n of used) if (!new RegExp(`\\.st \\.grid\\.grid-cols-${n}\\{grid-template-columns:repeat\\(${n},minmax\\(0,1fr\\)\\)!important\\}`).test(css)) bad.push(`${f}: grid-cols-${n}`);
}
assert.deepEqual(bad, [], 'lớp grid-cols-N thiếu luật bật lại trên điện thoại: ' + bad.join(', '));
// bàn cờ 8×8: lưới 8 cột + 8 hàng, và khung sinh ra không còn class ép tay
const chess = fs.readFileSync(new URL('st-v2-game-chess.css', dir), 'utf8'), frame = fs.readFileSync(new URL('../../web/cpack/game/game-chess.js', import.meta.url), 'utf8');
assert.ok(/\.st \.grid\.grid-cols-8\{[^}]*!important\}/.test(chess) && /\.grid-rows-8\{grid-template-rows:repeat\(8/.test(chess), 'bàn cờ: 8 cột (bật lại trên điện thoại) + 8 hàng');
assert.ok((frame.match(/grid-cols-8/g) || []).length >= 2 && /grid grid-cols-8 grid-rows-8/.test(frame), 'khung cờ dùng grid-cols-8 grid-rows-8 (nhãn cột + bàn cờ)');
console.log('stitch-grid-cols OK');
