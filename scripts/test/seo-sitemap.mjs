// Chặn lỗi GSC "Excluded by 'noindex'" và "Duplicate, Google chose different canonical":
// mọi URL trong sitemap (đọc từ dist/) phải: không noindex (meta), có canonical = chính nó, hreflang (nếu có) chứa chính nó.
// Dùng: node scripts/test/seo-sitemap.mjs [dist]
import fs from 'fs'; import path from 'path';
const D = process.argv[2] || 'dist', ORIGIN = 'https://lexkite.com';
if (!fs.existsSync(path.join(D, 'sitemap.xml'))) { console.log(`⚠ seo-sitemap: không có ${D}/sitemap.xml (chưa build) – bỏ qua`); process.exit(0); }
const locs = x => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const rd = f => fs.readFileSync(path.join(D, f), 'utf8');
let files = ['sitemap.xml'], urls = [];
for (const f of files) { const x = rd(f); if (x.includes('<sitemapindex')) files.push(...locs(x).map(u => u.replace(ORIGIN + '/', ''))); else urls.push(...[...x.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1])); }
const hdr = fs.existsSync(path.join(D, '_headers')) ? rd('_headers') : '';
const fileFor = u => { const p = decodeURI(u.replace(ORIGIN, '')).replace(/^\//, ''); return [p + (p && !p.endsWith('/') ? '' : 'index.html'), p + '.html', p + '/index.html'].map(x => x.replace('//', '/')).find(x => x && fs.existsSync(path.join(D, x)) && fs.statSync(path.join(D, x)).isFile()); };
const bad = []; let n = 0;
for (const b of urls) {
  const u = locs(b)[0]; n++;
  if (!u.startsWith(ORIGIN + '/')) { bad.push(`${u}: sai tên miền`); continue; }
  const f = fileFor(u); if (!f) { bad.push(`${u}: không có file trong ${D}/`); continue; }
  const h = rd(f);
  const ro = (h.match(/<meta[^>]*name=["']robots["'][^>]*>/i) || [''])[0];
  if (/noindex/i.test(ro)) bad.push(`${u}: noindex nằm trong sitemap`);
  const c = (h.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1];
  if (!c) bad.push(`${u}: thiếu canonical`); else if (c !== u) bad.push(`${u}: canonical lệch → ${c}`);
  const alts = [...b.matchAll(/hreflang="[^"]+" href="([^"]+)"/g)].map(m => m[1]);
  if (alts.length && !alts.includes(u)) bad.push(`${u}: hreflang không chứa chính nó`);
}
const dup = urls.map(b => locs(b)[0]).filter((u, i, a) => a.indexOf(u) !== i); if (dup.length) bad.push(`trùng URL trong sitemap: ${[...new Set(dup)].slice(0, 5)}`);
if (bad.length) { console.log(`✗ seo-sitemap: ${bad.length} lỗi / ${n} URL`); bad.slice(0, 30).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log(`✓ seo-sitemap: ${n} URL trong sitemap – không noindex, canonical = chính nó, hreflang có chính nó`);
