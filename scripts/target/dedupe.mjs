// Gộp shard song song (target-content.yml): lemma#loại trùng giữa các lô core-NN (hoặc với seed) → giữ ở tệp số nhỏ nhất, bỏ ở tệp sau
// (ghi vào .report.json của tệp đó, why "trùng lemma giữa shard"). Giữ mẫu soát ≥ 5 % mỗi tệp. Chạy: node scripts/target/dedupe.mjs --tl es
import fs from 'node:fs';
import { readJSON, coreFiles, seedPath } from './lib.mjs';
const i = process.argv.indexOf('--tl'), TL = i > 0 ? process.argv[i + 1] : 'es';
const seen = new Set(readJSON(seedPath(TL)).words.map(w => w.word.toLowerCase() + '#' + w.pos)); let drop = 0;
for (const f of coreFiles(TL)) {
  const d = readJSON(f), out = [];
  d.words = d.words.filter(w => { const k = w.word.toLowerCase() + '#' + w.pos; if (seen.has(k)) { out.push({ form: w.word, word: w.word, why: ['trùng lemma giữa shard'] }); return false; } seen.add(k); return true; });
  if (!out.length) continue; drop += out.length;
  if (!d.words.length) { fs.unlinkSync(f); continue; } // shard chỉ còn mục trùng → bỏ tệp (report giữ lại cho tried)
  const need = Math.ceil(d.words.length * 0.05) - d.words.filter(w => w.qa && w.qa.spot).length;
  for (const w of d.words.filter(w => !(w.qa && w.qa.spot)).slice(0, Math.max(0, need))) (w.qa = w.qa || {}).spot = true;
  fs.writeFileSync(f, JSON.stringify(d, null, 1) + '\n');
  const rf = f.replace(/\.json$/, '.report.json');
  if (fs.existsSync(rf)) { const r = readJSON(rf); r.rejected = [...(r.rejected || []), ...out]; r.accepted = d.words.length; fs.writeFileSync(rf, JSON.stringify(r, null, 1) + '\n'); }
}
console.log(`dedupe ${TL}: bỏ ${drop} mục trùng giữa shard`);
