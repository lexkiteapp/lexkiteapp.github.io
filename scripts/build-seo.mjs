// sitemap.xml gốc: 15 trang giới thiệu (/ + /<lang>/, kèm hreflang + x-default) + trang chính sách.
// Trang giới thiệu tự có canonical/og/JSON-LD (scripts/build-landing.mjs) – bước này không sửa HTML nào nữa.
// App học /app/: canonical về trang giới thiệu, không vào sitemap. Không dùng hreflang ?hl=xx.
// sitemap.xml ở bước này là <urlset>; build-sitemap-index.mjs (chạy cuối) đổi tên thành sitemap-pages.xml và sinh sitemap index.
import fs from 'node:fs'; import { execFileSync } from 'node:child_process';
import { LANGS, pageUrl, fileOf } from './build-landing.mjs';
const SITE = 'https://lexkite.com/';
const today = new Date().toISOString().slice(0, 10);
// Ngày commit cuối của file nguồn (rẻ: 1 lệnh git), không có git thì lấy ngày build
const gitDate = (...f) => { try { return execFileSync('git', ['log', '-1', '--format=%cs', '--', ...f], { encoding: 'utf8' }).trim() || today; } catch { return today; } };
const alts = LANGS.map(l => `<xhtml:link rel="alternate" hreflang="${l}" href="${pageUrl(l)}"/>`).join('') + `<xhtml:link rel="alternate" hreflang="x-default" href="${pageUrl('en')}"/>`;
const url = (loc, lm, cf, pr, x = '') => `  <url><loc>${loc}</loc><lastmod>${lm}</lastmod><changefreq>${cf}</changefreq><priority>${pr}</priority>${x}</url>`;
const landing = LANGS.map(l => url(pageUrl(l), gitDate(`content/landing/${l}.json`, 'content/landing/en.json', 'scripts/build-landing.mjs', fileOf(l)), 'weekly', l === 'vi' ? '1.0' : '0.9', alts));
const legal = ['en', 'vi'].flatMap(l => ['privacy', 'terms', 'schools'].map(n => url(`${SITE}${l}/${n}`, gitDate(`content/legal/${l}/${n}.html`), 'yearly', '0.3')));
fs.writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[...landing, ...legal].join('\n')}\n</urlset>\n`);
// /privacy gốc có canonical → /en/privacy (tự chuyển theo ngôn ngữ) nên sitemap chỉ liệt kê bản /<lang>/ thật
console.log(`✓ SEO: sitemap gốc – ${LANGS.length} trang giới thiệu (hreflang) + ${legal.length} trang chính sách`);
