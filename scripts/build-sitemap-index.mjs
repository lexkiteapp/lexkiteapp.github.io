// Chạy CUỐI trong build: dist/sitemap.xml (urlset của app + trang SEO) → dist/sitemap-pages.xml,
// rồi sinh dist/sitemap.xml dạng <sitemapindex> liệt kê mọi dist/sitemap-*.xml (sitemap-blog.xml, -2, -3… do blog engine sinh).
import fs from 'node:fs';
const SITE = 'https://lexkite.com/', D = 'dist/';
const today = new Date().toISOString().slice(0, 10);
const cur = fs.existsSync(D + 'sitemap.xml') ? fs.readFileSync(D + 'sitemap.xml', 'utf8') : '';
if (cur.includes('<urlset')) fs.renameSync(D + 'sitemap.xml', D + 'sitemap-pages.xml');
else if (!fs.existsSync(D + 'sitemap-pages.xml')) throw new Error('build-sitemap-index: thiếu dist/sitemap.xml (urlset)');
// Thứ tự tự nhiên: pages, blog, blog-2, blog-10…
const files = fs.readdirSync(D).filter(f => /^sitemap-[\w-]+\.xml$/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
// lastmod của từng sitemap con = lastmod mới nhất bên trong (không phải ngày build) – Google bỏ qua lastmod nếu nó luôn "hôm nay";
// sitemap rỗng (vd. video chưa có bài) không liệt kê → GSC không báo "Sitemap không có URL"
let n = 0; const lm = {}, empty = [];
for (const f of files) {
  const x = fs.readFileSync(D + f, 'utf8'), c = (x.match(/<loc>/g) || []).length; n += c;
  if (!x.includes('<urlset') || c > 50000 || Buffer.byteLength(x) > 50 * 1024 * 1024) throw new Error(`build-sitemap-index: ${f} không hợp lệ hoặc vượt giới hạn (${c} URL)`);
  if (!c) empty.push(f);
  lm[f] = [...x.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})/g)].map(m => m[1]).filter(d => d <= today).sort().at(-1) || today;
}
const listed = files.filter(f => !empty.includes(f));
// Trang từ điển (docs/SEO-DICT-PAGES.md §4): shard sitemap do Worker lexkite-dict phục vụ – chỉ liệt kê khi bộ điều khiển giai đoạn đã mở index (content/dict/stage.json)
const ST = fs.existsSync('content/dict/stage.json') ? JSON.parse(fs.readFileSync('content/dict/stage.json', 'utf8')) : null;
const dict = ST && ST.index ? ['vi', 'en'].flatMap(l => Array.from({ length: Math.ceil(ST.n / 10000) }, (_, i) => `sitemap-dict-${l}-${i + 1}.xml`)) : [];
fs.writeFileSync(D + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...listed.map(f => [f, lm[f]]), ...dict.map(f => [f, today])].map(([f, d]) => `  <sitemap><loc>${SITE}${f}</loc><lastmod>${d}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);
console.log(`✓ Sitemap index: ${listed.length} file (${listed.join(', ')}), ${n} URL${empty.length ? ` · bỏ sitemap rỗng: ${empty.join(', ')}` : ''}`);
