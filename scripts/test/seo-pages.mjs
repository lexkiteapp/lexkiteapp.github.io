// Cổng SEO toàn site trên dist/ (docs/SEO-ARCH.md §4) – chặn cả LOẠI lỗi, không riêng trang mới:
//  1) mọi trang HTML index được (không noindex) có <link rel=canonical> tuyệt đối https://lexkite.com/…
//  2) trang tự-canonical: <title> và meta description không trùng nhau toàn site
//  3) hreflang: có chính nó + x-default, và hai chiều (A → B thì B → A, cùng cụm); trang Từ điển/Giao tiếp bắt buộc có hreflang
//  4) không mồ côi: trang tự-canonical phải có ≥ 1 liên kết vào từ trang khác (trừ trang gốc ngôn ngữ /, /<lang>/)
//  5) trang noindex không nằm trong sitemap; dist < 18.000 file (trần Cloudflare Pages 20.000)
//  6) chuỗi trang tĩnh đủ 15 ngôn ngữ (scripts/lib/seo-pages-i18n.mjs)
// Dùng: node scripts/test/seo-pages.mjs [dist]
import fs from 'node:fs'; import path from 'node:path';
import { LANGS, S, POS, YOU } from '../lib/seo-pages-i18n.mjs';
const D = process.argv[2] || 'dist', O = 'https://lexkite.com', MAX_FILES = 18000;
if (!fs.existsSync(path.join(D, 'sitemap.xml'))) { console.log(`⚠ seo-pages: chưa build ${D}/ – bỏ qua`); process.exit(0); }
const bad = [], B = (m) => bad.push(m);
// 6) chuỗi
for (const [n, T] of [['S', S], ['POS', POS]]) { const keys = Object.keys(T.en); for (const l of LANGS) { const miss = keys.filter(k => !(T[l] || {})[k]); if (miss.length) B(`seo-pages-i18n ${n}.${l} thiếu: ${miss.join(', ')}`); } }
for (const l of LANGS) if (!YOU[l]) B(`seo-pages-i18n YOU.${l} thiếu`);
// quét HTML
const files = []; let nFiles = 0;
const walk = d => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else { nFiles++; if (p.endsWith('.html')) files.push(p); } } };
walk(D);
if (nFiles >= MAX_FILES) B(`dist có ${nFiles} file ≥ ${MAX_FILES} (cổng an toàn; Pages tối đa 20.000)`);
const urlOf = f => { let p = '/' + path.relative(D, f).split(path.sep).join('/'); p = p.endsWith('/index.html') ? p.slice(0, -10) : p.replace(/\.html$/, ''); return O + p; };
const SKIP = /^\/(app|admin|templates|bye|404|blog-lang)(\/|\.html|$)/; // app/quản trị/mẫu – noindex hoặc không phải trang nội dung
const pages = new Map(), inbound = new Map(), canonOf = new Map();
const norm = h => { try { const u = new URL(h, O + '/'); if (u.origin !== O) return null; let p = decodeURI(u.pathname); if (p.endsWith('/index.html')) p = p.slice(0, -10); p = p.replace(/\.html$/, ''); return O + p; } catch { return null; } };
for (const f of files) {
  const rel = '/' + path.relative(D, f).split(path.sep).join('/'); if (SKIP.test(rel)) continue;
  const h = fs.readFileSync(f, 'utf8'), u = urlOf(f), head = h.slice(0, h.indexOf('</head>') + 1 || 20000);
  const noindex = /<meta[^>]*name=["']robots["'][^>]*content=["'][^"']*noindex/i.test(head);
  const canon = (head.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i) || [])[1];
  const title = (head.match(/<title>([^<]*)<\/title>/i) || [])[1] || '', desc = (head.match(/<meta[^>]*name=["']description["'][^>]*content=(["'])(.*?)\1/i) || [])[2] || '';
  const alts = [...head.matchAll(/<link[^>]*rel=["']alternate["'][^>]*hreflang=["']([^"']+)["'][^>]*href=["']([^"']+)["']/gi)].map(m => [m[1], m[2]]);
  const lang = (h.match(/<html[^>]*\slang=["']([^"']+)/i) || [])[1] || '';
  const redirect = /http-equiv=["']refresh["']/i.test(head);
  pages.set(u, { f: rel, lang, noindex, canon, title, desc, alts, redirect });
  for (const m of h.matchAll(/<a\s[^>]*href=["']([^"'#][^"']*)["']/gi)) { const t = norm(m[1]); if (t && t !== u) inbound.set(t, (inbound.get(t) || 0) + 1); }
}
const titles = new Map(), descs = new Map();
for (const [u, p] of pages) {
  if (p.noindex || p.redirect) continue;
  if (!p.canon) { B(`${p.f}: thiếu canonical`); continue; }
  if (!p.canon.startsWith(O + '/')) { B(`${p.f}: canonical không tuyệt đối/sai miền → ${p.canon}`); continue; }
  canonOf.set(u, p.canon);
  if (p.canon !== u) continue; // trang trỏ canonical sang trang khác (bản sao có chủ đích) – chỉ kiểm trang gốc
  if (!p.title) B(`${p.f}: thiếu <title>`);
  const tk = p.lang + '|' + p.title, dk = p.lang + '|' + p.desc; // trùng trong CÙNG ngôn ngữ (bản dịch khác ngôn ngữ cùng chữ, vd. "Blog", là hợp lệ nhờ hreflang)
  (titles.get(tk) || titles.set(tk, []).get(tk)).push(p.f);
  if (p.desc) (descs.get(dk) || descs.set(dk, []).get(dk)).push(p.f); else B(`${p.f}: thiếu meta description`);
  const typed = /^\/[a-z]{2}\/(words|conversations)\//.test(p.f);
  if (typed && !p.alts.length) B(`${p.f}: thiếu hreflang`);
  if (p.alts.length) {
    if (!p.alts.some(([, h]) => h === u)) B(`${p.f}: hreflang không chứa chính nó`);
    if (!p.alts.some(([l]) => l === 'x-default')) B(`${p.f}: hreflang thiếu x-default`);
    for (const [l, h] of p.alts) { if (l === 'x-default' || h === u) continue; const q = pages.get(h); if (!q) { B(`${p.f}: hreflang ${l} → ${h} không có trang`); continue; } if (q.noindex) B(`${p.f}: hreflang ${l} → trang noindex ${q.f}`); else if (!q.alts.some(([, x]) => x === u)) B(`${p.f}: hreflang ${l} → ${q.f} không trỏ ngược lại`); }
  }
  const root = /^\/([a-z]{2}\/)?(index\.html)?$/.test(p.f);
  if (!root && !inbound.get(u)) B(`${p.f}: mồ côi (không trang nào liên kết tới)`);
}
for (const [m, k] of [[titles, 'tiêu đề'], [descs, 'mô tả']]) for (const [t, fs2] of m) if (fs2.length > 1) B(`trùng ${k} "${t.split('|').slice(1).join('|').slice(0, 70)}": ${fs2.slice(0, 4).join(', ')}${fs2.length > 4 ? ` … (+${fs2.length - 4})` : ''}`);
// 5) sitemap ↔ noindex
const locs = x => [...x.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
let nSm = 0; for (const s of locs(fs.readFileSync(path.join(D, 'sitemap.xml'), 'utf8'))) { const f = path.join(D, s.replace(O + '/', '')); if (!fs.existsSync(f)) continue; for (const u of locs(fs.readFileSync(f, 'utf8'))) { nSm++; const p = pages.get(u); if (p && p.noindex) B(`sitemap ${path.basename(f)}: ${u} là noindex`); } }
if (bad.length) { console.log(`✗ seo-pages: ${bad.length} lỗi (${pages.size} trang, ${nFiles} file)`); bad.slice(0, +(process.env.N || 40)).forEach(x => console.log('  ' + x)); process.exit(1); }
console.log(`✓ seo-pages: ${pages.size} trang HTML, ${nSm} URL sitemap, ${nFiles}/${MAX_FILES} file – canonical, tiêu đề/mô tả không trùng, hreflang hai chiều, không mồ côi`);
