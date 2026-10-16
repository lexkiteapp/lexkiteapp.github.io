// Dịch SẴN nội dung bài học (tiếng Việt → <lang>) cho contentTranslate: web/i18n/content/<lang>.json { "câu gốc": "bản dịch" }
// Nguồn câu: content/i18n/strings.json (scripts/harvest-content.mjs). Chỉ dịch câu mới; bỏ câu không còn dùng (giữ file nhẹ).
// App nạp file này từ CDN trước khi dịch máy lúc chạy → hiện ngay đúng ngôn ngữ, không phụ thuộc Google ở máy người dùng.
// Dùng: node scripts/gen-content-i18n.mjs <lang>   (CONTENT_MIN = số phút tối đa, mặc định 10)
import fs from 'fs';
const lang = process.argv[2]; if (!lang) { console.error('cần mã ngôn ngữ'); process.exit(1); }
const deadline = Date.now() + (+process.env.CONTENT_MIN || 10) * 60000;
const src = JSON.parse(fs.readFileSync('content/i18n/strings.json', 'utf8'));
const OUT = `web/i18n/content/${lang}.json`;
let old = {}; try { old = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* lần đầu */ }
const out = {}; for (const s of src) if (old[s]) out[s] = old[s];
const need = src.filter(s => !out[s]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Giữ nguyên {biến}, thẻ HTML, emoji đầu dòng: kiểm số lượng {…} và <…> khớp, sai thì bỏ (app tự dịch lúc chạy)
const sig = s => (s.match(/\{[^}]+\}|<[^>]+>/g) || []).length;
async function translate(lines) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=${lang}&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 4; k++) {
    try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } if (r.status === 429) await sleep(8000 * (k + 1)); } catch (e) { await sleep(2000); }
  }
  return null;
}
let done = 0, bad = 0;
for (let i = 0; i < need.length && Date.now() < deadline;) {
  const batch = []; let len = 0;
  while (i < need.length && len + need[i].length < 1800) { batch.push(need[i]); len += need[i].length + 1; i++; }
  if (!batch.length) batch.push(need[i++]);
  const tr = await translate(batch);
  if (!tr || tr.length !== batch.length) { bad += batch.length; await sleep(1500); continue; }
  batch.forEach((s, k) => { const t = (tr[k] || '').trim(); if (t && t !== s && sig(t) === sig(s)) { out[s] = t; done++; } else bad++; });
  await sleep(400);
}
fs.mkdirSync('web/i18n/content', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
console.log(`✓ content ${lang}: ${Object.keys(out).length}/${src.length} câu (mới ${done}, bỏ qua ${bad}, còn ${src.length - Object.keys(out).length})`);
