// SEO đa quốc gia: chèn <link rel="alternate" hreflang> cho mọi ngôn ngữ đang bật (SUPPORTED trong web/js/i18n.js)
// và sinh sitemap.xml có liên kết thay thế theo ngôn ngữ. Chạy sau khi build vào dist/.
import fs from 'node:fs';
const SITE = 'https://vocaband.web.app/';
const i18n = fs.readFileSync('web/js/i18n.js', 'utf8');
const langs = JSON.parse(i18n.match(/const SUPPORTED = (\[[^\]]*\])/)[1].replace(/'/g, '"'));
const url = l => `${SITE}?hl=${l}`;
const links = langs.map(l => `  <link rel="alternate" hreflang="${l}" href="${url(l)}">`).join('\n') + `\n  <link rel="alternate" hreflang="x-default" href="${SITE}">`;
let html = fs.readFileSync('dist/index.html', 'utf8').replace(/\n  <link rel="alternate" hreflang[^\n]*/g, '');
html = html.replace('</head>', links + '\n</head>');
fs.writeFileSync('dist/index.html', html);
const alt = langs.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${url(l)}"/>`).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}"/>`;
const entry = loc => `  <url><loc>${loc}</loc>\n${alt}\n    <changefreq>weekly</changefreq></url>`;
fs.writeFileSync('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${[SITE, ...langs.map(url)].map(entry).join('\n')}\n  <url><loc>${SITE}privacy.html</loc><changefreq>yearly</changefreq></url>\n</urlset>\n`);
console.log(`✓ SEO: hreflang + sitemap cho ${langs.length} ngôn ngữ (${langs.join(', ')})`);
