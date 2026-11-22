// Dựng bản sao bộ từ mẫu cho app: content/target/<tl>/seed.json → web/js/target-<tl>-seed.json (kiểm trước, lỗi → thoát 1).
// Chạy: node scripts/target/build.mjs [pt]   · --check: chỉ so khớp (scripts/test/target-lang.mjs)
import fs from 'node:fs';
import { validate, seedPath, webSeedPath, webSeedText, readJSON, imgKeys, coreFiles } from './lib.mjs';

const tl = process.argv.slice(2).find(a => /^[a-z]{2}$/.test(a)) || 'pt', check = process.argv.includes('--check');
const deck = readJSON(seedPath(tl)), err = validate(deck, { img: imgKeys() });
// lô lõi (gen.mjs): mỗi tệp qua cổng + không trùng từ#loại với seed / lô khác
const seen = new Set(deck.words.map(w => w.word.toLowerCase() + '#' + w.pos));
for (const cf of coreFiles(tl)) { const d = readJSON(cf); err.push(...validate(d, { img: imgKeys() }).map(e => cf.split('/').pop() + ': ' + e)); for (const w of d.words) { const k = w.word.toLowerCase() + '#' + w.pos; if (seen.has(k)) err.push(`${cf.split('/').pop()}: trùng ${k}`); seen.add(k); } }
// es: IPA lô lõi theo MỘT quy ước (luật es-g2p.mjs; 452 mục duyệt tay khớp 100 %) – espeak chỉ kiểm chéo (qa.ipaEs)
if (tl === 'es') { const { ipa } = await import('./es-g2p.mjs'); for (const cf of coreFiles(tl)) for (const w of readJSON(cf).words) if (w.ipa !== ipa(w.word)) err.push(`${cf.split('/').pop()}: IPA ${w.word} /${w.ipa}/ ≠ quy ước /${ipa(w.word)}/ – chạy node scripts/target/es-g2p.mjs --apply ${cf.split('/').slice(-4).join('/')}`); }
if (err.length) { console.error('✗ ' + err.join('\n✗ ')); process.exit(1); }
const out = webSeedText(deck), f = webSeedPath(tl), cur = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
if (check) { if (cur !== out) { console.error(`✗ ${f} lệch seed.json – chạy: node scripts/target/build.mjs ${tl}`); process.exit(1); } console.log(`✓ target-${tl}-seed.json khớp (${deck.words.length} từ)`); }
else { fs.writeFileSync(f, out); console.log(`✓ ${deck.words.length} từ → ${f}`); }
