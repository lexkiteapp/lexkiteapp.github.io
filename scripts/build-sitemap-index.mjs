// Chạy CUỐI trong build: dist/sitemap.xml (urlset của app + trang SEO) → dist/sitemap-pages.xml,
// rồi sinh dist/sitemap.xml dạng <sitemapindex> liệt kê mọi dist/sitemap-*.xml (sitemap-blog.xml, -2, -3… do blog engine sinh).
import fs from 'node:fs';
import { lastmodStore } from './lib/lastmod.mjs';
const SITE = 'https://lexkite.com/', D = 'dist/';
const today = new Date().toISOString().slice(0, 10);
const cur = fs.existsSync(D + 'sitemap.xml') ? fs.readFileSync(D + 'sitemap.xml', 'utf8') : '';
if (cur.includes('<urlset')) fs.renameSync(D + 'sitemap.xml', D + 'sitemap-pages.xml');
else if (!fs.existsSync(D + 'sitemap-pages.xml')) throw new Error('build-sitemap-index: thiếu dist/sitemap.xml (urlset)');
// lastmod THẬT cho sitemap tĩnh (SEO-AUDIT 12/11 #2, 15/11 #1 – đo live 22/11: 1.146 URL ở 6 file luôn = ngày build vì generator dùng
// gitDate của code chung → Google bỏ qua lastmod CẢ SITE). Ở đây (chạy cuối, một chỗ cho mọi generator): băm <main> của file dist theo URL
// (scripts/lib/lastmod.mjs) → có trong sổ & không đổi → ngày sổ; đổi → hôm nay; chưa có trong sổ → BỎ <lastmod> (tùy chọn theo chuẩn, tốt hơn ngày sai).
// LASTMOD_WRITE=1 (CI) ghi sổ để lần sau có ngày ổn định. words/blog/conversations đã có ngày thật ở generator riêng – không đụng.
export const STATIC_SM = ['sitemap-pages.xml', 'sitemap-authority.xml', 'sitemap-grammar.xml', 'sitemap-ielts-writing.xml', 'sitemap-pronunciation.xml', 'sitemap-tools.xml'];
const htmlOf = loc => { const p = decodeURIComponent(loc.replace(SITE, '').split(/[?#]/)[0]);
  for (const f of [D + p + (p.endsWith('/') || !p ? 'index.html' : '/index.html'), D + p + '.html', D + p]) if (fs.existsSync(f) && fs.statSync(f).isFile()) return fs.readFileSync(f, 'utf8');
  return null; };
const store = lastmodStore(), write = process.env.LASTMOD_WRITE === '1';
let fixed = 0, dropped = 0;
for (const f of STATIC_SM) {
  if (!fs.existsSync(D + f)) continue;
  const x = fs.readFileSync(D + f, 'utf8').replace(/<url>([\s\S]*?)<\/url>/g, (all, body) => {
    const loc = (/<loc>([^<]+)<\/loc>/.exec(body) || [])[1], html = loc && htmlOf(loc);
    if (!html) return all;
    const d = store.date('/' + loc.replace(SITE, ''), html, write ? today : '');
    fixed++; if (!d) dropped++;
    const b = body.replace(/<lastmod>[^<]*<\/lastmod>/, '');
    return `<url>${d ? b.replace(/(<\/loc>)/, `$1<lastmod>${d}</lastmod>`) : b}</url>`;
  });
  fs.writeFileSync(D + f, x);
}
if (write) store.save({ prefixes: [] });
// Thứ tự tự nhiên: pages, blog, blog-2, blog-10…
const files = fs.readdirSync(D).filter(f => /^sitemap-[\w-]+\.xml$/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
// lastmod của từng sitemap con = lastmod mới nhất bên trong (không phải ngày build) – Google bỏ qua lastmod nếu nó luôn "hôm nay";
// sitemap rỗng (vd. video chưa có bài) không liệt kê → GSC không báo "Sitemap không có URL"
let n = 0; const lm = {}, empty = [];
for (const f of files) {
  const x = fs.readFileSync(D + f, 'utf8'), c = (x.match(/<loc>/g) || []).length; n += c;
  if (!x.includes('<urlset') || c > 50000 || Buffer.byteLength(x) > 50 * 1024 * 1024) throw new Error(`build-sitemap-index: ${f} không hợp lệ hoặc vượt giới hạn (${c} URL)`);
  if (!c) empty.push(f);
  lm[f] = [...x.matchAll(/<lastmod>(\d{4}-\d{2}-\d{2})/g)].map(m => m[1]).filter(d => d <= today).sort().at(-1) || '';
}
const listed = files.filter(f => !empty.includes(f));
// Trang từ điển (docs/SEO-DICT-PAGES.md §4): shard sitemap do Worker lexkite-dict phục vụ – chỉ liệt kê khi bộ điều khiển giai đoạn đã mở index (content/dict/stage.json)
const ST = fs.existsSync('content/dict/stage.json') ? JSON.parse(fs.readFileSync('content/dict/stage.json', 'utf8')) : null;
const dict = ST && ST.index ? ['vi', 'en'].flatMap(l => Array.from({ length: Math.ceil(ST.n / 10000) }, (_, i) => `sitemap-dict-${l}-${i + 1}.xml`)) : [];
fs.writeFileSync(D + 'sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...listed.map(f => [f, lm[f]]), ...dict.map(f => [f, today])].map(([f, d]) => `  <sitemap><loc>${SITE}${f}</loc>${d ? `<lastmod>${d}</lastmod>` : ''}</sitemap>`).join('\n')}\n</sitemapindex>\n`);
console.log(`✓ Sitemap index: ${listed.length} file (${listed.join(', ')}), ${n} URL · lastmod tĩnh ${fixed - dropped} theo sổ, ${dropped} bỏ (chưa có ngày thật)${empty.length ? ` · bỏ sitemap rỗng: ${empty.join(', ')}` : ''}`);
