// Cổng trang chủ đề /<lang>/words/topic/<id> (docs/specs/seo-topic-hubs.md) trên dist/ (+ dist-words/ cho link tới trang từ R2):
//  mỗi trang: ≥ 10 link từ tới trang CÓ THẬT và index được, đoạn giới thiệu ≥ 40 chữ bản ngữ, có canonical + hreflang chính nó, ≥ 1 trang từ trỏ ngược lên chủ đề.
// Dùng: node scripts/test/seo-topics.mjs [dist] [dist-words]
import fs from 'node:fs'; import path from 'node:path';
import { words } from '../lib/seo-topics.mjs';
const D = process.argv[2] || 'dist', W = process.argv[3] || process.env.SEO_WORDS_DIST || 'dist-words';
if (!fs.existsSync(path.join(D, 'sitemap.xml')) && !fs.existsSync(path.join(D, 'tr/words/topic'))) { console.log(`⚠ seo-topics: chưa build ${D}/ – bỏ qua`); process.exit(0); }
const bad = [], B = m => bad.push(m), TOPIC = /^\/(\w\w)\/words\/topic\/([\w-]+)$/;
const pageOf = p => [path.join(D, p + '.html'), path.join(W, p + '.html')].find(f => fs.existsSync(f));
const langs = fs.readdirSync(D).filter(l => fs.existsSync(path.join(D, l, 'words/topic')));
let n = 0; const back = new Set();
for (const l of langs) for (const f of fs.readdirSync(path.join(D, l, 'words/topic')).filter(f => f.endsWith('.html'))) {
  const id = f.slice(0, -5), p = `/${l}/words/topic/${id}`, h = fs.readFileSync(path.join(D, l, 'words/topic', f), 'utf8'); n++;
  if (/<meta name="robots"[^>]*noindex/.test(h)) B(`${p}: noindex`);
  if (!h.includes(`<link rel="canonical" href="https://lexkite.com${p}">`)) B(`${p}: canonical sai`);
  if (!h.includes(`hreflang="${l}" href="https://lexkite.com${p}"`)) B(`${p}: thiếu hreflang chính nó`);
  const intro = (h.match(/<header class="hero"><h1>[^<]*<\/h1><p>([^<]*)<\/p>/) || [])[1] || ''; if (words(intro) < 40) B(`${p}: đoạn giới thiệu < 40 chữ`);
  const links = [...new Set([...h.matchAll(/<li><a href="(\/\w\w\/words\/[a-z0-9-]+)"/g)].map(m => m[1]))]; if (links.length < 10) B(`${p}: chỉ ${links.length} từ (< 10)`);
  for (const q of links) { const wf = pageOf(q); if (!wf) { B(`${p} → ${q}: không có trang`); continue; } if (/<meta name="robots"[^>]*noindex/.test(fs.readFileSync(wf, 'utf8'))) B(`${p} → ${q}: trang từ noindex`); if (!back.has(l + id) && fs.readFileSync(wf, 'utf8').includes(`href="${p}"`)) back.add(l + id); }
  if (!back.has(l + id)) B(`${p}: không trang từ nào trỏ ngược lên`);
}
if (bad.length) { console.error('✗ seo-topics:\n' + bad.slice(0, 40).join('\n')); process.exit(1); }
console.log(`✓ seo-topics: ${n} trang chủ đề ${langs.length} ngôn ngữ – từ có thật + index được, giới thiệu ≥ 40 chữ, có link ngược`);
