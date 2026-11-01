// Hậu tố khóa giọng từ đơn (audio/w …|s3) trong app + add-on phải trùng scripts/word-audio-strong.mjs (WAV); từ dạng mạnh phải có trong kho từ.
import fs from 'node:fs'; import { WAV, STRONG } from '../word-audio-strong.mjs'; import { loadAllPlus } from '../lexicon/lib.mjs';
let bad = 0;
for (const f of ['web/js/ui.js', 'extension/app/js/ui.js', 'extension/newtab.js']) { const s = fs.readFileSync(f, 'utf8'); if (!s.includes(`const WAV = '${WAV}'`) || /\|s2'/.test(s)) { bad++; console.log(`✗ ${f}: hậu tố khóa audio/w khác scripts/word-audio-strong.mjs (WAV = '${WAV}')`); } }
const lex = new Set((await loadAllPlus()).map(e => e.row[0].trim()));
for (const [w, p] of Object.entries(STRONG)) if (!lex.has(w) || p.length !== 2 || !p.every(x => /ˈ/.test(x))) { bad++; console.log(`✗ ${w}: không có trong kho từ hoặc thiếu phiên âm Anh/Mỹ có trọng âm`); }
if (bad) process.exit(1);
console.log(`✓ word-audio-s2: app + add-on dùng khóa ${WAV} · ${Object.keys(STRONG).length} từ dạng mạnh có trong kho từ`);
