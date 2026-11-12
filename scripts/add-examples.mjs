// Chèn câu ví dụ TỰ BIÊN SOẠN vào kho từ (ô ví dụ đang trống) và kiểm tra trước khi ghi.
//   node scripts/add-examples.mjs <file.txt> [web/js/lib/ngsl.js | content/wordlists/<id>.edit.json]   – mỗi dòng: từ|câu ví dụ
// Kiểm: câu chứa đúng từ (hoặc dạng chia/biến thể bất quy tắc), 4–18 từ, viết hoa đầu câu, kết thúc . ! ?, không lẫn tiếng Việt.
import fs from 'node:fs';
const [src, target = 'web/js/lib/ngsl.js'] = process.argv.slice(2);
import { has } from './lib/irregular.mjs';
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
const q = s => "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "'";
const lines = fs.readFileSync(src, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);
const want = new Map(), bad = [];
for (const l of lines) { const i = l.indexOf('|'); const w = l.slice(0, i).trim(), ex = l.slice(i + 1).trim(); const n = ex.split(/\s+/).length;
  const why = !has(w, ex) ? 'không chứa từ' : n < 4 || n > 18 ? `${n} từ` : !/^[A-Z"'‘“0-9]/.test(ex) ? 'không viết hoa đầu câu' : !/[.!?]["”’]?$/.test(ex) ? 'thiếu dấu kết câu' : VI.test(ex) ? 'lẫn tiếng Việt' : /\s{2}|\s[,.!?]/.test(ex) ? 'khoảng trắng' : '';
  if (why) bad.push(`${w}: ${why} – ${ex}`); else want.set(w, ex); }
const ROW = /^(\s*)(\['.*\])(,?\s*)$/; let put = 0;
if (target.endsWith('.edit.json')) { // kho sinh tự động (nawl/bsl): ghi vào file sửa tay, rồi chạy gen-wordlist để xuất lại
  const ed = JSON.parse(fs.readFileSync(target, 'utf8'));
  for (const [w, ex] of want) { (ed[w] ||= {}).ex = ex; put++; } want.clear();
  fs.writeFileSync(target, JSON.stringify(ed, null, 1) + '\n');
} else {
const out = fs.readFileSync(target, 'utf8').split('\n').map(line => { const m = line.match(ROW); if (!m) return line; let r; try { r = new Function('return ' + m[2])(); } catch (e) { return line; }
  if (!Array.isArray(r) || r[5] || !want.has(r[0])) return line; r[5] = want.get(r[0]); want.delete(r[0]); put++; return m[1] + '[' + r.map(q).join(', ') + ']' + m[3]; }).join('\n');
fs.writeFileSync(target, out);
}
console.log(`✓ chèn ${put} ví dụ vào ${target}` + (want.size ? ` · không tìm thấy ô trống cho: ${[...want.keys()].join(', ')}` : ''));
if (bad.length) { console.log('✗ bỏ qua ' + bad.length + ':\n  ' + bad.join('\n  ')); process.exitCode = 1; }
