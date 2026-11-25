// Ghi gói phát âm W3 cho ngôn ngữ đích có `out` trong bảng TLX (px-lib.mjs) – ja: web/packs/tl/ja/px.js + px-<15 ngôn ngữ>.js (tải lười, ngoài cpack;
// es/fr vẫn đi qua drill-pack.mjs → web/cpack). Dùng: node scripts/target/px-pack.mjs ja [--check]
import fs from 'node:fs';
import { buildPx, TLX } from './px-lib.mjs';
const tl = process.argv.slice(2).find(a => /^[a-z]{2}$/.test(a)), check = process.argv.includes('--check'), T = TLX[tl];
if (!T || !T.out) { console.error(`✗ tl "${tl}" không có out trong TLX (px-lib.mjs)`); process.exit(2); }
const { files, topics } = buildPx(tl);
const bad = Object.entries(files).filter(([f, s]) => !fs.existsSync(T.out + f) || fs.readFileSync(T.out + f, 'utf8') !== s).map(([f]) => f);
if (check) { if (bad.length) { console.error(`✗ ${T.out} lệch nguồn (${bad.join(', ')}) – chạy: node scripts/target/px-pack.mjs ${tl}`); process.exit(1); } console.log(`✓ ${T.out}px*: ${topics.length} chủ đề khớp nguồn`); }
else { fs.mkdirSync(T.out, { recursive: true }); for (const [f, s] of Object.entries(files)) fs.writeFileSync(T.out + f, s); console.log(`✓ ${topics.length} chủ đề → ${T.out}px.js + px-<${Object.keys(files).length - 1} ngôn ngữ>.js`); }
