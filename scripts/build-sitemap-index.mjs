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
let n = 0;
for (const f of files) {
  const x = fs.readFileSync(D + f, 'utf8'), c = (x.match(/<loc>/g) || []).length; n += c;
  if (!x.includes('<urlset') || c > 50000 || Buffer.byteLength(x) > 50 * 1024 * 1024) throw new Error(`build-sitemap-index: ${f} không hợp lệ hoặc vượt giới hạn (${c} URL)`);
}
fs.writeFileSync(D + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${files.map(f => `  <sitemap><loc>${SITE}${f}</loc><lastmod>${today}</lastmod></sitemap>`).join('\n')}\n</sitemapindex>\n`);
console.log(`✓ Sitemap index: ${files.length} file (${files.join(', ')}), ${n} URL`);
