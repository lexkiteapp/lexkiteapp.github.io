// Dựng bản sao bộ từ cho app (kiểm trước, lỗi → thoát 1):
//   content/target/<tl>/seed.json → web/js/target-<tl>-seed.json (30 từ soát tay, nút Cài đặt)
//   content/target/<tl>/core.json → web/js/target-<tl>-core.json (bộ lõi đã duyệt – Thư viện ngôn ngữ đích, web/js/target-lib.js)
// Chạy: node scripts/target/build.mjs [pt]   · --check: chỉ so khớp (scripts/test/target-lang.mjs, target-content.yml)
import fs from 'node:fs';
import { validate, seedPath, corePath, webSeedPath, webCorePath, webSeedText, readJSON, imgKeys } from './lib.mjs';

const tl = process.argv.slice(2).find(a => /^[a-z]{2}$/.test(a)) || 'pt', check = process.argv.includes('--check');
let bad = 0;
for (const [src, f, need] of [[seedPath(tl), webSeedPath(tl), true], [corePath(tl), webCorePath(tl), false]]) {
  if (!fs.existsSync(src)) { if (need) { console.error('✗ thiếu ' + src); bad++; } else if (fs.existsSync(f)) { console.error(`✗ ${f} còn mà ${src} đã mất`); bad++; } continue; }
  const deck = readJSON(src), err = validate(deck, { img: imgKeys() });
  if (err.length) { console.error('✗ ' + err.join('\n✗ ')); bad++; continue; }
  const out = webSeedText(deck), cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  if (check) { if (cur !== out) { console.error(`✗ ${f} lệch ${src} – chạy: node scripts/target/build.mjs ${tl}`); bad++; } else console.log(`✓ ${f.split('/').pop()} khớp (${deck.words.length} từ)`); }
  else { fs.writeFileSync(f, out); console.log(`✓ ${deck.words.length} từ → ${f}`); }
}
process.exit(bad ? 1 : 0);
