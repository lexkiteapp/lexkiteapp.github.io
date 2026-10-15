// Danh sách từ học thuật cho add-on (gạch chân B2–C2 trên mọi trang): extension/academic.json = { "word": "C1", … }
// Nguồn: AWL + NAWL (mọi từ) và các từ cấp B2/C1/C2 trong kho Lexkite. Chỉ từ đơn ≥ 4 chữ cái. Chạy trong build-extension.sh.
import fs from 'fs';
const R = new URL('../', import.meta.url), rd = p => fs.readFileSync(new URL(p, R), 'utf8');
globalThis.t = s => s;
const g = {};
new Function('self', rd('web/js/data.js'))(g);
for (const f of fs.readdirSync(new URL('web/js/lib/', R))) if (/\.js$/.test(f) && !/^notes/.test(f)) { try { new Function('self', rd('web/js/lib/' + f))(g); } catch (e) { /* bỏ qua */ } }
const out = {}, rank = { B2: 1, C1: 2, C2: 3 };
for (const tp of g.IELTS_DATA.TOPICS) for (const w of tp.words) {
  const k = String(w.word || '').toLowerCase().trim();
  if (!/^[a-z]{4,}$/.test(k)) continue;
  const academic = /^(awl|nawl)/.test(tp.id), lv = rank[w.level] ? w.level : academic ? 'B2' : '';
  if (!lv) continue;
  if (!out[k] || rank[lv] > rank[out[k]]) out[k] = lv;
}
fs.writeFileSync(new URL('extension/academic.json', R), JSON.stringify(out));
console.log(`✓ academic.json: ${Object.keys(out).length} từ học thuật B2–C2`);
