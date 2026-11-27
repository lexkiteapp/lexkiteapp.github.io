// Từ nổi bật trên trang chủ (content/seo/home-words.json) – kiểm BẤT BIẾN, không so bằng đúng kết quả pick() mới (27/11): mỗi lô làm giàu merge vào main
// đổi tập từ index được → so bằng làm đỏ mọi PR kế tiếp tới khi seo-gsc (thứ Hai) sinh lại. Chặn thật sự những gì làm hỏng liên kết sâu:
//  1) đủ ngôn ngữ trong LANGS của scripts/seo/home-words.mjs, mỗi ngôn ngữ ≥ N mục (N cũng lấy từ đó – đổi N/LANGS ở nguồn thì test tự theo);
//  2) mọi mục là từ có trong tập trang từ, đúng slug, VẪN index được (không dẫn Googlebot sang trang noindex);
//  3) trang chủ đã dựng (web/<lang>/index.html) có khu id="top-words" và chứa ĐÚNG các liên kết trong json (build-landing đã chạy sau khi đổi json).
// Lệch → node scripts/seo/home-words.mjs && node scripts/build-landing.mjs. seo-gsc.yml vẫn sinh lại hằng tuần theo cầu GSC mới.
import fs from 'node:fs';
import { LANGS, N, FILE } from '../seo/home-words.mjs';
const W = await import('../lib/seo-words.mjs');
const J = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let bad = 0;
const err = m => { console.error('✗ ' + m); bad++; };
for (const l of LANGS) {
  const L = J[l] || [];
  if (L.length < N) { err(`${FILE}: ${l} chỉ ${L.length} mục (cần ≥ ${N})`); continue; }
  const bySlug = new Map(W.setOf[l].map(e => [W.slug.get(e), e]));
  for (const [sl, w] of L) {
    const e = bySlug.get(sl);
    if (!e || e.word !== w) { err(`${l}/${sl}: không còn trong tập trang từ (hoặc đổi từ) – chạy node scripts/seo/home-words.mjs`); continue; }
    if (!W.indexable(l, e)) err(`${l}/${sl}: không còn index được – chạy node scripts/seo/home-words.mjs`);
  }
  const h = fs.readFileSync(`web/${l}/index.html`, 'utf8');
  if (!h.includes('id="top-words"')) { err(`web/${l}/index.html: thiếu khu từ nổi bật`); continue; }
  const miss = L.filter(([sl]) => !h.includes(`href="/${l}/words/${sl}"`)).length;
  if (miss) err(`web/${l}/index.html: thiếu ${miss}/${L.length} liên kết của json – chạy node scripts/build-landing.mjs`);
}
if (bad) process.exit(1);
console.log(`✓ home-words: ${LANGS.length} trang chủ × ≥${N} liên kết sâu, mọi từ còn index được, trang dựng khớp json`);
