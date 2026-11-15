// Cổng "200/200": mọi từ thí điểm (n=200) đạt ngưỡng index ở en + vi; dữ liệu bổ sung content/dict/add/* hợp lệ (docs/SEO-DICT-PAGES.md §12).
import fs from 'node:fs';
import { build } from '../dict/build.mjs';
const r = build({ n: 200, pool: 200, write: false }); let bad = 0;
const fail = m => { console.error('✗ ' + m); bad++; };
for (const l of ['en', 'vi']) for (const d of r.pages[l]) if (!d.quality.index) fail(`${l}/${d.word}: điểm ${d.quality.score}, ${d.quality.words} chữ – dưới ngưỡng`);
const J = f => JSON.parse(fs.readFileSync(f, 'utf8')), W = J('content/dict/add/words.json'), VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
for (const l of ['en', 'vi']) for (const [w, x] of Object.entries(J(`content/dict/add/${l}.json`))) {
  if (w === '_note') continue;
  if (!W[w]) fail(`${l}/${w}: thiếu trong words.json`);
  if (!(x.mis || []).length || !(x.u || '').trim()) fail(`${l}/${w}: thiếu mis hoặc u`);
  for (const m of x.mis || []) if (!m.w || !m.r || !m.why || m.w === m.r) fail(`${l}/${w}: mis lỗi`);
  const txt = (x.u || '') + (x.mis || []).map(m => m.why).join(' ');
  if (l === 'en' && VI.test(txt)) fail(`en/${w}: lọt chữ Việt`);
  if (l === 'vi' && !VI.test(txt)) fail(`vi/${w}: không phải tiếng Việt`);
  const n = (x.u || '').split(/\s+/).length; if (n < 35 || n > 110) fail(`${l}/${w}: ghi chú ${n} chữ (35–110)`);
}
if (bad) { console.error(`✗ dict-add: ${bad} lỗi`); process.exit(1); }
console.log(`✓ dict-add: 200/200 từ đạt ngưỡng index ở en + vi; dữ liệu bổ sung hợp lệ`);
