// 🧪 content/seo/serp-overrides.json – tiêu đề/mô tả viết tay cho trang từ hạng 8–12 CTR thấp (build-seo-pages dùng khi trang index được).
// Chặn: trang không tồn tại/không index được, sai chữ viết theo ngôn ngữ, dài/ngắn, thiếu từ tiếng Anh, trùng nhau, nhồi từ, thiếu số gốc để đo.
import fs from 'node:fs';
const { setOf, slug, indexable } = await import('../lib/seo-words.mjs');
const F = 'content/seo/serp-overrides.json';
let bad = 0; const err = m => { bad++; console.error(`  ✗ ${m}`); };
const J = JSON.parse(fs.readFileSync(F, 'utf8')), P = J.pages || {};
const SCRIPT = { th: /[฀-๿]/, ar: /[؀-ۿ]/, hi: /[ऀ-ॿ]/, ja: /[぀-ヿ㐀-鿿]/, ko: /[가-힯]/, zh: /[㐀-鿿]/, ru: /[Ѐ-ӿ]/ };
const seenT = new Set(), seenD = new Set();
for (const [p, v] of Object.entries(P)) {
  const m = /^\/([a-z]{2})\/words\/([a-z0-9-]+)$/.exec(p); if (!m) { err(`${p}: đường dẫn không phải trang từ`); continue; }
  const [, l, s] = m, e = (setOf[l] || []).find(x => slug.get(x) === s);
  if (!e) { err(`${p}: không có trong tập trang`); continue; }
  if (!indexable(l, e)) err(`${p}: trang không index được – ghi đè vô ích`);
  const t = String(v.t || ''), d = String(v.d || ''), w = e.word.toLowerCase();
  if ([...t].length < 15 || [...t].length > 55) err(`${p}: tiêu đề ${[...t].length} ký tự (15–55, chưa gồm " | Lexkite")`);
  if (d.length < 70 || d.length > 160) err(`${p}: mô tả ${d.length} ký tự (70–160)`);
  if (!t.toLowerCase().includes(w)) err(`${p}: tiêu đề thiếu từ "${e.word}"`);
  if ((d.toLowerCase().split(w).length - 1) > 2) err(`${p}: mô tả lặp "${e.word}" > 2 lần (nhồi từ)`);
  if (SCRIPT[l] && (!SCRIPT[l].test(t) || !SCRIPT[l].test(d))) err(`${p}: tiêu đề/mô tả không viết bằng chữ của ngôn ngữ trang`);
  if (/[<>{}]|https?:|#1|best|tốt nhất/i.test(t + d)) err(`${p}: có HTML/URL/từ phóng đại`);
  if (seenT.has(t)) err(`${p}: tiêu đề trùng`); if (seenD.has(d)) err(`${p}: mô tả trùng`); seenT.add(t); seenD.add(d);
  if (!v.base || !(v.base.impr >= 0) || !v.base.date) err(`${p}: thiếu số gốc base {impr, clicks, pos, date} để đo trước/sau`);
}
if (bad) { console.error(`✗ serp-overrides: ${bad} lỗi`); process.exit(1); }
console.log(`✓ serp-overrides: ${Object.keys(P).length} trang – index được, đúng chữ viết, độ dài, không trùng, có số gốc`);
