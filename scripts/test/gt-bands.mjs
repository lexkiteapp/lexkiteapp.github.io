/* Kiểm tra nhẹ (không jsdom): thư mẫu IELTS GT Band 7/6 trong web/cpack/write/gt-bands.js.
 * 24 đề × 2 band, 150–200 từ, 4 tiêu chí TA/CC/LR/GRA bằng tiếng Việt (mỗi nhận xét ≤ 60 từ), không trùng, gắn đúng vào bài mẫu band 8. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const sb = { MODELS: [] };
sb.self = sb;
vm.createContext(sb);
for (const f of ['web/js/write/gt-letters.js', 'web/cpack/write/gt-bands.js']) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), sb, { filename: f });

const fails = [];
const bad = (m) => fails.push(m);
const words = (s) => (s.match(/[A-Za-z0-9£][A-Za-z0-9£'’.\-]*/g) || []).length;
const KEYS = ['TA', 'CC', 'LR', 'GRA'];
const VI = /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i;

const bands = sb.GT_BANDS || [];
if (bands.length !== 24) bad(`cần 24 đề, có ${bands.length}`);
const seen = new Set();
const texts = new Set();
for (const b of bands) {
  if (seen.has(b.id)) bad(`trùng id ${b.id}`);
  seen.add(b.id);
  const m = sb.MODELS.find((x) => x.id === b.id);
  if (!m) { bad(`${b.id}: không có bài mẫu band 8 tương ứng`); continue; }
  if (m.band7 !== b.band7 || m.band6 !== b.band6) bad(`${b.id}: chưa gắn band7/band6 vào MODELS`);
  for (const k of ['band7', 'band6']) {
    const x = b[k];
    if (!x || typeof x.text !== 'string') { bad(`${b.id}.${k}: thiếu text`); continue; }
    const w = words(x.text);
    if (w < 150 || w > 200) bad(`${b.id}.${k}: ${w} từ (cần 150–200)`);
    if (x.words !== w) bad(`${b.id}.${k}: words=${x.words} lệch số đếm ${w}`);
    if (texts.has(x.text)) bad(`${b.id}.${k}: trùng nội dung`);
    texts.add(x.text);
    if (x.text === m.text) bad(`${b.id}.${k}: trùng bài band 8`);
    if (!x.notes) { bad(`${b.id}.${k}: thiếu notes`); continue; }
    const extra = Object.keys(x.notes).filter((n) => !KEYS.includes(n));
    if (extra.length) bad(`${b.id}.${k}: khóa lạ ${extra}`);
    for (const c of KEYS) {
      const n = x.notes[c];
      if (!n || typeof n !== 'string') { bad(`${b.id}.${k}.${c}: thiếu`); continue; }
      const nw = n.trim().split(/\s+/).length;
      if (nw > 60) bad(`${b.id}.${k}.${c}: ${nw} từ (> 60)`);
      if (nw < 8) bad(`${b.id}.${k}.${c}: quá ngắn`);
      if (!VI.test(n)) bad(`${b.id}.${k}.${c}: không phải tiếng Việt`);
      if (/(^|[^\p{L}])[\p{L}]*ho[áà]([^\p{L}]|$)/u.test(n)) bad(`${b.id}.${k}.${c}: dùng 'hóa' không 'hoá'`);
    }
    if (!/^(Hi|Dear) /.test(x.text)) bad(`${b.id}.${k}: thiếu lời chào`);  }
}
for (let i = 1; i <= 24; i++) if (!seen.has('gt-gt' + i)) bad(`thiếu gt-gt${i}`);

if (fails.length) { console.error('gt-bands: FAIL\n' + fails.join('\n')); process.exit(1); }
console.log(`gt-bands: OK (${bands.length} đề × 2 band = ${bands.length * 2} thư)`);
