// Dựng bản sao bộ từ mẫu cho app: content/target/<tl>/seed.json → web/js/target-<tl>-seed.json (kiểm trước, lỗi → thoát 1).
// Chạy: node scripts/target/build.mjs [pt]   · --check: chỉ so khớp (scripts/test/target-lang.mjs)
import fs from 'node:fs';
import { validate, seedPath, webSeedPath, webSeedText, readJSON, imgKeys } from './lib.mjs';

const tl = process.argv.slice(2).find(a => /^[a-z]{2}$/.test(a)) || 'pt', check = process.argv.includes('--check');
const deck = readJSON(seedPath(tl)), err = validate(deck, { img: imgKeys() });
if (err.length) { console.error('✗ ' + err.join('\n✗ ')); process.exit(1); }
const out = webSeedText(deck), f = webSeedPath(tl), cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
if (check) { if (cur !== out) { console.error(`✗ ${f} lệch seed.json – chạy: node scripts/target/build.mjs ${tl}`); process.exit(1); } console.log(`✓ target-${tl}-seed.json khớp (${deck.words.length} từ)`); }
else { fs.writeFileSync(f, out); console.log(`✓ ${deck.words.length} từ → ${f}`); }
