// Cổng "200/200": mọi từ thí điểm (n=200) đạt ngưỡng index ở en + vi; dữ liệu bổ sung content/dict/add/* hợp lệ (docs/SEO-DICT-PAGES.md §12).
import fs from 'node:fs';
import { build } from '../dict/build.mjs';
const r = build({ n: 200, pool: 200, write: false }); let bad = 0;
const fail = m => { console.error('✗ ' + m); bad++; };
for (const l of ['en', 'vi']) for (const d of r.pages[l]) if (!d.quality.index) fail(`${l}/${d.word}: điểm ${d.quality.score}, ${d.quality.words} chữ – dưới ngưỡng`);
const J = f => JSON.parse(fs.readFileSync(f, 'utf8')), addAll = n => Object.assign({}, ...fs.readdirSync('content/dict/add').filter(f => f === `${n}.json` || (f.startsWith(`${n}-b`) && f.endsWith('.json'))).sort().map(f => J(`content/dict/add/${f}`))), W = addAll('words'), VI = /[ăâđêôơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳỵỷỹ]/i;
for (const l of ['en', 'vi']) for (const [w, x] of Object.entries(addAll(l))) {
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

// Lô mở rộng (§13): mọi từ trong pool-ext.json phải có đủ words/en/vi và đạt ngưỡng index ở cả 15 ngôn ngữ (cổng seo-pages kiểm trang thật; ở đây kiểm dữ liệu).
const EXT = J('content/dict/add/pool-ext.json').words, E = addAll('en'), V = addAll('vi'); let miss = 0;
for (const w of EXT) { const k = w.toLowerCase(); for (const [n, o] of [['words', W], ['en', E], ['vi', V]]) if (!o[k]) { console.error(`✗ pool-ext ${k}: thiếu ${n}`); miss++; } }
if (new Set(EXT.map(w => w.toLowerCase())).size !== EXT.length) { console.error('✗ pool-ext: từ trùng'); miss++; }
if (miss) process.exit(1);
console.log(`✓ pool-ext: ${EXT.length} từ mở rộng đủ words/en/vi`);
