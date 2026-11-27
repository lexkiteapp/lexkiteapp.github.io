// 🧪 Trang từ dùng ảnh của CHÍNH từ: og:image + ImageObject (JSON-LD) + image sitemap (cần dist/ từ build-seo-pages; thiếu → bỏ qua).
import fs from 'node:fs';
const sm = 'dist/sitemap-words-en.xml';
if (!fs.existsSync(sm)) { console.log('⚠ seo-word-images: chưa build dist/ – bỏ qua'); process.exit(0); }
let bad = 0; const fail = m => { console.error('✗ ' + m); bad++; };
const x = fs.readFileSync(sm, 'utf8');
if (!x.includes('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')) fail('sitemap thiếu namespace image');
const locs = [...x.matchAll(/<image:loc>([^<]+)<\/image:loc>/g)].map(m => m[1]);
if (locs.length < 100) fail(`quá ít ảnh trong sitemap (${locs.length})`);
for (const u of locs) if (!/^https:\/\/media\.lexkite\.com\/vimg\/[0-9a-f]{16}\.webp$/.test(u)) { fail('URL ảnh sai: ' + u); break; }
const f = 'dist/en/words/abandon.html';
if (fs.existsSync(f)) {
  const h = fs.readFileSync(f, 'utf8'), og = (h.match(/og:image" content="([^"]+)"/) || [])[1];
  if (!og || !locs.includes(og)) fail(`abandon: og:image (${og}) không phải ảnh của từ`);
  if (!h.includes('"@type":"ImageObject"') || !h.includes(`"contentUrl":"${og}"`)) fail('abandon: thiếu ImageObject khớp og:image');
}
// trang noindex (mỏng) không đưa ảnh vào sitemap; trang không có ảnh giữ og-default
const n = fs.readdirSync('dist/en/words').filter(n => n.endsWith('.html')).slice(0, 400).filter(n => !/og:image" content="https:\/\/media\.lexkite\.com\/vimg\//.test(fs.readFileSync('dist/en/words/' + n, 'utf8')) && !fs.readFileSync('dist/en/words/' + n, 'utf8').includes('og-default.png')).length;
if (n) fail(`${n} trang có og:image lạ (không ảnh từ, không og-default)`);
if (bad) process.exit(1);
console.log(`✓ seo-word-images: ${locs.length} ảnh trong sitemap en, og:image + ImageObject khớp`);
