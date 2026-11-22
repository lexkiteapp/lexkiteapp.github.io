// Add-on: câu Pháp/TBN gõ không dấu (toàn ASCII) phải được nhận là 'auto' (Google tự nhận nguồn) thay vì bị dịch như tiếng Anh – french-course.md W6.
// Lấy đúng đoạn FW/tlGuess/srcLang trong extension/content.js (một nguồn), chạy trên câu mẫu. 0 mạng, không trình duyệt.
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../../extension/content.js', import.meta.url), 'utf8');
const pick = re => { const m = src.match(re); if (!m) { console.error('✗ không thấy đoạn ' + re); process.exit(1); } return m[0]; };
const code = [pick(/  const FW = \{[\s\S]*?\};\n/), pick(/  const tlGuess = [^\n]+\n/), pick(/  const srcLang = [^\n]+\n/)].join('');
const { tlGuess, srcLang } = new Function('nfc', code + 'return { tlGuess, srcLang };')(s => s.normalize('NFC'));
let n = 0, bad = 0; const ok = (c, m) => { n++; if (!c) { bad++; console.error('✗ ' + m); } };
for (const [t, want] of [['je suis dans la maison avec mon ami', 'fr'], ['nous sommes en retard pour le train', 'fr'], ["c'est une bonne idee mais je ne sais pas", 'fr'],
  ['el perro de mi amigo es muy grande', 'es'], ['yo estoy en la casa con mis padres', 'es'],
  ['The quick brown fox jumps over the lazy dog', ''], ['I am going to the station with my friend', ''], ['Some jobs were not successful', ''], ['hello', '']]) {
  ok(tlGuess(t) === want, `tlGuess("${t}") = "${tlGuess(t)}" (cần "${want}")`);
  ok(srcLang(t) === (want ? 'auto' : 'en'), `srcLang("${t}") = ${srcLang(t)}`);
}
ok(srcLang('Le café est délicieux') === 'auto', 'câu có dấu vẫn auto như cũ');
if (bad) { console.error(`✗ ext-tl-guess: ${bad}/${n}`); process.exit(1); }
console.log(`✓ ext-tl-guess: ${n} ca (câu Pháp/TBN không dấu → auto; tiếng Anh giữ en)`);
