// SEO trang chủ (dist/index.html, chỉ sửa bản build – không đụng web/index.html) + sitemap.xml gốc (trang chủ, chính sách).
// Không dùng hreflang ?hl=xx: các URL đó có canonical là "/" → tín hiệu mâu thuẫn. hreflang chỉ dùng giữa trang tĩnh có bản dịch thật.
// sitemap.xml ở bước này là <urlset>; build-sitemap-index.mjs (chạy cuối) đổi tên thành sitemap-pages.xml và sinh sitemap index.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
const SITE = 'https://lexkite.com/', OG = `${SITE}og-default.png`;
const today = new Date().toISOString().slice(0, 10);
// Ngày commit cuối của file nguồn (rẻ: 1 lệnh git), không có git thì lấy ngày build
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

let html = fs.readFileSync('dist/index.html', 'utf8')
  .replace(/\n?[ \t]*<link rel="alternate" hreflang[^>]*>/g, '')
  .replace(/\n?[ \t]*<meta (?:property|name)="(?:og:image(?::[a-z]+)?|og:url|twitter:[a-z]+)"[^>]*>/g, '')
  .replace(/\n?[ \t]*<link rel="canonical"[^>]*>/g, '');
const title = (html.match(/<meta property="og:title" content="([^"]*)"/) || [])[1] || 'Lexkite';
const alt = 'Lexkite – Học từ vựng IELTS, TOEIC, TOEFL miễn phí';
const head = [`<link rel="canonical" href="${SITE}">`, `<meta property="og:url" content="${SITE}">`, `<meta property="og:image" content="${OG}">`,
  '<meta property="og:image:width" content="1200">', '<meta property="og:image:height" content="630">', '<meta property="og:image:type" content="image/png">', `<meta property="og:image:alt" content="${esc(alt)}">`,
  '<meta name="twitter:card" content="summary_large_image">', `<meta name="twitter:title" content="${title}">`, `<meta name="twitter:image" content="${OG}">`, `<meta name="twitter:image:alt" content="${esc(alt)}">`].map(x => '  ' + x).join('\n');
html = html.replace(/(\n[ \t]*<meta property="og:type")/, '\n' + head + '$1');
// JSON-LD WebApplication: chuẩn hoá (miễn phí, có ảnh, nhà phát hành)
html = html.replace(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/, (m, j) => {
  let d; try { d = JSON.parse(j); } catch { return m; }
  if (d['@type'] !== 'WebApplication') return m;
  Object.assign(d, { url: SITE, image: OG, isAccessibleForFree: true, browserRequirements: 'Requires JavaScript. Works in modern browsers.',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }, publisher: { '@type': 'Organization', name: 'Lexkite', url: SITE, logo: `${SITE}icons/icon-512.png?v=2` } });
  return `<script type="application/ld+json">${JSON.stringify(d).replace(/</g, '\\u003c')}</script>`;
});
// WebSite + Organization (thực thể thương hiệu cho Knowledge Graph / tên trang trên kết quả tìm kiếm). Không khai SearchAction: tra từ dùng hash route, không có URL tìm kiếm crawl được.
if (!html.includes('"@type":"WebSite"')) html = html.replace('</head>', `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'WebSite', '@id': `${SITE}#website`, name: 'Lexkite', url: SITE, inLanguage: ['vi', 'en'], publisher: { '@id': `${SITE}#org` } },
  { '@type': 'Organization', '@id': `${SITE}#org`, name: 'Lexkite', url: SITE, logo: `${SITE}icons/icon-512.png?v=2` }] }).replace(/</g, '\\u003c')}</script>\n</head>`);
if (!html.includes(`<meta property="og:image" content="${OG}"`)) throw new Error('build-seo: không chèn được thẻ og vào dist/index.html');
fs.writeFileSync('dist/index.html', html);

const url = (loc, lm, cf, pr) => `  <url><loc>${loc}</loc><lastmod>${lm}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority></url>`;
fs.writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${url(SITE, gitDate('web/index.html', 'web/js'), 'weekly', '1.0')}\n${['en', 'vi'].flatMap(l => ['privacy', 'terms'].map(n => url(`${SITE}${l}/${n}`, gitDate(`content/legal/${l}/${n}.html`), 'yearly', '0.3'))).join('\n')}\n</urlset>\n`);
// /privacy gốc có canonical → /en/privacy (tự chuyển theo ngôn ngữ) nên sitemap chỉ liệt kê bản /<lang>/ thật
console.log('✓ SEO: trang chủ (canonical, og 1200×630, JSON-LD) + sitemap gốc');
