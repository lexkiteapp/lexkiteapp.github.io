#!/usr/bin/env node
// Câu Tatoeba CHỈ của người bản ngữ tiếng Anh (lớp L2 – pilot 31/10 snail#n "We were late going to look for snails." của LeeSooHa, eng cấp 4 "Malaysian English"):
// qua trắc nghiệm nghĩa 3/3 vì ĐÚNG nghĩa – lỗi là câu gượng, giám khảo nghĩa không bắt được → lọc theo NGUỒN: chủ câu tự khai eng cấp 5 (bản ngữ) trong user_languages.
// Soát 45 mục đạt pilot 31/10: 32/90 câu ví dụ của người không bản ngữ / không chủ ("Penguins are birds, you didn't know?", "Rhinoceros is not a dinosaur.").
//   node scripts/lexicon/expand/tatoeba-native.mjs --sentences eng_sentences_detailed.tsv --langs user_languages.csv --out tatoeba.tsv
// Ra cùng định dạng examples.py đọc (id \t eng \t câu \t chủ …).
import fs from 'fs';
import readline from 'readline';
/** user_languages.csv (lang \t cấp \t username \t chi tiết) → tập username tự khai bản ngữ tiếng Anh (cấp 5) */
export const nativeOwners = text => new Set(String(text).split('\n').map(l => l.split('\t')).filter(p => p[0] === 'eng' && p[1] === '5' && p[2] && p[2] !== '\\N').map(p => p[2]));
/** dòng eng_sentences_detailed (id \t lang \t câu \t chủ \t …) giữ khi chủ là người bản ngữ; câu không chủ (\N) = bỏ */
export const nativeLine = (line, nat) => { const p = line.split('\t'); return p.length > 3 && nat.has(p[3]); };
if (process.argv[1] && process.argv[1].endsWith('tatoeba-native.mjs')) {
  const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : ''; };
  const nat = nativeOwners(fs.readFileSync(arg('--langs'), 'utf8'));
  if (nat.size < 1000) { console.error(`✗ tatoeba-native: chỉ ${nat.size} người bản ngữ – tệp user_languages hỏng`); process.exit(1); }
  const out = fs.createWriteStream(arg('--out')); let n = 0, k = 0;
  for await (const line of readline.createInterface({ input: fs.createReadStream(arg('--sentences'), 'utf8'), crlfDelay: Infinity })) { n++; if (nativeLine(line, nat)) { k++; out.write(line + '\n'); } }
  out.end(); console.log(`✓ tatoeba-native: ${k}/${n} câu của ${nat.size} người bản ngữ`);
}
