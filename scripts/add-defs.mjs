// Ghi định nghĩa tiếng Anh TỰ BIÊN SOẠN (và câu ví dụ nếu có) vào content/wordlists/<id>.edit.json, có kiểm trước khi ghi.
//   node scripts/add-defs.mjs <file.txt> <nawl|bsl>   – mỗi dòng: từ|định nghĩa|câu ví dụ (ô ví dụ để trống = giữ ví dụ hiện có)
// Sau đó chạy: node scripts/gen-wordlist.mjs <id> --max 0 để xuất lại web/js/lib/<id>.js
import fs from 'node:fs';
import { has } from './lib/irregular.mjs';
const [src, id] = process.argv.slice(2), file = `content/wordlists/${id}.edit.json`;
const VI = /[ăđơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i, ed = JSON.parse(fs.readFileSync(file, 'utf8')), bad = []; let put = 0;
for (const l of fs.readFileSync(src, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)) {
  const [w, def = '', ex = ''] = l.split('|').map(s => s.trim()), n = def.split(/\s+/).length;
  const why = !def ? 'thiếu định nghĩa' : VI.test(def) || VI.test(ex) ? 'lẫn tiếng Việt' : n < 2 || n > 28 ? `định nghĩa ${n} từ` : /[{}[\]]|&\w+;/.test(def) ? 'ký tự rác' :
    ex && (!has(w, ex) || !/^[A-Z"'‘“0-9]/.test(ex) || !/[.!?]["”’]?$/.test(ex) || ex.split(/\s+/).length < 4) ? 'ví dụ không đạt' : '';
  if (why) { bad.push(`${w}: ${why}`); continue; }
  const e = ed[w] ||= {}; e.def = def; if (ex) e.ex = ex; put++;
}
fs.writeFileSync(file, JSON.stringify(ed, null, 1) + '\n');
console.log(`✓ ${put} mục → ${file}` + (bad.length ? `\n✗ bỏ qua ${bad.length}: ${bad.join('; ')}` : ''));
if (bad.length) process.exitCode = 1;
