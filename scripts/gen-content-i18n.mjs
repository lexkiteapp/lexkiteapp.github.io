// Dịch SẴN nội dung bài học (tiếng Việt → <lang>) cho contentTranslate: web/i18n/content/<lang>.json { "câu gốc": "bản dịch" }
// Nguồn câu: content/i18n/strings.json (scripts/harvest-content.mjs). Chỉ dịch câu mới; bỏ câu không còn dùng (giữ file nhẹ).
// App nạp file này từ CDN trước khi dịch máy lúc chạy → hiện ngay đúng ngôn ngữ, không phụ thuộc Google ở máy người dùng.
// Dùng: node scripts/gen-content-i18n.mjs <lang>   (CONTENT_MIN = số phút tối đa, mặc định 10)
import fs from 'fs';
const lang = process.argv[2]; if (!lang) { console.error('cần mã ngôn ngữ'); process.exit(1); }
const deadline = Date.now() + (+process.env.CONTENT_MIN || 10) * 60000;
// O5 (docs/I18N-PIPELINE.md): khóa có tiếng Anh viết gốc (content/i18n/en-src) → en hiện thẳng bản gốc; L1 khác dịch TỪ en (sl=en),
// không qua tiếng Việt; dịch lại khi en đổi (dấu hash trong content/i18n/from-en.json). Bản đã qua native-score --fix
// (content/i18n/native-fixed.json, en chưa đổi) đứng trên hết.
import { loadEnSrc, hash } from './i18n-native-score.mjs';
const rdj = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) { return d; } };
const EN = loadEnSrc().m, FROM = rdj('content/i18n/from-en.json', {}), mark = FROM[lang] = FROM[lang] || {}, FIX = rdj('content/i18n/native-fixed.json', {})[lang] || {};
const src = [...new Set([...JSON.parse(fs.readFileSync('content/i18n/strings.json', 'utf8')), ...Object.keys(EN)])];
const OUT = `web/i18n/content/${lang}.json`;
let old = {}; try { old = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch (e) { /* lần đầu */ }
const out = {}; let native = 0;
for (const s of src) {
  if (EN[s] && FIX[s] && FIX[s].en === hash(EN[s])) { out[s] = FIX[s].l1; native++; continue; }
  if (EN[s] && lang === 'en') { out[s] = EN[s]; native++; continue; }
  if (EN[s] && mark[s] !== hash(EN[s])) continue; // chưa dịch từ en / en vừa đổi → dịch lại từ en
  if (old[s]) out[s] = old[s];
}
const need = src.filter(s => !out[s]);
const sleep = ms => new Promise(r => setTimeout(r, ms));
// Giữ nguyên {biến}, thẻ HTML, emoji đầu dòng: kiểm số lượng {…} và <…> khớp, sai thì bỏ (app tự dịch lúc chạy)
const sig = s => (s.match(/\{[^}]+\}|<[^>]+>/g) || []).length;
async function translate(lines, sl = 'vi') {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sl}&tl=${lang}&dt=t&q=${encodeURIComponent(lines.join('\n'))}`;
  for (let k = 0; k < 4; k++) {
    try { const r = await fetch(url); if (r.ok) { const j = await r.json(); return j[0].map(x => x[0]).join('').split('\n'); } if (r.status === 429) await sleep(8000 * (k + 1)); } catch (e) { await sleep(2000); }
  }
  return null;
}
let done = 0, bad = 0;
// khóa có en gốc dịch trước (sl=en), ưu tiên trong hạn giờ; còn lại dịch từ tiếng Việt như cũ
const needEn = need.filter(s => EN[s]);
for (let i = 0; i < needEn.length && Date.now() < deadline;) {
  const batch = []; let len = 0;
  while (i < needEn.length && len + EN[needEn[i]].length < 1800) { batch.push(needEn[i]); len += EN[needEn[i]].length + 1; i++; }
  if (!batch.length) batch.push(needEn[i++]);
  const tr = await translate(batch.map(s => EN[s]), 'en');
  if (!tr || tr.length !== batch.length) { bad += batch.length; await sleep(1500); continue; }
  batch.forEach((s, k) => { const t = (tr[k] || '').trim(); if (t && sig(t) === sig(EN[s])) { out[s] = t; mark[s] = hash(EN[s]); done++; } else bad++; });
  await sleep(400);
}
for (const s of needEn) if (!out[s] && old[s]) out[s] = old[s]; // dịch từ en chưa xong → giữ bản cũ tới lượt sau (không để trống)
const needVi = need.filter(s => !EN[s]);
for (let i = 0; i < needVi.length && Date.now() < deadline;) {
  const batch = []; let len = 0;
  while (i < needVi.length && len + needVi[i].length < 1800) { batch.push(needVi[i]); len += needVi[i].length + 1; i++; }
  if (!batch.length) batch.push(needVi[i++]);
  const tr = await translate(batch);
  if (!tr || tr.length !== batch.length) { bad += batch.length; await sleep(1500); continue; }
  batch.forEach((s, k) => { const t = (tr[k] || '').trim(); if (t && t !== s && sig(t) === sig(s)) { out[s] = t; done++; } else bad++; });
  await sleep(400);
}
fs.mkdirSync('web/i18n/content', { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
fs.writeFileSync('content/i18n/from-en.json', JSON.stringify(FROM, null, 0) + '\n');
console.log(`✓ content ${lang}: ${Object.keys(out).length}/${src.length} câu (mới ${done}, en gốc/đã sửa ${native}, bỏ qua ${bad}, còn ${src.length - Object.keys(out).length})`);
