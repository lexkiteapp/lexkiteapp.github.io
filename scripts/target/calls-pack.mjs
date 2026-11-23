// Gói cuộc gọi AI cho ngôn ngữ đích có `out` (ja) → web/packs/tl/<tl>/cl.js (ngoài cpack – cpack hết ngân sách; es/fr vẫn ở web/cpack qua path-lib.mjs).
// Cùng dạng với path-lib (CALLS.concat, bỏ kind/tr, gắn tl) để js/call.js dùng chung. Dùng: node scripts/target/calls-pack.mjs ja [--check]
import fs from 'node:fs';
import { readJSON } from './lib.mjs';
const tl = process.argv.slice(2).find(a => /^[a-z]{2}$/.test(a)), check = process.argv.includes('--check'), D = `content/target/${tl}/calls/`, OUT = `web/packs/tl/${tl}/`;
if (!tl || !fs.existsSync(D)) { console.error('Dùng: node scripts/target/calls-pack.mjs <tl> [--check]'); process.exit(2); }
const calls = fs.readdirSync(D).filter(f => /^calls-\d+\.json$/.test(f)).sort().flatMap(f => readJSON(D + f));
const text = `self.CALLS=(self.CALLS||[]).concat(${JSON.stringify(calls.map(({ kind, tr, ...c }) => ({ ...c, tl })))});\n`;
if (check) { if (!fs.existsSync(OUT + 'cl.js') || fs.readFileSync(OUT + 'cl.js', 'utf8') !== text) { console.error(`✗ ${OUT}cl.js lệch nguồn – chạy: node scripts/target/calls-pack.mjs ${tl}`); process.exit(1); } console.log(`✓ ${OUT}cl.js khớp (${calls.length} cuộc gọi)`); }
else { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(OUT + 'cl.js', text); console.log(`✓ ${calls.length} cuộc gọi → ${OUT}cl.js (${Math.round(text.length / 1024)} KB)`); }
