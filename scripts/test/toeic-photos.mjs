// Ảnh TOEIC Part 1: mọi câu có ảnh → tệp có thật; nếu khai w/h thì đúng cỡ thật (giữ chỗ, CLS 0);
// avif: 1 → có .avif cùng tên, nhỏ hơn .jpg, và câu phải khai w/h. Ghi công ảnh ở web/img/toeic/CREDITS.md.
import fs from 'node:fs';
import vm from 'node:vm';

const errs = [];
const jpgSize = f => { // đọc SOF của JPEG → [w, h]
  const b = fs.readFileSync(f); let i = 2;
  while (i < b.length) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + len; }
  return [0, 0];
};
const credits = fs.readFileSync('web/img/toeic/CREDITS.md', 'utf8');
let n = 0, avif = 0, jpgB = 0, avifB = 0;
{
  // một ngữ cảnh chung theo thứ tự listening1..N: listening2–7 dùng g.TQL do listening1 dựng
  const g = {}; g.self = g; vm.createContext(g);
  for (const f of fs.readdirSync('web/js/toeic').filter(f => /^listening\d+\.js$/.test(f)).sort((a, b) => parseInt(a.slice(9)) - parseInt(b.slice(9)))) vm.runInContext(fs.readFileSync('web/js/toeic/' + f, 'utf8'), g);
  for (const p of (g.TOEIC.listening || []).filter(p => p.part === 1)) for (const gr of p.groups) for (const it of gr.items || []) {
    if (!it.img) continue; n++;
    const file = 'web/' + it.img, id = `${p.id} câu ${it.n}`;
    if (!fs.existsSync(file)) { errs.push(`${id}: thiếu ${file}`); continue; }
    if (!credits.includes(it.img.split('/').pop())) errs.push(`${id}: ${it.img} chưa có dòng ghi công trong CREDITS.md`);
    const [w, h] = jpgSize(file);
    if (it.w || it.h) { if (it.w !== w || it.h !== h) errs.push(`${id}: w/h ${it.w}x${it.h} ≠ cỡ thật ${w}x${h}`); }
    if (it.avif) {
      avif++; const a = file.replace(/\.jpe?g$/i, '.avif');
      if (!it.w || !it.h) errs.push(`${id}: avif cần khai w/h (CLS 0)`);
      if (!fs.existsSync(a)) errs.push(`${id}: thiếu ${a}`);
      else { const sa = fs.statSync(a).size, sj = fs.statSync(file).size; jpgB += sj; avifB += sa; if (sa >= sj) errs.push(`${id}: ${a} (${sa} B) không nhỏ hơn .jpg (${sj} B)`); if (fs.readFileSync(a).subarray(4, 12).toString() !== 'ftypavif') errs.push(`${id}: ${a} không phải AVIF`); }
    }
  }
}
if (!n) errs.push('không đọc được câu Part 1 nào');
if (errs.length) { console.error('✗ toeic-photos:\n  - ' + errs.join('\n  - ')); process.exit(1); }
console.log(`✓ toeic-photos: ${n} ảnh Part 1, ${avif} có AVIF (${Math.round(jpgB / 1024)} KB jpg → ${Math.round(avifB / 1024)} KB avif)`);
