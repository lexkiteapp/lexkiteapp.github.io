// Danh sách từ dạng mạnh (khóa audio/w …|s2) trong app + add-on phải trùng scripts/word-audio-strong.mjs, và chỉ chứa từ có trong kho từ.
import fs from 'node:fs'; import { S2, STRONG } from '../word-audio-strong.mjs'; import { loadAllPlus } from '../lexicon/lib.mjs';
let bad = 0;
for (const f of ['web/js/ui.js', 'extension/app/js/ui.js', 'extension/newtab.js']) if (!fs.readFileSync(f, 'utf8').includes(`const S2 = '${S2}'`)) { bad++; console.log(`✗ ${f}: chuỗi S2 khác scripts/word-audio-strong.mjs`); }
const lex = new Set((await loadAllPlus()).map(e => e.row[0].trim()));
for (const [w, p] of Object.entries(STRONG)) if (!lex.has(w) || p.length !== 2 || !p.every(x => /ˈ/.test(x))) { bad++; console.log(`✗ ${w}: không có trong kho từ hoặc thiếu phiên âm Anh/Mỹ có trọng âm`); }
if (bad) process.exit(1);
console.log(`✓ word-audio-s2: ${Object.keys(STRONG).length} từ dạng mạnh khớp app + add-on`);
